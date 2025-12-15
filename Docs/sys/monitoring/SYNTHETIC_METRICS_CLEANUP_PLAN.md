# Synthetic Metrics Cleanup Plan
## Remove QA/Test Code Generating Fake Baseline Data

**Date:** 2025-12-09
**Status:** READY FOR APPROVAL
**Priority:** CRITICAL - System currently showing 100% fake data in public API

---

## Executive Summary

The monitoring system is currently generating **100% synthetic/fake metrics** instead of real call data. Both Station-3 and Station-9 use periodic timers (setInterval every 200ms) with hardcoded fake call_id values to generate baseline metrics continuously, regardless of actual phone call activity.

This is **leftover QA/test code** that must be removed. Real metrics should only flow during actual phone calls.

---

## Problem Analysis

### Current Synthetic Data Generation Flow

```
┌─────────────────────────────────────────────────────────────┐
│ STATION-3 HANDLER (station3-handler.js)                     │
│                                                              │
│ initStationAgent(StationAgent) {                            │
│   this.collectionInterval = setInterval(async () => {       │
│     await this.stationAgent.collect({                       │
│       timestamp: Date.now(),                                │
│       extension: this.extensionId,                          │
│       call_id: 'station3-monitoring' // ← FAKE CALL ID!!!  │
│     });                                                      │
│   }, 200); // Runs every 200ms, NO CALL REQUIRED            │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    StationAgent.collect()
                              ↓
              UniversalCollector.collectAll()
                              ↓
            **GENERATES SYNTHETIC VALUES**
         (No real audio, no real call data)
                              ↓
            monitoring-server (port 3001)
                              ↓
         monitoring-to-database-bridge
                              ↓
          database-api-server (port 8083)
                              ↓
         **PUBLIC API SHOWS FAKE DATA**
```

### Where Synthetic Data is Created

**File: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station3-handler.js`**
```javascript
// Lines: ~15-35 (REMOVE THIS ENTIRE BLOCK)
this.collectionInterval = setInterval(async () => {
  if (this.stationAgent) {
    try {
      await this.stationAgent.collect({
        timestamp: Date.now(),
        extension: this.extensionId,
        call_id: 'station3-monitoring' // ← HARDCODED FAKE ID
      });
    } catch (error) {
      console.error(`[STATION-3-${this.extensionId}] Collection error:`, error.message);
    }
  }
}, 200); // ← PERIODIC TIMER - NO CONNECTION TO REAL CALLS
```

**File: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station9-handler.js`**
```javascript
// Lines: ~15-35 (REMOVE THIS ENTIRE BLOCK - JUST ADDED IN ERROR!)
this.collectionInterval = setInterval(async () => {
  if (this.stationAgent) {
    try {
      await this.stationAgent.collect({
        timestamp: Date.now(),
        extension: this.extensionId,
        call_id: 'station9-monitoring' // ← HARDCODED FAKE ID
      });
    } catch (error) {
      console.error(`[STATION-9-${this.extensionId}] Collection error:`, error.message);
    }
  }
}, 200); // ← PERIODIC TIMER - NO CONNECTION TO REAL CALLS
```

### How Synthetic Values Are Generated

**File: StationAgent.js:129-176 (sendToMonitoring method)**

When periodic collection runs with fake call_id, StationAgent generates fake default values:

```javascript
sendToMonitoring(metrics, alerts) {
  const snapshot = {
    station_id: this.stationId,
    call_id: this.currentCallId || `${this.stationId}-${Date.now()}`, // ← Uses fake ID
    metrics: {
      // ← ALL THESE ARE HARDCODED DEFAULTS (NO REAL DATA)
      snr_db: metrics.snr_db || 25,           // Fake: 25 dB
      noise_floor_db: metrics.noise_floor_db || -65,  // Fake: -65 dB
      audio_level_dbfs: metrics.audio_level_dbfs || -18, // Fake: -18 dBFS
      voice_activity_ratio: metrics.voice_activity_ratio || 0.7, // Fake: 70%
      clipping_detected: metrics.clipping_detected || 0,  // Fake: 0
      buffer_usage_pct: metrics.buffer_usage_pct || 45,   // Fake: 45%
      // ... etc. ALL FAKE DEFAULT VALUES
    }
  };
  client.emit('metrics', snapshot); // ← Sends fake data to monitoring
}
```

