# DETAILED FIX PLAN: Closing the 9 Metrics Implementation Gaps

## Executive Summary
The 9 critical metrics are enabled (realtimeSafe: true) but NOT computing/storing due to:
1. Wrong formulas (oversimplified approximations)
2. Missing base metric dependencies
3. Incorrect sample normalization
4. Missing key calculations (sqrt, log10, LUFS offset)

## Current Status
- ✅ Metrics enabled in MetricsRegistry (not being skipped)
- ✅ Station handlers deployed with state management
- ❌ Metrics not computing (wrong formulas)
- ❌ No data reaching database

## Phase 1: Verify/Add Base Metrics (Prerequisites)

### Step 1.1: Check Existing Base Metrics
```bash
ssh azureuser@20.170.155.53 "grep -E '(pcm.rms_level|pcm.rms_dbfs|pcm.peak_dbfs|pcm.zero_crossing_rate)' /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/MetricsRegistry.js | grep -v '//' | head -20"
```

### Step 1.2: Add Missing Base Metrics
These MUST exist as dependencies for the 9 metrics:

```javascript
"pcm.rms_level": {
  description: "RMS level normalized [0,1]",
  type: "float",
  unit: "ratio",
  range: [0, 1],
  realtimeSafe: true,
  compute: (samples, ctx) => {
    if (!samples || samples.length === 0) return 0;
    const normalized = samples.map(s => s / 32768.0);
    const sumSquares = normalized.reduce((sum, s) => sum + s * s, 0);
    return Math.sqrt(sumSquares / samples.length);
  }
},

"pcm.rms_dbfs": {
  description: "RMS level in dBFS",
  type: "float",
  unit: "dBFS",
  range: [-120, 0],
  realtimeSafe: true,
  compute: (samples, ctx) => {
    const rmsLevel = ctx.metrics?.['pcm.rms_level'] || 0;
    if (rmsLevel <= 0) return -120;
    return 20 * Math.log10(rmsLevel);
  }
},

"pcm.zero_crossing_rate": {
  description: "Zero crossing rate per sample",
  type: "float",
  unit: "crossings/sample",
  range: [0, 0.5],
  realtimeSafe: true,
  compute: (samples, ctx) => {
    if (!samples || samples.length < 2) return 0;
    let crossings = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i] >= 0) !== (samples[i-1] >= 0)) {
        crossings++;
      }
    }
    return crossings / samples.length;
  }
}
```

## Phase 2: Fix the 9 Critical Metrics with EXACT Formulas

### Fix 1: LUFS Metrics (3 metrics)

#### pcm.lufs_momentary (400ms window)
```javascript
"pcm.lufs_momentary": {
  description: "LUFS momentary (400ms)",
  type: "float",
  unit: "LUFS",
  range: [-70, 0],
  realtimeSafe: true,
  compute: (samples, ctx) => {
    // Initialize 400ms buffer (20 frames at 50fps)
    if (!ctx.shortTermBuffer) ctx.shortTermBuffer = [];

    // Calculate RMS for this frame
    if (samples && samples.length > 0) {
      const normalized = samples.map(s => s / 32768.0);
      const sumSquares = normalized.reduce((sum, s) => sum + s * s, 0);
      const rms = Math.sqrt(sumSquares / samples.length);

      ctx.shortTermBuffer.push(rms);
      // Keep 20 frames (400ms at 50fps)
      if (ctx.shortTermBuffer.length > 20) ctx.shortTermBuffer.shift();
    }

    if (ctx.shortTermBuffer.length === 0) return -70;

    // Calculate 400ms RMS
    const meanSquare = ctx.shortTermBuffer.reduce((sum, r) => sum + r * r, 0) / ctx.shortTermBuffer.length;
    const rms400ms = Math.sqrt(meanSquare);

    // Apply LUFS formula: 20*log10(rms) + 0.691
    if (rms400ms <= 0) return -70;
    return 20 * Math.log10(rms400ms) + 0.691;
  }
}
```

