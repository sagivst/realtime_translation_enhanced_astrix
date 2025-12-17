/**
 * Station-3 Socket.IO Bridge
 *
 * Connects StationAgent (port 3001) to Monitoring API (port 8080)
 * WITHOUT modifying STTTTSserver.js or any operational code
 *
 * Architecture:
 * STTTTSserver → StationAgent → Socket.IO (3001) → THIS BRIDGE → API (8080)
 */

const http = require('http');
const socketIO = require('socket.io');

// Configuration
const SOCKETIO_PORT = 3001;  // Listen for StationAgent
const API_URL = 'http://localhost:8080';  // Forward to monitoring API

// Create Socket.IO server on port 3001
const server = http.createServer();
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store latest metrics from Station-3
const station3Metrics = {
  '3333': null,
  '4444': null
};

console.log('[Station-3 Bridge] Starting...');
console.log(`  Listening on port ${SOCKETIO_PORT} for StationAgent emissions`);
console.log(`  Forwarding to API at ${API_URL}/api/snapshots`);

// Listen for StationAgent connections
io.on('connection', (socket) => {
  console.log(`[Bridge] StationAgent connected: ${socket.id}`);

  // Handle 'metrics' events from StationAgent.js (line 173)
  socket.on('metrics', (data) => {
    console.log(`[Bridge] Received metrics from ${data.station_id}-${data.extension}`);

    // Store metrics
    if (data.station_id === 'STATION_3') {
      station3Metrics[data.extension] = {
        station_id: data.station_id,
        extension: data.extension,
        timestamp: data.timestamp || new Date().toISOString(),
        status: 'active',
        metrics: data.metrics || {},
        alerts: data.alerts || [],
        knobs: {} // Will be populated if available
      };

      console.log(`[Bridge] Stored Station-3/${data.extension} - ${Object.keys(data.metrics || {}).length} metrics`);
    }
  });

  // Handle 'unified-metrics' events from StationAgent-Unified.js (line 92)
  socket.on('unified-metrics', (data) => {
    console.log(`[Bridge] Received unified-metrics from ${data.station_id}-${data.extension}`);

    // Store metrics with knobs
    if (data.station_id === 'STATION_3') {
      station3Metrics[data.extension] = {
        station_id: data.station_id,
        extension: data.extension,
        timestamp: data.timestamp || new Date().toISOString(),
        status: 'active',
        metrics: data.metrics || {},
        knobs: data.knobs || {},
        alerts: data.alerts || [],
        metric_count: data.metric_count || 0,
        knob_count: data.knob_count || 0
      };

      console.log(`[Bridge] Stored Station-3/${data.extension} - ${data.metric_count} metrics, ${data.knob_count} knobs`);
    }
  });

  // Handle 'register-station' events (if StationAgent registers)
  socket.on('register-station', (data) => {
    console.log(`[Bridge] Station registered: ${data.station_id}`, data.capabilities);
  });

  socket.on('disconnect', () => {
    console.log(`[Bridge] StationAgent disconnected: ${socket.id}`);
  });
});

// Create HTTP endpoint for monitoring API to query
const apiServer = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/api/station3/snapshots' && req.method === 'GET') {
    // Return Station-3 metrics in monitoring API format
    const response = {
      "Station-3": {}
    };

    // Add extension 3333 if available
    if (station3Metrics['3333']) {
      response["Station-3"]["extension_3333"] = station3Metrics['3333'];
    }

    // Add extension 4444 if available
    if (station3Metrics['4444']) {
      response["Station-3"]["extension_4444"] = station3Metrics['4444'];
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response, null, 2));
    console.log(`[Bridge] Served Station-3 snapshots to monitoring API`);
  }
  else if (req.url === '/health' && req.method === 'GET') {
    // Health check endpoint
    const health = {
      status: 'ok',
      socketio_port: SOCKETIO_PORT,
      api_url: API_URL,
      station3_3333: station3Metrics['3333'] ? 'available' : 'no data',
      station3_4444: station3Metrics['4444'] ? 'available' : 'no data',
      timestamp: new Date().toISOString()
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health, null, 2));
  }
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start Socket.IO server on port 3001
server.listen(SOCKETIO_PORT, () => {
  console.log(`[Bridge] Socket.IO server listening on port ${SOCKETIO_PORT}`);
  console.log(`[Bridge] Ready to receive StationAgent emissions`);
});

// Start HTTP API server on port 3002 (for monitoring API to query)
const API_QUERY_PORT = 3002;
apiServer.listen(API_QUERY_PORT, () => {
  console.log(`[Bridge] HTTP API listening on port ${API_QUERY_PORT}`);
  console.log(`[Bridge] Endpoint: http://localhost:${API_QUERY_PORT}/api/station3/snapshots`);
  console.log(`[Bridge] Health check: http://localhost:${API_QUERY_PORT}/health`);
});

// Handle errors
process.on('uncaughtException', (err) => {
  console.error('[Bridge] Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('[Bridge] Unhandled rejection:', err);
});

console.log('[Bridge] Station-3 Socket.IO Bridge initialized successfully');
console.log('[Bridge] Waiting for StationAgent to connect from STTTTSserver...');
