# Phase 2: Extensions 7777/8888 Integration Roadmap

**Status**: Ready for Implementation
**Date**: November 6, 2025
**Checkpoint Branch**: `working-7000and1-7777and8-on-dashboard`

---

## 1. Executive Summary

This document outlines the roadmap for completing the integration of the **Open-Source Gateway (ExternalMedia-based)** for extensions **7777/8888** with the existing **Translation Server** infrastructure currently serving extensions **7000/7001**.

### Key Principles:
1. **Parallel Development**: 7777/8888 will be developed separately from 7000/7001
2. **File Duplication**: Translation server files will be duplicated and adapted for 7777/8888
3. **Zero Impact**: Development will NOT affect the working 7000/7001 system
4. **Future Migration**: Once 7777/8888 is proven, 7000/7001 can be phased out

---

## 2. Current System Architecture

### 2.1 What Exists (7000/7001 - AudioSocket-based)

```
┌─────────────┐     AudioSocket      ┌───────────────────────┐
│  Asterisk   │────── TCP 5050 ──────▶│  audiosocket-         │
│             │                       │  integration.js       │
│ Extensions  │                       │  (7000/7001)          │
│ 7000/7001   │                       │                       │
└─────────────┘                       └───────────┬───────────┘
                                                   │
                                                   ▼
                                      ┌───────────────────────┐
                                      │  conference-server.js  │
                                      │  Translation Pipeline  │
                                      │  - ASR (Deepgram)      │
                                      │  - Translation (DeepL) │
                                      │  - TTS (ElevenLabs)    │
                                      │  - Emotion (Hume AI)   │
                                      └───────────────────────┘
```

**Key Files (7000/7001 Stack)**:
- `/home/azureuser/translation-app/audiosocket-integration.js` (50KB)
- `/home/azureuser/translation-app/audiosocket-orchestrator.js` (23KB)
- `/home/azureuser/translation-app/asterisk-ari-handler.js` (19KB)
- `/home/azureuser/translation-app/conference-server.js` (Translation Server)

**Status**: ✅ **WORKING - DO NOT MODIFY**

---

### 2.2 What Exists (7777/8888 - ExternalMedia-based)

```
┌─────────────┐     ExternalMedia     ┌───────────────────────┐
│  Asterisk   │────── RTP (UDP) ──────▶│  ari-externalmedia-   │
│             │       Ports 5000/5001  │  handler.js           │
│ Extensions  │                        │  (7777/8888)          │
│ 7777/8888   │◀────── RTP ───────────│                       │
└─────────────┘                        └───────────────────────┘
                                                   │
                                                   ▼
                                      ┌───────────────────────┐
                                      │  audio-monitor-       │
                                      │  server.js            │
                                      │  (Debug/Monitor Only) │
                                      │  Port 3001            │
                                      └───────────────────────┘
```

**Key Files (7777/8888 Stack)**:
- `/home/azureuser/translation-app/ari-externalmedia-handler.js` (11KB)
- `/home/azureuser/translation-app/audio-monitor-server.js` (16KB)
- `/home/azureuser/translation-app/simple-port-crossover.js` (4KB)
- `/home/azureuser/translation-app/rtp-recorder.js` (2KB)

**Status**: ✅ **Audio flow verified** | ❌ **Translation NOT integrated**

---

### 2.3 What is Missing (The Gap)

The **Open-Source Gateway** (ari-externalmedia-handler.js) currently:
- ✅ Receives RTP audio from Asterisk (7777/8888)
- ✅ Creates ExternalMedia channels via ARI
- ✅ Manages mixing bridges
- ✅ Sends RTP back to Asterisk
- ❌ **DOES NOT** forward audio to Translation Server
- ❌ **DOES NOT** receive translated audio back
- ❌ **DOES NOT** implement cross-extension routing (7777 ↔ 8888)

**The audio currently flows in circles within the Gateway - it needs to flow through the Translation Server.**

---

## 3. Target Architecture (Phase 2 Completion)

