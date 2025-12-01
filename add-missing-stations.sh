#!/bin/bash

# ============================================
# ADD MISSING STATIONS TO EXISTING DASHBOARD
# Preserves all existing functionality
# Only adds stations 4-11
# ============================================

echo "==========================================="
echo "Adding Missing Stations to Dashboard"
echo "Target: 20.170.155.53 (DEV VM ONLY)"
echo "==========================================="

# Check connection
if ! ssh -o ConnectTimeout=5 azureuser@20.170.155.53 "echo 'Connected'" > /dev/null 2>&1; then
    echo "❌ Cannot connect to 20.170.155.53"
    exit 1
fi

echo "✅ Connected to dev VM"

# Backup current dashboard
REMOTE_PATH="/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public"
DASHBOARD_FILE="monitoring-tree-dashboard.html"
BACKUP_NAME="monitoring-tree-dashboard.html.backup-additions-$(date +%Y%m%d-%H%M%S)"

echo "Creating backup..."
ssh azureuser@20.170.155.53 "cd $REMOTE_PATH && cp $DASHBOARD_FILE $BACKUP_NAME"

echo "Adding missing stations to existing dashboard..."

# Create a modification script on the server
ssh azureuser@20.170.155.53 "cat > /tmp/add-stations.js" << 'EOF'
const fs = require('fs');
const path = '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html';

// Read the current dashboard
let content = fs.readFileSync(path, 'utf8');

// Find where stations are defined (looking for the stations array/object)
// We need to add stations 4-11 to the existing configuration

// Add new station definitions after station-3
const newStations = `
      // === ADDED STATIONS 4-11 ===
      'station-4': {
        name: 'Deepgram API',
        type: 'voice',
        editable: false,
        parameters: [
          'latency.avg', 'latency.peak', 'performance.cpu',
          'performance.memory', 'custom.successRate'
        ]
      },
      'station-5': {
        name: 'Translation Prep',
        type: 'text',
        editable: false,
        parameters: [
          'performance.cpu', 'performance.memory', 'custom.totalProcessed',
          'custom.processSpeed', 'custom.successRate'
        ]
      },
      'station-6': {
        name: 'DeepL API',
        type: 'text',
        editable: false,
        parameters: [
          'latency.avg', 'latency.peak', 'performance.cpu',
          'performance.memory', 'custom.successRate'
        ]
      },
      'station-7': {
        name: 'TTS Prep',
        type: 'text',
        editable: false,
        parameters: [
          'performance.cpu', 'performance.memory', 'custom.totalProcessed',
          'custom.processSpeed', 'custom.successRate'
        ]
      },
      'station-8': {
        name: 'ElevenLabs TTS',
        type: 'voice',
        editable: false,
        parameters: [
          'latency.avg', 'latency.peak', 'audio.sampleRate',
          'audio.bitDepth', 'custom.successRate'
        ]
      },
      'station-9': {
        name: 'STT Server TX',
        type: 'voice',
        editable: true,
        parameters: [
          'packet.tx', 'packet.dropped', 'buffer.total',
          'buffer.output', 'latency.avg'
        ]
      },
      'station-10': {
        name: 'Gateway TX',
        type: 'voice',
        editable: true,
        parameters: [
          'packet.tx', 'packet.dropped', 'packet.lossRate',
          'latency.avg', 'latency.peak'
        ]
      },
      'station-11': {
        name: 'Hume EVI',
        type: 'voice',
        editable: false,
        parameters: [
          'latency.avg', 'custom.state', 'custom.lastActivity',
          'custom.warnings', 'custom.critical'
        ]
      },`;

// Find the place after station-3 definition and add new stations
// Look for the pattern where station configurations are defined
const stationConfigPattern = /('station-3':\s*{[^}]+}),?/;
const match = content.match(stationConfigPattern);

if (match) {
    // Add the new stations after station-3
    content = content.replace(stationConfigPattern, match[0] + ',' + newStations);
    console.log('✓ Added station definitions 4-11');
} else {
    console.log('⚠ Could not find station configuration section');
}

// Update the grid layout for Level 1 to handle more stations
// Change grid-template-columns from 2 to 3 for better layout with 11 stations
content = content.replace(
    /grid-template-columns:\s*repeat\(2,\s*1fr\)/,
    'grid-template-columns: repeat(3, 1fr)'
);
console.log('✓ Updated grid layout for 11 stations');

// Add station type badges styles if not present
if (!content.includes('badge-voice')) {
    const badgeStyles = `
    /* Station type badges */
    .badge-voice {
        background: rgba(51, 181, 229, 0.2);
        color: #33b5e5;
        border: 1px solid rgba(51, 181, 229, 0.3);
        padding: 2px 6px;
        border-radius: 2px;
        font-size: 9px;
        text-transform: uppercase;
        margin-left: 8px;
    }

    .badge-text {
        background: rgba(255, 187, 51, 0.2);
        color: #ffbb33;
        border: 1px solid rgba(255, 187, 51, 0.3);
        padding: 2px 6px;
        border-radius: 2px;
        font-size: 9px;
        text-transform: uppercase;
        margin-left: 8px;
    }`;

    // Add before closing </style> tag
    content = content.replace('</style>', badgeStyles + '\n  </style>');
    console.log('✓ Added station type badge styles');
}

// Write the modified content back
fs.writeFileSync(path, content);
console.log('✓ Dashboard updated successfully with stations 4-11');
EOF

# Run the modification script
echo "Executing modifications..."
ssh azureuser@20.170.155.53 "cd /tmp && node add-stations.js"

# Clean up
ssh azureuser@20.170.155.53 "rm /tmp/add-stations.js"

echo ""
echo "✅ Successfully added stations 4-11 to the dashboard!"
echo ""
echo "Changes made:"
echo "- Added stations 4-11 configuration"
echo "- Updated grid layout to 3 columns"
echo "- Added voice/text badge styles"
echo "- Preserved all existing functionality"
echo ""
echo "Access the enhanced dashboard at:"
echo "http://20.170.155.53:3021/monitoring-tree-dashboard.html"
echo ""
echo "Backup saved as: $BACKUP_NAME"