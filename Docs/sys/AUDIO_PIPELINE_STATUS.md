# VoIP Translation System - Audio Pipeline Status Report
**Date**: 2025-11-13
**Issue**: Audio plays at 3x slower speed (slow motion)
**Status**: Root cause identified, fix ready to deploy

---

## 1. SYSTEM ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AUDIO PIPELINE FLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

    SIP Phone (7777)                              SIP Phone (8888)
         │                                              ▲
         │ Audio Input                                  │ Audio Output
         │ (various rates)                              │ (various rates)
         ▼                                              │
    ┌─────────┐                                    ┌─────────┐
    │ Asterisk│                                    │ Asterisk│
    │ PBX     │                                    │ PBX     │
    │ Ext 7777│                                    │ Ext 8888│
    └─────────┘                                    └─────────┘
         │                                              ▲
         │ slin48 (48kHz PCM16)                        │ slin48 (48kHz PCM16)
         │                                              │
         ▼                                              │
    ┌─────────────────┐                          ┌─────────────────┐
    │ ExternalMedia   │                          │ ExternalMedia   │
    │ Channel         │                          │ Channel         │
    │ (ARI)           │                          │ (ARI)           │
    └─────────────────┘                          └─────────────────┘
         │                                              ▲
         │ RTP Stream                                   │ RTP Stream
         │ PT=10 ⚠️ PROBLEM!                            │ PT=10 ⚠️ PROBLEM!
         │ (Asterisk interprets as 16kHz)              │ (Asterisk interprets as 16kHz)
         │                                              │
         ▼                                              │
    ┌──────────────────────────────────────────────────────────────┐
    │                    GATEWAY SERVICE                           │
    │             (gateway-7777-8888.js)                          │
    │                                                              │
    │  RTP Receiver  ◄────────► WebSocket ◄────────► RTP Sender  │
    │  (from 7777)              Protocol              (to 8888)   │
    │                                                              │
    │  • Converts RTP ↔ PCM16                                     │
    │  • Handles big-endian ↔ little-endian                       │
    │  • Routes audio between extensions                          │
    │  • Sample Rate: 48kHz ✓                                     │
    │  • Payload Type: 10 ⚠️ (CAUSES PROBLEM)                     │
    └──────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket (JSON)
                              │ event: 'audio'
                              │ audioBuffer: PCM16 @ 48kHz ✓
                              │
                              ▼
    ┌──────────────────────────────────────────────────────────────┐
    │              CONFERENCE SERVER SERVICE                        │
    │          (conference-server-externalmedia.js)                │
    │                                                              │
    │  ┌────────────────────────────────────────────────┐         │
    │  │  SPEECH PROCESSING PIPELINE                    │         │
    │  │                                                 │         │
    │  │  Audio In (48kHz PCM16) ✓                     │         │
    │  │       ↓                                         │         │
    │  │  Deepgram STT                                  │         │
    │  │       ↓                                         │         │
    │  │  Text Processing                               │         │
    │  │       ↓                                         │         │
    │  │  ElevenLabs TTS → MP3                         │         │
    │  │       ↓                                         │         │
    │  │  FFmpeg: MP3 → PCM16 @ 48kHz ✓                │         │
    │  │       ↓                                         │         │
    │  │  Audio Out (48kHz PCM16) ✓                    │         │
    │  └────────────────────────────────────────────────┘         │
    │                                                              │
    │  Verified with diagnostic logs:                             │
    │  • AUDIO_SAMPLE_RATE = 48000Hz ✓                           │
    │  • FFmpeg converts at 48kHz ✓                              │
    │  • Output buffer @ 48kHz ✓                                 │
    └──────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket (JSON)
                              │ event: 'translatedAudio'
                              │ audioBuffer: PCM16 @ 48kHz ✓
                              │ sampleRate: 48000 ✓
                              │
                              ▼
                         (back to Gateway)
```

---

## 2. CURRENT CONFIGURATION STATUS

### 2.1 Asterisk Configuration
**File**: `/etc/asterisk/extensions.conf`
**Status**: ✓ CORRECT (recently updated)

```ini
exten => 7777,1,NoOp(=== ExternalMedia Test - Extension 7777 ===)
 same => n,Answer()
 same => n,Set(CHANNEL(format)=slin48)    ← ✓ 48kHz format
 same => n,Stasis(translation-test,ext7777)

