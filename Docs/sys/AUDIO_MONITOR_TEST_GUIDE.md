# Audio Monitor Test Guide
**Date**: 2025-11-16
**Purpose**: Validate audio path before adding translation processing

---

## Overview

This is a **simplified test system** to verify the audio routing infrastructure works correctly before we add the complex translation pipeline.

### Architecture

```
Asterisk ExternalMedia (7777/8888)
    ↓ UDP RTP (PT=118, 640 bytes, 16kHz PCM16)
Gateway Test Server (gateway-audio-monitor-TEST.js)
    ↓ WebSocket (Socket.IO, port 8080)
Web Browser (audio-monitor.html)
    → Plays audio in real-time using Web Audio API
```

### What This Tests

✅ RTP packet reception from Asterisk
✅ Audio payload extraction
✅ WebSocket streaming to browser
✅ Real-time audio playback
✅ Basic infrastructure before adding STT/Translation/TTS

---

## Files Created

### 1. `/tmp/gateway-audio-monitor-TEST.js` (390 lines)
**Simple Gateway Server** that:
- Creates ExternalMedia channels for 7777 and 8888
- Receives RTP audio on UDP ports 5000/5001
- Extracts PCM16 audio from RTP packets
- Broadcasts audio to WebSocket clients
- Provides health check endpoint

### 2. `/tmp/audio-monitor.html` (495 lines)
**Web Monitoring Interface** that:
- Connects to gateway via WebSocket
- Displays two channels (7777/8888)
- Shows real-time statistics (packets, bytes)
- Plays audio using Web Audio API
- Visual volume meters and activity indicators

---

## Installation Steps

### Step 1: Stop Production Services

```bash
ssh azureuser@20.170.155.53

# Stop current gateway and conference server
pkill -9 -f "node gateway-7777-8888.js"
pkill -9 -f "node conference-server-externalmedia.js"

# Verify stopped
ps aux | grep "node.*7777-8888\|conference-server" | grep -v grep
```

### Step 2: Upload Test Files

```bash
# From local machine:
scp /tmp/gateway-audio-monitor-TEST.js azureuser@20.170.155.53:/home/azureuser/translation-app/7777-8888-stack/
scp /tmp/audio-monitor.html azureuser@20.170.155.53:/home/azureuser/translation-app/7777-8888-stack/
```

### Step 3: Start Test Gateway

```bash
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app/7777-8888-stack

# Load environment variables
source .env.externalmedia

# Start test gateway
nohup node gateway-audio-monitor-TEST.js > /tmp/audio-monitor-TEST.log 2>&1 &
echo "Gateway PID: $!"

# Monitor logs
tail -f /tmp/audio-monitor-TEST.log
```

### Step 4: Expected Startup Logs

```
================================================================================
AUDIO MONITORING GATEWAY - TEST VERSION
================================================================================
Purpose: Validate audio path before adding translation processing

Architecture:
  Asterisk ExternalMedia (7777/8888)
    ↓ UDP RTP
  Gateway (this)
    ↓ WebSocket
  Browser (monitor.html)
================================================================================

[WebSocket] ✅ Server listening on port 8080
[WebSocket] Health check: http://localhost:8080/health
[UDP] ✅ Listening on 0.0.0.0:5000 for ext 7777 (English Channel)
[UDP] ✅ Listening on 0.0.0.0:5001 for ext 8888 (French Channel)
[ARI] Connecting to Asterisk ARI...
[ARI] URL: http://localhost:8088
[ARI] App: translation-app
[ARI] ✅ Connected to Asterisk ARI
[ARI] ✅ Application 'translation-app' started
[ExternalMedia] Creating channel for ext 7777 (English Channel)...
[ExternalMedia] ✅ Channel created: ... for ext 7777
[ExternalMedia] ✅ Channel answered for ext 7777
[ExternalMedia] Creating channel for ext 8888 (French Channel)...
[ExternalMedia] ✅ Channel created: ... for ext 8888
[ExternalMedia] ✅ Channel answered for ext 8888

================================================================================
✅ GATEWAY READY
================================================================================
WebSocket Server: http://localhost:8080
Health Check: http://localhost:8080/health

Next Step: Open monitor.html in browser to hear audio
================================================================================
```

### Step 5: Setup Web Page Access

**Option A: Open from Server (if desktop environment)**
```bash
# If server has desktop/browser
firefox /home/azureuser/translation-app/7777-8888-stack/audio-monitor.html
```

**Option B: Download to Local Machine**
```bash
# From local machine
scp azureuser@20.170.155.53:/home/azureuser/translation-app/7777-8888-stack/audio-monitor.html ~/Downloads/

# Then open in browser:
# - Edit the HTML file
# - Change line: const serverUrl = 'http://20.170.155.53:8080';
# - To your actual server IP
# - Open the file in browser
```

**Option C: Serve via HTTP**
```bash
# On server, create simple HTTP server
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app/7777-8888-stack

# Python 3
python3 -m http.server 9000

# Then access from browser:
# http://20.170.155.53:9000/audio-monitor.html
```

---

## Testing Procedure

### Test 1: Verify Gateway Health

```bash
# From server or local machine
curl http://20.170.155.53:8080/health

# Expected response:
{
  "status": "ok",
  "connectedClients": 0,
  "stats": {
    "7777": {"packetsReceived": 0, "bytesReceived": 0},
    "8888": {"packetsReceived": 0, "bytesReceived": 0}
  }
}
```

### Test 2: Open Web Interface

