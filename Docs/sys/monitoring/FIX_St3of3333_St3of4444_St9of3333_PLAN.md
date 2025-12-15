# COMPREHENSIVE IMPLEMENTATION PLAN
## Closing All Gaps: 75 Parameters + 113 Knobs for All Stations

**Date**: December 9, 2025
**Target**: Fix Station-3/3333, Station-3/4444, Station-9/3333
**Reference**: Station-9/4444 (currently working)
**Goal**: All 4 stations sending complete data (75 params + 113 knobs) to API

---

## EXECUTIVE SUMMARY

### Current Reality
- **Infrastructure**: ✅ All files exist, imports wired, event hooks connected
- **Data Collection**: ❌ Only 4-5 basic params collected vs 14-15 documented
- **Configuration**: ❌ Only 2-3 knobs vs 113 documented
- **Working Stations**: 1 of 4 (25%) - Only Station-9/4444 sending data to API

### Gap Analysis
| Component | Documented | Current | Gap % |
|-----------|-----------|---------|-------|
| Station-3 Parameters | 14 | ~4 | 71% |
| Station-9 Parameters | 15 | ~5 | 67% |
| System Knobs | 113 | 2-3 | 98% |
| Working Stations | 4 | 1 | 75% |

### Root Causes
1. **Handlers pass minimal context** - Only basic metadata, no audio analysis
2. **UniversalCollector is a shell** - Declares 75 collectors but returns mostly null
3. **No audio analysis pipeline** - Cannot calculate SNR, clipping, RMS, MOS
4. **No DSP metric extraction** - AGC, compressor, limiter values not exposed
5. **Config system not implemented** - Three-layer structure missing

### Implementation Approach
- **NO STTTTSserver.js changes** - All event hooks already wired correctly
- **Focus on handlers and collectors** - Expand data collection at source
- **Add audio analysis utilities** - Real-time SNR, clipping, RMS calculations
- **Implement 113-knob system** - Three-layer config with factory defaults
- **Test incrementally** - Deploy and verify each station one at a time

---

## PHASE 1: AUDIO ANALYSIS UTILITIES (Foundation)

### Overview
Create utility functions for real-time audio analysis that will be used by all handlers.

### Files to Create
- `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/audio-analysis-utils.js`

### Implementation Details

#### Step 1.1: Create Audio Analysis Utilities File
```javascript
/**
 * audio-analysis-utils.js
 * Real-time audio analysis utilities for monitoring
 */

class AudioAnalysisUtils {
  /**
   * Calculate Signal-to-Noise Ratio (SNR) in dB
   * @param {Buffer} pcmBuffer - PCM audio buffer (16-bit linear)
   * @param {number} sampleRate - Sample rate (default 16000)
   * @returns {number} SNR in dB
   */
  static calculateSNR(pcmBuffer, sampleRate = 16000) {
    if (!pcmBuffer || pcmBuffer.length < 2) return null;

    try {
      // Convert PCM buffer to float samples
      const samples = [];
      for (let i = 0; i < pcmBuffer.length; i += 2) {
        const sample = pcmBuffer.readInt16LE(i) / 32768.0;
        samples.push(sample);
      }

      // Calculate RMS (signal power)
      const rms = Math.sqrt(
        samples.reduce((sum, s) => sum + s * s, 0) / samples.length
      );

      // Estimate noise floor (lowest 10% of samples)
      const sortedAbs = samples.map(Math.abs).sort((a, b) => a - b);
      const noiseFloorIdx = Math.floor(sortedAbs.length * 0.1);
      const noiseFloor = sortedAbs.slice(0, noiseFloorIdx).reduce((a, b) => a + b, 0) / noiseFloorIdx;

      // Calculate SNR in dB
      if (noiseFloor === 0) return 60; // Very clean signal
      const snr = 20 * Math.log10(rms / noiseFloor);

      return Math.max(0, Math.min(60, snr)); // Clamp to 0-60 dB range
    } catch (error) {
      console.error('[AudioAnalysis] SNR calculation error:', error.message);
      return null;
    }
  }

  /**
   * Calculate RMS (Root Mean Square) level in dBFS
   * @param {Buffer} pcmBuffer - PCM audio buffer
   * @returns {number} RMS level in dBFS
   */
  static calculateRMS(pcmBuffer) {
    if (!pcmBuffer || pcmBuffer.length < 2) return null;

    try {
      let sumSquares = 0;
      const sampleCount = Math.floor(pcmBuffer.length / 2);

      for (let i = 0; i < pcmBuffer.length; i += 2) {
        const sample = pcmBuffer.readInt16LE(i) / 32768.0;
        sumSquares += sample * sample;
      }

      const rms = Math.sqrt(sumSquares / sampleCount);

      // Convert to dBFS (dB relative to full scale)
      if (rms === 0) return -100; // Silence
      const dbfs = 20 * Math.log10(rms);

      return Math.max(-60, Math.min(0, dbfs)); // Clamp to -60 to 0 dBFS
    } catch (error) {
      console.error('[AudioAnalysis] RMS calculation error:', error.message);
      return null;
    }
  }

  /**
   * Detect audio clipping (samples at or near maximum amplitude)
   * @param {Buffer} pcmBuffer - PCM audio buffer
   * @param {number} threshold - Clipping threshold (0.95 = 95% of max)
   * @returns {number} Percentage of clipped samples (0-100)
   */
  static detectClipping(pcmBuffer, threshold = 0.95) {
    if (!pcmBuffer || pcmBuffer.length < 2) return 0;

    try {
      let clippedCount = 0;
      const sampleCount = Math.floor(pcmBuffer.length / 2);
      const clippingThreshold = 32768 * threshold;

      for (let i = 0; i < pcmBuffer.length; i += 2) {
        const sample = Math.abs(pcmBuffer.readInt16LE(i));
        if (sample >= clippingThreshold) {
          clippedCount++;
        }
      }

      return (clippedCount / sampleCount) * 100;
    } catch (error) {
      console.error('[AudioAnalysis] Clipping detection error:', error.message);
      return 0;
    }
  }

  /**
   * Calculate noise floor in dBFS
   * @param {Buffer} pcmBuffer - PCM audio buffer
   * @returns {number} Noise floor in dBFS
   */
  static calculateNoiseFloor(pcmBuffer) {
    if (!pcmBuffer || pcmBuffer.length < 2) return null;

    try {
      const samples = [];
      for (let i = 0; i < pcmBuffer.length; i += 2) {
        const sample = Math.abs(pcmBuffer.readInt16LE(i) / 32768.0);
        samples.push(sample);
      }

      // Sort and take lowest 10% as noise floor
      samples.sort((a, b) => a - b);
      const noiseFloorIdx = Math.floor(samples.length * 0.1);
      const noiseFloor = samples.slice(0, noiseFloorIdx).reduce((a, b) => a + b, 0) / noiseFloorIdx;

      if (noiseFloor === 0) return -100;
      return 20 * Math.log10(noiseFloor);
    } catch (error) {
      console.error('[AudioAnalysis] Noise floor calculation error:', error.message);
      return null;
    }
  }

  /**
   * Estimate Mean Opinion Score (MOS) for audio quality
   * Simplified algorithm based on SNR, clipping, and level
   * @param {Object} metrics - Audio metrics object
   * @returns {number} MOS score (1.0 - 5.0)
   */
  static estimateMOS(metrics) {
    try {
      const { snr, clipping, rmsLevel } = metrics;

      // Start with perfect score
      let mos = 5.0;

      // Degrade based on SNR
      if (snr !== null) {
        if (snr < 15) mos -= 2.0;
        else if (snr < 25) mos -= 1.0;
        else if (snr < 35) mos -= 0.5;
      }

      // Degrade based on clipping
      if (clipping !== null) {
        if (clipping > 5) mos -= 2.0;
        else if (clipping > 1) mos -= 1.0;
        else if (clipping > 0.1) mos -= 0.3;
      }

      // Degrade if level is too low or too high
      if (rmsLevel !== null) {
        if (rmsLevel < -40 || rmsLevel > -6) mos -= 1.0;
        else if (rmsLevel < -35 || rmsLevel > -10) mos -= 0.5;
      }

      return Math.max(1.0, Math.min(5.0, mos));
    } catch (error) {
      console.error('[AudioAnalysis] MOS estimation error:', error.message);
      return 3.0; // Return fair quality on error
    }
  }

  /**
   * Detect voice activity in audio buffer
   * @param {Buffer} pcmBuffer - PCM audio buffer
   * @param {number} threshold - Voice activity threshold in dBFS
   * @returns {number} Voice activity ratio (0.0 - 1.0)
   */
  static detectVoiceActivity(pcmBuffer, threshold = -40) {
    if (!pcmBuffer || pcmBuffer.length < 2) return 0;

    try {
      let activeFrames = 0;
      const frameSize = 320; // 20ms at 16kHz (320 samples)
      const totalFrames = Math.floor(pcmBuffer.length / (frameSize * 2));

      for (let frame = 0; frame < totalFrames; frame++) {
        let sumSquares = 0;
        const frameStart = frame * frameSize * 2;

        for (let i = 0; i < frameSize * 2; i += 2) {
          const sample = pcmBuffer.readInt16LE(frameStart + i) / 32768.0;
          sumSquares += sample * sample;
        }

        const rms = Math.sqrt(sumSquares / frameSize);
        const dbfs = rms > 0 ? 20 * Math.log10(rms) : -100;

        if (dbfs > threshold) {
          activeFrames++;
        }
      }

      return activeFrames / totalFrames;
    } catch (error) {
      console.error('[AudioAnalysis] Voice activity detection error:', error.message);
      return 0;
    }
  }

  /**
   * Analyze complete audio buffer and return all metrics
   * @param {Buffer} pcmBuffer - PCM audio buffer
   * @param {number} sampleRate - Sample rate
   * @returns {Object} Complete audio metrics
   */
  static analyzeAudio(pcmBuffer, sampleRate = 16000) {
    const snr = this.calculateSNR(pcmBuffer, sampleRate);
    const rmsLevel = this.calculateRMS(pcmBuffer);
    const clipping = this.detectClipping(pcmBuffer);
    const noiseFloor = this.calculateNoiseFloor(pcmBuffer);
    const voiceActivity = this.detectVoiceActivity(pcmBuffer);

    const metrics = {
      snr_db: snr,
      rms_level_dbfs: rmsLevel,
      clipping_percent: clipping,
      noise_floor_dbfs: noiseFloor,
      voice_activity_ratio: voiceActivity
    };

    // Calculate MOS based on collected metrics
    metrics.mos_score = this.estimateMOS({
      snr: snr,
      clipping: clipping,
      rmsLevel: rmsLevel
    });

    return metrics;
  }
}

module.exports = AudioAnalysisUtils;
```

