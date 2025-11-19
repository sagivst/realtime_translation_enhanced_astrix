/**
 * Unified Gateway with Simple Passthrough - TEST VERSION
 *
 * Purpose: Test complete unified gateway infrastructure with simple audio passthrough (NO translation)
 *
 * Architecture:
 *   Phone 1001 → Asterisk → ExternalMedia 7777 → Unified Gateway
 *                                                   ↕ (simple passthrough, no translation)
 *   Phone 1002 → Asterisk → ExternalMedia 8888 → Unified Gateway
 *                                                   ↓ WebSocket (port 3002)
 *                                               Web Browser (listen to audio)
 *
 * What This Tests:
 *   ✅ RTP Reception from Asterisk ExternalMedia (7777/8888)
 *   ✅ RTP Transmission back to Asterisk ExternalMedia
 *   ✅ Audio Routing: Connect 7777 ↔ 8888 inside gateway (simple passthrough)
 *   ✅ WebSocket Server: Direct browser connections (NO conference server)
 *   ✅ Browser Playback: Real-time audio in web page
 *   ✅ Complete Infrastructure: All components except translation logic
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
  username: process.env.ARI_USERNAME || 'dev',
  password: process.env.ARI_PASSWORD || 'asterisk',
  app: 'translation-test'
};

const EXTERNAL_MEDIA_CONFIG = {
  '7777': {
    extension: '7777',
    language: 'en',
    description: 'English Channel',
    udpPort: 5000,
    externalHost: '127.0.0.1:5000',  // Asterisk sends RTP to localhost
    format: 'slin16',
    // For sending RTP back to Asterisk
    remoteHost: '127.0.0.1',
    remotePort: 5000
  },
  '8888': {
    extension: '8888',
    language: 'fr',
    description: 'French Channel',
    udpPort: 5001,
    externalHost: '127.0.0.1:5001',  // Asterisk sends RTP to localhost
    format: 'slin16',
    // For sending RTP back to Asterisk
    remoteHost: '127.0.0.1',
    remotePort: 5001
  }
};

const WEBSOCKET_PORT = 3002;

// ============================================================================
// GLOBAL STATE
// ============================================================================

let ariClient = null;
let externalMediaChannels = {};
let udpSockets = {};
let io = null;
let connectedClients = 0;

// Track remote RTP address/port for each extension
let remoteRTPAddress = {
  '7777': null,
  '8888': null
};

// RTP sequence numbers for each channel
let rtpSequence = {
  '7777': 0,
  '8888': 0
};

// RTP timestamps for each channel
let rtpTimestamp = {
  '7777': 0,
  '8888': 0
};

// Statistics
const stats = {
  '7777': { packetsReceived: 0, bytesReceived: 0, packetsSent: 0, bytesSent: 0 },
  '8888': { packetsReceived: 0, bytesReceived: 0, packetsSent: 0, bytesSent: 0 }
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
 * Create RTP packet from audio payload
 * @param {Buffer} audioPayload - PCM16 audio data
 * @param {string} extension - Extension number (7777/8888)
 * @returns {Buffer} - Complete RTP packet
 */
function createRTPPacket(audioPayload, extension) {
  const header = Buffer.alloc(12);

  // Byte 0: Version (2), Padding (0), Extension (0), CSRC count (0)
  header[0] = 0x80; // Version 2

  // Byte 1: Marker (0), Payload Type (118 for slin16)
  header[1] = 118;

  // Bytes 2-3: Sequence number
  header.writeUInt16BE(rtpSequence[extension], 2);
  rtpSequence[extension] = (rtpSequence[extension] + 1) & 0xFFFF;

  // Bytes 4-7: Timestamp
  header.writeUInt32BE(rtpTimestamp[extension], 4);
  rtpTimestamp[extension] += audioPayload.length / 2; // 16-bit samples

  // Bytes 8-11: SSRC (use extension number as identifier)
  const ssrc = parseInt(extension);
  header.writeUInt32BE(ssrc, 8);

  return Buffer.concat([header, audioPayload]);
}

/**
 * Send RTP packet to Asterisk ExternalMedia channel
 * @param {string} extension - Target extension (7777/8888)
 * @param {Buffer} audioPayload - PCM16 audio data
 */
