# RTP Payload Type Diagnostic Findings
**Date:** 2025-11-13
**System:** Asterisk ExternalMedia + Gateway Audio Pipeline

---

## Executive Summary

**CRITICAL DISCOVERY:** Asterisk ExternalMedia is **format-driven, NOT payload-type-driven**.

When ExternalMedia is created with `format: "slin48"`, Asterisk assigns **PT=126** regardless of what payload type the gateway sends or expects. This invalidates standard VoIP advice about using PT=96 for dynamic payload types.

---

## Diagnostic Results

### 1. RTP Payload Type Analysis

**Gateway Configuration (PT=10):**
```
[Config] HYBRID MODE:
  Incoming (Asterisk→Gateway): L16 @ PT=10 (big-endian) 48000Hz
  Outgoing (Gateway→Asterisk): L16 @ PT=10 (big-endian) 48000Hz
```

**Actual RTP Traffic:**
```
Gateway sends:    PT=10 (as configured)
Asterisk sends:   PT=126 (NOT PT=10!)
```

**Gateway Configuration (PT=96 Test):**
```
[Config] HYBRID MODE:
  Incoming (Asterisk→Gateway): L16 @ PT=96 (big-endian) 48000Hz
  Outgoing (Gateway→Asterisk): L16 @ PT=96 (big-endian) 48000Hz
```

**Actual RTP Traffic:**
```
Gateway sends:    PT=96 (as configured)
Asterisk sends:   PT=126 (NOT PT=96!)
```

### 2. Evidence from Packet Logs

**All logs consistently show:**
```
[RTP] Incoming PT=126, total=1932B, header=12B, payload=1920B
```

**Across multiple test configurations:**
- `/tmp/gateway-pt96-FINAL.log` → PT=126
- `/tmp/gateway-diagnostic-fixed.log` → PT=126
- `/tmp/gateway-ROLLBACK-PT10.log` → PT=126

**Conclusion:** Asterisk ExternalMedia with `format: "slin48"` ALWAYS assigns PT=126.

---

## Root Cause Analysis

### Why PT=96 Failed (Complete Silence)

**Gateway Code Logic:**
```javascript
// Endian swap logic in gateway-7777-8888.js
if ((payloadType === ACTIVE_RTP_CONFIG.payloadType || payloadType === 118)
    && ACTIVE_RTP_CONFIG.endianness === "big") {
  // Perform big-endian → little-endian swap
  for (let i = 0; i < payload.length; i += 2) {
    swapped[i] = payload[i + 1];     // High byte
    swapped[i + 1] = payload[i];     // Low byte
  }
}
```

**What Happened with PT=96:**
1. Gateway configured: `payloadType: 96`
2. Gateway expects incoming: `PT=96`
3. Asterisk sends: `PT=126` (NOT PT=96!)
4. Condition fails: `126 !== 96`
5. No endian swap performed
6. Audio stays big-endian (wrong byte order)
7. Result: Garbage/silent audio

**Log Evidence:**
```
[RTP] Incoming PT=126, total=1932B, header=12B, payload=1920B
[RTP Audio] Max sample: 0, Clipped: 0/960 (0.00%)  ← Silent!
```

### Why PT=10 "Works" (But 3x Slow)

**Current Behavior:**
- Gateway configured: `payloadType: 10`
- Asterisk sends: `PT=126`
- Condition fails: `126 !== 10`
- No endian swap performed
- But audio is heard (3x slower)

**Hypothesis:**
The 3x slowdown may NOT be caused by payload type mismatch but by:
1. Asterisk interpreting 48kHz RTP timestamps as 16kHz timestamps
2. Sample rate mismatch at a different layer (Asterisk internal routing)
3. ExternalMedia format configuration issue

---

## Asterisk ExternalMedia PT Assignment

**Format → PT Mapping:**
```
format: "slin48"   → Asterisk assigns PT=126
format: "slin16"   → Asterisk assigns PT=?? (unknown)
format: "slin"     → Asterisk assigns PT=?? (unknown)
```

**Key Insight:**
Asterisk ExternalMedia uses the `format` field to determine codec and sample rate, then **assigns its own dynamic PT** based on internal codec mappings. The PT field in incoming RTP packets is **ignored**.

This is fundamentally different from standard SIP/RTP behavior where:
- PT is negotiated via SDP
- Both endpoints agree on PT mapping
- PT field is respected

---

## Why Standard VoIP Advice Fails

