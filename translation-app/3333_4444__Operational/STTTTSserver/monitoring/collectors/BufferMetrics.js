/**
 * BufferMetrics - Collectors for all 10 buffer parameters
 *
 * Parameters:
 * 1. buffer.total
 * 2. buffer.input
 * 3. buffer.output
 * 4. buffer.jitter
 * 5. buffer.underrun
 * 6. buffer.overrun
 * 7. buffer.playback
 * 8. buffer.record
 * 9. buffer.network
 * 10. buffer.processing
 */

const MetricCollector = require('./MetricCollector');

class BufferTotalCollector extends MetricCollector {
  constructor() {
    super({
      id: 'buffer.total',
      name: 'Total Buffer Utilization',
      unit: '%',
      range: [0, 100],
      thresholds: {
        warningLow: 20,
        warningHigh: 80,
        criticalLow: 10,
        criticalHigh: 95
      },
      stations: ['STATION_1', 'STATION_2', 'STATION_3', 'STATION_9', 'STATION_10'],
      description: 'Overall buffer utilization percentage across all buffer types'
    });
  }

  async collect(context) {
    const { buffers } = context;
    if (!buffers) return null;

    // Calculate total buffer utilization
    let totalUsed = 0;
    let totalCapacity = 0;

    for (const [name, buffer] of Object.entries(buffers)) {
      if (buffer.size && buffer.capacity) {
        totalUsed += buffer.size;
        totalCapacity += buffer.capacity;
      }
    }

    if (totalCapacity === 0) return null;

    return (totalUsed / totalCapacity) * 100;
  }
}

class BufferInputCollector extends MetricCollector {
  constructor() {
    super({
      id: 'buffer.input',
      name: 'Input Buffer',
      unit: '%',
      range: [0, 100],
      thresholds: {
        warningLow: 15,
        warningHigh: 85,
        criticalLow: 5,
        criticalHigh: 95
      },
      stations: ['STATION_1', 'STATION_2', 'STATION_3', 'STATION_4'],
      description: 'Buffer for incoming audio/data before processing'
    });
  }

  async collect(context) {
    const { buffers } = context;
    if (!buffers || !buffers.input) return null;

    const { size, capacity } = buffers.input;
    if (!capacity) return null;

    return (size / capacity) * 100;
  }
}

class BufferOutputCollector extends MetricCollector {
  constructor() {
    super({
      id: 'buffer.output',
      name: 'Output Buffer',
      unit: '%',
      range: [0, 100],
      thresholds: {
        warningLow: 15,
        warningHigh: 85,
        criticalLow: 5,
        criticalHigh: 95
      },
      stations: ['STATION_2', 'STATION_9', 'STATION_10'],
      description: 'Buffer for outgoing audio/data after processing'
    });
  }

  async collect(context) {
    const { buffers } = context;
    if (!buffers || !buffers.output) return null;

    const { size, capacity } = buffers.output;
    if (!capacity) return null;

    return (size / capacity) * 100;
  }
}

class BufferJitterCollector extends MetricCollector {
  constructor() {
    super({
      id: 'buffer.jitter',
      name: 'Jitter Buffer',
      unit: 'ms',
      range: [0, 500],
      thresholds: {
        warningLow: 20,
        warningHigh: 150,
        criticalLow: 10,
        criticalHigh: 300
      },
      stations: ['STATION_1', 'STATION_3'],
      description: 'Buffer to smooth out packet arrival time variations'
    });
  }

  async collect(context) {
    const { buffers } = context;
    if (!buffers || !buffers.jitter) return null;

    // Jitter buffer size in milliseconds
    return buffers.jitter.delayMs || null;
  }
}

class BufferUnderrunCollector extends MetricCollector {
  constructor() {
    super({
      id: 'buffer.underrun',
      name: 'Buffer Underruns',
      unit: 'count/s',
      range: [0, 100],
      thresholds: {
        warningLow: null,
        warningHigh: 5,
        criticalLow: null,
        criticalHigh: 10
      },
      stations: ['STATION_1', 'STATION_2', 'STATION_3'],
      description: 'Rate of buffer underrun events (buffer empty when data needed)'
    });

    this.lastCount = 0;
    this.lastTimestamp = Date.now();
  }

