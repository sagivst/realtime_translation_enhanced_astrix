#!/usr/bin/env node

const fs = require('fs');

// Read the current dashboard
const dashboardPath = '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html';
let html = fs.readFileSync(dashboardPath, 'utf8');

// First, let's add the missing wrapper components to Level 1
// Find the body content and add the full header structure

// Add enhanced CSS for the new components
const enhancedCSS = `
    /* Enhanced Header Styles */
    .dashboard-header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .header-title {
      font-size: 1.5em;
      font-weight: bold;
      color: #10b981;
    }

    .header-controls {
      display: flex;
      gap: 15px;
    }

    .header-btn {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid #10b981;
      color: #10b981;
      padding: 8px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1.2em;
      transition: all 0.3s;
    }

    .header-btn:hover {
      background: rgba(16, 185, 129, 0.2);
      transform: translateY(-2px);
    }

    /* Waveform Visualization */
    .waveform-container {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid #334155;
      border-radius: 4px;
      padding: 15px;
      margin-bottom: 15px;
      height: 80px;
      position: relative;
      overflow: hidden;
    }

    .waveform-canvas {
      width: 100%;
      height: 60px;
    }

    .waveform-status {
      position: absolute;
      top: 10px;
      right: 20px;
      color: #10b981;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .recording-indicator {
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
    .system-health {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid #334155;
      border-radius: 4px;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .health-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .health-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10b981;
    }

    .health-indicator.warning {
      background: #f59e0b;
    }

    .health-indicator.error {
      background: #ef4444;
    }

    .health-label {
      color: #94a3b8;
      font-size: 0.9em;
    }

    .health-value {
      color: #e0e0e0;
      font-weight: bold;
    }

    /* Station Status Indicators */
    .station-status {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #10b981;
    }

    .station-status.warning {
      background: #f59e0b;
    }

    .station-status.offline {
      background: #ef4444;
    }

    .station-metrics {
      margin-top: 15px;
      font-size: 0.85em;
      color: #94a3b8;
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
    }

    .metric-label {
      color: #64748b;
    }

    .metric-value {
      color: #10b981;
      font-weight: bold;
    }

    /* Global AI Optimization Panel */
    .ai-panel {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid #334155;
      border-radius: 4px;
      padding: 15px 20px;
      margin-top: 20px;
      cursor: pointer;
    }

    .ai-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .ai-panel-title {
      color: #10b981;
      font-weight: bold;
    }

    .ai-panel-mode {
      color: #f59e0b;
      font-size: 0.9em;
    }

    /* Dynamic Station Box Styles */
    .monitoring-box--large {
      position: relative;
      transition: all 0.3s;
    }

    .monitoring-box--large:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
    }
`;

// Find </style> tag and insert enhanced CSS before it
html = html.replace('</style>', enhancedCSS + '\n  </style>');

// Create the enhanced HTML structure for Level 1
const enhancedHeader = `
  <!-- Enhanced Dashboard Header -->
  <div class="dashboard-header">
    <div class="header-top">
      <h1 class="header-title">REAL-TIME TRANSLATION PIPELINE MONITOR</h1>
      <div class="header-controls">
        <button class="header-btn" onclick="toggleSettings()" title="Settings">⚙️</button>
        <button class="header-btn" onclick="toggleMetrics()" title="Metrics">📊</button>
        <button class="header-btn" onclick="showHelp()" title="Help">❓</button>
      </div>
    </div>

    <!-- Audio Waveform Visualization -->
    <div class="waveform-container">
      <canvas id="waveformCanvas" class="waveform-canvas"></canvas>
      <div class="waveform-status">
        <span class="recording-indicator"></span>
        <span>Recording</span>
      </div>
    </div>

    <!-- System Health Bar -->
    <div class="system-health">
      <div class="health-item">
        <span class="health-label">System Health:</span>
        <span class="health-indicator" id="systemHealthIndicator"></span>
        <span class="health-value" id="systemHealthStatus">ONLINE</span>
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
  </div>
`;

// Find the level1 div and add header before it
const level1Pattern = /(<div id="level1"[^>]*>)/;
const level1Match = html.match(level1Pattern);

if (level1Match) {
  // Insert the enhanced header before level1
  const insertPos = html.indexOf(level1Match[0]);
  html = html.slice(0, insertPos) + enhancedHeader + '\n  ' + html.slice(insertPos);
}

// Add the AI Optimization Panel at the bottom of Level 1
const aiPanel = `
  <!-- Global AI Optimization Panel -->
  <div class="ai-panel" onclick="toggleAIPanel()">
    <div class="ai-panel-header">
      <div class="ai-panel-title">▼ Global AI Optimization Panel</div>
      <div class="ai-panel-mode">Currently Manual Mode</div>
    </div>
  </div>
`;

// Find end of level1 div and add AI panel before it
const level1EndPattern = /(  <\/div>\s*<!-- level1 -->)/;
const level1EndMatch = html.match(level1EndPattern);

