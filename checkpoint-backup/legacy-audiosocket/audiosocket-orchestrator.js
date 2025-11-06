/**
 * AudioSocket & WebSocket Hybrid Orchestrator
 *
 * Supports:
 * 1. TCP AudioSocket protocol (port 5050) - for extensions 5000, 6000
 * 2. WebSocket protocol (port 5051) - for extension 7000 conferencing
 *
 * Both protocols emit the same events for unified audio processing.
 */

const net = require('net');
const http = require('http');
const WebSocket = require('ws');
const { EventEmitter } = require('events');
const fs = require('fs');

const SAMPLE_RATE = 8000;  // 8kHz PCM
const FRAME_SIZE = 320;     // 20ms @ 8kHz = 160 samples × 2 bytes = 320 bytes

// AudioSocket frame types
const FRAME_TYPE = {
    HANGUP: 0x00,
    UUID: 0x01,
    AUDIO: 0x10,
    ERROR: 0xff
};

class AudioSocketOrchestrator extends EventEmitter {
    constructor(tcpPort = 5050, wsPort = 5051) {
        super();
        this.tcpPort = tcpPort;
        this.wsPort = wsPort;
        this.tcpServer = null;
        this.httpServer = null;
        this.wsServer = null;
        this.connections = new Map(); // connectionId -> connection info
        this.stats = {
            totalConnections: 0,
            activeConnections: 0,
            totalFrames: 0,
            totalBytes: 0,
            errors: 0
        };
    }


    /**
     * Map server port to extension ID
     * Port 5050 → Extension 7000
     * Port 5052 → Extension 7001
     */
    getExtensionFromPort(port) {
        const portMap = {
            5050: '7000',  // Main AudioSocket port → Extension 7000
            5051: '7000',  // WebSocket port → Extension 7000
            5052: '7001',  // Second AudioSocket port → Extension 7001
            5053: '7001'   // Second WebSocket port → Extension 7001 (future)
        };
        return portMap[port] || 'unknown';
    }
    /**
     * Start both TCP AudioSocket and WebSocket servers
     */
    start() {
        this.startTcpServer();
        this.startWebSocketServer();
    }

    /**
     * Start TCP AudioSocket server (for extensions 5000, 6000)
     */
    startTcpServer() {
        this.tcpServer = net.createServer((socket) => {
            this.handleTcpConnection(socket);
        });

        this.tcpServer.listen(this.tcpPort, () => {
            console.log(`[AudioSocket] ✓ TCP server listening on port ${this.tcpPort}`);
            console.log(`[AudioSocket] Protocol: AudioSocket 3-byte header (extensions 5000, 6000)`);
        });

        this.tcpServer.on('error', (error) => {
            console.error('[AudioSocket] TCP server error:', error);
            this.emit('error', error);
        });
    }

