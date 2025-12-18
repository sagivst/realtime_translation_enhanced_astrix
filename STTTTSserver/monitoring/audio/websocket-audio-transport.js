/**
 * WebSocket Audio Transport Layer
 * Handles bidirectional audio streaming over WebSocket
 * Optimized for low-latency real-time audio transmission
 */

const { EventEmitter } = require('events');

class WebSocketAudioTransport extends EventEmitter {
    constructor(socket, streamId) {
        super();
        this.socket = socket;
        this.streamId = streamId;
        this.isStreaming = false;
        this.isMuted = false;
        this.volume = 1.0;

        // Buffer management
        this.sendBuffer = [];
        this.maxBufferSize = 50;
        this.bufferHighWaterMark = 40;
        this.bufferLowWaterMark = 10;

        // Statistics
        this.stats = {
            bytesSent: 0,
            bytesReceived: 0,
            packetsSent: 0,
            packetsReceived: 0,
            packetsDropped: 0,
            latency: 0,
            startTime: Date.now()
        };

        // Quality monitoring
        this.qualityMetrics = {
            bufferHealth: 'good',
            connectionQuality: 'excellent',
            lastPacketTime: Date.now(),
            avgLatency: 0,
            latencyHistory: []
        };

        this.setupHandlers();
    }

    /**
     * Setup WebSocket event handlers
     */
    setupHandlers() {
        // Handle audio data from client
        this.socket.on('client-audio-data', (data) => {
            this.handleClientAudio(data);
        });

        // Handle control messages
        this.socket.on('audio-control', (control) => {
            this.handleControlMessage(control);
        });

        // Handle ping for latency measurement
        this.socket.on('audio-ping', (timestamp) => {
            this.socket.emit('audio-pong', { timestamp, serverTime: Date.now() });
        });

        // Monitor connection quality
        this.qualityCheckInterval = setInterval(() => {
            this.checkConnectionQuality();
        }, 1000);

        // Buffer drain interval
        this.bufferDrainInterval = setInterval(() => {
            this.drainBuffer();
        }, 20); // 50 packets/sec = 20ms interval

        // Cleanup on disconnect
        this.socket.on('disconnect', () => {
            this.cleanup();
        });
    }

    /**
     * Start streaming audio to client
     */
    startStreaming() {
        if (!this.isStreaming) {
            this.isStreaming = true;
            this.stats.startTime = Date.now();
            this.emit('streaming-started', this.streamId);
            console.log(`Started streaming audio for stream ${this.streamId}`);
        }
    }

    /**
     * Stop streaming audio to client
     */
    stopStreaming() {
        if (this.isStreaming) {
            this.isStreaming = false;
            this.sendBuffer = [];
            this.emit('streaming-stopped', this.streamId);
            console.log(`Stopped streaming audio for stream ${this.streamId}`);
        }
    }

    /**
     * Send audio data to client
     */
    sendAudioData(audioData) {
        if (!this.isStreaming || this.isMuted) {
            return;
        }

        // Apply volume adjustment if needed
        let data = audioData;
        if (this.volume !== 1.0) {
            data = this.adjustVolume(audioData, this.volume);
        }

        // Check buffer capacity
        if (this.sendBuffer.length >= this.maxBufferSize) {
            this.stats.packetsDropped++;
            this.emit('buffer-overflow', {
                streamId: this.streamId,
                bufferSize: this.sendBuffer.length,
                dropped: this.stats.packetsDropped
            });
            return;
        }

        // Add to send buffer with timestamp
        this.sendBuffer.push({
            data,
            timestamp: Date.now(),
            sequence: this.stats.packetsSent
        });

        // Update buffer health
        this.updateBufferHealth();
    }

    /**
     * Drain send buffer
     */
    drainBuffer() {
        if (!this.isStreaming || this.sendBuffer.length === 0) {
            return;
        }

        const packet = this.sendBuffer.shift();
        const now = Date.now();
        const latency = now - packet.timestamp;

        // Emit audio packet to client
        this.socket.emit('audio-packet', {
            streamId: this.streamId,
            data: packet.data,
            sequence: packet.sequence,
            timestamp: packet.timestamp,
            serverTime: now
        });

        // Update statistics
        this.stats.packetsSent++;
        this.stats.bytesSent += packet.data.length || 0;

        // Track latency
        this.qualityMetrics.latencyHistory.push(latency);
        if (this.qualityMetrics.latencyHistory.length > 100) {
            this.qualityMetrics.latencyHistory.shift();
        }

        this.qualityMetrics.avgLatency =
            this.qualityMetrics.latencyHistory.reduce((a, b) => a + b, 0) /
            this.qualityMetrics.latencyHistory.length;
    }

