/**
 * Integrated Audio Server
 * Combines audio streaming, RTP conversion, and WebSocket transport
 * Ready to integrate with existing Station monitoring system
 */

const AudioStreamingServer = require('./audio-streaming-server');
const { AudioTransportManager } = require('./websocket-audio-transport');

class IntegratedAudioServer {
    constructor(config = {}) {
        this.config = {
            httpPort: config.httpPort || 3030,
            rtpPorts: config.rtpPorts || [3333, 4444],
            corsOrigin: config.corsOrigin || '*',
            enableMonitoring: config.enableMonitoring !== false,
            monitoringInterval: config.monitoringInterval || 1000,
            ...config
        };

        // Create audio streaming server
        this.audioServer = new AudioStreamingServer(this.config);

        // Will be set after server starts
        this.transportManager = null;

        // System statistics
        this.systemStats = {
            startTime: Date.now(),
            totalPackets: 0,
            totalBytes: 0,
            activeStreams: 0,
            activeClients: 0,
            errors: 0
        };

        // Monitoring interval
        this.monitoringInterval = null;
    }

    /**
     * Start the integrated server
     */
    async start() {
        console.log('Starting Integrated Audio Server...');
        console.log('Configuration:', JSON.stringify(this.config, null, 2));

        try {
            // Start the audio streaming server
            await this.audioServer.start();

            // Create transport manager
            this.transportManager = new AudioTransportManager(this.audioServer.io);

            // Setup transport event handlers
            this.setupTransportHandlers();

            // Setup audio stream handlers
            this.setupAudioStreamHandlers();

            // Start monitoring if enabled
            if (this.config.enableMonitoring) {
                this.startMonitoring();
            }

            console.log('✅ Integrated Audio Server started successfully');
            console.log(`📡 HTTP/WebSocket: http://localhost:${this.config.httpPort}`);
            console.log(`🎵 RTP Streams: ${this.config.rtpPorts.join(', ')}`);
            console.log(`🌐 Audio Player: http://localhost:${this.config.httpPort}/audio-player-visualization.html`);

            return true;

        } catch (error) {
            console.error('❌ Failed to start Integrated Audio Server:', error);
            throw error;
        }
    }

    /**
     * Stop the integrated server
     */
    async stop() {
        console.log('Stopping Integrated Audio Server...');

        // Stop monitoring
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        // Stop audio server
        if (this.audioServer) {
            await this.audioServer.stop();
        }

        console.log('✅ Integrated Audio Server stopped');
    }

    /**
     * Setup transport event handlers
     */
    setupTransportHandlers() {
        this.transportManager.on('streaming-started', ({ socket, streamId }) => {
            console.log(`🎵 Client ${socket.id} started streaming ${streamId}`);
            this.systemStats.activeClients++;
        });

        this.transportManager.on('streaming-stopped', ({ socket, streamId }) => {
            console.log(`⏹️  Client ${socket.id} stopped streaming ${streamId}`);
            this.systemStats.activeClients--;
        });

        this.transportManager.on('quality-changed', ({ socket, streamId, quality }) => {
            console.log(`📊 Stream ${streamId} quality changed to: ${quality}`);
        });

        this.transportManager.on('buffer-overflow', ({ socket, streamId, bufferSize, dropped }) => {
            console.warn(`⚠️  Buffer overflow on stream ${streamId}: ${bufferSize} packets, ${dropped} dropped`);
            this.systemStats.errors++;
        });
    }

    /**
     * Setup audio stream handlers
     */
    setupAudioStreamHandlers() {
        // Listen to audio data from RTP converters
        this.audioServer.converters.forEach((converter, port) => {
            converter.on('pcm-data', (audioData) => {
                this.systemStats.totalPackets++;
                this.systemStats.totalBytes += audioData.data?.length || 0;

                // Broadcast to all subscribed clients via transport manager
                this.transportManager.broadcastAudioData(port, audioData);
            });

            converter.on('error', (error) => {
                console.error(`❌ RTP Converter error on port ${port}:`, error);
                this.systemStats.errors++;
            });

            converter.on('packet-loss', (lossData) => {
                console.warn(`📉 Packet loss on port ${port}:`, lossData);
            });
        });
    }

    /**
     * Start monitoring
     */
    startMonitoring() {
        console.log('📊 Starting system monitoring...');

        this.monitoringInterval = setInterval(() => {
            const stats = this.getSystemStats();

            // Update active streams count
            this.systemStats.activeStreams = this.audioServer.converters.size;

            // Broadcast system stats to all connected clients
            this.audioServer.io.emit('system-stats', stats);

            // Log summary
            if (this.config.verboseLogging) {
                console.log('📊 System Stats:', JSON.stringify(stats, null, 2));
            }
        }, this.config.monitoringInterval);
    }

    /**
     * Get system statistics
     */
    getSystemStats() {
        const uptime = Date.now() - this.systemStats.startTime;

        return {
            uptime,
            uptimeFormatted: this.formatUptime(uptime),
            totalPackets: this.systemStats.totalPackets,
            totalBytes: this.systemStats.totalBytes,
            totalBytesFormatted: this.formatBytes(this.systemStats.totalBytes),
            activeStreams: this.systemStats.activeStreams,
            activeClients: this.systemStats.activeClients,
            errors: this.systemStats.errors,
            throughput: {
                packetsPerSecond: Math.round(this.systemStats.totalPackets / (uptime / 1000)),
                bytesPerSecond: Math.round(this.systemStats.totalBytes / (uptime / 1000)),
                bytesPerSecondFormatted: this.formatBytes(Math.round(this.systemStats.totalBytes / (uptime / 1000))) + '/s'
            },
            streams: this.getStreamStats(),
            transports: this.transportManager ? this.transportManager.getAllStats() : {}
        };
    }

    /**
     * Get stream-specific statistics
     */
    getStreamStats() {
        const stats = {};

        this.audioServer.converters.forEach((converter, port) => {
            stats[port] = {
                ...converter.getStats(),
                analysis: this.audioServer.analysisData.get(port) || {},
                clients: this.audioServer.getStreamClientCount(port)
            };
        });

        return stats;
    }

    /**
     * Format uptime
     */
    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Format bytes
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Get server instance (for external access)
     */
    getServer() {
        return this.audioServer.server;
    }

    /**
     * Get Socket.IO instance (for external access)
     */
    getSocketIO() {
        return this.audioServer.io;
    }

    /**
     * Add custom route to Express app
     */
    addRoute(method, path, handler) {
        this.audioServer.app[method](path, handler);
    }

    /**
     * Add Socket.IO event handler
     */
    addSocketHandler(event, handler) {
        this.audioServer.io.on('connection', (socket) => {
            socket.on(event, handler);
        });
    }
}

// Export the class
module.exports = IntegratedAudioServer;

// CLI usage
if (require.main === module) {
    const config = {
        httpPort: parseInt(process.env.AUDIO_HTTP_PORT) || 3030,
        rtpPorts: (process.env.RTP_PORTS || '3333,4444').split(',').map(p => parseInt(p.trim())),
        corsOrigin: process.env.CORS_ORIGIN || '*',
        enableMonitoring: process.env.ENABLE_MONITORING !== 'false',
        monitoringInterval: parseInt(process.env.MONITORING_INTERVAL) || 1000,
        verboseLogging: process.env.VERBOSE_LOGGING === 'true'
    };

    const server = new IntegratedAudioServer(config);

    server.start().catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
        console.log(`\nReceived ${signal}, shutting down gracefully...`);
        try {
            await server.stop();
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
}
