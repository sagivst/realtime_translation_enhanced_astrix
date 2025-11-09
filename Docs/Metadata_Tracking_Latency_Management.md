# Dynamic Conference Sync System - Implementation Plan

**Document Version:** 1.0
**Date:** October 25, 2025
**Status:** Implementation in Progress

---

## 📋 Executive Summary

This document outlines the complete implementation plan for the Dynamic Conference Synchronization System, which enables multi-language conferences with frame-accurate audio alignment across all language bridges.

**Core Challenge:** Different language pairs have different processing times (ASR→MT→TTS), resulting in misaligned playback. Hebrew might finish in 1.45s, English in 1.58s, Japanese in 1.60s. The system must hold faster streams and release all simultaneously.

**Solution:** Metadata passthrough tracking + per-call latency measurement + dynamic bridge management + synchronized playback buffers.

---

## 🎯 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Conference: conf_abc_123                                    │
│                                                              │
│  Hebrew Speaker                                             │
│  ├─ Mic Input (50ms)                                        │
│  │   ↓ [Metadata: frameId, timestamp, speaker]             │
│  ├─ Direct → HE Bridge (hold 1550ms) → HE listeners        │
│  ├─ ASR→MT→TTS → EN (1450ms, hold 150ms) → EN listeners    │
│  └─ ASR→MT→TTS → JA (1600ms, hold 0ms) → JA listeners      │
│                                                              │
│  All release at 1600ms (synchronized!) ✓                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Implementation Stages

### **Stage 1: Metadata Tracking Foundation** ⏱️
**Duration:** 2-3 hours
**Goal:** Track audio chunks from input → output with millisecond precision

#### Components

##### 1.1 Frame Correlation Map
**File:** `audiosocket-integration.js`
**Location:** Line ~380 (pcm-frame event handler)

```javascript
// Create correlation map at top of file
const frameCorrelationMap = new Map(); // frameId → metadata

// In pcm-frame handler
audioSocketOrchestrator.on('pcm-frame', async (frame) => {
    // Create frame metadata
    const frameMetadata = {
        frameId: `frame_${frame.sequenceNumber}_${Date.now()}`,
        ingestTimestamp: Date.now(),
        sequenceNumber: frame.sequenceNumber,
        sourceSpeaker: activeConnectionId,
        sourceLanguage: getSourceLang(),
        targetLanguages: [getTargetLang()], // Will expand for multi-language
        duration: frame.duration
    };

    // Store in correlation map
    frameCorrelationMap.set(frame.sequenceNumber, frameMetadata);

    // Clean old entries (keep last 1000)
    if (frameCorrelationMap.size > 1000) {
        const firstKey = frameCorrelationMap.keys().next().value;
        frameCorrelationMap.delete(firstKey);
    }

    // Pass metadata to ASR
    if (asrWorker && asrWorker.connected) {
        asrWorker.sendAudio(frame.pcm, {
            segmentId: frame.sequenceNumber,
            duration: frame.duration,
            metadata: frameMetadata  // ← NEW
        });
    }

    // ... rest of existing code
});
```

##### 1.2 ASR Worker Metadata Passthrough
**File:** `asr-streaming-worker.js`
**Location:** Line ~270 (transcript event creation)

```javascript
// Store metadata from sendAudio
sendAudio(audioData, options = {}) {
    // ... existing code ...

    // Store metadata for correlation
    this.lastFrameMetadata = options.metadata;

    // ... send to Deepgram ...
}

// In transcript event creation
const transcriptEvent = {
    type,
    text: transcript,
    confidence: alternative.confidence || null,
    words: alternative.words || [],
    start: data.start || 0,
    duration: data.duration || 0,
    latency,
    language: this.language,
    sessionId: this.sessionId,

    // ← NEW: Preserve input metadata
    metadata: this.lastFrameMetadata,
    asrTimestamp: Date.now()
};
```

##### 1.3 Translation Pipeline Metadata
**File:** `audiosocket-integration.js`
**Location:** Line ~188 (processTranslationPipeline function)

