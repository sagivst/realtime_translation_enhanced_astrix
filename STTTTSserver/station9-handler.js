// Enhanced Station-9 Handler - Monitors TTS output to Gateway
// EXPANDED: From 5 parameters to 15 parameters with audio analysis and performance metrics
const fs = require('fs');
const AudioAnalysisUtils = require('./audio-analysis-utils');
const ConfigFactory = require('./config-factory-defaults');

class Station9Handler {
  constructor(extensionId) {
    this.extensionId = extensionId;
    this.configPath = `/tmp/STATION_9-${extensionId}-config.json`;
    this.knobs = {};
    this.audioStartTime = Date.now();
    this.stationAgent = null;
    this.collectionInterval = null;

    // Audio buffer tracking for analysis
    this.audioBufferQueue = [];
    this.lastAudioBuffer = null;

    // Performance tracking
    this.lastOutputTime = Date.now();
    this.ttsStartTime = null;
    this.totalBytesSent = 0;

    // Initialize configuration factory
    this.configFactory = new ConfigFactory(extensionId);

    // Start polling for config changes
    this.startPolling();

    console.log(`[STATION-9] Enhanced handler initialized for extension ${extensionId} (15 parameters)`);
  }

  // Initialize StationAgent when available
  initStationAgent(StationAgent) {
    this.stationAgent = new StationAgent('STATION_9', this.extensionId);
    console.log(`[STATION-9] StationAgent initialized for extension ${this.extensionId}`);
  }

  // Poll config file every 100ms
  startPolling() {
    setInterval(() => {
      try {
        const newKnobs = this.loadKnobs();
        if (JSON.stringify(newKnobs) !== JSON.stringify(this.knobs)) {
          this.knobs = newKnobs;
          console.log(`[STATION-9] Config updated for extension ${this.extensionId}`);
          this.onKnobsChanged?.(this.knobs);
        }
      } catch (e) {
        // Silent fail - config loading is not critical
      }
    }, 100);
  }

  // Load knobs from config file (backward compatible)
  loadKnobs() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (e) {}

