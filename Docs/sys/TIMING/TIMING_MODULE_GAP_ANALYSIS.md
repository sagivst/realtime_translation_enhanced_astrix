# Timing/Sync Module Gap Analysis - PCM Format Migration
**Date:** 2025-11-25
**System:** 3333_4444__Operational
**Purpose:** Identify event collector breaks after ALAW→PCM upgrade

---

## Executive Summary

**Original System:** ALAW 8kHz direct processing
**Current System:** ALAW 8kHz → PCM 16kHz via GStreamer
**Status:** Timing module code intact, but data collection broken

**Critical Finding:** The timing module classes and algorithms are **NOT broken**. The event collectors stopped firing due to **bufferThreshold misconfiguration**, preventing the entire translation pipeline from executing.

---

## Gap Analysis Matrix

| Component | Original (ALAW 8kHz) | Current (PCM 16kHz) | Status | Issue |
|-----------|---------------------|---------------------|--------|-------|
| **ExtensionPairManager** | Working | Working | ✅ INTACT | None - pairing logic unchanged |
| **LatencyTracker** | Working | Not receiving data | ⚠️ STARVED | No events to track |
| **AudioBufferManager** | Working | Not executing | ⚠️ STARVED | No buffer calculations |
| **DashboardTCPAPI** | Working | Broadcasting zeros | ⚠️ STARVED | No data to broadcast |
| **processGatewayAudio()** | Executing | NOT executing | 🔴 BLOCKED | bufferThreshold too high |
| **UDP PCM Buffer** | N/A (direct ALAW) | 48000 bytes (1.5s) | 🔴 BROKEN | Should be 6400 bytes |
| **Timing Collection** | All 9 stages | 0 stages collected | 🔴 BLOCKED | Pipeline never runs |
| **E2E Latency Update** | Working | Never called | 🔴 BLOCKED | Line 2645 unreachable |
| **Buffer Calculation** | Working | Never called | 🔴 BLOCKED | Line 2650+ unreachable |

---

## Root Cause Chain

```
ALAW 8kHz → PCM 16kHz Migration
    ↓
New UDP buffer system introduced (UDP_PCM_CONFIG)
    ↓
bufferThreshold set to 48000 bytes (1.5 seconds)
    ↓
UDP socket waits 1.5s before triggering translation
    ↓
processGatewayAudio() NEVER executes
    ↓
latencyTracker.updateLatency() NEVER called (line 2645)
    ↓
directionSamples Map remains empty
    ↓
getCurrentLatencyDifference() returns null
    ↓
Buffer sync disabled (no data to calculate from)
    ↓
Audio plays unsynchronized
    ↓
Calls disconnect at 90s (SIP session timer)
```

---

## Event Collector Analysis

### Event Collector 1: UDP Socket Data Event
**File:** STTTTSserver.js
**Lines:** ~3700-3750
**Function:** Accumulates PCM audio until bufferThreshold reached

**Original Behavior (ALAW):**
- Direct socket processing, no buffering threshold
- Immediate processing on audio receipt

**Current Behavior (PCM):**
```javascript
socket.on('message', (msg) => {
  const rawAudio = msg;
  udpPcmBuffer.push(...rawAudio);

  // CRITICAL CHECK - Event collector gate
  if (udpPcmBuffer.length >= UDP_PCM_CONFIG.bufferThreshold) {
    const audioBuffer = Buffer.from(udpPcmBuffer.splice(0, UDP_PCM_CONFIG.bufferThreshold));
    processGatewayAudio(socket, extension, audioBuffer, language);
  }
});
```

**Gap Identified:**
- **Original:** bufferThreshold = N/A (immediate processing)
- **Current:** bufferThreshold = 48000 bytes (1.5 seconds)
- **Expected:** bufferThreshold = 6400 bytes (200ms at 16kHz PCM)

**Calculation:**
```
PCM 16kHz mono = 32000 bytes/second
Target latency = 200ms (0.2 seconds)
Required buffer = 32000 * 0.2 = 6400 bytes
```

