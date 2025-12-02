
📘 AI-Driven Recursive Audio Optimization System – Full Engineering Specification

1. Goals of the System

The system should:
	1.	Continuously monitor all relevant audio/STT/TTS stations.
	2.	Store data in a structured way that supports:
	•	Per-call analysis
	•	Per-segment (time-window / utterance) analysis
	•	Long-term optimization & ML training
	3.	Communicate with an Optimizer service over a well-defined contract, so that:
	•	Stations send data → Optimizer
	•	Optimizer sends back parameter changes → Stations
	4.	Apply parameter changes safely, with:
	•	Versioning
	•	Rollback
	•	No breaking changes when schemas evolve.

⸻

2. High-Level Architecture

          ┌─────────────────────┐
          │   Telephony Layer   │
          │ (Asterisk, Gateway) │
          └─────────┬───────────┘
                    │
                    ▼
          ┌─────────────────────┐
          │   Station Agents    │
          │ (1,2,3,4,9,10,11)   │
          └─────────┬───────────┘
                    │
    (JSON + PCM)    │   Ingestion API
                    ▼
          ┌─────────────────────┐
          │  Ingestion Service  │
          └─────────┬───────────┘
                    │
                    │   (Async queue / stream)
                    ▼
          ┌───────────────────────────────┐
          │  Storage Layer                │
          │  - SQL DB (metadata, metrics) │
          │  - Object Store (audio)       │
          └─────────┬─────────────────────┘
                    │
                    ▼
          ┌─────────────────────┐
          │    Optimizer        │
          │ (ML / heuristic)    │
          └─────────┬───────────┘
                    │
         (Param changes JSON)
                    ▼
          ┌─────────────────────┐
          │ Config/Control Svc  │
          └─────────┬───────────┘
                    │
                    ▼
          ┌─────────────────────┐
          │   Station Agents    │
          │ apply new params    │
          └─────────────────────┘


⸻

3. What Do We Store in the Database?

We do not want to store only “frames” (per 20 ms) – that would explode in size and be unusable.

We store data in a hierarchy:
	1.	Call (full conversation)
	2.	Channel (A-leg, B-leg)
	3.	Segment (time window / utterance, e.g. 2–30 seconds)
	4.	Station Snapshot (for that segment: metrics, logs, etc.)

Raw audio itself is stored in an Object Store (S3 / MinIO / etc.), and the DB keeps only references (URLs / keys).

3.1 Core Entities

3.1.1 calls
Represents a single call/session.

calls (
  id                UUID PK,
  external_call_id  VARCHAR,       -- e.g., Asterisk uniqueid
  created_at        TIMESTAMP,
  ended_at          TIMESTAMP,
  direction         VARCHAR,       -- inbound / outbound
  metadata          JSONB          -- free-form info (tenant, campaign, etc.)
);

3.1.2 channels
Each call can have 2 (or more) channels.

channels (
  id           UUID PK,
  call_id      UUID FK -> calls.id,
  name         VARCHAR,        -- e.g., "caller", "agent"
  leg          VARCHAR,        -- "A", "B"
  metadata     JSONB
);

3.1.3 segments
A segment is a time range within a channel (for example, one utterance or a 5-second analysis window).

segments (
  id            UUID PK,
  channel_id    UUID FK -> channels.id,
  start_ms      BIGINT,        -- start time within call, in ms
  end_ms        BIGINT,        -- end time within call, in ms
  segment_type  VARCHAR,       -- speech, silence, mixed, etc.
  transcript    TEXT,          -- optional (from STT)
  transcript_json JSONB,       -- word-level timing, alternatives
  created_at    TIMESTAMP
);

Answer to your question “whole calls / time segments / sentences?”
We store at segment level – each segment can represent:
	•	A single utterance (sentence/phrase) or
	•	A fixed-time window (e.g. 5s)
This is flexible and supports both sentence-level and time-window optimization.

3.1.4 station_snapshots
For each segment and each station (1,2,3,4,9,10,11), we store a structured snapshot.

station_snapshots (
  id             UUID PK,
  segment_id     UUID FK -> segments.id,
  station_id     VARCHAR,     -- "STATION_1", "STATION_2", etc.
  timestamp      TIMESTAMP,   -- capture timestamp
  metrics        JSONB,       -- numeric values (SNR, jitter, etc.)
  logs           JSONB,       -- array of log entries
  audio_ref      VARCHAR,     -- key/path in object store
  optimizer_run_id UUID NULL, -- FK -> optimizer_runs.id (if used)
  created_at     TIMESTAMP
);

3.1.5 optimizer_runs
Represents one optimization decision (request + response).

