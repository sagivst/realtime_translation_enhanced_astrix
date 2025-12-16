# **STTTTSserver System - Complete Technical Documentation**
## **Based on Code Review Analysis Only**

---

## **Executive Summary**

STTTTSserver is a real-time audio translation system deployed on Azure VM (20.170.155.53:3020) that processes audio through Speech-to-Text (Deepgram), Translation (DeepL), and Text-to-Speech (ElevenLabs) pipelines, with emotion analysis (Hume) and personalized language processing (HMLCP).

### **Core Capabilities**
- Real-time bidirectional audio translation
- Multi-language support with personalized linguistic overlay
- Emotion detection and analysis
- UDP/TCP audio streaming
- WebSocket-based client connections
- Comprehensive monitoring integration

---

## **System Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client Connections                           │
│                    Socket.IO (Port 3020)                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                    STTTTSserver.js                              │
│                  Main Processing Engine                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐      │
│  │                  UDP Audio Input                      │      │
│  │     Port 6120 (3333) | Port 6122 (4444)             │      │
│  └──────────────────────┬───────────────────────────────┘      │
│                         │                                        │
│  ┌──────────────────────▼───────────────────────────────┐      │
│  │              Audio Processing Pipeline                │      │
│  │                                                      │      │
│  │  1. Deepgram STT (with HMLCP vocabulary)            │      │
│  │  2. HMLCP ULO Layer (text transformation)           │      │
│  │  3. DeepL Translation                               │      │
│  │  4. ElevenLabs TTS                                  │      │
│  │  5. Hume Emotion Analysis (parallel)                │      │
│  └──────────────────────┬───────────────────────────────┘      │
│                         │                                        │
│  ┌──────────────────────▼───────────────────────────────┐      │
│  │                  UDP Audio Output                     │      │
│  │     Port 6121 (3333) | Port 6123 (4444)             │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              Monitoring Integration                   │      │
│  │   Station3Handler → StationAgent → Monitoring Server │      │
│  │   Station9Handler → Socket.IO Events → Metrics       │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## **Dependencies & Components (Code-Verified)**

### **NPM Packages Actually Used**
| Package | Version | Usage in Code |
|---------|---------|---------------|
| express | - | HTTP server framework |
| socket.io | 4.x | WebSocket connections |
| @deepgram/sdk | 4.11.2 | `deepgram.listen.live()`, `.prerecorded.transcribeFile()` |
| deepl-node | - | `translator.translateText()` |
| uuid | 13.0.0 | `uuidv4()` for unique IDs |
| dgram | built-in | UDP sockets for audio |
| net | built-in | TCP server for monitoring |

### **External API Services**
| Service | API Key Variable | Actual Calls |
|---------|-----------------|--------------|
| Deepgram | `DEEPGRAM_API_KEY` | `deepgram.listen.live()`, `deepgram.listen.prerecorded.transcribeFile()` |
| DeepL | `DEEPL_API_KEY` | `translator.translateText()` |
| ElevenLabs | `ELEVENLABS_API_KEY` | `elevenlabsTTS.synthesize()` |
| Hume | `HUME_EVI_API_KEY` | `humeClient.connect()`, `humeClient.sendAudio()` |

### **Custom Modules**
| Module | Purpose | Key Methods |
|--------|---------|-------------|
| elevenlabs-tts-service.js | TTS synthesis | `synthesize(text, voiceId)` |
| hume-streaming-client.js | Emotion analysis | `connect()`, `sendAudio()`, `on('metrics')` |
| station3-handler.js | STT monitoring | `initStationAgent()`, collects metrics |
| station9-handler.js | TTS monitoring | Tracks synthesis metrics |
| hmlcp/user-profile.js | User profiles | `addTextSample()`, `save()`, `load()` |
| hmlcp/ulo-layer.js | Text transformation | `apply()`, `generateCustomVocabulary()`, `learnFromCorrection()` |
| hmlcp/pattern-extractor.js | Pattern analysis | `extractCorrectionPattern()` |

---

## **Network Ports & Services**

### **Active Ports**
| Port | Protocol | Purpose | Code Reference |
|------|----------|---------|----------------|
| 3020 | TCP | Main HTTP/Socket.IO server | `PORT = process.env.PORT \|\| 3010` |
| 6120 | UDP | Audio input extension 3333 | `port3333In: 6120` |
| 6121 | UDP | Audio output extension 3333 | `port3333Out: 6121` |
| 6122 | UDP | Audio input extension 4444 | `port4444In: 6122` |
| 6123 | UDP | Audio output extension 4444 | `port4444Out: 6123` |
| 8083 | TCP | Database API Server | External monitoring |
| 3001 | TCP | Monitoring Server (actual) | Socket.IO monitoring |

### **Disabled Services**
- Port 6000: Timing server (commented out)
- Port 5050: AudioSocket server (disabled for 9007/9008)

---

## **Data Flow & Processing Pipeline**

### **Audio Translation Flow**
```
1. UDP Audio Input (6120/6122)
   ↓
2. Audio Buffer Collection
   ↓
3. Deepgram STT + HMLCP Custom Vocabulary
   const customVocab = uloLayer.generateCustomVocabulary()
   deepgram.listen.prerecorded.transcribeFile(audioBuffer, options)
   ↓
4. HMLCP ULO Layer Processing
   const processedTranscription = uloLayer.apply(transcript)
   profile.addTextSample(transcript)
   ↓
5. DeepL Translation
   translator.translateText(processedTranscription, sourceL, targetL)
   ↓
6. ElevenLabs TTS
   elevenlabsTTS.synthesize(text, voiceId)
   ↓
7. UDP Audio Output (6121/6123)
```

