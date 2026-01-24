# Component Architecture Documentation

## Core Components

### 1. MonitoringStationsBootstrap.js

**Purpose**: Main orchestrator and dependency injection container for the monitoring system.

**Location**: `/Monitoring_Stations/MonitoringStationsBootstrap.js`

**Key Responsibilities**:
- Initialize all monitoring components in correct order
- Wire dependencies between components
- Manage component lifecycle (start/stop)
- Handle graceful shutdown
- Schedule retention cleanup

**Class Structure**:
```javascript
class MonitoringStationsBootstrap {
  constructor()
  async initialize(config = {})
  async start()
  async stop()
  processFrame(frame, ctx, stationKey = "St_3_3333")
  updateKnob(key, value, source = "manual")
  getStats()

  // Private methods
  _loadConfiguration(overrides = {})
  _registerStations()
  _setupCleanupHandlers()
  _scheduleRetentionCleanup()
  _startStatsReporting()
  _reportFinalStats()
  _deepMerge(...objects)
}
```

**Initialization Order**:
1. Load configuration
2. Initialize DatabaseBridge
3. Initialize MetricsEmitter
4. Initialize AudioWriter
5. Initialize AudioRecorder
6. Initialize Generic Handler
7. Register Station Handlers
8. Setup cleanup handlers
9. Schedule retention cleanup

**Singleton Pattern**:
```javascript
export function getMonitoringBootstrap() {
  if (!instance) {
    instance = new MonitoringStationsBootstrap();
  }
  return instance;
}
```

---

### 2. St_Handler_Generic.js

**Purpose**: Base handler class for all station-specific implementations.

**Location**: `/Monitoring_Stations/station/generic/St_Handler_Generic.js`

**Key Features**:
- Manages metrics and knobs registries
- Handles frame processing pipeline
- Coordinates with Aggregator for 5-second buckets
- Manages audio recording taps (PRE/POST)

**Class Structure**:
```javascript
class St_Handler_Generic {
  constructor({ config, metricsEmitter, audioRecorder, bucketMs = 5000 })

  // Station Management
  registerStation(StationHandlerClass)
  start()
  stop()

  // Registry Access
  getMetricsRegistry()
  getKnobsRegistry()

  // Knob Management
  updateKnobForStation(stationKey, knobKey, value, source)
  getKnobValue(stationKey, knobKey)
  getResolvedKnobs(stationKey)

  // Metrics Collection
  recordMetric(stationKey, tap, metricKey, value, timestamp)
  recordMetricBatch(stationKey, tap, metrics, timestamp)

  // Processing Pipeline
  process(frame, ctx, stationKey, tap = "PRE")
}
```

**Station Registration**:
- Dynamically registers station-specific handlers
- Each station gets its own knob resolver
- Maintains station handlers map

---

### 3. DatabaseBridge.js

**Purpose**: Interface to PostgreSQL database with automatic trace creation.

**Location**: `/Monitoring_Stations/bridge/DatabaseBridge.js`

**Critical Feature**: **Automatic Trace Creation**
```javascript
// Lines 127-169: CRITICAL - Auto-creates traces before inserting metrics
async sendAggregatedMetrics(batch) {
  // IMPORTANT: Ensure all traces exist first!
  const uniqueTraces = new Set();
  const traceContexts = new Map();

  // Collect unique traces from batch
  for (const metric of batch) {
    if (metric.trace_id && !uniqueTraces.has(metric.trace_id)) {
      uniqueTraces.add(metric.trace_id);
      traceContexts.set(metric.trace_id, {
        started_at: new Date(),
        src_extension: metric.station_key?.includes('3333') ? '3333' : '4444',
        dst_extension: metric.station_key?.includes('3333') ? '4444' : '3333',
        call_id: metric.trace_id,
        sample_rate: 16000,
        channels: 1
      });
    }
  }

  // Create all traces first (prevents foreign key violations)
  for (const [traceId, ctx] of traceContexts) {
    await client.query(
      'INSERT INTO traces (...) VALUES (...) ON CONFLICT (trace_id) DO NOTHING',
      [traceId, ctx.started_at, ...]
    );
  }
}
```

