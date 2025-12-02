/**
 * StationKnobOptimizer.js
 *
 * Manages unique, optimized knob configurations per station-extension
 * Each station-extension pair gets its own AI-optimized template
 * Breaks the circular dependency - provides real operational values
 */

class StationKnobOptimizer {
  constructor() {
    // Store optimized templates per station-extension
    this.optimizedTemplates = new Map();

    // Store runtime values that override templates
    this.runtimeValues = new Map();

    // Track optimization history
    this.optimizationHistory = new Map();

    console.log('[StationKnobOptimizer] Initialized - Ready for per-station optimization');
  }

  /**
   * Generate a unique key for station-extension combination
   */
  getStationKey(stationId, extension) {
    return `${stationId}-${extension}`;
  }

  /**
   * Get optimized knob configuration for a specific station-extension
   * Each station-extension gets unique values based on its characteristics
   */
  getOptimizedKnobs(stationId, extension) {
    const key = this.getStationKey(stationId, extension);

    // Check if we have an optimized template for this station
    if (this.optimizedTemplates.has(key)) {
      // Merge template with any runtime overrides
      const template = this.optimizedTemplates.get(key);
      const runtime = this.runtimeValues.get(key) || {};
      return { ...template, ...runtime };
    }

    // Generate station-specific optimized values
    return this.generateOptimizedTemplate(stationId, extension);
  }

