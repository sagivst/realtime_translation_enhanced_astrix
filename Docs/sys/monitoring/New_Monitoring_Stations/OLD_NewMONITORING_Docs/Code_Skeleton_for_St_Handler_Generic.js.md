
// STTTTSserver/Monitoring_Stations/station/generic/St_Handler_Generic.js
// MANDATORY: realtime-safe core handler
// - PRE metrics + PRE audio capture
// - applyKnobs (gain + limiter) in-memory
// - POST metrics + POST audio capture
// - 5s aggregation -> MetricsEmitter (async)
// NOTE: This file MUST NOT do any disk IO or network IO.

import { MetricsRegistry } from "./MetricsRegistry.js";
import { KnobsRegistry } from "./KnobsRegistry.js";
import { Aggregator } from "./Aggregator.js";
import { KnobsResolver } from "./KnobsResolver.js";

export class St_Handler_Generic {
  /**
   * @param {object} opts
   * @param {object} opts.config - loaded Station3Handler.json (baseline)
   * @param {object} opts.metricsEmitter - bridge/MetricsEmitter instance
   * @param {object} opts.audioRecorder - audio/AudioRecorder instance
   * @param {number} opts.bucketMs - MUST be 5000
   */
  constructor({ config, metricsEmitter, audioRecorder, bucketMs = 5000 }) {
    if (bucketMs !== 5000) {
      throw new Error("bucketMs MUST be 5000 (fixed 5-second aggregation).");
    }

    this.config = config;
    this.metricsEmitter = metricsEmitter;
    this.audioRecorder = audioRecorder;

    this.bucketMs = bucketMs;
    this.aggregator = new Aggregator({
      bucketMs: this.bucketMs,
      onFlush: (batch) => this.metricsEmitter.emitBatch(batch), // MUST be non-blocking
    });

    this.knobsResolver = new KnobsResolver({
      baselineKnobs: config?.knobs || {},
      knobsRegistry: KnobsRegistry,
    });

    // Station registry (thin adapters)
    this.stationHandlers = new Map();

    // Startup validations (fail fast)
    this._validateBaselineKnobs(config?.knobs || {});
  }

  registerStation(stationHandler) {
    // Mandatory shape checks
    if (!stationHandler?.stationKey) throw new Error("Station handler missing stationKey");
    if (!Array.isArray(stationHandler?.preMetrics)) throw new Error("Station handler missing preMetrics[]");
    if (!Array.isArray(stationHandler?.postMetrics)) throw new Error("Station handler missing postMetrics[]");
    if (typeof stationHandler?.onFrame !== "function") throw new Error("Station handler missing onFrame()");

    // Validate that all referenced metrics exist (fail fast)
    this._validateMetricKeys(stationHandler.preMetrics, "preMetrics", stationHandler.stationKey);
    this._validateMetricKeys(stationHandler.postMetrics, "postMetrics", stationHandler.stationKey);

    this.stationHandlers.set(stationHandler.stationKey, stationHandler);
  }

  start() {
    // The Aggregator owns time-based flushing if needed.
    // If Aggregator uses a timer internally, it should start here.
    this.aggregator.start();
  }

  stop() {
    this.aggregator.stop();
  }

  /**
   * Core entry: called by Station handler
   * @param {Buffer|Int16Array} frame - PCM S16LE mono frame
   * @param {object} ctx - context must include trace_id and station_key
   * @param {object} stationHandler - thin adapter used to read preMetrics/postMetrics
   * @returns {Buffer|Int16Array} processed frame
   */
  processFrame(frame, ctx, stationHandler) {
    // Mandatory context fields
    if (!ctx?.trace_id) throw new Error("ctx.trace_id is required");
    if (!ctx?.station_key) throw new Error("ctx.station_key is required");

    // Ensure normalized frame type
    const input = this._toInt16Array(frame);

    // 1) PRE metrics + PRE audio capture (ALWAYS)
    this.computeMetrics(input, ctx, "PRE", stationHandler.preMetrics);
    this.audioRecorder.capture(input, ctx, "PRE"); // MUST be non-blocking

    // 2) Apply knobs (in-memory)
    const knobs = this.knobsResolver.getEffectiveKnobs(ctx);
    const processed = this.applyKnobs(input, knobs, ctx);

    // 3) POST metrics + POST audio capture (ALWAYS)
    this.computeMetrics(processed, ctx, "POST", stationHandler.postMetrics);
    this.audioRecorder.capture(processed, ctx, "POST"); // MUST be non-blocking

    // 4) Return processed frame to main pipeline
    return processed;
  }

