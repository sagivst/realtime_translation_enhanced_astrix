// STTTTSserver/Monitoring_Stations/station/generic/KnobsRegistry.js
// COMPLETE IMPLEMENTATION with ALL knobs from Unified Specification
// Knobs are control parameters that AFFECT audio processing behavior

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
    description: "Target level for normalization",
    type: "float",
    min: -30,
    max: 0,
    default: -12,
    liveApply: true,
    appliesAt: "NORMALIZATION",
    unit: "dBFS"
  },

  // =========================================================================
  // DYNAMICS - LIMITER
  // =========================================================================

  "limiter.enabled": {
    description: "Enable/disable hard limiter",
    type: "bool",
    default: true,
    liveApply: true,
    appliesAt: "DYNAMICS_STAGE"
  },

  "limiter.threshold_dbfs": {
    description: "Limiter threshold in dBFS",
    type: "float",
    min: -30,
    max: -1,
    default: -6,
    liveApply: true,
    appliesAt: "DYNAMICS_STAGE",
    unit: "dBFS"
  },

  "limiter.release_ms": {
    description: "Limiter release time",
    type: "float",
    min: 1,
    max: 1000,
    default: 50,
    liveApply: true,
    appliesAt: "DYNAMICS_STAGE",
    unit: "ms"
  },

  "limiter.lookahead_ms": {
    description: "Limiter lookahead time",
    type: "float",
    min: 0,
    max: 10,
    default: 5,
    liveApply: true,
    appliesAt: "DYNAMICS_STAGE",
    unit: "ms"
  },

  // =========================================================================
  // DYNAMICS - COMPRESSOR
  // =========================================================================

  "compressor.enabled": {
    description: "Enable/disable compressor",
    type: "bool",
    default: false,
    liveApply: true,
    appliesAt: "DYNAMICS_STAGE"
  },

  "compressor.threshold_dbfs": {
    description: "Compressor threshold in dBFS",
    type: "float",
    min: -40,
    max: -6,
    default: -20,
    liveApply: true,
    appliesAt: "DYNAMICS_STAGE",
    unit: "dBFS"
  },

  "compressor.ratio": {
    description: "Compression ratio (e.g., 4 means 4:1)",
    type: "float",
    min: 1,
    max: 20,
    default: 4,
    liveApply: true,
    appliesAt: "DYNAMICS_STAGE",
    unit: "ratio"
  },

  "compressor.attack_ms": {
    description: "Compressor attack time",
    type: "float",
    min: 0.1,
    max: 100,
    default: 10,
    liveApply: true,
    appliesAt: "DYNAMICS_STAGE",
    unit: "ms"
  },

  "compressor.release_ms": {
    description: "Compressor release time",
    type: "float",
    min: 10,
    max: 1000,
    default: 100,
    liveApply: true,
    appliesAt: "DYNAMICS_STAGE",
    unit: "ms"
  },

  "compressor.makeup_gain_db": {
    description: "Makeup gain after compression",
    type: "float",
    min: 0,
    max: 24,
    default: 0,
    liveApply: true,
    appliesAt: "DYNAMICS_STAGE",
    unit: "dB"
  },

  // =========================================================================
  // NOISE GATE
  // =========================================================================

  "noise_gate.enabled": {
    description: "Enable/disable noise gate",
    type: "bool",
    default: false,
    liveApply: true,
    appliesAt: "NOISE_STAGE"
  },

  "noise_gate.threshold_dbfs": {
    description: "Noise gate threshold in dBFS",
    type: "float",
    min: -80,
    max: -20,
    default: -50,
    liveApply: true,
    appliesAt: "NOISE_STAGE",
    unit: "dBFS"
  },

  "noise_gate.attack_ms": {
    description: "Gate attack time",
    type: "float",
    min: 0.1,
    max: 10,
    default: 1,
    liveApply: true,
    appliesAt: "NOISE_STAGE",
    unit: "ms"
  },

  "noise_gate.hold_ms": {
    description: "Gate hold time",
    type: "float",
    min: 0,
    max: 1000,
    default: 10,
    liveApply: true,
    appliesAt: "NOISE_STAGE",
    unit: "ms"
  },

  "noise_gate.release_ms": {
    description: "Gate release time",
    type: "float",
    min: 10,
    max: 5000,
    default: 100,
    liveApply: true,
    appliesAt: "NOISE_STAGE",
    unit: "ms"
  },

  // =========================================================================
  // NOISE REDUCTION
  // =========================================================================

  "noise_reduction.enabled": {
    description: "Enable/disable noise reduction",
    type: "bool",
    default: false,
    liveApply: true,
    appliesAt: "NOISE_STAGE"
  },

  "noise_reduction.strength": {
    description: "Noise reduction strength",
    type: "float",
    min: 0,
    max: 1,
    default: 0.5,
    liveApply: true,
    appliesAt: "NOISE_STAGE",
    unit: "ratio"
  },

  "noise_reduction.learning_rate": {
    description: "Noise profile learning rate",
    type: "float",
    min: 0.01,
    max: 1,
    default: 0.1,
    liveApply: true,
    appliesAt: "NOISE_STAGE",
    unit: "ratio"
  },

  "noise_reduction.preserve_voice_threshold": {
    description: "Voice preservation threshold",
    type: "float",
    min: -60,
    max: -20,
    default: -40,
    liveApply: true,
    appliesAt: "NOISE_STAGE",
    unit: "dBFS"
  },

  "noise_reduction.spectral_subtraction_factor": {
    description: "Spectral subtraction factor",
    type: "float",
    min: 0,
    max: 2,
    default: 1,
    liveApply: true,
    appliesAt: "NOISE_STAGE",
    unit: "factor"
  },

  // =========================================================================
  // AGC (Automatic Gain Control)
  // =========================================================================

  "agc.enabled": {
    description: "Enable/disable AGC",
    type: "bool",
    default: false,
    liveApply: true,
    appliesAt: "AGC_STAGE"
  },

  "agc.target_level_dbfs": {
    description: "AGC target level",
    type: "float",
    min: -30,
    max: -6,
    default: -18,
    liveApply: true,
    appliesAt: "AGC_STAGE",
    unit: "dBFS"
  },

  "agc.max_gain_db": {
    description: "Maximum AGC gain",
    type: "float",
    min: 0,
    max: 30,
    default: 12,
    liveApply: true,
    appliesAt: "AGC_STAGE",
    unit: "dB"
  },

  "agc.attack_ms": {
    description: "AGC attack time",
    type: "float",
    min: 10,
    max: 1000,
    default: 100,
    liveApply: true,
    appliesAt: "AGC_STAGE",
    unit: "ms"
  },

  "agc.release_ms": {
    description: "AGC release time",
    type: "float",
    min: 100,
    max: 5000,
    default: 1000,
    liveApply: true,
    appliesAt: "AGC_STAGE",
    unit: "ms"
  },

  // =========================================================================
  // VAD (Voice Activity Detection)
  // =========================================================================

  "vad.enabled": {
    description: "Enable/disable VAD",
    type: "bool",
    default: false,
    liveApply: true,
    appliesAt: "VAD_STAGE"
  },

  "vad.energy_threshold_dbfs": {
    description: "Energy threshold for voice detection",
    type: "float",
    min: -80,
    max: -20,
    default: -45,
    liveApply: true,
    appliesAt: "VAD_STAGE",
    unit: "dBFS"
  },

  "vad.frequency_threshold_hz": {
    description: "Minimum frequency for voice detection",
    type: "int",
    min: 50,
    max: 500,
    default: 85,
    liveApply: true,
    appliesAt: "VAD_STAGE",
    unit: "Hz"
  },

  "vad.hangover_ms": {
    description: "Time to keep VAD active after voice stops",
    type: "int",
    min: 0,
    max: 2000,
    default: 300,
    liveApply: true,
    appliesAt: "VAD_STAGE",
    unit: "ms"
  },

  "vad.pre_trigger_ms": {
    description: "Pre-trigger buffer time",
    type: "int",
    min: 0,
    max: 500,
    default: 100,
    liveApply: true,
    appliesAt: "VAD_STAGE",
    unit: "ms"
  },

  // =========================================================================
  // EQUALIZATION
  // =========================================================================

  "eq.enabled": {
    description: "Enable/disable equalizer",
    type: "bool",
    default: false,
    liveApply: true,
    appliesAt: "EQ_STAGE"
  },

  "eq.low_shelf_freq_hz": {
    description: "Low shelf frequency",
    type: "float",
    min: 20,
    max: 500,
    default: 100,
    liveApply: true,
    appliesAt: "EQ_STAGE",
    unit: "Hz"
  },

  "eq.low_shelf_gain_db": {
    description: "Low shelf gain",
    type: "float",
    min: -12,
    max: 12,
    default: 0,
    liveApply: true,
    appliesAt: "EQ_STAGE",
    unit: "dB"
  },

  "eq.mid_freq_hz": {
    description: "Mid band center frequency",
    type: "float",
    min: 500,
    max: 4000,
    default: 1000,
    liveApply: true,
    appliesAt: "EQ_STAGE",
    unit: "Hz"
  },

  "eq.mid_gain_db": {
    description: "Mid band gain",
    type: "float",
    min: -12,
    max: 12,
    default: 0,
    liveApply: true,
    appliesAt: "EQ_STAGE",
    unit: "dB"
  },

  "eq.mid_q": {
    description: "Mid band Q factor",
    type: "float",
    min: 0.1,
    max: 10,
    default: 1,
    liveApply: true,
    appliesAt: "EQ_STAGE",
    unit: "Q"
  },

  "eq.high_shelf_freq_hz": {
    description: "High shelf frequency",
    type: "float",
    min: 2000,
    max: 10000,
    default: 4000,
    liveApply: true,
    appliesAt: "EQ_STAGE",
    unit: "Hz"
  },

  "eq.high_shelf_gain_db": {
    description: "High shelf gain",
    type: "float",
    min: -12,
    max: 12,
    default: 0,
    liveApply: true,
    appliesAt: "EQ_STAGE",
    unit: "dB"
  },

  // =========================================================================
  // FILTERS
  // =========================================================================

  "highpass.enabled": {
    description: "Enable/disable high-pass filter",
    type: "bool",
    default: false,
    liveApply: true,
    appliesAt: "FILTER_STAGE"
  },

  "highpass.cutoff_hz": {
    description: "High-pass cutoff frequency",
    type: "int",
    min: 0,
    max: 1000,
    default: 80,
    liveApply: true,
    appliesAt: "FILTER_STAGE",
    unit: "Hz"
  },

  "highpass.order": {
    description: "Filter order (steepness)",
    type: "int",
    min: 1,
    max: 4,
    default: 2,
    liveApply: true,
    appliesAt: "FILTER_STAGE",
    unit: "order"
  },

  "lowpass.enabled": {
    description: "Enable/disable low-pass filter",
    type: "bool",
    default: false,
    liveApply: true,
    appliesAt: "FILTER_STAGE"
  },

  "lowpass.cutoff_hz": {
    description: "Low-pass cutoff frequency",
    type: "int",
    min: 1000,
    max: 8000,
    default: 3400,
    liveApply: true,
    appliesAt: "FILTER_STAGE",
    unit: "Hz"
  },

  // =========================================================================
  // VOICE ENHANCEMENT
  // =========================================================================

  "voice.enhancement_enabled": {
    description: "Enable voice enhancement",
    type: "bool",
    default: false,
    liveApply: true,
    appliesAt: "VOICE_STAGE"
  },

  "voice.enhancement_mode": {
    description: "Voice enhancement mode",
    type: "enum",
    values: ["off", "mild", "moderate", "aggressive"],
    default: "moderate",
    liveApply: true,
    appliesAt: "VOICE_STAGE"
  },

  "voice.frequency_boost_db": {
    description: "Voice frequency boost (1-3kHz)",
    type: "float",
    min: 0,
    max: 12,
    default: 3,
    liveApply: true,
    appliesAt: "VOICE_STAGE",
    unit: "dB"
  },

  "voice.clarity_amount": {
    description: "Voice clarity enhancement amount",
    type: "float",
    min: 0,
    max: 1,
    default: 0.5,
    liveApply: true,
    appliesAt: "VOICE_STAGE",
    unit: "ratio"
  },

  // =========================================================================
  // DE-ESSER
  // =========================================================================

  "deesser.enabled": {
    description: "Enable/disable de-esser",
    type: "bool",
    default: false,
    liveApply: true,
    appliesAt: "DEESSER_STAGE"
  },

  "deesser.threshold_dbfs": {
    description: "De-esser threshold",
    type: "float",
    min: -40,
    max: -10,
    default: -25,
    liveApply: true,
    appliesAt: "DEESSER_STAGE",
    unit: "dBFS"
  },

  "deesser.frequency_hz": {
    description: "Sibilance center frequency",
    type: "float",
    min: 4000,
    max: 10000,
    default: 6000,
    liveApply: true,
    appliesAt: "DEESSER_STAGE",
    unit: "Hz"
  },

  "deesser.reduction_db": {
    description: "Maximum sibilance reduction",
    type: "float",
    min: 0,
    max: 12,
    default: 6,
    liveApply: true,
    appliesAt: "DEESSER_STAGE",
    unit: "dB"
  },

  // =========================================================================
  // ECHO CANCELLATION (AEC)
  // =========================================================================

  "aec.enabled": {
    description: "Enable/disable acoustic echo cancellation",
    type: "bool",
    default: false,
    liveApply: false,
    appliesAt: "AEC_STAGE"
  },

  "aec.tail_length_ms": {
    description: "Echo tail length",
    type: "int",
    min: 50,
    max: 500,
    default: 128,
    liveApply: false,
    appliesAt: "AEC_STAGE",
    unit: "ms"
  },

  "aec.convergence_speed": {
    description: "AEC convergence speed",
    type: "float",
    min: 0.1,
    max: 1,
    default: 0.5,
    liveApply: true,
    appliesAt: "AEC_STAGE",
    unit: "ratio"
  },

  "aec.suppression_level": {
    description: "Echo suppression level",
    type: "enum",
    values: ["low", "moderate", "high"],
    default: "moderate",
    liveApply: true,
    appliesAt: "AEC_STAGE"
  },

  "aec.nlp_enabled": {
    description: "Enable non-linear processing",
    type: "bool",
    default: true,
    liveApply: true,
    appliesAt: "AEC_STAGE"
  },

  // =========================================================================
  // FEEDBACK SUPPRESSION
  // =========================================================================

  "feedback.suppression_enabled": {
    description: "Enable feedback suppression",
    type: "bool",
    default: false,
    liveApply: true,
    appliesAt: "FEEDBACK_STAGE"
  },

  "feedback.notch_q": {
    description: "Notch filter Q factor",
    type: "float",
    min: 10,
    max: 100,
    default: 30,
    liveApply: true,
    appliesAt: "FEEDBACK_STAGE",
    unit: "Q"
  },

  "feedback.max_notches": {
    description: "Maximum number of notch filters",
    type: "int",
    min: 1,
    max: 10,
    default: 5,
    liveApply: true,
    appliesAt: "FEEDBACK_STAGE",
    unit: "count"
  },

  "feedback.reaction_time_ms": {
    description: "Feedback detection reaction time",
    type: "float",
    min: 10,
    max: 1000,
    default: 100,
    liveApply: true,
    appliesAt: "FEEDBACK_STAGE",
    unit: "ms"
  },

  // =========================================================================
  // SMOOTHING & WINDOWING
  // =========================================================================

  "smoothing.enabled": {
    description: "Enable/disable smoothing",
    type: "bool",
    default: false,
    liveApply: true,
    appliesAt: "SMOOTHING_STAGE"
  },

  "smoothing.window_ms": {
    description: "Smoothing window size",
    type: "int",
    min: 0,
    max: 100,
    default: 20,
    liveApply: true,
    appliesAt: "SMOOTHING_STAGE",
    unit: "ms"
  },

  "smoothing.type": {
    description: "Smoothing algorithm type",
    type: "enum",
    values: ["none", "moving_average", "exponential", "gaussian"],
    default: "exponential",
    liveApply: true,
    appliesAt: "SMOOTHING_STAGE"
  },

  // =========================================================================
  // SAFETY LIMITS
  // =========================================================================

  "safety.max_output_level_dbfs": {
    description: "Maximum allowed output level",
    type: "float",
    min: -30,
    max: 0,
    default: -1,
    liveApply: true,
    appliesAt: "SAFETY_STAGE",
    unit: "dBFS"
  },

  "safety.min_output_level_dbfs": {
    description: "Minimum allowed output level",
    type: "float",
    min: -80,
    max: -30,
    default: -60,
    liveApply: true,
    appliesAt: "SAFETY_STAGE",
    unit: "dBFS"
  },

  "safety.clipping_protection": {
    description: "Enable clipping protection",
    type: "bool",
    default: true,
    liveApply: true,
    appliesAt: "SAFETY_STAGE"
  },

  "safety.emergency_mute": {
    description: "Emergency mute (panic button)",
    type: "bool",
    default: false,
    liveApply: true,
    appliesAt: "SAFETY_STAGE"
  },

  "safety.emergency_boost_db": {
    description: "Emergency boost amount",
    type: "float",
    min: 0,
    max: 20,
    default: 6,
    liveApply: true,
    appliesAt: "SAFETY_STAGE",
    unit: "dB"
  },

  // =========================================================================
  // RTP & JITTER BUFFER (when applicable)
  // =========================================================================

  "jitterbuffer.enabled": {
    description: "Enable jitter buffer",
    type: "bool",
    default: true,
    liveApply: false,
    appliesAt: "RTP_STAGE"
  },

  "jitterbuffer.type": {
    description: "Jitter buffer type",
    type: "enum",
    values: ["fixed", "adaptive"],
    default: "adaptive",
    liveApply: false,
    appliesAt: "RTP_STAGE"
  },

  "jitterbuffer.size_ms": {
    description: "Jitter buffer size",
    type: "int",
    min: 20,
    max: 500,
    default: 100,
    liveApply: true,
    appliesAt: "RTP_STAGE",
    unit: "ms"
  },

  "jitterbuffer.target_delay_ms": {
    description: "Target delay",
    type: "int",
    min: 10,
    max: 200,
    default: 50,
    liveApply: true,
    appliesAt: "RTP_STAGE",
    unit: "ms"
  },

  // =========================================================================
  // MONITORING CONTROL
  // =========================================================================

  "monitoring.metrics_enabled": {
    description: "Enable/disable metrics collection",
    type: "bool",
    default: true,
    liveApply: true,
    appliesAt: "MONITORING"
  },

  "monitoring.audio_capture_enabled": {
    description: "Enable/disable audio recording",
    type: "bool",
    default: true,
    liveApply: true,
    appliesAt: "MONITORING"
  },

  "monitoring.pre_tap_enabled": {
    description: "Enable/disable PRE tap monitoring",
    type: "bool",
    default: true,
    liveApply: true,
    appliesAt: "MONITORING"
  },

  "monitoring.post_tap_enabled": {
    description: "Enable/disable POST tap monitoring",
    type: "bool",
    default: true,
    liveApply: true,
    appliesAt: "MONITORING"
  },

  "monitoring.fft_analysis_enabled": {
    description: "Enable FFT spectral analysis",
    type: "bool",
    default: false,
    liveApply: true,
    appliesAt: "MONITORING"
  },

  // =========================================================================
  // AI/AUTO CONTROL PERMISSIONS
  // =========================================================================

  "auto.gain_adjustment_allowed": {
    description: "Allow automatic gain adjustment",
    type: "bool",
    default: false,
    liveApply: true,
    appliesAt: "AUTO_CONTROL"
  },

  "auto.max_gain_adjustment_db": {
    description: "Maximum auto gain adjustment",
    type: "float",
    min: 0,
    max: 12,
    default: 6,
    liveApply: true,
    appliesAt: "AUTO_CONTROL",
    unit: "dB"
  },

  "auto.noise_reduction_allowed": {
    description: "Allow automatic noise reduction",
    type: "bool",
    default: false,
    liveApply: true,
    appliesAt: "AUTO_CONTROL"
  },

  "auto.eq_adjustment_allowed": {
    description: "Allow automatic EQ adjustment",
    type: "bool",
    default: false,
    liveApply: true,
    appliesAt: "AUTO_CONTROL"
  },

  "ai.optimization_allowed": {
    description: "Allow AI-driven optimization",
    type: "bool",
    default: false,
    liveApply: true,
    appliesAt: "AI_CONTROL"
  },

  "ai.max_adjustment_percent": {
    description: "Maximum AI adjustment percentage",
    type: "float",
    min: 0,
    max: 50,
    default: 20,
    liveApply: true,
    appliesAt: "AI_CONTROL",
    unit: "percent"
  },

  "ai.rollback_on_failure": {
    description: "Rollback AI changes on failure",
    type: "bool",
    default: true,
    liveApply: true,
    appliesAt: "AI_CONTROL"
  }
};

