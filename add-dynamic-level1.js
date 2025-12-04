#!/usr/bin/env node

const fs = require('fs');

// Read the current dashboard
const dashboardPath = '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html';
let html = fs.readFileSync(dashboardPath, 'utf8');

// 1. First backup
const backupPath = dashboardPath + '.backup-' + new Date().toISOString().replace(/:/g, '-');
fs.writeFileSync(backupPath, html);

// 2. Add wrapper components CSS (waveform, system health, etc.)
const wrapperCSS = `
    /* === WRAPPER COMPONENTS CSS === */

    /* Top Monitor Header */
    .monitor-header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 15px 20px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .monitor-title {
      color: #10b981;
      font-size: 1.3em;
      font-weight: bold;
    }

    .monitor-controls {
      display: flex;
      gap: 10px;
    }

    .control-btn {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid #10b981;
      color: #10b981;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1.2em;
    }

    /* Waveform Visualization */
    .waveform-section {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid #334155;
      border-radius: 4px;
      padding: 10px 20px;
      margin-bottom: 15px;
      position: relative;
      height: 60px;
    }

    .waveform-canvas {
      width: 100%;
      height: 40px;
    }

    .recording-indicator {
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
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* System Health Bar */
    .system-health {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid #334155;
      border-radius: 4px;
      padding: 10px 20px;
      margin-bottom: 20px;
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

    .health-value {
      color: #10b981;
      font-weight: bold;
    }

    /* Grid fix for stations */
    #level1 {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 20px !important;
      padding: 20px !important;
    }

    #level1 > div {
      grid-column: span 1 !important;
    }

    /* AI Panel */
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
    }`;

// Insert CSS before </style>
html = html.replace('</style>', wrapperCSS + '\n  </style>');

// 3. Add wrapper HTML components right after <body>
const wrapperHTML = `
  <!-- === WRAPPER COMPONENTS === -->

  <!-- Real-Time Monitor Header -->
  <div class="monitor-header">
    <div class="monitor-title">REAL-TIME TRANSLATION PIPELINE MONITOR</div>
    <div class="monitor-controls">
      <button class="control-btn" onclick="toggleSettings()">⚙️</button>
      <button class="control-btn" onclick="toggleMetrics()">📊</button>
      <button class="control-btn" onclick="showHelp()">❓</button>
    </div>
  </div>

  <!-- Audio Waveform Visualization -->
  <div class="waveform-section">
    <canvas id="waveformCanvas" class="waveform-canvas"></canvas>
    <div class="recording-indicator">
      <span class="recording-dot"></span>
      <span>Recording</span>
    </div>
  </div>

  <!-- System Health Bar -->
  <div class="system-health">
    <div class="health-item">
      <span class="health-label">System Health:</span>
      <span class="health-indicator"></span>
      <span class="health-value">ONLINE</span>
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
`;

// Find where to insert - right after the existing header
const headerEnd = html.indexOf('</div>', html.indexOf('<div class="header">')) + 6;
html = html.slice(0, headerEnd) + '\n' + wrapperHTML + html.slice(headerEnd);

