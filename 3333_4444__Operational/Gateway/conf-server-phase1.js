#!/usr/bin/env node
/**
 * Conference Server - PHASE 1
 * PCM Cross-Patch + Monitoring + MIC Monitoring
 *
 * Receives PCM from gateways 3333 and 4444, cross-patches audio, provides monitoring
 *
 * Port Configuration:
 * - FROM gateway-3333: UDP 6100 (receives PCM)
 * - TO gateway-3333: UDP 6101 (sends processed PCM)
 * - FROM gateway-4444: UDP 6102 (receives PCM)
 * - TO gateway-4444: UDP 6103 (sends processed PCM)
 * - WebSocket Monitoring: TCP 3010
 *
 * WebSocket Endpoints:
 * - /monitor/3333 - Monitors audio going TO 3333 (from 4444)
 * - /monitor/4444 - Monitors audio going TO 4444 (from 3333)
 * - /mic/3333 - Monitors RAW audio FROM 3333 microphone (before cross-patch)
 * - /mic/4444 - Monitors RAW audio FROM 4444 microphone (before cross-patch)
 */

const dgram = require('dgram');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  port3333In: 6120,
  port3333Out: 6121,
  port4444In: 6122,
  port4444Out: 6123,
  wsPort: 3020,
  gatewayHost: '127.0.0.1',
  sampleRate: 16000,
  channels: 1,
  frameSizeMs: 20,
  frameSizeBytes: 640,
  logFile: '/tmp/conf-server-phase1.log'
};

// Logging
const logStream = fs.createWriteStream(CONFIG.logFile, { flags: 'a' });
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [ConfServer] ${message}\n`;
  console.log(logMessage.trim());
  logStream.write(logMessage);
}

// Statistics
let stats = {
  from3333Packets: 0,
  to4444Packets: 0,
  from4444Packets: 0,
  to3333Packets: 0,
  wsConnections: 0,
  startTime: Date.now()
};

// UDP Sockets
const socket3333In = dgram.createSocket('udp4');
const socket3333Out = dgram.createSocket('udp4');
const socket4444In = dgram.createSocket('udp4');
const socket4444Out = dgram.createSocket('udp4');

// WebSocket Monitoring
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    // Serve monitoring dashboard
    const htmlPath = path.join(__dirname, 'public', 'monitoring-dashboard.html');
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(htmlPath).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>PHASE 1 Monitoring</title></head>
        <body>
          <h1>PHASE 1 - PCM Cross-Patch Monitoring</h1>
          <p>WebSocket: ws://${req.headers.host}/monitor/3333</p>
          <p>WebSocket: ws://${req.headers.host}/monitor/4444</p>
          <p>WebSocket: ws://${req.headers.host}/mic/3333 (MIC)</p>
          <p>WebSocket: ws://${req.headers.host}/mic/4444 (MIC)</p>
          <p>Status: WebSocket server running on port ${CONFIG.wsPort}</p>
          <p>Monitoring dashboard not yet deployed. Use WebSocket URLs above.</p>
        </body>
        </html>
      `);
    }
  } else if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      uptime: Math.floor((Date.now() - stats.startTime) / 1000),
      stats: stats,
      config: CONFIG
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const wss = new WebSocket.Server({ server });

// WebSocket clients tracking
const wsClients = {
  monitor3333: new Set(),
  monitor4444: new Set(),
  mic3333: new Set(),
  mic4444: new Set(),
  status: new Set()
};

wss.on('connection', (ws, req) => {
  const url = req.url;
  stats.wsConnections++;

  if (url === '/monitor/3333') {
    wsClients.monitor3333.add(ws);
    log(`WebSocket client connected to /monitor/3333 (total: ${wsClients.monitor3333.size})`);
    ws.on('close', () => {
      wsClients.monitor3333.delete(ws);
      log(`WebSocket client disconnected from /monitor/3333`);
    });
  } else if (url === '/monitor/4444') {
    wsClients.monitor4444.add(ws);
    log(`WebSocket client connected to /monitor/4444 (total: ${wsClients.monitor4444.size})`);
    ws.on('close', () => {
      wsClients.monitor4444.delete(ws);
      log(`WebSocket client disconnected from /monitor/4444`);
    });
  } else if (url === '/mic/3333') {
    wsClients.mic3333.add(ws);
    log(`WebSocket client connected to /mic/3333 (total: ${wsClients.mic3333.size})`);
    ws.on('close', () => {
      wsClients.mic3333.delete(ws);
      log(`WebSocket client disconnected from /mic/3333`);
    });
  } else if (url === '/mic/4444') {
    wsClients.mic4444.add(ws);
    log(`WebSocket client connected to /mic/4444 (total: ${wsClients.mic4444.size})`);
    ws.on('close', () => {
      wsClients.mic4444.delete(ws);
      log(`WebSocket client disconnected from /mic/4444`);
    });
  } else if (url === '/status') {
    wsClients.status.add(ws);
    log(`WebSocket client connected to /status`);
    ws.on('close', () => wsClients.status.delete(ws));

    // Send status updates every second
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'status',
          timestamp: Date.now(),
          stats: stats,
          uptime: Math.floor((Date.now() - stats.startTime) / 1000)
        }));
      } else {
        clearInterval(interval);
      }
    }, 1000);
  }
});

/**
 * Receive PCM from gateway-3333, forward to gateway-4444
 */
