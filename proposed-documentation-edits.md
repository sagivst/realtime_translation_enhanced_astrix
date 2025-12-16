# PROPOSED EDITS FOR: System-Components-Monitoring-Reverse-Engineering.md

## Edit 1: Update Executive Summary (Line 19-25)
**REPLACE:**
```markdown
### Key Capabilities
- Real-time component health monitoring
- Process lifecycle management via PM2
- Resource utilization tracking (CPU, Memory)
- Station-specific metrics collection
- RESTful API for data access and control
- Automatic component restart on failure
```

**WITH:**
```markdown
### Key Capabilities
- Real-time component health monitoring with descriptive messages
- Process lifecycle management via PM2 (8 managed components)
- Resource utilization tracking (CPU, Memory)
- Station-specific metrics collection
- RESTful API for data access and full component control (start/stop/restart)
- Automatic component restart on failure
- Security restrictions on critical components
```

## Edit 2: Add Component Control Endpoints (After line 281)
**ADD NEW SECTION:**
```markdown
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
```

## Edit 3: Update Monitored Components List (Line 95-105)
**REPLACE:**
```javascript
const monitoredComponents = [
    {
        id: "monitoring-server",
        name: "monitoring-server.js",
        port: 8090,
        layer: "monitoring",
        critical: true
    },
    // ... other components
];
```

**WITH:**
```javascript
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

## Edit 4: Fix Port Documentation (Line 108)
**REPLACE:**
```markdown
| 3001 | TCP | Monitoring Server (actual) | Socket.IO monitoring |
```

**WITH:**
```markdown
| 8090 | TCP | Monitoring Server (actual) | Socket.IO monitoring |
```

**DELETE LINE:** (Port 3001 reference - incorrect)

## Edit 5: Update PM2 Ecosystem (Line 329-338)
**REPLACE:**
```javascript
// PM2 start commands
pm2 start database-api-server.js --name database-api-server
pm2 start monitoring-server.js --name monitoring-server
pm2 start monitoring-to-database-bridge.js --name monitoring-bridge
pm2 start continuous-full-monitoring-with-station3.js --name continuous-full-monitoring
```

**WITH:**
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
```

## Edit 6: Add Component Message Structure (Line 389)
**ADD after Component Status Format:**
```javascript
### Component Message Format  
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

## Edit 7: Update Critical Integration Points (Line 415)
**ADD:**
```markdown
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
```

## Edit 8: Update Known Issues (Line 441)
**REPLACE "Empty /api/snapshots Response" WITH:**
```markdown
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
```

## Edit 9: Update Summary/Conclusion (Line 499)
**ADD before "Critical success factors":**
```markdown
Recent Enhancements (December 2024):
- Added start/stop POST endpoints for component control
- Implemented critical component protection
- Added descriptive messages to all components
- Integrated continuous-monitoring with PM2 management
- Fixed UDP socket naming issues
- Replaced generic postgresql with audio-optimization-db

Current System State:
- 23 total components monitored (was 29)  
- 14 LIVE, 4 DEAD, 3 READY, 1 DEGRADED, 1 HEALTHY
- 8 components under PM2 management with full control
- All components display Port/CPU/Memory metrics
- Descriptive messages provide component context
```

## Summary of Changes:
1. ✅ Added new API endpoints documentation (start/stop)
2. ✅ Corrected port assignments (8090 not 3001)
3. ✅ Updated component count (23 not 29)
4. ✅ Added PM2 management details
5. ✅ Included component message field documentation
6. ✅ Added security restrictions for critical components
7. ✅ Updated known issues with current problems
8. ✅ Added recent enhancements section
