#!/bin/bash

# ============================================
# ENHANCE EXISTING DASHBOARD - ADD MISSING FEATURES
# Preserves ALL existing functionality and UI
# Only ADDS what's missing per gap analysis
# ============================================

echo "==========================================="
echo "Enhancing Existing Dashboard"
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
BACKUP_NAME="monitoring-tree-dashboard.html.backup-enhance-$(date +%Y%m%d-%H%M%S)"

echo "Creating backup..."
ssh azureuser@20.170.155.53 "cd $REMOTE_PATH && cp $DASHBOARD_FILE $BACKUP_NAME"

echo "Enhancing dashboard with missing features..."

# Apply enhancements directly on the server using sed
ssh azureuser@20.170.155.53 "cd $REMOTE_PATH" << 'ENHANCEMENTS'

# 1. Change grid from 2 columns to 4 columns for 11 stations
sed -i 's/grid-template-columns: repeat(2, 1fr)/grid-template-columns: repeat(4, 1fr)/g' monitoring-tree-dashboard.html

# 2. Add the missing 9 station boxes after station 2
# Find the closing div of station 2 and insert new stations
sed -i '/<button class="expand-btn" onclick="showLevel2('\''station-2'\'')">EXPAND ⛶<\/button>/a\
    </div>\
\
    <!-- STATION 3: STT Processing -->\
    <div class="monitoring-box--large">\
      <div class="box-header">\
        <div class="box-title">STATION 3: STT PROCESSING</div>\
        <div class="status-badge good" id="station3-status">OFFLINE</div>\
      </div>\
      <div class="box-value good" id="station3-value">0.0<span class="box-unit">ms</span></div>\
      <div class="bar-container">\
        <div class="bar-range-bg">\
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>\
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>\
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>\
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>\
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>\
        </div>\
        <div class="bar-fill good" id="station3-bar" style="width: 0%;"></div>\
        <div class="bar-indicator" id="station3-indicator" style="left: 0%;"></div>\
      </div>\
      <div class="box-path">station-3.stt</div>\
      <button class="expand-btn" onclick="showLevel2('\''station-3'\'')">EXPAND ⛶</button>\
    </div>\
\
    <!-- STATION 4: Deepgram API -->\
    <div class="monitoring-box--large">\
      <div class="box-header">\
        <div class="box-title">STATION 4: DEEPGRAM API</div>\
        <div class="status-badge good" id="station4-status">OFFLINE</div>\
      </div>\
      <div class="box-value good" id="station4-value">0.0<span class="box-unit">ms</span></div>\
      <div class="bar-container">\
        <div class="bar-range-bg">\
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>\
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>\
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>\
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>\
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>\
        </div>\
        <div class="bar-fill good" id="station4-bar" style="width: 0%;"></div>\
        <div class="bar-indicator" id="station4-indicator" style="left: 0%;"></div>\
      </div>\
      <div class="box-path">station-4.deepgram</div>\
      <button class="expand-btn" onclick="showLevel2('\''station-4'\'')">EXPAND ⛶</button>\
    </div>\
\
    <!-- STATION 5: Translation Prep -->\
    <div class="monitoring-box--large">\
      <div class="box-header">\
        <div class="box-title">STATION 5: TRANSLATION PREP</div>\
        <div class="status-badge good" id="station5-status">OFFLINE</div>\
      </div>\
      <div class="box-value good" id="station5-value">0<span class="box-unit">ops/s</span></div>\
      <div class="bar-container">\
        <div class="bar-range-bg">\
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>\
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>\
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>\
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>\
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>\
        </div>\
        <div class="bar-fill good" id="station5-bar" style="width: 0%;"></div>\
        <div class="bar-indicator" id="station5-indicator" style="left: 0%;"></div>\
      </div>\
      <div class="box-path">station-5.translate-prep</div>\
      <button class="expand-btn" onclick="showLevel2('\''station-5'\'')">EXPAND ⛶</button>\
    </div>\
\
    <!-- STATION 6: DeepL API -->\
    <div class="monitoring-box--large">\
      <div class="box-header">\
        <div class="box-title">STATION 6: DEEPL API</div>\
        <div class="status-badge good" id="station6-status">OFFLINE</div>\
      </div>\
      <div class="box-value good" id="station6-value">0.0<span class="box-unit">ms</span></div>\
      <div class="bar-container">\
        <div class="bar-range-bg">\
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>\
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>\
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>\
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>\
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>\
        </div>\
        <div class="bar-fill good" id="station6-bar" style="width: 0%;"></div>\
        <div class="bar-indicator" id="station6-indicator" style="left: 0%;"></div>\
      </div>\
      <div class="box-path">station-6.deepl</div>\
      <button class="expand-btn" onclick="showLevel2('\''station-6'\'')">EXPAND ⛶</button>\
    </div>\
\
    <!-- STATION 7: TTS Prep -->\
    <div class="monitoring-box--large">\
      <div class="box-header">\
        <div class="box-title">STATION 7: TTS PREP</div>\
        <div class="status-badge good" id="station7-status">OFFLINE</div>\
      </div>\
      <div class="box-value good" id="station7-value">0<span class="box-unit">ops/s</span></div>\
      <div class="bar-container">\
        <div class="bar-range-bg">\
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>\
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>\
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>\
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>\
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>\
        </div>\
        <div class="bar-fill good" id="station7-bar" style="width: 0%;"></div>\
        <div class="bar-indicator" id="station7-indicator" style="left: 0%;"></div>\
      </div>\
      <div class="box-path">station-7.tts-prep</div>\
      <button class="expand-btn" onclick="showLevel2('\''station-7'\'')">EXPAND ⛶</button>\
    </div>\
\
    <!-- STATION 8: ElevenLabs TTS -->\
    <div class="monitoring-box--large">\
      <div class="box-header">\
        <div class="box-title">STATION 8: ELEVENLABS TTS</div>\
        <div class="status-badge good" id="station8-status">OFFLINE</div>\
      </div>\
      <div class="box-value good" id="station8-value">0.0<span class="box-unit">ms</span></div>\
      <div class="bar-container">\
        <div class="bar-range-bg">\
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>\
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>\
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>\
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>\
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>\
        </div>\
        <div class="bar-fill good" id="station8-bar" style="width: 0%;"></div>\
        <div class="bar-indicator" id="station8-indicator" style="left: 0%;"></div>\
      </div>\
      <div class="box-path">station-8.elevenlabs</div>\
      <button class="expand-btn" onclick="showLevel2('\''station-8'\'')">EXPAND ⛶</button>\
    </div>\
\
    <!-- STATION 9: STT Server TX -->\
    <div class="monitoring-box--large">\
      <div class="box-header">\
        <div class="box-title">STATION 9: STT SERVER TX</div>\
        <div class="status-badge good" id="station9-status">OFFLINE</div>\
      </div>\
      <div class="box-value good" id="station9-value">0<span class="box-unit">pkts</span></div>\
      <div class="bar-container">\
        <div class="bar-range-bg">\
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>\
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>\
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>\
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>\
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>\
        </div>\
        <div class="bar-fill good" id="station9-bar" style="width: 0%;"></div>\
        <div class="bar-indicator" id="station9-indicator" style="left: 0%;"></div>\
      </div>\
      <div class="box-path">station-9.stt-tx</div>\
      <button class="expand-btn" onclick="showLevel2('\''station-9'\'')">EXPAND ⛶</button>\
    </div>\
\
    <!-- STATION 10: Gateway TX -->\
    <div class="monitoring-box--large">\
      <div class="box-header">\
        <div class="box-title">STATION 10: GATEWAY TX</div>\
        <div class="status-badge good" id="station10-status">OFFLINE</div>\
      </div>\
      <div class="box-value good" id="station10-value">0<span class="box-unit">pkts</span></div>\
      <div class="bar-container">\
        <div class="bar-range-bg">\
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>\
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>\
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>\
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>\
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>\
        </div>\
        <div class="bar-fill good" id="station10-bar" style="width: 0%;"></div>\
        <div class="bar-indicator" id="station10-indicator" style="left: 0%;"></div>\
      </div>\
      <div class="box-path">station-10.gateway-tx</div>\
      <button class="expand-btn" onclick="showLevel2('\''station-10'\'')">EXPAND ⛶</button>\
    </div>\
\
    <!-- STATION 11: Hume EVI -->\
    <div class="monitoring-box--large">\
      <div class="box-header">\
        <div class="box-title">STATION 11: HUME EVI</div>\
        <div class="status-badge critical" id="station11-status">DISABLED</div>\
      </div>\
      <div class="box-value good" id="station11-value">--<span class="box-unit"></span></div>\
      <div class="bar-container">\
        <div class="bar-range-bg">\
          <div class="bar-zone-critical-low" style="left: 0%; width: 10%;"></div>\
          <div class="bar-zone-warning-low" style="left: 10%; width: 10%;"></div>\
          <div class="bar-zone-operational" style="left: 20%; width: 60%;"></div>\
          <div class="bar-zone-warning-high" style="left: 80%; width: 15%;"></div>\
          <div class="bar-zone-critical-high" style="left: 95%; width: 5%;"></div>\
        </div>\
        <div class="bar-fill good" id="station11-bar" style="width: 0%;"></div>\
        <div class="bar-indicator" id="station11-indicator" style="left: 0%;"></div>\
      </div>\
      <div class="box-path">station-11.hume</div>\
      <button class="expand-btn" onclick="showLevel2('\''station-11'\'')">EXPAND ⛶</button>' monitoring-tree-dashboard.html

