/**
 * ARI ExternalMedia Handler for Extensions 7777/8888
 * WITH WEBSOCKET TRANSLATION SERVER INTEGRATION
 *
 * This handler follows:
 * - Asterisk_Open-Source_Integration.md (ARI/ExternalMedia)
 * - Gateway_Translation_Server_Integration.md (WebSocket Translation)
 *
 * Architecture:
 * - Creates ExternalMedia channels via ARI REST API
 * - Receives RTP audio from Asterisk (16kHz PCM)
 * - Forwards audio to Translation Server via WebSocket
 * - Receives translated audio back via WebSocket
 * - Sends translated audio to Asterisk as RTP
 *
 * PARALLEL SYSTEM:
 * - Extensions 7777/8888 use ExternalMedia (ports 5000/5001) + WebSocket Translation
 * - Extensions 7000/7001 use AudioSocket (ports 5050/5051/5052) - UNTOUCHED
 */

const ari = require('ari-client');
const dgram = require('dgram');
// PHASE 1: Removed WebSocket client - no external Conference Server needed
// const io = require('socket.io-client');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');  // WebSocket SERVER for test server
require('dotenv').config({ path: '.env.externalmedia' });

// Audio Sample Rate Configuration
const AUDIO_SAMPLE_RATE = parseInt(process.env.AUDIO_SAMPLE_RATE || '16000');
console.log("[Config] Audio Sample Rate:", AUDIO_SAMPLE_RATE, "Hz");

// RTP Configuration Object
// Maps sample rate to RTP parameters (payload type, endianness, etc.)
const RTP_CONFIG = {
  16000: {
    payloadType: 118,          // PT=118 to MATCH Asterisk (was PT=10)
    format: "L16",             // Linear PCM 16-bit
    sampleRate: 16000,
    bytesPerSample: 2,         // PCM16 = 2 bytes per sample
    endianness: "little",      // PT=118 uses little-endian (NO byte swap)
    samplesPerPacket: 320      // 20ms @ 16kHz = 320 samples
  },
  48000: {
    payloadType: 96,           // PT=96 for dynamic payload
    format: "L16",             // Linear PCM 16-bit
    sampleRate: 48000,
    bytesPerSample: 2,
    endianness: "little",      // PT=96 uses little-endian
    samplesPerPacket: 960      // 20ms @ 48kHz = 960 samples
  }
};

// Select RTP config based on AUDIO_SAMPLE_RATE
const ACTIVE_RTP_CONFIG = RTP_CONFIG[AUDIO_SAMPLE_RATE];
if (!ACTIVE_RTP_CONFIG) {
  console.error(`[Config] ERROR: No RTP config for sample rate ${AUDIO_SAMPLE_RATE}`);
  process.exit(1);
}
console.log("[Config] RTP Format:", ACTIVE_RTP_CONFIG.format, "@ PT=" + ACTIVE_RTP_CONFIG.payloadType, "("+ACTIVE_RTP_CONFIG.endianness+"-endian)");


// Configuration
const ARI_URL = 'http://localhost:8088';
const ARI_USERNAME = 'dev';
const ARI_PASSWORD = 'asterisk';
const ARI_APP_NAME = 'translation-test';  // Must match Stasis() app in dialplan

// PHASE 1: Removed - no external Translation Server
// const TRANSLATION_SERVER_URL = 'http://localhost:3002';

// ExternalMedia configuration per extension
// Using ports 6000/6001 for audio monitor, 5000/5001 for Gateway RTP
const EXTERNAL_MEDIA_CONFIG = {
  '7777': {
    extension: '7777',
    udpPort: 5000,
    externalHost: '127.0.0.1:5000',  // Send RTP to monitor on port 6000
    language: 'en'  // English
  },
  '8888': {
    extension: '8888',
    udpPort: 5001,
    externalHost: '127.0.0.1:5001',  // Send RTP to monitor on port 6001
    language: 'fr'  // French
  }
};

