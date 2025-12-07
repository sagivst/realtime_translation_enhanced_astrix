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
  logFile: "/tmp/gateway-3333-socketio.log"
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
      language: "en"
    });
  });

  translationSocket.on("disconnect", () => {
    log("✗ Disconnected from STTTTSserver");
  });

  translationSocket.on("error", (error) => {
    log(`Socket.IO error: ${error.message}`);
  });

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

fromAsteriskSocket.on("message", (msg, rinfo) => {
  stats.fromAsteriskPackets++;
  const header = parseRTPHeader(msg);
  if (!header) return;

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

  let headerSize = 12 + (header.csrcCount * 4);
  if (header.extension && msg.length >= headerSize + 4) {
    const extensionLength = msg.readUInt16BE(headerSize + 2);
    headerSize += 4 + (extensionLength * 4);
  }

  const pcmPayload = msg.slice(headerSize);
  
  if (translationSocket && translationSocket.connected) {
    translationSocket.emit("audioStream", {
      extension: CONFIG.extensionId,
      audio: Array.from(pcmPayload),
      timestamp: Date.now()
    });
    stats.toSTTTTSserverPackets++;
  }
});

fromAsteriskSocket.bind(CONFIG.fromAsteriskPort, () => {
  log(`✓ Listening for Asterisk RTP on UDP ${CONFIG.fromAsteriskPort}`);
});

toAsteriskSocket.bind(CONFIG.toAsteriskPort, () => {
  log(`✓ Ready to send RTP to Asterisk via UDP ${CONFIG.toAsteriskPort}`);
});

connectToTranslationServer();

setInterval(() => {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  log(`Stats: Uptime=${uptime}s, From Asterisk=${stats.fromAsteriskPackets}, To STTTTSserver=${stats.toSTTTTSserverPackets}, From STTTTSserver=${stats.fromSTTTTSserverPackets}, To Asterisk=${stats.toAsteriskPackets}`);
}, 30000);

log("Gateway-3333-SocketIO started");