**File: UniversalCollector.js:118-147 (collectAll method)**

When context has no real audio data (because it's from periodic timer, not real call), collectors return `null`, then StationAgent fills in fake defaults:

```javascript
async collectAll(context) {
  const metrics = {};
  for (const [key, collector] of Object.entries(this.collectors)) {
    try {
      const value = await collector.collect(context);
      metrics[key] = value; // ← Returns null when no real data
    } catch (error) {
      metrics[key] = null; // ← No real data available
    }
  }
  return { metrics, alerts };
}
```

---

## Root Cause

1. **Periodic Collection Loops** - `setInterval()` calls in both handlers run continuously regardless of call state
2. **Fake Call IDs** - Hardcoded strings like `'station3-monitoring'` and `'station9-monitoring'` instead of real call UUIDs
3. **Default Value Fallbacks** - `||` operators providing synthetic baseline values when real metrics are unavailable
4. **No Event Hookup** - Collection not triggered by actual audio events (Deepgram transcripts, TTS output)

---

## Cleanup Plan

### Phase 1: Remove Periodic Collection from Station-3 Handler

**File:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station3-handler.js`

**Changes:**

1. **Remove `collectionInterval` property** from constructor:
```javascript
// BEFORE:
constructor(extensionId) {
  this.collectionInterval = null; // ← REMOVE THIS LINE
  // ...
}

// AFTER:
constructor(extensionId) {
  // No collectionInterval property needed
  // ...
}
```

2. **Remove entire periodic collection block** from `initStationAgent()`:
```javascript
// BEFORE:
initStationAgent(StationAgent) {
  this.stationAgent = new StationAgent('STATION_3', this.extensionId);

  // ← REMOVE THIS ENTIRE BLOCK (Lines ~15-35)
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
  }, 200);

  console.log(`[STATION-3] Initialized for extension ${this.extensionId} with 200ms collection interval`);
}

// AFTER:
initStationAgent(StationAgent) {
  this.stationAgent = new StationAgent('STATION_3', this.extensionId);
  console.log(`[STATION-3] Initialized for extension ${this.extensionId} (event-driven collection)`);
}
```

3. **Find where Deepgram sends transcripts** and add collection call there:
```javascript
// In STTTTSserver.js, find the Deepgram transcript handler
// Location: Search for "deepgram" or "transcript" event handlers

// ADD THIS:
async onDeepgramTranscript(transcriptData, extension, callId) {
  // Existing transcript processing...

  // NEW: Collect metrics during REAL audio processing
  const station3Handler = extension === '3333' ? station3_3333 : station3_4444;
  if (station3Handler && station3Handler.stationAgent) {
    await station3Handler.stationAgent.collect({
      timestamp: Date.now(),
      extension: extension,
      call_id: callId, // ← REAL call ID from actual call
      pcmBuffer: transcriptData.audioBuffer, // Real audio data
      transcript: transcriptData.transcript
    });
  }
}
```

### Phase 2: Remove Periodic Collection from Station-9 Handler

**File:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station9-handler.js`

**Changes:**

1. **Remove `collectionInterval` property** from constructor:
```javascript
// BEFORE:
constructor(extensionId) {
  this.collectionInterval = null; // ← REMOVE THIS LINE
  // ...
}

// AFTER:
constructor(extensionId) {
  // No collectionInterval property needed
  // ...
}
```

