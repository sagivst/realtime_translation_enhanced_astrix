#!/usr/bin/env node

const fs = require('fs');

// Read the current dashboard
const dashboardPath = '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html';
let html = fs.readFileSync(dashboardPath, 'utf8');

// 1. FIRST: Add the grid CSS fix to prevent stretching
const gridFixCSS = `
    /* Grid Layout Fix - Prevents Station 1 from stretching */
    #level1 {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 20px !important;
      padding: 20px !important;
    }

    #level1 > * {
      grid-column: span 1 !important;
      width: 100% !important;
      max-width: 100% !important;
    }

    @media (max-width: 1400px) {
      #level1 { grid-template-columns: repeat(3, 1fr) !important; }
    }

    @media (max-width: 1000px) {
      #level1 { grid-template-columns: repeat(2, 1fr) !important; }
    }

    @media (max-width: 600px) {
      #level1 { grid-template-columns: 1fr !important; }
    }
`;

// Insert the grid fix CSS before </style>
html = html.replace('</style>', gridFixCSS + '\n  </style>');

// 2. SECOND: Add stations 3-11 after Station 2
// Find where Station 2 ends
const station2EndPattern = /(STATION 2: UDP TRANSMIT[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>)/;
const match = html.match(station2EndPattern);

if (match) {
  const insertPoint = match.index + match[0].length;

  // Generate stations 3-11 using the SAME structure as Station 1 and 2
  const newStations = `

    <!-- STATION 3: PRE-PROCESSING -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 3: PRE-PROCESSING</div>
        <button class="expand-btn" onclick="showLevel2('station-3')">EXPAND ⛶</button>
      </div>
      <div class="box-metrics">
        <div class="metric-item">
          <span class="metric-label">PCM Rate:</span>
          <span class="metric-value">340/s</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Latency:</span>
          <span class="metric-value">210ms</span>
        </div>
      </div>
      <div class="box-footer">
        <span class="footer-label">Status:</span>
        <span class="footer-value status-active">ACTIVE</span>
      </div>
    </div>

    <!-- STATION 4: LANGUAGE DETECTION -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 4: LANGUAGE DETECTION</div>
        <button class="expand-btn" onclick="showLevel2('station-4')">EXPAND ⛶</button>
      </div>
      <div class="box-metrics">
        <div class="metric-item">
          <span class="metric-label">Text Rate:</span>
          <span class="metric-value">12/s</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Latency:</span>
          <span class="metric-value">180ms</span>
        </div>
      </div>
      <div class="box-footer">
        <span class="footer-label">Status:</span>
        <span class="footer-value status-active">ACTIVE</span>
      </div>
    </div>

    <!-- STATION 5: STT PROCESSING -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 5: STT PROCESSING</div>
        <button class="expand-btn" onclick="showLevel2('station-5')">EXPAND ⛶</button>
      </div>
      <div class="box-metrics">
        <div class="metric-item">
          <span class="metric-label">Requests:</span>
          <span class="metric-value">12/s</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Latency:</span>
          <span class="metric-value">95ms</span>
        </div>
      </div>
      <div class="box-footer">
        <span class="footer-label">Status:</span>
        <span class="footer-value status-active">ACTIVE</span>
      </div>
    </div>

    <!-- STATION 6: TRANSLATION -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 6: TRANSLATION</div>
        <button class="expand-btn" onclick="showLevel2('station-6')">EXPAND ⛶</button>
      </div>
      <div class="box-metrics">
        <div class="metric-item">
          <span class="metric-label">API Status:</span>
          <span class="metric-value">100%</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Latency:</span>
          <span class="metric-value">85ms</span>
        </div>
      </div>
      <div class="box-footer">
        <span class="footer-label">Status:</span>
        <span class="footer-value status-active">ACTIVE</span>
      </div>
    </div>

    <!-- STATION 7: TTS PROCESSING -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 7: TTS PROCESSING</div>
        <button class="expand-btn" onclick="showLevel2('station-7')">EXPAND ⛶</button>
      </div>
      <div class="box-metrics">
        <div class="metric-item">
          <span class="metric-label">Text Rate:</span>
          <span class="metric-value">12/s</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Latency:</span>
          <span class="metric-value">15ms</span>
        </div>
      </div>
      <div class="box-footer">
        <span class="footer-label">Status:</span>
        <span class="footer-value status-active">ACTIVE</span>
      </div>
    </div>

    <!-- STATION 8: POST-PROCESSING -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 8: POST-PROCESSING</div>
        <button class="expand-btn" onclick="showLevel2('station-8')">EXPAND ⛶</button>
      </div>
      <div class="box-metrics">
        <div class="metric-item">
          <span class="metric-label">PCM Rate:</span>
          <span class="metric-value">340/s</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Latency:</span>
          <span class="metric-value">220ms</span>
        </div>
      </div>
      <div class="box-footer">
        <span class="footer-label">Status:</span>
        <span class="footer-value status-active">ACTIVE</span>
      </div>
    </div>

    <!-- STATION 9: STREAMING -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 9: STREAMING</div>
        <button class="expand-btn" onclick="showLevel2('station-9')">EXPAND ⛶</button>
      </div>
      <div class="box-metrics">
        <div class="metric-item">
          <span class="metric-label">PCM Rate:</span>
          <span class="metric-value">340/s</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Latency:</span>
          <span class="metric-value">45ms</span>
        </div>
      </div>
      <div class="box-footer">
        <span class="footer-label">Status:</span>
        <span class="footer-value status-active">ACTIVE</span>
      </div>
    </div>

    <!-- STATION 10: QUALITY CONTROL -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 10: QUALITY CONTROL</div>
        <button class="expand-btn" onclick="showLevel2('station-10')">EXPAND ⛶</button>
      </div>
      <div class="box-metrics">
        <div class="metric-item">
          <span class="metric-label">RTP Rate:</span>
          <span class="metric-value">2356/s</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Latency:</span>
          <span class="metric-value">120ms</span>
        </div>
      </div>
      <div class="box-footer">
        <span class="footer-label">Status:</span>
        <span class="footer-value status-active">ACTIVE</span>
      </div>
    </div>

    <!-- STATION 11: ANALYTICS -->
    <div class="monitoring-box--large">
      <div class="box-header">
        <div class="box-title">STATION 11: ANALYTICS</div>
        <button class="expand-btn" onclick="showLevel2('station-11')">EXPAND ⛶</button>
      </div>
      <div class="box-metrics">
        <div class="metric-item">
          <span class="metric-label">Status:</span>
          <span class="metric-value">Disabled</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Reason:</span>
          <span class="metric-value">Quota Limit</span>
        </div>
      </div>
      <div class="box-footer">
        <span class="footer-label">Status:</span>
        <span class="footer-value status-inactive">OFFLINE</span>
      </div>
    </div>`;

  // Insert the new stations
  html = html.slice(0, insertPoint) + newStations + html.slice(insertPoint);
}

// Save the fixed file
fs.writeFileSync(dashboardPath, html);
console.log('Applied grid fix and added stations 3-11 - preserved original UI design');