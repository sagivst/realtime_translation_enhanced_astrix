# Voice Stations Monitoring - Safe Implementation Plan

**Date:** December 8, 2024
**Target:** Voice-related monitoring stations (1, 2, 3, 9, 10, 11 + new Asterisk→SIP station)
**Approach:** Safe, incremental, with rollback points

---

## ⚠️ CRITICAL REQUIREMENTS

### Data Collection Standards (ALL Voice Stations)
**Every voice station MUST collect and emit:**
- ✅ **75 metrics** (complete matrix from UniversalCollector)
- ✅ **113 knobs** (all configuration parameters)
- ✅ Station-specific filtering is ONLY for display/UI purposes
- ✅ Database receives ALL metrics and ALL knobs per station

### Station-3 Special Requirements (REFERENCE - Already Working)
**Station-3 (Deepgram STT) includes EXTRA Deepgram data:**
- ✅ 75 metrics (standard)
- ✅ 113 knobs (standard)
- ✅ **+10 Deepgram STT Parameters (ADDITIONAL):**
  1. `deepgram.confidence` - Transcript confidence score
  2. `deepgram.words_recognized` - Word count per segment
  3. `deepgram.is_final` - Final vs interim result
  4. `deepgram.alternatives` - Alternative transcripts count
  5. `deepgram.speaker_count` - Detected speakers
  6. `deepgram.language_detected` - Auto-detected language
  7. `deepgram.language_confidence` - Language detection confidence
  8. `deepgram.vad_speech_duration` - Speech duration detected
  9. `deepgram.vad_silence_duration` - Silence duration detected
  10. `deepgram.model_version` - Deepgram model version used

**Total Station-3 Data:**
- 75 metrics + 113 knobs + 10 Deepgram STT parameters = **198 data points**

### Station-11 Special Requirements
**Station-11 (Hume Branch) MUST include EXTRA data:**
- ✅ 75 metrics (standard)
- ✅ 113 knobs (standard)
- ✅ **+10 Hume Emotional Parameters (ADDITIONAL):**
  1. `hume.arousal` - Emotional arousal level
  2. `hume.valence` - Positive/negative emotion
  3. `hume.energy` - Voice energy level
  4. `hume.voiceDetected` - Voice activity detection
  5. `hume.emotionalIntensity` - Overall emotion strength
  6. `hume.emotionalStability` - Emotion consistency
  7. `hume.speechRate` - Speaking speed
  8. `hume.pitchVariation` - Voice pitch changes
  9. `hume.emotionalConfidence` - AI confidence score
  10. `hume.processingLatency` - Hume processing delay

**Total Station-11 Data:**
- 75 metrics + 113 knobs + 10 Hume parameters = **198 data points**

---

## Station-3 Reference Implementation (WORKING MODEL)

Station-3 is **already operational** and serves as our reference for implementing other stations. Here's how it works:

### How Station-3 Emits Extra Deepgram Parameters

**In station3-handler.js:**
```javascript
// Record transcript metrics (from Deepgram response)
onTranscript(data) {
  if (!this.stationAgent) return;

  // StationAgent automatically collects ALL 75 metrics + 113 knobs
  // We just record the Deepgram-specific STT parameters:

  const confidence = data.channel?.alternatives?.[0]?.confidence || 0;
  const words = data.channel?.alternatives?.[0]?.words || [];
  const isFinal = data.is_final;

  // Record 10 extra Deepgram STT parameters
  this.stationAgent.recordMetric('deepgram.confidence', confidence);
  this.stationAgent.recordMetric('deepgram.words_recognized', words.length);
  this.stationAgent.recordMetric('deepgram.is_final', isFinal ? 1 : 0);
  // ... (7 more Deepgram-specific parameters)
}
```

**In STTTTSserver.js (minimal hook):**
```javascript
// Deepgram transcript event
connection.on('Transcript', (data) => {
  // Existing transcript processing code...

  // MINIMAL HOOK - Just one line:
  if (station3Handlers[extensionId]) {
    station3Handlers[extensionId].onTranscript(data);
  }
});
```

**Result:** Station-3 emits:
- 75 metrics (from UniversalCollector - automatic)
- 113 knobs (from config file - automatic)
- +10 Deepgram STT parameters (from handler.recordMetric() calls)
- **Total: 198 data points**

---

## Implementation Order

### Priority 1: STTTTSserver Stations (Lowest Risk)
- ✅ **Station-3:** Already operational (198 data points: 75+113+10 Deepgram)
- 🎯 **Station-9:** STTTTSserver → Gateway (TTS Output) - 188 data points
- 🎯 **Station-11:** STTTTSserver → Hume Branch - 198 data points (75+113+10 Hume)

### Priority 2: Gateway Stations (Medium Risk)
- 🎯 **Station-2:** Gateway → STTTTSserver
- 🎯 **Station-10:** Gateway → Asterisk

### Priority 3: Asterisk Stations (Higher Risk)
- 🎯 **Station-1:** Asterisk → Gateway
- 🎯 **Station-13 (NEW):** Asterisk → SIP Clients

---

## Phase 1: Station-9 (STTTTSserver → Gateway TTS Output)

### Objective
Replicate Station-3's proven handler pattern for Station-9 TTS output monitoring

### Prerequisites Check
```bash
# 1. Verify STTTTSserver is running
ssh azureuser@20.170.155.53 "ps aux | grep STTTTSserver.js | grep -v grep"

# 2. Verify monitoring server is running
ssh azureuser@20.170.155.53 "ps aux | grep monitoring-server.js | grep -v grep"

# 3. Check current Station-3 is working (our reference implementation)
curl http://20.170.155.53:8080/api/snapshots | jq '.[] | select(.station_id=="Station-3")'
```

