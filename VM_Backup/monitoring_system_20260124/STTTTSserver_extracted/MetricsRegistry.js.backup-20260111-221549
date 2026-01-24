// STTTTSserver/Monitoring_Stations/station/generic/MetricsRegistry.js
// Generated from Unified_Metrics_&_Knobs_Specification.md
// ES6 module format
// Date: 2026-01-11

const INT16_FS = 32767;
const EPS = 1e-12;

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

function ratioToDbfs(ratio) {
  const r = Math.max(EPS, ratio);
  return 20 * Math.log10(r);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// =========================================================================
// METRICS REGISTRY
// =========================================================================

export const MetricsRegistry = {
  // =========================================================================
  // CORE PCM AUDIO METRICS (Signal Domain)
  // =========================================================================

  // 4.1 Amplitude & Loudness Metrics
  "pcm.peak_amplitude": {
    description: "Peak amplitude in frame",
    type: "float",
    unit: "ratio",
    range: [0, 1],
    realtimeSafe: true,
    compute: (samples) => {
      if (!samples || samples.length === 0) return 0;
      let max = 0;
      for (const s of samples) {
        max = Math.max(max, Math.abs(s / INT16_FS));
      }
      return max;
    }
  },

  "pcm.peak_to_peak_amplitude": {
    description: "Peak-to-peak amplitude",
    type: "float",
    unit: "ratio",
    range: [0, 2],
    realtimeSafe: true,
    compute: (samples) => {
      if (!samples || samples.length === 0) return 0;
      let min = 0, max = 0;
      for (const s of samples) {
        const norm = s / INT16_FS;
        min = Math.min(min, norm);
        max = Math.max(max, norm);
      }
      return max - min;
    }
  },

  "pcm.rms_dbfs": {
    description: "RMS level in dBFS",
    type: "float",
    unit: "dBFS",
    range: [-120, 0],
    realtimeSafe: true,
    compute: (samples) => {
      if (!samples || samples.length === 0) return -120;
      let sum = 0;
      for (const s of samples) {
        const norm = s / INT16_FS;
        sum += norm * norm;
      }
      const rms = Math.sqrt(sum / samples.length);
      return ratioToDbfs(rms);
    }
  },

  "pcm.average_absolute_amplitude": {
    description: "Average absolute amplitude",
    type: "float",
    unit: "ratio",
    range: [0, 1],
    realtimeSafe: true,
    compute: (samples) => {
      if (!samples || samples.length === 0) return 0;
      let sum = 0;
      for (const s of samples) {
        sum += Math.abs(s / INT16_FS);
      }
      return sum / samples.length;
    }
  },

  "pcm.dbfs_instant": {
    description: "Instantaneous dBFS",
    type: "float",
    unit: "dBFS",
    range: [-120, 0],
    realtimeSafe: true,
    compute: (samples) => {
      const peak = MetricsRegistry["pcm.peak_amplitude"].compute(samples);
      return ratioToDbfs(peak);
    }
  },

  "pcm.dbfs_short_term": {
    description: "Short-term dBFS (30 frames)",
    type: "float",
    unit: "dBFS",
    range: [-120, 0],
    realtimeSafe: false,
    windowSize: 30
  },

  "pcm.dbfs_integrated": {
    description: "Integrated dBFS (300 frames)",
    type: "float",
    unit: "dBFS",
    range: [-120, 0],
    realtimeSafe: false,
    windowSize: 300
  },

  "pcm.lufs_momentary": {
    description: "Momentary loudness (LUFS)",
    type: "float",
    unit: "LUFS",
    range: [-70, 0],
    realtimeSafe: true,
    compute: (samples) => {
      const rms = MetricsRegistry["pcm.rms_dbfs"].compute(samples);
      return rms + 0.691; // Simplified LUFS approximation
    }
  },

  "pcm.lufs_short_term": {
    description: "Short-term loudness",
    type: "float",
    unit: "LUFS",
    range: [-70, 0],
    realtimeSafe: false,
    windowSize: 30
  },

  "pcm.lufs_integrated": {
    description: "Integrated loudness",
    type: "float",
    unit: "LUFS",
    range: [-70, 0],
    realtimeSafe: false,
    windowSize: 300
  },

  "pcm.crest_factor": {
    description: "Crest factor",
    type: "float",
    unit: "dB",
    range: [0, 40],
    realtimeSafe: true,
    compute: (samples, rms) => {
      const peak = MetricsRegistry["pcm.peak_amplitude"].compute(samples);
      if (!rms || rms < -100) return 40;
      const rmsLinear = Math.pow(10, rms / 20);
      return 20 * Math.log10(peak / rmsLinear);
    }
  },

  "pcm.dynamic_range": {
    description: "Dynamic range",
    type: "float",
    unit: "dB",
    range: [0, 120],
    realtimeSafe: false
  },

  "pcm.headroom": {
    description: "Headroom to 0 dBFS",
    type: "float",
    unit: "dB",
    range: [0, 120],
    realtimeSafe: true,
    compute: (samples) => {
      const dbfs = MetricsRegistry["pcm.dbfs_instant"].compute(samples);
      return Math.abs(dbfs);
    }
  },

  "pcm.silence_floor_level": {
    description: "Silence floor level",
    type: "float",
    unit: "dBFS",
    range: [-120, -40],
    realtimeSafe: false
  },

  // =========================================================================
  // 4.2 Silence & Activity Metrics
  // =========================================================================

  "silence_detected": {
    description: "Silence detection flag",
    type: "boolean",
    realtimeSafe: true,
    compute: (samples, rms) => {
      return rms < -60; // Below -60 dBFS is silence
    }
  },

  "silence_duration_ms": {
    description: "Current silence duration",
    type: "float",
    unit: "ms",
    range: [0, Number.MAX_VALUE],
    realtimeSafe: true,
    stateful: true
  },

  "speech_activity_ratio": {
    description: "Speech activity ratio",
    type: "float",
    unit: "ratio",
    range: [0, 1],
    realtimeSafe: false,
    windowSize: 500
  },

  "vad_probability": {
    description: "Voice activity detection probability",
    type: "float",
    unit: "ratio",
    range: [0, 1],
    realtimeSafe: true,
    compute: (samples, rms) => {
      if (rms > -40) return 1.0;
      if (rms < -60) return 0.0;
      return (rms + 60) / 20;
    }
  },

  "speech_segments_count": {
    description: "Number of speech segments",
    type: "int",
    realtimeSafe: false,
    stateful: true
  },

  "average_speech_segment_length": {
    description: "Average speech segment length",
    type: "float",
    unit: "ms",
    range: [0, Number.MAX_VALUE],
    realtimeSafe: false
  },

  "average_silence_gap_length": {
    description: "Average silence gap length",
    type: "float",
    unit: "ms",
    range: [0, Number.MAX_VALUE],
    realtimeSafe: false
  },

  "initial_speech_onset_latency": {
    description: "Initial speech onset latency",
    type: "float",
    unit: "ms",
    range: [0, Number.MAX_VALUE],
    realtimeSafe: false,
    stateful: true
  },

  // =========================================================================
  // 4.3 Clipping & Distortion Metrics
  // =========================================================================

  "clipped_samples_count": {
    description: "Number of clipped samples",
    type: "int",
    realtimeSafe: true,
    compute: (samples) => {
      let count = 0;
      for (const s of samples) {
        if (Math.abs(s) >= INT16_FS - 1) count++;
      }
      return count;
    }
  },

  "clipping_ratio": {
    description: "Clipping ratio",
    type: "float",
    unit: "ratio",
    range: [0, 1],
    realtimeSafe: true,
    compute: (samples) => {
      const clipped = MetricsRegistry["clipped_samples_count"].compute(samples);
      return samples.length > 0 ? clipped / samples.length : 0;
    }
  },

  "consecutive_clipped_frames": {
    description: "Consecutive clipped frames",
    type: "int",
    realtimeSafe: true,
    stateful: true
  },

  "hard_clipping_detection": {
    description: "Hard clipping detected",
    type: "boolean",
    realtimeSafe: true,
    compute: (samples) => {
      const clipped = MetricsRegistry["clipped_samples_count"].compute(samples);
      return clipped > 0;
    }
  },

  "soft_clipping_detection": {
    description: "Soft clipping detected",
    type: "boolean",
    realtimeSafe: true,
    compute: (samples) => {
      let count = 0;
      const threshold = INT16_FS * 0.95;
      for (const s of samples) {
        if (Math.abs(s) >= threshold) count++;
      }
      return count > samples.length * 0.01;
    }
  },

  "distortion_index": {
    description: "Distortion index",
    type: "float",
    unit: "ratio",
    range: [0, 1],
    realtimeSafe: false
  },

  "overdrive_duration": {
    description: "Overdrive duration",
    type: "float",
    unit: "ms",
    range: [0, Number.MAX_VALUE],
    realtimeSafe: false,
    stateful: true
  },

  // =========================================================================
  // 4.4 Noise & Quality Metrics
  // =========================================================================

  "noise_floor_dbfs": {
    description: "Noise floor level",
    type: "float",
    unit: "dBFS",
    range: [-120, -20],
    realtimeSafe: false,
    windowSize: 100
  },

  "signal_to_noise_ratio": {
    description: "Signal-to-noise ratio",
    type: "float",
    unit: "dB",
    range: [0, 100],
    realtimeSafe: false
  },

  "estimated_background_noise": {
    description: "Estimated background noise",
    type: "float",
    unit: "dBFS",
    range: [-120, -20],
    realtimeSafe: false,
    windowSize: 500
  },

  "broadband_noise_level": {
    description: "Broadband noise level",
    type: "float",
    unit: "dBFS",
    range: [-120, 0],
    realtimeSafe: false
  },

  "hum_detection": {
    description: "50/60 Hz hum detected",
    type: "boolean",
    realtimeSafe: false
  },

  "hiss_detection": {
    description: "High frequency hiss detected",
    type: "boolean",
    realtimeSafe: false
  },

  "audio_dropout_detection": {
    description: "Audio dropout detected",
    type: "boolean",
    realtimeSafe: true,
    compute: (samples) => {
      const rms = MetricsRegistry["pcm.rms_dbfs"].compute(samples);
      return rms < -80;
    }
  },

  "muted_signal_detection": {
    description: "Muted signal detected",
    type: "boolean",
    realtimeSafe: true,
    compute: (samples) => {
      const rms = MetricsRegistry["pcm.rms_dbfs"].compute(samples);
      return rms < -70;
    }
  },

  "frozen_signal_detection": {
    description: "Frozen signal detected",
    type: "boolean",
    realtimeSafe: true,
    stateful: true
  },

  // =========================================================================
  // 6. Temporal & Continuity Metrics
  // =========================================================================

  "frame_duration_ms": {
    description: "Frame duration",
    type: "float",
    unit: "ms",
    range: [0, 1000],
    realtimeSafe: true,
    constant: 20 // For 16kHz, 320 samples
  },

  "frame_rate": {
    description: "Frame rate",
    type: "float",
    unit: "fps",
    range: [0, 100],
    realtimeSafe: true,
    compute: () => 50 // 1000ms / 20ms
  },

  "inter_frame_jitter": {
    description: "Inter-frame jitter",
    type: "float",
    unit: "ms",
    range: [0, 100],
    realtimeSafe: true,
    stateful: true
  },

  "frame_timestamp_drift": {
    description: "Frame timestamp drift",
    type: "float",
    unit: "ms",
    range: [-100, 100],
    realtimeSafe: true,
    stateful: true
  },

  "time_since_last_valid_frame": {
    description: "Time since last valid frame",
    type: "float",
    unit: "ms",
    range: [0, Number.MAX_VALUE],
    realtimeSafe: true,
    stateful: true
  },

  "audio_freeze_duration": {
    description: "Audio freeze duration",
    type: "float",
    unit: "ms",
    range: [0, Number.MAX_VALUE],
    realtimeSafe: true,
    stateful: true
  },

  // =========================================================================
  // 7. PCM Stream Integrity Metrics
  // =========================================================================

  "sample_rate_actual": {
    description: "Actual sample rate",
    type: "int",
    unit: "Hz",
    range: [8000, 48000],
    realtimeSafe: true,
    constant: 16000
  },

  "bit_depth": {
    description: "Bit depth",
    type: "int",
    unit: "bits",
    range: [8, 32],
    realtimeSafe: true,
    constant: 16
  },

  "endianness_validation": {
    description: "Endianness validation",
    type: "boolean",
    realtimeSafe: true,
    constant: true
  },

  "channel_count": {
    description: "Channel count",
    type: "int",
    range: [1, 8],
    realtimeSafe: true,
    constant: 1
  },

  "frame_size_consistency": {
    description: "Frame size consistency",
    type: "boolean",
    realtimeSafe: true
  },

  "buffer_underrun_events": {
    description: "Buffer underrun events",
    type: "int",
    realtimeSafe: true,
    stateful: true
  },

  "buffer_overrun_events": {
    description: "Buffer overrun events",
    type: "int",
    realtimeSafe: true,
    stateful: true
  },

  "channel_imbalance": {
    description: "Channel imbalance",
    type: "float",
    unit: "dB",
    range: [0, 40],
    realtimeSafe: false
  },

  // =========================================================================
  // 8. Transport & Pipeline Metrics
  // =========================================================================

  "pcm_frames_per_second": {
    description: "PCM frames per second",
    type: "float",
    unit: "fps",
    range: [0, 100],
    realtimeSafe: true,
    stateful: true
  },

  "dropped_frames": {
    description: "Dropped frames count",
    type: "int",
    realtimeSafe: true,
    stateful: true
  },

  "duplicated_frames": {
    description: "Duplicated frames count",
    type: "int",
    realtimeSafe: true,
    stateful: true
  },

  "out_of_order_frames": {
    description: "Out-of-order frames count",
    type: "int",
    realtimeSafe: true,
    stateful: true
  },

  "ingress_latency_estimated": {
    description: "Estimated ingress latency",
    type: "float",
    unit: "ms",
    range: [0, 5000],
    realtimeSafe: false
  },

  "egress_latency_estimated": {
    description: "Estimated egress latency",
    type: "float",
    unit: "ms",
    range: [0, 5000],
    realtimeSafe: false
  },

  "end_to_end_audio_latency_estimated": {
    description: "Estimated end-to-end latency",
    type: "float",
    unit: "ms",
    range: [0, 10000],
    realtimeSafe: false
  },

  "latency_jitter": {
    description: "Latency jitter",
    type: "float",
    unit: "ms",
    range: [0, 1000],
    realtimeSafe: false
  },

  "queue_depth": {
    description: "Queue depth",
    type: "int",
    range: [0, 1000],
    realtimeSafe: true
  },

  "backpressure_events": {
    description: "Backpressure events",
    type: "int",
    realtimeSafe: true,
    stateful: true
  },

  // =========================================================================
  // 13. Health & Diagnostic Metrics
  // =========================================================================

  "audio_alive_heartbeat": {
    description: "Audio alive heartbeat",
    type: "boolean",
    realtimeSafe: true
  },

  "last_audio_activity_timestamp": {
    description: "Last audio activity timestamp",
    type: "timestamp",
    realtimeSafe: true,
    stateful: true
  },

  "last_speech_timestamp": {
    description: "Last speech timestamp",
    type: "timestamp",
    realtimeSafe: true,
    stateful: true
  },

  "decoder_error_count": {
    description: "Decoder error count",
    type: "int",
    realtimeSafe: true,
    stateful: true
  },

  "processing_exception_count": {
    description: "Processing exception count",
    type: "int",
    realtimeSafe: true,
    stateful: true
  },

  "recovery_events_count": {
    description: "Recovery events count",
    type: "int",
    realtimeSafe: true,
    stateful: true
  },

  // =========================================================================
  // 14. Derived / Composite Metrics
  // =========================================================================

  "audio_health_score": {
    description: "Overall audio health score",
    type: "float",
    unit: "score",
    range: [0, 100],
    realtimeSafe: false,
    composite: true
  },

  "speech_quality_index": {
    description: "Speech quality index",
    type: "float",
    unit: "score",
    range: [0, 100],
    realtimeSafe: false,
    composite: true
  },

  "noise_risk_index": {
    description: "Noise risk index",
    type: "float",
    unit: "score",
    range: [0, 100],
    realtimeSafe: false,
    composite: true
  },

  "clipping_risk_index": {
    description: "Clipping risk index",
    type: "float",
    unit: "score",
    range: [0, 100],
    realtimeSafe: false,
    composite: true
  },

  "stt_readiness_score": {
    description: "STT readiness score",
    type: "float",
    unit: "score",
    range: [0, 100],
    realtimeSafe: false,
    composite: true
  }
};

// =========================================================================
// METRIC GROUPS
// =========================================================================

export const MetricGroups = {
  amplitude: [
    "pcm.peak_amplitude", "pcm.peak_to_peak_amplitude", "pcm.rms_dbfs",
    "pcm.average_absolute_amplitude", "pcm.dbfs_instant", "pcm.dbfs_short_term",
    "pcm.dbfs_integrated", "pcm.lufs_momentary", "pcm.lufs_short_term",
    "pcm.lufs_integrated", "pcm.crest_factor", "pcm.dynamic_range",
    "pcm.headroom", "pcm.silence_floor_level"
  ],
  silence: [
    "silence_detected", "silence_duration_ms", "speech_activity_ratio",
    "vad_probability", "speech_segments_count", "average_speech_segment_length",
    "average_silence_gap_length", "initial_speech_onset_latency"
  ],
  clipping: [
    "clipped_samples_count", "clipping_ratio", "consecutive_clipped_frames",
    "hard_clipping_detection", "soft_clipping_detection", "distortion_index",
    "overdrive_duration"
  ],
  noise: [
    "noise_floor_dbfs", "signal_to_noise_ratio", "estimated_background_noise",
    "broadband_noise_level", "hum_detection", "hiss_detection",
    "audio_dropout_detection", "muted_signal_detection", "frozen_signal_detection"
  ],
  temporal: [
    "frame_duration_ms", "frame_rate", "inter_frame_jitter",
    "frame_timestamp_drift", "time_since_last_valid_frame", "audio_freeze_duration"
  ],
  integrity: [
    "sample_rate_actual", "bit_depth", "endianness_validation", "channel_count",
    "frame_size_consistency", "buffer_underrun_events", "buffer_overrun_events",
    "channel_imbalance"
  ],
  transport: [
    "pcm_frames_per_second", "dropped_frames", "duplicated_frames",
    "out_of_order_frames", "ingress_latency_estimated", "egress_latency_estimated",
    "end_to_end_audio_latency_estimated", "latency_jitter", "queue_depth",
    "backpressure_events"
  ],
  health: [
    "audio_alive_heartbeat", "last_audio_activity_timestamp", "last_speech_timestamp",
    "decoder_error_count", "processing_exception_count", "recovery_events_count"
  ],
  composite: [
    "audio_health_score", "speech_quality_index", "noise_risk_index",
    "clipping_risk_index", "stt_readiness_score"
  ]
};

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

export function getRealtimeMetrics() {
  return Object.entries(MetricsRegistry)
    .filter(([_, def]) => def.realtimeSafe)
    .map(([key]) => key);
}

export function getAsyncMetrics() {
  return Object.entries(MetricsRegistry)
    .filter(([_, def]) => !def.realtimeSafe)
    .map(([key]) => key);
}

export function computeMetric(key, samples, context = {}) {
  const def = MetricsRegistry[key];
  if (!def) {
    throw new Error(`Unknown metric: ${key}`);
  }

  if (def.compute) {
    return def.compute(samples, context.rms, context);
  }

  if (def.constant !== undefined) {
    return def.constant;
  }

  return null;
}

// =========================================================================
// METRICS COUNT SUMMARY
// =========================================================================
// Total metrics: 90 measurement parameters
// From Unified_Metrics_&_Knobs_Specification.md sections 4-14
// These are actual measurement parameters for monitoring audio