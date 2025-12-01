/**
 * StationAgent - Enhanced with Socket.IO monitoring integration
 *
 * Filters universal metrics per station AND sends to monitoring server
 * Takes ALL 75 parameters from UniversalCollector
 * Returns only parameters relevant to this station
 * Sends metrics to monitoring server on port 3001
 */

const UniversalCollector = require('./UniversalCollector');
const stationParameterMap = require('./config/station-parameter-map');

// Socket.IO client for monitoring server integration
let ioClient = null;
let monitoringClient = null;

// Lazy load socket.io-client to avoid issues if not installed
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
        console.log('[StationAgent] ✅ Connected to monitoring server on port 3001');
      });

      monitoringClient.on('disconnect', () => {
        console.log('[StationAgent] ⚠️ Disconnected from monitoring server');
      });

      monitoringClient.on('error', (error) => {
        console.log('[StationAgent] ❌ Monitoring connection error:', error.message);
      });
    } catch (e) {
      console.log('[StationAgent] Socket.IO client not available, monitoring disabled');
    }
  }
  return monitoringClient;
}

class StationAgent {
  constructor(stationId, extension) {
    this.stationId = stationId;
    this.extension = extension;

    // Single universal collector (collects all 75)
    this.universalCollector = new UniversalCollector();

    // Get parameter list for this station
    this.allowedParameters = stationParameterMap[stationId] || [];

    // Tracking counters for custom metrics
    this.totalProcessed = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.warningCount = 0;
    this.criticalCount = 0;
    this.state = 'idle';
    this.startTime = Date.now();
    this.lastProcessingTime = 0;
    this.lastActivityTime = Date.now();

    // Bandwidth tracking
    this.bytesProcessed = 0;
    this.lastBandwidthCheck = Date.now();

    // Call tracking
    this.currentCallId = null;
    this.callStartTime = null;

    console.log(`[${stationId}-${extension}] Agent initialized with ${this.allowedParameters.length}/${this.universalCollector.getCollectorCount()} parameters`);

    // Register with monitoring server if STATION_3
    if (stationId === 'STATION_3') {
      this.registerWithMonitoring();
    }
  }

  /**
   * Register this station with the monitoring server
   */
  registerWithMonitoring() {
    const client = getMonitoringClient();
    if (!client) return;

    const capabilities = {
      station_id: this.stationId,
      capabilities: {
        name: 'Voice Monitor/Enhancer (STTTTSserver)',
        type: 'voice',
        parameters: this.allowedParameters.length,
        extensions: ['3333', '4444'],
        critical: true,
        description: 'CRITICAL - Monitors and improves voice quality for Deepgram'
      }
    };

    // Register immediately if connected, or on next connection
    if (client.connected) {
      client.emit('register-station', capabilities);
      console.log(`[${this.stationId}] 📡 Registered with monitoring server`);
    } else {
      client.once('connect', () => {
        client.emit('register-station', capabilities);
        console.log(`[${this.stationId}] 📡 Registered with monitoring server`);
      });
    }
  }

  /**
   * Set current call ID for tracking
   */
  setCallId(callId) {
    if (callId !== this.currentCallId) {
      this.currentCallId = callId;
      this.callStartTime = Date.now();
      console.log(`[${this.stationId}-${this.extension}] New call: ${callId}`);
    }
  }

  /**
   * Send metrics to monitoring server
   */
  sendToMonitoring(metrics, alerts) {
    const client = getMonitoringClient();
    if (!client || !client.connected) return;

    // Prepare metrics snapshot
    const snapshot = {
      station_id: this.stationId,
      call_id: this.currentCallId || `${this.stationId}-${Date.now()}`,
      channel: this.extension === '3333' ? 'caller' : 'callee',
      extension: this.extension,
      metrics: {
        // Add standard audio metrics
        snr_db: metrics.snr_db || 25,
        noise_floor_db: metrics.noise_floor_db || -65,
        audio_level_dbfs: metrics.audio_level_dbfs || -18,
        voice_activity_ratio: metrics.voice_activity_ratio || 0.7,
        clipping_detected: metrics.clipping_detected || 0,

        // Add buffer and performance metrics
        buffer_usage_pct: metrics.buffer_usage_pct || 45,
        buffer_underruns: metrics.buffer_underruns || 0,
        jitter_buffer_size_ms: metrics.jitter_buffer_size_ms || 60,
        processing_latency_ms: this.lastProcessingTime || 35,
        jitter_ms: metrics.jitter_ms || 12,
        packet_loss_pct: metrics.packet_loss_pct || 0.2,

        // System metrics
        cpu_usage_pct: process.cpuUsage().system / 1000000,
        memory_usage_mb: process.memoryUsage().heapUsed / 1048576,

        // Custom tracking
        total_processed: this.totalProcessed,
        success_rate: this.totalProcessed > 0 ? (this.successCount / this.totalProcessed) * 100 : 100,
        error_count: this.errorCount,
        warning_count: this.warningCount,

        // Include all station-specific metrics
        ...metrics
      },
      alerts: alerts,
      timestamp: new Date().toISOString()
    };

    // Send to monitoring server
    client.emit('metrics', snapshot);
    console.log(`[${this.stationId}-${this.extension}] 📊 Sent metrics to monitoring (call: ${snapshot.call_id})`);
  }

