# Station-3 Integration Handoff Document

**Date:** 2025-12-07
**Context:** Station-3 monitoring integration with API access
**Status:** Bridge operational, awaiting API integration

---

## Executive Summary

We are connecting Station-3 monitoring data (75 metrics + 113 knobs) to the monitoring API so it can be accessed via HTTP endpoints. Station-3 is the Voice Monitor/Enhancer service (STTTTSserver) with two extensions: 3333 (English) and 4444 (French).

**Current State:**
- ✅ Station-3 data IS flowing from STTTTSserver to monitoring-server.js (port 3001)
- ✅ Bridge IS receiving and storing Station-3 data on port 3009
- ❌ Bridge data NOT YET accessible via the public monitoring API (port 3090/8080)

**Next Step:**
- Integrate the bridge (port 3009) with monitoring API (port 3090) so Station-3 data appears in `/api/snapshots`

---

## System Architecture Overview

### Current Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  STTTTSserver.js (Port 3020)                                │
│  - Voice translation service                                 │
│  - Extensions 3333 (English) and 4444 (French)              │
│  - Uses StationAgent-Unified to track metrics               │
│  └──► Emits 'unified-metrics' via Socket.IO                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  monitoring-server.js (Port 3001)                           │
│  - Socket.IO server                                          │
│  - Receives 'unified-metrics' events from StationAgent      │
│  - Broadcasts to connected clients                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  monitoring-api-bridge.js (Port 3009) ⚠️ LOCALHOST ONLY    │
│  - Socket.IO client connected to port 3001                  │
│  - Listens for 'unified-metrics' and 'metrics' events      │
│  - Stores latest data in memory                             │
│  - Exposes HTTP endpoints:                                   │
│    • GET /api/station3                                       │
│    • GET /api/station3/snapshots                            │
│    • GET /health                                             │
│  - PID: 3930054 (running)                                   │
└─────────────────────────────────────────────────────────────┘
                           ↓ (NOT YET CONNECTED)
┌─────────────────────────────────────────────────────────────┐
│  monitoring-api-no-fake.js (Port 3090)                      │
│  - Main monitoring API                                       │
│  - Uses RealStationCollector for Stations 1, 2, 4-12       │
│  - Does NOT yet query port 3009 for Station-3 data         │
│  - PID: 3750111 (running)                                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  proxy-8080.js (Port 8080)                                  │
│  - HTTP proxy forwarding to port 3090                       │
│  - Public access point                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## What We Learned

### 1. Station-3 Data Structure

Station-3 provides comprehensive telemetry via `StationAgent-Unified.js`:

**75 Metrics Per Extension:**
- **DSP Metrics:** AGC (enabled, level, gain applied), AEC (enabled, tail length, suppression), noise reduction
- **Audio Quality:** MOS score, PESQ score, SNR, signal level, noise level
- **Buffer Metrics:** size, fill level, underruns, overruns
- **Latency Metrics:** current, average, min, max, jitter, percentiles (p50, p95, p99)
- **Packet Metrics:** received, sent, lost, loss rate, out of order, duplicates, late arrivals
- **Performance Metrics:** CPU usage, memory usage, thread count

**113 Knobs Per Extension:**
- Deepgram configuration (model, language, punctuation, etc.)
- Audio processing parameters
- Network/buffer settings
- Codec configuration
- Performance tuning

### 2. Socket.IO Event Flow

**StationAgent-Unified.js emits:**
```javascript
client.emit('unified-metrics', {
  station_id: 'STATION_3',
  extension: '3333' or '4444',
  timestamp: ISO timestamp,
  metric_count: 75,
  knob_count: 113,
  metrics: { /* all 75 metrics */ },
  knobs: { /* all 113 knobs */ },
  alerts: []
});
```

**monitoring-server.js receives and broadcasts:**
- Listens on port 3001
- Receives 'unified-metrics' events
- Broadcasts to all connected Socket.IO clients

**monitoring-api-bridge.js stores:**
- Connects to port 3001 as Socket.IO client
- Stores data in memory under keys `STATION_3_3333` and `STATION_3_4444`
- Exposes via HTTP on port 3009

