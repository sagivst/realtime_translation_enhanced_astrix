/**
 * Prometheus Metrics Exporter
 *
 * Collects and exposes metrics in Prometheus format for:
 * - System performance (latency, throughput)
 * - Service health (error rates, uptime)
 * - Resource utilization (CPU, memory, queue depths)
 * - Business metrics (channels, translations)
 *
 * Metrics exposed on /metrics endpoint
 */

const client = require('prom-client');
const EventEmitter = require('events');

class PrometheusExporter extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      port: config.port || 9090,
      metricsPath: config.metricsPath || '/metrics',
      defaultLabels: config.defaultLabels || {},
      collectDefaultMetrics: config.collectDefaultMetrics !== false,
      ...config
    };

    // Create registry
    this.register = new client.Registry();

    // Set default labels
    if (Object.keys(this.config.defaultLabels).length > 0) {
      this.register.setDefaultLabels(this.config.defaultLabels);
    }

    // Enable default Node.js metrics if configured
    if (this.config.collectDefaultMetrics) {
      client.collectDefaultMetrics({
        register: this.register,
        prefix: 'asterisk_translation_'
      });
    }

    // Initialize custom metrics
    this.initializeMetrics();

    console.log('[PrometheusExporter] Initialized');
  }

  /**
   * Initialize all custom metrics
   */
  initializeMetrics() {
    // === Latency Metrics ===

    this.latencyHistogram = new client.Histogram({
      name: 'translation_latency_seconds',
      help: 'End-to-end translation latency distribution',
      labelNames: ['source_lang', 'target_lang', 'stage'],
      buckets: [0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 1.2, 1.5, 2.0, 3.0],  // seconds
      registers: [this.register]
    });

    this.componentLatency = new client.Histogram({
      name: 'component_latency_milliseconds',
      help: 'Component processing latency',
      labelNames: ['component', 'operation'],
      buckets: [10, 20, 50, 100, 200, 300, 500, 1000, 2000],  // milliseconds
      registers: [this.register]
    });

    // === Throughput Metrics ===

    this.framesProcessed = new client.Counter({
      name: 'frames_processed_total',
      help: 'Total number of audio frames processed',
      labelNames: ['channel_id', 'direction'],
      registers: [this.register]
    });

    this.translationsCompleted = new client.Counter({
      name: 'translations_completed_total',
      help: 'Total number of translations completed',
      labelNames: ['source_lang', 'target_lang', 'status'],
      registers: [this.register]
    });

    this.bytesProcessed = new client.Counter({
      name: 'audio_bytes_processed_total',
      help: 'Total audio bytes processed',
      labelNames: ['channel_id', 'direction'],
      registers: [this.register]
    });

    // === Error Metrics ===

    this.errorCounter = new client.Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['component', 'error_type', 'severity'],
      registers: [this.register]
    });

    this.recoveryCounter = new client.Counter({
      name: 'recoveries_total',
      help: 'Total number of recovery attempts',
      labelNames: ['component', 'tier', 'success'],
      registers: [this.register]
    });

    // === Queue Metrics ===

    this.queueDepth = new client.Gauge({
      name: 'queue_depth',
      help: 'Current queue depth',
      labelNames: ['queue_name'],
      registers: [this.register]
    });

    this.queueWaitTime = new client.Histogram({
      name: 'queue_wait_time_milliseconds',
      help: 'Time items spend waiting in queue',
      labelNames: ['queue_name'],
      buckets: [5, 10, 20, 50, 100, 200, 500, 1000],  // milliseconds
      registers: [this.register]
    });

    // === Channel Metrics ===

    this.activeChannels = new client.Gauge({
      name: 'active_channels',
      help: 'Number of active translation channels',
      labelNames: ['status'],
      registers: [this.register]
    });

    this.channelDuration = new client.Histogram({
      name: 'channel_duration_seconds',
      help: 'Channel session duration',
      labelNames: ['source_lang', 'target_lang'],
      buckets: [60, 300, 600, 1800, 3600, 7200],  // seconds
      registers: [this.register]
    });

    // === Service Health Metrics ===

    this.serviceUptime = new client.Gauge({
      name: 'service_uptime_seconds',
      help: 'Service uptime in seconds',
      labelNames: ['component'],
      registers: [this.register]
    });

    this.serviceHealth = new client.Gauge({
      name: 'service_health',
      help: 'Service health status (0=failed, 1=unhealthy, 2=degraded, 3=healthy)',
      labelNames: ['component'],
      registers: [this.register]
    });

    this.successRate = new client.Gauge({
      name: 'success_rate',
      help: 'Operation success rate (0-1)',
      labelNames: ['component', 'operation'],
      registers: [this.register]
    });

    // === Resource Utilization ===

    this.pipeBufferUtilization = new client.Gauge({
      name: 'pipe_buffer_utilization',
      help: 'Named pipe buffer utilization (0-1)',
      labelNames: ['channel_id', 'direction'],
      registers: [this.register]
    });

    this.voiceEmbeddingCacheSize = new client.Gauge({
      name: 'voice_embedding_cache_size',
      help: 'Number of cached voice embeddings',
      registers: [this.register]
    });

    // === Business Metrics ===

    this.translationCacheHitRate = new client.Gauge({
      name: 'translation_cache_hit_rate',
      help: 'Translation cache hit rate (0-1)',
      registers: [this.register]
    });

    this.wordCount = new client.Counter({
      name: 'words_translated_total',
      help: 'Total number of words translated',
      labelNames: ['source_lang', 'target_lang'],
      registers: [this.register]
    });

    console.log('[PrometheusExporter] Metrics initialized');
  }

  /**
   * Record end-to-end translation latency
   */
  recordTranslationLatency(sourceLang, targetLang, stage, latencyMs) {
    this.latencyHistogram.observe(
      { source_lang: sourceLang, target_lang: targetLang, stage },
      latencyMs / 1000  // Convert to seconds
    );
  }

  /**
   * Record component operation latency
   */
  recordComponentLatency(component, operation, latencyMs) {
    this.componentLatency.observe(
      { component, operation },
      latencyMs
    );
  }

  /**
   * Record frame processing
   */
  recordFrameProcessed(channelId, direction) {
    this.framesProcessed.inc({ channel_id: channelId, direction });
  }

  /**
   * Record translation completion
   */
  recordTranslation(sourceLang, targetLang, status, wordCount = 0) {
    this.translationsCompleted.inc({ source_lang: sourceLang, target_lang: targetLang, status });

    if (wordCount > 0) {
      this.wordCount.inc({ source_lang: sourceLang, target_lang: targetLang }, wordCount);
    }
  }

  /**
   * Record audio bytes processed
   */
  recordBytesProcessed(channelId, direction, bytes) {
    this.bytesProcessed.inc({ channel_id: channelId, direction }, bytes);
  }

  /**
   * Record error
   */
  recordError(component, errorType, severity = 'low') {
    this.errorCounter.inc({ component, error_type: errorType, severity });
  }

  /**
   * Record recovery attempt
   */
  recordRecovery(component, tier, success) {
    this.recoveryCounter.inc({
      component,
      tier,
      success: success ? 'true' : 'false'
    });
  }

  /**
   * Update queue depth
   */
  updateQueueDepth(queueName, depth) {
    this.queueDepth.set({ queue_name: queueName }, depth);
  }

  /**
   * Record queue wait time
   */
  recordQueueWaitTime(queueName, waitTimeMs) {
    this.queueWaitTime.observe({ queue_name: queueName }, waitTimeMs);
  }

  /**
   * Update active channels count
   */
  updateActiveChannels(status, count) {
    this.activeChannels.set({ status }, count);
  }

  /**
   * Record channel duration
   */
  recordChannelDuration(sourceLang, targetLang, durationSeconds) {
    this.channelDuration.observe(
      { source_lang: sourceLang, target_lang: targetLang },
      durationSeconds
    );
  }

  /**
   * Update service uptime
   */
  updateServiceUptime(component, uptimeSeconds) {
    this.serviceUptime.set({ component }, uptimeSeconds);
  }

  /**
   * Update service health
   */
  updateServiceHealth(component, healthState) {
    // Map health state to numeric value
    const healthValue = {
      failed: 0,
      unhealthy: 1,
      degraded: 2,
      healthy: 3
    }[healthState] || 0;

    this.serviceHealth.set({ component }, healthValue);
  }

  /**
   * Update success rate
   */
  updateSuccessRate(component, operation, rate) {
    this.successRate.set({ component, operation }, rate);
  }

  /**
   * Update pipe buffer utilization
   */
  updatePipeBufferUtilization(channelId, direction, utilization) {
    this.pipeBufferUtilization.set(
      { channel_id: channelId, direction },
      utilization
    );
  }

  /**
   * Update voice embedding cache size
   */
  updateVoiceEmbeddingCacheSize(size) {
    this.voiceEmbeddingCacheSize.set(size);
  }

  /**
   * Update translation cache hit rate
   */
  updateTranslationCacheHitRate(rate) {
    this.translationCacheHitRate.set(rate);
  }

  /**
   * Get metrics in Prometheus text format
   */
  async getMetrics() {
    return await this.register.metrics();
  }

  /**
   * Get metrics content type
   */
  getContentType() {
    return this.register.contentType;
  }

  /**
   * Create Express middleware for /metrics endpoint
   */
  createMiddleware() {
    return async (req, res) => {
      try {
        res.set('Content-Type', this.getContentType());
        res.end(await this.getMetrics());
      } catch (error) {
        console.error('[PrometheusExporter] Error generating metrics:', error);
        res.status(500).end('Error generating metrics');
      }
    };
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset() {
    this.register.resetMetrics();
    console.log('[PrometheusExporter] Metrics reset');
  }

  /**
   * Shutdown exporter
   */
  async shutdown() {
    console.log('[PrometheusExporter] Shutting down...');
    this.register.clear();
    console.log('[PrometheusExporter] Shutdown complete');
  }
}

module.exports = PrometheusExporter;
