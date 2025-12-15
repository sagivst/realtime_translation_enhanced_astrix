# Monitoring System - Operational Documentation
## Active Components Only - Station-3 & Station-9 Real-Time Metrics

**Generated:** 2025-12-09
**System:** Azure VM 20.170.155.53
**Scope:** ONLY operational files, running processes, and active configurations

---

## Table of Contents

1. [Active System Overview](#active-system-overview)
2. [Running Processes](#running-processes)
3. [Operational Files Only](#operational-files-only)
4. [Data Flow - Production Chain](#data-flow---production-chain)
5. [Station-3 Configuration](#station-3-configuration)
6. [Station-9 Configuration](#station-9-configuration)
7. [Monitoring Server Setup](#monitoring-server-setup)
8. [Database Bridge Setup](#database-bridge-setup)
9. [Public API Configuration](#public-api-configuration)
10. [Port Configuration](#port-configuration)
11. [Log Files](#log-files)
12. [Startup Procedure](#startup-procedure)
13. [Health Monitoring](#health-monitoring)
14. [Metrics Specification](#metrics-specification)

---

## 1. Active System Overview

### What's Running Right Now

**Core Monitoring Components:**
- monitoring-server (PID 1400548) - Central Socket.IO hub
- monitoring-to-database-bridge (PID 1428739) - Data forwarder
- database-api-server (PID 1398327) - HTTP API
- cloudflared (PID 1345193) - Public HTTPS tunnel

**Data Collection:**
- STTTTSserver (PID 1402819) - Contains Station-3 and Station-9 handlers
- Collection interval: 200ms (5 times per second)
- Monitored extensions: 3333, 4444

**Current Status:**
- Station-3: ✅ ACTIVE - Collecting 23-24 metrics every 200ms
- Station-9: ✅ ACTIVE - TTS output monitoring
- Public API: ✅ ACTIVE - https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots
- Data Chain: ✅ COMPLETE - All bridges operational

---

## 2. Running Processes

### Process 1: monitoring-server

```yaml
PID:      1400548
Ports:    3001 (Socket.IO), 8080 (HTTP)
File:     /home/azureuser/translation-app/monitoring-server.js
Size:     20,898 bytes
Log:      /tmp/monitoring-guide.log
Status:   RUNNING
```

**Purpose:** Central monitoring hub that receives metrics from STTTTSserver and broadcasts to all clients

**Key Configuration:**
- Listens on port 3001 for Socket.IO connections
- Receives `'metrics'` events from STTTTSserver
- Broadcasts `'unified-metrics'` to ALL connected clients (io.emit)
- Maintains in-memory database of station states

**Critical Fix Applied:**
```javascript
// Changed from: socket.emit('unified-metrics', data)
// Changed to:   io.emit('unified-metrics', data)
// Reason: Broadcasting to ALL clients, not just sender
```

**Dependencies:**
- Must start BEFORE STTTTSserver
- Required for Station-3 and Station-9 to function

---

### Process 2: STTTTSserver

```yaml
PID:      1402819
Ports:    3020 (HTTP), 6211 (Socket.IO)
File:     /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js
Size:     152,346 bytes
Log:      /tmp/STTTTSserver-guide.log
Status:   RUNNING
```

**Purpose:** Main translation server that also runs Station-3 and Station-9 monitoring

**Monitoring Components Inside:**
- Station-3 handler: Monitors audio input to Deepgram STT
- Station-9 handler: Monitors TTS output to Asterisk
- StationAgent: Metric collection framework

**Collection Pattern:**
```
Every 200ms:
  1. Station3Handler.collect() called
  2. Metrics gathered (23-24 metrics)
  3. socket.emit('metrics', data) to monitoring-server:3001
  4. Log: [STATION_3-3333] 📊 Sent metrics to monitoring
```

**Dependencies:**
- Requires monitoring-server to be running first
- Connects to monitoring-server:3001

---

### Process 3: monitoring-to-database-bridge

```yaml
PID:      1428739
File:     /home/azureuser/translation-app/monitoring-to-database-bridge.js
Size:     4,019 bytes
Log:      /tmp/monitoring-to-database-NEW.log
Status:   RUNNING
```

**Purpose:** Forwards monitoring data from monitoring-server to database-api-server

**Data Flow:**
```
monitoring-server:3001 (Socket.IO)
    ↓ Event: 'unified-metrics'
monitoring-to-database-bridge
    ↓ HTTP POST
database-api-server:8083/store-snapshot
```

**Log Output:**
```
[10:28:08 PM] ✅ Stored STATION_3-3333: 23 metrics, 0 knobs
[10:28:08 PM] ✅ Stored STATION_3-4444: 24 metrics, 0 knobs
```

**CRITICAL NOTE:**
- NOT documented in installation guide
- REQUIRED for public API to work
- Must be started manually after monitoring-server

**Dependencies:**
- Requires monitoring-server running
- Requires database-api-server running

---

### Process 4: database-api-server

```yaml
PID:      1398327
Port:     8083
File:     /home/azureuser/translation-app/database-api-server.js
Size:     2,071 bytes
Log:      /tmp/database-api-guide.log
Status:   RUNNING
```

**Purpose:** HTTP API for monitoring snapshots

**Endpoints:**
```
POST /store-snapshot
  - Stores monitoring snapshot
  - Called by monitoring-to-database-bridge
  - Request body: { station_id, extension, metrics, ... }

GET /api/snapshots
  - Returns last 100 snapshots
  - Response: Array of snapshot objects
  - Used by: Public API, dashboards, testing
```

**Storage:**
- In-memory array (not PostgreSQL)
- Stores last 100 snapshots only
- Data lost on restart

**Dependencies:**
- None (can run standalone)
- Should start first in monitoring chain

---

### Process 5: cloudflared

```yaml
PID:      1345193
Local:    localhost:8083
Public:   https://inter-using-helpful-latitude.trycloudflare.com
File:     /home/azureuser/cloudflared-linux-amd64
Log:      /tmp/cloudflared.log
Status:   RUNNING
```

**Purpose:** Public HTTPS tunnel to database-api-server

**Configuration:**
```bash
./cloudflared-linux-amd64 tunnel --url http://localhost:8083
```

**Public Endpoint:**
```
https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots
```

**Note:** URL changes on every restart (temporary tunnel)

**Dependencies:**
- Requires database-api-server:8083

---

## 3. Operational Files Only

### Monitoring Core Files (5 files)

```
/home/azureuser/translation-app/
├── monitoring-server.js                     20,898 bytes  ✅ RUNNING (PID 1400548)
├── monitoring-to-database-bridge.js          4,019 bytes  ✅ RUNNING (PID 1428739)
├── database-api-server.js                    2,071 bytes  ✅ RUNNING (PID 1398327)
└── monitoring-api-bridge.js                  4,632 bytes  ⚪ OPTIONAL (not required)
```

### Station Handler Files (2 files)

```
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/
├── station3-handler.js                       3,045 bytes  ✅ ACTIVE (inside STTTTSserver)
└── station9-handler.js                       2,375 bytes  ✅ ACTIVE (inside STTTTSserver)
```

### StationAgent Framework (1 file)

```
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring/
└── StationAgent.js                          10,316 bytes  ✅ ACTIVE (used by handlers)
```

### Total Operational Files: 8

**ALL OTHER FILES ARE NOT CURRENTLY USED**

---

## 4. Data Flow - Production Chain

### Complete Operational Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: COLLECTION (Every 200ms)                            │
└─────────────────────────────────────────────────────────────┘

Station3Handler.collect()
  ↓ Calls
StationAgent.gatherMetrics()
  ↓ Returns 23-24 metrics
Station3Handler
  ↓ Emits via Socket.IO

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: TRANSPORT                                           │
└─────────────────────────────────────────────────────────────┘

STTTTSserver:6211 (Socket.IO client)
  ↓ Event: 'metrics'
  ↓ Target: monitoring-server:3001
monitoring-server:3001 (Socket.IO server)

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: PROCESSING & BROADCASTING                           │
└─────────────────────────────────────────────────────────────┘

monitoring-server receives 'metrics' event
  ↓ Converts legacy → unified format
  ↓ Updates in-memory database
  ↓ Broadcasts to ALL clients
io.emit('unified-metrics', unifiedData)
io.emit('metrics-update', updateData)

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: STORAGE                                             │
└─────────────────────────────────────────────────────────────┘

monitoring-to-database-bridge listens 'unified-metrics'
  ↓ HTTP POST
  ↓ Target: localhost:8083/store-snapshot
database-api-server stores in memory
  ↓ Keeps last 100 snapshots

┌─────────────────────────────────────────────────────────────┐
│ STEP 5: PUBLIC ACCESS                                       │
└─────────────────────────────────────────────────────────────┘

database-api-server:8083 serves /api/snapshots
  ↓ Tunneled by
cloudflared
  ↓ Exposed as
https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots
```

### Data Flow Frequency

```
Collection:    Every 200ms (5/second)
Transport:     Real-time (Socket.IO)
Broadcasting:  Immediate (on receive)
Storage:       Every 200ms (per metric)
Public API:    On-demand (HTTP GET)
```

---

## 5. Station-3 Configuration

### File: station3-handler.js

**Location:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station3-handler.js`
**Size:** 3,045 bytes
**Status:** ✅ ACTIVE

### Purpose
Monitors audio input quality and STT processing at the Gateway → Deepgram interface

### Extensions Monitored
- **3333** - English audio input
- **4444** - French audio input

### Collection Settings

```javascript
collectionInterval: 200ms    // 5 times per second
configPollInterval: 100ms    // Config file polling
```

### Configuration File

**Location:** `/tmp/STATION_3-{extension}-config.json`

**Example (3333):**
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

**Example (4444):**
```json
{
  "deepgram": {
    "model": "nova-3",
    "language": "fr",
    "punctuate": true,
    "interimResults": true,
    "endpointing": 300,
    "vadTurnoff": 500,
    "smartFormat": true,
    "diarize": false
  }
}
```

### Key Implementation

```javascript
// Initialize StationAgent
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
  }, 200); // 200ms
}
```

### Metrics Collected

**Station-3 collects 23-24 metrics including:**

```yaml
Audio Quality:
  - snr: Signal-to-Noise Ratio (dB)
  - audio_level: Audio level (dBFS)
  - audio_quality_score: Quality score (0-1)

Latency:
  - stt_latency: STT processing time (ms)
  - end_to_end_latency: Total latency (ms)

System:
  - cpu_usage: CPU usage (%)
  - memory_usage: Memory (MB)

Network:
  - packet_loss: Packet loss (%)
  - jitter: Network jitter (ms)

# Plus 14-15 additional metrics
```

### Log Pattern

```
[STATION_3-3333] 📊 Sent metrics to monitoring (call: STATION_3-1765232875623)
[STATION_3-4444] 📊 Sent metrics to monitoring (call: STATION_3-1765232875624)
```

**Frequency:** Every ~200ms per extension

---

## 6. Station-9 Configuration

### File: station9-handler.js

**Location:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station9-handler.js`
**Size:** 2,375 bytes
**Status:** ✅ ACTIVE

### Purpose
Monitors TTS output quality and delivery at the ElevenLabs TTS → Asterisk interface

### Extensions Monitored
- **3333** - French audio output (translated from English)
- **4444** - English audio output (translated from French)

### Metrics Focus

```yaml
TTS Quality:
  - tts_audio_quality: TTS quality score (0-1)
  - tts_latency: TTS generation time (ms)
  - tts_buffer_size: Buffer size (bytes)

Output Delivery:
  - packets_sent: Packets to Asterisk
  - bytes_sent: Total bytes delivered
  - delivery_latency: Delivery time (ms)

Stream Quality:
  - stream_continuity: Continuity score (0-1)
  - silence_ratio: Silence percentage
```

---

## 7. Monitoring Server Setup

### File: monitoring-server.js

**Location:** `/home/azureuser/translation-app/monitoring-server.js`
**Size:** 20,898 bytes
**Status:** ✅ RUNNING (PID 1400548)

### Responsibilities

```yaml
1. Socket.IO Server:
   - Listen on port 3001
   - Accept connections from STTTTSserver

2. Receive Metrics:
   - Event: 'metrics'
   - Source: STTTTSserver

3. Convert Format:
   - Legacy → Unified format
   - Add metadata

4. Broadcast:
   - Event: 'unified-metrics'
   - Event: 'metrics-update'
   - Target: ALL connected clients (io.emit)

5. Store State:
   - In-memory database
   - Current station states
```

### Critical Broadcasting Code

```javascript
socket.on('metrics', (data) => {
  // Convert to unified format
  const unifiedData = {
    station_id: data.station_id,
    extension: data.extension || data.channel,
    call_id: data.call_id,
    timestamp: data.timestamp || new Date().toISOString(),
    metrics: data.metrics || {},
    knobs: data.knobs_effective || [],
    alerts: data.alerts || [],
    metadata: {
      state: 'active',
      legacy_format: true
    },
    metric_count: Object.keys(data.metrics || {}).length,
    knob_count: (data.knobs_effective || []).length
  };

  // Update in-memory database
  const key = unifiedData.extension
    ? `${unifiedData.station_id}_${unifiedData.extension}`
    : unifiedData.station_id;

  if (!metricsDatabase.stations[key]) {
    metricsDatabase.stations[key] = {
      station_id: unifiedData.station_id,
      extension: unifiedData.extension,
      first_seen: unifiedData.timestamp,
      last_seen: unifiedData.timestamp,
      metrics: {},
      knobs: {},
      alerts: [],
      metadata: {}
    };
  }

  const stationData = metricsDatabase.stations[key];
  stationData.last_seen = unifiedData.timestamp;
  stationData.metrics = unifiedData.metrics;
  stationData.knobs = unifiedData.knobs;
  stationData.alerts = unifiedData.alerts;
  stationData.metadata = unifiedData.metadata;
  stationData.call_id = unifiedData.call_id;
  stationData.metric_count = unifiedData.metric_count;
  stationData.knob_count = unifiedData.knob_count;

  // Add to history
  metricsDatabase.history.push(unifiedData);
  if (metricsDatabase.history.length > metricsDatabase.maxHistorySize) {
    metricsDatabase.history.shift();
  }

  // CRITICAL: Broadcast to ALL clients
  io.emit('unified-metrics', unifiedData);
  io.emit('metrics-update', {
    station_id: unifiedData.station_id,
    extension: unifiedData.extension,
    key,
    data: unifiedData
  });
});
```

### Startup Command

```bash
cd /home/azureuser/translation-app
nohup node monitoring-server.js > /tmp/monitoring-guide.log 2>&1 &
```

---

## 8. Database Bridge Setup

### File: monitoring-to-database-bridge.js

**Location:** `/home/azureuser/translation-app/monitoring-to-database-bridge.js`
**Size:** 4,019 bytes
**Status:** ✅ RUNNING (PID 1428739)

### Implementation

```javascript
const io = require('socket.io-client');
const axios = require('axios');

// Connect to monitoring-server
const socket = io('http://20.170.155.53:3001');

socket.on('connect', () => {
  console.log('[Bridge] Connected to monitoring-server');
});

// Listen for unified metrics
socket.on('unified-metrics', async (data) => {
  try {
    // Forward to database-api-server
    await axios.post('http://localhost:8083/store-snapshot', data);

    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ✅ Stored ${data.station_id}-${data.extension}: ${data.metric_count} metrics, ${data.knob_count} knobs`);
  } catch (error) {
    const timestamp = new Date().toLocaleTimeString();
    console.error(`[${timestamp}] ❌ Failed to store snapshot:`, error.message);
  }
});

socket.on('disconnect', () => {
  console.log('[Bridge] Disconnected from monitoring-server');
});
```

### Startup Command

```bash
cd /home/azureuser/translation-app
nohup node monitoring-to-database-bridge.js > /tmp/monitoring-to-database-NEW.log 2>&1 &
```

### Log Pattern

```
[Bridge] Connected to monitoring-server
[10:28:08 PM] ✅ Stored STATION_3-3333: 23 metrics, 0 knobs
[10:28:08 PM] ✅ Stored STATION_3-4444: 24 metrics, 0 knobs
[10:28:09 PM] ✅ Stored STATION_3-3333: 23 metrics, 0 knobs
[10:28:09 PM] ✅ Stored STATION_3-4444: 24 metrics, 0 knobs
```

---

## 9. Public API Configuration

### Cloudflared Setup

**Binary:** `/home/azureuser/cloudflared-linux-amd64`
**Target:** `localhost:8083` (database-api-server)
**Public URL:** `https://inter-using-helpful-latitude.trycloudflare.com`

### Startup Command

```bash
cd /home/azureuser
nohup ./cloudflared-linux-amd64 tunnel --url http://localhost:8083 > /tmp/cloudflared.log 2>&1 &
```

### Public Endpoint

```
https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots
```

### Usage Examples

```bash
# Get latest 100 snapshots
curl https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots

# Pretty print with jq
curl -s https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots | jq '.'

# Get latest timestamp
curl -s https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots | jq '.[0].timestamp'

# Count snapshots
curl -s https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots | jq 'length'

# Monitor real-time (updates every second)
watch -n 1 'curl -s https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots | jq ".[0].timestamp"'
```

### Response Format

```json
[
  {
    "station_id": "STATION_3",
    "extension": "3333",
    "call_id": "STATION_3-1765232875623",
    "timestamp": "2025-12-09T22:28:08.123Z",
    "metrics": {
      "snr": 25.3,
      "audio_level": -18.5,
      "stt_latency": 145,
      "cpu_usage": 34.2,
      "memory_usage": 512.5
      // ... 18-19 more metrics
    },
    "knobs": [],
    "alerts": [],
    "metadata": {
      "state": "active",
      "legacy_format": true
    },
    "metric_count": 23,
    "knob_count": 0
  },
  // ... up to 100 snapshots
]
```

---

## 10. Port Configuration

### Active Ports

```yaml
Monitoring Ports:
  3001:  monitoring-server (Socket.IO)
  8080:  monitoring-server (HTTP)
  8083:  database-api-server (HTTP)

STTTTSserver Ports:
  3020:  HTTP API
  6211:  Socket.IO (monitoring client)

Cloudflared:
  20241: Internal metrics (localhost only)

External Access:
  HTTPS: cloudflared tunnel (no port, HTTPS only)
```

### Port Verification

```bash
# Check monitoring ports
ss -tlnp | grep -E '3001|8080|8083'

# Expected output:
# *:3001  users:(("node",pid=1400548,fd=19))  # monitoring-server Socket.IO
# *:8080  users:(("node",pid=1400548,fd=18))  # monitoring-server HTTP
# *:8083  users:(("node",pid=1398327,fd=18))  # database-api-server
```

---

## 11. Log Files

### Active Log Files

```yaml
/tmp/monitoring-guide.log:
  - Process: monitoring-server (PID 1400548)
  - Shows: Received metrics, processed metrics, broadcasting
  - Pattern: "[Monitoring Server] 📊 Processed legacy metrics for STATION_3_3333"

/tmp/STTTTSserver-guide.log:
  - Process: STTTTSserver (PID 1402819)
  - Shows: Station-3 and Station-9 metric collection
  - Pattern: "[STATION_3-3333] 📊 Sent metrics to monitoring"
  - Frequency: Every ~200ms per extension

/tmp/monitoring-to-database-NEW.log:
  - Process: monitoring-to-database-bridge (PID 1428739)
  - Shows: Snapshot storage confirmations
  - Pattern: "[10:28:08 PM] ✅ Stored STATION_3-3333: 23 metrics, 0 knobs"
  - Frequency: Every ~200ms per extension

/tmp/database-api-guide.log:
  - Process: database-api-server (PID 1398327)
  - Shows: POST /store-snapshot and GET /api/snapshots requests
  - Pattern: "[Database API] POST /store-snapshot - Stored snapshot for STATION_3-3333"

/tmp/cloudflared.log:
  - Process: cloudflared (PID 1345193)
  - Shows: Tunnel status and public URL
  - Contains: Public HTTPS URL
```

### Log Monitoring Commands

```bash
# Monitor Station-3 collection (should see ~5 per second per extension)
tail -f /tmp/STTTTSserver-guide.log | grep STATION-3

# Monitor bridge storage
tail -f /tmp/monitoring-to-database-NEW.log

# Monitor monitoring-server processing
tail -f /tmp/monitoring-guide.log

# Check for errors across all logs
tail -f /tmp/monitoring-guide.log /tmp/monitoring-to-database-NEW.log /tmp/STTTTSserver-guide.log | grep -i error
```

---

## 12. Startup Procedure

### Complete Monitoring System Startup

**CRITICAL ORDER - Must follow exactly:**

```bash
# STEP 1: Start database-api-server FIRST
cd /home/azureuser/translation-app
nohup node database-api-server.js > /tmp/database-api-guide.log 2>&1 &
echo "Started database-api-server"
sleep 2

# STEP 2: Start monitoring-server SECOND
cd /home/azureuser/translation-app
nohup node monitoring-server.js > /tmp/monitoring-guide.log 2>&1 &
echo "Started monitoring-server"
sleep 2

# STEP 3: Start STTTTSserver THIRD
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
nohup node STTTTSserver.js > /tmp/STTTTSserver-guide.log 2>&1 &
echo "Started STTTTSserver"
sleep 3

# STEP 4: Start monitoring-to-database-bridge FOURTH
# CRITICAL: This is NOT in the installation guide but is REQUIRED!
cd /home/azureuser/translation-app
nohup node monitoring-to-database-bridge.js > /tmp/monitoring-to-database-NEW.log 2>&1 &
echo "Started monitoring-to-database-bridge"
sleep 3

# STEP 5: Start cloudflared LAST (optional, for public access)
cd /home/azureuser
nohup ./cloudflared-linux-amd64 tunnel --url http://localhost:8083 > /tmp/cloudflared.log 2>&1 &
echo "Started cloudflared"
sleep 5

# Get public URL
tail -30 /tmp/cloudflared.log | grep trycloudflare.com
```

### Verification After Startup

```bash
# Check all processes running
ps aux | grep -E 'monitoring-server|monitoring-to-database-bridge|database-api-server|STTTTSserver|cloudflared' | grep -v grep

# Expected output (5 processes):
# azureuser  1398327  ... node database-api-server.js
# azureuser  1400548  ... node monitoring-server.js
# azureuser  1402819  ... node STTTTSserver.js
# azureuser  1428739  ... node monitoring-to-database-bridge.js
# azureuser  1345193  ... ./cloudflared-linux-amd64 tunnel

# Check monitoring-to-database-bridge is storing data
tail -20 /tmp/monitoring-to-database-NEW.log
# Should see: ✅ Stored STATION_3-3333: 23 metrics, 0 knobs (every ~200ms)

# Check Station-3 is collecting
tail -20 /tmp/STTTTSserver-guide.log | grep STATION-3
# Should see: [STATION_3-3333] 📊 Sent metrics to monitoring (every ~200ms)

# Test public API
curl https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots | jq 'length'
# Should return: 100 (or less if just started)
```

---

## 13. Health Monitoring

### System Health Checks

```bash
# Check 1: All processes running
ps aux | grep -E 'monitoring-server|monitoring-to-database-bridge|database-api-server|STTTTSserver' | grep -v grep | wc -l
# Expected: 4

# Check 2: Station-3 collecting (should see ~5 per second)
timeout 5 tail -f /tmp/STTTTSserver-guide.log | grep -c STATION-3
# Expected: ~10 (2 extensions × 5 per second × 1 second)

# Check 3: Bridge storing data
timeout 2 tail -f /tmp/monitoring-to-database-NEW.log | grep -c "✅ Stored"
# Expected: ~10

# Check 4: API has data
curl -s http://localhost:8083/api/snapshots | jq 'length'
# Expected: >0 (up to 100)

# Check 5: Public API accessible
curl -s https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots | jq 'length'
# Expected: Same as Check 4

# Check 6: Recent data (timestamp within last 5 seconds)
LATEST=$(curl -s http://localhost:8083/api/snapshots | jq -r '.[0].timestamp')
echo "Latest timestamp: $LATEST"
# Should be very recent

# Check 7: No errors in logs
tail -100 /tmp/monitoring-guide.log | grep -i error
tail -100 /tmp/monitoring-to-database-NEW.log | grep -i error
tail -100 /tmp/STTTTSserver-guide.log | grep -i error
# Expected: No output (no errors)
```

### Performance Metrics

```bash
# Collection rate (should be ~5 per second per extension = 10 total)
echo "Measuring Station-3 collection rate..."
COUNT=$(timeout 10 tail -f /tmp/STTTTSserver-guide.log | grep -c STATION-3)
RATE=$(echo "scale=1; $COUNT / 10" | bc)
echo "Collection rate: $RATE per second (expected: ~10)"

# Storage rate (should match collection rate)
echo "Measuring storage rate..."
COUNT=$(timeout 10 tail -f /tmp/monitoring-to-database-NEW.log | grep -c "✅ Stored")
RATE=$(echo "scale=1; $COUNT / 10" | bc)
echo "Storage rate: $RATE per second (expected: ~10)"

# API response time
echo "Testing API response time..."
time curl -s http://localhost:8083/api/snapshots > /dev/null
# Expected: <100ms
```

---

## 14. Metrics Specification

### Station-3 Metrics (23-24 metrics)

```yaml
Audio Quality (4 metrics):
  snr:
    name: Signal-to-Noise Ratio
    unit: dB
    range: 0-100
    typical: 15-35

  audio_level:
    name: Audio Level
    unit: dBFS
    range: -60 to 0
    typical: -30 to -10

  audio_quality_score:
    name: Overall Audio Quality
    unit: score
    range: 0-1
    typical: 0.7-0.95

  peak_amplitude:
    name: Peak Audio Level
    unit: dBFS
    range: -60 to 0
    typical: -20 to -5

Latency (4 metrics):
  stt_latency:
    name: Speech-to-Text Latency
    unit: milliseconds
    range: 50-500
    typical: 100-200

  mt_latency:
    name: Machine Translation Latency
    unit: milliseconds
    range: 30-300
    typical: 50-150

  tts_latency:
    name: Text-to-Speech Latency
    unit: milliseconds
    range: 100-1000
    typical: 200-400

  end_to_end_latency:
    name: Total Pipeline Latency
    unit: milliseconds
    range: 200-2000
    typical: 400-800

System Resources (3 metrics):
  cpu_usage:
    name: CPU Usage
    unit: percent
    range: 0-100
    typical: 20-60

  memory_usage:
    name: Memory Usage
    unit: MB
    range: 0-4096
    typical: 256-1024

  process_uptime:
    name: Process Uptime
    unit: seconds
    range: 0-∞
    typical: 3600+

Network (3 metrics):
  packet_loss:
    name: Packet Loss Rate
    unit: percent
    range: 0-100
    typical: 0-2

  jitter:
    name: Network Jitter
    unit: milliseconds
    range: 0-500
    typical: 5-30

  bandwidth_usage:
    name: Network Bandwidth
    unit: kbps
    range: 0-1000
    typical: 64-256

Additional (9-11 metrics):
  - Stream continuity
  - Buffer status
  - Processing rate
  - Quality degradation
  - Error counts
  - Connection status
  - Timestamp drift
  - Frame drops
  - Plus 1-3 more depending on call state
```

### Metric Update Frequency

```
Collection:   Every 200ms (5 times per second)
Transport:    Immediate (Socket.IO real-time)
Broadcasting: Immediate (on receive)
Storage:      Every 200ms (follows collection)
API Access:   On-demand (HTTP GET)
```

### Data Freshness

```
Typical latency from collection to API:
  Collection → STTTTSserver emit:      <1ms
  Socket.IO transport:                 <10ms
  monitoring-server processing:        <5ms
  Bridge HTTP POST:                    <20ms
  Storage in database-api-server:      <5ms
  Total (collection to available):     <50ms

Public API:
  Add cloudflared tunnel overhead:     +10-30ms
  Total to public endpoint:            <100ms
```

---

## Quick Reference

### All PIDs

```
1398327  database-api-server
1400548  monitoring-server
1402819  STTTTSserver (contains Station-3/9)
1428739  monitoring-to-database-bridge
1345193  cloudflared
```

### All Ports

```
3001  monitoring-server (Socket.IO)
8080  monitoring-server (HTTP)
8083  database-api-server
3020  STTTTSserver (HTTP)
6211  STTTTSserver (Socket.IO)
```

### All Log Files

```
/tmp/monitoring-guide.log             monitoring-server
/tmp/STTTTSserver-guide.log           STTTTSserver
/tmp/monitoring-to-database-NEW.log   bridge
/tmp/database-api-guide.log           API server
/tmp/cloudflared.log                  tunnel
```

### Public URL

```
https://inter-using-helpful-latitude.trycloudflare.com/api/snapshots
```

---

**END OF OPERATIONAL DOCUMENTATION**