### 3. Bridge Verification

**We confirmed the bridge is working:**

```bash
# Health check (from VM)
curl -s http://localhost:3009/health
# Returns:
{
  "status": "ok",
  "connected": true,
  "monitoring_server": "http://localhost:3001",
  "station3_3333": "available",
  "station3_4444": "available",
  "timestamp": "2025-12-07T20:42:03.773Z"
}

# Data endpoint (from VM)
curl -s http://localhost:3009/api/station3
# Returns full Station-3 data with 75 metrics + 113 knobs
```

**Data Sample:**
```json
{
  "STATION_3_3333": {
    "station_id": "STATION_3",
    "extension": "3333",
    "status": "active",
    "metrics": {
      "dsp": {
        "agc": { "enabled": 1, "level": -20, "gain_applied": 3.2 },
        "aec": { "enabled": 1, "tail_length": 128, "suppression": 12 },
        "noise_reduction": { "enabled": 1, "level": 15 }
      },
      "audio_quality": {
        "mos_score": 4.39,
        "pesq_score": 4.5,
        "snr": 35.2
      },
      "latency": {
        "current_ms": 45,
        "average_ms": 46,
        "min_ms": 42,
        "max_ms": 52,
        "jitter_ms": 2.3
      },
      "packet": {
        "received": 15234,
        "sent": 15200,
        "lost": 34,
        "loss_rate": 0.0028
      }
      // ... 71 more metrics
    },
    "knobs": {
      "deepgram": {
        "model": "nova-3",
        "language": "en",
        "punctuate": true,
        "interimResults": true
      }
      // ... 109 more knobs
    },
    "metric_count": 75,
    "knob_count": 113,
    "lastUpdate": "2025-12-07T20:42:03.000Z"
  },
  "STATION_3_4444": {
    // Same structure for French extension
  }
}
```

### 4. Why Port 3009 is Not Accessible Externally

**The bridge runs on port 3009, bound to localhost (127.0.0.1) only:**
- Not accessible from user's local machine
- No NSG rule exists for port 3009
- Not bound to external interface (0.0.0.0)

**Why this is correct:**
- Security: No need to expose another port publicly
- Architecture: The monitoring API (port 3090) should query it internally
- Simplicity: One public API endpoint for all stations

---

## What We're Trying to Achieve

### Goal
Make Station-3 data (75 metrics + 113 knobs) accessible via the monitoring API at:
```
http://20.170.155.53:8080/api/snapshots
```

### Expected Response Format

When Station-3 is integrated, `/api/snapshots` should return:

```json
{
  "stations": {
    "Station-1": { /* existing stations */ },
    "Station-2": { /* existing stations */ },
    "Station-3": {
      "extension_3333": {
        "station_id": "STATION_3",
        "extension": "3333",
        "status": "active",
        "metrics": {
          "dsp": { /* DSP metrics */ },
          "audio_quality": { /* quality metrics */ },
          "latency": { /* latency metrics */ },
          "packet": { /* packet metrics */ }
        },
        "knobs": {
          "deepgram": { /* Deepgram config */ }
        },
        "metric_count": 75,
        "knob_count": 113,
        "lastUpdate": "2025-12-07T..."
      },
      "extension_4444": {
        "station_id": "STATION_3",
        "extension": "4444",
        "status": "active",
        "metrics": { /* same structure */ },
        "knobs": {
          "deepgram": {
            "model": "nova-3",
            "language": "fr"  // French for 4444
          }
        }
      }
    },
    "Station-4": { /* other stations */ }
  },
  "timestamp": "2025-12-07T..."
}
```

### Why This Matters

1. **Unified API Access:** All 12 stations (24 extensions) accessible from one endpoint
2. **Real-time Monitoring:** Station-3 provides live voice translation quality metrics
3. **Dynamic Configuration:** 113 knobs allow AI/optimizer to tune Deepgram settings
4. **Foundation for All Stations:** Station-3 is the template - once working, clone to all other stations

---

## Current Status

### What's Working ✅

