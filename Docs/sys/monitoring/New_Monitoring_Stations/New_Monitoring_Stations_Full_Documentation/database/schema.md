# Database Schema Documentation

## Database: monitoring_v2

### Connection Parameters
```sql
Host: localhost
Port: 5432
Database: monitoring_v2
User: monitoring_user
Password: monitoring_pass
```

## Table Schemas

### 1. traces
**Primary table for call tracking**

```sql
CREATE TABLE traces (
    trace_id TEXT PRIMARY KEY,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    src_extension TEXT,
    dst_extension TEXT,
    call_id TEXT,
    notes TEXT,
    sample_rate INTEGER DEFAULT 16000,
    channels INTEGER DEFAULT 1
);

CREATE INDEX traces_started_at_idx ON traces(started_at);
```

**Sample Data**:
```sql
trace_id: 'trace_2026-01-12T21-08-07-177Z_3333'
started_at: '2026-01-12 21:08:10.219+00'
src_extension: '3333'
dst_extension: '4444'
sample_rate: 16000
channels: 1
```

### 2. metrics_agg_5s
**5-second aggregated metrics storage**

```sql
CREATE TABLE metrics_agg_5s (
    trace_id TEXT NOT NULL,
    station_key TEXT NOT NULL,
    station_group TEXT,
    layer INTEGER,
    direction TEXT,
    tap TEXT NOT NULL,
    metric_key TEXT NOT NULL,
    bucket_ts TIMESTAMP WITH TIME ZONE NOT NULL,
    bucket_ms INTEGER DEFAULT 5000,
    count INTEGER NOT NULL,
    min DOUBLE PRECISION,
    max DOUBLE PRECISION,
    sum DOUBLE PRECISION,
    avg DOUBLE PRECISION,
    last DOUBLE PRECISION,
    PRIMARY KEY (trace_id, station_key, tap, metric_key, bucket_ts),
    FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
);

CREATE INDEX metrics_agg_5s_bucket_ts_idx ON metrics_agg_5s(bucket_ts);
CREATE INDEX metrics_agg_5s_station_key_idx ON metrics_agg_5s(station_key);
CREATE INDEX metrics_agg_5s_metric_key_idx ON metrics_agg_5s(metric_key);
```

**Tap Values**:
- `PRE` - Before processing
- `POST` - After processing

**Common Metric Keys**:
- `pcm.amplitude_peak`
- `pcm.amplitude_rms`
- `pcm.zero_crossing_rate`
- `voice.is_active`
- `quality.signal_to_noise_ratio`
- `latency.processing_ms`

### 3. audio_segments_5s
**Audio recording index**

```sql
CREATE TABLE audio_segments_5s (
    trace_id TEXT NOT NULL,
    station_key TEXT NOT NULL,
    station_group TEXT,
    layer INTEGER,
    direction TEXT,
    tap TEXT NOT NULL,
    bucket_ts TIMESTAMP WITH TIME ZONE NOT NULL,
    bucket_ms INTEGER DEFAULT 5000,
    sample_rate_hz INTEGER DEFAULT 16000,
    channels INTEGER DEFAULT 1,
    format TEXT DEFAULT 'WAV_PCM_S16LE_MONO',
    file_path TEXT NOT NULL,
    file_bytes INTEGER,
    sha256_hex TEXT,
    PRIMARY KEY (trace_id, station_key, tap, bucket_ts),
    FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
);

CREATE INDEX audio_segments_5s_bucket_ts_idx ON audio_segments_5s(bucket_ts);
```

**File Path Pattern**:
```
/var/monitoring/audio/traces/{trace_id}/{station_key}/{tap}/{bucket_ts}.wav
```

### 4. knob_snapshots_5s
**Configuration snapshots per bucket**

```sql
CREATE TABLE knob_snapshots_5s (
    trace_id TEXT NOT NULL,
    station_key TEXT NOT NULL,
    bucket_ts TIMESTAMP WITH TIME ZONE NOT NULL,
    bucket_ms INTEGER DEFAULT 5000,
    knobs_json JSONB NOT NULL,
    config_version INTEGER,
    PRIMARY KEY (trace_id, station_key, bucket_ts),
    FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
);

CREATE INDEX knob_snapshots_5s_bucket_ts_idx ON knob_snapshots_5s(bucket_ts);
CREATE INDEX knob_snapshots_5s_knobs_json_idx ON knob_snapshots_5s USING GIN (knobs_json);
```

