#!/usr/bin/env node

const fs = require('fs');

// Read the current dashboard
const dashboardPath = '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html';
let html = fs.readFileSync(dashboardPath, 'utf8');

// Fix the grid layout CSS for Level 1
const gridFixCSS = `
    /* Fixed Grid Layout for Station Boxes */
    #level1 .grid-level1 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      padding: 20px;
    }

    /* For the last row with 3 stations, center them */
    #level1 .grid-level1 > div:nth-child(9) {
      grid-column: span 1;
    }

    #level1 .grid-level1 > div:nth-child(10) {
      grid-column: span 1;
    }

    #level1 .grid-level1 > div:nth-child(11) {
      grid-column: span 1;
    }

    /* Ensure monitoring boxes don't stretch */
    .monitoring-box--large {
      width: 100%;
      max-width: 100%;
      min-height: 200px;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    /* Fix the station container structure */
    .station-container {
      display: contents;
    }

    /* Responsive adjustments */
    @media (max-width: 1400px) {
      #level1 .grid-level1 {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (max-width: 1000px) {
      #level1 .grid-level1 {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 600px) {
      #level1 .grid-level1 {
        grid-template-columns: 1fr;
      }
    }

    /* Fix box internal layout */
    .monitoring-box--large .box-header {
      padding: 15px;
      border-bottom: 1px solid #334155;
    }

    .monitoring-box--large .box-title {
      font-size: 0.9em;
      margin-bottom: 10px;
    }

    .monitoring-box--large .expand-btn {
      position: absolute;
      top: 15px;
      right: 15px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid #10b981;
      color: #10b981;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85em;
    }

    .monitoring-box--large .station-metrics {
      padding: 15px;
      flex-grow: 1;
    }

    .monitoring-box--large .box-footer {
      padding: 10px 15px;
      border-top: 1px solid #334155;
      background: rgba(0, 0, 0, 0.2);
    }
`;

// Replace the existing grid CSS
const gridCSSPattern = /\.grid-level1\s*{[^}]*}/g;
html = html.replace(gridCSSPattern, '');

// Find the end of style section and add the fixed CSS
const styleEndPattern = /<\/style>/;
html = html.replace(styleEndPattern, gridFixCSS + '\n  </style>');

// Now fix the HTML structure - ensure all stations are within grid-level1
// Find the level1 content and restructure it
const level1Pattern = /(<div id="level1"[^>]*>)([\s\S]*?)(<\/div>\s*<!-- level1 -->)/;
const level1Match = html.match(level1Pattern);

if (level1Match) {
  let level1Content = level1Match[2];

  // Extract all station boxes
  const stationBoxPattern = /<div class="monitoring-box monitoring-box--large"[\s\S]*?<\/div>\s*<\/div>/g;
  const stationBoxes = level1Content.match(stationBoxPattern) || [];

  // Also get the old format station boxes
  const oldFormatPattern = /<div class="monitoring-box--large">[\s\S]*?<\/div>\s*<\/div>/g;
  const oldFormatBoxes = level1Content.match(oldFormatPattern) || [];

  // Combine all station boxes
  const allStationBoxes = [...stationBoxes, ...oldFormatBoxes];

  // Create new level1 content with proper grid structure
  let newLevel1Content = `
    <div class="breadcrumb">Level 1: Station Grid</div>
    <div class="grid-level1">
`;

  // Add all 11 stations
  const stationData = [
    { id: 'station-1', name: 'STATION 1: ARI RECEIVE' },
    { id: 'station-2', name: 'STATION 2: UDP TRANSMIT' },
    { id: 'station-3', name: 'STATION 3: PRE-PROCESSING' },
    { id: 'station-4', name: 'STATION 4: LANGUAGE DETECTION' },
    { id: 'station-5', name: 'STATION 5: STT PROCESSING' },
    { id: 'station-6', name: 'STATION 6: TRANSLATION' },
    { id: 'station-7', name: 'STATION 7: TTS PROCESSING' },
    { id: 'station-8', name: 'STATION 8: POST-PROCESSING' },
    { id: 'station-9', name: 'STATION 9: STREAMING' },
    { id: 'station-10', name: 'STATION 10: QUALITY CONTROL' },
    { id: 'station-11', name: 'STATION 11: ANALYTICS' }
  ];

  stationData.forEach(station => {
    newLevel1Content += `
      <div class="monitoring-box monitoring-box--large" data-station="${station.id}">
        <div class="box-header">
          <div class="box-title">${station.name}</div>
          <button class="expand-btn" onclick="showLevel2('${station.id}')">EXPAND ⛶</button>
        </div>
        <div class="station-metrics">
          <!-- Metrics populated dynamically -->
        </div>
        <div class="box-footer">
          <span class="footer-label">Status:</span>
          <span class="footer-value status-active">ACTIVE</span>
        </div>
      </div>
`;
  });

  newLevel1Content += `
    </div>`;

  // Check if AI panel exists and add it
  const aiPanelPattern = /<div class="ai-panel"[\s\S]*?<\/div>\s*<\/div>/;
  const aiPanelMatch = level1Content.match(aiPanelPattern);
  if (aiPanelMatch) {
    newLevel1Content += '\n' + aiPanelMatch[0];
  } else {
    // Add AI panel if it doesn't exist
    newLevel1Content += `
    <!-- Global AI Optimization Panel -->
    <div class="ai-panel" onclick="toggleAIPanel()">
      <div class="ai-panel-header">
        <div class="ai-panel-title">▼ Global AI Optimization Panel</div>
        <div class="ai-panel-mode">Currently Manual Mode</div>
      </div>
    </div>`;
  }

  // Replace the level1 content
  html = html.replace(level1Pattern, level1Match[1] + newLevel1Content + '\n  ' + level1Match[3]);
}

// Write the fixed HTML
fs.writeFileSync(dashboardPath, html);
console.log('Fixed station grid layout - all stations now in 4-column grid');