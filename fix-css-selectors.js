#!/usr/bin/env node

const fs = require('fs');

// Read the current dashboard
const dashboardPath = '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html';
let html = fs.readFileSync(dashboardPath, 'utf8');

// Fix the CSS selectors - the level1 div HAS the grid-level1 class, not a child with it
// Replace all #level1 .grid-level1 with #level1.grid-level1 (no space)
html = html.replace(/#level1\s+\.grid-level1/g, '#level1.grid-level1');

// Also fix the child selectors
html = html.replace(/#level1\.grid-level1\s+>\s+div:nth-child/g, '#level1.grid-level1 > div:nth-child');

// Also ensure we have the correct grid CSS at the top level
const additionalCSS = `
    /* Direct grid styling for level1 */
    #level1.grid-level1 {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 20px !important;
      padding: 20px !important;
    }

    /* Override any conflicting styles */
    .grid-level1 {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 20px !important;
    }

    /* Ensure station boxes don't stretch */
    #level1 > .monitoring-box,
    #level1 > .monitoring-box--large,
    #level1 .monitoring-box.monitoring-box--large {
      width: 100% !important;
      max-width: 100% !important;
      grid-column: span 1 !important;
    }

    /* Prevent any full-width stretching */
    #level1 > div {
      grid-column: span 1 !important;
    }

    /* Make sure the old monitoring-box--large doesn't break layout */
    .monitoring-box--large:not(.monitoring-box) {
      display: none !important;
    }
`;

// Add the additional CSS before </style>
html = html.replace('</style>', additionalCSS + '\n  </style>');

// Also check if there are any orphan monitoring-box--large divs that need to be wrapped
// Look for the structure and make sure all station boxes are direct children of level1
const level1Start = html.indexOf('<div id="level1"');
const level1End = html.indexOf('</div>  <!-- level1 -->');

if (level1Start !== -1 && level1End !== -1) {
  let level1Content = html.substring(level1Start, level1End);

  // Check if there are nested containers causing issues
  // Remove any extra wrapper divs between level1 and monitoring-box elements
  level1Content = level1Content.replace(/<div class="grid-level1">\s*<div class="grid-level1">/g, '<div class="grid-level1">');

  // Update the HTML
  html = html.substring(0, level1Start) + level1Content + html.substring(level1End);
}

// Write the fixed HTML
fs.writeFileSync(dashboardPath, html);
console.log('Fixed CSS selectors for grid layout');