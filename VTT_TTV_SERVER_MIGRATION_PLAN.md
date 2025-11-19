# VTT-TTV-SERVER MIGRATION PLAN
**Voice Translation Technology - Text-To-Voice Server**

**Date**: 2025-11-17 (Updated: 2025-11-18)
**Purpose**: Migrate from simple PCM cross-patch (conf-server-phase1.js) to full-featured AI translation server (conference-server-externalmedia.js) for extensions 5555/6666
**New Name**: VTT-TTV-SERVER

---

## EXECUTIVE SUMMARY

This plan details the migration from the current 338-line simple cross-route conference server to a full-featured translation server with:
- **ASR** (Automatic Speech Recognition via Deepgram)
- **Machine Translation** (DeepL)
- **TTS** (Text-to-Speech via ElevenLabs)
- **Timing Sync** (Bidirectional coordination)
- **Real-time Monitoring Dashboards**

**IMPORTANT**: In VTT-TTV-SERVER, audio cross-patch happens **AFTER** the full AI pipeline processes the audio. This is NOT a simple pass-through like Phase 1.

**Migration Strategy**: Phased approach preserving the ability to test with AI pipeline disabled initially.

---

## CRITICAL ARCHITECTURE DIFFERENCE

### Phase 1 (Current): Simple Cross-Patch
```
5555 Audio IN → IMMEDIATE → 6666 Audio OUT
6666 Audio IN → IMMEDIATE → 5555 Audio OUT
```

### VTT-TTV-SERVER (Target): AI Pipeline THEN Cross-Patch
```
5555 Audio IN → ASR → Translation → TTS → Timing Sync → 6666 Audio OUT
6666 Audio IN → ASR → Translation → TTS → Timing Sync → 5555 Audio OUT
```

**The cross-patch is the FINAL step after all AI processing is complete.**

---

## SYSTEM COMPARISON

### Current System: conf-server-phase1.js (338 lines)
```
┌─────────────────────────────────────────────────────────────┐
│  PHASE 1 - Simple PCM Cross-Patch                          │
├─────────────────────────────────────────────────────────────┤
│  Function:                                                  │
│  - Receives PCM from gateway-5555 (port 6100)             │
│  - Receives PCM from gateway-6666 (port 6102)             │
│  - Cross-patches audio bidirectionally (NO PROCESSING)     │
│  - WebSocket monitoring (port 3010)                        │
│                                                            │
│  Capabilities:                                              │
│  ✓ Bidirectional audio routing (immediate)                │
│  ✓ Real-time audio monitoring                             │
│  ✗ NO translation                                          │
│  ✗ NO transcription                                        │
│  ✗ NO AI processing                                        │
└─────────────────────────────────────────────────────────────┘
```

### Target System: VTT-TTV-SERVER
```
┌─────────────────────────────────────────────────────────────┐
│  VTT-TTV-SERVER - Full AI Translation Pipeline             │
├─────────────────────────────────────────────────────────────┤
│  Function:                                                  │
│  - Receives PCM from gateways                              │
│  - Processes through FULL AI pipeline                      │
│  - Cross-patches TRANSLATED audio (not original)           │
│  - Comprehensive monitoring dashboards                     │
│                                                            │
│  Technology Stack:                                          │
│  - Express.js + Socket.IO (WebSocket server)              │
│  - Deepgram SDK (ASR - Speech Recognition)                │
│  - DeepL API (Machine Translation)                        │
│  - ElevenLabs API (TTS - Text-to-Speech)                  │
│  - Timing Client (Bidirectional coordination)             │
│                                                            │
│  AI Pipeline Flow (SEQUENTIAL):                            │
│  1. PCM Audio IN from Gateway                              │
│  2. Deepgram ASR → Transcript                              │
│  3. DeepL → Translated Text                                │
│  4. ElevenLabs TTS → Translated PCM Audio                  │
│  5. Timing Sync → Coordinated delivery                     │
│  6. Cross-patch → Send to OTHER gateway (FINAL STEP)       │
│                                                            │
│  Capabilities:                                              │
│  ✓ Real-time speech translation                           │
│  ✓ Audio gain control per extension                       │
│  ✓ Comprehensive monitoring dashboards                    │
│  ✓ Session recording & playback                           │
│  ✓ Live transcription monitoring                          │
│  ✓ Timing synchronization                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## ARCHITECTURE OVERVIEW

### Current: Phase 1 System (5555/6666) - SIMPLE CROSS-PATCH
```
┌──────────┐    RTP     ┌──────────┐    PCM     ┌─────────────────┐
│ Asterisk │◄──────────►│ Gateway  │◄──────────►│                 │
│ Ext 5555 │  4000/4001 │  5555    │  6100/6101 │  conf-server    │
└──────────┘            └──────────┘            │  -phase1.js     │
                                                 │                 │