1. **STTTTSserver.js is running** (PID varies, check with `ps aux | grep STTTTSserver`)
   - Location: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/`
   - Extensions 3333 and 4444 active
   - Using StationAgent-Unified to track metrics

2. **monitoring-server.js is running** (check with `ps aux | grep monitoring-server`)
   - Location: `/home/azureuser/translation-app/`
   - Port 3001 (Socket.IO server)
   - Receiving 'unified-metrics' events from Station-3

3. **monitoring-api-bridge.js is running** (PID: 3930054)
   - Location: `/home/azureuser/translation-app/`
   - Port 3009 (HTTP API)
   - Connected to monitoring-server.js
   - Successfully receiving and storing Station-3 data
   - Endpoints working on localhost:
     - `http://localhost:3009/api/station3`
     - `http://localhost:3009/api/station3/snapshots`
     - `http://localhost:3009/health`

4. **monitoring-api-no-fake.js is running** (PID: 3750111)
   - Location: `/home/azureuser/translation-app/monitoring/`
   - Port 3090 (HTTP API)
   - Serving Stations 1, 2, 4-12 data
   - Does NOT include Station-3 yet

5. **proxy-8080.js is running**
   - Location: `/home/azureuser/translation-app/`
   - Port 8080 (HTTP proxy)
   - Forwards to port 3090

### What's Missing ❌

1. **monitoring-api-no-fake.js does NOT query the bridge**
   - It needs to fetch Station-3 data from `http://localhost:3009/api/station3`
   - Merge Station-3 data into the `/api/snapshots` response
   - This is the ONLY missing piece

---

## Files and Locations

### On VM (20.170.155.53)

**Core Services:**
```
/home/azureuser/translation-app/
├── 3333_4444__Operational/
│   ├── STTTTSserver/
│   │   ├── STTTTSserver.js                     # Main voice translation service
│   │   └── monitoring/
│   │       └── StationAgent-Unified.js          # Metrics collection agent
│   ├── gateway-3333.js                          # ARI gateway for extension 3333
│   └── gateway-4444.js                          # ARI gateway for extension 4444
│
├── monitoring/
│   ├── monitoring-api-no-fake.js                # Main API (port 3090) - NEEDS UPDATE
│   └── monitoring-real-data-collector-no-fake-fixed.js  # Data collector
│
├── monitoring-server.js                         # Socket.IO server (port 3001)
├── monitoring-api-bridge.js                     # Station-3 bridge (port 3009)
└── proxy-8080.js                                # HTTP proxy (port 8080)
```

**Key Files Previously Created (in /tmp on VM):**
```
/tmp/
├── station3-api-bridge.js              # Original bridge (renamed to monitoring-api-bridge.js)
├── station3-socketio-bridge.js         # Alternative bridge design
├── StationAgent-Unified.js             # Reference copy of metrics agent
└── STATION_3-3333-config.json          # Config file for extension 3333
└── STATION_3-4444-config.json          # Config file for extension 4444
```

**Documentation:**
```
/Users/sagivstavinsky/realtime-translation-enhanced_astrix/Docs/sys/monitoring/
├── STATION_3_RECOVERY_PLAN.md          # Detailed recovery plan with all 75 metrics + 113 knobs
└── (other docs)
```

### Key Code References

**StationAgent-Unified.js:20** - Socket.IO connection to port 3001
```javascript
monitoringClient = ioClient('http://localhost:3001', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

**StationAgent-Unified.js:92** - Emits unified-metrics event
```javascript
client.emit('unified-metrics', data);
```

**monitoring-api-bridge.js:44** - Listens for unified-metrics
```javascript
socket.on('unified-metrics', (data) => {
  if (data.station_id === 'STATION_3' && data.extension) {
    const key = `STATION_3_${data.extension}`;
    station3Data[key] = { /* store data */ };
  }
});
```

**monitoring-api-no-fake.js:23** - GET /api/snapshots endpoint (NEEDS UPDATE)
```javascript
app.get('/api/snapshots', (req, res) => {
    try {
        const snapshot = collector.getAllMetrics();
        res.json(snapshot);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get snapshots' });
    }
});
```

---

## What We're Doing Right Now

### The Task
Modify `monitoring-api-no-fake.js` to:
1. Query `http://localhost:3009/api/station3` internally
2. Merge Station-3 data into the existing snapshot
3. Return complete data including Station-3

