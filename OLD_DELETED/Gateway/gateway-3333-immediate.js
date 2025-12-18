#!/usr/bin/env node
/**
 * Gateway for Extension 3333 (English)
 * MATCHES 7777 BEHAVIOR: Sends individual 20ms frames immediately as Buffers
 */
const dgram = require("dgram");
const io = require("socket.io-client");
const fs = require("fs");

const CONFIG = {
  extensionId: "3333",
  fromAsteriskPort: 4020,
  toAsteriskPort: 4021,
  translationServerUrl: "http://localhost:3020",
  language: "en",
  logFile: "/tmp/gateway-3333-immediate.log"
};

const logStream = fs.createWriteStream(CONFIG.logFile, { flags: "a" });
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [Gateway-3333] ${message}\n`;
  console.log(logMessage.trim());
  logStream.write(logMessage);
}

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
  toSTTTTSserverPackets: 0,
  fromSTTTTSserverPackets: 0,
  toAsteriskPackets: 0,
  startTime: Date.now()
};

const fromAsteriskSocket = dgram.createSocket("udp4");
const toAsteriskSocket = dgram.createSocket("udp4");
let translationSocket = null;

/**
 * Parse RTP header
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
 * Scale PCM audio for optimal Deepgram performance
 * Matches 7777 gateway behavior
 * @param {Buffer} pcmBuffer - PCM16 audio data
 * @param {number} gainFactor - Gain multiplier (0.79 = -2dB)
 * @returns {Buffer} - Scaled PCM audio
 */
function scalePCM(pcmBuffer, gainFactor = 0.79) {
  const scaled = Buffer.alloc(pcmBuffer.length);
  let maxSample = 0;
  let clippedSamples = 0;

  for (let i = 0; i < pcmBuffer.length; i += 2) {
    let sample = pcmBuffer.readInt16LE(i);
    maxSample = Math.max(maxSample, Math.abs(sample));

    let scaledSample = Math.round(sample * gainFactor);

    // Prevent clipping
    if (scaledSample > 32767) { scaledSample = 32767; clippedSamples++; }
    else if (scaledSample < -32768) { scaledSample = -32768; clippedSamples++; }

    scaled.writeInt16LE(scaledSample, i);
  }

  // Log scaling info periodically
  if (maxSample > 30000 || clippedSamples > 0) {
    log(`[PCM Scale] Gain: ${gainFactor.toFixed(2)}x, Max input: ${maxSample}, Clipped: ${clippedSamples}`);
  }

  return scaled;
}

/**
 * Create RTP header for outgoing packets to Asterisk
 */
function createRTPHeader() {
  if (!rtpState.initialized) {
    log("ERROR: Cannot create RTP header - session not initialized");
    return null;
  }
  const header = Buffer.alloc(12);
  header[0] = 0x80;
  header[1] = rtpState.payloadType;
  header.writeUInt16BE(rtpState.sequenceNumber, 2);
  rtpState.sequenceNumber = (rtpState.sequenceNumber + 1) % 65536;
  header.writeUInt32BE(rtpState.timestamp, 4);
  rtpState.timestamp = (rtpState.timestamp + 320) % 0x100000000;
  header.writeUInt32BE(rtpState.ssrc, 8);
  return header;
}

/**
 * Send PCM audio back to Asterisk as RTP
 */
function sendPCMToAsterisk(pcmData) {
  if (!rtpState.lastAsteriskAddress || !rtpState.lastAsteriskPort) {
    return;
  }
  const rtpHeader = createRTPHeader();
  if (!rtpHeader) return;
  const rtpPacket = Buffer.concat([rtpHeader, pcmData]);
  toAsteriskSocket.send(rtpPacket, rtpState.lastAsteriskPort, rtpState.lastAsteriskAddress, (err) => {
    if (err) log(`Error sending to Asterisk: ${err.message}`);
    else stats.toAsteriskPackets++;
  });
}

/**
 * Connect to Translation Server via Socket.IO
 */
function connectToTranslationServer() {
  log(`Connecting to STTTTSserver at ${CONFIG.translationServerUrl}`);

  translationSocket = io(CONFIG.translationServerUrl, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity
  });

  translationSocket.on("connect", () => {
    log("✓ Connected to STTTTSserver");
    translationSocket.emit("registerExtension", {
      extension: CONFIG.extensionId,
      language: CONFIG.language
    });
  });

  translationSocket.on("disconnect", () => {
    log("✗ Disconnected from STTTTSserver");
  });

  translationSocket.on("error", (error) => {
    log(`Socket.IO error: ${error.message}`);
  });

  // Receive translated audio from STTTTSserver
  translationSocket.on("translatedAudio", (data) => {
    const { audio } = data;
    if (!audio) return;
    stats.fromSTTTTSserverPackets++;
    sendPCMToAsterisk(Buffer.from(audio));
  });

  // Also listen for 'translated-audio' event
  translationSocket.on("translated-audio", (data) => {
    const { audio } = data;
    if (!audio) return;
    stats.fromSTTTTSserverPackets++;
    sendPCMToAsterisk(Buffer.from(audio));
  });
}

/**
 * Forward audio to Translation Server
 * MATCHES 7777 BEHAVIOR: Sends individual frames immediately as Buffers
 */
function forwardAudioToTranslationServer(pcmPayload) {
  if (!translationSocket || !translationSocket.connected) {
    return;
  }

  // Scale PCM to normalize volume (0.79x gain = -2 dB)
  const scaledPCM = scalePCM(pcmPayload, 0.79);

  // Send to STTTTSserver via Socket.IO
  // CRITICAL: Send as Buffer (NOT Array.from)
  translationSocket.emit("audioStream", {
    extension: CONFIG.extensionId,
    audio: scaledPCM,              // ← Buffer (640 bytes per 20ms frame)
    timestamp: Date.now(),
    format: "pcm16",
    sampleRate: 16000
  });

  stats.toSTTTTSserverPackets++;
}

/**
 * Receive RTP from Asterisk
 * MATCHES 7777 BEHAVIOR: Forwards EVERY packet immediately (no buffering)
 */
fromAsteriskSocket.on("message", (msg, rinfo) => {
  stats.fromAsteriskPackets++;
  const header = parseRTPHeader(msg);
  if (!header) return;

  // Learn RTP parameters from first packet
  if (!rtpState.initialized) {
    rtpState.ssrc = header.ssrc;
    rtpState.sequenceNumber = header.sequenceNumber;
    rtpState.timestamp = header.timestamp;
    rtpState.payloadType = header.payloadType;
    rtpState.lastAsteriskAddress = rinfo.address;
    rtpState.lastAsteriskPort = rinfo.port;
    rtpState.initialized = true;
    log(`✓ RTP session initialized: SSRC=${rtpState.ssrc}, PT=${rtpState.payloadType}`);
  } else {
    rtpState.lastAsteriskAddress = rinfo.address;
    rtpState.lastAsteriskPort = rinfo.port;
  }

  // Extract PCM payload
  let headerSize = 12 + (header.csrcCount * 4);
  if (header.extension && msg.length >= headerSize + 4) {
    const extensionLength = msg.readUInt16BE(headerSize + 2);
    headerSize += 4 + (extensionLength * 4);
  }

  const pcmPayload = msg.slice(headerSize);

  // Forward IMMEDIATELY to Translation Server (no buffering)
  forwardAudioToTranslationServer(pcmPayload);
});

// Bind UDP sockets
fromAsteriskSocket.bind(CONFIG.fromAsteriskPort, () => {
  log(`✓ Listening for Asterisk RTP on UDP ${CONFIG.fromAsteriskPort}`);
  log(`✓ Forwarding mode: IMMEDIATE (no buffering, matches 7777)`);
});

toAsteriskSocket.bind(CONFIG.toAsteriskPort, () => {
  log(`✓ Ready to send RTP to Asterisk via UDP ${CONFIG.toAsteriskPort}`);
});

// Connect to translation server
connectToTranslationServer();

// Stats logging every 30 seconds
setInterval(() => {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  log(`Stats: Uptime=${uptime}s, RX=${stats.fromAsteriskPackets}, TX_Server=${stats.toSTTTTSserverPackets}, RX_Server=${stats.fromSTTTTSserverPackets}, TX_Asterisk=${stats.toAsteriskPackets}`);
}, 30000);

log("Gateway-3333 started - IMMEDIATE forwarding mode (matches 7777)");
