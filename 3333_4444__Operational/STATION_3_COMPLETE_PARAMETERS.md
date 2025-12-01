# Station 3 - Complete Parameter List

## STATION 3: STTTTSserver → Deepgram (Pre-ASR Processing)

**Total Parameters:** 14

---

## Parameter Categories

### 1. Buffer Parameters (1 parameter)
- `buffer.processing` - Buffer for audio in processing queue (ms)

### 2. Latency Parameters (1 parameter)
- `latency.processing` - Time spent in processing/computation (ms)

### 3. Audio Quality Parameters (4 parameters)
- `audioQuality.snr` - Signal-to-Noise Ratio (dB)
- `audioQuality.speechLevel` - Average speech signal level (dBFS)
- `audioQuality.clipping` - Percentage of samples exceeding maximum amplitude (%)
- `audioQuality.noise` - Background noise level (dBFS)

### 4. DSP Parameters (2 parameters)
- `dsp.agc.currentGain` - Current gain applied by AGC (dB)
- `dsp.noiseReduction.noiseLevel` - Current background noise level (dBFS)

### 5. Performance Parameters (3 parameters)
- `performance.cpu` - CPU utilization percentage (%)
- `performance.memory` - RAM utilization percentage (%)
- `performance.bandwidth` - Network bandwidth consumed (Mbps)

### 6. Custom Parameters (3 parameters)
- `custom.state` - Current operational state (text: idle, active, processing, error)
- `custom.successRate` - Percentage of successful operations (%)
- `custom.totalProcessed` - Total number of items processed since start (count)

---

## Complete Parameter Details

### buffer.processing
- **Unit:** ms
- **Range:** 0-1000
- **Thresholds:**
  - Warning High: 200 ms
  - Critical High: 500 ms
- **Description:** Buffer for audio in processing queue before Deepgram

### latency.processing
- **Unit:** ms
- **Range:** 0-5000
- **Thresholds:**
  - Warning High: 300 ms
  - Critical High: 1000 ms
- **Description:** Time spent in DSP processing before sending to Deepgram

### audioQuality.snr
- **Unit:** dB
- **Range:** 0-60
- **Thresholds:**
  - Warning Low: 20 dB
  - Critical Low: 15 dB
- **Description:** Signal-to-Noise Ratio of audio

### audioQuality.speechLevel
- **Unit:** dBFS
- **Range:** -90 to 0
- **Thresholds:**
  - Warning Low: -40 dBFS
  - Warning High: -6 dBFS
  - Critical Low: -60 dBFS
  - Critical High: -3 dBFS
- **Description:** Average speech signal level

### audioQuality.clipping
- **Unit:** %
- **Range:** 0-100
- **Thresholds:**
  - Warning High: 0.1%
  - Critical High: 1.0%
- **Description:** Percentage of samples exceeding maximum amplitude

### audioQuality.noise
- **Unit:** dBFS
- **Range:** -90 to 0
- **Thresholds:**
  - Warning High: -40 dBFS
  - Critical High: -30 dBFS
- **Description:** Background noise floor level

### dsp.agc.currentGain
- **Unit:** dB
- **Range:** -30 to 40
- **Thresholds:**
  - Warning High: 30 dB
  - Critical High: 38 dB
- **Description:** Current gain applied by Automatic Gain Control

### dsp.noiseReduction.noiseLevel
- **Unit:** dBFS
- **Range:** -90 to 0
- **Thresholds:**
  - Warning High: -40 dBFS
  - Critical High: -30 dBFS
- **Description:** Detected noise level for noise reduction processing

### performance.cpu
- **Unit:** %
- **Range:** 0-100
- **Thresholds:**
  - Warning High: 70%
  - Critical High: 90%
- **Description:** CPU utilization for this station

### performance.memory
- **Unit:** %
- **Range:** 0-100
- **Thresholds:**
  - Warning High: 75%
  - Critical High: 90%
- **Description:** RAM utilization for this station

### performance.bandwidth
- **Unit:** Mbps
- **Range:** 0-1000
- **Thresholds:**
  - Warning High: 50 Mbps
  - Critical High: 100 Mbps
- **Description:** Network bandwidth consumed

