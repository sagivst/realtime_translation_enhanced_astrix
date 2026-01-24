# 🎛️ DETAILED KNOBS UPDATE PLAN
**Date**: 2026-01-13
**Target**: Update KnobsRegistry.js from 74 → 200 knobs

## PHASE 1: KnobsRegistry.js Update (Master Source)

### 1.1 Current Knobs Analysis (74 existing)

#### ✅ Currently Implemented Categories:
```
PCM Audio (3): input_gain_db, output_gain_db, target_level_dbfs
AGC (5): enabled, target_level_dbfs, max_gain_db, attack_ms, release_ms
Compression (6): enabled, threshold_dbfs, ratio, attack_ms, release_ms, makeup_gain_db
Limiting (5): enabled, threshold_dbfs, release_ms, lookahead_ms, soft_knee
Noise Gate (5): enabled, threshold_dbfs, attack_ms, hold_ms, release_ms
Noise Reduction (5): enabled, strength, learning_rate, preserve_voice_threshold, spectral_subtraction_factor
EQ (8): enabled, low_shelf_freq_hz, low_shelf_gain_db, mid_freq_hz, mid_gain_db, mid_q, high_shelf_freq_hz, high_shelf_gain_db
Filters (4): highpass.enabled, highpass.cutoff_hz, lowpass.enabled, lowpass.cutoff_hz
Echo/AEC (4): enabled, tail_length_ms, convergence_speed, suppression_level
Feedback (4): suppression_enabled, notch_q, max_notches, reaction_time_ms
Voice (5): enhancement_mode, frequency_boost, de_esser_threshold, de_esser_frequency, de_esser_reduction
Monitoring (5): metrics_enabled, audio_capture_enabled, pre_tap_enabled, post_tap_enabled, fft_analysis_enabled
Safety (5): max_output_level_dbfs, min_output_level_dbfs, clipping_protection, emergency_mute, emergency_boost
AI Control (3): optimization_allowed, max_adjustment_percent, rollback_on_failure
Channel/Codec (4): media_timeout, silence_threshold, allowed_codecs, preferred_codec
Jitter Buffer (6): enabled, type, size_ms, target_delay_ms, max_delay_ms, resync_threshold
Smoothing (3): enabled, type, window_ms
```

### 1.2 Missing Knobs to Add (126 new)

#### 🆕 Per-Metric Threshold Knobs (40 knobs)
For critical metrics, add threshold and control knobs:

```javascript
// For RMS level
"pcm.rms_dbfs.warn_threshold": {
  description: "Warning threshold for RMS level",
  type: "float",
  min: -60,
  max: 0,
  default: -6,
  unit: "dBFS",
  liveApply: true,
  appliesAt: "MONITORING"
},

"pcm.rms_dbfs.error_threshold": {
  description: "Error threshold for RMS level",
  type: "float",
  min: -60,
  max: 0,
  default: -3,
  unit: "dBFS",
  liveApply: true,
  appliesAt: "MONITORING"
},

"pcm.rms_dbfs.optimal_min": {
  description: "Optimal minimum RMS level",
  type: "float",
  min: -60,
  max: 0,
  default: -30,
  unit: "dBFS",
  liveApply: true,
  appliesAt: "MONITORING"
},

"pcm.rms_dbfs.optimal_max": {
  description: "Optimal maximum RMS level",
  type: "float",
  min: -60,
  max: 0,
  default: -12,
  unit: "dBFS",
  liveApply: true,
  appliesAt: "MONITORING"
},

// Similar patterns for:
// - silence_duration_ms (4 knobs)
// - clipping_ratio (4 knobs)
// - signal_to_noise_ratio (4 knobs)
// - latency_estimated (4 knobs)
// - buffer_underrun_events (4 knobs)
// - audio_health_score (4 knobs)
// - speech_quality_index (4 knobs)
// - noise_risk_index (4 knobs)
// - stt_readiness_score (4 knobs)
```

#### 🆕 Temporal Control Knobs (30 knobs)
Time-based controls for metric processing:

```javascript
"metrics.smoothing_window_ms": {
  description: "Global metrics smoothing window",
  type: "integer",
  min: 10,
  max: 5000,
  default: 1000,
  unit: "ms",
  liveApply: true,
  appliesAt: "MONITORING"
},

"metrics.debounce_time_ms": {
  description: "Debounce time for metric alerts",
  type: "integer",
  min: 0,
  max: 10000,
  default: 500,
  unit: "ms",
  liveApply: true,
  appliesAt: "MONITORING"
},

"metrics.grace_period_ms": {
  description: "Grace period before triggering alerts",
  type: "integer",
  min: 0,
  max: 60000,
  default: 2000,
  unit: "ms",
  liveApply: true,
  appliesAt: "MONITORING"
},

"pcm.attack_time_ms": {
  description: "Attack time for PCM processing",
  type: "float",
  min: 0.1,
  max: 100,
  default: 10,
  unit: "ms",
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"pcm.release_time_ms": {
  description: "Release time for PCM processing",
  type: "float",
  min: 1,
  max: 1000,
  default: 100,
  unit: "ms",
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

// Similar patterns for:
// - silence detection timing (5 knobs)
// - clipping detection timing (5 knobs)
// - noise analysis timing (5 knobs)
// - buffer management timing (5 knobs)
// - health check intervals (5 knobs)
```

#### 🆕 Advanced Audio Processing Knobs (20 knobs)

```javascript
"pcm.reference_level_dbfs": {
  description: "Reference level for calculations",
  type: "float",
  min: -60,
  max: 0,
  default: -20,
  unit: "dBFS",
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"pcm.normalize_enabled": {
  description: "Enable PCM normalization",
  type: "boolean",
  default: false,
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"pcm.dc_removal_enabled": {
  description: "Enable DC offset removal",
  type: "boolean",
  default: true,
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"pcm.pre_emphasis_enabled": {
  description: "Enable pre-emphasis filter",
  type: "boolean",
  default: false,
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"pcm.pre_emphasis_coefficient": {
  description: "Pre-emphasis coefficient",
  type: "float",
  min: 0,
  max: 1,
  default: 0.97,
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"agc.adaptation_rate": {
  description: "AGC adaptation rate",
  type: "float",
  min: 0.01,
  max: 1,
  default: 0.1,
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"agc.noise_gate_threshold": {
  description: "AGC noise gate threshold",
  type: "float",
  min: -80,
  max: -20,
  default: -50,
  unit: "dBFS",
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"compressor.knee_width": {
  description: "Compressor knee width",
  type: "float",
  min: 0,
  max: 20,
  default: 2,
  unit: "dB",
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"compressor.lookahead_ms": {
  description: "Compressor lookahead time",
  type: "float",
  min: 0,
  max: 20,
  default: 5,
  unit: "ms",
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

// Plus more advanced processing knobs...
```

#### 🆕 VAD & Speech Detection Knobs (16 knobs)

```javascript
"vad.enabled": {
  description: "Enable voice activity detection",
  type: "boolean",
  default: true,
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"vad.mode": {
  description: "VAD aggressiveness mode",
  type: "integer",
  min: 0,
  max: 3,
  default: 1,
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"vad.sensitivity": {
  description: "VAD sensitivity",
  type: "float",
  min: 0,
  max: 1,
  default: 0.5,
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"vad.speech_threshold": {
  description: "Speech detection threshold",
  type: "float",
  min: 0,
  max: 1,
  default: 0.3,
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"vad.hangover_ms": {
  description: "VAD hangover time",
  type: "integer",
  min: 0,
  max: 2000,
  default: 300,
  unit: "ms",
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"vad.pre_buffer_ms": {
  description: "VAD pre-buffer time",
  type: "integer",
  min: 0,
  max: 500,
  default: 100,
  unit: "ms",
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"vad.min_speech_duration_ms": {
  description: "Minimum speech duration",
  type: "integer",
  min: 50,
  max: 1000,
  default: 200,
  unit: "ms",
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"vad.max_silence_duration_ms": {
  description: "Maximum silence in speech",
  type: "integer",
  min: 100,
  max: 5000,
  default: 1000,
  unit: "ms",
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

// Plus 8 more VAD-related knobs...
```

#### 🆕 Extended EQ & Filter Knobs (20 knobs)

```javascript
"eq.parametric_1.enabled": {
  description: "Enable parametric EQ band 1",
  type: "boolean",
  default: false,
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"eq.parametric_1.freq_hz": {
  description: "Parametric EQ 1 frequency",
  type: "float",
  min: 20,
  max: 20000,
  default: 100,
  unit: "Hz",
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"eq.parametric_1.gain_db": {
  description: "Parametric EQ 1 gain",
  type: "float",
  min: -24,
  max: 24,
  default: 0,
  unit: "dB",
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"eq.parametric_1.q": {
  description: "Parametric EQ 1 Q factor",
  type: "float",
  min: 0.1,
  max: 20,
  default: 1,
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

// Repeat for parametric_2 through parametric_5 (16 knobs total)

"filter.notch.enabled": {
  description: "Enable notch filter",
  type: "boolean",
  default: false,
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"filter.notch.freq_hz": {
  description: "Notch filter frequency",
  type: "float",
  min: 20,
  max: 20000,
  default: 60,
  unit: "Hz",
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"filter.notch.q": {
  description: "Notch filter Q factor",
  type: "float",
  min: 0.1,
  max: 100,
  default: 10,
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
},

"filter.bandpass.enabled": {
  description: "Enable bandpass filter",
  type: "boolean",
  default: false,
  liveApply: true,
  appliesAt: "PRE_PROCESSING"
}
```

