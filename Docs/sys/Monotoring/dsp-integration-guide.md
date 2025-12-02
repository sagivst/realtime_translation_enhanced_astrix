# DSP Enhancement Modules - Integration Guide

**Date**: November 26, 2025
**Purpose**: Extend monitoring system from 55 to 75 parameters with DSP enhancement modules

---

## Overview

This guide documents the integration of 7 DSP audio enhancement modules, adding **20 new metrics** to the existing 55-parameter monitoring system, for a total of **75 parameters**.

---

## 1. DSP Modules Added

| Module | Metrics | Parameters | Purpose |
|--------|---------|------------|---------|
| HPF/LPF Filters | 2 | 3 | Remove rumble / soften highs |
| Noise Reduction | 2 | 2 | Remove constant noise |
| AGC | 3 | 4 | Normalize volume |
| Compressor | 2 | 4 | Reduce dynamic peaks |
| Limiter | 2 | 2 | Prevent clipping |
| Equalizer (3-band) | 2 | 4 | Improve clarity |
| Echo Canceller (AEC) | 3 | 2 | Remove echo |
| De-Esser | 1 | 2 | Remove harsh "S" |
| De-Clicker | 1 | 1 | Remove clicks/pops |
| Dereverberation | 1 | 1 | Reduce room reverb |
| Speech Enhancer | 1 | 1 | Boost intelligibility |
| **TOTAL** | **20** | **28** | **11 modules** |

---

## 2. Installation Requirements

### GStreamer Elements Required

```bash
# On Azure VM
sudo apt-get update
sudo apt-get install -y \
  gstreamer1.0-plugins-good \
  gstreamer1.0-plugins-bad \
  gstreamer1.0-plugins-ugly \
  gstreamer1.0-tools \
  libgstreamer1.0-dev \
  libgstreamer-plugins-base1.0-dev

# Additional DSP libraries
sudo apt-get install -y \
  librnnoise-dev \
  libwebrtc-audio-processing-dev \
  sox \
  libsox-dev
```

### Node.js Dependencies (if using bindings)

```bash
npm install --save \
  node-webrtc \
  audio-buffer-utils \
  sox-stream
```

---

## 3. Monitoring Server Changes

### 3.1 Extend `generate55Parameters()` to `generate75Parameters()`

**Location**: `monitoring-server.js` (line ~100)

**Old Function Name**: `generate55Parameters(baseMetrics)`
**New Function Name**: `generate75Parameters(baseMetrics)`

**Add DSP category after existing categories**:

```javascript
function generate75Parameters(baseMetrics) {
  const packetsRx = baseMetrics.packetsRx || 0;
  const packetsTx = baseMetrics.packetsTx || 0;
  const packetsDropped = baseMetrics.packetsDropped || 0;
  const bytesRx = baseMetrics.bytesRx || 0;
  const bytesTx = baseMetrics.bytesTx || 0;
  const bufferUsage = baseMetrics.bufferUsage || 0;
  const avgLatency = baseMetrics.avgLatency || 0;
  const jitter = baseMetrics.jitter || 0;

  return {
    // ... existing buffer, latency, packet, audioQuality, performance, custom ...

    // NEW: DSP Enhancement category
    dsp: {
      hpf: {
        lowFreqRumble: -45 + Math.random() * 15,  // -60 to -30 dB
      },
      lpf: {
        hfHarshness: -25 + Math.random() * 15,    // -40 to -10 dB
      },
      nr: {
        residualNoise: -50 + Math.random() * 15,  // -60 to -35 dB
        speechIntegrityLoss: Math.random() * 10,  // 0 to 10%
      },
      agc: {
        gainAdjustmentSpeed: 3 + Math.random() * 7,  // 0 to 10 dB/s
        overAmplificationEvents: Math.floor(Math.random() * 15),  // 0 to 15 count
        rmsDeviation: Math.random() * 4,  // 0 to 4 dB
      },
      comp: {
        dynRangeReduction: 5 + Math.random() * 10,  // 5 to 15 dB
        compressionEvents: Math.floor(100 + Math.random() * 400),  // 100 to 500
      },
      limiter: {
        clipPreventionRate: 92 + Math.random() * 8,  // 92 to 100%
        peakMargin: 0.5 + Math.random() * 2,  // 0.5 to 2.5 dB
      },
      eq: {
        clarityBandEnergy: -8 + Math.random() * 10,  // -8 to 2 dB
        sibilanceEnergy: -18 + Math.random() * 10,  // -18 to -8 dB
      },
      aec: {
        erl: 15 + Math.random() * 20,  // 15 to 35 dB
        erle: 25 + Math.random() * 20,  // 25 to 45 dB
        lateEchoResidual: -45 + Math.random() * 15,  // -60 to -30 dB
      },
      deEsser: {
        sibilanceLevel: -20 + Math.random() * 15,  // -20 to -5 dB
      },
      declicker: {
        clickCount: Math.floor(Math.random() * 8),  // 0 to 8 count
      },
      dereverb: {
        reverbLevel: 10 + Math.random() * 20,  // 10 to 30%
      },
      speechEnh: {
        intelligibilityScore: 75 + Math.random() * 20,  // 75 to 95%
      }
    }
  };
}
```

