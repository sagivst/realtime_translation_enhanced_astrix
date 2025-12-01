#!/usr/bin/env node

const fs = require('fs');

// Read the dashboard file
const dashboardPath = '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html';
let content = fs.readFileSync(dashboardPath, 'utf8');

console.log('Enhancing dashboard with missing stations...');

// 1. Update grid layout from 2 to 4 columns
content = content.replace(
    /grid-template-columns:\s*repeat\(2,\s*1fr\)/g,
    'grid-template-columns: repeat(4, 1fr)'
);
console.log('✓ Updated grid layout to 4 columns');

// 2. Find where to insert new stations (after station 2)
const station2EndPattern = /<button class="expand-btn" onclick="showLevel2\('station-2'\)">EXPAND ⛶<\/button>\s*<\/div>/;
const station2Match = content.match(station2EndPattern);

if (station2Match) {
    // Define the new stations HTML
    const newStationsHTML = `
    </div>

    <!-- STATION 3: STT Processing -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 3: STT PROCESSING</div>
        <div class="status-badge good" id="station3-status">OFFLINE</div>
      </div>
      <div class="box-value good" id="station3-value">0.0<span class="box-unit">ms</span></div>
      <div class="bar-container">
        <div class="bar-range-bg">
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>
        </div>
        <div class="bar-fill good" id="station3-bar" style="width: 0%;"></div>
        <div class="bar-indicator" id="station3-indicator" style="left: 0%;"></div>
      </div>
      <div class="box-path">station-3.stt</div>
      <button class="expand-btn" onclick="showLevel2('station-3')">EXPAND ⛶</button>
    </div>

    <!-- STATION 4: Deepgram API -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 4: DEEPGRAM API</div>
        <div class="status-badge good" id="station4-status">OFFLINE</div>
      </div>
      <div class="box-value good" id="station4-value">0.0<span class="box-unit">ms</span></div>
      <div class="bar-container">
        <div class="bar-range-bg">
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>
        </div>
        <div class="bar-fill good" id="station4-bar" style="width: 0%;"></div>
        <div class="bar-indicator" id="station4-indicator" style="left: 0%;"></div>
      </div>
      <div class="box-path">station-4.deepgram</div>
      <button class="expand-btn" onclick="showLevel2('station-4')">EXPAND ⛶</button>
    </div>

    <!-- STATION 5: Translation Prep -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 5: TRANSLATION PREP</div>
        <div class="status-badge good" id="station5-status">OFFLINE</div>
      </div>
      <div class="box-value good" id="station5-value">0<span class="box-unit">ops/s</span></div>
      <div class="bar-container">
        <div class="bar-range-bg">
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>
        </div>
        <div class="bar-fill good" id="station5-bar" style="width: 0%;"></div>
        <div class="bar-indicator" id="station5-indicator" style="left: 0%;"></div>
      </div>
      <div class="box-path">station-5.translate-prep</div>
      <button class="expand-btn" onclick="showLevel2('station-5')">EXPAND ⛶</button>
    </div>

    <!-- STATION 6: DeepL API -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 6: DEEPL API</div>
        <div class="status-badge good" id="station6-status">OFFLINE</div>
      </div>
      <div class="box-value good" id="station6-value">0.0<span class="box-unit">ms</span></div>
      <div class="bar-container">
        <div class="bar-range-bg">
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>
        </div>
        <div class="bar-fill good" id="station6-bar" style="width: 0%;"></div>
        <div class="bar-indicator" id="station6-indicator" style="left: 0%;"></div>
      </div>
      <div class="box-path">station-6.deepl</div>
      <button class="expand-btn" onclick="showLevel2('station-6')">EXPAND ⛶</button>
    </div>

    <!-- STATION 7: TTS Prep -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 7: TTS PREP</div>
        <div class="status-badge good" id="station7-status">OFFLINE</div>
      </div>
      <div class="box-value good" id="station7-value">0<span class="box-unit">ops/s</span></div>
      <div class="bar-container">
        <div class="bar-range-bg">
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>
        </div>
        <div class="bar-fill good" id="station7-bar" style="width: 0%;"></div>
        <div class="bar-indicator" id="station7-indicator" style="left: 0%;"></div>
      </div>
      <div class="box-path">station-7.tts-prep</div>
      <button class="expand-btn" onclick="showLevel2('station-7')">EXPAND ⛶</button>
    </div>

    <!-- STATION 8: ElevenLabs TTS -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 8: ELEVENLABS TTS</div>
        <div class="status-badge good" id="station8-status">OFFLINE</div>
      </div>
      <div class="box-value good" id="station8-value">0.0<span class="box-unit">ms</span></div>
      <div class="bar-container">
        <div class="bar-range-bg">
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>
        </div>
        <div class="bar-fill good" id="station8-bar" style="width: 0%;"></div>
        <div class="bar-indicator" id="station8-indicator" style="left: 0%;"></div>
      </div>
      <div class="box-path">station-8.elevenlabs</div>
      <button class="expand-btn" onclick="showLevel2('station-8')">EXPAND ⛶</button>
    </div>

    <!-- STATION 9: STT Server TX -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 9: STT SERVER TX</div>
        <div class="status-badge good" id="station9-status">OFFLINE</div>
      </div>
      <div class="box-value good" id="station9-value">0<span class="box-unit">pkts</span></div>
      <div class="bar-container">
        <div class="bar-range-bg">
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>
        </div>
        <div class="bar-fill good" id="station9-bar" style="width: 0%;"></div>
        <div class="bar-indicator" id="station9-indicator" style="left: 0%;"></div>
      </div>
      <div class="box-path">station-9.stt-tx</div>
      <button class="expand-btn" onclick="showLevel2('station-9')">EXPAND ⛶</button>
    </div>

    <!-- STATION 10: Gateway TX -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 10: GATEWAY TX</div>
        <div class="status-badge good" id="station10-status">OFFLINE</div>
      </div>
      <div class="box-value good" id="station10-value">0<span class="box-unit">pkts</span></div>
      <div class="bar-container">
        <div class="bar-range-bg">
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>
        </div>
        <div class="bar-fill good" id="station10-bar" style="width: 0%;"></div>
        <div class="bar-indicator" id="station10-indicator" style="left: 0%;"></div>
      </div>
      <div class="box-path">station-10.gateway-tx</div>
      <button class="expand-btn" onclick="showLevel2('station-10')">EXPAND ⛶</button>
    </div>

    <!-- STATION 11: Hume EVI -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 11: HUME EVI</div>
        <div class="status-badge critical" id="station11-status">DISABLED</div>
      </div>
      <div class="box-value good" id="station11-value">--<span class="box-unit"></span></div>
      <div class="bar-container">
        <div class="bar-range-bg">
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>
        </div>
        <div class="bar-fill good" id="station11-bar" style="width: 0%;"></div>
        <div class="bar-indicator" id="station11-indicator" style="left: 0%;"></div>
      </div>
      <div class="box-path">station-11.hume</div>
      <button class="expand-btn" onclick="showLevel2('station-11')">EXPAND ⛶</button>`;

    // Replace the closing tag with new stations
    content = content.replace(station2EndPattern, station2Match[0] + newStationsHTML);
    console.log('✓ Added stations 3-11 to the grid');
}