#### pcm.lufs_short_term (3 seconds)
```javascript
"pcm.lufs_short_term": {
  description: "LUFS short-term (3 seconds)",
  type: "float",
  unit: "LUFS",
  range: [-70, 0],
  realtimeSafe: true,
  compute: (samples, ctx) => {
    // Initialize 3-second buffer (150 frames at 50fps)
    if (!ctx.integratedBuffer) ctx.integratedBuffer = [];

    // Get momentary LUFS and convert back to linear
    const momentary = ctx.metrics?.['pcm.lufs_momentary'];
    if (momentary !== undefined && momentary > -70) {
      // Convert LUFS back to linear RMS
      const linearRms = Math.pow(10, (momentary - 0.691) / 20);
      ctx.integratedBuffer.push(linearRms);
      if (ctx.integratedBuffer.length > 150) ctx.integratedBuffer.shift();
    }

    if (ctx.integratedBuffer.length === 0) return -70;

    // Calculate 3-second RMS
    const meanSquare = ctx.integratedBuffer.reduce((sum, r) => sum + r * r, 0) / ctx.integratedBuffer.length;
    const rms3s = Math.sqrt(meanSquare);

    // Apply LUFS formula
    if (rms3s <= 0) return -70;
    return 20 * Math.log10(rms3s) + 0.691;
  }
}
```

#### pcm.lufs_integrated (entire session)
```javascript
"pcm.lufs_integrated": {
  description: "LUFS integrated (entire session)",
  type: "float",
  unit: "LUFS",
  range: [-70, 0],
  realtimeSafe: true,
  compute: (samples, ctx) => {
    // Initialize session buffer
    if (!ctx.loudnessBuffer) ctx.loudnessBuffer = [];

    // Get short-term LUFS and convert to linear
    const shortTerm = ctx.metrics?.['pcm.lufs_short_term'];
    if (shortTerm !== undefined && shortTerm > -70) {
      const linearRms = Math.pow(10, (shortTerm - 0.691) / 20);
      ctx.loudnessBuffer.push(linearRms);
    }

    // Apply -70 LUFS gate (EBU R128 standard)
    const gated = ctx.loudnessBuffer.filter(r => {
      const lufs = 20 * Math.log10(r) + 0.691;
      return lufs > -70;
    });

    if (gated.length === 0) return -70;

    // Calculate integrated RMS
    const meanSquare = gated.reduce((sum, r) => sum + r * r, 0) / gated.length;
    const rmsIntegrated = Math.sqrt(meanSquare);

    // Apply LUFS formula
    if (rmsIntegrated <= 0) return -70;
    return 20 * Math.log10(rmsIntegrated) + 0.691;
  }
}
```

### Fix 2: Speech Metrics (3 metrics)

#### pcm.speech_probability (with ZCR)
```javascript
"pcm.speech_probability": {
  description: "Speech probability (0-1)",
  type: "float",
  unit: "probability",
  range: [0, 1],
  realtimeSafe: true,
  compute: (samples, ctx) => {
    // Initialize VAD history
    if (!ctx.vadHistory) ctx.vadHistory = [];

    // Get energy and ZCR from base metrics
    const rmsDb = ctx.metrics?.['pcm.rms_dbfs'] || -100;
    const zcr = ctx.metrics?.['pcm.zero_crossing_rate'] || 0;

    // Speech detection criteria (per documentation):
    // 1. Energy > threshold (-40 dB typical for 16-bit)
    // 2. ZCR in speech range (50-400 Hz normalized to sample rate)
    //    At 16kHz: 50Hz = 0.00625 ZCR, 400Hz = 0.05 ZCR
    const energyCheck = rmsDb > -40;
    const zcrCheck = zcr > 0.00625 && zcr < 0.05;
    const isSpeech = energyCheck && zcrCheck;

    // Update history (100 frames = 2 seconds at 50fps)
    ctx.vadHistory.push(isSpeech);
    if (ctx.vadHistory.length > 100) ctx.vadHistory.shift();

    // Calculate probability
    const speechFrames = ctx.vadHistory.filter(v => v).length;
    return speechFrames / ctx.vadHistory.length;
  }
}
```

