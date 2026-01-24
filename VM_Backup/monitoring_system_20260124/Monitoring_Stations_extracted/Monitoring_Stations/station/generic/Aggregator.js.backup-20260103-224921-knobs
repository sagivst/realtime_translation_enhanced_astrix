// STTTTSserver/Monitoring_Stations/station/generic/Aggregator.js
// MANDATORY: 5-second aggregation, non-blocking addSample(), time-based flush.
// - In-memory only. No disk IO. No network IO.

export class Aggregator {
  /**
   * @param {object} opts
   * @param {number} opts.bucketMs - MUST be 5000
   * @param {(batch: object[]) => void} opts.onFlush - MUST be non-blocking (enqueue to MetricsEmitter)
   * @param {number} [opts.flushJitterMs=50] - small guard to avoid edge cases at boundary
   */
  constructor({ bucketMs = 5000, onFlush, flushJitterMs = 50 }) {
    if (bucketMs !== 5000) {
      throw new Error("Aggregator bucketMs MUST be 5000.");
    }
    if (typeof onFlush !== "function") {
      throw new Error("Aggregator requires onFlush(batch) callback.");
    }

    this.bucketMs = bucketMs;
    this.onFlush = onFlush;
    this.flushJitterMs = flushJitterMs;

    // Map<bucket_ts_ms, Map<seriesKey, AggState>>
    // seriesKey = `${trace_id}|${station_key}|${tap}|${metric_key}`
    this.buckets = new Map();

    // Timer handle
    this.timer = null;

    // Optional guard: avoid unbounded growth if something goes wrong
    this.maxBucketsInMemory = 2000; // deterministic safety limit
  }

  start() {
    if (this.timer) return;

    // Align flush to next bucket boundary
    const now = Date.now();
    const next = this._nextBucketBoundaryMs(now);

    const delay = Math.max(0, next - now + this.flushJitterMs);

    // First tick aligns to boundary; after that, fixed interval
    this.timer = setTimeout(() => {
      this._flushClosedBuckets(Date.now());
      this.timer = setInterval(() => this._flushClosedBuckets(Date.now()), this.bucketMs);
    }, delay);

    // Node: avoid keeping process alive just because of this timer
    if (this.timer?.unref) this.timer.unref();

    console.log(`[Aggregator] Started with ${this.bucketMs}ms buckets`);
  }

  stop() {
    if (!this.timer) return;

    // If first alignment was a timeout, clear it;
    // if it became an interval, clearInterval works too for Node timers.
    clearTimeout(this.timer);
    clearInterval(this.timer);
    this.timer = null;

    // Final flush: everything we have (including current bucket)
    this.flushAll();

    console.log(`[Aggregator] Stopped and flushed all buckets`);
  }

  /**
   * Non-blocking sample ingestion.
   * @param {object} s
   * @param {string} s.trace_id
   * @param {string} s.station_key
   * @param {"PRE"|"POST"} s.tap
   * @param {string} s.metric_key
   * @param {number} s.bucket_ts_ms - precomputed bucket start (must be aligned)
   * @param {number} s.value
   */
  addSample(s) {
    // Minimal validation (fast)
    if (!s || !s.trace_id || !s.station_key || !s.tap || !s.metric_key) return;
    if (typeof s.bucket_ts_ms !== "number") return;

    // Safety: ensure bucket aligned
    const bucketTs = this._floorToBucket(s.bucket_ts_ms);
    const seriesKey = `${s.trace_id}|${s.station_key}|${s.tap}|${s.metric_key}`;

    let seriesMap = this.buckets.get(bucketTs);
    if (!seriesMap) {
      // Hard limit guard
      if (this.buckets.size >= this.maxBucketsInMemory) {
        // Drop oldest bucket deterministically; never block audio
        const oldest = this._minKey(this.buckets);
        if (oldest !== null) {
          console.warn(`[Aggregator] Dropping oldest bucket due to memory limit: ${new Date(oldest).toISOString()}`);
          this.buckets.delete(oldest);
        }
      }
      seriesMap = new Map();
      this.buckets.set(bucketTs, seriesMap);
    }

    let agg = seriesMap.get(seriesKey);
    if (!agg) {
      agg = {
        trace_id: s.trace_id,
        station_key: s.station_key,
        tap: s.tap,
        metric_key: s.metric_key,
        bucket_ts_ms: bucketTs,

        count: 0,
        min: Infinity,
        max: -Infinity,
        sum: 0,
        last: null
      };
      seriesMap.set(seriesKey, agg);
    }

    const v = (typeof s.value === "number") ? s.value : NaN;

    agg.count += 1;
    // If v is NaN, we still count it but do not update min/max/sum
    if (!Number.isNaN(v)) {
      if (v < agg.min) agg.min = v;
      if (v > agg.max) agg.max = v;
      agg.sum += v;
      agg.last = v;
    } else {
      // Keep last unchanged if v is NaN
      if (agg.last === null) agg.last = NaN;
    }
  }

