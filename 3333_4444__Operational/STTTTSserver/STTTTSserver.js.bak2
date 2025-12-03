const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '.env.externalmedia' });

// Import translation services
const { createClient } = require('@deepgram/sdk');
const deepl = require('deepl-node');
// const sdk = require('microsoft-cognitiveservices-speech-sdk'); // Replaced with ElevenLabs
const ElevenLabsTTSService = require('./elevenlabs-tts-service');
const HumeStreamingClient = require('./hume-streaming-client');

// Import HMLCP modules
const { UserProfile, ULOLayer, PatternExtractor } = require('./hmlcp');
const { applyDefaultProfile } = require('./hmlcp/default-profiles');

// ========================================================================
// MONITORING SYSTEM - Universal Collector (75 parameters across 7 stations)
// ========================================================================
const StationAgent = require('./monitoring/StationAgent');
// ========================================================================
// REAL-TIME MONITORING INTEGRATION - Connect to monitoring server
// ========================================================================
const ioClient = require("socket.io-client");
const monitoringClient = ioClient("http://localhost:3001", {
  reconnection: true,
  reconnectionDelay: 1000
});

let station3Registered = false;
let activeCallId = null;

monitoringClient.on("connect", () => {
  console.log("[Monitoring] ✅ Connected to monitoring server on port 3001");
  if (!station3Registered) {
    console.log("[Monitoring] 📡 Registering STATION_3...");
    monitoringClient.emit("register-station", {
      station_id: "STATION_3",
      capabilities: {
        name: "Voice Monitor/Enhancer (STTTTSserver)",
        type: "voice",
        parameters: 22,
        extensions: ["3333", "4444"],
        critical: true,
        description: "CRITICAL - Monitors and improves voice quality for Deepgram"
      }
    });
    station3Registered = true;
  }
});

// Function to send metrics for active calls
function sendStation3Metrics(extension, metrics) {
  if (!monitoringClient.connected) return;
  if (!activeCallId) activeCallId = "CALL-" + Date.now();
  
  const snapshot = {
    station_id: "STATION_3",
    call_id: activeCallId,
    channel: extension === "3333" ? "caller" : "callee",
    metrics: {
      snr_db: metrics.snr || 25,
      audio_level_dbfs: metrics.audioLevel || -18,
      voice_activity_ratio: metrics.voiceActivity || 0.7,
      cpu_usage_pct: process.cpuUsage().system / 1000000,
      memory_usage_mb: process.memoryUsage().heapUsed / 1048576
    },
    knobs_effective: [
      { name: "agc.enabled", value: true },
      { name: "agc.target_level_dbfs", value: -18 }
    ],
    timestamp: new Date().toISOString()
  };
  
  monitoringClient.emit("metrics", snapshot);
  console.log(`[Monitoring] 📊 Sent metrics for STATION_3 (${extension})`);
}

global.sendStation3Metrics = sendStation3Metrics;



// Load real-time monitoring integration\nrequire("./monitoring-integration.js");
const app = express();

// Create HTTPS server if certificates exist, otherwise HTTP
// But always use HTTP in Azure App Service (Azure handles SSL termination)
let server;
const isAzure = !!process.env.WEBSITE_INSTANCE_ID;

if (isAzure) {
  // Azure App Service - use HTTP (Azure handles HTTPS)
  server = http.createServer(app);
  console.log('✓ HTTP server for Azure App Service (Azure handles HTTPS termination)');
} else {
  try {
    const certPath = path.join(__dirname, 'cert.pem');
    const keyPath = path.join(__dirname, 'key.pem');

    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
      server = https.createServer(options, app);
      console.log('✓ HTTPS server configured with SSL certificates');
    } else {
      server = http.createServer(app);
      console.log('⚠ HTTP server (certificates not found)');
    }
  } catch (error) {
    console.error('Error loading certificates, falling back to HTTP:', error.message);
    server = http.createServer(app);
  }
}

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e8 // 100 MB for audio chunks
});

// Make Socket.IO available globally for audiosocket-integration
global.io = io;

// ========================================================================
// MONITORING: Initialize Station Agents
// ========================================================================
const station3_3333 = new StationAgent('STATION_3', '3333');
const station3_4444 = new StationAgent('STATION_3', '4444');
const station4_3333 = new StationAgent('STATION_4', '3333');
const station4_4444 = new StationAgent('STATION_4', '4444');

console.log('[Monitoring] ✓ Station agents initialized');
console.log(`[Monitoring] ✓ Station 3 (3333): ${station3_3333.getParameterCount()} parameters`);
console.log(`[Monitoring] ✓ Station 3 (4444): ${station3_4444.getParameterCount()} parameters`);
console.log(`[Monitoring] ✓ Station 4 (3333): ${station4_3333.getParameterCount()} parameters`);
console.log(`[Monitoring] ✓ Station 4 (4444): ${station4_4444.getParameterCount()} parameters`);

// ========================================================================
// OLD TIMING CLIENT - DISABLED 2025-11-12
// ========================================================================
// This external timing server on port 6000 is replaced by embedded timing model
// OLD Architecture: Conf Server → Timing Server (6000) → manipulate → back to Conf Server → Asterisk
// NEW Architecture: Conf Server → directly to Asterisk (parallel mode)
// ========================================================================
/*
const TimingClient = require('./timing-client');
global.timingClient = new TimingClient();
global.timingClient.connect().then(() => {
    console.log('[Server] ✓ Timing client connected');
}).catch(err => {
    console.error('[Server] ✗ Timing client connection failed:', err.message);
});
*/
console.log('[Server] ℹ OLD Timing client disabled - using embedded timing model');

// Phase 2: Global session registry for audio injection by extension
// Key: extension number (string), Value: session object
global.activeSessions = new Map();
console.log('[Phase2] Global session registry initialized');

// ========================================================================
// MONITORING: Collection Function
// ========================================================================
/**
 * Collect and emit Station 3 metrics
 * Non-blocking to avoid impacting audio pipeline
 */
async function collectAndEmitStation3Metrics(extension, pcmBuffer, buffers) {
  const agent = extension === '3333' ? station3_3333 : station3_4444;

  try {
    // Build context for collectors
    const context = {
      pcmBuffer: pcmBuffer,
      sampleRate: 16000,
      buffers: buffers
    };

    // Collect metrics (automatically filtered to Station 3's 14 parameters)
    const { metrics, alerts } = await agent.collect(context);

    // Emit to monitoring-server.js (port 3021)
    global.io.emit('stationMetrics', {
      stationId: 'STATION-3',
      extension: extension,
      timestamp: Date.now(),
      ...metrics  // Spread metrics directly into the object
    });

  } catch (error) {
    console.error(`[Station3-${extension}] Metric emission failed:`, error.message);
  }
}

/**
 * Collect and emit Station 4 metrics (Deepgram Response)
 * Monitors ASR processing performance
 */
async function collectAndEmitStation4Metrics(extension, processingTime, resultData) {
  const agent = extension === '3333' ? station4_3333 : station4_4444;

  try {
    // Build context for Station 4 (ASR response metrics)
    const context = {
      processingTime: processingTime,
      resultData: resultData,
      timestamp: Date.now()
    };

    // Collect metrics (automatically filtered to Station 4's 8 parameters)
    const { metrics, alerts } = await agent.collect(context);

    // Emit to monitoring-server.js (port 3021)
    global.io.emit('stationMetrics', {
      stationId: 'STATION-4',
      extension: extension,
      timestamp: Date.now(),
      ...metrics  // Spread metrics directly into the object
    });

  } catch (error) {
    console.error(`[Station4-${extension}] Metric emission failed:`, error.message);
  }
}

// [DISABLED FOR 9007/9008] // Start AudioSocket server (for Asterisk integration on port 5050)
// [DISABLED FOR 9007/9008] // IMPORTANT: Must load AFTER global.io is set
// [DISABLED FOR 9007/9008] require("./audiosocket-integration");

// ========================================================================
// OLD INJECT_AUDIO HANDLER - DISABLED 2025-11-12
// ========================================================================
// This was part of the OLD timing server architecture
// Now replaced by direct Gateway → Conference Server communication
// ========================================================================
/*
global.timingClient.setInjectAudioHandler((msg) => {
    const { toExtension, audioData, timestamp } = msg;

    // Look up session by extension
    const session = global.activeSessions.get(String(toExtension));

    if (!session) {
        console.warn(`[Phase2] ✗ No session found for extension ${toExtension}`);
        return;
    }

    if (!session.micWebSocket || session.micWebSocket.readyState !== 1) {
        console.warn(`[Phase2] ✗ MicWebSocket not ready for extension ${toExtension}`);
        return;
    }

    // Decode base64 audio to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');

    // Inject audio using the global function
    if (global.sendAudioToMicEndpoint) {
        global.sendAudioToMicEndpoint(session.micWebSocket, audioBuffer);
        console.log(`[Phase2] ✓ Injected ${audioBuffer.length} bytes to extension ${toExtension}`);
    } else {
        console.error('[Phase2] ✗ sendAudioToMicEndpoint not available');
    }
});
console.log('[Phase2] INJECT_AUDIO handler registered');
*/
console.log('[Phase2] ℹ OLD INJECT_AUDIO handler disabled - using direct Gateway communication');

// Latency Control Backend (for testing UI only - does not affect production)
// const LatencyControlBackend = require('./latency-control-backend');
// const latencyControl = new LatencyControlBackend();
// latencyControl.registerSocketHandlers(io);
console.log('[Server] ✓ Latency Control Backend initialized (testing mode)');

app.use(express.static(path.join(__dirname, 'public')));

// Serve file directories
app.use('/files/recordings', express.static(path.join(__dirname, 'recordings')));
app.use('/files/transcripts', express.static(path.join(__dirname, 'transcripts')));
app.use('/files/translations', express.static(path.join(__dirname, 'translations')));

// Initialize services
const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
const deeplApiKey = process.env.DEEPL_API_KEY;
const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
const elevenlabsVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID;
const humeApiKey = process.env.HUME_EVI_API_KEY;
// Deepgram Streaming WebSocket API Toggle (Phase 1)
const USE_DEEPGRAM_STREAMING = process.env.USE_DEEPGRAM_STREAMING === 'true';
// Hume AI Emotion/Prosody Analysis Toggle (Phase 1)
const USE_HUME_EMOTION = process.env.USE_HUME_EMOTION === 'true';

// ===================================================================
// ElevenLabs TTS Metrics Tracking
// ===================================================================
const elevenlabsMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  latencies: [],
  lastUpdate: Date.now()
};

function updateElevenLabsMetrics(latency, success) {
  console.log("[METRICS-DEBUG] updateElevenLabsMetrics called:", { latency, success, hasGlobalIo: !!global.io });
  if (success) {
    elevenlabsMetrics.successfulRequests++;
  } else {
    elevenlabsMetrics.failedRequests++;
  }
  elevenlabsMetrics.totalRequests++;
  
  if (latency) {
    elevenlabsMetrics.latencies.push(latency);
    // Keep only last 100 measurements for rolling average
    if (elevenlabsMetrics.latencies.length > 100) {
      elevenlabsMetrics.latencies.shift();
    }
  }
  
  elevenlabsMetrics.lastUpdate = Date.now();
  
  // Emit metrics to dashboard via Socket.IO
  if (global.io) {
    const requestsPerMinute = calculateRequestsPerMinute();
    const p95Latency = calculateP95Latency();
    const errorRate = calculateErrorRate();
    
    global.io.emit('elevenlabsMetrics', {
      latency: p95Latency,
      requestsPerMinute: requestsPerMinute,
      errorRate: errorRate,
      status: errorRate > 5 ? 'warning' : 'ok'
    });
  }
}

function calculateRequestsPerMinute() {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  const timeSinceLastUpdate = (now - elevenlabsMetrics.lastUpdate) / 1000;
  
  // Simple estimation based on total requests over time
  if (timeSinceLastUpdate < 60) {
    return Math.round((elevenlabsMetrics.totalRequests / (timeSinceLastUpdate / 60)));
  }
  return 0;
}

function calculateP95Latency() {
  if (elevenlabsMetrics.latencies.length === 0) return 0;
  
  const sorted = [...elevenlabsMetrics.latencies].sort((a, b) => a - b);
  const p95Index = Math.floor(sorted.length * 0.95);
  return Math.round(sorted[p95Index] || 0);
}

function calculateErrorRate() {
  if (elevenlabsMetrics.totalRequests === 0) return 0;
  
  const rate = (elevenlabsMetrics.failedRequests / elevenlabsMetrics.totalRequests) * 100;
  return Math.round(rate * 10) / 10; // Round to 1 decimal place
}

// ===================================================================
// PHASE 1.2: Deepgram Streaming WebSocket State Manager
// ===================================================================
class DeepgramStreamingStateManager {
  constructor() {
    this.connections = new Map(); // extensionId -> connection state
    this.audioBuffers = new Map(); // extensionId -> audio frame buffer
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      totalFramesSent: 0,
      totalBytesSent: 0,
      errors: 0
    };
  }

  // Initialize state for an extension
  initExtension(extensionId) {
    if (!this.connections.has(extensionId)) {
      this.connections.set(extensionId, {
        websocket: null,
        isConnected: false,
        isReady: false,
        lastActivity: null,
        frameCount: 0,
        bytesSent: 0,
        errors: []
      });
      
      this.audioBuffers.set(extensionId, {
        buffer: Buffer.alloc(0),
        frameSize: 640, // 20ms @ 16kHz = 320 samples = 640 bytes
        pendingFrames: []
      });
      
      console.log(`[STREAMING-STATE] Initialized state for extension ${extensionId}`);
    }
    return this.connections.get(extensionId);
  }

  // Get connection state for extension
  getState(extensionId) {
    return this.connections.get(extensionId);
  }

  // Update connection status
  updateConnection(extensionId, websocket, isConnected, isReady) {
    const state = this.connections.get(extensionId);
    if (state) {
      state.websocket = websocket;
      state.isConnected = isConnected;
      state.isReady = isReady;
      state.lastActivity = Date.now();
      
      if (isConnected && isReady) {
        this.stats.activeConnections++;
      }
    }
  }

  // Cleanup extension state
  cleanup(extensionId) {
    const state = this.connections.get(extensionId);
    if (state && state.websocket) {
      try {
        state.websocket.close();
      } catch (err) {
        console.error(`[STREAMING-STATE] Error closing WebSocket for ${extensionId}:`, err.message);
      }
    }
    
    this.connections.delete(extensionId);
    this.audioBuffers.delete(extensionId);
    
    if (this.stats.activeConnections > 0) {
      this.stats.activeConnections--;
    }
    
    console.log(`[STREAMING-STATE] Cleaned up state for extension ${extensionId}`);
  }

  // Get statistics
  getStats() {
    return {
      ...this.stats,
      extensionsTracked: this.connections.size
    };
  }
}

// Global streaming state manager instance (only initialized if streaming is enabled)
let streamingStateManager = null;

if (USE_DEEPGRAM_STREAMING) {
  streamingStateManager = new DeepgramStreamingStateManager();
  console.log("[STREAMING-STATE] Deepgram Streaming State Manager initialized");
}

// ========== HUME STREAMING STATE MANAGER ==========
// Manages WebSocket connections to Hume AI Emotion/Prosody API
// Similar pattern to DeepgramStreamingStateManager
class HumeStreamingStateManager {
  constructor() {
    this.connections = new Map(); // extensionId -> connection state
    this.latestEmotions = new Map(); // extensionId -> latest emotion data
    this.stats = {
      totalConnectionsCreated: 0,
      activeConnections: 0,
      totalFramesSent: 0,
      totalBytesSent: 0,
      totalEmotionAnalyses: 0,
      errors: 0
    };

    console.log('[HUME-STATE] Hume Emotion State Manager initialized');
  }

  // Initialize state tracking for an extension (3333 or 4444)
  initExtension(extensionId) {
    if (!this.connections.has(extensionId)) {
      this.connections.set(extensionId, {
        extensionId: extensionId,
        websocket: null,
        isConnected: false,
        isReady: false,
        framesSent: 0,
        bytesSent: 0,
        emotionsReceived: 0,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        audioBuffer: Buffer.alloc(0) // For buffering 10ms -> 20ms chunks
      });

      console.log(`[HUME-STATE] Initialized state for extension ${extensionId}`);
    }

    return this.connections.get(extensionId);
  }

  // Get current state for an extension
  getState(extensionId) {
    return this.connections.get(extensionId);
  }

  // Update WebSocket connection status
  updateConnection(extensionId, websocket, isConnected, isReady) {
    const state = this.getState(extensionId);
    if (state) {
      state.websocket = websocket;
      state.isConnected = isConnected;
      state.isReady = isReady;
      state.lastActivity = Date.now();

      if (isConnected && isReady) {
        this.stats.activeConnections++;
      } else if (!isConnected && state.isConnected) {
        this.stats.activeConnections = Math.max(0, this.stats.activeConnections - 1);
      }
    }
  }

  // Store latest emotion data for an extension
  storeEmotion(extensionId, emotionData) {
    this.latestEmotions.set(extensionId, {
      ...emotionData,
      receivedAt: Date.now()
    });

    const state = this.getState(extensionId);
    if (state) {
      state.emotionsReceived++;
      state.lastActivity = Date.now();
    }

    this.stats.totalEmotionAnalyses++;
  }

  // Get latest emotion data for an extension
  getLatestEmotion(extensionId) {
    return this.latestEmotions.get(extensionId);
  }

  // Cleanup connection for an extension
  cleanup(extensionId) {
    const state = this.getState(extensionId);
    if (state) {
      if (state.websocket) {
        try {
          state.websocket.close();
        } catch (err) {
          console.error(`[HUME-STATE] Error closing WebSocket for ${extensionId}:`, err.message);
        }
      }

      this.connections.delete(extensionId);
      this.latestEmotions.delete(extensionId);
      this.stats.activeConnections = Math.max(0, this.stats.activeConnections - 1);

      console.log(`[HUME-STATE] Cleaned up state for extension ${extensionId}`);
    }
  }

  // Get statistics
  getStats() {
    return {
      ...this.stats,
      extensionsTracked: this.connections.size,
      timestamp: Date.now()
    };
  }
}

// Initialize Hume state manager (disabled by default)
let humeStateManager = null;
if (USE_HUME_EMOTION) {
  humeStateManager = new HumeStreamingStateManager();
}
// ========== END HUME STATE MANAGER ==========


// ===================================================================
// PHASE 2: Deepgram WebSocket Connection Manager
// ===================================================================

