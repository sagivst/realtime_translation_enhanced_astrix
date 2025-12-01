
Monitoring & Auto-Tuning System – Complete Master Specification

Version

2.1.0 (Consolidated & Expanded)



⸻

1. Introduction

This document is the full technical specification for the Monitoring, Analysis, and Auto-Tuning system for the real-time audio pipeline:

Asterisk (PBX) → Media Gateway → STTTTSserver → Deepgram STT → Hume (Emotion) → back to Asterisk

The document consolidates:
	•	High-level architecture diagrams (ASCII)
	•	Internal architecture of monitoring-server.js
	•	Full OpenAPI 3.1 specification for the Monitoring & Auto-Tuning API
	•	UI/UX wireframes for Level 1 / Level 2 / Level 3 / Global AI Panel
	•	Detailed description of the recursive optimization loop using the AI engine (ChatGPT / LLM)
	•	Knobs ↔ Metrics mapping (75 metrics × all stations) – via external XLSX (Annex A)

This is the single source of truth for backend, frontend, DevOps, and ML/AI integration.

⸻

2. Architecture Diagrams (ASCII)

2.1 High-Level System Diagram – Monitoring Stations

              +--------------------+
 Caller A --> |   Asterisk (PBX)   |
              |   STATION 1        |
              +---------+----------+
                        | RTP
                        v
              +--------------------+
              |  Media Gateway     |
              | STATION 2 / 10     |
              +----+----------+----+
                   | PCM           | RTP back to Asterisk
                   v               v
        +------------------+   (to callee leg)
        |  STTTTSserver    |
        |  STATION 3 / 9   |
        +---+---------+----+
            |         |
            | PCM     | PCM (branch)
            v         v
  +----------------+  +----------------+
  | Deepgram STT   |  | Hume (EVI)     |
  | STATION 4      |  | STATION 11     |
  +----------------+  +----------------+

                    ^
                    |
         +---------------------+
         | Monitoring Server   |
         | (monitoring-server) |
         |   + UI / API / AI   |
         +---------------------+

Interpretation:
	•	STATION 1 – Asterisk (PBX): RTP source leg, monitored before sending media to the Gateway.
	•	STATION 2 / 10 – Media Gateway: RTP↔PCM conversion, monitored on both inbound (to STTTTSserver) and outbound (back to Asterisk) directions.
	•	STATION 3 / 9 – STTTTSserver: Core STT/TTS server, monitored on inbound PCM (to STT) and outbound PCM (from TTS).
	•	STATION 4 – Deepgram STT: External STT streaming API.
	•	STATION 11 – Hume: Emotion/voice intelligence branch, fed by a PCM branch from STTTTSserver.
	•	Monitoring Server: Central brain – collects metrics, exposes UI, runs AI auto-tuning via conversations with the LLM.

⸻

2.2 Internal Diagram – monitoring-server.js (Logical Architecture)

+--------------------------------------------------------+
|                monitoring-server.js                    |
+--------------------------------------------------------+
|  HTTP API (OpenAPI):                                   |
|    /snapshot, /optimize, /apply, /knob-catalog, ...    |
|                                                        |
|  WebSocket / SSE:                                      |
|    -> Push snapshots & AI logs to UI                   |
|                                                        |
|  Optimizer Core:                                       |
|    - Reads Annex A mapping                             |
|    - Runs auto-tuning loop                             |
|                                                        |
|  UI Backend:                                           |
|    - Serves Level 1/2/3 layouts                        |
|    - Aggregates metrics per station                    |
|                                                        |
|  Integrations:                                         |
|    - Asterisk / Gateway / STTTTSserver (control APIs)  |
|    - Deepgram / Hume logs                              |
+--------------------------------------------------------+

Key responsibilities:
	•	Accepts incoming metrics/knobs from all stations.
	•	Handles /optimize calls by delegating to the AI engine (ChatGPT / LLM).
	•	Applies knob changes via /apply to the underlying systems.
	•	Streams updated metrics and AI decisions to the frontend in real time.

⸻

3. Monitoring & Auto-Tuning API (OpenAPI 3.1)

This API can be exported as monitoring-api.yaml.

openapi: 3.1.0
info:
  title: Monitoring & Auto-Tuning API
  version: 1.0.0