┌──────────┐    RTP     ┌──────────┐    PCM     │  IMMEDIATE      │
│ Asterisk │◄──────────►│ Gateway  │◄──────────►│  CROSS-PATCH    │
│ Ext 6666 │  4002/4003 │  6666    │  6102/6103 │  (No processing)│
└──────────┘            └──────────┘            └─────────────────┘
```

### Target: VTT-TTV-SERVER (5555/6666) - AI PIPELINE THEN CROSS-PATCH
```
┌──────────┐    RTP     ┌──────────┐    PCM     ┌─────────────────────────────────┐
│ Asterisk │◄──────────►│ Gateway  │◄──────────►│                                 │
│ Ext 5555 │  4000/4001 │  5555    │  6100/6101 │   VTT-TTV-SERVER                │
│ (English)│            │          │            │                                 │
└──────────┘            └──────────┘            │                                 │
                                                 │   AUDIO FLOW FOR 5555→6666:     │
┌──────────┐    RTP     ┌──────────┐    PCM     │   ┌─────────────────────────┐   │
│ Asterisk │◄──────────►│ Gateway  │◄──────────►│   │ 1. Receive from 5555    │   │
│ Ext 6666 │  4002/4003 │  6666    │  6102/6103 │   │    (English audio)      │   │
│ (French) │            │          │            │   └───────────┬─────────────┘   │
└──────────┘            └──────────┘            │               │                 │
                                                 │               ▼                 │
                                                 │   ┌─────────────────────────┐   │
                                                 │   │ 2. ASR (Deepgram)       │   │
                                                 │   │    "Hello, how are you?"│   │
                                                 │   └───────────┬─────────────┘   │
                                                 │               │                 │
                                                 │               ▼                 │
                                                 │   ┌─────────────────────────┐   │
                                                 │   │ 3. Translation (DeepL)  │   │
                                                 │   │    "Bonjour, comment    │   │
                                                 │   │     allez-vous?"        │   │
                                                 │   └───────────┬─────────────┘   │
                                                 │               │                 │
                                                 │               ▼                 │
                                                 │   ┌─────────────────────────┐   │
                                                 │   │ 4. TTS (ElevenLabs)     │   │
                                                 │   │    Generate French      │   │
                                                 │   │    speech audio         │   │
                                                 │   └───────────┬─────────────┘   │
                                                 │               │                 │
                                                 │               ▼                 │
                                                 │   ┌─────────────────────────┐   │
                                                 │   │ 5. Timing Sync          │   │
                                                 │   │    Coordinate delivery  │   │
                                                 │   └───────────┬─────────────┘   │
                                                 │               │                 │
                                                 │               ▼                 │
                                                 │   ┌─────────────────────────┐   │
                                                 │   │ 6. CROSS-PATCH          │   │
                                                 │   │    Send to 6666         │   │
                                                 │   │    (Translated French)  │   │
                                                 │   └─────────────────────────┘   │
                                                 │                                 │
                                                 │   (Reverse flow for 6666→5555)  │
                                                 └─────────────────────────────────┘
                                                         ▲
                                                         │ Socket.IO :3001
                                                    ┌────▼──────────────┐
                                                    │  Dashboard Suite   │
                                                    │  - Live Monitor    │
                                                    │  - Transcription   │
                                                    │  - Debug Tools     │
                                                    └───────────────────┘
