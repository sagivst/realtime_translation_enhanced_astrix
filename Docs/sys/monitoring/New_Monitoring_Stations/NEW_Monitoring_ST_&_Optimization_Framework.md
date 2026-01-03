

NEW STTTTSserver – Audio Monitoring & Optimization Framework

Full Engineering Specification (MANDATORY IMPLEMENTATION)

Version: Initial Production Baseline

⸻

1. Purpose and Design Intent

This document defines a mandatory, deterministic, production-grade audio monitoring and optimization framework embedded inside STTTTSserver.

The system is designed to:
	•	Monitor audio quality, behavior, and transformations per call (trace)
	•	Support offline, post-call optimization and analysis
	•	Provide full observability into:
	•	Raw incoming audio
	•	Audio after processing and knob application
	•	Ensure absolute safety of the real-time audio path
	•	Avoid historical data dependency beyond a 72-hour rolling window
	•	Maintain a single, uniform data model across all monitoring stations

This document is prescriptive.
No alternative architectures, partial implementations, or deviations are permitted.

⸻

2. Fundamental Architectural Principles (Non-Negotiable)
	1.	The real-time audio pipeline MUST NEVER block
	2.	Monitoring MUST be transparent to audio latency
	3.	All monitoring logic MUST be isolated from I/O
	4.	PRE and POST audio streams are mandatory
	5.	All audio MUST be captured (no conditional capture)
	6.	All metrics and knobs MUST be registry-defined
	7.	Aggregation interval is fixed at 5 seconds
	8.	Retention period is fixed at 72 hours
	9.	Station logic is declarative, not procedural
	10.	Generic logic is centralized and reused

⸻

3. Conceptual Model

The system operates on the following conceptual layers:

3.1 Audio Plane
	•	PCM frames (e.g., 20ms)
	•	Continuous, real-time
	•	Latency-critical

3.2 Monitoring Plane
	•	Forked audio (PRE / POST)
	•	Metric computation
	•	Audio capture
	•	Aggregation

3.3 Control Plane
	•	Knobs definition
	•	Knobs application
	•	Optimization (offline)

3.4 Persistence Plane
	•	Aggregated metrics
	•	Audio segments
	•	Metadata only
	•	72h rolling retention

⸻

4. Mandatory Directory Root

All monitoring-related code MUST reside under:

STTTTSserver/Monitoring_Stations/

No monitoring code is allowed elsewhere.

⸻

5. Mandatory Directory Structure

STTTTSserver/
└── Monitoring_Stations/
    ├── station/
    │   ├── generic/
    │   │   ├── St_Handler_Generic.js
    │   │   ├── MetricsRegistry.js
    │   │   ├── KnobsRegistry.js
    │   │   ├── Aggregator.js
    │   │   ├── KnobsResolver.js
    │   │   └── StationContext.js
    │   │
    │   └── stations/
    │       ├── Station3_3333_Handler.js
    │       ├── Station3_4444_Handler.js
    │       └── ...
    │
    ├── config/
    │   ├── Station3Handler.json
    │   └── monitoring.defaults.json
    │
    ├── audio/
    │   ├── AudioRecorder.js
    │   ├── AudioWriter.js
    │   └── AudioSegmentIndex.js
    │
    ├── bridge/
    │   ├── MetricsEmitter.js
    │   ├── DatabaseBridge.js
    │   └── BackpressurePolicy.js
    │
    └── MonitoringStationsBootstrap.js


⸻

6. Bootstrap Sequence (MANDATORY)

MonitoringStationsBootstrap.js is the only entry point.

Responsibilities
	1.	Load all configuration files
	2.	Load and validate KnobsRegistry
	3.	Load and validate MetricsRegistry
	4.	Validate all knob values (fail fast)
	5.	Initialize the Generic Handler
	6.	Register all Station Handlers
	7.	Initialize aggregation timers (5s)
	8.	Start async audio writers
	9.	Start MetricsEmitter flush loop

Failure at any validation step MUST abort startup.

⸻

7. Station Handlers (Thin, Declarative)

Purpose

Station Handlers:
	•	Define where measurement occurs
	•	Define what is measured
	•	Define identity and context
	•	Perform NO computation

They are configuration adapters, not engines.

⸻

7.1 Mandatory Station Handler Contract

Each station handler MUST define:
	•	station_key
	•	station_group
	•	direction
	•	preMetrics[]
	•	postMetrics[]
	•	onFrame(...)

⸻

7.2 Example: Station3_3333_Handler.js

export const Station3_3333_Handler = {
  stationKey: "St_3_3333",
  stationGroup: "STTTTS_PCM_INGRESS",
  direction: "RX",

  preMetrics: [
    "pcm.rms_dbfs",
    "pcm.peak_dbfs",
    "pcm.clipping_ratio",
    "pcm.zero_crossing_rate"
  ],

  postMetrics: [
    "pcm.rms_dbfs",
    "pcm.peak_dbfs",
    "pcm.clipping_ratio",
    "pipe.processing_latency_ms",
    "pipe.frame_drop_ratio"
  ],

  onFrame(frame, ctx, genericHandler) {
    genericHandler.processFrame(
      frame,
      {
        ...ctx,
        station_key: this.stationKey,
        station_group: this.stationGroup,
        direction: this.direction
      },
      this
    );
  }
};


