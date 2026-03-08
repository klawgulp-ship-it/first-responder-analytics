import Anthropic from '@anthropic-ai/sdk';
import { query } from '../db/connection';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are an AI analyst embedded in a First Responder Analytics Platform for a city government (Pensacola, FL).
You have access to a PostgreSQL database with the following schema:

TABLES & COLUMNS:
- incidents (id UUID, incident_number VARCHAR, incident_type incident_type, priority incident_priority, status incident_status, location_lat DECIMAL, location_lng DECIMAL, address VARCHAR, district_id UUID, description TEXT, response_time_seconds INTEGER, scene_time_seconds INTEGER, total_time_seconds INTEGER, created_at TIMESTAMPTZ, dispatched_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ, closed_at TIMESTAMPTZ, weather_conditions JSONB {temp_f, humidity_pct, conditions})
- incident_units (id UUID, incident_id UUID, unit_id UUID, is_primary BOOLEAN, dispatched_at TIMESTAMPTZ, en_route_at TIMESTAMPTZ, on_scene_at TIMESTAMPTZ, cleared_at TIMESTAMPTZ, response_time_seconds INTEGER, notes TEXT)
- incident_outcomes (id UUID, incident_id UUID, outcome_type outcome_type, injuries_civilian INTEGER, injuries_responder INTEGER, fatalities INTEGER, property_damage_estimate DECIMAL, narrative TEXT, follow_up_required BOOLEAN)
- units (id UUID, unit_number VARCHAR, unit_type unit_type, station_id UUID, status unit_status, current_location_lat DECIMAL, current_location_lng DECIMAL)
- personnel (id UUID, badge_number VARCHAR, first_name VARCHAR, last_name VARCHAR, rank personnel_rank, unit_id UUID, certifications TEXT[], status personnel_status)
- stations (id UUID, station_number INTEGER, name VARCHAR, address VARCHAR, location_lat DECIMAL, location_lng DECIMAL, district_id UUID)
- districts (id UUID, name VARCHAR, district_number INTEGER, population INTEGER, risk_level risk_level)
- response_zones (id UUID, district_id UUID, zone_name VARCHAR, zone_type VARCHAR, target_response_time_seconds INTEGER, avg_response_time_seconds DECIMAL)
- daily_stats (stat_date DATE, district_id UUID, fire_count INTEGER, ems_count INTEGER, police_count INTEGER, total_incidents INTEGER, avg_response_time_seconds DECIMAL, units_utilized_pct DECIMAL)
- dispatch_log (incident_id UUID, unit_id UUID, action dispatch_action, timestamp TIMESTAMPTZ, notes TEXT)
- hazard_locations (name VARCHAR, hazard_type hazard_type, address VARCHAR, district_id UUID, risk_level risk_level, special_instructions TEXT)

ENUM TYPES (use TEXT values, always quote them):
- incident_type: 'fire', 'ems', 'police', 'multi_agency', 'hazmat', 'rescue', 'traffic'
- incident_priority: '1', '2', '3', '4', '5' (THESE ARE TEXT ENUM VALUES, NOT INTEGERS — always use e.g. priority = '1' NOT priority = 1)
- incident_status: 'received', 'dispatched', 'en_route', 'on_scene', 'resolved', 'closed', 'cancelled'
- unit_type: 'engine', 'ladder', 'ambulance', 'medic', 'patrol', 'detective', 'swat', 'hazmat', 'rescue', 'battalion_chief', 'command', 'helicopter'
- unit_status: 'available', 'dispatched', 'en_route', 'on_scene', 'returning', 'out_of_service', 'maintenance'
- personnel_rank: 'firefighter', 'engineer', 'lieutenant', 'captain', 'battalion_chief', 'deputy_chief', 'chief', 'emt', 'paramedic', 'officer', 'sergeant', 'detective', 'commander', 'dispatcher'
- risk_level: 'low', 'moderate', 'high', 'critical'
- outcome_type: 'resolved', 'arrest', 'transport_hospital', 'fire_extinguished', 'false_alarm', 'referred', 'no_action_needed', 'ongoing_investigation', 'mutual_aid', 'patient_refused'

