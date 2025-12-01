#!/usr/bin/env node

const express = require('express');
const http = require('http');
const path = require('path');

const app = express();

// Enable CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Serve static HTML files
app.use(express.static('/home/azureuser'));

// Proxy /api/snapshots to the database server on port 8083
app.get('/api/snapshots', (req, res) => {
    console.log('Proxying /api/snapshots request to port 8083...');

    const options = {
        hostname: 'localhost',
        port: 8083,
        path: '/api/snapshots',
        method: 'GET'
    };

    const proxyReq = http.request(options, (proxyRes) => {
        let data = '';

        proxyRes.on('data', chunk => {
            data += chunk;
        });

        proxyRes.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                console.log(`Returning ${parsed.length} snapshots`);
                res.json(parsed);
            } catch (error) {
                console.error('Failed to parse response:', error);
                res.status(500).json({ error: 'Invalid response from database' });
            }
        });
    });

    proxyReq.on('error', (error) => {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    });

    proxyReq.end();
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', proxy: 'active' });
});

const PORT = 8080;
app.listen(PORT, () => {
    console.log(`
🚀 Proxy Dashboard Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Port: ${PORT}
   Proxying to: localhost:8083

   Dashboard: http://20.170.155.53:8080/database-records.html
   API: http://20.170.155.53:8080/api/snapshots
`);
});