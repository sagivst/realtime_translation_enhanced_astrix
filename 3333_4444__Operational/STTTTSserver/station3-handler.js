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
    this.stationAgent.initStationAgent();
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
        // config loading is not critical
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
    console.log("[STATION-3-DEBUG] onTranscript called for extension", this.extensionId, "with data:", data.transcript || "no transcript");

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
      console.log("[STATION-3-DEBUG] About to call collect, stationAgent exists:", !!this.stationAgent);
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
      console.log("[STATION-3-DEBUG] collect() called successfully");

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
      console.log("[STATION-3-DEBUG] About to call collect, stationAgent exists:", !!this.stationAgent);
      await this.stationAgent.collect({
        timestamp: Date.now(),
        extension: this.extensionId,
        callId: `deepgram-error-${this.extensionId}-${Date.now()}`,
        error: error.message || error,
        errorType: error.type || 'unknown'
      });
      console.log("[STATION-3-DEBUG] collect() called successfully");
      console.log(`[STATION-3-${this.extensionId}] Error collected: ${error.type || 'unknown'}`);
    } catch (err) {
      console.error(`[STATION-3-${this.extensionId}] Error collection error:`, err.message);
    }
  }

  // Called when Deepgram sends metadata
  async onMetadata(data) {
    if (!this.stationAgent) return;

    try {
      console.log("[STATION-3-DEBUG] About to call collect, stationAgent exists:", !!this.stationAgent);
      await this.stationAgent.collect({
        timestamp: Date.now(),
        extension: this.extensionId,
        callId: `deepgram-metadata-${this.extensionId}-${Date.now()}`,
        metadata: data
      });
      console.log("[STATION-3-DEBUG] collect() called successfully");
    } catch (error) {
      console.error(`[STATION-3-${this.extensionId}] Metadata collection error:`, error.message);
    }
  }
// NEW METHOD: Process audio chunks directly without waiting for transcripts
  async onAudioChunk(audioBuffer, timestamp) {
    console.log("[STATION-3-" + this.extensionId + "] onAudioChunk called with buffer size: " + audioBuffer.length);
    console.log("[STATION-3-" + this.extensionId + "] StationAgent available: " + (this.stationAgent ? "YES" : "NO"));
    if (!this.stationAgent) return;
    try {
      const now = Date.now();
      
      // Calculate real audio metrics from PCM buffer (16-bit signed samples)
      let sumSquares = 0;
      let peak = 0;
      let clipping = 0;
      const samples = audioBuffer.length / 2; // 16-bit = 2 bytes per sample
      
      for (let i = 0; i < audioBuffer.length - 1; i += 2) {
        const sample = audioBuffer.readInt16LE(i);
        const absSample = Math.abs(sample);
        sumSquares += sample * sample;
        if (absSample > peak) peak = absSample;
        if (absSample >= 32700) clipping++; // Near max value
      }
      
      // Calculate RMS (Root Mean Square)
      const rms = Math.sqrt(sumSquares / samples);
      const rmsDb = 20 * Math.log10(rms / 32768 || 0.00001);
      
      // Calculate peak level in dB
      const peakDb = 20 * Math.log10(peak / 32768 || 0.00001);
      
      // Calculate SNR approximation
      const noiseFloor = -50; // Assumed noise floor in dB
      const snr = Math.max(0, rmsDb - noiseFloor);
      
      // Update knobs based on audio characteristics (map to ±75 and ±150 ranges)
      const knobs = {
        // Matrix knobs (±75 range) - map audio metrics
        matrix_1_knob: Math.round(Math.min(75, Math.max(-75, rmsDb + 40))), // RMS level
        matrix_2_knob: Math.round(Math.min(75, Math.max(-75, peakDb + 40))), // Peak level
        matrix_3_knob: Math.round(Math.min(75, Math.max(-75, snr - 20))), // SNR
        matrix_4_knob: Math.round(Math.min(75, Math.max(-75, clipping * 10))), // Clipping indicator
        matrix_5_knob: Math.round(Math.min(75, Math.max(-75, (rms / 1000) - 50))), // Energy
        matrix_6_knob: 0, // Reserved
        matrix_7_knob: 0, // Reserved  
        matrix_8_knob: 0, // Reserved
        
        // Main control knobs (±150 range)
        main_volume: Math.round(Math.min(150, Math.max(-150, rmsDb + 80))),
        balance: 0,
        treble: 0,
        bass: 0,
        gain: Math.round(Math.min(150, Math.max(-150, peakDb + 80))),
        compression: Math.round(clipping > 0 ? Math.min(150, clipping * 20) : 0),
        noise_gate: Math.round(rmsDb < -40 ? -150 : 0),
        reverb: 0
      };
      
      // Prepare metrics
      const metrics = {
        rms: rms,
        rmsDb: rmsDb.toFixed(2),
        peak: peak,
        peakDb: peakDb.toFixed(2),
        snr: snr.toFixed(2),
        clipping: clipping,
        energy: (sumSquares / samples).toFixed(2)
      };
      
      console.log("[STATION-3-" + this.extensionId + "] Calling StationAgent.collect with metrics:", JSON.stringify(metrics));
      await this.stationAgent.collect({
        timestamp: now,
        extension: this.extensionId,
        callId: "audio-chunk-" + this.extensionId + "-" + now,
        dataType: "audio_chunk",
        chunkSize: audioBuffer.length,
        hasTranscript: false,
        metrics: metrics,
        knobs: knobs
      });
      
      if (!this.chunkCount) this.chunkCount = 0;
      this.chunkCount++;
      if (this.chunkCount % 100 === 0) {
        console.log("[STATION-3-" + this.extensionId + "] Collected " + this.chunkCount + " audio chunks");
      }
    } catch (error) {
      console.error("[STATION-3-" + this.extensionId + "] Error in onAudioChunk: " + error.message);
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