### Step 1.1: Create Backup
```bash
# Backup STTTTSserver.js
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && \
  cp STTTTSserver.js STTTTSserver.js.before-station9-$(date +%Y%m%d-%H%M%S)"

# Verify backup
ssh azureuser@20.170.155.53 "ls -lh /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js.before-station9*"
```

### Step 1.2: Create Station-9 Handler Module (COPY Station-3 pattern)
**Risk Level:** ZERO - New file, doesn't affect existing system
**Location:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station9-handler.js`

```javascript
// Station-9 Handler - Based on proven Station-3 pattern
const fs = require('fs');

class Station9Handler {
  constructor(extensionId) {
    this.extensionId = extensionId;
    this.configPath = `/tmp/STATION_9-${extensionId}-config.json`;
    this.knobs = {};
    this.stationAgent = null;

    // Start polling for config changes (same as Station-3)
    this.startPolling();
  }

  // Initialize StationAgent when available (same as Station-3)
  initStationAgent(StationAgent) {
    this.stationAgent = new StationAgent('STATION_9', this.extensionId);
    console.log(`[STATION-9] StationAgent initialized for ${this.extensionId}`);
  }

  // Poll config file every 100ms (same as Station-3)
  startPolling() {
    setInterval(() => {
      try {
        const newKnobs = this.loadKnobs();
        if (JSON.stringify(newKnobs) !== JSON.stringify(this.knobs)) {
          this.knobs = newKnobs;
          console.log(`[STATION-9] Config updated for extension ${this.extensionId}`);
          this.onKnobsChanged?.(this.knobs);
        }
      } catch (e) {
        // Silent fail - config loading is not critical
      }
    }, 100);
  }

  // Load knobs from config file (same as Station-3)
  loadKnobs() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (e) {}
    return {};
  }

  // Record TTS output metrics
  onTTSOutput(audioBuffer) {
    if (!this.stationAgent) return;

    // Station-9 collects ALL 75 metrics + 113 knobs via StationAgent
    // StationAgent.collectMetrics() automatically includes everything
    // We just provide the context-specific data

    this.stationAgent.recordMetric('tts_buffer_size', audioBuffer.length);
    this.stationAgent.recordMetric('tts_output_timestamp', Date.now());
  }

  // Record audio quality metrics
  onAudioQuality(rms, peak, mos) {
    if (!this.stationAgent) return;

    this.stationAgent.recordMetric('audio_rms', rms);
    this.stationAgent.recordMetric('audio_peak', peak);
    this.stationAgent.recordMetric('audio_mos', mos);
  }
}

module.exports = Station9Handler;
```

### Step 1.3: Add MINIMAL Integration to STTTTSserver.js
**Risk Level:** LOW - Following proven Station-3 pattern
**Location:** STTTTSserver.js

**Step 1.3a: Import Handler (add near line 50 with other requires)**
```javascript
// Add after Station-3 handler import
const Station9Handler = require('./station9-handler');
```

**Step 1.3b: Initialize Handlers (add near line 320 where Station-3 handlers are initialized)**
```javascript
// Initialize Station-9 handlers (same pattern as Station-3)
const station9Handlers = {
  '3333': new Station9Handler('3333'),
  '4444': new Station9Handler('4444')
};

// Initialize StationAgent when available (same as Station-3)
try {
  const StationAgent = require('./monitoring/StationAgent');
  station9Handlers['3333'].initStationAgent(StationAgent);
  station9Handlers['4444'].initStationAgent(StationAgent);
  console.log('[STATION-9] Monitoring initialized for both extensions');
} catch (e) {
  console.log('[STATION-9] Running without monitoring:', e.message);
}
```

**Step 1.3c: Hook TTS Output Events (find where audio is sent to Gateway)**
```javascript
// Find where TTS audio is sent to Gateway audioBridges
// Example location: in TTS response handler

// MINIMAL HOOK - Just one line per event:
if (station9Handlers[extensionId]) {
  station9Handlers[extensionId].onTTSOutput(audioBuffer);
}
```

### Step 1.4: Create Initial Config Files
```bash
# Create Station-9 config files (same structure as Station-3)
ssh azureuser@20.170.155.53 "cat > /tmp/STATION_9-3333-config.json << 'EOF'
{
  \"station_id\": \"STATION_9\",
  \"extension\": \"3333\",
  \"tts\": {
    \"enabled\": true,
    \"monitor_output\": true
  }
}
EOF
"

ssh azureuser@20.170.155.53 "cat > /tmp/STATION_9-4444-config.json << 'EOF'
{
  \"station_id\": \"STATION_9\",
  \"extension\": \"4444\",
  \"tts\": {
    \"enabled\": true,
    \"monitor_output\": true
  }
}
EOF
"
```

### Step 1.5: Pre-Restart Verification
```bash
# Test syntax
ssh azureuser@20.170.155.53 "node --check /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js" && echo "✅ Syntax valid"

# Test handler in isolation
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && node -e \"
const Station9Handler = require('./station9-handler');
const handler = new Station9Handler('3333');
console.log('✅ Station-9 handler loads successfully');
\""
```

### Step 1.6: Restart STTTTSserver
```bash
# Graceful restart
ssh azureuser@20.170.155.53 "
  cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && \
  pkill -f STTTTSserver.js && \
  sleep 2 && \
  nohup node STTTTSserver.js > /tmp/sttttserver-station9.log 2>&1 &
"

# Monitor startup
ssh azureuser@20.170.155.53 "tail -f /tmp/sttttserver-station9.log | grep -E 'STATION-9|ERROR|Started'"
```

### Step 1.7: Verify Station-9 Works
```bash
# Check logs for initialization
ssh azureuser@20.170.155.53 "grep 'STATION-9.*initialized' /tmp/sttttserver-station9.log"

# Make test call and check for Station-9 data
curl http://20.170.155.53:8080/api/snapshots | jq '.[] | select(.station_id=="Station-9")'

