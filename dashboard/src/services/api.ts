const API_BASE = '/api';

let authToken: string | null = localStorage.getItem('fra_token');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });

  if (res.status === 401) {
    authToken = null;
    localStorage.removeItem('fra_token');
    window.location.reload();
    throw new Error('Session expired');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  login: async (username: string, password: string) => {
    const data = await request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    authToken = data.data.token;
    localStorage.setItem('fra_token', data.data.token);
    return data.data;
  },

  logout: () => {
    authToken = null;
    localStorage.removeItem('fra_token');
  },

  isAuthenticated: () => !!authToken,

  // Dashboard
  getDashboard: () => request<any>('/dashboard'),
  getHeatmap: (days?: number, type?: string) => {
    const params = new URLSearchParams();
    if (days) params.set('days', String(days));
    if (type) params.set('type', type);
    return request<any>(`/dashboard/heatmap?${params}`);
  },
  getResponseTimes: (days?: number) =>
    request<any>(`/dashboard/response-times?days=${days || 30}`),

  // Incidents
  getIncidents: (params?: Record<string, string>) => {
    const search = new URLSearchParams(params);
    return request<any>(`/incidents?${search}`);
  },
  getIncident: (id: string) => request<any>(`/incidents/${id}`),

  // Units
  getUnits: (params?: Record<string, string>) => {
    const search = new URLSearchParams(params);
    return request<any>(`/units?${search}`);
  },
  getUnitAvailability: () => request<any>('/units/availability'),

  // Analytics
  getResponsePerformance: (days?: number) =>
    request<any>(`/analytics/response-performance?days=${days || 30}`),
  getIncidentPatterns: (days?: number) =>
    request<any>(`/analytics/incident-patterns?days=${days || 90}`),
  getResourceUtilization: (days?: number) =>
    request<any>(`/analytics/resource-utilization?days=${days || 30}`),

  // AI
  aiQuery: (query: string) =>
    request<any>('/ai/query', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
  aiReport: (type: string, date?: string) =>
    request<any>(`/ai/report/${type}${date ? `?date=${date}` : ''}`),
  aiPredict: (date?: string) =>
    request<any>(`/ai/predict${date ? `?date=${date}` : ''}`),
  aiOptimize: () => request<any>('/ai/optimize'),
};
