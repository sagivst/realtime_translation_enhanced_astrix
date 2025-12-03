/**
 * Unified 75 Metrics Collector for All Voice Stations
 * Each station sends all 75 metrics - NA for unavailable values
 * This simplifies monitoring and display logic
 */

const DatabaseIntegration = require('./database-integration-module');

// Initialize database integration
const dbIntegration = new DatabaseIntegration();

// Define all 75 metrics with their categories
const METRICS_DEFINITION = {
  // Buffer Metrics (15)
  buffer: {
    buffer_usage_pct: { unit: '%', min: 0, max: 100, optimal: [30, 70] },
    buffer_size_bytes: { unit: 'bytes', min: 0, max: 65536, optimal: [8192, 32768] },
    buffer_overruns: { unit: 'count', min: 0, max: null, optimal: [0, 0] },
    buffer_underruns: { unit: 'count', min: 0, max: null, optimal: [0, 0] },
    buffer_depth_ms: { unit: 'ms', min: 0, max: 1000, optimal: [50, 200] },
    buffer_read_rate: { unit: 'ops/s', min: 0, max: 1000, optimal: [10, 100] },
    buffer_write_rate: { unit: 'ops/s', min: 0, max: 1000, optimal: [10, 100] },
    buffer_fill_rate: { unit: '%/s', min: -100, max: 100, optimal: [-10, 10] },
    buffer_drain_rate: { unit: '%/s', min: -100, max: 100, optimal: [-10, 10] },
    buffer_peak_usage: { unit: '%', min: 0, max: 100, optimal: [40, 80] },
    buffer_min_usage: { unit: '%', min: 0, max: 100, optimal: [10, 40] },
    buffer_avg_usage: { unit: '%', min: 0, max: 100, optimal: [30, 60] },
    buffer_variance: { unit: '%²', min: 0, max: 1000, optimal: [0, 100] },
    buffer_stability: { unit: 'score', min: 0, max: 1, optimal: [0.8, 1] },
    buffer_health: { unit: 'score', min: 0, max: 100, optimal: [80, 100] }
  },

  // Latency Metrics (15)
  latency: {
    current_latency_ms: { unit: 'ms', min: 0, max: 5000, optimal: [20, 100] },
    avg_latency_ms: { unit: 'ms', min: 0, max: 5000, optimal: [30, 150] },
    min_latency_ms: { unit: 'ms', min: 0, max: 5000, optimal: [10, 50] },
    max_latency_ms: { unit: 'ms', min: 0, max: 5000, optimal: [50, 200] },
    latency_variance: { unit: 'ms²', min: 0, max: 10000, optimal: [0, 100] },
    latency_jitter: { unit: 'ms', min: 0, max: 500, optimal: [0, 20] },
    latency_p50: { unit: 'ms', min: 0, max: 5000, optimal: [20, 80] },
    latency_p90: { unit: 'ms', min: 0, max: 5000, optimal: [50, 150] },
    latency_p95: { unit: 'ms', min: 0, max: 5000, optimal: [70, 200] },
    latency_p99: { unit: 'ms', min: 0, max: 5000, optimal: [100, 300] },
    processing_latency: { unit: 'ms', min: 0, max: 1000, optimal: [5, 30] },
    network_latency: { unit: 'ms', min: 0, max: 1000, optimal: [10, 50] },
    codec_latency: { unit: 'ms', min: 0, max: 100, optimal: [1, 10] },
    total_latency: { unit: 'ms', min: 0, max: 5000, optimal: [50, 200] },
    latency_budget_remaining: { unit: 'ms', min: -1000, max: 1000, optimal: [100, 500] }
  },

  // Packet Metrics (15)
  packet: {
    packets_received: { unit: 'count', min: 0, max: null, optimal: null },
    packets_sent: { unit: 'count', min: 0, max: null, optimal: null },
    packets_lost: { unit: 'count', min: 0, max: null, optimal: [0, 0] },
    packet_loss_pct: { unit: '%', min: 0, max: 100, optimal: [0, 0.1] },
    packets_reordered: { unit: 'count', min: 0, max: null, optimal: [0, 0] },
    packets_duplicated: { unit: 'count', min: 0, max: null, optimal: [0, 0] },
    packet_rate_in: { unit: 'pps', min: 0, max: 1000, optimal: [40, 60] },
    packet_rate_out: { unit: 'pps', min: 0, max: 1000, optimal: [40, 60] },
    packet_size_avg: { unit: 'bytes', min: 0, max: 1500, optimal: [160, 320] },
    packet_size_min: { unit: 'bytes', min: 0, max: 1500, optimal: [160, 160] },
    packet_size_max: { unit: 'bytes', min: 0, max: 1500, optimal: [320, 320] },
    packet_interval_ms: { unit: 'ms', min: 0, max: 100, optimal: [20, 20] },
    packet_jitter_ms: { unit: 'ms', min: 0, max: 50, optimal: [0, 5] },
    packet_throughput_kbps: { unit: 'kbps', min: 0, max: 1000, optimal: [64, 128] },
    packet_efficiency: { unit: '%', min: 0, max: 100, optimal: [95, 100] }
  },

  // Audio Quality Metrics (15)
  audioQuality: {
    snr_db: { unit: 'dB', min: 0, max: 100, optimal: [30, 60] },
    noise_floor_db: { unit: 'dB', min: -100, max: 0, optimal: [-80, -60] },
    peak_level_db: { unit: 'dB', min: -100, max: 0, optimal: [-6, -3] },
    rms_level_db: { unit: 'dB', min: -100, max: 0, optimal: [-20, -12] },
    clipping_count: { unit: 'count', min: 0, max: null, optimal: [0, 0] },
    silence_pct: { unit: '%', min: 0, max: 100, optimal: [10, 30] },
    speech_activity_pct: { unit: '%', min: 0, max: 100, optimal: [40, 80] },
    frequency_response: { unit: 'Hz', min: 0, max: 20000, optimal: [300, 3400] },
    thd_pct: { unit: '%', min: 0, max: 100, optimal: [0, 1] },
    sinad_db: { unit: 'dB', min: 0, max: 100, optimal: [40, 70] },
    mos_score: { unit: 'score', min: 1, max: 5, optimal: [4, 5] },
    pesq_score: { unit: 'score', min: 1, max: 5, optimal: [3.5, 4.5] },
    echo_return_loss_db: { unit: 'dB', min: 0, max: 100, optimal: [40, 60] },
    audio_codec: { unit: 'text', min: null, max: null, optimal: null },
    sample_rate_hz: { unit: 'Hz', min: 8000, max: 48000, optimal: [16000, 16000] }
  },

  // Performance Metrics (15)
  performance: {
    cpu_usage_pct: { unit: '%', min: 0, max: 100, optimal: [5, 30] },
    memory_usage_mb: { unit: 'MB', min: 0, max: 10000, optimal: [50, 500] },
    thread_count: { unit: 'count', min: 1, max: 100, optimal: [2, 10] },
    process_uptime_sec: { unit: 'sec', min: 0, max: null, optimal: null },
    api_calls_per_sec: { unit: 'calls/s', min: 0, max: 1000, optimal: [1, 50] },
    api_success_rate: { unit: '%', min: 0, max: 100, optimal: [99, 100] },
    api_avg_response_ms: { unit: 'ms', min: 0, max: 5000, optimal: [10, 100] },
    websocket_connections: { unit: 'count', min: 0, max: 1000, optimal: [1, 10] },
    websocket_messages_per_sec: { unit: 'msg/s', min: 0, max: 1000, optimal: [10, 100] },
    error_count: { unit: 'count', min: 0, max: null, optimal: [0, 0] },
    warning_count: { unit: 'count', min: 0, max: null, optimal: [0, 5] },
    restart_count: { unit: 'count', min: 0, max: null, optimal: [0, 0] },
    gc_pause_ms: { unit: 'ms', min: 0, max: 1000, optimal: [0, 10] },
    event_loop_lag_ms: { unit: 'ms', min: 0, max: 100, optimal: [0, 5] },
    throughput_score: { unit: 'score', min: 0, max: 100, optimal: [80, 100] }
  }
};

