/**
 * Comprehensive Monitoring API Server
 * Real-time Translation Pipeline Monitoring System
 *
 * This server provides RESTful APIs for monitoring and controlling
 * the 12-station voice translation pipeline with 24 monitoring points
 */

const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Constants
const STATIONS = Array.from({ length: 12 }, (_, i) => `Station-${i + 1}`);
const EXTENSIONS = ['3333', '4444'];
const POLLING_INTERVAL = 150; // ms

// In-memory data stores (replace with database in production)
const currentMetrics = new Map();
const knobConfigurations = new Map();
const metricThresholds = new Map();
const configTemplates = new Map();
const alertHistory = [];

// Initialize default knob configurations
function initializeKnobDefaults() {
    STATIONS.forEach(station => {
        EXTENSIONS.forEach(extension => {
            const key = `${station}:${extension}`;
            knobConfigurations.set(key, {
                // AGC Controls (15 knobs)
                agc_enabled: true,
                agc_target_level: -18,
                agc_max_gain: 30,
                agc_compression_gain: 9,
                agc_limiter_enabled: true,
                agc_target_level_dbfs: 3,
                agc_compression_gain_db: 15,
                agc_mode: 'adaptive',
                agc_window: 10,
                agc_release_time: 60,
                agc_attack_time: 5,
                agc_hold_time: 0,
                agc_noise_gate_enabled: false,
                agc_noise_gate_threshold: -50,
                agc_saturation_margin: 2,

                // AEC Controls (12 knobs)
                aec_enabled: true,
                aec_filter_length: 200,
                aec_nlp_mode: 'moderate',
                aec_suppression_level: 'high',
                aec_comfort_noise: true,
                aec_drift_compensation: true,
                aec_mobile_mode: false,
                aec_routing_mode: 'loudSpeakerphone',
                aec_skew_mode: 'default',
                aec_delay_logging: false,
                aec_extended_filter: false,
                aec_refined_adaptive_filter: false,

                // Noise Reduction (10 knobs)
                nr_enabled: true,
                nr_level: 'high',
                nr_type: 'stationary',
                nr_stationary_level: 12,
                nr_transient_suppression: true,
                nr_voice_activity_detection: true,
                nr_frequency_bands: 32,
                nr_spectral_subtraction: 0.8,
                nr_wiener_filter: true,
                nr_comfort_noise_level: -70,

                // Equalizer (20 knobs)
                eq_enabled: false,
                eq_band_1_freq: 60,
                eq_band_1_gain: 0,
                eq_band_2_freq: 170,
                eq_band_2_gain: 0,
                eq_band_3_freq: 350,
                eq_band_3_gain: 0,
                eq_band_4_freq: 1000,
                eq_band_4_gain: 0,
                eq_band_5_freq: 3500,
                eq_band_5_gain: 0,
                eq_band_6_freq: 10000,
                eq_band_6_gain: 0,
                eq_band_7_freq: 0,
                eq_band_7_gain: 0,
                eq_band_8_freq: 0,
                eq_band_8_gain: 0,
                eq_band_9_freq: 0,
                eq_band_9_gain: 0,
                eq_band_10_freq: 0,
                eq_band_10_gain: 0,

                // Voice Enhancement (15 knobs)
                voice_boost: 0,
                clarity_enhancement: 0,
                de_esser_strength: 0,
                brilliance: 0,
                warmth: 0,
                presence: 0,
                bass_boost: 0,
                treble_boost: 0,
                mid_scoop: 0,
                formant_shift: 0,
                pitch_correction: false,
                vibrato_suppression: false,
                breathiness_reduction: 0,
                harshness_reduction: 0,
                sibilance_control: 0,

                // Compression/Limiting (12 knobs)
                compressor_enabled: false,
                compressor_threshold: -20,
                compressor_ratio: 4,
                compressor_attack: 10,
                compressor_release: 100,
                compressor_knee: 2.5,
                compressor_makeup_gain: 0,
                compressor_lookahead: 5,
                limiter_enabled: true,
                limiter_threshold: -1,
                limiter_release: 50,
                limiter_lookahead: 5,

                // Spatial Processing (10 knobs)
                stereo_width: 100,
                reverb_amount: 0,
                room_size: 'medium',
                pre_delay: 20,
                damping: 50,
                early_reflections: 30,
                late_reflections: 40,
                diffusion: 85,
                high_frequency_damping: 6000,
                low_frequency_damping: 250,

                // Buffer Management (8 knobs)
                buffer_size: 512,
                prefetch_ms: 100,
                jitter_buffer_depth: 200,
                playout_delay: 50,
                adaptive_buffering: true,
                buffer_overflow_policy: 'drop_oldest',
                max_buffer_size: 2048,
                min_buffer_size: 128,

                // Network Optimization (9 knobs)
                packet_size: 320,
                fec_enabled: true,
                fec_percentage: 20,
                retransmit_timeout: 200,
                max_retransmits: 3,
                congestion_control: 'bbr',
                pacing_rate: 1.25,
                burst_size: 10,
                network_priority: 'high'
            });
        });
    });
}

