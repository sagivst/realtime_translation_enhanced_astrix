# HUME AI EMOTION INTEGRATION - Complete Implementation Guide

**Date**: 2025-11-24
**System**: 3333_4444__Operational
**Status**: Phase 1 Complete | Phases 2-7 Ready for Implementation

---

## PHASE 1: Infrastructure Setup ✅ COMPLETE

### Completed Items
- ✅ Hume SDK installed: `npm install hume --save` (4 packages added)
- ✅ `HUME_EVI_API_KEY` already configured in `.env.externalmedia`
- ✅ `USE_HUME_EMOTION=false` feature flag added to `.env.externalmedia`

### Configuration
```bash
# .env.externalmedia (lines 13-14)
HUME_EVI_API_KEY=ZO4I7zffvMCBTwytSvoCnSI9CrZjYfjdytH0039ST3CGgi1I

# Feature flag (added at end of file)
USE_HUME_EMOTION=false  # Set to true to enable
```

---

## PHASE 2: HumeStreamingStateManager Class

### Location
`STTTTSserver.js` - Insert after `DeepgramStreamingStateManager` class (around line 240)

### Complete Code

```javascript
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
if (process.env.USE_HUME_EMOTION === 'true') {
  humeStateManager = new HumeStreamingStateManager();
}
// ========== END HUME STATE MANAGER ==========
```

---

## PHASE 3: Hume WebSocket Connection Functions

### Location
`STTTTSserver.js` - Insert after Deepgram connection functions (around line 356)

### Complete Code

