

Complete Data Model & Storage Specification

For Development Team

⸻

0. Status of This Document

This document is authoritative.

It replaces and consolidates:
	•	all previous metric lists
	•	all knob lists
	•	all partial DB schemas
	•	all optimization notes

No parallel or alternative model should be implemented.

⸻

1. System Goals (Why this exists)

The system must support:
	•	Real-time monitoring (PCM, RTP, STT, TTS)
	•	Post-mortem debugging
	•	Audio-backed root cause analysis
	•	Safe manual and automatic tuning
	•	Explainability (“why did we change X?”)
	•	Rollback and audit
	•	Cross-station correlation along a call path

This cannot be achieved with metrics alone.

⸻

2. Core Conceptual Separation (Non-Negotiable)

2.1 Metrics

Measured facts about the system.
	•	Read-only
	•	Time-series
	•	Never change system behavior directly

2.2 Knobs

Calibration and control parameters.
	•	The only way to influence behavior
	•	Can be updated by user, AI, or system
	•	Always auditable

2.3 Actions

Explicit decisions to change knobs.
	•	Must be recorded
	•	Must be reversible

2.4 Artifacts

Evidence:
	•	Audio segments
	•	RTP captures
	•	Snapshots

⸻

3. Global Correlation Model

Every persisted object MAY include the following keys
(metrics, audio, actions, events):

Field	Required	Description
trace_id (UUID)	yes	One logical call / flow / run
station_id	yes	Measurement point
component_id	optional	Executing service
direction	optional	RX / TX
channel	optional	Channel index
correlation_id	optional	Cross-service hop ID

Without trace_id, optimization is invalid.

⸻

4. Stations & Components

Stations

Logical measurement points:
	•	Asterisk RTP ingress
	•	Gateway PCM ingress
	•	STTTTSserver pre-STT
	•	Deepgram client
	•	ElevenLabs client
	•	Gateway RTP egress
	•	Hume branch, etc.

Components

Executable services:
	•	PM2 apps
	•	Asterisk
	•	ExternalMedia handlers

Stations are not processes.
Components are not measurement points.

⸻

5. Metric Definitions (Catalog)

Each metric has a stable ID and metadata.

Mandatory attributes:
	•	metric_key (dot-separated)
	•	domain: pcm | rtp | stt | tts | codec | system
	•	scope: per_frame | per_channel | aggregated
	•	aggregation: instant | window | lifetime
	•	value type
	•	unit

Metric examples:

pcm.rms_dbfs
pcm.clipping_ratio
rtp.jitter_ms
rtp.packet_loss_pct
stt.final_latency_ms
tts.first_chunk_latency_ms

Metric keys are never renamed.

⸻

6. Station × Metric Capability Matrix

Not every station can:
	•	measure every metric
	•	control every knob

For each (station, metric) define capabilities:
	•	MEASURABLE
	•	OBSERVABLE
	•	CONTROLLABLE

This drives:
	•	UI enable/disable
	•	collector behavior
	•	safety limits

⸻

7. Metric Storage (Time Series)

7.1 Raw Samples

High-rate, short retention.

Use cases:
	•	debugging
	•	deep analysis
	•	correlation with audio

Retention: minutes

7.2 Aggregated Samples

Windowed metrics:
	•	1s / 5s / 60s

Use cases:
	•	dashboards
	•	alerts
	•	optimization input

Retention: days / weeks

Raw samples are optional in production.
Aggregated samples are mandatory.

⸻

8. Audio Artifacts (Mandatory for Optimization)

8.1 Why Audio Is Required

Metrics explain what happened.
Audio explains what was heard.

Without audio:
	•	clipping bugs are invisible
	•	truncation cannot be verified
	•	STT/TTS quality cannot be audited

⸻

8.2 Storage Strategy

Audio is stored outside the DB:
	•	local filesystem
	•	object storage (S3 / Azure / GCS)

DB stores metadata + URI only.

⸻

8.3 Mandatory Audio Format

All stored audio used for analysis must be:

Parameter	Value
Codec	pcm_s16le
Channels	mono (or per-channel split)
Sample rate	fixed per pipeline (8k or 16k)
Frame alignment	20 ms where possible

No mixed formats.

⸻

8.4 Audio Segment Metadata

Each audio segment MUST include:
	•	trace_id
	•	station_id
	•	direction
	•	channel
	•	ts_start, ts_end
	•	codec, sample_rate, channels, frame_ms
	•	storage_uri
	•	sha256

Optional:
	•	label (pre-stt, post-tts)
	•	meta JSON

⸻