// Initialize metric thresholds
function initializeMetricThresholds() {
    const defaultThresholds = {
        buffer_overflow_count: { warning: 5, critical: 10 },
        buffer_underflow_count: { warning: 5, critical: 10 },
        avg_buffer_level: { warning: 80, critical: 95 },
        end_to_end_latency: { warning: 150, critical: 300 },
        processing_latency: { warning: 50, critical: 100 },
        network_latency: { warning: 30, critical: 60 },
        packet_loss_rate: { warning: 0.01, critical: 0.05 },
        packets_received: { warning: null, critical: null },
        packets_sent: { warning: null, critical: null },
        audio_level_rms: { warning: -40, critical: -50 },
        audio_peak_level: { warning: -3, critical: -1 },
        snr: { warning: 20, critical: 15 },
        cpu_usage: { warning: 70, critical: 90 },
        memory_usage: { warning: 70, critical: 85 }
    };

    Object.entries(defaultThresholds).forEach(([metric, thresholds]) => {
        metricThresholds.set(metric, thresholds);
    });
}

// Generate mock metrics for a station/extension
function generateMockMetrics(station, extension) {
    return {
        buffer: {
            overflow_count: Math.floor(Math.random() * 10),
            underflow_count: Math.floor(Math.random() * 10),
            current_size: Math.floor(Math.random() * 1024) + 256,
            max_size: 2048,
            min_size: 128,
            avg_level: Math.random() * 100,
            peak_level: Math.random() * 100,
            drain_rate: Math.random() * 100 + 50,
            fill_rate: Math.random() * 100 + 50,
            stability_score: Math.random(),
            last_overflow_time: null,
            last_underflow_time: null,
            total_processed_bytes: Math.floor(Math.random() * 1000000),
            dropped_frames: Math.floor(Math.random() * 100),
            corrupted_frames: Math.floor(Math.random() * 10)
        },
        latency: {
            end_to_end: Math.random() * 200 + 50,
            processing: Math.random() * 50 + 10,
            network: Math.random() * 40 + 5,
            codec: Math.random() * 10 + 2,
            buffer: Math.random() * 20 + 5,
            jitter: Math.random() * 15,
            max_latency: Math.random() * 300 + 100,
            min_latency: Math.random() * 30 + 10,
            avg_latency: Math.random() * 100 + 40,
            p95_latency: Math.random() * 150 + 60,
            p99_latency: Math.random() * 200 + 80,
            stability: Math.random()
        },
        packet: {
            loss_rate: Math.random() * 0.05,
            loss_count: Math.floor(Math.random() * 100),
            received_count: Math.floor(Math.random() * 10000) + 5000,
            sent_count: Math.floor(Math.random() * 10000) + 5000,
            duplicate_count: Math.floor(Math.random() * 50),
            out_of_order_count: Math.floor(Math.random() * 100),
            corrected_count: Math.floor(Math.random() * 50),
            avg_size: Math.floor(Math.random() * 200) + 160,
            max_size: 1500,
            min_size: 60,
            throughput_kbps: Math.random() * 100 + 50,
            goodput_kbps: Math.random() * 90 + 45,
            overhead_percent: Math.random() * 10,
            efficiency: Math.random()
        },
        audioQuality: {
            level_rms: -Math.random() * 30 - 20,
            peak_level: -Math.random() * 10,
            snr: Math.random() * 30 + 20,
            thd: Math.random() * 0.1,
            sinad: Math.random() * 40 + 30,
            pesq_score: Math.random() * 2 + 2.5,
            mos_score: Math.random() * 2 + 3,
            frequency_response_deviation: Math.random() * 5,
            spectral_centroid: Math.random() * 2000 + 1000,
            spectral_rolloff: Math.random() * 4000 + 3000,
            zero_crossing_rate: Math.random() * 0.1,
            clipping_detected: false,
            silence_detected: false,
            noise_level: -Math.random() * 20 - 40,
            voice_activity_ratio: Math.random()
        },
        performance: {
            cpu_usage: Math.random() * 50 + 20,
            memory_usage: Math.random() * 40 + 30,
            thread_count: Math.floor(Math.random() * 10) + 5,
            handle_count: Math.floor(Math.random() * 100) + 50,
            processing_time_ms: Math.random() * 20 + 5,
            queue_depth: Math.floor(Math.random() * 100),
            context_switches: Math.floor(Math.random() * 1000),
            page_faults: Math.floor(Math.random() * 100),
            io_operations: Math.floor(Math.random() * 500),
            cache_hits: Math.random(),
            gc_collections: Math.floor(Math.random() * 10),
            gc_pause_ms: Math.random() * 5
        }
    };
}

