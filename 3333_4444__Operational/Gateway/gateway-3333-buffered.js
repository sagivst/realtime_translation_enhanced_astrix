#!/usr/bin/env node
/**
 * Gateway for Extension 3333 - BUFFERED VERSION
 * Buffers packets from conf-server until Asterisk connects
 * This prevents dropping early audio packets
 */

const dgram = require('dgram');
const fs = require('fs');

const CONFIG = {
  extensionId: '3333',
  fromAsteriskPort: 4020,
  toAsteriskPort: 4021,
  toConfServerPort: 6120,
  fromConfServerPort: 6121,
  confServerHost: '127.0.0.1',
  sampleRate: 16000,
  frameSizeMs: 20,
  samplesPerFrame: 320,
  maxBufferedPackets: 1000,  // Buffer up to 20 seconds (1000 * 20ms)
  logFile: '/tmp/gateway-3333-buffered.log'
};

const logStream = fs.createWriteStream(CONFIG.logFile, { flags: 'a' });
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [Gateway-3333] ${message}\n`;
  console.log(logMessage.trim());
  logStream.write(logMessage);
}

// Packet buffer for early conf-server packets
let packetBuffer = [];

// RTP State - LEARNED from Asterisk
let rtpState = {
  ssrc: null,
  sequenceNumber: null,
  timestamp: null,
  payloadType: null,
  lastAsteriskAddress: null,
  lastAsteriskPort: null,
  initialized: false
};

let stats = {
  fromAsteriskPackets: 0,
  toConfServerPackets: 0,
  fromConfServerPackets: 0,
  toAsteriskPackets: 0,
  rtpHeadersStripped: 0,
  rtpHeadersAdded: 0,
  bufferedPackets: 0,
  flushedPackets: 0,
  droppedBufferOverflow: 0,
  startTime: Date.now()
};

const fromAsteriskSocket = dgram.createSocket('udp4');
const toAsteriskSocket = dgram.createSocket('udp4');
const toConfServerSocket = dgram.createSocket('udp4');
const fromConfServerSocket = dgram.createSocket('udp4');

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

function createRTPHeader() {
  if (!rtpState.initialized) {
    log('ERROR: Cannot create RTP header - session not initialized');
    return null;
  }

  const header = Buffer.alloc(12);
  header[0] = 0x80;
  header[1] = rtpState.payloadType;
  header.writeUInt16BE(rtpState.sequenceNumber, 2);
  rtpState.sequenceNumber = (rtpState.sequenceNumber + 1) % 65536;
  header.writeUInt32BE(rtpState.timestamp, 4);
  rtpState.timestamp = (rtpState.timestamp + CONFIG.samplesPerFrame) % 0x100000000;
  header.writeUInt32BE(rtpState.ssrc, 8);

  return header;
}

function sendPCMToAsterisk(pcmData) {
  if (!rtpState.lastAsteriskAddress || !rtpState.lastAsteriskPort) {
    return false;
  }

  const rtpHeader = createRTPHeader();
  if (!rtpHeader) {
    return false;
  }

  const rtpPacket = Buffer.concat([rtpHeader, pcmData]);

  toAsteriskSocket.send(rtpPacket, rtpState.lastAsteriskPort, rtpState.lastAsteriskAddress, (err) => {
    if (err) {
      log(`ERROR sending to Asterisk: ${err.message}`);
    } else {
      stats.toAsteriskPackets++;
    }
  });

  return true;
}

function flushPacketBuffer() {
  if (packetBuffer.length === 0) return;

  log(`Flushing ${packetBuffer.length} buffered packets to Asterisk...`);
  
  for (const pcmData of packetBuffer) {
    sendPCMToAsterisk(pcmData);
    stats.flushedPackets++;
  }

  log(`Flushed ${packetBuffer.length} packets successfully`);
  packetBuffer = [];  // Clear buffer
}

fromAsteriskSocket.on('message', (msg, rinfo) => {
  stats.fromAsteriskPackets++;

  if (rtpState.lastAsteriskPort !== rinfo.port) {
    if (rtpState.lastAsteriskPort) {
      log(`Asterisk port changed: ${rtpState.lastAsteriskPort} -> ${rinfo.port} (new session)`);
      rtpState.initialized = false;  // Reset for new session
      stats.rtpHeadersStripped = 0;
      stats.rtpHeadersAdded = 0;
    }
    rtpState.lastAsteriskAddress = rinfo.address;
    rtpState.lastAsteriskPort = rinfo.port;
    log(`Asterisk connected from ${rinfo.address}:${rinfo.port}`);
  }

  // LEARN RTP parameters from Asterisk
  if (!rtpState.initialized && msg.length >= 12) {
    const rtpHeader = parseRTPHeader(msg);
    if (rtpHeader) {
      rtpState.ssrc = rtpHeader.ssrc;
      rtpState.sequenceNumber = rtpHeader.sequenceNumber + 1;
      rtpState.timestamp = rtpHeader.timestamp + CONFIG.samplesPerFrame;
      rtpState.payloadType = rtpHeader.payloadType;
      rtpState.initialized = true;
      log(`RTP session initialized: SSRC=0x${rtpState.ssrc.toString(16)}, Seq=${rtpHeader.sequenceNumber}, PT=${rtpHeader.payloadType}`);
      log(`WILL USE PT=${rtpState.payloadType} for return packets`);
      
      // FLUSH BUFFERED PACKETS NOW!
      flushPacketBuffer();
    }
  }

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

fromConfServerSocket.on('message', (msg, rinfo) => {
  stats.fromConfServerPackets++;

  if (!rtpState.initialized) {
    // RTP NOT INITIALIZED YET - BUFFER THE PACKET
    if (packetBuffer.length < CONFIG.maxBufferedPackets) {
      packetBuffer.push(Buffer.from(msg));  // Store copy of packet
      stats.bufferedPackets++;
      
      if (stats.bufferedPackets === 1) {
        log(`RTP not ready - buffering packets (max ${CONFIG.maxBufferedPackets})`);
      }
      if (stats.bufferedPackets % 50 === 0) {
        log(`Buffered ${stats.bufferedPackets} packets so far...`);
      }
    } else {
      // Buffer full - drop packet
      stats.droppedBufferOverflow++;
      if (stats.droppedBufferOverflow === 1) {
        log(`WARNING: Buffer full! Dropping overflow packets.`);
      }
    }
    return;
  }

  // RTP IS INITIALIZED - SEND IMMEDIATELY
  if (stats.rtpHeadersAdded < 3) {
    log(`Adding RTP header with PT=${rtpState.payloadType}: ${msg.length} bytes PCM -> ${msg.length + 12} bytes RTP`);
    stats.rtpHeadersAdded++;
  }

  sendPCMToAsterisk(msg);
});

fromAsteriskSocket.on('listening', () => {
  const address = fromAsteriskSocket.address();
  log(`Listening for Asterisk on ${address.address}:${address.port}`);
});

fromConfServerSocket.on('listening', () => {
  const address = fromConfServerSocket.address();
  log(`Listening for conf-server on ${address.address}:${address.port}`);
});

function reportStats() {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  log(`[STATS] Uptime: ${uptime}s | From Asterisk: ${stats.fromAsteriskPackets} | To Conf: ${stats.toConfServerPackets} | From Conf: ${stats.fromConfServerPackets} | To Asterisk: ${stats.toAsteriskPackets} | Buffered: ${stats.bufferedPackets} | Flushed: ${stats.flushedPackets} | Overflow: ${stats.droppedBufferOverflow} | RTP Init: ${rtpState.initialized}`);
}

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

function init() {
  log('='.repeat(80));
  log('Gateway-3333 - BUFFERED VERSION (Prevents Packet Loss)');
  log('='.repeat(80));
  log(`Extension: ${CONFIG.extensionId}`);
  log(`From Asterisk: UDP ${CONFIG.fromAsteriskPort} (RTP)`);
  log(`To Asterisk: UDP ${CONFIG.toAsteriskPort} (RTP)`);
  log(`To conf-server: UDP ${CONFIG.toConfServerPort} (PCM, ${CONFIG.confServerHost})`);
  log(`From conf-server: UDP ${CONFIG.fromConfServerPort} (PCM)`);
  log(`Audio: ${CONFIG.sampleRate}Hz, ${CONFIG.frameSizeMs}ms frames`);
  log(`Buffer: Max ${CONFIG.maxBufferedPackets} packets (${CONFIG.maxBufferedPackets * CONFIG.frameSizeMs / 1000}s)`);
  log(`Strategy: Buffer early packets, flush when Asterisk connects`);
  log('='.repeat(80));

  fromAsteriskSocket.bind(CONFIG.fromAsteriskPort);
  fromConfServerSocket.bind(CONFIG.fromConfServerPort);

  setInterval(reportStats, 30000);

  log('Gateway-3333 initialized and ready');
}

init();
