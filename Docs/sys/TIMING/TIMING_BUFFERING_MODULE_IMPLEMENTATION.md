# Timing & Buffering Module Implementation Guide
## Extensions 3333/4444 - Bidirectional Latency Compensation

**Document Version:** 1.0
**Date:** November 10, 2025
**Status:** Development Specification
**Target System:** conference-server-externalmedia.js (Port 3002)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [The Challenge: Frame Identity Loss](#the-challenge-frame-identity-loss)
3. [Solution Architecture](#solution-architecture)
4. [Latency Calculation Formula](#latency-calculation-formula)
5. [Implementation Specification](#implementation-specification)
6. [TCP API for Dashboard Feed](#tcp-api-for-dashboard-feed)
7. [Code Implementation](#code-implementation)
8. [Testing & Validation](#testing--validation)
9. [Deployment Plan](#deployment-plan)
10. [Monitoring & Debugging](#monitoring--debugging)

---

## Executive Summary

### Problem Statement

The 3333/4444 ExternalMedia translation system requires **bidirectional latency compensation** to synchronize audio delivery between two extensions speaking different languages. The core challenge is measuring complete round-trip latency when **frame identifiers are lost** during the translation pipeline (audio → text → translation → audio).

### Solution Overview

Implement a **timing and buffering module** directly in `conference-server-externalmedia.js` that:

1. **Tracks timestamps** at each pipeline stage (9 serial + 3 parallel stages)
2. **Calculates total end-to-end latency** by accumulating stage durations
3. **Compares bidirectional latencies** (3333→4444 vs 4444→3333)
4. **Buffers the faster channel** using `setTimeout()` to synchronize delivery
5. **Exposes TCP API** for real-time dashboard metrics feed
6. **Emits Socket.IO events** for dashboard visualization

### Key Metrics

- **Serial Pipeline:** 9 stages (Gateway→ASR, ASR, ASR→MT, MT, MT→TTS, TTS, TTS→LS, LS, LS→Bridge)
- **Parallel Pipeline:** 3 stages (Gateway→Hume, Hume, Hume→TTS)
- **Total E2E Latency:** `Math.max(serialTotal, parallelTotal)`
- **Buffer Calculation:** `Math.max(0, -latencyDifference)`
- **Rolling Average:** Last 10 samples per direction
- **Target Latency:** <900ms total E2E

---

## The Challenge: Frame Identity Loss

### Why We Cannot Track Individual Frames

```
INPUT AUDIO FRAME #123 (3333)
    ↓
[Buffer Accumulation]
    ↓ ❌ Frame ID LOST - Multiple frames combined
[Deepgram STT]
    ↓ Returns: TEXT STRING (no frame reference)
[DeepL Translation]
    ↓ Returns: TRANSLATED TEXT (no frame reference)
[ElevenLabs TTS]
    ↓ Returns: COMPLETELY NEW AUDIO (no relation to input frame)
OUTPUT AUDIO (4444)
```

**Problem:** Traditional frame-based latency tracking (e.g., "Frame #123 took 500ms from 3333→4444") is **impossible** because:
- Audio frames are buffered and combined before processing
- STT returns text, not frame numbers
- TTS generates new audio with different timing/length than input

### The Solution: Pipeline Stage Timestamp Accumulation

Instead of tracking individual frames, we **track timestamps at each pipeline stage** and accumulate the durations to calculate total latency:

```javascript
e2e_latency = (asrEnd - gatewayStart) +
              (mtEnd - asrEnd) +
              (ttsEnd - mtEnd) +
              (bridgeSend - ttsEnd)
```

This gives us the **complete round-trip time** for the entire utterance through the translation pipeline.

---

## Solution Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                   Conference Server (Port 3002)                  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           Timing & Buffering Module (NEW)                  │  │
│  │                                                             │  │
│  │  • ExtensionPairManager (3333↔4444 tracking)              │  │
│  │  • LatencyTracker (rolling average, 10 samples)            │  │
│  │  • AudioBuffer (setTimeout-based delay)                    │  │
│  │  • DashboardAPI (TCP server on port 6001)                  │  │
│  │  • MetricsEmitter (Socket.IO events)                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │          processGatewayAudio() - MODIFIED                  │  │
│  │                                                             │  │
│  │  T1: Gateway receives audio                                │  │
│  │  T2: Send to Deepgram (ASR)                                │  │
│  │  T3: Receive transcription                                 │  │
│  │  T4: Send to DeepL (MT)                                    │  │
│  │  T5: Receive translation                                   │  │
│  │  T6: Send to ElevenLabs (TTS)                              │  │
│  │  T7: Receive TTS audio                                     │  │
│  │  T8: Calculate buffer delay                                │  │
│  │  T9: Send to Gateway (after buffer)                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├── Socket.IO → Dashboard (Port 3002)
                              └── TCP API → Dashboard (Port 6001)
```

### Data Flow

```
Extension 3333 speaks (English)
    ↓
Gateway → Conference Server
    ↓ [TIMESTAMP T0]
Serial Pipeline:
    ├─ T1: Gateway→ASR (prepare audio for Deepgram)
    ├─ T2: ASR (Deepgram transcription)
    ├─ T3: ASR→MT (prepare for DeepL)
    ├─ T4: MT (DeepL translation)
    ├─ T5: MT→TTS (prepare for ElevenLabs)
    ├─ T6: TTS (ElevenLabs synthesis)
    ├─ T7: TTS→LS (prepare for latency sync)
    ├─ T8: LS (calculate buffer delay)
    └─ T9: LS→Bridge (send to gateway)

Parallel Pipeline (Hume Emotion):
    ├─ T1: Gateway→EV (send to Hume WebSocket)
    ├─ T2: EV (Hume emotion detection)
    └─ T3: EV→TTS (inject emotion into TTS)

Total E2E = max(serial_total, parallel_total)
    ↓
Compare: e2e_3333_to_4444 vs e2e_4444_to_3333
    ↓
Buffer faster channel by difference
    ↓
Send to Extension 4444 (French audio)
```

---

## Latency Calculation Formula

### Serial Pipeline (9 Stages)

```javascript
// Stage-by-stage timestamps
const timing = {
  t0_gatewayReceived: Date.now(),

  // STAGE 1: Gateway → ASR
  t1_asrStarted: Date.now(),
  stage1_gateway_to_asr: t1_asrStarted - t0_gatewayReceived,

  // STAGE 2: ASR Processing
  t2_asrCompleted: Date.now(),
  stage2_asr: t2_asrCompleted - t1_asrStarted,

  // STAGE 3: ASR → MT
  t3_mtStarted: Date.now(),
  stage3_asr_to_mt: t3_mtStarted - t2_asrCompleted,

  // STAGE 4: MT Processing
  t4_mtCompleted: Date.now(),
  stage4_mt: t4_mtCompleted - t3_mtStarted,

  // STAGE 5: MT → TTS
  t5_ttsStarted: Date.now(),
  stage5_mt_to_tts: t5_ttsStarted - t4_mtCompleted,

  // STAGE 6: TTS Processing
  t6_ttsCompleted: Date.now(),
  stage6_tts: t6_ttsCompleted - t5_ttsStarted,

  // STAGE 7: TTS → LS
  t7_lsStarted: Date.now(),
  stage7_tts_to_ls: t7_lsStarted - t6_ttsCompleted,

  // STAGE 8: LS Processing (buffer calculation)
  t8_lsCompleted: Date.now(),
  stage8_ls: t8_lsCompleted - t7_lsStarted,

  // STAGE 9: LS → Bridge (with buffer delay applied)
  t9_bridgeSent: Date.now(),
  stage9_ls_to_bridge: t9_bridgeSent - t8_lsCompleted
};

// Serial total = sum of all 9 stages
const serialTotal = timing.stage1_gateway_to_asr +
                   timing.stage2_asr +
                   timing.stage3_asr_to_mt +
                   timing.stage4_mt +
                   timing.stage5_mt_to_tts +
                   timing.stage6_tts +
                   timing.stage7_tts_to_ls +
                   timing.stage8_ls +
                   timing.stage9_ls_to_bridge;
```

### Parallel Pipeline (3 Stages - Hume)

```javascript
// Parallel path (emotion detection)
const parallelTiming = {
  // STAGE 1: Gateway → Emotion Detector
  p1_evStarted: Date.now(),
  stage_p1_gateway_to_ev: p1_evStarted - t0_gatewayReceived,

  // STAGE 2: Hume Processing
  p2_evCompleted: Date.now(),
  stage_p2_hume: p2_evCompleted - p1_evStarted,

  // STAGE 3: Emotion → TTS
  p3_evToTts: Date.now(),
  stage_p3_ev_to_tts: p3_evToTts - p2_evCompleted
};

// Parallel total = sum of 3 stages
const parallelTotal = parallelTiming.stage_p1_gateway_to_ev +
                     parallelTiming.stage_p2_hume +
                     parallelTiming.stage_p3_ev_to_tts;
```

### Total E2E Latency (Critical Formula)

```javascript
// *** KEY POINT: Use MAX because parallel can BLOCK serial ***
const e2e_latency = Math.max(serialTotal, parallelTotal);

// If Hume takes longer than serial pipeline, it becomes the bottleneck!
if (parallelTotal > serialTotal) {
  console.log(`⚠️ Parallel pipeline BLOCKING (${parallelTotal}ms > ${serialTotal}ms)`);
}
```

### Bidirectional Comparison

```javascript
// Store rolling average (last 10 samples) for each direction
const directionLatencies = new Map();
// Key: '3333→4444' or '4444→3333'
// Value: [e2e_1, e2e_2, ..., e2e_10]

// Calculate average for each direction
function getAverageLatency(direction) {
  const samples = directionLatencies.get(direction) || [];
  if (samples.length === 0) return 0;
  return samples.reduce((a, b) => a + b) / samples.length;
}

// Calculate latency difference
const avg_3333_to_4444 = getAverageLatency('3333→4444'); // e.g., 500ms
const avg_4444_to_3333 = getAverageLatency('4444→3333'); // e.g., 300ms
const latencyDifference = avg_3333_to_4444 - avg_4444_to_3333; // +200ms

// Interpret the difference:
// +200ms: 3333→4444 is SLOWER, need to buffer 4444→3333 by 200ms
// -200ms: 4444→3333 is SLOWER, need to buffer 3333→4444 by 200ms
```

### Buffer Calculation

```javascript
// Buffer amount for each direction
function calculateBufferDelay(fromExt, toExt) {
  const direction = `${fromExt}→${toExt}`;
  const reverseDirection = `${toExt}→${fromExt}`;

  const avgThis = getAverageLatency(direction);
  const avgOther = getAverageLatency(reverseDirection);

  const difference = avgThis - avgOther;

  // Only delay if THIS direction is FASTER (negative difference)
  const bufferMs = Math.max(0, -difference);

  return bufferMs;
}

// Example:
// 3333→4444 = 500ms (slower)
// 4444→3333 = 300ms (faster)
// Difference for 3333→4444 = 500 - 300 = +200ms → buffer = max(0, -200) = 0ms
// Difference for 4444→3333 = 300 - 500 = -200ms → buffer = max(0, -(-200)) = 200ms
// Result: Delay 4444→3333 by 200ms to match 3333→4444
```

---

## Implementation Specification

### Module Structure

```
conference-server-externalmedia.js
├── ExtensionPairManager (class)
│   ├── registerPair(ext1, ext2)
│   ├── isPaired(ext)
│   ├── getPairedExtension(ext)
│   └── getLatencyDifference(ext1, ext2)
│
├── LatencyTracker (class)
│   ├── updateLatency(direction, latencyMs)
│   ├── getAverageLatency(direction)
│   ├── getAllLatencies(extension)
│   └── getLatencyDifference(ext1, ext2)
│
├── AudioBufferManager (class)
│   ├── bufferAndSend(extension, audio, delayMs)
│   ├── clearBuffer(extension)
│   └── getPendingBuffers(extension)
│
├── DashboardTCPAPI (class)
│   ├── startServer(port = 6001)
│   ├── broadcastLatencyUpdate(data)
│   ├── handleClientConnection(socket)
│   └── stopServer()
│
└── MetricsEmitter (singleton)
    ├── emitLatencyUpdate(extension, timing, buffer)
    ├── emitPipelineStage(extension, stage, duration)
    └── emitBufferApplied(extension, delayMs, reason)
```

### Class Definitions

#### 1. ExtensionPairManager

```javascript
class ExtensionPairManager {
  constructor() {
    this.pairs = new Map(); // ext → pairedExt
    this.startTimes = new Map(); // ext → callStartTime
  }

  registerPair(ext1, ext2) {
    this.pairs.set(ext1, ext2);
    this.pairs.set(ext2, ext1);
    this.startTimes.set(ext1, Date.now());
    this.startTimes.set(ext2, Date.now());
    console.log(`[PairManager] Registered pair: ${ext1} ↔ ${ext2}`);
  }

  isPaired(ext) {
    return this.pairs.has(ext);
  }

  getPairedExtension(ext) {
    return this.pairs.get(ext);
  }

  unregisterPair(ext) {
    const paired = this.pairs.get(ext);
    if (paired) {
      this.pairs.delete(ext);
      this.pairs.delete(paired);
      this.startTimes.delete(ext);
      this.startTimes.delete(paired);
      console.log(`[PairManager] Unregistered pair: ${ext} ↔ ${paired}`);
    }
  }
}
```

#### 2. LatencyTracker

```javascript
class LatencyTracker {
  constructor() {
    this.directionSamples = new Map(); // 'ext1→ext2' → [sample1, sample2, ...]
    this.stageSamples = new Map(); // 'ext:stage' → [sample1, sample2, ...]
    this.maxSamples = 10; // Rolling average window
  }

  updateLatency(direction, latencyMs) {
    if (!this.directionSamples.has(direction)) {
      this.directionSamples.set(direction, []);
    }

    const samples = this.directionSamples.get(direction);
    samples.push(latencyMs);

    // Keep only last 10 samples
    if (samples.length > this.maxSamples) {
      samples.shift();
    }

    const avg = this.getAverageLatency(direction);
    console.log(`[Latency] ${direction} = ${latencyMs}ms (avg: ${Math.round(avg)}ms, n=${samples.length})`);
  }

  updateStageLatency(extension, stageName, latencyMs) {
    const key = `${extension}:${stageName}`;
    if (!this.stageSamples.has(key)) {
      this.stageSamples.set(key, []);
    }

    const samples = this.stageSamples.get(key);
    samples.push(latencyMs);

    if (samples.length > this.maxSamples) {
      samples.shift();
    }
  }

  getAverageLatency(direction) {
    const samples = this.directionSamples.get(direction) || [];
    if (samples.length === 0) return 0;
    return samples.reduce((a, b) => a + b) / samples.length;
  }

  getStageAverage(extension, stageName) {
    const key = `${extension}:${stageName}`;
    const samples = this.stageSamples.get(key) || [];
    if (samples.length === 0) return 0;
    return samples.reduce((a, b) => a + b) / samples.length;
  }

  getLatencyDifference(ext1, ext2) {
    const direction1 = `${ext1}→${ext2}`;
    const direction2 = `${ext2}→${ext1}`;

    const avg1 = this.getAverageLatency(direction1);
    const avg2 = this.getAverageLatency(direction2);

    const difference = avg1 - avg2;

    console.log(`[LatencyDiff] ${direction1}=${Math.round(avg1)}ms, ${direction2}=${Math.round(avg2)}ms, Δ=${Math.round(difference)}ms`);

    return difference;
  }

  getAllLatencies(extension) {
    const stages = [
      'audiosocket_to_asr', 'asr', 'asr_to_mt', 'mt', 'mt_to_tts',
      'tts', 'tts_to_ls', 'ls', 'ls_to_bridge'
    ];

    const result = {};
    for (const stage of stages) {
      const key = `${extension}:${stage}`;
      const samples = this.stageSamples.get(key) || [];
      result[stage] = {
        current: samples[samples.length - 1] || 0,
        avg: this.getStageAverage(extension, stage)
      };
    }

    return result;
  }
}
```

#### 3. AudioBufferManager

```javascript
class AudioBufferManager {
  constructor() {
    this.pendingBuffers = new Map(); // extension → [{audio, timer, targetTime}, ...]
  }

  bufferAndSend(extension, audioData, delayMs, sendCallback) {
    if (delayMs === 0) {
      // No delay needed, send immediately
      sendCallback(extension, audioData);
      return;
    }

    const targetTime = Date.now() + delayMs;

    console.log(`[AudioBuffer] Buffering ${audioData.length} bytes for ${extension} by ${delayMs}ms`);

    const timer = setTimeout(() => {
      console.log(`[AudioBuffer] Sending buffered audio for ${extension} (delayed by ${delayMs}ms)`);
      sendCallback(extension, audioData);

      // Remove from pending buffers
      const buffers = this.pendingBuffers.get(extension) || [];
      const index = buffers.findIndex(b => b.targetTime === targetTime);
      if (index !== -1) {
        buffers.splice(index, 1);
      }
    }, delayMs);

    // Track pending buffer
    if (!this.pendingBuffers.has(extension)) {
      this.pendingBuffers.set(extension, []);
    }

    this.pendingBuffers.get(extension).push({
      audio: audioData,
      timer,
      targetTime,
      delayMs
    });
  }

  clearBuffer(extension) {
    const buffers = this.pendingBuffers.get(extension) || [];
    buffers.forEach(b => clearTimeout(b.timer));
    this.pendingBuffers.delete(extension);
    console.log(`[AudioBuffer] Cleared all pending buffers for ${extension}`);
  }

  getPendingBuffers(extension) {
    return this.pendingBuffers.get(extension) || [];
  }
}
```

---

## TCP API for Dashboard Feed

### Overview

Expose a **TCP server on port 6001** for real-time latency metrics streaming to the dashboard. This provides an alternative to Socket.IO for high-frequency, low-latency updates.

### Protocol Specification

**Transport:** TCP
**Port:** 6001
**Format:** Newline-delimited JSON (`\n`)
**Encoding:** UTF-8

#### Message Types

1. **CONNECTION** (Server → Client on connect)
```json
{
  "type": "CONNECTED",
  "timestamp": 1730000000000,
  "serverVersion": "1.0.0"
}\n
```

2. **LATENCY_UPDATE** (Server → Client, periodic)
```json
{
  "type": "LATENCY_UPDATE",
  "timestamp": 1730000000000,
  "extension": "3333",
  "latencies": {
    "asr": { "current": 120, "avg": 115 },
    "mt": { "current": 180, "avg": 175 },
    "tts": { "current": 250, "avg": 245 },
    "hume": { "current": 300, "avg": 290 },
    "e2e": { "current": 900, "avg": 885 },
    "audiosocket_to_asr": { "current": 50, "avg": 48 },
    "asr_to_mt": { "current": 30, "avg": 28 },
    "mt_to_tts": { "current": 40, "avg": 38 },
    "tts_to_ls": { "current": 35, "avg": 33 },
    "ls_to_bridge": { "current": 45, "avg": 42 },
    "audiosocket_to_ev": { "current": 60, "avg": 58 },
    "ev_to_tts": { "current": 40, "avg": 38 },
    "serial_total": { "current": 700, "avg": 685 },
    "parallel_total": { "current": 400, "avg": 390 }
  },
  "buffer": {
    "current": 200,
    "target": 200,
    "adjustment": 200,
    "reason": "sync_to_4444"
  },
  "displaySerialTotal": 700,
  "displaySerialTotalWithSync": 900,
  "parallelBlocking": false,
  "stats": {
    "utteranceCount": 15,
    "avgUtteranceLatency": 890
  }
}\n
```

3. **STAGE_TIMING** (Server → Client, per-stage)
```json
{
  "type": "STAGE_TIMING",
  "timestamp": 1730000000000,
  "extension": "3333",
  "stage": "asr",
  "duration": 120,
  "stageName": "ASR (Deepgram)"
}\n
```

4. **BUFFER_APPLIED** (Server → Client, when buffer is applied)
```json
{
  "type": "BUFFER_APPLIED",
  "timestamp": 1730000000000,
  "extension": "3333",
  "delayMs": 200,
  "reason": "sync_to_4444",
  "latencyDifference": -200
}\n
```

5. **HEARTBEAT** (Server → Client, every 30 seconds)
```json
{
  "type": "HEARTBEAT",
  "timestamp": 1730000000000,
  "connectedClients": 2,
  "uptime": 3600000
}\n
```

6. **SUBSCRIBE** (Client → Server)
```json
{
  "type": "SUBSCRIBE",
  "extension": "3333"
}\n
```

7. **UNSUBSCRIBE** (Client → Server)
```json
{
  "type": "UNSUBSCRIBE",
  "extension": "3333"
}\n
```

### Implementation

```javascript
const net = require('net');

class DashboardTCPAPI {
  constructor() {
    this.server = null;
    this.clients = new Map(); // socket → { id, subscriptions: Set }
    this.nextClientId = 1;
  }

  startServer(port = 6001) {
    this.server = net.createServer((socket) => {
      this.handleClientConnection(socket);
    });

    this.server.listen(port, () => {
      console.log(`[TCP API] Dashboard metrics API listening on port ${port}`);
    });

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.broadcastHeartbeat();
    }, 30000);
  }

  handleClientConnection(socket) {
    const clientId = this.nextClientId++;
    const clientInfo = {
      id: clientId,
      subscriptions: new Set(), // Set of extension numbers
      address: socket.remoteAddress
    };

    this.clients.set(socket, clientInfo);

    console.log(`[TCP API] Client ${clientId} connected from ${socket.remoteAddress}`);

    // Send connection confirmation
    this.sendToClient(socket, {
      type: 'CONNECTED',
      timestamp: Date.now(),
      serverVersion: '1.0.0',
      clientId: clientId
    });

    // Handle incoming data
    let buffer = '';
    socket.on('data', (data) => {
      buffer += data.toString('utf8');

      // Process complete messages (newline-delimited)
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line);
            this.handleClientMessage(socket, clientInfo, message);
          } catch (error) {
            console.error(`[TCP API] Invalid JSON from client ${clientId}:`, error);
          }
        }
      }
    });

    socket.on('error', (error) => {
      console.error(`[TCP API] Client ${clientId} error:`, error);
    });

    socket.on('close', () => {
      console.log(`[TCP API] Client ${clientId} disconnected`);
      this.clients.delete(socket);
    });
  }

  handleClientMessage(socket, clientInfo, message) {
    switch (message.type) {
      case 'SUBSCRIBE':
        if (message.extension) {
          clientInfo.subscriptions.add(message.extension);
          console.log(`[TCP API] Client ${clientInfo.id} subscribed to extension ${message.extension}`);
        }
        break;

      case 'UNSUBSCRIBE':
        if (message.extension) {
          clientInfo.subscriptions.delete(message.extension);
          console.log(`[TCP API] Client ${clientInfo.id} unsubscribed from extension ${message.extension}`);
        }
        break;

      default:
        console.warn(`[TCP API] Unknown message type from client ${clientInfo.id}:`, message.type);
    }
  }

  sendToClient(socket, data) {
    if (socket.writable) {
      const json = JSON.stringify(data) + '\n';
      socket.write(json);
    }
  }

  broadcastLatencyUpdate(data) {
    const message = {
      type: 'LATENCY_UPDATE',
      timestamp: Date.now(),
      ...data
    };

    // Send to subscribed clients
    for (const [socket, clientInfo] of this.clients.entries()) {
      if (clientInfo.subscriptions.size === 0 ||
          clientInfo.subscriptions.has(data.extension)) {
        this.sendToClient(socket, message);
      }
    }
  }

  broadcastStage(extension, stage, duration, stageName) {
    const message = {
      type: 'STAGE_TIMING',
      timestamp: Date.now(),
      extension,
      stage,
      duration,
      stageName
    };

    for (const [socket, clientInfo] of this.clients.entries()) {
      if (clientInfo.subscriptions.size === 0 ||
          clientInfo.subscriptions.has(extension)) {
        this.sendToClient(socket, message);
      }
    }
  }

  broadcastBufferApplied(extension, delayMs, reason, latencyDifference) {
    const message = {
      type: 'BUFFER_APPLIED',
      timestamp: Date.now(),
      extension,
      delayMs,
      reason,
      latencyDifference
    };

    for (const [socket, clientInfo] of this.clients.entries()) {
      if (clientInfo.subscriptions.size === 0 ||
          clientInfo.subscriptions.has(extension)) {
        this.sendToClient(socket, message);
      }
    }
  }

  broadcastHeartbeat() {
    const message = {
      type: 'HEARTBEAT',
      timestamp: Date.now(),
      connectedClients: this.clients.size,
      uptime: process.uptime() * 1000
    };

    for (const [socket] of this.clients.entries()) {
      this.sendToClient(socket, message);
    }
  }

  stopServer() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    for (const [socket] of this.clients.entries()) {
      socket.end();
    }

    if (this.server) {
      this.server.close(() => {
        console.log('[TCP API] Server closed');
      });
    }
  }
}

// Global instance
global.dashboardTCPAPI = new DashboardTCPAPI();
global.dashboardTCPAPI.startServer(6001);
```

---

## Code Implementation

### Modified processGatewayAudio Function

```javascript
// Global instances
const pairManager = new ExtensionPairManager();
const latencyTracker = new LatencyTracker();
const audioBufferManager = new AudioBufferManager();

// Auto-pair 3333 and 4444 on startup
pairManager.registerPair('3333', '4444');

async function processGatewayAudio(socket, extension, audioBuffer, language) {
  try {
    // ═══════════════════════════════════════════════════════════════
    // TIMING INITIALIZATION
    // ═══════════════════════════════════════════════════════════════
    const timing = {
      extension,
      t0_gatewayReceived: Date.now(),
      stages: {},
      parallel: {}
    };

    // ═══════════════════════════════════════════════════════════════
    // STAGE 1: Gateway → ASR
    // ═══════════════════════════════════════════════════════════════
    timing.t1_asrStarted = Date.now();
    timing.stages.audiosocket_to_asr = timing.t1_asrStarted - timing.t0_gatewayReceived;

    latencyTracker.updateStageLatency(extension, 'audiosocket_to_asr', timing.stages.audiosocket_to_asr);
    global.dashboardTCPAPI.broadcastStage(extension, 'audiosocket_to_asr', timing.stages.audiosocket_to_asr, 'Gateway → ASR');

    console.log(`[Pipeline] Stage 1 (Gateway→ASR) for ${extension}: ${timing.stages.audiosocket_to_asr}ms`);

    // ═══════════════════════════════════════════════════════════════
    // STAGE 2: ASR Processing (Deepgram)
    // ═══════════════════════════════════════════════════════════════
    console.log(`[Pipeline] Transcribing ${audioBuffer.length} bytes from extension ${extension}...`);

    const gainFactor = extensionGainFactors.get(extension) || 1.2;
    const amplifiedAudio = amplifyAudio(audioBuffer, gainFactor);
    const wavAudio = addWavHeader(amplifiedAudio);

    const asrStart = Date.now();
    const { text: transcription, confidence } = await transcribeAudio(wavAudio, language);
    timing.t2_asrCompleted = Date.now();
    timing.stages.asr = timing.t2_asrCompleted - asrStart;

    latencyTracker.updateStageLatency(extension, 'asr', timing.stages.asr);
    global.dashboardTCPAPI.broadcastStage(extension, 'asr', timing.stages.asr, 'ASR (Deepgram)');

    if (!transcription || transcription.trim() === '') {
      console.log(`[Pipeline] No transcription for extension ${extension}`);
      return;
    }

    console.log(`[Pipeline] Stage 2 (ASR) for ${extension}: ${timing.stages.asr}ms - "${transcription}"`);

    // Emit transcription to dashboard
    global.io.emit('transcriptionFinal', {
      extension: extension,
      text: transcription,
      language: language,
      confidence: confidence,
      timestamp: Date.now()
    });

    // ═══════════════════════════════════════════════════════════════
    // STAGE 3: ASR → MT
    // ═══════════════════════════════════════════════════════════════
    timing.t3_mtStarted = Date.now();
    timing.stages.asr_to_mt = timing.t3_mtStarted - timing.t2_asrCompleted;

    latencyTracker.updateStageLatency(extension, 'asr_to_mt', timing.stages.asr_to_mt);
    global.dashboardTCPAPI.broadcastStage(extension, 'asr_to_mt', timing.stages.asr_to_mt, 'ASR → MT');

    console.log(`[Pipeline] Stage 3 (ASR→MT) for ${extension}: ${timing.stages.asr_to_mt}ms`);

    // ═══════════════════════════════════════════════════════════════
    // STAGE 4: MT Processing (DeepL)
    // ═══════════════════════════════════════════════════════════════
    const targetLang = extension === '3333' ? 'fr' : 'en';
    console.log(`[Pipeline] Translating ${language} -> ${targetLang}: "${transcription}"`);

    const mtStart = Date.now();
    const translation = await translateText(transcription, language, targetLang);
    timing.t4_mtCompleted = Date.now();
    timing.stages.mt = timing.t4_mtCompleted - mtStart;

    latencyTracker.updateStageLatency(extension, 'mt', timing.stages.mt);
    global.dashboardTCPAPI.broadcastStage(extension, 'mt', timing.stages.mt, 'MT (DeepL)');

    console.log(`[Pipeline] Stage 4 (MT) for ${extension}: ${timing.stages.mt}ms - "${translation}"`);

    // Emit translation to dashboard
    global.io.emit('translationComplete', {
      extension: extension,
      original: transcription,
      translation: translation,
      sourceLang: language,
      targetLang: targetLang,
      timestamp: Date.now()
    });

    // ═══════════════════════════════════════════════════════════════
    // PARALLEL PIPELINE: Check Hume emotion status
    // ═══════════════════════════════════════════════════════════════
    const humeEmotion = getLatestHumeEmotion(extension);
    if (humeEmotion) {
      timing.parallel.audiosocket_to_ev = humeEmotion.startTime - timing.t0_gatewayReceived;
      timing.parallel.hume = humeEmotion.processingTime;
      timing.parallel.ev_to_tts = timing.t4_mtCompleted - humeEmotion.completedTime;

      timing.parallelTotal = timing.parallel.audiosocket_to_ev +
                            timing.parallel.hume +
                            timing.parallel.ev_to_tts;

      latencyTracker.updateStageLatency(extension, 'hume', timing.parallel.hume);
    } else {
      timing.parallelTotal = 0;
    }

    // ═══════════════════════════════════════════════════════════════
    // STAGE 5: MT → TTS
    // ═══════════════════════════════════════════════════════════════
    timing.t5_ttsStarted = Date.now();
    timing.stages.mt_to_tts = timing.t5_ttsStarted - timing.t4_mtCompleted;

    latencyTracker.updateStageLatency(extension, 'mt_to_tts', timing.stages.mt_to_tts);
    global.dashboardTCPAPI.broadcastStage(extension, 'mt_to_tts', timing.stages.mt_to_tts, 'MT → TTS');

    console.log(`[Pipeline] Stage 5 (MT→TTS) for ${extension}: ${timing.stages.mt_to_tts}ms`);

    // ═══════════════════════════════════════════════════════════════
    // STAGE 6: TTS Processing (ElevenLabs)
    // ═══════════════════════════════════════════════════════════════
    console.log(`[Pipeline] Generating TTS for extension ${extension}: "${translation}"`);

    const ttsStart = Date.now();
    const ttsAudio = await synthesizeSpeech(translation, targetLang, humeEmotion);
    timing.t6_ttsCompleted = Date.now();
    timing.stages.tts = timing.t6_ttsCompleted - ttsStart;

    latencyTracker.updateStageLatency(extension, 'tts', timing.stages.tts);
    global.dashboardTCPAPI.broadcastStage(extension, 'tts', timing.stages.tts, 'TTS (ElevenLabs)');

    console.log(`[Pipeline] Stage 6 (TTS) for ${extension}: ${timing.stages.tts}ms - ${ttsAudio ? ttsAudio.length : 0} bytes`);

    // ═══════════════════════════════════════════════════════════════
    // STAGE 7: TTS → LS (Latency Sync)
    // ═══════════════════════════════════════════════════════════════
    timing.t7_lsStarted = Date.now();
    timing.stages.tts_to_ls = timing.t7_lsStarted - timing.t6_ttsCompleted;

    latencyTracker.updateStageLatency(extension, 'tts_to_ls', timing.stages.tts_to_ls);
    global.dashboardTCPAPI.broadcastStage(extension, 'tts_to_ls', timing.stages.tts_to_ls, 'TTS → LS');

    console.log(`[Pipeline] Stage 7 (TTS→LS) for ${extension}: ${timing.stages.tts_to_ls}ms`);

    // ═══════════════════════════════════════════════════════════════
    // STAGE 8: LS Processing (Buffer Calculation)
    // ═══════════════════════════════════════════════════════════════
    const pairedExtension = pairManager.getPairedExtension(extension);
    const latencyDiff = latencyTracker.getLatencyDifference(extension, pairedExtension);
    const bufferDelayMs = Math.max(0, -latencyDiff);

    timing.t8_lsCompleted = Date.now();
    timing.stages.ls = timing.t8_lsCompleted - timing.t7_lsStarted;

    latencyTracker.updateStageLatency(extension, 'ls', timing.stages.ls);
    global.dashboardTCPAPI.broadcastStage(extension, 'ls', timing.stages.ls, 'LS (Latency Sync)');

    console.log(`[Pipeline] Stage 8 (LS) for ${extension}: ${timing.stages.ls}ms - Buffer: ${bufferDelayMs}ms`);

    // ═══════════════════════════════════════════════════════════════
    // STAGE 9: LS → Bridge (with buffering)
    // ═══════════════════════════════════════════════════════════════

    // Buffer and send audio after calculated delay
    audioBufferManager.bufferAndSend(extension, ttsAudio, bufferDelayMs, (ext, audio) => {
      timing.t9_bridgeSent = Date.now();
      timing.stages.ls_to_bridge = timing.t9_bridgeSent - timing.t8_lsCompleted;

      latencyTracker.updateStageLatency(extension, 'ls_to_bridge', timing.stages.ls_to_bridge);
      global.dashboardTCPAPI.broadcastStage(extension, 'ls_to_bridge', timing.stages.ls_to_bridge, 'LS → Bridge');

      console.log(`[Pipeline] Stage 9 (LS→Bridge) for ${extension}: ${timing.stages.ls_to_bridge}ms`);

      // ═══════════════════════════════════════════════════════════════
      // CALCULATE TOTALS
      // ═══════════════════════════════════════════════════════════════
      timing.serialTotal = timing.stages.audiosocket_to_asr +
                          timing.stages.asr +
                          timing.stages.asr_to_mt +
                          timing.stages.mt +
                          timing.stages.mt_to_tts +
                          timing.stages.tts +
                          timing.stages.tts_to_ls +
                          timing.stages.ls +
                          timing.stages.ls_to_bridge;

      // *** CRITICAL: Use MAX of serial and parallel ***
      timing.e2eTotal = Math.max(timing.serialTotal, timing.parallelTotal);

      // Check if parallel is blocking
      const isParallelBlocking = timing.parallelTotal > timing.serialTotal;
      if (isParallelBlocking) {
        console.log(`⚠️  [Latency WARNING] Extension ${extension}: Parallel pipeline (${timing.parallelTotal}ms) is BLOCKING - slower than serial (${timing.serialTotal}ms)`);
      }

      console.log(`[Pipeline] Extension ${extension} E2E: ${timing.e2eTotal}ms (Serial: ${timing.serialTotal}ms, Parallel: ${timing.parallelTotal}ms)`);

      // ═══════════════════════════════════════════════════════════════
      // SEND AUDIO TO GATEWAY
      // ═══════════════════════════════════════════════════════════════
      socket.emit('translatedAudio', {
        extension: pairedExtension,
        audio: audio,
        timing: timing
      });

      // Emit TTS audio to dashboard
      global.io.emit('translated-audio', {
        extension: String(extension),
        original: transcription,
        translation: translation,
        audio: audio ? audio.toString('base64') : null,
        audioFormat: 'mp3',
        sourceLang: language,
        targetLang: targetLang,
        timestamp: Date.now(),
        timing: {
          tts: timing.stages.tts,
          e2e: timing.e2eTotal
        }
      });

      // ═══════════════════════════════════════════════════════════════
      // UPDATE LATENCY TRACKER
      // ═══════════════════════════════════════════════════════════════
      const direction = `${extension}→${pairedExtension}`;
      latencyTracker.updateLatency(direction, timing.e2eTotal);

      // ═══════════════════════════════════════════════════════════════
      // EMIT DASHBOARD UPDATES
      // ═══════════════════════════════════════════════════════════════
      emitLatencyUpdate(extension, timing, bufferDelayMs, isParallelBlocking);

      // Broadcast buffer applied event
      if (bufferDelayMs > 0) {
        global.dashboardTCPAPI.broadcastBufferApplied(
          extension,
          bufferDelayMs,
          `sync_to_${pairedExtension}`,
          latencyDiff
        );
      }
    });

  } catch (error) {
    console.error(`[Pipeline] Error in processGatewayAudio for ${extension}:`, error);
  }
}
```

### Dashboard Event Emitter

```javascript
function emitLatencyUpdate(extension, timing, appliedBufferMs, isParallelBlocking) {
  const pairedExtension = pairManager.getPairedExtension(extension);

  const data = {
    extension: extension,

    latencies: latencyTracker.getAllLatencies(extension),

    buffer: {
      current: appliedBufferMs,
      target: appliedBufferMs,
      adjustment: appliedBufferMs,
      reason: `sync_to_${pairedExtension}`
    },

    displaySerialTotal: timing.serialTotal,
    displayParallelTotal: timing.parallelTotal,
    displaySerialTotalWithSync: timing.serialTotal + appliedBufferMs,

    parallelBlocking: isParallelBlocking,

    stats: {
      utteranceCount: getUtteranceCount(extension),
      avgUtteranceLatency: Math.round(latencyTracker.getAverageLatency(`${extension}→${pairedExtension}`))
    }
  };

  // Add latency values
  data.latencies.e2e = { current: timing.e2eTotal, avg: data.stats.avgUtteranceLatency };
  data.latencies.serial_total = { current: timing.serialTotal, avg: timing.serialTotal };
  data.latencies.parallel_total = { current: timing.parallelTotal, avg: timing.parallelTotal };

  // Emit via Socket.IO
  global.io.emit('latencyUpdate', data);

  // Broadcast via TCP API
  global.dashboardTCPAPI.broadcastLatencyUpdate(data);
}

// Utterance counter
const utteranceCounts = new Map(); // extension → count

function getUtteranceCount(extension) {
  return utteranceCounts.get(extension) || 0;
}

function incrementUtteranceCount(extension) {
  const count = (utteranceCounts.get(extension) || 0) + 1;
  utteranceCounts.set(extension, count);
  return count;
}
```

---

## Testing & Validation

### Unit Tests

Create `/home/azureuser/translation-app/3333-4444-stack/tests/timing-module.test.js`:

```javascript
const { ExtensionPairManager, LatencyTracker, AudioBufferManager } = require('../conference-server-externalmedia');

describe('ExtensionPairManager', () => {
  test('should register and retrieve pairs', () => {
    const manager = new ExtensionPairManager();
    manager.registerPair('3333', '4444');

    expect(manager.isPaired('3333')).toBe(true);
    expect(manager.getPairedExtension('3333')).toBe('4444');
    expect(manager.getPairedExtension('4444')).toBe('3333');
  });

  test('should unregister pairs', () => {
    const manager = new ExtensionPairManager();
    manager.registerPair('3333', '4444');
    manager.unregisterPair('3333');

    expect(manager.isPaired('3333')).toBe(false);
    expect(manager.isPaired('4444')).toBe(false);
  });
});

describe('LatencyTracker', () => {
  test('should calculate rolling average', () => {
    const tracker = new LatencyTracker();

    for (let i = 1; i <= 10; i++) {
      tracker.updateLatency('3333→4444', i * 100);
    }

    const avg = tracker.getAverageLatency('3333→4444');
    expect(avg).toBe(550); // Average of 100, 200, ..., 1000
  });

  test('should calculate latency difference', () => {
    const tracker = new LatencyTracker();

    tracker.updateLatency('3333→4444', 500);
    tracker.updateLatency('4444→3333', 300);

    const diff = tracker.getLatencyDifference('3333', '4444');
    expect(diff).toBe(200); // 500 - 300
  });

  test('should keep only last 10 samples', () => {
    const tracker = new LatencyTracker();

    for (let i = 1; i <= 15; i++) {
      tracker.updateLatency('3333→4444', i * 100);
    }

    const samples = tracker.directionSamples.get('3333→4444');
    expect(samples.length).toBe(10);
    expect(samples[0]).toBe(600); // First sample should be 6th value
  });
});

describe('AudioBufferManager', () => {
  test('should send immediately when delay is 0', (done) => {
    const manager = new AudioBufferManager();
    const audio = Buffer.from('test audio');

    manager.bufferAndSend('3333', audio, 0, (ext, data) => {
      expect(ext).toBe('3333');
      expect(data).toBe(audio);
      done();
    });
  });

  test('should delay audio send', (done) => {
    const manager = new AudioBufferManager();
    const audio = Buffer.from('test audio');
    const startTime = Date.now();

    manager.bufferAndSend('3333', audio, 100, (ext, data) => {
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(100);
      expect(elapsed).toBeLessThan(150);
      done();
    });
  });
});
```

### Integration Tests

```javascript
// Test complete pipeline timing
describe('Pipeline Timing Integration', () => {
  test('should track all 9 serial stages', async () => {
    // Mock processGatewayAudio execution
    // Verify all stages are timed and stored
  });

  test('should use max of serial and parallel', () => {
    // Scenario 1: Serial > Parallel
    // Scenario 2: Parallel > Serial (Hume blocking)
  });

  test('should apply correct buffer delay', () => {
    // 3333→4444 = 500ms
    // 4444→3333 = 300ms
    // Expect 4444→3333 to be delayed by 200ms
  });
});
```

### Manual Testing

1. **Start the system:**
```bash
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app/3333-4444-stack
node conference-server-externalmedia.js
```

2. **Test TCP API connection:**
```bash
telnet localhost 6001
# Should receive CONNECTED message
```

3. **Subscribe to extension updates:**
```bash
echo '{"type":"SUBSCRIBE","extension":"3333"}' | nc localhost 6001
```

4. **Make test call:**
- Dial into extension 3333
- Speak English
- Verify French audio arrives at 4444
- Check console for timing logs

5. **Verify dashboard:**
- Open dashboard at `http://20.170.155.53:3002/dashboard-single.html?ext=3333`
- Verify End-to-End Translation Latency card updates
- Check all 9 serial pipeline bars
- Verify sync correction bar shows buffer amount

---

## Deployment Plan

### Phase 1: Development (Local/Test Environment)

1. **Backup current system:**
```bash
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app/3333-4444-stack
cp conference-server-externalmedia.js conference-server-externalmedia.js.backup-$(date +%Y%m%d-%H%M%S)
```

2. **Implement module classes:**
- Add ExtensionPairManager
- Add LatencyTracker
- Add AudioBufferManager
- Add DashboardTCPAPI

3. **Modify processGatewayAudio:**
- Add timing tracking at each stage
- Add buffer calculation
- Add dashboard event emission

4. **Test locally:**
- Run unit tests
- Test TCP API
- Verify Socket.IO events

### Phase 2: Staging Deployment

1. **Deploy to test environment:**
```bash
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app/3333-4444-stack

# Kill existing server
lsof -i :3002 | tail -n +2 | awk '{print $2}' | xargs kill -9

# Start new server
nohup node conference-server-externalmedia.js >> translation-server.log 2>&1 &
```

2. **Monitor logs:**
```bash
tail -f /home/azureuser/translation-app/3333-4444-stack/translation-server.log | grep -E '(Latency|Buffer|Pipeline|TCP API)'
```

3. **Test with live calls:**
- Make test calls between 3333 and 4444
- Verify latency calculations
- Check buffer application
- Monitor TCP API connections

### Phase 3: Production Deployment

1. **Create rollback plan:**
```bash
# If issues occur, revert to backup:
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app/3333-4444-stack
lsof -i :3002 | tail -n +2 | awk '{print $2}' | xargs kill -9
cp conference-server-externalmedia.js.backup-TIMESTAMP conference-server-externalmedia.js
nohup node conference-server-externalmedia.js >> translation-server.log 2>&1 &
```

2. **Deploy during low-traffic window:**
- Schedule deployment during off-peak hours
- Notify stakeholders
- Deploy new version
- Monitor for 30 minutes

3. **Post-deployment verification:**
- Test all extensions (3333, 4444)
- Verify dashboard updates
- Check TCP API connections
- Monitor latency metrics

---

## Monitoring & Debugging

### Key Metrics to Monitor

1. **Latency Metrics:**
- Average E2E latency per direction
- Serial pipeline total
- Parallel pipeline total (Hume)
- Buffer delay applied
- Latency difference between directions

2. **System Health:**
- TCP API connected clients
- Socket.IO connections
- Buffer queue sizes
- Memory usage
- CPU usage

3. **Error Rates:**
- Failed API calls (Deepgram, DeepL, ElevenLabs, Hume)
- Dropped audio packets
- Buffer timeouts

### Debug Commands

```bash
# Check running processes
ps aux | grep 'node.*conference-server-externalmedia'

# Check TCP API port
lsof -i :6001

# Monitor latency logs
tail -f translation-server.log | grep '\[Latency'

# Monitor buffer logs
tail -f translation-server.log | grep '\[AudioBuffer'

# Monitor pipeline stages
tail -f translation-server.log | grep '\[Pipeline\] Stage'

# Test TCP API connection
echo '{"type":"SUBSCRIBE","extension":"3333"}' | nc localhost 6001
```

### Common Issues & Solutions

**Issue 1: Latency card not updating**
- **Cause:** Dashboard not receiving events
- **Solution:** Check Socket.IO connection, verify `latencyUpdate` event emission
- **Debug:** `global.io.sockets.sockets.size` should show connected dashboards

**Issue 2: Buffer delay too high/low**
- **Cause:** Incorrect latency difference calculation
- **Solution:** Check rolling average samples, verify both directions have data
- **Debug:** Log `latencyTracker.directionSamples` contents

**Issue 3: Parallel pipeline blocking**
- **Cause:** Hume WebSocket slow or timing out
- **Solution:** Check Hume connection, increase timeout, or disable emotion detection temporarily
- **Debug:** Monitor Hume response times in logs

**Issue 4: TCP API clients disconnecting**
- **Cause:** Firewall, network issues, or server errors
- **Solution:** Check firewall rules, verify port 6001 is open, check for socket write errors
- **Debug:** `netstat -an | grep 6001`

---

## Appendix A: Complete File Structure

```
/home/azureuser/translation-app/3333-4444-stack/
├── conference-server-externalmedia.js (MODIFIED)
│   ├── ExtensionPairManager class
│   ├── LatencyTracker class
│   ├── AudioBufferManager class
│   ├── DashboardTCPAPI class
│   ├── processGatewayAudio() (with timing)
│   └── emitLatencyUpdate()
│
├── gateway-3333-4444.js (unchanged)
├── bidirectional-timing-server.js (deprecated, for reference)
├── timing-client.js (deprecated, for reference)
│
├── public/
│   └── dashboard-single.html (unchanged)
│
├── tests/
│   └── timing-module.test.js (NEW)
│
├── docs/
│   └── TIMING_BUFFERING_MODULE_IMPLEMENTATION.md (THIS FILE)
│
└── logs/
    └── translation-server.log
```

---

## Appendix B: Configuration

Add to `conference-server-externalmedia.js`:

```javascript
// Timing & Buffering Configuration
const TIMING_CONFIG = {
  // Rolling average window size
  LATENCY_SAMPLE_SIZE: 10,

  // TCP API port
  TCP_API_PORT: 6001,

  // Heartbeat interval (ms)
  HEARTBEAT_INTERVAL: 30000,

  // Maximum buffer delay (ms)
  MAX_BUFFER_DELAY: 1000,

  // Minimum buffer delay to apply (ms)
  MIN_BUFFER_THRESHOLD: 50,

  // Log level for timing events
  LOG_LEVEL: 'info' // 'debug', 'info', 'warn', 'error'
};
```

---

## Appendix C: Dashboard HTML Modifications (Optional)

To display TCP API status, add to `dashboard-single.html`:

```html
<div class="card">
  <div class="card-header">
    <div class="card-title">TCP API Status</div>
  </div>
  <div class="card-content">
    <div>Connection: <span id="tcpStatus">Disconnected</span></div>
    <div>Messages Received: <span id="tcpMessageCount">0</span></div>
    <button onclick="connectTCP()">Connect TCP API</button>
  </div>
</div>

<script>
let tcpSocket = null;
let tcpMessageCount = 0;

function connectTCP() {
  // WebSocket proxy to TCP (requires proxy server)
  // OR use fetch for HTTP polling alternative

  // For now, TCP is used server-side only
  // Dashboard receives updates via Socket.IO
  console.log('TCP API is server-side only, dashboard uses Socket.IO');
}
</script>
```

---

## Appendix D: Performance Benchmarks

**Target Performance:**
- Serial Pipeline: <700ms
- Parallel Pipeline (Hume): <500ms
- Buffer Calculation: <5ms
- Dashboard Event Emission: <10ms
- TCP API Broadcast: <5ms per client

**Expected System Load:**
- Memory: +50MB (for timing data structures)
- CPU: +2-3% (for calculations and timers)
- Network: +10KB/s (for dashboard updates)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-10 | AI Assistant | Initial comprehensive specification |

---

## References

1. `/home/azureuser/translation-app/3333-4444-stack/conference-server-externalmedia.js`
2. `/home/azureuser/translation-app/3333-4444-stack/bidirectional-timing-server.js`
3. `/home/azureuser/translation-app/3333-4444-stack/public/dashboard-single.html`
4. `SYSTEM_ARCHITECTURE_REVERSE_ENGINEERED.md`
5. `BIDIRECTIONAL_SYNC_IMPLEMENTATION.md`

---

**End of Document**