9. RTP / Asterisk Artifacts (Optional but Strongly Recommended)

For RTP stations:
	•	short PCAPs
	•	RTP header summaries

Stored exactly like audio:
	•	external storage
	•	DB reference
	•	linked via trace_id

⸻

10. Knob Definitions

Knobs are defined once in a catalog.

Each knob has:
	•	knob_key
	•	value type
	•	domain
	•	optional linked metric

Example keys:

pcm.rms.warn_threshold_dbfs
rtp.jitterbuffer.max_delay_ms
stt.chunk_duration_ms
tts.voice.stability


⸻

11. Knob Inheritance Model (Critical)

Effective knob value resolution:
	1.	Station override
	2.	Component override
	3.	Global default

No duplication per station.

This is what allows 4,000+ knobs without explosion.

⸻

12. Knob Snapshots

A snapshot captures all effective knobs at a moment.

Snapshots are required:
	•	before optimization
	•	after optimization
	•	before rollback

Stored as:

{ knob_key → value }


⸻

13. Control Actions (Returned Updates)

Every decision to change knobs must be persisted.

Each action stores:
	•	actor (user / AI / system)
	•	requested time
	•	applied time
	•	status
	•	reason
	•	delta (knob_key → new_value)
	•	guardrails used

Actions are first-class entities.

⸻

14. Audit & History

Every knob change must produce:
	•	old value
	•	new value
	•	actor
	•	timestamp
	•	reason
	•	trace reference (if applicable)

Silent changes are forbidden.

⸻

15. Optimization Contract (What MUST exist)

An optimization cycle is valid only if all exist:
	1.	Trace
	2.	Aggregated metrics
	3.	(Recommended) audio segments
	4.	Knob snapshot BEFORE
	5.	Control action (delta)
	6.	Knob snapshot AFTER

Missing any step = non-reproducible result.

⸻

16. Key Naming Rules (Strict)
	•	lowercase
	•	dot-separated
	•	no spaces
	•	immutable

Never rename keys.
Deprecate instead.

⸻

17. Retention Policy (Guideline)

Data	Retention
Raw metrics	minutes
Aggregated metrics	days/weeks
Audio segments	short window / sampled
Knob snapshots	long-term
Control actions	long-term
Alerts/events	long-term


⸻

18. What This Enables
	•	Safe auto-tuning
	•	Explainable decisions
	•	Cross-station debugging
	•	Audio-verified metrics
	•	Rollback without guessing
	•	AI control with guardrails

⸻

19. What Is Explicitly Out of Scope
	•	UI design
	•	Specific ML algorithms
	•	Vendor-specific STT/TTS internals

Those build on top of this model.

⸻

20. Final Statement

This specification defines the minimum complete system required to operate, optimize, and evolve a real-time telephony + STT + TTS pipeline safely.

Any partial implementation will reduce observability and increase operational risk.

⸻

END OF DOCUMENT

⸻

Appendix C — Example Optimization Run (Before/After)

Authoritative Runbook Example (Metrics + Audio + Knobs + Actions)

This appendix shows a complete “optimization cycle” with:
	•	baseline capture (“before”)
	•	diagnosis logic (from metrics + audio indicators)
	•	knob delta proposal (guardrailed)
	•	apply action + snapshot
	•	validation window (“after”)
	•	decision: keep / rollback

Assumption: optimization acts on station-level knobs for a specific station.
The same pattern applies to component-level knobs as well.

⸻

C.1 Optimization Goal

Problem: Outgoing voice sounds choppy / missing initial syllable + occasional distortion.
Hypothesis: clipping / overdrive at a PCM station OR jitter buffer under-sizing at RTP station.
Station under test: GW_PCM_EGRESS (Gateway PCM → STTTTSserver)
Trace: f9a0f6b5-0d5a-4a57-a8b8-0c2d8b2c6b2a

⸻

C.2 BEFORE — Baseline Capture Window (15 seconds)

Window: T0 = 20:10:35Z to T0+15s

C.2.1 Baseline Aggregated Metrics (Examples)

{
  "trace_id": "f9a0f6b5-0d5a-4a57-a8b8-0c2d8b2c6b2a",
  "station_key": "GW_PCM_EGRESS",
  "direction": "RX",
  "bucket_ms": 1000,
  "series": [
    {
      "metric_key": "pcm.rms_dbfs",
      "avg_num": -14.9,
      "p95_num": -10.7,
      "status": "OK"
    },
    {
      "metric_key": "pcm.peak_dbfs",
      "p95_num": -0.8,
      "max_num": -0.1,
      "status": "WARN",
      "meta": { "reason": "peaks near 0 dBFS" }
    },
    {
      "metric_key": "pcm.clipping_ratio",
      "avg_num": 0.014,
      "p95_num": 0.052,
      "status": "ERROR",
      "meta": { "error_threshold": 0.05 }
    },
    {
      "metric_key": "pcm.dropouts_detected",
      "avg_num": 0,
      "status": "OK"
    }
  ]
}