### custom.state
- **Unit:** text
- **Values:** idle, active, processing, error, disconnected
- **Description:** Current operational state of the station

### custom.successRate
- **Unit:** %
- **Range:** 0-100
- **Thresholds:**
  - Warning Low: 95%
  - Critical Low: 90%
- **Description:** Percentage of successful audio processing operations

### custom.totalProcessed
- **Unit:** count
- **Range:** 0-1000000
- **Description:** Total number of audio segments processed since start

---

## Data Collection Strategy

### High-Frequency (Every packet sample - 100ms)
- `buffer.processing`
- `audioQuality.snr`
- `audioQuality.speechLevel`
- `audioQuality.clipping`
- `audioQuality.noise`
- `dsp.agc.currentGain`
- `dsp.noiseReduction.noiseLevel`

### Medium-Frequency (Every 500ms)
- `latency.processing`
- `performance.cpu`
- `performance.memory`
- `performance.bandwidth`

### Low-Frequency (Every 1s)
- `custom.state`
- `custom.successRate`
- `custom.totalProcessed`

---

## How to Collect Each Parameter

### From PCM Buffer Analysis
- `audioQuality.snr` → AudioAnalyzer.estimateSNR()
- `audioQuality.speechLevel` → AudioAnalyzer.calculateRMS()
- `audioQuality.clipping` → AudioAnalyzer.detectClipping()
- `audioQuality.noise` → AudioAnalyzer.calculateNoiseFloor()

### From Buffer State
- `buffer.processing` → udpAudioBuffers.get(extension).totalBytes

### From DSP State (if AGC/NR implemented)
- `dsp.agc.currentGain` → Current AGC gain value
- `dsp.noiseReduction.noiseLevel` → Noise level estimate

### From System Monitoring
- `performance.cpu` → os.loadavg() or process.cpuUsage()
- `performance.memory` → process.memoryUsage()
- `performance.bandwidth` → Calculate from bytes sent/received

### From Processing Stats
- `latency.processing` → Timestamp before/after processing
- `custom.state` → Track state machine
- `custom.successRate` → successCount / totalCount
- `custom.totalProcessed` → Counter

---

## Socket.IO Event Structure

```javascript
socket.emit('station3_metrics', {
  station: 'STATION_3',
  extension: '3333',  // or '4444'
  timestamp: 1732742400000,
  metrics: {
    // Buffer (1)
    'buffer.processing': 85,              // ms

    // Latency (1)
    'latency.processing': 12,             // ms

    // Audio Quality (4)
    'audioQuality.snr': 25.4,             // dB
    'audioQuality.speechLevel': -17.4,    // dBFS
    'audioQuality.clipping': 0.01,        // %
    'audioQuality.noise': -60.2,          // dBFS

    // DSP (2)
    'dsp.agc.currentGain': -12,           // dB
    'dsp.noiseReduction.noiseLevel': -58, // dBFS

    // Performance (3)
    'performance.cpu': 23.5,              // %
    'performance.memory': 45.2,           // %
    'performance.bandwidth': 0.256,       // Mbps

    // Custom (3)
    'custom.state': 'active',             // text
    'custom.successRate': 98.5,           // %
    'custom.totalProcessed': 1247         // count
  },
  alerts: [
    {
      metric: 'audioQuality.snr',
      level: 'warning',
      value: 18.5,
      threshold: 20,
      message: 'SNR below warning threshold'
    }
  ]
});
```

---

## Implementation Priority

### Phase 1 - Core Audio Metrics (Must Have)
1. `audioQuality.snr`
2. `audioQuality.speechLevel`
3. `audioQuality.clipping`
4. `audioQuality.noise`
5. `buffer.processing`

### Phase 2 - Performance Metrics (Should Have)
6. `performance.cpu`
7. `performance.memory`
8. `latency.processing`
9. `custom.state`
10. `custom.successRate`

### Phase 3 - Advanced Metrics (Nice to Have)
11. `dsp.agc.currentGain`
12. `dsp.noiseReduction.noiseLevel`
13. `performance.bandwidth`
14. `custom.totalProcessed`

---

## Next: Update Station3Collectors.js

The collector class needs to include ALL 14 parameters, not just 5!
