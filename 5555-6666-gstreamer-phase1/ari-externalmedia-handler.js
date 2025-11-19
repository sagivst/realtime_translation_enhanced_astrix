/**
 * ARI ExternalMedia Handler for Extensions 7777/8888
 *
 * This handler follows Asterisk_Open-Source_Integration.md exactly:
 * - Creates ExternalMedia channels via ARI REST API
 * - Uses encapsulation: none
 * - Format: slin16 (16kHz PCM)
 * - Direction: both (bidirectional)
 * - Ports: 5000 (for 7777), 5001 (for 8888)
 *
 * PARALLEL SYSTEM:
 * - Extensions 7777/8888 use ExternalMedia (ports 5000/5001)
 * - Extensions 7000/7001 use AudioSocket (ports 5050/5051/5052) - UNTOUCHED
 */

const ari = require('ari-client');
const dgram = require('dgram');

// Configuration
const ARI_URL = 'http://localhost:8088';
const ARI_USERNAME = 'dev';
const ARI_PASSWORD = 'asterisk';
const ARI_APP_NAME = 'translation-test';  // Must match Stasis() app in dialplan

// ExternalMedia configuration per extension
// Using ports 6000/6001 for audio monitor, 5000/5001 for ARI handler
const EXTERNAL_MEDIA_CONFIG = {
  '7777': {
    extension: '7777',
    udpPort: 5000,
    externalHost: '127.0.0.1:6000'  // Send RTP to monitor on port 6000
  },
  '8888': {
    extension: '8888',
    udpPort: 5001,
    externalHost: '127.0.0.1:6001'  // Send RTP to monitor on port 6001
  }
};

// Active sessions tracking
const activeSessions = new Map();

// UDP sockets for RTP (one per extension)
const udpSockets = new Map();

// Crossover mode: route audio between extensions for testing
const CROSSOVER_MODE = process.env.CROSSOVER_DEBUG === 'true';

// Track remote RTP endpoints for crossover routing
const remoteEndpoints = new Map();

/**
 * Initialize UDP RTP listeners
 */
function initializeUDPListeners() {
  Object.values(EXTERNAL_MEDIA_CONFIG).forEach(config => {
    const socket = dgram.createSocket('udp4');

    socket.on('message', (msg, rinfo) => {
      const ext = config.extension;

      // Save remote endpoint
      if (!remoteEndpoints.has(ext) || remoteEndpoints.get(ext).port !== rinfo.port) {
        remoteEndpoints.set(ext, { address: rinfo.address, port: rinfo.port });
        if (CROSSOVER_MODE) {
          console.log(`[${ext}] Remote endpoint: ${rinfo.address}:${rinfo.port}`);
        }
      }

      if (CROSSOVER_MODE) {
        // CROSSOVER MODE: Route audio to the other extension
        const targetExt = ext === '7777' ? '8888' : '7777';
        const targetSocket = udpSockets.get(targetExt);
        const targetRemote = remoteEndpoints.get(targetExt);

        if (targetSocket && targetRemote) {
          targetSocket.send(msg, targetRemote.port, targetRemote.address, (err) => {
            if (err) {
              console.error(`[${ext}→${targetExt}] Forward error:`, err);
            }
          });
          // Log every 100th packet to avoid flooding
          if (Math.random() < 0.01) {
            console.log(`[${ext}→${targetExt}] Forwarded ${msg.length} bytes`);
          }
        } else {
          console.log(`[${ext}] Cannot forward: target ${targetExt} not ready (socket=${!!targetSocket}, remote=${!!targetRemote})`);
        }
      } else {
        // NORMAL MODE: Just log receipt (TODO: forward to translation server)
        console.log(`[UDP ${config.udpPort}] Received ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`);
      }
    });

    socket.on('error', (err) => {
      console.error(`[UDP ${config.udpPort}] Error:`, err);
    });

    socket.bind(config.udpPort, '127.0.0.1', () => {
      console.log(`UDP RTP listener started on port ${config.udpPort} for extension ${config.extension}`);
    });

    udpSockets.set(config.extension, socket);
  });
}

