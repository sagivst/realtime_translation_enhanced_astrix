# Monitoring System - Complete Flow Diagram
## Visual Documentation of Data Flow with All Files and Services

**Generated:** 2025-12-09
**System:** Azure VM 20.170.155.53

---

## Complete Monitoring Data Flow

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ LAYER 1: DATA COLLECTION (Every 200ms)                                        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌─────────────────────────────────────────────────────────────────────────────┐
│ File: station3-handler.js                                                   │
│ Location: /home/azureuser/translation-app/3333_4444__Operational/          │
│           STTTTSserver/station3-handler.js                                  │
│ Size: 3,045 bytes                                                           │
│ Status: ✅ ACTIVE (inside STTTTSserver process)                             │
│                                                                              │
│ Purpose: Monitor audio input to Deepgram STT                                │
│ Extensions: 3333 (English), 4444 (French)                                   │
│ Collection Interval: 200ms (5 times per second)                             │
│                                                                              │
│ Configuration Files:                                                         │
│   • /tmp/STATION_3-3333-config.json (polled every 100ms)                   │
│   • /tmp/STATION_3-4444-config.json (polled every 100ms)                   │
│                                                                              │
│ Code Flow:                                                                   │
│   setInterval(async () => {                                                 │
│     await this.stationAgent.collect({                                       │
│       timestamp: Date.now(),                                                │
│       extension: this.extensionId,                                          │
│       call_id: 'station3-monitoring'                                        │
│     });                                                                      │
│   }, 200); // Every 200ms                                                   │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   │ Calls
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ File: StationAgent.js                                                       │
│ Location: /home/azureuser/translation-app/3333_4444__Operational/          │
│           STTTTSserver/monitoring/StationAgent.js                           │
│ Size: 10,316 bytes                                                          │
│ Status: ✅ ACTIVE (framework used by station handlers)                      │
│                                                                              │
│ Purpose: Metric collection and emission framework                           │
│ Capabilities: 75 metrics, 113 knobs                                         │
│                                                                              │
│ Method: collect(context)                                                    │
│   1. gatherMetrics() → Returns 23-24 metrics                                │
│   2. gatherKnobs() → Returns knob settings                                  │
│   3. checkAlerts() → Returns alert conditions                               │
│   4. Emit via Socket.IO client                                              │
│                                                                              │
│ Metrics Collected:                                                           │
│   • Audio Quality: snr, audio_level, quality_score, peak_amplitude          │
│   • Latency: stt_latency, mt_latency, tts_latency, end_to_end              │
│   • System: cpu_usage, memory_usage, process_uptime                         │
│   • Network: packet_loss, jitter, bandwidth_usage                           │
│   • Plus 11-12 additional metrics                                           │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   │ Returns metrics object
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ File: station9-handler.js                                                   │
│ Location: /home/azureuser/translation-app/3333_4444__Operational/          │
│           STTTTSserver/station9-handler.js                                  │
│ Size: 2,375 bytes                                                           │
│ Status: ✅ ACTIVE (inside STTTTSserver process)                             │
│                                                                              │
│ Purpose: Monitor TTS output to Asterisk                                     │
│ Extensions: 3333 (French output), 4444 (English output)                     │
│                                                                              │
│ Metrics Focus:                                                               │
│   • TTS Quality: tts_audio_quality, tts_latency, tts_buffer_size           │
│   • Output Delivery: packets_sent, bytes_sent, delivery_latency            │
│   • Stream Quality: stream_continuity, silence_ratio                        │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   │ Both handlers inside
                                   ▼

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ LAYER 2: TRANSPORT (Socket.IO Real-Time)                                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌─────────────────────────────────────────────────────────────────────────────┐
│ Process: STTTTSserver                                                       │
│ File: STTTTSserver.js                                                       │
│ Location: /home/azureuser/translation-app/3333_4444__Operational/          │
│           STTTTSserver/STTTTSserver.js                                      │
│ Size: 152,346 bytes                                                         │
│ PID: 1402819                                                                │
│ Status: ✅ RUNNING                                                           │
│                                                                              │
│ Ports:                                                                       │
│   • 3020 - HTTP API for conference management                               │
│   • 6211 - Socket.IO client connection to monitoring-server                 │
│                                                                              │
│ Log File: /tmp/STTTTSserver-guide.log                                       │
│ Log Pattern:                                                                 │
│   [STATION_3-3333] 📊 Sent metrics to monitoring (call: STATION_3-...)     │
│   [STATION_3-4444] 📊 Sent metrics to monitoring (call: STATION_3-...)     │
│   Frequency: Every ~200ms per extension                                     │
│                                                                              │
│ Socket.IO Client Configuration:                                             │
│   const socket = io('http://20.170.155.53:3001');                           │
│                                                                              │
│ Emission:                                                                    │
│   socket.emit('metrics', {                                                  │
│     station_id: 'STATION_3',                                                │
│     extension: '3333' or '4444',                                            │
│     call_id: 'station3-monitoring',                                         │
│     timestamp: '2025-12-09T22:28:08.123Z',                                  │
│     metrics: { snr: 25.3, audio_level: -18.5, ... },                        │
│     knobs_effective: [],                                                    │
│     alerts: []                                                               │
│   });                                                                        │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   │ Socket.IO Event: 'metrics'
                                   │ Target: monitoring-server:3001
                                   │ Protocol: WebSocket (Socket.IO)
                                   ▼

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ LAYER 3: PROCESSING & BROADCASTING (Central Hub)                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌─────────────────────────────────────────────────────────────────────────────┐
│ Process: monitoring-server                                                  │
│ File: monitoring-server.js                                                  │
│ Location: /home/azureuser/translation-app/monitoring-server.js              │
│ Size: 20,898 bytes                                                          │
│ PID: 1400548                                                                │
│ Status: ✅ RUNNING                                                           │
│                                                                              │
│ Ports:                                                                       │
│   • 3001 - Socket.IO server (monitoring data hub)                           │
│   • 8080 - HTTP server (dashboard/API)                                      │
│                                                                              │
│ Log File: /tmp/monitoring-guide.log                                         │
│ Log Pattern:                                                                 │
│   [Monitoring Server] ⚠️ Received legacy 'metrics' event from STATION_3     │
│   [Monitoring Server] 📊 Processed legacy metrics for STATION_3_3333       │
│   [Monitoring Server] 📊 Processed legacy metrics for STATION_3_4444       │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ CRITICAL FIX APPLIED                                                    │ │
│ │                                                                         │ │
│ │ Before (BROKEN):                                                        │ │
│ │   socket.emit('unified-metrics', data);                                │ │
│ │   // Only sends to same socket that sent it                            │ │
│ │                                                                         │ │
│ │ After (WORKING):                                                        │ │
│ │   io.emit('unified-metrics', data);                                    │ │
│ │   // Broadcasts to ALL connected clients                               │ │
│ │                                                                         │ │
│ │ Backup: monitoring-server.js.backup-simple-fix                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Processing Flow:                                                             │
│   1. Receive 'metrics' event from STTTTSserver                              │
│   2. Convert legacy format → unified format                                 │
│   3. Update in-memory database (metricsDatabase)                            │
│   4. Add to history (max 1000 entries)                                      │
│   5. Broadcast to ALL clients:                                              │
│      • io.emit('unified-metrics', unifiedData)                              │
│      • io.emit('metrics-update', updateData)                                │
│                                                                              │
│ In-Memory Database Structure:                                               │
│   metricsDatabase = {                                                       │
│     stations: {                                                             │
│       'STATION_3_3333': { metrics, knobs, alerts, metadata, ... },         │
│       'STATION_3_4444': { metrics, knobs, alerts, metadata, ... }          │
│     },                                                                      │
│     history: [ ...last 1000 unified metrics... ],                          │
│     maxHistorySize: 1000                                                    │
│   }                                                                         │
│                                                                              │
│ Unified Format Output:                                                      │
│   {                                                                          │
│     station_id: 'STATION_3',                                                │
│     extension: '3333',                                                      │
│     call_id: 'station3-monitoring',                                         │
│     timestamp: '2025-12-09T22:28:08.123Z',                                  │
│     metrics: { snr: 25.3, audio_level: -18.5, ... },                        │
│     knobs: [],                                                              │
│     alerts: [],                                                             │
│     metadata: { state: 'active', legacy_format: true },                     │
│     metric_count: 23,                                                       │
│     knob_count: 0                                                           │
│   }                                                                          │
└─────────┬───────────────────────────────────┬───────────────────────────────┘
          │                                   │
          │ io.emit('unified-metrics')        │ io.emit('metrics-update')
          │ Broadcast to ALL clients          │ Broadcast to ALL clients
          ▼                                   ▼
    [All Connected Clients Receive Both Events]

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ LAYER 4: STORAGE (Persistent Data)                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌─────────────────────────────────────────────────────────────────────────────┐
│ Process: monitoring-to-database-bridge                                      │
│ File: monitoring-to-database-bridge.js                                      │
│ Location: /home/azureuser/translation-app/                                  │
│           monitoring-to-database-bridge.js                                  │
│ Size: 4,019 bytes                                                           │
│ PID: 1428739                                                                │
│ Status: ✅ RUNNING                                                           │
│                                                                              │
│ ⚠️  CRITICAL NOTE:                                                           │
│     This process is NOT in the installation guide                           │
│     But it is REQUIRED for public API to work                               │
│     Must be started manually after monitoring-server                        │
│                                                                              │
│ Log File: /tmp/monitoring-to-database-NEW.log                               │
│ Log Pattern:                                                                 │
│   [10:28:08 PM] ✅ Stored STATION_3-3333: 23 metrics, 0 knobs               │
│   [10:28:08 PM] ✅ Stored STATION_3-4444: 24 metrics, 0 knobs               │
│   Frequency: Every ~200ms per extension                                     │
│                                                                              │
│ Connection:                                                                  │
│   const socket = io('http://20.170.155.53:3001');                           │
│   socket.on('unified-metrics', async (data) => { ... });                    │
│                                                                              │
│ Processing Flow:                                                             │
│   1. Listen for 'unified-metrics' event from monitoring-server              │
│   2. Forward data via HTTP POST to database-api-server                      │
│   3. Log success/failure (silent fail - no crash)                           │
│                                                                              │
│ Code:                                                                        │
│   socket.on('unified-metrics', async (data) => {                            │
│     try {                                                                    │
│       await axios.post(                                                     │
│         'http://localhost:8083/store-snapshot',                             │
│         data                                                                 │
│       );                                                                     │
│       console.log(`✅ Stored ${data.station_id}-${data.extension}: ...`);   │
│     } catch (error) {                                                        │
│       console.error(`❌ Failed to store snapshot:`, error.message);         │
│     }                                                                        │
│   });                                                                        │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   │ HTTP POST
                                   │ Target: localhost:8083/store-snapshot
                                   │ Frequency: Every ~200ms (per metric event)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Process: database-api-server                                                │