**Example knobs_json**:
```json
{
  "pcm.input_gain_db": 0,
  "pcm.output_gain_db": 0,
  "vad.enabled": true,
  "vad.threshold_db": -40,
  "noise.reduction_enabled": true,
  "compressor.enabled": false
}
```

### 5. knob_events
**Audit log of knob changes**

```sql
CREATE TABLE knob_events (
    event_id SERIAL PRIMARY KEY,
    trace_id TEXT,
    station_key TEXT NOT NULL,
    knob_key TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    source TEXT DEFAULT 'manual',
    reason TEXT,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
);

CREATE INDEX knob_events_occurred_at_idx ON knob_events(occurred_at);
CREATE INDEX knob_events_station_key_idx ON knob_events(station_key);
CREATE INDEX knob_events_knob_key_idx ON knob_events(knob_key);
```

**Source Values**:
- `manual` - User-initiated change
- `ai_optimizer` - AI system recommendation
- `scheduled` - BucketScheduler application
- `api` - API call
- `default` - System default

### 6. scheduled_knob_updates
**Future knob changes scheduled by AI Optimizer**

```sql
CREATE TABLE scheduled_knob_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id TEXT NOT NULL,
    station_key TEXT NOT NULL,
    apply_at_bucket_ts TIMESTAMP WITH TIME ZONE NOT NULL,
    config_version INTEGER NOT NULL,
    knobs JSONB NOT NULL,
    source TEXT DEFAULT 'ai_optimizer',
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    applied_at TIMESTAMP WITH TIME ZONE,
    applied BOOLEAN DEFAULT FALSE,
    idempotency_key TEXT UNIQUE,
    FOREIGN KEY (trace_id) REFERENCES traces(trace_id)
);

CREATE INDEX scheduled_knob_updates_apply_at_idx ON scheduled_knob_updates(apply_at_bucket_ts);
CREATE INDEX scheduled_knob_updates_applied_idx ON scheduled_knob_updates(applied);
CREATE INDEX scheduled_knob_updates_idempotency_idx ON scheduled_knob_updates(idempotency_key);
```

### 7. knob_verifications
**Verification records for applied knob updates**

```sql
CREATE TABLE knob_verifications (
    verification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    update_id UUID NOT NULL,
    trace_id TEXT NOT NULL,
    station_key TEXT NOT NULL,
    bucket_ts TIMESTAMP WITH TIME ZONE NOT NULL,
    expected_knobs JSONB NOT NULL,
    actual_knobs JSONB,
    match BOOLEAN,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trace_id) REFERENCES traces(trace_id),
    FOREIGN KEY (update_id) REFERENCES scheduled_knob_updates(id)
);

CREATE INDEX knob_verifications_update_id_idx ON knob_verifications(update_id);
CREATE INDEX knob_verifications_verified_at_idx ON knob_verifications(verified_at);
```

## Database Functions

### cleanup_old_monitoring_data()
**Retention cleanup function (72-hour window)**

```sql
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_data()
RETURNS void AS $$
BEGIN
    -- Delete traces older than 72 hours
    DELETE FROM traces WHERE started_at < NOW() - INTERVAL '72 hours';

    -- Cascading deletes handle related tables automatically
    -- due to ON DELETE CASCADE foreign keys
END;
$$ LANGUAGE plpgsql;
```

## Foreign Key Relationships

```
traces (1) ─────┬──── (N) metrics_agg_5s
                ├──── (N) audio_segments_5s
                ├──── (N) knob_snapshots_5s
                ├──── (N) knob_events
                ├──── (N) scheduled_knob_updates
                └──── (N) knob_verifications

scheduled_knob_updates (1) ──── (N) knob_verifications
```

## Data Retention Policy

