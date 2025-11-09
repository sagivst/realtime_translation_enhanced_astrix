# FINAL Implementation Plan - Following Open-Source Pattern Exactly
**Extensions 7777 ↔ 8888 Bidirectional Translation**
**Working ONLY on VM: http://20.170.155.53/**
**Pattern: asterisk-external-media open-source reference**

---

## 📐 ARCHITECTURE (Open-Source Pattern)

```
┌─────────────────────────────────────────────────────────────────────┐
│           SIMPLIFIED FLOW (Following asterisk-external-media)        │
└─────────────────────────────────────────────────────────────────────┘

SIP 7777/8888
    ↓
Asterisk ExternalMedia (dialplan, NO ARI needed!)
    │ RTP UDP
    ↓
┌────────────────────────────────────────────────────────────┐
│  externalmedia-server.js (ALL-IN-ONE like ari-transcriber) │
│                                                             │
│  Components inside ONE file:                               │
│  ┌────────────────────────────────────────────┐           │
│  │ 1. RTP Handler (like rtp-udp-server.js)    │           │
│  │    - Receive RTP packets                   │           │
│  │    - Strip 12-byte header                  │           │
│  │    - Keep big-endian ✅                    │           │
│  └────────────────────────────────────────────┘           │
│                    ↓                                        │
│  ┌────────────────────────────────────────────┐           │
│  │ 2. Session Manager (orchestration)         │           │
│  │    - Generate UUID: "7777-xxx"             │           │
│  │    - Track sessions                         │           │
│  │    - Cross-route extensions                 │           │
│  └────────────────────────────────────────────┘           │
│                    ↓                                        │
│  ┌────────────────────────────────────────────┐           │
│  │ 3. Translation Provider Interface          │           │
│  │    - Call existing translation pipeline    │           │
│  │    - ASR → MT → TTS → LS Buffer            │           │
│  └────────────────────────────────────────────┘           │
│                    ↓                                        │
│  ┌────────────────────────────────────────────┐           │
│  │ 4. RTP Sender                              │           │
│  │    - Add 12-byte RTP header                │           │
│  │    - Keep big-endian ✅                    │           │
│  │    - NO amplification ✅                   │           │
│  │    - Send to cross-routed extension        │           │
│  └────────────────────────────────────────────┘           │
│                    ↓                                        │
│  ┌────────────────────────────────────────────┐           │
│  │ 5. WebSocket (monitoring only)             │           │
│  │    - Send stats to browser                 │           │
│  │    - Receive control commands              │           │
│  └────────────────────────────────────────────┘           │
└────────────────────────────────────────────────────────────┘
    ↓ RTP UDP
Asterisk ExternalMedia
    ↓
SIP 8888/7777 (hears translation)
```

---

## 🎯 KEY DIFFERENCES FROM PREVIOUS PLAN

### ❌ REMOVED:
1. **externalmedia-orchestrator.js** - Not needed! Logic goes inside server
2. **Complex ARI handler** - Use simple ExternalMedia dialplan instead
3. **Separate files** - Everything in ONE file (like open-source)
4. **WebSocket audio routing** - Direct RTP only

### ✅ KEEPING:
1. **externalmedia-server.js** - Single file with all logic
2. **Translation pipeline** - Existing ASR → MT → TTS → LS Buffer
3. **Browser monitoring** - Stats and control only
4. **Big-endian, no amplification, 16kHz** - All optimizations

---

## 🚀 IMPLEMENTATION STEPS

### Step 1: Modify externalmedia-test-server.js → Move to translation-app/

**Current location:** `/home/azureuser/test-externalmedia/externalmedia-test-server.js`
**New location:** `/home/azureuser/translation-app/externalmedia-server.js`

**Changes needed:**

#### 1a. Remove Browser from Audio Path
```javascript
// REMOVE all audio forwarding to browser WebSocket
// REMOVE:
//   ws.send(audioBuffer);  // Delete any audio data sending
//   browserAudioStream      // Delete audio streaming

// KEEP only stats/control WebSocket
wss.on('connection', (ws) => {
  setInterval(() => {
    ws.send(JSON.stringify({
      type: 'stats',
      ext7777: { latency: ..., packets: ..., status: ... },
      ext8888: { latency: ..., packets: ..., status: ... }
    }));
  }, 1000);
});
```