│ File: database-api-server.js                                                │
│ Location: /home/azureuser/translation-app/database-api-server.js            │
│ Size: 2,071 bytes                                                           │
│ PID: 1398327                                                                │
│ Status: ✅ RUNNING                                                           │
│                                                                              │
│ Port: 8083 (HTTP API)                                                       │
│                                                                              │
│ Log File: /tmp/database-api-guide.log                                       │
│ Log Pattern:                                                                 │
│   [Database API] POST /store-snapshot - Stored snapshot for STATION_3-3333 │
│   [Database API] POST /store-snapshot - Stored snapshot for STATION_3-4444 │
│   [Database API] GET /api/snapshots - Returned 100 snapshots                │
│                                                                              │
│ Endpoints:                                                                   │
│   POST /store-snapshot                                                      │
│     • Receives unified metrics data                                         │
│     • Stores in in-memory array                                             │
│     • Keeps last 100 snapshots only                                         │
│     • Returns: { success: true }                                            │
│                                                                              │
│   GET /api/snapshots                                                        │
│     • Returns last 100 snapshots                                            │
│     • Response: Array of snapshot objects                                   │
│     • Used by: Public API, dashboards, testing                              │
│                                                                              │
│ Storage:                                                                     │
│   const snapshots = []; // In-memory only (not PostgreSQL)                  │
│   const MAX_SNAPSHOTS = 100;                                                │
│                                                                              │
│   app.post('/store-snapshot', (req, res) => {                               │
│     snapshots.push(req.body);                                               │
│     if (snapshots.length > MAX_SNAPSHOTS) {                                 │
│       snapshots.shift(); // Remove oldest                                   │
│     }                                                                        │
│     res.json({ success: true });                                            │
│   });                                                                        │
│                                                                              │
│   app.get('/api/snapshots', (req, res) => {                                 │
│     res.json(snapshots);                                                    │
│   });                                                                        │
│                                                                              │
│ ⚠️  Data Persistence: NONE                                                  │
│     • Data lost on restart                                                  │
│     • Only last 100 snapshots kept                                          │
│     • No database backend                                                   │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   │ HTTP GET /api/snapshots
                                   │ Returns: JSON array of last 100 snapshots
                                   ▼

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ LAYER 5: PUBLIC ACCESS (HTTPS Tunnel)                                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌─────────────────────────────────────────────────────────────────────────────┐
│ Process: cloudflared                                                        │
│ File: cloudflared-linux-amd64                                               │
│ Location: /home/azureuser/cloudflared-linux-amd64                           │
│ PID: 1345193                                                                │
│ Status: ✅ RUNNING                                                           │
│                                                                              │
│ Configuration:                                                               │
│   ./cloudflared-linux-amd64 tunnel --url http://localhost:8083              │
│                                                                              │
│ Local Target: localhost:8083 (database-api-server)                          │
│ Public URL: https://inter-using-helpful-latitude.trycloudflare.com          │
│                                                                              │
│ Log File: /tmp/cloudflared.log                                              │
│                                                                              │
│ ⚠️  URL Changes: Every restart generates new URL                            │
│     • This is a temporary tunnel (no named tunnel)                          │
│     • Check /tmp/cloudflared.log for current URL                            │
│                                                                              │
│ Public Endpoint:                                                             │
│   https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots      │
│                                                                              │
│ Tunnel Flow:                                                                 │
│   Internet (HTTPS)                                                          │
│     ↓                                                                        │
│   Cloudflare Edge Network                                                   │
│     ↓                                                                        │
│   cloudflared process (PID 1345193)                                         │
│     ↓                                                                        │
│   localhost:8083 (database-api-server)                                      │
│                                                                              │
│ Benefits:                                                                    │
│   • No port forwarding needed                                               │
│   • No SSL certificate management                                           │
│   • Automatic HTTPS                                                         │
│   • Public access without exposing VM                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Public HTTPS access
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🌐 PUBLIC API ENDPOINT                                                      │
│                                                                              │
│ URL: https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots   │
│                                                                              │
│ Usage:                                                                       │
│   curl https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots │
│                                                                              │
│ Response: JSON array of last 100 snapshots                                  │
│   [                                                                          │
│     {                                                                        │
│       "station_id": "STATION_3",                                            │
│       "extension": "3333",                                                  │
│       "timestamp": "2025-12-09T22:28:08.123Z",                              │
│       "metrics": {                                                          │
│         "snr": 25.3,                                                        │
│         "audio_level": -18.5,                                               │
│         "stt_latency": 145,                                                 │
│         ...                                                                 │
│       },                                                                    │
│       "metric_count": 23,                                                   │
│       "knob_count": 0                                                       │
│     },                                                                      │
│     ...                                                                     │
│   ]                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary Table: All Components

