# Phase 2 Bidirectional Translation: Sync & Bridge Communication
## Last Mile Architecture Documentation

**Status**: Currently Deployed
**Environment Variable**: `TIMING_PHASE2_ENABLED=true`
**Date**: Current Implementation (As-Deployed)

---

## Executive Summary

This document describes the **current implementation** (not planned/theoretical) of the Phase 2 bidirectional translation system, specifically focusing on the "last mile" - how translated audio is synchronized and delivered back to SIP phones through the bridge communication system.

**Current Issue**: Audio flows inbound (SIP phones → system) but does not return outbound (system → SIP phones). Only "Asterisk Voice Stream (IN)" is working.

---

## System Architecture Overview

### Components

1. **Bidirectional Timing Server** (`bidirectional-timing-server.js`)
   - Port: 6000 (TCP)
   - 523 lines of code
   - Manages extension pairing (7000 ↔ 7001)
   - Buffers audio with latency-based delays
   - Sends INJECT_AUDIO messages

2. **Conference Server** (`conference-server.js`)
   - Port: 3000 (HTTPS/HTTP)
   - 1231 lines of code
   - Main translation pipeline (STT → MT → TTS)
   - Global session registry for audio injection
   - INJECT_AUDIO handler for bridge delivery

3. **AudioSocket Integration** (`audiosocket-integration.js`)
   - Port: 5050 (TCP for Asterisk)
   - 1127 lines of code
   - Asterisk ↔ Node.js audio bridge
   - MicWebSocket endpoint management
   - Session registry and audio frame delivery

4. **Timing Client** (`timing-client.js`)
   - TCP client connecting conference-server to timing server
   - Message queue for offline resilience
   - Event handlers for INJECT_AUDIO responses

---

## Complete Audio Flow Path

### Inbound Path (Working)

```
SIP Phone (Ext 7000 speaks English)
    ↓ RTP/SIP
Asterisk (AudioSocket Dialplan)
    ↓ TCP (port 5050, binary audio frames)
audiosocket-integration.js :: AudioSocket Server
    ↓ PCM audio frames (16kHz, 16-bit)
Deepgram STT (WebSocket streaming)
    ↓ Transcript chunks
DeepL Translation Service
    ↓ Translated text (English → German)
ElevenLabs TTS (eleven_multilingual_v2)
    ↓ MP3 audio
Convert to PCM Buffer (16kHz mono)
```

### Outbound Path (Phase 2 - **INTENDED** but NOT WORKING)

```
PCM Buffer (translated German audio for ext 7001)
    ↓ [audiosocket-integration.js:333]
timingClient.sendAudioPacket(ext, buffer, timestamp)
    ↓ TCP message (JSON + base64 audio)

═══════════════════════════════════════════════════════════
Timing Server (Port 6000)
═══════════════════════════════════════════════════════════

bidirectional-timing-server.js :: handleAudioPacket()
    ↓ [Lines 445-470]
1. Lookup paired extension (7000 ↔ 7001)
2. Calculate latency difference between directions
3. Determine delay: delayMs = max(0, -latencyDiff)
4. Enqueue audio with delay
    ↓
LatencyBuffer.enqueue(toExt, audioBuffer, delayMs)
    ↓ [Lines 155-189]
Buffer processing timer reaches targetTime
    ↓
sendMessage(toExtension, {
    type: 'INJECT_AUDIO',
    toExtension: "7001",
    audioData: base64_encoded_pcm,
    timestamp: original_timestamp
})
    ↓ TCP back to conference server

═══════════════════════════════════════════════════════════
Conference Server
═══════════════════════════════════════════════════════════

conference-server.js :: INJECT_AUDIO handler [Lines 84-112]
    ↓
1. Lookup session: global.activeSessions.get("7001")
2. Validate: session.micWebSocket?.readyState === 1
3. Decode: Buffer.from(audioData, 'base64')
4. Inject: global.sendAudioToMicEndpoint(micWebSocket, buffer)
    ↓

audiosocket-integration.js :: sendAudioToMicEndpoint() [Lines 213-235]
    ↓ [Split into 640-byte frames]
micWebSocket.send(frame)  // 20ms audio chunks
    ↓ WebSocket (MicWebSocket endpoint)
    ↓ Back through AudioSocket protocol
Asterisk ConfBridge
    ↓ RTP/SIP
SIP Phone (Ext 7001)
    ↓
Speaker Channel 🔊 (NOT WORKING - NO AUDIO RECEIVED)
```

