
/**
 * Station Config Loader - Used by STTTTSserver to load station-specific configs
 */

const fs = require('fs');
const path = require('path');

class StationConfigLoader {
  constructor() {
    this.configs = new Map();
    this.configDir = path.join(__dirname, 'station-configs');
  }

  loadConfig(stationId, extension) {
    const key = `${stationId}-${extension}`;
    const filename = `${key}-config.json`;
    const filepath = path.join(this.configDir, filename);

    try {
      const configData = fs.readFileSync(filepath, 'utf8');
      const config = JSON.parse(configData);
      this.configs.set(key, config);
      console.log(`[ConfigLoader] Loaded config for ${key}`);
      return config;
    } catch (error) {
      console.error(`[ConfigLoader] Error loading ${filename}:`, error.message);
      return null;
    }
  }

  getConfig(stationId, extension) {
    const key = `${stationId}-${extension}`;
    if (!this.configs.has(key)) {
      return this.loadConfig(stationId, extension);
    }
    return this.configs.get(key);
  }

  // Apply config to actual audio processing
  applyConfig(stationId, extension, audioProcessor) {
    const config = this.getConfig(stationId, extension);
    if (!config) return false;

    // Apply AGC settings
    if (audioProcessor.agc) {
      audioProcessor.agc.setTargetLevel(config.audio_processing.agc.targetLevel);
      audioProcessor.agc.setMaxGain(config.audio_processing.agc.maxGain);
    }

    // Apply AEC settings
    if (audioProcessor.aec) {
      audioProcessor.aec.setSuppressionLevel(config.audio_processing.aec.suppressionLevel);
      audioProcessor.aec.setFilterLength(config.audio_processing.aec.filterLength);
    }

    // Apply Noise Reduction
    if (audioProcessor.noiseReduction) {
      audioProcessor.noiseReduction.setLevel(config.audio_processing.noiseReduction.level);
    }

    console.log(`[ConfigLoader] Applied config for ${stationId}-${extension}`);
    return true;
  }
}

module.exports = StationConfigLoader;