1. Open `audio-monitor.html` in browser
2. Click **Connect** button
3. Should see:
   - Status change to "Connected to Gateway"
   - Green status indicator
   - Log entry: "Connected to gateway!"
   - Play buttons become enabled

### Test 3: Make Test Call

```bash
# Call extension 7777 (English) from any SIP client
# OR
# Call extension 8888 (French) from any SIP client
```

### Test 4: Monitor Audio in Browser

1. **Click "▶️ Start Monitoring" for channel 7777**
2. **Speak into the phone**
3. **Expected behavior**:
   - Statistics update (packets, bytes increase)
   - Activity indicator flashes green
   - Volume meter shows audio level
   - **YOU SHOULD HEAR THE AUDIO** in your browser
   - Log shows: "Started monitoring 7777"

4. **Repeat for channel 8888** (French)

### Test 5: Verify Two-Way Audio Path

**Test A: 7777 → Browser**
1. Call extension 7777
2. Start monitoring 7777 in browser
3. Speak in English
4. Should hear your voice in browser

**Test B: 8888 → Browser**
1. Call extension 8888
2. Start monitoring 8888 in browser
3. Speak in French (or any language)
4. Should hear your voice in browser

---

## Success Criteria

✅ Gateway starts without errors
✅ WebSocket server binds to port 8080
✅ UDP sockets bind to ports 5000/5001
✅ ExternalMedia channels created for both extensions
✅ Browser connects to WebSocket
✅ RTP packets received from Asterisk
✅ Statistics update in real-time
✅ **Audio plays in browser** (most important!)

---

## Troubleshooting

### Problem: No audio in browser

**Check 1: Browser permissions**
- Browser may block audio autoplay
- Click anywhere on page to allow audio
- Check browser console for errors

**Check 2: WebSocket connection**
- Check status indicator is green
- Check browser console for WebSocket errors
- Verify server IP is correct in HTML file

**Check 3: RTP packets received**
```bash
# Check gateway logs
tail -f /tmp/audio-monitor-TEST.log

# Should see:
[UDP] [7777] Received 100 packets, 64000 bytes
```

### Problem: WebSocket won't connect

**Check firewall**
```bash
# On server
sudo ufw status
sudo ufw allow 8080/tcp

# Or Azure NSG
az network nsg rule create \
  --resource-group <resource-group> \
  --nsg-name <nsg-name> \
  --name Allow-WebSocket \
  --priority 1010 \
  --destination-port-ranges 8080 \
  --access Allow \
  --protocol Tcp
```

### Problem: No RTP packets received

**Check ExternalMedia channels**
```bash
# Asterisk CLI
asterisk -rx "core show channels"

# Should see ExternalMedia channels for 7777 and 8888
```

---

## What This Proves

If this test works, we know:

1. ✅ **RTP reception works** - Gateway receives audio from Asterisk
2. ✅ **Audio extraction works** - Can extract PCM from RTP packets
3. ✅ **WebSocket works** - Can stream audio to browser
4. ✅ **Audio format is correct** - Browser can play PCM16 at 16kHz
5. ✅ **Infrastructure is solid** - Ready to add translation processing

---

## Next Steps After Successful Test

Once audio monitoring works:

### Step 1: Document Success
- Note any issues encountered
- Verify audio quality is good
- Confirm latency is acceptable

### Step 2: Restore Production
```bash
# Stop test gateway
pkill -9 -f "node gateway-audio-monitor-TEST.js"

# Restart production
cd /home/azureuser/translation-app/7777-8888-stack
nohup node gateway-7777-8888.js > /tmp/gateway-RESTORED.log 2>&1 &
nohup node conference-server-externalmedia.js > /tmp/conference-RESTORED.log 2>&1 &
```

### Step 3: Add Translation Processing
Now we can confidently add:
- Deepgram STT (transcribe the audio we're hearing)
- DeepL Translation (translate the transcribed text)
- ElevenLabs TTS (synthesize translated audio)

Because we know the audio path works!

---

## File Locations

```
Remote Server:
/home/azureuser/translation-app/7777-8888-stack/
├── gateway-audio-monitor-TEST.js     (Test gateway)
├── audio-monitor.html                 (Web interface)
├── .env.externalmedia                 (Environment vars)
└── node_modules/                      (Dependencies)

Logs:
/tmp/audio-monitor-TEST.log            (Gateway logs)

Local Machine:
/tmp/gateway-audio-monitor-TEST.js     (Backup)
/tmp/audio-monitor.html                (Backup)
/tmp/AUDIO_MONITOR_TEST_GUIDE.md       (This file)
/Users/sagivstavinsky/realtime-translation-enhanced_astrix/docs/sys/AUDIO_MONITOR_TEST_GUIDE.md
```

---

## Key Features of Web Interface

### Real-Time Statistics
- Packets received counter
- Data received (KB)
- Updates every packet

### Visual Indicators
- **Status Dot**: Green (connected) / Red (disconnected)
- **Activity Bar**: Flashes when audio received
- **Volume Meter**: Shows audio amplitude (0-100%)
- **Play Buttons**: Start/stop monitoring per channel

### Channel Display
- **7777**: 🇺🇸 English Channel (blue)
- **8888**: 🇫🇷 French Channel (purple)

### Controls
- **Connect/Disconnect**: WebSocket connection
- **Start/Stop Monitoring**: Enable audio playback per channel
- **Clear Log**: Clear event log

---

**Version**: 1.0
**Status**: Ready for testing
**Estimated Test Time**: 10-15 minutes
