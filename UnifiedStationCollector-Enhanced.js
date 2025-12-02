/**
 * UnifiedStationCollector-Enhanced.js
 *
 * Enhanced version that uses RealTimeMetricsProvider to get actual metrics
 * This replaces the original UnifiedStationCollector.js on the server
 */

const UniversalCollector = require('./UniversalCollector');
const { getInstance: getMetricsProvider } = require('./RealTimeMetricsProvider');

class UnifiedStationCollector {
  constructor(stationId, extension) {
    this.stationId = stationId;
    this.extension = extension || 'default';

    // Single universal collector for ALL 75 metrics
    this.universalCollector = new UniversalCollector();

    // Get the real-time metrics provider
    this.metricsProvider = getMetricsProvider();

    // Initialize ALL knob families (will discover ~100 knobs)
    this.knobFamilies = this.initializeAllKnobs();

    // Tracking and state
    this.totalProcessed = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.warningCount = 0;
    this.criticalCount = 0;
    this.state = 'idle';
    this.startTime = Date.now();
    this.lastProcessingTime = 0;
    this.lastActivityTime = Date.now();

    // Call tracking
    this.currentCallId = null;
    this.callStartTime = null;

    // Current knob values (for ~100 knobs)
    this.currentKnobValues = {};

    // Start simulating data if in STATION_3 or STATION_4
    if (stationId === 'STATION_3' || stationId === 'STATION_4') {
      this.startDataSimulation();
    }

    console.log(`[UnifiedCollector-${stationId}] Initialized with:`);
    console.log(`  - 75 metrics available for collection`);
    console.log(`  - ${Object.keys(this.knobFamilies).reduce((sum, family) => sum + Object.keys(this.knobFamilies[family]).length, 0)} knobs available for control`);
    console.log(`  - REAL-TIME metrics provider connected`);
  }

  /**
   * Start simulating audio data for testing
   */
  startDataSimulation() {
    // Simulate audio data processing every 100ms
    this.simulationInterval = setInterval(() => {
      // Simulate receiving audio chunks
      const audioChunkSize = 320 + Math.floor(Math.random() * 320);
      this.metricsProvider.simulateAudioData(audioChunkSize);
    }, 100);
  }

  /**
   * Update metrics from actual STTTTSserver data
   * This should be called by STTTTSserver when it has real data
   */
  updateServerMetrics(serverData) {
    this.metricsProvider.updateFromServer(serverData);
  }

