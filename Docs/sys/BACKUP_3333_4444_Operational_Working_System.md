================================================================================
BACKUP: 3333_4444__Operational - Working System
================================================================================

Date: November 24, 2025 - 02:54 UTC
Status: Working_3333_4444_GStreamer_IN_Deepgram_DeepL_ElevenLabs

SIZE: 19MB compressed
FILES: 188 total (81 JS/JSON/ENV config files)

SYSTEM COMPONENTS:
- GStreamer audio pipelines (3333 EN, 4444 FR)
- Deepgram STT (Speech-to-Text)
- DeepL Translation
- ElevenLabs TTS (Text-to-Speech) ✓ Dashboard Card #4 Working
- Real-time bidirectional translation system
- UDP PCM audio streaming (6120-6123)
- Dashboard monitoring (port 3020)

EXCLUDED FROM BACKUP:
✓ *backup* *checkpoint* *chekpoint* *checkpint* *bkp* (keyword exclusions)
✓ node_modules (regenerate with: npm install)
✓ *.tar.gz (no nested archives)
✓ .git (repository data)
✓ asterisk-build (2300+ source files)

KEY FILES INCLUDED:
- STTTTSserver.js (main server with Card #4 fix)
- gateway-3333.js / gateway-4444.js
- ari-gstreamer-operational.js
- dashboard-single.html
- .env.externalmedia (configuration)
- package.json / package-lock.json

LATEST CHANGES:
- Fixed dashboard Card #4 "ElevenLabs (Text to Voice)"
- Added translatedAudio Socket.IO emit with MP3 base64 data
- Audio visualizer, translation text, and playback now working

TO RESTORE:
1. Extract: tar -xzf [filename].tar.gz
2. Install dependencies: cd STTTTSserver && npm install
3. Configure .env.externalmedia with API keys
4. Start server: node STTTTSserver.js

BACKUP FILENAME:
3333_4444__Operational__Working_3333_4444_GStreamer_IN_Deepgram_DeepL_ElevenLabs__20251124_025401.tar.gz

BACKUP LOCATION (Remote):
/home/azureuser/translation-app/3333_4444__Operational__Working_3333_4444_GStreamer_IN_Deepgram_DeepL_ElevenLabs__20251124_025401.tar.gz

================================================================================

## Card #4 Fix Details

### Problem
Dashboard Card #4 "ElevenLabs (Text to Voice)" was not receiving audio data from the backend.

### Solution
Added Socket.IO emit in STTTTSserver.js after MP3 generation (line ~3301-3312):

```javascript
// Emit translatedAudio event for dashboard Card #4 (ElevenLabs TTS)
global.io.emit("translatedAudio", {
  extension: sourceExtension,
  translation: translatedText,
  original: transcriptionResult.text,
  audio: mp3Buffer.toString("base64"),  // Base64-encoded MP3
  sampleRate: 24000,  // ElevenLabs default sample rate
  duration: Math.round(mp3Buffer.length / (24000 * 2)),  // Rough estimate
  timestamp: Date.now()
});
console.log(`[Card #4] translatedAudio emitted for extension ${sourceExtension}: "${translatedText.substring(0, 30)}..."`);
```

### Result
- ✅ Audio visualizer displays waveform
- ✅ Translation window shows original + translated text
- ✅ MP3 audio plays in real-time
- ✅ Card status indicator updates correctly

================================================================================

## System Architecture

### Audio Flow
```
Asterisk Call (3333/4444)
    ↓
ExternalMedia (RTP)
    ↓
ARI GStreamer (ari-gstreamer-operational.js)
    ↓
Gateway (gateway-3333.js / gateway-4444.js)
    ↓ UDP PCM (6120-6123)
STTTTSserver.js
    ↓
Deepgram STT → DeepL Translation → ElevenLabs TTS
    ↓
Dashboard (Socket.IO) + Gateway (UDP PCM)
```

### Translation Pipeline
1. **Speech-to-Text**: Deepgram Nova-3 (EN/FR)
2. **Machine Translation**: DeepL (EN↔FR)
3. **Text-to-Speech**: ElevenLabs (eleven_multilingual_v2)

### Dashboard Cards
1. **Deepgram (Speech to Text)** - STT monitoring
2. **DeepL (Translation)** - MT monitoring
3. **Audio Waveforms** - Incoming audio visualization
4. **ElevenLabs (Text to Voice)** - TTS output with visualizer ✅ FIXED

================================================================================

## Deployment Notes

### Remote Server
- Host: 20.170.155.53
- User: azureuser
- Directory: /home/azureuser/translation-app/3333_4444__Operational/

### Running Services
```bash
# STTTTSserver (main translation server)
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
nohup node STTTTSserver.js > /tmp/STTTTSserver-operational.log 2>&1 &

# Gateway 3333 (English)
cd /home/azureuser/translation-app/3333_4444__Operational
nohup node gateway-3333.js > /tmp/gateway-3333-operational.log 2>&1 &

# Gateway 4444 (French)
cd /home/azureuser/translation-app/3333_4444__Operational
nohup node gateway-4444.js > /tmp/gateway-4444-operational.log 2>&1 &

# ARI GStreamer
cd /home/azureuser/translation-app/3333_4444__Operational
nohup node ari-gstreamer-operational.js > /tmp/ari-gstreamer-operational.log 2>&1 &
```

### Monitoring
```bash
# Dashboard
http://20.170.155.53:3020/dashboard.html

# Logs
tail -f /tmp/STTTTSserver-operational.log
tail -f /tmp/gateway-3333-operational.log
tail -f /tmp/gateway-4444-operational.log
tail -f /tmp/ari-gstreamer-operational.log
```

================================================================================

## API Configuration

Required environment variables in `.env.externalmedia`:

```bash
# Deepgram
DEEPGRAM_API_KEY=your_key_here

# DeepL
DEEPL_API_KEY=your_key_here

# ElevenLabs
ELEVENLABS_API_KEY=your_key_here

# Feature Flags
USE_DEEPGRAM_STREAMING=false  # Set to true for WebSocket streaming
```

================================================================================

## Future Enhancements

### Deepgram Streaming (Ready to Enable)
- ✅ Code complete (see DEEPGRAM_STREAMING_IMPLEMENTATION.md)
- ✅ Feature flag: USE_DEEPGRAM_STREAMING=false
- ✅ WebSocket infrastructure in place
- ⏸ Disabled by default (requires testing)

To enable:
1. Set USE_DEEPGRAM_STREAMING=true in .env.externalmedia
2. Restart STTTTSserver
3. Monitor for latency improvements (<1 second target)

### ElevenLabs Streaming (Potential Optimization)
- Current: REST API (buffered MP3)
- Recommended: WebSocket streaming (see OpenSource_ElevenLabs_Optimals.md)
- Benefits: Lower latency, PCM output, better pipeline integration

================================================================================

## Backup Command Used

```bash
cd /home/azureuser/translation-app
tar -czf 3333_4444__Operational__Working_3333_4444_GStreamer_IN_Deepgram_DeepL_ElevenLabs__20251124_025401.tar.gz \
  --exclude='*backup*' \
  --exclude='*checkpoint*' \
  --exclude='*chekpoint*' \
  --exclude='*checkpint*' \
  --exclude='*bkp*' \
  --exclude='node_modules' \
  --exclude='*.tar.gz' \
  --exclude='.git' \
  --exclude='asterisk-build' \
  3333_4444__Operational
```

================================================================================

**Document Version:** 1.0
**Last Updated:** 2025-11-24 02:54 UTC
**System Status:** ✅ Operational - All 4 Dashboard Cards Working
