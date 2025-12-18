/**
 * Bidirectional Translation Timing & Buffer Server
 * Simplified Version - 1:1 Extension Pairs Only
 */

const net = require('net');
const http = require('http');

// ============================================================================
// EXTENSION PAIR TRACKING
// ============================================================================

class ExtensionPairManager {
    constructor() {
        this.activePairs = new Map(); // key: extension, value: { paired, sessionId, bridgeId }
        this.latencyStats = new Map(); // key: 'ext1→ext2', value: { avg, samples }
        this.activeExtensions = new Map(); // key: extension, value: { uuid, timestamp }
    }

    registerExtension(extension, uuid) {
        console.log(`[BiDir] Extension ${extension} registered (UUID: ${uuid})`);

        // Track this extension as active
        this.activeExtensions.set(extension, { uuid, timestamp: Date.now() });

        // Check if we have both 7000 and 7001 now
        if (this.activeExtensions.has('7000') && this.activeExtensions.has('7001')) {
            // Both extensions active - create pair if not already paired
            if (!this.activePairs.has('7000')) {
                console.log('[BiDir] *** Both extensions 7000 and 7001 active - auto-pairing ***');
                const callUuid = 'pair-' + Date.now();
                this.registerPair('7000', '7001', callUuid);
            }
        }
    }

    registerPair(ext1, ext2, callUuid) {
        const sessionId = `${ext1}-${ext2}-${callUuid}`;
        
        this.activePairs.set(ext1, {
            paired: ext2,
            sessionId,
            bridge: `bridge-${ext2}`,
            startTime: Date.now(),
            callUuid
        });
        
        this.activePairs.set(ext2, {
            paired: ext1,
            sessionId,
            bridge: `bridge-${ext1}`,
            startTime: Date.now(),
            callUuid
        });
        
        // Initialize latency tracking
        this.latencyStats.set(`${ext1}→${ext2}`, { avg: 0, samples: [] });
        this.latencyStats.set(`${ext2}→${ext1}`, { avg: 0, samples: [] });
        
        console.log(`[Pair] ✓ Registered: ${ext1} ↔ ${ext2} (Session: ${sessionId})`);
        
        return sessionId;
    }

    getPair(extension) {
        return this.activePairs.get(extension);
    }

    updateLatency(fromExt, toExt, latencyMs) {
        const key = `${fromExt}→${toExt}`;
        const stats = this.latencyStats.get(key);
        
        if (!stats) return;
        
        stats.samples.push(latencyMs);
        
        // Keep only last 10 samples
        if (stats.samples.length > 10) {
            stats.samples.shift();
        }
        
        // Calculate moving average
        stats.avg = Math.round(stats.samples.reduce((a, b) => a + b, 0) / stats.samples.length);
    }

    getLatencyDifference(ext1, ext2) {
        const stats1 = this.latencyStats.get(`${ext1}→${ext2}`);
        const stats2 = this.latencyStats.get(`${ext2}→${ext1}`);
        
        if (!stats1 || !stats2) return 0;
        
        return stats1.avg - stats2.avg;
    }

    getAllPairs() {
        const pairs = [];
        const seen = new Set();
        
        for (const [ext, info] of this.activePairs) {
            const pairKey = [ext, info.paired].sort().join('-');
            if (!seen.has(pairKey)) {
                seen.add(pairKey);
                const stats1 = this.latencyStats.get(`${ext}→${info.paired}`);
                const stats2 = this.latencyStats.get(`${info.paired}→${ext}`);
                pairs.push({
                    ext1: ext,
                    ext2: info.paired,
                    sessionId: info.sessionId,
                    latency1: stats1?.avg || 0,
                    latency2: stats2?.avg || 0
                });
            }
        }
        
        return pairs;
    }

    removePair(extension) {
        const pairInfo = this.activePairs.get(extension);
        if (!pairInfo) return;
        
        const paired = pairInfo.paired;
        
        this.activePairs.delete(extension);
        this.activePairs.delete(paired);
        
        this.latencyStats.delete(`${extension}→${paired}`);
        this.latencyStats.delete(`${paired}→${extension}`);
        
        console.log(`[Pair] ✗ Removed: ${extension} ↔ ${paired}`);
    }
}

// ============================================================================
// LATENCY BUFFER
// ============================================================================

class LatencyBuffer {
    constructor(sendMessageCallback) {
        this.buffers = new Map(); // key: extension, value: array of buffered packets
        this.processingTimers = new Map();
        this.sendMessage = sendMessageCallback; // Callback to send INJECT_AUDIO messages
    }

    enqueue(extension, packet, delayMs = 0) {
        if (!this.buffers.has(extension)) {
            this.buffers.set(extension, []);
        }
        
        const buffer = this.buffers.get(extension);
        
        buffer.push({
            packet,
            timestamp: Date.now(),
            delayMs,
            targetTime: Date.now() + delayMs
        });
        
        // Start processing if not already running
        if (!this.processingTimers.has(extension)) {
            this.startProcessing(extension);
        }
    }

