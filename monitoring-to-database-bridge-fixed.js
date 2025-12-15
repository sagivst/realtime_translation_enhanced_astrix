#!/usr/bin/env node

/**
 * Bridge to connect monitoring server (port 3001) to database server (port 8083)
 * Receives BOTH 'unified-metrics' AND 'metrics' events and forwards them to the database
 */

const io = require('socket.io-client');
const http = require('http');

// Connect to monitoring server
const monitoringSocket = io('http://localhost:3001');

console.log('🌉 Monitoring-to-Database Bridge Starting (FIXED - listens to metrics + unified-metrics)...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

let messageCount = 0;
let lastUpdate = null;

monitoringSocket.on('connect', () => {
    console.log('✅ Connected to monitoring server on port 3001');
});

// Forward function - handles both event types
async function forwardToDatabase(data, eventType) {
    messageCount++;

    // Transform data for database storage
    const snapshot = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        station_id: data.station_id || data.stationId || 'STATION_9',
        extension: data.extension || 'unknown',
        timestamp: data.timestamp || new Date().toISOString(),
        call_id: data.call_id || data.callId || 'no-call',
        channel: data.extension || 'default',

        // Store ALL metrics and knobs
        metrics: data.metrics || data,
        knobs: data.knobs || {},

        // Additional fields for compatibility
        knobs_effective: [],
        constraints: {},
        targets: {},
        segment: {
            metric_count: data.metric_count || Object.keys(data.metrics || data).length,
            knob_count: data.knob_count || Object.keys(data.knobs || {}).length
        },
        audio: {},
        totals: {
            metrics_received: Object.keys(data.metrics || data).length,
            knobs_received: Object.keys(data.knobs || {}).length,
            alerts: (data.alerts || []).length
        }
    };

    // Send to database server
    const postData = JSON.stringify(snapshot);

    const options = {
        hostname: 'localhost',
        port: 8083,
        path: '/api/monitoring-data',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            const now = new Date().toLocaleTimeString();
            if (res.statusCode === 200) {
                console.log(`[${now}] ✅ Stored ${eventType}: ${snapshot.station_id}-${snapshot.extension}`);
                lastUpdate = now;
            } else {
                console.error(`❌ Failed to store snapshot: ${res.statusCode}`);
            }
        });
    });

    req.on('error', (error) => {
        console.error(`❌ Database connection error: ${error.message}`);
    });

    req.write(postData);
    req.end();
}

// Listen for unified metrics (new format)
monitoringSocket.on('unified-metrics', async (data) => {
    await forwardToDatabase(data, 'unified-metrics');
});

// Listen for legacy metrics (old format from STATION_9)
monitoringSocket.on('metrics', async (data) => {
    await forwardToDatabase(data, 'metrics');
});

// Listen for snapshot events
monitoringSocket.on('snapshot', async (data) => {
    await forwardToDatabase(data, 'snapshot');
});

monitoringSocket.on('disconnect', () => {
    console.log('⚠️ Disconnected from monitoring server');
});

monitoringSocket.on('error', (error) => {
    console.error('❌ Monitoring connection error:', error.message);
});

// Status report every 10 seconds
setInterval(() => {
    console.log(`📊 Bridge Status: Messages forwarded: ${messageCount}, Last update: ${lastUpdate || 'Never'}`);
}, 10000);
