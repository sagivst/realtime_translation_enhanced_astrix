# Audio Quality Monitoring System - 3-Level Nested Modular Architecture
## Real-Time WebSocket Monitoring with Parameter Configuration System

**Document Version:** 4.0
**Date:** 2025-11-26
**System:** 3333/4444 Real-Time Translation Audio Monitoring
**Server:** Azure VM http://20.170.155.53/
**Major Update:** Complete 3-level nested architecture with parameter configuration and edit mode

---

## 🎯 Executive Summary

Comprehensive real-time audio quality monitoring dashboard with:
- ✅ **3-Level Nested Architecture** - Stations → Parameters → Edit Mode
- ✅ **WebSocket Real-Time Updates** - Live metrics via Socket.IO
- ✅ **Modular Monitoring Boxes** - Consistent design at all levels
- ✅ **Parameter Configuration System** - File-based parameter management
- ✅ **Parameter Edit Mode** - Live parameter tuning with legal ranges
- ✅ **Test Audio Generator** - Built-in test stream generator for QA
- ✅ **Dynamic Station Registration** - Scalable to unlimited stations
- ✅ **Generic QA Architecture** - Designed for testing and validation

**Architecture Vision:**
3-level nested modular monitoring system with expandable boxes at each level. Level 1 displays 8 station boxes. Click expand on a station to show Level 2 with 55 parameter boxes (similar design/dimensions to Level 1). Click expand on a parameter to enter Level 3 edit mode with parameter path, legal ranges, and default value management. All parameter values sourced from configuration files for live tuning.