```javascript
async function processTranslationPipeline(originalText, metadata = {}) {
    const pipelineStart = Date.now();

    // Calculate input latency if metadata available
    const inputLatency = metadata?.ingestTimestamp
        ? (pipelineStart - metadata.ingestTimestamp)
        : 0;

    console.log('[Pipeline] ═══════════════════════════════════════');
    console.log('[Pipeline] Starting translation pipeline');
    console.log('[Pipeline] Original text:', originalText);
    console.log('[Pipeline] Frame ID:', metadata?.frameId);
    console.log('[Pipeline] Input latency:', inputLatency, 'ms');

    try {
        // Step 1: Translate
        const translationStart = Date.now();
        // ... translation code ...
        const translationTime = Date.now() - translationStart;

        // Step 2: TTS
        const ttsStart = Date.now();
        // ... TTS code ...
        const ttsTime = Date.now() - ttsStart;

        // Step 3: Convert
        const convertStart = Date.now();
        // ... conversion code ...
        const convertTime = Date.now() - convertStart;

        // Calculate total pipeline time
        const totalTime = Date.now() - pipelineStart;

        // Create enhanced metadata for output
        const outputMetadata = {
            ...metadata,
            outputTimestamp: Date.now(),
            latencyBreakdown: {
                input: inputLatency,
                asr: metadata?.asrTimestamp ? (translationStart - metadata.asrTimestamp) : 0,
                translation: translationTime,
                tts: ttsTime,
                convert: convertTime,
                total: totalTime
            },
            pipelineStages: {
                asrComplete: metadata?.asrTimestamp,
                translationComplete: translationStart + translationTime,
                ttsComplete: ttsStart + ttsTime,
                outputReady: Date.now()
            }
        };

        // Emit enhanced metrics
        const io = getIO();
        if (io) {
            io.emit('pipelineComplete', {
                original: originalText,
                translation: translationResult.text,
                metadata: outputMetadata,
                latencyBreakdown: outputMetadata.latencyBreakdown
            });

            // Send to conference monitor
            io.emit('latency-update', {
                frameId: metadata?.frameId,
                asrLatency: outputMetadata.latencyBreakdown.asr,
                mtLatency: outputMetadata.latencyBreakdown.translation,
                ttsLatency: outputMetadata.latencyBreakdown.tts,
                totalLatency: outputMetadata.latencyBreakdown.total
            });
        }

        // TODO Stage 3: Send to SyncBuffer with metadata
        // syncBuffer.ingestFrame(targetLang, pcm8Buffer, outputMetadata);

    } catch (error) {
        console.error('[Pipeline] ✗ Pipeline error:', error.message);
    }
}
```

##### 1.4 Update ASR Event Handler
**File:** `audiosocket-integration.js`
**Location:** Line ~150 (ASR final event handler)

```javascript
// Handle FINAL transcripts (trigger translation pipeline)
asrWorker.on('final', async (transcript) => {
    console.log('[Pipeline] Final:', transcript.text);

    // Send transcript to browser
    const io = getIO();
    if (io) {
        io.emit('transcriptionFinal', {
            text: transcript.text,
            transcript: transcript.text,
            language: transcript.language,
            confidence: transcript.confidence,
            type: 'final',
            metadata: transcript.metadata  // ← NEW
        });
    }

    // Pass metadata to translation pipeline
    await processTranslationPipeline(transcript.text, transcript.metadata);
});
```

#### Stage 1 Deliverables
- ✅ Frame correlation map tracking
- ✅ ASR metadata passthrough
- ✅ Translation pipeline metadata tracking
- ✅ Real-time latency breakdown per component
- ✅ Socket.IO events for monitoring UI

---

### **Stage 2: Per-Call Latency Management** 📊
**Duration:** 3-4 hours
**Goal:** High-frequency latency measurement and dynamic reference calculation

#### Components

##### 2.1 PerCallLatencyManager Class
**File:** `src/latency/per-call-latency-manager.js` (new file)

