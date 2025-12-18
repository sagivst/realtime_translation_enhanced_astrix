#!/usr/bin/env node
/**
 * ARI Application for GStreamer PHASE 1
 * Handles ExternalMedia channels for extensions 5555 and 6666
 *
 * When a call enters Stasis(gstreamer-phase1,ext3333 or ext4444):
 * 1. Creates ExternalMedia channel
 * 2. Bridges call to ExternalMedia
 * 3. ExternalMedia sends/receives RTP to/from our UDP gateways
 */

const ari = require('ari-client');
const fs = require('fs');

// Configuration
const CONFIG = {
  ariUrl: 'http://localhost:8088',
  ariUser: 'dev',
  ariPassword: 'asterisk',
  appName: 'gstreamer-operational',
  logFile: '/tmp/ari-gstreamer-phase1.log',

  // ExternalMedia configuration
  externalMedia: {
    ext3333: {
      host: '127.0.0.1',
      port: 4020,
      format: 'slin'
    },
    ext4444: {
      host: '127.0.0.1',
      port: 4022,
      format: 'slin'
    }
  }
};

// Logging
const logStream = fs.createWriteStream(CONFIG.logFile, { flags: 'a' });
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [ARI-GStreamer] ${message}\n`;
  console.log(logMessage.trim());
  logStream.write(logMessage);
}

// Track active channels and bridges
const activeSessions = new Map();

/**
 * Handle StasisStart event
 */
function handleStasisStart(event, channel) {
  const args = event.args || [];
  const extId = args[0]; // ext3333 or ext4444

  log(`StasisStart: channel=${channel.id}, extension=${extId}, args=${JSON.stringify(args)}`);

  // Ignore ExternalMedia channels entering Stasis
  if (channel.id && channel.id.startsWith('externalmedia-')) {
    log(`Ignoring StasisStart for ExternalMedia channel: ${channel.id}`);
    return;
  }

  if (!CONFIG.externalMedia[extId]) {
    log(`ERROR: Unknown extension ${extId}`);
    channel.hangup(() => {});
    return;
  }

  const config = CONFIG.externalMedia[extId];

  // Answer the incoming channel FIRST
  channel.answer((err) => {
    if (err) {
      log(`ERROR answering channel: ${err.message}`);
      channel.hangup(() => {});
      return;
    }

    log(`Channel answered: ${channel.id}`);

    // Create ExternalMedia channel
    const externalMediaUrl = `${config.host}:${config.port}`;

    log(`Creating ExternalMedia channel for ${extId}: ${externalMediaUrl}`);

    client.channels.externalMedia({
    app: CONFIG.appName, // Same app - we filter ExternalMedia in StasisStart handler
    external_host: externalMediaUrl,
    format: config.format,
    channelId: `externalmedia-${extId}-${Date.now()}`,
    variables: {
      EXTENSION: extId
    }
  }, (err, externalChannel) => {
    if (err) {
      log(`ERROR creating ExternalMedia channel: ${JSON.stringify(err)}`);
      channel.hangup(() => {});
      return;
    }

    log(`ExternalMedia channel created: ${externalChannel.id}`);

    // Create mixing bridge
    client.bridges.create({ type: 'mixing' }, (err, bridge) => {
      if (err) {
        log(`ERROR creating bridge: ${err.message}`);
        channel.hangup(() => {});
        externalChannel.hangup(() => {});
        return;
      }

      log(`Bridge created: ${bridge.id}`);

      // Add both channels to bridge
      bridge.addChannel({ channel: [channel.id, externalChannel.id] }, (err) => {
        if (err) {
          log(`ERROR adding channels to bridge: ${err.message}`);
          bridge.destroy(() => {});
          channel.hangup(() => {});
          externalChannel.hangup(() => {});
          return;
        }

        log(`Channels bridged successfully for ${extId}`);

        // Store session info
        activeSessions.set(channel.id, {
          extension: extId,
          callChannel: channel,
          externalChannel: externalChannel,
          bridge: bridge,
          startTime: Date.now()
        });
      });
    });
  });
  }); // Close channel.answer callback
}

/**
 * Handle StasisEnd event
 */
function handleStasisEnd(event, channel) {
  log(`StasisEnd: channel=${channel.id}`);

  const session = activeSessions.get(channel.id);
  if (session) {
    log(`Cleaning up session for ${session.extension}`);

    // Cleanup
    if (session.bridge) {
      session.bridge.destroy(() => {});
    }
    if (session.externalChannel) {
      session.externalChannel.hangup(() => {});
    }

    activeSessions.delete(channel.id);

    const duration = Math.floor((Date.now() - session.startTime) / 1000);
    log(`Session ended: ${session.extension}, duration: ${duration}s`);
  }
}

/**
 * Main
 */
let client;

ari.connect(CONFIG.ariUrl, CONFIG.ariUser, CONFIG.ariPassword, (err, ariClient) => {
  if (err) {
    log(`FATAL: Failed to connect to ARI: ${err.message}`);
    process.exit(1);
  }

  client = ariClient;
  log('='.repeat(80));
  log('ARI GStreamer PHASE 1 Application Started');
  log('='.repeat(80));
  log(`ARI URL: ${CONFIG.ariUrl}`);
  log(`App Name: ${CONFIG.appName}`);
  log(`ExternalMedia configs: ${JSON.stringify(CONFIG.externalMedia, null, 2)}`);
  log('='.repeat(80));

  // Start application
  client.start(CONFIG.appName);

  // Event handlers
  client.on('StasisStart', handleStasisStart);
  client.on('StasisEnd', handleStasisEnd);

  client.on('ChannelDtmfReceived', (event, channel) => {
    log(`DTMF received: ${event.digit} on channel ${channel.id}`);
  });

  log('ARI application ready and listening for events');
});

// Graceful shutdown
function shutdown() {
  log('Shutting down ARI application...');

  // Cleanup all active sessions
  activeSessions.forEach((session, channelId) => {
    log(`Cleaning up active session: ${session.extension}`);
    if (session.bridge) session.bridge.destroy(() => {});
    if (session.externalChannel) session.externalChannel.hangup(() => {});
    if (session.callChannel) session.callChannel.hangup(() => {});
  });

  logStream.end();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
