# Dynamic Conference Sync System - REVISED Implementation Plan
## API-Driven Latency Approach

**Document Version:** 2.0
**Date:** October 25, 2025
**Status:** Ready to Implement
**Supersedes:** Metadata_Tracking_Latency_Management.md (Stage 1 only)

---

## 📋 What Changed

### Original Plan Issues
- **Stage 1 (Metadata Tracking)**: Broke pipeline due to performance overhead
  - 50fps frame tracking created 6.35ms/sec overhead
  - Blocked critical ASR initialization path
  - Added complexity without benefit

### Key Discovery
**The backend ALREADY has all latency data from API responses!**

```javascript
// Backend currently emits (audiosocket-integration.js:356):
io.emit('pipelineComplete', {
    totalTime,           // ← End-to-end latency
    translationTime,     // ← DeepL MT latency
    ttsTime,             // ← ElevenLabs TTS latency
    convertTime,         // ← Downsampling time
    sendTime             // ← Asterisk send time
});

// ASR worker already tracks (asr-streaming-worker.js:277):
transcript.latency   // ← Deepgram ASR latency
```

**Dashboard shows SIMULATED data instead of using real data!**

### New Approach

**SKIP**: Stage 1 (Frame Metadata) - too complex, broke pipeline
**USE**: API timing data (already exists)
**ENHANCE**: Aggregate and structure the data
**KEEP**: Stages 2-4 (latency management, bridges, monitoring)

---

## 🎯 Revised Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   EXISTING PIPELINE                          │
│              (NO MODIFICATIONS NEEDED)                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Asterisk → ASR (Deepgram) → MT (DeepL) → TTS (ElevenLabs) │
│              ↓ latency         ↓ time        ↓ time         │
│          [Already measured] [Already measured] [Already...]  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                             ↓
                    Emit 'pipelineComplete'
                             ↓
                ┌──────────────────────┐
                │  LatencyCollector    │
                │  - Aggregate data    │
                │  - Calculate stats   │
                │  - Hierarchical view │
                └──────────────────────┘
                             ↓
                    ┌────────────────┐
                    │   Socket.IO    │
                    │  latency-*     │
                    └────────────────┘
                             ↓
              ┌──────────────────────────┐
              │    Dashboard             │
              │  - Real-time charts      │
              │  - Latency breakdown     │
              │  - Historical stats      │
              └──────────────────────────┘
```

---

## 📊 Implementation Stages (REVISED)

### **Stage 1: Connect Existing Data** ⚡ (REVISED)
**Duration:** 30 minutes
**Risk:** MINIMAL
**Goal:** Show real latency data on dashboard

#### What Already Exists

**Backend sends:**
- ✅ `pipelineComplete` event with timing data
- ✅ Deepgram latency in transcript events
- ✅ DeepL, ElevenLabs, conversion times
- ✅ All calculations already done

**Dashboard has:**
- ✅ Latency cards with charts
- ✅ Breakdown bars (ASR/MT/TTS)
- ✅ All UI components

**Gap:**
- ❌ Dashboard shows simulated data (`updateSimulatedMetrics()`)
- ❌ No handler for `pipelineComplete` event
- ❌ No aggregation of historical data

#### Implementation

##### 1.1 Add Dashboard Handler (SIMPLE)
**File:** `/home/azureuser/translation-app/public/dashboard.html`
**Location:** Around line 1710 (after other socket.on handlers)

```javascript
// Store latest latencies for aggregation
let latestASRLatency = 0;
let latestMTLatency = 0;
let latestTTSLatency = 0;

// Listen for ASR transcript with latency
socket.on('transcriptionFinal', (data) => {
    // ... existing code ...

    // NEW: Store ASR latency
    if (data.latency) {
        latestASRLatency = data.latency;
    }
});

// NEW: Listen for pipeline complete with real latency data
socket.on('pipelineComplete', (data) => {
    const { totalTime, translationTime, ttsTime, convertTime, sendTime } = data;

    // Store latest latencies
    latestMTLatency = translationTime || 0;
    latestTTSLatency = ttsTime || 0;

    // Update E2E latency display
    document.getElementById('e2eLatency').textContent = Math.round(totalTime) + 'ms';
    updateLatencyClass(document.getElementById('e2eLatency'), totalTime, 900);

    // Update breakdown bars
    const totalDisplay = totalTime + convertTime + sendTime;
    updateLatencyBars(latestASRLatency, translationTime, ttsTime, 0, totalDisplay);

    // Update charts with REAL data (not simulated)
    const now = new Date().toLocaleTimeString();
    updateChart(charts.deepgram, now, latestASRLatency);
    updateChart(charts.deepl, now, translationTime);
    updateChart(charts.elevenlabs, now, ttsTime);
    updateE2EChart(now, totalDisplay);

    console.log('[Dashboard] Real latency:', {
        asr: latestASRLatency,
        mt: translationTime,
        tts: ttsTime,
        total: totalDisplay
    });
});
```

##### 1.2 Remove Simulated Data (CLEANUP)
**File:** Same file
**Location:** Around line 1805

```javascript
// REMOVE or comment out:
// function updateSimulatedMetrics() { ... }
// setInterval(updateSimulatedMetrics, 2000);