⸻

8. Generic Handler – Core Engine

File

station/generic/St_Handler_Generic.js

Responsibilities
	•	Execute PRE fork
	•	Apply knobs (memory-only)
	•	Execute POST fork
	•	Forward audio downstream
	•	Send audio to recorder
	•	Forward metrics to aggregator

⸻

8.1 Mandatory Processing Flow

processFrame(frame, ctx, stationHandler) {
  // PRE measurement
  this.computeMetrics(frame, ctx, "PRE", stationHandler.preMetrics);

  // Resolve and apply knobs
  const knobs = this.knobsResolver.resolve(ctx);
  const processedFrame = this.applyKnobs(frame, knobs, ctx);

  // POST measurement
  this.computeMetrics(
    processedFrame,
    ctx,
    "POST",
    stationHandler.postMetrics
  );

  // Always capture audio
  this.audioRecorder.capture(processedFrame, ctx, "POST");

  return processedFrame;
}


⸻

9. Two Audio Streams (MANDATORY)

PRE Stream
	•	Raw PCM as received
	•	Used for baseline analysis
	•	Captured to disk
	•	Metrics computed

POST Stream
	•	After knob application
	•	Represents “actual delivered audio”
	•	Captured to disk
	•	Metrics computed

PRE and POST streams MUST be preserved independently.

⸻

10. MetricsRegistry – Canonical Metric Definitions

Purpose

MetricsRegistry.js is the single authoritative definition of all metrics.

It defines:
	•	Metric name (canonical key)
	•	Units
	•	Data type
	•	Whether real-time safe
	•	Compute function

⸻

Example (Expanded)

export const MetricsRegistry = {

  "pcm.rms_dbfs": {
    unit: "dBFS",
    type: "float",
    realtimeSafe: true,
    compute: frame => computeRmsDbfs(frame)
  },

  "pcm.clipping_ratio": {
    unit: "ratio",
    type: "float",
    realtimeSafe: true,
    compute: frame => computeClippingRatio(frame)
  },

  "pcm.zero_crossing_rate": {
    unit: "hz",
    type: "float",
    realtimeSafe: true,
    compute: frame => computeZCR(frame)
  },

  "pipe.processing_latency_ms": {
    unit: "ms",
    type: "float",
    realtimeSafe: true,
    compute: (_, ctx) => ctx.processing_latency_ms
  }
};

Only metrics listed here MAY be used.

⸻

11. KnobsRegistry – Canonical Control Surface

Purpose

Defines all tunable parameters and guarantees safety.

Defines:
	•	Type
	•	Legal range
	•	Default value
	•	Live applicability
	•	Application stage

⸻

Example (Expanded)

export const KnobsRegistry = {

  "pcm.input_gain_db": {
    type: "float",
    min: -24,
    max: 24,
    default: 0,
    liveApply: true,
    appliesAt: "PRE_PROCESSING"
  },

  "pcm.limiter_threshold_dbfs": {
    type: "float",
    min: -30,
    max: -1,
    default: -6,
    liveApply: true,
    appliesAt: "DYNAMICS_STAGE"
  },

  "vad.energy_threshold": {
    type: "float",
    min: -80,
    max: -20,
    default: -45,
    liveApply: true,
    appliesAt: "VAD_STAGE"
  }
};


⸻

12. Aggregation (FIXED 5 Seconds)

File

Aggregator.js
	•	Metrics aggregated into 5-second buckets
	•	Aggregation is per:
	•	trace_id
	•	station_key
	•	tap
	•	metric_key

Aggregates Produced
	•	count
	•	min
	•	max
	•	avg
	•	last

⸻

13. MetricsEmitter – Asynchronous Boundary

Purpose

MetricsEmitter is a fire-and-forget boundary.
	•	Buffers aggregated metrics
	•	Applies backpressure rules
	•	Sends in batches
	•	NEVER blocks audio

⸻

14. DatabaseBridge
	•	Responsible for transport only
	•	No logic
	•	No aggregation
	•	No retries beyond policy

Endpoints example:

POST /api/metrics/aggregate
POST /api/audio/segments


⸻

15. Audio Capture (Always On)

Format
	•	PCM S16LE
	•	16 kHz
	•	Mono

Structure

/audio/YYYY-MM-DD/
  └── trace_id/
      └── station_key/
          ├── PRE/
          └── POST/

Segments are time-aligned with aggregation windows.

⸻

16. Retention Policy (MANDATORY)

Data Type	Retention
Audio (PRE/POST)	72 hours
Aggregated Metrics	72 hours
Knob Snapshots	72 hours

Automatic cleanup MUST be enforced.

⸻

17. Why This Design Is Final
	•	Deterministic
	•	Observable
	•	Safe
	•	Debuggable
	•	Offline-optimizable
	•	Scales with stations
	•	Does not leak complexity

⸻

18. Final Statement

This document defines a complete, closed, and mandatory implementation.

Any deviation:
	•	breaks observability
	•	breaks optimization
	•	risks audio quality
	•	is not acceptable

⸻

אם תרצה, השלב הבא (טבעי) הוא:
	•	Appendix A – End-to-end call trace example
	•	Appendix B – Before/After optimization run
	•	Appendix C – Full DB schema
	•	Appendix D – API payload schemas (JSON)