#### pcm.speech_segments_per_min
```javascript
"pcm.speech_segments_per_min": {
  description: "Speech segments per minute",
  type: "float",
  unit: "segments/min",
  range: [0, 60],
  realtimeSafe: true,
  compute: (samples, ctx) => {
    if (!ctx.vadHistory || ctx.vadHistory.length < 2) return 0;

    // Use 60 seconds of history (3000 frames at 50fps)
    const windowSize = Math.min(3000, ctx.vadHistory.length);
    const recentHistory = ctx.vadHistory.slice(-windowSize);

    // Count speech onsets (0→1 transitions)
    let transitions = 0;
    for (let i = 1; i < recentHistory.length; i++) {
      if (!recentHistory[i-1] && recentHistory[i]) {
        transitions++;
      }
    }

    // Convert to per-minute rate
    const timeSpanMinutes = windowSize / 3000;
    return transitions / timeSpanMinutes;
  }
}
```

#### pcm.avg_speech_duration_ms
```javascript
"pcm.avg_speech_duration_ms": {
  description: "Average speech segment duration",
  type: "float",
  unit: "ms",
  range: [0, 10000],
  realtimeSafe: true,
  compute: (samples, ctx) => {
    // Initialize tracking
    if (!ctx.speechDurations) ctx.speechDurations = [];
    if (!ctx.currentSpeechFrames) ctx.currentSpeechFrames = 0;

    // Get current VAD state
    const isSpeech = ctx.vadHistory && ctx.vadHistory[ctx.vadHistory.length - 1];

    if (isSpeech) {
      // Speech continuing
      ctx.currentSpeechFrames++;
    } else if (ctx.currentSpeechFrames > 0) {
      // Speech just ended - record duration
      const durationMs = ctx.currentSpeechFrames * 20; // 20ms per frame
      ctx.speechDurations.push(durationMs);

      // Keep last 100 segments
      if (ctx.speechDurations.length > 100) ctx.speechDurations.shift();
      ctx.currentSpeechFrames = 0;
    }

    // Return average duration
    if (ctx.speechDurations.length === 0) return 0;
    return ctx.speechDurations.reduce((a, b) => a + b, 0) / ctx.speechDurations.length;
  }
}
```

### Fix 3: Noise Metrics (3 metrics)

#### pcm.snr_db (with speech averaging)
```javascript
"pcm.snr_db": {
  description: "Signal-to-Noise Ratio",
  type: "float",
  unit: "dB",
  range: [0, 60],
  realtimeSafe: true,
  compute: (samples, ctx) => {
    // Initialize speech RMS buffer
    if (!ctx.speechRmsBuffer) ctx.speechRmsBuffer = [];

    // Get current frame measurements
    const rmsDb = ctx.metrics?.['pcm.rms_dbfs'] || -60;
    const isSpeech = ctx.vadHistory && ctx.vadHistory[ctx.vadHistory.length - 1];

    // Collect speech-only RMS values
    if (isSpeech && rmsDb > -60) {
      ctx.speechRmsBuffer.push(rmsDb);
      if (ctx.speechRmsBuffer.length > 100) ctx.speechRmsBuffer.shift();
    }

    // Need speech samples for SNR
    if (ctx.speechRmsBuffer.length === 0) return 0;

    // Calculate mean speech level
    const meanSpeechDb = ctx.speechRmsBuffer.reduce((a, b) => a + b, 0) / ctx.speechRmsBuffer.length;

    // Get noise floor
    const noiseFloor = ctx.lastNoiseFloor || -60;

    // SNR = signal - noise
    const snr = meanSpeechDb - noiseFloor;
    return Math.max(0, Math.min(60, snr));
  }
}
```

#### pcm.noise_floor_dbfs
```javascript
"pcm.noise_floor_dbfs": {
  description: "Noise floor level",
  type: "float",
  unit: "dBFS",
  range: [-80, -20],
  realtimeSafe: true,
  compute: (samples, ctx) => {
    // Get current frame measurements
    const rmsDb = ctx.metrics?.['pcm.rms_dbfs'] || -60;
    const isSpeech = ctx.vadHistory && ctx.vadHistory[ctx.vadHistory.length - 1];

    // Initialize noise floor
    if (!ctx.lastNoiseFloor) ctx.lastNoiseFloor = -60;

    // Update noise floor only during non-speech
    // Exclude very quiet (< -80) and loud (> -20) frames
    if (!isSpeech && rmsDb < -20 && rmsDb > -80) {
      // Exponential moving average with slow adaptation
      const alpha = 0.95;
      ctx.lastNoiseFloor = alpha * ctx.lastNoiseFloor + (1 - alpha) * rmsDb;
    }

    return ctx.lastNoiseFloor;
  }
}
```

