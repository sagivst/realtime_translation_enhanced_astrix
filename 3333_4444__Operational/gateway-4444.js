#!/usr/bin/env node
/**
 * Gateway-4444: Handle audio for Extension 4444
 * WITH ERROR HANDLING to prevent crashes
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
  console.log(`[${timestamp}] [GW-4444] ${message}`);
  logStream.write(`[${timestamp}] [GW-4444] ${message}\n`);
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

// ERROR HANDLERS for GStreamer processes
gstUpsampler.on('error', (err) => {
  log(`ERROR: Upsampler process error: ${err.message}`);
});

gstUpsampler.on('exit', (code, signal) => {
  log(`WARNING: Upsampler exited with code ${code}, signal ${signal}`);
});

gstDownsampler.on('error', (err) => {
  log(`ERROR: Downsampler process error: ${err.message}`);
});

gstDownsampler.on('exit', (code, signal) => {
  log(`WARNING: Downsampler exited with code ${code}, signal ${signal}`);
});

// ERROR HANDLERS for stdin/stdout
gstUpsampler.stdin.on('error', (err) => {
  log(`ERROR: Upsampler stdin error: ${err.message}`);
});

gstUpsampler.stdout.on('error', (err) => {
  log(`ERROR: Upsampler stdout error: ${err.message}`);
});

gstDownsampler.stdin.on('error', (err) => {
  log(`ERROR: Downsampler stdin error (EPIPE): ${err.message}`);
});

gstDownsampler.stdout.on('error', (err) => {
  log(`ERROR: Downsampler stdout error: ${err.message}`);
});

log('GStreamer pipelines started with error handling');

// Upsampler output → Send 16kHz PCM to STTTTSserver
gstUpsampler.stdout.on('data', (pcm16k) => {
  toSTTTTSSocket.send(pcm16k, CONFIG.toSTTTTSPort, CONFIG.stttsHost);
  stats.txToSTTTS++;
});

// Downsampler output → Send ALAW back to Asterisk as RTP
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

// Receive RTP from Asterisk (4444 mic audio)
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
  
  // SAFE WRITE with error checking
  try {
    if (gstUpsampler.stdin.writable) {
      gstUpsampler.stdin.write(alawPayload);
    } else {
      log('WARNING: Upsampler stdin not writable, skipping packet');
    }
  } catch (err) {
    log(`ERROR writing to upsampler: ${err.message}`);
  }
});

// Receive 16kHz PCM from STTTTSserver (processed audio for 4444 speaker)
fromSTTTTSSocket.on('message', (pcm16k, rinfo) => {
  stats.rxFromSTTTS++;
  
  // SAFE WRITE with error checking
  try {
    if (gstDownsampler.stdin.writable) {
      gstDownsampler.stdin.write(pcm16k);
    } else {
      log('WARNING: Downsampler stdin not writable, skipping packet');
    }
  } catch (err) {
    log(`ERROR writing to downsampler: ${err.message}`);
  }
});

// Bind sockets
fromAsteriskSocket.bind(CONFIG.fromAsteriskPort, () => {
  log(`✓ Listening for Asterisk on UDP ${CONFIG.fromAsteriskPort}`);
});

fromSTTTTSSocket.bind(CONFIG.fromSTTTTSPort, () => {
  log(`✓ Listening for STTTTSserver on UDP ${CONFIG.fromSTTTTSPort}`);
});

// Stats
setInterval(() => {
  log(`Stats: RX_Ast=${stats.rxFromAsterisk}, TX_STTTS=${stats.txToSTTTS}, RX_STTTS=${stats.rxFromSTTTS}, TX_Ast=${stats.txToAsterisk}`);
}, 10000);

log('='.repeat(80));
log('Gateway-4444 OPERATIONAL Ready with ERROR HANDLING');
log(`Asterisk (:4002 ALAW 8kHz) ←→ STTTTSserver (:6122/:6123 PCM 16kHz)`);
log('='.repeat(80));

// Cleanup
process.on('SIGINT', () => {
  log('Shutting down...');
  gstUpsampler.kill();
  gstDownsampler.kill();
  process.exit(0);
});
