/**
 * Global Audio Streaming Extension for STTTTSserver
 * Uses globally exposed UDP sockets from STTTTSserver
 */

const EventEmitter = require('events');

class GlobalAudioExtension extends EventEmitter {
    constructor(io) {
        super();
        this.io = io;
        this.audioBuffers = new Map();
        this.subscriptions = new Map();
        this.packetCounts = new Map();
        this.socketsIntercepted = false;

        console.log('[GlobalAudio] ===================================');
        console.log('[GlobalAudio] GLOBAL AUDIO EXTENSION INITIALIZING');
        console.log('[GlobalAudio] ===================================');

        // Setup Socket.IO handlers
        this.setupSocketHandlers();

        // Start looking for globally exposed sockets
        this.interceptGlobalSockets();

        // Start status logger
        this.startStatusLogger();
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`[GlobalAudio] Client connected: ${socket.id}`);

            socket.on('subscribe-audio', (data) => {
                const { extensionId } = data;

                if (!this.subscriptions.has(extensionId)) {
                    this.subscriptions.set(extensionId, new Set());
                }
                this.subscriptions.get(extensionId).add(socket.id);

                console.log(`[GlobalAudio] ✅ Socket ${socket.id} subscribed to ${extensionId}`);

                socket.emit('audio-subscribed', {
                    extensionId,
                    sampleRate: 16000,
                    format: 'pcm16'
                });

                // Send any buffered audio
                const buffer = this.audioBuffers.get(extensionId);
                if (buffer && buffer.length > 0) {
                    socket.emit('audio-data', {
                        extensionId,
                        data: buffer.toString('base64'),
                        sampleRate: 16000,
                        format: 'pcm16'
                    });
                }
            });

            socket.on('unsubscribe-audio', (data) => {
                const { extensionId } = data;
                if (this.subscriptions.has(extensionId)) {
                    this.subscriptions.get(extensionId).delete(socket.id);
                }
                socket.emit('audio-unsubscribed', { extensionId });
            });

            socket.on('disconnect', () => {
                for (const [ext, sockets] of this.subscriptions.entries()) {
                    sockets.delete(socket.id);
                }
            });
        });
    }

    interceptGlobalSockets() {
        let attempts = 0;
        const maxAttempts = 20;

        const checkForSockets = () => {
            attempts++;
            console.log(`[GlobalAudio] Attempt ${attempts}/${maxAttempts} to find global.udpSockets...`);

            if (global.udpSockets) {
                console.log('[GlobalAudio] ✅ Found global.udpSockets!');
                console.log('[GlobalAudio] Available sockets:', Object.keys(global.udpSockets));

                // Intercept each socket
                if (global.udpSockets.socket3333In) {
                    this.interceptSocket(global.udpSockets.socket3333In, '3333', 'In');
                }
                if (global.udpSockets.socket3333Out) {
                    this.interceptSocket(global.udpSockets.socket3333Out, '3333', 'Out');
                }
                if (global.udpSockets.socket4444In) {
                    this.interceptSocket(global.udpSockets.socket4444In, '4444', 'In');
                }
                if (global.udpSockets.socket4444Out) {
                    this.interceptSocket(global.udpSockets.socket4444Out, '4444', 'Out');
                }

                this.socketsIntercepted = true;
                console.log('[GlobalAudio] ✅ Successfully intercepted global UDP sockets!');

            } else if (attempts < maxAttempts) {
                console.log('[GlobalAudio] global.udpSockets not found yet, retrying in 1 second...');
                setTimeout(checkForSockets, 1000);
            } else {
                console.log('[GlobalAudio] ⚠️ Could not find global.udpSockets after 20 attempts');
                console.log('[GlobalAudio] Available globals:', Object.keys(global).filter(k => k.includes('socket') || k.includes('udp')));
            }
        };

        // Start checking immediately
        checkForSockets();
    }

    interceptSocket(socket, extensionId, direction) {
        if (!socket || socket._globalAudioIntercepted) return;

        console.log(`[GlobalAudio] Intercepting socket for extension ${extensionId} (${direction})`);

        // Initialize counters
        if (!this.packetCounts.has(extensionId)) {
            this.packetCounts.set(extensionId, 0);
        }
        if (!this.audioBuffers.has(extensionId)) {
            this.audioBuffers.set(extensionId, Buffer.alloc(0));
        }

        // Only intercept incoming sockets (In direction)
        if (direction === 'In') {
            // Add listener for message events
            socket.on('message', (msg, rinfo) => {
                this.handleAudioPacket(extensionId, msg);
            });

            // Also intercept the emit function
            const originalEmit = socket.emit;
            socket.emit = function(event, ...args) {
                if (event === 'message' && args[0]) {
                    this.handleAudioPacket(extensionId, args[0]);
                }
                return originalEmit.apply(socket, [event, ...args]);
            }.bind(this);

            console.log(`[GlobalAudio] ✅ Socket intercepted for extension ${extensionId} (${direction})`);
        }

        socket._globalAudioIntercepted = true;
    }

    handleAudioPacket(extensionId, audioData) {
        if (!audioData) return;

        const buffer = Buffer.isBuffer(audioData) ? audioData : Buffer.from(audioData);

        // Skip very small packets
        if (buffer.length < 100) return;

        // Update packet count
        const count = this.packetCounts.get(extensionId) || 0;
        this.packetCounts.set(extensionId, count + 1);

        // Update audio buffer (keep last 200KB)
        let currentBuffer = this.audioBuffers.get(extensionId) || Buffer.alloc(0);
        currentBuffer = Buffer.concat([currentBuffer, buffer]);
        if (currentBuffer.length > 200000) {
            currentBuffer = currentBuffer.slice(-200000);
        }
        this.audioBuffers.set(extensionId, currentBuffer);

        // Broadcast to subscribers
        const subscribers = this.subscriptions.get(extensionId);
        if (subscribers && subscribers.size > 0) {
            const audioPacket = {
                extensionId,
                data: buffer.toString('base64'),
                sampleRate: 16000,
                format: 'pcm16',
                timestamp: Date.now(),
                sequenceNumber: count + 1
            };

            for (const socketId of subscribers) {
                const socket = this.io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.emit('audio-data', audioPacket);
                }
            }

            // Log every 50th packet
            if ((count + 1) % 50 === 0) {
                console.log(`[GlobalAudio] 📡 Extension ${extensionId}: ${count + 1} packets sent to ${subscribers.size} clients`);
            }
        }
    }

    startStatusLogger() {
        setInterval(() => {
            console.log('[GlobalAudio] === STATUS REPORT ===');
            console.log(`[GlobalAudio] Sockets intercepted: ${this.socketsIntercepted}`);

            for (const [ext, count] of this.packetCounts.entries()) {
                const subs = this.subscriptions.get(ext);
                const subCount = subs ? subs.size : 0;
                const buffer = this.audioBuffers.get(ext);
                const bufferSize = buffer ? buffer.length : 0;
                console.log(`[GlobalAudio] Extension ${ext}: ${count} packets, ${subCount} subscribers, ${bufferSize} bytes buffered`);
            }

            if (this.packetCounts.size === 0) {
                console.log('[GlobalAudio] No audio packets captured yet');
            }
        }, 30000);
    }
}

// Export the extension
module.exports = GlobalAudioExtension;

// Auto-initialize if global.io is available
if (global.io) {
    console.log('[GlobalAudio] 🚀 Auto-initializing with global.io');
    const extension = new GlobalAudioExtension(global.io);
    global.globalAudioExtension = extension;
    console.log('[GlobalAudio] 🎯 Global audio extension ready!');
}