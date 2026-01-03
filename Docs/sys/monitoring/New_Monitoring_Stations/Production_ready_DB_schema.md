Below is a minimal, production-ready DB schema for a 72-hour rolling window, covering the three required domains:
	•	metrics (5-second aggregated buckets, PRE/POST)
	•	audio (PRE/POST segment index, aligned to the same 5s buckets)
	•	knobs (snapshots + change events)

Target DB: PostgreSQL (recommended for TTL/partitioning and indexing).

⸻

1) Core rules (MANDATORY)
	1.	All timestamps are UTC.
	2.	Metrics and audio are bucketed with:
	•	bucket_ms = 5000
	•	bucket_ts = floor(timestamp / 5000ms) * 5000ms
	3.	Retention is exactly 72 hours:
	•	Data older than now() - interval '72 hours' MUST be deleted automatically.
	4.	PRE and POST are stored separately via tap column.

⸻

2) PostgreSQL schema (DDL)

2.1 Enum types

CREATE TYPE tap_type AS ENUM ('PRE', 'POST');

CREATE TYPE direction_type AS ENUM ('RX', 'TX');

CREATE TYPE station_layer_type AS ENUM ('core', 'monitoring', 'gateways', 'other');


⸻

2.2 traces (one per call / session)

Minimal call/session identity + indexing anchor.

CREATE TABLE traces (
  trace_id         TEXT PRIMARY KEY,
  started_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ NULL,

  -- optional but useful
  src_extension    TEXT NULL,
  dst_extension    TEXT NULL,
  call_id          TEXT NULL,
  notes            TEXT NULL
);

CREATE INDEX traces_started_at_idx ON traces (started_at);


⸻

2.3 metrics_agg_5s (aggregated metrics every 5 seconds)

Stores per 5s bucket per (trace_id, station_key, tap, metric_key).

