# Monitoring Modules Implementation Plan

## Executive Summary

This plan outlines the complete implementation of reusable metric collectors for all 7 monitoring stations, integrated with the existing STTTTSserver.js and monitoring dashboard at port 3021.

---

## Current System Analysis

### Existing Socket.IO Events (Already Implemented)

The current STTTTSserver.js emits these events that the dashboard consumes:

| Event Name | Purpose | Data Structure | Status |
|------------|---------|----------------|--------|
| `transcriptionPartial` | Real-time ASR results | `{extension, text, language, timestamp}` | ✅ Active |
| `transcriptionFinal` | Final ASR results | `{extension, text, language, confidence}` | ✅ Active |
| `translationComplete` | MT results | `{sourceLang, targetLang, originalText, translatedText}` | ✅ Active |
| `translatedAudio` | TTS output | `{extension, audioBuffer, format}` | ✅ Active |
| `audioStream` | Raw audio data | `{extension, buffer, sampleRate}` | ✅ Active |
| `emotion_detected` | Hume emotion data | `{extension, emotions, prosody}` | ✅ Active |
| `elevenlabsMetrics` | TTS metrics | `{latency, characterCount}` | ✅ Active |
| `latencyUpdate` | Pipeline timing | `{stage, latency, timestamp}` | ✅ Active |
| `stage_timing` | Stage-level timing | `{stage, duration}` | ✅ Active |
| `metrics_update` | System metrics | `{cpu, memory, ...}` | ⚠️ Partial |
| `service_status` | Service health | `{service, status, error}` | ⚠️ Partial |
| `participant_joined` | Call state | `{extension, timestamp}` | ⚠️ Partial |
| `participant_left` | Call state | `{extension, timestamp}` | ⚠️ Partial |
| `audiosocket-connected` | Asterisk state | `{port, extension}` | ✅ Active |
| `audiosocket-disconnected` | Asterisk state | `{port, extension}` | ✅ Active |

### Dashboard Expectations

