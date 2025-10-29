/**
 * SyncBuffer - Audio Alignment System for Multi-Language Conferences
 *
 * Purpose: Synchronizes audio streams across multiple languages by holding
 * faster translation streams to align with the slowest one.
 *
 * Key Features:
 * - Per-language frame buffers (20ms granularity)
 * - Latency tracking (ASR→TTS pipeline delays)
 * - Dynamic alignment calculation
 * - QA Settings integration for manual latency override
 *
 * Example from dynamic_conference_sync.md:
 * - Hebrew: 3.25s natural + 1.16s hold = 4.41s
 * - English: 3.72s natural + 0.69s hold = 4.41s
 * - Japanese: 4.41s natural + 0.00s hold = 4.41s
 * → All aligned to 4.41s (slowest stream)
 */

const EventEmitter = require('events');
const { performance } = require('perf_hooks');

class SyncBuffer extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      frameSize: config.frameSize || 20, // 20ms frames
      sampleRate: config.sampleRate || 16000, // 16kHz
      maxBufferMs: config.maxBufferMs || 5000, // Max 5 seconds buffering
      safetyMarginMs: config.safetyMarginMs || 50, // 50ms safety buffer
      ...config
    };

    // Per-language stream buffers
    // Structure: { languageCode: { frames: [], metadata: {}, stats: {} } }
    this.languageBuffers = new Map();

    // Per-language-pair latency measurements
    // Structure: { "HE→EN": 450, "HE→JA": 610, "EN→HE": 520, ... }
    this.pipelineLatencies = new Map();

    // QA Settings: Manual latency corrections (always positive)
    // Structure: { languageCode: latencyMs }
    this.qaLatencyOverrides = new Map();

    // Reference latency (slowest stream + safety margin)
    this.refLatency = 0;

    // Metrics
    this.metrics = {
      totalFramesIngested: 0,
      totalFramesReleased: 0,
      droppedFrames: 0,
      averageHoldTime: 0,
      maxHoldTime: 0
    };

    // Running state
    this.isRunning = false;
    this.startTime = null;
  }

  /**
   * Initialize the sync buffer
   */
  async initialize() {
    console.log('[SyncBuffer] Initializing audio alignment system...');
    console.log(`[SyncBuffer] Frame size: ${this.config.frameSize}ms`);
    console.log(`[SyncBuffer] Sample rate: ${this.config.sampleRate}Hz`);
    console.log(`[SyncBuffer] Max buffer: ${this.config.maxBufferMs}ms`);

    this.isRunning = true;
    this.startTime = Date.now();

    console.log('[SyncBuffer] ✓ Initialized');
    this.emit('initialized');
    return true;
  }

  /**
   * Register a language stream
   * @param {string} languageCode - Language code (e.g., 'en', 'he', 'ja')
   * @param {object} metadata - Stream metadata (user info, channel, etc.)
   */
  registerLanguage(languageCode, metadata = {}) {
    if (this.languageBuffers.has(languageCode)) {
      console.warn(`[SyncBuffer] Language ${languageCode} already registered`);
      return false;
    }

    const buffer = {
      languageCode,
      frames: [],
      metadata: {
        registeredAt: Date.now(),
        channelId: metadata.channelId,
        userId: metadata.userId,
        ...metadata
      },
      stats: {
        totalFrames: 0,
        droppedFrames: 0,
        averageLatency: 0,
        currentHoldMs: 0
      }
    };

    this.languageBuffers.set(languageCode, buffer);
    console.log(`[SyncBuffer] ✓ Registered language: ${languageCode}`);

    this.emit('language-registered', { languageCode, metadata });
    return true;
  }

  /**
   * Unregister a language stream
   */
  unregisterLanguage(languageCode) {
    if (!this.languageBuffers.has(languageCode)) {
      console.warn(`[SyncBuffer] Language ${languageCode} not found`);
      return false;
    }

    this.languageBuffers.delete(languageCode);
    console.log(`[SyncBuffer] ✓ Unregistered language: ${languageCode}`);

    // Recalculate reference latency
    this.calculateReferenceLatency();

    this.emit('language-unregistered', { languageCode });
    return true;
  }

  /**
   * Ingest an audio frame for a specific language
   * @param {string} languageCode - Target language for this frame
   * @param {Buffer} audioBuffer - PCM audio data (16-bit, 16kHz)
   * @param {object} metadata - Frame metadata (timestamp, source language, etc.)
   */
  ingestFrame(languageCode, audioBuffer, metadata = {}) {
    const buffer = this.languageBuffers.get(languageCode);

    if (!buffer) {
      console.warn(`[SyncBuffer] Unknown language: ${languageCode}`);
      return false;
    }

    const frame = {
      data: audioBuffer,
      ingestTime: performance.now(),
      metadata: {
        timestamp: Date.now(),
        sourceLanguage: metadata.sourceLanguage || 'unknown',
        ...metadata
      }
    };

    // Add to buffer
    buffer.frames.push(frame);
    buffer.stats.totalFrames++;
    this.metrics.totalFramesIngested++;

    // Check for buffer overflow
    const maxFrames = Math.ceil(this.config.maxBufferMs / this.config.frameSize);
    if (buffer.frames.length > maxFrames) {
      console.warn(`[SyncBuffer] Buffer overflow for ${languageCode}, dropping oldest frame`);
      buffer.frames.shift();
      buffer.stats.droppedFrames++;
      this.metrics.droppedFrames++;
    }

    // Update pipeline latency if source language is provided
    if (metadata.sourceLanguage && metadata.sourceLanguage !== languageCode) {
      this.recordPipelineLatency(metadata.sourceLanguage, languageCode, metadata.pipelineDelay);
    }

    return true;
  }

  /**
   * Get an aligned frame for a specific language
   * Returns null if frame should still be held (not ready for playback)
   * @param {string} languageCode - Language to get frame for
   * @returns {Buffer|null} - Audio frame or null if not ready
   */
  getAlignedFrame(languageCode) {
    const buffer = this.languageBuffers.get(languageCode);

    if (!buffer || buffer.frames.length === 0) {
      return null;
    }

    const frame = buffer.frames[0]; // Peek at oldest frame
    const now = performance.now();
    const frameAge = now - frame.ingestTime;

    // Calculate required hold time for this language
    const holdTime = this.calculateHoldTime(languageCode, frame.metadata.sourceLanguage);

    // Check if frame has been held long enough
    if (frameAge >= holdTime) {
      // Release the frame
      const releasedFrame = buffer.frames.shift();
      this.metrics.totalFramesReleased++;

      // Update stats
      buffer.stats.currentHoldMs = frameAge;
      this.metrics.averageHoldTime = (this.metrics.averageHoldTime + frameAge) / 2;
      this.metrics.maxHoldTime = Math.max(this.metrics.maxHoldTime, frameAge);

      this.emit('frame-released', {
        languageCode,
        holdTime: frameAge,
        metadata: releasedFrame.metadata
      });

      return releasedFrame.data;
    }

    // Frame not ready yet
    return null;
  }

  /**
   * Calculate how long to hold a frame for a specific language
   * @param {string} targetLang - Target language
   * @param {string} sourceLang - Source language
   * @returns {number} - Hold time in milliseconds
   */
  calculateHoldTime(targetLang, sourceLang) {
    // Check if there's a QA override for this language
    const qaOverride = this.qaLatencyOverrides.get(targetLang);
    if (qaOverride !== undefined) {
      return qaOverride; // Use manual QA setting (always positive)
    }

    // Get pipeline latency for this language pair
    const pairKey = `${sourceLang}→${targetLang}`;
    const pipelineLatency = this.pipelineLatencies.get(pairKey) || 0;

    // Calculate hold time: refLatency - pipelineLatency
    // Faster streams need more hold time; slowest stream needs 0
    const holdTime = Math.max(0, this.refLatency - pipelineLatency);

    return holdTime;
  }

  /**
   * Record pipeline latency for a language pair
   * @param {string} sourceLang - Source language
   * @param {string} targetLang - Target language
   * @param {number} latencyMs - Measured latency (ASR→MT→TTS)
   */
  recordPipelineLatency(sourceLang, targetLang, latencyMs) {
    if (!latencyMs || latencyMs < 0) return;

    const pairKey = `${sourceLang}→${targetLang}`;

    // Use exponential moving average for smoothing
    const existing = this.pipelineLatencies.get(pairKey);
    const alpha = 0.3; // Smoothing factor
    const smoothed = existing
      ? (alpha * latencyMs) + ((1 - alpha) * existing)
      : latencyMs;

    this.pipelineLatencies.set(pairKey, smoothed);

    // Recalculate reference latency
    this.calculateReferenceLatency();

    this.emit('latency-updated', {
      sourceLang,
      targetLang,
      latency: smoothed
    });
  }

  /**
   * Calculate reference latency (slowest stream + safety margin)
   * All other streams will be aligned to this reference
   */
  calculateReferenceLatency() {
    if (this.pipelineLatencies.size === 0) {
      this.refLatency = 0;
      return;
    }

    // Find maximum latency across all language pairs
    const maxLatency = Math.max(...this.pipelineLatencies.values());

    // Add safety margin
    this.refLatency = maxLatency + this.config.safetyMarginMs;

    console.log(`[SyncBuffer] Reference latency updated: ${this.refLatency}ms`);

    this.emit('ref-latency-updated', {
      refLatency: this.refLatency,
      maxPipelineLatency: maxLatency,
      safetyMargin: this.config.safetyMarginMs
    });
  }

  /**
   * Set QA latency override for a specific language
   * This bypasses automatic latency calculation
   * @param {string} languageCode - Language code
   * @param {number} latencyMs - Manual latency value (always positive)
   */
  setQALatencyOverride(languageCode, latencyMs) {
    if (latencyMs < 0) {
      console.warn(`[SyncBuffer] QA latency must be positive, got ${latencyMs}`);
      return false;
    }

    this.qaLatencyOverrides.set(languageCode, latencyMs);
    console.log(`[SyncBuffer] QA override set: ${languageCode} = ${latencyMs}ms`);

    this.emit('qa-override-set', { languageCode, latencyMs });
    return true;
  }

  /**
   * Clear QA latency override for a specific language
   */
  clearQALatencyOverride(languageCode) {
    const removed = this.qaLatencyOverrides.delete(languageCode);
    if (removed) {
      console.log(`[SyncBuffer] QA override cleared: ${languageCode}`);
      this.emit('qa-override-cleared', { languageCode });
    }
    return removed;
  }

  /**
   * Clear all QA latency overrides
   */
  clearAllQAOverrides() {
    const count = this.qaLatencyOverrides.size;
    this.qaLatencyOverrides.clear();
    console.log(`[SyncBuffer] Cleared ${count} QA overrides`);
    this.emit('qa-overrides-cleared', { count });
    return count;
  }

  /**
   * Get current sync status for all languages
   */
  getStatus() {
    const languages = [];

    for (const [code, buffer] of this.languageBuffers.entries()) {
      const qaOverride = this.qaLatencyOverrides.get(code);

      languages.push({
        code,
        bufferedFrames: buffer.frames.length,
        bufferedMs: buffer.frames.length * this.config.frameSize,
        stats: buffer.stats,
        qaOverride: qaOverride !== undefined ? qaOverride : null,
        metadata: buffer.metadata
      });
    }

    return {
      isRunning: this.isRunning,
      refLatency: this.refLatency,
      activeLanguages: this.languageBuffers.size,
      languages,
      pipelineLatencies: Object.fromEntries(this.pipelineLatencies),
      qaOverrides: Object.fromEntries(this.qaLatencyOverrides),
      metrics: this.metrics,
      uptime: this.startTime ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      refLatency: this.refLatency,
      activeLanguages: this.languageBuffers.size,
      totalBufferedFrames: Array.from(this.languageBuffers.values())
        .reduce((sum, buf) => sum + buf.frames.length, 0)
    };
  }

  /**
   * Shutdown sync buffer
   */
  async shutdown() {
    console.log('[SyncBuffer] Shutting down...');

    this.isRunning = false;

    // Clear all buffers
    this.languageBuffers.clear();
    this.pipelineLatencies.clear();
    this.qaLatencyOverrides.clear();

    console.log('[SyncBuffer] ✓ Shutdown complete');
    this.emit('shutdown');
  }
}

module.exports = SyncBuffer;
