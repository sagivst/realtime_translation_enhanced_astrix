
# REVISED Monitoring System Gap Analysis & UI Development Plan

**Date**: November 29, 2025
**Subject**: Corrected Analysis - Monitoring System IS Deployed with UI Development Requirements
**Live System**: http://20.170.155.53:3021/monitoring-tree-dashboard.html

---

## Executive Summary - CORRECTION

**IMPORTANT**: The previous gap analysis was incorrect. The monitoring system **IS DEPLOYED AND RUNNING** on production:
- ✅ **monitoring-server-real-data.js** is running on port 3021
- ✅ **monitoring-tree-dashboard.html** is accessible and working
- ✅ All 75 parameters are defined in the architecture
- ✅ 7-station monitoring system is operational with real data

**Current Focus**: UI Enhancement and 11-Station Configuration

---

## 1. Current System Status (CORRECTED)

### What's Actually Running on 20.170.155.53:3021

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| monitoring-server-real-data.js | ✅ RUNNING | Port 3021 | Collecting real metrics |
| monitoring-tree-dashboard.html | ✅ ACCESSIBLE | /monitoring-tree-dashboard.html | Live dashboard |
| 75 Parameters | ✅ DEFINED | UniversalCollector.js | All metric collectors working |
| Station Agents | ✅ ACTIVE | StationAgent.js | Filtering metrics per station |
| API Endpoints | ✅ WORKING | /api/stations, /api/parameters | RESTful API active |
| WebSocket | ✅ STREAMING | Port 3021 | Real-time updates |

### Architecture Components Present

```
PRODUCTION SERVER (20.170.155.53):
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/
├── monitoring-server-real-data.js    ✅ RUNNING (PID: 2924185)
├── public/
│   └── monitoring-tree-dashboard.html ✅ ACCESSIBLE
├── monitoring/
│   ├── StationAgent.js               ✅
│   ├── UniversalCollector.js         ✅ (75 parameters)
│   ├── collectors/                   ✅ (8 collectors)
│   └── config/
│       └── station-parameter-map.js  ⚠️  (Only 7 stations, need 11)
└── config/parameters/                ✅ (55+ monitoring parameters)
```

---

## 2. Station Configuration Requirements

### Current Stations (7 Implemented)

| ID | Name | Status | Coverage |
|----|------|--------|----------|
| STATION-1 | Asterisk ARI | ✅ Defined | RTP source monitoring |
| STATION-2 | Gateway RX (3333) | ✅ ACTIVE | Real packet counts |
| STATION-3 | STT Processing | ✅ ACTIVE | Deepgram metrics |
| STATION-4 | Translation | ✅ ACTIVE | DeepL metrics |
| STATION-5 | TTS Generation | ✅ ACTIVE | ElevenLabs metrics |
| STATION-6 | STT Server TX | ✅ Defined | PCM output |
| STATION-7 | Gateway TX (4444) | ✅ ACTIVE | Real packet counts |

### Required Additional Stations (4 Missing)

| ID | Name | Purpose | Implementation Needed |
|----|------|---------|----------------------|
| STATION-9 | STTTTSserver TX | PCM to Gateway | Add to station-parameter-map |
| STATION-10 | Gateway Return | RTP to Asterisk | Add monitoring hooks |
| STATION-11 | Hume EVI | Emotion branch | Currently disabled (quota) |
| STATION-12 | Hume PCM | PCM to Hume | Branch monitoring |

**Note**: Stations 5, 6, 7 are text-based (DeepL translation flow) and don't need voice monitoring.

---

## 3. UI Development Plan - 11 Station Dashboard

### 3.1 Level 1: Monitoring Grid (Main View)

**Current State**: Basic tree view exists
**Required Enhancement**: Professional grid layout with 11 station cards

