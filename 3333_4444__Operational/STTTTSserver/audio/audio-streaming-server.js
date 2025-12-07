/**
 * Audio Streaming Server
 * Manages RTP audio streams and broadcasts them via WebSocket
 * Supports multiple concurrent audio streams with visualization data
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const RTPtoPCMConverter = require('./rtp-pcm-converter');

class AudioStreamingServer {
    constructor(config = {}) {
        this.config = {
            httpPort: config.httpPort || 3030,
            rtpPorts: config.rtpPorts || [3333, 4444],
            corsOrigin: config.corsOrigin || '*',
            maxClients: config.maxClients || 100,
            bufferSize: config.bufferSize || 4096,
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

        // RTP converters for each port
        this.converters = new Map();

        // Active client connections
        this.clients = new Set();

        // Audio stream buffers
        this.streamBuffers = new Map();

        // Audio analysis data
        this.analysisData = new Map();

        this.setupRoutes();
        this.setupSocketIO();
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
                streams: Array.from(this.converters.keys()),
                clients: this.clients.size,
                uptime: process.uptime()
            });
        });

        // Stream statistics
        this.app.get('/api/streams', (req, res) => {
            const streams = Array.from(this.converters.entries()).map(([port, converter]) => ({
                port,
                stats: converter.getStats(),
                clients: this.getStreamClientCount(port)
            }));
            res.json({ streams });
        });

        // Stream details
        this.app.get('/api/streams/:port', (req, res) => {
            const port = parseInt(req.params.port);
            const converter = this.converters.get(port);

            if (!converter) {
                return res.status(404).json({ error: 'Stream not found' });
            }

            res.json({
                port,
                stats: converter.getStats(),
                analysis: this.analysisData.get(port) || {},
                clients: this.getStreamClientCount(port)
            });
        });

        // Control endpoints
        this.app.post('/api/streams/:port/start', (req, res) => {
            const port = parseInt(req.params.port);
            this.startStream(port)
                .then(() => res.json({ success: true, port }))
                .catch(err => res.status(500).json({ error: err.message }));
        });

        this.app.post('/api/streams/:port/stop', (req, res) => {
            const port = parseInt(req.params.port);
            this.stopStream(port);
            res.json({ success: true, port });
        });
    }

    /**
     * Setup Socket.IO handlers
     */
    setupSocketIO() {
        this.io.on('connection', (socket) => {
            console.log(`Client connected: ${socket.id}`);
            this.clients.add(socket);

            // Send current stream status
            socket.emit('streams-status', this.getStreamsStatus());

            // Subscribe to specific stream
            socket.on('subscribe-stream', (port) => {
                socket.join(`stream-${port}`);
                console.log(`Client ${socket.id} subscribed to stream ${port}`);

                // Send recent buffer data if available
                const buffer = this.streamBuffers.get(port);
                if (buffer && buffer.length > 0) {
                    socket.emit('audio-buffer', {
                        port,
                        data: buffer.slice(-10) // Last 10 chunks
                    });
                }
            });

            // Unsubscribe from stream
            socket.on('unsubscribe-stream', (port) => {
                socket.leave(`stream-${port}`);
                console.log(`Client ${socket.id} unsubscribed from stream ${port}`);
            });

            // Request statistics
            socket.on('get-stats', (port) => {
                const converter = this.converters.get(port);
                if (converter) {
                    socket.emit('stream-stats', {
                        port,
                        stats: converter.getStats(),
                        analysis: this.analysisData.get(port) || {}
                    });
                }
            });

            // Disconnect handler
            socket.on('disconnect', () => {
                console.log(`Client disconnected: ${socket.id}`);
                this.clients.delete(socket);
            });
        });
    }

    /**
     * Start an audio stream
     */
    async startStream(port) {
        if (this.converters.has(port)) {
            console.log(`Stream already running on port ${port}`);
            return;
        }

        const converter = new RTPtoPCMConverter(port, 'OPUS');

        // Handle PCM data
        converter.on('pcm-data', (audioData) => {
            this.handleAudioData(port, audioData);
        });

        // Handle errors
        converter.on('error', (error) => {
            console.error(`Stream error on port ${port}:`, error);
            this.io.to(`stream-${port}`).emit('stream-error', { port, error: error.message });
        });

        // Handle packet loss
        converter.on('packet-loss', (lossData) => {
            this.io.to(`stream-${port}`).emit('packet-loss', { port, ...lossData });
        });

        await converter.start();
        this.converters.set(port, converter);
        this.streamBuffers.set(port, []);
        this.analysisData.set(port, {
            rms: 0,
            peak: 0,
            frequency: 0,
            spectrum: []
        });

        console.log(`Audio stream started on port ${port}`);
        this.io.emit('stream-started', { port });

        return converter;
    }

    /**
     * Stop an audio stream
     */
    stopStream(port) {
        const converter = this.converters.get(port);
        if (converter) {
            converter.stop();
            this.converters.delete(port);
            this.streamBuffers.delete(port);
            this.analysisData.delete(port);

            console.log(`Audio stream stopped on port ${port}`);
            this.io.emit('stream-stopped', { port });
        }
    }

    /**
     * Handle incoming audio data
     */
    handleAudioData(port, audioData) {
        // Store in buffer
        const buffer = this.streamBuffers.get(port) || [];
        buffer.push(audioData);

        // Limit buffer size
        if (buffer.length > this.config.bufferSize) {
            buffer.shift();
        }
        this.streamBuffers.set(port, buffer);

        // Perform audio analysis
        const analysis = this.analyzeAudio(audioData.data);
        this.analysisData.set(port, analysis);

        // Broadcast to subscribed clients
        this.io.to(`stream-${port}`).emit('audio-data', {
            port,
            audio: audioData,
            analysis,
            timestamp: Date.now()
        });

        // Send visualization data separately for performance
        this.io.to(`stream-${port}`).emit('visualization-data', {
            port,
            ...analysis,
            timestamp: Date.now()
        });
    }

    /**
     * Analyze audio data for visualization
     */
    analyzeAudio(pcmBuffer) {
        const samples = this.bufferToSamples(pcmBuffer);

        // Calculate RMS (volume level)
        const rms = this.calculateRMS(samples);

        // Calculate peak
        const peak = this.calculatePeak(samples);

        // Calculate zero crossing rate (rough frequency indicator)
        const zcr = this.calculateZCR(samples);

        // Simple spectrum analysis (8 bands)
        const spectrum = this.calculateSpectrum(samples, 8);

        return {
            rms: Math.round(rms * 100) / 100,
            peak: Math.round(peak * 100) / 100,
            zcr: Math.round(zcr * 100) / 100,
            spectrum,
            level: this.rmsToDb(rms),
            peakDb: this.rmsToDb(peak),
            timestamp: Date.now()
        };
    }

    /**
     * Convert buffer to sample array
     */
    bufferToSamples(buffer) {
        const samples = [];
        for (let i = 0; i < buffer.length; i += 2) {
            if (i + 1 < buffer.length) {
                const sample = buffer.readInt16LE(i) / 32768.0;
                samples.push(sample);
            }
        }
        return samples;
    }

    /**
     * Calculate RMS (Root Mean Square) - volume level
     */
    calculateRMS(samples) {
        if (samples.length === 0) return 0;

        const sumSquares = samples.reduce((sum, sample) => sum + sample * sample, 0);
        return Math.sqrt(sumSquares / samples.length);
    }

    /**
     * Calculate peak amplitude
     */
    calculatePeak(samples) {
        if (samples.length === 0) return 0;
        return Math.max(...samples.map(Math.abs));
    }

    /**
     * Calculate Zero Crossing Rate
     */
    calculateZCR(samples) {
        if (samples.length < 2) return 0;

        let crossings = 0;
        for (let i = 1; i < samples.length; i++) {
            if ((samples[i] >= 0 && samples[i - 1] < 0) || (samples[i] < 0 && samples[i - 1] >= 0)) {
                crossings++;
            }
        }
        return crossings / samples.length;
    }

    /**
     * Calculate simple frequency spectrum
     */
    calculateSpectrum(samples, bands) {
        const spectrum = new Array(bands).fill(0);
        const bandSize = Math.floor(samples.length / bands);

        for (let i = 0; i < bands; i++) {
            const start = i * bandSize;
            const end = Math.min(start + bandSize, samples.length);
            const bandSamples = samples.slice(start, end);
            spectrum[i] = this.calculateRMS(bandSamples);
        }

        return spectrum;
    }

    /**
     * Convert RMS to decibels
     */
    rmsToDb(rms) {
        if (rms <= 0) return -Infinity;
        return 20 * Math.log10(rms);
    }

    /**
     * Get stream client count
     */
    getStreamClientCount(port) {
        const room = this.io.sockets.adapter.rooms.get(`stream-${port}`);
        return room ? room.size : 0;
    }

    /**
     * Get all streams status
     */
    getStreamsStatus() {
        return Array.from(this.converters.entries()).map(([port, converter]) => ({
            port,
            isRunning: converter.isRunning,
            stats: converter.getStats(),
            clients: this.getStreamClientCount(port)
        }));
    }

    /**
     * Start the server
     */
    async start() {
        // Start all configured RTP streams
        for (const port of this.config.rtpPorts) {
            try {
                await this.startStream(port);
            } catch (error) {
                console.error(`Failed to start stream on port ${port}:`, error);
            }
        }

        // Start HTTP server
        return new Promise((resolve) => {
            this.server.listen(this.config.httpPort, () => {
                console.log(`Audio Streaming Server running on port ${this.config.httpPort}`);
                console.log(`Streaming RTP ports: ${this.config.rtpPorts.join(', ')}`);
                console.log(`WebSocket endpoint: ws://localhost:${this.config.httpPort}`);
                resolve();
            });
        });
    }

    /**
     * Stop the server
     */
    async stop() {
        // Stop all streams
        for (const port of this.converters.keys()) {
            this.stopStream(port);
        }

        // Close HTTP server
        return new Promise((resolve) => {
            this.server.close(() => {
                console.log('Audio Streaming Server stopped');
                resolve();
            });
        });
    }
}

// Export the class
module.exports = AudioStreamingServer;

// CLI usage
if (require.main === module) {
    const config = {
        httpPort: process.env.AUDIO_HTTP_PORT || 3030,
        rtpPorts: (process.env.RTP_PORTS || '3333,4444').split(',').map(p => parseInt(p.trim())),
        corsOrigin: process.env.CORS_ORIGIN || '*'
    };

    const server = new AudioStreamingServer(config);

    server.start().catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\nShutting down gracefully...');
        await server.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\nShutting down gracefully...');
        await server.stop();
        process.exit(0);
    });
}
