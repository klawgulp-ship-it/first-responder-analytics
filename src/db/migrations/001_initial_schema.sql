-- ============================================================
-- FIRST RESPONDER ANALYTICS — DATABASE SCHEMA
-- Migration 001: Initial Schema
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE incident_type AS ENUM (
  'fire', 'ems', 'police', 'multi_agency', 'hazmat', 'rescue', 'traffic'
);

CREATE TYPE incident_priority AS ENUM ('1', '2', '3', '4', '5');

CREATE TYPE incident_status AS ENUM (
  'received', 'dispatched', 'en_route', 'on_scene', 'resolved', 'closed', 'cancelled'
);

CREATE TYPE unit_type AS ENUM (
  'engine', 'ladder', 'ambulance', 'medic', 'patrol', 'detective',
  'swat', 'hazmat', 'rescue', 'battalion_chief', 'command', 'helicopter'
);

CREATE TYPE unit_status AS ENUM (
  'available', 'dispatched', 'en_route', 'on_scene', 'returning',
  'out_of_service', 'maintenance'
);

CREATE TYPE personnel_rank AS ENUM (
  'firefighter', 'engineer', 'lieutenant', 'captain', 'battalion_chief',
  'deputy_chief', 'chief', 'emt', 'paramedic', 'officer', 'sergeant',
  'detective', 'commander', 'dispatcher'
);

CREATE TYPE personnel_status AS ENUM (
  'active', 'on_leave', 'injured', 'suspended', 'retired', 'terminated'
);

CREATE TYPE shift_pattern AS ENUM (
  'day', 'night', 'swing', '24_on_48_off', '48_on_96_off', 'kelly'
);

CREATE TYPE dispatch_action AS ENUM (
  'dispatched', 'en_route', 'on_scene', 'status_update', 'request_backup',
  'cleared', 'cancelled', 'transferred', 'escalated'
);

CREATE TYPE outcome_type AS ENUM (
  'resolved', 'arrest', 'transport_hospital', 'fire_extinguished',
  'false_alarm', 'referred', 'no_action_needed', 'ongoing_investigation',
  'mutual_aid', 'patient_refused'
);

CREATE TYPE risk_level AS ENUM ('low', 'moderate', 'high', 'critical');

CREATE TYPE hazard_type AS ENUM (
  'chemical_facility', 'school', 'hospital', 'nursing_home', 'highway',
  'airport', 'rail', 'dam', 'power_plant', 'government_building',
  'high_rise', 'stadium', 'warehouse'
);

CREATE TYPE user_role AS ENUM (
  'chief', 'captain', 'dispatcher', 'analyst', 'admin', 'read_only'
);

-- ============================================================
-- STATIONS & DISTRICTS (geographic foundation)
-- ============================================================

CREATE TABLE districts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  district_number INTEGER NOT NULL UNIQUE,
  boundary_geojson JSONB,
  population INTEGER,
  area_sq_miles DECIMAL(10,2),
  risk_level risk_level NOT NULL DEFAULT 'moderate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_number INTEGER NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(300) NOT NULL,
  location_lat DECIMAL(10,7),
  location_lng DECIMAL(10,7),
  district_id UUID REFERENCES districts(id),
  phone VARCHAR(20),
  is_headquarters BOOLEAN DEFAULT FALSE,
  capacity_units INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE response_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_id UUID NOT NULL REFERENCES districts(id),
  zone_name VARCHAR(100) NOT NULL,
  zone_type VARCHAR(50) NOT NULL,
  target_response_time_seconds INTEGER NOT NULL,
  avg_response_time_seconds DECIMAL(10,2),
  boundary_geojson JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE hazard_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  hazard_type hazard_type NOT NULL,
  address VARCHAR(300) NOT NULL,
  location_lat DECIMAL(10,7),
  location_lng DECIMAL(10,7),
  district_id UUID REFERENCES districts(id),
  risk_level risk_level NOT NULL DEFAULT 'moderate',
  special_instructions TEXT,
  emergency_contact VARCHAR(100),
  emergency_phone VARCHAR(20),
  last_inspection_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UNITS & PERSONNEL
