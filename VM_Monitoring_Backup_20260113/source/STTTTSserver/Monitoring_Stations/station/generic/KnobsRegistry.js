// STTTTSserver/Monitoring_Stations/station/generic/KnobsRegistry.js
// Generated from Unified_Metrics_&_Knobs_Specification.md
// ES6 module format
// Date: 2026-01-11

export const KnobsRegistry = {
  // =========================================================================
  // GAIN & AMPLITUDE CONTROL
  // =========================================================================

  "pcm.input_gain_db": {
    description: "Input gain adjustment in decibels",
    type: "float",
    min: -24,
    max: 24,
    default: 0,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "dB"
  },

  "pcm.output_gain_db": {
    description: "Output gain adjustment in decibels",
    type: "float",
    min: -24,
    max: 24,
    default: 0,
    liveApply: true,
    appliesAt: "POST_PROCESSING",
    unit: "dB"
  },

  "pcm.target_level_dbfs": {
    description: "Target level for PCM audio",
    type: "float",
    min: -30,
    max: 0,
    default: -12,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "dBFS"
  },

  // =========================================================================
  // AGC (AUTOMATIC GAIN CONTROL)
  // =========================================================================

  "agc.enabled": {
    description: "Enable automatic gain control",
    type: "boolean",
    default: false,
    liveApply: true,
    appliesAt: "PRE_PROCESSING"
  },

  "agc.target_level_dbfs": {
    description: "AGC target level",
    type: "float",
    min: -30,
    max: 0,
    default: -18,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "dBFS"
  },

  "agc.max_gain_db": {
    description: "Maximum gain AGC can apply",
    type: "float",
    min: 0,
    max: 40,
    default: 30,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "dB"
  },

  "agc.attack_ms": {
    description: "AGC attack time",
    type: "float",
    min: 1,
    max: 100,
    default: 10,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "ms"
  },

  "agc.release_ms": {
    description: "AGC release time",
    type: "float",
    min: 10,
    max: 1000,
    default: 200,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "ms"
  },

  // =========================================================================
  // COMPRESSOR
  // =========================================================================

  "compressor.enabled": {
    description: "Enable audio compression",
    type: "boolean",
    default: false,
    liveApply: true,
    appliesAt: "PRE_PROCESSING"
  },

  "compressor.threshold_dbfs": {
    description: "Compression threshold",
    type: "float",
    min: -40,
    max: 0,
    default: -20,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "dBFS"
  },

  "compressor.ratio": {
    description: "Compression ratio",
    type: "float",
    min: 1,
    max: 20,
    default: 4,
    liveApply: true,
    appliesAt: "PRE_PROCESSING"
  },

  "compressor.attack_ms": {
    description: "Compressor attack time",
    type: "float",
    min: 0.1,
    max: 100,
    default: 5,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "ms"
  },

  "compressor.release_ms": {
    description: "Compressor release time",
    type: "float",
    min: 10,
    max: 1000,
    default: 100,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "ms"
  },

  "compressor.makeup_gain_db": {
    description: "Makeup gain after compression",
    type: "float",
    min: 0,
    max: 20,
    default: 0,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "dB"
  },

  // =========================================================================
  // LIMITER
  // =========================================================================

  "limiter.enabled": {
    description: "Enable audio limiting",
    type: "boolean",
    default: true,
    liveApply: true,
    appliesAt: "POST_PROCESSING"
  },

  "limiter.threshold_dbfs": {
    description: "Limiter threshold",
    type: "float",
    min: -12,
    max: 0,
    default: -6,
    liveApply: true,
    appliesAt: "POST_PROCESSING",
    unit: "dBFS"
  },

  "limiter.release_ms": {
    description: "Limiter release time",
    type: "float",
    min: 10,
    max: 500,
    default: 50,
    liveApply: true,
    appliesAt: "POST_PROCESSING",
    unit: "ms"
  },

  "limiter.lookahead_ms": {
    description: "Limiter lookahead time",
    type: "float",
    min: 0,
    max: 20,
    default: 5,
    liveApply: true,
    appliesAt: "POST_PROCESSING",
    unit: "ms"
  },

  // =========================================================================
  // NOISE GATE
  // =========================================================================

  "noise_gate.enabled": {
    description: "Enable noise gate",
    type: "boolean",
    default: false,
    liveApply: true,
    appliesAt: "PRE_PROCESSING"
  },

  "noise_gate.threshold_dbfs": {
    description: "Noise gate threshold",
    type: "float",
    min: -80,
    max: -20,
    default: -50,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "dBFS"
  },

  "noise_gate.attack_ms": {
    description: "Noise gate attack time",
    type: "float",
    min: 0.1,
    max: 50,
    default: 5,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "ms"
  },

  "noise_gate.hold_ms": {
    description: "Noise gate hold time",
    type: "float",
    min: 1,
    max: 100,
    default: 10,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "ms"
  },

  "noise_gate.release_ms": {
    description: "Noise gate release time",
    type: "float",
    min: 10,
    max: 500,
    default: 100,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "ms"
  },

  // =========================================================================
  // NOISE REDUCTION
  // =========================================================================

  "noise_reduction.enabled": {
    description: "Enable noise reduction",
    type: "boolean",
    default: false,
    liveApply: true,
    appliesAt: "PRE_PROCESSING"
  },

  "noise_reduction.strength": {
    description: "Noise reduction strength",
    type: "float",
    min: 0,
    max: 1,
    default: 0.5,
    liveApply: true,
    appliesAt: "PRE_PROCESSING"
  },

  "noise_reduction.learning_rate": {
    description: "Noise profile learning rate",
    type: "float",
    min: 0,
    max: 1,
    default: 0.1,
    liveApply: true,
    appliesAt: "PRE_PROCESSING"
  },

  "noise_reduction.preserve_voice_threshold": {
    description: "Threshold to preserve voice",
    type: "float",
    min: -60,
    max: -20,
    default: -40,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "dBFS"
  },

  "noise_reduction.spectral_subtraction_factor": {
    description: "Spectral subtraction factor",
    type: "float",
    min: 0,
    max: 2,
    default: 1.0,
    liveApply: true,
    appliesAt: "PRE_PROCESSING"
  },

  // =========================================================================
  // EQUALIZATION
  // =========================================================================

  "eq.enabled": {
    description: "Enable equalizer",
    type: "boolean",
    default: false,
    liveApply: true,
    appliesAt: "PRE_PROCESSING"
  },

  "eq.low_shelf_freq_hz": {
    description: "Low shelf frequency",
    type: "float",
    min: 20,
    max: 500,
    default: 100,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "Hz"
  },

  "eq.low_shelf_gain_db": {
    description: "Low shelf gain",
    type: "float",
    min: -12,
    max: 12,
    default: 0,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "dB"
  },

  "eq.mid_freq_hz": {
    description: "Mid frequency",
    type: "float",
    min: 200,
    max: 5000,
    default: 1000,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "Hz"
  },

  "eq.mid_gain_db": {
    description: "Mid frequency gain",
    type: "float",
    min: -12,
    max: 12,
    default: 0,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "dB"
  },

  "eq.mid_q": {
    description: "Mid frequency Q factor",
    type: "float",
    min: 0.1,
    max: 10,
    default: 1.0,
    liveApply: true,
    appliesAt: "PRE_PROCESSING"
  },

  "eq.high_shelf_freq_hz": {
    description: "High shelf frequency",
    type: "float",
    min: 4000,
    max: 16000,
    default: 8000,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "Hz"
  },

  "eq.high_shelf_gain_db": {
    description: "High shelf gain",
    type: "float",
    min: -12,
    max: 12,
    default: 0,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "dB"
  },

  // =========================================================================
  // FILTERS
  // =========================================================================

  "highpass.enabled": {
    description: "Enable high-pass filter",
    type: "boolean",
    default: false,
    liveApply: true,
    appliesAt: "PRE_PROCESSING"
  },

  "highpass.cutoff_hz": {
    description: "High-pass cutoff frequency",
    type: "float",
    min: 20,
    max: 500,
    default: 80,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "Hz"
  },

  "lowpass.enabled": {
    description: "Enable low-pass filter",
    type: "boolean",
    default: false,
    liveApply: true,
    appliesAt: "PRE_PROCESSING"
  },

  "lowpass.cutoff_hz": {
    description: "Low-pass cutoff frequency",
    type: "float",
    min: 4000,
    max: 20000,
    default: 8000,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "Hz"
  },

  // =========================================================================
  // ECHO CANCELLATION (AEC)
  // =========================================================================

  "aec.enabled": {
    description: "Enable acoustic echo cancellation",
    type: "boolean",
    default: true,
    liveApply: false,
    appliesAt: "PRE_PROCESSING"
  },

  "aec.tail_length_ms": {
    description: "Echo tail length",
    type: "int",
    min: 64,
    max: 512,
    default: 128,
    liveApply: false,
    appliesAt: "PRE_PROCESSING",
    unit: "ms"
  },

  "aec.convergence_speed": {
    description: "AEC convergence speed",
    type: "float",
    min: 0.1,
    max: 1.0,
    default: 0.5,
    liveApply: false,
    appliesAt: "PRE_PROCESSING"
  },

  "aec.suppression_level": {
    description: "Echo suppression level",
    type: "enum",
    values: ["low", "moderate", "high"],
    default: "moderate",
    liveApply: false,
    appliesAt: "PRE_PROCESSING"
  },

  // =========================================================================
  // FEEDBACK SUPPRESSION
  // =========================================================================

  "feedback.suppression_enabled": {
    description: "Enable feedback suppression",
    type: "boolean",
    default: false,
    liveApply: true,
    appliesAt: "PRE_PROCESSING"
  },

  "feedback.notch_q": {
    description: "Notch filter Q factor",
    type: "float",
    min: 1,
    max: 50,
    default: 10,
    liveApply: true,
    appliesAt: "PRE_PROCESSING"
  },

  "feedback.max_notches": {
    description: "Maximum number of notch filters",
    type: "int",
    min: 1,
    max: 10,
    default: 3,
    liveApply: true,
    appliesAt: "PRE_PROCESSING"
  },

  "feedback.reaction_time_ms": {
    description: "Feedback detection reaction time",
    type: "float",
    min: 10,
    max: 500,
    default: 100,
    liveApply: true,
    appliesAt: "PRE_PROCESSING",
    unit: "ms"
  },

  // =========================================================================
  // MONITORING & SMOOTHING
  // =========================================================================

  "monitoring.metrics_enabled": {
    description: "Enable metrics collection",
    type: "boolean",
    default: true,
    liveApply: true,
    appliesAt: "MONITORING"
  },

  "monitoring.pre_tap_enabled": {
    description: "Enable pre-processing tap",
    type: "boolean",
    default: true,
    liveApply: true,
    appliesAt: "MONITORING"
  },

  "monitoring.post_tap_enabled": {
    description: "Enable post-processing tap",
    type: "boolean",
    default: true,
    liveApply: true,
    appliesAt: "MONITORING"
  },

  "monitoring.audio_capture_enabled": {
    description: "Enable audio capture",
    type: "boolean",
    default: true,
    liveApply: true,
    appliesAt: "MONITORING"
  },

  "monitoring.fft_analysis_enabled": {
    description: "Enable FFT analysis",
    type: "boolean",
    default: false,
    liveApply: true,
    appliesAt: "MONITORING"
  },

  "smoothing.enabled": {
    description: "Enable metric smoothing",
    type: "boolean",
    default: true,
    liveApply: true,
    appliesAt: "MONITORING"
  },

  "smoothing.window_ms": {
    description: "Smoothing window size",
    type: "float",
    min: 10,
    max: 1000,
    default: 100,
    liveApply: true,
    appliesAt: "MONITORING",
    unit: "ms"
  },

  "smoothing.type": {
    description: "Smoothing algorithm",
    type: "enum",
    values: ["exponential", "moving_average", "gaussian"],
    default: "exponential",
    liveApply: true,
    appliesAt: "MONITORING"
  },

  // =========================================================================
  // SAFETY & AI PERMISSION
  // =========================================================================

  "ai.optimization_allowed": {
    description: "Allow AI optimization",
    type: "boolean",
    default: true,
    liveApply: true,
    appliesAt: "CONTROL"
  },

  "ai.max_adjustment_percent": {
    description: "Maximum AI adjustment percentage",
    type: "float",
    min: 0,
    max: 100,
    default: 30,
    liveApply: true,
    appliesAt: "CONTROL",
    unit: "%"
  },

  "ai.rollback_on_failure": {
    description: "Rollback on AI failure",
    type: "boolean",
    default: true,
    liveApply: true,
    appliesAt: "CONTROL"
  },

  "safety.max_output_level_dbfs": {
    description: "Maximum output level",
    type: "float",
    min: -12,
    max: 0,
    default: 0,
    liveApply: true,
    appliesAt: "SAFETY",
    unit: "dBFS"
  },

  "safety.min_output_level_dbfs": {
    description: "Minimum output level",
    type: "float",
    min: -80,
    max: -20,
    default: -60,
    liveApply: true,
    appliesAt: "SAFETY",
    unit: "dBFS"
  },

  "safety.clipping_protection": {
    description: "Enable clipping protection",
    type: "boolean",
    default: true,
    liveApply: true,
    appliesAt: "SAFETY"
  },

  "safety.emergency_mute": {
    description: "Emergency mute state",
    type: "boolean",
    default: false,
    liveApply: true,
    appliesAt: "SAFETY"
  },

  "safety.emergency_boost_db": {
    description: "Emergency boost level",
    type: "float",
    min: 0,
    max: 20,
    default: 0,
    liveApply: true,
    appliesAt: "SAFETY",
    unit: "dB"
  },

  // =========================================================================
  // RTP & JITTER BUFFER KNOBS
  // =========================================================================

  "jitterbuffer.enabled": {
    description: "Enable jitter buffer",
    type: "boolean",
    default: true,
    liveApply: false,
    appliesAt: "RTP"
  },

  "jitterbuffer.type": {
    description: "Jitter buffer type",
    type: "enum",
    values: ["fixed", "adaptive"],
    default: "adaptive",
    liveApply: false,
    appliesAt: "RTP"
  },

  "jitterbuffer.size_ms": {
    description: "Jitter buffer size",
    type: "int",
    min: 10,
    max: 500,
    default: 60,
    liveApply: false,
    appliesAt: "RTP",
    unit: "ms"
  },

  "jitterbuffer.target_delay_ms": {
    description: "Target delay",
    type: "int",
    min: 10,
    max: 200,
    default: 40,
    liveApply: false,
    appliesAt: "RTP",
    unit: "ms"
  },

  "jitterbuffer.max_delay_ms": {
    description: "Maximum delay",
    type: "int",
    min: 50,
    max: 1000,
    default: 200,
    liveApply: false,
    appliesAt: "RTP",
    unit: "ms"
  },

  "jitterbuffer.resync_threshold": {
    description: "Resync threshold",
    type: "int",
    min: 100,
    max: 10000,
    default: 1000,
    liveApply: false,
    appliesAt: "RTP"
  },

  // =========================================================================
  // CODEC & CHANNEL
  // =========================================================================

  "codec.allowed_codecs": {
    description: "Allowed codecs",
    type: "string",
    default: "opus,g711,g729",
    liveApply: false,
    appliesAt: "CODEC"
  },

  "codec.preferred_codec": {
    description: "Preferred codec",
    type: "string",
    default: "opus",
    liveApply: false,
    appliesAt: "CODEC"
  },

  "channel.media_timeout": {
    description: "Media timeout",
    type: "int",
    min: 1000,
    max: 60000,
    default: 30000,
    liveApply: false,
    appliesAt: "CHANNEL",
    unit: "ms"
  },

  "channel.silence_threshold": {
    description: "Silence threshold",
    type: "float",
    min: -80,
    max: -20,
    default: -45,
    liveApply: false,
    appliesAt: "CHANNEL",
    unit: "dBFS"
  }
};

