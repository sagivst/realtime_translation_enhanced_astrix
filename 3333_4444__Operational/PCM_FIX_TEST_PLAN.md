# PCM Audio Fix - Test Plan & Next Steps

## Fix Summary
**Date**: 2025-11-23
**Issue**: Noise with intermittent speech in audio translation
**Root Cause**: Frame timing mismatch (sending 5ms frames with 20ms gaps)
**Solution**: Corrected frame timing to match actual audio duration

## Changes Made

### 1. STTTTSserver.js Updates
- **Line 2947**: Fixed frame timing from 20ms to 5ms (`UDP_PCM_CONFIG.frameSizeMs`)
- **Lines 2804-2807, 2851-2854**: Added PCM format validation logging
- **Configuration**: Already using correct 160 bytes/frame, 16kHz, s16le format

### 2. Deployment Status
- ✅ STTTTSserver deployed and running
- ✅ Gateway-3333-buffered.js running
- ✅ Gateway-4444-buffered.js running
- ✅ UDP ports 6120-6123 listening
- ✅ Socket.IO server on port 3020

## Test Procedure

### Step 1: Verify System Ready
```bash
ssh azureuser@20.170.155.53 'ps aux | grep -E "gateway|STTTTSserver" | grep -v grep'
```
Expected: 3 processes (STTTTSserver.js, gateway-3333-buffered.js, gateway-4444-buffered.js)

### Step 2: Monitor Real-Time Logs
Open a terminal and run:
```bash
ssh azureuser@20.170.155.53 'tail -f /tmp/sttttserver-pcm-fix.log | grep -E "UDP-|Transcribed|Translated|PCM sample|Translation complete"'
```

### Step 3: Make Test Call
1. **Call extension 3333**
2. **Speak clearly in English**:
   - "Hello, how are you today?"
   - "The weather is beautiful."
   - "I would like to order a coffee please."

### Step 4: Verify on Extension 4444
- Should hear French translation WITHOUT noise
- Audio should be clear and continuous
- No gaps or distortion

### Step 5: Check PCM Sample Values
In the logs, look for:
```
[UDP-3333] PCM sample check: <value1>, <value2> (expected range: -32768 to 32767)
```
Values should be within the expected range, confirming proper s16le format.

## Expected Log Output

### Successful Translation Flow:
```
[UDP-3333] Gateway connected: 160 bytes/frame (packet #1)
[UDP-3333] PCM sample check: -245, 1823 (expected range: -32768 to 32767)
[UDP-3333] Processing 8000 bytes
[UDP-3333] Starting translation: en → fr
[UDP-3333] Transcribed: "Hello, how are you today?"
[UDP-3333→4444] Translated: "Bonjour, comment allez-vous aujourd'hui?"
[UDP-3333→4444] Generated 48000 bytes MP3
[UDP-3333→4444] Converted to 48000 bytes PCM
[UDP-4444] Sending 48000 bytes (300 frames)
[UDP-4444] ✓ Sent 300 frames
[UDP-3333→4444] ✓ Translation complete
```

## Monitoring Commands

### Live Audio Flow:
```bash
ssh azureuser@20.170.155.53 'tail -f /tmp/sttttserver-pcm-fix.log | grep -E "UDP-|PCM"'
```

### Translation Activity:
```bash
ssh azureuser@20.170.155.53 'tail -f /tmp/sttttserver-pcm-fix.log | grep -E "Transcribed|Translated"'
```

### Statistics (every 30 seconds):
```bash
ssh azureuser@20.170.155.53 'tail -f /tmp/sttttserver-pcm-fix.log | grep "UDP PCM STATS"'
```

### Gateway Status:
```bash
ssh azureuser@20.170.155.53 'tail -f /tmp/gateway-3333-pcm-fix.log'
ssh azureuser@20.170.155.53 'tail -f /tmp/gateway-4444-pcm-fix.log'
```

## Troubleshooting

### If Audio Still Has Issues:

1. **Check packet sizes**:
   ```bash
   ssh azureuser@20.170.155.53 'tail -100 /tmp/sttttserver-pcm-fix.log | grep "bytes/frame"'
   ```
   Should show: "160 bytes/frame"

2. **Verify frame timing**:
   ```bash
   ssh azureuser@20.170.155.53 'grep frameSizeMs /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js'
   ```
   Should show: `frameSizeMs: 5`

3. **Check for errors**:
   ```bash
   ssh azureuser@20.170.155.53 'tail -100 /tmp/sttttserver-pcm-fix.log | grep -i error'
   ```

### Rollback If Needed:
```bash
ssh azureuser@20.170.155.53 << 'EOF'
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
pkill -f STTTTSserver.js
cp STTTTSserver.js.pcm-fix-backup-* STTTTSserver.js
nohup node STTTTSserver.js > /tmp/sttttserver.log 2>&1 &
EOF
```

## Next Steps

1. **Test the audio quality** with actual calls
2. **Monitor for any remaining issues**:
   - Audio gaps
   - Distortion
   - Latency
3. **Fine-tune if needed**:
   - Buffer threshold (currently 8000 bytes / 0.5 seconds)
   - Frame timing precision
4. **Verify bidirectional translation** (4444 → 3333)

## Success Criteria

- [ ] No audio noise or distortion
- [ ] Clear, continuous speech
- [ ] Successful STT (speech-to-text) recognition
- [ ] Accurate translation
- [ ] Natural-sounding TTS (text-to-speech) output
- [ ] Low latency (< 2 seconds end-to-end)

## Dashboard Access

Monitor real-time audio flow:
http://20.170.155.53:3020/dashboard.html

## Additional Notes

- The fix addresses the core timing issue that was causing audio gaps
- PCM format (s16le, 16kHz, mono) is correctly configured throughout
- Both gateways and STTTTSserver are now synchronized on 5ms frame timing
- The system should now produce clear, continuous audio without noise