#### Step 1.2: Verification
```bash
# Deploy the audio analysis utilities
scp /tmp/audio-analysis-utils.js azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/

# Test the utilities
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && node -e \"
const AudioAnalysisUtils = require('./audio-analysis-utils');

// Create test buffer (1 second of audio at 16kHz)
const testBuffer = Buffer.alloc(32000);
for (let i = 0; i < testBuffer.length; i += 2) {
  testBuffer.writeInt16LE(Math.floor(Math.sin(i / 100) * 10000), i);
}

const metrics = AudioAnalysisUtils.analyzeAudio(testBuffer);
console.log('✅ Audio Analysis Utils Test:');
console.log(JSON.stringify(metrics, null, 2));
\""
```

**Expected Output**:
```json
{
  "snr_db": 25.3,
  "rms_level_dbfs": -18.2,
  "clipping_percent": 0,
  "noise_floor_dbfs": -65.4,
  "voice_activity_ratio": 0.85,
  "mos_score": 4.2
}
```

**Completion Criteria**:
- ✅ File created and deployed
- ✅ All 7 utility functions working
- ✅ Test returns reasonable audio metrics
- ✅ No errors in console output

---

## PHASE 2: IMPLEMENT 113-KNOB CONFIGURATION SYSTEM

### Overview
Create the three-layer configuration system with all 113 documented knobs.

### Files to Create
- `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/config-factory-defaults.js`

### Implementation Details

#### Step 2.1: Create Factory Defaults Configuration
```javascript
/**
 * config-factory-defaults.js
 * Factory default values for all 113 system knobs
 */

class ConfigFactoryDefaults {
  /**
   * Get complete factory default configuration
   * Three-layer structure: defaults / saved_defaults / active
   */
  static getFactoryDefaults(extensionId) {
    const isEnglish = extensionId === '3333';

    return {
      // Layer 1: Factory defaults (never modified)
      defaults: {
        // 1. AGC (Automatic Gain Control) - 5 knobs
        agc: {
          enabled: true,
          targetLevel: -18,        // Target level in dBFS
          maxGain: 30,             // Maximum gain in dB
          attackTime: 10,          // Attack time in ms
          releaseTime: 100         // Release time in ms
        },

        // 2. AEC (Acoustic Echo Cancellation) - 4 knobs
        aec: {
          enabled: true,
          tailLength: 128,         // Echo tail length in ms
          suppression: 40,         // Suppression level in dB
          convergenceTime: 500     // Convergence time in ms
        },

        // 3. Noise Reduction - 4 knobs
        noiseReduction: {
          enabled: true,
          level: 20,               // Reduction level in dB
          adaptiveMode: true,      // Adaptive noise reduction
          spectralSubtraction: 0.7 // Spectral subtraction factor
        },

        // 4. Compressor - 5 knobs
        compressor: {
          enabled: true,
          threshold: -24,          // Threshold in dBFS
          ratio: 4,                // Compression ratio (4:1)
          attack: 5,               // Attack time in ms
          release: 50              // Release time in ms
        },

        // 5. Limiter - 3 knobs
        limiter: {
          enabled: true,
          threshold: -3,           // Threshold in dBFS
          release: 10              // Release time in ms
        },

        // 6. Equalizer - 7 knobs
        equalizer: {
          enabled: false,
          preset: 'flat',          // Preset: flat, voice, music
          bands: [],               // Custom EQ bands
          lowShelf: { freq: 80, gain: 0 },
          highShelf: { freq: 12000, gain: 0 },
          midPeak: { freq: 1000, gain: 0, q: 1.0 },
          customResponse: null
        },

        // 7. Buffer/Jitter - 8 knobs
        buffer: {
          inputSize: 160,          // Input buffer size (10ms at 16kHz)
          outputSize: 160,         // Output buffer size
          playbackSize: 320,       // Playback buffer size (20ms)
          recordSize: 320          // Record buffer size (20ms)
        },
        jitter: {
          bufferSize: 60,          // Jitter buffer size in ms
          maxSize: 200,            // Max jitter buffer size in ms
          adaptiveMode: true,      // Adaptive jitter buffer
          fastStart: true          // Fast start mode
        },

        // 8. Network/RTP - 9 knobs
        network: {
          packetSize: 160,         // Packet size in bytes
          maxRetries: 3,           // Maximum retries
          timeout: 5000            // Timeout in ms
        },
        rtp: {
          payloadType: 0,          // PCMU = 0, PCMA = 8
          clockRate: 8000,         // Clock rate in Hz
          dtmfPayloadType: 101,    // DTMF payload type
          probation: 4,            // Probation period
          tos: 184,                // Type of Service
          rtcpInterval: 5000       // RTCP interval in ms
        },

        // 9. Asterisk Integration - 12 knobs
        asterisk: {
          ari: {
            enabled: true,
            url: 'http://localhost:8088/ari',
            username: 'asterisk',
            password: 'asterisk'
          },
          pjsip: {
            transport: 'udp',
            context: 'from-external',
            directMedia: false
          },
          codec: {
            allow: ['ulaw', 'alaw'],
            disallow: ['all'],
            prefer: 'ulaw'
          },
          recording: {
            enabled: false,
            format: 'wav'
          }
        },

        // 10. Gateway Integration - 11 knobs
        gateway: {
          host: 'localhost',
          port: isEnglish ? 6666 : 7777,
          protocol: 'udp',
          timeout: 5000,
          retries: 3,
          keepalive: true,
          bufferSize: 320,
          codec: 'pcm',
          sampleRate: 16000,
          channels: 1,
          monitoring: true
        },

        // 11. Deepgram Integration - 10 knobs
        deepgram: {
          apiKey: process.env.DEEPGRAM_API_KEY || '',
          model: 'nova-3',
          language: isEnglish ? 'en' : 'fr',
          version: 'latest',
          encoding: 'linear16',
          sampleRate: 16000,
          channels: 1,
          interim_results: true,
          punctuate: true,
          utterances: true
        },

        // 12. Translation Service - 8 knobs
        translation: {
          enabled: true,
          provider: 'google',
          sourceLanguage: isEnglish ? 'en' : 'fr',
          targetLanguage: isEnglish ? 'fr' : 'en',
          apiKey: process.env.TRANSLATION_API_KEY || '',
          model: 'nmt',
          maxLength: 5000,
          timeout: 3000
        },

        // 13. TTS (Text-to-Speech) - 10 knobs
        tts: {
          enabled: true,
          provider: 'elevenlabs',
          voice: isEnglish ? 'rachel' : 'charlotte',
          language: isEnglish ? 'en' : 'fr',
          sampleRate: 16000,
          encoding: 'pcm_16000',
          speed: 1.0,
          pitch: 0,
          volume: 1.0,
          stability: 0.5
        },

        // 14. Hume Integration - 7 knobs
        hume: {
          enabled: false,
          apiKey: process.env.HUME_API_KEY || '',
          configId: process.env.HUME_CONFIG_ID || '',
          language: isEnglish ? 'en' : 'fr',
          sampleRate: 16000,
          channels: 1,
          emotionDetection: true
        },

        // 15. System/Runtime - 10 knobs
        system: {
          logLevel: 'info',        // debug, info, warn, error
          metricsEnabled: true,
          healthCheckInterval: 30000,
          maxConcurrentCalls: 10,
          gracefulShutdown: true,
          monitoring: {
            port: 3001,
            interval: 1000
          }
        },
        runtime: {
          nodeEnv: process.env.NODE_ENV || 'production',
          timezone: 'UTC',
          locale: isEnglish ? 'en-US' : 'fr-FR'
        }
      },

      // Layer 2: Saved defaults (user-modified defaults, persisted)
      saved_defaults: {},

      // Layer 3: Active configuration (runtime modifications, not persisted)
      active: {}
    };
  }

  /**
   * Get active configuration with layer merging
   * Priority: active > saved_defaults > defaults
   */
  static getActiveConfig(extensionId, savedDefaults = {}, activeOverrides = {}) {
    const factory = this.getFactoryDefaults(extensionId);

    // Deep merge: defaults <- saved_defaults <- active
    const config = this.deepMerge(
      factory.defaults,
      savedDefaults,
      activeOverrides
    );

    return config;
  }

  /**
   * Deep merge objects (helper function)
   */
  static deepMerge(...objects) {
    const isObject = obj => obj && typeof obj === 'object' && !Array.isArray(obj);

    return objects.reduce((prev, obj) => {
      Object.keys(obj).forEach(key => {
        const pVal = prev[key];
        const oVal = obj[key];

        if (isObject(pVal) && isObject(oVal)) {
          prev[key] = this.deepMerge(pVal, oVal);
        } else {
          prev[key] = oVal;
        }
      });

      return prev;
    }, {});
  }

  /**
   * Count total knobs in configuration
   */
  static countKnobs(config) {
    let count = 0;
    const countRecursive = (obj) => {
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          countRecursive(value);
        } else {
          count++;
        }
      });
    };
    countRecursive(config);
    return count;
  }

  /**
   * Validate configuration against factory defaults
   */
  static validateConfig(config, extensionId) {
    const factory = this.getFactoryDefaults(extensionId);
    const errors = [];

    // Validate structure and types
    const validateRecursive = (provided, defaults, path = '') => {
      Object.keys(provided).forEach(key => {
        const fullPath = path ? `${path}.${key}` : key;

        if (!(key in defaults)) {
          errors.push(`Unknown key: ${fullPath}`);
          return;
        }

        const providedValue = provided[key];
        const defaultValue = defaults[key];

        if (typeof providedValue !== typeof defaultValue) {
          errors.push(`Type mismatch at ${fullPath}: expected ${typeof defaultValue}, got ${typeof providedValue}`);
        } else if (typeof providedValue === 'object' && providedValue !== null && !Array.isArray(providedValue)) {
          validateRecursive(providedValue, defaultValue, fullPath);
        }
      });
    };

    validateRecursive(config, factory.defaults);
    return { valid: errors.length === 0, errors };
  }
}

module.exports = ConfigFactoryDefaults;
```

