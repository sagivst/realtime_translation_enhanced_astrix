# Monitoring Stations Knob Management & Default Values Plan
## Complete Configuration Management with Safety Defaults

**Created:** December 3, 2024
**Purpose:** Ensure all 113 knobs have default values for quick recovery

---

## Configuration File Structure

### Each Station Configuration File Must Contain:

```json
{
  "station_id": "STATION_3",
  "extension": "3333",
  "version": "1.0.0",
  "last_modified": "2024-12-03T14:00:00Z",

  "defaults": {
    // ORIGINAL WORKING VALUES - NEVER AUTO-MODIFIED
    // These are the factory defaults that we know work
    "deepgram": {
      "model": "nova-2",
      "language": "en-US",
      // ... all 113 knobs with known-good values
    }
  },

  "saved_defaults": {
    // USER-SAVED DEFAULTS - Modified only by explicit user action
    // Copy of defaults initially, can be updated by user
    "deepgram": {
      "model": "nova-2",
      "language": "en-US",
      // ... all 113 knobs
    }
  },

  "active": {
    // CURRENTLY ACTIVE VALUES - Modified by AI/optimizer
    "deepgram": {
      "model": "nova-2-general",  // AI might change this
      "language": "en-US",
      // ... all 113 knobs currently in use
    }
  },

  "metadata": {
    "last_optimization": "2024-12-03T14:30:00Z",
    "optimization_count": 5,
    "last_reset": "2024-12-03T13:00:00Z",
    "performance_score": 0.85
  }
}
```

---

## Complete List of 113 Knobs (All Stations)

### Station-3 Knobs (Deepgram/STT) - 25 knobs
```javascript
{
  "deepgram": {
    "model": "nova-2",                    // 1. Model selection
    "language": "en-US",                  // 2. Language code
    "punctuate": true,                    // 3. Add punctuation
    "profanityFilter": false,             // 4. Filter profanity
    "redact": false,                      // 5. Redact sensitive info
    "diarize": false,                     // 6. Speaker diarization
    "smartFormat": true,                  // 7. Smart formatting
    "utterances": true,                   // 8. Utterance detection
    "interimResults": true,               // 9. Interim results
    "endpointing": 300,                   // 10. Endpointing timeout
    "vadTurnoff": 500,                    // 11. VAD turnoff time
    "alternatives": 1,                    // 12. Number of alternatives
    "numerals": true,                     // 13. Convert numbers
    "search": [],                         // 14. Search terms
    "replace": {},                        // 15. Replace terms
    "keywords": [],                       // 16. Keyword boosting
    "tier": "enhanced",                   // 17. Processing tier
    "version": "latest",                  // 18. API version
    "encoding": "linear16",               // 19. Audio encoding
    "sampleRate": 16000,                  // 20. Sample rate
    "channels": 1,                        // 21. Audio channels
    "multichannel": false,                // 22. Multi-channel mode
    "alternativeLanguages": [],           // 23. Alternative languages
    "detectLanguage": false,              // 24. Auto-detect language
    "measurements": true                  // 25. Include measurements
  }
}
```

### Audio Processing Knobs (All Stations) - 30 knobs
```javascript
{
  "audio_processing": {
    "agc": {
      "enabled": true,                    // 26. AGC enabled
      "targetLevel": -3,                   // 27. Target level (dB)
      "maxGain": 30,                       // 28. Max gain (dB)
      "attackTime": 5,                     // 29. Attack time (ms)
      "releaseTime": 100,                  // 30. Release time (ms)
      "holdTime": 50                       // 31. Hold time (ms)
    },
    "aec": {
      "enabled": true,                    // 32. AEC enabled
      "filterLength": 256,                 // 33. Filter length
      "adaptationRate": 0.5,               // 34. Adaptation rate
      "suppressionLevel": 12,              // 35. Suppression (dB)
      "tailLength": 200,                   // 36. Tail length (ms)
      "convergenceTime": 300,              // 37. Convergence (ms)
      "echoCancellation": true             // 38. Echo cancellation
    },
    "noiseReduction": {
      "enabled": true,                    // 39. NR enabled
      "level": 15,                         // 40. NR level (dB)
      "spectralFloor": -50,                // 41. Spectral floor
      "preserveVoice": true,               // 42. Preserve voice
      "adaptiveMode": true,                // 43. Adaptive mode
      "smoothingFactor": 0.9               // 44. Smoothing factor
    },
    "vad": {
      "enabled": true,                    // 45. VAD enabled
      "sensitivity": 2,                    // 46. Sensitivity
      "preSpeechPad": 200,                 // 47. Pre-speech pad
      "postSpeechPad": 800,                // 48. Post-speech pad
      "minSpeechDuration": 100             // 49. Min speech duration
    },
    "gain": {
      "input": 1.0,                       // 50. Input gain
      "output": 1.0,                      // 51. Output gain
      "normalization": true,               // 52. Normalization
      "compressionRatio": 2.0,             // 53. Compression ratio
      "compressionThreshold": -20          // 54. Compression threshold
    }
  }
}
```