### 3.2 Update Station DSP Parameters

**Location**: `monitoring-server.js` (line ~30)

**Extend `stationParameters` with DSP controls**:

```javascript
const stationParameters = {
  'station-1': { // ARI Receive
    // Existing parameters
    input_gain_db: 0,
    nr_strength: 0.3,
    comp_threshold_db: -20,
    eq_low_gain: 0,
    eq_mid_gain: 0,
    eq_high_gain: 0,

    // NEW: DSP Enhancement parameters
    hpf_cutoff: 80,
    lpf_cutoff: 16000,
    filter_order: 4,
    nr_model_preset: 'moderate',
    agc_target_rms: -20,
    agc_max_gain: 6,
    agc_attack: 50,
    agc_release: 200,
    comp_ratio: 3,
    comp_attack: 10,
    comp_release: 80,
    limiter_threshold: -0.5,
    limiter_release: 50,
    eq_band_1_gain: 0,
    eq_band_2_gain: 0,
    eq_band_3_gain: 0,
    eq_q_factor: 1.0,
    aec_strength: 0.8,
    aec_tail_length: 200,
    de_ess_freq: 6500,
    de_ess_amount: 0.3,
    declicker_sensitivity: 0.5,
    dr_strength: 0.4,
    enhancer_profile: 'moderate'
  },

  // Similar expansions for station-2 through station-8
  // ... (each station gets relevant DSP parameters)
};
```

### 3.3 Update Quality Score Calculation

**Location**: `monitoring-server.js` (function `calculateQualityScore`)

**Add DSP metrics to quality score**:

```javascript
function calculateQualityScore(metrics, stationId) {
  const weights = qualityScoreWeights[stationId] || defaultWeights;

  // Existing normalizations...
  const normalized = {
    snr: normalize(metrics.audioQuality.snr || 0, 0, 60),
    // ... existing metrics ...

    // NEW: DSP metrics
    residualNoise: 1 - normalize(Math.abs(metrics.dsp.nr.residualNoise || -50), 30, 60),
    speechIntegrity: 1 - normalize(metrics.dsp.nr.speechIntegrityLoss || 0, 0, 20),
    clipPrevention: normalize(metrics.dsp.limiter.clipPreventionRate || 95, 0, 100),
    intelligibility: normalize(metrics.dsp.speechEnh.intelligibilityScore || 80, 0, 100),
    clickCount: 1 - normalize(metrics.dsp.declicker.clickCount || 0, 0, 10),
    echoSuppression: normalize(metrics.dsp.aec.erle || 30, 0, 60)
  };

  // Updated score calculation
  const score =
    weights.snr * normalized.snr +
    weights.rms * normalized.rms +
    weights.latency * normalized.latency +
    weights.clipping * normalized.clipping +
    weights.artifacts * normalized.artifacts +
    weights.bufferStability * normalized.bufferStability +
    weights.packetLoss * normalized.packetLoss +
    weights.cpu * normalized.cpu +
    weights.successRate * normalized.successRate +
    // NEW: DSP metrics
    weights.residualNoise * normalized.residualNoise +
    weights.speechIntegrity * normalized.speechIntegrity +
    weights.clipPrevention * normalized.clipPrevention +
    weights.intelligibility * normalized.intelligibility +
    weights.clickCount * normalized.clickCount +
    weights.echoSuppression * normalized.echoSuppression;

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  return score / totalWeight;
}
```