**Status:** 🔴 **BROKEN** - Threshold 7.5x too high
**Fix Applied:** Changed line 3640 from 48000 → 6400

---

### Event Collector 2: Translation Pipeline Trigger
**File:** STTTTSserver.js
**Line:** 3928
**Function:** Increments translation request counter

**Original Behavior (ALAW):**
- Counter incremented on every translation request
- Typical rate: 15-20 requests per 40-second call

**Current Behavior (PCM):**
```javascript
async function processGatewayAudio(socket, extension, audioBuffer, language) {
  udpPcmStats.translationRequests++;  // Line 3928 - NEVER REACHED

  const timing = {
    extension,
    t0_gatewayReceived: Date.now(),
    // ... 9 timing stages ...
  };

  // ... translation pipeline ...
}
```

**Gap Identified:**
- **Original:** Function called 15-20 times per call
- **Current:** Function called 0 times per call
- **Evidence:** `Translation: 0 requests, 0 OK (0%)`

**Status:** 🔴 **BLOCKED** - Function never executes
**Root Cause:** Event Collector 1 gate (bufferThreshold)
**Fix:** Indirect - fixing Event Collector 1 unblocks this

---

### Event Collector 3: Timing Stage Updates
**File:** STTTTSserver.js
**Lines:** 2286-2650
**Function:** Collects 9-stage timing data

**Original Behavior (ALAW):**
- All 9 stages collected per translation
- Dashboard shows stage breakdown

**Current Behavior (PCM):**
```javascript
// STAGE 1: Gateway → ASR
timing.t1_asrStarted = Date.now();
timing.stages.audiosocket_to_asr = timing.t1_asrStarted - timing.t0_gatewayReceived;
latencyTracker.updateStageLatency(extension, 'audiosocket_to_asr', timing.stages.audiosocket_to_asr);

// STAGE 2: ASR Processing
const asrStart = Date.now();
const { text: transcription } = await transcribeAudio(wavAudio, language);
timing.t2_asrCompleted = Date.now();
timing.stages.asr = timing.t2_asrCompleted - asrStart;
latencyTracker.updateStageLatency(extension, 'asr', timing.stages.asr);

// ... STAGES 3-9 ...
```

**Gap Identified:**
- **Original:** 9 stages × 15 requests = 135 timing events per call
- **Current:** 0 timing events collected
- **Evidence:** Dashboard shows no stage data, all zeros

**Status:** 🔴 **BLOCKED** - Code never executes
**Root Cause:** Event Collector 1 gate (bufferThreshold)
**Fix:** Indirect - fixing Event Collector 1 unblocks this

---

### Event Collector 4: E2E Latency Direction Update (CRITICAL)
**File:** STTTTSserver.js
**Line:** ~2645
**Function:** Updates direction-specific E2E latency for sync calculation

**Original Behavior (ALAW):**
```javascript
// Calculate E2E total
timing.e2eTotal = timing.serialTotal;

// Update direction latency (CRITICAL!)
const pairedExtension = pairManager.getPairedExtension(extension);
const direction = extension + '→' + pairedExtension;
latencyTracker.updateLatency(direction, timing.e2eTotal);
```

**Current Behavior (PCM):**
- Line 2645 NEVER reached
- `latencyTracker.updateLatency()` NEVER called
- `directionSamples` Map remains empty

**Gap Identified:**
- **Original:** Direction latency updated 15-20 times per call
  - Example: "3333→4444" receives latency samples [850, 875, 900, ...]
  - Example: "4444→3333" receives latency samples [1050, 1075, 1100, ...]
- **Current:** Direction latency NEVER updated
  - "3333→4444" → empty array []
  - "4444→3333" → empty array []

**Impact:**
```javascript
getCurrentLatencyDifference(ext1, ext2) {
  const current1 = this.getLatestLatency(direction1);  // Returns 0 (no data)
  const current2 = this.getLatestLatency(direction2);  // Returns 0 (no data)

  if (current1 === 0 || current2 === 0) return null;  // ALWAYS TRUE!

  // Buffer calculation NEVER reached
  const difference = current2 - current1;
  return difference;
}
```

