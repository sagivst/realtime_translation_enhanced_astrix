# AI-Driven Recursive Audio Calibration System - Implementation Plan

**Date**: November 26, 2025
**Goal**: Complete the monitoring system with AI-driven recursive calibration using ChatGPT

---

## Overview

This system extends the existing 3-level monitoring dashboard (55 parameters × 8 stations) with:
1. **Calibration Runner** - Execute test runs and capture results
2. **Data Packaging Engine** - Export metrics + audio to ChatGPT-friendly format
3. **ChatGPT Relay Service** - Send data to OpenAI API, receive optimized parameters
4. **Recursive Optimization Coordinator** - Apply parameters, evaluate, iterate until convergence
5. **Audio Tap Layer** - Capture PCM snapshots aligned with metrics
6. **Quality Score Calculator** - Compute weighted quality scores for convergence detection

---

## Architecture Integration

### Current System (Completed):
```
┌─────────────────────────────────────┐
│   3-Level Monitoring Dashboard      │
│   - 8 Stations                      │
│   - 55 Parameters (filtered)        │
│   - Real-time WebSocket updates     │
│   - Parameter configuration UI      │
└─────────────────────────────────────┘
          ↑
          │ Socket.IO
          │
┌─────────────────────────────────────┐
│   Monitoring Server (Port 3021)     │
│   - Station metrics generation      │
│   - Parameter config API            │
│   - WebSocket broadcasting          │
└─────────────────────────────────────┘
```