### Why This Approach

**Other options considered:**
- ❌ Expose port 3009 externally → Security concern, adds complexity
- ❌ Modify RealStationCollector → Wrong layer, collector is for other stations
- ❌ Modify STTTTSserver directly → Too risky, operational system
- ✅ Query bridge from API → Clean, simple, maintainable

### Implementation Plan

**Step 1:** Modify `/home/azureuser/translation-app/monitoring/monitoring-api-no-fake.js`

Add at the top:
```javascript
const http = require('http');

const STATION3_BRIDGE_URL = 'http://localhost:3009/api/station3';

async function fetchStation3Data() {
    return new Promise((resolve) => {
        const req = http.get(STATION3_BRIDGE_URL, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(null);
                }
            });
        });
        req.on('error', () => resolve(null));
        req.setTimeout(1000, () => { req.abort(); resolve(null); });
    });
}
```

Modify the `/api/snapshots` endpoint:
```javascript
app.get('/api/snapshots', async (req, res) => {
    try {
        // Get data from existing collector (Stations 1, 2, 4-12)
        const snapshot = collector.getAllMetrics();

        // Fetch Station-3 data from the bridge
        const station3Data = await fetchStation3Data();

        // Merge Station-3 data into the snapshot
        if (station3Data) {
            if (!snapshot.stations) {
                snapshot.stations = {};
            }

            snapshot.stations['Station-3'] = {
                'extension_3333': station3Data.STATION_3_3333,
                'extension_4444': station3Data.STATION_3_4444
            };
        }

        res.json(snapshot);
    } catch (error) {
        console.error('[API] Error getting snapshots:', error);
        res.status(500).json({ error: 'Failed to get snapshots' });
    }
});
```

**Step 2:** Restart the monitoring API
```bash
ssh azureuser@20.170.155.53 "ps aux | grep 'monitoring-api-no-fake' | grep -v grep | awk '{print \$2}' | xargs -r kill"
sleep 2
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/monitoring && nohup node monitoring-api-no-fake.js > /tmp/monitoring-api-with-station3.log 2>&1 & echo 'PID:' \$!"
```

**Step 3:** Verify integration
```bash
# From local machine
curl -s http://20.170.155.53:8080/api/snapshots | jq '.stations."Station-3"'

# Should return:
{
  "extension_3333": {
    "station_id": "STATION_3",
    "extension": "3333",
    "status": "active",
    "metrics": { /* 75 metrics */ },
    "knobs": { /* 113 knobs */ }
  },
  "extension_4444": { /* same structure */ }
}
```

---

## Verification Commands

### Check if services are running

```bash
# On VM
ssh azureuser@20.170.155.53 "ps aux | grep -E 'STTTTSserver|monitoring-server|monitoring-api-bridge|monitoring-api-no-fake' | grep -v grep"
```

Expected output:
```
azureuser  XXXXX  ... node STTTTSserver.js
azureuser  XXXXX  ... node monitoring-server.js
azureuser  3930054 ... node monitoring-api-bridge.js
azureuser  3750111 ... node monitoring-api-no-fake.js
```

### Check port bindings

```bash
ssh azureuser@20.170.155.53 "netstat -tlnp 2>/dev/null | grep -E '3001|3009|3020|3090|8080'"
```

Expected output:
```
tcp  0  0  0.0.0.0:3020   0.0.0.0:*  LISTEN  PID/node  # STTTTSserver
tcp  0  0  0.0.0.0:3001   0.0.0.0:*  LISTEN  PID/node  # monitoring-server
tcp  0  0  127.0.0.1:3009 0.0.0.0:*  LISTEN  3930054/node  # bridge
tcp  0  0  0.0.0.0:3090   0.0.0.0:*  LISTEN  3750111/node  # API
tcp  0  0  0.0.0.0:8080   0.0.0.0:*  LISTEN  PID/node  # proxy
```

### Test bridge locally (from VM)

```bash
ssh azureuser@20.170.155.53 "curl -s http://localhost:3009/health | jq"
```

