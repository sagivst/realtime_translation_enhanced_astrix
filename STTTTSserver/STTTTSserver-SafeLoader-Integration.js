/**
 * STTTTSserver Integration with StationKnobSafeLoader
 *
 * This file shows how to integrate the safe loader into STTTTSserver
 * to capture system defaults for missing knob values
 */

// Add this to the top of STTTTSserver.js
const { StationKnobSafeLoader, STTTTSserverIntegration } = require('./StationKnobSafeLoader');

// Initialize the safe loader (do this once at server startup)
const safeLoader = new StationKnobSafeLoader();
const knobIntegration = new STTTTSserverIntegration(safeLoader);

/**
 * Function to get current system knob values from STTTTSserver
 * This should return the ACTUAL values currently in use by the system
 */
function getCurrentSystemKnobs() {
  // These are the REAL values from your running system
  // STTTTSserver should provide these from its actual configuration
  return {
    // AGC knobs - from audio processor
    'agc.enabled': audioProcessor?.agc?.enabled || true,
    'agc.targetLevel': audioProcessor?.agc?.targetLevel || -18,
    'agc.maxGain': audioProcessor?.agc?.maxGain || 30,
    'agc.attackTime': audioProcessor?.agc?.attackTime || 3,
    'agc.releaseTime': audioProcessor?.agc?.releaseTime || 100,
    'agc.holdTime': audioProcessor?.agc?.holdTime || 50,

    // AEC knobs - from echo canceller
    'aec.enabled': audioProcessor?.aec?.enabled || true,
    'aec.filterLength': audioProcessor?.aec?.filterLength || 256,
    'aec.adaptationRate': audioProcessor?.aec?.adaptationRate || 0.3,
    'aec.suppressionLevel': audioProcessor?.aec?.suppressionLevel || 20,
    'aec.tailLength': audioProcessor?.aec?.tailLength || 200,
    'aec.convergenceTime': audioProcessor?.aec?.convergenceTime || 500,
    'aec.echoCancellation': audioProcessor?.aec?.echoCancellation || 25,

    // Noise Reduction knobs
    'noiseReduction.enabled': audioProcessor?.noiseReduction?.enabled || true,
    'noiseReduction.level': audioProcessor?.noiseReduction?.level || 15,
    'noiseReduction.spectralFloor': audioProcessor?.noiseReduction?.spectralFloor || -60,
    'noiseReduction.preserveVoice': audioProcessor?.noiseReduction?.preserveVoice || true,
    'noiseReduction.adaptiveMode': audioProcessor?.noiseReduction?.adaptiveMode || true,
    'noiseReduction.suppressionBands': audioProcessor?.noiseReduction?.suppressionBands || 24,

    // Codec knobs - from Opus encoder
    'codec.type': codecConfig?.type || 'opus',
    'codec.bitrate': codecConfig?.bitrate || 64000,
    'codec.complexity': codecConfig?.complexity || 8,
    'codec.vbr': codecConfig?.vbr || true,
    'codec.dtx': codecConfig?.dtx || false,
    'codec.fec': codecConfig?.fec || true,
    'codec.packetLossPercentage': codecConfig?.packetLossPercentage || 5,
    'codec.frameSize': codecConfig?.frameSize || 20,

    // Buffer knobs - from jitter buffer
    'buffer.jitterBuffer.enabled': jitterBuffer?.enabled || true,
    'buffer.jitterBuffer.minDepth': jitterBuffer?.minDepth || 40,
    'buffer.jitterBuffer.maxDepth': jitterBuffer?.maxDepth || 300,
    'buffer.jitterBuffer.targetDepth': jitterBuffer?.targetDepth || 100,
    'buffer.jitterBuffer.adaptiveMode': jitterBuffer?.adaptiveMode || true,
    'buffer.playback.size': playbackBuffer?.size || 4096,
    'buffer.playback.latency': playbackBuffer?.latency || 50,
    'buffer.record.size': recordBuffer?.size || 4096,
    'buffer.record.latency': recordBuffer?.latency || 30,

    // TTS knobs - from ElevenLabs config
    'tts.voice': ttsConfig?.voice || 'matthew',
    'tts.speed': ttsConfig?.speed || 1.0,
    'tts.pitch': ttsConfig?.pitch || 1.0,
    'tts.volume': ttsConfig?.volume || 0.95,
    'tts.emphasis': ttsConfig?.emphasis || 'moderate',
    'tts.sentencePause': ttsConfig?.sentencePause || 500,

    // Translation knobs - from DeepL config
    'translation.enabled': translationConfig?.enabled || true,
    'translation.sourceLanguage': translationConfig?.sourceLanguage || 'auto',
    'translation.targetLanguage': translationConfig?.targetLanguage || 'es',
    'translation.formality': translationConfig?.formality || 'default',
    'translation.timeout': translationConfig?.timeout || 5000,

    // Add all other knobs here...
    // Total: 113 knobs
  };
}

