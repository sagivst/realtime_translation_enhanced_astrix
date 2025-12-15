# Monitoring System - Complete Documentation
## Station-3 & Station-9 Real-Time Metrics Collection

**Generated:** 2025-12-09
**System:** Azure VM 20.170.155.53
**Focus:** Monitoring infrastructure, data flows, and metrics collection

---

## Table of Contents

1. [Monitoring System Overview](#monitoring-system-overview)
2. [Architecture & Data Flow](#architecture--data-flow)
3. [Active Monitoring Processes](#active-monitoring-processes)
4. [Station-3 Implementation](#station-3-implementation)
5. [Station-9 Implementation](#station-9-implementation)
6. [StationAgent Framework](#stationagent-framework)
7. [Monitoring Files Inventory](#monitoring-files-inventory)
8. [Data Formats & Protocols](#data-formats--protocols)
9. [Monitoring Bridges](#monitoring-bridges)
10. [Public API Access](#public-api-access)
11. [Configuration & Knobs](#configuration--knobs)
12. [Log Patterns & Monitoring](#log-patterns--monitoring)
13. [Troubleshooting Guide](#troubleshooting-guide)
14. [Metrics Reference](#metrics-reference)

---

## 1. Monitoring System Overview

### System Purpose
Real-time monitoring of translation pipeline performance with 75 metrics across 11 stations, collecting data every 200 milliseconds from critical points in the audio processing chain.

### Key Statistics
- **Total Stations**: 11 (STATION_1 through STATION_11)
- **Total Metrics**: 75 parameters
- **Total Knobs**: 113 control parameters
- **Collection Frequency**: 200ms (5 times per second)
- **Real Data Stations**: STATION_3 (STT input), STATION_9 (TTS output)
- **Generated Data Stations**: STATION_1, STATION_2, STATION_4-8, STATION_10-11

### Station Overview

| Station ID | Location | Purpose | Data Type |
|------------|----------|---------|-----------|
| STATION_1 | Asterisk → ARI | Inbound audio from PBX | Generated |
| STATION_2 | ARI → Gateway | RTP to Gateway forwarding | Generated |
| STATION_3 | Gateway → STT | **Audio input to Deepgram** | **REAL** |
| STATION_4 | STT → MT | Speech-to-text output | Generated |
| STATION_5 | MT → TTS | Translation output | Generated |
| STATION_6 | TTS → Buffer | TTS generation | Generated |
| STATION_7 | Buffer → Gateway | Audio output buffering | Generated |
| STATION_8 | Gateway → ARI | Gateway to ARI return | Generated |
| STATION_9 | ARI → Asterisk | **TTS output to PBX** | **REAL** |
| STATION_10 | Monitoring Hub | Central metrics aggregation | Generated |
| STATION_11 | External API | Public metrics exposure | Generated |

---

## 2. Architecture & Data Flow

### Complete Monitoring Data Chain

```
┌─────────────────────────────────────────────────────────────────────┐
│ DATA COLLECTION LAYER                                               │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Station-3 Handler                    │
│ File: station3-handler.js            │
│ Location: STTTTSserver/              │
│ Collection: Every 200ms              │
│ Extensions: 3333, 4444               │
│ Metrics: 23-24 real metrics          │
└────────────────┬─────────────────────┘
                 │
                 │ Via StationAgent.collect()
                 ▼
┌──────────────────────────────────────┐
│ StationAgent                         │
│ File: StationAgent.js                │
│ Location: STTTTSserver/monitoring/   │
│ Capabilities: 75 metrics, 113 knobs  │
│ Method: collect() → emit()           │
└────────────────┬─────────────────────┘
                 │
                 │ Socket.IO: 'metrics' event
                 ▼

┌─────────────────────────────────────────────────────────────────────┐
│ TRANSPORT LAYER                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│ STTTTSserver                         │
│ PID: 1402819                         │
│ Port: 6211 (Socket.IO)               │
│ Emits to: monitoring-server:3001     │
│ Event: socket.emit('metrics', data)  │
└────────────────┬─────────────────────┘
                 │
                 │ Socket.IO connection
                 ▼
┌──────────────────────────────────────┐
│ monitoring-server                    │
│ PID: 1400548                         │
│ Port: 3001 (Socket.IO)               │
│ Port: 8080 (HTTP)                    │
│ Fix: socket.emit → io.emit           │
└────────┬───────────────┬─────────────┘
         │               │
         │               │ Broadcasts to all clients
         ▼               ▼

┌─────────────────────────────────────────────────────────────────────┐
│ DISTRIBUTION LAYER                                                  │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────────────────┐   ┌────────────────────────────────────┐
│ monitoring-to-database-    │   │ monitoring-api-bridge              │
│ bridge                     │   │ Port: 3009                         │
│ PID: 1428739               │   │ Endpoint: GET /api/station3        │
│ Listens: 'unified-metrics' │   │ Purpose: Serve real-time data      │
│ Action: POST to DB API     │   │ Used by: continuous monitoring     │
└────────┬───────────────────┘   └────────────────────────────────────┘
         │
         │ HTTP POST
         ▼

┌─────────────────────────────────────────────────────────────────────┐
│ STORAGE LAYER                                                       │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│ database-api-server                  │
│ PID: 1398327                         │
│ Port: 8083                           │
│ Storage: In-memory (100 snapshots)   │
│ Endpoint: GET /api/snapshots         │
└────────────────┬─────────────────────┘
                 │
                 │ HTTP tunnel
                 ▼

┌─────────────────────────────────────────────────────────────────────┐
│ PUBLIC ACCESS LAYER                                                 │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│ cloudflared                          │
│ PID: 1345193                         │
│ Target: localhost:8083               │
│ Public URL:                          │
│ inter-using-helpful-latitude.        │
│ trycloudflare.com/api/snapshots      │
└──────────────────────────────────────┘
```

### Critical Data Flow Notes

1. **200ms Collection**: Station-3 handler collects metrics 5 times per second
2. **Broadcasting Fix**: monitoring-server uses `io.emit()` to broadcast to ALL clients (not `socket.emit()`)
3. **Missing Bridge**: monitoring-to-database-bridge is NOT in installation guide but is REQUIRED
4. **In-Memory Storage**: database-api-server stores last 100 snapshots (no persistent database)
5. **Dual Distribution**: Data flows to both database bridge AND API bridge simultaneously

---

## 3. Active Monitoring Processes

### Core Monitoring Services

#### monitoring-server
```
PID:      1400548
Ports:    3001 (Socket.IO), 8080 (HTTP)
File:     /home/azureuser/translation-app/monitoring-server.js
Size:     20,898 bytes
Log:      /tmp/monitoring-guide.log
Purpose:  Central Socket.IO hub for all monitoring data
Status:   ACTIVE - Central hub
```

**Key Responsibilities:**
- Listen for 'metrics' events from STTTTSserver
- Convert legacy format to unified format
- Broadcast 'unified-metrics' to all connected clients
- Maintain in-memory database of station states
- Serve HTTP dashboard on port 8080

**Critical Fix Applied:**
```javascript
// BEFORE (BROKEN)
socket.on('metrics', (data) => {
  socket.emit('unified-metrics', unifiedData); // Only sends to sender
});

// AFTER (WORKING)
socket.on('metrics', (data) => {
  io.emit('unified-metrics', unifiedData); // Broadcasts to ALL clients
  io.emit('metrics-update', updateData);
});
```

**Backup File:** `monitoring-server.js.backup-simple-fix`

#### monitoring-to-database-bridge
```
PID:      1428739
File:     /home/azureuser/translation-app/monitoring-to-database-bridge.js
Size:     4,019 bytes
Log:      /tmp/monitoring-to-database-NEW.log
Purpose:  Forward monitoring data to database-api-server
Status:   ACTIVE - CRITICAL (not in installation guide!)
```

**Key Responsibilities:**
- Connect to monitoring-server:3001 as Socket.IO client
- Listen for 'unified-metrics' events
- POST snapshots to database-api-server:8083/store-snapshot
- Handle errors silently (no crash on failed POST)

**Log Pattern:**
```
[10:28:08 PM] ✅ Stored STATION_3-3333: 23 metrics, 0 knobs
[10:28:08 PM] ✅ Stored STATION_3-4444: 24 metrics, 0 knobs
[10:28:09 PM] ✅ Stored STATION_3-3333: 23 metrics, 0 knobs
```

**Frequency:** Every ~200ms per extension

#### database-api-server
```
PID:      1398327
Port:     8083
File:     /home/azureuser/translation-app/database-api-server.js
Size:     2,071 bytes
Log:      /tmp/database-api-guide.log
Purpose:  HTTP API for monitoring snapshots
Status:   ACTIVE
```

**Endpoints:**
- `POST /store-snapshot` - Store monitoring snapshot
- `GET /api/snapshots` - Retrieve last 100 snapshots

**Storage:** In-memory array (last 100 snapshots only)

#### monitoring-api-bridge (Optional)
```
Port:     3009
File:     /home/azureuser/translation-app/monitoring-api-bridge.js
Size:     4,632 bytes
Purpose:  HTTP API for real-time Station-3/9 data
Status:   OPTIONAL
```

**Endpoints:**
- `GET /api/station3` - Returns current Station-3 and Station-9 data

**Used By:** continuous-full-monitoring-with-station3.js

---

## 4. Station-3 Implementation

### Overview
**Location:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station3-handler.js`
**Size:** 3,045 bytes
**Backup:** `station3-handler.js.backup-20251208-213909`

### Purpose
Monitor audio quality and processing metrics at the critical Gateway → Deepgram STT input point.

### Collection Frequency
**200 milliseconds** (5 times per second)

### Monitored Extensions
- **3333** - English audio input
- **4444** - French audio input

### Configuration Polling
```javascript
// Polls config file every 100ms
configPath: `/tmp/STATION_3-{extension}-config.json`
pollInterval: 100ms
```

### Implementation Code

```javascript
class Station3Handler {
  constructor(extensionId) {
    this.extensionId = extensionId;
    this.configPath = `/tmp/STATION_3-${extensionId}-config.json`;
    this.knobs = {};
    this.audioStartTime = Date.now();
    this.stationAgent = null;
    this.collectionInterval = null;

    // Start polling for config changes
    this.startPolling();
  }

  // Initialize StationAgent when available
  initStationAgent(StationAgent) {
    this.stationAgent = new StationAgent('STATION_3', this.extensionId);

    // Start periodic metric collection every 200ms
    this.collectionInterval = setInterval(async () => {
      if (this.stationAgent) {
        try {
          await this.stationAgent.collect({
            timestamp: Date.now(),
            extension: this.extensionId,
            call_id: 'station3-monitoring'
          });
        } catch (error) {
          // Silent fail - don't crash on collection errors
          console.error(`[STATION-3-${this.extensionId}] Collection error:`, error.message);
        }
      }
    }, 200); // 200ms = 5 times per second

    console.log(`[STATION-3] Initialized for extension ${this.extensionId} with 200ms collection interval`);
  }

  // Poll config file every 100ms
  startPolling() {
    setInterval(() => {
      try {
        const newKnobs = this.loadKnobs();
        if (JSON.stringify(newKnobs) !== JSON.stringify(this.knobs)) {
          this.knobs = newKnobs;
          console.log(`[STATION-3] Config updated for extension ${this.extensionId}`);
          this.onKnobsChanged?.(this.knobs);
        }
      } catch (e) {
        // Silent fail - config loading is not critical
      }
    }, 100);
  }

  // Load knobs from config file
  loadKnobs() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (e) {}
    return { deepgram: {} };
  }

  // Get Deepgram config from knobs
  getDeepgramConfig() {
    const dg = this.knobs.deepgram || {};
    // CRITICAL: Use nova-3 as default (current production value)
    return {
      model: dg.model || 'nova-3',
      language: dg.language || (this.extensionId === '3333' ? 'en' : 'fr'),
      encoding: 'linear16',
      sample_rate: 16000,
      channels: 1,
      punctuate: dg.punctuate !== false,
      interim_results: dg.interimResults !== false,
      endpointing: dg.endpointing || 300,
      vad_turnoff: dg.vadTurnoff || 500,
      smart_format: dg.smartFormat !== false,
      diarize: dg.diarize || false,
      utterances: true,
      numerals: true
    };
  }

  // Cleanup on shutdown
  destroy() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      console.log(`[STATION-3] Stopped collection for extension ${this.extensionId}`);
    }
  }
}
```

### Metrics Collected (Station-3)

**Audio Quality Metrics:**
- `snr` - Signal-to-Noise Ratio (dB)
- `audio_level` - Audio level (dBFS)
- `audio_quality_score` - Overall quality (0-1)

**Latency Metrics:**
- `stt_latency` - Speech-to-text processing time (ms)
- `mt_latency` - Machine translation time (ms)
- `tts_latency` - Text-to-speech time (ms)
- `end_to_end_latency` - Total pipeline latency (ms)

**System Resources:**
- `cpu_usage` - CPU usage percentage
- `memory_usage` - Memory usage (MB)
- `process_uptime` - Process runtime (seconds)

**Network Metrics:**
- `packet_loss` - Packet loss rate (%)
- `jitter` - Network jitter (ms)
- `bandwidth_usage` - Network bandwidth (kbps)

**Plus 10-14 additional metrics** depending on collection context

### Sample Station-3 Data

```javascript
{
  station_id: 'STATION_3',
  extension: '3333',
  call_id: 'STATION_3-1765232875623',
  timestamp: '2025-12-09T22:28:08.456Z',
  metrics: {
    snr: 25.3,
    audio_level: -18.5,
    audio_quality_score: 0.92,
    stt_latency: 145,
    mt_latency: 89,
    tts_latency: 234,
    end_to_end_latency: 468,
    cpu_usage: 34.2,
    memory_usage: 512.5,
    process_uptime: 3642,
    packet_loss: 0.02,
    jitter: 12.3,
    bandwidth_usage: 128.5,
    // ... 10-14 more metrics
  },
  knobs: [],
  alerts: [],
  metadata: {
    state: 'active',
    legacy_format: true
  },
  metric_count: 23,
  knob_count: 0
}
```

---

## 5. Station-9 Implementation

### Overview
**Location:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station9-handler.js`
**Size:** 2,375 bytes

### Purpose
Monitor TTS output quality and delivery metrics at the critical TTS → Asterisk output point.

### Monitored Extensions
- **3333** - French audio output (translated from English input)
- **4444** - English audio output (translated from French input)

### Key Differences from Station-3
1. **Focus:** TTS output instead of STT input
2. **Metrics:** TTS-specific quality and delivery metrics
3. **Data Bridge:** Shares monitoring-api-bridge with Station-3

### TTS Output Metrics

**TTS Quality:**
- `tts_audio_quality` - TTS output quality score (0-1)
- `tts_latency` - TTS generation time (ms)
- `tts_buffer_size` - Output buffer size (bytes)
- `tts_underruns` - Buffer underrun count

**Output Delivery:**
- `packets_sent` - UDP packets sent to Asterisk
- `bytes_sent` - Total bytes delivered
- `packet_rate` - Packets per second
- `delivery_latency` - Time from TTS to Asterisk (ms)

**Audio Stream:**
- `stream_continuity` - Stream continuity score (0-1)
- `silence_ratio` - Ratio of silence in output
- `peak_amplitude` - Peak audio level

### Sample Station-9 Data

```javascript
{
  station_id: 'STATION_9',
  extension: '3333',
  call_id: 'STATION_9-1765232875623',
  timestamp: '2025-12-09T22:28:08.789Z',
  metrics: {
    tts_audio_quality: 0.95,
    tts_latency: 234,
    tts_buffer_size: 8192,
    tts_underruns: 0,
    packets_sent: 1523,
    bytes_sent: 244352,
    packet_rate: 50,
    delivery_latency: 12,
    stream_continuity: 0.98,
    silence_ratio: 0.15,
    peak_amplitude: -6.5,
    // ... additional metrics
  },
  knobs: [],
  alerts: []
}
```

---

## 6. StationAgent Framework

### Overview
**Location:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring/StationAgent.js`
**Size:** 10,316 bytes
**Backups:**
- `StationAgent.backup.js` (10,348 bytes)
- `StationAgent.js.backup` (5,331 bytes)
- `StationAgent.js.backup-20251208-151915` (10,348 bytes)

### Capabilities
- **Total Metrics:** 75 parameters
- **Total Knobs:** 113 control parameters
- **Stations Supported:** All 11 stations
- **Collection Methods:** Real-time, periodic, event-driven

### Core Methods

```javascript
class StationAgent {
  constructor(stationId, extensionId) {
    this.stationId = stationId;
    this.extensionId = extensionId;
    this.socketClient = null; // Socket.IO client to monitoring-server
    this.metricsCache = {};
    this.knobsCache = {};
  }

  // Collect metrics and emit to monitoring-server
  async collect(context) {
    const metrics = await this.gatherMetrics(context);
    const knobs = await this.gatherKnobs();
    const alerts = this.checkAlerts(metrics, knobs);

    const data = {
      station_id: this.stationId,
      extension: this.extensionId,
      call_id: context.call_id,
      timestamp: new Date().toISOString(),
      metrics,
      knobs_effective: knobs,
      alerts
    };

    // Emit to monitoring-server
    if (this.socketClient && this.socketClient.connected) {
      this.socketClient.emit('metrics', data);
    }

    return data;
  }

  // Gather all 75 metrics
  async gatherMetrics(context) {
    return {
      // Audio metrics (10)
      snr: this.calculateSNR(),
      audio_level: this.getAudioLevel(),
      // ... 8 more audio metrics

      // Latency metrics (8)
      stt_latency: this.getSTTLatency(),
      mt_latency: this.getMTLatency(),
      // ... 6 more latency metrics

      // System metrics (12)
      cpu_usage: this.getCPUUsage(),
      memory_usage: this.getMemoryUsage(),
      // ... 10 more system metrics

      // Network metrics (10)
      packet_loss: this.getPacketLoss(),
      jitter: this.getJitter(),
      // ... 8 more network metrics

      // Quality metrics (15)
      audio_quality_score: this.calculateQuality(),
      // ... 14 more quality metrics

      // Stream metrics (10)
      stream_continuity: this.getStreamContinuity(),
      // ... 9 more stream metrics

      // Processing metrics (10)
      processing_rate: this.getProcessingRate(),
      // ... 9 more processing metrics
    };
  }

  // Gather all 113 knobs
  async gatherKnobs() {
    return [
      // Deepgram knobs (25)
      { name: 'deepgram.model', value: 'nova-3' },
      { name: 'deepgram.language', value: 'en' },
      // ... 23 more Deepgram knobs

      // DeepL knobs (15)
      { name: 'deepl.formality', value: 'default' },
      // ... 14 more DeepL knobs

      // ElevenLabs knobs (20)
      { name: 'elevenlabs.voice_id', value: 'voice-001' },
      // ... 19 more ElevenLabs knobs

      // Audio processing knobs (30)
      { name: 'audio.sample_rate', value: 16000 },
      // ... 29 more audio knobs

      // System knobs (23)
      { name: 'system.max_cpu', value: 80 },
      // ... 22 more system knobs
    ];
  }
}
```

### Related Monitoring Files

**Collectors:**
- Location: `monitoring/collectors/`
- Purpose: Specialized metric collectors for different aspects

**Config:**
- Location: `monitoring/config/`
- Purpose: Configuration files for monitoring behavior

**Utils:**
- Location: `monitoring/utils/`
- Purpose: Utility functions for metric calculation

**Audio:**
- Location: `monitoring/audio/`
- Purpose: Audio-specific monitoring tools

---

## 7. Monitoring Files Inventory

### Primary Monitoring Files

```
/home/azureuser/translation-app/
├── monitoring-server.js                           20,898 bytes  - Central hub
├── monitoring-server.js.backup-simple-fix         20,000 bytes  - Pre-broadcast fix
├── monitoring-to-database-bridge.js                4,019 bytes  - DB bridge (CRITICAL)
├── monitoring-api-bridge.js                        4,632 bytes  - API bridge (optional)
└── continuous-full-monitoring-with-station3.js    15,242 bytes  - 11-station sender

/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/
├── station3-handler.js                             3,045 bytes  - Station-3 handler
├── station3-handler.js.backup-20251208-213909      3,000 bytes  - Pre-200ms fix
├── station9-handler.js                             2,375 bytes  - Station-9 handler
└── monitoring-integration.js                       3,100 bytes  - Integration module

/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring/
├── StationAgent.js                                10,316 bytes  - Main agent (75 metrics)
├── StationAgent.backup.js                         10,348 bytes  - Backup
├── StationAgent.js.backup                          5,331 bytes  - Old backup
├── StationAgent.js.backup-20251208-151915         10,348 bytes  - Recent backup
├── StationAgent-Unified.js                         3,773 bytes  - Unified agent
├── UnifiedStationCollector.js                      8,199 bytes  - Unified collector
├── UnifiedStationCollector-original.js            18,846 bytes  - Original collector
├── UniversalCollector.js                           8,784 bytes  - Universal collector
├── RealTimeMetricsProvider.js                     10,670 bytes  - Real-time provider
├── RealTimeMetricsProvider-Complete.js            14,760 bytes  - Complete provider
├── dashboard-server.js                             9,674 bytes  - Dashboard server
├── database-integration-module.js                 14,383 bytes  - DB integration
├── monitoring-dashboard-75param.html              46,799 bytes  - 75-param dashboard
├── monitoring-server-11stations.js                 6,740 bytes  - 11-station server
├── monitoring-server-55param-backup.js            35,002 bytes  - Old 55-param version
├── monitoring-server-75param.js                   36,694 bytes  - 75-param server
├── monitoring-server-ai-calibration.js            35,002 bytes  - AI calibration
├── monitoring-server-backup-20251126-103127.js    13,157 bytes  - Nov 26 backup
├── monitoring-server-backup-pre-avgfix...js       36,694 bytes  - Pre-average fix
├── monitoring-server-github.js                    44,760 bytes  - GitHub version
└── monitoring-server-real-data.js                 14,760 bytes  - Real data server
```

### Total File Count
- **Main monitoring files:** 5
- **Station handlers:** 3
- **StationAgent files:** 10
- **Monitoring support:** 12
- **Subdirectory files:** ~20 (collectors, config, utils, audio)
- **Total:** ~50 monitoring-related files

---

## 8. Data Formats & Protocols

### Legacy Metrics Format

**Event:** `socket.on('metrics')`
**Used by:** STTTTSserver → monitoring-server

```javascript
{
  station_id: 'STATION_3',
  extension: '3333',
  channel: '3333',              // Legacy field
  call_id: 'STATION_3-1765232875623',
  timestamp: '2025-12-09T22:28:08.123Z',
  metrics: {
    snr: 25.3,
    audio_level: -18.5,
    // ... all metrics
  },
  knobs_effective: [            // Array format
    { name: 'deepgram.model', value: 'nova-3' },
    // ... all knobs
  ],
  alerts: []
}
```

### Unified Metrics Format

**Event:** `socket.on('unified-metrics')`
**Used by:** monitoring-server → bridges

```javascript
{
  station_id: 'STATION_3',
  extension: '3333',
  call_id: 'STATION_3-1765232875623',
  timestamp: '2025-12-09T22:28:08.123Z',
  metrics: {
    snr: 25.3,
    audio_level: -18.5,
    // ... all metrics
  },
  knobs: [],                    // Array format
  alerts: [],
  metadata: {
    state: 'active',
    legacy_format: false,       // Conversion indicator
    source: 'real-data'         // 'real-data' or 'generated'
  },
  metric_count: 23,             // Helper field
  knob_count: 0                 // Helper field
}
```

### Metrics Update Event

**Event:** `socket.on('metrics-update')`
**Used by:** monitoring-server → dashboards

```javascript
{
  station_id: 'STATION_3',
  extension: '3333',
  key: 'STATION_3_3333',        // Composite key
  data: {
    // Full unified-metrics object
  }
}
```

### Database Snapshot Format

**Endpoint:** `POST /store-snapshot`
**Used by:** monitoring-to-database-bridge → database-api-server

```javascript
{
  station_id: 'STATION_3',
  extension: '3333',
  timestamp: '2025-12-09T22:28:08.123Z',
  metrics: { /* all metrics */ },
  knobs: [],
  alerts: [],
  metadata: {
    source: 'real-data',
    collection_time: 200
  }
}
```

### API Response Format

**Endpoint:** `GET /api/snapshots`
**Returns:** Array of last 100 snapshots

```javascript
[
  {
    station_id: 'STATION_3',
    extension: '3333',
    timestamp: '2025-12-09T22:28:08.123Z',
    metrics: { /* ... */ },
    knobs: [],
    alerts: []
  },
  // ... up to 100 snapshots
]
```

---

## 9. Monitoring Bridges

### monitoring-to-database-bridge

**Purpose:** Forward real-time metrics to database for API access

**Flow:**
```
monitoring-server:3001 (Socket.IO)
    ↓ 'unified-metrics' event
monitoring-to-database-bridge
    ↓ HTTP POST
database-api-server:8083/store-snapshot
```

**Code Pattern:**
```javascript
const io = require('socket.io-client');
const axios = require('axios');

const socket = io('http://20.170.155.53:3001');

socket.on('unified-metrics', async (data) => {
  try {
    await axios.post('http://localhost:8083/store-snapshot', data);
    console.log(`[${timestamp}] ✅ Stored ${data.station_id}-${data.extension}: ${data.metric_count} metrics`);
  } catch (error) {
    // Silent fail - don't crash
    console.error(`[${timestamp}] ❌ Failed to store snapshot:`, error.message);
  }
});
```

**CRITICAL NOTE:** This bridge is NOT documented in the installation guide but is REQUIRED for the public API to work!

### monitoring-api-bridge

**Purpose:** Serve real-time Station-3 and Station-9 data via HTTP API

**Flow:**
```
monitoring-server:3001 (Socket.IO)
    ↓ 'unified-metrics' event
monitoring-api-bridge (in-memory cache)
    ↓ HTTP GET
Client: GET /api/station3
```

**Endpoints:**
```javascript
// GET /api/station3
// Returns current Station-3 and Station-9 data for all extensions
{
  "STATION_3_3333": {
    metrics: { /* 23 metrics */ },
    knobs: [],
    status: 'active',
    timestamp: '2025-12-09T22:28:08.123Z'
  },
  "STATION_3_4444": {
    metrics: { /* 24 metrics */ },
    knobs: [],
    status: 'active',
    timestamp: '2025-12-09T22:28:08.456Z'
  }
}
```

**Cache Strategy:**
- Store last received data for each extension
- Update on every 'unified-metrics' event
- No TTL - always returns most recent data
- No persistence - data lost on restart

**Used By:**
- `continuous-full-monitoring-with-station3.js` (fetches every 1.5 seconds)
- External monitoring dashboards
- Testing tools

---

## 10. Public API Access

### Cloudflared Tunnel

**PID:** 1345193
**Local Target:** localhost:8083 (database-api-server)
**Public URL:** `https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots`

**Purpose:** Expose monitoring data via public HTTPS without port forwarding or SSL certificates

**Configuration:**
```bash
cd /home/azureuser
nohup ./cloudflared-linux-amd64 tunnel --url http://localhost:8083 > /tmp/cloudflared.log 2>&1 &
```

**Log File:** `/tmp/cloudflared.log`

**Note:** URL changes on every cloudflared restart (temporary tunnel mode)

### Public Endpoint Usage

```bash
# Fetch latest 100 snapshots
curl https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots

# Returns JSON array
[
  {
    "station_id": "STATION_3",
    "extension": "3333",
    "timestamp": "2025-12-09T22:28:08.123Z",
    "metrics": {
      "snr": 25.3,
      "audio_level": -18.5,
      // ... 21 more metrics
    },
    "metric_count": 23,
    "knob_count": 0
  },
  // ... up to 100 snapshots
]
```

### Access Verification

```bash
# Test 1: Check local API
curl http://localhost:8083/api/snapshots

# Test 2: Check public API
curl https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots

# Test 3: Monitor real-time updates
watch -n 1 'curl -s https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots | jq ".[0].timestamp"'
```

---

## 11. Configuration & Knobs

### Station-3 Configuration File

**Location:** `/tmp/STATION_3-{extension}-config.json`
**Poll Frequency:** 100ms
**Purpose:** Dynamic configuration without restart

**Example:**
```json
{
  "deepgram": {
    "model": "nova-3",
    "language": "en",
    "punctuate": true,
    "interimResults": true,
    "endpointing": 300,
    "vadTurnoff": 500,
    "smartFormat": true,
    "diarize": false
  }
}
```

### Knob Categories (113 Total)

#### Deepgram Knobs (25)
```javascript
{
  "deepgram.model": "nova-3",           // Model selection
  "deepgram.language": "en",            // Language code
  "deepgram.punctuate": true,           // Add punctuation
  "deepgram.interimResults": true,      // Send interim results
  "deepgram.endpointing": 300,          // Endpointing delay (ms)
  "deepgram.vadTurnoff": 500,           // VAD turnoff (ms)
  "deepgram.smartFormat": true,         // Smart formatting
  "deepgram.diarize": false,            // Speaker diarization
  // ... 17 more Deepgram knobs
}
```

#### DeepL Knobs (15)
```javascript
{
  "deepl.formality": "default",         // Formality level
  "deepl.splitSentences": true,         // Sentence splitting
  "deepl.preserveFormatting": true,     // Format preservation
  // ... 12 more DeepL knobs
}
```

#### ElevenLabs Knobs (20)
```javascript
{
  "elevenlabs.voice_id": "voice-001",   // Voice selection
  "elevenlabs.stability": 0.75,         // Voice stability
  "elevenlabs.similarity_boost": 0.75,  // Similarity boost
  // ... 17 more ElevenLabs knobs
}
```

#### Audio Processing Knobs (30)
```javascript
{
  "audio.sample_rate": 16000,           // Sample rate (Hz)
  "audio.channels": 1,                  // Channel count
  "audio.encoding": "linear16",         // Audio encoding
  "audio.buffer_size": 8192,            // Buffer size
  // ... 26 more audio knobs
}
```

#### System Knobs (23)
```javascript
{
  "system.max_cpu": 80,                 // Max CPU usage (%)
  "system.max_memory": 2048,            // Max memory (MB)
  "system.collection_interval": 200,    // Collection interval (ms)
  // ... 20 more system knobs
}
```

---

## 12. Log Patterns & Monitoring

### STTTTSserver Logs

**File:** `/tmp/STTTTSserver-guide.log`

**Pattern:**
```
[STATION_3-3333] 📊 Sent metrics to monitoring (call: STATION_3-1765232875623)
[STATION_3-3333] 📊 Sent metrics to monitoring (call: STATION_3-1765232875623)
[STATION_3-4444] 📊 Sent metrics to monitoring (call: STATION_3-1765232875624)
[STATION_3-4444] 📊 Sent metrics to monitoring (call: STATION_3-1765232875624)
```

**Frequency:** Every ~200ms per extension
**Indicates:** Successful metric collection and emission

### monitoring-server Logs

**File:** `/tmp/monitoring-guide.log`

**Pattern:**
```
[Monitoring Server] ⚠️ Received legacy 'metrics' event from STATION_3
  - Consider upgrading to StationAgent-Unified for full 75 metrics + 113 knobs
[Monitoring Server] 📊 Processed legacy metrics for STATION_3_3333
[Monitoring Server] 📊 Processed legacy metrics for STATION_3_4444
```

**Indicates:** Receiving and processing metrics, converting to unified format

### monitoring-to-database-bridge Logs

**File:** `/tmp/monitoring-to-database-NEW.log`

**Pattern:**
```
[10:28:08 PM] ✅ Stored STATION_3-3333: 23 metrics, 0 knobs
[10:28:08 PM] ✅ Stored STATION_3-4444: 24 metrics, 0 knobs
[10:28:09 PM] ✅ Stored STATION_3-3333: 23 metrics, 0 knobs
[10:28:09 PM] ✅ Stored STATION_3-4444: 24 metrics, 0 knobs
```

**Frequency:** Every ~200ms per extension
**Indicates:** Successful forwarding to database-api-server

### database-api-server Logs

**File:** `/tmp/database-api-guide.log`

**Pattern:**
```
[Database API] POST /store-snapshot - Stored snapshot for STATION_3-3333
[Database API] POST /store-snapshot - Stored snapshot for STATION_3-4444
[Database API] GET /api/snapshots - Returned 100 snapshots
```

**Indicates:** Snapshot storage and API requests

### Monitoring Health Check

```bash
# Check all monitoring processes
ps aux | grep -E 'monitoring-server|monitoring-to-database-bridge|database-api-server'

# Check monitoring logs for errors
tail -f /tmp/monitoring-guide.log | grep -i error
tail -f /tmp/monitoring-to-database-NEW.log | grep -i error
tail -f /tmp/database-api-guide.log | grep -i error

# Check Station-3 collection rate
tail -f /tmp/STTTTSserver-guide.log | grep STATION-3 | ts '[%H:%M:%.S]'

# Verify 200ms collection (should see ~5 per second)
tail -f /tmp/STTTTSserver-guide.log | grep 'STATION_3-3333' | pv -l -i 1
```

---

## 13. Troubleshooting Guide

### Issue 1: Public API Returns Empty Array

**Symptom:**
```bash
curl https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots
# Returns: []
```

**Cause:** monitoring-to-database-bridge not running

**Diagnosis:**
```bash
ps aux | grep monitoring-to-database-bridge
# Should show running process
```

**Fix:**
```bash
cd /home/azureuser/translation-app
nohup node monitoring-to-database-bridge.js > /tmp/monitoring-to-database-NEW.log 2>&1 &
```

**Verification:**
```bash
# Wait 2 seconds, then check
sleep 2
tail -20 /tmp/monitoring-to-database-NEW.log
# Should see: ✅ Stored STATION_3-3333: 23 metrics, 0 knobs
```

### Issue 2: No Station-3 Metrics Appearing

**Symptom:** No metrics in STTTTSserver logs

**Cause 1:** STTTTSserver started before monitoring-server

**Diagnosis:**
```bash
# Check monitoring-server is running
ps aux | grep monitoring-server | grep -v grep

# Check STTTTSserver connection
tail -50 /tmp/STTTTSserver-guide.log | grep -i 'connect\|socket'
```

**Fix:**
```bash
# Restart STTTTSserver
pkill -f STTTTSserver
sleep 2
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
nohup node STTTTSserver.js > /tmp/STTTTSserver-guide.log 2>&1 &
```

**Cause 2:** Station-3 handler not initialized

**Diagnosis:**
```bash
tail -100 /tmp/STTTTSserver-guide.log | grep STATION-3
# Should see: [STATION-3] Initialized for extension...
```

**Fix:** Restart STTTTSserver (see above)

### Issue 3: Metrics Stop Flowing

**Symptom:** Metrics were flowing, then stopped

**Diagnosis:**
```bash
# Check all monitoring processes
ps aux | grep -E 'monitoring-server|STTTTSserver|database-api-server|monitoring-to-database-bridge'

# Check for crashes in logs
tail -100 /tmp/monitoring-guide.log | grep -i 'error\|crash\|exception'
tail -100 /tmp/STTTTSserver-guide.log | grep -i 'error\|crash\|exception'
tail -100 /tmp/monitoring-to-database-NEW.log | grep -i 'error\|crash\|exception'
```

**Common Causes:**
1. Process crashed - Restart it
2. Socket.IO disconnected - Restart STTTTSserver
3. Network issue - Check connectivity
4. Memory leak - Restart all services

**Full Restart Procedure:**
```bash
# Kill all monitoring processes
pkill -f monitoring-server
pkill -f monitoring-to-database-bridge
pkill -f database-api-server
pkill -f STTTTSserver

# Wait for cleanup
sleep 3

# Restart in order
cd /home/azureuser/translation-app

# 1. database-api-server
nohup node database-api-server.js > /tmp/database-api-guide.log 2>&1 &
sleep 2

# 2. monitoring-server
nohup node monitoring-server.js > /tmp/monitoring-guide.log 2>&1 &
sleep 2

# 3. STTTTSserver
cd 3333_4444__Operational/STTTTSserver
nohup node STTTTSserver.js > /tmp/STTTTSserver-guide.log 2>&1 &
sleep 3

# 4. monitoring-to-database-bridge
cd /home/azureuser/translation-app
nohup node monitoring-to-database-bridge.js > /tmp/monitoring-to-database-NEW.log 2>&1 &
sleep 3

# Verify
tail -20 /tmp/monitoring-to-database-NEW.log
```

### Issue 4: Metric Count Mismatch

**Symptom:** Metric count varies (23 vs 24 metrics)

**Cause:** Normal - metric count depends on call state

**Explanation:**
- Active calls: 23-24 metrics
- Idle state: Fewer metrics
- Different call states: Different metric availability

**Not an error** - this is expected behavior

### Issue 5: Broadcasting Not Working

**Symptom:** monitoring-to-database-bridge not receiving metrics

**Cause:** monitoring-server using `socket.emit()` instead of `io.emit()`

**Diagnosis:**
```bash
grep "socket.emit('unified-metrics'" /home/azureuser/translation-app/monitoring-server.js
# Should return nothing (fixed version uses io.emit)
```

**Fix:** Already applied - monitoring-server.js uses `io.emit()`

**Verification:**
```bash
grep "io.emit('unified-metrics'" /home/azureuser/translation-app/monitoring-server.js
# Should return match
```

---

## 14. Metrics Reference

### Complete Metric List (75 Total)

#### Audio Quality Metrics (10)
```
1.  snr                    - Signal-to-Noise Ratio (dB)
2.  audio_level            - Audio level (dBFS)
3.  audio_quality_score    - Overall quality (0-1)
4.  peak_amplitude         - Peak level (dBFS)
5.  rms_amplitude          - RMS level (dBFS)
6.  silence_ratio          - Silence percentage
7.  clipping_events        - Clipping count
8.  dynamic_range          - Dynamic range (dB)
9.  spectral_centroid      - Spectral centroid (Hz)
10. zero_crossing_rate     - Zero crossing rate
```

#### Latency Metrics (8)
```
11. stt_latency            - STT processing (ms)
12. mt_latency             - Translation (ms)
13. tts_latency            - TTS generation (ms)
14. end_to_end_latency     - Total pipeline (ms)
15. network_latency        - Network delay (ms)
16. processing_latency     - Processing delay (ms)
17. queue_latency          - Queue wait time (ms)
18. delivery_latency       - Delivery time (ms)
```

#### System Resource Metrics (12)
```
19. cpu_usage              - CPU usage (%)
20. memory_usage           - Memory usage (MB)
21. heap_used              - Node heap used (MB)
22. heap_total             - Node heap total (MB)
23. process_uptime         - Process uptime (s)
24. event_loop_lag         - Event loop lag (ms)
25. gc_pause_time          - GC pause time (ms)
26. thread_count           - Active threads
27. handle_count           - Open handles
28. file_descriptor_count  - Open file descriptors
29. socket_count           - Open sockets
30. timer_count            - Active timers
```

#### Network Metrics (10)
```
31. packet_loss            - Packet loss (%)
32. jitter                 - Network jitter (ms)
33. bandwidth_usage        - Bandwidth (kbps)
34. packets_sent           - Packets sent
35. packets_received       - Packets received
36. bytes_sent             - Bytes sent
37. bytes_received         - Bytes received
38. packet_rate            - Packets/second
39. retransmit_count       - Retransmissions
40. connection_quality     - Connection quality (0-1)
```

#### Stream Quality Metrics (15)
```
41. stream_continuity      - Continuity score (0-1)
42. buffer_underruns       - Underrun count
43. buffer_overruns        - Overrun count
44. frame_drops            - Dropped frames
45. sync_errors            - Sync errors
46. timestamp_drift        - Timestamp drift (ms)
47. audio_gaps             - Gap count
48. audio_overlaps         - Overlap count
49. stream_restarts        - Restart count
50. error_recovery_time    - Recovery time (ms)
51. stream_stability       - Stability score (0-1)
52. quality_degradation    - Degradation events
53. bitrate_variation      - Bitrate variance
54. frame_size_variance    - Frame size variance
55. timing_accuracy        - Timing accuracy (0-1)
```

#### Processing Metrics (10)
```
56. processing_rate        - Processing rate (frames/s)
57. queue_depth            - Queue depth
58. active_tasks           - Active tasks
59. pending_tasks          - Pending tasks
60. completed_tasks        - Completed tasks
61. failed_tasks           - Failed tasks
62. task_success_rate      - Success rate (0-1)
63. average_task_time      - Avg task time (ms)
64. peak_task_time         - Peak task time (ms)
65. task_timeout_count     - Timeout count
```

#### Service-Specific Metrics (10)
```
66. deepgram_connections   - Active Deepgram connections
67. deepgram_errors        - Deepgram error count
68. deepl_requests         - DeepL request count
69. deepl_errors           - DeepL error count
70. elevenlabs_connections - ElevenLabs connections
71. elevenlabs_errors      - ElevenLabs error count
72. tts_buffer_size        - TTS buffer size
73. tts_underruns          - TTS underrun count
74. stt_interim_results    - STT interim count
75. translation_cache_hits - Translation cache hits
```

---

## Document Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-09 | 1.0 | Initial monitoring-focused documentation | Claude Sonnet 4.5 |

---

**END OF MONITORING SYSTEM DOCUMENTATION**