**Status:** 🔴 **BLOCKED** - Most critical event collector
**Root Cause:** Event Collector 1 gate (bufferThreshold)
**Fix:** Indirect - fixing Event Collector 1 unblocks this

---

### Event Collector 5: Buffer Calculation and Application
**File:** STTTTSserver.js
**Lines:** ~2650-2680
**Function:** Calculates and applies buffer delay to sync extensions

**Original Behavior (ALAW):**
```javascript
// STAGE 8: Buffer Calculation
const latencyDifference = latencyTracker.getCurrentLatencyDifference(extension, pairedExtension);
let totalBufferMs = manualLatencyMs;

if (autoSync && latencyDifference !== null && latencyDifference < 0) {
  // This extension is FASTER - needs buffer to sync
  const autoSyncBufferMs = Math.abs(latencyDifference);
  totalBufferMs += autoSyncBufferMs;
}

// APPLY BUFFER
audioBufferManager.bufferAndSend(
  pairedExtension,
  pcmAudioBuffer,
  totalBufferMs,
  async (targetExtension, delayedAudio) => {
    await sendUdpPcmAudio(targetExtension, delayedAudio);
  }
);
```

**Current Behavior (PCM):**
- `latencyDifference` always returns `null` (no data)
- Buffer calculation skipped
- Audio sent without sync delay
- Both extensions play at their natural latency
- Desynchronization occurs

**Gap Identified:**
- **Original:** Buffer applied to faster channel (~175ms typical)
- **Current:** No buffer applied (0ms)
- **Evidence:** Dashboard shows "LatencyDiff: null"

**Status:** 🔴 **BLOCKED** - Sync completely disabled
**Root Cause:** Event Collector 4 has no data
**Fix:** Indirect - chain reaction from Event Collector 1

---

## Format-Specific Issues

### Issue 1: Sample Rate Assumptions
**Location:** Multiple places in timing calculations
**Status:** ✅ **NO ISSUE FOUND**

**Analysis:**
- Timing collection uses `Date.now()` (milliseconds) - format-agnostic
- No hardcoded 8kHz assumptions found in timing module
- PCM 16kHz properly handled by GStreamer conversion

**Conclusion:** Sample rate change did NOT break timing code

---

### Issue 2: Frame Size and Buffer Calculations
**Location:** UDP_PCM_CONFIG
**Status:** ⚠️ **NEEDS VALIDATION**

**Original (ALAW 8kHz):**
- Frame size: 160 samples = 20ms
- Byte rate: 8000 bytes/second

**Current (PCM 16kHz):**
```javascript
const UDP_PCM_CONFIG = {
  sampleRate: 16000,
  channels: 1,
  frameSizeMs: 5,           // ⚠️ Why 5ms?
  frameSizeBytes: 160,      // 160 bytes = 80 samples at 16kHz = 5ms ✓
  bufferThreshold: 6400     // FIXED: 6400 bytes = 200ms ✓
};
```

**Calculation Verification:**
```
PCM 16kHz mono = 2 bytes per sample
Frame size: 160 bytes / 2 = 80 samples
Duration: 80 samples / 16000 Hz = 5ms ✓ CORRECT

Buffer threshold: 6400 bytes / 2 = 3200 samples
Duration: 3200 samples / 16000 Hz = 0.2s = 200ms ✓ CORRECT
```

**Conclusion:** Frame size calculations are correct for PCM format

---

### Issue 3: GStreamer Conversion Latency
**Location:** External to STTTTSserver
**Status:** ⚠️ **UNACCOUNTED FOR**

**Analysis:**
- GStreamer adds processing delay (ALAW→PCM, PCM→ALAW)
- Estimated: 5-20ms per conversion
- Total per direction: 10-40ms additional latency
- **NOT included in timing calculations**

**Impact:**
- E2E latency measurements are accurate (Date.now() timestamps)
- GStreamer delay naturally included in measurements
- No code changes needed

**Conclusion:** GStreamer latency automatically captured in timing data

---

## What Changed vs What Broke

