/**
 * WebSocket Server for Asterisk ExternalMedia (Per-Participant Uplink Streaming)
 * Handles WebSocket connections from Asterisk ExternalMedia on extension 7000
 * Each participant gets a unique WebSocket path: /mic/<PARTICIPANT_ID>
 */

const WebSocket = require('ws');
const { createClient } = require('@deepgram/sdk');
const EventEmitter = require('events');

class AsteriskWebSocketServer extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      port: config.port || 5050,
      sampleRate: config.sampleRate || 16000, // 16kHz for slin16
      frameSize: config.frameSize || 20, // 20ms frames
      deepgramApiKey: config.deepgramApiKey || process.env.DEEPGRAM_API_KEY,
      ...config
    };

    this.wss = null;
    this.participants = new Map(); // Map of participantId -> participant data

    // Calculate expected frame size (16kHz, 20ms, 16-bit PCM)
    // 16000 samples/sec * 0.020 sec * 2 bytes/sample = 640 bytes
    this.expectedFrameSize = (this.config.sampleRate * this.config.frameSize / 1000) * 2;

    console.log(`[WebSocket] Expected frame size: ${this.expectedFrameSize} bytes (16kHz, 20ms, 16-bit PCM)`);
  }

  /**
   * Start WebSocket server
   */
  start() {
    this.wss = new WebSocket.Server({
      port: this.config.port,
      perMessageDeflate: false // Disable compression for audio
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      console.error('[WebSocket] Server error:', error);
    });

    console.log(`[WebSocket] Server listening on port ${this.config.port}`);
    console.log(`[WebSocket] Waiting for Asterisk ExternalMedia connections on /mic/<participant_id>`);
  }

  /**
   * Handle new WebSocket connection from Asterisk
   */
  handleConnection(ws, req) {
    // Extract participant ID from URL path: /mic/<PARTICIPANT_ID>
    const urlPath = req.url;
    const match = urlPath.match(/^\/mic\/(.+)$/);

    if (!match) {
      console.warn(`[WebSocket] Invalid URL path: ${urlPath} (expected /mic/<participant_id>)`);
      ws.close(1008, 'Invalid URL path');
      return;
    }

    const participantId = match[1];
    console.log(`[WebSocket] New connection: ${participantId}`);

    // Create participant session
    const participant = {
      id: participantId,
      ws,
      deepgramConnection: null,
      frameCount: 0,
      totalBytes: 0,
      connectedAt: Date.now(),
      language: 'en', // Default language (TODO: could be passed via query param)
      buffer: Buffer.alloc(0) // Buffer for incomplete frames
    };

    this.participants.set(participantId, participant);

    // Initialize Deepgram connection for this participant
    this.initDeepgramConnection(participant);

    // Handle binary messages (PCM audio frames from Asterisk)
    ws.on('message', (data) => {
      this.handleAudioFrame(participant, data);
    });

    // Handle connection close
    ws.on('close', () => {
      console.log(`[WebSocket] Connection closed: ${participantId}`);
      this.cleanupParticipant(participantId);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`[WebSocket] Connection error (${participantId}):`, error);
      this.cleanupParticipant(participantId);
    });

    this.emit('participant-joined', { participantId, language: participant.language });
  }

  /**
   * Initialize Deepgram streaming connection for a participant
   */
  initDeepgramConnection(participant) {
    if (!this.config.deepgramApiKey) {
      console.warn(`[WebSocket] Deepgram API key not configured for ${participant.id}`);
      return;
    }

    try {
      const deepgram = createClient(this.config.deepgramApiKey);

      // Create live transcription connection
      const connection = deepgram.listen.live({
        model: 'nova-2',
        language: 'en', // TODO: Use participant.language
        smart_format: true,
        punctuate: true,
        interim_results: true,
        sample_rate: this.config.sampleRate,
        encoding: 'linear16',
        channels: 1
      });

      participant.deepgramConnection = connection;

      // Handle transcript results
      connection.on('transcriptReceived', (data) => {
        try {
          const result = data?.channel?.alternatives?.[0];
          if (!result) return;

          const transcript = result.transcript || '';
          const isFinal = data.is_final || data.speech_final;
          const confidence = result.confidence || 0;

          if (transcript && isFinal) {
            console.log(`[Deepgram/${participant.id}] Final: "${transcript}" (confidence: ${confidence.toFixed(2)})`);

            this.emit('transcription', {
              participantId: participant.id,
              text: transcript,
              confidence,
              language: participant.language,
              isFinal: true
            });
          } else if (transcript) {
            // Interim result
            this.emit('transcription', {
              participantId: participant.id,
              text: transcript,
              confidence,
              language: participant.language,
              isFinal: false
            });
          }
        } catch (err) {
          console.error(`[Deepgram/${participant.id}] Error processing transcript:`, err);
        }
      });

      // Handle errors
      connection.on('error', (error) => {
        console.error(`[Deepgram/${participant.id}] Error:`, error);
      });

      // Handle connection close
      connection.on('close', () => {
        console.log(`[Deepgram/${participant.id}] Connection closed`);
      });

      console.log(`[Deepgram/${participant.id}] Streaming connection initialized`);

    } catch (error) {
      console.error(`[WebSocket] Failed to initialize Deepgram for ${participant.id}:`, error);
    }
  }

  /**
   * Handle incoming audio frame from Asterisk
   */
  handleAudioFrame(participant, data) {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data);
    }

    participant.frameCount++;
    participant.totalBytes += data.length;

    // Append to buffer
    participant.buffer = Buffer.concat([participant.buffer, data]);

    // Process complete frames from buffer
    while (participant.buffer.length >= this.expectedFrameSize) {
      // Extract one frame
      const frame = participant.buffer.slice(0, this.expectedFrameSize);
      participant.buffer = participant.buffer.slice(this.expectedFrameSize);

      // Send frame to Deepgram
      if (participant.deepgramConnection) {
        try {
          participant.deepgramConnection.send(frame);
        } catch (error) {
          console.error(`[WebSocket] Failed to send frame to Deepgram (${participant.id}):`, error);
        }
      }

      // Emit frame event
      this.emit('audio-frame', {
        participantId: participant.id,
        frame,
        frameNumber: participant.frameCount,
        timestamp: Date.now()
      });
    }

    // Log progress every 50 frames (1 second)
    if (participant.frameCount % 50 === 0) {
      const durationSec = (participant.frameCount * this.config.frameSize) / 1000;
      console.log(`[WebSocket/${participant.id}] Received ${participant.frameCount} frames (${durationSec.toFixed(1)}s, ${participant.totalBytes} bytes)`);
    }
  }

  /**
   * Cleanup participant session
   */
  cleanupParticipant(participantId) {
    const participant = this.participants.get(participantId);

    if (!participant) return;

    // Close Deepgram connection
    if (participant.deepgramConnection) {
      try {
        participant.deepgramConnection.finish();
      } catch (error) {
        console.error(`[WebSocket] Error closing Deepgram connection (${participantId}):`, error);
      }
    }

    const durationMs = Date.now() - participant.connectedAt;
    const durationSec = durationMs / 1000;

    console.log(`[WebSocket] Participant ${participantId} session stats:`);
    console.log(`  - Duration: ${durationSec.toFixed(1)}s`);
    console.log(`  - Frames: ${participant.frameCount}`);
    console.log(`  - Total bytes: ${participant.totalBytes}`);

    this.participants.delete(participantId);
    this.emit('participant-left', { participantId });
  }

  /**
   * Get participant info
   */
  getParticipant(participantId) {
    return this.participants.get(participantId);
  }

  /**
   * Get all participants
   */
  getAllParticipants() {
    return Array.from(this.participants.values()).map(p => ({
      id: p.id,
      language: p.language,
      frameCount: p.frameCount,
      totalBytes: p.totalBytes,
      connectedAt: p.connectedAt
    }));
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      running: this.wss !== null,
      port: this.config.port,
      sampleRate: this.config.sampleRate,
      frameSize: this.config.frameSize,
      participantCount: this.participants.size,
      participants: this.getAllParticipants()
    };
  }

  /**
   * Stop server
   */
  stop() {
    console.log('[WebSocket] Stopping server...');

    // Cleanup all participants
    for (const participantId of this.participants.keys()) {
      this.cleanupParticipant(participantId);
    }

    // Close WebSocket server
    if (this.wss) {
      this.wss.close(() => {
        console.log('[WebSocket] Server stopped');
      });
      this.wss = null;
    }
  }
}

