// STTTTSserver/Monitoring_Stations/station/stations/Station3_4444_Handler.js
// Thin adapter for Station 3 (port 4444) monitoring
// Defines WHAT to measure for OUTGOING audio (TX to gateway), not HOW (that's done by Generic Handler)

export const Station3_4444_Handler = {
  stationKey: "St_3_4444",
  stationGroup: "STTTTS_PCM_EGRESS",
  direction: "TX",  // Transmitting to gateway

  // PRE metrics - measure audio before final transmission processing
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

    // TTS-specific metrics (for synthesized audio)
    "tts.pitch_variance",
    "tts.tempo_stability",
    "tts.spectral_centroid",
    "tts.harmonic_ratio",

    // Stream integrity
    "stream.sample_rate",
    "stream.bit_depth",
    "stream.channel_count"
  ],

  // POST metrics - measure after output processing and knobs
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

    // Output-specific metrics
    "output.gain_applied_db",
    "output.limiter_engaged",
    "output.compressor_ratio",
    "output.gate_active",
    "output.target_loudness_lufs",

    // Pipeline metrics
    "pipe.processing_latency_ms",
    "pipe.frame_drop_ratio",
    "pipe.queue_depth",
    "pipe.buffer_underrun",

    // Transmission readiness
    "tx.ready_to_send",
    "tx.packet_size",
    "tx.encoding_quality",

    // Health score
    "health.audio_score",
    "health.transmission_score"
  ],

  // Entry point - just forwards to Generic Handler
  onFrame(frame, ctx, genericHandler) {
    // Add station-specific context for TX/4444
    const enrichedCtx = {
      ...ctx,
      station_key: this.stationKey,
      station_group: this.stationGroup,
      direction: this.direction,
      sample_rate: ctx.sample_rate || 16000,
      bit_depth: 16,
      channels: 1,
      // TX-specific context
      is_tts_output: ctx.is_tts_output || false,
      target_device: ctx.target_device || "gateway",
      transmission_protocol: "websocket"
    };

    // Let the Generic Handler do all the work
    return genericHandler.processFrame(frame, enrichedCtx, this);
  }
};