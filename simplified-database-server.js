#!/usr/bin/env node

const http = require('http');
const { Pool } = require('pg');

// Simple database server for V2.1.0 snapshots
class SimpleDatabaseServer {
    constructor() {
        this.pool = new Pool({
            host: 'localhost',
            port: 5432,
            database: 'audio_optimization',
            user: 'postgres',
            password: 'postgres'  // Explicitly set password
        });

        this.snapshots = [];  // In-memory cache
        this.initDatabase();
    }

    async initDatabase() {
        try {
            // Test connection
            const client = await this.pool.connect();
            console.log('✅ Connected to PostgreSQL');

            // Get recent snapshots
            const result = await client.query(`
                SELECT * FROM station_snapshots
                ORDER BY timestamp DESC
                LIMIT 100
            `);
            this.snapshots = result.rows;
            console.log(`📊 Loaded ${this.snapshots.length} snapshots from database`);

            client.release();
        } catch (error) {
            console.error('⚠️ Database connection failed:', error.message);
            console.log('📝 Running in memory-only mode');
        }
    }

    async storeSnapshot(snapshot) {
        // Always add to memory cache
        this.snapshots.unshift(snapshot);
        if (this.snapshots.length > 100) {
            this.snapshots = this.snapshots.slice(0, 100);
        }

        // Try to store in database
        try {
            const client = await this.pool.connect();

            await client.query(`
                INSERT INTO station_snapshots (
                    id, station_id, timestamp, call_id, channel,
                    metrics, knobs, knobs_effective, constraints, targets,
                    segment, audio, totals
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, [
                snapshot.id,
                snapshot.station_id,
                snapshot.timestamp,
                snapshot.call_id,
                snapshot.channel,
                JSON.stringify(snapshot.metrics || {}),
                JSON.stringify(snapshot.knobs || []),
                JSON.stringify(snapshot.knobs_effective || []),
                JSON.stringify(snapshot.constraints || {}),
                JSON.stringify(snapshot.targets || {}),
                JSON.stringify(snapshot.segment || {}),
                JSON.stringify(snapshot.audio || {}),
                JSON.stringify(snapshot.totals || {})
            ]);

            client.release();
            console.log(`💾 Stored snapshot for ${snapshot.station_id}`);
        } catch (error) {
            console.log(`⚠️ Database write failed (using memory): ${error.message}`);
        }
    }

    handleRequest(req, res) {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            return res.end();
        }

        const url = new URL(req.url, `http://${req.headers.host}`);

        // GET /api/snapshots - Return snapshots for dashboard
        if (req.method === 'GET' && url.pathname === '/api/snapshots') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(this.snapshots));
        }

        // POST /api/v2.1/ingest - Receive new snapshot
        if (req.method === 'POST' && url.pathname === '/api/v2.1/ingest') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const snapshot = JSON.parse(body);

                    // Ensure required fields
                    snapshot.id = snapshot.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    snapshot.timestamp = snapshot.timestamp || new Date().toISOString();

                    await this.storeSnapshot(snapshot);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, id: snapshot.id }));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
            return;
        }

        // GET /api/health
        if (req.method === 'GET' && url.pathname === '/api/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                status: 'healthy',
                snapshots: this.snapshots.length,
                mode: this.pool ? 'database' : 'memory'
            }));
        }

        // Not found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }

    start(port = 8083) {
        const server = http.createServer((req, res) => this.handleRequest(req, res));

        server.listen(port, () => {
            console.log(`
🚀 Simplified Database Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Port: ${port}
   Mode: PostgreSQL + In-Memory Cache

   Endpoints:
   - GET  /api/snapshots       - Get snapshots for dashboard
   - POST /api/v2.1/ingest    - Ingest new snapshot
   - GET  /api/health         - Health check

   Dashboard: http://20.170.155.53:8080/database-records.html
`);
        });
    }
}

// Start server
const server = new SimpleDatabaseServer();
server.start();