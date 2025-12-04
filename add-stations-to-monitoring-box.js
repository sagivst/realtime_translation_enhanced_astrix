#!/usr/bin/env node

const fs = require('fs');

// Read the current dashboard
const dashboardPath = '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html';
let html = fs.readFileSync(dashboardPath, 'utf8');

// Find where Station 2 ends (line 1039-1142 based on the grep results)
// We need to add stations 3-11 after Station 2's monitoring box

// Station definitions - matching the server
const newStations = [
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

// Find the location after Station 2's closing div
const station2EndPattern = /(\s*<\/div>\s*<!-- monitoring-box--large for station-2 -->\s*)/;
const station2Match = html.match(station2EndPattern);

if (!station2Match) {
  // Try a simpler pattern - find the end of Station 2's box
  const simplePattern = /(STATION 2: UDP TRANSMIT[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*)/;
  const match = html.match(simplePattern);

  if (match) {
    const insertPoint = match.index + match[0].length;

    // Generate HTML for new stations using the same structure as Station 1 and 2
    let newStationsHTML = '';

    for (const station of newStations) {
      newStationsHTML += `
      <!-- ${station.id} -->
      <div class="monitoring-box monitoring-box--large" data-station="${station.id}" data-metrics="multiple">
        <div class="box-title">${station.name}</div>
        <div class="box-metrics-grid">
          <!-- Metrics will be populated dynamically -->
        </div>
        <div class="box-footer">
          <span class="footer-label">Status:</span>
          <span class="footer-value status-active">ACTIVE</span>
        </div>
      </div>
`;
    }

    // Insert the new stations
    html = html.slice(0, insertPoint) + newStationsHTML + html.slice(insertPoint);

    // Now update the JavaScript to handle all 11 stations
    // Find the updateDashboard function and update it
    const updateFunctionPattern = /function updateDashboard\(\) {[\s\S]*?^  }/m;
    const updateMatch = html.match(updateFunctionPattern);

    if (updateMatch) {
      // Add update logic for stations 3-11
      let stationUpdates = '';

      for (const station of newStations) {
        const stationNum = station.id.replace('station-', '');
        stationUpdates += `
      // Update ${station.name}
      const ${station.id.replace('-', '')}Box = document.querySelector('[data-station="${station.id}"]');
      if (${station.id.replace('-', '')}Box) {
        const metricsGrid = ${station.id.replace('-', '')}Box.querySelector('.box-metrics-grid');
        if (metricsGrid && !metricsGrid.innerHTML) {
          // Fetch and display metrics for ${station.id}
          fetch('/api/stations/${station.id}/metrics')
            .then(res => res.json())
            .then(data => {
              let metricsHTML = '';
              for (const [category, values] of Object.entries(data.metrics || {})) {
                for (const [key, value] of Object.entries(values)) {
                  metricsHTML += '<div class="metric-item">';
                  metricsHTML += '<span class="metric-label">' + key + ':</span>';
                  metricsHTML += '<span class="metric-value">' + value + '</span>';
                  metricsHTML += '</div>';
                }
              }
              metricsGrid.innerHTML = metricsHTML;
            });
        }
      }
`;
      }

      // Find where to insert the station updates
      const endUpdatePattern = /(\s*simulateUpdates\(\);)/;
      const endUpdateMatch = html.match(endUpdatePattern);

      if (endUpdateMatch) {
        html = html.slice(0, endUpdateMatch.index) + stationUpdates + html.slice(endUpdateMatch.index);
      }
    }

    // Write the updated HTML
    fs.writeFileSync(dashboardPath, html);
    console.log('Successfully added stations 3-11 to the dashboard');

    // Also update the grid layout CSS to accommodate 11 stations
    const gridPattern = /\.grid-level1\s*{\s*display:\s*grid;\s*grid-template-columns:[^;]*;/;
    const gridMatch = html.match(gridPattern);

    if (gridMatch) {
      // Update to 4-4-3 layout as specified in wireframe
      const newGrid = '.grid-level1 { display: grid; grid-template-columns: repeat(4, 1fr);';
      html = html.replace(gridPattern, newGrid);
      fs.writeFileSync(dashboardPath, html);
    }

  } else {
    console.error('Could not find Station 2 in the dashboard');
  }
} else {
  console.log('Found station 2 end pattern at advanced location');
}

console.log('Dashboard update complete');