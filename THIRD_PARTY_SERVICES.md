# Third Party Services Configuration & Monitoring

**Last Updated**: 2025-10-16
**Purpose**: Complete mapping of all external service dependencies with latency tracking

---

## Overview

The real-time translation system integrates with 4 major third-party services:

1. **Deepgram** - Automatic Speech Recognition (ASR)
2. **DeepL** - Machine Translation (MT)
3. **ElevenLabs** - Text-to-Speech (TTS)
4. **Hume AI** - Emotion Voice Interface (EVI)

Each service has specific latency requirements and monitoring points.

---

## 1. Deepgram (Speech Recognition)

### Configuration
```javascript
// Environment Variables
DEEPGRAM_API_KEY=<your-key>

// Service Configuration
{
  endpoint: 'wss://api.deepgram.com/v1/listen',
  model: 'nova-2',
  language: 'en-US', // or auto-detect
  sampleRate: 16000,
  encoding: 'linear16',
  channels: 1,
  interim_results: true,
  punctuate: true,
  utterance_end_ms: 1000
}
```

### Integration Points

#### Entry Point 1: WebSocket Connection
**File**: `asr-streaming-worker.js:85`
**Function**: `connect()`
**Measurement**:
```javascript
const connectStart = Date.now();
await this.deepgramSocket.connect();
const connectLatency = Date.now() - connectStart;
// Target: <500ms
```

#### Entry Point 2: Audio Stream Start
**File**: `asr-streaming-worker.js:145`
**Function**: `startStreaming()`
**Measurement**:
```javascript
const streamStart = Date.now();
this.deepgramSocket.send(audioChunk);
// First interim result latency tracked
```

#### Entry Point 3: Audio Chunk Processing
**File**: `asr-streaming-worker.js:178`
**Function**: `processAudioSegment()`
**Measurement**:
```javascript
// Track per-chunk latency
this.metrics.chunkSent = Date.now();
this.deepgramSocket.send(pcmBuffer);

// On interim result received:
this.metrics.interimLatency = Date.now() - this.metrics.chunkSent;
// Target: <150ms for interim, <250ms for final
```

#### Exit Point: Transcript Received
**File**: `asr-streaming-worker.js:215`
**Event**: `onTranscript`
**Measurement**:
```javascript
// Full ASR latency from speech end to transcript
const asrLatency = Date.now() - this.audioSegmentStart;

this.emit('transcript', {
  text: transcript.text,
  confidence: transcript.confidence,
  is_final: transcript.is_final,
  latency: asrLatency,
  timestamp: Date.now()
});
```

### Monitoring Metrics
```javascript
{
  connection: {
    connectTime: 0,        // WebSocket connection time
    reconnects: 0,         // Number of reconnections
    errors: 0              // Connection errors
  },
  latency: {
    interim: [],           // Interim result latencies
    final: [],             // Final result latencies
    p50: 0,
    p95: 0,
    p99: 0
  },
  transcription: {
    totalChunks: 0,        // Audio chunks processed
    totalWords: 0,         // Words transcribed
    avgConfidence: 0.0     // Average confidence score
  }
}
```

### Error Handling
```javascript
// Network errors
on('error', (error) => {
  console.error('[Deepgram] Error:', error.message);
  this.metrics.errors++;
  this.reconnect(); // Exponential backoff
});

// Timeout handling
if (asrLatency > 1000) {
  console.warn('[Deepgram] High latency detected:', asrLatency, 'ms');
}
```

### Target Latency
- **Connection**: <500ms
- **Interim Results**: <150ms
- **Final Results**: <250ms
- **Total ASR (p95)**: <250ms

---

## 2. DeepL (Machine Translation)

### Configuration
```javascript
// Environment Variables
DEEPL_API_KEY=<your-key>

// Service Configuration
{
  endpoint: 'https://api.deepl.com/v2/translate',
  apiType: 'pro', // or 'free'
  sourceLang: 'EN',
  targetLang: 'ES',
  formality: 'default', // 'more', 'less', 'default'
  preserveFormatting: true,
  contextWindow: 500 // characters
}
```

### Integration Points

#### Entry Point: Translation Request
**File**: `deepl-incremental-mt.js:245`
**Function**: `translate()`
**Measurement**:
```javascript
const translateStart = Date.now();

const response = await fetch('https://api.deepl.com/v2/translate', {
  method: 'POST',
  headers: {
    'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: [textToTranslate],
    source_lang: sourceLang,
    target_lang: targetLang,
    context: this.getContext(sessionId) // Previous 500 chars
  })
});

const translateLatency = Date.now() - translateStart;
// Target: <200ms
```

