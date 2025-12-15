# Monitoring System Expansion Plan for Stations 3 & 9

**Date:** December 11, 2024
**Version:** 1.0
**Status:** Approved for Implementation

## Executive Summary
Expand monitoring capabilities for Station 3 (STT/Deepgram) and Station 9 (TTS) from current minimal implementation to comprehensive coverage as documented in the 75 parameters and 113 knobs specifications.

## Current State Analysis

### Station 3 (STT/Deepgram)
- **Metrics:** 14 of 75 collected (19% coverage)
- **Knobs:** 8 of 113 configured (7% coverage)
- **Collection:** Continuous (every 200ms)
- **Visibility:** Always present in API

### Station 9 (TTS)
- **Metrics:** 15 of 75 defined (20% coverage)
- **Knobs:** 9 of 113 configured (8% coverage)
- **Collection:** Event-driven only (no periodic)
- **Visibility:** Only during active TTS output

### Current Infrastructure
- **Monitoring Server:** Port 3001 (Socket.IO)
- **Database API:** Port 8083 (HTTP)
- **Public Access:** Cloudflare tunnel
- **Data Flow:** Station → Socket.IO → monitoring-server → bridge → database API → public API

## Implementation Strategy

### Phase 1: Fix Station 9 Periodic Collection (Priority 1)
**Goal:** Ensure Station 9 metrics are continuously visible in monitoring API

**Files to Modify:**
- `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/station9-handler.js`

**Changes:**
1. Add `setInterval()` timer in `initStationAgent()` method
2. Collect baseline metrics every 200ms (matching Station 3)
3. Maintain event-driven collection for actual TTS output
4. Ensure metrics appear in API even without active calls

### Phase 2: Expand Core Metrics Collection (Priority 1)

#### 2.1 Buffer Metrics Expansion (10 total)
**Current:** 1-2 metrics per station
**Target:** Full 10-metric buffer monitoring

**New Metrics to Add:**
- `buffer.underrun` - Buffer underrun events/sec
- `buffer.overrun` - Buffer overrun events/sec
- `buffer.jitter` - Jitter buffer depth (ms)
- `buffer.playback` - Playback buffer (ms)
- `buffer.processing` - Processing queue depth
- `buffer.network` - Network buffer size (KB)

**Files to Modify:**
- `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/unified-75-metrics-collector.js`
- `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/monitoring/StationAgent.js`

#### 2.2 Audio Quality Metrics (10 total)
**Current:** 4-6 metrics per station
**Target:** Full audio quality suite

**New Metrics to Add:**
- `audioQuality.pesq` - PESQ score calculation
- `audioQuality.polqa` - POLQA score
- `audioQuality.thd` - Total Harmonic Distortion
- `audioQuality.echo` - Echo level detection
- `audioQuality.distortion` - Overall distortion percentage

#### 2.3 Packet/Network Metrics (12 total)
**Current:** 0 metrics collected
**Target:** Complete network monitoring

**New Metrics to Add:**
- `packet.loss` - Packet loss rate
- `packet.received` - Packets/sec received
- `packet.sent` - Packets/sec sent
- `packet.outOfOrder` - Out-of-order packets
- `packet.duplicate` - Duplicate packet rate
- `packet.throughput` - Overall throughput
- `packet.bandwidth` - Bandwidth usage (Mbps)

### Phase 3: Expand DSP Knobs (Priority 2)

#### 3.1 Deepgram Configuration (Station 3)
**Current:** 8 parameters
**Target:** 25 complete Deepgram parameters

**New Knobs to Add:**
- `deepgram.profanity_filter` - Enable profanity filtering
- `deepgram.redact` - Redact sensitive entities
- `deepgram.diarize` - Speaker diarization
- `deepgram.vad_turnoff` - VAD timeout
- `deepgram.keywords` - Keyword boosting list
- `deepgram.search` - Search terms in transcript
- `deepgram.alternatives` - Number of alternatives
- `deepgram.numerals` - Convert numbers to numerals