# Verify Station-3 still works
curl http://20.170.155.53:8080/api/snapshots | jq '.[] | select(.station_id=="Station-3")'
```

### Step 1.6: Rollback Procedure (If Needed)
```bash
# If Station-9 breaks something:
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && \
  pkill -f STTTTSserver.js && \
  cp STTTTSserver.js.before-station9-* STTTTSserver.js && \
  nohup node STTTTSserver.js > /tmp/sttttserver.log 2>&1 &"
```

### Success Criteria for Station-9
- [ ] Station-9 agents initialize without errors
- [ ] **All 75 metrics collected** from UniversalCollector
- [ ] **All 113 knobs emitted** from configuration
- [ ] **188 total data points per emission** (75 + 113)
- [ ] TTS audio metrics collected when audio is sent
- [ ] Data appears in monitoring API (`/api/snapshots`)
- [ ] Station-3 continues working normally
- [ ] No audio quality degradation in calls
- [ ] Extensions 3333 and 4444 both monitored
- [ ] Console logs show: "✓ Emitted 75 metrics + 113 knobs"

---

## Phase 2: Station-11 (STTTTSserver → Hume Branch)

### Objective
Integrate existing Hume emotional metrics into the monitoring system

### Prerequisites Check
```bash
# Verify Hume integration is working
ssh azureuser@20.170.155.53 "grep -n 'humeClient.on.*metrics' /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js"
```

### Step 2.1: Create Backup
```bash
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && \
  cp STTTTSserver.js STTTTSserver.js.before-station11-$(date +%Y%m%d-%H%M%S)"
```

### Step 2.2: Add Station-11 Agent Initialization
```javascript
// Add after Station-9 initialization

// STATION-11 MONITORING: Hume AI Emotional Branch
let station11Agents = {};

if (typeof StationAgent !== 'undefined') {
  try {
    station11Agents['3333'] = new StationAgent('STATION_11', '3333');
    station11Agents['4444'] = new StationAgent('STATION_11', '4444');
    console.log('[STATION-11] ✅ Monitoring agents initialized for Hume branch');
  } catch (err) {
    console.log('[STATION-11] ⚠️ Could not initialize monitoring:', err.message);
  }
}
```

### Step 2.3: Modify Existing Hume Metrics Handler
**Location:** Around line 665-701 where Hume metrics are received

```javascript
// EXISTING CODE (lines 665-701):
humeClient.on('metrics', (metrics) => {
  try {
    const extensionId = socketToExtension[socketId];

    if (extensionId && activeChannels[extensionId]) {
      // ... existing emotion tracking ...
    }
  } catch (err) {
    console.error(`[HUME-WS] ⚠ Error processing metrics:`, err.message);
  }
});

