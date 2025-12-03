/**
 * StationAgent-Unified.js
 *
 * Self-contained monitoring agent that automatically emits ALL 75 metrics and 113 knobs
 * NO FILTERING - Dashboard manages what's relevant
 * Automatically starts monitoring when instantiated
 */

const UnifiedStationCollector = require('./UnifiedStationCollector');

// Socket.IO client for monitoring server integration
let ioClient = null;
let monitoringClient = null;

// Lazy load socket.io-client
function getMonitoringClient() {
  if (!monitoringClient) {
    try {
      ioClient = require('socket.io-client');
      monitoringClient = ioClient('http://localhost:3001', {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      monitoringClient.on('connect', () => {
        console.log('[StationAgent-Unified] Connected to monitoring server on port 3001');
      });

      monitoringClient.on('disconnect', () => {
        console.log('[StationAgent-Unified] Disconnected from monitoring server');
      });

      monitoringClient.on('error', (error) => {
        console.log('[StationAgent-Unified] Monitoring connection error:', error.message);
      });
    } catch (e) {
      console.log('[StationAgent-Unified] Socket.IO client not available, monitoring disabled');
    }
  }
  return monitoringClient;
}

class StationAgentUnified {
  constructor(stationId, extension) {
    this.stationId = stationId;
    this.extension = extension;

    // Use the UnifiedStationCollector that collects EVERYTHING
    this.collector = new UnifiedStationCollector(stationId, extension);

    console.log(`[StationAgent-Unified] Station ${stationId}-${extension} initialized`);
    console.log(`  - 75 metrics ready for collection`);
    console.log(`  - 113 knobs ready for control`);
    console.log(`  - Auto-emit enabled (every 1 second)`);

    // Start automatic monitoring immediately
    this.startAutoMonitoring();
  }

  startAutoMonitoring() {
    // Emit data every 1 second
    this.monitoringInterval = setInterval(() => {
      this.emitMetrics();
    }, 1000);

    // Emit initial data immediately
    setTimeout(() => this.emitMetrics(), 100);
  }

  async emitMetrics() {
    const client = getMonitoringClient();
    if (client && client.connected) {
      // Collect all metrics and knobs using the correct method
      const collectedData = await this.collector.collectAll({
        station_id: this.stationId,
        extension: this.extension
      });

      const data = {
        station_id: this.stationId,
        extension: this.extension,
        timestamp: new Date().toISOString(),
        metric_count: 75,
        knob_count: 113,
        metrics: collectedData.metrics || {},
        knobs: collectedData.knobs || this.collector.knobFamilies,
        alerts: []
      };

      // Emit the unified-metrics event
      client.emit('unified-metrics', data);

      // Log periodically (every 10th emission)
      if (!this.emitCount) this.emitCount = 0;
      this.emitCount++;
      if (this.emitCount % 10 === 0) {
        console.log(`[${this.stationId}-${this.extension}] Emitted batch #${this.emitCount}: 75 metrics, 113 knobs`);
      }
    }
  }

  // Legacy update method for compatibility
  update() {
    this.emitMetrics();
  }

  // Method to record events (for call tracking)
  recordEvent(eventType, data) {
    if (this.collector && this.collector.recordEvent) {
      this.collector.recordEvent(eventType, data);
    }
  }

  // Clean up on destruction
  destroy() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log(`[StationAgent-Unified] Station ${this.stationId}-${this.extension} stopped`);
  }
}

module.exports = StationAgentUnified;