servers:
  - url: https://monitoring.yourdomain.com/api

paths:
  /snapshot:
    post:
      summary: Submit current metrics & knobs snapshot for a station
      operationId: submitSnapshot
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SnapshotRequest'
      responses:
        '200':
          description: Snapshot accepted

  /optimize:
    post:
      summary: Ask AI engine for optimization recommendations
      operationId: optimizeStation
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OptimizeRequest'
      responses:
        '200':
          description: Optimization result
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OptimizeResponse'

  /apply:
    post:
      summary: Apply recommended knob changes to a station
      operationId: applyChanges
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ApplyRequest'
      responses:
        '200':
          description: Changes applied

  /knob-catalog:
    get:
      summary: List knobs and constraints per station
      operationId: listKnobs
      parameters:
        - in: query
          name: stationId
          schema:
            type: string
          required: false
      responses:
        '200':
          description: Knob catalog
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/KnobDefinition'

  /station-capabilities:
    get:
      summary: Returns which metrics and knobs are supported by each station
      operationId: stationCapabilities
      responses:
        '200':
          description: Capabilities list
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/StationCapabilities'

components:
  schemas:
    SnapshotRequest:
      type: object
      required: [station, metrics, knobs]
      properties:
        station:
          type: string
          example: STATION_3
        metrics:
          type: object
          additionalProperties:
            type: number
          description: >
            Current values for any subset of the 75 metrics
        knobs:
          type: object
          additionalProperties:
            oneOf:
              - type: number
              - type: string
              - type: boolean
          description: Current knob settings for this station

    OptimizeRequest:
      type: object
      required: [station, metrics, knobs]
      properties:
        station:
          type: string
        metrics:
          type: object
          additionalProperties:
            type: number
        knobs:
          type: object
          additionalProperties:
            oneOf:
              - type: number
              - type: string
              - type: boolean
        goal:
          type: string
          enum: [latency, quality, balanced]
          default: balanced

    OptimizeResponse:
      type: object
      properties:
        station:
          type: string
        actions:
          type: array
          items:
            $ref: '#/components/schemas/KnobChange'
        confidence:
          type: number
          format: float
        notes:
          type: string

    ApplyRequest:
      type: object
      required: [station, changes]
      properties:
        station:
          type: string
        changes:
          type: array
          items:
            $ref: '#/components/schemas/KnobChange'

    KnobChange:
      type: object
      required: [knob]
      properties:
        knob:
          type: string
        variableName:
          type: string
        set:
          nullable: true
        delta:
          nullable: true
        reason:
          type: string

    KnobDefinition:
      type: object
      properties:
        station:
          type: string
        knobName:
          type: string
        variableName:
          type: string
        legalRange:
          type: string
        preferredRange:
          type: string
        metricsAffected:
          type: array
          items:
            type: string
        installationRequirement:
          type: string

    StationCapabilities:
      type: object
      properties:
        station:
          type: string
        metrics:
          type: array
          items:
            type: string
        knobs:
          type: array
          items:
            type: string

This API aligns directly with the XLSX mapping (Annex A) that defines all knobs, ranges, and affected metrics.

⸻

4. UI / UX Wireframes

These are textual/ASCII wireframes you can hand to the frontend/UX team.

4.1 Level 1 – Monitoring Grid (Overview)

+-----------------------------------------------------------+
|  GLOBAL HEADER: Title | Global Audio Graph | Menu        |
+-----------------------------------------------------------+
| [STATION_1]  [STATION_2]  [STATION_3]  [STATION_4]        |
|  +--------+  +--------+   +--------+   +--------+         |
|  | Name   |  | Name   |   | Name   |   | Name   |         |
|  | ● ON   |  | ● OFF  |   | ● ON   |   | ● ON   |         |
|  | pkts/s |  | pkts/s |   | pkts/s |   | pkts/s |         |
|  | L:123  |  | L:240  |   | L: 80  |   | L:100  |         |
|  | PL:1%  |  | PL:3%  |   | PL:0%  |   | PL:0%  |         |
|  | MOS:4.7|  | MOS:3.1|   | MOS:4.8|   | MOS:4.6|         |
|  |     ↗  |  |     ↗  |   |     ↗  |   |     ↗  |         |
|  +--------+  +--------+   +--------+   +--------+         |
| ...                                                       |
+-----------------------------------------------------------+
| [▼ Global AI Optimization Panel]                          |
+-----------------------------------------------------------+