### New AI Calibration Layer (To Add):
```
┌─────────────────────────────────────────────────────────────┐
│              AI Calibration System (New)                    │
├─────────────────────────────────────────────────────────────┤
│  Calibration Runner  →  Data Packager  →  ChatGPT Relay    │
│         ↓                                        ↓           │
│  Audio Tap Capture  ←  Recursive Manager  ←  OpenAI API    │
│         ↓                    ↓                               │
│  Quality Score      →   Apply Parameters                    │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────┐
│   Monitoring Server (Extended)      │
│   + Calibration API endpoints       │
│   + Parameter update application    │
│   + Audio snapshot storage          │
└─────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: API Endpoints (Foundation)
**File**: `monitoring-server.js`

Add 7 new API endpoints:

#### 1.1 GET /api/stations/:id/params
```javascript
// Get current DSP parameters for a station
app.get('/api/stations/:id/params', (req, res) => {
  const stationId = req.params.id;
  const station = stations[stationId];
  if (!station) {
    return res.status(404).json({ error: 'Station not found' });
  }
  res.json({
    stationId,
    parameters: station.parameters || {}
  });
});
```

#### 1.2 POST /api/stations/:id/params
```javascript
// Update DSP parameters for a station
app.post('/api/stations/:id/params', (req, res) => {
  const stationId = req.params.id;
  const station = stations[stationId];
  if (!station) {
    return res.status(404).json({ error: 'Station not found' });
  }

  // Apply new parameters
  station.parameters = { ...station.parameters, ...req.body };

  // Log parameter change
  console.log(`[Calibration] Updated parameters for ${stationId}:`, req.body);

  // Broadcast update to all clients
  io.emit('parameters-updated', { stationId, parameters: station.parameters });

  res.json({ success: true, parameters: station.parameters });
});
```

#### 1.3 GET /api/stations/:id/metrics
```javascript
// Get current 55 metrics for a station
app.get('/api/stations/:id/metrics', (req, res) => {
  const stationId = req.params.id;
  const station = stations[stationId];
  if (!station) {
    return res.status(404).json({ error: 'Station not found' });
  }

  const metrics = generate55Parameters(station.metrics);
  res.json({
    stationId,
    timestamp: Date.now(),
    metrics
  });
});
```

#### 1.4 GET /api/stations/:id/audio-tap (WebSocket)
```javascript
// Stream PCM audio snapshots
io.on('connection', (socket) => {
  socket.on('subscribe-audio-tap', (stationId) => {
    console.log(`[AudioTap] Client subscribed to ${stationId}`);

    // Send PCM snapshots every 100ms
    const interval = setInterval(() => {
      if (stations[stationId]) {
        const pcmSnapshot = captureAudioSnapshot(stationId);
        socket.emit('audio-tap-data', {
          stationId,
          timestamp: Date.now(),
          pcm: pcmSnapshot // base64 encoded PCM
        });
      }
    }, 100);

    socket.on('disconnect', () => {
      clearInterval(interval);
    });
  });
});
```

#### 1.5 POST /api/calibration/run
```javascript
// Trigger a calibration run
app.post('/api/calibration/run', async (req, res) => {
  const { stationId, duration = 5000 } = req.body;

  const runId = `${Date.now()}-${stationId}`;
  console.log(`[Calibration] Starting run ${runId}`);

  // Capture metrics and audio for duration
  const result = await executeCalibrationRun(stationId, duration);

  res.json({
    success: true,
    runId,
    result
  });
});
```

#### 1.6 POST /api/calibration/optimize
```javascript
// Send run to ChatGPT and get optimized parameters
app.post('/api/calibration/optimize', async (req, res) => {
  const { runData } = req.body;

  try {
    const optimizedParams = await sendToGPT(runData);
    res.json({
      success: true,
      optimizedParameters: optimizedParams
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### 1.7 POST /api/calibration/recursive-optimize
```javascript
// Start recursive optimization loop
app.post('/api/calibration/recursive-optimize', async (req, res) => {
  const { stationId, maxIterations = 20, threshold = 0.01 } = req.body;

  const optimizationId = `opt-${Date.now()}-${stationId}`;

  // Start optimization in background
  startRecursiveOptimization(stationId, maxIterations, threshold, optimizationId);

  res.json({
    success: true,
    optimizationId,
    message: 'Recursive optimization started'
  });
});
```

---

### Phase 2: Data Structures

#### 2.1 Station Parameters Schema
```javascript
const stationParameters = {
  'station-1': { // ARI Receive
    input_gain_db: 0,
    nr_strength: 0.3,
    comp_threshold_db: -20,
    eq_low_gain: 0,
    eq_mid_gain: 0,
    eq_high_gain: 0
  },
  'station-2': { // STT Processing
    vad_threshold: 0.5,
    silence_timeout_ms: 2000,
    min_speech_duration_ms: 100
  },
  'station-3': { // Translation
    // Translation has no audio DSP parameters
  },
  'station-4': { // TTS Generation
    output_gain_db: 0,
    speaking_rate: 1.0,
    pitch_shift_semitones: 0
  },
  'station-5': { // Audio Convert
    resample_quality: 'high',
    dithering: true
  },
  'station-6': { // UDP Send
    packet_size_bytes: 160,
    jitter_buffer_ms: 40
  },
  'station-7': { // Buffer Monitor
    buffer_target_ms: 100,
    warning_threshold_pct: 80
  },
  'station-8': { // Gateway Send
    output_gain_db: 0,
    packet_loss_compensation: true
  }
};
```

#### 2.2 Calibration Run Data Schema
```javascript
const calibrationRunSchema = {
  run_id: "2025-11-26-14-33-01-station-1",
  station_id: "station-1",
  timestamp: 1732585981000,
  parameters_before: {
    input_gain_db: -3,
    nr_strength: 0.4,
    comp_threshold_db: -20
  },
  metrics: {
    // All 55 parameters from generate55Parameters()
    buffer: { total: 45.2, input: 23.1, ... },
    latency: { avg: 13.5, peak: 18.2, ... },
    packet: { rx: 15234, dropped: 2, ... },
    audioQuality: { snr: 26.3, clipping: 0, ... },
    performance: { cpu: 23.5, memory: 45.2, ... },
    custom: { state: 1, successRate: 98.5, ... }
  },
  audio_snapshot_base64: "UklGRiQAAABXQVZFZm10...", // 1 second PCM
  quality_score: 0.842,
  subjective_score: null, // optional manual rating
  notes: ""
};
```

#### 2.3 ChatGPT Request Format
```javascript
const chatGPTRequest = {
  model: "gpt-4",
  messages: [
    {
      role: "system",
      content: `You are an audio DSP optimization expert. Analyze calibration run data and suggest parameter improvements.

Your goal is to maximize:
- SNR (Signal-to-Noise Ratio)
- RMS stability
- Audio quality
- Processing efficiency

While minimizing:
- Artifacts
- Clipping
- Latency
- Packet loss

Return ONLY a JSON object with recommended parameters and reasoning.`
    },
    {
      role: "user",
      content: `Analyze this calibration run for ${stationName}:

Current Parameters:
${JSON.stringify(parameters_before, null, 2)}

Metrics:
${JSON.stringify(metrics, null, 2)}

Quality Score: ${quality_score}

Suggest optimized parameters to improve audio quality.`
    }
  ],
  response_format: { type: "json_object" },
  temperature: 0.3
};
```

#### 2.4 ChatGPT Response Schema
```javascript
const chatGPTResponse = {
  recommended_parameters: {
    input_gain_db: -4,
    nr_strength: 0.35,
    comp_threshold_db: -18,
    eq_mid_gain: 1.2
  },
  reasoning: "Lower gain reduces clipping events. NR adjusted for better clarity. Compression threshold raised to preserve dynamics.",
  expected_improvement: {
    snr: "+2.0 dB",
    clipping: "0 → 0 (maintained)",
    artifacts: "-15%",
    quality_score: "+0.05"
  },
  confidence: 0.87
};
```

---

### Phase 3: Core Functions

#### 3.1 Execute Calibration Run
```javascript
async function executeCalibrationRun(stationId, duration = 5000) {
  const station = stations[stationId];
  const runId = `${Date.now()}-${stationId}`;

  console.log(`[CalibrationRun] Starting ${runId} for ${duration}ms`);

  // Capture parameters before run
  const paramsBefore = { ...station.parameters };

  // Collect metrics over duration
  const metricsCollected = [];
  const audioChunks = [];

  const startTime = Date.now();
  const interval = setInterval(() => {
    metricsCollected.push(generate55Parameters(station.metrics));
    audioChunks.push(captureAudioSnapshot(stationId));
  }, 100); // Collect every 100ms

  // Wait for duration
  await new Promise(resolve => setTimeout(resolve, duration));
  clearInterval(interval);

  // Average metrics
  const avgMetrics = averageMetrics(metricsCollected);

  // Combine audio chunks
  const audioSnapshot = combineAudioChunks(audioChunks);

  // Calculate quality score
  const qualityScore = calculateQualityScore(avgMetrics, stationId);

  const runData = {
    run_id: runId,
    station_id: stationId,
    timestamp: startTime,
    parameters_before: paramsBefore,
    metrics: avgMetrics,
    audio_snapshot_base64: audioSnapshot,
    quality_score: qualityScore,
    subjective_score: null,
    notes: ""
  };

  // Store run data
  calibrationRuns[runId] = runData;

  console.log(`[CalibrationRun] Completed ${runId}, score: ${qualityScore.toFixed(3)}`);

  return runData;
}
```

#### 3.2 Quality Score Calculation
```javascript
function calculateQualityScore(metrics, stationId) {
  // Get station-specific weights
  const weights = qualityScoreWeights[stationId] || defaultWeights;

  // Normalize metrics to 0-1 range
  const normalized = {
    snr: normalize(metrics.audioQuality.snr, 0, 60), // Higher is better
    rms: normalize(Math.abs(metrics.audioQuality.audioLevel + 20), 0, 20), // Closer to -20dB is better
    latency: 1 - normalize(metrics.latency.avg, 0, 100), // Lower is better
    clipping: 1 - normalize(metrics.audioQuality.clipping, 0, 100), // Lower is better
    artifacts: 1 - normalize(metrics.custom.warningCount, 0, 10), // Lower is better
    bufferStability: 1 - normalize(Math.abs(metrics.buffer.total - 50), 0, 50), // Closer to 50% is better
    packetLoss: 1 - normalize(metrics.packet.lossRate || 0, 0, 5), // Lower is better
    cpu: 1 - normalize(metrics.performance.cpu, 0, 100), // Lower is better
    successRate: normalize(metrics.custom.successRate, 0, 100) // Higher is better
  };

  // Weighted sum
  const score =
    weights.snr * normalized.snr +
    weights.rms * normalized.rms +
    weights.latency * normalized.latency +
    weights.clipping * normalized.clipping +
    weights.artifacts * normalized.artifacts +
    weights.bufferStability * normalized.bufferStability +
    weights.packetLoss * normalized.packetLoss +
    weights.cpu * normalized.cpu +
    weights.successRate * normalized.successRate;

  // Normalize to 0-1
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  return score / totalWeight;
}

function normalize(value, min, max) {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

const defaultWeights = {
  snr: 3.0,           // Critical for audio quality
  rms: 2.0,           // Important for level consistency
  latency: 2.5,       // Critical for real-time
  clipping: 4.0,      // Must avoid at all costs
  artifacts: 3.5,     // Very important
  bufferStability: 2.0,
  packetLoss: 3.0,
  cpu: 1.0,
  successRate: 2.5
};
```

#### 3.3 Send to ChatGPT
```javascript
async function sendToGPT(runData) {
  const { station_id, parameters_before, metrics, quality_score } = runData;
  const station = stations[station_id];

  const prompt = `Analyze this calibration run for ${station.name}:

Current Parameters:
${JSON.stringify(parameters_before, null, 2)}

Metrics:
- SNR: ${metrics.audioQuality.snr?.toFixed(1)} dB
- Audio Level: ${metrics.audioQuality.audioLevel?.toFixed(1)} dB
- Clipping Events: ${metrics.audioQuality.clipping || 0}
- Average Latency: ${metrics.latency.avg?.toFixed(1)} ms
- Peak Latency: ${metrics.latency.peak?.toFixed(1)} ms
- Packet Loss Rate: ${metrics.packet.lossRate?.toFixed(2)}%
- CPU Usage: ${metrics.performance.cpu?.toFixed(1)}%
- Buffer Total: ${metrics.buffer.total?.toFixed(1)}%
- Success Rate: ${metrics.custom.successRate?.toFixed(1)}%
- Warning Count: ${metrics.custom.warningCount || 0}
- Critical Count: ${metrics.custom.criticalCount || 0}

Overall Quality Score: ${quality_score.toFixed(3)} / 1.000

Suggest optimized parameters to improve audio quality, reduce latency, and minimize artifacts.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an audio DSP optimization expert. Analyze calibration data and suggest parameter improvements.

Return ONLY a JSON object with this structure:
{
  "recommended_parameters": { "param_name": value },
  "reasoning": "Brief explanation",
  "expected_improvement": { "metric": "change" },
  "confidence": 0.0-1.0
}`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })
  });

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  console.log(`[ChatGPT] Received optimization for ${station_id}:`, result.reasoning);

  return result;
}
```

#### 3.4 Recursive Optimization Loop
```javascript
async function startRecursiveOptimization(stationId, maxIterations, threshold, optimizationId) {
  console.log(`[RecursiveOpt] Starting ${optimizationId} (max: ${maxIterations}, threshold: ${threshold})`);

  let iteration = 0;
  let previousScore = 0;
  let converged = false;

  const optimizationLog = [];

  while (iteration < maxIterations && !converged) {
    iteration++;
    console.log(`[RecursiveOpt] Iteration ${iteration}/${maxIterations}`);

    // Execute calibration run
    const runData = await executeCalibrationRun(stationId, 5000);
    const currentScore = runData.quality_score;

    // Log iteration
    optimizationLog.push({
      iteration,
      timestamp: Date.now(),
      parameters: { ...stations[stationId].parameters },
      score: currentScore,
      delta: currentScore - previousScore
    });

    // Check convergence
    if (iteration > 1) {
      const delta = currentScore - previousScore;
      console.log(`[RecursiveOpt] Score: ${currentScore.toFixed(3)}, Delta: ${delta.toFixed(4)}`);

      if (Math.abs(delta) < threshold) {
        converged = true;
        console.log(`[RecursiveOpt] Converged! Delta ${delta.toFixed(4)} < threshold ${threshold}`);
        break;
      }
    }

    // Send to ChatGPT for optimization
    const gptResult = await sendToGPT(runData);

    // Apply recommended parameters
    const newParams = gptResult.recommended_parameters;
    stations[stationId].parameters = { ...stations[stationId].parameters, ...newParams };

    console.log(`[RecursiveOpt] Applied new parameters:`, newParams);

    // Broadcast parameter update
    io.emit('parameters-updated', {
      stationId,
      parameters: stations[stationId].parameters
    });

    // Broadcast optimization progress
    io.emit('optimization-progress', {
      optimizationId,
      stationId,
      iteration,
      currentScore,
      delta: currentScore - previousScore,
      converged,
      parameters: newParams
    });

    previousScore = currentScore;

    // Wait between iterations
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Final result
  const finalResult = {
    optimizationId,
    stationId,
    totalIterations: iteration,
    converged,
    finalScore: previousScore,
    optimizationLog
  };

  // Store result
  optimizationResults[optimizationId] = finalResult;

  // Broadcast completion
  io.emit('optimization-complete', finalResult);

  console.log(`[RecursiveOpt] Completed ${optimizationId}: ${converged ? 'CONVERGED' : 'MAX_ITERATIONS'}`);

  return finalResult;
}
```

---

### Phase 4: Helper Functions

#### 4.1 Average Metrics
```javascript
function averageMetrics(metricsArray) {
  const avg = {};
  const categories = ['buffer', 'latency', 'packet', 'audioQuality', 'performance', 'custom'];

  categories.forEach(category => {
    avg[category] = {};
    const keys = Object.keys(metricsArray[0][category] || {});

    keys.forEach(key => {
      const values = metricsArray.map(m => m[category]?.[key]).filter(v => v !== undefined && v !== null);
      avg[category][key] = values.reduce((a, b) => a + b, 0) / values.length;
    });
  });

  return avg;
}
```

#### 4.2 Capture Audio Snapshot (Simulated)
```javascript
function captureAudioSnapshot(stationId) {
  // In production: capture actual PCM from audio pipeline
  // For now: generate simulated PCM data

  const sampleRate = 16000;
  const duration = 1; // 1 second
  const samples = sampleRate * duration;

  const pcmData = new Int16Array(samples);

  // Generate test tone (440 Hz sine wave with noise)
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const signal = Math.sin(2 * Math.PI * 440 * t) * 0.5; // Sine wave
    const noise = (Math.random() - 0.5) * 0.05; // Low noise
    pcmData[i] = Math.floor((signal + noise) * 32767);
  }

  // Convert to base64
  const buffer = Buffer.from(pcmData.buffer);
  return buffer.toString('base64');
}
```

#### 4.3 Combine Audio Chunks
```javascript
function combineAudioChunks(chunks) {
  // For now: just return the first chunk
  // In production: concatenate all PCM chunks
  return chunks[0] || '';
}
```

---

## Deployment Steps

### Step 1: Update monitoring-server.js
1. Add all new API endpoints
2. Add calibration functions
3. Add ChatGPT integration
4. Add quality score calculation
5. Add recursive optimization loop

### Step 2: Add environment variable
```bash
export OPENAI_API_KEY="sk-..."
```

### Step 3: Install dependencies
```bash
npm install node-fetch  # For OpenAI API calls
```

### Step 4: Create calibration dashboard UI
New file: `calibration-dashboard.html`
- Start/stop recursive optimization
- Monitor optimization progress
- View quality score trends
- Compare parameter sets
- Manual parameter override

### Step 5: Deploy to Azure VM
```bash
scp monitoring-server-with-calibration.js azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring-server.js
scp calibration-dashboard.html azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/
```

### Step 6: Restart server
```bash
ssh azureuser@20.170.155.53 "pkill -f monitoring-server.js && cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && nohup node monitoring-server.js > monitoring-server.log 2>&1 &"
```

---

## Testing Plan

### Test 1: Manual Calibration Run
```bash
curl -X POST http://20.170.155.53:3021/api/calibration/run \
  -H "Content-Type: application/json" \
  -d '{"stationId": "station-1", "duration": 5000}'
```

### Test 2: ChatGPT Optimization
```bash
# Get run data
RUN_DATA=$(curl http://20.170.155.53:3021/api/calibration/runs/latest)

# Send to ChatGPT
curl -X POST http://20.170.155.53:3021/api/calibration/optimize \
  -H "Content-Type: application/json" \
  -d "{\"runData\": $RUN_DATA}"
```

### Test 3: Recursive Optimization
```bash
curl -X POST http://20.170.155.53:3021/api/calibration/recursive-optimize \
  -H "Content-Type: application/json" \
  -d '{"stationId": "station-1", "maxIterations": 10, "threshold": 0.01}'
```

---

## Success Criteria

1. ✅ Calibration runs execute and capture metrics
2. ✅ Audio snapshots are captured (even if simulated)
3. ✅ ChatGPT receives properly formatted data
4. ✅ ChatGPT returns valid parameter recommendations
5. ✅ Parameters are applied to stations
6. ✅ Quality scores improve over iterations
7. ✅ Optimization converges when delta < threshold
8. ✅ Dashboard displays optimization progress in real-time

---

## Next Steps

1. Implement Phase 1 API endpoints
2. Add calibration runner function
3. Integrate OpenAI API
4. Build recursive optimization coordinator
5. Create calibration dashboard UI
6. Test with simulated data
7. Deploy to Azure VM
8. Integrate with real audio pipeline

