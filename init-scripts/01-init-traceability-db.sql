-- Traceability System Database Schema
-- This script creates all necessary tables for the traceability system

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Parts table - stores information about parts being tracked
CREATE TABLE IF NOT EXISTS parts (
    id SERIAL PRIMARY KEY,
    part_id VARCHAR(50) UNIQUE NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    part_type VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(255),
    status VARCHAR(50) DEFAULT 'created',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stations table - stores information about production stations
CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    station_id VARCHAR(50) UNIQUE NOT NULL,
    station_name VARCHAR(255) NOT NULL,
    station_type VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Operators table - stores information about operators
CREATE TABLE IF NOT EXISTS operators (
    id SERIAL PRIMARY KEY,
    operator_id VARCHAR(50) UNIQUE NOT NULL,
    operator_name VARCHAR(255) NOT NULL,
    badge_id VARCHAR(50) UNIQUE,
    department VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Part movements table - tracks all part movements between stations
CREATE TABLE IF NOT EXISTS part_movements (
    id SERIAL PRIMARY KEY,
    part_id VARCHAR(50) NOT NULL,
    from_station_id VARCHAR(50),
    to_station_id VARCHAR(50) NOT NULL,
    movement_type VARCHAR(50) DEFAULT 'transfer',
    operator_id VARCHAR(50),
    notes TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (part_id) REFERENCES parts(part_id) ON DELETE CASCADE,
    FOREIGN KEY (from_station_id) REFERENCES stations(station_id) ON DELETE SET NULL,
    FOREIGN KEY (to_station_id) REFERENCES stations(station_id) ON DELETE CASCADE,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id) ON DELETE SET NULL
);

-- Quality checks table - stores quality check results
CREATE TABLE IF NOT EXISTS quality_checks (
    id SERIAL PRIMARY KEY,
    part_id VARCHAR(50) NOT NULL,
    station_id VARCHAR(50) NOT NULL,
    operator_id VARCHAR(50),
    check_type VARCHAR(100) NOT NULL,
    result VARCHAR(50) NOT NULL, -- 'pass', 'fail', 'pending'
    details JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (part_id) REFERENCES parts(part_id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES stations(station_id) ON DELETE CASCADE,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id) ON DELETE SET NULL
);

-- Alerts table - stores system alerts and notifications
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
    title VARCHAR(255) NOT NULL,
    message TEXT,
    part_id VARCHAR(50),
    station_id VARCHAR(50),
    operator_id VARCHAR(50),
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    FOREIGN KEY (part_id) REFERENCES parts(part_id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES stations(station_id) ON DELETE CASCADE,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parts_part_id ON parts(part_id);
CREATE INDEX IF NOT EXISTS idx_parts_status ON parts(status);
CREATE INDEX IF NOT EXISTS idx_stations_station_id ON stations(station_id);
CREATE INDEX IF NOT EXISTS idx_operators_operator_id ON operators(operator_id);
CREATE INDEX IF NOT EXISTS idx_part_movements_part_id ON part_movements(part_id);
CREATE INDEX IF NOT EXISTS idx_part_movements_timestamp ON part_movements(timestamp);
CREATE INDEX IF NOT EXISTS idx_part_movements_to_station ON part_movements(to_station_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_part_id ON quality_checks(part_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_station_id ON quality_checks(station_id);
CREATE INDEX IF NOT EXISTS idx_alerts_part_id ON alerts(part_id);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON parts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_operators_updated_at BEFORE UPDATE ON operators FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO stations (station_id, station_name, station_type, location) VALUES
('STATION001', 'Assembly Line 1', 'assembly', 'Building A - Floor 1'),
('STATION002', 'Quality Check Station', 'quality', 'Building A - Floor 1'),
('STATION003', 'Packaging Station', 'packaging', 'Building A - Floor 1'),
('STATION004', 'Shipping Station', 'shipping', 'Building B - Floor 1')
ON CONFLICT (station_id) DO NOTHING;

INSERT INTO operators (operator_id, operator_name, badge_id, department) VALUES
('OP001', 'John Smith', 'BADGE001', 'Assembly'),
('OP002', 'Jane Doe', 'BADGE002', 'Quality Control'),
('OP003', 'Mike Johnson', 'BADGE003', 'Packaging'),
('OP004', 'Sarah Wilson', 'BADGE004', 'Shipping')
ON CONFLICT (operator_id) DO NOTHING;

-- Create views for common queries
CREATE OR REPLACE VIEW current_part_locations AS
SELECT DISTINCT ON (p.part_id)
    p.part_id,
    p.part_name,
    p.part_type,
    p.status as part_status,
    pm.to_station_id as current_station_id,
    s.station_name as current_station_name,
    pm.timestamp as last_movement
FROM parts p
JOIN part_movements pm ON p.part_id = pm.part_id
JOIN stations s ON pm.to_station_id = s.station_id
WHERE pm.timestamp = (
    SELECT MAX(timestamp) 
    FROM part_movements 
    WHERE part_id = p.part_id
);

-- Create view for station activity summary
CREATE OR REPLACE VIEW station_activity_summary AS
SELECT 
    s.station_id,
    s.station_name,
    s.station_type,
    COUNT(DISTINCT pm.part_id) as parts_processed_24h,
    COUNT(pm.id) as total_movements_24h,
    MAX(pm.timestamp) as last_activity
FROM stations s
LEFT JOIN part_movements pm ON s.station_id = pm.to_station_id 
    AND pm.timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY s.station_id, s.station_name, s.station_type;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO traceuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO traceuser;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO traceuser; 