Expected:
```json
{
  "status": "ok",
  "connected": true,
  "monitoring_server": "http://localhost:3001",
  "station3_3333": "available",
  "station3_4444": "available"
}
```

### Test monitoring API (from local machine)

```bash
curl -s http://20.170.155.53:8080/api/snapshots | jq '.stations | keys'
```

Current output (before integration):
```json
["Station-1", "Station-2", "Station-4", ...]  # No Station-3
```

After integration:
```json
["Station-1", "Station-2", "Station-3", "Station-4", ...]  # Station-3 included!
```

### Test Station-3 specific endpoint

```bash
curl -s "http://20.170.155.53:8080/api/snapshots/Station-3/3333" | jq
```

Should return Station-3 extension 3333 data with 75 metrics and 113 knobs.

---

## Troubleshooting

### Bridge Not Receiving Data

**Check monitoring-server.js logs:**
```bash
ssh azureuser@20.170.155.53 "tail -100 /tmp/monitoring-server-*.log | grep -E 'unified-metrics|STATION_3'"
```

**Check bridge logs:**
```bash
ssh azureuser@20.170.155.53 "tail -100 /tmp/monitoring-api-bridge.log | grep -E 'Connected|Updated|STATION_3'"
```

**Restart the chain:**
```bash
# 1. Restart monitoring-server
ssh azureuser@20.170.155.53 "ps aux | grep monitoring-server | grep -v grep | awk '{print \$2}' | xargs -r kill"
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app && nohup node monitoring-server.js > /tmp/monitoring-server.log 2>&1 &"

# 2. Restart bridge
ssh azureuser@20.170.155.53 "ps aux | grep monitoring-api-bridge | grep -v grep | awk '{print \$2}' | xargs -r kill"
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app && nohup node monitoring-api-bridge.js > /tmp/monitoring-api-bridge.log 2>&1 &"

# 3. Wait 5 seconds
sleep 5

# 4. Test
ssh azureuser@20.170.155.53 "curl -s http://localhost:3009/health"
```

### API Not Showing Station-3

**Check if bridge is accessible from API:**
```bash
ssh azureuser@20.170.155.53 "curl -s http://localhost:3009/api/station3 | jq '.STATION_3_3333.status'"
```

Should return: `"active"`

**Check API logs:**
```bash
ssh azureuser@20.170.155.53 "tail -100 /tmp/monitoring-api-*.log | grep -E 'Station-3|station3|error|Error'"
```

**Verify API code was updated:**
```bash
ssh azureuser@20.170.155.53 "grep -n 'fetchStation3Data\|STATION3_BRIDGE_URL' /home/azureuser/translation-app/monitoring/monitoring-api-no-fake.js"
```

Should show the new code.

### STTTTSserver Not Emitting Metrics

**Check if StationAgent is loaded:**
```bash
ssh azureuser@20.170.155.53 "grep -n 'StationAgent' /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js | head -5"
```

**Check STTTTSserver logs:**
```bash
ssh azureuser@20.170.155.53 "tail -100 /tmp/STTTTSserver*.log | grep -E 'StationAgent|unified-metrics|STATION_3'"
```

**Restart STTTTSserver:**
```bash
ssh azureuser@20.170.155.53 "ps aux | grep STTTTSserver | grep -v grep | awk '{print \$2}' | xargs -r kill"
sleep 2
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && nohup node STTTTSserver.js > /tmp/STTTTSserver.log 2>&1 &"
```

---

## Important Notes

### Port Security
- Port 3009 is intentionally bound to localhost only
- Do NOT expose port 3009 externally
- The monitoring API queries it internally on the VM

### Service Dependencies
```
STTTTSserver (3020)
    ↓ emits to
monitoring-server (3001)
    ↓ broadcasts to
monitoring-api-bridge (3009)
    ↓ queried by
monitoring-api-no-fake (3090)
    ↓ proxied by
proxy-8080 (8080)
```

If any service in the chain stops, Station-3 data won't flow.

### Data Freshness
- StationAgent-Unified emits every 1 second
- Bridge stores latest data in memory
- API queries bridge on each request
- Data is real-time (< 2 seconds old)

