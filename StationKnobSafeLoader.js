/**
 * StationKnobSafeLoader.js
 *
 * Safe knob configuration loader for STTTTSserver
 * - Reads station-specific config files
 * - For missing knobs, captures current system values
 * - Writes captured values back to config as defaults
 * - Prevents uncontrolled editing while allowing optimization
 */

const fs = require('fs');
const path = require('path');

class StationKnobSafeLoader {
  constructor() {
    this.configDir = path.join(__dirname, 'station-configs');
    this.currentSystemValues = new Map();
    this.loadedConfigs = new Map();

    console.log('[StationKnobSafeLoader] Initialized - Safe loading with system defaults');
  }

  /**
   * Load configuration for a station, filling missing values from live system
   */
  loadStationConfig(stationId, extension, currentSystemKnobs) {
    const configFile = `${stationId}-${extension}-config.json`;
    const configPath = path.join(this.configDir, configFile);

    let config = {};
    let needsUpdate = false;

    // Try to load existing config
    try {
      if (fs.existsSync(configPath)) {
        const rawConfig = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(rawConfig);
        console.log(`[SafeLoader] Loaded config for ${stationId}-${extension}`);
      } else {
        console.log(`[SafeLoader] No config file found for ${stationId}-${extension}, creating from system values`);
        config = this.createEmptyConfig(stationId, extension);
        needsUpdate = true;
      }
    } catch (error) {
      console.error(`[SafeLoader] Error loading config: ${error.message}`);
      config = this.createEmptyConfig(stationId, extension);
      needsUpdate = true;
    }

    // Check for missing knobs and fill from current system values
    const updatedKnobs = this.fillMissingKnobs(config, currentSystemKnobs);
    if (updatedKnobs.hasUpdates) {
      config = updatedKnobs.config;
      needsUpdate = true;
      console.log(`[SafeLoader] Filled ${updatedKnobs.filledCount} missing knobs from system for ${stationId}-${extension}`);
    }

    // Save updated config if needed
    if (needsUpdate) {
      this.saveConfig(configPath, config);
      console.log(`[SafeLoader] Saved updated config with system defaults for ${stationId}-${extension}`);
    }

    // Cache the loaded config
    this.loadedConfigs.set(`${stationId}-${extension}`, config);

    return config;
  }

  /**
   * Create empty config structure
   */
  createEmptyConfig(stationId, extension) {
    return {
      station_id: stationId,
      extension: extension,
      timestamp: new Date().toISOString(),
      optimization_version: '2.0',
      source: 'system_defaults',
      audio_processing: {},
      codec: {},
      buffers: {},
      deepgram: {},
      translation: {},
      tts: {},
      quality_targets: {}
    };
  }