---

## Implementation Details

### 1. Session Registration (audiosocket-integration.js:812)

**When**: First audio frame arrives from Asterisk for an extension

```javascript
// Phase 2: Register session in global registry for audio injection
if (global.activeSessions) {
    global.activeSessions.set(String(frame.extensionId), session);
    console.log(`[Phase2] Registered session for extension ${frame.extensionId}`);
}
```

**Session Object Structure**:
```javascript
{
    uuid: "unique-session-id",
    extension: "7000" | "7001",
    micWebSocket: WebSocket, // For audio injection back to Asterisk
    asrWorker: DeepgramWorker,
    translationWorker: TranslationWorker,
    ttsService: ElevenLabsTTS,
    firstAudioFrameTime: timestamp,
    lsExitTime: timestamp,
    bridgeInjectTime: timestamp
}
```

### 2. Audio Packet Transmission (audiosocket-integration.js:333-340)

**When**: TTS completes and PCM buffer is ready

```javascript
// Phase 2: Route audio through timing server for buffering
const ENABLE_PHASE2 = process.env.TIMING_PHASE2_ENABLED === 'true';

if (ENABLE_PHASE2 && global.timingClient && global.timingClient.connected && session.extension) {
    console.log(`[Phase2] Sending audio packet to timing server for ext ${session.extension}`);
    global.timingClient.sendAudioPacket(
        String(session.extension),
        pcmBuffer,
        Date.now()
    );
    console.log('[Pipeline] ✓ Audio sent to timing server for buffering (Phase 2)');
}
```

**Message Format** (timing-client.js):
```javascript
{
    type: 'AUDIO_PACKET',
    fromExt: "7000",  // Who spoke (source of translation)
    audioData: "base64_encoded_pcm_buffer",
    timestamp: 1234567890
}
```

### 3. Extension Pair Management (bidirectional-timing-server.js:16-110)

**ExtensionPairManager** tracks 1:1 relationships:

```javascript
class ExtensionPairManager {
    constructor() {
        this.activePairs = new Map();     // ext → { paired, sessionId, bridge }
        this.latencyStats = new Map();    // "ext1→ext2" → { avg, samples }
        this.activeExtensions = new Map(); // ext → { uuid, timestamp }
    }

    registerExtension(extension, uuid) {
        // Track extension as active
        this.activeExtensions.set(extension, { uuid, timestamp: Date.now() });

        // Auto-pair if both 7000 and 7001 are active
        if (this.activeExtensions.has('7000') && this.activeExtensions.has('7001')) {
            if (!this.activePairs.has('7000')) {
                const callUuid = 'pair-' + Date.now();
                this.registerPair('7000', '7001', callUuid);
            }
        }
    }
}
```

**Pairing Structure**:
```javascript
activePairs.set('7000', {
    paired: '7001',
    sessionId: '7000-7001-pair-1234567890',
    bridge: 'bridge-7001',
    startTime: Date.now(),
    callUuid: 'pair-1234567890'
});

activePairs.set('7001', {
    paired: '7000',
    sessionId: '7000-7001-pair-1234567890',
    bridge: 'bridge-7000',
    startTime: Date.now(),
    callUuid: 'pair-1234567890'
});
```

### 4. Latency Buffer & Synchronization (bidirectional-timing-server.js:140-196)