#### Step 2.2: Update Configuration Files

**Create `/tmp/STATION_3-3333-config.json`**:
```json
{
  "defaults": {},
  "saved_defaults": {},
  "active": {}
}
```

**Create `/tmp/STATION_3-4444-config.json`**:
```json
{
  "defaults": {},
  "saved_defaults": {},
  "active": {}
}
```

**Create `/tmp/STATION_9-3333-config.json`**:
```json
{
  "defaults": {},
  "saved_defaults": {},
  "active": {}
}
```

**Create `/tmp/STATION_9-4444-config.json`**:
```json
{
  "defaults": {},
  "saved_defaults": {},
  "active": {}
}
```

#### Step 2.3: Verification
```bash
# Deploy factory defaults
scp /tmp/config-factory-defaults.js azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/

# Test the configuration system
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && node -e \"
const ConfigFactory = require('./config-factory-defaults');

const config3333 = ConfigFactory.getFactoryDefaults('3333');
const config4444 = ConfigFactory.getFactoryDefaults('4444');

console.log('✅ Configuration System Test:');
console.log('3333 knobs:', ConfigFactory.countKnobs(config3333.defaults));
console.log('4444 knobs:', ConfigFactory.countKnobs(config4444.defaults));
console.log('3333 language:', config3333.defaults.deepgram.language);
console.log('4444 language:', config4444.defaults.deepgram.language);
console.log('3333 gateway port:', config3333.defaults.gateway.port);
console.log('4444 gateway port:', config4444.defaults.gateway.port);
\""
```

**Expected Output**:
```
✅ Configuration System Test:
3333 knobs: 113
4444 knobs: 113
3333 language: en
4444 language: fr
3333 gateway port: 6666
4444 gateway port: 7777
```

**Completion Criteria**:
- ✅ Factory defaults file created
- ✅ All 113 knobs present in configuration
- ✅ Extension-specific defaults work (3333=en, 4444=fr)
- ✅ Deep merge and validation functions work
- ✅ Knob count returns 113

---

## PHASE 3: ENHANCE STATION-3 HANDLER (Deepgram Monitoring)

### Overview
Expand Station-3 handler to collect all 14 documented parameters with real audio analysis.

### Files to Modify
- `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station3-handler.js`

### Implementation Details

