# Station 3 - REVISED Complete Implementation

## All 14 Parameters for Station 3

### Complete Parameter List

**Buffer (1):**
1. buffer.processing

**Latency (1):**
2. latency.processing

**Audio Quality (4):**
3. audioQuality.snr
4. audioQuality.speechLevel
5. audioQuality.clipping
6. audioQuality.noise

**DSP (2):**
7. dsp.agc.currentGain
8. dsp.noiseReduction.noiseLevel

**Performance (3):**
9. performance.cpu
10. performance.memory
11. performance.bandwidth

**Custom (3):**
12. custom.state
13. custom.successRate
14. custom.totalProcessed

---

## Revised Station3Collectors.js

```javascript
/**
 * Station 3 Collectors - Pre-Deepgram Monitoring
 * ALL 14 PARAMETERS
 */

const {
  BufferProcessingCollector
} = require('./BufferMetrics');

const {
  LatencyProcessingCollector
} = require('./LatencyMetrics');

const {
  SNRCollector,
  SpeechLevelCollector,
  ClippingCollector,
  NoiseCollector
} = require('./AudioQualityMetrics');

const {
  CPUCollector,
  MemoryCollector,
  BandwidthCollector
} = require('./PerformanceMetrics');

const {
  DSPAGCCurrentGainCollector,
  DSPNoiseReductionLevelCollector
} = require('./DSPMetrics');

const {
  CustomStateCollector,
  CustomSuccessRateCollector,
  CustomTotalProcessedCollector
} = require('./CustomMetrics');

class Station3CollectorSet {
  constructor(extension) {
    this.extension = extension;

    // Performance counters
    this.totalProcessed = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.state = 'idle';
    this.startTime = Date.now();
    this.lastProcessingTime = 0;

    // Bandwidth tracking
    this.bytesProcessed = 0;
    this.lastBandwidthCheck = Date.now();

    // Initialize ALL 14 collectors
    this.collectors = {
      // Buffer (1)
      'buffer.processing': new BufferProcessingCollector(),

      // Latency (1)
      'latency.processing': new LatencyProcessingCollector(),

      // Audio Quality (4)
      'audioQuality.snr': new SNRCollector(),
      'audioQuality.speechLevel': new SpeechLevelCollector(),
      'audioQuality.clipping': new ClippingCollector(),
      'audioQuality.noise': new NoiseCollector(),

      // DSP (2)
      'dsp.agc.currentGain': new DSPAGCCurrentGainCollector(),
      'dsp.noiseReduction.noiseLevel': new DSPNoiseReductionLevelCollector(),

      // Performance (3)
      'performance.cpu': new CPUCollector(),
      'performance.memory': new MemoryCollector(),
      'performance.bandwidth': new BandwidthCollector(),

      // Custom (3)
      'custom.state': new CustomStateCollector(),
      'custom.successRate': new CustomSuccessRateCollector(),
      'custom.totalProcessed': new CustomTotalProcessedCollector()
    };
  }

  /**
   * Collect all metrics for Station 3
   * @param {Object} context - Audio and buffer data
   * @returns {Object} - Collected metrics and alerts
   */
  async collectAll(context) {
    const startTime = Date.now();
    this.state = 'processing';

    const metrics = {};
    const alerts = [];

    // Track processing
    this.totalProcessed++;
    this.bytesProcessed += context.pcmBuffer ? context.pcmBuffer.length : 0;

    // Build enhanced context with our tracking data
    const enhancedContext = {
      ...context,

      // For buffer.processing
      buffers: {
        processing: {
          durationMs: context.buffers?.chunks?.length * 10 || 0,
          size: context.buffers?.totalBytes || 0,
          capacity: 32000
        }
      },

      // For latency.processing (calculated after collection)
      processingTime: this.lastProcessingTime,

      // For DSP metrics (if you have AGC/NR state)
      dsp: {
        agc: {
          currentGain: context.agcGain || 0  // Pass from existing AGC if available
        },
        noiseReduction: {
          noiseLevel: context.noiseLevel || -90
        }
      },

      // For custom metrics
      custom: {
        state: this.state,
        totalProcessed: this.totalProcessed,
        successCount: this.successCount,
        errorCount: this.errorCount
      },

      // For bandwidth calculation
      bandwidth: {
        bytesProcessed: this.bytesProcessed,
        timeSinceLastCheck: Date.now() - this.lastBandwidthCheck
      }
    };

    // Collect all metrics
    for (const [key, collector] of Object.entries(this.collectors)) {
      try {
        const value = await collector.collect(enhancedContext);

        if (value !== null && value !== undefined) {
          metrics[key] = value;

          // Check thresholds
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
        console.error(`[Station3-${this.extension}] Error collecting ${key}:`, error.message);
        this.errorCount++;
      }
    }

    // Update state
    const endTime = Date.now();
    this.lastProcessingTime = endTime - startTime;
    this.state = 'active';

    if (this.errorCount === 0) {
      this.successCount++;
    }

    // Reset bandwidth counter periodically
    if (Date.now() - this.lastBandwidthCheck > 1000) {
      this.bytesProcessed = 0;
      this.lastBandwidthCheck = Date.now();
    }

    return { metrics, alerts };
  }

  /**
   * Get current state
   */
  getState() {
    return this.state;
  }

  /**
   * Reset counters
   */
  reset() {
    this.totalProcessed = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.state = 'idle';
    this.startTime = Date.now();
  }
}

module.exports = Station3CollectorSet;
```

