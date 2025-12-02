

📘 AI Audio Optimization – Data Model & Station Snapshot Specification

Version 2.0.0 – Updated December 2025
Audience: Backend developers, data engineers, DevOps, gateway/server developers

⸻

0. Document Purpose

This document defines the complete data model, hierarchy, and wire-format snapshot required by the AI Optimizer.
It expands the previous version by including:
	•	Full Call → Channel → SessionConfig → Segment → StationSnapshot hierarchy
	•	Support for two independent knob sets (caller + callee)
	•	Mapping between persistent DB structure and runtime JSON snapshots
	•	Strict constraints and versioning rules
	•	Updated closed JSON Schema
	•	Clarifications on how snapshots fit into the real-time audio pipeline

This is now the authoritative specification for the development team.

⸻

1. High-Level Hierarchy

The system manages audio optimization per call, where each call contains two channels (caller/callee).
Each channel has its own SessionConfig, containing a dedicated knob set.
The channel produces segments, and each segment is measured by multiple stations.

Hierarchy (Authoritative)

Call
 ├── Channel: caller
 │     ├── SessionConfig (caller knob set)
 │     └── Segments
 │           └── StationSnapshots (per station, per segment)
 └── Channel: callee
       ├── SessionConfig (callee knob set)
       └── Segments
             └── StationSnapshots (per station, per segment)

Every Station Snapshot is a child of a Segment, which is a child of a Channel, which belongs to a Call.

This hierarchy must be reflected both in the database and in the runtime processing logic.

⸻

2. Entities (Persistent Data Model)

2.1 calls

Represents one full communication session.

calls
------
id (UUID PK)
external_call_id
created_at
ended_at
direction             -- inbound/outbound
metadata (JSONB)


⸻

2.2 channels

Each call has exactly two channels:

channels
--------
id (UUID PK)
call_id (FK → calls)
name ("caller"/"callee")
leg ("A"/"B")
metadata (JSONB)


⸻

2.3 session_configs

Holds the active knob set per channel.

session_configs
---------------
id (UUID PK)
call_id (FK → calls)
channel_id (FK → channels)
role ("caller"/"callee")
knobs (JSONB)
version (INTEGER)
active (BOOLEAN)
created_at
updated_at

Example:

{
  "knobs": [
    { "name": "agc.target_level_dbfs", "value": -18 },
    { "name": "noise_reduction_strength", "value": 3 }
  ]
}


⸻

2.4 segments

Segments divide each channel timeline.

segments
--------
id (UUID PK)
channel_id (FK → channels)
session_config_id (FK → session_configs)
start_ms
end_ms
segment_type   -- speech/silence/event
transcript
transcript_json
created_at

A segment explicitly records which knob set was active during this time.

⸻

2.5 station_snapshots

Every station creates one snapshot per segment.

station_snapshots
-----------------
id (UUID PK)
segment_id (UUID FK)
station_id ("STATION_3" etc.)
timestamp
metrics (JSONB)
audio_ref (TEXT)
knobs_effective (JSONB)
constraints (JSONB)
targets (JSONB)
optimizer_run_id (NULLABLE)
created_at

knobs_effective is a copy of the knob set from the relevant session_config.

⸻

3. Real-Time Logic (How the Two-Knob Model Works)

A. Live processing uses two in-memory knob sets:

live_knobs[call_id]["caller"] = session_configs(caller)
live_knobs[call_id]["callee"] = session_configs(callee)

B. For each audio packet:

packet.channel = caller | callee
apply(live_knobs[channel], packet.audio_frame)

C. Snapshots copy exactly the knobs active at that time.

D. Optimizer returns updates → system updates session_configs, increments version.

⸻

4. Transport Format (Wire Snapshot)

Snapshots are:
	•	JSON
	•	POSTed individually
	•	Self-contained
	•	MUST include: metadata, metrics, knobs, constraints, targets, audio reference

⸻

5. Required Snapshot Structure

(This section integrates the previous spec + the new hierarchy)

A valid snapshot MUST include:
	•	schema_version
	•	id (UUID)
	•	station_id
	•	timestamp
	•	call_id
	•	channel (caller / callee)
	•	segment {…}
	•	metrics {…}
	•	audio {…}
	•	knobs [ … ]
	•	constraints {…}
	•	targets {…}
	•	totals {…} (optional)

⸻

6. Field-by-Field Specification (Expanded)

This section is identical to the previous spec but clarified with more details about hierarchy and knob behavior.

6.1 schema_version

Controls backward/forward compatibility.

6.2 id

Snapshot identifier (matches station_snapshots.id)

6.3 station_id

Defines the monitoring point.

6.4 timestamp

UTC capture time.

6.5 call_id

Your system’s call-level identifier.

6.6 channel

Which knob set applies:
	•	"caller" = SessionConfig A
	•	"callee" = SessionConfig B

6.7 segment

Represents the time slice; must match DB segments.

6.8 metrics

All numeric.
Values not available = null.

6.9 audio

Reference to PCM.

6.10 knobs

Effective knob set at the time of the snapshot.

Matches session_configs.knobs.

6.11 constraints

Rules that cannot be violated.

6.12 targets

Optimization goals for this snapshot.

6.13 totals

Debug info.

⸻

7. Example Snapshot (Updated)

Unchanged except where hierarchy clarified.
(See your previous snapshot example — still valid.)

⸻

8. Closed JSON Schema (Updated)

Now extended to include hierarchy eligibility and explicit support for two knob sets per channel.

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

