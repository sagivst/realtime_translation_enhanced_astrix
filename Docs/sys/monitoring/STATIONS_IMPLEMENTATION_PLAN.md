# Station-3 Implementation Plan with QA Tests
## Complete Step-by-Step Guide for Safe Implementation

**Created:** December 3, 2024
**Purpose:** Safely implement Station-3 with minimal risk and proper QA testing

## Related Documentation
- **[STATION_3_BASELINE_CONFIG.md](./STATION_3_BASELINE_CONFIG.md)** - Current working configuration captured from production
- **[STATION_3_KNOB_MANAGEMENT_PLAN.md](./STATION_3_KNOB_MANAGEMENT_PLAN.md)** - Complete 113-knob management with safety defaults

---

## CRITICAL: Current Production Baseline Values
**THESE ARE THE EXACT VALUES WORKING IN PRODUCTION - DO NOT CHANGE WITHOUT TESTING!**

### Captured from STTTTSserver.js (line 473):
```javascript
const connection = deepgram.listen.live({
  model: "nova-3",              // ← CRITICAL: Using nova-3, NOT nova-2!
  encoding: "linear16",
  sample_rate: 16000,
  channels: 1,
  interim_results: true,
  endpointing: 300,             // 300ms silence detection
  smart_format: true,
  language: extensionId === "3333" ? "en" : "fr"  // English for 3333, French for 4444
});
```

### Key Differences from Documentation:
1. **Model**: Production uses `nova-3` (NOT `nova-2`)
2. **Language**: Extension-specific - `"en"` for 3333, `"fr"` for 4444
3. **Limited Parameters**: Only 8 parameters set (not all 113 required)

### Baseline Config Files Created:
- `/tmp/STATION_3-3333-config.json` - English configuration with nova-3 and all 113 knobs
- `/tmp/STATION_3-4444-config.json` - French configuration with nova-3 and all 113 knobs

---

## COMPLETE 113-KNOB CONFIGURATION FOR STATION-3

**CRITICAL**: Station-3 must manage ALL 113 knobs, not just the 8 Deepgram parameters!

### Three-Layer Configuration Structure:
```json
{
  "defaults": {},       // Factory defaults - NEVER auto-modified
  "saved_defaults": {}, // User-saved baseline - modified only by user
  "active": {}         // Currently active - modified by optimizer
}
```

### Complete List of 113 Knobs for Station-3:

#### 1. Deepgram/STT Knobs (25 knobs)
```javascript
"deepgram": {
  "model": "nova-3",                    // 1. Model selection (CURRENT: nova-3)
  "language": "en",                     // 2. Language code (3333: "en", 4444: "fr")
  "punctuate": true,                    // 3. Add punctuation
  "profanityFilter": false,             // 4. Filter profanity
  "redact": false,                      // 5. Redact sensitive info
  "diarize": false,                     // 6. Speaker diarization
  "smartFormat": true,                  // 7. Smart formatting (CURRENT: true)
  "utterances": true,                   // 8. Utterance detection
  "interimResults": true,               // 9. Interim results (CURRENT: true)
  "endpointing": 300,                   // 10. Endpointing timeout (CURRENT: 300)
  "vadTurnoff": 500,                    // 11. VAD turnoff time
  "alternatives": 1,                    // 12. Number of alternatives
  "numerals": true,                     // 13. Convert numbers
  "search": [],                         // 14. Search terms
  "replace": {},                        // 15. Replace terms
  "keywords": [],                       // 16. Keyword boosting
  "tier": "enhanced",                   // 17. Processing tier
  "version": "latest",                  // 18. API version
  "encoding": "linear16",               // 19. Audio encoding (CURRENT: linear16)
  "sampleRate": 16000,                  // 20. Sample rate (CURRENT: 16000)
  "channels": 1,                        // 21. Audio channels (CURRENT: 1)
  "multichannel": false,                // 22. Multi-channel mode
  "alternativeLanguages": [],           // 23. Alternative languages
  "detectLanguage": false,              // 24. Auto-detect language
  "measurements": true                  // 25. Include measurements
}
```

#### 2. Audio Processing Knobs (30 knobs)
```javascript
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
```

#### 3. Network/Buffer Knobs (20 knobs)
```javascript
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
```

