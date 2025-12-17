/**
 * Audio Streaming Extension for STTTTSserver - Aggressive Version
 * This module adds real-time audio streaming capabilities to STTTTSserver
 * by intercepting PCM audio data at multiple levels and broadcasting it via Socket.IO
 */

const EventEmitter = require('events');
const dgram = require('dgram');

class AudioStreamingExtension extends EventEmitter {
    constructor(io) {
        super();
        this.io = io;
        this.audioStreams = new Map(); // extensionId -> audio buffer
        this.subscriptions = new Map(); // extensionId -> Set of socket IDs
        this.interceptCount = 0;

        console.log('[AudioStream] ===========================================');
        console.log('[AudioStream] AGGRESSIVE AUDIO STREAMING EXTENSION LOADING');
        console.log('[AudioStream] ===========================================');

        // Setup Socket.IO handlers
        this.setupSocketHandlers();

        // Setup multiple layers of audio interception
        this.setupMultiLayerInterceptors();

        // Start periodic status logging
        this.startStatusLogger();
    }

    /**
     * Setup Socket.IO event handlers for audio streaming
     */
    setupSocketHandlers() {
        console.log('[AudioStream] Setting up Socket.IO handlers...');

        this.io.on('connection', (socket) => {
            console.log(`[AudioStream] ✅ Client connected for audio streaming: ${socket.id}`);

            // Handle audio stream subscription
            socket.on('subscribe-audio', (data) => {
                const { extensionId } = data;

                if (!extensionId) {
                    socket.emit('error', { message: 'Extension ID required' });
                    return;
                }

                // Add to subscription list
                if (!this.subscriptions.has(extensionId)) {
                    this.subscriptions.set(extensionId, new Set());
                }
                this.subscriptions.get(extensionId).add(socket.id);

                console.log(`[AudioStream] ✅ Socket ${socket.id} subscribed to extension ${extensionId}`);

                socket.emit('audio-subscribed', {
                    extensionId,
                    sampleRate: 16000,
                    format: 'pcm16'
                });

                // Send buffered audio if available
                const buffer = this.audioStreams.get(extensionId);
                if (buffer && buffer.length > 0) {
                    console.log(`[AudioStream] Sending ${buffer.length} bytes of buffered audio for ${extensionId}`);
                    socket.emit('audio-data', {
                        extensionId,
                        data: buffer.toString('base64'),
                        sampleRate: 16000,
                        format: 'pcm16'
                    });
                }
            });

            // Handle unsubscription
            socket.on('unsubscribe-audio', (data) => {
                const { extensionId } = data;

                if (this.subscriptions.has(extensionId)) {
                    this.subscriptions.get(extensionId).delete(socket.id);
                    console.log(`[AudioStream] Socket ${socket.id} unsubscribed from extension ${extensionId}`);
                }

                socket.emit('audio-unsubscribed', { extensionId });
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`[AudioStream] Client disconnected: ${socket.id}`);

                // Remove from all subscriptions
                for (const [ext, sockets] of this.subscriptions.entries()) {
                    sockets.delete(socket.id);
                }
            });
        });

