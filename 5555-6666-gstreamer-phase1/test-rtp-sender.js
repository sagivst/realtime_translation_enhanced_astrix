// Standalone RTP Audio Test - Send test audio to Gateway for extension 8888
const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFERENCE_SERVER_URL = 'http://127.0.0.1:3002';  // Conference Server Socket.IO (global.io)
const TEST_AUDIO_FILE = '/home/azureuser/translation-app/7777-8888-stack/test-audio-fr.pcm';
const TARGET_EXTENSION = '8888';
const LOOP_INTERVAL_MS = 5000; // Send audio every 5 seconds

console.log('=== RTP Audio Test Script ===');
console.log(`Target: Extension ${TARGET_EXTENSION}`);
console.log(`Audio file: ${TEST_AUDIO_FILE}`);
console.log(`Conference Server: ${CONFERENCE_SERVER_URL}`);
console.log('');

// Connect to Conference Server
const socket = io(CONFERENCE_SERVER_URL, {
  transports: ['websocket'],
  reconnection: true
});

socket.on('connect', () => {
  console.log('✓ Connected to Gateway');
  console.log(`Socket ID: ${socket.id}`);
  console.log('');

  // Start sending audio
  startAudioLoop();
});

socket.on('disconnect', () => {
  console.log('✗ Disconnected from Gateway');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

let loopCount = 0;

function startAudioLoop() {
  console.log('Starting audio loop...');
  console.log('');

  // Send first audio immediately
  sendTestAudio();

  // Then send every LOOP_INTERVAL_MS
  setInterval(() => {
    sendTestAudio();
  }, LOOP_INTERVAL_MS);
}

function sendTestAudio() {
  loopCount++;

  try {
    // Read test audio file
    const audioBuffer = fs.readFileSync(TEST_AUDIO_FILE);

    console.log(`[Loop #${loopCount}] Sending test audio to extension ${TARGET_EXTENSION}`);
    console.log(`  Audio size: ${audioBuffer.length} bytes (${(audioBuffer.length / 32000).toFixed(2)}s @ 16kHz PCM16)`);
    console.log(`  Format: PCM16, 16kHz, mono, little-endian`);

    // Send to Gateway (mimics what conference server sends)
    socket.emit('translatedAudio', {
      extension: TARGET_EXTENSION,
      audioBuffer: audioBuffer,
      timestamp: Date.now()
    });

    console.log(`  ✓ Sent to Gateway at ${new Date().toISOString()}`);
    console.log('');

  } catch (error) {
    console.error(`[Loop #${loopCount}] Error sending audio:`, error.message);
    console.log('');
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('');
  console.log('Stopping test script...');
  console.log(`Total loops: ${loopCount}`);
  socket.disconnect();
  process.exit(0);
});

console.log('Connecting to Gateway...');
