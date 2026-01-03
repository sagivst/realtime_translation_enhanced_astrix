// STTTTSserver/Monitoring_Stations/station/stations/Station3_4444_Handler.js
// Thin adapter for Station 3 (port 4444) monitoring
// Defines WHAT to measure for audio flow (Extension B -> Extension A), not HOW (that's done by Generic Handler)

export const Station3_4444_Handler = {
  stationKey: "St_3_4444",
  stationGroup: "STTTTS_PCM_INGRESS",
  direction: "RX",  // Receiving from gateway (Extension B's mic -> Extension A's speaker)

  // PRE metrics - measure raw incoming audio from Extension B
  preMetrics: [
    // Core metrics (always computed)
    "pcm.rms_dbfs",
    "pcm.peak_dbfs",
    "pcm.clipping_ratio",
    "pcm.zero_crossing_rate"
  ],

  // POST metrics - measure after knob application
  postMetrics: [
    // Core metrics (always computed)
    "pcm.rms_dbfs",
    "pcm.peak_dbfs",
    "pcm.clipping_ratio",

    // Pipeline metrics
    "pipe.processing_latency_ms",
    "pipe.frame_drop_ratio"
  ],

  // Entry point - just forwards to Generic Handler (thin adapter pattern)
  onFrame(frame, ctx, genericHandler) {
    genericHandler.processFrame(
      frame,
      {
        ...ctx,
        station_key: this.stationKey,
        station_group: this.stationGroup,
        direction: this.direction
      },
      this
    );
  }
};