#### Exit Point: Translation Received
**File**: `deepl-incremental-mt.js:285`
**Function**: `onTranslationComplete`
**Measurement**:
```javascript
const data = await response.json();
const translation = data.translations[0].text;

this.emit('translation_complete', {
  original: textToTranslate,
  translated: translation,
  sourceLang: sourceLang,
  targetLang: targetLang,
  latency: translateLatency,
  cached: false, // or true if from cache
  timestamp: Date.now()
});
```

### Context Management
**File**: `deepl-incremental-mt.js:195`
**Function**: `updateContext()`
```javascript
// Track context for better translation quality
const sessionContext = {
  sessionId: sessionId,
  history: [], // Last 500 chars of conversation
  lastUpdate: Date.now()
};

// Context affects translation quality, not latency
```

### Caching Strategy
**File**: `deepl-incremental-mt.js:145`
**Function**: `getCachedTranslation()`
```javascript
// Cache frequently used phrases (1 min TTL)
const cacheKey = `${text}:${sourceLang}:${targetLang}`;
const cached = this.cache.get(cacheKey);

if (cached && Date.now() - cached.timestamp < 60000) {
  // Return cached translation (latency: <1ms)
  return cached.translation;
}
```

### Monitoring Metrics
```javascript
{
  requests: {
    total: 0,              // Total translation requests
    successful: 0,         // Successful translations
    failed: 0,             // Failed requests
    cached: 0,             // Cache hits
    cacheHitRate: 0.0      // Percentage
  },
  latency: {
    api: [],               // DeepL API response times
    cached: [],            // Cache lookup times
    p50: 0,
    p95: 0,
    p99: 0
  },
  quality: {
    avgSourceLength: 0,    // Average source text length
    avgTargetLength: 0,    // Average translated length
    contextUsage: 0        // Times context improved translation
  },
  quota: {
    charactersUsed: 0,     // Characters translated
    charactersLimit: 500000, // Monthly limit
    usagePercentage: 0.0
  }
}
```

### Error Handling
```javascript
// API errors
if (response.status === 429) {
  // Rate limit exceeded
  console.warn('[DeepL] Rate limit exceeded, using fallback');
  this.useFallbackTranslator();
}

if (response.status === 456) {
  // Quota exceeded
  console.error('[DeepL] Quota exceeded');
  this.emit('quota_exceeded');
}

// Timeout handling
if (translateLatency > 500) {
  console.warn('[DeepL] High latency detected:', translateLatency, 'ms');
}
```

### Target Latency
- **API Request**: <200ms
- **With Context**: <250ms
- **Cached**: <1ms
- **Total MT (p95)**: <200ms

---

## 3. ElevenLabs (Text-to-Speech)

### Configuration
```javascript
// Environment Variables
ELEVENLABS_API_KEY=<your-key>

// Service Configuration
{
  endpoint: 'https://api.elevenlabs.io/v1/text-to-speech',
  voiceId: 'EXAVITQu4vr4xnSDxMaL', // Default voice
  model: 'eleven_turbo_v2', // Fast model
  voiceSettings: {
    stability: 0.5,        // 0-1 (dynamic to consistent)
    similarity_boost: 0.75, // 0-1 (stay close to voice)
    style: 0.5,            // 0-1 (neutral to expressive)
    use_speaker_boost: true
  },
  outputFormat: 'pcm_16000' // 16kHz PCM for Asterisk
}
```

### Integration Points

#### Entry Point: TTS Request
**File**: `elevenlabs-tts-service.js:125`
**Function**: `synthesize()`
**Measurement**:
```javascript
const ttsStart = Date.now();

const response = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
  {
    method: 'POST',
    headers: {
      'xi-api-key': this.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: textToSynthesize,
      model_id: 'eleven_turbo_v2',
      voice_settings: voiceSettings
    })
  }
);

const ttsLatency = Date.now() - ttsStart;
// Target: <250ms
```

#### Entry Point (with Emotion): Emotion-Aware TTS
**File**: `elevenlabs-tts-service.js:215`
**Function**: `synthesizeWithEmotion()`
**Measurement**:
```javascript
// Map emotion vector to voice settings
const emotionStart = Date.now();
const voiceSettings = this.emotionToVoiceSettings(emotionVector);
const emotionMappingLatency = Date.now() - emotionStart;
// Target: <5ms (local computation)

const ttsStart = Date.now();
const audio = await this.synthesize(text, voiceSettings);
const ttsLatency = Date.now() - ttsStart;
// Target: <250ms

const totalLatency = emotionMappingLatency + ttsLatency;
```

