-- NEW Monitoring System Database Schema
-- PostgreSQL 12+ required

CREATE DATABASE monitoring_v2;
\c monitoring_v2;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create user
CREATE USER monitoring_user WITH PASSWORD 'monitoring_pass';
GRANT ALL PRIVILEGES ON DATABASE monitoring_v2 TO monitoring_user;

-- Create tables
CREATE TABLE IF NOT EXISTS traces (
    trace_id VARCHAR(255) PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    src_extension VARCHAR(50),
    dst_extension VARCHAR(50),
    call_id VARCHAR(255),
    sample_rate INTEGER DEFAULT 16000,
    channels INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metrics_agg_5s (
    trace_id VARCHAR(255) NOT NULL,
    station_key VARCHAR(50) NOT NULL,
    bucket_ts TIMESTAMPTZ NOT NULL,
    bucket_ms INTEGER DEFAULT 5000,
    metrics JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (trace_id, station_key, bucket_ts),
    FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audio_segments_5s (
    trace_id VARCHAR(255) NOT NULL,
    station_key VARCHAR(50) NOT NULL,
    tap VARCHAR(10) NOT NULL,
    bucket_ts TIMESTAMPTZ NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes INTEGER,
    sample_rate_hz INTEGER DEFAULT 16000,
    channels INTEGER DEFAULT 1,
    format VARCHAR(50) DEFAULT 'WAV_PCM_S16LE_MONO',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (trace_id, station_key, tap, bucket_ts),
    FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knob_snapshots_5s (
    trace_id VARCHAR(255) NOT NULL,
    station_key VARCHAR(50) NOT NULL,
    bucket_ts TIMESTAMPTZ NOT NULL,
    config_version INTEGER,
    knobs_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (trace_id, station_key, bucket_ts),
    FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scheduled_knob_updates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trace_id VARCHAR(255) NOT NULL,
    station_key VARCHAR(50) NOT NULL,
    apply_at_bucket_ts TIMESTAMPTZ NOT NULL,
    config_version INTEGER NOT NULL,
    knobs JSONB NOT NULL,
    source VARCHAR(50) DEFAULT 'manual',
    reason TEXT,
    idempotency_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    applied_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending',
    FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knob_verifications (
    id SERIAL PRIMARY KEY,
    update_id UUID NOT NULL,
    trace_id VARCHAR(255) NOT NULL,
    station_key VARCHAR(50) NOT NULL,
    bucket_ts TIMESTAMPTZ NOT NULL,
    expected_knobs JSONB NOT NULL,
    actual_knobs JSONB,
    match BOOLEAN,
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (update_id) REFERENCES scheduled_knob_updates(id) ON DELETE CASCADE,
    FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knob_events (
    event_id SERIAL PRIMARY KEY,
    trace_id VARCHAR(255) NOT NULL,
    station_key VARCHAR(50) NOT NULL,
    knob_key VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    source VARCHAR(50) DEFAULT 'manual',
    reason TEXT,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_traces_started_at ON traces(started_at DESC);
CREATE INDEX idx_traces_ended_at ON traces(ended_at DESC);
CREATE INDEX idx_metrics_bucket_ts ON metrics_agg_5s(bucket_ts DESC);
CREATE INDEX idx_audio_bucket_ts ON audio_segments_5s(bucket_ts DESC);
CREATE INDEX idx_knob_snapshots_bucket_ts ON knob_snapshots_5s(bucket_ts DESC);
CREATE INDEX idx_scheduled_status ON scheduled_knob_updates(status, apply_at_bucket_ts);
CREATE INDEX idx_knob_events_occurred ON knob_events(occurred_at DESC);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO monitoring_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO monitoring_user;