```
┌─────────────┐   RTP    ┌──────────────────┐   WebSocket   ┌──────────────────┐
│  Asterisk   │──5000────▶│  Gateway         │───────────────▶│  Translation     │
│             │          │  (7777/8888)     │               │  Server          │
│ Ext 7777    │◀─5000────│                  │◀──────────────│  (7777/8888)     │
└─────────────┘          │  - RTP Handler   │   PCM 16kHz   │                  │
                         │  - WebSocket     │               │  - ASR           │
┌─────────────┐   RTP    │    Client        │               │  - Translation   │
│  Asterisk   │──5001────▶│  - Session Mgmt  │               │  - TTS           │
│             │          │  - Audio Router  │               │  - Emotion       │
│ Ext 8888    │◀─5001────│                  │               │                  │
└─────────────┘          └──────────────────┘               └──────────────────┘

Audio Flow:
1. Ext 7777 (English) → Gateway → Translation Server → Translated (French) → Gateway → Ext 8888
2. Ext 8888 (French) → Gateway → Translation Server → Translated (English) → Gateway → Ext 7777
```

---

## 4. Implementation Roadmap

### Phase 2A: File Duplication and Setup (Day 1)

#### 4.1 Create Separate Translation Server for 7777/8888

**Files to Duplicate**:
```bash
# Duplicate translation server files
cp conference-server.js conference-server-externalmedia.js
cp audiosocket-integration.js externalmedia-integration.js
cp audiosocket-orchestrator.js externalmedia-orchestrator.js
```

**Reason**: Keep 7000/7001 system completely isolated and working.

#### 4.2 Port Configuration

**7000/7001 Stack (AudioSocket)** - DO NOT CHANGE:
- AudioSocket: TCP 5050, 5051, 5052
- Conference Server: HTTP 3000, WebSocket 3000

**7777/8888 Stack (ExternalMedia)** - NEW PORTS:
- Gateway RTP: UDP 5000 (7777), 5001 (8888)
- Monitor Server: HTTP 3001
- Translation Server: HTTP **3002**, WebSocket **3002** (NEW)
- Translation WebSocket Endpoints: **ws://localhost:3002/translate/7777** and **ws://localhost:3002/translate/8888**

#### 4.3 Configuration Files

Create new environment configuration:
```bash
# /home/azureuser/translation-app/.env.externalmedia
NODE_ENV=production

# Translation Server Ports (NEW)
TRANSLATION_SERVER_PORT=3002
WEBSOCKET_PORT=3002

# Gateway Configuration
GATEWAY_RTP_PORT_7777=5000
GATEWAY_RTP_PORT_8888=5001

# AI Services (Same as 7000/7001)
DEEPGRAM_API_KEY=<existing>
DEEPL_API_KEY=<existing>
ELEVENLABS_API_KEY=<existing>
HUME_API_KEY=<existing>

# Extension Mapping
EXT_7777_LANGUAGE=en
EXT_8888_LANGUAGE=fr
```

---

### Phase 2B: Gateway Modification (Day 2-3)

#### 4.4 Add WebSocket Client to Gateway

**File**: `ari-externalmedia-handler.js`

**New Functionality**:
1. **WebSocket Connection Management**
   - Open WebSocket to Translation Server when ExternalMedia channel created
   - One socket per extension per call
   - Handle reconnection and errors

2. **Audio Routing Logic**
   ```javascript
   // Incoming RTP from Asterisk
   socket7777.on('message', (rtpPacket) => {
     const pcmAudio = extractPCM(rtpPacket);

     // Send to Translation Server via WebSocket
     translationWS7777.send(pcmAudio);
   });

   // Translated audio from Translation Server
   translationWS7777.on('message', (translatedPCM) => {
     const rtpPacket = encapsulateRTP(translatedPCM);

     // Send to OTHER extension (crossover)
     socket8888.send(rtpPacket, asterisk8888Endpoint);
   });
   ```

3. **Session Lifecycle**
   - Track active translation sessions
   - Clean up WebSockets on call end
   - Buffer management (2-3 frames ~60ms)

