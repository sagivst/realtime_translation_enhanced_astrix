#!/usr/bin/env node
/**
 * Gateway for Extension 5555
 * PHASE 1 - PCM Cross-Patch with PROPER RTP Handling
 *
 * Preserves RTP session state from Asterisk for valid return packets
 */

const dgram = require('dgram');
const fs = require('fs');

// Configuration
const CONFIG = {
  extensionId: '5555',
  fromAsteriskPort: 4000,
  toAsteriskPort: 4001,
  toConfServerPort: 6100,
  fromConfServerPort: 6101,
  confServerHost: '127.0.0.1',
  sampleRate: 16000,
  frameSizeMs: 20,
  samplesPerFrame: 320, // 16kHz * 20ms
  logFile: '/tmp/gateway-5555-phase1.log'
};

// Logging
const logStream = fs.createWriteStream(CONFIG.logFile, { flags: 'a' });
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [Gateway-5555] ${message}\n`;
  console.log(logMessage.trim());
  logStream.write(logMessage);
}

// RTP State - LEARNED from Asterisk, not random
let rtpState = {
  ssrc: null,              // Will be captured from first Asterisk packet
  sequenceNumber: null,    // Will start from captured value
  timestamp: null,         // Will track properly
  lastAsteriskAddress: null,
  lastAsteriskPort: null,
  initialized: false
};

// Statistics
let stats = {
  fromAsteriskPackets: 0,
  toConfServerPackets: 0,
  fromConfServerPackets: 0,
  toAsteriskPackets: 0,
  rtpHeadersStripped: 0,
  rtpHeadersAdded: 0,
  rtpPacketsDropped: 0,
  startTime: Date.now()
};

// UDP Sockets
const fromAsteriskSocket = dgram.createSocket('udp4');
const toAsteriskSocket = dgram.createSocket('udp4');
const toConfServerSocket = dgram.createSocket('udp4');
const fromConfServerSocket = dgram.createSocket('udp4');

/**
 * Parse RTP header to learn session parameters
 */
function parseRTPHeader(buffer) {
  if (buffer.length < 12) return null;

  return {
    version: (buffer[0] >> 6) & 0x03,
    padding: (buffer[0] >> 5) & 0x01,
    extension: (buffer[0] >> 4) & 0x01,
    csrcCount: buffer[0] & 0x0F,
    marker: (buffer[1] >> 7) & 0x01,
    payloadType: buffer[1] & 0x7F,
    sequenceNumber: buffer.readUInt16BE(2),
    timestamp: buffer.readUInt32BE(4),
    ssrc: buffer.readUInt32BE(8)
  };
}

/**
 * Create RTP header using LEARNED session parameters
 */
function createRTPHeader() {
  if (!rtpState.initialized) {
    log('ERROR: Cannot create RTP header - session not initialized');
    return null;
  }

  const header = Buffer.alloc(12);

  // Byte 0: Version(2) + Padding(0) + Extension(0) + CSRC count(0)
  header[0] = 0x80;

  // Byte 1: Marker(0) + Payload Type(11 for L16/slin16)
  header[1] = 11;

  // Bytes 2-3: Sequence number (increment from last)
  header.writeUInt16BE(rtpState.sequenceNumber, 2);
  rtpState.sequenceNumber = (rtpState.sequenceNumber + 1) % 65536;

  // Bytes 4-7: Timestamp (increment by samples per frame)
  header.writeUInt32BE(rtpState.timestamp, 4);
  rtpState.timestamp = (rtpState.timestamp + CONFIG.samplesPerFrame) % 0x100000000;

  // Bytes 8-11: SSRC (USE THE SAME SSRC from Asterisk!)
  header.writeUInt32BE(rtpState.ssrc, 8);

  return header;
}

/**
 * Socket 1: Receive RTP FROM Asterisk, strip header, forward PCM
 */
fromAsteriskSocket.on('message', (msg, rinfo) => {
  stats.fromAsteriskPackets++;

  // Store Asterisk's address
  if (!rtpState.lastAsteriskAddress) {
    rtpState.lastAsteriskAddress = rinfo.address;
    rtpState.lastAsteriskPort = rinfo.port;
    log(`Asterisk connected from ${rinfo.address}:${rinfo.port}`);
  }

  // Parse RTP header to learn session parameters
  if (!rtpState.initialized && msg.length >= 12) {
    const rtpHeader = parseRTPHeader(msg);
    if (rtpHeader) {
      rtpState.ssrc = rtpHeader.ssrc;
      rtpState.sequenceNumber = rtpHeader.sequenceNumber + 1; // Start from next
      rtpState.timestamp = rtpHeader.timestamp + CONFIG.samplesPerFrame;
      rtpState.initialized = true;
      log(`RTP session initialized: SSRC=0x${rtpState.ssrc.toString(16)}, Seq=${rtpHeader.sequenceNumber}, PT=${rtpHeader.payloadType}`);
    }
  }

  // Strip RTP header and forward PCM
  if (msg.length > 12) {
    const pcmPayload = msg.slice(12);

    if (stats.rtpHeadersStripped < 3) {
      log(`Stripping RTP header: ${msg.length} bytes -> ${pcmPayload.length} bytes PCM`);
      stats.rtpHeadersStripped++;
    }

    toConfServerSocket.send(pcmPayload, CONFIG.toConfServerPort, CONFIG.confServerHost, (err) => {
      if (err) {
        log(`ERROR sending to conf-server: ${err.message}`);
      } else {
        stats.toConfServerPackets++;
      }
    });
  }
});

/**
 * Socket 2: Receive PCM FROM conf-server, add RTP header, send to Asterisk
 */
fromConfServerSocket.on('message', (msg, rinfo) => {
  stats.fromConfServerPackets++;

  // Wait for RTP session to be initialized
  if (!rtpState.initialized) {
    if (stats.fromConfServerPackets === 1) {
      log(`WARNING: Received PCM but RTP session not initialized yet`);
    }
    stats.rtpPacketsDropped++;
    return;
  }

  // Send back to Asterisk with RTP header
  if (rtpState.lastAsteriskAddress && rtpState.lastAsteriskPort) {
    const rtpHeader = createRTPHeader();

    if (!rtpHeader) {
      stats.rtpPacketsDropped++;
      return;
    }

    const rtpPacket = Buffer.concat([rtpHeader, msg]);

    if (stats.rtpHeadersAdded < 3) {
      log(`Adding RTP header: ${msg.length} bytes PCM -> ${rtpPacket.length} bytes RTP`);
      stats.rtpHeadersAdded++;
    }

    toAsteriskSocket.send(rtpPacket, rtpState.lastAsteriskPort, rtpState.lastAsteriskAddress, (err) => {
      if (err) {
        log(`ERROR sending to Asterisk: ${err.message}`);
      } else {
        stats.toAsteriskPackets++;
      }
    });
  }
});

fromAsteriskSocket.on('listening', () => {
  const address = fromAsteriskSocket.address();
  log(`Listening for Asterisk on ${address.address}:${address.port}`);
});

fromConfServerSocket.on('listening', () => {
  const address = fromConfServerSocket.address();
  log(`Listening for conf-server on ${address.address}:${address.port}`);
});

/**
 * Stats Reporter
 */
function reportStats() {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  log(`[STATS] Uptime: ${uptime}s | From Asterisk: ${stats.fromAsteriskPackets} | To Conf: ${stats.toConfServerPackets} | From Conf: ${stats.fromConfServerPackets} | To Asterisk: ${stats.toAsteriskPackets} | Dropped: ${stats.rtpPacketsDropped} | RTP Init: ${rtpState.initialized}`);
}

/**
 * Graceful Shutdown
 */
function shutdown() {
  log('Shutting down gateway-5555...');
  reportStats();
  fromAsteriskSocket.close();
  toAsteriskSocket.close();
  toConfServerSocket.close();
  fromConfServerSocket.close();
  logStream.end();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

/**
 * Initialize
 */
function init() {
  log('='.repeat(80));
  log('Gateway-5555 - PHASE 1 with PROPER RTP Session Handling');
  log('='.repeat(80));
  log(`Extension: ${CONFIG.extensionId}`);
  log(`From Asterisk: UDP ${CONFIG.fromAsteriskPort} (RTP)`);
  log(`To Asterisk: UDP ${CONFIG.toAsteriskPort} (RTP)`);
  log(`To conf-server: UDP ${CONFIG.toConfServerPort} (PCM, ${CONFIG.confServerHost})`);
  log(`From conf-server: UDP ${CONFIG.fromConfServerPort} (PCM)`);
  log(`Audio: slin16, ${CONFIG.sampleRate}Hz, ${CONFIG.frameSizeMs}ms frames`);
  log('='.repeat(80));

  fromAsteriskSocket.bind(CONFIG.fromAsteriskPort);
  fromConfServerSocket.bind(CONFIG.fromConfServerPort);

  setInterval(reportStats, 30000);

  log('Gateway-5555 initialized and ready');
}

init();