---

## Additional Collector Modules Needed

You already have:
- ✅ MetricCollector.js (base class)
- ✅ BufferMetrics.js
- ✅ AudioQualityMetrics.js
- ✅ AudioAnalyzer.js

Still need to create:
- ❌ LatencyMetrics.js
- ❌ PerformanceMetrics.js
- ❌ DSPMetrics.js
- ❌ CustomMetrics.js

---

## Missing Collector Files

### 1. LatencyMetrics.js

```javascript
const MetricCollector = require('./MetricCollector');

class LatencyProcessingCollector extends MetricCollector {
  constructor() {
    super({
      id: 'latency.processing',
      name: 'Processing Latency',
      unit: 'ms',
      range: [0, 5000],
      thresholds: {
        warningLow: null,
        warningHigh: 300,
        criticalLow: null,
        criticalHigh: 1000
      },
      stations: ['STATION_2', 'STATION_3', 'STATION_4', 'STATION_9', 'STATION_10', 'STATION_11'],
      description: 'Time spent in processing/computation'
    });
  }

  async collect(context) {
    const { processingTime } = context;
    return processingTime || 0;
  }
}

module.exports = { LatencyProcessingCollector };
```

### 2. PerformanceMetrics.js

```javascript
const MetricCollector = require('./MetricCollector');
const os = require('os');

class CPUCollector extends MetricCollector {
  constructor() {
    super({
      id: 'performance.cpu',
      name: 'CPU Usage',
      unit: '%',
      range: [0, 100],
      thresholds: {
        warningLow: null,
        warningHigh: 70,
        criticalLow: null,
        criticalHigh: 90
      },
      stations: ['All'],
      description: 'CPU utilization percentage'
    });

    this.lastCPU = process.cpuUsage();
    this.lastCheck = Date.now();
  }

  async collect(context) {
    const currentCPU = process.cpuUsage();
    const currentTime = Date.now();
    const elapsedTime = (currentTime - this.lastCheck) * 1000; // microseconds

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
      thresholds: {
        warningLow: null,
        warningHigh: 75,
        criticalLow: null,
        criticalHigh: 90
      },
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
      thresholds: {
        warningLow: null,
        warningHigh: 50,
        criticalLow: null,
        criticalHigh: 100
      },
      stations: ['STATION_1', 'STATION_2', 'STATION_3', 'STATION_10'],
      description: 'Network bandwidth consumed'
    });
  }

  async collect(context) {
    const { bandwidth } = context;
    if (!bandwidth) return 0;

    const { bytesProcessed, timeSinceLastCheck } = bandwidth;
    if (timeSinceLastCheck === 0) return 0;

    // Convert to Mbps
    const bitsPerSecond = (bytesProcessed * 8) / (timeSinceLastCheck / 1000);
    const mbps = bitsPerSecond / 1000000;

    return mbps;
  }
}

module.exports = {
  CPUCollector,
  MemoryCollector,
  BandwidthCollector
};
```

### 3. DSPMetrics.js

```javascript
const MetricCollector = require('./MetricCollector');

class DSPAGCCurrentGainCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.agc.currentGain',
      name: 'AGC Current Gain',
      unit: 'dB',
      range: [-30, 40],
      thresholds: {
        warningLow: null,
        warningHigh: 30,
        criticalLow: null,
        criticalHigh: 38
      },
      stations: ['STATION_3', 'STATION_9'],
      description: 'Current gain applied by AGC'
    });
  }

  async collect(context) {
    const { dsp } = context;
    if (!dsp || !dsp.agc) return 0;
    return dsp.agc.currentGain || 0;
  }
}

class DSPNoiseReductionLevelCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.noiseReduction.noiseLevel',
      name: 'Detected Noise Level',
      unit: 'dBFS',
      range: [-90, 0],
      thresholds: {
        warningLow: null,
        warningHigh: -40,
        criticalLow: null,
        criticalHigh: -30
      },
      stations: ['STATION_1', 'STATION_3', 'STATION_11'],
      description: 'Current background noise level'
    });
  }

  async collect(context) {
    const { dsp } = context;
    if (!dsp || !dsp.noiseReduction) return -90;
    return dsp.noiseReduction.noiseLevel || -90;
  }
}

module.exports = {
  DSPAGCCurrentGainCollector,
  DSPNoiseReductionLevelCollector
};
```