**Methods**:
- `testConnection()` - Verify database connectivity
- `upsertTrace(traceData)` - Insert/update trace (unused but available)
- `sendAggregatedMetrics(batch)` - Bulk insert metrics with auto trace creation
- `sendAudioSegmentIndex(segmentData)` - Index audio segments
- `saveKnobSnapshot(snapshotData)` - Save knob configurations
- `logKnobEvent(eventData)` - Log knob changes
- `runRetentionCleanup()` - Delete old data (>72 hours)
- `getDatabaseStats()` - Query database statistics
- `getKnobHistory(traceId, limitHours)` - Retrieve knob change history
- `getKnobSnapshots(stationKey, limitHours)` - Get knob snapshots

**Connection Pool Configuration**:
```javascript
{
  host: "localhost",
  port: 5432,
  database: "monitoring_v2",
  user: "monitoring_user",
  password: "monitoring_pass",
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
}
```

---

### 4. MetricsEmitter.js

**Purpose**: Asynchronous batch processor for metrics with backpressure handling.

**Location**: `/Monitoring_Stations/bridge/MetricsEmitter.js`

**Key Features**:
- Bounded queue with configurable max size (default: 10000)
- Batch flushing at intervals (default: 200ms)
- Backpressure detection and handling
- Automatic requeue on failure

**Class Structure**:
```javascript
class MetricsEmitter {
  constructor({ databaseBridge, maxQueueSize = 10000, flushIntervalMs = 200, batchSize = 100 })

  start()
  stop()
  emitBatch(batch)  // Non-blocking batch addition

  // Private methods
  _enqueue(item)
  _flushBatch()
  _flushAll()
  getStats()
}
```

**Backpressure Handling**:
- Monitors queue size
- Triggers warning at 80% capacity
- Drops oldest items if queue full
- Requeues failed batches if space available

---

### 5. Aggregator.js

**Purpose**: Aggregates metrics into 5-second buckets.

**Location**: `/Monitoring_Stations/station/generic/Aggregator.js`

**Key Features**:
- Time-based bucket alignment (5-second boundaries)
- Statistical aggregation (min, max, sum, avg, count)
- Automatic flush on bucket completion
- Knob snapshot capture per bucket

**Aggregation Logic**:
```javascript
class Aggregator {
  constructor({ bucketMs = 5000, onFlush })

  aggregate(trace_id, station_key, tap, metric_key, value, timestamp)
  flush(bucketKey, forceFlush = false)

  // Bucket Management
  _getBucketKey(timestamp)
  _createBucket(bucketKey, trace_id, station_key)
  _aggregateValue(bucket, tap, metric_key, value)
}
```

**Bucket Structure**:
```javascript
{
  trace_id: "trace_2026-01-12T21-08-07-177Z_3333",
  station_key: "St_3_3333",
  bucket_ts_ms: 1736714285000,  // Aligned to 5-second boundary
  bucket_ms: 5000,
  metrics: {
    PRE: { metric_key: { count, min, max, sum, avg, last } },
    POST: { metric_key: { count, min, max, sum, avg, last } }
  }
}
```

---

### 6. AudioRecorder.js

**Purpose**: Captures and buffers audio frames for recording.

**Location**: `/Monitoring_Stations/audio/AudioRecorder.js`

**Key Features**:
- Dual-tap recording (PRE/POST processing)
- 5-second bucket alignment
- WAV header generation
- Asynchronous write via AudioWriter

**Class Structure**:
```javascript
class AudioRecorder {
  constructor({ audioWriter, bucketMs = 5000, sampleRateHz = 16000, channels = 1 })

  capture(trace_id, station_key, tap, frame, timestamp, ctx = {})
  stop()
  getState()

  // Private methods
  _getBucketKey(timestamp)
  _flushBucket(bucketKey)
  _createWavHeader(pcmLength)
}
```

---

### 7. AudioWriter.js

**Purpose**: Writes audio segments to disk and indexes in database.

**Location**: `/Monitoring_Stations/audio/AudioWriter.js`

**Key Features**:
- Asynchronous file writing
- SHA256 hash generation for integrity
- Database indexing via DatabaseBridge
- Configurable base directory

**Class Structure**:
```javascript
class AudioWriter {
  constructor({ databaseBridge, baseDir = "/var/monitoring/audio", maxQueue = 5000 })

  start()
  stop()
  writeSegment(segmentData)
  getStats()

  // Private methods
  _processQueue()
  _writeFile(segmentData)
  _indexSegment(segmentData)
}
```

**File Path Structure**:
```
/var/monitoring/audio/
└── traces/
    └── {trace_id}/
        └── {station_key}/
            └── {tap}/
                └── {bucket_ts}.wav
```

---

### 8. MetricsRegistry.js

**Purpose**: Defines all available metrics and their properties.

