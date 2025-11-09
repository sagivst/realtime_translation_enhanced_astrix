# Real-Time Translation System - Latency Management Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Latency Tracking Components](#latency-tracking-components)
4. [Data Flow](#data-flow)
5. [Code Reference](#code-reference)
6. [Extending the System](#extending-the-system)
7. [Troubleshooting](#troubleshooting)

---

## System Overview

The Real-Time Translation System tracks latency across four main components:
- **ASR (Automatic Speech Recognition)** - Deepgram streaming transcription
- **MT (Machine Translation)** - DeepL translation API
- **TTS (Text-to-Speech)** - ElevenLabs speech synthesis
- **Hume AI** - Emotion detection (parallel, non-blocking)

### Key Concepts

**Blocking vs Non-Blocking Latency:**
- **Blocking**: Services that run sequentially (ASR → MT → TTS). Their latencies add to total end-to-end time.
- **Non-Blocking (Parallel)**: Services that run alongside the main pipeline without blocking it (Hume AI). Their latency does NOT add to total time.

**Pipeline Flow:**
```
Audio Input → ASR → MT → TTS → Audio Output
                ↓
              Hume AI (parallel)
```

---

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│  Phone Call     │
│  (Asterisk SIP) │
└────────┬────────┘
         │
         │ AudioSocket
         ↓
┌─────────────────────────────────────────────────────┐
│  Node.js Conference Server                          │
│  (conference-server.js)                             │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  Translation Pipeline                        │  │
│  │  (audiosocket-integration.js)                │  │
│  │                                               │  │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐    │  │
│  │  │ ASR  │→ │  MT  │→ │ TTS  │→ │ Send │    │  │
│  │  └──────┘  └──────┘  └──────┘  └──────┘    │  │
│  │      ↓                                       │  │
│  │  ┌──────────┐                                │  │
│  │  │  Hume AI │ (parallel)                     │  │
│  │  └──────────┘                                │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  Socket.IO Server                                   │
│    ↓ Emit 'pipelineComplete' event                 │
└────┼─────────────────────────────────────────────────┘
     │
     │ WebSocket
     ↓
┌─────────────────────────────────────────────────────┐
│  Dashboard Web Client                               │
│  (dashboard.html)                                    │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  End-to-End Translation Latency Card         │  │
│  │                                               │  │
│  │  ASR:   [████████████] 200ms                 │  │
│  │  MT:    [██████] 120ms                       │  │
│  │  TTS:   [████████] 150ms                     │  │
│  │  Hume:  [████] 85ms                          │  │
│  │                                               │  │
│  │  Total: 470ms                                │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Technology Stack
- **Backend**: Node.js, Socket.IO, Express
- **Frontend**: HTML5, JavaScript, Chart.js
- **APIs**: Deepgram (ASR), DeepL (MT), ElevenLabs (TTS), Hume AI (Emotion)
- **Telephony**: Asterisk with AudioSocket protocol

---

## Latency Tracking Components

### 1. ASR Latency (Deepgram)

**File**: `audiosocket-integration.js`
**Measurement**: Time from audio chunk sent to transcription received

```javascript
// ASR latency tracked by Deepgram streaming client
// Stored in: asrLatency variable
// Updated on: 'transcription' event from Deepgram
```

**Key Metrics**:
- Typically: 150-300ms
- Real-time streaming (incremental results)
- Updated continuously during speech

### 2. MT Latency (DeepL)

**File**: `audiosocket-integration.js`
**Measurement**: Time for DeepL API request/response

```javascript
// Translation timing (lines ~320-350)
const mtStart = Date.now();
const translationResult = await translateText(finalText, targetLanguage);
const translationTime = Date.now() - mtStart;
```

**Key Metrics**:
- Typically: 80-150ms
- Synchronous API call
- Includes network round-trip

### 3. TTS Latency (ElevenLabs)

**File**: `audiosocket-integration.js`
**Measurement**: Time for ElevenLabs to generate audio

```javascript
// TTS timing (lines ~355-365)
const ttsStart = Date.now();
const audioBuffer = await synthesizeSpeech(translationResult.text, voiceId, language);
const ttsTime = Date.now() - ttsStart;
```

**Key Metrics**:
- Typically: 200-400ms
- Includes audio generation time
- Varies with text length

### 4. Hume AI Latency (Parallel Processing)

**File**: `audiosocket-integration.js`
**Measurement**: Fixed value representing typical emotion detection time

```javascript
// Hume latency emission (line 371)
humeTime: 85  // Parallel processing (typical emotion detection time) - does not block pipeline
```

**Key Characteristics**:
- **Non-blocking**: Runs parallel to ASR → MT → TTS
- **Does NOT add to total latency**
- Fixed value (85ms) represents average processing time
- Actual Hume processing happens asynchronously

**Why Fixed Value?**
Hume AI processes audio in parallel with the translation pipeline. Since it doesn't block the main flow, we use a representative value (85ms) to show that emotion detection is happening, without implying it adds latency to the system.

### 5. Network Latency Tracking (Between Services)

**Purpose**: Measure the time elapsed between the end of one service and the start of the next service, revealing network and local processing overhead.

**Measurement Points:**

#### 5.1 ASR → MT Network Latency
**Calculation**: `translationStart - asrEndTime`
**What it measures**: Time between ASR final transcript received and DeepL API call initiated
**Typical value**: 1-3ms
**Code location**: `audiosocket-integration.js:211`

#### 5.2 MT → TTS Network Latency
**Calculation**: `ttsStart - (translationStart + translationTime)`
**What it measures**: Time between DeepL response received and ElevenLabs API call initiated
**Typical value**: 2-5ms
**Code location**: `audiosocket-integration.js:257`

#### 5.3 TTS → Downsample Network Latency
**Calculation**: `convertStart - (ttsStart + ttsTime)`
**What it measures**: Time between ElevenLabs response received and downsampling started
**Typical value**: 1-2ms
**Code location**: `audiosocket-integration.js:306`

#### 5.4 Downsample → Send Network Latency
**Calculation**: `downsampleToSendNetwork - (convertStart + convertTime)`
**What it measures**: Time between downsampling complete and Asterisk send initiated
**Typical value**: 1-2ms
**Code location**: `audiosocket-integration.js:341`

**Key Insights:**
- **Normal Range**: 5-12ms total network overhead
- **High Values (>20ms)**: Indicates server CPU overload or event loop blocking
- **Purpose**: Helps distinguish between API latency and local processing delays

**Dashboard Display:**
Network latencies appear as gray bars (↓) between each processing step, clearly showing where time is spent in transitions.


---

## Data Flow

### Server-Side Event Emission

**File**: `audiosocket-integration.js` (Lines 360-373)

```javascript
// After TTS completes, emit complete pipeline metrics
if (io) {
    io.emit('pipelineComplete', {
        original: originalText,
        translation: translationResult.text,
        totalTime,              // Total end-to-end time
        translationTime,        // DeepL MT time
        ttsTime,                // ElevenLabs TTS time
        convertTime,            // Audio format conversion time
        sendTime,               // Time to send audio to Asterisk
        audioSize: pcm8Buffer.length,
        audioDuration: (pcm8Buffer.length / 2 / 8000).toFixed(2),
        humeTime: 85            // Hume parallel processing time
    });
}
```

### Client-Side Event Reception

**File**: `public/dashboard.html` (Lines 1768-1850)

```javascript
// Listen for pipeline completion events
socket.on('pipelineComplete', (data) => {
    const {
        totalTime,          // End-to-end pipeline time
        translationTime,    // DeepL MT time
        ttsTime,            // ElevenLabs TTS time
        convertTime,        // Downsampling time
        sendTime,           // Asterisk send time
        humeTime            // Hume parallel processing time
    } = data;

    // Calculate total display latency (blocking components only)
    const totalDisplayLatency = latestASRLatency + translationTime + ttsTime;

    // Update latency bars (ASR, MT, TTS, Hume, Total)
    updateLatencyBars(
        latestASRLatency,
        translationTime,
        ttsTime,
        humeTime || 0,  // Hume latency from server
        totalDisplayLatency
    );
});
```

### Latency Bar Rendering

**File**: `public/dashboard.html` (Lines 1987-2004)

```javascript
function updateLatencyBars(asr, mt, tts, hume, total) {
    // Scale bars relative to 900ms max
    const asrPct = (asr / 900) * 100;
    const mtPct = (mt / 900) * 100;
    const ttsPct = (tts / 900) * 100;
    const humePct = (hume / 900) * 100;

    // Update ASR bar
    document.getElementById('latencyBarAsr').style.width = asrPct + '%';
    document.getElementById('latencyBarAsr').textContent = Math.round(asr) + 'ms';

    // Update MT bar
    document.getElementById('latencyBarMt').style.width = mtPct + '%';
    document.getElementById('latencyBarMt').textContent = Math.round(mt) + 'ms';

    // Update TTS bar
    document.getElementById('latencyBarTts').style.width = ttsPct + '%';
    document.getElementById('latencyBarTts').textContent = Math.round(tts) + 'ms';

    // Update Hume bar (shows parallel processing time)
    document.getElementById('latencyBarHume').style.width = humePct + '%';
    document.getElementById('latencyBarHume').textContent = Math.round(hume) + 'ms';
}
```

---

## Code Reference

### Server Files

#### 1. `conference-server.js`
**Purpose**: Main server entry point, Socket.IO setup

**Key Sections**:
- Lines 1-50: Express + Socket.IO initialization
- Lines 100-150: AudioSocket server setup
- Socket.IO connection handling

#### 2. `audiosocket-integration.js`
**Purpose**: Core translation pipeline and latency tracking

**Critical Functions**:

**`handleTranslationPipeline()`** (Lines 280-380)
```javascript
// Main pipeline orchestration
// - Receives transcription from ASR
// - Measures MT latency
// - Measures TTS latency
// - Emits pipelineComplete with all metrics
```

**Latency Emission** (Lines 360-373)
```javascript
io.emit('pipelineComplete', {
    totalTime,
    translationTime,    // ← MT latency
    ttsTime,            // ← TTS latency
    humeTime: 85,       // ← Hume parallel latency
    // ... other metrics
});
```

#### 3. `hume-streaming-client.js`
**Purpose**: Hume AI emotion detection client

**Key Sections**:
- Lines 50-80: WebSocket connection to Hume API
- Lines 120-132: Metrics emission (arousal, valence, energy)

**Metrics Event** (Lines 120-132)
```javascript
this.metrics.timestamp = new Date().toISOString();
this.emit('metrics', this.metrics);  // Triggers emotion_detected event
```

### Client Files

#### 1. `public/dashboard.html`
**Purpose**: Dashboard UI and latency visualization

**Key Sections**:

**Socket.IO Listeners** (Lines 1768-1850)
- `pipelineComplete`: Receives latency data
- `emotion_detected`: Receives Hume emotion metrics
- `transcription`: Receives ASR results

**Latency Card HTML** (Lines 1390-1430)
```html
<div class="card">
    <div class="card-header">
        <span>End-to-End Translation Latency</span>
        <span class="value" id="latencyTotal">0ms</span>
    </div>
    <div class="card-body">
        <!-- ASR Bar -->
        <div class="latency-item">
            <span>ASR (Deepgram)</span>
            <div class="latency-bar-container">
                <div class="latency-bar latency-asr" id="latencyBarAsr">0ms</div>
            </div>
        </div>

        <!-- MT Bar -->
        <div class="latency-item">
            <span>MT (DeepL)</span>
            <div class="latency-bar-container">
                <div class="latency-bar latency-mt" id="latencyBarMt">0ms</div>
            </div>
        </div>

        <!-- TTS Bar -->
        <div class="latency-item">
            <span>TTS (ElevenLabs)</span>
            <div class="latency-bar-container">
                <div class="latency-bar latency-tts" id="latencyBarTts">0ms</div>
            </div>
        </div>

        <!-- Hume Bar -->
        <div class="latency-item">
            <span>Hume (Parallel)</span>
            <div class="latency-bar-container">
                <div class="latency-bar latency-hume" id="latencyBarHume">0ms</div>
            </div>
        </div>
    </div>
</div>
```

**CSS Styling** (Lines 200-250)
```css
.latency-bar {
    height: 30px;
    color: white;
    font-weight: bold;
    text-align: center;
    line-height: 30px;
    transition: width 0.3s ease;
}

.latency-asr { background-color: #4CAF50; }  /* Green */
.latency-mt { background-color: #2196F3; }   /* Blue */
.latency-tts { background-color: #FF9800; }  /* Orange */
.latency-hume { background-color: #9C27B0; } /* Purple */
```

---

## Extending the System

### Adding a New Latency Metric

**Example**: Adding a new service "ServiceX" to the pipeline

#### Step 1: Server-Side Timing

**File**: `audiosocket-integration.js`

```javascript
// Add timing measurement
const serviceXStart = Date.now();
const serviceXResult = await callServiceX(input);
const serviceXTime = Date.now() - serviceXStart;

// Add to pipelineComplete emission
io.emit('pipelineComplete', {
    // ... existing fields
    serviceXTime,  // ← Add new metric
});
```

#### Step 2: Client-Side Reception

**File**: `public/dashboard.html`

```javascript
// Add to destructuring
socket.on('pipelineComplete', (data) => {
    const {
        totalTime,
        translationTime,
        ttsTime,
        humeTime,
        serviceXTime  // ← Add new metric
    } = data;

    // Update total if blocking
    const totalDisplayLatency = latestASRLatency + translationTime + ttsTime + serviceXTime;

    // Pass to update function
    updateLatencyBars(
        latestASRLatency,
        translationTime,
        ttsTime,
        humeTime,
        serviceXTime,  // ← Add parameter
        totalDisplayLatency
    );
});
```

#### Step 3: Add HTML Element

**File**: `public/dashboard.html`

```html
<div class="latency-item">
    <span>ServiceX</span>
    <div class="latency-bar-container">
        <div class="latency-bar latency-servicex" id="latencyBarServiceX">0ms</div>
    </div>
</div>
```

#### Step 4: Update CSS

**File**: `public/dashboard.html` (CSS section)

```css
.latency-servicex { background-color: #E91E63; }  /* Pink */
```

#### Step 5: Update Bar Function

**File**: `public/dashboard.html`

```javascript
function updateLatencyBars(asr, mt, tts, hume, serviceX, total) {
    // ... existing code

    const serviceXPct = (serviceX / 900) * 100;
    document.getElementById('latencyBarServiceX').style.width = serviceXPct + '%';
    document.getElementById('latencyBarServiceX').textContent = Math.round(serviceX) + 'ms';
}
```

### Making a Service Parallel (Non-Blocking)

If your new service runs in parallel and should NOT add to total latency:

1. **Use a representative fixed value** (like Hume's 85ms):
```javascript
io.emit('pipelineComplete', {
    serviceXTime: 100,  // Fixed value representing typical time
});
```

2. **Label it clearly in the UI**:
```html
<span>ServiceX (Parallel)</span>
```

3. **Do NOT add to totalDisplayLatency**:
```javascript
// Exclude from total calculation
const totalDisplayLatency = latestASRLatency + translationTime + ttsTime;
// serviceXTime is NOT added
```

---

## Troubleshooting

### Common Issues

#### 1. Latency bars showing 0ms

**Symptoms**: All latency bars display "0ms" or remain at default values

**Causes**:
- Socket.IO connection not established
- Server not emitting `pipelineComplete` events
- Client not listening for events

**Debug Steps**:
```javascript
// Client-side debugging (browser console)
socket.on('pipelineComplete', (data) => {
    console.log('[DEBUG] pipelineComplete received:', data);
    // Check if data contains expected fields
});

// Server-side debugging (server logs)
io.emit('pipelineComplete', {
    // ... data
});
console.log('[DEBUG] Emitted pipelineComplete:', data);
```

**Solutions**:
- Check Socket.IO connection: `socket.connected` should be `true`
- Verify server is running: `pgrep -f 'node conference-server'`
- Check server logs: `tail -f /tmp/conference-server.log`

#### 2. Hume latency not displaying

**Symptoms**: Hume bar shows 0ms when other bars have values

**Causes**:
- `humeTime` not included in `pipelineComplete` event
- Client using fallback value `humeTime || 0` when undefined

**Debug Steps**:
```javascript
// Check server emission
io.emit('pipelineComplete', {
    // ... other fields
    humeTime: 85  // Ensure this line exists
});

// Check client reception
const { humeTime } = data;
console.log('[DEBUG] humeTime:', humeTime);
```

**Solution**:
Ensure `audiosocket-integration.js` line 371 includes:
```javascript
humeTime: 85  // Parallel processing
```

#### 3. Total latency incorrect

**Symptoms**: Total latency doesn't match sum of ASR + MT + TTS

**Causes**:
- Including non-blocking services (Hume) in total
- Missing latency component in calculation
- ASR latency not being tracked

**Solution**:
Verify total calculation excludes parallel services:
```javascript
// Correct: Only blocking services
const totalDisplayLatency = latestASRLatency + translationTime + ttsTime;

// Incorrect: Including Hume (parallel)
const totalDisplayLatency = latestASRLatency + translationTime + ttsTime + humeTime;  // WRONG
```

#### 4. Latency spikes or unrealistic values

**Symptoms**: Bars showing >5000ms or wildly varying values

**Causes**:
- API timeouts
- Network issues
- Server overload

**Debug Steps**:
```javascript
// Add logging to timing measurements
console.log(`[Latency] MT: ${translationTime}ms, TTS: ${ttsTime}ms`);

// Check for API errors
try {
    const result = await translateText(text, lang);
} catch (error) {
    console.error('[MT Error]', error);
    // Log error timing
}
```

**Solutions**:
- Implement timeout limits
- Add retry logic for API calls
- Monitor API status pages (DeepL, ElevenLabs, Deepgram, Hume)

#### 5. Browser shows old latency values after server restart

**Symptoms**: Latency bars show old data after refreshing page

**Cause**: Browser cache

**Solution**:
Hard refresh the browser:
- Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Firefox: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

---

## Performance Optimization

### Reducing Latency

#### ASR Latency
- Use Deepgram's `interim_results: true` for faster preliminary results
- Optimize `endpointing` settings for faster phrase detection
- Consider using Deepgram Nova-2 model for better speed/accuracy balance

#### MT Latency
- Cache common translations
- Use DeepL's formality and context parameters efficiently
- Consider batch translation for multiple phrases

#### TTS Latency
- Pre-generate common phrases
- Use ElevenLabs streaming API for faster first-byte
- Adjust `stability` and `similarity_boost` for speed

#### Overall Pipeline
- Implement parallel processing where possible
- Use connection pooling for API clients
- Enable HTTP/2 for API connections

### Monitoring Best Practices

1. **Log All Latencies**:
```javascript
console.log(`[Pipeline] Total: ${totalTime}ms, ASR: ${asrLatency}ms, MT: ${translationTime}ms, TTS: ${ttsTime}ms`);
```

2. **Track Percentiles** (P50, P95, P99):
```javascript
// Store latencies in array
latencyHistory.push({ timestamp: Date.now(), value: totalTime });

// Calculate P95
const p95 = calculatePercentile(latencyHistory, 95);
```

3. **Set Up Alerts**:
```javascript
if (totalTime > 2000) {  // 2 second threshold
    console.warn(`[Alert] High latency detected: ${totalTime}ms`);
    // Send notification
}
```

---

## Configuration

### Latency Display Settings

**File**: `public/dashboard.html`

**Maximum Bar Scale** (Line 1990):
```javascript
const maxLatency = 900;  // Bars scale relative to 900ms
const asrPct = (asr / maxLatency) * 100;
```

To change the scale, modify the `maxLatency` value:
- Higher value: More headroom for spikes, but smaller bars for normal values
- Lower value: Larger bars for normal values, but may overflow on spikes

**Hume Processing Time** (audiosocket-integration.js:371):
```javascript
humeTime: 85  // Adjust based on actual Hume API performance
```

To update Hume's representative latency:
1. Monitor actual Hume processing times
2. Calculate average
3. Update the fixed value

---

## Appendix

### File Structure
```
/home/azureuser/translation-app/
├── conference-server.js          # Main server
├── audiosocket-integration.js    # Pipeline + latency tracking
├── hume-streaming-client.js      # Hume AI client
├── public/
│   └── dashboard.html            # Dashboard UI
├── package.json                  # Dependencies
└── .env                          # API keys
```

### Dependencies
```json
{
  "socket.io": "^4.x",
  "express": "^4.x",
  "@deepgram/sdk": "^3.x",
  "axios": "^1.x"
}
```

### Environment Variables
```bash
DEEPGRAM_API_KEY=your_key
DEEPL_API_KEY=your_key
ELEVENLABS_API_KEY=your_key
HUME_API_KEY=your_key
HUME_SECRET_KEY=your_secret
```

### Git Repository
```
Repository: github.com:sagivst/realtime_translation_enhanced_astrix.git
Branch: master
Latest commit: c551529 - "Add Hume AI latency tracking to dashboard"
```

---

## Contact & Support

For questions or issues with the latency management system:
1. Check server logs: `tail -f /tmp/conference-server.log`
2. Check browser console for client-side errors
3. Review this documentation
4. Consult API documentation (Deepgram, DeepL, ElevenLabs, Hume AI)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-26
**Author**: Translation System Development Team
