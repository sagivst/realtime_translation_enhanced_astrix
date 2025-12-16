# Gap Analysis: Documentation vs Current System State
**Date:** December 16, 2024

## 1. DOCUMENTATION GAPS & UPDATES NEEDED

### A. API Endpoints (Section 6)
**Documentation States:** Only restart endpoint exists
**Current Reality:** Three control endpoints now exist
```
❌ MISSING IN DOCS:
- POST /api/components/:componentId/stop
- POST /api/components/:componentId/start
- Security restrictions for critical components
```

### B. Component Count
**Documentation States:** 29 components monitored
**Current Reality:** 23 components (was 29, some removed/consolidated)
```
✅ LIVE: 14/23 components
❌ DEAD: 4 (station handlers, Asterisk ARI/AMI)
```

### C. Port Assignments (Critical Integration Points)
**Documentation States:** Fixed ports list
**Current Reality:** Matches except:
```
❌ Port 3001: Listed as "Monitoring Server (actual)" - INCORRECT
✅ Port 8090: Monitoring Server - CORRECT
✅ Port 3020: STTTTSserver on Azure VM - CORRECT
```

### D. PM2 Managed Components
**Documentation:** Doesn't list all PM2 components
**Current Reality:** 8 PM2-managed components:
```
✅ NEW: continuous-monitoring (PM2 ID: 15)
✅ All have pm2Name fields for management
```

### E. Component Messages/Descriptions
**Documentation:** No mention of descriptive messages
**Current Reality:** All components now have message field
```
✅ NEW FEATURE: Descriptive messages for all components
Example: "monitoring-server.js - The optimization engine"
```

## 2. SYSTEM STATE DISCREPANCIES

### A. Component Health Status
```
ISSUE: Station handlers showing as DEAD but are actually embedded in STTTTSserver
ISSUE: Asterisk ARI (8088) and AMI (5038) showing DEAD but ports are listening
ISSUE: PostgreSQL replaced with audio-optimization-db but docs still reference PostgreSQL
```

### B. Data Flow Issues
**Documentation:** States monitoring data flows to Database API
**Reality:** 
```
✅ Data flow working: Station → Monitoring Server → Bridge → Database API
❌ Snapshots endpoint returns data but not all metrics captured
```

## 3. CONFIGURATION CHANGES

### A. Database Component
```
OLD: postgresql
NEW: audio-optimization-db
Status: LIVE
Port: 5432
```

### B. UDP Socket Names
```
FIXED: UDP socket 6122 now shows "UDP In 4444" (was missing name)
```

### C. Critical Components Protection
```
NEW: database-api-server and monitoring-server cannot be stopped/started
     (only restart allowed for safety)
```

## 4. RECOMMENDED DOCUMENTATION UPDATES

### Section 6: API Endpoints - ADD:
```markdown
### Component Control Endpoints
**POST** `/api/components/:componentId/stop`
- Stops a PM2-managed component
- Returns 403 for critical components
- Body: Empty
- Response: `{"success":true,"message":"[component] stopped"}`

**POST** `/api/components/:componentId/start`  
- Starts a PM2-managed component
- Returns 403 for critical components
- Body: Empty
- Response: `{"success":true,"message":"[component] started"}`

**Security:** Critical components (database-api-server, monitoring-server) 
can only be restarted, not stopped/started separately.
```

### Section 3: Core Components - UPDATE:
```markdown
**Total Components:** 23 (14 LIVE, 4 DEAD, 3 READY, 1 DEGRADED, 1 HEALTHY)

**PM2 Managed (8 total):**
- monitoring-server (critical)
- database-api-server (critical)  
- monitoring-bridge
- STTTTSserver
- ari-gstreamer
- gateway-3333
- gateway-4444
- continuous-monitoring (NEW)
```

### Section 9: Monitoring Data Structure - ADD:
```markdown
### Component Message Format
All components now include descriptive message field:
{
    ...existing fields...,
    message: "filename.js - Component description"
}
```

### Section 10: Critical Integration Points - UPDATE:
```markdown
### Port Assignments (CORRECTED)
- 8090: Monitoring Server (NOT 3001)
- 3020: STTTTSserver on Azure VM
```

## 5. ISSUES REQUIRING ATTENTION

1. **Station Handlers:** Showing as DEAD but are modules in STTTTSserver
   - Solution: Update detection logic to check parent process

2. **Asterisk ARI/AMI:** Ports listening but showing as DEAD
   - Port 8088 (ARI) and 5038 (AMI) are active
   - Detection method needs adjustment

3. **Missing Component Messages:** 7 components still lack messages
   - cloudflared, deepgram-api, deepl-api, elevenlabs-api
   - station3-handler, station9-handler, postgresql

4. **High Restart Counts:**
   - database-api-server: 2387 restarts
   - monitoring-server: 215 restarts
   - Indicates stability issues needing investigation

## 6. SUMMARY

The monitoring system is largely functional with significant enhancements added:
- ✅ New control endpoints for component management
- ✅ Descriptive messages for understanding component roles
- ✅ PM2 integration for continuous-monitoring
- ✅ Security restrictions on critical components

Key gaps in documentation that need updates:
- API endpoint documentation incomplete
- Port assignments have errors
- Component count and status outdated
- New features (messages, control endpoints) undocumented
