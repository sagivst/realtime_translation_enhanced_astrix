#!/usr/bin/env node
/**
 * Gateway-3333: Handle audio for Extension 3333
 * 
 * CORRECTED to match existing STTTTSserver.js ports:
 * - Asterisk: port 4000 (ALAW 8kHz)
 * - STTTTSserver: ports 6120/6121 (PCM 16kHz)
 */

const dgram = require('dgram');
const { spawn } = require('child_process');
const fs = require('fs');

const CONFIG = {
  extensionId: '3333',
  fromAsteriskPort: 4000,
  toSTTTTSPort: 6120,      // Send 16kHz PCM to STTTTSserver
  fromSTTTTSPort: 6121,    // Receive 16kHz PCM from STTTTSserver
  stttsHost: '127.0.0.1',
  logFile: '/tmp/gateway-3333-operational.log'
};

const logStream = fs.createWriteStream(CONFIG.logFile, { flags: 'a' });
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [GW-3333] ${message}`);
  logStream.write(`[${timestamp}] [GW-3333] ${message}\n`);
}

let asteriskEndpoint = null;
let rtpState = { ssrc: null, seq: 0, timestamp: 0, payloadType: 8 };
let stats = { rxFromAsterisk: 0, txToSTTTS: 0, rxFromSTTTS: 0, txToAsterisk: 0 };

const fromAsteriskSocket = dgram.createSocket('udp4');
const toSTTTTSSocket = dgram.createSocket('udp4');
const fromSTTTTSSocket = dgram.createSocket('udp4');

// GStreamer: ALAW decode + upsample (8kHz → 16kHz)
const gstUpsampler = spawn('gst-launch-1.0', [
  '-q',
  'fdsrc', 'fd=0',
  '!', 'audio/x-alaw,rate=8000,channels=1',
  '!', 'alawdec',
  '!', 'audioconvert',
  '!', 'audioresample',
  '!', 'audio/x-raw,format=S16LE,rate=16000,channels=1',
  '!', 'fdsink', 'fd=1'
]);

// GStreamer: downsample + ALAW encode (16kHz → 8kHz)
const gstDownsampler = spawn('gst-launch-1.0', [
  '-q',
  'fdsrc', 'fd=0',
  '!', 'audio/x-raw,format=S16LE,rate=16000,channels=1',
  '!', 'audioconvert',
  '!', 'audioresample',
  '!', 'audio/x-raw,rate=8000,channels=1',
  '!', 'alawenc',
  '!', 'fdsink', 'fd=1'
]);

log('GStreamer pipelines started');

gstUpsampler.stdout.on('data', (pcm16k) => {
  toSTTTTSSocket.send(pcm16k, CONFIG.toSTTTTSPort, CONFIG.stttsHost);
  stats.txToSTTTS++;
});

gstDownsampler.stdout.on('data', (alawData) => {
  if (!asteriskEndpoint) return;
  
  const rtpHeader = Buffer.alloc(12);
  rtpHeader[0] = 0x80;
  rtpHeader[1] = rtpState.payloadType;
  rtpHeader.writeUInt16BE(rtpState.seq++, 2);
  rtpHeader.writeUInt32BE(rtpState.timestamp, 4);
  rtpState.timestamp += 160;
  rtpHeader.writeUInt32BE(rtpState.ssrc, 8);
  
  const rtpPacket = Buffer.concat([rtpHeader, alawData]);
  fromAsteriskSocket.send(rtpPacket, asteriskEndpoint.port, asteriskEndpoint.address);
  stats.txToAsterisk++;
});

fromAsteriskSocket.on('message', (msg, rinfo) => {
  stats.rxFromAsterisk++;
  
  if (!asteriskEndpoint) {
    asteriskEndpoint = { address: rinfo.address, port: rinfo.port };
    log(`Asterisk endpoint: ${rinfo.address}:${rinfo.port}`);
  }
  
  if (msg.length < 12) return;
  
  if (!rtpState.ssrc) {
    rtpState.ssrc = msg.readUInt32BE(8);
    rtpState.seq = msg.readUInt16BE(2) + 1;
    rtpState.timestamp = msg.readUInt32BE(4) + 160;
    log(`RTP session init: SSRC=${rtpState.ssrc}`);
  }
  
  const alawPayload = msg.slice(12);
  gstUpsampler.stdin.write(alawPayload);
});

fromSTTTTSSocket.on('message', (pcm16k, rinfo) => {
  stats.rxFromSTTTS++;
  gstDownsampler.stdin.write(pcm16k);
});

fromAsteriskSocket.bind(CONFIG.fromAsteriskPort, () => {
  log(`✓ Listening for Asterisk on UDP ${CONFIG.fromAsteriskPort}`);
});

fromSTTTTSSocket.bind(CONFIG.fromSTTTTSPort, () => {
  log(`✓ Listening for STTTTSserver on UDP ${CONFIG.fromSTTTTSPort}`);
});

setInterval(() => {
  log(`Stats: RX_Ast=${stats.rxFromAsterisk}, TX_STTTS=${stats.txToSTTTS}, RX_STTTS=${stats.rxFromSTTTS}, TX_Ast=${stats.txToAsterisk}`);
}, 10000);

log('='.repeat(80));
log('Gateway-3333 OPERATIONAL Ready');
log(`Asterisk (:4000 ALAW 8kHz) ←→ STTTTSserver (:6120/:6121 PCM 16kHz)`);
log('='.repeat(80));

process.on('SIGINT', () => {
  log('Shutting down...');
  gstUpsampler.kill();
  gstDownsampler.kill();
  process.exit(0);
});