| Component | File | Location | PID | Port(s) | Log File | Status |
|-----------|------|----------|-----|---------|----------|--------|
| **Station-3 Handler** | station3-handler.js | STTTTSserver/ | (1402819) | - | /tmp/STTTTSserver-guide.log | ✅ ACTIVE |
| **Station-9 Handler** | station9-handler.js | STTTTSserver/ | (1402819) | - | /tmp/STTTTSserver-guide.log | ✅ ACTIVE |
| **StationAgent** | StationAgent.js | STTTTSserver/monitoring/ | (1402819) | - | - | ✅ ACTIVE |
| **STTTTSserver** | STTTTSserver.js | STTTTSserver/ | 1402819 | 3020, 6211 | /tmp/STTTTSserver-guide.log | ✅ RUNNING |
| **Monitoring Server** | monitoring-server.js | translation-app/ | 1400548 | 3001, 8080 | /tmp/monitoring-guide.log | ✅ RUNNING |
| **Database Bridge** | monitoring-to-database-bridge.js | translation-app/ | 1428739 | - | /tmp/monitoring-to-database-NEW.log | ✅ RUNNING |
| **Database API** | database-api-server.js | translation-app/ | 1398327 | 8083 | /tmp/database-api-guide.log | ✅ RUNNING |
| **Cloudflared** | cloudflared-linux-amd64 | /home/azureuser/ | 1345193 | (tunnel) | /tmp/cloudflared.log | ✅ RUNNING |