```

---

## FILE STRUCTURE

### New Project Structure: VTT-TTV-SERVER
```
/home/azureuser/translation-app/vtt-ttv-server/
├── vtt-ttv-server.js                    # Main server (adapted from conference-server-externalmedia.js)
├── package.json                          # Dependencies
├── .env.vtt-ttv                          # Environment variables (API keys)
│
├── gateways/                             # Gateway modules
│   ├── gateway-5555.js                   # MIC gateway (copied from phase1, enhanced)
│   └── gateway-6666-buffered.js          # SPEAKER gateway (CRITICAL: use buffered version)
│
├── ari/                                  # ARI integration
│   └── ari-vtt-handler.js               # ARI ExternalMedia handler for 5555/6666
│
├── services/                             # AI Service modules
│   ├── deepgram-streaming-client.js     # ASR service
│   ├── deepl-incremental-mt.js          # Translation service
│   └── elevenlabs-tts-service.js        # TTS service
│
├── core/                                 # Core modules
│   ├── audio-converter.js               # Audio format conversion
│   ├── audio-stream-buffer.js           # Audio buffering
│   ├── frame-collector.js               # Frame collection
│   └── timing-client.js                 # Bidirectional timing coordination
│
├── public/                               # Web dashboards
│   ├── dashboard-single.html            # Main dashboard (201KB)
│   ├── dashboard-room2.html             # Secondary dashboard (144KB)
│   ├── monitoring-dashboard.html        # Real-time monitoring (100KB)
│   ├── live-transcription-monitor.html  # Live transcripts (50KB)
│   ├── debug-audio.html                 # Audio debugging tools (22KB)
│   ├── test-conference.html             # Conference testing
│   ├── test-mic.html                    # Microphone testing
│   ├── test-sip.html                    # SIP testing
│   ├── onboarding.html                  # User onboarding
│   └── css/                             # Stylesheets
│
├── logs/                                 # Log directory
│   ├── vtt-ttv-server.log
│   ├── gateway-5555.log
│   ├── gateway-6666-buffered.log
│   └── ari-vtt-handler.log
│
├── recordings/                           # Audio recordings
├── transcripts/                          # Transcript storage
└── translations/                         # Translation storage
```

---

## MIGRATION PHASES

### PHASE A: Foundation Setup (Day 1)
**Goal**: Create project structure, copy files, configure environment

#### A.1: Create Project Directory
```bash
cd /home/azureuser/translation-app
mkdir -p vtt-ttv-server/{gateways,ari,services,core,public/css,logs,recordings,transcripts,translations}
```

#### A.2: Copy Source Files from 7777-8888-stack
```bash
SOURCE_DIR="/home/azureuser/translation-app/backup-working-timing-module-in/7777-8888-stack"
TARGET_DIR="/home/azureuser/translation-app/vtt-ttv-server"

# Main server (will be renamed)
cp $SOURCE_DIR/conference-server-externalmedia.js $TARGET_DIR/vtt-ttv-server.js

# Services
cp $SOURCE_DIR/deepgram-streaming-client.js $TARGET_DIR/services/
cp $SOURCE_DIR/deepl-incremental-mt.js $TARGET_DIR/services/
cp $SOURCE_DIR/elevenlabs-tts-service.js $TARGET_DIR/services/

# Core modules
cp $SOURCE_DIR/audio-converter.js $TARGET_DIR/core/
cp $SOURCE_DIR/audio-stream-buffer.js $TARGET_DIR/core/
cp $SOURCE_DIR/frame-collector.js $TARGET_DIR/core/
cp $SOURCE_DIR/timing-client.js $TARGET_DIR/core/

