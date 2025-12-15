/**
 * Station-3 API Bridge
 *
 * Connects to monitoring-server.js on port 3001 via Socket.IO
 * Exposes Station-3 data via HTTP API on port 3009
 * Port 3090 can then query this endpoint
 */

const io = require('socket.io-client');
const express = require('express');
const http = require('http');

// Configuration
const MONITORING_SERVER_URL = 'http://localhost:3001';
const HTTP_API_PORT = 3009;

// Store latest Station-3 data
const station3Data = {
  'STATION_3_3333': null,
  'STATION_3_4444': null
};

// Connect to monitoring server as Socket.IO client
console.log('[Station-3 Bridge] Connecting to monitoring server at', MONITORING_SERVER_URL);
const socket = io(MONITORING_SERVER_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity
});

socket.on('connect', () => {
  console.log('[Station-3 Bridge] ✅ Connected to monitoring server');
});

socket.on('disconnect', () => {
  console.log('[Station-3 Bridge] ⚠️ Disconnected from monitoring server');
});

socket.on('error', (error) => {
  console.error('[Station-3 Bridge] ❌ Connection error:', error.message);
});

// Listen for unified-metrics events
socket.on('unified-metrics', (data) => {
  if (data.station_id === 'STATION_3' && data.extension) {
    const key = `STATION_3_${data.extension}`;
    station3Data[key] = {
      station_id: data.station_id,
      extension: data.extension,
      timestamp: data.timestamp || new Date().toISOString(),
      status: 'active',
      metrics: data.metrics || {},
      knobs: data.knobs || {},
      alerts: data.alerts || [],
      metric_count: data.metric_count || Object.keys(data.metrics || {}).length,
      knob_count: data.knob_count || Object.keys(data.knobs || {}).length,
      lastUpdate: new Date().toISOString()
    };

    console.log(`[Station-3 Bridge] 📊 Updated ${key}: ${station3Data[key].metric_count} metrics, ${station3Data[key].knob_count} knobs`);
  }
});

// Also listen for 'metrics' events (from StationAgent.js)
socket.on('metrics', (data) => {
  if (data.station_id === 'STATION_3' && data.extension) {
    const key = `STATION_3_${data.extension}`;
    station3Data[key] = {
      station_id: data.station_id,
      extension: data.extension,
      timestamp: data.timestamp || new Date().toISOString(),
      status: 'active',
      metrics: data.metrics || {},
      knobs: {},
      alerts: data.alerts || [],
      lastUpdate: new Date().toISOString()
    };

    console.log(`[Station-3 Bridge] 📊 Updated ${key} (metrics event): ${Object.keys(data.metrics || {}).length} metrics`);
  }
});

// Create HTTP API
const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// GET /api/station3 - Returns all Station-3 data
app.get('/api/station3', (req, res) => {
  const response = {
    "STATION_3_3333": station3Data['STATION_3_3333'],
    "STATION_3_4444": station3Data['STATION_3_4444']
  };

  res.json(response);
});

// GET /api/station3/snapshots - Returns Station-3 data in monitoring API format
app.get('/api/station3/snapshots', (req, res) => {
  const response = {
    stations: {
      "STATION_3_3333": station3Data['STATION_3_3333'],
      "STATION_3_4444": station3Data['STATION_3_4444']
    }
  };

  res.json(response);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connected: socket.connected,
    monitoring_server: MONITORING_SERVER_URL,
    station3_3333: station3Data['STATION_3_3333'] ? 'available' : 'no data',
    station3_4444: station3Data['STATION_3_4444'] ? 'available' : 'no data',
    timestamp: new Date().toISOString()
  });
});

// Start HTTP server
const server = http.createServer(app);
server.listen(HTTP_API_PORT, () => {
  console.log(`[Station-3 Bridge] 🌐 HTTP API listening on http://localhost:${HTTP_API_PORT}`);
  console.log(`[Station-3 Bridge] 📍 Station-3 endpoint: http://localhost:${HTTP_API_PORT}/api/station3`);
  console.log(`[Station-3 Bridge] 💚 Health check: http://localhost:${HTTP_API_PORT}/health`);
});

// Handle errors
process.on('uncaughtException', (err) => {
  console.error('[Station-3 Bridge] ❌ Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('[Station-3 Bridge] ❌ Unhandled rejection:', err);
});

console.log('[Station-3 Bridge] 🚀 Station-3 API Bridge initialized');