**Purpose**: Delay faster direction to synchronize bidirectional audio

```javascript
class LatencyBuffer {
    enqueue(extension, packet, delayMs = 0) {
        if (!this.buffers.has(extension)) {
            this.buffers.set(extension, []);
        }

        const buffer = this.buffers.get(extension);

        buffer.push({
            packet,
            timestamp: Date.now(),
            delayMs,
            targetTime: Date.now() + delayMs
        });

        // Start processing timer
        if (!this.processingTimers.has(extension)) {
            this.startProcessing(extension);
        }
    }

    startProcessing(extension) {
        const processNext = () => {
            const buffer = this.buffers.get(extension);
            if (!buffer || buffer.length === 0) {
                this.processingTimers.delete(extension);
                return;
            }

            const now = Date.now();
            const item = buffer[0];

            if (now >= item.targetTime) {
                buffer.shift();

                // Send INJECT_AUDIO back to conference server
                this.sendMessage(extension, {
                    type: 'INJECT_AUDIO',
                    toExtension: extension,
                    audioData: item.packet.toString('base64'),
                    timestamp: item.timestamp
                });

                setImmediate(processNext);
            } else {
                const waitTime = item.targetTime - now;
                setTimeout(processNext, waitTime);
            }
        };

        processNext();
    }
}
```

### 5. AUDIO_PACKET Handler (bidirectional-timing-server.js:445-470)

**Flow**:

```javascript
handleAudioPacket(socket, msg) {
    const { fromExt, audioData, timestamp } = msg;

    // Step 1: Lookup pair
    const pairInfo = this.pairManager.getPair(fromExt);
    if (!pairInfo) {
        console.warn(`[Server] No pair found for extension ${fromExt}`);
        return;
    }

    const toExt = pairInfo.paired; // Route to paired extension

    // Step 2: Calculate sync delay
    const latencyDiff = this.pairManager.getLatencyDifference(fromExt, toExt);
    const delayMs = Math.max(0, -latencyDiff);

    // Step 3: Convert and enqueue
    const audioBuffer = Buffer.from(audioData, 'base64');
    this.latencyBuffer.enqueue(toExt, audioBuffer, delayMs);

    if (delayMs > 0) {
        console.log(`[Buffer] ${fromExt}→${toExt} delayed by ${delayMs}ms (sync)`);
    }
}
```

**Example**:
- Ext 7000 speaks (English)
- Audio translated to German
- `fromExt = "7000"`
- `toExt = "7001"` (paired extension)
- Audio buffered for ext 7001 with sync delay
- INJECT_AUDIO sent to conference server for delivery to 7001

### 6. INJECT_AUDIO Handler (conference-server.js:84-112)

**Receives buffered audio from timing server and injects to target extension**:

```javascript
global.timingClient.setInjectAudioHandler((msg) => {
    const { toExtension, audioData, timestamp } = msg;

    // Step 1: Lookup session
    const session = global.activeSessions.get(String(toExtension));
    if (!session) {
        console.warn(`[Phase2] ✗ No session found for extension ${toExtension}`);
        return;
    }

    // Step 2: Validate MicWebSocket
    if (!session.micWebSocket || session.micWebSocket.readyState !== 1) {
        console.warn(`[Phase2] ✗ MicWebSocket not ready for extension ${toExtension}`);
        return;
    }

    // Step 3: Decode audio
    const audioBuffer = Buffer.from(audioData, 'base64');

    // Step 4: Inject to bridge
    if (global.sendAudioToMicEndpoint) {
        global.sendAudioToMicEndpoint(session.micWebSocket, audioBuffer);
        console.log(`[Phase2] ✓ Injected ${audioBuffer.length} bytes to extension ${toExtension}`);
    } else {
        console.error('[Phase2] ✗ sendAudioToMicEndpoint not available');
    }
});
```

### 7. Bridge Audio Injection (audiosocket-integration.js:213-235)

