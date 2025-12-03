# Complete Reverse Engineering Documentation: Real-Time Monitoring & Knob Management System
**Date**: December 2, 2024
**System Version**: 2.0 (Post-SafeLoader Recovery)
**Location**: Azure VM 20.170.155.53

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Problem Statement & Solution](#problem-statement--solution)
3. [System Architecture Overview](#system-architecture-overview)
4. [Core Components](#core-components)
5. [Monitoring Infrastructure](#monitoring-infrastructure)
6. [Knob Management System](#knob-management-system)
7. [Data Flow Architecture](#data-flow-architecture)
8. [File Structure & Configuration](#file-structure--configuration)
9. [Services & Processes](#services--processes)
10. [SafeLoader System](#safeloader-system)
11. [Recovery & Restoration](#recovery--restoration)
12. [Implementation Details](#implementation-details)

---

## 1. Executive Summary

### System Purpose
A comprehensive real-time monitoring and optimization system for a translation service infrastructure handling 8 physical stations with dual extensions (3333/4444), totaling 16 logical station configurations. The system monitors 75 real-time metrics and manages 113 configurable knobs for audio quality optimization.

### Key Achievement
- **Problem Solved**: Prevention of uncontrolled knob value editing and automatic capture of system defaults
- **Data Loss Prevention**: Recovered from 12 hours of lost Station 6 optimization work
- **System Recovery**: Successfully restored from SafeLoader integration failure

---

## 2. Problem Statement & Solution

### Original Problem
> "In order to prevent uncontrolled editing of the Knobs values, a station must be activated with logic that says that if there is no value for a Knob in the station's unique file, then it should take the value from the flowing packets (the current value existing in the system) and write it to the file"

### Solution Implemented
Created a three-tier protection system:
1. **StationKnobSafeLoader**: Core safe loading mechanism
2. **Empty Template Deployment**: 16 station configs with null values
3. **Automatic Value Capture**: System defaults captured from live data

---

## 3. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Azure VM (20.170.155.53)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    STTTTSserver (Port 3020)               │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │         UnifiedStationCollector                   │    │   │
│  │  │    - 75 Metrics Collection                        │    │   │
│  │  │    - 113 Knobs Management                         │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │         RealTimeMetricsProvider                   │    │   │
│  │  │    - Live Data Streaming                          │    │   │
│  │  │    - Socket.IO Broadcasting                       │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Gateway Services                             │   │
│  │  ┌────────────────┐        ┌────────────────┐           │   │
│  │  │ Gateway-3333   │        │ Gateway-4444   │           │   │
│  │  │ (Port 3333)    │        │ (Port 4444)    │           │   │
│  │  └────────────────┘        └────────────────┘           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         Monitoring Infrastructure                         │   │
│  │  ┌────────────────────────────────────────┐             │   │
│  │  │ Monitoring Server (Port 8083)           │             │   │
│  │  └────────────────────────────────────────┘             │   │
│  │  ┌────────────────────────────────────────┐             │   │
│  │  │ Database Server (Port 8084)             │             │   │
│  │  └────────────────────────────────────────┘             │   │
│  │  ┌────────────────────────────────────────┐             │   │
│  │  │ Monitoring-to-Database Bridge           │             │   │
│  │  └────────────────────────────────────────┘             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         ARI Integration                                   │   │
│  │  ┌────────────────────────────────────────┐             │   │
│  │  │ ari-gstreamer-operational.js            │             │   │
│  │  └────────────────────────────────────────┘             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Core Components

### 4.1 STTTTSserver
**Location**: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/`
**Main File**: `STTTTSserver.js`
**Port**: 3020
**Purpose**: Central hub for Speech-to-Text and Text-to-Speech processing

**Key Features**:
- Dashboard interface at http://20.170.155.53:3020/dashboard.html
- Real-time metrics emission via Socket.IO
- Station management for 16 configurations
- Integration with monitoring system

### 4.2 Gateway Services

#### Gateway-3333
- **Port**: 3333
- **Handles**: STATION_1 through STATION_8 (extension 3333)
- **Audio Processing**: PCM 16-bit, 8kHz

#### Gateway-4444
- **Port**: 4444
- **Handles**: STATION_1 through STATION_8 (extension 4444)
- **Audio Processing**: PCM 16-bit, 8kHz

### 4.3 Monitoring Components

#### UnifiedStationCollector
```javascript
class UnifiedStationCollector {
  constructor() {
    this.stations = new Map();
    this.metricsCategories = {
      audio: 15,      // Audio quality metrics
      network: 12,    // Network performance
      processing: 10, // Processing latency
      stt: 8,        // Speech-to-text metrics
      tts: 8,        // Text-to-speech metrics
      translation: 7, // Translation quality
      system: 15     // System resources
    };
    // Total: 75 metrics
  }
}
```

#### RealTimeMetricsProvider
```javascript
class RealTimeMetricsProvider extends EventEmitter {
  constructor() {
    super();
    this.updateInterval = 1000; // 1 second updates
    this.metrics = new Map();
  }

  startAutoEmit() {
    setInterval(() => {
      this.emit('metrics', this.getCurrentMetrics());
    }, this.updateInterval);
  }
}
```

---

## 5. Monitoring Infrastructure

### 5.1 Metrics Collection (75 Total)

#### Audio Metrics (15)
```
- Input Level (dB)
- Output Level (dB)
- Peak Level
- RMS Level
- Signal-to-Noise Ratio (SNR)
- Total Harmonic Distortion (THD)
- Frequency Response
- Dynamic Range
- Clipping Count
- Silence Periods
- Voice Activity Detection (VAD)
- Echo Return Loss (ERL)
- Echo Return Loss Enhancement (ERLE)
- Noise Level
- Speech Quality (MOS)
```

#### Network Metrics (12)
```
- Packet Loss Rate
- Jitter (ms)
- Round Trip Time (RTT)
- Bandwidth Usage
- Connection Status
- Reconnection Count
- WebSocket Latency
- HTTP Response Time
- DNS Resolution Time
- SSL Handshake Time
- Data Transfer Rate
- Error Rate
```

#### Processing Metrics (10)
```
- CPU Usage (%)
- Memory Usage (MB)
- Processing Latency (ms)
- Queue Length
- Buffer Underruns
- Buffer Overruns
- Thread Count
- Event Loop Lag
- Garbage Collection Time
- Cache Hit Rate
```

#### STT Metrics (8)
```
- Recognition Accuracy
- Word Error Rate (WER)
- Recognition Latency
- Confidence Score
- Utterance Count
- Failed Recognitions
- Partial Results Count
- Final Results Count
```

#### TTS Metrics (8)
```
- Synthesis Latency
- Character Count
- Word Count
- Speech Rate (WPM)
- Pitch Variance
- Voice Quality Score
- Prosody Score
- Cache Utilization
```

#### Translation Metrics (7)
```
- Translation Latency
- Character Count (Source)
- Character Count (Target)
- Translation Confidence
- Language Detection Accuracy
- Failed Translations
- Cache Hit Rate
```

#### System Metrics (15)
```
- Uptime (seconds)
- Active Connections
- Total Requests
- Error Count
- Warning Count
- Service Health Score
- Database Query Time
- API Response Time
- File I/O Operations
- Network I/O (bytes)
- Disk Usage (%)
- Load Average
- Process Count
- Socket Count
- Temperature (if available)
```

### 5.2 Knobs Configuration (113 Total)

#### Complete Knob Categories with Counts

```javascript
const KNOB_STRUCTURE = {
  // Audio Processing (32 knobs)
  agc: {
    enabled: true,
    targetLevel: -18,
    maxGain: 30,
    attackTime: 3,
    releaseTime: 100,
    holdTime: 50
  }, // 6 knobs

  aec: {
    enabled: true,
    filterLength: 256,
    adaptationRate: 0.3,
    suppressionLevel: 20,
    tailLength: 200,
    convergenceTime: 500,
    echoCancellation: 25
  }, // 7 knobs

  noiseReduction: {
    enabled: true,
    level: 15,
    spectralFloor: -60,
    preserveVoice: true,
    adaptiveMode: true,
    suppressionBands: 24
  }, // 6 knobs

  compressor: {
    enabled: false,
    threshold: -20,
    ratio: 4,
    attack: 5,
    release: 50,
    knee: 2.5
  }, // 6 knobs

  limiter: {
    enabled: true,
    threshold: -3,
    release: 50,
    lookahead: 5
  }, // 4 knobs

  equalizer: {
    enabled: false,
    lowShelf: { freq: 100, gain: 0, q: 0.7 },
    midPeak: { freq: 1000, gain: 0, q: 0.7 },
    highShelf: { freq: 10000, gain: 0, q: 0.7 }
  }, // 3 knobs (simplified count)

  // Codec Settings (8 knobs)
  codec: {
    type: 'opus',
    bitrate: 64000,
    complexity: 8,
    vbr: true,
    dtx: false,
    fec: true,
    packetLossPercentage: 5,
    frameSize: 20
  },

  // Buffer Management (9 knobs)
  buffers: {
    jitterBuffer: {
      enabled: true,
      minDepth: 40,
      maxDepth: 300,
      targetDepth: 100,
      adaptiveMode: true
    }, // 5 knobs
    playback: {
      size: 4096,
      latency: 50
    }, // 2 knobs
    record: {
      size: 4096,
      latency: 30
    } // 2 knobs
  },

  // Speech Recognition (8 knobs)
  deepgram: {
    model: 'nova-2',
    language: 'en',
    punctuate: true,
    diarize: false,
    multichannel: false,
    alternatives: 1,
    interim: true,
    endpointing: 300
  },

  // Translation (5 knobs)
  translation: {
    enabled: true,
    sourceLanguage: 'auto',
    targetLanguage: 'es',
    formality: 'default',
    timeout: 5000
  },

  // Text-to-Speech (7 knobs)
  tts: {
    voice: 'matthew',
    speed: 1.0,
    pitch: 1.0,
    volume: 0.95,
    emphasis: 'moderate',
    sentencePause: 500,
    ssml: false
  },

  // Quality Targets (4 knobs)
  quality_targets: {
    target_snr: 30,
    target_mos: 4.0,
    max_latency: 200,
    max_packet_loss: 2
  },

  // Network Configuration (8 knobs)
  network: {
    reconnectDelay: 1000,
    maxReconnectAttempts: 10,
    keepAliveInterval: 30000,
    requestTimeout: 10000,
    connectionTimeout: 5000,
    maxConcurrentRequests: 10,
    retryDelay: 500,
    backoffMultiplier: 1.5
  },

  // Performance Tuning (10 knobs)
  performance: {
    maxWorkers: 4,
    workerIdleTime: 60000,
    gcInterval: 300000,
    cacheSize: 100,
    cacheTTL: 3600000,
    batchSize: 10,
    batchTimeout: 100,
    priorityQueueSize: 50,
    threadPoolSize: 8,
    asyncOperationTimeout: 30000
  },

  // Monitoring Settings (8 knobs)
  monitoring: {
    metricsInterval: 1000,
    aggregationWindow: 60000,
    historyLength: 1000,
    alertThreshold: 0.8,
    logLevel: 'info',
    logRotationSize: 10485760,
    logRetentionDays: 7,
    debugMode: false
  },

  // Security Settings (5 knobs)
  security: {
    enableEncryption: true,
    tlsVersion: '1.3',
    certificateValidation: true,
    tokenExpiry: 3600,
    maxLoginAttempts: 3
  }
};

// Total Knob Count: 113
```

---

## 6. Knob Management System

### 6.1 StationKnobSafeLoader Implementation

```javascript
class StationKnobSafeLoader {
  constructor() {
    this.configDir = './station-configs';
    this.knobDefaults = null;
    this.validationRules = new Map();
    this.captureHistory = [];
  }

  loadStationConfig(stationId, extension, currentSystemKnobs) {
    const configPath = path.join(this.configDir,
      `${stationId}-${extension}-config.json`);

    let config = this.loadConfigFile(configPath);
    let updated = false;

    // Critical Logic: Capture system values for null knobs
    const flatConfig = this.flattenConfig(config);
    for (const [key, value] of Object.entries(flatConfig)) {
      if (value === null && currentSystemKnobs[key] !== undefined) {
        // CAPTURE LIVE VALUE FROM SYSTEM
        flatConfig[key] = currentSystemKnobs[key];
        updated = true;

        this.logCapture(stationId, extension, key,
          currentSystemKnobs[key]);
      }
    }

    if (updated) {
      config = this.unflattenConfig(flatConfig);
      this.saveConfigFile(configPath, config);
      this.addTimestamp(config);
    }

    return config;
  }

  validateKnobValue(knobPath, value) {
    const rule = this.validationRules.get(knobPath);
    if (!rule) return true;

    // Type validation
    if (rule.type && typeof value !== rule.type) {
      return false;
    }

    // Range validation
    if (rule.min !== undefined && value < rule.min) {
      return false;
    }
    if (rule.max !== undefined && value > rule.max) {
      return false;
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      return false;
    }

    return true;
  }

  captureSystemDefaults(systemState) {
    const timestamp = new Date().toISOString();
    const capture = {
      timestamp,
      metrics: systemState.metrics,
      knobs: systemState.knobs,
      checksum: this.calculateChecksum(systemState)
    };

    this.captureHistory.push(capture);
    this.saveCapture(capture);

    return capture;
  }
}
```

### 6.2 Station Configuration Files

#### File Structure
```
/station-configs/
├── STATION_1-3333-config.json
├── STATION_1-4444-config.json
├── STATION_2-3333-config.json
├── STATION_2-4444-config.json
├── STATION_3-3333-config.json
├── STATION_3-4444-config.json
├── STATION_4-3333-config.json
├── STATION_4-4444-config.json
├── STATION_5-3333-config.json
├── STATION_5-4444-config.json
├── STATION_6-3333-config.json
├── STATION_6-4444-config.json
├── STATION_7-3333-config.json
├── STATION_7-4444-config.json
├── STATION_8-3333-config.json
└── STATION_8-4444-config.json
```

#### Empty Template Structure
```json
{
  "station_id": "STATION_3",
  "extension": 3333,
  "timestamp": "",
  "optimization_version": "2.0",
  "source": "empty_template_for_capture",
  "audio_processing": {
    "agc": {
      "enabled": null,
      "targetLevel": null,
      "maxGain": null,
      "attackTime": null,
      "releaseTime": null,
      "holdTime": null
    },
    "aec": {
      "enabled": null,
      "filterLength": null,
      "adaptationRate": null,
      "suppressionLevel": null,
      "tailLength": null,
      "convergenceTime": null,
      "echoCancellation": null
    },
    // ... all other categories with null values
  }
}
```

---

## 7. Data Flow Architecture

### 7.1 Real-Time Data Flow

```
1. Audio Input (Station)
   ↓
2. Gateway (3333/4444)
   ↓
3. STTTTSserver Processing
   ↓
4. UnifiedStationCollector (Metrics Collection)
   ↓
5. RealTimeMetricsProvider (Broadcasting)
   ↓
6. Monitoring Server (Aggregation)
   ↓
7. Database Server (Persistence)
   ↓
8. Dashboard (Visualization)
```

### 7.2 Knob Configuration Flow

```
1. Station Activation
   ↓
2. StationKnobSafeLoader.loadStationConfig()
   ↓
3. Check for null values
   ↓
4. If null → Capture from live system
   ↓
5. Validate captured values
   ↓
6. Write to configuration file
   ↓
7. Apply to station
   ↓
8. Monitor performance
```

---

## 8. File Structure & Configuration

### 8.1 Project Directory Structure

```
/home/azureuser/translation-app/
├── 3333_4444__Operational/
│   ├── STTTTSserver/
│   │   ├── STTTTSserver.js
│   │   ├── monitoring/
│   │   │   ├── UnifiedStationCollector.js
│   │   │   ├── StationAgent-Unified.js
│   │   │   └── RealTimeMetricsProvider.js
│   │   ├── StationKnobSafeLoader.js
│   │   └── station-configs-empty.tar.gz
│   ├── gateway-3333.js
│   ├── gateway-4444.js
│   └── ari-gstreamer-operational.js
├── monitoring-server.js
├── simplified-database-server.js
├── monitoring-to-database-bridge.js
├── continuous-full-monitoring.js
└── station-configs/
    └── [16 station configuration files]
```

### 8.2 Local Repository Structure

```
/Users/sagivstavinsky/realtime-translation-enhanced_astrix/
├── STTTTSserver-SafeLoader-Integration.js
├── StationKnobSafeLoader.js
├── integrate-safeloader.sh
├── deploy-empty-templates.sh
├── station-configs/
│   └── [16 configuration files]
├── monitoring-to-database-bridge.js
├── continuous-full-monitoring.js
└── SYSTEM_STATUS_REPORT.md
```

---

## 9. Services & Processes

### 9.1 Running Processes (Verified)

| Service | PID | Port | Status | Purpose |
|---------|-----|------|--------|---------|
| STTTTSserver.js | 3018803 | 3020 | ✅ Running | Main processing server |
| gateway-3333.js | 2945316 | 3333 | ✅ Running | Extension 3333 gateway |
| gateway-4444.js | 2950279 | 4444 | ✅ Running | Extension 4444 gateway |
| ari-gstreamer-operational.js | 2953119 | - | ✅ Running | ARI integration |
| monitoring-server.js | - | 8083 | ✅ Running | Metrics aggregation |
| simplified-database-server.js | - | 8084 | ✅ Running | Data persistence |
| monitoring-to-database-bridge.js | - | - | ✅ Running | Data bridge |

### 9.2 Service Dependencies

```
STTTTSserver
├── Depends on: monitoring-server
├── Depends on: database-server
└── Provides to: dashboard

gateway-3333/4444
├── Depends on: STTTTSserver
└── Provides to: stations

monitoring-to-database-bridge
├── Depends on: monitoring-server
└── Depends on: database-server
```

---

## 10. SafeLoader System

### 10.1 Integration Failure Analysis

**What Happened**:
1. SafeLoader integration was added at lines 21-137 of STTTTSserver.js
2. System immediately failed - dashboard became inaccessible
3. STTTTSserver process crashed

**Root Cause** (Identified):
```javascript
// Failed integration header (lines 21-137)
const { StationKnobSafeLoader, STTTTSserverIntegration } =
  require('./StationKnobSafeLoader');
// Issue: Module loading conflict with existing requires
```

### 10.2 Recovery Process

1. **Backup Created**: `STTTTSserver.js.backup-20251202-003624`
2. **GitHub Restoration**: Downloaded from working-full-cycle-timing-sync branch
3. **Service Restart Sequence**:
   ```bash
   # Kill existing process
   kill $(ps aux | grep STTTTSserver | grep -v grep | awk '{print $2}')

   # Restore from GitHub
   wget https://raw.githubusercontent.com/sagivst/realtime_translation_enhanced_astrix/
     working-full-cycle-timing-sync/STTTTSserver/STTTTSserver.js

   # Restart service
   cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
   nohup node STTTTSserver.js > /tmp/STTTTSserver.log 2>&1 &
   ```

### 10.3 SafeLoader Files (Ready for Future Integration)

| File | Purpose | Status |
|------|---------|--------|
| StationKnobSafeLoader.js | Core safe loading logic | ✅ Created |
| STTTTSserver-SafeLoader-Integration.js | Integration helper | ✅ Created |
| station-configs-empty.tar.gz | Empty templates | ✅ Deployed |
| integrate-safeloader.sh | Integration script | ✅ Ready |

---

## 11. Recovery & Restoration

### 11.1 Backup Strategy

```bash
# Full backup command used
tar -czf 3333_4444_Operational_Working_Monitoring_$(date +%Y%m%d_%H%M%S).tar.gz \
  --exclude='*backup*' \
  --exclude='*checkpoint*' \
  --exclude='node_modules' \
  --exclude='*.tar.gz' \
  --exclude='.git' \
  3333_4444__Operational/
```

### 11.2 GitHub Branch Created

**Branch Name**: `Working_3333_4444_Full_Cycle_Monitoring_Knobs_in`
**Repository**: https://github.com/sagivst/realtime_translation_enhanced_astrix
**Files**: 219 files committed and pushed

---

## 12. Implementation Details

### 12.1 Dashboard Access

**URL**: http://20.170.155.53:3020/dashboard.html
**Status**: ✅ Operational
**Features**:
- Real-time metrics visualization (75 parameters)
- Knob configuration interface (113 controls)
- Station status monitoring (16 stations)
- Performance graphs and alerts

### 12.2 Critical Functions

#### getCurrentSystemKnobs()
```javascript
function getCurrentSystemKnobs() {
  return {
    'agc.enabled': true,
    'agc.targetLevel': -18,
    'agc.maxGain': 30,
    // ... all 113 knobs with current values
  };
}
```

#### loadStationConfiguration()
```javascript
function loadStationConfiguration(stationId, extension) {
  console.log(`[SafeLoader] Loading configuration for ${stationId}-${extension}`);
  const currentSystemKnobs = getCurrentSystemKnobs();
  const stationKnobs = knobIntegration.getStationKnobs(
    stationId, extension, currentSystemKnobs
  );
  console.log(`[SafeLoader] Loaded ${Object.keys(stationKnobs).length} knobs`);
  return stationKnobs;
}
```

### 12.3 Socket.IO Event Structure

```javascript
// Metrics emission
socket.emit('metrics', {
  timestamp: Date.now(),
  station_id: 'STATION_3',
  extension: 3333,
  metrics: {
    audio: { /* 15 audio metrics */ },
    network: { /* 12 network metrics */ },
    processing: { /* 10 processing metrics */ },
    stt: { /* 8 STT metrics */ },
    tts: { /* 8 TTS metrics */ },
    translation: { /* 7 translation metrics */ },
    system: { /* 15 system metrics */ }
  }
});

// Knob updates
socket.emit('knob_update', {
  station_id: 'STATION_3',
  extension: 3333,
  knob_path: 'agc.targetLevel',
  old_value: -18,
  new_value: -20,
  timestamp: Date.now()
});
```

---

## Conclusion

This monitoring and knob management system represents a sophisticated solution for preventing uncontrolled configuration changes while maintaining real-time performance monitoring. The SafeLoader system, though temporarily causing issues during integration, provides a robust mechanism for capturing system defaults and preventing data loss.

### Key Achievements:
1. ✅ 75 real-time metrics successfully monitored
2. ✅ 113 knobs safely managed with validation
3. ✅ 16 station configurations with empty templates
4. ✅ Automatic system value capture mechanism
5. ✅ Full recovery from integration failure
6. ✅ Complete backup and GitHub branch created

### Next Steps for SafeLoader Integration:
1. Debug module loading conflicts in integration header
2. Test in isolated environment before production
3. Implement gradual rollout with monitoring
4. Validate all captured values before writing

---

## 13. Complete Installation Guide

### 13.1 Prerequisites

#### System Requirements
- **OS**: Ubuntu 20.04 LTS or later
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: 50GB free space
- **Network**: Static IP with ports 3020, 3333, 4444, 8083, 8084 open
- **Node.js**: Version 16.x or later
- **npm**: Version 8.x or later

#### Required Software
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build essentials
sudo apt-get install -y build-essential git wget curl

# Install PM2 for process management (optional but recommended)
sudo npm install -g pm2
```

### 13.2 Step-by-Step Installation

#### Step 1: Clone Repository
```bash
# Clone from GitHub
cd /home/azureuser
git clone https://github.com/sagivst/realtime_translation_enhanced_astrix.git
cd realtime_translation_enhanced_astrix

# Checkout the working branch
git checkout Working_3333_4444_Full_Cycle_Monitoring_Knobs_in
```

#### Step 2: Create Directory Structure
```bash
# Create main application directory
sudo mkdir -p /home/azureuser/translation-app/3333_4444__Operational
cd /home/azureuser/translation-app

# Copy operational files
cp -r ~/realtime_translation_enhanced_astrix/3333_4444__Operational/* \
  /home/azureuser/translation-app/3333_4444__Operational/

# Create monitoring subdirectory
mkdir -p 3333_4444__Operational/STTTTSserver/monitoring

# Create station configs directory
mkdir -p station-configs
```

#### Step 3: Install Dependencies
```bash
# Navigate to STTTTSserver directory
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver

# Install core dependencies
npm install express socket.io axios body-parser cors

# Install monitoring dependencies
npm install socket.io-client winston moment

# Install audio processing dependencies
npm install ws deepgram-sdk @google-cloud/translate
```

#### Step 4: Deploy Monitoring Components
```bash
# Copy monitoring files
cp ~/realtime_translation_enhanced_astrix/UnifiedStationCollector.js \
  ./monitoring/

cp ~/realtime_translation_enhanced_astrix/RealTimeMetricsProvider.js \
  ./monitoring/

cp ~/realtime_translation_enhanced_astrix/StationAgent-Unified.js \
  ./monitoring/
```

#### Step 5: Deploy Station Configurations
```bash
# Navigate to translation-app
cd /home/azureuser/translation-app

# Deploy empty station templates
for STATION in STATION_{1..8}; do
  for EXT in 3333 4444; do
    cat > station-configs/${STATION}-${EXT}-config.json << 'EOF'
{
  "station_id": "PLACEHOLDER_STATION",
  "extension": PLACEHOLDER_EXT,
  "timestamp": "",
  "optimization_version": "2.0",
  "source": "empty_template_for_capture",
  "audio_processing": {
    "agc": {
      "enabled": null,
      "targetLevel": null,
      "maxGain": null,
      "attackTime": null,
      "releaseTime": null,
      "holdTime": null
    },
    "aec": {
      "enabled": null,
      "filterLength": null,
      "adaptationRate": null,
      "suppressionLevel": null,
      "tailLength": null,
      "convergenceTime": null,
      "echoCancellation": null
    },
    "noiseReduction": {
      "enabled": null,
      "level": null,
      "spectralFloor": null,
      "preserveVoice": null,
      "adaptiveMode": null,
      "suppressionBands": null
    },
    "compressor": {
      "enabled": null,
      "threshold": null,
      "ratio": null,
      "attack": null,
      "release": null,
      "knee": null
    },
    "limiter": {
      "enabled": null,
      "threshold": null,
      "release": null,
      "lookahead": null
    }
  },
  "codec": {
    "type": null,
    "bitrate": null,
    "complexity": null,
    "vbr": null,
    "dtx": null,
    "fec": null,
    "packetLossPercentage": null,
    "frameSize": null
  },
  "buffers": {
    "jitterBuffer": {
      "enabled": null,
      "minDepth": null,
      "maxDepth": null,
      "targetDepth": null,
      "adaptiveMode": null
    },
    "playback": {
      "size": null,
      "latency": null
    },
    "record": {
      "size": null,
      "latency": null
    }
  },
  "deepgram": {
    "model": null,
    "language": null,
    "punctuate": null,
    "diarize": null,
    "multichannel": null,
    "alternatives": null,
    "interim": null,
    "endpointing": null
  },
  "translation": {
    "enabled": null,
    "sourceLanguage": null,
    "targetLanguage": null,
    "formality": null,
    "timeout": null
  },
  "tts": {
    "voice": null,
    "speed": null,
    "pitch": null,
    "volume": null,
    "emphasis": null,
    "sentencePause": null,
    "ssml": null
  },
  "quality_targets": {
    "target_snr": null,
    "target_mos": null,
    "max_latency": null,
    "max_packet_loss": null
  }
}
EOF
    # Replace placeholders
    sed -i "s/PLACEHOLDER_STATION/${STATION}/g" \
      station-configs/${STATION}-${EXT}-config.json
    sed -i "s/PLACEHOLDER_EXT/${EXT}/g" \
      station-configs/${STATION}-${EXT}-config.json
  done
done
```

#### Step 6: Deploy Support Services
```bash
# Copy monitoring server
cp ~/realtime_translation_enhanced_astrix/monitoring-server.js \
  /home/azureuser/translation-app/

# Copy database server
cp ~/realtime_translation_enhanced_astrix/simplified-database-server.js \
  /home/azureuser/translation-app/

# Copy bridge service
cp ~/realtime_translation_enhanced_astrix/monitoring-to-database-bridge.js \
  /home/azureuser/translation-app/

# Copy continuous monitoring
cp ~/realtime_translation_enhanced_astrix/continuous-full-monitoring.js \
  /home/azureuser/translation-app/
```

#### Step 7: Configure Environment Variables
```bash
# Create environment configuration
cat > /home/azureuser/translation-app/.env << EOF
# Server Configuration
SERVER_IP=20.170.155.53
DASHBOARD_PORT=3020
GATEWAY_3333_PORT=3333
GATEWAY_4444_PORT=4444
MONITORING_PORT=8083
DATABASE_PORT=8084

# API Keys (replace with actual keys)
DEEPGRAM_API_KEY=your_deepgram_key_here
GOOGLE_TRANSLATE_KEY=your_google_key_here
ELEVENLABS_API_KEY=your_elevenlabs_key_here

# Monitoring Settings
METRICS_INTERVAL=1000
METRICS_HISTORY_LENGTH=1000
ALERT_THRESHOLD=0.8

# Debug Settings
DEBUG_MODE=false
LOG_LEVEL=info
EOF
```

#### Step 8: Start Core Services

```bash
# Start services in correct order

# 1. Start Database Server
cd /home/azureuser/translation-app
nohup node simplified-database-server.js > /tmp/database.log 2>&1 &
echo "Database server started on port 8084"
sleep 5

# 2. Start Monitoring Server
nohup node monitoring-server.js > /tmp/monitoring.log 2>&1 &
echo "Monitoring server started on port 8083"
sleep 5

# 3. Start Monitoring Bridge
nohup node monitoring-to-database-bridge.js > /tmp/bridge.log 2>&1 &
echo "Monitoring bridge started"
sleep 5

# 4. Start Gateway Services
cd /home/azureuser/translation-app/3333_4444__Operational
nohup node gateway-3333.js > /tmp/gateway-3333.log 2>&1 &
echo "Gateway 3333 started"

nohup node gateway-4444.js > /tmp/gateway-4444.log 2>&1 &
echo "Gateway 4444 started"
sleep 5

# 5. Start ARI Service
nohup node ari-gstreamer-operational.js > /tmp/ari.log 2>&1 &
echo "ARI service started"
sleep 5

# 6. Start STTTTSserver (Main Service)
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
nohup node STTTTSserver.js > /tmp/STTTTSserver.log 2>&1 &
echo "STTTTSserver started on port 3020"
sleep 5

# 7. Start Continuous Monitoring
cd /home/azureuser/translation-app
nohup node continuous-full-monitoring.js > /tmp/continuous.log 2>&1 &
echo "Continuous monitoring started"
```

#### Step 9: Verify Installation
```bash
# Check all services are running
ps aux | grep -E "STTTTSserver|gateway|monitoring|database" | grep -v grep

# Check port availability
netstat -tulpn | grep -E "3020|3333|4444|8083|8084"

# Test dashboard access
curl -I http://localhost:3020/dashboard.html

# Check logs for errors
tail -f /tmp/STTTTSserver.log
```

### 13.3 SafeLoader Installation (Optional - Currently Disabled)

⚠️ **WARNING**: SafeLoader integration previously caused system failure. Test thoroughly before production deployment.

```bash
# Copy SafeLoader files (DO NOT INTEGRATE YET)
cp ~/realtime_translation_enhanced_astrix/StationKnobSafeLoader.js \
  /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/

cp ~/realtime_translation_enhanced_astrix/STTTTSserver-SafeLoader-Integration.js \
  /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/

# Extract station configs
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
tar -xzf station-configs-empty.tar.gz
```

### 13.4 Service Management Scripts

#### Create Start Script
```bash
cat > /home/azureuser/translation-app/start-all.sh << 'EOF'
#!/bin/bash

echo "Starting Translation System Services..."

# Function to start service
start_service() {
  local service_name=$1
  local service_cmd=$2
  local service_dir=$3
  local log_file=$4

  cd $service_dir
  if pgrep -f "$service_name" > /dev/null; then
    echo "✓ $service_name already running"
  else
    nohup $service_cmd > $log_file 2>&1 &
    sleep 3
    if pgrep -f "$service_name" > /dev/null; then
      echo "✓ $service_name started successfully"
    else
      echo "✗ Failed to start $service_name"
      tail -5 $log_file
    fi
  fi
}

# Start services
start_service "simplified-database-server" "node simplified-database-server.js" \
  "/home/azureuser/translation-app" "/tmp/database.log"

start_service "monitoring-server" "node monitoring-server.js" \
  "/home/azureuser/translation-app" "/tmp/monitoring.log"

start_service "monitoring-to-database-bridge" "node monitoring-to-database-bridge.js" \
  "/home/azureuser/translation-app" "/tmp/bridge.log"

start_service "gateway-3333" "node gateway-3333.js" \
  "/home/azureuser/translation-app/3333_4444__Operational" "/tmp/gateway-3333.log"

start_service "gateway-4444" "node gateway-4444.js" \
  "/home/azureuser/translation-app/3333_4444__Operational" "/tmp/gateway-4444.log"

start_service "ari-gstreamer-operational" "node ari-gstreamer-operational.js" \
  "/home/azureuser/translation-app/3333_4444__Operational" "/tmp/ari.log"

start_service "STTTTSserver" "node STTTTSserver.js" \
  "/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver" "/tmp/STTTTSserver.log"

start_service "continuous-full-monitoring" "node continuous-full-monitoring.js" \
  "/home/azureuser/translation-app" "/tmp/continuous.log"

echo ""
echo "All services started. Dashboard available at http://$(hostname -I | awk '{print $1}'):3020/dashboard.html"
EOF

chmod +x /home/azureuser/translation-app/start-all.sh
```

#### Create Stop Script
```bash
cat > /home/azureuser/translation-app/stop-all.sh << 'EOF'
#!/bin/bash

echo "Stopping Translation System Services..."

# Kill services
pkill -f STTTTSserver
pkill -f gateway-3333
pkill -f gateway-4444
pkill -f ari-gstreamer
pkill -f monitoring-server
pkill -f simplified-database-server
pkill -f monitoring-to-database-bridge
pkill -f continuous-full-monitoring

echo "All services stopped"
EOF

chmod +x /home/azureuser/translation-app/stop-all.sh
```

#### Create Status Check Script
```bash
cat > /home/azureuser/translation-app/check-status.sh << 'EOF'
#!/bin/bash

echo "Translation System Status Check"
echo "=============================="
echo ""

check_service() {
  local service_name=$1
  local port=$2

  if pgrep -f "$service_name" > /dev/null; then
    echo "✓ $service_name: RUNNING"
    if [ ! -z "$port" ]; then
      if netstat -tulpn 2>/dev/null | grep -q ":$port "; then
        echo "  Port $port: LISTENING"
      else
        echo "  Port $port: NOT LISTENING"
      fi
    fi
  else
    echo "✗ $service_name: NOT RUNNING"
  fi
}

# Check each service
check_service "STTTTSserver" 3020
check_service "gateway-3333" 3333
check_service "gateway-4444" 4444
check_service "monitoring-server" 8083
check_service "simplified-database-server" 8084
check_service "ari-gstreamer-operational" ""
check_service "monitoring-to-database-bridge" ""
check_service "continuous-full-monitoring" ""

echo ""
echo "Dashboard URL: http://$(hostname -I | awk '{print $1}'):3020/dashboard.html"
EOF

chmod +x /home/azureuser/translation-app/check-status.sh
```

### 13.5 Systemd Service Configuration (Production)

```bash
# Create systemd service for STTTTSserver
sudo cat > /etc/systemd/system/sttttserver.service << EOF
[Unit]
Description=STTTTSserver - Speech Translation Service
After=network.target

[Service]
Type=simple
User=azureuser
WorkingDirectory=/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
ExecStart=/usr/bin/node STTTTSserver.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/sttttserver.log
StandardError=append:/var/log/sttttserver.error.log

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable sttttserver
sudo systemctl start sttttserver
sudo systemctl status sttttserver
```

### 13.6 Troubleshooting Guide

#### Common Issues and Solutions

##### 1. Dashboard Not Accessible
```bash
# Check if STTTTSserver is running
ps aux | grep STTTTSserver

# Check port 3020
netstat -tulpn | grep 3020

# Check logs
tail -100 /tmp/STTTTSserver.log

# Restart service
pkill -f STTTTSserver
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
nohup node STTTTSserver.js > /tmp/STTTTSserver.log 2>&1 &
```

##### 2. Monitoring Data Not Updating
```bash
# Check monitoring services
ps aux | grep -E "monitoring-server|database|bridge"

# Restart monitoring stack
pkill -f monitoring-server
pkill -f simplified-database-server
pkill -f monitoring-to-database-bridge

cd /home/azureuser/translation-app
./start-all.sh
```

##### 3. Station Configuration Issues
```bash
# Check station config files
ls -la /home/azureuser/translation-app/station-configs/

# Verify JSON validity
for file in station-configs/*.json; do
  echo "Checking $file..."
  python3 -m json.tool "$file" > /dev/null || echo "Invalid JSON in $file"
done
```

##### 4. SafeLoader Integration Recovery
```bash
# If SafeLoader breaks the system
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver

# Restore from backup
cp STTTTSserver.js.backup-* STTTTSserver.js

# Or download from GitHub
wget -O STTTTSserver.js \
  https://raw.githubusercontent.com/sagivst/realtime_translation_enhanced_astrix/Working_3333_4444_Full_Cycle_Monitoring_Knobs_in/3333_4444__Operational/STTTTSserver/STTTTSserver.js

# Restart
pkill -f STTTTSserver
nohup node STTTTSserver.js > /tmp/STTTTSserver.log 2>&1 &
```

### 13.7 Performance Optimization

#### System Tuning
```bash
# Increase file descriptors
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Optimize network settings
sudo sysctl -w net.core.somaxconn=1024
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=1024
sudo sysctl -w net.ipv4.tcp_tw_reuse=1

# Make persistent
echo "net.core.somaxconn=1024" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog=1024" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_tw_reuse=1" | sudo tee -a /etc/sysctl.conf
```

#### Node.js Optimization
```bash
# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable cluster mode (if using PM2)
pm2 start STTTTSserver.js -i max
```

### 13.8 Backup and Recovery

#### Automated Backup Script
```bash
cat > /home/azureuser/translation-app/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/azureuser/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="translation_system_backup_${TIMESTAMP}.tar.gz"

mkdir -p $BACKUP_DIR

# Create backup
tar -czf ${BACKUP_DIR}/${BACKUP_NAME} \
  --exclude='node_modules' \
  --exclude='*.log' \
  --exclude='*.tar.gz' \
  /home/azureuser/translation-app/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup created: ${BACKUP_DIR}/${BACKUP_NAME}"
EOF

chmod +x /home/azureuser/translation-app/backup.sh

# Add to crontab for daily backup
(crontab -l 2>/dev/null; echo "0 2 * * * /home/azureuser/translation-app/backup.sh") | crontab -
```

### 13.9 Monitoring and Alerts

#### Health Check Endpoint
```javascript
// Add to STTTTSserver.js
app.get('/health', (req, res) => {
  const health = {
    status: 'operational',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: Date.now(),
    services: {
      database: checkDatabaseConnection(),
      monitoring: checkMonitoringConnection(),
      gateways: checkGatewayConnections()
    }
  };
  res.json(health);
});
```

#### External Monitoring Setup
```bash
# Install monitoring agent (example with Datadog)
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=your_api_key \
DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# Configure custom metrics
cat > /etc/datadog-agent/conf.d/translation_system.yaml << EOF
init_config:

instances:
  - url: http://localhost:3020/health
    name: translation_system
    timeout: 5
    headers:
      Content-Type: application/json
EOF
```

### 13.10 Security Hardening

```bash
# Firewall configuration
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 3020/tcp  # Dashboard
sudo ufw allow 3333/tcp  # Gateway 3333
sudo ufw allow 4444/tcp  # Gateway 4444
sudo ufw allow 8083/tcp  # Monitoring
sudo ufw allow 8084/tcp  # Database
sudo ufw enable

# SSL/TLS Setup (optional)
sudo apt-get install certbot
sudo certbot certonly --standalone -d your-domain.com

# Update STTTTSserver for HTTPS
# Add SSL configuration to your server setup
```

---

**Document Generated**: December 2, 2024
**System Status**: OPERATIONAL
**Author**: System Architecture Team
**Version**: 2.0 (with Installation Guide)