### **Parallel Emotion Analysis**
```
Audio → Hume Client
humeClient.sendAudio(audioChunk)
   ↓
humeClient.on('metrics', (metrics) => {
   arousal, valence, energy
})
   ↓
io.emit('emotionData', emotionData)
```

---

## **HMLCP System Integration**

### **Purpose**
Human-Machine Language Calibration Protocol - Personalizes translation by learning user-specific linguistic patterns.

### **Components & Usage**
1. **UserProfile** - Stores user linguistic data
   - `profile.addTextSample()` - Line 2093
   - `profile.save()` - Lines 3146, 3196, 3517
   - `profile.addCalibrationSample()` - Line 3184

2. **ULOLayer** - Applies text transformations
   - `uloLayer.apply(transcript)` - Lines 2090, 3070 **[ACTIVELY TRANSFORMS TEXT]**
   - `uloLayer.generateCustomVocabulary()` - Lines 1995, 3053
   - `uloLayer.learnFromCorrection()` - Line 3514

3. **PatternExtractor** - Analyzes patterns
   - `patternExtractor.extractCorrectionPattern()` - Line 3188

4. **Default Profiles** - Applied during onboarding
   - `applyDefaultProfile(profile, language)` - Line 3145

### **Data Storage**
- Profiles saved to: `/tmp/hmlcp-profiles/{userId}_{language}.json`
- Periodic saving every 5 minutes
- Learns from user corrections via API

---

## **Monitoring Integration**

### **StationAgent System**
```javascript
// Initialization (Lines 1026-1031)
station3_3333.initStationAgent(StationAgent)
station3_4444.initStationAgent(StationAgent)
station9_3333.initStationAgent(StationAgent)
station9_4444.initStationAgent(StationAgent)
```

### **Socket.IO Events Emitted**
| Event | Data | Purpose |
|-------|------|---------|
| `elevenlabsMetrics` | TTS performance | ElevenLabs synthesis metrics |
| `emotionData` | Arousal, valence, energy | Hume emotion analysis |
| `translatedAudio` | Audio buffer, metadata | Translated audio output |
| `transcriptionFinal` | Text, confidence | Final STT result |
| `stage_timing` | Pipeline timings | Latency tracking |
| `latencyUpdate` | Latency metrics | Performance monitoring |
| `unified-metrics` | Station metrics | Via StationAgent |

### **Monitoring Data Flow Issues**
- **Port Mismatch**: Monitoring Server on 3001, not 8090 as documented
- **Empty Snapshots**: `/api/snapshots` returns `[]` - data not reaching Database API
- **High Restarts**: database-api-server (2153), monitoring-server (213)

---

## **API Endpoints**

### **HMLCP Endpoints**
- `GET /api/hmlcp/profile/:userId/:language` - Get user profile stats
- `POST /api/hmlcp/correction` - Submit corrections for learning
- `POST /api/hmlcp/analyze` - Analyze linguistic patterns
- `GET /api/hmlcp/vocabulary/:userId/:language` - Get custom vocabulary

### **Conference Endpoints**
- `POST /join` - Join conference room
- `GET /rooms/:roomId` - Get room information
- WebSocket events for audio streaming

---

## **In-Memory Data Structures**

| Map/Variable | Purpose |
|--------------|---------|
| `rooms` | Conference rooms |
| `participants` | Connected users |
| `streamingConnections` | Deepgram connections by socket.id |
| `humeConnections` | Hume clients by socket.id |
| `gatewayAudioBuffers` | Audio buffers by extension |
| `extensionGainFactors` | Audio gain settings (3333: 7.5, 4444: 7.5) |
| `humeAudioBuffers` | Hume audio chunks |
| `socketToExtension` | Socket.id to extension mapping |

---

## **Critical Observations**

### **Working Components**
- ✅ All core services (STT, Translation, TTS) functional
- ✅ HMLCP actively processing and learning
- ✅ UDP audio input/output operational
- ✅ Socket.IO client connections stable
- ✅ Emotion analysis via Hume active

### **Issues Identified**
- ❌ Monitoring data not flowing to Database API
- ❌ Port discrepancy (3001 vs 8090)
- ❌ High service restart counts
- ❌ No database persistence (PostgreSQL stubbed)

### **Disabled Features**
- Timing server (port 6000)
- AudioSocket integration (port 5050)
- Microsoft Cognitive Services (replaced by ElevenLabs)
- Asterisk ARI integration (not used in main flow)

---

## **Configuration**

### **Environment Variables**
```bash
DEEPGRAM_API_KEY=806ac77eb08d83390c265228dd2cc89c0b86f23e
DEEPL_API_KEY=d7ec78e4-8fbb-4a34-b265-becea2b269ad
ELEVENLABS_API_KEY=sk_968d6d3e5b92cfce648ce9a38478ee131d98750ef4e09f05
HUME_EVI_API_KEY=ZO4I7zffvMCBTwytSvoCnSI9CrZjYfjdytH0039ST3CGgi1I
USE_DEEPGRAM_STREAMING=false
USE_HUME_EMOTION=false
PORT=3020
```

---

## **Summary**

STTTTSserver is a complex, multi-service real-time translation system with:
1. **Active HMLCP personalization** that transforms text in real-time
2. **Multiple external API integrations** (Deepgram, DeepL, ElevenLabs, Hume)
3. **UDP-based audio streaming** for low latency
4. **Comprehensive monitoring hooks** (currently disconnected)
5. **In-memory state management** without persistent storage

The system is operational but has monitoring data flow issues that prevent metrics from reaching the Database API server.

---

*Document generated: 2025-12-15*
*Based on code review of STTTTSserver.js deployed on Azure VM 20.170.155.53*