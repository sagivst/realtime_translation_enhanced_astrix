/**
 * UnifiedStationCollector.js
 *
 * SINGLE UNIFIED COLLECTOR FOR ALL STATIONS
 * Collects ALL 75 metrics and ~100 knobs from EVERY station
 * Dashboard manages filtering - NOT this code
 *
 * As requested: "COLLECT AND STORE ALL 75 matrices and ±100 knobs
 * from all monitored stations the filter base on the current DOC
 * will be managed in the dashboard (settings)"
 */

const UniversalCollector = require('./UniversalCollector');

class UnifiedStationCollector {
  constructor(stationId, extension) {
    this.stationId = stationId;
    this.extension = extension || 'default';

    // Single universal collector for ALL 75 metrics
    this.universalCollector = new UniversalCollector();

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

    console.log(`[UnifiedCollector-${stationId}] Initialized with:`);
    console.log(`  - 75 metrics available for collection`);
    console.log(`  - ${Object.keys(this.knobFamilies).reduce((sum, family) => sum + Object.keys(this.knobFamilies[family]).length, 0)} knobs available for control`);
    console.log(`  - NO FILTERING - Dashboard manages relevancy`);
  }

  /**
   * Initialize ALL knob families (~100 knobs total)
   * These are WRITABLE control parameters
   */
  initializeAllKnobs() {
    return {
      // DSP Knobs (20 knobs)
      dsp: {
        'agc.enabled': { default: true, type: 'boolean' },
        'agc.target_level_dbfs': { default: -18, type: 'number', min: -40, max: 0 },
        'agc.compression_ratio': { default: 4, type: 'number', min: 1, max: 20 },
        'agc.attack_time_ms': { default: 10, type: 'number', min: 0, max: 1000 },
        'agc.release_time_ms': { default: 100, type: 'number', min: 0, max: 5000 },
        'agc.max_gain_db': { default: 30, type: 'number', min: 0, max: 60 },

        'aec.enabled': { default: true, type: 'boolean' },
        'aec.suppression_level_db': { default: -40, type: 'number', min: -60, max: 0 },
        'aec.tail_length_ms': { default: 128, type: 'number', min: 16, max: 512 },
        'aec.nlp_mode': { default: 'moderate', type: 'string', values: ['off', 'moderate', 'aggressive'] },

        'nr.enabled': { default: true, type: 'boolean' },
        'nr.suppression_level_db': { default: -12, type: 'number', min: -30, max: 0 },
        'nr.spectral_floor_db': { default: -65, type: 'number', min: -90, max: -40 },

        'compressor.enabled': { default: false, type: 'boolean' },
        'compressor.threshold_dbfs': { default: -12, type: 'number', min: -40, max: 0 },
        'compressor.ratio': { default: 4, type: 'number', min: 1, max: 20 },

        'limiter.enabled': { default: true, type: 'boolean' },
        'limiter.threshold_dbfs': { default: -3, type: 'number', min: -20, max: 0 },

        'eq.enabled': { default: false, type: 'boolean' },
        'eq.preset': { default: 'voice', type: 'string', values: ['flat', 'voice', 'music', 'custom'] }
      },

      // Buffer Control Knobs (15 knobs)
      buffer: {
        'buffer.size_ms': { default: 200, type: 'number', min: 20, max: 2000 },
        'buffer.jitter_size_ms': { default: 60, type: 'number', min: 10, max: 500 },
        'buffer.playout_delay_ms': { default: 40, type: 'number', min: 0, max: 200 },
        'buffer.adaptive_mode': { default: true, type: 'boolean' },
        'buffer.min_size_ms': { default: 20, type: 'number', min: 10, max: 100 },
        'buffer.max_size_ms': { default: 500, type: 'number', min: 100, max: 2000 },
        'buffer.target_level_pct': { default: 50, type: 'number', min: 10, max: 90 },
        'buffer.underrun_threshold_ms': { default: 10, type: 'number', min: 0, max: 50 },
        'buffer.overrun_threshold_ms': { default: 400, type: 'number', min: 100, max: 1000 },
        'buffer.growth_rate': { default: 1.5, type: 'number', min: 1.0, max: 3.0 },
        'buffer.shrink_rate': { default: 0.95, type: 'number', min: 0.5, max: 1.0 },
        'buffer.packet_loss_concealment': { default: true, type: 'boolean' },
        'buffer.fec_enabled': { default: false, type: 'boolean' },
        'buffer.interleaving_depth': { default: 0, type: 'number', min: 0, max: 10 },
        'buffer.reorder_tolerance_ms': { default: 50, type: 'number', min: 0, max: 200 }
      },

      // Network Control Knobs (12 knobs)
      network: {
        'network.codec': { default: 'opus', type: 'string', values: ['opus', 'g711', 'g722', 'pcm'] },
        'network.bitrate_kbps': { default: 64, type: 'number', min: 8, max: 512 },
        'network.packet_size_ms': { default: 20, type: 'number', min: 10, max: 60 },
        'network.dtx_enabled': { default: false, type: 'boolean' },
        'network.vad_mode': { default: 'normal', type: 'string', values: ['off', 'normal', 'aggressive'] },
        'network.redundancy_level': { default: 0, type: 'number', min: 0, max: 3 },
        'network.retransmission_enabled': { default: true, type: 'boolean' },
        'network.congestion_control': { default: 'adaptive', type: 'string', values: ['none', 'fixed', 'adaptive'] },
        'network.qos_dscp': { default: 46, type: 'number', min: 0, max: 63 },
        'network.rtp_timeout_ms': { default: 5000, type: 'number', min: 1000, max: 30000 },
        'network.keepalive_interval_ms': { default: 1000, type: 'number', min: 100, max: 10000 },
        'network.mtu_size': { default: 1500, type: 'number', min: 576, max: 9000 }
      },

      // Asterisk/PBX Control Knobs (10 knobs) - STATION 1
      asterisk: {
        'asterisk.echo_cancel': { default: 128, type: 'number', min: 0, max: 256 },
        'asterisk.silence_threshold': { default: 256, type: 'number', min: 0, max: 32767 },
        'asterisk.talk_detect': { default: 2560, type: 'number', min: 0, max: 32767 },
        'asterisk.rx_gain': { default: 0.0, type: 'number', min: -20.0, max: 20.0 },
        'asterisk.tx_gain': { default: 0.0, type: 'number', min: -20.0, max: 20.0 },
        'asterisk.jitter_buffer': { default: 'adaptive', type: 'string', values: ['fixed', 'adaptive', 'disabled'] },
        'asterisk.dtmf_mode': { default: 'rfc2833', type: 'string', values: ['inband', 'rfc2833', 'info'] },
        'asterisk.nat_mode': { default: 'auto', type: 'string', values: ['yes', 'no', 'auto'] },
        'asterisk.call_limit': { default: 10, type: 'number', min: 1, max: 100 },
        'asterisk.registration_timeout': { default: 3600, type: 'number', min: 60, max: 86400 }
      },

      // Gateway Control Knobs (8 knobs) - STATIONS 2, 7, 10
      gateway: {
        'gateway.ws_reconnect_interval_ms': { default: 1000, type: 'number', min: 100, max: 10000 },
        'gateway.ws_max_reconnects': { default: 10, type: 'number', min: 1, max: 100 },
        'gateway.audio_chunk_size': { default: 320, type: 'number', min: 160, max: 1920 },
        'gateway.sample_rate': { default: 16000, type: 'number', values: [8000, 16000, 48000] },
        'gateway.channels': { default: 1, type: 'number', values: [1, 2] },
        'gateway.encoding': { default: 'pcm', type: 'string', values: ['pcm', 'opus', 'mp3'] },
        'gateway.stream_timeout_ms': { default: 30000, type: 'number', min: 5000, max: 120000 },
        'gateway.debug_mode': { default: false, type: 'boolean' }
      },

      // Deepgram STT Control Knobs (12 knobs) - STATION 4
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
        'deepgram.keywords': { default: [], type: 'array' },
        'deepgram.search': { default: [], type: 'array' }
      },

      // Translation Control Knobs (8 knobs) - STATION 5
      translation: {
        'translation.source_lang': { default: 'en', type: 'string' },
        'translation.target_lang': { default: 'es', type: 'string' },
        'translation.formality': { default: 'default', type: 'string', values: ['default', 'more', 'less'] },
        'translation.preserve_formatting': { default: false, type: 'boolean' },
        'translation.glossary_id': { default: null, type: 'string' },
        'translation.max_length': { default: 5000, type: 'number', min: 100, max: 10000 },
        'translation.timeout_ms': { default: 5000, type: 'number', min: 1000, max: 30000 },
        'translation.cache_enabled': { default: true, type: 'boolean' }
      },

      // TTS Control Knobs (10 knobs) - STATION 6
      tts: {
        'tts.voice_id': { default: 'rachel', type: 'string' },
        'tts.stability': { default: 0.5, type: 'number', min: 0, max: 1 },
        'tts.similarity_boost': { default: 0.75, type: 'number', min: 0, max: 1 },
        'tts.style': { default: 0, type: 'number', min: 0, max: 1 },
        'tts.use_speaker_boost': { default: true, type: 'boolean' },
        'tts.model': { default: 'eleven_monolingual_v1', type: 'string' },
        'tts.optimize_streaming_latency': { default: 3, type: 'number', min: 0, max: 4 },
        'tts.output_format': { default: 'pcm_16000', type: 'string', values: ['pcm_16000', 'pcm_22050', 'pcm_44100'] },
        'tts.chunk_length_schedule': { default: [120, 160, 250], type: 'array' },
        'tts.voice_cache': { default: true, type: 'boolean' }
      },

      // Hume EVI Control Knobs (8 knobs) - STATION 11
      hume: {
        'hume.system_prompt': { default: '', type: 'string' },
        'hume.temperature': { default: 0.7, type: 'number', min: 0, max: 2 },
        'hume.max_tokens': { default: 500, type: 'number', min: 1, max: 4000 },
        'hume.emotion_model': { default: 'v2', type: 'string', values: ['v1', 'v2', 'v3'] },
        'hume.voice_config': { default: 'empathic', type: 'string' },
        'hume.interrupt_sensitivity': { default: 0.5, type: 'number', min: 0, max: 1 },
        'hume.turn_taking_mode': { default: 'balanced', type: 'string', values: ['passive', 'balanced', 'active'] },
        'hume.prosody_model': { default: true, type: 'boolean' }
      },

      // System/Performance Knobs (10 knobs) - ALL STATIONS
      system: {
        'system.thread_priority': { default: 'normal', type: 'string', values: ['low', 'normal', 'high', 'realtime'] },
        'system.cpu_affinity': { default: null, type: 'array' },
        'system.memory_limit_mb': { default: 512, type: 'number', min: 128, max: 4096 },
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
   * NO FILTERING - Dashboard manages what to display
   */
  async collectAll(context) {
    const collectionStart = Date.now();
    this.state = 'processing';
    this.totalProcessed++;
    this.lastActivityTime = Date.now();

    // Extract call ID if available
    if (context.callId) {
      this.currentCallId = context.callId;
      this.callStartTime = Date.now();
    }

    try {
      // Collect ALL 75 metrics
      const { metrics: allMetrics, alerts: allAlerts } =
        await this.universalCollector.collectAll(context);

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

      // Return EVERYTHING - no filtering
      return {
        station_id: this.stationId,
        extension: this.extension,
        call_id: this.currentCallId || `${this.stationId}-${Date.now()}`,
        timestamp: new Date().toISOString(),

        // ALL 75 metrics
        metrics: allMetrics,
        metric_count: Object.keys(allMetrics).length,

        // ALL ~100 knob values
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
          uptime_ms: Date.now() - this.startTime
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
   * Get knob catalog for dashboard
   */
  getKnobCatalog() {
    const catalog = [];

    for (const family in this.knobFamilies) {
      for (const knobName in this.knobFamilies[family]) {
        const knobDef = this.knobFamilies[family][knobName];
        catalog.push({
          name: knobName,
          family: family,
          type: knobDef.type,
          default: knobDef.default,
          current: this.currentKnobValues[knobName] || knobDef.default,
          ...knobDef
        });
      }
    }

    return catalog;
  }
}

module.exports = UnifiedStationCollector;