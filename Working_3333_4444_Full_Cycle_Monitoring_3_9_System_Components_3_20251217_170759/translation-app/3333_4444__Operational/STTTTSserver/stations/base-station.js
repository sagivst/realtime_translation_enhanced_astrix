/**
 * Base Station Class
 *
 * Foundation class for all 8 audio quality monitoring stations.
 * Provides common functionality for metrics tracking, event logging,
 * WAV recording, and buffer management.
 *
 * Design Principles:
 * - Buffer is the LAST action per station (not first)
 * - Flow: Audio → Process → Buffer → Send
 * - All parameters configurable via audio-buffer-config.json
 * - LOG and WAV features controlled per station
 */

const EventEmitter = require('events');
const dgram = require('dgram');

class BaseStation extends EventEmitter {
  constructor(stationId, config, dependencies = {}) {
    super();

    this.stationId = stationId;
    this.config = config;
    this.enabled = config.enabled !== false;
    this.name = config.name || stationId;

    // Dependencies (injected)
    this.monitor = dependencies.monitor || null;
    this.eventCollector = dependencies.eventCollector || null;
    this.logger = dependencies.logger || null;
    this.recorder = dependencies.recorder || null;

    // Runtime state
    this.isRunning = false;
    this.startTime = null;

    // Buffer management (AFTER processing, as per user requirement)
    this.outputBuffer = Buffer.alloc(0);
    this.maxBufferBytes = config.socket_send_buffer_bytes || 262144;

    // Metrics
    this.metrics = {
      packetsReceived: 0,
      packetsProcessed: 0,
      packetsSent: 0,
      packetsDropped: 0,
      bytesReceived: 0,
      bytesProcessed: 0,
      bytesSent: 0,
      bytesDropped: 0,
      bufferFillBytes: 0,
      bufferFillPercent: 0,
      avgLatencyMs: 0,
      jitterMs: 0,
      lastPacketTime: null,
      totalProcessingTimeMs: 0
    };

    // Jitter calculation
    this.packetTimestamps = [];
    this.maxTimestampHistory = 100;

    // Frame/Packet tracking
    this.frameSize = config.frame_size_bytes || 160;
    this.frameDelay = config.frame_delay_ms || 5;
    this.frameSendInterval = null;

    // Audio processing parameters
    this.audioGain = config.audio_gain_multiplier || 1.0;
    this.silenceThreshold = config.vad_silence_threshold_db || -50;
    this.compressionEnabled = config.audio_compression_enabled || false;
    this.normalizationEnabled = config.audio_normalization_enabled || false;

    // LOG control
    this.logEnabled = config.log_stream_enabled || false;
    this.logTypes = config.log_stream_types || ['metrics'];
    this.logFormat = config.log_format || 'json';

    // WAV recording control
    this.wavEnabled = config.wav_recording_enabled || false;
    this.wavSampleRate = config.wav_sample_rate || 16000;
    this.wavChannels = config.wav_channels || 1;

    console.log(`[BaseStation] Initialized ${this.stationId}: ${this.name}`);
  }

