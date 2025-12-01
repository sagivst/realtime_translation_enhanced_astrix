# Universal Collector Design - All 75 Parameters

## Core Concept

**ONE module collects ALL 75 parameters**
- Server decides which parameters to use per station
- Filtering happens at server level, not collector level
- Reusable across all 7 stations
- Easy to add new parameters

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  UniversalCollector (collects ALL 75 parameters)         │
│  - Tries to collect everything                           │
│  - Returns all available values                          │
│  - Doesn't care about stations                          │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ↓ Returns all 75 metrics
┌──────────────────────────────────────────────────────────┐
│  StationAgent (filters per station)                      │
│  - Station 1 filter: keeps 12 parameters                 │
│  - Station 2 filter: keeps 10 parameters                 │
│  - Station 3 filter: keeps 14 parameters                 │
│  - etc.                                                  │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ↓ Emits filtered metrics
┌──────────────────────────────────────────────────────────┐
│  Socket.IO → Dashboard                                   │
└──────────────────────────────────────────────────────────┘
```

---

## File Structure

```
STTTTSserver/
└── monitoring/
    ├── UniversalCollector.js          ⭐ NEW - Collects all 75
    ├── StationAgent.js                ⭐ NEW - Filters per station
    ├── collectors/
    │   ├── MetricCollector.js         ✅ Base class
    │   ├── BufferMetrics.js           ✅ 10 collectors
    │   ├── LatencyMetrics.js          ⭐ NEW - 8 collectors
    │   ├── PacketMetrics.js           ⭐ NEW - 12 collectors
    │   ├── AudioQualityMetrics.js     ✅ 10 collectors
    │   ├── PerformanceMetrics.js      ⭐ NEW - 8 collectors
    │   ├── DSPMetrics.js              ⭐ NEW - 20 collectors
    │   └── CustomMetrics.js           ⭐ NEW - 7 collectors
    ├── utils/
    │   └── AudioAnalyzer.js           ✅ Analysis utilities
    └── config/
        └── station-parameter-map.js   ⭐ NEW - Which params per station
```

---

## UniversalCollector.js

```javascript
/**
 * UniversalCollector - Collects ALL 75 parameters
 *
 * Doesn't care about stations - just collects everything it can.
 * Returns all values, nulls for unavailable parameters.
 */

// Import ALL collector categories
const BufferCollectors = require('./collectors/BufferMetrics');
const LatencyCollectors = require('./collectors/LatencyMetrics');
const PacketCollectors = require('./collectors/PacketMetrics');
const AudioQualityCollectors = require('./collectors/AudioQualityMetrics');
const PerformanceCollectors = require('./collectors/PerformanceMetrics');
const DSPCollectors = require('./collectors/DSPMetrics');
const CustomCollectors = require('./collectors/CustomMetrics');

