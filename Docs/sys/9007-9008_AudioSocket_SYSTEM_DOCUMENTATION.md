# 9007-9008 ExternalMedia Translation System Documentation

**Version:** 1.0.0
**Date:** 2025-11-20
**Server:** 20.170.155.53 (Azure VM)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Project Directory Structure](#project-directory-structure)
3. [Core Components](#core-components)
4. [Port Reference](#port-reference)
5. [Startup Sequence](#startup-sequence)
6. [Asterisk Configuration](#asterisk-configuration)
7. [Environment Configuration](#environment-configuration)
8. [Data Flow Architecture](#data-flow-architecture)
9. [API Services](#api-services)
10. [Dashboard Access](#dashboard-access)
11. [Troubleshooting](#troubleshooting)

---

## System Overview

The 9007-9008 system is a real-time translation platform that:
- Receives phone calls on Asterisk extensions 9007 (English) and 9008 (French)
- Captures audio using Asterisk ExternalMedia feature
- Performs Speech-to-Text (STT) using Deepgram
- Translates text using DeepL
- Synthesizes translated speech using ElevenLabs TTS
- Analyzes emotion/prosody using Hume AI
- Displays real-time results on a web dashboard

**Key Technology Stack:**
- Asterisk 20.16.0 with ARI (Asterisk REST Interface)
- Node.js with Socket.IO
- Deepgram (STT), DeepL (Translation), ElevenLabs (TTS), Hume (Emotion)

---

## Project Directory Structure

**Root Directory:** `/home/azureuser/translation-app/STTTTSserver/`

```
STTTTSserver/
├── gateway-9007-9008.js          # MAIN GATEWAY - UDP to Socket.IO bridge
├── conference-server-externalmedia.js  # Main translation server
├── ari-externalmedia-handler.js  # ARI handler (NOT USED - replaced by gateway)
│
├── Service Modules/
│   ├── deepgram-streaming-client.js   # Deepgram STT integration
│   ├── deepl-incremental-mt.js        # DeepL translation
│   ├── elevenlabs-tts-service.js      # ElevenLabs TTS
│   ├── hume-streaming-client.js       # Hume emotion analysis
│   └── hume-evi-adapter.js            # Hume EVI adapter
│
├── public/                             # Dashboard web files
│   ├── dashboard.html                  # Main dashboard
│   └── [other HTML files]
│
├── logs/                               # Runtime logs
├── hmlcp/                              # User profiles
├── package.json                        # NPM dependencies
└── .env.externalmedia                  # Environment variables
```

---

## Core Components

### 1. gateway-9007-9008.js (MAIN GATEWAY)

**Purpose:** Bridge between Asterisk RTP and Conference Server Socket.IO

**Key Configuration:**
```javascript
const ARI_URL = 'http://localhost:8088';
const ARI_USERNAME = 'dev';
const ARI_PASSWORD = 'asterisk';
const ARI_APP_NAME = 'translation-test';
const TRANSLATION_SERVER_URL = 'http://localhost:3002';

const EXTERNAL_MEDIA_CONFIG = {
  '9007': { udpPort: 5000, language: 'en' },
  '9008': { udpPort: 5001, language: 'fr' }
};
```

### 2. conference-server-externalmedia.js (TRANSLATION SERVER)

**Purpose:** Main translation processing server with Deepgram, DeepL, ElevenLabs, Hume

---

## Port Reference

### UDP Ports (Audio)
| Port | Service | Description |
|------|---------|-------------|
| 5000 | gateway-9007-9008.js | RTP audio from Asterisk (ext 9007) |
| 5001 | gateway-9007-9008.js | RTP audio from Asterisk (ext 9008) |

### TCP Ports (Services)
| Port | Service | Description |
|------|---------|-------------|
| 3002 | conference-server-externalmedia.js | Socket.IO + HTTP server |
| 6201 | conference-server-externalmedia.js | TCP API endpoint |
| 8088 | Asterisk ARI | REST API for channel control |

### Audio Format
- **Sample Rate:** 16000 Hz (slin16)
- **Bit Depth:** 16-bit signed linear PCM
- **Frame Size:** 20ms (320 samples per frame)

---

## Startup Sequence

**IMPORTANT:** Start services in this exact order.

### Working Directory
```bash
cd /home/azureuser/translation-app/STTTTSserver
```

### Step 1: Start Conference Server (FIRST)
```bash
node conference-server-externalmedia.js > /tmp/conference-server-externalmedia.log 2>&1 &
```
**Wait for:** "Server listening on port 3002"

### Step 2: Start Gateway (SECOND)
```bash
node gateway-9007-9008.js > /tmp/gateway-9007-9008.log 2>&1 &
```
**Wait for:** "Gateway is READY"

### Verification
```bash
pgrep -af 'conference-server-externalmedia|gateway-9007'
ss -tlnp | grep -E '3002|6201'
ss -ulnp | grep -E '5000|5001'
```

---

## Asterisk Configuration

### Extensions (/etc/asterisk/extensions.conf)
```ini
[externalmedia-test]
exten => 9007,1,NoOp(=== ExternalMedia Test - Extension 9007 ===)
 same => n,Answer()
 same => n,Set(CHANNEL(format)=slin16)
 same => n,Stasis(translation-test,ext9007)
 same => n,Hangup()

exten => 9008,1,NoOp(=== ExternalMedia Test - Extension 9008 ===)
 same => n,Answer()
 same => n,Set(CHANNEL(format)=slin16)
 same => n,Stasis(translation-test,ext9008)
 same => n,Hangup()
```

### Routing
```ini
exten => 9007,1,Goto(externalmedia-test,9007,1)
exten => 9008,1,Goto(externalmedia-test,9008,1)
```

---

## Environment Configuration (.env.externalmedia)

```bash
NODE_ENV=production
TRANSLATION_SERVER_PORT=3002
GATEWAY_RTP_PORT_9007=5000
GATEWAY_RTP_PORT_9008=5001
EXT_9007_LANGUAGE=en
EXT_9008_LANGUAGE=fr

# API Keys
DEEPGRAM_API_KEY=<your-key>
DEEPL_API_KEY=<your-key>
ELEVENLABS_API_KEY=<your-key>
HUME_EVI_API_KEY=<your-key>
ELEVENLABS_DEFAULT_VOICE_ID=<voice-id>

# ARI
ASTERISK_HOST=localhost
ASTERISK_ARI_PORT=8088
ASTERISK_ARI_USERNAME=dev
ASTERISK_ARI_PASSWORD=asterisk
```

---

## Data Flow Architecture

```
Phone Call (9007/9008)
        ↓
   ASTERISK (slin16)
        ↓ RTP (UDP 5000/5001)
gateway-9007-9008.js
        ↓ Socket.IO (port 3002)
conference-server-externalmedia.js
   ┌────┼────┐
Deepgram DeepL ElevenLabs
   STT   Translate  TTS
        ↓
   Dashboard (port 3002)
```

---

## Dashboard Access

**Main Dashboard:** http://20.170.155.53:3002/dashboard.html

---

## Troubleshooting

### No audio reaching dashboard
```bash
pgrep -af gateway-9007-9008
ss -ulnp | grep -E '5000|5001'
tail -50 /tmp/gateway-9007-9008.log
```
**Solution:** Use gateway-9007-9008.js (NOT ari-externalmedia-handler.js)

### ARI connection failed
```bash
sudo asterisk -rx "ari show status"
curl -u dev:asterisk http://localhost:8088/ari/asterisk/info
```

### Port already in use
```bash
lsof -i :3002
lsof -i :5000
kill -9 <PID>
```

---

## Dependencies (package.json)

```json
{
  "dependencies": {
    "ari-client": "^2.2.0",
    "socket.io-client": "^4.8.1"
  }
}
```

---

## Important Notes

- **DO NOT USE:** ari-externalmedia-handler.js (incomplete, only cross-patching)
- **ALWAYS USE:** gateway-9007-9008.js for full translation pipeline

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-20
