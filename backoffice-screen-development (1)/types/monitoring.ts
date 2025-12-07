export interface MetricThresholds {
  warningLow: number | null
  warningHigh: number | null
  criticalLow: number | null
  criticalHigh: number | null
  optimum?: number
  actionSpace?: { min: number; max: number } // AI correction range
}

export interface MetricDefinition {
  id: string
  name: string
  category: "buffer" | "latency" | "packet" | "audioQuality" | "performance" | "dsp" | "custom"
  unit: string
  range: { min: number; max: number }
  thresholds: MetricThresholds
  stations: string[] // Which stations have this metric
  description?: string
}

export interface StationSnapshot {
  id?: string // Generated ID from operational system
  station_id: string // Changed from 'station' to match operational API
  extension: string // Extension number (3333 or 4444)
  timestamp: string // ISO timestamp from operational system
  call_id?: string // Current call ID if in call
  channel?: string // Channel number
  metrics: Record<string, number> // Flat object with dot-notation keys (dsp.agc.currentGain, buffer.total, etc.)
  knobs?: Record<string, string | number | boolean> // Knob values
  status?: "online" | "offline"
  config?: {
    knobs?: Record<
      string,
      {
        applicable: boolean
        validValues?: (string | number | boolean)[]
        recommendedValue?: string | number | boolean
      }
    >
    metrics?: Record<
      string,
      {
        min: number
        max: number
        optimal: number
        warning?: number
        critical?: number
      }
    >
  }
}

export interface KnobDefinition {
  station: string
  knobName: string
  variableName: string
  legalRange: string
  preferredRange: string
  metricsAffected: string[]
  installationRequirement?: string
  currentValue?: string | number | boolean
}

export interface AILogEntry {
  timestamp: number
  station: string
  changes: {
    knob: string
    before: any
    after: any
  }[]
  metricImpact: {
    metric: string
    before: number
    after: number
  }[]
}

export const STATION_DEFINITIONS = [
  {
    id: "STATION_1",
    name: "Asterisk → Gateway",
    description: "Monitors audio flow from Asterisk PBX to Gateway (RTP source monitoring)",
    extensions: ["3333", "4444"],
  },
  {
    id: "STATION_2",
    name: "Gateway → STTTTSserver",
    description: "Monitors Gateway to Speech Processing Server connection (RTP→PCM conversion)",
    extensions: ["3333", "4444"],
  },
  {
    id: "STATION_3",
    name: "STTTTSserver → Deepgram",
    description: "Voice monitoring and preparation for speech-to-text",
    extensions: ["3333", "4444"],
    extensionLabels: { "3333": "English (Caller)", "4444": "French (Callee)" },
  },
  {
    id: "STATION_4",
    name: "Deepgram Response",
    description: "Speech-to-text processing results",
    extensions: ["3333", "4444"],
    extensionLabels: { "3333": "English STT", "4444": "French STT" },
  },
  {
    id: "STATION_5",
    name: "Translation Engine",
    description: "Language translation between calls (Planned - Not yet implemented)",
    extensions: ["3333", "4444"],
  },
  {
    id: "STATION_6",
    name: "ElevenLabs TTS",
    description: "Text-to-speech synthesis (Integration exists but station not fully defined)",
    extensions: ["3333", "4444"],
  },
  {
    id: "STATION_7",
    name: "Audio Enhancement",
    description: "Post-processing and quality improvement (Placeholder for future enhancement)",
    extensions: ["3333", "4444"],
  },
  {
    id: "STATION_8",
    name: "Recording/Archive",
    description: "Call recording and archival system (Not yet implemented)",
    extensions: ["3333", "4444"],
  },
  {
    id: "STATION_9",
    name: "STTTTSserver → Gateway",
    description: "Monitors text-to-speech output back to Gateway (PCM to Gateway output)",
    extensions: ["3333", "4444"],
  },
  {
    id: "STATION_10",
    name: "Gateway → Asterisk",
    description: "Final audio delivery back to Asterisk PBX (PCM→RTP conversion)",
    extensions: ["3333", "4444"],
  },
  {
    id: "STATION_11",
    name: "STTTTSserver → Hume Branch",
    description: "Emotional AI processing branch",
    extensions: ["3333", "4444"],
  },
  {
    id: "STATION_12",
    name: "Hume Response",
    description: "Emotional AI response processing (Companion to Station 11 - Planned)",
    extensions: ["3333", "4444"],
  },
]

