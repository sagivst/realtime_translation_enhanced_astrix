// Enhanced Station-3 Handler - Monitors Deepgram STT input
// EXPANDED: From 4 parameters to 14 parameters with audio analysis and DSP metrics
const fs = require('fs');
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

    // Initialize configuration factory
    this.configFactory = new ConfigFactory(extensionId);

    // Start polling for config changes
    this.startPolling();

    console.log(`[STATION-3] Enhanced handler initialized for extension ${extensionId} (14 parameters)`);
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

  // ENHANCED: Called when Deepgram returns a transcript
  // EXPANDED from 4 to 14 parameters
  async onTranscript(data) {
    if (!this.stationAgent) return;

    try {
      const transcript = data.channel?.alternatives?.[0]?.transcript || '';
      const isFinal = data.is_final || false;
      const confidence = data.channel?.alternatives?.[0]?.confidence || 0;
      const language = data.metadata?.language || (this.extensionId === '3333' ? 'en' : 'fr');

      // === ORIGINAL 4 PARAMETERS ===
      // 1. transcript
      // 2. isFinal
      // 3. confidence
      // 4. language

      // === NEW AUDIO ANALYSIS PARAMETERS (5-10) ===
      let audioMetrics = {
        snr: 0,
        rms: -60,
        clipping: 0,
        noiseFloor: -60,
        voiceActivity: 0,
        mos: 3.0
      };

      // Analyze last audio buffer if available
      if (this.lastAudioBuffer && this.lastAudioBuffer.length > 0) {
        audioMetrics = AudioAnalysisUtils.analyzeAudio(this.lastAudioBuffer, 16000);
      }

      // === NEW PERFORMANCE PARAMETERS (11-12) ===
      const now = Date.now();
      const timeSinceLastTranscript = now - this.lastTranscriptTime;
      this.lastTranscriptTime = now;

      // Calculate processing latency (time from audio start to transcript)
      if (!this.transcriptStartTime) {
        this.transcriptStartTime = now;
      }
      const processingLatency = now - this.transcriptStartTime;

      // === NEW DSP PARAMETERS FROM CONFIG (13-14) ===
      const activeConfig = this.configFactory.getActiveConfig();
      const agcGain = activeConfig.agc?.enabled ? activeConfig.agc.targetLevel : 0;
      const noiseReductionLevel = activeConfig.noiseReduction?.enabled ?
        (activeConfig.noiseReduction.level || 'moderate') : 'off';

      // Collect ALL 14 parameters
      await this.stationAgent.collect({
        timestamp: now,
        extension: this.extensionId,
        callId: `deepgram-${this.extensionId}-${now}`,

        // Original 4 parameters
        transcript: transcript,                    // 1
        isFinal: isFinal,                          // 2
        confidence: confidence,                    // 3
        language: language,                        // 4

        // Audio analysis (6 new parameters)
        snr: audioMetrics.snr,                     // 5 - Signal-to-Noise Ratio
        rms: audioMetrics.rms,                     // 6 - RMS level in dBFS
        clipping: audioMetrics.clipping,           // 7 - Clipping percentage
        noiseFloor: audioMetrics.noiseFloor,       // 8 - Noise floor in dBFS
        voiceActivity: audioMetrics.voiceActivity, // 9 - Voice activity ratio
        mos: audioMetrics.mos,                     // 10 - Mean Opinion Score

        // Performance metrics (2 new parameters)
        processingLatency: processingLatency,      // 11 - Time from start to transcript
        timeSinceLastTranscript: timeSinceLastTranscript, // 12 - Inter-transcript time

        // DSP metrics from config (2 new parameters)
        agcGain: agcGain,                          // 13 - AGC target level
        noiseReductionLevel: noiseReductionLevel   // 14 - Noise reduction setting
      });

      // Log enhanced collection (only for final transcripts to reduce noise)
      if (isFinal && transcript.length > 0) {
        console.log(`[STATION-3-${this.extensionId}] Collected 14 parameters: ` +
          `transcript="${transcript.substring(0, 30)}...", ` +
          `confidence=${confidence.toFixed(2)}, ` +
          `SNR=${audioMetrics.snr.toFixed(1)}dB, ` +
          `MOS=${audioMetrics.mos.toFixed(1)}, ` +
          `latency=${processingLatency}ms`);
      }

      // Reset transcript timer for next transcript
      if (isFinal) {
        this.transcriptStartTime = now;
      }

    } catch (error) {
      console.error(`[STATION-3-${this.extensionId}] Enhanced transcript collection error:`, error.message);
    }
  }

  // Called when Deepgram reports an error
  async onError(error) {
    if (!this.stationAgent) return;

    try {
      await this.stationAgent.collect({
        timestamp: Date.now(),
        extension: this.extensionId,
        callId: `deepgram-error-${this.extensionId}-${Date.now()}`,
        error: error.message || error,
        errorType: error.type || 'unknown'
      });
      console.log(`[STATION-3-${this.extensionId}] Error collected: ${error.type || 'unknown'}`);
    } catch (err) {
      console.error(`[STATION-3-${this.extensionId}] Error collection error:`, err.message);
    }
  }

  // Called when Deepgram sends metadata
  async onMetadata(data) {
    if (!this.stationAgent) return;

    try {
      await this.stationAgent.collect({
        timestamp: Date.now(),
        extension: this.extensionId,
        callId: `deepgram-metadata-${this.extensionId}-${Date.now()}`,
        metadata: data
      });
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