#### Exit Point: Audio Received
**File**: `elevenlabs-tts-service.js:285`
**Function**: `onAudioComplete`
**Measurement**:
```javascript
const audioBuffer = await response.arrayBuffer();
const pcmData = Buffer.from(audioBuffer);

// Convert to 20ms frames (640 bytes @ 16kHz)
const frames = this.audioToFrames(pcmData);

this.emit('audio_ready', {
  text: textToSynthesize,
  frames: frames,
  sampleRate: 16000,
  duration: frames.length * 20, // milliseconds
  latency: ttsLatency,
  emotion: emotionVector || null,
  timestamp: Date.now()
});
```

### Monitoring Metrics
```javascript
{
  requests: {
    total: 0,              // Total TTS requests
    successful: 0,         // Successful syntheses
    failed: 0,             // Failed requests
    withEmotion: 0         // Emotion-aware syntheses
  },
  latency: {
    api: [],               // ElevenLabs API response times
    emotionMapping: [],    // Emotion mapping times
    total: [],             // Total latency (with emotion)
    p50: 0,
    p95: 0,
    p99: 0
  },
  audio: {
    totalCharacters: 0,    // Characters synthesized
    totalDuration: 0,      // Total audio duration (seconds)
    avgFrames: 0           // Average frames per synthesis
  },
  quality: {
    avgTextLength: 0,      // Average input text length
    voiceChanges: 0        // Times voice settings modified
  },
  quota: {
    charactersUsed: 0,     // Characters synthesized
    charactersLimit: 10000, // Monthly limit
    usagePercentage: 0.0
  }
}
```

### Error Handling
```javascript
// API errors
if (response.status === 429) {
  // Rate limit exceeded
  console.warn('[ElevenLabs] Rate limit exceeded');
  this.emit('rate_limit');
}

if (response.status === 401) {
  // Invalid API key
  console.error('[ElevenLabs] Authentication failed');
  this.emit('auth_error');
}

// Timeout handling
if (ttsLatency > 500) {
  console.warn('[ElevenLabs] High latency detected:', ttsLatency, 'ms');
}

// Audio quality check
if (frames.length === 0) {
  console.error('[ElevenLabs] Empty audio received');
  this.emit('audio_error');
}
```

### Target Latency
- **API Request**: <250ms
- **Emotion Mapping**: <5ms
- **Audio Processing**: <20ms
- **Total TTS (p95)**: <250ms

---

## 4. Hume AI EVI (Emotion Analysis)

### Configuration
```javascript
// Environment Variables
HUME_API_KEY=<your-key>

// Service Configuration
{
  endpoint: 'wss://api.hume.ai/v0/stream/evi',
  model: 'evi-1',
  audioFormat: {
    sampleRate: 16000,
    encoding: 'pcm_s16le',
    channels: 1
  },
  contextWindow: 5000, // 5 seconds of audio
  emotionDimensions: ['arousal', 'valence', 'dominance'],
  prosodyFeatures: ['pitch', 'rate', 'energy']
}
```

### Integration Points

#### Entry Point 1: WebSocket Connection
**File**: `hume-evi-adapter.js:95`
**Function**: `connect()`
**Measurement**:
```javascript
const connectStart = Date.now();
await this.humeSocket.connect();
const connectLatency = Date.now() - connectStart;
// Target: <500ms
```

#### Entry Point 2: Audio Streaming
**File**: `hume-evi-adapter.js:165`
**Function**: `pushAudioFrame()`
**Measurement**:
```javascript
// Push 20ms audio frame for emotion analysis
const frameStart = Date.now();
this.humeSocket.send({
  type: 'audio',
  data: pcmFrame, // 640 bytes
  timestamp: Date.now()
});

// Track when emotion analysis completes
this.frameTimestamps.set(frameId, frameStart);
```

#### Exit Point: Emotion Vector Received
**File**: `hume-evi-adapter.js:235`
**Function**: `onEmotionResult`
**Measurement**:
```javascript
const frameId = result.frame_id;
const frameStart = this.frameTimestamps.get(frameId);
const emotionLatency = Date.now() - frameStart;
// Target: <200ms

const emotionVector = {
  arousal: result.prosody.arousal,      // 0-1
  valence: result.prosody.valence,      // -1 to 1
  dominance: result.prosody.dominance,  // 0-1
  energy: result.prosody.energy,        // 0-1
  pitch: result.prosody.pitch,          // Hz
  rate: result.prosody.rate,            // words/min
  latency: emotionLatency,
  timestamp: Date.now()
};

this.emit('emotion_detected', emotionVector);
```