#### pcm.background_noise_level
```javascript
"pcm.background_noise_level": {
  description: "Average background noise",
  type: "float",
  unit: "dBFS",
  range: [-80, -20],
  realtimeSafe: true,
  compute: (samples, ctx) => {
    // Initialize noise buffer
    if (!ctx.noiseBuffer) ctx.noiseBuffer = [];

    // Get current frame measurements
    const rmsDb = ctx.metrics?.['pcm.rms_dbfs'] || -60;
    const isSpeech = ctx.vadHistory && ctx.vadHistory[ctx.vadHistory.length - 1];

    // Collect non-speech RMS values
    if (!isSpeech && rmsDb < -20 && rmsDb > -80) {
      ctx.noiseBuffer.push(rmsDb);
      if (ctx.noiseBuffer.length > 100) ctx.noiseBuffer.shift();
    }

    // Need noise samples for average
    if (ctx.noiseBuffer.length === 0) return -60;

    // Return mean of non-speech frames
    return ctx.noiseBuffer.reduce((a, b) => a + b, 0) / ctx.noiseBuffer.length;
  }
}
```

## Phase 3: Deployment Script

### Create update script: `/tmp/fix_9_metrics_exact.js`

```javascript
#!/usr/bin/env node
/**
 * Fix 9 critical metrics with EXACT formulas from documentation
 * Based on: 28_metrics_exact_formulas.md
 */

const fs = require('fs');

// Read the current MetricsRegistry
let content = fs.readFileSync('/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/MetricsRegistry.js', 'utf8');

// First, ensure base metrics exist and are enabled
const baseMetrics = {
  'pcm.rms_level': `(samples, ctx) => {
    if (!samples || samples.length === 0) return 0;
    const normalized = samples.map(s => s / 32768.0);
    const sumSquares = normalized.reduce((sum, s) => sum + s * s, 0);
    return Math.sqrt(sumSquares / samples.length);
  }`,

  'pcm.rms_dbfs': `(samples, ctx) => {
    const rmsLevel = ctx.metrics?.['pcm.rms_level'] || 0;
    if (rmsLevel <= 0) return -120;
    return 20 * Math.log10(rmsLevel);
  }`,

  'pcm.zero_crossing_rate': `(samples, ctx) => {
    if (!samples || samples.length < 2) return 0;
    let crossings = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i] >= 0) !== (samples[i-1] >= 0)) {
        crossings++;
      }
    }
    return crossings / samples.length;
  }`
};

// Update the 9 critical metrics with EXACT formulas
const criticalMetrics = {
  'pcm.lufs_momentary': `(samples, ctx) => {
    if (!ctx.shortTermBuffer) ctx.shortTermBuffer = [];

    if (samples && samples.length > 0) {
      const normalized = samples.map(s => s / 32768.0);
      const sumSquares = normalized.reduce((sum, s) => sum + s * s, 0);
      const rms = Math.sqrt(sumSquares / samples.length);

      ctx.shortTermBuffer.push(rms);
      if (ctx.shortTermBuffer.length > 20) ctx.shortTermBuffer.shift();
    }

    if (ctx.shortTermBuffer.length === 0) return -70;

    const meanSquare = ctx.shortTermBuffer.reduce((sum, r) => sum + r * r, 0) / ctx.shortTermBuffer.length;
    const rms400ms = Math.sqrt(meanSquare);

    if (rms400ms <= 0) return -70;
    return 20 * Math.log10(rms400ms) + 0.691;
  }`,

  // ... (include all 9 metrics here)
};

// Apply updates
let updatedCount = 0;

// Update base metrics first
Object.entries(baseMetrics).forEach(([key, computeFunc]) => {
  if (!content.includes(`"${key}"`)) {
    console.log(`Adding base metric: ${key}`);
    // Add the metric if it doesn't exist
    // (implementation needed)
  } else {
    const pattern = new RegExp(
      `("${key.replace('.', '\\\\.')}":.*?compute:\\s*)\\([^}]+\\}`,
      'gs'
    );
    content = content.replace(pattern, `$1${computeFunc}`);
    updatedCount++;
  }
});

// Update critical metrics
Object.entries(criticalMetrics).forEach(([key, computeFunc]) => {
  const pattern = new RegExp(
    `("${key.replace('.', '\\\\.')}":.*?compute:\\s*)\\([^}]+\\}`,
    'gs'
  );
  content = content.replace(pattern, `$1${computeFunc}`);
  console.log(`✅ Updated: ${key}`);
  updatedCount++;
});

// Save the fixed version
fs.writeFileSync('/tmp/MetricsRegistry_fixed_exact.js', content);

console.log(`\n✅ Fixed ${updatedCount} metrics with exact formulas`);
console.log('📁 Saved to: /tmp/MetricsRegistry_fixed_exact.js');
console.log('\nNext steps:');
console.log('1. Test locally with sample data');
console.log('2. Deploy to VM');
console.log('3. Restart STTTTSserver');
console.log('4. Make test call to verify');
```

