# CORRECT Media Gateway Implementation Plan
**Extensions 7777 ↔ 8888 Bidirectional Translation**
**Working ONLY on VM: http://20.170.155.53/**

---

## 📐 CORRECT ARCHITECTURE (Based on Open Source Gateway)

```
┌─────────────────────────────────────────────────────────────────────┐
│              OPTIMAL FLOW (Minimal Latency, Best Quality)            │
└─────────────────────────────────────────────────────────────────────┘

AUDIO PATH (No byte swapping, no unnecessary amplification):
┌──────────┐                                                  ┌──────────┐
│ SIP 7777 │                                                  │ SIP 8888 │
└────┬─────┘                                                  └────┬─────┘
     │ RTP (big-endian PCM 16kHz)                                 │
     ↓                                                              │
┌─────────────┐                                                    │
│  Asterisk   │                                                    │
│ ExternalMedia│                                                   │
└─────┬───────┘                                                    │
      │ RTP UDP 17000                                              │
      ↓                                                             │
┌────────────────────────┐                                         │
│ externalmedia-server.js│ (renamed from test)                     │
│  - Receive RTP         │                                         │
│  - Strip header        │                                         │
│  - Keep big-endian ✅  │                                         │
└────────┬───────────────┘                                         │
         │ PCM 16kHz (big-endian)                                  │
         ↓                                                          │
┌────────────────────────────┐                                     │
│ externalmedia-orchestrator │ (NEW)                               │
│  - UUID: "7777-xxx"        │                                     │
│  - Forward to translation  │                                     │
└────────┬───────────────────┘                                     │
         │                                                          │
         ↓                                                          │
┌──────────────────────┐                                           │
│ Translation Pipeline │                                           │
│  - ASR (Deepgram)    │                                           │
│  - MT (DeepL)        │                                           │
│  - TTS (ElevenLabs)  │                                           │
│  - LS Buffer + Sync  │                                           │
└────────┬─────────────┘                                           │
         │ Translated PCM 16kHz (big-endian)                       │
         ↓                                                          │
┌────────────────────────┐                                         │
│ externalmedia-server.js│                                         │
│  - Receive translated  │                                         │
│  - Add RTP header      │                                         │
│  - NO amplification ✅ │                                         │
│  - NO byte swap ✅     │                                         │
└────────┬───────────────┘                                         │
         │ RTP UDP 18000                                           │
         ↓                                                          │
┌─────────────┐                                                    │
│  Asterisk   │                                                    │
│ ExternalMedia│                                                   │
└─────┬───────┘                                                    │
      │ RTP                                                         │
      ↓                                                             │
┌──────────┐                                                  ┌────┴─────┐
│ SIP 7777 │◄─────────────── (Same for 8888 → 7777) ─────────┤ SIP 8888 │
└──────────┘                                                  └──────────┘


BROWSER (Monitoring/Control Only - NOT in audio path):
┌─────────────────────────────┐
│    Browser Dashboard        │
│  - Volume controls          │
│  - Latency display (30s avg)│
│  - Packet counters          │
│  - Translation status       │
│  - Connection status        │
└────────┬────────────────────┘
         │ WebSocket (control + stats)
         ↓
┌────────────────────────┐
│ externalmedia-server.js│
│  - Send stats to browser│
│  - Receive control cmds │
└────────────────────────┘
```

---

## 🎯 KEY CHANGES FROM WRONG PLAN

### ❌ REMOVED (Unnecessary):
1. Byte swapping - Keep big-endian throughout
2. 500x amplification - Audio already at correct level
3. Browser in audio path - Only monitoring/control
4. WebSocket audio routing - Direct RTP only
5. Complex ARI management with separate handler
6. externalmedia-integration.js (too complex)

### ✅ ADDED (Essential):
1. Direct RTP path - Minimal latency
2. Big-endian preservation - No conversion overhead
3. Browser monitoring - Stats and control only
4. Optimal routing - Shortest path possible
5. Simple orchestrator pattern

---

## 🚀 IMPLEMENTATION STEPS (CORRECT)

### Step 1: Create externalmedia-orchestrator.js

**File:** `/home/azureuser/translation-app/externalmedia-orchestrator.js`

**Purpose:** Bridge between RTP server and translation pipeline

