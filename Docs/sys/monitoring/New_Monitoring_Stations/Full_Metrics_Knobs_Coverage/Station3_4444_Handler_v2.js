/**
 * Station3 4444 Handler V2 - PCM Monitoring with State Management
 * Updated with complete PCM-applicable metrics and persistent state
 * Total: 82 metrics (51 PRE, 82 POST) with full state management
 */

export const Station3_4444_Handler = {
  stationKey: "St_3_4444",
  stationGroup: "STTTTS_PCM_INGRESS",
  direction: "RX",

  // NEW: Persistent metric state
  metricState: {
    // LUFS buffers
    shortTermBuffer: [],
    integratedBuffer: [],
    loudnessBuffer: [],

    // Speech tracking
    vadHistory: [],
    speechDurations: [],
    currentSpeechStart: null,

    // Noise tracking
    lastNoiseFloor: -60,

    // Clipping state
    saturationCount: 0,
    wasClipping: false,
    clipStart: null,

    // Silence tracking
    silenceStart: null,
    silenceHistory: [],

    // Timing
    driftStart: Date.now(),
    frameCount: 0,
    lastFrameTime: null,
    jitterBuffer: [],

    // Discontinuity tracking
    lastSample: null,
    discontinuities: 0,

    // Session tracking
    sessionId: `session_${Date.now()}_4444`,
    sessionStart: Date.now(),
    startTime: Date.now(),
    totalFrames: 0,
    totalSilence: 0,
    totalSpeech: 0,

    // Misc counters
    underruns: 0,
    underflowCount: 0,
    overflowCount: 0,
    impulseCount: 0,
    formatChanges: 0,
    frameDrops: 0,
    checksumErrors: 0,
    syncErrors: 0,
    lastFormat: null,
    errorCount: 0,
    warningCount: 0,

    // Buffer/Pipeline state
    availableFrames: 0,
    bufferCapacity: 1000,
    bufferDepth: 0,
    queueDepth: 0,
    flowControlEvents: 0,
    inputLatency: 0,
    outputLatency: 0,
    processingTime: 0,
    chainPosition: 0,

    // System state
    cpuUsage: 0,
    memoryUsage: 0,
    threadCount: 1,
    sampleRate: 48000,
    bitDepth: 16,
    channels: 1
  },

  // PRE metrics - 51 PCM input monitoring metrics
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
   * Frame processing callback with state management
   */
  onFrame(frame, ctx, genericHandler) {
    // Add station-specific context AND persistent state
    const enrichedCtx = {
      ...ctx,
      station_key: this.stationKey,
      station_group: this.stationGroup,
      direction: this.direction,
      sample_rate: ctx.sample_rate || this.metricState.sampleRate,
      bit_depth: this.metricState.bitDepth,
      channels: this.metricState.channels,

      // Spread ALL persistent state into context
      ...this.metricState
    };

    // Process frame
    const result = genericHandler.processFrame(frame, enrichedCtx, this);

    // Update persistent state from context after processing
    this.updateMetricState(enrichedCtx);

    return result;
  },

  /**
   * Update persistent state from context after metric computation
   */
  updateMetricState(ctx) {
    // Update buffers (arrays)
    if (ctx.shortTermBuffer !== undefined) this.metricState.shortTermBuffer = ctx.shortTermBuffer;
    if (ctx.integratedBuffer !== undefined) this.metricState.integratedBuffer = ctx.integratedBuffer;
    if (ctx.loudnessBuffer !== undefined) this.metricState.loudnessBuffer = ctx.loudnessBuffer;
    if (ctx.vadHistory !== undefined) this.metricState.vadHistory = ctx.vadHistory;
    if (ctx.speechDurations !== undefined) this.metricState.speechDurations = ctx.speechDurations;
    if (ctx.silenceHistory !== undefined) this.metricState.silenceHistory = ctx.silenceHistory;
    if (ctx.jitterBuffer !== undefined) this.metricState.jitterBuffer = ctx.jitterBuffer;

    // Update state variables (preserve nulls and zeros)
    if ('lastNoiseFloor' in ctx) this.metricState.lastNoiseFloor = ctx.lastNoiseFloor;
    if ('currentSpeechStart' in ctx) this.metricState.currentSpeechStart = ctx.currentSpeechStart;
    if ('saturationCount' in ctx) this.metricState.saturationCount = ctx.saturationCount;
    if ('wasClipping' in ctx) this.metricState.wasClipping = ctx.wasClipping;
    if ('clipStart' in ctx) this.metricState.clipStart = ctx.clipStart;
    if ('silenceStart' in ctx) this.metricState.silenceStart = ctx.silenceStart;
    if ('driftStart' in ctx) this.metricState.driftStart = ctx.driftStart;
    if ('frameCount' in ctx) this.metricState.frameCount = ctx.frameCount;
    if ('lastFrameTime' in ctx) this.metricState.lastFrameTime = ctx.lastFrameTime;
    if ('lastSample' in ctx) this.metricState.lastSample = ctx.lastSample;
    if ('discontinuities' in ctx) this.metricState.discontinuities = ctx.discontinuities;
    if ('lastFormat' in ctx) this.metricState.lastFormat = ctx.lastFormat;

    // Update session tracking
    if ('sessionId' in ctx) this.metricState.sessionId = ctx.sessionId;
    if ('sessionStart' in ctx) this.metricState.sessionStart = ctx.sessionStart;
    if ('startTime' in ctx) this.metricState.startTime = ctx.startTime;
    if ('totalFrames' in ctx) this.metricState.totalFrames = ctx.totalFrames;
    if ('totalSilence' in ctx) this.metricState.totalSilence = ctx.totalSilence;
    if ('totalSpeech' in ctx) this.metricState.totalSpeech = ctx.totalSpeech;

    // Update counters
    if ('underruns' in ctx) this.metricState.underruns = ctx.underruns;
    if ('underflowCount' in ctx) this.metricState.underflowCount = ctx.underflowCount;
    if ('overflowCount' in ctx) this.metricState.overflowCount = ctx.overflowCount;
    if ('impulseCount' in ctx) this.metricState.impulseCount = ctx.impulseCount;
    if ('formatChanges' in ctx) this.metricState.formatChanges = ctx.formatChanges;
    if ('frameDrops' in ctx) this.metricState.frameDrops = ctx.frameDrops;
    if ('checksumErrors' in ctx) this.metricState.checksumErrors = ctx.checksumErrors;
    if ('syncErrors' in ctx) this.metricState.syncErrors = ctx.syncErrors;
    if ('errorCount' in ctx) this.metricState.errorCount = ctx.errorCount;
    if ('warningCount' in ctx) this.metricState.warningCount = ctx.warningCount;
    if ('flowControlEvents' in ctx) this.metricState.flowControlEvents = ctx.flowControlEvents;

    // Update buffer/pipeline state
    if ('availableFrames' in ctx) this.metricState.availableFrames = ctx.availableFrames;
    if ('bufferCapacity' in ctx) this.metricState.bufferCapacity = ctx.bufferCapacity;
    if ('bufferDepth' in ctx) this.metricState.bufferDepth = ctx.bufferDepth;
    if ('queueDepth' in ctx) this.metricState.queueDepth = ctx.queueDepth;
    if ('inputLatency' in ctx) this.metricState.inputLatency = ctx.inputLatency;
    if ('outputLatency' in ctx) this.metricState.outputLatency = ctx.outputLatency;
    if ('processingTime' in ctx) this.metricState.processingTime = ctx.processingTime;
    if ('chainPosition' in ctx) this.metricState.chainPosition = ctx.chainPosition;

    // Update system state
    if ('cpuUsage' in ctx) this.metricState.cpuUsage = ctx.cpuUsage;
    if ('memoryUsage' in ctx) this.metricState.memoryUsage = ctx.memoryUsage;
    if ('threadCount' in ctx) this.metricState.threadCount = ctx.threadCount;
    if ('sampleRate' in ctx) this.metricState.sampleRate = ctx.sampleRate;
    if ('bitDepth' in ctx) this.metricState.bitDepth = ctx.bitDepth;
    if ('channels' in ctx) this.metricState.channels = ctx.channels;
  },

  /**
   * Reset state (useful for new sessions)
   */
  resetState() {
    // Reset buffers
    this.metricState.shortTermBuffer = [];
    this.metricState.integratedBuffer = [];
    this.metricState.loudnessBuffer = [];
    this.metricState.vadHistory = [];
    this.metricState.speechDurations = [];
    this.metricState.silenceHistory = [];
    this.metricState.jitterBuffer = [];

    // Reset timing
    this.metricState.driftStart = Date.now();
    this.metricState.sessionStart = Date.now();
    this.metricState.startTime = Date.now();
    this.metricState.sessionId = `session_${Date.now()}_4444`;

    // Reset counters
    this.metricState.frameCount = 0;
    this.metricState.totalFrames = 0;
    this.metricState.totalSilence = 0;
    this.metricState.totalSpeech = 0;
    this.metricState.saturationCount = 0;
    this.metricState.discontinuities = 0;
    this.metricState.underruns = 0;
    this.metricState.underflowCount = 0;
    this.metricState.overflowCount = 0;
    this.metricState.impulseCount = 0;
    this.metricState.formatChanges = 0;
    this.metricState.frameDrops = 0;
    this.metricState.checksumErrors = 0;
    this.metricState.syncErrors = 0;
    this.metricState.errorCount = 0;
    this.metricState.warningCount = 0;
    this.metricState.flowControlEvents = 0;

    // Reset state flags
    this.metricState.currentSpeechStart = null;
    this.metricState.wasClipping = false;
    this.metricState.clipStart = null;
    this.metricState.silenceStart = null;
    this.metricState.lastFrameTime = null;
    this.metricState.lastSample = null;
    this.metricState.lastFormat = null;
  }
};

// Export for ES6 module system
export default Station3_4444_Handler;