// All 75 metrics from the spec
export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  // BUFFER PARAMETERS (10)
  "buffer.total": {
    id: "buffer.total",
    name: "Total Buffer Utilization",
    category: "buffer",
    unit: "%",
    range: { min: 0, max: 100 },
    thresholds: { warningLow: 20, warningHigh: 80, criticalLow: 10, criticalHigh: 95, optimum: 50 },
    stations: ["STATION_1", "STATION_2", "STATION_3", "STATION_9", "STATION_10"],
  },
  "buffer.input": {
    id: "buffer.input",
    name: "Input Buffer",
    category: "buffer",
    unit: "%",
    range: { min: 0, max: 100 },
    thresholds: { warningLow: 15, warningHigh: 85, criticalLow: 5, criticalHigh: 95, optimum: 50 },
    stations: ["STATION_1", "STATION_2", "STATION_3", "STATION_4"],
  },
  "buffer.output": {
    id: "buffer.output",
    name: "Output Buffer",
    category: "buffer",
    unit: "%",
    range: { min: 0, max: 100 },
    thresholds: { warningLow: 15, warningHigh: 85, criticalLow: 5, criticalHigh: 95, optimum: 50 },
    stations: ["STATION_2", "STATION_9", "STATION_10"],
  },
  "buffer.jitter": {
    id: "buffer.jitter",
    name: "Jitter Buffer",
    category: "buffer",
    unit: "ms",
    range: { min: 0, max: 500 },
    thresholds: { warningLow: 20, warningHigh: 150, criticalLow: 10, criticalHigh: 300, optimum: 80 },
    stations: ["STATION_1", "STATION_3"],
  },
  "buffer.underrun": {
    id: "buffer.underrun",
    name: "Buffer Underruns",
    category: "buffer",
    unit: "count/s",
    range: { min: 0, max: 100 },
    thresholds: { warningLow: null, warningHigh: 5, criticalLow: null, criticalHigh: 10, optimum: 0 },
    stations: ["STATION_1", "STATION_2", "STATION_3"],
  },
  "buffer.overrun": {
    id: "buffer.overrun",
    name: "Buffer Overruns",
    category: "buffer",
    unit: "count/s",
    range: { min: 0, max: 100 },
    thresholds: { warningLow: null, warningHigh: 5, criticalLow: null, criticalHigh: 10, optimum: 0 },
    stations: ["STATION_1", "STATION_2", "STATION_3"],
  },
  "buffer.playback": {
    id: "buffer.playback",
    name: "Playback Buffer",
    category: "buffer",
    unit: "ms",
    range: { min: 0, max: 500 },
    thresholds: { warningLow: 30, warningHigh: 200, criticalLow: 10, criticalHigh: 400, optimum: 100 },
    stations: ["STATION_1", "STATION_10"],
  },
  "buffer.record": {
    id: "buffer.record",
    name: "Recording Buffer",
    category: "buffer",
    unit: "ms",
    range: { min: 0, max: 500 },
    thresholds: { warningLow: 30, warningHigh: 200, criticalLow: 10, criticalHigh: 400, optimum: 100 },
    stations: ["STATION_1", "STATION_2"],
  },
  "buffer.network": {
    id: "buffer.network",
    name: "Network Buffer",
    category: "buffer",
    unit: "KB",
    range: { min: 0, max: 1024 },
    thresholds: { warningLow: 64, warningHigh: 512, criticalLow: 32, criticalHigh: 896, optimum: 256 },
    stations: ["STATION_1", "STATION_2", "STATION_10"],
  },
  "buffer.processing": {
    id: "buffer.processing",
    name: "Processing Buffer",
    category: "buffer",
    unit: "ms",
    range: { min: 0, max: 1000 },
    thresholds: { warningLow: null, warningHigh: 200, criticalLow: null, criticalHigh: 500, optimum: 100 },
    stations: ["STATION_2", "STATION_3", "STATION_4", "STATION_9", "STATION_11"],
  },

  // LATENCY PARAMETERS (8)
  "latency.avg": {
    id: "latency.avg",
    name: "Average Latency",
    category: "latency",
    unit: "ms",
    range: { min: 0, max: 2000 },
    thresholds: { warningLow: null, warningHigh: 500, criticalLow: null, criticalHigh: 1000, optimum: 200 },
    stations: ["STATION_1", "STATION_2", "STATION_3", "STATION_4", "STATION_9", "STATION_10", "STATION_11"],
  },
  "latency.min": {
    id: "latency.min",
    name: "Minimum Latency",
    category: "latency",
    unit: "ms",
    range: { min: 0, max: 2000 },
    thresholds: { warningLow: null, warningHigh: null, criticalLow: null, criticalHigh: null, optimum: 50 },
    stations: STATION_DEFINITIONS.map((s) => s.id),
  },
  "latency.max": {
    id: "latency.max",
    name: "Maximum Latency",
    category: "latency",
    unit: "ms",
    range: { min: 0, max: 5000 },
    thresholds: { warningLow: null, warningHigh: 1500, criticalLow: null, criticalHigh: 3000, optimum: 500 },
    stations: STATION_DEFINITIONS.map((s) => s.id),
  },
  "latency.jitter": {
    id: "latency.jitter",
    name: "Latency Jitter",
    category: "latency",
    unit: "ms",
    range: { min: 0, max: 500 },
    thresholds: { warningLow: null, warningHigh: 50, criticalLow: null, criticalHigh: 100, optimum: 10 },
    stations: ["STATION_1", "STATION_2", "STATION_3", "STATION_10"],
  },
  "latency.variance": {
    id: "latency.variance",
    name: "Latency Variance",
    category: "latency",
    unit: "ms²",
    range: { min: 0, max: 10000 },
    thresholds: { warningLow: null, warningHigh: 2500, criticalLow: null, criticalHigh: 5000, optimum: 500 },
    stations: ["STATION_1", "STATION_3"],
  },
  "latency.percentile95": {
    id: "latency.percentile95",
    name: "95th Percentile Latency",
    category: "latency",
    unit: "ms",
    range: { min: 0, max: 3000 },
    thresholds: { warningLow: null, warningHigh: 800, criticalLow: null, criticalHigh: 1500, optimum: 300 },
    stations: ["STATION_1", "STATION_2", "STATION_3", "STATION_9"],
  },
  "latency.network": {
    id: "latency.network",
    name: "Network Latency",
    category: "latency",
    unit: "ms",
    range: { min: 0, max: 1000 },
    thresholds: { warningLow: null, warningHigh: 100, criticalLow: null, criticalHigh: 250, optimum: 30 },
    stations: ["STATION_1", "STATION_2", "STATION_10"],
  },
  "latency.processing": {
    id: "latency.processing",
    name: "Processing Latency",
    category: "latency",
    unit: "ms",
    range: { min: 0, max: 5000 },
    thresholds: { warningLow: null, warningHigh: 300, criticalLow: null, criticalHigh: 1000, optimum: 150 },
    stations: ["STATION_2", "STATION_3", "STATION_4", "STATION_9", "STATION_10", "STATION_11"],
  },

  // PACKET PARAMETERS (12)
  "packet.loss": {
    id: "packet.loss",
    name: "Packet Loss Rate",
    category: "packet",
    unit: "%",
    range: { min: 0, max: 100 },
    thresholds: { warningLow: null, warningHigh: 1.0, criticalLow: null, criticalHigh: 3.0, optimum: 0 },
    stations: ["STATION_1", "STATION_10"],
  },
  "packet.received": {
    id: "packet.received",
    name: "Packets Received",
    category: "packet",
    unit: "packets/s",
    range: { min: 0, max: 10000 },
    thresholds: { warningLow: 10, warningHigh: null, criticalLow: 0, criticalHigh: null, optimum: 1000 },
    stations: ["STATION_1", "STATION_2"],
  },
  "packet.sent": {
    id: "packet.sent",
    name: "Packets Sent",
    category: "packet",
    unit: "packets/s",
    range: { min: 0, max: 10000 },
    thresholds: { warningLow: 10, warningHigh: null, criticalLow: 0, criticalHigh: null, optimum: 1000 },
    stations: ["STATION_2", "STATION_10"],
  },
  "packet.dropped": {
    id: "packet.dropped",
    name: "Packets Dropped",
    category: "packet",
    unit: "packets/s",
    range: { min: 0, max: 1000 },
    thresholds: { warningLow: null, warningHigh: 5, criticalLow: null, criticalHigh: 20, optimum: 0 },
    stations: ["STATION_1", "STATION_2", "STATION_10"],
  },
  "packet.outOfOrder": {
    id: "packet.outOfOrder",
    name: "Out-of-Order Packets",
    category: "packet",
    unit: "packets/s",
    range: { min: 0, max: 1000 },
    thresholds: { warningLow: null, warningHigh: 10, criticalLow: null, criticalHigh: 50, optimum: 0 },
    stations: ["STATION_1"],
  },
  "packet.duplicate": {
    id: "packet.duplicate",
    name: "Duplicate Packets",
    category: "packet",
    unit: "packets/s",
    range: { min: 0, max: 1000 },
    thresholds: { warningLow: null, warningHigh: 5, criticalLow: null, criticalHigh: 20, optimum: 0 },
    stations: ["STATION_1"],
  },
  "packet.retransmit": {
    id: "packet.retransmit",
    name: "Retransmitted Packets",
    category: "packet",
    unit: "packets/s",
    range: { min: 0, max: 1000 },
    thresholds: { warningLow: null, warningHigh: 10, criticalLow: null, criticalHigh: 50, optimum: 0 },
    stations: ["STATION_1", "STATION_10"],
  },
  "packet.corruption": {
    id: "packet.corruption",
    name: "Corrupted Packets",
    category: "packet",
    unit: "packets/s",
    range: { min: 0, max: 1000 },
    thresholds: { warningLow: null, warningHigh: 1, criticalLow: null, criticalHigh: 5, optimum: 0 },
    stations: ["STATION_1", "STATION_2"],
  },
  "packet.fragmentation": {
    id: "packet.fragmentation",
    name: "Fragmented Packets",
    category: "packet",
    unit: "%",
    range: { min: 0, max: 100 },
    thresholds: { warningLow: null, warningHigh: 20, criticalLow: null, criticalHigh: 50, optimum: 0 },
    stations: ["STATION_1", "STATION_10"],
  },
  "packet.reassembly": {
    id: "packet.reassembly",
    name: "Reassembly Failures",
    category: "packet",
    unit: "count/s",
    range: { min: 0, max: 1000 },
    thresholds: { warningLow: null, warningHigh: 1, criticalLow: null, criticalHigh: 5, optimum: 0 },
    stations: ["STATION_1"],
  },
  "packet.throughput": {
    id: "packet.throughput",
    name: "Packet Throughput",
    category: "packet",
    unit: "packets/s",
    range: { min: 0, max: 10000 },
    thresholds: { warningLow: 20, warningHigh: null, criticalLow: 10, criticalHigh: null, optimum: 2000 },
    stations: ["STATION_1", "STATION_2", "STATION_10"],
  },
  "packet.bandwidth": {
    id: "packet.bandwidth",
    name: "Bandwidth Usage",
    category: "packet",
    unit: "Mbps",
    range: { min: 0, max: 1000 },
    thresholds: { warningLow: null, warningHigh: 50, criticalLow: null, criticalHigh: 100, optimum: 20 },
    stations: ["STATION_1", "STATION_2", "STATION_3", "STATION_10"],
  },

  // AUDIO QUALITY PARAMETERS (10)
  "audioQuality.snr": {
    id: "audioQuality.snr",
    name: "Signal-to-Noise Ratio",
    category: "audioQuality",
    unit: "dB",
    range: { min: 0, max: 60 },
    thresholds: { warningLow: 20, warningHigh: null, criticalLow: 15, criticalHigh: null, optimum: 40 },
    stations: ["STATION_1", "STATION_2", "STATION_3", "STATION_9", "STATION_11"],
  },
  "audioQuality.mos": {
    id: "audioQuality.mos",
    name: "Mean Opinion Score",
    category: "audioQuality",
    unit: "score",
    range: { min: 1.0, max: 5.0 },
    thresholds: { warningLow: 3.5, warningHigh: null, criticalLow: 2.5, criticalHigh: null, optimum: 4.5 },
    stations: ["STATION_1", "STATION_2", "STATION_9", "STATION_10"],
  },
  "audioQuality.pesq": {
    id: "audioQuality.pesq",
    name: "PESQ Score",
    category: "audioQuality",
    unit: "score",
    range: { min: -0.5, max: 4.5 },
    thresholds: { warningLow: 3.0, warningHigh: null, criticalLow: 2.0, criticalHigh: null, optimum: 4.0 },
    stations: ["STATION_1", "STATION_3"],
  },
  "audioQuality.polqa": {
    id: "audioQuality.polqa",
    name: "POLQA Score",
    category: "audioQuality",
    unit: "score",
    range: { min: 1.0, max: 5.0 },
    thresholds: { warningLow: 3.5, warningHigh: null, criticalLow: 2.5, criticalHigh: null, optimum: 4.5 },
    stations: ["STATION_1", "STATION_3"],
  },
  "audioQuality.thd": {
    id: "audioQuality.thd",
    name: "Total Harmonic Distortion",
    category: "audioQuality",
    unit: "%",
    range: { min: 0, max: 100 },
    thresholds: { warningLow: null, warningHigh: 1.0, criticalLow: null, criticalHigh: 5.0, optimum: 0.1 },
    stations: ["STATION_1", "STATION_9", "STATION_10"],
  },
  "audioQuality.speechLevel": {
    id: "audioQuality.speechLevel",
    name: "Speech Level",
    category: "audioQuality",
    unit: "dBFS",
    range: { min: -90, max: 0 },
    thresholds: { warningLow: -40, warningHigh: -6, criticalLow: -60, criticalHigh: -3, optimum: -20 },
    stations: ["STATION_1", "STATION_2", "STATION_3", "STATION_9", "STATION_11"],
  },
  "audioQuality.clipping": {
    id: "audioQuality.clipping",
    name: "Clipping Detected",
    category: "audioQuality",
    unit: "%",
    range: { min: 0, max: 100 },
    thresholds: { warningLow: null, warningHigh: 0.1, criticalLow: null, criticalHigh: 1.0, optimum: 0 },
    stations: ["STATION_2", "STATION_3", "STATION_9", "STATION_10"],
  },
  "audioQuality.noise": {
    id: "audioQuality.noise",
    name: "Background Noise Level",
    category: "audioQuality",
    unit: "dBFS",
    range: { min: -90, max: 0 },
    thresholds: { warningLow: null, warningHigh: -40, criticalLow: null, criticalHigh: -30, optimum: -60 },
    stations: ["STATION_1", "STATION_3", "STATION_11"],
  },
  "audioQuality.echo": {
    id: "audioQuality.echo",
    name: "Echo Level",
    category: "audioQuality",
    unit: "dBFS",
    range: { min: -90, max: 0 },
    thresholds: { warningLow: null, warningHigh: -30, criticalLow: null, criticalHigh: -20, optimum: -60 },
    stations: ["STATION_1", "STATION_9"],
  },
  "audioQuality.distortion": {
    id: "audioQuality.distortion",
    name: "Audio Distortion",
    category: "audioQuality",
    unit: "%",
    range: { min: 0, max: 100 },
    thresholds: { warningLow: null, warningHigh: 2.0, criticalLow: null, criticalHigh: 10.0, optimum: 0.5 },
    stations: ["STATION_9", "STATION_10"],
  },

  // PERFORMANCE PARAMETERS (8)
  "performance.cpu": {
    id: "performance.cpu",
    name: "CPU Usage",
    category: "performance",
    unit: "%",
    range: { min: 0, max: 100 },
    thresholds: { warningLow: null, warningHigh: 70, criticalLow: null, criticalHigh: 90, optimum: 40 },
    stations: STATION_DEFINITIONS.map((s) => s.id),
  },
  "performance.memory": {
    id: "performance.memory",
    name: "Memory Usage",
    category: "performance",
    unit: "%",
    range: { min: 0, max: 100 },
    thresholds: { warningLow: null, warningHigh: 75, criticalLow: null, criticalHigh: 90, optimum: 50 },
    stations: STATION_DEFINITIONS.map((s) => s.id),
  },
  "performance.bandwidth": {
    id: "performance.bandwidth",
    name: "Network Bandwidth",
    category: "performance",
    unit: "Mbps",
    range: { min: 0, max: 1000 },
    thresholds: { warningLow: null, warningHigh: 50, criticalLow: null, criticalHigh: 100, optimum: 20 },
    stations: ["STATION_1", "STATION_2", "STATION_3", "STATION_10"],
  },
  "performance.throughput": {
    id: "performance.throughput",
    name: "Data Throughput",
    category: "performance",
    unit: "KB/s",
    range: { min: 0, max: 10000 },
    thresholds: { warningLow: 50, warningHigh: null, criticalLow: 10, criticalHigh: null, optimum: 1000 },
    stations: ["STATION_1", "STATION_2", "STATION_3", "STATION_9", "STATION_10"],
  },
  "performance.threads": {
    id: "performance.threads",
    name: "Active Threads",
    category: "performance",
    unit: "count",
    range: { min: 0, max: 1000 },
    thresholds: { warningLow: null, warningHigh: 100, criticalLow: null, criticalHigh: 500, optimum: 50 },
    stations: ["STATION_2", "STATION_3", "STATION_9"],
  },
  "performance.queue": {
    id: "performance.queue",
    name: "Queue Depth",
    category: "performance",
    unit: "items",
    range: { min: 0, max: 10000 },
    thresholds: { warningLow: null, warningHigh: 100, criticalLow: null, criticalHigh: 500, optimum: 20 },
    stations: ["STATION_2", "STATION_3", "STATION_4", "STATION_9", "STATION_11"],
  },
  "performance.cache": {
    id: "performance.cache",
    name: "Cache Hit Rate",
    category: "performance",
    unit: "%",
    range: { min: 0, max: 100 },
    thresholds: { warningLow: 70, warningHigh: null, criticalLow: 50, criticalHigh: null, optimum: 95 },
    stations: ["STATION_3", "STATION_4"],
  },
  "performance.io": {
    id: "performance.io",
    name: "I/O Wait Time",
    category: "performance",
    unit: "%",
    range: { min: 0, max: 100 },
    thresholds: { warningLow: null, warningHigh: 30, criticalLow: null, criticalHigh: 50, optimum: 5 },
    stations: ["STATION_2", "STATION_3", "STATION_9"],
  },

  // DSP PARAMETERS (20) - AGC
  "dsp.agc.currentGain": {
    id: "dsp.agc.currentGain",
    name: "AGC Current Gain",
    category: "dsp",
    unit: "dB",
    range: { min: -30, max: 40 },
    thresholds: { warningLow: null, warningHigh: 30, criticalLow: null, criticalHigh: 38, optimum: 10 },
    stations: ["STATION_3", "STATION_9"],
  },
  "dsp.agc.targetLevel": {
    id: "dsp.agc.targetLevel",
    name: "AGC Target Level",
    category: "dsp",
    unit: "dBFS",
    range: { min: -30, max: -3 },
    thresholds: { warningLow: null, warningHigh: null, criticalLow: null, criticalHigh: null, optimum: -15 },
    stations: ["STATION_3", "STATION_9"],
  },
  "dsp.agc.attackTime": {
    id: "dsp.agc.attackTime",
    name: "AGC Attack Time",
    category: "dsp",
    unit: "ms",
    range: { min: 1, max: 100 },
    thresholds: { warningLow: null, warningHigh: null, criticalLow: null, criticalHigh: null, optimum: 10 },
    stations: ["STATION_3", "STATION_9"],
  },
  "dsp.agc.releaseTime": {
    id: "dsp.agc.releaseTime",
    name: "AGC Release Time",
    category: "dsp",
    unit: "ms",
    range: { min: 10, max: 1000 },
    thresholds: { warningLow: null, warningHigh: null, criticalLow: null, criticalHigh: null, optimum: 100 },
    stations: ["STATION_3", "STATION_9"],
  },
  "dsp.agc.maxGain": {
    id: "dsp.agc.maxGain",
    name: "AGC Maximum Gain",
    category: "dsp",
    unit: "dB",
    range: { min: 0, max: 40 },
    thresholds: { warningLow: null, warningHigh: null, criticalLow: null, criticalHigh: null, optimum: 20 },
    stations: ["STATION_3", "STATION_9"],
  },

  // DSP - AEC
  "dsp.aec.echoLevel": {
    id: "dsp.aec.echoLevel",
    name: "Echo Level",
    category: "dsp",
    unit: "dBFS",
    range: { min: -90, max: 0 },
    thresholds: { warningLow: null, warningHigh: -30, criticalLow: null, criticalHigh: -20, optimum: -60 },
    stations: ["STATION_1", "STATION_9"],
  },
  "dsp.aec.suppression": {
    id: "dsp.aec.suppression",
    name: "Echo Suppression",
    category: "dsp",
    unit: "dB",
    range: { min: 0, max: 60 },
    thresholds: { warningLow: null, warningHigh: null, criticalLow: null, criticalHigh: null, optimum: 30 },
    stations: ["STATION_9"],
  },
  "dsp.aec.tailLength": {
    id: "dsp.aec.tailLength",
    name: "AEC Tail Length",
    category: "dsp",
    unit: "ms",
    range: { min: 64, max: 512 },
    thresholds: { warningLow: null, warningHigh: null, criticalLow: null, criticalHigh: null, optimum: 256 },
    stations: ["STATION_9"],
  },
  "dsp.aec.convergenceTime": {
    id: "dsp.aec.convergenceTime",
    name: "AEC Convergence Time",
    category: "dsp",
    unit: "ms",
    range: { min: 0, max: 5000 },
    thresholds: { warningLow: null, warningHigh: null, criticalLow: null, criticalHigh: null, optimum: 1000 },
    stations: ["STATION_9"],
  },

  // DSP - Noise Reduction
  "dsp.noiseReduction.noiseLevel": {
    id: "dsp.noiseReduction.noiseLevel",
    name: "Detected Noise Level",
    category: "dsp",
    unit: "dBFS",
    range: { min: -90, max: 0 },
    thresholds: { warningLow: null, warningHigh: -40, criticalLow: null, criticalHigh: -30, optimum: -60 },
    stations: ["STATION_1", "STATION_3", "STATION_11"],
  },
  "dsp.noiseReduction.suppression": {
    id: "dsp.noiseReduction.suppression",
    name: "Noise Suppression",
    category: "dsp",
    unit: "dB",
    range: { min: 0, max: 40 },
    thresholds: { warningLow: null, warningHigh: null, criticalLow: null, criticalHigh: null, optimum: 20 },
    stations: ["STATION_3"],
  },
  "dsp.noiseReduction.snrImprovement": {
    id: "dsp.noiseReduction.snrImprovement",
    name: "SNR Improvement",
    category: "dsp",
    unit: "dB",
    range: { min: 0, max: 30 },
    thresholds: { warningLow: null, warningHigh: null, criticalLow: null, criticalHigh: null, optimum: 15 },
    stations: ["STATION_3"],
  },

  // DSP - Compressor
  "dsp.compressor.reduction": {
    id: "dsp.compressor.reduction",
    name: "Compressor Gain Reduction",
    category: "dsp",
    unit: "dB",
    range: { min: 0, max: 40 },
    thresholds: { warningLow: null, warningHigh: 20, criticalLow: null, criticalHigh: 35, optimum: 10 },
    stations: ["STATION_9"],
  },
  "dsp.compressor.threshold": {
    id: "dsp.compressor.threshold",
    name: "Compressor Threshold",
    category: "dsp",
    unit: "dBFS",
    range: { min: -60, max: 0 },
    thresholds: { warningLow: null, warningHigh: null, criticalLow: null, criticalHigh: null, optimum: -20 },
    stations: ["STATION_9"],
  },
  "dsp.compressor.ratio": {
    id: "dsp.compressor.ratio",
    name: "Compression Ratio",
    category: "dsp",
    unit: ":1",
    range: { min: 1, max: 20 },
    thresholds: { warningLow: null, warningHigh: null, criticalLow: null, criticalHigh: null, optimum: 4 },
    stations: ["STATION_9"],
  },

  // DSP - Limiter
  "dsp.limiter.threshold": {
    id: "dsp.limiter.threshold",
    name: "Limiter Threshold",
    category: "dsp",
    unit: "dBFS",
    range: { min: -20, max: 0 },
    thresholds: { warningLow: null, warningHigh: null, criticalLow: null, criticalHigh: null, optimum: -3 },
    stations: ["STATION_9"],
  },
  "dsp.limiter.reduction": {
    id: "dsp.limiter.reduction",
    name: "Limiter Gain Reduction",
    category: "dsp",
    unit: "dB",
    range: { min: 0, max: 30 },
    thresholds: { warningLow: null, warningHigh: 15, criticalLow: null, criticalHigh: 25, optimum: 5 },
    stations: ["STATION_9"],
  },
  "dsp.limiter.releaseTime": {
    id: "dsp.limiter.releaseTime",
    name: "Limiter Release Time",
    category: "dsp",
    unit: "ms",
    range: { min: 10, max: 500 },
    thresholds: { warningLow: null, warningHigh: null, criticalLow: null, criticalHigh: null, optimum: 100 },
    stations: ["STATION_9"],
  },

  // DSP - EQ
  "dsp.eq.band1": {
    id: "dsp.eq.band1",
    name: "EQ Band 1 (80Hz)",
    category: "dsp",
    unit: "dB",
    range: { min: -12, max: 12 },
    thresholds: { warningLow: null, warningHigh: null, criticalLow: null, criticalHigh: null, optimum: 0 },
    stations: ["STATION_9"],
  },
  "dsp.eq.band2": {
    id: "dsp.eq.band2",
    name: "EQ Band 2 (800Hz)",
    category: "dsp",
    unit: "dB",
    range: { min: -12, max: 12 },
    thresholds: { warningLow: null, warningHigh: null, criticalLow: null, criticalHigh: null, optimum: 0 },
    stations: ["STATION_9"],
  },
}

export const METRIC_CATEGORIES = {
  buffer: Object.keys(METRIC_DEFINITIONS).filter((k) => METRIC_DEFINITIONS[k].category === "buffer"),
  latency: Object.keys(METRIC_DEFINITIONS).filter((k) => METRIC_DEFINITIONS[k].category === "latency"),
  packet: Object.keys(METRIC_DEFINITIONS).filter((k) => METRIC_DEFINITIONS[k].category === "packet"),
  audioQuality: Object.keys(METRIC_DEFINITIONS).filter((k) => METRIC_DEFINITIONS[k].category === "audioQuality"),
  performance: Object.keys(METRIC_DEFINITIONS).filter((k) => METRIC_DEFINITIONS[k].category === "performance"),
  dsp: Object.keys(METRIC_DEFINITIONS).filter((k) => METRIC_DEFINITIONS[k].category === "dsp"),
}

// Helper function to get metrics for a specific station
export function getStationMetrics(stationId: string): MetricDefinition[] {
  return Object.values(METRIC_DEFINITIONS).filter((metric) => metric.stations.includes(stationId))
}
