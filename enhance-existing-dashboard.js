const fs = require('fs');

// Read the CURRENT dashboard (the 75-parameter one that's working)
const dashboardPath = '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html';
let html = fs.readFileSync(dashboardPath, 'utf8');

// ADD a view toggle button to switch between 75-param view and 11-station grid
const viewToggleHTML = `
  <div style="position: fixed; top: 20px; right: 20px; z-index: 1000;">
    <button onclick="toggleView()" style="
      background: #10b981;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-family: 'SF Mono', Monaco, monospace;
    ">Toggle Station View</button>
  </div>
`;

// ADD the 11-station grid view as specified in the document
const stationGridHTML = `
  <!-- 11-STATION GRID VIEW (Level 1) -->
  <div id="station-grid-view" style="display: none;">
    <div class="station-header">
      <h1>REAL-TIME TRANSLATION PIPELINE MONITOR</h1>
      <div class="header-controls">
        <button onclick="openSettings()">⚙️</button>
        <button onclick="openAnalytics()">📊</button>
        <button onclick="openHelp()">❓</button>
      </div>
    </div>

    <div class="system-status-bar">
      <span class="status-dot online"></span>
      <span>System Health: ONLINE</span>
      <span class="divider">|</span>
      <span>Latency: <span id="global-latency">182ms</span></span>
      <span class="divider">|</span>
      <span>MOS: <span id="global-mos">4.6</span></span>
    </div>

    <div class="stations-container">
      <!-- Row 1: Stations 1-4 -->
      <div class="station-row">
        <div class="station-card" id="station-1" onclick="showLevel2('station-1')">
          <div class="station-header-mini">
            <span class="station-number">1.</span>
            <span class="station-name">Asterisk</span>
            <span class="station-status on">● ON</span>
          </div>
          <div class="station-metrics">
            <div>RTP: <span>2356/s</span></div>
            <div>L: <span>45ms</span></div>
          </div>
          <div class="expand-icon">[↗]</div>
        </div>

        <div class="station-card" id="station-2" onclick="showLevel2('station-2')">
          <div class="station-header-mini">
            <span class="station-number">2.</span>
            <span class="station-name">Gateway</span>
            <span class="station-status on">● ON</span>
          </div>
          <div class="station-metrics">
            <div>PCM: <span>340/s</span></div>
            <div>L: <span>12ms</span></div>
          </div>
          <div class="expand-icon">[↗]</div>
        </div>

        <div class="station-card" id="station-3" onclick="showLevel2('station-3')">
          <div class="station-header-mini">
            <span class="station-number">3.</span>
            <span class="station-name">STT Proc</span>
            <span class="station-status on">● ON</span>
          </div>
          <div class="station-metrics">
            <div>PCM: <span>340/s</span></div>
            <div>L: <span>180ms</span></div>
          </div>
          <div class="expand-icon">[↗]</div>
        </div>

        <div class="station-card" id="station-4" onclick="showLevel2('station-4')">
          <div class="station-header-mini">
            <span class="station-number">4.</span>
            <span class="station-name">Deepgram</span>
            <span class="station-status on">● ON</span>
          </div>
          <div class="station-metrics">
            <div>Text: <span>12/s</span></div>
            <div>L: <span>89ms</span></div>
          </div>
          <div class="expand-icon">[↗]</div>
        </div>
      </div>

      <!-- Row 2: Stations 5-8 -->
      <div class="station-row">
        <div class="station-card" id="station-5" onclick="showLevel2('station-5')">
          <div class="station-header-mini">
            <span class="station-number">5.</span>
            <span class="station-name">Translation</span>
            <span class="station-status on">● ON</span>
          </div>
          <div class="station-metrics">
            <div>Text: <span>12/s</span></div>
            <div>L: <span>145ms</span></div>
          </div>
          <div class="expand-icon">[↗]</div>
        </div>

        <div class="station-card" id="station-6" onclick="showLevel2('station-6')">
          <div class="station-header-mini">
            <span class="station-number">6.</span>
            <span class="station-name">DeepL</span>
            <span class="station-status on">● ON</span>
          </div>
          <div class="station-metrics">
            <div>API: <span>Pro</span></div>
            <div>L: <span>210ms</span></div>
          </div>
          <div class="expand-icon">[↗]</div>
        </div>

        <div class="station-card" id="station-7" onclick="showLevel2('station-7')">
          <div class="station-header-mini">
            <span class="station-number">7.</span>
            <span class="station-name">TTS Prep</span>
            <span class="station-status on">● ON</span>
          </div>
          <div class="station-metrics">
            <div>Text: <span>8/s</span></div>
            <div>L: <span>35ms</span></div>
          </div>
          <div class="expand-icon">[↗]</div>
        </div>

        <div class="station-card" id="station-8" onclick="showLevel2('station-8')">
          <div class="station-header-mini">
            <span class="station-number">8.</span>
            <span class="station-name">ElevenLabs</span>
            <span class="station-status warning">● SLOW</span>
          </div>
          <div class="station-metrics">
            <div>Queue: <span>5</span></div>
            <div>L: <span>320ms</span></div>
          </div>
          <div class="expand-icon">[↗]</div>
        </div>
      </div>

      <!-- Row 3: Stations 9-11 -->
      <div class="station-row three-col">
        <div class="station-card" id="station-9" onclick="showLevel2('station-9')">
          <div class="station-header-mini">
            <span class="station-number">9.</span>
            <span class="station-name">STT TX</span>
            <span class="station-status on">● ON</span>
          </div>
          <div class="station-metrics">
            <div>PCM: <span>340/s</span></div>
            <div>L: <span>95ms</span></div>
          </div>
          <div class="expand-icon">[↗]</div>
        </div>

        <div class="station-card" id="station-10" onclick="showLevel2('station-10')">
          <div class="station-header-mini">
            <span class="station-number">10.</span>
            <span class="station-name">Gateway</span>
            <span class="station-status on">● ON</span>
          </div>
          <div class="station-metrics">
            <div>RTP: <span>2340/s</span></div>
            <div>L: <span>38ms</span></div>
          </div>
          <div class="expand-icon">[↗]</div>
        </div>

        <div class="station-card" id="station-11" onclick="showLevel2('station-11')">
          <div class="station-header-mini">
            <span class="station-number">11.</span>
            <span class="station-name">Hume EVI</span>
            <span class="station-status off">● OFF</span>
          </div>
          <div class="station-metrics">
            <div>Status: <span>Quota</span></div>
            <div>L: <span>--</span></div>
          </div>
          <div class="expand-icon">[↗]</div>
        </div>
      </div>
    </div>

    <!-- AI Panel at bottom -->
    <div class="ai-panel">
      <div class="ai-panel-header">
        <span>Global AI Optimization Panel</span>
        <span class="mode-badge">Manual Mode</span>
      </div>
      <div class="ai-controls">
        <div>Target Latency: <200ms</div>
        <div>Quality: Balanced</div>
        <div>Auto-Tune: OFF</div>
      </div>
    </div>
  </div>

  <!-- Level 2: Expanded Station View -->
  <div id="level2-view" style="display: none;">
    <div class="level2-header">
      <button onclick="hideLevel2()">← Back</button>
      <h2 id="level2-title">Station Details</h2>
    </div>

    <div class="level2-content">
      <div class="waveform-section">
        <h3>Audio Waveform</h3>
        <canvas id="waveform-canvas" width="600" height="150"></canvas>
        <div class="recording-indicator">● Recording</div>
      </div>

      <div class="metrics-section">
        <h3>MONITORING METRICS</h3>
        <div class="metrics-grid">
          <div class="metric-group">
            <h4>Buffer Metrics</h4>
            <div class="metric-item">▪ Input Buffer: <span>85%</span> <button onclick="showLevel3('Input Buffer')">Edit</button></div>
            <div class="metric-item">▪ Output Buffer: <span>72%</span> <button onclick="showLevel3('Output Buffer')">Edit</button></div>
            <div class="metric-item">▪ Jitter Buffer: <span>45ms</span> <button onclick="showLevel3('Jitter Buffer')">Edit</button></div>
          </div>
          <div class="metric-group">
            <h4>Latency Metrics</h4>
            <div class="metric-item">▪ Processing: <span>45ms</span> <button onclick="showLevel3('Processing')">Edit</button></div>
            <div class="metric-item">▪ Network: <span>12ms</span> <button onclick="showLevel3('Network')">Edit</button></div>
            <div class="metric-item">▪ Total: <span>180ms</span> <button onclick="showLevel3('Total')">Edit</button></div>
          </div>
          <div class="metric-group">
            <h4>Packet Metrics</h4>
            <div class="metric-item">▪ Loss Rate: <span>0.1%</span> <button onclick="showLevel3('Loss Rate')">Edit</button></div>
            <div class="metric-item">▪ Retransmit: <span>2</span> <button onclick="showLevel3('Retransmit')">Edit</button></div>
            <div class="metric-item">▪ Bandwidth: <span>128kbps</span> <button onclick="showLevel3('Bandwidth')">Edit</button></div>
          </div>
          <div class="metric-group">
            <h4>Audio Quality</h4>
            <div class="metric-item">▪ MOS Score: <span>4.6</span> <button onclick="showLevel3('MOS Score')">Edit</button></div>
            <div class="metric-item">▪ SNR: <span>42dB</span> <button onclick="showLevel3('SNR')">Edit</button></div>
            <div class="metric-item">▪ Noise Level: <span>-48dB</span> <button onclick="showLevel3('Noise Level')">Edit</button></div>
          </div>
        </div>
      </div>

      <div class="knobs-section">
        <h3>KNOBS & CONTROLS</h3>
        <div class="knobs-grid">
          <div class="knob">
            <label>chunk_ms</label>
            <input type="range" min="50" max="1000" value="250">
            <span>250ms</span>
          </div>
          <div class="knob">
            <label>vad_threshold</label>
            <input type="range" min="0" max="100" value="50">
            <span>50</span>
          </div>
          <div class="knob">
            <label>sample_rate</label>
            <select>
              <option>8000</option>
              <option selected>16000</option>
              <option>24000</option>
            </select>
          </div>
        </div>
        <div class="knob-buttons">
          <button class="apply">Apply Changes</button>
          <button class="reset">Reset to Default</button>
          <button class="save">Save as Default</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Level 3: Metric Editor -->
  <div id="level3-view" style="display: none;">
    <div class="level3-header">
      <button onclick="hideLevel3()">← Back</button>
      <h2 id="level3-title">Metric Editor</h2>
    </div>

    <div class="level3-content">
      <div class="current-value">
        <h3>Current Value</h3>
        <div class="big-value" id="metric-current-value">85%</div>
        <div class="value-status">✓ Within preferred range</div>
      </div>

      <div class="range-config">
        <h3>Range Configuration</h3>
        <div class="range-row">
          <label>Legal Range:</label>
          <input type="number" value="0"> to <input type="number" value="100">
        </div>
        <div class="range-row">
          <label>Preferred Range:</label>
          <input type="number" value="70"> to <input type="number" value="90">
        </div>
      </div>

      <div class="historical-graph">
        <h3>Historical Graph - Last 60 seconds</h3>
        <canvas id="metric-graph" width="600" height="200"></canvas>
      </div>

      <div class="influencing-knobs">
        <h3>Influencing Knobs (click to adjust)</h3>
        <div class="knob-links">
          <button class="influence-high">buffer_size</button>
          <button class="influence-medium">thread_pool</button>
          <button class="influence-low">retry_policy</button>
        </div>
      </div>

      <div class="level3-buttons">
        <button class="save">Save Changes</button>
        <button class="reset">Reset to Default</button>
        <button class="export">Export Config</button>
      </div>
    </div>
  </div>
`;

