# 📋 LATENCY & SYNCHRONIZATION MANAGER - COMPREHENSIVE ARCHITECTURE DOCUMENT

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Third-Party API Research Findings](#third-party-api-research-findings)
3. [System Architecture](#system-architecture)
4. [Data Models](#data-models)
5. [Synchronization Algorithm](#synchronization-algorithm)
6. [Implementation Details](#implementation-details)
7. [Integration Points](#integration-points)
8. [Deployment & Operations](#deployment--operations)

---

## 1. EXECUTIVE SUMMARY

### **Purpose**
Build a dedicated **Latency & Synchronization Manager** service that:
- Collects timing data from all 3rd-party APIs (Deepgram, DeepL, ElevenLabs, Hume)
- Calculates accurate per-channel latency metrics
- Synchronizes multiple translation channels in real-time via dynamic buffering
- Distributes metrics to dashboards, monitoring, and other consumers

### **Business Value**
- **Enables production-ready multi-language conferences** by keeping all participants synchronized
- **Foundation for dynamic buffer management** - different languages have different translation lengths
- **Full observability** of system performance and bottlenecks
- **Quality assurance** - quantifiable latency targets and SLAs

### **Key Innovation**
Uses **native API timing data where available** (Deepgram, ElevenLabs) and **client-side measurement** where not (DeepL, Hume) to create a unified timing system without building custom tracking infrastructure.

---

## 2. THIRD-PARTY API RESEARCH FINDINGS

### **2.1 Deepgram (Speech-to-Text)**

#### **API Capabilities: ✅ EXCELLENT**

**Built-in Timing Fields:**
```json
{
  "channel": {
    "alternatives": [{
      "transcript": "Hello world",
      "confidence": 0.99,
      "words": [
        {
          "word": "Hello",
          "start": 0.5,        // Seconds from stream start
          "end": 0.8,
          "confidence": 0.99
        }
      ]
    }]
  },
  "is_final": true,
  "speech_final": true,
  "start": 0.5,              // Segment start time
  "duration": 1.3,           // Segment duration
  "metadata": {
    "request_id": "...",
    "model_info": {...}
  }
}
```

**Latency Measurement Formula:**
```
Latency = Audio Cursor (X) - Transcript Cursor (Y)

Where:
  X = Total seconds of audio submitted to Deepgram
  Y = start + duration from latest transcript response
```

**Metadata Events:**
- `LiveTranscriptionEvents.Metadata` - Contains request_id, model info
- `LiveTranscriptionEvents.UtteranceEnd` - Natural speech boundaries
- `LiveTranscriptionEvents.SpeechStarted` - Voice activity detection

**Current Implementation Status:**
✅ **Already implemented in `asr-streaming-worker.js`:**
```javascript
// Lines ~395-410
let latency = null;
if (data.start !== undefined && data.duration !== undefined) {
    const segmentId = `${data.start}`;
    if (this.segmentTimestamps.has(segmentId)) {
        const sendTime = this.segmentTimestamps.get(segmentId);
        latency = Date.now() - sendTime;  // Real latency
        this.updateAverageLatency(latency);
    }
}
```

**Recommendation:** ✅ **Use existing implementation** - already provides accurate round-trip latency

---

### **2.2 DeepL (Machine Translation)**

#### **API Capabilities: ⚠️ LIMITED**

**Response Structure:**
```json
{
  "translations": [{
    "detected_source_language": "EN",
    "text": "Hallo, Welt!"
  }],
  "billed_characters": 12  // Optional
}
```

**Timing Fields:**
- ❌ **No built-in latency metadata**
- ❌ **No processing time fields**
- ❌ **No request duration**

**Available Features:**
- Latency-optimized model: `model_type: "latency_optimized"` (50% quality tradeoff for speed)
- Timeout configuration: Default 10 seconds
- Persistent HTTP connections recommended

**Current Implementation Status:**
✅ **Client-side timing in `audiosocket-integration.js`:**
```javascript
// Lines ~450-470
const mtStartTime = Date.now();
const translationResult = await translate(
    text,
    getSourceLang(),
    getTargetLang()
);
const translationTime = Date.now() - mtStartTime;

io.emit('translationComplete', {
    extension: session.extension,
    time: translationTime,  // Already tracked
    // ...
});
```

**Recommendation:** ✅ **Continue using client-side measurement** - simple and accurate

---

### **2.3 ElevenLabs (Text-to-Speech)**

#### **API Capabilities: ✅ EXCELLENT**

**Streaming with Timing Metadata:**
```json
{
  "audio_base64": "...",  // Encoded audio data
  "alignment": {
    "characters": ["H", "e", "l", "l", "o"],
    "character_start_times_seconds": [0.0, 0.05, 0.10, 0.15, 0.20],
    "character_end_times_seconds": [0.05, 0.10, 0.15, 0.20, 0.25]
  },
  "normalized_alignment": {
    "characters": ["H", "e", "l", "l", "o"],
    "character_start_times_seconds": [0.0, 0.05, 0.10, 0.15, 0.20],
    "character_end_times_seconds": [0.05, 0.10, 0.15, 0.20, 0.25]
  }
}
```

**Response Headers:**
```
x-region: us-west-2         // Regional routing info
content-length: 45678
duration: 3.5               // Total audio duration (seconds)
sample-rate: 44100
```

**Latency Optimization Levels:**
```javascript
{
  latency: 0,  // Default (no optimization)
  latency: 1,  // ~50% latency improvement
  latency: 2,  // ~75% latency improvement
  latency: 3,  // Max latency optimization
  latency: 4   // Max + text normalizer off (best latency, may mispronounce)
}
```

**Performance Characteristics:**
- **TTFB (Time to First Byte):** ~50-200ms depending on region
- **Streaming:** Incremental audio chunks via HTTP chunked transfer encoding
- **Character-level timing:** Enables subtitle/karaoke-style synchronization

**Current Implementation Status:**
⚠️ **TTS pipeline not currently executing** (as discovered in previous session)

**Recommendation:**
1. ✅ **Use character-level timing** for precise audio synchronization
2. ✅ **Track TTFB and total duration** from response headers
3. 🔧 **Fix TTS pipeline** to enable full E2E latency tracking

---

### **2.4 Hume AI (Emotion Detection)**

#### **API Capabilities: ⚠️ MODERATE**

**Response Structure:**
```json
{
  "language": {
    "predictions": [{
      "text": "Mary",
      "position": {
        "begin": 0,
        "end": 4
      },
      "emotions": [
        { "name": "Joy", "score": 0.87 },
        { "name": "Anger", "score": 0.012 }
      ]
    }]
  }
}
```

**EVI (Empathic Voice Interface) Message Types:**
1. `user_message` - Transcript + vocal expression measures
2. `assistant_message` - EVI response content
3. `audio_output` - Response audio
4. `assistant_prosody` - Prosody scores (async, separate message)
5. `assistant_end` - End-of-response marker

**Performance Characteristics:**
- **TTFT (Time to First Token):** 140ms - 1.3s
- **EVI 3 voice response:** <300ms on modern hardware
- **TTS first audio:** ~200ms typical

**Timing Fields:**
- ❌ **No explicit latency metadata in responses**
- ✅ **Position metadata** (begin/end character indices)
- ⚠️ **Prosody sent async** (separate message for lower latency)

**Current Implementation Status:**
⚠️ **Parallel processing** - runs alongside main pipeline, doesn't block

**Recommendation:** ✅ **Client-side measurement** - track request → response time

---

## 3. SYSTEM ARCHITECTURE

### **3.1 High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                    ASTERISK CONFBRIDGE                          │
│                (Multi-Channel Conference Bridge)                 │
└────────────┬────────────────────────────────────┬───────────────┘
             │                                    │
             │ Audio (AudioSocket)                │ Audio
             │                                    │
             ▼                                    ▼
    ┌────────────────┐                  ┌────────────────┐
    │  Extension     │                  │  Extension     │
    │     7000       │                  │     7001       │
    │  (Caller)      │                  │  (Answerer)    │
    └────────┬───────┘                  └────────┬───────┘
             │                                    │
             └────────────────┬───────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  TRANSLATION PIPELINE         │
              │  (audiosocket-integration.js) │
              │                               │
              │  Deepgram → DeepL → ElevenLabs│
              │       ↓       ↓         ↓      │
              │    [Timing Events Flow]        │
              └───────────────┬───────────────┘
                              │
                              ▼
          ┌────────────────────────────────────────┐
          │   LATENCY & SYNC MANAGER SERVICE       │
          │   (latency-sync-manager.js)            │
          │                                        │
          │  ┌──────────────────────────────────┐ │
          │  │  1. TIMING COLLECTION LAYER      │ │
          │  │     - Listen to all events       │ │
          │  │     - Record timestamps          │ │
          │  │     - Calculate latencies        │ │
          │  └──────────────────────────────────┘ │
          │                                        │
          │  ┌──────────────────────────────────┐ │
          │  │  2. CALCULATION ENGINE           │ │
          │  │     - Per-stage latencies        │ │
          │  │     - E2E latency                │ │
          │  │     - Rolling averages           │ │
          │  │     - Trend analysis             │ │
          │  └──────────────────────────────────┘ │
          │                                        │
          │  ┌──────────────────────────────────┐ │
          │  │  3. SYNCHRONIZATION CONTROLLER   │ │
          │  │     - Compare channel latencies  │ │
          │  │     - Calculate buffer deltas    │ │
          │  │     - Send ARI commands          │ │
          │  └──────────────────────────────────┘ │
          │                                        │
          │  ┌──────────────────────────────────┐ │
          │  │  4. DISTRIBUTION LAYER           │ │
          │  │     - Socket.IO events           │ │
          │  │     - REST API                   │ │
          │  │     - WebSocket stream           │ │
          │  └──────────────────────────────────┘ │
          └────────┬──────────────┬──────────┬────┘
                   │              │          │
                   ▼              ▼          ▼
          ┌────────────┐  ┌──────────┐  ┌─────────┐
          │ Dashboard  │  │ ARI      │  │ Metrics │
          │ (Socket.IO)│  │ Client   │  │ Export  │
          └────────────┘  └──────────┘  └─────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ ASTERISK ARI     │
                    │ (Buffer Control) │
                    └──────────────────┘
```

### **3.2 Data Flow**

```
1. AUDIO ARRIVES
   Asterisk → AudioSocket → Extension 7000/7001

2. TIMING STARTS
   Translation Pipeline records: audioReceived timestamp

3. ASR (DEEPGRAM)
   Send audio → Receive transcript
   ✅ Deepgram provides: start, duration
   ✅ Our code calculates: Date.now() - sendTime
   → Emit: transcriptionFinal { latency: 145 }

4. MT (DEEPL)
   Send text → Receive translation
   ⚠️ DeepL no timing metadata
   ✅ Our code tracks: Date.now() - mtStartTime
   → Emit: translationComplete { time: 180 }

5. TTS (ELEVENLABS)
   Send text → Receive audio
   ✅ ElevenLabs provides: character_start_times, duration header
   ✅ Our code tracks: Date.now() - ttsStartTime
   → Emit: ttsComplete { latency: 320, alignment: {...} }

6. EMOTION (HUME)
   Send audio → Receive emotions (parallel)
   ⚠️ Hume no timing metadata
   ✅ Our code tracks: Date.now() - humeStartTime
   → Emit: humeComplete { latency: 85 }

7. LATENCY MANAGER
   Receives all events → Calculates E2E → Compares channels

8. SYNCHRONIZATION
   Channel 7000: E2E=645ms → Buffer=175ms
   Channel 7001: E2E=820ms → Buffer=100ms
   → Send ARI commands to adjust buffers

9. DISTRIBUTION
   → Dashboard: Real-time latency updates
   → Monitoring: Metrics export
   → Logs: Full timing waterfall
```

---

## 4. DATA MODELS

### **4.1 Channel State Object**

```javascript
{
  // Identity
  extension: "7000",
  uuid: "abc-123",
  callId: "1698765432",

  // Real-time Latencies (ms)
  latencies: {
    asr: {
      current: 145,           // Latest measurement
      avg: 152,               // Rolling average (last 20 samples)
      min: 120,               // Minimum in history
      max: 180,               // Maximum in history
      p50: 148,               // Median
      p95: 175,               // 95th percentile
      p99: 178,               // 99th percentile
      trend: "stable",        // stable | increasing | decreasing
      history: [145, 150...], // Last 20 samples
      lastUpdate: 1698765432145
    },
    mt: { /* same structure */ },
    tts: { /* same structure */ },
    hume: { /* same structure */ },
    e2e: { /* same structure */ }
  },

  // Buffer Management
  buffer: {
    current: 700,             // Current buffer size (ms)
    target: 650,              // Calculated target for sync
    adjustment: -50,          // Delta to apply
    lastUpdate: 1698765432200,
    adjustmentCount: 12,      // Times adjusted
    reason: "sync_to_7001"    // Why adjusted
  },

  // Timing Waterfall
  timestamps: {
    audioReceived: 1698765432100,
    asrStarted: 1698765432100,
    asrCompleted: 1698765432245,      // +145ms
    mtStarted: 1698765432245,
    mtCompleted: 1698765432425,        // +180ms
    ttsStarted: 1698765432425,
    ttsCompleted: 1698765432745,       // +320ms
    humeStarted: 1698765432100,        // Parallel
    humeCompleted: 1698765432185,      // +85ms
    audioSent: 1698765432800           // +55ms send time
  },

  // Statistics
  stats: {
    utteranceCount: 47,
    totalAudioProcessed: 47000,        // ms
    avgUtteranceLatency: 637,
    syncAdjustments: 12,
    errors: {
      asr: 0,
      mt: 2,
      tts: 1,
      hume: 0
    }
  },

  // Quality Metrics
  quality: {
    asrConfidence: 0.94,               // Average confidence
    translationQuality: "high",
    audioQuality: "good"
  }
}
```

### **4.2 Sync State Object**

```javascript
{
  activeChannels: ["7000", "7001"],
  maxLatency: 820,                     // Slowest channel
  minLatency: 645,                     // Fastest channel
  delta: 175,                          // Difference to compensate
  syncStrategy: "buffer_fast_channel", // Current strategy
  lastSyncTime: 1698765432800,
  syncCount: 156                       // Total sync operations
}
```

---

## 5. SYNCHRONIZATION ALGORITHM

### **5.1 Core Algorithm**

```javascript
function synchronizeChannels() {
  // 1. Get all active channels with E2E latency data
  const activeChannels = Array.from(channels.values())
    .filter(ch => ch.latencies.e2e.current > 0);

  if (activeChannels.length < 2) {
    console.log('[Sync] Need at least 2 channels for synchronization');
    return;
  }

  // 2. Find slowest channel (highest E2E latency)
  const maxLatency = Math.max(
    ...activeChannels.map(ch => ch.latencies.e2e.current)
  );

  const slowestChannel = activeChannels.find(
    ch => ch.latencies.e2e.current === maxLatency
  );

  console.log('[Sync] Slowest channel:', slowestChannel.extension,
              'with', maxLatency, 'ms latency');

  // 3. Calculate buffer for each channel
  activeChannels.forEach(channel => {
    const channelLatency = channel.latencies.e2e.current;

    // How much to buffer this channel
    const bufferNeeded = maxLatency - channelLatency;

    // Add base buffer for jitter protection
    const BASE_BUFFER = 100; // ms
    const SAFETY_MARGIN = 50; // ms extra headroom

    const targetBuffer = bufferNeeded + BASE_BUFFER + SAFETY_MARGIN;

    // Calculate adjustment delta
    const adjustment = targetBuffer - channel.buffer.current;

    // Update channel state
    channel.buffer.target = targetBuffer;
    channel.buffer.adjustment = adjustment;
    channel.buffer.reason = `sync_to_${slowestChannel.extension}`;

    console.log(`[Sync] Channel ${channel.extension}:
      Latency: ${channelLatency}ms
      Buffer needed: ${bufferNeeded}ms
      Target buffer: ${targetBuffer}ms
      Adjustment: ${adjustment}ms`);

    // Apply if significant change
    const THRESHOLD = 20; // Only adjust if >20ms difference
    if (Math.abs(adjustment) > THRESHOLD) {
      applyBufferAdjustment(channel);
    } else {
      console.log(`[Sync] Channel ${channel.extension}:
                   Buffer already optimal (within ${THRESHOLD}ms)`);
    }
  });

  // 4. Update sync state
  syncState.lastSyncTime = Date.now();
  syncState.syncCount++;
  syncState.maxLatency = maxLatency;
  syncState.activeChannels = activeChannels.map(ch => ch.extension);
}
```

### **5.2 Buffer Adjustment Strategies**

```javascript
// Strategy 1: Buffer Fast Channels (RECOMMENDED)
// Add delay to faster channels to match slowest
bufferFastChannel = maxLatency - currentLatency + BASE_BUFFER

// Strategy 2: Speed Up Slow Channels (if possible)
// Use latency_optimized models for slower channels
if (channel.latencies.e2e.avg > TARGET_LATENCY) {
  enableLatencyOptimizations(channel);
}

// Strategy 3: Hybrid
// Slight buffer on fast + slight optimization on slow
const SPLIT_RATIO = 0.7;
fastChannelBuffer = delta * SPLIT_RATIO;
slowChannelOptimization = delta * (1 - SPLIT_RATIO);

// Strategy 4: Adaptive
// Adjust based on trend
if (channel.latencies.e2e.trend === 'increasing') {
  buffer += EXTRA_HEADROOM; // Add more buffer if getting worse
}
```

### **5.3 Example Calculation**

```
INPUT:
  Channel 7000 (EN→ES): E2E = 645ms
  Channel 7001 (ES→EN): E2E = 820ms

CALCULATION:
  Max latency = 820ms (7001 is slowest)

  Channel 7000 buffer:
    Needed = 820 - 645 = 175ms
    Base = 100ms
    Safety = 50ms
    Target = 175 + 100 + 50 = 325ms

  Channel 7001 buffer:
    Needed = 820 - 820 = 0ms
    Base = 100ms
    Safety = 50ms
    Target = 0 + 100 + 50 = 150ms

OUTPUT:
  Channel 7000: Buffer 325ms → Total delay = 645 + 325 = 970ms
  Channel 7001: Buffer 150ms → Total delay = 820 + 150 = 970ms

  ✅ Both channels synchronized at ~970ms
```

---

## 6. IMPLEMENTATION DETAILS

### **6.1 Core Service Class**

```javascript
// latency-sync-manager.js

const EventEmitter = require('events');

class LatencySyncManager extends EventEmitter {
  constructor(io, ariClient) {
    super();
    this.io = io;                    // Socket.IO server
    this.ariClient = ariClient;      // Asterisk ARI client
    this.channels = new Map();       // Channel state
    this.syncState = {               // Sync state
      activeChannels: [],
      maxLatency: 0,
      minLatency: 0,
      delta: 0,
      lastSyncTime: null,
      syncCount: 0
    };
    this.syncInterval = null;
    this.config = {
      syncIntervalMs: 500,           // Run sync every 500ms
      adjustmentThreshold: 20,       // Only adjust if >20ms diff
      baseBuffer: 100,               // Base jitter buffer
      safetyMargin: 50,              // Extra headroom
      historySize: 20                // Keep last 20 samples
    };
  }

  // === LIFECYCLE ===

  start() {
    console.log('[Sync] Starting Latency & Sync Manager');
    this.startSyncLoop();
    console.log('[Sync] Manager started successfully');
  }

  stop() {
    console.log('[Sync] Stopping Latency & Sync Manager');
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log('[Sync] Manager stopped');
  }

  // === TIMING COLLECTION ===

  onASRComplete(data) {
    const { extension, latency } = data;
    console.log(`[Timing] ASR complete for ${extension}: ${latency}ms`);
    this.recordLatency(extension, 'asr', latency);
  }

  onMTComplete(data) {
    const { extension, time } = data;
    console.log(`[Timing] MT complete for ${extension}: ${time}ms`);
    this.recordLatency(extension, 'mt', time);
  }

  onTTSComplete(data) {
    const { extension, latency } = data;
    console.log(`[Timing] TTS complete for ${extension}: ${latency}ms`);
    this.recordLatency(extension, 'tts', latency);
  }

  onHumeComplete(data) {
    const { extension, latency } = data;
    console.log(`[Timing] Hume complete for ${extension}: ${latency}ms`);
    this.recordLatency(extension, 'hume', latency);
  }

  // === LATENCY CALCULATION ===

  recordLatency(extension, stage, latency) {
    const channel = this.getOrCreateChannel(extension);
    const stageData = channel.latencies[stage];

    // Update current
    stageData.current = latency;
    stageData.lastUpdate = Date.now();

    // Add to history
    stageData.history.push(latency);
    if (stageData.history.length > this.config.historySize) {
      stageData.history.shift();
    }

    // Calculate statistics
    this.calculateStatistics(stageData);

    // Calculate trend
    stageData.trend = this.calculateTrend(stageData.history);

    // Recalculate E2E if all stages have data
    if (stage !== 'e2e') {
      this.calculateE2ELatency(channel);
    }

    // Emit update
    this.emitChannelUpdate(channel);
  }

  calculateStatistics(stageData) {
    const { history } = stageData;

    // Average
    stageData.avg = Math.round(
      history.reduce((a, b) => a + b, 0) / history.length
    );

    // Min/Max
    stageData.min = Math.min(...history);
    stageData.max = Math.max(...history);

    // Percentiles
    const sorted = [...history].sort((a, b) => a - b);
    stageData.p50 = sorted[Math.floor(sorted.length * 0.5)];
    stageData.p95 = sorted[Math.floor(sorted.length * 0.95)];
    stageData.p99 = sorted[Math.floor(sorted.length * 0.99)];
  }

  calculateE2ELatency(channel) {
    const { asr, mt, tts } = channel.latencies;

    // E2E = ASR + MT + TTS (Hume is parallel, doesn't add to E2E)
    const e2e = (asr.current || 0) + (mt.current || 0) + (tts.current || 0);

    if (e2e > 0) {
      this.recordLatency(channel.extension, 'e2e', e2e);
    }
  }

  calculateTrend(history) {
    if (history.length < 10) return 'stable';

    const recent = history.slice(-5);
    const older = history.slice(-10, -5);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  // === SYNCHRONIZATION ===

  startSyncLoop() {
    console.log(`[Sync] Starting sync loop (${this.config.syncIntervalMs}ms interval)`);

    this.syncInterval = setInterval(() => {
      this.synchronizeChannels();
    }, this.config.syncIntervalMs);
  }

  synchronizeChannels() {
    const activeChannels = Array.from(this.channels.values())
      .filter(ch => ch.latencies.e2e.current > 0);

    if (activeChannels.length < 2) {
      return; // Need at least 2 channels
    }

    // Find max latency
    const maxLatency = Math.max(
      ...activeChannels.map(ch => ch.latencies.e2e.current)
    );

    const slowestChannel = activeChannels.find(
      ch => ch.latencies.e2e.current === maxLatency
    );

    // Calculate buffers
    activeChannels.forEach(channel => {
      const channelLatency = channel.latencies.e2e.current;
      const bufferNeeded = maxLatency - channelLatency;
      const targetBuffer = bufferNeeded +
                          this.config.baseBuffer +
                          this.config.safetyMargin;

      channel.buffer.target = targetBuffer;
      channel.buffer.adjustment = targetBuffer - channel.buffer.current;
      channel.buffer.reason = `sync_to_${slowestChannel.extension}`;

      if (Math.abs(channel.buffer.adjustment) > this.config.adjustmentThreshold) {
        this.applyBufferAdjustment(channel);
      }
    });

    // Update sync state
    this.syncState.maxLatency = maxLatency;
    this.syncState.activeChannels = activeChannels.map(ch => ch.extension);
    this.syncState.lastSyncTime = Date.now();
    this.syncState.syncCount++;
  }

  async applyBufferAdjustment(channel) {
    const { extension, buffer, uuid } = channel;

    console.log(`[ConfBridge] Adjusting buffer for ${extension} to ${buffer.target}ms`);

    try {
      // ARI command to set jitter buffer
      if (this.ariClient && uuid) {
        await this.ariClient.channels.setChannelVar({
          channelId: uuid,
          variable: 'JITTERBUFFER',
          value: `${buffer.target},${buffer.target},120`
        });

        console.log(`[ConfBridge] ✅ Buffer adjusted for ${extension}`);
      }

      // Update state
      channel.buffer.current = buffer.target;
      channel.buffer.lastUpdate = Date.now();
      channel.buffer.adjustmentCount = (channel.buffer.adjustmentCount || 0) + 1;
      channel.stats.syncAdjustments++;

      // Emit event
      this.emitChannelUpdate(channel);

    } catch (error) {
      console.error(`[ConfBridge] ❌ Failed to adjust buffer for ${extension}:`, error.message);
    }
  }

  // === DISTRIBUTION ===

  emitChannelUpdate(channel) {
    // To dashboard via Socket.IO
    this.io.emit('latencyUpdate', {
      extension: channel.extension,
      latencies: channel.latencies,
      buffer: channel.buffer,
      stats: channel.stats,
      timestamps: channel.timestamps
    });

    // Emit generic event
    this.emit('channelUpdate', channel);
  }

  // === HELPERS ===

  getOrCreateChannel(extension) {
    if (!this.channels.has(extension)) {
      this.channels.set(extension, {
        extension,
        uuid: null,
        latencies: {
          asr: this.createLatencyObject(),
          mt: this.createLatencyObject(),
          tts: this.createLatencyObject(),
          hume: this.createLatencyObject(),
          e2e: this.createLatencyObject()
        },
        buffer: {
          current: this.config.baseBuffer,
          target: this.config.baseBuffer,
          adjustment: 0,
          lastUpdate: null,
          adjustmentCount: 0,
          reason: 'initial'
        },
        timestamps: {},
        stats: {
          utteranceCount: 0,
          totalAudioProcessed: 0,
          avgUtteranceLatency: 0,
          syncAdjustments: 0,
          errors: { asr: 0, mt: 0, tts: 0, hume: 0 }
        }
      });
    }
    return this.channels.get(extension);
  }

  createLatencyObject() {
    return {
      current: 0,
      avg: 0,
      min: 0,
      max: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      trend: 'stable',
      history: [],
      lastUpdate: null
    };
  }

  // === API ===

  setupAPI(app) {
    // Get specific channel
    app.get('/api/latency/:extension', (req, res) => {
      const channel = this.channels.get(req.params.extension);
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }
      res.json(channel);
    });

    // Get all channels
    app.get('/api/latency', (req, res) => {
      const allChannels = Array.from(this.channels.values());
      res.json({
        channels: allChannels,
        syncState: this.syncState
      });
    });

    // Get sync state
    app.get('/api/sync-state', (req, res) => {
      res.json(this.syncState);
    });
  }

  // === WEBSOCKET ===

  setupWebSocket(server) {
    const WebSocket = require('ws');
    const wss = new WebSocket.Server({ server, path: '/ws/latency' });

    wss.on('connection', (ws) => {
      console.log('[WS] Client connected to latency stream');

      // Send current state
      ws.send(JSON.stringify({
        type: 'snapshot',
        channels: Array.from(this.channels.values()),
        syncState: this.syncState
      }));

      // Subscribe to updates
      const handler = (channel) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'update',
            channel
          }));
        }
      };

      this.on('channelUpdate', handler);

      ws.on('close', () => {
        console.log('[WS] Client disconnected from latency stream');
        this.off('channelUpdate', handler);
      });
    });

    console.log('[WS] WebSocket server ready at /ws/latency');
  }
}

module.exports = LatencySyncManager;
```

---

## 7. INTEGRATION POINTS

### **7.1 Integration with Existing System**

```javascript
// In audiosocket-integration.js or server.js

const LatencySyncManager = require('./latency-sync-manager');

// Initialize
const syncManager = new LatencySyncManager(io, ariClient);
syncManager.start();

// Setup APIs
syncManager.setupAPI(app);
syncManager.setupWebSocket(server);

// Hook into existing events
socket.on('transcriptionFinal', (data) => {
  syncManager.onASRComplete(data);
  // ... existing code continues
});

socket.on('translationComplete', (data) => {
  syncManager.onMTComplete(data);
  // ... existing code continues
});

socket.on('ttsComplete', (data) => {
  syncManager.onTTSComplete(data);
  // ... existing code continues
});

socket.on('humeComplete', (data) => {
  syncManager.onHumeComplete(data);
  // ... existing code continues
});

// Cleanup on shutdown
process.on('SIGINT', () => {
  syncManager.stop();
  process.exit();
});
```

### **7.2 Dashboard Integration**

```javascript
// In dashboard-single.html

socket.on('latencyUpdate', (data) => {
  // Filter by extension
  if (filterExtension && data.extension !== filterExtension) return;

  // Update Deepgram latency
  const deepgramElement = document.getElementById('deepgramLatency');
  if (deepgramElement && data.latencies.asr.current) {
    deepgramElement.textContent = Math.round(data.latencies.asr.current) + 'ms';
    updateLatencyClass(deepgramElement, data.latencies.asr.current, 250);
  }

  // Update DeepL latency
  const deeplElement = document.getElementById('deeplLatency');
  if (deeplElement && data.latencies.mt.current) {
    deeplElement.textContent = Math.round(data.latencies.mt.current) + 'ms';
    updateLatencyClass(deeplElement, data.latencies.mt.current, 200);
  }

  // Update ElevenLabs latency
  const elevenlabsElement = document.getElementById('elevenlabsLatency');
  if (elevenlabsElement && data.latencies.tts.current) {
    elevenlabsElement.textContent = Math.round(data.latencies.tts.current) + 'ms';
    updateLatencyClass(elevenlabsElement, data.latencies.tts.current, 250);
  }

  // Update E2E latency
  const e2eElement = document.getElementById('e2eLatency');
  if (e2eElement && data.latencies.e2e.current) {
    e2eElement.textContent = Math.round(data.latencies.e2e.current) + 'ms';
    updateLatencyClass(e2eElement, data.latencies.e2e.current, 900);
  }

  // Update buffer info (optional new card)
  const bufferElement = document.getElementById('bufferInfo');
  if (bufferElement && data.buffer) {
    bufferElement.textContent = `Buffer: ${data.buffer.current}ms (Target: ${data.buffer.target}ms)`;
  }
});
```

---

## 8. DEPLOYMENT & OPERATIONS

### **8.1 Deployment Steps**

1. **Create service file:** `latency-sync-manager.js`
2. **Integrate into main server:** Add initialization code
3. **Update event emitters:** Ensure all timing events include extension field
4. **Deploy to Azure:** Upload and restart service
5. **Verify operation:** Check logs for sync activity
6. **Monitor dashboard:** Confirm latency updates appearing

### **8.2 Monitoring**

```javascript
// Add health check endpoint
app.get('/health/sync-manager', (req, res) => {
  const health = {
    status: syncManager.syncInterval ? 'running' : 'stopped',
    activeChannels: syncManager.channels.size,
    syncCount: syncManager.syncState.syncCount,
    lastSyncTime: syncManager.syncState.lastSyncTime,
    uptime: process.uptime()
  };
  res.json(health);
});
```

### **8.3 Logging Strategy**

```
[Timing] ASR complete for 7000: 145ms
[Timing] MT complete for 7000: 180ms
[Timing] TTS complete for 7000: 320ms
[Sync] Slowest channel: 7001 with 820ms latency
[Sync] Channel 7000: Latency=645ms, Buffer target=325ms, Adjustment=+25ms
[ConfBridge] Adjusting buffer for 7000 to 325ms
[ConfBridge] ✅ Buffer adjusted for 7000
```

### **8.4 Configuration**

```javascript
// Environment variables
const config = {
  SYNC_INTERVAL_MS: process.env.SYNC_INTERVAL_MS || 500,
  ADJUSTMENT_THRESHOLD: process.env.ADJUSTMENT_THRESHOLD || 20,
  BASE_BUFFER: process.env.BASE_BUFFER || 100,
  SAFETY_MARGIN: process.env.SAFETY_MARGIN || 50,
  HISTORY_SIZE: process.env.HISTORY_SIZE || 20
};
```

---

## 9. NEXT STEPS

1. ✅ **Review this document** - Confirm architecture
2. ⏭️ **Create `latency-sync-manager.js`** - Implement service
3. ⏭️ **Integrate with existing system** - Hook up events
4. ⏭️ **Add ARI buffer control** - Implement ConfBridge adjustments
5. ⏭️ **Update dashboard** - Consume new `latencyUpdate` events
6. ⏭️ **Test with live call** - Verify synchronization works
7. ⏭️ **Production deployment** - Roll out to Azure

---

**Document Version:** 1.0
**Date:** October 29, 2025
**Author:** Claude Code (with Sagiv Stavinsky)

---

**END OF DOCUMENT**
