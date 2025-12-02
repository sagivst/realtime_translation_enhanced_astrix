# Audio Pipeline Consultation Request
## VoIP Real-Time Translation System - Slow Motion Audio Issue

**Date**: November 13, 2025
**Severity**: HIGH - Production audio quality issue
**Status**: Root cause identified, seeking validation before deployment

---

## EXECUTIVE SUMMARY

We've been debugging a critical audio quality issue in our VoIP real-time translation system where translated audio plays at 3x slower speed (slow motion effect). After extensive investigation, we've identified the root cause as an RTP Payload Type mismatch between our Gateway service and Asterisk PBX.

**We are seeking consultation from your development teams on:**
1. Validation of our root cause analysis
2. Alternative solutions we may have overlooked
3. Best practices for RTP payload type handling with non-standard sample rates
4. Potential side effects of our proposed fix

---

## SYSTEM ARCHITECTURE

### Overview
Our system provides real-time voice translation for VoIP calls:
- Asterisk PBX handles SIP signaling and media
- Gateway service bridges Asterisk RTP ↔ WebSocket
- Conference Server handles STT (Deepgram) and TTS (ElevenLabs) processing
- Audio format: PCM16 (16-bit signed linear) @ 48kHz

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                     AUDIO FLOW ARCHITECTURE                          │
└──────────────────────────────────────────────────────────────────────┘

Extension 7777 (Speaker)                    Extension 8888 (Listener)
      │                                              ▲
      │ SIP/RTP                                      │ SIP/RTP
      ▼                                              │
┌────────────────────────────────────────────────────────────────────┐
│                        ASTERISK PBX                                │
│  • Dialplan: Set(CHANNEL(format)=slin48) ✓                        │
│  • ARI ExternalMedia channels                                      │
│  • Expected: 48kHz PCM16                                           │
└────────────────────────────────────────────────────────────────────┘
      │                                              ▲
      │ RTP                                          │ RTP
      │ PT=10 ⚠️                                     │ PT=10 ⚠️
      │ (Asterisk decodes as 16kHz!)                │
      │                                              │
      ▼                                              │
┌────────────────────────────────────────────────────────────────────┐
│                      GATEWAY SERVICE                               │
│                   (Node.js / RTP Handler)                          │
│                                                                    │
│  RTP_CONFIG:                                                       │
│    48000: {                                                        │
│      payloadType: 10,      ⚠️ ISSUE HERE                          │
│      sampleRate: 48000,    ✓ Data is correct                      │
│      samplesPerPacket: 960 ✓ 20ms chunks                          │
│    }                                                               │
│                                                                    │
│  • Receives 48kHz audio from Asterisk via RTP                     │
│  • Converts RTP → PCM16LE (big-endian → little-endian)            │
│  • Forwards to Conference Server via WebSocket                    │
│  • Returns translated audio via same path                         │
└────────────────────────────────────────────────────────────────────┘
      │                                              ▲
      │ WebSocket (JSON)                             │ WebSocket (JSON)
      │ audioBuffer: PCM16 @ 48kHz ✓                 │ audioBuffer: PCM16 @ 48kHz ✓
      │                                              │
      ▼                                              │
