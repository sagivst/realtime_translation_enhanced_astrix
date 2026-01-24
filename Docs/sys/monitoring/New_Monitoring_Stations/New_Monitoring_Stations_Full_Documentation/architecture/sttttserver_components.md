# STTTTSserver Integration Components

## Overview

STTTTSserver.js is the main application server that integrates with the NEW monitoring system. It handles UDP audio reception, translation pipeline, and monitoring system initialization.

## Location
`/3333_4444__Operational/STTTTSserver/STTTTSserver.js`

## Core Integration Points

### 1. Monitoring System Initialization

**Location**: Lines 1536-1561

```javascript
// Import NEW monitoring framework
const { getMonitoringBootstrap } = require('./Monitoring_Stations/MonitoringStationsBootstrap');
let newMonitoring = null;

// Initialize at startup
async function initializeNewMonitoring() {
  try {
    console.log('\\n========== Initializing NEW Monitoring Framework ==========');
    newMonitoring = getMonitoringBootstrap();

    // Initialize with configuration
    await newMonitoring.initialize({
      database: {
        host: "localhost",
        port: 5432,
        database: "monitoring_v2",
        user: "monitoring_user",
        password: "monitoring_pass"
      }
    });

    // Start monitoring
    await newMonitoring.start();
    console.log('========== NEW Monitoring Framework ACTIVE ==========\\n');
    return true;
  } catch (error) {
    console.error('WARNING: NEW monitoring failed to initialize:', error.message);
    newMonitoring = null;
    return false;
  }
}
```

### 2. Audio Frame Processing

**Location**: Lines 2409-2427

```javascript
// In processGatewayAudio() function
if (newMonitoring && newMonitoring.isRunning) {
  try {
    // Create context for NEW monitoring
    const newMonitoringContext = {
      trace_id: 'trace_' + new Date().toISOString().replace(/[:.]/g, '-') + '_' + extension,
      started_at: new Date(),
      src_extension: extension,
      sample_rate: 16000,
      channels: 1
    };

    // Process through NEW monitoring (non-blocking)
    const stationKey = extension === "3333" ? "St_3_3333" : "St_3_4444";
    newMonitoring.processFrame(audioBuffer, newMonitoringContext, stationKey);
  } catch (error) {
    // NEW monitoring errors should not affect main pipeline
    console.error('[NEW Monitoring] Error processing frame:', error.message);
  }
}
```

### 3. UDP Socket Management

**Location**: Lines 3760-3774

```javascript
// Create UDP sockets for audio reception
const dgram = require('dgram');
const socket3333In = dgram.createSocket('udp4');
const socket3333Out = dgram.createSocket('udp4');
const socket4444In = dgram.createSocket('udp4');
const socket4444Out = dgram.createSocket('udp4');

// Expose UDP sockets globally
global.udpSockets = {
  socket3333In: socket3333In,
  socket3333Out: socket3333Out,
  socket4444In: socket4444In,
  socket4444Out: socket4444Out
};
```

### 4. UDP Message Handlers

**Extension 3333 Handler - Line 3804**:
```javascript
socket3333In.on('message', async (msg, rinfo) => {
  udpPcmStats.from3333Packets++;

  // Validate PCM format
  if (msg.length === 160) { // 10ms @ 16kHz
    // Store in buffer
    const buffer = udpAudioBuffers.get('3333');
    buffer.chunks.push(msg);
    buffer.totalBytes += msg.length;

    // Process when buffer reaches threshold
    if (buffer.totalBytes >= BUFFER_SIZE_BYTES) {
      const audioBuffer = Buffer.concat(buffer.chunks);
      await processGatewayAudio(socket3333Out, '3333', audioBuffer, 'en');

      // Clear buffer
      buffer.chunks = [];
      buffer.totalBytes = 0;
    }
  }
});
```

**Extension 4444 Handler - Line 3929**:
```javascript
socket4444In.on('message', async (msg, rinfo) => {
  // Similar to 3333 handler but for extension 4444
  // Processes French audio by default
});
```

## BucketScheduler Component

**Location**: `/3333_4444__Operational/STTTTSserver/lib/BucketScheduler.js`

### Purpose
Manages scheduled knob updates at precise 5-second bucket boundaries for AI Optimizer integration.

### Key Features
- Timer-based execution (1-second intervals)
- Bucket time alignment
- Database persistence layer
- Idempotency key management
- Verification recording

### Class Structure
```javascript
class BucketScheduler {
  constructor(knobManager, dbConnection) {
    this.knobManager = knobManager;
    this.dbConnection = dbConnection;
    this.timer = null;
    this.isRunning = false;
    this.pendingUpdates = new Map();
    this.appliedUpdates = new Set();
  }

  async initialize() {
    // Load pending updates from database
    // Start persistence layer
    // Begin timer
  }

  async scheduleUpdate(updateData) {
    const {
      trace_id,
      station_key,
      apply_at_bucket_ts,
      config_version,
      knobs,
      idempotency_key
    } = updateData;

    // Check idempotency
    if (this.appliedUpdates.has(idempotency_key)) {
      return { success: true, duplicate: true };
    }

    // Store in database
    await this.persistUpdate(updateData);

    // Add to pending
    this.addToPending(updateData);

    return { success: true, config_version };
  }

  timerTick() {
    const now = new Date();
    const currentBucket = this.alignToBucket(now);

    // Check for updates to apply
    const updates = this.getUpdatesForBucket(currentBucket);

    for (const update of updates) {
      this.applyUpdate(update);
    }
  }

  async applyUpdate(update) {
    // Apply knobs to station
    const result = await this.knobManager.applyKnobs(
      update.station_key,
      update.knobs
    );

    // Record verification
    await this.recordVerification(update, result);

    // Mark as applied
    this.appliedUpdates.add(update.idempotency_key);
  }

  alignToBucket(timestamp) {
    const ms = timestamp.getTime();
    const aligned = Math.floor(ms / 5000) * 5000;
    return new Date(aligned);
  }
}
```