-- ============================================================

CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_number VARCHAR(20) NOT NULL UNIQUE,
  unit_type unit_type NOT NULL,
  station_id UUID REFERENCES stations(id),
  status unit_status NOT NULL DEFAULT 'available',
  current_location_lat DECIMAL(10,7),
  current_location_lng DECIMAL(10,7),
  vehicle_id VARCHAR(50),
  in_service_date DATE,
  last_maintenance_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE personnel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  badge_number VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  rank personnel_rank NOT NULL,
  unit_id UUID REFERENCES units(id),
  email VARCHAR(200),
  phone VARCHAR(20),
  hire_date DATE NOT NULL,
  certifications TEXT[] DEFAULT '{}',
  status personnel_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_name VARCHAR(50) NOT NULL,
  shift_pattern shift_pattern NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shift_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID NOT NULL REFERENCES shifts(id),
  personnel_id UUID NOT NULL REFERENCES personnel(id),
  assignment_date DATE NOT NULL,
  station_id UUID REFERENCES stations(id),
  unit_id UUID REFERENCES units(id),
  is_overtime BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(personnel_id, assignment_date, shift_id)
);

-- ============================================================
-- INCIDENTS (core operational data)
-- ============================================================

CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_number VARCHAR(30) NOT NULL UNIQUE,
  incident_type incident_type NOT NULL,
  priority incident_priority NOT NULL,
  status incident_status NOT NULL DEFAULT 'received',
  location_lat DECIMAL(10,7),
  location_lng DECIMAL(10,7),
  address VARCHAR(300),
  district_id UUID REFERENCES districts(id),
  description TEXT,
  caller_name VARCHAR(100),
  caller_phone VARCHAR(20),
  caller_info JSONB,
  dispatch_notes TEXT,
  weather_conditions JSONB,
  response_time_seconds INTEGER,
  scene_time_seconds INTEGER,
  total_time_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dispatched_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

CREATE TABLE incident_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id),
  is_primary BOOLEAN DEFAULT FALSE,
  dispatched_at TIMESTAMPTZ,
  en_route_at TIMESTAMPTZ,
  on_scene_at TIMESTAMPTZ,
  cleared_at TIMESTAMPTZ,
  response_time_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(incident_id, unit_id)
);

CREATE TABLE incident_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  outcome_type outcome_type NOT NULL,
  injuries_civilian INTEGER DEFAULT 0,
  injuries_responder INTEGER DEFAULT 0,
  fatalities INTEGER DEFAULT 0,
  property_damage_estimate DECIMAL(12,2),
  narrative TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_notes TEXT,
  reporting_officer_id UUID REFERENCES personnel(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DISPATCH & COMMUNICATIONS
-- ============================================================

CREATE TABLE dispatch_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id),
  action dispatch_action NOT NULL,
  dispatcher_id UUID REFERENCES personnel(id),
  notes TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE radio_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL,
  unit_id UUID REFERENCES units(id),
  duration_seconds INTEGER,
  transcription TEXT,
  audio_file_path VARCHAR(500),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ANALYTICS & HISTORICAL
-- ============================================================

CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stat_date DATE NOT NULL,
  district_id UUID REFERENCES districts(id),
  fire_count INTEGER DEFAULT 0,
  ems_count INTEGER DEFAULT 0,
  police_count INTEGER DEFAULT 0,
  multi_agency_count INTEGER DEFAULT 0,
  other_count INTEGER DEFAULT 0,
  total_incidents INTEGER DEFAULT 0,
  avg_response_time_seconds DECIMAL(10,2),
  median_response_time_seconds DECIMAL(10,2),
  p90_response_time_seconds DECIMAL(10,2),
  units_utilized_pct DECIMAL(5,2),
  personnel_on_duty INTEGER,
  mutual_aid_given INTEGER DEFAULT 0,
  mutual_aid_received INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(stat_date, district_id)
);