┌────────────────────────────────────────────────────────────────────┐
│                  CONFERENCE SERVER SERVICE                         │
│                 (Node.js / Speech Processing)                      │
│                                                                    │
│  Pipeline:                                                         │
│    1. Receive PCM16 @ 48kHz from Gateway ✓                        │
│    2. STT via Deepgram API                                         │
│    3. Text processing/translation                                  │
│    4. TTS via ElevenLabs → MP3 output                             │
│    5. FFmpeg: MP3 → PCM16 @ 48kHz ✓                               │
│    6. Send back to Gateway @ 48kHz ✓                              │
│                                                                    │
│  Verified via logs:                                                │
│    AUDIO_SAMPLE_RATE = 48000Hz ✓                                  │
│    FFmpeg command: -ar 48000 ✓                                    │
│    Output: PCM16 @ 48kHz ✓                                        │
└────────────────────────────────────────────────────────────────────┘
```

---

## PROBLEM DESCRIPTION

### Symptoms
- Translated audio plays at approximately 3x slower speed than normal
- Sounds like "slow motion" effect
- Original untranslated audio on extension 7777 plays normally
- Issue affects only the translated audio sent to extension 8888

### Audio Quality Impact
- Speech is intelligible but unnaturally slow
- 3-second speech segment plays for ~9 seconds
- No distortion, crackling, or data loss
- Pure time-domain stretching effect

---

## INVESTIGATION TIMELINE

### Phase 1: Sample Rate Verification ✓
**Hypothesis**: Conference server converting audio at wrong sample rate
**Tests**:
- Added diagnostic logging to Conference Server FFmpeg conversion
- Verified AUDIO_SAMPLE_RATE=48000 throughout pipeline
- Confirmed FFmpeg command: `ffmpeg -ar 48000 -ac 1`
- Verified output buffer size matches 48kHz math

**Result**: Conference Server IS correctly processing at 48kHz ✓

**Log Evidence**:
```
[Audio Convert] AUDIO_SAMPLE_RATE = 48000Hz
[FFmpeg] Executing: ffmpeg -i /tmp/tts_XXX.mp3 -f s16le -acodec pcm_s16le -ar 48000 -ac 1 /tmp/tts_XXX.pcm
[Audio Convert] ✓ Conversion complete: 102818 bytes PCM16 @ 48000Hz
```

### Phase 2: Asterisk Configuration Update ✓
**Hypothesis**: Asterisk channel format mismatch
**Action**: Changed dialplan from `slin16` to `slin48`

**Before**:
```ini
Set(CHANNEL(format)=slin16)    ; 16kHz
```

**After**:
```ini
Set(CHANNEL(format)=slin48)    ; 48kHz
```

**Result**: Audio still slow motion, but eliminated initial "squawk" noise ⚠️
**Conclusion**: Improved symptoms but did NOT fix root cause

### Phase 3: RTP Protocol Analysis ✓
**Hypothesis**: Gateway RTP packet headers mismatched with payload data
**Method**: Analyzed RFC 3551 RTP Payload Type definitions

**Discovery**: **ROOT CAUSE IDENTIFIED**

#### RFC 3551 Static Payload Type Assignments:
| PT | Format | Sample Rate | Encoding |
|----|--------|-------------|----------|
| 0  | PCMU   | 8 kHz       | μ-law    |
| 8  | PCMA   | 8 kHz       | A-law    |
| 10 | L16    | **16 kHz**  | Linear   |
| 11 | L16    | 44.1 kHz    | Linear   |
| 96-127 | Dynamic | Negotiated | Various |

**The Problem**:
- Gateway uses **PT=10** for 48kHz audio
- RFC 3551 defines **PT=10 = L16 @ 16kHz** (fixed, immutable)
- Asterisk receives RTP packet with PT=10 header
- Asterisk follows RFC 3551: PT=10 → decode as 16kHz
- Even though ExternalMedia channel format is `slin48`, the static PT definition takes precedence
- Result: 48kHz audio data decoded at 16kHz rate = **48/16 = 3x slower playback**

#### Timing Math Verification:
```
Gateway sends:
  - 960 samples per packet (48kHz × 20ms = 960 samples) ✓
  - RTP timestamp increments by 960 per packet ✓
  - PT=10 in RTP header ⚠️

Asterisk receives:
  - Reads PT=10 → assumes 16kHz per RFC 3551
  - 960 samples @ 16kHz = 60ms duration (not 20ms!)
  - Playback rate: 20ms / 60ms = 0.33x = 3x slower ✓