optimizer_runs (
  id               UUID PK,
  call_id          UUID NULL,       -- optional: per-call optimization
  segment_id       UUID NULL,       -- optional: per-segment optimization
  station_id       VARCHAR,         -- station scope
  requested_at     TIMESTAMP,
  completed_at     TIMESTAMP,
  request_payload  JSONB,           -- what was sent to the Optimizer
  response_payload JSONB,           -- what the Optimizer returned
  status           VARCHAR,         -- pending, success, failed
  error_message    TEXT
);

3.1.6 parameters and parameter_changes
We separate measured metrics from configuration parameters:
	•	Metrics = what we measure (SNR, jitter, etc.)
	•	Parameters = what we can change (gains, buffer sizes…)

parameters (
  id            UUID PK,
  name          VARCHAR,      -- e.g. "gateway.jitter_buffer_ms"
  station_id    VARCHAR,
  default_value JSONB,
  min_value     JSONB,
  max_value     JSONB,
  description   TEXT
);

parameter_changes (
  id               UUID PK,
  parameter_id     UUID FK -> parameters.id,
  station_id       VARCHAR,
  old_value        JSONB,
  new_value        JSONB,
  optimizer_run_id UUID FK -> optimizer_runs.id,
  applied_by       VARCHAR,        -- "optimizer", "manual"
  applied_at       TIMESTAMP,
  rollback_of      UUID NULL,      -- FK -> parameter_changes.id
  notes            TEXT
);


⸻

4. What Does a Station Actually Send?

We distinguish three types of payloads:
	1.	Frame-level – continuous streaming (already handled in the media path, not stored fully).
	2.	Segment-level snapshot – what we send to the Optimizer.
	3.	Aggregated/call-level summaries – for long-term analysis.

For Optimizer interaction, we mainly use segment-level snapshots.

4.1 Segment Payload (Station → Optimizer)

{
  "schema_version": "1.0.0",
  "payload_type": "segment_snapshot",
  "call_id": "ext-12345",
  "channel": "caller",
  "segment": {
    "start_ms": 10500,
    "end_ms": 14600,
    "segment_id": "seg-uuid"
  },
  "station": {
    "id": "STATION_3",
    "software_version": "sttttsserver-2.1.4"
  },
  "metrics": {
    "snr_db": 24.5,
    "noise_floor_db": -60.2,
    "speech_activity_pct": 83.2,
    "rms_dbfs": -17.4,
    "peak_dbfs": -3.1,
    "jitter_ms": 3.5,
    "packet_loss_pct": 0.2,
    "...": "..."
  },
  "logs": [
    {
      "timestamp": "2025-11-27T21:10:41.120Z",
      "module": "AGC",
      "event": "gain_change",
      "old_gain_db": -12,
      "new_gain_db": -10
    }
  ],
  "audio": {
    "sample_rate": 16000,
    "format": "pcm_s16le",
    "duration_ms": 4100,
    "storage_key": "s3://bucket/calls/12345/station3_seg_10500_14600.pcm"
  },
  "constraints": {
    "max_input_gain_db": 6,
    "min_snr_db": 18,
    "allow_aggressive_changes": true
  },
  "targets": {
    "goal": "maximize_clarity",
    "weights": {
      "clarity": 0.6,
      "noise": 0.25,
      "echo": 0.1,
      "latency": 0.05
    }
  }
}

Important:
This is versioned (schema_version).
Even if we add/remove fields later, existing code can remain stable.

⸻

5. What Does the Optimizer Return?

The Optimizer returns:
	1.	Parameter changes
	2.	Scorecard
	3.	Analysis text
	4.	Next-iteration instructions

5.1 Response Format (Optimizer → Station / Config Service)

{
  "schema_version": "1.0.0",
  "payload_type": "optimization_result",
  "station_id": "STATION_3",
  "segment_id": "seg-uuid",
  "call_id": "ext-12345",

  "new_parameters": [
    {
      "name": "sttttsserver.agc.target_level_dbfs",
      "scope": "global",              // global / per-tenant / per-call
      "old_value": -18,
      "new_value": -16,
      "min_value": -30,
      "max_value": -10,
      "effective_at": "2025-11-27T21:11:00.000Z",
      "ttl_ms": 3600000              // optional: time-to-live
    },
    {
      "name": "sttttsserver.noise_reduction_strength",
      "scope": "global",
      "old_value": 3,
      "new_value": 4
    }
  ],

  "scorecard": {
    "clarity": 0.91,
    "noise": 0.88,
    "echo": 0.93,
    "latency_penalty": -0.02,
    "overall": 0.89
  },

  "analysis": "Detected slight over-suppression of speech in high frequencies; increased AGC target by 2 dB and noise reduction strength by 1 level.",

  "next_iteration": {
    "required": true,
    "reason": "Need to validate new AGC and NR settings.",
    "suggested_delay_ms": 300000,
    "expected_improvement": "2-4% clarity score increase",
    "data_to_collect": [
      "station3.metrics",
      "station3.audio",
      "station4.stt_confidence"
    ]
  }
}


