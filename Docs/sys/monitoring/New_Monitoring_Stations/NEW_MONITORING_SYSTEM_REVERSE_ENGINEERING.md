# NEW Monitoring System - Reverse Engineering Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Components](#architecture-components)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Data Flow](#data-flow)
6. [Monitoring Stations](#monitoring-stations)
7. [Knobs System](#knobs-system)
8. [Audio Recording](#audio-recording)
9. [Metrics System](#metrics-system)
10. [Integration Examples](#integration-examples)

---

## System Overview

The NEW Monitoring System is a real-time audio monitoring framework designed for the translation application. It operates on **5-second aggregation windows** and monitors audio flow between extensions (3333 ↔ 4444).

### Key Characteristics:
- **Real-time safe**: No blocking operations in audio path
- **Fire-and-forget pattern**: Async operations don't block audio processing
- **5-second aggregation**: Fixed time buckets for metrics
- **Dual-tap monitoring**: PRE and POST processing measurements
- **Dynamic knobs**: Runtime adjustable audio parameters

### Server Details:
- **Host**: 20.170.155.53 (Azure VM)
- **HTTP API Port**: 3020
- **Database**: PostgreSQL (monitoring_v2)
- **Process Manager**: PM2

---

## Architecture Components

```
┌─────────────────────────────────────────────────────────┐
│                    STTTTSserver.js                       │
│                    (Port 3020)                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │         MonitoringStationsBootstrap.js          │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                               │
│    ┌─────────────────────┼─────────────────────┐        │
│    │                     │                     │        │
│    ▼                     ▼                     ▼        │
│ Station3_3333     Station3_4444         [More...]       │
│ Handler.js        Handler.js            Handlers        │
│    │                     │                     │        │
│    └─────────────────────┼─────────────────────┘        │
│                          ▼                               │
│              St_Handler_Generic.js                       │
│                    (Core Logic)                          │
│                          │                               │
│         ┌────────────────┼────────────────┐             │
│         ▼                ▼                ▼             │
│    Aggregator.js   KnobsResolver.js  MetricsRegistry.js │
│         │                │                               │
│         ▼                ▼                               │
│  MetricsEmitter.js  DatabaseBridge.js                   │
│         │                │                               │
└─────────┼────────────────┼───────────────────────────────┘
          │                │
          ▼                ▼
    ┌──────────┐    ┌──────────────┐
    │ Audio    │    │ PostgreSQL   │
    │ Files    │    │ monitoring_v2│
    └──────────┘    └──────────────┘
```

---

## Database Schema

### Database: `monitoring_v2`
### User: `monitoring_user`
### Password: `monitoring_pass`

### Tables:

#### 1. `traces`
```sql
CREATE TABLE traces (
    trace_id VARCHAR(255) PRIMARY KEY,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    src_extension VARCHAR(10),
    dst_extension VARCHAR(10),
    call_id VARCHAR(255),
    notes TEXT
);
```

#### 2. `metrics_agg_5s`
```sql
CREATE TABLE metrics_agg_5s (
    trace_id VARCHAR(255),
    station_key VARCHAR(50) NOT NULL,
    station_group VARCHAR(50),
    layer VARCHAR(20),
    direction VARCHAR(10),
    tap VARCHAR(10) NOT NULL,  -- 'PRE' or 'POST'
    metric_key VARCHAR(100) NOT NULL,
    bucket_ts TIMESTAMP NOT NULL,
    bucket_ms INTEGER DEFAULT 5000,
    count INTEGER NOT NULL,
    min FLOAT,
    max FLOAT,
    sum FLOAT,
    avg FLOAT,
    last FLOAT,
    PRIMARY KEY (trace_id, station_key, tap, metric_key, bucket_ts)
);
```

#### 3. `audio_segments_5s`
```sql
CREATE TABLE audio_segments_5s (
    trace_id VARCHAR(255),
    station_key VARCHAR(50) NOT NULL,
    station_group VARCHAR(50),
    layer VARCHAR(20),
    direction VARCHAR(10),
    tap VARCHAR(10) NOT NULL,  -- 'PRE' or 'POST'
    bucket_ts TIMESTAMP NOT NULL,
    bucket_ms INTEGER DEFAULT 5000,
    sample_rate_hz INTEGER DEFAULT 16000,
    channels INTEGER DEFAULT 1,
    format VARCHAR(50) DEFAULT 'WAV_PCM_S16LE_MONO',
    file_path TEXT NOT NULL,
    file_bytes INTEGER,
    sha256_hex VARCHAR(64),
    PRIMARY KEY (trace_id, station_key, tap, bucket_ts)
);
```

#### 4. `knob_events`
```sql
CREATE TABLE knob_events (
    id SERIAL PRIMARY KEY,
    trace_id VARCHAR(255),
    station_key VARCHAR(50) NOT NULL,
    knob_key VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    source VARCHAR(50) DEFAULT 'manual',
    reason TEXT,
    occurred_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. `knob_snapshots_5s`
```sql
CREATE TABLE knob_snapshots_5s (
    trace_id VARCHAR(255),
    station_key VARCHAR(50) NOT NULL,
    bucket_ts TIMESTAMP NOT NULL,
    bucket_ms INTEGER DEFAULT 5000,
    knobs_json JSONB NOT NULL,
    PRIMARY KEY (trace_id, station_key, bucket_ts)
);
```

---

## API Endpoints

### Base URL: `http://20.170.155.53:3020`

### 1. Knob Management

#### Get Current Knobs State
```bash
GET /api/knobs/current

# Response:
{
  "success": true,
  "state": {
    "baseline": {
      "pcm.input_gain_db": 0,
      "pcm.output_gain_db": 0,
      "pcm.target_level_dbfs": -12,
      "limiter.enabled": true,
      "limiter.threshold_dbfs": -6,
      "compressor.enabled": false,
      ...
    },
    "globalOverrides": {},
    "traceOverridesCount": 0
  }
}
```

#### Update Global Knob
```bash
POST /api/knobs/update/global
Content-Type: application/json

{
  "key": "pcm.input_gain_db",
  "value": 3,
  "source": "api"
}

# Response:
{
  "success": true,
  "change": {
    "key": "pcm.input_gain_db",
    "oldValue": 0,
    "newValue": 3,
    "source": "api",
    "timestamp": "2026-01-03T20:19:07.256Z"
  }
}
```

#### Update Trace-Specific Knob
```bash
POST /api/knobs/update/trace/{traceId}
Content-Type: application/json

{
  "key": "limiter.threshold_dbfs",
  "value": -3,
  "source": "auto_optimizer"
}
```

#### Reset Specific Knob
```bash
POST /api/knobs/reset/{knobKey}

# Example:
POST /api/knobs/reset/pcm.input_gain_db

# Response:
{
  "success": true,
  "message": "Knob reset to default",
  "defaultValue": 0
}
```

#### Reset All Knobs
```bash
POST /api/knobs/reset-all

# Response:
{
  "success": true,
  "message": "All knobs reset to default values"
}
```

#### Get Knob History
```bash
GET /api/knobs/history?hours=72&traceId={optional}

# Response:
{
  "success": true,
  "count": 5,
  "hours": 72,
  "trace_id": "all",
  "history": [
    {
      "id": "1",
      "trace_id": null,
      "station_key": "global",
      "knob_key": "pcm.input_gain_db",
      "old_value": "0",
      "new_value": "3",
      "source": "api",
      "reason": null,
      "occurred_at": "2026-01-03T20:19:07.256Z"
    }
  ]
}
```

#### Get Knob Snapshots
```bash
GET /api/knobs/snapshots?hours=1&stationKey={optional}

# Response:
{
  "success": true,
  "count": 12,
  "hours": 1,
  "station_key": "St_3_3333",
  "snapshots": [
    {
      "trace_id": null,
      "station_key": "St_3_3333",
      "bucket_ts": "2026-01-03T21:15:00.000Z",
      "bucket_ms": 5000,
      "knobs_json": {
        "pcm.input_gain_db": 0,
        "pcm.output_gain_db": 0,
        ...
      }
    }
  ]
}
```

### 2. Monitoring Control

#### Get Monitoring Status
```bash
GET /api/monitoring/status

# Response:
{
  "isRunning": true,
  "components": {
    "genericHandler": "active",
    "databaseBridge": "connected",
    "metricsEmitter": "running",
    "audioRecorder": "active"
  },
  "stats": {
    "traces": { "inserted": 10, "updated": 5, "errors": 0 },
    "metrics": { "inserted": 1500, "errors": 0 },
    "audio": { "indexed": 300, "errors": 0 },
    "knobs": { "snapshots": 300, "events": 15, "errors": 0 }
  }
}
```

---

## Data Flow

### Audio Processing Pipeline:

```
1. Audio Frame Arrives (PCM S16LE Mono)
     ↓
2. Station Handler (Station3_3333 or Station3_4444)
     ↓
3. St_Handler_Generic.processFrame()
     ├─> PRE Metrics Computation
     ├─> PRE Audio Capture
     ├─> Apply Knobs (gain, limiter, etc.)
     ├─> POST Metrics Computation
     └─> POST Audio Capture
     ↓
4. Aggregator (5-second buckets)
     ├─> Accumulate metrics
     └─> Every 5 seconds:
         ├─> Flush metrics → MetricsEmitter → Database
         ├─> Save knob snapshot → Database
         └─> Index audio segments → Database
```

---

## Monitoring Stations

### Station Configuration:

#### Station 3_3333 (Port 3333)
```javascript
{
  stationKey: "St_3_3333",
  stationGroup: "STTTTS_PCM_EGRESS",
  direction: "TX",  // Transmitting to gateway
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
  ]
}
```

#### Station 3_4444 (Port 4444)
```javascript
{
  stationKey: "St_3_4444",
  stationGroup: "STTTTS_PCM_INGRESS",
  direction: "RX",  // Receiving from gateway
  preMetrics: [...],
  postMetrics: [...]
}
```

---

## Knobs System

### Available Knobs:

#### Audio Gain
- `pcm.input_gain_db`: Input gain in dB (default: 0, range: -60 to +20)
- `pcm.output_gain_db`: Output gain in dB (default: 0, range: -60 to +20)
- `pcm.target_level_dbfs`: Target level in dBFS (default: -12)

#### Limiter
- `limiter.enabled`: Enable/disable limiter (default: true)
- `limiter.threshold_dbfs`: Threshold in dBFS (default: -6)
- `limiter.release_ms`: Release time in ms (default: 50)
- `limiter.lookahead_ms`: Lookahead time in ms (default: 5)

#### Compressor
- `compressor.enabled`: Enable/disable compressor (default: false)
- `compressor.threshold_dbfs`: Threshold in dBFS (default: -20)
- `compressor.ratio`: Compression ratio (default: 4)
- `compressor.attack_ms`: Attack time in ms (default: 10)
- `compressor.release_ms`: Release time in ms (default: 100)

#### Noise Gate
- `noise_gate.enabled`: Enable/disable noise gate (default: false)
- `noise_gate.threshold_dbfs`: Threshold in dBFS (default: -50)
- `noise_gate.attack_ms`: Attack time in ms (default: 1)
- `noise_gate.hold_ms`: Hold time in ms (default: 10)
- `noise_gate.release_ms`: Release time in ms (default: 100)

#### High-Pass Filter
- `highpass.enabled`: Enable/disable high-pass filter (default: false)
- `highpass.cutoff_hz`: Cutoff frequency in Hz (default: 80)

#### Safety
- `safety.clipping_protection`: Enable clipping protection (default: true)

### Knob Priority System:
1. **Trace-specific overrides** (highest priority)
2. **Global overrides**
3. **Baseline values** (lowest priority)

---

## Audio Recording

### Audio Segment Storage:
- **Format**: WAV PCM S16LE Mono
- **Sample Rate**: 16000 Hz
- **Duration**: 5 seconds per segment
- **Path Pattern**: `/audio/{trace_id}/{station_key}/{tap}/{bucket_ts}.wav`
- **Storage**: Both PRE and POST processing audio saved

---

## Metrics System

### Core Metrics:

#### PCM Metrics
- `pcm.rms_dbfs`: RMS level in dBFS
- `pcm.peak_dbfs`: Peak level in dBFS
- `pcm.clipping_ratio`: Ratio of clipped samples
- `pcm.zero_crossing_rate`: Zero crossing rate
- `pcm.silence_ratio`: Ratio of silent frames

#### Pipeline Metrics
- `pipe.processing_latency_ms`: Processing time in ms
- `pipe.frame_drop_ratio`: Dropped frames ratio
- `pipe.buffer_overflow_count`: Buffer overflow events

#### Quality Metrics
- `quality.snr_db`: Signal-to-noise ratio
- `quality.thd_percent`: Total harmonic distortion

---

## Integration Examples

### 1. Automated Gain Control
```python
import requests
import time

API_BASE = "http://20.170.155.53:3020"

def auto_adjust_gain(target_rms=-18):
    """Automatically adjust gain based on RMS levels"""

    # Get current metrics (would need a metrics endpoint)
    # For now, using knob history as example

    # Check current gain
    response = requests.get(f"{API_BASE}/api/knobs/current")
    current_gain = response.json()["state"]["baseline"]["pcm.input_gain_db"]

    # Adjust gain based on metrics
    new_gain = current_gain + 1  # Example adjustment

    # Update the knob
    response = requests.post(
        f"{API_BASE}/api/knobs/update/global",
        json={
            "key": "pcm.input_gain_db",
            "value": new_gain,
            "source": "auto_gain_control"
        }
    )

    return response.json()
```

### 2. Monitoring Dashboard Integration
```javascript
// Fetch real-time knob state
async function getKnobState() {
    const response = await fetch('http://20.170.155.53:3020/api/knobs/current');
    return await response.json();
}

// Update knob dynamically
async function updateKnob(key, value) {
    const response = await fetch('http://20.170.155.53:3020/api/knobs/update/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, source: 'dashboard' })
    });
    return await response.json();
}

// Get historical data
async function getKnobHistory(hours = 24) {
    const response = await fetch(`http://20.170.155.53:3020/api/knobs/history?hours=${hours}`);
    return await response.json();
}
```

### 3. Database Queries for Analysis

```sql
-- Get average RMS levels per station over last hour
SELECT
    station_key,
    tap,
    AVG(avg) as avg_rms_dbfs,
    MIN(min) as min_rms_dbfs,
    MAX(max) as max_rms_dbfs
FROM metrics_agg_5s
WHERE
    metric_key = 'pcm.rms_dbfs'
    AND bucket_ts > NOW() - INTERVAL '1 hour'
GROUP BY station_key, tap
ORDER BY station_key, tap;

-- Find periods with high clipping
SELECT
    trace_id,
    station_key,
    bucket_ts,
    avg as clipping_ratio
FROM metrics_agg_5s
WHERE
    metric_key = 'pcm.clipping_ratio'
    AND avg > 0.01  -- More than 1% clipping
    AND bucket_ts > NOW() - INTERVAL '24 hours'
ORDER BY bucket_ts DESC;

-- Track knob changes over time
SELECT
    knob_key,
    COUNT(*) as change_count,
    array_agg(DISTINCT source) as sources
FROM knob_events
WHERE occurred_at > NOW() - INTERVAL '7 days'
GROUP BY knob_key
ORDER BY change_count DESC;
```

### 4. Webhook Integration for Auto-Control
```python
# Example: Adjust knobs based on external triggers

import requests
from flask import Flask, request

app = Flask(__name__)
API_BASE = "http://20.170.155.53:3020"

@app.route('/webhook/quality-alert', methods=['POST'])
def handle_quality_alert():
    """Handle quality alerts from external monitoring"""
    data = request.json

    if data['alert_type'] == 'low_volume':
        # Increase gain
        requests.post(f"{API_BASE}/api/knobs/update/global", json={
            "key": "pcm.input_gain_db",
            "value": 3,
            "source": "quality_alert_webhook"
        })

    elif data['alert_type'] == 'distortion':
        # Enable limiter and reduce gain
        requests.post(f"{API_BASE}/api/knobs/update/global", json={
            "key": "limiter.enabled",
            "value": True,
            "source": "quality_alert_webhook"
        })
        requests.post(f"{API_BASE}/api/knobs/update/global", json={
            "key": "pcm.input_gain_db",
            "value": -3,
            "source": "quality_alert_webhook"
        })

    return {"status": "handled"}
```

### 5. Trace-Specific Configuration
```bash
# Set specific knobs for a call/trace
TRACE_ID="call_12345"

# Set higher quality for important call
curl -X POST http://20.170.155.53:3020/api/knobs/update/trace/${TRACE_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "key": "compressor.enabled",
    "value": true,
    "source": "vip_call_handler"
  }'

# Enable noise gate for noisy environment
curl -X POST http://20.170.155.53:3020/api/knobs/update/trace/${TRACE_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "key": "noise_gate.enabled",
    "value": true,
    "source": "noise_detector"
  }'
```

---

## System Startup Sequence

1. **PM2 starts STTTTSserver.js**
2. **MonitoringStationsBootstrap initializes**:
   - Loads configuration files
   - Creates DatabaseBridge connection
   - Initializes MetricsEmitter
   - Initializes AudioRecorder
3. **Station Handlers register**:
   - Station3_3333_Handler
   - Station3_4444_Handler
4. **St_Handler_Generic starts**:
   - Initializes KnobsResolver with baseline values
   - Creates Aggregator with 5-second buckets
   - Starts aggregation timer
5. **HTTP API starts on port 3020**
6. **System ready for audio processing**

---

## Monitoring Commands

### Check System Status
```bash
# PM2 process status
pm2 status | grep STTTTSserver

# View logs
pm2 logs STTTTSserver --lines 50

# Database stats
PGPASSWORD=monitoring_pass psql -U monitoring_user -d monitoring_v2 -h localhost -c \
  "SELECT COUNT(*) FROM metrics_agg_5s WHERE bucket_ts > NOW() - INTERVAL '1 hour';"
```

### Test Knobs System
```bash
# Get current state
curl -s http://20.170.155.53:3020/api/knobs/current | jq '.state.baseline'

# Update a knob
curl -X POST http://20.170.155.53:3020/api/knobs/update/global \
  -H "Content-Type: application/json" \
  -d '{"key": "pcm.input_gain_db", "value": 2}'

# Check history
curl -s http://20.170.155.53:3020/api/knobs/history | jq '.history[0]'
```

---

## Performance Characteristics

- **Latency**: < 1ms per frame processing (typical)
- **Memory**: ~80-100MB per STTTTSserver process
- **CPU**: < 5% at normal load
- **Database Write Rate**: ~10-20 writes/second (5-second aggregation)
- **Audio Buffer**: 5 seconds per segment
- **Metrics Retention**: 72 hours (configurable)

---

## Error Handling

### Graceful Degradation:
- Database errors don't block audio processing
- Metric computation errors log NaN, don't crash
- Knob validation prevents invalid values
- Audio recording failures are logged but don't stop pipeline

### Recovery Mechanisms:
- PM2 auto-restart on crash
- Database connection pooling with retry
- Aggregator memory limits prevent unbounded growth
- Automatic cleanup of old data (>72 hours)

---

## Security Considerations

### Access Control:
- API endpoints have no authentication (implement as needed)
- Database credentials in environment variables
- File system permissions for audio storage

### Data Privacy:
- Audio files contain actual conversation data
- Implement retention policies
- Consider encryption for sensitive deployments

---

## Future Enhancement Points

1. **Authentication**: Add API key or JWT authentication
2. **Metrics API**: Direct metrics query endpoints
3. **Real-time Streaming**: WebSocket for live metrics
4. **Alert System**: Threshold-based notifications
5. **Machine Learning**: Automatic knob optimization
6. **Compression**: Audio compression for storage
7. **Clustering**: Multi-instance support
8. **Grafana Integration**: Time-series visualization

---

## Troubleshooting

### Common Issues:

1. **Server not starting**:
   ```bash
   pm2 logs STTTTSserver --err
   node -c /path/to/file.js  # Check syntax
   ```

2. **Database connection failed**:
   ```bash
   PGPASSWORD=monitoring_pass psql -U monitoring_user -d monitoring_v2 -h localhost
   ```

3. **No metrics being recorded**:
   - Check if audio traffic is flowing
   - Verify Station handlers are registered
   - Check Aggregator timer is running

4. **Knobs not applying**:
   - Verify KnobsResolver has correct baseline
   - Check priority system (trace > global > baseline)
   - Confirm knob key exists in registry

---

## Contact & Support

- **System Location**: Azure VM 20.170.155.53
- **Database**: PostgreSQL monitoring_v2
- **Process Manager**: PM2
- **Main Process**: STTTTSserver

---

*Documentation generated: 2026-01-03*
*System Version: NEW Monitoring Framework v2.0*