**Location**: `/Monitoring_Stations/station/generic/MetricsRegistry.js`

**Metric Categories**:
1. **Core PCM Metrics** (realtime)
   - `pcm.amplitude_peak`
   - `pcm.amplitude_rms`
   - `pcm.zero_crossing_rate`
   - `pcm.dynamic_range_db`

2. **Voice Activity Metrics** (non-realtime)
   - `voice.is_active`
   - `voice.activity_ratio`
   - `voice.segment_duration_ms`

3. **Quality Metrics** (non-realtime)
   - `quality.signal_to_noise_ratio`
   - `quality.noise_floor_dbfs`
   - `quality.clipping_ratio`

4. **Latency Metrics** (realtime)
   - `latency.ingress_gateway_delta`
   - `latency.egress_buffer_ms`
   - `latency.processing_ms`

**Metric Definition Structure**:
```javascript
{
  key: "pcm.amplitude_rms",
  type: "gauge",
  unit: "linear",
  range: { min: 0, max: 32768 },
  description: "Root Mean Square amplitude",
  realtime: true,
  aggregation: "avg"
}
```

---

### 9. KnobsRegistry.js

**Purpose**: Defines all configurable parameters (knobs) and their constraints.

**Location**: `/Monitoring_Stations/station/generic/KnobsRegistry.js`

**Knob Categories**:
1. **Audio Processing**
   - `pcm.input_gain_db` (-20 to +20 dB)
   - `pcm.output_gain_db` (-20 to +20 dB)
   - `pcm.normalize_enabled` (boolean)

2. **Voice Activity Detection**
   - `vad.enabled` (boolean)
   - `vad.threshold_db` (-60 to 0 dB)
   - `vad.pre_buffer_ms` (0 to 500 ms)

3. **Noise Reduction**
   - `noise.reduction_enabled` (boolean)
   - `noise.reduction_level` (0 to 100)
   - `noise.gate_threshold_db` (-60 to 0 dB)

4. **Compression/Limiting**
   - `compressor.enabled` (boolean)
   - `compressor.threshold_dbfs` (-40 to 0 dB)
   - `compressor.ratio` (1 to 20)
   - `limiter.enabled` (boolean)
   - `limiter.threshold_dbfs` (-10 to 0 dB)

**Knob Definition Structure**:
```javascript
{
  key: "pcm.input_gain_db",
  type: "number",
  range: { min: -20, max: 20 },
  default: 0,
  unit: "dB",
  description: "Input gain adjustment in decibels",
  category: "audio",
  affects: ["amplitude", "clipping"],
  validation: "range"
}
```

---

### 10. Station Handlers

**Station3_3333_Handler.js & Station3_4444_Handler.js**

**Purpose**: Station-specific implementations for extensions 3333 and 4444.

**Location**: `/Monitoring_Stations/station/stations/`

**Class Structure**:
```javascript
class Station3_3333_Handler {
  static stationKey = "St_3_3333";
  static stationGroup = "translation";
  static layer = 3;
  static direction = "bidirectional";

  constructor(genericHandler) {
    this.genericHandler = genericHandler;
  }

  onFrame(frame, ctx, parentHandler) {
    // Custom processing logic
    // Calls parentHandler.process() with PRE/POST taps
    return processedFrame;
  }
}
```

**Processing Pipeline**:
1. PRE tap - Before audio processing
2. Custom station logic
3. POST tap - After audio processing
4. Return processed frame

---

## Component Interaction Flow

```
1. UDP Audio → STTTTSserver.js
2. STTTTSserver → MonitoringBootstrap.processFrame()
3. MonitoringBootstrap → Station Handler.onFrame()
4. Station Handler → St_Handler_Generic.process()
5. St_Handler_Generic → Aggregator.aggregate()
6. St_Handler_Generic → AudioRecorder.capture()
7. Aggregator → MetricsEmitter.emitBatch() (every 5 seconds)
8. AudioRecorder → AudioWriter.writeSegment()
9. MetricsEmitter → DatabaseBridge.sendAggregatedMetrics()
10. AudioWriter → DatabaseBridge.sendAudioSegmentIndex()
11. DatabaseBridge → PostgreSQL Database
```

## Error Handling

All components implement try-catch blocks with:
- Graceful degradation
- Error logging
- Non-blocking operation
- Automatic retry for transient failures
- Circuit breaker pattern for database connections

## Performance Characteristics