```javascript
/**
 * Per-Call Latency Manager
 * Tracks latency for each audio channel in a conference call
 * Calculates dynamic reference latency and hold times
 */

const EventEmitter = require('events');

class PerCallLatencyManager extends EventEmitter {
  constructor(callId, config = {}) {
    super();

    this.callId = callId;
    this.config = {
      measurementWindow: config.measurementWindow || 50, // Keep last 50 measurements
      measurementRate: config.measurementRate || 20,     // Measure every 20ms
      safetyMarginMs: config.safetyMarginMs || 50,
      ...config
    };

    // Channel tracking
    // channelId = "sourceSpeaker_sourceLang→targetLang_targetBridge"
    this.channels = new Map();

    // Reference latency (slowest channel)
    this.refLatency = 0;
    this.slowestChannel = null;

    // Measurement interval
    this.measurementInterval = null;

    // Metrics
    this.metrics = {
      totalMeasurements: 0,
      channelsTracked: 0,
      refLatencyUpdates: 0
    };
  }

  /**
   * Start latency measurements
   */
  start() {
    if (this.measurementInterval) {
      console.warn(`[LatencyMgr] Already running for ${this.callId}`);
      return;
    }

    console.log(`[LatencyMgr] Starting for call: ${this.callId}`);

    // Measure every 20ms (50Hz)
    this.measurementInterval = setInterval(() => {
      this.calculateReferenceLatency();
    }, this.config.measurementRate);

    this.emit('started', { callId: this.callId });
  }

  /**
   * Stop measurements
   */
  stop() {
    if (this.measurementInterval) {
      clearInterval(this.measurementInterval);
      this.measurementInterval = null;
    }

    console.log(`[LatencyMgr] Stopped for call: ${this.callId}`);
    this.emit('stopped', { callId: this.callId });
  }

  /**
   * Record latency measurement for a channel
   */
  recordLatency(channelId, latencyMs, metadata = {}) {
    if (!this.channels.has(channelId)) {
      this.channels.set(channelId, {
        channelId,
        measurements: [],
        currentLatency: 0,
        holdTime: 0,
        metadata: {
          sourceSpeaker: metadata.sourceSpeaker,
          sourceLanguage: metadata.sourceLanguage,
          targetLanguage: metadata.targetLanguage,
          targetBridge: metadata.targetBridge,
          isDirect: metadata.isDirect || false, // Direct mic vs translation
          createdAt: Date.now()
        },
        stats: {
          min: Infinity,
          max: 0,
          avg: 0,
          count: 0
        }
      });

      this.metrics.channelsTracked++;
      console.log(`[LatencyMgr] New channel: ${channelId}`);
    }

    const channel = this.channels.get(channelId);

    // Add measurement
    channel.measurements.push({
      latency: latencyMs,
      timestamp: Date.now()
    });

    // Keep only last N measurements
    if (channel.measurements.length > this.config.measurementWindow) {
      channel.measurements.shift();
    }

    // Calculate moving average
    const sum = channel.measurements.reduce((acc, m) => acc + m.latency, 0);
    const avg = sum / channel.measurements.length;

    // Update channel stats
    channel.currentLatency = Math.round(avg);
    channel.stats.min = Math.min(channel.stats.min, latencyMs);
    channel.stats.max = Math.max(channel.stats.max, latencyMs);
    channel.stats.avg = Math.round(avg);
    channel.stats.count++;

    this.metrics.totalMeasurements++;

    this.emit('latency-recorded', {
      callId: this.callId,
      channelId,
      latency: latencyMs,
      avgLatency: channel.currentLatency
    });
  }

  /**
   * Calculate reference latency (slowest channel + safety margin)
   */
  calculateReferenceLatency() {
    if (this.channels.size === 0) {
      this.refLatency = 0;
      this.slowestChannel = null;
      return;
    }

    // Find slowest channel
    let maxLatency = 0;
    let slowestId = null;

    for (const [channelId, channel] of this.channels.entries()) {
      if (channel.currentLatency > maxLatency) {
        maxLatency = channel.currentLatency;
        slowestId = channelId;
      }
    }

    const oldRefLatency = this.refLatency;
    this.refLatency = maxLatency + this.config.safetyMarginMs;
    this.slowestChannel = slowestId;

    // Calculate hold times for all channels
    for (const [channelId, channel] of this.channels.entries()) {
      channel.holdTime = Math.max(0, this.refLatency - channel.currentLatency);
    }

    // Emit if reference latency changed significantly (> 10ms)
    if (Math.abs(this.refLatency - oldRefLatency) > 10) {
      this.metrics.refLatencyUpdates++;

      console.log(`[LatencyMgr] ${this.callId}: RefLatency updated: ${this.refLatency}ms (slowest: ${slowestId})`);

      this.emit('ref-latency-updated', {
        callId: this.callId,
        refLatency: this.refLatency,
        slowestChannel: slowestId,
        channelCount: this.channels.size
      });
    }
  }

  /**
   * Get hold time for a specific channel
   */
  getHoldTime(channelId) {
    const channel = this.channels.get(channelId);
    return channel ? channel.holdTime : 0;
  }

  /**
   * Remove channel from tracking
   */
  removeChannel(channelId) {
    const removed = this.channels.delete(channelId);
    if (removed) {
      console.log(`[LatencyMgr] Removed channel: ${channelId}`);
      this.calculateReferenceLatency(); // Recalculate after removal

      this.emit('channel-removed', {
        callId: this.callId,
        channelId
      });
    }
    return removed;
  }

  /**
   * Get status for all channels
   */
  getStatus() {
    const channels = [];

    for (const [channelId, channel] of this.channels.entries()) {
      channels.push({
        channelId,
        name: this.formatChannelName(channel.metadata),
        currentLatency: channel.currentLatency,
        holdTime: channel.holdTime,
        stats: channel.stats,
        metadata: channel.metadata,
        measurementCount: channel.measurements.length
      });
    }

    // Sort by latency (slowest first)
    channels.sort((a, b) => b.currentLatency - a.currentLatency);

    return {
      callId: this.callId,
      refLatency: this.refLatency,
      slowestChannel: this.slowestChannel,
      activeChannels: this.channels.size,
      channels,
      metrics: this.metrics,
      isRunning: this.measurementInterval !== null
    };
  }

  /**
   * Format channel name for display
   */
  formatChannelName(metadata) {
    if (metadata.isDirect) {
      return `${metadata.sourceSpeaker} → ${metadata.targetBridge} (Direct)`;
    } else {
      return `${metadata.sourceSpeaker} → ${metadata.sourceLanguage}→${metadata.targetLanguage} → ${metadata.targetBridge}`;
    }
  }

  /**
   * Shutdown
   */
  shutdown() {
    this.stop();
    this.channels.clear();
    console.log(`[LatencyMgr] Shutdown complete for ${this.callId}`);
    this.emit('shutdown', { callId: this.callId });
  }
}

module.exports = PerCallLatencyManager;
```

##### 2.2 Global Latency Coordinator
**File:** `src/latency/latency-coordinator.js` (new file)