---

## Data Flow Timeline

```
T+0ms:    Station-3 handler triggers (200ms interval)
T+1ms:    StationAgent.collect() gathers 23-24 metrics
T+2ms:    socket.emit('metrics') to monitoring-server:3001
T+12ms:   monitoring-server receives event
T+15ms:   monitoring-server converts to unified format
T+16ms:   monitoring-server updates in-memory database
T+17ms:   io.emit('unified-metrics') broadcasts to all clients
T+18ms:   monitoring-to-database-bridge receives broadcast
T+20ms:   Bridge POSTs to database-api-server:8083
T+22ms:   database-api-server stores in memory (last 100)
T+25ms:   Data available via GET /api/snapshots
T+50ms:   Data available via public HTTPS endpoint
T+200ms:  Next collection cycle begins
```

**Total Latency:** Collection → Public API = ~50ms

---

## Port Summary

```
Port 3001  monitoring-server (Socket.IO)
Port 8080  monitoring-server (HTTP)
Port 8083  database-api-server (HTTP API)
Port 3020  STTTTSserver (HTTP)
Port 6211  STTTTSserver (Socket.IO client)

No External Ports:
  - All monitoring ports are localhost only
  - Public access via cloudflared HTTPS tunnel only
```

---

## File Size Summary

```
station3-handler.js                   3,045 bytes
station9-handler.js                   2,375 bytes
StationAgent.js                      10,316 bytes
STTTTSserver.js                     152,346 bytes
monitoring-server.js                 20,898 bytes
monitoring-to-database-bridge.js      4,019 bytes
database-api-server.js                2,071 bytes

Total Monitoring Code:              195,070 bytes (~195 KB)
```

