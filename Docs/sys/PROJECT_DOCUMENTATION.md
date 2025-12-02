# Real-Time Translation System - Project Documentation
**Last Updated**: October 23, 2025
**Status**: OPERATIONAL (Hume AI Dashboard Card Issue)

---

## 🔗 Project Links & Access

### GitHub Repository
- **Repository URL**: https://github.com/sagivst/realtime_translation_enhanced_astrix
- **Main Branch**: main
- **Last Commit**: `55ad131 first commit`

### Azure Resources

#### Virtual Machine
- **VM Name**: `asterisk-translation-vm`
- **Resource Group**: `REALTIME-TRANSLATION-RG`
- **Public IP**: `4.185.84.26`
- **Location**: (Azure region - to be confirmed)
- **OS**: Linux (Ubuntu/Debian)
- **SSH Access**: `ssh azureuser@4.185.84.26`

#### Azure Web Apps (Historical/Alternative Deployments)
- **App Name**: `realtime-translation-enhanced`
- **Resource Group**: `realtime-translation-rg`
- **URL**: `https://realtime-translation-enhanced.azurewebsites.net`
- **Other Apps**:
  - `realtime-translation-1760218638`
  - `realtime-translation-sagiv`

---

## 📁 Project Structure & Paths

### Server Paths
```
Server Hostname: asterisk-translation-vm
User: azureuser
Home Directory: /home/azureuser
Project Root: /home/azureuser/translation-app/
```

### Key Directories
```
/home/azureuser/translation-app/
├── conference-server.js          # Main server entry point
├── audiosocket-integration.js    # AudioSocket pipeline (Asterisk integration)
├── hume-streaming-client.js      # Hume AI emotion detection client
├── asr-streaming-worker.js       # Deepgram ASR worker
├── deepl-incremental-mt.js       # DeepL translation service
├── elevenlabs-tts-service.js     # ElevenLabs TTS service
├── audiosocket-orchestrator.js   # AudioSocket connection manager
├── .env                          # API keys and configuration
├── package.json                  # Node.js dependencies
├── public/                       # Static files
│   ├── dashboard.html           # Main monitoring dashboard
│   ├── index.html               # Landing page
│   ├── test-*.html              # Test pages
│   └── css/                     # Stylesheets
└── recordings/                   # Call recordings storage
```

### Important Files & Their Purpose

#### Core Backend Files
- **conference-server.js** (port:6029)
  - Main Express/Socket.IO server
  - Serves static files from `public/`
  - Handles WebSocket connections
  - Integrates all services

- **audiosocket-integration.js** (port:5050)
  - TCP server for Asterisk AudioSocket connections
  - Audio pipeline: Asterisk → Deepgram → DeepL → ElevenLabs → Asterisk
  - Integrates Hume AI for emotion detection
  - Forks audio to both ASR and emotion detection

- **hume-streaming-client.js** (port:6029)
  - WebSocket client for Hume AI API
  - Endpoint: `wss://api.hume.ai/v0/stream/models`
  - Sends raw base64-encoded PCM audio (16kHz, mono)
  - Emits emotion metrics via Socket.IO

#### Frontend Files
- **dashboard.html** (2934 lines)
  - Real-time monitoring dashboard
  - Displays 5 service cards (Asterisk, Deepgram, DeepL, ElevenLabs, Hume AI)
  - Socket.IO client for real-time updates
  - Current line count: 2934 lines

---

## 🔑 API Keys & Configuration

### Environment Variables (.env location)
```
File: /home/azureuser/translation-app/.env
Permissions: -rw-rw-r-- (664)
Owner: azureuser:azureuser
Size: 563 bytes
Last Modified: Oct 23 09:54
```

### Configured API Keys
```bash
DEEPGRAM_API_KEY=806ac77eb08d83390c265228dd2cc89c0b86f23e
DEEPL_API_KEY=672097f6-2818-4022-be20-6f7118e12143:fx
ELEVENLABS_API_KEY=sk_968d6d3e5b92cfce648ce9a38478ee131d98750ef4e09f05
HUME_EVI_API_KEY=Szh6bXYANi4mVs7G3IXwnYfA4NSQNI7Zu0wuwQEKVQWJemXG
```

### Service Documentation
- **Deepgram**: https://developers.deepgram.com/
- **DeepL**: https://www.deepl.com/docs-api
- **ElevenLabs**: https://elevenlabs.io/docs/api-reference
- **Hume AI**: https://dev.hume.ai/docs

---

## 🌐 Application URLs & Endpoints

### Public URLs
```
Main Application: http://4.185.84.26:3000
Dashboard: http://4.185.84.26:3000/dashboard.html
Landing Page: http://4.185.84.26:3000/
Test Pages: http://4.185.84.26:3000/test-*.html
```