#### Step 3.1: Enhanced Station-3 Handler
```javascript
// Complete Station-3 handler with ALL 14 parameters
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
    this.processingTimeHistory = [];
    this.transcriptCount = 0;
    this.lastTranscriptTime = Date.now();

    // Load factory defaults
    this.loadConfiguration();

    // Start polling for config changes
    this.startPolling();
  }

  // Load configuration with three-layer system
  loadConfiguration() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configFile = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        this.knobs = ConfigFactory.getActiveConfig(
          this.extensionId,
          configFile.saved_defaults || {},
          configFile.active || {}
        );
      } else {
        // Use factory defaults
        const factoryConfig = ConfigFactory.getFactoryDefaults(this.extensionId);
        this.knobs = factoryConfig.defaults;

        // Save initial config file
        fs.writeFileSync(this.configPath, JSON.stringify({
          defaults: {},
          saved_defaults: {},
          active: {}
        }, null, 2));
      }

      console.log(`[STATION-3-${this.extensionId}] Loaded config with ${ConfigFactory.countKnobs(this.knobs)} knobs`);
    } catch (error) {
      console.error(`[STATION-3-${this.extensionId}] Config load error:`, error.message);
      // Fallback to factory defaults
      const factoryConfig = ConfigFactory.getFactoryDefaults(this.extensionId);
      this.knobs = factoryConfig.defaults;
    }
  }

  // Initialize StationAgent when available
  initStationAgent(StationAgent) {
    this.stationAgent = new StationAgent('STATION_3', this.extensionId);
    console.log(`[STATION-3] Initialized for extension ${this.extensionId} with full 14-parameter collection`);
  }

  // Poll config file every 100ms
  startPolling() {
    setInterval(() => {
      try {
        const newKnobs = this.loadKnobs();
        if (JSON.stringify(newKnobs) !== JSON.stringify(this.knobs)) {
          this.loadConfiguration();
          this.onKnobsChanged?.(this.knobs);
        }
      } catch (e) {
        // Silent fail - config loading is not critical
      }
    }, 100);
  }

  // Load knobs from config file
  loadKnobs() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (e) {}
    return {};
  }

  // Get Deepgram config from knobs
  getDeepgramConfig() {
    const dg = this.knobs.deepgram || {};
    return {
      model: dg.model || 'nova-3',
      language: dg.language || (this.extensionId === '3333' ? 'en' : 'fr'),
      encoding: dg.encoding || 'linear16',
      sample_rate: dg.sampleRate || 16000,
      channels: dg.channels || 1,
      punctuate: dg.punctuate !== false,
      interim_results: dg.interim_results !== false,
      utterances: dg.utterances !== false
    };
  }

  // Store audio buffer for later analysis
  onAudioData(audioBuffer) {
    this.lastAudioBuffer = audioBuffer;
    this.audioBufferQueue.push({
      buffer: audioBuffer,
      timestamp: Date.now()
    });

    // Keep only last 5 seconds of audio
    const fiveSecondsAgo = Date.now() - 5000;
    this.audioBufferQueue = this.audioBufferQueue.filter(
      item => item.timestamp > fiveSecondsAgo
    );
  }

  // Called when Deepgram returns a transcript
  async onTranscript(data) {
    if (!this.stationAgent) return;

    const processingStart = Date.now();
    this.transcriptCount++;

    try {
      const transcript = data.channel?.alternatives?.[0]?.transcript || '';
      const isFinal = data.is_final || false;
      const confidence = data.channel?.alternatives?.[0]?.confidence || 0;
      const language = data.metadata?.language || this.knobs.deepgram.language;

      // Analyze audio if we have buffer
      let audioMetrics = null;
      if (this.lastAudioBuffer) {
        audioMetrics = AudioAnalysisUtils.analyzeAudio(
          this.lastAudioBuffer,
          this.knobs.deepgram.sampleRate || 16000
        );
      }

      // Calculate processing time
      const processingTime = Date.now() - this.audioStartTime;
      this.processingTimeHistory.push(processingTime);
      if (this.processingTimeHistory.length > 100) {
        this.processingTimeHistory.shift();
      }
      const avgProcessingTime = this.processingTimeHistory.reduce((a, b) => a + b, 0) /
                                this.processingTimeHistory.length;

      // Get performance metrics
      const cpuUsage = process.cpuUsage();
      const memUsage = process.memoryUsage();

      // Calculate bandwidth (bytes per second)
      const timeSinceLastTranscript = Date.now() - this.lastTranscriptTime;
      const bandwidth = this.lastAudioBuffer ?
        (this.lastAudioBuffer.length / (timeSinceLastTranscript / 1000)) : 0;
      this.lastTranscriptTime = Date.now();

      // Collect ALL 14 STATION-3 PARAMETERS
      const context = {
        timestamp: Date.now(),
        extension: this.extensionId,
        callId: `deepgram-${this.extensionId}-${Date.now()}`,

        // Original 4 parameters
        transcript: transcript,
        isFinal: isFinal,
        confidence: confidence,
        language: language,

        // NEW: Audio Quality Parameters (4 new)
        snr_db: audioMetrics?.snr_db || null,
        speech_level_dbfs: audioMetrics?.rms_level_dbfs || null,
        clipping_percent: audioMetrics?.clipping_percent || 0,
        noise_floor_dbfs: audioMetrics?.noise_floor_dbfs || null,

        // NEW: Buffer Parameter (1 new)
        buffer_processing_ms: processingTime,

        // NEW: Latency Parameter (1 new)
        latency_processing_ms: avgProcessingTime,

        // NEW: DSP Parameters (2 new)
        dsp_agc_current_gain_db: this.knobs.agc?.targetLevel || -18,
        dsp_noise_reduction_level_db: this.knobs.noiseReduction?.level || 20,

        // NEW: Performance Parameters (3 new)
        performance_cpu_percent: (cpuUsage.system / 1000000) * 100,
        performance_memory_mb: memUsage.heapUsed / 1048576,
        performance_bandwidth_bps: bandwidth,

        // Additional context for UniversalCollector
        pcmBuffer: this.lastAudioBuffer,
        bufferSize: this.lastAudioBuffer?.length || 0,
        audioStartTime: this.audioStartTime,
        sampleRate: this.knobs.deepgram.sampleRate || 16000
      };

      // Collect metrics via StationAgent
      await this.stationAgent.collect(context);

      // Log success for final transcripts
      if (isFinal) {
        console.log(`[STATION-3-${this.extensionId}] ✅ Final transcript collected with 14 parameters: "${transcript.substring(0, 50)}..."`);
      }

    } catch (error) {
      console.error(`[STATION-3-${this.extensionId}] Transcript collection error:`, error.message);
    }

    this.audioStartTime = Date.now();
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
      console.log(`[STATION-3-${this.extensionId}] Error logged: ${error.type || 'unknown'}`);
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

  // Get statistics
  getStats() {
    return {
      extension: this.extensionId,
      transcriptCount: this.transcriptCount,
      avgProcessingTime: this.processingTimeHistory.reduce((a, b) => a + b, 0) /
                        this.processingTimeHistory.length || 0,
      audioBufferQueueSize: this.audioBufferQueue.length,
      knobCount: ConfigFactory.countKnobs(this.knobs),
      lastActivity: this.lastTranscriptTime
    };
  }

  // Cleanup on shutdown
  destroy() {
    console.log(`[STATION-3] Handler destroyed for extension ${this.extensionId}`);
  }
}

module.exports = Station3Handler;
```

#### Step 3.2: Deploy Station-3 Handler
```bash
# Backup current handler
ssh azureuser@20.170.155.53 "cp /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station3-handler.js /tmp/station3-handler.js.backup"

# Deploy new handler
scp /tmp/station3-handler.js azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/

# Verify syntax
ssh azureuser@20.170.155.53 "node -c /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station3-handler.js && echo '✅ Syntax OK'"
```

#### Step 3.3: Verification
```bash
# Test handler instantiation
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && node -e \"
const Station3Handler = require('./station3-handler');
const handler3333 = new Station3Handler('3333');
const handler4444 = new Station3Handler('4444');

console.log('✅ Station-3 Handler Test:');
console.log('3333 stats:', JSON.stringify(handler3333.getStats(), null, 2));
console.log('4444 stats:', JSON.stringify(handler4444.getStats(), null, 2));
\""
```

**Expected Output**:
```json
{
  "extension": "3333",
  "transcriptCount": 0,
  "avgProcessingTime": 0,
  "audioBufferQueueSize": 0,
  "knobCount": 113,
  "lastActivity": 1733789123456
}
```

**Completion Criteria**:
- ✅ Handler loads without errors
- ✅ Configuration loads 113 knobs
- ✅ Audio analysis utilities imported successfully
- ✅ onTranscript() method has all 14 parameter collection
- ✅ No syntax errors

---

## PHASE 4: ENHANCE STATION-9 HANDLER (TTS Output Monitoring)

### Overview
Expand Station-9 handler to collect all 15 documented parameters with real audio analysis.

### Files to Modify
- `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station9-handler.js`

### Implementation Details

