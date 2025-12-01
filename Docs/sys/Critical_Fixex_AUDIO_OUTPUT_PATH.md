# CRITICAL FIX: Audio Output Path - STTTTSserver to Gateway
## 3333/4444 System - Socket.IO vs UDP Mismatch

**Document Version:** 1.0
**Date:** 2025-11-24
**Priority:** 🔴 **CRITICAL** - No audio returning to Asterisk
**System:** 3333_4444__Operational
**Status:** BROKEN - Audio output not reaching gateways

---

## EXECUTIVE SUMMARY

### The Problem

**Inbound audio works perfectly** (Asterisk → Gateway → STTTTSserver → AI Pipeline), but **outbound translated audio NEVER reaches Asterisk**.

**Root Cause:** STTTTSserver is emitting translated audio via **Socket.IO** (`global.io.emit('translatedAudio', ...)`), but the gateways are listening on **UDP ports** (6121/6123), creating a **complete disconnect** in the audio path.

**Evidence:**
```
Gateway-3333 Stats:
  RX_Ast=44483     ✅ Receiving from Asterisk
  TX_STTTS=41676   ✅ Sending to STTTTSserver
  RX_STTTS=25312   ❌ Receiving Socket.IO events (not UDP!)
  TX_Ast=0         ❌ NEVER sending to Asterisk (no audio!)
```

---

## AUDIO PATH ANALYSIS

### Current BROKEN Architecture

```
┌──────────────┐  RTP   ┌────────────────┐  PCM/UDP  ┌────────────────────┐
│   Asterisk   │ ─4000→ │  Gateway-3333  │ ─6120───→ │  STTTTSserver.js   │
│   Ext 3333   │        │   (Node.js +   │           │                    │
│              │        │   GStreamer)   │           │  ┌──────────────┐  │
│              │        │                │           │  │ AI Pipeline  │  │
│              │        │  UDP 6121      │           │  │ ASR→MT→TTS   │  │
│              │        │  Listening ✅   │           │  └──────────────┘  │
│              │        │      ▼         │           │         │          │
│              │        │    [empty]     │           │         ▼          │
│              │        │   NO DATA ❌   │           │  ┌──────────────┐  │
│              │        │                │           │  │ Socket.IO    │  │
│              │ ◀4001─ │                │ ◀────X────│  │ emit()       │  │
│              │        │  GStreamer     │   MISMATCH│  └──────────────┘  │
│              │        │  Downsampler   │           │                    │
│              │        │  (no input)    │           │  global.io.emit(   │
│              │        │    TX_Ast=0    │           │   'translatedAudio'│
└──────────────┘        └────────────────┘           └────────────────────┘
                                                              ▼
                                                      Dashboard (Socket.IO) ✅
```

**What's Happening:**
1. ✅ Gateway receives RTP from Asterisk
2. ✅ Gateway converts to PCM and sends to STTTTSserver via UDP 6120
3. ✅ STTTTSserver AI pipeline processes audio (ASR→MT→TTS)
4. ❌ STTTTSserver emits via Socket.IO (line 2479)
5. ❌ Gateway is listening on UDP 6121, NOT Socket.IO
6. ❌ Gateway's GStreamer downsampler receives no input
7. ❌ Gateway NEVER sends RTP back to Asterisk
8. ❌ **NO AUDIO RETURNS TO CALLER**

---

## CODE ANALYSIS

### STTTTSserver.js - TWO Output Paths (Conflict!)

#### Path 1: Socket.IO Emit (Lines 2420-2491) - CURRENTLY ACTIVE

```javascript
// STEP 4.4 & 4.5: APPLY BUFFER AND SEND TO GATEWAY
if (pcmAudioBuffer && pcmAudioBuffer.length > 0) {
  console.log(`[Buffer Send] Applying ${Math.round(totalBufferMs)}ms buffer...`);

  audioBufferManager.bufferAndSend(
    pairedExtension,           // Target extension
    pcmAudioBuffer,            // PCM16 audio data
    totalBufferMs,             // Buffer delay
    (targetExtension, delayedAudio) => {
      // SUB-TASK 4.5: Emit translatedAudio (camelCase) to Gateway
      global.io.emit('translatedAudio', {        // ❌ Socket.IO!
        extension: String(targetExtension),
        audio: delayedAudio,         // Buffer object (PCM16 data)
        format: 'pcm16',
        sampleRate: 16000,
        channels: 1,
        timestamp: Date.now(),
        bufferApplied: totalBufferMs,
        sourceExtension: extension
      });

      console.log(`[Buffer Send] ✓ translatedAudio emitted to Gateway...`);
    }
  );
}
```

**Problem:** `global.io.emit()` sends to Socket.IO clients (browsers/dashboards), NOT to UDP sockets!

---

#### Path 2: UDP Send Function (Lines 3988-4027) - NOT CALLED

