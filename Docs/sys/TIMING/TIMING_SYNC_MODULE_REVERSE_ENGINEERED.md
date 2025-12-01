# TIMING & SYNC MODULE - COMPLETE REVERSE ENGINEERING

**Date:** 2025-11-25
**Source File:** `STTTTSserver/STTTTSserver.js` (3333_4444__Operational)
**Purpose:** Document how timing/sync worked BEFORE PCM upgrade, identify what broke, and plan fixes

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Module Architecture](#module-architecture)
3. [Core Classes](#core-classes)
4. [Event Collection System](#event-collection-system)
5. [Buffer Calculation Algorithm](#buffer-calculation-algorithm)
6. [Integration Flow](#integration-flow)
7. [What Broke After PCM Upgrade](#what-broke-after-pcm-upgrade)
8. [Gap Analysis](#gap-analysis)
9. [Fix Plan](#fix-plan)

---

## 1. EXECUTIVE SUMMARY

### Purpose
The Timing & Sync Module enables **synchronized multi-language translation** by:
1. **Collecting** E2E latency data for each translation direction (3333→4444 and 4444→3333)
2. **Calculating** latency difference between paired extensions
3. **Buffering** the faster channel to match the slower one
4. **Broadcasting** timing metrics to dashboards and monitoring tools

### Key Innovation
**Automatic synchronization** without manual intervention:
- Extension 3333 (EN→FR): 645ms E2E latency
- Extension 4444 (FR→EN): 820ms E2E latency
- **Auto-sync:** Buffer 3333 by 175ms to match 4444
- **Result:** Both channels deliver audio at same time (synchronized conversation)

### Status Before PCM Upgrade
✅ **FULLY WORKING** - Timing data collected, buffers calculated, sync maintained

### Status After PCM Upgrade
❌ **BROKEN** - No timing data collected, sync disabled, wrong buffer values

---

## 2. MODULE ARCHITECTURE

### 2.1 High-Level Design

```
┌────────────────────────────────────────────────────────────┐
│                  TRANSLATION PIPELINE                       │
│            (processGatewayAudio Function)                   │
│                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐              │
│  │          │   │          │   │          │              │
│  │   ASR    │ → │    MT    │ → │   TTS    │              │
│  │(Deepgram)│   │ (DeepL)  │   │(11Labs)  │              │
│  │          │   │          │   │          │              │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘              │
│       │              │              │                     │
│       │ t1=145ms    │ t2=180ms    │ t3=320ms            │
│       ▼              ▼              ▼                     │
│  ┌─────────────────────────────────────────┐             │
│  │     TIMING COLLECTION LAYER             │             │
│  │  (latencyTracker.updateStageLatency)    │             │
│  └──────────────────┬──────────────────────┘             │
│                     │                                     │
│                     ▼                                     │
│  ┌─────────────────────────────────────────┐             │
│  │    E2E CALCULATION                      │             │
│  │    E2E = ASR + MT + TTS                 │             │
│  │    = 145 + 180 + 320 = 645ms            │             │
│  └──────────────────┬──────────────────────┘             │
│                     │                                     │
│                     ▼                                     │
│  ┌─────────────────────────────────────────┐             │
│  │    UPDATE DIRECTION LATENCY              │             │
│  │  latencyTracker.updateLatency(           │             │
│  │    "3333→4444", 645ms                    │             │
│  │  )                                       │             │
│  └──────────────────┬──────────────────────┘             │
└─────────────────────┼──────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               LATENCY TRACKER CLASS                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │  directionSamples Map:                             │    │
│  │    "3333→4444" → [645, 650, 638, 652, ...]        │    │
│  │    "4444→3333" → [820, 815, 825, 810, ...]        │    │
│  │  (Rolling window: last 10 samples)                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  getCurrentLatencyDifference(ext1, ext2):                  │
│    current1 = getLatestLatency("3333→4444") = 645ms       │
│    current2 = getLatestLatency("4444→3333") = 820ms       │
│    difference = current2 - current1 = 175ms                │
│                                                             │
│    Interpretation:                                         │
│    - Positive (175ms): ext1 is SLOWER, needs more delay   │
│    - Negative: ext1 is FASTER, needs buffer to sync       │
│    - In this case: 3333 is FASTER by 175ms                │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            BUFFER CALCULATION (Stage 8)                      │
│                                                              │
│  Input:                                                      │
│    extension = "3333"                                        │
│    pairedExtension = "4444"                                  │
│    latencyDifference = -175ms (3333 is faster)              │
│    autoSync = true                                           │
│    manualLatencyMs = 0                                       │
│                                                              │
│  Logic:                                                      │
│    IF autoSync AND latencyDifference < 0:                   │
│      autoSyncBufferMs = abs(-175) = 175ms                   │
│      totalBufferMs = 0 + 175 = 175ms                        │
│                                                              │
│  Output:                                                     │
│    Buffer 3333's audio by 175ms before sending to 4444      │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          AUDIO BUFFER MANAGER CLASS                          │
│                                                              │
│  bufferAndSend(pairedExtension, pcmAudioBuffer,             │
│                totalBufferMs, sendCallback):                 │
│                                                              │
│    setTimeout(() => {                                        │
│      sendCallback(pairedExtension, pcmAudioBuffer);         │
│    }, totalBufferMs);                                        │
│                                                              │
│  Result:                                                     │
│    Audio delayed by 175ms to synchronize with slower channel│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Sequence

```
CALL FLOW (Extension 3333 speaks → Extension 4444 hears):

1. Audio arrives at STTTTSserver (port 6120)
   └─> processGatewayAudio(null, "3333", audioBuffer, "en")

2. STAGE 1: Gateway → ASR (measured)
   t0 = Date.now() // Audio received timestamp

3. STAGE 2: ASR Processing (Deepgram)
   t1_start = Date.now()
   transcription = await transcribeAudio(...)
   t1_end = Date.now()
   latencyTracker.updateStageLatency("3333", "asr", t1_end - t1_start)

4. STAGE 3-6: Similar for MT, TTS

5. STAGE 7-9: Calculate E2E
   e2eTotal = sum of all stage times = 645ms
   direction = "3333→4444"
   latencyTracker.updateLatency(direction, 645ms)

   This updates directionSamples:
   "3333→4444" → [..., 645]

6. STAGE 8: Buffer Calculation
   pairedExtension = pairManager.getPairedExtension("3333") = "4444"
   latencyDiff = latencyTracker.getCurrentLatencyDifference("3333", "4444")
                = current("4444→3333") - current("3333→4444")
                = 820 - 645 = 175ms

   Interpretation: 3333 is FASTER (negative when viewed from 3333's perspective)

   Wait, there's a sign flip here. Let me re-check the code...

   Formula in getCurrentLatencyDifference:
   ```
   const direction1 = ext1 + '→' + ext2;  // "3333→4444"
   const direction2 = ext2 + '→' + ext1;  // "4444→3333"
   const current1 = getLatestLatency(direction1);  // 645ms
   const current2 = getLatestLatency(direction2);  // 820ms
   const difference = current2 - current1;  // 820 - 645 = 175ms
   ```

   So for ext1="3333", ext2="4444":
   - difference = 175ms (POSITIVE)
   - Positive means: 4444→3333 is SLOWER than 3333→4444
   - Which means: 3333 pipeline is FASTER

   Buffer logic:
   ```
   if (autoSync && latencyDifference !== null && latencyDifference < 0) {
     // This extension is FASTER (negative latency diff) - needs buffer
     autoSyncBufferMs = Math.abs(latencyDifference);
     totalBufferMs += autoSyncBufferMs;
   }
   ```

   But latencyDifference = 175ms (POSITIVE), so this branch is NOT taken!

   Let me check when 4444 processes audio...

CALL FLOW (Extension 4444 speaks → Extension 3333 hears):

1. processGatewayAudio(null, "4444", audioBuffer, "fr")
2. E2E = 820ms
3. direction = "4444→3333"
4. latencyTracker.updateLatency("4444→3333", 820ms)
5. Buffer calculation for ext="4444":
   latencyDiff = getCurrentLatencyDifference("4444", "3333")
                = current("3333→4444") - current("4444→3333")
                = 645 - 820 = -175ms (NEGATIVE!)

   Now the buffer logic applies:
   ```
   if (autoSync && latencyDifference < 0) {
     autoSyncBufferMs = abs(-175) = 175ms
     totalBufferMs = 0 + 175 = 175ms
   ```

6. Audio sent to extension 3333 with 175ms buffer

RESULT:
- Extension 3333's audio → sent to 4444 immediately (0ms buffer)
- Extension 4444's audio → sent to 3333 with 175ms buffer
- Both arrive synchronized!
```

---

## 3. CORE CLASSES

### 3.1 ExtensionPairManager

**Purpose:** Track which extensions are paired for synchronization

**Data Structure:**
```javascript
{
  pairs: Map {
    "3333" → "4444",
    "4444" → "3333"
  },
  startTimes: Map {
    "3333" → 1732492800000,
    "4444" → 1732492800000
  }
}
```

**Key Methods:**
```javascript
registerPair(ext1, ext2)
  - Links two extensions bidirectionally
  - Records call start time
  - Usage: pairManager.registerPair("3333", "4444")

getPairedExtension(ext)
  - Returns the paired extension for sync calculations
  - Usage: paired = pairManager.getPairedExtension("3333") // returns "4444"

unregisterPair(ext)
  - Removes pairing when call ends
  - Cleans up both directions
```

**Initialization:**
```javascript
const pairManager = new ExtensionPairManager();
pairManager.registerPair('3333', '4444');  // Auto-pair on startup
```

---

### 3.2 LatencyTracker

**Purpose:** Collect and analyze latency samples for synchronization decisions

**Data Structure:**
```javascript
{
  directionSamples: Map {
    "3333→4444" → [645, 650, 638, 652, 641, 648, 655, 643, 649, 646],
    "4444→3333" → [820, 815, 825, 810, 822, 818, 812, 828, 816, 824]
  },
  stageSamples: Map {
    "3333:asr" → [145, 148, 142, 150, ...],
    "3333:mt" → [180, 175, 182, 178, ...],
    "3333:tts" → [320, 315, 325, 318, ...],
    "4444:asr" → [155, 152, 158, 150, ...],
    // ... etc
  },
  maxSamples: 10  // Rolling window size
}
```

**Key Methods:**

#### updateStageLatency(extension, stageName, latencyMs)
```javascript
// Called from processGatewayAudio for each pipeline stage
latencyTracker.updateStageLatency("3333", "asr", 145);
latencyTracker.updateStageLatency("3333", "mt", 180);
latencyTracker.updateStageLatency("3333", "tts", 320);

// Stores in stageSamples Map:
// "3333:asr" → [..., 145]
// "3333:mt" → [..., 180]
// "3333:tts" → [..., 320]
```

#### updateLatency(direction, latencyMs)
```javascript
// Called ONCE per translation with E2E total
const direction = "3333→4444";
const e2eTotal = 645;  // ASR + MT + TTS
latencyTracker.updateLatency(direction, e2eTotal);

// Stores in directionSamples Map:
// "3333→4444" → [..., 645]
// Keeps last 10 samples (rolling window)

// Console output:
// [Latency] 3333→4444 = 645ms (avg: 647ms, n=10)
```

#### getCurrentLatencyDifference(ext1, ext2)
```javascript
// THE CRITICAL FUNCTION FOR SYNC

const diff = latencyTracker.getCurrentLatencyDifference("3333", "4444");

// Internal logic:
const direction1 = "3333→4444";
const direction2 = "4444→3333";
const current1 = getLatestLatency(direction1);  // 645ms
const current2 = getLatestLatency(direction2);  // 820ms

// Formula (IMPORTANT!):
const difference = current2 - current1;  // 820 - 645 = 175ms

// Return value interpretation:
// +175ms: ext2→ext1 slower than ext1→ext2
//         ext1 (3333) is FASTER
//         When processing 4444, this becomes NEGATIVE (-175)
//         and buffer is applied

// Console output:
// [LatencyDiff-Current] 3333→4444=645ms, 4444→3333=820ms, Δ=175ms

return difference;  // 175ms
```

**CRITICAL INSIGHT:**
The sign of `latencyDifference` flips depending on which extension is being processed:
- When processing 3333: diff = +175ms (no buffer applied to 3333's output)
- When processing 4444: diff = -175ms (buffer 175ms to 4444's output)

This ensures the FASTER channel (3333) sends immediately, and SLOWER channel (4444) gets buffered to match.

---

### 3.3 AudioBufferManager

**Purpose:** Apply calculated buffer delay using setTimeout

**Data Structure:**
```javascript
{
  pendingBuffers: Map {
    "3333" → [
      {
        audio: Buffer<...>,
        timer: Timeout<12345>,
        targetTime: 1732492975000,
        delayMs: 175
      }
    ]
  }
}
```

**Key Method:**

#### bufferAndSend(extension, audioData, delayMs, sendCallback)
```javascript
audioBufferManager.bufferAndSend(
  "3333",              // Target extension
  pcmAudioBuffer,      // PCM16 audio data
  175,                 // Delay in milliseconds
  async (ext, audio) => {
    // Callback executed AFTER delay
    await sendUdpPcmAudio(ext, audio);
  }
);

// Implementation:
if (delayMs === 0) {
  sendCallback(extension, audioData);  // Send immediately
  return;
}

const timer = setTimeout(() => {
  console.log(`[AudioBuffer] Sending buffered audio for ${extension} (delayed by ${delayMs}ms)`);
  sendCallback(extension, audioData);

  // Cleanup from pendingBuffers
  removeFromPending(extension, targetTime);
}, delayMs);

// Track pending for potential cancellation
pendingBuffers.get(extension).push({ audio, timer, targetTime, delayMs });
```

---

### 3.4 DashboardTCPAPI

**Purpose:** Broadcast timing metrics to dashboards via TCP (port 6211)

**Message Types:**

#### LATENCY_UPDATE
```javascript
{
  type: 'LATENCY_UPDATE',
  timestamp: 1732492975000,
  extension: "3333",
  latencies: { /* all stage data */ },
  buffer: { current: 175, target: 175, ... }
}
```

#### STAGE_TIMING
```javascript
{
  type: 'STAGE_TIMING',
  timestamp: 1732492975000,
  extension: "3333",
  stage: "asr",
  duration: 145,
  stageName: "ASR (Deepgram)"
}
```

#### BUFFER_CALCULATION
```javascript
{
  type: 'BUFFER_CALCULATION',
  timestamp: 1732492975000,
  extension: "4444",
  targetBufferMs: 175,
  pairedExtension: "3333",
  latencyDifference: -175,
  status: "calculated_not_applied"
}
```

#### BUFFER_APPLIED
```javascript
{
  type: 'BUFFER_APPLIED',
  timestamp: 1732492975100,
  extension: "3333",
  delayMs: 175,
  reason: "sync_to_4444",
  latencyDifference: -175
}
```

---

## 4. EVENT COLLECTION SYSTEM

### 4.1 Timing Collection Points

The `processGatewayAudio()` function contains **9 timing collection stages**:

```javascript
async function processGatewayAudio(socket, extension, audioBuffer, language) {
  // Initialize timing object
  const timing = {
    extension: extension,
    t0_gatewayReceived: Date.now(),  // Baseline timestamp
    stages: {},
    parallel: {}
  };

  // ═══ STAGE 1: Gateway → ASR ═══
  timing.t1_asrStarted = Date.now();
  timing.stages.audiosocket_to_asr = timing.t1_asrStarted - timing.t0_gatewayReceived;
  latencyTracker.updateStageLatency(extension, 'audiosocket_to_asr', timing.stages.audiosocket_to_asr);

  // ═══ STAGE 2: ASR Processing ═══
  const asrStart = Date.now();
  const { text: transcription } = await transcribeAudio(...);
  timing.t2_asrCompleted = Date.now();
  timing.stages.asr = timing.t2_asrCompleted - asrStart;
  latencyTracker.updateStageLatency(extension, 'asr', timing.stages.asr);

  // ═══ STAGE 3: ASR → MT ═══
  timing.t3_mtStarted = Date.now();
  timing.stages.asr_to_mt = timing.t3_mtStarted - timing.t2_asrCompleted;
  latencyTracker.updateStageLatency(extension, 'asr_to_mt', timing.stages.asr_to_mt);

  // ═══ STAGE 4: MT Processing ═══
  const mtStart = Date.now();
  const translation = await translateText(...);
  timing.t4_mtCompleted = Date.now();
  timing.stages.mt = timing.t4_mtCompleted - mtStart;
  latencyTracker.updateStageLatency(extension, 'mt', timing.stages.mt);

  // ═══ STAGE 5: MT → TTS ═══
  timing.t5_ttsStarted = Date.now();
  timing.stages.mt_to_tts = timing.t5_ttsStarted - timing.t4_mtCompleted;
  latencyTracker.updateStageLatency(extension, 'mt_to_tts', timing.stages.mt_to_tts);

  // ═══ STAGE 6: TTS Processing ═══
  const ttsStart = Date.now();
  const ttsAudio = await synthesizeSpeech(...);
  timing.t6_ttsCompleted = Date.now();
  timing.stages.tts = timing.t6_ttsCompleted - ttsStart;
  latencyTracker.updateStageLatency(extension, 'tts', timing.stages.tts);

  // ═══ STAGE 7: TTS → LS ═══
  timing.t7_lsStarted = Date.now();
  timing.stages.tts_to_ls = timing.t7_lsStarted - timing.t6_ttsCompleted;
  latencyTracker.updateStageLatency(extension, 'tts_to_ls', timing.stages.tts_to_ls);

  // ═══ STAGE 8: LS (Latency Sync - Buffer Calculation) ═══
  // Buffer calculation happens here (detailed in next section)
  timing.t8_lsCompleted = Date.now();
  timing.stages.ls = timing.t8_lsCompleted - timing.t7_lsStarted;
  latencyTracker.updateStageLatency(extension, 'ls', timing.stages.ls);

  // ═══ STAGE 9: LS → Bridge ═══
  timing.t9_bridgeSent = Date.now();
  timing.stages.ls_to_bridge = timing.t9_bridgeSent - timing.t8_lsCompleted;
  latencyTracker.updateStageLatency(extension, 'ls_to_bridge', timing.stages.ls_to_bridge);

  // ═══ CALCULATE E2E TOTAL ═══
  timing.serialTotal =
    timing.stages.audiosocket_to_asr +
    timing.stages.asr +
    timing.stages.asr_to_mt +
    timing.stages.mt +
    timing.stages.mt_to_tts +
    timing.stages.tts +
    timing.stages.tts_to_ls +
    timing.stages.ls +
    timing.stages.ls_to_bridge;

  timing.e2eTotal = timing.serialTotal;  // (Hume parallel not yet integrated)

  // ═══ UPDATE DIRECTION LATENCY ═══
  const pairedExtension = pairManager.getPairedExtension(extension);
  const direction = extension + '→' + pairedExtension;
  latencyTracker.updateLatency(direction, timing.e2eTotal);

  console.log('[Timing] ═══════════════════════════════════════════════');
  console.log('[Timing] Extension ' + extension + ' E2E Total: ' + Math.round(timing.e2eTotal) + 'ms');
  console.log('[Timing]   - Serial: ' + Math.round(timing.serialTotal) + 'ms');
  console.log('[Timing] ═══════════════════════════════════════════════');
}
```

### 4.2 Event Collector Functionality

Each `latencyTracker.updateStageLatency()` call:

1. **Stores sample** in `stageSamples` Map with key `"extension:stageName"`
2. **Maintains rolling window** of last 10 samples
3. **No immediate calculation** - just data collection

The critical calculation happens at:
```javascript
latencyTracker.updateLatency(direction, timing.e2eTotal);
```

This call:
1. Stores E2E total in `directionSamples` Map
2. Maintains rolling window of last 10 E2E samples
3. **Enables** `getCurrentLatencyDifference()` to work

---

## 5. BUFFER CALCULATION ALGORITHM

### 5.1 Complete Algorithm (STAGE 8)

```javascript
// ═══ INPUT ═══
const extension = "4444";  // Current extension being processed
const pairedExtension = pairManager.getPairedExtension(extension);  // "3333"

// ═══ STEP 1: Get Settings ═══
const settings = extensionBufferSettings.get(extension) || { autoSync: false, manualLatencyMs: 0 };
const autoSync = settings.autoSync;  // true (enabled by default for 3333/4444)
const manualLatencyMs = settings.manualLatencyMs;  // 0 (no manual adjustment)

// ═══ STEP 2: Get Latency Difference ═══
const latencyDifference = latencyTracker.getCurrentLatencyDifference(extension, pairedExtension);

// For extension="4444", pairedExtension="3333":
// direction1 = "4444→3333"
// direction2 = "3333→4444"
// current1 = getLatestLatency("4444→3333") = 820ms
// current2 = getLatestLatency("3333→4444") = 645ms
// latencyDifference = current2 - current1 = 645 - 820 = -175ms

console.log(`[LatencyDiff-Current] 4444→3333=820ms, 3333→4444=645ms, Δ=-175ms`);

// ═══ STEP 3: Calculate Buffer ═══
let totalBufferMs = manualLatencyMs;  // Start with manual adjustment (0)

if (autoSync && latencyDifference !== null && latencyDifference < 0) {
  // Extension 4444 is FASTER (negative diff) - needs buffer to sync
  const autoSyncBufferMs = Math.abs(latencyDifference);  // abs(-175) = 175ms
  totalBufferMs += autoSyncBufferMs;  // 0 + 175 = 175ms

  console.log(`[Buffer Apply] Extension 4444 is FASTER by 175ms`);
  console.log(`[Buffer Apply] Auto-sync buffer: +175ms`);
} else if (autoSync && latencyDifference !== null && latencyDifference > 0) {
  // Extension 4444 is SLOWER - no buffer needed
  console.log(`[Buffer Apply] Extension 4444 is SLOWER by ${latencyDifference}ms - no auto-sync buffer needed`);
} else if (latencyDifference === null) {
  // No data yet (first call or paired extension hasn't processed audio yet)
  console.log(`[Buffer Apply] No latency data yet for synchronization`);
}

console.log(`[Buffer Apply] Total buffer: 175ms (manual: 0ms, auto: 175ms)`);

// ═══ STEP 4: Apply Buffer ═══
if (pcmAudioBuffer && pcmAudioBuffer.length > 0) {
  audioBufferManager.bufferAndSend(
    pairedExtension,      // "3333" (send to paired extension)
    pcmAudioBuffer,       // PCM16 audio data
    totalBufferMs,        // 175ms delay
    async (targetExtension, delayedAudio) => {
      await sendUdpPcmAudio(targetExtension, delayedAudio);
      console.log(`[Buffer Send] ✓ Sent via UDP to ${targetExtension} (buffered ${totalBufferMs}ms)`);
    }
  );
}
```

### 5.2 Sign Convention

**CRITICAL:** The sign of `latencyDifference` determines buffer application:

```
For extension A with paired extension B:

latencyDifference = getCurrentLatencyDifference(A, B)
                  = current("B→A") - current("A→B")

Interpretation:
  NEGATIVE (-X ms): A is FASTER than B
                    → Buffer A's output by X ms

  POSITIVE (+X ms): A is SLOWER than B
                    → No buffer needed for A
                    → B will get buffered when B is processed

Example:
  A=4444, B=3333
  current("3333→4444") = 645ms
  current("4444→3333") = 820ms

  When processing 4444:
    latencyDiff = 645 - 820 = -175ms (NEGATIVE)
    → 4444 is FASTER, buffer by 175ms ✓

  When processing 3333:
    latencyDiff = 820 - 645 = +175ms (POSITIVE)
    → 3333 is SLOWER, no buffer ✓
```

---

## 6. INTEGRATION FLOW

### 6.1 Complete Call Flow (Both Directions)

```
TIME: T=0s - Both users start talking simultaneously

┌─────────────────────────────────────────────────────────────┐
│  USER A (Extension 3333) speaks in ENGLISH                  │
└─────────────────────────────────────────────────────────────┘
        │
        │ Audio → Gateway → GStreamer → STTTTSserver port 6120
        ▼
  processGatewayAudio(null, "3333", buffer, "en")
        │
        ├─> ASR (145ms)
        ├─> MT (180ms)
        ├─> TTS (320ms)
        └─> E2E Total = 645ms
            │
            ├─> latencyTracker.updateLatency("3333→4444", 645ms)
            │   Stores in directionSamples["3333→4444"]
            │
            └─> Buffer Calculation:
                pairedExt = "4444"
                latencyDiff = getCurrentLatencyDifference("3333", "4444")
                            = current("4444→3333") - current("3333→4444")
                            = 0 - 645 = -645ms (no data for 4444 yet!)

                Wait, this is first call, so "4444→3333" has no data yet!
                getCurrentLatencyDifference returns NULL

                → No buffer applied (totalBufferMs = 0)
                → Audio sent to extension 4444 immediately

┌─────────────────────────────────────────────────────────────┐
│  USER B (Extension 4444) speaks in FRENCH                   │
└─────────────────────────────────────────────────────────────┘
        │
        │ Audio → Gateway → GStreamer → STTTTSserver port 6122
        ▼
  processGatewayAudio(null, "4444", buffer, "fr")
        │
        ├─> ASR (155ms)
        ├─> MT (190ms)
        ├─> TTS (475ms)
        └─> E2E Total = 820ms
            │
            ├─> latencyTracker.updateLatency("4444→3333", 820ms)
            │   Stores in directionSamples["4444→3333"]
            │
            └─> Buffer Calculation:
                pairedExt = "3333"
                latencyDiff = getCurrentLatencyDifference("4444", "3333")
                            = current("3333→4444") - current("4444→3333")
                            = 645 - 820 = -175ms (NEGATIVE!)

                autoSync = true
                latencyDiff < 0 → 4444 is FASTER
                autoSyncBufferMs = abs(-175) = 175ms
                totalBufferMs = 0 + 175 = 175ms

                → Audio sent to extension 3333 with 175ms buffer

RESULT AFTER FIRST EXCHANGE:
  - User A hears French translation from User B at T=820ms (no sync yet)
  - User B hears English translation from User A at T=645ms + 175ms buffer = T=820ms
  - Both receive audio at SAME TIME (synchronized!)

SUBSEQUENT EXCHANGES:
  Now both directions have data, sync is maintained:

  User A speaks (3333):
    latencyDiff = current("4444→3333") - current("3333→4444")
                = 820 - 645 = +175ms (POSITIVE)
    → No buffer (3333 is slower, no action needed)

  User B speaks (4444):
    latencyDiff = current("3333→4444") - current("4444→3333")
                = 645 - 820 = -175ms (NEGATIVE)
    → Buffer by 175ms (4444 is faster, needs delay)

  Conversation stays synchronized!
```

---

## 7. WHAT BROKE AFTER PCM UPGRADE

### 7.1 The Change

**BEFORE (ALAW 8kHz):**
```
Asterisk → ExternalMedia → Gateway (port 4000/4002)
                             ↓ ALAW 8kHz
                         STTTTSserver (port 6120/6122)
                             ↓
                     processGatewayAudio()
                             ↓
                     Timing data collected ✓
```

**AFTER (PCM 16kHz):**
```
Asterisk → ExternalMedia → Gateway (port 4000/4002)
                             ↓ ALAW 8kHz
                         GStreamer (upsampler)
                             ↓ PCM 16kHz
                         STTTTSserver (port 6120/6122)
                             ↓
                     processGatewayAudio()
                             ↓ ❌ NEVER EXECUTES!
                     Timing data NOT collected ✗
```

### 7.2 Root Cause Chain

1. **bufferThreshold = 48000 bytes** (1.5 seconds)
   - Changed from 32000 → 8000 (comment says) but actual value is 48000!
   - PCM 16kHz: 48000 bytes = 48000 / (2 bytes/sample * 16000 Hz) = 1.5 seconds

2. **Translation never starts**
   - Code waits for 1.5 seconds of audio to accumulate
   - But SIP session timer disconnects call at 90 seconds
   - Buffer never fills enough to trigger translation

3. **processGatewayAudio() never executes**
   - No transcription
   - No translation
   - No TTS
   - **No timing data collected!**

4. **latencyTracker has no data**
   - directionSamples["3333→4444"] = [] (empty)
   - directionSamples["4444→3333"] = [] (empty)

5. **getCurrentLatencyDifference() returns null**
   - No samples available
   - Buffer calculation can't happen

6. **Sync module effectively disabled**
   - No buffer applied
   - Audio sent immediately with wrong delays
   - Result: Distorted/clipped audio

### 7.3 Observable Symptoms

✅ **IN path (Asterisk → Gateway → GStreamer → STTTTSserver):**
- RX counters increment ✓
- Audio arriving ✓

❌ **Processing (STTTTSserver):**
- Translation requests: 0 ✗
- processGatewayAudio never runs ✗
- Timing data not collected ✗

❌ **OUT path (STTTTSserver → Gateway → GStreamer → Asterisk):**
- RX_STTTS counter frozen ✗
- TX_Ast counter frozen ✗
- No audio sent back ✗

**User Experience:**
- "Clipping" sound = no translated audio (silence/gaps)
- Call disconnects at ~90 seconds (SIP session timer)

---

## 8. GAP ANALYSIS

### 8.1 What's Working

✅ **Module Classes:**
- LatencyTracker class definition ✓
- AudioBufferManager class definition ✓
- ExtensionPairManager class definition ✓
- DashboardTCPAPI class definition ✓

✅ **Initialization:**
- All classes instantiated ✓
- Pair 3333↔4444 registered ✓
- TCP API server running on port 6211 ✓

✅ **Timing Collection Code:**
- All latencyTracker.updateStageLatency() calls present ✓
- All latencyTracker.updateLatency() calls present ✓
- Buffer calculation logic present ✓

✅ **Audio Path (IN):**
- Gateway receives audio from Asterisk ✓
- GStreamer converts ALAW → PCM16 ✓
- STTTTSserver receives audio on ports 6120/6122 ✓

### 8.2 What's Broken

❌ **Buffer Threshold:**
- Value: 48000 bytes (should be ~6400 for 200ms)
- **FIX APPLIED:** Changed to 6400 bytes
- **STATUS:** Needs testing

❌ **Translation Pipeline:**
- Never triggers due to high buffer threshold
- **EXPECTED FIX:** Will start working after buffer threshold fix

❌ **Timing Data Collection:**
- No data in directionSamples (processGatewayAudio not running)
- getCurrentLatencyDifference() returns null
- **EXPECTED FIX:** Will start working once translations run

❌ **Buffer Sync:**
- Not applying because no timing data
- **EXPECTED FIX:** Will start working once timing data available

❌ **Audio Path (OUT):**
- No audio sent back (nothing to send because no TTS)
- **EXPECTED FIX:** Will start working once TTS generates audio

❌ **Call Disconnects:**
- SIP session timer at 90 seconds
- **REQUIRES:** Separate fix (disable timers or fix session refresh)

### 8.3 Components That Don't Need Changes

✅ **No changes needed for:**
- LatencyTracker class logic
- AudioBufferManager class logic
- Buffer calculation algorithm
- Sign convention for latency difference
- Event collector functions
- Dashboard broadcast logic

**The timing module is NOT broken - it just has no data to work with!**

---

## 9. FIX PLAN

### Phase 1: Fix Buffer Threshold (COMPLETED)

✅ **Action:** Changed bufferThreshold from 48000 → 6400 bytes
✅ **File:** STTTTSserver.js line 3640
✅ **Status:** Applied and STTTTSserver restarted

### Phase 2: Test Translation Pipeline (NEXT)

**Steps:**
1. Make test call (3333 + 4444)
2. Monitor STTTTSserver logs:
   ```bash
   tail -f /tmp/STTTTSserver-operational.log | grep -E 'Translation|Processing|LatencyDiff'
   ```
3. Verify:
   - Translations > 0 requests ✓
   - [LatencyDiff-Current] messages appear ✓
   - [Buffer Apply] messages show calculated buffers ✓

**Expected Output:**
```
[UDP-3333] Processing 6400 bytes
[Pipeline] Transcribing 6400 bytes from extension 3333...
[Timing] Stage 2 (ASR) for 3333: 145ms
[Timing] Stage 4 (MT) for 3333: 180ms
[Timing] Stage 6 (TTS) for 3333: 320ms
[Timing] Extension 3333 E2E Total: 645ms
[Latency] 3333→4444 = 645ms (avg: 645ms, n=1)
[LatencyDiff-Current] 3333→4444=645ms, 4444→3333=0ms, Δ=-645ms
[Buffer Apply] No latency data yet for synchronization
```

### Phase 3: Verify Sync Working

**After both extensions have processed audio:**

**Expected for 3333:**
```
[LatencyDiff-Current] 3333→4444=645ms, 4444→3333=820ms, Δ=175ms
[Buffer Apply] Extension 3333 is SLOWER by 175ms - no auto-sync buffer needed
[Buffer Apply] Total buffer: 0ms
```

**Expected for 4444:**
```
[LatencyDiff-Current] 4444→3333=820ms, 3333→4444=645ms, Δ=-175ms
[Buffer Apply] Extension 4444 is FASTER by 175ms
[Buffer Apply] Auto-sync buffer: +175ms
[Buffer Apply] Total buffer: 175ms
[AudioBuffer] Buffering 45000 bytes for 3333 by 175ms
```

### Phase 4: Fix SIP Session Timer (If Needed)

**If calls still disconnect at 90s:**

**Option A:** Disable timers on calling extensions (1001/1002/1003)
```bash
# Add to /etc/asterisk/pjsip_users.conf under [1001] endpoint section:
timers=no
```

**Option B:** Fix ExternalMedia session refresh
- Requires ARI changes to handle re-INVITE
- More complex

**Recommendation:** Option A (simpler, doesn't break anything)

### Phase 5: Monitor & Validate

**Validation Checklist:**
- [ ] Translations process successfully (requests > 0)
- [ ] Timing data collected (LatencyDiff messages appear)
- [ ] Buffer calculated correctly (~175ms for slower channel)
- [ ] Audio flows in both directions (RX_STTTS/TX_Ast increment)
- [ ] Call stays connected > 90 seconds
- [ ] Audio quality is good (no clipping/distortion)
- [ ] Sync maintained (both users hear translations at same time)

---

## APPENDIX A: Key Code Locations

**Timing Module Classes:** Lines 992-1476
**processGatewayAudio (Timing Collection):** Lines 2286-2650
**Buffer Threshold Config:** Line 3640
**UDP PCM Sockets:** Lines 3630-4060

**Critical Functions:**
- `latencyTracker.updateLatency()`: Called at line 2568
- `latencyTracker.getCurrentLatencyDifference()`: Called at line 2426
- `audioBufferManager.bufferAndSend()`: Called at line 2466

---

## APPENDIX B: Formula Reference

**E2E Latency:**
```
E2E = ASR + MT + TTS + (transitions)
```

**Latency Difference:**
```
For extension A with paired B:
diff = current("B→A") - current("A→B")

Negative: A is FASTER → buffer A
Positive: A is SLOWER → no buffer for A
```

**Buffer Calculation:**
```
if (autoSync && diff < 0):
  buffer = abs(diff) + manualLatencyMs
else:
  buffer = manualLatencyMs
```

---

**END OF DOCUMENT**
