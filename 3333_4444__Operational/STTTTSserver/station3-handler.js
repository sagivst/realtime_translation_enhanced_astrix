// Enhanced Station-3 Handler - Monitors Deepgram STT input
// UPDATED: Sends full matrix with real values only (0 for unavailable)
const fs = require('fs');
const os = require('os');
const AudioAnalysisUtils = require('./audio-analysis-utils');
const ConfigFactory = require('./config-factory-defaults');

class Station3Handler {
  constructor(extensionId) {
    this.extensionId = extensionId;
    this.configPath = `/tmp/STATION_3-${extensionId}-config.json`;
    this.knobs = {};
    this.audioStartTime = Date.now();
    this.stationAgent = null;
    this.collectionInterval = null;

    // Audio buffer tracking for analysis
    this.audioBufferQueue = [];
    this.lastAudioBuffer = null;

    // Performance tracking
    this.transcriptStartTime = null;
    this.lastTranscriptTime = Date.now();

    // Statistics tracking
    this.totalTranscripts = 0;
    this.successfulTranscripts = 0;

    // Initialize configuration factory
    this.configFactory = new ConfigFactory(extensionId);

    // Start polling for config changes
    this.startPolling();

    console.log(`[STATION-3] Enhanced handler initialized for extension ${extensionId} (full matrix)`);
  }

  // Initialize StationAgent when available
  initStationAgent(StationAgent) {
    this.stationAgent = new StationAgent('STATION_3', this.extensionId);
    console.log(`[STATION-3] StationAgent initialized for extension ${this.extensionId}`);
  }

