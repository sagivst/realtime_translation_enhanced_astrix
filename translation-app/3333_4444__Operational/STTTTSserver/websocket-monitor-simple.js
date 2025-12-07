/**
 * Simple WebSocket Monitor - NO ARI VERSION
 *
 * Purpose: Monitor WebSocket audio traffic between Gateway and Conference Server
 *
 * Architecture:
 *   Conference Server (port 3002) ← WebSocket → Gateway
 *     ↓ Monitor
 *   This Monitor ← WebSocket → Browser (port 8080)
 */

const http = require('http');
const socketIO = require('socket.io');
const socketIOClient = require('socket.io-client');

// ============================================================================
// CONFIGURATION
// ============================================================================

// Monitor will listen on port 3002 (publicly accessible)
// Gateway will connect to this instead of Conference Server
const MONITOR_PORT = 3002;

// ============================================================================
// GLOBAL STATE
// ============================================================================

let monitorIO = null;  // WebSocket server for browser clients AND Gateway
let connectedBrowsers = 0;
let connectedGateways = 0;

// Statistics
const stats = {
  '9007': { packetsReceived: 0, bytesReceived: 0, lastActivity: null },
  '9008': { packetsReceived: 0, bytesReceived: 0, lastActivity: null }
};

// ============================================================================
// GATEWAY & BROWSER CONNECTION HANDLING
// ============================================================================
// No need to connect to Conference Server - we ARE the server now!
// Gateway will connect to us, and we'll monitor what it sends

// ============================================================================
// BROWSER WEBSOCKET SERVER
// ============================================================================

function setupMonitorWebSocketServer() {
  const httpServer = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        connectedClients: monitorIO ? monitorIO.engine.clientsCount : 0,
        stats
      }));
    } else if (req.url === '/stats') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats, null, 2));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  monitorIO = socketIO(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  monitorIO.on('connection', (socket) => {
    console.log(`[Client] ✅ Client connected: ${socket.id}`);

    // Send initial status
    socket.emit('status', {
      message: 'Connected to WebSocket Monitor',
      conferenceServerConnected: true, // We are the server now
      stats
    });

    socket.on('disconnect', () => {
      console.log(`[Client] ❌ Client disconnected: ${socket.id}`);
    });

    // Handle audio data from Gateway
    socket.on('audioData', (data) => {
      const { extension, audio, timestamp } = data;

      if (!extension) return;

      // Update statistics
      if (stats[extension]) {
        stats[extension].packetsReceived++;
        stats[extension].bytesReceived += (audio ? audio.length : 0);
        stats[extension].lastActivity = Date.now();
      }

      // Log every 50 packets
      if (stats[extension] && stats[extension].packetsReceived % 50 === 0) {
        console.log(`[Audio] [${extension}] Received ${stats[extension].packetsReceived} packets, ${(stats[extension].bytesReceived / 1024).toFixed(2)} KB`);
      }

      // Forward to ALL browser clients (broadcast)
      socket.broadcast.emit('audio-data', {
        extension,
        audio: audio ? audio.toString('base64') : null,
        length: audio ? audio.length : 0,
        timestamp: timestamp || Date.now(),
        direction: 'gateway-to-monitor'
      });
    });

    // Handle translated audio
    socket.on('translatedAudio', (data) => {
      const { extension, audio, timestamp } = data;

      if (!extension) return;

      console.log(`[TranslatedAudio] [${extension}] Received ${audio ? audio.length : 0} bytes`);

      // Broadcast to browser clients
      socket.broadcast.emit('audio-data', {
        extension,
        audio: audio ? audio.toString('base64') : null,
        length: audio ? audio.length : 0,
        timestamp: timestamp || Date.now(),
        direction: 'monitor-to-gateway'
      });
    });

    socket.on('request-stats', () => {
      socket.emit('stats', stats);
    });
  });

  httpServer.listen(MONITOR_PORT, () => {
    console.log(`[Monitor] ✅ WebSocket server listening on port ${MONITOR_PORT}`);
    console.log(`[Monitor] Health check: http://localhost:${MONITOR_PORT}/health`);
    console.log(`[Monitor] Stats: http://localhost:${MONITOR_PORT}/stats`);
  });
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('='.repeat(80));
  console.log('WEBSOCKET AUDIO MONITOR - STANDALONE VERSION');
  console.log('='.repeat(80));
  console.log('Purpose: Monitor WebSocket audio traffic from Gateway');
  console.log('');
  console.log('Architecture:');
  console.log('  Gateway → WebSocket → Monitor (port 3002)');
  console.log('  Browser → WebSocket → Monitor (port 3002)');
  console.log('  Monitor broadcasts Gateway traffic to Browser');
  console.log('='.repeat(80));
  console.log('');

  // Setup monitor WebSocket server
  setupMonitorWebSocketServer();
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('');
  console.log('='.repeat(80));
  console.log('✅ MONITOR READY');
  console.log('='.repeat(80));
  console.log(`Monitor Server: http://localhost:${MONITOR_PORT}`);
  console.log(`Public URL: http://20.170.155.53:${MONITOR_PORT}`);
  console.log('');
  console.log('Next Steps:');
  console.log('1. Open audio-monitor-simple.html in browser');
  console.log('2. Gateway will connect and send audio data');
  console.log('3. Browser will see the traffic in real-time');
  console.log('='.repeat(80));

  // Stats reporter
  setInterval(() => {
    const clientCount = monitorIO ? monitorIO.engine.clientsCount : 0;
    if (clientCount > 0) {
      const summary = {
        clients: clientCount,
        '9007': `${stats['9007'].packetsReceived} packets (${(stats['9007'].bytesReceived / 1024).toFixed(2)} KB)`,
        '9008': `${stats['9008'].packetsReceived} packets (${(stats['9008'].bytesReceived / 1024).toFixed(2)} KB)`
      };
      console.log('[Stats]', summary);
    }
  }, 10000);
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('[FATAL] Unhandled rejection:', err);
});

process.on('SIGINT', () => {
  console.log('\n[Shutdown] Received SIGINT, cleaning up...');

  if (conferenceSocket) {
    conferenceSocket.disconnect();
  }

  if (monitorIO) {
    monitorIO.close();
  }

  process.exit(0);
});

// Start
main().catch(err => {
  console.error('[FATAL] Startup error:', err);
  process.exit(1);
});