// REPLACE with: (data updates driven by real events now)
console.log('[Dashboard] Using real-time latency data from backend');
```

#### Stage 1 Deliverables (REVISED)
- ✅ Dashboard shows REAL latency data
- ✅ Charts update with actual API response times
- ✅ Breakdown shows ASR/MT/TTS accurately
- ✅ Zero pipeline modifications
- ✅ Zero performance impact

**Testing:**
1. Call extension 7000
2. Speak: "Hello, how are you?"
3. Watch dashboard update with REAL latency numbers
4. Verify charts show actual times (not random simulation)

---

### **Stage 2: Latency Aggregation** 📊
**Duration:** 1-2 hours
**Risk:** LOW
**Goal:** Historical stats, percentiles, hierarchical view

#### Implementation

##### 2.1 Add LatencyCollector (ALREADY CREATED!)
**File:** `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/latency-collector.js`
**Status:** ✅ Complete (340 lines)
**Location:** Copy to Azure server

```bash
scp latency-collector.js azureuser@4.185.84.26:/home/azureuser/translation-app/
```

##### 2.2 Integrate LatencyCollector (5 LINES)
**File:** `/home/azureuser/translation-app/audiosocket-integration.js`

```javascript
// Line 1-2: Import at top
const LatencyCollector = require('./latency-collector');
const latencyCollector = new LatencyCollector();

// Line 3: Record ASR latency (add to existing handler around line 150)
asrWorker.on('final', async (transcript) => {
    console.log('[Pipeline] Final:', transcript.text);

    // Record ASR latency (1 line)
    latencyCollector.recordASRLatency(activeConnectionId, transcript);

    // ... existing code ...
});

// Lines 4-6: Record pipeline latencies (add after pipelineComplete emission around line 370)
io.emit('pipelineComplete', {
    original: originalText,
    translation: translationResult.text,
    totalTime,
    translationTime,
    ttsTime,
    convertTime,
    sendTime,
    audioSize: pcm8Buffer.length,
    audioDuration: (pcm8Buffer.length / 2 / 8000).toFixed(2)
});

// Record in LatencyCollector (3 lines)
latencyCollector.recordTranslationLatency(activeConnectionId, translationTime);
latencyCollector.recordTTSLatency(activeConnectionId, ttsTime);
latencyCollector.recordEndToEndLatency(activeConnectionId, totalTime, {
    translationTime, ttsTime, convertTime, sendTime
});
```

**File:** `/home/azureuser/translation-app/audiosocket-integration.js` (bottom)
```javascript
// Export latencyCollector
module.exports = {
    getIO,
    setIO,
    getLatencyCollector: () => latencyCollector  // NEW
};
```

##### 2.3 Register with Socket.IO
**File:** `/home/azureuser/translation-app/conference-server.js`
**Location:** After `io` initialization

```javascript
// Get latencyCollector and register
const { getLatencyCollector } = require('./audiosocket-integration');
const collector = getLatencyCollector();
if (collector) {
    collector.registerSocketHandlers(io);
    console.log('[Server] ✓ LatencyCollector registered');
}
```

#### Stage 2 Deliverables
- ✅ Aggregated latency statistics (avg, min, max, p50, p95, p99)
- ✅ Per-channel tracking
- ✅ Hierarchical view (Provider → Channel → Conference)
- ✅ Socket.IO events: `latency-hierarchical-view`, `latency-update`
- ✅ Historical trending (last 100 measurements per provider)

**Testing:**
1. Make 3-5 test calls
2. Open browser console: `socket.emit('get-latency-stats', {type: 'global'})`
3. Verify response shows aggregated stats
4. Check `latency-hierarchical-view` events broadcasting every 2 seconds

---

### **Stage 3: Per-Call Latency Management** ⏱️
**Duration:** 2-3 hours
**Risk:** MEDIUM
**Goal:** Dynamic reference latency calculation per conference

#### From Original Plan

Use **PerCallLatencyManager** (from original Stage 2) BUT feed it with API data instead of frame metadata:

```javascript
// Initialize for each call
const callLatencyMgr = new PerCallLatencyManager(callId);

// On pipelineComplete event
callLatencyMgr.recordChannelLatency(
    channelId,        // e.g., "conn_123_en→he"
    totalTime         // from API response
);

// Get dynamic reference latency (slowest channel)
const refLatency = callLatencyMgr.getRefLatency();

