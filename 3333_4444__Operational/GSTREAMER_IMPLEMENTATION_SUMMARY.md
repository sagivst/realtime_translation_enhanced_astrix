# GStreamer Implementation Summary for Extensions 3333/4444

## Problem Statement
The original implementation had severe audio quality issues:
- Only noise with some talking segments
- Audio clipping where only whispering passed clearly
- Direct RTP payload forwarding to STTTSserver expecting PCM

## Root Cause Analysis
Based on `16kHz_audio_handling_with_Asterisk.md`:
1. **Asterisk outputs 8 kHz audio** - telephony limitation (G.711/ALAW codec)
2. **AI models require 16 kHz** - all modern STT/TTS systems trained on wideband audio
3. **Simple header stripping is insufficient** - proper codec conversion required

## Solution Architecture

### Audio Flow Pipeline
```
Asterisk (8kHz ALAW RTP)
    ↓
GStreamer Gateway (Port 4000/4002)
    ├── RTP Depayload (rtppcmadepay)
    ├── ALAW Decode (alawdec)
    ├── Audio Convert
    └── Resample 8kHz → 16kHz
    ↓
STTTSserver (16kHz S16LE PCM on Port 6120/6122)
    ├── Speech-to-Text (Deepgram)
    ├── Translation (DeepL)
    └── Text-to-Speech (Azure)
    ↓
STTTSserver Output (16kHz PCM on Port 6121/6123)
    ↓
GStreamer Gateway
    ├── Resample 16kHz → 8kHz
    ├── ALAW Encode (alawenc)
    └── RTP Payload (rtppcmapay)
    ↓
Asterisk (8kHz ALAW RTP on Port 4001/4003)
```

## Key Components

### 1. GStreamer Gateways
- **gateway-3333-gstreamer.sh**: Handles extension 3333
  - RTP input: Port 4000 (from Asterisk)
  - PCM output: Port 6120 (to STTTSserver)
  - PCM input: Port 6121 (from STTTSserver)
  - RTP output: Port 4001 (to Asterisk)

- **gateway-4444-gstreamer.sh**: Handles extension 4444
  - RTP input: Port 4002 (from Asterisk)
  - PCM output: Port 6122 (to STTTSserver)
  - PCM input: Port 6123 (from STTTSserver)
  - RTP output: Port 4003 (to Asterisk)

### 2. Asterisk Configuration
```ini
[gstreamer-phase1]
exten => 3333,1,NoOp(Extension 3333 - GStreamer with ALAW)
 same => n,Answer()
 same => n,Set(CHANNEL(format)=alaw)  ; 8kHz ALAW format
 same => n,ExternalMedia(app=gs3333,external_host=127.0.0.1:4000,format=alaw,transport=udp)
```

### 3. STTTSserver
- Receives 16kHz PCM on ports 6120/6122
- Processes with AI models (all expect 16kHz)
- Outputs 16kHz PCM on ports 6121/6123
- Includes gain control (0.002 factor to prevent clipping)

## Why This Works

### Industry Standard Approach
As documented in `16kHz_audio_handling_with_Asterisk.md`:
- ✅ Accepts 8kHz from Asterisk (telephony reality)
- ✅ Upsamples to 16kHz for AI processing
- ✅ Downsamples back to 8kHz for Asterisk
- ✅ Uses proper codec conversion (not just header manipulation)

### Benefits of 8kHz → 16kHz Upsampling
Even though upsampling doesn't restore quality, it dramatically improves:
- More stable AI predictions
- Faster STT convergence
- Better Voice Activity Detection
- Cleaner denoising/filtering
- Fewer translation hallucinations
- Higher-quality TTS output

## Deployment

### Quick Deploy
```bash
chmod +x deploy-gstreamer-solution.sh
./deploy-gstreamer-solution.sh
```

### Manual Steps
1. Stop existing Node.js gateways
2. Create GStreamer gateway scripts
3. Update Asterisk dialplan to use ALAW
4. Start STTTSserver (if not running)
5. Launch GStreamer pipelines
6. Test with calls to 3333/4444

## Testing

### Test Procedure
1. Call extension 3333
2. Speak clearly in English
3. French translation should be heard on 4444
4. Audio should be clear without noise or distortion

### Monitoring
```bash
# Watch GStreamer pipelines
ssh azureuser@20.170.155.53 'tail -f /tmp/gstreamer-*.log'

# Monitor STTTSserver
ssh azureuser@20.170.155.53 'tail -f /tmp/sttttserver-gstreamer.log | grep -E "Transcribed|Translated"'

# Check dashboard
http://20.170.155.53:3020/dashboard.html
```

## Port Allocation

| Component | Port | Protocol | Purpose |
|-----------|------|----------|---------|
| GStreamer 3333 | 4000 | UDP/RTP | From Asterisk (8kHz) |
| GStreamer 3333 | 4001 | UDP/RTP | To Asterisk (8kHz) |
| GStreamer 4444 | 4002 | UDP/RTP | From Asterisk (8kHz) |
| GStreamer 4444 | 4003 | UDP/RTP | To Asterisk (8kHz) |
| STTTSserver | 6120 | UDP/PCM | From 3333 (16kHz) |
| STTTSserver | 6121 | UDP/PCM | To 3333 (16kHz) |
| STTTSserver | 6122 | UDP/PCM | From 4444 (16kHz) |
| STTTSserver | 6123 | UDP/PCM | To 4444 (16kHz) |
| Dashboard | 3020 | TCP/HTTP | Monitoring |

## Troubleshooting

### Audio Issues
- Check GStreamer pipeline status: `ps aux | grep gst-launch`
- Verify correct codec: Look for "PCMA" and "8000" in logs
- Confirm resampling: Should see "8000->16000" conversions

### Call Rejection
- Verify PJSIP registration: `asterisk -rx "pjsip show endpoints"`
- Check dialplan: `asterisk -rx "dialplan show gstreamer-phase1"`
- Ensure ExternalMedia format is "alaw" not "slin16"

## References
- `docs/sys/Flow_Asterisk_ExternalMedia_GStreamer_TTTTSserver.md`
- `docs/sys/16kHz_audio_handling_with_Asterisk.md`
- `docs/sys/3333-4444_PCM_Cross-Patch_and_Monitoring.md`