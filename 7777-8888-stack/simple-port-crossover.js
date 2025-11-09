/**
 * Simple Port-to-Port Audio Crossover
 *
 * Captures RTP audio from one port and sends it directly to another port
 * No bridges, no ARI - just pure UDP forwarding
 */

const dgram = require('dgram');

// Ports configuration
const PORT_7777_IN = 5000;   // Receive audio FROM 7777
const PORT_8888_IN = 5001;   // Receive audio FROM 8888

// Track Asterisk's RTP endpoints (discovered from incoming packets)
let asterisk_7777_endpoint = null;
let asterisk_8888_endpoint = null;

// Create UDP sockets
const socket7777 = dgram.createSocket('udp4');
const socket8888 = dgram.createSocket('udp4');

let packetCount7777 = 0;
let packetCount8888 = 0;

// Listen on port 5000 (for extension 7777's audio)
socket7777.on('message', (msg, rinfo) => {
  // Save Asterisk's endpoint for 7777
  if (!asterisk_7777_endpoint ||
      asterisk_7777_endpoint.address !== rinfo.address ||
      asterisk_7777_endpoint.port !== rinfo.port) {
    asterisk_7777_endpoint = { address: rinfo.address, port: rinfo.port };
    console.log(`[7777] Asterisk endpoint detected: ${rinfo.address}:${rinfo.port}`);
  }

  packetCount7777++;

  // Forward this audio TO extension 8888 (send back to Asterisk's 8888 RTP port)
  if (asterisk_8888_endpoint) {
    socket8888.send(msg, asterisk_8888_endpoint.port, asterisk_8888_endpoint.address, (err) => {
      if (err) {
        console.error(`[7777→8888] Error:`, err.message);
      }
    });

    // Log every 50 packets
    if (packetCount7777 % 50 === 0) {
      console.log(`[7777→8888] Forwarded ${packetCount7777} packets (${msg.length} bytes each)`);
    }
  } else {
    if (packetCount7777 === 1) {
      console.log(`[7777] Waiting for 8888 to connect...`);
    }
  }
});

// Listen on port 5001 (for extension 8888's audio)
socket8888.on('message', (msg, rinfo) => {
  // Save Asterisk's endpoint for 8888
  if (!asterisk_8888_endpoint ||
      asterisk_8888_endpoint.address !== rinfo.address ||
      asterisk_8888_endpoint.port !== rinfo.port) {
    asterisk_8888_endpoint = { address: rinfo.address, port: rinfo.port };
    console.log(`[8888] Asterisk endpoint detected: ${rinfo.address}:${rinfo.port}`);
  }

  packetCount8888++;

  // Forward this audio TO extension 7777 (send back to Asterisk's 7777 RTP port)
  if (asterisk_7777_endpoint) {
    socket7777.send(msg, asterisk_7777_endpoint.port, asterisk_7777_endpoint.address, (err) => {
      if (err) {
        console.error(`[8888→7777] Error:`, err.message);
      }
    });

    // Log every 50 packets
    if (packetCount8888 % 50 === 0) {
      console.log(`[8888→7777] Forwarded ${packetCount8888} packets (${msg.length} bytes each)`);
    }
  } else {
    if (packetCount8888 === 1) {
      console.log(`[8888] Waiting for 7777 to connect...`);
    }
  }
});

// Error handlers
socket7777.on('error', (err) => {
  console.error('[Port 5000] Error:', err);
});

socket8888.on('error', (err) => {
  console.error('[Port 5001] Error:', err);
});

// Bind sockets
socket7777.bind(PORT_7777_IN, '127.0.0.1', () => {
  console.log(`✅ Listening on 127.0.0.1:${PORT_7777_IN} (Extension 7777 audio)`);
});

socket8888.bind(PORT_8888_IN, '127.0.0.1', () => {
  console.log(`✅ Listening on 127.0.0.1:${PORT_8888_IN} (Extension 8888 audio)`);
});

console.log('\n=== Simple Port-to-Port Audio Crossover ===');
console.log('');
console.log('Routing:');
console.log('  Port 5000 (7777 mic) → Port 5001 (8888 speaker)');
console.log('  Port 5001 (8888 mic) → Port 5000 (7777 speaker)');
console.log('');
console.log('Test:');
console.log('  1. Call extension 7777 from Phone A');
console.log('  2. Call extension 8888 from Phone B');
console.log('  3. Speak on Phone A → Should hear on Phone B');
console.log('  4. Speak on Phone B → Should hear on Phone A');
console.log('');
console.log('Press Ctrl+C to stop');
console.log('');

// Status report every 5 seconds
setInterval(() => {
  if (asterisk_7777_endpoint && asterisk_8888_endpoint) {
    console.log(`\n[STATUS] 7777: ${packetCount7777} pkts received | 8888: ${packetCount8888} pkts received`);
  }
}, 5000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  console.log(`Total packets forwarded: 7777→8888: ${packetCount7777}, 8888→7777: ${packetCount8888}`);
  socket7777.close();
  socket8888.close();
  process.exit(0);
});
