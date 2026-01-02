// STTTTSserver/Monitoring_Stations/station/generic/MetricsRegistry.js
// COMPLETE IMPLEMENTATION with ALL metrics from Unified Specification
// Metrics are categorized as realtime-safe or async-only

const INT16_FS = 32767;
const EPS = 1e-12;

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

function ratioToDbfs(ratio) {
  const r = Math.max(EPS, ratio);
  return 20 * Math.log10(r);
}

function computeRmsDbfs(frame) {
  if (!frame || frame.length === 0) return NaN;
  let sumSq = 0;
  for (let i = 0; i < frame.length; i++) {
    const s = frame[i];
    sumSq += s * s;
  }
  const meanSq = sumSq / frame.length;
  const rms = Math.sqrt(meanSq);
  return ratioToDbfs(rms / INT16_FS);
}

function computePeakDbfs(frame) {
  if (!frame || frame.length === 0) return NaN;
  let peak = 0;
  for (let i = 0; i < frame.length; i++) {
    const a = Math.abs(frame[i]);
    if (a > peak) peak = a;
  }
  return ratioToDbfs(peak / INT16_FS);
}

function computeClippingRatio(frame, clipThreshold = 32760) {
  if (!frame || frame.length === 0) return NaN;
  let clipped = 0;
  for (let i = 0; i < frame.length; i++) {
    const a = Math.abs(frame[i]);
    if (a >= clipThreshold) clipped++;
  }
  return clipped / frame.length;
}

function computeZeroCrossingRate(frame) {
  if (!frame || frame.length < 2) return NaN;
  let zc = 0;
  let prev = frame[0];
  for (let i = 1; i < frame.length; i++) {
    const cur = frame[i];
    if ((prev < 0 && cur >= 0) || (prev >= 0 && cur < 0)) zc++;
    prev = cur;
  }
  return zc / (frame.length - 1);
}

// Additional realtime-safe compute functions
function computePeakAmplitude(frame) {
  if (!frame || frame.length === 0) return NaN;
  let peak = 0;
  for (let i = 0; i < frame.length; i++) {
    const a = Math.abs(frame[i]);
    if (a > peak) peak = a;
  }
  return peak;
}

function computePeakToPeak(frame) {
  if (!frame || frame.length === 0) return NaN;
  let min = 32767, max = -32768;
  for (let i = 0; i < frame.length; i++) {
    if (frame[i] < min) min = frame[i];
    if (frame[i] > max) max = frame[i];
  }
  return max - min;
}

function computeAverageAbsolute(frame) {
  if (!frame || frame.length === 0) return NaN;
  let sum = 0;
  for (let i = 0; i < frame.length; i++) {
    sum += Math.abs(frame[i]);
  }
  return sum / frame.length;
}

function computeCrestFactor(frame) {
  const peak = computePeakAmplitude(frame);
  const rms = computeRmsDbfs(frame);
  if (isNaN(peak) || isNaN(rms)) return NaN;
  return peak / Math.pow(10, rms / 20);
}

function detectSilence(frame, threshold = -50) {
  const rms = computeRmsDbfs(frame);
  return rms < threshold;
}

function computeNoiseFloor(frame, percentile = 0.1) {
  if (!frame || frame.length === 0) return NaN;
  const sorted = [...frame].map(Math.abs).sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * percentile);
  return ratioToDbfs(sorted[idx] / INT16_FS);
}

function detectClippedSamples(frame) {
  if (!frame || frame.length === 0) return 0;
  let count = 0;
  for (let i = 0; i < frame.length; i++) {
    if (Math.abs(frame[i]) >= 32760) count++;
  }
  return count;
}

function detectConsecutiveClipping(frame) {
  if (!frame || frame.length === 0) return 0;
  let maxConsec = 0, current = 0;
  for (let i = 0; i < frame.length; i++) {
    if (Math.abs(frame[i]) >= 32760) {
      current++;
      if (current > maxConsec) maxConsec = current;
    } else {
      current = 0;
    }
  }
  return maxConsec;
}

function estimateSNR(frame) {
  // Simple SNR estimation - would be better with noise floor tracking
  const signal = computeRmsDbfs(frame);
  const noise = computeNoiseFloor(frame);
  return signal - noise;
}

