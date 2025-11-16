# Unified Gateway Test Guide - Simple Passthrough
**Date**: 2025-11-16
**Purpose**: Test complete unified gateway infrastructure with simple audio passthrough (NO translation)

---

## Overview

This tests the **FULL unified gateway architecture** but replaces complex translation processing with **simple audio passthrough** between extensions 7777 and 8888.

### Architecture

```
Phone 1001 → Asterisk → ExternalMedia 7777 → Unified Gateway
                                                ↕ (simple passthrough, no translation)
Phone 1002 → Asterisk → ExternalMedia 8888 → Unified Gateway
                                                ↓ WebSocket (port 3002)
                                            Web Browser (listen to audio)
```

### What This Tests

✅ **RTP Reception**: Receive audio from Asterisk ExternalMedia (7777/8888)
✅ **RTP Transmission**: Send audio back to Asterisk ExternalMedia
✅ **Audio Routing**: Connect 7777 ↔ 8888 inside gateway (simple passthrough)
✅ **WebSocket Server**: Direct browser connections (NO conference server)
✅ **Browser Playback**: Real-time audio in web page
✅ **Complete Infrastructure**: All components except translation logic

### What This Does NOT Test

❌ Speech-to-Text (Deepgram)
❌ Translation (DeepL)
❌ Text-to-Speech (ElevenLabs)
❌ Complex processing pipeline

---

## Test Scenario

1. **Call 1001 → 7777**: Audio goes to gateway
2. **Call 1002 → 8888**: Audio goes to gateway
3. **Gateway connects them**: 7777 audio → 8888, and 8888 audio → 7777
4. **Browser listens**: Can hear audio from either channel
5. **Result**: 1001 and 1002 can talk to each other through the gateway

---

## Implementation Approach

### Phase 1: Modify Unified Gateway

**File**: `/tmp/unified-gateway-passthrough.js`

**Replace** the translation processing section with simple passthrough:

```javascript
// OLD (Translation Processing):
async function processAudioChunk(extension, audioChunk) {
  // 1. Transcribe with Deepgram
  const transcript = await deepgram.transcribe(audioChunk);
  // 2. Translate with DeepL
  const translated = await deepl.translate(transcript);
  // 3. Generate speech with ElevenLabs
  const translatedAudio = await elevenlabs.tts(translated);
  // 4. Send to other channel
  sendRTP(otherExtension, translatedAudio);
}

// NEW (Simple Passthrough):
function processAudioChunk(extension, audioChunk) {
  // Just send directly to other channel
  const otherExtension = extension === '7777' ? '8888' : '7777';
  sendRTP(otherExtension, audioChunk);

  // Also send to browser via WebSocket
  broadcastToBrowsers({
    extension: extension,
    audio: audioChunk,
    timestamp: Date.now()
  });
}
```

### Phase 2: WebSocket Server

**Embedded in Gateway** (not separate conference server):

```javascript
const io = socketIO(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
  console.log('Browser connected');

  socket.on('subscribe', (extension) => {
    socket.join(`channel-${extension}`);
  });
});

function broadcastToBrowsers(data) {
  io.to(`channel-${data.extension}`).emit('audio-data', data);
}
```

### Phase 3: RTP Handler

**Bidirectional** (receive AND send):

```javascript
// RECEIVE from Asterisk
udpSocket.on('message', (rtpPacket) => {
  const audioPayload = extractRTPPayload(rtpPacket);
  processAudioChunk(extension, audioPayload);
});

// SEND to Asterisk
function sendRTP(extension, audioPayload) {
  const rtpPacket = createRTPPacket(audioPayload);
  const config = EXTERNAL_MEDIA_CONFIG[extension];
  udpSocket.send(rtpPacket, config.remotePort, config.remoteHost);
}
```

---

## Files Structure

### 1. `/tmp/unified-gateway-passthrough.js`
**Unified Gateway** with:
- ExternalMedia RTP handling (receive + send)
- Simple audio passthrough (no translation)
- Embedded WebSocket server
- Browser audio broadcasting

### 2. `/tmp/unified-monitor.html`
**Web Monitoring Interface** with:
- Connect to gateway WebSocket (port 3002)
- Subscribe to channels (7777, 8888)
- Play audio in real-time
- Visual indicators

