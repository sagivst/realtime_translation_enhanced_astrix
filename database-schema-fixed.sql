-- AI-Driven Recursive Audio Optimization System Database Schema
-- PostgreSQL Implementation - FIXED
-- Version 1.1

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS parameter_changes CASCADE;
DROP TABLE IF EXISTS parameters CASCADE;
DROP TABLE IF EXISTS optimizer_runs CASCADE;
DROP TABLE IF EXISTS station_snapshots CASCADE;
DROP TABLE IF EXISTS segments CASCADE;
DROP TABLE IF EXISTS channels CASCADE;
DROP TABLE IF EXISTS calls CASCADE;

-- =====================================================
-- Core Tables for Data Storage
-- =====================================================

-- 1. CALLS table - tracks full conversations
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_call_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    direction VARCHAR(50),
    metadata JSONB
);
CREATE INDEX idx_calls_created ON calls(created_at);
CREATE INDEX idx_calls_external ON calls(external_call_id);

-- 2. CHANNELS table - tracks A-leg/B-leg
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
    name VARCHAR(100),
    leg VARCHAR(10),
    metadata JSONB
);
CREATE INDEX idx_channels_call ON channels(call_id);

-- 3. SEGMENTS table - time windows within channels
CREATE TABLE segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    start_ms BIGINT,
    end_ms BIGINT,
    segment_type VARCHAR(50),
    transcript TEXT,
    transcript_json JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_segments_channel ON segments(channel_id);
CREATE INDEX idx_segments_time ON segments(start_ms, end_ms);

-- 4. STATION_SNAPSHOTS table - structured snapshots per segment
CREATE TABLE station_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    segment_id UUID REFERENCES segments(id) ON DELETE CASCADE,
    station_id VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metrics JSONB NOT NULL,
    logs JSONB,
    audio_ref VARCHAR(500),
    optimizer_run_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_snapshots_segment ON station_snapshots(segment_id);
CREATE INDEX idx_snapshots_station ON station_snapshots(station_id);
CREATE INDEX idx_snapshots_timestamp ON station_snapshots(timestamp);

-- 5. OPTIMIZER_RUNS table - optimization history
CREATE TABLE optimizer_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID REFERENCES calls(id),
    segment_id UUID REFERENCES segments(id),
    station_id VARCHAR(50),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    request_payload JSONB,
    response_payload JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT
);
CREATE INDEX idx_optimizer_status ON optimizer_runs(status);
CREATE INDEX idx_optimizer_station ON optimizer_runs(station_id);

-- 6. PARAMETERS table - configuration parameters
CREATE TABLE parameters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    station_id VARCHAR(50),
    default_value JSONB,
    min_value JSONB,
    max_value JSONB,
    description TEXT
);
CREATE INDEX idx_parameters_station ON parameters(station_id);

-- 7. PARAMETER_CHANGES table - track parameter modifications
CREATE TABLE parameter_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parameter_id UUID REFERENCES parameters(id),
    station_id VARCHAR(50),
    old_value JSONB,
    new_value JSONB,
    optimizer_run_id UUID REFERENCES optimizer_runs(id),
    applied_by VARCHAR(100),
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rollback_of UUID REFERENCES parameter_changes(id),
    notes TEXT
);
CREATE INDEX idx_changes_parameter ON parameter_changes(parameter_id);
CREATE INDEX idx_changes_applied ON parameter_changes(applied_at);

-- =====================================================
-- Insert Default Parameters for Each Station
-- =====================================================

-- STATION 1: Asterisk (RTP)
INSERT INTO parameters (name, station_id, default_value, min_value, max_value, description) VALUES
('asterisk.jitter_buffer_ms', 'STATION_1', '40', '20', '200', 'Jitter buffer size in milliseconds'),
('asterisk.packet_size', 'STATION_1', '160', '80', '320', 'RTP packet size in bytes'),
('asterisk.codec', 'STATION_1', '"ulaw"', NULL, NULL, 'Audio codec for RTP');

-- STATION 2: Gateway (PCM Out)
INSERT INTO parameters (name, station_id, default_value, min_value, max_value, description) VALUES
('gateway.output_gain_db', 'STATION_2', '0', '-12', '12', 'Output gain in dB'),
('gateway.buffer_size_ms', 'STATION_2', '100', '50', '500', 'PCM buffer size'),
('gateway.sample_rate', 'STATION_2', '16000', '8000', '48000', 'Sample rate in Hz');

-- STATION 3: STTTTSserver (Before Deepgram)
INSERT INTO parameters (name, station_id, default_value, min_value, max_value, description) VALUES
('sttttsserver.input_gain_db', 'STATION_3', '0', '-20', '20', 'Input gain adjustment'),
('sttttsserver.noise_reduction', 'STATION_3', '3', '0', '5', 'Noise reduction level'),
('sttttsserver.vad_threshold', 'STATION_3', '0.5', '0.1', '0.9', 'Voice activity detection threshold'),
('sttttsserver.chunk_ms', 'STATION_3', '100', '20', '500', 'Audio chunk size in ms');

