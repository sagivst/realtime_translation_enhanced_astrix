
// StationAgent - Emits station monitoring data with Matrix/knob values
const fs = require('fs');
const path = require('path');
const io = require('socket.io-client');

class StationAgent {
  constructor(stationId, extensionOrPort) {
    this.stationId = stationId;
    // Handle both formats: extensionOrPort can be extension (3333) or port
    this.extension = typeof extensionOrPort === 'string' ? parseInt(extensionOrPort) : extensionOrPort;
    this.port = this.extension; // For backward compatibility

    // Enable monitoring
    this.enabled = true;

    // Control fake traffic generation
    this.generateFakeTraffic = false; // Can be toggled via control endpoint

    // Initialize with the ±75 & ±150 knob format external systems expect
    this.knobs = {
      // Matrix knobs (±75 range)
      matrix_1_knob: 0,
      matrix_2_knob: 0,
      matrix_3_knob: 0,
      matrix_4_knob: 0,
      matrix_5_knob: 0,
      matrix_6_knob: 0,
      matrix_7_knob: 0,
      matrix_8_knob: 0,

      // Main control knobs (±150 range)
      main_volume: 0,
      balance: 0,
      treble: 0,
      bass: 0,
      gain: 0,
      compression: 0,
      noise_gate: 0,
      reverb: 0
    };

    // Initialize metrics
    this.metrics = {
      calls: 0,
      errors: 0,
      latency: [],
      avgLatency: 0,
      status: 'active',
      lastActivity: new Date().toISOString()
    };

    this.socket = null;
    this.monitoringSocket = null;
    this.lastSnapshot = null;
  }

