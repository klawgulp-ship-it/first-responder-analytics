"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeWithClaude = analyzeWithClaude;
exports.generateReport = generateReport;
exports.predictResources = predictResources;
exports.optimizeResponseTimes = optimizeResponseTimes;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const connection_1 = require("../db/connection");
const anthropic = new sdk_1.default();
const SYSTEM_PROMPT = `You are an AI analyst embedded in a First Responder Analytics Platform for a city government.
You have access to a PostgreSQL database with the following tables:

TABLES:
- incidents (id, incident_number, incident_type[fire/ems/police/multi_agency/hazmat/rescue/traffic], priority[1-5], status, location_lat, location_lng, address, district_id, description, response_time_seconds, scene_time_seconds, total_time_seconds, created_at, dispatched_at, resolved_at, weather_conditions)
- incident_units (incident_id, unit_id, is_primary, dispatched_at, en_route_at, on_scene_at, cleared_at, response_time_seconds)
- incident_outcomes (incident_id, outcome_type, injuries_civilian, injuries_responder, fatalities, property_damage_estimate, narrative, follow_up_required)
- units (id, unit_number, unit_type[engine/ladder/ambulance/medic/patrol/swat/hazmat/rescue/battalion_chief/command/helicopter], station_id, status[available/dispatched/on_scene/out_of_service])
- personnel (id, badge_number, first_name, last_name, rank, unit_id, certifications, status)
- stations (id, station_number, name, address, location_lat, location_lng, district_id)
- districts (id, name, district_number, population, risk_level)
- response_zones (district_id, zone_type, target_response_time_seconds, avg_response_time_seconds)
- daily_stats (stat_date, district_id, fire_count, ems_count, police_count, total_incidents, avg_response_time_seconds, units_utilized_pct)
- dispatch_log (incident_id, unit_id, action, timestamp, notes)
- hazard_locations (name, hazard_type, address, district_id, risk_level, special_instructions)

IMPORTANT RULES:
1. When generating SQL, use ONLY read-only SELECT queries. Never generate INSERT, UPDATE, DELETE, DROP, or ALTER.
2. Always use parameterized-style references where possible.
3. Format response times in minutes:seconds for readability (e.g., "4:23" not "263 seconds").
4. When analyzing data, provide actionable insights, not just numbers.
5. Consider the context of first responder operations — lives depend on this data.
6. Flag any concerning trends or anomalies immediately.
7. Use professional, concise language appropriate for fire chiefs and city officials.`;
async function analyzeWithClaude(userQuery, context) {
    // First, ask Claude to generate SQL if the query needs data
    const sqlResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: `${SYSTEM_PROMPT}\n\nYour task: Given the user's question, determine if a SQL query is needed. If yes, respond with ONLY the SQL query wrapped in <sql> tags. If no SQL is needed (e.g., general advice), respond with <no_sql>. Only generate SELECT queries.`,
        messages: [{ role: 'user', content: context ? `Context: ${context}\n\nQuestion: ${userQuery}` : userQuery }],
    });
    const sqlText = sqlResponse.content[0].type === 'text' ? sqlResponse.content[0].text : '';
    let queryData = null;
    let executedSql;
    // Extract and execute SQL if present
    const sqlMatch = sqlText.match(/<sql>([\s\S]*?)<\/sql>/);
    if (sqlMatch) {
        const sql = sqlMatch[1].trim();
        // Safety check: only allow SELECT
        const normalized = sql.toUpperCase().trim();
        if (!normalized.startsWith('SELECT') && !normalized.startsWith('WITH')) {
            return {
                analysis: 'Query blocked: Only read-only SELECT queries are permitted.',
                suggestions: ['Please rephrase your question as a data retrieval request.'],
            };
        }
        try {
            const result = await (0, connection_1.query)(sql);
            queryData = result.rows;
            executedSql = sql;
        }
        catch (err) {
            const errMessage = err instanceof Error ? err.message : 'Unknown error';
            // If SQL fails, let Claude know and continue with analysis
            queryData = { error: `Query failed: ${errMessage}` };
        }
    }
    // Now get Claude's analysis of the data
    const analysisPrompt = queryData
        ? `The user asked: "${userQuery}"\n\nQuery results (${Array.isArray(queryData) ? queryData.length : 0} rows):\n${JSON.stringify(queryData, null, 2)}\n\nProvide a clear, actionable analysis of this data for a fire chief or city official. Include specific numbers, trends, and recommendations. Format response times as minutes:seconds.`
        : `The user asked: "${userQuery}"\n\nProvide helpful analysis and recommendations based on your knowledge of first responder operations and the available data schema.`;
    const analysisResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: analysisPrompt }],
    });
    const analysis = analysisResponse.content[0].type === 'text' ? analysisResponse.content[0].text : '';
    // Extract suggestions if Claude included them
    const suggestions = [];
    const suggestionMatches = analysis.match(/(?:recommend|suggest|consider|should).*?[.!]/gi);
    if (suggestionMatches) {
        suggestions.push(...suggestionMatches.slice(0, 5));
    }
    return {
        analysis,
        data: queryData,
        sqlExecuted: executedSql,
        suggestions,
    };
}
async function generateReport(reportType, targetDate) {
    const date = targetDate || new Date().toISOString().split('T')[0];
    let dateRange;
    switch (reportType) {
        case 'daily':
            dateRange = { start: date, end: date };
            break;
        case 'weekly': {
            const d = new Date(date);
            const weekStart = new Date(d.getTime() - d.getDay() * 86400000);
            dateRange = { start: weekStart.toISOString().split('T')[0], end: date };
            break;
        }
        case 'monthly': {
            const monthStart = date.substring(0, 7) + '-01';
            dateRange = { start: monthStart, end: date };
            break;
        }
    }
    // Gather comprehensive data for the report
    const [incidents, responsePerf, outcomes, unitUtil] = await Promise.all([
        (0, connection_1.query)(`
      SELECT incident_type, priority, status, COUNT(*) as count,
             AVG(response_time_seconds) as avg_response,
             AVG(total_time_seconds) as avg_total
      FROM incidents
      WHERE created_at::date BETWEEN $1 AND $2
      GROUP BY incident_type, priority, status
      ORDER BY incident_type, priority
    `, [dateRange.start, dateRange.end]),
        (0, connection_1.query)(`
      WITH district_targets AS (
        SELECT district_id, MIN(target_response_time_seconds) as target
        FROM response_zones WHERE zone_type = 'primary'
        GROUP BY district_id
      )
      SELECT d.name as district,
             COUNT(i.id) as incidents,
             AVG(i.response_time_seconds) as avg_response,
             dt.target,
             COUNT(CASE WHEN i.response_time_seconds <= dt.target THEN 1 END)::float
               / NULLIF(COUNT(i.id), 0) * 100 as on_target_pct
      FROM districts d
      LEFT JOIN incidents i ON i.district_id = d.id AND i.created_at::date BETWEEN $1 AND $2
      LEFT JOIN district_targets dt ON dt.district_id = d.id
      GROUP BY d.id, d.name, d.district_number, dt.target
      ORDER BY d.district_number
    `, [dateRange.start, dateRange.end]),
        (0, connection_1.query)(`
      SELECT io.outcome_type, COUNT(*) as count,
             SUM(io.injuries_civilian) as civilian_injuries,
             SUM(io.injuries_responder) as responder_injuries,
             SUM(io.fatalities) as fatalities,
             SUM(io.property_damage_estimate) as property_damage
      FROM incident_outcomes io
      JOIN incidents i ON i.id = io.incident_id
      WHERE i.created_at::date BETWEEN $1 AND $2
      GROUP BY io.outcome_type
    `, [dateRange.start, dateRange.end]),
        (0, connection_1.query)(`
      SELECT u.unit_number, u.unit_type, COUNT(iu.id) as calls,
             AVG(iu.response_time_seconds) as avg_response
      FROM units u
      LEFT JOIN incident_units iu ON iu.unit_id = u.id
        AND iu.dispatched_at::date BETWEEN $1 AND $2
      GROUP BY u.id, u.unit_number, u.unit_type
      ORDER BY calls DESC
    `, [dateRange.start, dateRange.end]),
    ]);
    const reportData = {
        period: { type: reportType, start: dateRange.start, end: dateRange.end },
        incidents: incidents.rows,
        responsePerformance: responsePerf.rows,
        outcomes: outcomes.rows,
        unitUtilization: unitUtil.rows,
    };
    const reportPrompt = `Generate a professional ${reportType} report for the period ${dateRange.start} to ${dateRange.end}.

DATA:
${JSON.stringify(reportData, null, 2)}

FORMAT THE REPORT WITH:
1. Executive Summary (2-3 sentences)
2. Key Metrics (incident counts, response times, personnel)
3. Performance by District (vs targets)
4. Notable Incidents or Concerns
5. Resource Utilization
6. Recommendations

Use professional language suitable for city council or department leadership. Include specific numbers. Format response times as minutes:seconds.`;
    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: reportPrompt }],
    });
    const analysis = response.content[0].type === 'text' ? response.content[0].text : '';
    return {
        analysis,
        data: reportData,
        suggestions: [],
    };
}
async function predictResources(targetDate, district) {
    // Get historical patterns
    const dayOfWeek = new Date(targetDate).getDay();
    const [historicalByDay, recentTrend, weatherCorrelation] = await Promise.all([
        (0, connection_1.query)(`
      SELECT incident_type, EXTRACT(HOUR FROM created_at) as hour,
             COUNT(*) as avg_count
      FROM incidents
      WHERE EXTRACT(DOW FROM created_at) = $1
        AND created_at >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY incident_type, hour
      ORDER BY incident_type, hour
    `, [dayOfWeek]),
        (0, connection_1.query)(`
      SELECT DATE(created_at) as date, COUNT(*) as total,
             COUNT(*) FILTER (WHERE incident_type = 'ems') as ems,
             COUNT(*) FILTER (WHERE incident_type = 'fire') as fire,
             COUNT(*) FILTER (WHERE incident_type = 'police') as police
      FROM incidents
      WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `),
        (0, connection_1.query)(`
      SELECT weather_conditions->>'conditions' as conditions,
             COUNT(*) as incidents,
             AVG(response_time_seconds) as avg_response
      FROM incidents
      WHERE weather_conditions IS NOT NULL
        AND created_at >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY conditions
      ORDER BY incidents DESC
    `),
    ]);
    const predictionData = {
        targetDate,
        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
        historicalPattern: historicalByDay.rows,
        recentTrend: recentTrend.rows,
        weatherCorrelation: weatherCorrelation.rows,
    };
    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{
                role: 'user',
                content: `Based on the following historical data, predict resource needs for ${targetDate} (${predictionData.dayOfWeek}).

DATA:
${JSON.stringify(predictionData, null, 2)}

Provide:
1. Predicted incident volume by type and hour
2. Recommended staffing levels
3. Units that should be pre-positioned
4. Any special considerations (weather, events, patterns)
5. Confidence level in predictions

Be specific with numbers and unit recommendations.`,
            }],
    });
    const analysis = response.content[0].type === 'text' ? response.content[0].text : '';
    return {
        analysis,
        data: predictionData,
    };
}
async function optimizeResponseTimes(districtId) {
    const districtFilter = districtId ? 'AND i.district_id = $1' : '';
    const params = districtId ? [districtId] : [];
    const [currentPerf, unitPositions, coverageGaps] = await Promise.all([
        (0, connection_1.query)(`
      SELECT d.name as district, s.name as station, u.unit_number, u.unit_type,
             COUNT(iu.id) as calls_30d,
             AVG(iu.response_time_seconds) as avg_response,
             PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY iu.response_time_seconds) as p90_response
      FROM units u
      JOIN stations s ON s.id = u.station_id
      JOIN districts d ON d.id = s.district_id
      LEFT JOIN incident_units iu ON iu.unit_id = u.id
        AND iu.dispatched_at >= CURRENT_DATE - INTERVAL '30 days'
      LEFT JOIN incidents i ON i.id = iu.incident_id ${districtFilter}
      GROUP BY d.name, s.name, u.unit_number, u.unit_type
      ORDER BY avg_response DESC NULLS LAST
    `, params),
        (0, connection_1.query)(`
      SELECT u.unit_number, u.unit_type, u.status,
             u.current_location_lat, u.current_location_lng,
             s.name as home_station, s.location_lat as station_lat, s.location_lng as station_lng
      FROM units u
      LEFT JOIN stations s ON s.id = u.station_id
      ORDER BY u.unit_number
    `),
        (0, connection_1.query)(`
      SELECT d.name as district,
             rz.zone_name, rz.target_response_time_seconds as target,
             rz.avg_response_time_seconds as current_avg,
             rz.avg_response_time_seconds - rz.target_response_time_seconds as gap_seconds
      FROM response_zones rz
      JOIN districts d ON d.id = rz.district_id
      WHERE rz.avg_response_time_seconds > rz.target_response_time_seconds
      ORDER BY gap_seconds DESC
    `),
    ]);
    const optimizationData = {
        currentPerformance: currentPerf.rows,
        unitPositions: unitPositions.rows,
        coverageGaps: coverageGaps.rows,
    };
    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages: [{
                role: 'user',
                content: `Analyze the current unit positioning and response time data to recommend optimizations.

DATA:
${JSON.stringify(optimizationData, null, 2)}

Provide specific, actionable recommendations:
1. Which units should be repositioned and where
2. Expected improvement in response times
3. Coverage gaps that need addressing
4. Shift-specific recommendations (day vs night)
5. Priority of changes (quick wins vs longer-term)

Be specific: "Move Engine 4 from Station 3 to Station 7 during night shift" not "consider repositioning units."`,
            }],
    });
    const analysis = response.content[0].type === 'text' ? response.content[0].text : '';
    return {
        analysis,
        data: optimizationData,
    };
}
//# sourceMappingURL=claude-service.js.map