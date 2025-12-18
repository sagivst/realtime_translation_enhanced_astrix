// Configuration Factory Defaults - Complete 113-Knob System
// Three-layer configuration: defaults (factory) / saved_defaults (user-modified) / active (runtime)

const fs = require('fs');

class ConfigFactoryDefaults {
  constructor(extensionId) {
    this.extensionId = extensionId;
    this.configPath = `/tmp/STATION_CONFIG-${extensionId}.json`;

    // Determine languages based on extension
    const isEnglish = extensionId === '3333';
    const sourceLang = isEnglish ? 'en' : 'fr';
    const targetLang = isEnglish ? 'fr' : 'en';

    // Complete 113-knob factory defaults
    this.factoryDefaults = {
      // === 1. AGC (Automatic Gain Control) - 8 knobs ===
      agc: {
        enabled: true,
        targetLevel: -20,         // Target RMS level in dBFS
        maxGain: 12,              // Maximum gain in dB
        minGain: -12,             // Minimum gain in dB
        attackTime: 0.1,          // Attack time in seconds
        releaseTime: 0.3,         // Release time in seconds
        compressionRatio: 3.0,    // Compression ratio
        threshold: -30            // Threshold in dBFS
      },

      // === 2. AEC (Acoustic Echo Cancellation) - 7 knobs ===
      aec: {
        enabled: false,
        filterLength: 256,        // Filter length in samples
        stepSize: 0.1,            // Adaptation step size
        nlpEnabled: true,         // Non-linear processing
        nlpThreshold: -40,        // NLP threshold in dBFS
        echoSuppression: 10,      // Echo suppression in dB
        convergenceTime: 2.0      // Convergence time in seconds
      },

      // === 3. Noise Reduction - 9 knobs ===
      noiseReduction: {
        enabled: true,
        level: 'moderate',        // 'off', 'light', 'moderate', 'aggressive'
        spectralSubtraction: true,
        smoothingFactor: 0.9,
        noiseFloorEstimate: -50,  // in dBFS
        snrThreshold: 10,         // Minimum SNR in dB
        updateRate: 0.1,          // Update rate in seconds
        transientProtection: true,
        musicNoiseReduction: true
      },

      // === 4. Compressor - 8 knobs ===
      compressor: {
        enabled: false,
        threshold: -20,           // in dBFS
        ratio: 4.0,               // Compression ratio
        attackTime: 0.005,        // in seconds
        releaseTime: 0.1,         // in seconds
        kneeWidth: 6,             // in dB
        makeupGain: 0,            // in dB
        autoMakeup: true
      },

      // === 5. Limiter - 6 knobs ===
      limiter: {
        enabled: true,
        threshold: -3,            // in dBFS
        releaseTime: 0.05,        // in seconds
        lookahead: 0.001,         // in seconds
        ceilingLevel: -1,         // in dBFS
        linkChannels: true
      },

      // === 6. Equalizer - 10 knobs ===
      equalizer: {
        enabled: false,
        lowShelfGain: 0,          // in dB
        lowShelfFreq: 100,        // in Hz
        midPeakGain: 0,           // in dB
        midPeakFreq: 1000,        // in Hz
        midPeakQ: 1.0,
        highShelfGain: 0,         // in dB
        highShelfFreq: 8000,      // in Hz
        presenceBoost: 0,         // in dB at 2-4kHz
        brightnessBoost: 0,       // in dB at 6-10kHz
        warmthBoost: 0            // in dB at 200-500Hz
      },

      // === 7. Buffer Management - 7 knobs ===
      buffer: {
        size: 320,                // Buffer size in samples (20ms at 16kHz)
        minSize: 160,             // Minimum buffer (10ms)
        maxSize: 640,             // Maximum buffer (40ms)
        targetLatency: 50,        // Target latency in ms
        adaptiveResize: true,
        overflowStrategy: 'drop', // 'drop', 'expand', 'block'
        underflowStrategy: 'repeat' // 'repeat', 'silence', 'interpolate'
      },

      // === 8. Jitter Buffer - 6 knobs ===
      jitterBuffer: {
        enabled: true,
        nominalDelay: 40,         // in ms
        maxDelay: 100,            // in ms
        minDelay: 20,             // in ms
        adaptiveMode: true,
        latePacketStrategy: 'interpolate' // 'drop', 'interpolate', 'repeat'
      },

      // === 9. Network/RTP - 8 knobs ===
      network: {
        rtpPort: null,            // Determined at runtime
        rtcpEnabled: true,
        packetizationTime: 20,    // in ms
        maxPacketSize: 1200,      // in bytes
        dscp: 46,                 // DSCP value for QoS (EF)
        dtmfPayloadType: 101,
        redundancyEnabled: false,
        fecEnabled: false         // Forward Error Correction
      },

      // === 10. Asterisk/ARI - 7 knobs ===
      asterisk: {
        ariUrl: 'http://localhost:8088/ari',
        username: 'asterisk',
        password: 'asterisk',
        appName: 'translation-app',
        autoAnswer: true,
        ringTimeout: 30,          // in seconds
        dtmfMode: 'rfc2833'       // 'rfc2833', 'inband', 'info'
      },

      // === 11. Gateway Configuration - 6 knobs ===
      gateway: {
        host: 'localhost',
        port: extensionId,        // 3333 or 4444
        protocol: 'udp',
        reconnectInterval: 5000,  // in ms
        maxReconnectAttempts: 10,
        heartbeatInterval: 30000  // in ms
      },

      // === 12. Deepgram (Station-3 only) - 12 knobs ===
      deepgram: {
        model: 'nova-3',          // CRITICAL: Production default
        language: sourceLang,
        encoding: 'linear16',
        sampleRate: 16000,
        channels: 1,
        punctuate: true,
        interimResults: true,
        endpointing: 300,         // in ms
        vadTurnoff: 500,          // in ms
        smartFormat: true,
        diarize: false,
        utterances: true
      },

      // === 13. Translation Service - 5 knobs ===
      translation: {
        provider: 'google',       // 'google', 'azure', 'aws', 'deepl'
        sourceLang: sourceLang,
        targetLang: targetLang,
        cacheEnabled: true,
        timeout: 5000             // in ms
      },

      // === 14. TTS (Station-9 only) - 9 knobs ===
      tts: {
        provider: 'elevenlabs',   // 'elevenlabs', 'google', 'azure', 'aws'
        voice: targetLang === 'fr' ? 'Antoine' : 'Rachel',
        model: 'eleven_multilingual_v2',
        stability: 0.5,
        similarityBoost: 0.75,
        style: 0.0,
        useSpeakerBoost: true,
        optimizeStreamingLatency: 3,
        outputFormat: 'pcm_16000'
      },

      // === 15. System/Runtime - 11 knobs ===
      system: {
        logLevel: 'info',         // 'error', 'warn', 'info', 'debug', 'trace'
        metricsEnabled: true,
        metricsInterval: 1000,    // in ms
        healthCheckInterval: 30000, // in ms
        gracefulShutdownTimeout: 10000, // in ms
        maxConcurrentCalls: 10,
        memoryLimitMB: 512,
        cpuThresholdPercent: 80,
        autoRestartOnError: true,
        errorThresholdCount: 5,
        errorWindowSeconds: 60
      }
    };
  }

