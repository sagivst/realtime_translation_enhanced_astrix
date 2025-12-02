# Complete Audio Flow: Gateway IN → Deepgram
**Highlighting ALL changes made during timing/sync fix**

---

## FULL AUDIO PIPELINE DIAGRAM

```
┌══════════════════════════════════════════════════════════════════════┐
║ STEP 1: GATEWAY RECEIVES FROM ASTERISK                               ║
║ File: gateway-3333.js                                                 ║
║ Port: UDP 4000 (receives RTP from Asterisk)                          ║
╠══════════════════════════════════════════════════════════════════════╣
║ Format IN: ALAW 8kHz (from Asterisk)                                 ║
║ ⚙️  NO CHANGES - Working as before                                    ║
║                                                                       ║
║ Process:                                                              ║
║   1. Receive RTP packets                                             ║
║   2. Extract ALAW payload (160 bytes per packet)                     ║
║   3. Send to GStreamer upsampler                                     ║
╚══════════════════════════════════════════════════════════════════════╝
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 2: GSTREAMER UPSAMPLING                                          │
│ External process (not in our code)                                   │
├──────────────────────────────────────────────────────────────────────┤
│ Input: ALAW 8kHz                                                      │
│ Output: PCM 16kHz, 16-bit signed, mono                               │
│ ⚙️  NO CHANGES - Working as before                                    │
│                                                                       │
│ Audio levels: Natural range -32768 to +32767                         │
│ Typical speech: 6000-15000 (20-45% of max range)                    │
└──────────────────────────────────────────────────────────────────────┘
                              ↓
┌══════════════════════════════════════════════════════════════════════┐
║ STEP 3: GATEWAY SENDS TO STTTTSserver                                ║
║ File: gateway-3333.js                                                 ║
║ Destination: UDP port 6120 (STTTTSserver listening)                  ║
╠══════════════════════════════════════════════════════════════════════╣
║ Format: PCM 16kHz, raw bytes (no headers)                            ║
║ Packet size: Typically 640 bytes (20ms of audio)                     ║
║ ⚙️  NO CHANGES - Working as before                                    ║
╚══════════════════════════════════════════════════════════════════════╝
                              ↓
┌══════════════════════════════════════════════════════════════════════┐
║ ⚠️  STEP 4: UDP BUFFER ACCUMULATION (EVENT COLLECTOR #1)             ║
║ File: STTTTSserver.js, Line ~3640-3750                               ║
║ Function: UDP socket.on('message') handler                           ║
╠══════════════════════════════════════════════════════════════════════╣
║ 🔴 CHANGE #1 - BUFFER THRESHOLD                                       ║
║                                                                       ║
║ ORIGINAL (Before timing fix):                                        ║
║   bufferThreshold: 48000 bytes (1.5 seconds at 16kHz PCM)           ║
║   32000 bytes/sec × 1.5s = 48000 bytes                              ║
║   Result: Translation pipeline NEVER triggered (too long wait)       ║
║                                                                       ║
║ CURRENT (After my changes):                                          ║
║   bufferThreshold: 16000 bytes (500ms at 16kHz PCM)                 ║
║   32000 bytes/sec × 0.5s = 16000 bytes                              ║
║   ⚠️  This is causing delay but better transcription                 ║
║                                                                       ║
║ ALTERNATIVE TRIED:                                                    ║
║   bufferThreshold: 6400 bytes (200ms)                               ║
║   Result: Low latency BUT Deepgram returned empty (too short)        ║
║                                                                       ║
║ Process:                                                              ║
║   const udpPcmBuffer = [];                                           ║
║   socket.on('message', (msg) => {                                    ║
║     udpPcmBuffer.push(...msg);  // Accumulate bytes                 ║
║     if (udpPcmBuffer.length >= UDP_PCM_CONFIG.bufferThreshold) {    ║
║       const audioBuffer = Buffer.from(                               ║
║         udpPcmBuffer.splice(0, bufferThreshold)                      ║
║       );                                                              ║
║       processGatewayAudio(socket, extension, audioBuffer, language); ║
║     }                                                                 ║
║   });                                                                 ║
║                                                                       ║
║ ⚠️  IMPACT: 500ms delay added here (was 1.5s, now 500ms)             ║
╚══════════════════════════════════════════════════════════════════════╝
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 5: DASHBOARD BROADCAST (Socket.IO)                              │
│ File: STTTTSserver.js, Line ~2850                                    │
├──────────────────────────────────────────────────────────────────────┤
│ ⚙️  NO CHANGES - Dashboard receives RAW audio (before amplification) │
│                                                                       │
│ global.io.emit('transcriptionPartial', {                            │
│   extension: extension,                                              │
│   audioLevel: rmsLevel,  // Based on RAW unamplified audio          │
│   peakLevel: peakLevel   // Based on RAW unamplified audio          │
│ });                                                                   │
│                                                                       │
│ 📊 This is why dashboard shows clean audio - it gets it BEFORE gain  │
└──────────────────────────────────────────────────────────────────────┘
                              ↓
┌══════════════════════════════════════════════════════════════════════┐
║ ⚠️  STEP 6: AUDIO AMPLIFICATION                                       ║
║ File: STTTTSserver.js, Line ~1506, 1574-1602                         ║
║ Function: amplifyAudio(audioBuffer, gainFactor)                      ║
╠══════════════════════════════════════════════════════════════════════╣
║ 🔴 CHANGE #2 - GAIN FACTOR                                            ║
║                                                                       ║
║ ORIGINAL (Before timing fix):                                        ║
║   extensionGainFactors.set("3333", 0.002);  // Nearly silent!       ║
║   extensionGainFactors.set("4444", 0.002);                          ║
║   Result: Audio 99.8% reduced, Deepgram got silence                 ║
║                                                                       ║
║ MY CHANGES (Iterations):                                             ║
║   Try #1: gain = 1.0  (no amplification)                            ║
║           Result: Audio too quiet, empty transcriptions              ║
║                                                                       ║
║   Try #2: gain = 10.0  (10x amplification)                          ║
║           Result: 62% of samples clipped - SEVERE DISTORTION! 🔴     ║
║                                                                       ║
║   Try #3: gain = 2.5  (2.5x amplification)                          ║
║           Result: 5-15% clipping - MODERATE DISTORTION! ⚠️           ║
║                                                                       ║
║ CURRENT:                                                              ║
║   extensionGainFactors.set("3333", 2.5);                            ║
║   extensionGainFactors.set("4444", 2.5);                            ║
║                                                                       ║
║ CODE:                                                                 ║
║   function amplifyAudio(pcmBuffer, gainFactor) {                     ║
║     const amplified = Buffer.alloc(pcmBuffer.length);                ║
║     for (let i = 0; i < pcmBuffer.length; i += 2) {                 ║
║       let sample = pcmBuffer.readInt16LE(i);  // Read PCM sample    ║
║       let amplifiedSample = Math.round(sample * gainFactor); // ⚠️   ║
║                                                                       ║
║       // Clipping protection (next step)                             ║
║       if (amplifiedSample > 32767) amplifiedSample = 32767;         ║
║       if (amplifiedSample < -32768) amplifiedSample = -32768;       ║
║                                                                       ║
║       amplified.writeInt16LE(amplifiedSample, i);                    ║
║     }                                                                 ║
║     return amplified;                                                 ║
║   }                                                                   ║
║                                                                       ║
║ Example with gain=2.5:                                               ║
║   Input: 14000 (43% of max, good speech level)                      ║
║   After amplification: 14000 × 2.5 = 35000                          ║
║   After clipping: 32767 (CLIPPED! 🔴)                                ║
║                                                                       ║
║ ⚠️  IMPACT: THIS IS CAUSING THE DISTORTION YOU HEAR!                 ║
╚══════════════════════════════════════════════════════════════════════╝
                              ↓
┌══════════════════════════════════════════════════════════════════════┐
║ ⚠️  STEP 7: CLIPPING THRESHOLD                                        ║
║ File: STTTTSserver.js, Lines ~1586-1591                              ║
║ Part of: amplifyAudio() function                                     ║
╠══════════════════════════════════════════════════════════════════════╣
║ 🔴 CHANGE #3 - CLIPPING LIMIT                                         ║
║                                                                       ║
║ ORIGINAL (Before timing fix):                                        ║
║   Clip at 21299 (65% of PCM max range)                              ║
║   if (sample > 21299) sample = 21299;                               ║
║   if (sample < -21299) sample = -21299;                             ║
║                                                                       ║
║ CURRENT (After my changes):                                          ║
║   Clip at 32767 (100% of PCM max range)                             ║
║   if (sample > 32767) sample = 32767;                               ║
║   if (sample < -32768) sample = -32768;                             ║
║                                                                       ║
║ ⚙️  This change was GOOD - allows full PCM range                     ║
║                                                                       ║
║ BUT: With gain=2.5, samples STILL clip at max (32767)               ║
║      Original speech at 14000 → 35000 → clipped to 32767 🔴         ║
╚══════════════════════════════════════════════════════════════════════╝
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 8: WAV HEADER ADDITION                                          │
│ File: STTTTSserver.js, Line ~2253-2280                               │
│ Function: addWavHeader(pcmBuffer)                                    │
├──────────────────────────────────────────────────────────────────────┤
│ ⚙️  NO CHANGES - Working correctly                                    │
│                                                                       │
│ Adds 44-byte RIFF WAV header:                                        │
│   - Sample rate: 16000 Hz                                            │
│   - Channels: 1 (mono)                                               │
│   - Bits per sample: 16                                              │
│   - Byte rate: 32000 bytes/sec                                       │
│                                                                       │
│ Output: Valid WAV file (header + amplified/clipped PCM data)        │
└──────────────────────────────────────────────────────────────────────┘
                              ↓
┌══════════════════════════════════════════════════════════════════════┐
║ STEP 9: DEEPGRAM API                                                  ║
║ File: STTTTSserver.js, Line ~2316+                                   ║
║ Function: transcribeAudio(wavAudio, language)                        ║
╠══════════════════════════════════════════════════════════════════════╣
║ ⚙️  NO CHANGES to API call                                            ║
║                                                                       ║
║ Receives: WAV file with amplified/clipped audio                      ║
║                                                                       ║
║ ⚠️  PROBLEM: Audio is distorted due to gain=2.5                       ║
║     - Many samples clipped at 32767                                   ║
║     - Waveform shape altered by clipping                             ║
║     - Deepgram may struggle with distorted audio                     ║
║                                                                       ║
║ Result: Low transcription success rate (~10%)                        ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## SUMMARY OF MY CHANGES

### Change #1: Buffer Threshold ⚠️ CAUSES DELAY
**Location:** Line 3640
**Before:** 48000 bytes (1.5s delay)
**After:** 16000 bytes (500ms delay)
**Impact:** Reduced delay but still adds 500ms latency

### Change #2: Gain Factor 🔴 CAUSES DISTORTION
**Location:** Lines 1506-1507
**Before:** 0.002 (essentially muted)
**After:** 2.5 (2.5x amplification)
**Impact:** CLIPPING! Speech at 14000 → 35000 → clipped to 32767

### Change #3: Clipping Threshold ✅ GOOD CHANGE
**Location:** Lines 1586-1591
**Before:** 21299 (65% limit)
**After:** 32767 (100% limit - natural PCM max)
**Impact:** Allows full range, but doesn't prevent clipping from high gain

### Change #4: AutoSync Initialization ✅ GOOD CHANGE
**Location:** Lines 1470-1471
**Added:** Extensions 3333/4444 with autoSync=true
**Impact:** Enables timing module (no audio impact)

---

## THE DISTORTION SOURCE

```
NATURAL SPEECH LEVEL: 14000 (43% of max PCM range)
                ↓
       × 2.5 (GAIN FACTOR)
                ↓
   AMPLIFIED: 35000 (107% of max PCM range!)
                ↓
   CLIPPING: 32767 (hard limit)
                ↓
   DISTORTION: Waveform peaks flattened 🔴
