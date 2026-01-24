// STATION 3 UNIFIED METRICS & KNOBS - PCM MONITORING STATION
// Based on PCM_Monitoring_Station_Applicable_Metrics_&_Knobs.md
// ~80-100 Metrics + ~120-150 Knobs for PCM Station
// Fixed: 2026-01-11 - Aligned with KnobsRegistry.js naming

// This will be the knobs initialization for Station 3 PCM Monitoring
const unifiedKnobs = {
  // ========== METRICS (Read-Only Monitoring Parameters) ==========
  // Keep 'metrics.' prefix for all metrics

  // === Core PCM Audio Metrics ===
  // 2.1 Core Amplitude & Loudness Metrics (14 metrics)
  'metrics.pcm.peak_amplitude': 0,
  'metrics.pcm.peak_to_peak_amplitude': 0,
  'metrics.pcm.rms_dbfs': 0,
  'metrics.pcm.average_absolute_amplitude': 0,
  'metrics.pcm.dbfs_instant': 0,
  'metrics.pcm.dbfs_short_term': 0,
  'metrics.pcm.dbfs_integrated': 0,
  'metrics.pcm.lufs_momentary': 0,
  'metrics.pcm.lufs_short_term': 0,
  'metrics.pcm.lufs_integrated': 0,
  'metrics.pcm.crest_factor': 0,
  'metrics.pcm.dynamic_range': 0,
  'metrics.pcm.headroom': 0,
  'metrics.pcm.silence_floor_level': 0,

  // 2.2 Silence & Activity Metrics (8 metrics)
  'metrics.silence_detected': false,
  'metrics.silence_duration_ms': 0,
  'metrics.speech_activity_ratio': 0,
  'metrics.vad_probability': 0,
  'metrics.speech_segments_count': 0,
  'metrics.average_speech_segment_length': 0,
  'metrics.average_silence_gap_length': 0,
  'metrics.initial_speech_onset_latency': 0,

  // 2.3 Clipping & Distortion Metrics (7 metrics)
  'metrics.clipped_samples_count': 0,
  'metrics.clipping_ratio': 0,
  'metrics.consecutive_clipped_frames': 0,
  'metrics.hard_clipping_detection': false,
  'metrics.soft_clipping_detection': false,
  'metrics.distortion_index': 0,
  'metrics.overdrive_duration': 0,

  // 2.4 Noise & Quality Metrics (9 metrics)
  'metrics.noise_floor_dbfs': -60,
  'metrics.signal_to_noise_ratio': 0,
  'metrics.estimated_background_noise': 0,
  'metrics.broadband_noise_level': 0,
  'metrics.hum_detection': false,
  'metrics.hiss_detection': false,
  'metrics.audio_dropout_detection': false,
  'metrics.muted_signal_detection': false,
  'metrics.frozen_signal_detection': false,

  // 2.5 Temporal & Continuity Metrics (6 metrics)
  'metrics.frame_duration_ms': 20,
  'metrics.frame_rate': 50,
  'metrics.inter_frame_jitter': 0,
  'metrics.frame_timestamp_drift': 0,
  'metrics.time_since_last_valid_frame': 0,
  'metrics.audio_freeze_duration': 0,

  // 2.6 PCM Stream Integrity Metrics (8 metrics)
  'metrics.sample_rate_actual': 16000,
  'metrics.bit_depth': 16,
  'metrics.endianness_validation': true,
  'metrics.channel_count': 1,
  'metrics.frame_size_consistency': true,
  'metrics.buffer_underrun_events': 0,
  'metrics.buffer_overrun_events': 0,
  'metrics.channel_imbalance': 0,

  // 2.7 Transport/Pipeline Metrics - PCM Level Only (10 metrics)
  'metrics.pcm_frames_per_second': 0,
  'metrics.dropped_frames': 0,
  'metrics.duplicated_frames': 0,
  'metrics.out_of_order_frames': 0,
  'metrics.ingress_latency_estimated': 0,
  'metrics.egress_latency_estimated': 0,
  'metrics.end_to_end_audio_latency_estimated': 0,
  'metrics.latency_jitter': 0,
  'metrics.queue_depth': 0,
  'metrics.backpressure_events': 0,

  // 2.8 Health & Diagnostic Metrics (6 metrics)
  'metrics.audio_alive_heartbeat': true,
  'metrics.last_audio_activity_timestamp': Date.now(),
  'metrics.last_speech_timestamp': Date.now(),
  'metrics.decoder_error_count': 0,
  'metrics.processing_exception_count': 0,
  'metrics.recovery_events_count': 0,

  // 2.9 Derived/Composite Metrics - MANDATORY for AI (5 metrics)
  'metrics.audio_health_score': 100,
  'metrics.speech_quality_index': 0,
  'metrics.noise_risk_index': 0,
  'metrics.clipping_risk_index': 0,
  'metrics.stt_readiness_score': 0,

  // ========== KNOBS (Control/Calibration Parameters) ==========
  // NO 'knobs.' prefix - must match KnobsRegistry.js exactly

  // === 4.1 Gain & Level Control ===
  'pcm.input_gain_db': 0,
  'pcm.output_gain_db': 0,
  'pcm.target_level_dbfs': -12,

  // === 4.2 AGC (Automatic Gain Control) ===
  'agc.enabled': true,
  'agc.target_level_dbfs': -18,
  'agc.max_gain_db': 30,
  'agc.attack_ms': 10,        // Note: KnobsRegistry uses 'attack_ms' not 'attack_time_ms'
  'agc.release_ms': 200,      // Note: KnobsRegistry uses 'release_ms' not 'release_time_ms'

  // === 4.3 Compression & Limiting ===
  'compressor.enabled': false,
  'compressor.threshold_dbfs': -20,
  'compressor.ratio': 4,
  'compressor.attack_ms': 5,
  'compressor.release_ms': 100,
  'compressor.makeup_gain_db': 0,

  'limiter.enabled': true,
  'limiter.threshold_dbfs': -6,
  'limiter.release_ms': 50,
  'limiter.lookahead_ms': 5,

  // === 4.4 Noise Control ===
  'noise_gate.enabled': false,
  'noise_gate.threshold_dbfs': -50,
  'noise_gate.attack_ms': 5,
  'noise_gate.hold_ms': 10,
  'noise_gate.release_ms': 100,

  'noise_reduction.enabled': false,
  'noise_reduction.strength': 0.5,
  'noise_reduction.learning_rate': 0.1,
  'noise_reduction.preserve_voice_threshold': -40,  // dBFS, not ratio
  'noise_reduction.spectral_subtraction_factor': 1.0,  // factor 0-2

  // === 4.5 Equalization & Filters ===
  'eq.enabled': false,
  'eq.low_shelf_freq_hz': 100,
  'eq.low_shelf_gain_db': 0,
  'eq.mid_freq_hz': 1000,
  'eq.mid_gain_db': 0,
  'eq.mid_q': 1.0,
  'eq.high_shelf_freq_hz': 8000,
  'eq.high_shelf_gain_db': 0,

  'highpass.enabled': false,
  'highpass.cutoff_hz': 80,
  'lowpass.enabled': false,
  'lowpass.cutoff_hz': 8000,

  // === 4.6 Voice Enhancement ===
  // Note: voice_enhancement and de_esser not in current KnobsRegistry

  // === 4.7 Echo/Feedback (PCM-Level Only) ===
  'aec.enabled': true,
  'aec.tail_length_ms': 128,
  'aec.convergence_speed': 0.5,
  'aec.suppression_level': 'moderate',  // enum: low, moderate, high
  'feedback.suppression_enabled': false,
  'feedback.notch_q': 10,
  'feedback.max_notches': 3,
  'feedback.reaction_time_ms': 100,

  // === 4.8 Monitoring & Smoothing ===
  'monitoring.metrics_enabled': true,
  'monitoring.pre_tap_enabled': true,
  'monitoring.post_tap_enabled': true,
  'monitoring.audio_capture_enabled': true,
  'monitoring.fft_analysis_enabled': false,
  'smoothing.enabled': true,
  'smoothing.window_ms': 100,
  'smoothing.type': 'exponential',

  // === 4.9 Safety & AI Permission (CRITICAL - MUST EXIST) ===
  'ai.optimization_allowed': true,
  'ai.max_adjustment_percent': 30,
  'ai.rollback_on_failure': true,
  'safety.max_output_level_dbfs': 0,
  'safety.min_output_level_dbfs': -60,
  'safety.clipping_protection': true,
  'safety.emergency_mute': false,
  'safety.emergency_boost_db': 0,

  // === Threshold Calibration Knobs ===
  // Note: These threshold knobs are not currently in KnobsRegistry
  // They would need to be added to the registry for calibration purposes

  // === Buffer & System Knobs ===
  // Note: buffer.* and system.* knobs not in current KnobsRegistry

  // === Legacy Control Knobs ===
  // Note: Legacy knobs (main_volume, balance, etc.) not in current KnobsRegistry
};

module.exports = unifiedKnobs;