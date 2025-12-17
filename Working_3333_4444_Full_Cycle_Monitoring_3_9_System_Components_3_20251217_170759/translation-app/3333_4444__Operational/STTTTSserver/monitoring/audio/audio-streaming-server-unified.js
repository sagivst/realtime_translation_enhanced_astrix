/**
 * Unified Audio Streaming Server
 * Handles BOTH RTP and PCM audio streams automatically
 * Supports all station types in the system
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const dgram = require('dgram');

// Station configuration mapping
const STATION_CONFIG = {
    // Station-3 uses PCM format on these ports
    'STATION_3': {
        format: 'pcm',
        extensions: {
            '3333': { port: 6120, sampleRate: 16000 },
            '4444': { port: 6121, sampleRate: 16000 }
        }
    },
    // Asterisk stations use RTP format
    'STATION_1': {
        format: 'rtp',
        extensions: {
            '1001': { port: 10000 },
            '1002': { port: 10002 }
        }
    },
    'STATION_2': {
        format: 'rtp',
        extensions: {
            '2001': { port: 11000 },
            '2002': { port: 11002 }
        }
    }
};

class UnifiedAudioStreamingServer {
    constructor(config = {}) {
        this.config = {
            httpPort: config.httpPort || 3030,
            corsOrigin: config.corsOrigin || '*',
            ...config
        };

        // Build port mapping for quick lookup
        this.portToStation = {};
        for (const [stationId, stationConfig] of Object.entries(STATION_CONFIG)) {
            for (const [extId, extConfig] of Object.entries(stationConfig.extensions)) {
                this.portToStation[extConfig.port] = {
                    stationId,
                    extensionId: extId,
                    format: stationConfig.format,
                    sampleRate: extConfig.sampleRate || 8000
                };
            }
        }

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

        // UDP listeners for audio
        this.udpListeners = new Map();

        // RTP converters
        this.rtpConverters = new Map();

        // Client subscriptions
        this.subscriptions = new Map(); // extensionId -> Set of socket IDs

        // Audio buffers
        this.audioBuffers = new Map();

        // Statistics
        this.stats = new Map();

        this.setupRoutes();
        this.setupSocketIO();
        this.setupAudioListeners();
    }

    /**
     * Setup Express routes
     */
    setupRoutes() {
        this.app.use(express.json());
        this.app.use(express.static('public'));

        // Health check
        this.app.get('/health', (req, res) => {
            const stations = [];
            for (const [stationId, config] of Object.entries(STATION_CONFIG)) {
                stations.push({
                    id: stationId,
                    format: config.format,
                    extensions: Object.keys(config.extensions)
                });
            }

            res.json({
                status: 'ok',
                stations,
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

            for (const [stationId, stationConfig] of Object.entries(STATION_CONFIG)) {
                for (const [extId, extConfig] of Object.entries(stationConfig.extensions)) {
                    const stats = this.stats.get(extId) || { packets: 0, bytes: 0, lastPacket: null };
                    streams.push({
                        station: stationId,
                        extension: extId,
                        port: extConfig.port,
                        format: stationConfig.format,
                        stats: stats,
                        subscribers: (this.subscriptions.get(extId) || new Set()).size
                    });
                }
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
                const { extensionId, port } = data;

                // Find station config for this extension
                let foundStation = null;
                let foundConfig = null;

                for (const [stationId, stationConfig] of Object.entries(STATION_CONFIG)) {
                    if (stationConfig.extensions[extensionId]) {
                        foundStation = stationId;
                        foundConfig = stationConfig.extensions[extensionId];
                        break;
                    }
                }

                if (!foundStation) {
                    socket.emit('error', { message: `Unknown extension: ${extensionId}` });
                    return;
                }

                // Add socket to subscription list
                if (!this.subscriptions.has(extensionId)) {
                    this.subscriptions.set(extensionId, new Set());
                }
                this.subscriptions.get(extensionId).add(socket.id);

                console.log(`[Audio Server] Socket ${socket.id} subscribed to ${foundStation}/${extensionId}`);

                socket.emit('subscribed', {
                    extensionId,
                    stationId: foundStation,
                    port: foundConfig.port,
                    format: STATION_CONFIG[foundStation].format,
                    sampleRate: foundConfig.sampleRate || 8000
                });

                // Send any buffered audio
                const buffer = this.audioBuffers.get(extensionId);
                if (buffer && buffer.length > 0) {
                    socket.emit('audioData', {
                        extensionId,
                        stationId: foundStation,
                        data: buffer.toString('base64'),
                        format: STATION_CONFIG[foundStation].format,
                        sampleRate: foundConfig.sampleRate || 8000
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
     * Setup audio listeners for all configured ports
     */
    setupAudioListeners() {
        for (const [stationId, stationConfig] of Object.entries(STATION_CONFIG)) {
            for (const [extensionId, extConfig] of Object.entries(stationConfig.extensions)) {
                const port = extConfig.port;
                const format = stationConfig.format;

                console.log(`[Audio Server] Setting up ${format.toUpperCase()} listener on port ${port} for ${stationId}/${extensionId}`);

                const udpSocket = dgram.createSocket('udp4');

                udpSocket.on('message', (data, rinfo) => {
                    // Process based on format
                    if (format === 'rtp') {
                        this.handleRTPPacket(data, extensionId, stationId, extConfig);
                    } else if (format === 'pcm') {
                        this.handlePCMPacket(data, extensionId, stationId, extConfig);
                    }
                });

                udpSocket.on('error', (err) => {
                    console.error(`[Audio Server] UDP error on port ${port} (${stationId}/${extensionId}):`, err);
                });

                udpSocket.on('listening', () => {
                    const address = udpSocket.address();
                    console.log(`[Audio Server] Listening for ${format.toUpperCase()} audio on ${address.address}:${address.port} (${stationId}/${extensionId})`);
                });

                // Bind to the port
                udpSocket.bind(port, '0.0.0.0');
                this.udpListeners.set(`${stationId}-${extensionId}`, udpSocket);
            }
        }
    }

    /**
     * Handle RTP packet (for Asterisk stations)
     */
    handleRTPPacket(rtpPacket, extensionId, stationId, config) {
        // Parse RTP header
        const version = (rtpPacket[0] >> 6) & 0x03;
        const payloadType = rtpPacket[1] & 0x7F;
        const sequenceNumber = rtpPacket.readUInt16BE(2);
        const timestamp = rtpPacket.readUInt32BE(4);
        const ssrc = rtpPacket.readUInt32BE(8);

        // Extract payload (skip 12-byte RTP header)
        const payload = rtpPacket.slice(12);

        // Convert μ-law/A-law to PCM if needed
        let pcmData = payload;
        if (payloadType === 0) { // PCMU
            pcmData = this.ulawToPCM(payload);
        } else if (payloadType === 8) { // PCMA
            pcmData = this.alawToPCM(payload);
        }

        this.processAudioData(pcmData, extensionId, stationId, config.sampleRate || 8000, 'rtp');
    }

    /**
     * Handle PCM packet (for Station-3)
     */
    handlePCMPacket(pcmData, extensionId, stationId, config) {
        this.processAudioData(pcmData, extensionId, stationId, config.sampleRate || 16000, 'pcm');
    }

    /**
     * Process audio data and broadcast to subscribers
     */
    processAudioData(audioData, extensionId, stationId, sampleRate, originalFormat) {
        // Update statistics
        if (!this.stats.has(extensionId)) {
            this.stats.set(extensionId, { packets: 0, bytes: 0, lastPacket: null });
        }
        const stats = this.stats.get(extensionId);
        stats.packets++;
        stats.bytes += audioData.length;
        stats.lastPacket = new Date();

        // Store in buffer (keep last 100KB)
        if (!this.audioBuffers.has(extensionId)) {
            this.audioBuffers.set(extensionId, Buffer.alloc(0));
        }
        let buffer = this.audioBuffers.get(extensionId);
        buffer = Buffer.concat([buffer, audioData]);
        if (buffer.length > 100000) {
            buffer = buffer.slice(-100000);
        }
        this.audioBuffers.set(extensionId, buffer);

        // Broadcast to subscribed clients
        const subscribers = this.subscriptions.get(extensionId);
        if (subscribers && subscribers.size > 0) {
            const audioPacket = {
                extensionId,
                stationId,
                data: audioData.toString('base64'), // Send as base64 for Socket.IO
                sampleRate,
                format: 'pcm16', // Always send as PCM to clients
                originalFormat, // Let client know the original format
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
                console.log(`[Audio Server] ${stationId}/${extensionId}: ${stats.packets} packets, ${subscribers.size} subscribers`);
            }
        }
    }

    /**
     * μ-law to PCM conversion
     */
    ulawToPCM(ulawData) {
        const ULAW_TABLE = [-32124,-31100,-30076,-29052,-28028,-27004,-25980,-24956,
                           -23932,-22908,-21884,-20860,-19836,-18812,-17788,-16764,
                           -15996,-15484,-14972,-14460,-13948,-13436,-12924,-12412,
                           -11900,-11388,-10876,-10364,-9852,-9340,-8828,-8316,
                           -7932,-7676,-7420,-7164,-6908,-6652,-6396,-6140,
                           -5884,-5628,-5372,-5116,-4860,-4604,-4348,-4092,
                           -3900,-3772,-3644,-3516,-3388,-3260,-3132,-3004,
                           -2876,-2748,-2620,-2492,-2364,-2236,-2108,-1980,
                           -1884,-1820,-1756,-1692,-1628,-1564,-1500,-1436,
                           -1372,-1308,-1244,-1180,-1116,-1052,-988,-924,
                           -876,-844,-812,-780,-748,-716,-684,-652,
                           -620,-588,-556,-524,-492,-460,-428,-396,
                           -372,-356,-340,-324,-308,-292,-276,-260,
                           -244,-228,-212,-196,-180,-164,-148,-132,
                           -120,-112,-104,-96,-88,-80,-72,-64,
                           -56,-48,-40,-32,-24,-16,-8,0,
                           32124,31100,30076,29052,28028,27004,25980,24956,
                           23932,22908,21884,20860,19836,18812,17788,16764,
                           15996,15484,14972,14460,13948,13436,12924,12412,
                           11900,11388,10876,10364,9852,9340,8828,8316,
                           7932,7676,7420,7164,6908,6652,6396,6140,
                           5884,5628,5372,5116,4860,4604,4348,4092,
                           3900,3772,3644,3516,3388,3260,3132,3004,
                           2876,2748,2620,2492,2364,2236,2108,1980,
                           1884,1820,1756,1692,1628,1564,1500,1436,
                           1372,1308,1244,1180,1116,1052,988,924,
                           876,844,812,780,748,716,684,652,
                           620,588,556,524,492,460,428,396,
                           372,356,340,324,308,292,276,260,
                           244,228,212,196,180,164,148,132,
                           120,112,104,96,88,80,72,64,
                           56,48,40,32,24,16,8,0];

        const pcmData = Buffer.alloc(ulawData.length * 2); // 16-bit PCM
        for (let i = 0; i < ulawData.length; i++) {
            const sample = ULAW_TABLE[ulawData[i]];
            pcmData.writeInt16LE(sample, i * 2);
        }
        return pcmData;
    }

    /**
     * A-law to PCM conversion
     */
    alawToPCM(alawData) {
        const ALAW_TABLE = [-5504,-5248,-6016,-5760,-4480,-4224,-4992,-4736,
                           -7552,-7296,-8064,-7808,-6528,-6272,-7040,-6784,
                           -2752,-2624,-3008,-2880,-2240,-2112,-2496,-2368,
                           -3776,-3648,-4032,-3904,-3264,-3136,-3520,-3392,
                           -22016,-20992,-24064,-23040,-17920,-16896,-19968,-18944,
                           -30208,-29184,-32256,-31232,-26112,-25088,-28160,-27136,
                           -11008,-10496,-12032,-11520,-8960,-8448,-9984,-9472,
                           -15104,-14592,-16128,-15616,-13056,-12544,-14080,-13568,
                           -344,-328,-376,-360,-280,-264,-312,-296,
                           -472,-456,-504,-488,-408,-392,-440,-424,
                           -88,-72,-120,-104,-24,-8,-56,-40,
                           -216,-200,-248,-232,-152,-136,-184,-168,
                           -1376,-1312,-1504,-1440,-1120,-1056,-1248,-1184,
                           -1888,-1824,-2016,-1952,-1632,-1568,-1760,-1696,
                           -688,-656,-752,-720,-560,-528,-624,-592,
                           -944,-912,-1008,-976,-816,-784,-880,-848,
                           5504,5248,6016,5760,4480,4224,4992,4736,
                           7552,7296,8064,7808,6528,6272,7040,6784,
                           2752,2624,3008,2880,2240,2112,2496,2368,
                           3776,3648,4032,3904,3264,3136,3520,3392,
                           22016,20992,24064,23040,17920,16896,19968,18944,
                           30208,29184,32256,31232,26112,25088,28160,27136,
                           11008,10496,12032,11520,8960,8448,9984,9472,
                           15104,14592,16128,15616,13056,12544,14080,13568,
                           344,328,376,360,280,264,312,296,
                           472,456,504,488,408,392,440,424,
                           88,72,120,104,24,8,56,40,
                           216,200,248,232,152,136,184,168,
                           1376,1312,1504,1440,1120,1056,1248,1184,
                           1888,1824,2016,1952,1632,1568,1760,1696,
                           688,656,752,720,560,528,624,592,
                           944,912,1008,976,816,784,880,848];

        const pcmData = Buffer.alloc(alawData.length * 2); // 16-bit PCM
        for (let i = 0; i < alawData.length; i++) {
            const sample = ALAW_TABLE[alawData[i]];
            pcmData.writeInt16LE(sample, i * 2);
        }
        return pcmData;
    }

    /**
     * Start the server
     */
    start() {
        this.server.listen(this.config.httpPort, () => {
            console.log(`[Audio Server] Unified audio streaming server running on port ${this.config.httpPort}`);
            console.log('[Audio Server] Supporting stations:', Object.keys(STATION_CONFIG));

            // List all monitored ports
            const ports = [];
            for (const [stationId, config] of Object.entries(STATION_CONFIG)) {
                for (const [extId, extConfig] of Object.entries(config.extensions)) {
                    ports.push(`${extId}:${extConfig.port} (${config.format})`);
                }
            }
            console.log('[Audio Server] Monitoring ports:', ports.join(', '));
        });
    }

    /**
     * Stop the server
     */
    stop() {
        // Close UDP listeners
        for (const [key, socket] of this.udpListeners.entries()) {
            socket.close();
            console.log(`[Audio Server] Closed UDP listener for ${key}`);
        }

        // Close HTTP/Socket.IO server
        this.server.close(() => {
            console.log('[Audio Server] Server stopped');
        });
    }
}

// Start the server
if (require.main === module) {
    const server = new UnifiedAudioStreamingServer();
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

module.exports = UnifiedAudioStreamingServer;