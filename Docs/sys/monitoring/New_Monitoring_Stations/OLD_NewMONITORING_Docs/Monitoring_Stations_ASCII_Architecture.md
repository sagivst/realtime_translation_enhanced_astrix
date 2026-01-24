================================================================================
STTTTSserver Monitoring_Stations – Detailed ASCII Architecture
(with worker queues, threads, and non-blocking boundaries)
================================================================================

LEGEND
------
[MAIN]        = STTTTSserver realtime / latency-critical path (MUST NOT BLOCK)
[ASYNC]       = Non-realtime async workers (allowed to block internally)
Queue(...)    = Bounded queue (drop policy applies on overflow)
T#            = Worker thread / background loop (Node Worker Thread or process)
tap=PRE/POST  = Two mandatory audio streams
bucket=5s     = Fixed aggregation window = 5 seconds


================================================================================
1) AUDIO INGEST + TWO TAPS (PRE/POST) + MAIN PIPELINE
================================================================================

                   (PCM over WebSocket / stream frames, e.g. 20ms)
Gateway  ───────────────────────────────────────────────────────────────────►  STTTTSserver

                                   ┌───────────────────────────────────────────────┐
                                   │ [MAIN] PCM Ingress Hook (per extension/trace) │
                                   │  - frame_ms=20                                 │
                                   │  - sample_rate=16kHz                           │
                                   └───────────────┬───────────────────────────────┘
                                                   │
                                                   ▼
                            ┌───────────────────────────────────────────────┐
                            │ [MAIN] StationX_Handler (thin adapter)         │
                            │  - station_key: St_3_3333 / St_3_4444 ...       │
                            │  - preMetrics[] / postMetrics[]                 │
                            └───────────────┬───────────────────────────────┘
                                            │ forwards frame + ctx
                                            ▼
                 ┌────────────────────────────────────────────────────────────────┐
                 │ [MAIN] St_Handler_Generic (core engine)                         │
                 │                                                                │
                 │  (A) PRE TAP (raw input)                                       │
                 │   - compute preMetrics (realtime-safe only)                    │
                 │   - enqueue PRE audio segment frames (ALWAYS)                  │
                 │                                                                │
                 │  (B) APPLY KNOBS (in-memory effective knobs)                   │
                 │   - apply gain/limiter/smoothing/VAD params as implemented     │
                 │                                                                │
                 │  (C) POST TAP (processed output)                               │
                 │   - compute postMetrics (realtime-safe only)                   │
                 │   - enqueue POST audio segment frames (ALWAYS)                 │
                 │                                                                │
                 │  (D) FORWARD processed frame to main STTTTS pipeline           │
                 └───────────────┬───────────────────────────────┬───────────────┘
                                 │                               │
                                 │ processed PCM                 │ metric samples
                                 ▼                               ▼
            ┌───────────────────────────────┐        ┌───────────────────────────────┐
            │ [MAIN] Main STTTTS pipeline   │        │ [MAIN] Aggregator.addSample() │
            │  (STT/TTS/etc.)               │        │  - buckets fixed to 5 seconds │
            └───────────────────────────────┘        └───────────────┬───────────────┘
                                                                     (flush each 5s)
                                                                              │
                                                                              ▼


================================================================================
2) METRICS AGGREGATION (5s) → METRICS EMISSION (ASYNC)
================================================================================

                     ┌────────────────────────────────────────────────────────┐
                     │ [MAIN] Aggregator (in-memory, per bucket=5s)           │
                     │  Keyed by:                                             │
                     │   - trace_id, station_key, tap(PRE/POST), metric_key   │
                     │  Produces (per 5s bucket):                             │
                     │   - count, min, max, avg, last                         │
                     └───────────────────────┬────────────────────────────────┘
                                             │ (every 5 seconds)
                                             ▼
                     ┌────────────────────────────────────────────────────────┐
                     │ [MAIN] MetricsEmitter.emitBatch(aggBatch)              │
                     │  - MUST NOT BLOCK                                       │
                     │  - pushes to bounded queue                              │
                     └───────────────────────┬────────────────────────────────┘
                                             │
                              Queue(METRICS_OUT, bounded, drop-oldest)
                                             │
                                             ▼
                     ┌────────────────────────────────────────────────────────┐
                     │ [ASYNC] T1: MetricsEmitter Flush Worker                 │
                     │  loop interval: 200ms                                   │
                     │   - pop batch                                            │
                     │   - DatabaseBridge.sendAggregatedMetrics(batch)          │
                     │   - on failure: requeue (bounded) + backoff             │
                     └───────────────────────┬────────────────────────────────┘
                                             │
                                             ▼
                     ┌────────────────────────────────────────────────────────┐
                     │ [ASYNC] DatabaseBridge (transport only)                 │
                     │  - POST /api/metrics/aggregate                          │
                     │  - retries per policy                                   │
                     └───────────────────────┬────────────────────────────────┘
                                             │
                                             ▼
                     ┌────────────────────────────────────────────────────────┐
                     │ database-api-server                                     │
                     │  - persists 72h (TTL)                                   │
                     └────────────────────────────────────────────────────────┘