    // Return active config from factory if file doesn't exist
    return this.configFactory.getActiveConfig();
  }

  // Get TTS config from knobs
  getTTSConfig() {
    const config = this.configFactory.getActiveConfig();
    const tts = config.tts || {};

    return {
      provider: tts.provider || 'elevenlabs',
      voice: tts.voice || (this.extensionId === '3333' ? 'Rachel' : 'Antoine'),
      model: tts.model || 'eleven_multilingual_v2',
      stability: tts.stability !== undefined ? tts.stability : 0.5,
      similarityBoost: tts.similarityBoost !== undefined ? tts.similarityBoost : 0.75,
      style: tts.style !== undefined ? tts.style : 0.0,
      useSpeakerBoost: tts.useSpeakerBoost !== false,
      optimizeStreamingLatency: tts.optimizeStreamingLatency || 3,
      outputFormat: tts.outputFormat || 'pcm_16000'
    };
  }

  // ENHANCED: Called when TTS audio is being sent to Gateway
  // EXPANDED from 5 to 15 parameters
  async onTTSOutput(audioBuffer) {
    if (!this.stationAgent) return;

    try {
      const now = Date.now();

      // === ORIGINAL 5 PARAMETERS ===
      // 1. pcmBuffer (audioBuffer)
      // 2. bufferSize
      // 3. audioStartTime
      // 4. timestamp
      // 5. extension

      // Store buffer for analysis
      this.lastAudioBuffer = audioBuffer;
      this.audioBufferQueue.push({
        buffer: audioBuffer,
        timestamp: now
      });

      // Keep only last 10 buffers
      if (this.audioBufferQueue.length > 10) {
    console.log("[STATION-9-DEBUG] onTranscript called for extension", this.extensionId, "with data:", data.transcript || "no transcript");
        this.audioBufferQueue.shift();
      }

      // Update byte counter
      const bufferSize = audioBuffer ? audioBuffer.length : 0;
      this.totalBytesSent += bufferSize;

      // === NEW AUDIO ANALYSIS PARAMETERS (6-11) ===
      let audioMetrics = {
        snr: 0,
        rms: -60,
        clipping: 0,
        noiseFloor: -60,
        voiceActivity: 0,
        mos: 3.0
      };

      // Analyze audio buffer if available
      if (audioBuffer && audioBuffer.length > 0) {
        audioMetrics = AudioAnalysisUtils.analyzeAudio(audioBuffer, 16000);
      }

      // === NEW PERFORMANCE PARAMETERS (12-13) ===
      const timeSinceLastOutput = now - this.lastOutputTime;
      this.lastOutputTime = now;

      // Calculate TTS processing latency (time from start to first output)
      if (!this.ttsStartTime) {
        this.ttsStartTime = now;
      }
      const ttsProcessingLatency = now - this.ttsStartTime;

      // === NEW DSP PARAMETERS FROM CONFIG (14-15) ===
      const activeConfig = this.configFactory.getActiveConfig();
      const compressionRatio = activeConfig.compressor?.enabled ?
        activeConfig.compressor.ratio : 1.0;
      const limiterThreshold = activeConfig.limiter?.enabled ?
        activeConfig.limiter.threshold : 0;

      // Collect ALL 15 parameters
      console.log("[STATION-9-DEBUG] About to call collect, stationAgent exists:", !!this.stationAgent);
      await this.stationAgent.collect({
        timestamp: now,
        extension: this.extensionId,
        callId: `tts-output-${this.extensionId}-${now}`,

        // Original 5 parameters
        pcmBuffer: audioBuffer,                    // 1
        bufferSize: bufferSize,                    // 2
        audioStartTime: this.audioStartTime,       // 3
        // timestamp (already included above)      // 4
        // extension (already included above)      // 5

        // Audio analysis (6 new parameters)
        snr: audioMetrics.snr,                     // 6 - Signal-to-Noise Ratio
        rms: audioMetrics.rms,                     // 7 - RMS level in dBFS
        clipping: audioMetrics.clipping,           // 8 - Clipping percentage
        noiseFloor: audioMetrics.noiseFloor,       // 9 - Noise floor in dBFS
        voiceActivity: audioMetrics.voiceActivity, // 10 - Voice activity ratio
        mos: audioMetrics.mos,                     // 11 - Mean Opinion Score

        // Performance metrics (2 new parameters)
        ttsProcessingLatency: ttsProcessingLatency,        // 12 - Time from start to output
        timeSinceLastOutput: timeSinceLastOutput,          // 13 - Inter-output time

        // DSP metrics from config (2 new parameters)
        compressionRatio: compressionRatio,        // 14 - Compressor ratio
        limiterThreshold: limiterThreshold,        // 15 - Limiter threshold

        // Additional metadata
        totalBytesSent: this.totalBytesSent
      });
      console.log("[STATION-9-DEBUG] collect() called successfully");

      // Log enhanced collection (throttled to avoid noise)
      if (bufferSize > 0 && Math.random() < 0.1) { // Log ~10% of outputs
        console.log(`[STATION-9-${this.extensionId}] Collected 15 parameters: ` +
          `bufferSize=${bufferSize} bytes, ` +
          `SNR=${audioMetrics.snr.toFixed(1)}dB, ` +
          `MOS=${audioMetrics.mos.toFixed(1)}, ` +
          `latency=${ttsProcessingLatency}ms, ` +
          `totalSent=${this.totalBytesSent} bytes`);
      }

    } catch (error) {
      console.error(`[STATION-9-${this.extensionId}] Enhanced TTS output collection error:`, error.message);
    }

    // Reset audio start time for next chunk
    this.audioStartTime = Date.now();
  }

  // Called when TTS reports an error
  async onError(error) {
    if (!this.stationAgent) return;

    try {
      console.log("[STATION-9-DEBUG] About to call collect, stationAgent exists:", !!this.stationAgent);
      await this.stationAgent.collect({
        timestamp: Date.now(),
        extension: this.extensionId,
        callId: `tts-error-${this.extensionId}-${Date.now()}`,
        error: error.message || error,
        errorType: error.type || 'unknown'
      });
      console.log("[STATION-9-DEBUG] collect() called successfully");
      console.log(`[STATION-9-${this.extensionId}] Error collected: ${error.type || 'unknown'}`);
    } catch (err) {
      console.error(`[STATION-9-${this.extensionId}] Error collection error:`, err.message);
    }
  }

  // Called when TTS sends metadata
  async onMetadata(data) {
    if (!this.stationAgent) return;

    try {
      console.log("[STATION-9-DEBUG] About to call collect, stationAgent exists:", !!this.stationAgent);
      await this.stationAgent.collect({
        timestamp: Date.now(),
        extension: this.extensionId,
        callId: `tts-metadata-${this.extensionId}-${Date.now()}`,
        metadata: data
      });
      console.log("[STATION-9-DEBUG] collect() called successfully");
    } catch (error) {
      console.error(`[STATION-9-${this.extensionId}] Metadata collection error:`, error.message);
    }
  }

  // Cleanup on shutdown
  destroy() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }
    console.log(`[STATION-9] Enhanced handler destroyed for extension ${this.extensionId}`);
  }
}

module.exports = Station9Handler;
