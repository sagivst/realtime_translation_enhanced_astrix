const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8083;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// In-memory storage for snapshots
let snapshots = [];
let stations = {};

// API endpoint for snapshots
app.get('/api/snapshots', (req, res) => {
  console.log('GET /api/snapshots request received');
  
  // Return last 100 snapshots
  const recentSnapshots = snapshots.slice(-100);
  res.json(recentSnapshots);
});

// API endpoint for stations
app.get('/api/stations', (req, res) => {
  console.log('GET /api/stations request received');
  res.json(stations);
});

// API endpoint to receive monitoring data
app.post('/api/monitoring-data', (req, res) => {
  const data = req.body;
  
  // Add timestamp if not present
  if (!data.timestamp) {
    data.timestamp = new Date().toISOString();
  }
  
  // Store snapshot
  snapshots.push(data);
  
  // Keep only last 1000 snapshots
  if (snapshots.length > 1000) {
    snapshots = snapshots.slice(-1000);
  }
  
  // Update station data if present
  if (data.stationId) {
    stations[data.stationId] = {
      ...stations[data.stationId],
      ...data,
      lastUpdate: data.timestamp
    };
  }
  
  console.log(`Stored monitoring data: ${data.stationId || 'unknown'} at ${data.timestamp}`);
  res.json({ success: true, message: 'Data received' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    snapshotCount: snapshots.length,
    stationCount: Object.keys(stations).length
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Database API server running on port ${PORT}`);
  console.log(`Endpoints available:`);
  console.log(`  GET  /api/snapshots - Get recent monitoring snapshots`);
  console.log(`  GET  /api/stations - Get station data`);
  console.log(`  POST /api/monitoring-data - Submit monitoring data`);
  console.log(`  GET  /api/health - Health check`);
});