// ENHANCED WITH STATION-11 MONITORING (FULL DATASET):
humeClient.on('metrics', (metrics) => {
  try {
    const extensionId = socketToExtension[socketId];

    if (extensionId && activeChannels[extensionId]) {
      // Existing emotion tracking code (keep as is)
      const emotions = [
        { name: 'Arousal', score: metrics.arousal },
        { name: 'Valence', score: metrics.valence },
        { name: 'Energy', score: metrics.energy }
      ];

      // ... existing code ...

      // STATION-11 MONITORING: CRITICAL - Collect ALL 75 metrics + 113 knobs + 10 Hume params
      if (station11Agents[extensionId]) {
        try {
          // CRITICAL: collectMetrics() returns ALL 75 metrics from UniversalCollector
          const fullMetrics = station11Agents[extensionId].collectMetrics({
            audioData: {
              // Audio buffer metrics
              bufferSize: activeChannels[extensionId].lastBufferSize || 0,
              rms: activeChannels[extensionId].lastRMS || 0,
              peak: activeChannels[extensionId].lastPeak || 0
            },
            audioQuality: {
              snr: activeChannels[extensionId].lastSNR || 0,
              speechLevel: activeChannels[extensionId].lastSpeechLevel || 0,
              mos: activeChannels[extensionId].lastMOS || 0
            },
            performance: {
              processingLatency: metrics.processingTime || 0,
              queueDepth: metrics.queueDepth || 0,
              cpu: process.cpuUsage().user / 1000000,
              memory: process.memoryUsage().heapUsed / 1024 / 1024
            },
            timestamp: Date.now(),
            callId: activeChannels[extensionId].callId
          });

          // Get ALL 113 knobs from configuration
          const allKnobs = station11Agents[extensionId].getAllKnobs();

          // STATION-11 SPECIAL: Add 10 EXTRA Hume emotional parameters
          const humeEmotionalParams = {
            'hume.arousal': metrics.arousal || 0,
            'hume.valence': metrics.valence || 0,
            'hume.energy': metrics.energy || 0,
            'hume.voiceDetected': metrics.voiceDetected ? 1 : 0,
            'hume.emotionalIntensity': calculateEmotionalIntensity(metrics),
            'hume.emotionalStability': metrics.stability || 0,
            'hume.speechRate': metrics.speechRate || 0,
            'hume.pitchVariation': metrics.pitchVariation || 0,
            'hume.emotionalConfidence': metrics.confidence || 0,
            'hume.processingLatency': metrics.processingTime || 0
          };

          // Emit COMPLETE dataset to monitoring server
          if (io) {
            io.emit('station-metrics', {
              station_id: 'STATION_11',
              extension: extensionId,
              metrics: fullMetrics,              // ALL 75 metrics
              knobs: allKnobs,                   // ALL 113 knobs
              humeEmotionalParams: humeEmotionalParams, // +10 EXTRA Hume params
              emotions: emotions,                // Legacy emotion display
              timestamp: new Date().toISOString()
            });
          }

          console.log(`[STATION-11] ✓ Emitted ${Object.keys(fullMetrics).length} metrics + ${Object.keys(allKnobs).length} knobs + 10 Hume params for ${extensionId}`);
        } catch (err) {
          console.error(`[STATION-11] Error collecting metrics for ${extensionId}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error(`[HUME-WS] ⚠ Error processing metrics:`, err.message);
  }
});

// Helper function for emotional intensity calculation
function calculateEmotionalIntensity(metrics) {
  // Calculate combined intensity from arousal, valence, and energy
  const arousal = metrics.arousal || 0;
  const valence = Math.abs(metrics.valence || 0); // Absolute for intensity
  const energy = metrics.energy || 0;
  return (arousal + valence + energy) / 3;
}
```

### Step 2.4: Test Station-11 Implementation
```bash
# 1. Deploy updated code
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && pkill -f STTTTSserver.js && nohup node STTTTSserver.js > /tmp/sttttserver-station11.log 2>&1 &"

# 2. Monitor logs
ssh azureuser@20.170.155.53 "tail -f /tmp/sttttserver-station11.log | grep 'STATION-11\|HUME'"

# 3. Make test call and verify Station-11 data
curl http://20.170.155.53:8080/api/snapshots | jq '.[] | select(.station_id=="Station-11")'

# 4. Verify emotional metrics are included
curl http://20.170.155.53:8080/api/snapshots | jq '.[] | select(.station_id=="Station-11") | .emotions'
```

### Success Criteria for Station-11
- [ ] Station-11 agents initialize successfully
- [ ] **All 75 metrics collected** from UniversalCollector
- [ ] **All 113 knobs emitted** from configuration
- [ ] **+10 extra Hume emotional parameters emitted** (arousal, valence, energy, etc.)
- [ ] **198 total data points per emission** (75 + 113 + 10)
- [ ] Hume emotional metrics captured (arousal, valence, energy, voiceDetected, intensity, etc.)
- [ ] Data flows to monitoring API with `humeEmotionalParams` field
- [ ] Emotional data enriches standard metrics
- [ ] No impact on existing Hume functionality
- [ ] Both extensions monitored
- [ ] Console logs show: "✓ Emitted 75 metrics + 113 knobs + 10 Hume params"

---

## Phase 3: Station-2 (Gateway → STTTTSserver)

### Objective
Monitor audio quality and performance as audio enters STTTTSserver from Gateway

### Prerequisites Check
```bash
# 1. Verify gateways are running
ssh azureuser@20.170.155.53 "ps aux | grep 'gateway-3333\|gateway-4444' | grep -v grep"

# 2. Check audio bridge connections
ssh azureuser@20.170.155.53 "netstat -an | grep '3333\|4444'"
```

### Step 3.1: Create Backups
```bash
# Backup STTTTSserver
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && \
  cp STTTTSserver.js STTTTSserver.js.before-station2-$(date +%Y%m%d-%H%M%S)"

# Backup gateways
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational && \
  cp gateway-3333.js gateway-3333.js.before-station2-$(date +%Y%m%d-%H%M%S) && \
  cp gateway-4444.js gateway-4444.js.before-station2-$(date +%Y%m%d-%H%M%S)"
```

### Step 3.2: Add Station-2 to STTTTSserver
```javascript
// Add after Station-11 initialization in STTTTSserver.js

// STATION-2 MONITORING: Audio input from Gateway
let station2Agents = {};

if (typeof StationAgent !== 'undefined') {
  try {
    station2Agents['3333'] = new StationAgent('STATION_2', '3333');
    station2Agents['4444'] = new StationAgent('STATION_2', '4444');
    console.log('[STATION-2] ✅ Monitoring agents initialized for gateway input');
  } catch (err) {
    console.log('[STATION-2] ⚠️ Could not initialize monitoring:', err.message);
  }
}
```

### Step 3.3: Hook into Audio Ingestion
**Location:** Find where STTTTSserver receives audio from Gateway (likely in audioBridge 'data' event)

```javascript
// Find audio ingestion point - example:
audioBridges[extension].on('data', (audioChunk) => {

  // STATION-2 MONITORING: CRITICAL - Collect ALL 75 metrics + 113 knobs
  if (station2Agents[extension]) {
    // Sample every 10th chunk to reduce overhead
    if (Math.random() < 0.1) {
      try {
        // Calculate real-time audio metrics
        const rms = calculateRMS(audioChunk);
        const peak = calculatePeak(audioChunk);

        // CRITICAL: collectMetrics() returns ALL 75 metrics from UniversalCollector
        const fullMetrics = station2Agents[extension].collectMetrics({
          audioData: {
            bufferSize: audioChunk.length,
            rms: rms,
            peak: peak,
            clipping: peak > 0.95 ? 1 : 0
          },
          audioQuality: {
            snr: calculateSNR(audioChunk),
            speechLevel: rms * 100,
            mos: estimateMOS(audioChunk)
          },
          performance: {
            bandwidth: (audioChunk.length * 8 * 50) / 1000, // kbps estimate
            bufferHealth: audioBridges[extension].writableLength,
            cpu: process.cpuUsage().user / 1000000,
            memory: process.memoryUsage().heapUsed / 1024 / 1024
          },
          timestamp: Date.now(),
          callId: activeChannels[extension]?.callId || 'unknown',
          direction: 'incoming-from-gateway'
        });

        // Get ALL 113 knobs from configuration
        const allKnobs = station2Agents[extension].getAllKnobs();

        // Emit COMPLETE dataset to monitoring (throttled)
        if (io && Date.now() - lastStation2Emit > 2000) {
          io.emit('station-metrics', {
            station_id: 'STATION_2',
            extension: extension,
            metrics: fullMetrics,        // ALL 75 metrics
            knobs: allKnobs,              // ALL 113 knobs
            timestamp: new Date().toISOString()
          });
          lastStation2Emit = Date.now();

          console.log(`[STATION-2] ✓ Emitted ${Object.keys(fullMetrics).length} metrics + ${Object.keys(allKnobs).length} knobs for ${extension}`);
        }
      } catch (err) {
        console.error(`[STATION-2] Error collecting metrics:`, err.message);
      }
    }
  }

  // Original audio processing (keep as is)
  processIncomingAudio(extension, audioChunk);
});
```

### Step 3.4: Add Throttling Variables
```javascript
// Add near top of file with other global vars
let lastStation2Emit = 0; // Throttle Station-2 emissions
```

### Step 3.5: Test Station-2 Implementation
```bash
# 1. Deploy updated STTTTSserver
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && \
  pkill -f STTTTSserver.js && \
  nohup node STTTTSserver.js > /tmp/sttttserver-station2.log 2>&1 &"

# 2. Monitor initialization
ssh azureuser@20.170.155.53 "tail -20 /tmp/sttttserver-station2.log | grep STATION-2"

# 3. Make test call
# (Call between extensions 3333 and 4444)

# 4. Check Station-2 data
curl http://20.170.155.53:8080/api/snapshots | jq '.[] | select(.station_id=="Station-2")'

# 5. Verify all STTTTSserver stations working
curl http://20.170.155.53:8080/api/snapshots | jq '[.[] | select(.station_id | startswith("Station"))] | group_by(.station_id) | map({station: .[0].station_id, count: length})'
```

### Success Criteria for Station-2
- [ ] Station-2 agents initialize
- [ ] **All 75 metrics collected** from UniversalCollector
- [ ] **All 113 knobs emitted** from configuration
- [ ] **188 total data points per emission** (75 + 113)
- [ ] Audio ingestion metrics collected from Gateway
- [ ] Data appears in API within 5 seconds of call start
- [ ] No audio quality impact
- [ ] Monitoring is throttled (not overwhelming system)
- [ ] All other stations still working
- [ ] Console logs show: "✓ Emitted 75 metrics + 113 knobs"

---

## Phase 4: Station-10 (Gateway → Asterisk)

### Objective
Monitor audio output from Gateway back to Asterisk PBX

### Step 4.1: Identify Gateway Output Point
```bash
# Find where gateway sends audio to Asterisk
ssh azureuser@20.170.155.53 "grep -n 'write.*rtp\|send.*asterisk' /home/azureuser/translation-app/3333_4444__Operational/gateway-3333.js | head -20"
```

### Step 4.2: Add Station-10 Monitoring to Gateway Files

**Note:** Gateway files (gateway-3333.js, gateway-4444.js) need to:
1. Initialize Socket.IO client connection to monitoring server
2. Create StationAgent instances for Station-10
3. Hook into RTP output functions

```javascript
// Add to gateway-3333.js and gateway-4444.js

// At top of file
const io = require('socket.io-client');
const StationAgent = require('./STTTTSserver/monitoring/StationAgent');

// Connect to monitoring server
const monitoringSocket = io('http://localhost:3001', {
  reconnection: true,
  reconnectionDelay: 1000
});

// Initialize Station-10 agent
const station10Agent = new StationAgent('STATION_10', '3333'); // or '4444'

monitoringSocket.on('connect', () => {
  console.log('[STATION-10] ✅ Connected to monitoring server');
});

// Hook into RTP send function (find existing RTP output)
function sendRTPToAsterisk(audioBuffer) {
  // STATION-10 MONITORING: CRITICAL - Collect ALL 75 metrics + 113 knobs
  if (Math.random() < 0.05) { // Sample 5% to reduce load
    try {
      // Calculate real-time audio metrics
      const rms = calculateRMS(audioBuffer);
      const peak = calculatePeak(audioBuffer);

      // CRITICAL: collectMetrics() returns ALL 75 metrics from UniversalCollector
      const fullMetrics = station10Agent.collectMetrics({
        audioData: {
          bufferSize: audioBuffer.length,
          rms: rms,
          peak: peak,
          clipping: peak > 0.95 ? 1 : 0,
          packetsInFlight: rtpSession.getPacketCount()
        },
        audioQuality: {
          snr: calculateSNR(audioBuffer),
          mos: estimateMOS(audioBuffer),
          thd: calculateTHD(audioBuffer)
        },
        network: {
          bandwidth: calculateBandwidth(),
          droppedPackets: rtpSession.getDroppedCount(),
          jitter: rtpSession.getJitter(),
          latency: rtpSession.getLatency()
        },
        performance: {
          cpu: process.cpuUsage().user / 1000000,
          memory: process.memoryUsage().heapUsed / 1024 / 1024
        },
        timestamp: Date.now()
      });

      // Get ALL 113 knobs from configuration
      const allKnobs = station10Agent.getAllKnobs();

      // Emit COMPLETE dataset to monitoring server
      monitoringSocket.emit('station-metrics', {
        station_id: 'STATION_10',
        extension: '3333', // or '4444'
        metrics: fullMetrics,        // ALL 75 metrics
        knobs: allKnobs,              // ALL 113 knobs
        timestamp: new Date().toISOString()
      });

      console.log(`[STATION-10] ✓ Emitted ${Object.keys(fullMetrics).length} metrics + ${Object.keys(allKnobs).length} knobs`);
    } catch (err) {
      console.error('[STATION-10] Monitoring error:', err.message);
    }
  }

  // Original RTP send (keep as is)
  rtpSession.send(audioBuffer);
}
```

### Step 4.3: Test Station-10
```bash
# Test one gateway first (3333)
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational && \
  pkill -f gateway-3333.js && \
  nohup node gateway-3333.js > /tmp/gateway-3333-station10.log 2>&1 &"

# Monitor logs
ssh azureuser@20.170.155.53 "tail -f /tmp/gateway-3333-station10.log | grep STATION-10"

# Check data
curl http://20.170.155.53:8080/api/snapshots | jq '.[] | select(.station_id=="Station-10" and .extension=="3333")'

# If successful, deploy to gateway-4444
```

### Success Criteria for Station-10
- [ ] Gateway connects to monitoring server
- [ ] **All 75 metrics collected** from UniversalCollector
- [ ] **All 113 knobs emitted** from configuration
- [ ] **188 total data points per emission** (75 + 113)
- [ ] Station-10 metrics collected on audio output to Asterisk
- [ ] Data flows to API
- [ ] Audio quality unchanged
- [ ] No RTP packet issues
- [ ] Both gateways monitored (3333 and 4444)
- [ ] Console logs show: "✓ Emitted 75 metrics + 113 knobs"

---

## Phase 5: Station-1 (Asterisk → Gateway)

### Objective
Monitor audio quality from Asterisk PBX to Gateway (incoming calls)

### Step 5.1: Add Station-1 to Gateway Files
```javascript
// Add to gateway-3333.js and gateway-4444.js

// Initialize Station-1 agent (add with Station-10)
const station1Agent = new StationAgent('STATION_1', '3333'); // or '4444'

// Hook into RTP receive handler
rtpSession.on('data', (rtpPacket) => {
  // STATION-1 MONITORING: CRITICAL - Collect ALL 75 metrics + 113 knobs
  if (Math.random() < 0.05) { // Sample 5%
    try {
      const audioBuffer = rtpPacket.payload;

      // Calculate real-time audio metrics
      const rms = calculateRMS(audioBuffer);
      const peak = calculatePeak(audioBuffer);

      // CRITICAL: collectMetrics() returns ALL 75 metrics from UniversalCollector
      const fullMetrics = station1Agent.collectMetrics({
        audioData: {
          bufferSize: audioBuffer.length,
          rms: rms,
          peak: peak,
          clipping: peak > 0.95 ? 1 : 0
        },
        audioQuality: {
          snr: calculateSNR(audioBuffer),
          mos: estimateMOS(audioBuffer),
          speechLevel: rms * 100
        },
        network: {
          jitter: rtpSession.getJitter(),
          latency: rtpSession.getLatency(),
          packetLoss: rtpSession.getLossRate(),
          packetsReceived: rtpSession.getPacketCount()
        },
        performance: {
          cpu: process.cpuUsage().user / 1000000,
          memory: process.memoryUsage().heapUsed / 1024 / 1024,
          bandwidth: calculateBandwidth()
        },
        timestamp: Date.now()
      });

      // Get ALL 113 knobs from configuration
      const allKnobs = station1Agent.getAllKnobs();

      // Emit COMPLETE dataset to monitoring server
      monitoringSocket.emit('station-metrics', {
        station_id: 'STATION_1',
        extension: '3333', // or '4444'
        metrics: fullMetrics,        // ALL 75 metrics
        knobs: allKnobs,              // ALL 113 knobs
        timestamp: new Date().toISOString()
      });

      console.log(`[STATION-1] ✓ Emitted ${Object.keys(fullMetrics).length} metrics + ${Object.keys(allKnobs).length} knobs`);
    } catch (err) {
      console.error('[STATION-1] Monitoring error:', err.message);
    }
  }

  // Original packet processing (keep as is)
  processRTPPacket(rtpPacket);
});
```

### Step 5.2: Add Network Metric Helpers to Gateway
```javascript
// Add helper functions for Station-1 metrics
function calculateRMS(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 2) {
    const sample = buffer.readInt16LE(i) / 32768.0;
    sum += sample * sample;
  }
  return Math.sqrt(sum / (buffer.length / 2));
}
```

### Step 5.3: Test Station-1
```bash
# Deploy to gateway-3333 first
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational && \
  pkill -f gateway-3333.js && \
  nohup node gateway-3333.js > /tmp/gateway-3333-station1.log 2>&1 &"

# Check data
curl http://20.170.155.53:8080/api/snapshots | jq '.[] | select(.station_id=="Station-1")'
```

### Success Criteria for Station-1
- [ ] Incoming RTP packets monitored
- [ ] **All 75 metrics collected** from UniversalCollector
- [ ] **All 113 knobs emitted** from configuration
- [ ] **188 total data points per emission** (75 + 113)
- [ ] Network metrics (jitter, latency, loss) collected from Asterisk
- [ ] Audio quality metrics calculated
- [ ] Data flows to API
- [ ] No impact on call quality
- [ ] Both gateways monitored (3333 and 4444)
- [ ] Console logs show: "✓ Emitted 75 metrics + 113 knobs"

---

## Phase 6: Station-13 (NEW - Asterisk → SIP Clients)

### Objective
Monitor audio quality after Asterisk processes it and before sending to SIP clients

### Step 6.1: Define Station-13 Configuration
```bash
# Add to station-parameter-map.js
ssh azureuser@20.170.155.53 "cat >> /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring/config/station-parameter-map.js << 'EOF'

,
  // STATION 13: Asterisk → SIP Clients (12 parameters)
  STATION_13: [
    'buffer.output',
    'latency.processing',
    'packet.sent',
    'packet.loss',
    'packet.jitter',
    'audioQuality.snr',
    'audioQuality.mos',
    'audioQuality.thd',
    'performance.cpu',
    'performance.bandwidth',
    'custom.state',
    'custom.successRate'
  ]
EOF
"
```

### Step 6.2: Asterisk Monitoring Integration
**Note:** This requires Asterisk dialplan hooks or ARI integration

```asterisk
; In Asterisk extensions.conf
; Add audio monitoring hook before SIP send

[outgoing-to-sip]
exten => _X.,1,NoOp(Starting SIP send monitoring)
same => n,Set(AUDIO_HOOK_MONITOR=station13)
same => n,Dial(SIP/${EXTEN})
same => n,Hangup()
```

**Or via ARI (preferred):**
```javascript
// In Asterisk ARI handler
channel.on('StasisStart', (event, channel) => {
  // Monitor audio quality before SIP send
  channel.startSnoop({
    spy: 'out',
    whisper: 'none',
    app: 'station13-monitor',
    appArgs: 'direction=to-sip'
  });
});
```

### Step 6.3: Create Station-13 Monitoring Service
```bash
# Create new service file
ssh azureuser@20.170.155.53 "cat > /home/azureuser/translation-app/station13-monitor.js << 'EOF'
const ari = require('ari-client');
const io = require('socket.io-client');
const StationAgent = require('./3333_4444__Operational/STTTTSserver/monitoring/StationAgent');

// Connect to monitoring server
const monitoringSocket = io('http://localhost:3001');

// Initialize Station-13 agents
const station13Agents = {
  '3333': new StationAgent('STATION_13', '3333'),
  '4444': new StationAgent('STATION_13', '4444')
};

ari.connect('http://localhost:8088', 'asterisk', 'password', (err, client) => {
  if (err) throw err;

  client.on('StasisStart', (event, channel) => {
    const extension = channel.name.includes('3333') ? '3333' : '4444';

    // Monitor channel before SIP send
    channel.on('ChannelStateChange', (event) => {
      if (event.channel.state === 'Up') {
        collectStation13Metrics(channel, extension);
      }
    });
  });
});

function collectStation13Metrics(channel, extension) {
  // STATION-13 MONITORING: CRITICAL - Collect ALL 75 metrics + 113 knobs
  try {
    // Get RTP statistics from Asterisk channel
    channel.getChannelVar({ variable: 'RTPAUDIOQOS' }, (err, qosData) => {
      if (err) {
        console.error('[STATION-13] Error getting RTP stats:', err.message);
        return;
      }

      // Parse Asterisk RTP statistics
      const rtpStats = parseRTPStats(qosData.value);

      // CRITICAL: collectMetrics() returns ALL 75 metrics from UniversalCollector
      const fullMetrics = station13Agents[extension].collectMetrics({
        audioQuality: {
          snr: rtpStats.snr || 0,
          mos: rtpStats.mos || 0,
          thd: rtpStats.thd || 0,
          speechLevel: rtpStats.rxLevel || 0
        },
        network: {
          jitter: rtpStats.rxjitter || 0,
          latency: rtpStats.rtt || 0,
          packetLoss: rtpStats.rxploss || 0,
          packetsSent: rtpStats.txcount || 0
        },
        buffer: {
          output: rtpStats.txbuffer || 0,
          jitter: rtpStats.rxjitter || 0
        },
        performance: {
          cpu: process.cpuUsage().user / 1000000,
          memory: process.memoryUsage().heapUsed / 1024 / 1024,
          bandwidth: calculateBandwidth(rtpStats)
        },
        timestamp: Date.now()
      });

      // Get ALL 113 knobs from configuration
      const allKnobs = station13Agents[extension].getAllKnobs();

      // Emit COMPLETE dataset to monitoring server
      monitoringSocket.emit('station-metrics', {
        station_id: 'STATION_13',
        extension: extension,
        metrics: fullMetrics,        // ALL 75 metrics
        knobs: allKnobs,              // ALL 113 knobs
        timestamp: new Date().toISOString()
      });

      console.log(`[STATION-13] ✓ Emitted ${Object.keys(fullMetrics).length} metrics + ${Object.keys(allKnobs).length} knobs for ${extension}`);
    });
  } catch (err) {
    console.error('[STATION-13] Error collecting metrics:', err.message);
  }
}

// Helper function to parse Asterisk RTP statistics
function parseRTPStats(qosString) {
  // Parse RTPAUDIOQOS format: "ssrc=123;txcount=456;rxcount=789;..."
  const stats = {};
  if (!qosString) return stats;

  qosString.split(';').forEach(pair => {
    const [key, value] = pair.split('=');
    if (key && value) {
      stats[key.trim()] = parseFloat(value);
    }
  });

  return stats;
}

function calculateBandwidth(rtpStats) {
  // Calculate bandwidth from packet counts and timestamps
  const bytesPerPacket = 160; // typical for 8kHz ulaw
  const packetsPerSecond = 50; // 20ms packets
  return (bytesPerPacket * packetsPerSecond * 8) / 1000; // kbps
}
EOF
"
```

### Step 6.4: Test Station-13
```bash
# Start monitoring service
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app && \
  nohup node station13-monitor.js > /tmp/station13.log 2>&1 &"

# Make test call
# Check data
curl http://20.170.155.53:8080/api/snapshots | jq '.[] | select(.station_id=="Station-13")'
```

### Success Criteria for Station-13
- [ ] Station-13 configuration added to station-parameter-map.js
- [ ] **All 75 metrics collected** from UniversalCollector
- [ ] **All 113 knobs emitted** from configuration
- [ ] **188 total data points per emission** (75 + 113)
- [ ] Asterisk ARI integration working
- [ ] Audio metrics collected before SIP send
- [ ] RTP statistics parsed from Asterisk RTPAUDIOQOS
- [ ] Data flows to API
- [ ] No impact on call routing
- [ ] Both extensions monitored (3333 and 4444)
- [ ] Console logs show: "✓ Emitted 75 metrics + 113 knobs"

---

## Testing & Validation

### Complete System Test
```bash
# 1. Make a full call cycle (Caller → Callee → Response)

# 2. Check all voice stations have data
curl http://20.170.155.53:8080/api/snapshots | jq '
  [.[] | select(.station_id | test("Station-[1-3]|Station-[9-11]|Station-13"))]
  | group_by(.station_id)
  | map({
      station: .[0].station_id,
      count: length,
      extensions: [.[].extension] | unique
    })
'

# 3. Verify data freshness (all within last 10 seconds)
curl http://20.170.155.53:8080/api/snapshots | jq '
  [.[] | select(.station_id | test("Station"))]
  | map({
      station: .station_id,
      age_seconds: (now - (.timestamp | fromdate))
    })
  | map(select(.age_seconds < 10))
'

# 4. Check for errors in logs
ssh azureuser@20.170.155.53 "tail -100 /tmp/sttttserver*.log | grep -i 'error\|fail\|warn'"
```

### Performance Validation
```bash
# 1. Check CPU usage hasn't increased significantly
ssh azureuser@20.170.155.53 "top -b -n 1 | grep -E 'STTTTSserver|gateway|node'"

# 2. Check memory usage
ssh azureuser@20.170.155.53 "ps aux | grep -E 'STTTTSserver|gateway' | awk '{sum+=\$6} END {print \"Total Memory: \" sum/1024 \" MB\"}'"

# 3. Monitor network traffic
ssh azureuser@20.170.155.53 "ifstat 1 10"
```

### Audio Quality Validation
```bash
# Make 5 test calls and verify:
# - No audio dropouts
# - No increased latency
# - No quality degradation
# - MOS scores remain > 4.0
```

---

## Rollback Procedures

### Individual Station Rollback
```bash
# Example: Rollback Station-9
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && \
  pkill -f STTTTSserver.js && \
  cp STTTTSserver.js.before-station9-* STTTTSserver.js && \
  nohup node STTTTSserver.js > /tmp/sttttserver.log 2>&1 &"
```

### Complete Rollback
```bash
# Restore all backups
ssh azureuser@20.170.155.53 "
  cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && \
  cp STTTTSserver.js.before-station9-* STTTTSserver.js && \
  pkill -f STTTTSserver.js && \
  nohup node STTTTSserver.js > /tmp/sttttserver.log 2>&1 &

  cd /home/azureuser/translation-app/3333_4444__Operational && \
  pkill -f gateway-3333.js && pkill -f gateway-4444.js && \
  cp gateway-3333.js.before-station2-* gateway-3333.js && \
  cp gateway-4444.js.before-station2-* gateway-4444.js && \
  nohup node gateway-3333.js > /tmp/gateway-3333.log 2>&1 & \
  nohup node gateway-4444.js > /tmp/gateway-4444.log 2>&1 &
"
```

---

## Implementation Timeline

### Day 1: STTTTSserver Stations (4-6 hours)
- Station-9: 2 hours
- Station-11: 1.5 hours
- Testing: 1 hour

### Day 2: Gateway Stations (6-8 hours)
- Station-2: 3 hours
- Station-10: 2 hours
- Testing: 2 hours

### Day 3: Asterisk Stations (6-8 hours)
- Station-1: 3 hours
- Station-13: 3 hours
- Testing: 2 hours

### Day 4: Integration & Validation (4 hours)
- Complete system test
- Performance validation
- Documentation

**Total: 20-26 hours**

---

## Success Metrics

### Data Collection Verification
- [ ] **All 7 voice stations operational** (Stations 1, 2, 3, 9, 10, 11, 13)
- [ ] **Each station emits 75 metrics** from UniversalCollector
- [ ] **Each station emits 113 knobs** from configuration
- [ ] **Station-11 emits +10 extra Hume emotional parameters** (198 total data points)
- [ ] **Both extensions (3333, 4444) monitored** per station
- [ ] **Data from all stations appears in API** within 5 seconds

### Data Quality Verification
- [ ] **Metrics contain real-time values** (not zeros or defaults)
- [ ] **Knobs reflect actual configuration** from system
- [ ] **Station-11 Hume params show emotional data** (arousal, valence, energy, etc.)
- [ ] **Timestamps accurate** across all stations

### System Health Verification
- [ ] **No audio quality degradation** during calls
- [ ] **CPU usage increase < 10%** from baseline
- [ ] **Memory usage increase < 15%** from baseline
- [ ] **No call failures** due to monitoring overhead
- [ ] **No increased latency** in audio processing
- [ ] **All existing functionality** continues working normally

### Per-Station Data Count Validation
```bash
# Verify each station emits correct data points:
# Station-3: 75 metrics + 113 knobs + 10 Deepgram STT params = 198 data points ✅ WORKING
# Station-11: 75 metrics + 113 knobs + 10 Hume params = 198 data points
# Station 1, 2, 9, 10, 13: 75 metrics + 113 knobs = 188 data points

curl http://20.170.155.53:8080/api/snapshots | jq '
  [.[] | select(.station_id | test("Station-"))]
  | group_by(.station_id)
  | map({
      station: .[0].station_id,
      metrics_count: (.[0].metrics | length),
      knobs_count: (.[0].knobs | length),
      extra_params: (.[0].deepgramSTTParams | length // 0) + (.[0].humeEmotionalParams | length // 0),
      total: ((.[0].metrics | length) + (.[0].knobs | length) + (.[0].deepgramSTTParams | length // 0) + (.[0].humeEmotionalParams | length // 0))
    })
'

# Expected output:
# Station-1: 188 total (75 + 113)
# Station-2: 188 total (75 + 113)
# Station-3: 198 total (75 + 113 + 10 Deepgram) ← ALREADY WORKING
# Station-9: 188 total (75 + 113)
# Station-10: 188 total (75 + 113)
# Station-11: 198 total (75 + 113 + 10 Hume)
# Station-13: 188 total (75 + 113)
```

---

## Emergency Contacts

**If Issues Occur:**
1. Check logs: `/tmp/sttttserver*.log`, `/tmp/gateway*.log`
2. Check monitoring server: `ps aux | grep monitoring-server`
3. Check database API: `curl http://localhost:8083/health`
4. Rollback problematic station immediately
5. Document the issue before attempting fixes

**Safety First:** Any station that causes audio issues should be immediately rolled back.