-- STATION 4: Deepgram Client
INSERT INTO parameters (name, station_id, default_value, min_value, max_value, description) VALUES
('deepgram.model', 'STATION_4', '"nova-2"', NULL, NULL, 'Deepgram model version'),
('deepgram.language', 'STATION_4', '"en-US"', NULL, NULL, 'Source language'),
('deepgram.punctuate', 'STATION_4', 'true', NULL, NULL, 'Enable punctuation'),
('deepgram.interim_results', 'STATION_4', 'true', NULL, NULL, 'Enable interim results');

-- STATION 9: STTTTSserver (TTS Output)
INSERT INTO parameters (name, station_id, default_value, min_value, max_value, description) VALUES
('sttttsserver.output_gain_db', 'STATION_9', '0', '-20', '20', 'Output gain for TTS'),
('sttttsserver.speed_factor', 'STATION_9', '1.0', '0.5', '2.0', 'Playback speed factor');

-- STATION 10: Gateway (RTP Back)
INSERT INTO parameters (name, station_id, default_value, min_value, max_value, description) VALUES
('gateway.rtp_gain_db', 'STATION_10', '0', '-12', '12', 'RTP output gain'),
('gateway.packet_pacing_ms', 'STATION_10', '20', '10', '40', 'Packet pacing interval');

-- STATION 11: STTTTSserver (Before Hume)
INSERT INTO parameters (name, station_id, default_value, min_value, max_value, description) VALUES
('hume.emotion_sensitivity', 'STATION_11', '0.7', '0.1', '1.0', 'Emotion detection sensitivity'),
('hume.prosody_analysis', 'STATION_11', 'true', NULL, NULL, 'Enable prosody analysis');

-- =====================================================
-- Views for Easy Access
-- =====================================================

-- View for latest snapshots per station
CREATE OR REPLACE VIEW latest_station_snapshots AS
SELECT DISTINCT ON (station_id)
    station_id,
    timestamp,
    metrics,
    audio_ref
FROM station_snapshots
ORDER BY station_id, timestamp DESC;

-- View for active calls
CREATE OR REPLACE VIEW active_calls AS
SELECT
    id,
    external_call_id,
    created_at,
    direction,
    metadata
FROM calls
WHERE ended_at IS NULL;

-- View for optimization performance
CREATE OR REPLACE VIEW optimization_performance AS
SELECT
    station_id,
    COUNT(*) as total_runs,
    AVG(EXTRACT(EPOCH FROM (completed_at - requested_at))) as avg_duration_seconds,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_runs,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_runs
FROM optimizer_runs
WHERE completed_at IS NOT NULL
GROUP BY station_id;

-- =====================================================
-- Functions and Triggers
-- =====================================================

-- Function to automatically end calls after timeout
CREATE OR REPLACE FUNCTION end_stale_calls()
RETURNS void AS $$
BEGIN
    UPDATE calls
    SET ended_at = CURRENT_TIMESTAMP
    WHERE ended_at IS NULL
    AND created_at < CURRENT_TIMESTAMP - INTERVAL '6 hours';
END;
$$ LANGUAGE plpgsql;

-- Function to validate parameter changes
CREATE OR REPLACE FUNCTION validate_parameter_change()
RETURNS TRIGGER AS $$
DECLARE
    param_record RECORD;
BEGIN
    SELECT * INTO param_record
    FROM parameters
    WHERE id = NEW.parameter_id;

    -- Check if new value is within bounds
    IF param_record.min_value IS NOT NULL AND NEW.new_value < param_record.min_value THEN
        RAISE EXCEPTION 'Value % is below minimum %', NEW.new_value, param_record.min_value;
    END IF;

    IF param_record.max_value IS NOT NULL AND NEW.new_value > param_record.max_value THEN
        RAISE EXCEPTION 'Value % exceeds maximum %', NEW.new_value, param_record.max_value;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_parameter_change_trigger
BEFORE INSERT ON parameter_changes
FOR EACH ROW
EXECUTE FUNCTION validate_parameter_change();

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX idx_snapshots_metrics_gin ON station_snapshots USING gin(metrics);
CREATE INDEX idx_snapshots_logs_gin ON station_snapshots USING gin(logs);
CREATE INDEX idx_calls_metadata_gin ON calls USING gin(metadata);
CREATE INDEX idx_segments_transcript_gin ON segments USING gin(transcript_json);

-- =====================================================
-- Permissions
-- =====================================================

-- Grant permissions to audio_app user
GRANT CONNECT ON DATABASE audio_optimization TO audio_app;
GRANT USAGE ON SCHEMA public TO audio_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO audio_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO audio_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO audio_app;

-- =====================================================
-- Initial Test Data
-- =====================================================

-- Insert test call
INSERT INTO calls (external_call_id, direction, metadata) VALUES
('test-call-001', 'inbound', '{"caller": "3333", "callee": "4444"}');

-- =====================================================
-- Maintenance Functions
-- =====================================================

-- Clean up old data (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Delete calls older than 30 days
    DELETE FROM calls WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';

    -- Delete orphaned snapshots
    DELETE FROM station_snapshots
    WHERE segment_id NOT IN (SELECT id FROM segments);

    -- Vacuum analyze for performance
    VACUUM ANALYZE;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema successfully deployed!';
    RAISE NOTICE 'Tables created: calls, channels, segments, station_snapshots, optimizer_runs, parameters, parameter_changes';
    RAISE NOTICE 'Test data inserted';
END $$;