  initStationAgent() {
    console.log(`[StationAgent] Initializing monitoring for ${this.stationId} extension ${this.extension}`);

    // Connect to monitoring server
    this.monitoringSocket = io('http://localhost:3001', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    this.monitoringSocket.on('connect', () => {
      console.log(`[StationAgent] Connected to monitoring server for ${this.stationId}`);

      // Send initial snapshot
      this.emitSnapshot();
    });

    this.monitoringSocket.on('disconnect', () => {
      console.log(`[StationAgent] Disconnected from monitoring server for ${this.stationId}`);
    });

    // Start periodic snapshot emission (every 5 seconds)
    setInterval(() => {
      if (this.enabled) {
        this.emitSnapshot();
      }
    }, 5000);

    // If fake traffic generation is enabled, start it
    if (this.generateFakeTraffic) {
      this.startFakeTrafficGeneration();
    }
  }

  startFakeTrafficGeneration() {
    console.log(`[StationAgent] Starting fake traffic generation for ${this.stationId}`);

    setInterval(() => {
      if (!this.generateFakeTraffic || !this.enabled) return;

      // Generate realistic-looking random knob movements
      // Matrix knobs move within ±75 range
      for (let i = 1; i <= 8; i++) {
        const key = `matrix_${i}_knob`;
        const currentValue = this.knobs[key];
        const change = (Math.random() - 0.5) * 10; // Small incremental changes
        this.knobs[key] = Math.max(-75, Math.min(75, currentValue + change));
      }

      // Main control knobs move within ±150 range
      const mainKnobs = ['main_volume', 'balance', 'treble', 'bass', 'gain', 'compression', 'noise_gate', 'reverb'];
      mainKnobs.forEach(knob => {
        const currentValue = this.knobs[knob];
        const change = (Math.random() - 0.5) * 15; // Slightly larger changes for main controls
        this.knobs[knob] = Math.max(-150, Math.min(150, currentValue + change));
      });

      // Update metrics
      this.metrics.calls++;
      this.metrics.lastActivity = new Date().toISOString();

      // Emit the updated snapshot
      this.emitSnapshot();
    }, 2000); // Every 2 seconds when generating fake traffic
  }

  // Record a metric from actual station activity
  recordMetric(type, value) {
    if (!this.enabled) return;

    if (type === 'call') {
      this.metrics.calls++;
    } else if (type === 'error') {
      this.metrics.errors++;
    } else if (type === 'latency') {
      this.metrics.latency.push(value);
      if (this.metrics.latency.length > 100) {
        this.metrics.latency.shift();
      }
      // Calculate average latency
      this.metrics.avgLatency = this.metrics.latency.length > 0
        ? this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length
        : 0;
    } else if (type === 'knob') {
      // Handle knob updates from real station activity
      if (value && value.name && value.value !== undefined) {
        this.knobs[value.name] = value.value;
      }
    }

    this.metrics.lastActivity = new Date().toISOString();
  }

  // Update knobs from station handler
  updateKnobs(knobData) {
    if (!this.enabled) return;

    // Merge provided knob data with current knobs
    Object.assign(this.knobs, knobData);

    // Emit updated snapshot
    this.emitSnapshot();
  }

  // Emit the full station snapshot in the format external systems expect
  emitSnapshot() {
    console.log("[StationAgent-DEBUG] emitSnapshot() called, socket connected:", !!(this.monitoringSocket && this.monitoringSocket.connected));
    if (!this.monitoringSocket || !this.monitoringSocket.connected) return;

    const snapshot = {
      timestamp: new Date().toISOString(),
      station_id: this.stationId,
      extension: this.extension,

      // The knobs data that external systems expect (±75 & ±150 values)
      knobs: { ...this.knobs },

      // Include metrics for completeness
      metrics: {
        calls: this.metrics.calls,
        errors: this.metrics.errors,
        avgLatency: this.metrics.avgLatency.toFixed(2),
        status: this.metrics.status,
        lastActivity: this.metrics.lastActivity
      },

      // Matrix state representation (derived from matrix knobs)
      matrixState: [
        this.knobs.matrix_1_knob,
        this.knobs.matrix_2_knob,
        this.knobs.matrix_3_knob,
        this.knobs.matrix_4_knob,
        this.knobs.matrix_5_knob,
        this.knobs.matrix_6_knob,
        this.knobs.matrix_7_knob,
        this.knobs.matrix_8_knob
      ]
    };

    // Store last snapshot
    this.lastSnapshot = snapshot;

    // Emit to monitoring server on the station channel
    this.monitoringSocket.emit(this.stationId, snapshot);

    // Also emit on a generic 'unified-metrics' channel for the bridge
    this.monitoringSocket.emit('unified-metrics', snapshot);
    console.log("[StationAgent-DEBUG] Emitted unified-metrics event for", this.stationId, "-", this.extension);

    console.log(`[StationAgent] Emitted snapshot for ${this.stationId}-${this.extension} with ${Object.keys(this.knobs).length} knobs`);
  }
  // Added collect() method to handle station handler calls
  collect(data) {
    console.log("[StationAgent-DEBUG] collect() called for", this.stationId, "-", this.extension);
    // Update metrics and knobs from incoming data
    if (data.metrics) {
      Object.entries(data.metrics).forEach(([key, value]) => {
        this.recordMetric(key, value);
      });
    }
    
    if (data.knobs) {
      this.updateKnobs(data.knobs);
    }
    
    // Store additional data
    if (data.callId) this.callId = data.callId;
    if (data.timestamp) this.lastActivity = new Date(data.timestamp).getTime();
    
    // Emit the snapshot with all collected data
    this.emitSnapshot();
  }


  // Get current metrics
  getMetrics() {
    return {
      ...this.metrics,
      knobs: { ...this.knobs }
    };
  }

  // Record an error
  recordError(error) {
    this.metrics.errors++;
    this.metrics.lastActivity = new Date().toISOString();
    console.error(`[${this.stationId}] Error:`, error);
  }

  // Generic emit method for backward compatibility
  emit(eventType, data) {
    if (!this.enabled) return;

    if (this.monitoringSocket && this.monitoringSocket.connected) {
      this.monitoringSocket.emit(eventType, data);
    }
  }

  // Cleanup
  destroy() {
    if (this.monitoringSocket) {
      this.monitoringSocket.disconnect();
      this.monitoringSocket = null;
    }
    this.enabled = false;
  }
}

module.exports = StationAgent;
