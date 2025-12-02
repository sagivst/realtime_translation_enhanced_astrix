/**
 * Simple Audio Monitoring Gateway - TEST VERSION
 *
 * Purpose: Validate audio path before adding translation processing
 *
 * Architecture:
 *   Asterisk ExternalMedia (7777/8888)
 *     ↓ UDP RTP (PT=118, 640 bytes, 16kHz PCM16)
 *   Gateway (this file)
 *     ↓ WebSocket (Socket.IO)
 *   Web Page (monitor.html)
 *     → Browser Audio Playback
 */

const AriClient = require('ari-client');
const dgram = require('dgram');
const http = require('http');
const socketIO = require('socket.io');

// ============================================================================
// CONFIGURATION
// ============================================================================

const ARI_CONFIG = {
  url: process.env.ARI_URL || 'http://localhost:8088',
  username: process.env.ARI_USERNAME || 'asterisk',
  password: process.env.ARI_PASSWORD || 'asterisk',
  app: 'translation-app'
};

const EXTERNAL_MEDIA_CONFIG = {
  '7777': {
    extension: '7777',
    language: 'en',
    description: 'English Channel',
    udpPort: 5000,
    externalHost: '20.170.155.53:5000',
    format: 'slin16'
  },
  '8888': {
    extension: '8888',
    language: 'fr',
    description: 'French Channel',
    udpPort: 5001,
    externalHost: '20.170.155.53:5001',
    format: 'slin16'
  }
};

const WEBSOCKET_PORT = 8080;

// ============================================================================
// GLOBAL STATE
// ============================================================================

let ariClient = null;
let externalMediaChannels = {};
let udpSockets = {};
let io = null;
let connectedClients = 0;

// Statistics
const stats = {
  '7777': { packetsReceived: 0, bytesReceived: 0 },
  '8888': { packetsReceived: 0, bytesReceived: 0 }
};

// ============================================================================
// RTP FUNCTIONS
// ============================================================================

/**
 * Extract audio payload from RTP packet
 * RTP Header: 12 bytes
 * @param {Buffer} rtpPacket - Complete RTP packet
 * @returns {Buffer} - Audio payload (PCM16)
 */
function extractRTPPayload(rtpPacket) {
  if (rtpPacket.length < 12) {
    return null;
  }
  return rtpPacket.slice(12);
}

/**
 * Parse RTP header for debugging
 * @param {Buffer} rtpPacket - RTP packet
 * @returns {Object} - Parsed header fields
 */
function parseRTPHeader(rtpPacket) {
  if (rtpPacket.length < 12) return null;

  const version = (rtpPacket[0] >> 6) & 0x03;
  const padding = (rtpPacket[0] >> 5) & 0x01;
  const extension = (rtpPacket[0] >> 4) & 0x01;
  const csrcCount = rtpPacket[0] & 0x0F;
  const marker = (rtpPacket[1] >> 7) & 0x01;
  const payloadType = rtpPacket[1] & 0x7F;
  const sequenceNumber = rtpPacket.readUInt16BE(2);
  const timestamp = rtpPacket.readUInt32BE(4);
  const ssrc = rtpPacket.readUInt32BE(8);

  return {
    version,
    padding,
    extension,
    csrcCount,
    marker,
    payloadType,
    sequenceNumber,
    timestamp,
    ssrc
  };
}

// ============================================================================
// UDP SOCKET SETUP
// ============================================================================

/**
 * Create UDP socket to receive RTP from Asterisk
 * @param {string} extension - Extension number (7777/8888)
 */
function setupUDPSocket(extension) {
  const config = EXTERNAL_MEDIA_CONFIG[extension];
  if (!config) {
    console.error(`[UDP] No config for extension ${extension}`);
    return;
  }

  const socket = dgram.createSocket('udp4');

  socket.on('error', (err) => {
    console.error(`[UDP] Socket error for ext ${extension}:`, err.message);
    socket.close();
  });

  socket.on('message', (msg, rinfo) => {
    // Update statistics
    stats[extension].packetsReceived++;
    stats[extension].bytesReceived += msg.length;

    // Log every 100 packets
    if (stats[extension].packetsReceived % 100 === 0) {
      console.log(`[UDP] [${extension}] Received ${stats[extension].packetsReceived} packets, ${stats[extension].bytesReceived} bytes`);
    }

    // Extract RTP payload
    const payload = extractRTPPayload(msg);
    if (!payload || payload.length === 0) {
      return;
    }

    // Forward to WebSocket clients
    if (io && connectedClients > 0) {
      io.emit('audio-data', {
        extension: extension,
        language: config.language,
        description: config.description,
        audio: payload.toString('base64'), // Base64 encode for WebSocket
        length: payload.length,
        timestamp: Date.now()
      });
    }
  });

  socket.on('listening', () => {
    const address = socket.address();
    console.log(`[UDP] ✅ Listening on ${address.address}:${address.port} for ext ${extension} (${config.description})`);
  });

  socket.bind(config.udpPort);
  udpSockets[extension] = socket;
}

// ============================================================================
// WEBSOCKET SERVER SETUP
// ============================================================================

/**
 * Setup WebSocket server for browser clients
 */
