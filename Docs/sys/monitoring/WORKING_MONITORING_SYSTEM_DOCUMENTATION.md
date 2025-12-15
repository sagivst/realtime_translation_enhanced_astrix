
# Monitoring System - Complete Reverse Engineering Documentation

**Version:** 1.0
**Date:** December 9, 2025
**VM:** Dev VM (20.170.155.53) - NEVER touch production VM (4.185.84.26)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Flow Chart](#2-architecture-flow-chart)
3. [JavaScript Files](#3-javascript-files)
4. [Socket.IO Events](#4-socketio-events)
5. [HTTP API Endpoints](#5-http-api-endpoints)
6. [Data Structures](#6-data-structures)
7. [Port Assignments](#7-port-assignments)
8. [Configuration System](#8-configuration-system)
9. [Public Access](#9-public-access)
10. [Startup Sequence](#10-startup-sequence)

---

## 1. System Overview

The monitoring system collects real-time metrics from translation pipeline stations and exposes them via a public API. It uses:

- **Socket.IO** for real-time event communication
- **In-memory storage** for metrics snapshots (last 1000 entries)
- **HTTP REST API** for external access
- **Cloudflare Tunnel** for public exposure

### Key Stations Monitored:

| Station | Extension | Purpose |
|---------|-----------|---------|
| STATION_3 | 3333 | STT/Deepgram (English) |
| STATION_3 | 4444 | STT/Deepgram (French) |
| STATION_9 | 3333 | TTS Output (English) |
| STATION_9 | 4444 | TTS Output (French) |

---

## 2. Architecture Flow Chart

```
                              MONITORING SYSTEM ARCHITECTURE
    ════════════════════════════════════════════════════════════════════════════

    ┌──────────────────────────────────────────────────────────────────────────┐
    │                           DATA SOURCES                                    │
    │                                                                          │
    │   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
    │   │ Station-3 (STT) │    │ Station-9 (TTS) │    │   Continuous    │     │
    │   │  14 parameters  │    │  15 parameters  │    │ Metrics Emitter │     │
    │   │                 │    │                 │    │   (baseline)    │     │
    │   │ • transcript    │    │ • pcmBuffer     │    │                 │     │
    │   │ • confidence    │    │ • bufferSize    │    │ • snr, rms      │     │
    │   │ • language      │    │ • snr, rms      │    │ • mos, jitter   │     │
    │   │ • snr, rms, mos │    │ • mos, clipping │    │ • latency       │     │
    │   └────────┬────────┘    └────────┬────────┘    └────────┬────────┘     │
    │            │                      │                      │               │
    └────────────┼──────────────────────┼──────────────────────┼───────────────┘
                 │                      │                      │
                 ▼                      ▼                      ▼
    ┌──────────────────────────────────────────────────────────────────────────┐
    │                                                                          │
    │                   socket.emit('unified-metrics', data)                   │
    │                                                                          │
    └──────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
    ┌──────────────────────────────────────────────────────────────────────────┐
    │                                                                          │
    │   ┌───────────────────────────────────────────────────────────────────┐  │
    │   │                    MONITORING-SERVER.JS                           │  │
    │   │                        Port: 3001                                 │  │
    │   │                                                                   │  │
    │   │   Socket.IO Server (receives + re-emits)                         │  │
    │   │                                                                   │  │
    │   │   Events Handled:                                                 │  │
    │   │   • 'unified-metrics' → stores + re-emits to all clients         │  │
    │   │   • 'metrics' (legacy) → converts + re-emits                     │  │
    │   │   • 'register-station' → registers station capabilities          │  │
    │   │   • 'apply-knobs' → broadcasts knob changes                      │  │
    │   │                                                                   │  │
    │   │   Storage:                                                        │  │
    │   │   • metricsDatabase.stations = { key: { metrics, knobs, ... } }  │  │
    │   │   • metricsDatabase.history = [ last 1000 records ]              │  │
    │   │                                                                   │  │
    │   │   Also exposes HTTP API on Port 8080:                            │  │
    │   │   • GET /api/stations                                            │  │
    │   │   • GET /api/stats                                               │  │
    │   │   • GET /api/database-records                                    │  │
    │   │   • GET /database-records.html (dashboard)                       │  │
    │   │                                                                   │  │
    │   └───────────────────────────────────────────────────────────────────┘  │
    │                                                                          │
    └────────────────────────────────────┬─────────────────────────────────────┘
                                         │
                    io.emit('unified-metrics', data)
                                         │
                                         ▼
    ┌──────────────────────────────────────────────────────────────────────────┐
    │                                                                          │
    │   ┌───────────────────────────────────────────────────────────────────┐  │
    │   │              MONITORING-TO-DATABASE-BRIDGE.JS                     │  │
    │   │                                                                   │  │
    │   │   Socket.IO Client (connects to localhost:3001)                  │  │
    │   │                                                                   │  │
    │   │   Listens for:                                                    │  │
    │   │   • 'unified-metrics' → transforms + POSTs to database           │  │
    │   │   • 'metrics' (legacy) → transforms + POSTs to database          │  │
    │   │                                                                   │  │
    │   │   Transforms data to snapshot format:                            │  │
    │   │   {                                                               │  │
    │   │     id: "1733...-abc123",                                        │  │
    │   │     station_id: "STATION_3",                                     │  │
    │   │     extension: "3333",                                           │  │
    │   │     timestamp: "2025-12-09T...",                                 │  │
    │   │     metrics: { ... },                                            │  │
    │   │     knobs: { ... }                                               │  │
    │   │   }                                                               │  │
    │   │                                                                   │  │
    │   └───────────────────────────────────────────────────────────────────┘  │
    │                                                                          │
    └────────────────────────────────────┬─────────────────────────────────────┘
                                         │
                    HTTP POST /api/monitoring-data
                                         │
                                         ▼
    ┌──────────────────────────────────────────────────────────────────────────┐
    │                                                                          │
    │   ┌───────────────────────────────────────────────────────────────────┐  │
    │   │                  DATABASE-API-SERVER.JS                           │  │
    │   │                        Port: 8083                                 │  │
    │   │                                                                   │  │
    │   │   Express HTTP Server                                             │  │
    │   │                                                                   │  │
    │   │   In-Memory Storage:                                              │  │
    │   │   • let snapshots = []  (max 1000 entries)                       │  │
    │   │   • let stations = {}                                             │  │
    │   │                                                                   │  │
    │   │   Endpoints:                                                      │  │
    │   │   • GET  /api/snapshots       → Returns last 100 snapshots       │  │
    │   │   • GET  /api/stations        → Returns station data             │  │
    │   │   • POST /api/monitoring-data → Stores new snapshot              │  │
    │   │   • GET  /api/health          → Health check                     │  │
    │   │                                                                   │  │
    │   └───────────────────────────────────────────────────────────────────┘  │
    │                                                                          │
    └────────────────────────────────────┬─────────────────────────────────────┘
                                         │
                                         ▼
    ┌──────────────────────────────────────────────────────────────────────────┐
    │                                                                          │
    │   ┌───────────────────────────────────────────────────────────────────┐  │
    │   │                  CLOUDFLARED TUNNEL                               │  │
    │   │                                                                   │  │
    │   │   Command: ./cloudflared-linux-amd64 tunnel --url localhost:8083 │  │
    │   │                                                                   │  │
    │   │   Public URL (dynamic, changes on restart):                      │  │
    │   │   https://xxx-yyy-zzz.trycloudflare.com                          │  │
    │   │                                                                   │  │
    │   │   Exposes:                                                        │  │
    │   │   • GET /api/snapshots                                           │  │
    │   │   • GET /api/stations                                            │  │
    │   │   • GET /api/health                                              │  │
    │   │                                                                   │  │
    │   └───────────────────────────────────────────────────────────────────┘  │
    │                                                                          │
    └──────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
                            ┌─────────────────────────┐
                            │     EXTERNAL CLIENT     │
                            │                         │
                            │  Dashboard / API Client │
                            │                         │
                            │  Polls /api/snapshots   │
                            │  to get latest metrics  │
                            └─────────────────────────┘
```

---

## 3. JavaScript Files

### 3.1 monitoring-server.js

**Location:** `/home/azureuser/translation-app/monitoring-server.js`
**Ports:** 3001 (Socket.IO), 8080 (HTTP API)

**Purpose:** Central hub that receives all metrics via Socket.IO, stores them in memory, and re-broadcasts to connected clients.

**Key Code Sections:**

```javascript
// Socket.IO server setup
const io = socketIO(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// In-memory database
const metricsDatabase = {
  stations: {},  // station_id -> { metrics, knobs, alerts, metadata }
  history: [],   // time-series data (last 1000 records)
  maxHistorySize: 1000
};

// Handle unified metrics
socket.on('unified-metrics', (data) => {
  const { station_id, extension, call_id, timestamp, metrics, knobs, alerts, metadata } = data;
  const key = extension ? `${station_id}_${extension}` : station_id;

  // Store in database
  metricsDatabase.stations[key] = { ...data };
  metricsDatabase.history.push(data);

  // Re-emit for bridge to receive
  io.emit("unified-metrics", data);
  io.emit('metrics-update', { station_id, extension, key, data });
});
```

---

### 3.2 monitoring-to-database-bridge.js

**Location:** `/home/azureuser/translation-app/monitoring-to-database-bridge.js`

**Purpose:** Bridges monitoring-server to database-api-server by listening for Socket.IO events and POSTing to HTTP endpoint.

**Key Code Sections:**

```javascript
// Connect to monitoring server
const monitoringSocket = io('http://localhost:3001');

// Listen for unified metrics
monitoringSocket.on('unified-metrics', async (data) => {
  const snapshot = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    station_id: data.station_id,
    extension: data.extension,
    timestamp: data.timestamp || new Date().toISOString(),
    metrics: data.metrics || {},
    knobs: data.knobs || {}
  };

  // POST to database server
  const options = {
    hostname: 'localhost',
    port: 8083,
    path: '/api/monitoring-data',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };

  const req = http.request(options, (res) => { ... });
  req.write(JSON.stringify(snapshot));
  req.end();
});
```

---

### 3.3 database-api-server.js

**Location:** `/home/azureuser/translation-app/database-api-server.js`
**Port:** 8083

**Purpose:** Simple Express HTTP server that stores snapshots in memory and exposes REST API.

**Key Code Sections:**

```javascript
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8083;

// In-memory storage
let snapshots = [];
let stations = {};

// Get snapshots
app.get('/api/snapshots', (req, res) => {
  const recentSnapshots = snapshots.slice(-100);
  res.json(recentSnapshots);
});

// Store new snapshot
app.post('/api/monitoring-data', (req, res) => {
  const data = req.body;
  snapshots.push(data);

  // Keep only last 1000
  if (snapshots.length > 1000) {
    snapshots = snapshots.slice(-1000);
  }

  res.json({ success: true });
});
```

---

### 3.4 continuous-metrics-emitter.js

**Location:** `/home/azureuser/translation-app/continuous-metrics-emitter.js`

**Purpose:** Emits baseline metrics every 5 seconds for all 4 station/extension combinations. This ensures the API always has recent data even when no calls are active.

**Key Code Sections:**

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3001');

const stations = [
  { station_id: 'STATION_3', extension: '3333' },
  { station_id: 'STATION_3', extension: '4444' },
  { station_id: 'STATION_9', extension: '3333' },
  { station_id: 'STATION_9', extension: '4444' }
];

setInterval(() => {
  for (const { station_id, extension } of stations) {
    const metricsData = {
      station_id,
      extension,
      call_id: 'continuous-' + Date.now(),
      timestamp: new Date().toISOString(),
      metrics: {
        snr: 20 + Math.random() * 10,
        rms: -30 + Math.random() * 10,
        mos: 3.5 + Math.random() * 1.0,
        // ... more metrics
      },
      metadata: { state: 'active', continuous_monitoring: true }
    };

    socket.emit('unified-metrics', metricsData);
  }
}, 5000);
```

---

## 4. Socket.IO Events

### 4.1 Emitted by Sources (→ monitoring-server)

| Event | Payload | Source |
|-------|---------|--------|
| `unified-metrics` | `{ station_id, extension, metrics, knobs, alerts, metadata }` | Station handlers, continuous-emitter |
| `metrics` (legacy) | `{ station_id, extension, metrics }` | Older STTTTSserver |
| `register-station` | `{ station_id, extension, capabilities }` | Station agents |

### 4.2 Emitted by monitoring-server (→ clients)

| Event | Payload | Purpose |
|-------|---------|---------|
| `unified-metrics` | Same as received | Re-broadcast for bridge |
| `metrics-update` | `{ station_id, extension, key, data }` | Dashboard updates |
| `critical-alert` | `{ station_id, extension, alerts, timestamp }` | Critical alerts |
| `registration-confirmed` | `{ station_id, extension, timestamp }` | Ack registration |

---

## 5. HTTP API Endpoints

### 5.1 database-api-server.js (Port 8083)

| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/api/snapshots` | Last 100 snapshots array |
| GET | `/api/stations` | Station data object |
| POST | `/api/monitoring-data` | `{ success: true }` |
| GET | `/api/health` | `{ status, uptime, snapshotCount }` |

### 5.2 monitoring-server.js (Port 8080)

| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/api/stations` | All stations with metrics |
| GET | `/api/stations/:id` | Single station data |
| GET | `/api/database-records` | Paginated history |
| GET | `/api/history/:id` | Station-specific history |
| GET | `/api/alerts` | All alerts |
| GET | `/api/stats` | Dashboard statistics |
| GET | `/database-records.html` | Web dashboard |

---

## 6. Data Structures

### 6.1 unified-metrics Payload

```javascript
{
  station_id: "STATION_3",      // STATION_3 or STATION_9
  extension: "3333",            // "3333" or "4444"
  call_id: "continuous-173...", // Unique call identifier
  timestamp: "2025-12-09T...",  // ISO 8601 timestamp

  metrics: {
    // Audio Quality (Station-3: 6 metrics, Station-9: 6 metrics)
    snr: 25.5,                  // Signal-to-Noise Ratio (dB)
    rms: -25.3,                 // RMS level (dBFS)
    clipping: 0.001,            // Clipping percentage (0-1)
    noiseFloor: -55.2,          // Noise floor (dBFS)
    voiceActivity: 0.85,        // Voice activity ratio (0-1)
    mos: 4.2,                   // Mean Opinion Score (1-5)

    // Performance
    processingLatency: 65,      // Milliseconds
    jitter: 8.5,                // Milliseconds
    packetLoss: 0.002,          // Percentage (0-1)
    bufferLevel: 0.75,          // Buffer fill ratio (0-1)

    // Connection
    connected: true,
    lastActivity: 1733784...    // Epoch timestamp
  },

  knobs: {
    // DSP settings (from config-factory-defaults)
    "agc.enabled": true,
    "agc.targetLevel": -20,
    "noiseReduction.level": "moderate",
    // ... 113 total knobs
  },

  alerts: [
    { level: "warning", message: "High latency detected", timestamp: "..." }
  ],

  metadata: {
    state: "active",            // "active", "idle", "error"
    continuous_monitoring: true // True for baseline emitter
  },

  metric_count: 12,
  knob_count: 0
}
```

### 6.2 Snapshot (stored in database)

```javascript
{
  id: "1733784000000-abc123def",
  station_id: "STATION_3",
  extension: "3333",
  timestamp: "2025-12-09T21:20:00.000Z",
  call_id: "continuous-1733784000000",
  channel: "3333",

  metrics: { ... },
  knobs: { ... },

  knobs_effective: [],
  constraints: {},
  targets: {},

  segment: {
    metric_count: 12,
    knob_count: 0
  },

  audio: {},

  totals: {
    metrics_received: 12,
    knobs_received: 0,
    alerts: 0
  }
}
```

---

## 7. Port Assignments

| Port | Service | Protocol | Purpose |
|------|---------|----------|---------|
| 3001 | monitoring-server.js | Socket.IO | Real-time metrics hub |
| 8080 | monitoring-server.js | HTTP | Dashboard API |
| 8083 | database-api-server.js | HTTP | Public snapshots API |

---

## 8. Configuration System

The 113-knob configuration system uses three-layer merging:

```
┌─────────────────┐
│ Factory Defaults │  ← 113 knobs (hardcoded in config-factory-defaults.js)
└────────┬────────┘
         │
         ▼ deepMerge
┌─────────────────┐
│  Saved Defaults  │  ← User modifications (saved to /tmp/STATION_CONFIG-{ext}.json)
└────────┬────────┘
         │
         ▼ deepMerge
┌─────────────────┐
│  Active Config   │  ← Runtime overrides
└─────────────────┘
```

**Configuration Categories (15 total, 113 knobs):**

| Category | Knob Count |
|----------|------------|
| AGC (Automatic Gain Control) | 8 |
| AEC (Acoustic Echo Cancellation) | 7 |
| Noise Reduction | 9 |
| Compressor | 8 |
| Limiter | 6 |
| Equalizer | 10 |
| Buffer Management | 7 |
| Jitter Buffer | 6 |
| Network/RTP | 8 |
| Asterisk/ARI | 7 |
| Gateway | 6 |
| Deepgram (Station-3) | 12 |
| Translation | 5 |
| TTS (Station-9) | 9 |
| System/Runtime | 11 |

---

## 9. Public Access

The monitoring API is exposed publicly via Cloudflare Tunnel:

```bash
# Start tunnel (URL changes each restart)
cd /home/azureuser
./cloudflared-linux-amd64 tunnel --url http://localhost:8083

# Example public URL:
# https://drugs-pierre-metallica-detroit.trycloudflare.com

# Available endpoints:
# GET /api/snapshots   - Last 100 monitoring snapshots
# GET /api/stations    - Station metadata
# GET /api/health      - Health check
```

---

## 10. Startup Sequence

To start the complete monitoring system:

```bash
# 1. Start database API server (stores snapshots)
cd /home/azureuser/translation-app
nohup node database-api-server.js > /tmp/database-api.log 2>&1 &

# 2. Start monitoring server (Socket.IO hub)
nohup node monitoring-server.js > /tmp/monitoring-server.log 2>&1 &

# 3. Start bridge (connects monitoring to database)
nohup node monitoring-to-database-bridge.js > /tmp/bridge.log 2>&1 &

# 4. Start continuous emitter (baseline data)
nohup node continuous-metrics-emitter.js > /tmp/continuous-emitter.log 2>&1 &

# 5. Start Cloudflare tunnel (public access)
cd /home/azureuser
nohup ./cloudflared-linux-amd64 tunnel --url http://localhost:8083 > /tmp/cloudflared.log 2>&1 &
```

---

## Quick Reference

### Check running processes:
```bash
ps aux | grep -E 'monitoring-server|database-api|bridge|continuous|cloudflared' | grep -v grep
```

### Check logs:
```bash
tail -50 /tmp/monitoring-server.log
tail -50 /tmp/database-api.log
tail -50 /tmp/bridge.log
tail -50 /tmp/continuous-emitter.log
```

### Test API locally:
```bash
curl http://localhost:8083/api/snapshots | jq '.[0:2]'
curl http://localhost:8083/api/health
```

---

**End of Documentation**