```

This perfectly explains the observed 3x slowdown.

---

## PROPOSED SOLUTION

### Change: RTP Payload Type 10 → 96

**File**: `gateway-7777-8888.js`
**Line**: 43

**Current (Incorrect)**:
```javascript
const RTP_CONFIG = {
  48000: {
    payloadType: 10,           // ⚠️ RFC 3551: PT=10 = L16 @ 16kHz
    sampleRate: 48000,         // ✓ Data is 48kHz
    samplesPerPacket: 960      // ✓ 20ms @ 48kHz
  }
};
```

**Proposed (Correct)**:
```javascript
const RTP_CONFIG = {
  48000: {
    payloadType: 96,           // ✓ Dynamic PT (undefined in RFC 3551)
    sampleRate: 48000,
    samplesPerPacket: 960
  }
};
```

### Rationale

**Why PT=96?**
1. **Dynamic Payload Type Range**: PT 96-127 are reserved for dynamic/application-specific formats
2. **No Fixed Definition**: RFC 3551 does NOT define PT=96, so it has no predetermined sample rate
3. **Channel Format Precedence**: Without a fixed PT definition, Asterisk will respect the ExternalMedia channel format (`slin48`)
4. **Industry Standard**: Using dynamic PT for non-standard configurations is common practice

**Expected Behavior After Fix**:
```
Gateway sends:
  - 960 samples per packet @ 48kHz ✓
  - PT=96 in RTP header ✓

Asterisk receives:
  - Reads PT=96 → undefined in RFC 3551
  - Checks ExternalMedia channel format: slin48 (48kHz) ✓
  - Decodes at 48kHz ✓
  - Playback: 48kHz data @ 48kHz rate = normal speed ✓
```

---

## QUESTIONS FOR YOUR DEVELOPMENT TEAM

### 1. Root Cause Validation
**Question**: Does our analysis of the RTP PT=10 mismatch seem correct?
**Context**: We've verified the 3x slowdown math, but want confirmation that Asterisk's PT interpretation behavior matches our understanding.

**Specific sub-questions**:
- Does Asterisk prioritize static PT definitions (0-95) over ExternalMedia channel format?
- Is our understanding of RFC 3551 PT=10 (L16 @ 16kHz) correct?
- Could there be other factors causing 3x slowdown besides PT mismatch?

### 2. Proposed Solution Review
**Question**: Is changing from PT=10 to PT=96 the correct approach?
**Context**: PT=96 is in the dynamic range (96-127), which should allow channel format to take precedence.

**Concerns**:
- Will Asterisk correctly handle PT=96 with ExternalMedia format=slin48?
- Are there better PT values to use? (e.g., PT=11 for 44.1kHz, though not exact match)
- Should we negotiate the payload type through SDP instead of hardcoding?

### 3. Alternative Solutions
**Question**: Are there alternative approaches we should consider?

**Options we're aware of**:
- **Option A**: Use PT=96 (our proposal)
- **Option B**: Use PT=11 (44.1kHz, closer but not exact) - would cause 48/44.1 = 1.088x speedup
- **Option C**: Implement sample rate conversion (48kHz → 16kHz) to match PT=10 - defeats purpose of 48kHz
- **Option D**: Use Asterisk native bridging instead of ExternalMedia - loses ability to process audio

**Which would you recommend and why?**

### 4. Potential Side Effects
**Question**: What risks or side effects should we watch for after implementing the PT=96 change?

**Our concerns**:
- Could PT=96 cause compatibility issues with certain SIP endpoints?
- Will RTP timestamp handling remain correct?
- Are there any Asterisk configuration settings we should verify/adjust?
- Should we expect any changes in jitter buffer behavior?

### 5. Testing Strategy
**Question**: What testing would you recommend before deploying this change?

**Our current test plan**:
1. Change PT to 96 in gateway configuration
2. Restart gateway service
3. Place test call: Extension 7777 → 8888
4. Verify audio plays at normal speed
5. Check for artifacts, distortion, timing issues
6. Test extended duration calls (5+ minutes)
7. Verify both directions (7777→8888 and 8888→7777)

**Are we missing any critical tests?**

### 6. Best Practices
**Question**: What are industry best practices for handling non-standard sample rates in RTP?

**Our scenario**:
- Using 48kHz for better TTS/STT quality
- ExternalMedia channels (not native Asterisk bridging)
- Need compatibility with standard SIP endpoints

**Best practices for**:
- Payload type selection
- SDP negotiation
- Sample rate handling
- Interoperability testing

---

## CURRENT CONFIGURATION DETAILS

### Asterisk Configuration
**Version**: (specify your version)
**Dialplan** (`/etc/asterisk/extensions.conf`):
```ini
[translation-test]
exten => 7777,1,NoOp(=== ExternalMedia Test - Extension 7777 ===)
 same => n,Answer()
 same => n,Set(CHANNEL(format)=slin48)
 same => n,Stasis(translation-test,ext7777)

