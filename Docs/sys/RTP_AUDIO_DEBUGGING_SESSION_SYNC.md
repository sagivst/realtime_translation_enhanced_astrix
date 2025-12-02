# RTP Audio Debugging - Terminal 1 Work Session

**Date:** 2025-11-12
**Focus:** Resolving garbled audio on extensions 7777/8888 with RTP ExternalMedia
**Status:** Testing standalone RTP audio sender

---

## Current Work

### What I'm Doing
Testing different RTP audio formats (PT=96 vs PT=10, byte order) to fix garbled audio playback on extension 8888.

### Approach
Created a standalone test script (`test-rtp-sender.js`) that sends test audio directly to the Gateway, bypassing the conference server. This isolates the RTP format issue.

### Current System State

**Active Processes:**
- **Gateway PID:** 257879
  - Log: `/tmp/gateway-pt96-native.log`
  - Configuration: PT=96, little-endian, NO byte swapping
  - Location: `/home/azureuser/translation-app/7777-8888-stack/gateway-7777-8888.js`

- **Conference Server PID:** 256126
  - Log: `/tmp/conference-test-mode.log`
  - Location: `/home/azureuser/translation-app/7777-8888-stack/conference-server-externalmedia.js`
  - Note: Test mode is NOT active on this instance

- **Test RTP Sender PID:** 260089 ✅ **ACTIVE**
  - Log: `/tmp/test-rtp-sender.log`
  - Location: `/home/azureuser/translation-app/7777-8888-stack/test-rtp-sender.js`
  - Sending audio to extension 8888 every 5 seconds
  - **STATUS:** Currently sending test audio (550 Hz tone, 3 seconds)

### Files I'm Modifying

**DO NOT TOUCH:**
- `/home/azureuser/translation-app/7777-8888-stack/gateway-7777-8888.js`
- `/home/azureuser/translation-app/7777-8888-stack/test-rtp-sender.js`
- `/tmp/gateway-*.log`
- `/tmp/test-rtp-sender.log`

**SAFE TO WORK WITH:**
- Any conference server files (not currently testing conference server)
- HOMER configuration and monitoring files
- Dashboard files (currently not being modified)
- Extensions 7000/7001 (AudioSocket - completely independent)

---

## Problem Being Solved

### Issue
Audio playback on extensions 7777/8888 is garbled/distorted or completely silent.

### Root Cause Hypothesis
RTP audio format mismatch between:
- Audio source format (PCM16, 16kHz, mono, little-endian)
- RTP payload type expectations (PT=10 vs PT=96)
- Asterisk ExternalMedia expectations (slin16 format)

### Configurations Tested
1. ❌ PT=10 (L16), little-endian, no byte swap → Garbled buzzer
2. ❌ PT=10 (L16), big-endian, byte swap enabled → Still garbled
3. ⏳ PT=96 (dynamic), little-endian, no byte swap → Testing now (silence issue)

---

## Test Setup

### Test Audio File
- **Location:** `/home/azureuser/translation-app/7777-8888-stack/test-audio-fr.pcm`
- **Format:** PCM16, 16kHz, mono, little-endian (s16le)
- **Content:** 550 Hz tone, 3 seconds, 96K bytes

### Test Flow
```
Test Sender (259296)
  ↓ Socket.IO: translatedAudio event
Gateway (257879)
  ↓ RTP packets (PT=96, 20ms frames)
Asterisk ExternalMedia
  ↓
Extension 8888 (SIP phone)
```

### Current Status
✅ Test sender is connected and actively sending audio to Gateway every 5 seconds
⏳ Waiting for user to call extension 8888 to test audio playback
⏳ Need to verify if PT=96 configuration works or if we need to try PT=10

---

## Next Steps

1. Debug why Gateway isn't receiving translatedAudio events
2. Fix event reception
3. Test audio playback on extension 8888
4. If PT=96 doesn't work, try reverting to PT=10 with different configurations
5. Once working, integrate solution back into conference server

---

## Parallel Work Safety

### You Can Work On:
- ✅ HOMER Native Audio Monitoring setup
- ✅ Dashboard updates (not touching RTP-related dashboards)
- ✅ Extensions 7000/7001 (AudioSocket stack)
- ✅ Any monitoring/logging infrastructure
- ✅ Documentation

### Avoid:
- ❌ Restarting Gateway PID 257879
- ❌ Modifying gateway-7777-8888.js
- ❌ Modifying test-rtp-sender.js
- ❌ Calling extensions 7777/8888 (I'm testing with 8888)
- ❌ Restarting Asterisk

---

## How To Check If I'm Done

```bash
# Check if test sender is still running
ps aux | grep test-rtp-sender.js | grep -v grep

# If NO output = I've stopped testing and it's safe to proceed with any work
```

---

## Communication

If you need to work on anything that conflicts with the above, just let me know in the other terminal and I'll pause/adjust my work.

---

**Last Updated:** 2025-11-12 10:18 UTC

---

## Quick Status Check

To see if I'm actively testing:
```bash
ps aux | grep test-rtp-sender.js | grep -v grep
```

**If you see PID 260089 = I'm actively testing with extension 8888**
**If no output = Test paused, extension 8888 is available**