```javascript
// ========== HUME WEBSOCKET CONNECTION MANAGEMENT ==========

/**
 * Create Hume Streaming WebSocket connection for emotion/prosody analysis
 * @param {string} extensionId - "3333" or "4444"
 * @returns {Promise<void>}
 */
async function createHumeStreamingConnection(extensionId) {
  if (!USE_HUME_EMOTION || !humeStateManager) {
    console.log(`[HUME] Emotion analysis disabled (USE_HUME_EMOTION=false)`);
    return;
  }

  console.log(`[HUME-WS] Creating Hume streaming connection for extension ${extensionId}`);

  try {
    // Initialize state if not exists
    let state = humeStateManager.getState(extensionId);
    if (!state) {
      state = humeStateManager.initExtension(extensionId);
    }

    // Import Hume SDK
    const { HumeClient } = require('hume');

    // Create Hume client
    const client = new HumeClient({
      apiKey: process.env.HUME_EVI_API_KEY
    });

    // Configure for prosody model (emotion + voice characteristics)
    const config = {
      prosody: {
        identify_speakers: false,  // Single speaker per channel
        granularity: 'word'  // Word-level emotion analysis
      }
    };

    // Connect to Hume streaming API
    const socket = await client.empathicVoice.chat.connect(config);

    // Store WebSocket connection
    state.websocket = socket;
    humeStateManager.stats.totalConnectionsCreated++;

    // ===== EVENT HANDLERS =====

    // Connection opened
    socket.on('open', () => {
      console.log(`[HUME-WS] ✓ Connection opened for extension ${extensionId}`);
      humeStateManager.updateConnection(extensionId, socket, true, true);
    });

    // Emotion/Prosody results received
    socket.on('message', (message) => {
      try {
        const data = JSON.parse(message);

        // Extract emotion scores and prosody features
        if (data.prosody && data.prosody.scores) {
          const emotionData = {
            extensionId: extensionId,
            emotions: data.prosody.scores.slice(0, 5),  // Top 5 emotions
            prosody: {
              pitch: data.prosody.pitch || { mean: 0, variance: 0 },
              energy: data.prosody.energy || { mean: 0, variance: 0 },
              speaking_rate: data.prosody.speaking_rate || 0,
              valence: calculateValence(data.prosody.scores),  // -1 to 1
              arousal: calculateArousal(data.prosody.scores)   // 0 to 1
            },
            timestamp: Date.now()
          };

          // Store latest emotion
          humeStateManager.storeEmotion(extensionId, emotionData);

          // Emit to dashboard
          if (global.io) {
            global.io.emit('emotionData', emotionData);
          }

          console.log(`[HUME-WS] Emotion for ${extensionId}: ${emotionData.emotions[0].name} (${(emotionData.emotions[0].score * 100).toFixed(1)}%)`);
        }
      } catch (err) {
        console.error(`[HUME-WS] Error processing message:`, err.message);
      }
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`[HUME-WS] ⚠ Error for extension ${extensionId}:`, error.message);
      humeStateManager.stats.errors++;
      humeStateManager.updateConnection(extensionId, null, false, false);
    });

    // Connection closed
    socket.on('close', (code, reason) => {
      console.log(`[HUME-WS] Connection closed for extension ${extensionId} (code: ${code}, reason: ${reason || 'N/A'})`);
      humeStateManager.updateConnection(extensionId, null, false, false);
    });

    console.log(`[HUME-WS] ✓ Hume streaming connection created for extension ${extensionId}`);

  } catch (error) {
    console.error(`[HUME-WS] Failed to create connection for ${extensionId}:`, error.message);
    humeStateManager.stats.errors++;
    throw error;
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
    humeStateManager.cleanup(extensionId);
  } catch (error) {
    console.error(`[HUME-WS] Error closing connection for ${extensionId}:`, error.message);
  }
}

/**
 * Calculate valence (-1 to 1) from emotion scores
 * Positive emotions increase valence, negative decrease it
 */
function calculateValence(emotionScores) {
  const positiveEmotions = ['Joy', 'Excitement', 'Interest', 'Love', 'Pride', 'Amusement'];
  const negativeEmotions = ['Anger', 'Fear', 'Sadness', 'Disgust', 'Anxiety', 'Shame'];

  let valence = 0;
  emotionScores.forEach(emotion => {
    if (positiveEmotions.includes(emotion.name)) {
      valence += emotion.score;
    } else if (negativeEmotions.includes(emotion.name)) {
      valence -= emotion.score;
    }
  });

  // Normalize to -1 to 1
  return Math.max(-1, Math.min(1, valence));
}

/**
 * Calculate arousal (0 to 1) from emotion scores
 * High-energy emotions increase arousal
 */
function calculateArousal(emotionScores) {
  const highArousalEmotions = ['Anger', 'Fear', 'Excitement', 'Anxiety', 'Surprise'];
  const lowArousalEmotions = ['Sadness', 'Calm', 'Boredom', 'Tiredness'];

  let arousal = 0.5; // Neutral baseline
  emotionScores.forEach(emotion => {
    if (highArousalEmotions.includes(emotion.name)) {
      arousal += emotion.score * 0.5;
    } else if (lowArousalEmotions.includes(emotion.name)) {
      arousal -= emotion.score * 0.5;
    }
  });

  // Normalize to 0 to 1
  return Math.max(0, Math.min(1, arousal));
}

// ========== END HUME WEBSOCKET MANAGEMENT ==========
```

---

## PHASE 4: UDP Audio Pipeline Integration

### Location
`STTTTSserver.js` - Insert in UDP handlers for 3333 and 4444

### Integration Point 1: socket3333In Handler (after io.emit, around line 3037)

```javascript
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
```

### Integration Point 2: socket4444In Handler (after io.emit, around line 3118)

```javascript
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
```

---

## PHASE 5: Emotion-to-ElevenLabs Mapper

### Location
`STTTTSserver.js` - Insert before `synthesizeSpeech` function

### Complete Code

