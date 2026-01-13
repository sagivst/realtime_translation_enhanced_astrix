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
    "pcm.peak_amplitude",
    "clipping_ratio",
    

    // Extended realtime metrics
    "pcm.peak_amplitude",
    "pcm.peak_to_peak_amplitude",
    "pcm.average_absolute_amplitude",
    "pcm.crest_factor",
    
    
    "consecutive_clipped_frames",
    "noise_floor_dbfs",
    "signal_to_noise_ratio",
    "muted_signal_detection",
    "frozen_signal_detection",

    // Stream integrity
    "sample_rate_actual",
    "bit_depth",
    "channel_count"
  ],

  // POST metrics - measure after knob application
  postMetrics: [
    // Core metrics (always computed)
    "pcm.rms_dbfs",
    "pcm.peak_amplitude",
    "clipping_ratio",
    

    // Extended realtime metrics
    "pcm.peak_amplitude",
    "pcm.peak_to_peak_amplitude",
    "pcm.average_absolute_amplitude",
    "pcm.crest_factor",
    
    
    "consecutive_clipped_frames",

    // Pipeline metrics
    "egress_latency_estimated",
    "dropped_frames",
    "queue_depth",

    // Health score
    "audio_health_score"
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