#!/usr/bin/env node

// Script to modify dashboard to use object-based station generation
const fs = require('fs');

const dashboardPath = process.argv[2] || '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html';

// Read the current dashboard
let content = fs.readFileSync(dashboardPath, 'utf8');

// Create the stations configuration object
const stationsConfig = `
  <script>
    // ========================================
    // STATIONS CONFIGURATION OBJECT
    // ========================================
    const STATIONS = {
      'station-1': {
        name: 'ARI RECEIVE',
        path: 'station-1.ari-rx',
        type: 'voice',
        status: 'ONLINE',
        statusClass: 'good',
        value: 45.2,
        unit: '%',
        label: 'BUFFER: 20-80%',
        parameters: ['buffer.total', 'latency.avg', 'packet.rx', 'audioQuality.snr']
      },
      'station-2': {
        name: 'UDP TRANSMIT',
        path: 'station-2.udp-tx',
        type: 'voice',
        status: 'WARNING',
        statusClass: 'warning',
        value: 78.0,
        unit: '%',
        label: 'BUFFER: 20-80%',
        parameters: ['buffer.total', 'latency.avg', 'packet.lossRate']
      },
      'station-3': {
        name: 'STT PROCESSING',
        path: 'station-3.stt-proc',
        type: 'voice',
        status: 'ONLINE',
        statusClass: 'good',
        value: 210,
        unit: 'ms',
        label: 'LATENCY: <250ms',
        parameters: ['latency.avg', 'buffer.input', 'buffer.output', 'custom.accuracy']
      },
      'station-4': {
        name: 'DEEPGRAM API',
        path: 'station-4.deepgram',
        type: 'voice',
        status: 'ONLINE',
        statusClass: 'good',
        value: 180,
        unit: 'ms',
        label: 'API LATENCY',
        parameters: ['latency.avg', 'latency.peak', 'performance.cpu', 'custom.successRate']
      },
      'station-5': {
        name: 'TRANSLATION PREP',
        path: 'station-5.trans-prep',
        type: 'text',
        status: 'ONLINE',
        statusClass: 'good',
        value: 12,
        unit: '/s',
        label: 'THROUGHPUT',
        parameters: ['performance.cpu', 'performance.memory', 'custom.totalProcessed']
      },
      'station-6': {
        name: 'DEEPL API',
        path: 'station-6.deepl',
        type: 'text',
        status: 'ONLINE',
        statusClass: 'good',
        value: 85,
        unit: 'ms',
        label: 'API LATENCY',
        parameters: ['latency.avg', 'latency.peak', 'performance.cpu', 'custom.successRate']
      },
      'station-7': {
        name: 'TTS PREP',
        path: 'station-7.tts-prep',
        type: 'text',
        status: 'ONLINE',
        statusClass: 'good',
        value: 15,
        unit: 'ms',
        label: 'PROCESSING',
        parameters: ['performance.cpu', 'performance.memory', 'custom.processSpeed']
      },
      'station-8': {
        name: 'ELEVENLABS TTS',
        path: 'station-8.elevenlabs',
        type: 'voice',
        status: 'ONLINE',
        statusClass: 'good',
        value: 220,
        unit: 'ms',
        label: 'TTS LATENCY',
        parameters: ['latency.avg', 'audio.sampleRate', 'audio.bitDepth', 'custom.voiceQuality']
      },
      'station-9': {
        name: 'STT SERVER TX',
        path: 'station-9.stt-tx',
        type: 'voice',
        status: 'ONLINE',
        statusClass: 'good',
        value: 340,
        unit: '/s',
        label: 'PCM PACKETS',
        parameters: ['packet.tx', 'packet.dropped', 'buffer.output', 'latency.avg']
      },
      'station-10': {
        name: 'GATEWAY TX',
        path: 'station-10.gateway-tx',
        type: 'voice',
        status: 'ONLINE',
        statusClass: 'good',
        value: 2356,
        unit: '/s',
        label: 'RTP PACKETS',
        parameters: ['packet.tx', 'packet.dropped', 'packet.lossRate', 'latency.avg']
      },
      'station-11': {
        name: 'HUME EVI',
        path: 'station-11.hume-evi',
        type: 'voice',
        status: 'OFFLINE',
        statusClass: 'critical',
        value: 0,
        unit: '',
        label: 'QUOTA LIMIT',
        parameters: ['custom.state', 'custom.lastActivity', 'custom.warnings']
      }
    };

    // Function to generate station HTML
    function generateStationHTML(stationId) {
      const station = STATIONS[stationId];
      return \`
        <div class="monitoring-box--large">
          <div class="box-header">
            <div class="box-title">STATION \${stationId.split('-')[1]}: \${station.name}</div>
            <div class="status-badge \${station.statusClass}">\${station.status}</div>
          </div>

          <div class="box-value \${station.statusClass}" id="\${stationId}-value">
            \${station.value}<span class="box-unit">\${station.unit}</span>
          </div>

          <div class="bar-container">
            <div class="bar-range-bg">
              <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>
              <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>
              <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>
              <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>
              <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>
              <div class="bar-optimal-marker" style="left: 50%;"></div>
              <div class="bar-current-value \${station.statusClass}" id="\${stationId}-bar" style="width: \${Math.min(station.value, 100)}%;">
                <div class="bar-current-indicator"></div>
              </div>
            </div>
            <div class="bar-labels">
              <span>0%</span>
              <span class="bar-label-operational">\${station.label}</span>
              <span>100%</span>
            </div>
          </div>

          <div class="box-path">\${station.path}</div>
          <button class="expand-btn" onclick="showLevel2('\${stationId}')">EXPAND ⛶</button>
        </div>
      \`;
    }

    // Generate all stations on page load
    document.addEventListener('DOMContentLoaded', function() {
      const level1Container = document.getElementById('level1');
      if (level1Container) {
        // Clear existing hardcoded content
        level1Container.innerHTML = '';

        // Generate all 11 stations
        for (const stationId in STATIONS) {
          level1Container.innerHTML += generateStationHTML(stationId);
        }
      }

      // Update grid to accommodate 11 stations (3x4 grid)
      const style = document.createElement('style');
      style.textContent = \`
        .grid-level1 {
          grid-template-columns: repeat(4, 1fr) !important;
        }

        @media (max-width: 1600px) {
          .grid-level1 {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }

        @media (max-width: 1200px) {
          .grid-level1 {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        /* Station type badges */
        .station-type-badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 2px;
          font-size: 9px;
          text-transform: uppercase;
          margin-left: 8px;
        }

        .badge-voice {
          background: rgba(51, 181, 229, 0.2);
          color: #33b5e5;
          border: 1px solid rgba(51, 181, 229, 0.3);
        }

        .badge-text {
          background: rgba(255, 187, 51, 0.2);
          color: #ffbb33;
          border: 1px solid rgba(255, 187, 51, 0.3);
        }
      \`;
      document.head.appendChild(style);
    });

    // Update station function for real-time data
    function updateStation(stationId, metrics) {
      const station = STATIONS[stationId];
      if (!station) return;

      // Update value
      const valueEl = document.getElementById(stationId + '-value');
      if (valueEl && metrics.value !== undefined) {
        valueEl.innerHTML = metrics.value + '<span class="box-unit">' + station.unit + '</span>';
      }

      // Update bar
      const barEl = document.getElementById(stationId + '-bar');
      if (barEl && metrics.value !== undefined) {
        barEl.style.width = Math.min(metrics.value, 100) + '%';
      }

      // Update status
      const statusEl = document.querySelector(\`#level1 .monitoring-box--large:has(#\${stationId}-value) .status-badge\`);
      if (statusEl && metrics.status) {
        statusEl.textContent = metrics.status;
        statusEl.className = 'status-badge ' + metrics.statusClass;
      }
    }

    // Modified showLevel2 function to work with all stations
    function showLevel2(stationId) {
      const station = STATIONS[stationId];
      if (!station) return;

      document.getElementById('level1').style.display = 'none';
      document.getElementById('level2').style.display = 'block';

      const titleEl = document.getElementById('level2-station-title');
      if (titleEl) {
        titleEl.textContent = \`STATION \${stationId.split('-')[1]}: \${station.name} - ALL PARAMETERS\`;
      }

      // Generate Level 2 parameters for this station
      generateLevel2Parameters(stationId);
    }

    // Generate Level 2 parameters dynamically
    function generateLevel2Parameters(stationId) {
      const station = STATIONS[stationId];
      const container = document.querySelector('#level2 .grid-level2');
      if (!container) return;

      container.innerHTML = ''; // Clear existing

      // Generate parameter boxes for this station
      station.parameters.forEach(param => {
        const paramPath = \`\${station.path}.\${param}\`;
        const paramBox = \`
          <div class="monitoring-box--small editable" onclick="showEdit('\${param.split('.')[0]}', '\${paramPath}')">
            <div class="box-header">
              <div class="box-title">\${param.toUpperCase()}</div>
              <div class="status-badge good">NORMAL</div>
            </div>
            <div class="box-value good">
              0<span class="box-unit">ms</span>
            </div>
            <div class="box-path">\${paramPath}</div>
            <button class="expand-btn" onclick="event.stopPropagation(); showEdit('\${param.split('.')[0]}', '\${paramPath}')">EDIT ✏</button>
          </div>
        \`;
        container.innerHTML += paramBox;
      });
    }
  </script>
`;