- **Throughput**: ~1000 metrics/second per station
- **Latency**: <10ms for metric recording
- **Memory**: ~50MB baseline + 1MB per active trace
- **CPU**: <5% at steady state
- **Disk I/O**: ~100KB/s for audio recording
- **Network**: PostgreSQL connection pool (max 10 connections)

---

## AI Optimizer Agent

### Overview
External service that provides intelligent audio optimization using OpenAI GPT models to analyze metrics and determine optimal knob settings.

### Location
- **File**: `ai-service-openai.js`
- **Port**: 3090
- **Process**: Separate PM2 service (`ai-optimizer`)

### Architecture
```
┌──────────────────────────────────────────────────────────┐
│                 AI Optimizer Agent (3090)                  │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │               Express HTTP Server                   │  │
│  │  POST /optimize - Main optimization endpoint       │  │
│  └────────────────────────────────────────────────────┘  │
│                          │                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │              OpenAI Integration Layer               │  │
│  │  - GPT-4-turbo-preview model                       │  │
│  │  - Structured prompts for audio analysis           │  │
│  │  - JSON response format                            │  │
│  └────────────────────────────────────────────────────┘  │
│                          │                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Decision Validation                    │  │
│  │  - Knob limit enforcement                          │  │
│  │  - Permission checking                             │  │
│  │  - Confidence scoring                              │  │
│  └────────────────────────────────────────────────────┘  │
│                          │                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Fallback Mechanism                     │  │
│  │  - Rule-based decisions if OpenAI fails            │  │
│  │  - Progressive gain adjustments                    │  │
│  │  - Safe defaults                                   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

### Responsibilities
1. **Trace Discovery**
   - Poll OptimizerAPI for active traces
   - Identify optimization targets

2. **Metrics Analysis**
   - Fetch 5-second snapshots
   - Analyze PRE/POST tap metrics
   - Evaluate current knob settings

3. **Decision Making**
   - Generate OpenAI prompt with metrics
   - Parse GPT-4 recommendations
   - Validate against constraints

4. **Knob Scheduling**
   - POST decisions to OptimizerAPI
   - Include idempotency keys
   - Schedule for future buckets

5. **Verification**
   - Check applied changes
   - Track optimization effectiveness

### Key Methods

#### `POST /optimize`
Main endpoint that receives snapshots and returns decisions:
```javascript
{
  input: {
    trace_id: "trace_2026-01-12T21-08-07-177Z_3333",
    metrics: { PRE: {...}, POST: {...} },
    knobs: { "pcm.input_gain_db": 0 }
  },
  output: {
    decisions: [{
      knob: "pcm.input_gain_db",
      recommended_value: 3,
      confidence: 0.85,
      reason: "RMS below target"
    }]
  }
}
```

#### OpenAI Integration
```javascript
// Prompt structure
const prompt = {
  system: "You are an audio optimization expert",
  user: JSON.stringify({
    metrics: snapshot,
    goals: {
      target_rms: "-18 to -12 dBFS",
      max_clipping: 0.001,
      progressive_adjustments: "2-4 dB steps"
    }
  })
};

// Configuration
const config = {
  model: "gpt-4-turbo-preview",
  temperature: 0.3,  // Consistent decisions
  max_tokens: 500,
  timeout: 2000
};
```

### Integration Points
1. **Consumes from OptimizerAPI**:
   - `GET /api/traces/active`
   - `GET /api/optimizer/snapshot`
   - `GET /api/optimizer/verify/:id`

2. **Produces to OptimizerAPI**:
   - `POST /api/optimizer/knobs/apply`

3. **External Service**:
   - OpenAI API (GPT-4)

### Configuration
```bash
# Environment variables
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
AI_SERVICE_PORT=3090
API_TIMEOUT_MS=2000
MAX_RETRIES=2
```

### Performance
- **Analysis Frequency**: Every 10 seconds
- **OpenAI Latency**: ~1-2 seconds per call
- **Token Usage**: ~750 tokens per analysis
- **Memory**: ~50MB + OpenAI SDK
- **Cost**: ~$0.01 per optimization cycle

### Error Handling
1. **OpenAI Failures**:
   - Retry with exponential backoff
   - Fallback to rule-based decisions
   - Log errors for monitoring

2. **Invalid Responses**:
   - Validate JSON structure
   - Check knob ranges
   - Filter invalid decisions

3. **Permission Denied**:
   - Check `ai.optimization_allowed` knob
   - Return empty decisions if disabled

### Monitoring
- PM2 process monitoring
- Decision history in logs
- Token usage tracking
- Success/failure metrics
- Fallback activation rate