### Internal Endpoints
```
HTTP Server: http://localhost:3000 (Express)
Socket.IO: ws://localhost:3000 (WebSocket)
AudioSocket: tcp://localhost:5050 (Asterisk connection)
WebSocket PCM: ws://localhost:5051/mic/<ID>/slin16
```

### Asterisk Integration
```
AudioSocket Extension: 5000 (calls go through translation)
Direct Extension: 6000 (bypass translation)
WebSocket Extension: 7000 (browser microphone)
```

---

## 🏗️ System Architecture

### Audio Pipeline Flow
```
┌─────────────┐
│  Asterisk   │ Phone call audio (8kHz ULAW)
│   PBX       │
└──────┬──────┘
       │ AudioSocket Protocol (TCP:5050)
       │ Converts to 16kHz PCM
       ▼
┌─────────────────────────────────┐
│  AudioSocket Integration        │
│  (audiosocket-integration.js)   │
└─────┬───────────────────────┬───┘
      │                       │
      │ Audio Fork            │
      │                       │
      ▼                       ▼
┌──────────────┐      ┌──────────────┐
│  Deepgram    │      │  Hume AI     │
│  (STT)       │      │  (Emotion)   │
└──────┬───────┘      └──────────────┘
       │
       ▼
┌──────────────┐
│  DeepL       │
│  (Translate) │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ ElevenLabs   │
│   (TTS)      │
└──────┬───────┘
       │ PCM Audio (16kHz → 8kHz)
       ▼
┌──────────────┐
│  Asterisk    │ Translated audio
└──────────────┘
```

### Service Status
```
✅ Asterisk AudioSocket: OPERATIONAL
✅ Deepgram STT: OPERATIONAL
✅ DeepL Translation: OPERATIONAL
✅ ElevenLabs TTS: OPERATIONAL
⚠️  Hume AI Backend: INTEGRATED (card not displaying)
❌ Azure TTS: NOT CONFIGURED
```

---

## 📦 Backup Files & Versions

### Dashboard Backups
```
Current Version:
- dashboard.html (2934 lines) - Audio components removed from Hume card

Available Backups:
- dashboard.html.with-audio-restored (2950 lines) - Full working version
- dashboard.html.backup-before-hume-cleanup (2950 lines)
- dashboard.html.broken-cleanup (2709 lines) - DO NOT USE
- dashboard.html.backup-before-hume-card-20251023-161135
- dashboard.html.backup-temp
```

### Backend Backups
```
audiosocket-integration.js Backups:
- audiosocket-integration.js.backup-audio-fork (19K, Oct 23 18:18) - WITH Hume
- audiosocket-integration.js.backup-pre-hume (17K, Oct 23 18:04) - WITHOUT Hume
- audiosocket-integration.js.backup-before-debug

hume-streaming-client.js Backups:
- /tmp/hume-streaming-client-fixed.js (6.3K) - Fixed raw base64 sending
- /tmp/hume-streaming-client.js (5.4K) - Original JSON-wrapped version
```

---

## 🐛 Current Issues & Known Problems