### Context Window Management
**File**: `hume-evi-adapter.js:185`
**Function**: `manageContextWindow()`
```javascript
// Maintain 5-second audio buffer for context
const contextDuration = 5000; // 5 seconds
const maxFrames = contextDuration / 20; // 250 frames

if (this.audioBuffer.length > maxFrames) {
  // Remove old frames
  this.audioBuffer.shift();
}

// Push new frame
this.audioBuffer.push(pcmFrame);
```

### Monitoring Metrics
```javascript
{
  connection: {
    connectTime: 0,        // WebSocket connection time
    reconnects: 0,         // Number of reconnections
    errors: 0              // Connection errors
  },
  latency: {
    emotion: [],           // Emotion detection latencies
    p50: 0,
    p95: 0,
    p99: 0
  },
  analysis: {
    totalFrames: 0,        // Audio frames analyzed
    emotionChanges: 0,     // Significant emotion shifts
    avgArousal: 0.0,       // Average arousal level
    avgValence: 0.0,       // Average valence level
    avgEnergy: 0.0         // Average energy level
  },
  prosody: {
    avgPitch: 0,           // Average pitch (Hz)
    avgRate: 0,            // Average speech rate (words/min)
    pitchVariance: 0       // Pitch variation
  }
}
```

### Error Handling
```javascript
// Network errors
on('error', (error) => {
  console.error('[Hume EVI] Error:', error.message);
  this.metrics.errors++;
  this.reconnect(); // Exponential backoff
});

// Timeout handling
if (emotionLatency > 500) {
  console.warn('[Hume EVI] High latency detected:', emotionLatency, 'ms');
}

// Fallback for missing emotion
if (!result || !result.prosody) {
  // Use neutral emotion vector
  return this.getNeutralEmotion();
}
```

### Target Latency
- **Connection**: <500ms
- **Emotion Detection**: <200ms
- **Context Window**: 5 seconds
- **Total EVI (p95)**: <200ms (non-blocking)

---

## Combined Latency Tracking

### End-to-End Pipeline
```
Speaker → [20ms frames] → Prosodic Segmenter
                              ↓
                         [ENTRY: ASR]
                         Deepgram WebSocket
                         [EXIT: Transcript] (~250ms)
                              ↓
                         [ENTRY: MT]
                         DeepL API
                         [EXIT: Translation] (~200ms)
                              ↓
                         [ENTRY: TTS]
                         ElevenLabs API
                         [EXIT: Audio] (~250ms)
                              ↓
                         Pacing Governor (20ms cadence)
                              ↓
                         Listener

Parallel Path (non-blocking):
Speaker → [20ms frames] → [ENTRY: EVI]
                         Hume AI WebSocket
                         [EXIT: Emotion] (~200ms)
                              ↓
                         Applied to TTS
```

### Total Latency Calculation
```javascript
const totalLatency = {
  asr: deepgramLatency,          // ~250ms
  mt: deeplLatency,              // ~200ms
  tts: elevenLabsLatency,        // ~250ms
  transmission: networkLatency,  // ~100-200ms
  endToEnd: asr + mt + tts + transmission, // Target: <900ms

  // Parallel (non-blocking)
  emotion: humeLatency           // ~200ms (doesn't add to total)
};
```

---

## Monitoring Integration

### Real-Time Monitoring Script
**File**: `third-party-monitor.js`
```javascript
class ThirdPartyMonitor extends EventEmitter {
  constructor() {
    this.services = {
      deepgram: new DeepgramMonitor(),
      deepl: new DeepLMonitor(),
      elevenlabs: new ElevenLabsMonitor(),
      hume: new HumeMonitor()
    };
  }

  startMonitoring() {
    // Track all service calls
    Object.values(this.services).forEach(service => {
      service.on('request_start', (data) => {
        console.log(`[${data.service}] Request started: ${data.id}`);
      });

      service.on('request_end', (data) => {
        console.log(`[${data.service}] Request completed: ${data.latency}ms`);
        this.recordLatency(data.service, data.latency);
      });

      service.on('error', (error) => {
        console.error(`[${error.service}] Error: ${error.message}`);
        this.recordError(error.service, error);
      });
    });
  }

  getStats() {
    return {
      deepgram: this.services.deepgram.getStats(),
      deepl: this.services.deepl.getStats(),
      elevenlabs: this.services.elevenlabs.getStats(),
      hume: this.services.hume.getStats(),
      overall: this.calculateOverallStats()
    };
  }
}
```