  /**
   * Start the station
   */
  async start() {
    if (this.isRunning) {
      console.warn(`[${this.stationId}] Already running`);
      return;
    }

    if (!this.enabled) {
      console.log(`[${this.stationId}] Disabled in config, skipping start`);
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();

    // Start LOG streaming if enabled
    if (this.logEnabled && this.logger) {
      await this.logger.startStream(this.stationId, {
        types: this.logTypes,
        format: this.logFormat,
        rotation: this.config.log_rotation || 'daily'
      });
      this.logEvent('info', 'LOG_STREAM_STARTED', { types: this.logTypes });
    }

    // Start WAV recording if enabled
    if (this.wavEnabled && this.recorder) {
      await this.recorder.startRecording(this.stationId, {
        sampleRate: this.wavSampleRate,
        channels: this.wavChannels,
        bitDepth: this.config.wav_bit_depth || 16
      });
      this.logEvent('info', 'WAV_RECORDING_STARTED', {
        sampleRate: this.wavSampleRate,
        channels: this.wavChannels
      });
    }

    // Start frame sending interval (if configured)
    if (this.frameDelay > 0 && this.config.frame_batching_enabled !== false) {
      this.frameSendInterval = setInterval(() => {
        this.sendBufferedFrames();
      }, this.frameDelay);
    }

    console.log(`[${this.stationId}] Started`);
    this.emit('started', { stationId: this.stationId, timestamp: new Date().toISOString() });
  }

  /**
   * Stop the station
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Stop frame sending
    if (this.frameSendInterval) {
      clearInterval(this.frameSendInterval);
      this.frameSendInterval = null;
    }

    // Flush remaining buffer
    if (this.outputBuffer.length > 0) {
      this.logEvent('warn', 'BUFFER_FLUSHED_ON_STOP', {
        bytes: this.outputBuffer.length
      });
      this.outputBuffer = Buffer.alloc(0);
    }

    // Stop WAV recording if active
    if (this.wavEnabled && this.recorder) {
      const wavFile = await this.recorder.stopRecording(this.stationId);
      this.logEvent('info', 'WAV_RECORDING_STOPPED', { file: wavFile });
    }

    // Stop LOG streaming if active
    if (this.logEnabled && this.logger) {
      await this.logger.stopStream(this.stationId);
      this.logEvent('info', 'LOG_STREAM_STOPPED');
    }

    console.log(`[${this.stationId}] Stopped`);
    this.emit('stopped', { stationId: this.stationId, timestamp: new Date().toISOString() });
  }

  /**
   * Process incoming audio data
   * This is the main entry point - override in subclasses
   *
   * Flow: Receive → Process → Buffer → Send
   */
  async processAudio(audioData, metadata = {}) {
    if (!this.isRunning || !this.enabled) {
      return null;
    }

    const startTime = Date.now();

    // Update receive metrics
    this.metrics.packetsReceived++;
    this.metrics.bytesReceived += audioData.length;
    this.updatePacketTiming();

    try {
      // 1. PROCESS audio (before buffering, as per user requirement)
      let processedAudio = await this.performAudioProcessing(audioData, metadata);

      if (!processedAudio || processedAudio.length === 0) {
        this.logEvent('warn', 'PROCESSING_RETURNED_EMPTY', {
          inputBytes: audioData.length
        });
        return null;
      }

      // Update processing metrics
      this.metrics.packetsProcessed++;
      this.metrics.bytesProcessed += processedAudio.length;

      // 2. BUFFER processed audio (LAST action, as per user requirement)
      this.addToOutputBuffer(processedAudio);

      // 3. Log to stream if enabled
      if (this.logEnabled && this.logger && this.logTypes.includes('stream')) {
        await this.logger.logStream(this.stationId, processedAudio, metadata);
      }

      // 4. Record to WAV if enabled
      if (this.wavEnabled && this.recorder) {
        await this.recorder.writeAudio(this.stationId, processedAudio);
      }

      // Calculate processing latency
      const processingTime = Date.now() - startTime;
      this.metrics.totalProcessingTimeMs += processingTime;
      this.metrics.avgLatencyMs = this.metrics.totalProcessingTimeMs / this.metrics.packetsProcessed;

      // Update monitor
      if (this.monitor) {
        this.monitor.updateStats(this.stationId, {
          ...this.metrics,
          currentBytes: this.outputBuffer.length,
          maxBytes: this.maxBufferBytes,
          fillPercent: (this.outputBuffer.length / this.maxBufferBytes) * 100,
          lastProcessingTimeMs: processingTime
        });
      }

      // Log metrics if enabled
      if (this.logEnabled && this.logger && this.logTypes.includes('metrics')) {
        await this.logger.logMetrics(this.stationId, this.metrics);
      }

      return processedAudio;

    } catch (error) {
      this.metrics.packetsDropped++;
      this.metrics.bytesDropped += audioData.length;
      this.logEvent('error', 'PROCESSING_FAILED', {
        error: error.message,
        inputBytes: audioData.length
      });

      if (this.monitor) {
        this.monitor.alert('error', this.stationId,
          `Processing failed: ${error.message}`,
          this.metrics
        );
      }

      return null;
    }
  }

  /**
   * Perform audio processing (override in subclasses)
   * This is where station-specific processing happens
   */
  async performAudioProcessing(audioData, metadata) {
    // Base implementation: pass-through
    // Subclasses should override with actual processing:
    // - Format conversion
    // - Gain adjustment
    // - Normalization
    // - Compression
    // - VAD detection
    // etc.

    let processed = audioData;

    // Apply gain if configured
    if (this.audioGain !== 1.0) {
      processed = this.applyGain(processed, this.audioGain);
    }

    return processed;
  }

  /**
   * Add processed audio to output buffer (LAST action)
   */
  addToOutputBuffer(audioData) {
    // Check if buffer would overflow
    const newSize = this.outputBuffer.length + audioData.length;

    if (newSize > this.maxBufferBytes) {
      const overflow = newSize - this.maxBufferBytes;
      this.metrics.bytesDropped += overflow;

      this.logEvent('warn', 'BUFFER_OVERFLOW', {
        currentBytes: this.outputBuffer.length,
        maxBytes: this.maxBufferBytes,
        attemptedAdd: audioData.length,
        overflow: overflow
      });

      if (this.monitor) {
        this.monitor.alert('warning', this.stationId,
          `Buffer overflow: ${overflow} bytes dropped`,
          this.metrics
        );
      }

      // Apply buffer overflow strategy
      const strategy = this.config.buffer_overflow_strategy || 'drop_oldest';

      if (strategy === 'drop_oldest') {
        // Drop from start of buffer to make room
        const keepBytes = this.maxBufferBytes - audioData.length;
        this.outputBuffer = this.outputBuffer.slice(-keepBytes);
      } else if (strategy === 'drop_newest') {
        // Don't add new data
        return;
      }
    }

    // Append to buffer
    this.outputBuffer = Buffer.concat([this.outputBuffer, audioData]);
    this.metrics.bufferFillBytes = this.outputBuffer.length;
    this.metrics.bufferFillPercent = (this.outputBuffer.length / this.maxBufferBytes) * 100;
  }

  /**
   * Send buffered frames (called by interval or manually)
   */
  async sendBufferedFrames() {
    if (this.outputBuffer.length === 0) {
      return;
    }

    const threshold = this.config.buffer_accumulation_threshold_bytes || this.frameSize;

    // Only send if we have enough data
    if (this.outputBuffer.length >= threshold) {
      const toSend = this.outputBuffer.slice(0, threshold);
      this.outputBuffer = this.outputBuffer.slice(threshold);

      // Actually send the data (override in subclasses)
      await this.sendAudioData(toSend);

      this.metrics.packetsSent++;
      this.metrics.bytesSent += toSend.length;
      this.metrics.bufferFillBytes = this.outputBuffer.length;
      this.metrics.bufferFillPercent = (this.outputBuffer.length / this.maxBufferBytes) * 100;
    }
  }

  /**
   * Send audio data (override in subclasses)
   */
  async sendAudioData(audioData) {
    // Override in subclasses with actual send logic
    // e.g., UDP socket send, write to stream, etc.
    this.emit('audio_sent', {
      stationId: this.stationId,
      bytes: audioData.length,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Apply audio gain
   */
  applyGain(pcmBuffer, gainMultiplier) {
    const samples = pcmBuffer.length / 2;
    const output = Buffer.alloc(pcmBuffer.length);

    for (let i = 0; i < samples; i++) {
      const offset = i * 2;
      let sample = pcmBuffer.readInt16LE(offset);
      sample = Math.max(-32768, Math.min(32767, Math.floor(sample * gainMultiplier)));
      output.writeInt16LE(sample, offset);
    }

    return output;
  }

  /**
   * Update packet timing for jitter calculation
   */
  updatePacketTiming() {
    const now = Date.now();

    if (this.metrics.lastPacketTime) {
      const delta = now - this.metrics.lastPacketTime;
      this.packetTimestamps.push(delta);

      // Keep only recent history
      if (this.packetTimestamps.length > this.maxTimestampHistory) {
        this.packetTimestamps.shift();
      }

      // Calculate jitter (standard deviation of inter-packet times)
      if (this.packetTimestamps.length > 1) {
        const mean = this.packetTimestamps.reduce((a, b) => a + b, 0) / this.packetTimestamps.length;
        const variance = this.packetTimestamps.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.packetTimestamps.length;
        this.metrics.jitterMs = Math.sqrt(variance);
      }
    }

    this.metrics.lastPacketTime = now;
  }

  /**
   * Log event
   */
  logEvent(level, eventType, data = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      stationId: this.stationId,
      level,
      eventType,
      ...data
    };

    console.log(`[${this.stationId}] [${level.toUpperCase()}] ${eventType}:`, data);

    // Send to event collector
    if (this.eventCollector) {
      this.eventCollector.addEvent(event);
    }

    // Log to stream if enabled
    if (this.logEnabled && this.logger && this.logTypes.includes('events')) {
      this.logger.logEvent(this.stationId, event);
    }

    this.emit('event', event);
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Update runtime parameters
    if (newConfig.socket_send_buffer_bytes !== undefined) {
      this.maxBufferBytes = newConfig.socket_send_buffer_bytes;
    }
    if (newConfig.audio_gain_multiplier !== undefined) {
      this.audioGain = newConfig.audio_gain_multiplier;
    }
    if (newConfig.frame_size_bytes !== undefined) {
      this.frameSize = newConfig.frame_size_bytes;
    }
    if (newConfig.frame_delay_ms !== undefined) {
      this.frameDelay = newConfig.frame_delay_ms;

      // Restart frame interval if running
      if (this.isRunning && this.frameSendInterval) {
        clearInterval(this.frameSendInterval);
        this.frameSendInterval = setInterval(() => {
          this.sendBufferedFrames();
        }, this.frameDelay);
      }
    }

    this.logEvent('info', 'CONFIG_UPDATED', {
      oldConfig: Object.keys(oldConfig),
      newConfig: Object.keys(newConfig)
    });

    this.emit('config_updated', { stationId: this.stationId, oldConfig, newConfig });
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      stationId: this.stationId,
      name: this.name,
      enabled: this.enabled,
      isRunning: this.isRunning,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      ...this.metrics,
      config: {
        maxBufferBytes: this.maxBufferBytes,
        frameSize: this.frameSize,
        frameDelay: this.frameDelay,
        audioGain: this.audioGain,
        logEnabled: this.logEnabled,
        wavEnabled: this.wavEnabled
      }
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      packetsReceived: 0,
      packetsProcessed: 0,
      packetsSent: 0,
      packetsDropped: 0,
      bytesReceived: 0,
      bytesProcessed: 0,
      bytesSent: 0,
      bytesDropped: 0,
      bufferFillBytes: this.outputBuffer.length,
      bufferFillPercent: (this.outputBuffer.length / this.maxBufferBytes) * 100,
      avgLatencyMs: 0,
      jitterMs: 0,
      lastPacketTime: null,
      totalProcessingTimeMs: 0
    };

    this.packetTimestamps = [];
    this.logEvent('info', 'METRICS_RESET');
  }
}

module.exports = BaseStation;
