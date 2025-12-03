/**
 * ExternalMedia WebSocket Orchestrator
 *
 * Receives 16kHz PCM16 audio from Asterisk ExternalMedia (direction=read)
 * and fans out to ASR workers and other processing services.
 *
 * Based on: Realtime_Uplink_Capture_via_Asterisk ExternalMedia.md
 */

const WebSocket = require('ws');
const { EventEmitter } = require('events');
const fs = require('fs');

const SAMPLE_RATE = 16000;
const EXPECTED_FRAME_SIZE = 640; // 16kHz × 2 bytes × 20ms = 640 bytes
const FRAME_DURATION_MS = 20;

class ExternalMediaOrchestrator extends EventEmitter {
    constructor(port = 5050) {
        super();
        this.port = port;
        this.wss = null;
        this.connections = new Map(); // channelId -> connection info
        this.stats = {
            totalConnections: 0,
            activeConnections: 0,
            totalFrames: 0,
            totalBytes: 0,
            errors: 0
        };
    }

    /**
     * Start WebSocket server
     */
    start() {
        this.wss = new WebSocket.Server({
            port: this.port,
            perMessageDeflate: false // Disable compression for low latency
        });

        console.log(`[ExternalMedia] WebSocket orchestrator listening on port ${this.port}`);

        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });

        this.wss.on('error', (error) => {
            console.error('[ExternalMedia] WebSocket server error:', error);
            this.emit('error', error);
        });
    }

    /**
     * Handle new WebSocket connection from Asterisk
     */
    handleConnection(ws, req) {
        const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const clientIp = req.socket.remoteAddress;

        console.log(`[ExternalMedia] ✓ New connection: ${connectionId} from ${clientIp}`);

        const connectionInfo = {
            id: connectionId,
            ws: ws,
            startTime: Date.now(),
            framesReceived: 0,
            bytesReceived: 0,
            lastFrameTime: Date.now(),
            channelId: null, // Will be set when we get metadata
            language: 'en' // Default language
        };

        this.connections.set(connectionId, connectionInfo);
        this.stats.totalConnections++;
        this.stats.activeConnections++;

        // Handle incoming audio frames
        ws.on('message', (data) => {
            this.handleAudioFrame(connectionId, data);
        });

        // Handle connection close
        ws.on('close', () => {
            this.handleDisconnect(connectionId);
        });

        // Handle errors
        ws.on('error', (error) => {
            console.error(`[ExternalMedia] Connection ${connectionId} error:`, error.message);
            this.stats.errors++;
        });

        // Emit connection event
        this.emit('connection', {
            connectionId,
            clientIp,
            timestamp: Date.now()
        });
    }

    /**
     * Handle incoming audio frame
     */
    handleAudioFrame(connectionId, data) {
        const conn = this.connections.get(connectionId);
        if (!conn) {
            console.warn(`[ExternalMedia] Frame for unknown connection: ${connectionId}`);
            return;
        }

        // Check if this is binary PCM data
        if (!Buffer.isBuffer(data)) {
            data = Buffer.from(data);
        }

        const frameSize = data.length;

        // Validate frame size
        if (frameSize !== EXPECTED_FRAME_SIZE) {
            // First few frames might be metadata or handshake, log but don't error
            if (conn.framesReceived < 5) {
                console.log(`[ExternalMedia] Connection ${connectionId}: Received ${frameSize} bytes (expected ${EXPECTED_FRAME_SIZE}), might be metadata`);
            }

            // If it's way too small or large, skip it
            if (frameSize < 100 || frameSize > 2000) {
                return;
            }
        }

        // Update connection stats
        conn.framesReceived++;
        conn.bytesReceived += frameSize;
        conn.lastFrameTime = Date.now();

        // Update global stats
        this.stats.totalFrames++;
        this.stats.totalBytes += frameSize;

        // Create frame object
        const frame = {
            connectionId: connectionId,
            channelId: conn.channelId,
            language: conn.language,
            pcm: data,
            size: frameSize,
            timestamp: Date.now(),
            sequenceNumber: conn.framesReceived,
            sampleRate: SAMPLE_RATE,
            duration: FRAME_DURATION_MS
        };

        // Debug: Save occasional frames to verify audio quality
        if (conn.framesReceived % 50 === 0) {
            this.saveDebugFrame(frame);
        }

        // Emit pcm-frame event for ASR workers
        this.emit('pcm-frame', frame);

        // Log progress every 50 frames (1 second)
        if (conn.framesReceived % 50 === 0) {
            const elapsed = (Date.now() - conn.startTime) / 1000;
            const fps = conn.framesReceived / elapsed;
            console.log(`[ExternalMedia] ${connectionId}: ${conn.framesReceived} frames (${fps.toFixed(1)} fps, ${(conn.bytesReceived / 1024).toFixed(1)} KB)`);
        }
    }

    /**
     * Save debug frame for verification
     */
    saveDebugFrame(frame) {
        try {
            const debugPath = `/tmp/externalmedia-${frame.connectionId}-${frame.sequenceNumber}.wav`;
            const wavBuffer = this.createWavBuffer(frame.pcm);
            fs.writeFileSync(debugPath, wavBuffer);
            console.log(`[ExternalMedia] 🔍 Saved debug frame #${frame.sequenceNumber}: ${debugPath} (${(wavBuffer.length / 1024).toFixed(1)} KB)`);
        } catch (err) {
            console.error('[ExternalMedia] Debug save error:', err.message);
        }
    }

    /**
     * Create WAV file buffer from PCM data
     */
    createWavBuffer(pcmData) {
        const sampleRate = SAMPLE_RATE; // 16kHz
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * bitsPerSample / 8;
        const blockAlign = numChannels * bitsPerSample / 8;
        const dataSize = pcmData.length;
        const fileSize = 36 + dataSize;

        const header = Buffer.alloc(44);
        header.write('RIFF', 0);
        header.writeUInt32LE(fileSize, 4);
        header.write('WAVE', 8);
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20); // PCM
        header.writeUInt16LE(numChannels, 22);
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(byteRate, 28);
        header.writeUInt16LE(blockAlign, 32);
        header.writeUInt16LE(bitsPerSample, 34);
        header.write('data', 36);
        header.writeUInt32LE(dataSize, 40);

        return Buffer.concat([header, pcmData]);
    }

    /**
     * Handle connection disconnect
     */
    handleDisconnect(connectionId) {
        const conn = this.connections.get(connectionId);
        if (!conn) {
            return;
        }

        const duration = (Date.now() - conn.startTime) / 1000;
        console.log(`[ExternalMedia] Connection ${connectionId} closed:`, {
            duration: `${duration.toFixed(1)}s`,
            frames: conn.framesReceived,
            bytes: `${(conn.bytesReceived / 1024).toFixed(1)} KB`,
            avgFps: (conn.framesReceived / duration).toFixed(1)
        });

        this.connections.delete(connectionId);
        this.stats.activeConnections--;

        this.emit('disconnect', {
            connectionId,
            duration,
            framesReceived: conn.framesReceived,
            bytesReceived: conn.bytesReceived
        });
    }

    /**
     * Get connection statistics
     */
    getStats() {
        const connections = Array.from(this.connections.values()).map(conn => ({
            id: conn.id,
            channelId: conn.channelId,
            language: conn.language,
            frames: conn.framesReceived,
            bytes: conn.bytesReceived,
            uptime: (Date.now() - conn.startTime) / 1000,
            fps: conn.framesReceived / ((Date.now() - conn.startTime) / 1000)
        }));

        return {
            ...this.stats,
            connections,
            uptimeSeconds: process.uptime()
        };
    }

    /**
     * Stop orchestrator
     */
    stop() {
        console.log('[ExternalMedia] Stopping orchestrator...');

        // Close all connections
        for (const conn of this.connections.values()) {
            conn.ws.close();
        }
        this.connections.clear();

        // Close WebSocket server
        if (this.wss) {
            this.wss.close(() => {
                console.log('[ExternalMedia] ✓ Orchestrator stopped');
            });
        }
    }
}

module.exports = ExternalMediaOrchestrator;