        console.log('[AudioStream] ✅ Socket.IO handlers set up');
    }

    /**
     * Setup multiple layers of interceptors to capture audio data
     */
    setupMultiLayerInterceptors() {
        console.log('[AudioStream] Setting up multi-layer interceptors...');

        // Layer 1: Intercept activeSessions
        this.interceptActiveSessions();

        // Layer 2: Intercept global UDP sockets
        this.interceptUDPSockets();

        // Layer 3: Intercept dgram.createSocket
        this.interceptDgramCreateSocket();

        // Layer 4: Direct UDP port monitoring (shadow listening)
        this.setupShadowListeners();

        // Layer 5: Intercept processSTTTTS function if it exists
        this.interceptProcessFunction();

        console.log('[AudioStream] ✅ Multi-layer interceptors installed');
    }

    /**
     * Layer 1: Intercept activeSessions
     */
    interceptActiveSessions() {
        console.log('[AudioStream] Layer 1: Intercepting activeSessions...');

        if (global.activeSessions) {
            const originalMap = global.activeSessions;

            // Create a proxy for the session map
            global.activeSessions = new Proxy(originalMap, {
                set: (target, property, value) => {
                    console.log(`[AudioStream] Session being set for property: ${property}`);

                    // Intercept session creation
                    if (value && typeof value === 'object') {
                        const extensionId = property; // Usually the extension ID
                        console.log(`[AudioStream] Intercepting session for extension ${extensionId}`);
                        this.wrapSession(value, extensionId);
                    }

                    return Reflect.set(target, property, value);
                }
            });

            // Also wrap existing sessions
            for (const [extensionId, session] of originalMap.entries()) {
                if (session && !session._audioWrapped) {
                    console.log(`[AudioStream] Wrapping existing session for extension ${extensionId}`);
                    this.wrapSession(session, extensionId);
                }
            }

            console.log('[AudioStream] ✅ Layer 1: activeSessions intercepted');
        } else {
            console.log('[AudioStream] ⚠️ Layer 1: No global.activeSessions found');

            // Create it and wait for it to be populated
            global.activeSessions = new Map();
        }
    }

    /**
     * Layer 2: Intercept global UDP sockets
     */
    interceptUDPSockets() {
        console.log('[AudioStream] Layer 2: Intercepting global UDP sockets...');

        // Look for any global UDP sockets
        if (global.udpSocket3333) {
            this.wrapUDPSocket(global.udpSocket3333, '3333');
            console.log('[AudioStream] ✅ Wrapped global.udpSocket3333');
        }

        if (global.udpSocket4444) {
            this.wrapUDPSocket(global.udpSocket4444, '4444');
            console.log('[AudioStream] ✅ Wrapped global.udpSocket4444');
        }

        // Also check for arrays or maps of sockets
        if (global.udpSockets) {
            if (Array.isArray(global.udpSockets)) {
                global.udpSockets.forEach((socket, index) => {
                    this.wrapUDPSocket(socket, `unknown-${index}`);
                });
            } else if (global.udpSockets instanceof Map) {
                global.udpSockets.forEach((socket, key) => {
                    this.wrapUDPSocket(socket, key);
                });
            }
        }
    }

    /**
     * Layer 3: Intercept dgram.createSocket globally
     */
    interceptDgramCreateSocket() {
        console.log('[AudioStream] Layer 3: Intercepting dgram.createSocket...');

        const originalCreateSocket = dgram.createSocket;
        const self = this;

        dgram.createSocket = function(...args) {
            const socket = originalCreateSocket.apply(dgram, args);

            // Intercept bind to know which port
            const originalBind = socket.bind;
            socket.bind = function(port, ...bindArgs) {
                console.log(`[AudioStream] Socket binding to port ${port}`);

                // Determine extension ID from port
                let extensionId = null;
                if (port === 6120) extensionId = '3333';
                else if (port === 6121) extensionId = '4444';

                if (extensionId) {
                    console.log(`[AudioStream] ✅ Detected extension ${extensionId} on port ${port}`);
                    self.wrapUDPSocket(socket, extensionId);
                }

                return originalBind.call(socket, port, ...bindArgs);
            };

            return socket;
        };

        console.log('[AudioStream] ✅ Layer 3: dgram.createSocket intercepted');
    }

    /**
     * Layer 4: Setup shadow listeners on alternate ports
     */
    setupShadowListeners() {
        console.log('[AudioStream] Layer 4: Setting up shadow listeners...');

        // Try to create listeners on alternate ports that mirror the main ports
        const portMappings = {
            '3333': 16120, // Shadow port for 6120
            '4444': 16121  // Shadow port for 6121
        };

        for (const [extensionId, port] of Object.entries(portMappings)) {
            try {
                const shadowSocket = dgram.createSocket('udp4');

                shadowSocket.on('message', (msg, rinfo) => {
                    // This won't actually receive data unless we configure port mirroring
                    // But we set it up in case
                    this.captureAudio(extensionId, msg);
                });

                shadowSocket.on('error', (err) => {
                    if (err.code !== 'EADDRINUSE') {
                        console.log(`[AudioStream] Shadow port ${port} error:`, err.message);
                    }
                });

                shadowSocket.on('listening', () => {
                    console.log(`[AudioStream] ✅ Shadow listener on port ${port} for extension ${extensionId}`);
                });

                shadowSocket.bind(port, '127.0.0.1');
            } catch (err) {
                console.log(`[AudioStream] Could not create shadow listener on port ${port}:`, err.message);
            }
        }
    }

    /**
     * Layer 5: Intercept processSTTTTS or similar functions
     */
    interceptProcessFunction() {
        console.log('[AudioStream] Layer 5: Looking for process functions...');

        // Look for common function names
        const functionNames = [
            'processSTTTTS',
            'handleAudioData',
            'processAudioData',
            'handlePCMAudio',
            'processPCMAudio'
        ];

        for (const funcName of functionNames) {
            if (global[funcName] && typeof global[funcName] === 'function') {
                console.log(`[AudioStream] Found global.${funcName}, wrapping it...`);
                const originalFunc = global[funcName];

                global[funcName] = (extensionId, audioData, ...args) => {
                    this.captureAudio(extensionId, audioData);
                    return originalFunc(extensionId, audioData, ...args);
                };

                console.log(`[AudioStream] ✅ Wrapped global.${funcName}`);
            }
        }
    }

    /**
     * Wrap a session object to intercept audio data
     */
    wrapSession(session, extensionId) {
        if (session._audioWrapped) return;

        console.log(`[AudioStream] Wrapping session for extension ${extensionId}`);

        // Initialize buffer for this extension
        if (!this.audioStreams.has(extensionId)) {
            this.audioStreams.set(extensionId, Buffer.alloc(0));
        }

        // Wrap any method that might process audio
        const audioMethods = [
            'processAudio',
            'handleAudio',
            'processData',
            'handleData',
            'onMessage',
            'handleMessage'
        ];

        for (const methodName of audioMethods) {
            if (session[methodName] && typeof session[methodName] === 'function') {
                const originalMethod = session[methodName];

                session[methodName] = (...args) => {
                    // Try to find audio data in arguments
                    for (const arg of args) {
                        if (Buffer.isBuffer(arg) || (arg && arg.length > 100)) {
                            this.captureAudio(extensionId, arg);
                            break;
                        }
                    }

                    return originalMethod.apply(session, args);
                };

                console.log(`[AudioStream] ✅ Wrapped session.${methodName} for extension ${extensionId}`);
            }
        }

        // Also wrap any UDP socket in the session
        if (session.udpSocket || session.socket) {
            const socket = session.udpSocket || session.socket;
            this.wrapUDPSocket(socket, extensionId);
        }

        session._audioWrapped = true;
    }

    /**
     * Wrap a UDP socket to intercept messages
     */
    wrapUDPSocket(socket, extensionId) {
        if (!socket || socket._audioWrapped) return;

        console.log(`[AudioStream] Wrapping UDP socket for extension ${extensionId}`);

        // Intercept the 'message' event
        const originalEmit = socket.emit;
        const self = this;

        socket.emit = function(event, ...args) {
            if (event === 'message' && args[0]) {
                // Capture the audio data
                self.captureAudio(extensionId, args[0]);
            }

            return originalEmit.apply(socket, [event, ...args]);
        };

        // Also add a listener if not already present
        if (!socket._hasAudioListener) {
            socket.on('message', (msg) => {
                this.captureAudio(extensionId, msg);
            });
            socket._hasAudioListener = true;
        }

        socket._audioWrapped = true;
        console.log(`[AudioStream] ✅ UDP socket wrapped for extension ${extensionId}`);
    }

    /**
     * Capture and broadcast audio data
     */
    captureAudio(extensionId, audioData) {
        if (!audioData) return;

        // Convert to Buffer if needed
        const buffer = Buffer.isBuffer(audioData) ? audioData : Buffer.from(audioData);

        // Skip very small packets (likely not audio)
        if (buffer.length < 100) return;

        this.interceptCount++;

        // Update buffer (keep last 200KB for better buffering)
        let currentBuffer = this.audioStreams.get(extensionId) || Buffer.alloc(0);
        currentBuffer = Buffer.concat([currentBuffer, buffer]);
        if (currentBuffer.length > 200000) {
            currentBuffer = currentBuffer.slice(-200000);
        }
        this.audioStreams.set(extensionId, currentBuffer);

        // Broadcast to subscribers
        const subscribers = this.subscriptions.get(extensionId);
        if (subscribers && subscribers.size > 0) {
            const audioPacket = {
                extensionId,
                data: buffer.toString('base64'),
                sampleRate: 16000,
                format: 'pcm16',
                timestamp: Date.now(),
                sequenceNumber: this.interceptCount
            };

            for (const socketId of subscribers) {
                const socket = this.io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.emit('audio-data', audioPacket);
                }
            }

            // Log every 100th packet
            if (this.interceptCount % 100 === 0) {
                console.log(`[AudioStream] 📡 Broadcasting packet ${this.interceptCount} for ${extensionId} to ${subscribers.size} clients (${buffer.length} bytes)`);
            }
        }
    }

    /**
     * Start periodic status logger
     */
    startStatusLogger() {
        setInterval(() => {
            console.log('[AudioStream] ====== STATUS REPORT ======');
            console.log(`[AudioStream] Total packets intercepted: ${this.interceptCount}`);
            console.log(`[AudioStream] Active subscriptions:`);

            for (const [ext, sockets] of this.subscriptions.entries()) {
                const buffer = this.audioStreams.get(ext);
                const bufferSize = buffer ? buffer.length : 0;
                console.log(`[AudioStream]   - Extension ${ext}: ${sockets.size} clients, buffer: ${bufferSize} bytes`);
            }

            console.log('[AudioStream] ==========================');
        }, 30000); // Every 30 seconds
    }

    /**
     * Manual injection for testing
     */
    injectAudio(extensionId, audioData) {
        console.log(`[AudioStream] 💉 Manual audio injection for extension ${extensionId}`);
        this.captureAudio(extensionId, audioData);
    }
}