## PHASE 2: Update Station3 Handlers with Knobs Lists

### 2.1 Station3_3333_Handler.js Updates

#### NEW: Add applicableKnobs array (83 PCM-relevant knobs):
```javascript
export const Station3_3333_Handler = {
  stationKey: "St_3_3333",
  stationGroup: "STTTTS_PCM_INGRESS",

  // Existing metrics arrays...
  preMetrics: [ /* ... */ ],
  postMetrics: [ /* ... */ ],

  // NEW: PCM-applicable knobs (just names)
  applicableKnobs: [
    // === PCM Audio (3) ===
    "pcm.input_gain_db",
    "pcm.output_gain_db",
    "pcm.target_level_dbfs",
    "pcm.reference_level_dbfs",
    "pcm.normalize_enabled",
    "pcm.dc_removal_enabled",
    "pcm.pre_emphasis_enabled",
    "pcm.pre_emphasis_coefficient",

    // === AGC (8) ===
    "agc.enabled",
    "agc.target_level_dbfs",
    "agc.max_gain_db",
    "agc.attack_ms",
    "agc.release_ms",
    "agc.adaptation_rate",
    "agc.noise_gate_threshold",

    // === Compression (10) ===
    "compressor.enabled",
    "compressor.threshold_dbfs",
    "compressor.ratio",
    "compressor.attack_ms",
    "compressor.release_ms",
    "compressor.makeup_gain_db",
    "compressor.knee_width",
    "compressor.lookahead_ms",

    // === Limiting (5) ===
    "limiter.enabled",
    "limiter.threshold_dbfs",
    "limiter.release_ms",
    "limiter.lookahead_ms",
    "limiter.soft_knee",

    // === Noise Gate (5) ===
    "noise_gate.enabled",
    "noise_gate.threshold_dbfs",
    "noise_gate.attack_ms",
    "noise_gate.hold_ms",
    "noise_gate.release_ms",

    // === Noise Reduction (5) ===
    "noise_reduction.enabled",
    "noise_reduction.strength",
    "noise_reduction.learning_rate",
    "noise_reduction.preserve_voice_threshold",
    "noise_reduction.spectral_subtraction_factor",

    // === VAD (8) ===
    "vad.enabled",
    "vad.mode",
    "vad.sensitivity",
    "vad.speech_threshold",
    "vad.hangover_ms",
    "vad.pre_buffer_ms",
    "vad.min_speech_duration_ms",
    "vad.max_silence_duration_ms",

    // === EQ (8) ===
    "eq.enabled",
    "eq.low_shelf_freq_hz",
    "eq.low_shelf_gain_db",
    "eq.mid_freq_hz",
    "eq.mid_gain_db",
    "eq.mid_q",
    "eq.high_shelf_freq_hz",
    "eq.high_shelf_gain_db",

    // === Filters (4) ===
    "highpass.enabled",
    "highpass.cutoff_hz",
    "lowpass.enabled",
    "lowpass.cutoff_hz",

    // === Echo/AEC (4) ===
    "aec.enabled",
    "aec.tail_length_ms",
    "aec.convergence_speed",
    "aec.suppression_level",

    // === Feedback (4) ===
    "feedback.suppression_enabled",
    "feedback.notch_q",
    "feedback.max_notches",
    "feedback.reaction_time_ms",

    // === Voice Enhancement (5) ===
    "voice.enhancement_mode",
    "voice.frequency_boost",
    "voice.de_esser_threshold",
    "voice.de_esser_frequency",
    "voice.de_esser_reduction",

    // === Monitoring (5) ===
    "monitoring.metrics_enabled",
    "monitoring.audio_capture_enabled",
    "monitoring.pre_tap_enabled",
    "monitoring.post_tap_enabled",
    "monitoring.fft_analysis_enabled",

    // === Safety (5) ===
    "safety.max_output_level_dbfs",
    "safety.min_output_level_dbfs",
    "safety.clipping_protection",
    "safety.emergency_mute",
    "safety.emergency_boost",

    // === AI Control (3) - CRITICAL ===
    "ai.optimization_allowed",
    "ai.max_adjustment_percent",
    "ai.rollback_on_failure"
  ]
}
```

### 2.2 Station3_4444_Handler.js
- Identical applicableKnobs array