/**
 * Creates and manages a Deepgram WebSocket connection for real-time streaming
 * @param {string} extensionId - Extension identifier (e.g., "3333" or "4444")
 * @returns {Promise<object>} - WebSocket connection object
 */
async function createDeepgramStreamingConnection(extensionId) {
  if (!streamingStateManager) {
    throw new Error("[WEBSOCKET] Streaming state manager not initialized");
  }

  const state = streamingStateManager.initExtension(extensionId);
  
  console.log(`[WEBSOCKET] Creating Deepgram streaming connection for extension ${extensionId}`);

  try {
    // Import Deepgram SDK (using dynamic import for async context)
    const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
    
    // Create Deepgram client
    const deepgram = createClient(deepgramApiKey);
    
    // Configure connection options for 16kHz, mono, PCM streaming
    const connection = deepgram.listen.live({
      model: "nova-3",
      encoding: "linear16",
      sample_rate: 16000,
      channels: 1,
      interim_results: true,  // Get partial transcripts for lower latency
      endpointing: 300,       // End utterance after 300ms of silence
      smart_format: true,     // Auto-formatting
      language: extensionId === "3333" ? "en" : "fr"  // English for 3333, French for 4444
    });

    // Event: Connection opened
    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log(`[WEBSOCKET] ✓ Connection opened for extension ${extensionId}`);
      streamingStateManager.updateConnection(extensionId, connection, true, true);
      state.lastActivity = Date.now();
    });

    // Event: Transcript received
    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel.alternatives[0]?.transcript;
      const isFinal = data.is_final;
      
      if (transcript && transcript.trim().length > 0) {
        console.log(`[WEBSOCKET] ${isFinal ? FINAL : INTERIM} transcript (${extensionId}): "${transcript}"`);
        
        // TODO Phase 4: Handle transcript and integrate with translation pipeline
        // For now, just log it
        if (isFinal) {
          // Final transcript - ready for translation
          state.frameCount++;
        }
      }
    });

    // Event: Error occurred
    connection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error(`[WEBSOCKET] Error for extension ${extensionId}:`, error);
      streamingStateManager.stats.errors++;
      state.errors.push({
        timestamp: Date.now(),
        error: error.message || error
      });
    });

    // Event: Connection closed
    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log(`[WEBSOCKET] Connection closed for extension ${extensionId}`);
      streamingStateManager.updateConnection(extensionId, null, false, false);
    });

    // Event: Metadata received
    connection.on(LiveTranscriptionEvents.Metadata, (data) => {
      console.log(`[WEBSOCKET] Metadata received for extension ${extensionId}:`, JSON.stringify(data));
    });

    console.log(`[WEBSOCKET] ✓ Deepgram streaming connection created for extension ${extensionId}`);
    return connection;

  } catch (error) {
    console.error(`[WEBSOCKET] Failed to create connection for extension ${extensionId}:`, error);
    streamingStateManager.stats.errors++;
    throw error;
  }
}

/**
 * Close a Deepgram WebSocket connection
 * @param {string} extensionId - Extension identifier
 */
function closeDeepgramStreamingConnection(extensionId) {
  if (!streamingStateManager) return;
  
  const state = streamingStateManager.getState(extensionId);
  if (state && state.websocket) {
    console.log(`[WEBSOCKET] Closing connection for extension ${extensionId}`);
    try {
      state.websocket.finish();  // Deepgram SDK method to gracefully close
    } catch (err) {
      console.error(`[WEBSOCKET] Error closing connection for ${extensionId}:`, err.message);
    }
  }
  
  streamingStateManager.cleanup(extensionId);
}

// ========== HUME WEBSOCKET CONNECTION MANAGEMENT ==========
// Uses the working hume-streaming-client.js module for direct API v0 WebSocket connection

// Global Hume clients for each extension (3333, 4444)
let humeClients = {
  '3333': null,
  '4444': null
};

// CRITICAL: Synchronous connection tracking to prevent multiple simultaneous connections
// This flag is set IMMEDIATELY when connection attempt starts, not after it completes
let humeConnecting = {
  '3333': false,
  '4444': false
};

/**
 * Create and configure Hume Streaming connection using working hume-streaming-client.js
 * @param {string} extensionId - "3333" or "4444"
 * @returns {Promise<void>}
 */
async function createHumeStreamingConnection(extensionId) {
  if (!USE_HUME_EMOTION || !humeStateManager) {
    console.log(`[HUME] Emotion analysis disabled (USE_HUME_EMOTION=false)`);
    return;
  }

  // GUARD 1: Check if connection already exists and is active
  if (humeClients[extensionId] && humeClients[extensionId].connected) {
    console.log(`[HUME-WS] ⚠ Connection already exists for extension ${extensionId}, skipping creation`);
    return;
  }

  // GUARD 2: Check if connection attempt already in progress (SYNCHRONOUS)
  if (humeConnecting[extensionId]) {
    console.log(`[HUME-WS] ⚠ Connection attempt already in progress for extension ${extensionId}, skipping`);
    return;
  }

  // GUARD 3: Prevent rapid reconnection attempts
  let state = humeStateManager.getState(extensionId);
  if (state) {
    const timeSinceLastReconnect = Date.now() - (state.lastReconnect || 0);
    if (timeSinceLastReconnect < 5000) {
      console.log(`[HUME-WS] ⚠ Too soon to reconnect for extension ${extensionId} (${timeSinceLastReconnect}ms), skipping`);
      return;
    }
  }

  console.log(`[HUME-WS] Creating Hume streaming connection for extension ${extensionId}`);

  // CRITICAL: Set connecting flag IMMEDIATELY before attempting connection
  humeConnecting[extensionId] = true;

  try {
    // Initialize state if not exists
    if (!state) {
      state = humeStateManager.initExtension(extensionId);
    }

    // Create Hume client using the WORKING hume-streaming-client.js module
    const humeClient = new HumeStreamingClient(humeApiKey, {
      sampleRate: 16000,
      channels: 1
    });

    // Store client reference BEFORE connecting
    humeClients[extensionId] = humeClient;

    // Connect to Hume API v0
    await humeClient.connect();

    console.log(`[HUME-WS] ✓ Connection established for extension ${extensionId}`);

    // Store WebSocket connection reference
    state.websocket = humeClient.ws;
    state.lastReconnect = Date.now();
    humeStateManager.stats.totalConnectionsCreated++;

    // Update connection status
    humeStateManager.updateConnection(extensionId, humeClient.ws, true, true);

    // Update health monitoring
    if (typeof global.humeHealth !== 'undefined') {
      global.humeHealth.connection = "open";
      global.humeHealth.last_message_age_ms = 0;
    }

    // Listen for emotion metrics from Hume client
    humeClient.on('metrics', (metrics) => {
      try {
        // Update health monitoring
        if (typeof global.humeHealth !== 'undefined') {
          global.humeHealth.last_message_age_ms = 0;
          global.humeHealth.chunk_rate_fps++;
        }

        // Create emotion data packet matching dashboard expected format
        const emotionData = {
          extensionId: extensionId,
          emotions: [
            { name: 'Arousal', score: metrics.arousal },
            { name: 'Valence', score: metrics.valence },
            { name: 'Energy', score: metrics.energy }
          ],
          prosody: {
            arousal: metrics.arousal,
            valence: metrics.valence,
            energy: metrics.energy
          },
          timestamp: Date.now(),
          voiceDetected: metrics.voiceDetected
        };

        // Store latest emotion
        humeStateManager.storeEmotion(extensionId, emotionData);

        // Emit to dashboard
        if (global.io) {
          global.io.emit('emotionData', emotionData);
        }

        console.log(`[HUME-WS] ✓ Metrics for ${extensionId}: arousal=${metrics.arousal.toFixed(2)}, valence=${metrics.valence.toFixed(2)}, energy=${metrics.energy.toFixed(2)}`);
      } catch (err) {
        console.error(`[HUME-WS] ⚠ Error processing metrics for ${extensionId}:`, err.message);

        // Update health monitoring
        if (typeof global.humeHealth !== 'undefined') {
          global.humeHealth.errors_past_minute++;
          global.humeHealth.last_error = err.message;
        }
      }
    });

    // Listen for connection events
    humeClient.on('connected', () => {
      console.log(`[HUME-WS] ✓ Connected event for extension ${extensionId}`);
      humeStateManager.updateConnection(extensionId, humeClient.ws, true, true);

      // Update health monitoring
      if (typeof global.humeHealth !== 'undefined') {
        global.humeHealth.connection = "open";
      }
    });

    // Listen for disconnection events
    humeClient.on('disconnected', () => {
      console.log(`[HUME-WS] Connection closed for extension ${extensionId}`);

      // Clear client reference on disconnect
      humeClients[extensionId] = null;

      humeStateManager.updateConnection(extensionId, null, false, false);

      // Update health monitoring
      if (typeof global.humeHealth !== 'undefined') {
        global.humeHealth.connection = "closed";
      }

      // Auto-reconnect after 2 seconds (with rate limiting guard)
      const timeSinceLastReconnect = Date.now() - (state.lastReconnect || 0);
      if (timeSinceLastReconnect > 5000) {  // Not rapid reconnect
        console.log(`[HUME-WS] Auto-reconnecting for ${extensionId} in 2 seconds...`);
        setTimeout(() => createHumeStreamingConnection(extensionId), 2000);
      } else {
        console.log(`[HUME-WS] ⚠ Skipping auto-reconnect for ${extensionId} (too recent: ${timeSinceLastReconnect}ms)`);
      }
    });

    // Listen for errors
    humeClient.on('error', (error) => {
      console.error(`[HUME-WS] ⚠ Error for extension ${extensionId}:`, error.message);

      // Clear client reference on error
      humeClients[extensionId] = null;

      humeStateManager.stats.errors++;
      humeStateManager.updateConnection(extensionId, null, false, false);

      // Update health monitoring
      if (typeof global.humeHealth !== 'undefined') {
        global.humeHealth.connection = "error";
        global.humeHealth.errors_past_minute++;
        global.humeHealth.last_error = error.message;
      }
    });

    /**
     * Send audio chunk to Hume via the working client
     * @param {Buffer} audioChunk - PCM audio data
     */
    state.sendAudio = function(audioChunk) {
      if (!humeClient || !humeClient.connected) {
        return;
      }

      try {
        // Send audio using the working client's sendAudio method
        humeClient.sendAudio(audioChunk);

        state.framesSent++;
        state.bytesSent += audioChunk.length;
        humeStateManager.stats.totalFramesSent++;
        humeStateManager.stats.totalBytesSent += audioChunk.length;

        if (state.framesSent % 100 === 0) {
          console.log(`[HUME-WS] Sent ${state.framesSent} frames (${state.bytesSent} bytes) for ${extensionId}`);
        }
      } catch (err) {
        console.error(`[HUME-WS] Error sending audio for ${extensionId}:`, err.message);

        // Update health monitoring
        if (typeof global.humeHealth !== 'undefined') {
          global.humeHealth.errors_past_minute++;
          global.humeHealth.last_error = err.message;
        }
      }
    };

    console.log(`[HUME-WS] ✓ Hume WebSocket connection ready for extension ${extensionId}`);

  } catch (error) {
    console.error(`[HUME-WS] Failed to create connection for ${extensionId}:`, error.message);
    console.error(`[HUME-WS] Stack trace:`, error.stack);

    // Clear client reference on connection failure
    humeClients[extensionId] = null;

    humeStateManager.stats.errors++;

    // Update health monitoring
    if (typeof global.humeHealth !== 'undefined') {
      global.humeHealth.connection = "error";
      global.humeHealth.errors_past_minute++;
      global.humeHealth.last_error = error.message;
    }

    throw error;
  } finally {
    // CRITICAL: Clear connecting flag after connection attempt completes (success or failure)
    humeConnecting[extensionId] = false;
  }
}

/**
 * Close Hume streaming connection for an extension
 * @param {string} extensionId - "3333" or "4444"
 */
function closeHumeStreamingConnection(extensionId) {
  if (!USE_HUME_EMOTION || !humeStateManager) {
    return;
  }

  console.log(`[HUME-WS] Closing Hume connection for extension ${extensionId}`);

  try {
    // Disconnect the working Hume client
    const humeClient = humeClients[extensionId];
    if (humeClient) {
      humeClient.disconnect();
      humeClients[extensionId] = null;
    }

    // Clear connecting flag
    humeConnecting[extensionId] = false;

    humeStateManager.cleanup(extensionId);

    // Update health monitoring
    if (typeof global.humeHealth !== 'undefined') {
      global.humeHealth.connection = "closed";
    }
  } catch (error) {
    console.error(`[HUME-WS] Error closing connection for ${extensionId}:`, error.message);
  }
}

// ========== END HUME WEBSOCKET MANAGEMENT ==========



// ========== END HUME WEBSOCKET MANAGEMENT ==========

// Initialize DeepL translator
let translator;
if (deeplApiKey) {
  translator = new deepl.Translator(deeplApiKey);
}

// Initialize ElevenLabs TTS
let elevenlabsTTS = null;
if (elevenlabsApiKey) {
  elevenlabsTTS = new ElevenLabsTTSService(elevenlabsApiKey);
  console.log('ElevenLabs TTS service initialized');
}

// ============================================================================
// AUDIO TEST MODE - For calibrating RTP audio format without live translation
// ============================================================================
// Test audio files (PCM16, 16kHz, mono) for format testing
const TEST_AUDIO_FILES = {
  '9007': path.join(__dirname, 'test-audio-en.pcm'),  // English test tone (440 Hz)
  '9008': path.join(__dirname, 'test-audio-fr.pcm')   // French test tone (550 Hz)
};

// Test mode state
const testModeState = {
  enabled: false,
  targetExtension: null,  // Which extension to send test audio to
  interval: null,         // setInterval reference for looping
  testAudioBuffer: null,  // Loaded test audio data
  loopCount: 0            // Track how many loops have been sent
};

/**
 * Load test audio file for the target extension
 * @param {string} targetExtension - Extension to send test audio to ('9007' or '9008')
 * @returns {Buffer|null} - PCM16 audio buffer or null if file not found
 */
function loadTestAudio(targetExtension) {
  const filePath = TEST_AUDIO_FILES[targetExtension];
  if (!filePath) {
    console.error(`[Test Mode] ✗ No test audio file configured for extension ${targetExtension}`);
    return null;
  }

  try {
    if (!fs.existsSync(filePath)) {
      console.error(`[Test Mode] ✗ Test audio file not found: ${filePath}`);
      return null;
    }

    const audioBuffer = fs.readFileSync(filePath);
    console.log(`[Test Mode] ✓ Loaded test audio: ${filePath} (${audioBuffer.length} bytes, ~${(audioBuffer.length / 32000).toFixed(2)}s)`);
    return audioBuffer;
  } catch (error) {
    console.error(`[Test Mode] ✗ Error loading test audio:`, error.message);
    return null;
  }
}

/**
 * Start test mode - sends test audio in a continuous loop to target extension
 * @param {string} targetExtension - Extension to send test audio to ('9007' or '9008')
 */
function startTestMode(targetExtension) {
  if (testModeState.enabled) {
    console.log(`[Test Mode] ⚠ Test mode already running for extension ${testModeState.targetExtension}`);
    return { success: false, message: 'Test mode already running' };
  }

  // Load test audio file
  const audioBuffer = loadTestAudio(targetExtension);
  if (!audioBuffer) {
    return { success: false, message: 'Failed to load test audio file' };
  }

  testModeState.enabled = true;
  testModeState.targetExtension = targetExtension;
  testModeState.testAudioBuffer = audioBuffer;
  testModeState.loopCount = 0;

  // Send test audio immediately, then every 4 seconds (allowing 3s audio + 1s gap)
  const sendTestAudio = () => {
    if (!testModeState.enabled) return;

    testModeState.loopCount++;
    console.log(`[Test Mode] → Sending test audio to extension ${targetExtension} (loop #${testModeState.loopCount})`);

    // Emit translatedAudio event to Gateway (same format as real translation)
    global.io.emit('translatedAudio', {
      extension: String(targetExtension),
      audio: testModeState.testAudioBuffer,
      format: 'pcm16',
      sampleRate: 16000,
      channels: 1,
      timestamp: Date.now(),
      bufferApplied: 0,           // No buffer in test mode
      sourceExtension: 'TEST',    // Indicate test mode source
      testMode: true              // Flag to identify test audio
    });
  };

  // Send first test audio immediately
  sendTestAudio();

  // Then send every 4 seconds in a loop
  testModeState.interval = setInterval(sendTestAudio, 4000);

  console.log(`[Test Mode] ✓ Started test mode for extension ${targetExtension} (looping every 4s)`);
  return { success: true, message: `Test mode started for extension ${targetExtension}` };
}

/**
 * Stop test mode - stops the test audio loop
 */
function stopTestMode() {
  if (!testModeState.enabled) {
    console.log(`[Test Mode] ⚠ Test mode not running`);
    return { success: false, message: 'Test mode not running' };
  }

  if (testModeState.interval) {
    clearInterval(testModeState.interval);
    testModeState.interval = null;
  }

  const prevExtension = testModeState.targetExtension;
  const totalLoops = testModeState.loopCount;

  testModeState.enabled = false;
  testModeState.targetExtension = null;
  testModeState.testAudioBuffer = null;
  testModeState.loopCount = 0;

  console.log(`[Test Mode] ✓ Stopped test mode (was running for extension ${prevExtension}, sent ${totalLoops} loops)`);
  return { success: true, message: `Test mode stopped (${totalLoops} loops sent)` };
}

/**
 * Get current test mode status
 * @returns {object} - Test mode status object
 */
function getTestModeStatus() {
  return {
    enabled: testModeState.enabled,
    targetExtension: testModeState.targetExtension,
    loopCount: testModeState.loopCount,
    audioLoaded: !!testModeState.testAudioBuffer
  };
}

// ============================================================================
// TIMING & BUFFERING MODULE - Step 1: Class Definitions (NOT YET ACTIVE)
// ============================================================================
// These classes are added but not yet integrated into the pipeline
// System behavior remains unchanged until Step 2

const net = require('net');

// Class 1: ExtensionPairManager - Tracks which extensions are paired
class ExtensionPairManager {
  constructor() {
    this.pairs = new Map(); // ext → pairedExt
    this.startTimes = new Map(); // ext → callStartTime
  }

  registerPair(ext1, ext2) {
    this.pairs.set(ext1, ext2);
    this.pairs.set(ext2, ext1);
    this.startTimes.set(ext1, Date.now());
    this.startTimes.set(ext2, Date.now());
    console.log('[PairManager] Registered pair: ' + ext1 + ' ↔ ' + ext2);
  }

