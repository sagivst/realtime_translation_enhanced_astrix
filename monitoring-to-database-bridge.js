
// Monitoring to Database Bridge - Forwards station monitoring data with knobs to database
const io = require('socket.io-client');
const axios = require('axios');

console.log('[Bridge] Starting monitoring-to-database-bridge...');

// Connect to monitoring server
const monitoringSocket = io('http://localhost:3001', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity
});

// Track connection state
let isConnected = false;
let stationDataCount = 0;
let lastStationData = null;

monitoringSocket.on('connect', () => {
  console.log('[Bridge] Connected to monitoring server');
  isConnected = true;

  // Subscribe to station data events
  console.log('[Bridge] Subscribing to unified-metrics events...');
});

monitoringSocket.on('disconnect', () => {
  console.log('[Bridge] Disconnected from monitoring server');
  isConnected = false;
});

// Handle generic unified-metrics events (emitted by StationAgent)
monitoringSocket.on('unified-metrics', async (data) => {
  try {
    stationDataCount++;
    lastStationData = data;

    console.log(`[Bridge] Received unified-metrics from ${data.station_id}-${data.extension} with ${Object.keys(data.knobs || {}).length} knobs`);

    // Forward to database-api-server's /api/database/store endpoint
    const response = await axios.post('http://localhost:8083/api/monitoring-data', data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });

    if (response.data.success) {
      console.log(`[Bridge] Successfully forwarded station data to database`);
    }
  } catch (error) {
    console.error('[Bridge] Failed to forward station data:', error.message);
  }
});

// Also listen for STATION_3 and STATION_9 specific events
['STATION_3', 'STATION_9'].forEach(stationId => {
  monitoringSocket.on(stationId, async (data) => {
    try {
      // Ensure the data has the expected structure
      if (!data.station_id) data.station_id = stationId;

      stationDataCount++;
      lastStationData = data;

      console.log(`[Bridge] Received ${stationId} data with ${Object.keys(data.knobs || {}).length} knobs`);

      // Forward to database
      const response = await axios.post('http://localhost:8083/api/monitoring-data', data, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      if (response.data.success) {
        console.log(`[Bridge] Successfully forwarded ${stationId} data to database`);
      }
    } catch (error) {
      console.error(`[Bridge] Failed to forward ${stationId} data:`, error.message);
    }
  });
});

// Also handle specific station extension events (backward compatibility)
['3333', '4444'].forEach(extension => {
  monitoringSocket.on(`station-${extension}`, async (data) => {
    try {
      // Add extension if not present
      if (!data.extension) data.extension = parseInt(extension);
      if (!data.station_id) data.station_id = extension === '3333' ? 'STATION_3' : 'STATION_9';

      stationDataCount++;
      lastStationData = data;

      console.log(`[Bridge] Received station-${extension} data with ${Object.keys(data.knobs || {}).length} knobs`);

      // Forward to database
      const response = await axios.post('http://localhost:8083/api/monitoring-data', data, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      if (response.data.success) {
        console.log(`[Bridge] Successfully forwarded station-${extension} data to database`);
      }
    } catch (error) {
      console.error(`[Bridge] Failed to forward station-${extension} data:`, error.message);
    }
  });
});

// Status reporting
setInterval(() => {
  console.log(`[Bridge] Status - Connected: ${isConnected}, Station data received: ${stationDataCount}`);
  if (lastStationData) {
    console.log(`[Bridge] Last station data: ${lastStationData.station_id}-${lastStationData.extension} at ${lastStationData.timestamp}`);
  }
}, 30000); // Every 30 seconds

// Handle errors
monitoringSocket.on('error', (error) => {
  console.error('[Bridge] Socket error:', error);
});

process.on('SIGTERM', () => {
  console.log('[Bridge] Received SIGTERM, shutting down gracefully...');
  monitoringSocket.disconnect();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Bridge] Received SIGINT, shutting down gracefully...');
  monitoringSocket.disconnect();
  process.exit(0);
});

console.log('[Bridge] Monitoring-to-database-bridge initialized');
console.log('[Bridge] Listening for unified-metrics events from monitoring server...');
