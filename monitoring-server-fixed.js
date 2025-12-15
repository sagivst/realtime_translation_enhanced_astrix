/**
 * Unified Monitoring Server
 *
 * Receives ALL 75 metrics + 113 knobs from all stations
 * Stores in database and serves to dashboard
 *
 * Port: 3001 (Socket.IO)
 * Database exposed on: Port 8080 (HTTP API)
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const MONITORING_PORT = 3001;
const DATABASE_API_PORT = 8080;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// ========================================================================
// IN-MEMORY DATABASE FOR MONITORING DATA
// ========================================================================

// Store for unified metrics (75 metrics + 113 knobs per station)
const metricsDatabase = {
  stations: {}, // station_id -> { last_seen, metrics, knobs, alerts, metadata }
  history: [],  // time-series data (last 1000 records)
  maxHistorySize: 1000
};

// Registered stations with their capabilities
const registeredStations = {};

// ========================================================================
// SOCKET.IO EVENT HANDLERS
// ========================================================================

io.on('connection', (socket) => {
  console.log('[Monitoring Server] 📡 Client connected:', socket.id);

  // Handle station registration
  socket.on('register-station', (data) => {
    const { station_id, extension, capabilities } = data;
    const key = extension ? `${station_id}_${extension}` : station_id;

    registeredStations[key] = {
      station_id,
      extension,
      capabilities,
      socket_id: socket.id,
      registered_at: new Date().toISOString()
    };

    // Initialize station in database if not exists
    if (!metricsDatabase.stations[key]) {
      metricsDatabase.stations[key] = {
        station_id,
        extension,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        metrics: {},
        knobs: {},
        alerts: [],
        metadata: {}
      };
    }

    console.log(`[Monitoring Server] ✅ Registered: ${key}`);
    console.log(`  - Name: ${capabilities?.name || 'Unknown'}`);
    console.log(`  - Type: ${capabilities?.type || 'Unknown'}`);
    console.log(`  - Metrics Available: ${capabilities?.metrics_available || 0}`);
    console.log(`  - Knobs Available: ${capabilities?.knobs_available || 0}`);
    console.log(`  - Critical: ${capabilities?.critical ? 'YES' : 'NO'}`);

    // Send acknowledgment
    socket.emit('registration-confirmed', {
      station_id,
      extension,
      timestamp: new Date().toISOString()
    });
  });

  // Handle unified metrics (ALL 75 metrics + ALL knobs)
  socket.on('unified-metrics', (data) => {
    const { station_id, extension, call_id, timestamp, metrics, knobs, alerts, metadata, metric_count, knob_count } = data;
    const key = extension ? `${station_id}_${extension}` : station_id;

    // Update station database
    if (!metricsDatabase.stations[key]) {
      metricsDatabase.stations[key] = {
        station_id,
        extension,
        first_seen: timestamp,
        last_seen: timestamp,
        metrics: {},
        knobs: {},
        alerts: [],
        metadata: {}
      };
    }

    const stationData = metricsDatabase.stations[key];
    stationData.last_seen = timestamp;
    stationData.metrics = metrics || {};
    stationData.knobs = knobs || {};
    stationData.alerts = alerts || [];
    stationData.metadata = metadata || {};
    stationData.call_id = call_id;
    stationData.metric_count = metric_count;
    stationData.knob_count = knob_count;

    // Add to history
    const historyRecord = {
      timestamp,
      station_id,
      extension,
      call_id,
      metrics,
      knobs,
      alerts,
      metadata,
      metric_count,
      knob_count
    };

    metricsDatabase.history.push(historyRecord);

    // Trim history if too large
    if (metricsDatabase.history.length > metricsDatabase.maxHistorySize) {
      metricsDatabase.history.shift();
    }

    console.log(`[Monitoring Server] 📊 Received unified-metrics from ${key}:`);
    console.log(`  - Call ID: ${call_id}`);
    console.log(`  - Metrics: ${metric_count || Object.keys(metrics || {}).length}`);
    console.log(`  - Knobs: ${knob_count || Object.keys(knobs || {}).length}`);
    console.log(`  - Alerts: ${(alerts || []).length}`);
    console.log(`  - State: ${metadata?.state || 'unknown'}`);

    // Also re-emit unified-metrics for database bridge
    io.sockets.emit("unified-metrics", data);
    console.log(`  - ✅ Re-emitted to ALL ${io.engine.clientsCount} connected clients`);
    // Broadcast to dashboard clients
    io.sockets.emit('metrics-update', {
      station_id,
      extension,
      key,
      data: historyRecord
    });

    // Check for critical alerts and broadcast
    if (alerts && alerts.length > 0) {
      const criticalAlerts = alerts.filter(a => a.level === 'critical');
      if (criticalAlerts.length > 0) {
        io.emit('critical-alert', {
          station_id,
          extension,
          alerts: criticalAlerts,
          timestamp
        });
        console.log(`[Monitoring Server] 🚨 CRITICAL ALERT from ${key}: ${criticalAlerts.length} critical issues`);
      }
    }
  });

  // Handle legacy 'metrics' events (for backward compatibility)
  socket.on('metrics', (data) => {
    console.log(`[Monitoring Server] ⚠️ Received legacy 'metrics' event from ${data.station_id || 'unknown'}`);
    console.log(`  - Consider upgrading to StationAgent-Unified for full 75 metrics + 113 knobs`);

    // Convert to unified format
    const unifiedData = {
      station_id: data.station_id,
      extension: data.extension || data.channel,
      call_id: data.call_id,
      timestamp: data.timestamp || new Date().toISOString(),
      metrics: data.metrics || {},
      knobs: data.knobs_effective || [],
      alerts: data.alerts || [],
      metadata: {
        state: 'active',
        legacy_format: true
      },
      metric_count: Object.keys(data.metrics || {}).length,
      knob_count: (data.knobs_effective || []).length
    };

    // Process as unified metrics
    console.log('[Monitoring Server] EMITTING unified-metrics to all clients'); io.sockets.emit('unified-metrics', unifiedData);
  });

  // Handle knob update requests from dashboard
  socket.on('apply-knobs', (data) => {
    const { station_id, knobs } = data;
    console.log(`[Monitoring Server] 🎯 Broadcasting knob updates to ${station_id}:`, knobs.length, 'knobs');

    // Broadcast to all matching stations
    io.emit('apply-knobs', data);
  });

  // Handle knob catalog requests
  socket.on('request-knob-catalog', (data) => {
    console.log(`[Monitoring Server] 📚 Knob catalog requested`);
    io.emit('request-knob-catalog', data);
  });

  // Handle knobs-applied acknowledgments
  socket.on('knobs-applied', (data) => {
    const { station_id, applied, failed, timestamp } = data;
    console.log(`[Monitoring Server] ✅ Knobs applied on ${station_id}:`);
    console.log(`  - Applied: ${applied.length}`);
    console.log(`  - Failed: ${failed.length}`);

    // Broadcast to dashboard
    io.emit('knobs-applied', data);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('[Monitoring Server] ❌ Client disconnected:', socket.id);

    // Remove from registered stations
    for (const key in registeredStations) {
      if (registeredStations[key].socket_id === socket.id) {
        console.log(`[Monitoring Server] Station ${key} unregistered`);
        delete registeredStations[key];
      }
    }
  });
});

// ========================================================================
// HTTP API FOR DATABASE ACCESS (Port 8080)
// ========================================================================

const apiApp = express();
apiApp.use(express.json());

// CORS middleware
apiApp.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Get all stations
apiApp.get('/api/stations', (req, res) => {
  res.json({
    stations: Object.values(metricsDatabase.stations),
    registered: Object.values(registeredStations),
    count: Object.keys(metricsDatabase.stations).length
  });
});

// Get specific station
apiApp.get('/api/stations/:stationId', (req, res) => {
  const { stationId } = req.params;
  const station = metricsDatabase.stations[stationId];

  if (!station) {
    return res.status(404).json({ error: 'Station not found' });
  }

  res.json(station);
});

// Get all database records (for dashboard)
apiApp.get('/api/database-records', (req, res) => {
  const { limit = 100, offset = 0 } = req.query;

  const records = metricsDatabase.history
    .slice(-limit)
    .reverse();

  res.json({
    total: metricsDatabase.history.length,
    limit: parseInt(limit),
    offset: parseInt(offset),
    records
  });
});

// Get history for specific station
apiApp.get('/api/history/:stationId', (req, res) => {
  const { stationId } = req.params;
  const { limit = 100 } = req.query;

  const history = metricsDatabase.history
    .filter(record => {
      const key = record.extension ? `${record.station_id}_${record.extension}` : record.station_id;
      return key === stationId;
    })
    .slice(-limit)
    .reverse();

  res.json({
    station_id: stationId,
    count: history.length,
    records: history
  });
});

// Get all alerts
apiApp.get('/api/alerts', (req, res) => {
  const { level } = req.query;

  const allAlerts = metricsDatabase.history
    .filter(record => record.alerts && record.alerts.length > 0)
    .flatMap(record =>
      record.alerts.map(alert => ({
        ...alert,
        station_id: record.station_id,
        extension: record.extension,
        call_id: record.call_id,
        timestamp: record.timestamp
      }))
    );

  const filteredAlerts = level
    ? allAlerts.filter(a => a.level === level)
    : allAlerts;

  res.json({
    total: filteredAlerts.length,
    alerts: filteredAlerts.slice(-100).reverse()
  });
});

// Get dashboard statistics
apiApp.get('/api/stats', (req, res) => {
  const totalMetrics = Object.values(metricsDatabase.stations)
    .reduce((sum, station) => sum + Object.keys(station.metrics).length, 0);

  const totalKnobs = Object.values(metricsDatabase.stations)
    .reduce((sum, station) => sum + Object.keys(station.knobs).length, 0);

  const totalAlerts = metricsDatabase.history
    .reduce((sum, record) => sum + (record.alerts?.length || 0), 0);

  res.json({
    stations: {
      total: Object.keys(metricsDatabase.stations).length,
      registered: Object.keys(registeredStations).length,
      active: Object.values(metricsDatabase.stations)
        .filter(s => Date.now() - new Date(s.last_seen).getTime() < 10000).length
    },
    metrics: {
      total: totalMetrics,
      per_station: totalMetrics / Math.max(1, Object.keys(metricsDatabase.stations).length)
    },
    knobs: {
      total: totalKnobs,
      per_station: totalKnobs / Math.max(1, Object.keys(metricsDatabase.stations).length)
    },
    alerts: {
      total: totalAlerts
    },
    history: {
      records: metricsDatabase.history.length,
      max: metricsDatabase.maxHistorySize
    }
  });
});

// Serve database-records.html
apiApp.get('/database-records.html', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monitoring Database Records</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      margin: 0;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0 0 10px 0;
      color: white;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: #1a1a1a;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .stat-card h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #888;
      text-transform: uppercase;
    }
    .stat-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
    }
    .station-list {
      display: grid;
      gap: 15px;
    }
    .station-card {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 20px;
      transition: all 0.3s;
    }
    .station-card:hover {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    .station-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .station-name {
      font-size: 18px;
      font-weight: bold;
      color: #667eea;
    }
    .station-status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }
    .status-active {
      background: #10b981;
      color: white;
    }
    .status-inactive {
      background: #6b7280;
      color: white;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 10px;
      margin-top: 10px;
    }
    .metric-item {
      background: #0a0a0a;
      padding: 10px;
      border-radius: 4px;
      font-size: 12px;
    }
    .metric-label {
      color: #888;
      margin-bottom: 4px;
    }
    .metric-value {
      color: #e0e0e0;
      font-weight: bold;
    }
    .alert-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
      margin-left: 10px;
    }
    .alert-warning {
      background: #f59e0b;
      color: black;
    }
    .alert-critical {
      background: #ef4444;
      color: white;
    }
    .refresh-info {
      text-align: center;
      color: #888;
      margin-top: 20px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Unified Monitoring Database</h1>
    <div id="connection-status">Connecting...</div>
  </div>

  <div class="stats-grid" id="stats">
    <div class="stat-card">
      <h3>Total Stations</h3>
      <div class="value" id="stat-stations">-</div>
    </div>
    <div class="stat-card">
      <h3>Total Metrics</h3>
      <div class="value" id="stat-metrics">-</div>
    </div>
    <div class="stat-card">
      <h3>Total Knobs</h3>
      <div class="value" id="stat-knobs">-</div>
    </div>
    <div class="stat-card">
      <h3>History Records</h3>
      <div class="value" id="stat-history">-</div>
    </div>
  </div>

  <div class="station-list" id="stations"></div>

  <div class="refresh-info">
    Last updated: <span id="last-update">Never</span> • Auto-refresh every 2 seconds
  </div>

  <script>
    const API_BASE = 'http://localhost:8080/api';

    async function fetchStats() {
      try {
        const response = await fetch(\`\${API_BASE}/stats\`);
        const data = await response.json();

        document.getElementById('stat-stations').textContent = data.stations.total;
        document.getElementById('stat-metrics').textContent = data.metrics.total;
        document.getElementById('stat-knobs').textContent = data.knobs.total;
        document.getElementById('stat-history').textContent = data.history.records;
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    }

    async function fetchStations() {
      try {
        const response = await fetch(\`\${API_BASE}/stations\`);
        const data = await response.json();

        const container = document.getElementById('stations');
        container.innerHTML = '';

        data.stations.forEach(station => {
          const isActive = (Date.now() - new Date(station.last_seen).getTime()) < 10000;

          const card = document.createElement('div');
          card.className = 'station-card';

          const header = \`
            <div class="station-header">
              <div>
                <div class="station-name">\${station.station_id}\${station.extension ? ' - ' + station.extension : ''}</div>
                <div style="color: #888; font-size: 12px; margin-top: 4px;">
                  Last seen: \${new Date(station.last_seen).toLocaleTimeString()}
                </div>
              </div>
              <div>
                <span class="station-status status-\${isActive ? 'active' : 'inactive'}">
                  \${isActive ? 'ACTIVE' : 'IDLE'}
                </span>
                \${station.alerts?.filter(a => a.level === 'warning').length > 0 ?
                  '<span class="alert-badge alert-warning">⚠ WARNINGS</span>' : ''}
                \${station.alerts?.filter(a => a.level === 'critical').length > 0 ?
                  '<span class="alert-badge alert-critical">🚨 CRITICAL</span>' : ''}
              </div>
            </div>
          \`;

          const info = \`
            <div style="display: flex; gap: 20px; margin-bottom: 10px; font-size: 13px;">
              <div><strong>Metrics:</strong> \${Object.keys(station.metrics || {}).length}</div>
              <div><strong>Knobs:</strong> \${Object.keys(station.knobs || {}).length}</div>
              <div><strong>Alerts:</strong> \${(station.alerts || []).length}</div>
              <div><strong>State:</strong> \${station.metadata?.state || 'unknown'}</div>
            </div>
          \`;

          card.innerHTML = header + info;
          container.appendChild(card);
        });

        document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
      } catch (error) {
        console.error('Error fetching stations:', error);
        document.getElementById('stations').innerHTML = '<div style="color: #ef4444; text-align: center; padding: 40px;">Failed to load stations</div>';
      }
    }

    async function refresh() {
      await Promise.all([fetchStats(), fetchStations()]);
    }

    // Initial load
    refresh();

    // Auto-refresh every 2 seconds
    setInterval(refresh, 2000);
  </script>
</body>
</html>
  `);
});

// Start database API server on port 8080
const apiServer = apiApp.listen(DATABASE_API_PORT, () => {
  console.log(`[Database API] 🌐 Listening on http://localhost:${DATABASE_API_PORT}`);
  console.log(`[Database API] 📊 Dashboard: http://localhost:${DATABASE_API_PORT}/database-records.html`);
});

// ========================================================================
// START MONITORING SERVER (Port 3001)
// ========================================================================

server.listen(MONITORING_PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀 UNIFIED MONITORING SERVER STARTED                        ║
║                                                               ║
║   Socket.IO Port:  ${MONITORING_PORT}                                    ║
║   Database API:    http://localhost:${DATABASE_API_PORT}                    ║
║   Dashboard:       http://localhost:${DATABASE_API_PORT}/database-records.html  ║
║                                                               ║
║   📡 Receiving: unified-metrics events                        ║
║   💾 Storing: ALL 75 metrics + 113 knobs per station         ║
║   🎯 Managing: Station registration & knob control           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
  console.log('[Monitoring Server] Waiting for stations to register...\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Monitoring Server] Shutting down gracefully...');

  // Save database to file
  const backupPath = path.join(__dirname, 'monitoring-database-backup.json');
  fs.writeFileSync(backupPath, JSON.stringify(metricsDatabase, null, 2));
  console.log(`[Monitoring Server] 💾 Database saved to ${backupPath}`);

  server.close(() => {
    apiServer.close(() => {
      console.log('[Monitoring Server] ✅ Shutdown complete');
      process.exit(0);
    });
  });
});