// Export the extension
module.exports = AudioStreamingExtension;

// Auto-initialize if global.io is available
if (global.io) {
    console.log('[AudioStream] 🚀 Auto-initializing with global.io');
    const extension = new AudioStreamingExtension(global.io);
    global.audioStreamingExtension = extension;

    // Try to find and wrap existing UDP sockets after a short delay
    setTimeout(() => {
        console.log('[AudioStream] Looking for UDP sockets to wrap...');

        // Check for sockets stored in various places
        const checkLocations = [
            global,
            global.app,
            global.server,
            global.stttsServer
        ];

        for (const location of checkLocations) {
            if (!location) continue;

            for (const key of Object.keys(location)) {
                const value = location[key];

                // Check if it looks like a UDP socket for our extensions
                if (key.includes('3333') || key.includes('6120')) {
                    if (value && typeof value.on === 'function') {
                        console.log(`[AudioStream] Found potential socket at ${key}`);
                        extension.wrapUDPSocket(value, '3333');
                    }
                }

                if (key.includes('4444') || key.includes('6121')) {
                    if (value && typeof value.on === 'function') {
                        console.log(`[AudioStream] Found potential socket at ${key}`);
                        extension.wrapUDPSocket(value, '4444');
                    }
                }
            }
        }
    }, 1000);

    console.log('[AudioStream] 🎯 Aggressive audio interception ready!');
} else {
    console.log('[AudioStream] ⚠️ No global.io available, extension not initialized');
}