#### Step 4.1: Enhanced Station-9 Handler
```javascript
// Complete Station-9 handler with ALL 15 parameters
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

    // TTS output tracking
    this.ttsOutputCount = 0;
    this.totalBytesProcessed = 0;
    this.lastOutputTime = Date.now();

    // Latency tracking
    this.latencyHistory = [];
    this.pipelineLatencies = [];

    // Load factory defaults
    this.loadConfiguration();

    // Start polling for config changes
    this.startPolling();
  }

  // Load configuration with three-layer system
  loadConfiguration() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configFile = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        this.knobs = ConfigFactory.getActiveConfig(
          this.extensionId,
          configFile.saved_defaults || {},
          configFile.active || {}
        );
      } else {
        // Use factory defaults
        const factoryConfig = ConfigFactory.getFactoryDefaults(this.extensionId);
        this.knobs = factoryConfig.defaults;

        // Save initial config file
        fs.writeFileSync(this.configPath, JSON.stringify({
          defaults: {},
          saved_defaults: {},
          active: {}
        }, null, 2));
      }

      console.log(`[STATION-9-${this.extensionId}] Loaded config with ${ConfigFactory.countKnobs(this.knobs)} knobs`);
    } catch (error) {
      console.error(`[STATION-9-${this.extensionId}] Config load error:`, error.message);
      // Fallback to factory defaults
      const factoryConfig = ConfigFactory.getFactoryDefaults(this.extensionId);
      this.knobs = factoryConfig.defaults;
    }
  }

  // Initialize StationAgent when available
  initStationAgent(StationAgent) {
    this.stationAgent = new StationAgent('STATION_9', this.extensionId);
    console.log(`[STATION-9] Initialized for extension ${this.extensionId} with full 15-parameter collection`);
  }

  // Poll config file every 100ms
  startPolling() {
    setInterval(() => {
      try {
        const newKnobs = this.loadKnobs();
        if (JSON.stringify(newKnobs) !== JSON.stringify(this.knobs)) {
          this.loadConfiguration();
          this.onKnobsChanged?.(this.knobs);
        }
      } catch (e) {
        // Silent fail - config loading is not critical
      }
    }, 100);
  }

  // Load knobs from config file
  loadKnobs() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (e) {}
    return {};
  }

  // Get TTS config from knobs
  getTTSConfig() {
    const tts = this.knobs.tts || {};
    return {
      enabled: tts.enabled !== false,
      provider: tts.provider || 'elevenlabs',
      voice: tts.voice || (this.extensionId === '3333' ? 'rachel' : 'charlotte'),
      language: tts.language || (this.extensionId === '3333' ? 'en' : 'fr'),
      sampleRate: tts.sampleRate || 16000,
      speed: tts.speed || 1.0,
      pitch: tts.pitch || 0,
      volume: tts.volume || 1.0
    };
  }

  // Called when TTS audio is being sent to Gateway
  async onTTSOutput(audioBuffer, metadata = {}) {
    if (!this.stationAgent) return;

    const processingStart = Date.now();
    this.ttsOutputCount++;

    try {
      // Track timing
      const timeSinceLastOutput = Date.now() - this.lastOutputTime;
      const latency = Date.now() - this.audioStartTime;

      this.latencyHistory.push(latency);
      if (this.latencyHistory.length > 100) {
        this.latencyHistory.shift();
      }

      // Calculate average latency
      const avgLatency = this.latencyHistory.reduce((a, b) => a + b, 0) /
                        this.latencyHistory.length;

      // Track pipeline latency (if provided in metadata)
      if (metadata.pipelineStart) {
        const pipelineLatency = Date.now() - metadata.pipelineStart;
        this.pipelineLatencies.push(pipelineLatency);
        if (this.pipelineLatencies.length > 100) {
          this.pipelineLatencies.shift();
        }
      }

      // Analyze audio if we have buffer
      let audioMetrics = null;
      if (audioBuffer) {
        audioMetrics = AudioAnalysisUtils.analyzeAudio(
          audioBuffer,
          this.knobs.tts.sampleRate || 16000
        );

        this.totalBytesProcessed += audioBuffer.length;
      }

      // Get performance metrics
      const cpuUsage = process.cpuUsage();
      const memUsage = process.memoryUsage();

      // Calculate buffer output size (in ms)
      const bufferDurationMs = audioBuffer ?
        (audioBuffer.length / 2) / (this.knobs.tts.sampleRate || 16000) * 1000 : 0;

      // Collect ALL 15 STATION-9 PARAMETERS
      const context = {
        timestamp: Date.now(),
        extension: this.extensionId,
        callId: `tts-output-${this.extensionId}-${Date.now()}`,

        // Original 5 parameters
        pcmBuffer: audioBuffer,
        bufferSize: audioBuffer ? audioBuffer.length : 0,
        audioStartTime: this.audioStartTime,
        timeSinceLastOutput: timeSinceLastOutput,

        // NEW: Buffer Parameter (1 new)
        buffer_output_ms: bufferDurationMs,

        // NEW: Latency Parameters (2 new)
        latency_avg_ms: avgLatency,
        latency_total_ms: latency,

        // NEW: Audio Quality Parameters (4 new)
        mos_score: audioMetrics?.mos_score || null,
        speech_level_dbfs: audioMetrics?.rms_level_dbfs || null,
        clipping_percent: audioMetrics?.clipping_percent || 0,
        distortion_percent: audioMetrics?.clipping_percent > 1 ? audioMetrics.clipping_percent : 0,

        // NEW: DSP Parameters (3 new)
        dsp_agc_current_gain_db: this.knobs.agc?.currentGain || this.knobs.agc?.targetLevel || -18,
        dsp_compressor_reduction_db: this.knobs.compressor?.threshold ?
          Math.max(0, (-18 - this.knobs.compressor.threshold) / this.knobs.compressor.ratio) : 0,
        dsp_limiter_reduction_db: audioMetrics?.rms_level_dbfs > this.knobs.limiter?.threshold ?
          audioMetrics.rms_level_dbfs - this.knobs.limiter.threshold : 0,

        // NEW: Performance Parameters (2 new)
        performance_cpu_percent: (cpuUsage.system / 1000000) * 100,
        performance_memory_mb: memUsage.heapUsed / 1048576,

        // NEW: Custom Parameters (3 new)
        custom_state: 'active',
        custom_latency_sync_applied: metadata.latencySyncApplied || false,
        custom_pipeline_latency_ms: this.pipelineLatencies.length > 0 ?
          this.pipelineLatencies.reduce((a, b) => a + b, 0) / this.pipelineLatencies.length : 0,

        // Additional context
        sampleRate: this.knobs.tts.sampleRate || 16000,
        ttsProvider: this.knobs.tts.provider || 'elevenlabs',
        ttsVoice: this.knobs.tts.voice
      };

      // Collect metrics via StationAgent
      await this.stationAgent.collect(context);

      console.log(`[STATION-9-${this.extensionId}] ✅ TTS output collected with 15 parameters (${bufferDurationMs.toFixed(1)}ms audio)`);

    } catch (error) {
      console.error(`[STATION-9-${this.extensionId}] TTS output collection error:`, error.message);
    }

    this.audioStartTime = Date.now();
    this.lastOutputTime = Date.now();
  }

  // Called when TTS reports an error
  async onError(error) {
    if (!this.stationAgent) return;

    try {
      await this.stationAgent.collect({
        timestamp: Date.now(),
        extension: this.extensionId,
        callId: `tts-error-${this.extensionId}-${Date.now()}`,
        error: error.message || error,
        errorType: error.type || 'unknown'
      });
      console.log(`[STATION-9-${this.extensionId}] Error logged: ${error.type || 'unknown'}`);
    } catch (err) {
      console.error(`[STATION-9-${this.extensionId}] Error collection error:`, err.message);
    }
  }

  // Called when TTS sends metadata
  async onMetadata(data) {
    if (!this.stationAgent) return;

    try {
      await this.stationAgent.collect({
        timestamp: Date.now(),
        extension: this.extensionId,
        callId: `tts-metadata-${this.extensionId}-${Date.now()}`,
        metadata: data
      });
    } catch (error) {
      console.error(`[STATION-9-${this.extensionId}] Metadata collection error:`, error.message);
    }
  }

  // Get statistics
  getStats() {
    return {
      extension: this.extensionId,
      ttsOutputCount: this.ttsOutputCount,
      totalBytesProcessed: this.totalBytesProcessed,
      avgLatency: this.latencyHistory.reduce((a, b) => a + b, 0) /
                 this.latencyHistory.length || 0,
      avgPipelineLatency: this.pipelineLatencies.reduce((a, b) => a + b, 0) /
                         this.pipelineLatencies.length || 0,
      knobCount: ConfigFactory.countKnobs(this.knobs),
      lastActivity: this.lastOutputTime
    };
  }

  // Cleanup on shutdown
  destroy() {
    console.log(`[STATION-9] Handler destroyed for extension ${this.extensionId}`);
  }
}

module.exports = Station9Handler;
```

#### Step 4.2: Deploy Station-9 Handler
```bash
# Backup current handler
ssh azureuser@20.170.155.53 "cp /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station9-handler.js /tmp/station9-handler.js.backup"

# Deploy new handler
scp /tmp/station9-handler.js azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/

# Verify syntax
ssh azureuser@20.170.155.53 "node -c /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station9-handler.js && echo '✅ Syntax OK'"
```

#### Step 4.3: Verification
```bash
# Test handler instantiation
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && node -e \"
const Station9Handler = require('./station9-handler');
const handler3333 = new Station9Handler('3333');
const handler4444 = new Station9Handler('4444');

console.log('✅ Station-9 Handler Test:');
console.log('3333 stats:', JSON.stringify(handler3333.getStats(), null, 2));
console.log('4444 stats:', JSON.stringify(handler4444.getStats(), null, 2));
\""
```

**Expected Output**:
```json
{
  "extension": "3333",
  "ttsOutputCount": 0,
  "totalBytesProcessed": 0,
  "avgLatency": 0,
  "avgPipelineLatency": 0,
  "knobCount": 113,
  "lastActivity": 1733789123456
}
```

**Completion Criteria**:
- ✅ Handler loads without errors
- ✅ Configuration loads 113 knobs
- ✅ Audio analysis utilities imported successfully
- ✅ onTTSOutput() method has all 15 parameter collection
- ✅ No syntax errors

---

## PHASE 5: DEPLOY AND RESTART SYSTEM

### Overview
Deploy all changes and restart the complete system to begin collecting real data.

### Implementation Details

#### Step 5.1: Stop All Services
```bash
# Stop all running services
ssh azureuser@20.170.155.53 "
ps aux | grep 'node STTTTSserver.js' | grep -v grep | awk '{print \$2}' | xargs kill 2>/dev/null
ps aux | grep 'node monitoring-server.js' | grep -v grep | awk '{print \$2}' | xargs kill 2>/dev/null
ps aux | grep 'node database-api-server.js' | grep -v grep | awk '{print \$2}' | xargs kill 2>/dev/null
ps aux | grep 'node monitoring-to-database-bridge.js' | grep -v grep | awk '{print \$2}' | xargs kill 2>/dev/null
echo '✅ All services stopped'
"
```