```

**Visual representation:**

```
ORIGINAL WAVEFORM (gain=1.0):
      /\    /\    /\
     /  \  /  \  /  \
____/____\/____\/____\____

AMPLIFIED WAVEFORM (gain=2.5):
    _____  _____  _____   <-- Peaks clipped at 32767
   /     \/     \/     \
__/                     \__
   DISTORTED! 🔴
```

---

## RECOMMENDATION

**Option 1: REVERT gain to lower value**
```javascript
extensionGainFactors.set("3333", 1.5);  // Minimal amplification
extensionGainFactors.set("4444", 1.5);  // Only 50% boost
```
- Less distortion (clipping only when speech naturally loud)
- May still have low transcription rate if audio naturally quiet

**Option 2: REMOVE amplification entirely**
```javascript
extensionGainFactors.set("3333", 1.0);  // No amplification
extensionGainFactors.set("4444", 1.0);
bufferThreshold: 24000  // Increase to 750ms for better Deepgram results
```
- No artificial distortion
- Longer audio chunks help Deepgram recognize speech
- Higher latency (750ms vs 500ms)

**Option 3: CHECK GSTREAMER OUTPUT**
The audio coming FROM GStreamer might already be too quiet. We should verify:
```bash
# Capture raw PCM from GStreamer to analyze actual levels
```

**Which option would you prefer?**

---

**Current Status:**
- Server running with gain=2.5 (CAUSING DISTORTION)
- Buffer threshold=16000 (500ms delay)
- Your audio is being clipped/distorted at STEP 6 (amplification)