exten => 8888,1,NoOp(=== ExternalMedia Test - Extension 8888 ===)
 same => n,Answer()
 same => n,Set(CHANNEL(format)=slin48)
 same => n,Stasis(translation-test,ext8888)
```

**ARI Configuration** (`/etc/asterisk/ari.conf`):
```ini
[general]
enabled = yes

[translation-api]
type = user
read_only = no
password = (configured)
```

### Gateway Service
**Platform**: Node.js
**RTP Library**: Custom implementation
**Current Configuration**:
```javascript
// RTP Packet Structure
const RTP_CONFIG = {
  16000: {
    payloadType: 10,        // RFC 3551 compliant
    sampleRate: 16000,
    samplesPerPacket: 320
  },
  48000: {
    payloadType: 10,        // ⚠️ INCORRECT - conflicts with RFC 3551
    sampleRate: 48000,
    samplesPerPacket: 960   // 20ms packets
  }
};

// ExternalMedia channel creation
format: 'slin48',
app: 'translation-test',
external_host: '127.0.0.1:PORT',
```

**Key Functions**:
- `createRTPPacket()`: Builds RTP header with PT from config (line 376-445)
- `handleIncomingRTP()`: Parses RTP, converts big-endian → little-endian (line 284-296)
- Endianness conversion verified working correctly ✓

### Conference Server
**Platform**: Node.js
**STT Provider**: Deepgram API
**TTS Provider**: ElevenLabs API
**Audio Processing**: FFmpeg

**Configuration** (`.env.externalmedia`):
```bash
AUDIO_SAMPLE_RATE=48000
NODE_ENV=production
```

**FFmpeg Conversion** (verified in logs):
```bash
ffmpeg -i /tmp/tts_XXX.mp3 \
  -f s16le \
  -acodec pcm_s16le \
  -ar 48000 \
  -ac 1 \
  /tmp/tts_XXX.pcm
```

---

## RELEVANT LOGS

### Conference Server (Working Correctly)
```
[Conference Server] Starting on port 3001...
[Conference Server] Environment: production
[Conference Server] Audio sample rate: 48000 Hz

[8888 → STT] Received 38400 bytes (0.40s @ 48kHz)
[Deepgram] Transcription: "hello world"
[Translation] Input: "hello world"
[Translation] Output: "hola mundo"
[ElevenLabs TTS] Generating audio for: "hola mundo"
[ElevenLabs TTS] Received MP3: 5234 bytes

[Audio Convert] AUDIO_SAMPLE_RATE = 48000Hz
[FFmpeg] Executing: ffmpeg -i /tmp/tts_1699XXX.mp3 -f s16le -acodec pcm_s16le -ar 48000 -ac 1 /tmp/tts_1699XXX.pcm
[Audio Convert] ✓ Conversion complete: 102818 bytes PCM16 @ 48000Hz

[8888 ← Audio] Sending 102818 bytes (1.07s @ 48kHz)
```

### Gateway Service (PT=10 Issue)
```
[Gateway] Starting RTP bridge on port 5060
[Gateway] Using AUDIO_SAMPLE_RATE: 48000 Hz

