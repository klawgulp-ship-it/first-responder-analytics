import { Request } from 'express';

export interface AuthUser {
  id: string;
  username: string;
  role: 'chief' | 'captain' | 'dispatcher' | 'analyst' | 'admin' | 'read_only';
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardMetrics {
  activeIncidents: number;
  availableUnits: number;
  totalUnits: number;
  avgResponseTime: number;
  incidentsToday: number;
  incidentsByType: Record<string, number>;
  unitsByStatus: Record<string, number>;
  recentIncidents: IncidentSummary[];
  districtPerformance: DistrictPerformance[];
}

export interface IncidentSummary {
  id: string;
  incident_number: string;
  incident_type: string;
  priority: string;
  status: string;
  address: string;
  description: string;
  created_at: string;
  response_time_seconds: number | null;
  units_assigned: number;
}

export interface DistrictPerformance {
  district_id: string;
  district_name: string;
  total_incidents: number;
  avg_response_time: number;
  target_response_time: number;
  on_target_pct: number;
}

export interface AiAnalysisRequest {
  query: string;
  context?: string;
  includeData?: boolean;
}

export interface AiAnalysisResponse {
  analysis: string;
  data?: unknown;
  sqlExecuted?: string;
  suggestions?: string[];
}