---

## Event Flow Summary

```
Events Emitted:
  1. 'metrics' (STTTTSserver → monitoring-server)
     - Legacy format
     - Every 200ms per extension
     - 2 extensions = 10 events/second

  2. 'unified-metrics' (monitoring-server → all clients)
     - Unified format
     - Broadcast to ALL
     - Every 200ms per extension

  3. 'metrics-update' (monitoring-server → all clients)
     - Update notification
     - Broadcast to ALL
     - Every 200ms per extension

HTTP Requests:
  1. POST /store-snapshot (bridge → database-api-server)
     - Store new snapshot
     - Every 200ms per extension
     - 10 requests/second

  2. GET /api/snapshots (client → database-api-server)
     - Retrieve snapshots
     - On-demand (not periodic)
     - Returns last 100 snapshots
```

---

## Startup Order (Critical)

```
1. database-api-server     Must start FIRST
   ↓ wait 2 seconds
2. monitoring-server       Must start SECOND
   ↓ wait 2 seconds
3. STTTTSserver           Must start THIRD
   ↓ wait 3 seconds
4. monitoring-to-database-bridge  Must start FOURTH ⚠️ NOT IN GUIDE
   ↓ wait 3 seconds
5. cloudflared            Optional (for public access)
```

---

**END OF FLOW DIAGRAM**