**Key Changes**:
```javascript
// Add WebSocket library
const WebSocket = require('ws');

// Translation Server endpoints
const TRANSLATION_WS_7777 = 'ws://localhost:3002/translate/7777';
const TRANSLATION_WS_8888 = 'ws://localhost:3002/translate/8888';

// Per-session WebSocket tracking
const translationSessions = new Map(); // channelId -> {ws7777, ws8888}
```

---

### Phase 2C: Translation Server Adaptation (Day 3-4)

#### 4.5 Modify `conference-server-externalmedia.js`

**Key Differences from AudioSocket Version**:

| Aspect | AudioSocket (7000/7001) | ExternalMedia (7777/8888) |
|--------|-------------------------|---------------------------|
| Input Protocol | TCP AudioSocket | WebSocket |
| Audio Format | PCM frames via AudioSocket protocol | Raw PCM via WebSocket |
| Session Management | AudioSocket connection lifecycle | WebSocket connection lifecycle |
| Channel Association | AudioSocket UUID | WebSocket connection ID |

**Implementation Steps**:

1. **Replace AudioSocket listener with WebSocket server**
   ```javascript
   // OLD (7000/7001)
   const audioSocketServer = net.createServer();
   audioSocketServer.listen(5050);

   // NEW (7777/8888)
   const wss = new WebSocket.Server({ port: 3002 });
   ```

2. **WebSocket endpoint routing**
   ```javascript
   wss.on('connection', (ws, req) => {
     const extension = extractExtension(req.url); // /translate/7777

     if (extension === '7777') {
       handle7777Session(ws);
     } else if (extension === '8888') {
       handle8888Session(ws);
     }
   });
   ```

3. **Audio processing pipeline** (SAME as 7000/7001)
   - ASR (Deepgram): English/French detection
   - Translation (DeepL): Bidirectional translation
   - TTS (ElevenLabs): Voice synthesis
   - Emotion (Hume AI): Emotional prosody

4. **Keep existing translation logic**
   ```javascript
   // This part is IDENTICAL to 7000/7001
   async function processAudio(pcmBuffer, sourceLanguage, targetLanguage) {
     // ASR
     const transcript = await deepgramASR(pcmBuffer, sourceLanguage);

     // Translation
     const translated = await deeplTranslate(transcript, targetLanguage);

     // TTS
     const audioBuffer = await elevenlabsTTS(translated, targetLanguage);

     return audioBuffer;
   }
   ```

#### 4.6 Remove AudioSocket-specific code

**Code to Remove**:
- AudioSocket frame parsing
- AudioSocket protocol handling
- TCP connection management specific to AudioSocket

**Code to Keep**:
- All AI service integrations (Deepgram, DeepL, ElevenLabs, Hume)
- Translation pipeline logic
- Language detection
- Buffer management
- Error handling

---

### Phase 2D: Testing and Validation (Day 5)

#### 4.7 Component Testing

**Test 1: Gateway ↔ Translation Server WebSocket**
```bash
# Start translation server
cd /home/azureuser/translation-app
node conference-server-externalmedia.js

# Start gateway
node ari-externalmedia-handler.js

# Check WebSocket connections
# Should see: "WebSocket connection opened for extension 7777"
```

**Test 2: Audio Flow (7777 → 8888)**
```bash
# 1. Call extension 7777 from phone A
# 2. Call extension 8888 from phone B
# 3. Speak English on 7777
# 4. Should hear French on 8888
```

**Test 3: Bidirectional Translation**
```bash
# Speak French on 8888
# Should hear English on 7777
```

**Test 4: Latency Measurement**
```bash
# Use audio monitor dashboard
# Open http://20.170.155.53:3001/
# Check latency metrics
# Target: < 150ms end-to-end
```

#### 4.8 Integration Testing

**Test 5: Simultaneous Calls**
```bash
# 1. Active call on 7000/7001 (AudioSocket)
# 2. Active call on 7777/8888 (ExternalMedia)
# Both should work independently
```

**Test 6: Failover Testing**
```bash
# Stop translation server for 7777/8888
# Gateway should send silence frames
# Call should remain stable
```

