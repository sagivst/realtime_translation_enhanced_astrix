#!/usr/bin/env node
/**
 * Test Audio Server - Plays 44.1kHz audio file to extension 9008
 * Clones AudioSocket approach for simple testing
 */

const WebSocket = require('ws');
const { exec } = require('child_process');
const fs = require('fs');

const PORT = 3002;
const AUDIO_FILE_44K = '/tmp/test-audio-44100.raw';

console.log('=== Test Audio Server @ 44.1kHz ===');
console.log('Generating test audio file...');

// Generate a voice-like audio sample at 44.1kHz
exec(`ffmpeg -f lavfi -i "sine=frequency=440:duration=2,sine=frequency=880:duration=2" -filter_complex "concat=n=2:v=0:a=1" -ar 44100 -ac 1 -f s16le -y ${AUDIO_FILE_44K} 2>&1`, (error) => {
  if (error) {
    console.error('Error generating audio:', error);
    return;
  }

  const audioData = fs.readFileSync(AUDIO_FILE_44K);
  console.log(`✓ Generated ${(audioData.length / 88200).toFixed(2)}s test audio @ 44.1kHz`);
  console.log(`  File size: ${audioData.length} bytes`);
  console.log(`\nStarting WebSocket server on port ${PORT}...\n`);

  const wss = new WebSocket.Server({ port: PORT });

  wss.on('connection', (ws) => {
    console.log('✓ Gateway connected via WebSocket');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);

        // When we receive audio from gateway (extension 9007 or 9008)
        if (data.event === 'audio' && data.extension === '9008') {
          console.log(`[9008] Received ${data.audioBuffer?.length || 0} bytes from mic`);

          // Send our test audio back immediately
          console.log('[9008] Sending test audio @ 44.1kHz...');

          ws.send(JSON.stringify({
            event: 'translatedAudio',
            extension: '9008',
            audioBuffer: Array.from(audioData),
            sampleRate: 44100,
            format: 'pcm16',
            text: 'Test audio at 44.1 kilohertz'
          }));

          console.log(`[9008] ✓ Sent ${audioData.length} bytes (${(audioData.length / 88200).toFixed(2)}s)`);
        }
      } catch (e) {
        console.error('Message parse error:', e.message);
      }
    });

    ws.on('close', () => {
      console.log('Gateway disconnected');
    });
  });

  console.log(`✓ Test server ready on ws://localhost:${PORT}`);
  console.log('\nNow call 9007 → 9008 and speak.');
  console.log('You should hear the test audio at normal speed if 44.1kHz works!\n');
});