// Active sessions tracking
const activeSessions = new Map();

// UDP sockets for RTP (one per extension)
const udpSockets = new Map();

// PHASE 1: Removed - no external WebSocket connections needed
// const translationSockets = new Map();

// Track remote RTP endpoints for sending translated audio back to Asterisk
const remoteEndpoints = new Map();

// RTP state tracking per extension
const rtpState = new Map(); // { sequenceNumber, timestamp, ssrc }

// RTP packet queue and pacing (20ms intervals) - DISABLED for testing
// const rtpPacketQueues = new Map(); // extension → array of packets
// const rtpPacketTimers = new Map(); // extension → setInterval timer

/**
 * Properly parse RTP packet and extract PCM payload
 * RTP Header structure:
 * - Byte 0: V(2), P(1), X(1), CC(4) bits
 * - Byte 1: M(1), PT(7) bits  
 * - Bytes 2-3: Sequence number
 * - Bytes 4-7: Timestamp
 * - Bytes 8-11: SSRC
 * - Bytes 12+: CSRC (if CC > 0)
 * - Extension header (if X=1)
 * - Payload
 */
function extractPCMFromRTP(rtpPacket) {
  if (rtpPacket.length < 12) {
    return null; // Invalid packet
  }

  // Parse RTP header
  const byte0 = rtpPacket[0];
  const version = (byte0 >> 6) & 0x03;
  const padding = (byte0 >> 5) & 0x01;
  const extension = (byte0 >> 4) & 0x01;
  const csrcCount = byte0 & 0x0F;

  // Calculate header size
  let headerSize = 12; // Fixed header
  headerSize += csrcCount * 4; // CSRC identifiers

  // Handle extension header if present
  if (extension === 1 && rtpPacket.length >= headerSize + 4) {
    const extensionLength = rtpPacket.readUInt16BE(headerSize + 2);
    headerSize += 4 + (extensionLength * 4);
  }

  if (rtpPacket.length <= headerSize) {
    return null; // No payload
  }

  // Extract payload
  let payload = rtpPacket.slice(headerSize);

  // Handle padding if present
  if (padding === 1 && payload.length > 0) {
    const paddingLength = payload[payload.length - 1];
    payload = payload.slice(0, payload.length - paddingLength);
  }

  // PT=10 (L16) per RFC 3551 requires BIG-ENDIAN
  // Asterisk sends PT=10 in big-endian, we need little-endian for Deepgram
  const payloadType = rtpPacket[1] & 0x7F; // Extract PT (7 bits)

  // ALWAYS log PT on first few packets
  if (!global.ptLogged || global.ptLogCount < 10) {
    console.log(`[RTP] Incoming PT=${payloadType}, total=${rtpPacket.length}B, header=${headerSize}B, payload=${payload.length}B`);
    global.ptLogged = true;
    global.ptLogCount = (global.ptLogCount || 0) + 1;
  }

  // Convert from big-endian (when PT matches and config says big-endian) to little-endian (for Deepgram)
  if (payloadType === ACTIVE_RTP_CONFIG.payloadType && ACTIVE_RTP_CONFIG.endianness === "big") {
    const swapped = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i += 2) {
      if (i + 1 < payload.length) {
        swapped[i] = payload[i + 1];     // High byte
        swapped[i + 1] = payload[i];     // Low byte
      }
    }
    payload = swapped;

    if (!global.swapLogged) {
      console.log(`[RTP] PT=${ACTIVE_RTP_CONFIG.payloadType} big-endian detected, swapping ${payload.length} bytes from big-endian to little-endian`);
      global.swapLogged = true;
    }
  }

  // Check for clipping in RTP payload (sample every 100th packet)
  if (Math.random() < 0.01) {
    let maxSample = 0;
    let clippedCount = 0;
    for (let i = 0; i < payload.length; i += 2) {
      const sample = Math.abs(payload.readInt16LE(i));
      maxSample = Math.max(maxSample, sample);
      if (sample >= 32767) clippedCount++;
    }
    const sampleCount = payload.length / 2;
    const clippedPercent = ((clippedCount / sampleCount) * 100).toFixed(2);
    console.log(`[RTP Audio] Max sample: ${maxSample}, Clipped: ${clippedCount}/${sampleCount} (${clippedPercent}%)`);
  }

  return payload;
}

