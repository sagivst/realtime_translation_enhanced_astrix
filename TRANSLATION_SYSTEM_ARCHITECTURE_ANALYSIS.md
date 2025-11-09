# Translation System Architecture - Complete Analysis

**Azure VM:** 20.170.155.53  
**Location:** /home/azureuser/translation-app/  
**Date:** 2025-11-05

---

## System Overview

This is a **bidirectional real-time translation system** built on Asterisk with AudioSocket integration. The system supports simultaneous translation between Extension 7000 (EN→FR) and Extension 7001 (FR→EN) with advanced latency synchronization.

---

## 1. AudioSocket Architecture - How Extensions Connect

### 1.1 Port Mapping

The system uses **dual AudioSocket servers** to handle multiple extensions:

```
Extension 7000 (EN→FR):
  - AudioSocket TCP: Port 5050 → Incoming audio from Asterisk
  - AudioSocket WebSocket: Port 5051 → Outgoing audio to Asterisk bridge

Extension 7001 (FR→EN):
  - AudioSocket TCP: Port 5052 → Incoming audio from Asterisk
  - AudioSocket WebSocket: Port 5053 → Outgoing audio to Asterisk bridge

Bridge Monitoring (for verification):
  - Port 5054: Monitor Extension 7000's bridge output
  - Port 5056: Monitor Extension 7001's bridge output
```

**File:** `audiosocket-orchestrator.js`

### 1.2 Extension Detection & UUID Format

**UUID Format:** `7000-xxxxx` or `7001-xxxxx`  
**Extension Extraction:** First 4 characters determine extension (7000 or 7001)

```javascript
function getExtensionFromUUID(uuid) {
    if (uuid.startsWith("7000")) return "7000";
    if (uuid.startsWith("7001")) return "7001";
    return null;
}
```

**Port-to-Extension Mapping:**
```javascript
getExtensionFromPort(port) {
    const portMap = {
        5050: '7000',  // Main AudioSocket → Extension 7000
        5051: '7000',  // WebSocket → Extension 7000
        5052: '7001',  // Second AudioSocket → Extension 7001
        5053: '7001'   // Second WebSocket → Extension 7001
    };
    return portMap[port] || 'unknown';
}
```

### 1.3 AudioSocket Protocol

**TCP Protocol (Incoming from Asterisk):**
- 3-byte header: `[type][length_high][length_low][payload]`
- Frame types:
  - `0x01`: UUID frame (16 bytes binary UUID)
  - `0x10`: Audio frame (320 bytes = 20ms @ 8kHz PCM)
  - `0x00`: Hangup
  - `0xFF`: Error

**WebSocket Protocol (Outgoing to Asterisk):**
- Raw PCM16 audio data
- Frame size: 640 bytes (20ms @ 16kHz)
- Binary mode, no headers

**File:** `audiosocket-orchestrator.js` (lines 200-350)

---

## 2. Complete Translation Pipeline Flow

### 2.1 Phase 1: Audio Ingestion (AudioSocket → ASR)

```
Asterisk Extension 7000/7001
    ↓ (TCP AudioSocket protocol)
AudioSocket TCP Server (Port 5050/5052)
    ↓ (3-byte header parsing)
UUID Detection → Session Creation
    ↓ (PCM 8kHz frames, 320 bytes/20ms)
ASR Worker (Deepgram)
```

**Timeline Tracking:**
- `firstAudioFrameTime`: First frame arrival timestamp
- `lastAudioFrameTime`: Last frame timestamp (gap detection)

**File:** `audiosocket-integration.js` (lines 140-200)

### 2.2 Phase 2: ASR → Machine Translation

```
Deepgram ASR
    ↓ (Transcript event: "Hello world")
ASR Complete Event
    ├─ Track: asrEndTime
    └─ Calculate: asrToMtGap = translationStart - asrEndTime
DeepL MT Service
    ├─ Extension 7000 → translator7000 instance
    └─ Extension 7001 → translator7001 instance
```

**Key Features:**
- **Separate DeepL instances** per extension (prevents blocking)
- **QA Mode bypass:** If source === target language, skip translation
- **Incremental translation:** Session-based context preservation

**File:** `audiosocket-integration.js` (lines 960-1020)

### 2.3 Phase 3: Translation → TTS