  /**
   * Get complete active configuration (3-layer merge)
   * Priority: active (runtime) > saved_defaults (user) > defaults (factory)
   * @returns {Object} Complete merged configuration
   */
  getActiveConfig() {
    try {
      // Load saved configuration if exists
      let savedConfig = {};
      if (fs.existsSync(this.configPath)) {
        const fileData = fs.readFileSync(this.configPath, 'utf8');
        savedConfig = JSON.parse(fileData);
      }

      // Three-layer merge: factory <- saved <- active
      const merged = this.deepMerge(
        this.factoryDefaults,
        savedConfig.saved_defaults || {},
        savedConfig.active || {}
      );

      return merged;
    } catch (error) {
      console.error(`[ConfigFactory-${this.extensionId}] Error loading config:`, error.message);
      return this.factoryDefaults;
    }
  }

  /**
   * Deep merge multiple configuration objects
   * @param {...Object} sources - Configuration objects to merge
   * @returns {Object} Merged configuration
   */
  deepMerge(...sources) {
    const result = {};

    for (const source of sources) {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * Count total knobs in configuration
   * @param {Object} config - Configuration object
   * @returns {number} Total count of knobs
   */
  countKnobs(config = null) {
    const configToCount = config || this.factoryDefaults;
    let count = 0;

    for (const category in configToCount) {
      if (typeof configToCount[category] === 'object') {
        count += Object.keys(configToCount[category]).length;
      }
    }

    return count;
  }

  /**
   * Get factory defaults
   * @returns {Object} Factory default configuration
   */
  getFactoryDefaults() {
    return JSON.parse(JSON.stringify(this.factoryDefaults));
  }

  /**
   * Save user-modified defaults
   * @param {Object} userDefaults - User-modified default values
   */
  saveUserDefaults(userDefaults) {
    try {
      const config = {
        defaults: this.factoryDefaults,
        saved_defaults: userDefaults,
        active: {}
      };

      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      console.log(`[ConfigFactory-${this.extensionId}] Saved user defaults`);
    } catch (error) {
      console.error(`[ConfigFactory-${this.extensionId}] Error saving config:`, error.message);
    }
  }

  /**
   * Reset to factory defaults
   */
  resetToFactory() {
    try {
      const config = {
        defaults: this.factoryDefaults,
        saved_defaults: {},
        active: {}
      };

      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      console.log(`[ConfigFactory-${this.extensionId}] Reset to factory defaults`);
    } catch (error) {
      console.error(`[ConfigFactory-${this.extensionId}] Error resetting config:`, error.message);
    }
  }

  /**
   * Validate configuration structure
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result with { valid: boolean, errors: string[] }
   */
  validateConfig(config) {
    const errors = [];
    const requiredCategories = [
      'agc', 'aec', 'noiseReduction', 'compressor', 'limiter',
      'equalizer', 'buffer', 'jitterBuffer', 'network', 'asterisk',
      'gateway', 'deepgram', 'translation', 'tts', 'system'
    ];

    for (const category of requiredCategories) {
      if (!config[category]) {
        errors.push(`Missing category: ${category}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get knob value by path (e.g., 'deepgram.model')
   * @param {string} path - Dot-notation path to knob
   * @returns {*} Knob value or undefined
   */
  getKnob(path) {
    const config = this.getActiveConfig();
    const parts = path.split('.');
    let value = config;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Set knob value by path (updates active configuration)
   * @param {string} path - Dot-notation path to knob
   * @param {*} value - New value
   */
  setKnob(path, value) {
    try {
      // Load current config
      let fileData = { defaults: this.factoryDefaults, saved_defaults: {}, active: {} };
      if (fs.existsSync(this.configPath)) {
        fileData = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }

      // Set value in active config
      const parts = path.split('.');
      let target = fileData.active;

      for (let i = 0; i < parts.length - 1; i++) {
        if (!target[parts[i]]) {
          target[parts[i]] = {};
        }
        target = target[parts[i]];
      }

      target[parts[parts.length - 1]] = value;

      // Save updated config
      fs.writeFileSync(this.configPath, JSON.stringify(fileData, null, 2));
      console.log(`[ConfigFactory-${this.extensionId}] Set ${path} = ${value}`);
    } catch (error) {
      console.error(`[ConfigFactory-${this.extensionId}] Error setting knob:`, error.message);
    }
  }
}

module.exports = ConfigFactoryDefaults;