/**
 * Scale PCM audio samples to normalize volume
 * This is the bullet-proof method recommended in the whisper document
 * @param {Buffer} pcmBuffer - PCM16 audio data
 * @param {number} gainFactor - Gain multiplier (0.79 = -2dB, 0.70 = -3dB, 1.26 = +2dB)
 * @returns {Buffer} - Scaled PCM audio
 */
function scalePCM(pcmBuffer, gainFactor = 0.79) {
  const scaled = Buffer.alloc(pcmBuffer.length);
  let maxSample = 0;
  let clippedSamples = 0;
  
  for (let i = 0; i < pcmBuffer.length; i += 2) {
    let sample = pcmBuffer.readInt16LE(i);
    maxSample = Math.max(maxSample, Math.abs(sample));
    
    let scaledSample = Math.round(sample * gainFactor);
    
    // Prevent clipping
    if (scaledSample > 32767) { scaledSample = 32767; clippedSamples++; }
    else if (scaledSample < -32768) { scaledSample = -32768; clippedSamples++; }
    
    scaled.writeInt16LE(scaledSample, i);
  }
  
  // Always log to verify scaling is working
  if (maxSample > 30000 || clippedSamples > 0) {
    console.log(`[PCM Scale] Gain: ${gainFactor.toFixed(2)}x, Max input: ${maxSample}, Clipped: ${clippedSamples}/${pcmBuffer.length/2} samples (${(clippedSamples/(pcmBuffer.length/2)*100).toFixed(2)}%)`);
  }
  return scaled;
}


/**
 * Initialize WebSocket connection to Translation Server for a specific extension
 * Per Gateway_Translation_Server_Integration.md:
 * - One WebSocket per call direction
 * - Full-duplex audio stream (PCM 16kHz, mono, 20ms frames)
 */
