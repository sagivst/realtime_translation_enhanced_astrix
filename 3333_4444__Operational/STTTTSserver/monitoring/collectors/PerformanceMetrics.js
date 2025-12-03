/**
 * PerformanceMetrics - 8 performance parameters
 */

const MetricCollector = require('./MetricCollector');
const os = require('os');

class CPUCollector extends MetricCollector {
  constructor() {
    super({
      id: 'performance.cpu',
      name: 'CPU Usage',
      unit: '%',
      range: [0, 100],
      thresholds: { warningLow: null, warningHigh: 70, criticalLow: null, criticalHigh: 90 },
      stations: ['All'],
      description: 'CPU utilization percentage'
    });
    this.lastCPU = process.cpuUsage();
    this.lastCheck = Date.now();
  }

  async collect(context) {
    const currentCPU = process.cpuUsage();
    const currentTime = Date.now();
    const elapsedTime = (currentTime - this.lastCheck) * 1000;

    if (elapsedTime === 0) return null;

    const userDiff = currentCPU.user - this.lastCPU.user;
    const systemDiff = currentCPU.system - this.lastCPU.system;
    const totalDiff = userDiff + systemDiff;
    const cpuPercent = (totalDiff / elapsedTime) * 100;

    this.lastCPU = currentCPU;
    this.lastCheck = currentTime;

    return Math.min(100, Math.max(0, cpuPercent));
  }
}

class MemoryCollector extends MetricCollector {
  constructor() {
    super({
      id: 'performance.memory',
      name: 'Memory Usage',
      unit: '%',
      range: [0, 100],
      thresholds: { warningLow: null, warningHigh: 75, criticalLow: null, criticalHigh: 90 },
      stations: ['All'],
      description: 'RAM utilization percentage'
    });
  }

  async collect(context) {
    const usage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const usedMemory = usage.heapUsed + usage.external;
    return (usedMemory / totalMemory) * 100;
  }
}

class BandwidthCollector extends MetricCollector {
  constructor() {
    super({
      id: 'performance.bandwidth',
      name: 'Network Bandwidth',
      unit: 'Mbps',
      range: [0, 1000],
      thresholds: { warningLow: null, warningHigh: 50, criticalLow: null, criticalHigh: 100 },
      stations: ['STATION_1', 'STATION_2', 'STATION_3', 'STATION_10'],
      description: 'Network bandwidth consumed'
    });
  }

  async collect(context) {
    if (!context.bandwidth) return null;
    const { bytesProcessed, timeSinceLastCheck } = context.bandwidth;
    if (timeSinceLastCheck === 0) return null;
    const bitsPerSecond = (bytesProcessed * 8) / (timeSinceLastCheck / 1000);
    return bitsPerSecond / 1000000;
  }
}

class ThroughputCollector extends MetricCollector {
  constructor() {
    super({
      id: 'performance.throughput',
      name: 'Data Throughput',
      unit: 'KB/s',
      range: [0, 10000],
      thresholds: { warningLow: 50, warningHigh: null, criticalLow: 10, criticalHigh: null },
      stations: ['STATION_1', 'STATION_2', 'STATION_3', 'STATION_9', 'STATION_10'],
      description: 'Data processing rate'
    });
  }

  async collect(context) {
    return context.performance?.throughput || null;
  }
}

class ThreadsCollector extends MetricCollector {
  constructor() {
    super({
      id: 'performance.threads',
      name: 'Active Threads',
      unit: 'count',
      range: [0, 1000],
      thresholds: { warningLow: null, warningHigh: 100, criticalLow: null, criticalHigh: 500 },
      stations: ['STATION_2', 'STATION_3', 'STATION_9'],
      description: 'Number of active threads'
    });
  }

  async collect(context) {
    return context.performance?.threads || null;
  }
}

class QueueCollector extends MetricCollector {
  constructor() {
    super({
      id: 'performance.queue',
      name: 'Queue Depth',
      unit: 'items',
      range: [0, 10000],
      thresholds: { warningLow: null, warningHigh: 100, criticalLow: null, criticalHigh: 500 },
      stations: ['STATION_2', 'STATION_3', 'STATION_4', 'STATION_9', 'STATION_11'],
      description: 'Items waiting in queue'
    });
  }

  async collect(context) {
    return context.performance?.queue || null;
  }
}

class CacheCollector extends MetricCollector {
  constructor() {
    super({
      id: 'performance.cache',
      name: 'Cache Hit Rate',
      unit: '%',
      range: [0, 100],
      thresholds: { warningLow: 70, warningHigh: null, criticalLow: 50, criticalHigh: null },
      stations: ['STATION_3', 'STATION_4'],
      description: 'Percentage of cache hits'
    });
  }

  async collect(context) {
    return context.performance?.cache || null;
  }
}

class IOWaitCollector extends MetricCollector {
  constructor() {
    super({
      id: 'performance.io',
      name: 'I/O Wait Time',
      unit: '%',
      range: [0, 100],
      thresholds: { warningLow: null, warningHigh: 30, criticalLow: null, criticalHigh: 50 },
      stations: ['STATION_2', 'STATION_3', 'STATION_9'],
      description: 'Time waiting for I/O'
    });
  }

  async collect(context) {
    return context.performance?.io || null;
  }
}

module.exports = {
  CPUCollector,
  MemoryCollector,
  BandwidthCollector,
  ThroughputCollector,
  ThreadsCollector,
  QueueCollector,
  CacheCollector,
  IOWaitCollector
};
