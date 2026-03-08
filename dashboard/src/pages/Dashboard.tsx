import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { api } from '../services/api';

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#be185d'];
const STATUS_COLORS: Record<string, string> = {
  available: '#16a34a',
  dispatched: '#ea580c',
  en_route: '#2563eb',
  on_scene: '#dc2626',
  out_of_service: '#6b7280',
  returning: '#0891b2',
  maintenance: '#9333ea',
};

function formatTime(seconds: number | null): string {
  if (!seconds) return '--';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface Props {
  page: string;
}

export function Dashboard({ page }: Props) {
  switch (page) {
    case 'dashboard': return <OverviewDashboard />;
    case 'incidents': return <IncidentsPage />;
    case 'units': return <UnitsPage />;
    case 'analytics': return <AnalyticsPage />;
    case 'ai': return <AiAssistantPage />;
    default: return <OverviewDashboard />;
  }
}

// ============================================================
// OVERVIEW DASHBOARD
// ============================================================
function OverviewDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // AI Query state — right on the command dashboard
  const [aiQuery, setAiQuery] = useState('');
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Shift report state
  const [shiftReport, setShiftReport] = useState<any>(null);
  const [shiftLoading, setShiftLoading] = useState(false);

  // Predictive staffing state
  const [prediction, setPrediction] = useState<any>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  useEffect(() => {
    api.getDashboard()
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAiQuery = async (q?: string) => {
    const question = q || aiQuery;
    if (!question.trim() || aiLoading) return;
    setAiQuery('');
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.aiQuery(question);
      setAiResult({ query: question, ...res.data });
    } catch (err: any) {
      setAiResult({ query: question, analysis: 'Query failed: ' + (err.message || 'Unknown error'), error: true });
    } finally {
      setAiLoading(false);
    }
  };

  const handleShiftReport = async () => {
    setShiftLoading(true);
    try {
      const res = await api.aiReport('daily');
      setShiftReport(res.data);
    } catch (err: any) {
      setShiftReport({ analysis: 'Report generation failed: ' + err.message, error: true });
    } finally {
      setShiftLoading(false);
    }
  };

  const handlePrediction = async () => {
    setPredictionLoading(true);
    try {
      const res = await api.aiPredict();
      setPrediction(res.data);
    } catch (err: any) {
      setPrediction({ analysis: 'Prediction failed: ' + err.message, error: true });
    } finally {
      setPredictionLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!data) return <div className="error">Failed to load dashboard</div>;

  const unitStatusData = Object.entries(data.unitsByStatus).map(([status, count]) => ({
    name: status.replace('_', ' '),
    value: count as number,
    color: STATUS_COLORS[status] || '#6b7280',
  }));

  const typeData = Object.entries(data.incidentsByType).map(([type, count]) => ({
    name: type.toUpperCase(),
    count: count as number,
  }));

  const SUGGESTED_QUERIES = [
    "What's our average response time this week?",
    "Which district needs more coverage on weekends?",
    "Show me incident trends for the last 90 days",
    "Show me all structure fires last month with response times over 6 minutes",
    "What's our busiest time for EMS calls?",
    "Which units are responding to the most calls this month?",
  ];

  return (
    <div className="dashboard-page">
      <h2>Command Dashboard</h2>

      {/* ============================================================
          AI QUERY BOX — THE KILLER FEATURE, FRONT AND CENTER
          ============================================================ */}
      <div className="ai-query-hero">
        <div className="ai-query-header">
          <span className="ai-badge">AI-POWERED</span>
          <h3>Ask Anything About Your Operations</h3>
        </div>
        <div className="ai-query-input-row">
          <input
            type="text"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAiQuery()}
            placeholder='Try: "Show me all structure fires last month with response times over 6 minutes"'
            disabled={aiLoading}
          />
          <button onClick={() => handleAiQuery()} disabled={aiLoading || !aiQuery.trim()}>
            {aiLoading ? 'Analyzing...' : 'Ask AI'}
          </button>
        </div>
        <div className="ai-suggestions-row">
          {SUGGESTED_QUERIES.map((q, i) => (
            <button key={i} className="ai-suggestion-chip" onClick={() => handleAiQuery(q)}>
              {q}
            </button>
          ))}
        </div>
        {aiLoading && (
          <div className="ai-result-box">
            <div className="ai-result-loading">Claude is analyzing your data...</div>
          </div>
        )}
        {aiResult && !aiLoading && (
          <div className={`ai-result-box ${aiResult.error ? 'error' : ''}`}>
            <div className="ai-result-query">Q: {aiResult.query}</div>
            <div className="ai-result-content">
              {aiResult.analysis?.split('\n').map((line: string, i: number) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            {aiResult.sqlExecuted && (
              <details className="ai-sql-details">
                <summary>View SQL Query</summary>
                <pre>{aiResult.sqlExecuted}</pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card red">
          <div className="kpi-value">{data.activeIncidents}</div>
          <div className="kpi-label">Active Incidents</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-value">{data.availableUnits}/{data.totalUnits}</div>
          <div className="kpi-label">Units Available</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-value">{formatTime(data.avgResponseTime)}</div>
          <div className="kpi-label">Avg Response (7d)</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-value">{data.incidentsToday}</div>
          <div className="kpi-label">Incidents Today</div>
        </div>
      </div>

      {/* AI Action Cards Row */}
      <div className="charts-row">
        <div className="chart-card ai-action-card">
          <div className="ai-action-header">
            <h3>Shift Report</h3>
            <button
              className="ai-action-btn"
              onClick={handleShiftReport}
              disabled={shiftLoading}
            >
              {shiftLoading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
          <p className="ai-action-desc">
            One-click AI-generated shift summary. Key metrics, incidents handled,
            anomalies flagged, and recommendations — no manual writing required.
          </p>
          {shiftReport && (
            <div className="ai-action-result">
              {shiftReport.analysis?.split('\n').slice(0, 20).map((line: string, i: number) => (
                <p key={i}>{line}</p>
              ))}
              {shiftReport.analysis?.split('\n').length > 20 && (
                <p className="ai-result-truncated">... view full report in AI Assistant</p>
              )}
            </div>
          )}
        </div>

        <div className="chart-card ai-action-card">
          <div className="ai-action-header">
            <h3>Predictive Staffing</h3>
            <button
              className="ai-action-btn"
              onClick={handlePrediction}
              disabled={predictionLoading}
            >
              {predictionLoading ? 'Analyzing...' : 'Predict Tomorrow'}
            </button>
          </div>
          <p className="ai-action-desc">
            AI analyzes 90 days of historical patterns to predict tomorrow's
            incident volume and recommend staffing levels by district and hour.
          </p>
          {prediction && (
            <div className="ai-action-result">
              {prediction.analysis?.split('\n').slice(0, 20).map((line: string, i: number) => (
                <p key={i}>{line}</p>
              ))}
              {prediction.analysis?.split('\n').length > 20 && (
                <p className="ai-result-truncated">... view full analysis in AI Assistant</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>Unit Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={unitStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {unitStatusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Today's Incidents by Type</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={typeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* District Performance */}
      <div className="chart-card full-width">
        <h3>District Performance (30 Day)</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>District</th>
                <th>Incidents</th>
                <th>Avg Response</th>
                <th>Target</th>
                <th>On Target %</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.districtPerformance.map((d: any) => (
                <tr key={d.district_id}>
                  <td><strong>{d.district_name}</strong></td>
                  <td>{d.total_incidents}</td>
                  <td>{formatTime(d.avg_response_time)}</td>
                  <td>{formatTime(d.target_response_time)}</td>
                  <td>{d.on_target_pct || 0}%</td>
                  <td>
                    <span className={`status-badge ${parseFloat(d.on_target_pct) >= 80 ? 'good' : parseFloat(d.on_target_pct) >= 60 ? 'warn' : 'bad'}`}>
                      {parseFloat(d.on_target_pct) >= 80 ? 'On Track' : parseFloat(d.on_target_pct) >= 60 ? 'Warning' : 'Below Target'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="chart-card full-width">
        <h3>Recent Incidents</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Address</th>
                <th>Response Time</th>
                <th>Units</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {data.recentIncidents.slice(0, 10).map((inc: any) => (
                <tr key={inc.id}>
                  <td className="mono">{inc.incident_number}</td>
                  <td><span className={`type-badge ${inc.incident_type}`}>{inc.incident_type.toUpperCase()}</span></td>
                  <td><span className={`priority-badge p${inc.priority}`}>P{inc.priority}</span></td>
                  <td><span className={`status-chip ${inc.status}`}>{inc.status}</span></td>
                  <td>{inc.address}</td>
                  <td>{formatTime(inc.response_time_seconds)}</td>
                  <td>{inc.units_assigned}</td>
                  <td>{new Date(inc.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// INCIDENTS PAGE
// ============================================================
function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [meta, setMeta] = useState<any>(null);

  const load = useCallback(async (params?: Record<string, string>) => {
    setLoading(true);
    try {
      const res = await api.getIncidents({ ...filters, ...params });
      setIncidents(res.data);
      setMeta(res.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="dashboard-page">
      <h2>Incident Management</h2>

      {/* Filters */}
      <div className="filter-bar">
        <select value={filters.type || ''} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
          <option value="">All Types</option>
          {['fire', 'ems', 'police', 'traffic', 'multi_agency', 'hazmat', 'rescue'].map((t) => (
            <option key={t} value={t}>{t.toUpperCase()}</option>
          ))}
        </select>
        <select value={filters.priority || ''} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
          <option value="">All Priorities</option>
          {['1', '2', '3', '4', '5'].map((p) => (
            <option key={p} value={p}>Priority {p}</option>
          ))}
        </select>
        <select value={filters.status || ''} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Statuses</option>
          {['dispatched', 'en_route', 'on_scene', 'resolved', 'closed'].map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search..."
          value={filters.search || ''}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <button className="btn-primary" onClick={() => load()}>Apply</button>
      </div>

      {loading ? (
        <div className="loading">Loading incidents...</div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Incident #</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Address</th>
                  <th>Description</th>
                  <th>Response</th>
                  <th>Units</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc: any) => (
                  <tr key={inc.id}>
                    <td className="mono">{inc.incident_number}</td>
                    <td><span className={`type-badge ${inc.incident_type}`}>{inc.incident_type.toUpperCase()}</span></td>
                    <td><span className={`priority-badge p${inc.priority}`}>P{inc.priority}</span></td>
                    <td><span className={`status-chip ${inc.status}`}>{inc.status}</span></td>
                    <td>{inc.address}</td>
                    <td className="description-cell">{inc.description}</td>
                    <td>{formatTime(inc.response_time_seconds)}</td>
                    <td>{inc.units_count}</td>
                    <td>{new Date(inc.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && (
            <div className="pagination">
              <span>Page {meta.page} of {meta.totalPages} ({meta.total} total)</span>
              <div>
                <button
                  disabled={meta.page <= 1}
                  onClick={() => load({ page: String(meta.page - 1) })}
                >Prev</button>
                <button
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => load({ page: String(meta.page + 1) })}
                >Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// UNITS PAGE
// ============================================================
function UnitsPage() {
  const [units, setUnits] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getUnits(), api.getUnitAvailability()])
      .then(([unitsRes, availRes]) => {
        setUnits(unitsRes.data);
        setAvailability(availRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading units...</div>;

  return (
    <div className="dashboard-page">
      <h2>Unit Management</h2>

      {/* Availability Summary */}
      {availability?.summary && (
        <div className="kpi-grid">
          {availability.summary.map((s: any) => (
            <div key={s.unit_type} className="kpi-card">
              <div className="kpi-value">{s.available}/{s.total}</div>
              <div className="kpi-label">{s.unit_type.replace('_', ' ')} Available</div>
              {parseInt(s.oos) > 0 && <div className="kpi-sub">{s.oos} out of service</div>}
            </div>
          ))}
        </div>
      )}

      {/* Unit List */}
      <div className="chart-card full-width">
        <h3>All Units</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Unit #</th>
                <th>Type</th>
                <th>Status</th>
                <th>Station</th>
                <th>District</th>
                <th>Personnel</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u: any) => (
                <tr key={u.id}>
                  <td className="mono"><strong>{u.unit_number}</strong></td>
                  <td>{u.unit_type.replace('_', ' ')}</td>
                  <td>
                    <span className={`status-chip ${u.status}`} style={{ backgroundColor: STATUS_COLORS[u.status] }}>
                      {u.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{u.station_name}</td>
                  <td>{u.district_name}</td>
                  <td>{u.personnel_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ANALYTICS PAGE
// ============================================================
function AnalyticsPage() {
  const [perfData, setPerfData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    api.getResponsePerformance(days)
      .then((res) => setPerfData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="loading">Loading analytics...</div>;
  if (!perfData) return <div className="error">Failed to load analytics</div>;

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dowData = perfData.byDayOfWeek.map((d: any) => ({
    ...d,
    day_name: dayNames[d.day_of_week],
    avg_response_min: (d.avg_response / 60).toFixed(1),
  }));

  const hourData = perfData.byHour.map((h: any) => ({
    ...h,
    hour_label: `${String(h.hour).padStart(2, '0')}:00`,
    avg_response_min: (h.avg_response / 60).toFixed(1),
  }));

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h2>Response Analytics</h2>
        <div className="time-selector">
          {[7, 30, 60, 90].map((d) => (
            <button key={d} className={days === d ? 'active' : ''} onClick={() => setDays(d)}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Response Time Trend */}
      <div className="chart-card full-width">
        <h3>Daily Response Time Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={perfData.trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={11} tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
            <YAxis label={{ value: 'seconds', angle: -90, position: 'insideLeft' }} />
            <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString()} formatter={(v: number) => [formatTime(v), 'Avg Response']} />
            <Line type="monotone" dataKey="avg_response" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="charts-row">
        {/* By Day of Week */}
        <div className="chart-card">
          <h3>By Day of Week</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day_name" />
              <YAxis />
              <Tooltip formatter={(v: number) => [`${v} incidents`, 'Count']} />
              <Bar dataKey="incidents" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By Hour */}
        <div className="chart-card">
          <h3>By Hour of Day</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={hourData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour_label" fontSize={10} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="incidents" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* District Table */}
      <div className="chart-card full-width">
        <h3>Performance by District</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>District</th>
                <th>Incidents</th>
                <th>Avg Response</th>
                <th>Median</th>
                <th>90th %ile</th>
                <th>Target</th>
                <th>Delta</th>
              </tr>
            </thead>
            <tbody>
              {perfData.byDistrict.map((d: any) => {
                const delta = d.target ? d.avg_response - d.target : 0;
                return (
                  <tr key={d.district_number}>
                    <td><strong>{d.district}</strong></td>
                    <td>{d.incidents}</td>
                    <td>{formatTime(d.avg_response)}</td>
                    <td>{formatTime(d.median_response)}</td>
                    <td>{formatTime(d.p90_response)}</td>
                    <td>{formatTime(d.target)}</td>
                    <td className={delta > 0 ? 'text-red' : 'text-green'}>
                      {delta > 0 ? '+' : ''}{formatTime(Math.abs(delta))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AI ASSISTANT PAGE
// ============================================================
function AiAssistantPage() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: string; content: string; data?: any }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!query.trim() || loading) return;
    const userMsg = query;
    setQuery('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await api.aiQuery(userMsg);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: res.data.analysis,
        data: res.data.data,
      }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'error', content: err.message || 'AI query failed' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async (type: string) => {
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: `Generate ${type} report` }]);
    try {
      const res = await api.aiReport(type);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.analysis, data: res.data.data }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'error', content: err.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-page ai-page">
      <h2>AI Command Assistant</h2>
      <p className="subtitle">Ask questions about your operations data in plain English.</p>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button onClick={() => handleReport('daily')}>Daily Report</button>
        <button onClick={() => handleReport('weekly')}>Weekly Report</button>
        <button onClick={() => handleReport('monthly')}>Monthly Report</button>
        <button onClick={async () => {
          setLoading(true);
          setMessages((prev) => [...prev, { role: 'user', content: 'Optimize response times' }]);
          try {
            const res = await api.aiOptimize();
            setMessages((prev) => [...prev, { role: 'assistant', content: res.data.analysis }]);
          } catch (err: any) {
            setMessages((prev) => [...prev, { role: 'error', content: err.message }]);
          } finally {
            setLoading(false);
          }
        }}>Optimize Response Times</button>
        <button onClick={async () => {
          setLoading(true);
          setMessages((prev) => [...prev, { role: 'user', content: 'Predict tomorrow\'s resource needs' }]);
          try {
            const res = await api.aiPredict();
            setMessages((prev) => [...prev, { role: 'assistant', content: res.data.analysis }]);
          } catch (err: any) {
            setMessages((prev) => [...prev, { role: 'error', content: err.message }]);
          } finally {
            setLoading(false);
          }
        }}>Predict Resources</button>
      </div>

      {/* Suggested Queries */}
      <div className="suggested-queries">
        {[
          "What's our average response time this week?",
          'Which district needs more coverage on weekends?',
          'Show me incident trends for the last 90 days',
          'Show me all structure fires last month with response times over 6 minutes',
          "What's our busiest time for EMS calls?",
          'Which units are responding to the most calls this month?',
          'Are there any districts consistently missing response time targets?',
        ].map((q) => (
          <button key={q} className="suggestion" onClick={() => { setQuery(q); }}>
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="chat-container">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role}`}>
            <div className="msg-header">{msg.role === 'user' ? 'You' : msg.role === 'error' ? 'Error' : 'AI Analyst'}</div>
            <div className="msg-content">
              {msg.content.split('\n').map((line, j) => (
                <p key={j}>{line}</p>
              ))}
            </div>
          </div>
        ))}
        {loading && <div className="chat-msg assistant"><div className="msg-content loading-dots">Analyzing...</div></div>}
      </div>

      {/* Input */}
      <div className="chat-input">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Ask about your operations data..."
          disabled={loading}
        />
        <button onClick={handleSubmit} disabled={loading || !query.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
