# Parameter Configuration System - Complete

## Overview
Successfully created a modular parameter configuration system with **55 individual parameter files** organized by category.

## Directory Structure

```
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/config/parameters/
├── index.json                    # Master index with all parameter metadata
├── buffer/                       # 10 parameter files
│   ├── total.json
│   ├── input.json
│   ├── processing.json
│   ├── output.json
│   ├── overruns.json
│   ├── underruns.json
│   ├── highWater.json
│   ├── lowWater.json
│   ├── allocated.json
│   └── free.json
├── latency/                      # 8 parameter files
│   ├── avg.json
│   ├── peak.json
│   ├── min.json
│   ├── jitter.json
│   ├── e2e.json
│   ├── processing.json
│   ├── network.json
│   └── variance.json
├── packet/                       # 12 parameter files
│   ├── rx.json
│   ├── tx.json
│   ├── dropped.json
│   ├── lossRate.json
│   ├── errors.json
│   ├── retransmits.json
│   ├── outOfOrder.json
│   ├── duplicates.json
│   ├── bytesRx.json
│   ├── bytesTx.json
│   ├── throughputRx.json
│   └── throughputTx.json
├── audioQuality/                 # 10 parameter files
│   ├── sampleRate.json
│   ├── bitDepth.json
│   ├── channels.json
│   ├── format.json
│   ├── clipping.json
│   ├── silenceCount.json
│   ├── silenceDuration.json
│   ├── audioLevel.json
│   ├── snr.json
│   └── thd.json
├── performance/                  # 8 parameter files
│   ├── cpu.json
│   ├── memory.json
│   ├── threads.json
│   ├── connections.json
│   ├── queueDepth.json
│   ├── processingRate.json
│   ├── errorRate.json
│   └── uptime.json
└── custom/                       # 7 parameter files
    ├── state.json
    ├── lastActivity.json
    ├── totalProcessed.json
    ├── processingSpeed.json
    ├── successRate.json
    ├── warningCount.json
    └── criticalCount.json
```

## Parameter Configuration Schema

Each parameter file contains:

```json
{
  "id": "buffer.total",                          // Unique identifier
  "name": "Total Buffer",                        // Display name
  "category": "Buffer",                          // Category
  "path": "buffer.total",                        // Dot-notation path
  "unit": "%",                                   // Unit of measurement
  "description": "Overall buffer utilization...", // Description
  "ranges": {
    "min": 0,                                    // Absolute minimum
    "max": 100,                                  // Absolute maximum
    "recommendedMin": 20,                        // Recommended minimum
    "recommendedMax": 80                         // Recommended maximum
  },
  "thresholds": {
    "warningLow": 20,                            // Warning low threshold
    "warningHigh": 80,                           // Warning high threshold
    "criticalLow": 10,                           // Critical low threshold
    "criticalHigh": 95                           // Critical high threshold
  },
  "alerts": {
    "enabled": true,                             // Enable alerts
    "audioAlert": true,                          // Audio alert on/off
    "visualAlert": true,                         // Visual pulse on/off
    "emailAlert": false,                         // Email notification on/off
    "webhookAlert": false                        // Webhook call on/off
  },
  "default": false,                              // Default for all stations
  "metadata": {
    "updateFrequency": 1000,                     // Update frequency (ms)
    "priority": "high",                          // Priority level
    "displayOrder": 1                            // UI display order
  }
}
```

## Index File (index.json)

Master index containing:
- Version: 1.0.0
- Total parameters: 55
- Category breakdown
- Parameter list with file paths

## Parameter Categories

### 1. Buffer Parameters (10)
- **total** - Overall buffer utilization
- **input** - Input buffer occupancy
- **processing** - Processing buffer usage
- **output** - Output buffer occupancy
- **overruns** - Buffer overrun events
- **underruns** - Buffer underrun events
- **highWater** - Peak buffer usage
- **lowWater** - Minimum buffer usage
- **allocated** - Allocated buffer memory
- **free** - Free buffer space

