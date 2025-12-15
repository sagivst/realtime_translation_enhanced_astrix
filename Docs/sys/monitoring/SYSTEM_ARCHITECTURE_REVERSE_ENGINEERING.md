# System Architecture - Reverse Engineering Documentation
## Real-Time Translation System with Station-3 & Station-9 Monitoring

**Generated:** 2025-12-09
**System:** Azure VM 20.170.155.53
**Purpose:** Complete documentation of all files, processes, architecture, and data flows

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Active Processes Inventory](#active-processes-inventory)
3. [Complete File Structure](#complete-file-structure)
4. [Data Flow Architecture](#data-flow-architecture)
5. [Port Mappings](#port-mappings)
6. [Service Dependencies](#service-dependencies)
7. [Monitoring System Architecture](#monitoring-system-architecture)
8. [Station-3 & Station-9 Implementation](#station-3--station-9-implementation)
9. [Backup Files Inventory](#backup-files-inventory)
10. [Deprecated/Old Processes](#deprecatedold-processes)
11. [Startup Sequence](#startup-sequence)

---

## 1. System Overview

### System Components
- **Azure VM**: 20.170.155.53
- **Operating System**: Ubuntu Linux
- **Core Infrastructure**: PostgreSQL, Asterisk PBX
- **Runtime**: Node.js for all application services
- **Public Access**: Cloudflared tunnel (HTTPS)

### Primary Function
Real-time bidirectional translation system with comprehensive monitoring:
- Extensions 3333 (English) and 4444 (French)
- Speech-to-Text (STT): Deepgram
- Translation: DeepL
- Text-to-Speech (TTS): ElevenLabs
- Monitoring: 75 metrics + 113 knobs across 11 stations

---

## 2. Active Processes Inventory

### Core Infrastructure (Always Running)

#### PostgreSQL Database
- **PID**: 2585998
- **Port**: 5432 (localhost only)
- **Purpose**: Backend database for all application data
- **Config**: Standard PostgreSQL configuration
- **Status**: CRITICAL - Never restart without explicit permission

#### Asterisk PBX
- **PID**: 744006
- **Ports**:
  - 5038 (AMI - Asterisk Manager Interface)
  - 8088 (ARI - Asterisk REST Interface)
  - 9060, 9061, 9096 (PJSIP)
  - 9000 (HTTP)
- **Purpose**: Telephony engine, handles SIP extensions and conferences
- **Status**: CRITICAL - Never restart without explicit permission

### Application Services (Current Session)

#### 1. database-api-server
- **PID**: 1398327
- **Port**: 8083
- **File**: `/home/azureuser/translation-app/database-api-server.js`
- **Size**: 2,071 bytes
- **Log**: `/tmp/database-api-guide.log`
- **Purpose**: HTTP API server for monitoring snapshots
- **Endpoints**:
  - `GET /api/snapshots` - Returns last 100 monitoring snapshots
- **Data Source**: Receives POST requests from monitoring-to-database-bridge
- **Status**: ACTIVE - Required for public API

#### 2. monitoring-server
- **PID**: 1400548
- **Ports**:
  - 3001 (Socket.IO)
  - 8080 (HTTP)
- **File**: `/home/azureuser/translation-app/monitoring-server.js`
- **Size**: 20,898 bytes
- **Log**: `/tmp/monitoring-guide.log`
- **Purpose**: Central Socket.IO hub for all monitoring data
- **Key Fix Applied**: Changed `socket.emit` to `io.emit` for broadcasting
- **Backup**: `monitoring-server.js.backup-simple-fix`
- **Status**: ACTIVE - Central monitoring hub

#### 3. STTTTSserver
- **PID**: 1402819
- **Port**:
  - 3020 (HTTP conference API)
  - 6211 (Socket.IO)
- **File**: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js`
- **Size**: 152,346 bytes
- **Log**: `/tmp/STTTTSserver-guide.log`
- **Purpose**: Main translation server, handles STT → MT → TTS pipeline
- **Key Features**:
  - Station-3 monitoring (200ms collection interval)
  - Station-9 monitoring (TTS output metrics)
  - Asterisk ARI integration
  - Conference management
- **Status**: ACTIVE - Core translation engine

#### 4. gateway-3333
- **PID**: 1406914
- **UDP Ports**: 4000, 4001
- **File**: `/home/azureuser/translation-app/3333_4444__Operational/gateway-3333.js`
- **Size**: 5,200 bytes
- **Log**: `/tmp/gateway-3333-final.log`
- **Purpose**: Audio gateway for extension 3333 (English)
- **Status**: ACTIVE - Handles English audio streams

#### 5. gateway-4444
- **PID**: 1415157
- **UDP Ports**: 4002, 4003
- **File**: `/home/azureuser/translation-app/3333_4444__Operational/gateway-4444.js`
- **Size**: 5,400 bytes
- **Log**: `/tmp/gateway-4444-correct.log`
- **Purpose**: Audio gateway for extension 4444 (French)
- **Initial Issue**: Failed to start due to wrong directory
- **Fix Applied**: Added `cd` command to working directory
- **Status**: ACTIVE - Handles French audio streams

#### 6. ari-gstreamer-operational
- **PID**: 1409206
- **File**: `/home/azureuser/translation-app/3333_4444__Operational/ari-gstreamer-operational.js`
- **Size**: 6,300 bytes
- **Log**: `/tmp/ari-final.log`
- **Purpose**: Handles Asterisk ARI external media
- **Status**: ACTIVE - ARI integration

#### 7. monitoring-to-database-bridge
- **PID**: 1428739
- **File**: `/home/azureuser/translation-app/monitoring-to-database-bridge.js`
- **Size**: 4,019 bytes
- **Log**: `/tmp/monitoring-to-database-NEW.log`
- **Purpose**: Forwards monitoring data from monitoring-server to database-api-server
- **Critical Note**: NOT in installation guide, must be started manually
- **Data Flow**: Listens to Socket.IO events → POSTs to database-api-server
- **Log Pattern**:
  ```
  [10:28:08 PM] ✅ Stored STATION_3-3333: 23 metrics, 0 knobs
  [10:28:08 PM] ✅ Stored STATION_3-4444: 24 metrics, 0 knobs
  ```
- **Status**: ACTIVE - Critical data bridge

#### 8. cloudflared
- **PID**: 1345193
- **Local Port**: 20241
- **File**: `/home/azureuser/cloudflared-linux-amd64`
- **Log**: `/tmp/cloudflared.log`
- **Purpose**: Public HTTPS tunnel to localhost:8083
- **Public URL**: `https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots`
- **Target**: database-api-server (port 8083)
- **Status**: ACTIVE - Public API access

### Monitoring Support Services

#### monitoring-api-bridge
- **Port**: 3009
- **File**: `/home/azureuser/translation-app/monitoring-api-bridge.js`
- **Size**: 4,632 bytes
- **Purpose**: Provides HTTP API for Station-3 and Station-9 data
- **Endpoint**: `GET /api/station3` - Returns real-time Station-3/9 data
- **Status**: OPTIONAL - Used by continuous-full-monitoring-with-station3.js

#### continuous-full-monitoring-with-station3
- **File**: `/home/azureuser/translation-app/continuous-full-monitoring-with-station3.js`
- **Size**: 15,242 bytes
- **Purpose**: Sends monitoring data for all 11 stations (real data for Station-3 and Station-9, generated for others)
- **Data Source**: Fetches from monitoring-api-bridge
- **Cache TTL**: 1.5 seconds
- **Status**: OPTIONAL - For testing with all 11 stations

---

## 3. Complete File Structure

### Main Application Directory
**Location**: `/home/azureuser/translation-app/`

#### Active Core Files
```
asterisk-ari-handler.js                    13,312 bytes  - Legacy ARI handler
conference-server.js                       51,119 bytes  - Conference management
continuous-full-monitoring.js              11,264 bytes  - Old monitoring sender
continuous-full-monitoring-with-station3.js 15,242 bytes - Current 11-station monitoring
database-api-server.js                      2,071 bytes  - HTTP API for snapshots
database-integration-v2.1-compliant.js     26,624 bytes  - Database integration
db-config.js                                   38 bytes  - Database configuration
elevenlabs-tts-service.js                   7,424 bytes  - ElevenLabs TTS service
latency-collector-integration.js            8,320 bytes  - Latency collection
latency-collector.js                       13,312 bytes  - Latency tracking
latency-control-backend.js                  5,300 bytes  - Latency control
monitoring-api-bridge.js                    4,632 bytes  - Station-3/9 API bridge
monitoring-server.js                       20,898 bytes  - Central monitoring hub
monitoring-to-database-bridge.js            4,019 bytes  - Monitoring → Database bridge
proxy-8080-api-only.js                      5,120 bytes  - Proxy for API
proxy-8080-complete.js                     11,264 bytes  - Complete proxy
proxy-8080-fixed.js                         3,300 bytes  - Fixed proxy
proxy-8080.js                               1,600 bytes  - Basic proxy
proxy-8080-with-api.js                      3,840 bytes  - Proxy with API
punctuation.js                              4,400 bytes  - Punctuation handling
send-full-monitoring-data.js               11,264 bytes  - Monitoring data sender
send-new-test.js                            1,536 bytes  - Test sender
send-test-update.js                         1,408 bytes  - Test update sender
server.js                                   3,840 bytes  - Legacy server
setup-elevenlabs-voices.js                  6,200 bytes  - ElevenLabs voice setup
simple-proxy-8080.js                        1,600 bytes  - Simple proxy
simplified-database-server.js                   0 bytes  - Empty file
test-broadcast.js                           2,100 bytes  - Broadcast test
test-punctuation.js                         2,900 bytes  - Punctuation test
test-sttts-monitoring.js                    5,200 bytes  - STTTS monitoring test
```

### Operational Directory
**Location**: `/home/azureuser/translation-app/3333_4444__Operational/`

#### Active Files
```
ari-gstreamer-operational.js                6,300 bytes  - ARI external media handler
gateway-3333.js                             5,200 bytes  - Extension 3333 audio gateway
gateway-4444.js                             5,400 bytes  - Extension 4444 audio gateway
```

### STTTTSserver Directory
**Location**: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/`

#### Core Translation Files
```
STTTTSserver.js                           152,346 bytes  - Main translation server
asterisk-ari-handler.js                    20,480 bytes  - ARI handler
audio-converter.js                          5,500 bytes  - Audio format converter
audio-stream-buffer.js                     19,456 bytes  - Audio buffering
audio-streaming-direct.js                  12,288 bytes  - Direct audio streaming
audio-streaming-extension.js               19,456 bytes  - Extension audio streaming
audio-streaming-global.js                   8,704 bytes  - Global audio streaming
database-integration-module.js                205 bytes  - Database stub
deepgram-streaming-client.js               13,312 bytes  - Deepgram STT client
deepl-incremental-mt.js                    14,336 bytes  - DeepL translation
elevenlabs-tts-service.js                  14,336 bytes  - ElevenLabs TTS
elevenlabs-websocket-service.js             5,100 bytes  - ElevenLabs WebSocket
externalmedia-integration.js                3,300 bytes  - External media
frame-collector.js                         13,312 bytes  - Audio frame collection
hume-streaming-client.js                       21 bytes  - Hume AI stub
integrate-real-monitoring.js                2,200 bytes  - Monitoring integration
latency-sync-manager.js                    14,336 bytes  - Latency synchronization
monitor-7777-8888.js                       16,384 bytes  - Port 7777-8888 monitor
monitoring-integration.js                   3,100 bytes  - Monitoring integration
pacing-governor.js                         13,312 bytes  - Pacing control
prosodic-segmenter.js                      12,288 bytes  - Prosodic segmentation
```

#### Station Handlers
```
station3-handler.js                         3,045 bytes  - Station-3 handler (200ms collection)
station3-handler.js.backup-20251208-213909  3,000 bytes  - Backup before 200ms fix
station9-handler.js                         2,375 bytes  - Station-9 handler
```

### Monitoring Directory
**Location**: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring/`

#### Core Monitoring Files
```
StationAgent.js                            10,316 bytes  - Main Station Agent (75 metrics)
StationAgent.backup.js                     10,348 bytes  - Backup
StationAgent.js.backup                      5,331 bytes  - Old backup
StationAgent.js.backup-20251208-151915     10,348 bytes  - Recent backup
StationAgent-Unified.js                     3,773 bytes  - Unified agent
UnifiedStationCollector.js                  8,199 bytes  - Unified collector
UnifiedStationCollector-original.js        18,846 bytes  - Original collector
UniversalCollector.js                       8,784 bytes  - Universal collector
RealTimeMetricsProvider.js                 10,670 bytes  - Real-time metrics
RealTimeMetricsProvider-Complete.js        14,760 bytes  - Complete provider
```

#### Monitoring Support Files
```
dashboard-server.js                         9,674 bytes  - Dashboard server
database-integration-module.js             14,383 bytes  - Database integration
monitoring-dashboard-75param.html          46,799 bytes  - 75-parameter dashboard
monitoring-server-11stations.js             6,740 bytes  - 11-station server
monitoring-server-55param-backup.js        35,002 bytes  - 55-parameter backup
monitoring-server-75param.js               36,694 bytes  - 75-parameter server
monitoring-server-ai-calibration.js        35,002 bytes  - AI calibration
monitoring-server-backup-20251126-103127.js 13,157 bytes - Backup
monitoring-server-backup-pre-avgfix-20251126-145437.js 36,694 bytes - Pre-fix backup
monitoring-server-github.js                44,760 bytes  - GitHub version
monitoring-server-real-data.js             14,760 bytes  - Real data server
```

### Subdirectories

#### collectors/
**Location**: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring/collectors/`
- Contains metric collectors for various monitoring aspects

#### config/
**Location**: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring/config/`
- Configuration files for monitoring system

#### utils/
**Location**: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring/utils/`
- Utility functions for monitoring

#### audio/
**Location**: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring/audio/`
- Audio-related monitoring files

### Old/Deprecated Directories

#### 5555-6666-pcm-crossover/
**Location**: `/home/azureuser/translation-app/5555-6666-pcm-crossover/`
- **Status**: DEPRECATED - Old extension implementation
- Contains:
  - gateway-5555.js, gateway-5555-buffered.js
  - gateway-6666-buffered.js
  - conf-server-phase1.js
  - ari-gstreamer-phase1.js
  - Full node_modules directory

#### manual-backups/
**Location**: `/home/azureuser/translation-app/manual-backups/`
- **Status**: ARCHIVE - Manual backup directory
- Purpose: Manual backups of critical files

---

## 4. Data Flow Architecture

### Complete Monitoring Data Chain

```
┌─────────────────────────────────────────────────────────────┐
│ STATION-3 COLLECTION (200ms interval)                       │
│ Location: STTTTSserver/station3-handler.js                  │
│ Extensions: 3333, 4444                                       │
│ Metrics: 23-24 real metrics (SNR, latency, CPU, memory)     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ STTTTSserver (PID 1402819)                                  │
│ Port: 3020 (HTTP), 6211 (Socket.IO)                         │
│ Emits: 'metrics' event via Socket.IO                        │
│ Target: monitoring-server:3001                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ monitoring-server (PID 1400548)                             │
│ Port: 3001 (Socket.IO), 8080 (HTTP)                         │
│ Receives: 'metrics' event                                   │
│ Broadcasts: io.emit('unified-metrics')                      │
│ Fix Applied: socket.emit → io.emit                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ├──────────────────────────────────────┐
                      ▼                                       ▼
┌─────────────────────────────────────┐   ┌─────────────────────────────────┐
│ monitoring-to-database-bridge       │   │ monitoring-api-bridge           │
│ (PID 1428739)                       │   │ (Port 3009)                     │
│ Listens: 'unified-metrics'          │   │ Provides: GET /api/station3     │
│ Action: POST to database-api-server │   │ For: continuous monitoring      │
└──────────────┬──────────────────────┘   └─────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ database-api-server (PID 1398327)                           │
│ Port: 8083                                                  │
│ Stores: Last 100 snapshots in memory                        │
│ Endpoint: GET /api/snapshots                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ cloudflared (PID 1345193)                                   │
│ Tunnel: localhost:8083 → Public HTTPS                       │
│ Public URL: inter-using-helpful-latitude.trycloudflare.com  │
└─────────────────────────────────────────────────────────────┘
```

### Translation Pipeline (STTTTSserver)

```
┌──────────────────────────────────────────────────────────────────┐
│ Asterisk PBX (Extensions 3333, 4444)                             │
│ SIP Endpoints → Conference Bridge                               │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ ARI External Media (ari-gstreamer-operational.js)                │
│ Receives RTP audio from Asterisk                                 │
│ Forwards to gateways via UDP                                     │
└────────┬─────────────────────────────────────────────────────────┘
         │
         ├─────────────────────────┬────────────────────────────────┐
         ▼                         ▼                                │
┌────────────────────┐   ┌────────────────────┐                    │
│ gateway-3333       │   │ gateway-4444       │                    │
│ UDP: 4000-4001     │   │ UDP: 4002-4003     │                    │
│ English audio      │   │ French audio       │                    │
└────────┬───────────┘   └────────┬───────────┘                    │
         │                         │                                │
         └──────────┬──────────────┘                                │
                    ▼                                               │
┌──────────────────────────────────────────────────────────────────┤
│ STTTTSserver (Main Translation Pipeline)                         │
│                                                                   │
│ 1. Audio Input → PCM 16kHz                                       │
│    ├─ Extension 3333: English audio in                           │
│    └─ Extension 4444: French audio in                            │
│                                                                   │
│ 2. Speech-to-Text (Deepgram)                                     │
│    ├─ Model: nova-3 (configurable via knobs)                     │
│    ├─ Language: Auto-detect (en/fr)                              │
│    └─ Station-3 Monitoring: SNR, latency, CPU, memory            │
│                                                                   │
│ 3. Machine Translation (DeepL)                                   │
│    ├─ EN → FR for extension 3333                                 │
│    └─ FR → EN for extension 4444                                 │
│                                                                   │
│ 4. Text-to-Speech (ElevenLabs)                                   │
│    ├─ Voice selection per extension                              │
│    ├─ Output: PCM audio                                          │
│    └─ Station-9 Monitoring: TTS output metrics                   │
│                                                                   │
│ 5. Audio Output → Asterisk                                       │
│    ├─ Extension 3333: French audio out                           │
│    └─ Extension 4444: English audio out                          │
└───────────────────────────────────────────────────────────────────┘
```

### Conference Management

```
┌──────────────────────────────────────────────────────────────────┐
│ conference-server.js (Legacy)                                    │
│ Purpose: Conference room management                              │
│ Status: Replaced by integrated conference in STTTTSserver        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Port Mappings

### External Ports (Internet-Facing)

| Port | Service | Access | Purpose |
|------|---------|--------|---------|
| 22 | SSH | Public | Remote administration |
| 9060 | PJSIP | Public | SIP signaling (UDP/TCP) |
| 9061 | PJSIP | Public | SIP signaling (UDP/TCP) |
| 9096 | PJSIP | Public | SIP signaling (UDP/TCP) |

### Internal Ports (Localhost Only)

| Port | Service | PID | Purpose |
|------|---------|-----|---------|
| 5432 | PostgreSQL | 2585998 | Database server |
| 5038 | Asterisk AMI | 744006 | Manager Interface |
| 8088 | Asterisk ARI | 744006 | REST Interface |
| 9000 | Asterisk HTTP | 744006 | HTTP server |
| 8123 | Unknown | - | Application service |
| 42665 | Unknown | - | Internal service |
| 20241 | cloudflared | 1345193 | Tunnel metrics |

### Application Ports

| Port | Service | PID | Protocol | Purpose |
|------|---------|-----|----------|---------|
| 3001 | monitoring-server | 1400548 | Socket.IO | Monitoring hub |
| 8080 | monitoring-server | 1400548 | HTTP | Monitoring HTTP |
| 3009 | monitoring-api-bridge | - | HTTP | Station-3/9 API |
| 3020 | STTTTSserver | 1402819 | HTTP | Conference API |
| 6211 | STTTTSserver | 1402819 | Socket.IO | Client connections |
| 8083 | database-api-server | 1398327 | HTTP | Snapshots API |
| 3100 | Unknown | - | TCP | Application service |
| 8090 | Unknown | - | TCP | Application service |
| 9080 | homer-app | 1129 | HTTP | Homer SIP capture |

### UDP Ports (Audio Gateways)

| Ports | Service | PID | Purpose |
|-------|---------|-----|---------|
| 4000-4001 | gateway-3333 | 1406914 | Extension 3333 audio |
| 4002-4003 | gateway-4444 | 1415157 | Extension 4444 audio |

---

## 6. Service Dependencies

### Dependency Graph

```
PostgreSQL (2585998)
└── [No dependencies, core infrastructure]

Asterisk (744006)
└── [No dependencies, core infrastructure]

database-api-server (1398327)
├── Requires: None
└── Used by: cloudflared, monitoring-to-database-bridge

monitoring-server (1400548)
├── Requires: None
└── Used by: STTTTSserver, monitoring-to-database-bridge, monitoring-api-bridge

STTTTSserver (1402819)
├── Requires: Asterisk (ARI), monitoring-server
├── Dependencies: gateway-3333, gateway-4444
└── Used by: monitoring-api-bridge

gateway-3333 (1406914)
├── Requires: Asterisk, STTTTSserver
└── UDP ports: 4000-4001

gateway-4444 (1415157)
├── Requires: Asterisk, STTTTSserver
└── UDP ports: 4002-4003

ari-gstreamer-operational (1409206)
├── Requires: Asterisk (ARI)
└── Dependencies: gateways

monitoring-to-database-bridge (1428739)
├── Requires: monitoring-server, database-api-server
└── Critical: Data chain link

monitoring-api-bridge (Optional)
├── Requires: monitoring-server
└── Used by: continuous-full-monitoring-with-station3.js

cloudflared (1345193)
├── Requires: database-api-server
└── Provides: Public HTTPS access
```

### Critical Startup Order

1. **PostgreSQL** (already running, never stop)
2. **Asterisk** (already running, never stop)
3. **database-api-server** (must start before cloudflared)
4. **monitoring-server** (must start before STTTTSserver)
5. **STTTTSserver** (must start before gateways)
6. **gateway-3333, gateway-4444** (parallel start)
7. **ari-gstreamer-operational**
8. **monitoring-to-database-bridge** (NOT in installation guide, critical)
9. **cloudflared** (optional, for public access)

---

## 7. Monitoring System Architecture

### Station-3 Implementation

**Location**: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station3-handler.js`

#### Key Features
- **Collection Interval**: 200 milliseconds (5 times per second)
- **Extensions Monitored**: 3333, 4444
- **Metrics Collected**: 23-24 real metrics per extension

#### Collected Metrics (Station-3)
```javascript
{
  // Audio Quality
  snr: 25.3,                    // Signal-to-Noise Ratio (dB)
  audio_level: -18.5,           // Audio level (dBFS)

  // Latency
  stt_latency: 145,             // STT processing time (ms)
  mt_latency: 89,               // Translation time (ms)
  tts_latency: 234,             // TTS processing time (ms)
  end_to_end_latency: 468,      // Total pipeline latency (ms)

  // System Resources
  cpu_usage: 34.2,              // CPU usage (%)
  memory_usage: 512.5,          // Memory usage (MB)

  // Network
  packet_loss: 0.02,            // Packet loss rate (%)
  jitter: 12.3,                 // Network jitter (ms)

  // Plus 13-14 additional metrics...
}
```

#### Collection Flow
```javascript
// station3-handler.js
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
        console.error(`[STATION-3-${this.extensionId}] Collection error:`, error.message);
      }
    }
  }, 200); // 200ms = 5 times per second
}
```

#### Config File Polling
- **Path**: `/tmp/STATION_3-{extension}-config.json`
- **Poll Interval**: 100ms
- **Purpose**: Dynamic configuration changes without restart
- **Example Config**:
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

### Station-9 Implementation

**Location**: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station9-handler.js`

#### Key Features
- **Purpose**: Monitor TTS output to Asterisk
- **Extensions**: 3333, 4444
- **Metrics**: TTS-specific metrics

#### Station-9 Metrics
```javascript
{
  // TTS Quality
  tts_audio_quality: 0.95,      // Audio quality score
  tts_latency: 234,             // TTS generation time (ms)
  tts_buffer_size: 8192,        // Output buffer size

  // Output Flow
  packets_sent: 1523,           // UDP packets sent to Asterisk
  bytes_sent: 244352,           // Total bytes sent

  // Plus additional TTS-specific metrics...
}
```

### StationAgent (Core Monitoring Engine)

**Location**: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring/StationAgent.js`

#### Features
- **Total Metrics**: 75 parameters
- **Total Knobs**: 113 control parameters
- **Stations**: 11 total stations across the system
- **Collection Methods**: Real-time, periodic, event-driven

#### Station List (All 11 Stations)
1. **STATION_1**: Asterisk → ARI (Inbound Audio)
2. **STATION_2**: ARI → Gateway (RTP to Gateway)
3. **STATION_3**: Gateway → STT (Audio Input - REAL DATA)
4. **STATION_4**: STT → MT (Speech-to-Text Output)
5. **STATION_5**: MT → TTS (Translation Output)
6. **STATION_6**: TTS → Buffer (TTS Generation)
7. **STATION_7**: Buffer → Gateway (Audio Output)
8. **STATION_8**: Gateway → ARI (Gateway to ARI)
9. **STATION_9**: ARI → Asterisk (TTS Output - REAL DATA)
10. **STATION_10**: Monitoring Hub (Central Metrics)
11. **STATION_11**: External API (Public Metrics)

### Monitoring Data Format

#### Legacy Format (socket.on('metrics'))
```javascript
{
  station_id: 'STATION_3',
  extension: '3333',
  channel: '3333',
  call_id: 'STATION_3-1765232875623',
  timestamp: '2025-12-09T22:28:08.123Z',
  metrics: {
    snr: 25.3,
    audio_level: -18.5,
    // ... 21 more metrics
  },
  knobs_effective: [],
  alerts: []
}
```

#### Unified Format (socket.on('unified-metrics'))
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
  knobs: [],
  alerts: [],
  metadata: {
    state: 'active',
    legacy_format: false
  },
  metric_count: 23,
  knob_count: 0
}
```

### Broadcasting Fix (monitoring-server.js)

**Critical Fix Applied**: Changed `socket.emit` to `io.emit` for proper broadcasting

#### Before (BROKEN)
```javascript
socket.on('metrics', (data) => {
  const unifiedData = convertToUnified(data);
  socket.emit('unified-metrics', unifiedData); // ❌ Only sends to same socket
});
```

#### After (WORKING)
```javascript
socket.on('metrics', (data) => {
  const unifiedData = convertToUnified(data);

  // Update database
  updateStationDatabase(unifiedData);

  // Broadcast to ALL clients
  io.emit('unified-metrics', unifiedData); // ✅ Broadcasts to all clients
  io.emit('metrics-update', {
    station_id: unifiedData.station_id,
    extension: unifiedData.extension,
    key: `${unifiedData.station_id}_${unifiedData.extension}`,
    data: unifiedData
  });
});
```

---

## 8. Station-3 & Station-9 Implementation

### Complete Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ Station-3 Handler (station3-handler.js)                          │
│ - Polls config every 100ms: /tmp/STATION_3-{ext}-config.json    │
│ - Collects metrics every 200ms via StationAgent                  │
│ - Sends to monitoring-server via Socket.IO 'metrics' event       │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ STTTTSserver (PID 1402819)                                       │
│ - Initializes Station3Handler for extensions 3333, 4444          │
│ - Connects to monitoring-server:3001                             │
│ - Emits: socket.emit('metrics', data)                            │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ monitoring-server (PID 1400548)                                  │
│ - Receives: 'metrics' event                                      │
│ - Converts to unified format                                     │
│ - Broadcasts: io.emit('unified-metrics', unifiedData)            │
│ - Broadcasts: io.emit('metrics-update', updateData)              │
└────────┬──────────────────────────────────────────┬──────────────┘
         │                                           │
         ▼                                           ▼
┌────────────────────────────────┐    ┌──────────────────────────────┐
│ monitoring-to-database-bridge  │    │ monitoring-api-bridge        │
│ (PID 1428739)                  │    │ (Port 3009)                  │
│ - Listens: 'unified-metrics'   │    │ - Stores in memory           │
│ - POST to database-api-server  │    │ - GET /api/station3          │
└────────┬───────────────────────┘    └──────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│ database-api-server (PID 1398327, Port 8083)                       │
│ - Stores last 100 snapshots in memory                              │
│ - GET /api/snapshots                                               │
└────────┬───────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│ cloudflared (PID 1345193)                                          │
│ - Public HTTPS: inter-using-helpful-latitude.trycloudflare.com     │
│ - Target: localhost:8083                                           │
└────────────────────────────────────────────────────────────────────┘
```

### Log Patterns

#### STTTTSserver Log
```
[STATION_3-3333] 📊 Sent metrics to monitoring (call: STATION_3-1765232875623)
[STATION_3-3333] 📊 Sent metrics to monitoring (call: STATION_3-1765232875623)
[STATION_3-3333] 📊 Sent metrics to monitoring (call: STATION_3-1765232875623)
```
**Frequency**: Every ~200ms per extension

#### monitoring-server Log
```
[Monitoring Server] ⚠️ Received legacy 'metrics' event from STATION_3
  - Consider upgrading to StationAgent-Unified for full 75 metrics + 113 knobs
[Monitoring Server] 📊 Processed legacy metrics for STATION_3_3333
[Monitoring Server] 📊 Processed legacy metrics for STATION_3_4444
```

#### monitoring-to-database-bridge Log
```
[10:28:08 PM] ✅ Stored STATION_3-3333: 23 metrics, 0 knobs
[10:28:08 PM] ✅ Stored STATION_3-4444: 24 metrics, 0 knobs
[10:28:09 PM] ✅ Stored STATION_3-3333: 23 metrics, 0 knobs
[10:28:09 PM] ✅ Stored STATION_3-4444: 24 metrics, 0 knobs
```
**Frequency**: Every ~200ms per extension

#### database-api-server Log
```
[Database API] POST /store-snapshot - Stored snapshot for STATION_3-3333
[Database API] POST /store-snapshot - Stored snapshot for STATION_3-4444
[Database API] GET /api/snapshots - Returned 100 snapshots
```

---

## 9. Backup Files Inventory

### Monitoring Server Backups

```
monitoring-server.js.backup-simple-fix           - Before broadcast fix
monitoring-server.js.backup-20251126-103127      - November 26 backup
monitoring-server.js.backup-pre-avgfix-20251126  - Pre-average fix
```

### Station Handler Backups

```
station3-handler.js.backup-20251208-213909       - Before 200ms collection fix
```

### StationAgent Backups

```
StationAgent.backup.js                           - Main backup
StationAgent.js.backup                           - Old backup
StationAgent.js.backup-20251208-151915           - Recent backup
```

### Dashboard Backups

Located in `/home/azureuser/translation-app/public/`

```
dashboard.html.backup-before-mp3-fix-20251023-001339
dashboard.html.backup-before-syntax-fix
dashboard.html.backup-before-simple-fix-20251024-115024
dashboard.html.backup-remove-nonblocking
dashboard.html.backup-NOW-20251023-135914
dashboard.html.backup-before-network-latency-20251026-012115
dashboard.html.backup-before-cleanup-20251023-124530
dashboard.html.backup-before-hume-card-20251023-161135
dashboard.html.backup-before-card4-fix-20251022-234322
dashboard.html.backup-before-client-filter
dashboard.html.backup-audio
dashboard.html.backup-before-remove-mute-20251024-123923
dashboard.html.backup-unified
dashboard-room2.html.backup-before-filter
dashboard.html.backup-before-qa-settings-20251024-114259
dashboard.html.backup-before-buffer-fix-20251024-110949
dashboard.html.backup-hume-20251023-103119
monitoring-dashboard.html.backup-syntax-error-1761125005
dashboard.html.backup-before-audio-fix-20251024-105049
dashboard.html.backup-before-cleanup-20251023-124505
monitoring-dashboard.html.backup-1761118039
dashboard.html.backup-before-hume-cleanup
dashboard-room2.html.backup-unified
dashboard.html.backup-before-viz
dashboard.html.backup-before-hume-fix
dashboard.html.backup-missing-brace
monitoring-dashboard.html.backup-waveform-20251022-104906
dashboard.html.backup-before-audio-minimal-20251023-002510
dashboard.html.backup-20251024-125607
dashboard.html.backup-final-20251023-113935
dashboard.html.backup-before-comfort-noise-20251026-022239
dashboard.html.backup-before-hume-card
dashboard.html.backup-temp
dashboard.html.backup-before-restore
dashboard.html.backup-20251026-125752
dashboard-single-20251029-030530.backup
dashboard.html.backup-before-filter
dashboard-room2.html.backup-before-extension-banner
dashboard-single.html.backup-20251028-224647
dashboard.html.backup-phase1
dashboard-room2.html.backup-join-room
dashboard.html.backup-before-full-rollback-20251023-152956
dashboard.html.backup-NOW-before-restore-20251023-162742
dashboard.html.backup-join-room
dashboard.html.backup-client-debug
dashboard.html.backup
```

### Asterisk Configuration Backup

```
asterisk-configs-backup.tar.gz                   - Full Asterisk config archive
```

---

## 10. Deprecated/Old Processes

### 5555-6666 Extension System
- **Location**: `/home/azureuser/translation-app/5555-6666-pcm-crossover/`
- **Status**: DEPRECATED
- **Reason**: Replaced by 3333-4444 operational system
- **Files**:
  - gateway-5555.js
  - gateway-5555-buffered.js
  - gateway-6666-buffered.js
  - conf-server-phase1.js
  - ari-gstreamer-phase1.js

### Old Monitoring Files
- continuous-full-monitoring.js - Replaced by continuous-full-monitoring-with-station3.js
- monitoring-server-55param-backup.js - Old 55-parameter version (now 75 parameters)
- monitoring-server-github.js - Old GitHub version

### Legacy ARI Handler
- asterisk-ari-handler.js (main directory) - Replaced by integrated version in STTTTSserver

### Empty/Stub Files
- simplified-database-server.js (0 bytes)
- hume-streaming-client.js (21 bytes - stub)
- database-integration-module.js (205 bytes - stub in STTTTSserver)

---

## 11. Startup Sequence

### Reference Document
**Location**: `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/Docs/sys/3333_4444_INSTALLATION_GUIDE_V2.0.md`

### Verified Startup Order (2025-12-09)

#### 1. Core Infrastructure (Never Stop These)
```bash
# PostgreSQL
sudo systemctl start postgresql
# PID: 2585998, Port: 5432

# Asterisk
sudo systemctl start asterisk
# PID: 744006, Ports: 5038, 8088, 9060, 9061, 9096
```

#### 2. Database API Server (First Application Service)
```bash
cd /home/azureuser/translation-app
nohup node database-api-server.js > /tmp/database-api-guide.log 2>&1 &
# PID: 1398327, Port: 8083
```

#### 3. Monitoring Server (Before STTTTSserver)
```bash
cd /home/azureuser/translation-app
nohup node monitoring-server.js > /tmp/monitoring-guide.log 2>&1 &
# PID: 1400548, Ports: 3001 (Socket.IO), 8080 (HTTP)
# Wait 2 seconds for Socket.IO initialization
sleep 2
```

#### 4. STTTTSserver (Main Translation Engine)
```bash
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
nohup node STTTTSserver.js > /tmp/STTTTSserver-guide.log 2>&1 &
# PID: 1402819, Ports: 3020 (HTTP), 6211 (Socket.IO)
# Wait 2 seconds for initialization
sleep 2
```

#### 5. Audio Gateways (Parallel Start)
```bash
cd /home/azureuser/translation-app/3333_4444__Operational

# gateway-3333
nohup node gateway-3333.js > /tmp/gateway-3333-final.log 2>&1 &
# PID: 1406914, UDP: 4000-4001

# gateway-4444 (CRITICAL: Must cd to directory first)
nohup node gateway-4444.js > /tmp/gateway-4444-correct.log 2>&1 &
# PID: 1415157, UDP: 4002-4003

sleep 2
```

#### 6. ARI External Media Handler
```bash
cd /home/azureuser/translation-app/3333_4444__Operational
nohup node ari-gstreamer-operational.js > /tmp/ari-final.log 2>&1 &
# PID: 1409206
sleep 2
```

#### 7. Monitoring Bridge (NOT IN INSTALLATION GUIDE - CRITICAL)
```bash
cd /home/azureuser/translation-app
nohup node monitoring-to-database-bridge.js > /tmp/monitoring-to-database-NEW.log 2>&1 &
# PID: 1428739
# IMPORTANT: This is NOT documented in the installation guide but is REQUIRED
#            for the public API to receive real Station-3 data
sleep 3
```

#### 8. Cloudflared Tunnel (Optional - For Public Access)
```bash
cd /home/azureuser
nohup ./cloudflared-linux-amd64 tunnel --url http://localhost:8083 > /tmp/cloudflared.log 2>&1 &
# PID: 1345193
# Public URL: https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots
sleep 5
```

### Optional Monitoring Services

#### monitoring-api-bridge (For 11-Station Testing)
```bash
cd /home/azureuser/translation-app
nohup node monitoring-api-bridge.js > /tmp/monitoring-api-bridge-complete.log 2>&1 &
# Port: 3009
# Provides: GET /api/station3
```

#### continuous-full-monitoring-with-station3 (For 11-Station Data)
```bash
cd /home/azureuser/translation-app
nohup node continuous-full-monitoring-with-station3.js > /tmp/continuous-monitoring-all-stations.log 2>&1 &
# Sends data for all 11 stations (real for Station-3/9, generated for others)
```

### Verification Commands

```bash
# Check all processes are running
ps aux | grep -E 'node|postgres|asterisk' | grep -v grep

# Check listening ports
ss -tlnp | grep LISTEN

# Check logs for errors
tail -f /tmp/database-api-guide.log
tail -f /tmp/monitoring-guide.log
tail -f /tmp/STTTTSserver-guide.log
tail -f /tmp/gateway-3333-final.log
tail -f /tmp/gateway-4444-correct.log
tail -f /tmp/ari-final.log
tail -f /tmp/monitoring-to-database-NEW.log

# Test public API
curl https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots
```

### Common Issues

#### Issue 1: gateway-4444 fails to start
**Symptom**: Error: Cannot find module '/home/azureuser/gateway-4444.js'
**Cause**: nohup runs from wrong directory
**Fix**: Change to correct directory first:
```bash
cd /home/azureuser/translation-app/3333_4444__Operational
nohup node gateway-4444.js > /tmp/gateway-4444-correct.log 2>&1 &
```

#### Issue 2: Public API returns empty array
**Symptom**: `curl .../api/snapshots` returns `[]`
**Cause**: monitoring-to-database-bridge not started
**Fix**: Start the bridge:
```bash
cd /home/azureuser/translation-app
nohup node monitoring-to-database-bridge.js > /tmp/monitoring-to-database-NEW.log 2>&1 &
```

#### Issue 3: No Station-3 metrics appearing
**Symptom**: No metrics in logs every 200ms
**Cause**: STTTTSserver started before monitoring-server
**Fix**: Restart STTTTSserver:
```bash
pkill -f STTTTSserver
sleep 2
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
nohup node STTTTSserver.js > /tmp/STTTTSserver-guide.log 2>&1 &
```

---

## 12. System Configuration Files

### Asterisk Configuration

#### PJSIP Extensions
**Location**: `/etc/asterisk/pjsip_wizard.conf`
```ini
[3333]
type = wizard
endpoint/context = default
endpoint/allow = ulaw,alaw
aor/max_contacts = 1
inbound_auth/username = 3333
inbound_auth/password = [password]

[4444]
type = wizard
endpoint/context = default
endpoint/allow = ulaw,alaw
aor/max_contacts = 1
inbound_auth/username = 4444
inbound_auth/password = [password]
```

### Database Configuration
**Location**: `/home/azureuser/translation-app/db-config.js`
```javascript
module.exports = { /* PostgreSQL config */ };
```

### Environment Variables
**Locations**: Various `.env` files (not documented in this scan)

---

## 13. External Services

### Third-Party APIs

#### Deepgram (Speech-to-Text)
- **Model**: nova-3 (configurable)
- **Languages**: en, fr (auto-detect)
- **Features**: Punctuation, interim results, VAD, smart format
- **API Key**: Configured in STTTTSserver

#### DeepL (Machine Translation)
- **Directions**: EN ↔ FR
- **Mode**: Incremental MT (real-time translation)
- **API Key**: Configured in STTTTSserver

#### ElevenLabs (Text-to-Speech)
- **Service**: WebSocket streaming TTS
- **Voices**: Configurable per extension
- **Output**: PCM 16kHz mono
- **API Key**: Configured in STTTTSserver

### Cloudflared
- **Version**: linux-amd64
- **Mode**: Unnamed tunnel (temporary URL)
- **Current URL**: https://inter-using-helpful-latitude.trycloudflare.com
- **Target**: localhost:8083 (database-api-server)
- **Note**: URL changes on each restart

---

## 14. Log Files Reference

### Active Log Files (Current Session)

```
/tmp/database-api-guide.log                 - database-api-server
/tmp/monitoring-guide.log                   - monitoring-server
/tmp/STTTTSserver-guide.log                 - STTTTSserver
/tmp/gateway-3333-final.log                 - gateway-3333
/tmp/gateway-4444-correct.log               - gateway-4444
/tmp/ari-final.log                          - ari-gstreamer-operational
/tmp/monitoring-to-database-NEW.log         - monitoring-to-database-bridge
/tmp/cloudflared.log                        - cloudflared tunnel
/tmp/monitoring-api-bridge-complete.log     - monitoring-api-bridge (optional)
```

### Log Retention
- **Location**: `/tmp/` directory
- **Rotation**: Manual (logs do not auto-rotate)
- **Cleanup**: Not automated (logs grow indefinitely)
- **Recommendation**: Implement log rotation

---

## 15. Critical Notes & Warnings

### DO NOT Restart Without Permission
1. **PostgreSQL** (PID 2585998) - Core database
2. **Asterisk** (PID 744006) - Telephony engine

### Missing from Installation Guide
1. **monitoring-to-database-bridge.js** - CRITICAL for public API
   - Must be started manually after monitoring-server
   - Required for data flow to database-api-server

### Known Issues
1. **gateway-4444 directory issue** - Must cd to correct directory before starting
2. **Station-3 collection** - Requires monitoring-server to be running first
3. **Socket.IO broadcasting** - Fix applied to monitoring-server.js (socket.emit → io.emit)

### Port Conflicts
- Ensure ports 3001, 3020, 6211, 8080, 8083 are not in use before starting
- UDP ports 4000-4003 must be available for gateways

### Security Considerations
- All services run as user `azureuser`
- No firewall rules blocking internal ports
- Public access only via cloudflared tunnel
- PostgreSQL bound to localhost only (secure)
- Asterisk AMI bound to localhost only (secure)

---

## 16. Future Improvements

### Recommendations
1. **Add monitoring-to-database-bridge to installation guide**
2. **Implement log rotation** for `/tmp/` logs
3. **Add health check endpoints** for all services
4. **Implement automatic restart** on service failure
5. **Add systemd service files** for all Node.js processes
6. **Consolidate old/deprecated files** into archive directory
7. **Document all environment variables** in centralized file
8. **Add monitoring dashboard** for service status
9. **Implement backup strategy** for configuration files
10. **Add integration tests** for full system startup

---

## Document Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-09 | 1.0 | Initial comprehensive documentation | Claude Sonnet 4.5 |

---

**END OF DOCUMENT**
