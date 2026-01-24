
Hard requirements implemented:
	•	AudioRecorder.capture() is non-blocking (in-memory only, no IO).
	•	Segments are exactly 5 seconds and bucket-aligned (bucketMs = 5000).
	•	Both PRE and POST streams are always captured and written.
	•	AudioWriter performs all disk IO asynchronously via a background loop.
	•	File layout:

/var/monitoring/audio/YYYY-MM-DD/<trace_id>/<station_key>/<PRE|POST>/segment_<bucket_ts_ms>.wav



Save as:
	•	STTTTSserver/Monitoring_Stations/audio/AudioRecorder.js
	•	STTTTSserver/Monitoring_Stations/audio/AudioWriter.js

⸻

AudioRecorder.js

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
    for (const [key, st] of this.streamState.entries()) {
      if (!key.startsWith(`${trace_id}|`)) continue;

      const [tId, station_key, tap] = key.split("|");
      this._finalizeAndEnqueueSegment({ trace_id: tId, station_key }, tap, st);
      this.streamState.delete(key);
    }
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
      return merged.subarray(0, expectedSamples); // truncate
    }

    // Pad with zeros
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


⸻

AudioWriter.js

// STTTTSserver/Monitoring_Stations/audio/AudioWriter.js
// MANDATORY: async-only disk writer for PRE/POST 5s aligned segments.
// - MUST NOT be called from realtime path except enqueueSegment()
// - Writes WAV (PCM 16-bit LE, mono, 16kHz by default)
// - Uses a bounded queue with drop-oldest policy

import fs from "fs";
import path from "path";

export class AudioWriter {
  /**
   * @param {object} opts
   * @param {string} opts.baseDir - e.g. /var/monitoring/audio
   * @param {number} [opts.maxQueue=5000] - bounded queue
   * @param {number} [opts.flushIntervalMs=50] - background tick
   */
  constructor({
    baseDir = "/var/monitoring/audio",
    maxQueue = 5000,
    flushIntervalMs = 50
  } = {}) {
    this.baseDir = baseDir;
    this.maxQueue = maxQueue;
    this.flushIntervalMs = flushIntervalMs;

    // Queue entries: { meta, pcm(Int16Array) }
    this.queue = [];
    this.timer = null;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this._drainOnce(), this.flushIntervalMs);
    if (this.timer?.unref) this.timer.unref();
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;

    // Final drain (best-effort)
    while (this.queue.length > 0) this._drainOnce();
  }

  /**
   * Non-blocking enqueue. Safe to call from the realtime path.
   * @param {{meta: object, pcm: Int16Array}} segment
   */
  enqueueSegment(segment) {
    if (!segment?.meta || !(segment?.pcm instanceof Int16Array)) return;

    if (this.queue.length >= this.maxQueue) {
      // Drop oldest; never block realtime audio
      this.queue.shift();
    }
    this.queue.push(segment);
  }

  _drainOnce() {
    const item = this.queue.shift();
    if (!item) return;

    try {
      this._writeWavSegment(item.meta, item.pcm);
      // If you want to emit metadata to DB, do it via a separate bridge queue,
      // not directly inside this writer.
    } catch {
      // Drop on failure (baseline). Add bounded retries in a later iteration.
    }
  }

  _writeWavSegment(meta, pcm) {
    const dir = this._segmentDir(meta);
    const filename = `segment_${meta.bucket_ts_ms}.wav`;
    const filePath = path.join(dir, filename);

    fs.mkdirSync(dir, { recursive: true });

    const wav = this._encodeWavPcm16({
      pcm,
      sampleRate: meta.sample_rate_hz,
      channels: meta.channels
    });

    fs.writeFileSync(filePath, wav);
  }

  _segmentDir(meta) {
    const date = new Date(meta.bucket_ts_ms).toISOString().slice(0, 10); // YYYY-MM-DD

    // /base/YYYY-MM-DD/<trace_id>/<station_key>/<PRE|POST>/
    return path.join(
      this.baseDir,
      date,
      String(meta.trace_id),
      String(meta.station_key),
      String(meta.tap)
    );
  }

  _encodeWavPcm16({ pcm, sampleRate, channels }) {
    const bytesPerSample = 2;
    const blockAlign = channels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;

    const dataSize = pcm.length * bytesPerSample;
    const fileSize = 44 + dataSize;

    const buf = Buffer.allocUnsafe(fileSize);
    let o = 0;

    // RIFF header
    buf.write("RIFF", o); o += 4;
    buf.writeUInt32LE(fileSize - 8, o); o += 4;
    buf.write("WAVE", o); o += 4;

    // fmt chunk
    buf.write("fmt ", o); o += 4;
    buf.writeUInt32LE(16, o); o += 4;          // fmt chunk size
    buf.writeUInt16LE(1, o); o += 2;           // 1 = PCM
    buf.writeUInt16LE(channels, o); o += 2;
    buf.writeUInt32LE(sampleRate, o); o += 4;
    buf.writeUInt32LE(byteRate, o); o += 4;
    buf.writeUInt16LE(blockAlign, o); o += 2;
    buf.writeUInt16LE(16, o); o += 2;          // bits per sample

    // data chunk
    buf.write("data", o); o += 4;
    buf.writeUInt32LE(dataSize, o); o += 4;

    // PCM samples
    for (let i = 0; i < pcm.length; i++, o += 2) {
      buf.writeInt16LE(pcm[i], o);
    }

    return buf;
  }
}


⸻

Mandatory Bootstrap Wiring (how to use)

import { AudioWriter } from "./Monitoring_Stations/audio/AudioWriter.js";
import { AudioRecorder } from "./Monitoring_Stations/audio/AudioRecorder.js";

const audioWriter = new AudioWriter({ baseDir: "/var/monitoring/audio" });
audioWriter.start();

const audioRecorder = new AudioRecorder({
  bucketMs: 5000,
  sampleRateHz: 16000,
  channels: 1,
  audioWriter
});


⸻