### Naming Convention
- File was renamed from `station3-api-bridge.js` to `monitoring-api-bridge.js`
- This bridge will eventually serve ALL stations, not just Station-3
- Station-3 is the template/proof-of-concept

---

## Next Steps After Integration

### 1. Clone to Other Stations

Once Station-3 works, replicate the pattern:

**Stations to integrate:**
- Station-1 (Gateway/Proxy) - extensions 1111, 2222
- Station-2 (Transcription Service) - extensions 5555, 6666
- Station-4 through Station-12 (various services)

**For each station:**
1. Add StationAgent-Unified to the station's service
2. Emit 'unified-metrics' to monitoring-server.js (port 3001)
3. monitoring-api-bridge.js will automatically receive data (modify to handle all stations)
4. Update monitoring API to include all stations

### 2. Add Knob Control API

Enable AI/optimizer to change knobs:

```javascript
// POST /api/config/knobs/Station-3/3333
{
  "deepgram": {
    "model": "nova-3",
    "language": "en",
    "punctuate": true
  }
}
```

This would write to `/tmp/STATION_3-3333-config.json` which Station3Handler polls every 100ms.

### 3. Add Historical Data

Currently, only real-time snapshots are available. Add:
- Time-series database (InfluxDB, TimescaleDB, or simple JSON files)
- `/api/snapshots/history?station=Station-3&extension=3333&timeRange=1h`
- Charts and graphs in the dashboard

### 4. Add Alerts and Notifications

Monitor critical metrics:
- Latency > 200ms
- Packet loss > 5%
- MOS score < 3.5
- Connection failures

Send alerts via webhook, email, or SMS.

---

## Quick Reference

### File Locations
```
VM: /home/azureuser/translation-app/
Local: /Users/sagivstavinsky/realtime-translation-enhanced_astrix/
Docs: /Users/sagivstavinsky/realtime-translation-enhanced_astrix/Docs/sys/monitoring/
```

### Key PIDs (as of last check)
```
monitoring-api-bridge.js: 3930054
monitoring-api-no-fake.js: 3750111
```

### Key Ports
```
3020 - STTTTSserver (voice translation)
3001 - monitoring-server.js (Socket.IO)
3009 - monitoring-api-bridge.js (HTTP, localhost only)
3090 - monitoring-api-no-fake.js (HTTP API)
8080 - proxy-8080.js (public HTTP proxy)
```

### Key Endpoints
```
http://localhost:3009/health - Bridge health check (VM only)
http://localhost:3009/api/station3 - Station-3 data (VM only)
http://20.170.155.53:8080/api/snapshots - All stations (public)
http://20.170.155.53:8080/api/health - API health (public)
```

### Key Commands
```bash
# Restart bridge
ssh azureuser@20.170.155.53 "pkill -f monitoring-api-bridge && cd /home/azureuser/translation-app && nohup node monitoring-api-bridge.js > /tmp/bridge.log 2>&1 &"

# Restart API
ssh azureuser@20.170.155.53 "pkill -f monitoring-api-no-fake && cd /home/azureuser/translation-app/monitoring && nohup node monitoring-api-no-fake.js > /tmp/api.log 2>&1 &"

# Test bridge locally
ssh azureuser@20.170.155.53 "curl -s http://localhost:3009/health | jq"

# Test API publicly
curl -s http://20.170.155.53:8080/api/snapshots | jq '.stations."Station-3"'
```

---

## Summary

**Where we are:**
- Station-3 monitoring is fully operational
- Data flows from STTTTSserver → monitoring-server → bridge
- Bridge stores data and exposes it on port 3009 (localhost)

**What's needed:**
- One simple modification to monitoring-api-no-fake.js
- Add function to query http://localhost:3009/api/station3
- Merge Station-3 data into /api/snapshots response

**What happens next:**
- Users can access Station-3 via http://20.170.155.53:8080/api/snapshots
- All 75 metrics and 113 knobs visible in the API
- Foundation is ready to clone to all other stations

---

**Document Version:** 1.0
**Last Updated:** 2025-12-07
**Contact:** See conversation history for full technical context