function sendRTP(extension, audioPayload) {
  const socket = udpSockets[extension];
  if (!socket) {
    console.error(`[RTP-SEND] No socket for extension ${extension}`);
    return;
  }

  // Use tracked remote address (from where we received RTP)
  const remote = remoteRTPAddress[extension];
  if (!remote) {
    // No remote address learned yet, skip sending
    return;
  }

  const rtpPacket = createRTPPacket(audioPayload, extension);

  socket.send(rtpPacket, remote.port, remote.address, (err) => {
    if (err) {
      console.error(`[RTP-SEND] Error sending to ${extension}:`, err.message);
    } else {
      // Update statistics
      stats[extension].packetsSent++;
      stats[extension].bytesSent += rtpPacket.length;

      // Log every 100 packets
      if (stats[extension].packetsSent % 100 === 0) {
        console.log(`[RTP-SEND] [${extension}] Sent ${stats[extension].packetsSent} packets, ${stats[extension].bytesSent} bytes`);
      }
    }
  });
}

/**
 * Send RTP initialization packets to establish bidirectional flow
 * Asterisk won't send RTP until it receives RTP first (NAT traversal)
 * @param {string} extension - Extension number (7777/8888)
 * @param {number} count - Number of packets to send (default: 10)
 */
function sendInitializationPackets(extension, count = 10) {
  console.log(`[RTP-INIT] Sending ${count} initialization packets to ${extension}...`);

  // Create silence buffer (640 bytes = 20ms of PCM16 @ 16kHz)
  // PCM16: 16kHz sample rate, 16-bit (2 bytes) per sample
  // 20ms = 16000 samples/sec * 0.02 sec = 320 samples * 2 bytes = 640 bytes
  const silenceBuffer = Buffer.alloc(640, 0);

  let sent = 0;
  const intervalId = setInterval(() => {
    if (sent >= count) {
      clearInterval(intervalId);
      console.log(`[RTP-INIT] ✅ Sent ${sent} initialization packets to ${extension}`);
      return;
    }

    sendRTP(extension, silenceBuffer);
    sent++;
  }, 20); // Send every 20ms to match audio pacing
}

/**
 * Start RTP keepalive for an extension
 * Sends periodic silence packets to maintain NAT bindings
 * @param {string} extension - Extension number (7777/8888)
 */
function startRTPKeepalive(extension) {
  const silenceBuffer = Buffer.alloc(640, 0);

  // Send keepalive every 5 seconds
  const intervalId = setInterval(() => {
    // Only send keepalive if we haven't received any packets recently
    // (if we're receiving packets, the channel is active)
    if (stats[extension].packetsReceived === 0) {
      sendRTP(extension, silenceBuffer);
    }
  }, 5000);

  // Store interval ID for cleanup
  if (!global.keepaliveIntervals) {
    global.keepaliveIntervals = {};
  }
  global.keepaliveIntervals[extension] = intervalId;
}

/**
 * Process audio chunk - Simple Passthrough
 * @param {string} extension - Source extension (7777/8888)
 * @param {Buffer} audioChunk - PCM16 audio data
 */