```
+------------------------------------------------------------------+
|  REAL-TIME TRANSLATION PIPELINE MONITOR         [⚙️] [📊] [❓]    |
+------------------------------------------------------------------+
| Audio Waveform Visualization (Real-time PCM)                     |
| ▁▃▅▇█▇▅▃▁▁▃▅▇█▇▅▃▁▁▃▅▇█▇▅▃▁                        ● Recording   |
|  System Health: ● ONLINE | Latency: 182ms | MOS: 4.6             |
+------------------------------------------------------------------+
| ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
| │ 1. Asterisk │ │ 2. Gateway  │ │ 3. STT Proc │ │ 4. Deepgram │
| │    ● ON     │ │    ● ON     │ │    ● ON     │ │    ● ON     │
| │ RTP: 2356/s │ │ PCM: 340/s  │ │ PCM: 340/s  │ │ Text: 12/s  │
| │ L: 45ms     │ │ L: 120ms    │ │ L: 210ms    │ │ L: 180ms    │
| │     [↗]     │ │     [↗]     │ │     [↗]     │ │     [↗]     │
| └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
|
| ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
| │5. Translation│ │6. DeepL API │ │ 7. TTS Prep │ │8. ElevenLabs│
| │    ● ON     │ │    ● ON     │ │    ● ON     │ │    ● ON     │
| │ Req: 12/s   │ │ API: 100%   │ │ Text: 12/s  │ │ PCM: 340/s  │
| │ L: 95ms     │ │ L: 85ms     │ │ L: 15ms     │ │ L: 220ms    │
| │     [↗]     │ │     [↗]     │ │     [↗]     │ │     [↗]     │
| └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
|
| ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
| │9. STT TX    │ │10. Gateway  │ │11. Hume EVI │
| │    ● ON     │ │    ● ON     │ │    ⚠️ OFF   │
| │ PCM: 340/s  │ │ RTP: 2356/s │ │   Disabled  │
| │ L: 45ms     │ │ L: 120ms    │ │ Quota Limit │
| │     [↗]     │ │     [↗]     │ │     [↗]     │
| └─────────────┘ └─────────────┘ └─────────────┘
+------------------------------------------------------------------+
| [▼ Global AI Optimization Panel - Currently Manual Mode]         |
+------------------------------------------------------------------+
```

**Design Requirements**:
- Dark theme (backoffice style)
- Minimal colors (green/yellow/red for status only)
- Clean, straight lines
- Professional appearance
- Real-time data updates via WebSocket

### 3.2 Level 2: Expanded Station View (Click on [↗])

When clicking expansion icon, the station card expands to full screen showing all metrics:

```
+------------------------------------------------------------------+
| [←] STATION 3: STT Processing (Deepgram)        [📊] [⚙️] [✖️]   |
+------------------------------------------------------------------+
| Audio Waveform Visualization (Real-time PCM)                     |
| ▁▃▅▇█▇▅▃▁▁▃▅▇█▇▅▃▁▁▃▅▇█▇▅▃▁                    ● Recording   |
+------------------------------------------------------------------+
| MONITORING METRICS (14 Active Parameters)                        |
| ┌──────────────────────┐ ┌──────────────────────┐               |
| │ Buffer Metrics       │ │ Latency Metrics      │               |
| │ ▪ Total: 45%  [████] │ │ ▪ Avg: 210ms  [███]  │               |
| │ ▪ Input: 30%  [███ ] │ │ ▪ Peak: 450ms [████] │               |
| │ ▪ Output: 60% [████] │ │ ▪ Min: 120ms  [██  ] │               |
| │         [Edit ↗]     │ │         [Edit ↗]     │               |
| └──────────────────────┘ └──────────────────────┘               |
| ┌──────────────────────┐ ┌──────────────────────┐               |
| │ Packet Metrics       │ │ Audio Quality        │               |
| │ ▪ RX: 34,560  [||||] │ │ ▪ SNR: 45dB   [████] │               |
| │ ▪ TX: 34,555  [||||] │ │ ▪ THD: 0.02%  [█   ] │               |
| │ ▪ Loss: 0.01% [█   ] │ │ ▪ MOS: 4.8    [████] │               |
| │         [Edit ↗]     │ │         [Edit ↗]     │               |
| └──────────────────────┘ └──────────────────────┘               |
+------------------------------------------------------------------+
| KNOBS & CONTROLS                                                 |
| ┌─────────────────────────────────────────────────────────┐     |
| │ chunk_ms:     [250] ══════●═══ (50-1000, Pref: 200-350) │     |
| │ vad_threshold:[0.5] ═════●════ (0-1, Pref: 0.4-0.6)     │     |
| │ sample_rate:  [16000] ● 8000 ● 16000 ○ 44100           │     |
| │ [Apply Changes] [Reset to Default] [Save as Default]    │     |
| └─────────────────────────────────────────────────────────┘     |
+------------------------------------------------------------------+
```

### 3.3 Level 3: Metric Editor (Click on metric [Edit ↗])

Double-click or expansion on a specific metric opens the editor:

