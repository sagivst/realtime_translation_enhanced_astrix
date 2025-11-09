# ExternalMedia Integration Implementation Plan

## ✅ COMPLETED

### Step 1: Created externalmedia-orchestrator.js
**Location:** `/home/azureuser/translation-app/externalmedia-orchestrator.js`

**Purpose:** RTP audio receiver/sender for extensions 7777 and 8888

**Key Features:**
- UDP RTP listeners on ports 17000 (7777) and 18000 (8888)
- Strips 12-byte RTP header from incoming packets
- **Keeps audio in big-endian** (no byte swap for optimal quality)
- Generates UUIDs: `7777-{ssrc}` and `8888-{ssrc}`
- Emits 'audio' events to translation pipeline
- Sends translated audio back via RTP
- Session tracking and statistics

**Architecture Decision:**
- ✅ NO byte swapping (keep big-endian throughout)
- ✅ NO 500x amplification (audio levels already correct)
- ✅ Direct RTP path (minimal latency)

---

## 📋 REMAINING STEPS

### Step 2: Create externalmedia-integration.js
**Location:** `/home/azureuser/translation-app/externalmedia-integration.js`

**Purpose:** Integration layer between ExternalMedia orchestrator and translation pipeline (mirror of audiosocket-integration.js)

**Required Implementation:**
```javascript
// 1. Load ExternalMediaOrchestrator
const ExternalMediaOrchestrator = require('./externalmedia-orchestrator');

// 2. Initialize for extensions 7777 and 8888
const externalMediaOrchestrator = new ExternalMediaOrchestrator();
externalMediaOrchestrator.start();

// 3. Handle audio events
externalMediaOrchestrator.on('audio', (data) => {
  const { uuid, extension, audio } = data;

  // Get or create session
  let session = activeSessions.get(uuid);
  if (!session) {
    session = createSession(uuid, extension);
    activeSessions.set(uuid, session);
  }

  // Forward to translation pipeline
  // Same flow as AudioSocket: ASR → MT → TTS → LS Buffer
});

// 4. Extension routing (cross-extension translation)
function getTargetExtension(sourceExtension) {
  return sourceExtension === '7777' ? '8888' : '7777';
}

// 5. Send translated audio back
function sendTranslatedAudio(uuid, audioBuffer) {
  externalMediaOrchestrator.sendAudio(uuid, audioBuffer);
}
```

**Key Differences from AudioSocket:**
| Aspect | AudioSocket (7000/7001) | ExternalMedia (7777/8888) |
|--------|------------------------|---------------------------|
| Protocol | TCP AudioSocket | UDP RTP |
| Sample Rate | 8kHz | 16kHz |
| Header | 3-byte custom | 12-byte RTP |
| Byte Order | Little-endian | Big-endian (keep as-is) |
| Ports | 5050/5052 (input)<br>5051/5053 (output) | 17000/18000 (bidirectional) |

---

### Step 3: Modify conference-server.js
**Location:** `/home/azureuser/translation-app/conference-server.js`

**Changes Required:**

#### 3a. Add QA Configs for 7777/8888
```javascript
// After line 159
global.qaConfigs.set('7777', { sourceLang: 'en', targetLang: 'es', qaMode: false });
global.qaConfigs.set('8888', { sourceLang: 'es', targetLang: 'en', qaMode: false });
```

#### 3b. Load ExternalMedia Integration
```javascript
// After line 82 (after audiosocket-integration)
require("./externalmedia-integration");
console.log('[ExternalMedia] Integration loaded for extensions 7777, 8888');
```

---

### Step 4: Update getExtensionFromUUID() Functions
**Files to Update:**
- `audiosocket-integration.js` (line ~120)
- `externalmedia-integration.js` (new file)

```javascript
function getExtensionFromUUID(uuid) {
    if (!uuid) return null;

    // Handle simple string IDs
    if (uuid === "7000" || uuid === "7001" || uuid === "7777" || uuid === "8888") {
        return uuid;
    }

    // Handle prefixed IDs
    if (uuid.startsWith("7000")) return "7000";
    if (uuid.startsWith("7001")) return "7001";
    if (uuid.startsWith("7777")) return "7777";
    if (uuid.startsWith("8888")) return "8888";

    return null;
}
```

---

### Step 5: Rename & Update Test Server
**Current:** `/home/azureuser/test-externalmedia/externalmedia-test-server.js`
**New:** `/home/azureuser/test-externalmedia/externalmedia-server.js`

**Changes Required:**

#### 5a. Remove Browser from Audio Path
```javascript
// REMOVE: Audio forwarding to browser
// REMOVE: WebSocket audio routing

// KEEP: Statistics and control WebSocket
wss.on('connection', (ws) => {
  // Send stats only (latency, packet count, status)
  setInterval(() => {
    ws.send(JSON.stringify({
      type: 'stats',
      ext7777: getStats('7777'),
      ext8888: getStats('8888')
    }));
  }, 1000);
});
```

#### 5b. Direct RTP Path
```javascript
// RTP IN → externalmedia-orchestrator → Translation → RTP OUT
// NO browser in audio path
```

