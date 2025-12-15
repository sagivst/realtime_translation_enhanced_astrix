
# Monitoring API Plan - Health Monitoring & Process Control

## Document Overview
This document outlines the plan to add comprehensive health monitoring (LIVE/DOWN) API endpoints
and process control (start, kill, restart) capabilities to the monitoring system.

**Target Location**: Dev VM (20.170.155.53)
**CRITICAL**: NEVER touch production VM (4.185.84.26)

---

## 1. MONITORING CUBE - HIERARCHICAL VIEW

### 1.1 System Component Hierarchy

```
                    +===============================================+
                    |           TRANSLATION SYSTEM                  |
                    |              MONITORING CUBE                  |
                    +===============================================+
                                        |
          +-----------------------------+-----------------------------+
          |                             |                             |
+---------v---------+       +-----------v-----------+       +---------v---------+
|   CORE SERVICES   |       |   MONITORING LAYER    |       |   GATEWAY LAYER   |
+-------------------+       +-----------------------+       +-------------------+
|                   |       |                       |       |                   |
| [LIVE/DOWN]       |       | [LIVE/DOWN]           |       | [LIVE/DOWN]       |
| STTTTSserver.js   |       | monitoring-server.js  |       | gateway-3333.js   |
|                   |       |                       |       |                   |
| [LIVE/DOWN]       |       | [LIVE/DOWN]           |       | [LIVE/DOWN]       |
| ari-gstreamer-    |       | database-api-         |       | gateway-4444.js   |
| operational.js    |       | server.js             |       |                   |
|                   |       |                       |       +-------------------+
+-------------------+       | [LIVE/DOWN]           |
                            | monitoring-to-        |
                            | database-bridge.js    |
                            |                       |
                            | [LIVE/DOWN]           |
                            | continuous-metrics-   |
                            | emitter.js            |
                            |                       |
                            | [LIVE/DOWN]           |
                            | cloudflared tunnel    |
                            +-----------------------+
```

### 1.2 Component Status Matrix

```
+----------------------------+--------+-------+---------+--------+
|        COMPONENT           | STATUS | PORT  | RESTART | KILLABLE|
+----------------------------+--------+-------+---------+--------+
| CORE SERVICES                                                   |
+----------------------------+--------+-------+---------+--------+
| STTTTSserver.js            | [____] | 8080  |   YES   |   YES  |
| ari-gstreamer-operational  | [____] | N/A   |   YES   |   YES  |
+----------------------------+--------+-------+---------+--------+
| MONITORING LAYER                                                |
+----------------------------+--------+-------+---------+--------+
| monitoring-server.js       | [____] | 3001  |   YES   |   YES  |
| database-api-server.js     | [____] | 8083  |   YES   |   YES  |
| monitoring-to-db-bridge.js | [____] | N/A   |   YES   |   YES  |
| continuous-metrics-emitter | [____] | N/A   |   YES   |   YES  |
| cloudflared tunnel         | [____] | N/A   |   YES   |   YES  |
+----------------------------+--------+-------+---------+--------+
| GATEWAY LAYER                                                   |
+----------------------------+--------+-------+---------+--------+
| gateway-3333.js            | [____] | 7777  |   YES   |   YES  |
| gateway-4444.js            | [____] | 8888  |   YES   |   YES  |
+----------------------------+--------+-------+---------+--------+

STATUS: [LIVE] = Green, [DOWN] = Red, [____] = Unknown/Checking
```

---

## 2. API ENDPOINTS SPECIFICATION

### 2.1 Health Check Endpoints (LIVE/DOWN Status)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health/system` | GET | Overall system health (all components) |
| `/api/health/core` | GET | Core services health status |
| `/api/health/monitoring` | GET | Monitoring layer health status |
| `/api/health/gateways` | GET | Gateway layer health status |
| `/api/health/component/{name}` | GET | Individual component health |

#### 2.1.1 Individual Component Health Endpoints

```
GET /api/health/component/sttttserver
GET /api/health/component/ari-gstreamer
GET /api/health/component/monitoring-server
GET /api/health/component/database-api-server
GET /api/health/component/monitoring-bridge
GET /api/health/component/metrics-emitter
GET /api/health/component/cloudflared
GET /api/health/component/gateway-3333
GET /api/health/component/gateway-4444
```

#### 2.1.2 Response Format

```json
{
  "component": "monitoring-server",
  "status": "LIVE",
  "uptime": 3600,
  "lastCheck": "2024-01-15T10:30:00Z",
  "port": 3001,
  "pid": 12345,
  "memory": {
    "heapUsed": "45MB",
    "heapTotal": "67MB"
  },
  "details": {
    "socketConnections": 5,
    "messagesProcessed": 15000
  }
}
```