Behavior:
	•	Clicking the cube or the ↗ icon → opens Level 2 for that station.
	•	Colors:
	•	Green: within preferred range.
	•	Yellow/Orange: warning-level deviations.
	•	Red: critical deviations.
	•	The bottom panel expands to show the Global AI Optimization Panel (see 4.4).

⸻

4.2 Level 2 – Full Screen View for a Single Station

+-----------------------------------------------------------+
|  STATION_3  | ● ONLINE | [Back]                          |
+-----------------------------------------------------------+
|  Wide Audio Waveform   [▶ Listen Live]                   |
|  (full width, real-time)                                 |
+-----------------------------------------------------------+
|  [▼ Knobs Panel]                                         |
|   - codec_type        [OPUS] (G711/G729/OPUS)            |
|   - chunk_ms          [250]  (Legal: 50–1000, Pref:200–350)
|   - vad_level         [medium]                           |
|   - concurrency_limit [16]                               |
|   - ...                                                  |
+-----------------------------------------------------------+
|  [▼ Recursive AI Log]                                    |
|   12:01:03  Δ chunk_ms 300→250   latency.avg 210→180     |
|   12:01:06  Δ vad      high→med  latency95   400→260     |
|   ...                                                    |
+-----------------------------------------------------------+
|  Metrics (all 75): grouped cards                         |
|   [Latency] [Buffer] [Packet] [AudioQuality] [Performance]
+-----------------------------------------------------------+

Behavior:
	•	The Knobs Panel shows editable values with legal & preferred ranges from Annex A.
	•	The Recursive AI Log shows each optimization step (with timestamps, station, knob changes, before/after metrics).
	•	Clicking on any metric card switches to Level 3 for that metric.

⸻

4.3 Level 3 – Single Metric Editor

+-----------------------------------------------------------+
|  Metric: latency.avg @ STATION_3   [Back to Station]     |
+-----------------------------------------------------------+
| Current: 182 ms                                           |
| Legal:   0 – 1000 ms                                      |
| Preferred: 80 – 250 ms                                    |
| Target (optimum): 150 ms                                  |
+-----------------------------------------------------------+
|  Sparkline (last 60s)                                    |
|  ────▂▃▅█▇▆▅▃▂                                           |
+-----------------------------------------------------------+
|  Knobs influencing this metric:                          |
|   - chunk_ms           (STATION_3)                       |
|   - vad_level          (STATION_3)                       |
|   - jitter_buffer_ms   (STATION_1)                       |
|   - rtp_ptime_ms       (STATION_1)                       |
+-----------------------------------------------------------+
| [✓] High-priority metric for AI                          |
| Custom thresholds:                                       |
|   Warn  > 250 ms                                         |
|   Crit  > 400 ms                                         |
+-----------------------------------------------------------+

Behavior:
	•	User can set “high-priority” so the AI will focus more strongly on this metric.
	•	Custom thresholds override the default ranges from Annex A.

⸻

4.4 Global AI Optimization Panel – Level 1 (Across All Stations)

+-----------------------------------------------------------+
| [▼ Global AI Optimization]                               |
+-----------------------------------------------------------+
| Mode: [Auto ON] [Step-by-step] [Pause]                   |
| Global Wide Audio Graph (all stations mixed)             |
| System Health:                                           |
|  - Stations Online: 6/7                                  |
|  - Max Latency: 320 ms (STATION_4)                       |
|  - Avg MOS: 4.4                                          |
+-----------------------------------------------------------+
| AI Log (multi-station):                                  |
|  12:01:03 ST3 Δchunk_ms 300→250   latency.avg 210→180    |
|  12:01:04 ST1 Δjitter_ms 40→60    packet.loss 1.2→0.7%   |
|  12:01:06 ST4 Δtimeout  3000→2000 latency.max 600→320    |
+-----------------------------------------------------------+
| [Export snapshot] [Download CSV]                         |
+-----------------------------------------------------------+

