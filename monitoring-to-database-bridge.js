#!/usr/bin/env node

/**
 * Bridge to connect monitoring server (port 3001) to database server (port 8083)
 * Receives 'unified-metrics' events and forwards them to the database
 */

const io = require('socket.io-client');
const http = require('http');

// Connect to monitoring server
const monitoringSocket = io('http://localhost:3001');

console.log('🌉 Monitoring-to-Database Bridge Starting...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

let messageCount = 0;
let lastUpdate = null;

monitoringSocket.on('connect', () => {
    console.log('✅ Connected to monitoring server on port 3001');
});

// Listen for unified metrics from monitoring server
monitoringSocket.on('unified-metrics', async (data) => {
    messageCount++;

    // Transform data for database storage
    const snapshot = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        station_id: data.station_id,
        extension: data.extension,
        timestamp: data.timestamp || new Date().toISOString(),
        call_id: data.call_id || 'no-call',
        channel: data.extension || 'default',

        // Store ALL 75 metrics and 113 knobs
        metrics: data.metrics || {},
        knobs: data.knobs || {},

        // Additional fields for compatibility
        knobs_effective: [],
        constraints: {},
        targets: {},
        segment: {
            metric_count: data.metric_count || Object.keys(data.metrics || {}).length,
            knob_count: data.knob_count || Object.keys(data.knobs || {}).length
        },
        audio: {},
        totals: {
            metrics_received: Object.keys(data.metrics || {}).length,
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
            if (res.statusCode === 200) {
                const now = new Date().toLocaleTimeString();
                console.log(`[${now}] ✅ Stored ${data.station_id}-${data.extension}: ${Object.keys(data.metrics || {}).length} metrics, ${Object.keys(data.knobs || {}).length} knobs`);
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
});

monitoringSocket.on('disconnect', () => {
    console.log('⚠️ Disconnected from monitoring server');
});

monitoringSocket.on('error', (error) => {
    console.error('❌ Monitoring connection error:', error.message);
});

// Status display
setInterval(() => {
    console.log(`\n📊 Bridge Status:`);
    console.log(`   Messages forwarded: ${messageCount}`);
    console.log(`   Last update: ${lastUpdate || 'Never'}`);
    console.log(`   Monitoring: ${monitoringSocket.connected ? 'Connected' : 'Disconnected'}`);
}, 30000);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down bridge...');
    console.log(`   Total messages forwarded: ${messageCount}`);
    monitoringSocket.disconnect();
    process.exit(0);
});

console.log('\n🔄 Bridge ready - forwarding unified metrics to database...');
console.log('   From: Monitoring Server (port 3001)');
console.log('   To: Database Server (port 8083)');
console.log('   Dashboard: http://20.170.155.53:8080/database-records.html\n');
// ALSO listen for legacy 'metrics' events (from older STTTTSserver)
monitoringSocket.on('metrics', async (data) => {
    messageCount++;
    
    // Transform legacy metrics data for database storage
    const snapshot = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        station_id: data.station_id || 'STATION_9',
        extension: data.extension || 'unknown',
        timestamp: data.timestamp || new Date().toISOString(),
        call_id: data.call_id || 'no-call',
        channel: data.extension || 'default',
        
        // Store metrics directly
        metrics: data,
        knobs: {},
        
        // Additional fields
        knobs_effective: [],
        constraints: {},
        targets: {},
        segment: {
            metric_count: Object.keys(data).length,
            knob_count: 0
        },
        audio: {},
        totals: {
            metrics_received: Object.keys(data).length,
            knobs_received: 0,
            alerts: 0
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
            if (res.statusCode === 200) {
                const now = new Date().toLocaleTimeString();
                console.log(`[${now}] ✅ Stored LEGACY ${data.station_id || 'STATION_9'}-${data.extension}: ${Object.keys(data).length} fields`);
                lastUpdate = now;
            }
        });
    });
    
    req.on('error', (error) => {
        console.error(`❌ Database connection error: ${error.message}`);
    });
    
    req.write(postData);
    req.end();
});

console.log('📡 Also listening for legacy metrics events...');
