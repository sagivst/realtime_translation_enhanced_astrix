#!/usr/bin/env node
/**
 * STTTTSserver.js - Simple Cross-Patch Server for 3333 ↔ 4444
 * 
 * CROSS-PATCH ROUTING (per documentation):
 * 3333 mic (16kHz PCM) → UDP 6100 → crosses to → UDP 6103 → 4444 speaker
 * 4444 mic (16kHz PCM) → UDP 6102 → crosses to → UDP 6101 → 3333 speaker
 * 
 * This is PHASE 1: Simple passthrough (no AI yet)
 * PHASE 2: Will add STT → Translation → TTS pipeline
 */

const dgram = require('dgram');
const fs = require('fs');

const CONFIG = {
  // Receive ports
  from3333Port: 6100,    // Receive 16kHz PCM from Gateway-3333
  from4444Port: 6102,    // Receive 16kHz PCM from Gateway-4444
  // Send ports  
  to3333Port: 6101,      // Send 16kHz PCM to Gateway-3333
  to4444Port: 6103,      // Send 16kHz PCM to Gateway-4444
  host: '127.0.0.1',
  logFile: '/tmp/STTTSserver-operational.log'
};

const logStream = fs.createWriteStream(CONFIG.logFile, { flags: 'a' });
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [STTTSserver] ${message}`);
  logStream.write(`[${timestamp}] [STTTSserver] ${message}\n`);
}

let stats = {
  rx3333: 0,
  rx4444: 0,
  tx3333: 0,
  tx4444: 0,
  startTime: Date.now()
};

// Create UDP sockets
const from3333Socket = dgram.createSocket('udp4');
const from4444Socket = dgram.createSocket('udp4');
const to3333Socket = dgram.createSocket('udp4');
const to4444Socket = dgram.createSocket('udp4');

// Receive from 3333 mic → Forward to 4444 speaker
from3333Socket.on('message', (pcm16k, rinfo) => {
  stats.rx3333++;
  
  // Cross-patch: 3333 → 4444
  to4444Socket.send(pcm16k, CONFIG.to4444Port, CONFIG.host);
  stats.tx4444++;
  
  if (stats.rx3333 % 100 === 0) {
    log(`3333→4444: ${stats.rx3333} packets received, ${stats.tx4444} forwarded`);
  }
});

// Receive from 4444 mic → Forward to 3333 speaker  
from4444Socket.on('message', (pcm16k, rinfo) => {
  stats.rx4444++;
  
  // Cross-patch: 4444 → 3333
  to3333Socket.send(pcm16k, CONFIG.to3333Port, CONFIG.host);
  stats.tx3333++;
  
  if (stats.rx4444 % 100 === 0) {
    log(`4444→3333: ${stats.rx4444} packets received, ${stats.tx3333} forwarded`);
  }
});

// Bind receive sockets
from3333Socket.bind(CONFIG.from3333Port, () => {
  log(`Listening for 3333 mic on UDP ${CONFIG.from3333Port}`);
});

from4444Socket.bind(CONFIG.from4444Port, () => {
  log(`Listening for 4444 mic on UDP ${CONFIG.from4444Port}`);
});

// Stats every 30 seconds
setInterval(() => {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  log('='.repeat(60));
  log(`Uptime: ${uptime}s`);
  log(`3333→4444: RX=${stats.rx3333}, TX=${stats.tx4444}`);
  log(`4444→3333: RX=${stats.rx4444}, TX=${stats.tx3333}`);
  log('='.repeat(60));
}, 30000);

log('='.repeat(80));
log('STTTTSserver OPERATIONAL Started - PHASE 1: Simple Cross-Patch');
log('='.repeat(80));
log(`3333 mic (:6100) → crosses to → 4444 speaker (:6103)`);
log(`4444 mic (:6102) → crosses to → 3333 speaker (:6101)`);
log('='.repeat(80));

// Cleanup
process.on('SIGINT', () => {
  log('Shutting down STTTTSserver...');
  from3333Socket.close();
  from4444Socket.close();
  to3333Socket.close();
  to4444Socket.close();
  logStream.end();
  process.exit(0);
});