#### 1b. Integrate Translation Pipeline
```javascript
// Add at top
const { ASRStreamingWorker } = require('./asr-streaming-worker');
const { DeepLIncrementalMT } = require('./deepl-incremental-mt');
const ElevenLabsTTSService = require('./elevenlabs-tts-service');
const AudioStreamBuffer = require('./audio-stream-buffer');

// Session management (inside class)
this.sessions = new Map();  // UUID → session data

// When RTP packet arrives
async handleRTPPacket(extension, pcmAudio) {
    // Generate UUID
    const uuid = `${extension}-${Date.now()}`;

    // Get or create session
    let session = this.sessions.get(uuid);
    if (!session) {
        session = await this.createSession(uuid, extension);
        this.sessions.set(uuid, session);
    }

    // Send to ASR
    session.asrWorker.sendAudio(pcmAudio);
}

// ASR → Translation → TTS → Send back
async createSession(uuid, extension) {
    const qaConfig = global.qaConfigs?.get(extension) || {};

    const session = {
        uuid: uuid,
        extension: extension,
        asrWorker: new ASRStreamingWorker(deepgramKey, {
            language: qaConfig.sourceLang,
            sampleRate: 16000,  // 16kHz!
            encoding: 'linear16'
        }),
        audioBuffer: new AudioStreamBuffer({
            sampleRate: 16000,  // Keep 16kHz throughout
            channels: 1,
            bitDepth: 16
        })
    };

    // ASR → Translation
    session.asrWorker.on('transcript', async (transcript) => {
        const translated = await this.translator.translate(
            transcript.text,
            qaConfig.sourceLang,
            qaConfig.targetLang
        );

        // TTS
        const audioBuffer = await this.ttsService.synthesize(translated);

        // Add to buffer
        session.audioBuffer.addAudio(audioBuffer);
    });

    // Buffer → RTP send (cross-routed)
    session.audioBuffer.on('audioReady', (audioData) => {
        const targetExt = (extension === '7777') ? '8888' : '7777';
        this.sendRTP(targetExt, audioData.buffer);
    });

    session.asrWorker.start();
    return session;
}

// Send RTP
sendRTP(extension, pcmBuffer) {
    // Create RTP packet (12-byte header + audio)
    const rtpPacket = this.createRTPPacket(pcmBuffer);

    // NO byte swap ✅
    // NO amplification ✅

    // Send to correct port
    const socket = this.extensions[extension].rtpSender;
    socket.send(rtpPacket, ...);
}
```

#### 1c. Remove ARI Complexity
```javascript
// REMOVE:
//   - ARI connection
//   - StasisStart/StasisEnd handling
//   - Bridge management
//   - Complex channel handling

// KEEP:
//   - Simple RTP listeners on ports 17000, 18000
//   - Direct RTP send/receive
```

---

### Step 2: Simplify Asterisk Configuration

**File:** `/etc/asterisk/extensions.conf`

```ini
[from-internal]
; Existing AudioSocket - DO NOT TOUCH
exten => 7000,1,NoOp(...)
exten => 7001,1,NoOp(...)

; NEW: Simple ExternalMedia (NO ARI, NO Stasis!)
exten => 7777,1,NoOp(Extension 7777 - EN Speaker)
exten => 7777,n,Answer()
exten => 7777,n,ExternalMedia(127.0.0.1:17000,slin16)
exten => 7777,n,Hangup()

exten => 8888,1,NoOp(Extension 8888 - ES Speaker)
exten => 8888,n,Answer()
exten => 8888,n,ExternalMedia(127.0.0.1:18000,slin16)
exten => 8888,n,Hangup()
```

**Note:** NO Stasis! Just direct ExternalMedia like the open-source example.

---

### Step 3: Update Browser Interface

**File:** `/home/azureuser/test-externalmedia/public/test-translation.html`

**Changes:**
```javascript
// REMOVE: All audio processing
// REMOVE: AudioContext, audio playback
// REMOVE: <audio> elements

// KEEP: Stats display
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'stats') {
    updateStatsDisplay(data);
  }
};

// KEEP: Control UI
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

### Step 4: Update conference-server.js

**File:** `/home/azureuser/translation-app/conference-server.js`

```javascript
// Add QA configs
global.qaConfigs = global.qaConfigs || new Map();
global.qaConfigs.set('7777', {
    sourceLang: 'en',
    targetLang: 'es',
    qaMode: false
});
global.qaConfigs.set('8888', {
    sourceLang: 'es',
    targetLang: 'en',
    qaMode: false
});

