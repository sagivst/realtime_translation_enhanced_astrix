# Enhanced Knobs Remediation Plan - Full Specification Coverage
## Based on Unified Metrics & Knobs Specification (140-200 knobs total)

## Executive Summary
Current system utilizes only **~5% of designed capability** (7 active knobs out of 140-200 specified). This plan addresses the full specification scope.

## Gap Analysis - Specification vs Implementation

### Current State
- **Knobs in Registry**: 71 (35-50% of specification)
- **Knobs Used by AI**: 7 (3.5-5% of specification)
- **Missing Categories**: 70-130 knobs not implemented

### Missing Knob Categories (Per Specification)

#### 1. Threshold Knobs (30-40 missing)
Each metric should have:
- `{metric}.threshold_low`
- `{metric}.threshold_high`
- `{metric}.threshold_critical`

Currently missing for most metrics.

#### 2. Temporal Control Knobs (20-30 missing)
- `{metric}.window_size_ms`
- `{metric}.sample_rate_hz`
- `{metric}.aggregation_interval_s`

#### 3. RTP/Network Knobs (15-20 missing)
```
rtp.jitter_buffer.min_delay_ms
rtp.jitter_buffer.max_delay_ms
rtp.jitter_buffer.target_delay_ms
rtp.packet_loss.concealment_strategy
rtp.redundancy.enabled
rtp.redundancy.offset_ms
```

#### 4. Asterisk Channel Knobs (10-15 missing)
```
asterisk.channel.echo_cancellation
asterisk.channel.gain_control
asterisk.channel.noise_suppression
asterisk.dtmf.detection_threshold
asterisk.dtmf.duration_ms
```

#### 5. STT/TTS Knobs (20-25 missing)
```
stt.confidence_threshold
stt.language_model_weight
stt.acoustic_model_weight
stt.vad_aggressiveness
tts.voice_selection
tts.pitch_adjustment
tts.speed_factor
tts.prosody_style
```

## Phase 1: Critical Foundation (Week 1)

### 1.1 Enable Core Processors
```javascript
// In KnobsRegistry.js, change defaults:
"agc.enabled": { default: true },           // Currently false
"compressor.enabled": { default: true },    // Currently false
"noise_reduction.enabled": { default: true } // Currently false
```

### 1.2 Fix Name Mappings
Map AI Optimizer names to registry:
```javascript
const knobNameMapping = {
  // AI Optimizer -> Registry mapping
  "input_gain": "pcm.input_gain_db",
  "output_gain": "pcm.output_gain_db",
  "noise_gate_threshold": "noise_gate.threshold_dbfs",
  "agc_target": "agc.target_level_dbfs",
  "compressor_threshold": "compressor.threshold_dbfs",
  "compressor_ratio": "compressor.ratio",
  "vad_sensitivity": "vad.sensitivity"
};
```

### 1.3 Add Missing Critical Knobs (10 essential)
```javascript
// Add to KnobsRegistry.js
"pcm.clipping_threshold_dbfs": {
  type: "float",
  min: -12, max: 0, default: -3,
  description: "Clipping detection threshold"
},
"buffer.target_depth_ms": {
  type: "int",
  min: 20, max: 200, default: 60,
  description: "Target buffer depth"
},
"latency.max_acceptable_ms": {
  type: "int",
  min: 50, max: 500, default: 150,
  description: "Maximum acceptable latency"
}
// ... 7 more critical knobs
```

## Phase 2: Threshold System (Week 2)

### 2.1 Implement Metric Thresholds
For each of the 61 active metrics, add 3 threshold knobs:
```javascript
// Template for each metric
"{metric}.threshold_warning": { type: "float", ... },
"{metric}.threshold_critical": { type: "float", ... },
"{metric}.threshold_action": { type: "enum", values: ["log", "alert", "adjust"], ... }
```

### 2.2 Create Threshold Manager
```javascript
class ThresholdManager {
  checkThresholds(metric, value) {
    const warning = this.knobs[`${metric}.threshold_warning`];
    const critical = this.knobs[`${metric}.threshold_critical`];
    const action = this.knobs[`${metric}.threshold_action`];

    if (value > critical) {
      this.executeAction(action, "critical", metric, value);
    } else if (value > warning) {
      this.executeAction(action, "warning", metric, value);
    }
  }
}
```

## Phase 3: Network/RTP Knobs (Week 3)