#### 4. Codec Knobs (15 knobs)
```javascript
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
```

#### 5. Performance/System Knobs (24 knobs)
```javascript
"performance": {
  "threadPriority": "high",             // 90. Thread priority
  "cpuAffinity": null,                  // 91. CPU affinity
  "realtime": true,                     // 92. Realtime mode
  "maxCpu": 80,                         // 93. Max CPU %
  "maxMemory": 512,                     // 94. Max memory MB
  "gcInterval": 30000,                  // 95. GC interval
  "monitoring": {
    "interval": 100,                    // 96. Monitor interval (MUST BE 100ms)
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
```

### Complete 75 Metrics for Station-3:

#### STT/Deepgram Metrics (25 metrics)
1. `stt_confidence` - Transcript confidence score
2. `stt_latency` - Time from audio to transcript
3. `words_recognized` - Number of words per segment
4. `transcript_length` - Character count of transcript
5. `is_final` - Final vs interim transcript
6. `stt_error` - Error count
7. `error_type` - Type of error
8. `model_name` - Active model name
9. `model_version` - Model version
10. `request_id` - Request identifier
11. `alternative_count` - Number of alternatives
12. `speaker_count` - Detected speakers
13. `punctuation_added` - Punctuation count
14. `profanity_filtered` - Filtered words
15. `redaction_count` - Redacted items
16. `utterance_count` - Utterances detected
17. `vad_speech_duration` - Speech duration
18. `vad_silence_duration` - Silence duration
19. `language_detected` - Detected language
20. `language_confidence` - Language confidence
21. `keyword_hits` - Keyword matches
22. `search_matches` - Search term matches
23. `replacement_count` - Replaced terms
24. `measurement_duration` - Processing time
25. `measurement_channels` - Active channels

#### Audio Quality Metrics (25 metrics)
26. `audio_rms` - RMS level
27. `audio_energy` - Energy level
28. `chunk_size` - Audio chunk size
29. `audio_peak` - Peak amplitude
30. `audio_clipping` - Clipping events
31. `signal_to_noise` - SNR ratio
32. `voice_activity` - Voice presence
33. `echo_level` - Echo measurement
34. `noise_level` - Noise floor
35. `gain_adjustment` - Applied gain
36. `agc_gain` - AGC gain level
37. `agc_compression` - Compression amount
38. `aec_convergence` - AEC convergence
39. `aec_suppression` - Echo suppression
40. `nr_suppression` - Noise reduction
41. `frequency_response` - Frequency analysis
42. `harmonic_distortion` - THD measurement
43. `intermodulation` - IMD measurement
44. `phase_coherence` - Phase alignment
45. `stereo_correlation` - Channel correlation
46. `dynamic_range` - Dynamic range
47. `crest_factor` - Peak to average
48. `zero_crossing_rate` - ZCR
49. `spectral_centroid` - Frequency center
50. `spectral_rolloff` - High frequency content

#### Network/Performance Metrics (25 metrics)
51. `connection_opened` - Connection events
52. `connection_closed` - Disconnection events
53. `connection_failed` - Failed connections
54. `packet_loss` - Lost packets
55. `packet_jitter` - Jitter measurement
56. `round_trip_time` - RTT latency
57. `bandwidth_usage` - Bandwidth consumed
58. `buffer_underrun` - Buffer underruns
59. `buffer_overrun` - Buffer overruns
60. `queue_depth` - Queue size
61. `processing_time` - Processing duration
62. `cpu_usage` - CPU percentage
63. `memory_usage` - Memory consumed
64. `thread_count` - Active threads
65. `gc_count` - Garbage collections
66. `gc_duration` - GC pause time
67. `api_calls` - API call count
68. `api_errors` - API error count
69. `retry_count` - Retry attempts
70. `failover_count` - Failover events
71. `rate_limit_hits` - Rate limit reached
72. `timeout_count` - Timeout events
73. `websocket_state` - Connection state
74. `heartbeat_latency` - Heartbeat delay
75. `system_uptime` - Uptime duration

---

## Phase 1: SAFE CHANGES (No System Impact)

### Step 1.1: Create Station-3 Handler Module
**Risk Level:** ZERO - New file, doesn't affect existing system
**Location:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station3-handler.js`

```javascript
// Complete Station-3 handler - All logic in ONE place
const fs = require('fs');

