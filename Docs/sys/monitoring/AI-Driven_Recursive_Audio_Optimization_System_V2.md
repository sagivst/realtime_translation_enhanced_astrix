
📘 AI-Driven Recursive Audio Optimization System

Version 2.0.0 – December 2025
Audience: Backend developers, data engineers, DevOps, gateway/server developers, ML engineers

⸻

0. Purpose & Scope

This document defines the architecture, data model, and integration contracts for the
AI-Driven Recursive Audio Optimization System.

The system’s goal is to:
	•	Continuously monitor multiple stations along the audio pipeline (Asterisk → Gateway → STTTTSserver → STT/TTS → back to Asterisk)
	•	Collect rich metrics + PCM audio + knob state per station
	•	Send Station Snapshots to an external AI Optimizer
	•	Receive knob update actions and apply them per channel (caller / callee) in near-real-time
	•	Achieve closed-loop, AI-driven optimization of voice quality and latency in a VoIP/STT/TTS pipeline.

This document is the authoritative specification for:
	•	The data hierarchy and persistent model
	•	The Station Snapshot wire format
	•	The Optimizer interface (API)
	•	The runtime loop and recommended usage pattern in a VoIP environment.

⸻

1. High-Level System Overview

1.1 Pipeline Overview

Audio flows through several processing nodes:
	1.	Asterisk – SIP/RTP PBX, inbound/outbound call legs
	2.	Gateway – RTP/PCM bridge to the external media / STTTTSserver
	3.	STTTTSserver – internal server performing:
	•	STT pre-processing
	•	TTS preparation
	•	Latency tracking, buffering, resampling
	4.	Deepgram (or similar STT engine) – converts PCM → text
	5.	TTS engine – converts text → PCM (outbound audio)
	6.	Hume (or similar) – optional branch for affect/emotion analytics

Monitoring stations are defined along this path (subset relevant here):
	•	STATION 1: Inside Asterisk → before sending RTP to Gateway
	•	STATION 2: Inside Gateway → before sending PCM to STTTTSserver
	•	STATION 3: Inside STTTTSserver → before sending PCM to Deepgram API
	•	STATION 4: Inside Deepgram client → before sending text response back
	•	STATION 9: Inside STTTTSserver → before sending PCM to Gateway (post-TTS)
	•	STATION 10: Inside Gateway → before sending RTP back to Asterisk
	•	STATION 11: Inside STTTTSserver → before sending PCM to Hume API (branch)

At each station we can:
	•	Measure up to 75 monitoring parameters (SNR, jitter, latency, buffer usage, CPU, etc.)
	•	Capture PCM audio for a time segment
	•	Know which knob configuration (AGC, NR, AEC, etc.) is active
	•	Assemble a Station Snapshot and send it to the Optimizer.

⸻

2. Conceptual Hierarchy

To support per-call, per-channel, per-segment optimization, the system models data as:

Call
 ├── Channel: caller
 │     ├── SessionConfig (caller knob set)
 │     └── Segments
 │           └── StationSnapshots (per station, per segment)
 └── Channel: callee
       ├── SessionConfig (callee knob set)
       └── Segments
             └── StationSnapshots (per station, per segment)

Key ideas:
	•	A Call has two Channels: caller and callee.
	•	Each Channel has its own SessionConfig (its own set of knobs).
	•	Each Channel’s audio timeline is divided into Segments (e.g. 5–10s or per utterance).
	•	For each Segment and Station, a Station Snapshot is created and can be sent to the Optimizer.
	•	The Optimizer suggests knob updates per channel, not globally, based on these snapshots.

⸻

3. Persistent Data Model (DB-Level)

This section describes the logical schema. Exact SQL syntax is implementation-specific.

3.1 calls

Represents a full communication session.

calls
------
id                 UUID PK
external_call_id   TEXT          -- Asterisk / PBX call ID
created_at         TIMESTAMP
ended_at           TIMESTAMP NULL
direction          TEXT          -- inbound / outbound
metadata           JSONB         -- tenant, campaign, etc.