```javascript
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
  const voiceId = targetLang === 'en' ? ELEVENLABS_VOICE_EN : ELEVENLABS_VOICE_FR;

  // Get latest emotion data for this extension
  let emotionContext = null;
  if (USE_HUME_EMOTION && humeStateManager) {
    emotionContext = humeStateManager.getLatestEmotion(sourceExtension);
  }

  // Map emotion to TTS parameters
  const voiceSettings = mapEmotionToTTS(emotionContext);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: voiceSettings
      })
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

// ========== END EMOTION-AWARE TTS MAPPER ==========
```

---

## PHASE 6: Update ElevenLabs TTS Call

### Location
`STTTTSserver.js` - Find all calls to `synthesizeSpeech` and replace

### Current Code (Line ~3299)
```javascript
const mp3Buffer = await synthesizeSpeech(translatedText, targetLang);
```

### Updated Code
```javascript
const mp3Buffer = await synthesizeSpeechWithEmotion(translatedText, targetLang, sourceExtension);
```

**Apply this change to ALL occurrences of `synthesizeSpeech` in the translation pipeline.**

---

## PHASE 7: Dashboard Card #5

### Location
`public/dashboard-single.html` - Add after Card #4 (around line 1680)

### Complete HTML

```html
<!-- 5. Hume AI (Emotion/Prosody Analysis) -->
<div class="card">
    <div class="card-header">
        <div class="card-title">
            <div class="service-icon" style="background: #f59e0b;">🎭</div>
            <span>5. Hume AI (Emotion/Prosody)</span>
        </div>
        <span class="status-badge" id="humeStatus">⏸ Idle</span>
    </div>

    <div class="emotion-container">
        <!-- Valence/Arousal 2D Plot -->
        <div class="emotion-plot">
            <canvas id="emotionPlot" width="300" height="300"></canvas>
            <div class="plot-labels">
                <span class="label-top">Excited</span>
                <span class="label-right">Positive</span>
                <span class="label-bottom">Calm</span>
                <span class="label-left">Negative</span>
            </div>
        </div>

        <!-- Top 3 Emotions -->
        <div class="emotions-list">
            <h4>Top Emotions</h4>
            <div id="emotionBars"></div>
        </div>

        <!-- Prosody Metrics -->
        <div class="prosody-metrics">
            <h4>Voice Characteristics</h4>
            <div class="metric">
                <span class="metric-label">Pitch:</span>
                <span class="metric-value" id="pitchValue">--</span>
            </div>
            <div class="metric">
                <span class="metric-label">Energy:</span>
                <span class="metric-value" id="energyValue">--</span>
            </div>
            <div class="metric">
                <span class="metric-label">Speaking Rate:</span>
                <span class="metric-value" id="rateValue">--</span>
            </div>
        </div>
    </div>
</div>

<style>
.emotion-container {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 20px;
    padding: 15px;
}

.emotion-plot {
    position: relative;
}

.plot-labels {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.plot-labels span {
    position: absolute;
    font-size: 11px;
    color: #6b7280;
    font-weight: 600;
}

.label-top { top: 5px; left: 50%; transform: translateX(-50%); }
.label-right { right: 5px; top: 50%; transform: translateY(-50%); }
.label-bottom { bottom: 5px; left: 50%; transform: translateX(-50%); }
.label-left { left: 5px; top: 50%; transform: translateY(-50%); }

.emotions-list, .prosody-metrics {
    background: #f9fafb;
    border-radius: 8px;
    padding: 15px;
}

.emotions-list h4, .prosody-metrics h4 {
    margin: 0 0 12px 0;
    font-size: 13px;
    color: #374151;
    font-weight: 600;
}

#emotionBars .emotion-bar {
    margin-bottom: 10px;
}

.emotion-bar-label {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    margin-bottom: 4px;
}

.emotion-bar-fill {
    height: 20px;
    background: linear-gradient(90deg, #f59e0b, #fbbf24);
    border-radius: 4px;
    transition: width 0.3s ease;
}

.prosody-metrics .metric {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #e5e7eb;
}

.metric:last-child {
    border-bottom: none;
}

.metric-label {
    font-size: 12px;
    color: #6b7280;
}

.metric-value {
    font-size: 12px;
    font-weight: 600;
    color: #111827;
}
</style>
```

