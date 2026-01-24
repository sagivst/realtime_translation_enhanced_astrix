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
   * @param {object} [opts.databaseBridge] - optional DB bridge for segment index
   */
  constructor({
    baseDir = "/var/monitoring/audio",
    maxQueue = 5000,
    flushIntervalMs = 50,
    databaseBridge = null
  } = {}) {
    this.baseDir = baseDir;
    this.maxQueue = maxQueue;
    this.flushIntervalMs = flushIntervalMs;
    this.databaseBridge = databaseBridge;

    // Queue entries: { meta, pcm(Int16Array) }
    this.queue = [];
    this.timer = null;

    // Stats
    this.stats = {
      enqueued: 0,
      written: 0,
      dropped: 0,
      errors: 0
    };

    console.log(`[AudioWriter] Initialized: baseDir=${baseDir}, maxQueue=${maxQueue}`);
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this._drainOnce(), this.flushIntervalMs);
    if (this.timer?.unref) this.timer.unref();
    console.log(`[AudioWriter] Started with ${this.flushIntervalMs}ms flush interval`);
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;

    // Final drain (best-effort)
    let drained = 0;
    while (this.queue.length > 0 && drained < 100) {
      this._drainOnce();
      drained++;
    }
    console.log(`[AudioWriter] Stopped. Stats:`, this.stats);
  }

  /**
   * Non-blocking enqueue. Safe to call from the realtime path.
   * @param {{meta: object, pcm: Int16Array}} segment
   */
  enqueueSegment(segment) {
    if (!segment?.meta || !(segment?.pcm instanceof Int16Array)) return;

    this.stats.enqueued++;

    if (this.queue.length >= this.maxQueue) {
      // Drop oldest; never block realtime audio
      const dropped = this.queue.shift();
      this.stats.dropped++;
      console.warn(`[AudioWriter] Queue full, dropped oldest segment from ${dropped.meta.trace_id}`);
    }
    this.queue.push(segment);
  }

  /**
   * Get current stats (for monitoring)
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this.queue.length,
      queueUtilization: (this.queue.length / this.maxQueue) * 100
    };
  }

  _drainOnce() {
    const item = this.queue.shift();
    if (!item) return;

    try {
      const filePath = this._writeWavSegment(item.meta, item.pcm);
      this.stats.written++;

      // If database bridge is available, send segment index
      if (this.databaseBridge) {
        this._sendSegmentIndex(item.meta, filePath);
      }
    } catch (e) {
      // Drop on failure (baseline). Add bounded retries in a later iteration.
      this.stats.errors++;
      console.error(`[AudioWriter] Failed to write segment:`, e.message);
    }
  }

  _writeWavSegment(meta, pcm) {
    const dir = this._segmentDir(meta);
    const filename = `segment_${meta.bucket_ts_ms}.wav`;
    const filePath = path.join(dir, filename);

    // Create directory if it doesn't exist
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      // Ignore if already exists
    }

    const wav = this._encodeWavPcm16({
      pcm,
      sampleRate: meta.sample_rate_hz,
      channels: meta.channels
    });

    fs.writeFileSync(filePath, wav);

    // Log only every 10th write to reduce noise
    if (this.stats.written % 10 === 0) {
      console.log(`[AudioWriter] Written ${this.stats.written} segments (latest: ${meta.trace_id}/${meta.tap})`);
    }

    return filePath;
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

  _sendSegmentIndex(meta, filePath) {
    if (!this.databaseBridge) return;

    // Calculate file size for integrity
    let fileBytes = 0;
    try {
      const stats = fs.statSync(filePath);
      fileBytes = stats.size;
    } catch (e) {
      // Ignore
    }

    const indexData = {
      trace_id: meta.trace_id,
      station_key: meta.station_key,
      tap: meta.tap,
      bucket_ts_ms: meta.bucket_ts_ms,
      bucket_ms: meta.bucket_ms,
      sample_rate_hz: meta.sample_rate_hz,
      channels: meta.channels,
      format: meta.format,
      file_path: filePath,
      file_bytes: fileBytes
    };

    try {
      // Non-blocking send to DB bridge
      this.databaseBridge.sendAudioSegmentIndex(indexData);
    } catch (e) {
      // Don't fail write if index fails
      console.error(`[AudioWriter] Failed to send segment index:`, e.message);
    }
  }
}