# CRITICAL ISSUE: Wrong STTTSserver.js Running on VM

## Issue Discovery
Date: January 16, 2026

## Root Cause Analysis

### The Problem
**No metrics are being collected because PM2 is running the WRONG STTTSserver.js file**

### Two Different STTTSserver.js Files Exist:

1. **MINIMAL Version (Currently Running on VM)**
   - Size: 3,237 bytes
   - Location: `/home/azureuser/translation-app/3333_4444__Operational/STTTSserver/STTTSserver.js` (3 T's)
   - Function: Simple UDP packet forwarder
   - Monitoring: **NONE** - No monitoring integration at all
   - Status: **THIS IS WHAT'S RUNNING NOW**

2. **FULL Version (Should Be Running)**
   - Size: 170,827 bytes
   - Location: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js` (4 T's)
   - Function: Full STT/TTS server with monitoring
   - Monitoring: **INTEGRATED** - Calls initializeNewMonitoring() on startup
   - Status: **THIS SHOULD BE RUNNING**

## Directory Structure Confusion

The confusion comes from two similarly named directories:
- `STTTSserver/` (3 T's) - Contains minimal UDP forwarder
- `STTTTSserver/` (4 T's) - Contains full system with Monitoring_Stations/

## Why Metrics Aren't Being Collected

1. PM2 is running the minimal 3KB version
2. This version has NO monitoring code whatsoever
3. It's just a simple UDP packet forwarder
4. The Monitoring_Stations directory exists but isn't being loaded
5. MetricsRegistry.js exists but isn't being used

## The Solution

**PM2 needs to run the correct STTTSserver.js file:**

```bash
# Current (WRONG):
pm2 start /home/azureuser/translation-app/3333_4444__Operational/STTTSserver/STTTSserver.js

# Should be (CORRECT):
pm2 start /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTSserver.js
```

## Evidence

### Local File Comparison:
```bash
# Minimal version (3 T's):
-rwxr-xr-x  3,237 bytes  translation-app/3333_4444__Operational/STTTSserver/STTTSserver.js

# Full version (4 T's):
-rw-r--r--  170,827 bytes  3333_4444__Operational/STTTTSserver/STTTSserver.js
```

### Monitoring Integration in Full Version:
```javascript
// Line 1545-1598 of the FULL version:
async function initializeNewMonitoring() {
    const { getMonitoringBootstrap } = await import('./Monitoring_Stations/MonitoringStationsBootstrap.js');
    newMonitoring = getMonitoringBootstrap();
    // ... initialization code ...
}
setTimeout(() => initializeNewMonitoring().catch(console.error), 100);
```

### No Monitoring in Minimal Version:
```javascript
// The minimal version is just a UDP forwarder:
const dgram = require('dgram');
// ... only UDP forwarding logic, NO monitoring ...
```

## Next Steps

1. **Verify on VM** which STTTSserver.js PM2 is actually running
2. **Update PM2 configuration** to use the correct 170KB version
3. **Restart the service** with the correct file
4. **Verify monitoring starts** working immediately

## Impact

- This explains why NO metrics have been collected since the restore
- The monitoring system files are all present and correct
- MetricsRegistry.js is properly configured
- The only issue is PM2 running the wrong executable

## Timeline

1. System crash from heavy metric computations
2. Restored MetricsRegistry.js from backup
3. System stabilized but no metrics collected
4. Discovery: PM2 running minimal version without monitoring
5. **Current State**: Need to switch to correct STTTSserver.js