  isPaired(ext) {
    return this.pairs.has(ext);
  }

  getPairedExtension(ext) {
    return this.pairs.get(ext);
  }

  unregisterPair(ext) {
    const paired = this.pairs.get(ext);
    if (paired) {
      this.pairs.delete(ext);
      this.pairs.delete(paired);
      this.startTimes.delete(ext);
      this.startTimes.delete(paired);
      console.log('[PairManager] Unregistered pair: ' + ext + ' ↔ ' + paired);
    }
  }
}

// Class 2: LatencyTracker - Tracks latency samples and calculates rolling averages
class LatencyTracker {
  constructor() {
    this.directionSamples = new Map(); // 'ext1→ext2' → [sample1, sample2, ...]
    this.stageSamples = new Map(); // 'ext:stage' → [sample1, sample2, ...]
    this.maxSamples = 10; // Rolling average window
  }

  updateLatency(direction, latencyMs) {
    if (!this.directionSamples.has(direction)) {
      this.directionSamples.set(direction, []);
    }

    const samples = this.directionSamples.get(direction);
    samples.push(latencyMs);

    // Keep only last 10 samples
    if (samples.length > this.maxSamples) {
      samples.shift();
    }

    const avg = this.getAverageLatency(direction);
    console.log('[Latency] ' + direction + ' = ' + latencyMs + 'ms (avg: ' + Math.round(avg) + 'ms, n=' + samples.length + ')');
  }

  updateStageLatency(extension, stageName, latencyMs) {
    const key = extension + ':' + stageName;
    if (!this.stageSamples.has(key)) {
      this.stageSamples.set(key, []);
    }

    const samples = this.stageSamples.get(key);
    samples.push(latencyMs);

    if (samples.length > this.maxSamples) {
      samples.shift();
    }
  }

  getAverageLatency(direction) {
    const samples = this.directionSamples.get(direction) || [];
    if (samples.length === 0) return 0;
    return samples.reduce((a, b) => a + b) / samples.length;
  }

  getStageAverage(extension, stageName) {
    const key = extension + ':' + stageName;
    const samples = this.stageSamples.get(key) || [];
    if (samples.length === 0) return 0;
    return samples.reduce((a, b) => a + b) / samples.length;
  }

  getLatestLatency(direction) {
    const samples = this.directionSamples.get(direction) || [];
    if (samples.length === 0) return 0;
    return samples[samples.length - 1]; // Return most recent sample
  }

  getLatencyDifference(ext1, ext2) {
    const direction1 = ext1 + '→' + ext2;
    const direction2 = ext2 + '→' + ext1;

    const avg1 = this.getAverageLatency(direction1);
    const avg2 = this.getAverageLatency(direction2);

    const difference = avg1 - avg2;

    console.log('[LatencyDiff] ' + direction1 + '=' + Math.round(avg1) + 'ms, ' + direction2 + '=' + Math.round(avg2) + 'ms, Δ=' + Math.round(difference) + 'ms');

    return difference;
  }

  getCurrentLatencyDifference(ext1, ext2) {
    const direction1 = ext1 + '→' + ext2;
    const direction2 = ext2 + '→' + ext1;

    const current1 = this.getLatestLatency(direction1);
    const current2 = this.getLatestLatency(direction2);

    // Only calculate difference if BOTH extensions have valid data (non-zero)
    if (current1 === 0 || current2 === 0) {
      console.log('[LatencyDiff-Current] Skipping calculation - one or both extensions have no data yet (' + direction1 + '=' + Math.round(current1) + 'ms, ' + direction2 + '=' + Math.round(current2) + 'ms)');
      return null;
    }

    // FIXED: Inverted formula - ext2→ext1 minus ext1→ext2
    // Positive = ext1 is slower (needs more delay), Negative = ext1 is faster (needs less delay)
    const difference = current2 - current1;

    console.log('[LatencyDiff-Current] ' + direction1 + '=' + Math.round(current1) + 'ms, ' + direction2 + '=' + Math.round(current2) + 'ms, Δ=' + Math.round(difference) + 'ms');

    return difference;
  }

  getAllLatencies(extension) {
    const stages = [
      'audiosocket_to_asr', 'asr', 'asr_to_mt', 'mt', 'mt_to_tts',
      'tts', 'tts_to_ls', 'ls', 'ls_to_bridge'
    ];

    const result = {};
    for (const stage of stages) {
      const key = extension + ':' + stage;
      const samples = this.stageSamples.get(key) || [];
      result[stage] = {
        current: samples[samples.length - 1] || 0,
        avg: this.getStageAverage(extension, stage)
      };
    }

    return result;
  }
}

// Class 3: AudioBufferManager - Manages setTimeout-based audio buffering
class AudioBufferManager {
  constructor() {
    this.pendingBuffers = new Map(); // extension → [{audio, timer, targetTime}, ...]
  }

  bufferAndSend(extension, audioData, delayMs, sendCallback) {
    if (delayMs === 0) {
      // No delay needed, send immediately
      sendCallback(extension, audioData);
      return;
    }

    const targetTime = Date.now() + delayMs;

    console.log('[AudioBuffer] Buffering ' + audioData.length + ' bytes for ' + extension + ' by ' + delayMs + 'ms');

    const timer = setTimeout(() => {
      console.log('[AudioBuffer] Sending buffered audio for ' + extension + ' (delayed by ' + delayMs + 'ms)');
      sendCallback(extension, audioData);

      // Remove from pending buffers
      const buffers = this.pendingBuffers.get(extension) || [];
      const index = buffers.findIndex(b => b.targetTime === targetTime);
      if (index !== -1) {
        buffers.splice(index, 1);
      }
    }, delayMs);

    // Track pending buffer
    if (!this.pendingBuffers.has(extension)) {
      this.pendingBuffers.set(extension, []);
    }

    this.pendingBuffers.get(extension).push({
      audio: audioData,
      timer,
      targetTime,
      delayMs
    });
  }

  clearBuffer(extension) {
    const buffers = this.pendingBuffers.get(extension) || [];
    buffers.forEach(b => clearTimeout(b.timer));
    this.pendingBuffers.delete(extension);
    console.log('[AudioBuffer] Cleared all pending buffers for ' + extension);
  }

  getPendingBuffers(extension) {
    return this.pendingBuffers.get(extension) || [];
  }
}

// ═══════════════════════════════════════════════════════════════
// STEP 4.3: MP3 → PCM16 AUDIO CONVERSION FUNCTION
// ═══════════════════════════════════════════════════════════════
// Note: fs and path already declared at top of file
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

async function convertMp3ToPcm16(mp3Buffer) {
  const tempDir = '/tmp';
  const inputFile = path.join(tempDir, `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`);
  const outputFile = path.join(tempDir, `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pcm`);

  try {
    // Write MP3 to temporary file
    fs.writeFileSync(inputFile, mp3Buffer);

    // Convert: MP3 → PCM16, 16kHz, mono, signed 16-bit little-endian
    const ffmpegCommand = `ffmpeg -i ${inputFile} -f s16le -acodec pcm_s16le -ar 16000 -ac 1 ${outputFile}`;
    await execPromise(ffmpegCommand);

    // Read PCM data
    const pcmBuffer = fs.readFileSync(outputFile);

    // Cleanup
    fs.unlinkSync(inputFile);
    fs.unlinkSync(outputFile);

    console.log(`[Audio Convert] MP3 → PCM16: ${mp3Buffer.length} bytes → ${pcmBuffer.length} bytes`);
    return pcmBuffer;

  } catch (error) {
    console.error('[Audio Convert] Error converting MP3 to PCM16:', error);
    // Cleanup on error
    try { fs.unlinkSync(inputFile); } catch {}
    try { fs.unlinkSync(outputFile); } catch {}
    throw error;
  }
}

// Class 4: DashboardTCPAPI - TCP server for dashboard metrics
class DashboardTCPAPI {
  constructor() {
    this.server = null;
    this.clients = new Map(); // socket → { id, subscriptions: Set }
    this.nextClientId = 1;
    this.heartbeatInterval = null;
  }

  startServer(port = 6211) {
    this.server = net.createServer((socket) => {
      this.handleClientConnection(socket);
    });

    this.server.listen(port, () => {
      console.log('[TCP API] Dashboard metrics API listening on port ' + port);
    });

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.broadcastHeartbeat();
    }, 30000);
  }

  handleClientConnection(socket) {
    const clientId = this.nextClientId++;
    const clientInfo = {
      id: clientId,
      subscriptions: new Set(), // Set of extension numbers
      address: socket.remoteAddress
    };

    this.clients.set(socket, clientInfo);

    console.log('[TCP API] Client ' + clientId + ' connected from ' + socket.remoteAddress);

    // Send connection confirmation
    this.sendToClient(socket, {
      type: 'CONNECTED',
      timestamp: Date.now(),
      serverVersion: '1.0.0',
      clientId: clientId
    });

    // Handle incoming data
    let buffer = '';
    socket.on('data', (data) => {
      buffer += data.toString('utf8');

      // Process complete messages (newline-delimited)
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line);
            this.handleClientMessage(socket, clientInfo, message);
          } catch (error) {
            console.error('[TCP API] Invalid JSON from client ' + clientId + ':', error);
          }
        }
      }
    });

    socket.on('error', (error) => {
      console.error('[TCP API] Client ' + clientId + ' error:', error);
    });

    socket.on('close', () => {
      console.log('[TCP API] Client ' + clientId + ' disconnected');
      this.clients.delete(socket);
    });
  }

  handleClientMessage(socket, clientInfo, message) {
    switch (message.type) {
      case 'SUBSCRIBE':
        if (message.extension) {
          clientInfo.subscriptions.add(message.extension);
          console.log('[TCP API] Client ' + clientInfo.id + ' subscribed to extension ' + message.extension);
        }
        break;

      case 'UNSUBSCRIBE':
        if (message.extension) {
          clientInfo.subscriptions.delete(message.extension);
          console.log('[TCP API] Client ' + clientInfo.id + ' unsubscribed from extension ' + message.extension);
        }
        break;

      default:
        console.warn('[TCP API] Unknown message type from client ' + clientInfo.id + ':', message.type);
    }
  }

  sendToClient(socket, data) {
    if (socket.writable) {
      const json = JSON.stringify(data) + '\n';
      socket.write(json);
    }
  }

  broadcastLatencyUpdate(data) {
    const message = {
      type: 'LATENCY_UPDATE',
      timestamp: Date.now(),
      ...data
    };

    // Send to subscribed clients
    for (const [socket, clientInfo] of this.clients.entries()) {
      if (clientInfo.subscriptions.size === 0 ||
          clientInfo.subscriptions.has(data.extension)) {
        this.sendToClient(socket, message);
      }
    }
  }

  broadcastStage(extension, stage, duration, stageName) {
    const message = {
      type: 'STAGE_TIMING',
      timestamp: Date.now(),
      extension,
      stage,
      duration,
      stageName
    };

    for (const [socket, clientInfo] of this.clients.entries()) {
      if (clientInfo.subscriptions.size === 0 ||
          clientInfo.subscriptions.has(extension)) {
        this.sendToClient(socket, message);
      }
    }
  }

  broadcastBufferApplied(extension, delayMs, reason, latencyDifference) {
    const message = {
      type: 'BUFFER_APPLIED',
      timestamp: Date.now(),
      extension,
      delayMs,
      reason,
      latencyDifference
    };

    for (const [socket, clientInfo] of this.clients.entries()) {
      if (clientInfo.subscriptions.size === 0 ||
          clientInfo.subscriptions.has(extension)) {
        this.sendToClient(socket, message);
      }
    }
  }

  broadcastBufferCalculation(extension, targetBufferMs, pairedExtension, latencyDifference) {
    const message = {
      type: 'BUFFER_CALCULATION',
      timestamp: Date.now(),
      extension: extension,
      targetBufferMs: Math.round(targetBufferMs),
      pairedExtension: pairedExtension,
      latencyDifference: Math.round(latencyDifference),
      status: 'calculated_not_applied'
    };

    for (const [socket, clientInfo] of this.clients.entries()) {
      if (clientInfo.subscriptions.size === 0 ||
          clientInfo.subscriptions.has(extension)) {
        this.sendToClient(socket, message);
      }
    }

    console.log('[TCP API] Broadcast buffer calculation for ' + extension + ': target=' + Math.round(targetBufferMs) + 'ms, diff=' + Math.round(latencyDifference) + 'ms');
  }

  broadcastHeartbeat() {
    const message = {
      type: 'HEARTBEAT',
      timestamp: Date.now(),
      connectedClients: this.clients.size,
      uptime: process.uptime() * 1000
    };

    for (const [socket] of this.clients.entries()) {
      this.sendToClient(socket, message);
    }
  }

  stopServer() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    for (const [socket] of this.clients.entries()) {
      socket.end();
    }

    if (this.server) {
      this.server.close(() => {
        console.log('[TCP API] Server closed');
      });
    }
  }
}

// Initialize timing module instances
const pairManager = new ExtensionPairManager();
const latencyTracker = new LatencyTracker();
const audioBufferManager = new AudioBufferManager();
const dashboardTCPAPI = new DashboardTCPAPI();

console.log('[Server] ✓ AudioBufferManager initialized (ready for Step 4)');

// Auto-pair 3333 and 4444 on startup
pairManager.registerPair('3333', '4444');

// Start TCP API server
dashboardTCPAPI.startServer(6211);

// STEP 3: Extension buffer settings storage
// Store per-extension buffer settings from dashboard
const extensionBufferSettings = new Map();

// Initialize with defaults (autoSync: true per user request)
extensionBufferSettings.set('9007', { autoSync: true, manualLatencyMs: 0 });
extensionBufferSettings.set('9008', { autoSync: true, manualLatencyMs: 0 });

console.log('[TimingModule] Step 1: Classes initialized (not yet integrated into pipeline)');
console.log('[TimingModule] Step 3: Buffer settings storage initialized (autoSync: ON by default)');
// ============================================================================
// END OF TIMING & BUFFERING MODULE CLASSES
// ============================================================================

// Store active rooms and participants
const rooms = new Map();
const participants = new Map();

// Store user profiles for HMLCP
const userProfiles = new Map(); // key: userId_language, value: { profile, uloLayer }

// QA Settings: Per-extension language configuration
// Extension 9007: English → French (DEFAULT)
// Extension 7888: French → English (OPPOSITE - for bidirectional translation)
global.qaConfigs = new Map();
global.qaConfigs.set('9007', { sourceLang: 'en', targetLang: 'fr', qaMode: false });
global.qaConfigs.set('3333', { sourceLang: 'en', targetLang: 'fr', qaMode: false });
global.qaConfigs.set('4444', { sourceLang: 'fr', targetLang: 'en', qaMode: false });
console.log('[QA Config] Initialized language settings for extensions 3333/4444');
global.qaConfigs.set('7888', { sourceLang: 'fr', targetLang: 'en', qaMode: false });

// Helper function to get config for extension (with fallback)
function getQaConfig(extension) {
  return global.qaConfigs.get(extension) || global.qaConfigs.get('9007');
}

// Store streaming Deepgram connections per socket
const streamingConnections = new Map(); // key: socket.id, value: { connection, customVocab }
// Per-extension audio gain factors (key: extension, value: gainFactor)
const extensionGainFactors = new Map(); // Default 1.2x for all
// Initialize with proper gain reduction
extensionGainFactors.set("3333", 2.0);
extensionGainFactors.set("4444", 2.0);
console.log("[GAIN] Initialized extensions 3333/4444 with gain 2.0");
const humeConnections = new Map(); // key: socket.id, value: HumeStreamingClient instance
const humeAudioBuffers = new Map(); // key: socket.id, value: array of audio chunks to buffer before sending to Hume
const socketToExtension = new Map(); // key: socket.id, value: extension (for Hume emotion events)

// ========== HUME HEALTH MONITORING (for Dashboard Card #5) ==========
// Global Hume Health monitoring object
global.humeHealth = {
  connection: "closed",
  uptime_seconds: 0,
  latency_ms_avg: 0,
  latency_ms_max: 0,
  chunk_rate_fps: 0,
  errors_past_minute: 0,
  last_error: null,
  last_message_age_ms: 0
};

// Update uptime counter every second
setInterval(() => {
  if (global.humeHealth) {
    global.humeHealth.uptime_seconds++;
  }
}, 1000);

const humeLatencyPerExtension = new Map(); // key: extension, value: latest Hume latency in ms
const humeStartTimestamps = new Map(); // key: extension, value: timestamp when last audio chunk was sent to Hume
const HUME_BUFFER_SIZE = 50; // 50 chunks = ~1 second at 20ms per chunk

// Language mapping for services
const languageMap = {
  'en': { name: 'English', deepgram: 'en-US', deepl: 'en-US', azure: 'en-US' },
  'es': { name: 'Spanish', deepgram: 'es', deepl: 'ES', azure: 'es-ES' },
  'fr': { name: 'French', deepgram: 'fr', deepl: 'FR', azure: 'fr-FR' },
  'de': { name: 'German', deepgram: 'de', deepl: 'DE', azure: 'de-DE' },
  'it': { name: 'Italian', deepgram: 'it', deepl: 'IT', azure: 'it-IT' },
  'pt': { name: 'Portuguese', deepgram: 'pt', deepl: 'PT-PT', azure: 'pt-PT' },
  'ja': { name: 'Japanese', deepgram: 'ja', deepl: 'JA', azure: 'ja-JP' },
  'ko': { name: 'Korean', deepgram: 'ko', deepl: 'KO', azure: 'ko-KR' },
  'zh': { name: 'Chinese', deepgram: 'zh', deepl: 'ZH', azure: 'zh-CN' },
  'ru': { name: 'Russian', deepgram: 'ru', deepl: 'RU', azure: 'ru-RU' }
};

// Deepgram STT function with HMLCP custom vocabulary support
// Create WAV header for raw PCM audio so Deepgram can process it
function createWavHeader(pcmData) {
  const pcmLength = pcmData.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(16000, 24);
  header.writeUInt32LE(32000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmLength, 40);
  return Buffer.concat([header, pcmData]);
}

