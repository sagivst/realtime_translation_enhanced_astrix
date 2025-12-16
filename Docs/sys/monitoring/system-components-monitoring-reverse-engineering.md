# System Components Monitoring - Reverse Engineering Documentation

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Core Components](#core-components)
4. [Data Flow Architecture](#data-flow-architecture)
5. [Component Interactions](#component-interactions)
6. [API Endpoints](#api-endpoints)
7. [Technical Implementation Details](#technical-implementation-details)
8. [Configuration and Deployment](#configuration-and-deployment)
9. [Monitoring Data Structure](#monitoring-data-structure)
10. [Critical Integration Points](#critical-integration-points)

## Executive Summary

The System Components monitoring system is a real-time infrastructure monitoring solution deployed on Azure VM (20.170.155.53) that tracks the health and performance of multiple Node.js services. The system provides comprehensive visibility into component states, resource utilization, and operational metrics through a web-accessible API exposed via Cloudflare Tunnel at https://tun.monitoringavailable.uk.

### Key Capabilities
- Real-time component health monitoring with descriptive messages
- Process lifecycle management via PM2 (8 managed components)
- Resource utilization tracking (CPU, Memory)
- Station-specific metrics collection
- RESTful API for data access and full component control (start/stop/restart)
- Automatic component restart on failure
- Security restrictions on critical components

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        EXTERNAL ACCESS                           │
│                  https://tun.monitoringavailable.uk             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    Cloudflare Tunnel
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   Database API Server                            │
│                      Port: 8083                                  │
│                 /api/health/system                               │
│                 /api/snapshots                                   │
│                 /api/components/*                                │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP REST API
┌────────────────────────▼────────────────────────────────────────┐
│                  Component Health Monitor                        │
│              Monitors all system processes                       │
│                   Uses pgrep/PM2 API                            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                   Monitoring Data Pipeline                       │
│                                                                  │
│  Station Handlers → StationAgent → Monitoring Server            │
│       ↓                   ↓              ↓                      │
│  collect()           emit events    Socket.IO                   │
│       ↓                   ↓              ↓                      │
│  unified-metrics    Port: 8090    Monitoring Bridge             │
│                                          ↓                      │
│                                   Database API                   │
└──────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Database API Server (`database-api-server.js`)
**Location:** `/home/azureuser/translation-app/monitoring/database-api-server.js`
**Port:** 8083
**PM2 Name:** `database-api-server`

**Purpose:** Central API gateway for all monitoring data and control operations

**Key Features:**
- RESTful API endpoints for health, snapshots, and component management
- Component health checking via pgrep and PM2 API
- Self-check skip mechanism to prevent self-termination
- Process management (start/stop/restart) via PM2
- In-memory storage for monitoring data

**Critical Code Sections:**
```javascript
// Self-check skip (Line 198-209)
if (componentId === "database-api-server") {
    return {
        status: "LIVE",
        message: "Self-check skipped",
        pid: process.pid,
        port: 8083,
        layer: "monitoring",
        critical: true
    };
}

// Component monitoring configuration (updated with 23 components)
const monitoredComponents = [
    {
        id: "monitoring-server",
        name: "monitoring-server.js",
        pm2Name: "monitoring-server",
        port: 8090,
        layer: "monitoring",
        critical: true,
        message: "monitoring-server.js - The optimization engine"
    },
    {
        id: "database-api-server",
        name: "database-api-server.js",
        pm2Name: "database-api-server",
        port: 8083,
        layer: "monitoring",
        critical: true,
        message: "database-api-server.js - The API for the Dashboard"
    },
    {
        id: "continuous-full-monitoring",
        name: "continuous-full-monitoring-with-station3.js",
        pm2Name: "continuous-monitoring",
        layer: "monitoring",
        critical: false,
        message: "Generates test traffic"
    },
    // Total: 23 components (was 29)
];
```

### 2. Monitoring Server (`monitoring-server.js`)
**Location:** `/home/azureuser/translation-app/monitoring/monitoring-server.js`
**Port:** 8090
**PM2 Name:** `monitoring-server`

**Purpose:** Socket.IO server that collects and aggregates monitoring data

**Key Features:**
- Socket.IO server for real-time data collection
- Event handling for `unified-metrics` events
- Station-specific data aggregation
- Connection management for monitoring clients

### 3. Monitoring to Database Bridge (`monitoring-to-database-bridge.js`)
**Location:** `/home/azureuser/translation-app/monitoring/monitoring-to-database-bridge.js`
**PM2 Name:** `monitoring-bridge`

**Purpose:** Bridge between Socket.IO monitoring events and REST API storage

**Key Features:**
- Listens to `unified-metrics` events from monitoring server
- Forwards data to database API server via HTTP POST
- Event name matching (fixed from `station-data` to `unified-metrics`)

**Critical Code:**
```javascript
// Event listener (Line ~50)
monitoringSocket.on('unified-metrics', async (data) => {
    console.log('[Bridge] Received unified-metrics:', data);
    try {
        const response = await axios.post(
            'http://localhost:8083/api/snapshots',
            data
        );
    } catch (error) {
        console.error('[Bridge] Error forwarding data:', error.message);
    }
});
```

### 4. Continuous Full Monitoring (`continuous-full-monitoring-with-station3.js`)
**Location:** `/home/azureuser/translation-app/continuous-full-monitoring-with-station3.js`
**PM2 Name:** `continuous-full-monitoring`

**Purpose:** Generates synthetic monitoring data for testing and baseline metrics

**Key Features:**
- Emits synthetic metrics at regular intervals
- Station 3 and Station 9 data simulation
- Matrix values (±75) and Knob values (±150)
- Connects to monitoring server on port 8090

## Data Flow Architecture

### Primary Data Flow Path
```
1. Station Handlers (station3-handler.js, station9-handler.js)
   ↓ stationAgent.collect(data)
2. StationAgent Class
   ↓ emit('unified-metrics', snapshot)
3. Monitoring Server (Port 8090)
   ↓ Socket.IO broadcast
4. Monitoring Bridge
   ↓ HTTP POST /api/snapshots
5. Database API Server (Port 8083)
   ↓ Store in memory
6. External API Access via Cloudflare Tunnel
```

### Event Flow Sequence
1. **Data Generation**: Station handlers call `stationAgent.collect()` with metrics
2. **Data Processing**: StationAgent processes and formats the data
3. **Event Emission**: StationAgent emits `unified-metrics` event
4. **Event Reception**: Monitoring server receives and broadcasts event
5. **Bridge Forward**: Bridge catches event and forwards via HTTP
6. **Storage**: Database API server stores in memory
7. **API Access**: Data available via `/api/snapshots` endpoint

## Component Interactions

### StationAgent Integration
**Location:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring/StationAgent.js`

The StationAgent class is instantiated by station handlers and provides:
- `collect(data)` method for receiving metrics
- `recordMetric(key, value)` for metric tracking
- `updateKnobs(knobs)` for knob value updates
- `emitSnapshot()` for broadcasting current state

**Critical Addition (Line 207+):**
```javascript
collect(data) {
    console.log("[StationAgent-DEBUG] collect() called for", this.stationId, "-", this.extension);
    if (data.metrics) {
        Object.entries(data.metrics).forEach(([key, value]) => {
            this.recordMetric(key, value);
        });
    }
    if (data.knobs) {
        this.updateKnobs(data.knobs);
    }
    if (data.callId) this.callId = data.callId;
    if (data.timestamp) this.lastActivity = new Date(data.timestamp).getTime();
    this.emitSnapshot();
}
```

### STTTSserver Integration
**Location:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js`

- Must be started from its own directory for proper module resolution
- Provides HTTP interface on port 8080
- Integrates with station handlers for call processing
- UDP socket interception for gateway communication

## API Endpoints

### Health Check Endpoint
**GET** `/api/health/system`

Returns comprehensive health status of all monitored components:
```json
{
    "status": "operational|degraded|critical",
    "timestamp": "ISO8601",
    "components": {
        "componentId": {
            "status": "LIVE|DEAD",
            "pid": 12345,
            "port": 8090,
            "uptime": "2h 15m 30s",
            "cpu": 2.5,
            "memory": 45.2,
            "layer": "monitoring|core|gateway",
            "critical": true,
            "lastCheck": "ISO8601"
        }
    }
}
```

### Snapshots Endpoint
**GET** `/api/snapshots`

Returns station monitoring data:
```json
[
    {
        "stationId": "station3",
        "extension": "4444",
        "timestamp": "ISO8601",
        "metrics": {
            "matrix": 75,
            "knob": 150
        },
        "callId": "uuid",
        "state": "active"
    }
]
```

**POST** `/api/snapshots`

Stores new snapshot data (internal use by monitoring bridge).

### Component Control Endpoints

**POST** `/api/components/:componentId/start`
- Starts a stopped PM2-managed component
- Critical components (database-api-server, monitoring-server) return 403
- Request: Empty body
- Success Response: `{"success":true,"message":"[componentId] started"}`
- Error Response: `{"error":"Component not found or not manageable"}` (404)
- Critical Component Response: `{"error":"Critical monitoring components can only be restarted, not stopped/started"}` (403)

**POST** `/api/components/:componentId/stop`
- Stops a running PM2-managed component
- Critical components return 403 to prevent system instability
- Request: Empty body
- Success Response: `{"success":true,"message":"[componentId] stopped"}`
- Error Response: `{"error":"Component not found or not manageable"}` (404)
- Critical Component Response: `{"error":"Critical monitoring components can only be restarted, not stopped"}` (403)

**POST** `/api/components/:componentId/restart`
- Restarts any PM2-managed component (including critical ones)
- Request: Empty body
- Success Response: `{"success":true,"message":"[componentId] restarted"}`
- Error Response: `{"error":"Component not found or not manageable"}` (404)
- Note: May return 502 when database-api-server restarts itself

### Clear Data Endpoint
**POST** `/api/clear`

Clears all stored monitoring data.

## Technical Implementation Details

### Process Detection Mechanism
The system uses two methods for process detection:

1. **pgrep-based detection** (for non-PM2 processes):
```javascript
const { stdout } = await execAsync(`pgrep -f "${component.name}"`);
const pids = stdout.trim().split('\n').filter(Boolean);
```

2. **PM2 API detection** (for PM2-managed processes):
```javascript
pm2.describe(component.pm2Name || component.id, (err, processDesc) => {
    if (!err && processDesc && processDesc.length > 0) {
        const proc = processDesc[0];
        status.status = proc.pm2_env.status === 'online' ? 'LIVE' : 'DEAD';
        status.pid = proc.pid;
        status.uptime = formatUptime(Date.now() - proc.pm2_env.created_at);
    }
});
```

### Resource Monitoring
CPU and memory usage collected via PM2 environment:
```javascript
if (proc.monit) {
    status.cpu = proc.monit.cpu || 0;
    status.memory = proc.monit.memory ?
        (proc.monit.memory / (1024 * 1024)).toFixed(1) : 0;
}
```

### Event System Architecture
- Uses Socket.IO for real-time bidirectional communication
- Event namespace: `unified-metrics` (previously `station-data`)
- Automatic reconnection with exponential backoff
- Connection pooling for multiple clients

## Configuration and Deployment

### PM2 Ecosystem Configuration
All components managed via PM2 with specific configurations:

```javascript
// PM2 managed components (8 total)
pm2 start database-api-server.js --name database-api-server      # ID: 0 (critical)
pm2 start monitoring-server.js --name monitoring-server          # ID: 1 (critical)
pm2 start monitoring-to-database-bridge.js --name monitoring-bridge # ID: 9
pm2 start STTTTSserver.js --name STTTTSserver                   # ID: 14
pm2 start ari-gstreamer-operational.js --name ari-gstreamer     # ID: 5
pm2 start gateway.js --name gateway-3333 --args 3333            # ID: 3
pm2 start gateway.js --name gateway-4444 --args 4444            # ID: 4
pm2 start continuous-full-monitoring-with-station3.js --name continuous-monitoring # ID: 15

// STTTSserver special case - must start from its directory
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
pm2 start STTTTSserver.js --name STTTTSserver
```

### Cloudflare Tunnel Configuration
**Tunnel ID:** `9a3116ce-76e3-4d66-9c0e-d6688ebf0d01`
**Public URL:** `https://tun.monitoringavailable.uk`
**Config Location:** `/home/azureuser/.cloudflared/9a3116ce-76e3-4d66-9c0e-d6688ebf0d01.json`

Tunnel routes traffic to localhost:8083 (database-api-server).

### Directory Structure
```
/home/azureuser/translation-app/
├── monitoring/
│   ├── database-api-server.js
│   ├── monitoring-server.js
│   └── monitoring-to-database-bridge.js
├── 3333_4444__Operational/
│   └── STTTTSserver/
│       ├── STTTTSserver.js
│       ├── station3-handler.js
│       ├── station9-handler.js
│       └── monitoring/
│           └── StationAgent.js
└── continuous-full-monitoring-with-station3.js
```

## Monitoring Data Structure

### Station Snapshot Format
```javascript
{
    stationId: "station3",      // Station identifier
    extension: "4444",           // Extension number
    timestamp: Date.now(),       // Unix timestamp
    metrics: {
        matrix: 75,              // Matrix value (±75 range)
        knob: 150,              // Knob value (±150 range)
        custom: {}              // Additional metrics
    },
    knobs: {
        knob1: 100,
        knob2: -50
    },
    callId: "uuid-v4",          // Current call identifier
    state: "active|idle",       // Station state
    lastActivity: Date.now()    // Last activity timestamp
}
```

### Component Status Format
```javascript
{
    status: "LIVE|DEAD",
    message: "Component operational",
    pid: 12345,                 // Process ID
    port: 8090,                 // Listening port
    uptime: "2h 15m 30s",       // Formatted uptime
    cpu: 2.5,                   // CPU percentage
    memory: 45.2,               // Memory in MB
    layer: "monitoring",        // System layer
    critical: true,             // Critical component flag
    lastCheck: "ISO8601"        // Last check timestamp
}
```

### Component Message Format
All components now include descriptive message field:
```javascript
{
    // ... existing fields ...
    message: "filename.js - Component description",  // NEW: Descriptive message
    pm2Name: "pm2-process-name"                      // NEW: PM2 management name
}

Example:
{
    status: "LIVE",
    message: "monitoring-server.js - The optimization engine",
    pid: 3697447,
    port: 8090,
    uptime: "30m",
    cpu: 1.5,
    memory: 101.6,
    layer: "monitoring",
    critical: true,
    pm2Name: "monitoring-server",
    lastCheck: "2024-12-16T00:45:00Z"
}
```

## Critical Integration Points

### 1. Station Handler Integration
Station handlers (station3-handler.js, station9-handler.js) must:
- Instantiate StationAgent with correct station ID
- Call `stationAgent.collect()` with metrics data
- Be started from correct directory for module resolution

### 2. Socket.IO Event Matching
Critical that all components use consistent event names:
- Emitters use: `unified-metrics`
- Listeners use: `unified-metrics`
- Previous mismatch (`station-data` vs `unified-metrics`) broke data flow

### 3. PM2 Process Management
All components must be:
- Started via PM2 for proper management
- Named consistently in PM2 (matches component.pm2Name)
- Monitored for automatic restart on failure

### 4. Port Assignments
Fixed port assignments prevent conflicts:
- 8083: Database API Server
- 8090: Monitoring Server
- 8080: STTTTSserver HTTP interface
- 4000, 4002: Gateway UDP ports
- 6120-6123: Additional UDP ports

### 5. Health Check Logic
Self-check skip prevents infinite restart loop:
- Database API server skips checking itself
- Prevents process from killing itself during health checks
- Critical for system stability

### 6. Component Management Rules
Critical Component Protection:
- `database-api-server` and `monitoring-server` are marked as critical
- Critical components can ONLY be restarted, not stopped/started
- This prevents accidental system outages
- Non-critical components have full start/stop/restart control

PM2 Managed Components (8 total):
1. monitoring-server (critical)
2. database-api-server (critical)
3. monitoring-bridge
4. STTTTSserver
5. ari-gstreamer
6. gateway-3333
7. gateway-4444
8. continuous-monitoring

## Troubleshooting Guide

### Common Issues and Solutions

1. **Station Handlers Showing as DEAD**
   - station3-handler and station9-handler show as DEAD
   - Actually running as modules within STTTTSserver process
   - Not standalone processes, detection needs parent process check

2. **Asterisk ARI/AMI False DEAD Status**
   - Ports 8088 (ARI) and 5038 (AMI) are listening
   - Shows as DEAD due to detection method
   - Use `ss` instead of `lsof` for port detection

3. **Component Name Changes**
   - PostgreSQL replaced with audio-optimization-db
   - UDP socket 6122 now properly named "UDP In 4444"

4. **Empty /api/snapshots Response**
   - Check event name matching in monitoring-bridge
   - Verify StationAgent.collect() method exists
   - Ensure monitoring-bridge is running

5. **Component Restart Loop**
   - Verify self-check skip in database-api-server
   - Check for port conflicts
   - Review PM2 logs for crash details

6. **STTTSserver Not Starting**
   - Must start from `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/`
   - Check for existing process on port 8080
   - Verify UDP port availability

7. **False LIVE Status**
   - Check correct port configuration in monitoredComponents
   - Verify pgrep pattern matches process name
   - Review PM2 status for actual state

8. **Cloudflare Tunnel Issues**
   - Check tunnel process: `cloudflared tunnel list`
   - Verify tunnel configuration in ~/.cloudflared/
   - Ensure database-api-server is running on 8083

## System Recovery Procedures

### Full System Restart
```bash
# 1. Stop all components
pm2 stop all

# 2. Clear PM2 logs
pm2 flush

# 3. Start monitoring infrastructure
pm2 start /home/azureuser/translation-app/monitoring/database-api-server.js --name database-api-server
pm2 start /home/azureuser/translation-app/monitoring/monitoring-server.js --name monitoring-server
pm2 start /home/azureuser/translation-app/monitoring/monitoring-to-database-bridge.js --name monitoring-bridge

# 4. Start STTTSserver from correct directory
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
pm2 start STTTTSserver.js --name STTTTSserver

# 5. Start continuous monitoring
pm2 start /home/azureuser/translation-app/continuous-full-monitoring-with-station3.js --name continuous-full-monitoring

# 6. Verify all components
pm2 status
```

### Verification Steps
1. Check PM2 status: `pm2 status`
2. Verify API health: `curl https://tun.monitoringavailable.uk/api/health/system`
3. Check snapshots: `curl https://tun.monitoringavailable.uk/api/snapshots`
4. Review logs: `pm2 logs --lines 50`

## Conclusion

The System Components monitoring system provides comprehensive infrastructure monitoring through a carefully orchestrated set of Node.js services. The system's architecture emphasizes:

- **Modularity**: Separate components for data collection, aggregation, and API access
- **Reliability**: PM2 management with automatic restart capabilities
- **Accessibility**: Public API via Cloudflare Tunnel
- **Real-time Updates**: Socket.IO for immediate data propagation
- **Extensibility**: StationAgent pattern for easy integration of new monitoring points

### Recent Enhancements (December 2024)
- Added start/stop POST endpoints for component control
- Implemented critical component protection
- Added descriptive messages to all components
- Integrated continuous-monitoring with PM2 management
- Fixed UDP socket naming issues
- Replaced generic postgresql with audio-optimization-db

### Current System State
- 23 total components monitored (was 29)
- 14 LIVE, 4 DEAD, 3 READY, 1 DEGRADED, 1 HEALTHY
- 8 components under PM2 management with full control
- All components display Port/CPU/Memory metrics
- Descriptive messages provide component context

Critical success factors include maintaining event name consistency, proper PM2 configuration, and careful management of process lifecycles to prevent self-termination loops. The system's recovery from the initial failure demonstrated both its fragility when misconfigured and its robustness when properly maintained.