class Station3Handler {
  constructor(extensionId) {
    this.extensionId = extensionId;
    this.configPath = `/tmp/STATION_3-${extensionId}-config.json`;
    this.knobs = {};
    this.audioStartTime = Date.now();
    this.stationAgent = null; // Will be initialized when StationAgent is available

    // Start polling for config changes
    this.startPolling();
  }

  // Initialize StationAgent when available
  initStationAgent(StationAgent) {
    this.stationAgent = new StationAgent('STATION_3', this.extensionId);
  }

  // Poll config file every 100ms
  startPolling() {
    setInterval(() => {
      try {
        const newKnobs = this.loadKnobs();
        if (JSON.stringify(newKnobs) !== JSON.stringify(this.knobs)) {
          this.knobs = newKnobs;
          console.log(`[STATION-3] Config updated for extension ${this.extensionId}`);
          this.onKnobsChanged?.(this.knobs);
        }
      } catch (e) {
        // Silent fail - config loading is not critical
      }
    }, 100);
  }

  // Load knobs from config file
  loadKnobs() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (e) {}
    return { deepgram: {} };
  }

  // Get Deepgram config from knobs
  getDeepgramConfig() {
    const dg = this.knobs.deepgram || {};
    return {
      model: dg.model || 'nova-2',
      language: dg.language || 'en-US',
      punctuate: dg.punctuate !== false,
      interim_results: dg.interimResults !== false,
      endpointing: dg.endpointing || 300,
      vad_turnoff: dg.vadTurnoff || 500,
      smart_format: dg.smartFormat !== false,
      diarize: dg.diarize || false,
      utterances: true,
      numerals: true
    };
  }

  // Record transcript metrics
  onTranscript(data) {
    if (!this.stationAgent) return; // Skip if not initialized

    const confidence = data.channel?.alternatives?.[0]?.confidence || 0;
    const words = data.channel?.alternatives?.[0]?.words || [];
    const isFinal = data.is_final;

    this.stationAgent.recordMetric('stt_confidence', confidence);
    this.stationAgent.recordMetric('stt_latency', Date.now() - this.audioStartTime);
    this.stationAgent.recordMetric('words_recognized', words.length);

    if (isFinal) {
      this.audioStartTime = Date.now();
    }
  }

  // Record error metrics
  onError(error) {
    if (!this.stationAgent) return;
    this.stationAgent.recordMetric('stt_error', 1);
    this.stationAgent.recordMetric('error_type', error.type || 'unknown');
  }

  // Record metadata
  onMetadata(data) {
    if (!this.stationAgent) return;
    if (data.model_info) {
      this.stationAgent.recordMetric('model_name', data.model_info.name);
    }
  }
}

module.exports = Station3Handler;
```

### Step 1.2: Document Config File Structure
**Risk Level:** ZERO - Documentation only
**Create:** `/tmp/STATION_3_CONFIG_TEMPLATE.json`

```json
{
  "station_id": "STATION_3",
  "extension": "3333_or_4444",
  "deepgram": {
    "model": "nova-2",
    "language": "en-US",
    "punctuate": true,
    "interimResults": true,
    "endpointing": 300,
    "vadTurnoff": 500,
    "smartFormat": true,
    "diarize": false
  }
}
```

---

## QA Test 1: Verify Safe Changes
**Run these tests BEFORE proceeding to Phase 2**

```bash
# Test 1.1: Verify station3-handler.js syntax
node --check /path/to/station3-handler.js

# Test 1.2: Test handler in isolation
node -e "
const Station3Handler = require('./station3-handler');
const handler = new Station3Handler('3333');
console.log('Config loaded:', handler.getDeepgramConfig());
console.log('✅ Handler works in isolation');
"

# Test 1.3: Verify config files exist
ls -la /tmp/STATION_3*.json

# Test 1.4: Check current system still works
curl -s http://20.170.155.53:3020/dashboard.html | grep -q "Dashboard" && echo "✅ Dashboard still accessible"
```

---

## Phase 2: DEPENDENCY CHECKS (Read-Only)

### Step 2.1: Check UniversalCollector Location
**Risk Level:** ZERO - Read only check

```bash
# Find UniversalCollector.js
find /home/azureuser -name "UniversalCollector.js" -type f