**Test 7: Reconnection Testing**
```bash
# Restart translation server during active call
# WebSocket should reconnect
# Audio should resume within 2 seconds
```

---

## 5. File Structure (Post-Implementation)

```
/home/azureuser/translation-app/
├── 7000-7001-stack/                  # AudioSocket System (LEGACY)
│   ├── audiosocket-integration.js
│   ├── audiosocket-orchestrator.js
│   ├── asterisk-ari-handler.js
│   ├── conference-server.js
│   └── .env.audiosocket
│
├── 7777-8888-stack/                  # ExternalMedia System (NEW)
│   ├── ari-externalmedia-handler.js  # Gateway (Modified)
│   ├── externalmedia-integration.js  # Adapted from audiosocket
│   ├── externalmedia-orchestrator.js # Adapted from audiosocket
│   ├── conference-server-externalmedia.js
│   ├── audio-monitor-server.js       # Debug/Monitor
│   └── .env.externalmedia
│
├── shared/                            # Shared AI Services
│   ├── deepgram-client.js
│   ├── deepl-client.js
│   ├── elevenlabs-client.js
│   └── hume-client.js
│
└── utils/                             # Shared Utilities
    ├── audio-buffer.js
    ├── rtp-handler.js
    └── websocket-utils.js
```

---

## 6. Development Strategy

### 6.1 Risk Mitigation

1. **Separate Processes**
   - 7000/7001 runs on ports 3000, 5050-5052
   - 7777/8888 runs on ports 3002, 5000-5001
   - No port conflicts, no interference

2. **Independent Testing**
   - Test 7777/8888 without affecting 7000/7001
   - If 7777/8888 fails, 7000/7001 continues working

3. **Gradual Migration**
   - Phase 2: Complete 7777/8888 integration
   - Phase 3: User acceptance testing on 7777/8888
   - Phase 4: Deprecate 7000/7001 (future)

### 6.2 Rollback Plan

If Phase 2 encounters issues:
```bash
# Stop new services
pkill -f "conference-server-externalmedia"
pkill -f "ari-externalmedia-handler"

# Restore to checkpoint
git checkout working-7000and1-7777and8-on-dashboard

# 7000/7001 remains unaffected
```

---

## 7. Success Criteria

Phase 2 is considered **COMPLETE** when:

✅ **Functional Requirements**:
1. Call 7777 (English) → Hear French on 8888
2. Call 8888 (French) → Hear English on 7777
3. Bidirectional translation works simultaneously
4. End-to-end latency < 150ms
5. Audio quality matches or exceeds 7000/7001

✅ **Technical Requirements**:
1. Gateway WebSocket client connects to Translation Server
2. RTP ↔ WebSocket conversion works correctly
3. Session management (lifecycle, cleanup) functions properly
4. Error handling and reconnection logic verified
5. No interference with 7000/7001 system

✅ **Operational Requirements**:
1. Services start automatically on server boot
2. Logging provides clear debugging information
3. Monitoring dashboard shows real-time metrics
4. Documentation updated with deployment procedures

---

## 8. Timeline Estimate

| Phase | Duration | Tasks |
|-------|----------|-------|
| **2A: Setup** | 0.5 days | File duplication, port configuration, environment setup |
| **2B: Gateway** | 1.5 days | WebSocket client, audio routing, session management |
| **2C: Translation** | 1.5 days | WebSocket server, protocol adaptation, testing |
| **2D: Testing** | 1.5 days | Component tests, integration tests, validation |
| **Total** | **5 days** | End-to-end implementation and testing |

---

## 9. Key Technical Specifications

### 9.1 Audio Format
- **Codec**: PCM16 (signed 16-bit linear)
- **Sample Rate**: 16 kHz
- **Channels**: Mono
- **Frame Size**: ~20ms (320 bytes at 16kHz)
- **Endianness**: Big-endian (network byte order)

### 9.2 WebSocket Protocol

**Connection**:
```
ws://localhost:3002/translate/{extension}
```