function processAudioChunk(extension, audioChunk) {
  // Determine target extension (simple passthrough)
  const targetExtension = extension === '7777' ? '8888' : '7777';

  // Send to other channel
  sendRTP(targetExtension, audioChunk);

  // Also send to browser via WebSocket
  if (io && connectedClients > 0) {
    io.emit('audio-data', {
      extension: extension,
      language: EXTERNAL_MEDIA_CONFIG[extension].language,
      description: EXTERNAL_MEDIA_CONFIG[extension].description,
      audio: audioChunk.toString('base64'),
      length: audioChunk.length,
      timestamp: Date.now(),
      routedTo: targetExtension
    });
  }
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
    // Track remote address for sending RTP back
    if (!remoteRTPAddress[extension] ||
        remoteRTPAddress[extension].address !== rinfo.address ||
        remoteRTPAddress[extension].port !== rinfo.port) {
      remoteRTPAddress[extension] = {
        address: rinfo.address,
        port: rinfo.port
      };
      console.log(`[UDP] [${extension}] Learned remote RTP address: ${rinfo.address}:${rinfo.port}`);
    }

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

    // Process audio (passthrough to other channel)
    processAudioChunk(extension, payload);
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
        mode: 'unified-passthrough',
        connectedClients,
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
      message: 'Connected to Unified Gateway (Passthrough Mode)',
      mode: 'passthrough',
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

    // Send RTP initialization packets to establish bidirectional flow
    // Asterisk won't send RTP until it receives RTP first
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for channel to be ready
    sendInitializationPackets(extension, 10);

    // Start RTP keepalive
    startRTPKeepalive(extension);

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

      // Check if this is an incoming call to 7777 or 8888
      const args = event.args;
      if (!args || args.length === 0) return;

      const extension = args[0].replace('ext', ''); // 'ext7777' -> '7777'
      if (!EXTERNAL_MEDIA_CONFIG[extension]) return;

      console.log(`[Bridge] Incoming call for extension ${extension}`);

      try {
        // Answer the incoming call
        await channel.answer();
        console.log(`[Bridge] Answered incoming call for ${extension}`);

        // Create a bridge
        const bridge = ariClient.Bridge();
        await bridge.create({ type: 'mixing' });
        console.log(`[Bridge] Created bridge for ${extension}`);

        // Add incoming channel to bridge
        await bridge.addChannel({ channel: channel.id });
        console.log(`[Bridge] Added incoming channel to bridge`);

        // Add ExternalMedia channel to bridge
        const externalChannel = externalMediaChannels[extension];
        if (externalChannel) {
          await bridge.addChannel({ channel: externalChannel.id });
          console.log(`[Bridge] ✅ Bridged ${channel.name} <-> ExternalMedia ${extension}`);

          // Send RTP initialization to ensure bidirectional flow
          await new Promise(resolve => setTimeout(resolve, 200));
          sendInitializationPackets(extension, 5);
        }

        // Cleanup on hangup
        channel.on('StasisEnd', () => {
          console.log(`[Bridge] Call ended for ${extension}`);
          bridge.destroy().catch(() => {});
        });

      } catch (error) {
        console.error(`[Bridge] ❌ Failed to bridge ${extension}:`, error.message);
      }
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
  console.log('UNIFIED GATEWAY - PASSTHROUGH TEST VERSION');
  console.log('='.repeat(80));
  console.log('Purpose: Test complete unified gateway with simple passthrough (NO translation)');
  console.log('');
  console.log('Architecture:');
  console.log('  Phone 1001 → Asterisk → ExternalMedia 7777 → Gateway');
  console.log('                                                  ↕ (passthrough)');
  console.log('  Phone 1002 → Asterisk → ExternalMedia 8888 → Gateway');
  console.log('                                                  ↓ WebSocket');
  console.log('                                              Browser');
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
  console.log('✅ UNIFIED GATEWAY READY');
  console.log('='.repeat(80));
  console.log(`WebSocket Server: http://localhost:${WEBSOCKET_PORT}`);
  console.log(`Health Check: http://localhost:${WEBSOCKET_PORT}/health`);
  console.log('');
  console.log('Test Scenario:');
  console.log('1. Call 1001 → 7777: Audio goes to gateway');
  console.log('2. Call 1002 → 8888: Audio goes to gateway');
  console.log('3. Gateway connects them: 7777 audio → 8888, and 8888 audio → 7777');
  console.log('4. Browser listens: Can hear audio from either channel');
  console.log('5. Result: 1001 and 1002 can talk through the gateway');
  console.log('='.repeat(80));

  // Stats reporter
  setInterval(() => {
    if (connectedClients > 0 || stats['7777'].packetsReceived > 0 || stats['8888'].packetsReceived > 0) {
      const summary = {
        clients: connectedClients,
        '7777': {
          RX: `${stats['7777'].packetsReceived} pkts (${(stats['7777'].bytesReceived / 1024).toFixed(2)} KB)`,
          TX: `${stats['7777'].packetsSent} pkts (${(stats['7777'].bytesSent / 1024).toFixed(2)} KB)`
        },
        '8888': {
          RX: `${stats['8888'].packetsReceived} pkts (${(stats['8888'].bytesReceived / 1024).toFixed(2)} KB)`,
          TX: `${stats['8888'].packetsSent} pkts (${(stats['8888'].bytesSent / 1024).toFixed(2)} KB)`
        }
      };
      console.log('[Stats]', JSON.stringify(summary));
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