```
DeepL Translation Output
    ↓ (Translated text: "Bonjour le monde")
Translation Complete Event
    ├─ Track: translationTime
    └─ Calculate: mtToTtsGap = ttsStart - (translationStart + translationTime)
ElevenLabs TTS
    ├─ API Call: /text-to-speech/{voiceId}
    ├─ Output format: PCM 16kHz (output_format: "pcm_16000")
    └─ Audio duration: ~1-2 seconds
```

**TTS Configuration:**
```javascript
{
    text: translatedText,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        use_speaker_boost: true
    },
    output_format: "pcm_16000"  // 16kHz PCM output
}
```

**File:** `audiosocket-integration.js` (lines 1020-1080)

### 2.4 Phase 4: Audio Processing & Buffering

```
ElevenLabs PCM 16kHz Output
    ↓ (Save recording: ./recordings/elevenlabs-{uuid}-{timestamp}-16khz.pcm)
Audio Stream Buffer
    ├─ Input: PCM 16kHz
    ├─ Comfort Noise Generation (optional)
    │   ├─ Types: white, pink, brown, call-center, trading-room
    │   ├─ VAD-based level adjustment
    │   └─ Fade in/out (50ms default)
    └─ Delay Buffer (controlled by Latency Sync Manager)
```

**Buffer Configuration:**
```javascript
{
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16,
    maxBufferSize: 2000,  // 2 seconds max
    comfortNoise: {
        enabled: true,
        noiseType: 'white',
        speechLevel: -30,   // dB during speech
        silenceLevel: -15,  // dB during gaps
        vadThreshold: 0.01,
        fadeInMs: 50,
        fadeOutMs: 50
    }
}
```

**File:** `audio-stream-buffer.js` (lines 1-200)

### 2.5 Phase 5: Latency Sync & Cross-Extension Routing

```
Audio Stream Buffer Output
    ↓ (PCM 16kHz with delay)
Latency Sync Manager
    ├─ Track E2E latency per extension
    ├─ Calculate sync buffer: maxLatency - currentLatency
    └─ Emit buffer adjustment
    ↓
Cross-Extension WebSocket Routing
    ├─ Extension 7000 (EN→FR) → Port 5053 (Bridge 7001)
    └─ Extension 7001 (FR→EN) → Port 5051 (Bridge 7000)
```

**Routing Logic:**
```javascript
// OPPOSITE extension routing for cross-language injection
const targetPort = (session.extension === '7000') ? 5053 : 5051;
const micEndpointUrl = `ws://127.0.0.1:${targetPort}/mic/${uuid}`;
```

**File:** `audiosocket-integration.js` (lines 260-290)

---

## 3. UUID + Extension Routing System

### 3.1 UUID Format

**Standard Format:** `{extension}-{asterisk-uuid}`  
**Examples:**
- `7000-a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- `7001-f9e8d7c6-b5a4-3210-9876-543210fedcba`

**Binary UUID Conversion (from Asterisk):**
```javascript
// Asterisk sends 16 bytes binary → Convert to hyphenated format
const hex = frameData.toString("hex");
uuidString = hex.substring(0, 8) + "-" + 
             hex.substring(8, 12) + "-" + 
             hex.substring(12, 16) + "-" + 
             hex.substring(16, 20) + "-" + 
             hex.substring(20);
```

### 3.2 Session Registry

**Global Registry:** `global.activeSessions` (Map)

**Session Object Structure:**
```javascript
{
    uuid: "7000-xxxxx",
    extension: "7000",
    asrWorker: ASRStreamingWorker,
    humeWorker: HumeStreamingClient,
    audioStreamBuffer: AudioStreamBuffer,
    micWebSocket: WebSocket,
    humeAudioBuffer: [],
    created: Date.now(),
    // Timing markers
    firstAudioFrameTime: null,
    lastAudioFrameTime: null,
    lsEnterTime: null,
    lsExitTime: null,
    bridgeInjectTime: null
}
```

**File:** `audiosocket-integration.js` (lines 140-190)

---

## 4. Timing & Synchronization System

### 4.1 Latency Tracking Stages

The system tracks **9 serial stages** + **3 parallel stages** (Hume EVI path):

**Serial Pipeline (Main Translation Path):**
1. **AudioSocket→ASR** - Network latency from Asterisk to ASR worker
2. **ASR** - Deepgram speech recognition latency
3. **ASR→MT** - Server overhead between ASR and translation
4. **MT** - DeepL translation latency
5. **MT→TTS** - Server overhead between translation and TTS
6. **TTS** - ElevenLabs synthesis latency
7. **TTS→LS** - Server overhead before latency sync buffer
8. **LS** - Latency sync buffer delay (synchronization)
9. **LS→Bridge** - Server overhead before bridge injection

