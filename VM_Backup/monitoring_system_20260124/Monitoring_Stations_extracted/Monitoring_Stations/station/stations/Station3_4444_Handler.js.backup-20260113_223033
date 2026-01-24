/**
 * Station3 4444 Handler - PCM Monitoring
 * Updated with complete PCM-applicable metrics from Unified Specification
 * Total: 82 metrics (51 PRE, 82 POST)
 */

export const Station3_4444_Handler = {
  stationKey: "St_3_4444",
  stationGroup: "STTTTS_PCM_INGRESS",
  direction: "RX",

  // PRE metrics - 51 PCM input monitoring metrics
  // These are computed BEFORE any processing/enhancement
  preMetrics: [
    // === 2.1 Core Amplitude & Loudness Metrics (14) ===
    "pcm.peak_amplitude",
    "pcm.rms_level",
    "pcm.rms_dbfs",
    "pcm.peak_dbfs",
    "pcm.lufs_momentary",
    "pcm.lufs_short_term",
    "pcm.lufs_integrated",
    "pcm.true_peak_dbtp",
    "pcm.loudness_range_lu",
    "pcm.dynamic_range",
    "pcm.crest_factor",
    "pcm.headroom_db",
    "pcm.avg_amplitude",
    "pcm.amplitude_percentile_95",

    // === 2.2 Silence & Activity Detection (8) ===
    "pcm.is_silent",
    "pcm.silence_duration_ms",
    "pcm.silence_ratio",
    "pcm.vad_state",
    "pcm.speech_probability",
    "pcm.activity_factor",
    "pcm.speech_segments_per_min",
    "pcm.avg_speech_duration_ms",

    // === 2.3 Clipping & Distortion Detection (7) ===
    "pcm.clipping_detected",
    "pcm.clip_count",
    "pcm.clip_ratio",
    "pcm.thd_percent",
    "pcm.soft_clip_ratio",
    "pcm.hard_clip_duration_ms",
    "pcm.saturation_events",

    // === 2.4 Noise & Quality Metrics (9) ===
    "pcm.snr_db",
    "pcm.noise_floor_dbfs",
    "pcm.background_noise_level",
    "pcm.hum_detected",
    "pcm.hum_frequency_hz",
    "pcm.broadband_noise_ratio",
    "pcm.impulse_noise_count",
    "pcm.quality_score",
    "pcm.mos_estimate",

    // === 2.5 Temporal & Continuity Metrics (6) ===
    "pcm.zero_crossing_rate",
    "pcm.discontinuity_count",
    "pcm.gap_duration_ms",
    "pcm.jitter_ms",
    "pcm.drift_ppm",
    "pcm.buffer_underruns",

    // === 2.6 Stream Integrity & Format (7) ===
    "pcm.sample_rate_actual",
    "pcm.bit_depth_actual",
    "pcm.channel_count",
    "pcm.format_changes",
    "pcm.sync_errors",
    "pcm.frame_drops",
    "pcm.checksum_errors"
  ],

  // POST metrics - 82 PCM metrics including pipeline & health
  // These are computed AFTER processing/enhancement
  postMetrics: [
    // === All PRE metrics are also measured POST (51) ===
    "pcm.peak_amplitude",
    "pcm.rms_level",
    "pcm.rms_dbfs",
    "pcm.peak_dbfs",
    "pcm.lufs_momentary",
    "pcm.lufs_short_term",
    "pcm.lufs_integrated",
    "pcm.true_peak_dbtp",
    "pcm.loudness_range_lu",
    "pcm.dynamic_range",
    "pcm.crest_factor",
    "pcm.headroom_db",
    "pcm.avg_amplitude",
    "pcm.amplitude_percentile_95",
    "pcm.is_silent",
    "pcm.silence_duration_ms",
    "pcm.silence_ratio",
    "pcm.vad_state",
    "pcm.speech_probability",
    "pcm.activity_factor",
    "pcm.speech_segments_per_min",
    "pcm.avg_speech_duration_ms",
    "pcm.clipping_detected",
    "pcm.clip_count",
    "pcm.clip_ratio",
    "pcm.thd_percent",
    "pcm.soft_clip_ratio",
    "pcm.hard_clip_duration_ms",
    "pcm.saturation_events",
    "pcm.snr_db",
    "pcm.noise_floor_dbfs",
    "pcm.background_noise_level",
    "pcm.hum_detected",
    "pcm.hum_frequency_hz",
    "pcm.broadband_noise_ratio",
    "pcm.impulse_noise_count",
    "pcm.quality_score",
    "pcm.mos_estimate",
    "pcm.zero_crossing_rate",
    "pcm.discontinuity_count",
    "pcm.gap_duration_ms",
    "pcm.jitter_ms",
    "pcm.drift_ppm",
    "pcm.buffer_underruns",
    "pcm.sample_rate_actual",
    "pcm.bit_depth_actual",
    "pcm.channel_count",
    "pcm.format_changes",
    "pcm.sync_errors",
    "pcm.frame_drops",
    "pcm.checksum_errors",

    // === 2.7 Transport & Pipeline Metrics (10) - POST only ===
    "pipeline.input_latency_ms",
    "pipeline.output_latency_ms",
    "pipeline.total_latency_ms",
    "pipeline.processing_time_us",
    "pipeline.throughput_samples_per_sec",
    "pipeline.buffer_depth_frames",
    "pipeline.queue_depth",
    "pipeline.flow_control_events",
    "pipeline.backpressure_ratio",
    "pipeline.chain_position",

    // === 2.8 Health & Diagnostic (6) - POST only ===
    "health.cpu_usage_percent",
    "health.memory_usage_mb",
    "health.thread_count",
    "health.error_count",
    "health.warning_count",
    "health.uptime_seconds",

    // === 2.9 Composite & AI-Ready Scores (5) - POST only ===
    "composite.overall_quality",
    "composite.speech_clarity_index",
    "composite.noise_suppression_gain",
    "composite.enhancement_effectiveness",
    "composite.realtime_performance_score",

    // === 2.10 Session & Time-Domain Metrics (10) - POST only ===
    "session.total_frames_processed",
    "session.total_duration_seconds",
    "session.total_silence_seconds",
    "session.total_speech_seconds",
    "session.session_id",
    "time.peak_frequency_hz",
    "time.spectral_centroid_hz",
    "time.spectral_rolloff_hz",
    "time.spectral_flux",
    "time.mfcc_delta"
  ],

  /**
   * Frame processing callback
   * @param {Buffer} frame - Audio frame buffer
   * @param {Object} ctx - Processing context
   * @param {Object} genericHandler - Generic handler instance
   */
  onFrame(frame, ctx, genericHandler) {
    // Add station-specific context
    const enrichedCtx = {
      ...ctx,
      station_key: this.stationKey,
      station_group: this.stationGroup,
      direction: this.direction,
      sample_rate: ctx.sample_rate || 16000,
      bit_depth: 16,
      channels: 1
    };

    // Delegate to generic handler with station's metric lists
    return genericHandler.processFrame(frame, enrichedCtx, this);
  }
};

// Export for ES6 module system
export default Station3_4444_Handler;