    /**
     * Start WebSocket server (for extension 7000 conferencing)
     */
    startWebSocketServer() {
        // Create HTTP server
        this.httpServer = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('WebSocket AudioSocket Server\n');
        });

        // Create WebSocket server attached to HTTP server
        // NOTE: No path restriction - we validate manually in handleWebSocketConnection
        this.wsServer = new WebSocket.Server({
            server: this.httpServer
        });

        this.wsServer.on('connection', (ws, req) => {
            this.handleWebSocketConnection(ws, req);
        });

        this.httpServer.listen(this.wsPort, () => {
            console.log(`[WebSocket] ✓ WebSocket server listening on port ${this.wsPort}`);
            console.log(`[WebSocket] Protocol: Raw PCM16 over WebSocket (extension 7000)`);
            console.log(`[WebSocket] URL pattern: ws://127.0.0.1:${this.wsPort}/mic/<PARTICIPANT_ID>`);
        });

        this.httpServer.on('error', (error) => {
            console.error('[WebSocket] HTTP server error:', error);
            this.emit('error', error);
        });
    }

    /**
     * Handle TCP AudioSocket connection (extensions 5000, 6000)
     */
    handleTcpConnection(socket) {
        const connectionId = `tcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const clientIp = socket.remoteAddress;
        const serverPort = socket.localPort;  // Which port received this connection
        const extensionId = this.getExtensionFromPort(serverPort);  // Map port → extension

        // CRITICAL FIX: Disable socket timeout (default is 2 minutes)
        // This prevents automatic disconnection during long calls
        socket.setTimeout(0);

        console.log(`[AudioSocket/TCP] ✓ New connection: ${connectionId} - Extension: ${extensionId}, from ${clientIp}`);

        const connectionInfo = {
            id: connectionId,
            type: 'tcp',
            extensionId: extensionId,  // Extension ID from port mapping (7000, 7001, etc)
            socket: socket,
            startTime: Date.now(),
            framesReceived: 0,
            audioFramesReceived: 0,
            bytesReceived: 0,
            framesSent: 0,           // Track outbound packets
            bytesSent: 0,            // Track outbound bytes
            lastFrameTime: Date.now(),
            lastSentTime: null,      // Track last outbound packet time
            uuid: null,
            buffer: Buffer.alloc(0),
            uuidReceived: false
        };

        this.connections.set(connectionId, connectionInfo);
        this.stats.totalConnections++;
        this.stats.activeConnections++;

        // Handle incoming data
        socket.on('data', (data) => {
            this.handleTcpData(connectionInfo, data);
        });

        // Handle connection close
        socket.on('close', () => {
            this.handleDisconnect(connectionInfo);
        });

        // Handle errors
        socket.on('error', (error) => {
            console.error(`[AudioSocket/TCP] Connection ${connectionId} error:`, error.message);
            this.stats.errors++;
        });

        // Emit connection event
        this.emit('connection', {
            connectionId,
            clientIp,
            protocol: 'tcp',
            timestamp: Date.now()
        });
    }

    /**
     * Handle WebSocket connection (extension 7000)
     */
    handleWebSocketConnection(ws, req) {
        // Validate path starts with /mic/
        if (!req.url || !req.url.startsWith('/mic/')) {
            console.warn(`[WebSocket] Invalid path: ${req.url} (expected /mic/<participant_id>)`);
            ws.close(1008, 'Invalid path. Expected /mic/<participant_id>');
            return;
        }

        // Parse URL to extract participant ID
        // URL format: /mic/<PARTICIPANT_ID> or /mic/<PARTICIPANT_ID>/slin16
        const urlParts = req.url.split('/').filter(p => p);
        const participantId = urlParts[1] || `participant_${Date.now()}`;

        const connectionId = `ws_${participantId}_${Date.now()}`;
        const clientIp = req.socket.remoteAddress;
        const serverPort = req.socket.localPort;  // WebSocket server port
        const extensionId = this.getExtensionFromPort(serverPort);  // Map port → extension

        console.log(`[WebSocket] ✓ New connection: ${connectionId} - Extension: , from ${clientIp}`);
        console.log(`[WebSocket] Participant ID: ${participantId}`);
        console.log(`[WebSocket] URL: ${req.url}`);
        console.log(`[WebSocket] ✓ New connection: ${connectionId} - Extension: ${extensionId}, from ${clientIp}`);
        const connectionInfo = {
            id: connectionId,
            type: 'websocket',
            extensionId: extensionId,  // Extension ID from WebSocket port
            socket: ws,
            startTime: Date.now(),
            framesReceived: 0,
            audioFramesReceived: 0,
            bytesReceived: 0,
            framesSent: 0,           // Track outbound packets
            bytesSent: 0,            // Track outbound bytes
            lastFrameTime: Date.now(),
            lastSentTime: null,      // Track last outbound packet time
            uuid: participantId,
            uuidReceived: true,  // WebSocket provides ID in URL
            participantId: participantId,
            audioBuffer: Buffer.alloc(0)
        };

        this.connections.set(connectionId, connectionInfo);
        this.stats.totalConnections++;
        this.stats.activeConnections++;

        // Handle incoming binary data (raw PCM audio)
        ws.on('message', (data) => {
            this.handleWebSocketData(connectionInfo, data);
        });

        // Handle connection close
        ws.on('close', () => {
            console.log(`[WebSocket] Connection ${connectionId} closed`);
            this.handleDisconnect(connectionInfo);
        });

        // Handle errors
        ws.on('error', (error) => {
            console.error(`[WebSocket] Connection ${connectionId} error:`, error.message);
            this.stats.errors++;
        });

        // Emit connection event
        this.emit('connection', {
            connectionId,
            clientIp,
            protocol: 'websocket',
            participantId,
            timestamp: Date.now()
        });

        // Emit immediate handshake event (WebSocket provides ID upfront)
        this.emit('handshake', {
            connectionId: connectionInfo.id,
            uuid: participantId,
            extensionId: connectionInfo.extensionId
        });
    }

    /**
     * Handle TCP AudioSocket data with 3-byte header protocol
     */
    handleTcpData(conn, data) {
        // Append to buffer
        conn.buffer = Buffer.concat([conn.buffer, data]);

        // Process frames with 3-byte header: [type][length_high][length_low][payload]
        while (conn.buffer.length >= 3) {
            // Read 3-byte header
            const frameType = conn.buffer.readUInt8(0);
            const frameLength = conn.buffer.readUInt16BE(1);  // Bytes 1-2 are length

            // Check if we have the complete frame (3-byte header + payload)
            if (conn.buffer.length < 3 + frameLength) {
                // Wait for more data
                break;
            }

            // Extract frame data (skip 3-byte header)
            const frameData = conn.buffer.slice(3, 3 + frameLength);
            conn.buffer = conn.buffer.slice(3 + frameLength);

            // Process based on frame type
            this.processTcpFrame(conn, frameType, frameData);
        }
    }

    /**
     * Handle WebSocket binary data (raw PCM audio)
     */
    handleWebSocketData(conn, data) {
        // WebSocket receives raw PCM16 audio data
        const audioData = Buffer.isBuffer(data) ? data : Buffer.from(data);

        // Accumulate audio into FRAME_SIZE chunks (320 bytes = 20ms)
        conn.audioBuffer = Buffer.concat([conn.audioBuffer, audioData]);

        // Process complete 20ms frames
        while (conn.audioBuffer.length >= FRAME_SIZE) {
            const frameData = conn.audioBuffer.slice(0, FRAME_SIZE);
            conn.audioBuffer = conn.audioBuffer.slice(FRAME_SIZE);

            // Process as audio frame
            this.handleAudioFrame(conn, frameData);
        }
    }

    /**
     * Process TCP AudioSocket frame based on type
     */
    processTcpFrame(conn, frameType, frameData) {
        conn.framesReceived++;

        // Debug: Log frame types for first 10 frames
        if (conn.framesReceived <= 10) {
            console.log(`[AudioSocket/DEBUG] Frame #${conn.framesReceived}: type=0x${frameType.toString(16).padStart(2, '0')}, length=${frameData.length}`);
        }

        switch (frameType) {
            case FRAME_TYPE.UUID:
                this.handleUUIDFrame(conn, frameData);
                break;

            case FRAME_TYPE.AUDIO:
                // Debug: Sample audio data for first few frames
                if (conn.audioFramesReceived < 3) {
                    const samples = [];
                    for (let i = 0; i < Math.min(10, frameData.length / 2); i++) {
                        samples.push(frameData.readInt16LE(i * 2));
                    }
                    console.log(`[AudioSocket/DEBUG] Audio frame #${conn.audioFramesReceived + 1} samples:`, samples);
                }
                this.handleAudioFrame(conn, frameData);
                break;

            case FRAME_TYPE.HANGUP:
                console.log(`[AudioSocket/TCP] Received HANGUP frame for ${conn.id}`);
                conn.socket.end();
                break;

            case FRAME_TYPE.ERROR:
                console.error(`[AudioSocket/TCP] Received ERROR frame for ${conn.id}:`, frameData.toString());
                this.stats.errors++;
                break;

            default:
                console.warn(`[AudioSocket/TCP] Unknown frame type 0x${frameType.toString(16)} for ${conn.id}`);
                this.stats.errors++;
                break;
        }
    }

    /**
     * Handle UUID frame (TCP only)
     */
    handleUUIDFrame(conn, frameData) {
        // CRITICAL: Asterisk sends UUID as 16 bytes of binary data, not UTF-8 string
        // Convert from binary to standard UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        let uuidString;
        
        if (Buffer.isBuffer(frameData) && frameData.length === 16) {
            // Convert 16 bytes to hex string
            const hex = frameData.toString("hex");
            // Format as UUID with hyphens: 8-4-4-4-12
            uuidString = hex.substring(0, 8) + "-" + 
                         hex.substring(8, 12) + "-" + 
                         hex.substring(12, 16) + "-" + 
                         hex.substring(16, 20) + "-" + 
                         hex.substring(20);
        } else if (typeof frameData === "string") {
            uuidString = frameData.trim();
        } else {
            // Fallback: try toString
            uuidString = String(frameData).trim();
        }
        
        conn.uuid = uuidString;
        conn.uuidReceived = true;
        console.log("[AudioSocket/TCP] ✓ Received UUID for " + conn.id + ": \"" + conn.uuid + "\"");

        this.emit("handshake", {
            connectionId: conn.id,
            uuid: conn.uuid,
            extensionId: conn.extensionId
        });
    }
    /**
     * Handle audio frame (both TCP and WebSocket)
     */
    handleAudioFrame(conn, frameData) {
        if (!conn.uuidReceived) {
            console.warn(`[${conn.type}] Received audio before UUID for ${conn.id}, dropping frame`);
            return;
        }

        conn.audioFramesReceived++;
        conn.bytesReceived += frameData.length;
        conn.lastFrameTime = Date.now();

        // Update global stats
        this.stats.totalFrames++;
        this.stats.totalBytes += frameData.length;

        // TEST: Echo audio back to establish bidirectional flow
        if (conn.audioFramesReceived <= 5) {
            console.log(`[AudioSocket/TEST] Echoing frame #${conn.audioFramesReceived} back to Asterisk`);
        }
        // DISABLED: Send audio back to maintain bidirectional connection (required by AudioSocket protocol)
        // this.sendAudio(conn.id, frameData);

        // Create frame object
        const frame = {
            connectionId: conn.id,
            uuid: String(conn.uuid || ""),  // Ensure UUID is always a string
            participantId: String(conn.participantId || conn.uuid || ""),  // Ensure participantId is always a string
            protocol: conn.type,
            extensionId: conn.extensionId,  // Extension ID (7000, 7001, etc) for filtering
            pcm: frameData,
            size: frameData.length,
            timestamp: Date.now(),
            sequenceNumber: conn.audioFramesReceived,
            sampleRate: SAMPLE_RATE,
            duration: 20  // 20ms frames
        };

        // Debug: Save occasional frames to verify audio quality
        if (conn.audioFramesReceived % 50 === 0) {
            this.saveDebugFrame(frame);
        }

        // Emit pcm-frame event for ASR workers
        this.emit('pcm-frame', frame);

        // Log progress every 50 frames (1 second)
        if (conn.audioFramesReceived % 50 === 0) {
            const elapsed = (Date.now() - conn.startTime) / 1000;
            const fps = conn.audioFramesReceived / elapsed;
            console.log(`[${conn.type.toUpperCase()}] ${conn.id}: ${conn.audioFramesReceived} frames (${fps.toFixed(1)} fps, ${(conn.bytesReceived / 1024).toFixed(1)} KB)`);
        }
    }

    /**
     * Save debug frame for verification
     */
    saveDebugFrame(frame) {
        try {
            const debugPath = `/tmp/audio-${frame.protocol}-${frame.connectionId}-${frame.sequenceNumber}.wav`;
            const wavBuffer = this.createWavBuffer(frame.pcm);
            fs.writeFileSync(debugPath, wavBuffer);
            console.log(`[Debug] 🔍 Saved frame #${frame.sequenceNumber}: ${debugPath} (${(wavBuffer.length / 1024).toFixed(1)} KB)`);
        } catch (err) {
            console.error('[Debug] Save error:', err.message);
        }
    }

    /**
     * Create WAV file buffer from PCM data
     */
    createWavBuffer(pcmData) {
        const sampleRate = SAMPLE_RATE; // 8kHz
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
     * Send audio frame to connection (for playback/mix-minus)
     */
    sendAudio(connectionId, pcmData) {
        const conn = this.connections.get(connectionId);
        if (!conn) {
            console.warn(`[AudioSocket] Connection ${connectionId} not found for sendAudio`);
            return false;
        }

        try {
            if (conn.type === 'tcp') {
                // TCP AudioSocket: Send with 3-byte header
                const frame = Buffer.alloc(3 + pcmData.length);
                frame.writeUInt8(FRAME_TYPE.AUDIO, 0);           // Type: 0x10 (audio)
                frame.writeUInt16BE(pcmData.length, 1);          // Length (bytes 1-2)
                pcmData.copy(frame, 3);                          // Payload starts at byte 3
                conn.socket.write(frame);
            } else if (conn.type === 'websocket') {
                // WebSocket: Send raw PCM data
                if (conn.socket.readyState === WebSocket.OPEN) {
                    conn.socket.send(pcmData, { binary: true });
                }
            }

            // Track outbound metrics
            conn.framesSent++;
            conn.bytesSent += pcmData.length;
            conn.lastSentTime = Date.now();

            // Emit outbound packet event for dashboard
            this.emit('outbound-packet', {
                bridgeId: conn.id,
                extension: conn.extensionId,
                uuid: conn.uuid,
                framesSent: conn.framesSent,
                bytesSent: conn.bytesSent,
                timestamp: conn.lastSentTime
            });

            return true;
        } catch (err) {
            console.error(`[AudioSocket] Error sending audio to ${connectionId}:`, err.message);
            return false;
        }
    }

    /**
     * Handle connection disconnect
     */
    handleDisconnect(conn) {
        const duration = (Date.now() - conn.startTime) / 1000;
        console.log(`[${conn.type.toUpperCase()}] Connection ${conn.id} closed:`, {
            duration: `${duration.toFixed(1)}s`,
            totalFrames: conn.framesReceived,
            audioFrames: conn.audioFramesReceived,
            bytes: `${(conn.bytesReceived / 1024).toFixed(1)} KB`,
            avgFps: (conn.audioFramesReceived / duration).toFixed(1)
        });

        this.connections.delete(conn.id);
        this.stats.activeConnections--;

        this.emit('disconnect', {
            connectionId: conn.id,
            uuid: conn.uuid,
            protocol: conn.type,
            extensionId: conn.extensionId,  // Extension ID (7000, 7001, etc) for filtering
            duration,
            framesReceived: conn.audioFramesReceived,
            bytesReceived: conn.bytesReceived
        });
    }

    /**
     * Get connection statistics
     */
    getStats() {
        const connections = Array.from(this.connections.values()).map(conn => ({
            id: conn.id,
            type: conn.type,
            uuid: conn.uuid,
            totalFrames: conn.framesReceived,
            audioFrames: conn.audioFramesReceived,
            bytes: conn.bytesReceived,
            uptime: (Date.now() - conn.startTime) / 1000,
            fps: conn.audioFramesReceived / ((Date.now() - conn.startTime) / 1000)
        }));

        return {
            ...this.stats,
            connections,
            uptimeSeconds: process.uptime()
        };
    }

    /**
     * Get all active connections (for conferencing/mix-minus)
     */
    getActiveConnections() {
        return Array.from(this.connections.values());
    }

    /**
     * Stop both servers
     */
    stop() {
        console.log('[AudioSocket] Stopping orchestrator...');

        // Close all connections
        for (const conn of this.connections.values()) {
            if (conn.type === 'tcp') {
                conn.socket.end();
            } else if (conn.type === 'websocket') {
                conn.socket.close();
            }
        }
        this.connections.clear();

        // Close TCP server
        if (this.tcpServer) {
            this.tcpServer.close(() => {
                console.log('[AudioSocket] ✓ TCP server stopped');
            });
        }

        // Close WebSocket server
        if (this.wsServer) {
            this.wsServer.close(() => {
                console.log('[WebSocket] ✓ WebSocket server stopped');
            });
        }

        // Close HTTP server
        if (this.httpServer) {
            this.httpServer.close(() => {
                console.log('[WebSocket] ✓ HTTP server stopped');
            });
        }
    }
}

module.exports = AudioSocketOrchestrator;