CREATE TABLE trend_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_type VARCHAR(20) NOT NULL, -- 'weekly', 'monthly', 'quarterly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  district_id UUID REFERENCES districts(id),
  metrics JSONB NOT NULL,
  analysis_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(period_type, period_start, district_id)
);

CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_type VARCHAR(50) NOT NULL,
  target_date DATE NOT NULL,
  district_id UUID REFERENCES districts(id),
  predicted_values JSONB NOT NULL,
  actual_values JSONB,
  confidence_score DECIMAL(5,4),
  model_version VARCHAR(20),
  accuracy_score DECIMAL(5,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evaluated_at TIMESTAMPTZ
);

-- ============================================================
-- AUTH & USERS
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  role user_role NOT NULL DEFAULT 'read_only',
  personnel_id UUID REFERENCES personnel(id),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB,
  ip_address INET,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Incidents: most common query patterns
CREATE INDEX idx_incidents_type ON incidents(incident_type);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_priority ON incidents(priority);
CREATE INDEX idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX idx_incidents_district ON incidents(district_id);
CREATE INDEX idx_incidents_location ON incidents(location_lat, location_lng);
CREATE INDEX idx_incidents_response_time ON incidents(response_time_seconds);
CREATE INDEX idx_incidents_type_created ON incidents(incident_type, created_at DESC);
CREATE INDEX idx_incidents_district_created ON incidents(district_id, created_at DESC);
CREATE INDEX idx_incidents_status_type ON incidents(status, incident_type);

-- Incident units: join performance
CREATE INDEX idx_incident_units_incident ON incident_units(incident_id);
CREATE INDEX idx_incident_units_unit ON incident_units(unit_id);
CREATE INDEX idx_incident_units_dispatched ON incident_units(dispatched_at DESC);

-- Units: status checks
CREATE INDEX idx_units_status ON units(status);
CREATE INDEX idx_units_type ON units(unit_type);
CREATE INDEX idx_units_station ON units(station_id);

-- Personnel
CREATE INDEX idx_personnel_unit ON personnel(unit_id);
CREATE INDEX idx_personnel_rank ON personnel(rank);
CREATE INDEX idx_personnel_status ON personnel(status);

-- Dispatch log: timeline queries
CREATE INDEX idx_dispatch_log_incident ON dispatch_log(incident_id);
CREATE INDEX idx_dispatch_log_timestamp ON dispatch_log(timestamp DESC);
CREATE INDEX idx_dispatch_log_unit ON dispatch_log(unit_id);

-- Radio logs
CREATE INDEX idx_radio_logs_incident ON radio_logs(incident_id);
CREATE INDEX idx_radio_logs_timestamp ON radio_logs(timestamp DESC);

-- Daily stats: reporting
CREATE INDEX idx_daily_stats_date ON daily_stats(stat_date DESC);
CREATE INDEX idx_daily_stats_district ON daily_stats(district_id, stat_date DESC);

-- Predictions
CREATE INDEX idx_predictions_type_date ON predictions(prediction_type, target_date);
CREATE INDEX idx_predictions_district ON predictions(district_id);

-- Shift assignments
CREATE INDEX idx_shift_assignments_date ON shift_assignments(assignment_date);
CREATE INDEX idx_shift_assignments_personnel ON shift_assignments(personnel_id);

-- Audit log
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_districts_updated_at BEFORE UPDATE ON districts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_personnel_updated_at BEFORE UPDATE ON personnel
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incident_outcomes_updated_at BEFORE UPDATE ON incident_outcomes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hazard_locations_updated_at BEFORE UPDATE ON hazard_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_response_zones_updated_at BEFORE UPDATE ON response_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
