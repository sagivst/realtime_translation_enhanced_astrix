# Audio Quality Monitoring, Control & Optimization Plan
## With Configuration-Based Buffer Management

**Document Version:** 2.0  
**Date:** 2025-11-25  
**System:** 3333/4444 Real-Time Translation with GStreamer  
**Enhancement:** Added runtime-configurable buffer monitoring and control

---

## Executive Summary

This document provides a comprehensive, step-by-step plan to diagnose, monitor, and optimize audio quality in the real-time translation system. The plan addresses the current "choppy audio with missing syllable endings" issue while maximizing system efficiency and performance.

**NEW IN V2.0:** Configuration-based buffer management system that allows real-time adjustments without code changes.

**Current Issue:** Outgoing SIP voice sounds choppy - words are missing part of the last syllable

**Goal:** Identify root cause, implement targeted fix, validate quality, and establish ongoing monitoring with runtime control

---

## Table of Contents

1. [Current System State](#current-system-state)
2. [Known Issues](#known-issues)
3. **[NEW: Configuration-Based Buffer System](#configuration-based-buffer-system)** ⭐
4. [Phase 1: Diagnostic Infrastructure](#phase-1-diagnostic-infrastructure)
5. [Phase 2: Data Collection](#phase-2-data-collection)
6. [Phase 3: Root Cause Analysis](#phase-3-root-cause-analysis)
7. [Phase 4: Targeted Fixes](#phase-4-targeted-fixes)
8. [Phase 5: Validation & Testing](#phase-5-validation--testing)
9. [Phase 6: Performance Optimization](#phase-6-performance-optimization)
10. [Monitoring & Alerting](#monitoring--alerting)
11. **[NEW: Buffer Control API](#buffer-control-api)** ⭐
12. [Rollback Procedures](#rollback-procedures)

**Total Estimated Time:** 10-18 hours (includes buffer system setup)  
**Phases can be executed incrementally over multiple sessions**

---

## Current System State

### ✅ Working Components

- Asterisk → Gateway → STTTTSserver → Gateway → Asterisk (audio path functional)
- Deepgram STT (speech-to-text working)
- DeepL MT (machine translation working)  
- ElevenLabs TTS (text-to-speech working)
- RTP sequence wrapping fixed (gateways stable for >6 minutes)
- Audio gain at 7.5x (proper amplification for Deepgram)
- Timing/Sync module operational with AutoSync

### System Architecture with Buffer Points

```
                          ┌──────────────────────────────────────┐
                          │  AUDIO PIPELINE WITH BUFFER POINTS  │
                          └──────────────────────────────────────┘

Phone A (3333)
    │
    ├─> Asterisk:4000 (ALAW 8kHz)
    │       │
    │       ├─> [BUFFER POINT 1: Asterisk→Gateway] ← Configurable
    │       │
    │       ├─> Gateway-3333
    │       │       │
    │       │       ├─> [BUFFER POINT 2: GStreamer Input] ← Configurable
    │       │       │
    │       │       ├─> GStreamer Upsampler (ALAW→PCM 16kHz)
    │       │       │
    │       │       └─> [BUFFER POINT 3: GStreamer Output] ← Configurable
    │       │
    │       └─> STTTTSserver:6120 (PCM 16kHz)
    │               │
    │               ├─> [BUFFER POINT 4: UDP Receive] ← Configurable
    │               │
    │               ├─> STT (Deepgram)
    │               ├─> MT (DeepL)  
    │               └─> TTS (ElevenLabs)
    │                       │
    │                       ├─> [BUFFER POINT 5: TTS Output] ← Configurable
    │                       │
    │                       └─> [BUFFER POINT 6: UDP Send] ← Configurable
    │
    │       STTTTSserver:6121 (PCM 16kHz)
    │       │
    │       ├─> [BUFFER POINT 7: Gateway Receive] ← Configurable
    │       │
    │       ├─> Gateway-3333
    │       │       │
    │       │       ├─> GStreamer Downsampler (PCM→ALAW 8kHz)
    │       │       │
    │       │       └─> [BUFFER POINT 8: RTP Output] ← Configurable
    │       │
    └─< Asterisk:4000 (ALAW 8kHz RTP)

[Similar flow for Phone B (4444)]

═══════════════════════════════════════════════════════════════
BUFFER MONITORING STATIONS: 8 per direction = 16 total points
═══════════════════════════════════════════════════════════════
```

---

## Configuration-Based Buffer System

### Overview

**Purpose:** Allow real-time adjustment of audio buffer sizes and monitoring thresholds **without code changes or system restarts**.

**Benefits:**
- ✅ Tune buffer sizes on-the-fly during live calls
- ✅ Monitor buffer fill levels in real-time
- ✅ Adjust thresholds based on network conditions
- ✅ No coding required for changes
- ✅ Instant rollback if changes cause issues
- ✅ Historical tracking of buffer performance

### Configuration File Structure

**Location:** `/home/azureuser/translation-app/3333_4444__Operational/audio-buffer-config.json`

```json
{
  "version": "2.0",
  "last_updated": "2025-11-25T19:00:00Z",
  "updated_by": "admin",
  
  "buffer_stations": {
    
    "station_1_asterisk_to_gateway": {
      "enabled": true,
      "name": "Asterisk to Gateway",
      "direction": "incoming",
      "component": "gateway",
      "buffer_size_bytes": 8192,
      "buffer_max_bytes": 16384,
      "warning_threshold_percent": 75,
      "critical_threshold_percent": 90,
      "monitoring_enabled": true,
      "log_level": "info"
    },
    
    "station_2_gstreamer_input": {
      "enabled": true,
      "name": "GStreamer Input Buffer",
      "direction": "incoming",
      "component": "gstreamer",
      "buffer_size_bytes": 4096,
      "buffer_max_bytes": 8192,
      "queue_max_buffers": 50,
      "queue_max_time_ms": 1000,
      "warning_threshold_percent": 70,
      "critical_threshold_percent": 85,
      "monitoring_enabled": true,
      "log_level": "info"
    },
    
    "station_3_gstreamer_output": {
      "enabled": true,
      "name": "GStreamer Output Buffer",
      "direction": "outgoing",
      "component": "gstreamer",
      "buffer_size_bytes": 4096,
      "buffer_max_bytes": 8192,
      "warning_threshold_percent": 70,
      "critical_threshold_percent": 85,
      "monitoring_enabled": true,
      "log_level": "info"
    },
    
    "station_4_udp_receive_stttts": {
      "enabled": true,
      "name": "STTTTSserver UDP Receive",
      "direction": "incoming",
      "component": "stttsserver",
      "buffer_size_bytes": 32000,
      "buffer_max_bytes": 64000,
      "accumulation_threshold_bytes": 32000,
      "accumulation_timeout_ms": 1000,
      "warning_threshold_percent": 75,
      "critical_threshold_percent": 90,
      "monitoring_enabled": true,
      "log_level": "info"
    },
    
    "station_5_tts_output": {
      "enabled": true,
      "name": "TTS Output Buffer",
      "direction": "processing",
      "component": "stttsserver",
      "buffer_size_bytes": 64000,
      "buffer_max_bytes": 128000,
      "chunk_accumulation": true,
      "warning_threshold_percent": 80,
      "critical_threshold_percent": 95,
      "monitoring_enabled": true,
      "log_level": "info"
    },
    
    "station_6_udp_send_stttts": {
      "enabled": true,
      "name": "STTTTSserver UDP Send",
      "direction": "outgoing",
      "component": "stttsserver",
      "socket_send_buffer_bytes": 262144,
      "frame_size_bytes": 160,
      "frame_batch_size": 1,
      "frame_delay_ms": 5,
      "warning_threshold_percent": 75,
      "critical_threshold_percent": 90,
      "monitoring_enabled": true,
      "log_level": "info",
      "metrics": {
        "track_dropped_bytes": true,
        "track_latency": true,
        "track_packet_count": true
      }
    },
    
    "station_7_gateway_receive": {
      "enabled": true,
      "name": "Gateway Receive from STTTTSserver",
      "direction": "incoming",
      "component": "gateway",
      "buffer_size_bytes": 8192,
      "buffer_max_bytes": 16384,
      "warning_threshold_percent": 75,
      "critical_threshold_percent": 90,
      "monitoring_enabled": true,
      "log_level": "info"
    },
    
    "station_8_rtp_output": {
      "enabled": true,
      "name": "RTP Output to Asterisk",
      "direction": "outgoing",
      "component": "gateway",
      "socket_send_buffer_bytes": 262144,
      "rtp_packet_size_bytes": 172,
      "warning_threshold_percent": 75,
      "critical_threshold_percent": 90,
      "monitoring_enabled": true,
      "log_level": "info"
    }
  },
  
  "global_settings": {
    "monitoring_interval_ms": 5000,
    "stats_retention_hours": 24,
    "alert_cooldown_seconds": 60,
    "auto_adjust_enabled": false,
    "auto_adjust_threshold": 85
  },
  
  "presets": {
    "low_latency": {
      "description": "Minimal buffers for lowest latency",
      "multiplier": 0.5
    },
    "balanced": {
      "description": "Default balanced settings",
      "multiplier": 1.0
    },
    "high_reliability": {
      "description": "Larger buffers for unreliable networks",
      "multiplier": 2.0
    },
    "maximum_buffer": {
      "description": "Maximum buffering for testing",
      "multiplier": 4.0
    }
  }
}
```

### Configuration Loader Module

**File:** `/home/azureuser/translation-app/3333_4444__Operational/buffer-config-loader.js`

```javascript
#!/usr/bin/env node
/**
 * Audio Buffer Configuration Loader
 * Loads and validates buffer configuration without requiring code changes
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'audio-buffer-config.json');
const CONFIG_RELOAD_INTERVAL = 30000; // 30 seconds

class BufferConfigLoader {
  constructor() {
    this.config = null;
    this.lastModified = null;
    this.watchers = [];
  }

  /**
   * Load configuration from file
   */
  load() {
    try {
      const stats = fs.statSync(CONFIG_FILE);
      const content = fs.readFileSync(CONFIG_FILE, 'utf8');
      this.config = JSON.parse(content);
      this.lastModified = stats.mtime;
      
      console.log(`[BufferConfig] Loaded config v${this.config.version} from ${CONFIG_FILE}`);
      console.log(`[BufferConfig] Last modified: ${this.lastModified}`);
      
      return this.config;
    } catch (err) {
      console.error(`[BufferConfig] ERROR loading config: ${err.message}`);
      return null;
    }
  }

  /**
   * Get buffer settings for specific station
   */
  getStation(stationId) {
    if (!this.config) this.load();
    return this.config?.buffer_stations?.[stationId];
  }

  /**
   * Get all enabled stations
   */
  getEnabledStations() {
    if (!this.config) this.load();
    
    const enabled = {};
    for (const [id, station] of Object.entries(this.config.buffer_stations || {})) {
      if (station.enabled) {
        enabled[id] = station;
      }
    }
    return enabled;
  }

  /**
   * Get global settings
   */
  getGlobalSettings() {
    if (!this.config) this.load();
    return this.config?.global_settings;
  }

  /**
   * Apply preset to all stations
   */
  applyPreset(presetName) {
    if (!this.config) this.load();
    
    const preset = this.config.presets?.[presetName];
    if (!preset) {
      console.error(`[BufferConfig] Preset '${presetName}' not found`);
      return false;
    }

    console.log(`[BufferConfig] Applying preset: ${presetName} (${preset.description})`);
    console.log(`[BufferConfig] Multiplier: ${preset.multiplier}x`);

    // Apply multiplier to all buffer sizes
    for (const station of Object.values(this.config.buffer_stations)) {
      if (station.buffer_size_bytes) {
        station.buffer_size_bytes = Math.floor(station.buffer_size_bytes * preset.multiplier);
      }
      if (station.buffer_max_bytes) {
        station.buffer_max_bytes = Math.floor(station.buffer_max_bytes * preset.multiplier);
      }
    }

    return true;
  }

  /**
   * Watch for configuration changes
   */
  watch(callback) {
    const watcher = fs.watch(CONFIG_FILE, (eventType) => {
      if (eventType === 'change') {
        console.log(`[BufferConfig] Configuration file changed, reloading...`);
        const newConfig = this.load();
        if (newConfig && callback) {
          callback(newConfig);
        }
      }
    });

    this.watchers.push(watcher);
    return watcher;
  }

  /**
   * Stop watching
   */
  stopWatching() {
    this.watchers.forEach(w => w.close());
    this.watchers = [];
  }
}

// Singleton instance
const configLoader = new BufferConfigLoader();

module.exports = configLoader;

// CLI usage
if (require.main === module) {
  const action = process.argv[2];
  const param = process.argv[3];

  switch (action) {
    case 'load':
      const config = configLoader.load();
      console.log(JSON.stringify(config, null, 2));
      break;

    case 'get':
      const station = configLoader.getStation(param);
      console.log(JSON.stringify(station, null, 2));
      break;

    case 'preset':
      configLoader.applyPreset(param);
      break;

    case 'watch':
      console.log('Watching for configuration changes... (Ctrl+C to stop)');
      configLoader.watch((newConfig) => {
        console.log('Configuration reloaded!');
      });
      break;

    default:
      console.log('Usage:');
      console.log('  node buffer-config-loader.js load          # Load and display config');
      console.log('  node buffer-config-loader.js get <station> # Get specific station config');
      console.log('  node buffer-config-loader.js preset <name> # Apply preset');
      console.log('  node buffer-config-loader.js watch         # Watch for changes');
  }
}
```

### Buffer Monitor Service

**File:** `/home/azureuser/translation-app/3333_4444__Operational/buffer-monitor-service.js`

```javascript
#!/usr/bin/env node
/**
 * Buffer Monitoring Service
 * Real-time monitoring of all buffer stations with configurable thresholds
 */

const dgram = require('udp4');
const configLoader = require('./buffer-config-loader');

class BufferMonitorService {
  constructor() {
    this.stats = new Map();
    this.alerts = [];
    this.config = configLoader.load();
    this.monitoringInterval = null;
  }

  /**
   * Initialize monitoring for all enabled stations
   */
  start() {
    console.log('[BufferMonitor] Starting monitoring service...');
    
    const enabled = configLoader.getEnabledStations();
    console.log(`[BufferMonitor] Monitoring ${Object.keys(enabled).length} stations`);

    // Initialize stats for each station
    for (const [id, station] of Object.entries(enabled)) {
      this.stats.set(id, {
        stationId: id,
        name: station.name,
        currentBytes: 0,
        maxBytes: station.buffer_max_bytes || station.buffer_size_bytes,
        fillPercent: 0,
        packetsReceived: 0,
        packetsDropped: 0,
        bytesDropped: 0,
        warnings: 0,
        criticals: 0,
        lastUpdate: Date.now()
      });
    }

    // Start periodic monitoring
    const interval = this.config.global_settings.monitoring_interval_ms || 5000;
    this.monitoringInterval = setInterval(() => {
      this.checkAllStations();
    }, interval);

    // Watch for config changes
    configLoader.watch((newConfig) => {
      console.log('[BufferMonitor] Configuration changed, updating monitoring...');
      this.config = newConfig;
      this.applyConfigChanges();
    });

    console.log('[BufferMonitor] ✓ Monitoring service started');
  }

  /**
   * Update stats for a specific station
   */
  updateStation(stationId, metrics) {
    const stats = this.stats.get(stationId);
    if (!stats) return;

    stats.currentBytes = metrics.currentBytes || stats.currentBytes;
    stats.packetsReceived = metrics.packetsReceived || stats.packetsReceived;
    stats.packetsDropped = metrics.packetsDropped || stats.packetsDropped;
    stats.bytesDropped = metrics.bytesDropped || stats.bytesDropped;
    stats.fillPercent = (stats.currentBytes / stats.maxBytes) * 100;
    stats.lastUpdate = Date.now();

    this.checkThresholds(stationId, stats);
  }

  /**
   * Check thresholds and generate alerts
   */
  checkThresholds(stationId, stats) {
    const station = configLoader.getStation(stationId);
    if (!station || !station.monitoring_enabled) return;

    const fillPercent = stats.fillPercent;

    // Critical threshold
    if (fillPercent >= station.critical_threshold_percent) {
      this.alert('CRITICAL', stationId, `Buffer at ${fillPercent.toFixed(1)}% (critical: ${station.critical_threshold_percent}%)`);
      stats.criticals++;
    }
    // Warning threshold
    else if (fillPercent >= station.warning_threshold_percent) {
      this.alert('WARNING', stationId, `Buffer at ${fillPercent.toFixed(1)}% (warning: ${station.warning_threshold_percent}%)`);
      stats.warnings++;
    }
  }

  /**
   * Generate alert
   */
  alert(level, stationId, message) {
    const station = configLoader.getStation(stationId);
    const alert = {
      timestamp: new Date().toISOString(),
      level,
      stationId,
      stationName: station.name,
      message
    };

    this.alerts.push(alert);
    console.log(`[BufferMonitor] [${level}] ${station.name}: ${message}`);

    // Keep only recent alerts
    const maxAge = this.config.global_settings.stats_retention_hours * 3600000;
    const cutoff = Date.now() - maxAge;
    this.alerts = this.alerts.filter(a => new Date(a.timestamp).getTime() > cutoff);
  }

  /**
   * Check all stations
   */
  checkAllStations() {
    for (const [id, stats] of this.stats.entries()) {
      // Check if station is stale (no updates)
      const timeSinceUpdate = Date.now() - stats.lastUpdate;
      if (timeSinceUpdate > 60000) {  // 60 seconds
        console.log(`[BufferMonitor] WARNING: ${stats.name} has not updated in ${(timeSinceUpdate/1000).toFixed(0)}s`);
      }
    }
  }

  /**
   * Apply configuration changes
   */
  applyConfigChanges() {
    const enabled = configLoader.getEnabledStations();
    
    // Add new stations
    for (const [id, station] of Object.entries(enabled)) {
      if (!this.stats.has(id)) {
        console.log(`[BufferMonitor] Adding new station: ${station.name}`);
        this.stats.set(id, {
          stationId: id,
          name: station.name,
          currentBytes: 0,
          maxBytes: station.buffer_max_bytes || station.buffer_size_bytes,
          fillPercent: 0,
          packetsReceived: 0,
          packetsDropped: 0,
          bytesDropped: 0,
          warnings: 0,
          criticals: 0,
          lastUpdate: Date.now()
        });
      }
    }

    // Remove disabled stations
    for (const id of this.stats.keys()) {
      if (!enabled[id]) {
        console.log(`[BufferMonitor] Removing disabled station: ${this.stats.get(id).name}`);
        this.stats.delete(id);
      }
    }
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      stations: Array.from(this.stats.values()),
      alerts: this.alerts.slice(-100),  // Last 100 alerts
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    configLoader.stopWatching();
    console.log('[BufferMonitor] Monitoring service stopped');
  }
}

// Singleton instance
const monitorService = new BufferMonitorService();

module.exports = monitorService;

// CLI usage
if (require.main === module) {
  monitorService.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[BufferMonitor] Shutting down...');
    monitorService.stop();
    process.exit(0);
  });

  // Keep alive
  setInterval(() => {
    const stats = monitorService.getStats();
    console.log(`\n[BufferMonitor] === STATUS UPDATE ===`);
    stats.stations.forEach(s => {
      console.log(`  ${s.name}: ${s.fillPercent.toFixed(1)}% full, ${s.packetsReceived} packets, ${s.bytesDropped}B dropped`);
    });
  }, 30000);  // Every 30 seconds
}
```

### Quick Start Commands

```bash
# 1. Create initial configuration file
cat > /home/azureuser/translation-app/3333_4444__Operational/audio-buffer-config.json << 'EOF'
<paste the JSON configuration above>
EOF

# 2. Create the configuration loader
cat > /home/azureuser/translation-app/3333_4444__Operational/buffer-config-loader.js << 'EOF'
<paste the loader code above>
EOF

# 3. Create the monitoring service
cat > /home/azureuser/translation-app/3333_4444__Operational/buffer-monitor-service.js << 'EOF'
<paste the monitor code above>
EOF

# 4. Make executable
chmod +x /home/azureuser/translation-app/3333_4444__Operational/buffer-*.js

# 5. Test configuration loading
node /home/azureuser/translation-app/3333_4444__Operational/buffer-config-loader.js load

# 6. Start monitoring service
nohup node /home/azureuser/translation-app/3333_4444__Operational/buffer-monitor-service.js > /tmp/buffer-monitor.log 2>&1 &

# 7. Watch monitoring in real-time
tail -f /tmp/buffer-monitor.log
```

### Runtime Buffer Adjustments (No Code Changes!)

```bash
# View current configuration
cat /home/azureuser/translation-app/3333_4444__Operational/audio-buffer-config.json | jq '.buffer_stations.station_6_udp_send_stttts'

# Increase UDP send buffer (example: fix choppy audio)
cat /home/azureuser/translation-app/3333_4444__Operational/audio-buffer-config.json | \
  jq '.buffer_stations.station_6_udp_send_stttts.socket_send_buffer_bytes = 524288' > /tmp/config-temp.json && \
  mv /tmp/config-temp.json /home/azureuser/translation-app/3333_4444__Operational/audio-buffer-config.json

# Configuration automatically reloads within 30 seconds!

# Apply preset for unreliable network
node /home/azureuser/translation-app/3333_4444__Operational/buffer-config-loader.js preset high_reliability

# Check specific station
node /home/azureuser/translation-app/3333_4444__Operational/buffer-config-loader.js get station_6_udp_send_stttts
```

---

## Buffer Control API

### HTTP API for Runtime Control

Add to STTTTSserver.js:

```javascript
const bufferMonitor = require('./buffer-monitor-service');
const configLoader = require('./buffer-config-loader');

// Start buffer monitoring
bufferMonitor.start();

// API endpoint: Get buffer stats
app.get('/api/buffers/stats', (req, res) => {
  res.json(bufferMonitor.getStats());
});

// API endpoint: Get configuration
app.get('/api/buffers/config', (req, res) => {
  res.json(configLoader.load());
});

// API endpoint: Update station config
app.post('/api/buffers/station/:id', express.json(), (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const config = configLoader.load();
  if (!config.buffer_stations[id]) {
    return res.status(404).json({ error: 'Station not found' });
  }

  // Apply updates
  Object.assign(config.buffer_stations[id], updates);
  
  // Save configuration
  fs.writeFileSync(
    '/home/azureuser/translation-app/3333_4444__Operational/audio-buffer-config.json',
    JSON.stringify(config, null, 2)
  );

  res.json({ success: true, station: config.buffer_stations[id] });
});

// API endpoint: Apply preset
app.post('/api/buffers/preset/:name', (req, res) => {
  const { name } = req.params;
  const success = configLoader.applyPreset(name);
  
  if (success) {
    res.json({ success: true, preset: name });
  } else {
    res.status(404).json({ error: 'Preset not found' });
  }
});
```

### API Usage Examples

```bash
# Get current buffer stats
curl http://20.170.155.53:3020/api/buffers/stats | jq

# Get configuration
curl http://20.170.155.53:3020/api/buffers/config | jq

# Update specific station buffer size
curl -X POST http://20.170.155.53:3020/api/buffers/station/station_6_udp_send_stttts \
  -H "Content-Type: application/json" \
  -d '{"socket_send_buffer_bytes": 524288}'

# Apply preset
curl -X POST http://20.170.155.53:3020/api/buffers/preset/high_reliability

# Get specific station stats
curl http://20.170.155.53:3020/api/buffers/stats | jq '.stations[] | select(.stationId == "station_6_udp_send_stttts")'
```

---

## Phase 1: Diagnostic Infrastructure

[Previous Phase 1 content remains the same, with additions:]

### Step 1.5: Integrate Buffer Monitoring

```bash
# Start buffer monitoring service
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational && nohup node buffer-monitor-service.js > /tmp/buffer-monitor.log 2>&1 & echo \$! > /tmp/buffer-monitor.pid"

# Verify it's running
ssh azureuser@20.170.155.53 "ps aux | grep buffer-monitor | grep -v grep"

# Monitor buffer stats
ssh azureuser@20.170.155.53 "tail -f /tmp/buffer-monitor.log"
```

---

## Monitoring & Alerting

[Previous monitoring content, plus:]

### Buffer Monitoring Dashboard

**Create dashboard endpoint in STTTTSserver.js:**

```javascript
app.get('/buffer-dashboard', (req, res) => {
  const stats = bufferMonitor.getStats();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Buffer Monitoring Dashboard</title>
  <meta http-equiv="refresh" content="5">
  <style>
    body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; padding: 20px; }
    .station { border: 1px solid #444; margin: 10px 0; padding: 15px; border-radius: 5px; }
    .station h3 { margin-top: 0; color: #4ec9b0; }
    .buffer-bar { background: #333; height: 30px; border-radius: 5px; overflow: hidden; position: relative; }
    .buffer-fill { background: linear-gradient(90deg, #4ec9b0 0%, #f48771 100%); height: 100%; transition: width 0.3s; }
    .buffer-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-weight: bold; }
    .warning { border-color: #d7ba7d; background: #3c2f1f; }
    .critical { border-color: #f48771; background: #3c1f1f; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; }
    .stat { background: #2d2d2d; padding: 10px; border-radius: 3px; }
    .stat-label { color: #858585; font-size: 0.9em; }
    .stat-value { color: #dcdcaa; font-size: 1.2em; font-weight: bold; }
  </style>
</head>
<body>
  <h1>🎵 Audio Buffer Monitoring Dashboard</h1>
  <p>Last Update: ${stats.timestamp}</p>
  
  ${stats.stations.map(s => `
    <div class="station ${s.fillPercent >= 90 ? 'critical' : s.fillPercent >= 75 ? 'warning' : ''}">
      <h3>${s.name} (${s.stationId})</h3>
      <div class="buffer-bar">
        <div class="buffer-fill" style="width: ${s.fillPercent}%"></div>
        <div class="buffer-text">${s.fillPercent.toFixed(1)}% (${s.currentBytes} / ${s.maxBytes} bytes)</div>
      </div>
      <div class="stats">
        <div class="stat">
          <div class="stat-label">Packets Received</div>
          <div class="stat-value">${s.packetsReceived.toLocaleString()}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Packets Dropped</div>
          <div class="stat-value">${s.packetsDropped.toLocaleString()}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Bytes Dropped</div>
          <div class="stat-value">${s.bytesDropped.toLocaleString()}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Warnings</div>
          <div class="stat-value">${s.warnings}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Criticals</div>
          <div class="stat-value">${s.criticals}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Last Update</div>
          <div class="stat-value">${new Date(s.lastUpdate).toLocaleTimeString()}</div>
        </div>
      </div>
    </div>
  `).join('')}
  
  <h2>Recent Alerts</h2>
  ${stats.alerts.slice(-10).reverse().map(a => `
    <div class="station ${a.level === 'CRITICAL' ? 'critical' : 'warning'}">
      <strong>[${a.level}]</strong> ${a.stationName}: ${a.message}
      <br><small>${a.timestamp}</small>
    </div>
  `).join('')}
</body>
</html>
  `;
  
  res.send(html);
});
```

**Access Dashboard:**
```
http://20.170.155.53:3020/buffer-dashboard
```

---

## Success Criteria

[Previous criteria, plus:]

6. **Buffer Management**
   - [ ] All 8 buffer stations monitored successfully
   - [ ] Configuration changes applied without restart
   - [ ] Buffer dashboard accessible and updating
   - [ ] No buffer overflows or critical alerts during testing
   - [ ] API endpoints responding correctly

---

## Quick Reference: Buffer Control Commands

```bash
# === MONITORING ===
# View buffer stats in real-time
curl http://20.170.155.53:3020/api/buffers/stats | jq '.stations[] | {name, fillPercent, bytesDropped}'

# Check specific station
curl http://20.170.155.53:3020/api/buffers/stats | jq '.stations[] | select(.name == "STTTTSserver UDP Send")'

# === CONFIGURATION ===
# View current config
cat /home/azureuser/translation-app/3333_4444__Operational/audio-buffer-config.json | jq '.buffer_stations.station_6_udp_send_stttts'

# Increase buffer size (example: 256KB → 512KB)
jq '.buffer_stations.station_6_udp_send_stttts.socket_send_buffer_bytes = 524288' \
  /home/azureuser/translation-app/3333_4444__Operational/audio-buffer-config.json > /tmp/config.json && \
  mv /tmp/config.json /home/azureuser/translation-app/3333_4444__Operational/audio-buffer-config.json

# === PRESETS ===
# Apply high reliability preset
curl -X POST http://20.170.155.53:3020/api/buffers/preset/high_reliability

# Apply low latency preset
curl -X POST http://20.170.155.53:3020/api/buffers/preset/low_latency

# === MONITORING SERVICE ===
# Check if running
ps aux | grep buffer-monitor | grep -v grep

# Restart monitoring service
kill $(cat /tmp/buffer-monitor.pid) && \
  cd /home/azureuser/translation-app/3333_4444__Operational && \
  nohup node buffer-monitor-service.js > /tmp/buffer-monitor.log 2>&1 & \
  echo $! > /tmp/buffer-monitor.pid

# View monitoring log
tail -f /tmp/buffer-monitor.log

# === DASHBOARD ===
# Access web dashboard
open http://20.170.155.53:3020/buffer-dashboard
```

---

## References

- [3333/4444 Installation Guide](/Users/sagivstavinsky/realtime-translation-enhanced_astrix/Docs/sys/3333_4444_INSTALLATION_GUIDE.md)
- [Backup Archive](3333_4444__Operational_Working_Full_Sicle_Timing_In_20251125_145719.tar.gz)
- [GitHub Branch](https://github.com/sagivst/realtime_translation_enhanced_astrix/tree/working-full-cycle-timing-sync)
- [Buffer Configuration File](audio-buffer-config.json)

---

**Document END**



Voice Quality Enhancement Options (Per Station)

  Category 1: Buffer Management 🔧

  | Parameter                    | Description                    | Default | Range           | Dashboard Control |
  |------------------------------|--------------------------------|---------|-----------------|-------------------|
  | socket_receive_buffer_bytes  | Incoming UDP buffer size       | 262144  | 65536 - 1048576 | Slider + Preset   |
  | socket_send_buffer_bytes     | Outgoing UDP buffer size       | 262144  | 65536 - 1048576 | Slider + Preset   |
  | accumulation_threshold_bytes | When to process buffered audio | 32000   | 8000 - 64000    | Slider            |
  | buffer_max_bytes             | Max buffer before overflow     | 65536   | 32768 - 262144  | Slider            |
  | buffer_latency_ms            | Target buffer latency          | 100     | 50 - 500        | Slider            |

  ---
  Category 2: Frame Processing 🎵

  | Parameter             | Description                      | Default | Range               | Dashboard Control             |
  |-----------------------|----------------------------------|---------|---------------------|-------------------------------|
  | frame_size_bytes      | PCM frame size (5ms = 160 bytes) | 160     | 80 - 640            | Dropdown (5ms/10ms/20ms/40ms) |
  | frame_batch_size      | Frames per send batch            | 1       | 1 - 10              | Slider                        |
  | frame_delay_ms        | Delay between frame sends        | 5       | 0 - 20              | Slider                        |
  | handle_partial_frames | Send incomplete frames?          | true    | true/false          | Toggle                        |
  | frame_padding_mode    | How to pad partial frames        | 'zero'  | zero/silence/repeat | Dropdown                      |

  ---
  Category 3: Audio Quality 🎧

  | Parameter             | Description                | Default | Range      | Dashboard Control  |
  |-----------------------|----------------------------|---------|------------|--------------------|
  | audio_gain_multiplier | Volume amplification       | 7.5     | 0.5 - 15.0 | Slider (0.1 steps) |
  | noise_gate_threshold  | Cut audio below this level | -60     | -80 - -20  | Slider (dB)        |
  | apply_compression     | Dynamic range compression  | false   | true/false | Toggle             |
  | compression_ratio     | Compression ratio          | 3.0     | 1.0 - 10.0 | Slider             |
  | normalize_audio       | Auto-level normalization   | false   | true/false | Toggle             |

  ---
  Category 4: Jitter & Timing ⏱️

  | Parameter                | Description                   | Default | Range      | Dashboard Control |
  |--------------------------|-------------------------------|---------|------------|-------------------|
  | jitter_buffer_ms         | Compensate for network jitter | 50      | 0 - 200    | Slider            |
  | adaptive_jitter          | Auto-adjust jitter buffer     | true    | true/false | Toggle            |
  | clock_sync_enabled       | Sync audio clock to RTP       | true    | true/false | Toggle            |
  | drift_compensation       | Compensate for clock drift    | true    | true/false | Toggle            |
  | packet_reorder_window_ms | Allow packet reordering       | 100     | 0 - 500    | Slider            |

  ---
  Category 5: Packet Loss Recovery 📦

  | Parameter               | Description                | Default   | Range                      | Dashboard Control |
  |-------------------------|----------------------------|-----------|----------------------------|-------------------|
  | enable_plc              | Packet Loss Concealment    | false     | true/false                 | Toggle            |
  | plc_algorithm           | Algorithm for lost packets | 'silence' | silence/interpolate/repeat | Dropdown          |
  | fec_enabled             | Forward Error Correction   | false     | true/false                 | Toggle            |
  | retransmit_on_loss      | Request retransmission     | false     | true/false                 | Toggle            |
  | max_packet_loss_percent | Alert threshold            | 5         | 1 - 20                     | Slider            |

  ---
  Category 6: Format & Conversion 🔄

  | Parameter         | Description        | Default  | Range              | Dashboard Control |
  |-------------------|--------------------|----------|--------------------|-------------------|
  | sample_rate       | Audio sample rate  | 16000    | 8000/16000/48000   | Dropdown          |
  | bit_depth         | PCM bit depth      | 16       | 8/16/24/32         | Dropdown          |
  | channels          | Mono/Stereo        | 1        | 1/2                | Dropdown          |
  | codec             | Audio codec        | 'pcm'    | pcm/alaw/ulaw/opus | Dropdown          |
  | resampler_quality | Conversion quality | 'medium' | low/medium/high    | Dropdown          |

  ---
  Category 7: VAD (Voice Activity Detection) 🎤

  | Parameter            | Description                | Default | Range      | Dashboard Control |
  |----------------------|----------------------------|---------|------------|-------------------|
  | vad_enabled          | Detect silence/speech      | false   | true/false | Toggle            |
  | vad_threshold        | Speech detection threshold | -40     | -60 - -20  | Slider (dB)       |
  | vad_hang_time_ms     | Silence before stop        | 300     | 100 - 1000 | Slider            |
  | drop_silence_packets | Don't send silence         | false   | true/false | Toggle            |
  | comfort_noise_level  | Background noise level     | -60     | -80 - -40  | Slider (dB)       |

  ---
  Category 8: Monitoring & Alerts 📊

  | Parameter                  | Description               | Default | Range                 | Dashboard Control |
  |----------------------------|---------------------------|---------|-----------------------|-------------------|
  | monitoring_enabled         | Enable station monitoring | true    | true/false            | Toggle            |
  | log_level                  | Logging verbosity         | 'info'  | debug/info/warn/error | Dropdown          |
  | warning_threshold_percent  | Warning alert level       | 75      | 50 - 90               | Slider            |
  | critical_threshold_percent | Critical alert level      | 90      | 75 - 99               | Slider            |
  | alert_cooldown_ms          | Min time between alerts   | 5000    | 1000 - 60000          | Slider            |
  | track_latency              | Monitor latency           | true    | true/false            | Toggle            |
  | track_jitter               | Monitor jitter            | true    | true/false            | Toggle            |
  | track_packet_loss          | Monitor packet loss       | true    | true/false            | Toggle            |

  ---
  Dashboard Control Interface:

  ┌─────────────────────────────────────────────────────────┐
  │ Station 6: UDP Send to Gateway                         │
  ├─────────────────────────────────────────────────────────┤
  │ Status: 🟢 Healthy  │ Fill: 45% │ Dropped: 0 bytes     │
  ├─────────────────────────────────────────────────────────┤
  │                                                         │
  │ [Buffer Management] ▼                                   │
  │   Socket Send Buffer:    [====|====] 262 KB            │
  │   Accumulation Threshold: [==|======] 32 KB            │
  │                                                         │
  │ [Frame Processing] ▼                                    │
  │   Frame Size:        [5ms ▼] 160 bytes                 │
  │   Frame Delay:       [==|======] 5 ms                  │
  │   Partial Frames:    [✓] Send incomplete frames        │
  │                                                         │
  │ [Audio Quality] ▼                                       │
  │   Gain Multiplier:   [=======|=] 7.5x                  │
  │   Noise Gate:        [====|====] -60 dB                │
  │   Compression:       [✓] Enabled (3.0:1)               │
  │                                                         │
  │ [Jitter & Timing] ▼                                     │
  │   Jitter Buffer:     [==|======] 50 ms                 │
  │   Adaptive:          [✓] Auto-adjust                   │
  │                                                         │
  │ [Packet Loss] ▼                                         │
  │   PLC Algorithm:     [Interpolate ▼]                   │
  │   FEC:               [ ] Disabled                      │
  │                                                         │
  │ [Quick Presets]                                         │
  │ [Low Latency] [Balanced] [High Quality] [Diagnostic]   │
  │                                                         │
  │ [Apply Changes] [Reset to Default] [Export Config]     │
  └─────────────────────────────────────────────────────────┘

  ---
  Total: 50+ Parameters Per Station

  All controllable via:
  1. JSON config file (bulk editing)
  2. Web Dashboard (visual sliders/toggles)
  3. HTTP API (programmatic control)
  4. Presets (one-click optimization)
