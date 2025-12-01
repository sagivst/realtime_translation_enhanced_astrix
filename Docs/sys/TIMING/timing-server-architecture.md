# Bidirectional Timing Server - Complete Architecture

## Architecture Components

The timing server has **4 main classes**:

```
┌─────────────────────────────────────────────────────────────┐
│                    TimingServer (Port 6000)                  │
│  - TCP server for protocol messages                         │
│  - HTTP server on 6001 for status API                       │
│  - Orchestrates all components                              │
└──────────────┬──────────────┬──────────────┬────────────────┘
               │              │              │
       ┌───────▼──────┐ ┌────▼─────┐ ┌──────▼──────────┐
       │ Extension    │ │ Latency  │ │ AudioInjector   │
       │ PairManager  │ │ Buffer   │ │ (ARI External   │
       │              │ │          │ │  Media)         │
       └──────────────┘ └──────────┘ └─────────────────┘
```

## 1. ExtensionPairManager

**Purpose**: Track extension pairs (7000 ↔ 7001) and their latency stats

**Data Structures**:
```javascript
activePairs: Map {
  '7000' → { paired: '7001', sessionId, bridge: 'bridge-7001', startTime, callUuid }
  '7001' → { paired: '7000', sessionId, bridge: 'bridge-7000', startTime, callUuid }
}

latencyStats: Map {
  '7000→7001' → { avg: 250, samples: [240, 250, 260, ...] }  // last 10 samples
  '7001→7000' → { avg: 180, samples: [175, 180, 185, ...] }
}

activeExtensions: Map {
  '7000' → { uuid: 'abc123', timestamp: 1234567890 }
  '7001' → { uuid: 'def456', timestamp: 1234567900 }
}
```

**Key Methods**:
- `registerExtension(extension, uuid)` - Register extension as active, auto-pair if both 7000+7001 present
- `registerPair(ext1, ext2, callUuid)` - Create bidirectional pairing
- `updateLatency(fromExt, toExt, latencyMs)` - Update moving average (last 10 samples)
- `getLatencyDifference(ext1, ext2)` - Returns `latency_ext1 - latency_ext2` (delta)

## 2. LatencyBuffer

**Purpose**: Buffer audio packets with calculated delays for synchronization

**Data Structure**:
```javascript
buffers: Map {
  '7000' → [
    { packet: Buffer, timestamp: 1234567890, delayMs: 70, targetTime: 1234567960 },
    { packet: Buffer, timestamp: 1234567910, delayMs: 70, targetTime: 1234567980 },
    ...
  ]
}

processingTimers: Map {
  '7000' → Timer  // Active timer for processing this extension's buffer
}
```

**Key Methods**:
- `enqueue(extension, packet, delayMs)` - Add packet to buffer with delay
- `startProcessing(extension)` - Start timer-based packet processing
- `processNext()` - Check if packet ready (now >= targetTime), inject if ready

## 3. AudioInjector

**Purpose**: Inject audio to Asterisk bridges using ARI ExternalMedia channels

**Data Structure**:
```javascript
channels: Map {
  '7000' → { channelId: 'injection-7000-1234567890', bridgeId: 'bridge-7000' }
  '7001' → { channelId: 'injection-7001-1234567890', bridgeId: 'bridge-7001' }
}
```

**Key Methods**:
- `initChannel(extension, bridgeId)` - Create ARI ExternalMedia channel, add to bridge
- `inject(extension, audioBuffer)` - Send PCM audio via ARI POST /channels/{id}/externalMedia
- `ariRequest(method, path, body)` - HTTP request to Asterisk ARI

## 4. TimingServer Message Protocol

**TCP Messages** (newline-delimited JSON):

```javascript
// 1. Register Extension
{
  type: 'REGISTER_EXTENSION',
  extension: '7000',
  uuid: 'session-uuid-123'
}

// 2. Register Pair (manual pairing, or auto when both present)
{
  type: 'REGISTER_PAIR',
  ext1: '7000',
  ext2: '7001',
  callUuid: 'call-uuid-456'
}
// Response:
{
  type: 'PAIR_REGISTERED',
  sessionId: '7000-7001-call-uuid-456',
  ext1: '7000',
  ext2: '7001'
}

// 3. Latency Update (from conference server)
{
  type: 'LATENCY_UPDATE',
  fromExt: '7000',
  toExt: '7001',
  latencyMs: 250
}

// 4. Audio Packet (from conference server)
{
  type: 'AUDIO_PACKET',
  fromExt: '7000',
  audioData: 'base64-encoded-pcm',
  timestamp: 1234567890
}
```