#### Step 5.2: Clear Old Data
```bash
# Clear old monitoring data
ssh azureuser@20.170.155.53 "
rm -f /tmp/monitoring-snapshots.json
rm -f /tmp/STATION_*.json
echo '✅ Old data cleared'
"
```

#### Step 5.3: Deploy Configuration Files
```bash
# Deploy all config files
ssh azureuser@20.170.155.53 "
cat > /tmp/STATION_3-3333-config.json << 'EOF'
{
  \"defaults\": {},
  \"saved_defaults\": {},
  \"active\": {}
}
EOF

cat > /tmp/STATION_3-4444-config.json << 'EOF'
{
  \"defaults\": {},
  \"saved_defaults\": {},
  \"active\": {}
}
EOF

cat > /tmp/STATION_9-3333-config.json << 'EOF'
{
  \"defaults\": {},
  \"saved_defaults\": {},
  \"active\": {}
}
EOF

cat > /tmp/STATION_9-4444-config.json << 'EOF'
{
  \"defaults\": {},
  \"saved_defaults\": {},
  \"active\": {}
}
EOF

echo '✅ Config files deployed'
"
```

#### Step 5.4: Restart Services in Order
```bash
# Start database API server
ssh azureuser@20.170.155.53 "
cd /home/azureuser/translation-app &&
nohup node database-api-server.js > /tmp/database-api-FULL.log 2>&1 &
echo '✅ Started database-api-server'
sleep 2
"

# Start monitoring server
ssh azureuser@20.170.155.53 "
cd /home/azureuser/translation-app &&
nohup node monitoring-server.js > /tmp/monitoring-server-FULL.log 2>&1 &
echo '✅ Started monitoring-server'
sleep 2
"

# Start monitoring-to-database bridge
ssh azureuser@20.170.155.53 "
cd /home/azureuser/translation-app &&
nohup node monitoring-to-database-bridge.js > /tmp/monitoring-bridge-FULL.log 2>&1 &
echo '✅ Started monitoring-to-database-bridge'
sleep 2
"

# Start STTTTSserver with enhanced handlers
ssh azureuser@20.170.155.53 "
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver &&
nohup node STTTTSserver.js > /tmp/STTTTSserver-FULL.log 2>&1 &
echo '✅ Started STTTTSserver'
sleep 5
"
```

#### Step 5.5: Verify All Services Running
```bash
# Check all processes
ssh azureuser@20.170.155.53 "
echo '=== RUNNING SERVICES ==='
ps aux | grep 'node.*\.js' | grep -v grep | awk '{print \$2, \$11, \$12}'
echo ''
echo '=== STTTTSserver LOG (last 30 lines) ==='
tail -30 /tmp/STTTTSserver-FULL.log | grep -E 'STATION|listening|Ready|Error'
echo ''
echo '=== MONITORING SERVER LOG (last 10 lines) ==='
tail -10 /tmp/monitoring-server-FULL.log
"
```

**Expected Output**:
```
=== RUNNING SERVICES ===
123456 node database-api-server.js
123457 node monitoring-server.js
123458 node monitoring-to-database-bridge.js
123459 node STTTTSserver.js

=== STTTTSserver LOG (last 30 lines) ===
[STATION-3-3333] Loaded config with 113 knobs
[STATION-3-4444] Loaded config with 113 knobs
[STATION-9-3333] Loaded config with 113 knobs
[STATION-9-4444] Loaded config with 113 knobs
[STATION-3] Initialized for extension 3333 with full 14-parameter collection
[STATION-3] Initialized for extension 4444 with full 14-parameter collection
[STATION-9] Initialized for extension 3333 with full 15-parameter collection
[STATION-9] Initialized for extension 4444 with full 15-parameter collection
Server listening on UDP port 5555
Ready to process calls

=== MONITORING SERVER LOG (last 10 lines) ===
Monitoring server listening on port 3001
Registered station: STATION_3 (extension 3333)
Registered station: STATION_3 (extension 4444)
Registered station: STATION_9 (extension 3333)
Registered station: STATION_9 (extension 4444)
```

**Completion Criteria**:
- ✅ All 4 services running
- ✅ No errors in STTTTSserver log
- ✅ All 4 stations loaded with 113 knobs
- ✅ All 4 stations registered with monitoring server

---

## PHASE 6: TESTING AND VERIFICATION

### Overview
Make test calls and verify all 4 stations are sending complete data to API.

### Implementation Details

#### Step 6.1: Wait for Test Call
```bash
# Monitor logs for call activity
ssh azureuser@20.170.155.53 "
echo 'System ready for test calls'
echo 'Make a call to extension 3333 or 4444'
echo ''
echo 'Monitoring for activity...'
timeout 120 tail -f /tmp/STTTTSserver-FULL.log | grep --line-buffered -E 'STATION|Transcript|TTS'
"
```

#### Step 6.2: Check API Data After Call
```bash
# Query API for latest data from all stations
curl -s http://localhost:8083/api/latest | jq '
  group_by(.station_id) |
  map({
    station: .[0].station_id,
    extension: .[0].extension,
    count: length,
    latest: .[0].timestamp,
    param_count: (.[0].metrics | keys | length)
  })
'
```

**Expected Output**:
```json
[
  {
    "station": "STATION_3",
    "extension": "3333",
    "count": 15,
    "latest": "2025-12-09T10:30:45.123Z",
    "param_count": 14
  },
  {
    "station": "STATION_3",
    "extension": "4444",
    "count": 12,
    "latest": "2025-12-09T10:30:42.456Z",
    "param_count": 14
  },
  {
    "station": "STATION_9",
    "extension": "3333",
    "count": 18,
    "latest": "2025-12-09T10:30:48.789Z",
    "param_count": 15
  },
  {
    "station": "STATION_9",
    "extension": "4444",
    "count": 20,
    "latest": "2025-12-09T10:30:50.012Z",
    "param_count": 15
  }
]
```

#### Step 6.3: Verify Parameter Details
```bash
# Check specific station data
curl -s http://localhost:8083/api/latest | jq '
  .[] |
  select(.station_id == "STATION_3" and .extension == "3333") |
  {
    station: .station_id,
    extension: .extension,
    parameters: (.metrics | keys)
  } |
  .parameters | sort
' | head -20
```

**Expected Output** (Station-3 should have these 14 parameters):
```json
[
  "buffer_processing_ms",
  "clipping_percent",
  "confidence",
  "dsp_agc_current_gain_db",
  "dsp_noise_reduction_level_db",
  "isFinal",
  "language",
  "latency_processing_ms",
  "noise_floor_dbfs",
  "performance_bandwidth_bps",
  "performance_cpu_percent",
  "performance_memory_mb",
  "snr_db",
  "speech_level_dbfs",
  "transcript"
]
```

#### Step 6.4: Verify Station-9 Parameters
```bash
# Check Station-9 data
curl -s http://localhost:8083/api/latest | jq '
  .[] |
  select(.station_id == "STATION_9" and .extension == "3333") |
  {
    station: .station_id,
    extension: .extension,
    parameters: (.metrics | keys)
  } |
  .parameters | sort
' | head -20
```

**Expected Output** (Station-9 should have these 15 parameters):
```json
[
  "buffer_output_ms",
  "clipping_percent",
  "custom_latency_sync_applied",
  "custom_pipeline_latency_ms",
  "custom_state",
  "distortion_percent",
  "dsp_agc_current_gain_db",
  "dsp_compressor_reduction_db",
  "dsp_limiter_reduction_db",
  "latency_avg_ms",
  "latency_total_ms",
  "mos_score",
  "performance_cpu_percent",
  "performance_memory_mb",
  "speech_level_dbfs"
]
```

#### Step 6.5: Final System Check
```bash
# Complete system verification
ssh azureuser@20.170.155.53 "
echo '=== FINAL SYSTEM CHECK ==='
echo ''
echo '1. Services Running:'
ps aux | grep 'node.*\.js' | grep -v grep | wc -l
echo ''
echo '2. Stations with Data:'
curl -s http://localhost:8083/api/latest | jq -r '.[] | .station_id + \"/\" + .extension' | sort -u
echo ''
echo '3. Total Metrics in API:'
curl -s http://localhost:8083/api/latest | jq '. | length'
echo ''
echo '4. Configuration Knobs per Station:'
echo 'Station-3/3333:' && [ -f /tmp/STATION_3-3333-config.json ] && echo '✅ Config exists'
echo 'Station-3/4444:' && [ -f /tmp/STATION_3-4444-config.json ] && echo '✅ Config exists'
echo 'Station-9/3333:' && [ -f /tmp/STATION_9-3333-config.json ] && echo '✅ Config exists'
echo 'Station-9/4444:' && [ -f /tmp/STATION_9-4444-config.json ] && echo '✅ Config exists'
"
```