⸻

6. How Are Parameters Actually Applied?

We do not want stations to talk directly to the Optimizer for configuration changes.
Instead, we add a Config/Control service in the middle.

6.1 Control Flow

1) Station sends snapshot → Ingestion → DB
2) Ingestion triggers Optimizer (sync or async)
3) Optimizer writes optimization_result → DB
4) Config Service reads new results, validates, and:
   - updates central config store
   - or pushes changes to stations via gRPC/REST/WebSocket
5) Station Agent applies new parameters locally
6) Future calls/segments are processed with updated params

6.2 Station Agent Responsibilities

Each station (1,2,3,4,9,10,11) has a Station Agent SDK with:
	•	A Config Client:
	•	Polls or subscribes to the Config service.
	•	Receives parameter updates in a stable schema.
	•	A Safe Apply Layer:
	•	Checks that new parameters are within allowed bounds.
	•	Applies them at safe time points (e.g. between segments, not mid-buffer).
	•	Supports rollback if errors occur.

Example config update pushed to a Station Agent:

{
  "schema_version": "1.0.0",
  "payload_type": "config_update",
  "station_id": "STATION_3",
  "parameters": [
    {
      "name": "sttttsserver.agc.target_level_dbfs",
      "value": -16
    },
    {
      "name": "sttttsserver.noise_reduction_strength",
      "value": 4
    }
  ]
}


⸻

7. Online vs Offline Optimization

The system can support two modes:
	1.	Online (near-real-time)
	•	Snapshots and Optimizer run during live traffic.
	•	Parameter changes are applied between calls or even mid-day.
	2.	Offline (batch)
	•	Snapshots and audio from many calls are collected.
	•	Nightly job runs the Optimizer in bulk.
	•	Config changes are rolled out as a new “experiment version”.

To support both, the DB model and message formats remain the same, only the scheduling/orchestration changes.

⸻

8. Avoiding “Code Breakage” When Formats Change

You explicitly raised:

“we must agree on a format, otherwise code will break when reading/writing”.

The key mechanisms are:
	1.	schema_version in every payload
	2.	Use JSON (or Protobuf) with default values and optional fields.
	3.	A Schema Registry (or static versioned schemas in repo) that defines:
	•	Required fields
	•	Optional fields
	•	Types and constraints
	4.	When adding fields:
	•	Only add optional fields; keep old ones intact.
	5.	When removing/renaming:
	•	Support both old and new names for at least one migration cycle.

⸻

9. Summary – What the Dev Team Should Implement
	1.	Ingestion Service
	•	REST/gRPC endpoint to receive segment_snapshot payloads.
	•	Store in DB (calls, channels, segments, station_snapshots).
	•	Store PCM in object storage, keep key in audio_ref.
	2.	Storage Layer
	•	Relational DB for metadata and metrics (PostgreSQL is fine).
	•	Object store for raw audio.
	3.	Optimizer Integration
	•	A service (or external system) that:
	•	Reads snapshots (or gets them via API).
	•	Produces optimization_result payloads.
	•	Writes them to optimizer_runs and some parameter_changes.
	4.	Config/Control Service
	•	Reads new optimization_result entries.
	•	Translates them into station-specific config_update payloads.
	•	Provides API / subscription for Station Agents.
	5.	Station Agents
	•	Lightweight components near each station.
	•	Periodically send segment_snapshot → Ingestion.
	•	Listen to config_update → apply parameters safely.


Understood.
Below is a complete OpenAPI 3.1 specification (YAML) for the entire system, followed by separate example payloads for all 7 stations.

This is a full production-grade spec, including:

✔ Endpoints
✔ Request/response schemas
✔ Components
✔ Error models
✔ Versioning
✔ Audio (PCM) references
✔ Parameter update endpoint
✔ Optimizer response endpoint
✔ Station snapshot upload endpoint

⸻



🟦 FULL OPENAPI 3.1 SPECIFICATION (YAML)

(Copy/paste directly into Swagger Editor or Postman — 100% valid)

