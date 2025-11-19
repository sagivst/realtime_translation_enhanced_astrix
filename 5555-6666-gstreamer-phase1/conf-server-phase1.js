#!/usr/bin/env node
/**
 * Conference Server - PHASE 1
 * PCM Cross-Patch + Monitoring + MIC Monitoring
 *
 * Receives PCM from gateways 5555 and 6666, cross-patches audio, provides monitoring
 *
 * Port Configuration:
 * - FROM gateway-5555: UDP 6100 (receives PCM)
 * - TO gateway-5555: UDP 6101 (sends processed PCM)
 * - FROM gateway-6666: UDP 6102 (receives PCM)
 * - TO gateway-6666: UDP 6103 (sends processed PCM)
 * - WebSocket Monitoring: TCP 3010
 *
 * WebSocket Endpoints:
 * - /monitor/5555 - Monitors audio going TO 5555 (from 6666)
 * - /monitor/6666 - Monitors audio going TO 6666 (from 5555)
 * - /mic/5555 - Monitors RAW audio FROM 5555 microphone (before cross-patch)
 * - /mic/6666 - Monitors RAW audio FROM 6666 microphone (before cross-patch)
 */

const dgram = require('dgram');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  port5555In: 6100,
  port5555Out: 6101,
  port6666In: 6102,
  port6666Out: 6103,
  wsPort: 3010,
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
  from5555Packets: 0,
  to6666Packets: 0,
  from6666Packets: 0,
  to5555Packets: 0,
  wsConnections: 0,
  startTime: Date.now()
};

// UDP Sockets
const socket5555In = dgram.createSocket('udp4');
const socket5555Out = dgram.createSocket('udp4');
const socket6666In = dgram.createSocket('udp4');
const socket6666Out = dgram.createSocket('udp4');

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
          <p>WebSocket: ws://${req.headers.host}/monitor/5555</p>
          <p>WebSocket: ws://${req.headers.host}/monitor/6666</p>
          <p>WebSocket: ws://${req.headers.host}/mic/5555 (MIC)</p>
          <p>WebSocket: ws://${req.headers.host}/mic/6666 (MIC)</p>
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
  monitor5555: new Set(),
  monitor6666: new Set(),
  mic5555: new Set(),
  mic6666: new Set(),
  status: new Set()
};