**Parallel Pipeline (Emotion Detection Path):**
1. **AudioSocket→EV** - Network latency to Hume
2. **Hume** - Emotion vector extraction latency
3. **EV→TTS** - Gap between emotion detection and TTS start

**E2E Calculation:**
```javascript
// If serial < parallel, use parallel (bottleneck)
let e2e = serialLatency;
if (serialLatency < parallelLatency) {
    e2e = parallelLatency;
    console.log(`Parallel path (${parallelLatency}ms) is bottleneck`);
}
```

**File:** `latency-sync-manager.js` (lines 100-150)

### 4.2 Synchronization Algorithm

**Goal:** Keep both extensions synchronized by buffering faster extension

```javascript
synchronizeChannels() {
    const maxLatency = Math.max(...activeChannels.map(ch => ch.latencies.e2e.current));
    const slowestChannel = activeChannels.find(ch => ch.latencies.e2e.current === maxLatency);
    
    activeChannels.forEach(channel => {
        const bufferNeeded = maxLatency - channel.latencies.e2e.current;
        const targetBuffer = bufferNeeded + baseBuffer + safetyMargin;
        
        channel.buffer.target = targetBuffer;
        channel.buffer.adjustment = targetBuffer - channel.buffer.current;
        
        if (Math.abs(channel.buffer.adjustment) > adjustmentThreshold) {
            this.applyBufferAdjustment(channel);
        }
    });
}
```

**Parameters:**
- `baseBuffer`: 100ms (default baseline)
- `safetyMargin`: 50ms (prevents underrun)
- `adjustmentThreshold`: 20ms (minimum change to apply)
- `syncIntervalMs`: 500ms (check frequency)

**File:** `latency-sync-manager.js` (lines 200-250)

---

## 5. Bidirectional Translation with Timing Server (Phase 2)

### 5.1 Architecture

**Timing Server:** `bidirectional-timing-server.js`  
**Port:** 6000 (TCP protocol), 6001 (HTTP status API)

**Purpose:**
- Track extension pairs (7000 ↔ 7001)
- Measure latency difference between directions
- Buffer faster direction to sync with slower
- Inject audio via conference-server callback

**File:** `bidirectional-timing-server.js` (lines 1-200)

### 5.2 Protocol Messages

**REGISTER_EXTENSION:**
```json
{
    "type": "REGISTER_EXTENSION",
    "extension": "7000",
    "uuid": "7000-xxxxx"
}
```

**REGISTER_PAIR:**
```json
{
    "type": "REGISTER_PAIR",
    "ext1": "7000",
    "ext2": "7001",
    "callUuid": "pair-1234567890"
}
```

**AUDIO_PACKET:**
```json
{
    "type": "AUDIO_PACKET",
    "fromExt": "7000",
    "audioData": "<base64-encoded-pcm>",
    "timestamp": 1699123456789
}
```

**INJECT_AUDIO (server → conference):**
```json
{
    "type": "INJECT_AUDIO",
    "toExtension": "7001",
    "audioData": "<base64-encoded-pcm>",
    "timestamp": 1699123456789
}
```

**File:** `timing-client.js` (lines 50-150)

### 5.3 Phase 2 vs Phase 1 Mode

**Phase 1 (Direct Injection):**
```javascript
// Audio exits LS buffer → Direct WebSocket injection
sendAudioToMicEndpoint(session.micWebSocket, pcmBuffer);
session.bridgeInjectTime = performance.now();
```

**Phase 2 (Timing Server Buffering):**
```javascript
// Audio exits LS buffer → Timing server for cross-extension sync
if (ENABLE_PHASE2 && global.timingClient.connected) {
    global.timingClient.sendAudioPacket(
        String(session.extension),
        pcmBuffer,
        Date.now()
    );
}
```

**Control Variable:** `process.env.TIMING_PHASE2_ENABLED` (default: `false`)

**File:** `audiosocket-integration.js` (lines 320-360)

---

## 6. WebSocket Output Architecture

### 6.1 Mic Endpoint WebSocket

**URL Pattern:** `ws://127.0.0.1:{port}/mic/{uuid}`