```javascript
/**
 * Global Latency Coordinator
 * Manages PerCallLatencyManager instances for all active calls
 */

const EventEmitter = require('events');
const PerCallLatencyManager = require('./per-call-latency-manager');

class LatencyCoordinator extends EventEmitter {
  constructor() {
    super();

    // Map of callId → PerCallLatencyManager
    this.callManagers = new Map();

    // Global metrics
    this.globalMetrics = {
      totalCalls: 0,
      activeCalls: 0,
      totalChannels: 0,
      avgRefLatency: 0
    };
  }

  /**
   * Create or get latency manager for a call
   */
  getManager(callId) {
    if (!this.callManagers.has(callId)) {
      console.log(`[LatencyCoord] Creating manager for call: ${callId}`);

      const manager = new PerCallLatencyManager(callId);

      // Forward events
      manager.on('ref-latency-updated', (data) => {
        this.emit('ref-latency-updated', data);
      });

      this.callManagers.set(callId, manager);
      this.globalMetrics.totalCalls++;
      this.globalMetrics.activeCalls++;

      manager.start();
    }

    return this.callManagers.get(callId);
  }

  /**
   * Remove call manager
   */
  removeCall(callId) {
    const manager = this.callManagers.get(callId);
    if (manager) {
      manager.shutdown();
      this.callManagers.delete(callId);
      this.globalMetrics.activeCalls--;

      console.log(`[LatencyCoord] Removed call: ${callId}`);
      this.emit('call-removed', { callId });
    }
  }

  /**
   * Get global status
   */
  getGlobalStatus() {
    const calls = [];
    let totalChannels = 0;
    let totalRefLatency = 0;

    for (const [callId, manager] of this.callManagers.entries()) {
      const status = manager.getStatus();
      calls.push(status);
      totalChannels += status.activeChannels;
      totalRefLatency += status.refLatency;
    }

    this.globalMetrics.totalChannels = totalChannels;
    this.globalMetrics.avgRefLatency = this.callManagers.size > 0
      ? Math.round(totalRefLatency / this.callManagers.size)
      : 0;

    return {
      calls,
      globalMetrics: this.globalMetrics
    };
  }

  /**
   * Shutdown all
   */
  shutdown() {
    console.log('[LatencyCoord] Shutting down all call managers...');

    for (const manager of this.callManagers.values()) {
      manager.shutdown();
    }

    this.callManagers.clear();
    console.log('[LatencyCoord] Shutdown complete');
  }
}

module.exports = LatencyCoordinator;
```

#### Stage 2 Deliverables
- ✅ PerCallLatencyManager class
- ✅ High-frequency latency measurement (20ms rate)
- ✅ Channel-based tracking
- ✅ Dynamic reference latency calculation
- ✅ Moving average smoothing
- ✅ Global coordinator for multi-call management

---

### **Stage 3: Dynamic Bridge System** 🌉
**Duration:** 4-5 hours
**Goal:** Create/manage per-language conference bridges with synchronized playback

#### Components

##### 3.1 DynamicBridgeManager
**File:** `src/bridges/dynamic-bridge-manager.js` (new file)