    /**
     * Handle audio data from client
     */
    handleClientAudio(data) {
        this.stats.packetsReceived++;
        this.stats.bytesReceived += data.length || 0;
        this.qualityMetrics.lastPacketTime = Date.now();

        this.emit('client-audio', {
            streamId: this.streamId,
            data,
            stats: this.getStats()
        });
    }

    /**
     * Handle control messages
     */
    handleControlMessage(control) {
        const { action, value } = control;

        switch (action) {
            case 'mute':
                this.isMuted = value;
                this.emit('mute-changed', { streamId: this.streamId, muted: value });
                break;

            case 'volume':
                this.volume = Math.max(0, Math.min(2, value)); // Clamp 0-2
                this.emit('volume-changed', { streamId: this.streamId, volume: this.volume });
                break;

            case 'start':
                this.startStreaming();
                break;

            case 'stop':
                this.stopStreaming();
                break;

            case 'buffer-adjust':
                this.adjustBufferSize(value);
                break;

            default:
                console.warn(`Unknown control action: ${action}`);
        }
    }

    /**
     * Adjust volume of audio data
     */
    adjustVolume(audioData, volume) {
        // If it's a buffer
        if (Buffer.isBuffer(audioData)) {
            const adjusted = Buffer.from(audioData);
            for (let i = 0; i < adjusted.length; i += 2) {
                const sample = adjusted.readInt16LE(i);
                const adjustedSample = Math.max(-32768, Math.min(32767, sample * volume));
                adjusted.writeInt16LE(adjustedSample, i);
            }
            return adjusted;
        }

        // If it's an array or typed array
        if (audioData.data) {
            return {
                ...audioData,
                data: this.adjustVolume(audioData.data, volume)
            };
        }

        return audioData;
    }

    /**
     * Update buffer health status
     */
    updateBufferHealth() {
        const bufferSize = this.sendBuffer.length;

        if (bufferSize > this.bufferHighWaterMark) {
            this.qualityMetrics.bufferHealth = 'critical';
        } else if (bufferSize > this.bufferLowWaterMark) {
            this.qualityMetrics.bufferHealth = 'warning';
        } else {
            this.qualityMetrics.bufferHealth = 'good';
        }

        // Emit buffer status changes
        this.socket.emit('buffer-status', {
            streamId: this.streamId,
            bufferSize,
            health: this.qualityMetrics.bufferHealth,
            maxSize: this.maxBufferSize
        });
    }

    /**
     * Check connection quality
     */
    checkConnectionQuality() {
        const now = Date.now();
        const timeSinceLastPacket = now - this.qualityMetrics.lastPacketTime;
        const avgLatency = this.qualityMetrics.avgLatency;

        let quality = 'excellent';

        if (timeSinceLastPacket > 5000) {
            quality = 'poor';
        } else if (timeSinceLastPacket > 2000) {
            quality = 'degraded';
        } else if (avgLatency > 200) {
            quality = 'fair';
        } else if (avgLatency > 100) {
            quality = 'good';
        }

        if (quality !== this.qualityMetrics.connectionQuality) {
            this.qualityMetrics.connectionQuality = quality;
            this.emit('quality-changed', {
                streamId: this.streamId,
                quality,
                metrics: this.qualityMetrics
            });

            this.socket.emit('connection-quality', {
                streamId: this.streamId,
                quality,
                avgLatency,
                bufferHealth: this.qualityMetrics.bufferHealth
            });
        }
    }

    /**
     * Adjust buffer size dynamically
     */
    adjustBufferSize(size) {
        this.maxBufferSize = Math.max(10, Math.min(200, size));
        this.bufferHighWaterMark = Math.floor(this.maxBufferSize * 0.8);
        this.bufferLowWaterMark = Math.floor(this.maxBufferSize * 0.2);

        console.log(`Buffer size adjusted to ${this.maxBufferSize} for stream ${this.streamId}`);
    }