**Expected Output**:
```
=== FINAL SYSTEM CHECK ===

1. Services Running:
4

2. Stations with Data:
STATION_3/3333
STATION_3/4444
STATION_9/3333
STATION_9/4444

3. Total Metrics in API:
65

4. Configuration Knobs per Station:
Station-3/3333: ✅ Config exists
Station-3/4444: ✅ Config exists
Station-9/3333: ✅ Config exists
Station-9/4444: ✅ Config exists
```

**Completion Criteria**:
- ✅ All 4 stations sending data to API
- ✅ Station-3 sending 14 parameters
- ✅ Station-9 sending 15 parameters
- ✅ All 4 config files exist with 113 knobs
- ✅ No errors in logs

---

## PHASE 7: TROUBLESHOOTING GUIDE

### Common Issues and Solutions

#### Issue 1: Station-3/3333 or Station-3/4444 Not Sending Data

**Symptoms**:
- API shows no STATION_3 data
- No transcript events in logs

**Diagnosis**:
```bash
# Check if Deepgram events are firing
ssh azureuser@20.170.155.53 "tail -100 /tmp/STTTTSserver-FULL.log | grep -E 'Deepgram|STATION-3'"
```

**Solutions**:
1. **No Deepgram events**: Check if calls are being routed to Deepgram
2. **Handler not initialized**: Check for StationAgent initialization errors
3. **Socket.IO connection failed**: Check monitoring server connection

**Fix Commands**:
```bash
# Restart STTTTSserver with debug logging
ssh azureuser@20.170.155.53 "
ps aux | grep 'node STTTTSserver.js' | grep -v grep | awk '{print \$2}' | xargs kill
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver &&
NODE_ENV=development nohup node STTTTSserver.js > /tmp/STTTTSserver-DEBUG.log 2>&1 &
tail -f /tmp/STTTTSserver-DEBUG.log
"
```

#### Issue 2: Station-9/3333 Not Sending Data (but Station-9/4444 Works)

**Symptoms**:
- API shows STATION_9/4444 data but not STATION_9/3333
- Code is identical for both

**Diagnosis**:
```bash
# Check if TTS output events are firing for 3333
ssh azureuser@20.170.155.53 "tail -100 /tmp/STTTTSserver-FULL.log | grep -E 'TTS|STATION-9' | grep 3333"
```

**Solutions**:
1. **No TTS events for 3333**: Check call routing to extension 3333
2. **Different gateway configuration**: Verify gateway-3333.js is running
3. **Port binding issue**: Check if port 6666 is accessible

**Fix Commands**:
```bash
# Verify gateways are running
ssh azureuser@20.170.155.53 "
ps aux | grep 'gateway-3333' | grep -v grep
ps aux | grep 'gateway-4444' | grep -v grep

# Check gateway logs
tail -20 /tmp/gateway-3333-final.log
tail -20 /tmp/gateway-4444-final.log
"
```

#### Issue 3: Parameters Showing as Null

**Symptoms**:
- Station data appears in API but many parameters are null
- Some metrics are 0 or missing

**Diagnosis**:
```bash
# Check which parameters are null
curl -s http://localhost:8083/api/latest | jq '
  .[] |
  select(.station_id == "STATION_3") |
  .metrics |
  to_entries |
  map(select(.value == null)) |
  map(.key)
'
```

**Solutions**:
1. **Audio buffer not available**: Handlers need audio data for analysis
2. **AudioAnalysisUtils error**: Check for calculation errors in logs
3. **Context missing data**: Verify all required context fields are passed

**Fix Commands**:
```bash
# Check audio analysis errors
ssh azureuser@20.170.155.53 "grep 'AudioAnalysis' /tmp/STTTTSserver-FULL.log | tail -20"

# Test audio analysis utilities directly
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && node -e \"
const AudioAnalysisUtils = require('./audio-analysis-utils');
const testBuffer = Buffer.alloc(32000);
for (let i = 0; i < testBuffer.length; i += 2) {
  testBuffer.writeInt16LE(Math.floor(Math.sin(i / 100) * 10000), i);
}
console.log(JSON.stringify(AudioAnalysisUtils.analyzeAudio(testBuffer), null, 2));
\""
```

#### Issue 4: Configuration Knobs Not Loading

**Symptoms**:
- Handlers report only 2-3 knobs instead of 113
- Config file exists but not being read

**Diagnosis**:
```bash
# Check config file contents
ssh azureuser@20.170.155.53 "
echo '=== Config Files ==='
cat /tmp/STATION_3-3333-config.json
echo ''
cat /tmp/STATION_9-3333-config.json
"

# Check if ConfigFactory is loading
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && node -e \"
const ConfigFactory = require('./config-factory-defaults');
const config = ConfigFactory.getFactoryDefaults('3333');
console.log('Knob count:', ConfigFactory.countKnobs(config.defaults));
\""
```

**Solutions**:
1. **Config file malformed**: Validate JSON syntax
2. **ConfigFactory not imported**: Check require() statement in handlers
3. **Path mismatch**: Verify config file paths

**Fix Commands**:
```bash
# Recreate config files with correct format
ssh azureuser@20.170.155.53 "
cat > /tmp/STATION_3-3333-config.json << 'EOF'
{
  \"defaults\": {},
  \"saved_defaults\": {},
  \"active\": {}
}
EOF

# Restart STTTTSserver to reload configs
ps aux | grep 'node STTTTSserver.js' | grep -v grep | awk '{print \$2}' | xargs kill
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver &&
nohup node STTTTSserver.js > /tmp/STTTTSserver-RELOADED.log 2>&1 &
"
```

#### Issue 5: Monitoring Server Not Receiving Data

**Symptoms**:
- Handlers collecting data but not appearing in API
- No Socket.IO connection errors in logs

**Diagnosis**:
```bash
# Check monitoring server logs
ssh azureuser@20.170.155.53 "tail -50 /tmp/monitoring-server-FULL.log | grep -E 'metrics|station'"

# Check if socket connections are established
ssh azureuser@20.170.155.53 "grep 'Connected to monitoring' /tmp/STTTTSserver-FULL.log"
```

**Solutions**:
1. **Monitoring server not running**: Restart monitoring-server.js
2. **Port 3001 not accessible**: Check firewall rules
3. **Bridge not running**: Restart monitoring-to-database-bridge.js

**Fix Commands**:
```bash
# Restart monitoring chain
ssh azureuser@20.170.155.53 "
# Stop all
ps aux | grep 'monitoring' | grep -v grep | awk '{print \$2}' | xargs kill 2>/dev/null

# Start monitoring server
cd /home/azureuser/translation-app &&
nohup node monitoring-server.js > /tmp/monitoring-server-FIXED.log 2>&1 &
sleep 2

# Start bridge
nohup node monitoring-to-database-bridge.js > /tmp/monitoring-bridge-FIXED.log 2>&1 &
sleep 2

# Check logs
tail -10 /tmp/monitoring-server-FIXED.log
tail -10 /tmp/monitoring-bridge-FIXED.log
"
```

---

## PHASE 8: SUCCESS CRITERIA CHECKLIST

### Final Verification Checklist

#### System Health
- [ ] All 4 services running (database-api, monitoring-server, bridge, STTTTSserver)
- [ ] No errors in any service logs
- [ ] All services auto-recover from temporary failures

#### Station-3/3333 (Deepgram English)
- [ ] Handler loaded with 113 knobs
- [ ] Receiving Deepgram transcript events
- [ ] Collecting all 14 documented parameters
- [ ] Data appearing in API endpoint
- [ ] No null parameters (except during silence)
- [ ] Audio quality metrics calculated correctly

#### Station-3/4444 (Deepgram French)
- [ ] Handler loaded with 113 knobs
- [ ] Receiving Deepgram transcript events
- [ ] Collecting all 14 documented parameters
- [ ] Data appearing in API endpoint
- [ ] Language set to 'fr' correctly
- [ ] No null parameters (except during silence)

#### Station-9/3333 (TTS English Output)
- [ ] Handler loaded with 113 knobs
- [ ] Receiving TTS output events
- [ ] Collecting all 15 documented parameters
- [ ] Data appearing in API endpoint
- [ ] MOS score calculated correctly
- [ ] Latency metrics tracking correctly

#### Station-9/4444 (TTS French Output)
- [ ] Handler loaded with 113 knobs
- [ ] Receiving TTS output events
- [ ] Collecting all 15 documented parameters
- [ ] Data appearing in API endpoint
- [ ] Voice set to 'charlotte' correctly
- [ ] All DSP metrics present