```javascript
const EventEmitter = require('events');

class ExternalMediaOrchestrator extends EventEmitter {
    constructor() {
        super();
        this.sessions = new Map();
    }

    /**
     * Handle incoming audio from externalmedia-server.js
     * @param {Object} data - {extension, audio, sampleRate}
     */
    handleAudioIn(extension, audioBuffer) {
        const uuid = `${extension}-${Date.now()}`;

        // Get or create session
        if (!this.sessions.has(extension)) {
            this.sessions.set(extension, {
                uuid: uuid,
                extension: extension,
                created: Date.now()
            });
            console.log(`[Orchestrator] New session: ${uuid}`);
        }

        // Emit audio event for translation pipeline
        // Keep big-endian PCM 16kHz (NO byte swap)
        this.emit('audio', {
            uuid: uuid,
            extension: extension,
            audio: audioBuffer,  // Big-endian PCM 16kHz
            sampleRate: 16000,
            channels: 1,
            bitDepth: 16
        });
    }

    /**
     * Send translated audio back to externalmedia-server.js
     * @param {string} uuid - Session UUID
     * @param {Buffer} audioBuffer - Translated PCM audio (big-endian 16kHz)
     */
    sendAudioOut(uuid, audioBuffer) {
        const extension = uuid.split('-')[0];  // Extract "7777" or "8888"

        // Cross-route: 7777 → 8888, 8888 → 7777
        const targetExtension = (extension === '7777') ? '8888' : '7777';

        console.log(`[Orchestrator] Sending ${audioBuffer.length} bytes from ${extension} to ${targetExtension}`);

        // Emit to externalmedia-server.js
        // NO byte swap, NO amplification
        this.emit('audioOut', {
            targetExtension: targetExtension,
            audio: audioBuffer  // Keep big-endian 16kHz
        });
    }
}

module.exports = ExternalMediaOrchestrator;
```

---

### Step 2: Modify translation-orchestrator.js

**File:** `/home/azureuser/translation-app/translation-orchestrator.js` (if exists)

OR integrate directly into externalmedia-orchestrator.js

**Add extension detection:**
```javascript
// Add to existing translation pipeline
function getExtensionFromUUID(uuid) {
    if (!uuid) return null;
    if (uuid === "7777" || uuid === "8888") return uuid;
    if (uuid.startsWith("7777")) return "7777";
    if (uuid.startsWith("8888")) return "8888";
    return null;
}

// Cross-route extensions
function getTargetExtension(sourceExtension) {
    return sourceExtension === '7777' ? '8888' : '7777';
}

// Add QA configs
global.qaConfigs = global.qaConfigs || new Map();
global.qaConfigs.set('7777', { sourceLang: 'en', targetLang: 'es', qaMode: false });
global.qaConfigs.set('8888', { sourceLang: 'es', targetLang: 'en', qaMode: false });
```

**Translation flow:**
```javascript
// Listen to orchestrator audio events
orchestrator.on('audio', async (data) => {
    const { uuid, extension, audio } = data;

    // Send to ASR (Deepgram) - 16kHz is better quality!
    const transcript = await deepgramSTT(audio, {
        sampleRate: 16000,
        language: getLanguage(extension)
    });

    // Translate
    const translated = await deeplTranslate(transcript.text,
        getSourceLang(extension),
        getTargetLang(extension)
    );

    // TTS
    const audioBuffer = await elevenLabsTTS(translated, {
        voiceId: getVoice(extension),
        outputFormat: 'pcm_16000'  // 16kHz PCM
    });

    // Send back through orchestrator (cross-routed)
    orchestrator.sendAudioOut(uuid, audioBuffer);
});
```

---

### Step 3: Rename & Update externalmedia-server.js

**Current file:** `/home/azureuser/test-externalmedia/externalmedia-test-server.js`
**New location:** `/home/azureuser/translation-app/externalmedia-server.js`

**Changes Required:**

#### 3a. Remove Browser from Audio Path
```javascript
// REMOVE: Audio forwarding to browser via WebSocket
// REMOVE: WebSocket audio data events

// KEEP: Statistics and control WebSocket
wss.on('connection', (ws) => {
  // Send stats only (latency, packet count, status)
  setInterval(() => {
    ws.send(JSON.stringify({
      type: 'stats',
      ext7777: {
        latency: getLatency('7777'),
        packets: getPacketCount('7777'),
        status: getStatus('7777')
      },
      ext8888: {
        latency: getLatency('8888'),
        packets: getPacketCount('8888'),
        status: getStatus('8888')
      }
    }));
  }, 1000);

  // Receive control commands
  ws.on('message', (data) => {
    const cmd = JSON.parse(data);
    if (cmd.type === 'control') {
      handleControl(cmd);
    }
  });
});
```