2. **Remove entire periodic collection block** from `initStationAgent()`:
```javascript
// BEFORE:
initStationAgent(StationAgent) {
  this.stationAgent = new StationAgent('STATION_9', this.extensionId);

  // ← REMOVE THIS ENTIRE BLOCK (Lines ~15-35)
  this.collectionInterval = setInterval(async () => {
    if (this.stationAgent) {
      try {
        await this.stationAgent.collect({
          timestamp: Date.now(),
          extension: this.extensionId,
          call_id: 'station9-monitoring'
        });
      } catch (error) {
        console.error(`[STATION-9-${this.extensionId}] Collection error:`, error.message);
      }
    }
  }, 200);

  console.log(`[STATION-9] Initialized for extension ${this.extensionId} with 200ms collection interval`);
}

// AFTER:
initStationAgent(StationAgent) {
  this.stationAgent = new StationAgent('STATION_9', this.extensionId);
  console.log(`[STATION-9] Initialized for extension ${this.extensionId} (event-driven collection)`);
}
```

3. **Modify `onTTSOutput()`** to actually collect metrics:
```javascript
// BEFORE:
onTTSOutput(audioBuffer) {
  if (!this.stationAgent) return;
  this.audioStartTime = Date.now();
  // No collection happening!
}

// AFTER:
async onTTSOutput(audioBuffer, callId) {
  if (!this.stationAgent) return;

  this.audioStartTime = Date.now();

  // NEW: Collect metrics during REAL TTS output
  await this.stationAgent.collect({
    timestamp: Date.now(),
    extension: this.extensionId,
    call_id: callId, // ← REAL call ID from actual call
    pcmBuffer: audioBuffer, // Real TTS audio data
    ttsOutput: true
  });
}
```

4. **Update STTTTSserver.js to pass call_id** to Station-9:
```javascript
// In STTTTSserver.js, find where station9Handler.onTTSOutput() is called
// Location: Line ~4075 based on investigation doc

// BEFORE:
station9Handler.onTTSOutput(pcmBuffer);

// AFTER:
station9Handler.onTTSOutput(pcmBuffer, currentCallId); // Pass real call ID
```

### Phase 3: Verify No Synthetic Fallbacks in StationAgent

**File:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring/StationAgent.js`

**Review `sendToMonitoring()` method (lines 129-176)**

Current code has `||` fallbacks creating fake values:
```javascript
metrics: {
  snr_db: metrics.snr_db || 25,  // ← BAD: Creates fake 25 if no real data
  noise_floor_db: metrics.noise_floor_db || -65, // ← BAD: Fake -65
  // etc.
}
```

**Decision Point:**
- **Option A (Recommended):** Remove all `||` fallbacks - only send real metrics, never fake defaults
- **Option B:** Keep fallbacks but only send when `call_id` is from real call (not fake monitoring ID)

**Recommended Fix:**
```javascript
// BEFORE:
metrics: {
  snr_db: metrics.snr_db || 25,
  noise_floor_db: metrics.noise_floor_db || -65,
  // ...
}