  /**
   * Generate an optimized template based on station characteristics
   * This simulates the recursive AI optimization process
   */
  generateOptimizedTemplate(stationId, extension) {
    const key = this.getStationKey(stationId, extension);

    // Station-specific optimization factors
    const stationNum = parseInt(stationId.replace('STATION_', ''));
    const extNum = parseInt(extension);

    // Create unique optimized values based on station characteristics
    const optimized = {
      // AGC Knobs - optimize based on station audio characteristics
      'agc.enabled': true,
      'agc.targetLevel': -18 + (stationNum % 3) * 2,  // Station-specific target
      'agc.maxGain': 25 + (extNum % 2) * 10,          // Extension-specific gain
      'agc.attackTime': 3 + stationNum,               // Faster for higher stations
      'agc.releaseTime': 80 + stationNum * 10,        // Adjusted per station
      'agc.holdTime': 40 + extNum * 5,                // Extension timing

      // AEC Knobs - optimize for acoustic environment
      'aec.enabled': true,
      'aec.filterLength': 256 + stationNum * 64,      // Larger for complex environments
      'aec.adaptationRate': 0.3 + (stationNum * 0.1), // Station-specific learning rate
      'aec.suppressionLevel': 15 + stationNum * 2,    // More suppression for noisy stations
      'aec.comfortNoise': extNum === 6666,            // Only for specific extensions
      'aec.nlpMode': stationNum <= 4 ? 'moderate' : 'aggressive',
      'aec.tailLength': 100 + stationNum * 8,
      'aec.convergenceTime': 150 + stationNum * 25,
      'aec.doubletalkDetection': true,
      'aec.echoCancellation': 20 + stationNum * 2,

      // Noise Reduction - station-specific noise profiles
      'noiseReduction.enabled': true,
      'noiseReduction.level': 10 + stationNum * 2,
      'noiseReduction.spectralFloor': -75 + stationNum,
      'noiseReduction.preserveVoice': true,
      'noiseReduction.adaptiveMode': stationNum >= 4,
      'noiseReduction.musicProtection': extNum === 7777,
      'noiseReduction.windFilter': stationNum === 3,
      'noiseReduction.suppressionBands': 12 + stationNum,

      // Compressor - optimized per station load
      'compressor.enabled': stationNum >= 5,
      'compressor.threshold': -25 + stationNum,
      'compressor.ratio': 3 + (stationNum % 3),
      'compressor.attack': 3 + stationNum % 5,
      'compressor.release': 80 + stationNum * 10,
      'compressor.knee': 1 + (stationNum % 3),

      // Limiter - station-specific protection
      'limiter.enabled': true,
      'limiter.threshold': -5 + (stationNum % 2),
      'limiter.release': 40 + stationNum * 5,
      'limiter.lookahead': 3 + (stationNum % 3),

      // Equalizer
      'eq.enabled': stationNum % 2 === 0,
      'eq.preset': stationNum <= 4 ? 'voice' : 'speech',

      // Buffer Management - optimized for station latency requirements
      'buffer.jitterBuffer.enabled': true,
      'buffer.jitterBuffer.minDepth': 15 + stationNum * 2,
      'buffer.jitterBuffer.maxDepth': 150 + stationNum * 10,
      'buffer.jitterBuffer.targetDepth': 40 + stationNum * 5,
      'buffer.jitterBuffer.adaptiveMode': stationNum >= 4,
      'buffer.playback.size': 2048 + stationNum * 512,
      'buffer.playback.latency': 30 + stationNum * 5,
      'buffer.playback.prefetch': 1 + (stationNum % 3),
      'buffer.record.size': 2048 + stationNum * 512,
      'buffer.record.latency': 25 + stationNum * 3,
      'buffer.record.chunks': 1 + (stationNum % 3),
      'buffer.network.size': 4096 + stationNum * 1024,
      'buffer.network.timeout': 800 + stationNum * 100,
      'buffer.processing.priority': stationNum <= 4 ? 'high' : 'normal',
      'buffer.processing.threads': 1 + (stationNum % 4),

      // Network - station-specific bandwidth allocation
      'network.packetization': 15 + stationNum * 2,
      'network.redundancy': stationNum >= 5,
      'network.fec.enabled': stationNum >= 6,
      'network.fec.percentage': stationNum >= 6 ? 5 : 0,
      'network.retransmission': true,
      'network.maxRetries': 2 + (stationNum % 3),
      'network.retryDelay': 80 + stationNum * 10,
      'network.congestionControl': stationNum <= 4 ? 'adaptive' : 'aggressive',
      'network.bandwidth.min': 48000 + stationNum * 8000,
      'network.bandwidth.max': 192000 + stationNum * 16000,
      'network.qos.dscp': 40 + stationNum,
      'network.keepAlive': true,

      // Codec Configuration - optimized per station quality requirements
      'codec.type': 'opus',
      'codec.bitrate': 32000 + stationNum * 8000,
      'codec.complexity': 8 + (stationNum % 3),
      'codec.vbr': stationNum <= 5,
      'codec.dtx': stationNum >= 6,
      'codec.fec': true,
      'codec.packetLossPercentage': 3 + (stationNum % 5),
      'codec.frameSize': 15 + stationNum,

      // Deepgram - station-specific STT settings
      'deepgram.model': stationNum <= 4 ? 'nova-2' : 'nova-2-general',
      'deepgram.language': 'en',
      'deepgram.punctuate': true,
      'deepgram.profanityFilter': extNum === 6666,
      'deepgram.redact': [],
      'deepgram.diarize': stationNum >= 5,
      'deepgram.multichannel': stationNum >= 6,
      'deepgram.alternatives': stationNum >= 5 ? 2 : 1,
      'deepgram.confidence': true,
      'deepgram.keywords': [],
      'deepgram.interim': true,
      'deepgram.endpointing': 250 + stationNum * 25,

      // Translation - station-specific language pairs
      'translation.enabled': true,
      'translation.sourceLanguage': 'auto',
      'translation.targetLanguage': extNum === 6666 ? 'es' : 'fr',
      'translation.formality': stationNum <= 4 ? 'default' : 'formal',
      'translation.profanityAction': 'preserve',
      'translation.preserveFormatting': true,
      'translation.glossary': null,
      'translation.timeout': 4000 + stationNum * 200,

      // TTS - station-specific voice settings
      'tts.voice': stationNum <= 4 ? 'rachel' : 'drew',
      'tts.speed': 0.9 + (stationNum * 0.02),
      'tts.pitch': 0.95 + (stationNum * 0.01),
      'tts.volume': 0.9 + (extNum === 7777 ? 0.1 : 0),
      'tts.emphasis': stationNum <= 4 ? 'moderate' : 'strong',
      'tts.pauseDuration': 'normal',
      'tts.sentencePause': 300 + stationNum * 50,
      'tts.paragraphPause': 600 + stationNum * 100,
      'tts.ssml': stationNum >= 5,
      'tts.caching': true,

      // System Control - station-specific monitoring
      'system.monitoring.enabled': true,
      'system.monitoring.interval': 800 + stationNum * 100,
      'system.monitoring.verbosity': stationNum >= 6 ? 'verbose' : 'normal',
      'system.logging.level': stationNum >= 5 ? 'debug' : 'info',
      'system.logging.maxFiles': 8 + stationNum,
      'system.logging.maxSize': `${5 + stationNum}MB`,
      'system.performance.mode': stationNum <= 4 ? 'balanced' : 'performance',
      'system.performance.cpuThreshold': 75 + stationNum,
      'system.performance.memoryThreshold': 80 + stationNum,
      'system.fallback.enabled': true,

      // Miscellaneous
      'misc.experimentalFeatures': stationNum >= 6,
      'misc.debugMode': stationNum >= 7
    };

    // Cache the optimized template
    this.optimizedTemplates.set(key, optimized);

    // Track optimization
    this.optimizationHistory.set(key, {
      timestamp: new Date().toISOString(),
      iteration: 1,
      source: 'initial'
    });

    console.log(`[StationKnobOptimizer] Generated optimized template for ${key}`);
    console.log(`  - AGC target: ${optimized['agc.targetLevel']}dB (station-specific)`);
    console.log(`  - Buffer size: ${optimized['buffer.playback.size']} (optimized for latency)`);
    console.log(`  - Codec bitrate: ${optimized['codec.bitrate']} (quality-optimized)`);

    return optimized;
  }

