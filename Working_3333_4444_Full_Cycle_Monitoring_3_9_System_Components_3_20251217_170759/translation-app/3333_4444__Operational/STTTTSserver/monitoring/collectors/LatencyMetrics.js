/**
 * LatencyMetrics - 8 latency parameters
 */

const MetricCollector = require('./MetricCollector');

class LatencyAvgCollector extends MetricCollector {
  constructor() {
    super({
      id: 'latency.avg',
      name: 'Average Latency',
      unit: 'ms',
      range: [0, 2000],
      thresholds: { warningLow: null, warningHigh: 500, criticalLow: null, criticalHigh: 1000 },
      stations: ['All'],
      description: 'Average end-to-end latency'
    });
  }

  async collect(context) {
    return context.latency?.avg || null;
  }
}

class LatencyMinCollector extends MetricCollector {
  constructor() {
    super({
      id: 'latency.min',
      name: 'Minimum Latency',
      unit: 'ms',
      range: [0, 2000],
      thresholds: { warningLow: null, warningHigh: null, criticalLow: null, criticalHigh: null },
      stations: ['All'],
      description: 'Best-case latency observed'
    });
  }

  async collect(context) {
    return context.latency?.min || null;
  }
}

class LatencyMaxCollector extends MetricCollector {
  constructor() {
    super({
      id: 'latency.max',
      name: 'Maximum Latency',
      unit: 'ms',
      range: [0, 5000],
      thresholds: { warningLow: null, warningHigh: 1500, criticalLow: null, criticalHigh: 3000 },
      stations: ['All'],
      description: 'Worst-case latency observed'
    });
  }

  async collect(context) {
    return context.latency?.max || null;
  }
}

class LatencyJitterCollector extends MetricCollector {
  constructor() {
    super({
      id: 'latency.jitter',
      name: 'Latency Jitter',
      unit: 'ms',
      range: [0, 500],
      thresholds: { warningLow: null, warningHigh: 50, criticalLow: null, criticalHigh: 100 },
      stations: ['STATION_1', 'STATION_2', 'STATION_3', 'STATION_10'],
      description: 'Variation in latency'
    });
  }

  async collect(context) {
    return context.latency?.jitter || null;
  }
}

class LatencyVarianceCollector extends MetricCollector {
  constructor() {
    super({
      id: 'latency.variance',
      name: 'Latency Variance',
      unit: 'ms²',
      range: [0, 10000],
      thresholds: { warningLow: null, warningHigh: 2500, criticalLow: null, criticalHigh: 5000 },
      stations: ['STATION_1', 'STATION_3'],
      description: 'Statistical variance of latency'
    });
  }

  async collect(context) {
    return context.latency?.variance || null;
  }
}

class Latency95thCollector extends MetricCollector {
  constructor() {
    super({
      id: 'latency.percentile95',
      name: '95th Percentile Latency',
      unit: 'ms',
      range: [0, 3000],
      thresholds: { warningLow: null, warningHigh: 800, criticalLow: null, criticalHigh: 1500 },
      stations: ['STATION_1', 'STATION_2', 'STATION_3', 'STATION_9'],
      description: '95% of requests complete within this latency'
    });
  }

  async collect(context) {
    return context.latency?.percentile95 || null;
  }
}

class LatencyNetworkCollector extends MetricCollector {
  constructor() {
    super({
      id: 'latency.network',
      name: 'Network Latency',
      unit: 'ms',
      range: [0, 1000],
      thresholds: { warningLow: null, warningHigh: 100, criticalLow: null, criticalHigh: 250 },
      stations: ['STATION_1', 'STATION_2', 'STATION_10'],
      description: 'Network transmission delay'
    });
  }

  async collect(context) {
    return context.latency?.network || null;
  }
}

class LatencyProcessingCollector extends MetricCollector {
  constructor() {
    super({
      id: 'latency.processing',
      name: 'Processing Latency',
      unit: 'ms',
      range: [0, 5000],
      thresholds: { warningLow: null, warningHigh: 300, criticalLow: null, criticalHigh: 1000 },
      stations: ['STATION_2', 'STATION_3', 'STATION_4', 'STATION_9', 'STATION_10', 'STATION_11'],
      description: 'Time spent in processing'
    });
  }

  async collect(context) {
    return context.latency?.processing || context.processingTime || null;
  }
}

module.exports = {
  LatencyAvgCollector,
  LatencyMinCollector,
  LatencyMaxCollector,
  LatencyJitterCollector,
  LatencyVarianceCollector,
  Latency95thCollector,
  LatencyNetworkCollector,
  LatencyProcessingCollector
};