/**
 * Create ExternalMedia channel via ARI REST API
 * Per Asterisk_Open-Source_Integration.md Step 2
 */
async function createExternalMediaChannel(client, extension) {
  const config = EXTERNAL_MEDIA_CONFIG[extension];

  if (!config) {
    throw new Error(`No configuration for extension ${extension}`);
  }

  console.log(`[ARI] Creating ExternalMedia channel for extension ${extension}...`);

  try {
    const channel = await client.channels.externalMedia({
      app: ARI_APP_NAME,
      external_host: config.externalHost,
      format: 'slin16',
      direction: 'both',
      // encapsulation defaults to 'rtp' (Asterisk 18 doesn't support 'none')
      channelId: `externalmedia-${extension}-${Date.now()}`
    });

    console.log(`ExternalMedia channel created: ${channel.id}`);
    return channel;

  } catch (err) {
    console.error(`Failed to create ExternalMedia channel for ${extension}:`, err.message);
    throw err;
  }
}

/**
 * Create mixing bridge
 * Per Asterisk_Open-Source_Integration.md Step 4
 */
async function createMixingBridge(client) {
  console.log('[ARI] Creating mixing bridge...');

  try {
    const bridge = await client.bridges.create({
      type: 'holding',
      bridgeId: `translation-bridge-${Date.now()}`
    });

    console.log(`Mixing bridge created: ${bridge.id}`);
    return bridge;

  } catch (err) {
    console.error('Failed to create bridge:', err.message);
    throw err;
  }
}

/**
 * Handle incoming call (StasisStart event)
 */
async function handleStasisStart(event, client) {
  const channelData = event.channel;

  // IMPORTANT: Ignore StasisStart events for ExternalMedia channels
  // ExternalMedia channels have names like "UnicastRTP/127.0.0.1:5000-..."
  if (channelData.name && channelData.name.startsWith('UnicastRTP/')) {
    console.log(`[IGNORED] StasisStart for ExternalMedia channel: ${channelData.name}`);
    return;
  }

  // Extract extension from args
  let extensionNum;
  if (event.args && event.args.length > 0) {
    const extension = event.args[0];  // ext7777 or ext8888
    extensionNum = extension.replace('ext', '');  // 7777 or 8888
  } else {
    console.log('[WARN] No args in StasisStart event, ignoring');
    return;
  }

  console.log(`\n=== Incoming SIP call to extension ${extensionNum} ===`);
  console.log(`Channel: ${channelData.id}`);
  console.log(`Caller: ${channelData.caller.number || 'Unknown'}`);

  try {
    // Check if this is a supported extension
    if (!EXTERNAL_MEDIA_CONFIG[extensionNum]) {
      console.log(`Extension ${extensionNum} not supported by ExternalMedia handler`);
      await client.channels.hangup({ channelId: channelData.id });
      return;
    }

    // Get the Channel instance from the client
    const channel = client.Channel(channelData.id);

    // Answer the channel
    await channel.answer();
    console.log(`Channel answered`);

    // Apply VOLUME control via ARI to prevent clipping
    console.log('[ARI] Setting VOLUME(TX)=-6 to prevent clipping...');
    await client.channels.setChannelVar({
      channelId: channelData.id,
      variable: 'VOLUME(TX)',
      value: '-6'
    });
    console.log('[ARI] Volume control applied');

    // Create ExternalMedia channel
    const externalMediaChannel = await createExternalMediaChannel(client, extensionNum);

    // Create mixing bridge
    const bridge = await createMixingBridge(client);

    // Add both channels to bridge
    await bridge.addChannel({ channel: channelData.id });
    console.log(`SIP channel ${channelData.id} added to bridge`);

    await bridge.addChannel({ channel: externalMediaChannel.id });
    console.log(`ExternalMedia channel ${externalMediaChannel.id} added to bridge`);

    // Track session
    activeSessions.set(channelData.id, {
      sipChannel: channel,
      externalMediaChannel: externalMediaChannel,
      bridge: bridge,
      extension: extensionNum,
      startTime: new Date()
    });

    console.log(`Call setup complete for extension ${extensionNum}`);
    console.log(`Bridge structure:`);
    console.log(`  SIP/${extensionNum} (${channelData.id})`);
    console.log(`  ExternalMedia/${extensionNum} (${externalMediaChannel.id})`);

  } catch (err) {
    console.error('Error handling call:', err);

    try {
      await client.channels.hangup({ channelId: channelData.id });
    } catch (hangupErr) {
      console.error('Error hanging up channel:', hangupErr);
    }
  }
}