/**
 * Function to load station configuration with safe defaults
 * Call this when a station connects or needs its configuration
 */
function loadStationConfiguration(stationId, extension) {
  console.log(`[STTTTSserver] Loading configuration for ${stationId}-${extension}`);

  // Get current system knob values
  const currentSystemKnobs = getCurrentSystemKnobs();

  // Load config using safe loader
  // This will:
  // 1. Try to load existing config file
  // 2. Fill any missing knobs with current system values
  // 3. Save the updated config back to file
  const stationKnobs = knobIntegration.getStationKnobs(
    stationId,
    extension,
    currentSystemKnobs
  );

  console.log(`[STTTTSserver] Loaded ${Object.keys(stationKnobs).length} knobs for ${stationId}-${extension}`);

  return stationKnobs;
}

/**
 * Function to apply loaded knobs to audio processing
 */
function applyStationKnobs(stationId, extension, knobs) {
  console.log(`[STTTTSserver] Applying knobs for ${stationId}-${extension}`);

  // Apply AGC settings
  if (audioProcessor?.agc && knobs['agc.enabled'] !== undefined) {
    audioProcessor.agc.enabled = knobs['agc.enabled'];
    audioProcessor.agc.targetLevel = knobs['agc.targetLevel'];
    audioProcessor.agc.maxGain = knobs['agc.maxGain'];
    audioProcessor.agc.attackTime = knobs['agc.attackTime'];
    audioProcessor.agc.releaseTime = knobs['agc.releaseTime'];
    audioProcessor.agc.holdTime = knobs['agc.holdTime'];
  }

  // Apply AEC settings
  if (audioProcessor?.aec && knobs['aec.enabled'] !== undefined) {
    audioProcessor.aec.enabled = knobs['aec.enabled'];
    audioProcessor.aec.filterLength = knobs['aec.filterLength'];
    audioProcessor.aec.adaptationRate = knobs['aec.adaptationRate'];
    audioProcessor.aec.suppressionLevel = knobs['aec.suppressionLevel'];
    audioProcessor.aec.tailLength = knobs['aec.tailLength'];
    audioProcessor.aec.convergenceTime = knobs['aec.convergenceTime'];
    audioProcessor.aec.echoCancellation = knobs['aec.echoCancellation'];
  }

  // Apply Noise Reduction settings
  if (audioProcessor?.noiseReduction && knobs['noiseReduction.enabled'] !== undefined) {
    audioProcessor.noiseReduction.enabled = knobs['noiseReduction.enabled'];
    audioProcessor.noiseReduction.level = knobs['noiseReduction.level'];
    audioProcessor.noiseReduction.spectralFloor = knobs['noiseReduction.spectralFloor'];
    audioProcessor.noiseReduction.preserveVoice = knobs['noiseReduction.preserveVoice'];
    audioProcessor.noiseReduction.adaptiveMode = knobs['noiseReduction.adaptiveMode'];
    audioProcessor.noiseReduction.suppressionBands = knobs['noiseReduction.suppressionBands'];
  }

  // Apply Codec settings
  if (codecConfig && knobs['codec.type'] !== undefined) {
    codecConfig.type = knobs['codec.type'];
    codecConfig.bitrate = knobs['codec.bitrate'];
    codecConfig.complexity = knobs['codec.complexity'];
    codecConfig.vbr = knobs['codec.vbr'];
    codecConfig.dtx = knobs['codec.dtx'];
    codecConfig.fec = knobs['codec.fec'];
    codecConfig.packetLossPercentage = knobs['codec.packetLossPercentage'];
    codecConfig.frameSize = knobs['codec.frameSize'];
  }

  // Apply Buffer settings
  if (jitterBuffer && knobs['buffer.jitterBuffer.enabled'] !== undefined) {
    jitterBuffer.enabled = knobs['buffer.jitterBuffer.enabled'];
    jitterBuffer.minDepth = knobs['buffer.jitterBuffer.minDepth'];
    jitterBuffer.maxDepth = knobs['buffer.jitterBuffer.maxDepth'];
    jitterBuffer.targetDepth = knobs['buffer.jitterBuffer.targetDepth'];
    jitterBuffer.adaptiveMode = knobs['buffer.jitterBuffer.adaptiveMode'];
  }

  // Apply TTS settings
  if (ttsConfig && knobs['tts.voice'] !== undefined) {
    ttsConfig.voice = knobs['tts.voice'];
    ttsConfig.speed = knobs['tts.speed'];
    ttsConfig.pitch = knobs['tts.pitch'];
    ttsConfig.volume = knobs['tts.volume'];
    ttsConfig.emphasis = knobs['tts.emphasis'];
    ttsConfig.sentencePause = knobs['tts.sentencePause'];
  }

  // Apply Translation settings
  if (translationConfig && knobs['translation.enabled'] !== undefined) {
    translationConfig.enabled = knobs['translation.enabled'];
    translationConfig.sourceLanguage = knobs['translation.sourceLanguage'];
    translationConfig.targetLanguage = knobs['translation.targetLanguage'];
    translationConfig.formality = knobs['translation.formality'];
    translationConfig.timeout = knobs['translation.timeout'];
  }

  console.log(`[STTTTSserver] Successfully applied knobs for ${stationId}-${extension}`);
}