function setupWebSocketServer() {
  const httpServer = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        connectedClients,
        stats
      }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  io = socketIO(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    connectedClients++;
    console.log(`[WebSocket] ✅ Client connected (total: ${connectedClients})`);

    // Send initial status
    socket.emit('status', {
      message: 'Connected to Audio Monitor Gateway',
      extensions: EXTERNAL_MEDIA_CONFIG,
      stats
    });

    socket.on('disconnect', () => {
      connectedClients--;
      console.log(`[WebSocket] ❌ Client disconnected (total: ${connectedClients})`);
    });

    socket.on('request-stats', () => {
      socket.emit('stats', stats);
    });
  });

  httpServer.listen(WEBSOCKET_PORT, () => {
    console.log(`[WebSocket] ✅ Server listening on port ${WEBSOCKET_PORT}`);
    console.log(`[WebSocket] Health check: http://localhost:${WEBSOCKET_PORT}/health`);
  });
}

// ============================================================================
// ASTERISK ARI SETUP
// ============================================================================

/**
 * Create ExternalMedia channel for an extension
 * @param {string} extension - Extension number
 */
async function createExternalMediaChannel(extension) {
  const config = EXTERNAL_MEDIA_CONFIG[extension];
  if (!config) {
    console.error(`[ExternalMedia] No config for extension ${extension}`);
    return;
  }

  try {
    console.log(`[ExternalMedia] Creating channel for ext ${extension} (${config.description})...`);

    const channel = await ariClient.channels.externalMedia({
      app: ARI_CONFIG.app,
      external_host: config.externalHost,
      format: config.format,
      encapsulation: 'rtp',
      transport: 'udp',
      connection_type: 'client',
      direction: 'both',
      data: JSON.stringify({ extension, language: config.language })
    });

    externalMediaChannels[extension] = channel;

    console.log(`[ExternalMedia] ✅ Channel created: ${channel.id} for ext ${extension}`);

    // Answer the channel
    await channel.answer();
    console.log(`[ExternalMedia] ✅ Channel answered for ext ${extension}`);

    // Setup event handlers
    channel.on('StasisEnd', () => {
      console.log(`[ExternalMedia] Channel ended for ext ${extension}`);
      delete externalMediaChannels[extension];
    });

    channel.on('ChannelDestroyed', () => {
      console.log(`[ExternalMedia] Channel destroyed for ext ${extension}`);
      delete externalMediaChannels[extension];
    });

  } catch (error) {
    console.error(`[ExternalMedia] ❌ Failed to create channel for ext ${extension}:`, error.message);
  }
}

/**
 * Connect to Asterisk ARI
 */
async function connectARI() {
  try {
    console.log('[ARI] Connecting to Asterisk ARI...');
    console.log(`[ARI] URL: ${ARI_CONFIG.url}`);
    console.log(`[ARI] App: ${ARI_CONFIG.app}`);

    ariClient = await AriClient.connect(
      ARI_CONFIG.url,
      ARI_CONFIG.username,
      ARI_CONFIG.password
    );

    console.log('[ARI] ✅ Connected to Asterisk ARI');

    // Handle incoming calls
    ariClient.on('StasisStart', async (event, channel) => {
      console.log(`[ARI] StasisStart: ${channel.name} (${channel.id})`);
    });

    // Start the application
    ariClient.start(ARI_CONFIG.app);
    console.log(`[ARI] ✅ Application '${ARI_CONFIG.app}' started`);

  } catch (error) {
    console.error('[ARI] ❌ Failed to connect:', error.message);
    process.exit(1);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('='.repeat(80));
  console.log('AUDIO MONITORING GATEWAY - TEST VERSION');
  console.log('='.repeat(80));
  console.log('Purpose: Validate audio path before adding translation processing');
  console.log('');
  console.log('Architecture:');
  console.log('  Asterisk ExternalMedia (7777/8888)');
  console.log('    ↓ UDP RTP');
  console.log('  Gateway (this)');
  console.log('    ↓ WebSocket');
  console.log('  Browser (monitor.html)');
  console.log('='.repeat(80));
  console.log('');

  // 1. Setup WebSocket server first
  setupWebSocketServer();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 2. Setup UDP sockets
  setupUDPSocket('7777');
  setupUDPSocket('8888');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 3. Connect to ARI
  await connectARI();
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 4. Create ExternalMedia channels
  await createExternalMediaChannel('7777');
  await new Promise(resolve => setTimeout(resolve, 1000));
  await createExternalMediaChannel('8888');

  console.log('');
  console.log('='.repeat(80));
  console.log('✅ GATEWAY READY');
  console.log('='.repeat(80));
  console.log(`WebSocket Server: http://localhost:${WEBSOCKET_PORT}`);
  console.log(`Health Check: http://localhost:${WEBSOCKET_PORT}/health`);
  console.log('');
  console.log('Next Step: Open monitor.html in browser to hear audio');
  console.log('='.repeat(80));

  // Stats reporter
  setInterval(() => {
    if (connectedClients > 0) {
      console.log('[Stats]', JSON.stringify(stats));
    }
  }, 10000);
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('[FATAL] Unhandled rejection:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n[Shutdown] Received SIGINT, cleaning up...');

  // Close UDP sockets
  Object.values(udpSockets).forEach(socket => socket.close());

  // Close WebSocket server
  if (io) {
    io.close();
  }

  process.exit(0);
});

// Start
main().catch(err => {
  console.error('[FATAL] Startup error:', err);
  process.exit(1);
});