function initializeTranslationSocket(extension) {
  if (translationSockets.has(extension)) {
    console.log(`[WebSocket] Translation socket already exists for extension ${extension}`);
    return translationSockets.get(extension);
  }

  const config = EXTERNAL_MEDIA_CONFIG[extension];
  if (!config) {
    console.error(`[WebSocket] No configuration for extension ${extension}`);
    return null;
  }

  console.log(`[WebSocket] Connecting to Translation Server for extension ${extension}...`);
  
  const socket = io(TRANSLATION_SERVER_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  socket.on('connect', () => {
    console.log(`[WebSocket ${extension}] Connected to Translation Server (ID: ${socket.id})`);
    
    // Register this extension with the Translation Server
    socket.emit('registerExtension', {
      extension: extension,
      language: config.language,
      format: 'pcm16',
      sampleRate: 16000,
      channels: 1
    });
  });

  socket.on('disconnect', () => {
    console.log(`[WebSocket ${extension}] Disconnected from Translation Server`);
  });

  socket.on('error', (err) => {
    console.error(`[WebSocket ${extension}] Error:`, err.message);
  });

  // Receive translated audio from Translation Server
  socket.on('translatedAudio', (data) => {
    console.log(`[Gateway DEBUG] Received translatedAudio for extension ${extension}, data.extension=${data.extension}, audio bytes=${data.audio ? data.audio.length : 0}`);
    // data should contain PCM audio buffer
    // Convert back to RTP and send to Asterisk
    forwardTranslatedAudioToAsterisk(extension, data);
  });

  // Also listen for 'translated-audio' (with dashes) - Conference Server uses both formats
  socket.on('translated-audio', (data) => {
    console.log(`[WebSocket ${extension}] Received translated-audio event (${data.audio ? data.audio.length : 0} bytes)`);
    forwardTranslatedAudioToAsterisk(extension, data);
  });

  socket.on('transcriptionPartial', (data) => {
    console.log(`[WebSocket ${extension}] Partial transcription:`, data.text);
  });

  socket.on('transcriptionFinal', (data) => {
    console.log(`[WebSocket ${extension}] Final transcription:`, data.text);
  });

  socket.on('translationComplete', (data) => {
    console.log(`[WebSocket ${extension}] Translation: ${data.originalText} → ${data.translatedText}`);
  });

  translationSockets.set(extension, socket);
  return socket;
}

/**
 * Close WebSocket connection for a specific extension
 */
function closeTranslationSocket(extension) {
  const socket = translationSockets.get(extension);
  if (socket) {
    console.log(`[WebSocket ${extension}] Closing connection to Translation Server`);
    socket.disconnect();
    translationSockets.delete(extension);
  }
}

/**
 * Forward RTP audio to Translation Server via WebSocket
 * Per Gateway_Translation_Server_Integration.md:
 * - Extract PCM from RTP packet
 * - Send as continuous stream to Translation Server
 */
function forwardAudioToTranslationServer(extension, rtpPacket) {
  const socket = translationSockets.get(extension);
  if (!socket) {
    // Silent fail - Translation Server not available
    return;
  }

  // RTP packet structure (simplified):
  // Byte 0-11: RTP header (12 bytes)
  // Byte 12+: Payload (PCM audio)
  
  if (rtpPacket.length <= 12) {
    // Invalid RTP packet
    return;
  }

  // Extract PCM payload (skip 12-byte RTP header)
  const pcmPayload = extractPCMFromRTP(rtpPacket);
  if (!pcmPayload) return; // Invalid or empty RTP packet

  // Send PCM audio to Translation Server
  // Scale PCM to normalize volume (bullet-proof method from whisper doc)
  // Using 5.0x gain (≈ +14 dB) - AMPLIFY to prevent clipping and optimize for Deepgram
  const scaledPCM = scalePCM(pcmPayload, 5.0);  // FIXED: Amplify audio by 5x (+14dB)
  
  socket.emit('audioStream', {
    extension: extension,
    audio: scaledPCM,
    timestamp: Date.now(),
    format: 'pcm16',
    sampleRate: 16000
  });
}

/**
 * Create proper RTP packet with PCM16 payload
 * Using PT=96 (dynamic) for 16kHz PCM16 mono
 *
 * RTP Header structure (12 bytes):
 * - Byte 0: V(2) | P(1) | X(1) | CC(4) = 0x80 (version 2, no padding/extension/csrc)
 * - Byte 1: M(1) | PT(7) = 0x60 (PT=96, no marker)
 * - Bytes 2-3: Sequence number (big-endian)
 * - Bytes 4-7: Timestamp (big-endian, increments by 320 for 20ms @ 16kHz)
 * - Bytes 8-11: SSRC (synchronization source ID)
 * - Bytes 12+: Payload (PCM16 audio)
 */
function createRTPPacket(extension, pcmPayload) {
  // Initialize RTP state for this extension if needed
  if (!rtpState.has(extension)) {
    rtpState.set(extension, {
      sequenceNumber: Math.floor(Math.random() * 65536), // Random initial sequence
      timestamp: Math.floor(Math.random() * 0xFFFFFFFF), // Random initial timestamp
      ssrc: 0x12345678 + parseInt(extension) // Unique SSRC per extension
    });
    console.log(`[RTP Init ${extension}] Sequence: ${rtpState.get(extension).sequenceNumber}, Timestamp: ${rtpState.get(extension).timestamp}, SSRC: 0x${rtpState.get(extension).ssrc.toString(16)}`);
  }

  const state = rtpState.get(extension);

  // Create RTP header (12 bytes)
  const rtpHeader = Buffer.alloc(12);

  // Byte 0: Version 2, no padding, no extension, no CSRC
  rtpHeader[0] = 0x80;

  // Byte 1: No marker, PT from config
  rtpHeader[1] = ACTIVE_RTP_CONFIG.payloadType;

  // Bytes 2-3: Sequence number (big-endian)
  rtpHeader.writeUInt16BE(state.sequenceNumber, 2);

  // Bytes 4-7: Timestamp (big-endian)
  rtpHeader.writeUInt32BE(state.timestamp, 4);

  // Bytes 8-11: SSRC
  rtpHeader.writeUInt32BE(state.ssrc, 8);

  // Amplify audio (Blueprint test audio is very quiet - max ±99 instead of ±32767)
  const GAIN = 100; // Increased to 100x to test if volume is the issue
  const amplifiedPayload = Buffer.alloc(pcmPayload.length);
  for (let i = 0; i < pcmPayload.length; i += 2) {
    if (i + 1 < pcmPayload.length) {
      // Read little-endian int16
      const sample = pcmPayload.readInt16LE(i);
      // Amplify and clamp to prevent distortion
      const amplified = Math.max(-32768, Math.min(32767, sample * GAIN));
      // Write back as little-endian
      amplifiedPayload.writeInt16LE(amplified, i);
    }
  }

  // Convert PCM payload based on config endianness
  // Config determines if we need big-endian (PT=10) or little-endian (PT=96)
  let finalPayload;
  if (ACTIVE_RTP_CONFIG.endianness === 'big') {
    // Convert to big-endian for PT=10 (RFC 3551 requirement)
    const bigEndianPayload = Buffer.alloc(amplifiedPayload.length);
    for (let i = 0; i < amplifiedPayload.length; i += 2) {
      if (i + 1 < amplifiedPayload.length) {
        bigEndianPayload[i] = amplifiedPayload[i + 1];     // High byte
        bigEndianPayload[i + 1] = amplifiedPayload[i];     // Low byte
      }
    }
    finalPayload = bigEndianPayload;
  } else {
    // Little-endian - no conversion needed
    finalPayload = amplifiedPayload;
  }

  // Increment state for next packet
  state.sequenceNumber = (state.sequenceNumber + 1) & 0xFFFF; // Wrap at 65535
  state.timestamp += ACTIVE_RTP_CONFIG.samplesPerPacket;

  // Create complete RTP packet
  const rtpPacket = Buffer.concat([rtpHeader, finalPayload]);

  // MONITOR OUTGOING RTP to Asterisk (every 50th packet)
  if (state.sequenceNumber % 50 === 0) {
    console.log(`[${extension} OUT] PT=${ACTIVE_RTP_CONFIG.payloadType}, Seq=${state.sequenceNumber}, TS=${state.timestamp}, Payload=${finalPayload.length}B, Total=${rtpPacket.length}B, Endian=${ACTIVE_RTP_CONFIG.endianness}`);
  }

  return rtpPacket;
}

/**
 * Start RTP packet sender timer for paced transmission (20ms intervals) - DISABLED
 */
/*
function startRTPPacketSender(extension) {
  if (rtpPacketTimers.has(extension)) {
    return; // Already running
  }

  const udpSocket = udpSockets.get(extension);
  const remote = remoteEndpoints.get(extension);

  if (!udpSocket || !remote) {
    console.log(`[${extension}] Cannot start packet sender: no socket/endpoint`);
    return;
  }

  console.log(`[${extension}] Starting RTP packet sender (20ms intervals)`);

  const timer = setInterval(() => {
    const queue = rtpPacketQueues.get(extension);
    if (!queue || queue.length === 0) {
      return; // Queue empty, wait for next interval
    }

    const rtpPacket = queue.shift(); // Get first packet from queue
    udpSocket.send(rtpPacket, remote.port, remote.address, (err) => {
      if (err) {
        console.error(`[${extension}] Error sending RTP packet:`, err.message);
      }
    });

    if (queue.length % 50 === 0 && queue.length > 0) {
      console.log(`[${extension}] RTP queue: ${queue.length} packets remaining`);
    }
  }, 20); // Send one packet every 20ms

  rtpPacketTimers.set(extension, timer);
}
*/

/**
 * Forward translated audio from Translation Server back to Asterisk
 * Per Gateway_Translation_Server_Integration.md:
 * - Receive PCM from Translation Server
 * - Encapsulate in RTP
 * - Send to Asterisk remote endpoint
 */
function forwardTranslatedAudioToAsterisk(extension, audioData) {
  const udpSocket = udpSockets.get(extension);
  const remote = remoteEndpoints.get(extension);

  if (!udpSocket || !remote) {
    console.log(`[${extension}] Cannot forward translated audio: no UDP socket or remote endpoint`);
    return;
  }

  // Extract PCM buffer from audioData
  const pcmBuffer = Buffer.isBuffer(audioData.audioBuffer)
    ? audioData.audioBuffer
    : (Buffer.isBuffer(audioData.audio) ? audioData.audio : Buffer.from(audioData.audio));

  if (!pcmBuffer || pcmBuffer.length === 0) {
    console.log(`[${extension}] Empty audio buffer, skipping`);
    return;
  }

  console.log(`[${extension}] Received translated audio: ${pcmBuffer.length} bytes (${(pcmBuffer.length / 32000).toFixed(2)}s)`);

  // CRITICAL: Split audio into 20ms RTP packets (640 bytes = 320 samples @ 16kHz PCM16)
  const CHUNK_SIZE = 640; // 20ms @ 16kHz PCM16 mono

  // FIX #1: Send all packets immediately (NO pacing) - let Asterisk jitter buffer handle timing
  // This matches Blueprint architecture philosophy: simple, direct, let Asterisk control timing
  let packetCount = 0;
  for (let offset = 0; offset < pcmBuffer.length; offset += CHUNK_SIZE) {
    const chunk = pcmBuffer.slice(offset, Math.min(offset + CHUNK_SIZE, pcmBuffer.length));
    const rtpPacket = createRTPPacket(extension, chunk);

    udpSocket.send(rtpPacket, remote.port, remote.address, (err) => {
      if (err) {
        console.error(`[${extension}] Error sending RTP packet:`, err.message);
      }
    });

    packetCount++;
  }

  console.log(`[${extension}] Sent ${packetCount} RTP packets IMMEDIATELY (Blueprint mode - Asterisk controls timing)`);
}

/**
 * Initialize UDP RTP listeners
 * Modified to forward audio to BOTH Audio Monitor AND Translation Server
 */
function initializeUDPListeners() {
  Object.values(EXTERNAL_MEDIA_CONFIG).forEach(config => {
    const socket = dgram.createSocket('udp4');

    socket.on('message', (msg, rinfo) => {
      const ext = config.extension;

      // Save remote endpoint (needed to send translated audio back to Asterisk)
      if (!remoteEndpoints.has(ext) || remoteEndpoints.get(ext).port !== rinfo.port) {
        remoteEndpoints.set(ext, { address: rinfo.address, port: rinfo.port });
        console.log(`[${ext}] Asterisk RTP endpoint: ${rinfo.address}:${rinfo.port}`);
      }

      // MONITOR INCOMING RTP from Asterisk
      if (msg.length >= 12) {
        const pt = msg[1] & 0x7F; // Payload type
        const seq = msg.readUInt16BE(2);
        const ts = msg.readUInt32BE(4);
        const payloadSize = msg.length - 12;

        // Log every 50th packet to avoid flooding
        if (seq % 50 === 0) {
          console.log(`[${ext} IN] PT=${pt}, Seq=${seq}, TS=${ts}, Payload=${payloadSize}B, Total=${msg.length}B`);
        }
      }

      // PHASE 1: Disabled - will be replaced with embedded processing
      // forwardAudioToTranslationServer(ext, msg);
      console.log(`[Phase1][${ext}] Received ${msg.length} bytes RTP (processing disabled)`);

      // Also forward to Audio Monitor (ports 6000/6001) for visualization
      const monitorPort = ext === '7777' ? 6000 : 6001;
      socket.send(msg, monitorPort, '127.0.0.1', (err) => {
        if (err && Math.random() < 0.01) {  // Log 1% of errors to avoid flooding
          console.error(`[${ext}] Error forwarding to Audio Monitor:`, err.message);
        }
      });

    });

    socket.on('error', (err) => {
      console.error(`[UDP ${config.udpPort}] Error:`, err);
    });

    socket.bind(config.udpPort, '127.0.0.1', () => {
      console.log(`[UDP] RTP listener started on port ${config.udpPort} for extension ${config.extension}`);
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

    console.log(`[ARI] ExternalMedia channel created: ${channel.id}`);
    return channel;

  } catch (err) {
    console.error(`[ARI] Failed to create ExternalMedia channel for ${extension}:`, err.message);
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
      type: 'mixing',
      bridgeId: `translation-bridge-${Date.now()}`
    });

    console.log(`[ARI] Mixing bridge created: ${bridge.id}`);
    return bridge;

  } catch (err) {
    console.error('[ARI] Failed to create bridge:', err.message);
    throw err;
  }
}

/**
 * Handle incoming call (StasisStart event)
 * ENHANCED: Initialize WebSocket connection to Translation Server
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
    console.log(`[ARI] Channel answered`);
    
    // Apply VOLUME control via ARI to prevent clipping (20% reduction = -2 dB)
    await client.channels.setChannelVar({
      channelId: channelData.id,
      variable: "VOLUME(RX)",
      value: "-10"
    });
    console.log(`[ARI] VOLUME(RX)=-2dB applied to prevent clipping`);

    // PHASE 2B: Initialize WebSocket connection to Translation Server
    initializeTranslationSocket(extensionNum);

    // Create ExternalMedia channel
    const externalMediaChannel = await createExternalMediaChannel(client, extensionNum);

    // Create mixing bridge
    const bridge = await createMixingBridge(client);

    // Add both channels to bridge
    await bridge.addChannel({ channel: channelData.id });
    console.log(`[ARI] SIP channel ${channelData.id} added to bridge`);

    await bridge.addChannel({ channel: externalMediaChannel.id });
    console.log(`[ARI] ExternalMedia channel ${externalMediaChannel.id} added to bridge`);

    // Track session
    activeSessions.set(channelData.id, {
      sipChannel: channel,
      externalMediaChannel: externalMediaChannel,
      bridge: bridge,
      extension: extensionNum,
      startTime: new Date()
    });

    console.log(`✓ Call setup complete for extension ${extensionNum}`);
    console.log(`Bridge structure:`);
    console.log(`  SIP/${extensionNum} (${channelData.id})`);
    console.log(`  ExternalMedia/${extensionNum} (${externalMediaChannel.id})`);
    console.log(`  WebSocket → Translation Server (port 3002)`);

  } catch (err) {
    console.error('[ERROR] Error handling call:', err);

    try {
      await client.channels.hangup({ channelId: channelData.id });
    } catch (hangupErr) {
      console.error('[ERROR] Error hanging up channel:', hangupErr);
    }
  }
}

/**
 * Handle channel hangup (StasisEnd or ChannelDestroyed event)
 * ENHANCED: Close WebSocket connection to Translation Server
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
    // PHASE 2B: Close WebSocket connection to Translation Server
    closeTranslationSocket(session.extension);

    // Cleanup RTP packet sender timer and queue - DISABLED (no pacing)
    // if (rtpPacketTimers.has(session.extension)) {
    //   clearInterval(rtpPacketTimers.get(session.extension));
    //   rtpPacketTimers.delete(session.extension);
    //   console.log(`[${session.extension}] RTP packet sender timer stopped`);
    // }
    // if (rtpPacketQueues.has(session.extension)) {
    //   rtpPacketQueues.delete(session.extension);
    //   console.log(`[${session.extension}] RTP packet queue cleared`);
    // }

    // Destroy bridge
    if (session.bridge) {
      await session.bridge.destroy();
      console.log(`[ARI] Bridge destroyed`);
    }

    // Hangup ExternalMedia channel if still active
    if (session.externalMediaChannel) {
      try {
        const externalChannel = client.Channel(session.externalMediaChannel.id);
        await externalChannel.hangup();
        console.log(`[ARI] ExternalMedia channel hung up`);
      } catch (err) {
        // Channel may already be gone
      }
    }

  } catch (err) {
    console.error('[ERROR] Error cleaning up session:', err);
  } finally {
    activeSessions.delete(channelId);
  }
}

/**
 * Main entry point
 */
async function main() {
  console.log('\n=== ARI ExternalMedia Gateway with WebSocket Translation ===');
  console.log('Following:');
  console.log('  - Asterisk_Open-Source_Integration.md (ARI/ExternalMedia)');
  console.log('  - Gateway_Translation_Server_Integration.md (WebSocket Translation)');
  console.log('');
  console.log('Configuration:');
  console.log('  - Extension 7777 -> UDP port 5000 (English)');
  console.log('  - Extension 8888 -> UDP port 5001 (French)');
  console.log('  - Format: slin16 (16kHz PCM)');
  console.log('  - Translation Server: ' + TRANSLATION_SERVER_URL);
  console.log('  - Direction: Full-duplex bidirectional');
  console.log('');
  console.log('PARALLEL SYSTEM:');
  console.log('  - Extensions 7000/7001 use AudioSocket (ports 5050-5052) - UNTOUCHED');
  console.log('  - Extensions 7777/8888 use ExternalMedia + WebSocket Translation');
  console.log('');

  try {
    // Initialize UDP listeners for RTP from Asterisk
    initializeUDPListeners();

    // Initialize WebSocket SERVER for test server (Blueprint direct connection)
    const app = express();
    const server = http.createServer(app);
    const wsServer = new Server(server);

    wsServer.on('connection', (socket) => {
      console.log('[WebSocket Server] Test server connected:', socket.id);

      socket.on('translatedAudio', (data) => {
        console.log(`[WebSocket Server] Received translatedAudio for extension ${data.extension} (${data.audio ? data.audio.length : 0} bytes)`);
        // Forward directly to Asterisk via existing function
        forwardTranslatedAudioToAsterisk(data.extension, data);
      });

      socket.on('disconnect', () => {
        console.log('[WebSocket Server] Test server disconnected');
      });
    });

    const WS_SERVER_PORT = 3003; // Different from Conference Server (3002)
    server.listen(WS_SERVER_PORT, () => {
      console.log(`[WebSocket Server] Listening on port ${WS_SERVER_PORT} for test server\n`);
    });

    // Connect to ARI
    console.log(`[ARI] Connecting to ${ARI_URL}...`);
    const client = await ari.connect(ARI_URL, ARI_USERNAME, ARI_PASSWORD);
    console.log(`[ARI] Connected successfully`);

    // Start Stasis application
    const stasisApp = client.Application();
    await client.start(ARI_APP_NAME);
    console.log(`[ARI] Started Stasis application: ${ARI_APP_NAME}`);

    // Register event handlers
    client.on('StasisStart', (event) => handleStasisStart(event, client));
    client.on('StasisEnd', (event) => handleChannelEnd(event, client));
    client.on('ChannelDestroyed', (event) => handleChannelEnd(event, client));

    console.log('');
    console.log('✓ Gateway is READY');
    console.log('Waiting for calls to extensions 7777 or 8888...');
    console.log('');

  } catch (err) {
    console.error('[FATAL ERROR]:', err);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');

  // Close all WebSocket connections
  translationSockets.forEach((socket, ext) => {
    console.log(`Closing WebSocket for extension ${ext}`);
    socket.disconnect();
  });

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

// Start the Gateway
main().catch(err => {
  console.error('[FATAL ERROR] in main():', err);
  process.exit(1);
});