// Calculate station status based on metrics
function calculateStatus(metrics) {
    const critical = [];
    const warnings = [];

    // Check buffer metrics
    if (metrics.buffer.overflow_count > 10) critical.push('buffer_overflow');
    else if (metrics.buffer.overflow_count > 5) warnings.push('buffer_overflow');

    // Check latency metrics
    if (metrics.latency.end_to_end > 300) critical.push('high_latency');
    else if (metrics.latency.end_to_end > 150) warnings.push('elevated_latency');

    // Check packet metrics
    if (metrics.packet.loss_rate > 0.05) critical.push('packet_loss');
    else if (metrics.packet.loss_rate > 0.01) warnings.push('minor_packet_loss');

    // Check audio quality
    if (metrics.audioQuality.snr < 15) critical.push('poor_audio_quality');
    else if (metrics.audioQuality.snr < 20) warnings.push('degraded_audio_quality');

    // Check performance
    if (metrics.performance.cpu_usage > 90) critical.push('high_cpu');
    else if (metrics.performance.cpu_usage > 70) warnings.push('elevated_cpu');

    if (critical.length > 0) return 'error';
    if (warnings.length > 0) return 'warning';
    return 'active';
}

// API Routes

// GET /api/snapshots - Get current snapshot of all stations
app.get('/api/snapshots', (req, res) => {
    const snapshot = {
        timestamp: new Date().toISOString(),
        stations: {}
    };

    STATIONS.forEach(station => {
        snapshot.stations[station] = {};
        EXTENSIONS.forEach(extension => {
            const metrics = generateMockMetrics(station, extension);
            const key = `${station}:${extension}`;
            currentMetrics.set(key, metrics);

            snapshot.stations[station][`extension_${extension}`] = {
                metrics,
                status: calculateStatus(metrics)
            };
        });
    });

    res.json(snapshot);
});

// GET /api/snapshots/history - Get historical data
app.get('/api/snapshots/history', (req, res) => {
    const { station, extension, timeRange = '1h' } = req.query;

    // In production, this would query from time-series database
    const history = [];
    const dataPoints = timeRange === '1h' ? 240 : 480; // 150ms intervals
    const now = Date.now();

    for (let i = 0; i < dataPoints; i++) {
        history.push({
            timestamp: new Date(now - i * 150).toISOString(),
            metrics: generateMockMetrics(station, extension)
        });
    }

    res.json({
        station,
        extension,
        timeRange,
        dataPoints: history
    });
});

// GET /api/config/knobs/:stationId/:extension - Get knob configuration
app.get('/api/config/knobs/:stationId/:extension', (req, res) => {
    const { stationId, extension } = req.params;
    const key = `${stationId}:${extension}`;
    const config = knobConfigurations.get(key);

    if (!config) {
        return res.status(404).json({ error: 'Configuration not found' });
    }

    res.json({
        station: stationId,
        extension,
        knobs: config
    });
});

// POST /api/config/knobs/:stationId/:extension - Update knob configuration
app.post('/api/config/knobs/:stationId/:extension', (req, res) => {
    const { stationId, extension } = req.params;
    const updates = req.body;
    const key = `${stationId}:${extension}`;

    let config = knobConfigurations.get(key);
    if (!config) {
        return res.status(404).json({ error: 'Configuration not found' });
    }

    // Apply updates
    Object.entries(updates).forEach(([knob, value]) => {
        if (config.hasOwnProperty(knob)) {
            config[knob] = value;
        }
    });

    knobConfigurations.set(key, config);

    // Emit real-time update
    io.emit('knob-changed', {
        station: stationId,
        extension,
        changes: updates
    });

    res.json({
        station: stationId,
        extension,
        updated: Object.keys(updates),
        config
    });
});

// POST /api/config/metrics - Update metric thresholds
app.post('/api/config/metrics', (req, res) => {
    const { metricId, thresholds } = req.body;

    if (!metricId || !thresholds) {
        return res.status(400).json({ error: 'Missing metricId or thresholds' });
    }

    metricThresholds.set(metricId, thresholds);

    res.json({
        metricId,
        thresholds,
        updated: new Date().toISOString()
    });
});

// GET /api/config/templates - Get all configuration templates
app.get('/api/config/templates', (req, res) => {
    const templates = Array.from(configTemplates.entries()).map(([id, template]) => ({
        id,
        ...template
    }));

    res.json(templates);
});

// POST /api/config/templates - Create new configuration template
app.post('/api/config/templates', (req, res) => {
    const { name, description, config } = req.body;
    const id = `template_${Date.now()}`;

    const template = {
        name,
        description,
        config,
        created: new Date().toISOString()
    };

    configTemplates.set(id, template);

    res.json({
        id,
        ...template
    });
});