**Connection Setup:**
```javascript
const targetPort = (session.extension === '7000') ? 5053 : 5051;
const micEndpointUrl = `ws://127.0.0.1:${targetPort}/mic/${uuid}`;
session.micWebSocket = new WebSocket(micEndpointUrl);
```

**Audio Format:**
- PCM 16kHz, 16-bit, mono
- Frame size: 640 bytes (20ms)
- Binary WebSocket messages

**Amplification:**
```javascript
// 500x amplification for audibility
function amplifyAudio(pcmBuffer, gain = 500) {
    for (let i = 0; i < pcmBuffer.length; i += 2) {
        let sample = pcmBuffer.readInt16LE(i);
        sample = Math.round(sample * gain);
        sample = Math.max(-32768, Math.min(32767, sample));
        amplified.writeInt16LE(sample, i);
    }
}
```

**File:** `audiosocket-integration.js` (lines 230-280)

### 6.2 Frame Transmission

**sendAudioToMicEndpoint Function:**
```javascript
function sendAudioToMicEndpoint(micWebSocket, pcmBuffer) {
    if (micWebSocket.readyState !== WebSocket.OPEN) return;
    
    // Amplify audio by 500x
    pcmBuffer = amplifyAudio(pcmBuffer, 500);
    
    const FRAME_SIZE = 640;  // 16kHz * 20ms * 2 bytes
    const numFrames = Math.floor(pcmBuffer.length / FRAME_SIZE);
    
    for (let i = 0; i < numFrames; i++) {
        const frame = pcmBuffer.slice(i * FRAME_SIZE, (i + 1) * FRAME_SIZE);
        micWebSocket.send(frame);
    }
    
    // Send remaining partial frame
    if (pcmBuffer.length % FRAME_SIZE !== 0) {
        const remainingFrame = pcmBuffer.slice(numFrames * FRAME_SIZE);
        micWebSocket.send(remainingFrame);
    }
}
```

**File:** `audiosocket-integration.js` (lines 240-270)

---

## 7. Conference Server Integration

### 7.1 Global State Management

**Socket.IO Integration:**
```javascript
global.io = io;  // Set by conference-server.js
const getIO = () => global.io;
```

**Timing Client Integration:**
```javascript
global.timingClient = new TimingClient();
global.timingClient.connect();
```

**Session Registry:**
```javascript
global.activeSessions = new Map();  // Extension → Session
global.activeAudioStreamBuffers = new Map();  // UUID → AudioStreamBuffer
```

**File:** `conference-server.js` (lines 30-70)

### 7.2 QA Settings (Language Configuration)

**Per-Extension Configuration:**
```javascript
global.qaConfigs = new Map();
global.qaConfigs.set('7000', { 
    sourceLang: 'en', 
    targetLang: 'fr', 
    qaMode: false 
});
global.qaConfigs.set('7001', { 
    sourceLang: 'fr', 
    targetLang: 'en', 
    qaMode: false 
});
```

**QA Mode Features:**
- Bypass translation if source === target
- Useful for testing ASR/TTS without translation latency
- Language override for debugging

**File:** `conference-server.js` (lines 150-165)

### 7.3 Comfort Noise Control

**Global Config:**
```javascript
global.comfortNoiseConfig = {
    enabled: true,
    noiseType: 'white',  // 'white', 'pink', 'brown', 'call-center', 'trading-room'
    speechLevel: -30,
    silenceLevel: -15,
    vadThreshold: 0.01,
    fadeInMs: 50,
    fadeOutMs: 50,
    bufferDelay: 0
};