CREATE TABLE metrics_agg_5s (
  id              BIGSERIAL PRIMARY KEY,

  trace_id        TEXT NOT NULL REFERENCES traces(trace_id) ON DELETE CASCADE,

  station_key     TEXT NOT NULL,                 -- e.g. "St_3_3333"
  station_group   TEXT NULL,                     -- e.g. "STTTTS_PCM_INGRESS"
  layer           station_layer_type NULL,        -- optional
  direction       direction_type NULL,            -- RX/TX if relevant

  tap             tap_type NOT NULL,              -- PRE/POST
  metric_key      TEXT NOT NULL,                  -- e.g. "pcm.rms_dbfs"

  bucket_ts       TIMESTAMPTZ NOT NULL,           -- start of 5s bucket
  bucket_ms       INT NOT NULL DEFAULT 5000 CHECK (bucket_ms = 5000),

  -- aggregates
  count           INT NOT NULL,
  min             DOUBLE PRECISION NULL,
  max             DOUBLE PRECISION NULL,
  sum             DOUBLE PRECISION NULL,
  avg             DOUBLE PRECISION NULL,
  last            DOUBLE PRECISION NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Uniqueness: one row per bucket per series
CREATE UNIQUE INDEX metrics_agg_5s_uq
ON metrics_agg_5s (trace_id, station_key, tap, metric_key, bucket_ts);

-- Fast retrieval
CREATE INDEX metrics_agg_5s_trace_bucket_idx
ON metrics_agg_5s (trace_id, bucket_ts);

CREATE INDEX metrics_agg_5s_station_metric_idx
ON metrics_agg_5s (station_key, metric_key, bucket_ts);


⸻

2.4 audio_segments_5s (audio segment index)

Stores metadata/index only for the WAV written to disk.
Segments are aligned to the same bucket_ts (5 seconds) and recorded for PRE and POST.

CREATE TABLE audio_segments_5s (
  id              BIGSERIAL PRIMARY KEY,

  trace_id        TEXT NOT NULL REFERENCES traces(trace_id) ON DELETE CASCADE,

  station_key     TEXT NOT NULL,
  station_group   TEXT NULL,
  layer           station_layer_type NULL,
  direction       direction_type NULL,

  tap             tap_type NOT NULL,

  bucket_ts       TIMESTAMPTZ NOT NULL,           -- start of 5s bucket
  bucket_ms       INT NOT NULL DEFAULT 5000 CHECK (bucket_ms = 5000),

  sample_rate_hz  INT NOT NULL DEFAULT 16000,
  channels        INT NOT NULL DEFAULT 1 CHECK (channels = 1),
  format          TEXT NOT NULL DEFAULT 'WAV_PCM_S16LE_MONO',

  -- location of the file written by AudioWriter (index only)
  file_path       TEXT NOT NULL,

  -- optional for quick UI + integrity checks
  file_bytes      BIGINT NULL,
  sha256_hex      TEXT NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX audio_segments_5s_uq
ON audio_segments_5s (trace_id, station_key, tap, bucket_ts);

CREATE INDEX audio_segments_5s_trace_bucket_idx
ON audio_segments_5s (trace_id, bucket_ts);

CREATE INDEX audio_segments_5s_station_tap_idx
ON audio_segments_5s (station_key, tap, bucket_ts);


⸻

2.5 knob_snapshots_5s (effective knobs snapshot per 5s bucket)

Stores the effective knob map used during that bucket.
This is required for offline optimization reproducibility.

CREATE TABLE knob_snapshots_5s (
  id              BIGSERIAL PRIMARY KEY,

  trace_id        TEXT NOT NULL REFERENCES traces(trace_id) ON DELETE CASCADE,

  station_key     TEXT NOT NULL,                  -- knobs can differ per station
  bucket_ts       TIMESTAMPTZ NOT NULL,
  bucket_ms       INT NOT NULL DEFAULT 5000 CHECK (bucket_ms = 5000),

  -- JSONB map: { "pcm.input_gain_db": 2.0, "pcm.limiter_threshold_dbfs": -6, ... }
  knobs_json      JSONB NOT NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX knob_snapshots_5s_uq
ON knob_snapshots_5s (trace_id, station_key, bucket_ts);

CREATE INDEX knob_snapshots_5s_trace_bucket_idx
ON knob_snapshots_5s (trace_id, bucket_ts);


⸻

2.6 knob_events (change log for auditing/debug)

Whenever a knob is updated (manually or by optimizer), log it.

CREATE TABLE knob_events (
  id              BIGSERIAL PRIMARY KEY,

  trace_id        TEXT NULL REFERENCES traces(trace_id) ON DELETE CASCADE,
  station_key     TEXT NOT NULL,

  knob_key        TEXT NOT NULL,
  old_value       TEXT NULL,
  new_value       TEXT NOT NULL,

  source          TEXT NOT NULL,      -- e.g. "manual", "optimizer", "baseline"
  reason          TEXT NULL,

  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX knob_events_station_time_idx
ON knob_events (station_key, occurred_at);

CREATE INDEX knob_events_trace_time_idx
ON knob_events (trace_id, occurred_at);


⸻

3) Retention (72 hours) – mandatory cleanup job

Run this SQL every 10 minutes (cron/systemd):

-- Metrics
DELETE FROM metrics_agg_5s
WHERE bucket_ts < now() - interval '72 hours';

-- Audio index
DELETE FROM audio_segments_5s
WHERE bucket_ts < now() - interval '72 hours';

-- Knob snapshots
DELETE FROM knob_snapshots_5s
WHERE bucket_ts < now() - interval '72 hours';

-- Knob events (if you want strict 72h on events too)
DELETE FROM knob_events
WHERE occurred_at < now() - interval '72 hours';

-- Traces: remove calls fully outside retention
DELETE FROM traces
WHERE started_at < now() - interval '72 hours'
  AND (ended_at IS NOT NULL AND ended_at < now() - interval '72 hours');

Disk retention (audio files): a separate OS job MUST delete /var/monitoring/audio/* older than 72 hours (directory date-based deletion).

⸻

4) Minimal data linkage (what joins with what)

For a given trace_id and bucket_ts you can fetch:
	•	Metrics (PRE/POST): metrics_agg_5s
	•	Audio segments (PRE/POST): audio_segments_5s
	•	Knobs used: knob_snapshots_5s

All keyed on:
	•	trace_id
	•	station_key
	•	bucket_ts
	•	tap (for metrics/audio)

⸻