socket3333In.on('message', (msg, rinfo) => {
  stats.from3333Packets++;

  if (stats.from3333Packets <= 5) {
    log(`Received from gateway-3333: ${msg.length} bytes (packet #${stats.from3333Packets})`);
  }

  // Broadcast to MIC monitoring clients (3333's own microphone)
  broadcastAudio(wsClients.mic3333, msg, '3333-MIC');

  // Cross-patch: send 3333's audio to 4444
  socket4444Out.send(msg, CONFIG.port4444Out, CONFIG.gatewayHost, (err) => {
    if (err) {
      log(`ERROR sending to gateway-4444: ${err.message}`);
    } else {
      stats.to4444Packets++;
    }
  });

  // Stream to monitoring clients (this is what 3333 HEARS from 4444)
  broadcastAudio(wsClients.monitor3333, msg, '3333');
});

socket3333In.on('listening', () => {
  const address = socket3333In.address();
  log(`Listening for gateway-3333 on ${address.address}:${address.port}`);
});

socket3333In.on('error', (err) => {
  log(`ERROR on socket3333In: ${err.message}`);
});

/**
 * Receive PCM from gateway-4444, forward to gateway-3333
 */
socket4444In.on('message', (msg, rinfo) => {
  stats.from4444Packets++;

  if (stats.from4444Packets <= 5) {
    log(`Received from gateway-4444: ${msg.length} bytes (packet #${stats.from4444Packets})`);
  }

  // Broadcast to MIC monitoring clients (4444's own microphone)
  broadcastAudio(wsClients.mic4444, msg, '4444-MIC');

  // Cross-patch: send 4444's audio to 3333
  socket3333Out.send(msg, CONFIG.port3333Out, CONFIG.gatewayHost, (err) => {
    if (err) {
      log(`ERROR sending to gateway-3333: ${err.message}`);
    } else {
      stats.to3333Packets++;
    }
  });

  // Stream to monitoring clients (this is what 4444 HEARS from 3333)
  broadcastAudio(wsClients.monitor4444, msg, '4444');
});

socket4444In.on('listening', () => {
  const address = socket4444In.address();
  log(`Listening for gateway-4444 on ${address.address}:${address.port}`);
});

socket4444In.on('error', (err) => {
  log(`ERROR on socket4444In: ${err.message}`);
});

/**
 * Broadcast PCM audio to WebSocket monitoring clients
 */
function broadcastAudio(clients, pcmBuffer, extension) {
  if (clients.size === 0) return;

  // Convert S16LE to Float32 for browser AudioContext
  const float32Array = new Float32Array(pcmBuffer.length / 2);
  for (let i = 0; i < float32Array.length; i++) {
    const int16 = pcmBuffer.readInt16LE(i * 2);
    float32Array[i] = int16 / 32768.0; // Convert to -1.0 to 1.0
  }

  const message = JSON.stringify({
    type: 'audio',
    extension: extension,
    timestamp: Date.now(),
    pcm: Array.from(float32Array),
    frameSize: float32Array.length,
    sampleRate: CONFIG.sampleRate
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Stats Reporter
 */
function reportStats() {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  log(`[STATS] Uptime: ${uptime}s | From 3333: ${stats.from3333Packets} | To 4444: ${stats.to4444Packets} | From 4444: ${stats.from4444Packets} | To 3333: ${stats.to3333Packets} | WS: ${stats.wsConnections}`);
}

/**
 * Graceful Shutdown
 */
function shutdown() {
  log('Shutting down conf-server-phase1...');
  reportStats();
  socket3333In.close();
  socket3333Out.close();
  socket4444In.close();
  socket4444Out.close();
  server.close();
  wss.close();
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
  log('Conference Server - PHASE 1 PCM Cross-Patch + Monitoring + MIC Monitoring');
  log('='.repeat(80));
  log(`Configuration:`);
  log(`  From gateway-3333: UDP ${CONFIG.port3333In}`);
  log(`  To gateway-3333: UDP ${CONFIG.port3333Out}`);
  log(`  From gateway-4444: UDP ${CONFIG.port4444In}`);
  log(`  To gateway-4444: UDP ${CONFIG.port4444Out}`);
  log(`  WebSocket Server: TCP ${CONFIG.wsPort}`);
  log(`  Audio Format: slin16, ${CONFIG.sampleRate}Hz, ${CONFIG.channels} channel(s)`);
  log(`  Frame Size: ${CONFIG.frameSizeMs}ms (${CONFIG.frameSizeBytes} bytes)`);
  log('='.repeat(80));

  // Bind UDP sockets
  socket3333In.bind(CONFIG.port3333In);
  socket4444In.bind(CONFIG.port4444In);

  // Start HTTP/WebSocket server
  server.listen(CONFIG.wsPort, () => {
    log(`WebSocket server listening on port ${CONFIG.wsPort}`);
    log(`Monitoring URLs:`);
    log(`  - http://localhost:${CONFIG.wsPort}/`);
    log(`  - ws://localhost:${CONFIG.wsPort}/monitor/3333 (what 3333 HEARS)`);
    log(`  - ws://localhost:${CONFIG.wsPort}/monitor/4444 (what 4444 HEARS)`);
    log(`  - ws://localhost:${CONFIG.wsPort}/mic/3333 (what 3333 SAYS)`);
    log(`  - ws://localhost:${CONFIG.wsPort}/mic/4444 (what 4444 SAYS)`);
    log(`  - http://localhost:${CONFIG.wsPort}/status`);
  });

  // Stats every 30 seconds
  setInterval(reportStats, 30000);

  log('Conference Server initialized and ready');
}

// Start
init();
