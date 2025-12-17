#!/usr/bin/env node
const dgram = require("dgram");
const io = require("socket.io-client");
const fs = require("fs");

const CONFIG = {
  extensionId: "3333",
  fromAsteriskPort: 4020,
  toAsteriskPort: 4021,
  translationServerUrl: "http://localhost:3020",
  sampleRate: 16000,
  frameSizeMs: 20,
  samplesPerFrame: 320,
  bufferDurationMs: 800,  // Buffer 800ms before sending to Deepgram
  logFile: "/tmp/gateway-3333-socketio.log"
};

// Calculate buffer size (800ms = 40 frames)
const BUFFER_FRAMES = Math.floor(CONFIG.bufferDurationMs / CONFIG.frameSizeMs);
const BUFFER_SIZE_BYTES = BUFFER_FRAMES * CONFIG.samplesPerFrame * 2; // *2 for 16-bit

const logStream = fs.createWriteStream(CONFIG.logFile, { flags: "a" });
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [Gateway-3333-Buffered] ${message}\n`;
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
  bufferedFrames: 0,
  startTime: Date.now()
};

// Audio buffer for accumulating frames before sending
let audioBuffer = [];
let bufferByteCount = 0;

const fromAsteriskSocket = dgram.createSocket("udp4");
const toAsteriskSocket = dgram.createSocket("udp4");
let translationSocket = null;

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
 * @param {Buffer} pcmBuffer - PCM16 audio data
 * @param {number} gainFactor - Gain multiplier (0.79 = -2dB)
 * @returns {Buffer} - Scaled PCM audio
 */
function scalePCM(pcmBuffer, gainFactor = 0.79) {
  const scaled = Buffer.alloc(pcmBuffer.length);
  for (let i = 0; i < pcmBuffer.length; i += 2) {
    let sample = pcmBuffer.readInt16LE(i);
    let scaledSample = Math.round(sample * gainFactor);
    if (scaledSample > 32767) scaledSample = 32767;
    else if (scaledSample < -32768) scaledSample = -32768;
    scaled.writeInt16LE(scaledSample, i);
  }
  return scaled;
}

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
  rtpState.timestamp = (rtpState.timestamp + CONFIG.samplesPerFrame) % 0x100000000;
  header.writeUInt32BE(rtpState.ssrc, 8);
  return header;
}

function flushAudioBuffer() {
  if (audioBuffer.length === 0) return;
  
  // Concatenate all buffered PCM chunks
  const combinedBuffer = Buffer.concat(audioBuffer);
  const scaledBuffer = scalePCM(combinedBuffer, 0.79);
  
  // Send to STTTTSserver via Socket.IO
  if (translationSocket && translationSocket.connected) {
    translationSocket.emit("audioStream", {
      extension: CONFIG.extensionId,
      format: "pcm16",
      sampleRate: 16000,
      audio: Array.from(scaledBuffer),
      timestamp: Date.now()
    });
    stats.toSTTTTSserverPackets++;
    log(`Sent ${combinedBuffer.length} bytes (${audioBuffer.length} frames, ${bufferByteCount} bytes) to STTTTSserver`);
  }
  
  // Clear buffer
  audioBuffer = [];
  bufferByteCount = 0;
  stats.bufferedFrames = 0;
}

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
      format: "pcm16",
      sampleRate: 16000,
      language: "en"
    });
  });

  translationSocket.on("disconnect", () => {
    log("✗ Disconnected from STTTTSserver");
    // Clear buffer on disconnect
    audioBuffer = [];
    bufferByteCount = 0;
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
}

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

// Receive RTP from Asterisk
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
  
  // Add to buffer
  audioBuffer.push(pcmPayload);
  bufferByteCount += pcmPayload.length;
  stats.bufferedFrames++;
  
  // Flush buffer when we reach target duration (800ms = ~25,600 bytes)
  if (bufferByteCount >= BUFFER_SIZE_BYTES) {
    flushAudioBuffer();
  }
});

// Bind UDP sockets
fromAsteriskSocket.bind(CONFIG.fromAsteriskPort, () => {
  log(`✓ Listening for Asterisk RTP on UDP ${CONFIG.fromAsteriskPort}`);
  log(`✓ Buffer config: ${CONFIG.bufferDurationMs}ms (${BUFFER_FRAMES} frames, ${BUFFER_SIZE_BYTES} bytes)`);
});

toAsteriskSocket.bind(CONFIG.toAsteriskPort, () => {
  log(`✓ Ready to send RTP to Asterisk via UDP ${CONFIG.toAsteriskPort}`);
});

// Connect to translation server
connectToTranslationServer();

// Periodic buffer flush (every 1 second as safety)
setInterval(() => {
  if (audioBuffer.length > 0) {
    log(`Periodic flush: ${audioBuffer.length} frames buffered`);
    flushAudioBuffer();
  }
}, 1000);

// Stats logging every 30 seconds
setInterval(() => {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  log(`Stats: Uptime=${uptime}s, RX=${stats.fromAsteriskPackets}, TX_Server=${stats.toSTTTTSserverPackets}, RX_Server=${stats.fromSTTTTSserverPackets}, TX_Asterisk=${stats.toAsteriskPackets}, BufferFrames=${stats.bufferedFrames}`);
}, 30000);

log("Gateway-3333-Buffered started with 800ms audio buffering");
