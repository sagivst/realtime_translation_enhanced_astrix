# Detailed Implementation Plan: 7-Station Monitoring System

## Overview

We need to:
1. **Locate** the exact code locations for all 7 monitoring stations
2. **Create** an external monitoring module that collects metrics
3. **Inject** monitoring calls at each station with station ID
4. **Update** dashboard to show 7 stations with station-specific parameters
5. **Test** end-to-end data flow

---

## PART 1: Station Code Locations

### STATION 1: Asterisk → Gateway
**File:** `ari-gstreamer-operational.js`
**Line/Function:** Inside `StasisStart` event handler
**Existing Code Location:**
```javascript
client.on('StasisStart', (event, channel) => {
  // ← INSERT MONITORING CALL HERE
  const extension = event.args[0]; // ext3333 or ext4444

  // Existing code continues...
});
```

**Monitoring Call to Insert:**
```javascript
const stationMonitor = require('./station-monitor');
stationMonitor.collect('STATION-1', {
  channelId: channel.id,
  extension: event.args[0]
});
```

---

### STATION 2: Gateway → STTTTSserver
**File:** `gateway-3333-fixed.js` AND `gateway-4444.js`
**Line/Function:** Where PCM data is sent to STTTTSserver
**Need to locate:** Socket write to port 3020

**Search Pattern:**
```bash
grep -n "socket.write\|send.*3020\|STTTTSserver" gateway-3333-fixed.js
```

**Expected Location:** Inside audio processing loop
**Monitoring Call to Insert:**
```javascript
const stationMonitor = require('./station-monitor');
stationMonitor.collect('STATION-2', {
  buffer: pcmBuffer,
  extension: '3333' // or '4444'
});
// THEN socket.write(pcmBuffer)
```

---

### STATION 3: STTTTSserver → Deepgram
**File:** `STTTTSserver.js`
**Line:** ~2319 (STAGE 2: ASR Processing)
**Function:** `processAudioBuffer()` or similar
**Existing Code:**
```javascript
// Line ~2319
// STAGE 2: ASR Processing (Deepgram)
const gainFactor = extensionGainFactors.get(extension) || 1.2;
const amplifiedAudio = amplifyAudio(audioBuffer, gainFactor);
const wavBuffer = addWavHeader(amplifiedAudio, 16000, 1, 16);

// ← INSERT MONITORING CALL HERE

const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
  wavBuffer,
  options
);
```

**Monitoring Call to Insert:**
```javascript
const stationMonitor = require('./station-monitor');
stationMonitor.collect('STATION-3', {
  buffer: wavBuffer,
  extension: extension,
  gainApplied: gainFactor
});
```

---

### STATION 4: Deepgram → STTTTSserver (Response)
**File:** `STTTTSserver.js`
**Line:** ~2346 (STAGE 3: ASR → MT)
**Existing Code:**
```javascript
// After Deepgram response
const { result, error } = await deepgram.listen.prerecorded.transcribeFile(...);

// ← INSERT MONITORING CALL HERE

if (!transcription || transcription.trim() === '') {
  console.log(`[Pipeline] No transcription for extension ${extension}`);
  return;
}
```

**Monitoring Call to Insert:**
```javascript
const stationMonitor = require('./station-monitor');
stationMonitor.collect('STATION-4', {
  transcription: result?.channels[0]?.alternatives[0]?.transcript,
  confidence: result?.channels[0]?.alternatives[0]?.confidence,
  extension: extension,
  latency: timing.stages.asr
});
```

---

### STATION 9: STTTTSserver → Gateway
**File:** `STTTTSserver.js`
**Line:** ~2516 (STAGE 9: LS → Bridge)
**Existing Code:**
```javascript
// STAGE 9: LS → Bridge (Send to gateway)
// Before sending audio to gateway

// ← INSERT MONITORING CALL HERE

// Send to gateway via bridge/channel
```

**Need to Search For:**
```bash
grep -n "STAGE 9\|LS → Bridge\|sendToGateway\|bridge.*audio" STTTTSserver.js
```

**Monitoring Call to Insert:**
```javascript
const stationMonitor = require('./station-monitor');
stationMonitor.collect('STATION-9', {
  buffer: finalAudioBuffer,
  extension: extension,
  latencySyncApplied: totalBufferMs
});
```