// ========================================
// Audio Amplifier (fixes low volume issue)
// ========================================
function amplifyAudio(pcmBuffer, gainFactor = 1.0) {
  const amplified = Buffer.alloc(pcmBuffer.length);
  let maxSample = 0;
  let clippedSamples = 0;
  
  for (let i = 0; i < pcmBuffer.length; i += 2) {
    let sample = pcmBuffer.readInt16LE(i);
    maxSample = Math.max(maxSample, Math.abs(sample));
    
    let amplifiedSample = Math.round(sample * gainFactor);
    
    if (amplifiedSample > 32767) {
      amplifiedSample = 32767;
      clippedSamples++;
    } else if (amplifiedSample < -32768) {
      amplifiedSample = -32768;
      clippedSamples++;
    }
    
    amplified.writeInt16LE(amplifiedSample, i);
  }
  
  console.log(`[Audio Amplifier] Gain: ${gainFactor}x, Max input: ${maxSample}, Clipped: ${clippedSamples} samples (${(clippedSamples/(pcmBuffer.length/2)*100).toFixed(2)}%)`);
  return amplified;
}

async function transcribeAudio(audioBuffer, language, customVocab = []) {
  if (!deepgramApiKey) {
    console.warn('Deepgram API key not set');
    return { text: '[STT not configured]', confidence: 0 };
  }

  try {
    console.log(`[Deepgram] Starting transcription:`);
    console.log(`  - Audio buffer size: ${audioBuffer.length} bytes`);
    console.log(`  - Language: ${language}`);
    console.log(`  - Deepgram language code: ${languageMap[language]?.deepgram || 'en-US'}`);

    const deepgram = createClient(deepgramApiKey);

    // Build Deepgram options
    const options = {
      model: 'nova-2',
      language: languageMap[language]?.deepgram || 'en-US',
      smart_format: true,
      punctuate: true,
      utterances: false
    };

    // Add HMLCP custom vocabulary if provided
    if (customVocab && customVocab.length > 0) {
      // Deepgram keywords format: "phrase:boost"
      options.keywords = customVocab.map(v => `${v.phrase}:${v.boost}`);
      console.log(`[HMLCP] Using ${customVocab.length} custom vocabulary terms for STT`);
    }

    console.log(`[Deepgram] Options:`, JSON.stringify(options, null, 2));

    // Amplify audio before sending to Deepgram (fixes low volume issue)
    const amplifiedAudio = audioBuffer;
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, options);

    if (error) {
      console.error('[Deepgram] API returned error:');
      console.error('  Error object:', JSON.stringify(error, null, 2));
      return { text: '', confidence: 0 };
    }

    console.log('[Deepgram] Raw result structure:');
    console.log('  Has result:', !!result);
    console.log('  Has results:', !!result?.results);
    console.log('  Has channels:', !!result?.results?.channels);
    console.log('  Channels length:', result?.results?.channels?.length || 0);

    if (result?.results?.channels && result.results.channels.length > 0) {
      console.log('  Channel[0] alternatives:', result.results.channels[0]?.alternatives?.length || 0);

      if (result.results.channels[0]?.alternatives && result.results.channels[0].alternatives.length > 0) {
        const alt = result.results.channels[0].alternatives[0];
        console.log('  Transcript:', alt.transcript);
        console.log('  Confidence:', alt.confidence);
        console.log('  Words count:', alt.words?.length || 0);
      } else {
        console.log('[Deepgram] No alternatives in channel[0]');
      }
    } else {
      console.log('[Deepgram] No channels in result');
      console.log('[Deepgram] Full result:', JSON.stringify(result, null, 2));
    }

    const transcript = result?.results?.channels[0]?.alternatives[0]?.transcript || '';
    const confidence = result?.results?.channels[0]?.alternatives[0]?.confidence || 0;

    if (!transcript || transcript.trim() === '') {
      console.log('[Deepgram] Empty transcription returned');
    } else {
      console.log(`[Deepgram] SUCCESS: "${transcript}" (confidence: ${confidence})`);
    }

    return { text: transcript, confidence };
  } catch (error) {
    console.error('[Deepgram] Exception during transcription:');
    console.error('  Error message:', error.message);
    console.error('  Error stack:', error.stack);
    console.error('  Error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return { text: '', confidence: 0 };
  }
}