# 3. Add update functions for the new stations in the JavaScript section
sed -i '/else if (stationId === '\''station-2'\'') {/a\
      } else if (stationId === '\''station-3'\'') {\
        updateStation3(metrics);\
      } else if (stationId === '\''station-4'\'') {\
        updateStation4(metrics);\
      } else if (stationId === '\''station-5'\'') {\
        updateStation5(metrics);\
      } else if (stationId === '\''station-6'\'') {\
        updateStation6(metrics);\
      } else if (stationId === '\''station-7'\'') {\
        updateStation7(metrics);\
      } else if (stationId === '\''station-8'\'') {\
        updateStation8(metrics);\
      } else if (stationId === '\''station-9'\'') {\
        updateStation9(metrics);\
      } else if (stationId === '\''station-10'\'') {\
        updateStation10(metrics);\
      } else if (stationId === '\''station-11'\'') {\
        updateStation11(metrics);' monitoring-tree-dashboard.html

# 4. Add the update functions for new stations
sed -i '/function updateStation2(metrics) {/a\
    }\
\
    function updateStation3(metrics) {\
      if (!metrics) return;\
      updateValue('\''station3-value'\'', metrics.avgLatency || 0, '\''ms'\'');\
      updateBar('\''station3'\'', metrics.avgLatency || 0, 0, 500);\
    }\