C.2.2 Baseline Audio Evidence (Optional but Recommended)
A short audio segment is persisted for the same window:

{
  "trace_id": "f9a0f6b5-0d5a-4a57-a8b8-0c2d8b2c6b2a",
  "correlation_id": "corr-0001",
  "station_key": "STTTTS_PRE_STT_PCM",
  "label": "pre-stt-baseline",
  "ts_start": "2025-12-27T20:10:36.000Z",
  "ts_end": "2025-12-27T20:10:38.500Z",
  "codec": "pcm_s16le",
  "sample_rate_hz": 16000,
  "storage_uri": "file:///var/monitoring/audio/f9a0f6b5/STTTTS_PRE_STT_PCM/RX/baseline_corr-0001.wav"
}


⸻

C.3 BEFORE — Knob Snapshot (Effective State)

{
  "trace_id": "f9a0f6b5-0d5a-4a57-a8b8-0c2d8b2c6b2a",
  "station_key": "GW_PCM_EGRESS",
  "created_by": "system",
  "knobs_json": {
    "pcm.input_gain_db": 0.0,
    "pcm.auto_gain.enabled": false,
    "pcm.clipping_ratio.warn": 0.01,
    "pcm.clipping_ratio.error": 0.05,
    "pcm.smoothing_window_ms": 250,
    "pcm.vad.enabled": true
  }
}


⸻

C.4 Diagnosis (Decision Inputs)

Trigger Conditions (examples):
	•	pcm.clipping_ratio.p95 >= pcm.clipping_ratio.error for ≥ 3 consecutive windows
	•	pcm.peak_dbfs.max consistently close to 0 dBFS
	•	Audio artifact indicates truncation/distortion

Conclusion: input gain is too high → clipped samples → “missing first syllable” perception.

⸻

C.5 Proposed Knob Delta (Guardrailed)

Policy guardrails:
	•	Max adjustment per action: 3 dB
	•	Min input gain: -12 dB
	•	Must not require restart

Proposed delta:
	•	Reduce input gain by 3 dB
	•	Enable auto gain for stabilization (optional)

{
  "pcm.input_gain_db": -3.0,
  "pcm.auto_gain.enabled": true
}


⸻

C.6 CONTROL ACTION — Persist Then Apply

C.6.1 Action Request (persisted)

{
  "trace_id": "f9a0f6b5-0d5a-4a57-a8b8-0c2d8b2c6b2a",
  "station_key": "GW_PCM_EGRESS",
  "actor_type": "ai",
  "actor_id": "optimizer-v1",
  "status": "requested",
  "reason": "Clipping ratio exceeded ERROR threshold; reduce gain within guardrails",
  "knob_delta_json": {
    "pcm.input_gain_db": -3.0,
    "pcm.auto_gain.enabled": true
  },
  "guardrails_json": {
    "ai_auto_allowed": true,
    "max_adjust_db_per_action": 3.0,
    "min_input_gain_db": -12.0,
    "requires_restart": false
  }
}

C.6.2 Apply result (persisted)

{
  "status": "applied",
  "ts_applied": "2025-12-27T20:10:46.180Z"
}


⸻

C.7 AFTER — Knob Snapshot

{
  "trace_id": "f9a0f6b5-0d5a-4a57-a8b8-0c2d8b2c6b2a",
  "station_key": "GW_PCM_EGRESS",
  "created_by": "system",
  "created_at": "2025-12-27T20:10:46.250Z",
  "knobs_json": {
    "pcm.input_gain_db": -3.0,
    "pcm.auto_gain.enabled": true,
    "pcm.clipping_ratio.warn": 0.01,
    "pcm.clipping_ratio.error": 0.05
  }
}


⸻

C.8 AFTER — Validation Window (15 seconds)

Window: T1 = 20:10:47Z to T1+15s

C.8.1 Validation Metrics