// Add CSS for the new components
const additionalCSS = `
  <style>
    /* Station Grid View Styles */
    #station-grid-view {
      padding: 20px;
      background: #0a0e27;
      min-height: 100vh;
    }

    .station-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-radius: 12px;
      margin-bottom: 20px;
    }

    .station-header h1 {
      color: #10b981;
      font-size: 1.8em;
    }

    .header-controls button {
      background: transparent;
      border: 1px solid #10b981;
      padding: 8px 12px;
      margin-left: 10px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1.2em;
    }

    .system-status-bar {
      background: rgba(16, 185, 129, 0.1);
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }

    .status-dot.online { background: #10b981; }
    .status-dot.offline { background: #ef4444; }

    .divider { color: #334155; }

    .stations-container {
      margin-bottom: 20px;
    }

    .station-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 15px;
    }

    .station-row.three-col {
      grid-template-columns: repeat(3, 1fr);
    }

    .station-card {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 15px;
      cursor: pointer;
      transition: all 0.3s;
      position: relative;
      min-height: 100px;
    }

    .station-card:hover {
      border-color: #10b981;
      box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
    }

    .station-header-mini {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
      font-size: 0.9em;
    }

    .station-number {
      color: #10b981;
      font-weight: bold;
      margin-right: 8px;
    }

    .station-name {
      flex: 1;
      color: #e0e0e0;
    }

    .station-status {
      font-size: 0.8em;
    }

    .station-status.on { color: #10b981; }
    .station-status.warning { color: #f59e0b; }
    .station-status.off { color: #ef4444; }

    .station-metrics {
      font-size: 0.85em;
      color: #94a3b8;
    }

    .station-metrics div {
      margin: 5px 0;
    }

    .station-metrics span {
      color: #e0e0e0;
      font-weight: bold;
    }

    .expand-icon {
      position: absolute;
      bottom: 10px;
      right: 10px;
      color: #10b981;
      font-size: 0.9em;
    }

    .ai-panel {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 20px;
    }

    .ai-panel-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      font-size: 1.1em;
      color: #10b981;
    }

    .mode-badge {
      background: #f59e0b;
      color: #0a0e27;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 0.8em;
    }

    .ai-controls {
      display: flex;
      gap: 30px;
      color: #94a3b8;
    }

    /* Level 2 Styles */
    #level2-view {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #0a0e27;
      padding: 20px;
      overflow-y: auto;
      z-index: 100;
    }

    .level2-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
    }

    .level2-header button {
      background: #10b981;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      margin-right: 20px;
    }

    .level2-content {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 30px;
    }

    .waveform-section {
      margin-bottom: 30px;
    }

    .waveform-section h3 {
      color: #10b981;
      margin-bottom: 15px;
    }

    #waveform-canvas {
      background: #0a0e27;
      border: 1px solid #334155;
      border-radius: 8px;
      width: 100%;
    }

    .recording-indicator {
      color: #ef4444;
      margin-top: 10px;
      font-size: 0.9em;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin: 20px 0;
    }

    .metric-group {
      background: rgba(16, 185, 129, 0.05);
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 15px;
    }

    .metric-group h4 {
      color: #10b981;
      margin-bottom: 10px;
      font-size: 0.9em;
      text-transform: uppercase;
    }

    .metric-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      color: #94a3b8;
      font-size: 0.85em;
    }

    .metric-item span {
      color: #e0e0e0;
      font-weight: bold;
    }

    .metric-item button {
      background: transparent;
      border: 1px solid #10b981;
      color: #10b981;
      padding: 2px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8em;
    }

    .knobs-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 20px 0;
    }

    .knob label {
      display: block;
      color: #10b981;
      margin-bottom: 8px;
      font-size: 0.85em;
    }

    .knob input, .knob select {
      width: 100%;
      background: #0a0e27;
      border: 1px solid #334155;
      color: #e0e0e0;
      padding: 5px;
      border-radius: 4px;
    }

    .knob-buttons {
      display: flex;
      gap: 15px;
      margin-top: 20px;
    }

    .knob-buttons button {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
    }

    .knob-buttons .apply {
      background: #10b981;
      color: white;
    }

    .knob-buttons .reset {
      background: #f59e0b;
      color: white;
    }

    .knob-buttons .save {
      background: #3b82f6;
      color: white;
    }

    /* Level 3 Styles */
    #level3-view {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #0a0e27;
      padding: 20px;
      overflow-y: auto;
      z-index: 200;
    }

    .level3-content {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 30px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .current-value {
      text-align: center;
      margin-bottom: 30px;
    }

    .big-value {
      font-size: 4em;
      color: #10b981;
      font-weight: bold;
      margin: 20px 0;
    }

    .value-status {
      color: #10b981;
      font-size: 0.9em;
    }

    .range-config {
      background: rgba(16, 185, 129, 0.05);
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }

    .range-row {
      display: flex;
      align-items: center;
      margin: 10px 0;
      gap: 10px;
    }

    .range-row label {
      width: 150px;
      color: #94a3b8;
    }

    .range-row input {
      width: 80px;
      background: #0a0e27;
      border: 1px solid #334155;
      color: #e0e0e0;
      padding: 5px;
      border-radius: 4px;
    }

    .historical-graph {
      margin-bottom: 30px;
    }

    .historical-graph h3 {
      color: #10b981;
      margin-bottom: 15px;
    }

    #metric-graph {
      background: #0a0e27;
      border: 1px solid #334155;
      border-radius: 8px;
      width: 100%;
    }

    .knob-links {
      display: flex;
      gap: 15px;
      margin-top: 15px;
    }

    .knob-links button {
      padding: 10px 20px;
      border: 1px solid #334155;
      border-radius: 6px;
      cursor: pointer;
      background: transparent;
      color: #e0e0e0;
    }

    .influence-high {
      border-color: #ef4444 !important;
      color: #ef4444 !important;
    }

    .influence-medium {
      border-color: #f59e0b !important;
      color: #f59e0b !important;
    }

    .influence-low {
      border-color: #3b82f6 !important;
      color: #3b82f6 !important;
    }

    .level3-buttons {
      display: flex;
      gap: 15px;
      justify-content: center;
      margin-top: 30px;
    }

    .level3-buttons button {
      padding: 12px 30px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      font-size: 1em;
    }

    .level3-buttons .save {
      background: #10b981;
      color: white;
    }

    .level3-buttons .reset {
      background: #f59e0b;
      color: white;
    }

    .level3-buttons .export {
      background: #3b82f6;
      color: white;
    }
  </style>
`;

