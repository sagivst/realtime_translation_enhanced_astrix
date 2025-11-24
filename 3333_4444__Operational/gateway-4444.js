#!/usr/bin/env node
/**
 * Gateway-4444: Handle audio for Extension 4444
 *
 * FIXED: Detect new RTP sessions (new SSRC) and reset state for consecutive calls
 *
 * Asterisk: port 4002 (ALAW 8kHz)
 * STTTTSserver: ports 6122/6123 (PCM 16kHz)
 */

const dgram = require('dgram');
const { spawn } = require('child_process');
const fs = require('fs');

const CONFIG = {
  extensionId: '4444',
  fromAsteriskPort: 4002,
  toSTTTTSPort: 6122,
  fromSTTTTSPort: 6123,
  stttsHost: '127.0.0.1',
  logFile: '/tmp/gateway-4444-operational.log'
};

const logStream = fs.createWriteStream(CONFIG.logFile, { flags: 'a' });
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [GW-4444] ${message}\n`;
  console.log(logMessage.trim());
  logStream.write(logMessage);
}

let asteriskEndpoint = null;
let rtpState = { ssrc: null, seq: 0, timestamp: 0, payloadType: 8 };
let stats = { rxFromAsterisk: 0, txToSTTTS: 0, rxFromSTTTS: 0, txToAsterisk: 0 };

// GStreamer pipelines with layout=interleaved fix
const gstUpsampler = spawn('gst-launch-1.0', [
  '-q', 'fdsrc', 'fd=0',
  '!', 'audio/x-alaw,rate=8000,channels=1',
  '!', 'alawdec', '!', 'audioconvert', '!', 'audioresample',
  '!', 'audio/x-raw,format=S16LE,rate=16000,channels=1,layout=interleaved',
  '!', 'fdsink', 'fd=1'
]);

const gstDownsampler = spawn('gst-launch-1.0', [
  '-q', 'fdsrc', 'fd=0',
  '!', 'audio/x-raw,format=S16LE,rate=16000,channels=1,layout=interleaved',
  '!', 'audioconvert', '!', 'audioresample',
  '!', 'audio/x-raw,rate=8000,channels=1',
  '!', 'alawenc', '!', 'fdsink', 'fd=1'
]);

// Error handlers for GStreamer processes
gstUpsampler.on('error', (err) => log(`ERROR: Upsampler spawn failed: ${err.message}`));
gstUpsampler.on('exit', (code, signal) => log(`WARNING: Upsampler exited: code=${code}, signal=${signal}`));
gstUpsampler.stderr.on('data', (data) => log(`Upsampler stderr: ${data}`));

gstDownsampler.on('error', (err) => log(`ERROR: Downsampler spawn failed: ${err.message}`));
gstDownsampler.on('exit', (code, signal) => log(`WARNING: Downsampler exited: code=${code}, signal=${signal}`));
gstDownsampler.stderr.on('data', (data) => log(`Downsampler stderr: ${data}`));

const fromAsteriskSocket = dgram.createSocket('udp4');
const toSTTTTSSocket = dgram.createSocket('udp4');
const fromSTTTTSSocket = dgram.createSocket('udp4');

// INCOMING: Asterisk → Gateway (ALAW 8kHz RTP)
fromAsteriskSocket.on('message', (msg, rinfo) => {
  stats.rxFromAsterisk++;

  if (msg.length < 12) return;

  // FIX: Detect new RTP session (new SSRC = new call)
  const newSSRC = msg.readUInt32BE(8);

  if (!rtpState.ssrc || newSSRC !== rtpState.ssrc) {
    // New RTP session detected - reset state
    rtpState.ssrc = newSSRC;
    rtpState.seq = msg.readUInt16BE(2) + 1;
    rtpState.timestamp = msg.readUInt32BE(4) + 160;
    asteriskEndpoint = { address: rinfo.address, port: rinfo.port };
    log(`RTP session init: SSRC=${rtpState.ssrc} (endpoint: ${rinfo.address}:${rinfo.port})`);
  }

  const alawPayload = msg.slice(12);
  gstUpsampler.stdin.write(alawPayload);
});

// UPSAMPLER OUTPUT: PCM 16kHz → STTTTSserver
gstUpsampler.stdout.on('data', (pcm16Data) => {
  stats.txToSTTTS++;
  toSTTTTSSocket.send(pcm16Data, CONFIG.toSTTTTSPort, CONFIG.stttsHost);
});

// INCOMING: STTTTSserver → Gateway (PCM 16kHz)
fromSTTTTSSocket.on('message', (pcm16Data) => {
  stats.rxFromSTTTS++;

  if (!gstDownsampler.stdin || !gstDownsampler.stdin.writable) {
    log(`WARNING: Downsampler stdin not writable`);
    return;
  }

  gstDownsampler.stdin.write(pcm16Data);
});

// DOWNSAMPLER OUTPUT: ALAW 8kHz → Asterisk
gstDownsampler.stdout.on('data', (alawData) => {
  if (!asteriskEndpoint) return;

  const rtpPacket = Buffer.alloc(12 + alawData.length);

  // RTP header
  rtpPacket[0] = 0x80; // V=2, P=0, X=0, CC=0
  rtpPacket[1] = rtpState.payloadType; // PT=8 (PCMA/ALAW)
  rtpPacket.writeUInt16BE(rtpState.seq++, 2);
  rtpPacket.writeUInt32BE(rtpState.timestamp, 4);
  rtpPacket.writeUInt32BE(rtpState.ssrc, 8);

  rtpState.timestamp += 160; // 20ms @ 8kHz

  // Payload
  alawData.copy(rtpPacket, 12);

  fromAsteriskSocket.send(rtpPacket, asteriskEndpoint.port, asteriskEndpoint.address, (err) => {
    if (!err) stats.txToAsterisk++;
  });
});

// Bind sockets
fromAsteriskSocket.bind(CONFIG.fromAsteriskPort, () => {
  log(`✓ Listening for Asterisk on UDP ${CONFIG.fromAsteriskPort}`);
});

fromSTTTTSSocket.bind(CONFIG.fromSTTTTSPort, () => {
  log(`✓ Listening for STTTTSserver on UDP ${CONFIG.fromSTTTTSPort}`);
});

// Stats logging
setInterval(() => {
  log(`Stats: RX_Ast=${stats.rxFromAsterisk}, TX_STTTS=${stats.txToSTTTS}, RX_STTTS=${stats.rxFromSTTTS}, TX_Ast=${stats.txToAsterisk}`);
}, 10000);

log('='.repeat(80));
log('Gateway-4444 OPERATIONAL Ready (WITH RTP SESSION RESET FIX)');
log('FIX: Detects new SSRC and resets state for consecutive calls');
log('='.repeat(80));
log(`Asterisk (:${CONFIG.fromAsteriskPort} ALAW 8kHz) ←→ STTTTSserver (:${CONFIG.toSTTTTSPort}/:${CONFIG.fromSTTTTSPort} PCM 16kHz)`);

process.on('SIGINT', () => {
  log('Shutting down Gateway-4444...');
  gstUpsampler.kill();
  gstDownsampler.kill();
  logStream.end();
  process.exit(0);
});
