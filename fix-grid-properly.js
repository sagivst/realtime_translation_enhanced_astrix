#!/usr/bin/env node

const fs = require('fs');

// Read the current dashboard
const dashboardPath = '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html';
let html = fs.readFileSync(dashboardPath, 'utf8');

// Remove all the duplicate/conflicting CSS rules first
// Find all style sections and consolidate
const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>') + 8;

if (styleStart !== -1 && styleEnd !== -1) {
  const existingStyles = html.substring(styleStart, styleEnd);

  // Create clean, consolidated CSS for grid layout
  const cleanCSS = `<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: #0f1419;
      color: #e0e0e0;
      font-family: 'Monaco', 'Consolas', monospace;
      padding: 20px;
      min-height: 100vh;
    }

    .header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      text-align: center;
    }

    h1 {
      color: #10b981;
      font-size: 1.5em;
      text-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
    }

    .level-indicator {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid #10b981;
      padding: 5px 15px;
      border-radius: 20px;
      margin-left: 20px;
      font-size: 0.8em;
    }

    .breadcrumb {
      color: #64748b;
      margin-bottom: 20px;
      cursor: pointer;
    }

    /* CRITICAL GRID FIX - Direct targeting of level1 and its children */
    #level1 {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 20px !important;
      padding: 20px !important;
      background: transparent !important;
    }

    /* Force ALL direct children of level1 into grid cells */
    #level1 > * {
      grid-column: span 1 !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
    }

    /* Station box styling - applies to BOTH old and new format */
    .monitoring-box--large,
    .monitoring-box.monitoring-box--large {
      background: linear-gradient(145deg, #1a2332 0%, #0d1117 100%) !important;
      border: 1px solid #334155 !important;
      border-radius: 8px !important;
      padding: 20px !important;
      min-height: 200px !important;
      cursor: pointer !important;
      transition: all 0.3s !important;
      display: flex !important;
      flex-direction: column !important;
      grid-column: span 1 !important;
      width: 100% !important;
    }

    .monitoring-box--large:hover,
    .monitoring-box.monitoring-box--large:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
    }

    .box-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid #334155;
    }

    .box-title {
      color: #10b981;
      font-weight: bold;
      font-size: 0.9em;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.75em;
      font-weight: bold;
    }

    .status-badge.good {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
      border: 1px solid #10b981;
    }

    .box-value {
      font-size: 2.5em;
      font-weight: bold;
      text-align: center;
      margin: 20px 0;
    }

    .box-value.good { color: #10b981; }
    .box-value.warning { color: #f59e0b; }
    .box-value.critical { color: #ef4444; }

    .box-unit {
      font-size: 0.5em;
      color: #64748b;
      margin-left: 5px;
    }

    .bar-container {
      position: relative;
      margin: 20px 0;
      height: 40px;
    }

    .bar-range-bg {
      position: relative;
      height: 30px;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 4px;
      overflow: hidden;
    }

    .bar-zone-critical-low { background: rgba(239, 68, 68, 0.3); position: absolute; height: 100%; }
    .bar-zone-warning-low { background: rgba(245, 158, 11, 0.3); position: absolute; height: 100%; }
    .bar-zone-operational { background: rgba(16, 185, 129, 0.3); position: absolute; height: 100%; }
    .bar-zone-warning-high { background: rgba(245, 158, 11, 0.3); position: absolute; height: 100%; }
    .bar-zone-critical-high { background: rgba(239, 68, 68, 0.3); position: absolute; height: 100%; }

    .bar-optimal-marker {
      position: absolute;
      top: -5px;
      width: 2px;
      height: 40px;
      background: #10b981;
      opacity: 0.8;
    }

    .bar-current-value {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s;
    }

    .bar-current-value.good { background: linear-gradient(90deg, #10b981 0%, #059669 100%); }

    .box-footer {
      margin-top: auto;
      padding-top: 15px;
      border-top: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-label {
      color: #64748b;
      font-size: 0.85em;
    }

    .footer-value {
      font-weight: bold;
      font-size: 0.9em;
    }

    .status-active { color: #10b981; }

    .expand-btn {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid #10b981;
      color: #10b981;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85em;
      transition: all 0.3s;
    }

    .expand-btn:hover {
      background: rgba(16, 185, 129, 0.2);
      transform: translateY(-1px);
    }

    /* Hide other levels by default */
    #level2, #level3 {
      display: none;
      padding: 20px;
    }

    /* AI Panel */
    .ai-panel {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid #334155;
      border-radius: 4px;
      padding: 15px 20px;
      margin-top: 20px;
      cursor: pointer;
      grid-column: 1 / -1;
    }

    .ai-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .ai-panel-title {
      color: #10b981;
      font-weight: bold;
    }

    .ai-panel-mode {
      color: #f59e0b;
      font-size: 0.9em;
    }

    /* Station status indicators and metrics */
    .station-status {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #10b981;
    }

    .station-status.warning { background: #f59e0b; }
    .station-status.offline { background: #ef4444; }

    .station-metrics {
      margin-top: 15px;
      font-size: 0.85em;
      color: #94a3b8;
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
    }

    .metric-value {
      color: #10b981;
      font-weight: bold;
    }

    /* Responsive design */
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
  </style>`;

  // Replace the entire style section with clean CSS
  html = html.substring(0, styleStart) + cleanCSS + html.substring(styleEnd);
}

// Save the fixed file
fs.writeFileSync(dashboardPath, html);
console.log('Applied comprehensive grid fix with clean CSS');