/**
 * Station-specific metric availability map
 * true = station can measure this metric
 * false = metric will be NA for this station
 */
const STATION_METRICS_MAP = {
  'STATION_1': { // Asterisk RTP
    buffer: ['buffer_usage_pct', 'buffer_size_bytes', 'buffer_depth_ms'],
    latency: ['current_latency_ms', 'network_latency', 'latency_jitter'],
    packet: ['packets_sent', 'packets_received', 'packet_loss_pct', 'packet_rate_in', 'packet_rate_out'],
    audioQuality: ['audio_codec', 'sample_rate_hz'],
    performance: ['cpu_usage_pct', 'memory_usage_mb']
  },
  'STATION_2': { // Gateway PCM Out
    buffer: ['buffer_usage_pct', 'buffer_overruns', 'buffer_underruns'],
    latency: ['processing_latency', 'codec_latency'],
    packet: ['packets_received', 'packet_throughput_kbps'],
    audioQuality: ['peak_level_db', 'rms_level_db', 'sample_rate_hz'],
    performance: ['cpu_usage_pct', 'thread_count']
  },
  'STATION_3': { // STTTTSserver before Deepgram
    buffer: ['buffer_usage_pct', 'buffer_fill_rate', 'buffer_health'],
    latency: ['processing_latency', 'total_latency'],
    packet: ['packet_rate_out'],
    audioQuality: ['snr_db', 'noise_floor_db', 'speech_activity_pct', 'peak_level_db', 'rms_level_db'],
    performance: ['cpu_usage_pct', 'memory_usage_mb', 'api_calls_per_sec']
  },
  'STATION_4': { // Deepgram Client
    buffer: [],
    latency: ['api_avg_response_ms', 'total_latency'],
    packet: [],
    audioQuality: ['speech_activity_pct'],
    performance: ['api_success_rate', 'api_avg_response_ms', 'throughput_score']
  },
  'STATION_9': { // STTTTSserver TTS Output
    buffer: ['buffer_usage_pct', 'buffer_drain_rate'],
    latency: ['processing_latency', 'total_latency'],
    packet: ['packet_rate_out'],
    audioQuality: ['peak_level_db', 'rms_level_db', 'mos_score'],
    performance: ['cpu_usage_pct', 'memory_usage_mb']
  },
  'STATION_10': { // Gateway RTP Back
    buffer: ['buffer_usage_pct', 'buffer_size_bytes'],
    latency: ['codec_latency', 'network_latency'],
    packet: ['packets_sent', 'packet_loss_pct', 'packet_jitter_ms'],
    audioQuality: ['audio_codec', 'sample_rate_hz'],
    performance: ['cpu_usage_pct']
  },
  'STATION_11': { // STTTTSserver Hume
    buffer: ['buffer_usage_pct'],
    latency: ['api_avg_response_ms'],
    packet: [],
    audioQuality: ['speech_activity_pct', 'snr_db'],
    performance: ['api_calls_per_sec', 'api_success_rate']
  }
};

