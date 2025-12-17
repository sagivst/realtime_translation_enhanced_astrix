/**
 * Simple Port-to-Port Audio Crossover
 *
 * Captures RTP audio from one port and sends it directly to another port
 * No bridges, no ARI - just pure UDP forwarding
 */

const dgram = require('dgram');

// Ports configuration
const PORT_9007_IN = 5000;   // Receive audio FROM 9007
const PORT_9008_IN = 5001;   // Receive audio FROM 9008

// Track Asterisk's RTP endpoints (discovered from incoming packets)
let asterisk_9007_endpoint = null;
let asterisk_9008_endpoint = null;

// Create UDP sockets
const socket9007 = dgram.createSocket('udp4');
const socket9008 = dgram.createSocket('udp4');

let packetCount9007 = 0;
let packetCount9008 = 0;

// Listen on port 5000 (for extension 9007's audio)
socket9007.on('message', (msg, rinfo) => {
  // Save Asterisk's endpoint for 9007
  if (!asterisk_9007_endpoint ||
      asterisk_9007_endpoint.address !== rinfo.address ||
      asterisk_9007_endpoint.port !== rinfo.port) {
    asterisk_9007_endpoint = { address: rinfo.address, port: rinfo.port };
    console.log(`[9007] Asterisk endpoint detected: ${rinfo.address}:${rinfo.port}`);
  }

  packetCount9007++;

  // Forward this audio TO extension 9008 (send back to Asterisk's 9008 RTP port)
  if (asterisk_9008_endpoint) {
    socket9008.send(msg, asterisk_9008_endpoint.port, asterisk_9008_endpoint.address, (err) => {
      if (err) {
        console.error(`[9007→9008] Error:`, err.message);
      }
    });

    // Log every 50 packets
    if (packetCount9007 % 50 === 0) {
      console.log(`[9007→9008] Forwarded ${packetCount9007} packets (${msg.length} bytes each)`);
    }
  } else {
    if (packetCount9007 === 1) {
      console.log(`[9007] Waiting for 9008 to connect...`);
    }
  }
});

// Listen on port 5001 (for extension 9008's audio)
socket9008.on('message', (msg, rinfo) => {
  // Save Asterisk's endpoint for 9008
  if (!asterisk_9008_endpoint ||
      asterisk_9008_endpoint.address !== rinfo.address ||
      asterisk_9008_endpoint.port !== rinfo.port) {
    asterisk_9008_endpoint = { address: rinfo.address, port: rinfo.port };
    console.log(`[9008] Asterisk endpoint detected: ${rinfo.address}:${rinfo.port}`);
  }

  packetCount9008++;

  // Forward this audio TO extension 9007 (send back to Asterisk's 9007 RTP port)
  if (asterisk_9007_endpoint) {
    socket9007.send(msg, asterisk_9007_endpoint.port, asterisk_9007_endpoint.address, (err) => {
      if (err) {
        console.error(`[9008→9007] Error:`, err.message);
      }
    });

    // Log every 50 packets
    if (packetCount9008 % 50 === 0) {
      console.log(`[9008→9007] Forwarded ${packetCount9008} packets (${msg.length} bytes each)`);
    }
  } else {
    if (packetCount9008 === 1) {
      console.log(`[9008] Waiting for 9007 to connect...`);
    }
  }
});

// Error handlers
socket9007.on('error', (err) => {
  console.error('[Port 5000] Error:', err);
});

socket9008.on('error', (err) => {
  console.error('[Port 5001] Error:', err);
});

// Bind sockets
socket9007.bind(PORT_9007_IN, '127.0.0.1', () => {
  console.log(`✅ Listening on 127.0.0.1:${PORT_9007_IN} (Extension 9007 audio)`);
});

socket9008.bind(PORT_9008_IN, '127.0.0.1', () => {
  console.log(`✅ Listening on 127.0.0.1:${PORT_9008_IN} (Extension 9008 audio)`);
});

console.log('\n=== Simple Port-to-Port Audio Crossover ===');
console.log('');
console.log('Routing:');
console.log('  Port 5000 (9007 mic) → Port 5001 (9008 speaker)');
console.log('  Port 5001 (9008 mic) → Port 5000 (9007 speaker)');
console.log('');
console.log('Test:');
console.log('  1. Call extension 9007 from Phone A');
console.log('  2. Call extension 9008 from Phone B');
console.log('  3. Speak on Phone A → Should hear on Phone B');
console.log('  4. Speak on Phone B → Should hear on Phone A');
console.log('');
console.log('Press Ctrl+C to stop');
console.log('');

// Status report every 5 seconds
setInterval(() => {
  if (asterisk_9007_endpoint && asterisk_9008_endpoint) {
    console.log(`\n[STATUS] 9007: ${packetCount9007} pkts received | 9008: ${packetCount9008} pkts received`);
  }
}, 5000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  console.log(`Total packets forwarded: 9007→9008: ${packetCount9007}, 9008→9007: ${packetCount9008}`);
  socket9007.close();
  socket9008.close();
  process.exit(0);
});