### 3.4 Update Quality Score Weights

**Add DSP weights to each station profile**:

```javascript
const qualityScoreWeights = {
  'station-1': {
    // Existing weights...
    snr: 3.0, rms: 2.0, latency: 2.5, clipping: 4.0, artifacts: 3.5,
    bufferStability: 2.0, packetLoss: 3.0, cpu: 1.0, successRate: 2.5,

    // NEW: DSP weights
    residualNoise: 3.0,
    speechIntegrity: 2.5,
    clipPrevention: 4.0,
    intelligibility: 2.0,
    clickCount: 2.5,
    echoSuppression: 2.0
  },
  // ... similar for all stations
};
```

---

## 4. Dashboard Updates

### 4.1 Update Parameter Definitions

**Location**: `monitoring-tree-dashboard.html` or `calibration-dashboard.html`

**Add DSP category to `parameterDefinitions` array**:

```javascript
const parameterDefinitions = [
  // ... existing 55 parameters ...

  // DSP Enhancement (20 parameters)
  { id: 'dsp.hpf.lowFreqRumble', name: 'Low Freq Rumble', category: 'DSP', unit: 'dB', min: -60, max: -20 },
  { id: 'dsp.lpf.hfHarshness', name: 'HF Harshness', category: 'DSP', unit: 'dB', min: -40, max: 0 },
  { id: 'dsp.nr.residualNoise', name: 'Residual Noise', category: 'DSP', unit: 'dB', min: -60, max: -30 },
  { id: 'dsp.nr.speechIntegrityLoss', name: 'Speech Integrity Loss', category: 'DSP', unit: '%', min: 0, max: 20 },
  { id: 'dsp.agc.gainAdjustmentSpeed', name: 'Gain Adjustment Speed', category: 'DSP', unit: 'dB/s', min: 0, max: 20 },
  { id: 'dsp.agc.overAmplificationEvents', name: 'Over-Amplification Events', category: 'DSP', unit: 'count', min: 0, max: 100 },
  { id: 'dsp.agc.rmsDeviation', name: 'RMS Deviation', category: 'DSP', unit: 'dB', min: 0, max: 10 },
  { id: 'dsp.comp.dynRangeReduction', name: 'Dynamic Range Reduction', category: 'DSP', unit: 'dB', min: 0, max: 30 },
  { id: 'dsp.comp.compressionEvents', name: 'Compression Events', category: 'DSP', unit: 'count', min: 0, max: 1000 },
  { id: 'dsp.limiter.clipPreventionRate', name: 'Clip Prevention Rate', category: 'DSP', unit: '%', min: 0, max: 100 },
  { id: 'dsp.limiter.peakMargin', name: 'Peak Margin', category: 'DSP', unit: 'dB', min: 0, max: 6 },
  { id: 'dsp.eq.clarityBandEnergy', name: 'Clarity Band Energy', category: 'DSP', unit: 'dB', min: -20, max: 10 },
  { id: 'dsp.eq.sibilanceEnergy', name: 'Sibilance Energy', category: 'DSP', unit: 'dB', min: -30, max: 0 },
  { id: 'dsp.aec.erl', name: 'Echo Return Loss', category: 'DSP', unit: 'dB', min: 0, max: 50 },
  { id: 'dsp.aec.erle', name: 'Echo Return Loss Enhancement', category: 'DSP', unit: 'dB', min: 0, max: 60 },
  { id: 'dsp.aec.lateEchoResidual', name: 'Late Echo Residual', category: 'DSP', unit: 'dB', min: -60, max: -20 },
  { id: 'dsp.deEsser.sibilanceLevel', name: 'Sibilance Level', category: 'DSP', unit: 'dB', min: -40, max: 0 },
  { id: 'dsp.declicker.clickCount', name: 'Click Count', category: 'DSP', unit: 'count', min: 0, max: 100 },
  { id: 'dsp.dereverb.reverbLevel', name: 'Reverb Level', category: 'DSP', unit: '%', min: 0, max: 100 },
  { id: 'dsp.speechEnh.intelligibilityScore', name: 'Intelligibility Score', category: 'DSP', unit: '%', min: 0, max: 100 }
];
```

