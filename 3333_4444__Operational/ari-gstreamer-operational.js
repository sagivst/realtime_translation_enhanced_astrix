#!/usr/bin/env node
/**
 * ARI Handler for 3333/4444 GStreamer Operational System
 * 
 * CORRECTED CONFIGURATION (per documentation):
 * - Extension 3333: port 4000, format ALAW (8kHz)
 * - Extension 4444: port 4002, format ALAW (8kHz)
 */

const ari = require('ari-client');
const fs = require('fs');

const CONFIG = {
  ariUrl: 'http://localhost:8088',
  ariUser: 'dev',
  ariPassword: 'asterisk',
  appName: 'gstreamer-operational',
  logFile: '/tmp/ari-gstreamer-operational.log',

  externalMedia: {
    ext3333: {
      host: '127.0.0.1',
      port: 4000,
      format: 'alaw'
    },
    ext4444: {
      host: '127.0.0.1',
      port: 4002,
      format: 'alaw'
    }
  }
};

const logStream = fs.createWriteStream(CONFIG.logFile, { flags: 'a' });
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [ARI-GStreamer] ${message}\n`;
  console.log(logMessage.trim());
  logStream.write(logMessage);
}

const activeSessions = new Map();

function handleStasisStart(event, channel) {
  const args = event.args || [];
  const extId = args[0];

  log(`StasisStart: channel=${channel.id}, extension=${extId}`);

  if (channel.id && channel.id.startsWith('externalmedia-')) {
    log(`Ignoring ExternalMedia channel: ${channel.id}`);
    return;
  }

  if (!CONFIG.externalMedia[extId]) {
    log(`ERROR: Unknown extension ${extId}`);
    channel.hangup(() => {});
    return;
  }

  const config = CONFIG.externalMedia[extId];

  channel.answer((err) => {
    if (err) {
      log(`ERROR answering channel: ${err.message}`);
      channel.hangup(() => {});
      return;
    }

    log(`Channel answered: ${channel.id}`);

    const externalMediaUrl = `${config.host}:${config.port}`;
    log(`Creating ExternalMedia for ${extId}: ${externalMediaUrl} (format: ${config.format})`);

    client.channels.externalMedia({
      app: CONFIG.appName,
      external_host: externalMediaUrl,
      format: config.format,
      channelId: `externalmedia-${extId}-${Date.now()}`,
      variables: { EXTENSION: extId }
    }, (err, externalChannel) => {
      if (err) {
        log(`ERROR creating ExternalMedia: ${JSON.stringify(err)}`);
        channel.hangup(() => {});
        return;
      }

      log(`ExternalMedia created: ${externalChannel.id}`);

      client.bridges.create({ type: 'mixing' }, (err, bridge) => {
        if (err) {
          log(`ERROR creating bridge: ${err.message}`);
          channel.hangup(() => {});
          externalChannel.hangup(() => {});
          return;
        }

        log(`Bridge created: ${bridge.id}`);

        bridge.addChannel({ channel: [channel.id, externalChannel.id] }, (err) => {
          if (err) {
            log(`ERROR adding channels to bridge: ${err.message}`);
            bridge.destroy(() => {});
            channel.hangup(() => {});
            externalChannel.hangup(() => {});
            return;
          }

          log(`✓ Channels bridged successfully for ${extId}`);

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
  });
}

function handleStasisEnd(event, channel) {
  log(`StasisEnd: channel=${channel.id}`);

  const session = activeSessions.get(channel.id);
  if (session) {
    log(`Cleaning up session for ${session.extension}`);

    if (session.bridge) session.bridge.destroy(() => {});
    if (session.externalChannel) session.externalChannel.hangup(() => {});

    activeSessions.delete(channel.id);

    const duration = Math.floor((Date.now() - session.startTime) / 1000);
    log(`Session ended: ${session.extension}, duration: ${duration}s`);
  }
}

let client;

ari.connect(CONFIG.ariUrl, CONFIG.ariUser, CONFIG.ariPassword, (err, ariClient) => {
  if (err) {
    log(`FATAL: Failed to connect to ARI: ${err.message}`);
    process.exit(1);
  }

  client = ariClient;
  log('='.repeat(80));
  log('ARI GStreamer OPERATIONAL Application Started');
  log('='.repeat(80));
  log(`ARI URL: ${CONFIG.ariUrl}`);
  log(`App Name: ${CONFIG.appName}`);
  log(`ExternalMedia 3333: ${CONFIG.externalMedia.ext3333.host}:${CONFIG.externalMedia.ext3333.port} (${CONFIG.externalMedia.ext3333.format})`);
  log(`ExternalMedia 4444: ${CONFIG.externalMedia.ext4444.host}:${CONFIG.externalMedia.ext4444.port} (${CONFIG.externalMedia.ext4444.format})`);
  log('='.repeat(80));

  client.start(CONFIG.appName);
  client.on('StasisStart', handleStasisStart);
  client.on('StasisEnd', handleStasisEnd);

  log('✓ ARI application ready');
});

function shutdown() {
  log('Shutting down ARI application...');
  activeSessions.forEach((session) => {
    if (session.bridge) session.bridge.destroy(() => {});
    if (session.externalChannel) session.externalChannel.hangup(() => {});
    if (session.callChannel) session.callChannel.hangup(() => {});
  });
  logStream.end();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