**Final step: Send PCM audio back to Asterisk**:

```javascript
function sendAudioToMicEndpoint(micWebSocket, pcmBuffer) {
    if (!micWebSocket || micWebSocket.readyState !== WebSocket.OPEN) {
        console.warn('[MicWebSocket] Not connected, cannot send audio');
        return;
    }

    const FRAME_SIZE = 640; // 16kHz * 20ms * 2 bytes = 640 bytes per frame
    const numFrames = Math.floor(pcmBuffer.length / FRAME_SIZE);

    // Send full frames
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

// Export globally for INJECT_AUDIO handler
global.sendAudioToMicEndpoint = sendAudioToMicEndpoint;
```

**Frame Specification**:
- Sample Rate: 16kHz
- Channels: Mono
- Bit Depth: 16-bit PCM
- Frame Duration: 20ms
- Frame Size: 16000 samples/sec × 0.02 sec × 2 bytes = 640 bytes

---

## Communication Protocol

### Timing Server ↔ Conference Server

**TCP Connection**: Port 6000
**Message Format**: JSON + newline delimiter

#### Messages FROM Conference Server:

1. **REGISTER_EXTENSION**
```json
{
    "type": "REGISTER_EXTENSION",
    "extension": "7000",
    "uuid": "session-uuid-123"
}
```

2. **REGISTER_PAIR**
```json
{
    "type": "REGISTER_PAIR",
    "ext1": "7000",
    "ext2": "7001",
    "callUuid": "pair-1234567890"
}
```

3. **AUDIO_PACKET**
```json
{
    "type": "AUDIO_PACKET",
    "fromExt": "7000",
    "audioData": "base64_encoded_pcm_buffer...",
    "timestamp": 1234567890123
}
```

4. **LATENCY_UPDATE**
```json
{
    "type": "LATENCY_UPDATE",
    "fromExt": "7000",
    "toExt": "7001",
    "latencyMs": 250
}
```

#### Messages FROM Timing Server:

1. **INJECT_AUDIO**
```json
{
    "type": "INJECT_AUDIO",
    "toExtension": "7001",
    "audioData": "base64_encoded_pcm_buffer...",
    "timestamp": 1234567890123
}
```

2. **PAIR_REGISTERED**
```json
{
    "type": "PAIR_REGISTERED",
    "sessionId": "7000-7001-pair-1234567890",
    "ext1": "7000",
    "ext2": "7001"
}
```

---

## Critical Code Locations

### Conference Server (conference-server.js)

| Line | Component | Purpose |
|------|-----------|---------|
| 66-72 | Timing Client Init | Creates TCP connection to timing server |
| 75-78 | Global Session Registry | `global.activeSessions = new Map()` |
| 84-112 | INJECT_AUDIO Handler | Receives buffered audio, looks up session, calls sendAudioToMicEndpoint |

### AudioSocket Integration (audiosocket-integration.js)

| Line | Component | Purpose |
|------|-----------|---------|
| 113 | Session Creation | `activeSessions.set(uuid, { ... })` |
| 213-235 | sendAudioToMicEndpoint | Sends PCM frames via MicWebSocket back to Asterisk |
| 235 | Global Export | `global.sendAudioToMicEndpoint = ...` |
| 333-340 | Phase 2 Audio Send | `timingClient.sendAudioPacket(...)` |
| 812 | Extension Registration | `global.activeSessions.set(extensionId, session)` |
| 825-827 | Bidirectional Check | Logs when both 7000 and 7001 are active |

### Timing Server (bidirectional-timing-server.js)

| Line | Component | Purpose |
|------|-----------|---------|
| 13-110 | ExtensionPairManager | Manages 1:1 extension pairs and latency tracking |
| 140-196 | LatencyBuffer | Time-delayed audio queue with targetTime processing |
| 416 | AUDIO_PACKET Handler | Routes audio from source ext to paired ext |
| 445-470 | handleAudioPacket | Calculates delay and enqueues audio |
| 183 | INJECT_AUDIO Send | Sends audio back to conference server |