**Files to Modify:**
- `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/config-factory-defaults.js`
- `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/station3-handler.js`

#### 3.2 TTS Configuration (Station 9)
**Current:** 9 parameters
**Target:** Complete TTS control

**New Knobs to Add:**
- `tts.chunk_length_schedule` - Streaming chunk sizes
- `tts.voice_cache` - Enable voice caching
- `tts.prosody_control` - Prosody parameters
- `tts.emotion_level` - Emotional expression

### Phase 4: Add Advanced DSP Controls (Priority 2)

#### 4.1 AGC (Automatic Gain Control) - 8 knobs
**Implementation:**
- Real-time gain tracking in Station 3 & 9
- Dynamic range control
- Attack/release time configuration

#### 4.2 AEC (Acoustic Echo Cancellation) - 7 knobs
**Implementation:**
- Echo path modeling
- Tail length configuration
- Non-linear processing control

#### 4.3 Noise Reduction - 9 knobs
**Implementation:**
- Spectral subtraction parameters
- SNR improvement tracking
- Music noise reduction

### Phase 5: Performance & System Metrics (Priority 3)

**New Metrics:**
- `performance.threads` - Active thread count
- `performance.queue` - Queue depths
- `performance.cache` - Cache hit rates
- `performance.io` - I/O wait times
- `custom.warningCount` - Warning counter
- `custom.criticalCount` - Critical alert counter

### Phase 6: Implement Knob Validation & Persistence

**Components:**
1. **Knob Validator:** Type checking, range validation, enum validation
2. **Persistence Layer:** Save active configurations to JSON files
3. **Hot Reload:** Apply knob changes without restart
4. **Rollback:** Restore previous configurations on error

**Files to Create:**
- `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/knob-validator.js`
- `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/knob-persistence.js`

## Implementation Order

### Priority 1: Critical Foundation (Immediate)
1. **Fix Station 9 Periodic Collection**
   - Add setInterval(200ms) to station9-handler.js
   - Ensure metrics visible without active calls
   - Match Station 3's collection pattern

2. **Enable All 75 Metrics**
   - Update station-parameter-map.js to include all metrics
   - Implement real calculations in unified-75-metrics-collector.js
   - Remove filtering restrictions in StationAgent.js

### Priority 2: Core Metrics Implementation
1. **Buffer Metrics (10 total)**
   - Implement underrun/overrun detection
   - Add jitter buffer tracking
   - Network buffer monitoring

2. **Network/Packet Metrics (12 total)**
   - Packet loss calculation
   - Throughput monitoring
   - Bandwidth usage tracking

3. **Audio Quality Metrics (10 total)**
   - MOS score calculation using E-model
   - SNR and THD calculation
   - Echo detection implementation

### Priority 3: Knobs Expansion
1. **DSP Knobs Implementation**
   - AGC processor (8 knobs)
   - Noise reduction (9 knobs)
   - Compressor/Limiter (14 knobs)

2. **Deepgram Advanced Parameters**
   - Profanity filter, redaction, diarization
   - Keywords and search terms
   - VAD and alternatives configuration

3. **TTS Advanced Controls**
   - Prosody and emotion controls
   - Chunk scheduling
   - Voice caching

### Priority 4: Infrastructure Optimization
1. **Memory Management**
   - Implement circular buffer for 1000 records
   - Add metric compression/delta encoding
   - Optimize Socket.IO message batching

2. **Performance Tuning**
   - Batch metric emissions (aggregate 5 samples)
   - Implement tiered collection frequencies
   - Add metric caching layer

3. **Monitoring Enhancement**
   - Real-time alert evaluation
   - Threshold-based notifications
   - Dashboard optimization for 5x data volume

## Technical Implementation Details

### 1. Station 9 Periodic Collection Fix
```javascript
// In station9-handler.js, add to initStationAgent():
setInterval(() => {
  const metrics = this.collectBaselineMetrics();
  this.stationAgent.collect(metrics);
}, 200); // Match Station 3's frequency
```