### Network/Buffer Knobs - 20 knobs
```javascript
{
  "buffer": {
    "jitter": {
      "enabled": true,                    // 55. Jitter buffer
      "targetDelay": 20,                   // 56. Target delay
      "maxDelay": 150,                     // 57. Max delay
      "adaptiveMode": true,                // 58. Adaptive mode
      "speedupFactor": 1.2                 // 59. Speedup factor
    },
    "audio": {
      "size": 4096,                       // 60. Buffer size
      "prefetch": 2048,                    // 61. Prefetch size
      "maxSize": 16384,                    // 62. Max buffer size
      "underrunThreshold": 512             // 63. Underrun threshold
    },
    "network": {
      "receiveBuffer": 65536,              // 64. Receive buffer
      "sendBuffer": 65536,                 // 65. Send buffer
      "congestionControl": true,           // 66. Congestion control
      "pacingRate": 1000,                  // 67. Pacing rate
      "retryAttempts": 3,                  // 68. Retry attempts
      "retryDelay": 1000                   // 69. Retry delay
    },
    "playout": {
      "delay": 40,                         // 70. Playout delay
      "smoothing": true,                   // 71. Smoothing
      "catchupRate": 1.1,                  // 72. Catchup rate
      "slowdownRate": 0.9,                 // 73. Slowdown rate
      "adaptivePlayout": true              // 74. Adaptive playout
    }
  }
}
```

### Codec Knobs - 15 knobs
```javascript
{
  "codec": {
    "type": "opus",                       // 75. Codec type
    "bitrate": 32000,                     // 76. Bitrate
    "sampleRate": 16000,                  // 77. Sample rate
    "channels": 1,                        // 78. Channels
    "complexity": 5,                      // 79. Complexity
    "packetLoss": 10,                     // 80. Packet loss %
    "dtx": false,                         // 81. DTX
    "fec": true,                          // 82. FEC
    "cbr": false,                         // 83. CBR mode
    "vbr": true,                          // 84. VBR mode
    "vbrConstraint": true,                // 85. VBR constraint
    "maxFrameSize": 60,                   // 86. Max frame size
    "minFrameSize": 10,                   // 87. Min frame size
    "opus_application": "voip",           // 88. Opus application
    "signalType": "voice"                 // 89. Signal type
  }
}
```

### Performance/System Knobs - 24 knobs
```javascript
{
  "performance": {
    "threadPriority": "high",             // 90. Thread priority
    "cpuAffinity": null,                  // 91. CPU affinity
    "realtime": true,                     // 92. Realtime mode
    "maxCpu": 80,                         // 93. Max CPU %
    "maxMemory": 512,                     // 94. Max memory MB
    "gcInterval": 30000,                  // 95. GC interval
    "monitoring": {
      "interval": 100,                    // 96. Monitor interval
      "detailed": true,                   // 97. Detailed metrics
      "logLevel": "info",                 // 98. Log level
      "metricsBuffer": 1000               // 99. Metrics buffer
    },
    "optimization": {
      "autoTune": true,                   // 100. Auto-tune
      "learningRate": 0.01,               // 101. Learning rate
      "explorationRate": 0.1,             // 102. Exploration rate
      "convergenceThreshold": 0.95        // 103. Convergence
    },
    "failover": {
      "enabled": true,                    // 104. Failover enabled
      "timeout": 5000,                     // 105. Failover timeout
      "retries": 3,                        // 106. Failover retries
      "backupServers": []                 // 107. Backup servers
    },
    "rateLimit": {
      "requestsPerSecond": 100,           // 108. Rate limit
      "burstSize": 200,                   // 109. Burst size
      "queueSize": 1000                   // 110. Queue size
    },
    "timeout": {
      "connection": 10000,                // 111. Connection timeout
      "request": 30000,                   // 112. Request timeout
      "idle": 60000                       // 113. Idle timeout
    }
  }
}
```

---

## Enhanced Station3Handler with Knob Management