// Find where to insert the stations configuration
// Look for the closing </head> tag and insert before it
const headCloseIndex = content.indexOf('</head>');
if (headCloseIndex !== -1) {
  content = content.slice(0, headCloseIndex) + stationsConfig + '\n' + content.slice(headCloseIndex);
  console.log('✓ Added stations configuration object');
} else {
  console.log('❌ Could not find </head> tag');
}

// Comment out the existing hardcoded stations in Level 1
content = content.replace(
  /<!-- ===== LEVEL 1: LARGE STATION BOXES ===== -->/,
  '<!-- ===== LEVEL 1: LARGE STATION BOXES ===== -->\n  <!-- Stations are now dynamically generated from STATIONS object -->'
);

// Comment out hardcoded station HTML blocks
const startMarker = '<div class="monitoring-box--large">';
const endMarker = '</div>\n    </div>';
let startIndex = content.indexOf(startMarker);
let endIndex = content.indexOf(endMarker, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  // Find the second station block
  let secondStart = content.indexOf(startMarker, endIndex);
  let secondEnd = content.indexOf(endMarker, secondStart);

  if (secondStart !== -1 && secondEnd !== -1) {
    // Comment out both station blocks
    const beforeStations = content.slice(0, startIndex);
    const afterStations = content.slice(secondEnd + endMarker.length);
    const stationsHTML = content.slice(startIndex, secondEnd + endMarker.length);

    content = beforeStations +
              '<!-- Original hardcoded stations - now replaced with dynamic generation\n' +
              stationsHTML +
              '\n    -->' +
              afterStations;

    console.log('✓ Commented out hardcoded station HTML');
  }
}

// Write the modified content
fs.writeFileSync(dashboardPath, content);
console.log('✓ Dashboard modified to use object-based station generation');
console.log('✓ All 11 stations will be dynamically generated');