- **Active Retention**: 72 hours
- **Cleanup Schedule**: Every 10 minutes
- **Cascade Deletion**: All child records deleted with parent trace
- **Archive Strategy**: External backup before deletion (optional)

## Query Examples

### 1. Get Active Traces
```sql
SELECT trace_id, started_at, src_extension, dst_extension
FROM traces
WHERE ended_at IS NULL
   OR ended_at > NOW() - INTERVAL '5 minutes'
ORDER BY started_at DESC;
```

### 2. Get Metrics for a Trace
```sql
SELECT station_key, tap, metric_key,
       COUNT(*) as data_points,
       MIN(min) as global_min,
       MAX(max) as global_max,
       AVG(avg) as global_avg
FROM metrics_agg_5s
WHERE trace_id = 'trace_2026-01-12T21-08-07-177Z_3333'
GROUP BY station_key, tap, metric_key
ORDER BY station_key, tap, metric_key;
```

### 3. Get Audio Segments with File Sizes
```sql
SELECT trace_id, station_key, tap,
       COUNT(*) as segment_count,
       SUM(file_bytes) as total_bytes,
       MIN(bucket_ts) as first_segment,
       MAX(bucket_ts) as last_segment
FROM audio_segments_5s
WHERE bucket_ts > NOW() - INTERVAL '1 hour'
GROUP BY trace_id, station_key, tap
ORDER BY trace_id, station_key, tap;
```

### 4. Get Knob History
```sql
SELECT occurred_at, station_key, knob_key,
       old_value, new_value, source, reason
FROM knob_events
WHERE trace_id = 'trace_2026-01-12T21-08-07-177Z_3333'
ORDER BY occurred_at DESC;
```

### 5. Get Scheduled Updates
```sql
SELECT id, trace_id, station_key, apply_at_bucket_ts,
       config_version, knobs, applied
FROM scheduled_knob_updates
WHERE apply_at_bucket_ts > NOW()
  AND applied = FALSE
ORDER BY apply_at_bucket_ts;
```

## Performance Indexes

1. **Primary Keys**: All tables have primary keys for uniqueness
2. **Foreign Keys**: Maintain referential integrity with CASCADE
3. **Time-based Indexes**: All bucket_ts columns indexed for time queries
4. **Station/Metric Indexes**: Fast lookups by station and metric keys
5. **JSONB GIN Index**: Fast searches within knobs_json field

## Storage Estimates

Per trace (average 3-minute call):
- **traces**: 1 row × ~200 bytes = 200 bytes
- **metrics_agg_5s**: 36 buckets × 14 metrics × 2 taps × 2 stations × 100 bytes = ~200 KB
- **audio_segments_5s**: 36 buckets × 2 taps × 2 stations × 200 bytes = ~29 KB
- **knob_snapshots_5s**: 36 buckets × 2 stations × 500 bytes = ~36 KB
- **knob_events**: ~10 changes × 200 bytes = 2 KB

**Total per trace**: ~267 KB (excluding audio files)
**Audio files**: ~5 MB per trace (compressed WAV)

## Backup Strategy

```bash
# Daily backup
pg_dump -U monitoring_user -d monitoring_v2 -h localhost \
  --format=custom --compress=9 \
  --file=/backup/monitoring_v2_$(date +%Y%m%d).dump

# Restore
pg_restore -U monitoring_user -d monitoring_v2 -h localhost \
  --clean --if-exists /backup/monitoring_v2_20260112.dump
```

## Monitoring Queries

### Database Size
```sql
SELECT pg_database_size('monitoring_v2') as size_bytes,
       pg_size_pretty(pg_database_size('monitoring_v2')) as size_human;
```

### Table Sizes
```sql
SELECT relname as table_name,
       pg_size_pretty(pg_total_relation_size(relid)) as total_size,
       pg_size_pretty(pg_relation_size(relid)) as table_size,
       pg_size_pretty(pg_indexes_size(relid)) as indexes_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC;
```

### Connection Status
```sql
SELECT count(*) as connections,
       state,
       application_name
FROM pg_stat_activity
WHERE datname = 'monitoring_v2'
GROUP BY state, application_name;
```