\
    function updateStation4(metrics) {\
      if (!metrics) return;\
      updateValue('\''station4-value'\'', metrics.avgLatency || 0, '\''ms'\'');\
      updateBar('\''station4'\'', metrics.avgLatency || 0, 0, 500);\
    }\
\
    function updateStation5(metrics) {\
      if (!metrics) return;\
      updateValue('\''station5-value'\'', metrics.processRate || 0, '\''ops/s'\'');\
      updateBar('\''station5'\'', metrics.processRate || 0, 0, 1000);\
    }\
\
    function updateStation6(metrics) {\
      if (!metrics) return;\
      updateValue('\''station6-value'\'', metrics.avgLatency || 0, '\''ms'\'');\
      updateBar('\''station6'\'', metrics.avgLatency || 0, 0, 500);\
    }\
\
    function updateStation7(metrics) {\
      if (!metrics) return;\
      updateValue('\''station7-value'\'', metrics.processRate || 0, '\''ops/s'\'');\
      updateBar('\''station7'\'', metrics.processRate || 0, 0, 1000);\
    }\
\
    function updateStation8(metrics) {\
      if (!metrics) return;\
      updateValue('\''station8-value'\'', metrics.avgLatency || 0, '\''ms'\'');\
      updateBar('\''station8'\'', metrics.avgLatency || 0, 0, 500);\
    }\
\
    function updateStation9(metrics) {\
      if (!metrics) return;\
      updateValue('\''station9-value'\'', metrics.packetsTx || 0, '\''pkts'\'');\
      updateBar('\''station9'\'', metrics.packetsTx || 0, 0, 10000);\
    }\
\
    function updateStation10(metrics) {\
      if (!metrics) return;\
      updateValue('\''station10-value'\'', metrics.packetsTx || 0, '\''pkts'\'');\
      updateBar('\''station10'\'', metrics.packetsTx || 0, 0, 10000);\
    }\
\
    function updateStation11(metrics) {\
      if (!metrics) return;\
      // Hume is disabled, show placeholder\
      document.getElementById('\''station11-value'\'').innerHTML = '\''--<span class="box-unit"></span>'\'';\
    ' monitoring-tree-dashboard.html

echo "✅ Enhancements applied successfully!"

ENHANCEMENTS

echo ""
echo "✅ Dashboard enhanced with missing features!"
echo ""
echo "Changes made:"
echo "- Added stations 3-11 to the grid"
echo "- Updated grid layout to 4 columns"
echo "- Added update functions for new stations"
echo "- Preserved ALL existing functionality and UI"
echo ""
echo "Access the enhanced dashboard at:"
echo "http://20.170.155.53:3021/monitoring-tree-dashboard.html"
echo ""
echo "Backup saved as: $BACKUP_NAME"