  /**
   * Compute metrics for a given tap and add to Aggregator (5s buckets)
   * MUST stay realtime-safe (no IO, no heavy compute)
   */
  computeMetrics(int16Frame, ctx, tap, metricKeys) {
    const nowMs = Date.now();
    const bucketTsMs = Math.floor(nowMs / this.bucketMs) * this.bucketMs;

    for (const key of metricKeys) {
      const def = MetricsRegistry[key];
      if (!def) {
        // fail fast in dev; in prod you may keep throwing as well.
        throw new Error(`Unknown metric key: ${key}`);
      }
      if (!def.realtimeSafe) {
        // Hard rule for initial baseline: do not compute heavy metrics in realtime path
        throw new Error(`Metric ${key} is not realtimeSafe but is scheduled for realtime computation`);
      }

      let value;
      try {
        value = def.compute(int16Frame, ctx);
      } catch (e) {
        // Never throw from realtime compute due to a single metric bug.
        // Record NaN and continue.
        value = NaN;
      }

      this.aggregator.addSample({
        trace_id: ctx.trace_id,
        station_key: ctx.station_key,
        tap,
        metric_key: key,
        bucket_ts_ms: bucketTsMs,
        value,
      });
    }
  }

  /**
   * applyKnobs(): basic, deterministic audio shaping
   * - Gain: pcm.input_gain_db
   * - Limiter: pcm.limiter_threshold_dbfs (hard limiter)
   * All operations are sample-by-sample and realtime safe.
   *
   * @param {Int16Array} input
   * @param {object} knobs
   * @returns {Int16Array} processed output (new buffer)
   */
  applyKnobs(input, knobs, ctx) {
    // Defaults if missing
    const gainDb = this._num(knobs["pcm.input_gain_db"], 0);
    const limiterDbfs = this._num(knobs["pcm.limiter_threshold_dbfs"], -6);

    // Convert dB to linear gain
    const gainLin = Math.pow(10, gainDb / 20);

    // Convert limiter threshold (dBFS) to absolute int16 sample threshold.
    // 0 dBFS ~= full scale int16: 32767.
    // thresholdAmp = 32767 * 10^(dBFS/20)
    const threshold = Math.max(
      1,
      Math.min(32767, Math.round(32767 * Math.pow(10, limiterDbfs / 20)))
    );

    const out = new Int16Array(input.length);

    for (let i = 0; i < input.length; i++) {
      // Apply gain in float
      let s = input[i] * gainLin;

      // Hard limiter clip
      if (s > threshold) s = threshold;
      else if (s < -threshold) s = -threshold;

      // Clamp to int16
      if (s > 32767) s = 32767;
      else if (s < -32768) s = -32768;

      out[i] = s | 0;
    }

    // Optional: attach processing latency estimate if you have it
    // ctx.processing_latency_ms = ...

    return out;
  }

  // ===========================================================================
  // Startup / Validation Helpers
  // ===========================================================================

  _validateBaselineKnobs(knobs) {
    for (const [key, value] of Object.entries(knobs)) {
      const def = KnobsRegistry[key];
      if (!def) {
        throw new Error(`Unknown knob in config: ${key}`);
      }
      if (def.type === "float" || def.type === "int") {
        if (typeof value !== "number" || Number.isNaN(value)) {
          throw new Error(`Invalid knob value type for ${key}: expected number`);
        }
        if (value < def.min || value > def.max) {
          throw new Error(`Knob out of range ${key}=${value} (allowed ${def.min}..${def.max})`);
        }
      }
      if (def.type === "bool" && typeof value !== "boolean") {
        throw new Error(`Invalid knob value type for ${key}: expected boolean`);
      }
      if (def.type === "enum") {
        if (!def.values?.includes(value)) {
          throw new Error(`Invalid knob enum value for ${key}: ${value}`);
        }
      }
    }
  }

  _validateMetricKeys(keys, fieldName, stationKey) {
    for (const k of keys) {
      if (!MetricsRegistry[k]) {
        throw new Error(`Station ${stationKey} references unknown metric in ${fieldName}: ${k}`);
      }
    }
  }

  // ===========================================================================
  // Frame Type Helpers
  // ===========================================================================

  _toInt16Array(frame) {
    if (frame instanceof Int16Array) return frame;

    if (Buffer.isBuffer(frame)) {
      // Buffer length must be even for int16
      if (frame.length % 2 !== 0) throw new Error("PCM buffer length must be even (S16LE)");
      return new Int16Array(frame.buffer, frame.byteOffset, frame.length / 2);
    }

    throw new Error("Unsupported frame type. Expected Buffer or Int16Array (PCM S16LE).");
  }

  _num(v, fallback) {
    return (typeof v === "number" && !Number.isNaN(v)) ? v : fallback;
  }
}


⸻

Notes (Implementation MUSTs)
	1.	AudioRecorder.capture() MUST be non-blocking (enqueue only).
	2.	Aggregator.addSample() MUST be non-blocking (in-memory only).
	3.	MetricsEmitter.emitBatch() MUST be non-blocking.
	4.	Heavy metrics (FFT/Spectrogram) are NOT allowed in MetricsRegistry as realtimeSafe:true unless moved to a dedicated async worker.
	5.	bucketMs is fixed to 5000.

⸻