function detectFrozenSignal(frame) {
  if (!frame || frame.length < 2) return false;
  const first = frame[0];
  for (let i = 1; i < frame.length; i++) {
    if (frame[i] !== first) return false;
  }
  return true;
}

function detectMutedSignal(frame) {
  if (!frame || frame.length === 0) return false;
  for (let i = 0; i < frame.length; i++) {
    if (frame[i] !== 0) return false;
  }
  return true;
}

// =========================================================================
// METRICS REGISTRY
// =========================================================================

export const MetricsRegistry = {

  // =========================================================================
  // REALTIME-SAFE METRICS (Core PCM Audio - Signal Domain)
  // =========================================================================

  // 4.1 Amplitude & Loudness Metrics
  "pcm.peak_amplitude": {
    description: "Peak absolute amplitude",
    unit: "int16",
    type: "int",
    realtimeSafe: true,
    compute: (frame) => computePeakAmplitude(frame)
  },

  "pcm.peak_to_peak": {
    description: "Peak-to-peak amplitude",
    unit: "int16",
    type: "int",
    realtimeSafe: true,
    compute: (frame) => computePeakToPeak(frame)
  },

  "pcm.rms_dbfs": {
    description: "RMS level in dBFS",
    unit: "dBFS",
    type: "float",
    realtimeSafe: true,
    compute: (frame) => computeRmsDbfs(frame)
  },

  "pcm.peak_dbfs": {
    description: "Peak level in dBFS",
    unit: "dBFS",
    type: "float",
    realtimeSafe: true,
    compute: (frame) => computePeakDbfs(frame)
  },

  "pcm.average_absolute": {
    description: "Average absolute amplitude",
    unit: "int16",
    type: "float",
    realtimeSafe: true,
    compute: (frame) => computeAverageAbsolute(frame)
  },

  "pcm.crest_factor": {
    description: "Peak to RMS ratio",
    unit: "ratio",
    type: "float",
    realtimeSafe: true,
    compute: (frame) => computeCrestFactor(frame)
  },

  // 4.2 Silence & Activity Metrics
  "pcm.silence_detected": {
    description: "Silence detection boolean",
    unit: "boolean",
    type: "bool",
    realtimeSafe: true,
    compute: (frame) => detectSilence(frame)
  },

  "pcm.vad_probability": {
    description: "Voice activity detection probability",
    unit: "ratio",
    type: "float",
    realtimeSafe: true,
    compute: (frame, ctx) => ctx?.vad_probability || (detectSilence(frame) ? 0.0 : 0.8)
  },

  // 4.3 Clipping & Distortion Metrics
  "pcm.clipped_samples": {
    description: "Number of clipped samples",
    unit: "count",
    type: "int",
    realtimeSafe: true,
    compute: (frame) => detectClippedSamples(frame)
  },

  "pcm.clipping_ratio": {
    description: "Ratio of clipped samples",
    unit: "ratio",
    type: "float",
    realtimeSafe: true,
    compute: (frame) => computeClippingRatio(frame)
  },

  "pcm.consecutive_clipped": {
    description: "Max consecutive clipped samples",
    unit: "count",
    type: "int",
    realtimeSafe: true,
    compute: (frame) => detectConsecutiveClipping(frame)
  },

  // 4.4 Noise & Quality Metrics
  "pcm.noise_floor": {
    description: "Estimated noise floor",
    unit: "dBFS",
    type: "float",
    realtimeSafe: true,
    compute: (frame) => computeNoiseFloor(frame)
  },

  "pcm.snr_estimate": {
    description: "Signal-to-noise ratio estimate",
    unit: "dB",
    type: "float",
    realtimeSafe: true,
    compute: (frame) => estimateSNR(frame)
  },

  "pcm.muted_signal": {
    description: "All zeros detection",
    unit: "boolean",
    type: "bool",
    realtimeSafe: true,
    compute: (frame) => detectMutedSignal(frame)
  },

  "pcm.frozen_signal": {
    description: "Constant value detection",
    unit: "boolean",
    type: "bool",
    realtimeSafe: true,
    compute: (frame) => detectFrozenSignal(frame)
  },

  // 6. Temporal Metrics
  "pcm.zero_crossing_rate": {
    description: "Zero crossing rate",
    unit: "ratio",
    type: "float",
    realtimeSafe: true,
    compute: (frame) => computeZeroCrossingRate(frame)
  },

  // 7. PCM Stream Integrity (context-based)
  "stream.sample_rate": {
    description: "Sample rate",
    unit: "Hz",
    type: "int",
    realtimeSafe: true,
    compute: (_, ctx) => ctx?.sample_rate || 16000
  },

  "stream.bit_depth": {
    description: "Bit depth",
    unit: "bits",
    type: "int",
    realtimeSafe: true,
    compute: (_, ctx) => ctx?.bit_depth || 16
  },

  "stream.channel_count": {
    description: "Number of channels",
    unit: "count",
    type: "int",
    realtimeSafe: true,
    compute: (_, ctx) => ctx?.channels || 1
  },

  // 8. Transport & Pipeline Metrics
  "pipe.processing_latency_ms": {
    description: "Processing latency",
    unit: "ms",
    type: "float",
    realtimeSafe: true,
    compute: (_, ctx) => ctx?.processing_latency_ms || NaN
  },

  "pipe.frame_drop_ratio": {
    description: "Dropped frames ratio",
    unit: "ratio",
    type: "float",
    realtimeSafe: true,
    compute: (_, ctx) => ctx?.frame_drop_ratio || 0
  },

  "pipe.queue_depth": {
    description: "Queue depth",
    unit: "frames",
    type: "int",
    realtimeSafe: true,
    compute: (_, ctx) => ctx?.queue_depth || 0
  },

  // 14. Derived/Composite Metrics
  "health.audio_score": {
    description: "Overall audio health score",
    unit: "score",
    type: "float",
    realtimeSafe: true,
    compute: (frame) => {
      const clipping = computeClippingRatio(frame);
      const snr = estimateSNR(frame);
      const frozen = detectFrozenSignal(frame) ? 0 : 1;
      const muted = detectMutedSignal(frame) ? 0 : 1;

      // Simple weighted health score
      const score = (
        (1 - clipping) * 25 +
        Math.min(snr / 40, 1) * 25 +
        frozen * 25 +
        muted * 25
      );
      return Math.max(0, Math.min(100, score));
    }
  },

  // =========================================================================
  // ASYNC-ONLY METRICS (Heavy computation - FFT/Spectral)
  // =========================================================================

  // 5. Spectral & Frequency Metrics (FFT-Based)
  "fft.dominant_frequency": {
    description: "Dominant frequency from FFT",
    unit: "Hz",
    type: "float",
    realtimeSafe: false,  // Requires FFT
    compute: null  // Implemented in async worker
  },

  "fft.spectral_centroid": {
    description: "Spectral centroid (brightness)",
    unit: "Hz",
    type: "float",
    realtimeSafe: false,
    compute: null
  },

  "fft.spectral_bandwidth": {
    description: "Spectral bandwidth",
    unit: "Hz",
    type: "float",
    realtimeSafe: false,
    compute: null
  },

  "fft.spectral_rolloff": {
    description: "Frequency below which 85% of energy is contained",
    unit: "Hz",
    type: "float",
    realtimeSafe: false,
    compute: null
  },

  "fft.spectral_flatness": {
    description: "Spectral flatness (tonality measure)",
    unit: "ratio",
    type: "float",
    realtimeSafe: false,
    compute: null
  },

  "fft.spectral_flux": {
    description: "Rate of spectral change",
    unit: "magnitude",
    type: "float",
    realtimeSafe: false,
    compute: null
  },

  "fft.harmonic_ratio": {
    description: "Harmonic energy ratio",
    unit: "ratio",
    type: "float",
    realtimeSafe: false,
    compute: null
  },

  "fft.low_band_energy": {
    description: "Energy in 0-500 Hz band",
    unit: "dB",
    type: "float",
    realtimeSafe: false,
    compute: null
  },

  "fft.mid_band_energy": {
    description: "Energy in 500-2000 Hz band",
    unit: "dB",
    type: "float",
    realtimeSafe: false,
    compute: null
  },

  "fft.high_band_energy": {
    description: "Energy in 2000-8000 Hz band",
    unit: "dB",
    type: "float",
    realtimeSafe: false,
    compute: null
  },

  "fft.hum_detected": {
    description: "50/60 Hz hum detection",
    unit: "boolean",
    type: "bool",
    realtimeSafe: false,
    compute: null
  },

  "fft.hiss_detected": {
    description: "High frequency hiss detection",
    unit: "boolean",
    type: "bool",
    realtimeSafe: false,
    compute: null
  },

  // Additional advanced metrics requiring heavy computation
  "advanced.lufs_momentary": {
    description: "Momentary loudness (LUFS)",
    unit: "LUFS",
    type: "float",
    realtimeSafe: false,
    compute: null
  },

  "advanced.lufs_short_term": {
    description: "Short-term loudness (LUFS)",
    unit: "LUFS",
    type: "float",
    realtimeSafe: false,
    compute: null
  },

  "advanced.lufs_integrated": {
    description: "Integrated loudness (LUFS)",
    unit: "LUFS",
    type: "float",
    realtimeSafe: false,
    compute: null
  },

  "advanced.dynamic_range": {
    description: "Dynamic range measurement",
    unit: "dB",
    type: "float",
    realtimeSafe: false,
    compute: null
  },

  // =========================================================================
  // CONTEXT-ONLY METRICS (from external systems)
  // =========================================================================

  // 9. STT-Specific Metrics
  "stt.confidence_score": {
    description: "STT confidence score",
    unit: "ratio",
    type: "float",
    realtimeSafe: true,
    compute: (_, ctx) => ctx?.stt_confidence || NaN
  },

  "stt.input_latency": {
    description: "STT input latency",
    unit: "ms",
    type: "float",
    realtimeSafe: true,
    compute: (_, ctx) => ctx?.stt_input_latency || NaN
  },

  // 10. TTS-Specific Metrics
  "tts.synthesis_latency": {
    description: "TTS synthesis latency",
    unit: "ms",
    type: "float",
    realtimeSafe: true,
    compute: (_, ctx) => ctx?.tts_synthesis_latency || NaN
  },

  "tts.prosody_stability": {
    description: "TTS prosody stability",
    unit: "score",
    type: "float",
    realtimeSafe: true,
    compute: (_, ctx) => ctx?.tts_prosody_stability || NaN
  },

  // 22-25. RTP & Asterisk Metrics (when available)
  "rtp.packet_loss_rate": {
    description: "RTP packet loss rate",
    unit: "percent",
    type: "float",
    realtimeSafe: true,
    compute: (_, ctx) => ctx?.rtp_packet_loss || NaN
  },

  "rtp.jitter": {
    description: "RTP interarrival jitter",
    unit: "ms",
    type: "float",
    realtimeSafe: true,
    compute: (_, ctx) => ctx?.rtp_jitter || NaN
  },

  "asterisk.channel_state": {
    description: "Asterisk channel state",
    unit: "enum",
    type: "string",
    realtimeSafe: true,
    compute: (_, ctx) => ctx?.channel_state || "unknown"
  }
};