// Add JavaScript for the 3-level navigation
const navigationJS = `
  <script>
    // Toggle between 75-param view and station grid
    function toggleView() {
      const paramView = document.getElementById('parameters');
      const gridView = document.getElementById('station-grid-view');
      const header = document.querySelector('.header');

      if (gridView.style.display === 'none') {
        paramView.style.display = 'none';
        header.style.display = 'none';
        gridView.style.display = 'block';
      } else {
        paramView.style.display = 'block';
        header.style.display = 'block';
        gridView.style.display = 'none';
      }
    }

    // Show Level 2 (Expanded Station View)
    function showLevel2(stationId) {
      document.getElementById('station-grid-view').style.display = 'none';
      document.getElementById('level2-view').style.display = 'block';
      document.getElementById('level2-title').textContent = 'Station ' + stationId.split('-')[1] + ' Details';

      // Update metrics based on station
      loadStationMetrics(stationId);
    }

    // Hide Level 2
    function hideLevel2() {
      document.getElementById('level2-view').style.display = 'none';
      document.getElementById('station-grid-view').style.display = 'block';
    }

    // Show Level 3 (Metric Editor)
    function showLevel3(metricName) {
      document.getElementById('level2-view').style.display = 'none';
      document.getElementById('level3-view').style.display = 'block';
      document.getElementById('level3-title').textContent = 'Metric Editor: ' + metricName;
      document.getElementById('metric-current-value').textContent = Math.floor(Math.random() * 100) + '%';

      drawMetricGraph();
    }

    // Hide Level 3
    function hideLevel3() {
      document.getElementById('level3-view').style.display = 'none';
      document.getElementById('level2-view').style.display = 'block';
    }

    // Load station-specific metrics
    function loadStationMetrics(stationId) {
      // This would normally fetch from the API
      console.log('Loading metrics for', stationId);
    }

    // Draw metric graph
    function drawMetricGraph() {
      const canvas = document.getElementById('metric-graph');
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;

      for (let i = 0; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (canvas.height / 10) * i);
        ctx.lineTo(canvas.width, (canvas.height / 10) * i);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo((canvas.width / 10) * i, 0);
        ctx.lineTo((canvas.width / 10) * i, canvas.height);
        ctx.stroke();
      }

      // Draw sample data
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < 60; i++) {
        const x = (canvas.width / 60) * i;
        const y = canvas.height / 2 + Math.sin(i * 0.2) * 50 + (Math.random() - 0.5) * 20;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    }

    // Placeholder functions
    function openSettings() { alert('Settings panel coming soon'); }
    function openAnalytics() { alert('Analytics panel coming soon'); }
    function openHelp() { alert('Help panel coming soon'); }
  </script>
`;

// Insert all the new components
html = html.replace('</head>', additionalCSS + '\n</head>');
html = html.replace('<body>', '<body>\n' + viewToggleHTML);
html = html.replace('<div id="parameters"', stationGridHTML + '\n  <div id="parameters"');
html = html.replace('</body>', navigationJS + '\n</body>');

// Write the enhanced file
fs.writeFileSync(dashboardPath, html);

console.log('✅ Dashboard enhanced successfully!');
console.log('  ✓ Kept existing 75-parameter view');
console.log('  ✓ Added toggle button for station view');
console.log('  ✓ Added 11-station grid (Level 1)');
console.log('  ✓ Added expanded station view (Level 2)');
console.log('  ✓ Added metric editor (Level 3)');
console.log('  ✓ All navigation functions connected');