#### 3b. Direct RTP Path
```javascript
const ExternalMediaOrchestrator = require('./externalmedia-orchestrator');
const orchestrator = new ExternalMediaOrchestrator();

// RTP IN → Orchestrator
rtpSocket7777.on('message', (msg, rinfo) => {
    // Strip 12-byte RTP header
    const pcmAudio = msg.slice(12);

    // NO byte swap - keep big-endian ✅
    // NO amplification ✅

    // Send to orchestrator
    orchestrator.handleAudioIn('7777', pcmAudio);
});

rtpSocket8888.on('message', (msg, rinfo) => {
    const pcmAudio = msg.slice(12);
    orchestrator.handleAudioIn('8888', pcmAudio);
});

// Orchestrator → RTP OUT
orchestrator.on('audioOut', (data) => {
    const { targetExtension, audio } = data;

    // Add 12-byte RTP header
    const rtpPacket = createRTPPacket(audio);

    // Send to correct port
    const targetPort = (targetExtension === '7777') ? 17000 : 18000;
    const targetSocket = (targetExtension === '7777') ? rtpSocket7777 : rtpSocket8888;

    targetSocket.send(rtpPacket, targetPort, '127.0.0.1');
});
```

---

### Step 4: Update Browser Interface

**File:** `/home/azureuser/test-externalmedia/public/test-translation.html`

**Changes:**
- Remove audio processing code
- Keep volume slider UI (send control commands to server)
- Keep latency display (receive stats from server)
- Keep packet counters (receive stats from server)

```javascript
// WebSocket for monitoring only
const ws = new WebSocket('ws://localhost:3001');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'stats') {
    // Update display: latency, packets, status
    document.getElementById('latency-7777').textContent = data.ext7777.latency + 'ms';
    document.getElementById('packets-7777').textContent = data.ext7777.packets;
    document.getElementById('status-7777').textContent = data.ext7777.status;

    document.getElementById('latency-8888').textContent = data.ext8888.latency + 'ms';
    document.getElementById('packets-8888').textContent = data.ext8888.packets;
    document.getElementById('status-8888').textContent = data.ext8888.status;
  }
};

// Send control commands
function updateVolume(ext, value) {
  ws.send(JSON.stringify({
    type: 'control',
    extension: ext,
    command: 'volume',
    value: value
  }));
}
```

---

### Step 5: Update Asterisk Configuration

**File:** `/etc/asterisk/extensions.conf`

```ini
[from-internal]
; Existing AudioSocket extensions - DO NOT MODIFY
exten => 7000,1,NoOp(...)
exten => 7001,1,NoOp(...)

; NEW: Media Gateway extensions using ExternalMedia
exten => 7777,1,NoOp(Call to MediaGateway extension 7777)
exten => 7777,n,Answer()
exten => 7777,n,ExternalMedia(127.0.0.1:17000,slin16)
exten => 7777,n,Hangup()

exten => 8888,1,NoOp(Call to MediaGateway extension 8888)
exten => 8888,n,Answer()
exten => 8888,n,ExternalMedia(127.0.0.1:18000,slin16)
exten => 8888,n,Hangup()
```

**Note:** Using direct ExternalMedia dialplan (simpler than ARI Stasis)

---

### Step 6: Update conference-server.js

**File:** `/home/azureuser/translation-app/conference-server.js`

**Add:**
```javascript
// Load externalmedia-server.js (starts RTP listeners + orchestrator)
require('./externalmedia-server');
console.log('[MediaGateway] RTP server loaded for extensions 7777, 8888');

// QA configs already added in Step 2
```

---

## 📊 COMPARISON: WRONG vs CORRECT

| Aspect | ❌ Wrong Plan (My first one) | ✅ Correct Plan (Yours) |
|--------|------------------------------|-------------------------|
| **Architecture** | Complex ARI + integration layer | Simple RTP server + orchestrator |
| **Files to create** | 4 (rtp-handler, integration, ari-handler, config) | 2 (orchestrator, update server) |
| **Audio path** | RTP → Handler → Integration → Pipeline → Integration → Handler → RTP | RTP → Server → Orchestrator → Pipeline → Orchestrator → Server → RTP |
| **Byte swap** | Mentioned but confused | ✅ NO swap (keep big-endian) |
| **Amplification** | Not clear | ✅ NONE (RTP levels correct) |
| **WebSocket** | Used for audio routing | ✅ Monitoring/control ONLY |
| **Browser** | Potentially in audio path | ✅ NOT in audio path |
| **Complexity** | High (1200+ lines) | Low (~300 lines total) |
| **Latency** | Higher (more hops) | ✅ Minimal (direct path) |
| **Asterisk config** | ARI Stasis | ✅ Direct ExternalMedia dialplan |