// Main execution (for standalone testing)
if (require.main === module) {
  const server = new AsteriskWebSocketServer({
    port: 5050,
    sampleRate: 16000,
    frameSize: 20
  });

  // Event handlers
  server.on('participant-joined', (data) => {
    console.log(`[Event] Participant joined: ${data.participantId}`);
  });

  server.on('participant-left', (data) => {
    console.log(`[Event] Participant left: ${data.participantId}`);
  });

  server.on('transcription', (data) => {
    const type = data.isFinal ? 'FINAL' : 'interim';
    console.log(`[Event] Transcription [${type}] (${data.participantId}): "${data.text}"`);
  });

  // Start server
  server.start();

  console.log('');
  console.log('='.repeat(60));
  console.log('Asterisk ExternalMedia WebSocket Server');
  console.log('='.repeat(60));
  console.log('');
  console.log('Configuration:');
  console.log(`  Port:        ${server.config.port}`);
  console.log(`  Sample Rate: ${server.config.sampleRate}Hz`);
  console.log(`  Frame Size:  ${server.config.frameSize}ms`);
  console.log(`  Frame Bytes: ${server.expectedFrameSize} bytes`);
  console.log('');
  console.log('Dial extension 7000 on Asterisk to start streaming!');
  console.log('='.repeat(60));
  console.log('');

  // Graceful shutdown
  process.on('SIGTERM', () => server.stop());
  process.on('SIGINT', () => {
    server.stop();
    process.exit(0);
  });
}

module.exports = AsteriskWebSocketServer;