**Message Format**:
```javascript
// Gateway → Translation Server
{
  type: 'audio',
  extension: '7777',
  timestamp: 1699276800000,
  sequence: 12345,
  data: <Buffer> // PCM audio (320 bytes)
}

// Translation Server → Gateway
{
  type: 'translated_audio',
  extension: '7777',
  targetExtension: '8888',
  timestamp: 1699276800050,
  data: <Buffer> // Translated PCM audio
}
```

**Session Messages**:
```javascript
// Session start
{ type: 'session_start', extension: '7777', language: 'en' }

// Session end
{ type: 'session_end', extension: '7777' }

// Error
{ type: 'error', code: 'translation_failed', message: '...' }
```

### 9.3 RTP Packet Structure

```javascript
// RTP Header (12 bytes)
{
  version: 2,
  padding: 0,
  extension: 0,
  csrcCount: 0,
  marker: 0,
  payloadType: 0, // PCMU/PCMA
  sequenceNumber: uint16,
  timestamp: uint32,
  ssrc: uint32
}

// Payload: PCM audio data
```

---

## 10. Dependencies and Prerequisites

### 10.1 Required

- ✅ Node.js 18+ (installed)
- ✅ Asterisk 18.10+ with ARI (configured)
- ✅ ExternalMedia channels working (verified)
- ✅ RTP audio flow tested (verified)
- ✅ AI service APIs (Deepgram, DeepL, ElevenLabs, Hume)
- ❌ WebSocket library: `npm install ws` (NEEDED)

### 10.2 Optional (Already Available)

- ✅ Audio Monitor Dashboard (debugging)
- ✅ Crossover test script (validation)
- ✅ RTP recorder (debugging)

---

## 11. Next Steps

### Immediate Actions

1. **Create separate directory structure**
   ```bash
   ssh azureuser@20.170.155.53
   cd /home/azureuser/translation-app
   mkdir -p 7777-8888-stack
   mkdir -p 7000-7001-stack
   mkdir -p shared
   mkdir -p utils
   ```

2. **Duplicate translation server files**
   ```bash
   cp conference-server.js 7777-8888-stack/conference-server-externalmedia.js
   cp audiosocket-integration.js 7777-8888-stack/externalmedia-integration.js
   cp audiosocket-orchestrator.js 7777-8888-stack/externalmedia-orchestrator.js
   ```

3. **Install dependencies**
   ```bash
   cd 7777-8888-stack
   npm install ws
   ```

4. **Begin Gateway modification** (Phase 2B)

---

## 12. Questions to Resolve Before Starting

1. **Language Configuration**: Should 7777/8888 use the same language pairs as 7000/7001 (English ↔ French)?
2. **Voice Selection**: Should we reuse the same ElevenLabs voices, or select new ones for 7777/8888?
3. **Monitoring**: Should the audio monitor dashboard support both systems, or create separate dashboards?
4. **Failover**: What should happen if Translation Server is down? Silent frames, or recorded message?
5. **Session Persistence**: Should WebSocket connections persist across multiple calls, or reconnect each time?

---

## 13. Reference Documents

- `Gateway_Translation_Server_Integration.md` - WebSocket integration spec
- `Asterisk_Open-Source_Integration.md` - ExternalMedia implementation
- `checkpoint-backup/MANIFEST.md` - Current system state
- `checkpoint-backup/gateway/ari-externalmedia-handler.js` - Gateway source
- `checkpoint-backup/legacy-audiosocket/audiosocket-integration.js` - Reference implementation

---

## 14. Conclusion

This roadmap provides a clear path to integrate the Open-Source Gateway (7777/8888) with the existing Translation Server infrastructure while maintaining the working 7000/7001 system.

**Key Benefits**:
- ✅ Zero risk to production 7000/7001 system
- ✅ Clean separation of concerns
- ✅ Easy rollback if needed
- ✅ Foundation for future migration away from AudioSocket

**Next Phase**: Once 7777/8888 is working and validated, we can deprecate 7000/7001 and fully migrate to the ExternalMedia-based system.

---

**Document Version**: 1.0
**Last Updated**: November 6, 2025
**Author**: Claude Code
**Status**: Ready for Implementation