```
+------------------------------------------------------------------+
| [←] Metric Editor: latency.avg @ STATION 3                      |
+------------------------------------------------------------------+
| Current Value: 210 ms                                           |
| ━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━           |
| 0ms            210ms                              1000ms        |
+------------------------------------------------------------------+
| Range Configuration:                                            |
| • Legal Range:     [0    ] to [1000 ] ms                       |
| • Preferred Range: [80   ] to [250  ] ms ✓ (within range)      |
| • Warning Level:   [300  ] ms                                  |
| • Critical Level:  [500  ] ms                                  |
| • Target Optimum:  [150  ] ms                                  |
+------------------------------------------------------------------+
| Historical Graph (Last 60 seconds):                            |
| 300│      ╱╲                                                   |
| 250│  ╱╲ ╱  ╲    ╱╲                                           |
| 200│ ╱  ╲    ╲  ╱  ╲  ━━━━━━━━━━━━━━━━━ current              |
| 150│─────────╲╱────╲╱───────────────── target                 |
| 100│                                                           |
|    └────────────────────────────────────────────────────      |
+------------------------------------------------------------------+
| Influencing Knobs (click to adjust):                           |
| • chunk_ms (STATION_3)        Current: 250  [Adjust →]         |
| • vad_threshold (STATION_3)   Current: 0.5  [Adjust →]         |
| • jitter_buffer (STATION_1)   Current: 40ms [Adjust →]         |
+------------------------------------------------------------------+
| [✓] High Priority for AI Optimization                          |
| [Apply Custom Thresholds] [Reset] [Save as Default]            |
+------------------------------------------------------------------+
```

---

## 4. Implementation Requirements

### 4.1 Frontend Files to Create/Modify

| File | Purpose | Priority | Status |
|------|---------|----------|--------|
| monitoring-tree-dashboard.html | Main dashboard | HIGH | ⚠️ Needs redesign |
| css/monitoring-dark-theme.css | Dark professional theme | HIGH | ❌ Create |
| js/station-grid.js | Level 1 grid manager | HIGH | ❌ Create |
| js/station-expander.js | Level 2 expansion logic | HIGH | ❌ Create |
| js/metric-editor.js | Level 3 editor | MEDIUM | ❌ Create |
| js/websocket-client.js | Real-time updates | HIGH | ⚠️ Enhance |
| js/chart-renderer.js | Graphs and waveforms | MEDIUM | ❌ Create |

### 4.2 Backend Enhancements Needed

| Component | Enhancement | Priority | Location |
|-----------|------------|----------|----------|
| station-parameter-map.js | Add stations 9-11 | HIGH | /monitoring/config/ |
| monitoring-server-real-data.js | Add knob control API | HIGH | Production server |
| /api/apply endpoint | Knob changes | HIGH | New endpoint |
| /api/knobs endpoint | Knob definitions | MEDIUM | New endpoint |
| WebSocket events | Enhanced streaming | MEDIUM | Existing |

### 4.3 Monitoring Square Module Architecture

Each monitoring square should be a self-contained module:

```javascript
// monitoring-square.js
class MonitoringSquare {
  constructor(config) {
    this.stationId = config.stationId;
    this.type = config.type; // 'station', 'metric', 'control'
    this.level = 1; // 1=grid, 2=expanded, 3=editor
    this.parameters = config.parameters;
    this.element = null;
  }

  render() {
    // Renders based on current level
  }

  expand() {
    // Expands to next level
    this.level++;
    this.render();
  }

  collapse() {
    // Returns to previous level
    this.level--;
    this.render();
  }

  updateMetrics(data) {
    // Real-time metric updates
  }

  applyKnobChange(knob, value) {
    // Apply parameter changes
  }
}
```

---

## 5. UI Design Specifications

### Color Palette (Dark Theme)
```css
:root {
  --bg-primary: #0a0a0a;      /* Main background */
  --bg-secondary: #1a1a1a;    /* Card background */
  --bg-tertiary: #2a2a2a;     /* Input background */
  --text-primary: #e0e0e0;    /* Main text */
  --text-secondary: #a0a0a0;  /* Secondary text */
  --accent-success: #00c851;  /* Online/Good */
  --accent-warning: #ffbb33;  /* Warning */
  --accent-danger: #ff3547;   /* Critical/Offline */
  --accent-info: #33b5e5;     /* Info/Links */
  --border: #333333;          /* Borders */
}
```

### Typography
```css
body {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.metric-value {
  font-family: 'Roboto Mono', monospace;
  font-weight: 500;
}
```