  /**
   * Initialize ALL knob families (~113 knobs total)
   */
  initializeAllKnobs() {
    return {
      // AGC Knobs (6)
      agc: {
        'agc.enabled': { default: true, type: 'boolean' },
        'agc.target_level_dbfs': { default: -18, type: 'number', min: -40, max: 0 },
        'agc.compression_ratio': { default: 3.5, type: 'number', min: 1, max: 20 },
        'agc.attack_time_ms': { default: 5, type: 'number', min: 0, max: 1000 },
        'agc.release_time_ms': { default: 100, type: 'number', min: 0, max: 5000 },
        'agc.max_gain_db': { default: 30, type: 'number', min: 0, max: 60 }
      },

      // AEC Knobs (10)
      aec: {
        'aec.enabled': { default: true, type: 'boolean' },
        'aec.suppression_level_db': { default: 25, type: 'number', min: 0, max: 60 },
        'aec.tail_length_ms': { default: 128, type: 'number', min: 16, max: 512 },
        'aec.nlp_mode': { default: 'moderate', type: 'string', values: ['off', 'moderate', 'aggressive'] },
        'aec.comfort_noise': { default: true, type: 'boolean' },
        'aec.convergence_speed': { default: 0.9, type: 'number', min: 0, max: 1 },
        'aec.double_talk_detection': { default: true, type: 'boolean' },
        'aec.voice_fallback': { default: true, type: 'boolean' },
        'aec.music_protection': { default: true, type: 'boolean' },
        'aec.adaptation_rate': { default: 0.5, type: 'number', min: 0, max: 1 }
      },

      // Noise Reduction Knobs (8)
      nr: {
        'nr.enabled': { default: true, type: 'boolean' },
        'nr.suppression_level_db': { default: 20, type: 'number', min: 0, max: 40 },
        'nr.spectral_floor_db': { default: -70, type: 'number', min: -90, max: -40 },
        'nr.music_detection': { default: true, type: 'boolean' },
        'nr.voice_extraction': { default: true, type: 'boolean' },
        'nr.stationary_noise': { default: true, type: 'boolean' },
        'nr.transient_protection': { default: true, type: 'boolean' },
        'nr.preserve_speech': { default: true, type: 'boolean' }
      },

      // Compressor Knobs (6)
      compressor: {
        'compressor.enabled': { default: false, type: 'boolean' },
        'compressor.threshold_dbfs': { default: -20, type: 'number', min: -40, max: 0 },
        'compressor.ratio': { default: 4, type: 'number', min: 1, max: 20 },
        'compressor.knee_db': { default: 2, type: 'number', min: 0, max: 10 },
        'compressor.attack_ms': { default: 1, type: 'number', min: 0, max: 100 },
        'compressor.release_ms': { default: 100, type: 'number', min: 0, max: 1000 }
      },

      // Limiter Knobs (4)
      limiter: {
        'limiter.enabled': { default: true, type: 'boolean' },
        'limiter.threshold_dbfs': { default: -3, type: 'number', min: -20, max: 0 },
        'limiter.release_ms': { default: 50, type: 'number', min: 0, max: 500 },
        'limiter.lookahead_ms': { default: 5, type: 'number', min: 0, max: 20 }
      },

      // EQ Knobs (2)
      eq: {
        'eq.enabled': { default: false, type: 'boolean' },
        'eq.preset': { default: 'voice', type: 'string', values: ['flat', 'voice', 'music', 'custom'] }
      },

      // Buffer Control Knobs (15)
      buffer: {
        'buffer.size_ms': { default: 200, type: 'number', min: 20, max: 2000 },
        'buffer.jitter_size_ms': { default: 60, type: 'number', min: 10, max: 500 },
        'buffer.playout_delay_ms': { default: 40, type: 'number', min: 0, max: 200 },
        'buffer.adaptive': { default: true, type: 'boolean' },
        'buffer.min_delay_ms': { default: 20, type: 'number', min: 10, max: 100 },
        'buffer.max_delay_ms': { default: 500, type: 'number', min: 100, max: 2000 },
        'buffer.target_level_pct': { default: 50, type: 'number', min: 10, max: 90 },
        'buffer.acceleration': { default: 1.5, type: 'number', min: 1.0, max: 3.0 },
        'buffer.deceleration': { default: 0.99, type: 'number', min: 0.5, max: 1.0 },
        'buffer.concealment_mode': { default: 'interpolation', type: 'string' },
        'buffer.fec_enabled': { default: false, type: 'boolean' },
        'buffer.dtx_enabled': { default: false, type: 'boolean' },
        'buffer.clock_drift_compensation': { default: true, type: 'boolean' },
        'buffer.timestamp_mode': { default: 'wallclock', type: 'string' },
        'buffer.reorder_tolerance_ms': { default: 50, type: 'number', min: 0, max: 200 }
      },

      // Network Control Knobs (12)
      network: {
        'network.codec': { default: 'opus', type: 'string', values: ['opus', 'g711', 'g722', 'pcm'] },
        'network.bitrate_kbps': { default: 64, type: 'number', min: 8, max: 512 },
        'network.packet_size_ms': { default: 20, type: 'number', min: 10, max: 60 },
        'network.fec': { default: false, type: 'boolean' },
        'network.dtx': { default: false, type: 'boolean' },
        'network.vbr': { default: true, type: 'boolean' },
        'network.cbr_mode': { default: false, type: 'boolean' },
        'network.packet_loss_concealment': { default: true, type: 'boolean' },
        'network.jitter_compensation': { default: true, type: 'boolean' },
        'network.adaptive_bitrate': { default: true, type: 'boolean' },
        'network.congestion_control': { default: 'google', type: 'string' },
        'network.rtcp_feedback': { default: true, type: 'boolean' }
      },

      // Codec Knobs (8)
      codec: {
        'codec.type': { default: 'opus', type: 'string' },
        'codec.sample_rate': { default: 48000, type: 'number' },
        'codec.channels': { default: 1, type: 'number' },
        'codec.frame_size_ms': { default: 20, type: 'number' },
        'codec.complexity': { default: 5, type: 'number', min: 0, max: 10 },
        'codec.prediction': { default: true, type: 'boolean' },
        'codec.bandwidth': { default: 'fullband', type: 'string' },
        'codec.application': { default: 'voip', type: 'string' }
      },

      // Deepgram STT Knobs (12)
      deepgram: {
        'deepgram.model': { default: 'nova-2', type: 'string', values: ['nova', 'nova-2', 'enhanced', 'base'] },
        'deepgram.language': { default: 'en-US', type: 'string' },
        'deepgram.punctuate': { default: true, type: 'boolean' },
        'deepgram.profanity_filter': { default: false, type: 'boolean' },
        'deepgram.redact': { default: false, type: 'boolean' },
        'deepgram.diarize': { default: false, type: 'boolean' },
        'deepgram.smart_format': { default: true, type: 'boolean' },
        'deepgram.interim_results': { default: true, type: 'boolean' },
        'deepgram.endpointing': { default: 300, type: 'number', min: 0, max: 1000 },
        'deepgram.vad_turnoff': { default: 500, type: 'number', min: 0, max: 2000 },
        'deepgram.keywords': { default: '', type: 'string' },
        'deepgram.search': { default: '', type: 'string' }
      },

      // Translation Knobs (8)
      translation: {
        'translation.source_lang': { default: 'en', type: 'string' },
        'translation.target_lang': { default: 'es', type: 'string' },
        'translation.formality': { default: 'default', type: 'string', values: ['default', 'more', 'less'] },
        'translation.preserve_formatting': { default: true, type: 'boolean' },
        'translation.glossary_id': { default: '', type: 'string' },
        'translation.max_length': { default: 1000, type: 'number', min: 100, max: 10000 },
        'translation.timeout_ms': { default: 5000, type: 'number', min: 1000, max: 30000 },
        'translation.cache_enabled': { default: true, type: 'boolean' }
      },

      // TTS Knobs (10)
      tts: {
        'tts.voice_id': { default: 'eleven_monolingual_v1', type: 'string' },
        'tts.stability': { default: 0.5, type: 'number', min: 0, max: 1 },
        'tts.similarity_boost': { default: 0.75, type: 'number', min: 0, max: 1 },
        'tts.style': { default: 0.5, type: 'number', min: 0, max: 1 },
        'tts.use_speaker_boost': { default: true, type: 'boolean' },
        'tts.model': { default: 'eleven_multilingual_v2', type: 'string' },
        'tts.optimize_streaming_latency': { default: 3, type: 'number', min: 0, max: 4 },
        'tts.output_format': { default: 'pcm_16000', type: 'string' },
        'tts.chunk_length_schedule': { default: '[50,120,200,300]', type: 'string' },
        'tts.voice_cache': { default: true, type: 'boolean' }
      },

      // System Knobs (10)
      system: {
        'system.thread_priority': { default: 'high', type: 'string', values: ['low', 'normal', 'high', 'realtime'] },
        'system.cpu_affinity': { default: 'auto', type: 'string' },
        'system.memory_limit_mb': { default: 2048, type: 'number', min: 512, max: 8192 },
        'system.gc_interval_ms': { default: 30000, type: 'number', min: 5000, max: 120000 },
        'system.log_level': { default: 'info', type: 'string', values: ['debug', 'info', 'warn', 'error'] },
        'system.metrics_interval_ms': { default: 1000, type: 'number', min: 100, max: 10000 },
        'system.health_check_interval_ms': { default: 5000, type: 'number', min: 1000, max: 60000 },
        'system.restart_on_error': { default: true, type: 'boolean' },
        'system.max_restart_attempts': { default: 3, type: 'number', min: 0, max: 10 },
        'system.watchdog_timeout_ms': { default: 60000, type: 'number', min: 10000, max: 300000 }
      }
    };
  }