### Issue #1: Hume AI Dashboard Card Not Displaying
**Status**: UNRESOLVED
**Severity**: Medium (Backend works, UI doesn't)

**Problem**:
- Hume AI card (Card 5) present in HTML but not rendering in browser
- Audio components successfully removed from card HTML
- File is complete (2934 lines, proper closing tags)
- No JavaScript errors detected

**What Works**:
- ✅ Backend Hume integration (audiosocket-integration.js:line6029)
- ✅ Hume client (hume-streaming-client.js) - sends raw base64 audio
- ✅ API key loaded: Server logs show `[Pipeline] Hume AI: ✓`
- ✅ Socket.IO event handler ready (`emotion_detected`)
- ✅ HTML structure correct (verified via grep/sed)

**What Doesn't Work**:
- ❌ Card #5 not visible in browser
- ❌ May be rendering issue, CSS, or JavaScript problem
- ❌ User has refreshed/hard refreshed browser

**Attempted Fixes**:
1. Removed audio visualization components from Hume card
2. Removed JavaScript audio functions (visualizeHumeAudio)
3. Updated activity indicator text
4. Multiple file restores from backups
5. Verified file integrity (proper HTML structure)

**Next Steps to Try**:
- Option 1: Test backend Hume via server logs (skip UI for now)
- Option 2: Add simple text-only status indicator
- Option 3: Fresh rebuild of dashboard from backup
- Option 4: Accept current state, focus on backend verification

---

## 🔧 Server Management Commands

### Server Control
```bash
# SSH into server
ssh azureuser@4.185.84.26

# Check server status
ps aux | grep 'node.*conference-server'

# View logs
tail -f /tmp/conference-server.log
tail -f /tmp/conference-server.log | grep -i hume

# Restart server (as azureuser, NOT root)
killall -9 node
cd /home/azureuser/translation-app
nohup node conference-server.js > /tmp/conference-server.log 2>&1 &

# Restart server and check logs
killall -9 node && sleep 2 && cd /home/azureuser/translation-app && nohup node conference-server.js > /tmp/conference-server.log 2>&1 & sleep 3 && tail -30 /tmp/conference-server.log
```

### File Management
```bash
# Check file versions
ls -lht /home/azureuser/translation-app/public/dashboard.html*
wc -l /home/azureuser/translation-app/public/dashboard.html

# Restore from backup
cd /home/azureuser/translation-app/public
cp dashboard.html.with-audio-restored dashboard.html

# Check audiosocket integration
grep -n 'humeWorker' /home/azureuser/translation-app/audiosocket-integration.js

# Verify .env file
cat /home/azureuser/translation-app/.env
```

### Testing
```bash
# Test Hume connection
curl -s http://4.185.84.26:3000/dashboard.html | grep -i "hume"

# Check for Hume in logs
ssh azureuser@4.185.84.26 "grep -i hume /tmp/conference-server.log | tail -20"

# Monitor for Hume events during call
ssh azureuser@4.185.84.26 "tail -f /tmp/conference-server.log | grep --line-buffered -i 'hume\|emotion'"
```

---

## 📚 Technical Specifications

### Audio Formats
```
Asterisk Input: 8kHz, ULAW (μ-law)
Processing: 16kHz, PCM16, Mono
Deepgram Input: 16kHz, PCM16
Hume AI Input: 16kHz, PCM16, Base64-encoded
ElevenLabs Output: 16kHz, PCM16 → Downsampled to 8kHz
Asterisk Output: 8kHz, PCM16
```

### Network Ports
```
3000: HTTP/WebSocket Server (Express + Socket.IO)
5050: AudioSocket TCP Server (Asterisk connection)
5051: WebSocket PCM Server (Browser microphone)
```

### Dependencies (package.json)
```json
{
  "name": "realtime-translation-app",
  "version": "1.0.0",
  "main": "conference-server.js",
  "dependencies": {
    "express": "^4.x",
    "socket.io": "^4.x",
    "ws": "^8.x",
    "dotenv": "^16.x"
  }
}
```

---

## 📝 Notes & Best Practices

### Important Reminders
1. **Always run server as `azureuser`, NEVER as root**
   - Root won't load the .env file with API keys
   - Use: `nohup node conference-server.js` (not `sudo`)

2. **Backend file locations matter**
   - audiosocket-integration.js must have correct Hume references (14 occurrences)
   - hume-streaming-client.js must send RAW base64, not JSON-wrapped

3. **Dashboard file integrity**
   - Current: 2934 lines
   - Full working: 2950 lines
   - If <2900 lines, file is truncated

4. **Hume AI specific notes**
   - Hume initializes on FIRST audio frame from Asterisk call
   - Connection: `wss://api.hume.ai/v0/stream/models?apikey=...`
   - Audio sent as raw base64 string (not JSON after initial config)
   - Config sent once on connect, then only audio frames

---

## 🔄 Rollback Procedures

### Quick Rollback to Working State (No Hume)
```bash
ssh azureuser@4.185.84.26
cd /home/azureuser/translation-app

# Restore backend without Hume
sudo cp audiosocket-integration.js.backup-pre-hume audiosocket-integration.js

# Restore dashboard
cp public/dashboard.html.backup-before-hume-card-20251023-161135 public/dashboard.html

# Restart server
killall -9 node && sleep 2 && nohup node conference-server.js > /tmp/conference-server.log 2>&1 &
```

### Restore Working Dashboard with Hume Backend
```bash
# Keep Hume backend, restore full dashboard
cp public/dashboard.html.with-audio-restored public/dashboard.html
```

---

## 📧 Contact & Support

**Project Owner**: Sagiv Stavinsky
**GitHub Username**: sagivst
**Repository Issues**: https://github.com/sagivst/realtime_translation_enhanced_astrix/issues

---

## 📅 Version History

### Current Session (Oct 23, 2025)
- ✅ Fixed audiosocket-integration.js syntax error
- ✅ Fixed hume-streaming-client.js to send raw base64
- ✅ Updated Hume API key loading
- ✅ Removed audio components from Hume dashboard card
- ⚠️ Hume card still not displaying in browser (investigation ongoing)

### Previous State
- ✅ Full translation pipeline working (Asterisk → Deepgram → DeepL → ElevenLabs)
- ✅ Dashboard operational with 4 service cards
- ❌ Hume AI not integrated

---

*End of Documentation*