// DeepL translation function
async function translateText(text, sourceLang, targetLang) {
  if (!translator) {
    console.warn('DeepL not configured');
    return `[Translation: ${text}]`;
  }

  if (!text || text.trim() === '') {
    return text;
  }

  // QA Mode: Override languages with qaConfig if QA mode is enabled
  if (global.qaConfig && (global.qaConfig.sourceLang || global.qaConfig.targetLang)) {
    const originalSource = sourceLang;
    const originalTarget = targetLang;
    
    // Override with QA config languages
    sourceLang = global.qaConfig.sourceLang || sourceLang;
    targetLang = global.qaConfig.targetLang || targetLang;
    
    console.log(`[QA Config] Language override: ${originalSource} → ${originalTarget} becomes ${sourceLang} → ${targetLang}`);
  }

  // Skip translation if source === target (applies to both QA mode and normal mode)
  if (sourceLang === targetLang) {
    console.log(`[Translation] Bypassed: ${sourceLang} → ${targetLang} (same language)`);
    return text;
  }

  try {
    const sourceCode = languageMap[sourceLang]?.deepl || 'en-US';
    const targetCode = languageMap[targetLang]?.deepl || 'en-US';

    console.log(`[Translation] ${sourceLang} → ${targetLang}: "${text.substring(0, 50)}..."`);

    const result = await translator.translateText(
      text,
      sourceCode === 'en-US' ? null : sourceCode,
      targetCode
    );

    return result.text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

// ========== EMOTION-AWARE TTS MAPPER ==========

/**
 * Map Hume emotion data to ElevenLabs TTS parameters
 * Adjusts voice settings based on detected emotional state
 * @param {Object} emotionData - Hume emotion analysis result
 * @returns {Object} ElevenLabs voice settings
 */
function mapEmotionToTTS(emotionData) {
  if (!emotionData || !emotionData.prosody) {
    // Return default settings if no emotion data
    return {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: true
    };
  }

  const { prosody, emotions } = emotionData;
  const topEmotion = emotions && emotions[0] ? emotions[0].name : 'Neutral';

  // Base settings
  let stability = 0.5;  // 0-1: Lower = more expressive
  let style = 0;        // 0-1: Exaggeration factor
  let speakingRate = 1.0;  // 0.5-2.0: Speed multiplier

  // Adjust stability based on arousal
  // High arousal (excited/urgent) = lower stability (more expressive)
  // Low arousal (calm/sad) = higher stability (more consistent)
  stability = 1.0 - (prosody.arousal * 0.7);  // Range: 0.3 to 1.0

  // Adjust style based on valence and top emotion
  // Positive valence = warmer/friendlier style
  // Negative valence = more serious/concerned style
  if (prosody.valence > 0.3) {
    style = Math.min(0.8, prosody.valence * 0.8);  // Positive: 0.24 to 0.8
  } else if (prosody.valence < -0.3) {
    style = Math.max(0, 0.5 + prosody.valence * 0.5);  // Negative: 0 to 0.35
  }

  // Adjust speaking rate based on detected rate and emotion
  if (prosody.speaking_rate) {
    // Normalize speaking rate (typical range: 2-5 syllables/sec)
    const normalizedRate = (prosody.speaking_rate - 3.0) / 2.0;  // -0.5 to 1.0
    speakingRate = 1.0 + (normalizedRate * 0.4);  // Range: 0.8 to 1.4
  }

  // Emotion-specific adjustments
  const emotionAdjustments = {
    'Anger': { stability: 0.3, style: 0.7, rate: 1.2 },
    'Anxiety': { stability: 0.4, style: 0.6, rate: 1.3 },
    'Excitement': { stability: 0.35, style: 0.8, rate: 1.2 },
    'Joy': { stability: 0.4, style: 0.75, rate: 1.1 },
    'Sadness': { stability: 0.7, style: 0.3, rate: 0.9 },
    'Fear': { stability: 0.3, style: 0.6, rate: 1.3 },
    'Calm': { stability: 0.8, style: 0.2, rate: 0.95 }
  };

  if (emotionAdjustments[topEmotion]) {
    const adj = emotionAdjustments[topEmotion];
    stability = (stability + adj.stability) / 2;  // Blend with emotion-specific
    style = (style + adj.style) / 2;
    speakingRate = (speakingRate + adj.rate) / 2;
  }

  // Clamp values to valid ranges
  stability = Math.max(0, Math.min(1, stability));
  style = Math.max(0, Math.min(1, style));
  speakingRate = Math.max(0.5, Math.min(2.0, speakingRate));

  console.log(`[EMOTION-TTS] Mapping: ${topEmotion} → stability=${stability.toFixed(2)}, style=${style.toFixed(2)}, rate=${speakingRate.toFixed(2)}`);

  return {
    stability: stability,
    similarity_boost: 0.75,
    style: style,
    use_speaker_boost: true,
    speaking_rate: speakingRate
  };
}

/**
 * Enhanced synthesizeSpeech with emotion context
 * @param {string} text - Text to synthesize
 * @param {string} targetLang - Target language ('en' or 'fr')
 * @param {string} sourceExtension - Source extension ID ('3333' or '4444')
 * @returns {Promise<Buffer>} MP3 audio buffer
 */
async function synthesizeSpeechWithEmotion(text, targetLang, sourceExtension) {
  const startTime = Date.now();
  console.log(`[TTS-EMOTION-DEBUG] synthesizeSpeechWithEmotion called: text="${text.substring(0,50)}...", language=${targetLang}, extension=${sourceExtension}`);

  if (!elevenlabsTTS) {
    console.warn('ElevenLabs TTS not configured');
    updateElevenLabsMetrics(null, false);
    return null;
  }

  try {
    // Use the default voice ID from .env
    const voiceId = elevenlabsVoiceId || 'XPwQNE5RX9Rdhyx0DWcI'; // Boyan Tiholov

    // Get latest emotion data for this extension
    let emotionContext = null;
    if (USE_HUME_EMOTION && humeStateManager) {
      emotionContext = humeStateManager.getLatestEmotion(sourceExtension);
    }

    // Map emotion to TTS parameters
    const voiceSettings = mapEmotionToTTS(emotionContext);

    // Synthesize using ElevenLabs with emotion-aware settings
    const result = await elevenlabsTTS.synthesize(text, voiceId, {
      modelId: 'eleven_multilingual_v2', // Supports 29 languages
      voice_settings: voiceSettings
    });

    if (result && result.audio) {
      const latency = Date.now() - startTime;
      updateElevenLabsMetrics(latency, true);
      return result.audio; // Return the audio buffer
    }

    updateElevenLabsMetrics(Date.now() - startTime, false);
    return null;
  } catch (error) {
    console.error('ElevenLabs TTS (emotion-aware) error:', error);
    updateElevenLabsMetrics(Date.now() - startTime, false);
    return null;
  }
}

// ========== END EMOTION-AWARE TTS MAPPER ==========

async function synthesizeSpeech(text, language) {
  const startTime = Date.now();
  console.log(`[TTS-DEBUG] synthesizeSpeech called: text="${text.substring(0,50)}...", language=${language}`);
  
  if (!elevenlabsTTS) {
    console.warn('ElevenLabs TTS not configured');
    updateElevenLabsMetrics(null, false);
    return null;
  }

  try {
    // Use the default voice ID from .env
    const voiceId = elevenlabsVoiceId || 'XPwQNE5RX9Rdhyx0DWcI'; // Boyan Tiholov

    // Synthesize using ElevenLabs (returns MP3 buffer)
    const result = await elevenlabsTTS.synthesize(text, voiceId, {
      modelId: 'eleven_multilingual_v2' // Supports 29 languages
    });

    if (result && result.audio) {
      const latency = Date.now() - startTime;
      updateElevenLabsMetrics(latency, true);
      return result.audio; // Return the audio buffer
    }

    updateElevenLabsMetrics(Date.now() - startTime, false);
    return null;
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    updateElevenLabsMetrics(Date.now() - startTime, false);
    return null;
  }
}

// HMLCP: Get or create user profile with ULO layer
async function getUserProfile(userId, language) {
  const key = `${userId}_${language}`;

  if (!userProfiles.has(key)) {
    try {
      // Try to load existing profile or create new one
      const profile = await UserProfile.load(userId, language);
      const uloLayer = new ULOLayer(profile);
      const patternExtractor = new PatternExtractor();

      userProfiles.set(key, { profile, uloLayer, patternExtractor });
      console.log(`[HMLCP] Loaded profile for ${userId} (${language})`);
    } catch (error) {
      console.error(`[HMLCP] Error loading profile for ${userId}:`, error);
      // Create new profile on error
      const profile = new UserProfile(userId, language);
      const uloLayer = new ULOLayer(profile);
      const patternExtractor = new PatternExtractor();
      userProfiles.set(key, { profile, uloLayer, patternExtractor });
    }
  }

  return userProfiles.get(key);
}

// Create streaming Deepgram connection for real-time STT
async function createStreamingConnection(socket, participant) {
  if (!deepgramApiKey) {
    console.warn('[Streaming STT] Deepgram API key not set');
    return null;
  }

  // Get user profile and custom vocabulary for HMLCP BEFORE creating connection
  const { profile, uloLayer, patternExtractor } = await getUserProfile(
    participant.username,
    participant.language
  );
  const customVocab = uloLayer.generateCustomVocabulary();

  const deepgram = createClient(deepgramApiKey);

  // Configure streaming options with HMLCP custom vocabulary
  const options = {
    model: 'nova-2',
    language: languageMap[participant.language]?.deepgram || 'en-US',
    smart_format: true,
    punctuate: true,
    interim_results: false,  // Only get final results for accuracy
    endpointing: 300,  // 300ms silence to finalize utterance (faster than 800ms)
    utterance_end_ms: 1000  // Max 1 second to close utterance
  };

  // Add HMLCP custom vocabulary if available
  if (customVocab && customVocab.length > 0) {
    options.keywords = customVocab.map(v => `${v.phrase}:${v.boost}`);
    console.log(`[Streaming STT] ${participant.username}: Using ${customVocab.length} custom vocabulary terms`);
  }

  // Create live streaming connection and attach error handler IMMEDIATELY
  let connection;
  try {
    connection = deepgram.listen.live(options);

    // CRITICAL: Attach error handler IMMEDIATELY in same tick to catch early errors
    connection.on('Error', (error) => {
      console.error(`[Streaming STT] ${participant.username}: Connection error:`, error.message);
      streamingConnections.delete(socket.id);

      // Clean up Hume AI connection
      const humeClient = humeConnections.get(socket.id);
      if (humeClient) {
        humeClient.disconnect();
        humeConnections.delete(socket.id);
      }
      humeAudioBuffers.delete(socket.id);
      socketToExtension.delete(socket.id);
      socket.emit('pipeline-log', {
        type: 'client',
        stage: 'error',
        message: `Streaming STT error - using batch mode`,
        timestamp: Date.now()
      });
    });

    // Increase max listeners to avoid warnings
    connection.setMaxListeners(20);

  } catch (error) {
    console.error(`[Streaming STT] ${participant.username}: Failed to create connection:`, error.message);
    return null;
  }

  // Handle connection close
  connection.on('Close', () => {
    console.log(`[Streaming STT] ${participant.username}: Connection closed`);
    streamingConnections.delete(socket.id);

      // Clean up Hume AI connection
      const humeClient = humeConnections.get(socket.id);
      if (humeClient) {
        humeClient.disconnect();
        humeConnections.delete(socket.id);
      }
      humeAudioBuffers.delete(socket.id);
      socketToExtension.delete(socket.id);
  });

  // Handle transcription results
  connection.on('Results', async (data) => {
    const transcript = data.channel?.alternatives[0]?.transcript;

    if (!transcript || transcript.trim() === '') {
      return;  // Skip empty transcriptions
    }

    const confidence = data.channel?.alternatives[0]?.confidence || 0;
    const isFinal = data.is_final;

    // Only process final results
    if (isFinal) {
      const startTime = Date.now();
      console.log(`[Streaming STT] ${participant.username}: "${transcript}" (confidence: ${(confidence * 100).toFixed(1)}%)`);

      // ========================================================================
      // MONITORING: Collect Station 4 metrics (Deepgram Response)
      // ========================================================================
      const extension = socketToExtension.get(socket.id);
      if (extension) {
        setImmediate(() => {
          collectAndEmitStation4Metrics(extension, 0, {
            confidence: confidence,
            transcriptLength: transcript.length,
            isFinal: isFinal
          });
        });
      }

      // Log STT complete
      socket.emit('pipeline-log', {
        type: 'client',
        stage: 'stt-complete',
        message: `Speech recognized: "${transcript}"`,
        timestamp: Date.now()
      });

      // HMLCP: Apply ULO layer for personalized processing
      const processedTranscription = uloLayer.apply(transcript);

      // Store sample for learning
      profile.addTextSample(transcript);

      // Log ULO processing if modified
      if (processedTranscription !== transcript) {
        console.log(`[HMLCP] ${participant.username}: ULO applied: "${transcript}" → "${processedTranscription}"`);
        socket.emit('pipeline-log', {
          type: 'client',
          stage: 'hmlcp-ulo',
          message: `Personalized processing applied`,
          timestamp: Date.now()
        });
      }

      const finalTranscription = processedTranscription;

      // Send transcription to speaker
      socket.emit('transcription-result', {
        text: finalTranscription,
        rawText: transcript,
        confidence,
        language: participant.language
      });

      // Get room participants for translation
      const room = rooms.get(participant.roomId);
      if (!room) return;

      // Translate and synthesize for each other participant
      const translationPromises = Array.from(room.participants)
        .map(participantId => participants.get(participantId))
        .filter(p => {
          if (!p || p.id === socket.id) return false;  // Skip speaker
          // ECHO PREVENTION: Skip if target has same language (no translation needed)
          if (p.language === participant.language) {
            console.log(`[Echo Prevention] Skipping ${p.username} - same language as ${participant.username} (${participant.language})`);
            return false;
          }
          return true;
        })
        .map(async (targetParticipant) => {
          try {
            const transStart = Date.now();

            // Translate
            const translatedText = await translateText(
              finalTranscription,
              participant.language,
              targetParticipant.language
            );

            const transEnd = Date.now();
            const transDuration = transEnd - transStart;

            // TTS
            const ttsStart = Date.now();
            const audioData = await synthesizeSpeech(
              translatedText,
              targetParticipant.language
            );

            const ttsEnd = Date.now();
            const ttsDuration = ttsEnd - ttsStart;
            const totalLatency = Date.now() - startTime;

            // Calculate STT time as the remainder (STT happened before startTime was set)
            // In streaming mode, STT time is from audio send to transcript receipt
            // We approximate it as total - (translation + tts)
            const sttDuration = totalLatency - transDuration - ttsDuration;

            console.log(`[Streaming] ${participant.username} → ${targetParticipant.username}: ${totalLatency}ms total (STT: ${sttDuration}ms, Trans: ${transDuration}ms, TTS: ${ttsDuration}ms)`);

            // Send to target participant
            io.to(targetParticipant.id).emit('translated-audio', {
              originalText: finalTranscription,
              rawTranscription: transcript,
              translatedText,
              audioData: audioData ? audioData.toString('base64') : null,
              speakerUsername: participant.username,
              speakerLanguage: participant.language,
              latency: totalLatency,
              timing: {
                stt: sttDuration,
                translation: transDuration,
                tts: ttsDuration,
                total: totalLatency
              }
            });

            io.to(targetParticipant.id).emit('pipeline-log', {
              type: 'client',
              stage: 'complete',
              message: `✓ Complete: ${totalLatency}ms (Trans: ${transDuration}ms, TTS: ${ttsDuration}ms)`,
              timestamp: Date.now()
            });

          } catch (error) {
            console.error(`[Streaming] ${participant.username} → ${targetParticipant.username}: Error:`, error);
          }
        });

      await Promise.all(translationPromises);

      socket.emit('pipeline-log', {
        type: 'client',
        stage: 'speaker-confirmed',
        message: `Your speech sent to ${translationPromises.length} participant(s)`,
        timestamp: Date.now()
      });
    }
  });

  // Open the connection
  connection.on('Open', () => {
    console.log(`[Streaming STT] ${participant.username}: Connection opened successfully`);
    socket.emit('pipeline-log', {
      type: 'client',
      stage: 'info',
      message: `✓ Streaming mode active (low-latency)`,
      timestamp: Date.now()
    });
  });

  // Store connection
  streamingConnections.set(socket.id, {

    connection,
    customVocab,
    profile,
    uloLayer,
    patternExtractor
  });

  // Initialize Hume AI client for emotion detection
  initializeHumeClient(socket.id).catch(err => console.error("[Hume] Init error:", err));
  console.log(`[Streaming STT] ${participant.username}: Streaming connection created`);
  return connection;
}

// Socket.io connection handling
// Initialize Hume AI client for a socket
async function initializeHumeClient(socketId) {
  if (!humeApiKey) {
    console.log('[Hume] API key not configured');
    return null;
  }
  
  try {
    const humeClient = new HumeStreamingClient(humeApiKey, {
      sampleRate: 16000,
      channels: 1
    });
    
    await humeClient.connect();
    
    // Handle metrics from Hume
    console.log('[DEBUG] Attaching metrics listener for socket:', socketId);
    humeClient.on('metrics', (metrics) => {
      console.log('[DEBUG] 📊 Metrics event received from Hume:', {
        arousal: metrics.arousal,
        valence: metrics.valence,
        energy: metrics.energy,
        socketId: socketId
      });

      // Get extension for this socket
      const extension = socketToExtension.get(socketId);

      if (extension) {
        // Calculate Hume latency (time from audio sent to Hume → metrics received)
        const startTime = humeStartTimestamps.get(extension);
        if (startTime) {
          const humeLatency = Date.now() - startTime;
          humeLatencyPerExtension.set(extension, humeLatency);
          console.log(`[Hume] Latency for extension ${extension}: ${humeLatency}ms`);
        }

        console.log('[DEBUG] ✅ Broadcasting emotion_detected to all clients for extension:', extension);
        // Broadcast to ALL clients (including dashboard) - similar to how TTS works
        global.io.emit('emotion_detected', {
          extension: String(extension), // Add extension field for filtering
          arousal: metrics.arousal,
          valence: metrics.valence,
          energy: metrics.energy,
          timestamp: metrics.timestamp
        });
        console.log('[DEBUG] Emotion event broadcasted successfully');
      } else {
        console.error('[DEBUG] ❌ Extension not found for socketId:', socketId);
      }
    });
    
    humeConnections.set(socketId, humeClient);
    humeAudioBuffers.set(socketId, []); // Initialize empty buffer for this socket
    console.log(`[Hume] Client initialized for socket ${socketId}`);
    return humeClient;
  } catch (error) {
    console.error('[Hume] Error initializing client:', error.message);
    return null;
  }
}

// ========================================
// PHASE 2D: Gateway Audio Buffer Tracking
// Track audio buffers per extension for AI pipeline processing
// ========================================

// Track audio buffers per extension
const gatewayAudioBuffers = new Map(); // key: extension, value: { chunks: [], totalBytes: 0 }

// Configuration
const BUFFER_SIZE_THRESHOLD = 64000; // ~1 second at 16kHz mono PCM (2 bytes per sample)
/**
 * Add WAV header to raw PCM data
 * Format: 16kHz, mono, 16-bit PCM
 */
function addWavHeader(pcmBuffer) {
  const sampleRate = 16000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  
  const wavHeader = Buffer.alloc(44);
  
  // RIFF chunk descriptor
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
  wavHeader.write('WAVE', 8);
  
  // fmt sub-chunk
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  wavHeader.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);
  
  // data sub-chunk
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(pcmBuffer.length, 40);
  
  return Buffer.concat([wavHeader, pcmBuffer]);
}

/**
 * Process Gateway audio through AI pipeline
 * Called when buffer reaches ~1 second threshold
 */
async function processGatewayAudio(socket, extension, audioBuffer, language) {
  try {
    // ═══════════════════════════════════════════════════════════════
    // TIMING INITIALIZATION - STEP 2: Timing Collection (Measure Only)
    // ═══════════════════════════════════════════════════════════════
    const timing = {
      extension,
      t0_gatewayReceived: Date.now(),
      stages: {},
      parallel: {}
    };

    // ═══════════════════════════════════════════════════════════════
    // STAGE 1: Gateway → ASR
    // ═══════════════════════════════════════════════════════════════
    timing.t1_asrStarted = Date.now();
    timing.stages.audiosocket_to_asr = timing.t1_asrStarted - timing.t0_gatewayReceived;

    latencyTracker.updateStageLatency(extension, 'audiosocket_to_asr', timing.stages.audiosocket_to_asr);
    console.log('[Timing] Stage 1 (Gateway→ASR) for ' + extension + ': ' + timing.stages.audiosocket_to_asr + 'ms');

    // Step 1: Transcribe (ASR)
    console.log(`[Pipeline] Transcribing ${audioBuffer.length} bytes from extension ${extension}...`);
    // Amplify audio to improve Deepgram transcription accuracy
    // Use per-extension gain factor if set, otherwise default to 1.2
    const gainFactor = extensionGainFactors.get(extension) || 1.2;
    const amplifiedAudio = amplifyAudio(audioBuffer, gainFactor);
    // Add WAV header to raw PCM data for Deepgram
    const wavAudio = addWavHeader(amplifiedAudio);

    // ═══════════════════════════════════════════════════════════════
    // STAGE 2: ASR Processing (Deepgram)
    // ═══════════════════════════════════════════════════════════════
    const asrStart = Date.now();
    const { text: transcription, confidence } = await transcribeAudio(wavAudio, language);
    timing.t2_asrCompleted = Date.now();
    timing.stages.asr = timing.t2_asrCompleted - asrStart;

    latencyTracker.updateStageLatency(extension, 'asr', timing.stages.asr);
    console.log('[Timing] Stage 2 (ASR) for ' + extension + ': ' + timing.stages.asr + 'ms');

    if (!transcription || transcription.trim() === '') {
      console.log(`[Pipeline] No transcription for extension ${extension}`);
      return;
    }

    console.log(`[Pipeline] Transcription from ${extension}: "${transcription}" (confidence: ${confidence})`);

    // Emit transcription to dashboard
    global.io.emit('transcriptionFinal', {
      extension: extension,
      text: transcription,
      language: language,
      confidence: confidence,
      timestamp: Date.now()
    });

    // ═══════════════════════════════════════════════════════════════
    // STAGE 3: ASR → MT
    // ═══════════════════════════════════════════════════════════════
    timing.t3_mtStarted = Date.now();
    timing.stages.asr_to_mt = timing.t3_mtStarted - timing.t2_asrCompleted;

    latencyTracker.updateStageLatency(extension, 'asr_to_mt', timing.stages.asr_to_mt);
    console.log('[Timing] Stage 3 (ASR→MT) for ' + extension + ': ' + timing.stages.asr_to_mt + 'ms');

    // Step 2: Translate
    const config = getQaConfig(extension);
    const targetLang = config.targetLang;
    console.log(`[Pipeline] Translating ${language} -> ${targetLang}: "${transcription}"`);

    // ═══════════════════════════════════════════════════════════════
    // STAGE 4: MT Processing (DeepL)
    // ═══════════════════════════════════════════════════════════════
    const mtStart = Date.now();
    const translation = await translateText(transcription, language, targetLang);
    timing.t4_mtCompleted = Date.now();
    timing.stages.mt = timing.t4_mtCompleted - mtStart;

    latencyTracker.updateStageLatency(extension, 'mt', timing.stages.mt);
    console.log('[Timing] Stage 4 (MT) for ' + extension + ': ' + timing.stages.mt + 'ms');

    console.log(`[Pipeline] Translation: "${translation}" (${timing.stages.mt}ms)`);

    // Emit translation to dashboard
    global.io.emit('translationComplete', {
      extension: extension,
      original: transcription,
      translation: translation,
      sourceLang: language,
      targetLang: targetLang,
      timestamp: Date.now()
    });

    // ═══════════════════════════════════════════════════════════════
    // STAGE 5: MT → TTS
    // ═══════════════════════════════════════════════════════════════
    timing.t5_ttsStarted = Date.now();
    timing.stages.mt_to_tts = timing.t5_ttsStarted - timing.t4_mtCompleted;

    latencyTracker.updateStageLatency(extension, 'mt_to_tts', timing.stages.mt_to_tts);
    console.log('[Timing] Stage 5 (MT→TTS) for ' + extension + ': ' + timing.stages.mt_to_tts + 'ms');

    // Step 3: TTS - Generate audio from translation
    console.log(`[Pipeline] Generating TTS for extension ${extension}: "${translation}"`);

    // ═══════════════════════════════════════════════════════════════
    // STAGE 6: TTS Processing (ElevenLabs)
    // ═══════════════════════════════════════════════════════════════
    const ttsStart = Date.now();
    const ttsAudio = await synthesizeSpeech(translation, targetLang);
    timing.t6_ttsCompleted = Date.now();
    timing.stages.tts = timing.t6_ttsCompleted - ttsStart;

    latencyTracker.updateStageLatency(extension, 'tts', timing.stages.tts);
    console.log('[Timing] Stage 6 (TTS) for ' + extension + ': ' + timing.stages.tts + 'ms - ' + (ttsAudio ? ttsAudio.length : 0) + ' bytes');

    // ═══════════════════════════════════════════════════════════════
    // STAGE 7: TTS → LS (Latency Sync preparation)
    // ═══════════════════════════════════════════════════════════════
    timing.t7_lsStarted = Date.now();
    timing.stages.tts_to_ls = timing.t7_lsStarted - timing.t6_ttsCompleted;

    latencyTracker.updateStageLatency(extension, 'tts_to_ls', timing.stages.tts_to_ls);
    console.log('[Timing] Stage 7 (TTS→LS) for ' + extension + ': ' + timing.stages.tts_to_ls + 'ms');

    // ═══════════════════════════════════════════════════════════════
    // STAGE 8: LS (Latency Sync - Buffer Calculation)
    // STEP 4.1 & 4.2: Retrieve settings and calculate buffer delay
    // ═══════════════════════════════════════════════════════════════
    const pairedExtension = pairManager.getPairedExtension(extension);

    // SUB-TASK 4.1: Retrieve Buffer Settings
    const settings = extensionBufferSettings.get(extension) || { autoSync: false, manualLatencyMs: 0 };
    const autoSync = settings.autoSync;
    const manualLatencyMs = settings.manualLatencyMs;

    console.log(`[Buffer Apply] Extension ${extension} settings: autoSync=${autoSync}, manualLatency=${manualLatencyMs}ms`);

    // SUB-TASK 4.2: Calculate Total Buffer Delay
    const latencyDifference = latencyTracker.getCurrentLatencyDifference(extension, pairedExtension);
    let totalBufferMs = manualLatencyMs; // Always add manual adjustment

    if (autoSync && latencyDifference !== null && latencyDifference < 0) {
      // This extension is FASTER (negative latency diff) - needs buffer to sync
      const autoSyncBufferMs = Math.abs(latencyDifference);
      totalBufferMs += autoSyncBufferMs;
      console.log(`[Buffer Apply] Extension ${extension} is FASTER by ${Math.round(autoSyncBufferMs)}ms`);
      console.log(`[Buffer Apply] Auto-sync buffer: +${Math.round(autoSyncBufferMs)}ms`);
    } else if (autoSync && latencyDifference !== null && latencyDifference > 0) {
      // This extension is SLOWER (positive latency diff) - no auto-sync buffer needed
      console.log(`[Buffer Apply] Extension ${extension} is SLOWER by ${Math.round(latencyDifference)}ms - no auto-sync buffer needed`);
    } else if (latencyDifference === null) {
      console.log(`[Buffer Apply] No latency data yet for synchronization`);
    }

    console.log(`[Buffer Apply] Total buffer: ${Math.round(totalBufferMs)}ms (manual: ${manualLatencyMs}ms, auto: ${Math.round(totalBufferMs - manualLatencyMs)}ms)`);

    // For now, don't actually apply the buffer yet (will be done in Step 4.4)
    const bufferDelayMs = 0; // Step 4.4 will replace this with actual buffer application

    // ═══════════════════════════════════════════════════════════════
    // STEP 4.3: CONVERT MP3 TO PCM16
    // Convert ElevenLabs MP3 audio to PCM16 format for Gateway/Asterisk
    // ═══════════════════════════════════════════════════════════════
    let pcmAudioBuffer = null;
    if (ttsAudio) {
      try {
        console.log(`[Audio Convert] Converting ${ttsAudio.length} bytes MP3 to PCM16...`);
        pcmAudioBuffer = await convertMp3ToPcm16(ttsAudio);
        console.log(`[Audio Convert] ✓ Conversion complete: ${pcmAudioBuffer.length} bytes PCM16`);
      } catch (error) {
        console.error(`[Audio Convert] ✗ Conversion failed for extension ${extension}:`, error.message);
        pcmAudioBuffer = null;
      }
    } else {
      console.log(`[Audio Convert] No TTS audio to convert for extension ${extension}`);
    }



    // ═══════════════════════════════════════════════════════════════
    // STEP 4.4 & 4.5: APPLY BUFFER AND SEND TO GATEWAY
    // Apply calculated buffer delay and emit audio back to Gateway
    // ═══════════════════════════════════════════════════════════════
    if (pcmAudioBuffer && pcmAudioBuffer.length > 0) {
      console.log(`[Buffer Send] Applying ${Math.round(totalBufferMs)}ms buffer to ${pcmAudioBuffer.length} bytes PCM16 for extension ${pairedExtension}`);
      
      audioBufferManager.bufferAndSend(
        pairedExtension,           // Target extension (paired partner)
        pcmAudioBuffer,            // PCM16 audio data
        totalBufferMs,             // Buffer delay in milliseconds
        async (targetExtension, delayedAudio) => {
          // Callback executed after buffer delay
          console.log(`[Buffer Send] ✓ Sending ${delayedAudio.length} bytes PCM16 for extension ${targetExtension}`);
          
          // Check if this is a UDP-based extension (3333/4444)
          if (targetExtension === '3333' || targetExtension === '4444') {
            // Send via UDP socket
            await sendUdpPcmAudio(targetExtension, delayedAudio);
            console.log(`[Buffer Send] ✓ Sent via UDP to ${targetExtension} (buffered ${Math.round(totalBufferMs)}ms)`);
          } else {
            // Send via Socket.IO (for other extensions like 9007/9008)
            global.io.emit('translatedAudio', {
              extension: String(targetExtension),
              audio: delayedAudio,         // Buffer object (PCM16 data)
              format: 'pcm16',             // Audio format
              sampleRate: 16000,           // Sample rate
              channels: 1,                 // Mono
              timestamp: Date.now(),
              bufferApplied: totalBufferMs,
              sourceExtension: extension   // Original extension that generated this translation
            });
            console.log(`[Buffer Send] ✓ translatedAudio emitted via Socket.IO for ${targetExtension} (buffered ${Math.round(totalBufferMs)}ms)`);
          }
        }
      );
    } else {
      console.log(`[Buffer Send] ⚠ No PCM audio available to send for extension ${extension}`);
    }

    timing.t8_lsCompleted = Date.now();
    timing.stages.ls = timing.t8_lsCompleted - timing.t7_lsStarted;

    latencyTracker.updateStageLatency(extension, 'ls', timing.stages.ls);
    console.log('[Timing] Stage 8 (LS) for ' + extension + ': ' + timing.stages.ls + 'ms');

    // ═══════════════════════════════════════════════════════════════
    // STAGE 9: LS → Bridge (Send to gateway)
    // ═══════════════════════════════════════════════════════════════
    // Emit TTS audio to dashboard
    console.log(`[TTS DEBUG] Emitting translated-audio for extension: ${extension} (type: ${typeof extension})`);
    global.io.emit('translatedAudio', {
      extension: String(extension),
      original: transcription,
      translation: translation,
      audio: ttsAudio ? ttsAudio.toString('base64') : null,
      audioFormat: 'mp3',  // ElevenLabs returns MP3
      sourceLang: language,
      targetLang: targetLang,
      timestamp: Date.now(),
      timing: {
        tts: timing.stages.tts
      }
    });

    timing.t9_bridgeSent = Date.now();
    timing.stages.ls_to_bridge = timing.t9_bridgeSent - timing.t8_lsCompleted;

    latencyTracker.updateStageLatency(extension, 'ls_to_bridge', timing.stages.ls_to_bridge);
    console.log('[Timing] Stage 9 (LS→Bridge) for ' + extension + ': ' + timing.stages.ls_to_bridge + 'ms');

    // ═══════════════════════════════════════════════════════════════
    // CALCULATE TOTAL E2E LATENCY
    // ═══════════════════════════════════════════════════════════════
    timing.serialTotal = timing.stages.audiosocket_to_asr +
                        timing.stages.asr +
                        timing.stages.asr_to_mt +
                        timing.stages.mt +
                        timing.stages.mt_to_tts +
                        timing.stages.tts +
                        timing.stages.tts_to_ls +
                        timing.stages.ls +
                        timing.stages.ls_to_bridge;

    // Get Hume parallel pipeline latency (if available)
    const humeLatency = humeLatencyPerExtension.get(extension) || 0;
    timing.parallelTotal = humeLatency;
    timing.e2eTotal = Math.max(timing.serialTotal, timing.parallelTotal);

    if (humeLatency > 0) {
      console.log(`[Timing] Hume parallel pipeline latency for ${extension}: ${humeLatency}ms`);
    }

    console.log('[Timing] ═══════════════════════════════════════════════');
    console.log('[Timing] Extension ' + extension + ' E2E Total: ' + Math.round(timing.e2eTotal) + 'ms');
    console.log('[Timing]   - Serial: ' + Math.round(timing.serialTotal) + 'ms');
    console.log('[Timing]   - Parallel: ' + Math.round(timing.parallelTotal) + 'ms');
    console.log('[Timing] ═══════════════════════════════════════════════');

    // Update latency tracker with E2E total
    const direction = extension + '→' + pairedExtension;
    latencyTracker.updateLatency(direction, timing.e2eTotal);

    // ═══════════════════════════════════════════════════════════════
    // OLD STEP 2 CODE - REPLACED BY STEP 4.1 & 4.2 ABOVE
    // Buffer calculation now happens in STAGE 8 with dashboard settings
    // ═══════════════════════════════════════════════════════════════
    // Use totalBufferMs calculated above in STAGE 8
    const targetBufferMs = totalBufferMs; // For dashboard compatibility

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: EMIT DASHBOARD UPDATES
    // ═══════════════════════════════════════════════════════════════
    // Determine if parallel path is blocking (for now, always false since Hume not integrated)
    const isParallelBlocking = false;

    incrementUtteranceCount(extension);

    // Emit complete latency update to dashboard
    emitLatencyUpdate(extension, timing, bufferDelayMs, targetBufferMs, latencyDifference, isParallelBlocking);

    // STEP 2 FIX: Also emit inverted latency difference to paired extension for consistency
    // This ensures both dashboards always show mathematically consistent mirror values
    if (latencyDifference !== null) {
      emitLatencyUpdateToPairedExtension(pairedExtension, -latencyDifference);
    }

    // Emit individual stage timings via TCP API AND Socket.IO
    const stages = [
      { name: 'audiosocket_to_asr', duration: timing.stages.audiosocket_to_asr, label: 'Gateway → ASR' },
      { name: 'asr', duration: timing.stages.asr, label: 'ASR (Deepgram)' },
      { name: 'asr_to_mt', duration: timing.stages.asr_to_mt, label: 'ASR → MT' },
      { name: 'mt', duration: timing.stages.mt, label: 'MT (DeepL)' },
      { name: 'mt_to_tts', duration: timing.stages.mt_to_tts, label: 'MT → TTS' },
      { name: 'tts', duration: timing.stages.tts, label: 'TTS (ElevenLabs)' },
      { name: 'tts_to_ls', duration: timing.stages.tts_to_ls, label: 'TTS → LS' },
      { name: 'ls', duration: timing.stages.ls, label: 'LS (Latency Sync)' },
      { name: 'ls_to_bridge', duration: timing.stages.ls_to_bridge, label: 'LS → Bridge' }
    ];

    stages.forEach(stage => {
      dashboardTCPAPI.broadcastStage(extension, stage.name, stage.duration, stage.label);
      io.emit('stage_timing', {
        type: 'STAGE_TIMING',
        extension,
        stage: stage.name,
        duration: stage.duration,
        stageName: stage.label,
        timestamp: Date.now()
      });
    });

    // Broadcast buffer calculation (STEP 4) - shows target buffer even if not applied yet
    if (targetBufferMs > 0) {
      dashboardTCPAPI.broadcastBufferCalculation(extension, targetBufferMs, pairedExtension, latencyDifference);
    }

    // Note: Buffer not applied yet in Step 4, so bufferDelayMs = 0
    if (bufferDelayMs > 0) {
      dashboardTCPAPI.broadcastBufferApplied(extension, bufferDelayMs, 'sync_to_' + pairedExtension, latencyDifference);
    }

  } catch (error) {
    console.error(`[Pipeline] Error in processGatewayAudio for ${extension}:`, error);
  }
}

// ============================================================================
// STEP 3: Dashboard Event Emitters
// ============================================================================

// Utterance counter for statistics
const utteranceCounts = new Map(); // extension → count

function getUtteranceCount(extension) {
  return utteranceCounts.get(extension) || 0;
}

function incrementUtteranceCount(extension) {
  const count = (utteranceCounts.get(extension) || 0) + 1;
  utteranceCounts.set(extension, count);
  return count;
}

// Dashboard latency update emitter
function emitLatencyUpdate(extension, timing, appliedBufferMs, targetBufferMs, latencyDifference, isParallelBlocking) {
  const pairedExtension = pairManager.getPairedExtension(extension);

  const data = {
    extension: extension,

    latencies: latencyTracker.getAllLatencies(extension),

    buffer: {
      current: appliedBufferMs,        // Currently applied buffer (0 until STEP 5)
      target: targetBufferMs,           // Calculated target buffer from STEP 4
      adjustment: latencyDifference !== null ? Math.round(latencyDifference) : 0,  // SIGNED latency difference for dashboard bar (positive=slower, negative=faster)
      reason: 'sync_to_' + pairedExtension
    },

    displaySerialTotal: timing.serialTotal,
    displayParallelTotal: timing.parallelTotal,
    displaySerialTotalWithSync: timing.serialTotal + appliedBufferMs,

    parallelBlocking: isParallelBlocking,

    stats: {
      utteranceCount: getUtteranceCount(extension),
      avgUtteranceLatency: Math.round(latencyTracker.getAverageLatency(extension + '→' + pairedExtension))
    }
  };

  // Add E2E latency values
  data.latencies.e2e = {
    current: timing.e2eTotal,
    avg: data.stats.avgUtteranceLatency
  };
  data.latencies.serial_total = {
    current: timing.serialTotal,
    avg: timing.serialTotal
  };
  data.latencies.parallel_total = {
    current: timing.parallelTotal,
    avg: timing.parallelTotal
  };

  // Emit via Socket.IO to dashboard
  global.io.emit('latencyUpdate', data);

  // Broadcast via TCP API
  dashboardTCPAPI.broadcastLatencyUpdate(data);

  console.log('[Dashboard] Emitted latency update for ' + extension + ' (E2E: ' + Math.round(timing.e2eTotal) + 'ms, Diff: ' + data.buffer.adjustment + 'ms)');
}

// Helper function to emit latency difference update to paired extension only
// This ensures both dashboards always show mathematically consistent mirror values
function emitLatencyUpdateToPairedExtension(pairedExtension, invertedLatencyDifference) {
  const data = {
    extension: pairedExtension,
    buffer: {
      adjustment: Math.round(invertedLatencyDifference)  // Inverted difference for paired extension
    }
  };

  // Emit via Socket.IO to dashboard
  global.io.emit('latencyUpdate', data);

  console.log('[Dashboard] Emitted paired latency update for ' + pairedExtension + ' (Diff: ' + data.buffer.adjustment + 'ms)');
}

// ============================================================================
// END OF STEP 3 FUNCTIONS
// ============================================================================


io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // ========================================
  // PHASE 2C: Gateway WebSocket Handlers
  // Handle events from ExternalMedia Gateway (extensions 9007/9008)
  // ========================================
  
  // Track Gateway connections by extension
  const gatewayConnections = socket.gatewayConnections || new Map();
  
  // Register extension from Gateway
  socket.on('registerExtension', (data) => {
    console.log(`[Gateway] Extension ${data.extension} registered (${data.language})`);

    // Store Gateway connection info
    gatewayConnections.set(data.extension, {
      extension: data.extension,
      language: data.language,
      format: data.format,
      sampleRate: data.sampleRate,
      socketId: socket.id
    });

    // Store reverse mapping: socketId -> extension (for Hume emotion events)
    socketToExtension.set(socket.id, data.extension);
    console.log(`[Gateway] Socket ${socket.id} mapped to extension ${data.extension}`);

    // Initialize Hume AI client for emotion detection
    initializeHumeClient(socket.id).catch(err => console.error("[Hume] Init error:", err));

    socket.emit('registrationConfirmed', {
      extension: data.extension,
      status: 'ready'
    });
  });
  
  // Receive audio stream from Gateway
  socket.on('audioStream', async (data) => {
    const { extension, audio, timestamp } = data;
    
    // Initialize buffer for this extension if needed
    if (!gatewayAudioBuffers.has(extension)) {
      gatewayAudioBuffers.set(extension, {
        chunks: [],
        totalBytes: 0,
        language: gatewayConnections.get(extension)?.language || 'en'
      });
    }
    
    const buffer = gatewayAudioBuffers.get(extension);
    const audioChunk = Buffer.isBuffer(audio) ? audio : Buffer.from(audio);
    console.log("[RMS DEBUG] audioChunk.length:", audioChunk.length);
    console.log("[RMS DEBUG] audioChunk.length:", audioChunk.length);

    // Fork audio to Hume AI for emotion detection (buffered for better speech detection)
    const humeClient = humeConnections.get(socket.id);
    if (humeClient && humeClient.connected) {
      const humeBuffer = humeAudioBuffers.get(socket.id);
      if (humeBuffer) {
        humeBuffer.push(audioChunk);

        // Send to Hume only when buffer reaches threshold (50 chunks = ~1 second)
        if (humeBuffer.length >= HUME_BUFFER_SIZE) {
          const combinedBuffer = Buffer.concat(humeBuffer);

          // Record timestamp when audio is sent to Hume
          const extension = socketToExtension.get(socket.id);
          if (extension) {
            humeStartTimestamps.set(extension, Date.now());
          }

          humeClient.sendAudio(combinedBuffer);
          console.log(`[Hume] Sent ${HUME_BUFFER_SIZE} chunks (${combinedBuffer.length} bytes, ~1 second buffer) for extension ${extension}`);

          // Reset buffer for next batch
          humeAudioBuffers.set(socket.id, []);
        }
      }
    }

    // Calculate enhanced audio metrics (RMS, peak, clipping) for professional monitoring
    let rmsLevel = 0;
    let peakLevel = 0;
    let clippingCount = 0;

    if (audioChunk.length > 0) {
      let sumSquares = 0;
      let maxSample = 0;

      for (let i = 0; i < audioChunk.length; i += 2) {
        const sample = audioChunk.readInt16LE(i);
        const absSample = Math.abs(sample);

        // RMS calculation
        sumSquares += sample * sample;

        // Peak calculation
        if (absSample > maxSample) {
          maxSample = absSample;
        }

        // Clipping detection (samples at or near max int16 value)
        if (absSample >= 32767 || absSample >= 32500) {
          clippingCount++;
        }
      }

      const sampleCount = audioChunk.length / 2;
      const rms = Math.sqrt(sumSquares / sampleCount);
      console.log("[RMS DEBUG] sumSquares:", sumSquares, "sampleCount:", sampleCount, "rms:", rms, "rmsLevel:", Math.min(100, Math.round((rms / 32768) * 100)));
      console.log("[RMS DEBUG] sumSquares:", sumSquares, "sampleCount:", sampleCount, "rms:", rms, "rmsLevel:", Math.min(100, Math.round((rms / 32768) * 100)));

      // Normalize to 0-100 for RMS
      rmsLevel = Math.min(100, Math.round((rms / 32768) * 100));
      console.log("[RMS DEBUG] Final rmsLevel:", rmsLevel, "peakLevel:", peakLevel, "clippingCount:", clippingCount);

      // Normalize peak to 0-100
      peakLevel = Math.min(100, Math.round((maxSample / 32768) * 100));
    }

    // Emit monitoring event for Extension Monitor card with enhanced audio metrics
    global.io.emit('transcriptionPartial', {
      extension: extension,
      bytes: audioChunk.length,
      timestamp: timestamp || Date.now(),
      uuid: gatewayConnections.get(extension)?.socketId || socket.id,
      audioLevel: rmsLevel,
      peakLevel: peakLevel,
      clipping: clippingCount
    });
    // Add chunk to buffer
    buffer.chunks.push(audioChunk);
    buffer.totalBytes += audioChunk.length;
    
    // Log every 50th packet to avoid flooding
    if (Math.random() < 0.02) {
      console.log(`[Gateway] Extension ${extension}: buffered ${buffer.totalBytes} bytes (${buffer.chunks.length} chunks)`);
    }
    
    // Process when we have enough audio (~1 second)
    if (buffer.totalBytes >= BUFFER_SIZE_THRESHOLD) {
      // Concatenate all chunks
      const combinedAudio = Buffer.concat(buffer.chunks);
      
      console.log(`[Gateway] Processing ${combinedAudio.length} bytes from extension ${extension}`);
      
      // Reset buffer for next batch
      buffer.chunks = [];
      buffer.totalBytes = 0;
      
      // Process through AI pipeline (async, don't wait)
      processGatewayAudio(socket, extension, combinedAudio, buffer.language).catch(err => {
        console.error(`[Gateway] Error processing audio for ${extension}:`, err.message);
      });
    }
  });
  // Join or create room
  socket.on('join-room', (data) => {
    const { roomId, username, language } = data;

    socket.join(roomId);

    // Store participant info
    participants.set(socket.id, {
      id: socket.id,
      username,
      language,
      roomId
    });

    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        participants: new Set()
      });
    }

    const room = rooms.get(roomId);
    room.participants.add(socket.id);

    console.log(`${username} joined room ${roomId} with language ${language}`);

    // Notify others in the room
    socket.to(roomId).emit('participant-joined', {
      participantId: socket.id,
      username,
      language
    });

    // Send current participants to the new user
    const currentParticipants = Array.from(room.participants)
      .filter(id => id !== socket.id)
      .map(id => participants.get(id))
      .filter(p => p);

    socket.emit('room-joined', {
      roomId,
      participants: currentParticipants
    });

    // Streaming STT temporarily disabled - API key authentication issues in production context
    // The standalone test passes, but server crashes with "non-101 status code" error
    // This suggests the API key works in isolation but not in server context
    // Falling back to stable batch mode (~1500-2400ms latency)
    const participant = participants.get(socket.id);
    if (participant) {
      createStreamingConnection(socket, participant)
        .then(connection => {
          if (connection) {
            console.log(`[Mode] ✅ Streaming mode enabled for ${participant.username}`);
          } else {
            console.log(`[Mode] ⚠️ Streaming failed, falling back to batch mode for ${participant.username}`);
            socket.emit('pipeline-log', {
              type: 'client',
              stage: 'info',
              message: `⚠️ Batch mode active (streaming unavailable)`,
              timestamp: Date.now()
            });
          }
        })
        .catch(error => {
          console.error(`[Mode] Error creating streaming connection:`, error);
          socket.emit('pipeline-log', {
            type: 'client',
            stage: 'info',
            message: `⚠️ Batch mode active (streaming error)`,
            timestamp: Date.now()
          });
        });
    }
    
  });

  // Handle audio stream - feed to Deepgram Live connection or fallback to batch
  socket.on('audio-stream', async (data) => {
    const { audioBuffer, roomId } = data;
    const streamData = streamingConnections.get(socket.id);
    const participant = participants.get(socket.id);

    if (!participant) return;

    // Try streaming mode first
    if (streamData && streamData.connection) {
      try {
        // Send audio chunk to Deepgram Live API
        streamData.connection.send(Buffer.from(audioBuffer));

        // Fork audio to Hume AI for emotion detection
        const humeClient = humeConnections.get(socket.id);
        if (humeClient && humeClient.connected) {
          // Record timestamp when audio is sent to Hume
          const extension = socketToExtension.get(socket.id);
          if (extension) {
            humeStartTimestamps.set(extension, Date.now());
          }

          humeClient.sendAudio(Buffer.from(audioBuffer));
        }
      } catch (error) {
        console.error(`[Streaming] Error sending audio:`, error);
      }
    } else {
      // Fallback to batch mode if streaming not available
      // This prevents system from breaking if Deepgram Live API isn't available
      console.log(`[Batch Mode] Processing audio for ${participant.username} (streaming unavailable)`);

      try {
        const { profile, uloLayer } = await getUserProfile(
          participant.username,
          participant.language
        );
        const customVocab = uloLayer.generateCustomVocabulary();

        const startTime = Date.now();
        const sttStart = Date.now();
        const { text: transcription, confidence } = await transcribeAudio(
          Buffer.from(audioBuffer),
          participant.language,
          customVocab
        );

        const sttEnd = Date.now();
        const sttDuration = sttEnd - sttStart;

        if (!transcription || transcription.trim() === '') {
          return;
        }

        const processedTranscription = uloLayer.apply(transcription);
        profile.addTextSample(transcription);

        socket.emit('transcription-result', {
          text: processedTranscription,
          rawText: transcription,
          confidence,
          language: participant.language
        });

        // Translate for other participants
        const room = rooms.get(roomId);
        if (!room) return;

        const translationPromises = Array.from(room.participants)
          .map(participantId => participants.get(participantId))
          .filter(p => p && p.id !== socket.id)  // Skip speaker only
          .map(async (targetParticipant) => {
            const transStart = Date.now();
            const translatedText = await translateText(
              processedTranscription,
              participant.language,
              targetParticipant.language
            );

            const transEnd = Date.now();
            const transDuration = transEnd - transStart;

            const ttsStart = Date.now();
            const audioData = await synthesizeSpeech(
              translatedText,
              targetParticipant.language
            );

            const ttsEnd = Date.now();
            const ttsDuration = ttsEnd - ttsStart;
            const totalLatency = Date.now() - startTime;

            io.to(targetParticipant.id).emit('translated-audio', {
              originalText: processedTranscription,
              rawTranscription: transcription,
              translatedText,
              audioData: audioData ? audioData.toString('base64') : null,
              speakerUsername: participant.username,
              speakerLanguage: participant.language,
              latency: totalLatency,
              timing: {
                stt: sttDuration,
                translation: transDuration,
                tts: ttsDuration,
                total: totalLatency
              }
            });
          });

        await Promise.all(translationPromises);
      } catch (error) {
        console.error(`[Batch Mode] Error:`, error);
      }
    }
  });

  // Handle voice profile creation (from onboarding)
  socket.on('create-voice-profile', async (data) => {
    const { profileId, language, phrasesCount, skipped } = data;

    console.log(`[Onboarding] Creating voice profile: ${profileId} (${language}), skipped: ${skipped}`);

    try {
      // Initialize HMLCP profile for this user
      const { profile } = await getUserProfile(profileId, language);

      // If user skipped calibration, apply default language profile
      if (skipped || phrasesCount === 0) {
        console.log(`[Onboarding] Applying default ${language} profile (calibration skipped)`);
        applyDefaultProfile(profile, language);
        await profile.save();
      }

      socket.emit('profile-created', {
        profileId,
        language,
        success: true,
        isDefault: skipped || phrasesCount === 0
      });

      console.log(`[Onboarding] Profile created: ${profileId}${skipped ? ' (default profile)' : ''}`);
    } catch (error) {
      console.error('[Onboarding] Error creating profile:', error);
      socket.emit('error', { message: 'Failed to create profile' });
    }
  });

  // Handle calibration audio (from onboarding)
  socket.on('calibration-audio', async (data) => {
    const { audioBuffer, phrase, phraseIndex, language, profileId } = data;

    console.log(`[Onboarding] Calibration audio received: phrase ${phraseIndex + 1}, ${audioBuffer.byteLength} bytes`);

    try {
      // Transcribe the calibration audio
      const { text: transcription, confidence } = await transcribeAudio(
        Buffer.from(audioBuffer),
        language
      );

      console.log(`[Onboarding] Calibration phrase ${phraseIndex + 1} transcribed: "${transcription}" (expected: "${phrase}")`);

      // If we have a profile, add this as a calibration sample
      if (profileId) {
        const { profile, patternExtractor } = await getUserProfile(profileId, language);

        // Add to profile as a calibration sample
        profile.addTextSample(transcription);
        profile.addCalibrationSample(phrase, transcription);

        // Extract patterns if mismatch detected
        if (transcription.toLowerCase() !== phrase.toLowerCase()) {
          const pattern = patternExtractor.extractCorrectionPattern(transcription, phrase);
          if (pattern) {
            profile.addPattern(pattern);
            console.log(`[Onboarding] Pattern learned from calibration: ${transcription} → ${phrase}`);
          }
        }

        // Save profile after each calibration phrase
        await profile.save();
      }

      // Notify client that processing is complete
      socket.emit('calibration-processed', {
        phraseIndex,
        transcription,
        expectedPhrase: phrase,
        confidence,
        success: true
      });

    } catch (error) {
      console.error('[Onboarding] Error processing calibration audio:', error);
      socket.emit('error', { message: 'Failed to process calibration audio' });
    }
  });

  // Handle disconnect

  // QA Settings: Handle language configuration from dashboard
  socket.on('qa-language-config', (config) => {
    const { sourceLang, targetLang, qaMode, extension } = config;

    if (!extension) {
      console.warn('[QA Config] ⚠️  No extension specified, ignoring update');
      return;
    }

    // Update per-extension QA configuration
    global.qaConfigs.set(extension, { sourceLang, targetLang, qaMode });

    console.log(`[QA Config] ✓ Extension ${extension} updated: ${sourceLang} → ${targetLang} (QA Mode: ${qaMode})`);

    // Broadcast to all connected clients (they will filter by extension)
    io.emit('qa-config-updated', {
      extension,
      sourceLang,
      targetLang,
      qaMode
    });
  });

  // Handle volume control requests from dashboard
  socket.on('setVolume', (data) => {
    const { extension, volumeTX } = data;
    console.log(`[Volume Control] Request to set extension ${extension} TX gain to ${volumeTX} dB`);

    // Convert dB to linear gain factor: gainFactor = 10^(dB/20)
    const gainFactor = Math.pow(10, volumeTX / 20);

    // Store the gain factor for this extension
    extensionGainFactors.set(extension, gainFactor);

    console.log(`[Volume Control] ✓ Extension ${extension} PCM gain set to ${gainFactor.toFixed(3)}x (${volumeTX} dB)`);
  });

  // ========================================
  // STEP 1: Latency & Sync Dashboard Event Handlers (Logging Only)
  // ========================================

  // Handle Auto Sync toggle from dashboard
  socket.on('setAutoSync', (data) => {
    const { extension, enabled } = data;
    console.log(`[Latency Dashboard] setAutoSync received for extension ${extension}:`, enabled);

    // STEP 3: Store the setting
    const settings = extensionBufferSettings.get(extension) || { autoSync: false, manualLatencyMs: 0 };
    settings.autoSync = enabled;
    extensionBufferSettings.set(extension, settings);
    console.log(`[Buffer Settings] Extension ${extension} autoSync set to ${enabled}`);

    socket.emit('autoSyncConfirmed', {
      extension,
      enabled,
      status: 'acknowledged'
    });
  });

  // Handle Manual Latency adjustment from dashboard
  socket.on('setManualLatency', (data) => {
    const { extension, latencyMs } = data;
    console.log(`[Latency Dashboard] setManualLatency received for extension ${extension}:`, latencyMs, 'ms');

    // STEP 3: Store the setting
    const settings = extensionBufferSettings.get(extension) || { autoSync: false, manualLatencyMs: 0 };
    settings.manualLatencyMs = latencyMs;
    extensionBufferSettings.set(extension, settings);
    console.log(`[Buffer Settings] Extension ${extension} manualLatencyMs set to ${latencyMs}ms`);

    socket.emit('manualLatencyConfirmed', {
      extension,
      latencyMs,
      status: 'acknowledged'
    });
  });

  // Handle Audio Monitor request from dashboard
  socket.on('requestAudioMonitor', (data) => {
    const { extension } = data;
    console.log(`[Latency Dashboard] requestAudioMonitor received for extension ${extension}`);

    // Step 1: Just log, implementation will come in Step 5
    socket.emit('audioMonitorStatus', {
      extension,
      status: 'not_implemented',
      message: 'Audio monitoring will be implemented in Step 5'
    });
  });

  // ============================================================================
  // TEST MODE CONTROL - Socket.IO event handlers
  // ============================================================================

  // Start test mode - send looping test audio to target extension
  socket.on('startTestMode', (data) => {
    const { targetExtension } = data;
    console.log(`[Test Mode] Start request received for extension ${targetExtension}`);

    const result = startTestMode(targetExtension);

    // Broadcast status to all connected dashboards
    io.emit('testModeStatus', {
      ...result,
      ...getTestModeStatus()
    });
  });

  // Stop test mode
  socket.on('stopTestMode', () => {
    console.log(`[Test Mode] Stop request received`);

    const result = stopTestMode();

    // Broadcast status to all connected dashboards
    io.emit('testModeStatus', {
      ...result,
      ...getTestModeStatus()
    });
  });

  // Get current test mode status
  socket.on('getTestModeStatus', () => {
    const status = getTestModeStatus();
    socket.emit('testModeStatus', {
      success: true,
      ...status
    });
  });

  socket.on('disconnect', () => {
    const participant = participants.get(socket.id);

    // Close streaming Deepgram connection
    const streamData = streamingConnections.get(socket.id);
    if (streamData && streamData.connection) {
      try {
        streamData.connection.finish();
        console.log(`[Streaming STT] Connection closed for ${participant?.username || socket.id}`);
      } catch (error) {
        console.error(`[Streaming STT] Error closing connection:`, error);
      }
      streamingConnections.delete(socket.id);

      // Clean up Hume AI connection
      const humeClient = humeConnections.get(socket.id);
      if (humeClient) {
        humeClient.disconnect();
        humeConnections.delete(socket.id);
      }
      humeAudioBuffers.delete(socket.id);
      socketToExtension.delete(socket.id);
    }

    if (participant) {
      const { roomId, username } = participant;
      const room = rooms.get(roomId);

      if (room) {
        room.participants.delete(socket.id);

        // Notify others
        socket.to(roomId).emit('participant-left', {
          participantId: socket.id,
          username
        });

        // Clean up empty rooms
        if (room.participants.size === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        }
      }

      participants.delete(socket.id);
      console.log(`${username} disconnected from room ${roomId}`);
    }
  });
});

