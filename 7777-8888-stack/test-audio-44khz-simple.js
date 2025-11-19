#!/usr/bin/env node
/**
 * Simple Test Audio Server - Plays existing 44.1kHz audio to extension 8888
 */

const WebSocket = require('ws');
const fs = require('fs');

const PORT = 3002;
const AUDIO_FILE = '/tmp/test-tone-44100.raw'; // Use existing file

console.log('=== Test Audio Server @ 44.1kHz ===\n');

// Check if audio file exists
if (!fs.existsSync(AUDIO_FILE)) {
  console.error(`Error: ${AUDIO_FILE} not found!`);
  process.exit(1);
}

const audioData = fs.readFileSync(AUDIO_FILE);
console.log(`✓ Loaded ${(audioData.length / 88200).toFixed(2)}s test audio @ 44.1kHz`);
console.log(`  File: ${AUDIO_FILE}`);
console.log(`  Size: ${audioData.length} bytes\n`);

const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
  console.log('✓ Gateway connected via WebSocket\n');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // When we receive audio from extension 8888
      if (data.event === 'audio' && data.extension === '8888') {
        console.log(`[8888] Received ${data.audioBuffer?.length || 0} bytes from mic`);
        console.log('[8888] → Sending 44.1kHz test audio back...');

        // Send our 44.1kHz audio back
        ws.send(JSON.stringify({
          event: 'translatedAudio',
          extension: '8888',
          audioBuffer: Array.from(audioData),
          sampleRate: 44100,
          format: 'pcm16',
          text: 'Test audio at 44100 Hz'
        }));

        console.log(`[8888] ✓ Sent ${audioData.length} bytes @ 44.1kHz\n`);
      }
    } catch (e) {
      // Ignore parse errors
    }
  });

  ws.on('close', () => {
    console.log('Gateway disconnected\n');
  });
});

console.log(`✓ WebSocket server listening on port ${PORT}`);
console.log('\n📞 NOW CALL: 7777 → 8888');
console.log('🎵 Speak into 7777, you should hear test audio on 8888');
console.log('✅ If audio plays at NORMAL speed → 44.1kHz works!');
console.log('❌ If audio still SLOW → problem is elsewhere\n');