### Timing Client (timing-client.js)

| Line | Component | Purpose |
|------|-----------|---------|
| 7-20 | Constructor | TCP client configuration (127.0.0.1:6000) |
| 22-58 | connect() | Establishes TCP connection with reconnect logic |
| 95 | setInjectAudioHandler | Registers callback for INJECT_AUDIO messages |
| 110 | sendAudioPacket | Sends AUDIO_PACKET to timing server |

---

## Configuration

### Environment Variables

```bash
# Enable Phase 2 bidirectional buffering
export TIMING_PHASE2_ENABLED=true

# ElevenLabs TTS Configuration
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_DEFAULT_VOICE_ID=XPwQNE5RX9Rdhyx0DWcI

# Deepgram STT
DEEPGRAM_API_KEY=...

# DeepL Translation
DEEPL_API_KEY=...
```

### Server Startup

```bash
# Start timing server first
cd /home/azureuser/translation-app
nohup node bidirectional-timing-server.js > /tmp/timing-server.log 2>&1 &

# Wait for timing server to initialize
sleep 3

# Start conference server with Phase 2 enabled
TIMING_PHASE2_ENABLED=true nohup node conference-server.js > /tmp/conference-server.log 2>&1 &
```

---

## Known Issues & Debugging

### Current Problem: No Audio on Speaker Channel

**Symptom**: "Asterisk Voice Stream (IN)" works, but no audio reaches SIP phones

**Potential Causes**:

1. **MicWebSocket Not Established**
   - Check: `session.micWebSocket?.readyState`
   - Expected: `1` (WebSocket.OPEN)
   - Log location: conference-server.js:99

2. **Session Not Registered**
   - Check: `global.activeSessions.has(extensionId)`
   - Registration: audiosocket-integration.js:812
   - Log: `[Phase2] Registered session for extension 7000`

3. **Timing Server Not Sending INJECT_AUDIO**
   - Check: Timing server logs for INJECT_AUDIO messages
   - Expected log: `[Server] → INJECT_AUDIO for ext 7001, X bytes`
   - Location: bidirectional-timing-server.js:484

4. **AUDIO_PACKET Not Reaching Timing Server**
   - Check: Conference server logs for Phase2 audio send
   - Expected: `[Phase2] Sending audio packet to timing server for ext 7000`
   - Location: audiosocket-integration.js:333

5. **Timing Client Not Connected**
   - Check: `global.timingClient.connected === true`
   - Log: `[TimingClient] ✓ Connected to timing server`
   - Location: conference-server.js:70

6. **TIMING_PHASE2_ENABLED Not Set**
   - Verify environment variable in conference-server
   - Check: `process.env.TIMING_PHASE2_ENABLED === 'true'`
   - Location: audiosocket-integration.js:328

### Debug Checklist

