// Enhanced Station-9 Handler - Full 75 Metrics & 113 Knobs Implementation
// Matches Station 3's complete monitoring pattern for 100% coverage
const fs = require('fs');
const AudioAnalysisUtils = require('./audio-analysis-utils');
const ConfigFactory = require('./config-factory-defaults');

// Import unified 75 metrics collector
const Unified75MetricsCollector = require('./unified-75-metrics-collector');

// Import all 7 monitoring collectors
const BufferMetrics = require('./monitoring/collectors/BufferMetrics');
const LatencyMetrics = require('./monitoring/collectors/LatencyMetrics');
const PacketMetrics = require('./monitoring/collectors/PacketMetrics');
const AudioQualityMetrics = require('./monitoring/collectors/AudioQualityMetrics');
const PerformanceMetrics = require('./monitoring/collectors/PerformanceMetrics');
const DSPMetrics = require('./monitoring/collectors/DSPMetrics');
const CustomMetrics = require('./monitoring/collectors/CustomMetrics');

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
    this.bytesProcessed = 0;
    this.packetsProcessed = 0;
    this.errorCount = 0;
    this.warningCount = 0;

    // Initialize configuration factory with full 113 knobs
    this.configFactory = new ConfigFactory(extensionId);

    // Initialize unified metrics collector for 75 metrics
    this.unifiedCollector = new Unified75MetricsCollector(extensionId);

    // Initialize all 7 metric collectors
    this.collectors = {
      buffer: new BufferMetrics(extensionId),
      latency: new LatencyMetrics(extensionId),
      packet: new PacketMetrics(extensionId),
      audioQuality: new AudioQualityMetrics(extensionId),
      performance: new PerformanceMetrics(extensionId),
      dsp: new DSPMetrics(extensionId),
      custom: new CustomMetrics(extensionId)
    };

    // Start polling for config changes
    this.startPolling();

    console.log(`[STATION-9] Enhanced handler initialized for extension ${extensionId} (75 metrics, 113 knobs)`);
  }

  // Initialize StationAgent when available
  initStationAgent(StationAgent) {
    this.stationAgent = new StationAgent('STATION_9', this.extensionId);
    console.log(`[STATION-9] StationAgent initialized for extension ${this.extensionId}`);

    // Start periodic collection matching Station 3 (200ms interval)
    this.startPeriodicCollection();
  }

  // Start periodic metrics collection (matches Station 3's pattern)
  startPeriodicCollection() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }

    this.collectionInterval = setInterval(() => {
      const metrics = this.collectAllMetrics();
      if (this.stationAgent && metrics) {
        this.stationAgent.collect(metrics);
      }
    }, 200); // Every 200ms matching Station 3

    console.log(`[STATION-9] Started periodic collection every 200ms`);
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

  // Load all 113 knobs from config factory
  loadKnobs() {
    try {
      if (fs.existsSync(this.configPath)) {
        const fileConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        // Merge file config with factory defaults
        return this.configFactory.mergeConfigs(
          this.configFactory.getFactoryDefaults(),
          fileConfig
        );
      }
    } catch (e) {}

    // Return full active config with all 113 knobs
    return this.configFactory.getActiveConfig();
  }

  // Get full TTS config with all knobs
  getTTSConfig() {
    const config = this.configFactory.getActiveConfig();
    const tts = config.tts || {};

    return {
      // Core TTS settings
      provider: tts.provider || 'elevenlabs',
      voice: tts.voice || (this.extensionId === '3333' ? 'Rachel' : 'Antoine'),
      model: tts.model || 'eleven_multilingual_v2',
      stability: tts.stability !== undefined ? tts.stability : 0.5,
      similarityBoost: tts.similarityBoost !== undefined ? tts.similarityBoost : 0.75,
      style: tts.style !== undefined ? tts.style : 0.0,
      useSpeakerBoost: tts.useSpeakerBoost !== false,
      optimizeStreamingLatency: tts.optimizeStreamingLatency || 3,
      outputFormat: tts.outputFormat || 'pcm_16000',

      // Additional TTS knobs from expanded implementation
      chunk_length_schedule: tts.chunk_length_schedule || [500, 1000, 1500],
      voice_cache: tts.voice_cache !== false,
      prosody_control: tts.prosody_control || {
        pitch: 0,
        rate: 1.0,
        volume: 1.0
      },
      emotion_level: tts.emotion_level || 0.5
    };
  }

  // Collect all 75 metrics using unified collector
  collectAllMetrics() {
    const now = Date.now();
    const audioBuffer = this.lastAudioBuffer;

    // Get base metrics from unified collector
    const unifiedMetrics = this.unifiedCollector.collect(audioBuffer);

    // Enhance with real-time data from individual collectors
    const enhancedMetrics = {
      ...unifiedMetrics,

      // Buffer metrics (10 total)
      'buffer.size': this.audioBufferQueue.length * 320,
      'buffer.duration': this.audioBufferQueue.length * 20,
      'buffer.fillLevel': Math.min(100, (this.audioBufferQueue.length / 50) * 100),
      'buffer.dropouts': this.collectors.buffer.getDropouts(),
      'buffer.underrun': this.collectors.buffer.getUnderruns(),
      'buffer.overrun': this.collectors.buffer.getOverruns(),
      'buffer.jitter': this.collectors.buffer.getJitter(),
      'buffer.playback': this.collectors.buffer.getPlaybackBuffer(),
      'buffer.processing': this.collectors.buffer.getProcessingQueue(),
      'buffer.network': this.collectors.buffer.getNetworkBuffer(),

      // Latency metrics (8 total)
      'latency.endToEnd': now - this.audioStartTime,
      'latency.processing': this.collectors.latency.getProcessingLatency(),
      'latency.network': this.collectors.latency.getNetworkLatency(),
      'latency.jitter': this.collectors.latency.getJitterLatency(),
      'latency.transcription': 0, // N/A for TTS
      'latency.translation': 0, // N/A for TTS
      'latency.synthesis': this.collectors.latency.getSynthesisLatency(),
      'latency.buffering': this.collectors.latency.getBufferingLatency(),

      // Packet metrics (12 total)
      'packet.loss': this.collectors.packet.getLossRate(),
      'packet.received': this.collectors.packet.getReceivedRate(),
      'packet.sent': this.collectors.packet.getSentRate(),
      'packet.retransmitted': this.collectors.packet.getRetransmittedRate(),
      'packet.outOfOrder': this.collectors.packet.getOutOfOrderRate(),
      'packet.duplicate': this.collectors.packet.getDuplicateRate(),
      'packet.jitter': this.collectors.packet.getJitter(),
      'packet.rtt': this.collectors.packet.getRTT(),
      'packet.throughput': this.collectors.packet.getThroughput(),
      'packet.bandwidth': this.collectors.packet.getBandwidth(),
      'packet.congestion': this.collectors.packet.getCongestion(),
      'packet.quality': this.collectors.packet.getQuality(),

      // Audio quality metrics (10 total)
      'audioQuality.level': audioBuffer ? AudioAnalysisUtils.calculateRMSLevel(audioBuffer) : -60,
      'audioQuality.snr': this.collectors.audioQuality.getSNR(audioBuffer),
      'audioQuality.clarity': this.collectors.audioQuality.getClarity(audioBuffer),
      'audioQuality.mos': this.collectors.audioQuality.getMOS(),
      'audioQuality.pesq': this.collectors.audioQuality.getPESQ(),
      'audioQuality.polqa': this.collectors.audioQuality.getPOLQA(),
      'audioQuality.thd': this.collectors.audioQuality.getTHD(audioBuffer),
      'audioQuality.sinad': this.collectors.audioQuality.getSINAD(audioBuffer),
      'audioQuality.echo': this.collectors.audioQuality.getEchoLevel(),
      'audioQuality.distortion': this.collectors.audioQuality.getDistortion(audioBuffer),

      // Performance metrics (10 total)
      'performance.cpu': this.collectors.performance.getCPU(),
      'performance.memory': this.collectors.performance.getMemory(),
      'performance.threads': this.collectors.performance.getThreads(),
      'performance.queue': this.collectors.performance.getQueueDepth(),
      'performance.throughput': this.bytesProcessed / ((now - this.audioStartTime) / 1000),
      'performance.fps': this.packetsProcessed / ((now - this.audioStartTime) / 1000),
      'performance.cache': this.collectors.performance.getCacheHitRate(),
      'performance.io': this.collectors.performance.getIOWait(),
      'performance.gc': this.collectors.performance.getGCTime(),
      'performance.errors': this.errorCount,

      // DSP metrics (20 total)
      'dsp.agc.gain': this.collectors.dsp.getAGCGain(),
      'dsp.agc.level': this.collectors.dsp.getAGCLevel(),
      'dsp.aec.reduction': this.collectors.dsp.getAECReduction(),
      'dsp.aec.erle': this.collectors.dsp.getAECERLE(),
      'dsp.nr.reduction': this.collectors.dsp.getNRReduction(),
      'dsp.nr.snr': this.collectors.dsp.getNRSNR(),
      'dsp.vad.state': this.collectors.dsp.getVADState(),
      'dsp.vad.confidence': this.collectors.dsp.getVADConfidence(),
      'dsp.eq.gain': this.collectors.dsp.getEQGain(),
      'dsp.eq.frequency': this.collectors.dsp.getEQFrequency(),
      'dsp.compressor.ratio': this.collectors.dsp.getCompressorRatio(),
      'dsp.compressor.gain': this.collectors.dsp.getCompressorGain(),
      'dsp.limiter.reduction': this.collectors.dsp.getLimiterReduction(),
      'dsp.limiter.threshold': this.collectors.dsp.getLimiterThreshold(),
      'dsp.gate.state': this.collectors.dsp.getGateState(),
      'dsp.gate.reduction': this.collectors.dsp.getGateReduction(),
      'dsp.deesser.reduction': this.collectors.dsp.getDeesserReduction(),
      'dsp.deesser.frequency': this.collectors.dsp.getDeesserFrequency(),
      'dsp.reverb.level': this.collectors.dsp.getReverbLevel(),
      'dsp.reverb.time': this.collectors.dsp.getReverbTime(),

      // Custom metrics (5 total)
      'custom.activeStreams': 1,
      'custom.totalProcessed': this.bytesProcessed,
      'custom.errorRate': this.errorCount / Math.max(1, this.packetsProcessed),
      'custom.warningCount': this.warningCount,
      'custom.criticalCount': this.collectors.custom.getCriticalCount(),

      // Metadata
      timestamp: now,
      extension: this.extensionId,
      station: 'STATION_9',
      knobs: this.getAllKnobs()
    };

    return enhancedMetrics;
  }

  // Get all 113 knobs in structured format
  getAllKnobs() {
    const config = this.configFactory.getActiveConfig();

    return {
      // AGC (8 knobs)
      agc: config.agc || {},

      // AEC (7 knobs)
      aec: config.aec || {},

      // Noise Reduction (9 knobs)
      nr: config.nr || {},

      // VAD (6 knobs)
      vad: config.vad || {},

      // Equalizer (10 knobs)
      eq: config.eq || {},

      // Compressor (14 knobs)
      compressor: config.compressor || {},

      // Limiter (7 knobs)
      limiter: config.limiter || {},

      // Gate (5 knobs)
      gate: config.gate || {},

      // De-esser (6 knobs)
      deesser: config.deesser || {},

      // Reverb (8 knobs)
      reverb: config.reverb || {},

      // TTS specific (9 knobs)
      tts: this.getTTSConfig(),

      // Buffer management (6 knobs)
      buffer: config.buffer || {},

      // Network (5 knobs)
      network: config.network || {},

      // Performance (6 knobs)
      performance: config.performance || {},

      // Debug (7 knobs)
      debug: config.debug || {}
    };
  }

  // Called when TTS audio is being sent to Gateway
  async onTTSOutput(audioBuffer) {
    if (!this.stationAgent) return;

    try {
      // Store for metrics collection
      this.lastAudioBuffer = audioBuffer;
      this.audioBufferQueue.push(audioBuffer);
      if (this.audioBufferQueue.length > 100) {
        this.audioBufferQueue.shift();
      }

      // Update counters
      this.bytesProcessed += audioBuffer.length;
      this.packetsProcessed++;
      this.lastOutputTime = Date.now();

      // Collect and emit all 75 metrics
      const metrics = this.collectAllMetrics();
      this.stationAgent.collect(metrics);

      // Log periodic summary
      if (this.packetsProcessed % 100 === 0) {
        console.log(`[STATION-9] Processed ${this.packetsProcessed} packets, ${this.bytesProcessed} bytes, 75 metrics active`);
      }

    } catch (error) {
      console.error(`[STATION-9] Error processing TTS output:`, error);
      this.errorCount++;
    }
  }

  // Update TTS parameters based on knob changes
  updateTTSParameters(params) {
    const config = this.configFactory.getActiveConfig();

    // Apply DSP processing if enabled
    if (config.agc && config.agc.enabled) {
      params.gain = this.collectors.dsp.applyAGC(params.gain || 1.0);
    }

    if (config.nr && config.nr.enabled) {
      params.noiseReduction = this.collectors.dsp.applyNR(params.noiseReduction || 0);
    }

    if (config.compressor && config.compressor.enabled) {
      params.compression = this.collectors.dsp.applyCompressor(params.compression || 1.0);
    }

    return params;
  }

  // Set knobs callback
  setKnobsChangedCallback(callback) {
    this.onKnobsChanged = callback;
  }

  // Cleanup
  cleanup() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }

    // Cleanup collectors
    Object.values(this.collectors).forEach(collector => {
      if (collector.cleanup) {
        collector.cleanup();
      }
    });

    console.log(`[STATION-9] Handler cleanup completed for extension ${this.extensionId}`);
  }
}

module.exports = Station9Handler;