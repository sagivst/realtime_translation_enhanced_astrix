/**
 * Frame-Level Event Loop Orchestrator
 * Coordinates real-time translation pipeline with 20ms frame granularity
 * Target latency: ≤900ms end-to-end
 */

const EventEmitter = require('events');
const { performance } = require('perf_hooks');

class FrameOrchestrator extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      frameSize: config.frameSize || 20, // 20ms frames (fixed)
      sampleRate: config.sampleRate || 16000, // 16kHz
      maxLatency: config.maxLatency || 900, // Target ≤900ms
      bufferSize: config.bufferSize || 50, // Max 50 frames per buffer
      ...config
    };

    // Calculate frame size in samples
    this.samplesPerFrame = Math.floor(
      (this.config.sampleRate * this.config.frameSize) / 1000
    );

    // Active channels (one per participant)
    this.channels = new Map();

    // 5-tier queue system
    this.queues = {
      input: new Map(),      // InputBuffer: Raw PCM frames
      asr: new Map(),        // ASRQueue: Frames awaiting STT
      mt: new Map(),         // MTQueue: Transcripts awaiting translation
      tts: new Map(),        // TTSQueue: Translations awaiting synthesis
      playback: new Map()    // PlaybackQueue: Audio awaiting playback
    };

    // Pipeline services (injected)
    this.services = {
      stt: null,
      mt: null,
      tts: null,
      voiceProfiles: null
    };

    // Metrics
    this.metrics = {
      totalFrames: 0,
      droppedFrames: 0,
      latencyP50: 0,
      latencyP95: 0,
      latencyP99: 0,
      activeSessions: 0
    };

    // Event loop control
    this.running = false;
    this.loopInterval = null;
  }

  /**
   * Initialize orchestrator with services
   */
  async initialize(services) {
    console.log('[Orchestrator] Initializing frame-level orchestrator...');

    this.services = {
      stt: services.stt,
      mt: services.mt,
      tts: services.tts,
      voiceProfiles: services.voiceProfiles
    };

    // Validate services
    if (!this.services.stt || !this.services.mt || !this.services.tts) {
      throw new Error('Missing required services: STT, MT, or TTS');
    }

    console.log('[Orchestrator] ✓ Services configured');
    console.log(`[Orchestrator] Frame size: ${this.config.frameSize}ms (${this.samplesPerFrame} samples)`);

    return true;
  }

  /**
   * Start the frame-level event loop
   */
  start() {
    if (this.running) {
      console.warn('[Orchestrator] Already running');
      return;
    }

    console.log('[Orchestrator] Starting event loop...');
    this.running = true;

    // Main event loop - runs every frame interval
    this.loopInterval = setInterval(() => {
      this.processFrame();
    }, this.config.frameSize);

    console.log('[Orchestrator] ✓ Event loop started');
    this.emit('started');
  }

  /**
   * Stop the event loop
   */
  stop() {
    if (!this.running) {
      return;
    }

    console.log('[Orchestrator] Stopping event loop...');
    this.running = false;

    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }

    console.log('[Orchestrator] ✓ Event loop stopped');
    this.emit('stopped');
  }

  /**
   * Main event loop - processes all queues every 20ms
   */
  async processFrame() {
    const frameStart = performance.now();

    try {
      // Process each queue tier
      await this.processInputQueue();
      await this.processASRQueue();
      await this.processMTQueue();
      await this.processTTSQueue();
      await this.processPlaybackQueue();

      // Update metrics
      this.metrics.totalFrames++;

      const processingTime = performance.now() - frameStart;
      if (processingTime > this.config.frameSize) {
        console.warn(`[Orchestrator] Frame processing took ${processingTime.toFixed(2)}ms (> ${this.config.frameSize}ms)`);
      }
    } catch (error) {
      console.error('[Orchestrator] Frame processing error:', error);
    }
  }

  /**
   * Tier 1: Process input buffer
   * Accumulates PCM frames and forwards to ASR when ready
   */
  async processInputQueue() {
    for (const [channelId, buffer] of this.queues.input.entries()) {
      if (buffer.frames.length >= buffer.minFrames) {
        // Forward accumulated frames to ASR queue
        const asrBuffer = {
          channelId,
          frames: buffer.frames.slice(),
          timestamp: Date.now(),
          metadata: buffer.metadata
        };

        this.queues.asr.set(`${channelId}_${Date.now()}`, asrBuffer);

        // Clear input buffer
        buffer.frames = [];
      }
    }
  }

  /**
   * Tier 2: Process ASR queue
   * Sends audio to STT service
   */
  async processASRQueue() {
    for (const [key, buffer] of this.queues.asr.entries()) {
      try {
        // Convert frames to audio buffer
        const audioBuffer = this.framesToBuffer(buffer.frames);

        // Send to STT service
        const transcription = await this.services.stt.transcribe(audioBuffer, {
          channelId: buffer.channelId,
          language: buffer.metadata.language,
          speakerContext: buffer.metadata.voiceProfileId
        });

        if (transcription && transcription.text) {
          // Forward to MT queue
          const mtItem = {
            channelId: buffer.channelId,
            text: transcription.text,
            sourceLanguage: buffer.metadata.language,
            timestamp: buffer.timestamp,
            metadata: buffer.metadata
          };

          this.queues.mt.set(`${buffer.channelId}_${Date.now()}`, mtItem);
        }

        // Remove from ASR queue
        this.queues.asr.delete(key);
      } catch (error) {
        console.error(`[Orchestrator] ASR error for ${key}:`, error);
        this.queues.asr.delete(key);
      }
    }
  }

  /**
   * Tier 3: Process MT queue
   * Translates text to all target languages
   */
  async processMTQueue() {
    for (const [key, item] of this.queues.mt.entries()) {
      try {
        // Get all active channels except source
        const targetChannels = Array.from(this.channels.values())
          .filter(ch => ch.id !== item.channelId);

        // Translate to each target language
        const translations = await Promise.all(
          targetChannels.map(async (targetChannel) => {
            if (targetChannel.language === item.sourceLanguage) {
              // Same language - no translation needed
              return {
                channelId: targetChannel.id,
                text: item.text,
                language: targetChannel.language
              };
            }

            try {
              const translated = await this.services.mt.translate(
                item.text,
                item.sourceLanguage,
                targetChannel.language
              );

              return {
                channelId: targetChannel.id,
                text: translated,
                language: targetChannel.language
              };
            } catch (error) {
              console.error(`[Orchestrator] Translation error (${item.sourceLanguage} -> ${targetChannel.language}):`, error);
              return null;
            }
          })
        );

        // Forward successful translations to TTS queue
        for (const translation of translations) {
          if (translation) {
            const targetChannel = this.channels.get(translation.channelId);

            const ttsItem = {
              targetChannelId: translation.channelId,
              sourceChannelId: item.channelId,
              text: translation.text,
              language: translation.language,
              voiceProfileId: targetChannel.voiceProfileId,
              timestamp: item.timestamp,
              metadata: {
                sourceText: item.text,
                sourceLanguage: item.sourceLanguage
              }
            };

            this.queues.tts.set(`${translation.channelId}_${Date.now()}`, ttsItem);
          }
        }

        // Remove from MT queue
        this.queues.mt.delete(key);
      } catch (error) {
        console.error(`[Orchestrator] MT error for ${key}:`, error);
        this.queues.mt.delete(key);
      }
    }
  }

  /**
   * Tier 4: Process TTS queue
   * Synthesizes speech from translated text
   */
  async processTTSQueue() {
    for (const [key, item] of this.queues.tts.entries()) {
      try {
        // Synthesize speech with target voice profile
        const audioBuffer = await this.services.tts.synthesize(
          item.text,
          item.voiceProfileId,
          item.language
        );

        if (audioBuffer) {
          // Convert audio to frames
          const frames = this.bufferToFrames(audioBuffer);

          // Forward to playback queue
          const playbackItem = {
            targetChannelId: item.targetChannelId,
            sourceChannelId: item.sourceChannelId,
            frames,
            timestamp: item.timestamp,
            metadata: item.metadata
          };

          this.queues.playback.set(`${item.targetChannelId}_${Date.now()}`, playbackItem);

          // Calculate end-to-end latency
          const latency = Date.now() - item.timestamp;
          this.updateLatencyMetrics(latency);

          if (latency > this.config.maxLatency) {
            console.warn(`[Orchestrator] ⚠ High latency: ${latency}ms (target: ${this.config.maxLatency}ms)`);
          }
        }

        // Remove from TTS queue
        this.queues.tts.delete(key);
      } catch (error) {
        console.error(`[Orchestrator] TTS error for ${key}:`, error);
        this.queues.tts.delete(key);
      }
    }
  }

  /**
   * Tier 5: Process playback queue
   * Sends synthesized audio to target channels
   */
  async processPlaybackQueue() {
    for (const [key, item] of this.queues.playback.entries()) {
      try {
        // Emit audio to target channel
        this.emit('audio-output', {
          channelId: item.targetChannelId,
          sourceChannelId: item.sourceChannelId,
          frames: item.frames,
          metadata: item.metadata
        });

        // Remove from playback queue
        this.queues.playback.delete(key);
      } catch (error) {
        console.error(`[Orchestrator] Playback error for ${key}:`, error);
        this.queues.playback.delete(key);
      }
    }
  }

  /**
   * Register a new channel (participant)
   */
  registerChannel(channelConfig) {
    const { channelId, language, voiceProfileId, userId } = channelConfig;

    const channel = {
      id: channelId,
      userId,
      language,
      voiceProfileId,
      createdAt: Date.now(),
      active: true
    };

    this.channels.set(channelId, channel);

    // Initialize input buffer for this channel
    this.queues.input.set(channelId, {
      channelId,
      frames: [],
      minFrames: 10, // Wait for at least 10 frames (200ms) before processing
      metadata: {
        language,
        voiceProfileId,
        userId
      }
    });

    this.metrics.activeSessions++;
    console.log(`[Orchestrator] ✓ Channel registered: ${channelId} (${language})`);

    return channel;
  }

  /**
   * Unregister a channel
   */
  unregisterChannel(channelId) {
    this.channels.delete(channelId);
    this.queues.input.delete(channelId);

    // Clean up other queues
    for (const queue of Object.values(this.queues)) {
      for (const [key, item] of queue.entries()) {
        if (item.channelId === channelId || item.targetChannelId === channelId) {
          queue.delete(key);
        }
      }
    }

    this.metrics.activeSessions--;
    console.log(`[Orchestrator] ✓ Channel unregistered: ${channelId}`);
  }

  /**
   * Ingest audio frame from a channel
   */
  ingestFrame(channelId, frameBuffer) {
    const inputBuffer = this.queues.input.get(channelId);

    if (!inputBuffer) {
      console.warn(`[Orchestrator] Unknown channel: ${channelId}`);
      return false;
    }

    // Add frame to input buffer
    inputBuffer.frames.push({
      data: frameBuffer,
      timestamp: Date.now()
    });

    // Prevent buffer overflow
    if (inputBuffer.frames.length > this.config.bufferSize) {
      console.warn(`[Orchestrator] Buffer overflow for ${channelId}, dropping oldest frame`);
      inputBuffer.frames.shift();
      this.metrics.droppedFrames++;
    }

    return true;
  }

  /**
   * Helper: Convert frames array to single audio buffer
   */
  framesToBuffer(frames) {
    const totalSamples = frames.reduce((sum, frame) => sum + frame.data.length, 0);
    const buffer = Buffer.alloc(totalSamples * 2); // 16-bit samples

    let offset = 0;
    for (const frame of frames) {
      frame.data.copy(buffer, offset);
      offset += frame.data.length;
    }

    return buffer;
  }

  /**
   * Helper: Convert audio buffer to frames
   */
  bufferToFrames(audioBuffer) {
    const frames = [];
    const frameSize = this.samplesPerFrame * 2; // 16-bit samples

    for (let offset = 0; offset < audioBuffer.length; offset += frameSize) {
      const end = Math.min(offset + frameSize, audioBuffer.length);
      frames.push({
        data: audioBuffer.slice(offset, end),
        timestamp: Date.now()
      });
    }

    return frames;
  }

  /**
   * Update latency metrics
   */
  updateLatencyMetrics(latency) {
    // TODO: Implement proper percentile calculation
    // For now, simple approximation
    this.metrics.latencyP50 = latency; // Placeholder
    this.metrics.latencyP95 = latency * 1.2; // Placeholder
    this.metrics.latencyP99 = latency * 1.5; // Placeholder
  }

  /**
   * Get orchestrator metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      queueSizes: {
        input: this.queues.input.size,
        asr: this.queues.asr.size,
        mt: this.queues.mt.size,
        tts: this.queues.tts.size,
        playback: this.queues.playback.size
      },
      activeChannels: this.channels.size
    };
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      running: this.running,
      frameSize: this.config.frameSize,
      sampleRate: this.config.sampleRate,
      channels: this.channels.size,
      metrics: this.getMetrics()
    };
  }

  /**
   * Shutdown orchestrator
   */
  async shutdown() {
    console.log('[Orchestrator] Shutting down...');

    // Stop event loop
    this.stop();

    // Clear all channels
    this.channels.clear();

    // Clear all queues
    this.queues.input.clear();
    this.queues.asr.clear();
    this.queues.mt.clear();
    this.queues.tts.clear();
    this.queues.playback.clear();

    console.log('[Orchestrator] Shutdown complete');
  }
}

module.exports = FrameOrchestrator;