### Grid Layout (Level 1)
- 4 columns for desktop (1920px)
- 3 columns for tablet (1024px)
- 2 columns for mobile (768px)
- Card aspect ratio: 4:3
- Gap: 16px
- Padding: 20px

---

## 6. Development Timeline

### Week 1: UI Foundation
```
Day 1-2: Create dark theme CSS and grid layout
Day 3: Implement Level 1 station grid with 11 stations
Day 4: Add WebSocket integration for real-time updates
Day 5: Test with live data from monitoring-server
```

### Week 2: Interaction & Expansion
```
Day 6-7: Implement Level 2 station expansion
Day 8: Add interactive charts and waveforms
Day 9: Implement Level 3 metric editor
Day 10: Add knob controls with validation
```

### Week 3: Backend Integration
```
Day 11: Add /api/apply endpoint for knob changes
Day 12: Integrate with STTTTSserver parameters
Day 13: Add persistence for custom defaults
Day 14: Implement parameter validation
Day 15: Testing and bug fixes
```

### Week 4: Polish & Optimization
```
Day 16-17: Performance optimization
Day 18: Cross-browser testing
Day 19: Documentation
Day 20: Deployment
```

---

## 7. Specific Station Configurations

### Voice Stations (Need Audio Monitoring)
```javascript
const voiceStations = {
  'STATION-1': { name: 'Asterisk RTP', metrics: ['packet.*', 'latency.*', 'audio.*'] },
  'STATION-2': { name: 'Gateway RX', metrics: ['packet.*', 'buffer.*', 'audio.*'] },
  'STATION-3': { name: 'STT Processing', metrics: ['latency.*', 'audio.*', 'custom.*'] },
  'STATION-4': { name: 'Deepgram API', metrics: ['latency.*', 'performance.*'] },
  'STATION-8': { name: 'ElevenLabs TTS', metrics: ['latency.*', 'audio.*'] },
  'STATION-9': { name: 'STT Server TX', metrics: ['packet.*', 'buffer.*'] },
  'STATION-10': { name: 'Gateway TX', metrics: ['packet.*', 'latency.*'] },
  'STATION-11': { name: 'Hume EVI', metrics: ['latency.*', 'custom.*'] }
};
```

### Text Stations (No Audio Monitoring)
```javascript
const textStations = {
  'STATION-5': { name: 'Translation Prep', metrics: ['performance.*', 'custom.*'] },
  'STATION-6': { name: 'DeepL API', metrics: ['latency.*', 'performance.*'] },
  'STATION-7': { name: 'TTS Prep', metrics: ['performance.*', 'custom.*'] }
};
```

---

## 8. Critical Implementation Notes

### 8.1 Real Data Integration
The monitoring server is ALREADY collecting real data from:
- Gateway logs (`/tmp/gateway-3333-operational.log`)
- STTTTSserver logs (`/tmp/stttts-fresh.log`)
- Deepgram/DeepL/ElevenLabs API responses

**No simulation needed** - use actual metrics!

### 8.2 Modular Architecture
Each monitoring square must be:
- Self-contained module
- Configurable via JSON
- Support 3 display levels
- Handle real-time updates
- Support parameter editing

### 8.3 Parameter Persistence
```javascript
// Parameter storage structure
const stationParameters = {
  'STATION-3': {
    'chunk_ms': {
      current: 250,
      default: 300,
      custom: 250,
      legal: [50, 1000],
      preferred: [200, 350]
    }
  }
};
```

---

## 9. Next Immediate Steps

1. **TODAY**: Update station-parameter-map.js to include all 11 stations
2. **TODAY**: Create dark theme CSS file
3. **TOMORROW**: Build Level 1 grid with 11 station cards
4. **THIS WEEK**: Implement expand/collapse functionality
5. **THIS WEEK**: Add real-time WebSocket updates

---

## 10. Conclusion

The monitoring infrastructure **EXISTS and is RUNNING**. We don't need to build the backend from scratch. The focus should be on:

1. **UI Development**: Professional dark-theme dashboard with 11 stations
2. **Modular Components**: Reusable monitoring squares
3. **Three-Level Navigation**: Grid → Station → Metric
4. **Real-Time Updates**: Already working via WebSocket
5. **Knob Control**: Add API endpoints for parameter adjustment

The system has a solid foundation with all 75 parameters defined. Now we need to build the professional UI layer and configure all 11 monitoring stations properly.

---

**End of Revised Gap Analysis & UI Development Plan**
**Generated**: 2025-11-29
**Focus**: UI Development for existing monitoring infrastructure