  /**
   * Fill missing knobs from current system values
   */
  fillMissingKnobs(config, currentSystemKnobs) {
    let hasUpdates = false;
    let filledCount = 0;

    // Define the complete knob structure
    const knobMappings = {
      // AGC knobs
      'agc.enabled': ['audio_processing', 'agc', 'enabled'],
      'agc.targetLevel': ['audio_processing', 'agc', 'targetLevel'],
      'agc.maxGain': ['audio_processing', 'agc', 'maxGain'],
      'agc.attackTime': ['audio_processing', 'agc', 'attackTime'],
      'agc.releaseTime': ['audio_processing', 'agc', 'releaseTime'],
      'agc.holdTime': ['audio_processing', 'agc', 'holdTime'],

      // AEC knobs
      'aec.enabled': ['audio_processing', 'aec', 'enabled'],
      'aec.filterLength': ['audio_processing', 'aec', 'filterLength'],
      'aec.adaptationRate': ['audio_processing', 'aec', 'adaptationRate'],
      'aec.suppressionLevel': ['audio_processing', 'aec', 'suppressionLevel'],
      'aec.tailLength': ['audio_processing', 'aec', 'tailLength'],
      'aec.convergenceTime': ['audio_processing', 'aec', 'convergenceTime'],
      'aec.echoCancellation': ['audio_processing', 'aec', 'echoCancellation'],

      // Noise Reduction knobs
      'noiseReduction.enabled': ['audio_processing', 'noiseReduction', 'enabled'],
      'noiseReduction.level': ['audio_processing', 'noiseReduction', 'level'],
      'noiseReduction.spectralFloor': ['audio_processing', 'noiseReduction', 'spectralFloor'],
      'noiseReduction.preserveVoice': ['audio_processing', 'noiseReduction', 'preserveVoice'],
      'noiseReduction.adaptiveMode': ['audio_processing', 'noiseReduction', 'adaptiveMode'],
      'noiseReduction.suppressionBands': ['audio_processing', 'noiseReduction', 'suppressionBands'],

      // Codec knobs
      'codec.type': ['codec', 'type'],
      'codec.bitrate': ['codec', 'bitrate'],
      'codec.complexity': ['codec', 'complexity'],
      'codec.vbr': ['codec', 'vbr'],
      'codec.dtx': ['codec', 'dtx'],
      'codec.fec': ['codec', 'fec'],
      'codec.packetLossPercentage': ['codec', 'packetLossPercentage'],
      'codec.frameSize': ['codec', 'frameSize'],

      // Buffer knobs
      'buffer.jitterBuffer.enabled': ['buffers', 'jitterBuffer', 'enabled'],
      'buffer.jitterBuffer.minDepth': ['buffers', 'jitterBuffer', 'minDepth'],
      'buffer.jitterBuffer.maxDepth': ['buffers', 'jitterBuffer', 'maxDepth'],
      'buffer.jitterBuffer.targetDepth': ['buffers', 'jitterBuffer', 'targetDepth'],
      'buffer.jitterBuffer.adaptiveMode': ['buffers', 'jitterBuffer', 'adaptiveMode'],
      'buffer.playback.size': ['buffers', 'playback', 'size'],
      'buffer.playback.latency': ['buffers', 'playback', 'latency'],
      'buffer.record.size': ['buffers', 'record', 'size'],
      'buffer.record.latency': ['buffers', 'record', 'latency'],

      // TTS knobs
      'tts.voice': ['tts', 'voice'],
      'tts.speed': ['tts', 'speed'],
      'tts.pitch': ['tts', 'pitch'],
      'tts.volume': ['tts', 'volume'],
      'tts.emphasis': ['tts', 'emphasis'],
      'tts.sentencePause': ['tts', 'sentencePause'],

      // Translation knobs
      'translation.enabled': ['translation', 'enabled'],
      'translation.sourceLanguage': ['translation', 'sourceLanguage'],
      'translation.targetLanguage': ['translation', 'targetLanguage'],
      'translation.formality': ['translation', 'formality'],
      'translation.timeout': ['translation', 'timeout']
    };

    // Check each knob and fill if missing
    for (const [knobKey, pathArray] of Object.entries(knobMappings)) {
      const currentValue = currentSystemKnobs[knobKey];

      if (currentValue !== undefined) {
        // Navigate to the correct location in config
        let configRef = config;
        for (let i = 0; i < pathArray.length - 1; i++) {
          const key = pathArray[i];
          if (!configRef[key]) {
            configRef[key] = {};
            hasUpdates = true;
          }
          configRef = configRef[key];
        }

        // Check if value exists
        const finalKey = pathArray[pathArray.length - 1];
        if (configRef[finalKey] === undefined) {
          // Missing value - fill from system
          configRef[finalKey] = currentValue;
          hasUpdates = true;
          filledCount++;
          console.log(`[SafeLoader] Filled missing knob ${knobKey} = ${currentValue}`);
        }
      }
    }

    return {
      config,
      hasUpdates,
      filledCount
    };
  }

  /**
   * Save configuration to file
   */
  saveConfig(configPath, config) {
    try {
      // Ensure directory exists
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Add metadata
      config.last_updated = new Date().toISOString();
      config.update_source = 'system_capture';

      // Write config
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      console.log(`[SafeLoader] Saved config to ${configPath}`);
    } catch (error) {
      console.error(`[SafeLoader] Error saving config: ${error.message}`);
    }
  }

  /**
   * Get knob value (from config or system)
   */
  getKnobValue(stationId, extension, knobPath, systemValue) {
    const key = `${stationId}-${extension}`;
    const config = this.loadedConfigs.get(key);

    if (!config) {
      console.log(`[SafeLoader] No config loaded for ${key}, using system value`);
      return systemValue;
    }

    // Parse knob path and navigate config
    const pathParts = knobPath.split('.');
    let value = this.navigateConfig(config, pathParts);

    if (value !== undefined) {
      return value;
    }

    // Value not in config, return system value
    console.log(`[SafeLoader] Knob ${knobPath} not in config for ${key}, using system value: ${systemValue}`);
    return systemValue;
  }