global.applyComfortNoiseConfig = applyComfortNoiseConfig;
```

**Dynamic Updates:**
```javascript
function applyComfortNoiseConfig() {
    global.activeAudioStreamBuffers.forEach((buffer, participantId) => {
        buffer.updateComfortNoiseConfig(global.comfortNoiseConfig);
        if (global.comfortNoiseConfig.bufferDelay !== undefined) {
            buffer.setDelay(global.comfortNoiseConfig.bufferDelay);
        }
    });
}
```

**File:** `audiosocket-integration.js` (lines 10-60)

---

## 8. Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ASTERISK EXTENSIONS                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│ Extension 7000 (EN speaker)         Extension 7001 (FR speaker)         │
│        ↓                                    ↓                            │
│ AudioSocket TCP 5050                 AudioSocket TCP 5052               │
└─────────────────┬───────────────────────────┬───────────────────────────┘
                  │                           │
                  │  3-byte header frames     │
                  │  UUID + PCM 8kHz          │
                  ↓                           ↓
        ┌──────────────────────────────────────────────┐
        │ AUDIOSOCKET ORCHESTRATOR                     │
        │  - Parse protocol frames                     │
        │  - Extract UUID: "7000-xxxxx" / "7001-xxxxx" │
        │  - Emit 'pcm-frame' events                   │
        └──────────────────┬───────────────────────────┘
                           ↓
        ┌──────────────────────────────────────────────┐
        │ SESSION CREATION (per UUID)                  │
        │  - Extension detection (7000 or 7001)        │
        │  - Initialize ASR Worker (Deepgram)          │
        │  - Initialize Hume Worker (emotion)          │
        │  - Create AudioStreamBuffer                  │
        │  - Open cross-extension WebSocket            │
        └──────────────┬───────────────────────────────┘
                       │
                       ├──────────────────┬────────────────────┐
                       ↓                  ↓                    ↓
        ┌──────────────────────┐  ┌──────────────┐  ┌──────────────────┐
        │ ASR WORKER           │  │ HUME WORKER  │  │ TIMING TRACKER   │
        │ (Deepgram)           │  │ (Emotion)    │  │                  │
        │  - PCM 8kHz input    │  │  - Parallel  │  │ - firstAudioTime │
        │  - Streaming API     │  │    pipeline  │  │ - Track gaps     │
        │  - Emit 'final'      │  │  - Emit      │  │ - E2E latency    │
        │    transcripts       │  │    'metrics' │  │                  │
        └──────────┬───────────┘  └──────┬───────┘  └──────────────────┘
                   │                     │
                   │ "Hello world"       │ {arousal: 0.6, valence: 0.8}
                   ↓                     │
        ┌──────────────────────────────────────────────┐
        │ TRANSLATION PIPELINE                         │
        │  ┌────────────────────────────────────────┐  │
        │  │ 1. ASR Complete (asrEndTime)           │  │
        │  │    ↓ (asrToMtGap)                      │  │
        │  │ 2. DeepL MT (translator7000/7001)      │  │
        │  │    ↓ (translationTime)                 │  │
        │  │    ↓ (mtToTtsGap)                      │  │
        │  │ 3. ElevenLabs TTS (PCM 16kHz)          │◀─┤ Emotion vector
        │  │    ↓ (ttsTime)                         │  │
        │  │    ↓ (ttsToLsGap)                      │  │
        │  │ 4. Audio Stream Buffer (LS)            │  │
        │  │    ↓ (lsDelay - sync buffer)           │  │
        │  │    ↓ (lsToBridgeGap)                   │  │
        │  │ 5. Cross-Extension WebSocket Injection │  │
        │  └────────────────────────────────────────┘  │
        └──────────────────┬───────────────────────────┘
                           │
                           ├─────────────────┬──────────────────┐
                           ↓ (Phase 1)       ↓ (Phase 2)        ↓
        ┌──────────────────────────┐  ┌──────────────────┐  ┌──────────────────┐
        │ DIRECT WEBSOCKET         │  │ TIMING SERVER    │  │ LATENCY SYNC MGR │
        │  - Port 5051 (→7000)     │  │  - Port 6000     │  │  - Track E2E     │
        │  - Port 5053 (→7001)     │  │  - Pair tracking │  │  - Calculate     │
        │  - /mic/{uuid} endpoint  │  │  - Buffer sync   │  │    buffer needs  │
        │  - PCM 16kHz, 640 bytes  │  │  - INJECT_AUDIO  │  │  - Emit Socket.IO│
        │  - 500x amplification    │  │    callback      │  │    updates       │
        └──────────┬───────────────┘  └────────┬─────────┘  └──────────────────┘
                   │                           │
                   │ (Cross-extension routing) │
                   ↓                           ↓
        ┌──────────────────────────────────────────────┐
        │ ASTERISK BRIDGES                             │
        │  - Bridge 7000 receives FR audio             │
        │  - Bridge 7001 receives EN audio             │
        │  - Extensions hear translated speech         │
        └──────────────────────────────────────────────┘
```

---

## 9. Key Files Reference