// POST /api/optimize - AI-powered optimization
app.post('/api/optimize', (req, res) => {
    const { targetMetrics, constraints } = req.body;

    // Simulated AI recommendations
    const recommendations = [];

    STATIONS.slice(0, 3).forEach(station => {
        EXTENSIONS.forEach(extension => {
            const key = `${station}:${extension}`;
            const currentConfig = knobConfigurations.get(key);
            const currentMetricsData = currentMetrics.get(key);

            if (targetMetrics.includes('latency') && currentMetricsData) {
                if (currentMetricsData.latency.end_to_end > 150) {
                    recommendations.push({
                        station,
                        extension,
                        knob: 'buffer_size',
                        currentValue: currentConfig.buffer_size,
                        recommendedValue: Math.max(256, currentConfig.buffer_size - 128),
                        expectedImpact: {
                            latency: '-20ms',
                            quality: '-0.02'
                        }
                    });
                }
            }

            if (targetMetrics.includes('audioQuality') && currentMetricsData) {
                if (currentMetricsData.audioQuality.snr < 25) {
                    recommendations.push({
                        station,
                        extension,
                        knob: 'nr_level',
                        currentValue: currentConfig.nr_level,
                        recommendedValue: 'high',
                        expectedImpact: {
                            snr: '+5dB',
                            latency: '+5ms'
                        }
                    });
                }
            }
        });
    });

    res.json({
        recommendations,
        confidence: 0.85 + Math.random() * 0.1,
        analysisTime: Date.now()
    });
});

// POST /api/optimize/auto-tune - Enable/disable auto-tuning
app.post('/api/optimize/auto-tune', (req, res) => {
    const { enabled, mode, targets } = req.body;

    // In production, this would start/stop auto-tuning service
    const autoTuneConfig = {
        enabled,
        mode,
        targets,
        startedAt: enabled ? new Date().toISOString() : null
    };

    res.json({
        status: enabled ? 'active' : 'inactive',
        config: autoTuneConfig
    });
});

// GET /api/health - System health check
app.get('/api/health', (req, res) => {
    const activeStations = STATIONS.filter(station =>
        EXTENSIONS.some(ext => currentMetrics.has(`${station}:${ext}`))
    ).length;

    res.json({
        status: 'healthy',
        uptime: process.uptime() * 1000,
        activeStations,
        activeExtensions: activeStations * 2,
        lastDataUpdate: new Date().toISOString(),
        version: '1.0.0'
    });
});

// GET /api/alerts - Get active alerts
app.get('/api/alerts', (req, res) => {
    const alerts = [];

    currentMetrics.forEach((metrics, key) => {
        const [station, extension] = key.split(':');

        // Check for threshold violations
        if (metrics.latency.end_to_end > 300) {
            alerts.push({
                id: `alert_${Date.now()}_${Math.random()}`,
                station,
                extension,
                type: 'critical',
                metric: 'latency',
                value: metrics.latency.end_to_end,
                threshold: 300,
                message: `Critical latency detected: ${metrics.latency.end_to_end}ms`,
                timestamp: new Date().toISOString()
            });
        }

        if (metrics.packet.loss_rate > 0.05) {
            alerts.push({
                id: `alert_${Date.now()}_${Math.random()}`,
                station,
                extension,
                type: 'critical',
                metric: 'packet_loss',
                value: metrics.packet.loss_rate,
                threshold: 0.05,
                message: `High packet loss: ${(metrics.packet.loss_rate * 100).toFixed(2)}%`,
                timestamp: new Date().toISOString()
            });
        }
    });

    res.json(alerts);
});

// WebSocket handling for real-time updates
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('subscribe', (config) => {
        const { stations, metrics, interval } = config;

        // Start sending updates at specified interval
        const updateInterval = setInterval(() => {
            const update = {
                timestamp: new Date().toISOString(),
                data: {}
            };

            stations.forEach(station => {
                update.data[station] = {};
                EXTENSIONS.forEach(extension => {
                    const key = `${station}:${extension}`;
                    const metricsData = generateMockMetrics(station, extension);
                    currentMetrics.set(key, metricsData);

                    update.data[station][extension] = {
                        metrics: metricsData,
                        status: calculateStatus(metricsData)
                    };
                });
            });

            socket.emit('metrics-update', update);
        }, interval || POLLING_INTERVAL);

        socket.on('disconnect', () => {
            clearInterval(updateInterval);
            console.log('Client disconnected:', socket.id);
        });
    });
});

// Initialize system
initializeKnobDefaults();
initializeMetricThresholds();

// Start server
const PORT = process.env.PORT || 3090;
server.listen(PORT, () => {
    console.log(`Monitoring API Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Snapshots: http://localhost:${PORT}/api/snapshots`);
});

// Export for testing
module.exports = { app, io };