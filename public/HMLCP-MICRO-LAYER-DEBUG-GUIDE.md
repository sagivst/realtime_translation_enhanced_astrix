# HMLCP System - Micro-Layer Debugging Guide

**Live Demo:** https://realtime-translation-1760218638.azurewebsites.net/hmlcp-demo.html

This document provides extreme detail for debugging the Human-Machine Language Calibration Protocol system at every micro-layer level.

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Layer 1: Client Audio Capture](#layer-1-client-audio-capture)
3. [Layer 2: WebSocket Transport](#layer-2-websocket-transport)
4. [Layer 3: User Profile Loading](#layer-3-user-profile-loading)
5. [Layer 4: Deepgram STT Integration](#layer-4-deepgram-stt-integration)
6. [Layer 5: ULO Processing](#layer-5-ulo-processing)
7. [Layer 6: DeepL Translation](#layer-6-deepl-translation)
8. [Layer 7: Azure TTS](#layer-7-azure-tts)
9. [Layer 8: Audio Delivery](#layer-8-audio-delivery)
10. [Layer 9: Profile Persistence](#layer-9-profile-persistence)
11. [Debugging Checklist](#debugging-checklist)
12. [Performance Monitoring](#performance-monitoring)
13. [Common Issues & Solutions](#common-issues--solutions)

---

## System Architecture Overview

### High-Level Flow
```
┌────────────────────────────────────────────────────────────────┐
│                      CLIENT BROWSER                            │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐  │
│  │  Microphone │───▶│ MediaRecorder│───▶│ Socket.IO Client│  │
│  └─────────────┘    └──────────────┘    └─────────┬───────┘  │
└──────────────────────────────────────────────────┼────────────┘
                                                    │ WebSocket
                                                    ▼
┌────────────────────────────────────────────────────────────────┐
│                   AZURE WEB APP SERVICE                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               conference-server.js (Node.js)             │  │
│  │  ┌────────────┐  ┌────────┐  ┌─────────┐  ┌─────────┐  │  │
│  │  │Socket.IO   │─▶│ HMLCP  │─▶│ API     │─▶│Response │  │  │
│  │  │Handler     │  │Manager │  │Orchestr.│  │Builder  │  │  │
│  │  └────────────┘  └────────┘  └─────────┘  └─────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    HMLCP SYSTEM                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐│  │
│  │  │UserProfile  │  │  ULO Layer  │  │PatternExtractor  ││  │
│  │  │Manager      │  │             │  │                  ││  │
│  │  └─────────────┘  └─────────────┘  └──────────────────┘│  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              PERSISTENT STORAGE                          │  │
│  │  hmlcp/profiles/<userId>_<language>.json                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                          │
                          ▼ (API Calls from Azure)
┌────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │  Deepgram    │  │    DeepL     │  │ Azure Cognitive   │   │
│  │  Nova-2 STT  │  │  Translation │  │  Services TTS     │   │
│  └──────────────┘  └──────────────┘  └───────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram
```
User Speaks ──▶ Audio Capture ──▶ PCM Buffer ──▶ WebSocket ──▶ Azure Server
                                                                     │
                                                                     ▼
                                                              Load User Profile
                                                              Generate Keywords
                                                                     │
                                                                     ▼
                                                        ┌────────────────────┐
                                                        │  Deepgram API      │
                                                        │  + Custom Vocab    │
                                                        └────────┬───────────┘
                                                                 │
                                                                 ▼
                                                          Raw Transcription
                                                                 │
                                                                 ▼
                                                        ┌────────────────────┐
                                                        │   ULO Layer        │
                                                        │ Apply Phrase Maps  │
                                                        └────────┬───────────┘
                                                                 │
                                                                 ▼
                                                        Processed Transcription
                                                                 │
                                                                 ▼
                                                        ┌────────────────────┐
                                                        │   DeepL API        │
                                                        │   Translation      │
                                                        └────────┬───────────┘
                                                                 │
                                                                 ▼
                                                           Translated Text
                                                                 │
                                                                 ▼
                                                        ┌────────────────────┐
                                                        │  Azure TTS API     │
                                                        │  Neural Voice      │
                                                        └────────┬───────────┘
                                                                 │
                                                                 ▼
                                                            MP3 Audio Buffer
                                                                 │
                                                                 ▼
                                                        WebSocket ──▶ Client
                                                                 │
                                                                 ▼
                                                             Auto-play
```

---

## Layer 1: Client Audio Capture

### Micro-Layer Breakdown

#### 1.1 getUserMedia Initialization
**File:** `public/index.html`
**Lines:** ~150-180

```javascript
// Step 1: Request microphone permission
navigator.mediaDevices.getUserMedia({
    audio: {
        channelCount: 1,        // Mono audio
        sampleRate: 16000,      // 16kHz sample rate
        echoCancellation: true, // Enable AEC
        noiseSuppression: true, // Enable noise reduction
        autoGainControl: true   // Enable AGC
    }
})
```

**Debug Points:**
- Check `navigator.mediaDevices` exists (HTTPS required)
- Permission status: `navigator.permissions.query({name: 'microphone'})`
- Supported constraints: `navigator.mediaDevices.getSupportedConstraints()`

**Console Debug:**
```javascript
console.log('[Audio Capture] getUserMedia request:', {
    channelCount: 1,
    sampleRate: 16000,
    constraints: stream.getAudioTracks()[0].getSettings()
});
```

#### 1.2 MediaRecorder Setup
```javascript
// Step 2: Create MediaRecorder with PCM audio
const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm;codecs=opus', // Opus codec in WebM container
    audioBitsPerSecond: 16000           // 16kbps bitrate
});
```

**Supported MIME Types Check:**
```javascript
const mimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4'
];

mimeTypes.forEach(type => {
    console.log(`[MediaRecorder] ${type}: ${MediaRecorder.isTypeSupported(type)}`);
});
```

#### 1.3 Audio Data Capture
```javascript
// Step 3: Capture audio chunks
mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const audioBuffer = reader.result; // ArrayBuffer

            // Debug: Log buffer details
            console.log('[Audio Capture] Chunk captured:', {
                size: audioBuffer.byteLength,
                timestamp: Date.now(),
                type: event.data.type
            });

            // Send to server
            socket.emit("audio-stream", {
                audioBuffer: audioBuffer,
                roomId: currentRoom,
                userId: username,
                language: userLanguage,
                timestamp: Date.now()
            });
        };
        reader.readAsArrayBuffer(event.data);
    }
};
```

**Debug Output Example:**
```
[Audio Capture] Chunk captured: {
    size: 8192,
    timestamp: 1697234567890,
    type: "audio/webm;codecs=opus"
}
```

#### 1.4 Chunk Timing Control
```javascript
// Step 4: Start recording with time slices
mediaRecorder.start(100); // Capture every 100ms
```

**Timing Debug:**
```javascript
let lastChunkTime = Date.now();

mediaRecorder.ondataavailable = (event) => {
    const now = Date.now();
    const chunkInterval = now - lastChunkTime;

    console.log('[Audio Capture] Chunk interval:', {
        expected: 100,
        actual: chunkInterval,
        drift: chunkInterval - 100
    });

    lastChunkTime = now;
    // ... rest of handler
};
```

### Debugging Commands

```javascript
// Check audio context
const audioContext = new AudioContext();
console.log('[Audio Debug] AudioContext:', {
    sampleRate: audioContext.sampleRate,
    state: audioContext.state,
    baseLatency: audioContext.baseLatency,
    outputLatency: audioContext.outputLatency
});

// Analyze audio stream
const analyser = audioContext.createAnalyser();
const source = audioContext.createMediaStreamSource(stream);
source.connect(analyser);

analyser.fftSize = 2048;
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

setInterval(() => {
    analyser.getByteTimeDomainData(dataArray);

    // Calculate RMS volume
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / bufferLength);

    console.log('[Audio Debug] Volume RMS:', rms.toFixed(4));
}, 1000);
```

---

## Layer 2: WebSocket Transport

### Micro-Layer Breakdown

#### 2.1 Socket.IO Client Connection
**File:** `public/index.html`

```javascript
// Step 1: Establish WebSocket connection
const socket = io('https://realtime-translation-1760218638.azurewebsites.net', {
    transports: ['websocket', 'polling'], // Try WebSocket first
    upgrade: true,                        // Allow transport upgrade
    reconnection: true,                   // Auto-reconnect
    reconnectionDelay: 1000,             // Wait 1s before reconnect
    reconnectionAttempts: 5,             // Max 5 attempts
    timeout: 10000                       // 10s connection timeout
});
```

**Connection Debug:**
```javascript
socket.on('connect', () => {
    console.log('[WebSocket] Connected:', {
        id: socket.id,
        transport: socket.io.engine.transport.name,
        connected: socket.connected,
        timestamp: new Date().toISOString()
    });
});

socket.on('connect_error', (error) => {
    console.error('[WebSocket] Connection error:', {
        message: error.message,
        type: error.type,
        description: error.description
    });
});

socket.on('disconnect', (reason) => {
    console.warn('[WebSocket] Disconnected:', {
        reason: reason,
        timestamp: new Date().toISOString()
    });
});
```

#### 2.2 Audio Stream Emission
```javascript
// Step 2: Send audio data
socket.emit("audio-stream", {
    audioBuffer: arrayBuffer,    // ArrayBuffer of audio data
    roomId: "room-1000",        // Conference room ID
    userId: "testuser",         // Username
    language: "en",             // Source language
    timestamp: Date.now()       // Client timestamp
});
```

**Emission Debug:**
```javascript
const originalEmit = socket.emit.bind(socket);
socket.emit = function(event, data) {
    if (event === 'audio-stream') {
        console.log('[WebSocket] Emitting audio-stream:', {
            event: event,
            bufferSize: data.audioBuffer?.byteLength || 0,
            roomId: data.roomId,
            userId: data.userId,
            language: data.language,
            timestamp: data.timestamp,
            latency: Date.now() - data.timestamp
        });
    }
    return originalEmit(event, data);
};
```

#### 2.3 Server Event Listeners
```javascript
// Step 3: Listen for server responses
socket.on("translated-audio", (data) => {
    console.log('[WebSocket] Received translated-audio:', {
        from: data.from,
        originalText: data.originalText,
        processedText: data.processedText,
        translatedText: data.translatedText,
        audioSize: data.audioData?.length || 0,
        sourceLanguage: data.sourceLanguage,
        targetLanguage: data.targetLanguage,
        timing: data.timing
    });

    // Detailed timing breakdown
    console.table(data.timing);

    // Display transcription
    displayTranscription(data.originalText, data.translatedText);

    // Play audio
    const audio = new Audio("data:audio/mp3;base64," + data.audioData);
    audio.play();
});
```

**Debug Output Example:**
```
[WebSocket] Received translated-audio: {
    from: "user1",
    originalText: "I need to check the thing",
    processedText: "I need to check the server status",
    translatedText: "Necesito verificar el estado del servidor",
    audioSize: 34567,
    sourceLanguage: "en",
    targetLanguage: "es",
    timing: {
        totalLatency: 1250,
        sttTime: 350,
        uloTime: 2,
        translationTime: 450,
        ttsTime: 400
    }
}

┌─────────────────┬────────┐
│     (index)     │ Values │
├─────────────────┼────────┤
│  totalLatency   │  1250  │
│    sttTime      │   350  │
│    uloTime      │    2   │
│ translationTime │   450  │
│    ttsTime      │   400  │
└─────────────────┴────────┘
```

#### 2.4 Network Monitoring
```javascript
// Monitor WebSocket frames
socket.io.engine.on('packet', (packet) => {
    console.log('[WebSocket] Packet:', {
        type: packet.type,
        data: packet.data?.length || 'N/A',
        timestamp: Date.now()
    });
});

// Monitor ping/pong
socket.io.engine.on('ping', () => {
    console.log('[WebSocket] PING sent');
});

socket.io.engine.on('pong', (latency) => {
    console.log('[WebSocket] PONG received:', {
        latency: latency + 'ms'
    });
});
```

### Azure WebSocket Configuration

**Azure App Service Settings:**
```json
{
    "webSocketsEnabled": true,
    "alwaysOn": true,
    "http20Enabled": true,
    "minTlsVersion": "1.2"
}
```

**Check WebSocket Status:**
```bash
# Azure CLI command
az webapp config show \
    --resource-group realtime-translation-rg \
    --name realtime-translation-1760218638 \
    --query "{webSocketsEnabled:webSocketsEnabled, alwaysOn:alwaysOn}"
```

---

## Layer 3: User Profile Loading

### Micro-Layer Breakdown

#### 3.1 Profile Request Flow
**File:** `conference-server.js:318-323`

```javascript
// Step 1: Receive audio stream event
socket.on("audio-stream", async (data) => {
    const { audioBuffer, roomId, userId, language, timestamp } = data;

    console.log('[Server] Audio stream received:', {
        userId: userId,
        language: language,
        bufferSize: audioBuffer.byteLength,
        clientTimestamp: timestamp,
        serverTimestamp: Date.now(),
        networkLatency: Date.now() - timestamp
    });

    // Step 2: Load/Create user profile
    const profileStart = Date.now();
    const { profile, uloLayer, patternExtractor } =
        await getUserProfile(userId, language);
    const profileEnd = Date.now();

    console.log('[HMLCP] User profile loaded:', {
        userId: profile.userId,
        language: profile.language,
        loadTime: profileEnd - profileStart,
        cached: userProfiles.has(`${userId}_${language}`),
        biasTermsCount: profile.biasTerms.length,
        phraseMappingsCount: Object.keys(profile.phraseMap).length
    });
});
```

#### 3.2 getUserProfile Implementation
**File:** `conference-server.js:202-225`

```javascript
async function getUserProfile(userId, language) {
    const cacheKey = `${userId}_${language}`;

    // Check in-memory cache
    if (userProfiles.has(cacheKey)) {
        console.log('[HMLCP] Profile cache HIT:', cacheKey);
        return userProfiles.get(cacheKey);
    }

    console.log('[HMLCP] Profile cache MISS:', cacheKey);

    // Load from file system
    const profilePath = `./hmlcp/profiles/${userId}_${language}.json`;
    let profile;

    try {
        const data = await fs.promises.readFile(profilePath, 'utf8');
        const profileData = JSON.parse(data);
        profile = UserProfile.fromJSON(profileData);

        console.log('[HMLCP] Profile loaded from file:', {
            path: profilePath,
            fileSize: data.length,
            created: profile.created,
            lastUpdated: profile.lastUpdated,
            metrics: profile.metrics
        });
    } catch (error) {
        // Profile doesn't exist, create new one
        console.log('[HMLCP] Creating new profile:', {
            userId: userId,
            language: language,
            reason: error.code
        });

        profile = new UserProfile(userId, language);
        await profile.save();
    }

    // Create ULO layer and pattern extractor
    const uloLayer = new ULOLayer(profile);
    const patternExtractor = new PatternExtractor(profile);

    // Cache in memory
    const profileData = { profile, uloLayer, patternExtractor };
    userProfiles.set(cacheKey, profileData);

    return profileData;
}
```

#### 3.3 Custom Vocabulary Generation
**File:** `hmlcp/ulo-layer.js:generateCustomVocabulary()`

```javascript
generateCustomVocabulary() {
    const vocabStart = Date.now();

    // Generate keywords from bias terms
    const keywords = this.profile.biasTerms.map(term => ({
        phrase: term,
        boost: 25  // Boost value for Deepgram
    }));

    const vocabEnd = Date.now();

    console.log('[HMLCP] Custom vocabulary generated:', {
        termCount: keywords.length,
        generationTime: vocabEnd - vocabStart,
        keywords: keywords
    });

    return keywords;
}
```

**Debug Output Example:**
```
[HMLCP] Custom vocabulary generated: {
    termCount: 5,
    generationTime: 0.5,
    keywords: [
        { phrase: 'Kubernetes', boost: 25 },
        { phrase: 'PostgreSQL', boost: 25 },
        { phrase: 'Azure', boost: 25 },
        { phrase: 'Docker', boost: 25 },
        { phrase: 'microservices', boost: 25 }
    ]
}
```

#### 3.4 Profile Structure Deep Dive

**File:** `hmlcp/profiles/testuser_en.json`

```json
{
  "userId": "testuser",
  "language": "en",
  "created": "2025-10-12T20:00:00.000Z",
  "lastUpdated": "2025-10-12T21:05:26.169Z",

  "linguisticCharacteristics": {
    "tone": "neutral",
    "avgSentenceLength": 12,
    "directness": 0.85,
    "ambiguityTolerance": 0.3,
    "lexicalBias": ["technical", "formal"]
  },

  "phraseMap": {
    "check the thing": "check the server status",
    "restart the stuff": "restart the application",
    "the kubernetes": "Kubernetes",
    "db query": "database query",
    "ci cd pipeline": "CI/CD pipeline"
  },

  "biasTerms": [
    "Kubernetes",
    "PostgreSQL",
    "Azure",
    "Docker",
    "microservices",
    "API",
    "REST",
    "GraphQL"
  ],

  "metrics": {
    "intentMatchRate": 95.5,
    "correctionFrequency": 0.05,
    "semanticDrift": 0.02,
    "calibrationIndex": 0.92,
    "totalInteractions": 247,
    "correctionsAccepted": 12
  },

  "textSamples": [
    "I need to check the server status in Kubernetes",
    "Can you restart the application with the new config",
    "The database query is taking too long"
  ]
}
```

**Metric Definitions:**
- `intentMatchRate`: % of times processed text matched user's intended meaning
- `correctionFrequency`: Rate of user corrections (lower is better)
- `semanticDrift`: Average deviation from intended meaning (lower is better)
- `calibrationIndex`: Overall system accuracy (0-1, higher is better)

---

## Layer 4: Deepgram STT Integration

### Micro-Layer Breakdown

#### 4.1 STT Request Preparation
**File:** `conference-server.js:335-339`

```javascript
// Step 1: Generate custom vocabulary
const customVocab = uloLayer.generateCustomVocabulary();

// Step 2: Call transcription service
const timing = { startTime: Date.now() };

timing.sttStart = Date.now();
const transcriptionResult = await transcribeAudio(
    audioBuffer,
    language,
    customVocab
);
timing.sttEnd = Date.now();

console.log('[STT] Transcription completed:', {
    text: transcriptionResult.text,
    confidence: transcriptionResult.confidence,
    duration: timing.sttEnd - timing.sttStart,
    customVocabUsed: customVocab.length > 0,
    audioSize: audioBuffer.byteLength
});
```

#### 4.2 Deepgram API Call
**File:** `conference-server.js:87-110`

```javascript
async function transcribeAudio(audioBuffer, language, customVocab = []) {
    const requestStart = Date.now();

    // Configure Deepgram options
    const options = {
        model: 'nova-2',
        language: languageMap[language]?.deepgram || 'en-US',
        smart_format: true,
        punctuate: true,
        utterances: false,
        diarize: false,
        alternatives: 1
    };

    // Add custom vocabulary keywords
    if (customVocab && customVocab.length > 0) {
        options.keywords = customVocab.map(v => `${v.phrase}:${v.boost}`);

        console.log('[Deepgram] Custom keywords added:', {
            count: customVocab.length,
            keywords: options.keywords
        });
    }

    console.log('[Deepgram] API request:', {
        audioSize: audioBuffer.byteLength,
        language: options.language,
        model: options.model,
        customVocab: customVocab.length,
        timestamp: new Date().toISOString()
    });

    try {
        // Send to Deepgram
        const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
            audioBuffer,
            options
        );

        const requestEnd = Date.now();

        if (error) {
            console.error('[Deepgram] API error:', {
                error: error,
                duration: requestEnd - requestStart
            });
            throw error;
        }

        const transcript = result.results.channels[0].alternatives[0];

        console.log('[Deepgram] API response:', {
            text: transcript.transcript,
            confidence: transcript.confidence,
            words: transcript.words?.length || 0,
            duration: requestEnd - requestStart,
            timestamp: new Date().toISOString()
        });

        // Log individual word confidences
        if (transcript.words) {
            console.table(transcript.words.map(w => ({
                word: w.word,
                confidence: w.confidence.toFixed(3),
                start: w.start.toFixed(3),
                end: w.end.toFixed(3)
            })));
        }

        return {
            text: transcript.transcript,
            confidence: transcript.confidence,
            words: transcript.words
        };

    } catch (error) {
        const requestEnd = Date.now();

        console.error('[Deepgram] Request failed:', {
            error: error.message,
            duration: requestEnd - requestStart,
            audioSize: audioBuffer.byteLength
        });

        throw error;
    }
}
```

**Debug Output Example:**
```
[Deepgram] Custom keywords added: {
    count: 5,
    keywords: [
        'Kubernetes:25',
        'PostgreSQL:25',
        'Azure:25',
        'Docker:25',
        'microservices:25'
    ]
}

[Deepgram] API request: {
    audioSize: 32768,
    language: 'en-US',
    model: 'nova-2',
    customVocab: 5,
    timestamp: '2025-10-12T21:30:45.123Z'
}

[Deepgram] API response: {
    text: 'I need to check the Kubernetes cluster status',
    confidence: 0.9847,
    words: 8,
    duration: 342,
    timestamp: '2025-10-12T21:30:45.465Z'
}

┌─────────┬────────────┬────────────┬─────────┬─────────┐
│ (index) │    word    │ confidence │  start  │   end   │
├─────────┼────────────┼────────────┼─────────┼─────────┤
│    0    │    'I'     │  '0.998'   │ '0.000' │ '0.120' │
│    1    │   'need'   │  '0.995'   │ '0.120' │ '0.340' │
│    2    │    'to'    │  '0.998'   │ '0.340' │ '0.460' │
│    3    │  'check'   │  '0.992'   │ '0.460' │ '0.720' │
│    4    │   'the'    │  '0.997'   │ '0.720' │ '0.840' │
│    5    │'Kubernetes'│  '0.965'   │ '0.840' │ '1.380' │
│    6    │ 'cluster'  │  '0.987'   │ '1.380' │ '1.720' │
│    7    │  'status'  │  '0.991'   │ '1.720' │ '2.100' │
└─────────┴────────────┴────────────┴─────────┴─────────┘
```

#### 4.3 Language Mapping
**File:** `conference-server.js:45-60`

```javascript
const languageMap = {
    'en': {
        deepgram: 'en-US',
        deepl: 'EN',
        azure: 'en-US',
        display: 'English'
    },
    'es': {
        deepgram: 'es',
        deepl: 'ES',
        azure: 'es-ES',
        display: 'Spanish'
    },
    'fr': {
        deepgram: 'fr',
        deepl: 'FR',
        azure: 'fr-FR',
        display: 'French'
    },
    'de': {
        deepgram: 'de',
        deepl: 'DE',
        azure: 'de-DE',
        display: 'German'
    },
    'it': {
        deepgram: 'it',
        deepl: 'IT',
        azure: 'it-IT',
        display: 'Italian'
    }
};
```

#### 4.4 Error Handling
```javascript
try {
    const transcription = await transcribeAudio(audioBuffer, language, customVocab);
} catch (error) {
    console.error('[STT] Error handling:', {
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
        retryable: [429, 503, 504].includes(error.statusCode)
    });

    // Implement retry logic for transient errors
    if ([429, 503, 504].includes(error.statusCode)) {
        console.log('[STT] Retrying after backoff...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Retry...
    }
}
```

---

## Layer 5: ULO Processing

### Micro-Layer Breakdown

#### 5.1 ULO Application
**File:** `conference-server.js:366`

```javascript
// Apply ULO layer for personalized linguistic processing
timing.uloStart = Date.now();

const rawTranscription = transcriptionResult.text;
const processedTranscription = uloLayer.apply(rawTranscription);

timing.uloEnd = Date.now();

console.log('[HMLCP] ULO processing:', {
    input: rawTranscription,
    output: processedTranscription,
    changed: rawTranscription !== processedTranscription,
    duration: timing.uloEnd - timing.uloStart,
    phraseMappingsApplied: uloLayer.getLastApplicationCount()
});

// Store sample for pattern analysis
profile.addTextSample(rawTranscription);

console.log('[HMLCP] Text sample added:', {
    totalSamples: profile.textSamples.length,
    userId: profile.userId
});
```

#### 5.2 ULO Layer Implementation
**File:** `hmlcp/ulo-layer.js:apply()`

```javascript
class ULOLayer {
    constructor(profile) {
        this.profile = profile;
        this.lastApplicationCount = 0;
    }

    apply(text) {
        const applyStart = Date.now();
        let processed = text;
        let applicationsCount = 0;
        const applications = [];

        console.log('[ULO] Starting transformation:', {
            inputText: text,
            phraseMappings: Object.keys(this.profile.phraseMap).length
        });

        // Apply all phrase mappings from user profile
        for (const [pattern, replacement] of Object.entries(this.profile.phraseMap)) {
            const regex = new RegExp(pattern, 'gi');

            if (regex.test(processed)) {
                const beforeReplace = processed;
                processed = processed.replace(regex, replacement);
                applicationsCount++;

                applications.push({
                    pattern: pattern,
                    replacement: replacement,
                    before: beforeReplace,
                    after: processed
                });

                console.log('[ULO] Phrase mapping applied:', {
                    pattern: pattern,
                    replacement: replacement,
                    matched: true
                });
            }
        }

        const applyEnd = Date.now();
        this.lastApplicationCount = applicationsCount;

        console.log('[ULO] Transformation complete:', {
            inputText: text,
            outputText: processed,
            changed: text !== processed,
            applicationsCount: applicationsCount,
            duration: applyEnd - applyStart,
            applications: applications
        });

        return processed;
    }

    getLastApplicationCount() {
        return this.lastApplicationCount;
    }
}
```

**Debug Output Example:**
```
[ULO] Starting transformation: {
    inputText: 'I need to check the thing in Kubernetes',
    phraseMappings: 5
}

[ULO] Phrase mapping applied: {
    pattern: 'check the thing',
    replacement: 'check the server status',
    matched: true
}

[ULO] Transformation complete: {
    inputText: 'I need to check the thing in Kubernetes',
    outputText: 'I need to check the server status in Kubernetes',
    changed: true,
    applicationsCount: 1,
    duration: 0.8,
    applications: [
        {
            pattern: 'check the thing',
            replacement: 'check the server status',
            before: 'I need to check the thing in Kubernetes',
            after: 'I need to check the server status in Kubernetes'
        }
    ]
}
```

#### 5.3 Learning System
**File:** `hmlcp/ulo-layer.js:learnFromCorrection()`

```javascript
learnFromCorrection(rawText, correctedText) {
    console.log('[ULO] Learning from correction:', {
        raw: rawText,
        corrected: correctedText
    });

    // Extract differences
    const differ = new TextDiffer();
    const diffs = differ.diff(rawText, correctedText);

    console.log('[ULO] Differences detected:', diffs);

    // Create or update phrase mapping
    for (const diff of diffs) {
        if (diff.type === 'substitution') {
            this.profile.phraseMap[diff.original] = diff.corrected;

            console.log('[ULO] Phrase mapping learned:', {
                pattern: diff.original,
                replacement: diff.corrected
            });
        }
    }

    // Update metrics
    this.profile.metrics.correctionFrequency =
        this.profile.metrics.correctionsAccepted /
        this.profile.metrics.totalInteractions;

    this.profile.metrics.correctionsAccepted++;

    console.log('[ULO] Updated metrics:', this.profile.metrics);
}
```

---

## Layer 6: DeepL Translation

### Micro-Layer Breakdown

#### 6.1 Translation Request
**File:** `conference-server.js:400-404`

```javascript
// Translate processed text (not raw transcription!)
timing.translationStart = Date.now();

const translatedText = await translateText(
    processedTranscription,  // ULO-processed text
    participant.language,     // Source language
    targetParticipant.language // Target language
);

timing.translationEnd = Date.now();

console.log('[Translation] Completed:', {
    sourceText: processedTranscription,
    translatedText: translatedText,
    sourceLang: participant.language,
    targetLang: targetParticipant.language,
    duration: timing.translationEnd - timing.translationStart
});
```

#### 6.2 DeepL API Implementation
**File:** `conference-server.js:140-165`

```javascript
async function translateText(text, sourceLang, targetLang) {
    const requestStart = Date.now();

    console.log('[DeepL] API request:', {
        text: text,
        textLength: text.length,
        sourceLang: sourceLang.toUpperCase(),
        targetLang: targetLang.toUpperCase(),
        timestamp: new Date().toISOString()
    });

    try {
        const response = await fetch('https://api-free.deepl.com/v2/translate', {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                'Content-Type': 'application/json',
                'User-Agent': 'HMLCP-Translation-System/1.0'
            },
            body: JSON.stringify({
                text: [text],
                source_lang: sourceLang.toUpperCase(),
                target_lang: targetLang.toUpperCase(),
                formality: 'default',
                preserve_formatting: true,
                tag_handling: 'xml'
            })
        });

        const requestEnd = Date.now();

        if (!response.ok) {
            console.error('[DeepL] API error:', {
                status: response.status,
                statusText: response.statusText,
                duration: requestEnd - requestStart
            });
            throw new Error(`DeepL API error: ${response.statusText}`);
        }

        const data = await response.json();
        const translation = data.translations[0];

        console.log('[DeepL] API response:', {
            translatedText: translation.text,
            detectedSourceLanguage: translation.detected_source_language,
            duration: requestEnd - requestStart,
            timestamp: new Date().toISOString()
        });

        return translation.text;

    } catch (error) {
        const requestEnd = Date.now();

        console.error('[DeepL] Request failed:', {
            error: error.message,
            duration: requestEnd - requestStart
        });

        throw error;
    }
}
```

**Debug Output Example:**
```
[DeepL] API request: {
    text: 'I need to check the server status in Kubernetes',
    textLength: 47,
    sourceLang: 'EN',
    targetLang: 'ES',
    timestamp: '2025-10-12T21:30:46.234Z'
}

[DeepL] API response: {
    translatedText: 'Necesito verificar el estado del servidor en Kubernetes',
    detectedSourceLanguage: 'EN',
    duration: 456,
    timestamp: '2025-10-12T21:30:46.690Z'
}
```

#### 6.3 Translation Quality Comparison

**WITHOUT HMLCP:**
```
Raw STT Output:
"I need to check the thing in kubernetes"

DeepL Translation (EN → ES):
"Necesito revisar la cosa en kubernetes"

Quality Issues:
- "la cosa" (the thing) is vague and ambiguous
- Lowercase "kubernetes" (not proper noun)
- "revisar" is generic (review/check)
```

**WITH HMLCP:**
```
ULO-Processed Output:
"I need to check the server status in Kubernetes"

DeepL Translation (EN → ES):
"Necesito verificar el estado del servidor en Kubernetes"

Quality Improvements:
- "el estado del servidor" (the server status) is specific and clear
- Proper noun "Kubernetes" preserved
- "verificar" is more technical/precise (verify)
```

---

## Layer 7: Azure TTS

### Micro-Layer Breakdown

#### 7.1 TTS Request
**File:** `conference-server.js:425-435`

```javascript
// Synthesize translated text to speech
timing.ttsStart = Date.now();

const audioData = await synthesizeSpeech(
    translatedText,
    targetParticipant.language
);

timing.ttsEnd = Date.now();

console.log('[TTS] Speech synthesis completed:', {
    text: translatedText,
    textLength: translatedText.length,
    language: targetParticipant.language,
    audioSize: audioData.byteLength,
    duration: timing.ttsEnd - timing.ttsStart
});
```

#### 7.2 Azure TTS Implementation
**File:** `conference-server.js:170-195`

```javascript
async function synthesizeSpeech(text, language) {
    const requestStart = Date.now();
    const sdk = require('microsoft-cognitiveservices-speech-sdk');

    // Configure Azure Speech SDK
    const speechConfig = sdk.SpeechConfig.fromSubscription(
        AZURE_SPEECH_KEY,
        AZURE_SPEECH_REGION
    );

    // Voice selection based on language
    const voiceMap = {
        'en': 'en-US-AriaNeural',
        'es': 'es-ES-ElviraNeural',
        'fr': 'fr-FR-DeniseNeural',
        'de': 'de-DE-KatjaNeural',
        'it': 'it-IT-ElsaNeural'
    };

    speechConfig.speechSynthesisVoiceName = voiceMap[language] || 'en-US-AriaNeural';
    speechConfig.speechSynthesisOutputFormat =
        sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    console.log('[Azure TTS] Configuration:', {
        text: text,
        textLength: text.length,
        language: language,
        voice: speechConfig.speechSynthesisVoiceName,
        outputFormat: 'Audio16Khz32KBitRateMonoMp3',
        timestamp: new Date().toISOString()
    });

    // Create synthesizer
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

    return new Promise((resolve, reject) => {
        synthesizer.speakTextAsync(
            text,
            result => {
                const requestEnd = Date.now();

                if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                    console.log('[Azure TTS] Synthesis success:', {
                        audioSize: result.audioData.byteLength,
                        duration: requestEnd - requestStart,
                        audioFormat: 'MP3',
                        sampleRate: '16kHz',
                        bitrate: '32kbps',
                        timestamp: new Date().toISOString()
                    });

                    synthesizer.close();
                    resolve(result.audioData);
                } else {
                    console.error('[Azure TTS] Synthesis failed:', {
                        reason: result.reason,
                        errorDetails: result.errorDetails,
                        duration: requestEnd - requestStart
                    });

                    synthesizer.close();
                    reject(new Error(`TTS failed: ${result.errorDetails}`));
                }
            },
            error => {
                const requestEnd = Date.now();

                console.error('[Azure TTS] Synthesis error:', {
                    error: error,
                    duration: requestEnd - requestStart
                });

                synthesizer.close();
                reject(error);
            }
        );
    });
}
```

**Debug Output Example:**
```
[Azure TTS] Configuration: {
    text: 'Necesito verificar el estado del servidor en Kubernetes',
    textLength: 57,
    language: 'es',
    voice: 'es-ES-ElviraNeural',
    outputFormat: 'Audio16Khz32KBitRateMonoMp3',
    timestamp: '2025-10-12T21:30:47.123Z'
}

[Azure TTS] Synthesis success: {
    audioSize: 28672,
    duration: 412,
    audioFormat: 'MP3',
    sampleRate: '16kHz',
    bitrate: '32kbps',
    timestamp: '2025-10-12T21:30:47.535Z'
}
```

#### 7.3 Voice Configuration Details

```javascript
const voiceDetails = {
    'en-US-AriaNeural': {
        gender: 'Female',
        locale: 'en-US',
        style: 'Professional, friendly',
        useCases: ['General', 'Business', 'Technical']
    },
    'es-ES-ElviraNeural': {
        gender: 'Female',
        locale: 'es-ES',
        style: 'Clear, neutral',
        useCases: ['General', 'News', 'Education']
    },
    'fr-FR-DeniseNeural': {
        gender: 'Female',
        locale: 'fr-FR',
        style: 'Warm, conversational',
        useCases: ['General', 'Customer Service']
    },
    'de-DE-KatjaNeural': {
        gender: 'Female',
        locale: 'de-DE',
        style: 'Professional, clear',
        useCases: ['General', 'Business']
    },
    'it-IT-ElsaNeural': {
        gender: 'Female',
        locale: 'it-IT',
        style: 'Natural, expressive',
        useCases: ['General', 'Entertainment']
    }
};
```

---

## Layer 8: Audio Delivery

### Micro-Layer Breakdown

#### 8.1 Server Emission
**File:** `conference-server.js:441-456`

```javascript
// Calculate total latency
timing.endTime = Date.now();
const totalLatency = timing.endTime - timing.startTime;

// Prepare response payload
const responsePayload = {
    from: participant.username,
    originalText: rawTranscription,
    processedText: processedTranscription,
    translatedText: translatedText,
    audioData: audioData.toString('base64'),
    sourceLanguage: participant.language,
    targetLanguage: targetParticipant.language,
    timing: {
        totalLatency: totalLatency,
        sttTime: timing.sttEnd - timing.sttStart,
        uloTime: timing.uloEnd - timing.uloStart,
        translationTime: timing.translationEnd - timing.translationStart,
        ttsTime: timing.ttsEnd - timing.ttsStart,
        networkLatency: timing.startTime - timestamp
    }
};

console.log('[Server] Sending translated-audio event:', {
    to: targetParticipant.username,
    payloadSize: JSON.stringify(responsePayload).length,
    audioSize: audioData.byteLength,
    base64Size: responsePayload.audioData.length,
    timing: responsePayload.timing
});

// Emit to target participant's room
socket.to(roomId).emit('translated-audio', responsePayload);

console.log('[Server] Event emitted successfully');
```

**Debug Output Example:**
```
[Server] Sending translated-audio event: {
    to: 'user2',
    payloadSize: 42567,
    audioSize: 28672,
    base64Size: 38230,
    timing: {
        totalLatency: 1234,
        sttTime: 342,
        uloTime: 1,
        translationTime: 456,
        ttsTime: 412,
        networkLatency: 23
    }
}

[Server] Event emitted successfully
```

#### 8.2 Client Reception
**File:** `public/index.html`

```javascript
socket.on('translated-audio', (data) => {
    const receiveTime = Date.now();

    console.log('[Client] Received translated-audio:', {
        from: data.from,
        originalText: data.originalText,
        processedText: data.processedText,
        translatedText: data.translatedText,
        audioDataSize: data.audioData.length,
        sourceLanguage: data.sourceLanguage,
        targetLanguage: data.targetLanguage,
        serverTiming: data.timing,
        receiveTime: receiveTime
    });

    // Display transcription in UI
    displayTranscription(data.originalText, data.translatedText);

    // Create and play audio
    const audioPlayStart = Date.now();
    const audio = new Audio('data:audio/mp3;base64,' + data.audioData);

    audio.onloadedmetadata = () => {
        console.log('[Audio] Metadata loaded:', {
            duration: audio.duration,
            src: 'base64 MP3'
        });
    };

    audio.oncanplaythrough = () => {
        console.log('[Audio] Ready to play:', {
            readyState: audio.readyState,
            bufferTime: Date.now() - audioPlayStart
        });
    };

    audio.onplay = () => {
        console.log('[Audio] Playback started:', {
            currentTime: audio.currentTime,
            duration: audio.duration
        });
    };

    audio.onended = () => {
        console.log('[Audio] Playback ended:', {
            totalPlayTime: Date.now() - audioPlayStart
        });
    };

    audio.onerror = (error) => {
        console.error('[Audio] Playback error:', {
            error: error,
            errorCode: audio.error?.code,
            errorMessage: audio.error?.message
        });
    };

    // Start playback
    audio.play().catch(error => {
        console.error('[Audio] Play() failed:', {
            error: error.message,
            name: error.name
        });
    });
});
```

**Debug Output Example:**
```
[Client] Received translated-audio: {
    from: 'user1',
    originalText: 'I need to check the thing',
    processedText: 'I need to check the server status',
    translatedText: 'Necesito verificar el estado del servidor',
    audioDataSize: 38230,
    sourceLanguage: 'en',
    targetLanguage: 'es',
    serverTiming: {
        totalLatency: 1234,
        sttTime: 342,
        uloTime: 1,
        translationTime: 456,
        ttsTime: 412,
        networkLatency: 23
    },
    receiveTime: 1697234568567
}

[Audio] Metadata loaded: {
    duration: 2.3,
    src: 'base64 MP3'
}

[Audio] Ready to play: {
    readyState: 4,
    bufferTime: 15
}

[Audio] Playback started: {
    currentTime: 0,
    duration: 2.3
}

[Audio] Playback ended: {
    totalPlayTime: 2315
}
```

---

## Layer 9: Profile Persistence

### Micro-Layer Breakdown

#### 9.1 Auto-Save Timer
**File:** `conference-server.js:743-761`

```javascript
// Auto-save all user profiles every 5 minutes
const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes

setInterval(async () => {
    const saveStart = Date.now();

    console.log('[HMLCP] Starting auto-save...');
    console.log('[HMLCP] Profiles in memory:', userProfiles.size);

    let savedCount = 0;
    let errorCount = 0;
    const saveResults = [];

    for (const [key, { profile }] of userProfiles.entries()) {
        try {
            const profileSaveStart = Date.now();
            await profile.save();
            const profileSaveEnd = Date.now();

            savedCount++;
            saveResults.push({
                key: key,
                userId: profile.userId,
                language: profile.language,
                duration: profileSaveEnd - profileSaveStart,
                status: 'success'
            });

        } catch (error) {
            errorCount++;
            saveResults.push({
                key: key,
                error: error.message,
                status: 'error'
            });

            console.error(`[HMLCP] Error saving profile ${key}:`, error);
        }
    }

    const saveEnd = Date.now();

    console.log('[HMLCP] Auto-save complete:', {
        totalProfiles: userProfiles.size,
        savedCount: savedCount,
        errorCount: errorCount,
        totalDuration: saveEnd - saveStart
    });

    console.table(saveResults);

}, AUTO_SAVE_INTERVAL);

console.log('[HMLCP] Auto-save enabled:', {
    intervalMs: AUTO_SAVE_INTERVAL,
    intervalMinutes: AUTO_SAVE_INTERVAL / 60000
});
```

**Debug Output Example:**
```
[HMLCP] Auto-save enabled: {
    intervalMs: 300000,
    intervalMinutes: 5
}

... (5 minutes later) ...

[HMLCP] Starting auto-save...
[HMLCP] Profiles in memory: 3

[HMLCP] Auto-save complete: {
    totalProfiles: 3,
    savedCount: 3,
    errorCount: 0,
    totalDuration: 24
}

┌─────────┬──────────────────┬───────────┬──────────┬──────────┬──────────┐
│ (index) │       key        │  userId   │ language │ duration │  status  │
├─────────┼──────────────────┼───────────┼──────────┼──────────┼──────────┤
│    0    │ 'testuser_en'    │'testuser' │   'en'   │    7     │'success' │
│    1    │ 'user2_es'       │  'user2'  │   'es'   │    8     │'success' │
│    2    │ 'admin_fr'       │  'admin'  │   'fr'   │    9     │'success' │
└─────────┴──────────────────┴───────────┴──────────┴──────────┴──────────┘
```

#### 9.2 Profile Save Implementation
**File:** `hmlcp/user-profile.js:save()`

```javascript
async save() {
    const saveStart = Date.now();

    // Update timestamp
    this.lastUpdated = new Date().toISOString();

    // Serialize to JSON
    const data = JSON.stringify(this, null, 2);

    // Determine file path
    const filePath = `./hmlcp/profiles/${this.userId}_${this.language}.json`;

    console.log('[Profile] Saving:', {
        userId: this.userId,
        language: this.language,
        filePath: filePath,
        dataSize: data.length
    });

    try {
        // Ensure directory exists
        await fs.promises.mkdir('./hmlcp/profiles', { recursive: true });

        // Write to file
        await fs.promises.writeFile(filePath, data, 'utf8');

        const saveEnd = Date.now();

        console.log('[Profile] Saved successfully:', {
            userId: this.userId,
            filePath: filePath,
            dataSize: data.length,
            duration: saveEnd - saveStart
        });

        return true;

    } catch (error) {
        const saveEnd = Date.now();

        console.error('[Profile] Save failed:', {
            userId: this.userId,
            filePath: filePath,
            error: error.message,
            duration: saveEnd - saveStart
        });

        throw error;
    }
}
```

**Debug Output Example:**
```
[Profile] Saving: {
    userId: 'testuser',
    language: 'en',
    filePath: './hmlcp/profiles/testuser_en.json',
    dataSize: 1456
}

[Profile] Saved successfully: {
    userId: 'testuser',
    filePath: './hmlcp/profiles/testuser_en.json',
    dataSize: 1456,
    duration: 7
}
```

#### 9.3 Backup Strategy

```javascript
// Implement backup before overwriting
async saveWithBackup() {
    const filePath = `./hmlcp/profiles/${this.userId}_${this.language}.json`;
    const backupPath = `./hmlcp/profiles/backups/${this.userId}_${this.language}_${Date.now()}.json`;

    try {
        // Check if file exists
        await fs.promises.access(filePath);

        // Create backup
        await fs.promises.mkdir('./hmlcp/profiles/backups', { recursive: true });
        await fs.promises.copyFile(filePath, backupPath);

        console.log('[Profile] Backup created:', backupPath);

    } catch (error) {
        // File doesn't exist, skip backup
        console.log('[Profile] No existing file to backup');
    }

    // Save new version
    await this.save();
}
```

---

## Debugging Checklist

### Pre-Flight Checks

```javascript
// 1. Environment Variables
console.log('[Debug] Environment check:', {
    DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY ? '✓ Set' : '✗ Missing',
    DEEPL_API_KEY: process.env.DEEPL_API_KEY ? '✓ Set' : '✗ Missing',
    AZURE_SPEECH_KEY: process.env.AZURE_SPEECH_KEY ? '✓ Set' : '✗ Missing',
    AZURE_SPEECH_REGION: process.env.AZURE_SPEECH_REGION ? '✓ Set' : '✗ Missing',
    NODE_ENV: process.env.NODE_ENV || 'development'
});

// 2. Directory Structure
const requiredDirs = [
    './hmlcp',
    './hmlcp/profiles',
    './public',
    './public/js'
];

for (const dir of requiredDirs) {
    try {
        await fs.promises.access(dir);
        console.log(`[Debug] Directory exists: ${dir} ✓`);
    } catch {
        console.error(`[Debug] Directory missing: ${dir} ✗`);
    }
}

// 3. Dependencies
const requiredModules = [
    'socket.io',
    '@deepgram/sdk',
    'microsoft-cognitiveservices-speech-sdk',
    'dotenv'
];

for (const module of requiredModules) {
    try {
        require.resolve(module);
        console.log(`[Debug] Module available: ${module} ✓`);
    } catch {
        console.error(`[Debug] Module missing: ${module} ✗`);
    }
}
```

### Runtime Monitoring

```javascript
// Memory usage tracking
setInterval(() => {
    const usage = process.memoryUsage();
    console.log('[Monitor] Memory usage:', {
        rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`,
        profilesInMemory: userProfiles.size
    });
}, 60000); // Every minute

// Connection tracking
let activeConnections = 0;

io.on('connection', (socket) => {
    activeConnections++;
    console.log('[Monitor] Connection stats:', {
        activeConnections: activeConnections,
        socketId: socket.id
    });

    socket.on('disconnect', () => {
        activeConnections--;
        console.log('[Monitor] Connection stats:', {
            activeConnections: activeConnections,
            socketId: socket.id
        });
    });
});
```

---

## Performance Monitoring

### Latency Breakdown

```javascript
// Complete timing instrumentation
class PerformanceMonitor {
    constructor() {
        this.metrics = [];
    }

    startRequest() {
        return {
            startTime: Date.now(),
            networkLatency: 0,
            sttStart: 0,
            sttEnd: 0,
            uloStart: 0,
            uloEnd: 0,
            translationStart: 0,
            translationEnd: 0,
            ttsStart: 0,
            ttsEnd: 0,
            endTime: 0
        };
    }

    finishRequest(timing) {
        const breakdown = {
            totalLatency: timing.endTime - timing.startTime,
            networkLatency: timing.networkLatency,
            sttLatency: timing.sttEnd - timing.sttStart,
            uloLatency: timing.uloEnd - timing.uloStart,
            translationLatency: timing.translationEnd - timing.translationStart,
            ttsLatency: timing.ttsEnd - timing.ttsStart,
            percentages: {}
        };

        // Calculate percentages
        const total = breakdown.totalLatency;
        breakdown.percentages = {
            network: ((breakdown.networkLatency / total) * 100).toFixed(1) + '%',
            stt: ((breakdown.sttLatency / total) * 100).toFixed(1) + '%',
            ulo: ((breakdown.uloLatency / total) * 100).toFixed(1) + '%',
            translation: ((breakdown.translationLatency / total) * 100).toFixed(1) + '%',
            tts: ((breakdown.ttsLatency / total) * 100).toFixed(1) + '%'
        };

        this.metrics.push(breakdown);

        console.log('[Performance] Request breakdown:', breakdown);
        console.table(breakdown.percentages);

        return breakdown;
    }

    getStats() {
        if (this.metrics.length === 0) return null;

        const stats = {
            count: this.metrics.length,
            avgTotalLatency: this.avg(this.metrics.map(m => m.totalLatency)),
            avgSttLatency: this.avg(this.metrics.map(m => m.sttLatency)),
            avgUloLatency: this.avg(this.metrics.map(m => m.uloLatency)),
            avgTranslationLatency: this.avg(this.metrics.map(m => m.translationLatency)),
            avgTtsLatency: this.avg(this.metrics.map(m => m.ttsLatency)),
            p50: this.percentile(this.metrics.map(m => m.totalLatency), 50),
            p95: this.percentile(this.metrics.map(m => m.totalLatency), 95),
            p99: this.percentile(this.metrics.map(m => m.totalLatency), 99)
        };

        console.log('[Performance] Statistics:', stats);
        console.table(stats);

        return stats;
    }

    avg(arr) {
        return (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
    }

    percentile(arr, p) {
        const sorted = arr.slice().sort((a, b) => a - b);
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[index].toFixed(2);
    }
}

const perfMonitor = new PerformanceMonitor();

// Usage in request handler
socket.on('audio-stream', async (data) => {
    const timing = perfMonitor.startRequest();

    // ... process request ...

    timing.endTime = Date.now();
    perfMonitor.finishRequest(timing);
});

// Get stats periodically
setInterval(() => {
    perfMonitor.getStats();
}, 300000); // Every 5 minutes
```

### Expected Performance Targets

```
Component Latencies (Target / Acceptable / Poor):
┌──────────────────┬────────┬────────────┬──────┐
│ Component        │ Target │ Acceptable │ Poor │
├──────────────────┼────────┼────────────┼──────┤
│ Network          │ <50ms  │ <100ms     │>200ms│
│ STT (Deepgram)   │ <300ms │ <500ms     │>1000 │
│ ULO Processing   │ <5ms   │ <10ms      │>50ms │
│ Translation      │ <400ms │ <800ms     │>1500 │
│ TTS (Azure)      │ <400ms │ <1000ms    │>2000 │
│ Total End-to-End │ <1200ms│ <2500ms    │>4000 │
└──────────────────┴────────┴────────────┴──────┘

Percentage Distribution (Ideal):
- Network: ~5%
- STT: ~25%
- ULO: <1%
- Translation: ~35%
- TTS: ~34%
```

---

## Common Issues & Solutions

### Issue 1: High STT Latency

**Symptoms:**
- Deepgram requests taking >1000ms
- Timeout errors

**Debug:**
```javascript
console.log('[Debug] STT latency issue:', {
    audioSize: audioBuffer.byteLength,
    language: language,
    customVocabCount: customVocab.length,
    requestTime: Date.now()
});
```

**Solutions:**
1. Reduce audio chunk size
2. Check network connectivity to Deepgram
3. Verify API key quota
4. Use streaming API instead of prerecorded

### Issue 2: ULO Not Applying Mappings

**Symptoms:**
- Processed text same as raw transcription
- Phrase mappings not working

**Debug:**
```javascript
console.log('[Debug] ULO issue:', {
    rawText: rawText,
    processedText: processedText,
    phraseMapCount: Object.keys(profile.phraseMap).length,
    phraseMap: profile.phraseMap
});

// Test individual mappings
for (const [pattern, replacement] of Object.entries(profile.phraseMap)) {
    const regex = new RegExp(pattern, 'gi');
    const matches = rawText.match(regex);
    console.log(`[Debug] Pattern "${pattern}":`, {
        matches: matches,
        wouldReplace: matches ? true : false
    });
}
```

**Solutions:**
1. Check phrase mapping patterns (case sensitivity)
2. Verify profile loaded correctly
3. Test regex patterns independently
4. Check profile save/load cycle

### Issue 3: WebSocket Disconnections

**Symptoms:**
- Frequent disconnects
- "disconnect" events in logs

**Debug:**
```javascript
socket.on('disconnect', (reason) => {
    console.log('[Debug] Disconnect issue:', {
        reason: reason,
        transport: socket.io.engine.transport.name,
        connected: socket.connected,
        timestamp: Date.now()
    });
});

// Monitor connection quality
socket.io.engine.on('packet', (packet) => {
    if (packet.type === 'ping' || packet.type === 'pong') {
        console.log('[Debug] Connection health:', {
            type: packet.type,
            timestamp: Date.now()
        });
    }
});
```

**Solutions:**
1. Enable WebSocket in Azure App Service
2. Check firewall rules
3. Increase ping timeout
4. Enable sticky sessions for load balancer

### Issue 4: Azure TTS Failures

**Symptoms:**
- TTS returning errors
- No audio generated

**Debug:**
```javascript
console.log('[Debug] TTS issue:', {
    text: text,
    textLength: text.length,
    language: language,
    voice: voiceMap[language],
    region: AZURE_SPEECH_REGION,
    keySet: AZURE_SPEECH_KEY ? 'Yes' : 'No'
});
```

**Solutions:**
1. Verify Azure Speech key and region
2. Check text length (max 400 characters per request)
3. Verify voice name for language
4. Check Azure quota limits

### Issue 5: Profile Not Persisting

**Symptoms:**
- Changes lost after restart
- Auto-save not working

**Debug:**
```javascript
// Test save manually
const testProfile = userProfiles.get('testuser_en').profile;
try {
    await testProfile.save();
    console.log('[Debug] Manual save: SUCCESS');

    // Verify file exists
    const filePath = `./hmlcp/profiles/testuser_en.json`;
    const data = await fs.promises.readFile(filePath, 'utf8');
    console.log('[Debug] File content:', JSON.parse(data));
} catch (error) {
    console.error('[Debug] Manual save: FAILED', error);
}
```

**Solutions:**
1. Check write permissions on profiles directory
2. Verify auto-save interval is running
3. Check Azure file system persistence settings
4. Implement backup strategy

---

## Azure-Specific Debugging

### Azure App Service Logs

```bash
# Stream application logs
az webapp log tail \
    --resource-group realtime-translation-rg \
    --name realtime-translation-1760218638

# Download logs
az webapp log download \
    --resource-group realtime-translation-rg \
    --name realtime-translation-1760218638 \
    --log-file app-logs.zip
```

### Azure Configuration Check

```bash
# Check WebSocket configuration
az webapp config show \
    --resource-group realtime-translation-rg \
    --name realtime-translation-1760218638 \
    --query "webSocketsEnabled"

# Check always-on setting
az webapp config show \
    --resource-group realtime-translation-rg \
    --name realtime-translation-1760218638 \
    --query "alwaysOn"

# Check app settings
az webapp config appsettings list \
    --resource-group realtime-translation-rg \
    --name realtime-translation-1760218638
```

### Performance Diagnostics

```bash
# Check app insights
az monitor app-insights component show \
    --app realtime-translation-1760218638 \
    --resource-group realtime-translation-rg

# Query performance metrics
az monitor metrics list \
    --resource /subscriptions/{subscription-id}/resourceGroups/realtime-translation-rg/providers/Microsoft.Web/sites/realtime-translation-1760218638 \
    --metric-names "AverageResponseTime" "Requests" "Http5xx"
```

---

## API Testing Scripts

### Test STT

```javascript
// test-deepgram.js
const { createClient } = require('@deepgram/sdk');
const fs = require('fs');

async function testDeepgram() {
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

    // Load test audio
    const audioBuffer = fs.readFileSync('./test-audio.wav');

    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
            model: 'nova-2',
            language: 'en-US',
            smart_format: true,
            keywords: ['Kubernetes:25', 'Azure:25']
        }
    );

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Transcription:', result.results.channels[0].alternatives[0].transcript);
    }
}

testDeepgram();
```

### Test DeepL

```javascript
// test-deepl.js
async function testDeepL() {
    const response = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
            'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            text: ['I need to check the server status'],
            source_lang: 'EN',
            target_lang: 'ES'
        })
    });

    const data = await response.json();
    console.log('Translation:', data.translations[0].text);
}

testDeepL();
```

### Test Azure TTS

```javascript
// test-azure-tts.js
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const fs = require('fs');

async function testAzureTTS() {
    const speechConfig = sdk.SpeechConfig.fromSubscription(
        process.env.AZURE_SPEECH_KEY,
        process.env.AZURE_SPEECH_REGION
    );

    speechConfig.speechSynthesisVoiceName = 'en-US-AriaNeural';
    speechConfig.speechSynthesisOutputFormat =
        sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

    return new Promise((resolve, reject) => {
        synthesizer.speakTextAsync(
            'This is a test of Azure text to speech',
            result => {
                fs.writeFileSync('test-output.mp3', Buffer.from(result.audioData));
                console.log('Audio saved to test-output.mp3');
                resolve();
            },
            reject
        );
    });
}

testAzureTTS();
```

---

## Contact & Support

**Live Demo:** https://realtime-translation-1760218638.azurewebsites.net/hmlcp-demo.html

**GitHub Repository:** [Your repo link]

**Documentation:** This guide

**System Status:** Check Azure Portal for service health

---

## Revision History

- **v1.0** (2025-10-17): Initial comprehensive debugging guide
- Covers all 9 layers of HMLCP system
- Includes Azure-specific debugging
- Performance monitoring and testing scripts

---

**END OF MICRO-LAYER DEBUGGING GUIDE**
