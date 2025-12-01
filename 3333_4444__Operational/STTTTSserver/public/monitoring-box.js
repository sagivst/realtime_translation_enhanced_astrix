/**
 * MonitoringBox - Reusable Modular Component
 *
 * A self-contained monitoring visualization component that displays
 * real-time metrics with sub-parameters, animated bars, and live graphs.
 *
 * Usage:
 *   const box = new MonitoringBox('container-id', station);
 *   box.update(newMetrics);
 */

class MonitoringBox {
  constructor(containerId, station) {
    this.containerId = containerId;
    this.station = station;
    this.metricsHistory = {
      latency: [],
      jitter: [],
      bufferUsage: []
    };
    this.maxHistoryLength = 60; // 60 seconds of history

    this.render();
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`[MonitoringBox] Container ${this.containerId} not found`);
      return;
    }

    container.innerHTML = `
      <div class="monitoring-box">
        <div class="box-header">
          <h2>${this.station.name}</h2>
          <span class="station-id">${this.station.id}</span>
          <span class="status-badge ${this.station.active ? 'active' : 'inactive'}">
            ${this.station.active ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>

        <!-- BUFFER METRICS -->
        <div class="metrics-section">
          <h3>📊 BUFFER METRICS</h3>
          <div class="metric-group">
            <div class="metric-item">
              <label>Total Buffer Usage</label>
              <div class="progress-bar" data-metric="bufferUsage">
                <div class="progress-fill" id="${this.station.id}-buffer-fill"></div>
                <span class="progress-text" id="${this.station.id}-buffer-text">0%</span>
              </div>
            </div>
            <div class="sub-metrics">
              <div class="sub-metric">
                <label>Input Buffer</label>
                <div class="mini-bar" id="${this.station.id}-input-buffer"></div>
              </div>
              <div class="sub-metric">
                <label>Processing Buffer</label>
                <div class="mini-bar" id="${this.station.id}-processing-buffer"></div>
              </div>
              <div class="sub-metric">
                <label>Output Buffer</label>
                <div class="mini-bar" id="${this.station.id}-output-buffer"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- LATENCY METRICS -->
        <div class="metrics-section">
          <h3>⏱️ LATENCY METRICS</h3>
          <div class="metric-group">
            <div class="metric-value-display">
              <span class="value" id="${this.station.id}-latency-value">0.0ms</span>
              <span class="label">Average Latency</span>
            </div>
            <div class="sparkline-container">
              <canvas id="${this.station.id}-latency-graph" width="400" height="80"></canvas>
            </div>
            <div class="metric-details">
              <span>Peak: <strong id="${this.station.id}-latency-peak">0ms</strong></span>
              <span>Min: <strong id="${this.station.id}-latency-min">0ms</strong></span>
              <span>Jitter: <strong id="${this.station.id}-jitter">0ms</strong></span>
            </div>
          </div>
        </div>

        <!-- PACKET FLOW -->
        <div class="metrics-section">
          <h3>📦 PACKET FLOW</h3>
          <div class="metric-group">
            <div class="packet-flow-viz">
              <div class="flow-node">
                <div class="flow-value" id="${this.station.id}-packets-rx">0</div>
                <div class="flow-label">RX</div>
              </div>
              <div class="flow-arrow">
                <div class="arrow-animation"></div>
                ────➤
              </div>
              <div class="flow-node">
                <div class="flow-value" id="${this.station.id}-packets-tx">0</div>
                <div class="flow-label">TX</div>
              </div>
            </div>
            <div class="packet-stats">
              <div class="stat-item">
                <label>Dropped</label>
                <span class="stat-value" id="${this.station.id}-packets-dropped">0</span>
              </div>
              <div class="stat-item">
                <label>Errors</label>
                <span class="stat-value" id="${this.station.id}-packets-errors">0</span>
              </div>
              <div class="stat-item">
                <label>Bytes RX</label>
                <span class="stat-value" id="${this.station.id}-bytes-rx">0 KB</span>
              </div>
              <div class="stat-item">
                <label>Bytes TX</label>
                <span class="stat-value" id="${this.station.id}-bytes-tx">0 KB</span>
              </div>
            </div>
          </div>
        </div>

        <!-- AUDIO QUALITY -->
        <div class="metrics-section">
          <h3>🎵 AUDIO QUALITY</h3>
          <div class="metric-group">
            <div class="quality-indicators">
              <div class="quality-item">
                <label>Sample Rate</label>
                <span class="quality-value" id="${this.station.id}-sample-rate">--</span>
                <span class="quality-status" id="${this.station.id}-sample-rate-status">✓</span>
              </div>
              <div class="quality-item">
                <label>Bit Depth</label>
                <span class="quality-value" id="${this.station.id}-bit-depth">--</span>
                <span class="quality-status" id="${this.station.id}-bit-depth-status">✓</span>
              </div>
              <div class="quality-item">
                <label>Clipping Events</label>
                <span class="quality-value" id="${this.station.id}-clipping">0</span>
              </div>
              <div class="quality-item">
                <label>Silence Periods</label>
                <span class="quality-value" id="${this.station.id}-silence">0</span>
              </div>
            </div>
          </div>
        </div>

        <!-- CONTROLS -->
        <div class="box-controls">
          <button class="control-btn" id="${this.station.id}-log-btn" onclick="monitoringBoxes['${this.station.id}'].toggleLog()">
            LOG: OFF
          </button>
          <button class="control-btn" id="${this.station.id}-wav-btn" onclick="monitoringBoxes['${this.station.id}'].toggleWav()">
            WAV: OFF
          </button>
          <button class="control-btn" onclick="monitoringBoxes['${this.station.id}'].clearMetrics()">
            Clear Metrics
          </button>
          <button class="control-btn primary" onclick="monitoringBoxes['${this.station.id}'].exportData()">
            Export Data
          </button>
        </div>
      </div>
    `;

    // Initialize canvas for sparkline graph
    this.initializeGraph();
  }

  initializeGraph() {
    const canvas = document.getElementById(`${this.station.id}-latency-graph`);
    if (canvas) {
      this.ctx = canvas.getContext('2d');
      this.drawGraph();
    }
  }

  update(metrics) {
    if (!metrics) return;

    // Update buffer usage
    this.updateBufferMetrics(metrics);

    // Update latency metrics
    this.updateLatencyMetrics(metrics);

    // Update packet flow
    this.updatePacketFlow(metrics);

    // Update audio quality
    this.updateAudioQuality(metrics);

    // Update graph history
    this.updateHistory(metrics);
    this.drawGraph();
  }

  updateBufferMetrics(metrics) {
    const bufferUsage = metrics.bufferUsage || 0;
    const fillEl = document.getElementById(`${this.station.id}-buffer-fill`);
    const textEl = document.getElementById(`${this.station.id}-buffer-text`);

    if (fillEl && textEl) {
      fillEl.style.width = `${bufferUsage}%`;
      textEl.textContent = `${bufferUsage.toFixed(1)}%`;

      // Color code based on thresholds
      fillEl.className = 'progress-fill';
      if (bufferUsage > 80) fillEl.classList.add('critical');
      else if (bufferUsage > 60) fillEl.classList.add('warning');
      else fillEl.classList.add('good');
    }

    // Update sub-buffers (simulated split)
    const inputBuffer = Math.min(100, bufferUsage * 1.2);
    const processingBuffer = bufferUsage * 0.8;
    const outputBuffer = bufferUsage * 0.6;

    this.updateMiniBar(`${this.station.id}-input-buffer`, inputBuffer);
    this.updateMiniBar(`${this.station.id}-processing-buffer`, processingBuffer);
    this.updateMiniBar(`${this.station.id}-output-buffer`, outputBuffer);
  }

  updateMiniBar(id, value) {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `
        <div class="mini-bar-fill" style="width: ${value}%"></div>
        <span class="mini-bar-text">${value.toFixed(0)}%</span>
      `;
    }
  }

  updateLatencyMetrics(metrics) {
    const latency = metrics.avgLatency || 0;
    const jitter = metrics.jitter || 0;

    const valueEl = document.getElementById(`${this.station.id}-latency-value`);
    const jitterEl = document.getElementById(`${this.station.id}-jitter`);
    const peakEl = document.getElementById(`${this.station.id}-latency-peak`);
    const minEl = document.getElementById(`${this.station.id}-latency-min`);

    if (valueEl) {
      valueEl.textContent = `${latency.toFixed(1)}ms`;
      valueEl.className = 'value';
      if (latency > 100) valueEl.classList.add('critical');
      else if (latency > 50) valueEl.classList.add('warning');
      else valueEl.classList.add('good');
    }

    if (jitterEl) jitterEl.textContent = `${jitter.toFixed(1)}ms`;

    // Calculate peak and min from history
    if (this.metricsHistory.latency.length > 0) {
      const peak = Math.max(...this.metricsHistory.latency);
      const min = Math.min(...this.metricsHistory.latency);
      if (peakEl) peakEl.textContent = `${peak.toFixed(1)}ms`;
      if (minEl) minEl.textContent = `${min.toFixed(1)}ms`;
    }
  }

  updatePacketFlow(metrics) {
    const rxEl = document.getElementById(`${this.station.id}-packets-rx`);
    const txEl = document.getElementById(`${this.station.id}-packets-tx`);
    const droppedEl = document.getElementById(`${this.station.id}-packets-dropped`);
    const errorsEl = document.getElementById(`${this.station.id}-packets-errors`);
    const bytesRxEl = document.getElementById(`${this.station.id}-bytes-rx`);
    const bytesTxEl = document.getElementById(`${this.station.id}-bytes-tx`);

    if (rxEl) rxEl.textContent = (metrics.packetsRx || 0).toLocaleString();
    if (txEl) txEl.textContent = (metrics.packetsTx || 0).toLocaleString();
    if (droppedEl) droppedEl.textContent = metrics.packetsDropped || 0;
    if (errorsEl) errorsEl.textContent = metrics.packetsErrors || 0;
    if (bytesRxEl) bytesRxEl.textContent = this.formatBytes(metrics.bytesRx || 0);
    if (bytesTxEl) bytesTxEl.textContent = this.formatBytes(metrics.bytesTx || 0);
  }

  updateAudioQuality(metrics) {
    const sampleRateEl = document.getElementById(`${this.station.id}-sample-rate`);
    const bitDepthEl = document.getElementById(`${this.station.id}-bit-depth`);
    const clippingEl = document.getElementById(`${this.station.id}-clipping`);
    const silenceEl = document.getElementById(`${this.station.id}-silence`);

    if (sampleRateEl) sampleRateEl.textContent = metrics.sampleRate ? `${metrics.sampleRate} Hz` : '16000 Hz';
    if (bitDepthEl) bitDepthEl.textContent = metrics.bitDepth || '16-bit PCM';
    if (clippingEl) clippingEl.textContent = metrics.clippingEvents || 0;
    if (silenceEl) silenceEl.textContent = metrics.silencePeriods || 0;
  }

  updateHistory(metrics) {
    // Add to history
    if (metrics.avgLatency !== undefined) {
      this.metricsHistory.latency.push(metrics.avgLatency);
      if (this.metricsHistory.latency.length > this.maxHistoryLength) {
        this.metricsHistory.latency.shift();
      }
    }

    if (metrics.jitter !== undefined) {
      this.metricsHistory.jitter.push(metrics.jitter);
      if (this.metricsHistory.jitter.length > this.maxHistoryLength) {
        this.metricsHistory.jitter.shift();
      }
    }

    if (metrics.bufferUsage !== undefined) {
      this.metricsHistory.bufferUsage.push(metrics.bufferUsage);
      if (this.metricsHistory.bufferUsage.length > this.maxHistoryLength) {
        this.metricsHistory.bufferUsage.shift();
      }
    }
  }

  drawGraph() {
    if (!this.ctx) return;

    const canvas = this.ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    const data = this.metricsHistory.latency;

    // Clear canvas
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(0, 0, width, height);

    if (data.length < 2) return;

    // Find max value for scaling
    const maxValue = Math.max(...data, 100);

    // Draw grid lines
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = (height / 4) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }

    // Draw line graph
    this.ctx.beginPath();
    this.ctx.strokeStyle = '#667eea';
    this.ctx.lineWidth = 2;

    const stepX = width / (data.length - 1);
    data.forEach((value, index) => {
      const x = index * stepX;
      const y = height - (value / maxValue) * height;
      if (index === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });

    this.ctx.stroke();

    // Fill area under curve
    this.ctx.lineTo(width, height);
    this.ctx.lineTo(0, height);
    this.ctx.closePath();
    this.ctx.fillStyle = 'rgba(102, 126, 234, 0.2)';
    this.ctx.fill();
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  toggleLog() {
    const btnEl = document.getElementById(`${this.station.id}-log-btn`);
    const currentState = btnEl.textContent.includes('OFF');

    fetch(`/api/stations/${this.station.id}/log/${currentState ? 'start' : 'stop'}`, {
      method: 'POST'
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        btnEl.textContent = currentState ? 'LOG: ON' : 'LOG: OFF';
        btnEl.classList.toggle('active');
      }
    });
  }

  toggleWav() {
    const btnEl = document.getElementById(`${this.station.id}-wav-btn`);
    const currentState = btnEl.textContent.includes('OFF');

    fetch(`/api/stations/${this.station.id}/record/${currentState ? 'start' : 'stop'}`, {
      method: 'POST'
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        btnEl.textContent = currentState ? 'WAV: ON' : 'WAV: OFF';
        btnEl.classList.toggle('active');
      }
    });
  }

  clearMetrics() {
    this.metricsHistory = {
      latency: [],
      jitter: [],
      bufferUsage: []
    };
    this.drawGraph();
  }

  exportData() {
    const data = {
      station: this.station,
      history: this.metricsHistory,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.station.id}-metrics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Global registry for monitoring boxes
window.monitoringBoxes = window.monitoringBoxes || {};
