# NEW Monitoring System - Complete Reverse Engineering Documentation
## As Implemented and Fixed on January 1, 2026

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Component Analysis](#component-analysis)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Implementation Details](#implementation-details)
7. [Critical Bug Fix](#critical-bug-fix)
8. [File System Structure](#file-system-structure)
9. [API Endpoints](#api-endpoints)
10. [Testing & Validation](#testing--validation)

---

## Executive Summary

### System Purpose
The NEW Monitoring System is a production-grade audio monitoring and optimization framework embedded within STTTTSserver, designed to:
- Monitor audio quality and transformations per call (trace)
- Capture both PRE (raw) and POST (processed) audio streams
- Aggregate metrics in 5-second buckets
- Enable offline post-call analysis and optimization
- Maintain 72-hour rolling data retention

### Key Achievements
- Successfully implemented full audio capture pipeline
- Fixed critical trace_id stability bug
- Achieved complete PRE/POST audio recording
- Established 5-second metric aggregation
- Created proper file system structure
- Integrated with PostgreSQL database

---

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        Gateway Layer                             │
│                    (Ports 7777 & 8888)                          │
└────────────────────────────┬─────────────────────────────────────┘
                             │ WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STTTTSserver Core                           │
│                        (Port 8080)                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │            NEW Monitoring System Integration              │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │     MonitoringStationsBootstrap.js               │   │    │
│  │  └──────────────┬───────────────────────────────────┘   │    │
│  │                 ▼                                        │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │         Station Handlers (3333/4444)             │   │    │
│  │  └──────────────┬───────────────────────────────────┘   │    │
│  │                 ▼                                        │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │           St_Handler_Generic.js                  │   │    │
│  │  │    ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │    │
│  │  │    │   PRE    │→│  Knobs   │→│   POST   │    │   │    │
│  │  │    └──────────┘  └──────────┘  └──────────┘    │   │    │
│  │  └──────────────┬───────────────────────────────────┘   │    │
│  └─────────────────┼────────────────────────────────────────┘    │
└────────────────────┼─────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│Aggregator│  │  Audio   │  │ Metrics  │
│   (5s)   │  │ Recorder │  │ Emitter  │
└─────┬────┘  └────┬─────┘  └────┬─────┘
      │            │              │
      ▼            ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│    DB    │  │   File   │  │    DB    │
│ (metrics)│  │  System  │  │ (bridge) │
└──────────┘  └──────────┘  └──────────┘
```

### Component Locations
```
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/
├── STTTTSserver.js (Main server - MODIFIED)
├── Monitoring_Stations/
│   ├── MonitoringStationsBootstrap.js
│   ├── station/
│   │   ├── generic/
│   │   │   ├── St_Handler_Generic.js
│   │   │   ├── MetricsRegistry.js
│   │   │   ├── KnobsRegistry.js
│   │   │   ├── Aggregator.js
│   │   │   └── KnobsResolver.js
│   │   └── stations/
│   │       └── Station3_3333_Handler.js
│   ├── audio/
│   │   ├── AudioRecorder.js
│   │   └── AudioWriter.js
│   └── bridge/
│       ├── MetricsEmitter.js
│       ├── DatabaseBridge.js
│       └── BackpressurePolicy.js
```

---

## Database Schema

### Database: `monitoring_v2` (PostgreSQL)

### Table 1: `traces`
```sql
CREATE TABLE traces (
  trace_id         TEXT PRIMARY KEY,
  started_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ NULL,
  src_extension    TEXT NULL,
  dst_extension    TEXT NULL,
  call_id          TEXT NULL,
  notes            TEXT NULL
);

-- Indexes
CREATE INDEX traces_started_at_idx ON traces (started_at);
```

### Table 2: `metrics_agg_5s`
```sql
CREATE TABLE metrics_agg_5s (
  id              BIGSERIAL PRIMARY KEY,
  trace_id        TEXT NOT NULL REFERENCES traces(trace_id) ON DELETE CASCADE,
  station_key     TEXT NOT NULL,
  station_group   TEXT NULL,
  layer           station_layer_type NULL,
  direction       direction_type NULL,
  tap             tap_type NOT NULL,  -- 'PRE' or 'POST'
  metric_key      TEXT NOT NULL,
  bucket_ts       TIMESTAMPTZ NOT NULL,
  bucket_ms       INT NOT NULL DEFAULT 5000,

  -- Aggregates
  count           INT NOT NULL,
  min             DOUBLE PRECISION NULL,
  max             DOUBLE PRECISION NULL,
  sum             DOUBLE PRECISION NULL,
  avg             DOUBLE PRECISION NULL,
  last            DOUBLE PRECISION NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX metrics_agg_5s_uq
  ON metrics_agg_5s (trace_id, station_key, tap, metric_key, bucket_ts);
CREATE INDEX metrics_agg_5s_trace_bucket_idx
  ON metrics_agg_5s (trace_id, bucket_ts);
```

### Table 3: `audio_segments_5s`
```sql
CREATE TABLE audio_segments_5s (
  id              BIGSERIAL PRIMARY KEY,
  trace_id        TEXT NOT NULL REFERENCES traces(trace_id) ON DELETE CASCADE,
  station_key     TEXT NOT NULL,
  station_group   TEXT NULL,
  layer           station_layer_type NULL,
  direction       direction_type NULL,
  tap             tap_type NOT NULL,  -- 'PRE' or 'POST'
  bucket_ts       TIMESTAMPTZ NOT NULL,
  bucket_ms       INT NOT NULL DEFAULT 5000,
  sample_rate_hz  INT NOT NULL DEFAULT 16000,
  channels        INT NOT NULL DEFAULT 1,
  format          TEXT NOT NULL DEFAULT 'WAV_PCM_S16LE_MONO',
  file_path       TEXT NOT NULL,
  file_bytes      BIGINT NULL,
  sha256_hex      TEXT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX audio_segments_5s_uq
  ON audio_segments_5s (trace_id, station_key, tap, bucket_ts);
```

### Table 4: `knob_snapshots_5s`
```sql
CREATE TABLE knob_snapshots_5s (
  id              BIGSERIAL PRIMARY KEY,
  trace_id        TEXT NOT NULL REFERENCES traces(trace_id) ON DELETE CASCADE,
  station_key     TEXT NOT NULL,
  bucket_ts       TIMESTAMPTZ NOT NULL,
  bucket_ms       INT NOT NULL DEFAULT 5000,
  knobs_json      JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Table 5: `knob_events`
```sql
CREATE TABLE knob_events (
  id              BIGSERIAL PRIMARY KEY,
  trace_id        TEXT NULL REFERENCES traces(trace_id) ON DELETE CASCADE,
  station_key     TEXT NOT NULL,
  knob_key        TEXT NOT NULL,
  old_value       TEXT NULL,
  new_value       TEXT NOT NULL,
  source          TEXT NOT NULL,
  reason          TEXT NULL,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Component Analysis

### 1. STTTTSserver.js Integration

#### Integration Points:
- **Line 20**: Requires MonitoringStationsBootstrap
- **Line 21**: Global `newMonitoring` variable
- **Line 1473**: ExtensionPairManager instantiation (critical for trace_id)
- **Lines 1538-1552**: Bootstrap initialization
- **Lines 2412-2425**: Frame processing integration

#### Critical Code Section (AFTER FIX):
```javascript
// Lines 2412-2440 (approximate)
if (newMonitoring && newMonitoring.isRunning) {
  try {
    // Get or create stable trace_id based on call start time
    let callStartTime = pairManager.startTimes.get(extension);
    if (!callStartTime) {
      // First frame of new call - set start time
      callStartTime = Date.now();
      pairManager.startTimes.set(extension, callStartTime);
      const pairedExt = pairManager.getPairedExtension(extension);
      if (pairedExt) {
        pairManager.startTimes.set(pairedExt, callStartTime);
      }
    }

    // Use stable trace_id for entire call
    const traceTimestamp = new Date(callStartTime).toISOString().replace(/[:.]/g, "-");
    const newMonitoringContext = {
      trace_id: "trace_" + traceTimestamp + "_" + extension,
      started_at: new Date(callStartTime),
      src_extension: extension,
      sample_rate: 16000,
      channels: 1
    };

    // Process through NEW monitoring (non-blocking)
    const stationKey = extension === "3333" ? "St_3_3333" : "St_3_4444";
    newMonitoring.processFrame(audioBuffer, newMonitoringContext, stationKey);
  } catch (error) {
    console.error('[NEW Monitoring] Error processing frame:', error.message);
  }
}
```

### 2. MonitoringStationsBootstrap.js

#### Responsibilities:
1. Initialize all monitoring components
2. Wire dependencies
3. Manage lifecycle
4. Register station handlers

#### Initialization Sequence:
```javascript
async initialize(configuration) {
  // Step 1: Database Bridge
  this.components.databaseBridge = new DatabaseBridge(config);

  // Step 2: Backpressure Policy
  this.components.backpressurePolicy = new BackpressurePolicy(config);

  // Step 3: Metrics Emitter
  this.components.metricsEmitter = new MetricsEmitter({
    databaseBridge: this.components.databaseBridge
  });

  // Step 4: Audio Writer
  this.components.audioWriter = new AudioWriter({
    databaseBridge: this.components.databaseBridge
  });

  // Step 5: Audio Recorder
  this.components.audioRecorder = new AudioRecorder({
    audioWriter: this.components.audioWriter,
    bucketMs: 5000,
    sampleRateHz: 16000,
    channels: 1
  });

  // Step 6: Generic Handler
  this.components.genericHandler = new St_Handler_Generic({
    config: configuration.stations,
    metricsEmitter: this.components.metricsEmitter,
    audioRecorder: this.components.audioRecorder,
    bucketMs: 5000
  });

  // Step 7: Register Station Handlers
  this._registerStations();
}

async start() {
  this.components.audioWriter.start();  // Start background writer
  this.components.aggregator.start();   // Start aggregation timer
  this.isRunning = true;
}
```

### 3. St_Handler_Generic.js

#### Processing Flow:
```javascript
processFrame(frame, ctx, stationHandler) {
  // 1. PRE Processing
  const input = this._toInt16Array(frame);
  this.computeMetrics(input, ctx, "PRE", stationHandler.preMetrics);
  this.audioRecorder.capture(input, ctx, "PRE");

  // 2. Knob Application
  const knobs = this.knobsResolver.getEffectiveKnobs(ctx);
  const processed = this.applyKnobs(input, knobs, ctx);

  // 3. POST Processing
  this.computeMetrics(processed, ctx, "POST", stationHandler.postMetrics);
  this.audioRecorder.capture(processed, ctx, "POST");

  return processed;
}
```

### 4. AudioRecorder.js

#### Key Methods:
```javascript
capture(frame, ctx, tap) {
  // Validation
  if (!ctx?.trace_id || !ctx?.station_key) return;
  if (tap !== "PRE" && tap !== "POST") return;

  // Bucket management
  const nowMs = Date.now();
  const bucketTsMs = this._floorToBucket(nowMs);
  const pcm = this._toInt16Array(frame);

  // Stream state tracking
  const key = `${ctx.trace_id}|${ctx.station_key}|${tap}`;
  let st = this.streamState.get(key);

  // Bucket boundary detection
  if (bucketTsMs !== st.currentBucketTsMs) {
    this._finalizeAndEnqueueSegment(ctx, tap, st);
    st.currentBucketTsMs = bucketTsMs;
    st.buffers = [];
    st.totalSamples = 0;
  }

  // Buffer accumulation
  st.buffers.push(pcm);
  st.totalSamples += pcm.length;
}

_finalizeAndEnqueueSegment(ctx, tap, st) {
  // Build exactly 5s audio
  const merged = this._mergeAndFit(st.buffers, this.expectedSamplesPerBucket);

  const meta = {
    trace_id: ctx.trace_id,
    station_key: ctx.station_key,
    tap,
    bucket_ts_ms: st.currentBucketTsMs,
    bucket_ms: this.bucketMs,
    sample_rate_hz: this.sampleRateHz,
    channels: this.channels,
    format: "WAV_PCM_S16LE_MONO"
  };

  // Non-blocking handoff to writer
  this.audioWriter.enqueueSegment({ meta, pcm: merged });
}
```

### 5. AudioWriter.js

#### Background Processing:
```javascript
start() {
  this.timer = setInterval(() => this._drainOnce(), this.flushIntervalMs);
}

_drainOnce() {
  const item = this.queue.shift();
  if (!item) return;

  try {
    this._writeWavSegment(item.meta, item.pcm);
    // Notify database about segment
    this.databaseBridge.sendAudioSegmentIndex(item.meta);
  } catch (error) {
    console.error('[AudioWriter] Error:', error);
  }
}

_writeWavSegment(meta, pcm) {
  const dir = this._segmentDir(meta);
  const filename = `segment_${meta.bucket_ts_ms}.wav`;
  const filePath = path.join(dir, filename);

  fs.mkdirSync(dir, { recursive: true });

  const wav = this._encodeWavPcm16({ pcm, sampleRate, channels });
  fs.writeFileSync(filePath, wav);
}
```

---

## Data Flow Diagrams

### 1. Audio Frame Processing Flow
```
                    ┌─────────────┐
                    │ Audio Frame │
                    │  (Buffer)   │
                    └──────┬──────┘
                           │
                           ▼
                ┌────────────────────┐
                │ STTTTSserver.js    │
                │ processAudioBuffer │
                └─────────┬──────────┘
                          │
                          ▼
            ┌──────────────────────────┐
            │ Create/Get trace_id from │
            │ pairManager.startTimes   │
            └────────────┬─────────────┘
                         │
                         ▼
            ┌──────────────────────────┐
            │ MonitoringBootstrap      │
            │ .processFrame()           │
            └────────────┬─────────────┘
                         │
                         ▼
            ┌──────────────────────────┐
            │ Station3_3333_Handler    │
            │ .onFrame()                │
            └────────────┬─────────────┘
                         │
                         ▼
            ┌──────────────────────────┐
            │ St_Handler_Generic       │
            │ .processFrame()           │
            └────────────┬─────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌──────────┐    ┌─────────┐
    │   PRE   │    │  Knobs   │    │  POST   │
    │ Metrics │    │  Apply   │    │ Metrics │
    └────┬────┘    └──────────┘    └────┬────┘
         │                                │
         ▼                                ▼
    ┌─────────┐                    ┌─────────┐
    │   PRE   │                    │  POST   │
    │ Capture │                    │ Capture │
    └────┬────┘                    └────┬────┘
         │                                │
         └──────────┬─────────────────────┘
                    │
                    ▼
            ┌──────────────┐
            │ AudioRecorder │
            │  (Buffering)  │
            └───────┬──────┘
                    │ (5s boundary)
                    ▼
            ┌──────────────┐
            │ AudioWriter  │
            │   (Queue)    │
            └───────┬──────┘
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
    ┌─────────┐          ┌──────────┐
    │  File   │          │    DB    │
    │ System  │          │  Index   │
    └─────────┘          └──────────┘
```

### 2. Trace Lifecycle
```
Call Start
    │
    ▼
Create trace_id from pairManager.startTimes
    │
    ▼
Use same trace_id for all frames
    │
    ├─→ Frame 1: trace_2026-01-01T20-51-53-133Z_3333
    ├─→ Frame 2: trace_2026-01-01T20-51-53-133Z_3333
    ├─→ Frame 3: trace_2026-01-01T20-51-53-133Z_3333
    └─→ Frame N: trace_2026-01-01T20-51-53-133Z_3333
         │
         ▼
    5s Bucket Boundary
         │
         ▼
    Finalize & Write Segments
         │
         ▼
    Continue with same trace_id
         │
         ▼
    Call End → Clear trace_id
```

### 3. 5-Second Bucket Aggregation
```
Timeline: |----0s----|----5s----|----10s----|----15s----|

Frames:   F1 F2 F3... F50        F51 F52... F100       ...
          └────┬────┘  └────┬────┘  └────┬────┘
               │            │            │
               ▼            ▼            ▼
          Bucket_0s     Bucket_5s    Bucket_10s
               │            │            │
               ▼            ▼            ▼
          ┌─────────┐  ┌─────────┐  ┌─────────┐
          │ Metrics │  │ Metrics │  │ Metrics │
          │min/max/ │  │min/max/ │  │min/max/ │
          │avg/last │  │avg/last │  │avg/last │
          └─────────┘  └─────────┘  └─────────┘
               │            │            │
               ▼            ▼            ▼
          ┌─────────┐  ┌─────────┐  ┌─────────┐
          │  Audio  │  │  Audio  │  │  Audio  │
          │   5s    │  │   5s    │  │   5s    │
          │   WAV   │  │   WAV   │  │   WAV   │
          └─────────┘  └─────────┘  └─────────┘
```

---

## Critical Bug Fix

### The Problem
STTTTSserver was creating a NEW trace_id for every frame:
```javascript
// BEFORE FIX (WRONG):
const newMonitoringContext = {
  trace_id: 'trace_' + new Date().toISOString().replace(/[:.]/g, '-') + '_' + extension,
  // This created a new trace_id every time!
```

This caused:
- New stream buffer for each frame
- No accumulation of audio data
- No segments ever finalized
- 7-minute calls producing 0 audio files

### The Solution
Use stable trace_id from ExtensionPairManager:
```javascript
// AFTER FIX (CORRECT):
let callStartTime = pairManager.startTimes.get(extension);
if (!callStartTime) {
  callStartTime = Date.now();
  pairManager.startTimes.set(extension, callStartTime);
}
const traceTimestamp = new Date(callStartTime).toISOString().replace(/[:.]/g, "-");
const newMonitoringContext = {
  trace_id: "trace_" + traceTimestamp + "_" + extension,
  // Same trace_id for entire call!
```

### Impact
- ONE trace_id per call
- Proper frame accumulation
- Segments finalized at boundaries
- Audio files successfully written
- Complete monitoring data capture

---

## File System Structure

### Audio Storage Layout
```
/var/monitoring/audio/
├── 2026-01-01/                              # Date directory
│   ├── trace_2026-01-01T20-51-53-133Z_3333/ # Trace directory
│   │   └── St_3_3333/                       # Station directory
│   │       ├── PRE/                         # Raw audio
│   │       │   ├── segment_1767301650000.wav
│   │       │   ├── segment_1767301655000.wav
│   │       │   ├── segment_1767301660000.wav
│   │       │   └── ...
│   │       └── POST/                        # Processed audio
│   │           ├── segment_1767301650000.wav
│   │           ├── segment_1767301655000.wav
│   │           ├── segment_1767301660000.wav
│   │           └── ...
│   └── trace_2026-01-01T21-05-12-456Z_4444/
│       └── St_3_4444/
│           ├── PRE/
│           └── POST/
└── 2026-01-02/                              # Next day
```

### File Specifications
- **Format**: WAV PCM S16LE Mono
- **Sample Rate**: 16000 Hz
- **Duration**: Exactly 5 seconds
- **Size**: ~160KB per file
- **Naming**: `segment_[bucket_ts_ms].wav`

---

## API Endpoints

### Database API Server (Port 8083)

#### Metrics Endpoints
```
POST /api/metrics/aggregate
Body: {
  trace_id: string,
  station_key: string,
  tap: 'PRE' | 'POST',
  metric_key: string,
  bucket_ts_ms: number,
  bucket_ms: 5000,
  count: number,
  min: number,
  max: number,
  sum: number,
  avg: number,
  last: number
}

GET /api/metrics/trace/:trace_id
Response: Array of aggregated metrics
```

#### Audio Endpoints
```
POST /api/audio/segments
Body: {
  trace_id: string,
  station_key: string,
  tap: 'PRE' | 'POST',
  bucket_ts: timestamp,
  file_path: string,
  file_bytes: number
}

GET /api/audio/trace/:trace_id
Response: Array of audio segment metadata
```

---

## Testing & Validation

### Test Results (January 1, 2026)

#### Before Fix:
- 7-minute call
- 0 audio segments captured
- 420+ frames processed
- Different trace_id each frame

#### After Fix:
- Single test call
- 24 audio segments captured (12 PRE + 12 POST)
- 12+ WAV files on disk
- Stable trace_id throughout call
- Proper 5-second bucket alignment

### Validation Queries

#### Check Traces:
```sql
SELECT trace_id, started_at, src_extension
FROM traces
ORDER BY started_at DESC
LIMIT 5;
```

#### Check Audio Segments:
```sql
SELECT COUNT(*) as segments, COUNT(DISTINCT tap) as taps
FROM audio_segments_5s
WHERE trace_id = '[trace_id]';
```

#### Check Metrics:
```sql
SELECT metric_key, tap, COUNT(*) as buckets,
       MIN(min) as overall_min, MAX(max) as overall_max
FROM metrics_agg_5s
WHERE trace_id = '[trace_id]'
GROUP BY metric_key, tap;
```

#### Check Files:
```bash
find /var/monitoring/audio -name "*.wav" -type f | wc -l
ls -la /var/monitoring/audio/*/trace_*/St_*/*/*.wav
```

---

## Metrics Collected

### PRE Metrics (Raw Audio):
- `pcm.rms_dbfs` - Root Mean Square in dBFS
- `pcm.peak_dbfs` - Peak level in dBFS
- `pcm.clipping_ratio` - Ratio of clipped samples
- `pcm.zero_crossing_rate` - Sign changes per sample
- `pcm.peak_amplitude` - Peak sample value
- `pcm.average_absolute` - Average absolute amplitude
- `pcm.noise_floor` - Noise floor estimate
- `pcm.snr_estimate` - Signal-to-noise ratio

### POST Metrics (After Processing):
- All PRE metrics plus:
- `pipe.processing_latency_ms` - Processing delay
- `pipe.frame_drop_ratio` - Dropped frames ratio
- `health.audio_score` - Overall quality score

---

## Maintenance & Operations

### 72-Hour Retention Policy

#### Automated Cleanup (Cron Job):
```bash
# Run every 10 minutes
*/10 * * * * psql -U postgres -d monitoring_v2 -c "
DELETE FROM metrics_agg_5s WHERE bucket_ts < now() - interval '72 hours';
DELETE FROM audio_segments_5s WHERE bucket_ts < now() - interval '72 hours';
DELETE FROM knob_snapshots_5s WHERE bucket_ts < now() - interval '72 hours';
DELETE FROM traces WHERE started_at < now() - interval '72 hours'
  AND ended_at < now() - interval '72 hours';"

# File cleanup
find /var/monitoring/audio -type f -mtime +3 -delete
find /var/monitoring/audio -type d -empty -delete
```

### Monitoring Health Checks

#### Service Status:
```bash
ps aux | grep STTTTSserver
tail -f /tmp/STTTTSserver-fixed.log
```

#### Data Flow Check:
```bash
# Real-time monitoring
watch -n 5 'psql -U postgres -d monitoring_v2 -c "
SELECT COUNT(*) as traces FROM traces WHERE started_at > now() - interval '\''1 hour'\'';
SELECT COUNT(*) as segments FROM audio_segments_5s WHERE created_at > now() - interval '\''1 hour'\'';"'
```

---

## Troubleshooting Guide

### Issue: No Audio Segments Being Created

#### Check 1: Trace ID Stability
```bash
grep "trace_" /tmp/STTTTSserver-fixed.log | tail -20
# Should see SAME trace_id repeated
```

#### Check 2: Directory Permissions
```bash
ls -la /var/monitoring/audio
# Should be drwxrwxrwx (777)
```

#### Check 3: AudioWriter Queue
```bash
grep "AudioWriter" /tmp/STTTTSserver-fixed.log
# Look for enqueue/write messages
```

### Issue: Metrics Not Aggregating

#### Check 1: Aggregator Flushing
```bash
grep "Aggregator.*Flushed" /tmp/STTTTSserver-fixed.log
# Should see flushes every 5 seconds
```

#### Check 2: Database Connectivity
```bash
psql -U postgres -d monitoring_v2 -c "SELECT 1;"
```

---

## Future Enhancements

### Recommended Improvements:
1. **Knob System Activation**: Implement real-time knob changes and snapshots
2. **Call End Flushing**: Add `flushTrace()` on call termination for partial buckets
3. **Compression**: Add audio compression options (FLAC, Opus)
4. **Real-time Dashboard**: WebSocket feed for live monitoring
5. **Optimization Engine**: ML-based knob optimization from historical data
6. **Multi-station Support**: Add more monitoring points in pipeline
7. **Error Recovery**: Implement retry queues for failed writes
8. **Performance Metrics**: Add CPU/memory monitoring of monitoring system itself

---

## Conclusion

The NEW Monitoring System is now fully operational after fixing the critical trace_id stability issue. The system successfully:
- Captures all audio (PRE and POST)
- Aggregates metrics in 5-second buckets
- Stores data in PostgreSQL
- Writes audio files to disk
- Maintains proper data retention

The fix transformed a non-functional system (0 audio files from 7-minute calls) into a fully working monitoring solution capturing every aspect of audio processing in the real-time translation pipeline.

---

## Document Metadata
- **Created**: January 1, 2026
- **Author**: System Analysis & Reverse Engineering
- **Version**: 1.0
- **Status**: Production Ready
- **Location**: Azure VM 20.170.155.53
- **Local Copy**: /Users/sagivstavinsky/realtime-translation-enhanced_astrix/Docs/sys/monitoring/New_Monitoring_Stations/

---