```javascript
async function sendUdpPcmAudio(targetExtension, pcmBuffer) {
  const socket = targetExtension === '3333' ? socket3333Out : socket4444Out;
  const port = targetExtension === '3333' ?
                UDP_PCM_CONFIG.port3333Out :      // 6121
                UDP_PCM_CONFIG.port4444Out;       // 6123

  const frameSize = UDP_PCM_CONFIG.frameSizeBytes;  // 160 bytes
  const totalFrames = Math.floor(pcmBuffer.length / frameSize);

  console.log(`[UDP-${targetExtension}] Sending ${pcmBuffer.length} bytes...`);

  for (let i = 0; i < totalFrames; i++) {
    const frame = pcmBuffer.slice(i * frameSize, (i + 1) * frameSize);

    await new Promise((resolve, reject) => {
      socket.send(frame, port, UDP_PCM_CONFIG.gatewayHost, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise(resolve => setTimeout(resolve, 5)); // 5ms per frame
  }

  console.log(`[UDP-${targetExtension}] ✓ Sent ${totalFrames} frames`);
}
```

**Problem:** This function EXISTS but is NEVER CALLED from the main audio pipeline!

---

### Gateway-3333.js - UDP Listener (Lines 106-108)

```javascript
fromSTTTTSSocket.on('message', (pcm16k, rinfo) => {
  stats.rxFromSTTTS++;                        // ✅ Increments (Socket.IO heartbeat?)
  gstDownsampler.stdin.write(pcm16k);         // ❌ Never receives actual audio
});
```

**Expected:** Should receive PCM16 frames via UDP from STTTTSserver

**Actual:** Receives occasional Socket.IO control packets (?) but NO audio data

**Result:** GStreamer downsampler has no input → produces no output → TX_Ast=0

---

## THE FIX

### Solution: Replace Socket.IO Emit with UDP Send

**File:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js`

**Line:** 2479 (inside audioBufferManager.bufferAndSend callback)

### BEFORE (BROKEN):
```javascript
audioBufferManager.bufferAndSend(
  pairedExtension,
  pcmAudioBuffer,
  totalBufferMs,
  (targetExtension, delayedAudio) => {
    console.log(`[Buffer Send] ✓ Sending ${delayedAudio.length} bytes PCM16 to Gateway...`);

    // ❌ WRONG: Socket.IO emit (goes to dashboard, not gateway)
    global.io.emit('translatedAudio', {
      extension: String(targetExtension),
      audio: delayedAudio,
      format: 'pcm16',
      sampleRate: 16000,
      channels: 1,
      timestamp: Date.now(),
      bufferApplied: totalBufferMs,
      sourceExtension: extension
    });

    console.log(`[Buffer Send] ✓ translatedAudio emitted...`);
  }
);
```

### AFTER (FIXED):
```javascript
audioBufferManager.bufferAndSend(
  pairedExtension,
  pcmAudioBuffer,
  totalBufferMs,
  async (targetExtension, delayedAudio) => {  // ← Add async
    console.log(`[Buffer Send] ✓ Sending ${delayedAudio.length} bytes PCM16 to Gateway...`);

    // ✅ CORRECT: UDP send to gateway
    await sendUdpPcmAudio(targetExtension, delayedAudio);

    // OPTIONAL: Also emit to dashboard for monitoring
    global.io.emit('translatedAudio', {
      extension: String(targetExtension),
      audio: delayedAudio.toString('base64'),  // ← Convert to base64 for Socket.IO
      format: 'pcm16',
      sampleRate: 16000,
      channels: 1,
      timestamp: Date.now(),
      bufferApplied: totalBufferMs,
      sourceExtension: extension
    });

    console.log(`[Buffer Send] ✓ Audio sent via UDP and Socket.IO`);
  }
);
```

---

## DEPLOYMENT

### Step 1: Backup

```bash
ssh azureuser@20.170.155.53

cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
cp STTTTSserver.js STTTTSserver.js.backup-audio-fix-$(date +%Y%m%d-%H%M%S)
```

### Step 2: Apply Fix

```bash
# Edit line 2479 - change callback to async
sed -i '2467s/(targetExtension, delayedAudio) => {/async (targetExtension, delayedAudio) => {/' STTTTSserver.js

# Replace Socket.IO emit with UDP send (lines 2479-2491)
# This is complex - better to edit manually or use a script
```

**Manual Edit** (safer):
```bash
nano /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js
```

Navigate to line ~2479 and replace:
```javascript
// OLD:
global.io.emit('translatedAudio', {
  extension: String(targetExtension),
  audio: delayedAudio,
  format: 'pcm16',
  ...
});

// NEW:
await sendUdpPcmAudio(targetExtension, delayedAudio);

// OPTIONAL: Keep Socket.IO for dashboard
global.io.emit('translatedAudio', {
  extension: String(targetExtension),
  audio: delayedAudio.toString('base64'),  // Base64 for Socket.IO
  format: 'pcm16',
  ...
});
```

### Step 3: Restart

```bash
# Kill STTTTSserver
ps aux | grep 'STTTTSserver.js' | grep -v grep | awk '{print $2}' | xargs kill

# Start STTTTSserver
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
nohup node STTTTSserver.js > /tmp/STTTTSserver-operational.log 2>&1 &

# Wait for startup
sleep 5