class Unified75MetricsCollector {
  constructor(stationId) {
    this.stationId = stationId;
    this.availableMetrics = STATION_METRICS_MAP[stationId] || {};
    this.currentMetrics = this.initializeMetrics();
  }

  /**
   * Initialize all 75 metrics with NA or default values
   */
  initializeMetrics() {
    const metrics = {};

    for (const [category, categoryMetrics] of Object.entries(METRICS_DEFINITION)) {
      metrics[category] = {};

      for (const [metricName, metricDef] of Object.entries(categoryMetrics)) {
        // Check if this station can measure this metric
        const canMeasure = this.availableMetrics[category]?.includes(metricName);

        metrics[category][metricName] = {
          value: canMeasure ? 0 : 'NA',
          unit: metricDef.unit,
          min: metricDef.min,
          max: metricDef.max,
          optimal: metricDef.optimal,
          canMeasure: canMeasure,
          timestamp: null
        };
      }
    }

    return metrics;
  }

  /**
   * Update a specific metric value
   */
  updateMetric(category, metricName, value) {
    if (this.currentMetrics[category] && this.currentMetrics[category][metricName]) {
      if (this.currentMetrics[category][metricName].canMeasure) {
        this.currentMetrics[category][metricName].value = value;
        this.currentMetrics[category][metricName].timestamp = Date.now();
      }
    }
  }

