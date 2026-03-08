import { Router, Response } from 'express';
import { query } from '../../db/connection';
import { AuthRequest } from '../types';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/dashboard — main dashboard metrics
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const [
      activeIncidents,
      unitStatus,
      todayIncidents,
      incidentsByType,
      avgResponse,
      recentIncidents,
      districtPerf,
    ] = await Promise.all([
      // Active incidents
      query(`SELECT COUNT(*) as count FROM incidents WHERE status NOT IN ('closed', 'cancelled', 'resolved')`),

      // Units by status
      query(`SELECT status, COUNT(*) as count FROM units GROUP BY status`),

      // Today's incidents
      query(`SELECT COUNT(*) as count FROM incidents WHERE created_at >= CURRENT_DATE`),

      // Incidents by type today
      query(`SELECT incident_type, COUNT(*) as count FROM incidents WHERE created_at >= CURRENT_DATE GROUP BY incident_type`),

      // Average response time (last 7 days)
      query(`SELECT AVG(response_time_seconds) as avg_response FROM incidents WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND response_time_seconds IS NOT NULL`),

      // Recent incidents
      query(`
        SELECT i.id, i.incident_number, i.incident_type, i.priority, i.status,
               i.address, i.description, i.created_at, i.response_time_seconds,
               (SELECT COUNT(*) FROM incident_units iu WHERE iu.incident_id = i.id) as units_assigned
        FROM incidents i
        ORDER BY i.created_at DESC
        LIMIT 20
      `),

      // District performance (last 30 days)
      query(`
        WITH district_targets AS (
          SELECT district_id, MIN(target_response_time_seconds) as target
          FROM response_zones WHERE zone_type = 'primary'
          GROUP BY district_id
        )
        SELECT d.id as district_id, d.name as district_name,
               COUNT(i.id) as total_incidents,
               AVG(i.response_time_seconds) as avg_response_time,
               dt.target as target_response_time,
               ROUND(
                 COUNT(CASE WHEN i.response_time_seconds <= dt.target THEN 1 END)::numeric
                 / NULLIF(COUNT(i.id), 0) * 100, 1
               ) as on_target_pct
        FROM districts d
        LEFT JOIN incidents i ON i.district_id = d.id AND i.created_at >= CURRENT_DATE - INTERVAL '30 days'
        LEFT JOIN district_targets dt ON dt.district_id = d.id
        GROUP BY d.id, d.name, d.district_number, dt.target
        ORDER BY d.district_number
      `),
    ]);

    const unitsByStatus: Record<string, number> = {};
    let totalUnits = 0;
    let availableUnits = 0;
    for (const row of unitStatus.rows) {
      unitsByStatus[row.status] = parseInt(row.count);
      totalUnits += parseInt(row.count);
      if (row.status === 'available') availableUnits = parseInt(row.count);
    }

    const typeBreakdown: Record<string, number> = {};
    for (const row of incidentsByType.rows) {
      typeBreakdown[row.incident_type] = parseInt(row.count);
    }

    res.json({
      success: true,
      data: {
        activeIncidents: parseInt(activeIncidents.rows[0].count),
        availableUnits,
        totalUnits,
        avgResponseTime: Math.round(parseFloat(avgResponse.rows[0].avg_response) || 0),
        incidentsToday: parseInt(todayIncidents.rows[0].count),
        incidentsByType: typeBreakdown,
        unitsByStatus,
        recentIncidents: recentIncidents.rows,
        districtPerformance: districtPerf.rows,
      },
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, error: 'Failed to load dashboard data' });
  }
});

// GET /api/dashboard/heatmap — incident heatmap data
router.get('/heatmap', async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const type = req.query.type as string;

    let sql = `
      SELECT location_lat as lat, location_lng as lng, incident_type, priority,
             COUNT(*) as weight
      FROM incidents
      WHERE created_at >= CURRENT_DATE - $1 * INTERVAL '1 day'
        AND location_lat IS NOT NULL
    `;
    const params: unknown[] = [days];

    if (type) {
      sql += ` AND incident_type = $2`;
      params.push(type);
    }

    sql += ` GROUP BY location_lat, location_lng, incident_type, priority`;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Heatmap error:', err);
    res.status(500).json({ success: false, error: 'Failed to load heatmap data' });
  }
});

// GET /api/dashboard/response-times — response time trends
router.get('/response-times', async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    const result = await query(`
      SELECT DATE(created_at) as date,
             incident_type,
             AVG(response_time_seconds) as avg_response,
             PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_seconds) as median_response,
             PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY response_time_seconds) as p90_response,
             COUNT(*) as count
      FROM incidents
      WHERE created_at >= CURRENT_DATE - $1 * INTERVAL '1 day'
        AND response_time_seconds IS NOT NULL
      GROUP BY DATE(created_at), incident_type
      ORDER BY date DESC
    `, [days]);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Response times error:', err);
    res.status(500).json({ success: false, error: 'Failed to load response time data' });
  }
});

export default router;