/**
 * Example usage in STTTTSserver when a station connects
 */
function onStationConnect(stationId, extension) {
  console.log(`[STTTTSserver] Station ${stationId}-${extension} connected`);

  // Load configuration with safe defaults
  const knobs = loadStationConfiguration(stationId, extension);

  // Apply the knobs to audio processing
  applyStationKnobs(stationId, extension, knobs);

  console.log(`[STTTTSserver] Station ${stationId}-${extension} configured with safe defaults`);
}

/**
 * Example: Export current system defaults for a station
 * This creates a baseline configuration file
 */
function exportSystemDefaults(stationId, extension) {
  const currentSystemKnobs = getCurrentSystemKnobs();
  const defaultsConfig = safeLoader.exportSystemDefaults(stationId, extension, currentSystemKnobs);
  console.log(`[STTTTSserver] Exported system defaults for ${stationId}-${extension}`);
  return defaultsConfig;
}

// Export the integration functions
module.exports = {
  loadStationConfiguration,
  applyStationKnobs,
  onStationConnect,
  exportSystemDefaults,
  getCurrentSystemKnobs
};

/**
 * INTEGRATION STEPS FOR STTTTSserver:
 *
 * 1. Copy StationKnobSafeLoader.js to STTTTSserver directory
 *
 * 2. In STTTTSserver.js, add at the top:
 *    const { loadStationConfiguration, applyStationKnobs } = require('./STTTTSserver-SafeLoader-Integration');
 *
 * 3. When a station connects (in your WebSocket handler):
 *    socket.on('station-connect', (data) => {
 *      const { stationId, extension } = data;
 *      const knobs = loadStationConfiguration(stationId, extension);
 *      applyStationKnobs(stationId, extension, knobs);
 *    });
 *
 * 4. The first time a station connects:
 *    - If no config file exists, ALL knobs will be captured from system
 *    - Config file will be created with current system values
 *
 * 5. Subsequent connections:
 *    - Config will be loaded from file
 *    - Any NEW knobs added to system will be captured and added
 *    - Existing knob values in config will be preserved
 *
 * 6. This ensures:
 *    - System defaults are always captured
 *    - No uncontrolled editing of knob values
 *    - Optimized values are preserved
 *    - New knobs are automatically handled
 */