[ARI] Creating ExternalMedia channel for extension 7777
[ARI] Channel created: external-media/7777
[ARI] Format: slin48

[RTP → 8888] Sending packet: seq=12345 ts=960000 PT=10 size=1920
[RTP → 8888] Sending packet: seq=12346 ts=960960 PT=10 size=1920
[RTP → 8888] Sending packet: seq=12347 ts=961920 PT=10 size=1920
                                                ^^^^ PT=10 causes issue
```

### Asterisk Logs
```
[NOTICE] res_ari_channels.c: Creating external media channel
[NOTICE] channel.c: Set channel format to slin48
[VERBOSE] pbx.c: Executing [8888@translation-test:1] NoOp
[VERBOSE] pbx.c: Executing [8888@translation-test:2] Answer
[VERBOSE] pbx.c: Executing [8888@translation-test:3] Set(CHANNEL(format)=slin48)
[VERBOSE] res_ari.c: Stasis application 'translation-test' started
```

---

## ENVIRONMENT

**Infrastructure**:
- Platform: Azure VM (Ubuntu 20.04 LTS)
- Asterisk: v18.x (specify exact version)
- Node.js: v18.x
- Network: Localhost RTP (127.0.0.1)

**Services Status**:
```
Conference Server: RUNNING (PID 1680583)
  Log: /tmp/conference-diagnostic.log
  Sample Rate: 48kHz ✓

Gateway: RUNNING (PID 1684661)
  Log: /tmp/gateway-diagnostic-fixed.log
  Sample Rate: 48kHz ✓
  Payload Type: 10 ⚠️ (issue)
```

---

## DEPLOYMENT PLAN

### Pre-Deployment
1. ✓ Create backup of gateway-7777-8888.js
2. ✓ Document current configuration
3. ✓ Verify current service status
4. ⏳ **AWAITING**: External development team consultation

### Deployment Steps
```bash
# 1. Edit gateway configuration
vi /home/azureuser/translation-app/7777-8888-stack/gateway-7777-8888.js
# Change line 43: payloadType: 10 → payloadType: 96

# 2. Restart gateway service
pkill -f gateway-7777-8888.js
cd /home/azureuser/translation-app/7777-8888-stack
nohup node gateway-7777-8888.js > /tmp/gateway-pt96.log 2>&1 &

# 3. Verify service startup
ps aux | grep gateway-7777-8888
tail -f /tmp/gateway-pt96.log
```

### Post-Deployment Testing
- [ ] Service starts without errors
- [ ] RTP packets sent with PT=96
- [ ] Audio plays at normal speed (not slow motion)
- [ ] No artifacts or distortion
- [ ] Timestamps correct (20ms packets)
- [ ] Both directions work (7777↔8888)
- [ ] Extended duration test (5+ minutes)

### Rollback Plan
```bash
# If issues occur, restore backup immediately
pkill -f gateway-7777-8888.js
cp gateway-7777-8888.js.backup-pt96-TIMESTAMP gateway-7777-8888.js
nohup node gateway-7777-8888.js > /tmp/gateway-rollback.log 2>&1 &
```

---

## RESPONSE REQUESTED

**Timeline**: We plan to deploy this fix within 48 hours pending your feedback.

**Preferred Response Format**:
1. **Validation**: Agree/Disagree with root cause analysis (with reasoning)
2. **Solution Review**: Approve/Suggest alternatives for PT=96 approach
3. **Risks**: Any concerns or side effects we should watch for
4. **Recommendations**: Best practices or additional tests to consider

**Contact**: (Your contact information)

**Thank you for your time and expertise!**

---

## APPENDIX A: RFC 3551 Reference

### RTP Payload Types (Relevant Excerpts)

**Static Assignments (0-95)**:
```
PT   encoding    media type  clock rate   channels
     name                    (Hz)
