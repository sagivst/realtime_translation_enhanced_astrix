
// STTTTSserver/Monitoring_Stations/station/generic/MetricsRegistry.js
// MANDATORY: canonical metric definitions + realtime-safe compute functions.
// Baseline metrics (realtime-safe): RMS dBFS, Peak dBFS, Clipping ratio.
//
// Assumptions:
// - Frame is PCM S16LE mono (Int16Array)
// - Full-scale (0 dBFS) ~= 32767
//
// Notes:
// - This module MUST NOT perform IO.
// - Functions MUST be deterministic and fast.
// - No FFT/Spectrogram here (those belong to async/offline workers).

const INT16_FS = 32767;
const EPS = 1e-12;

/**
 * Convert linear amplitude ratio to dBFS.
 * @param {number} ratio - 0..1
 * @returns {number} dBFS (<= 0)
 */
function ratioToDbfs(ratio) {
  // Protect against log(0)
  const r = Math.max(EPS, ratio);
  return 20 * Math.log10(r);
}

/**
 * Compute RMS in dBFS for a PCM frame.
 * @param {Int16Array} frame
 * @returns {number} rms_dbfs (<= 0)
 */
export function computeRmsDbfs(frame) {
  if (!frame || frame.length === 0) return NaN;

  let sumSq = 0;
  // Use float math; sumSq is up to ~ (32767^2)*N
  for (let i = 0; i < frame.length; i++) {
    const s = frame[i];
    sumSq += s * s;
  }
  const meanSq = sumSq / frame.length;
  const rms = Math.sqrt(meanSq);

  // Convert to ratio of full scale
  const ratio = rms / INT16_FS;
  return ratioToDbfs(ratio);
}

/**
 * Compute Peak in dBFS for a PCM frame.
 * @param {Int16Array} frame
 * @returns {number} peak_dbfs (<= 0)
 */
export function computePeakDbfs(frame) {
  if (!frame || frame.length === 0) return NaN;

  let peak = 0;
  for (let i = 0; i < frame.length; i++) {
    const a = Math.abs(frame[i]);
    if (a > peak) peak = a;
  }
  const ratio = peak / INT16_FS;
  return ratioToDbfs(ratio);
}

/**
 * Compute clipping ratio for a PCM frame.
 * "Clipped" means the sample is at or extremely near full scale.
 * We treat >= 32760 as clipped to be robust with gain/limiter rounding.
 *
 * @param {Int16Array} frame
 * @param {number} [clipThreshold=32760]
 * @returns {number} ratio 0..1
 */
export function computeClippingRatio(frame, clipThreshold = 32760) {
  if (!frame || frame.length === 0) return NaN;

  let clipped = 0;
  for (let i = 0; i < frame.length; i++) {
    const a = Math.abs(frame[i]);
    if (a >= clipThreshold) clipped++;
  }
  return clipped / frame.length;
}

/**
 * Optional: Zero Crossing Rate (realtime-safe), if you want it as a baseline metric.
 * Keep it here only if you will reference it in station handlers.
 */
export function computeZeroCrossingRate(frame) {
  if (!frame || frame.length < 2) return NaN;

  let zc = 0;
  let prev = frame[0];
  for (let i = 1; i < frame.length; i++) {
    const cur = frame[i];
    // Count sign changes (exclude zeros handling as minimal baseline)
    if ((prev < 0 && cur >= 0) || (prev >= 0 && cur < 0)) zc++;
    prev = cur;
  }
  // Return as crossings per frame (ratio-like). Convert to Hz only if you pass frame duration.
  return zc / (frame.length - 1);
}

// ----------------------------------------------------------------------------
// Canonical Registry
// ----------------------------------------------------------------------------

export const MetricsRegistry = {
  "pcm.rms_dbfs": {
    description: "Root Mean Square level in dBFS for the frame",
    unit: "dBFS",
    type: "float",
    realtimeSafe: true,
    compute: (frame /* Int16Array */, _ctx) => computeRmsDbfs(frame)
  },

  "pcm.peak_dbfs": {
    description: "Peak absolute sample in dBFS for the frame",
    unit: "dBFS",
    type: "float",
    realtimeSafe: true,
    compute: (frame, _ctx) => computePeakDbfs(frame)
  },

  "pcm.clipping_ratio": {
    description: "Ratio of clipped samples in the frame (>= 32760)",
    unit: "ratio",
    type: "float",
    realtimeSafe: true,
    compute: (frame, _ctx) => computeClippingRatio(frame)
  },

  // Keep only if you actually use it in station handlers
  "pcm.zero_crossing_rate": {
    description: "Zero crossing rate (sign changes per sample) for the frame",
    unit: "ratio",
    type: "float",
    realtimeSafe: true,
    compute: (frame, _ctx) => computeZeroCrossingRate(frame)
  }
};


⸻