// 4. Add stations 3-11 after Station 2
const station2Pattern = /STATION 2: UDP TRANSMIT[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;
const station2Match = html.match(station2Pattern);

if (station2Match) {
  const insertPoint = station2Match.index + station2Match[0].length;

  const newStations = `

    <!-- STATION 3 -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 3: STT PROC</div>
        <button class="expand-btn" onclick="showLevel2('station-3')">EXPAND ⛶</button>
      </div>
      <div class="box-value good">340<span class="box-unit">PCM/s</span></div>
      <div class="box-footer">
        <span class="footer-label">Latency:</span>
        <span class="footer-value">210ms</span>
      </div>
    </div>

    <!-- STATION 4 -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 4: DEEPGRAM</div>
        <button class="expand-btn" onclick="showLevel2('station-4')">EXPAND ⛶</button>
      </div>
      <div class="box-value good">12<span class="box-unit">Text/s</span></div>
      <div class="box-footer">
        <span class="footer-label">Latency:</span>
        <span class="footer-value">180ms</span>
      </div>
    </div>

    <!-- STATION 5 -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 5: TRANSLATION</div>
        <button class="expand-btn" onclick="showLevel2('station-5')">EXPAND ⛶</button>
      </div>
      <div class="box-value good">12<span class="box-unit">Req/s</span></div>
      <div class="box-footer">
        <span class="footer-label">Latency:</span>
        <span class="footer-value">95ms</span>
      </div>
    </div>

    <!-- STATION 6 -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 6: DEEPL API</div>
        <button class="expand-btn" onclick="showLevel2('station-6')">EXPAND ⛶</button>
      </div>
      <div class="box-value good">100<span class="box-unit">%</span></div>
      <div class="box-footer">
        <span class="footer-label">Latency:</span>
        <span class="footer-value">85ms</span>
      </div>
    </div>

    <!-- STATION 7 -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 7: TTS PREP</div>
        <button class="expand-btn" onclick="showLevel2('station-7')">EXPAND ⛶</button>
      </div>
      <div class="box-value good">12<span class="box-unit">Text/s</span></div>
      <div class="box-footer">
        <span class="footer-label">Latency:</span>
        <span class="footer-value">15ms</span>
      </div>
    </div>

    <!-- STATION 8 -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 8: ELEVENLABS</div>
        <button class="expand-btn" onclick="showLevel2('station-8')">EXPAND ⛶</button>
      </div>
      <div class="box-value good">340<span class="box-unit">PCM/s</span></div>
      <div class="box-footer">
        <span class="footer-label">Latency:</span>
        <span class="footer-value">220ms</span>
      </div>
    </div>

    <!-- STATION 9 -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 9: STT TX</div>
        <button class="expand-btn" onclick="showLevel2('station-9')">EXPAND ⛶</button>
      </div>
      <div class="box-value good">340<span class="box-unit">PCM/s</span></div>
      <div class="box-footer">
        <span class="footer-label">Latency:</span>
        <span class="footer-value">45ms</span>
      </div>
    </div>

    <!-- STATION 10 -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 10: GATEWAY</div>
        <button class="expand-btn" onclick="showLevel2('station-10')">EXPAND ⛶</button>
      </div>
      <div class="box-value good">2356<span class="box-unit">RTP/s</span></div>
      <div class="box-footer">
        <span class="footer-label">Latency:</span>
        <span class="footer-value">120ms</span>
      </div>
    </div>

    <!-- STATION 11 -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 11: HUME EVI</div>
        <button class="expand-btn" onclick="showLevel2('station-11')">EXPAND ⛶</button>
      </div>
      <div class="box-value critical">OFF</div>
      <div class="box-footer">
        <span class="footer-label">Status:</span>
        <span class="footer-value">Quota Limit</span>
      </div>
    </div>`;

  html = html.slice(0, insertPoint) + newStations + html.slice(insertPoint);
}

// 5. Add AI Panel at the end of Level 1
const level1End = html.indexOf('</div>  <!-- level1 -->');
if (level1End !== -1) {
  const aiPanel = `

  <!-- Global AI Optimization Panel -->
  <div class="ai-panel" onclick="toggleAIPanel()">
    <div class="ai-panel-header">
      <div class="ai-panel-title">▼ Global AI Optimization Panel</div>
      <div class="ai-panel-mode">Currently Manual Mode</div>
    </div>
  </div>`;

  html = html.slice(0, level1End) + aiPanel + '\n  ' + html.slice(level1End);
}

// 6. Add dynamic JavaScript
const dynamicJS = `

  // === DYNAMIC INFRASTRUCTURE ===

  // Station configuration
  const stationConfig = {
    'station-1': { name: 'Asterisk', status: 'ON', metric1: 'RTP: 2356/s', metric2: 'L: 45ms' },
    'station-2': { name: 'Gateway', status: 'ON', metric1: 'PCM: 340/s', metric2: 'L: 120ms' },
    'station-3': { name: 'STT Proc', status: 'ON', metric1: 'PCM: 340/s', metric2: 'L: 210ms' },
    'station-4': { name: 'Deepgram', status: 'ON', metric1: 'Text: 12/s', metric2: 'L: 180ms' },
    'station-5': { name: 'Translation', status: 'ON', metric1: 'Req: 12/s', metric2: 'L: 95ms' },
    'station-6': { name: 'DeepL API', status: 'ON', metric1: 'API: 100%', metric2: 'L: 85ms' },
    'station-7': { name: 'TTS Prep', status: 'ON', metric1: 'Text: 12/s', metric2: 'L: 15ms' },
    'station-8': { name: 'ElevenLabs', status: 'ON', metric1: 'PCM: 340/s', metric2: 'L: 220ms' },
    'station-9': { name: 'STT TX', status: 'ON', metric1: 'PCM: 340/s', metric2: 'L: 45ms' },
    'station-10': { name: 'Gateway', status: 'ON', metric1: 'RTP: 2356/s', metric2: 'L: 120ms' },
    'station-11': { name: 'Hume EVI', status: 'OFF', metric1: 'Disabled', metric2: 'Quota Limit' }
  };

  // Waveform animation
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

      for (let x = 0; x < canvas.width; x += 5) {
        const y = 20 + Math.sin((x + phase) * 0.02) * 10 * Math.random();
        ctx.lineTo(x, y);
      }

      ctx.stroke();
      phase += 2;
      requestAnimationFrame(animate);
    }
    animate();
  }

  // Dynamic metrics update
  function updateMetrics() {
    // Update system metrics
    document.getElementById('systemLatency').textContent =
      Math.floor(150 + Math.random() * 100) + 'ms';
    document.getElementById('systemMOS').textContent =
      (4.0 + Math.random() * 0.8).toFixed(1);
  }

  // Initialize on load
  document.addEventListener('DOMContentLoaded', function() {
    initWaveform();
    setInterval(updateMetrics, 2000);
  });

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
`;

// Insert JavaScript before </script>
html = html.replace('</script>', dynamicJS + '\n  </script>');

// 7. Fix Station 1 & 2 EXPAND buttons
html = html.replace(/<div class="status-badge good">ONLINE<\/div>/g,
  '<button class="expand-btn" onclick="showLevel2(\'station-1\')">EXPAND ⛶</button>');
html = html.replace(/<div class="status-badge warning">WARNING<\/div>/g,
  '<button class="expand-btn" onclick="showLevel2(\'station-2\')">EXPAND ⛶</button>');

// Save the updated file
fs.writeFileSync(dashboardPath, html);
console.log('Successfully added dynamic infrastructure and wrapper components');
console.log('Backup saved as:', backupPath);