  /**
   * Flushes buckets strictly older than the current open bucket.
   * Called on timer.
   */
  _flushClosedBuckets(nowMs) {
    const currentBucket = this._floorToBucket(nowMs);

    const toFlush = [];
    for (const [bucketTs, seriesMap] of this.buckets.entries()) {
      // Closed buckets are those < currentBucket
      if (bucketTs < currentBucket) {
        toFlush.push(bucketTs);
      }
    }
    if (toFlush.length === 0) return;

    // Flush in chronological order
    toFlush.sort((a, b) => a - b);

    for (const bucketTs of toFlush) {
      const seriesMap = this.buckets.get(bucketTs);
      if (!seriesMap) continue;

      const batch = this._buildBatchFromSeriesMap(seriesMap, bucketTs);

      // Remove before calling onFlush (never retain if downstream is slow)
      this.buckets.delete(bucketTs);

      // MUST be non-blocking
      try {
        this.onFlush(batch);
        console.log(`[Aggregator] Flushed bucket ${new Date(bucketTs).toISOString()} with ${batch.length} series`);
      } catch (e) {
        // Swallow errors: never crash realtime due to monitoring emission
        console.error(`[Aggregator] Error in onFlush callback:`, e.message);
      }
    }
  }

  /**
   * Flush everything we currently have (including open bucket).
   * Used on shutdown or explicit call.
   */
  flushAll() {
    if (this.buckets.size === 0) return;

    const keys = Array.from(this.buckets.keys()).sort((a, b) => a - b);
    for (const bucketTs of keys) {
      const seriesMap = this.buckets.get(bucketTs);
      if (!seriesMap) continue;

      const batch = this._buildBatchFromSeriesMap(seriesMap, bucketTs);
      this.buckets.delete(bucketTs);

      try {
        this.onFlush(batch);
        console.log(`[Aggregator] Force-flushed bucket ${new Date(bucketTs).toISOString()} with ${batch.length} series`);
      } catch (e) {
        // never throw
        console.error(`[Aggregator] Error in onFlush callback:`, e.message);
      }
    }
  }

  _buildBatchFromSeriesMap(seriesMap, bucketTs) {
    const batch = [];

    for (const agg of seriesMap.values()) {
      // Normalize min/max for empty numeric samples
      const hasNumeric = (agg.min !== Infinity && agg.max !== -Infinity && typeof agg.last === "number");

      const avg = (agg.count > 0 && hasNumeric)
        ? (agg.sum / this._numericCountApprox(agg))
        : NaN;

      // NOTE:
      // We increment count even for NaN values; avg should be based on numeric values.
      // For simplicity, we approximate numeric count using:
      // - if last is NaN and min/max are Infinity/-Infinity => zero numeric
      // - else numeric count = count (works if compute never outputs NaN)
      // For stricter accuracy, track numericCount separately (recommended in next iteration).
      batch.push({
        trace_id: agg.trace_id,
        station_key: agg.station_key,
        tap: agg.tap,
        metric_key: agg.metric_key,
        bucket_ts_ms: bucketTs,
        bucket_ms: this.bucketMs,

        count: agg.count,
        min: hasNumeric ? agg.min : NaN,
        max: hasNumeric ? agg.max : NaN,
        sum: hasNumeric ? agg.sum : NaN,
        avg,
        last: agg.last
      });
    }

    return batch;
  }

  _numericCountApprox(agg) {
    // Minimal approximation for baseline skeleton:
    // If at least one numeric sample exists, assume count is numeric count.
    // For strict behavior, add agg.numericCount in addSample().
    return (agg.min !== Infinity) ? agg.count : 0;
  }

  _floorToBucket(tsMs) {
    return Math.floor(tsMs / this.bucketMs) * this.bucketMs;
  }

  _nextBucketBoundaryMs(nowMs) {
    const floored = this._floorToBucket(nowMs);
    return floored + this.bucketMs;
  }

  _minKey(map) {
    let min = null;
    for (const k of map.keys()) {
      if (min === null || k < min) min = k;
    }
    return min;
  }
}