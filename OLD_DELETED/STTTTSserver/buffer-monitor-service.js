/**
 * Buffer Monitor Service
 * Real-time monitoring of audio buffer stations
 * Tracks metrics, detects issues, triggers alerts
 */

const EventEmitter = require('events');

class BufferMonitorService extends EventEmitter {
  constructor(configLoader) {
    super();
    this.configLoader = configLoader;
    this.stats = new Map();
    this.alerts = new Map();
    this.monitoringInterval = null;
    this.isRunning = false;
  }

  /**
   * Start monitoring all enabled buffer stations
   */
  start() {
    if (this.isRunning) {
      console.warn('[BufferMonitor] Already running');
      return;
    }

    const globalSettings = this.configLoader.getGlobalSettings();
    const enabledStations = this.configLoader.getEnabledStations();

    console.log(`[BufferMonitor] Starting monitoring for ${Object.keys(enabledStations).length} stations`);

    // Initialize stats for each station
    for (const [id, station] of Object.entries(enabledStations)) {
      if (station.monitoring_enabled) {
        this.stats.set(id, {
          stationId: id,
          name: station.name,
          currentBytes: 0,
          maxBytes: station.socket_receive_buffer_bytes || station.socket_send_buffer_bytes || station.buffer_max_bytes || 262144,
          fillPercent: 0,
          packetsReceived: 0,
          packetsDropped: 0,
          bytesDropped: 0,
          bytesReceived: 0,
          bytesSent: 0,
          latencyMs: 0,
          jitterMs: 0,
          lastUpdate: Date.now()
        });
        console.log(`[BufferMonitor] Initialized station: ${id} - ${station.name}`);
      }
    }

    // Start periodic monitoring
    const interval = globalSettings.monitoring_interval_ms || 1000;
    this.monitoringInterval = setInterval(() => {
      this.checkAllStations();
    }, interval);

    this.isRunning = true;
    console.log(`[BufferMonitor] ✓ Started (interval: ${interval}ms)`);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isRunning = false;
    console.log('[BufferMonitor] Stopped');
  }

  /**
   * Check all monitored stations
   */
  checkAllStations() {
    const enabledStations = this.configLoader.getEnabledStations();

    for (const [id, station] of Object.entries(enabledStations)) {
      if (station.monitoring_enabled) {
        this.checkStation(id, station);
      }
    }
  }

  /**
   * Check a specific station and trigger alerts if needed
   */
  checkStation(stationId, station) {
    const stats = this.stats.get(stationId);
    if (!stats) return;

    const fillPercent = stats.maxBytes > 0 ? (stats.currentBytes / stats.maxBytes) * 100 : 0;
    stats.fillPercent = fillPercent;
    stats.lastUpdate = Date.now();

    // Check thresholds
    if (fillPercent >= station.critical_threshold_percent) {
      this.alert('CRITICAL', stationId, `Buffer at ${fillPercent.toFixed(1)}% (critical threshold: ${station.critical_threshold_percent}%)`, stats);
    } else if (fillPercent >= station.warning_threshold_percent) {
      this.alert('WARNING', stationId, `Buffer at ${fillPercent.toFixed(1)}% (warning threshold: ${station.warning_threshold_percent}%)`, stats);
    }

    // Log based on station log level
    if (station.log_level === 'debug' || (station.log_level === 'info' && fillPercent > 50)) {
      console.log(`[BufferMonitor:${stationId}] ${stats.name}: ${fillPercent.toFixed(1)}% full (${stats.currentBytes}/${stats.maxBytes} bytes)`);
    }
  }

  /**
   * Trigger an alert
   */
  alert(level, stationId, message, stats) {
    const globalSettings = this.configLoader.getGlobalSettings();
    const cooldown = globalSettings.alert_cooldown_ms || 5000;
    
    const alertKey = `${stationId}:${level}`;
    const lastAlert = this.alerts.get(alertKey);
    
    // Check cooldown
    if (lastAlert && (Date.now() - lastAlert) < cooldown) {
      return; // Still in cooldown period
    }

    this.alerts.set(alertKey, Date.now());

    const alertData = {
      level,
      stationId,
      message,
      stats: { ...stats },
      timestamp: new Date().toISOString()
    };

    console.error(`[BufferMonitor] [${level}] ${stationId}: ${message}`);
    
    // Emit event for external listeners
    this.emit('alert', alertData);
  }

  /**
   * Update station stats (called by STTTTSserver)
   */
  updateStats(stationId, updates) {
    const stats = this.stats.get(stationId);
    if (!stats) {
      // Station not initialized yet, create it
      this.stats.set(stationId, {
        stationId,
        name: stationId,
        currentBytes: 0,
        maxBytes: 262144,
        fillPercent: 0,
        packetsReceived: 0,
        packetsDropped: 0,
        bytesDropped: 0,
        bytesReceived: 0,
        bytesSent: 0,
        latencyMs: 0,
        jitterMs: 0,
        lastUpdate: Date.now(),
        ...updates
      });
      return;
    }

    Object.assign(stats, updates);
    stats.lastUpdate = Date.now();

    // Recalculate fill percentage
    if (stats.maxBytes > 0) {
      stats.fillPercent = (stats.currentBytes / stats.maxBytes) * 100;
    }
  }

  /**
   * Get stats for a specific station
   */
  getStationStats(stationId) {
    return this.stats.get(stationId);
  }

  /**
   * Get all stats
   */
  getAllStats() {
    const result = {};
    for (const [id, stats] of this.stats.entries()) {
      result[id] = { ...stats };
    }
    return result;
  }

  /**
   * Get stats as JSON for API
   */
  getStatsJSON() {
    return {
      timestamp: new Date().toISOString(),
      monitoring: this.isRunning,
      stations: this.getAllStats()
    };
  }

  /**
   * Reset stats for a station
   */
  resetStats(stationId) {
    const stats = this.stats.get(stationId);
    if (stats) {
      stats.packetsReceived = 0;
      stats.packetsDropped = 0;
      stats.bytesDropped = 0;
      stats.bytesReceived = 0;
      stats.bytesSent = 0;
      console.log(`[BufferMonitor] Reset stats for ${stationId}`);
    }
  }

  /**
   * Reset all stats
   */
  resetAllStats() {
    for (const [id] of this.stats.entries()) {
      this.resetStats(id);
    }
    console.log('[BufferMonitor] Reset all stats');
  }
}

module.exports = BufferMonitorService;