---

### STATION 10: Gateway → Asterisk
**File:** `gateway-3333-fixed.js` AND `gateway-4444.js`
**Line/Function:** Where PCM is sent back to Asterisk channel
**Need to locate:** Channel write or ExternalMedia send

**Search Pattern:**
```bash
grep -n "channel.write\|externalMedia\|sendTo.*asterisk" gateway-3333-fixed.js
```

**Monitoring Call to Insert:**
```javascript
const stationMonitor = require('./station-monitor');
stationMonitor.collect('STATION-10', {
  buffer: pcmBuffer,
  extension: '3333', // or '4444'
  channelId: asteriskChannelId
});
// THEN channel.write(pcmBuffer)
```

---

### STATION 11: STTTTSserver → Hume (Branch)
**File:** `STTTTSserver.js` or `hume-streaming-client.js`
**Line:** ~747 or inside Hume send function
**Existing Code:**
```javascript
// Inside createHumeStreamingConnection or audio send
humeClient.sendAudio(audioChunk);
```

**Search Pattern:**
```bash
grep -n "sendAudio\|hume.*send\|humeClient" STTTTSserver.js
```

**Monitoring Call to Insert:**
```javascript
const stationMonitor = require('./station-monitor');
stationMonitor.collect('STATION-11', {
  buffer: audioChunk,
  extension: extension,
  humeSessionId: humeClient.sessionId
});
// THEN humeClient.sendAudio(audioChunk)
```

---

## PART 2: External Monitoring Module

### File: `station-monitor.js` (NEW FILE)

This module will:
1. Accept station ID and context data
2. Collect all available metrics for that station
3. Send metrics to monitoring-server.js via Socket.IO
4. Be lightweight and non-blocking

**Module Structure:**
```javascript
// station-monitor.js
const io = require('socket.io-client');

// Connect to monitoring server
const monitoringSocket = io('http://localhost:3021');

// Map of which parameters are relevant for each station
const stationParameters = {
  'STATION-1': ['buffer.input', 'buffer.jitter', 'latency.network', 'packet.received', 'audioQuality.snr', ...],
  'STATION-2': ['buffer.output', 'latency.processing', 'audioQuality.mos', ...],
  'STATION-3': ['buffer.processing', 'audioQuality.snr', 'dsp.agc.currentGain', ...],
  // ... etc for all 7 stations
};

// Main collection function
function collect(stationId, context) {
  const timestamp = Date.now();
  const relevantParams = stationParameters[stationId];

  // Collect metrics based on what's available in context
  const metrics = {};

  // Buffer metrics
  if (context.buffer) {
    metrics['buffer.total'] = calculateBufferUtilization(context.buffer);
    metrics['buffer.input'] = context.buffer.length;
  }

  // Audio quality metrics
  if (context.buffer) {
    const audioAnalysis = analyzeAudioBuffer(context.buffer);
    metrics['audioQuality.snr'] = audioAnalysis.snr;
    metrics['audioQuality.peakLevel'] = audioAnalysis.peak;
    metrics['audioQuality.rmsLevel'] = audioAnalysis.rms;
  }

  // Latency metrics
  if (context.latency) {
    metrics['latency.avg'] = context.latency;
  }

  // Send to monitoring server
  monitoringSocket.emit('stationMetrics', {
    stationId: stationId,
    timestamp: timestamp,
    extension: context.extension,
    metrics: metrics
  });
}

// Audio analysis helper
function analyzeAudioBuffer(buffer) {
  // Convert buffer to samples
  const samples = [];
  for (let i = 0; i < buffer.length; i += 2) {
    samples.push(buffer.readInt16LE(i));
  }

  // Calculate peak
  const peak = Math.max(...samples.map(Math.abs)) / 32768.0;
  const peakDb = 20 * Math.log10(peak);

  // Calculate RMS
  const sumSquares = samples.reduce((sum, s) => sum + s * s, 0);
  const rms = Math.sqrt(sumSquares / samples.length) / 32768.0;
  const rmsDb = 20 * Math.log10(rms);

  // Estimate SNR (simplified)
  const snr = peakDb - rmsDb + 60; // Rough estimation

  return {
    peak: peakDb,
    rms: rmsDb,
    snr: snr,
    clipping: peak >= 1.0
  };
}

module.exports = {
  collect
};
```