⸻

3.2 channels

Each call has at least two channels (caller / callee).

channels
--------
id            UUID PK
call_id       UUID FK → calls.id
name          TEXT       -- "caller" / "callee" (or "A"/"B")
leg           TEXT       -- "A" / "B" (optional)
metadata      JSONB


⸻

3.3 session_configs (per-call, per-channel knob sets)

Each channel has a SessionConfig representing its current knob set.

session_configs
---------------
id              UUID PK
call_id         UUID FK → calls.id
channel_id      UUID FK → channels.id
role            TEXT        -- "caller" / "callee"
knobs           JSONB       -- structured list of knobs
version         INTEGER     -- incremented on changes
active          BOOLEAN
created_at      TIMESTAMP
updated_at      TIMESTAMP

Example knobs JSON:

{
  "knobs": [
    { "name": "agc.target_level_dbfs",    "value": -18 },
    { "name": "noise_reduction_strength", "value":  3  },
    { "name": "aec.tail_length_ms",       "value": 120 }
  ]
}

There will typically be:
	•	One session_configs row for caller
	•	One session_configs row for callee

These are the authoritative knob states per channel.

⸻

3.4 segments (time windows inside a channel)

Segments divide each channel’s timeline into windows for analysis and optimization.

segments
--------
id                 UUID PK
channel_id         UUID FK → channels.id
session_config_id  UUID FK → session_configs.id
start_ms           BIGINT    -- relative to call start
end_ms             BIGINT
segment_type       TEXT      -- speech / silence / event / mixed
transcript         TEXT NULL
transcript_json    JSONB NULL
created_at         TIMESTAMP

Each segment records which SessionConfig was active for that channel during this time window.

⸻

3.5 station_snapshots (per segment, per station)

station_snapshots is the persistent representation of what we send to the Optimizer.

station_snapshots
-----------------
id               UUID PK
segment_id       UUID FK → segments.id
station_id       TEXT        -- "STATION_3", "STATION_9", etc.
timestamp        TIMESTAMP   -- capture time
metrics          JSONB       -- numeric metrics (subset of 75)
audio_ref        TEXT        -- storage key for PCM
knobs_effective  JSONB       -- knob list active at this time
constraints      JSONB
targets          JSONB
optimizer_run_id UUID NULL   -- if used in a specific optimization run
created_at       TIMESTAMP

	•	knobs_effective is a copy of the knob set from session_configs at the time of snapshot creation.
	•	This allows offline analysis and reproducibility.

⸻

4. Live Knob Application Model (Dual Channel)

In real time, we want different knobs per channel (caller vs callee), potentially with different:
	•	SNR
	•	jitter
	•	echo profile
	•	speech dynamics

4.1 Live Knob Cache

At runtime, the system maintains an in-memory cache:

live_knobs[call_id]["caller"] = current caller knob set
live_knobs[call_id]["callee"] = current callee knob set

4.2 Per-Packet Application

For each audio packet/frame:

on_packet(packet):
    channel = detect_channel(packet)          # caller / callee
    knobs   = live_knobs[call_id][channel]    # per-channel knob set
    apply_knobs(knobs, packet.audio_frame)    # AGC, NR, AEC, etc.
    process_dsp(packet)

When the Optimizer returns knob updates:
	1.	Update session_configs in DB (increment version).
	2.	Update live_knobs[call_id][channel] in memory.
	3.	Subsequent packets for that channel immediately use the new values.

Typical knob update latency: 0–5 ms depending on implementation.

⸻

5. Station Snapshot Wire Format (Payload to Optimizer)

A Station Snapshot is the JSON payload sent to the AI Optimizer.
It is a flattened view that includes:
	•	Hierarchy information (call, channel, segment)
	•	Station identity (station_id)
	•	Metrics
	•	Audio reference
	•	Effective knobs
	•	Constraints and targets

5.1 Required Top-Level Fields