### JavaScript Handler (Add to `<script>` section around line 3361)

```javascript
// ========== HUME EMOTION DATA HANDLER ==========

let emotionPlotCtx = null;
let emotionPlotInitialized = false;

// Initialize emotion plot canvas
function initEmotionPlot() {
    if (emotionPlotInitialized) return;

    const canvas = document.getElementById('emotionPlot');
    if (!canvas) return;

    emotionPlotCtx = canvas.getContext('2d');
    emotionPlotInitialized = true;

    // Draw grid
    drawEmotionGrid();
}

function drawEmotionGrid() {
    if (!emotionPlotCtx) return;

    const canvas = emotionPlotCtx.canvas;
    const ctx = emotionPlotCtx;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Vertical center line
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // Horizontal center line
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Quadrants background
    ctx.globalAlpha = 0.1;

    // Top-right (Excited + Positive)
    ctx.fillStyle = '#10b981';
    ctx.fillRect(canvas.width / 2, 0, canvas.width / 2, canvas.height / 2);

    // Top-left (Excited + Negative)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0, 0, canvas.width / 2, canvas.height / 2);

    // Bottom-right (Calm + Positive)
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2);

    // Bottom-left (Calm + Negative)
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(0, canvas.height / 2, canvas.width / 2, canvas.height / 2);

    ctx.globalAlpha = 1.0;
}

function plotEmotionPoint(valence, arousal) {
    if (!emotionPlotCtx) {
        initEmotionPlot();
    }

    if (!emotionPlotCtx) return;

    const canvas = emotionPlotCtx.canvas;

    // Redraw grid
    drawEmotionGrid();

    // Convert valence (-1 to 1) and arousal (0 to 1) to canvas coordinates
    const x = ((valence + 1) / 2) * canvas.width;  // -1 to 1 → 0 to width
    const y = (1 - arousal) * canvas.height;  // 1 to 0 → 0 to height (inverted Y)

    // Draw point
    emotionPlotCtx.fillStyle = '#f59e0b';
    emotionPlotCtx.beginPath();
    emotionPlotCtx.arc(x, y, 8, 0, 2 * Math.PI);
    emotionPlotCtx.fill();

    // Draw ring
    emotionPlotCtx.strokeStyle = '#fff';
    emotionPlotCtx.lineWidth = 2;
    emotionPlotCtx.stroke();
}

// Listen for emotion data from server
socket.on('emotionData', (data) => {
    // Filter by extension if needed
    if (filterExtension && data.extensionId !== filterExtension) {
        return;
    }

    console.log('[Dashboard] Emotion data received:', data);

    // Update status badge
    const statusBadge = document.getElementById('humeStatus');
    if (statusBadge) {
        statusBadge.textContent = '🟢 Active';
        statusBadge.style.color = '#10b981';
    }

    // Plot valence/arousal
    if (data.prosody) {
        plotEmotionPoint(data.prosody.valence, data.prosody.arousal);
    }

    // Display top 3 emotions
    if (data.emotions && data.emotions.length > 0) {
        const emotionBars = document.getElementById('emotionBars');
        if (emotionBars) {
            emotionBars.innerHTML = data.emotions.slice(0, 3).map(emotion => `
                <div class="emotion-bar">
                    <div class="emotion-bar-label">
                        <span>${emotion.name}</span>
                        <span>${(emotion.score * 100).toFixed(1)}%</span>
                    </div>
                    <div class="emotion-bar-fill" style="width: ${emotion.score * 100}%"></div>
                </div>
            `).join('');
        }
    }

    // Update prosody metrics
    if (data.prosody) {
        const pitchValue = document.getElementById('pitchValue');
        const energyValue = document.getElementById('energyValue');
        const rateValue = document.getElementById('rateValue');

        if (pitchValue && data.prosody.pitch) {
            pitchValue.textContent = `${data.prosody.pitch.mean.toFixed(0)} Hz`;
        }

        if (energyValue && data.prosody.energy) {
            energyValue.textContent = `${(data.prosody.energy.mean * 100).toFixed(0)}%`;
        }

        if (rateValue && data.prosody.speaking_rate) {
            rateValue.textContent = `${data.prosody.speaking_rate.toFixed(1)} syl/sec`;
        }
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initEmotionPlot();
});

// ========== END HUME EMOTION HANDLER ==========
```

