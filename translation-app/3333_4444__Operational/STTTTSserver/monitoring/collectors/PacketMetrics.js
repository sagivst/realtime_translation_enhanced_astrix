/**
 * PacketMetrics - 12 packet parameters
 */

const MetricCollector = require('./MetricCollector');

class PacketLossCollector extends MetricCollector {
  constructor() {
    super({
      id: 'packet.loss',
      name: 'Packet Loss Rate',
      unit: '%',
      range: [0, 100],
      thresholds: { warningLow: null, warningHigh: 1.0, criticalLow: null, criticalHigh: 3.0 },
      stations: ['STATION_1', 'STATION_10'],
      description: 'Percentage of packets lost'
    });
  }

  async collect(context) {
    return context.packets?.loss || null;
  }
}

class PacketReceivedCollector extends MetricCollector {
  constructor() {
    super({
      id: 'packet.received',
      name: 'Packets Received',
      unit: 'packets/s',
      range: [0, 10000],
      thresholds: { warningLow: 10, warningHigh: null, criticalLow: 0, criticalHigh: null },
      stations: ['STATION_1', 'STATION_2'],
      description: 'Rate of packets received'
    });
  }

  async collect(context) {
    return context.packets?.received || null;
  }
}

class PacketSentCollector extends MetricCollector {
  constructor() {
    super({
      id: 'packet.sent',
      name: 'Packets Sent',
      unit: 'packets/s',
      range: [0, 10000],
      thresholds: { warningLow: 10, warningHigh: null, criticalLow: 0, criticalHigh: null },
      stations: ['STATION_2', 'STATION_10'],
      description: 'Rate of packets sent'
    });
  }

  async collect(context) {
    return context.packets?.sent || null;
  }
}

class PacketDroppedCollector extends MetricCollector {
  constructor() {
    super({
      id: 'packet.dropped',
      name: 'Packets Dropped',
      unit: 'packets/s',
      range: [0, 1000],
      thresholds: { warningLow: null, warningHigh: 5, criticalLow: null, criticalHigh: 20 },
      stations: ['STATION_1', 'STATION_2', 'STATION_10'],
      description: 'Rate of packets dropped'
    });
  }

  async collect(context) {
    return context.packets?.dropped || null;
  }
}

class PacketOutOfOrderCollector extends MetricCollector {
  constructor() {
    super({
      id: 'packet.outOfOrder',
      name: 'Out-of-Order Packets',
      unit: 'packets/s',
      range: [0, 1000],
      thresholds: { warningLow: null, warningHigh: 10, criticalLow: null, criticalHigh: 50 },
      stations: ['STATION_1'],
      description: 'Packets arriving in wrong sequence'
    });
  }

  async collect(context) {
    return context.packets?.outOfOrder || null;
  }
}

class PacketDuplicateCollector extends MetricCollector {
  constructor() {
    super({
      id: 'packet.duplicate',
      name: 'Duplicate Packets',
      unit: 'packets/s',
      range: [0, 1000],
      thresholds: { warningLow: null, warningHigh: 5, criticalLow: null, criticalHigh: 20 },
      stations: ['STATION_1'],
      description: 'Duplicate packet arrivals'
    });
  }

  async collect(context) {
    return context.packets?.duplicate || null;
  }
}

class PacketRetransmitCollector extends MetricCollector {
  constructor() {
    super({
      id: 'packet.retransmit',
      name: 'Retransmitted Packets',
      unit: 'packets/s',
      range: [0, 1000],
      thresholds: { warningLow: null, warningHigh: 10, criticalLow: null, criticalHigh: 50 },
      stations: ['STATION_1', 'STATION_10'],
      description: 'Packet retransmissions'
    });
  }

  async collect(context) {
    return context.packets?.retransmit || null;
  }
}

class PacketCorruptionCollector extends MetricCollector {
  constructor() {
    super({
      id: 'packet.corruption',
      name: 'Corrupted Packets',
      unit: 'packets/s',
      range: [0, 1000],
      thresholds: { warningLow: null, warningHigh: 1, criticalLow: null, criticalHigh: 5 },
      stations: ['STATION_1', 'STATION_2'],
      description: 'Packets with checksum errors'
    });
  }

  async collect(context) {
    return context.packets?.corruption || null;
  }
}

class PacketFragmentationCollector extends MetricCollector {
  constructor() {
    super({
      id: 'packet.fragmentation',
      name: 'Fragmented Packets',
      unit: '%',
      range: [0, 100],
      thresholds: { warningLow: null, warningHigh: 20, criticalLow: null, criticalHigh: 50 },
      stations: ['STATION_1', 'STATION_10'],
      description: 'Percentage requiring fragmentation'
    });
  }

  async collect(context) {
    return context.packets?.fragmentation || null;
  }
}

class PacketReassemblyCollector extends MetricCollector {
  constructor() {
    super({
      id: 'packet.reassembly',
      name: 'Reassembly Failures',
      unit: 'count/s',
      range: [0, 1000],
      thresholds: { warningLow: null, warningHigh: 1, criticalLow: null, criticalHigh: 5 },
      stations: ['STATION_1'],
      description: 'Packet reassembly failures'
    });
  }

  async collect(context) {
    return context.packets?.reassembly || null;
  }
}

class PacketThroughputCollector extends MetricCollector {
  constructor() {
    super({
      id: 'packet.throughput',
      name: 'Packet Throughput',
      unit: 'packets/s',
      range: [0, 10000],
      thresholds: { warningLow: 20, warningHigh: null, criticalLow: 10, criticalHigh: null },
      stations: ['STATION_1', 'STATION_2', 'STATION_10'],
      description: 'Overall packet processing rate'
    });
  }

  async collect(context) {
    return context.packets?.throughput || null;
  }
}

class PacketBandwidthCollector extends MetricCollector {
  constructor() {
    super({
      id: 'packet.bandwidth',
      name: 'Bandwidth Usage',
      unit: 'Mbps',
      range: [0, 1000],
      thresholds: { warningLow: null, warningHigh: 50, criticalLow: null, criticalHigh: 100 },
      stations: ['STATION_1', 'STATION_2', 'STATION_3', 'STATION_10'],
      description: 'Network bandwidth consumed'
    });
  }

  async collect(context) {
    return context.packets?.bandwidth || null;
  }
}

module.exports = {
  PacketLossCollector,
  PacketReceivedCollector,
  PacketSentCollector,
  PacketDroppedCollector,
  PacketOutOfOrderCollector,
  PacketDuplicateCollector,
  PacketRetransmitCollector,
  PacketCorruptionCollector,
  PacketFragmentationCollector,
  PacketReassemblyCollector,
  PacketThroughputCollector,
  PacketBandwidthCollector
};
