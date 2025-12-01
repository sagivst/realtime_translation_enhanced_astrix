/**
 * SnapshotBuilder - Creates segment-level snapshots with metrics, logs, and audio
 *
 * Follows the StationSnapshot schema from the OpenAPI specification
 */

const { v4: uuidv4 } = require('uuid');
const AudioHandler = require('./AudioHandler');
const LogCollector = require('./LogCollector');

class SnapshotBuilder {
  /**
   * @param {Object} config - Configuration
   * @param {string} config.stationId - Station ID (e.g., "STATION_3")
   * @param {string} config.softwareVersion - Software version
   * @param {Object} config.audioStorage - Audio storage config
   * @param {Array} config.collectors - Metric collectors
   */
  constructor(config) {
    this.stationId = config.stationId;
    this.softwareVersion = config.softwareVersion;
    this.audioStorage = config.audioStorage;
    this.collectors = config.collectors || [];

    this.audioHandler = new AudioHandler(config.audioStorage);
    this.logCollector = new LogCollector();

    // Current segment state
    this.currentSegment = null;
    this.metricsCache = {};
    this.logsCache = [];
  }

  /**
   * Start a new segment
   * @param {Object} segment - Segment info
   * @param {string} segment.callId - Call ID
   * @param {string} segment.channel - Channel (A, B, caller, callee)
   * @param {number} segment.startMs - Start time in milliseconds
   */
  startSegment({ callId, channel, startMs }) {
    this.currentSegment = {
      segmentId: uuidv4(),
      callId,
      channel,
      startMs,
      endMs: null
    };

    // Reset caches
    this.metricsCache = {};
    this.logsCache = [];
    this.logCollector.clear();

    return this.currentSegment.segmentId;
  }

  /**
   * End the current segment
   * @param {number} endMs - End time in milliseconds
   */
  endSegment(endMs) {
    if (!this.currentSegment) {
      throw new Error('No active segment');
    }

    this.currentSegment.endMs = endMs;
  }

  /**
   * Collect all metrics from registered collectors
   * @param {Object} context - Context data for collectors (buffers, audio, etc.)
   * @returns {Promise<Object>} - Collected metrics
   */
  async collectMetrics(context) {
    const metrics = {};

    for (const collector of this.collectors) {
      try {
        // Check if collector applies to this station
        if (!collector.appliesTo(this.stationId)) {
          continue;
        }

        const value = await collector.collect(context);

        if (value !== null && value !== undefined) {
          metrics[collector.id] = value;

          // Validate against thresholds
          const validation = collector.validate(value);

          if (validation.level === 'warning' || validation.level === 'critical') {
            this.logCollector.addLog({
              timestamp: new Date().toISOString(),
              module: 'MetricCollector',
              event: 'threshold_exceeded',
              metric: collector.id,
              level: validation.level,
              value,
              threshold: validation.threshold,
              message: validation.message
            });
          }
        }
      } catch (error) {
        this.logCollector.addLog({
          timestamp: new Date().toISOString(),
          module: 'MetricCollector',
          event: 'collection_error',
          metric: collector.id,
          error: error.message
        });
      }
    }

    // Update cache
    this.metricsCache = { ...this.metricsCache, ...metrics };

    return metrics;
  }

  /**
   * Add a log entry
   * @param {Object} log - Log entry
   */
  addLog(log) {
    this.logCollector.addLog(log);
  }

  /**
   * Attach audio to the snapshot
   * @param {Buffer} pcmBuffer - PCM audio buffer
   * @param {Object} audioMeta - Audio metadata
   * @returns {Promise<Object>} - Audio reference
   */
  async attachAudio(pcmBuffer, audioMeta = {}) {
    if (!this.currentSegment) {
      throw new Error('No active segment');
    }

    const { segmentId, callId, startMs, endMs } = this.currentSegment;

    // Generate storage key
    const storageKey = await this.audioHandler.store(pcmBuffer, {
      stationId: this.stationId,
      callId,
      segmentId,
      startMs,
      endMs,
      ...audioMeta
    });

    return {
      sample_rate: audioMeta.sampleRate || 16000,
      format: audioMeta.format || 'pcm_s16le',
      duration_ms: endMs - startMs,
      storage_key: storageKey
    };
  }

  /**
   * Build the complete snapshot
   * @param {Object} options - Additional options
   * @param {Object} options.constraints - Optimization constraints
   * @param {Object} options.targets - Optimization targets
   * @param {Buffer} options.pcmBuffer - Audio buffer
   * @param {Object} options.audioMeta - Audio metadata
   * @returns {Promise<Object>} - Complete snapshot following schema v1.0.0
   */
  async build(options = {}) {
    if (!this.currentSegment) {
      throw new Error('No active segment');
    }

    const { constraints, targets, pcmBuffer, audioMeta } = options;

    // Attach audio if provided
    let audioRef = null;
    if (pcmBuffer) {
      audioRef = await this.attachAudio(pcmBuffer, audioMeta);
    }

    // Build snapshot
    const snapshot = {
      schema_version: '1.0.0',
      payload_type: 'segment_snapshot',

      call_id: this.currentSegment.callId,
      channel: this.currentSegment.channel,

      segment: {
        segment_id: this.currentSegment.segmentId,
        start_ms: this.currentSegment.startMs,
        end_ms: this.currentSegment.endMs
      },

      station: {
        id: this.stationId,
        software_version: this.softwareVersion
      },

      metrics: this.metricsCache,

      logs: this.logCollector.getLogs(),

      audio: audioRef,

      constraints: constraints || {},

      targets: targets || {}
    };

    return snapshot;
  }

  /**
   * Build and send snapshot in one operation
   * @param {Object} context - Context for metric collection
   * @param {Object} options - Build options
   * @returns {Promise<Object>} - Complete snapshot
   */
  async buildWithContext(context, options = {}) {
    // Collect metrics
    await this.collectMetrics(context);

    // Build snapshot
    return this.build(options);
  }

  /**
   * Get current segment info
   * @returns {Object|null} - Current segment
   */
  getCurrentSegment() {
    return this.currentSegment;
  }

  /**
   * Get cached metrics
   * @returns {Object} - Cached metrics
   */
  getMetrics() {
    return this.metricsCache;
  }

  /**
   * Get logs
   * @returns {Array} - Log entries
   */
  getLogs() {
    return this.logCollector.getLogs();
  }

  /**
   * Reset builder state
   */
  reset() {
    this.currentSegment = null;
    this.metricsCache = {};
    this.logsCache = [];
    this.logCollector.clear();
  }
}

module.exports = SnapshotBuilder;