---

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [3-Level Nested Architecture Design](#3-level-nested-architecture-design)
3. [Parameter Configuration System](#parameter-configuration-system)
4. [File Structure](#file-structure)
5. [Monitoring Server](#monitoring-server)
6. [Test Audio Generator](#test-audio-generator)
7. [Modular MonitoringBox Component](#modular-monitoringbox-component)
8. [WebSocket Communication](#websocket-communication)
9. [API Reference](#api-reference)
10. [Current Implementation Status](#current-implementation-status)
11. [Next Steps](#next-steps)

---

## 🏗️ System Architecture

### Two-Server Design

```
┌────────────────────────────────────────────────────────┐
│  PRODUCTION SERVER (Port 3020)                        │
│  - STTTTSserver.js                                    │
│  - Real-time translation audio pipeline              │
│  - NEVER MODIFIED - Protected                         │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  MONITORING SERVER (Port 3021) ⭐ NEW                 │
│  - monitoring-server.js                               │
│  - Socket.IO WebSocket server                         │
│  - Test audio generator integration                   │
│  - 8 hardcoded monitoring stations                    │
│  - Real-time metrics simulation                       │
└────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────┐
│  WEB DASHBOARD LAYER                                  │
│  - monitoring-tree-dashboard.html (Level 1)           │
│  - station-detail.html (Level 2) [PENDING]            │
│  - monitoring-box.js (Modular component)              │
│  - monitoring-box.css (Component styles) [PENDING]    │
└────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────┐     WebSocket      ┌──────────────────┐
│  Monitoring │ ←──────────────→  │  Tree Dashboard  │
│   Server    │   (Socket.IO)      │   (Level 1)      │
│  Port 3021  │                     │  Real-time View  │
└─────────────┘                     └──────────────────┘
       │                                     │
       │ Metrics Updates                    │ Click Station
       │ Every 1 second                     ↓
       ↓                            ┌──────────────────┐
┌─────────────┐                    │ Station Detail   │
│ 8 Stations  │                    │   (Level 2)      │
│ Simulated   │                    │ MonitoringBox    │
└─────────────┘                    └──────────────────┘
```

---

## 🌳 3-Level Nested Architecture Design

### Overview: 3-Level Modular Expandable System

**Core Concept:**
3-level nested modular monitoring system with consistent box design at each level. Click expand icon (⛶) on any box to drill down to the next level. Click collapse to navigate back up.

**Navigation Flow:**
```
Level 1: Main Dashboard (8 Station Boxes)
   ⛶ Expand Station
      ↓
Level 2: Parameter Grid (55 Parameter Boxes - similar design to Level 1)
   ⛶ Expand Parameter
      ↓
Level 3: Parameter Edit Mode (Edit interface with ranges & defaults)
   ⛶ Collapse
      ↓
   Return to Level 2 or Level 1
```

**Total Box Count:**
- Level 1: 8 station boxes
- Level 2: 440 total parameter boxes (8 stations × 55 parameters each)
- Level 3: Single parameter detail/edit view

---

### Level 1: Main Dashboard - Station Boxes

**File:** `audio-quality-monitoring.html`
**Purpose:** Main entry point showing all 8 monitoring stations as compact boxes

**Features:**
- Grid layout displaying all 8 stations simultaneously
- Each station shown as a compact monitoring box
- Quick summary metrics visible: Buffer, Latency, Packets, Status
- Expand icon (⛶) in top-right corner of each box
- ON/OFF status indicators with pulse animation
- Stats aggregation bar showing system-wide metrics
- Click expand (⛶) → Navigate to Level 2 (parameter grid)

**8 Monitoring Stations:**
```
1. Station 1: ARI Receive      (ari-rx)
2. Station 2: STT Processing   (stt)
3. Station 3: Translation      (translate)
4. Station 4: TTS Generation   (tts)
5. Station 5: Audio Convert    (convert)
6. Station 6: UDP Send         (udp-tx)
7. Station 7: Buffer Monitor   (buffer)
8. Station 8: Gateway Send     (gateway)
```

**Visual Design (Compact Grid View):**
```
┌─────────────────────────────────────────────────────────┐
│ 🎧 Audio Quality Monitoring Dashboard                   │
│ ● CONNECTED  |  Server: localhost:3021                 │
├─────────────────────────────────────────────────────────┤
│ Total: 8  |  Active: 5  |  Inactive: 3                 │
│ Avg Buffer: 45%  |  Avg Latency: 52ms                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │ Station 1  │  │ Station 2  │  │ Station 3  │       │
│  │ ● ON       │  │ ● ON       │  │ ○ OFF      │       │
│  │ Buffer: 45%│  │ Buffer: 32%│  │ Buffer: --  │       │
│  │ Latency:45ms│  │ Latency:38ms│  │ Latency:-- │       │
│  │ Packets:1.2K│  │ Packets:980│  │ Packets:0  │       │
│  │ [Details →]│  │ [Details →]│  │ [Details →]│       │
│  └────────────┘  └────────────┘  └────────────┘       │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │ Station 4  │  │ Station 5  │  │ Station 6  │       │
│  │ ● ON       │  │ ● ON       │  │ ● ON       │       │
│  │ Buffer: 52%│  │ Buffer: 41%│  │ Buffer: 78%│       │
│  │ Latency:61ms│  │ Latency:48ms│  │ Latency:245ms│    │
│  │ Packets:1.5K│  │ Packets:1.1K│  │ Packets:2.4K│     │
│  │ [⛶ Expand] │  │ [⛶ Expand] │  │ [⛶ Expand] │       │
│  └────────────┘  └────────────┘  └────────────┘       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

### Level 2: Parameter Grid - 55 Parameter Boxes Per Station

**Purpose:** Drill down into a single station to view all 55 monitored parameters as individual boxes

**Critical Design Requirement:**
> "every box for a matrix monitored... **similar design and dimensions** [to Level 1 boxes]"

**Features:**
- Grid of 55 parameter boxes (similar visual design to Level 1 station boxes)
- Each box monitors ONE specific parameter with real-time value
- Expand icon (⛶) on each parameter box
- Color-coded status (green/yellow/red based on thresholds)
- Collapse icon (⛶) at top to return to Level 1
- Click expand on any parameter → Navigate to Level 3 (edit mode)

**55 Parameters Per Station:**
```
Buffer Parameters (10):
1.  Total Buffer Usage (%)
2.  Input Buffer Level (%)
3.  Processing Buffer Level (%)
4.  Output Buffer Level (%)
5.  Buffer Overrun Count
6.  Buffer Underrun Count
7.  Buffer High Water Mark (%)
8.  Buffer Low Water Mark (%)
9.  Buffer Allocation Size (KB)
10. Buffer Free Space (KB)

Latency Parameters (8):
11. Average Latency (ms)
12. Peak Latency (ms)
13. Min Latency (ms)
14. Jitter (ms)
15. End-to-End Latency (ms)
16. Processing Latency (ms)
17. Network Latency (ms)
18. Latency Variance (ms)

Packet Parameters (12):
19. Packets Received
20. Packets Transmitted
21. Packets Dropped
22. Packet Loss Rate (%)
23. Packet Error Count
24. Packet Retransmission Count
25. Out-of-Order Packets
26. Duplicate Packets
27. Bytes Received (KB)
28. Bytes Transmitted (KB)
29. Throughput RX (Kbps)
30. Throughput TX (Kbps)

Audio Quality Parameters (10):
31. Sample Rate (Hz)
32. Bit Depth (bits)
33. Channels (mono/stereo)
34. Audio Format (codec)
35. Clipping Events Count
36. Silence Period Count
37. Silence Duration Total (ms)
38. Audio Level (dBFS)
39. Signal-to-Noise Ratio (dB)
40. Total Harmonic Distortion (%)

Performance Parameters (8):
41. CPU Usage (%)
42. Memory Usage (MB)
43. Thread Count
44. Active Connections
45. Queue Depth
46. Processing Rate (ops/sec)
47. Error Rate (errors/min)
48. Uptime (seconds)

Custom Station Parameters (7):
49. Station State (active/inactive/error)
50. Last Activity Timestamp
51. Total Processed Items
52. Processing Speed (items/sec)
53. Success Rate (%)
54. Warning Count
55. Critical Event Count
```

**Visual Design (Parameter Grid View):**
```
┌─────────────────────────────────────────────────────────┐
│ Station 6: UDP Send          [⛶ Back to Stations]      │
├─────────────────────────────────────────────────────────┤
│ 55 Parameters | 52 Active | 3 Warning                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Total Buf │ │Input Buf │ │Proc. Buf │ │Output Buf│  │
│  │  78.5%   │ │  65.2%   │ │  52.1%   │ │  39.8%   │  │
│  │ ⚠ WARNING│ │ ✓ GOOD   │ │ ✓ GOOD   │ │ ✓ GOOD   │  │
│  │[⛶ Expand]│ │[⛶ Expand]│ │[⛶ Expand]│ │[⛶ Expand]│  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Avg Lat.  │ │Peak Lat. │ │Jitter    │ │E2E Lat.  │  │
│  │ 245.8ms  │ │ 298.2ms  │ │ 125.3ms  │ │ 312.5ms  │  │
│  │ ⚠ WARNING│ │ ⚠ WARNING│ │ ✗ CRITICAL│ │ ⚠ WARNING│  │
│  │[⛶ Expand]│ │[⛶ Expand]│ │[⛶ Expand]│ │[⛶ Expand]│  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                          │
│  [... 47 more parameter boxes in similar grid layout]   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

### Level 3: Parameter Edit Mode - Live Parameter Tuning

**Purpose:** Enter edit mode for a single parameter to view/modify configuration

**User Specification:**
> "At the third level, we enter edit mode for the parameter, which will display the path, including the legal and appropriate ranges for the parameter to be updated + an option to make it the default..."

**Features:**
- Full-screen edit interface for ONE parameter
- Display parameter path (e.g., `station-6.udp-tx.buffer.total`)
- Show current value and real-time updates
- Display legal value ranges (min/max constraints)
- Display appropriate/recommended ranges
- Input field for new value with validation
- "Set as Default" checkbox
- Save button → Update parameter file
- Cancel button → Discard changes
- Collapse icon (⛶) → Return to Level 2

**Parameter Value Source:**
All parameter values are sourced from parameter configuration files (NOT hardcoded). Level 3 edits update these files, which are then read by the monitoring system.

**Visual Design (Parameter Edit Mode):**
```
┌─────────────────────────────────────────────────────────┐
│ Edit Parameter              [⛶ Back to Parameters]     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 📝 PARAMETER DETAILS                                    │
│                                                          │
│ Parameter Name:  Total Buffer Usage                    │
│ Parameter Path:  station-6.udp-tx.buffer.total         │
│ Unit:            Percentage (%)                         │
│ Type:            Monitored (Read-Only Display)          │
│                                                          │
│ ├─────────────────────────────────────────────────────┤ │
│                                                          │
│ 📊 CURRENT VALUE                                        │
│                                                          │
│         78.5%                                           │
│    [████████████████████░░░░░░] ⚠ WARNING              │
│                                                          │
│ Last Updated: 2025-11-26 14:32:45                      │
│ Update Rate:  1 second (real-time)                     │
│                                                          │
│ ├─────────────────────────────────────────────────────┤ │
│                                                          │
│ 📏 LEGAL RANGES                                         │
│                                                          │
│ Absolute Min:    0%        (Hard limit - system crash) │
│ Absolute Max:    100%      (Hard limit - overflow)     │
│                                                          │
│ Recommended Min: 20%       (Below triggers warning)    │
│ Recommended Max: 80%       (Above triggers warning)    │
│                                                          │
│ Critical Min:    10%       (Below triggers critical)   │
│ Critical Max:    95%       (Above triggers critical)   │
│                                                          │
│ ├─────────────────────────────────────────────────────┤ │
│                                                          │
│ ⚙️ THRESHOLD CONFIGURATION                              │
│                                                          │
│ Warning Low Threshold:  [20] %  [Set as Default] ☐    │
│ Warning High Threshold: [80] %  [Set as Default] ☐    │
│                                                          │
│ Critical Low Threshold:  [10] %  [Set as Default] ☐   │
│ Critical High Threshold: [95] %  [Set as Default] ☐   │
│                                                          │
│ Alert Behavior:                                         │
│ ☑ Enable Audio Alert                                   │
│ ☑ Enable Visual Pulse Animation                        │
│ ☐ Enable Email Notification                            │
│ ☐ Enable Webhook Call                                  │
│                                                          │
│ [Save Changes]  [Reset to Defaults]  [Cancel]         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Parameter Configuration System

### Overview

**Purpose:**
Centralized file-based parameter management system that allows dynamic configuration of all monitoring parameters across all stations without code changes.

**User Specification:**
> "To implement such a solution, we will need to map all the updated values for each station, copy them to a parameter file, and change the source of the value to the parameter file, which will be updated by the third level..."

**Key Concepts:**
1. **File-Based Storage**: All parameter configurations stored in JSON files
2. **Dynamic Value Sourcing**: System reads parameter values from files (NOT hardcoded)
3. **Live Updates**: Changes to parameter files reflected in real-time monitoring
4. **Default Management**: Ability to save current values as system defaults
5. **Per-Station Configuration**: Each station has its own parameter file
6. **Version Control**: Parameter file changes tracked with timestamps

---

### File Structure

**Base Directory:**
```
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/config/parameters/
```

**File Organization:**
```
config/
└── parameters/
    ├── defaults/                    # System default parameter files
    │   ├── station-defaults.json    # Default thresholds for all stations
    │   └── parameter-schema.json    # Parameter definitions and constraints
    │
    ├── stations/                    # Per-station configuration files
    │   ├── station-1.json           # ARI Receive parameters
    │   ├── station-2.json           # STT Processing parameters
    │   ├── station-3.json           # Translation parameters
    │   ├── station-4.json           # TTS Generation parameters
    │   ├── station-5.json           # Audio Convert parameters
    │   ├── station-6.json           # UDP Send parameters
    │   ├── station-7.json           # Buffer Monitor parameters
    │   └── station-8.json           # Gateway Send parameters
    │
    └── history/                     # Parameter change history
        └── YYYY-MM-DD/              # Daily change logs
            ├── station-1-changes.json
            ├── station-2-changes.json
            └── ...
```

---

### Parameter File Format

**Example: `config/parameters/stations/station-6.json`**
```json
{
  "stationId": "station-6",
  "stationName": "UDP Send",
  "stationType": "udp-tx",
  "lastModified": "2025-11-26T14:32:45.123Z",
  "modifiedBy": "dashboard-user",
  "version": "1.2.3",

  "parameters": {
    "buffer": {
      "total": {
        "thresholds": {
          "warningLow": 20,
          "warningHigh": 80,
          "criticalLow": 10,
          "criticalHigh": 95
        },
        "alerts": {
          "audioAlert": true,
          "visualPulse": true,
          "emailNotification": false,
          "webhookUrl": null
        },
        "isDefault": false
      },
      "input": {
        "thresholds": {
          "warningLow": 15,
          "warningHigh": 85,
          "criticalLow": 5,
          "criticalHigh": 95
        },
        "alerts": {
          "audioAlert": true,
          "visualPulse": true,
          "emailNotification": false,
          "webhookUrl": null
        },
        "isDefault": true
      }
      // ... all 10 buffer parameters
    },
    "latency": {
      "average": {
        "thresholds": {
          "warningLow": 0,
          "warningHigh": 100,
          "criticalLow": 0,
          "criticalHigh": 200
        },
        "alerts": {
          "audioAlert": true,
          "visualPulse": true,
          "emailNotification": true,
          "webhookUrl": "https://example.com/webhook"
        },
        "isDefault": false
      }
      // ... all 8 latency parameters
    }
    // ... all 55 parameters organized by category
  }
}
```

---

### Parameter Schema Definition

**File: `config/parameters/defaults/parameter-schema.json`**
```json
{
  "parameters": {
    "buffer.total": {
      "name": "Total Buffer Usage",
      "path": "buffer.total",
      "unit": "%",
      "type": "monitored",
      "dataType": "float",
      "constraints": {
        "absoluteMin": 0,
        "absoluteMax": 100,
        "recommendedMin": 20,
        "recommendedMax": 80,
        "criticalMin": 10,
        "criticalMax": 95
      },
      "defaultThresholds": {
        "warningLow": 20,
        "warningHigh": 80,
        "criticalLow": 10,
        "criticalHigh": 95
      },
      "editable": true,
      "requiresRestart": false,
      "description": "Percentage of total buffer currently in use"
    },
    "buffer.input": {
      "name": "Input Buffer Level",
      "path": "buffer.input",
      "unit": "%",
      "type": "monitored",
      "dataType": "float",
      "constraints": {
        "absoluteMin": 0,
        "absoluteMax": 100,
        "recommendedMin": 15,
        "recommendedMax": 85,
        "criticalMin": 5,
        "criticalMax": 95
      },
      "defaultThresholds": {
        "warningLow": 15,
        "warningHigh": 85,
        "criticalLow": 5,
        "criticalHigh": 95
      },
      "editable": true,
      "requiresRestart": false,
      "description": "Percentage of input buffer currently in use"
    }
    // ... definitions for all 55 parameters
  }
}
```

---

### Implementation Workflow

**1. System Startup:**
```javascript
// monitoring-server.js
const ParameterConfigManager = require('./modules/parameter-config-manager');
const paramConfig = new ParameterConfigManager();

// Load parameter files for all stations
await paramConfig.loadAllStations();

// Initialize monitoring with parameter thresholds
stations.forEach(station => {
  const config = paramConfig.getStationConfig(station.id);
  station.thresholds = config.parameters;
});
```

**2. Real-Time Monitoring:**
```javascript
// Check metrics against configured thresholds
function evaluateMetric(stationId, parameterPath, value) {
  const thresholds = paramConfig.getThreshold(stationId, parameterPath);

  if (value >= thresholds.criticalHigh || value <= thresholds.criticalLow) {
    return 'critical';
  } else if (value >= thresholds.warningHigh || value <= thresholds.warningLow) {
    return 'warning';
  } else {
    return 'good';
  }
}
```

**3. Level 3 Parameter Edit:**
```javascript
// User edits parameter in Level 3
app.post('/api/parameters/:stationId/:paramPath', async (req, res) => {
  const { stationId, paramPath } = req.params;
  const { thresholds, alerts, setAsDefault } = req.body;

  // Validate against schema
  const schema = paramConfig.getParameterSchema(paramPath);
  if (thresholds.warningHigh > schema.constraints.absoluteMax) {
    return res.status(400).json({ error: 'Threshold exceeds absolute maximum' });
  }

  // Update station parameter file
  await paramConfig.updateParameter(stationId, paramPath, {
    thresholds,
    alerts,
    isDefault: setAsDefault
  });

  // If "Set as Default", also update default file
  if (setAsDefault) {
    await paramConfig.updateDefaultParameter(paramPath, thresholds);
  }

  // Log change to history
  await paramConfig.logParameterChange(stationId, paramPath, {
    oldThresholds: currentThresholds,
    newThresholds: thresholds,
    timestamp: new Date(),
    user: req.user || 'dashboard-user'
  });

  // Broadcast update to all connected clients
  io.emit('parameter-updated', {
    stationId,
    paramPath,
    thresholds
  });

  res.json({ success: true });
});
```

**4. Default Value Management:**
```javascript
// Reset parameter to default
app.post('/api/parameters/:stationId/:paramPath/reset', async (req, res) => {
  const { stationId, paramPath } = req.params;

  // Load default from schema
  const defaultThresholds = paramConfig.getDefaultThresholds(paramPath);

  // Update station file with defaults
  await paramConfig.updateParameter(stationId, paramPath, {
    thresholds: defaultThresholds,
    isDefault: true
  });

  res.json({ success: true, thresholds: defaultThresholds });
});
```

---

### API Endpoints for Parameter Management

**Get Parameter Configuration:**
```
GET /api/parameters/:stationId/:paramPath

Response:
{
  "stationId": "station-6",
  "paramPath": "buffer.total",
  "name": "Total Buffer Usage",
  "currentValue": 78.5,
  "unit": "%",
  "thresholds": {
    "warningLow": 20,
    "warningHigh": 80,
    "criticalLow": 10,
    "criticalHigh": 95
  },
  "constraints": {
    "absoluteMin": 0,
    "absoluteMax": 100,
    "recommendedMin": 20,
    "recommendedMax": 80
  },
  "alerts": {
    "audioAlert": true,
    "visualPulse": true,
    "emailNotification": false
  },
  "isDefault": false,
  "lastModified": "2025-11-26T14:32:45.123Z"
}
```

**Update Parameter Configuration:**
```
POST /api/parameters/:stationId/:paramPath

Body:
{
  "thresholds": {
    "warningLow": 25,
    "warningHigh": 75,
    "criticalLow": 15,
    "criticalHigh": 90
  },
  "alerts": {
    "audioAlert": true,
    "visualPulse": true,
    "emailNotification": true,
    "webhookUrl": "https://example.com/alert"
  },
  "setAsDefault": true
}

Response:
{
  "success": true,
  "updated": true,
  "savedAsDefault": true
}
```

**Get All Station Parameters:**
```
GET /api/parameters/:stationId

Response:
{
  "stationId": "station-6",
  "stationName": "UDP Send",
  "parameters": {
    "buffer": { /* all 10 buffer parameters */ },
    "latency": { /* all 8 latency parameters */ },
    "packet": { /* all 12 packet parameters */ },
    "audioQuality": { /* all 10 audio parameters */ },
    "performance": { /* all 8 performance parameters */ },
    "custom": { /* all 7 custom parameters */ }
  },
  "lastModified": "2025-11-26T14:32:45.123Z"
}
```

**Reset Parameter to Default:**
```
POST /api/parameters/:stationId/:paramPath/reset

Response:
{
  "success": true,
  "thresholds": {
    "warningLow": 20,
    "warningHigh": 80,
    "criticalLow": 10,
    "criticalHigh": 95
  }
}
```

---

### Benefits of Parameter Configuration System

1. **No Code Changes Required**: All threshold adjustments done through configuration files
2. **Live Tuning**: Parameters updated in real-time without server restart
3. **Per-Station Customization**: Each station can have different thresholds for same parameter
4. **Default Management**: Easy to save/restore default configurations
5. **Change Tracking**: Complete history of all parameter modifications
6. **Validation**: Schema enforces legal ranges to prevent invalid configurations
7. **Scalability**: Easy to add new parameters without code changes
8. **Auditability**: Who changed what and when is fully logged

---

**Key Code:**
```javascript
// WebSocket connection
const socket = io('http://localhost:3021');
let stations = {};
let expandedStationId = null; // Track which station is expanded

socket.on('stations-state', (data) => {
  stations = data;
  renderDashboard();
  updateStats();
});

socket.on('station-update', (data) => {
  const { stationId, metrics } = data;
  if (stations[stationId]) {
    stations[stationId].metrics = metrics;
    if (expandedStationId === stationId) {
      // Update expanded MonitoringBox
      window.monitoringBoxes[stationId]?.update(metrics);
    } else {
      // Update compact card
      updateStationCard(stationId);
    }
    updateStats();
  }
});

function expandStation(stationId) {
  expandedStationId = stationId;
  document.getElementById('compactGrid').style.display = 'none';
  document.getElementById('expandedView').style.display = 'block';

  // Create full MonitoringBox for this station
  const box = new MonitoringBox('expandedView', stations[stationId]);
  window.monitoringBoxes[stationId] = box;
}

function collapseStation() {
  expandedStationId = null;
  document.getElementById('expandedView').style.display = 'none';
  document.getElementById('compactGrid').style.display = 'grid';
  renderDashboard();
}
```

### Expandable Box Interaction Flow

**User Flow:**
1. User sees grid of all stations in compact view
2. User clicks expand icon (⛶) on Station 6
3. Grid fades out, Station 6 box expands to fill screen
4. Full MonitoringBox component displays with all parameters
5. User interacts with controls (LOG, WAV, etc.)
6. User clicks collapse icon (⛶) to return
7. Station 6 shrinks, grid fades back in
```
┌─────────────────────────────────────────────────────────┐
│ Station 6: UDP Send                                     │
│ station-6  [ACTIVE]                                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 📊 BUFFER METRICS                                       │
│ Total Buffer Usage                                      │
│ [████████████████████░░░░░░] 78.0%                     │
│                                                          │
│ Input Buffer:      [██████████░░] 65%                  │
│ Processing Buffer: [███████░░░░░] 52%                  │
│ Output Buffer:     [█████░░░░░░░] 39%                  │
│                                                          │
│ ⏱️ LATENCY METRICS                                      │
│          245.8 ms                                       │
│      Average Latency                                    │
│                                                          │
│ [Sparkline Graph - 60 seconds of history]              │
│                                                          │
│ Peak: 298ms  |  Min: 198ms  |  Jitter: 125ms           │
│                                                          │
│ 📦 PACKET FLOW                                          │
│  ┌─────┐                    ┌─────┐                    │
│  │ RX  │  ────────────────→ │ TX  │                    │
│  │2,456│                    │2,401│                    │
│  └─────┘                    └─────┘                    │
│                                                          │
│ Dropped: 55  |  Errors: 0  |  Bytes RX: 393 KB         │
│                                                          │
│ 🎵 AUDIO QUALITY                                        │
│ Sample Rate: 16000 Hz  ✓   |  Bit Depth: 16-bit PCM ✓ │
│ Clipping Events: 0         |  Silence Periods: 2       │
│                                                          │
│ [LOG: OFF] [WAV: OFF] [Clear Metrics] [Export Data]    │
└─────────────────────────────────────────────────────────┘
```

**Usage Example:**
```javascript
// Import modular component
<script src="monitoring-box.js"></script>
<link rel="stylesheet" href="monitoring-box.css">

// Create monitoring box instance
const stationId = new URLSearchParams(window.location.search).get('station');
const socket = io('http://localhost:3021');

socket.on('stations-state', (stations) => {
  const station = stations[stationId];
  if (station) {
    const box = new MonitoringBox('container', station);
    window.monitoringBoxes[stationId] = box;
  }
});

socket.on('station-update', (data) => {
  if (data.stationId === stationId) {
    window.monitoringBoxes[stationId].update(data.metrics);
  }
});
```

---

## 📁 File Structure

```
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/

├── STTTTSserver.js                    # PRODUCTION - Port 3020 (PROTECTED)
│
├── monitoring-server.js               # Monitoring server - Port 3021 ✅
│   - Socket.IO WebSocket server
│   - 8 hardcoded stations
│   - Test audio generator integration
│   - Metrics simulation (1-second intervals)
│   - API alias routes for dashboard compatibility
│
├── modules/
│   └── test-audio-generator.js        # Test audio generation ✅
│       - PCM audio generation (sine/square/sawtooth/noise)
│       - 20ms chunks, 16kHz sample rate
│       - Streaming with callbacks
│
├── public/                            # Web dashboard files
│   ├── monitoring-tree-dashboard.html # Level 1 - Tree overview ✅
│   │   - Dynamic station grid
│   │   - WebSocket real-time updates
│   │   - Click-through to detail pages
│   │
│   ├── station-detail.html            # Level 2 - Station detail ⚠️ PENDING
│   │   - Uses MonitoringBox component
│   │   - Full parameter display
│   │
│   ├── monitoring-box.js              # Modular component ✅
│   │   - Reusable MonitoringBox class
│   │   - Canvas-based graphs
│   │   - Animated visualizations
│   │
│   └── monitoring-box.css             # Component styles ⚠️ PENDING
│       - Dark modern theme
│       - Purple/blue gradients
│       - Responsive design
│
└── logs/                              # Future: LOG output directory
    └── [station-id]/
```

---

## 🖥️ Monitoring Server

**File:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring-server.js`
**Port:** 3021
**Status:** ✅ RUNNING

### Features

1. **Socket.IO WebSocket Server**
   - Real-time bidirectional communication
   - CORS enabled for dashboard access
   - Event-driven architecture

2. **8 Monitoring Stations (Hardcoded)**
   ```javascript
   {
     'station-1': { id: 'station-1', name: 'ARI Receive', type: 'ari-rx', active: false, metrics: {} },
     'station-2': { id: 'station-2', name: 'STT Processing', type: 'stt', active: false, metrics: {} },
     'station-3': { id: 'station-3', name: 'Translation', type: 'translate', active: false, metrics: {} },
     'station-4': { id: 'station-4', name: 'TTS Generation', type: 'tts', active: false, metrics: {} },
     'station-5': { id: 'station-5', name: 'Audio Convert', type: 'convert', active: false, metrics: {} },
     'station-6': { id: 'station-6', name: 'UDP Send', type: 'udp-tx', active: false, metrics: {} },
     'station-7': { id: 'station-7', name: 'Buffer Monitor', type: 'buffer', active: false, metrics: {} },
     'station-8': { id: 'station-8', name: 'Gateway Send', type: 'gateway', active: false, metrics: {} }
   }
   ```

3. **Real-Time Metrics Simulation**
   - Updates every 1 second
   - Random walk algorithm for realistic data
   - Emits `station-update` events via WebSocket

4. **Test Audio Generator Integration**
   - Start/stop test streams via WebSocket
   - Multiple waveform types
   - Configurable frequency, duration, sample rate

5. **REST API + Alias Routes**
   - `/api/monitoring/stations` - Original routes
   - `/api/stations` - Alias for dashboard compatibility
   - `/api/test/stream` - Test audio control
   - `/api/stations/:id/log/:action` - LOG control
   - `/api/stations/:id/record/:action` - WAV recording

### WebSocket Events

**Client → Server:**
```javascript
// Toggle LOG recording
socket.emit('toggle-log', { stationId: 'station-6' });

// Toggle WAV recording
socket.emit('toggle-wav', { stationId: 'station-6' });

// Start test stream
socket.emit('start-test-stream', {
  frequency: 1000,
  duration: 5,
  waveType: 'sine',
  sampleRate: 16000
});

// Stop test stream
socket.emit('stop-test-stream');
```

**Server → Client:**
```javascript
// Initial station state (on connect)
socket.on('stations-state', (stations) => {
  // { 'station-1': {...}, 'station-2': {...}, ... }
});

// Real-time metric updates (every 1 second)
socket.on('station-update', (data) => {
  // { stationId: 'station-6', metrics: { bufferUsage: 78, avgLatency: 245, ... } }
});

// Test stream data
socket.on('test-stream-data', (data) => {
  // { audioData: 'base64...', metadata: { packet: 0, totalPackets: 250, ... } }
});
```

---

## 🎵 Test Audio Generator

**File:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/modules/test-audio-generator.js`
**Status:** ✅ IMPLEMENTED

### Purpose

Generate test PCM audio streams for QA testing without requiring actual audio pipeline integration.

### Features

1. **Multiple Waveform Types:**
   - `sine` - Pure sine wave
   - `square` - Square wave
   - `sawtooth` - Sawtooth wave
   - `noise` - White noise

2. **Configurable Parameters:**
   - Frequency: 100-5000 Hz
   - Sample rate: 8000/16000/48000 Hz
   - Duration: 1-60 seconds
   - Gain: 0.5-15.0x
   - Chunk duration: 5-100ms

3. **Streaming Architecture:**
   - Generates 20ms chunks by default
   - Callback-based delivery
   - Accurate timing with setInterval
   - Automatic completion tracking

### API

```javascript
const TestAudioGenerator = require('./modules/test-audio-generator');
const generator = new TestAudioGenerator();

// Start streaming test audio
generator.startStream({
  frequency: 1000,      // 1kHz tone
  sampleRate: 16000,    // 16kHz
  duration: 5,          // 5 seconds
  waveType: 'sine',     // Sine wave
  gain: 1.0,            // Normal volume
  chunkDuration: 0.02   // 20ms chunks
}, (audioData, metadata) => {
  // audioData: Buffer with PCM samples
  // metadata: { packet, totalPackets, frequency, sampleRate, waveType }
  console.log(`Generated packet ${metadata.packet}/${metadata.totalPackets}`);
});

// Stop streaming
const stats = generator.stopStream();
console.log(`Generated ${stats.packetsGenerated} packets`);

// Get status
const status = generator.getStatus();
console.log(`Is generating: ${status.isGenerating}`);

// Generate single packet
const singlePacket = generator.generatePacket(1000, 16000, 1.0);
```

---

## 📦 Modular MonitoringBox Component

**File:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-box.js`
**Status:** ✅ IMPLEMENTED
**CSS File:** `monitoring-box.css` ⚠️ PENDING DEPLOYMENT

### Purpose

Self-contained, reusable monitoring visualization component that can be imported and used on any page.

### Architecture

**Modular Design Principles:**
- Separate file for easy updates
- No external dependencies (except Canvas API)
- Self-contained HTML rendering
- Independent CSS styling
- Global registry pattern for instance management

### Features

1. **Buffer Metrics Section**
   - Total buffer usage progress bar
   - Color-coded thresholds (green/yellow/red)
   - Sub-metrics: input/processing/output buffers
   - Mini-bars for each sub-metric
   - Real-time animated updates

2. **Latency Metrics Section**
   - Large metric value display
   - Sparkline graph (Canvas-based)
   - 60 seconds of history
   - Peak/min/jitter stats
   - Gradient fill under curve

3. **Packet Flow Section**
   - Visual RX → TX flow diagram
   - Animated arrow indicators
   - Packet counts and bytes
   - Dropped/error tracking

4. **Audio Quality Section**
   - Sample rate indicator
   - Bit depth display
   - Clipping event counter
   - Silence period tracker

5. **Control Buttons**
   - LOG: ON/OFF toggle
   - WAV: ON/OFF toggle
   - Clear Metrics
   - Export Data (JSON download)

### API

```javascript
class MonitoringBox {
  constructor(containerId, station);

  // Update metrics (called from WebSocket)
  update(metrics);

  // Control methods
  toggleLog();
  toggleWav();
  clearMetrics();
  exportData();

  // Internal methods
  render();
  initializeGraph();
  drawGraph();
  updateBufferMetrics(metrics);
  updateLatencyMetrics(metrics);
  updatePacketFlow(metrics);
  updateAudioQuality(metrics);
  updateHistory(metrics);
  formatBytes(bytes);
}
```

### Usage Pattern

```javascript
// 1. Import component
<script src="monitoring-box.js"></script>
<link rel="stylesheet" href="monitoring-box.css">

// 2. Create container in HTML
<div id="station-6-container"></div>

// 3. Instantiate MonitoringBox
const station = {
  id: 'station-6',
  name: 'UDP Send',
  active: true,
  metrics: { bufferUsage: 78, avgLatency: 245, ... }
};

const box = new MonitoringBox('station-6-container', station);

// 4. Register in global registry
window.monitoringBoxes = window.monitoringBoxes || {};
window.monitoringBoxes['station-6'] = box;

// 5. Update from WebSocket
socket.on('station-update', (data) => {
  if (data.stationId === 'station-6') {
    window.monitoringBoxes['station-6'].update(data.metrics);
  }
});
```

### Metrics Structure

```javascript
{
  // Buffer metrics
  bufferUsage: 78.5,              // Total buffer usage (%)

  // Latency metrics
  avgLatency: 245.8,              // Average latency (ms)
  jitter: 125.3,                  // Jitter (ms)

  // Packet metrics
  packetsRx: 2456,                // Packets received
  packetsTx: 2401,                // Packets transmitted
  packetsDropped: 55,             // Packets dropped
  packetsErrors: 0,               // Packet errors
  bytesRx: 402432,                // Bytes received
  bytesTx: 393216,                // Bytes transmitted

  // Audio quality
  sampleRate: 16000,              // Sample rate (Hz)
  bitDepth: '16-bit PCM',         // Bit depth
  clippingEvents: 0,              // Clipping count
  silencePeriods: 2,              // Silence periods

  // Timestamp
  lastUpdate: Date.now()
}
```

---

## 🔌 WebSocket Communication

### Connection

```javascript
// Dashboard connects to monitoring server
const socket = io('http://20.170.155.53:3021');

// Connection events
socket.on('connect', () => {
  console.log('Connected to monitoring server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from monitoring server');
});
```

### Event Flow

```
┌──────────────┐                      ┌─────────────────┐
│  Dashboard   │                      │ Monitoring      │
│  (Browser)   │                      │ Server :3021    │
└──────────────┘                      └─────────────────┘
       │                                       │
       │ ─────── connect ────────────────────→ │
       │                                       │
       │ ←──── stations-state (initial) ───── │
       │        { station-1: {...}, ... }     │
       │                                       │
       │                                       │
       │ ←──── station-update (1s interval) ─ │
       │        { stationId, metrics }        │
       │                                       │
       │ ─────── toggle-log ──────────────────→ │
       │        { stationId: 'station-6' }    │
       │                                       │
       │ ←──── log-status ──────────────────── │
       │        { stationId, enabled: true }  │
       │                                       │
```

### Real-Time Updates

**Metrics Update Cycle:**
1. Server simulates changing metrics every 1 second
2. Calculates new values using random walk algorithm
3. Emits `station-update` event to all connected clients
4. Dashboard receives event and updates UI
5. MonitoringBox components redraw graphs and bars

**Update Algorithm:**
```javascript
// Server-side simulation (every 1 second)
setInterval(() => {
  Object.keys(stations).forEach(stationId => {
    const station = stations[stationId];

    // Random walk for realistic changes
    station.metrics.bufferUsage = Math.max(0, Math.min(100,
      station.metrics.bufferUsage + (Math.random() - 0.5) * 10));

    station.metrics.avgLatency = Math.max(0,
      station.metrics.avgLatency + (Math.random() - 0.5) * 5);

    station.metrics.jitter = Math.max(0,
      station.metrics.jitter + (Math.random() - 0.5) * 3);

    station.metrics.lastUpdate = Date.now();

    // Emit update to all clients
    io.emit('station-update', {
      stationId,
      metrics: station.metrics
    });
  });
}, 1000);
```

---

## 🔗 API Reference

### REST API Endpoints

All endpoints are available on port 3021.

#### Get All Stations
```
GET /api/stations
GET /api/monitoring/stations (alias)

Response:
{
  "success": true,
  "stations": [
    {
      "id": "station-1",
      "name": "ARI Receive",
      "type": "ari-rx",
      "active": false,
      "metrics": { ... }
    },
    ...
  ]
}
```

#### Test Stream Control
```
POST /api/test/stream
POST /api/monitoring/test/stream (alias)

Body:
{
  "frequency": 1000,
  "duration": 5,
  "waveType": "sine",
  "sampleRate": 16000,
  "gain": 1.0
}

Response:
{
  "success": true,
  "totalChunks": 250,
  "chunkDurationMs": 20,
  "estimatedDurationMs": 5000
}
```

```
DELETE /api/test/stream
DELETE /api/monitoring/test/stream (alias)

Response:
{
  "success": true,
  "stats": {
    "packetsGenerated": 250
  }
}
```

#### LOG Control
```
POST /api/stations/:stationId/log/start
POST /api/monitoring/stations/:stationId/log/start (alias)

Response:
{
  "success": true
}
```

```
POST /api/stations/:stationId/log/stop
POST /api/monitoring/stations/:stationId/log/stop (alias)

Response:
{
  "success": true
}
```

#### WAV Recording Control
```
POST /api/stations/:stationId/record/start
POST /api/monitoring/stations/:stationId/record/start (alias)

Response:
{
  "success": true
}
```

```
POST /api/stations/:stationId/record/stop
POST /api/monitoring/stations/:stationId/record/stop (alias)

Response:
{
  "success": true
}
```

#### Clear Metrics
```
POST /api/metrics/clear
POST /api/monitoring/metrics/clear (alias)

Response:
{
  "success": true
}
```

---

## 📊 Current Implementation Status

### ✅ Completed (Deployed and Running)

1. **Monitoring Server** - `monitoring-server.js`
   - Socket.IO WebSocket server on port 3021
   - 8 hardcoded monitoring stations initialized
   - Real-time metrics simulation (1-second intervals)
   - Test audio generator integration
   - REST API with alias routes for dashboard compatibility
   - Status: Running (PID found with `ps aux | grep monitoring-server`)

2. **Test Audio Generator** - `modules/test-audio-generator.js`
   - Multiple waveform types (sine, square, sawtooth, noise)
   - 16-bit PCM generation at 16kHz
   - Streaming with 20ms chunks
   - Callback-based architecture
   - Status: Deployed and integrated into monitoring server

3. **Tree Dashboard (Level 1)** - `public/monitoring-tree-dashboard.html`
   - Dynamic grid layout for all stations
   - WebSocket real-time updates
   - ON/OFF status indicators with pulse animation
   - Quick metrics display (buffer, latency, packets)
   - Click-through to detail pages
   - Stats aggregation bar
   - Status: Deployed to Azure VM public directory

4. **Modular MonitoringBox Component** - `public/monitoring-box.js`
   - Self-contained reusable class
   - Buffer metrics with sub-parameters
   - Canvas-based sparkline graphs
   - Packet flow visualization
   - Audio quality indicators
   - LOG/WAV control buttons
   - Export functionality
   - Status: Deployed to Azure VM public directory

### ⚠️ Pending (Next Steps)

1. **Component CSS Stylesheet** - `public/monitoring-box.css`
   - Dark modern theme
   - Purple/blue gradients
   - Progress bars and animations
   - Responsive design
   - Status: Created in /tmp/monitoring-box.css, NOT YET DEPLOYED

2. **Station Detail Page (Level 2)** - `public/station-detail.html`
   - Uses MonitoringBox component
   - URL parameter for station selection
   - WebSocket integration for real-time updates
   - Full parameter display
   - Status: NOT YET CREATED

3. **Dynamic Station Registration API**
   - POST `/api/stations/register` - Add new station
   - DELETE `/api/stations/:id` - Remove station
   - POST `/api/stations/bulk-register` - Add multiple stations
   - Convert hardcoded stations object to dynamic Map
   - Status: NOT YET IMPLEMENTED

4. **Scalability Testing**
   - Bulk register 50+ stations
   - Test dashboard performance with many stations
   - Verify WebSocket handles high update frequency
   - Status: NOT YET TESTED

### 🔄 Current Working State

**Servers Running:**
- ✅ Production STTTTSserver: Port 3020 (untouched, safe)
- ✅ Monitoring Server: Port 3021 (running with simulated metrics)

**Files Deployed:**
- ✅ `/public/monitoring-tree-dashboard.html` - Tree overview dashboard
- ✅ `/public/monitoring-box.js` - Modular reusable component
- ✅ `/modules/test-audio-generator.js` - Test audio generator
- ⚠️ `/tmp/monitoring-box.css` - Component styles (not deployed yet)

**Accessible URLs:**
- ✅ Tree Dashboard: http://20.170.155.53:3021/monitoring-tree-dashboard.html
- ⚠️ Station Detail: Not yet available (pending creation)

**Working Features:**
- Real-time WebSocket communication
- Metrics simulation and updates every 1 second
- API endpoints responding correctly
- Tree dashboard shows all 8 stations with live data
- Test audio generator ready for use

---

## 🎯 Next Steps (Implementation Roadmap)

### Immediate Next Steps (Current Session Interruption Point)

**User interrupted at this exact point:**
- ✅ Created `monitoring-box.css` file in `/tmp/`
- ⏳ About to create `station-detail.html`
- ⏳ Need to deploy both files to Azure VM
- ⏳ Need to test complete two-level architecture

### Step 1: Complete Modular Component Deployment

```bash
# Deploy CSS stylesheet
scp /tmp/monitoring-box.css azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/

# Verify deployment
ssh azureuser@20.170.155.53 "ls -lh /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-box.*"
```

### Step 2: Create Station Detail Page

Create `station-detail.html` with:
- Import monitoring-box.js and monitoring-box.css
- Parse station ID from URL query parameter
- Connect to monitoring server via WebSocket
- Instantiate MonitoringBox component
- Update component from real-time WebSocket events
- Back button to return to tree dashboard

### Step 3: Deploy and Test Two-Level Architecture

```bash
# Deploy station detail page
scp /tmp/station-detail.html azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/

# Test complete flow:
# 1. Open tree dashboard: http://20.170.155.53:3021/monitoring-tree-dashboard.html
# 2. Click "View Full Details" on a station
# 3. Verify navigation to: http://20.170.155.53:3021/station-detail.html?station=station-6
# 4. Verify MonitoringBox renders with real-time updates
```

### Step 4: Implement Dynamic Station Registration

Refactor `monitoring-server.js`:
- Convert stations object to Map for dynamic operations
- Add POST `/api/stations/register` endpoint
- Add DELETE `/api/stations/:id` endpoint
- Add POST `/api/stations/bulk-register` endpoint
- Persist station registry to disk (optional)

```javascript
// Example implementation
const stationsMap = new Map();

app.post('/api/stations/register', (req, res) => {
  const { id, name, type, active } = req.body;
  const station = {
    id,
    name,
    type,
    active: active || false,
    metrics: initializeMetrics()
  };
  stationsMap.set(id, station);
  io.emit('stations-state', Object.fromEntries(stationsMap));
  res.json({ success: true, station });
});

app.delete('/api/stations/:id', (req, res) => {
  const { id } = req.params;
  const deleted = stationsMap.delete(id);
  if (deleted) {
    io.emit('stations-state', Object.fromEntries(stationsMap));
  }
  res.json({ success: deleted });
});
```

### Step 5: Scalability Testing

```bash
# Create test script to register 50 stations
node << 'EOF'
const http = require('http');

for (let i = 9; i <= 58; i++) {
  const station = {
    id: `station-${i}`,
    name: `Test Station ${i}`,
    type: 'test',
    active: i % 3 !== 0  // 2/3 active, 1/3 inactive
  };

  const data = JSON.stringify(station);
  const options = {
    hostname: 'localhost',
    port: 3021,
    path: '/api/stations/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = http.request(options, (res) => {
    console.log(`✓ Registered ${station.id}`);
  });

  req.write(data);
  req.end();
}
EOF

# Open dashboard and verify all 58 stations display
# Monitor performance with browser DevTools
```

### Step 6: Future Enhancements

1. **LOG Streaming Implementation**
   - Create `modules/log-stream-manager.js`
   - Add file writing for station data
   - Implement log rotation
   - Add download endpoints

2. **WAV Recording Implementation**
   - Create `modules/wav-recorder.js`
   - Add PCM → WAV conversion
   - Implement audio capture hooks
   - Add waveform analysis

3. **Integration with Production Pipeline**
   - Add monitoring hooks to STTTTSserver.js stations
   - Connect real audio metrics (not simulated)
   - Enable/disable monitoring per station
   - Zero-impact passive monitoring mode

---

## 📝 User's Monitoring Vision & Corrected Architecture

### Original Vision (Exact Quote)

> "Everything should start with a tree diagram of all stations with ON/OFF indicators and main parameters for each station... The diagram contains a link to open a station page with all the relevant parameters for monitoring (monitoring square on the screen) with the sub-parameters relevant to the square, including the relevant mediators for each index with a bar showing the flow in real time or just counting packets or anything else that can be used as a live display in the monitoring square..."

### IMPORTANT CORRECTION: Expandable Box Architecture

> "Instead of two-stage navigation (tree), I thought it would be better to maintain modularity and, instead of a tree, display a jump square for each station and add an expansion feature to the jump square. When you click on the expansion icon in the cube (let's say for a jump station), the cube will expand to fill the entire screen (hiding the other cubes) and you will see all the jump cubes and controls for the jump station..."

**Corrected Implementation Mapping:**
- ✅ All stations shown as monitoring boxes = Grid layout with compact monitoring boxes
- ✅ ON/OFF indicators = Status badges with pulse animation on each box
- ✅ Main parameters = Quick metrics visible in compact view (buffer, latency, packets)
- ✅ Expand icon (⛶) = Click to expand box to full screen
- ✅ Expanded monitoring square = Full `MonitoringBox` component with all details
- ✅ Sub-parameters = Buffer (input/processing/output), latency (peak/min/jitter), etc.
- ✅ Bars showing flow = Progress bars, mini-bars, packet flow visualization
- ✅ Real-time display = Canvas sparkline graphs, animated arrows, live counters
- ✅ Collapse icon (⛶) = Return to compact grid view

**Key Architectural Difference:**
- ❌ NOT two-stage navigation (tree page → detail page)
- ✅ YES single-page with expandable boxes (compact grid ⇄ expanded single box)

---

## 🔒 Safety Protocol

**CRITICAL: Production Server Protection**

- ✅ Production server (STTTTSserver.js) on port 3020 is NEVER modified
- ✅ All monitoring work happens in separate monitoring-server.js on port 3021
- ✅ Monitoring partition within 3333_4444__Operational directory
- ✅ No changes to production code without explicit user permission
- ✅ All files backed up before any modifications

**Deployment Checklist:**
1. Always work on Azure VM: http://20.170.155.53/
2. Always use `/tmp/` for file preparation
3. Always verify file paths before deployment
4. Always check server status before/after changes
5. Always maintain separation between monitoring and production

---

**Document End**

*This document will be updated as implementation progresses. Current status: Monitoring server running with simulated data, tree dashboard deployed, modular component created, pending CSS deployment and station detail page creation.*