// Get hold time for specific channel
const holdTime = callLatencyMgr.getHoldTime(channelId);
```

**Key Difference from Original:**
- Original: Feed from frame metadata (complex, broke pipeline)
- Revised: Feed from API response times (simple, already exists)

#### Implementation

##### 3.1 Create PerCallLatencyManager
**File:** `/home/azureuser/translation-app/per-call-latency-manager.js` (new)
**Source:** From Metadata_Tracking_Latency_Management.md lines 254-500

**Modifications:**
- Remove frame metadata dependencies
- Accept simple latency values instead of metadata objects
- Calculate reference latency from API response times

##### 3.2 Integrate with Pipeline
**File:** `/home/azureuser/translation-app/audiosocket-integration.js`

```javascript
const PerCallLatencyManager = require('./per-call-latency-manager');
let callLatencyMgr = null;

// On connection start
audioSocketOrchestrator.on('connection', (info) => {
    callLatencyMgr = new PerCallLatencyManager(info.connectionId);
    callLatencyMgr.start();
});

// On pipelineComplete
callLatencyMgr.recordChannelLatency(activeConnectionId, totalTime);
const refLatency = callLatencyMgr.getRefLatency();

// Emit for monitoring
io.emit('reference-latency-update', {
    callId: activeConnectionId,
    refLatency,
    channels: callLatencyMgr.getAllChannels()
});
```

#### Stage 3 Deliverables
- ✅ Per-call latency tracking
- ✅ Dynamic reference latency calculation
- ✅ Hold time computation per channel
- ✅ Real-time updates via Socket.IO

---

### **Stage 4: Dynamic Bridge Management** 🌉
**Duration:** 4-6 hours
**Risk:** HIGH
**Goal:** Multi-language conference with synchronized playback

**Keep original Stage 3-4 from Metadata_Tracking_Latency_Management.md:**
- DynamicBridgeManager
- ConferenceOrchestrator
- SyncBuffer (per-bridge)

**But feed them with:**
- API response times (not frame metadata)
- PerCallLatencyManager ref latency
- LatencyCollector stats for optimization

---

## 🎬 Implementation Order

### Phase 1: Quick Wins (30 min, SAFE)
1. ✅ Connect dashboard to `pipelineComplete` (Stage 1.1)
2. ✅ Remove simulated data (Stage 1.2)
3. ✅ Test with real call
4. **Result**: Dashboard shows real latency immediately

### Phase 2: Aggregation (1-2 hours, LOW RISK)
1. ✅ Copy latency-collector.js to server
2. ✅ Add 5 integration lines
3. ✅ Register with Socket.IO
4. ✅ Test aggregated stats
5. **Result**: Historical stats, percentiles, hierarchical view

### Phase 3: Per-Call Management (2-3 hours, MEDIUM RISK)
1. Create PerCallLatencyManager (simplified from original)
2. Integrate with pipeline
3. Test reference latency calculation
4. **Result**: Dynamic hold times per channel

### Phase 4: Dynamic Bridges (4-6 hours, HIGH RISK)
1. Implement DynamicBridgeManager
2. Implement ConferenceOrchestrator
3. Implement SyncBuffer
4. **Result**: Multi-language synchronized conferences

---

## 📈 Comparison: Original vs Revised

| Aspect | Original Plan | Revised Plan |
|--------|--------------|--------------|
| **Stage 1 Complexity** | Frame metadata tracking (100+ lines) | Connect existing events (20 lines) |
| **Stage 1 Risk** | HIGH (broke pipeline) | MINIMAL (passive observation) |
| **Stage 1 Duration** | 2-3 hours | 30 minutes |
| **Data Source** | Frame correlation map | API response times |
| **Performance Impact** | 6.35ms/sec overhead | Zero (data already exists) |
| **Pipeline Modifications** | Extensive | Minimal (5 lines) |
| **Rollback Complexity** | git checkout | Delete 5 lines |
| **Data Accuracy** | Theoretical (never worked) | Actual API times |
| **Stage 2-4** | Use metadata | Use API data |

---

## ✅ Current Status

- ✅ **Created**: latency-collector.js (340 lines)
- ✅ **Created**: latency-collector-integration.js (guide)
- ✅ **Created**: API_Driven_Latency_Monitoring.md (architecture)
- ✅ **Created**: Frame_Metadata_Failure_Analysis.md (why metadata failed)
- ✅ **Created**: Checkpoint system (rollback safety)
- ⏸️ **Pending**: Copy files to Azure
- ⏸️ **Pending**: Add dashboard handler (Phase 1)
- ⏸️ **Pending**: Integrate LatencyCollector (Phase 2)

---

## 🚀 Ready to Start?

**Recommended:** Start with Phase 1 (30 minutes)
- Low risk
- Immediate visible results
- Proves the approach works
- Can rollback in seconds if needed

Would you like to proceed with Phase 1?

---

## 📚 Related Documents

- `Frame_Metadata_Failure_Analysis.md` - Why original Stage 1 failed
- `API_Driven_Latency_Monitoring.md` - New approach architecture
- `Metadata_Tracking_Latency_Management.md` - Original plan (Stage 1 superseded)
- `latency-collector.js` - Aggregation implementation
- `latency-collector-integration.js` - Integration guide
