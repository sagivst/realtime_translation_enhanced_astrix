// STTTTSserver/Monitoring_Stations/audio/AudioRecorder.js
// MANDATORY: non-blocking capture, 5s aligned segments for PRE and POST.
// - capture() MUST enqueue only (no disk IO)
// - segment boundaries MUST align to bucketMs (5000ms)

export class AudioRecorder {
  /**
   * @param {object} opts
   * @param {number} opts.bucketMs - MUST be 5000
   * @param {number} opts.sampleRateHz - e.g. 16000
   * @param {number} opts.channels - MUST be 1 for baseline
   * @param {object} opts.audioWriter - instance of AudioWriter (has enqueueSegment)
   * @param {number} [opts.maxSamplesGuardMultiplier=2] - safety guard against runaway buffers
   */
  constructor({
    bucketMs = 5000,
    sampleRateHz = 16000,
    channels = 1,
    audioWriter,
    maxSamplesGuardMultiplier = 2
  }) {
    if (bucketMs !== 5000) throw new Error("AudioRecorder bucketMs MUST be 5000.");
    if (!audioWriter) throw new Error("AudioRecorder requires audioWriter.");
    if (channels !== 1) throw new Error("Baseline requires mono (channels=1).");

    this.bucketMs = bucketMs;
    this.sampleRateHz = sampleRateHz;
    this.channels = channels;
    this.audioWriter = audioWriter;

    this.expectedSamplesPerBucket = Math.round((this.bucketMs / 1000) * this.sampleRateHz) * this.channels;
    this.guardMaxSamples = this.expectedSamplesPerBucket * maxSamplesGuardMultiplier;

    // Per-stream state:
    // key = `${trace_id}|${station_key}|${tap}`
    // state = { currentBucketTsMs, buffers: Int16Array[], totalSamples }
    this.streamState = new Map();

    console.log(`[AudioRecorder] Initialized: ${bucketMs}ms buckets, ${sampleRateHz}Hz, expecting ${this.expectedSamplesPerBucket} samples/bucket`);
  }

  /**
   * Capture an incoming PCM frame into a 5s aligned segment buffer.
   * MUST be non-blocking and MUST not do any IO.
   *
   * @param {Int16Array|Buffer} frame - PCM S16LE mono
   * @param {object} ctx - MUST include trace_id and station_key
   * @param {"PRE"|"POST"} tap
   */
  capture(frame, ctx, tap) {
    if (!ctx?.trace_id || !ctx?.station_key) return;
    if (tap !== "PRE" && tap !== "POST") return;

    const nowMs = Date.now();
    const bucketTsMs = this._floorToBucket(nowMs);
    const pcm = this._toInt16Array(frame);
    if (pcm.length === 0) return;

    const key = `${ctx.trace_id}|${ctx.station_key}|${tap}`;

    let st = this.streamState.get(key);
    if (!st) {
      st = this._newStreamState(bucketTsMs);
      this.streamState.set(key, st);
    }

    // If we moved to a new bucket, finalize the previous bucket segment first
    if (bucketTsMs !== st.currentBucketTsMs) {
      this._finalizeAndEnqueueSegment(ctx, tap, st);

      st.currentBucketTsMs = bucketTsMs;
      st.buffers = [];
      st.totalSamples = 0;
    }

    // Append buffer reference (minimal work, no copies)
    st.buffers.push(pcm);
    st.totalSamples += pcm.length;

    // Safety guard: prevent runaway memory if bucket rotation fails
    if (st.totalSamples > this.guardMaxSamples) {
      console.warn(`[AudioRecorder] Guard triggered: ${st.totalSamples} samples > ${this.guardMaxSamples}`);
      this._finalizeAndEnqueueSegment(ctx, tap, st);
      st.currentBucketTsMs = bucketTsMs;
      st.buffers = [];
      st.totalSamples = 0;
    }
  }

  /**
   * Flush all open segments for a trace (call end).
   * Call this from your call lifecycle cleanup if available.
   *
   * @param {string} trace_id
   */
  flushTrace(trace_id) {
    let flushed = 0;
    for (const [key, st] of this.streamState.entries()) {
      if (!key.startsWith(`${trace_id}|`)) continue;

      const [tId, station_key, tap] = key.split("|");
      this._finalizeAndEnqueueSegment({ trace_id: tId, station_key }, tap, st);
      this.streamState.delete(key);
      flushed++;
    }
    if (flushed > 0) {
      console.log(`[AudioRecorder] Flushed ${flushed} segments for trace: ${trace_id}`);
    }
  }

  /**
   * Get current state (for monitoring/debugging)
   */
  getState() {
    const state = {
      activeStreams: this.streamState.size,
      streams: []
    };

    for (const [key, st] of this.streamState.entries()) {
      const [trace_id, station_key, tap] = key.split("|");
      state.streams.push({
        trace_id,
        station_key,
        tap,
        currentBucket: new Date(st.currentBucketTsMs).toISOString(),
        buffersCount: st.buffers.length,
        totalSamples: st.totalSamples
      });
    }

    return state;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  _newStreamState(bucketTsMs) {
    return {
      currentBucketTsMs: bucketTsMs,
      buffers: [],
      totalSamples: 0
    };
  }

  _finalizeAndEnqueueSegment(ctx, tap, st) {
    if (st.buffers.length === 0) return; // Nothing to finalize

    // Build exactly 5s audio by merging all frames and then padding/truncating.
    const merged = this._mergeAndFit(st.buffers, this.expectedSamplesPerBucket);

    const meta = {
      trace_id: String(ctx.trace_id),
      station_key: String(ctx.station_key),
      tap,
      bucket_ts_ms: st.currentBucketTsMs,
      bucket_ms: this.bucketMs,
      sample_rate_hz: this.sampleRateHz,
      channels: this.channels,
      format: "WAV_PCM_S16LE_MONO"
    };

    // Non-blocking handoff to async writer
    this.audioWriter.enqueueSegment({ meta, pcm: merged });

    // Reset internal buffer state (rotation handled by caller)
    st.buffers = [];
    st.totalSamples = 0;
  }

  _mergeAndFit(buffers, expectedSamples) {
    let total = 0;
    for (const b of buffers) total += b.length;

    const merged = new Int16Array(total);
    let off = 0;
    for (const b of buffers) {
      merged.set(b, off);
      off += b.length;
    }

    if (merged.length === expectedSamples) return merged;

    if (merged.length > expectedSamples) {
      // Truncate to expected size
      return merged.subarray(0, expectedSamples);
    }

    // Pad with zeros to expected size
    const out = new Int16Array(expectedSamples);
    out.set(merged, 0);
    return out;
  }

  _floorToBucket(tsMs) {
    return Math.floor(tsMs / this.bucketMs) * this.bucketMs;
  }

  _toInt16Array(frame) {
    if (frame instanceof Int16Array) return frame;

    if (Buffer.isBuffer(frame)) {
      if (frame.length % 2 !== 0) return new Int16Array(0);
      return new Int16Array(frame.buffer, frame.byteOffset, frame.length / 2);
    }

    return new Int16Array(0);
  }
}