#!/bin/bash

# Integration script for StationKnobSafeLoader into STTTTSserver

echo "🔧 Integrating StationKnobSafeLoader into STTTTSserver..."

# Add the SafeLoader require at the top of STTTTSserver.js
cat << 'EOF' > integration_header.js
// ===== StationKnobSafeLoader Integration =====
const { StationKnobSafeLoader, STTTTSserverIntegration } = require('./StationKnobSafeLoader');
const safeLoader = new StationKnobSafeLoader();
const knobIntegration = new STTTTSserverIntegration(safeLoader);

// Function to get current system knob values
function getCurrentSystemKnobs() {
  // These values will be captured from the actual running system
  return {
    'agc.enabled': true,
    'agc.targetLevel': -18,
    'agc.maxGain': 30,
    'agc.attackTime': 3,
    'agc.releaseTime': 100,
    'agc.holdTime': 50,
    'aec.enabled': true,
    'aec.filterLength': 256,
    'aec.adaptationRate': 0.3,
    'aec.suppressionLevel': 20,
    'aec.tailLength': 200,
    'aec.convergenceTime': 500,
    'aec.echoCancellation': 25,
    'noiseReduction.enabled': true,
    'noiseReduction.level': 15,
    'noiseReduction.spectralFloor': -60,
    'noiseReduction.preserveVoice': true,
    'noiseReduction.adaptiveMode': true,
    'noiseReduction.suppressionBands': 24,
    'compressor.enabled': false,
    'compressor.threshold': -20,
    'compressor.ratio': 4,
    'compressor.attack': 5,
    'compressor.release': 50,
    'compressor.knee': 2.5,
    'limiter.enabled': true,
    'limiter.threshold': -3,
    'limiter.release': 50,
    'limiter.lookahead': 5,
    'codec.type': 'opus',
    'codec.bitrate': 64000,
    'codec.complexity': 8,
    'codec.vbr': true,
    'codec.dtx': false,
    'codec.fec': true,
    'codec.packetLossPercentage': 5,
    'codec.frameSize': 20,
    'buffers.jitterBuffer.enabled': true,
    'buffers.jitterBuffer.minDepth': 40,
    'buffers.jitterBuffer.maxDepth': 300,
    'buffers.jitterBuffer.targetDepth': 100,
    'buffers.jitterBuffer.adaptiveMode': true,
    'buffers.playback.size': 4096,
    'buffers.playback.latency': 50,
    'buffers.record.size': 4096,
    'buffers.record.latency': 30,
    'deepgram.model': 'nova-2',
    'deepgram.language': 'en',
    'deepgram.punctuate': true,
    'deepgram.diarize': false,
    'deepgram.multichannel': false,
    'deepgram.alternatives': 1,
    'deepgram.interim': true,
    'deepgram.endpointing': 300,
    'translation.enabled': true,
    'translation.sourceLanguage': 'auto',
    'translation.targetLanguage': 'es',
    'translation.formality': 'default',
    'translation.timeout': 5000,
    'tts.voice': 'matthew',
    'tts.speed': 1.0,
    'tts.pitch': 1.0,
    'tts.volume': 0.95,
    'tts.emphasis': 'moderate',
    'tts.sentencePause': 500,
    'tts.ssml': false,
    'quality_targets.target_snr': 30,
    'quality_targets.target_mos': 4.0,
    'quality_targets.max_latency': 200,
    'quality_targets.max_packet_loss': 2
  };
}

// Function to load station configuration
function loadStationConfiguration(stationId, extension) {
  console.log(`[SafeLoader] Loading configuration for ${stationId}-${extension}`);
  const currentSystemKnobs = getCurrentSystemKnobs();
  const stationKnobs = knobIntegration.getStationKnobs(stationId, extension, currentSystemKnobs);
  console.log(`[SafeLoader] Loaded ${Object.keys(stationKnobs).length} knobs for ${stationId}-${extension}`);
  return stationKnobs;
}
// ===== End SafeLoader Integration =====

EOF

echo "Integration header created successfully!"