### 2.2 Process Control Endpoints

#### 2.2.1 Individual Component Control

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/control/start/{component}` | POST | Start a specific component |
| `/api/control/stop/{component}` | POST | Stop (kill) a specific component |
| `/api/control/restart/{component}` | POST | Restart a specific component |

#### 2.2.2 Component Names for Control Endpoints

```
sttttserver          - STTTTSserver.js
ari-gstreamer        - ari-gstreamer-operational.js
monitoring-server    - monitoring-server.js
database-api-server  - database-api-server.js
monitoring-bridge    - monitoring-to-database-bridge.js
metrics-emitter      - continuous-metrics-emitter.js
cloudflared          - Cloudflare tunnel process
gateway-3333         - gateway-3333.js
gateway-4444         - gateway-4444.js
```

#### 2.2.3 Layer Control Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/control/restart/layer/core` | POST | Restart all core services |
| `/api/control/restart/layer/monitoring` | POST | Restart monitoring layer |
| `/api/control/restart/layer/gateways` | POST | Restart all gateways |

#### 2.2.4 Full System Control

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/control/restart/system` | POST | Restart entire system |
| `/api/control/stop/system` | POST | Stop entire system |
| `/api/control/start/system` | POST | Start entire system |
| `/api/control/status/system` | GET | Get full system status |

### 2.3 Response Formats

#### Success Response
```json
{
  "success": true,
  "action": "restart",
  "component": "monitoring-server",
  "timestamp": "2024-01-15T10:30:00Z",
  "message": "Component restarted successfully",
  "newPid": 12346
}
```

#### Error Response
```json
{
  "success": false,
  "action": "restart",
  "component": "monitoring-server",
  "timestamp": "2024-01-15T10:30:00Z",
  "error": "Process failed to start",
  "details": "Port 3001 already in use"
}
```

---

## 3. RESTART CAPABILITIES MATRIX

### 3.1 Three Levels of Restart

```
+------------------------------------------------------------------+
|                    RESTART CAPABILITIES                           |
+------------------------------------------------------------------+
|                                                                  |
|  LEVEL 1: INDIVIDUAL COMPONENT RESTART                           |
|  +------------------------------------------------------------+  |
|  |  [Restart STTTTSserver]  [Restart ari-gstreamer]          |  |
|  |  [Restart monitoring-server]  [Restart database-api]      |  |
|  |  [Restart bridge]  [Restart emitter]  [Restart cloudflared]|  |
|  |  [Restart gateway-3333]  [Restart gateway-4444]           |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  LEVEL 2: LAYER RESTART                                          |
|  +------------------------------------------------------------+  |
|  |  [Restart CORE]     [Restart MONITORING]   [Restart GW]   |  |
|  |  (2 components)      (5 components)        (2 components) |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  LEVEL 3: FULL SYSTEM RESTART                                    |
|  +------------------------------------------------------------+  |
|  |              [RESTART ENTIRE SYSTEM]                       |  |
|  |              (All 9 components)                            |  |
|  +------------------------------------------------------------+  |
|                                                                  |
+------------------------------------------------------------------+
```

### 3.2 Restart Order (Dependencies)

When restarting the full system, components should start in this order:

```
Phase 1: Foundation
  1. monitoring-server.js (Socket.IO hub)
  2. database-api-server.js (REST API)

Phase 2: Data Flow
  3. monitoring-to-database-bridge.js
  4. continuous-metrics-emitter.js

Phase 3: External Access
  5. cloudflared tunnel

Phase 4: Core Services
  6. ari-gstreamer-operational.js
  7. STTTTSserver.js

Phase 5: Gateways
  8. gateway-3333.js
  9. gateway-4444.js
```

---

## 4. DASHBOARD INTEGRATION - MONITORING CUBE UI

### 4.1 Visual Cube Layout for Dashboard

```
+================================================================+
|                    SYSTEM MONITORING CUBE                       |
+================================================================+
|                                                                 |
|  SYSTEM STATUS: [HEALTHY]  |  Components: 9/9 LIVE  |  Uptime: 4h 23m  |
|                                                                 |
+------------------------+------------------------+----------------+
|     CORE SERVICES      |   MONITORING LAYER     | GATEWAY LAYER  |
+------------------------+------------------------+----------------+
|                        |                        |                |
| [*] STTTTSserver       | [*] monitoring-server  | [*] gw-3333    |
|     Status: LIVE       |     Status: LIVE       |     Port: 7777 |
|     Port: 8080         |     Port: 3001         |     [Restart]  |
|     [Restart]          |     Connections: 5     |                |
|                        |     [Restart]          | [*] gw-4444    |
| [*] ari-gstreamer      |                        |     Port: 8888 |
|     Status: LIVE       | [*] database-api       |     [Restart]  |
|     [Restart]          |     Status: LIVE       |                |
|                        |     Port: 8083         +----------------+
+------------------------+     [Restart]          |
|                        |                        |
|  [Restart All CORE]    | [*] bridge             |
|                        |     Status: LIVE       |
+------------------------+     Messages: 15.2K    |
                         |     [Restart]          |
                         |                        |
                         | [*] metrics-emitter    |
                         |     Status: LIVE       |
                         |     Interval: 5s       |
                         |     [Restart]          |
                         |                        |
                         | [*] cloudflared        |
                         |     Status: LIVE       |
                         |     URL: *.trycloudflare.com |
                         |     [Restart]          |
                         |                        |
                         | [Restart All MONITOR]  |
                         +------------------------+