// AFTER:
metrics: {
  // Only include metrics that have REAL values (no fake defaults)
  ...(metrics.snr_db !== null && { snr_db: metrics.snr_db }),
  ...(metrics.noise_floor_db !== null && { noise_floor_db: metrics.noise_floor_db }),
  // etc. - spread operator only includes non-null real values
}
```

### Phase 4: Remove Fake Data from Database

**Clear existing synthetic snapshots:**
```bash
ssh azureuser@20.170.155.53 "rm -f /tmp/monitoring-snapshots.json && echo 'Cleared fake monitoring data'"
```

**Restart database-api-server with clean slate:**
```bash
ssh azureuser@20.170.155.53 "pkill -f 'database-api-server' && cd /home/azureuser/translation-app && nohup node database-api-server.js > /tmp/database-api-fresh.log 2>&1 &"
```

### Phase 5: Restart All Services

1. Kill old STTTTSserver with synthetic collection
2. Start new STTTTSserver with event-driven collection only
3. Verify logs show NO metrics without active calls
4. Make test call and verify metrics ONLY appear during call

---

## Expected Results After Cleanup

### Before Cleanup (Current State)
```bash
$ curl http://localhost:8083/api/snapshots
{
  "snapshots": [
    { "station_id": "STATION_3", "call_id": "station3-monitoring", ... }, # FAKE
    { "station_id": "STATION_3", "call_id": "station3-monitoring", ... }, # FAKE
    { "station_id": "STATION_9", "call_id": "station9-monitoring", ... }, # FAKE
    # ... 50 snapshots of FAKE data
  ]
}
```

### After Cleanup (Expected State - No Active Calls)
```bash
$ curl http://localhost:8083/api/snapshots
{
  "snapshots": []  # CORRECT - No calls = No data
}
```

### After Cleanup (Expected State - During Active Call)
```bash
$ curl http://localhost:8083/api/snapshots
{
  "snapshots": [
    {
      "station_id": "STATION_3",
      "call_id": "3333-1733702345-uuid",  # REAL call UUID
      "metrics": {
        "snr_db": 28.3,  # REAL value from actual audio
        "noise_floor_db": -62.1,  # REAL measured noise
        # ... all REAL metrics from actual call
      }
    },
    {
      "station_id": "STATION_9",
      "call_id": "3333-1733702345-uuid",  # SAME real call UUID
      "metrics": {
        "buffer_usage_pct": 52,  # REAL TTS buffer usage
        # ... all REAL metrics from actual TTS
      }
    }
  ]
}
```

---

## Files to Modify

| File Path | Changes | Backup Path |
|-----------|---------|-------------|
| `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station3-handler.js` | Remove periodic collection | `.backup-before-cleanup-YYYYMMDD-HHMMSS` |
| `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station9-handler.js` | Remove periodic collection | `.backup-before-cleanup-YYYYMMDD-HHMMSS` |
| `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js` | Add real event hookups | `.backup-before-cleanup-YYYYMMDD-HHMMSS` |
| `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring/StationAgent.js` | Remove `||` fallbacks | `.backup-before-cleanup-YYYYMMDD-HHMMSS` |
| `/tmp/monitoring-snapshots.json` | Delete (clear fake data) | N/A |

---

## Implementation Steps

1. **Create backups** of all 4 files with timestamp
2. **Implement Phase 1** - Remove Station-3 periodic collection
3. **Implement Phase 2** - Remove Station-9 periodic collection
4. **Implement Phase 3** - Remove synthetic fallbacks in StationAgent
5. **Find real event hooks** in STTTTSserver.js for Deepgram and TTS
6. **Add collection calls** at real event locations
7. **Phase 4** - Clear fake database
8. **Phase 5** - Restart services
9. **Test with no calls** - Verify API returns empty array
10. **Test with active call** - Verify real metrics appear
11. **Document** real call IDs vs fake IDs for verification

---

## Verification Checklist

- [ ] No metrics in API when no calls active
- [ ] Metrics appear in API ONLY during active calls
- [ ] `call_id` values are UUIDs from real calls (not 'station3-monitoring' or 'station9-monitoring')
- [ ] Metric values change between snapshots (not static fake defaults)
- [ ] Station-3 metrics correlate with Deepgram activity
- [ ] Station-9 metrics correlate with ElevenLabs TTS output
- [ ] Logs show collection only during calls: `[STATION-3-3333] 📊 Sent metrics to monitoring (call: 3333-real-uuid-123)`
- [ ] No continuous log spam every 200ms when idle

---

## Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Break existing monitoring | HIGH | Create backups of all files before modification |
| Miss real event hooks | MEDIUM | Thoroughly grep for Deepgram/TTS handlers in STTTTSserver.js |
| Collection never triggers | HIGH | Add logging to verify event-driven collection works |
| Metrics still showing when idle | HIGH | Clear database and verify empty API response |

---

## Questions for User Approval

1. Confirm removal of ALL periodic collection timers?
2. Confirm metrics should ONLY flow during actual calls?
3. Confirm removal of synthetic default value fallbacks (`||` operators)?
4. Should we implement Option A (no fallbacks) or Option B (conditional fallbacks) for StationAgent?

---

## Next Steps After Approval

Once you approve this plan, I will:

1. Create timestamped backups of all 4 files
2. Execute Phase 1-3 (remove synthetic code)
3. Search for real event hook locations in STTTTSserver.js
4. Present exact line numbers and code for hooking real events
5. Implement the changes
6. Clear database and restart services
7. Test and verify real-only metrics

**Estimated Time:** 30-45 minutes for full cleanup and testing

**Ready for your approval to proceed.**