  /**
   * Navigate config object by path
   */
  navigateConfig(config, pathParts) {
    // Map dot notation to config structure
    const mappings = {
      'agc': ['audio_processing', 'agc'],
      'aec': ['audio_processing', 'aec'],
      'noiseReduction': ['audio_processing', 'noiseReduction'],
      'codec': ['codec'],
      'buffer': ['buffers'],
      'tts': ['tts'],
      'translation': ['translation']
    };

    let current = config;
    const rootKey = pathParts[0];

    // Get the correct path in config
    if (mappings[rootKey]) {
      for (const key of mappings[rootKey]) {
        if (current[key] === undefined) return undefined;
        current = current[key];
      }

      // Navigate remaining path
      for (let i = 1; i < pathParts.length; i++) {
        if (current[pathParts[i]] === undefined) return undefined;
        current = current[pathParts[i]];
      }

      return current;
    }

    return undefined;
  }

  /**
   * Export current system values to empty config files
   */
  exportSystemDefaults(stationId, extension, currentSystemKnobs) {
    const configFile = `${stationId}-${extension}-defaults.json`;
    const configPath = path.join(this.configDir, configFile);

    const config = this.createEmptyConfig(stationId, extension);
    const updated = this.fillMissingKnobs(config, currentSystemKnobs);

    // Save as defaults file
    updated.config.source = 'captured_system_defaults';
    this.saveConfig(configPath, updated.config);

    console.log(`[SafeLoader] Exported system defaults to ${configFile}`);
    return updated.config;
  }
}

// Integration with STTTTSserver
class STTTTSserverIntegration {
  constructor(safeLoader) {
    this.safeLoader = safeLoader;
  }

  /**
   * Called by STTTTSserver to get safe knob values
   */
  getStationKnobs(stationId, extension, currentSystemKnobs) {
    // Load config, filling missing values from system
    const config = this.safeLoader.loadStationConfig(stationId, extension, currentSystemKnobs);

    // Convert config format to flat knob format
    const knobs = this.configToKnobs(config);

    return knobs;
  }

  /**
   * Convert hierarchical config to flat knob format
   */
  configToKnobs(config) {
    const knobs = {};

    // AGC knobs
    if (config.audio_processing?.agc) {
      const agc = config.audio_processing.agc;
      knobs['agc.enabled'] = agc.enabled;
      knobs['agc.targetLevel'] = agc.targetLevel;
      knobs['agc.maxGain'] = agc.maxGain;
      knobs['agc.attackTime'] = agc.attackTime;
      knobs['agc.releaseTime'] = agc.releaseTime;
      knobs['agc.holdTime'] = agc.holdTime;
    }

    // AEC knobs
    if (config.audio_processing?.aec) {
      const aec = config.audio_processing.aec;
      knobs['aec.enabled'] = aec.enabled;
      knobs['aec.filterLength'] = aec.filterLength;
      knobs['aec.adaptationRate'] = aec.adaptationRate;
      knobs['aec.suppressionLevel'] = aec.suppressionLevel;
      knobs['aec.tailLength'] = aec.tailLength;
      knobs['aec.convergenceTime'] = aec.convergenceTime;
      knobs['aec.echoCancellation'] = aec.echoCancellation;
    }

    // Continue for all other knob categories...
    // (Similar patterns for noiseReduction, codec, buffers, tts, translation)

    return knobs;
  }
}

// Export
module.exports = {
  StationKnobSafeLoader,
  STTTTSserverIntegration
};

// Example usage in STTTTSserver
/*
const { StationKnobSafeLoader, STTTTSserverIntegration } = require('./StationKnobSafeLoader');

// Initialize
const safeLoader = new StationKnobSafeLoader();
const integration = new STTTTSserverIntegration(safeLoader);

// In STTTTSserver, when loading knobs for a station:
const currentSystemKnobs = {
  'agc.enabled': true,
  'agc.targetLevel': -18,
  'agc.maxGain': 30,
  // ... all current system values
};

// Get safe knobs (will fill missing from system)
const stationKnobs = integration.getStationKnobs('STATION_3', 6666, currentSystemKnobs);

// Apply knobs to audio processing
audioProcessor.applyKnobs(stationKnobs);
*/