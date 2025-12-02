/**
 * Fixed Monitoring to Database Bridge
 * Connects to monitoring server, receives metrics, and stores in database
 * FIXED: Uses ::1 (IPv6 loopback) instead of 127.0.0.1 (IPv4) for database connection
 */

const io = require('socket.io-client');
const axios = require('axios');

// Configuration - FIX: Use IPv6 loopback for database connection
const MONITORING_URL = 'http://localhost:3001';
const DATABASE_URL = 'http://[::1]:8083';  // IPv6 format for localhost

class MonitoringToDatabaseBridge {
  constructor() {
    this.socket = null;
    this.recordCount = 0;
    this.errorCount = 0;
    this.lastError = null;
  }

  start() {
    console.log('🌉 Monitoring to Database Bridge Starting...');
    console.log(`📡 Monitoring Server: ${MONITORING_URL}`);
    console.log(`💾 Database Server: ${DATABASE_URL} (IPv6)`);

    this.connectToMonitoring();
  }

  connectToMonitoring() {
    this.socket = io(MONITORING_URL);

    this.socket.on('connect', () => {
      console.log('✅ Connected to monitoring server');
      console.log('📊 Waiting for unified-metrics events...');
    });

    this.socket.on('unified-metrics', async (data) => {
      console.log(`📦 Received metrics from ${data.station_id}-${data.extension}`);
      console.log(`   Metrics: ${data.metric_count}, Knobs: ${data.knob_count}`);

      await this.saveToDatabase(data);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from monitoring server');
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error.message);
    });
  }

  async saveToDatabase(data) {
    try {
      // Transform data to match database schema
      const record = {
        station_id: data.station_id,
        extension: data.extension,
        timestamp: data.timestamp || new Date().toISOString(),
        metric_count: data.metric_count || Object.keys(data.metrics || {}).length,
        knob_count: data.knob_count || Object.keys(data.knobs || {}).length,
        metrics: data.metrics || {},
        knobs: data.knobs || {}
      };

      // Send to database
      const response = await axios.post(`${DATABASE_URL}/api/metrics`, record, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200 || response.status === 201) {
        this.recordCount++;
        console.log(`✅ Saved record #${this.recordCount} to database`);

        // Log sample data every 10 records
        if (this.recordCount % 10 === 0) {
          console.log(`📊 Progress: ${this.recordCount} records saved, ${this.errorCount} errors`);
        }
      }
    } catch (error) {
      this.errorCount++;
      this.lastError = error.message;

      if (error.code === 'ECONNREFUSED') {
        console.error(`❌ Database connection refused at ${DATABASE_URL}`);
        console.error('   Make sure database server is running on port 8083');
      } else if (error.code === 'EADDRNOTAVAIL') {
        console.error(`❌ Address not available: ${DATABASE_URL}`);
        console.error('   Database may be listening on different interface');
      } else {
        console.error(`❌ Database error: ${error.message}`);
      }
    }
  }

  getStatus() {
    return {
      connected: this.socket?.connected || false,
      recordsSaved: this.recordCount,
      errors: this.errorCount,
      lastError: this.lastError
    };
  }
}

// Start the bridge
const bridge = new MonitoringToDatabaseBridge();
bridge.start();

// Status reporting
setInterval(() => {
  const status = bridge.getStatus();
  console.log('📊 Bridge Status:', status);
}, 30000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down bridge...');
  if (bridge.socket) {
    bridge.socket.disconnect();
  }
  process.exit(0);
});

console.log('🌉 Bridge is running - Press Ctrl+C to stop');