  /**
   * Bulk update metrics from raw data
   */
  updateFromRawData(rawData) {
    // Map raw data to 75 metrics based on station type
    switch(this.stationId) {
      case 'STATION_1': // Asterisk
        this.updateMetric('buffer', 'buffer_usage_pct', rawData.bufferUsage || 0);
        this.updateMetric('latency', 'current_latency_ms', rawData.latency || 0);
        this.updateMetric('latency', 'latency_jitter', rawData.jitter || 0);
        this.updateMetric('packet', 'packets_received', rawData.packetsRx || 0);
        this.updateMetric('packet', 'packets_sent', rawData.packetsTx || 0);
        this.updateMetric('packet', 'packet_loss_pct', rawData.packetLoss || 0);
        break;

      case 'STATION_2': // Gateway PCM
        this.updateMetric('buffer', 'buffer_usage_pct', rawData.bufferLevel || 0);
        this.updateMetric('latency', 'processing_latency', rawData.processingTime || 0);
        this.updateMetric('audioQuality', 'peak_level_db', rawData.peakLevel || -60);
        this.updateMetric('audioQuality', 'rms_level_db', rawData.rmsLevel || -20);
        break;

      case 'STATION_3': // STTTTSserver before Deepgram
        this.updateMetric('buffer', 'buffer_usage_pct', rawData.bufferUsage || 0);
        this.updateMetric('audioQuality', 'snr_db', rawData.snr || 0);
        this.updateMetric('audioQuality', 'noise_floor_db', rawData.noiseFloor || -60);
        this.updateMetric('audioQuality', 'speech_activity_pct', rawData.speechActivity || 0);
        this.updateMetric('audioQuality', 'peak_level_db', rawData.peak || -3);
        this.updateMetric('audioQuality', 'rms_level_db', rawData.rms || -20);
        this.updateMetric('latency', 'processing_latency', rawData.preprocessingLatency || 0);
        break;

      case 'STATION_4': // Deepgram
        this.updateMetric('latency', 'api_avg_response_ms', rawData.apiLatency || 0);
        this.updateMetric('performance', 'api_success_rate', rawData.successRate || 100);
        this.updateMetric('audioQuality', 'speech_activity_pct', rawData.speechDetected || 0);
        break;

      case 'STATION_9': // STTTTSserver TTS
        this.updateMetric('buffer', 'buffer_usage_pct', rawData.outputBuffer || 0);
        this.updateMetric('latency', 'processing_latency', rawData.ttsLatency || 0);
        this.updateMetric('audioQuality', 'peak_level_db', rawData.outputPeak || -3);
        this.updateMetric('audioQuality', 'rms_level_db', rawData.outputRms || -16);
        this.updateMetric('audioQuality', 'mos_score', rawData.qualityScore || 4.0);
        break;

      case 'STATION_10': // Gateway RTP Back
        this.updateMetric('buffer', 'buffer_usage_pct', rawData.bufferLevel || 0);
        this.updateMetric('latency', 'network_latency', rawData.networkDelay || 0);
        this.updateMetric('packet', 'packets_sent', rawData.rtpPacketsSent || 0);
        this.updateMetric('packet', 'packet_loss_pct', rawData.packetLoss || 0);
        break;

      case 'STATION_11': // Hume
        this.updateMetric('buffer', 'buffer_usage_pct', rawData.bufferUsage || 0);
        this.updateMetric('latency', 'api_avg_response_ms', rawData.humeLatency || 0);
        this.updateMetric('audioQuality', 'speech_activity_pct', rawData.emotionConfidence || 0);
        this.updateMetric('performance', 'api_success_rate', rawData.apiSuccess || 100);
        break;
    }
  }

  /**
   * Get all 75 metrics formatted for database storage
   */
  getAll75Metrics() {
    const flatMetrics = {};

    for (const [category, categoryMetrics] of Object.entries(this.currentMetrics)) {
      for (const [metricName, metricData] of Object.entries(categoryMetrics)) {
        const fullMetricName = `${category}.${metricName}`;
        flatMetrics[fullMetricName] = metricData.value;
      }
    }

    return flatMetrics;
  }