wss.on('connection', (ws, req) => {
  const url = req.url;
  stats.wsConnections++;

  if (url === '/monitor/5555') {
    wsClients.monitor5555.add(ws);
    log(`WebSocket client connected to /monitor/5555 (total: ${wsClients.monitor5555.size})`);
    ws.on('close', () => {
      wsClients.monitor5555.delete(ws);
      log(`WebSocket client disconnected from /monitor/5555`);
    });
  } else if (url === '/monitor/6666') {
    wsClients.monitor6666.add(ws);
    log(`WebSocket client connected to /monitor/6666 (total: ${wsClients.monitor6666.size})`);
    ws.on('close', () => {
      wsClients.monitor6666.delete(ws);
      log(`WebSocket client disconnected from /monitor/6666`);
    });
  } else if (url === '/mic/5555') {
    wsClients.mic5555.add(ws);
    log(`WebSocket client connected to /mic/5555 (total: ${wsClients.mic5555.size})`);
    ws.on('close', () => {
      wsClients.mic5555.delete(ws);
      log(`WebSocket client disconnected from /mic/5555`);
    });
  } else if (url === '/mic/6666') {
    wsClients.mic6666.add(ws);
    log(`WebSocket client connected to /mic/6666 (total: ${wsClients.mic6666.size})`);
    ws.on('close', () => {
      wsClients.mic6666.delete(ws);
      log(`WebSocket client disconnected from /mic/6666`);
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
 * Receive PCM from gateway-5555, forward to gateway-6666
 */
socket5555In.on('message', (msg, rinfo) => {
  stats.from5555Packets++;

  if (stats.from5555Packets <= 5) {
    log(`Received from gateway-5555: ${msg.length} bytes (packet #${stats.from5555Packets})`);
  }

  // Broadcast to MIC monitoring clients (5555's own microphone)
  broadcastAudio(wsClients.mic5555, msg, '5555-MIC');

  // Cross-patch: send 5555's audio to 6666
  socket6666Out.send(msg, CONFIG.port6666Out, CONFIG.gatewayHost, (err) => {
    if (err) {
      log(`ERROR sending to gateway-6666: ${err.message}`);
    } else {
      stats.to6666Packets++;
    }
  });

  // Stream to monitoring clients (this is what 5555 HEARS from 6666)
  broadcastAudio(wsClients.monitor5555, msg, '5555');
});

socket5555In.on('listening', () => {
  const address = socket5555In.address();
  log(`Listening for gateway-5555 on ${address.address}:${address.port}`);
});

socket5555In.on('error', (err) => {
  log(`ERROR on socket5555In: ${err.message}`);
});

/**
 * Receive PCM from gateway-6666, forward to gateway-5555
 */
socket6666In.on('message', (msg, rinfo) => {
  stats.from6666Packets++;

  if (stats.from6666Packets <= 5) {
    log(`Received from gateway-6666: ${msg.length} bytes (packet #${stats.from6666Packets})`);
  }

  // Broadcast to MIC monitoring clients (6666's own microphone)
  broadcastAudio(wsClients.mic6666, msg, '6666-MIC');

  // Cross-patch: send 6666's audio to 5555
  socket5555Out.send(msg, CONFIG.port5555Out, CONFIG.gatewayHost, (err) => {
    if (err) {
      log(`ERROR sending to gateway-5555: ${err.message}`);
    } else {
      stats.to5555Packets++;
    }
  });

  // Stream to monitoring clients (this is what 6666 HEARS from 5555)
  broadcastAudio(wsClients.monitor6666, msg, '6666');
});

socket6666In.on('listening', () => {
  const address = socket6666In.address();
  log(`Listening for gateway-6666 on ${address.address}:${address.port}`);
});

socket6666In.on('error', (err) => {
  log(`ERROR on socket6666In: ${err.message}`);
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
  log(`[STATS] Uptime: ${uptime}s | From 5555: ${stats.from5555Packets} | To 6666: ${stats.to6666Packets} | From 6666: ${stats.from6666Packets} | To 5555: ${stats.to5555Packets} | WS: ${stats.wsConnections}`);
}

/**
 * Graceful Shutdown
 */
function shutdown() {
  log('Shutting down conf-server-phase1...');
  reportStats();
  socket5555In.close();
  socket5555Out.close();
  socket6666In.close();
  socket6666Out.close();
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
  log(`  From gateway-5555: UDP ${CONFIG.port5555In}`);
  log(`  To gateway-5555: UDP ${CONFIG.port5555Out}`);
  log(`  From gateway-6666: UDP ${CONFIG.port6666In}`);
  log(`  To gateway-6666: UDP ${CONFIG.port6666Out}`);
  log(`  WebSocket Server: TCP ${CONFIG.wsPort}`);
  log(`  Audio Format: slin16, ${CONFIG.sampleRate}Hz, ${CONFIG.channels} channel(s)`);
  log(`  Frame Size: ${CONFIG.frameSizeMs}ms (${CONFIG.frameSizeBytes} bytes)`);
  log('='.repeat(80));

  // Bind UDP sockets
  socket5555In.bind(CONFIG.port5555In);
  socket6666In.bind(CONFIG.port6666In);

  // Start HTTP/WebSocket server
  server.listen(CONFIG.wsPort, () => {
    log(`WebSocket server listening on port ${CONFIG.wsPort}`);
    log(`Monitoring URLs:`);
    log(`  - http://localhost:${CONFIG.wsPort}/`);
    log(`  - ws://localhost:${CONFIG.wsPort}/monitor/5555 (what 5555 HEARS)`);
    log(`  - ws://localhost:${CONFIG.wsPort}/monitor/6666 (what 6666 HEARS)`);
    log(`  - ws://localhost:${CONFIG.wsPort}/mic/5555 (what 5555 SAYS)`);
    log(`  - ws://localhost:${CONFIG.wsPort}/mic/6666 (what 6666 SAYS)`);
    log(`  - http://localhost:${CONFIG.wsPort}/status`);
  });

  // Stats every 30 seconds
  setInterval(reportStats, 30000);

  log('Conference Server initialized and ready');
}

// Start
init();