  // Poll config file every 100ms
  startPolling() {
    setInterval(() => {
      try {
        const newKnobs = this.loadKnobs();
        if (JSON.stringify(newKnobs) !== JSON.stringify(this.knobs)) {
          this.knobs = newKnobs;
          console.log(`[STATION-3] Config updated for extension ${this.extensionId}`);
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

  // Get Deepgram config from knobs
  getDeepgramConfig() {
    const config = this.configFactory.getActiveConfig();
    const dg = config.deepgram || {};

    return {
      model: dg.model || 'nova-3',
      language: dg.language || (this.extensionId === '3333' ? 'en' : 'fr'),
      encoding: dg.encoding || 'linear16',
      sample_rate: dg.sampleRate || 16000,
      channels: dg.channels || 1,
      punctuate: dg.punctuate !== false,
      interim_results: dg.interimResults !== false,
      endpointing: dg.endpointing || 300,
      vad_turnoff: dg.vadTurnoff || 500,
      smart_format: dg.smartFormat !== false,
      diarize: dg.diarize || false,
      utterances: true,
      numerals: true
    };
  }

  // Called when audio buffer is received (before Deepgram)
  onAudioBuffer(pcmBuffer) {
    // Store buffer for later analysis
    this.lastAudioBuffer = pcmBuffer;

    // Keep small queue for trend analysis
    this.audioBufferQueue.push({
      buffer: pcmBuffer,
      timestamp: Date.now()
    });

    // Keep only last 10 buffers
    if (this.audioBufferQueue.length > 10) {
      this.audioBufferQueue.shift();
    }
  }

  // UPDATED: Send full matrix with correct parameter names - REAL VALUES ONLY
  async onTranscript(data) {
    if (!this.stationAgent) return;
    console.log("[STATION-3-DEBUG] onTranscript called for extension", this.extensionId, "with data:", data.transcript || "no transcript");

    try {
      const transcript = data.channel?.alternatives?.[0]?.transcript || '';
      const isFinal = data.is_final || false;
      const confidence = data.channel?.alternatives?.[0]?.confidence || 0;
      const language = data.metadata?.language || (this.extensionId === '3333' ? 'en' : 'fr');

      // Track statistics
      this.totalTranscripts++;
      if (transcript && confidence > 0.5) {
        this.successfulTranscripts++;
      }

      // Get REAL audio metrics if available
      let audioMetrics = {
        snr: 0,
        rms: -60,
        clipping: 0,
        noiseFloor: -60,
        voiceActivity: 0,
        mos: 3.0
      };

      if (this.lastAudioBuffer && this.lastAudioBuffer.length > 0) {
        audioMetrics = AudioAnalysisUtils.analyzeAudio(this.lastAudioBuffer, 16000);
      }

      // Get REAL system performance metrics
      let cpuUsage = 0, memoryUsage = 0;
      try {
        const cpus = os.cpus();
        const totalCpu = cpus.reduce((acc, cpu) => {
          const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
          const idle = cpu.times.idle;
          return acc + ((total - idle) / total);
        }, 0);
        cpuUsage = (totalCpu / cpus.length) * 100;

        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        memoryUsage = ((totalMem - freeMem) / totalMem) * 100;
      } catch (e) {
        // Default to 0 if can't get metrics
      }

      // Calculate REAL processing latency
      const now = Date.now();
      const timeSinceLastTranscript = now - this.lastTranscriptTime;
      this.lastTranscriptTime = now;
      const processingLatency = now - (this.transcriptStartTime || now);
      if (!this.transcriptStartTime) {
        this.transcriptStartTime = now;
      }

      // Get REAL DSP settings from config
      const activeConfig = this.configFactory.getActiveConfig();
      const agcGain = activeConfig.agc?.enabled ? (activeConfig.agc.targetLevel || -20) : 0;
      const noiseReductionLevel = activeConfig.noiseReduction?.enabled ? (activeConfig.noiseReduction.strength || 15) : 0;

      // Calculate REAL success rate
      const successRate = this.totalTranscripts > 0 ? (this.successfulTranscripts / this.totalTranscripts) * 100 : 0;

      // Build FULL MATRIX with ALL parameters - REAL VALUES ONLY
      const fullMatrix = {
        timestamp: now,
        extension: this.extensionId,
        callId: `deepgram-${this.extensionId}-${now}`,

        // STATION_3 expected parameters (14 total) - ALL REAL VALUES
        'buffer.processing': this.audioBufferQueue?.length || 0,              // REAL: buffer queue size
        'latency.processing': processingLatency || 0,                         // REAL: actual processing time
        'audioQuality.snr': audioMetrics.snr || 0,                           // REAL: from audio analysis
        'audioQuality.speechLevel': audioMetrics.rms || -60,                 // REAL: RMS level
        'audioQuality.clipping': audioMetrics.clipping || 0,                 // REAL: from audio analysis
        'audioQuality.noise': audioMetrics.noiseFloor || -60,                // REAL: noise floor
        'dsp.agc.currentGain': agcGain,                                      // REAL: from config
        'dsp.noiseReduction.noiseLevel': noiseReductionLevel,                // REAL: from config
        'performance.cpu': cpuUsage || 0,                                    // REAL: CPU usage
        'performance.memory': memoryUsage || 0,                              // REAL: memory usage
        'performance.bandwidth': 0,                                          // CANNOT MEASURE at Station 3 - sending 0
        'custom.state': transcript ? 'active' : 'idle',                      // REAL: current state
        'custom.successRate': successRate,                                   // REAL: calculated rate
        'custom.totalProcessed': this.totalTranscripts,                      // REAL: total count

        // Additional REAL data for backward compatibility
        transcript: transcript,
        isFinal: isFinal,
        confidence: confidence,
        language: language,
        timeSinceLastTranscript: timeSinceLastTranscript,

        // Full REAL knobs values
        knobs: this.knobs || {}
      };

      console.log("[STATION-3-DEBUG] About to call collect with full matrix, stationAgent exists:", !!this.stationAgent);
      await this.stationAgent.collect(fullMatrix);
      console.log("[STATION-3-DEBUG] collect() called successfully with full matrix");

      // Log only for final transcripts to reduce noise
      if (isFinal && transcript.length > 0) {
        console.log(`[STATION-3-${this.extensionId}] Full matrix sent (ALL REAL): ` +
          `transcript="${transcript.substring(0, 30)}...", ` +
          `confidence=${confidence.toFixed(2)}, ` +
          `SNR=${audioMetrics.snr.toFixed(1)}dB, ` +
          `CPU=${cpuUsage.toFixed(1)}%, ` +
          `MEM=${memoryUsage.toFixed(1)}%, ` +
          `successRate=${successRate.toFixed(1)}%`);
      }

      // Reset transcript timer for next transcript
      if (isFinal) {
        this.transcriptStartTime = now;
      }

    } catch (error) {
      console.error(`[STATION-3-${this.extensionId}] Full matrix collection error:`, error.message);
    }
  }

  // Called when Deepgram reports an error
  async onError(error) {
    if (!this.stationAgent) return;

    try {
      const fullMatrix = {
        timestamp: Date.now(),
        extension: this.extensionId,
        callId: `deepgram-error-${this.extensionId}-${Date.now()}`,
        error: error.message || error,
        errorType: error.type || 'unknown',

        // Send 0 for all matrix parameters on error
        'buffer.processing': 0,
        'latency.processing': 0,
        'audioQuality.snr': 0,
        'audioQuality.speechLevel': -60,
        'audioQuality.clipping': 0,
        'audioQuality.noise': -60,
        'dsp.agc.currentGain': 0,
        'dsp.noiseReduction.noiseLevel': 0,
        'performance.cpu': 0,
        'performance.memory': 0,
        'performance.bandwidth': 0,
        'custom.state': 'error',
        'custom.successRate': 0,
        'custom.totalProcessed': this.totalTranscripts
      };

      console.log("[STATION-3-DEBUG] About to call collect for error, stationAgent exists:", !!this.stationAgent);
      await this.stationAgent.collect(fullMatrix);
      console.log("[STATION-3-DEBUG] collect() called successfully for error");
      console.log(`[STATION-3-${this.extensionId}] Error matrix sent: ${error.type || 'unknown'}`);
    } catch (err) {
      console.error(`[STATION-3-${this.extensionId}] Error collection error:`, err.message);
    }
  }

  // Called when Deepgram sends metadata
  async onMetadata(data) {
    if (!this.stationAgent) return;

    try {
      console.log("[STATION-3-DEBUG] About to call collect for metadata, stationAgent exists:", !!this.stationAgent);
      await this.stationAgent.collect({
        timestamp: Date.now(),
        extension: this.extensionId,
        callId: `deepgram-metadata-${this.extensionId}-${Date.now()}`,
        metadata: data,

        // Include basic matrix parameters for metadata
        'custom.state': 'metadata',
        'custom.totalProcessed': this.totalTranscripts
      });
      console.log("[STATION-3-DEBUG] collect() called successfully for metadata");
    } catch (error) {
      console.error(`[STATION-3-${this.extensionId}] Metadata collection error:`, error.message);
    }
  }

  // Cleanup on shutdown
  destroy() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }
    console.log(`[STATION-3] Enhanced handler destroyed for extension ${this.extensionId}`);
  }
}

module.exports = Station3Handler;