// =========================================================================
// KNOB GROUPS
// =========================================================================

export const KnobGroups = {
  gain: ["pcm.input_gain_db", "pcm.output_gain_db", "pcm.target_level_dbfs"],
  agc: ["agc.enabled", "agc.target_level_dbfs", "agc.max_gain_db", "agc.attack_ms", "agc.release_ms"],
  compressor: ["compressor.enabled", "compressor.threshold_dbfs", "compressor.ratio", "compressor.attack_ms", "compressor.release_ms", "compressor.makeup_gain_db"],
  limiter: ["limiter.enabled", "limiter.threshold_dbfs", "limiter.release_ms", "limiter.lookahead_ms"],
  noise_gate: ["noise_gate.enabled", "noise_gate.threshold_dbfs", "noise_gate.attack_ms", "noise_gate.hold_ms", "noise_gate.release_ms"],
  noise_reduction: ["noise_reduction.enabled", "noise_reduction.strength", "noise_reduction.learning_rate", "noise_reduction.preserve_voice_threshold", "noise_reduction.spectral_subtraction_factor"],
  eq: ["eq.enabled", "eq.low_shelf_freq_hz", "eq.low_shelf_gain_db", "eq.mid_freq_hz", "eq.mid_gain_db", "eq.mid_q", "eq.high_shelf_freq_hz", "eq.high_shelf_gain_db"],
  filters: ["highpass.enabled", "highpass.cutoff_hz", "lowpass.enabled", "lowpass.cutoff_hz"],
  aec: ["aec.enabled", "aec.tail_length_ms", "aec.convergence_speed", "aec.suppression_level"],
  feedback: ["feedback.suppression_enabled", "feedback.notch_q", "feedback.max_notches", "feedback.reaction_time_ms"],
  monitoring: ["monitoring.metrics_enabled", "monitoring.pre_tap_enabled", "monitoring.post_tap_enabled", "monitoring.audio_capture_enabled", "monitoring.fft_analysis_enabled"],
  smoothing: ["smoothing.enabled", "smoothing.window_ms", "smoothing.type"],
  ai: ["ai.optimization_allowed", "ai.max_adjustment_percent", "ai.rollback_on_failure"],
  safety: ["safety.max_output_level_dbfs", "safety.min_output_level_dbfs", "safety.clipping_protection", "safety.emergency_mute", "safety.emergency_boost_db"],
  jitterbuffer: ["jitterbuffer.enabled", "jitterbuffer.type", "jitterbuffer.size_ms", "jitterbuffer.target_delay_ms", "jitterbuffer.max_delay_ms", "jitterbuffer.resync_threshold"],
  codec: ["codec.allowed_codecs", "codec.preferred_codec"],
  channel: ["channel.media_timeout", "channel.silence_threshold"]
};

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

