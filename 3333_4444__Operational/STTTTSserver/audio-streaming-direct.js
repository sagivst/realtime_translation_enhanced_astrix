/**
 * Direct Audio Streaming Extension for STTTTSserver
 * Directly intercepts the UDP socket variables used in STTTTSserver
 */

const EventEmitter = require('events');

class DirectAudioExtension extends EventEmitter {
    constructor(io) {
        super();
        this.io = io;
        this.audioBuffers = new Map();
        this.subscriptions = new Map();
        this.packetCounts = new Map();

        console.log('[DirectAudio] ====================================');
        console.log('[DirectAudio] DIRECT AUDIO EXTENSION INITIALIZING');
        console.log('[DirectAudio] ====================================');

        // Setup Socket.IO handlers
        this.setupSocketHandlers();

        // Start interceptor with retry logic
        this.startInterceptor();
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`[DirectAudio] Client connected: ${socket.id}`);

            socket.on('subscribe-audio', (data) => {
                const { extensionId } = data;

                if (!this.subscriptions.has(extensionId)) {
                    this.subscriptions.set(extensionId, new Set());
                }
                this.subscriptions.get(extensionId).add(socket.id);

                console.log(`[DirectAudio] ✅ Socket ${socket.id} subscribed to ${extensionId}`);

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

    startInterceptor() {
        let attempts = 0;
        const maxAttempts = 10;

        const tryIntercept = () => {
            attempts++;
            console.log(`[DirectAudio] Attempt ${attempts}/${maxAttempts} to find UDP sockets...`);

            let foundAny = false;

            // Look for the specific socket variables used in STTTTSserver
            const socketNames = [
                'socket3333In',
                'socket3333Out',
                'socket4444In',
                'socket4444Out'
            ];

            for (const socketName of socketNames) {
                if (global[socketName]) {
                    console.log(`[DirectAudio] ✅ Found global.${socketName}!`);
                    this.interceptSocket(global[socketName], socketName);
                    foundAny = true;
                }
            }

            // Also check for them in require.cache (loaded modules)
            for (const modulePath in require.cache) {
                const module = require.cache[modulePath];
                if (module && module.exports) {
                    for (const socketName of socketNames) {
                        if (module.exports[socketName]) {
                            console.log(`[DirectAudio] ✅ Found ${socketName} in module: ${modulePath}`);
                            this.interceptSocket(module.exports[socketName], socketName);
                            foundAny = true;
                        }
                    }
                }
            }

            // Check if STTTTSserver module exports them
            try {
                const sttttsPath = '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js';
                const stttts = require(sttttsPath);
                for (const socketName of socketNames) {
                    if (stttts[socketName]) {
                        console.log(`[DirectAudio] ✅ Found ${socketName} in STTTTSserver exports`);
                        this.interceptSocket(stttts[socketName], socketName);
                        foundAny = true;
                    }
                }
            } catch (err) {
                // STTTTSserver might not export them
            }

            if (!foundAny && attempts < maxAttempts) {
                console.log(`[DirectAudio] No sockets found yet, retrying in 2 seconds...`);
                setTimeout(tryIntercept, 2000);
            } else if (foundAny) {
                console.log(`[DirectAudio] ✅ Successfully intercepted sockets!`);
                this.startStatusLogger();
            } else {
                console.log(`[DirectAudio] ⚠️ Could not find UDP sockets after ${attempts} attempts`);
                console.log(`[DirectAudio] Will use alternative interception method...`);
                this.useAlternativeMethod();
            }
        };

        // Start trying immediately
        tryIntercept();
    }

    interceptSocket(socket, socketName) {
        if (!socket || socket._directAudioIntercepted) return;

        // Determine extension ID from socket name
        let extensionId = null;
        if (socketName.includes('3333')) extensionId = '3333';
        else if (socketName.includes('4444')) extensionId = '4444';

        if (!extensionId) return;

        console.log(`[DirectAudio] Intercepting ${socketName} for extension ${extensionId}`);

        // Initialize counters
        if (!this.packetCounts.has(extensionId)) {
            this.packetCounts.set(extensionId, 0);
        }
        if (!this.audioBuffers.has(extensionId)) {
            this.audioBuffers.set(extensionId, Buffer.alloc(0));
        }

        // Method 1: Add listener to existing socket
        socket.on('message', (msg, rinfo) => {
            this.handleAudioPacket(extensionId, msg);
        });

        // Method 2: Intercept the emit function
        const originalEmit = socket.emit;
        socket.emit = function(event, ...args) {
            if (event === 'message' && args[0]) {
                this.handleAudioPacket(extensionId, args[0]);
            }
            return originalEmit.apply(socket, [event, ...args]);
        }.bind(this);

        socket._directAudioIntercepted = true;
        console.log(`[DirectAudio] ✅ Socket ${socketName} intercepted successfully`);
    }

    useAlternativeMethod() {
        console.log('[DirectAudio] Using alternative method: intercepting processSTTTTS');

        // Look for the processSTTTTS function
        if (global.processSTTTTS) {
            const original = global.processSTTTTS;
            global.processSTTTTS = (extensionId, audioData, ...args) => {
                this.handleAudioPacket(extensionId, audioData);
                return original(extensionId, audioData, ...args);
            };
            console.log('[DirectAudio] ✅ Intercepted global.processSTTTTS');
        }

        // Start status logger anyway
        this.startStatusLogger();
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
                console.log(`[DirectAudio] 📡 Extension ${extensionId}: ${count + 1} packets sent to ${subscribers.size} clients`);
            }
        }
    }

    startStatusLogger() {
        setInterval(() => {
            console.log('[DirectAudio] === STATUS REPORT ===');
            for (const [ext, count] of this.packetCounts.entries()) {
                const subs = this.subscriptions.get(ext);
                const subCount = subs ? subs.size : 0;
                const buffer = this.audioBuffers.get(ext);
                const bufferSize = buffer ? buffer.length : 0;
                console.log(`[DirectAudio] Extension ${ext}: ${count} packets, ${subCount} subscribers, ${bufferSize} bytes buffered`);
            }
        }, 30000);
    }
}

// Export the extension
module.exports = DirectAudioExtension;

// Auto-initialize if global.io is available
if (global.io) {
    console.log('[DirectAudio] 🚀 Auto-initializing with global.io');
    const extension = new DirectAudioExtension(global.io);
    global.directAudioExtension = extension;

    // Also try to intercept any sockets that might be created later
    const dgram = require('dgram');
    const originalCreateSocket = dgram.createSocket;

    dgram.createSocket = function(...args) {
        const socket = originalCreateSocket.apply(dgram, args);

        // Intercept bind to identify which extension this is for
        const originalBind = socket.bind;
        socket.bind = function(port, ...bindArgs) {
            console.log(`[DirectAudio] New socket binding to port ${port}`);

            // Map port to extension
            let extensionId = null;
            if (port === 6120) {
                extensionId = '3333';
                global.socket3333In = socket;
            } else if (port === 6121) {
                extensionId = '4444';
                global.socket4444In = socket;
            }

            if (extensionId) {
                console.log(`[DirectAudio] Mapped port ${port} to extension ${extensionId}`);
                extension.interceptSocket(socket, `socket${extensionId}In`);
            }

            return originalBind.call(socket, port, ...bindArgs);
        };

        return socket;
    };

    console.log('[DirectAudio] 🎯 Direct audio interception ready!');
}