| File | Purpose | Key Functions |
|------|---------|---------------|
| `audiosocket-orchestrator.js` | AudioSocket protocol handler | `handleTcpConnection()`, `handleWebSocketConnection()`, `sendAudio()` |
| `audiosocket-integration.js` | Translation pipeline coordinator | `processTranslationPipeline()`, `initializeASRWorker()`, `sendAudioToMicEndpoint()` |
| `conference-server.js` | Main server & Socket.IO hub | Global state setup, QA configs, timing client integration |
| `latency-sync-manager.js` | E2E latency tracking & sync | `recordLatency()`, `synchronizeChannels()`, `calculateE2ELatency()` |
| `audio-stream-buffer.js` | Buffering & comfort noise | `addAudioChunk()`, `processStream()`, `generateComfortNoiseFrame()` |
| `bidirectional-timing-server.js` | Cross-extension sync server | `handleAudioPacket()`, `sendInjectAudio()`, latency buffering |
| `timing-client.js` | Timing server TCP client | `sendAudioPacket()`, `registerPair()`, `setInjectAudioHandler()` |

---

## 10. Timing Measurements Summary

**Complete E2E Pipeline (9 serial stages + 3 parallel):**

| Stage | Typical Latency | Type |
|-------|----------------|------|
| AudioSocket→ASR | 10-50ms | Network/Overhead |
| ASR (Deepgram) | 200-400ms | Service |
| ASR→MT | 5-20ms | Overhead |
| MT (DeepL) | 100-300ms | Service |
| MT→TTS | 5-15ms | Overhead |
| TTS (ElevenLabs) | 500-1000ms | Service |
| TTS→LS | 5-10ms | Overhead |
| LS (Sync Buffer) | 0-500ms | Synchronization |
| LS→Bridge | 5-20ms | Overhead |
| **Serial Total** | **~1000-2400ms** | **Sum** |
| | |
| AudioSocket→EV | 10-50ms | Overhead |
| Hume (Emotion) | 100-300ms | Service |
| EV→TTS | 5-20ms | Overhead |
| **Parallel Total** | **~200-500ms** | **Sum** |
| | |
| **E2E Latency** | **max(Serial, Parallel)** | **Bottleneck** |

---

## 11. Configuration & Environment Variables

**Core API Keys:**
```bash
DEEPGRAM_API_KEY=<key>
DEEPL_API_KEY=<key>
DEEPL_API_KEY_7001=<key>  # Separate key for Extension 7001
ELEVENLABS_API_KEY=<key>
ELEVENLABS_DEFAULT_VOICE_ID=<voice-id>
HUME_EVI_API_KEY=<key>
```

**Feature Flags:**
```bash
TIMING_PHASE2_ENABLED=false  # Enable timing server buffering
```

**System Ports:**
```bash
# AudioSocket TCP ports
AUDIOSOCKET_7000_PORT=5050
AUDIOSOCKET_7001_PORT=5052

# WebSocket ports
WEBSOCKET_7000_PORT=5051
WEBSOCKET_7001_PORT=5053

# Timing server
TIMING_SERVER_PORT=6000
TIMING_STATUS_PORT=6001
```

---

## 12. Critical Insights

1. **Dual Orchestrator Design:**  
   - Separate AudioSocket orchestrators prevent port conflicts
   - Extension detection via port mapping enables automatic routing

2. **Cross-Extension Routing:**  
   - Extension 7000 audio → Port 5053 (Bridge 7001)
   - Extension 7001 audio → Port 5051 (Bridge 7000)
   - Creates bidirectional translation loop

3. **Separate DeepL Instances:**  
   - `translator7000` and `translator7001`
   - Prevents concurrent request blocking
   - Each extension has dedicated translation pipeline

4. **Latency Sync Strategy:**  
   - Track E2E for both directions
   - Buffer faster direction to match slower
   - Maintains conversational synchronization

5. **Phase 1 vs Phase 2:**  
   - **Phase 1:** Direct WebSocket injection (current default)
   - **Phase 2:** Timing server buffering (experimental)
   - Phase 2 enables cross-extension latency compensation

6. **Comfort Noise System:**  
   - VAD-based level adjustment
   - Multiple noise types (algorithmic + pre-recorded)
   - Fills gaps during pipeline processing

7. **Timing Instrumentation:**  
   - 9 serial measurement points
   - 3 parallel measurement points
   - Real-time latency tracking via Socket.IO
   - Dashboard integration for visualization

---

**End of Analysis**  
Generated: 2025-11-05  
System Version: Production (Azure VM)