export function validateKnobValue(key, value) {
  const def = KnobsRegistry[key];
  if (!def) {
    throw new Error(`Unknown knob: ${key}`);
  }

  if (def.type === 'boolean') {
    return typeof value === 'boolean';
  }

  if (def.type === 'enum') {
    return def.values.includes(value);
  }

  if (def.type === 'string') {
    return typeof value === 'string';
  }

  if (def.type === 'float' || def.type === 'int' || def.type === 'number') {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return false;
    }
    if (def.min !== undefined && value < def.min) return false;
    if (def.max !== undefined && value > def.max) return false;
    if (def.type === 'int' && !Number.isInteger(value)) return false;
    return true;
  }

  return false;
}

export function getDefaultKnobs() {
  const defaults = {};
  for (const [key, def] of Object.entries(KnobsRegistry)) {
    if (def.default !== undefined) {
      defaults[key] = def.default;
    }
  }
  return defaults;
}

export function getKnobsByStage(stage) {
  return Object.entries(KnobsRegistry)
    .filter(([_, def]) => def.appliesAt === stage)
    .map(([key]) => key);
}

export function getLiveApplicableKnobs() {
  return Object.entries(KnobsRegistry)
    .filter(([_, def]) => def.liveApply)
    .map(([key]) => key);
}

// =========================================================================
// KNOB COUNT SUMMARY
// =========================================================================
// Total knobs: 73 control parameters
// From Unified_Metrics_&_Knobs_Specification.md
// These are actual control parameters that affect audio processing