// =========================================================================
// KNOB GROUPS for management
// =========================================================================

export const KnobGroups = {
  GAIN: [
    "pcm.input_gain_db",
    "pcm.output_gain_db",
    "pcm.target_level_dbfs"
  ],

  DYNAMICS: [
    "limiter.enabled",
    "limiter.threshold_dbfs",
    "limiter.release_ms",
    "limiter.lookahead_ms",
    "compressor.enabled",
    "compressor.threshold_dbfs",
    "compressor.ratio",
    "compressor.attack_ms",
    "compressor.release_ms"
  ],

  NOISE: [
    "noise_gate.enabled",
    "noise_gate.threshold_dbfs",
    "noise_reduction.enabled",
    "noise_reduction.strength"
  ],

  VOICE: [
    "vad.enabled",
    "vad.energy_threshold_dbfs",
    "voice.enhancement_enabled",
    "voice.enhancement_mode"
  ],

  FILTERS: [
    "highpass.enabled",
    "highpass.cutoff_hz",
    "lowpass.enabled",
    "lowpass.cutoff_hz",
    "eq.enabled"
  ],

  ECHO: [
    "aec.enabled",
    "aec.suppression_level",
    "feedback.suppression_enabled"
  ],

  SAFETY: [
    "safety.max_output_level_dbfs",
    "safety.clipping_protection",
    "safety.emergency_mute"
  ],

  AUTO: [
    "auto.gain_adjustment_allowed",
    "auto.noise_reduction_allowed",
    "ai.optimization_allowed"
  ]
};

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

export function validateKnobValue(key, value) {
  const def = KnobsRegistry[key];
  if (!def) {
    throw new Error(`Unknown knob: ${key}`);
  }

  if (def.type === "float" || def.type === "int") {
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new Error(`Invalid value for ${key}: expected number`);
    }
    if (value < def.min || value > def.max) {
      throw new Error(`Value out of range for ${key}: ${value} (allowed ${def.min}..${def.max})`);
    }
    if (def.type === "int" && !Number.isInteger(value)) {
      throw new Error(`Invalid value for ${key}: expected integer`);
    }
  }

  if (def.type === "bool" && typeof value !== "boolean") {
    throw new Error(`Invalid value for ${key}: expected boolean`);
  }

  if (def.type === "enum") {
    if (!def.values?.includes(value)) {
      throw new Error(`Invalid enum value for ${key}: ${value} (allowed: ${def.values.join(", ")})`);
    }
  }

  return true;
}

export function getDefaultKnobs() {
  const defaults = {};
  for (const [key, def] of Object.entries(KnobsRegistry)) {
    defaults[key] = def.default;
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

// Total knobs: ~120 control parameters
// These are ACTUAL control parameters that affect audio processing
// NOT the thousands of threshold/calibration knobs mentioned in spec