### 4. CustomMetrics.js

```javascript
const MetricCollector = require('./MetricCollector');

class CustomStateCollector extends MetricCollector {
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
    const { custom } = context;
    return custom?.state || 'unknown';
  }
}

class CustomSuccessRateCollector extends MetricCollector {
  constructor() {
    super({
      id: 'custom.successRate',
      name: 'Success Rate',
      unit: '%',
      range: [0, 100],
      thresholds: {
        warningLow: 95,
        warningHigh: null,
        criticalLow: 90,
        criticalHigh: null
      },
      stations: ['STATION_3', 'STATION_4', 'STATION_11'],
      description: 'Percentage of successful operations'
    });
  }

  async collect(context) {
    const { custom } = context;
    if (!custom) return 100;

    const { successCount = 0, errorCount = 0 } = custom;
    const total = successCount + errorCount;

    if (total === 0) return 100;

    return (successCount / total) * 100;
  }
}

class CustomTotalProcessedCollector extends MetricCollector {
  constructor() {
    super({
      id: 'custom.totalProcessed',
      name: 'Total Processed',
      unit: 'count',
      range: [0, 1000000],
      thresholds: {},
      stations: ['STATION_3', 'STATION_4', 'STATION_9', 'STATION_11'],
      description: 'Total number of items processed since start'
    });
  }

  async collect(context) {
    const { custom } = context;
    return custom?.totalProcessed || 0;
  }
}

module.exports = {
  CustomStateCollector,
  CustomSuccessRateCollector,
  CustomTotalProcessedCollector
};
```

---

## Complete File Structure

```
STTTTSserver/
└── monitoring/
    ├── collectors/
    │   ├── MetricCollector.js           ✅ Already created
    │   ├── BufferMetrics.js            ✅ Already created
    │   ├── AudioQualityMetrics.js      ✅ Already created
    │   ├── LatencyMetrics.js           ⭐ NEW
    │   ├── PerformanceMetrics.js       ⭐ NEW
    │   ├── DSPMetrics.js               ⭐ NEW
    │   ├── CustomMetrics.js            ⭐ NEW
    │   └── Station3Collectors.js       ⭐ REVISED (all 14 params)
    └── utils/
        └── AudioAnalyzer.js            ✅ Already created
```

---

## Revised Implementation Steps

### STEP 1: Create All Missing Collector Files (45 min)

1. Create `LatencyMetrics.js`
2. Create `PerformanceMetrics.js`
3. Create `DSPMetrics.js`
4. Create `CustomMetrics.js`
5. Update `Station3Collectors.js` with all 14 parameters

### STEP 2: Embed in STTTTSserver.js (30 min)

Same as before, but now all 14 parameters will be collected.

### STEP 3: Update Dashboard (30 min)

Display all 14 parameters in organized sections:
- Audio Quality section
- DSP section
- Performance section
- Status section

---

## Dashboard Display Layout

```
┌─────────────────────────────────────────────────┐
│ STATION 3 - Extension 3333                      │
├─────────────────────────────────────────────────┤
│ AUDIO QUALITY                                   │
│  SNR:          25.4 dB        ✓                │
│  Speech Level: -17.4 dBFS     ✓                │
│  Clipping:     0.01%          ✓                │
│  Noise Floor:  -60.2 dBFS     ✓                │
├─────────────────────────────────────────────────┤
│ DSP                                             │
│  AGC Gain:     -12 dB         ✓                │
│  Noise Level:  -58 dBFS       ✓                │
├─────────────────────────────────────────────────┤
│ PERFORMANCE                                     │
│  CPU:          23.5%          ✓                │
│  Memory:       45.2%          ✓                │
│  Bandwidth:    0.256 Mbps     ✓                │
│  Proc Latency: 12 ms          ✓                │
│  Buffer:       85 ms          ✓                │
├─────────────────────────────────────────────────┤
│ STATUS                                          │
│  State:        active         ✓                │
│  Success Rate: 98.5%          ✓                │
│  Processed:    1247           ✓                │
└─────────────────────────────────────────────────┘
```

---

## Ready to Implement?

Now we have:
✅ Complete list of all 14 parameters
✅ All collector files needed
✅ Revised Station3Collectors.js
✅ Dashboard layout design

Should I proceed with creating all the files?