## PHASE 3: Update St_Handler_Generic.js

### 3.1 Add Knob Filtering Logic
```javascript
// Current (line 97):
const knobs = this.knobsResolver.getEffectiveKnobs(ctx);

// Change to:
const allKnobs = this.knobsResolver.getEffectiveKnobs(ctx);

// Filter to station's applicable knobs (like metrics)
let knobs = allKnobs;  // Default to all if no filter

if (stationHandler.applicableKnobs && Array.isArray(stationHandler.applicableKnobs)) {
  knobs = {};
  for (const knobKey of stationHandler.applicableKnobs) {
    if (allKnobs[knobKey] !== undefined) {
      knobs[knobKey] = allKnobs[knobKey];
    }
  }

  // Log filtering
  console.log(`[St_Handler_Generic] Filtered knobs for ${ctx.station_key}: ${Object.keys(knobs).length}/${Object.keys(allKnobs).length}`);
}
```

## PHASE 4: Implementation Summary

### 4.1 Files to Create/Update:
| File | Current | New | Changes |
|------|---------|-----|---------|
| KnobsRegistry.js | 879 lines (74 knobs) | ~2,000 lines (200 knobs) | +126 knobs |
| Station3_3333_Handler.js | 79 lines | ~180 lines | +applicableKnobs array |
| Station3_4444_Handler.js | 79 lines | ~180 lines | +applicableKnobs array |
| St_Handler_Generic.js | ~450 lines | ~460 lines | +knob filtering logic |

### 4.2 New Knob Categories Summary:
```
Per-Metric Thresholds: 40 knobs
Temporal Controls: 30 knobs
Advanced Audio: 20 knobs
VAD & Speech: 16 knobs
Extended EQ: 20 knobs
Total New: 126 knobs
```

### 4.3 Architecture Pattern:
```
KnobsRegistry.js (200 knobs with full definitions)
          ↓
KnobsResolver (makes all available)
          ↓
Station Handler (declares applicable list)
          ↓
Generic Handler (filters to applicable)
          ↓
Apply only relevant knobs
```

## PHASE 5: Testing & Validation

### 5.1 Validation Script:
```javascript
// knobs_validation.js
const KnobsRegistry = require('./Updated_KnobsRegistry');
const Station3_3333 = require('./Updated_Station3_3333_Handler');

// Validate all station knobs exist in registry
for (const knob of Station3_3333.applicableKnobs) {
  if (!KnobsRegistry[knob]) {
    console.error(`Missing knob: ${knob}`);
  }
}

console.log(`Total knobs in registry: ${Object.keys(KnobsRegistry).length}`);
console.log(`Station3 applicable: ${Station3_3333.applicableKnobs.length}`);
console.log(`Coverage: ${(Station3_3333.applicableKnobs.length / Object.keys(KnobsRegistry).length * 100).toFixed(1)}%`);
```

### 5.2 Deployment Commands:
```bash
# Backup
scp azureuser@20.170.155.53:/path/to/KnobsRegistry.js ./backup/
scp azureuser@20.170.155.53:/path/to/Station3_3333_Handler.js ./backup/
scp azureuser@20.170.155.53:/path/to/Station3_4444_Handler.js ./backup/
scp azureuser@20.170.155.53:/path/to/St_Handler_Generic.js ./backup/

# Deploy
scp Updated_KnobsRegistry.js azureuser@20.170.155.53:/path/to/KnobsRegistry.js
scp Updated_Station3_3333_Handler.js azureuser@20.170.155.53:/path/to/Station3_3333_Handler.js
scp Updated_Station3_4444_Handler.js azureuser@20.170.155.53:/path/to/Station3_4444_Handler.js
scp Updated_St_Handler_Generic.js azureuser@20.170.155.53:/path/to/St_Handler_Generic.js

# Reload
ssh azureuser@20.170.155.53 "pm2 reload all"
```

## ✅ Success Criteria:
1. KnobsRegistry has exactly 200 knobs
2. All knobs have proper structure (type, default, description)
3. Station3 handlers have 83 PCM-applicable knobs listed
4. St_Handler_Generic filters knobs correctly
5. All Station3 knobs exist in KnobsRegistry
6. System continues to operate normally

## 🚀 Ready to Implement?

This plan will:
- Add 126 new knobs to reach 200 total (100% coverage)
- Update Station3 to declare PCM-applicable knobs (83 knobs)
- Add knob filtering to Generic Handler (like metrics)
- Maintain exact current format and architecture
- Keep knobs working exactly like metrics (station declares, generic filters)

**Both plans (Metrics & Knobs) are now ready for implementation!**