+================================================================+
|  [ RESTART ENTIRE SYSTEM ]  |  [ STOP ALL ]  |  [ START ALL ]  |
+================================================================+

Legend: [*] = LIVE (green)  [X] = DOWN (red)  [?] = Unknown (gray)
```

### 4.2 Status Indicator Colors

```css
/* Dashboard CSS Color Scheme */
.status-live {
  background-color: #28a745;  /* Green */
  color: white;
}

.status-down {
  background-color: #dc3545;  /* Red */
  color: white;
}

.status-unknown {
  background-color: #6c757d;  /* Gray */
  color: white;
}

.status-warning {
  background-color: #ffc107;  /* Yellow */
  color: black;
}
```

---

## 5. IMPLEMENTATION PLAN

### 5.1 New File: `health-monitor-api.js`

This file will implement all health monitoring and process control endpoints.

**Location**: `/home/azureuser/translation-app/health-monitor-api.js`

**Port**: 8084 (new dedicated port for health API)

### 5.2 Component Detection Methods

| Component | Detection Method |
|-----------|-----------------|
| monitoring-server | Check Socket.IO port 3001 |
| database-api-server | HTTP GET to localhost:8083/api/health |
| monitoring-bridge | Check process by name |
| metrics-emitter | Check process by name |
| cloudflared | Check process + verify tunnel URL |
| STTTTSserver | HTTP GET to localhost:8080/health |
| ari-gstreamer | Check process by name |
| gateway-3333 | Check port 7777 |
| gateway-4444 | Check port 8888 |

### 5.3 Process Control Scripts

Each component needs start/stop commands stored in configuration:

```javascript
const componentConfig = {
  'monitoring-server': {
    startCmd: 'cd /home/azureuser/translation-app && node monitoring-server.js &',
    stopCmd: 'pkill -f "node.*monitoring-server.js"',
    checkPort: 3001,
    checkProcess: 'monitoring-server.js'
  },
  'database-api-server': {
    startCmd: 'cd /home/azureuser/translation-app && node database-api-server.js &',
    stopCmd: 'pkill -f "node.*database-api-server.js"',
    checkPort: 8083,
    checkProcess: 'database-api-server.js'
  },
  'monitoring-bridge': {
    startCmd: 'cd /home/azureuser/translation-app && node monitoring-to-database-bridge.js &',
    stopCmd: 'pkill -f "node.*monitoring-to-database-bridge.js"',
    checkProcess: 'monitoring-to-database-bridge.js'
  },
  'metrics-emitter': {
    startCmd: 'cd /home/azureuser/translation-app && node continuous-metrics-emitter.js &',
    stopCmd: 'pkill -f "node.*continuous-metrics-emitter.js"',
    checkProcess: 'continuous-metrics-emitter.js'
  },
  'cloudflared': {
    startCmd: 'cloudflared tunnel --url http://localhost:8083 &',
    stopCmd: 'pkill -f cloudflared',
    checkProcess: 'cloudflared'
  },
  'sttttserver': {
    startCmd: 'cd /home/azureuser/translation-app && node STTTTSserver.js &',
    stopCmd: 'pkill -f "node.*STTTTSserver.js"',
    checkPort: 8080,
    checkProcess: 'STTTTSserver.js'
  },
  'ari-gstreamer': {
    startCmd: 'cd /home/azureuser/translation-app && node ari-gstreamer-operational.js &',
    stopCmd: 'pkill -f "node.*ari-gstreamer-operational.js"',
    checkProcess: 'ari-gstreamer-operational.js'
  },
  'gateway-3333': {
    startCmd: 'cd /home/azureuser/translation-app && node gateway-3333.js &',
    stopCmd: 'pkill -f "node.*gateway-3333.js"',
    checkPort: 7777,
    checkProcess: 'gateway-3333.js'
  },
  'gateway-4444': {
    startCmd: 'cd /home/azureuser/translation-app && node gateway-4444.js &',
    stopCmd: 'pkill -f "node.*gateway-4444.js"',
    checkPort: 8888,
    checkProcess: 'gateway-4444.js'
  }
};
```

---

## 6. FULL API ENDPOINT LIST

### Health Monitoring (GET)
```
/api/health/system                    - Full system status
/api/health/core                      - Core services status
/api/health/monitoring                - Monitoring layer status
/api/health/gateways                  - Gateway layer status
/api/health/component/sttttserver     - STTTTSserver status
/api/health/component/ari-gstreamer   - ari-gstreamer status
/api/health/component/monitoring-server - monitoring-server status
/api/health/component/database-api-server - database-api status
/api/health/component/monitoring-bridge - bridge status
/api/health/component/metrics-emitter - emitter status
/api/health/component/cloudflared     - cloudflared status
/api/health/component/gateway-3333    - gateway-3333 status
/api/health/component/gateway-4444    - gateway-4444 status
```

### Process Control - Individual (POST)
```
/api/control/start/sttttserver
/api/control/stop/sttttserver
/api/control/restart/sttttserver

