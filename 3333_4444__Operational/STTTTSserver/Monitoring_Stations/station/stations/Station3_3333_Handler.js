// STTTTSserver/Monitoring_Stations/station/stations/Station3_3333_Handler.js
// Thin adapter for Station 3 (port 3333) monitoring
// Defines WHAT to measure, not HOW (that's done by Generic Handler)

export const Station3_3333_Handler = {
  stationKey: "St_3_3333",
  stationGroup: "STTTTS_PCM_INGRESS",
  direction: "RX",  // Receiving from gateway

  // PRE metrics - measure raw incoming audio
  preMetrics: [
    // Core metrics (always computed)
    "pcm.rms_dbfs",
    "pcm.peak_dbfs",
    "pcm.clipping_ratio",
    "pcm.zero_crossing_rate",

    // Extended realtime metrics
    "pcm.peak_amplitude",
    "pcm.peak_to_peak",
    "pcm.average_absolute",
    "pcm.crest_factor",
    "pcm.silence_detected",
    "pcm.clipped_samples",
    "pcm.consecutive_clipped",
    "pcm.noise_floor",
    "pcm.snr_estimate",
    "pcm.muted_signal",
    "pcm.frozen_signal",

    // Stream integrity
    "stream.sample_rate",
    "stream.bit_depth",
    "stream.channel_count"
  ],

  // POST metrics - measure after knob application
  postMetrics: [
    // Core metrics (always computed)
    "pcm.rms_dbfs",
    "pcm.peak_dbfs",
    "pcm.clipping_ratio",
    "pcm.zero_crossing_rate",

    // Extended realtime metrics
    "pcm.peak_amplitude",
    "pcm.peak_to_peak",
    "pcm.average_absolute",
    "pcm.crest_factor",
    "pcm.silence_detected",
    "pcm.clipped_samples",
    "pcm.consecutive_clipped",

    // Pipeline metrics
    "pipe.processing_latency_ms",
    "pipe.frame_drop_ratio",
    "pipe.queue_depth",

    // Health score
    "health.audio_score"
  ],

  // Entry point - just forwards to Generic Handler
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

    // Let the Generic Handler do all the work
    return genericHandler.processFrame(frame, enrichedCtx, this);
  }
};