```javascript
// station3-handler.js - Enhanced with full knob management
const fs = require('fs');

class Station3Handler {
  constructor(extensionId) {
    this.extensionId = extensionId;
    this.configPath = `/tmp/STATION_3-${extensionId}-config.json`;
    this.config = this.initializeConfig();
    this.audioStartTime = Date.now();
    this.stationAgent = null;

    // Start polling for config changes
    this.startPolling();
  }

  // Initialize config with all 113 knobs
  initializeConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));

        // Ensure all sections exist
        if (!config.defaults) config.defaults = this.getFactoryDefaults();
        if (!config.saved_defaults) config.saved_defaults = {...config.defaults};
        if (!config.active) config.active = {...config.defaults};

        return config;
      }
    } catch (e) {
      console.log(`[STATION-3] Creating new config for ${this.extensionId}`);
    }

    // Create new config with factory defaults
    const defaults = this.getFactoryDefaults();
    const newConfig = {
      station_id: 'STATION_3',
      extension: this.extensionId,
      version: '1.0.0',
      last_modified: new Date().toISOString(),
      defaults: defaults,
      saved_defaults: {...defaults},
      active: {...defaults},
      metadata: {
        last_optimization: null,
        optimization_count: 0,
        last_reset: new Date().toISOString(),
        performance_score: 0
      }
    };

    // Save initial config
    this.saveConfig(newConfig);
    return newConfig;
  }

  // Get factory defaults (all 113 knobs)
  getFactoryDefaults() {
    return {
      deepgram: {
        model: 'nova-2',
        language: 'en-US',
        punctuate: true,
        profanityFilter: false,
        redact: false,
        diarize: false,
        smartFormat: true,
        utterances: true,
        interimResults: true,
        endpointing: 300,
        vadTurnoff: 500,
        alternatives: 1,
        numerals: true,
        search: [],
        replace: {},
        keywords: [],
        tier: 'enhanced',
        version: 'latest',
        encoding: 'linear16',
        sampleRate: 16000,
        channels: 1,
        multichannel: false,
        alternativeLanguages: [],
        detectLanguage: false,
        measurements: true
      },
      audio_processing: {
        agc: {
          enabled: true,
          targetLevel: -3,
          maxGain: 30,
          attackTime: 5,
          releaseTime: 100,
          holdTime: 50
        },
        aec: {
          enabled: true,
          filterLength: 256,
          adaptationRate: 0.5,
          suppressionLevel: 12,
          tailLength: 200,
          convergenceTime: 300,
          echoCancellation: true
        },
        noiseReduction: {
          enabled: true,
          level: 15,
          spectralFloor: -50,
          preserveVoice: true,
          adaptiveMode: true,
          smoothingFactor: 0.9
        },
        vad: {
          enabled: true,
          sensitivity: 2,
          preSpeechPad: 200,
          postSpeechPad: 800,
          minSpeechDuration: 100
        },
        gain: {
          input: 1.0,
          output: 1.0,
          normalization: true,
          compressionRatio: 2.0,
          compressionThreshold: -20
        }
      },
      buffer: {
        jitter: {
          enabled: true,
          targetDelay: 20,
          maxDelay: 150,
          adaptiveMode: true,
          speedupFactor: 1.2
        },
        audio: {
          size: 4096,
          prefetch: 2048,
          maxSize: 16384,
          underrunThreshold: 512
        },
        network: {
          receiveBuffer: 65536,
          sendBuffer: 65536,
          congestionControl: true,
          pacingRate: 1000,
          retryAttempts: 3,
          retryDelay: 1000
        },
        playout: {
          delay: 40,
          smoothing: true,
          catchupRate: 1.1,
          slowdownRate: 0.9,
          adaptivePlayout: true
        }
      },
      codec: {
        type: 'opus',
        bitrate: 32000,
        sampleRate: 16000,
        channels: 1,
        complexity: 5,
        packetLoss: 10,
        dtx: false,
        fec: true,
        cbr: false,
        vbr: true,
        vbrConstraint: true,
        maxFrameSize: 60,
        minFrameSize: 10,
        opus_application: 'voip',
        signalType: 'voice'
      },
      performance: {
        threadPriority: 'high',
        cpuAffinity: null,
        realtime: true,
        maxCpu: 80,
        maxMemory: 512,
        gcInterval: 30000,
        monitoring: {
          interval: 100,
          detailed: true,
          logLevel: 'info',
          metricsBuffer: 1000
        },
        optimization: {
          autoTune: true,
          learningRate: 0.01,
          explorationRate: 0.1,
          convergenceThreshold: 0.95
        },
        failover: {
          enabled: true,
          timeout: 5000,
          retries: 3,
          backupServers: []
        },
        rateLimit: {
          requestsPerSecond: 100,
          burstSize: 200,
          queueSize: 1000
        },
        timeout: {
          connection: 10000,
          request: 30000,
          idle: 60000
        }
      }
    };
  }

  // Poll for config changes
  startPolling() {
    setInterval(() => {
      try {
        const newConfig = this.loadConfig();
        if (JSON.stringify(newConfig.active) !== JSON.stringify(this.config.active)) {
          console.log(`[STATION-3] Active config updated for extension ${this.extensionId}`);
          this.config = newConfig;
          this.onKnobsChanged?.(this.config.active);
        }
      } catch (e) {
        // Silent fail
      }
    }, 100);
  }

  // Load config from file
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (e) {}
    return this.config;
  }

  // Save config to file
  saveConfig(config) {
    try {
      config.last_modified = new Date().toISOString();
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (e) {
      console.error(`[STATION-3] Failed to save config:`, e.message);
    }
  }

  // Reset to factory defaults
  resetToDefaults() {
    this.config.active = {...this.config.defaults};
    this.config.metadata.last_reset = new Date().toISOString();
    this.saveConfig(this.config);
    console.log(`[STATION-3] Reset to factory defaults for ${this.extensionId}`);
  }

  // Reset to saved defaults
  resetToSavedDefaults() {
    this.config.active = {...this.config.saved_defaults};
    this.config.metadata.last_reset = new Date().toISOString();
    this.saveConfig(this.config);
    console.log(`[STATION-3] Reset to saved defaults for ${this.extensionId}`);
  }

  // Save current active as new saved defaults
  saveAsDefaults() {
    this.config.saved_defaults = {...this.config.active};
    this.saveConfig(this.config);
    console.log(`[STATION-3] Saved current settings as defaults for ${this.extensionId}`);
  }

  // Apply optimizer updates
  applyOptimization(knobUpdates) {
    // Merge updates into active config
    Object.keys(knobUpdates).forEach(section => {
      if (this.config.active[section]) {
        Object.assign(this.config.active[section], knobUpdates[section]);
      }
    });

    // Update metadata
    this.config.metadata.last_optimization = new Date().toISOString();
    this.config.metadata.optimization_count++;

    this.saveConfig(this.config);
    console.log(`[STATION-3] Applied optimization #${this.config.metadata.optimization_count}`);
  }

  // Get Deepgram config from active knobs
  getDeepgramConfig() {
    const dg = this.config.active.deepgram || {};
    return {
      model: dg.model,
      language: dg.language,
      punctuate: dg.punctuate,
      interim_results: dg.interimResults,
      endpointing: dg.endpointing,
      vad_turnoff: dg.vadTurnoff,
      smart_format: dg.smartFormat,
      diarize: dg.diarize,
      utterances: dg.utterances,
      numerals: dg.numerals,
      encoding: dg.encoding,
      sample_rate: dg.sampleRate,
      channels: dg.channels
    };
  }

  // Calculate performance score
  calculatePerformanceScore(metrics) {
    // Simple scoring based on key metrics
    let score = 0;

    // STT confidence (40% weight)
    score += (metrics.stt_confidence || 0) * 0.4;

    // Low latency (30% weight) - inverse relationship
    const latencyScore = Math.max(0, 1 - (metrics.stt_latency || 1000) / 2000);
    score += latencyScore * 0.3;

    // Error rate (30% weight) - inverse relationship
    const errorRate = metrics.stt_error || 0;
    score += (1 - Math.min(1, errorRate / 10)) * 0.3;

    // Update metadata
    this.config.metadata.performance_score = score;
    return score;
  }

  // Emergency recovery
  emergencyRecovery() {
    console.log(`[STATION-3] EMERGENCY RECOVERY for ${this.extensionId}`);

    // Check performance score
    if (this.config.metadata.performance_score < 0.3) {
      console.log(`[STATION-3] Performance critically low, reverting to factory defaults`);
      this.resetToDefaults();
      return true;
    }

    return false;
  }
}

