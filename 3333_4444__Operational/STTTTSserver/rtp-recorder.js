/**
 * Simple RTP Recorder
 * Records RTP audio from ports 5000 and 5001 to files
 */

const dgram = require('dgram');
const fs = require('fs');

// Create UDP sockets
const socket5000 = dgram.createSocket('udp4');
const socket5001 = dgram.createSocket('udp4');

// Create write streams for recording
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const stream9007 = fs.createWriteStream(`/tmp/recording-9007-${timestamp}.rtp`);
const stream9008 = fs.createWriteStream(`/tmp/recording-9008-${timestamp}.rtp`);

let packetCount9007 = 0;
let packetCount9008 = 0;

console.log('\nRTP Recorder Started');
console.log('===================');
console.log(`Recording 9007: /tmp/recording-9007-${timestamp}.rtp`);
console.log(`Recording 9008: /tmp/recording-9008-${timestamp}.rtp`);
console.log('');

// Record from port 5000 (extension 9007)
socket5000.on('message', (msg, rinfo) => {
  stream9007.write(msg);
  packetCount9007++;

  if (packetCount9007 % 100 === 0) {
    console.log(`[9007] Recorded ${packetCount9007} packets (${(packetCount9007 * msg.length / 1024).toFixed(1)} KB)`);
  }
});

// Record from port 5001 (extension 9008)
socket5001.on('message', (msg, rinfo) => {
  stream9008.write(msg);
  packetCount9008++;

  if (packetCount9008 % 100 === 0) {
    console.log(`[9008] Recorded ${packetCount9008} packets (${(packetCount9008 * msg.length / 1024).toFixed(1)} KB)`);
  }
});

// Bind sockets
socket5000.bind(5000, '127.0.0.1', () => {
  console.log('Listening on UDP 127.0.0.1:5000 (Extension 9007)');
});

socket5001.bind(5001, '127.0.0.1', () => {
  console.log('Listening on UDP 127.0.0.1:5001 (Extension 9008)');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nStopping recorder...');
  console.log(`Total recorded:`);
  console.log(`  9007: ${packetCount9007} packets (${(packetCount9007 * 652 / 1024).toFixed(1)} KB)`);
  console.log(`  9008: ${packetCount9008} packets (${(packetCount9008 * 652 / 1024).toFixed(1)} KB)`);

  stream9007.end();
  stream9008.end();
  socket5000.close();
  socket5001.close();

  console.log('');
  console.log('Recordings saved to:');
  console.log(`  /tmp/recording-9007-${timestamp}.rtp`);
  console.log(`  /tmp/recording-9008-${timestamp}.rtp`);

  process.exit(0);
});