    startProcessing(extension) {
        const processNext = () => {
            const buffer = this.buffers.get(extension);
            
            if (!buffer || buffer.length === 0) {
                clearTimeout(this.processingTimers.get(extension));
                this.processingTimers.delete(extension);
                return;
            }
            
            const now = Date.now();
            const item = buffer[0];
            
            if (now >= item.targetTime) {
                buffer.shift();

                // Send INJECT_AUDIO message back to conference server
                this.sendMessage(extension, {
                    type: 'INJECT_AUDIO',
                    toExtension: extension,
                    audioData: item.packet.toString('base64'),
                    timestamp: item.timestamp
                });

                setImmediate(processNext);
            } else {
                const waitTime = item.targetTime - now;
                const timer = setTimeout(processNext, waitTime);
                this.processingTimers.set(extension, timer);
            }
        };
        
        processNext();
    }

    clear(extension) {
        if (this.processingTimers.has(extension)) {
            clearTimeout(this.processingTimers.get(extension));
            this.processingTimers.delete(extension);
        }
        this.buffers.delete(extension);
    }
}

// ============================================================================
// AUDIO INJECTOR - ARI ExternalMedia
// ============================================================================

class AudioInjector {
    constructor(ariHost = '127.0.0.1', ariPort = 8088, ariUser = 'dev', ariPass = 'asterisk') {
        this.ariHost = ariHost;
        this.ariPort = ariPort;
        this.ariUser = ariUser;
        this.ariPass = ariPass;
        this.channels = new Map(); // key: extension, value: { channelId, ws }
    }

    async initChannel(extension, bridgeId) {
        console.log(`[Injector] Initializing channel for ext ${extension} → bridge ${bridgeId}`);
        
        try {
            // Create external media channel
            const channelId = `injection-${extension}-${Date.now()}`;
            
            const response = await this.ariRequest('POST', `/channels/externalMedia`, {
                app: 'translation-bridge',
                external_host: '127.0.0.1:5060',
                format: 'slin16',
                channelId: channelId
            });
            
            console.log(`[Injector] ✓ Channel created: ${channelId}`);
            
            // Add channel to bridge
            await this.ariRequest('POST', `/bridges/${bridgeId}/addChannel`, {
                channel: channelId
            });
            
            console.log(`[Injector] ✓ Channel added to bridge: ${bridgeId}`);
            
            this.channels.set(extension, { channelId, bridgeId });
            
            return channelId;
        } catch (err) {
            console.error(`[Injector] ✗ Failed to init channel:`, err.message);
            return null;
        }
    }

    async inject(extension, audioBuffer) {
        const channel = this.channels.get(extension);
        
        if (!channel) {
            console.error(`[Injector] ✗ No channel for extension ${extension}`);
            return;
        }
        
        try {
            // Send audio via ARI
            await this.ariRequest('POST', `/channels/${channel.channelId}/externalMedia`, audioBuffer, {
                'Content-Type': 'application/octet-stream'
            });
            
            console.log(`[Injector] → Injected ${audioBuffer.length} bytes to ext ${extension}`);
        } catch (err) {
            console.error(`[Injector] ✗ Injection failed:`, err.message);
        }
    }

    async closeChannel(extension) {
        const channel = this.channels.get(extension);
        if (!channel) return;
        
        try {
            await this.ariRequest('DELETE', `/channels/${channel.channelId}`);
            console.log(`[Injector] ✓ Channel closed: ${extension}`);
            this.channels.delete(extension);
        } catch (err) {
            console.error(`[Injector] ✗ Failed to close channel:`, err.message);
        }
    }

    ariRequest(method, path, body = null, headers = {}) {
        return new Promise((resolve, reject) => {
            const auth = Buffer.from(`${this.ariUser}:${this.ariPass}`).toString('base64');
            
            const options = {
                hostname: this.ariHost,
                port: this.ariPort,
                path: `/ari${path}`,
                method: method,
                headers: {
                    'Authorization': `Basic ${auth}`,
                    ...headers
                }
            };
            
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data ? JSON.parse(data) : {});
                    } else {
                        reject(new Error(`ARI request failed: ${res.statusCode} ${data}`));
                    }
                });
            });
            
            req.on('error', reject);
            
            if (body) {
                if (Buffer.isBuffer(body)) {
                    req.write(body);
                } else {
                    req.write(JSON.stringify(body));
                }
            }
            
            req.end();
        });
    }
}

// ============================================================================
// TIMING SERVER
// ============================================================================

class TimingServer {
    constructor(port = 6000) {
        this.port = port;
        this.pairManager = new ExtensionPairManager();
        this.conferenceSocket = null; // Track conference server socket for sending messages back
        this.latencyBuffer = new LatencyBuffer(this.sendInjectAudio.bind(this));
        this.server = null;
        this.httpServer = null;
    }

    start() {
        // TCP server for protocol communication
        this.server = net.createServer((socket) => {
            console.log(`[Server] Connection from ${socket.remoteAddress}:${socket.remotePort}`);
            
            let buffer = '';
            
            socket.on('data', (data) => {
                buffer += data.toString();
                
                // Process complete messages (newline-delimited JSON)
                let newlineIndex;
                while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                    const line = buffer.slice(0, newlineIndex);
                    buffer = buffer.slice(newlineIndex + 1);
                    
                    if (line.trim()) {
                        this.handleMessage(socket, line);
                    }
                }
            });
            
            socket.on('error', (err) => {
                console.error(`[Server] Socket error:`, err.message);
            });
            
            socket.on('close', () => {
                console.log(`[Server] Connection closed`);
            });
        });
        
