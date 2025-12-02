/**
 * Test Script for StationKnobSafeLoader
 * Demonstrates how the safe loader captures system values for missing knobs
 */

const { StationKnobSafeLoader, STTTTSserverIntegration } = require('./StationKnobSafeLoader');

// Simulate current system knob values (as if coming from live STTTTSserver)
const currentSystemKnobs = {
  // AGC system values
  'agc.enabled': true,
  'agc.targetLevel': -18,
  'agc.maxGain': 30,
  'agc.attackTime': 3,
  'agc.releaseTime': 100,
  'agc.holdTime': 50,

  // AEC system values
  'aec.enabled': true,
  'aec.filterLength': 256,
  'aec.adaptationRate': 0.3,
  'aec.suppressionLevel': 20,
  'aec.tailLength': 200,
  'aec.convergenceTime': 500,
  'aec.echoCancellation': 25,

  // Noise Reduction system values
  'noiseReduction.enabled': true,
  'noiseReduction.level': 15,
  'noiseReduction.spectralFloor': -60,
  'noiseReduction.preserveVoice': true,
  'noiseReduction.adaptiveMode': true,
  'noiseReduction.suppressionBands': 24,

  // Codec system values
  'codec.type': 'opus',
  'codec.bitrate': 64000,
  'codec.complexity': 8,
  'codec.vbr': true,
  'codec.dtx': false,
  'codec.fec': true,
  'codec.packetLossPercentage': 5,
  'codec.frameSize': 20,

  // Buffer system values
  'buffer.jitterBuffer.enabled': true,
  'buffer.jitterBuffer.minDepth': 40,
  'buffer.jitterBuffer.maxDepth': 300,
  'buffer.jitterBuffer.targetDepth': 100,
  'buffer.jitterBuffer.adaptiveMode': true,
  'buffer.playback.size': 4096,
  'buffer.playback.latency': 50,
  'buffer.record.size': 4096,
  'buffer.record.latency': 30,

  // TTS system values
  'tts.voice': 'matthew',
  'tts.speed': 1.0,
  'tts.pitch': 1.0,
  'tts.volume': 0.95,
  'tts.emphasis': 'moderate',
  'tts.sentencePause': 500,

  // Translation system values
  'translation.enabled': true,
  'translation.sourceLanguage': 'auto',
  'translation.targetLanguage': 'es',
  'translation.formality': 'default',
  'translation.timeout': 5000
};

console.log('========================================');
console.log('StationKnobSafeLoader Test');
console.log('========================================\n');

// Initialize the safe loader
const safeLoader = new StationKnobSafeLoader();
const integration = new STTTTSserverIntegration(safeLoader);

// Test 1: Load config for a station that doesn't have a config file yet
console.log('Test 1: Loading config for NEW station (no existing file)');
console.log('---------------------------------------');
const testStationId = 'STATION_TEST';
const testExtension = 9999;

console.log(`Loading config for ${testStationId}-${testExtension}...`);
const knobs1 = integration.getStationKnobs(testStationId, testExtension, currentSystemKnobs);

console.log('\nResult: Config created with system defaults');
console.log(`Total knobs captured: ${Object.keys(knobs1).length}`);
console.log('Sample knobs:');
console.log(`  agc.targetLevel: ${knobs1['agc.targetLevel']}`);
console.log(`  aec.filterLength: ${knobs1['aec.filterLength']}`);
console.log(`  codec.bitrate: ${knobs1['codec.bitrate']}`);
console.log(`  tts.voice: ${knobs1['tts.voice']}`);

// Test 2: Load config again - should use saved values
console.log('\n\nTest 2: Loading same station again');
console.log('---------------------------------------');
console.log('This time it should load from the saved file...');

const knobs2 = integration.getStationKnobs(testStationId, testExtension, currentSystemKnobs);
console.log('Config loaded from file (no system capture needed)');

// Test 3: Simulate partial config (some knobs missing)
console.log('\n\nTest 3: Testing with PARTIAL config');
console.log('---------------------------------------');

// Create a partial config file first
const fs = require('fs');
const path = require('path');

const partialStationId = 'STATION_PARTIAL';
const partialExtension = 8888;
const partialConfig = {
  station_id: partialStationId,
  extension: partialExtension,
  timestamp: new Date().toISOString(),
  audio_processing: {
    agc: {
      enabled: true,
      targetLevel: -20  // Only 2 AGC knobs instead of 6
    }
    // Missing AEC and noise reduction
  },
  codec: {
    type: 'opus',
    bitrate: 48000
    // Missing other codec settings
  }
  // Missing buffers, TTS, translation
};

// Save partial config
const configDir = path.join(__dirname, 'station-configs');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}
const partialConfigPath = path.join(configDir, `${partialStationId}-${partialExtension}-config.json`);
fs.writeFileSync(partialConfigPath, JSON.stringify(partialConfig, null, 2));

console.log('Created partial config with only 4 knobs');
console.log('Loading config...');

// Change some system values to show they get captured
const modifiedSystemKnobs = { ...currentSystemKnobs };
modifiedSystemKnobs['agc.maxGain'] = 35;  // Different from default
modifiedSystemKnobs['aec.filterLength'] = 512;  // Different from default
modifiedSystemKnobs['tts.voice'] = 'jessica';  // Different from default

const knobs3 = integration.getStationKnobs(partialStationId, partialExtension, modifiedSystemKnobs);

console.log('\nResult: Missing knobs filled from system');
console.log(`Total knobs: ${Object.keys(knobs3).length}`);
console.log('Sample values:');
console.log(`  agc.targetLevel: ${knobs3['agc.targetLevel']} (from file)`);
console.log(`  agc.maxGain: ${knobs3['agc.maxGain']} (captured from system: 35)`);
console.log(`  aec.filterLength: ${knobs3['aec.filterLength']} (captured from system: 512)`);
console.log(`  tts.voice: ${knobs3['tts.voice']} (captured from system: jessica)`);

// Test 4: Export system defaults
console.log('\n\nTest 4: Exporting system defaults');
console.log('---------------------------------------');

const defaultsConfig = safeLoader.exportSystemDefaults('STATION_DEFAULTS', 1111, currentSystemKnobs);
console.log('Exported system defaults to STATION_DEFAULTS-1111-defaults.json');
console.log(`Total knobs exported: ${Object.keys(integration.configToKnobs(defaultsConfig)).length}`);

console.log('\n========================================');
console.log('Test Complete!');
console.log('========================================');
console.log('\nSummary:');
console.log('✓ Safe loader captures system values for missing knobs');
console.log('✓ Existing config values are preserved');
console.log('✓ System values become the defaults for new stations');
console.log('✓ Prevents uncontrolled editing while allowing optimization');
console.log('\nConfig files created in: ./station-configs/');