{
  "trace_id": "f9a0f6b5-0d5a-4a57-a8b8-0c2d8b2c6b2a",
  "station_key": "GW_PCM_EGRESS",
  "direction": "RX",
  "bucket_ms": 1000,
  "series": [
    {
      "metric_key": "pcm.rms_dbfs",
      "avg_num": -17.2,
      "p95_num": -12.9,
      "status": "OK"
    },
    {
      "metric_key": "pcm.peak_dbfs",
      "p95_num": -3.4,
      "max_num": -1.2,
      "status": "OK"
    },
    {
      "metric_key": "pcm.clipping_ratio",
      "avg_num": 0.0012,
      "p95_num": 0.004,
      "status": "OK"
    }
  ]
}

C.8.2 Validation Audio (optional)

{
  "trace_id": "f9a0f6b5-0d5a-4a57-a8b8-0c2d8b2c6b2a",
  "station_key": "STTTTS_PRE_STT_PCM",
  "label": "pre-stt-after",
  "ts_start": "2025-12-27T20:10:48.000Z",
  "ts_end": "2025-12-27T20:10:50.500Z",
  "storage_uri": "file:///var/monitoring/audio/f9a0f6b5/STTTTS_PRE_STT_PCM/RX/after_corr-0002.wav"
}


⸻

C.9 Decision Rule (Keep vs Rollback)

Keep change if all are true for N windows (e.g., 10 windows):
	•	clipping_ratio ≤ warn_threshold
	•	peak_dbfs.max ≤ -1.0 dBFS (headroom)
	•	rms_dbfs remains within acceptable range (not too quiet)
	•	no increase in dropouts/latency

Rollback if:
	•	RMS becomes too low for STT (e.g., avg < -28 dBFS)
	•	VAD fails (speech_activity_ratio collapses)
	•	new distortion appears

⸻

C.10 Rollback Example (If Needed)

Rollback is implemented as another control_action that restores previous values (from the BEFORE snapshot):

{
  "trace_id": "f9a0f6b5-0d5a-4a57-a8b8-0c2d8b2c6b2a",
  "station_key": "GW_PCM_EGRESS",
  "actor_type": "system",
  "status": "requested",
  "reason": "Post-change RMS too low; reverting to snapshot",
  "knob_delta_json": {
    "pcm.input_gain_db": 0.0,
    "pcm.auto_gain.enabled": false
  }
}


⸻

Appendix D — API Payload Schemas (JSON)

Canonical Contracts for database-api-server.js

This appendix defines canonical JSON payload shapes for the monitoring/control API layer.
All services MUST conform to these schemas.

JSON Schema is presented in a lightweight, implementation-friendly format.
If you need strict JSON Schema Draft-2020-12, we can formalize it, but these structures are canonical.

⸻

D.1 Common Types

D.1.1 Identifiers

{
  "trace_id": "uuid",
  "station_key": "string",
  "component_key": "string",
  "correlation_id": "string|null",
  "direction": "RX|TX|null",
  "channel": "number|null"
}


⸻

D.2 Create Trace

POST /api/traces

Request

{
  "trace_key": "call-7777-8888-2025-12-27T20:10:33Z",
  "kind": "call",
  "started_at": "2025-12-27T20:10:33.120Z",
  "asterisk_call_id": "1735330233.402",
  "meta": {
    "caller_ext": "7777",
    "callee_ext": "8888",
    "language_pair": "he↔en",
    "pipeline_version": "working-full-cycle-timing-sync"
  }
}

Response

{
  "trace_id": "f9a0f6b5-0d5a-4a57-a8b8-0c2d8b2c6b2a"
}


⸻

D.3 Register Trace Stations

POST /api/traces/:trace_id/stations

Request

{
  "stations": [
    {"station_key":"AST_RTP_INGRESS","role":"ingress_rtp"},
    {"station_key":"GW_PCM_EGRESS","role":"rtp_to_pcm_boundary"},
    {"station_key":"STTTTS_PRE_STT_PCM","role":"pre_stt_pcm"},
    {"station_key":"STT_CLIENT","role":"stt_client"},
    {"station_key":"STTTTS_PRE_TTS_PCM","role":"post_tts_pcm"},
    {"station_key":"GW_RTP_EGRESS","role":"egress_rtp"}
  ]
}

Response

{"ok": true}


⸻

D.4 Ingest Metric Samples (Raw)

POST /api/metrics/raw

Request

{
  "samples": [
    {
      "ts": "2025-12-27T20:10:40.020Z",
      "trace_id": "f9a0f6b5-0d5a-4a57-a8b8-0c2d8b2c6b2a",
      "correlation_id": "corr-0001",
      "station_key": "GW_PCM_EGRESS",
      "metric_key": "pcm.peak_dbfs",
      "direction": "RX",
      "channel": 0,
      "value": -4.3,
      "unit": "dBFS",
      "status": "OK",
      "meta": { "frame_ms": 20 }
    }
  ]
}

