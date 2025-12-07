/**
 * Audio Streaming Server for Station-3
 * Handles raw PCM audio streams (NOT RTP) and broadcasts via Socket.IO
 * Station-3 sends PCM 16kHz audio on ports 6120/6121
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const dgram = require('dgram');

class PCMAudioStreamingServer {
    constructor(config = {}) {
        this.config = {
            httpPort: config.httpPort || 3030,
            // Station-3 uses these ports for PCM audio
            pcmPorts: config.pcmPorts || {
                '3333': 6120,  // Extension 3333 receives audio on port 6120
                '4444': 6121   // Extension 4444 receives audio on port 6121
            },
            corsOrigin: config.corsOrigin || '*',
            sampleRate: config.sampleRate || 16000, // Station-3 uses 16kHz
            ...config
        };

        // Express app setup
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: this.config.corsOrigin,
                methods: ['GET', 'POST']
            },
            maxHttpBufferSize: 1e8 // 100 MB
        });

        // UDP listeners for PCM audio
        this.udpListeners = new Map();

        // Client subscriptions
        this.subscriptions = new Map(); // extensionId -> Set of socket IDs

        // Audio buffers
        this.audioBuffers = new Map();

        // Statistics
        this.stats = new Map();

        this.setupRoutes();
        this.setupSocketIO();
        this.setupPCMListeners();
    }

    /**
     * Setup Express routes
     */
    setupRoutes() {
        this.app.use(express.json());
        this.app.use(express.static('public'));

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                extensions: Object.keys(this.config.pcmPorts),
                clients: this.io.sockets.sockets.size,
                subscriptions: Array.from(this.subscriptions.entries()).map(([ext, sockets]) => ({
                    extension: ext,
                    subscribers: sockets.size
                })),
                uptime: process.uptime()
            });
        });

        // Stream statistics
        this.app.get('/api/streams', (req, res) => {
            const streams = [];
            for (const [ext, port] of Object.entries(this.config.pcmPorts)) {
                const stats = this.stats.get(ext) || { packets: 0, bytes: 0, lastPacket: null };
                streams.push({
                    extension: ext,
                    port: port,
                    stats: stats,
                    subscribers: (this.subscriptions.get(ext) || new Set()).size
                });
            }
            res.json({ streams });
        });
    }

    /**
     * Setup Socket.IO handlers
     */
    setupSocketIO() {
        this.io.on('connection', (socket) => {
            console.log(`[Audio Server] Client connected: ${socket.id}`);

            // Handle subscription to an extension's audio stream
            socket.on('subscribe', (data) => {
                const { extensionId } = data;

                if (!this.config.pcmPorts[extensionId]) {
                    socket.emit('error', { message: `Unknown extension: ${extensionId}` });
                    return;
                }

                // Add socket to subscription list
                if (!this.subscriptions.has(extensionId)) {
                    this.subscriptions.set(extensionId, new Set());
                }
                this.subscriptions.get(extensionId).add(socket.id);

                console.log(`[Audio Server] Socket ${socket.id} subscribed to extension ${extensionId}`);

                socket.emit('subscribed', {
                    extensionId,
                    port: this.config.pcmPorts[extensionId],
                    sampleRate: this.config.sampleRate
                });

                // Send any buffered audio
                const buffer = this.audioBuffers.get(extensionId);
                if (buffer && buffer.length > 0) {
                    socket.emit('audioData', {
                        extensionId,
                        data: buffer,
                        sampleRate: this.config.sampleRate,
                        format: 'pcm16'
                    });
                }
            });

            // Handle unsubscription
            socket.on('unsubscribe', (data) => {
                const { extensionId } = data;

                if (this.subscriptions.has(extensionId)) {
                    this.subscriptions.get(extensionId).delete(socket.id);
                    console.log(`[Audio Server] Socket ${socket.id} unsubscribed from extension ${extensionId}`);
                }

                socket.emit('unsubscribed', { extensionId });
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`[Audio Server] Client disconnected: ${socket.id}`);

                // Remove from all subscriptions
                for (const [ext, sockets] of this.subscriptions.entries()) {
                    sockets.delete(socket.id);
                }
            });
        });
    }

    /**
     * Setup PCM audio listeners on UDP ports
     */
    setupPCMListeners() {
        for (const [extensionId, port] of Object.entries(this.config.pcmPorts)) {
            const udpSocket = dgram.createSocket('udp4');

            udpSocket.on('message', (data, rinfo) => {
                // Update statistics
                if (!this.stats.has(extensionId)) {
                    this.stats.set(extensionId, { packets: 0, bytes: 0, lastPacket: null });
                }
                const stats = this.stats.get(extensionId);
                stats.packets++;
                stats.bytes += data.length;
                stats.lastPacket = new Date();

                // Store in buffer (keep last 100KB)
                if (!this.audioBuffers.has(extensionId)) {
                    this.audioBuffers.set(extensionId, Buffer.alloc(0));
                }
                let buffer = this.audioBuffers.get(extensionId);
                buffer = Buffer.concat([buffer, data]);
                if (buffer.length > 100000) {
                    buffer = buffer.slice(-100000);
                }
                this.audioBuffers.set(extensionId, buffer);

                // Broadcast to subscribed clients
                const subscribers = this.subscriptions.get(extensionId);
                if (subscribers && subscribers.size > 0) {
                    const audioPacket = {
                        extensionId,
                        data: data.toString('base64'), // Send as base64 for Socket.IO
                        sampleRate: this.config.sampleRate,
                        format: 'pcm16',
                        timestamp: Date.now()
                    };

                    for (const socketId of subscribers) {
                        const socket = this.io.sockets.sockets.get(socketId);
                        if (socket) {
                            socket.emit('audioData', audioPacket);
                        }
                    }

                    // Log periodically
                    if (stats.packets % 50 === 0) {
                        console.log(`[Audio Server] Extension ${extensionId}: ${stats.packets} packets, ${subscribers.size} subscribers`);
                    }
                }
            });

            udpSocket.on('error', (err) => {
                console.error(`[Audio Server] UDP error on port ${port} (ext ${extensionId}):`, err);
            });

            udpSocket.on('listening', () => {
                const address = udpSocket.address();
                console.log(`[Audio Server] Listening for PCM audio on ${address.address}:${address.port} (extension ${extensionId})`);
            });

            // Bind to the port
            udpSocket.bind(port, '0.0.0.0');
            this.udpListeners.set(extensionId, udpSocket);
        }
    }

    /**
     * Start the server
     */
    start() {
        this.server.listen(this.config.httpPort, () => {
            console.log(`[Audio Server] Socket.IO server running on port ${this.config.httpPort}`);
            console.log(`[Audio Server] Monitoring PCM audio for extensions:`, Object.keys(this.config.pcmPorts));
        });
    }

    /**
     * Stop the server
     */
    stop() {
        // Close UDP listeners
        for (const [ext, socket] of this.udpListeners.entries()) {
            socket.close();
            console.log(`[Audio Server] Closed UDP listener for extension ${ext}`);
        }

        // Close HTTP/Socket.IO server
        this.server.close(() => {
            console.log('[Audio Server] Server stopped');
        });
    }
}

// Start the server
if (require.main === module) {
    const server = new PCMAudioStreamingServer();
    server.start();

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('[Audio Server] Received SIGTERM, shutting down gracefully...');
        server.stop();
    });

    process.on('SIGINT', () => {
        console.log('[Audio Server] Received SIGINT, shutting down gracefully...');
        server.stop();
    });
}

module.exports = PCMAudioStreamingServer;