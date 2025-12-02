/**
 * StationAgent-Unified.js
 *
 * Updated StationAgent that uses UnifiedStationCollector
 * Collects ALL 75 metrics and ~100 knobs from EVERY station
 * NO FILTERING - Dashboard manages what's relevant
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
        console.log('[StationAgent-Unified] ✅ Connected to monitoring server on port 3001');
      });

      monitoringClient.on('disconnect', () => {
        console.log('[StationAgent-Unified] ⚠️ Disconnected from monitoring server');
      });

      monitoringClient.on('error', (error) => {
        console.log('[StationAgent-Unified] ❌ Monitoring connection error:', error.message);
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

    console.log(`[${stationId}-${extension}] Unified Agent initialized:`);
    console.log(`  - Collecting ALL 75 metrics`);
    console.log(`  - Monitoring ${this.collector.getKnobCount()} knobs`);
    console.log(`  - NO FILTERING - Dashboard manages relevancy`);

    // Register with monitoring server
    this.registerWithMonitoring();

    // Listen for knob updates from monitoring server
    this.setupKnobListener();
  }

  /**
   * Register this station with the monitoring server
   */
  registerWithMonitoring() {
    const client = getMonitoringClient();
    if (!client) return;

    const capabilities = {
      station_id: this.stationId,
      extension: this.extension,
      capabilities: {
        name: this.getStationName(),
        type: this.getStationType(),
        metrics_available: 75,
        knobs_available: this.collector.getKnobCount(),
        critical: this.isCriticalStation(),
        description: this.getStationDescription()
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
   * Setup listener for knob updates from monitoring server
   */
  setupKnobListener() {
    const client = getMonitoringClient();
    if (!client) return;

    client.on('apply-knobs', (data) => {
      if (data.station_id === this.stationId || data.station_id === 'ALL') {
        console.log(`[${this.stationId}] 🎯 Received ${data.knobs.length} knob updates`);

        const result = this.collector.applyKnobs(data.knobs);

        // Send acknowledgment back to monitoring server
        client.emit('knobs-applied', {
          station_id: this.stationId,
          applied: result.applied,
          failed: result.failed,
          timestamp: new Date().toISOString()
        });

        console.log(`[${this.stationId}] ✅ Applied ${result.applied.length} knobs, ${result.failed.length} failed`);
      }
    });

    // Listen for knob catalog requests
    client.on('request-knob-catalog', () => {
      const catalog = this.collector.getKnobCatalog();
      client.emit('knob-catalog', {
        station_id: this.stationId,
        catalog: catalog,
        timestamp: new Date().toISOString()
      });
      console.log(`[${this.stationId}] 📚 Sent knob catalog (${catalog.length} knobs)`);
    });
  }

  /**
   * Send comprehensive data to monitoring server
   */
  sendToMonitoring(data) {
    const client = getMonitoringClient();
    if (!client || !client.connected) return;

    // Send the complete unified data structure
    client.emit('unified-metrics', data);

    console.log(`[${this.stationId}-${this.extension}] 📊 Sent unified data:`);
    console.log(`  - ${data.metric_count} metrics`);
    console.log(`  - ${data.knob_count} knobs`);
    console.log(`  - ${data.alerts.length} alerts`);
  }

  /**
   * Collect ALL metrics and knobs for this station
   */
  async collect(context) {
    try {
      // Use UnifiedStationCollector to get EVERYTHING
      const unifiedData = await this.collector.collectAll(context);

      // Send to monitoring server
      this.sendToMonitoring(unifiedData);

      // Return the complete data structure
      return unifiedData;

    } catch (error) {
      console.error(`[${this.stationId}-${this.extension}] Collection error:`, error.message);

      const errorData = {
        station_id: this.stationId,
        extension: this.extension,
        metrics: {},
        knobs: {},
        alerts: [{
          metric: 'system',
          level: 'critical',
          message: `Collection failed: ${error.message}`
        }],
        metadata: {
          state: 'error',
          error: error.message
        }
      };

      // Still try to send error state to monitoring
      this.sendToMonitoring(errorData);

      return errorData;
    }
  }

  /**
   * Get station-specific information
   */
  getStationName() {
    const names = {
      'STATION_1': 'Asterisk PBX',
      'STATION_2': 'Gateway RX (Caller)',
      'STATION_3': 'Voice Monitor/Enhancer (STTTTSserver)',
      'STATION_4': 'Deepgram STT',
      'STATION_5': 'Translation Service',
      'STATION_6': 'TTS (ElevenLabs)',
      'STATION_7': 'Gateway TX (Callee)',
      'STATION_8': 'Asterisk Return',
      'STATION_9': 'STTTTSserver TX',
      'STATION_10': 'Gateway Return',
      'STATION_11': 'Hume EVI'
    };
    return names[this.stationId] || 'Unknown Station';
  }

  getStationType() {
    const types = {
      'STATION_1': 'pbx',
      'STATION_2': 'gateway',
      'STATION_3': 'voice_processor',
      'STATION_4': 'stt',
      'STATION_5': 'translation',
      'STATION_6': 'tts',
      'STATION_7': 'gateway',
      'STATION_8': 'pbx',
      'STATION_9': 'voice_processor',
      'STATION_10': 'gateway',
      'STATION_11': 'ai_voice'
    };
    return types[this.stationId] || 'unknown';
  }

  isCriticalStation() {
    // Stations 3, 4, 5, 6 are most critical for voice processing
    return ['STATION_3', 'STATION_4', 'STATION_5', 'STATION_6'].includes(this.stationId);
  }

  getStationDescription() {
    const descriptions = {
      'STATION_1': 'Handles SIP/VoIP call routing and signaling',
      'STATION_2': 'WebSocket bridge receiving audio from Asterisk',
      'STATION_3': 'CRITICAL - Monitors and enhances voice quality for STT',
      'STATION_4': 'CRITICAL - Converts speech to text in real-time',
      'STATION_5': 'CRITICAL - Translates text between languages',
      'STATION_6': 'CRITICAL - Synthesizes speech from translated text',
      'STATION_7': 'WebSocket bridge sending audio to callee',
      'STATION_8': 'Returns processed audio to Asterisk',
      'STATION_9': 'Final audio processing before transmission',
      'STATION_10': 'Final gateway before caller receives audio',
      'STATION_11': 'Optional emotional AI voice interface'
    };
    return descriptions[this.stationId] || 'Station for voice processing pipeline';
  }

  /**
   * Set current call ID for tracking
   */
  setCallId(callId) {
    this.collector.currentCallId = callId;
    this.collector.callStartTime = Date.now();
    console.log(`[${this.stationId}-${this.extension}] New call: ${callId}`);
  }

  /**
   * Get statistics
   */
  getStats() {
    const stats = this.collector.getStats();
    stats.monitoringConnected = monitoringClient ? monitoringClient.connected : false;
    return stats;
  }

  /**
   * Reset counters
   */
  reset() {
    this.collector.reset();
  }

  /**
   * Request knob value updates from monitoring server
   */
  requestKnobUpdate(knobNames) {
    const client = getMonitoringClient();
    if (!client || !client.connected) return;

    client.emit('request-knob-values', {
      station_id: this.stationId,
      knob_names: knobNames,
      timestamp: new Date().toISOString()
    });

    console.log(`[${this.stationId}] 📤 Requested update for ${knobNames.length} knobs`);
  }

  /**
   * Send alert to monitoring server
   */
  sendAlert(level, message, metric = null) {
    const client = getMonitoringClient();
    if (!client || !client.connected) return;

    client.emit('station-alert', {
      station_id: this.stationId,
      extension: this.extension,
      level: level,
      message: message,
      metric: metric,
      timestamp: new Date().toISOString()
    });

    console.log(`[${this.stationId}] 🚨 Sent ${level} alert: ${message}`);
  }
}

module.exports = StationAgentUnified;