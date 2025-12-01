/**
 * RTP Crossover Test - Audio Loopback Between Extensions
 *
 * Routes audio between ExternalMedia ports for testing:
 * - Extension 9007 (UDP 5000) → Extension 9008 (UDP 5001)
 * - Extension 9008 (UDP 5001) → Extension 9007 (UDP 5000)
 *
 * This allows testing the ExternalMedia audio path quality.
 */

const dgram = require('dgram');

// Create UDP sockets
const socket5000 = dgram.createSocket('udp4');
const socket5001 = dgram.createSocket('udp4');

// Track remote endpoints (Asterisk's RTP source addresses)
let remote9007 = null;  // Asterisk's address for extension 9007
let remote9008 = null;  // Asterisk's address for extension 9008

// Bind socket for port 5000 (extension 9007)
socket5000.bind(5000, '127.0.0.1', () => {
  console.log('✅ Listening on UDP port 5000 (Extension 9007)');
});

// Bind socket for port 5001 (extension 9008)
socket5001.bind(5001, '127.0.0.1', () => {
  console.log('✅ Listening on UDP port 5001 (Extension 9008)');
});

// Receive from 9007 (port 5000) → Send to 9008 (port 5001)
socket5000.on('message', (msg, rinfo) => {
  // Save remote address for 9007
  if (!remote9007 || remote9007.port !== rinfo.port) {
    remote9007 = { address: rinfo.address, port: rinfo.port };
    console.log(`[9007] Remote endpoint detected: ${rinfo.address}:${rinfo.port}`);
  }

  // Forward to 9008's remote endpoint (if known)
  if (remote9008) {
    socket5001.send(msg, remote9008.port, remote9008.address, (err) => {
      if (err) console.error('[9007→9008] Send error:', err);
    });
  }
});

// Receive from 9008 (port 5001) → Send to 9007 (port 5000)
socket5001.on('message', (msg, rinfo) => {
  // Save remote address for 9008
  if (!remote9008 || remote9008.port !== rinfo.port) {
    remote9008 = { address: rinfo.address, port: rinfo.port };
    console.log(`[9008] Remote endpoint detected: ${rinfo.address}:${rinfo.port}`);
  }

  // Forward to 9007's remote endpoint (if known)
  if (remote9007) {
    socket5000.send(msg, remote9007.port, remote9007.address, (err) => {
      if (err) console.error('[9008→9007] Send error:', err);
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
console.log('  Extension 9007 (port 5000) ↔ Extension 9008 (port 5001)');
console.log('');
console.log('Instructions:');
console.log('  1. Call extension 9007 from one phone');
console.log('  2. Call extension 9008 from another phone');
console.log('  3. Speak on 9007 → Hear on 9008');
console.log('  4. Speak on 9008 → Hear on 9007');
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