### 4.2 Update Station Relevance Map

**Extend `stationParameterMap` to include DSP parameters per station**:

```javascript
const stationParameterMap = {
  'station-1': [
    // ... existing 31 parameters ...

    // DSP parameters (add relevant ones)
    'dsp.hpf.lowFreqRumble',
    'dsp.nr.residualNoise',
    'dsp.nr.speechIntegrityLoss',
    'dsp.agc.gainAdjustmentSpeed',
    'dsp.agc.overAmplificationEvents',
    'dsp.comp.dynRangeReduction',
    'dsp.limiter.clipPreventionRate',
    'dsp.limiter.peakMargin',
    'dsp.eq.clarityBandEnergy',
    'dsp.aec.erl',
    'dsp.aec.erle',
    'dsp.declicker.clickCount',
    'dsp.speechEnh.intelligibilityScore'
  ], // 31 + 13 = 44 parameters for station-1

  // Similar additions for other stations
};
```

---

## 5. Deployment Steps

### 5.1 Deploy DSP Parameter Configs to Azure VM

```bash
# Upload DSP parameter configs
scp -r /tmp/dsp-param-configs azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/config/parameters/dsp

# Verify upload
ssh azureuser@20.170.155.53 "ls -la /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/config/parameters/dsp"
```

### 5.2 Update Main Parameter Index

**Create updated index.json that includes DSP category**:

```json
{
  "totalParameters": 75,
  "totalCategories": 7,
  "categories": {
    "buffer": 10,
    "latency": 8,
    "packet": 12,
    "audioQuality": 10,
    "performance": 8,
    "custom": 7,
    "dsp": 20
  },
  "parameters": [
    // ... existing 55 parameters ...
    // ... 20 new DSP parameters from dsp-index.json ...
  ]
}
```

### 5.3 Install GStreamer Dependencies

```bash
ssh azureuser@20.170.155.53 "sudo apt-get update && sudo apt-get install -y gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly librnnoise-dev libwebrtc-audio-processing-dev"
```

### 5.4 Update and Restart Monitoring Server

```bash
# Backup current server
ssh azureuser@20.170.155.53 "cp /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring-server.js /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring-server-backup-pre-dsp.js"

# Upload updated server
scp /tmp/monitoring-server-with-dsp.js azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring-server.js

# Restart
ssh azureuser@20.170.155.53 "pkill -f monitoring-server.js && cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && node monitoring-server.js > monitoring-server.log 2>&1 &"
```

---

## 6. Testing

### 6.1 Test DSP Metrics API

```bash
# Get all 75 metrics for station-1
curl http://20.170.155.53:3021/api/stations/station-1/metrics | python3 -m json.tool | grep -A 30 '"dsp"'

# Should show DSP category with 20 metrics
```

### 6.2 Test DSP Parameters API

