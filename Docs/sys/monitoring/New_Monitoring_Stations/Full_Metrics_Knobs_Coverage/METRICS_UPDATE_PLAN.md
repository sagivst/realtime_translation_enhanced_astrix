# 📊 DETAILED METRICS UPDATE PLAN
**Date**: 2026-01-13
**Target**: Update MetricsRegistry.js from 73 → 120 metrics

## PHASE 1: MetricsRegistry.js Update (Master Source)

### 1.1 Current Metrics Analysis (73 existing)

#### ✅ Currently Implemented:
```
PCM Audio (14): peak_amplitude, peak_to_peak_amplitude, rms_dbfs, average_absolute_amplitude,
                dbfs_instant, dbfs_short_term, dbfs_integrated, lufs_momentary,
                lufs_short_term, lufs_integrated, crest_factor, dynamic_range,
                headroom, silence_floor_level

Silence (8): silence_detected, silence_duration_ms, speech_activity_ratio,
             vad_probability, speech_segments_count, average_speech_segment_length,
             average_silence_gap_length, initial_speech_onset_latency

Clipping (8): clipped_samples_count, clipping_ratio, consecutive_clipped_frames,
              hard_clipping_detection, soft_clipping_detection, distortion_index,
              overdrive_duration, clipping_risk_index

Noise (9): noise_floor_dbfs, signal_to_noise_ratio, estimated_background_noise,
           broadband_noise_level, hum_detection, hiss_detection,
           audio_dropout_detection, muted_signal_detection, frozen_signal_detection

Temporal (6): frame_duration_ms, frame_rate, inter_frame_jitter,
              frame_timestamp_drift, time_since_last_valid_frame, audio_freeze_duration

Stream (8): sample_rate_actual, bit_depth, endianness_validation, channel_count,
            channel_imbalance, frame_size_consistency, buffer_underrun_events,
            buffer_overrun_events

Transport (10): pcm_frames_per_second, dropped_frames, duplicated_frames,
                out_of_order_frames, ingress_latency_estimated, egress_latency_estimated,
                end_to_end_audio_latency_estimated, latency_jitter, queue_depth,
                backpressure_events

Health (6): audio_alive_heartbeat, last_audio_activity_timestamp,
            last_speech_timestamp, decoder_error_count, processing_exception_count,
            recovery_events_count

Composite (4): audio_health_score, speech_quality_index, noise_risk_index,
               stt_readiness_score
```

### 1.2 Missing Metrics to Add (47 new)

#### 🆕 Time-Domain Analysis (15 metrics):
```javascript
"zero_crossing_rate": {
  description: "Rate of signal zero crossings per second",
  type: "float",
  unit: "Hz",
  range: [0, 8000],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
},

"zero_crossing_variance": {
  description: "Variance in zero crossing rate",
  type: "float",
  unit: "Hz²",
  range: [0, 1000],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
},

"energy_envelope_variance": {
  description: "Variance in audio energy envelope",
  type: "float",
  unit: "ratio",
  range: [0, 1],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
},

"dc_offset": {
  description: "DC offset in audio signal",
  type: "float",
  unit: "ratio",
  range: [-1, 1],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
},

"dc_drift_rate": {
  description: "Rate of DC offset change",
  type: "float",
  unit: "ratio/s",
  range: [-0.1, 0.1],
  realtimeSafe: true,
  compute: (samples, ctx) => { /* implementation */ }
},

"channel_correlation": {
  description: "Cross-correlation between channels",
  type: "float",
  unit: "ratio",
  range: [-1, 1],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
},

"autocorrelation_peak": {
  description: "Peak autocorrelation value",
  type: "float",
  unit: "ratio",
  range: [0, 1],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
},

"attack_time": {
  description: "Time from silence to peak",
  type: "float",
  unit: "ms",
  range: [0, 1000],
  realtimeSafe: true,
  compute: (samples, ctx) => { /* implementation */ }
},

"decay_time": {
  description: "Time from peak to silence",
  type: "float",
  unit: "ms",
  range: [0, 5000],
  realtimeSafe: true,
  compute: (samples, ctx) => { /* implementation */ }
},

"transient_density": {
  description: "Number of transient events per second",
  type: "float",
  unit: "events/s",
  range: [0, 100],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
},

"pitch_estimate": {
  description: "Estimated fundamental frequency",
  type: "float",
  unit: "Hz",
  range: [50, 500],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
},

"pitch_confidence": {
  description: "Confidence in pitch detection",
  type: "float",
  unit: "ratio",
  range: [0, 1],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
},

"tempo_estimate": {
  description: "Detected tempo in BPM",
  type: "float",
  unit: "bpm",
  range: [0, 300],
  realtimeSafe: false,
  compute: (samples) => { /* implementation */ }
},

"phase_coherence": {
  description: "Phase coherence between channels",
  type: "float",
  unit: "ratio",
  range: [0, 1],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
},

"phase_shift": {
  description: "Phase shift between channels",
  type: "float",
  unit: "degrees",
  range: [-180, 180],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
}
```