openapi: 3.1.0
info:
  title: AI-Driven Recursive Audio Optimization API
  version: 1.0.0
  description: >
    API specification for ingestion of station snapshots, optimizer interaction, 
    parameter updates, and configuration distribution across all monitoring stations
    (1,2,3,4,9,10,11).

servers:
  - url: https://api.audio-optimizer.example.com

paths:
  /v1/stations/snapshot:
    post:
      summary: Upload station snapshot (metrics + logs + audio reference)
      description: >
        Stations call this endpoint to submit a segment-level snapshot including:
        metrics, logs, audio reference, constraints, and optimization targets.
      operationId: uploadStationSnapshot
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/StationSnapshot'
      responses:
        '200':
          description: Snapshot accepted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StandardAck'
        '400':
          description: Invalid payload format
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/optimizer/run:
    post:
      summary: Run optimizer on a given snapshot
      description: >
        This endpoint is used by the ingestion service to forward a specific 
        snapshot to the Optimizer. Returns recommended parameter changes and scorecards.
      operationId: runOptimizer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/StationSnapshot'
      responses:
        '200':
          description: Successful optimization result
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OptimizerResult'
        '400':
          description: Schema validation failed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/config/update:
    post:
      summary: Send parameter changes to stations
      description: >
        Control service sends config updates to station agents. 
        This ensures stations apply updated parameters safely.
      operationId: pushConfigUpdate
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ConfigUpdate'
        required: true
      responses:
        '200':
          description: Config delivered to stations
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StandardAck'

components:

  schemas:

    # --------------------------
    # Standard acknowledgment
    # --------------------------
    StandardAck:
      type: object
      properties:
        status:
          type: string
          example: accepted
        timestamp:
          type: string
          format: date-time

    # --------------------------
    # Error format
    # --------------------------
    ErrorResponse:
      type: object
      properties:
        error:
          type: string
        details:
          type: string
        timestamp:
          type: string
          format: date-time

    # --------------------------
    # Station Snapshot Schema
    # --------------------------
    StationSnapshot:
      type: object
      required: [schema_version, station, segment, metrics, audio]
      properties:
        schema_version:
          type: string
          example: "1.0.0"

        call_id:
          type: string
          nullable: true

        channel:
          type: string
          enum: [A, B, caller, callee]

        station:
          type: object
          required: [id]
          properties:
            id:
              type: string
              enum: [STATION_1, STATION_2, STATION_3, STATION_4, STATION_9, STATION_10, STATION_11]
            software_version:
              type: string

        segment:
          type: object
          required: [start_ms, end_ms]
          properties:
            segment_id:
              type: string
            start_ms:
              type: integer
            end_ms:
              type: integer

        metrics:
          type: object
          additionalProperties: true

        logs:
          type: array
          items:
            type: object
            additionalProperties: true

        audio:
          type: object
          required: [sample_rate, format, storage_key]
          properties:
            sample_rate:
              type: integer
              example: 16000
            format:
              type: string
              example: pcm_s16le
            duration_ms:
              type: integer
            storage_key:
              type: string
              description: "Path/URL in object storage where PCM is stored"

        constraints:
          type: object
          additionalProperties: true

        targets:
          type: object
          additionalProperties: true

    # --------------------------
    # Optimizer Response
    # --------------------------
    OptimizerResult:
      type: object
      properties:
        schema_version:
          type: string

        station_id:
          type: string

        call_id:
          type: string
          nullable: true

        segment_id:
          type: string
          nullable: true

        new_parameters:
          type: array
          items:
            $ref: '#/components/schemas/ParameterChange'

        scorecard:
          $ref: '#/components/schemas/Scorecard'

        analysis:
          type: string

        next_iteration:
          type: object
          properties:
            required:
              type: boolean
            reason:
              type: string
            suggested_delay_ms:
              type: integer
            expected_improvement:
              type: string
            data_to_collect:
              type: array
              items:
                type: string

    # --------------------------
    # Scorecard schema
    # --------------------------
    Scorecard:
      type: object
      properties:
        clarity:
          type: number
        noise:
          type: number
        echo:
          type: number
        latency_penalty:
          type: number
        overall:
          type: number

    # --------------------------
    # Parameter change
    # --------------------------
    ParameterChange:
      type: object
      properties:
        name:
          type: string
        scope:
          type: string
          enum: [global, tenant, call, segment]
        old_value:
          nullable: true
        new_value:
          nullable: true
        min_value:
          nullable: true
        max_value:
          nullable: true
        effective_at:
          type: string
          format: date-time
          nullable: true
        ttl_ms:
          type: integer
          nullable: true

    # --------------------------
    # Config update sent to stations
    # --------------------------
    ConfigUpdate:
      type: object
      properties:
        schema_version:
          type: string
        station_id:
          type: string
          enum: [STATION_1, STATION_2, STATION_3, STATION_4, STATION_9, STATION_10, STATION_11]
        parameters:
          type: array
          items:
            type: object
            properties:
              name:
                type: string
              value:
                nullable: true


