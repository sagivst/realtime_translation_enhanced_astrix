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
const stream7777 = fs.createWriteStream(`/tmp/recording-7777-${timestamp}.rtp`);
const stream8888 = fs.createWriteStream(`/tmp/recording-8888-${timestamp}.rtp`);

let packetCount7777 = 0;
let packetCount8888 = 0;

console.log('\nRTP Recorder Started');
console.log('===================');
console.log(`Recording 7777: /tmp/recording-7777-${timestamp}.rtp`);
console.log(`Recording 8888: /tmp/recording-8888-${timestamp}.rtp`);
console.log('');

// Record from port 5000 (extension 7777)
socket5000.on('message', (msg, rinfo) => {
  stream7777.write(msg);
  packetCount7777++;

  if (packetCount7777 % 100 === 0) {
    console.log(`[7777] Recorded ${packetCount7777} packets (${(packetCount7777 * msg.length / 1024).toFixed(1)} KB)`);
  }
});

// Record from port 5001 (extension 8888)
socket5001.on('message', (msg, rinfo) => {
  stream8888.write(msg);
  packetCount8888++;

  if (packetCount8888 % 100 === 0) {
    console.log(`[8888] Recorded ${packetCount8888} packets (${(packetCount8888 * msg.length / 1024).toFixed(1)} KB)`);
  }
});

// Bind sockets
socket5000.bind(5000, '127.0.0.1', () => {
  console.log('Listening on UDP 127.0.0.1:5000 (Extension 7777)');
});

socket5001.bind(5001, '127.0.0.1', () => {
  console.log('Listening on UDP 127.0.0.1:5001 (Extension 8888)');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nStopping recorder...');
  console.log(`Total recorded:`);
  console.log(`  7777: ${packetCount7777} packets (${(packetCount7777 * 652 / 1024).toFixed(1)} KB)`);
  console.log(`  8888: ${packetCount8888} packets (${(packetCount8888 * 652 / 1024).toFixed(1)} KB)`);

  stream7777.end();
  stream8888.end();
  socket5000.close();
  socket5001.close();

  console.log('');
  console.log('Recordings saved to:');
  console.log(`  /tmp/recording-7777-${timestamp}.rtp`);
  console.log(`  /tmp/recording-8888-${timestamp}.rtp`);

  process.exit(0);
});