```bash
# Get station parameters (should include DSP params)
curl http://20.170.155.53:3021/api/stations/station-1/params | python3 -m json.tool

# Update DSP parameter
curl -X POST http://20.170.155.53:3021/api/stations/station-1/params \
  -H 'Content-Type: application/json' \
  -d '{"nr_strength": 0.5, "hpf_cutoff": 100}'
```

### 6.3 Test Calibration with DSP

```bash
# Run calibration (should include DSP metrics in quality score)
curl -X POST http://20.170.155.53:3021/api/calibration/run \
  -H 'Content-Type: application/json' \
  -d '{"stationId":"station-1","duration":3000}' | python3 -c "import sys,json; data=json.load(sys.stdin); print('DSP Metrics:', json.dumps(data['result']['metrics']['dsp'], indent=2))"
```

---

## 7. Station-Specific DSP Module Recommendations

| Station | Recommended DSP Modules | Reason |
|---------|-------------------------|--------|
| Station 1 (ARI Receive) | HPF, NR, AGC, Limiter, AEC | Input from Asterisk may have noise, echo |
| Station 2 (STT Processing) | HPF, NR, De-Esser, De-Clicker, Speech Enhancer | Optimize for speech recognition |
| Station 3 (Translation) | None | Text processing, no audio |
| Station 4 (TTS Generation) | EQ, Compressor, Limiter, De-Esser | Optimize TTS output quality |
| Station 5 (Audio Convert) | HPF, LPF | Clean format conversion |
| Station 6 (UDP Send) | Limiter | Prevent clipping before network send |
| Station 7 (Buffer Monitor) | None | Monitoring only |
| Station 8 (Gateway Send) | Limiter, AEC | Final output to Asterisk |

---

## 8. GStreamer Pipeline Examples

### Station 1 (ARI Receive) - Full DSP Chain

```bash
gst-launch-1.0 \
  udpsrc port=5004 ! \
  rawaudioparse format=pcm pcm-format=s16le sample-rate=16000 num-channels=1 ! \
  audioconvert ! \
  audiochebband mode=highpass cutoff=80 poles=4 ! \
  rnnoise level=0.4 ! \
  webrtcdsp aec=on agc=on agc-target-level=-20 agc-max-gain=6 ! \
  compressor threshold=-20 ratio=3 attack=10 release=80 ! \
  limiter threshold=-0.5 release=50 ! \
  audioconvert ! \
  udpsink host=localhost port=7000
```

### Station 4 (TTS Generation) - Output Quality Enhancement

```bash
gst-launch-1.0 \
  filesrc location=tts_output.raw ! \
  rawaudioparse format=pcm pcm-format=s16le sample-rate=22050 num-channels=1 ! \
  audioconvert ! \
  audioresample ! \
  equalizer-3bands band0=1.5 band1=-0.5 band2=0.0 ! \
  compressor threshold=-18 ratio=2.5 attack=5 release=60 ! \
  limiter threshold=-0.5 release=50 ! \
  audioconvert ! \
  filesink location=tts_enhanced.raw
```

---

## 9. Summary

### What Was Added:
- ✅ **20 DSP metrics** across 11 enhancement modules
- ✅ **28 DSP parameters** for controlling audio processing
- ✅ **DSP category** in parameter configuration system
- ✅ **Quality score integration** with DSP-specific weights
- ✅ **GStreamer pipeline specs** for each module
- ✅ **Installation requirements** for DSP libraries

### Total System Capacity:
- **Before**: 55 parameters
- **After**: 75 parameters
- **Categories**: 7 (Buffer, Latency, Packet, Audio Quality, Performance, Custom, **DSP**)
- **Stations**: 8 (each with custom DSP module selection)

### Files Created:
- `/tmp/dsp-modules-schema.json` - Full DSP module specifications
- `/tmp/generate-dsp-param-configs.js` - Config generator script
- `/tmp/dsp-param-configs/` - 20 DSP parameter JSON files + index
- `/tmp/dsp-integration-guide.md` - This integration guide

---

**System Status**: Ready for DSP integration
**Next Step**: Apply code changes to monitoring-server.js and deploy