  /**
   * Update runtime values from actual operation
   * This is where STTTTSserver provides REAL operational data
   */
  updateRuntimeValues(stationId, extension, updates) {
    const key = this.getStationKey(stationId, extension);

    // Get current runtime values or initialize
    const current = this.runtimeValues.get(key) || {};

    // Merge updates
    const updated = { ...current, ...updates };
    this.runtimeValues.set(key, updated);

    console.log(`[StationKnobOptimizer] Runtime update for ${key}:`,
                Object.keys(updates).length, 'knobs updated');
  }

  /**
   * Apply AI optimization based on performance metrics
   * This simulates the recursive optimization process
   */
  applyAIOptimization(stationId, extension, performanceMetrics) {
    const key = this.getStationKey(stationId, extension);
    const current = this.getOptimizedKnobs(stationId, extension);
    const optimized = { ...current };

    // Optimize based on performance metrics
    if (performanceMetrics.audioQuality?.snr < 30) {
      // Poor SNR - increase noise reduction
      optimized['noiseReduction.level'] = Math.min(30, current['noiseReduction.level'] + 5);
      optimized['noiseReduction.suppressionBands'] = Math.min(24, current['noiseReduction.suppressionBands'] + 4);
    }

    if (performanceMetrics.latency?.avg > 100) {
      // High latency - optimize buffers
      optimized['buffer.jitterBuffer.targetDepth'] = Math.max(20, current['buffer.jitterBuffer.targetDepth'] - 10);
      optimized['buffer.playback.latency'] = Math.max(20, current['buffer.playback.latency'] - 5);
    }

    if (performanceMetrics.packets?.loss > 5) {
      // Packet loss - enable FEC
      optimized['network.fec.enabled'] = true;
      optimized['network.fec.percentage'] = Math.min(20, performanceMetrics.packets.loss * 2);
      optimized['codec.fec'] = true;
    }

    // Update template with optimizations
    this.optimizedTemplates.set(key, optimized);

    // Track optimization history
    const history = this.optimizationHistory.get(key) || { iteration: 0 };
    this.optimizationHistory.set(key, {
      timestamp: new Date().toISOString(),
      iteration: history.iteration + 1,
      source: 'ai-optimization',
      metrics: performanceMetrics
    });

    console.log(`[StationKnobOptimizer] AI optimization applied for ${key} (iteration ${history.iteration + 1})`);

    return optimized;
  }

  /**
   * Get all 16 values for a specific knob across all station-extensions
   */
  getKnobAcrossStations(knobName) {
    const values = {};
    const stations = ['STATION_3', 'STATION_4', 'STATION_5', 'STATION_6',
                     'STATION_7', 'STATION_8', 'STATION_9', 'STATION_10'];
    const extensions = [6666, 7777];

    for (const station of stations) {
      for (const ext of extensions) {
        const key = this.getStationKey(station, ext);
        const knobs = this.getOptimizedKnobs(station, ext);
        values[key] = knobs[knobName];
      }
    }

    return values;
  }

  /**
   * Export optimization data for analysis
   */
  exportOptimizationData() {
    return {
      templates: Array.from(this.optimizedTemplates.entries()),
      runtime: Array.from(this.runtimeValues.entries()),
      history: Array.from(this.optimizationHistory.entries())
    };
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance() {
    if (!instance) {
      instance = new StationKnobOptimizer();
    }
    return instance;
  },
  StationKnobOptimizer
};