Modes:
	•	Auto ON – recursive optimization loop runs continuously.
	•	Step-by-step – each iteration triggered manually by the operator.
	•	Pause – stops new iterations but metrics monitoring continues.

⸻

5. Auto-Tuning Loop – Detailed Flow (With AI Engine)

Here מגיע החלק שחשוב לך במיוחד – איך התהליך הרקורסיבי מתבצע “מולי” (מול ה-LLM).

5.1 Verbal Flow
	1.	Data Collection
Every station sends /snapshot with:
	•	metrics (a subset up to all 75 metrics)
	•	knobs (current knob settings)
	2.	Orientation / Deviation Analysis
The monitoring server:
	•	Loads the mapping from Annex A (metric → knobs).
	•	Detects which metrics are out of preferred range.
	•	Computes severity and drift.
	3.	Tuning Recommendation (with AI / ChatGPT)
The AI Optimizer (the LLM – here, ChatGPT / GPT-5.1) receives:
	•	Full state for each station
	•	Metrics deviations
	•	Current knobs (plus legal/preferred ranges)
	•	Global objective: latency / quality / balanced
	•	Past iterations (history)
And returns a list of KnobChange actions with reasoning.
	4.	Apply Changes
The /apply handler:
	•	Sends changes to Asterisk / Gateway / STTTTSserver (via REST/gRPC/AMI/etc.).
	•	Confirms success.
	•	Logs the operation.
	5.	Re-Measurement
After a short window (e.g., 1–3 seconds):
	•	A new snapshot is collected.
	•	Metrics are re-evaluated.
	6.	Recursive Loop Until Convergence
If metrics are still out of target:
	•	Build a new AI request including both previous attempts + new data.
	•	AI adjusts its strategy.
	•	Loop continues, or is stopped after N iterations or stability.

⸻

5.2 Pseudo-Code (Design-Level, Recursive Auto-Tune)

def auto_tune_cycle(global_mode: bool = False):
    # 1. collect snapshots
    snapshots = collect_all_station_snapshots()  # from /snapshot or internal pull

    # 2. build optimization request for AI
    request = {
        "stations": [],
        "goal": "balanced"
    }
    for s in snapshots:
        request["stations"].append({
            "station": s.station_id,
            "metrics": s.metrics,   # dict metric -> value
            "knobs":   s.knobs      # dict knob  -> value
        })

    # 3. call AI optimizer (OpenAI / internal LLM)
    response = call_ai_optimizer(request)

    # 4. apply changes
    for action in response["actions"]:
        station_id = action["station"]
        changes    = action["changes"]   # list of KnobChange
        apply_to_station(station_id, changes)  # calls /apply + underlying control APIs

    # 5. log for UI
    append_to_ai_log(response)

    # 6. schedule next iteration if auto-mode enabled
    if global_mode:
        schedule_next_cycle(delay_seconds=2.0)

In a richer implementation, this is wrapped in a recursive / iterative loop with:
	•	max_depth (max iterations)
	•	convergence_reached(old_snapshots, new_snapshots) logic
	•	oscillation detection (repeated up/down toggling of same knobs)
	•	multi-objective scoring (latency + quality + stability)

The AI optimizer uses Annex A to know:
	•	Which knobs are allowed to move for each metric
	•	How to stay within legal ranges
	•	How to prioritize between latency / quality / system stability

⸻

6. Annex A – Knobs & Metrics Matrix (External XLSX)

All the exact details of:
	•	Which knob belongs to which station
	•	Variable names
	•	Legal and preferred ranges
	•	Installation requirements (DSP, AEC, VAD, Hume SDK, etc.)
	•	Which of the 75 metrics each knob influences

Are contained in the external Excel file:

monitoring_annex_A_full_english.xlsx

With at least two sheets:
	1.	KnobsCatalog – full definition of knobs
	2.	KnobMetricMatrix_75 – explicit Knob × Metric mapping

⸻

7. Status

This document now does include:
	•	The exact ASCII diagrams you pasted
	•	The internal monitoring-server.js diagram
	•	The full OpenAPI 3.1 snippet
	•	The Level 1 / 2 / 3 / Global AI wireframes
	•	And the recursive process with me (the AI) in the loop, explicitly described