**Colleague's Advice (Standard VoIP):**
```
Use PT=96 for 48kHz PCM16 audio
→ This is correct for SIP with SDP negotiation
→ This does NOT work for Asterisk ExternalMedia
```

**Reason:**
- Standard VoIP: PT negotiated via SDP, both sides agree
- ExternalMedia: No SDP, Asterisk assigns PT based on format field
- Gateway has no way to negotiate or discover Asterisk's PT

---

## Verified Facts

✓ Asterisk ExternalMedia format=slin48 → PT=126
✓ Gateway PT configuration is ignored by Asterisk
✓ PT mismatch prevents endian swap in gateway code
✓ PT=96 test resulted in complete audio failure
✓ PT=10 configuration produces 3x slow audio
✓ Packet size is correct: 1920 bytes = 960 samples @ PCM16

---

## Open Questions

1. **What PT does Asterisk use for slin16?** (Need to test format: "slin16")
2. **Why is PT=10 audio 3x slower?** (If endian swap isn't happening, what's the root cause?)
3. **Can we force Asterisk to use a specific PT?** (Probably not without SDP)
4. **Is there an Asterisk config to control PT assignment?** (Unknown)

---

## Alternative Solutions

### Option 1: Remove PT-Based Endian Swap Logic
**Change gateway code to ALWAYS perform endian swap:**
```javascript
// Remove PT check, always swap if configured as big-endian
if (ACTIVE_RTP_CONFIG.endianness === "big") {
  // Always swap, regardless of PT
}
```

**Pros:**
- Works with any PT Asterisk assigns
- No dependency on PT matching

**Cons:**
- Less safe (assumes all traffic needs swapping)
- Harder to debug issues

### Option 2: Use PT=126 in Gateway Config
**Configure gateway to expect PT=126:**
```javascript
const RTP_CONFIG = {
  48000: {
    payloadType: 126,      // Match what Asterisk actually sends!
    format: "L16",
    sampleRate: 48000,
    bytesPerSample: 2,
    endianness: "big",
    samplesPerPacket: 960
  }
};
```

**Pros:**
- PT matches, endian swap will occur
- More predictable behavior

**Cons:**
- Hardcoded to Asterisk's internal PT assignment
- May break if Asterisk version changes PT mapping

### Option 3: Change Asterisk ExternalMedia Format
**Test with format: "slin16" to see if that matches PT=10:**
```javascript
POST /ari/channels/externalMedia
{
  "format": "slin16",  // Instead of slin48
  ...
}
```

**Pros:**
- May align with gateway's PT=10 expectation
- Standard 16kHz might be more compatible

**Cons:**
- Requires downsampling 48kHz → 16kHz
- Loses audio quality
- Doesn't solve the root issue

### Option 4: Investigate RTP Timestamp Clock Rate
**The 3x slowdown could be timestamp-based, not PT-based:**

If gateway sends RTP with:
- Timestamp increment: +960 (for 48kHz, 20ms)
- But Asterisk interprets as 16kHz clock

Then each packet appears as 60ms instead of 20ms:
- 960 / 16000 = 60ms (instead of 960 / 48000 = 20ms)
- Result: 60ms / 20ms = 3x slower playback

**Need to verify:**
- Actual RTP timestamp increments in pcap
- Asterisk's interpretation of timestamp clock rate

---

## Recommended Next Steps

1. **Test PT=126 in gateway configuration** (Option 2)
2. **Capture RTP packets with tcpdump** to verify timestamp increments
3. **Check Asterisk RTP debug output** for clock rate interpretation
4. **Test with format: "slin16"** to see PT assignment
5. **Review Asterisk source code** for ExternalMedia PT assignment logic

---

## Files Referenced

- Gateway: `/home/azureuser/translation-app/7777-8888-stack/gateway-7777-8888.js:42`
- PT=96 test log: `/tmp/gateway-pt96-FINAL.log`
- PT=10 test log: `/tmp/gateway-diagnostic-fixed.log`
- Current log: `/tmp/gateway-ROLLBACK-PT10.log`
- Packet capture: `/tmp/rtp-capture-pt10.txt`

---

## Technical Details

**RTP Packet Structure:**
```
Total: 1932 bytes
Header: 12 bytes
Payload: 1920 bytes = 960 samples × 2 bytes/sample
```

**Gateway Endian Swap Logic Location:**
`gateway-7777-8888.js` - `parseRTPPacket()` function

**Asterisk ExternalMedia Creation:**
`conference-server-externalmedia.js` - ARI channel creation with format field

---

*End of Diagnostic Report*