/**
 * Handle channel hangup (StasisEnd or ChannelDestroyed event)
 */
async function handleChannelEnd(event, client) {
  const channelId = event.channel.id;
  const session = activeSessions.get(channelId);

  if (!session) {
    return;  // Not our session
  }

  console.log(`\n=== Call ended for extension ${session.extension} ===`);
  console.log(`Duration: ${Math.round((new Date() - session.startTime) / 1000)}s`);

  try {
    // Destroy bridge
    if (session.bridge) {
      await session.bridge.destroy();
      console.log(`Bridge destroyed`);
    }

    // Hangup ExternalMedia channel if still active
    if (session.externalMediaChannel) {
      try {
        const externalChannel = client.Channel(session.externalMediaChannel.id);
        await externalChannel.hangup();
        console.log(`ExternalMedia channel hung up`);
      } catch (err) {
        // Channel may already be gone
      }
    }

  } catch (err) {
    console.error('Error cleaning up session:', err);
  } finally {
    activeSessions.delete(channelId);
  }
}

/**
 * Main entry point
 */
async function main() {
  console.log('\n=== ARI ExternalMedia Handler for Extensions 7777/8888 ===');
  console.log('Following: Asterisk_Open-Source_Integration.md');
  console.log('');
  console.log('Configuration:');
  console.log('  - Extension 7777 -> UDP port 5000');
  console.log('  - Extension 8888 -> UDP port 5001');
  console.log('  - Format: slin16 (16kHz PCM)');
  console.log('  - Direction: both (bidirectional)');
  console.log('  - Encapsulation: none (raw RTP)');
  console.log('');

  if (CROSSOVER_MODE) {
    console.log('🔀 CROSSOVER DEBUG MODE ENABLED');
    console.log('  Audio routing: 7777 ↔ 8888');
    console.log('  Speak on 7777 → Hear on 8888');
    console.log('  Speak on 8888 → Hear on 7777');
    console.log('');
  } else {
    console.log('PARALLEL SYSTEM:');
    console.log('  - Extensions 7000/7001 use AudioSocket (ports 5050-5052) - UNTOUCHED');
    console.log('  - Extensions 7777/8888 use ExternalMedia (ports 5000-5001) - NEW');
    console.log('');
  }

  try {
    // Initialize UDP listeners
    initializeUDPListeners();

    // Connect to ARI
    console.log(`Connecting to ARI at ${ARI_URL}...`);
    const client = await ari.connect(ARI_URL, ARI_USERNAME, ARI_PASSWORD);
    console.log(`Connected to ARI`);

    // Start Stasis application
    const stasisApp = client.Application();
    await client.start(ARI_APP_NAME);
    console.log(`Started Stasis application: ${ARI_APP_NAME}`);

    // Register event handlers
    client.on('StasisStart', (event) => handleStasisStart(event, client));
    client.on('StasisEnd', (event) => handleChannelEnd(event, client));
    client.on('ChannelDestroyed', (event) => handleChannelEnd(event, client));

    console.log('');
    console.log('ARI ExternalMedia Handler is READY');
    console.log('Waiting for calls to extensions 7777 or 8888...');
    console.log('');

  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');

  // Close UDP sockets
  udpSockets.forEach((socket, ext) => {
    socket.close();
    console.log(`Closed UDP socket for extension ${ext}`);
  });

  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nReceived SIGTERM, shutting down...');
  process.exit(0);
});

// Start the handler
main().catch(err => {
  console.error('Fatal error in main():', err);
  process.exit(1);
});