---

### Step 6: Update Browser Interface
**File:** `/home/azureuser/test-externalmedia/public/test-translation.html`

**Changes:**
- Remove audio processing code
- Keep volume slider UI (send control commands to server)
- Keep latency display (receive stats from server)
- Keep packet counters (receive stats from server)

```javascript
// WebSocket for monitoring only
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'stats') {
    // Update display: latency, packets, status
    updateLatencyDisplay(data.ext7777.latency);
    updatePacketCount(data.ext7777.packets);
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

## 🔄 COMPLETE DATA FLOW (Final Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUDIO PATH (Minimal Latency)                  │
└─────────────────────────────────────────────────────────────────┘

SIP 7777
   │ RTP (big-endian PCM 16kHz)
   ↓
Asterisk ExternalMedia
   │ RTP UDP 17000
   ↓
externalmedia-orchestrator.js
   │ Strip RTP header, keep big-endian
   ↓
externalmedia-integration.js
   │ UUID: "7777-xxx", route to translation
   ↓
Translation Pipeline:
   ├─ ASR (Deepgram)      [200-400ms]
   ├─ MT (DeepL)          [100-300ms]
   ├─ TTS (ElevenLabs)    [500-1000ms]
   └─ LS Buffer (Sync)    [100ms + timing]
   │
   ↓
externalmedia-orchestrator.js
   │ Add RTP header, send back
   ↓
Asterisk ExternalMedia
   │ RTP
   ↓
SIP 8888 (hears translated audio from 7777)

┌─────────────────────────────────────────────────────────────────┐
│              BROWSER (Monitoring Only - NOT in audio path)       │
└─────────────────────────────────────────────────────────────────┘

Browser Dashboard
   │ WebSocket (stats + control)
   ↓
externalmedia-server.js
   ├─ Send: latency, packet count, status
   └─ Receive: volume control commands
```

---

## ⚠️ CRITICAL CONSTRAINTS

1. **NEVER touch extensions 7000/7001/7004/7005** ✅
2. **Keep AudioSocket system 100% operational** ✅
3. **No byte swapping** (keep big-endian) ✅
4. **No unnecessary amplification** ✅
5. **Browser for monitoring only** (not in audio path) ✅
6. **Maintain UUID format**: `{extension}-{identifier}` ✅
7. **16kHz throughout** (no resampling) ✅

---

## 🚀 NEXT ACTION

**Immediate Next Step:** Create `externalmedia-integration.js`

This is the most complex file (~1200 lines in audiosocket-integration.js). It needs to:
1. Mirror audiosocket-integration.js structure
2. Handle 16kHz instead of 8kHz
3. Use big-endian throughout
4. Route 7777 ↔ 8888 (cross-extension translation)

**Estimated Effort:** 2-3 hours to properly adapt and test

---

## 📊 TESTING CHECKLIST

Once implementation is complete:

- [ ] Test server starts without errors
- [ ] Port 17000 receives RTP from Asterisk (ext 7777)
- [ ] Port 18000 receives RTP from Asterisk (ext 8888)
- [ ] UUID format correct: `7777-{id}`, `8888-{id}`
- [ ] ASR receives audio and transcribes
- [ ] MT translates correctly
- [ ] TTS generates audio
- [ ] LS Buffer synchronizes timing
- [ ] RTP packets sent back to Asterisk
- [ ] SIP phones hear translated audio
- [ ] Cross-extension routing works (7777 → 8888, 8888 → 7777)
- [ ] Browser shows stats (latency, packets)
- [ ] Volume controls affect translation pipeline
- [ ] No echo or feedback
- [ ] Latency comparable to AudioSocket system
- [ ] Extensions 7000/7001 still work perfectly

---

## 📁 FILES CREATED/MODIFIED

**Created:**
1. ✅ `/home/azureuser/translation-app/externalmedia-orchestrator.js` (Step 1)
2. ⏳ `/home/azureuser/translation-app/externalmedia-integration.js` (Step 2)

**To Modify:**
3. ⏳ `/home/azureuser/translation-app/conference-server.js` (Step 3)
4. ⏳ `/home/azureuser/test-externalmedia/externalmedia-test-server.js` → `externalmedia-server.js` (Step 5)
5. ⏳ `/home/azureuser/test-externalmedia/public/test-translation.html` (Step 6)

**Backup Created:**
- ✅ Checkpoint: checkpoint-20251105-090741
- ✅ GitHub branch: working-version-with-media-gateway

---

## 🎯 SUCCESS CRITERIA

The integration is complete when:
1. Two SIP phones can call 7777 and 8888
2. They hear each other's translated speech in real-time
3. Latency is similar to AudioSocket system (~1-2 seconds)
4. No echo, feedback, or audio quality issues
5. Browser dashboard shows accurate stats
6. Extensions 7000/7001 remain completely functional
7. System is stable for long calls (>5 minutes)

---

*Document created: 2025-11-05*
*Status: Step 1 complete, ready for Step 2*