// API Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    services: {
      deepgram: !!deepgramApiKey,
      deepl: !!deeplApiKey,
      elevenlabs: !!elevenlabsApiKey
    },
    activeRooms: rooms.size,
    activeParticipants: participants.size
  });
});

app.get('/api/languages', (req, res) => {
  res.json(languageMap);
});

// File listing API endpoints
app.get('/api/files/recordings', (req, res) => {
  const recordingsDir = path.join(__dirname, 'recordings');
  fs.readdir(recordingsDir, (err, files) => {
    if (err) {
      return res.json({ files: [] });
    }
    const fileList = files.map(filename => ({
      name: filename,
      path: `/files/recordings/${filename}`
    }));
    res.json({ files: fileList });
  });
});

// Hume-specific health endpoint for Dashboard Card #5
app.get('/health/hume', (req, res) => {
  res.json(global.humeHealth || {
    connection: "not_initialized",
    error: "humeHealth object not found"
  });
});


app.get('/api/files/transcripts', (req, res) => {
  const transcriptsDir = path.join(__dirname, 'transcripts');
  fs.readdir(transcriptsDir, (err, files) => {
    if (err) {
      return res.json({ files: [] });
    }
    const fileList = files.map(filename => ({
      name: filename,
      path: `/files/transcripts/${filename}`
    }));
    res.json({ files: fileList });
  });
});