  async collect(context) {
    const { buffers } = context;
    if (!buffers || !buffers.stats) return null;

    const currentCount = buffers.stats.underruns || 0;
    const currentTime = Date.now();
    const elapsed = (currentTime - this.lastTimestamp) / 1000; // seconds

    if (elapsed === 0) return null;

    const rate = (currentCount - this.lastCount) / elapsed;

    this.lastCount = currentCount;
    this.lastTimestamp = currentTime;

    return Math.max(0, rate);
  }
}

class BufferOverrunCollector extends MetricCollector {
  constructor() {
    super({
      id: 'buffer.overrun',
      name: 'Buffer Overruns',
      unit: 'count/s',
      range: [0, 100],
      thresholds: {
        warningLow: null,
        warningHigh: 5,
        criticalLow: null,
        criticalHigh: 10
      },
      stations: ['STATION_1', 'STATION_2', 'STATION_3'],
      description: 'Rate of buffer overrun events (buffer full, data dropped)'
    });

    this.lastCount = 0;
    this.lastTimestamp = Date.now();
  }

  async collect(context) {
    const { buffers } = context;
    if (!buffers || !buffers.stats) return null;

    const currentCount = buffers.stats.overruns || 0;
    const currentTime = Date.now();
    const elapsed = (currentTime - this.lastTimestamp) / 1000;

    if (elapsed === 0) return null;

    const rate = (currentCount - this.lastCount) / elapsed;

    this.lastCount = currentCount;
    this.lastTimestamp = currentTime;

    return Math.max(0, rate);
  }
}

class BufferPlaybackCollector extends MetricCollector {
  constructor() {
    super({
      id: 'buffer.playback',
      name: 'Playback Buffer',
      unit: 'ms',
      range: [0, 500],
      thresholds: {
        warningLow: 30,
        warningHigh: 200,
        criticalLow: 10,
        criticalHigh: 400
      },
      stations: ['STATION_1', 'STATION_10'],
      description: 'Audio buffer for smooth playback'
    });
  }

  async collect(context) {
    const { buffers } = context;
    if (!buffers || !buffers.playback) return null;

    return buffers.playback.durationMs || null;
  }
}

class BufferRecordCollector extends MetricCollector {
  constructor() {
    super({
      id: 'buffer.record',
      name: 'Recording Buffer',
      unit: 'ms',
      range: [0, 500],
      thresholds: {
        warningLow: 30,
        warningHigh: 200,
        criticalLow: 10,
        criticalHigh: 400
      },
      stations: ['STATION_1', 'STATION_2'],
      description: 'Audio buffer for recording/capture'
    });
  }

  async collect(context) {
    const { buffers } = context;
    if (!buffers || !buffers.record) return null;

    return buffers.record.durationMs || null;
  }
}

class BufferNetworkCollector extends MetricCollector {
  constructor() {
    super({
      id: 'buffer.network',
      name: 'Network Buffer',
      unit: 'KB',
      range: [0, 1024],
      thresholds: {
        warningLow: 64,
        warningHigh: 512,
        criticalLow: 32,
        criticalHigh: 896
      },
      stations: ['STATION_1', 'STATION_2', 'STATION_10'],
      description: 'Network socket send/receive buffer size'
    });
  }

  async collect(context) {
    const { buffers } = context;
    if (!buffers || !buffers.network) return null;

    return buffers.network.sizeKB || null;
  }
}

class BufferProcessingCollector extends MetricCollector {
  constructor() {
    super({
      id: 'buffer.processing',
      name: 'Processing Buffer',
      unit: 'ms',
      range: [0, 1000],
      thresholds: {
        warningLow: null,
        warningHigh: 200,
        criticalLow: null,
        criticalHigh: 500
      },
      stations: ['STATION_2', 'STATION_3', 'STATION_4', 'STATION_9', 'STATION_11'],
      description: 'Buffer for audio in processing queue'
    });
  }

  async collect(context) {
    const { buffers } = context;
    if (!buffers || !buffers.processing) return null;

    return buffers.processing.durationMs || null;
  }
}

module.exports = {
  BufferTotalCollector,
  BufferInputCollector,
  BufferOutputCollector,
  BufferJitterCollector,
  BufferUnderrunCollector,
  BufferOverrunCollector,
  BufferPlaybackCollector,
  BufferRecordCollector,
  BufferNetworkCollector,
  BufferProcessingCollector
};