A Station Snapshot MUST contain:
	•	schema_version
	•	id
	•	station_id
	•	timestamp
	•	call_id
	•	channel
	•	segment {…}
	•	metrics {…}
	•	audio {…}
	•	knobs [ … ]
	•	constraints {…}
	•	targets {…}
	•	totals {…} (optional, for debug)

⸻

5.2 Field Specifications

schema_version (REQUIRED)
String; used for schema evolution; e.g. "1.0.0".

id (REQUIRED)
UUID v4 string identifying this snapshot (station_snapshots.id).

station_id (REQUIRED)
String enum:
	•	"STATION_1", "STATION_2", "STATION_3", "STATION_4",
"STATION_9", "STATION_10", "STATION_11"

timestamp (REQUIRED)
ISO-8601 UTC datetime, e.g. "2025-11-30T19:32:22.165Z".

call_id (REQUIRED)
String; maps to calls.external_call_id or calls.id.

channel (REQUIRED)
Which side of the call this snapshot applies to:
	•	"caller" / "callee"
	•	or "A" / "B"

segment (REQUIRED BLOCK)

"segment": {
  "segment_id": "seg-1764531142162-1",
  "start_ms": 10500,
  "end_ms": 14600
}

	•	Must be consistent per call.
	•	start_ms < end_ms.
	•	Recommended segment length: 2000–8000 ms.

metrics (REQUIRED BLOCK)
Numeric metrics only. Missing values → null, not "NA".

Example:

"metrics": {
  "snr_db": 28.5,
  "jitter_ms": 12.3,
  "packet_loss_pct": 0.1,
  "audio_level_dbfs": -18,
  "processing_latency_ms": 42,
  "transcription_accuracy": 0.94,
  "transcription_latency_ms": 145,
  "end_to_end_latency_ms": 187,
  "buffer_usage_pct": 52.3,
  "buffer_underruns": 0,
  "packets_sent": 5240,
  "cpu_usage_pct": 28.1
}

audio (REQUIRED BLOCK)

"audio": {
  "sample_rate": 16000,
  "format": "pcm_s16le",
  "duration_ms": 4000,
  "storage_key": "s3://bucket/test-call-1764531142162/station3_seg1.pcm"
}

	•	sample_rate must be accurate (8k/16k/48k).
	•	format must be PCM or WAV type.
	•	storage_key must be a persistent URI (S3, MinIO, GCS, filesystem).

knobs (REQUIRED BLOCK)
The effective knob set at the time of the snapshot.

"knobs": [
  { "name": "agc.target_level_dbfs", "value": -18 },
  { "name": "noise_reduction_strength", "value": 3 }
]

Rules:
	•	MUST be an array of objects, not a plain object.
	•	name is stable across versions.
	•	value numeric/boolean/string/null as appropriate.
	•	Unknown knobs MUST be safely ignored by the Optimizer.

constraints (REQUIRED BLOCK)
Defines what the Optimizer must not violate.

"constraints": {
  "max_input_gain_db": 6,
  "min_snr_db": 20,
  "aec_must_be_on": true
}

targets (REQUIRED BLOCK)
Defines the optimization objective for this snapshot.

"targets": {
  "goal": "max_clarity",
  "weights": {
    "clarity": 0.55,
    "noise": 0.25,
    "echo": 0.15,
    "latency": 0.05
  }
}

totals (OPTIONAL)
Debug-only:

"totals": {
  "knobs_count": 2,
  "metrics_count": 19
}


⸻

5.3 Example of a Full Valid Snapshot