---

## PART 3: Dashboard Updates

### File: `monitoring-tree-dashboard.html` (UPDATE EXISTING)

**Changes Needed:**

#### 3.1 Level 1: Station Summary Boxes
**Current:** 2 large boxes (Station 1: ARI RECEIVE, Station 2: UDP TRANSMIT)
**New:** 7 station boxes

```javascript
// Replace existing Level 1 rendering
function showLevel1() {
  const stations = [
    { id: 'station-1', name: 'Asterisk → Gateway', type: 'RTP Output' },
    { id: 'station-2', name: 'Gateway → STTTTSserver', type: 'PCM Output' },
    { id: 'station-3', name: 'STTTTSserver → Deepgram', type: 'STT Input' },
    { id: 'station-4', name: 'Deepgram Response', type: 'Transcription' },
    { id: 'station-9', name: 'STTTTSserver → Gateway', type: 'TTS Output' },
    { id: 'station-10', name: 'Gateway → Asterisk', type: 'RTP Transmit' },
    { id: 'station-11', name: 'STTTTSserver → Hume', type: 'Emotion Branch' }
  ];

  stations.forEach(station => {
    // Create station summary box
    // Show aggregate health status
  });
}
```

#### 3.2 Level 2: Station-Specific Parameters
**Current:** Shows all 75 parameters
**New:** Filter parameters by station

```javascript
// Station-specific parameter mapping
const stationParameterMap = {
  'station-1': [
    'buffer.input', 'buffer.jitter',
    'latency.network', 'latency.jitter', 'latency.rtt',
    'packet.received', 'packet.loss', 'packet.outOfOrder',
    'audioQuality.snr', 'audioQuality.mos',
    'performance.cpu', 'performance.memory'
  ],
  'station-2': [
    'buffer.output', 'buffer.processing',
    'latency.processing',
    'audioQuality.mos', 'audioQuality.peakLevel',
    'performance.cpu'
  ],
  'station-3': [
    'buffer.processing',
    'latency.processing',
    'audioQuality.snr', 'audioQuality.peakLevel', 'audioQuality.rmsLevel',
    'dsp.agc.currentGain', 'dsp.noiseReduction.noiseLevel',
    'performance.cpu', 'performance.bandwidth'
  ],
  'station-4': [
    'latency.processing',
    'custom.successRate', 'custom.confidence',
    'performance.cpu'
  ],
  'station-9': [
    'buffer.output',
    'latency.total', 'latency.sync',
    'audioQuality.mos', 'audioQuality.peakLevel', 'audioQuality.clipping',
    'dsp.agc.currentGain', 'dsp.compressor.reduction', 'dsp.limiter.reduction',
    'performance.cpu', 'performance.memory'
  ],
  'station-10': [
    'buffer.output',
    'packet.sent', 'packet.dropped',
    'audioQuality.mos',
    'performance.cpu'
  ],
  'station-11': [
    'buffer.processing',
    'latency.websocket',
    'audioQuality.snr',
    'custom.queueDepth', 'custom.successRate',
    'performance.cpu'
  ]
};

function showLevel2(stationId) {
  const relevantParams = stationParameterMap[stationId];

  // Only render parameter boxes for this station's relevant params
  relevantParams.forEach(paramId => {
    renderParameterBox(paramId);
  });
}
```

---

## PART 4: Monitoring Server Updates

### File: `monitoring-server.js` (UPDATE EXISTING)

**Changes Needed:**

```javascript
// Handle station metrics from station-monitor.js
io.on('connection', (socket) => {

  // NEW: Listen for station metrics
  socket.on('stationMetrics', (data) => {
    const { stationId, timestamp, extension, metrics } = data;

    // Update global metrics store
    Object.keys(metrics).forEach(paramId => {
      if (globalMetrics[paramId]) {
        globalMetrics[paramId].value = metrics[paramId];
        globalMetrics[paramId].lastUpdate = timestamp;
        globalMetrics[paramId].station = stationId;
      }
    });

    // Broadcast updated metrics to dashboard
    io.emit('metricsUpdate', {
      stationId: stationId,
      parameters: metrics
    });
  });

  // Existing simulated metrics code can remain for testing
});
```

---

## PART 5: Implementation Steps (Ordered)

