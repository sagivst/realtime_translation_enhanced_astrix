#!/usr/bin/env node

const fs = require('fs');

// Read the current dashboard
const dashboardPath = '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html';

// Create the proper dashboard matching the wireframe specification
const properDashboard = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Real-Time Translation Pipeline Monitor</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: #0f1419;
      color: #e0e0e0;
      font-family: 'Monaco', 'Consolas', monospace;
      padding: 20px;
      min-height: 100vh;
    }

    /* Main Container */
    .monitor-container {
      max-width: 1400px;
      margin: 0 auto;
      background: linear-gradient(135deg, #1a2332 0%, #0d1117 100%);
      border: 2px solid #334155;
      border-radius: 8px;
      overflow: hidden;
    }

    /* Header with Title and Controls */
    .monitor-header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-bottom: 1px solid #334155;
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .monitor-title {
      color: #10b981;
      font-size: 1.2em;
      font-weight: bold;
      text-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
    }

    .header-controls {
      display: flex;
      gap: 15px;
    }

    .control-btn {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid #10b981;
      color: #10b981;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1.2em;
      transition: all 0.3s;
    }

    .control-btn:hover {
      background: rgba(16, 185, 129, 0.2);
      transform: translateY(-2px);
    }

    /* Waveform Visualization */
    .waveform-section {
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid #334155;
      padding: 15px 20px;
      position: relative;
    }

    .waveform-label {
      color: #64748b;
      font-size: 0.9em;
      margin-bottom: 10px;
    }

    .waveform-container {
      height: 60px;
      position: relative;
      display: flex;
      align-items: center;
      overflow: hidden;
    }

    .waveform-canvas {
      width: 100%;
      height: 40px;
    }

    .recording-status {
      position: absolute;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      color: #10b981;
    }

    .recording-dot {
      width: 10px;
      height: 10px;
      background: #ef4444;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.2); }
    }

    /* System Health Bar */
    .health-bar {
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 2px solid #334155;
      padding: 12px 20px;
      display: flex;
      justify-content: space-around;
      align-items: center;
    }

    .health-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .health-label {
      color: #64748b;
      font-size: 0.9em;
    }

    .health-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10b981;
    }

    .health-indicator.warning { background: #f59e0b; }
    .health-indicator.error { background: #ef4444; }

    .health-value {
      color: #10b981;
      font-weight: bold;
    }

    /* Station Grid */
    .stations-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      padding: 20px;
    }

    /* Station Card */
    .station-card {
      background: linear-gradient(145deg, #1a2332 0%, #0d1117 100%);
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 15px;
      min-height: 140px;
      position: relative;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      flex-direction: column;
    }

    .station-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
      border-color: #10b981;
    }

    .station-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }

    .station-name {
      color: #94a3b8;
      font-size: 0.85em;
      font-weight: bold;
    }

    .station-status {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.5);
    }

    .station-status.on {
      background: #10b981;
      animation: statusPulse 2s infinite;
    }

    .station-status.warning {
      background: #f59e0b;
      animation: statusPulse 2s infinite;
    }

    .station-status.off {
      background: #ef4444;
    }

    @keyframes statusPulse {
      0%, 100% { box-shadow: 0 0 6px rgba(16, 185, 129, 0.5); }
      50% { box-shadow: 0 0 12px rgba(16, 185, 129, 0.8); }
    }

    .station-state {
      color: #10b981;
      font-size: 0.9em;
      margin: 8px 0;
      font-weight: bold;
    }

    .station-state.off { color: #ef4444; }
    .station-state.warning { color: #f59e0b; }

    .station-metrics {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 10px;
    }

    .metric-line {
      color: #64748b;
      font-size: 0.8em;
      display: flex;
      justify-content: space-between;
    }

    .metric-value {
      color: #10b981;
      font-weight: bold;
    }

    .expand-icon {
      position: absolute;
      bottom: 10px;
      right: 10px;
      color: #10b981;
      font-size: 0.9em;
      opacity: 0.6;
      transition: opacity 0.3s;
    }

    .station-card:hover .expand-icon {
      opacity: 1;
    }

    /* AI Panel */
    .ai-panel {
      background: rgba(0, 0, 0, 0.3);
      border-top: 2px solid #334155;
      padding: 15px 20px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .ai-panel:hover {
      background: rgba(0, 0, 0, 0.4);
    }

    .ai-panel-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .ai-panel-title {
      color: #10b981;
      font-weight: bold;
      font-size: 0.95em;
    }

    .ai-panel-mode {
      color: #f59e0b;
      font-size: 0.9em;
    }

    /* Hidden Levels */
    #level2, #level3 {
      display: none;
      padding: 20px;
    }

    /* Responsive Design */
    @media (max-width: 1200px) {
      .stations-grid { grid-template-columns: repeat(3, 1fr); }
    }

    @media (max-width: 900px) {
      .stations-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 600px) {
      .stations-grid { grid-template-columns: 1fr; }
      .health-bar { flex-direction: column; gap: 10px; }
    }
  </style>
</head>
<body>
  <div class="monitor-container">
    <!-- Header -->
    <div class="monitor-header">
      <h1 class="monitor-title">REAL-TIME TRANSLATION PIPELINE MONITOR</h1>
      <div class="header-controls">
        <button class="control-btn" onclick="toggleSettings()" title="Settings">⚙️</button>
        <button class="control-btn" onclick="toggleMetrics()" title="Metrics">📊</button>
        <button class="control-btn" onclick="showHelp()" title="Help">❓</button>
      </div>
    </div>

    <!-- Waveform Visualization -->
    <div class="waveform-section">
      <div class="waveform-label">Audio Waveform Visualization (Real-time PCM)</div>
      <div class="waveform-container">
        <canvas id="waveformCanvas" class="waveform-canvas"></canvas>
        <div class="recording-status">
          <span class="recording-dot"></span>
          <span>Recording</span>
        </div>
      </div>
    </div>

    <!-- System Health Bar -->
    <div class="health-bar">
      <div class="health-item">
        <span class="health-label">System Health:</span>
        <span class="health-indicator" id="healthIndicator"></span>
        <span class="health-value" id="healthStatus">ONLINE</span>
      </div>
      <div class="health-item">
        <span class="health-label">Latency:</span>
        <span class="health-value" id="systemLatency">182ms</span>
      </div>
      <div class="health-item">
        <span class="health-label">MOS:</span>
        <span class="health-value" id="systemMOS">4.6</span>
      </div>
    </div>

    <!-- Level 1: Station Grid -->
    <div id="level1">
      <div class="stations-grid">
        <!-- Station 1 -->
        <div class="station-card" onclick="showLevel2('station-1')">
          <div class="station-header">
            <span class="station-name">1. Asterisk</span>
            <span class="station-status on"></span>
          </div>
          <div class="station-state">● ON</div>
          <div class="station-metrics">
            <div class="metric-line">RTP: <span class="metric-value">2356/s</span></div>
            <div class="metric-line">L: <span class="metric-value">45ms</span></div>
          </div>
          <span class="expand-icon">[↗]</span>
        </div>

        <!-- Station 2 -->
        <div class="station-card" onclick="showLevel2('station-2')">
          <div class="station-header">
            <span class="station-name">2. Gateway</span>
            <span class="station-status on"></span>
          </div>
          <div class="station-state">● ON</div>
          <div class="station-metrics">
            <div class="metric-line">PCM: <span class="metric-value">340/s</span></div>
            <div class="metric-line">L: <span class="metric-value">120ms</span></div>
          </div>
          <span class="expand-icon">[↗]</span>
        </div>

        <!-- Station 3 -->
        <div class="station-card" onclick="showLevel2('station-3')">
          <div class="station-header">
            <span class="station-name">3. STT Proc</span>
            <span class="station-status on"></span>
          </div>
          <div class="station-state">● ON</div>
          <div class="station-metrics">
            <div class="metric-line">PCM: <span class="metric-value">340/s</span></div>
            <div class="metric-line">L: <span class="metric-value">210ms</span></div>
          </div>
          <span class="expand-icon">[↗]</span>
        </div>

        <!-- Station 4 -->
        <div class="station-card" onclick="showLevel2('station-4')">
          <div class="station-header">
            <span class="station-name">4. Deepgram</span>
            <span class="station-status on"></span>
          </div>
          <div class="station-state">● ON</div>
          <div class="station-metrics">
            <div class="metric-line">Text: <span class="metric-value">12/s</span></div>
            <div class="metric-line">L: <span class="metric-value">180ms</span></div>
          </div>
          <span class="expand-icon">[↗]</span>
        </div>

        <!-- Station 5 -->
        <div class="station-card" onclick="showLevel2('station-5')">
          <div class="station-header">
            <span class="station-name">5. Translation</span>
            <span class="station-status on"></span>
          </div>
          <div class="station-state">● ON</div>
          <div class="station-metrics">
            <div class="metric-line">Req: <span class="metric-value">12/s</span></div>
            <div class="metric-line">L: <span class="metric-value">95ms</span></div>
          </div>
          <span class="expand-icon">[↗]</span>
        </div>

        <!-- Station 6 -->
        <div class="station-card" onclick="showLevel2('station-6')">
          <div class="station-header">
            <span class="station-name">6. DeepL API</span>
            <span class="station-status on"></span>
          </div>
          <div class="station-state">● ON</div>
          <div class="station-metrics">
            <div class="metric-line">API: <span class="metric-value">100%</span></div>
            <div class="metric-line">L: <span class="metric-value">85ms</span></div>
          </div>
          <span class="expand-icon">[↗]</span>
        </div>

        <!-- Station 7 -->
        <div class="station-card" onclick="showLevel2('station-7')">
          <div class="station-header">
            <span class="station-name">7. TTS Prep</span>
            <span class="station-status on"></span>
          </div>
          <div class="station-state">● ON</div>
          <div class="station-metrics">
            <div class="metric-line">Text: <span class="metric-value">12/s</span></div>
            <div class="metric-line">L: <span class="metric-value">15ms</span></div>
          </div>
          <span class="expand-icon">[↗]</span>
        </div>

        <!-- Station 8 -->
        <div class="station-card" onclick="showLevel2('station-8')">
          <div class="station-header">
            <span class="station-name">8. ElevenLabs</span>
            <span class="station-status on"></span>
          </div>
          <div class="station-state">● ON</div>
          <div class="station-metrics">
            <div class="metric-line">PCM: <span class="metric-value">340/s</span></div>
            <div class="metric-line">L: <span class="metric-value">220ms</span></div>
          </div>
          <span class="expand-icon">[↗]</span>
        </div>

        <!-- Station 9 -->
        <div class="station-card" onclick="showLevel2('station-9')">
          <div class="station-header">
            <span class="station-name">9. STT TX</span>
            <span class="station-status on"></span>
          </div>
          <div class="station-state">● ON</div>
          <div class="station-metrics">
            <div class="metric-line">PCM: <span class="metric-value">340/s</span></div>
            <div class="metric-line">L: <span class="metric-value">45ms</span></div>
          </div>
          <span class="expand-icon">[↗]</span>
        </div>

        <!-- Station 10 -->
        <div class="station-card" onclick="showLevel2('station-10')">
          <div class="station-header">
            <span class="station-name">10. Gateway</span>
            <span class="station-status on"></span>
          </div>
          <div class="station-state">● ON</div>
          <div class="station-metrics">
            <div class="metric-line">RTP: <span class="metric-value">2356/s</span></div>
            <div class="metric-line">L: <span class="metric-value">120ms</span></div>
          </div>
          <span class="expand-icon">[↗]</span>
        </div>

        <!-- Station 11 -->
        <div class="station-card" onclick="showLevel2('station-11')">
          <div class="station-header">
            <span class="station-name">11. Hume EVI</span>
            <span class="station-status off"></span>
          </div>
          <div class="station-state off">⚠️ OFF</div>
          <div class="station-metrics">
            <div class="metric-line"><span class="metric-value">Disabled</span></div>
            <div class="metric-line"><span class="metric-value">Quota Limit</span></div>
          </div>
          <span class="expand-icon">[↗]</span>
        </div>
      </div>
    </div>

    <!-- Level 2: Parameter Grid (Hidden) -->
    <div id="level2">
      <div class="breadcrumb">
        <span onclick="showLevel1()">← Back to Station Grid</span>
      </div>
      <div id="level2-content"></div>
    </div>

    <!-- Level 3: Parameter Editor (Hidden) -->
    <div id="level3">
      <div class="breadcrumb">
        <span onclick="showLevel2()">← Back to Parameters</span>
      </div>
      <div id="level3-content"></div>
    </div>

    <!-- AI Optimization Panel -->
    <div class="ai-panel" onclick="toggleAIPanel()">
      <div class="ai-panel-content">
        <span class="ai-panel-title">▼ Global AI Optimization Panel</span>
        <span class="ai-panel-mode">Currently Manual Mode</span>
      </div>
    </div>
  </div>

  <script>
    // Waveform Animation
    function initWaveform() {
      const canvas = document.getElementById('waveformCanvas');
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      canvas.width = canvas.offsetWidth;
      canvas.height = 40;

      let phase = 0;
      function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const bars = '▁▃▅▇█▇▅▃▁▁▃▅▇█▇▅▃▁▁▃▅▇█▇▅▃▁';
        const barWidth = canvas.width / bars.length;

        for (let i = 0; i < bars.length; i++) {
          const x = i * barWidth + barWidth / 2;
          const barHeight = {
            '▁': 5, '▃': 10, '▅': 15, '▇': 20, '█': 25
          };
          const height = barHeight[bars[i]] || 5;
          const y = canvas.height / 2 + Math.sin((i + phase) * 0.2) * height;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.stroke();
        phase += 0.1;
        requestAnimationFrame(animate);
      }
      animate();
    }

    // Initialize on load
    window.addEventListener('DOMContentLoaded', () => {
      initWaveform();
      startMetricsUpdate();
    });

    // Update metrics dynamically
    function startMetricsUpdate() {
      setInterval(() => {
        // Update latency
        const latency = Math.floor(150 + Math.random() * 100);
        document.getElementById('systemLatency').textContent = latency + 'ms';

        // Update MOS
        const mos = (4.0 + Math.random() * 0.8).toFixed(1);
        document.getElementById('systemMOS').textContent = mos;

        // Update health indicator
        const health = document.getElementById('healthIndicator');
        if (latency < 200) {
          health.className = 'health-indicator';
        } else if (latency < 300) {
          health.className = 'health-indicator warning';
        } else {
          health.className = 'health-indicator error';
        }
      }, 2000);
    }

    // Navigation functions
    function showLevel1() {
      document.getElementById('level1').style.display = 'block';
      document.getElementById('level2').style.display = 'none';
      document.getElementById('level3').style.display = 'none';
    }

    function showLevel2(stationId) {
      document.getElementById('level1').style.display = 'none';
      document.getElementById('level2').style.display = 'block';
      document.getElementById('level3').style.display = 'none';

      // Load station parameters
      document.getElementById('level2-content').innerHTML =
        '<h2>Parameters for ' + stationId + '</h2>' +
        '<div class="stations-grid">' +
        '<div class="station-card"><div class="station-name">Buffer Size</div></div>' +
        '<div class="station-card"><div class="station-name">Latency Target</div></div>' +
        '<div class="station-card"><div class="station-name">Packet Loss</div></div>' +
        '<div class="station-card"><div class="station-name">Jitter Buffer</div></div>' +
        '</div>';
    }

    function showLevel3(parameter) {
      document.getElementById('level1').style.display = 'none';
      document.getElementById('level2').style.display = 'none';
      document.getElementById('level3').style.display = 'block';

      document.getElementById('level3-content').innerHTML =
        '<h2>Edit ' + parameter + '</h2>' +
        '<input type="range" min="0" max="100" value="50">';
    }

    // Control functions
    function toggleSettings() {
      alert('Settings panel - To be implemented');
    }

    function toggleMetrics() {
      alert('Metrics dashboard - To be implemented');
    }

    function showHelp() {
      alert('Help documentation - To be implemented');
    }

    function toggleAIPanel() {
      alert('AI Optimization Panel - To be implemented');
    }
  </script>
</body>
</html>`;

// Write the new dashboard
fs.writeFileSync(dashboardPath, properDashboard);
console.log('Created proper dashboard matching wireframe specification');