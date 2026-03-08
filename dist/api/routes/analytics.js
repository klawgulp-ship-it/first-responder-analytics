"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_1 = require("../../db/connection");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// GET /api/analytics/response-performance — response time analysis
router.get('/response-performance', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const [byDistrict, byType, byHour, byDayOfWeek, trend] = await Promise.all([
            // Response times by district
            (0, connection_1.query)(`
        SELECT d.name as district, d.district_number,
               COUNT(i.id) as incidents,
               ROUND(AVG(i.response_time_seconds)::numeric, 0) as avg_response,
               ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY i.response_time_seconds)::numeric, 0) as median_response,
               ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY i.response_time_seconds)::numeric, 0) as p90_response,
               MIN(rz.target_response_time_seconds) as target
        FROM districts d
        LEFT JOIN incidents i ON i.district_id = d.id
          AND i.created_at >= CURRENT_DATE - $1 * INTERVAL '1 day'
          AND i.response_time_seconds IS NOT NULL
        LEFT JOIN response_zones rz ON rz.district_id = d.id AND rz.zone_type = 'primary'
        GROUP BY d.id, d.name, d.district_number
        ORDER BY d.district_number
      `, [days]),
            // By incident type
            (0, connection_1.query)(`
        SELECT incident_type,
               COUNT(*) as incidents,
               ROUND(AVG(response_time_seconds)::numeric, 0) as avg_response,
               ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY response_time_seconds)::numeric, 0) as p90_response
        FROM incidents
        WHERE created_at >= CURRENT_DATE - $1 * INTERVAL '1 day'
          AND response_time_seconds IS NOT NULL
        GROUP BY incident_type
        ORDER BY incidents DESC
      `, [days]),
            // By hour of day
            (0, connection_1.query)(`
        SELECT EXTRACT(HOUR FROM created_at)::integer as hour,
               COUNT(*) as incidents,
               ROUND(AVG(response_time_seconds)::numeric, 0) as avg_response
        FROM incidents
        WHERE created_at >= CURRENT_DATE - $1 * INTERVAL '1 day'
          AND response_time_seconds IS NOT NULL
        GROUP BY hour
        ORDER BY hour
      `, [days]),
            // By day of week
            (0, connection_1.query)(`
        SELECT EXTRACT(DOW FROM created_at)::integer as day_of_week,
               COUNT(*) as incidents,
               ROUND(AVG(response_time_seconds)::numeric, 0) as avg_response
        FROM incidents
        WHERE created_at >= CURRENT_DATE - $1 * INTERVAL '1 day'
          AND response_time_seconds IS NOT NULL
        GROUP BY day_of_week
        ORDER BY day_of_week
      `, [days]),
            // Daily trend
            (0, connection_1.query)(`
        SELECT DATE(created_at) as date,
               COUNT(*) as incidents,
               ROUND(AVG(response_time_seconds)::numeric, 0) as avg_response
        FROM incidents
        WHERE created_at >= CURRENT_DATE - $1 * INTERVAL '1 day'
          AND response_time_seconds IS NOT NULL
        GROUP BY DATE(created_at)
        ORDER BY date
      `, [days]),
        ]);
        res.json({
            success: true,
            data: {
                byDistrict: byDistrict.rows,
                byType: byType.rows,
                byHour: byHour.rows,
                byDayOfWeek: byDayOfWeek.rows,
                trend: trend.rows,
            },
        });
    }
    catch (err) {
        console.error('Response performance error:', err);
        res.status(500).json({ success: false, error: 'Failed to load analytics' });
    }
});
// GET /api/analytics/incident-patterns — incident pattern analysis
router.get('/incident-patterns', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 90;
        const [weeklyTrend, topLocations, typeDistribution, outcomeBreakdown] = await Promise.all([
            // Weekly trend
            (0, connection_1.query)(`
        SELECT DATE_TRUNC('week', created_at)::date as week_start,
               incident_type,
               COUNT(*) as count
        FROM incidents
        WHERE created_at >= CURRENT_DATE - $1 * INTERVAL '1 day'
        GROUP BY week_start, incident_type
        ORDER BY week_start
      `, [days]),
            // Top incident locations
            (0, connection_1.query)(`
        SELECT address, COUNT(*) as incident_count,
               array_agg(DISTINCT incident_type) as types
        FROM incidents
        WHERE created_at >= CURRENT_DATE - $1 * INTERVAL '1 day'
        GROUP BY address
        ORDER BY incident_count DESC
        LIMIT 15
      `, [days]),
            // Priority distribution
            (0, connection_1.query)(`
        SELECT incident_type, priority, COUNT(*) as count
        FROM incidents
        WHERE created_at >= CURRENT_DATE - $1 * INTERVAL '1 day'
        GROUP BY incident_type, priority
        ORDER BY incident_type, priority
      `, [days]),
            // Outcome breakdown
            (0, connection_1.query)(`
        SELECT io.outcome_type, COUNT(*) as count,
               SUM(io.injuries_civilian) as total_civilian_injuries,
               SUM(io.injuries_responder) as total_responder_injuries,
               SUM(io.fatalities) as total_fatalities,
               SUM(io.property_damage_estimate) as total_property_damage
        FROM incident_outcomes io
        JOIN incidents i ON i.id = io.incident_id
        WHERE i.created_at >= CURRENT_DATE - $1 * INTERVAL '1 day'
        GROUP BY io.outcome_type
        ORDER BY count DESC
      `, [days]),
        ]);
        res.json({
            success: true,
            data: {
                weeklyTrend: weeklyTrend.rows,
                topLocations: topLocations.rows,
                typeDistribution: typeDistribution.rows,
                outcomeBreakdown: outcomeBreakdown.rows,
            },
        });
    }
    catch (err) {
        console.error('Incident patterns error:', err);
        res.status(500).json({ success: false, error: 'Failed to load patterns' });
    }
});
// GET /api/analytics/resource-utilization — unit/personnel utilization
router.get('/resource-utilization', (0, auth_1.authorize)('chief', 'captain', 'analyst', 'admin'), async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const [unitWorkload, stationActivity, busyUnits] = await Promise.all([
            // Calls per unit
            (0, connection_1.query)(`
          SELECT u.unit_number, u.unit_type, s.name as station_name,
                 COUNT(iu.id) as total_calls,
                 ROUND(AVG(iu.response_time_seconds)::numeric, 0) as avg_response,
                 ROUND(SUM(EXTRACT(EPOCH FROM (COALESCE(iu.cleared_at, NOW()) - iu.dispatched_at)))::numeric / 3600, 1) as total_hours_active
          FROM units u
          LEFT JOIN incident_units iu ON iu.unit_id = u.id
            AND iu.dispatched_at >= CURRENT_DATE - $1 * INTERVAL '1 day'
          LEFT JOIN stations s ON s.id = u.station_id
          GROUP BY u.id, u.unit_number, u.unit_type, s.name
          ORDER BY total_calls DESC
        `, [days]),
            // Incidents per station
            (0, connection_1.query)(`
          SELECT s.name as station_name, s.station_number,
                 COUNT(DISTINCT iu.incident_id) as total_incidents,
                 COUNT(DISTINCT u.id) as unit_count
          FROM stations s
          LEFT JOIN units u ON u.station_id = s.id
          LEFT JOIN incident_units iu ON iu.unit_id = u.id
            AND iu.dispatched_at >= CURRENT_DATE - $1 * INTERVAL '1 day'
          GROUP BY s.id, s.name, s.station_number
          ORDER BY s.station_number
        `, [days]),
            // Busiest units (top 10)
            (0, connection_1.query)(`
          SELECT u.unit_number, u.unit_type, COUNT(iu.id) as call_count,
                 ROUND(AVG(iu.response_time_seconds)::numeric, 0) as avg_response
          FROM units u
          JOIN incident_units iu ON iu.unit_id = u.id
            AND iu.dispatched_at >= CURRENT_DATE - $1 * INTERVAL '1 day'
          GROUP BY u.id, u.unit_number, u.unit_type
          ORDER BY call_count DESC
          LIMIT 10
        `, [days]),
        ]);
        res.json({
            success: true,
            data: {
                unitWorkload: unitWorkload.rows,
                stationActivity: stationActivity.rows,
                busiestUnits: busyUnits.rows,
            },
        });
    }
    catch (err) {
        console.error('Utilization error:', err);
        res.status(500).json({ success: false, error: 'Failed to load utilization data' });
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map