### Step 1: Search and Locate All 7 Stations
```bash
# On VM, search for exact code locations
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver

# STATION 1
grep -n "StasisStart" ari-gstreamer-operational.js

# STATION 2 & 10
grep -n "socket.write\|3020" gateway-3333-fixed.js gateway-4444.js

# STATION 3
grep -n "STAGE 2\|ASR Processing\|transcribeFile" STTTTSserver.js

# STATION 4
grep -n "STAGE 3\|ASR → MT" STTTTSserver.js

# STATION 9
grep -n "STAGE 9\|LS → Bridge" STTTTSserver.js

# STATION 11
grep -n "sendAudio\|humeClient" STTTTSserver.js hume-streaming-client.js
```

**Output:** Document exact line numbers for each station

### Step 2: Create `station-monitor.js`
- Write the external monitoring module
- Include parameter mapping
- Include audio analysis functions
- Test standalone (no integration yet)

### Step 3: Add Monitoring Calls (One Station at a Time)
**Order:**
1. STATION 3 (easiest - STTTTSserver, clear location)
2. STATION 9 (same file as STATION 3)
3. STATION 4 (same file, right after Deepgram response)
4. STATION 11 (same file, Hume branch)
5. STATION 2 (gateway output - need to locate in gateway files)
6. STATION 10 (gateway output to Asterisk)
7. STATION 1 (ARI - requires ari-gstreamer-operational.js)

**For Each Station:**
```javascript
// Add require at top of file
const stationMonitor = require('./station-monitor');

// At monitoring point, add call
stationMonitor.collect('STATION-X', {
  buffer: audioBuffer,
  extension: extension,
  // ... other context
});
```

### Step 4: Update Dashboard HTML
- Modify Level 1 to show 7 stations
- Update Level 2 parameter filtering
- Test station selection and parameter display

### Step 5: Update monitoring-server.js
- Add handler for 'stationMetrics' events
- Integrate with existing metrics system
- Test data flow

### Step 6: Test End-to-End
1. Make a test call (dial 3333)
2. Verify metrics appear for each station in sequence
3. Check dashboard updates in real-time
4. Verify only relevant parameters show per station

---

## PART 6: Station Parameter Mapping (Complete)

### STATION 1: Asterisk → Gateway
**Voice-Related:** ✓
**Parameter Count:** ~12
```javascript
[
  'buffer.input',
  'buffer.jitter',
  'latency.network',
  'latency.jitter',
  'latency.rtt',
  'packet.received',
  'packet.loss',
  'packet.outOfOrder',
  'packet.duplicate',
  'audioQuality.snr',
  'audioQuality.mos',
  'performance.cpu'
]
```

### STATION 2: Gateway → STTTTSserver
**Voice-Related:** ✓
**Parameter Count:** ~10
```javascript
[
  'buffer.output',
  'buffer.processing',
  'latency.processing',
  'audioQuality.mos',
  'audioQuality.peakLevel',
  'audioQuality.rmsLevel',
  'audioQuality.clipping',
  'performance.cpu',
  'performance.bandwidth',
  'custom.socketBackpressure'
]
```

### STATION 3: STTTTSserver → Deepgram
**Voice-Related:** ✓
**Parameter Count:** ~14
```javascript
[
  'buffer.processing',
  'latency.processing',
  'audioQuality.snr',
  'audioQuality.peakLevel',
  'audioQuality.rmsLevel',
  'audioQuality.clipping',
  'audioQuality.noiseLevel',
  'dsp.agc.currentGain',
  'dsp.noiseReduction.noiseLevel',
  'performance.cpu',
  'performance.memory',
  'performance.bandwidth',
  'custom.gainApplied',
  'custom.bufferSize'
]
```

### STATION 4: Deepgram Response
**Voice-Related:** ✗ (text, but relevant)
**Parameter Count:** ~8
```javascript
[
  'latency.api',
  'latency.processing',
  'custom.transcriptionLength',
  'custom.wordCount',
  'custom.confidence',
  'custom.successRate',
  'custom.language',
  'performance.cpu'
]
```