{
  "schema_version": "1.0.0",
  "id": "119274aa-cc22-4cdb-bcd8-ed516beb5c30",
  "station_id": "STATION_3",
  "timestamp": "2025-11-30T19:32:22.165Z",
  "call_id": "test-call-1764531142162",
  "channel": "caller",

  "segment": {
    "segment_id": "seg-1764531142162-1",
    "start_ms": 10500,
    "end_ms": 14600
  },

  "metrics": {
    "snr_db": 28.5,
    "jitter_ms": 12.3,
    "error_rate": 0.02,
    "packets_sent": 5240,
    "cpu_usage_pct": 28.1,
    "noise_floor_db": -65,
    "packet_loss_pct": 0.1,
    "audio_level_dbfs": -18,
    "buffer_underruns": 0,
    "buffer_usage_pct": 52.3,
    "packets_received": 5234,
    "voice_activity_ratio": 0.72,
    "end_to_end_latency_ms": 187,
    "jitter_buffer_size_ms": 100,
    "processing_latency_ms": 42,
    "transcription_accuracy": 0.94,
    "transcription_latency_ms": 145
  },

  "audio": {
    "sample_rate": 16000,
    "format": "pcm_s16le",
    "duration_ms": 4000,
    "storage_key": "s3://bucket/test-call-1764531142162/station3_seg1.pcm"
  },

  "knobs": [
    { "name": "agc.target_level_dbfs", "value": -18 },
    { "name": "noise_reduction_strength", "value": 3 }
  ],

  "constraints": {
    "max_input_gain_db": 6,
    "min_snr_db": 20,
    "aec_must_be_on": true
  },

  "targets": {
    "goal": "max_clarity",
    "weights": {
      "clarity": 0.55,
      "noise": 0.25,
      "echo": 0.15,
      "latency": 0.05
    }
  },

  "totals": {
    "knobs_count": 2,
    "metrics_count": 19
  }
}


⸻

6. Optimizer Service Interface

The Optimizer is implemented on top of an LLM (e.g., via the OpenAI API).
From your system’s perspective, it is a simple HTTP service that:
	•	Accepts a Station Snapshot
	•	Returns:
	•	knob.update actions
	•	scorecard
	•	flags
	•	suggested next_iteration timing

6.1 Logical Endpoint

Internally you may expose:

POST https://optimizer.yourdomain.com/v1/snapshot

This service typically:
	1.	Validates the snapshot against the JSON Schema
	2.	Calls the LLM API (e.g., OpenAI) with the snapshot as input
	3.	Returns a structured JSON response with actions.

⸻

6.2 Request Structure

Payload is the Station Snapshot itself:

POST /v1/snapshot
Content-Type: application/json

{
  "...": "full Station Snapshot JSON as specified above"
}


⸻

6.3 Optimizer Response Structure (Example)

{
  "optimizer_version": "2.0.0",
  "call_id": "test-call-1764531142162",
  "channel": "caller",

  "actions": [
    {
      "type": "knob.update",
      "name": "agc.target_level_dbfs",
      "old_value": -18,
      "new_value": -20,
      "reason": "under-amplification detected; speech RMS below target"
    },
    {
      "type": "knob.update",
      "name": "noise_reduction_strength",
      "old_value": 3,
      "new_value": 4,
      "reason": "noise floor high; improvement predicted without speech damage"
    }
  ],

  "score": {
    "clarity": 0.78,
    "noise": 0.66,
    "echo": 0.89,
    "latency": 0.91,
    "overall": 0.81
  },

  "flags": [
    "high_jitter_detected",
    "buffer_underrun_event"
  ],

  "next_iteration": {
    "send_snapshot_in_ms": 5000
  }
}

The caller:
	•	Updates the relevant session_configs + live knob cache
	•	Logs the action and scorecard
	•	Optionally uses next_iteration to regulate sampling frequency.

⸻

7. Runtime Optimization Loop

7.1 Step-by-Step Flow
	1.	Audio Processing
	•	Asterisk receives RTP, sends to Gateway → STTTTSserver → STT/TTS → back.
	2.	Monitoring & Capture
	•	At configured intervals (e.g., every 5 seconds) or on events:
	•	Stations compute metrics for a time window (segment).
	•	PCM reference is stored (S3/MinIO).
	3.	Snapshot Creation
	•	For each segment and station:
	•	Build StationSnapshot object:
	•	call_id, channel, segment, metrics, audio, knobs, constraints, targets.
	•	Persist to station_snapshots.
	4.	Sending to Optimizer
	•	Select one or more snapshots (often 1–3 key stations).
	•	POST each snapshot to Optimizer.
	5.	Optimizer Decision
	•	Optimizer uses:
	•	Current snapshot
	•	Possibly recent history
	•	Possibly both channels
	•	Possibly multiple stations
	•	Returns knob updates + score + flags.
	6.	Applying Updates
	•	Update session_configs (per call, per channel).
	•	Update live_knobs[call_id][channel].
	•	Subsequent packets use the new settings.
	7.	Recursive Improvement
	•	Repeat every few seconds or on triggers.
	•	System converges towards better audio and latency for each channel.

