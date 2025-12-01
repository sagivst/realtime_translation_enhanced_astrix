/**
 * Audio Quality Monitoring Server with AI-Driven Calibration
 *
 * Standalone server for monitoring audio quality metrics with recursive optimization
 * Runs alongside STTTTSserver on a different port
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

// Import our monitoring modules
const TestAudioGenerator = require('./modules/test-audio-generator');
const LogStreamManager = require('./modules/log-stream-manager');
const WAVRecorder = require('./modules/wav-recorder');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = 3021; // Different port from STTTTSserver

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve parameter configuration files
app.use("/config/parameters", express.static(path.join(__dirname, "config/parameters")));

// =========================================
// STATION PARAMETERS (DSP Configurations)
// =========================================

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
    // No audio DSP parameters
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

// Monitoring stations state
const stations = {
  'station-1': { id: 'station-1', name: 'ARI Receive', type: 'ari-rx', active: false, metrics: {}, parameters: stationParameters['station-1'] },
  'station-2': { id: 'station-2', name: 'STT Processing', type: 'stt', active: false, metrics: {}, parameters: stationParameters['station-2'] },
  'station-3': { id: 'station-3', name: 'Translation', type: 'translate', active: false, metrics: {}, parameters: stationParameters['station-3'] },
  'station-4': { id: 'station-4', name: 'TTS Generation', type: 'tts', active: false, metrics: {}, parameters: stationParameters['station-4'] },
  'station-5': { id: 'station-5', name: 'Audio Convert', type: 'convert', active: false, metrics: {}, parameters: stationParameters['station-5'] },
  'station-6': { id: 'station-6', name: 'UDP Send', type: 'udp-tx', active: false, metrics: {}, parameters: stationParameters['station-6'] },
  'station-7': { id: 'station-7', name: 'Buffer Monitor', type: 'buffer', active: false, metrics: {}, parameters: stationParameters['station-7'] },
  'station-8': { id: 'station-8', name: 'Gateway Send', type: 'gateway', active: false, metrics: {}, parameters: stationParameters['station-8'] }
};

// Test audio generator instance
const audioGenerator = new TestAudioGenerator();

// LOG managers per station
const logManagers = {};
Object.keys(stations).forEach(stationId => {
  logManagers[stationId] = new LogStreamManager();
});

// WAV recorders per station
const wavRecorders = {};
Object.keys(stations).forEach(stationId => {
  wavRecorders[stationId] = new WAVRecorder();
});

// =========================================
// CALIBRATION STORAGE
// =========================================

const calibrationRuns = {}; // Store calibration run data
const optimizationResults = {}; // Store recursive optimization results
const activeOptimizations = {}; // Track active optimization loops

// Initialize metrics for each station
Object.keys(stations).forEach(stationId => {
  stations[stationId].metrics = {
    bufferUsage: Math.random() * 100,
    avgLatency: Math.random() * 100,
    jitter: Math.random() * 50,
    packetsRx: 0,
    packetsTx: 0,
    packetsDropped: 0,
    bytesRx: 0,
    bytesTx: 0,
    logEnabled: false,
    wavEnabled: false,
    lastUpdate: Date.now()
  };
});

// =========================================
// HELPER FUNCTIONS
// =========================================

// Generate all 55 parameters from base metrics
function generate55Parameters(baseMetrics) {
  const packetsRx = baseMetrics.packetsRx || 0;
  const packetsTx = baseMetrics.packetsTx || 0;
  const packetsDropped = baseMetrics.packetsDropped || 0;
  const bytesRx = baseMetrics.bytesRx || 0;
  const bytesTx = baseMetrics.bytesTx || 0;
  const bufferUsage = baseMetrics.bufferUsage || 0;
  const avgLatency = baseMetrics.avgLatency || 0;
  const jitter = baseMetrics.jitter || 0;

  return {
    buffer: {
      total: bufferUsage,
      input: bufferUsage * 0.3 + Math.random() * 10,
      processing: bufferUsage * 0.4 + Math.random() * 10,
      output: bufferUsage * 0.3 + Math.random() * 10,
      overruns: Math.floor(Math.random() * 3),
      underruns: Math.floor(Math.random() * 2),
      highWater: 80 + Math.random() * 10,
      lowWater: 10 + Math.random() * 10,
      allocated: bufferUsage * 1.2,
      free: 100 - bufferUsage
    },
    latency: {
      avg: avgLatency,
      peak: avgLatency * 1.5 + Math.random() * 20,
      min: avgLatency * 0.5,
      jitter: jitter,
      e2e: avgLatency + Math.random() * 30,
      processing: avgLatency * 0.6 + Math.random() * 10,
      network: avgLatency * 0.3 + Math.random() * 5,
      variance: jitter * 0.8
    },
    packet: {
      rx: packetsRx,
      tx: packetsTx,
      dropped: packetsDropped,
      lossRate: packetsRx > 0 ? (packetsDropped / packetsRx) * 100 : 0,
      errors: Math.floor(Math.random() * 2),
      retransmits: Math.floor(Math.random() * 5),
      outOfOrder: Math.floor(Math.random() * 3),
      duplicates: Math.floor(Math.random() * 2),
      bytesRx: bytesRx,
      bytesTx: bytesTx,
      throughputRx: bytesRx / Math.max(1, Date.now() / 1000),
      throughputTx: bytesTx / Math.max(1, Date.now() / 1000)
    },
    audioQuality: {
      sampleRate: 16000,
      bitDepth: 16,
      channels: 1,
      format: 0, // 0 = PCM, 1 = Other
      clipping: Math.floor(Math.random() * 3),
      silenceCount: Math.floor(Math.random() * 5),
      silenceDuration: Math.floor(Math.random() * 500),
      audioLevel: -25 + Math.random() * 15,
      snr: 40 + Math.random() * 15,
      thd: 0.01 + Math.random() * 0.5
    },
    performance: {
      cpu: 20 + Math.random() * 60,
      memory: 40 + Math.random() * 40,
      threads: 4 + Math.floor(Math.random() * 4),
      connections: 1 + Math.floor(Math.random() * 5),
      queueDepth: Math.floor(Math.random() * 50),
      processingRate: 80 + Math.random() * 20,
      errorRate: Math.random() * 2,
      uptime: Date.now() / 1000
    },
    custom: {
      state: Math.floor(Math.random() * 2), // 0 or 1
      lastActivity: Math.floor(Math.random() * 3000),
      totalProcessed: packetsRx * 10 + Math.floor(Math.random() * 5000),
      processingSpeed: 40 + Math.random() * 50,
      successRate: 95 + Math.random() * 5,
      warningCount: Math.floor(Math.random() * 8),
      criticalCount: Math.floor(Math.random() * 3)
    }
  };
}

// Normalize value to 0-1 range
function normalize(value, min, max) {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

// Quality score weights per station type
const qualityScoreWeights = {
  'station-1': { snr: 3.0, rms: 2.0, latency: 2.5, clipping: 4.0, artifacts: 3.5, bufferStability: 2.0, packetLoss: 3.0, cpu: 1.0, successRate: 2.5 },
  'station-2': { snr: 2.5, rms: 1.5, latency: 3.0, clipping: 2.0, artifacts: 4.0, bufferStability: 2.0, packetLoss: 1.0, cpu: 2.5, successRate: 3.5 },
  'station-3': { snr: 0.0, rms: 0.0, latency: 3.5, clipping: 0.0, artifacts: 2.0, bufferStability: 2.5, packetLoss: 0.0, cpu: 3.0, successRate: 4.0 },
  'station-4': { snr: 3.5, rms: 3.0, latency: 2.0, clipping: 4.0, artifacts: 3.5, bufferStability: 2.0, packetLoss: 1.0, cpu: 2.0, successRate: 3.0 },
  'station-5': { snr: 3.0, rms: 2.5, latency: 2.0, clipping: 3.5, artifacts: 3.0, bufferStability: 2.5, packetLoss: 0.5, cpu: 2.0, successRate: 3.0 },
  'station-6': { snr: 1.0, rms: 1.0, latency: 3.5, clipping: 1.0, artifacts: 2.0, bufferStability: 3.0, packetLoss: 4.0, cpu: 1.5, successRate: 3.0 },
  'station-7': { snr: 0.0, rms: 0.0, latency: 2.0, clipping: 0.0, artifacts: 1.0, bufferStability: 5.0, packetLoss: 0.0, cpu: 2.0, successRate: 2.0 },
  'station-8': { snr: 3.0, rms: 2.5, latency: 3.0, clipping: 3.5, artifacts: 3.0, bufferStability: 2.5, packetLoss: 3.5, cpu: 1.5, successRate: 3.0 }
};

// Calculate quality score from metrics
function calculateQualityScore(metrics, stationId) {
  const weights = qualityScoreWeights[stationId] || qualityScoreWeights['station-1'];

  // Normalize metrics to 0-1 range
  const normalized = {
    snr: normalize(metrics.audioQuality.snr || 0, 0, 60), // Higher is better
    rms: normalize(Math.abs((metrics.audioQuality.audioLevel || -20) + 20), 0, 20), // Closer to -20dB is better
    latency: 1 - normalize(metrics.latency.avg || 0, 0, 100), // Lower is better
    clipping: 1 - normalize(metrics.audioQuality.clipping || 0, 0, 100), // Lower is better
    artifacts: 1 - normalize(metrics.custom.warningCount || 0, 0, 10), // Lower is better
    bufferStability: 1 - normalize(Math.abs((metrics.buffer.total || 50) - 50), 0, 50), // Closer to 50% is better
    packetLoss: 1 - normalize(metrics.packet.lossRate || 0, 0, 5), // Lower is better
    cpu: 1 - normalize(metrics.performance.cpu || 0, 0, 100), // Lower is better
    successRate: normalize(metrics.custom.successRate || 0, 0, 100) // Higher is better
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

// Average metrics from array
function averageMetrics(metricsArray) {
  const avg = {};
  const categories = ['buffer', 'latency', 'packet', 'audioQuality', 'performance', 'custom'];

  categories.forEach(category => {
    avg[category] = {};
    const keys = Object.keys(metricsArray[0][category] || {});

    keys.forEach(key => {
      const values = metricsArray.map(m => m[category]?.[key]).filter(v => v !== undefined && v !== null);
      if (values.length > 0) {
        avg[category][key] = values.reduce((a, b) => a + b, 0) / values.length;
      }
    });
  });

  return avg;
}

// Capture audio snapshot (simulated PCM data)
function captureAudioSnapshot(stationId) {
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

// Execute calibration run
async function executeCalibrationRun(stationId, duration = 5000) {
  const station = stations[stationId];
  if (!station) {
    throw new Error('Station not found');
  }

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

  // Combine audio chunks (just use first chunk for now)
  const audioSnapshot = audioChunks[0] || '';

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

// Send data to ChatGPT and get optimized parameters
async function sendToGPT(runData) {
  const { station_id, parameters_before, metrics, quality_score } = runData;
  const station = stations[station_id];

  if (!process.env.OPENAI_API_KEY) {
    console.warn('[ChatGPT] OPENAI_API_KEY not set, returning mock response');

    // Return mock optimization (slight improvements)
    return {
      recommended_parameters: Object.keys(parameters_before).reduce((acc, key) => {
        const value = parameters_before[key];
        if (typeof value === 'number') {
          acc[key] = value + (Math.random() - 0.5) * 0.2; // Small random adjustment
        } else {
          acc[key] = value;
        }
        return acc;
      }, {}),
      reasoning: "Mock optimization: Applied small random parameter adjustments for testing",
      expected_improvement: {
        snr: "+0.5 dB",
        quality_score: "+0.02"
      },
      confidence: 0.5
    };
  }

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

  try {
    const fetch = (await import('node-fetch')).default;
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
  } catch (error) {
    console.error('[ChatGPT] Error:', error.message);
    throw error;
  }
}

// Recursive optimization loop
async function startRecursiveOptimization(stationId, maxIterations, threshold, optimizationId) {
  console.log(`[RecursiveOpt] Starting ${optimizationId} (max: ${maxIterations}, threshold: ${threshold})`);

  let iteration = 0;
  let previousScore = 0;
  let converged = false;

  const optimizationLog = [];

  activeOptimizations[optimizationId] = {
    stationId,
    status: 'running',
    startTime: Date.now(),
    iteration: 0
  };

  try {
    while (iteration < maxIterations && !converged) {
      iteration++;
      console.log(`[RecursiveOpt] Iteration ${iteration}/${maxIterations}`);

      activeOptimizations[optimizationId].iteration = iteration;

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
  } catch (error) {
    console.error(`[RecursiveOpt] Error in ${optimizationId}:`, error);
    activeOptimizations[optimizationId].status = 'error';
    activeOptimizations[optimizationId].error = error.message;
  }

  // Final result
  const finalResult = {
    optimizationId,
    stationId,
    totalIterations: iteration,
    converged,
    finalScore: previousScore,
    optimizationLog,
    endTime: Date.now()
  };

  // Store result
  optimizationResults[optimizationId] = finalResult;
  activeOptimizations[optimizationId].status = 'complete';

  // Broadcast completion
  io.emit('optimization-complete', finalResult);

  console.log(`[RecursiveOpt] Completed ${optimizationId}: ${converged ? 'CONVERGED' : 'MAX_ITERATIONS'}`);

  return finalResult;
}

// =========================================
// WEBSOCKET HANDLERS
// =========================================

io.on('connection', (socket) => {
  console.log('[Monitoring] Client connected:', socket.id);

  // Send initial state
  socket.emit('stations-state', stations);

  // Subscribe to audio tap
  socket.on('subscribe-audio-tap', (stationId) => {
    console.log(`[AudioTap] Client subscribed to ${stationId}`);

    // Send PCM snapshots every 100ms
    const interval = setInterval(() => {
      if (stations[stationId]) {
        const pcmSnapshot = captureAudioSnapshot(stationId);
        socket.emit('audio-tap-data', {
          stationId,
          timestamp: Date.now(),
          pcm: pcmSnapshot
        });
      }
    }, 100);

    socket.on('disconnect', () => {
      clearInterval(interval);
    });
  });

  // Handle LOG control
  socket.on('toggle-log', async (data) => {
    const { stationId, enabled } = data;

    if (!stations[stationId]) {
      socket.emit('error', { message: 'Station not found' });
      return;
    }

    try {
      if (enabled) {
        await logManagers[stationId].startLogging(stationId, {
          types: ['stream', 'metrics', 'events'],
          format: 'json',
          rotation: { maxSize: '10MB', maxFiles: 5 }
        });
      } else {
        await logManagers[stationId].stopLogging(stationId);
      }

      stations[stationId].metrics.logEnabled = enabled;
      io.emit('station-update', { stationId, metrics: stations[stationId].metrics });

      console.log(`[Monitoring] LOG ${enabled ? 'ON' : 'OFF'} for ${stationId}`);
    } catch (error) {
      console.error(`[Monitoring] LOG toggle error for ${stationId}:`, error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle WAV control
  socket.on('toggle-wav', async (data) => {
    const { stationId, enabled } = data;

    if (!stations[stationId]) {
      socket.emit('error', { message: 'Station not found' });
      return;
    }

    try {
      if (enabled) {
        await wavRecorders[stationId].startRecording(stationId, {
          sampleRate: 16000,
          channels: 1,
          bitDepth: 16
        });
      } else {
        const stats = await wavRecorders[stationId].stopRecording(stationId);
        console.log(`[Monitoring] WAV stopped for ${stationId}:`, stats);
      }

      stations[stationId].metrics.wavEnabled = enabled;
      io.emit('station-update', { stationId, metrics: stations[stationId].metrics });

      console.log(`[Monitoring] WAV ${enabled ? 'ON' : 'OFF'} for ${stationId}`);
    } catch (error) {
      console.error(`[Monitoring] WAV toggle error for ${stationId}:`, error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle test stream generation
  socket.on('start-test-stream', async (params) => {
    try {
      const result = await audioGenerator.startStream(params, (audioData, metadata) => {
        // Broadcast test audio packet to all clients
        io.emit('test-audio-packet', {
          packet: metadata.packet,
          totalPackets: metadata.totalPackets,
          size: audioData.length,
          ...metadata
        });

        // Update station metrics (simulate processing)
        Object.keys(stations).forEach(stationId => {
          stations[stationId].metrics.packetsRx++;
          stations[stationId].metrics.bytesRx += audioData.length;
          stations[stationId].metrics.bufferUsage = 30 + Math.random() * 40;
          stations[stationId].metrics.avgLatency = 20 + Math.random() * 80;
          stations[stationId].metrics.jitter = Math.random() * 30;
        });
      });

      socket.emit('test-stream-started', result);
      console.log('[Monitoring] Test stream started:', result);
    } catch (error) {
      console.error('[Monitoring] Test stream error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle test stream stop
  socket.on('stop-test-stream', () => {
    try {
      const stats = audioGenerator.stopStream();
      socket.emit('test-stream-stopped', stats);
      console.log('[Monitoring] Test stream stopped:', stats);
    } catch (error) {
      console.error('[Monitoring] Stop test stream error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('[Monitoring] Client disconnected:', socket.id);
  });
});

// =========================================
// PARAMETER CONFIGURATION API ENDPOINTS
// =========================================

const fs = require("fs").promises;
const fsSync = require("fs");

// Get parameter index
app.get("/api/parameters", async (req, res) => {
  try {
    const indexPath = path.join(__dirname, "config/parameters/index.json");
    const indexData = await fs.readFile(indexPath, "utf8");
    res.json(JSON.parse(indexData));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific parameter configuration
app.get("/api/parameters/:category/:paramName", async (req, res) => {
  try {
    const { category, paramName } = req.params;
    const paramPath = path.join(__dirname, "config/parameters", category, `${paramName}.json`);
    const paramData = await fs.readFile(paramPath, "utf8");
    res.json(JSON.parse(paramData));
  } catch (error) {
    res.status(404).json({ success: false, error: "Parameter not found" });
  }
});

// Update parameter thresholds and alerts
app.patch("/api/parameters/:category/:paramName", async (req, res) => {
  try {
    const { category, paramName } = req.params;
    const paramPath = path.join(__dirname, "config/parameters", category, `${paramName}.json`);
    const existingData = await fs.readFile(paramPath, "utf8");
    const config = JSON.parse(existingData);

    // Update thresholds if provided
    if (req.body.thresholds) {
      config.thresholds = { ...config.thresholds, ...req.body.thresholds };
    }

    // Update alerts if provided
    if (req.body.alerts) {
      config.alerts = { ...config.alerts, ...req.body.alerts };
    }

    // Update default flag
    if (req.body.default !== undefined) {
      config.default = req.body.default;
    }

    await fs.writeFile(paramPath, JSON.stringify(config, null, 2));
    console.log(`[Config] Updated parameter: ${category}/${paramName}`);

    // Broadcast update to all clients
    io.emit("parameter-updated", { category, paramName, config });

    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================
// AI CALIBRATION API ENDPOINTS
// =========================================

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

// Trigger a calibration run
app.post('/api/calibration/run', async (req, res) => {
  const { stationId, duration = 5000 } = req.body;

  if (!stations[stationId]) {
    return res.status(404).json({ error: 'Station not found' });
  }

  try {
    const result = await executeCalibrationRun(stationId, duration);
    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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

// Start recursive optimization loop
app.post('/api/calibration/recursive-optimize', async (req, res) => {
  const { stationId, maxIterations = 20, threshold = 0.01 } = req.body;

  if (!stations[stationId]) {
    return res.status(404).json({ error: 'Station not found' });
  }

  const optimizationId = `opt-${Date.now()}-${stationId}`;

  // Start optimization in background
  startRecursiveOptimization(stationId, maxIterations, threshold, optimizationId)
    .catch(error => {
      console.error(`[RecursiveOpt] Fatal error in ${optimizationId}:`, error);
    });

  res.json({
    success: true,
    optimizationId,
    message: 'Recursive optimization started'
  });
});

// Get optimization status
app.get('/api/calibration/optimization/:id', (req, res) => {
  const optimizationId = req.params.id;
  const active = activeOptimizations[optimizationId];
  const result = optimizationResults[optimizationId];

  if (!active && !result) {
    return res.status(404).json({ error: 'Optimization not found' });
  }

  res.json({
    optimizationId,
    active: active || null,
    result: result || null
  });
});

// Get all calibration runs
app.get('/api/calibration/runs', (req, res) => {
  res.json({
    success: true,
    runs: Object.values(calibrationRuns),
    total: Object.keys(calibrationRuns).length
  });
});

// Get specific calibration run
app.get('/api/calibration/runs/:id', (req, res) => {
  const run = calibrationRuns[req.params.id];
  if (!run) {
    return res.status(404).json({ error: 'Run not found' });
  }
  res.json(run);
});

// =========================================
// EXISTING API ENDPOINTS
// =========================================

app.get('/api/stations', (req, res) => {
  res.json({ success: true, stations: Object.values(stations) });
});

app.post('/api/test/stream', async (req, res) => {
  try {
    const result = await audioGenerator.startStream(req.body || {}, (audioData, metadata) => {
      io.emit('test-stream-data', { audioData: audioData.toString('base64'), metadata });
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.delete('/api/test/stream', (req, res) => {
  const stats = audioGenerator.stopStream();
  res.json({ success: true, stats });
});

app.post('/api/stations/:stationId/log/:action', async (req, res) => {
  const { stationId, action } = req.params;
  if (action === 'start') logManagers[stationId]?.startLogging(stationId);
  else logManagers[stationId]?.stopLogging(stationId);
  res.json({ success: true });
});

app.post('/api/stations/:stationId/record/:action', async (req, res) => {
  const { stationId, action } = req.params;
  if (action === 'start') wavRecorders[stationId]?.startRecording();
  else wavRecorders[stationId]?.stopRecording();
  res.json({ success: true });
});

app.post('/api/metrics/clear', (req, res) => {
  Object.values(stations).forEach(s => {
    s.metrics = { bufferUsage: 0, avgLatency: 0, jitter: 0, packetsReceived: 0, packetsSent: 0, packetsDropped: 0, bytesReceived: 0, lastUpdate: Date.now() };
  });
  res.json({ success: true });
});

app.get('/api/monitoring/stations', (req, res) => {
  res.json(stations);
});

app.get('/api/monitoring/stations/:stationId', (req, res) => {
  const station = stations[req.params.stationId];
  if (!station) {
    return res.status(404).json({ error: 'Station not found' });
  }
  res.json(station);
});

app.get('/api/monitoring/test-generator/status', (req, res) => {
  res.json(audioGenerator.getStatus());
});

app.post('/api/monitoring/test-generator/packet', (req, res) => {
  try {
    const { frequency = 1000, sampleRate = 16000, gain = 1.0 } = req.body;
    const packet = audioGenerator.generatePacket(frequency, sampleRate, gain);

    res.json({
      success: true,
      size: packet.length,
      frequency,
      sampleRate,
      gain
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/monitoring/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    stations: Object.keys(stations).length,
    activeStations: Object.values(stations).filter(s => s.active).length,
    activeOptimizations: Object.keys(activeOptimizations).filter(id => activeOptimizations[id].status === 'running').length
  });
});

// =========================================
// REAL-TIME METRICS UPDATES
// =========================================

setInterval(() => {
  Object.keys(stations).forEach(stationId => {
    const station = stations[stationId];

    // Simulate metrics changes
    station.metrics.bufferUsage = Math.max(0, Math.min(100, station.metrics.bufferUsage + (Math.random() - 0.5) * 10));
    station.metrics.avgLatency = Math.max(0, station.metrics.avgLatency + (Math.random() - 0.5) * 5);
    station.metrics.jitter = Math.max(0, station.metrics.jitter + (Math.random() - 0.5) * 3);
    station.metrics.lastUpdate = Date.now();

    // Emit update to all connected clients
    io.emit('station-update', { stationId, metrics: station.metrics });
  });
}, 1000);

// =========================================
// SERVER STARTUP
// =========================================

server.listen(PORT, () => {
  console.log(`[Monitoring Server] Running on port ${PORT}`);
  console.log(`[Monitoring Server] Dashboard: http://localhost:${PORT}/monitoring-tree-dashboard.html`);
  console.log(`[Monitoring Server] Calibration: http://localhost:${PORT}/calibration-dashboard.html`);
  console.log(`[Monitoring Server] WebSocket ready for connections`);
  console.log(`[Monitoring Server] Stations initialized: ${Object.keys(stations).length}`);
  console.log(`[Monitoring Server] AI Calibration: ${process.env.OPENAI_API_KEY ? 'ENABLED' : 'DISABLED (mock mode)'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Monitoring Server] Shutting down gracefully...');

  // Stop all logging
  Object.keys(logManagers).forEach(stationId => {
    if (logManagers[stationId].isLogging(stationId)) {
      logManagers[stationId].stopLogging(stationId);
    }
  });

  // Stop all recordings
  Object.keys(wavRecorders).forEach(stationId => {
    if (wavRecorders[stationId].isRecording(stationId)) {
      wavRecorders[stationId].stopRecording(stationId);
    }
  });

  server.close(() => {
    console.log('[Monitoring Server] Stopped');
    process.exit(0);
  });
});