### 3.1 Add RTP Control Knobs
```javascript
// Jitter buffer control
"rtp.jitter_buffer.enabled": { type: "bool", default: true },
"rtp.jitter_buffer.min_delay_ms": { type: "int", min: 0, max: 100, default: 20 },
"rtp.jitter_buffer.max_delay_ms": { type: "int", min: 100, max: 500, default: 200 },
"rtp.jitter_buffer.adaptive": { type: "bool", default: true },

// Packet loss concealment
"rtp.plc.enabled": { type: "bool", default: true },
"rtp.plc.strategy": { type: "enum", values: ["interpolate", "repeat", "silence"], default: "interpolate" },

// Network adaptation
"rtp.adaptive_bitrate": { type: "bool", default: true },
"rtp.target_bitrate_kbps": { type: "int", min: 8, max: 128, default: 64 }
```

### 3.2 Implement RTP Handlers
Update Station3Handler to process RTP knobs:
```javascript
if (ctx.protocol === 'RTP') {
  this.applyRTPKnobs(packet, knobs);
}
```

## Phase 4: STT/TTS Integration (Week 4)

### 4.1 Add STT/TTS Knobs
```javascript
// Speech-to-Text knobs
"stt.engine": { type: "enum", values: ["google", "azure", "aws"], default: "google" },
"stt.language": { type: "string", default: "en-US" },
"stt.confidence_threshold": { type: "float", min: 0, max: 1, default: 0.7 },
"stt.enable_punctuation": { type: "bool", default: true },
"stt.enable_word_timing": { type: "bool", default: false },
"stt.max_alternatives": { type: "int", min: 1, max: 5, default: 1 },

// Text-to-Speech knobs
"tts.engine": { type: "enum", values: ["google", "azure", "aws"], default: "google" },
"tts.voice": { type: "string", default: "en-US-Standard-B" },
"tts.speed_factor": { type: "float", min: 0.5, max: 2.0, default: 1.0 },
"tts.pitch_factor": { type: "float", min: 0.5, max: 2.0, default: 1.0 },
"tts.volume_gain_db": { type: "float", min: -20, max: 20, default: 0 }
```

### 4.2 Create STT/TTS Knob Handler
```javascript
class STTTTSKnobHandler {
  applySTTKnobs(audioStream, knobs) {
    const config = {
      language: knobs["stt.language"],
      confidenceThreshold: knobs["stt.confidence_threshold"],
      enablePunctuation: knobs["stt.enable_punctuation"]
    };
    return this.sttEngine.process(audioStream, config);
  }
}
```

## Phase 5: Asterisk Integration (Week 5)

### 5.1 Add Asterisk Channel Knobs
```javascript
"asterisk.echo_cancellation": { type: "bool", default: true },
"asterisk.echo_tail_length_ms": { type: "int", min: 32, max: 256, default: 128 },
"asterisk.comfort_noise": { type: "bool", default: true },
"asterisk.dtmf.detection": { type: "bool", default: true },
"asterisk.dtmf.threshold_db": { type: "float", min: -40, max: -10, default: -25 },
"asterisk.aec.nlp_mode": { type: "enum", values: ["off", "low", "medium", "high"], default: "medium" }
```

## Phase 6: AI Optimizer Enhancement (Week 6)

### 6.1 Expand AI Knob Usage
Update AI Optimizer to use all 140-200 knobs:

```javascript
// In ai-service/services/optimizer.js
const OPTIMIZATION_KNOBS = {
  // Current 7 knobs
  ...existingKnobs,

  // Add processor controls (15 knobs)
  "agc.enabled": true,
  "agc.target_level_dbfs": true,
  "agc.max_gain_db": true,
  "compressor.enabled": true,
  "compressor.threshold_dbfs": true,
  "compressor.ratio": true,
  "compressor.attack_ms": true,
  "compressor.release_ms": true,

  // Add threshold controls (30 knobs)
  "amplitude_peak.threshold_warning": true,
  "amplitude_peak.threshold_critical": true,
  "latency_ms.threshold_warning": true,
  "latency_ms.threshold_critical": true,
  // ... more thresholds

  // Add network controls (10 knobs)
  "rtp.jitter_buffer.target_delay_ms": true,
  "rtp.adaptive_bitrate": true,

  // Add STT/TTS controls (10 knobs)
  "stt.confidence_threshold": true,
  "tts.speed_factor": true
};
```

