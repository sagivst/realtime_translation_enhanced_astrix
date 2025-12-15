/**
 * Monitoring API Server with NO FAKE DATA
 * Uses RealStationCollector that only shows real activity
 */

const express = require('express');
const cors = require('cors');
const RealStationCollector = require('./monitoring-real-data-collector-no-fake-fixed');

const app = express();
const PORT = 3090;

// Initialize collector
const collector = new RealStationCollector();

// Middleware
app.use(cors());
app.use(express.json());

// Start data collection
collector.startCollection();

// API Routes

// Get current snapshot of all stations
app.get('/api/snapshots', (req, res) => {
    try {
        const snapshot = collector.getAllMetrics();
        res.json(snapshot);
    } catch (error) {
        console.error('[API] Error getting snapshots:', error);
        res.status(500).json({ error: 'Failed to get snapshots' });
    }
});

// Get metrics for specific station and extension
app.get('/api/snapshots/:station/:extension', (req, res) => {
    try {
        const { station, extension } = req.params;
        const metrics = collector.getMetrics(station, extension);

        if (!metrics) {
            return res.status(404).json({ error: 'Station/extension not found' });
        }

        res.json({
            station,
            extension,
            metrics,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[API] Error getting station metrics:', error);
        res.status(500).json({ error: 'Failed to get station metrics' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        collector: 'RealStationCollector (NO FAKE DATA)'
    });
});

// Get system status
app.get('/api/status', (req, res) => {
    const snapshot = collector.getAllMetrics();
    let activeCount = 0;
    let idleCount = 0;
    let offlineCount = 0;

    for (const station in snapshot.stations) {
        for (const ext in snapshot.stations[station]) {
            const status = snapshot.stations[station][ext].status;
            if (status === 'active') activeCount++;
            else if (status === 'idle') idleCount++;
            else offlineCount++;
        }
    }

    res.json({
        active: activeCount,
        idle: idleCount,
        offline: offlineCount,
        totalStations: 12,
        totalExtensions: 24,
        timestamp: new Date().toISOString()
    });
});

// Placeholder endpoints for compatibility
app.get('/api/snapshots/history', (req, res) => {
    res.json({
        station: req.query.station || 'Station-3',
        extension: req.query.extension || '3333',
        data: [],
        message: 'History not available in real-time mode'
    });
});

app.get('/api/config/knobs/:station/:extension', (req, res) => {
    res.json({
        station: req.params.station,
        extension: req.params.extension,
        knobs: {},
        message: 'Knob configuration not available in real-time mode'
    });
});

app.post('/api/optimize', (req, res) => {
    res.json({
        recommendations: [],
        message: 'Optimization not available in real-time mode'
    });
});

app.get('/api/alerts', (req, res) => {
    res.json([]);
});

// Start server
app.listen(PORT, () => {
    console.log(`[Monitoring API] ✅ Server running on port ${PORT}`);
    console.log(`[Monitoring API] 📊 Real-time data only (NO FAKE DATA)`);
    console.log(`[Monitoring API] 🔌 Endpoints:`);
    console.log(`  - GET /api/snapshots - All station metrics`);
    console.log(`  - GET /api/snapshots/:station/:extension - Specific station metrics`);
    console.log(`  - GET /api/health - API health check`);
    console.log(`  - GET /api/status - System status summary`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[Monitoring API] Shutting down...');
    collector.stopCollection();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('[Monitoring API] Shutting down...');
    collector.stopCollection();
    process.exit(0);
});