### Latency Dashboard Metrics
```javascript
{
  services: {
    deepgram: {
      status: 'operational', // or 'degraded', 'down'
      latency: { p50: 180, p95: 240, p99: 280 },
      errorRate: 0.01, // 1%
      requestsPerMin: 45
    },
    deepl: {
      status: 'operational',
      latency: { p50: 150, p95: 190, p99: 220 },
      errorRate: 0.005, // 0.5%
      requestsPerMin: 42,
      cacheHitRate: 0.65 // 65%
    },
    elevenlabs: {
      status: 'operational',
      latency: { p50: 200, p95: 245, p99: 280 },
      errorRate: 0.01, // 1%
      requestsPerMin: 40
    },
    hume: {
      status: 'operational',
      latency: { p50: 150, p95: 195, p99: 230 },
      errorRate: 0.005, // 0.5%
      requestsPerMin: 60 // One per frame
    }
  },
  overall: {
    totalLatency: { p50: 680, p95: 875, p99: 1050 },
    status: 'pass', // <900ms p95
    bottleneck: null // or 'deepgram', 'deepl', etc.
  }
}
```

---

## Testing Procedures

### Test 1: Individual Service Latency
```bash
# Test Deepgram
node test-service-latency.js --service deepgram --samples 100

# Test DeepL
node test-service-latency.js --service deepl --samples 100

# Test ElevenLabs
node test-service-latency.js --service elevenlabs --samples 100

# Test Hume
node test-service-latency.js --service hume --samples 100
```

### Test 2: Combined Pipeline Latency
```bash
# Full pipeline test
node test-latency-measurement.js --duration 300
```

### Test 3: Service Health Check
```bash
# Check all services
node test-service-health.js
```

---

## API Key Management

### Environment Variables (Azure)
```bash
# Set in Azure App Service Configuration
az webapp config appsettings set \
  --resource-group realtime-translation-rg \
  --name realtime-translation-1760218638 \
  --settings \
    DEEPGRAM_API_KEY="<your-key>" \
    DEEPL_API_KEY="<your-key>" \
    ELEVENLABS_API_KEY="<your-key>" \
    HUME_API_KEY="<your-key>"
```

### Local Development
```bash
# .env file (DO NOT COMMIT)
DEEPGRAM_API_KEY=your-key-here
DEEPL_API_KEY=your-key-here
ELEVENLABS_API_KEY=your-key-here
HUME_API_KEY=your-key-here
```

---

## Cost Tracking

### Monthly Quotas & Pricing

| Service | Free Tier | Paid Plan | Current Usage | Cost/Month |
|---------|-----------|-----------|---------------|------------|
| Deepgram | 12,000 min | $0.0043/min | Variable | $18-50 |
| DeepL | 500,000 chars | 1M chars/$5.49 | Variable | $10-30 |
| ElevenLabs | 10,000 chars | 30K chars/$5 | Variable | $15-40 |
| Hume AI | Limited | Custom | Variable | $50-100 |
| **Total** | | | | **$93-220/mo** |

### Usage Monitoring
```javascript
{
  deepgram: {
    minutesUsed: 1250,
    minutesLimit: 12000,
    percentUsed: 10.4
  },
  deepl: {
    charactersUsed: 125000,
    charactersLimit: 500000,
    percentUsed: 25.0
  },
  elevenlabs: {
    charactersUsed: 3200,
    charactersLimit: 10000,
    percentUsed: 32.0
  },
  hume: {
    requestsUsed: 45000,
    requestsLimit: 100000,
    percentUsed: 45.0
  }
}
```

---

## Troubleshooting

### High Latency from Deepgram
- Check network latency: `ping api.deepgram.com`
- Verify WebSocket connection stable
- Consider switching to `nova-2-general` model (faster)

### High Latency from DeepL
- Check cache hit rate (should be >50%)
- Reduce context window size if needed
- Consider using `formality: 'less'` for faster results

### High Latency from ElevenLabs
- Use `eleven_turbo_v2` model (faster)
- Reduce `use_speaker_boost` if quality acceptable
- Consider shorter text segments

### High Latency from Hume
- Check WebSocket connection
- Reduce context window from 5s to 3s
- Verify audio format correct (16kHz PCM)

---

## Summary

**Total Services**: 4
**Total Entry Points**: 10
**Total Exit Points**: 10
**Target Total Latency (p95)**: <900ms

**Monitoring Coverage**: 100%
- All service calls tracked
- Entry/exit latency measured
- Error rates monitored
- Quota usage tracked

**Next Steps**:
1. Implement monitoring in each service module
2. Create unified dashboard
3. Set up alerts for high latency
4. Track costs against budget