---

## COMPLETE DATA FLOW DIAGRAMS

### Flow 1: Extension Registration & Pairing

```
┌─────────────┐                 ┌──────────────────┐
│ Conference  │                 │ Timing Server    │
│ Server      │                 │ (Port 6000)      │
└──────┬──────┘                 └────────┬─────────┘
       │                                 │
       │ REGISTER_EXTENSION              │
       │ { extension: '7000',            │
       │   uuid: 'abc123' }              │
       ├────────────────────────────────>│
       │                                 │ ExtensionPairManager
       │                                 │ .registerExtension('7000', 'abc123')
       │                                 │ activeExtensions.set('7000', {...})
       │                                 │
       │ REGISTER_EXTENSION              │
       │ { extension: '7001',            │
       │   uuid: 'def456' }              │
       ├────────────────────────────────>│
       │                                 │ Both 7000 & 7001 now active!
       │                                 │ AUTO-PAIRING:
       │                                 │ .registerPair('7000', '7001', 'pair-12345')
       │                                 │
       │                                 │ activePairs.set('7000', {paired: '7001', ...})
       │                                 │ activePairs.set('7001', {paired: '7000', ...})
       │                                 │ latencyStats.set('7000→7001', {avg: 0, samples: []})
       │                                 │ latencyStats.set('7001→7000', {avg: 0, samples: []})
       │                                 │
       │                                 │ AudioInjector.initChannel('7000', 'bridge-7000')
       │                                 │ AudioInjector.initChannel('7001', 'bridge-7001')
       │<────────────────────────────────│
       │ PAIR_REGISTERED                 │
       │ { sessionId: '7000-7001-...' }  │
       │                                 │
```

### Flow 2: Latency Updates & Delta Calculation

```
Extension 7000 Pipeline:                    Timing Server
AudioSocket → ASR → MT → TTS → Ready
│
│ E2E Latency: 250ms
│
├─────────────────────────────────────────>  LATENCY_UPDATE
│  { fromExt: '7000',                        { fromExt: '7000',
│    toExt: '7001',                            toExt: '7001',
│    latencyMs: 250 }                          latencyMs: 250 }
│                                              │
│                                              ExtensionPairManager
│                                              .updateLatency('7000', '7001', 250)
│                                              │
Extension 7001 Pipeline:                       latencyStats['7000→7001'] = {
AudioSocket → ASR → MT → TTS → Ready             avg: 250,
│                                                 samples: [240, 250, 260, ...]
│ E2E Latency: 180ms                           }
│
├─────────────────────────────────────────>  LATENCY_UPDATE
   { fromExt: '7001',                         { fromExt: '7001',
     toExt: '7000',                             toExt: '7000',
     latencyMs: 180 }                           latencyMs: 180 }
                                                │
                                                ExtensionPairManager
                                                .updateLatency('7001', '7000', 180)
                                                │
                                                latencyStats['7001→7000'] = {
                                                  avg: 180,
                                                  samples: [175, 180, 185, ...]
                                                }

                                            ╔═══════════════════════════════════╗
                                            ║ DELTA CALCULATION                 ║
                                            ║                                   ║
                                            ║ getLatencyDifference('7000','7001')║
                                            ║ = stats['7000→7001'].avg          ║
                                            ║   - stats['7001→7000'].avg        ║
                                            ║ = 250 - 180                       ║
                                            ║ = +70ms                           ║
                                            ║                                   ║
                                            ║ Meaning: 7000 is 70ms SLOWER      ║
                                            ║ Action: DELAY 7001 by 70ms        ║
                                            ╚═══════════════════════════════════╝
```

### Flow 3: Audio Packet Buffering & Injection