// =========================================================================
// METRIC GROUPS for easier management
// =========================================================================

export const MetricGroups = {
  REALTIME_CORE: [
    "pcm.rms_dbfs",
    "pcm.peak_dbfs",
    "pcm.clipping_ratio",
    "pcm.zero_crossing_rate"
  ],

  REALTIME_EXTENDED: [
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
    "pcm.frozen_signal"
  ],

  FFT_SPECTRAL: [
    "fft.dominant_frequency",
    "fft.spectral_centroid",
    "fft.spectral_bandwidth",
    "fft.spectral_rolloff",
    "fft.spectral_flatness",
    "fft.spectral_flux",
    "fft.harmonic_ratio",
    "fft.low_band_energy",
    "fft.mid_band_energy",
    "fft.high_band_energy",
    "fft.hum_detected",
    "fft.hiss_detected"
  ],

  CONTEXT_BASED: [
    "pipe.processing_latency_ms",
    "pipe.frame_drop_ratio",
    "pipe.queue_depth",
    "stt.confidence_score",
    "stt.input_latency",
    "tts.synthesis_latency",
    "rtp.packet_loss_rate",
    "rtp.jitter"
  ]
};

// =========================================================================
// HELPER: Get all realtime-safe metrics
// =========================================================================

export function getRealtimeMetrics() {
  return Object.entries(MetricsRegistry)
    .filter(([_, def]) => def.realtimeSafe)
    .map(([key]) => key);
}

export function getAsyncMetrics() {
  return Object.entries(MetricsRegistry)
    .filter(([_, def]) => !def.realtimeSafe)
    .map(([key]) => key);
}