    /**
     * Get current statistics
     */
    getStats() {
        const uptime = Date.now() - this.stats.startTime;

        return {
            ...this.stats,
            uptime,
            isStreaming: this.isStreaming,
            isMuted: this.isMuted,
            volume: this.volume,
            bufferSize: this.sendBuffer.length,
            maxBufferSize: this.maxBufferSize,
            quality: this.qualityMetrics,
            throughput: {
                sent: this.stats.bytesSent / (uptime / 1000),
                received: this.stats.bytesReceived / (uptime / 1000)
            }
        };
    }

    /**
     * Send stats to client
     */
    sendStats() {
        this.socket.emit('stream-stats', {
            streamId: this.streamId,
            stats: this.getStats()
        });
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopStreaming();

        if (this.qualityCheckInterval) {
            clearInterval(this.qualityCheckInterval);
            this.qualityCheckInterval = null;
        }

        if (this.bufferDrainInterval) {
            clearInterval(this.bufferDrainInterval);
            this.bufferDrainInterval = null;
        }

        this.sendBuffer = [];
        this.removeAllListeners();

        console.log(`Cleaned up transport for stream ${this.streamId}`);
    }
}

/**
 * Audio Transport Manager
 * Manages multiple WebSocket audio transports
 */
class AudioTransportManager extends EventEmitter {
    constructor(io) {
        super();
        this.io = io;
        this.transports = new Map();

        this.setupSocketIO();
    }

    /**
     * Setup Socket.IO connection handler
     */
    setupSocketIO() {
        this.io.on('connection', (socket) => {
            console.log(`Audio client connected: ${socket.id}`);

            // Handle stream subscription
            socket.on('subscribe-audio-stream', (streamId) => {
                this.createTransport(socket, streamId);
            });

            // Handle unsubscription
            socket.on('unsubscribe-audio-stream', (streamId) => {
                this.destroyTransport(socket.id, streamId);
            });

            // Handle disconnect
            socket.on('disconnect', () => {
                this.destroyAllTransports(socket.id);
                console.log(`Audio client disconnected: ${socket.id}`);
            });
        });
    }

    /**
     * Create a transport for a socket and stream
     */
    createTransport(socket, streamId) {
        const key = `${socket.id}:${streamId}`;

        if (this.transports.has(key)) {
            console.log(`Transport already exists for ${key}`);
            return this.transports.get(key);
        }

        const transport = new WebSocketAudioTransport(socket, streamId);

        // Forward transport events
        transport.on('streaming-started', (id) => this.emit('streaming-started', { socket, streamId: id }));
        transport.on('streaming-stopped', (id) => this.emit('streaming-stopped', { socket, streamId: id }));
        transport.on('quality-changed', (data) => this.emit('quality-changed', { socket, ...data }));
        transport.on('buffer-overflow', (data) => this.emit('buffer-overflow', { socket, ...data }));

        this.transports.set(key, transport);
        console.log(`Created transport for ${key}`);

        return transport;
    }

    /**
     * Get transport for socket and stream
     */
    getTransport(socketId, streamId) {
        const key = `${socketId}:${streamId}`;
        return this.transports.get(key);
    }

    /**
     * Destroy a specific transport
     */
    destroyTransport(socketId, streamId) {
        const key = `${socketId}:${streamId}`;
        const transport = this.transports.get(key);

        if (transport) {
            transport.cleanup();
            this.transports.delete(key);
            console.log(`Destroyed transport for ${key}`);
        }
    }

    /**
     * Destroy all transports for a socket
     */
    destroyAllTransports(socketId) {
        const keys = Array.from(this.transports.keys()).filter(k => k.startsWith(socketId));
        keys.forEach(key => {
            const transport = this.transports.get(key);
            if (transport) {
                transport.cleanup();
                this.transports.delete(key);
            }
        });
        console.log(`Destroyed ${keys.length} transports for socket ${socketId}`);
    }

    /**
     * Broadcast audio data to all subscribers of a stream
     */
    broadcastAudioData(streamId, audioData) {
        const keys = Array.from(this.transports.keys()).filter(k => k.endsWith(`:${streamId}`));
        keys.forEach(key => {
            const transport = this.transports.get(key);
            if (transport && transport.isStreaming) {
                transport.sendAudioData(audioData);
            }
        });
    }

    /**
     * Get statistics for all transports
     */
    getAllStats() {
        const stats = {};
        this.transports.forEach((transport, key) => {
            stats[key] = transport.getStats();
        });
        return stats;
    }

    /**
     * Get active stream count
     */
    getActiveStreamCount() {
        return this.transports.size;
    }
}

module.exports = {
    WebSocketAudioTransport,
    AudioTransportManager
};
