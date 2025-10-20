# Real-Time Translation System with Asterisk & Deepgram

Live transcription and translation system using Asterisk PBX, Deepgram STT, and DeepL translation.

## Current Status (2025-10-20)

### ✅ Working
- Asterisk PBX running (version 20.16.0)
- ARI (Asterisk REST Interface) connected
- AudioSocket protocol implemented
- Deepgram SDK v4 integration with proper event handling
- Socket.IO real-time communication
- Echo test on extension 8888 (working perfectly)

### 🔧 In Progress
- Extension 7000 transcription (Deepgram receiving empty transcripts due to low audio volume)
- Audio volume issue: AudioSocket captures at very low amplitude (~132 vs 32767 max)

### Issue Identified
**Root Cause**: Audio from AudioSocket is extremely quiet (±132 amplitude instead of normal levels).
- Echo on ext 8888 works perfectly (proves mic is fine)
- AudioSocket on ext 7000 captures same mic but at 1/250th volume
- Deepgram can't recognize speech at this low level

**Solution Needed**: Add volume boost in Asterisk dialplan before AudioSocket captures audio.

## Key Files Modified

- `asr-streaming-worker.js` - Fixed Deepgram SDK v4 event registration (must register after Open event)
- `audiosocket-orchestrator.js` - Echo disabled (line 353 commented out)
- `conference-server.js` - Added test transcript endpoint

## Architecture

```
SIP Client (Microphone)
    ↓
Asterisk PBX (Extension 7000)
    ↓
AudioSocket Protocol (TCP port 5050)
    ↓
audiosocket-orchestrator.js (Node.js)
    ↓
asr-streaming-worker.js (Deepgram SDK)
    ↓
conference-server.js (Socket.IO)
    ↓
Web Interface (http://4.185.84.26:3000/test-live-stream.html)
```

## Server Details

- **Azure VM**: asterisk-translation-vm (IP: 4.185.84.26)
- **Working Directory**: ~/translation-app
- **Log File**: ~/translation-app/translation-app.log
- **HTTP Server**: Port 3000
- **AudioSocket**: Port 5050
- **WebSocket**: Port 5051

## Services Running

```bash
# Check server status
pgrep -f 'node conference-server'

# View logs
tail -f ~/translation-app/translation-app.log

# Restart server
killall -9 node
cd ~/translation-app
nohup node conference-server.js > ~/translation-app/translation-app.log 2>&1 &
```

## Extensions

- **7000**: AudioSocket with Deepgram transcription (current issue: low audio)
- **8888**: Echo test (working perfectly)
- **1000-9999**: Conference rooms

## API Endpoints

- `http://4.185.84.26:3000/test-live-stream.html` - Live transcription viewer
- `http://4.185.84.26:3000/test-transcript` - Test Socket.IO with fake transcripts
- `http://4.185.84.26:3000/health` - Health check

## Deepgram Configuration

```javascript
{
  model: 'nova-2',
  language: 'en',
  encoding: 'linear16',
  sample_rate: 8000,
  channels: 1,
  interim_results: true,
  utterance_end_ms: 2000,
  vad_events: false,
  endpointing: 2000,
  punctuate: true,
  smart_format: true
}
```

## GitHub Repository

```bash
git remote -v
# origin  https://github.com/sagivst/realtime_translation_enhanced_astrix.git (fetch)
# origin  https://github.com/sagivst/realtime_translation_enhanced_astrix.git (push)
```

## Next Steps

1. Add volume boost to Asterisk dialplan: `Set(VOLUME(RX)=10)`
2. Test transcription with boosted audio
3. Fine-tune audio gain levels
4. Enable per-participant conference transcription

## Troubleshooting

### Check if services are running
```bash
ssh azureuser@4.185.84.26
sudo systemctl status asterisk
pgrep -f 'node conference-server'
```

### View recent transcripts
```bash
tail -n 100 ~/translation-app/translation-app.log | grep 'Transcript'
```

### Check audio levels
```bash
tail -n 100 ~/translation-app/translation-app.log | grep 'ASR Gain'
```

### Reload Asterisk dialplan
```bash
sudo asterisk -rx 'dialplan reload'
```