### STATION 9: STTTTSserver → Gateway
**Voice-Related:** ✓
**Parameter Count:** ~15
```javascript
[
  'buffer.output',
  'latency.total',
  'latency.sync',
  'latency.pipeline',
  'audioQuality.mos',
  'audioQuality.peakLevel',
  'audioQuality.rmsLevel',
  'audioQuality.clipping',
  'dsp.agc.currentGain',
  'dsp.compressor.reduction',
  'dsp.limiter.reduction',
  'performance.cpu',
  'performance.memory',
  'custom.latencySyncApplied',
  'custom.pipelineLatency'
]
```

### STATION 10: Gateway → Asterisk
**Voice-Related:** ✓
**Parameter Count:** ~10
```javascript
[
  'buffer.output',
  'packet.sent',
  'packet.dropped',
  'latency.processing',
  'audioQuality.mos',
  'audioQuality.peakLevel',
  'performance.cpu',
  'custom.framesSent',
  'custom.framesDropped',
  'custom.rtpPort'
]
```

### STATION 11: STTTTSserver → Hume (Branch)
**Voice-Related:** ✓
**Parameter Count:** ~10
```javascript
[
  'buffer.processing',
  'latency.websocket',
  'latency.queueTime',
  'audioQuality.snr',
  'audioQuality.peakLevel',
  'custom.queueDepth',
  'custom.websocketConnected',
  'custom.successRate',
  'custom.chunkSize',
  'performance.cpu'
]
```

---

## PART 7: File Changes Summary

### Files to CREATE:
1. `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station-monitor.js` - New monitoring module

### Files to MODIFY:
1. `ari-gstreamer-operational.js` - Add STATION-1 monitoring call
2. `gateway-3333-fixed.js` - Add STATION-2 and STATION-10 monitoring calls
3. `gateway-4444.js` - Add STATION-2 and STATION-10 monitoring calls
4. `STTTTSserver.js` - Add STATION-3, STATION-4, STATION-9, STATION-11 monitoring calls
5. `monitoring-server.js` - Add handler for station metrics
6. `public/monitoring-tree-dashboard.html` - Update to 7 stations, add parameter filtering

### Total Changes:
- **1 new file**
- **6 modified files**
- **~7-10 monitoring call insertions**
- **Dashboard: 2 major sections updated (Level 1 & Level 2)**

---

## PART 8: Risk Assessment

### Low Risk:
- Creating station-monitor.js (new file, no impact on existing)
- Dashboard updates (can test on localhost first)

### Medium Risk:
- Adding monitoring calls to STTTTSserver.js (main translation pipeline)
- Monitoring could add latency if not optimized

### Mitigation:
- Make monitoring calls **non-blocking** (fire-and-forget)
- Use `setImmediate()` or process.nextTick() to defer metric collection
- Add try/catch around all monitoring calls
- Make monitoring calls **optional** (check if module exists)

---

## PART 9: Testing Plan

### Unit Testing (Per Station):
1. Test station-monitor.js standalone
2. Test each monitoring call in isolation
3. Verify metrics are calculated correctly

### Integration Testing:
1. Make test call to extension 3333
2. Verify all 7 stations emit metrics in sequence
3. Check monitoring-server.js receives all metrics
4. Verify dashboard updates for each station

### Load Testing:
1. Multiple simultaneous calls (3333 + 4444)
2. Monitor impact on translation latency
3. Verify no memory leaks in monitoring

---

## Questions Before Implementation:

1. **Should monitoring be enabled by default or via environment variable?**
   - Suggestion: Add `MONITORING_ENABLED=true` in .env

2. **Should we keep the simulated 75-parameter data in monitoring-server.js?**
   - Suggestion: Keep for now, use as fallback when no real data

3. **How many metrics per station should we store in history?**
   - Suggestion: Last 100 readings per parameter (circular buffer)

4. **Should station-monitor.js connect to monitoring-server or emit via global.io?**
   - Suggestion: Use global.io (already exists in STTTTSserver.js)

5. **Order of implementation - test after each station or all at once?**
   - Suggestion: Implement stations 3,4,9,11 first (all in STTTTSserver.js), test, then add gateway stations

---

## Ready to Proceed?

Please review this plan and confirm:
- ✓ All 7 station locations are correct
- ✓ External monitoring module approach is good
- ✓ Dashboard changes make sense
- ✓ Implementation order is acceptable
- ✓ Any changes or concerns

Once confirmed, I'll begin implementation starting with Step 1: Locating exact code lines for all 7 stations.
