import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../../db/connection';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { validate, paginate } from '../middleware/validation';

const router = Router();
router.use(authenticate);

// GET /api/incidents — list incidents with filtering
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, offset } = paginate(req);
    const { type, status, priority, district_id, from, to, search } = req.query;

    let where = 'WHERE 1=1';
    const params: unknown[] = [];
    let paramIdx = 1;

    if (type) { where += ` AND i.incident_type = $${paramIdx++}`; params.push(type); }
    if (status) { where += ` AND i.status = $${paramIdx++}`; params.push(status); }
    if (priority) { where += ` AND i.priority = $${paramIdx++}`; params.push(priority); }
    if (district_id) { where += ` AND i.district_id = $${paramIdx++}`; params.push(district_id); }
    if (from) { where += ` AND i.created_at >= $${paramIdx++}`; params.push(from); }
    if (to) { where += ` AND i.created_at <= $${paramIdx++}`; params.push(to); }
    if (search) {
      where += ` AND (i.description ILIKE $${paramIdx} OR i.address ILIKE $${paramIdx} OR i.incident_number ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM incidents i ${where}`, params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(`
      SELECT i.*, d.name as district_name,
             (SELECT COUNT(*) FROM incident_units iu WHERE iu.incident_id = i.id) as units_count,
             (SELECT json_agg(json_build_object('unit_number', u.unit_number, 'unit_type', u.unit_type, 'response_time', iu2.response_time_seconds))
              FROM incident_units iu2 JOIN units u ON u.id = iu2.unit_id WHERE iu2.incident_id = i.id) as units
      FROM incidents i
      LEFT JOIN districts d ON d.id = i.district_id
      ${where}
      ORDER BY i.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `, [...params, limit, offset]);

    res.json({
      success: true,
      data: result.rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Incidents list error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch incidents' });
  }
});

// GET /api/incidents/:id — single incident detail
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [incident, units, outcome, dispatchLog] = await Promise.all([
      query(`SELECT i.*, d.name as district_name FROM incidents i LEFT JOIN districts d ON d.id = i.district_id WHERE i.id = $1`, [id]),
      query(`
        SELECT iu.*, u.unit_number, u.unit_type
        FROM incident_units iu JOIN units u ON u.id = iu.unit_id
        WHERE iu.incident_id = $1 ORDER BY iu.dispatched_at
      `, [id]),
      query(`SELECT io.*, p.first_name || ' ' || p.last_name as reporting_officer FROM incident_outcomes io LEFT JOIN personnel p ON p.id = io.reporting_officer_id WHERE io.incident_id = $1`, [id]),
      query(`SELECT dl.*, u.unit_number, p.first_name || ' ' || p.last_name as dispatcher_name FROM dispatch_log dl LEFT JOIN units u ON u.id = dl.unit_id LEFT JOIN personnel p ON p.id = dl.dispatcher_id WHERE dl.incident_id = $1 ORDER BY dl.timestamp`, [id]),
    ]);

    if (incident.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Incident not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        ...incident.rows[0],
        units: units.rows,
        outcome: outcome.rows[0] || null,
        dispatch_timeline: dispatchLog.rows,
      },
    });
  } catch (err) {
    console.error('Incident detail error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch incident' });
  }
});

// POST /api/incidents — create new incident (dispatchers+)
const createIncidentSchema = z.object({
  incident_type: z.enum(['fire', 'ems', 'police', 'multi_agency', 'hazmat', 'rescue', 'traffic']),
  priority: z.enum(['1', '2', '3', '4', '5']),
  address: z.string().min(1),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
  description: z.string().min(1),
  caller_name: z.string().optional(),
  caller_phone: z.string().optional(),
  dispatch_notes: z.string().optional(),
  district_id: z.string().uuid().optional(),
});

router.post('/',
  authorize('dispatcher', 'captain', 'chief', 'admin'),
  validate(createIncidentSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const data = req.body;
      const incidentNumber = `INC-${Date.now().toString().slice(-8)}`;

      const result = await query(`
        INSERT INTO incidents (incident_number, incident_type, priority, status, address, location_lat, location_lng,
                               description, caller_name, caller_phone, dispatch_notes, district_id, dispatched_at)
        VALUES ($1, $2::incident_type, $3::incident_priority, 'dispatched'::incident_status, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING *
      `, [incidentNumber, data.incident_type, data.priority, data.address,
          data.location_lat, data.location_lng, data.description,
          data.caller_name, data.caller_phone, data.dispatch_notes, data.district_id]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
      console.error('Create incident error:', err);
      res.status(500).json({ success: false, error: 'Failed to create incident' });
    }
  }
);

// PATCH /api/incidents/:id/status — update incident status
const updateStatusSchema = z.object({
  status: z.enum(['dispatched', 'en_route', 'on_scene', 'resolved', 'closed', 'cancelled']),
});

router.patch('/:id/status',
  authorize('dispatcher', 'captain', 'chief', 'admin'),
  validate(updateStatusSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      let extraFields = '';
      if (status === 'resolved' || status === 'closed') {
        extraFields = ', resolved_at = NOW(), total_time_seconds = EXTRACT(EPOCH FROM (NOW() - created_at))::integer';
      }

      const result = await query(
        `UPDATE incidents SET status = $1::incident_status ${extraFields}, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [status, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Incident not found' });
        return;
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      console.error('Update status error:', err);
      res.status(500).json({ success: false, error: 'Failed to update status' });
    }
  }
);

export default router;