exten => 8888,1,NoOp(=== ExternalMedia Test - Extension 8888 ===)
 same => n,Answer()
 same => n,Set(CHANNEL(format)=slin48)    ← ✓ 48kHz format
 same => n,Stasis(translation-test,ext8888)
```

**Backup**: `extensions.conf.backup-slin48-fix-TIMESTAMP`

### 2.2 Conference Server Configuration
**File**: `/home/azureuser/translation-app/7777-8888-stack/.env.externalmedia`
**Status**: ✓ CORRECT

```bash
AUDIO_SAMPLE_RATE=48000    ← ✓ 48kHz
```

**Diagnostic Logging Added** (conference-server-externalmedia.js):
- Line 1629: Logs actual AUDIO_SAMPLE_RATE value
- Line 534: Logs complete FFmpeg command
- Line 1630: Logs conversion result with sample rate

**Verified Output**:
```
[Audio Convert] AUDIO_SAMPLE_RATE = 48000Hz
[FFmpeg] Executing: ffmpeg -i ... -ar 48000 -ac 1 ...
[Audio Convert] ✓ Conversion complete: 102818 bytes PCM16 @ 48000Hz
```

### 2.3 Gateway Configuration
**File**: `/home/azureuser/translation-app/7777-8888-stack/gateway-7777-8888.js`
**Status**: ⚠️ INCORRECT (root cause of problem)

**Current RTP_CONFIG** (Lines 32-50):
```javascript
const RTP_CONFIG = {
  16000: {
    payloadType: 10,           // PT=10 for L16 @ 16kHz (RFC 3551) ✓
    format: "L16",
    sampleRate: 16000,
    bytesPerSample: 2,
    endianness: "big",
    samplesPerPacket: 320
  },
  48000: {
    payloadType: 10,           // ⚠️ PROBLEM! PT=10 = 16kHz per RFC 3551
    format: "L16",
    sampleRate: 48000,         // ✓ Data is 48kHz
    bytesPerSample: 2,
    endianness: "big",
    samplesPerPacket: 960      // ✓ 20ms @ 48kHz = 960 samples
  }
};
```

**ExternalMedia Format** (Line 569):
```javascript
format: 'slin48',    ← ✓ Tells Asterisk to expect 48kHz
```

**The Problem**:
- Gateway sends RTP packets with **PT=10** in the header
- RFC 3551 defines **PT=10 = L16 @ 16kHz** (big-endian)
- Even though channel format is `slin48`, Asterisk sees PT=10 and interprets audio as 16kHz
- Result: 48kHz audio decoded as 16kHz = **3x slowdown**

---

## 3. WHAT HAS BEEN TESTED

### Test 1: Conference Server Sample Rate ✓
**Action**: Added diagnostic logging to verify FFmpeg conversion
**Files Modified**: `conference-server-externalmedia.js` (lines 534, 1629, 1630)
**Result**: ✓ Confirmed conversion is at 48kHz
**Logs**:
```
[Audio Convert] AUDIO_SAMPLE_RATE = 48000Hz
[FFmpeg] Executing: ffmpeg -i /tmp/tts_XXX.mp3 -f s16le -acodec pcm_s16le -ar 48000 -ac 1 /tmp/tts_XXX.pcm
[Audio Convert] ✓ Conversion complete: 102818 bytes PCM16 @ 48000Hz
```
**Conclusion**: Conference server IS working correctly ✓

### Test 2: Asterisk Dialplan Format Change ✓
**Action**: Changed dialplan from `slin16` to `slin48`
**File Modified**: `/etc/asterisk/extensions.conf`
**Changed**: `Set(CHANNEL(format)=slin16)` → `Set(CHANNEL(format)=slin48)`
**Command**: `sudo asterisk -rx 'dialplan reload'`
**User Feedback**: "still slow motion (no Squawk)..."
**Result**: ⚠️ Audio still slow, but squawk noise eliminated
**Conclusion**: Improved but did NOT fix the root cause

### Test 3: Service Restart After Crash ✓
**Problem**: Gateway crashed due to wrong working directory
**Error**: `Error: Cannot find module '/home/azureuser/gateway-7777-8888.js'`
**Fix**: Restarted with correct working directory:
```bash
cd /home/azureuser/translation-app/7777-8888-stack
nohup node gateway-7777-8888.js > /tmp/gateway-diagnostic-fixed.log 2>&1 &
```
**Result**: ✓ Both services running (Conference: PID 1680583, Gateway: PID 1684661)

### Test 4: Root Cause Investigation ✓
**Method**: Analyzed diagnostic logs + RTP packet structure
**Discovery**:
- All audio data IS 48kHz throughout the pipeline ✓
- Gateway sends RTP packets with PT=10 header ⚠️
- RFC 3551: PT=10 = L16 @ 16kHz (fixed definition)
- Asterisk sees PT=10 → decodes as 16kHz regardless of channel format
- 48kHz data ÷ 16kHz decoder = 3x slowdown

**Conclusion**: ✓ Root cause identified: **RTP Payload Type mismatch**

---

## 4. ROOT CAUSE ANALYSIS

### The Problem: RTP Payload Type Mismatch

**What is RTP Payload Type (PT)?**
- 7-bit field in RTP header (values 0-127)
- Tells receiver how to interpret audio payload
- PT 0-95: Static assignments (RFC 3551)
- PT 96-127: Dynamic assignments (negotiated formats)

**RFC 3551 Static Assignments**:
- PT=0: PCMU (μ-law) @ 8kHz
- PT=8: PCMA (A-law) @ 8kHz
- PT=10: **L16 @ 16kHz** (big-endian) ← Used in our gateway
- PT=11: L16 @ 44.1kHz (big-endian)

**Current Gateway Configuration**:
```javascript
48000: {
  payloadType: 10,    // ⚠️ PT=10 is defined as 16kHz!
  sampleRate: 48000,  // ✓ But we're sending 48kHz data
  // ...
}
```

**What Happens**:
1. Gateway creates RTP packet with 48kHz PCM16 audio
2. Gateway sets RTP header: PT=10
3. Gateway sends packet to Asterisk
4. Asterisk receives packet, reads PT=10
5. Asterisk checks RFC 3551: **PT=10 = L16 @ 16kHz**
6. Asterisk decodes packet as 16kHz (ignoring channel format)
7. 48kHz audio played at 16kHz speed = **3x slower = slow motion**

**Audio Math**:
- Gateway timestamp increments: +960 samples per packet (48kHz, 20ms)
- Asterisk interprets timestamp as: 16kHz reference
- Time dilation: 960 samples @ 16kHz = 60ms (should be 20ms @ 48kHz)
- Playback speed: 20ms / 60ms = 0.33x = **3x slower**

---

## 5. SOLUTION DIRECTION

### The Fix: Change to Dynamic Payload Type

**Required Change**: `gateway-7777-8888.js` Line 43
```javascript
// BEFORE (INCORRECT):
48000: {
  payloadType: 10,    // ⚠️ RFC 3551 defines as 16kHz

// AFTER (CORRECT):
48000: {
  payloadType: 96,    // ✓ Dynamic PT (non-standard format)
```

**Why PT=96 Works**:
- PT 96-127 are reserved for dynamic/non-standard formats
- No fixed definition in RFC 3551
- Asterisk will respect the ExternalMedia channel format (`slin48`)
- Channel format takes precedence over undefined PT

**Implementation Steps**:
1. ✓ Create backup of gateway-7777-8888.js (already done)
2. Edit gateway-7777-8888.js, line 43: `payloadType: 10` → `payloadType: 96`
3. Restart gateway service:
   ```bash
   pkill -f gateway-7777-8888.js
   cd /home/azureuser/translation-app/7777-8888-stack
   nohup node gateway-7777-8888.js > /tmp/gateway-pt96.log 2>&1 &
   ```
4. Test call: 7777 → 8888
5. Verify audio plays at normal speed

**Expected Result**:
- Asterisk sees PT=96 (dynamic)
- Asterisk checks ExternalMedia channel format: `slin48`
- Asterisk decodes as 48kHz ✓
- 48kHz data @ 48kHz playback = **normal speed** ✓

---

## 6. ALTERNATIVE SOLUTION (NOT RECOMMENDED)

### Option B: Use PT=11 (L16 @ 44.1kHz)

**Change**: `payloadType: 10` → `payloadType: 11`

**Pros**:
- PT=11 is defined in RFC 3551 as L16 @ 44.1kHz
- Closer to our 48kHz than PT=10 (16kHz)

**Cons**:
- ⚠️ Still not exact match (44.1kHz ≠ 48kHz)
- Would cause slight speed difference: 48/44.1 = 1.088x (8.8% faster)
- Not clean solution, just less wrong than PT=10

**Verdict**: Use PT=96 instead (clean, correct solution)

---

## 7. CALIBRATION CHALLENGES

### Challenge 1: RTP Payload Type Definition
**Issue**: Static PT assignments (0-95) are fixed by RFC 3551
**Impact**: Can't use PT=10 for non-standard 48kHz format
**Solution**: Use dynamic PT range (96-127) ✓

### Challenge 2: Asterisk PT Interpretation Priority
**Issue**: Asterisk prioritizes PT definition over channel format when PT is statically defined
**Impact**: Even with `slin48` channel format, PT=10 causes 16kHz decoding
**Solution**: Use undefined PT (96) to force channel format precedence ✓

### Challenge 3: Endianness Conversion
**Status**: ✓ Already handled correctly in gateway
**Details**:
- RTP uses big-endian (network byte order)
- Conference server uses little-endian (PCM16LE)
- Gateway converts correctly (lines 284-296, 376-445)

### Challenge 4: Service Management
**Status**: ✓ Resolved
**Issue**: Gateway started from wrong directory
**Solution**: Use full path with correct working directory

### Challenge 5: Diagnostic Visibility
**Status**: ✓ Implemented
**Added**: Comprehensive logging at all stages:
- Conference server: FFmpeg conversion verification
- Gateway: RTP packet details
- Asterisk: Dialplan execution

---

## 8. CURRENT SERVICE STATUS

### Running Services:
```
Conference Server:
  PID: 1680583
  Log: /tmp/conference-diagnostic.log
  Sample Rate: 48kHz ✓
  Status: RUNNING ✓

Gateway:
  PID: 1684661
  Log: /tmp/gateway-diagnostic-fixed.log
  Sample Rate: 48kHz ✓
  Payload Type: 10 ⚠️ (needs fix)
  Status: RUNNING ✓
```

### Asterisk:
```
Extensions: 7777, 8888
Format: slin48 ✓
ExternalMedia: Active ✓
Status: RUNNING ✓
```

---

## 9. NEXT STEPS

### Immediate Action (Ready to Deploy):
```bash
# 1. Backup already created ✓
# /home/azureuser/translation-app/7777-8888-stack/gateway-7777-8888.js.backup-pt96-TIMESTAMP

# 2. Edit gateway-7777-8888.js
# Change line 43: payloadType: 10 → payloadType: 96

# 3. Restart gateway
pkill -f gateway-7777-8888.js
cd /home/azureuser/translation-app/7777-8888-stack
nohup node gateway-7777-8888.js > /tmp/gateway-pt96.log 2>&1 &

# 4. Test
# Call 7777 → 8888 and verify normal speed audio
```

### Verification:
- [ ] Audio plays at normal speed (not slow motion)
- [ ] Timestamps are correct (20ms packets)
- [ ] No audio artifacts or distortion
- [ ] Both directions work (7777→8888 and 8888→7777)

---

## 10. SUMMARY

| Component | Configuration | Status |
|-----------|--------------|--------|
| Asterisk Dialplan | slin48 @ 48kHz | ✓ CORRECT |
| Conference Server | 48kHz PCM16 | ✓ CORRECT |
| Gateway Sample Rate | 48kHz | ✓ CORRECT |
| Gateway Payload Type | PT=10 (16kHz) | ⚠️ INCORRECT |
| Audio Data | 48kHz throughout | ✓ CORRECT |
| Audio Playback | 3x slower (slow motion) | ⚠️ BROKEN |

**Root Cause**: Gateway uses PT=10 (RFC 3551 = 16kHz) for 48kHz audio
**Solution**: Change to PT=96 (dynamic payload type)
**Status**: Fix identified, ready to deploy
**ETA**: <5 minutes to implement and test

---

*Document generated: 2025-11-13*
*System: VoIP Translation System (Asterisk + ARI + WebSocket + TTS/STT)*
