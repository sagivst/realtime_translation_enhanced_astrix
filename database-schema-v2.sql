-- Version 2.0.0 Database Schema Updates
-- Adds session_configs table and updates relationships

-- Create session_configs table for two independent knob sets
CREATE TABLE IF NOT EXISTS session_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    role VARCHAR(10) CHECK (role IN ('caller', 'callee')),
    knobs JSONB NOT NULL DEFAULT '[]'::jsonb,
    version INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_session_configs_call ON session_configs (call_id);
CREATE INDEX IF NOT EXISTS idx_session_configs_channel ON session_configs (channel_id);
CREATE INDEX IF NOT EXISTS idx_session_configs_active ON session_configs (active);

-- Add session_config_id to segments table
ALTER TABLE segments
ADD COLUMN IF NOT EXISTS session_config_id UUID REFERENCES session_configs(id);

-- Add knobs_effective to station_snapshots
ALTER TABLE station_snapshots
ADD COLUMN IF NOT EXISTS knobs_effective JSONB,
ADD COLUMN IF NOT EXISTS constraints JSONB,
ADD COLUMN IF NOT EXISTS targets JSONB,
ADD COLUMN IF NOT EXISTS optimizer_run_id UUID;

-- Create index for optimizer runs
CREATE INDEX IF NOT EXISTS idx_snapshots_optimizer ON station_snapshots (optimizer_run_id);

-- Add metadata to channels
ALTER TABLE channels
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add transcript columns to segments
ALTER TABLE segments
ADD COLUMN IF NOT EXISTS transcript TEXT,
ADD COLUMN IF NOT EXISTS transcript_json JSONB;

-- Update calls table with missing columns
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS direction VARCHAR(20),
ADD COLUMN IF NOT EXISTS metadata JSONB;