CRITICAL SQL RULES:
1. ONLY generate read-only SELECT or WITH...SELECT queries. Never INSERT, UPDATE, DELETE, DROP, ALTER.
2. ENUM comparisons: Always cast or quote enum values. Use incidents.priority = '1' NOT priority = 1. Use incidents.incident_type = 'fire' NOT 'FIRE'. Enum values are ALWAYS lowercase.
3. Do NOT use parameterized placeholders ($1, $2). Write literal values directly in the query.
4. For date filtering use: created_at >= CURRENT_DATE - INTERVAL '7 days' (not CURRENT_TIMESTAMP).
5. When using PERCENTILE_CONT, always add a WHERE clause to filter out NULL values first.
6. Format response times in minutes:seconds for readability (e.g., "4:23" not "263 seconds").
7. When analyzing data, provide actionable insights, not just numbers.
8. Consider the context of first responder operations — lives depend on this data.
9. Flag any concerning trends or anomalies immediately.
10. Use professional, concise language appropriate for fire chiefs and city officials.`;

interface AnalysisResult {
  analysis: string;
  data?: unknown;
  sqlExecuted?: string;
  suggestions?: string[];
}

async function generateAndExecuteSql(userQuery: string, context?: string, retryError?: string): Promise<{ queryData: unknown; executedSql?: string }> {
  const retryHint = retryError
    ? `\n\nIMPORTANT: Your previous SQL query failed with this error: "${retryError}". Fix the SQL. Common issues: enum values must be quoted strings (priority = '1' not 1), enum values are lowercase, and column names must match the schema exactly.`
    : '';

  const sqlResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: `${SYSTEM_PROMPT}\n\nYour task: Given the user's question, determine if a SQL query is needed. If yes, respond with ONLY the SQL query wrapped in <sql> tags. If no SQL is needed (e.g., general advice), respond with <no_sql>. Only generate SELECT queries.${retryHint}`,
    messages: [{ role: 'user', content: context ? `Context: ${context}\n\nQuestion: ${userQuery}` : userQuery }],
  });

  const sqlText = sqlResponse.content[0].type === 'text' ? sqlResponse.content[0].text : '';

  const sqlMatch = sqlText.match(/<sql>([\s\S]*?)<\/sql>/);
  if (!sqlMatch) {
    return { queryData: null };
  }

  const sql = sqlMatch[1].trim();

  // Safety check: only allow SELECT/WITH
  const normalized = sql.toUpperCase().trim();
  if (!normalized.startsWith('SELECT') && !normalized.startsWith('WITH')) {
    return { queryData: { error: 'Query blocked: Only read-only SELECT queries are permitted.' } };
  }

  try {
    const result = await query(sql);
    return { queryData: result.rows, executedSql: sql };
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : 'Unknown error';
    // On first attempt, retry with the error message so Claude can fix the SQL
    if (!retryError) {
      console.warn('SQL failed, retrying with error hint:', errMessage);
      return generateAndExecuteSql(userQuery, context, errMessage);
    }
    // Second failure — give up and pass error to analysis
    return { queryData: { error: `Query failed: ${errMessage}` } };
  }
}

export async function analyzeWithClaude(userQuery: string, context?: string): Promise<AnalysisResult> {
  const { queryData, executedSql } = await generateAndExecuteSql(userQuery, context);

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

  const suggestions: string[] = [];
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

export async function generateReport(
  reportType: 'daily' | 'weekly' | 'monthly',
  targetDate?: string
): Promise<AnalysisResult> {
  const date = targetDate || new Date().toISOString().split('T')[0];

  let dateRange: { start: string; end: string };
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
    query(`
      SELECT incident_type, priority, status, COUNT(*) as count,
             AVG(response_time_seconds) as avg_response,
             AVG(total_time_seconds) as avg_total
      FROM incidents
      WHERE created_at::date BETWEEN $1 AND $2
      GROUP BY incident_type, priority, status
      ORDER BY incident_type, priority
    `, [dateRange.start, dateRange.end]),

    query(`
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

    query(`
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

    query(`
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

export async function predictResources(targetDate: string, district?: string): Promise<AnalysisResult> {
  // Get historical patterns
  const dayOfWeek = new Date(targetDate).getDay();

  const [historicalByDay, recentTrend, weatherCorrelation] = await Promise.all([
    query(`
      SELECT incident_type, EXTRACT(HOUR FROM created_at) as hour,
             COUNT(*) as avg_count
      FROM incidents
      WHERE EXTRACT(DOW FROM created_at) = $1
        AND created_at >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY incident_type, hour
      ORDER BY incident_type, hour
    `, [dayOfWeek]),

    query(`
      SELECT DATE(created_at) as date, COUNT(*) as total,
             COUNT(*) FILTER (WHERE incident_type = 'ems') as ems,
             COUNT(*) FILTER (WHERE incident_type = 'fire') as fire,
             COUNT(*) FILTER (WHERE incident_type = 'police') as police
      FROM incidents
      WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `),

    query(`
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

export async function optimizeResponseTimes(districtId?: string): Promise<AnalysisResult> {
  const districtFilter = districtId ? 'AND i.district_id = $1' : '';
  const params = districtId ? [districtId] : [];

  const [currentPerf, unitPositions, coverageGaps] = await Promise.all([
    query(`
      WITH unit_calls AS (
        SELECT iu.unit_id,
               COUNT(*) as calls_30d,
               AVG(iu.response_time_seconds) as avg_response,
               PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY iu.response_time_seconds) as p90_response
        FROM incident_units iu
        ${districtFilter ? `JOIN incidents i ON i.id = iu.incident_id ${districtFilter}` : ''}
        WHERE iu.dispatched_at >= CURRENT_DATE - INTERVAL '30 days'
          AND iu.response_time_seconds IS NOT NULL
        GROUP BY iu.unit_id
      )
      SELECT d.name as district, s.name as station, u.unit_number, u.unit_type,
             COALESCE(uc.calls_30d, 0) as calls_30d,
             uc.avg_response,
             uc.p90_response
      FROM units u
      JOIN stations s ON s.id = u.station_id
      JOIN districts d ON d.id = s.district_id
      LEFT JOIN unit_calls uc ON uc.unit_id = u.id
      ORDER BY uc.avg_response DESC NULLS LAST
    `, params),

    query(`
      SELECT u.unit_number, u.unit_type, u.status,
             u.current_location_lat, u.current_location_lng,
             s.name as home_station, s.location_lat as station_lat, s.location_lng as station_lng
      FROM units u
      LEFT JOIN stations s ON s.id = u.station_id
      ORDER BY u.unit_number
    `),

    query(`
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
