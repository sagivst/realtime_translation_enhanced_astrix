#!/usr/bin/env node

const fs = require('fs');

// Read the current dashboard
const dashboardPath = '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html';
let html = fs.readFileSync(dashboardPath, 'utf8');

// Add EXPAND buttons to stations 3-11
const stationNames = [
  'STATION 3: PRE-PROCESSING',
  'STATION 4: LANGUAGE DETECTION',
  'STATION 5: STT PROCESSING',
  'STATION 6: TRANSLATION',
  'STATION 7: TTS PROCESSING',
  'STATION 8: POST-PROCESSING',
  'STATION 9: STREAMING',
  'STATION 10: QUALITY CONTROL',
  'STATION 11: ANALYTICS'
];

// For each station, add an EXPAND button like stations 1 and 2 have
stationNames.forEach((stationName, index) => {
  const stationNum = index + 3;
  const stationId = `station-${stationNum}`;

  // Find the station's box title
  const pattern = new RegExp(`(<div class="box-title">${stationName}</div>)`);

  // Replace with title + expand button
  const replacement = `$1
        <button class="expand-btn" onclick="showLevel2('${stationId}')">EXPAND ⛶</button>`;

  html = html.replace(pattern, replacement);
});

// Also ensure the showLevel2 function handles all stations
const showLevel2Pattern = /function showLevel2\(stationId\) {[\s\S]*?^  }/m;
const showLevel2Match = html.match(showLevel2Pattern);

if (!showLevel2Match) {
  // Add the showLevel2 function if it doesn't exist
  const scriptEndPattern = /<\/script>/;
  const newFunction = `
  function showLevel2(stationId) {
    // Hide Level 1 and show Level 2 for the selected station
    document.getElementById('level1').style.display = 'none';
    document.getElementById('level2').style.display = 'block';

    // Update breadcrumb
    document.querySelector('.breadcrumb').innerHTML =
      '<span onclick="showLevel1()">Level 1: Station Grid</span> » Level 2: ' + stationId;

    // Load station metrics
    fetch('/api/stations/' + stationId + '/metrics')
      .then(res => res.json())
      .then(data => {
        const level2Grid = document.getElementById('level2');
        let html = '<div class="grid-level2">';

        for (const [category, metrics] of Object.entries(data.metrics || {})) {
          for (const [key, value] of Object.entries(metrics)) {
            html += '<div class="monitoring-box monitoring-box--medium" onclick="showLevel3(\\'' + stationId + '\\', \\'' + key + '\\')">';
            html += '  <div class="box-title">' + key + '</div>';
            html += '  <div class="box-value">' + value + '</div>';
            html += '</div>';
          }
        }

        html += '</div>';
        level2Grid.innerHTML = html;
      });
  }

  function showLevel1() {
    document.getElementById('level1').style.display = 'block';
    document.getElementById('level2').style.display = 'none';
    document.getElementById('level3').style.display = 'none';
    document.querySelector('.breadcrumb').innerHTML = 'Level 1: Station Grid';
  }

  function showLevel3(stationId, metricName) {
    // Implementation for Level 3 parameter editor
    document.getElementById('level2').style.display = 'none';
    document.getElementById('level3').style.display = 'block';

    document.querySelector('.breadcrumb').innerHTML =
      '<span onclick="showLevel1()">Level 1</span> » <span onclick="showLevel2(\\'' + stationId + '\\')">Level 2</span> » Level 3: ' + metricName;
  }
</script>`;

  html = html.replace(scriptEndPattern, newFunction + '\n</script>');
}

// Write the updated HTML
fs.writeFileSync(dashboardPath, html);
console.log('Added interactivity to all 11 stations');