### 2. Enable All 75 Metrics
```javascript
// In station-parameter-map.js, replace limited arrays with:
STATION_3: Object.keys(parameterDefinitions), // All 75 metrics
STATION_9: Object.keys(parameterDefinitions)  // All 75 metrics
```

### 3. Implement Real Metric Calculations
```javascript
// In unified-75-metrics-collector.js:
- Replace placeholder values with actual calculations
- Use AudioAnalyzer.js for audio quality metrics
- Implement buffer tracking for underrun/overrun
- Add packet counters for network metrics
```

### 4. DSP Pipeline Integration
```javascript
// Create new AudioProcessingPipeline:
class AudioProcessingPipeline {
  processors = [];

  addProcessor(type, config) {
    switch(type) {
      case 'agc': return new AGCProcessor(config);
      case 'nr': return new NoiseReductionProcessor(config);
      case 'compressor': return new CompressorProcessor(config);
    }
  }

  process(audioBuffer) {
    return this.processors.reduce((buffer, proc) =>
      proc.process(buffer), audioBuffer);
  }
}
```

### 5. Knob Validation System
```javascript
// KnobValidator implementation:
validateKnob(path, value, definition) {
  // Type validation
  if (definition.type === 'number') {
    if (value < definition.min || value > definition.max) {
      throw new Error(`Value ${value} out of range [${definition.min}, ${definition.max}]`);
    }
  }
  // Enum validation
  if (definition.validValues && !definition.validValues.includes(value)) {
    throw new Error(`Invalid value ${value}, must be one of: ${definition.validValues}`);
  }
  return true;
}
```

### 6. Memory Optimization
```javascript
// Circular buffer for monitoring-server.js:
class CircularBuffer {
  constructor(size = 1000) {
    this.buffer = new Array(size);
    this.head = 0;
    this.count = 0;
    this.maxSize = size;
  }

  push(item) {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.maxSize;
    this.count = Math.min(this.count + 1, this.maxSize);
  }
}
```

### 7. Socket.IO Optimization
```javascript
// Batched emission in StationAgent:
const batchedEmit = (() => {
  let batch = [];
  let timer = null;

  return (data) => {
    batch.push(data);
    if (!timer) {
      timer = setTimeout(() => {
        socket.emit('unified-metrics-batch', batch);
        batch = [];
        timer = null;
      }, 50); // 50ms batching window
    }
  };
})();
```

## Success Criteria

### Metrics Coverage
- Station 3: From 14 → 75 metrics (100% coverage)
- Station 9: From 15 → 75 metrics (100% coverage)
- Both stations visible continuously in API

### Knobs Coverage
- Station 3: From 8 → 113 knobs (100% coverage)
- Station 9: From 9 → 113 knobs (100% coverage)
- All knobs validated and persistent

### API Visibility
- Continuous data flow for both stations
- Complete snapshots every 200ms
- Historical data retention (1000 records)

## Testing Strategy

### Unit Tests
- Metric calculation accuracy
- Knob validation rules
- Configuration merging

### Integration Tests
- Socket.IO event flow
- API endpoint responses
- Configuration persistence

### Load Tests
- 5 metrics/second per station
- 1000+ concurrent API requests
- Memory usage under 500MB

## Rollback Plan

### Configuration Backup
- Snapshot current working configs
- Store in `/tmp/monitoring-backup-{timestamp}/`
- One-command restore capability

### Gradual Rollout
1. Deploy to Station 3 first (lower risk)
2. Monitor for 24 hours
3. Deploy to Station 9
4. Full rollback if issues detected

## Files to Modify (Summary)

### Core Files (Must Modify):
1. `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/station3-handler.js`
2. `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/station9-handler.js`
3. `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/unified-75-metrics-collector.js`
4. `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/config-factory-defaults.js`
5. `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/monitoring/StationAgent.js`
6. `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/monitoring/config/station-parameter-map.js`