___________________________________________________
0    PCMU        A            8,000       1
3    GSM         A            8,000       1
4    G723        A            8,000       1
5    DVI4        A            8,000       1
6    DVI4        A           16,000       1
7    LPC         A            8,000       1
8    PCMA        A            8,000       1
9    G722        A            8,000       1
10   L16         A           16,000       1     ← Used incorrectly for 48kHz
11   L16         A           44,100       2
14   MPA         A           90,000       (see text)
15   G728        A            8,000       1
```

**Dynamic Assignments (96-127)**:
- Not defined in RFC 3551
- Available for application-specific use
- Should be negotiated via SDP (Session Description Protocol)
- Our proposed use: PT=96 for L16 @ 48kHz

### Relevant RTP Header Structure
```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|V=2|P|X|  CC   |M|     PT      |       sequence number         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                           timestamp                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|           synchronization source (SSRC) identifier            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

- **PT (Payload Type)**: 7 bits, specifies audio codec and sample rate
- **Timestamp**: 32 bits, increments by samples per packet at the sample rate

---

## APPENDIX B: Detailed Gateway Code

### Current RTP Configuration (Incorrect)
```javascript
/**
 * RTP Configuration for different sample rates
 * RFC 3551: PT=10 is defined as L16 @ 16kHz
 */
const RTP_CONFIG = {
  16000: {
    payloadType: 10,           // ✓ Correct per RFC 3551
    format: "L16",
    sampleRate: 16000,
    bytesPerSample: 2,
    endianness: "big",
    samplesPerPacket: 320      // 20ms @ 16kHz
  },
  48000: {
    payloadType: 10,           // ⚠️ INCORRECT - conflicts with RFC 3551
    format: "L16",
    sampleRate: 48000,
    bytesPerSample: 2,
    endianness: "big",
    samplesPerPacket: 960      // 20ms @ 48kHz
  }
};

// Select configuration based on environment
const AUDIO_SAMPLE_RATE = parseInt(process.env.AUDIO_SAMPLE_RATE) || 48000;
const OUTGOING_RTP_CONFIG = RTP_CONFIG[AUDIO_SAMPLE_RATE];

console.log(`[Gateway] Using ${AUDIO_SAMPLE_RATE}Hz: PT=${OUTGOING_RTP_CONFIG.payloadType}`);
```

### RTP Packet Creation (Lines 376-445)
```javascript
function createRTPPacket(extension, pcmPayload) {
  const state = rtpState[extension];
  if (!state) return null;

  // RTP Header: 12 bytes
  const rtpHeader = Buffer.alloc(12);

  // Byte 0: Version (2), Padding (0), Extension (0), CSRC Count (0)
  rtpHeader[0] = 0x80; // V=2, P=0, X=0, CC=0

  // Byte 1: Marker (0), Payload Type
  rtpHeader[1] = OUTGOING_RTP_CONFIG.payloadType;  // Sets PT=10 (ISSUE!)

  // Bytes 2-3: Sequence Number (big-endian)
  rtpHeader.writeUInt16BE(state.sequence, 2);
  state.sequence++;

  // Bytes 4-7: Timestamp (big-endian)
  rtpHeader.writeUInt32BE(state.timestamp, 4);
  state.timestamp += OUTGOING_RTP_CONFIG.samplesPerPacket; // +960 @ 48kHz

  // Bytes 8-11: SSRC
  rtpHeader.writeUInt32BE(state.ssrc, 8);

  // Convert PCM16LE payload to big-endian (network byte order)
  const rtpPayload = Buffer.alloc(pcmPayload.length);
  for (let i = 0; i < pcmPayload.length; i += 2) {
    // Swap bytes: LE → BE
    rtpPayload[i] = pcmPayload[i + 1];
    rtpPayload[i + 1] = pcmPayload[i];
  }

  return Buffer.concat([rtpHeader, rtpPayload]);
}
```

**Issue**: Line 401 sets PT from `OUTGOING_RTP_CONFIG.payloadType`, which is 10 for 48kHz config.

---

*Document prepared for external consultation*
*Internal reference: AUDIO-PIPELINE-001*
*Confidentiality: Internal use / Partner sharing*