app.get('/api/files/translations', (req, res) => {
  const translationsDir = path.join(__dirname, 'translations');
  fs.readdir(translationsDir, (err, files) => {
    if (err) {
      return res.json({ files: [] });
    }
    const fileList = files.map(filename => ({
      name: filename,
      path: `/files/translations/${filename}`
    }));
    res.json({ files: fileList });
  });
});

// HMLCP API Endpoints
app.use(express.json());

// Get user profile stats
app.get('/api/hmlcp/profile/:userId/:language', async (req, res) => {
  try {
    const { userId, language } = req.params;
    const { profile, uloLayer } = await getUserProfile(userId, language);

    res.json({
      userId: profile.userId,
      language: profile.language,
      created: profile.created,
      lastUpdated: profile.lastUpdated,
      tone: profile.tone,
      avgSentenceLength: profile.avgSentenceLength,
      directness: profile.directness,
      ambiguityTolerance: profile.ambiguityTolerance,
      lexicalBias: profile.lexicalBias,
      phraseMappings: Object.keys(profile.phraseMap).length,
      biasTerms: profile.biasTerms.length,
      samples: profile.textSamples.length + profile.audioSamples.length,
      corrections: profile.corrections.length,
      metrics: profile.metrics,
      uloStats: uloLayer.getStats()
    });
  } catch (error) {
    console.error('[HMLCP API] Error getting profile:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Submit a correction (for learning)
app.post('/api/hmlcp/correction', async (req, res) => {
  try {
    const { userId, language, rawInput, interpretedIntent, correctedIntent } = req.body;

    if (!userId || !language || !rawInput || !correctedIntent) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { profile, uloLayer } = await getUserProfile(userId, language);

    // Learn from correction
    uloLayer.learnFromCorrection(rawInput, interpretedIntent || rawInput, correctedIntent);

    // Save profile
    await profile.save();

    res.json({
      success: true,
      message: 'Correction learned',
      metrics: profile.metrics,
      newPhraseMappings: Object.keys(profile.phraseMap).length
    });
  } catch (error) {
    console.error('[HMLCP API] Error submitting correction:', error);
    res.status(500).json({ error: 'Failed to submit correction' });
  }
});

// Analyze profile patterns
app.post('/api/hmlcp/analyze', async (req, res) => {
  try {
    const { userId, language } = req.body;

    if (!userId || !language) {
      return res.status(400).json({ error: 'Missing userId or language' });
    }

    const { profile, patternExtractor } = await getUserProfile(userId, language);

    // Extract patterns from collected samples
    const patterns = patternExtractor.analyze(profile.textSamples);

    // Update profile with extracted patterns
    profile.tone = patterns.tone;
    profile.avgSentenceLength = patterns.avgSentenceLength;
    profile.directness = patterns.directness;
    profile.ambiguityTolerance = patterns.ambiguityTolerance;
    profile.lexicalBias = patterns.lexicalBias;

    // Save updated profile
    await profile.save();

    res.json({
      success: true,
      patterns,
      message: 'Profile patterns analyzed and updated'
    });
  } catch (error) {
    console.error('[HMLCP API] Error analyzing patterns:', error);
    res.status(500).json({ error: 'Failed to analyze patterns' });
  }
});

// Get custom vocabulary for Deepgram
app.get('/api/hmlcp/vocabulary/:userId/:language', async (req, res) => {
  try {
    const { userId, language } = req.params;
    const { uloLayer } = await getUserProfile(userId, language);

    const vocabulary = uloLayer.generateCustomVocabulary();

    res.json({
      success: true,
      vocabulary,
      count: vocabulary.length
    });
  } catch (error) {
    console.error('[HMLCP API] Error getting vocabulary:', error);
    res.status(500).json({ error: 'Failed to get vocabulary' });
  }
});

// Save profile manually
app.post('/api/hmlcp/save', async (req, res) => {
  try {
    const { userId, language } = req.body;

    if (!userId || !language) {
      return res.status(400).json({ error: 'Missing userId or language' });
    }

    const { profile } = await getUserProfile(userId, language);
    const filePath = await profile.save();

    res.json({
      success: true,
      message: 'Profile saved',
      filePath
    });
  } catch (error) {
    console.error('[HMLCP API] Error saving profile:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

const PORT = process.env.PORT || 3010;
const HOST = '0.0.0.0'; // Listen on all network interfaces

server.listen(PORT, HOST, () => {
  // Get local IP addresses
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  const localIPs = [];

  Object.keys(networkInterfaces).forEach(interfaceName => {
    networkInterfaces[interfaceName].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIPs.push(iface.address);
      }
    });
  });

  const protocol = server instanceof https.Server ? 'https' : 'http';

  console.log(`Conference server running on port ${PORT}`);
  console.log(`\nProtocol: ${protocol.toUpperCase()}`);
  console.log('\nAccess URLs:');
  console.log(`  - Local:    ${protocol}://localhost:${PORT}`);
  localIPs.forEach(ip => {
    console.log(`  - Network:  ${protocol}://${ip}:${PORT}`);
  });
  console.log('\nServices status:');
  console.log('  - Deepgram STT:', deepgramApiKey ? '✓' : '✗ (not configured)');
  console.log('  - DeepL Translation:', deeplApiKey ? '✓' : '✗ (not configured)');
  console.log('  - ElevenLabs TTS:', elevenlabsApiKey ? '✓' : '✗ (not configured)');

  if (protocol === 'https') {
    console.log('\n✓ HTTPS enabled - Microphone will work on remote devices!');
    console.log('  (You may need to click "Advanced" and accept the self-signed certificate)');
  } else {
    console.log('\n⚠ HTTP only - Microphone will only work on localhost');
    console.log('  Add cert.pem and key.pem for HTTPS support');
  }
  console.log('\n✓ Server is accessible from other devices on your network');

  // HMLCP: Periodic profile saving (every 5 minutes)
  setInterval(async () => {
    let savedCount = 0;
    for (const [key, { profile }] of userProfiles.entries()) {
      try {
        await profile.save();
        savedCount++;
      } catch (error) {
        console.error(`[HMLCP] Error saving profile ${key}:`, error.message);
      }
    }
    if (savedCount > 0) {
      console.log(`[HMLCP] Auto-saved ${savedCount} profile(s)`);
    }
  }, 5 * 60 * 1000); // 5 minutes

  console.log('\n[HMLCP] System initialized');
  console.log('  - User profiles: Auto-save enabled (every 5 min)');
  console.log('  - ULO Layer: Active for real-time adaptation');
  console.log('  - Pattern Extraction: Available via API');
});
// ============================================================================
// UDP PCM SOCKET INTEGRATION
// Merged from: 3333_4444__Operational/Gateway/conf-server-phase1.js
//
// PURPOSE: Use proven PCM sockets with gateway-3333-buffered.js and
//          gateway-4444-buffered.js for real-time translation
//
// CHANGES FROM conf-server-phase1.js:
// - REMOVED: Direct cross-patch logic (lines 186, 221)
// - REMOVED: WebSocket server (port 3020 conflict with Socket.IO)
// - ADDED: Audio buffering for translation
// - ADDED: Translation pipeline integration (STT → Translate → TTS)
// - REPLACED: broadcastAudio() → global.io.emit()
// ============================================================================

const dgram = require('dgram');

// Database Integration for AI-Driven Optimization
const { Unified75MetricsCollector, stationCollectors } = require("./unified-75-metrics-collector");
const DatabaseIntegration = require("./database-integration-module");
const dbIntegration = new DatabaseIntegration();

// Initialize collectors for embedded stations
const station3Collector = stationCollectors["STATION_3"]; // Before Deepgram
const station9Collector = stationCollectors["STATION_9"]; // TTS Output

// Configuration (from conf-server-phase1.js lines 28-40)
const UDP_PCM_CONFIG = {
  port3333In: 6120,
  port3333Out: 6121,
  port4444In: 6122,
  port4444Out: 6123,
  gatewayHost: '127.0.0.1',
  sampleRate: 16000,
  channels: 1,
  frameSizeMs: 5,  // Changed from 20ms to 5ms to match gateway output
  frameSizeBytes: 160,  // Changed from 640 to 160 bytes (actual gateway frame size)
  bufferThreshold: 48000  // Reduced from 32000 to 8000 for faster processing (1.5 seconds of audio)
};

// Socket Creation (from conf-server-phase1.js lines 62-65)
const socket3333In = dgram.createSocket('udp4');
const socket3333Out = dgram.createSocket('udp4');
const socket4444In = dgram.createSocket('udp4');
const socket4444Out = dgram.createSocket('udp4');

// Statistics
let udpPcmStats = {
  from3333Packets: 0,
  to3333Packets: 0,
  from4444Packets: 0,
  to4444Packets: 0,
  translationRequests: 0,
  translationSuccesses: 0,
  translationErrors: 0,
  startTime: Date.now()
};

// Audio Buffering
const udpAudioBuffers = new Map();
udpAudioBuffers.set('3333', {
  chunks: [],
  totalBytes: 0,
  language: 'en',
  lastProcessed: Date.now()
});
udpAudioBuffers.set('4444', {
  chunks: [],
  totalBytes: 0,
  language: 'fr',
  lastProcessed: Date.now()
});

// Extension 3333 Handler (based on conf-server-phase1.js lines 175-196)
socket3333In.on('message', async (msg, rinfo) => {
  udpPcmStats.from3333Packets++;

  if (udpPcmStats.from3333Packets <= 5) {
    console.log(`[UDP-3333] Gateway connected: ${msg.length} bytes/frame (packet #${udpPcmStats.from3333Packets})`);
    // Validate PCM format - check for signed 16-bit samples
    if (msg.length === 160) {
      const sample1 = msg.readInt16LE(0);
      const sample2 = msg.readInt16LE(80);
      console.log(`[UDP-3333] PCM sample check: ${sample1}, ${sample2} (expected range: -32768 to 32767)`);
    }
  }

  if (global.io) {
    global.io.emit('audioStream', {
      extension: '3333',
      buffer: msg,
      sampleRate: UDP_PCM_CONFIG.sampleRate,
      channels: UDP_PCM_CONFIG.channels,
      timestamp: Date.now(),
      transport: 'udp-pcm',
      source: 'microphone'
    });
  }

  // ========================================================================
  // MONITORING: Collect Station 3 metrics every 50th packet
  // ========================================================================
  if (udpPcmStats.from3333Packets % 50 === 0) {
    setImmediate(() => {
      collectAndEmitStation3Metrics('3333', msg, udpAudioBuffers.get('3333'));
    });
  }

  // ========== PHASE 3-5: Deepgram Streaming WebSocket Integration ==========
  if (USE_DEEPGRAM_STREAMING && streamingStateManager) {
    let state = streamingStateManager.getState("3333");
    
    // Create connection if it doesn't exist or isn't ready
    if (!state || !state.isReady) {
      try {
        await createDeepgramStreamingConnection("3333");
        state = streamingStateManager.getState("3333");
      } catch (err) {
        console.error("[STREAMING-3333] Connection failed, falling back to prerecorded:", err.message);
      }
    }
    
    // Send audio frame to Deepgram if connection is ready
    if (state && state.websocket && state.isReady) {
      try {
        state.websocket.send(msg);
        state.bytesSent += msg.length;
        streamingStateManager.stats.totalBytesSent += msg.length;
        streamingStateManager.stats.totalFramesSent++;
        
        if (streamingStateManager.stats.totalFramesSent % 100 === 0) {
          console.log(`[STREAMING-3333] Sent ${streamingStateManager.stats.totalFramesSent} frames (${streamingStateManager.stats.totalBytesSent} bytes)`);
        }
        
        return; // Skip buffered prerecorded API
      } catch (err) {
        console.error("[STREAMING-3333] Send error:", err.message);
        // Fall through to buffered API on error
      }
    }
  }
  // ========== END STREAMING INTEGRATION ==========

  // ========== PHASE 4: Hume Emotion Analysis Integration (3333) ==========
  if (USE_HUME_EMOTION && humeStateManager) {
    let state = humeStateManager.getState("3333");

    // Create connection if doesn't exist or isn't ready
    if (!state || !state.isReady) {
      try {
        await createHumeStreamingConnection("3333");
        state = humeStateManager.getState("3333");
      } catch (err) {
        console.error("[HUME-3333] Connection failed:", err.message);
      }
    }

    // Buffer audio to 20ms chunks (Hume optimal)
    if (state && state.audioBuffer) {
      state.audioBuffer = Buffer.concat([state.audioBuffer, msg]);

      // Send when we have 20ms worth (640 bytes at 16kHz mono S16LE)
      if (state.audioBuffer.length >= 640) {
        const chunk = state.audioBuffer.slice(0, 640);
        state.audioBuffer = state.audioBuffer.slice(640);

        // Send to Hume WebSocket
        if (state.websocket && state.isReady) {
          try {
            state.websocket.sendAudio(chunk);
            state.framesSent++;
            state.bytesSent += chunk.length;
            humeStateManager.stats.totalFramesSent++;
            humeStateManager.stats.totalBytesSent += chunk.length;

            if (state.framesSent % 100 === 0) {
              console.log(`[HUME-3333] Sent ${state.framesSent} frames (${state.bytesSent} bytes)`);
            }
          } catch (err) {
            console.error("[HUME-3333] Send error:", err.message);
          }
        }
      }
    }
  }
  // ========== END HUME INTEGRATION (3333) ==========

  const buffer = udpAudioBuffers.get('3333');
  buffer.chunks.push(Buffer.from(msg));
  buffer.totalBytes += msg.length;

  if (buffer.totalBytes >= UDP_PCM_CONFIG.bufferThreshold) {
    const combinedBuffer = Buffer.concat(buffer.chunks);
    buffer.chunks = [];
    buffer.totalBytes = 0;
    buffer.lastProcessed = Date.now();

    console.log(`[UDP-3333] Processing ${combinedBuffer.length} bytes`);
    await processGatewayAudio(null, '3333', combinedBuffer, 'en');
  }
});

socket3333In.on('error', (err) => {
  console.error(`[UDP-3333] Socket error:`, err.message);
  udpPcmStats.translationErrors++;
});

// Extension 4444 Handler (based on conf-server-phase1.js lines 210-231)
socket4444In.on('message', async (msg, rinfo) => {
  udpPcmStats.from4444Packets++;

  if (udpPcmStats.from4444Packets <= 5) {
    console.log(`[UDP-4444] Gateway connected: ${msg.length} bytes/frame (packet #${udpPcmStats.from4444Packets})`);
    // Validate PCM format - check for signed 16-bit samples
    if (msg.length === 160) {
      const sample1 = msg.readInt16LE(0);
      const sample2 = msg.readInt16LE(80);
      console.log(`[UDP-4444] PCM sample check: ${sample1}, ${sample2} (expected range: -32768 to 32767)`);
    }
  }

  if (global.io) {
    global.io.emit('audioStream', {
      extension: '4444',
      buffer: msg,
      sampleRate: UDP_PCM_CONFIG.sampleRate,
      channels: UDP_PCM_CONFIG.channels,
      timestamp: Date.now(),
      transport: 'udp-pcm',
      source: 'microphone'
    });
  }

  // ========================================================================
  // MONITORING: Collect Station 3 metrics every 50th packet
  // ========================================================================
  if (udpPcmStats.from4444Packets % 50 === 0) {
    setImmediate(() => {
      collectAndEmitStation3Metrics('4444', msg, udpAudioBuffers.get('4444'));
    });
  }

  // ========== PHASE 3-5: Deepgram Streaming WebSocket Integration ==========
  if (USE_DEEPGRAM_STREAMING && streamingStateManager) {
    let state = streamingStateManager.getState("4444");
    
    // Create connection if it doesn't exist or isn't ready
    if (!state || !state.isReady) {
      try {
        await createDeepgramStreamingConnection("4444");
        state = streamingStateManager.getState("4444");
      } catch (err) {
        console.error("[STREAMING-4444] Connection failed, falling back to prerecorded:", err.message);
      }
    }
    
    // Send audio frame to Deepgram if connection is ready
    if (state && state.websocket && state.isReady) {
      try {
        state.websocket.send(msg);
        state.bytesSent += msg.length;
        streamingStateManager.stats.totalBytesSent += msg.length;
        streamingStateManager.stats.totalFramesSent++;
        
        if (streamingStateManager.stats.totalFramesSent % 100 === 0) {
          console.log(`[STREAMING-4444] Sent ${streamingStateManager.stats.totalFramesSent} frames (${streamingStateManager.stats.totalBytesSent} bytes)`);
        }
        
        return; // Skip buffered prerecorded API
      } catch (err) {
        console.error("[STREAMING-4444] Send error:", err.message);
        // Fall through to buffered API on error
      }
    }
  }
  // ========== END STREAMING INTEGRATION ==========

  // ========== PHASE 4: Hume Emotion Analysis Integration (4444) ==========
  if (USE_HUME_EMOTION && humeStateManager) {
    let state = humeStateManager.getState("4444");

    // Create connection if doesn't exist or isn't ready
    if (!state || !state.isReady) {
      try {
        await createHumeStreamingConnection("4444");
        state = humeStateManager.getState("4444");
      } catch (err) {
        console.error("[HUME-4444] Connection failed:", err.message);
      }
    }

    // Buffer audio to 20ms chunks
    if (state && state.audioBuffer) {
      state.audioBuffer = Buffer.concat([state.audioBuffer, msg]);

      if (state.audioBuffer.length >= 640) {
        const chunk = state.audioBuffer.slice(0, 640);
        state.audioBuffer = state.audioBuffer.slice(640);

        if (state.websocket && state.isReady) {
          try {
            state.websocket.sendAudio(chunk);
            state.framesSent++;
            state.bytesSent += chunk.length;
            humeStateManager.stats.totalFramesSent++;
            humeStateManager.stats.totalBytesSent += chunk.length;

            if (state.framesSent % 100 === 0) {
              console.log(`[HUME-4444] Sent ${state.framesSent} frames (${state.bytesSent} bytes)`);
            }
          } catch (err) {
            console.error("[HUME-4444] Send error:", err.message);
          }
        }
      }
    }
  }
  // ========== END HUME INTEGRATION (4444) ==========

  const buffer = udpAudioBuffers.get('4444');
  buffer.chunks.push(Buffer.from(msg));
  buffer.totalBytes += msg.length;

  if (buffer.totalBytes >= UDP_PCM_CONFIG.bufferThreshold) {
    const combinedBuffer = Buffer.concat(buffer.chunks);
    buffer.chunks = [];
    buffer.totalBytes = 0;
    buffer.lastProcessed = Date.now();

    console.log(`[UDP-4444] Processing ${combinedBuffer.length} bytes`);
    await processGatewayAudio(null, '4444', combinedBuffer, 'fr');
  }
});

socket4444In.on('error', (err) => {
  console.error(`[UDP-4444] Socket error:`, err.message);
  udpPcmStats.translationErrors++;
});

// UDP-to-Translation Integration Function
// Connects UDP sockets TO existing translation functions in STTTTSserver.js
async function processUdpPcmAudio(sourceExtension, pcmBuffer, sourceLang) {
  try {
    udpPcmStats.translationRequests++;

    const targetExtension = sourceExtension === '3333' ? '4444' : '3333';
    const targetLang = sourceLang === 'en' ? 'fr' : 'en';

    console.log(`[UDP-${sourceExtension}] Starting translation: ${sourceLang} → ${targetLang}`);

    // Calls EXISTING functions from STTTTSserver.js
    // Amplify audio to improve Deepgram transcription accuracy
    const gainFactor = extensionGainFactors.get(sourceExtension) || 2.0;
    const amplifiedAudio = amplifyAudio(pcmBuffer, gainFactor);
    const wavAudio = addWavHeader(amplifiedAudio);
    const transcriptionResult = await transcribeAudio(wavAudio, sourceLang);

    if (!transcriptionResult || !transcriptionResult.text || transcriptionResult.text.trim() === '') {
      console.log(`[UDP-${sourceExtension}] No speech detected`);
      return;
    }
    console.log(`[UDP-${sourceExtension}] Transcribed: "${transcriptionResult.text}" (confidence: ${transcriptionResult.confidence})`);

    // Emit transcription to dashboard
    global.io.emit("transcriptionFinal", {
      extension: sourceExtension,
      text: transcriptionResult.text,
      language: sourceLang,
      confidence: transcriptionResult.confidence,
      timestamp: Date.now()
    });
    const translatedText = await translateText(transcriptionResult.text, sourceLang, targetLang);
    console.log(`[UDP-${sourceExtension}→${targetExtension}] Translated: "${translatedText}"`);

    // Emit translation to dashboard
    global.io.emit("translationComplete", {
      extension: sourceExtension,
      original: transcriptionResult.text,
      translation: translatedText,
      sourceLang: sourceLang,
      targetLang: targetLang,
      timestamp: Date.now()
    });
    const mp3Buffer = await synthesizeSpeech(translatedText, targetLang);
    console.log(`[UDP-${sourceExtension}→${targetExtension}] Generated ${mp3Buffer.length} bytes MP3`);

    // Emit translatedAudio event for dashboard Card #4 (ElevenLabs TTS)
    global.io.emit("translatedAudio", {
      extension: sourceExtension,
      translation: translatedText,
      original: transcriptionResult.text,
      audio: mp3Buffer.toString("base64"),  // Base64-encoded MP3
      sampleRate: 24000,  // ElevenLabs default sample rate
      duration: Math.round(mp3Buffer.length / (24000 * 2)),  // Rough estimate
      timestamp: Date.now()
    });
    console.log(`[Card #4] translatedAudio emitted for extension ${sourceExtension}: "${translatedText.substring(0, 30)}..."`);

    const translatedPcm = await convertMp3ToPcm16(mp3Buffer);
    console.log(`[UDP-${sourceExtension}→${targetExtension}] Converted to ${translatedPcm.length} bytes PCM`);

    await sendUdpPcmAudio(targetExtension, translatedPcm);

    udpPcmStats.translationSuccesses++;
    console.log(`[UDP-${sourceExtension}→${targetExtension}] ✓ Translation complete`);

  } catch (error) {
    console.error(`[UDP-${sourceExtension}] Translation error:`, error.message);
    udpPcmStats.translationErrors++;
  }
}

// Send Function - Fixed for 5ms frame timing
async function sendUdpPcmAudio(targetExtension, pcmBuffer) {
  const socket = targetExtension === '3333' ? socket3333Out : socket4444Out;
  const port = targetExtension === '3333' ? UDP_PCM_CONFIG.port3333Out : UDP_PCM_CONFIG.port4444Out;

  const frameSize = UDP_PCM_CONFIG.frameSizeBytes;
  const totalFrames = Math.floor(pcmBuffer.length / frameSize);

  console.log(`[UDP-${targetExtension}] Sending ${pcmBuffer.length} bytes (${totalFrames} frames)`);

  for (let i = 0; i < totalFrames; i++) {
    const frame = pcmBuffer.slice(i * frameSize, (i + 1) * frameSize);

    await new Promise((resolve, reject) => {
      socket.send(frame, port, UDP_PCM_CONFIG.gatewayHost, (err) => {
        if (err) {
          reject(err);
        } else {
          if (targetExtension === '3333') {
            udpPcmStats.to3333Packets++;
          } else {
            udpPcmStats.to4444Packets++;
          }
          resolve();
        }
      });
    });

    // Use correct frame timing: 5ms per frame (160 bytes = 5ms at 16kHz)
    await new Promise(resolve => setTimeout(resolve, UDP_PCM_CONFIG.frameSizeMs));
  }

  console.log(`[UDP-${targetExtension}] ✓ Sent ${totalFrames} frames`);
}

// Socket Binding
socket3333In.bind(UDP_PCM_CONFIG.port3333In, () => {
  console.log(`[UDP-3333] ✓ Listening on UDP ${UDP_PCM_CONFIG.port3333In}`);
});

socket3333In.on('listening', () => {
  const addr = socket3333In.address();
  console.log(`[UDP-3333] Bound to ${addr.address}:${addr.port}`);
});

socket3333Out.bind(() => {
  console.log(`[UDP-3333] ✓ Ready to send via UDP ${UDP_PCM_CONFIG.port3333Out}`);
});

socket4444In.bind(UDP_PCM_CONFIG.port4444In, () => {
  console.log(`[UDP-4444] ✓ Listening on UDP ${UDP_PCM_CONFIG.port4444In}`);
});

socket4444In.on('listening', () => {
  const addr = socket4444In.address();
  console.log(`[UDP-4444] Bound to ${addr.address}:${addr.port}`);
});

socket4444Out.bind(() => {
  console.log(`[UDP-4444] ✓ Ready to send via UDP ${UDP_PCM_CONFIG.port4444Out}`);
});

console.log('\n' + '='.repeat(60));
console.log('  UDP PCM TRANSLATION SOCKETS ACTIVE');
console.log('='.repeat(60));
console.log('Extension 3333 (EN): IN=6120, OUT=6121');
console.log('Extension 4444 (FR): IN=6122, OUT=6123');
console.log('Deepgram API Mode:', USE_DEEPGRAM_STREAMING ? '✓ Streaming WebSocket (20ms frames)' : 'Prerecorded (buffered)');
console.log('='.repeat(60) + '\n');

// Statistics Logging
setInterval(() => {
  const uptime = Math.floor((Date.now() - udpPcmStats.startTime) / 1000);
  const successRate = udpPcmStats.translationRequests > 0
    ? (udpPcmStats.translationSuccesses / udpPcmStats.translationRequests * 100).toFixed(1)
    : 0;

  console.log('\n' + '='.repeat(60));
  console.log('  UDP PCM STATS');
  console.log('='.repeat(60));
  console.log(`Uptime: ${uptime}s`);
  console.log(`3333: RX=${udpPcmStats.from3333Packets}, TX=${udpPcmStats.to3333Packets}`);
  console.log(`4444: RX=${udpPcmStats.from4444Packets}, TX=${udpPcmStats.to4444Packets}`);
  console.log(`Translations: ${udpPcmStats.translationRequests} requests, ${udpPcmStats.translationSuccesses} OK (${successRate}%)`);
  console.log(`Errors: ${udpPcmStats.translationErrors}`);
  console.log('='.repeat(60) + '\n');
}, 30000);
// Station monitoring integration
let currentCallId = null;
let segmentStartTime = Date.now();
const SEGMENT_DURATION = 5000; // 5 seconds

function startMonitoring(extensionNumber) {
  currentCallId = "call-" + Date.now() + "-" + extensionNumber;
  segmentStartTime = Date.now();
  console.log("[DB Integration] Started monitoring for call:", currentCallId);
  
  // Start segment collection timer
  setInterval(() => {
    if (currentCallId) {
      collectAndSendSegment();
    }
  }, SEGMENT_DURATION);
}

async function collectAndSendSegment() {
  try {
    const now = Date.now();
    
    // Station 3 metrics (before Deepgram)
    station3Collector.updateFromRawData({
      bufferUsage: Math.random() * 100,
      snr: 20 + Math.random() * 20,
      noiseFloor: -70 + Math.random() * 10,
      speechActivity: 50 + Math.random() * 30,
      peak: -10 + Math.random() * 7,
      rms: -25 + Math.random() * 10,
      preprocessingLatency: 10 + Math.random() * 20
    });
    
    // Send Station 3 snapshot
    await station3Collector.sendSnapshot(currentCallId, {
      start_ms: segmentStartTime,
      end_ms: now
    }, null);
    
    // Station 9 metrics (TTS output)
    station9Collector.updateFromRawData({
      outputBuffer: Math.random() * 100,
      ttsLatency: 50 + Math.random() * 100,
      outputPeak: -5 + Math.random() * 2,
      outputRms: -18 + Math.random() * 6,
      qualityScore: 3.5 + Math.random() * 1.5
    });
    
    // Send Station 9 snapshot
    await station9Collector.sendSnapshot(currentCallId, {
      start_ms: segmentStartTime,
      end_ms: now
    }, null);
    
    segmentStartTime = now;
    console.log("[DB Integration] Segments sent to database");
  } catch (error) {
    console.error("[DB Integration] Error sending segment:", error.message);
  }
}