```javascript
/**
 * Dynamic Bridge Manager
 * Creates and manages Asterisk conference bridges per language per call
 */

const EventEmitter = require('events');
const SyncBuffer = require('../sync/sync-buffer');

class DynamicBridgeManager extends EventEmitter {
  constructor(callId, ariClient) {
    super();

    this.callId = callId;
    this.ariClient = ariClient;

    // Map of language → bridge info
    this.bridges = new Map();

    // Configuration
    this.config = {
      bridgeType: 'softmix',
      mixingInterval: 20,      // 20ms mixing
      internalSampleRate: 16000
    };
  }

  /**
   * Create bridge for a language
   */
  async createBridge(language) {
    if (this.bridges.has(language)) {
      console.warn(`[BridgeMgr] Bridge already exists: ${this.callId}/${language}`);
      return this.bridges.get(language);
    }

    const bridgeId = `bridge-${language}-${this.callId}`;

    console.log(`[BridgeMgr] Creating bridge: ${bridgeId}`);

    try {
      // Create Asterisk bridge via ARI
      const asteriskBridge = await this.ariClient.bridges.create({
        type: this.config.bridgeType,
        bridgeId: bridgeId,
        name: `${language.toUpperCase()} Conference - ${this.callId}`
      });

      // Create SyncBuffer for this bridge
      const syncBuffer = new SyncBuffer({
        frameSize: 20,
        sampleRate: 16000,
        maxBufferMs: 5000,
        safetyMarginMs: 50
      });

      await syncBuffer.initialize();

      // Register language in SyncBuffer
      syncBuffer.registerLanguage(language, {
        bridgeId,
        callId: this.callId
      });

      const bridgeInfo = {
        bridgeId,
        language,
        asteriskBridge,
        syncBuffer,
        participants: [],
        channels: [],
        createdAt: Date.now(),
        active: true
      };

      this.bridges.set(language, bridgeInfo);

      console.log(`[BridgeMgr] ✓ Bridge created: ${bridgeId}`);
      this.emit('bridge-created', { callId: this.callId, language, bridgeId });

      return bridgeInfo;

    } catch (error) {
      console.error(`[BridgeMgr] Failed to create bridge for ${language}:`, error);
      throw error;
    }
  }

  /**
   * Get or create bridge for language
   */
  async getBridge(language) {
    if (!this.bridges.has(language)) {
      return await this.createBridge(language);
    }
    return this.bridges.get(language);
  }

  /**
   * Add participant to bridge
   */
  async addParticipant(language, channelId, participantInfo) {
    const bridge = await this.getBridge(language);

    try {
      // Add channel to Asterisk bridge
      await bridge.asteriskBridge.addChannel({
        channel: channelId,
        role: 'participant'
      });

      // Track participant
      bridge.participants.push({
        channelId,
        ...participantInfo,
        joinedAt: Date.now()
      });

      console.log(`[BridgeMgr] Added participant to ${bridge.bridgeId}: ${channelId}`);
      this.emit('participant-added', {
        callId: this.callId,
        language,
        channelId
      });

      return true;

    } catch (error) {
      console.error(`[BridgeMgr] Failed to add participant:`, error);
      return false;
    }
  }

  /**
   * Remove participant from bridge
   */
  async removeParticipant(language, channelId) {
    const bridge = this.bridges.get(language);
    if (!bridge) return false;

    try {
      // Remove from Asterisk bridge
      await bridge.asteriskBridge.removeChannel({
        channel: channelId
      });

      // Remove from participants list
      bridge.participants = bridge.participants.filter(p => p.channelId !== channelId);

      console.log(`[BridgeMgr] Removed participant from ${bridge.bridgeId}: ${channelId}`);
      this.emit('participant-removed', {
        callId: this.callId,
        language,
        channelId
      });

      // Destroy bridge if empty
      if (bridge.participants.length === 0) {
        await this.destroyBridge(language);
      }

      return true;

    } catch (error) {
      console.error(`[BridgeMgr] Failed to remove participant:`, error);
      return false;
    }
  }

  /**
   * Destroy bridge
   */
  async destroyBridge(language) {
    const bridge = this.bridges.get(language);
    if (!bridge) return false;

    console.log(`[BridgeMgr] Destroying bridge: ${bridge.bridgeId}`);

    try {
      // Shutdown SyncBuffer
      await bridge.syncBuffer.shutdown();

      // Destroy Asterisk bridge
      await bridge.asteriskBridge.destroy();

      this.bridges.delete(language);

      console.log(`[BridgeMgr] ✓ Bridge destroyed: ${bridge.bridgeId}`);
      this.emit('bridge-destroyed', {
        callId: this.callId,
        language,
        bridgeId: bridge.bridgeId
      });

      return true;

    } catch (error) {
      console.error(`[BridgeMgr] Failed to destroy bridge:`, error);
      return false;
    }
  }

  /**
   * Get status for all bridges
   */
  getStatus() {
    const bridges = [];

    for (const [language, bridge] of this.bridges.entries()) {
      const syncStatus = bridge.syncBuffer.getStatus();

      bridges.push({
        language,
        bridgeId: bridge.bridgeId,
        participants: bridge.participants.length,
        participantList: bridge.participants,
        syncBuffer: {
          refLatency: syncStatus.refLatency,
          activeLanguages: syncStatus.activeLanguages,
          bufferedFrames: syncStatus.metrics.totalBufferedFrames
        },
        createdAt: bridge.createdAt,
        active: bridge.active
      });
    }

    return {
      callId: this.callId,
      activeBridges: this.bridges.size,
      bridges
    };
  }

  /**
   * Shutdown all bridges
   */
  async shutdown() {
    console.log(`[BridgeMgr] Shutting down all bridges for ${this.callId}...`);

    const promises = [];
    for (const language of this.bridges.keys()) {
      promises.push(this.destroyBridge(language));
    }

    await Promise.all(promises);

    console.log(`[BridgeMgr] ✓ All bridges destroyed for ${this.callId}`);
    this.emit('shutdown', { callId: this.callId });
  }
}

module.exports = DynamicBridgeManager;
```

##### 3.2 ConferenceOrchestrator
**File:** `src/orchestrator/conference-orchestrator.js` (new file)