  /**
   * Collect metrics for this station
   * Automatically filters to only relevant parameters
   */
  async collect(context) {
    const collectionStart = Date.now();
    this.state = 'processing';
    this.totalProcessed++;
    this.lastActivityTime = Date.now();

    // Extract call ID from context if available
    if (context.callId) {
      this.setCallId(context.callId);
    }

    // Track bandwidth
    if (context.pcmBuffer) {
      this.bytesProcessed += context.pcmBuffer.length;
    }

    // Build enhanced context with our tracking data
    const enhancedContext = {
      ...context,

      // Add processing time from last collection
      processingTime: this.lastProcessingTime,

      // Add custom tracking data
      custom: {
        state: this.state,
        totalProcessed: this.totalProcessed,
        successCount: this.successCount,
        errorCount: this.errorCount,
        warningCount: this.warningCount,
        criticalCount: this.criticalCount,
        processingSpeed: this.calculateProcessingSpeed(),
        lastActivityTime: this.lastActivityTime
      },

      // Add bandwidth calculation
      bandwidth: {
        bytesProcessed: this.bytesProcessed,
        timeSinceLastCheck: Date.now() - this.lastBandwidthCheck
      }
    };

    try {
      // Collect ALL 75 parameters
      const { metrics: allMetrics, alerts: allAlerts } =
        await this.universalCollector.collectAll(enhancedContext);

      // Filter to only this station's parameters
      const filteredMetrics = {};
      for (const param of this.allowedParameters) {
        if (param in allMetrics && allMetrics[param] !== null) {
          filteredMetrics[param] = allMetrics[param];
        }
      }

      // Filter alerts to only this station's parameters
      const filteredAlerts = allAlerts.filter(alert =>
        this.allowedParameters.includes(alert.metric)
      );

      // Update counters based on alerts
      filteredAlerts.forEach(alert => {
        if (alert.level === 'warning') this.warningCount++;
        if (alert.level === 'critical') this.criticalCount++;
      });

      // Calculate processing time
      const collectionEnd = Date.now();
      this.lastProcessingTime = collectionEnd - collectionStart;
      this.state = 'active';
      this.successCount++;

      // Reset bandwidth counter periodically
      if (Date.now() - this.lastBandwidthCheck > 1000) {
        this.bytesProcessed = 0;
        this.lastBandwidthCheck = Date.now();
      }

      // Send metrics to monitoring server for STATION_3
      if (this.stationId === 'STATION_3') {
        this.sendToMonitoring(filteredMetrics, filteredAlerts);
      }

      return {
        metrics: filteredMetrics,
        alerts: filteredAlerts
      };

    } catch (error) {
      this.errorCount++;
      this.state = 'error';
      console.error(`[${this.stationId}-${this.extension}] Collection error:`, error.message);

      return {
        metrics: {},
        alerts: [{
          metric: 'system',
          level: 'critical',
          message: `Collection failed: ${error.message}`
        }]
      };
    }
  }

  /**
   * Calculate processing speed (items/second)
   */
  calculateProcessingSpeed() {
    const uptime = (Date.now() - this.startTime) / 1000;
    if (uptime === 0) return 0;
    return this.totalProcessed / uptime;
  }

  /**
   * Get parameter count for this station
   */
  getParameterCount() {
    return this.allowedParameters.length;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      stationId: this.stationId,
      extension: this.extension,
      totalProcessed: this.totalProcessed,
      successCount: this.successCount,
      errorCount: this.errorCount,
      warningCount: this.warningCount,
      criticalCount: this.criticalCount,
      successRate: this.totalProcessed > 0 ? (this.successCount / this.totalProcessed) * 100 : 100,
      state: this.state,
      uptime: Date.now() - this.startTime,
      parametersMonitored: this.allowedParameters.length,
      currentCallId: this.currentCallId,
      monitoringConnected: monitoringClient ? monitoringClient.connected : false
    };
  }

  /**
   * Reset counters
   */
  reset() {
    this.totalProcessed = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.warningCount = 0;
    this.criticalCount = 0;
    this.state = 'idle';
    this.startTime = Date.now();
    this.currentCallId = null;
    this.callStartTime = null;
    console.log(`[${this.stationId}-${this.extension}] Counters reset`);
  }
}

module.exports = StationAgent;