## OptimizerAPI Component

**Location**: Integrated within STTTTSserver.js (Lines 4400-4700)

### Purpose
Provides HTTP API endpoints for AI Optimizer to interact with the monitoring system.

### API Endpoints

#### 1. GET /api/traces/active
Returns currently active traces
```javascript
app.get('/api/traces/active', async (req, res) => {
  const query = `
    SELECT trace_id, started_at, src_extension, dst_extension
    FROM traces
    WHERE ended_at IS NULL
       OR ended_at > NOW() - INTERVAL '5 minutes'
    ORDER BY started_at DESC
  `;

  const result = await dbPool.query(query);
  res.json({ active: result.rows });
});
```

#### 2. GET /api/optimizer/snapshot
Get latest metrics snapshot for a trace
```javascript
app.get('/api/optimizer/snapshot', async (req, res) => {
  const { trace_id, limit = 10 } = req.query;

  const query = `
    SELECT *
    FROM metrics_agg_5s
    WHERE trace_id = $1
    ORDER BY bucket_ts DESC
    LIMIT $2
  `;

  const result = await dbPool.query(query, [trace_id, limit]);
  res.json({ buckets: result.rows });
});
```

#### 3. POST /api/optimizer/knobs/apply
Schedule knob updates
```javascript
app.post('/api/optimizer/knobs/apply', async (req, res) => {
  const {
    trace_id,
    station_key,
    apply_at_bucket_ts,
    idempotency_key,
    source,
    reason,
    knobs
  } = req.body;

  // Validate inputs
  if (!trace_id || !station_key || !apply_at_bucket_ts || !knobs) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Schedule with BucketScheduler
  const result = await bucketScheduler.scheduleUpdate({
    trace_id,
    station_key,
    apply_at_bucket_ts,
    config_version: getNextConfigVersion(),
    knobs,
    source: source || 'api',
    reason,
    idempotency_key: idempotency_key || uuidv4()
  });

  res.json(result);
});
```

#### 4. GET /api/audio/segment
Retrieve audio segment
```javascript
app.get('/api/audio/segment', async (req, res) => {
  const { trace_id, station_key, tap, bucket_ts } = req.query;

  // Query database for file path
  const query = `
    SELECT file_path, sample_rate_hz, format
    FROM audio_segments_5s
    WHERE trace_id = $1
      AND station_key = $2
      AND tap = $3
      AND bucket_ts = $4
  `;

  const result = await dbPool.query(query, [trace_id, station_key, tap, bucket_ts]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Audio segment not found' });
  }

  const { file_path, sample_rate_hz } = result.rows[0];

  // Stream audio file
  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('X-Sample-Rate', sample_rate_hz);
  fs.createReadStream(file_path).pipe(res);
});
```

#### 5. GET /api/optimizer/verify/:id
Verify knob application
```javascript
app.get('/api/optimizer/verify/:idempotency_key', async (req, res) => {
  const { idempotency_key } = req.params;

  const query = `
    SELECT kv.*, sku.knobs as expected_knobs
    FROM knob_verifications kv
    JOIN scheduled_knob_updates sku ON kv.update_id = sku.id
    WHERE sku.idempotency_key = $1
  `;

  const result = await dbPool.query(query, [idempotency_key]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Verification not found' });
  }

  res.json({
    status: result.rows[0].match ? 'verified' : 'mismatch',
    details: result.rows[0]
  });
});
```

### Integration with PM2

STTTTSserver is managed by PM2 process manager:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'STTTTSserver',
    script: './STTTTSserver.js',
    cwd: '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 3020
    },
    error_file: './logs/sttts-error.log',
    out_file: './logs/sttts-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true
  }]
};
```

## Data Flow Through STTTTSserver

```
1. UDP Audio Reception (ports 6120, 6123)
   ↓
2. Buffer accumulation (160 bytes × N)
   ↓
3. processGatewayAudio() called
   ↓
4. Create monitoring context with trace_id
   ↓
5. newMonitoring.processFrame() (async, non-blocking)
   ↓
6. Continue with translation pipeline
   ↓
7. Return translated audio via UDP
```

## Performance Characteristics

- **UDP Processing**: <1ms per packet
- **Buffer Size**: 16KB (1 second of audio)
- **Context Creation**: <0.1ms
- **Monitoring Overhead**: <3ms per frame
- **Memory Usage**: ~50MB baseline
- **CPU Usage**: <5% at 100 packets/second

## Error Handling

All monitoring integration is wrapped in try-catch blocks:
- Monitoring failures don't affect main pipeline
- Errors logged but not propagated
- Graceful degradation if monitoring unavailable

## Health Monitoring

```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    monitoring: {
      initialized: newMonitoring !== null,
      running: newMonitoring?.isRunning || false,
      stats: newMonitoring?.getStats() || null
    },
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

## Configuration

Monitoring configuration passed during initialization:
```javascript
{
  database: {
    host: "localhost",
    port: 5432,
    database: "monitoring_v2",
    user: "monitoring_user",
    password: "monitoring_pass"
  },
  monitoring: {
    enabled: true,
    bucketMs: 5000,
    audioRecording: true,
    metricsCollection: true
  }
}
```

## Dependencies

- `dgram` - UDP socket management
- `express` - HTTP API server
- `pg` - PostgreSQL client
- `./Monitoring_Stations/MonitoringStationsBootstrap` - Monitoring system
- `./lib/BucketScheduler` - Knob scheduling
- `uuid` - Unique ID generation
- `fs` - File system operations