---

## PHASE 8: Testing & Deployment

### Testing Checklist

1. **Verify Installation**
```bash
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
npm list hume
# Should show: hume@<version>
```

2. **Syntax Validation**
```bash
node --check STTTTSserver.js
# Should return no errors
```

3. **Enable Feature Flag**
```bash
nano .env.externalmedia
# Change: USE_HUME_EMOTION=false
# To: USE_HUME_EMOTION=true
# Save: Ctrl+O, Enter, Ctrl+X
```

4. **Restart Server**
```bash
# Stop current server
ps aux | grep '[S]TTTTSserver' | awk '{print $2}' | xargs -r kill -9

# Start with emotion enabled
nohup node STTTTSserver.js > /tmp/STTTTSserver-operational.log 2>&1 &
```

5. **Verify Startup**
```bash
head -100 /tmp/STTTTSserver-operational.log | grep -E 'HUME|Emotion'
# Expected: "[HUME-STATE] Hume Emotion State Manager initialized"
```

6. **Monitor Live**
```bash
tail -f /tmp/STTTTSserver-operational.log | grep --line-buffered 'HUME'
```

7. **Test Call**
- Call extension 3333
- Speak with clear emotion (excited, calm, etc.)
- Watch dashboard Card #5 for emotion updates
- Check logs for `[HUME-WS]` messages

8. **Verify Dashboard**
- Open http://20.170.155.53:3020/dashboard.html
- Card #5 should show "🟢 Active" when call is active
- Emotion plot should update in real-time
- Top 3 emotions should display
- Prosody metrics should update

---

## ROLLBACK PROCEDURE

If issues occur:

### Instant Rollback (No Code Changes)
```bash
# 1. Stop server
ps aux | grep '[S]TTTTSserver' | awk '{print $2}' | xargs -r kill -9

# 2. Disable feature flag
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
sed -i 's/USE_HUME_EMOTION=true/USE_HUME_EMOTION=false/' .env.externalmedia

# 3. Restart
nohup node STTTTSserver.js > /tmp/STTTTSserver-operational.log 2>&1 &

# 4. Verify
head -25 /tmp/STTTTSserver-operational.log | grep "Emotion analysis disabled"
```

System immediately reverts to standard translation pipeline.

---

## ARCHITECTURE SUMMARY

```
Audio Input (3333/4444)
    ↓
UDP PCM 16kHz
    ↓
    ├─→ Deepgram STT → DeepL MT → ElevenLabs TTS (emotion-aware)
    │                                      ↑
    └─→ Hume Emotion Analysis ─────────────┴─→ Dashboard Card #5
```

**Key Points:**
- Parallel processing: Hume doesn't block translation
- Emotion data enhances TTS: Voice matches caller mood
- Real-time dashboard: Visual emotion feedback
- Feature flag: Safe enable/disable

---

## COMPLETED STATUS

### ✅ Phase 1: Infrastructure
- Hume SDK installed
- API key configured
- Feature flag added

### ⏸ Phases 2-7: Implementation Pending
- State manager class code provided
- WebSocket connection functions provided
- UDP integration points documented
- Emotion mapper code provided
- Dashboard card HTML/JS provided

---

**Document Version**: 1.0
**Last Updated**: 2025-11-24
**Ready for**: Phases 2-7 Implementation