# Check if it exists in monitoring directory
ls -la /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring/
```

### Step 2.2: Verify StationAgent Works
**Risk Level:** ZERO - Test in isolation

```bash
# Test StationAgent module
node -e "
try {
  const StationAgent = require('./monitoring/StationAgent');
  console.log('✅ StationAgent module loads');
} catch(e) {
  console.error('❌ StationAgent error:', e.message);
}
"
```

### Step 2.3: Document Current State
**Risk Level:** ZERO - Information gathering only

```bash
# Document current Deepgram settings
grep -A 10 "deepgram.listen.live" STTTTSserver.js > /tmp/current_deepgram_config.txt

# Save current monitoring data flow
curl -s http://20.170.155.53:8080/api/snapshots | jq '.STATION_3' > /tmp/current_station3_data.json
```

---

## QA Test 2: Verify Dependencies
**Run these tests BEFORE proceeding to Phase 3**

```bash
# Test 2.1: Confirm UniversalCollector path
test -f /path/to/UniversalCollector.js && echo "✅ UniversalCollector found" || echo "❌ Missing"

# Test 2.2: Test StationAgent with mock data
node -e "
const StationAgent = require('./monitoring/StationAgent');
const agent = new StationAgent('TEST', '0000');
agent.recordMetric('test_metric', 1);
console.log('✅ StationAgent accepts metrics');
"

# Test 2.3: Backup current configuration
cp STTTTSserver.js STTTTSserver.js.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup created"
```

---

## Phase 3: STOP SIMULATED DATA (Low Risk)

### Step 3.1: Comment Out Fake Station-3 Data
**Risk Level:** LOW - Only affects fake data generation
**File:** `/home/azureuser/translation-app/continuous-full-monitoring.js`

```javascript
// FIND this section and COMMENT it out:
/*
stations['STATION_3'] = {
  '3333': generateStation3Metrics(),
  '4444': generateStation3Metrics()
};
*/
```

### Step 3.2: Restart Monitoring Service
**Risk Level:** LOW - Quick service restart

```bash
# Find and restart continuous monitoring
ps aux | grep continuous-full-monitoring | grep -v grep | awk '{print $2}' | xargs kill
nohup node continuous-full-monitoring.js > /tmp/continuous-monitoring.log 2>&1 &
```

---

## QA Test 3: Verify Simulated Data Stopped
**Run these tests BEFORE proceeding to Phase 4**

```bash
# Test 3.1: Check if fake data stopped
sleep 5
curl -s http://20.170.155.53:8080/api/snapshots | jq '.STATION_3' | grep -q "null" && echo "✅ Fake data stopped" || echo "⚠️ Still receiving data"

# Test 3.2: Verify other stations still work
curl -s http://20.170.155.53:8080/api/snapshots | jq 'keys' | grep -q "STATION_1" && echo "✅ Other stations OK"

# Test 3.3: Check monitoring server health
curl -s http://20.170.155.53:8007/health && echo "✅ Monitoring server healthy"
```

---

## Phase 4: MINIMAL STTTSSERVER INTEGRATION (Critical)

### Step 4.1: Add Station-3 Handler Import
**Risk Level:** MEDIUM - Modifying live service
**Location:** STTTSserver.js line ~50

```javascript
// Add after other requires
const Station3Handler = require('./station3-handler');
```

### Step 4.2: Initialize Handlers
**Risk Level:** MEDIUM
**Location:** STTTSserver.js line ~320

```javascript
// Initialize Station-3 handlers for both extensions
const station3Handlers = {
  '3333': new Station3Handler('3333'),
  '4444': new Station3Handler('4444')
};

// Initialize StationAgent when available
try {
  const StationAgent = require('./monitoring/StationAgent');
  station3Handlers['3333'].initStationAgent(StationAgent);
  station3Handlers['4444'].initStationAgent(StationAgent);
  console.log('[STATION-3] Monitoring initialized for both extensions');
} catch (e) {
  console.log('[STATION-3] Running without monitoring:', e.message);
}
```

### Step 4.3: Use Dynamic Deepgram Config
**Risk Level:** HIGH - Changes core functionality
**Location:** STTTSserver.js line 473 in createDeepgramStreamingConnection

```javascript
// REPLACE hardcoded config:
// const connection = deepgram.listen.live({
//   model: "nova-3",
//   language: extensionId === "3333" ? "en" : "fr",
//   ...
// });

