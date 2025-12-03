/**
 * CustomMetrics - 7 custom parameters
 */

const MetricCollector = require('./MetricCollector');

class StateCollector extends MetricCollector {
  constructor() {
    super({
      id: 'custom.state',
      name: 'System State',
      unit: 'text',
      range: null,
      thresholds: {},
      stations: ['STATION_2', 'STATION_3', 'STATION_4', 'STATION_9', 'STATION_11'],
      description: 'Current operational state'
    });
  }

  async collect(context) {
    return context.custom?.state || 'unknown';
  }
}

class SuccessRateCollector extends MetricCollector {
  constructor() {
    super({
      id: 'custom.successRate',
      name: 'Success Rate',
      unit: '%',
      range: [0, 100],
      thresholds: { warningLow: 95, warningHigh: null, criticalLow: 90, criticalHigh: null },
      stations: ['STATION_3', 'STATION_4', 'STATION_11'],
      description: 'Percentage of successful operations'
    });
  }

  async collect(context) {
    if (!context.custom) return null;
    const { successCount = 0, errorCount = 0 } = context.custom;
    const total = successCount + errorCount;
    if (total === 0) return 100;
    return (successCount / total) * 100;
  }
}

class WarningCountCollector extends MetricCollector {
  constructor() {
    super({
      id: 'custom.warningCount',
      name: 'Warning Count',
      unit: 'count',
      range: [0, 10000],
      thresholds: { warningLow: null, warningHigh: 10, criticalLow: null, criticalHigh: 50 },
      stations: ['All'],
      description: 'Number of warnings in current session'
    });
  }

  async collect(context) {
    return context.custom?.warningCount || 0;
  }
}

class CriticalCountCollector extends MetricCollector {
  constructor() {
    super({
      id: 'custom.criticalCount',
      name: 'Critical Count',
      unit: 'count',
      range: [0, 1000],
      thresholds: { warningLow: null, warningHigh: 1, criticalLow: null, criticalHigh: 5 },
      stations: ['All'],
      description: 'Number of critical alerts'
    });
  }

  async collect(context) {
    return context.custom?.criticalCount || 0;
  }
}

class TotalProcessedCollector extends MetricCollector {
  constructor() {
    super({
      id: 'custom.totalProcessed',
      name: 'Total Processed',
      unit: 'count',
      range: [0, 1000000],
      thresholds: {},
      stations: ['STATION_3', 'STATION_4', 'STATION_9', 'STATION_11'],
      description: 'Total items processed since start'
    });
  }

  async collect(context) {
    return context.custom?.totalProcessed || 0;
  }
}

class ProcessingSpeedCollector extends MetricCollector {
  constructor() {
    super({
      id: 'custom.processingSpeed',
      name: 'Processing Speed',
      unit: 'items/s',
      range: [0, 1000],
      thresholds: { warningLow: 5, warningHigh: null, criticalLow: 1, criticalHigh: null },
      stations: ['STATION_3', 'STATION_4', 'STATION_9', 'STATION_11'],
      description: 'Current processing rate'
    });
  }

  async collect(context) {
    return context.custom?.processingSpeed || null;
  }
}

class LastActivityCollector extends MetricCollector {
  constructor() {
    super({
      id: 'custom.lastActivity',
      name: 'Last Activity',
      unit: 'seconds ago',
      range: [0, 3600],
      thresholds: { warningLow: null, warningHigh: 300, criticalLow: null, criticalHigh: 600 },
      stations: ['STATION_4', 'STATION_11'],
      description: 'Time since last activity'
    });
  }

  async collect(context) {
    if (!context.custom?.lastActivityTime) return null;
    return Math.floor((Date.now() - context.custom.lastActivityTime) / 1000);
  }
}

module.exports = {
  StateCollector,
  SuccessRateCollector,
  WarningCountCollector,
  CriticalCountCollector,
  TotalProcessedCollector,
  ProcessingSpeedCollector,
  LastActivityCollector
};