# Public dashboards
cp $SOURCE_DIR/public/*.html $TARGET_DIR/public/
cp -r $SOURCE_DIR/public/css $TARGET_DIR/public/

# Package.json (will need editing)
cp $SOURCE_DIR/package.json $TARGET_DIR/package.json
```

#### A.3: Copy Gateway Files from Phase 1
```bash
PHASE1_DIR="/home/azureuser/translation-app/5555-6666-gstreamer-phase1"

# Gateway-5555 (will be enhanced)
cp $PHASE1_DIR/gateway-5555.js $TARGET_DIR/gateways/

# Gateway-6666 BUFFERED (CRITICAL - use buffered version!)
cp /tmp/gateway-6666-buffered.js $TARGET_DIR/gateways/

# ARI handler (will be adapted)
cp $PHASE1_DIR/ari-gstreamer-phase1.js $TARGET_DIR/ari/ari-vtt-handler.js
```

#### A.4: Create Environment Configuration
```bash
cat > $TARGET_DIR/.env.vtt-ttv << 'EOF'
# VTT-TTV-SERVER Configuration
# API Keys (REQUIRED for AI features)

# Deepgram ASR
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# DeepL Translation
DEEPL_API_KEY=your_deepl_api_key_here

# ElevenLabs TTS
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_DEFAULT_VOICE_ID=your_voice_id_here

# Server Ports
VTT_HTTP_PORT=3001
VTT_WEBSOCKET_PORT=3001
VTT_UDP_PORT_5555_IN=6100
VTT_UDP_PORT_5555_OUT=6101
VTT_UDP_PORT_6666_IN=6102
VTT_UDP_PORT_6666_OUT=6103

# Extension Configuration
EXT_5555_LANGUAGE=en
EXT_6666_LANGUAGE=fr
EXT_5555_TARGET_LANGUAGE=fr
EXT_6666_TARGET_LANGUAGE=en
EOF
```

#### A.5: Update package.json
```bash
cat > $TARGET_DIR/package.json << 'EOF'
{
  "name": "vtt-ttv-server",
  "version": "1.0.0",
  "description": "VTT-TTV Voice Translation Technology Server for Extensions 5555/6666",
  "main": "vtt-ttv-server.js",
  "scripts": {
    "start": "node vtt-ttv-server.js",
    "start-gateways": "node gateways/gateway-5555.js & node gateways/gateway-6666-buffered.js",
    "start-ari": "node ari/ari-vtt-handler.js",
    "start-all": "npm run start & npm run start-gateways & npm run start-ari"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.1",
    "socket.io-client": "^4.6.1",
    "ari-client": "^2.2.0",
    "@deepgram/sdk": "^3.0.0",
    "deepl-node": "^1.11.0",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.0",
    "ws": "^8.13.0"
  },
  "author": "Translation Team",
  "license": "ISC"
}
EOF
```

#### A.6: Install Dependencies
```bash
cd $TARGET_DIR
npm install
```

**Testing Phase A**:
```bash
# Verify directory structure
tree -L 2 $TARGET_DIR

# Verify files copied
ls -lh $TARGET_DIR/*.js
ls -lh $TARGET_DIR/services/
ls -lh $TARGET_DIR/public/

# Verify .env exists
cat $TARGET_DIR/.env.vtt-ttv
```

**Success Criteria**:
- ✓ All directories created
- ✓ All source files copied
- ✓ package.json configured
- ✓ .env.vtt-ttv created
- ✓ npm install successful

---

### PHASE B: Code Adaptation (Day 2-3)
**Goal**: Adapt copied code for 5555/6666 extensions with correct AI pipeline flow

#### B.1: Adapt Main Server (vtt-ttv-server.js)

**Critical Changes Required**:

1. **Remove HMLCP imports and references** (not in scope):
```javascript
// REMOVE these lines:
// const { UserProfile, ULOLayer, PatternExtractor } = require('./hmlcp');
// const { applyDefaultProfile } = require('./hmlcp/default-profiles');
// const userProfiles = new Map();
```

2. **Extension Configuration**:
```javascript
// Configure for 5555 (English) and 6666 (French)
global.qaConfigs = new Map();
global.qaConfigs.set('5555', { sourceLang: 'en', targetLang: 'fr', qaMode: false });
global.qaConfigs.set('6666', { sourceLang: 'fr', targetLang: 'en', qaMode: false });
```

3. **Ensure correct audio flow** (CRITICAL):
```javascript
// Audio from 5555 goes through AI pipeline THEN to 6666
// Audio from 6666 goes through AI pipeline THEN to 5555

// When processing audio from 5555:
// 1. ASR transcribes English
// 2. DeepL translates to French
// 3. ElevenLabs generates French audio
// 4. Timing sync coordinates
// 5. Send to gateway-6666 (port 6103)

// When processing audio from 6666:
// 1. ASR transcribes French
// 2. DeepL translates to English
// 3. ElevenLabs generates English audio
// 4. Timing sync coordinates
// 5. Send to gateway-5555 (port 6101)
```

4. **Update Logging**:
```javascript
logFile: '/home/azureuser/translation-app/vtt-ttv-server/logs/vtt-ttv-server.log'
```

5. **Update Service Module Paths**:
```javascript
const ElevenLabsTTSService = require('./services/elevenlabs-tts-service');
const TimingClient = require('./core/timing-client');
// Remove: const { UserProfile, ULOLayer, PatternExtractor } = require('./hmlcp');
```

#### B.2: Adapt Gateway Files

**gateway-5555.js** - Minimal changes:
```javascript
logFile: '/home/azureuser/translation-app/vtt-ttv-server/logs/gateway-5555.log'

// Verify ports (should already be correct):
fromAsteriskPort: 4000,
toAsteriskPort: 4001,
toConfServerPort: 6100,
fromConfServerPort: 6101
```

**gateway-6666-buffered.js** - Minimal changes:
```javascript
logFile: '/home/azureuser/translation-app/vtt-ttv-server/logs/gateway-6666-buffered.log'

// KEEP buffer configuration (CRITICAL):
maxBufferedPackets: 1000
```

#### B.3: Adapt ARI Handler (ari-vtt-handler.js)

```javascript
const ARI_APP_NAME = 'vtt-ttv-handler';

const EXTENSIONS = {
  '5555': {
    extension: '5555',
    role: 'microphone',
    fromAsteriskPort: 4000,
    toAsteriskPort: 4001,
    toServerPort: 6100,
    fromServerPort: 6101,
    language: 'en',
    targetLanguage: 'fr'
  },
  '6666': {
    extension: '6666',
    role: 'speaker',
    fromAsteriskPort: 4002,
    toAsteriskPort: 4003,
    toServerPort: 6102,
    fromServerPort: 6103,
    language: 'fr',
    targetLanguage: 'en'
  }
};

logFile: '/home/azureuser/translation-app/vtt-ttv-server/logs/ari-vtt-handler.log'
```

**Testing Phase B**:
```bash
# Syntax check all adapted files
node --check vtt-ttv-server.js
node --check gateways/gateway-5555.js
node --check gateways/gateway-6666-buffered.js
node --check ari/ari-vtt-handler.js
```

**Success Criteria**:
- ✓ All files pass syntax check
- ✓ No HMLCP references remain
- ✓ Extension configuration correct (5555=en→fr, 6666=fr→en)
- ✓ Module paths updated

---

### PHASE C: Integration Testing (Day 4-5)
**Goal**: Test the full AI pipeline flow

#### C.1: Update Asterisk Dialplan

Edit `/etc/asterisk/extensions.conf`:
```ini
[vtt-ttv-handler]

; Extension 5555 → VTT-TTV (English speaker)
exten => 5555,1,NoOp(=== VTT-TTV Extension 5555 - English ===)
 same => n,Answer()
 same => n,Set(CHANNEL(format)=slin16)
 same => n,Playback(beep)
 same => n,Stasis(vtt-ttv-handler,ext5555)
 same => n,Hangup()

; Extension 6666 → VTT-TTV (French speaker)
exten => 6666,1,NoOp(=== VTT-TTV Extension 6666 - French ===)
 same => n,Answer()
 same => n,Set(CHANNEL(format)=slin16)
 same => n,Playback(beep)
 same => n,Stasis(vtt-ttv-handler,ext6666)
 same => n,Hangup()
```

Reload dialplan:
```bash
ssh azureuser@20.170.155.53 "sudo asterisk -rx 'dialplan reload'"
```

#### C.2: Create Startup Script

Create `/home/azureuser/translation-app/vtt-ttv-server/start-vtt-ttv.sh`:
```bash
#!/bin/bash
# VTT-TTV-SERVER Startup Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==================================================================="
echo "  VTT-TTV-SERVER Startup"
echo "  Voice Translation Technology - Text-To-Voice Server"
echo "==================================================================="

# Kill any existing processes
echo "Stopping existing VTT-TTV processes..."
ps aux | grep 'vtt-ttv-server.js\|gateway-5555.js\|gateway-6666-buffered.js\|ari-vtt-handler.js' | grep -v grep | awk '{print $2}' | xargs -r kill
sleep 3

# Start main server
echo "Starting VTT-TTV-SERVER..."
nohup node vtt-ttv-server.js > logs/vtt-ttv-server.log 2>&1 &
echo "VTT-TTV-SERVER PID: $!"
sleep 2

# Start gateway-5555 (English MIC)
echo "Starting gateway-5555..."
nohup node gateways/gateway-5555.js > logs/gateway-5555.log 2>&1 &
echo "Gateway-5555 PID: $!"
sleep 1

# Start gateway-6666-buffered (French SPEAKER) - CRITICAL: buffered version
echo "Starting gateway-6666-buffered..."
nohup node gateways/gateway-6666-buffered.js > logs/gateway-6666-buffered.log 2>&1 &
echo "Gateway-6666-BUFFERED PID: $!"
sleep 1

# Start ARI handler
echo "Starting ARI VTT handler..."
nohup node ari/ari-vtt-handler.js > logs/ari-vtt-handler.log 2>&1 &
echo "ARI Handler PID: $!"
sleep 2

echo ""
echo "==================================================================="
echo "  VTT-TTV-SERVER Started"
echo "==================================================================="

# Verify all processes running
echo "Verifying processes..."
ps aux | grep 'vtt-ttv\|gateway-5555\|gateway-6666-buffered\|ari-vtt-handler' | grep -v grep

echo ""
echo "Dashboards:"
echo "  - Main: http://20.170.155.53:3001/"
echo "  - Monitoring: http://20.170.155.53:3001/monitoring-dashboard.html"
echo "  - Live Transcription: http://20.170.155.53:3001/live-transcription-monitor.html"

echo ""
echo "Startup complete!"
```

Make executable:
```bash
chmod +x /home/azureuser/translation-app/vtt-ttv-server/start-vtt-ttv.sh
```

#### C.3: Test Full AI Pipeline

**Test Procedure**:
1. Start VTT-TTV-SERVER stack
2. Call extension 5555 from one SIP client (English speaker)
3. Call extension 6666 from another SIP client (French speaker)
4. Speak English into 5555
5. Listen for TRANSLATED French audio on 6666
6. Speak French into 6666
7. Listen for TRANSLATED English audio on 5555

**Expected Log Output**:

**vtt-ttv-server.log**:
```
[VTT-TTV] Received audio from 5555 (English)
[VTT-TTV] ASR: "Hello, how are you?"
[VTT-TTV] Translation (en→fr): "Bonjour, comment allez-vous?"
[VTT-TTV] TTS: Generating French speech
[VTT-TTV] TTS: Generated 12,800 bytes
[VTT-TTV] Timing Sync: Coordinating delivery
[VTT-TTV] Sending translated audio to 6666
```

**Testing Phase C**:
```bash
# 1. Verify all services started
ps aux | grep 'vtt-ttv\|gateway' | grep -v grep

# 2. Check port bindings
netstat -ulnp | grep -E '6100|6101|6102|6103|4000|4001|4002|4003'
netstat -tlnp | grep '3001'

# 3. Monitor AI pipeline
tail -f /home/azureuser/translation-app/vtt-ttv-server/logs/*.log | grep -E 'ASR|Translation|TTS|Timing'

# 4. Access dashboards
curl http://localhost:3001/
```

**Success Criteria**:
- ✓ All 4 services running
- ✓ Ports bound correctly
- ✓ ASR producing transcripts
- ✓ Translation working (en↔fr)
- ✓ TTS generating audio
- ✓ Timing sync coordinating delivery
- ✓ Audio crossing ONLY after full pipeline
- ✓ End-to-end latency < 3 seconds
- ✓ No "squawks" or distortion

---

### PHASE D: API Keys & Production (Day 6-7)
**Goal**: Configure production API keys and optimize

#### D.1: Configure API Keys

Edit `.env.vtt-ttv`:
```bash
# Replace with actual API keys
DEEPGRAM_API_KEY=actual_deepgram_key_here
DEEPL_API_KEY=actual_deepl_key_here
ELEVENLABS_API_KEY=actual_elevenlabs_key_here
ELEVENLABS_DEFAULT_VOICE_ID=actual_voice_id_here
```

#### D.2: Test API Services Individually

**Test Deepgram ASR**:
```javascript
// Create test-deepgram.js
const { createClient } = require('@deepgram/sdk');
require('dotenv').config({ path: '.env.vtt-ttv' });

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
console.log('Deepgram API key valid:', !!process.env.DEEPGRAM_API_KEY);
```

**Test DeepL Translation**:
```javascript
// Create test-deepl.js
const deepl = require('deepl-node');
require('dotenv').config({ path: '.env.vtt-ttv' });

const translator = new deepl.Translator(process.env.DEEPL_API_KEY);
translator.translateText('Hello, how are you?', 'en', 'fr').then(result => {
  console.log('Translation result:', result.text);
});
```

**Test ElevenLabs TTS**:
```javascript
// Create test-elevenlabs.js
const ElevenLabsTTSService = require('./services/elevenlabs-tts-service');
require('dotenv').config({ path: '.env.vtt-ttv' });

const tts = new ElevenLabsTTSService(process.env.ELEVENLABS_API_KEY);
tts.generateSpeech('Bonjour!', 'fr').then(audio => {
  console.log('TTS audio generated:', audio.length, 'bytes');
});
```

**Success Criteria**:
- ✓ All API keys valid
- ✓ Deepgram transcribing
- ✓ DeepL translating
- ✓ ElevenLabs generating speech
- ✓ Full pipeline working end-to-end

---

## PORT MAPPING REFERENCE

### VTT-TTV-SERVER Ports
| Component | Protocol | Port | Description |
|-----------|----------|------|-------------|
| Asterisk → Gateway-5555 | RTP | 4000 | Asterisk sends RTP to gateway |
| Gateway-5555 → Asterisk | RTP | 4001 | Gateway sends RTP to Asterisk |
| Gateway-5555 → VTT-TTV | PCM | 6100 | English audio IN |
| VTT-TTV → Gateway-5555 | PCM | 6101 | Translated English audio OUT |
| Asterisk → Gateway-6666 | RTP | 4002 | Asterisk sends RTP to gateway |
| Gateway-6666 → Asterisk | RTP | 4003 | Gateway sends RTP to Asterisk |
| Gateway-6666 → VTT-TTV | PCM | 6102 | French audio IN |
| VTT-TTV → Gateway-6666 | PCM | 6103 | Translated French audio OUT |
| VTT-TTV HTTP/Socket.IO | TCP | 3001 | Web dashboards |

---

## ROLLBACK PROCEDURES

### Rollback to Phase 1 (Original System)
```bash
# 1. Stop VTT-TTV stack
ps aux | grep 'vtt-ttv\|gateway-5555\|gateway-6666-buffered\|ari-vtt-handler' | grep -v grep | awk '{print $2}' | xargs -r kill

# 2. Restore Phase 1 dialplan
sudo asterisk -rx 'dialplan reload'

# 3. Start Phase 1 services
cd /home/azureuser/translation-app/5555-6666-gstreamer-phase1
/tmp/restart-phase1.sh
```

---

## CRITICAL WARNINGS

### Gateway-6666 MUST BE BUFFERED VERSION
```
DO NOT USE: gateway-6666.js (drops packets)
ALWAYS USE: gateway-6666-buffered.js (buffers 1000 packets)

VERIFY:
ps aux | grep 'gateway-6666' | grep -v grep
# Should show: gateway-6666-buffered.js
```

### Cross-patch is AFTER AI Pipeline
```
VTT-TTV-SERVER is NOT a simple cross-patch like Phase 1.

CORRECT FLOW:
Audio IN → ASR → Translation → TTS → Timing Sync → Cross-patch OUT

The original audio NEVER goes to the other party.
Only the TRANSLATED audio is sent after full AI processing.
```

### API Keys Required
```
AI features require valid API keys:
- Deepgram (ASR)
- DeepL (Translation)
- ElevenLabs (TTS)

Without API keys, the server will not function.
```

### Startup Order Matters
```
CORRECT ORDER:
1. VTT-TTV-SERVER (provides UDP ports 6100-6103)
2. Gateway-5555 (connects to 6100/6101)
3. Gateway-6666-BUFFERED (connects to 6102/6103)
4. ARI Handler (triggers ExternalMedia)

USE STARTUP SCRIPT:
/home/azureuser/translation-app/vtt-ttv-server/start-vtt-ttv.sh
```

---

## MONITORING AND DEBUGGING

### Log File Locations
```bash
# Main server
tail -f /home/azureuser/translation-app/vtt-ttv-server/logs/vtt-ttv-server.log

# Gateway-5555
tail -f /home/azureuser/translation-app/vtt-ttv-server/logs/gateway-5555.log

# Gateway-6666-Buffered
tail -f /home/azureuser/translation-app/vtt-ttv-server/logs/gateway-6666-buffered.log

# ARI Handler
tail -f /home/azureuser/translation-app/vtt-ttv-server/logs/ari-vtt-handler.log
```

### Monitor AI Pipeline
```bash
# Watch ASR, Translation, TTS flow
tail -f logs/vtt-ttv-server.log | grep -E 'ASR|Translation|TTS|Timing|Sending'
```

### Dashboard URLs
```
Main Dashboard:          http://20.170.155.53:3001/
Single Room Dashboard:   http://20.170.155.53:3001/dashboard-single.html
Monitoring Dashboard:    http://20.170.155.53:3001/monitoring-dashboard.html
Live Transcription:      http://20.170.155.53:3001/live-transcription-monitor.html
Debug Audio:             http://20.170.155.53:3001/debug-audio.html
```

---

## PERFORMANCE BENCHMARKS

### Expected Performance Metrics

**AI Pipeline Latency**:
- ASR Latency: 200-500ms
- Translation Latency: 100-300ms
- TTS Latency: 500-1500ms
- Timing Sync: 50-100ms
- Total End-to-End: 850-2400ms (target < 3000ms)

**Audio Quality**:
- Sample Rate: 16kHz
- Bit Depth: 16-bit signed linear
- Frame Size: 20ms (320 samples)
- Packet Size: 640 bytes PCM

**Gateway-6666-Buffered**:
- Buffer Capacity: 1000 packets (20 seconds)
- Overflow Packets: 0 (if non-zero, increase buffer)

---

## CONTACT AND SUPPORT

**VM Access**:
- Host: azureuser@20.170.155.53
- Asterisk HTTP: http://20.170.155.53:8088/ari/asterisk/info
- ARI Credentials: ari_user / ari_password

**Project Locations**:
- Phase 1 (Current): `/home/azureuser/translation-app/5555-6666-gstreamer-phase1/`
- 7777-8888 Stack (Source): `/home/azureuser/translation-app/backup-working-timing-module-in/7777-8888-stack/`
- VTT-TTV-SERVER (New): `/home/azureuser/translation-app/vtt-ttv-server/`

---

**END OF MIGRATION PLAN**