### 6.2 Implement Feedback Loop
```javascript
class KnobFeedbackLoop {
  async evaluateKnobEffectiveness(knobName, oldValue, newValue, metrics) {
    const improvement = this.calculateImprovement(metrics);

    if (improvement < 0) {
      // Revert if metrics got worse
      await this.revertKnob(knobName, oldValue);
    } else {
      // Record successful adjustment
      await this.recordSuccess(knobName, improvement);
    }
  }
}
```

## Phase 7: Temporal Controls (Week 7)

### 7.1 Add Window/Aggregation Knobs
```javascript
"metrics.window_size_ms": { type: "int", min: 100, max: 10000, default: 1000 },
"metrics.aggregation_interval_s": { type: "int", min: 1, max: 60, default: 5 },
"metrics.sliding_window": { type: "bool", default: false },
"metrics.overlap_percent": { type: "int", min: 0, max: 50, default: 0 }
```

### 7.2 Implement Temporal Processing
```javascript
class TemporalProcessor {
  processWithWindow(samples, windowSizeMs, overlapPercent) {
    const windowSize = (windowSizeMs * this.sampleRate) / 1000;
    const hopSize = windowSize * (1 - overlapPercent / 100);
    // Process with configurable windowing
  }
}
```

## Testing Strategy

### Unit Tests (per phase)
```bash
# Test knob validation
npm test -- --grep "knob validation"

# Test threshold system
npm test -- --grep "threshold"

# Test AI optimizer expansion
npm test -- --grep "optimizer knobs"
```

### Integration Tests
```bash
# Make test call with all processors enabled
./test_full_processing.sh

# Verify knob application
curl http://20.170.155.53:3020/api/knobs/verify
```

### Load Tests
```bash
# Test with 200 knobs active
./load_test_knobs.sh --knobs 200 --duration 300
```

## Rollback Plan

### Per-Phase Rollback
Each phase has isolated changes:
```bash
# Phase 1 rollback
cp KnobsRegistry.js.backup-20260119 KnobsRegistry.js
pm2 restart STTTSserver

# Phase 2 rollback
git checkout -- threshold_manager.js
pm2 restart STTTSserver
```

## Success Metrics

### Phase 1 Success (Week 1)
- ✅ All 3 processors enabled and working
- ✅ AI using 25+ knobs (up from 7)
- ✅ No performance degradation

### Phase 2 Success (Week 2)
- ✅ 180+ threshold knobs implemented
- ✅ Automatic alerts on threshold violations
- ✅ Threshold-based auto-adjustments working

### Full Implementation Success (Week 7)
- ✅ 140-200 knobs active (per specification)
- ✅ AI Optimizer using 100+ knobs
- ✅ All processor categories functional
- ✅ Feedback loop preventing bad adjustments
- ✅ System stability maintained

## Risk Mitigation

### Performance Risk
- Add knob categories gradually
- Monitor CPU/memory per phase
- Implement circuit breakers

### Stability Risk
- Test each phase for 24 hours
- Keep backups of all changes
- Implement gradual rollout

### Database Risk
- Monitor foreign key violations
- Implement batch inserts for knob updates
- Add connection pooling for increased load

## Resource Requirements

### Development
- 1 developer full-time for 7 weeks
- Access to test environment
- Database admin for schema updates

### Infrastructure
- Additional 2GB RAM for expanded processing
- 50GB storage for extended metrics
- Increased database connections (10 → 20)

## Timeline Summary

| Week | Phase | Knobs Added | Total Active |
|------|-------|-------------|--------------|
| 1 | Foundation | 10 | 17 |
| 2 | Thresholds | 180 | 197 |
| 3 | Network/RTP | 20 | 217 |
| 4 | STT/TTS | 15 | 232 |
| 5 | Asterisk | 10 | 242 |
| 6 | AI Enhancement | 0 (usage) | 242 |
| 7 | Temporal | 8 | 250 |

## Conclusion
This enhanced plan addresses the full 140-200 knob specification, expanding from current 5% utilization to 100% over 7 weeks. Each phase is independently valuable and can be rolled back if needed.

---
*Plan Created: 2026-01-21*
*Based on: Unified Metrics & Knobs Specification*
*Current State: 7/200 knobs active (3.5%)*
*Target State: 200/200 knobs active (100%)*