module.exports = Station3Handler;
```

---

## Knob Management Commands

### Create Management Script
```bash
#!/bin/bash
# knob-manager.sh - Knob management utility

STATION=$1
EXTENSION=$2
ACTION=$3

CONFIG_FILE="/tmp/${STATION}-${EXTENSION}-config.json"

case $ACTION in
  reset-factory)
    echo "Resetting to factory defaults..."
    # Copy defaults to active
    jq '.active = .defaults' $CONFIG_FILE > temp.json && mv temp.json $CONFIG_FILE
    ;;

  reset-saved)
    echo "Resetting to saved defaults..."
    # Copy saved_defaults to active
    jq '.active = .saved_defaults' $CONFIG_FILE > temp.json && mv temp.json $CONFIG_FILE
    ;;

  save-defaults)
    echo "Saving current settings as defaults..."
    # Copy active to saved_defaults
    jq '.saved_defaults = .active' $CONFIG_FILE > temp.json && mv temp.json $CONFIG_FILE
    ;;

  show-diff)
    echo "Differences from factory defaults:"
    # Show diff between defaults and active
    diff <(jq '.defaults' $CONFIG_FILE) <(jq '.active' $CONFIG_FILE)
    ;;

  backup)
    echo "Creating backup..."
    cp $CONFIG_FILE "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    ;;

  restore)
    echo "Restoring from latest backup..."
    LATEST_BACKUP=$(ls -t ${CONFIG_FILE}.backup.* | head -1)
    if [ -f "$LATEST_BACKUP" ]; then
      cp $LATEST_BACKUP $CONFIG_FILE
      echo "Restored from $LATEST_BACKUP"
    else
      echo "No backup found"
    fi
    ;;

  validate)
    echo "Validating configuration..."
    # Check all 113 knobs are present
    KNOB_COUNT=$(jq '[.active | .. | scalars] | length' $CONFIG_FILE)
    if [ "$KNOB_COUNT" -eq 113 ]; then
      echo "✅ All 113 knobs present"
    else
      echo "❌ Only $KNOB_COUNT knobs found (expected 113)"
    fi
    ;;

  *)
    echo "Usage: $0 STATION EXTENSION {reset-factory|reset-saved|save-defaults|show-diff|backup|restore|validate}"
    ;;