```javascript
/**
 * Conference Orchestrator
 * Manages complete multi-language conference sessions
 * Coordinates bridges, latency tracking, and audio routing
 */

const EventEmitter = require('events');
const DynamicBridgeManager = require('../bridges/dynamic-bridge-manager');
const PerCallLatencyManager = require('../latency/per-call-latency-manager');

class ConferenceOrchestrator extends EventEmitter {
  constructor(conferenceId, ariClient) {
    super();

    this.conferenceId = conferenceId;
    this.ariClient = ariClient;

    // Components
    this.bridgeManager = new DynamicBridgeManager(conferenceId, ariClient);
    this.latencyManager = new PerCallLatencyManager(conferenceId);

    // Participants
    this.participants = new Map(); // participantId → info

    // Audio routing
    this.audioRoutes = new Map(); // participantId → { sourceLang, targetBridges[] }

    // Session info
    this.startTime = Date.now();
    this.active = true;

    // Wire up events
    this.setupEventHandlers();

    // Start latency tracking
    this.latencyManager.start();
  }

  /**
   * Setup event handlers between components
   */
  setupEventHandlers() {
    // Forward bridge events
    this.bridgeManager.on('bridge-created', (data) => {
      this.emit('bridge-created', { conferenceId: this.conferenceId, ...data });
    });

    this.bridgeManager.on('participant-added', (data) => {
      this.emit('participant-added', { conferenceId: this.conferenceId, ...data });
    });

    // Forward latency events
    this.latencyManager.on('ref-latency-updated', (data) => {
      this.emit('ref-latency-updated', { conferenceId: this.conferenceId, ...data });

      // Update all SyncBuffers with new reference latency
      this.updateSyncBuffersRefLatency(data.refLatency);
    });
  }

  /**
   * Add participant to conference
   */
  async addParticipant(participantId, participantInfo) {
    const { language, channelId, name, userId } = participantInfo;

    console.log(`[Orchestrator] Adding participant ${participantId} (${language}) to ${this.conferenceId}`);

    // Store participant info
    this.participants.set(participantId, {
      participantId,
      language,
      channelId,
      name,
      userId,
      joinedAt: Date.now()
    });

    // Add to appropriate bridge
    await this.bridgeManager.addParticipant(language, channelId, participantInfo);

    // Setup audio routing for this participant
    await this.setupAudioRouting(participantId, language);

    this.emit('participant-joined', {
      conferenceId: this.conferenceId,
      participantId,
      language
    });
  }

  /**
   * Setup audio routing for participant
   */
  async setupAudioRouting(participantId, sourceLang) {
    // Get all active languages
    const activeLanguages = new Set();
    for (const participant of this.participants.values()) {
      activeLanguages.add(participant.language);
    }

    // Create routes for all OTHER languages
    const targetBridges = Array.from(activeLanguages).filter(lang => lang !== sourceLang);

    // Also include own language if multiple participants in same language
    const participantsInLang = Array.from(this.participants.values())
      .filter(p => p.language === sourceLang);

    if (participantsInLang.length > 1) {
      targetBridges.push(sourceLang); // Need direct audio to own bridge
    }

    this.audioRoutes.set(participantId, {
      sourceLang,
      targetBridges
    });

    console.log(`[Orchestrator] Audio routing: ${participantId} (${sourceLang}) → [${targetBridges.join(', ')}]`);
  }

  /**
   * Route audio frame from participant
   */
  async routeAudioFrame(participantId, audioBuffer, frameMetadata) {
    const participant = this.participants.get(participantId);
    if (!participant) {
      console.warn(`[Orchestrator] Unknown participant: ${participantId}`);
      return;
    }

    const routes = this.audioRoutes.get(participantId);
    if (!routes) {
      console.warn(`[Orchestrator] No routes for participant: ${participantId}`);
      return;
    }

    const { sourceLang, targetBridges } = routes;

    // For each target bridge...
    for (const targetLang of targetBridges) {
      const bridge = await this.bridgeManager.getBridge(targetLang);

      if (targetLang === sourceLang) {
        // Direct audio (mic → same language bridge)
        const channelId = `${participantId}_${sourceLang}→${sourceLang}_direct`;

        // Record latency measurement (~50ms for direct)
        this.latencyManager.recordLatency(channelId, 50, {
          sourceSpeaker: participantId,
          sourceLanguage: sourceLang,
          targetLanguage: sourceLang,
          targetBridge: `bridge-${sourceLang}`,
          isDirect: true
        });

        // Ingest to SyncBuffer with hold time
        const holdTime = this.latencyManager.getHoldTime(channelId);

        setTimeout(() => {
          // TODO: Send to bridge after hold time
          // bridge.asteriskBridge.playAudio(audioBuffer);
        }, holdTime);

      } else {
        // Translation path (will be handled by pipeline)
        // The translation pipeline will call back with translated audio

        // For now, just create channel ID for tracking
        const channelId = `${participantId}_${sourceLang}→${targetLang}_${targetLang}`;

        // Pipeline will record actual latency when translation completes
        // this.recordTranslationLatency(channelId, pipelineLatency);
      }
    }
  }

  /**
   * Record translation pipeline latency
   * Called when translation completes
   */
  recordTranslationLatency(participantId, targetLang, pipelineLatency, metadata) {
    const participant = this.participants.get(participantId);
    if (!participant) return;

    const channelId = `${participantId}_${participant.language}→${targetLang}_${targetLang}`;

    this.latencyManager.recordLatency(channelId, pipelineLatency, {
      sourceSpeaker: participantId,
      sourceLanguage: participant.language,
      targetLanguage: targetLang,
      targetBridge: `bridge-${targetLang}`,
      isDirect: false
    });

    // Get hold time for this channel
    const holdTime = this.latencyManager.getHoldTime(channelId);

    return holdTime;
  }

  /**
   * Update all SyncBuffers with new reference latency
   */
  updateSyncBuffersRefLatency(refLatency) {
    const status = this.bridgeManager.getStatus();

    for (const bridgeInfo of status.bridges) {
      const bridge = this.bridgeManager.bridges.get(bridgeInfo.language);
      if (bridge && bridge.syncBuffer) {
        // Update SyncBuffer's reference latency
        bridge.syncBuffer.refLatency = refLatency;
      }
    }
  }

  /**
   * Remove participant
   */
  async removeParticipant(participantId) {
    const participant = this.participants.get(participantId);
    if (!participant) return false;

    console.log(`[Orchestrator] Removing participant ${participantId} from ${this.conferenceId}`);

    // Remove from bridge
    await this.bridgeManager.removeParticipant(participant.language, participant.channelId);

    // Remove audio routing
    this.audioRoutes.delete(participantId);

    // Remove latency tracking for this participant's channels
    const channels = Array.from(this.latencyManager.channels.keys())
      .filter(ch => ch.startsWith(participantId));

    for (const channelId of channels) {
      this.latencyManager.removeChannel(channelId);
    }

    // Remove participant
    this.participants.delete(participantId);

    this.emit('participant-left', {
      conferenceId: this.conferenceId,
      participantId
    });

    return true;
  }

  /**
   * Get conference status
   */
  getStatus() {
    const bridgeStatus = this.bridgeManager.getStatus();
    const latencyStatus = this.latencyManager.getStatus();

    return {
      conferenceId: this.conferenceId,
      startTime: this.startTime,
      uptime: Date.now() - this.startTime,
      active: this.active,
      participants: Array.from(this.participants.values()),
      participantCount: this.participants.size,
      bridges: bridgeStatus.bridges,
      bridgeCount: bridgeStatus.activeBridges,
      latency: {
        refLatency: latencyStatus.refLatency,
        slowestChannel: latencyStatus.slowestChannel,
        channels: latencyStatus.channels
      }
    };
  }

  /**
   * Shutdown conference
   */
  async shutdown() {
    console.log(`[Orchestrator] Shutting down conference: ${this.conferenceId}`);

    this.active = false;

    // Stop latency tracking
    this.latencyManager.stop();

    // Destroy all bridges
    await this.bridgeManager.shutdown();

    // Clear participants
    this.participants.clear();
    this.audioRoutes.clear();

    console.log(`[Orchestrator] ✓ Conference shutdown: ${this.conferenceId}`);
    this.emit('shutdown', { conferenceId: this.conferenceId });
  }
}

module.exports = ConferenceOrchestrator;
```