#### 🆕 Enhanced Buffer Metrics (5 metrics):
```javascript
"buffer_fill_ratio": {
  description: "Current buffer fill level",
  type: "float",
  unit: "ratio",
  range: [0, 1],
  realtimeSafe: true,
  compute: (samples, ctx) => { /* implementation */ }
},

"buffer_drain_rate": {
  description: "Rate of buffer consumption",
  type: "float",
  unit: "samples/s",
  range: [0, 48000],
  realtimeSafe: true,
  compute: (samples, ctx) => { /* implementation */ }
},

"buffer_starvation_events": {
  description: "Number of buffer starvation events",
  type: "integer",
  unit: "count",
  range: [0, null],
  realtimeSafe: true,
  compute: (samples, ctx) => { /* implementation */ }
},

"buffer_overflow_risk": {
  description: "Risk of buffer overflow",
  type: "float",
  unit: "ratio",
  range: [0, 1],
  realtimeSafe: true,
  compute: (samples, ctx) => { /* implementation */ }
},

"buffer_health_score": {
  description: "Overall buffer health",
  type: "float",
  unit: "score",
  range: [0, 100],
  realtimeSafe: true,
  compute: (samples, ctx) => { /* implementation */ }
}
```

#### 🆕 Session Metrics (5 metrics):
```javascript
"session_duration": {
  description: "Total session duration",
  type: "float",
  unit: "seconds",
  range: [0, null],
  realtimeSafe: true,
  compute: (samples, ctx) => { /* implementation */ }
},

"session_frames_total": {
  description: "Total frames in session",
  type: "integer",
  unit: "count",
  range: [0, null],
  realtimeSafe: true,
  compute: (samples, ctx) => { /* implementation */ }
},

"session_errors_total": {
  description: "Total errors in session",
  type: "integer",
  unit: "count",
  range: [0, null],
  realtimeSafe: true,
  compute: (samples, ctx) => { /* implementation */ }
},

"session_quality_average": {
  description: "Average session quality",
  type: "float",
  unit: "score",
  range: [0, 100],
  realtimeSafe: true,
  compute: (samples, ctx) => { /* implementation */ }
},

"session_stability_index": {
  description: "Session stability index",
  type: "float",
  unit: "ratio",
  range: [0, 1],
  realtimeSafe: true,
  compute: (samples, ctx) => { /* implementation */ }
}
```

#### 🆕 STT Readiness Metrics (7 metrics):
```javascript
"stt.audio_clarity": {
  description: "Audio clarity for STT",
  type: "float",
  unit: "score",
  range: [0, 100],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
},

"stt.noise_interference": {
  description: "Noise interference level",
  type: "float",
  unit: "ratio",
  range: [0, 1],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
},

"stt.speech_presence": {
  description: "Speech presence probability",
  type: "float",
  unit: "ratio",
  range: [0, 1],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
},

"stt.optimal_level_distance": {
  description: "Distance from optimal STT level",
  type: "float",
  unit: "dB",
  range: [0, 60],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
},

"stt.preprocessing_benefit": {
  description: "Benefit from preprocessing",
  type: "float",
  unit: "ratio",
  range: [0, 1],
  realtimeSafe: true,
  compute: (samples, ctx) => { /* implementation */ }
},

"stt.confidence_prediction": {
  description: "Predicted STT confidence",
  type: "float",
  unit: "ratio",
  range: [0, 1],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
},

"stt.chunk_readiness": {
  description: "Chunk ready for STT",
  type: "boolean",
  unit: "bool",
  range: [0, 1],
  realtimeSafe: true,
  compute: (samples, ctx) => { /* implementation */ }
}
```

#### 🆕 Statistical Metrics (5 metrics):
```javascript
"kurtosis": {
  description: "Statistical kurtosis of audio",
  type: "float",
  unit: "ratio",
  range: [-10, 10],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
},

"skewness": {
  description: "Statistical skewness of audio",
  type: "float",
  unit: "ratio",
  range: [-10, 10],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
},

"entropy": {
  description: "Shannon entropy of signal",
  type: "float",
  unit: "bits",
  range: [0, 16],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
},

"variance": {
  description: "Signal variance",
  type: "float",
  unit: "ratio²",
  range: [0, 1],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
},

"median_amplitude": {
  description: "Median amplitude value",
  type: "float",
  unit: "ratio",
  range: [0, 1],
  realtimeSafe: true,
  compute: (samples) => { /* implementation */ }
}
```

