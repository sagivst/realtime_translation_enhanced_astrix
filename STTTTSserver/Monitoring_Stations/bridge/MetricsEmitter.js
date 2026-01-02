// STTTTSserver/Monitoring_Stations/bridge/MetricsEmitter.js
// MANDATORY: Async boundary for metrics emission
// - Bounded queue with drop-oldest policy
// - Worker thread for database operations
// - MUST NOT block the realtime path

import { Worker } from 'worker_threads';
import path from 'path';

export class MetricsEmitter {
  /**
   * @param {object} opts
   * @param {object} opts.databaseBridge - DatabaseBridge instance
   * @param {number} [opts.maxQueueSize=10000] - Max items in queue
   * @param {number} [opts.flushIntervalMs=200] - How often to flush
   * @param {number} [opts.batchSize=100] - Max items per flush
   */
  constructor({
    databaseBridge,
    maxQueueSize = 10000,
    flushIntervalMs = 200,
    batchSize = 100
  }) {
    if (!databaseBridge) {
      throw new Error("MetricsEmitter requires databaseBridge");
    }

    this.databaseBridge = databaseBridge;
    this.maxQueueSize = maxQueueSize;
    this.flushIntervalMs = flushIntervalMs;
    this.batchSize = batchSize;

    // Bounded queue
    this.queue = [];

    // Stats
    this.stats = {
      received: 0,
      emitted: 0,
      dropped: 0,
      errors: 0,
      lastFlush: null
    };

    // Timer for flush worker
    this.flushTimer = null;

    // Backpressure state
    this.isBackpressured = false;
    this.backpressureThreshold = maxQueueSize * 0.8;

    console.log(`[MetricsEmitter] Initialized: maxQueue=${maxQueueSize}, flush=${flushIntervalMs}ms, batch=${batchSize}`);
  }

  /**
   * Start the flush worker
   */
  start() {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      this._flushBatch();
    }, this.flushIntervalMs);

    // Don't keep process alive just for metrics
    if (this.flushTimer?.unref) {
      this.flushTimer.unref();
    }

    console.log(`[MetricsEmitter] Started flush worker (${this.flushIntervalMs}ms interval)`);
  }

  /**
   * Stop the flush worker
   */
  stop() {
    if (!this.flushTimer) return;

    clearInterval(this.flushTimer);
    this.flushTimer = null;

    // Final flush
    this._flushAll();

    console.log(`[MetricsEmitter] Stopped. Final stats:`, this.stats);
  }

  /**
   * Non-blocking emit of aggregated metrics batch
   * Called by Aggregator - MUST NOT BLOCK
   *
   * @param {Array} batch - Aggregated metrics from Aggregator
   */
  emitBatch(batch) {
    if (!Array.isArray(batch) || batch.length === 0) return;

    this.stats.received += batch.length;

    // Add each item to queue
    for (const item of batch) {
      this._enqueue(item);
    }

    // Check backpressure
    if (this.queue.length > this.backpressureThreshold && !this.isBackpressured) {
      this.isBackpressured = true;
      console.warn(`[MetricsEmitter] Backpressure triggered: queue=${this.queue.length}/${this.maxQueueSize}`);
    }
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this.queue.length,
      queueUtilization: (this.queue.length / this.maxQueueSize) * 100,
      isBackpressured: this.isBackpressured
    };
  }

  // =========================================================================
  // Private methods
  // =========================================================================

  _enqueue(item) {
    // Apply drop-oldest policy if queue is full
    if (this.queue.length >= this.maxQueueSize) {
      const dropped = this.queue.shift();
      this.stats.dropped++;

      // Log every 100 drops to avoid spam
      if (this.stats.dropped % 100 === 0) {
        console.warn(`[MetricsEmitter] Dropped ${this.stats.dropped} total items due to queue overflow`);
      }
    }

    // Add timestamp if missing
    if (!item.created_at) {
      item.created_at = new Date().toISOString();
    }

    this.queue.push(item);
  }

  async _flushBatch() {
    if (this.queue.length === 0) return;

    // Take up to batchSize items
    const batch = this.queue.splice(0, Math.min(this.batchSize, this.queue.length));

    try {
      // Send to database via bridge (async)
      await this.databaseBridge.sendAggregatedMetrics(batch);

      this.stats.emitted += batch.length;
      this.stats.lastFlush = new Date().toISOString();

      // Clear backpressure if queue is draining
      if (this.isBackpressured && this.queue.length < this.backpressureThreshold * 0.5) {
        this.isBackpressured = false;
        console.log(`[MetricsEmitter] Backpressure cleared: queue=${this.queue.length}`);
      }

      // Log progress every 1000 items
      if (this.stats.emitted % 1000 === 0) {
        console.log(`[MetricsEmitter] Emitted ${this.stats.emitted} total metrics`);
      }
    } catch (error) {
      this.stats.errors++;
      console.error(`[MetricsEmitter] Failed to emit batch:`, error.message);

      // Requeue on failure (if room)
      if (this.queue.length + batch.length <= this.maxQueueSize) {
        // Add back to front of queue for retry
        this.queue.unshift(...batch);
      } else {
        // Drop if no room
        this.stats.dropped += batch.length;
        console.error(`[MetricsEmitter] Dropped ${batch.length} items after emission failure (no room to requeue)`);
      }
    }
  }

  async _flushAll() {
    console.log(`[MetricsEmitter] Final flush of ${this.queue.length} items...`);

    let flushed = 0;
    const maxFlushAttempts = 10;

    while (this.queue.length > 0 && flushed < maxFlushAttempts) {
      await this._flushBatch();
      flushed++;
    }

    if (this.queue.length > 0) {
      console.warn(`[MetricsEmitter] ${this.queue.length} items remaining after final flush`);
    }
  }
}

// =========================================================================
// Worker Thread Support (optional for heavy processing)
// =========================================================================

export class MetricsEmitterWorker {
  /**
   * Create a metrics emitter that runs in a worker thread
   * This is optional and only needed for very high throughput
   */
  constructor(opts) {
    this.worker = new Worker(path.join(__dirname, 'MetricsEmitterWorker.js'), {
      workerData: opts
    });

    this.worker.on('message', (msg) => {
      if (msg.type === 'stats') {
        console.log(`[MetricsEmitterWorker] Stats:`, msg.data);
      } else if (msg.type === 'error') {
        console.error(`[MetricsEmitterWorker] Error:`, msg.error);
      }
    });

    this.worker.on('error', (error) => {
      console.error(`[MetricsEmitterWorker] Worker error:`, error);
    });

    this.worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[MetricsEmitterWorker] Worker stopped with exit code ${code}`);
      }
    });
  }

  emitBatch(batch) {
    // Send to worker thread
    this.worker.postMessage({ type: 'emit', batch });
  }

  getStats() {
    return new Promise((resolve) => {
      const handler = (msg) => {
        if (msg.type === 'stats') {
          this.worker.off('message', handler);
          resolve(msg.data);
        }
      };
      this.worker.on('message', handler);
      this.worker.postMessage({ type: 'getStats' });
    });
  }

  terminate() {
    this.worker.postMessage({ type: 'stop' });
    setTimeout(() => {
      this.worker.terminate();
    }, 1000);
  }
}