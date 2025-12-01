#!/usr/bin/env node

/**
 * Test script to generate REAL monitoring data
 * Simulates audio processing with actual metrics
 */

const { RealTimeMonitor } = require('./real-time-monitor');
const crypto = require('crypto');

// Create monitors for testing
const station3 = new RealTimeMonitor('STATION_3', 'Test-Station3');
const station9 = new RealTimeMonitor('STATION_9', 'Test-Station9');

/**
 * Generate realistic audio buffer
 */
function generateAudioBuffer(durationMs = 100, frequency = 440, sampleRate = 16000) {
    const samples = (sampleRate * durationMs) / 1000;
    const buffer = Buffer.alloc(samples * 2); // 16-bit samples

    for (let i = 0; i < samples; i++) {
        // Generate sine wave with some noise
        const t = i / sampleRate;
        const signal = Math.sin(2 * Math.PI * frequency * t) * 0.3;
        const noise = (Math.random() - 0.5) * 0.05;
        const sample = Math.round((signal + noise) * 32767);

        // Write 16-bit sample
        buffer.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2);
    }

    return buffer;
}

/**
 * Simulate a call with real audio processing
 */
async function simulateCall() {
    console.log('🎯 Starting simulated call with REAL metrics...\n');

    const callId = `test-call-${Date.now()}`;
    const channel = 'caller';

    // Start monitoring
    await station3.startCall(callId, channel);
    await station9.startCall(callId, channel);

    console.log(`📞 Call started: ${callId}`);

    // Simulate 10 seconds of audio processing
    const processingDuration = 10000; // 10 seconds
    const chunkInterval = 100; // 100ms chunks
    const totalChunks = processingDuration / chunkInterval;

    for (let i = 0; i < totalChunks; i++) {
        // Generate audio with varying characteristics
        const frequency = 440 + Math.sin(i / 10) * 100; // Varying frequency
        const audioBuffer = generateAudioBuffer(chunkInterval, frequency);

        // Process through Station 3 (before Deepgram)
        station3.processAudioChunk(audioBuffer);

        // Simulate some processing delay
        await new Promise(resolve => setTimeout(resolve, 10));

        // Process through Station 9 (TTS output)
        // Generate different audio for TTS (lower frequency, cleaner)
        const ttsBuffer = generateAudioBuffer(chunkInterval, 220 + Math.sin(i / 5) * 50);
        station9.processAudioChunk(ttsBuffer);

        // Progress indicator
        if (i % 10 === 0) {
            const progress = Math.round((i / totalChunks) * 100);
            console.log(`Processing: ${progress}% complete...`);
        }

        // Wait for next chunk
        await new Promise(resolve => setTimeout(resolve, chunkInterval - 10));
    }

    console.log('Processing: 100% complete');

    // End the call
    await station3.endCall();
    await station9.endCall();

    console.log(`\n✅ Call ended: ${callId}`);
    console.log('📊 Data has been stored in the database with REAL metrics!');

    // Close database connections
    await station3.pool.end();
    await station9.pool.end();
}

// Run the test
console.log('========================================');
console.log('   Real Monitoring Test');
console.log('========================================\n');

simulateCall()
    .then(() => {
        console.log('\n✨ Test completed successfully!');
        console.log('Check the database for real metrics and audio files.');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });