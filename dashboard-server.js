#!/usr/bin/env node

/**
 * Auto-Refreshing Dashboard Server
 * Serves dashboard with live data from PostgreSQL
 */

const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8080;

// Database connection
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'audio_optimization',
    user: 'postgres'
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// API endpoint to get snapshots
app.get('/api/snapshots', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                ss.id,
                ss.station_id,
                ss.timestamp,
                ss.audio_ref,
                ss.metrics,
                ss.logs,
                c.external_call_id as call_id,
                ch.name as channel,
                ch.leg as channel_leg,
                ch.metadata->>'extension' as extension,
                s.start_ms as segment_start_ms,
                s.end_ms as segment_end_ms,
                s.segment_type,
                s.transcript
            FROM station_snapshots ss
            LEFT JOIN segments s ON ss.segment_id = s.id
            LEFT JOIN channels ch ON s.channel_id = ch.id
            LEFT JOIN calls c ON ch.call_id = c.id
            ORDER BY ss.timestamp DESC
            LIMIT 100
        `);

        res.json({
            success: true,
            data: result.rows,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch data'
        });
    }
});

// Generate dashboard HTML with embedded data
app.get('/dashboard', async (req, res) => {
    try {
        // Fetch initial data
        const result = await pool.query(`
            SELECT
                ss.id,
                ss.station_id,
                ss.timestamp,
                ss.audio_ref,
                ss.metrics,
                ss.logs,
                c.external_call_id as call_id,
                ch.name as channel,
                ch.metadata->>'extension' as extension,
                s.start_ms as segment_start_ms,
                s.end_ms as segment_end_ms
            FROM station_snapshots ss
            LEFT JOIN segments s ON ss.segment_id = s.id
            LEFT JOIN channels ch ON s.channel_id = ch.id
            LEFT JOIN calls c ON ch.call_id = c.id
            ORDER BY ss.timestamp DESC
            LIMIT 50
        `);

        // Read dashboard template
        let html = fs.readFileSync(path.join(__dirname, 'dashboard-auto-refresh.html'), 'utf8');

        // Replace placeholder with actual data
        html = html.replace(
            'const DATA_PLACEHOLDER = [];',
            `const DATA_PLACEHOLDER = ${JSON.stringify(result.rows)};`
        );

        // Update API endpoint to use absolute URL
        html = html.replace(
            "const API_ENDPOINT = '/api/snapshots';",
            `const API_ENDPOINT = 'http://${req.headers.host}/api/snapshots';`
        );

        res.send(html);
    } catch (error) {
        console.error('Error generating dashboard:', error);
        res.status(500).send('Error loading dashboard');
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Dashboard server running at http://localhost:${PORT}/dashboard`);
    console.log(`   API endpoint: http://localhost:${PORT}/api/snapshots`);
    console.log(`   Auto-refresh enabled: 5 second intervals`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await pool.end();
    process.exit(0);
});