⸻

8. Recommended Usage in VoIP Environment

8.1 Sampling Frequency

To balance quality and cost:
	•	Default:
	•	1 snapshot every 5 seconds per call (not per station).
	•	Each snapshot can include fused metrics from 2–3 key stations (e.g., 3, 4, 9) in one JSON.
	•	Event-driven:
	•	Additional snapshots on:
	•	SNR dropping below a threshold
	•	jitter_ms exceeding threshold
	•	buffer_underruns > 0
	•	major STT accuracy degradation

This typically yields ~12 snapshots per minute per call.

8.2 Model Strategy
	•	Use a small/mini model for the real-time Optimizer:
	•	Low cost, low latency
	•	Snapshot input + action output only (no long prose).
	•	Use a larger model offline:
	•	For deep analysis, reports, policy design
	•	Applied to a subset of calls / logs.

8.3 Payload Size

Target:
	•	≤ 400 tokens per request (input + output)
	•	Compact JSON: only relevant metrics, active knobs, short reasons.

This keeps cost per-minute-per-call very low while providing rich optimization power.

⸻

9. Closed JSON Schema (Validation)

This JSON Schema validates the Station Snapshot format defined above.

{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Station Snapshot Schema",
  "type": "object",

  "required": [
    "schema_version",
    "id",
    "station_id",
    "timestamp",
    "call_id",
    "channel",
    "segment",
    "metrics",
    "audio",
    "knobs",
    "constraints",
    "targets"
  ],

  "properties": {

    "schema_version": { "type": "string" },

    "id": {
      "type": "string",
      "format": "uuid"
    },

    "station_id": {
      "type": "string",
      "enum": [
        "STATION_1",
        "STATION_2",
        "STATION_3",
        "STATION_4",
        "STATION_9",
        "STATION_10",
        "STATION_11"
      ]
    },

    "timestamp": { "type": "string", "format": "date-time" },

    "call_id": { "type": "string" },

    "channel": {
      "type": "string",
      "enum": ["A", "B", "caller", "callee"]
    },

    "segment": {
      "type": "object",
      "required": ["segment_id", "start_ms", "end_ms"],
      "properties": {
        "segment_id": { "type": "string" },
        "start_ms": { "type": "number", "minimum": 0 },
        "end_ms": { "type": "number", "minimum": 0 }
      }
    },

    "metrics": {
      "type": "object",
      "additionalProperties": {
        "type": ["number", "null"]
      }
    },

    "audio": {
      "type": "object",
      "required": ["sample_rate", "format", "storage_key"],
      "properties": {
        "sample_rate": { "type": "number" },
        "format": { "type": "string" },
        "duration_ms": { "type": ["number", "null"] },
        "storage_key": { "type": "string" }
      }
    },

    "knobs": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "value"],
        "properties": {
          "name": { "type": "string" },
          "value": { "type": ["number", "boolean", "string", "null"] }
        }
      }
    },

    "constraints": {
      "type": "object",
      "additionalProperties": {
        "type": ["number", "boolean", "string", "null"]
      }
    },

    "targets": {
      "type": "object",
      "properties": {
        "goal": { "type": "string" },
        "weights": {
          "type": "object",
          "additionalProperties": { "type": "number" }
        }
      }
    },

    "totals": {
      "type": "object",
      "properties": {
        "knobs_count": { "type": "number" },
        "metrics_count": { "type": "number" }
      }
    }
  }
}