---

## Configuration

**Production Settings** (NO CHANGES):
- ✅ Asterisk dialplan (unchanged)
- ✅ ExternalMedia channels (7777/8888)
- ✅ RTP ports (5000/5001)
- ✅ Extensions (unchanged)

**Gateway Settings**:
```javascript
const CONFIG = {
  websocketPort: 3002,  // Browser connections
  extensions: {
    '7777': {
      language: 'en',
      udpPort: 5000,
      remoteHost: '127.0.0.1',  // Asterisk
      remotePort: 5000
    },
    '8888': {
      language: 'fr',
      udpPort: 5001,
      remoteHost: '127.0.0.1',
      remotePort: 5001
    }
  }
};
```

---

## Testing Steps

### Step 1: Stop Production
```bash
ssh azureuser@20.170.155.53
pkill -9 -f 'node gateway-7777-8888.js'
pkill -9 -f 'node conference-server'
ps aux | grep node  # Verify stopped
```

### Step 2: Deploy Test Gateway
```bash
# Upload
scp /tmp/unified-gateway-passthrough.js azureuser@20.170.155.53:/home/azureuser/translation-app/test/

# Start
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app/test/
source ../.env.externalmedia
nohup node unified-gateway-passthrough.js > /tmp/unified-test.log 2>&1 &
```

### Step 3: Verify Gateway
```bash
# Check logs
tail -f /tmp/unified-test.log

# Check health
curl http://20.170.155.53:3002/health
```

### Step 4: Open Web Page
```bash
# On local computer
open /tmp/unified-monitor.html
# OR
cd /tmp && python3 -m http.server 8000
# Then open: http://localhost:8000/unified-monitor.html
```

### Step 5: Make Test Calls
1. **From phone 1001**: Dial **7777**
2. **From phone 1002**: Dial **8888**
3. **Speak**: They should hear each other
4. **Browser**: Should see/hear audio from both channels

---

## Expected Results

✅ **Gateway logs**: Show RTP received from both 7777 and 8888
✅ **Gateway logs**: Show RTP sent to both channels
✅ **Browser**: Shows audio packets counter increasing
✅ **Browser**: Plays audio when "Start Monitoring" is clicked
✅ **Phones**: 1001 and 1002 can hear each other

---

## Success Criteria

**This test is successful if:**
1. Gateway receives RTP from Asterisk ✅
2. Gateway sends RTP back to Asterisk ✅
3. Audio flows: 7777 → 8888 and 8888 → 7777 ✅
4. Browser can hear audio from both channels ✅
5. Phones can communicate through gateway ✅

**Once successful, proceed to:**
- Add Deepgram for transcription
- Add DeepL for translation
- Add ElevenLabs for TTS
- Full translation pipeline

---

## Troubleshooting

### No RTP Received
- Check UDP ports 5000/5001 are open
- Verify ExternalMedia channels created
- Check `externalHost` config matches gateway IP

### No RTP Sent
- Check RTP packet creation
- Verify remote host/port configuration
- Check Asterisk logs for RTP reception

### No Browser Audio
- Check WebSocket connection (port 3002)
- Verify audio-data events being emitted
- Check browser console for errors
- Ensure "Start Monitoring" button clicked

### Calls Not Connected
- Verify both ExternalMedia channels created
- Check gateway routing logic
- Ensure bidirectional RTP flow

---

## Next Steps

After this test succeeds:

1. **Add Deepgram Integration**
   - Initialize Deepgram client
   - Stream audio for transcription
   - Handle real-time transcripts

2. **Add DeepL Translation**
   - Detect source language
   - Translate transcripts
   - Handle language pairs

3. **Add ElevenLabs TTS**
   - Generate speech from translated text
   - Stream audio back to caller
   - Maintain voice quality

4. **Full Integration**
   - Complete translation pipeline
   - Error handling
   - Performance optimization
   - Production deployment

---

## Notes

- This is a **TEST VERSION** - not for production use
- Validates infrastructure before adding complexity
- Uses existing Asterisk configuration (no changes)
- Simple passthrough proves RTP bidirectional flow works
- Once proven, we add translation processing step-by-step