#### 🆕 Spectral Placeholders (10 metrics - for future FFT):
```javascript
"spectral.dominant_frequency": {
  description: "Dominant frequency (requires FFT)",
  type: "float",
  unit: "Hz",
  range: [0, 8000],
  realtimeSafe: false,
  compute: () => 0  // Placeholder
},

"spectral.centroid": {
  description: "Spectral centroid (requires FFT)",
  type: "float",
  unit: "Hz",
  range: [0, 8000],
  realtimeSafe: false,
  compute: () => 0  // Placeholder
},

"spectral.bandwidth": {
  description: "Spectral bandwidth (requires FFT)",
  type: "float",
  unit: "Hz",
  range: [0, 8000],
  realtimeSafe: false,
  compute: () => 0  // Placeholder
},

"spectral.rolloff": {
  description: "Spectral rolloff (requires FFT)",
  type: "float",
  unit: "Hz",
  range: [0, 8000],
  realtimeSafe: false,
  compute: () => 0  // Placeholder
},

"spectral.flatness": {
  description: "Spectral flatness (requires FFT)",
  type: "float",
  unit: "ratio",
  range: [0, 1],
  realtimeSafe: false,
  compute: () => 0  // Placeholder
},

"spectral.flux": {
  description: "Spectral flux (requires FFT)",
  type: "float",
  unit: "ratio",
  range: [0, 1],
  realtimeSafe: false,
  compute: () => 0  // Placeholder
},

"spectral.low_energy": {
  description: "Low band energy (requires FFT)",
  type: "float",
  unit: "ratio",
  range: [0, 1],
  realtimeSafe: false,
  compute: () => 0  // Placeholder
},

"spectral.mid_energy": {
  description: "Mid band energy (requires FFT)",
  type: "float",
  unit: "ratio",
  range: [0, 1],
  realtimeSafe: false,
  compute: () => 0  // Placeholder
},

"spectral.high_energy": {
  description: "High band energy (requires FFT)",
  type: "float",
  unit: "ratio",
  range: [0, 1],
  realtimeSafe: false,
  compute: () => 0  // Placeholder
},

"spectral.harmonic_ratio": {
  description: "Harmonic ratio (requires FFT)",
  type: "float",
  unit: "ratio",
  range: [0, 1],
  realtimeSafe: false,
  compute: () => 0  // Placeholder
}
```

## PHASE 2: Update Station3 Handlers

### 2.1 Station3_3333_Handler.js Updates

#### Current State (Partial ~20 metrics):
```javascript
preMetrics: [
  "pcm.rms_dbfs",
  "pcm.peak_dbfs",
  "pcm.clipping_ratio",
  // ... ~15 more
],
postMetrics: [
  "pcm.rms_dbfs",
  "pcm.peak_dbfs",
  // ... ~18 more
]
```

#### Target State (82 PCM-applicable metrics):
```javascript
preMetrics: [
  // === PCM Audio (14) ===
  "pcm.peak_amplitude",
  "pcm.peak_to_peak_amplitude",
  "pcm.rms_dbfs",
  "pcm.average_absolute_amplitude",
  "pcm.dbfs_instant",
  "pcm.dbfs_short_term",
  "pcm.dbfs_integrated",
  "pcm.lufs_momentary",
  "pcm.lufs_short_term",
  "pcm.lufs_integrated",
  "pcm.crest_factor",
  "pcm.dynamic_range",
  "pcm.headroom",
  "pcm.silence_floor_level",

  // === Silence & Activity (8) ===
  "silence_detected",
  "silence_duration_ms",
  "speech_activity_ratio",
  "vad_probability",
  "speech_segments_count",
  "average_speech_segment_length",
  "average_silence_gap_length",
  "initial_speech_onset_latency",

  // === Clipping & Distortion (8) ===
  "clipped_samples_count",
  "clipping_ratio",
  "consecutive_clipped_frames",
  "hard_clipping_detection",
  "soft_clipping_detection",
  "distortion_index",
  "overdrive_duration",
  "clipping_risk_index",

  // === Noise & Quality (9) ===
  "noise_floor_dbfs",
  "signal_to_noise_ratio",
  "estimated_background_noise",
  "broadband_noise_level",
  "hum_detection",
  "hiss_detection",
  "audio_dropout_detection",
  "muted_signal_detection",
  "frozen_signal_detection",

  // === Temporal & Continuity (6) ===
  "frame_duration_ms",
  "frame_rate",
  "inter_frame_jitter",
  "frame_timestamp_drift",
  "time_since_last_valid_frame",
  "audio_freeze_duration",

  // === Stream Integrity (8) ===
  "sample_rate_actual",
  "bit_depth",
  "endianness_validation",
  "channel_count",
  "channel_imbalance",
  "frame_size_consistency",
  "buffer_underrun_events",
  "buffer_overrun_events",

  // === Time-Domain Analysis (NEW - 10) ===
  "zero_crossing_rate",
  "zero_crossing_variance",
  "energy_envelope_variance",
  "dc_offset",
  "dc_drift_rate",
  "autocorrelation_peak",
  "pitch_estimate",
  "pitch_confidence",
  "phase_coherence",
  "phase_shift"
],

postMetrics: [
  // ... all preMetrics plus:

  // === Transport/Pipeline (10) ===
  "pcm_frames_per_second",
  "dropped_frames",
  "duplicated_frames",
  "out_of_order_frames",
  "ingress_latency_estimated",
  "egress_latency_estimated",
  "end_to_end_audio_latency_estimated",
  "latency_jitter",
  "queue_depth",
  "backpressure_events",

  // === Health & Diagnostic (6) ===
  "audio_alive_heartbeat",
  "last_audio_activity_timestamp",
  "last_speech_timestamp",
  "decoder_error_count",
  "processing_exception_count",
  "recovery_events_count",

  // === Composite Scores (5) ===
  "audio_health_score",
  "speech_quality_index",
  "noise_risk_index",
  "clipping_risk_index",
  "stt_readiness_score",

  // === Enhanced Buffers (NEW - 5) ===
  "buffer_fill_ratio",
  "buffer_drain_rate",
  "buffer_starvation_events",
  "buffer_overflow_risk",
  "buffer_health_score",

  // === Session (NEW - 5) ===
  "session_duration",
  "session_frames_total",
  "session_errors_total",
  "session_quality_average",
  "session_stability_index"
]
```