### New Files to Create:
1. `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/knob-validator.js`
2. `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/knob-persistence.js`
3. `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/metrics-calculator.js`
4. `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/audio-processing-pipeline.js`
5. `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/dsp-processors/agc-processor.js`
6. `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/dsp-processors/nr-processor.js`
7. `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/dsp-processors/compressor-processor.js`

## Effort Estimation

### Total Estimated Effort: 80-100 hours

**Priority 1 (Critical - 16 hours):**
- Station 9 periodic collection: 2 hours
- Enable all 75 metrics: 8 hours
- Basic metric calculations: 6 hours

**Priority 2 (Core - 32 hours):**
- Buffer metrics implementation: 8 hours
- Network/packet metrics: 8 hours
- Audio quality calculations: 8 hours
- Testing & validation: 8 hours

**Priority 3 (Enhancement - 40 hours):**
- DSP processors implementation: 16 hours
- Knob validation system: 8 hours
- Deepgram/TTS advanced params: 8 hours
- Integration testing: 8 hours

**Priority 4 (Optimization - 12 hours):**
- Memory optimization: 4 hours
- Socket.IO batching: 4 hours
- Dashboard updates: 4 hours

## Risk Assessment

### High Risk Items
1. **Performance Impact:** 5x increase in metrics could affect latency
   - Mitigation: Implement batching and tiered collection
2. **Memory Usage:** 75 metrics × 4 stations × 1000 records = 300K data points
   - Mitigation: Circular buffer and compression
3. **DSP Processing:** Real-time audio processing overhead
   - Mitigation: Optional bypass mode, CPU monitoring

### Medium Risk Items
1. **Backward Compatibility:** Existing dashboards may break
   - Mitigation: Versioned API endpoints
2. **Configuration Complexity:** 113 knobs increase error potential
   - Mitigation: Validation and rollback mechanisms
3. **Socket.IO Load:** Increased message frequency
   - Mitigation: Message batching and compression

### Low Risk Items
1. **Documentation:** Keeping docs in sync
2. **Training:** Operators need to understand new knobs
3. **Monitoring:** Dashboard may need UI redesign

## Expected Outcomes

After implementation:
- **Metrics Coverage:** 14-15 → 75 metrics per station (400% increase)
- **Knobs Coverage:** 8-9 → 113 knobs per station (1200% increase)
- **API Visibility:** Continuous data for all stations
- **Audio Quality:** Measurable improvements via DSP processing
- **Operational Insight:** Complete pipeline visibility

## Next Steps

1. **Immediate Action:** Fix Station 9 periodic collection (2 hours)
2. **Quick Win:** Enable all 75 metrics in configuration (4 hours)
3. **Progressive Enhancement:** Implement metrics calculations batch by batch
4. **Final Polish:** Add DSP processors and advanced knobs

## Implementation Timeline

- **Week 1:** Priority 1 items - Foundation and critical fixes
- **Week 2-3:** Priority 2 items - Core metrics implementation
- **Week 4-5:** Priority 3 items - Knobs expansion and DSP
- **Week 6:** Priority 4 items - Optimization and polish

## Monitoring Dashboard Impact

The dashboard will need updates to handle:
- 5x increase in data volume
- New metric categories (packet, DSP, custom)
- 113 knobs configuration interface
- Real-time DSP processor status
- Alert threshold management

## Documentation Requirements

1. **API Documentation:** Update with new metrics and knobs
2. **Operator Guide:** How to use 113 knobs effectively
3. **Troubleshooting Guide:** Common issues with expanded monitoring
4. **Performance Tuning:** Optimization strategies for high-volume metrics

---

**Document Version:** 1.0
**Author:** Claude Code Assistant
**Date:** December 11, 2024
**Status:** Approved for Implementation
**Review Date:** After Phase 1 Completion

This plan will transform the monitoring system from 19% coverage to 100% coverage, providing complete visibility into the translation pipeline performance with sophisticated control over audio processing parameters.