/**
 * RTP Crossover Test - Audio Loopback Between Extensions
 *
 * Routes audio between ExternalMedia ports for testing:
 * - Extension 7777 (UDP 5000) → Extension 8888 (UDP 5001)
 * - Extension 8888 (UDP 5001) → Extension 7777 (UDP 5000)
 *
 * This allows testing the ExternalMedia audio path quality.
 */

const dgram = require('dgram');

// Create UDP sockets
const socket5000 = dgram.createSocket('udp4');
const socket5001 = dgram.createSocket('udp4');

// Track remote endpoints (Asterisk's RTP source addresses)
let remote7777 = null;  // Asterisk's address for extension 7777
let remote8888 = null;  // Asterisk's address for extension 8888

// Bind socket for port 5000 (extension 7777)
socket5000.bind(5000, '127.0.0.1', () => {
  console.log('✅ Listening on UDP port 5000 (Extension 7777)');
});

// Bind socket for port 5001 (extension 8888)
socket5001.bind(5001, '127.0.0.1', () => {
  console.log('✅ Listening on UDP port 5001 (Extension 8888)');
});

// Receive from 7777 (port 5000) → Send to 8888 (port 5001)
socket5000.on('message', (msg, rinfo) => {
  // Save remote address for 7777
  if (!remote7777 || remote7777.port !== rinfo.port) {
    remote7777 = { address: rinfo.address, port: rinfo.port };
    console.log(`[7777] Remote endpoint detected: ${rinfo.address}:${rinfo.port}`);
  }

  // Forward to 8888's remote endpoint (if known)
  if (remote8888) {
    socket5001.send(msg, remote8888.port, remote8888.address, (err) => {
      if (err) console.error('[7777→8888] Send error:', err);
    });
  }
});

// Receive from 8888 (port 5001) → Send to 7777 (port 5000)
socket5001.on('message', (msg, rinfo) => {
  // Save remote address for 8888
  if (!remote8888 || remote8888.port !== rinfo.port) {
    remote8888 = { address: rinfo.address, port: rinfo.port };
    console.log(`[8888] Remote endpoint detected: ${rinfo.address}:${rinfo.port}`);
  }

  // Forward to 7777's remote endpoint (if known)
  if (remote7777) {
    socket5000.send(msg, remote7777.port, remote7777.address, (err) => {
      if (err) console.error('[8888→7777] Send error:', err);
    });
  }
});

// Error handlers
socket5000.on('error', (err) => {
  console.error('[Port 5000] Error:', err);
});

socket5001.on('error', (err) => {
  console.error('[Port 5001] Error:', err);
});

console.log('\n=== RTP Crossover Test Started ===');
console.log('Audio routing:');
console.log('  Extension 7777 (port 5000) ↔ Extension 8888 (port 5001)');
console.log('');
console.log('Instructions:');
console.log('  1. Call extension 7777 from one phone');
console.log('  2. Call extension 8888 from another phone');
console.log('  3. Speak on 7777 → Hear on 8888');
console.log('  4. Speak on 8888 → Hear on 7777');
console.log('');
console.log('Press Ctrl+C to stop');
console.log('');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  socket5000.close();
  socket5001.close();
  process.exit(0);
});