### 2.2 Station3_4444_Handler.js
- Identical to Station3_3333_Handler.js

## PHASE 3: Implementation Steps

### 3.1 File Creation Order:
1. **Create Updated_MetricsRegistry.js** (Complete 120 metrics)
2. **Create Updated_Station3_3333_Handler.js** (82 PCM metrics)
3. **Create Updated_Station3_4444_Handler.js** (82 PCM metrics)
4. **Create metrics_validation.js** (Validation script)
5. **Create deploy_metrics_update.sh** (Deployment script)

### 3.2 Testing Strategy:
```javascript
// metrics_validation.js
const MetricsRegistry = require('./Updated_MetricsRegistry');
const Station3_3333 = require('./Updated_Station3_3333_Handler');

// Validate all metrics exist
for (const metric of Station3_3333.preMetrics) {
  if (!MetricsRegistry[metric]) {
    console.error(`Missing metric: ${metric}`);
  }
}
console.log(`Total metrics: ${Object.keys(MetricsRegistry).length}`);
console.log(`Station3 pre: ${Station3_3333.preMetrics.length}`);
console.log(`Station3 post: ${Station3_3333.postMetrics.length}`);
```

## PHASE 4: Deployment

### 4.1 Files to Deploy:
| File | Current Lines | New Lines | Changes |
|------|--------------|-----------|---------|
| MetricsRegistry.js | 819 | ~1,400 | +47 metrics |
| Station3_3333_Handler.js | 79 | ~180 | +metrics lists |
| Station3_4444_Handler.js | 79 | ~180 | +metrics lists |

### 4.2 Deployment Commands:
```bash
# Backup
scp azureuser@20.170.155.53:/path/to/MetricsRegistry.js ./backup/
scp azureuser@20.170.155.53:/path/to/Station3_3333_Handler.js ./backup/
scp azureuser@20.170.155.53:/path/to/Station3_4444_Handler.js ./backup/

# Deploy
scp Updated_MetricsRegistry.js azureuser@20.170.155.53:/path/to/MetricsRegistry.js
scp Updated_Station3_3333_Handler.js azureuser@20.170.155.53:/path/to/Station3_3333_Handler.js
scp Updated_Station3_4444_Handler.js azureuser@20.170.155.53:/path/to/Station3_4444_Handler.js

# Reload
ssh azureuser@20.170.155.53 "pm2 reload all"
```

## ✅ Success Criteria:
1. MetricsRegistry has exactly 120 metrics
2. All metrics have compute functions
3. Station3 handlers have 82 PCM metrics each
4. All Station3 metrics exist in MetricsRegistry
5. No breaking changes to existing metrics
6. System continues to operate normally

## 🚀 Ready to Proceed?
This plan will:
- Add 47 new metrics to reach 100% coverage
- Update Station3 to use all PCM-applicable metrics
- Maintain exact current format
- Preserve all existing functionality

**Shall I create the updated files?**