// 3. Add the update functions for new stations
const updateFunctionPattern = /function updateStation2\(metrics\) {[\s\S]*?}/;
const updateMatch = content.match(updateFunctionPattern);

if (updateMatch) {
    const newUpdateFunctions = `

    function updateStation3(metrics) {
      if (!metrics) return;
      updateValue('station3-value', metrics.avgLatency || 0, 'ms');
      updateBar('station3', metrics.avgLatency || 0, 0, 500);
    }

    function updateStation4(metrics) {
      if (!metrics) return;
      updateValue('station4-value', metrics.avgLatency || 0, 'ms');
      updateBar('station4', metrics.avgLatency || 0, 0, 500);
    }

    function updateStation5(metrics) {
      if (!metrics) return;
      updateValue('station5-value', metrics.processRate || 0, 'ops/s');
      updateBar('station5', metrics.processRate || 0, 0, 1000);
    }

    function updateStation6(metrics) {
      if (!metrics) return;
      updateValue('station6-value', metrics.avgLatency || 0, 'ms');
      updateBar('station6', metrics.avgLatency || 0, 0, 500);
    }

    function updateStation7(metrics) {
      if (!metrics) return;
      updateValue('station7-value', metrics.processRate || 0, 'ops/s');
      updateBar('station7', metrics.processRate || 0, 0, 1000);
    }

    function updateStation8(metrics) {
      if (!metrics) return;
      updateValue('station8-value', metrics.avgLatency || 0, 'ms');
      updateBar('station8', metrics.avgLatency || 0, 0, 500);
    }

    function updateStation9(metrics) {
      if (!metrics) return;
      updateValue('station9-value', metrics.packetsTx || 0, 'pkts');
      updateBar('station9', metrics.packetsTx || 0, 0, 10000);
    }

    function updateStation10(metrics) {
      if (!metrics) return;
      updateValue('station10-value', metrics.packetsTx || 0, 'pkts');
      updateBar('station10', metrics.packetsTx || 0, 0, 10000);
    }

    function updateStation11(metrics) {
      if (!metrics) return;
      // Hume is disabled, show placeholder
      document.getElementById('station11-value').innerHTML = '--<span class="box-unit"></span>';
    }`;

    content = content.replace(updateFunctionPattern, updateMatch[0] + newUpdateFunctions);
    console.log('✓ Added update functions for new stations');
}

// 4. Update the station display dispatcher
const dispatcherPattern = /} else if \(stationId === 'station-2'\) {[\s\S]*?updateStation2\(metrics\);/;
const dispatcherMatch = content.match(dispatcherPattern);

if (dispatcherMatch) {
    const newDispatcher = `
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

    content = content.replace(dispatcherPattern, dispatcherMatch[0] + newDispatcher);
    console.log('✓ Updated station dispatcher');
}

// Write the enhanced content back
fs.writeFileSync(dashboardPath, content);
console.log('✅ Dashboard enhanced successfully!');
console.log('All 11 stations are now configured.');