The monitoring dashboard expects:
- **Real-time updates** (100-500ms intervals)
- **Structured JSON** payloads
- **Backward compatibility** with existing events
- **Progressive enhancement** (new metrics don't break old display)

---

## Goal: Enhance with 75 Parameters Across 7 Stations

### Strategy

1. **Keep existing events working** - Don't break current functionality
2. **Add new structured events** - Emit additional detailed metrics
3. **Use station-specific collectors** - Each station reports its relevant parameters
4. **Maintain performance** - Efficient collection and emission
5. **Enable AI optimization** - Store data for optimizer consumption

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Existing System (STTTTSserver.js)                          │
│  ├── Current Socket.IO events ✅                            │
│  ├── UDP audio processing ✅                                │
│  └── AI service integration ✅                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ↓ Integration Layer
┌─────────────────────────────────────────────────────────────┐
│  NEW: Station Agent SDK (Embedded)                          │
│  ├── MetricCollector instances                              │
│  ├── Real-time metric collection                            │
│  ├── Snapshot builder (for optimizer)                       │
│  └── Event emitter (for dashboard)                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        ↓                   ↓
┌──────────────┐   ┌──────────────────┐
│  Dashboard   │   │  Ingestion API   │
│  (Real-time) │   │  (Historical)    │
└──────────────┘   └──────────────────┘
```

---

## Implementation Plan by Station

### STATION 1: Asterisk → Gateway (RTP Output)

**Location:** Runs on Asterisk or as monitoring process

**Parameters to Collect:** 12
- buffer.input, buffer.jitter
- latency.network, latency.jitter, latency.min, latency.max
- packet.received, packet.loss, packet.outOfOrder
- audioQuality.snr, audioQuality.mos
- performance.cpu

**Integration Point:**
- Monitor RTP streams before they reach Gateway
- Hook into Asterisk CDR/ARI events
- Analyze RTP packets in real-time

**New Socket.IO Events:**
```javascript
io.emit('station1_metrics', {
  station: 'STATION_1',
  extension: '3333',
  timestamp: Date.now(),
  metrics: {
    'buffer.input': 45.2,      // %
    'buffer.jitter': 3.2,      // ms
    'packet.loss': 0.1,        // %
    'packet.received': 50,     // packets/s
    'audioQuality.snr': 24.5,  // dB
    'audioQuality.mos': 4.2,   // score
    'latency.network': 12,     // ms
    // ... other metrics
  },
  alerts: [
    { level: 'warning', metric: 'buffer.input', message: '...' }
  ]
});
```

**Implementation File:** `station-agents/station1-agent.js`

---

### STATION 2: Gateway → STTTTSserver (PCM Conversion)

**Location:** Embedded in `gateway-3333.js` and `gateway-4444.js`

**Parameters to Collect:** 10
- buffer.output, buffer.processing
- latency.processing
- audioQuality.mos, audioQuality.speechLevel, audioQuality.clipping
- performance.cpu, performance.bandwidth
- custom.state, custom.successRate

**Integration Point:**
- Hook into GStreamer pipeline
- Monitor before/after PCM conversion
- Track UDP socket performance

**New Socket.IO Events:**
```javascript
io.emit('station2_metrics', {
  station: 'STATION_2',
  extension: '3333',
  metrics: {
    'buffer.output': 52.1,           // %
    'buffer.processing': 45,         // ms
    'latency.processing': 12,        // ms
    'audioQuality.speechLevel': -18, // dBFS
    'audioQuality.clipping': 0.01,   // %
    'performance.cpu': 23,           // %
    'custom.state': 'active'
  }
});
```

**Implementation File:** `station-agents/station2-agent.js`

---

### STATION 3: STTTTSserver → Deepgram (Pre-ASR)

**Location:** Embedded in `STTTTSserver.js` before Deepgram WebSocket send

**Parameters to Collect:** 14
- buffer.processing
- latency.processing
- audioQuality.snr, audioQuality.speechLevel, audioQuality.clipping, audioQuality.noise
- dsp.agc.currentGain, dsp.noiseReduction.noiseLevel
- performance.cpu, performance.memory, performance.bandwidth
- custom.state, custom.successRate, custom.totalProcessed

**Integration Point:**
```javascript
// In STTTTSserver.js, around line 3700 (before Deepgram send)
socket3333In.on('message', async (msg, rinfo) => {
  // EXISTING CODE
  udpPcmStats.from3333Packets++;

  // NEW: Collect metrics
  const station3Metrics = await station3Agent.collectMetrics({
    pcmBuffer: msg,
    sampleRate: 16000,
    buffers: {
      processing: udpAudioBuffers.get('3333')
    }
  });

  // Emit to dashboard
  global.io.emit('station3_metrics', {
    station: 'STATION_3',
    extension: '3333',
    metrics: station3Metrics
  });

  // CONTINUE EXISTING CODE
  if (USE_DEEPGRAM_STREAMING && streamingStateManager) {
    // ... existing code
  }
});
```

**New Socket.IO Events:**
```javascript
io.emit('station3_metrics', {
  station: 'STATION_3',
  extension: '3333',
  metrics: {
    'audioQuality.snr': 25.4,          // dB
    'audioQuality.speechLevel': -17.4, // dBFS
    'audioQuality.noise': -60.2,       // dBFS
    'dsp.agc.currentGain': -12,        // dB
    'buffer.processing': 85,           // ms
    'custom.successRate': 98.5         // %
  }
});
```

**Implementation File:** Embedded in `STTTTSserver.js` via `station-agents/station3-agent.js`

---

### STATION 4: Deepgram Response (ASR Output)

**Location:** Embedded in Deepgram WebSocket handlers in `STTTTSserver.js`

**Parameters to Collect:** 8
- latency.processing
- custom.transcriptionLength, custom.wordCount, custom.confidence
- custom.successRate, custom.lastActivity
- performance.cpu, performance.queue

**Integration Point:**
```javascript
// In Deepgram message handler (around line 520-560)
dgConnection.on('message', (data) => {
  const result = JSON.parse(data);

  if (result.type === 'Results') {
    const transcript = result.channel.alternatives[0].transcript;

    // NEW: Collect Station 4 metrics
    station4Agent.recordTranscription({
      transcript,
      confidence: result.channel.alternatives[0].confidence,
      wordCount: transcript.split(' ').length,
      latency: Date.now() - lastAudioSentTime
    });

    const station4Metrics = station4Agent.getMetrics();

    global.io.emit('station4_metrics', {
      station: 'STATION_4',
      extension: extensionId,
      metrics: station4Metrics
    });

    // EXISTING transcriptionFinal event
    global.io.emit('transcriptionFinal', { /*...*/ });
  }
});
```

**New Socket.IO Events:**
```javascript
io.emit('station4_metrics', {
  station: 'STATION_4',
  extension: '3333',
  metrics: {
    'latency.processing': 180,     // ms (ASR latency)
    'custom.confidence': 0.91,
    'custom.wordCount': 15,
    'custom.transcriptionLength': 87,
    'custom.successRate': 99.2
  }
});
```

---

### STATION 9: STTTTSserver → Gateway (Post-TTS Output)

**Location:** Embedded in `STTTTSserver.js` after TTS synthesis

**Parameters to Collect:** 15
- buffer.output
- latency.avg, latency.total
- audioQuality.mos, audioQuality.speechLevel, audioQuality.clipping, audioQuality.distortion
- dsp.agc.currentGain, dsp.compressor.reduction, dsp.limiter.reduction
- performance.cpu, performance.memory
- custom.state, custom.latencySyncApplied, custom.pipelineLatency

**Integration Point:**
```javascript
// After TTS synthesis, before sending to Gateway (around line 2480)
async function sendUdpPcmAudio(targetExtension, pcmBuffer) {
  // NEW: Collect Station 9 metrics
  const station9Metrics = await station9Agent.collectMetrics({
    pcmBuffer,
    sampleRate: 16000,
    buffers: {
      output: { size: pcmBuffer.length, capacity: maxBufferSize }
    }
  });

  global.io.emit('station9_metrics', {
    station: 'STATION_9',
    extension: targetExtension,
    metrics: station9Metrics
  });

  // EXISTING send code
  const socket = targetExtension === '3333' ? socket3333Out : socket4444Out;
  // ... rest of existing code
}
```

---

### STATION 10: Gateway → Asterisk (RTP Return)

**Location:** Embedded in `gateway-3333.js` and `gateway-4444.js`

**Parameters to Collect:** 10
- buffer.output
- packet.sent, packet.dropped
- latency.processing
- audioQuality.mos, audioQuality.thd
- performance.cpu, performance.bandwidth
- custom.framesSent, custom.framesDropped

---

### STATION 11: STTTTSserver → Hume (Emotion Branch)

**Location:** Embedded in Hume client code in `STTTTSserver.js`

**Parameters to Collect:** 10
- buffer.processing
- latency.processing, latency.websocket
- audioQuality.snr, audioQuality.speechLevel
- custom.queueDepth, custom.websocketConnected, custom.successRate
- custom.lastActivity
- performance.cpu

**Integration Point:**
```javascript
// In Hume audio send handler (around line 3770)
if (USE_HUME_EMOTION && humeStateManager) {
  let state = humeStateManager.getState("3333");

  if (state && state.isReady && state.client && state.client.ws) {
    try {
      // NEW: Collect Station 11 metrics
      const station11Metrics = await station11Agent.collectMetrics({
        pcmBuffer: msg,
        sampleRate: 16000,
        websocketState: state
      });

      global.io.emit('station11_metrics', {
        station: 'STATION_11',
        extension: '3333',
        metrics: station11Metrics
      });

      // EXISTING Hume send
      state.client.sendAudio(msg);
    }
  }
}
```

---

## Dashboard Integration

### New Events Summary

Add these new Socket.IO listeners to the dashboard:

```javascript
// In monitoring-dashboard.html
socket.on('station1_metrics', updateStation1Display);
socket.on('station2_metrics', updateStation2Display);
socket.on('station3_metrics', updateStation3Display);
socket.on('station4_metrics', updateStation4Display);
socket.on('station9_metrics', updateStation9Display);
socket.on('station10_metrics', updateStation10Display);
socket.on('station11_metrics', updateStation11Display);

// Aggregate event for all stations
socket.on('all_stations_metrics', (data) => {
  // data = { STATION_1: {...}, STATION_2: {...}, ... }
  updateFullSystemView(data);
});
```

### Dashboard Display Components

Create these UI sections:

1. **Station Overview Grid**
   - 7 cards, one per station
   - Status indicator (green/yellow/red)
   - Key metrics display

2. **Parameter Detail Panels**
   - Expandable per station
   - Shows all 75 parameters with current values
   - Threshold indicators

3. **Real-time Charts**
   - Buffer utilization over time
   - Latency trends
   - Audio quality metrics
   - Packet statistics

4. **Alert Panel**
   - Recent warnings and critical alerts
   - Grouped by station

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create station agent base classes
- [ ] Implement core metric collectors (Buffer, Latency, Audio Quality)
- [ ] Set up testing framework
- [ ] Create mock data generators

### Phase 2: Station 3 Integration (Week 2)
- [ ] Embed Station 3 agent in STTTTSserver.js
- [ ] Add `station3_metrics` event emission
- [ ] Update dashboard to display Station 3 metrics
- [ ] Test with live traffic

### Phase 3: Gateway Stations (Week 3)
- [ ] Implement Station 2 in gateway-3333/4444.js
- [ ] Implement Station 10 in gateway-3333/4444.js
- [ ] Add Socket.IO client to gateways (emit to STTTTSserver)
- [ ] Test end-to-end flow

### Phase 4: Remaining Stations (Week 4)
- [ ] Station 1 (Asterisk monitoring)
- [ ] Station 4 (Deepgram response)
- [ ] Station 9 (Post-TTS)
- [ ] Station 11 (Hume branch)

### Phase 5: Dashboard Enhancement (Week 5)
- [ ] Create station overview UI
- [ ] Add parameter detail panels
- [ ] Implement real-time charts
- [ ] Add alert system

### Phase 6: Optimization Integration (Week 6)
- [ ] Connect to Ingestion API
- [ ] Store snapshots for optimizer
- [ ] Implement config client
- [ ] Test parameter updates

---

## File Structure

```
3333_4444__Operational/
├── STTTTSserver/
│   ├── STTTTSserver.js                    # Main server (modify)
│   ├── station-agents/                    # NEW
│   │   ├── StationAgent.js               # Base class
│   │   ├── station3-agent.js             # Station 3 embedded
│   │   ├── station4-agent.js             # Station 4 embedded
│   │   ├── station9-agent.js             # Station 9 embedded
│   │   └── station11-agent.js            # Station 11 embedded
│   ├── collectors/                        # NEW (copied from SDK)
│   │   ├── MetricCollector.js
│   │   ├── BufferMetrics.js
│   │   ├── LatencyMetrics.js
│   │   ├── AudioQualityMetrics.js
│   │   ├── PerformanceMetrics.js
│   │   └── CustomMetrics.js
│   ├── utils/                             # NEW
│   │   └── AudioAnalyzer.js
│   └── public/
│       └── monitoring-tree-dashboard.html # Update dashboard
├── Gateway/
│   ├── gateway-3333.js                    # Modify
│   ├── gateway-4444.js                    # Modify
│   └── station-agents/                    # NEW
│       ├── station2-agent.js
│       └── station10-agent.js
└── station-agent-sdk/                     # Reference implementation
    └── (existing SDK files)
```

---

## Code Integration Examples

### Example 1: Station 3 in STTTTSserver.js

```javascript
// At top of STTTTSserver.js
const Station3Agent = require('./station-agents/station3-agent');

// Initialize
const station3Agent_3333 = new Station3Agent({ extension: '3333' });
const station3Agent_4444 = new Station3Agent({ extension: '4444' });

// In UDP handler
socket3333In.on('message', async (msg, rinfo) => {
  udpPcmStats.from3333Packets++;

  // Collect metrics (non-blocking)
  setImmediate(async () => {
    try {
      const metrics = await station3Agent_3333.collectMetrics({
        pcmBuffer: msg,
        sampleRate: 16000,
        buffers: udpAudioBuffers.get('3333')
      });

      global.io.emit('station3_metrics', {
        station: 'STATION_3',
        extension: '3333',
        timestamp: Date.now(),
        metrics
      });
    } catch (err) {
      console.error('[Station3] Metric collection error:', err.message);
    }
  });

  // Continue with existing audio processing
  if (USE_DEEPGRAM_STREAMING && streamingStateManager) {
    // ... existing code unchanged
  }
});
```

### Example 2: Dashboard Update

```javascript
// In monitoring-tree-dashboard.html
socket.on('station3_metrics', (data) => {
  const { station, extension, metrics } = data;

  // Update SNR display
  document.getElementById('station3-snr').textContent =
    metrics['audioQuality.snr'].toFixed(1) + ' dB';

  // Update speech level
  document.getElementById('station3-speech-level').textContent =
    metrics['audioQuality.speechLevel'].toFixed(1) + ' dBFS';

  // Check thresholds and update status
  if (metrics['audioQuality.snr'] < 20) {
    document.getElementById('station3-status').className = 'status-warning';
  } else {
    document.getElementById('station3-status').className = 'status-ok';
  }

  // Update chart
  addToChart('snrChart', metrics['audioQuality.snr']);
});
```

---

## Performance Considerations

### Metric Collection Frequency

- **High frequency (100ms):** Buffer, latency, audio levels (Stations 1,2,3,9,10)
- **Medium frequency (500ms):** Audio quality, performance (All stations)
- **Low frequency (1s):** Statistics, aggregates (All stations)

### Optimization Strategies

1. **Non-blocking collection:** Use `setImmediate()` or async workers
2. **Sampling:** Collect every Nth packet for expensive metrics
3. **Caching:** Reuse calculations within time windows
4. **Throttling:** Emit updates at max 10Hz to dashboard
5. **Batching:** Combine multiple metrics in single event

---

## Testing Strategy

### Unit Tests
- Test each metric collector independently
- Validate threshold detection
- Test with edge cases (silence, clipping, noise)

### Integration Tests
- Test embedded agents in STTTTSserver
- Verify Socket.IO event emission
- Test with real PCM audio samples

### Load Tests
- Simulate 10 concurrent calls
- Monitor CPU/memory impact
- Verify no audio dropouts

### End-to-End Tests
- Full call flow with all 7 stations
- Verify all 75 parameters collected
- Check dashboard updates in real-time

---

## Success Criteria

✅ All 75 parameters collected across 7 stations
✅ Real-time dashboard updates < 500ms latency
✅ No impact on audio quality or call latency
✅ CPU overhead < 10% per station
✅ Memory overhead < 50MB total
✅ Zero breaking changes to existing functionality
✅ Snapshots stored for optimizer integration

---

## Next Steps

1. **Review this plan** - Approve approach and priorities
2. **Start with Station 3** - Highest value, easiest integration
3. **Create prototype** - Embed Station 3 agent in STTTTSserver.js
4. **Test with live traffic** - Validate metrics and performance
5. **Iterate** - Expand to other stations based on learnings

---

## Questions for Approval

1. Should we start with Station 3 as the prototype?
2. Do you want to see the dashboard updates first or backend first?
3. What's the priority order for the 7 stations?
4. Should we implement all 75 parameters or start with a subset?
5. Do you have specific performance requirements (CPU/memory limits)?

---

**Document Version:** 1.0
**Date:** 2025-11-27
**Status:** Awaiting Approval