================================================================================
3) AUDIO CAPTURE (PRE + POST ALWAYS) → ASYNC WRITER
================================================================================

From St_Handler_Generic, both taps enqueue audio frames to recorder:

   PRE frames  ──► AudioRecorder.capture(frame, ctx, tap=PRE)
   POST frames ──► AudioRecorder.capture(frame, ctx, tap=POST)

                     ┌────────────────────────────────────────────────────────┐
                     │ [MAIN] AudioRecorder                                    │
                     │  - DOES NOT WRITE TO DISK                               │
                     │  - segments frames aligned to bucket=5s                 │
                     │  - builds segment buffers & metadata                    │
                     └───────────────────────┬────────────────────────────────┘
                                             │
                         Queue(AUDIO_SEGMENTS_OUT, bounded, drop-oldest*)
                                             │
                                             ▼
                     ┌────────────────────────────────────────────────────────┐
                     │ [ASYNC] T2: AudioWriter Worker                          │
                     │  - pops completed segments (5s each)                     │
                     │  - writes PCM/WAV to disk                                │
                     │  - emits segment index metadata to DB bridge             │
                     └───────────────────────┬────────────────────────────────┘
                                             │
                                             │ files
                                             ▼
                     ┌────────────────────────────────────────────────────────┐
                     │ Local Storage (72h rolling)                              │
                     │  /var/monitoring/audio/YYYY-MM-DD/<trace_id>/...         │
                     │   ├── St_3_3333/PRE/segment_<ts>.wav                     │
                     │   └── St_3_3333/POST/segment_<ts>.wav                    │
                     └────────────────────────────────────────────────────────┘

                                             │ metadata (no audio bytes)
                                             ▼
                     ┌────────────────────────────────────────────────────────┐
                     │ [ASYNC] DatabaseBridge.sendAudioSegmentIndex(meta)       │
                     │  - POST /api/audio/segments                              │
                     └────────────────────────────────────────────────────────┘

* Drop policy MUST NEVER affect realtime audio.
  If AUDIO queue is full, drop oldest segments; do not block.


================================================================================
4) CONTROL SURFACE: CONFIG + REGISTRIES + EFFECTIVE KNOBS
================================================================================

Startup:
  - load config/Station3Handler.json
  - validate knobs against KnobsRegistry (fail-fast)
  - validate metrics keys exist in MetricsRegistry (fail-fast)

Runtime:
  - knobsResolver.resolve(ctx) returns effective knobs from memory
  - no disk/db calls in [MAIN] path

                     ┌────────────────────────────────────────────────────────┐
                     │ MonitoringStationsBootstrap.js                           │
                     │  - load config                                            │
                     │  - validate knobs via KnobsRegistry                       │
                     │  - init Generic Handler                                   │
                     │  - register Station handlers                              │
                     │  - start T1 (metrics) + T2 (audio) workers                │
                     └────────────────────────────────────────────────────────┘

                     ┌────────────────────────────────────────────────────────┐
                     │ MetricsRegistry.js / KnobsRegistry.js                    │
                     │  - single source of truth (definitions only)             │
                     └────────────────────────────────────────────────────────┘

                     ┌────────────────────────────────────────────────────────┐
                     │ KnobsResolver.js                                         │
                     │  - baseline knobs from Station3Handler.json              │
                     │  - (future) runtime overrides in-memory                  │
                     │  - returns effective knob map per ctx                    │
                     └────────────────────────────────────────────────────────┘


================================================================================
5) THREADS / WORKERS SUMMARY (MANDATORY)
================================================================================

[MAIN] STTTTSserver event loop:
  - receives PCM frames
  - runs Station handler + Generic handler
  - computes realtime-safe metrics
  - enqueues metrics batches and audio segments (non-blocking)

[ASYNC] T1 Metrics Flush Worker:
  - sends aggregated metrics to DatabaseBridge/database-api-server

[ASYNC] T2 Audio Writer Worker:
  - writes PRE and POST 5-second segments to disk
  - sends segment index metadata to database-api-server

All queues MUST be bounded and MUST drop-oldest on overflow.
No queue operation may block the [MAIN] path.

================================================================================
END
================================================================================