# Verify running
ps aux | grep 'STTTTSserver.js' | grep -v grep
```

### Step 4: Verify Fix

```bash
# Watch gateway stats - TX_Ast should increment!
tail -f /tmp/gateway-3333-operational.log | grep 'Stats:'

# Expected BEFORE fix:
# Stats: RX_Ast=44483, TX_STTTS=41676, RX_STTTS=25312, TX_Ast=0

# Expected AFTER fix:
# Stats: RX_Ast=44500, TX_STTTS=41700, RX_STTTS=25350, TX_Ast=150  ← INCREMENTING!
```

---

## VERIFICATION CHECKLIST

After applying fix:

- [ ] **STTTTSserver logs show:** `[UDP-3333] Sending X bytes (Y frames)`
- [ ] **STTTTSserver logs show:** `[UDP-3333] ✓ Sent Y frames`
- [ ] **Gateway-3333 stats show:** `TX_Ast` incrementing (not stuck at 0)
- [ ] **Gateway-4444 stats show:** `TX_Ast` incrementing (not stuck at 0)
- [ ] **Asterisk receives audio:** Can hear translated speech on the call
- [ ] **No GStreamer errors** in gateway logs

---

## ROOT CAUSE SUMMARY

| Issue | Cause | Impact |
|-------|-------|--------|
| **Audio path mismatch** | STTTTSserver uses Socket.IO, Gateway uses UDP | No audio reaches gateway |
| **Function exists but unused** | `sendUdpPcmAudio()` implemented but not called | UDP path dormant |
| **Incorrect emit target** | Socket.IO emits go to dashboards, not gateways | Wrong destination |
| **GStreamer starvation** | Downsampler receives no input data | No RTP output |
| **TX_Ast stuck at 0** | Gateway never sends to Asterisk | Caller hears nothing |

---

## ALTERNATIVE FIX (If Primary Fails)

If the primary fix doesn't work, there may be an issue with the UDP sending logic. Alternative approach:

### Check UDP Socket Binding

```bash
# Verify ports are actually sending
ss -ulnp | grep -E '6121|6123'
```

Should show:
```
udp   UNCONN    0      0      0.0.0.0:6121      0.0.0.0:*    users:(("node",pid=XXXX,fd=YY))
udp   UNCONN    0      0      0.0.0.0:6123      0.0.0.0:*    users:(("node",pid=XXXX,fd=YY))
```

### Debug UDP Sending

Add debug logging to `sendUdpPcmAudio`:

```javascript
async function sendUdpPcmAudio(targetExtension, pcmBuffer) {
  console.log(`[UDP-DEBUG] sendUdpPcmAudio called: ext=${targetExtension}, buffer=${pcmBuffer.length} bytes`);

  const socket = targetExtension === '3333' ? socket3333Out : socket4444Out;
  const port = targetExtension === '3333' ? UDP_PCM_CONFIG.port3333Out : UDP_PCM_CONFIG.port4444Out;

  console.log(`[UDP-DEBUG] Socket: ${socket ? 'valid' : 'NULL'}, Port: ${port}, Host: ${UDP_PCM_CONFIG.gatewayHost}`);

  // ... rest of function
}
```

---

## EXPECTED BEHAVIOR AFTER FIX

### Successful Audio Flow:

```
1. Caller speaks into Extension 3333 (English)
   ↓
2. Asterisk → Gateway-3333 (RTP ALAW)
   ↓
3. Gateway-3333 → STTTTSserver (UDP PCM 6120)
   ↓
4. STTTTSserver AI Pipeline:
   - Deepgram ASR: "Hello"
   - DeepL MT: "Bonjour"
   - ElevenLabs TTS: [French audio MP3]
   - Convert MP3 → PCM16
   ↓
5. STTTTSserver → Gateway-4444 (UDP PCM 6123)  ← FIX ENABLES THIS
   ↓
6. Gateway-4444 GStreamer downsample (16kHz → 8kHz)
   ↓
7. Gateway-4444 → Asterisk (RTP ALAW)
   ↓
8. Extension 4444 hears: "Bonjour" in French  ✅
```

### Log Output After Fix:

**STTTTSserver:**
```
[Pipeline] Stage 6 (TTS) for 3333: 450ms - 15360 bytes
[Audio Convert] Converting 15360 bytes MP3 to PCM16...
[Audio Convert] ✓ Conversion complete: 64000 bytes PCM16
[Buffer Send] Applying 0ms buffer to 64000 bytes PCM16 for extension 4444
[Buffer Send] ✓ Sending 64000 bytes PCM16 to Gateway for extension 4444
[UDP-4444] Sending 64000 bytes (400 frames)
[UDP-4444] ✓ Sent 400 frames  ← NEW!
```

**Gateway-4444:**
```
Stats: RX_Ast=12340, TX_STTTS=11580, RX_STTTS=400, TX_Ast=380  ← TX_Ast INCREMENTING!
```

---

## DOCUMENT CHANGE LOG

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-24 | Initial diagnosis - Socket.IO vs UDP mismatch identified |

---

**END OF DOCUMENT**