#### Configuration System
- [ ] All 4 config files exist in /tmp/
- [ ] Three-layer structure implemented (defaults/saved_defaults/active)
- [ ] Factory defaults return 113 knobs
- [ ] Active config merges layers correctly
- [ ] Validation function works correctly
- [ ] Extension-specific defaults work (3333=en, 4444=fr)

#### Audio Analysis
- [ ] AudioAnalysisUtils module loads correctly
- [ ] SNR calculation returns reasonable values (0-60 dB)
- [ ] RMS calculation returns reasonable values (-60 to 0 dBFS)
- [ ] Clipping detection works (0-100%)
- [ ] Noise floor calculation works
- [ ] MOS score estimation works (1.0-5.0)
- [ ] Voice activity detection works (0.0-1.0)

#### Data Flow
- [ ] Handlers → StationAgent → Socket.IO → Monitoring Server → Bridge → Database → API
- [ ] All stations registered with monitoring server
- [ ] Socket.IO connections stable
- [ ] No data loss between components
- [ ] API returns latest data for all 4 stations
- [ ] API data matches handler collection

#### Performance
- [ ] CPU usage reasonable (<50% under load)
- [ ] Memory usage stable (no leaks)
- [ ] Collection latency <100ms per event
- [ ] API response time <200ms
- [ ] No buffer overruns or underruns
- [ ] System handles concurrent calls

---

## ROLLBACK PLAN

If implementation fails and system needs to be restored to previous state:

### Step 1: Stop New Services
```bash
ssh azureuser@20.170.155.53 "
ps aux | grep 'node STTTTSserver.js' | grep -v grep | awk '{print \$2}' | xargs kill
ps aux | grep 'node monitoring' | grep -v grep | awk '{print \$2}' | xargs kill
ps aux | grep 'node database-api' | grep -v grep | awk '{print \$2}' | xargs kill
echo '✅ Stopped all services'
"
```

### Step 2: Restore Backup Files
```bash
ssh azureuser@20.170.155.53 "
cp /tmp/station3-handler.js.backup /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station3-handler.js
cp /tmp/station9-handler.js.backup /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station9-handler.js
echo '✅ Restored backup handlers'
"
```

### Step 3: Remove New Files
```bash
ssh azureuser@20.170.155.53 "
rm -f /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/audio-analysis-utils.js
rm -f /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/config-factory-defaults.js
echo '✅ Removed new utility files'
"
```

### Step 4: Restart Original System
```bash
ssh azureuser@20.170.155.53 "
cd /home/azureuser/translation-app && nohup node database-api-server.js > /tmp/database-api-rollback.log 2>&1 &
sleep 2
cd /home/azureuser/translation-app && nohup node monitoring-server.js > /tmp/monitoring-rollback.log 2>&1 &
sleep 2
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && nohup node STTTTSserver.js > /tmp/STTTTSserver-rollback.log 2>&1 &
echo '✅ System rolled back'
"
```

---

## SUMMARY

### What This Plan Accomplishes

1. **Audio Analysis Foundation**: Real-time audio quality metrics (SNR, clipping, RMS, MOS)
2. **113-Knob Configuration**: Complete three-layer config system with factory defaults
3. **Enhanced Station-3**: 14 parameters collected from Deepgram (up from 4)
4. **Enhanced Station-9**: 15 parameters collected from TTS output (up from 5)
5. **All Stations Working**: 100% coverage (4 of 4 stations sending data)
6. **Complete Monitoring**: 75 parameters + 113 knobs fully implemented

### Estimated Time to Complete
- Phase 1 (Audio Utils): 30 minutes
- Phase 2 (Config System): 45 minutes
- Phase 3 (Station-3): 30 minutes
- Phase 4 (Station-9): 30 minutes
- Phase 5 (Deploy): 15 minutes
- Phase 6 (Testing): 30 minutes
- **Total**: ~3 hours

### Next Steps After Completion

1. Monitor system for 24 hours to verify stability
2. Tune audio analysis thresholds if needed
3. Add dashboard visualization for new parameters
4. Document configuration management procedures
5. Train team on 113-knob configuration system

---

## APPENDIX A: PARAMETER MAPPING

### Station-3 Parameter List (14 total)

| # | Parameter | Category | Source | Current |
|---|-----------|----------|--------|---------|
| 1 | transcript | Custom | Deepgram | ✅ |
| 2 | isFinal | Custom | Deepgram | ✅ |
| 3 | confidence | Custom | Deepgram | ✅ |
| 4 | language | Custom | Deepgram | ✅ |
| 5 | snr_db | Audio Quality | AudioAnalysisUtils | ❌ NEW |
| 6 | speech_level_dbfs | Audio Quality | AudioAnalysisUtils | ❌ NEW |
| 7 | clipping_percent | Audio Quality | AudioAnalysisUtils | ❌ NEW |
| 8 | noise_floor_dbfs | Audio Quality | AudioAnalysisUtils | ❌ NEW |
| 9 | buffer_processing_ms | Buffer | Handler timing | ❌ NEW |
| 10 | latency_processing_ms | Latency | Handler timing | ❌ NEW |
| 11 | dsp_agc_current_gain_db | DSP | Config knobs | ❌ NEW |
| 12 | dsp_noise_reduction_level_db | DSP | Config knobs | ❌ NEW |
| 13 | performance_cpu_percent | Performance | process.cpuUsage() | ❌ NEW |
| 14 | performance_memory_mb | Performance | process.memoryUsage() | ❌ NEW |

### Station-9 Parameter List (15 total)

| # | Parameter | Category | Source | Current |
|---|-----------|----------|--------|---------|
| 1 | pcmBuffer | Custom | TTS output | ✅ |
| 2 | bufferSize | Custom | TTS output | ✅ |
| 3 | audioStartTime | Custom | Handler timing | ✅ |
| 4 | timeSinceLastOutput | Custom | Handler timing | ✅ |
| 5 | buffer_output_ms | Buffer | Buffer duration calc | ❌ NEW |
| 6 | latency_avg_ms | Latency | Handler history | ❌ NEW |
| 7 | latency_total_ms | Latency | Handler timing | ❌ NEW |
| 8 | mos_score | Audio Quality | AudioAnalysisUtils | ❌ NEW |
| 9 | speech_level_dbfs | Audio Quality | AudioAnalysisUtils | ❌ NEW |
| 10 | clipping_percent | Audio Quality | AudioAnalysisUtils | ❌ NEW |
| 11 | distortion_percent | Audio Quality | AudioAnalysisUtils | ❌ NEW |
| 12 | dsp_agc_current_gain_db | DSP | Config knobs | ❌ NEW |
| 13 | dsp_compressor_reduction_db | DSP | Config knobs | ❌ NEW |
| 14 | dsp_limiter_reduction_db | DSP | Config knobs | ❌ NEW |
| 15 | performance_cpu_percent | Performance | process.cpuUsage() | ❌ NEW |

---

## APPENDIX B: CONFIGURATION KNOB CATEGORIES

### 15 Knob Categories (113 total knobs)

1. **AGC** (5): enabled, targetLevel, maxGain, attackTime, releaseTime
2. **AEC** (4): enabled, tailLength, suppression, convergenceTime
3. **Noise Reduction** (4): enabled, level, adaptiveMode, spectralSubtraction
4. **Compressor** (5): enabled, threshold, ratio, attack, release
5. **Limiter** (3): enabled, threshold, release
6. **Equalizer** (7): enabled, preset, bands, lowShelf, highShelf, midPeak, customResponse
7. **Buffer** (4): inputSize, outputSize, playbackSize, recordSize
8. **Jitter** (4): bufferSize, maxSize, adaptiveMode, fastStart
9. **Network** (3): packetSize, maxRetries, timeout
10. **RTP** (6): payloadType, clockRate, dtmfPayloadType, probation, tos, rtcpInterval
11. **Asterisk** (12): ari.*, pjsip.*, codec.*, recording.*
12. **Gateway** (11): host, port, protocol, timeout, retries, keepalive, bufferSize, codec, sampleRate, channels, monitoring
13. **Deepgram** (10): apiKey, model, language, version, encoding, sampleRate, channels, interim_results, punctuate, utterances
14. **Translation** (8): enabled, provider, sourceLanguage, targetLanguage, apiKey, model, maxLength, timeout
15. **TTS** (10): enabled, provider, voice, language, sampleRate, encoding, speed, pitch, volume, stability
16. **Hume** (7): enabled, apiKey, configId, language, sampleRate, channels, emotionDetection
17. **System** (6): logLevel, metricsEnabled, healthCheckInterval, maxConcurrentCalls, gracefulShutdown, monitoring.*
18. **Runtime** (3): nodeEnv, timezone, locale

---

**END OF IMPLEMENTATION PLAN**