```bash
# 1. Verify servers are running
ps aux | grep node | grep -E 'bidirectional|conference'

# 2. Check timing client connection
grep "TimingClient.*Connected" /tmp/conference-server.log

# 3. Verify Phase 2 enabled
grep "Phase2.*registry initialized" /tmp/conference-server.log

# 4. Check session registration
grep "Registered session for extension" /tmp/conference-server.log

# 5. Verify audio packets sent to timing server
grep "Sending audio packet to timing server" /tmp/conference-server.log

# 6. Check timing server receives packets
grep "AUDIO_PACKET" /tmp/timing-server.log

# 7. Verify INJECT_AUDIO sent
grep "INJECT_AUDIO" /tmp/timing-server.log

# 8. Check conference server receives INJECT_AUDIO
grep "Injected.*bytes to extension" /tmp/conference-server.log
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SIP PHONE (Ext 7000)                        │
│                         Speaks: English                             │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ RTP/SIP
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          ASTERISK PBX                               │
│                   ┌─────────────────────────┐                       │
│                   │  AudioSocket Dialplan   │                       │
│                   │  Extension 7000         │                       │
│                   └───────────┬─────────────┘                       │
└───────────────────────────────┼─────────────────────────────────────┘
                                │ TCP Port 5050 (AudioSocket Protocol)
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│            AUDIOSOCKET-INTEGRATION.JS (Port 5050)                   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  AudioSocket Server                                        │    │
│  │  • Receives binary audio frames from Asterisk              │    │
│  │  • Registers session in global.activeSessions              │    │
│  │  • Manages MicWebSocket for bidirectional audio            │    │
│  └────────────────┬───────────────────────────────────────────┘    │
│                   │                                                 │
│                   ↓ PCM 16kHz frames                                │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Translation Pipeline                                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐             │    │
│  │  │ Deepgram │→ │  DeepL   │→ │ ElevenLabs   │             │    │
│  │  │   STT    │  │    MT    │  │     TTS      │             │    │
│  │  └──────────┘  └──────────┘  └──────────────┘             │    │
│  └────────────────┬───────────────────────────────────────────┘    │
│                   │                                                 │
│                   ↓ Translated PCM Buffer (German audio)            │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  if (TIMING_PHASE2_ENABLED === 'true') {                  │    │
│  │      timingClient.sendAudioPacket(ext, buffer, ts);       │    │
│  │  }                                                         │    │
│  └────────────────┬───────────────────────────────────────────┘    │
└───────────────────┼──────────────────────────────────────────────────┘
                    │
                    │ TCP Port 6000 (JSON messages)
                    │ AUDIO_PACKET { fromExt: "7000", audioData: "..." }
                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│       BIDIRECTIONAL-TIMING-SERVER.JS (Port 6000)                    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  ExtensionPairManager                                      │    │
│  │  • Auto-pairs 7000 ↔ 7001                                  │    │
│  │  • Tracks latency stats per direction                      │    │
│  │  • activePairs: Map<ext, {paired, sessionId, bridge}>      │    │
│  └────────────────┬───────────────────────────────────────────┘    │
│                   │                                                 │
│                   ↓ Determine toExt = "7001" (paired)               │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  handleAudioPacket()                                       │    │
│  │  • Calculate latency difference                            │    │
│  │  • Determine sync delay: max(0, -latencyDiff)              │    │
│  │  • latencyBuffer.enqueue(toExt, buffer, delayMs)           │    │
│  └────────────────┬───────────────────────────────────────────┘    │
│                   │                                                 │
│                   ↓ Buffer processing (delayed by sync time)        │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  LatencyBuffer                                             │    │
│  │  • Timer-based queue (targetTime = now + delayMs)          │    │
│  │  • When ready, send INJECT_AUDIO back to conf server      │    │
│  └────────────────┬───────────────────────────────────────────┘    │
│                   │                                                 │
│                   │ sendInjectAudio(toExt: "7001", {...})           │
└───────────────────┼──────────────────────────────────────────────────┘
                    │
                    │ TCP Response
                    │ INJECT_AUDIO { toExtension: "7001", audioData: "..." }
                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│            CONFERENCE-SERVER.JS (INJECT_AUDIO Handler)              │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  timingClient.setInjectAudioHandler((msg) => {            │    │
│  │      const session = global.activeSessions.get(toExt);    │    │
│  │      const buffer = Buffer.from(audioData, 'base64');     │    │
│  │      global.sendAudioToMicEndpoint(session.micWebSocket,  │    │
│  │                                    buffer);                │    │
│  │  });                                                       │    │
│  └────────────────┬───────────────────────────────────────────┘    │
└───────────────────┼──────────────────────────────────────────────────┘
                    │
                    ↓ Forward to audiosocket-integration.js
┌─────────────────────────────────────────────────────────────────────┐
│         AUDIOSOCKET-INTEGRATION.JS :: sendAudioToMicEndpoint        │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  • Split buffer into 640-byte frames (20ms each)           │    │
│  │  • Send each frame: micWebSocket.send(frame)               │    │
│  └────────────────┬───────────────────────────────────────────┘    │
└───────────────────┼──────────────────────────────────────────────────┘
                    │
                    │ MicWebSocket (AudioSocket return path)
                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          ASTERISK PBX                               │
│                   ┌─────────────────────────┐                       │
│  ┌────────────────┤  ConfBridge / Dialplan  │                       │
│  │                └─────────────────────────┘                       │
│  │ ⚠️  ISSUE: Audio not reaching this point                         │
└──┼──────────────────────────────────────────────────────────────────┘
   │
   │ RTP/SIP (NOT WORKING)
   ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         SIP PHONE (Ext 7001)                        │
│                         Should hear: German                         │
│                         🔊 SPEAKER: NO AUDIO ❌                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Synchronization Mechanism

### Latency-Based Delay Calculation

The system measures end-to-end latency for each direction:

- **7000 → 7001**: Time from ext 7000 speaks until ext 7001 receives
- **7001 → 7000**: Time from ext 7001 speaks until ext 7000 receives

If one direction is faster, the timing server adds delay to equalize:

```
Example:
  7000→7001 latency: 300ms
  7001→7000 latency: 250ms
  Difference: 300 - 250 = +50ms

