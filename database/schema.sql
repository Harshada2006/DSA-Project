-- Eco Collect: PostgreSQL & PostGIS Spatial Extension Schema
-- For full deployment on PostgreSQL with PostGIS enabled

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Wards with Spatial Multipolygon Boundary
CREATE TABLE IF NOT EXISTS wards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    zone VARCHAR(50) NOT NULL,
    area_sq_km DOUBLE PRECISION NOT NULL,
    population_estimated INT NOT NULL,
    census_year INT DEFAULT 2011,
    center_location GEOMETRY(Point, 4326),
    boundary GEOMETRY(MultiPolygon, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wards_boundary ON wards USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_wards_center ON wards USING GIST(center_location);

-- Bins with Spatial Point
CREATE TABLE IF NOT EXISTS bins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    ward_id UUID REFERENCES wards(id) ON DELETE RESTRICT,
    location GEOMETRY(Point, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    capacity_liters DOUBLE PRECISION NOT NULL,
    waste_type VARCHAR(30) DEFAULT 'general',
    area_category VARCHAR(30) DEFAULT 'residential',
    status VARCHAR(30) DEFAULT 'active',
    current_fill_percentage DOUBLE PRECISION DEFAULT 0.0,
    last_observed_at TIMESTAMP WITH TIME ZONE,
    last_collected_at TIMESTAMP WITH TIME ZONE,
    urgency VARCHAR(20) DEFAULT 'low',
    priority_score DOUBLE PRECISION DEFAULT 0.0,
    provenance VARCHAR(30) DEFAULT 'observed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bins_location ON bins USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_bins_ward_id ON bins(ward_id);
CREATE INDEX IF NOT EXISTS idx_bins_status ON bins(status);
CREATE INDEX IF NOT EXISTS idx_bins_urgency ON bins(urgency);

-- Road Network Graph Nodes and Edges
CREATE TABLE IF NOT EXISTS road_nodes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    ward_id UUID REFERENCES wards(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_road_nodes_location ON road_nodes USING GIST(location);

CREATE TABLE IF NOT EXISTS road_edges (
    id VARCHAR(50) PRIMARY KEY,
    source_node_id VARCHAR(50) REFERENCES road_nodes(id) ON DELETE CASCADE,
    target_node_id VARCHAR(50) REFERENCES road_nodes(id) ON DELETE CASCADE,
    distance_meters DOUBLE PRECISION NOT NULL,
    travel_time_seconds DOUBLE PRECISION NOT NULL,
    road_name VARCHAR(150) NOT NULL,
    one_way BOOLEAN DEFAULT FALSE,
    geometry GEOMETRY(LineString, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_road_edges_source ON road_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_road_edges_target ON road_edges(target_node_id);