#### Stage 3 Deliverables
- ✅ DynamicBridgeManager for Asterisk bridge creation
- ✅ SyncBuffer per bridge
- ✅ ConferenceOrchestrator for session management
- ✅ Audio routing logic (direct + translated)
- ✅ Integration with PerCallLatencyManager
- ✅ Event-driven architecture

---

### **Stage 4: Monitoring & Visualization** 📈
**Duration:** 2 hours
**Goal:** Connect monitoring UI to backend data

#### Components

##### 4.1 Conference Monitor Backend
**File:** `conference-monitor-backend.js` (new file)

```javascript
/**
 * Conference Monitor Backend
 * Provides Socket.IO handlers for conference monitoring UI
 */

class ConferenceMonitorBackend {
  constructor(conferenceCoordinator) {
    this.conferenceCoordinator = conferenceCoordinator; // Manages all conferences
  }

  /**
   * Register Socket.IO handlers
   */
  registerSocketHandlers(io) {
    io.on('connection', (socket) => {
      console.log('[ConferenceMonitor] Client connected:', socket.id);

      // Handle status requests
      socket.on('get-conference-status', () => {
        this.sendConferenceStatus(socket);
      });

      // Send initial status
      this.sendConferenceStatus(socket);
    });

    // Send updates every 2 seconds
    setInterval(() => {
      this.broadcastStatus(io);
    }, 2000);
  }

  /**
   * Send conference status to client
   */
  sendConferenceStatus(target) {
    const status = this.conferenceCoordinator.getGlobalStatus();

    const response = {
      conferences: status.conferences.map(conf => ({
        id: conf.conferenceId,
        participants: conf.participantCount,
        refLatency: conf.latency.refLatency,
        startTime: conf.startTime,
        bridges: conf.bridges
      })),
      systemMetrics: this.calculateSystemMetrics(status),
      channels: this.formatChannels(status),
      syncStatus: this.formatSyncStatus(status)
    };

    target.emit('conference-status', response);
  }

  /**
   * Broadcast to all clients
   */
  broadcastStatus(io) {
    const status = this.conferenceCoordinator.getGlobalStatus();

    const response = {
      conferences: status.conferences.map(conf => ({
        id: conf.conferenceId,
        participants: conf.participantCount,
        refLatency: conf.latency.refLatency,
        startTime: conf.startTime,
        bridges: conf.bridges
      })),
      systemMetrics: this.calculateSystemMetrics(status),
      channels: this.formatChannels(status),
      syncStatus: this.formatSyncStatus(status)
    };

    io.emit('conference-status', response);
  }

  /**
   * Calculate system-wide metrics
   */
  calculateSystemMetrics(status) {
    let totalASR = 0, totalMT = 0, totalTTS = 0, totalSync = 0;
    let channelCount = 0;
    let totalFrames = 0, framesInTransit = 0, droppedFrames = 0;

    for (const conf of status.conferences) {
      for (const channel of conf.latency.channels) {
        const breakdown = channel.latencyBreakdown || {};
        totalASR += breakdown.asr || 0;
        totalMT += breakdown.translation || 0;
        totalTTS += breakdown.tts || 0;
        totalSync += channel.holdTime || 0;
        channelCount++;
      }

      for (const bridge of conf.bridges) {
        totalFrames += bridge.syncBuffer.totalFramesProcessed || 0;
        framesInTransit += bridge.syncBuffer.bufferedFrames || 0;
        droppedFrames += bridge.syncBuffer.droppedFrames || 0;
      }
    }

    return {
      avgTotalLatency: channelCount > 0
        ? Math.round((totalASR + totalMT + totalTTS + totalSync) / channelCount)
        : 0,
      avgASRLatency: channelCount > 0 ? Math.round(totalASR / channelCount) : 0,
      avgMTLatency: channelCount > 0 ? Math.round(totalMT / channelCount) : 0,
      avgTTSLatency: channelCount > 0 ? Math.round(totalTTS / channelCount) : 0,
      avgSyncHold: channelCount > 0 ? Math.round(totalSync / channelCount) : 0,
      activeChannels: channelCount,
      totalFrames,
      framesInTransit,
      droppedFrames
    };
  }

  /**
   * Format channels for UI
   */
  formatChannels(status) {
    const channels = [];

    for (const conf of status.conferences) {
      for (const channel of conf.latency.channels) {
        const breakdown = channel.latencyBreakdown || {};

        channels.push({
          name: channel.name,
          inputLatency: breakdown.input || 0,
          asrLatency: breakdown.asr || 0,
          mtLatency: breakdown.translation || 0,
          ttsLatency: breakdown.tts || 0,
          holdTime: channel.holdTime || 0
        });
      }
    }

    return channels;
  }

  /**
   * Format sync status for UI
   */
  formatSyncStatus(status) {
    const holdTimes = [];

    for (const conf of status.conferences) {
      for (const channel of conf.latency.channels) {
        holdTimes.push({
          channel: channel.name,
          holdTime: channel.holdTime || 0
        });
      }
    }

    return {
      refLatency: status.conferences[0]?.latency?.refLatency || 0,
      holdTimes
    };
  }
}

module.exports = ConferenceMonitorBackend;
```

