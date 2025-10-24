# Real-Time Translation System - Project Documentation
**Document Version:** 2025-10-24
**Last Updated:** October 24, 2025
**System Status:** Operational - Checkpoint Restored

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Server Access & Credentials](#server-access--credentials)
3. [API Keys & Service Credentials](#api-keys--service-credentials)
4. [GitHub Repository](#github-repository)
5. [Current System State](#current-system-state)
6. [Checkpoint & Rollback Information](#checkpoint--rollback-information)
7. [Architecture & Components](#architecture--components)
8. [Recent Work & Task Status](#recent-work--task-status)
9. [Deployment Instructions](#deployment-instructions)
10. [Troubleshooting](#troubleshooting)

---

## System Overview

**Project Name:** Real-Time Translation Enhanced with Asterisk Integration
**Purpose:** AI-powered real-time speech translation system with emotion detection
**Primary Use Case:** Multi-language conference translation with emotional tone preservation

**Technology Stack:**
- Node.js backend
- Asterisk PBX integration via AudioSocket
- Deepgram for Speech-to-Text (STT)
- DeepL for Machine Translation (MT)
- ElevenLabs for Text-to-Speech (TTS)
- Hume AI for Emotion Detection
- Socket.IO for real-time communication

---

## Server Access & Credentials

### Azure Virtual Machine
- **Public IP:** `4.185.84.26`
- **Internal IP:** `10.0.0.4`
- **SSH Access:** `ssh azureuser@4.185.84.26`
- **SSH Key Location:** `~/.ssh/github_ed25519` (on server)
- **SSH Key Fingerprint:** `SHA256:oeJifHDdii3RJ2Sw9ilW39R2EisDDfD0x9QL0C01IzI`

### Application Directories
- **Main App:** `/home/azureuser/translation-app`
- **Logs:** `/tmp/conference-server.log`
- **Documentation:** `/home/azureuser/translation-app/docs`

### Server URLs
- **Main Dashboard:** `http://4.185.84.26:3000/dashboard.html`
- **Monitoring Dashboard:** `http://4.185.84.26:3000/monitoring-dashboard.html`
- **Health Check:** `http://4.185.84.26:3000/health`

### Ports
- **3000:** Main HTTP server (conference-server.js)
- **5050:** AudioSocket TCP server (Asterisk connection)
- **5051:** WebSocket server (real-time audio streaming)

---

## API Keys & Service Credentials

### Deepgram (Speech-to-Text)
```
DEEPGRAM_API_KEY=806ac77eb08d83390c265228dd2cc89c0b86f23e
```
- **Dashboard:** https://console.deepgram.com
- **Model:** Nova-2 with streaming support
- **Languages:** en (English), ja (Japanese)

### DeepL (Machine Translation)
```
DEEPL_API_KEY=672097f6-2818-4022-be20-6f7118e12143:fx
```
- **Dashboard:** https://www.deepl.com/pro-account
- **API Type:** Free tier
- **Translation:** English ↔ Japanese

### ElevenLabs (Text-to-Speech)
```
ELEVENLABS_API_KEY=sk_968d6d3e5b92cfce648ce9a38478ee131d98750ef4e09f05
ELEVENLABS_DEFAULT_VOICE_ID=XPwQNE5RX9Rdhyx0DWcI  # Boyan_Tiholov
```
- **Dashboard:** https://elevenlabs.io/app
- **Voice Model:** Multilingual v2
- **Output Format:** PCM 16kHz → downsampled to 8kHz for Asterisk

### Hume AI (Emotion Detection)
```
HUME_EVI_API_KEY=Szh6bXYANi4mVs7G3IXwnYfA4NSQNI7Zu0wuwQEKVQWJemXG
```
- **Dashboard:** https://platform.hume.ai
- **Model:** Expression Measurement API
- **Metrics:** Arousal, Valence, Energy

---

## GitHub Repository

### Repository Information
- **URL:** `https://github.com/sagivst/realtime_translation_enhanced_astrix`
- **SSH URL:** `git@github.com:sagivst/realtime_translation_enhanced_astrix.git`
- **Branch:** `master`
- **Latest Commit:** `de0a9b0`
- **Commit Message:** Restore to working checkpoint with Hume AI emotion detection

### SSH Deploy Key
**Public Key (already added to GitHub):**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDtJSvdMWj7o4I9MTrFgLZBTTEa3czRPfpb8+s6Qlxnl azure-translation-app
```

**Key Location on Server:**
- Private: `/home/azureuser/.ssh/github_ed25519`
- Public: `/home/azureuser/.ssh/github_ed25519.pub`

### Git Configuration
```bash
# SSH config at ~/.ssh/config
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_ed25519
  IdentitiesOnly yes
```

---

## Current System State

### Services Status
✓ **Deepgram STT** - Operational
✓ **DeepL Translation** - Operational  
✓ **ElevenLabs TTS** - Operational
✓ **Hume AI Emotion Detection** - Operational
✓ **AudioSocket Server** - Listening on port 5050
✓ **WebSocket Server** - Listening on port 5051
✓ **Socket.IO** - Connected and broadcasting
✓ **HMLCP System** - Initialized (auto-save every 5 min)

### Server Process
```bash
# Check server status
ps aux | grep 'node conference-server'

# View logs
tail -f /tmp/conference-server.log

# Restart server
cd /home/azureuser/translation-app
killall -9 node
nohup node conference-server.js > /tmp/conference-server.log 2>&1 &
```

### What's Included in Current Commit (de0a9b0)
- **Core Files:**
  - `audiosocket-integration.js` - AudioSocket orchestrator integration
  - `hume-streaming-client.js` - Hume AI emotion detection client
  - `elevenlabs-tts-service.js` - ElevenLabs TTS with emotion mapping
  - `conference-server.js` - Main server with all services
  - `asr-streaming-worker.js` - Deepgram streaming ASR
  - `deepl-incremental-mt.js` - DeepL translation service
  - `audiosocket-orchestrator.js` - AudioSocket protocol handler

- **Dashboard Files:**
  - `public/dashboard.html` - Main monitoring dashboard
  - `public/monitoring-dashboard.html` - System metrics dashboard

- **Checkpoint Files (for rollback):**
  - `audiosocket-integration.js.CHECKPOINT-before-emotion-tts-20251024-021231`
  - `hume-streaming-client.js.CHECKPOINT-before-emotion-tts-20251024-021231`
  - `elevenlabs-tts-service.js.CHECKPOINT-before-emotion-tts-20251024-021231`

---

## Checkpoint & Rollback Information

### Current Checkpoint
**Name:** `CHECKPOINT-before-emotion-tts-20251024-021231`
**Date:** October 24, 2025 at 02:12:31
**Description:** Last known working state with Hume AI emotion detection operational

### Checkpoint Files Location
All checkpoint files are in: `/home/azureuser/translation-app/`

### How to Rollback
```bash
cd /home/azureuser/translation-app

# Stop server
killall -9 node

# Restore checkpoint files
cp audiosocket-integration.js.CHECKPOINT-before-emotion-tts-20251024-021231 audiosocket-integration.js
cp hume-streaming-client.js.CHECKPOINT-before-emotion-tts-20251024-021231 hume-streaming-client.js
cp elevenlabs-tts-service.js.CHECKPOINT-before-emotion-tts-20251024-021231 elevenlabs-tts-service.js

# Restart server
nohup node conference-server.js > /tmp/conference-server.log 2>&1 &
```

### Previous Checkpoints
- `CHECKPOINT-before-buffering-20251024-015029` - Before audio buffering changes

---

## Architecture & Components

### Audio Pipeline Flow
```
Asterisk (SIP/PJSIP) 
    ↓ AudioSocket (port 5050)
    ↓ 16kHz PCM audio
AudioSocket Orchestrator
    ↓
    ├→ Deepgram STT (streaming)
    ├→ Hume AI Emotion Detection
    ↓
DeepL Translation (en → ja)
    ↓
ElevenLabs TTS (with emotion mapping)
    ↓ PCM audio (16kHz → 8kHz downsampled)
    ↓ AudioSocket response
Asterisk → SIP Endpoint
```

### Key Components

**1. AudioSocket Integration (`audiosocket-integration.js`)**
- Handles TCP connection from Asterisk
- Manages audio frame processing
- Coordinates all AI services
- Implements 3-byte header protocol

**2. ASR Worker (`asr-streaming-worker.js`)**
- Deepgram WebSocket streaming
- Partial and final transcript handling
- Keepalive management
- Language detection

**3. Translation Service (`deepl-incremental-mt.js`)**
- DeepL API integration
- Incremental translation support
- Language pair management

**4. TTS Service (`elevenlabs-tts-service.js`)**
- ElevenLabs streaming TTS
- Emotion-to-voice parameter mapping
- PCM audio generation
- Sample rate conversion

**5. Hume AI Client (`hume-streaming-client.js`)**
- WebSocket connection to Hume Expression Measurement API
- Real-time emotion metrics (arousal, valence, energy)
- Emotion data caching and freshness tracking

**6. Conference Server (`conference-server.js`)**
- Main HTTP server
- Socket.IO real-time communication
- Dashboard endpoints
- Health check endpoints
- HMLCP system integration

---

## Recent Work & Task Status

### Last Task: Live Status Indicator for Hume AI → ElevenLabs
**Status:** ❌ NOT COMPLETED (rolled back due to breaking changes)

**What Was Attempted:**
- Added Socket.IO event emission for Hume → ElevenLabs emotion data flow
- Created dashboard UI components showing:
  - Live emotion badge (arousal, valence, energy)
  - Status indicator for emotion data freshness
  - Voice parameter display (stability, similarity_boost)

**What Went Wrong:**
- Variable naming conflicts (`io` vs `socketIO`)
- Caused `ReferenceError: deepgramApiKey is not defined`
- Server crashed when Asterisk connected

**Resolution:**
- Rolled back to CHECKPOINT-before-emotion-tts-20251024-021231
- System restored to working state
- Dashboard changes not included in current version

### What Works Now (Post-Rollback)
✓ Hume AI emotion detection operational
✓ All translation pipeline components working
✓ AudioSocket communication stable
✓ Real-time transcription and translation
✓ Socket.IO broadcasting basic events

### What Still Needs Work
❌ Live Hume → ElevenLabs status indicator on dashboard
❌ Real-time emotion metric display
❌ Voice parameter visualization
❌ Emotion data freshness indicators

---

## Deployment Instructions

### First-Time Setup
```bash
# 1. Clone repository
git clone git@github.com:sagivst/realtime_translation_enhanced_astrix.git
cd realtime_translation_enhanced_astrix

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Edit .env with API keys (see API Keys section above)

# 4. Start server
node conference-server.js
```

### Update Deployment
```bash
# 1. SSH to server
ssh azureuser@4.185.84.26

# 2. Navigate to app directory
cd /home/azureuser/translation-app

# 3. Stop server
killall -9 node

# 4. Pull latest changes
git pull origin master

# 5. Install any new dependencies
npm install

# 6. Restart server
nohup node conference-server.js > /tmp/conference-server.log 2>&1 &

# 7. Verify
tail -f /tmp/conference-server.log
```

### Environment Variables
Required in `.env`:
```bash
DEEPGRAM_API_KEY=<your_key>
DEEPL_API_KEY=<your_key>
ELEVENLABS_API_KEY=<your_key>
HUME_EVI_API_KEY=<your_key>
ELEVENLABS_DEFAULT_VOICE_ID=<voice_id>
PORT=3000
```

---

## Troubleshooting

### Server Won't Start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Check logs for errors
tail -100 /tmp/conference-server.log

# Verify Node.js version
node --version  # Should be v14 or higher

# Check environment variables
cd /home/azureuser/translation-app
cat .env | grep API_KEY
```

### Asterisk Connection Issues
```bash
# Check if AudioSocket port is listening
netstat -an | grep 5050

# Test TCP connection
nc -zv localhost 5050

# Check AudioSocket logs
tail -f /tmp/conference-server.log | grep AudioSocket
```

### API Service Failures
```bash
# Test Deepgram
curl -H Authorization: Token 806ac77eb08d83390c265228dd2cc89c0b86f23e   https://api.deepgram.com/v1/listen

# Test DeepL
curl -X POST https://api-free.deepl.com/v2/translate   -d auth_key=672097f6-2818-4022-be20-6f7118e12143:fx   -d text=Hello   -d target_lang=JA

# Test ElevenLabs
curl -X GET https://api.elevenlabs.io/v1/voices   -H xi-api-key: sk_968d6d3e5b92cfce648ce9a38478ee131d98750ef4e09f05
```

### Rollback to Checkpoint
If system is unstable, use rollback procedure in [Checkpoint & Rollback Information](#checkpoint--rollback-information) section.

---

## Maintenance Notes

### Regular Tasks
- **Daily:** Check /tmp/conference-server.log for errors
- **Weekly:** Verify API key quotas and limits
- **Monthly:** Review and clean up old checkpoint files

### Monitoring
- Dashboard: http://4.185.84.26:3000/monitoring-dashboard.html
- Logs: `tail -f /tmp/conference-server.log`
- Health: `curl http://4.185.84.26:3000/health`

### Backup Strategy
- Git commits serve as code backups
- Checkpoint files for quick rollback
- .env file NOT in git (backup manually)

---

## Contact & Support

**Project Owner:** Sagiv Stavinsky (@sagivst)
**Repository:** https://github.com/sagivst/realtime_translation_enhanced_astrix
**Documentation Location:** /home/azureuser/translation-app/docs/

---

*Document generated on October 24, 2025*
*This is a living document - update after major changes*