if (level1EndMatch) {
  html = html.replace(level1EndPattern, aiPanel + '\n' + level1EndMatch[1]);
}

// Now create the dynamic JavaScript for managing stations
const dynamicJS = `
  // Dynamic Station Management System
  class StationManager {
    constructor() {
      this.stations = ${JSON.stringify([
        { id: 'station-1', name: 'Asterisk', status: 'ON', metric1: 'RTP: 2356/s', metric2: 'L: 45ms' },
        { id: 'station-2', name: 'Gateway', status: 'ON', metric1: 'PCM: 340/s', metric2: 'L: 120ms' },
        { id: 'station-3', name: 'STT Proc', status: 'ON', metric1: 'PCM: 340/s', metric2: 'L: 210ms' },
        { id: 'station-4', name: 'Deepgram', status: 'ON', metric1: 'Text: 12/s', metric2: 'L: 180ms' },
        { id: 'station-5', name: 'Translation', status: 'ON', metric1: 'Req: 12/s', metric2: 'L: 95ms' },
        { id: 'station-6', name: 'DeepL API', status: 'ON', metric1: 'API: 100%', metric2: 'L: 85ms' },
        { id: 'station-7', name: 'TTS Prep', status: 'ON', metric1: 'Text: 12/s', metric2: 'L: 15ms' },
        { id: 'station-8', name: 'ElevenLabs', status: 'ON', metric1: 'PCM: 340/s', metric2: 'L: 220ms' },
        { id: 'station-9', name: 'STT TX', status: 'ON', metric1: 'PCM: 340/s', metric2: 'L: 45ms' },
        { id: 'station-10', name: 'Gateway', status: 'ON', metric1: 'RTP: 2356/s', metric2: 'L: 120ms' },
        { id: 'station-11', name: 'Hume EVI', status: 'OFF', metric1: 'Disabled', metric2: 'Quota Limit' }
      ], null, 2)};
      this.init();
    }

    init() {
      this.updateStationDisplay();
      this.startWaveformAnimation();
      this.startMetricsUpdate();
    }

    updateStationDisplay() {
      this.stations.forEach(station => {
        const stationBox = document.querySelector(\`[data-station="\${station.id}"]\`);
        if (stationBox) {
          // Add status indicator
          const statusIndicator = document.createElement('div');
          statusIndicator.className = 'station-status';
          if (station.status === 'OFF') {
            statusIndicator.classList.add('offline');
          } else if (station.status === 'WARNING') {
            statusIndicator.classList.add('warning');
          }

          // Add metrics display
          const metricsDiv = document.createElement('div');
          metricsDiv.className = 'station-metrics';
          metricsDiv.innerHTML = \`
            <div class="metric-row">
              <span class="metric-value">\${station.metric1}</span>
            </div>
            <div class="metric-row">
              <span class="metric-value">\${station.metric2}</span>
            </div>
          \`;

          // Update station box
          const existingStatus = stationBox.querySelector('.station-status');
          if (existingStatus) existingStatus.remove();

          const existingMetrics = stationBox.querySelector('.station-metrics');
          if (existingMetrics) existingMetrics.remove();

          stationBox.appendChild(statusIndicator);
          stationBox.appendChild(metricsDiv);
        }
      });
    }

    startWaveformAnimation() {
      const canvas = document.getElementById('waveformCanvas');
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      canvas.width = canvas.offsetWidth;
      canvas.height = 60;

      let phase = 0;
      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let x = 0; x < canvas.width; x += 5) {
          const y = 30 + Math.sin((x + phase) * 0.02) * 20 * Math.random();
          ctx.lineTo(x, y);
        }

        ctx.stroke();
        phase += 2;
        requestAnimationFrame(animate);
      };
      animate();
    }

    startMetricsUpdate() {
      setInterval(() => {
        // Update system metrics
        const latency = Math.floor(150 + Math.random() * 100);
        const mos = (4.0 + Math.random() * 0.8).toFixed(1);

        document.getElementById('systemLatency').textContent = latency + 'ms';
        document.getElementById('systemMOS').textContent = mos;

        // Update station metrics dynamically
        this.stations.forEach(station => {
          if (station.status === 'ON') {
            // Simulate metric updates
            if (station.metric1.includes('RTP')) {
              station.metric1 = 'RTP: ' + Math.floor(2200 + Math.random() * 300) + '/s';
            } else if (station.metric1.includes('PCM')) {
              station.metric1 = 'PCM: ' + Math.floor(320 + Math.random() * 40) + '/s';
            }
          }
        });

        this.updateStationDisplay();
      }, 2000);
    }
  }

  // Initialize station manager when page loads
  let stationManager;
  document.addEventListener('DOMContentLoaded', () => {
    stationManager = new StationManager();
  });

  // Helper functions for header controls
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
`;

// Find </script> and add the dynamic JS before it
html = html.replace('</script>', dynamicJS + '\n  </script>');

// Write the updated HTML
fs.writeFileSync(dashboardPath, html);
console.log('Successfully added dynamic infrastructure to Level 1');