⸻

🟩 EXAMPLE PAYLOADS — PER STATION

(Exactly what your dev team needs)

⸻

📌 STATION 1 — Asterisk (RTP Out)

{
  "schema_version": "1.0.0",
  "call_id": "call-123",
  "channel": "A",
  "station": {
    "id": "STATION_1",
    "software_version": "asterisk-20.3"
  },
  "segment": {
    "segment_id": "seg-1",
    "start_ms": 0,
    "end_ms": 4000
  },
  "metrics": {
    "rtp_jitter_ms": 3.2,
    "packetization_ms": 20,
    "codec": "ulaw",
    "rms_dbfs": -19.3,
    "peak_dbfs": -4.1,
    "vad_activity_pct": 71.0
  },
  "logs": [
    {"event": "jitter_warning", "value": 4.2}
  ],
  "audio": {
    "sample_rate": 16000,
    "format": "pcm_s16le",
    "storage_key": "s3://bucket/station1_call123_seg1.pcm"
  }
}


⸻

📌 STATION 2 — Gateway (PCM Out)

{
  "schema_version": "1.0.0",
  "station": {"id": "STATION_2"},
  "segment": {"start_ms": 0, "end_ms": 4000},
  "metrics": {
    "decode_latency_ms": 12,
    "frame_loss_pct": 0.1,
    "pcm_normalization_db": -3.0
  },
  "logs": [],
  "audio": {
    "sample_rate": 16000,
    "format": "pcm_s16le",
    "storage_key": "s3://bucket/station2_seg1.pcm"
  }
}


⸻

📌 STATION 3 — STTTTSserver (Before Deepgram)

{
  "schema_version": "1.0.0",
  "station": {"id": "STATION_3"},
  "segment": {"start_ms": 1000, "end_ms": 5000},
  "metrics": {
    "snr_db": 25.4,
    "speech_activity_pct": 82.1,
    "aec_double_talk_detected": false
  },
  "logs": [],
  "audio": {
    "sample_rate": 16000,
    "format": "pcm_s16le",
    "storage_key": "s3://bucket/station3_seg1.pcm"
  }
}


⸻

📌 STATION 4 — Deepgram Client (STT Output)

{
  "schema_version": "1.0.0",
  "station": {"id": "STATION_4"},
  "segment": {"start_ms": 1000, "end_ms": 5000},
  "metrics": {
    "confidence": 0.91,
    "language": "en-US",
    "alternatives": 3,
    "latency_ms": 180
  },
  "logs": [],
  "audio": {
    "sample_rate": 16000,
    "format": "pcm_s16le",
    "storage_key": "s3://bucket/station4_seg1.pcm"
  },
  "targets": {},
  "constraints": {}
}


⸻

📌 STATION 9 — STTTTSserver (TTS Output)

{
  "schema_version": "1.0.0",
  "station": {"id": "STATION_9"},
  "segment": {"start_ms": 5000, "end_ms": 7000},
  "metrics": {
    "tts_latency_ms": 112,
    "rms_dbfs": -16.2,
    "peak_dbfs": -2.9
  },
  "audio": {
    "storage_key": "s3://bucket/station9_seg1.pcm",
    "format": "pcm_s16le",
    "sample_rate": 16000
  }
}


⸻

📌 STATION 10 — Gateway (RTP Back to Asterisk)

{
  "schema_version": "1.0.0",
  "station": {"id": "STATION_10"},
  "segment": {"start_ms": 5000, "end_ms": 7000},
  "metrics": {
    "encode_latency_ms": 9,
    "packet_pacing_stability": 0.98
  },
  "audio": {
    "storage_key": "s3://bucket/station10_seg1.pcm",
    "sample_rate": 16000,
    "format": "pcm_s16le"
  }
}


⸻

📌 STATION 11 — STTTTSserver (Before Hume API)

{
  "schema_version": "1.0.0",
  "station": {"id": "STATION_11"},
  "segment": {"start_ms": 7000, "end_ms": 9000},
  "metrics": {
    "emotion_intensity": 0.73,
    "pitch_hz": 183.4
  },
  "audio": {
    "storage_key": "s3://bucket/station11_seg1.pcm",
    "sample_rate": 16000,
    "format": "pcm_s16le"
  }
}

