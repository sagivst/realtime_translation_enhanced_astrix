#!/usr/bin/env node

// Script to ONLY add stations 3-11 without changing the UI
const fs = require('fs');

const dashboardPath = '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html';

// Read the dashboard
let content = fs.readFileSync(dashboardPath, 'utf8');

// Find where Station 2 ends (after its closing </div>)
const station2EndPattern = /(<div class="monitoring-box--large">[\s\S]*?STATION 2: UDP TRANSMIT[\s\S]*?<\/div>\s*<\/div>)/;
const match = content.match(station2EndPattern);

if (!match) {
  console.log('Could not find Station 2 block');
  process.exit(1);
}

// HTML for stations 3-11 in the EXACT SAME FORMAT as stations 1 and 2
const newStations = `

    <!-- STATION 3 -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 3: STT PROCESSING</div>
        <div class="status-badge good">ONLINE</div>
      </div>

      <div class="box-value good" id="station3-buffer-value">
        45.0<span class="box-unit">%</span>
      </div>

      <div class="bar-container">
        <div class="bar-range-bg">
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>
          <div class="bar-optimal-marker" style="left: 50%;"></div>
          <div class="bar-current-value good" id="station3-buffer-bar" style="width: 45%;">
            <div class="bar-current-indicator"></div>
          </div>
        </div>
        <div class="bar-labels">
          <span>0%</span>
          <span class="bar-label-operational">BUFFER: 20-80%</span>
          <span>100%</span>
        </div>
      </div>

      <div class="box-path">station-3.stt-proc</div>
      <button class="expand-btn" onclick="showLevel2('station-3')">EXPAND ⛶</button>
    </div>

    <!-- STATION 4 -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 4: DEEPGRAM API</div>
        <div class="status-badge good">ONLINE</div>
      </div>

      <div class="box-value good" id="station4-latency-value">
        180<span class="box-unit">ms</span>
      </div>

      <div class="bar-container">
        <div class="bar-range-bg">
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>
          <div class="bar-optimal-marker" style="left: 50%;"></div>
          <div class="bar-current-value good" id="station4-latency-bar" style="width: 36%;">
            <div class="bar-current-indicator"></div>
          </div>
        </div>
        <div class="bar-labels">
          <span>0ms</span>
          <span class="bar-label-operational">LATENCY: 50-300ms</span>
          <span>500ms</span>
        </div>
      </div>

      <div class="box-path">station-4.deepgram</div>
      <button class="expand-btn" onclick="showLevel2('station-4')">EXPAND ⛶</button>
    </div>

    <!-- STATION 5 -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 5: TRANSLATION PREP</div>
        <div class="status-badge good">ONLINE</div>
      </div>

      <div class="box-value good" id="station5-throughput-value">
        12<span class="box-unit">/s</span>
      </div>

      <div class="bar-container">
        <div class="bar-range-bg">
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>
          <div class="bar-optimal-marker" style="left: 50%;"></div>
          <div class="bar-current-value good" id="station5-throughput-bar" style="width: 60%;">
            <div class="bar-current-indicator"></div>
          </div>
        </div>
        <div class="bar-labels">
          <span>0</span>
          <span class="bar-label-operational">THROUGHPUT</span>
          <span>20/s</span>
        </div>
      </div>

      <div class="box-path">station-5.trans-prep</div>
      <button class="expand-btn" onclick="showLevel2('station-5')">EXPAND ⛶</button>
    </div>

    <!-- STATION 6 -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 6: DEEPL API</div>
        <div class="status-badge good">ONLINE</div>
      </div>

      <div class="box-value good" id="station6-latency-value">
        85<span class="box-unit">ms</span>
      </div>

      <div class="bar-container">
        <div class="bar-range-bg">
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>
          <div class="bar-optimal-marker" style="left: 50%;"></div>
          <div class="bar-current-value good" id="station6-latency-bar" style="width: 28%;">
            <div class="bar-current-indicator"></div>
          </div>
        </div>
        <div class="bar-labels">
          <span>0ms</span>
          <span class="bar-label-operational">API LATENCY</span>
          <span>300ms</span>
        </div>
      </div>

      <div class="box-path">station-6.deepl</div>
      <button class="expand-btn" onclick="showLevel2('station-6')">EXPAND ⛶</button>
    </div>

    <!-- STATION 7 -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 7: TTS PREP</div>
        <div class="status-badge good">ONLINE</div>
      </div>

      <div class="box-value good" id="station7-processing-value">
        15<span class="box-unit">ms</span>
      </div>

      <div class="bar-container">
        <div class="bar-range-bg">
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>
          <div class="bar-optimal-marker" style="left: 50%;"></div>
          <div class="bar-current-value good" id="station7-processing-bar" style="width: 30%;">
            <div class="bar-current-indicator"></div>
          </div>
        </div>
        <div class="bar-labels">
          <span>0ms</span>
          <span class="bar-label-operational">PROCESSING</span>
          <span>50ms</span>
        </div>
      </div>

      <div class="box-path">station-7.tts-prep</div>
      <button class="expand-btn" onclick="showLevel2('station-7')">EXPAND ⛶</button>
    </div>

    <!-- STATION 8 -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 8: ELEVENLABS TTS</div>
        <div class="status-badge good">ONLINE</div>
      </div>

      <div class="box-value good" id="station8-latency-value">
        220<span class="box-unit">ms</span>
      </div>

      <div class="bar-container">
        <div class="bar-range-bg">
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>
          <div class="bar-optimal-marker" style="left: 50%;"></div>
          <div class="bar-current-value good" id="station8-latency-bar" style="width: 44%;">
            <div class="bar-current-indicator"></div>
          </div>
        </div>
        <div class="bar-labels">
          <span>0ms</span>
          <span class="bar-label-operational">TTS LATENCY</span>
          <span>500ms</span>
        </div>
      </div>

      <div class="box-path">station-8.elevenlabs</div>
      <button class="expand-btn" onclick="showLevel2('station-8')">EXPAND ⛶</button>
    </div>

    <!-- STATION 9 -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 9: STT SERVER TX</div>
        <div class="status-badge good">ONLINE</div>
      </div>

      <div class="box-value good" id="station9-packets-value">
        340<span class="box-unit">/s</span>
      </div>

      <div class="bar-container">
        <div class="bar-range-bg">
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>
          <div class="bar-optimal-marker" style="left: 50%;"></div>
          <div class="bar-current-value good" id="station9-packets-bar" style="width: 68%;">
            <div class="bar-current-indicator"></div>
          </div>
        </div>
        <div class="bar-labels">
          <span>0</span>
          <span class="bar-label-operational">PCM PACKETS</span>
          <span>500/s</span>
        </div>
      </div>

      <div class="box-path">station-9.stt-tx</div>
      <button class="expand-btn" onclick="showLevel2('station-9')">EXPAND ⛶</button>
    </div>

    <!-- STATION 10 -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 10: GATEWAY TX</div>
        <div class="status-badge good">ONLINE</div>
      </div>

      <div class="box-value good" id="station10-packets-value">
        2356<span class="box-unit">/s</span>
      </div>

      <div class="bar-container">
        <div class="bar-range-bg">
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>
          <div class="bar-optimal-marker" style="left: 50%;"></div>
          <div class="bar-current-value good" id="station10-packets-bar" style="width: 78%;">
            <div class="bar-current-indicator"></div>
          </div>
        </div>
        <div class="bar-labels">
          <span>0</span>
          <span class="bar-label-operational">RTP PACKETS</span>
          <span>3000/s</span>
        </div>
      </div>

      <div class="box-path">station-10.gateway-tx</div>
      <button class="expand-btn" onclick="showLevel2('station-10')">EXPAND ⛶</button>
    </div>

    <!-- STATION 11 -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 11: HUME EVI</div>
        <div class="status-badge critical">OFFLINE</div>
      </div>

      <div class="box-value critical" id="station11-status-value">
        DISABLED<span class="box-unit"></span>
      </div>

      <div class="bar-container">
        <div class="bar-range-bg">
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>
          <div class="bar-optimal-marker" style="left: 50%;"></div>
          <div class="bar-current-value critical" id="station11-status-bar" style="width: 0%;">
            <div class="bar-current-indicator"></div>
          </div>
        </div>
        <div class="bar-labels">
          <span>0%</span>
          <span class="bar-label-operational">QUOTA LIMIT</span>
          <span>100%</span>
        </div>
      </div>

      <div class="box-path">station-11.hume-evi</div>
      <button class="expand-btn" onclick="showLevel2('station-11')">EXPAND ⛶</button>
    </div>`;