        this.server.listen(this.port, () => {
            console.log(`[Server] ✓ Timing Server listening on port ${this.port}`);
        });
        
        // HTTP server for status API
        this.httpServer = http.createServer((req, res) => {
            if (req.url === '/status') {
                const pairs = this.pairManager.getAllPairs();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ pairs }, null, 2));
            } else {
                res.writeHead(404);
                res.end('Not Found');
            }
        });
        
        this.httpServer.listen(6001, () => {
            console.log(`[Server] ✓ HTTP Status API listening on port 6001`);
        });
        
        // Periodic status
        setInterval(() => this.logStatus(), 10000);
    }

    handleMessage(socket, data) {
        try {
            // Track conference server socket for sending messages back
            if (!this.conferenceSocket) {
                this.conferenceSocket = socket;
            }

            const msg = JSON.parse(data);

            switch (msg.type) {
                case 'REGISTER_EXTENSION':
                    this.pairManager.registerExtension(msg.extension, msg.uuid);
                    break;

                case 'REGISTER_PAIR':
                    this.handleRegisterPair(socket, msg);
                    break;

                case 'AUDIO_PACKET':
                    this.handleAudioPacket(socket, msg);
                    break;
                    
                case 'LATENCY_UPDATE':
                    this.handleLatencyUpdate(socket, msg);
                    break;
                    
                default:
                    console.warn(`[Server] Unknown message type: ${msg.type}`);
            }
        } catch (err) {
            console.error(`[Server] Error handling message:`, err.message);
        }
    }

    handleRegisterPair(socket, msg) {
        const { ext1, ext2, callUuid } = msg;
        const sessionId = this.pairManager.registerPair(ext1, ext2, callUuid);
        
        // Initialize injection channels
        this.audioInjector.initChannel(ext1, `bridge-${ext1}`);
        this.audioInjector.initChannel(ext2, `bridge-${ext2}`);
        
        socket.write(JSON.stringify({
            type: 'PAIR_REGISTERED',
            sessionId,
            ext1,
            ext2
        }) + '\n');
    }

    handleAudioPacket(socket, msg) {
        const { fromExt, audioData, timestamp } = msg;
        const pairInfo = this.pairManager.getPair(fromExt);
        
        if (!pairInfo) {
            console.warn(`[Server] No pair found for extension ${fromExt}`);
            return;
        }
        
        const toExt = pairInfo.paired;
        
        // Calculate latency difference
        const latencyDiff = this.pairManager.getLatencyDifference(fromExt, toExt);
        
        // Only delay if this direction is faster (latencyDiff is negative)
        const delayMs = Math.max(0, -latencyDiff);
        
        // Convert base64 audio back to buffer
        const audioBuffer = Buffer.from(audioData, 'base64');
        
        // Add to buffer with delay
        this.latencyBuffer.enqueue(toExt, audioBuffer, delayMs);
        
        if (delayMs > 0) {
            console.log(`[Buffer] ${fromExt}→${toExt} delayed by ${delayMs}ms (sync)`);
        }
    }

    sendInjectAudio(toExtension, message) {
        if (!this.conferenceSocket || this.conferenceSocket.destroyed) {
            console.warn('[Server] Cannot send INJECT_AUDIO: conference server not connected');
            return;
        }

        this.conferenceSocket.write(JSON.stringify(message) + '\n');
        const audioSize = Buffer.from(message.audioData, 'base64').length;
        console.log(`[Server] → INJECT_AUDIO for ext ${toExtension}, ${audioSize} bytes`);
    }

    handleLatencyUpdate(socket, msg) {
        const { fromExt, toExt, latencyMs } = msg;
        this.pairManager.updateLatency(fromExt, toExt, latencyMs);
    }

    logStatus() {
        const pairs = this.pairManager.getAllPairs();
        
        if (pairs.length > 0) {
            console.log(`\n[Status] Active pairs: ${pairs.length}`);
            pairs.forEach(pair => {
                console.log(`  ${pair.ext1} ↔ ${pair.ext2}: ${pair.latency1}ms / ${pair.latency2}ms`);
            });
        }
    }
}

// ============================================================================
// START SERVER
// ============================================================================

const server = new TimingServer(6000);
server.start();

console.log(`
╔════════════════════════════════════════════════════════════╗
║  Bidirectional Translation Timing Server                  ║
║                                                            ║
║  TCP Port:  6000  (Protocol)                              ║
║  HTTP Port: 6001  (Status API)                            ║
║                                                            ║
║  Features:                                                 ║
║  ✓ Extension pair tracking                                ║
║  ✓ Latency compensation & buffering                       ║
║  ✓ ARI ExternalMedia audio injection                      ║
╚════════════════════════════════════════════════════════════╝
`);