class UniversalCollector {
  constructor() {
    // Initialize ALL 75 collectors
    this.collectors = {};

    // Buffer (10)
    this.collectors['buffer.total'] = new BufferCollectors.BufferTotalCollector();
    this.collectors['buffer.input'] = new BufferCollectors.BufferInputCollector();
    this.collectors['buffer.output'] = new BufferCollectors.BufferOutputCollector();
    this.collectors['buffer.jitter'] = new BufferCollectors.BufferJitterCollector();
    this.collectors['buffer.underrun'] = new BufferCollectors.BufferUnderrunCollector();
    this.collectors['buffer.overrun'] = new BufferCollectors.BufferOverrunCollector();
    this.collectors['buffer.playback'] = new BufferCollectors.BufferPlaybackCollector();
    this.collectors['buffer.record'] = new BufferCollectors.BufferRecordCollector();
    this.collectors['buffer.network'] = new BufferCollectors.BufferNetworkCollector();
    this.collectors['buffer.processing'] = new BufferCollectors.BufferProcessingCollector();

    // Latency (8)
    this.collectors['latency.avg'] = new LatencyCollectors.LatencyAvgCollector();
    this.collectors['latency.min'] = new LatencyCollectors.LatencyMinCollector();
    this.collectors['latency.max'] = new LatencyCollectors.LatencyMaxCollector();
    this.collectors['latency.jitter'] = new LatencyCollectors.LatencyJitterCollector();
    this.collectors['latency.variance'] = new LatencyCollectors.LatencyVarianceCollector();
    this.collectors['latency.percentile95'] = new LatencyCollectors.Latency95thCollector();
    this.collectors['latency.network'] = new LatencyCollectors.LatencyNetworkCollector();
    this.collectors['latency.processing'] = new LatencyCollectors.LatencyProcessingCollector();

    // Packet (12)
    this.collectors['packet.loss'] = new PacketCollectors.PacketLossCollector();
    this.collectors['packet.received'] = new PacketCollectors.PacketReceivedCollector();
    this.collectors['packet.sent'] = new PacketCollectors.PacketSentCollector();
    this.collectors['packet.dropped'] = new PacketCollectors.PacketDroppedCollector();
    this.collectors['packet.outOfOrder'] = new PacketCollectors.PacketOutOfOrderCollector();
    this.collectors['packet.duplicate'] = new PacketCollectors.PacketDuplicateCollector();
    this.collectors['packet.retransmit'] = new PacketCollectors.PacketRetransmitCollector();
    this.collectors['packet.corruption'] = new PacketCollectors.PacketCorruptionCollector();
    this.collectors['packet.fragmentation'] = new PacketCollectors.PacketFragmentationCollector();
    this.collectors['packet.reassembly'] = new PacketCollectors.PacketReassemblyCollector();
    this.collectors['packet.throughput'] = new PacketCollectors.PacketThroughputCollector();
    this.collectors['packet.bandwidth'] = new PacketCollectors.PacketBandwidthCollector();

    // Audio Quality (10)
    this.collectors['audioQuality.snr'] = new AudioQualityCollectors.SNRCollector();
    this.collectors['audioQuality.mos'] = new AudioQualityCollectors.MOSCollector();
    this.collectors['audioQuality.pesq'] = new AudioQualityCollectors.PESQCollector();
    this.collectors['audioQuality.polqa'] = new AudioQualityCollectors.POLQACollector();
    this.collectors['audioQuality.thd'] = new AudioQualityCollectors.THDCollector();
    this.collectors['audioQuality.speechLevel'] = new AudioQualityCollectors.SpeechLevelCollector();
    this.collectors['audioQuality.clipping'] = new AudioQualityCollectors.ClippingCollector();
    this.collectors['audioQuality.noise'] = new AudioQualityCollectors.NoiseCollector();
    this.collectors['audioQuality.echo'] = new AudioQualityCollectors.EchoCollector();
    this.collectors['audioQuality.distortion'] = new AudioQualityCollectors.DistortionCollector();

    // Performance (8)
    this.collectors['performance.cpu'] = new PerformanceCollectors.CPUCollector();
    this.collectors['performance.memory'] = new PerformanceCollectors.MemoryCollector();
    this.collectors['performance.bandwidth'] = new PerformanceCollectors.BandwidthCollector();
    this.collectors['performance.throughput'] = new PerformanceCollectors.ThroughputCollector();
    this.collectors['performance.threads'] = new PerformanceCollectors.ThreadsCollector();
    this.collectors['performance.queue'] = new PerformanceCollectors.QueueCollector();
    this.collectors['performance.cache'] = new PerformanceCollectors.CacheCollector();
    this.collectors['performance.io'] = new PerformanceCollectors.IOWaitCollector();

    // DSP (20)
    this.collectors['dsp.agc.currentGain'] = new DSPCollectors.AGCCurrentGainCollector();
    this.collectors['dsp.agc.targetLevel'] = new DSPCollectors.AGCTargetLevelCollector();
    this.collectors['dsp.agc.attackTime'] = new DSPCollectors.AGCAttackTimeCollector();
    this.collectors['dsp.agc.releaseTime'] = new DSPCollectors.AGCReleaseTimeCollector();
    this.collectors['dsp.agc.maxGain'] = new DSPCollectors.AGCMaxGainCollector();

    this.collectors['dsp.aec.echoLevel'] = new DSPCollectors.AECEchoLevelCollector();
    this.collectors['dsp.aec.suppression'] = new DSPCollectors.AECSuppressionCollector();
    this.collectors['dsp.aec.tailLength'] = new DSPCollectors.AECTailLengthCollector();
    this.collectors['dsp.aec.convergenceTime'] = new DSPCollectors.AECConvergenceCollector();

    this.collectors['dsp.noiseReduction.noiseLevel'] = new DSPCollectors.NRNoiseLevelCollector();
    this.collectors['dsp.noiseReduction.suppression'] = new DSPCollectors.NRSuppressionCollector();
    this.collectors['dsp.noiseReduction.snrImprovement'] = new DSPCollectors.NRSNRImprovementCollector();

    this.collectors['dsp.compressor.reduction'] = new DSPCollectors.CompressorReductionCollector();
    this.collectors['dsp.compressor.threshold'] = new DSPCollectors.CompressorThresholdCollector();
    this.collectors['dsp.compressor.ratio'] = new DSPCollectors.CompressorRatioCollector();

    this.collectors['dsp.limiter.reduction'] = new DSPCollectors.LimiterReductionCollector();
    this.collectors['dsp.limiter.threshold'] = new DSPCollectors.LimiterThresholdCollector();

    this.collectors['dsp.equalizer.response'] = new DSPCollectors.EqualizerResponseCollector();
    this.collectors['dsp.equalizer.preset'] = new DSPCollectors.EqualizerPresetCollector();

    this.collectors['dsp.gate.attenuation'] = new DSPCollectors.GateAttenuationCollector();

    // Custom (7)
    this.collectors['custom.state'] = new CustomCollectors.StateCollector();
    this.collectors['custom.successRate'] = new CustomCollectors.SuccessRateCollector();
    this.collectors['custom.warningCount'] = new CustomCollectors.WarningCountCollector();
    this.collectors['custom.criticalCount'] = new CustomCollectors.CriticalCountCollector();
    this.collectors['custom.totalProcessed'] = new CustomCollectors.TotalProcessedCollector();
    this.collectors['custom.processingSpeed'] = new CustomCollectors.ProcessingSpeedCollector();
    this.collectors['custom.lastActivity'] = new CustomCollectors.LastActivityCollector();
  }