---

## ✅ IMPLEMENTATION CHECKLIST

### Pre-Implementation
- [ ] Backup current state: `git branch backup-$(date +%Y%m%d-%H%M%S)`
- [ ] Working ONLY on http://20.170.155.53/ ✓
- [ ] Verify AudioSocket (7000/7001) untouched ✓

### Phase 1: Create Orchestrator
- [ ] Create `/home/azureuser/translation-app/externalmedia-orchestrator.js`
- [ ] Test event emitting for audio in/out
- [ ] Verify UUID format: "7777-xxx", "8888-xxx"

### Phase 2: Update Translation Pipeline
- [ ] Add extension detection (7777, 8888)
- [ ] Add QA configs for languages
- [ ] Implement cross-routing (7777 ↔ 8888)
- [ ] Connect to orchestrator events

### Phase 3: Update RTP Server
- [ ] Rename externalmedia-test-server.js → externalmedia-server.js
- [ ] Remove browser audio path
- [ ] Add orchestrator integration
- [ ] Keep big-endian (NO byte swap)
- [ ] NO amplification
- [ ] Direct RTP → Orchestrator → RTP flow

### Phase 4: Update Browser
- [ ] Remove audio processing
- [ ] Keep stats display
- [ ] Keep control UI
- [ ] WebSocket for monitoring only

### Phase 5: Asterisk Config
- [ ] Add extensions 7777/8888 to extensions.conf
- [ ] Use ExternalMedia dialplan (NOT Stasis)
- [ ] Reload dialplan: `asterisk -rx "dialplan reload"`

### Phase 6: Server Integration
- [ ] Load externalmedia-server in conference-server.js
- [ ] Verify no conflicts with AudioSocket
- [ ] Test startup

### Phase 7: Testing
- [ ] Start conference-server.js
- [ ] Verify RTP ports 17000, 18000 listening
- [ ] Test call to 7777
- [ ] Test call to 8888
- [ ] Verify cross-translation works
- [ ] Check audio quality (16kHz better than 8kHz)
- [ ] Verify 7000/7001 still work ✓
- [ ] Monitor latency < 120ms

---

## ⚠️ CRITICAL CONSTRAINTS

1. **NEVER touch extensions 7000/7001** ✓
2. **NEVER touch audiosocket-integration.js** ✓
3. **Keep AudioSocket system 100% operational** ✓
4. **No byte swapping** (keep big-endian) ✓
5. **No amplification** (RTP levels correct) ✓
6. **Browser NOT in audio path** ✓
7. **16kHz throughout** (no resampling) ✓
8. **Work ONLY on VM http://20.170.155.53/** ✓
9. **Direct RTP path** (minimal components) ✓

---

## 🎯 SUCCESS CRITERIA

✅ System works when:
1. SIP phones call 7777 and 8888
2. Audio routed: 7777 → Translation → 8888 speaker
3. Audio routed: 8888 → Translation → 7777 speaker
4. Latency < 120ms (better than AudioSocket ~1-2s)
5. No echo or feedback
6. Audio quality noticeably better (16kHz vs 8kHz)
7. Extensions 7000/7001 completely functional
8. Browser shows accurate stats
9. System stable for >5 minute calls

---

## 🚀 ESTIMATED TIMELINE

- **Phase 1 (Orchestrator):** 30 minutes
- **Phase 2 (Translation):** 1 hour
- **Phase 3 (RTP Server):** 1 hour
- **Phase 4 (Browser):** 30 minutes
- **Phase 5 (Asterisk):** 15 minutes
- **Phase 6 (Integration):** 15 minutes
- **Phase 7 (Testing):** 2 hours

**Total:** ~5-6 hours (vs 8-11 hours in wrong plan)

---

*Plan created: 2025-11-05*
*Based on: Open-source asterisk-external-media-gateway*
*Architecture: Simple, direct, minimal latency*
*Status: Ready for implementation*
