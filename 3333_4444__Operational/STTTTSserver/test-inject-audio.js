// Test script to inject synthetic speech into the ASR system
const axios = require('axios');

async function testTranscription() {
    console.log('Testing transcription with Deepgram directly...');
    
    // Generate test audio: Hello, this is a test of the transcription system
    // Create a buffer of 8kHz 16-bit PCM audio (1 second of loud 440Hz tone)
    const sampleRate = 8000;
    const duration = 3; // 3 seconds
    const frequency = 440; // A4 note
    const amplitude = 10000; // Loud enough for Deepgram
    
    const numSamples = sampleRate * duration;
    const audioBuffer = Buffer.alloc(numSamples * 2); // 16-bit = 2 bytes per sample
    
    for (let i = 0; i < numSamples; i++) {
        const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * amplitude;
        audioBuffer.writeInt16LE(Math.round(sample), i * 2);
    }
    
    console.log('Generated test audio:', audioBuffer.length, 'bytes');
    console.log('Sending to ASR worker...');
    
    // Get the ASR worker from the global scope
    const asrWorker = global.asrWorker;
    
    if (!asrWorker) {
        console.error('ASR worker not initialized!');
        return;
    }
    
    console.log('ASR worker connected:', asrWorker.connected);
    
    // Send audio in chunks
    const chunkSize = 320; // 20ms chunks at 8kHz
    for (let i = 0; i < audioBuffer.length; i += chunkSize) {
        const chunk = audioBuffer.slice(i, i + chunkSize);
        asrWorker.sendAudio(chunk, { segmentId: i / chunkSize });
        await new Promise(resolve => setTimeout(resolve, 20)); // 20ms delay
    }
    
    console.log('Test audio sent. Check logs for transcription results.');
}

// Wait for server to be ready
setTimeout(testTranscription, 5000);
