#!/usr/bin/env node

/**
 * MONITORING SERVER - Bridge between STTTTSserver and V2.1.0 Database
 *
 * This server:
 * 1. Receives metrics from STTTTSserver via Socket.IO
 * 2. Transforms data to V2.1.0 compliant format
 * 3. Forwards to database integration (port 8083)
 * 4. Provides HTTP API endpoints for direct ingestion
 * 5. Handles real-time dashboard updates
 *
 * Critical for STATION_3 which influences Deepgram performance!
 */

const http = require('http');
const express = require('express');
const socketIO = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

class MonitoringServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIO(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        // Middleware
        this.app.use(cors());
        this.app.use(express.json());

        // Store active connections and metrics
        this.activeStations = new Map();
        this.metricsBuffer = [];
        this.knobsState = new Map();

        // Station mapping (matching our V2.1.0 configuration)
        this.STATION_MAP = {
            'STATION_1': { name: 'Asterisk PBX', type: 'voice' },
            'STATION_2': { name: 'Gateway RX', type: 'voice' },
            'STATION_3': {
                name: 'Voice Monitor/Enhancer',
                type: 'voice',
                critical: true,
                description: 'CRITICAL - Influences Deepgram performance'
            },
            'STATION_7': { name: 'Gateway TX', type: 'voice' },
            'STATION_8': { name: 'Audio Pipeline', type: 'voice' },
            'STATION_9': { name: 'TTS Output', type: 'voice' },
            'STATION_10': { name: 'Gateway Return', type: 'voice' },
            'STATION_11': { name: 'Hume EVI', type: 'emotion' }
        };

        // Initialize all 75 metrics with categories
        this.initializeMetricCategories();

        // Setup routes and Socket.IO
        this.setupRoutes();
        this.setupSocketIO();

        // Station 3 specific knobs (influences Deepgram)
        this.station3Knobs = [
            { name: 'agc.enabled', value: true, impact: 'high' },
            { name: 'agc.target_level_dbfs', value: -18, impact: 'critical' },
            { name: 'agc.compression_ratio', value: 4, impact: 'medium' },
            { name: 'noise_reduction_strength', value: 3, impact: 'critical' },
            { name: 'noise_gate_threshold_db', value: -40, impact: 'medium' },
            { name: 'echo_cancellation.enabled', value: true, impact: 'high' },
            { name: 'echo_cancellation.tail_length_ms', value: 128, impact: 'medium' },
            { name: 'vad.enabled', value: true, impact: 'critical' },
            { name: 'vad.threshold', value: 0.5, impact: 'high' },
            { name: 'vad.speech_pad_ms', value: 300, impact: 'medium' },
            { name: 'audio_enhancement.enabled', value: true, impact: 'high' },
            { name: 'audio_enhancement.mode', value: 'speech', impact: 'medium' },
            { name: 'de_esser.enabled', value: false, impact: 'low' },
            { name: 'compander.enabled', value: true, impact: 'medium' },
            { name: 'highpass_filter_hz', value: 80, impact: 'medium' },
            { name: 'lowpass_filter_hz', value: 8000, impact: 'low' }
        ];
    }

    initializeMetricCategories() {
        // All 75 metrics categorized
        this.metricCategories = {
            buffer: [
                'buffer_usage_pct', 'buffer_underruns', 'buffer_overruns',
                'jitter_buffer_size_ms', 'adaptive_buffer_status', 'buffer_health_score',
                'peak_buffer_usage', 'buffer_resize_events', 'avg_buffer_occupancy',
                'buffer_drain_rate', 'buffer_fill_rate', 'buffer_starvation_time',
                'max_consecutive_underruns', 'buffer_stability_index', 'effective_buffer_latency'
            ],
            latency: [
                'end_to_end_latency_ms', 'network_latency_ms', 'processing_latency_ms',
                'codec_latency_ms', 'jitter_ms', 'round_trip_time_ms',
                'transcription_latency_ms', 'synthesis_latency_ms', 'api_response_time_ms',
                'queue_wait_time_ms', 'first_byte_latency_ms', 'peak_latency_ms',
                'p95_latency_ms', 'p99_latency_ms', 'latency_variation_ms'
            ],
            packet: [
                'packet_loss_pct', 'packets_received', 'packets_sent',
                'packet_reorder_rate', 'duplicate_packets', 'corrupted_packets',
                'packet_timing_drift', 'interpacket_gap_ms', 'burst_loss_rate',
                'consecutive_loss_count', 'fec_recovery_rate', 'retransmission_rate',
                'packet_conceal_count', 'effective_loss_rate', 'network_efficiency'
            ],
            audio_quality: [
                'snr_db', 'noise_floor_db', 'audio_level_dbfs',
                'peak_level_dbfs', 'clipping_detected', 'silence_detected',
                'voice_activity_ratio', 'audio_bandwidth_khz', 'spectral_centroid_hz',
                'mos_score', 'pesq_score', 'pitch_accuracy',
                'formant_clarity', 'harmonic_distortion_pct', 'intermodulation_distortion'
            ],
            performance: [
                'cpu_usage_pct', 'memory_usage_mb', 'thread_pool_usage',
                'event_loop_lag_ms', 'gc_pause_time_ms', 'api_calls_per_sec',
                'websocket_connections', 'active_streams', 'transcription_accuracy',
                'synthesis_quality_score', 'error_rate', 'retry_count',
                'cache_hit_rate', 'throughput_kbps', 'processing_efficiency'
            ]
        };
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                activeStations: Array.from(this.activeStations.keys()),
                bufferedMetrics: this.metricsBuffer.length,
                uptime: process.uptime()
            });
        });

        // Direct snapshot ingestion (OpenAPI compliant)
        this.app.post('/snapshot', async (req, res) => {
            try {
                const snapshot = await this.processSnapshot(req.body);
                const forwarded = await this.forwardToV21Database(snapshot);
                res.json({
                    success: true,
                    snapshot_id: snapshot.id,
                    forwarded: forwarded
                });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        });

        // Station capabilities endpoint
        this.app.get('/station-capabilities', (req, res) => {
            const capabilities = [];
            for (const [id, info] of Object.entries(this.STATION_MAP)) {
                capabilities.push({
                    station_id: id,
                    ...info,
                    metrics: this.getStationMetrics(id),
                    knobs: this.getStationKnobs(id),
                    status: this.activeStations.has(id) ? 'active' : 'inactive'
                });
            }
            res.json(capabilities);
        });

        // Knob catalog endpoint
        this.app.get('/knob-catalog', (req, res) => {
            const catalog = [];

            // Add Station 3 knobs (critical for Deepgram)
            for (const knob of this.station3Knobs) {
                catalog.push({
                    name: knob.name,
                    stations: ['STATION_3'],
                    default_value: knob.value,
                    impact: knob.impact,
                    description: `Station 3 knob - ${knob.impact} impact on Deepgram`
                });
            }

            // Add other station knobs
            // This will be expanded when we parse Annex A
            res.json(catalog);
        });

        // Apply knob changes
        this.app.post('/apply', async (req, res) => {
            const { station_id, knobs } = req.body;

            // Store knob state
            this.knobsState.set(station_id, knobs);

            // If it's Station 3, emit to STTTTSserver for immediate effect
            if (station_id === 'STATION_3') {
                this.io.emit('knob-update', {
                    station_id,
                    knobs,
                    reason: 'Optimizing for Deepgram performance'
                });
            }

            res.json({
                success: true,
                station_id,
                knobs_applied: knobs.length
            });
        });

        // Real-time metrics stream
        this.app.get('/metrics/stream', (req, res) => {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });

            const interval = setInterval(() => {
                if (this.metricsBuffer.length > 0) {
                    res.write(`data: ${JSON.stringify(this.metricsBuffer.shift())}\n\n`);
                }
            }, 100);

            req.on('close', () => {
                clearInterval(interval);
            });
        });
    }

    setupSocketIO() {
        this.io.on('connection', (socket) => {
            console.log(`📡 New connection from: ${socket.id}`);

            // Register station
            socket.on('register-station', (data) => {
                const { station_id, capabilities } = data;
                this.activeStations.set(station_id, {
                    socket_id: socket.id,
                    capabilities,
                    connected_at: new Date()
                });

                console.log(`✅ Station ${station_id} registered`);

                if (station_id === 'STATION_3') {
                    console.log('🎯 CRITICAL: Station 3 connected - Deepgram optimizer active!');
                    // Send optimized knobs to Station 3
                    socket.emit('apply-knobs', {
                        knobs: this.station3Knobs,
                        reason: 'Initial optimization for Deepgram'
                    });
                }
            });

            // Receive metrics from STTTTSserver
            socket.on('metrics', async (data) => {
                try {
                    const snapshot = await this.processSTTTTSMetrics(data);

                    // Forward to V2.1.0 database
                    await this.forwardToV21Database(snapshot);

                    // Buffer for streaming
                    this.metricsBuffer.push(snapshot);

                    // Emit to dashboard clients
                    this.io.emit('metrics-update', snapshot);

                    // Special handling for Station 3
                    if (data.station_id === 'STATION_3') {
                        this.analyzeStation3Metrics(snapshot);
                    }
                } catch (error) {
                    console.error('Error processing metrics:', error);
                }
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                for (const [station_id, info] of this.activeStations.entries()) {
                    if (info.socket_id === socket.id) {
                        this.activeStations.delete(station_id);
                        console.log(`❌ Station ${station_id} disconnected`);

                        if (station_id === 'STATION_3') {
                            console.log('⚠️ WARNING: Station 3 disconnected - Deepgram optimization paused!');
                        }
                    }
                }
            });
        });
    }

    async processSTTTTSMetrics(data) {
        const {
            station_id = 'STATION_3',  // Default to Station 3 from STTTTSserver
            call_id = `call-${Date.now()}`,
            channel = 'caller',
            metrics = {},
            knobs = []
        } = data;

        // Build V2.1.0 compliant snapshot
        const snapshot = {
            id: uuidv4(),
            station_id,
            timestamp: new Date().toISOString(),
            call_id,
            channel,
            metrics: this.normalizeMetrics(metrics),
            knobs: knobs.length > 0 ? knobs : this.getStationKnobs(station_id)
        };

        // Add optional fields if available
        if (data.segment) {
            snapshot.segment = data.segment;
        }

        if (data.audio) {
            snapshot.audio = data.audio;
        }

        return snapshot;
    }

    normalizeMetrics(rawMetrics) {
        const normalized = {};

        // Initialize all 75 metrics with null
        for (const category of Object.values(this.metricCategories)) {
            for (const metric of category) {
                normalized[metric] = null;
            }
        }

        // Fill in provided metrics
        for (const [key, value] of Object.entries(rawMetrics)) {
            if (normalized.hasOwnProperty(key)) {
                normalized[key] = value;
            }
        }

        return normalized;
    }

    getStationMetrics(station_id) {
        // Return metrics relevant to each station
        const stationMetrics = {
            'STATION_1': [...this.metricCategories.performance, ...this.metricCategories.packet],
            'STATION_2': [...this.metricCategories.packet, ...this.metricCategories.buffer],
            'STATION_3': [...this.metricCategories.audio_quality, ...this.metricCategories.buffer],
            'STATION_7': [...this.metricCategories.packet, ...this.metricCategories.latency],
            'STATION_8': [...this.metricCategories.latency, ...this.metricCategories.performance],
            'STATION_9': [...this.metricCategories.audio_quality, ...this.metricCategories.latency],
            'STATION_10': [...this.metricCategories.latency, ...this.metricCategories.packet],
            'STATION_11': this.metricCategories.performance
        };

        return stationMetrics[station_id] || [];
    }

    getStationKnobs(station_id) {
        // Return knobs for each station
        if (station_id === 'STATION_3') {
            return this.station3Knobs;
        }

        // Default knobs for other stations
        const defaultKnobs = {
            'STATION_1': [
                { name: 'codec_selection', value: 'g711u' },
                { name: 'dtmf_mode', value: 'rfc2833' },
                { name: 'rtp_timeout', value: 30 }
            ],
            'STATION_2': [
                { name: 'jitter_buffer_ms', value: 50 },
                { name: 'packet_size', value: 20 },
                { name: 'fec_enabled', value: false }
            ],
            'STATION_7': [
                { name: 'output_buffer_size', value: 100 },
                { name: 'transmission_priority', value: 'high' },
                { name: 'qos_level', value: 46 }
            ],
            'STATION_8': [
                { name: 'pipeline_buffer_size', value: 200 },
                { name: 'priority_level', value: 'normal' },
                { name: 'flow_control', value: 'adaptive' }
            ],
            'STATION_9': [
                { name: 'elevenlabs.model_id', value: 'eleven_multilingual_v2' },
                { name: 'elevenlabs.voice_id', value: 'rachel' },
                { name: 'output_gain_db', value: 0 }
            ],
            'STATION_10': [
                { name: 'final_gain_adjustment', value: 0 },
                { name: 'echo_suppression', value: true },
                { name: 'final_buffer_size', value: 80 }
            ],
            'STATION_11': [
                { name: 'emotion_model', value: 'prosody' },
                { name: 'sensitivity_threshold', value: 0.5 },
                { name: 'emotion_smoothing', value: 0.3 }
            ]
        };

        return defaultKnobs[station_id] || [];
    }

    async processSnapshot(data) {
        // Process direct HTTP snapshot
        return this.processSTTTTSMetrics(data);
    }

    async forwardToV21Database(snapshot) {
        // Forward to our V2.1.0 compliant database integration (port 8083)
        return new Promise((resolve) => {
            const options = {
                hostname: 'localhost',
                port: 8083,
                path: '/api/v2.1/ingest',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(body);
                        if (result.success) {
                            console.log(`✅ Forwarded to V2.1.0 DB: ${snapshot.station_id}`);
                        }
                        resolve(result);
                    } catch (e) {
                        resolve({ error: 'Parse error' });
                    }
                });
            });

            req.on('error', (error) => {
                console.error('Failed to forward to V2.1.0:', error.message);
                resolve({ error: error.message });
            });

            req.write(JSON.stringify(snapshot));
            req.end();
        });
    }

    analyzeStation3Metrics(snapshot) {
        // Special analysis for Station 3 - influences Deepgram
        const metrics = snapshot.metrics;
        const criticalMetrics = {
            snr_db: metrics.snr_db,
            noise_floor_db: metrics.noise_floor_db,
            audio_level_dbfs: metrics.audio_level_dbfs,
            voice_activity_ratio: metrics.voice_activity_ratio,
            clipping_detected: metrics.clipping_detected
        };

        // Auto-adjust if metrics are poor
        let needsAdjustment = false;
        const adjustments = [];

        if (criticalMetrics.snr_db && criticalMetrics.snr_db < 20) {
            adjustments.push({ name: 'noise_reduction_strength', value: 5 });
            needsAdjustment = true;
        }

        if (criticalMetrics.audio_level_dbfs && criticalMetrics.audio_level_dbfs < -30) {
            adjustments.push({ name: 'agc.target_level_dbfs', value: -16 });
            needsAdjustment = true;
        }

        if (criticalMetrics.clipping_detected) {
            adjustments.push({ name: 'agc.compression_ratio', value: 6 });
            needsAdjustment = true;
        }

        if (needsAdjustment) {
            console.log('🔧 Station 3 needs adjustment for better Deepgram performance:', adjustments);
            this.io.emit('knob-update', {
                station_id: 'STATION_3',
                knobs: adjustments,
                reason: 'Auto-optimization for Deepgram'
            });
        }
    }

    start(port = 3001) {
        this.server.listen(port, () => {
            console.log(`\n🚀 MONITORING SERVER STARTED on port ${port}`);
            console.log('=' .repeat(70));
            console.log('\n📡 Socket.IO ready for STTTTSserver connections');
            console.log('🌐 HTTP API Endpoints:');
            console.log('   - GET  /health - Server health');
            console.log('   - POST /snapshot - Direct metric ingestion');
            console.log('   - GET  /station-capabilities - Station info');
            console.log('   - GET  /knob-catalog - Available knobs');
            console.log('   - POST /apply - Apply knob changes');
            console.log('   - GET  /metrics/stream - Real-time SSE stream');
            console.log('\n🎯 STATION_3 optimizer active - Influences Deepgram!');
            console.log('🔄 Forwarding to V2.1.0 database on port 8083');
            console.log('\n📍 Monitoring stations:');
            for (const [id, info] of Object.entries(this.STATION_MAP)) {
                const icon = info.critical ? '🎯' : '📡';
                console.log(`   ${icon} ${id}: ${info.name}`);
            }
            console.log('\n✨ Ready to bridge STTTTSserver → V2.1.0 Database → Dashboard');
            console.log('=' .repeat(70));
        });
    }
}

// Create and start the monitoring server
const monitoringServer = new MonitoringServer();

// Check if required dependencies are available
try {
    require.resolve('express');
    require.resolve('socket.io');
    require.resolve('cors');
} catch (e) {
    console.log('📦 Installing required dependencies...');
    require('child_process').execSync('npm install express socket.io cors', { stdio: 'inherit' });
}

// Start the server
monitoringServer.start(3001);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down monitoring server...');
    process.exit(0);
});

module.exports = MonitoringServer;