// Insert the new stations after Station 2
const insertPoint = match.index + match[0].length;
content = content.slice(0, insertPoint) + newStations + content.slice(insertPoint);

// Update grid to 3 columns to fit 11 stations better
content = content.replace(
  /grid-template-columns:\s*repeat\(2,\s*1fr\)/,
  'grid-template-columns: repeat(3, 1fr)'
);

// Add update functions for new stations in the JavaScript section
const updateFunctions = `
    function updateStation3(metrics) {
      const buffer = metrics.buffer?.total || 0;
      const bufferEl = document.getElementById('station3-buffer-value');
      if (bufferEl) bufferEl.innerHTML = buffer.toFixed(1) + '<span class="box-unit">%</span>';
      const bufferBar = document.getElementById('station3-buffer-bar');
      if (bufferBar) bufferBar.style.width = buffer + '%';
    }

    function updateStation4(metrics) {
      const latency = metrics.latency?.avg || 0;
      const latencyEl = document.getElementById('station4-latency-value');
      if (latencyEl) latencyEl.innerHTML = latency.toFixed(0) + '<span class="box-unit">ms</span>';
      const latencyBar = document.getElementById('station4-latency-bar');
      if (latencyBar) latencyBar.style.width = (latency / 500 * 100) + '%';
    }

    function updateStation5(metrics) {
      const throughput = metrics.performance?.throughput || 0;
      const throughputEl = document.getElementById('station5-throughput-value');
      if (throughputEl) throughputEl.innerHTML = throughput.toFixed(0) + '<span class="box-unit">/s</span>';
      const throughputBar = document.getElementById('station5-throughput-bar');
      if (throughputBar) throughputBar.style.width = (throughput / 20 * 100) + '%';
    }

    function updateStation6(metrics) {
      const latency = metrics.latency?.avg || 0;
      const latencyEl = document.getElementById('station6-latency-value');
      if (latencyEl) latencyEl.innerHTML = latency.toFixed(0) + '<span class="box-unit">ms</span>';
      const latencyBar = document.getElementById('station6-latency-bar');
      if (latencyBar) latencyBar.style.width = (latency / 300 * 100) + '%';
    }

    function updateStation7(metrics) {
      const processing = metrics.latency?.processing || 0;
      const processingEl = document.getElementById('station7-processing-value');
      if (processingEl) processingEl.innerHTML = processing.toFixed(0) + '<span class="box-unit">ms</span>';
      const processingBar = document.getElementById('station7-processing-bar');
      if (processingBar) processingBar.style.width = (processing / 50 * 100) + '%';
    }

    function updateStation8(metrics) {
      const latency = metrics.latency?.avg || 0;
      const latencyEl = document.getElementById('station8-latency-value');
      if (latencyEl) latencyEl.innerHTML = latency.toFixed(0) + '<span class="box-unit">ms</span>';
      const latencyBar = document.getElementById('station8-latency-bar');
      if (latencyBar) latencyBar.style.width = (latency / 500 * 100) + '%';
    }

    function updateStation9(metrics) {
      const packets = metrics.packet?.sent || 0;
      const packetsEl = document.getElementById('station9-packets-value');
      if (packetsEl) packetsEl.innerHTML = packets.toFixed(0) + '<span class="box-unit">/s</span>';
      const packetsBar = document.getElementById('station9-packets-bar');
      if (packetsBar) packetsBar.style.width = (packets / 500 * 100) + '%';
    }

    function updateStation10(metrics) {
      const packets = metrics.packet?.sent || 0;
      const packetsEl = document.getElementById('station10-packets-value');
      if (packetsEl) packetsEl.innerHTML = packets.toFixed(0) + '<span class="box-unit">/s</span>';
      const packetsBar = document.getElementById('station10-packets-bar');
      if (packetsBar) packetsBar.style.width = (packets / 3000 * 100) + '%';
    }

    function updateStation11(metrics) {
      const status = metrics.custom?.state || 'DISABLED';
      const statusEl = document.getElementById('station11-status-value');
      if (statusEl) statusEl.innerHTML = status + '<span class="box-unit"></span>';
      const statusBar = document.getElementById('station11-status-bar');
      if (statusBar) statusBar.style.width = '0%';
    }`;