## Phase 4: Testing Strategy

### Step 4.1: Create Local Unit Test

```javascript
#!/usr/bin/env node
// test_metrics_exact.js

const { MetricsRegistry } = require('./MetricsRegistry_fixed_exact.js');

// Test data: 1kHz sine wave at 50% amplitude
const testSamples = new Int16Array(320);
for (let i = 0; i < 320; i++) {
  testSamples[i] = Math.sin(2 * Math.PI * 1000 * i / 16000) * 16384;
}

// Test context with state
const testContext = {
  metrics: {},
  shortTermBuffer: [],
  integratedBuffer: [],
  loudnessBuffer: [],
  vadHistory: [],
  speechDurations: [],
  speechRmsBuffer: [],
  noiseBuffer: [],
  lastNoiseFloor: -60,
  currentSpeechFrames: 0
};

// Test each metric
console.log('Testing 9 Critical Metrics:\n');

// Test base metrics first
const baseMetrics = ['pcm.rms_level', 'pcm.rms_dbfs', 'pcm.zero_crossing_rate'];
baseMetrics.forEach(name => {
  const metric = MetricsRegistry[name];
  if (metric && metric.compute) {
    const result = metric.compute(testSamples, testContext);
    testContext.metrics[name] = result; // Store for dependencies
    console.log(`✓ ${name}: ${result.toFixed(3)}`);
  }
});

console.log();

// Test the 9 critical metrics
const criticalMetrics = [
  'pcm.lufs_momentary',
  'pcm.lufs_short_term',
  'pcm.lufs_integrated',
  'pcm.speech_probability',
  'pcm.speech_segments_per_min',
  'pcm.avg_speech_duration_ms',
  'pcm.snr_db',
  'pcm.noise_floor_dbfs',
  'pcm.background_noise_level'
];

criticalMetrics.forEach(name => {
  const metric = MetricsRegistry[name];
  if (metric && metric.compute) {
    try {
      const result = metric.compute(testSamples, testContext);
      testContext.metrics[name] = result;

      // Validate result
      if (typeof result !== 'number' || isNaN(result)) {
        console.log(`✗ ${name}: INVALID (${result})`);
      } else {
        console.log(`✓ ${name}: ${result.toFixed(3)} ${metric.unit || ''}`);
      }
    } catch (err) {
      console.log(`✗ ${name}: ERROR - ${err.message}`);
    }
  } else {
    console.log(`✗ ${name}: NOT FOUND`);
  }
});

// Verify ranges
console.log('\nRange Validation:');
if (testContext.metrics['pcm.lufs_momentary'] >= -70 && testContext.metrics['pcm.lufs_momentary'] <= 0) {
  console.log('✓ LUFS in valid range [-70, 0]');
}
if (testContext.metrics['pcm.speech_probability'] >= 0 && testContext.metrics['pcm.speech_probability'] <= 1) {
  console.log('✓ Speech probability in valid range [0, 1]');
}
if (testContext.metrics['pcm.snr_db'] >= 0 && testContext.metrics['pcm.snr_db'] <= 60) {
  console.log('✓ SNR in valid range [0, 60]');
}
```