```
┌─────────────┐                 ┌──────────────────┐                ┌──────────────┐
│ Conference  │                 │ Timing Server    │                │ Asterisk     │
│ Server      │                 │                  │                │ Bridge       │
└──────┬──────┘                 └────────┬─────────┘                └──────┬───────┘
       │                                 │                                 │
       │ 7001 audio ready faster         │                                 │
       │ (180ms latency)                 │                                 │
       │                                 │                                 │
       │ AUDIO_PACKET                    │                                 │
       │ { fromExt: '7001',              │                                 │
       │   audioData: 'base64...',       │                                 │
       │   timestamp: T1 }               │                                 │
       ├────────────────────────────────>│                                 │
       │                                 │ pairInfo = getPair('7001')      │
       │                                 │ → toExt = '7000'                │
       │                                 │                                 │
       │                                 │ latencyDiff = getDifference('7001', '7000')
       │                                 │             = 180 - 250 = -70ms │
       │                                 │                                 │
       │                                 │ delayMs = max(0, -(-70)) = 70ms │
       │                                 │                                 │
       │                                 │ LatencyBuffer.enqueue(          │
       │                                 │   '7000',                       │
       │                                 │   audioBuffer,                  │
       │                                 │   delayMs: 70                   │
       │                                 │ )                               │
       │                                 │                                 │
       │                                 │ buffers['7000'].push({          │
       │                                 │   packet: Buffer,               │
       │                                 │   timestamp: T1,                │
       │                                 │   delayMs: 70,                  │
       │                                 │   targetTime: T1 + 70           │
       │                                 │ })                              │
       │                                 │                                 │
       │                                 │ [Wait 70ms...]                  │
       │                                 │                                 │
       │                                 │ processNext() triggered:        │
       │                                 │ now >= targetTime?              │
       │                                 │ YES → inject                    │
       │                                 │                                 │
       │                                 │ AudioInjector.inject(           │
       │                                 │   '7000',                       │
       │                                 │   audioBuffer                   │
       │                                 │ )                               │
       │                                 │                                 │
       │                                 │ POST /ari/channels/injection-7000/externalMedia
       │                                 │ Body: PCM audio                 │
       │                                 ├────────────────────────────────>│
       │                                 │                                 │ Audio injected
       │                                 │                                 │ to bridge
       │                                 │                                 │
```

---

## SYNCHRONIZATION LOGIC

### Key Algorithm:

```javascript
// In handleAudioPacket():

fromExt = '7001'  // Audio ready from 7001
toExt = '7000'    // Destination bridge for 7000

// Get latency difference
latencyDiff = latencyStats['7001→7000'].avg - latencyStats['7000→7001'].avg
            = 180 - 250
            = -70ms

// Negative means 7001 is FASTER → delay it
delayMs = max(0, -latencyDiff)
        = max(0, -(-70))
        = max(0, 70)
        = 70ms

// Buffer the packet with 70ms delay
LatencyBuffer.enqueue('7000', audioBuffer, 70)
```

### Scenarios:

```
Scenario A: 7000 slower (250ms), 7001 faster (180ms)
─────────────────────────────────────────────────────
7001→7000: latencyDiff = 180 - 250 = -70ms
           delayMs = max(0, 70) = 70ms
           → DELAY 7001's audio by 70ms before injecting to 7000

7000→7001: latencyDiff = 250 - 180 = +70ms
           delayMs = max(0, -70) = 0ms
           → NO DELAY, inject immediately

Result: Audio synchronized! Both arrive at bridges at same time.


Scenario B: Equal latency (200ms both)
──────────────────────────────────────
7000→7001: latencyDiff = 200 - 200 = 0ms
           delayMs = 0ms → inject immediately

7001→7000: latencyDiff = 200 - 200 = 0ms
           delayMs = 0ms → inject immediately

Result: No buffering needed, perfect sync naturally.
```

---

## CURRENT vs REQUIRED INTEGRATION

### What EXISTS (in timing server):
✅ Extension pair tracking
✅ Latency averaging (moving average of last 10 samples)
✅ Delta calculation (`getLatencyDifference()`)
✅ Audio buffering mechanism (`LatencyBuffer`)
✅ ARI ExternalMedia injection (`AudioInjector`)
✅ TCP message protocol (LATENCY_UPDATE, AUDIO_PACKET)

### What's MISSING (conference server integration):
❌ Conference server doesn't send `LATENCY_UPDATE` messages
❌ Conference server doesn't send `AUDIO_PACKET` messages
❌ Audio still injected directly from `audiosocket-integration.js` to bridges
❌ No connection to timing server for buffering

### REQUIRED CHANGES:

#### Location: `audiosocket-integration.js` (Line 303: audioReady handler)