// Load externalmedia-server
require('./externalmedia-server');
console.log('[MediaGateway] Server loaded for extensions 7777, 8888');
```

---

## 📊 OPEN-SOURCE PATTERN COMPARISON

| Component | Open Source | Our Implementation |
|-----------|-------------|-------------------|
| **Main file** | `ari-transcriber.js` | `externalmedia-server.js` |
| **RTP handler** | `rtp-udp-server.js` (inside) | Built into server |
| **Speech provider** | `google-speech-provider.js` | Translation pipeline (ASR/MT/TTS) |
| **ARI controller** | `ari-controller.js` | ❌ NOT NEEDED (use dialplan) |
| **Session mgmt** | Inside ari-transcriber | Inside server |
| **Files count** | 4 files | **1 file** ✅ |

---

## ✅ IMPLEMENTATION CHECKLIST

### Pre-Implementation
- [ ] Backup: `git branch backup-$(date +%Y%m%d-%H%M%S)`
- [ ] Working on http://20.170.155.53/ ONLY ✓
- [ ] AudioSocket (7000/7001) untouched ✓

### Phase 1: Modify externalmedia-server.js
- [ ] Copy test-externalmedia/externalmedia-test-server.js to translation-app/externalmedia-server.js
- [ ] Remove ARI connection and StasisStart/End handlers
- [ ] Remove browser audio path (keep stats/control only)
- [ ] Add translation pipeline imports (ASR, MT, TTS, Buffer)
- [ ] Add session management (UUID generation, Map storage)
- [ ] Add RTP → ASR flow
- [ ] Add ASR → Translation → TTS → Buffer flow
- [ ] Add Buffer → RTP send (cross-routed)
- [ ] Verify big-endian, no byte swap, no amplification

### Phase 2: Simplify Asterisk Config
- [ ] Update /etc/asterisk/extensions.conf
- [ ] Add simple ExternalMedia dialplan for 7777, 8888
- [ ] NO Stasis, NO ARI
- [ ] Reload dialplan: `asterisk -rx "dialplan reload"`

### Phase 3: Update Browser
- [ ] Remove audio elements from HTML
- [ ] Remove AudioContext code
- [ ] Keep stats display
- [ ] Keep control UI (volume, etc.)

### Phase 4: Update conference-server.js
- [ ] Add QA configs for 7777, 8888
- [ ] Load externalmedia-server.js
- [ ] Verify no conflicts

### Phase 5: Testing
- [ ] Start conference-server.js
- [ ] Verify ports 17000, 18000 listening
- [ ] Test call to 7777
- [ ] Test call to 8888
- [ ] Verify cross-translation
- [ ] Check 7000/7001 still work ✓
- [ ] Measure latency < 120ms

---

## ⚠️ CRITICAL CONSTRAINTS

1. ✅ NEVER touch 7000/7001
2. ✅ ONE file (externalmedia-server.js) - like open-source
3. ✅ NO separate orchestrator file
4. ✅ NO complex ARI handlers
5. ✅ Simple ExternalMedia dialplan
6. ✅ NO byte swapping (big-endian)
7. ✅ NO amplification
8. ✅ 16kHz throughout
9. ✅ Browser monitoring ONLY

---

## 🎯 SUCCESS CRITERIA

✅ System works when:
1. ONE file handles everything (like ari-transcriber.js)
2. Simple Asterisk dialplan (ExternalMedia, no Stasis)
3. SIP calls to 7777/8888 work
4. Cross-translation: 7777 ↔ 8888
5. Latency < 120ms (better than AudioSocket ~1-2s)
6. Audio quality better (16kHz vs 8kHz)
7. Extensions 7000/7001 still work
8. Browser shows stats only

---

## 🚀 ESTIMATED TIMELINE

- **Phase 1 (Modify server):** 2 hours
- **Phase 2 (Asterisk):** 15 minutes
- **Phase 3 (Browser):** 30 minutes
- **Phase 4 (Integration):** 15 minutes
- **Phase 5 (Testing):** 2 hours

**Total:** ~5 hours (vs 8-11 hours in wrong plan!)

---

## 📁 FILES TO MODIFY

**Create/Modify:**
1. `/home/azureuser/translation-app/externalmedia-server.js` (copy + modify test server)

**Modify:**
2. `/etc/asterisk/extensions.conf` (add 2 extensions)
3. `/home/azureuser/test-externalmedia/public/test-translation.html` (remove audio path)
4. `/home/azureuser/translation-app/conference-server.js` (add QA configs + require)

**DO NOT CREATE:**
- ❌ externalmedia-orchestrator.js (not needed!)
- ❌ externalmedia-integration.js (not needed!)
- ❌ media-gateway-ari-handler.js (not needed!)

**Total:** 4 files modified, 0 files created (simpler!)

---

*Plan created: 2025-11-05*
*Based on: Open-source asterisk-external-media pattern*
*Architecture: Single file, simple dialplan, minimal complexity*
*Status: Ready for approval*