// Add the update functions before the closing script tag
const scriptCloseIndex = content.lastIndexOf('</script>');
content = content.slice(0, scriptCloseIndex) + updateFunctions + '\n  ' + content.slice(scriptCloseIndex);

// Update the dispatcher to handle new stations
content = content.replace(
  'if (stationId === \'station-1\') {',
  `if (stationId === 'station-1') {`
);

const dispatcherAddition = `
      } else if (stationId === 'station-3') {
        updateStation3(metrics);
      } else if (stationId === 'station-4') {
        updateStation4(metrics);
      } else if (stationId === 'station-5') {
        updateStation5(metrics);
      } else if (stationId === 'station-6') {
        updateStation6(metrics);
      } else if (stationId === 'station-7') {
        updateStation7(metrics);
      } else if (stationId === 'station-8') {
        updateStation8(metrics);
      } else if (stationId === 'station-9') {
        updateStation9(metrics);
      } else if (stationId === 'station-10') {
        updateStation10(metrics);
      } else if (stationId === 'station-11') {
        updateStation11(metrics);`;

content = content.replace(
  '} else if (stationId === \'station-2\') {',
  '} else if (stationId === \'station-2\') {'
);

// Find the updateStation2 closing brace and add the new stations
const updateStation2End = content.indexOf('updateStation2(metrics);') + 'updateStation2(metrics);'.length;
const nextBrace = content.indexOf('}', updateStation2End);
content = content.slice(0, nextBrace) + dispatcherAddition + content.slice(nextBrace);

// Write the modified file
fs.writeFileSync(dashboardPath, content);
console.log('✅ Added stations 3-11 to dashboard');
console.log('✅ Kept original UI intact');
console.log('✅ Updated grid to 3 columns');
console.log('✅ Added update functions for all new stations');