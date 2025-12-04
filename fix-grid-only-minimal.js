#!/usr/bin/env node

const fs = require('fs');

// Read the current dashboard
const dashboardPath = '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html';
let html = fs.readFileSync(dashboardPath, 'utf8');

// Add ONLY the critical grid fix CSS right before the closing </style> tag
// This preserves ALL existing styles and only adds what's needed for the grid
const gridFixCSS = `
    /* Grid Layout Fix - Added to fix Station 1 stretching */
    #level1 {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 20px !important;
    }

    /* Force all direct children into grid cells */
    #level1 > * {
      grid-column: span 1 !important;
      width: 100% !important;
      max-width: 100% !important;
    }

    /* Responsive grid */
    @media (max-width: 1400px) {
      #level1 {
        grid-template-columns: repeat(3, 1fr) !important;
      }
    }

    @media (max-width: 1000px) {
      #level1 {
        grid-template-columns: repeat(2, 1fr) !important;
      }
    }

    @media (max-width: 600px) {
      #level1 {
        grid-template-columns: 1fr !important;
      }
    }
`;

// Insert the grid fix CSS right before </style>
html = html.replace('</style>', gridFixCSS + '\n  </style>');

// Save the fixed file
fs.writeFileSync(dashboardPath, html);
console.log('Applied minimal grid fix - preserved all original styling');