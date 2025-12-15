# Complete Monitoring System Reverse Engineering Documentation
**Date:** December 7, 2024
**System Location:** Azure VM 20.170.155.53
**Documentation Type:** Technical Architecture & Implementation Details

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Component Breakdown](#component-breakdown)
4. [Data Flow Architecture](#data-flow-architecture)
5. [Network Topology](#network-topology)
6. [Service Dependencies](#service-dependencies)
7. [Configuration Files](#configuration-files)
8. [API Endpoints](#api-endpoints)
9. [Process Management](#process-management)
10. [Integration Points](#integration-points)

---

## 1. Executive Summary

### Purpose
The monitoring system collects, processes, and distributes real-time metrics from a multi-station translation system. It handles both real hardware data (Station-3) and simulated data for other stations.

### Key Metrics
- **75 real-time metrics** per station
- **113 configuration knobs** per station
- **2 extensions** per station (3333, 4444)
- **12 stations** total capacity (currently Station-3 real, Station-4 simulated)

### Current Status
- Station-3: Receiving real hardware data via Socket.IO
- Station-4: Generated/simulated data
- Updates: Every 2 seconds
- Storage: Last 100 records in memory

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL ACCESS LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Public Internet                                                 │
│     ↓                                                            │
│  Port 8080 (HTTP) ← proxy-8080-api-only.js                      │
│     ↓                                                            │
├─────────────────────────────────────────────────────────────────┤
│                    MONITORING API LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Port 8083 ← database-api-server.js (Internal only)             │
│     ↑                                                            │
│     │ POST /api/monitoring-data                                  │
│     │                                                            │
│  monitoring-to-database-bridge.js                                │
│     ↑                                                            │
│     │ Socket.IO (unified-metrics event)                          │
│     │                                                            │
├─────────────────────────────────────────────────────────────────┤
│                    DATA COLLECTION LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Port 3001 ← monitoring-server.js (Socket.IO)                    │
│     ↑                                                            │
│     │ emit('unified-metrics')                                    │
│     │                                                            │
│  continuous-full-monitoring-with-station3.js                     │
│     ↑                                                            │
│     │ HTTP GET (every 2 seconds)                                 │
│     │                                                            │
├─────────────────────────────────────────────────────────────────┤
│                    STATION DATA LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Port 3009 ← monitoring-api-bridge.js                           │
│     ↑                                                            │
│     │ Socket.IO (station-update event)                           │
│     │                                                            │
│  Station-3 Hardware (Remote)                                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Breakdown

### 3.1 Station-3 Hardware Integration
**Component:** Station-3 (Physical Hardware)
- **Connection:** Socket.IO client
- **Target:** monitoring-api-bridge.js on port 3009
- **Event:** 'station-update'
- **Data Format:**
  ```javascript
  {
    station_id: "STATION_3",
    extension: "3333",
    metrics: { /* 75 metrics */ },
    knobs: { /* 113 knobs */ },
    timestamp: "ISO-8601",
    status: "active"
  }
  ```

### 3.2 Monitoring API Bridge
**File:** `/home/azureuser/translation-app/monitoring-api-bridge.js`
- **Port:** 3009
- **PID:** 3930054
- **Function:** Receives Station-3 data via Socket.IO
- **Endpoints:**
  - `GET /api/station3` - Returns all Station-3 data
  - `GET /api/health` - Health check
- **Data Structure:**
  ```javascript
  {
    "STATION_3_3333": { /* full metrics */ },
    "STATION_3_4444": { /* full metrics */ }
  }
  ```

### 3.3 Continuous Monitoring
**File:** `/home/azureuser/translation-app/continuous-full-monitoring-with-station3.js`
- **PID:** 4009039
- **Function:** Fetches real Station-3 data, generates fake data for others
- **Intervals:** 2 seconds
- **Data Sources:**
  - Station-3: `http://localhost:3009/api/station3`
  - Station-4: Generated/simulated
- **Output:** Emits to monitoring-server.js port 3001

### 3.4 Monitoring Server
**File:** `/home/azureuser/translation-app/monitoring-server.js`
- **Port:** 3001 (Socket.IO)
- **PID:** 3901127
- **Function:** Central Socket.IO hub for metrics
- **Events:**
  - Receives: 'unified-metrics'
  - Emits: 'metrics-update' (to dashboards)
  - Emits: 'unified-metrics' (to bridge)
- **Critical:** Must emit BOTH events for proper data flow

### 3.5 Database Bridge
**File:** `/home/azureuser/translation-app/monitoring-to-database-bridge.js`
- **PID:** 377955
- **Function:** Forwards metrics to database API
- **Listens:** Socket.IO port 3001 for 'unified-metrics'
- **Sends:** HTTP POST to localhost:8083/api/monitoring-data
- **Log:** `/tmp/monitoring-bridge-fixed.log` (deleted but still writing)

### 3.6 Database API Server
**File:** `/home/azureuser/translation-app/database-api-server.js`
- **Port:** 8083 (localhost only)
- **PID:** 294705
- **Function:** In-memory storage of monitoring data
- **Endpoints:**
  - `POST /api/monitoring-data` - Store new data
  - `GET /api/snapshots` - Get last 100 records
  - `GET /api/stations` - Get station configurations
- **Storage:** In-memory array, max 100 records

### 3.7 Public API Proxy
**File:** `/home/azureuser/translation-app/proxy-8080-api-only.js`
- **Port:** 8080 (public)
- **PID:** Running in background
- **Function:** Public-facing API with CORS
- **Routes:**
  - `/api/*` → Proxies to localhost:8083
  - `/health` → Health check
  - `/` → API information
- **CORS Headers:**
  ```
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization
  ```

### 3.8 Additional Services

#### STTTTSserver
**Location:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/`
- **Port:** 3020
- **Function:** Speech-to-Text/Text-to-Speech processing
- **Dashboard:** http://20.170.155.53:3020/dashboard.html
- **Note:** Separate from monitoring, DO NOT MODIFY

#### Gateway Services
- **gateway-3333.js** - Port 3333 (Extension 3333)
- **gateway-4444.js** - Port 4444 (Extension 4444)
- **Function:** Audio gateway services

---

## 4. Data Flow Architecture

### 4.1 Real Station-3 Data Flow
```
1. Station-3 Hardware
   ↓ Socket.IO ('station-update')
2. monitoring-api-bridge.js (port 3009)
   ↓ HTTP GET /api/station3
3. continuous-full-monitoring-with-station3.js
   ↓ Socket.IO emit('unified-metrics')
4. monitoring-server.js (port 3001)
   ↓ Socket.IO emit('unified-metrics')
5. monitoring-to-database-bridge.js
   ↓ HTTP POST /api/monitoring-data
6. database-api-server.js (port 8083)
   ↓ HTTP proxy
7. proxy-8080-api-only.js (port 8080)
   ↓ HTTP with CORS
8. External clients (dashboards)
```

### 4.2 Data Update Frequency
- Station-3 hardware → Bridge: Real-time (as data arrives)
- Continuous monitoring fetch: Every 2 seconds
- Database storage: On every update
- Client polling: As needed (typically 2-5 seconds)

---

## 5. Network Topology

### 5.1 Port Map
```
Port    Service                         Access      Protocol
-----   --------                        ------      --------
22      SSH                            Public      TCP
3001    monitoring-server              Internal    Socket.IO
3009    monitoring-api-bridge          Internal    HTTP/Socket.IO
3020    STTTTSserver Dashboard         Public      HTTP
3090    monitoring-api-no-fake         Internal    HTTP
3333    gateway-3333                   Internal    TCP
4444    gateway-4444                   Internal    TCP
8080    proxy-8080-api-only           Public      HTTP
8083    database-api-server           Internal    HTTP
```

### 5.2 External Access Points
- **Public API:** http://20.170.155.53:8080/api/snapshots
- **STTTTSserver Dashboard:** http://20.170.155.53:3020/dashboard.html
- **Cloudflare Tunnel:** https://divisions-margaret-expansys-shape.trycloudflare.com
- **Bore Tunnel:** http://bore.pub:50216

---

## 6. Service Dependencies

### 6.1 Startup Order
```
1. database-api-server.js (port 8083)
   ↓
2. monitoring-server.js (port 3001)
   ↓
3. monitoring-to-database-bridge.js
   ↓
4. monitoring-api-bridge.js (port 3009)
   ↓
5. continuous-full-monitoring-with-station3.js
   ↓
6. proxy-8080-api-only.js (port 8080)
```

### 6.2 Critical Dependencies
- Bridge DEPENDS ON monitoring-server being active
- Continuous monitoring DEPENDS ON bridge (port 3009) for Station-3 data
- Proxy DEPENDS ON database-api (port 8083)
- All monitoring INDEPENDENT of STTTTSserver

---

## 7. Configuration Files

### 7.1 Station Configuration Structure
```javascript
// Station-3 Real Data (from hardware)
{
  "station_id": "Station-3",
  "extension": "3333",
  "metrics": {
    // DSP Metrics (20)
    "dsp.agc.currentGain": 11.936,
    "dsp.agc.targetLevel": -18,
    // ... 18 more

    // Audio Quality (10)
    "audioQuality.mos": 4.349,
    "audioQuality.snr": 33.360,
    // ... 8 more

    // Buffer Metrics (10)
    "buffer.total": 246.011,
    "buffer.jitter": 45.052,
    // ... 8 more

    // Latency Metrics (10)
    "latency.avg": 54.857,
    "latency.max": 179.008,
    // ... 8 more

    // Packet Metrics (12)
    "packet.received": 1061,
    "packet.loss": 0.210,
    // ... 10 more

    // Performance Metrics (13)
    "performance.cpu": 46.991,
    "performance.memory": 725.628,
    // ... 11 more
  },
  "knobs": {
    // 113 configuration parameters
    "agc.enabled": true,
    "aec.suppression_level_db": 25,
    // ... 111 more
  }
}
```

### 7.2 File Locations
```
/home/azureuser/translation-app/
├── monitoring-api-bridge.js
├── continuous-full-monitoring-with-station3.js
├── monitoring-server.js
├── monitoring-to-database-bridge.js
├── database-api-server.js
├── proxy-8080-api-only.js
├── monitoring/
│   ├── monitoring-api-no-fake.js (old, port 3090)
│   └── monitoring-real-data-collector-no-fake-fixed.js
└── 3333_4444__Operational/
    └── STTTTSserver/
        └── STTTTSserver.js
```

---

## 8. API Endpoints

### 8.1 Public API (Port 8080)
```
GET  /api/snapshots     - All monitoring records (last 100)
GET  /api/stations      - Station configurations
POST /api/monitoring-data - Store new monitoring data
GET  /health           - Health check
GET  /                 - API information
```

### 8.2 Internal APIs

#### Database API (Port 8083)
```
POST /api/monitoring-data - Store monitoring data
GET  /api/snapshots      - Get all snapshots
GET  /api/stations       - Get station configs
```

#### Station-3 Bridge (Port 3009)
```
GET  /api/station3      - Get Station-3 data
GET  /api/health        - Health check
Socket.IO events:
  - station-update (receive)
```

#### Monitoring API (Port 3090) - OLD/UNUSED
```
GET  /api/snapshots     - Returns different format (nested)
GET  /api/health        - Health check
```

### 8.3 Response Format
```javascript
// API Response Structure (/api/snapshots)
[
  {
    "id": "1765144965938-p0egpcxz1",
    "station_id": "Station-3",
    "extension": "3333",
    "timestamp": "2024-12-07T22:02:45.936Z",
    "call_id": "continuous-monitoring",
    "channel": "3333",
    "metrics": { /* 75 metrics */ },
    "knobs": { /* 113 knobs */ },
    "alerts": [],
    "metadata": {}
  },
  // ... up to 100 records
]
```

---

## 9. Process Management

### 9.1 Current Running Processes
```bash
# Key Process IDs (as of Dec 7, 2024)
PID      Service
-------- ----------------------------------------
294705   database-api-server.js
377955   monitoring-to-database-bridge.js
3901127  monitoring-server.js
3930054  monitoring-api-bridge.js
4009039  continuous-full-monitoring-with-station3.js
4025260  proxy-8080-api-only.js (or similar)
```

### 9.2 Process Commands
```bash
# Check all monitoring processes
ps aux | grep -E "monitoring|database|bridge|proxy" | grep -v grep

# Kill and restart a service
pkill -f "monitoring-api-bridge"
cd /home/azureuser/translation-app
nohup node monitoring-api-bridge.js > /tmp/bridge.log 2>&1 &

# View logs
tail -f /tmp/continuous-monitoring-new.log
tail -f /tmp/proxy-api.log
```

### 9.3 Health Checks
```bash
# Test public API
curl http://20.170.155.53:8080/api/snapshots | jq length

# Test Station-3 bridge
ssh azureuser@20.170.155.53 "curl http://localhost:3009/api/station3"

# Check database API
ssh azureuser@20.170.155.53 "curl http://localhost:8083/api/snapshots | jq length"
```

---

## 10. Integration Points

### 10.1 Station-3 Hardware Integration
- **Protocol:** Socket.IO
- **Target:** Port 3009
- **Event:** 'station-update'
- **Data Rate:** Real-time as available
- **Format:** JSON with metrics and knobs

### 10.2 Dashboard Integration
- **Endpoint:** http://20.170.155.53:8080/api/snapshots
- **Method:** GET
- **Headers Required:** None (CORS enabled)
- **Response:** JSON array of monitoring records
- **Polling:** Every 2-5 seconds recommended

### 10.3 Future Station Integration
To add new stations (Station-1, Station-2, etc.):
1. Set up Socket.IO client to emit to port 3009
2. Use same 'station-update' event format
3. Modify continuous-full-monitoring.js to fetch from bridge
4. No other changes required - system auto-scales

### 10.4 External Tunnels (Development)
```
# Cloudflare (HTTPS)
./cloudflared-linux-amd64 tunnel --url http://localhost:8080
URL: https://[random].trycloudflare.com

# Bore (HTTP)
./bore local 8080 --to bore.pub
URL: http://bore.pub:[port]

# LocalTunnel (HTTPS with password)
npx localtunnel --port 8080 --subdomain monitoring-api-astrix
URL: https://monitoring-api-astrix.loca.lt
Password: 20.170.155.53
```

---

## System Constraints & Limitations

1. **Database:** In-memory only, max 100 records
2. **Updates:** 2-second interval (hardcoded)
3. **Stations:** Currently 2 active (Station-3 real, Station-4 fake)
4. **HTTPS:** Not natively supported, requires tunnel or proxy
5. **Authentication:** None - completely open
6. **Persistence:** No persistent storage, data lost on restart

---

## Troubleshooting Guide

### Issue: No Station-3 data
```bash
# Check bridge is running
ps aux | grep monitoring-api-bridge
# Check bridge is receiving data
curl http://localhost:3009/api/station3
```

### Issue: API not accessible
```bash
# Check proxy is running
ps aux | grep proxy-8080
# Restart proxy
pkill -f proxy-8080
cd /home/azureuser/translation-app
nohup node proxy-8080-api-only.js > /tmp/proxy.log 2>&1 &
```

### Issue: Old/stale data
```bash
# Check continuous monitoring
ps aux | grep continuous-full-monitoring
# Check logs
tail /tmp/continuous-monitoring-new.log
```

---

## Security Notes

⚠️ **WARNING:** System has NO authentication or authorization
- All endpoints are publicly accessible
- No rate limiting
- No input validation
- No SSL/TLS (HTTP only)
- CORS allows all origins

**Recommendations for Production:**
1. Add authentication (JWT/OAuth)
2. Implement rate limiting
3. Add input validation
4. Set up HTTPS with proper certificates
5. Restrict CORS to specific domains
6. Add logging and monitoring
7. Implement persistent storage (PostgreSQL/MongoDB)

---

## Maintenance Commands

### Full System Restart
```bash
# Kill all monitoring processes
pkill -f "monitoring"
pkill -f "database"
pkill -f "bridge"
pkill -f "proxy"

# Start in order
cd /home/azureuser/translation-app

# 1. Database
nohup node database-api-server.js > /tmp/database.log 2>&1 &
sleep 2

# 2. Monitoring server
nohup node monitoring-server.js > /tmp/monitoring.log 2>&1 &
sleep 2

# 3. Bridge to database
nohup node monitoring-to-database-bridge.js > /tmp/bridge.log 2>&1 &
sleep 2

# 4. Station-3 bridge
nohup node monitoring-api-bridge.js > /tmp/station3-bridge.log 2>&1 &
sleep 2

# 5. Continuous monitoring
nohup node continuous-full-monitoring-with-station3.js > /tmp/continuous.log 2>&1 &
sleep 2

# 6. Public proxy
nohup node proxy-8080-api-only.js > /tmp/proxy.log 2>&1 &

# Verify
ps aux | grep -E "monitoring|database|bridge|proxy" | grep -v grep
```

---

## Contact & Support

**System Location:** Azure VM 20.170.155.53
**SSH Access:** `ssh azureuser@20.170.155.53`
**Public API:** http://20.170.155.53:8080/api/snapshots
**Documentation Date:** December 7, 2024

---

END OF DOCUMENT