#### Stage 4 Deliverables
- ✅ Conference Monitor UI (already created)
- ✅ Backend Socket.IO handlers
- ✅ Real-time status updates
- ✅ Component latency breakdown
- ✅ Channel visualization
- ✅ Timeline chart

---

## 🎯 Success Criteria

**Stage 1:**
- [ ] Frame metadata tracked from input to output
- [ ] Sub-millisecond timestamp precision
- [ ] Component latency breakdown visible in logs
- [ ] Socket.IO events for monitoring

**Stage 2:**
- [ ] Per-call latency manager active
- [ ] 20ms measurement frequency
- [ ] Dynamic reference latency calculation
- [ ] Channel-based hold time calculation

**Stage 3:**
- [ ] Asterisk bridges created per language
- [ ] SyncBuffer per bridge operational
- [ ] Audio routing (direct + translated)
- [ ] Hold times applied correctly

**Stage 4:**
- [ ] Monitoring UI shows real data
- [ ] Real-time updates every 2 seconds
- [ ] Component latency visible
- [ ] Timeline chart functioning

---

## 📊 Testing Plan

### Unit Testing
- Metadata passthrough (verify IDs preserved)
- Latency calculation accuracy
- Hold time formulas
- SyncBuffer frame alignment

### Integration Testing
- End-to-end latency measurement
- Multi-language conference (3+ languages)
- Participant join/leave
- Bridge creation/destruction

### Performance Testing
- 10+ participant conference
- Latency under load
- Memory usage with multiple conferences
- CPU usage during 20ms measurements

### Verification Testing
- Audio synchronization (manual listening test)
- No audio dropouts
- Smooth playback
- Acceptable total latency (< 2.5s)

---

## 🔧 Deployment Checklist

- [ ] Stage 1 code deployed
- [ ] Stage 2 code deployed
- [ ] Stage 3 code deployed
- [ ] Stage 4 code deployed
- [ ] Monitoring UI accessible
- [ ] Asterisk ARI configured
- [ ] Test conference successful
- [ ] Production rollout complete

---

## 📚 References

- **Architecture Doc:** `dynamic_conference_sync.md`
- **SyncBuffer Implementation:** `src/sync/sync-buffer.js`
- **Frame Orchestrator:** `src/orchestrator/frame-orchestrator.js`
- **Monitoring UI:** `public/conference-monitor.html`

---

**End of Document**