  /**
   * Collect ALL 75 parameters
   * Returns all values, nulls for unavailable
   *
   * @param {Object} context - Full context data
   * @returns {Object} - { metrics: {...}, alerts: [...] }
   */
  async collectAll(context) {
    const metrics = {};
    const alerts = [];

    // Try to collect ALL parameters
    for (const [key, collector] of Object.entries(this.collectors)) {
      try {
        const value = await collector.collect(context);

        // Store even if null (means parameter not available in this context)
        metrics[key] = value;

        // Only check thresholds for non-null values
        if (value !== null && value !== undefined) {
          const validation = collector.validate(value);
          if (validation.level === 'warning' || validation.level === 'critical') {
            alerts.push({
              metric: key,
              level: validation.level,
              value: value,
              threshold: validation.threshold,
              message: validation.message
            });
          }
        }
      } catch (error) {
        // Don't fail entire collection if one metric fails
        metrics[key] = null;
        console.error(`[UniversalCollector] Error collecting ${key}:`, error.message);
      }
    }

    return { metrics, alerts };
  }

  /**
   * Get collector count
   */
  getCollectorCount() {
    return Object.keys(this.collectors).length; // Should be 75
  }
}

module.exports = UniversalCollector;
```

---

## StationAgent.js (Filtering Layer)

```javascript
/**
 * StationAgent - Filters universal metrics per station
 *
 * Takes ALL 75 parameters from UniversalCollector
 * Returns only the parameters relevant to this station
 */

const UniversalCollector = require('./UniversalCollector');
const stationParameterMap = require('./config/station-parameter-map');

class StationAgent {
  constructor(stationId, extension) {
    this.stationId = stationId;
    this.extension = extension;

    // Single universal collector instance
    this.universalCollector = new UniversalCollector();

    // Get parameter list for this station
    this.allowedParameters = stationParameterMap[stationId] || [];

    console.log(`[${stationId}-${extension}] Initialized with ${this.allowedParameters.length} parameters`);
  }

  /**
   * Collect metrics for this station
   * Filters results to only include relevant parameters
   *
   * @param {Object} context - Full context
   * @returns {Object} - { metrics: {filtered}, alerts: [...] }
   */
  async collect(context) {
    // Collect ALL 75 parameters
    const { metrics: allMetrics, alerts: allAlerts } =
      await this.universalCollector.collectAll(context);

    // Filter to only this station's parameters
    const filteredMetrics = {};
    for (const param of this.allowedParameters) {
      if (param in allMetrics) {
        filteredMetrics[param] = allMetrics[param];
      }
    }

    // Filter alerts to only this station's parameters
    const filteredAlerts = allAlerts.filter(alert =>
      this.allowedParameters.includes(alert.metric)
    );

    return {
      metrics: filteredMetrics,
      alerts: filteredAlerts
    };
  }

  /**
   * Get parameter count for this station
   */
  getParameterCount() {
    return this.allowedParameters.length;
  }
}

module.exports = StationAgent;
```

---

## station-parameter-map.js (Configuration)

```javascript
/**
 * Station Parameter Map
 *
 * Defines which of the 75 parameters apply to each station
 */