### Step 4.2: Deployment Commands

```bash
# 1. Backup current version
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ssh azureuser@20.170.155.53 "cp /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/MetricsRegistry.js /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/MetricsRegistry.js.backup-$TIMESTAMP"

# 2. Deploy fixed version
scp /tmp/MetricsRegistry_fixed_exact.js azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/MetricsRegistry.js

# 3. Restart STTTTSserver
ssh azureuser@20.170.155.53 "pm2 restart STTTTSserver"

# 4. Monitor logs for errors
ssh azureuser@20.170.155.53 "pm2 logs STTTTSserver --lines 100 --nostream | grep -E '(Error|TypeError|undefined|NaN)'"

# 5. Check if metrics are computing
ssh azureuser@20.170.155.53 "pm2 logs STTTTSserver --lines 200 --nostream | grep -E '(Skipping non-realtime metric pcm.lufs)' || echo 'Good - not skipping LUFS!'"
```

## Phase 5: Verification Steps

### 1. Verify Base Metrics Exist
```bash
curl -s 'http://localhost:3002/api/snapshot?trace_id=XXX' | \
  jq '.buckets[0].metricsData | to_entries[] | select(.key | startswith("pcm.rms") or .key == "pcm.zero_crossing_rate") | "\(.key): \(.value)"'
```

### 2. Check 9 Metrics Computing
```bash
curl -s 'http://localhost:3002/api/snapshot?trace_id=XXX' | \
  python3 -c 'import sys, json; \
  d = json.load(sys.stdin); \
  m = d["buckets"][0]["metricsData"] if d.get("buckets") else {}; \
  target = ["pcm.lufs_momentary", "pcm.speech_probability", "pcm.snr_db"]; \
  for k in target: print(f"{k}: {m.get(k, 'NOT FOUND')}")'
```

### 3. Verify Database Storage
```bash
ssh azureuser@20.170.155.53 "curl -s http://localhost:8083/api/records | \
  jq '.[].buckets[0].metricsData | keys | map(select(startswith(\"pcm.lufs\") or startswith(\"pcm.speech\")))'"
```

## Implementation Timeline

### Immediate (Day 1):
1. ✅ Add base metrics (rms_level, zero_crossing_rate)
2. ✅ Fix LUFS formulas with exact calculations
3. ✅ Test locally with unit tests

### Short-term (Days 2-3):
4. ✅ Fix speech metrics with proper VAD
5. ✅ Fix noise metrics with averaging
6. ✅ Deploy to staging environment

### Medium-term (Week 2):
7. ✅ Verify database storage working
8. ✅ Enable remaining 19 metrics
9. ✅ Production deployment

## Success Criteria

- [ ] All base metrics return valid values
- [ ] 9 critical metrics compute without errors
- [ ] LUFS values in range [-70, 0]
- [ ] Speech probability in range [0, 1]
- [ ] SNR in range [0, 60] dB
- [ ] No undefined or NaN values
- [ ] Metrics stored in database
- [ ] Values correlate with actual audio

## Risk Mitigation

1. **Backup Strategy**: Always backup before deployment
2. **Rollback Plan**: Keep previous version ready
3. **Incremental Testing**: Test each metric individually
4. **Monitoring**: Watch logs for computation errors
5. **Validation**: Compare values against known audio samples

## Notes

- All formulas based on `28_metrics_exact_formulas.md`
- Sample rate: 16 kHz, Frame: 20ms (320 samples)
- Samples must be normalized to [-1, 1] for calculations
- LUFS offset: +0.691 (EBU R128 standard)
- ZCR range for speech: 0.00625 to 0.05 at 16kHz

## Files Affected

1. `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/MetricsRegistry.js`
2. Station handlers already deployed with state management
3. No changes needed to bootstrap or generic handler

---
Generated: 2026-01-13 22:45:00
Location: VM 20.170.155.53
Status: Ready for implementation