```javascript
// ═══════════════════════════════════════════════════════════════════
// CHANGE 1: Send latency update (once per utterance)
// ═══════════════════════════════════════════════════════════════════
session.audioStreamBuffer.on('audioReady', (audioData) => {
    const pcmBuffer = audioData.buffer;

    // Get current e2e latency from LatencySyncManager
    if (syncManager) {
        const channel = syncManager.getOrCreateChannel(session.extension);
        const e2eLatency = channel.latencies.e2e.current;

        // Determine paired extension (7000 ↔ 7001)
        const pairedExt = (session.extension === '7000' || session.extension === 7000)
            ? '7001' : '7000';

        // Send latency to timing server
        if (global.timingClient && global.timingClient.connected && e2eLatency > 0) {
            global.timingClient.send({
                type: 'LATENCY_UPDATE',
                fromExt: String(session.extension),
                toExt: String(pairedExt),
                latencyMs: e2eLatency
            });
            console.log(`[TimingSync] Sent latency ${session.extension}→${pairedExt}: ${e2eLatency}ms`);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // CHANGE 2: Send audio packet (instead of direct injection)
    // ═══════════════════════════════════════════════════════════════════
    if (global.timingClient && global.timingClient.connected) {
        global.timingClient.send({
            type: 'AUDIO_PACKET',
            fromExt: String(session.extension),
            audioData: pcmBuffer.toString('base64'),
            timestamp: Date.now()
        });
        console.log(`[TimingSync] Sent audio packet from ${session.extension}: ${pcmBuffer.length} bytes`);
    } else {
        // Fallback: direct injection if timing server not connected
        console.log('[TimingSync] Timing server not connected, using direct injection');
        sendAudioToMicEndpoint(session.micWebSocket, pcmBuffer);
    }
});
```

#### Location: `conference-server.js` or `audiosocket-integration.js` (startup)

```javascript
// Initialize timing client connection at startup
const TimingClient = require('./timing-client');
global.timingClient = new TimingClient('127.0.0.1', 6000);
global.timingClient.connect();
```

#### Location: `audiosocket-integration.js` (session initialization)

```javascript
// Register extension with timing server when session starts
function initializeSession(uuid, extension) {
    // ... existing code ...

    if (global.timingClient && global.timingClient.connected) {
        global.timingClient.send({
            type: 'REGISTER_EXTENSION',
            extension: String(extension),
            uuid: uuid
        });
        console.log(`[TimingSync] Registered extension ${extension} (UUID: ${uuid})`);
    }
}
```

---

## IMPLEMENTATION PHASES

### Phase 1: Latency Reporting Only (Low Risk)
✅ Add LATENCY_UPDATE messages from conference server
✅ Timing server calculates deltas
✅ Audio still injected directly (no buffering yet)
✅ Dashboard shows timing server delta values

**Benefits**: Test integration, verify latency tracking, no risk to audio flow

### Phase 2: Full Buffering Integration (Requires Testing)
✅ Send AUDIO_PACKET messages from conference server
✅ Remove direct bridge injection
✅ Timing server buffers and injects via ARI ExternalMedia
✅ Test synchronization with real calls

**Benefits**: Complete bidirectional sync, production-ready

---

## TESTING CHECKLIST

- [ ] Timing server starts and listens on port 6000
- [ ] Conference server connects to timing server on startup
- [ ] Extensions 7000 and 7001 register successfully
- [ ] Auto-pairing creates bidirectional mapping
- [ ] LATENCY_UPDATE messages sent on each utterance
- [ ] Timing server calculates correct delta (250 - 180 = 70ms)
- [ ] AUDIO_PACKET messages include valid base64 PCM data
- [ ] LatencyBuffer enqueues with correct delay (70ms)
- [ ] Audio injected to bridges after buffering delay
- [ ] Synchronized audio arrives at both bridges simultaneously
- [ ] Dashboard displays timing server delta values
- [ ] HTTP status API shows active pairs and latencies

---

## FILES INVOLVED

### Timing Server:
- `bidirectional-timing-server.js` (existing, complete)

### Conference Server:
- `timing-client.js` (existing, needs review)
- `audiosocket-integration.js` (needs modification - line 303)
- `latency-sync-manager.js` (existing, used for e2e latency retrieval)
- `conference-server.js` (needs TimingClient initialization)

### Documentation:
- `/docs/sys/timing-server-architecture.md` (this file)