Response

{"ingested": 1}


⸻

D.5 Ingest Metric Samples (Aggregated)

POST /api/metrics/agg

Request

{
  "samples": [
    {
      "bucket_ts": "2025-12-27T20:10:40.000Z",
      "bucket_ms": 1000,
      "trace_id": "f9a0f6b5-0d5a-4a57-a8b8-0c2d8b2c6b2a",
      "station_key": "GW_PCM_EGRESS",
      "metric_key": "pcm.rms_dbfs",
      "direction": "RX",
      "channel": 0,
      "count": 50,
      "min": -28.1,
      "max": -9.3,
      "avg": -16.8,
      "p95": -11.2,
      "last": -14.9,
      "status": "OK",
      "meta": {}
    }
  ]
}

Response

{"ingested": 1}


⸻

D.6 Create Audio Segment Record

POST /api/audio/segments

Request

{
  "trace_id": "f9a0f6b5-0d5a-4a57-a8b8-0c2d8b2c6b2a",
  "correlation_id": "corr-0001",
  "station_key": "STTTTS_PRE_STT_PCM",
  "direction": "RX",
  "channel": 0,
  "ts_start": "2025-12-27T20:10:40.000Z",
  "ts_end": "2025-12-27T20:10:42.400Z",
  "container": "wav",
  "codec": "pcm_s16le",
  "sample_rate_hz": 16000,
  "channels": 1,
  "frame_ms": 20,
  "storage_uri": "file:///var/monitoring/audio/f9a0f6b5/.../corr-0001.wav",
  "sha256": "b4c2...9f1a",
  "byte_size": 768000,
  "label": "pre-stt",
  "meta": {}
}

Response

{"segment_id": 99122}


⸻

D.7 Knob Snapshot

POST /api/knobs/snapshots

Request

{
  "trace_id": "f9a0f6b5-0d5a-4a57-a8b8-0c2d8b2c6b2a",
  "station_key": "GW_PCM_EGRESS",
  "component_key": "gateway-3333",
  "created_by": "system",
  "knobs": {
    "pcm.input_gain_db": 0.0,
    "pcm.auto_gain.enabled": false,
    "pcm.clipping_ratio.warn": 0.01
  }
}

Response

{"snapshot_id": 55021}


⸻

D.8 Control Action (Request → Apply)

POST /api/control/actions

Request

{
  "trace_id": "f9a0f6b5-0d5a-4a57-a8b8-0c2d8b2c6b2a",
  "station_key": "GW_PCM_EGRESS",
  "component_key": "gateway-3333",
  "actor_type": "ai",
  "actor_id": "optimizer-v1",
  "reason": "Clipping ratio exceeded ERROR threshold; reduce gain within guardrails",
  "correlation_id": "corr-0001",
  "knob_delta": {
    "pcm.input_gain_db": -3.0,
    "pcm.auto_gain.enabled": true
  },
  "guardrails": {
    "max_adjust_db_per_action": 3.0,
    "min_input_gain_db": -12.0,
    "requires_restart": false
  }
}

Response

{
  "action_id": 10291,
  "status": "requested"
}

PATCH /api/control/actions/:action_id

Request

{
  "status": "applied",
  "ts_applied": "2025-12-27T20:10:46.180Z",
  "meta": { "applied_by": "gateway-3333" }
}

Response

{"ok": true}


⸻

D.9 Fetch Full Trace (for UI / Debug)

GET /api/traces/:trace_id/full

Response

{
  "trace": { "...": "..." },
  "stations": [ { "station_key":"...", "role":"..." } ],
  "metrics_agg": [ /* windowed samples */ ],
  "audio_segments": [ /* artifacts */ ],
  "knob_snapshots": [ /* before/after */ ],
  "control_actions": [ /* requested/applied/rollback */ ],
  "alerts": [ /* optional */ ]
}


⸻

D.10 System Health (existing endpoint alignment)

GET /api/health/system

Response (extended)

{
  "status":"DEGRADED",
  "components_live":8,
  "components_total":9,
  "components":{
    "gateway-3333":{
      "status":"LIVE",
      "pid":"159984",
      "port":7777,
      "layer":"gateways",
      "critical":true,
      "metrics": {
        "cpu_pct": 12.4,
        "mem_rss_mb": 220,
        "event_loop_lag_ms": 8
      },
      "lastCheck":"2025-12-11T17:13:44.397Z"
    }
  },
  "timestamp":"2025-12-11T17:13:44.408Z"
}


⸻

End of Appendices C & D