/api/control/start/ari-gstreamer
/api/control/stop/ari-gstreamer
/api/control/restart/ari-gstreamer

/api/control/start/monitoring-server
/api/control/stop/monitoring-server
/api/control/restart/monitoring-server

/api/control/start/database-api-server
/api/control/stop/database-api-server
/api/control/restart/database-api-server

/api/control/start/monitoring-bridge
/api/control/stop/monitoring-bridge
/api/control/restart/monitoring-bridge

/api/control/start/metrics-emitter
/api/control/stop/metrics-emitter
/api/control/restart/metrics-emitter

/api/control/start/cloudflared
/api/control/stop/cloudflared
/api/control/restart/cloudflared

/api/control/start/gateway-3333
/api/control/stop/gateway-3333
/api/control/restart/gateway-3333

/api/control/start/gateway-4444
/api/control/stop/gateway-4444
/api/control/restart/gateway-4444
```

### Process Control - Layer (POST)
```
/api/control/restart/layer/core       - Restart CORE layer
/api/control/restart/layer/monitoring - Restart MONITORING layer
/api/control/restart/layer/gateways   - Restart GATEWAY layer
```

### Process Control - System (POST)
```
/api/control/start/system             - Start entire system
/api/control/stop/system              - Stop entire system
/api/control/restart/system           - Restart entire system
```

---

## 7. SECURITY CONSIDERATIONS

### 7.1 Access Control
- API endpoints should require authentication token
- Rate limiting to prevent abuse
- Logging of all control actions

### 7.2 Safe Restart Order
- Monitor dependencies before restart
- Graceful shutdown with timeout
- Health check after restart before marking complete

### 7.3 Recommended Headers
```javascript
app.use((req, res, next) => {
  // Require API key for control endpoints
  if (req.path.startsWith('/api/control/')) {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.CONTROL_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  next();
});
```

---

## 8. IMPLEMENTATION TIMELINE

### Phase 1: Health Monitoring
- Create health-monitor-api.js base structure
- Implement component detection methods
- Add health check endpoints

### Phase 2: Process Control
- Implement start/stop/restart for individual components
- Add layer control endpoints
- Add full system control

### Phase 3: Dashboard Integration
- Create monitoring cube UI component
- Integrate with existing dashboard
- Add real-time status updates via Socket.IO

### Phase 4: Testing & Documentation
- Test all endpoints
- Add API documentation
- Create operational runbook

---

## 9. APPENDIX: QUICK REFERENCE CARD

```
+------------------------------------------------------------------+
|                    MONITORING API QUICK REFERENCE                 |
+------------------------------------------------------------------+
|                                                                   |
|  HEALTH CHECK:                                                    |
|    curl http://localhost:8084/api/health/system                   |
|    curl http://localhost:8084/api/health/component/monitoring-server |
|                                                                   |
|  RESTART COMPONENT:                                               |
|    curl -X POST http://localhost:8084/api/control/restart/monitoring-server |
|                                                                   |
|  RESTART LAYER:                                                   |
|    curl -X POST http://localhost:8084/api/control/restart/layer/monitoring |
|                                                                   |
|  RESTART SYSTEM:                                                  |
|    curl -X POST http://localhost:8084/api/control/restart/system  |
|                                                                   |
+------------------------------------------------------------------+
```

---

**Document Version**: 1.0
**Created**: December 2024
**Author**: Claude Code Assistant
**Target**: Dev VM (20.170.155.53) ONLY
