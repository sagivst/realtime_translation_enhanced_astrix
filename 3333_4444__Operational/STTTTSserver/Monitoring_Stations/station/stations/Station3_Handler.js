// Station3_Handler.js
// Unified handler for Station 3 (STTTTS PCM Ingress) monitoring
// Replaces Station3_3333_Handler.js and Station3_4444_Handler.js

/**
 * Creates a Station 3 handler for the specified extension
 * @param {string} stationKey - Full station key (e.g., "St_3_3333")
 * @returns {Object} Station handler configuration
 */
export function createStation3Handler(stationKey) {
  // Extract extension number from stationKey
  const extNumber = stationKey.replace('St_3_', '');
  
  // Validate
  if (extNumber !== '3333' && extNumber !== '4444') {
    console.warn(`[Station3] Invalid station key: ${stationKey}`);
    return null;
  }

  return {
    stationKey: stationKey,
    stationGroup: "STTTTS_PCM_INGRESS",
    direction: "RX",

    // PRE metrics - measure raw incoming audio
    preMetrics: [
      // Core Amplitude & Loudness Metrics
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

      // Silence & Activity Detection
      "pcm.is_silent",
      "pcm.silence_duration_ms",
      "pcm.silence_ratio",
      "pcm.activity_factor",
      "pcm.speech_probability",
      "pcm.vad_state",
      "pcm.speech_segments_per_min",
      "pcm.avg_speech_duration_ms",

      // Clipping & Distortion Detection
      "pcm.clipping_detected",
      "pcm.clip_count",
      "pcm.clip_ratio",
      "pcm.soft_clip_ratio",
      "pcm.hard_clip_duration_ms",
      "pcm.saturation_events",
      "pcm.thd_percent",

      // Signal Quality & Noise
      "pcm.snr_db",
      "pcm.noise_floor_dbfs",
      "pcm.background_noise_level",
      "pcm.broadband_noise_ratio",
      "pcm.hum_detected",
      "pcm.hum_frequency_hz",
      "pcm.impulse_noise_count",

      // Frequency & Zero Crossing
      "pcm.zero_crossing_rate",

      // Integrity & Format
      "pcm.sample_rate_actual",
      "pcm.bit_depth_actual",
      "pcm.channel_count",
      "pcm.format_changes",
      "pcm.discontinuity_count",
      "pcm.checksum_errors",

      // Quality Scores
      "pcm.quality_score",
      "pcm.mos_estimate"
    ],

    // POST metrics - measure after knob application  
    postMetrics: [
      // Core metrics after processing
      "pcm.rms_dbfs",
      "pcm.peak_dbfs",
      "pcm.clip_ratio",
      "pcm.zero_crossing_rate",
      "pcm.snr_db",
      "pcm.quality_score",
      
      // Activity monitoring
      "pcm.is_silent",
      "pcm.vad_state",
      
      // Distortion after processing
      "pcm.clipping_detected",
      "pcm.thd_percent"
    ],

    // Entry point
    onFrame(frame, ctx, genericHandler) {
      const enrichedCtx = {
        ...ctx,
        station_key: this.stationKey,
        station_group: this.stationGroup,
        direction: this.direction,
        extension: extNumber,
        sample_rate: ctx.sample_rate || 16000,
        bit_depth: 16,
        channels: 1
      };

      return genericHandler.processFrame(frame, enrichedCtx, this);
    }
  };
}

// Pre-create handlers for both stations
export const Station3_3333_Handler = createStation3Handler("St_3_3333");
export const Station3_4444_Handler = createStation3Handler("St_3_4444");

// Default export for dynamic creation
export default createStation3Handler;

// Log module load
console.log('[Station3] Unified handler module loaded');
