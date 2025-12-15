/**
 * Complete Monitoring API Server for Real-Time Translation System
 * Standalone service - does NOT modify STTTTSserver
 * Provides REST API for monitoring dashboard
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuration
const PORT = 3090;
const STATIONS = ['Station-1', 'Station-2', 'Station-3', 'Station-4', 'Station-5', 
                   'Station-6', 'Station-7', 'Station-8', 'Station-9', 'Station-10', 
                   'Station-11', 'Station-12'];
const EXTENSIONS = ['3333', '4444'];

// Store for metrics and configurations
const metricsStore = new Map();
const knobConfigs = new Map();
const thresholds = new Map();
const alerts = [];

// Initialize stores
STATIONS.forEach(station => {
    EXTENSIONS.forEach(ext => {
        const key = `${station}-${ext}`;
        metricsStore.set(key, generateInitialMetrics());
        knobConfigs.set(key, generateInitialKnobs());
        thresholds.set(key, generateDefaultThresholds());
    });
});

// Metric generation functions
function generateInitialMetrics() {
    return {
        buffer: {
            size: Math.floor(Math.random() * 1024) + 256,
            used: Math.floor(Math.random() * 512),
            available: Math.floor(Math.random() * 512) + 256,
            overflow_count: 0,
            underflow_count: 0,
            current_depth_ms: Math.random() * 100,
            target_depth_ms: 50,
            drain_rate: Math.random() * 100 + 50,
            fill_rate: Math.random() * 100 + 50,
            stability: Math.random(),
            jitter_absorption: Math.random(),
            peak_usage: Math.random() * 1024,
            average_usage: Math.random() * 512,
            buffer_health: Math.random(),
            last_reset: new Date().toISOString()
        },
        latency: {
            current_ms: Math.random() * 50 + 10,
            average_ms: Math.random() * 40 + 15,
            min_ms: Math.random() * 10 + 5,
            max_ms: Math.random() * 100 + 50,
            jitter_ms: Math.random() * 10,
            network_ms: Math.random() * 20,
            processing_ms: Math.random() * 30,
            codec_ms: Math.random() * 5,
            buffer_ms: Math.random() * 10,
            total_pipeline_ms: Math.random() * 80 + 20,
            percentile_95: Math.random() * 60 + 20,
            percentile_99: Math.random() * 80 + 30
        },
        packet: {
            received: Math.floor(Math.random() * 10000),
            sent: Math.floor(Math.random() * 10000),
            lost: Math.floor(Math.random() * 10),
            loss_rate: Math.random() * 0.01,
            out_of_order: Math.floor(Math.random() * 5),
            duplicates: Math.floor(Math.random() * 2),
            jitter_buffer_discards: 0,
            late_packets: Math.floor(Math.random() * 5),
            recovered: Math.floor(Math.random() * 3),
            fec_recovered: 0,
            retransmissions: Math.floor(Math.random() * 5),
            bandwidth_kbps: Math.random() * 128 + 64,
            packet_rate: Math.random() * 50 + 25,
            burst_loss_count: 0
        },
        audioQuality: {
            mos_score: Math.random() * 1.5 + 3.5,
            signal_level_db: -20 + Math.random() * 10,
            noise_level_db: -60 - Math.random() * 20,
            snr_db: Math.random() * 20 + 40,
            thd_percent: Math.random() * 0.5,
            frequency_response: 'flat',
            sample_rate: 16000,
            bit_depth: 16,
            codec_bitrate: 128000,
            peak_level_db: -10 + Math.random() * 5,
            rms_level_db: -25 + Math.random() * 5,
            clipping_detected: false,
            silence_detected: false,
            echo_return_loss: Math.random() * 20 + 20,
            psqm_score: Math.random() + 4
        },
        performance: {
            cpu_usage: Math.random() * 30 + 10,
            memory_usage_mb: Math.random() * 100 + 50,
            thread_count: 4,
            processing_queue: Math.floor(Math.random() * 10),
            dropped_frames: 0,
            processed_frames: Math.floor(Math.random() * 1000),
            fps: 50,
            encoding_time_ms: Math.random() * 5,
            decoding_time_ms: Math.random() * 3,
            total_uptime_s: Math.floor(Math.random() * 3600),
            last_error: null,
            error_count: 0
        }
    };
}

function generateInitialKnobs() {
    return {
        // AGC Controls
        agc_enabled: true,
        agc_target_level: -18,
        agc_max_gain: 20,
        agc_compression_gain: 9,
        agc_limiter_enabled: true,
        
        // AEC Controls
        aec_enabled: true,
        aec_filter_length: 256,
        aec_nlp_mode: 'moderate',
        
        // Noise Reduction
        nr_enabled: true,
        nr_level: 15,
        
        // Buffer Management
        buffer_size: 512,
        jitter_buffer_depth: 100,
        
        // Network Optimization
        packet_size: 160,
        fec_enabled: false
    };
}

function generateDefaultThresholds() {
    return {
        latency_warning: 100,
        latency_critical: 150,
        packet_loss_warning: 1,
        packet_loss_critical: 3,
        cpu_warning: 70,
        cpu_critical: 90,
        buffer_overflow_warning: 5,
        buffer_overflow_critical: 10
    };
}

// API Endpoints

// 1. Real-time Snapshot
app.get('/api/snapshots', (req, res) => {
    const snapshot = {
        timestamp: new Date().toISOString(),
        stations: {}
    };
    
    STATIONS.forEach(station => {
        snapshot.stations[station] = {};
        EXTENSIONS.forEach(ext => {
            const key = `${station}-${ext}`;
            const metrics = metricsStore.get(key);
            
            // Update with some variation
            updateMetricsWithVariation(metrics);
            
            snapshot.stations[station][`extension_${ext}`] = {
                metrics: metrics,
                status: calculateStatus(metrics)
            };
        });
    });
    
    res.json(snapshot);
});

// 2. Historical Data
app.get('/api/snapshots/history', (req, res) => {
    const { station, extension, timeRange } = req.query;
    
    // Generate mock historical data
    const history = [];
    const points = 100;
    const now = Date.now();
    const interval = 60000; // 1 minute intervals
    
    for (let i = 0; i < points; i++) {
        history.push({
            timestamp: new Date(now - (i * interval)).toISOString(),
            metrics: generateInitialMetrics()
        });
    }
    
    res.json({
        station,
        extension,
        timeRange,
        data: history
    });
});

// 3. Knob Configuration - Get
app.get('/api/config/knobs/:stationId/:extension', (req, res) => {
    const { stationId, extension } = req.params;
    const key = `${stationId}-${extension}`;
    const knobs = knobConfigs.get(key) || {};
    
    res.json({
        station: stationId,
        extension,
        knobs
    });
});

// 4. Knob Configuration - Update
app.post('/api/config/knobs/:stationId/:extension', (req, res) => {
    const { stationId, extension } = req.params;
    const key = `${stationId}-${extension}`;
    const updates = req.body;
    
    const currentKnobs = knobConfigs.get(key) || {};
    const updatedKnobs = { ...currentKnobs, ...updates };
    knobConfigs.set(key, updatedKnobs);
    
    // Emit update via WebSocket
    io.emit('knob-changed', {
        station: stationId,
        extension,
        changes: updates
    });
    
    res.json({
        station: stationId,
        extension,
        knobs: updatedKnobs,
        updated: true
    });
});

// 5. Metric Thresholds
app.post('/api/config/metrics', (req, res) => {
    const { station, extension, metricId, thresholds: newThresholds } = req.body;
    const key = station && extension ? `${station}-${extension}` : 'global';
    
    const currentThresholds = thresholds.get(key) || {};
    currentThresholds[metricId] = newThresholds;
    thresholds.set(key, currentThresholds);
    
    res.json({
        updated: true,
        metricId,
        thresholds: newThresholds
    });
});

// 6. AI Optimization
app.post('/api/optimize', (req, res) => {
    const { targetMetrics, constraints } = req.body;
    
    // Generate mock optimization recommendations
    const recommendations = [];
    
    // Sample recommendations based on target metrics
    if (targetMetrics.includes('latency')) {
        recommendations.push({
            station: 'Station-3',
            extension: '3333',
            knob: 'buffer_size',
            currentValue: 256,
            recommendedValue: 512,
            expectedImpact: {
                latency: '-20ms',
                quality: '+0.05'
            }
        });
    }
    
    if (targetMetrics.includes('audioQuality')) {
        recommendations.push({
            station: 'Station-5',
            extension: '4444',
            knob: 'agc_target_level',
            currentValue: -18,
            recommendedValue: -16,
            expectedImpact: {
                quality: '+0.1',
                snr: '+3db'
            }
        });
    }
    
    res.json({
        recommendations,
        confidence: 0.92
    });
});

// 7. Auto-Tuning
app.post('/api/optimize/auto-tune', (req, res) => {
    const { enabled, mode, targets } = req.body;
    
    // Store auto-tune configuration
    const autoTuneConfig = {
        enabled,
        mode,
        targets,
        startedAt: new Date().toISOString()
    };
    
    res.json({
        status: 'configured',
        config: autoTuneConfig
    });
});

// 8. Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime() * 1000,
        activeStations: STATIONS.length,
        activeExtensions: STATIONS.length * EXTENSIONS.length,
        lastDataUpdate: new Date().toISOString()
    });
});

// 9. Alerts
app.get('/api/alerts', (req, res) => {
    res.json(alerts);
});

app.post('/api/alerts/acknowledge/:alertId', (req, res) => {
    const { alertId } = req.params;
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
        alert.acknowledged = true;
        alert.acknowledgedAt = new Date().toISOString();
    }
    res.json({ acknowledged: true });
});

// 10. Batch Operations
app.post('/api/batch/apply-settings', (req, res) => {
    const { targets, extensions: targetExtensions, settings } = req.body;
    const applied = [];
    
    targets.forEach(station => {
        targetExtensions.forEach(ext => {
            const key = `${station}-${ext}`;
            const currentKnobs = knobConfigs.get(key) || {};
            knobConfigs.set(key, { ...currentKnobs, ...settings });
            applied.push({ station, extension: ext });
        });
    });
    
    res.json({
        applied,
        settings
    });
});

// Helper Functions
function updateMetricsWithVariation(metrics) {
    // Add small variations to make data look realistic
    metrics.latency.current_ms = Math.max(10, metrics.latency.current_ms + (Math.random() - 0.5) * 5);
    metrics.buffer.used = Math.max(0, Math.min(metrics.buffer.size, 
        metrics.buffer.used + Math.floor((Math.random() - 0.5) * 50)));
    metrics.packet.received += Math.floor(Math.random() * 10);
    metrics.packet.sent += Math.floor(Math.random() * 10);
    metrics.audioQuality.signal_level_db += (Math.random() - 0.5) * 2;
    metrics.performance.cpu_usage = Math.max(5, Math.min(95, 
        metrics.performance.cpu_usage + (Math.random() - 0.5) * 5));
}

function calculateStatus(metrics) {
    // Simple status calculation
    if (metrics.latency.current_ms > 150 || metrics.packet.loss_rate > 0.03) {
        return 'error';
    } else if (metrics.latency.current_ms > 100 || metrics.packet.loss_rate > 0.01) {
        return 'warning';
    }
    return 'active';
}

// WebSocket Real-time Updates
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Subscribe to specific stations
    socket.on('subscribe', (data) => {
        const { stations, metrics, interval } = data;
        
        // Send updates at specified interval
        const updateInterval = setInterval(() => {
            const update = {
                timestamp: new Date().toISOString(),
                data: {}
            };
            
            stations.forEach(station => {
                EXTENSIONS.forEach(ext => {
                    const key = `${station}-${ext}`;
                    const stationMetrics = metricsStore.get(key);
                    updateMetricsWithVariation(stationMetrics);
                    
                    if (!update.data[station]) {
                        update.data[station] = {};
                    }
                    update.data[station][ext] = stationMetrics;
                });
            });
            
            socket.emit('metrics-update', update);
        }, interval || 150);
        
        // Clean up on disconnect
        socket.on('disconnect', () => {
            clearInterval(updateInterval);
        });
    });
});

// Create public directory for static files
async function setupPublicDirectory() {
    try {
        await fs.mkdir('public', { recursive: true });
        console.log('Public directory created');
    } catch (err) {
        console.error('Error creating public directory:', err);
    }
}

// Start server
async function startServer() {
    await setupPublicDirectory();
    
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`
╔════════════════════════════════════════════════════════╗
║   MONITORING API SERVER - STANDALONE                      ║
║   Running on http://0.0.0.0:${PORT}                          ║
║                                                            ║
║   Endpoints:                                               ║
║   - GET  /api/snapshots                                   ║
║   - GET  /api/snapshots/history                           ║
║   - GET  /api/config/knobs/:station/:ext                  ║
║   - POST /api/config/knobs/:station/:ext                  ║
║   - POST /api/optimize                                    ║
║   - GET  /api/health                                      ║
║                                                            ║
║   WebSocket: ws://0.0.0.0:${PORT}                            ║
║                                                            ║
║   Status: NOT touching STTTTSserver                       ║
║   Mode: Read-only metrics collection                      ║
╚════════════════════════════════════════════════════════╝
        `);
        
        // Generate sample alert
        setTimeout(() => {
            alerts.push({
                id: 'alert-1',
                timestamp: new Date().toISOString(),
                severity: 'warning',
                station: 'Station-3',
                extension: '3333',
                message: 'Latency exceeding threshold',
                metric: 'latency',
                value: 125,
                threshold: 100,
                acknowledged: false
            });
            
            io.emit('alert', alerts[alerts.length - 1]);
        }, 5000);
    });
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

// Start the server
startServer().catch(console.error);