module.exports = {
  // STATION 1: Asterisk → Gateway (12 parameters)
  STATION_1: [
    'buffer.input',
    'buffer.jitter',
    'latency.network',
    'latency.jitter',
    'latency.min',
    'latency.max',
    'packet.received',
    'packet.loss',
    'packet.outOfOrder',
    'audioQuality.snr',
    'audioQuality.mos',
    'performance.cpu'
  ],

  // STATION 2: Gateway → STTTTSserver (10 parameters)
  STATION_2: [
    'buffer.output',
    'buffer.processing',
    'latency.processing',
    'audioQuality.mos',
    'audioQuality.speechLevel',
    'audioQuality.clipping',
    'performance.cpu',
    'performance.bandwidth',
    'custom.state',
    'custom.successRate'
  ],

  // STATION 3: STTTTSserver → Deepgram (14 parameters)
  STATION_3: [
    'buffer.processing',
    'latency.processing',
    'audioQuality.snr',
    'audioQuality.speechLevel',
    'audioQuality.clipping',
    'audioQuality.noise',
    'dsp.agc.currentGain',
    'dsp.noiseReduction.noiseLevel',
    'performance.cpu',
    'performance.memory',
    'performance.bandwidth',
    'custom.state',
    'custom.successRate',
    'custom.totalProcessed'
  ],

  // STATION 4: Deepgram Response (8 parameters)
  STATION_4: [
    'latency.processing',
    'custom.transcriptionLength',
    'custom.wordCount',
    'custom.confidence',
    'custom.successRate',
    'custom.lastActivity',
    'performance.cpu',
    'performance.queue'
  ],

  // STATION 9: STTTTSserver → Gateway (15 parameters)
  STATION_9: [
    'buffer.output',
    'latency.avg',
    'latency.total',
    'audioQuality.mos',
    'audioQuality.speechLevel',
    'audioQuality.clipping',
    'audioQuality.distortion',
    'dsp.agc.currentGain',
    'dsp.compressor.reduction',
    'dsp.limiter.reduction',
    'performance.cpu',
    'performance.memory',
    'custom.state',
    'custom.latencySyncApplied',
    'custom.pipelineLatency'
  ],

  // STATION 10: Gateway → Asterisk (10 parameters)
  STATION_10: [
    'buffer.output',
    'packet.sent',
    'packet.dropped',
    'latency.processing',
    'audioQuality.mos',
    'audioQuality.thd',
    'performance.cpu',
    'performance.bandwidth',
    'custom.framesSent',
    'custom.framesDropped'
  ],

  // STATION 11: STTTTSserver → Hume Branch (10 parameters)
  STATION_11: [
    'buffer.processing',
    'latency.processing',
    'latency.websocket',
    'audioQuality.snr',
    'audioQuality.speechLevel',
    'custom.queueDepth',
    'custom.websocketConnected',
    'custom.successRate',
    'custom.lastActivity',
    'performance.cpu'
  ]
};
```

---

## Usage in STTTTSserver.js

```javascript
// At top of file
const StationAgent = require('./monitoring/StationAgent');

// Initialize station agents
const station3_3333 = new StationAgent('STATION_3', '3333');
const station3_4444 = new StationAgent('STATION_3', '4444');

console.log(`[Monitoring] ✓ Universal collector with ${station3_3333.universalCollector.getCollectorCount()} total parameters`);
console.log(`[Monitoring] ✓ Station 3 filters to ${station3_3333.getParameterCount()} parameters`);

// In UDP handler
socket3333In.on('message', async (msg, rinfo) => {
  // ... existing code

  // Collect metrics (filters automatically to Station 3's 14 parameters)
  if (udpPcmStats.from3333Packets % 50 === 0) {
    setImmediate(async () => {
      const { metrics, alerts } = await station3_3333.collect({
        pcmBuffer: msg,
        sampleRate: 16000,
        buffers: udpAudioBuffers.get('3333'),
        // ... other context data
      });

      global.io.emit('station3_metrics', {
        station: 'STATION_3',
        extension: '3333',
        timestamp: Date.now(),
        metrics,  // Only 14 parameters for Station 3
        alerts
      });
    });
  }
});
```

---

## Benefits of This Approach

✅ **One collector module** - All 75 parameters in one place
✅ **Reusable** - Same collectors used by all stations
✅ **Easy to modify** - Change parameter assignment in config file only
✅ **Flexible** - Can easily add new parameters or change station assignments
✅ **Maintainable** - Clear separation of collection vs filtering
✅ **Testable** - Can test universal collector independently

---

## Implementation Steps

1. **Create all collector files** (BufferMetrics, LatencyMetrics, etc.)
2. **Create UniversalCollector.js** (loads all 75)
3. **Create station-parameter-map.js** (configuration)
4. **Create StationAgent.js** (filtering layer)
5. **Embed in STTTTSserver.js** (use StationAgent)

---

**This is much better! Should I proceed with this universal approach?**