// WITH dynamic config:
const handler = station3Handlers[extensionId];
const connection = deepgram.listen.live(handler.getDeepgramConfig());
```

### Step 4.4: Hook Deepgram Events
**Risk Level:** LOW - Adding metrics, not changing logic

```javascript
// In Transcript event (line 492):
if (station3Handlers[extensionId]) {
  station3Handlers[extensionId].onTranscript(data);
}

// In Error event (line 509):
if (station3Handlers[extensionId]) {
  station3Handlers[extensionId].onError(error);
}

// In Metadata event (line 525):
if (station3Handlers[extensionId]) {
  station3Handlers[extensionId].onMetadata(data);
}
```

---

## QA Test 4: Pre-Restart Verification
**Run these BEFORE restarting STTTSserver**

```bash
# Test 4.1: Syntax check
node --check STTTTSserver.js && echo "✅ Syntax valid" || echo "❌ Syntax error"

# Test 4.2: Module loading test
node -e "
try {
  require('./station3-handler');
  console.log('✅ Station3Handler loads');
} catch(e) {
  console.error('❌ Module error:', e);
}
"

# Test 4.3: Create test config
echo '{
  "station_id": "STATION_3",
  "extension": "3333",
  "deepgram": {
    "model": "nova-2",
    "language": "en-US"
  }
}' > /tmp/STATION_3-3333-test.json
```

---

## Phase 5: RESTART AND MONITOR

### Step 5.1: Graceful Restart
**Risk Level:** HIGH - Service interruption

```bash
# Save current PID
OLD_PID=$(ps aux | grep STTTTSserver | grep -v grep | awk '{print $2}')

# Start new instance
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
nohup node STTTTSserver.js > /tmp/STTTTSserver-new.log 2>&1 &
NEW_PID=$!

# Wait for startup
sleep 5

# Kill old instance
kill $OLD_PID 2>/dev/null

echo "Restarted: OLD_PID=$OLD_PID, NEW_PID=$NEW_PID"
```

### Step 5.2: Monitor Startup
**Risk Level:** ZERO - Monitoring only

```bash
# Watch logs for errors
tail -f /tmp/STTTTSserver-new.log | grep -E "ERROR|STATION-3|Started"
```

---

## QA Test 5: Post-Implementation Verification

```bash
# Test 5.1: Service health
curl -s http://20.170.155.53:3020/dashboard.html && echo "✅ Dashboard accessible"

# Test 5.2: Make test call to 3333
# Dial 3333, speak something, check logs for:
tail -f /tmp/STTTTSserver-new.log | grep "STATION-3"

# Test 5.3: Check real metrics flow
curl -s http://20.170.155.53:8080/api/snapshots | jq '.STATION_3."3333".stt_confidence' && echo "✅ Real metrics flowing"

# Test 5.4: Verify dynamic config loading
echo '{"deepgram":{"model":"nova-2-general"}}' > /tmp/STATION_3-3333-config.json
sleep 1
tail /tmp/STTTTSserver-new.log | grep "Config updated" && echo "✅ Dynamic config works"
```

---

## Rollback Plan

If anything goes wrong:

```bash
# 1. Stop current instance
pkill -f STTTTSserver

# 2. Restore backup
cp STTTTSserver.js.backup.* STTTTSserver.js

# 3. Restart original version
nohup node STTTTSserver.js > /tmp/STTTTSserver.log 2>&1 &

# 4. Re-enable fake data if needed
# Uncomment Station-3 section in continuous-full-monitoring.js
```

---

## Success Criteria

✅ Station-3 shows real metrics in dashboard
✅ Dynamic config changes apply without restart
✅ No errors in STTTTSserver logs
✅ Calls to 3333/4444 work normally
✅ Deepgram transcription works with dynamic settings

---

## Next Steps for Other Stations

Once Station-3 is verified working:

1. Create station1-handler.js, station2-handler.js, etc.
2. Each handler follows same pattern as station3-handler.js
3. Add minimal hooks in relevant services
4. No major changes to core services needed

---

*End of Implementation Plan*