Action:
  7001→7000 direction gets +50ms delay
  Result: Both directions have ~300ms latency
```

This prevents one party from always hearing the other faster, which would break natural conversation flow.

---

## Files Reference

```
/home/azureuser/translation-app/
├── bidirectional-timing-server.js   # 523 lines - Timing & buffer server
├── conference-server.js              # 1231 lines - Main translation server
├── audiosocket-integration.js        # 1127 lines - Asterisk audio bridge
├── timing-client.js                  # TCP client for timing server
├── elevenlabs-tts-service.js         # ElevenLabs API wrapper
└── .env                              # Environment variables
```

---

## Next Steps for Debugging

1. **Test Timing Server Connectivity**
   ```bash
   nc -zv 127.0.0.1 6000  # Should show "succeeded"
   ```

2. **Monitor Real-Time Phase 2 Logs**
   ```bash
   # Terminal 1: Timing server
   tail -f /tmp/timing-server.log | grep -E "AUDIO_PACKET|INJECT_AUDIO"

   # Terminal 2: Conference server
   tail -f /tmp/conference-server.log | grep -E "Phase2|Injected"
   ```

3. **Test Call Flow**
   ```
   1. Call extension 7000 from SIP phone
   2. Speak English
   3. While speaking, dial *87001 to add ext 7001 to conference
   4. Check logs for:
      - "Both extensions 7000 and 7001 are ACTIVE"
      - "Sending audio packet to timing server"
      - "INJECT_AUDIO for ext 7001"
      - "Injected X bytes to extension 7001"
   5. Check if ext 7001 hears translated audio
   ```

4. **Verify MicWebSocket State**
   Add temporary logging in conference-server.js INJECT_AUDIO handler:
   ```javascript
   console.log(`[Debug] Session for ${toExtension}:`, {
       exists: !!session,
       hasMicWS: !!session?.micWebSocket,
       wsState: session?.micWebSocket?.readyState,
       wsStateExpected: 1
   });
   ```

---

## Conclusion

This document represents the **current implementation** of Phase 2 bidirectional translation with sync and bridge communication. The architecture is sound and all components are in place, but audio is not reaching the SIP phone speaker channels despite successful inbound processing.

The issue likely resides in one of these areas:
1. MicWebSocket connection state
2. Session registry lookup timing
3. AudioSocket return path to Asterisk
4. Asterisk dialplan configuration for bidirectional audio

**Last Updated**: 2025-10-30
**Status**: Deployed with known issue - investigating audio return path