esac
```

---

## Safety Features

### 1. Three-Layer Configuration
- **Factory Defaults**: Never modified automatically, always available for recovery
- **Saved Defaults**: User-controlled baseline settings
- **Active**: Currently running configuration, modified by optimizer

### 2. Automatic Recovery Triggers
```javascript
// In Station3Handler
if (performanceScore < 0.3) {
  // Critically bad performance - revert to factory
  resetToDefaults();
} else if (performanceScore < 0.5) {
  // Poor performance - revert to saved defaults
  resetToSavedDefaults();
}
```

### 3. Configuration Validation
- All 113 knobs must be present
- Type checking for each knob value
- Range validation for numeric values

### 4. Rollback History
```bash
# Keep last 10 configurations
ls -t /tmp/STATION_3-*.backup.* | tail -n +11 | xargs rm -f
```

---

## Testing Knob Management

```bash
# Test 1: Verify all knobs present
node -e "
const config = require('./station3-handler');
const handler = new config('3333');
const knobCount = JSON.stringify(handler.config.active).match(/\"[^\"]+\":/g).length;
console.log('Knob count:', knobCount);
console.assert(knobCount >= 113, 'Missing knobs!');
"

# Test 2: Test reset functionality
./knob-manager.sh STATION_3 3333 reset-factory
./knob-manager.sh STATION_3 3333 validate

# Test 3: Test performance-based recovery
node -e "
const handler = require('./station3-handler')('3333');
handler.config.metadata.performance_score = 0.2;
handler.emergencyRecovery();
"
```

---

## Replication for All 16 Combinations

Since we need 8 stations × 2 extensions = 16 configuration files:

```bash
#!/bin/bash
# create-all-configs.sh - Initialize all 16 station configs

STATIONS=("STATION_1" "STATION_2" "STATION_3" "STATION_4" "STATION_5" "STATION_6" "STATION_7" "STATION_8")
EXTENSIONS=("3333" "4444")

for STATION in "${STATIONS[@]}"; do
  for EXT in "${EXTENSIONS[@]}"; do
    CONFIG_FILE="/tmp/${STATION}-${EXT}-config.json"

    if [ ! -f "$CONFIG_FILE" ]; then
      echo "Creating $CONFIG_FILE..."

      # Create config with all 113 knobs
      node -e "
        const handler = require('./station${STATION: -1}-handler');
        const h = new handler('$EXT');
        console.log('Created config for $STATION-$EXT');
      "
    else
      echo "$CONFIG_FILE already exists"
    fi
  done
done

echo "All 16 configurations initialized"
```

---

*This enhanced plan ensures all 113 knobs are properly managed with safety defaults for quick recovery*