### 2. Latency Parameters (8)
- **avg** - Average latency
- **peak** - Peak latency
- **min** - Minimum latency
- **jitter** - Latency variation
- **e2e** - End-to-end latency
- **processing** - Processing latency
- **network** - Network latency
- **variance** - Latency variance

### 3. Packet Parameters (12)
- **rx** - Packets received
- **tx** - Packets transmitted
- **dropped** - Dropped packets
- **lossRate** - Packet loss rate
- **errors** - Packet errors
- **retransmits** - Retransmissions
- **outOfOrder** - Out of order packets
- **duplicates** - Duplicate packets
- **bytesRx** - Bytes received
- **bytesTx** - Bytes transmitted
- **throughputRx** - Receive throughput
- **throughputTx** - Transmit throughput

### 4. Audio Quality Parameters (10)
- **sampleRate** - Audio sample rate
- **bitDepth** - Audio bit depth
- **channels** - Number of channels
- **format** - Audio codec format
- **clipping** - Audio clipping events
- **silenceCount** - Silence detection events
- **silenceDuration** - Total silence duration
- **audioLevel** - Current audio level
- **snr** - Signal-to-noise ratio
- **thd** - Total harmonic distortion

### 5. Performance Parameters (8)
- **cpu** - CPU usage
- **memory** - Memory consumption
- **threads** - Active threads
- **connections** - Active connections
- **queueDepth** - Processing queue depth
- **processingRate** - Operations per second
- **errorRate** - Errors per minute
- **uptime** - System uptime

### 6. Custom Parameters (7)
- **state** - System state
- **lastActivity** - Time since last activity
- **totalProcessed** - Total items processed
- **processingSpeed** - Current processing speed
- **successRate** - Processing success rate
- **warningCount** - Number of warnings
- **criticalCount** - Number of critical events

## Priority Levels

- **Critical** (10 parameters): Highest priority, require immediate attention
  - buffer.overruns, buffer.underruns
  - latency.avg, latency.e2e
  - packet.dropped, packet.lossRate
  - audioQuality.clipping
  - performance.cpu, performance.errorRate
  - custom.criticalCount

- **High** (11 parameters): Important metrics requiring monitoring
  - buffer.total, buffer.input, buffer.output
  - latency.peak, latency.jitter, latency.network
  - packet.errors
  - audioQuality.audioLevel, audioQuality.snr, audioQuality.thd
  - performance.memory, performance.queueDepth
  - custom.successRate

- **Medium** (19 parameters): Standard monitoring metrics
- **Low** (15 parameters): Informational metrics

## Alert Configuration

- **Audio Alerts**: 18 parameters enabled
- **Visual Alerts**: 35 parameters enabled
- **Email Alerts**: 3 parameters enabled (packet.lossRate, performance.errorRate, custom.criticalCount)
- **Webhook Alerts**: 1 parameter enabled (custom.criticalCount)

## Usage

### Loading Parameter Configuration
```javascript
// Load index
const response = await fetch('/config/parameters/index.json');
const index = await response.json();

// Load specific parameter
const paramFile = 'buffer/total.json';
const paramResponse = await fetch(`/config/parameters/${paramFile}`);
const paramConfig = await paramResponse.json();
```

### Saving Parameter Changes
When user edits parameter in Level 3, save updated configuration back to the appropriate JSON file.

## Next Steps

1. ✅ Configuration files created and deployed
2. 🔲 Update dashboard to load parameters from config files instead of hardcoded definitions
3. 🔲 Implement API endpoint to save parameter configuration changes
4. 🔲 Add parameter validation based on schema
5. 🔲 Implement "Set as Default" functionality to apply config to all stations

## Files Generated

- **Schema**: `/tmp/parameter-config-schema.json`
- **Generator Script**: `/tmp/generate-param-configs.js`
- **56 Total Files**: 55 parameter configs + 1 index file
- **Deployed to**: Azure VM at `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/config/parameters/`