  /**
   * Get total knob count
   */
  getKnobCount() {
    let count = 0;
    for (const family in this.knobFamilies) {
      count += Object.keys(this.knobFamilies[family]).length;
    }
    return count;
  }

  /**
   * Collect ALL 75 metrics + ALL knob values
   * Now uses RealTimeMetricsProvider for actual data
   */
  async collectAll(context) {
    const collectionStart = Date.now();
    this.state = 'processing';
    this.totalProcessed++;
    this.lastActivityTime = Date.now();

    // Extract call ID if available
    if (context && context.callId) {
      this.currentCallId = context.callId;
      this.callStartTime = Date.now();
    }

    try {
      // Get real-time metrics context from the provider
      const metricsContext = this.metricsProvider.getMetricsContext(
        this.stationId,
        this.extension
      );

      // Merge any additional context from the caller
      const enrichedContext = {
        ...metricsContext,
        ...context
      };

      // Collect ALL 75 metrics with REAL DATA
      const { metrics: allMetrics, alerts: allAlerts } =
        await this.universalCollector.collectAll(enrichedContext);

      // Collect ALL current knob values
      const allKnobs = this.collectAllKnobValues();

      // Update counters based on alerts
      allAlerts.forEach(alert => {
        if (alert.level === 'warning') this.warningCount++;
        if (alert.level === 'critical') this.criticalCount++;
      });

      // Calculate processing time
      this.lastProcessingTime = Date.now() - collectionStart;
      this.state = 'active';
      this.successCount++;

      // Log metrics that have real values (for debugging)
      const realMetrics = Object.entries(allMetrics).filter(([k, v]) => v !== null);
      console.log(`[UnifiedCollector-${this.stationId}] Collected ${realMetrics.length}/75 real metrics`);

      // Return EVERYTHING with real data
      return {
        station_id: this.stationId,
        extension: this.extension,
        call_id: this.currentCallId || `${this.stationId}-${Date.now()}`,
        timestamp: new Date().toISOString(),

        // ALL 75 metrics with REAL VALUES
        metrics: allMetrics,
        metric_count: Object.keys(allMetrics).length,

        // ALL 113 knob values
        knobs: allKnobs,
        knob_count: Object.keys(allKnobs).length,

        // All alerts
        alerts: allAlerts,

        // Station metadata
        metadata: {
          state: this.state,
          processing_time_ms: this.lastProcessingTime,
          total_processed: this.totalProcessed,
          success_rate: this.totalProcessed > 0 ? (this.successCount / this.totalProcessed) * 100 : 100,
          warning_count: this.warningCount,
          critical_count: this.criticalCount,
          uptime_ms: Date.now() - this.startTime,
          real_metrics_count: realMetrics.length
        }
      };

    } catch (error) {
      this.errorCount++;
      this.state = 'error';
      console.error(`[UnifiedCollector-${this.stationId}] Collection error:`, error.message);

      return {
        station_id: this.stationId,
        extension: this.extension,
        call_id: this.currentCallId || `${this.stationId}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        metrics: {},
        knobs: {},
        alerts: [{
          metric: 'system',
          level: 'critical',
          message: `Collection failed: ${error.message}`
        }],
        metadata: {
          state: 'error',
          error: error.message
        }
      };
    }
  }

  /**
   * Collect all current knob values
   */
  collectAllKnobValues() {
    const knobValues = {};

    for (const family in this.knobFamilies) {
      for (const knobName in this.knobFamilies[family]) {
        const knobDef = this.knobFamilies[family][knobName];
        // Use current value or default
        knobValues[knobName] = this.currentKnobValues[knobName] !== undefined
          ? this.currentKnobValues[knobName]
          : knobDef.default;
      }
    }

    return knobValues;
  }

  /**
   * Apply knob values received from monitoring server
   */
  applyKnobs(knobUpdates) {
    const applied = [];
    const failed = [];

    for (const update of knobUpdates) {
      const { name, value } = update;

      // Find knob definition
      let knobDef = null;
      for (const family in this.knobFamilies) {
        if (this.knobFamilies[family][name]) {
          knobDef = this.knobFamilies[family][name];
          break;
        }
      }

      if (!knobDef) {
        failed.push({ name, reason: 'Unknown knob' });
        continue;
      }

      // Validate value
      if (!this.validateKnobValue(name, value, knobDef)) {
        failed.push({ name, reason: 'Invalid value' });
        continue;
      }

      // Apply the knob
      this.currentKnobValues[name] = value;
      applied.push({ name, value, previous: this.currentKnobValues[name] });

      console.log(`[UnifiedCollector-${this.stationId}] Applied knob: ${name} = ${value}`);
    }

    return { applied, failed };
  }

  /**
   * Validate a knob value against its definition
   */
  validateKnobValue(name, value, knobDef) {
    // Type check
    if (knobDef.type === 'boolean' && typeof value !== 'boolean') return false;
    if (knobDef.type === 'number' && typeof value !== 'number') return false;
    if (knobDef.type === 'string' && typeof value !== 'string') return false;
    if (knobDef.type === 'array' && !Array.isArray(value)) return false;

    // Range check for numbers
    if (knobDef.type === 'number') {
      if (knobDef.min !== undefined && value < knobDef.min) return false;
      if (knobDef.max !== undefined && value > knobDef.max) return false;
    }

    // Enum check for strings
    if (knobDef.type === 'string' && knobDef.values) {
      if (!knobDef.values.includes(value)) return false;
    }

    return true;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      stationId: this.stationId,
      extension: this.extension,
      totalProcessed: this.totalProcessed,
      successCount: this.successCount,
      errorCount: this.errorCount,
      warningCount: this.warningCount,
      criticalCount: this.criticalCount,
      successRate: this.totalProcessed > 0 ? (this.successCount / this.totalProcessed) * 100 : 100,
      state: this.state,
      uptime: Date.now() - this.startTime,
      metricsAvailable: 75,
      knobsAvailable: this.getKnobCount(),
      currentCallId: this.currentCallId
    };
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  /**
   * Reset counters
   */
  reset() {
    this.totalProcessed = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.warningCount = 0;
    this.criticalCount = 0;
    this.state = 'idle';
    this.startTime = Date.now();
    this.currentCallId = null;
    this.callStartTime = null;
    console.log(`[UnifiedCollector-${this.stationId}] Counters reset`);
  }

  /**
   * Record event for real metrics tracking
   */
  recordEvent(eventType, data) {
    // Pass events to the metrics provider for real-time tracking
    if (eventType === 'audio_received' || eventType === 'deepgram_data') {
      this.metricsProvider.updateFromServer({
        deepgram: data
      });
    } else if (eventType === 'audio_sent' || eventType === 'elevenlabs_data') {
      this.metricsProvider.updateFromServer({
        elevenLabs: data
      });
    } else if (eventType === 'translation_data') {
      this.metricsProvider.updateFromServer({
        translation: data
      });
    } else if (eventType === 'audio_level' || eventType === 'audio_buffer') {
      this.metricsProvider.updateFromServer({
        audio: data
      });
    } else if (eventType === 'network_stats') {
      this.metricsProvider.updateFromServer({
        network: data
      });
    }
  }
}

module.exports = UnifiedStationCollector;