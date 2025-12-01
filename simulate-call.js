#!/usr/bin/env node

/**
 * Simulate a phone call to trigger Station 3 monitoring
 * This simulates what happens when someone calls extension 3333 or 4444
 */

const dgram = require('dgram');
const fs = require('fs');

// Create UDP socket for sending audio
const socket = dgram.createSocket('udp4');

// Simulated audio data (PCM 16-bit, 16kHz)
function generateAudioBuffer() {
  // Generate 320 bytes of simulated audio (20ms at 16kHz)
  const buffer = Buffer.alloc(320);
  for (let i = 0; i < buffer.length; i += 2) {
    // Generate a simple sine wave
    const sample = Math.sin((i / 2) * 0.1) * 10000;
    buffer.writeInt16LE(sample, i);
  }
  return buffer;
}

// Call configuration
const callId = `CALL-${Date.now()}`;
const extension = process.argv[2] || '3333';
const port = extension === '3333' ? 6120 : 6121;  // UDP ports for audio

console.log(`
📞 Simulating Call to Extension ${extension}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Call ID: ${callId}
UDP Port: ${port}
Target: 20.170.155.53

Sending audio packets for 10 seconds...
`);

let packetsSent = 0;
const startTime = Date.now();

// Send audio packets every 20ms (50 packets per second)
const interval = setInterval(() => {
  const audioBuffer = generateAudioBuffer();

  // Send to STTTTSserver UDP port
  socket.send(audioBuffer, port, '20.170.155.53', (err) => {
    if (err) {
      console.error('Error sending packet:', err);
    } else {
      packetsSent++;
      if (packetsSent % 50 === 0) {
        console.log(`✓ Sent ${packetsSent} packets (${packetsSent / 50} seconds)`);
      }
    }
  });

  // Stop after 10 seconds
  if (Date.now() - startTime > 10000) {
    clearInterval(interval);
    socket.close();

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Call simulation complete!

Summary:
- Extension: ${extension}
- Duration: 10 seconds
- Packets sent: ${packetsSent}
- Call ID: ${callId}

Check the dashboard at:
http://20.170.155.53:8080/database-records.html

The call data should appear with:
- Station: STATION_3
- Channel: ${extension === '3333' ? 'caller' : 'callee'}
- Call ID: ${callId}
`);
  }
}, 20);

// Handle errors
socket.on('error', (err) => {
  console.error('Socket error:', err);
  process.exit(1);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n❌ Call simulation interrupted');
  socket.close();
  process.exit(0);
});