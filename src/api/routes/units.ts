import { Router, Response } from 'express';
import { query } from '../../db/connection';
import { AuthRequest } from '../types';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/units — all units with current status
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, type, station_id } = req.query;
    let where = 'WHERE 1=1';
    const params: unknown[] = [];
    let idx = 1;

    if (status) { where += ` AND u.status = $${idx++}`; params.push(status); }
    if (type) { where += ` AND u.unit_type = $${idx++}`; params.push(type); }
    if (station_id) { where += ` AND u.station_id = $${idx++}`; params.push(station_id); }

    const result = await query(`
      SELECT u.*, s.name as station_name, s.station_number,
             d.name as district_name,
             (SELECT COUNT(*) FROM personnel p WHERE p.unit_id = u.id AND p.status = 'active') as personnel_count,
             (SELECT json_agg(json_build_object('id', p.id, 'name', p.first_name || ' ' || p.last_name, 'rank', p.rank, 'badge', p.badge_number))
              FROM personnel p WHERE p.unit_id = u.id AND p.status = 'active') as personnel
      FROM units u
      LEFT JOIN stations s ON s.id = u.station_id
      LEFT JOIN districts d ON d.id = s.district_id
      ${where}
      ORDER BY u.unit_number
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Units error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch units' });
  }
});

// GET /api/units/availability — availability summary
router.get('/availability', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT u.unit_type, u.status, COUNT(*) as count,
             s.name as station_name
      FROM units u
      LEFT JOIN stations s ON s.id = u.station_id
      GROUP BY u.unit_type, u.status, s.name
      ORDER BY u.unit_type, u.status
    `);

    const summary = await query(`
      SELECT unit_type,
             COUNT(*) as total,
             COUNT(*) FILTER (WHERE status = 'available') as available,
             COUNT(*) FILTER (WHERE status IN ('dispatched', 'en_route', 'on_scene')) as active,
             COUNT(*) FILTER (WHERE status IN ('out_of_service', 'maintenance')) as oos
      FROM units GROUP BY unit_type ORDER BY unit_type
    `);

    res.json({ success: true, data: { details: result.rows, summary: summary.rows } });
  } catch (err) {
    console.error('Availability error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch availability' });
  }
});

// GET /api/units/:id — unit detail with recent activity
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [unit, recentIncidents] = await Promise.all([
      query(`
        SELECT u.*, s.name as station_name, s.station_number, d.name as district_name
        FROM units u
        LEFT JOIN stations s ON s.id = u.station_id
        LEFT JOIN districts d ON d.id = s.district_id
        WHERE u.id = $1
      `, [id]),
      query(`
        SELECT i.incident_number, i.incident_type, i.priority, i.address, i.created_at,
               iu.response_time_seconds, iu.dispatched_at, iu.cleared_at
        FROM incident_units iu
        JOIN incidents i ON i.id = iu.incident_id
        WHERE iu.unit_id = $1
        ORDER BY iu.dispatched_at DESC
        LIMIT 20
      `, [id]),
    ]);

    if (unit.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Unit not found' });
      return;
    }

    res.json({ success: true, data: { ...unit.rows[0], recent_incidents: recentIncidents.rows } });
  } catch (err) {
    console.error('Unit detail error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch unit' });
  }
});

export default router;