  /**
   * Get metrics formatted for UI display
   * Only returns metrics that are not NA
   */
  getDisplayMetrics() {
    const displayMetrics = {};

    for (const [category, categoryMetrics] of Object.entries(this.currentMetrics)) {
      displayMetrics[category] = {};

      for (const [metricName, metricData] of Object.entries(categoryMetrics)) {
        if (metricData.value !== 'NA') {
          displayMetrics[category][metricName] = metricData;
        }
      }

      // Remove empty categories
      if (Object.keys(displayMetrics[category]).length === 0) {
        delete displayMetrics[category];
      }
    }

    return displayMetrics;
  }

  /**
   * Send snapshot to database with all 75 metrics
   */
  async sendSnapshot(callId, segmentInfo, audioBuffer) {
    const snapshot = {
      schema_version: '2.0.0', // Updated version for 75 metrics
      call_id: callId,
      segment: segmentInfo,
      station: {
        id: this.stationId,
        software_version: '2.0.0'
      },
      metrics: this.getAll75Metrics(), // All 75 metrics, NA for unavailable
      audio: audioBuffer ? {
        pcm_buffer: audioBuffer,
        sample_rate: 16000,
        format: 'pcm_s16le'
      } : null,
      constraints: this.getStationConstraints(),
      targets: this.getOptimizationTargets()
    };

    try {
      const result = await dbIntegration.ingestStationSnapshot(snapshot);
      console.log(`✅ ${this.stationId} sent 75 metrics (${this.countNonNAMetrics()} active)`);
      return result;
    } catch (error) {
      console.error(`❌ Error sending snapshot:`, error);
      throw error;
    }
  }

  /**
   * Count how many metrics are not NA
   */
  countNonNAMetrics() {
    let count = 0;
    for (const category of Object.values(this.currentMetrics)) {
      for (const metric of Object.values(category)) {
        if (metric.value !== 'NA') count++;
      }
    }
    return count;
  }

  /**
   * Get station-specific constraints
   */
  getStationConstraints() {
    const constraints = {
      max_latency_ms: 200,
      min_quality_score: 4.0,
      max_packet_loss_pct: 1.0
    };

    // Add station-specific constraints
    switch(this.stationId) {
      case 'STATION_3':
        constraints.min_snr_db = 20;
        constraints.max_noise_floor_db = -50;
        break;
      case 'STATION_9':
        constraints.min_mos_score = 3.5;
        break;
    }

    return constraints;
  }

  /**
   * Get optimization targets
   */
  getOptimizationTargets() {
    switch(this.stationId) {
      case 'STATION_1':
      case 'STATION_2':
      case 'STATION_10':
        return {
          goal: 'minimize_packet_loss',
          weights: { reliability: 0.5, latency: 0.3, quality: 0.2 }
        };
      case 'STATION_3':
        return {
          goal: 'maximize_stt_accuracy',
          weights: { clarity: 0.5, noise_reduction: 0.3, latency: 0.2 }
        };
      case 'STATION_4':
      case 'STATION_11':
        return {
          goal: 'maximize_api_performance',
          weights: { accuracy: 0.4, latency: 0.3, reliability: 0.3 }
        };
      case 'STATION_9':
        return {
          goal: 'maximize_tts_quality',
          weights: { naturalness: 0.4, prosody: 0.3, latency: 0.3 }
        };
      default:
        return {
          goal: 'general_optimization',
          weights: { quality: 0.4, latency: 0.3, reliability: 0.3 }
        };
    }
  }
}

// Create collectors for each station
const stationCollectors = {
  'STATION_1': new Unified75MetricsCollector('STATION_1'),
  'STATION_2': new Unified75MetricsCollector('STATION_2'),
  'STATION_3': new Unified75MetricsCollector('STATION_3'),
  'STATION_4': new Unified75MetricsCollector('STATION_4'),
  'STATION_9': new Unified75MetricsCollector('STATION_9'),
  'STATION_10': new Unified75MetricsCollector('STATION_10'),
  'STATION_11': new Unified75MetricsCollector('STATION_11')
};

module.exports = {
  Unified75MetricsCollector,
  stationCollectors,
  METRICS_DEFINITION,
  STATION_METRICS_MAP
};