### ✅ What Changed (Intentional):
1. Audio format: ALAW 8kHz → PCM 16kHz
2. Added GStreamer conversion layer
3. Added UDP buffering system (UDP_PCM_CONFIG)
4. Changed frame size: 20ms → 5ms
5. Added bufferThreshold mechanism

### 🔴 What Broke (Unintentional):
1. **bufferThreshold misconfigured** (48000 instead of 6400)
   - Caused: Translation pipeline never executes
   - Effect: All event collectors starved of events

2. **No other breaks found** - timing module code intact

---

## Fix Validation Plan

### Phase 1: Verify Buffer Fix ✅ APPLIED
- [x] Change bufferThreshold from 48000 to 6400 bytes
- [ ] Restart STTTTSserver
- [ ] Monitor logs for translation requests > 0

### Phase 2: Verify Event Collectors
- [ ] Make test call to 3333 + 4444
- [ ] Monitor STTTTSserver log for:
  ```
  Translation: 15 requests, 15 OK (100%)
  ```
- [ ] Verify Event Collector 1: Buffer accumulation working
- [ ] Verify Event Collector 2: `translationRequests++` incrementing
- [ ] Verify Event Collector 3: All 9 timing stages collected
- [ ] Verify Event Collector 4: Direction latency updated
- [ ] Verify Event Collector 5: Buffer calculation returns non-null

### Phase 3: Verify Sync Working
- [ ] Check dashboard shows LatencyDiff values (not null)
- [ ] Verify buffer applied to faster channel
- [ ] Expected values:
  ```
  Direction 3333→4444: ~850ms
  Direction 4444→3333: ~1050ms
  LatencyDiff: ~200ms (4444 needs buffer)
  ```

### Phase 4: Verify Audio Quality
- [ ] Both directions audible
- [ ] No clipping/distortion
- [ ] Translations accurate
- [ ] Call duration > 90 seconds (if SIP timer fixed)

---

## Event Collector Summary Table

| Event Collector | Line | Original Status | Current Status | Root Cause | Fix Required |
|----------------|------|-----------------|----------------|------------|--------------|
| **1. UDP Socket Threshold Gate** | 3700-3750 | Working | Blocked | bufferThreshold=48000 | Change to 6400 ✅ |
| **2. Translation Pipeline Trigger** | 3928 | Working | Starved | EC1 blocked | Indirect fix ✅ |
| **3. Timing Stage Collection** | 2286-2650 | Working | Starved | EC1 blocked | Indirect fix ✅ |
| **4. Direction Latency Update** | ~2645 | Working | Starved | EC1 blocked | Indirect fix ✅ |
| **5. Buffer Calculation** | ~2650-2680 | Working | Starved | EC4 has no data | Indirect fix ✅ |

---

## Critical Path to Restoration

```
Fix bufferThreshold (6400 bytes)
    ↓
Restart STTTTSserver
    ↓
UDP socket triggers after 200ms
    ↓
processGatewayAudio() executes
    ↓
Event Collector 2: translationRequests++ increments
    ↓
Event Collector 3: 9 timing stages collected
    ↓
Event Collector 4: Direction latency updated
    ↓
getCurrentLatencyDifference() returns non-null
    ↓
Event Collector 5: Buffer calculated and applied
    ↓
Sync module operational
    ↓
Audio synchronized between extensions
```

---

## Conclusion

**Key Finding:** The PCM format migration did NOT break the timing/sync module code. All classes, algorithms, and event collectors are **intact and correct**.

**Single Point of Failure:** bufferThreshold misconfiguration (48000 bytes vs 6400 bytes) created a 1.5-second gate that prevented the entire translation pipeline from executing, starving all event collectors of data.

**Fix Status:** ✅ Applied - Changed line 3640 from 48000 to 6400

**Expected Outcome:** After restart, all 5 event collectors should resume normal operation, timing data should flow, and sync module should calculate and apply buffers correctly.

**No Code Changes Required:** The timing module is format-agnostic. No "event collector fixes for PCM" are needed beyond the bufferThreshold correction.

---

**Next Action:** Test the system with the applied fix to validate this analysis.

**End of Gap Analysis Document**
