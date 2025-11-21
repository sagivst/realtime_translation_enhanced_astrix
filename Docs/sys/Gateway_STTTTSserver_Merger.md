# Gateway_STTTTSserver_Merger Plan
## Merging conf-server-phase1.js PCM Sockets into STTTTSserver.js

**Document Version:** 2.0 (CORRECTED)
**Date:** 2025-11-21
**Purpose:** Merge working PCM socket pattern from `3333_4444__Operational/Gateway/conf-server-phase1.js` into `3333_4444__Operational/STTTTSserver/STTTTSserver.js` for real-time translation
**Git Branch:** Working_5555-6_7777-8_Getaway_no_STTTTSserver

---

## Executive Summary

This plan details merging the proven working PCM socket implementation from `conf-server-phase1.js` (which currently does cross-patching) into `STTTTSserver.js` (which has the translation pipeline). After the merge, STTTTSserver.js will handle both PCM socket communication AND translation, replacing the direct cross-patch behavior with translation.

### Core Concept

**Source:** `3333_4444__Operational/Gateway/conf-server-phase1.js` (338 lines)
**Target:** `3333_4444__Operational/STTTTSserver/STTTTSserver.js`
**Goal:** Use proven PCM sockets from conf-server-phase1.js with gateways (gateway-3333-buffered.js & gateway-4444-buffered.js) for translation

**Key Modification:** Remove cross-linking logic:
- Line 186: `socket4444Out.send()` called from socket3333In handler → REMOVE
- Line 221: `socket3333Out.send()` called from socket4444In handler → REMOVE

**Replace With:** Translation pipeline (STT → Translate → TTS → send to opposite extension)

---

## Critical Requirements

### System Isolation & Boundaries

**ONLY MODIFY:**
- `3333_4444__Operational/Gateway/conf-server-phase1.js` (READ ONLY - for extraction)
- `3333_4444__Operational/STTTTSserver/STTTTSserver.js` (MERGE TARGET)

**DO NOT TOUCH:**
- `5555-6666-gstreamer-phase1/` (separate working system)
- `7777-8888-stack/` (separate working system)
- Asterisk configuration files (unless explicitly required)

**PRESERVE:**
- Dashboard at http://20.170.155.53:3020/dashboard.html
- Root page at http://20.170.155.53:3020/
- Extensions 5555/6666 functionality (regression test required)
- Extensions 7777/8888 functionality (regression test required)

### Starting Point

**Git Rollback Required:**
Before ANY changes, roll back to clean baseline:
```
Repository: https://github.com/sagivst/realtime_translation_enhanced_astrix
Branch: Working_5555-6_7777-8_Getaway_no_STTTTSserver
Path: /3333_4444__Operational
```

---

## Source File Analysis

### conf-server-phase1.js Structure

**Location:** `3333_4444__Operational/Gateway/conf-server-phase1.js`
**Total Lines:** 338
**Current Behavior:** PCM cross-patch server (3333 ↔ 4444)

#### Port Configuration (Lines 28-40)

```javascript
const CONFIG = {
  port3333In: 6120,      // Receives PCM FROM gateway-3333
  port3333Out: 6121,     // Sends PCM TO gateway-3333
  port4444In: 6122,      // Receives PCM FROM gateway-4444
  port4444Out: 6123,     // Sends PCM TO gateway-4444
  wsPort: 3020,          // ⚠️ CONFLICT: STTTTSserver also uses 3020
  gatewayHost: '127.0.0.1',
  sampleRate: 16000,
  channels: 1,
  frameSizeMs: 20,
  frameSizeBytes: 640,
  logFile: '/tmp/conf-server-phase1.log'
};
```

**Port Summary:**
| Extension | Direction | Port | Socket Variable |
|-----------|-----------|------|-----------------|
| 3333 | IN (receive from gateway) | 6120 | socket3333In |
| 3333 | OUT (send to gateway) | 6121 | socket3333Out |
| 4444 | IN (receive from gateway) | 6122 | socket4444In |
| 4444 | OUT (send to gateway) | 6123 | socket4444Out |

#### Socket Creation (Lines 62-65)

```javascript
const socket3333In = dgram.createSocket('udp4');
const socket3333Out = dgram.createSocket('udp4');
const socket4444In = dgram.createSocket('udp4');
const socket4444Out = dgram.createSocket('udp4');
```

#### Extension 3333 Handler (Lines 175-196)

**CRITICAL SECTION - Contains cross-linking to REMOVE:**

```javascript
socket3333In.on('message', (msg, rinfo) => {
  stats.from3333Packets++;

  if (stats.from3333Packets <= 5) {
    log(`Received from gateway-3333: ${msg.length} bytes (packet #${stats.from3333Packets})`);
  }

  // Broadcast to MIC monitoring clients (3333's own microphone)
  broadcastAudio(wsClients.mic3333, msg, '3333-MIC');

  // ❌ REMOVE THIS (Line 186): Cross-patch - sends 3333's audio directly to 4444
  socket4444Out.send(msg, CONFIG.port4444Out, CONFIG.gatewayHost, (err) => {
    if (err) {
      log(`ERROR sending to gateway-4444: ${err.message}`);
    } else {
      stats.to4444Packets++;
    }
  });

  // Stream to monitoring clients
  broadcastAudio(wsClients.monitor3333, msg, '3333');
});
```

#### Extension 4444 Handler (Lines 210-231)

**CRITICAL SECTION - Contains cross-linking to REMOVE:**

```javascript
socket4444In.on('message', (msg, rinfo) => {
  stats.from4444Packets++;

  if (stats.from4444Packets <= 5) {
    log(`Received from gateway-4444: ${msg.length} bytes (packet #${stats.from4444Packets})`);
  }

  // Broadcast to MIC monitoring clients (4444's own microphone)
  broadcastAudio(wsClients.mic4444, msg, '4444-MIC');

  // ❌ REMOVE THIS (Line 221): Cross-patch - sends 4444's audio directly to 3333
  socket3333Out.send(msg, CONFIG.port3333Out, CONFIG.gatewayHost, (err) => {
    if (err) {
      log(`ERROR sending to gateway-3333: ${err.message}`);
    } else {
      stats.to3333Packets++;
    }
  });

  // Stream to monitoring clients
  broadcastAudio(wsClients.monitor4444, msg, '4444');
});
```

#### WebSocket Server (Lines 68-170)

**PORT CONFLICT:** conf-server-phase1.js uses HTTP server on port 3020
**ISSUE:** STTTTSserver.js ALSO uses port 3020 for Socket.IO

**Resolution:** Keep STTTTSserver's Socket.IO server, do NOT merge WebSocket server from conf-server-phase1.js

---

## Target File Analysis

### STTTTSserver.js Structure

**Location:** `3333_4444__Operational/STTTTSserver/STTTTSserver.js`
**Expected Baseline:** ~2732 lines (from git branch)

**Existing Components to REUSE:**

#### Translation Pipeline Functions
```javascript
async function transcribeAudio(wavAudio, language) { /* Deepgram STT */ }
async function translateText(text, sourceLang, targetLang) { /* DeepL */ }
async function synthesizeSpeech(text, targetLang) { /* ElevenLabs TTS */ }
async function convertMp3ToPcm16(mp3Buffer) { /* Audio conversion */ }
function addWavHeader(pcmBuffer) { /* WAV header generation */ }
```

#### Socket.IO Server
```javascript
// Already exists on port 3020
const server = http.createServer(...);
const io = require('socket.io')(server);
global.io = io;

// Dashboard endpoints
app.get('/dashboard.html', ...);
app.get('/', ...);
```

---

## Detailed Merger Steps

### PHASE 0: Preparation & Git Rollback

#### Step 0.1: Rollback to Clean Baseline

**LOCAL MACHINE:**
```bash
cd /Users/sagivstavinsky/realtime-translation-enhanced_astrix

# Fetch latest from GitHub
git fetch origin

# Checkout clean baseline
git checkout Working_5555-6_7777-8_Getaway_no_STTTTSserver

# Verify clean state
git status

# Verify file exists
ls -lh 3333_4444__Operational/STTTTSserver/STTTTSserver.js
wc -l 3333_4444__Operational/STTTTSserver/STTTTSserver.js

# Create working backup
cp 3333_4444__Operational/STTTTSserver/STTTTSserver.js \
   3333_4444__Operational/STTTTSserver/STTTTSserver.js.before-merger-$(date +%Y%m%d-%H%M%S)
```

#### Step 0.2: Backup Remote Server

**REMOTE SERVER:**
```bash
ssh azureuser@20.170.155.53 << 'EOF'
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver

# Backup current remote file
cp STTTTSserver.js STTTTSserver.js.before-merger-$(date +%Y%m%d-%H%M%S)

# List backups
ls -lh STTTTSserver.js.before-merger-*
EOF
```

---

### PHASE 1: Code Extraction & Transformation

#### Step 1.1: Extract UDP Socket Configuration

**From conf-server-phase1.js (lines 28-40):**
```javascript
const CONFIG = {
  port3333In: 6120,
  port3333Out: 6121,
  port4444In: 6122,
  port4444Out: 6123,
  wsPort: 3020,        // ← SKIP (conflict with STTTTSserver)
  gatewayHost: '127.0.0.1',
  sampleRate: 16000,
  channels: 1,
  frameSizeMs: 20,
  frameSizeBytes: 640,
  logFile: '/tmp/conf-server-phase1.log'
};
```

**Transform to (for STTTTSserver.js):**
```javascript
// ============================================================================
// UDP PCM SOCKET CONFIGURATION
// Merged from 3333_4444__Operational/Gateway/conf-server-phase1.js
// Ports 6120-6123 MUST match gateway-3333-buffered.js and gateway-4444-buffered.js
// ============================================================================

const UDP_PCM_CONFIG = {
  port3333In: 6120,       // Receive PCM FROM gateway-3333
  port3333Out: 6121,      // Send translated PCM TO gateway-3333
  port4444In: 6122,       // Receive PCM FROM gateway-4444
  port4444Out: 6123,      // Send translated PCM TO gateway-4444
  gatewayHost: '127.0.0.1',
  sampleRate: 16000,
  channels: 1,
  frameSizeMs: 20,
  frameSizeBytes: 640,    // 20ms * 16000Hz * 1ch * 2 bytes = 640 bytes per frame
  bufferThreshold: 32000  // ~1 second of audio before triggering translation
};
```

#### Step 1.2: Extract Socket Creation

**From conf-server-phase1.js (lines 62-65):**
```javascript
const socket3333In = dgram.createSocket('udp4');
const socket3333Out = dgram.createSocket('udp4');
const socket4444In = dgram.createSocket('udp4');
const socket4444Out = dgram.createSocket('udp4');
```

**Transform to (for STTTTSserver.js):**
```javascript
// ============================================================================
// UDP PCM SOCKET CREATION
// ============================================================================

const dgram = require('dgram');  // Add if not already imported

const socket3333In = dgram.createSocket('udp4');
const socket3333Out = dgram.createSocket('udp4');
const socket4444In = dgram.createSocket('udp4');
const socket4444Out = dgram.createSocket('udp4');
```

#### Step 1.3: Create Statistics Tracking

**Transform to (for STTTTSserver.js):**
```javascript
// ============================================================================
// UDP PCM STATISTICS
// ============================================================================

let udpPcmStats = {
  from3333Packets: 0,
  to3333Packets: 0,
  from4444Packets: 0,
  to4444Packets: 0,
  translationRequests: 0,
  translationSuccesses: 0,
  translationErrors: 0,
  startTime: Date.now()
};
```

#### Step 1.4: Create Audio Buffering

**NEW - Not in conf-server-phase1.js:**
```javascript
// ============================================================================
// AUDIO BUFFERING FOR TRANSLATION
// conf-server-phase1.js had immediate forwarding (cross-patch)
// We need buffering to accumulate ~1 second before translation
// ============================================================================

const udpAudioBuffers = new Map();

udpAudioBuffers.set('3333', {
  chunks: [],                  // Array of PCM buffers
  totalBytes: 0,              // Running total
  language: 'en',             // Source language
  lastProcessed: Date.now()   // Timestamp
});

udpAudioBuffers.set('4444', {
  chunks: [],
  totalBytes: 0,
  language: 'fr',
  lastProcessed: Date.now()
});
```

#### Step 1.5: Transform Extension 3333 Handler

**From conf-server-phase1.js (lines 175-196):**
```javascript
socket3333In.on('message', (msg, rinfo) => {
  stats.from3333Packets++;

  // ... logging ...

  broadcastAudio(wsClients.mic3333, msg, '3333-MIC');

  // ❌ REMOVE: Direct cross-patch
  socket4444Out.send(msg, CONFIG.port4444Out, CONFIG.gatewayHost, ...);

  broadcastAudio(wsClients.monitor3333, msg, '3333');
});
```

**Transform to (for STTTTSserver.js):**
```javascript
// ============================================================================
// EXTENSION 3333 MESSAGE HANDLER (English Input)
// Based on conf-server-phase1.js socket3333In handler (lines 175-196)
// REMOVED: Direct cross-patch to socket4444Out (line 186)
// ADDED: Audio buffering + translation pipeline
// ============================================================================

socket3333In.on('message', async (msg, rinfo) => {
  udpPcmStats.from3333Packets++;

  // Log first few packets for debugging
  if (udpPcmStats.from3333Packets <= 5) {
    console.log(`[UDP-3333] Gateway connected: ${msg.length} bytes/frame (packet #${udpPcmStats.from3333Packets})`);
  }

  // Optional: Broadcast to Socket.IO dashboard for visualization
  if (global.io) {
    global.io.emit('audioStream', {
      extension: '3333',
      buffer: msg,
      sampleRate: UDP_PCM_CONFIG.sampleRate,
      channels: UDP_PCM_CONFIG.channels,
      timestamp: Date.now(),
      transport: 'udp-pcm',
      source: 'microphone'
    });
  }

  // Buffer audio chunks
  const buffer = udpAudioBuffers.get('3333');
  buffer.chunks.push(Buffer.from(msg));
  buffer.totalBytes += msg.length;

  // When buffer reaches threshold (~1 second / 32000 bytes)
  if (buffer.totalBytes >= UDP_PCM_CONFIG.bufferThreshold) {
    // Combine all buffered chunks
    const combinedBuffer = Buffer.concat(buffer.chunks);

    // Reset buffer
    buffer.chunks = [];
    buffer.totalBytes = 0;
    buffer.lastProcessed = Date.now();

    console.log(`[UDP-3333] Processing ${combinedBuffer.length} bytes (${Math.floor(combinedBuffer.length / UDP_PCM_CONFIG.frameSizeBytes)} frames)`);

    // ✅ NEW: Call translation pipeline (REPLACES direct socket send)
    await processUdpPcmAudio('3333', combinedBuffer, 'en');
  }
});

socket3333In.on('error', (err) => {
  console.error(`[UDP-3333] Socket error:`, err.message);
  udpPcmStats.translationErrors++;
});
```

#### Step 1.6: Transform Extension 4444 Handler

**Transform to (for STTTTSserver.js):**
```javascript
// ============================================================================
// EXTENSION 4444 MESSAGE HANDLER (French Input)
// Based on conf-server-phase1.js socket4444In handler (lines 210-231)
// REMOVED: Direct cross-patch to socket3333Out (line 221)
// ADDED: Audio buffering + translation pipeline
// ============================================================================

socket4444In.on('message', async (msg, rinfo) => {
  udpPcmStats.from4444Packets++;

  if (udpPcmStats.from4444Packets <= 5) {
    console.log(`[UDP-4444] Gateway connected: ${msg.length} bytes/frame (packet #${udpPcmStats.from4444Packets})`);
  }

  // Dashboard visualization
  if (global.io) {
    global.io.emit('audioStream', {
      extension: '4444',
      buffer: msg,
      sampleRate: UDP_PCM_CONFIG.sampleRate,
      channels: UDP_PCM_CONFIG.channels,
      timestamp: Date.now(),
      transport: 'udp-pcm',
      source: 'microphone'
    });
  }

  // Buffer audio
  const buffer = udpAudioBuffers.get('4444');
  buffer.chunks.push(Buffer.from(msg));
  buffer.totalBytes += msg.length;

  // Process when buffer full
  if (buffer.totalBytes >= UDP_PCM_CONFIG.bufferThreshold) {
    const combinedBuffer = Buffer.concat(buffer.chunks);
    buffer.chunks = [];
    buffer.totalBytes = 0;
    buffer.lastProcessed = Date.now();

    console.log(`[UDP-4444] Processing ${combinedBuffer.length} bytes`);

    // Translate French → English
    await processUdpPcmAudio('4444', combinedBuffer, 'fr');
  }
});

socket4444In.on('error', (err) => {
  console.error(`[UDP-4444] Socket error:`, err.message);
  udpPcmStats.translationErrors++;
});
```

#### Step 1.7: Create UDP-to-Translation Integration Function

**NEW Integration Function (connects UDP sockets TO STTTTSserver's EXISTING translation functions):**
**Note:** The translation functions (transcribeAudio, translateText, synthesizeSpeech, etc.) already exist in STTTTSserver.js - we're just creating a wrapper to call them from UDP handlers.
```javascript
// ============================================================================
// UDP-TO-TRANSLATION INTEGRATION FUNCTION
// Connects UDP PCM sockets TO existing translation pipeline in STTTTSserver.js
// Calls EXISTING functions: transcribeAudio, translateText, synthesizeSpeech, etc.
// Flow: Buffer PCM → Add WAV header → STT → Translate → TTS → Convert to PCM → Send via UDP
// ============================================================================

async function processUdpPcmAudio(sourceExtension, pcmBuffer, sourceLang) {
  try {
    udpPcmStats.translationRequests++;

    const targetExtension = sourceExtension === '3333' ? '4444' : '3333';
    const targetLang = sourceLang === 'en' ? 'fr' : 'en';

    console.log(`[UDP-${sourceExtension}] Starting translation: ${sourceLang} → ${targetLang}`);

    // Step 1: Add WAV header for STT (EXISTING function)
    const wavAudio = addWavHeader(pcmBuffer);

    // Step 2: Transcribe audio (EXISTING function - calls Deepgram)
    const transcribedText = await transcribeAudio(wavAudio, sourceLang);
    if (!transcribedText || transcribedText.trim() === '') {
      console.log(`[UDP-${sourceExtension}] No speech detected, skipping translation`);
      return;
    }
    console.log(`[UDP-${sourceExtension}] Transcribed: "${transcribedText}"`);

    // Step 3: Translate text (EXISTING function - calls DeepL)
    const translatedText = await translateText(transcribedText, sourceLang, targetLang);
    console.log(`[UDP-${sourceExtension}→${targetExtension}] Translated: "${translatedText}"`);

    // Step 4: Synthesize speech (EXISTING function - calls ElevenLabs)
    const mp3Buffer = await synthesizeSpeech(translatedText, targetLang);
    console.log(`[UDP-${sourceExtension}→${targetExtension}] Generated ${mp3Buffer.length} bytes MP3`);

    // Step 5: Convert MP3 to PCM16 (EXISTING function)
    const translatedPcm = await convertMp3ToPcm16(mp3Buffer);
    console.log(`[UDP-${sourceExtension}→${targetExtension}] Converted to ${translatedPcm.length} bytes PCM`);

    // Step 6: Send translated audio to opposite extension (NEW function - see Step 1.8)
    await sendUdpPcmAudio(targetExtension, translatedPcm);

    udpPcmStats.translationSuccesses++;
    console.log(`[UDP-${sourceExtension}→${targetExtension}] ✓ Translation complete`);

  } catch (error) {
    console.error(`[UDP-${sourceExtension}] Translation error:`, error.message);
    udpPcmStats.translationErrors++;
  }
}
```

#### Step 1.8: Create Send Function

**NEW Function (sends translated PCM back to gateways):**
```javascript
// ============================================================================
// SEND UDP PCM AUDIO
// Sends PCM audio to gateway in 20ms frames (640 bytes each)
// ============================================================================

async function sendUdpPcmAudio(targetExtension, pcmBuffer) {
  const socket = targetExtension === '3333' ? socket3333Out : socket4444Out;
  const port = targetExtension === '3333' ? UDP_PCM_CONFIG.port3333Out : UDP_PCM_CONFIG.port4444Out;

  const frameSize = UDP_PCM_CONFIG.frameSizeBytes;
  const totalFrames = Math.floor(pcmBuffer.length / frameSize);

  console.log(`[UDP-${targetExtension}] Sending ${pcmBuffer.length} bytes (${totalFrames} frames) to port ${port}`);

  // Send audio in 20ms frames
  for (let i = 0; i < totalFrames; i++) {
    const frame = pcmBuffer.slice(i * frameSize, (i + 1) * frameSize);

    await new Promise((resolve, reject) => {
      socket.send(frame, port, UDP_PCM_CONFIG.gatewayHost, (err) => {
        if (err) {
          console.error(`[UDP-${targetExtension}] Error sending frame ${i}:`, err.message);
          reject(err);
        } else {
          if (targetExtension === '3333') {
            udpPcmStats.to3333Packets++;
          } else {
            udpPcmStats.to4444Packets++;
          }
          resolve();
        }
      });
    });

    // Small delay to prevent overwhelming gateway (20ms per frame)
    await new Promise(resolve => setTimeout(resolve, 20));
  }

  console.log(`[UDP-${targetExtension}] ✓ Sent ${totalFrames} frames`);
}
```

#### Step 1.9: Create Socket Binding

**From conf-server-phase1.js pattern:**
```javascript
// ============================================================================
// BIND UDP PCM SOCKETS
// ============================================================================

// Extension 3333 IN (receive from gateway)
socket3333In.bind(UDP_PCM_CONFIG.port3333In, () => {
  console.log(`[UDP-3333] ✓ Listening for gateway-3333 on UDP ${UDP_PCM_CONFIG.port3333In}`);
});

socket3333In.on('listening', () => {
  const addr = socket3333In.address();
  console.log(`[UDP-3333] Bound to ${addr.address}:${addr.port}`);
});

// Extension 3333 OUT (send to gateway)
socket3333Out.bind(() => {
  console.log(`[UDP-3333] ✓ Ready to send to gateway-3333 via UDP ${UDP_PCM_CONFIG.port3333Out}`);
});

// Extension 4444 IN (receive from gateway)
socket4444In.bind(UDP_PCM_CONFIG.port4444In, () => {
  console.log(`[UDP-4444] ✓ Listening for gateway-4444 on UDP ${UDP_PCM_CONFIG.port4444In}`);
});

socket4444In.on('listening', () => {
  const addr = socket4444In.address();
  console.log(`[UDP-4444] Bound to ${addr.address}:${addr.port}`);
});

// Extension 4444 OUT (send to gateway)
socket4444Out.bind(() => {
  console.log(`[UDP-4444] ✓ Ready to send to gateway-4444 via UDP ${UDP_PCM_CONFIG.port4444Out}`);
});

console.log('\n' + '='.repeat(60));
console.log('  UDP PCM TRANSLATION SOCKETS ACTIVE');
console.log('='.repeat(60));
console.log('Extension 3333 (EN): IN=6120, OUT=6121');
console.log('Extension 4444 (FR): IN=6122, OUT=6123');
console.log('='.repeat(60) + '\n');
```

#### Step 1.10: Add Statistics Logging

**NEW Addition:**
```javascript
// ============================================================================
// UDP PCM STATISTICS LOGGING
// Reports stats every 30 seconds
// ============================================================================

setInterval(() => {
  const uptime = Math.floor((Date.now() - udpPcmStats.startTime) / 1000);
  const successRate = udpPcmStats.translationRequests > 0
    ? (udpPcmStats.translationSuccesses / udpPcmStats.translationRequests * 100).toFixed(1)
    : 0;

  console.log('\n' + '='.repeat(60));
  console.log('  UDP PCM TRANSLATION STATISTICS');
  console.log('='.repeat(60));
  console.log(`Uptime:           ${uptime}s`);
  console.log(`Extension 3333:   RX=${udpPcmStats.from3333Packets} packets, TX=${udpPcmStats.to3333Packets} packets`);
  console.log(`Extension 4444:   RX=${udpPcmStats.from4444Packets} packets, TX=${udpPcmStats.to4444Packets} packets`);
  console.log(`Translations:     ${udpPcmStats.translationRequests} requests, ${udpPcmStats.translationSuccesses} successes (${successRate}%)`);
  console.log(`Errors:           ${udpPcmStats.translationErrors}`);
  console.log('='.repeat(60) + '\n');
}, 30000);
```

---

### PHASE 2: Integration into STTTTSserver.js

#### Step 2.1: Find Insertion Point

**Target File:** `3333_4444__Operational/STTTTSserver/STTTTSserver.js`

```bash
# View end of baseline file
tail -50 3333_4444__Operational/STTTTSserver/STTTTSserver.js
```

**Insertion Location:** After final initialization code, before closing of server startup

#### Step 2.2: Create Complete Merged Code Block

**Save assembled code to temporary file:**
```bash
cat > /tmp/udp-pcm-merger-complete.js << 'EOF'
// ============================================================================
// UDP PCM SOCKET INTEGRATION
// Merged from: 3333_4444__Operational/Gateway/conf-server-phase1.js
//
// PURPOSE: Use proven PCM sockets with gateway-3333-buffered.js and
//          gateway-4444-buffered.js for real-time translation
//
// CHANGES FROM conf-server-phase1.js:
// - REMOVED: Direct cross-patch logic (lines 186, 221)
// - REMOVED: WebSocket server (port 3020 conflict with Socket.IO)
// - ADDED: Audio buffering for translation
// - ADDED: Translation pipeline integration (STT → Translate → TTS)
// - REPLACED: broadcastAudio() → global.io.emit()
// ============================================================================

const dgram = require('dgram');

// Configuration (from conf-server-phase1.js lines 28-40)
const UDP_PCM_CONFIG = {
  port3333In: 6120,
  port3333Out: 6121,
  port4444In: 6122,
  port4444Out: 6123,
  gatewayHost: '127.0.0.1',
  sampleRate: 16000,
  channels: 1,
  frameSizeMs: 20,
  frameSizeBytes: 640,
  bufferThreshold: 32000
};

// Socket Creation (from conf-server-phase1.js lines 62-65)
const socket3333In = dgram.createSocket('udp4');
const socket3333Out = dgram.createSocket('udp4');
const socket4444In = dgram.createSocket('udp4');
const socket4444Out = dgram.createSocket('udp4');

// Statistics
let udpPcmStats = {
  from3333Packets: 0,
  to3333Packets: 0,
  from4444Packets: 0,
  to4444Packets: 0,
  translationRequests: 0,
  translationSuccesses: 0,
  translationErrors: 0,
  startTime: Date.now()
};

// Audio Buffering
const udpAudioBuffers = new Map();
udpAudioBuffers.set('3333', {
  chunks: [],
  totalBytes: 0,
  language: 'en',
  lastProcessed: Date.now()
});
udpAudioBuffers.set('4444', {
  chunks: [],
  totalBytes: 0,
  language: 'fr',
  lastProcessed: Date.now()
});

// Extension 3333 Handler (based on conf-server-phase1.js lines 175-196)
socket3333In.on('message', async (msg, rinfo) => {
  udpPcmStats.from3333Packets++;

  if (udpPcmStats.from3333Packets <= 5) {
    console.log(`[UDP-3333] Gateway connected: ${msg.length} bytes/frame (packet #${udpPcmStats.from3333Packets})`);
  }

  if (global.io) {
    global.io.emit('audioStream', {
      extension: '3333',
      buffer: msg,
      sampleRate: UDP_PCM_CONFIG.sampleRate,
      channels: UDP_PCM_CONFIG.channels,
      timestamp: Date.now(),
      transport: 'udp-pcm',
      source: 'microphone'
    });
  }

  const buffer = udpAudioBuffers.get('3333');
  buffer.chunks.push(Buffer.from(msg));
  buffer.totalBytes += msg.length;

  if (buffer.totalBytes >= UDP_PCM_CONFIG.bufferThreshold) {
    const combinedBuffer = Buffer.concat(buffer.chunks);
    buffer.chunks = [];
    buffer.totalBytes = 0;
    buffer.lastProcessed = Date.now();

    console.log(`[UDP-3333] Processing ${combinedBuffer.length} bytes`);
    await processUdpPcmAudio('3333', combinedBuffer, 'en');
  }
});

socket3333In.on('error', (err) => {
  console.error(`[UDP-3333] Socket error:`, err.message);
  udpPcmStats.translationErrors++;
});

// Extension 4444 Handler (based on conf-server-phase1.js lines 210-231)
socket4444In.on('message', async (msg, rinfo) => {
  udpPcmStats.from4444Packets++;

  if (udpPcmStats.from4444Packets <= 5) {
    console.log(`[UDP-4444] Gateway connected: ${msg.length} bytes/frame (packet #${udpPcmStats.from4444Packets})`);
  }

  if (global.io) {
    global.io.emit('audioStream', {
      extension: '4444',
      buffer: msg,
      sampleRate: UDP_PCM_CONFIG.sampleRate,
      channels: UDP_PCM_CONFIG.channels,
      timestamp: Date.now(),
      transport: 'udp-pcm',
      source: 'microphone'
    });
  }

  const buffer = udpAudioBuffers.get('4444');
  buffer.chunks.push(Buffer.from(msg));
  buffer.totalBytes += msg.length;

  if (buffer.totalBytes >= UDP_PCM_CONFIG.bufferThreshold) {
    const combinedBuffer = Buffer.concat(buffer.chunks);
    buffer.chunks = [];
    buffer.totalBytes = 0;
    buffer.lastProcessed = Date.now();

    console.log(`[UDP-4444] Processing ${combinedBuffer.length} bytes`);
    await processUdpPcmAudio('4444', combinedBuffer, 'fr');
  }
});

socket4444In.on('error', (err) => {
  console.error(`[UDP-4444] Socket error:`, err.message);
  udpPcmStats.translationErrors++;
});

// UDP-to-Translation Integration Function
// Connects UDP sockets TO existing translation functions in STTTTSserver.js
async function processUdpPcmAudio(sourceExtension, pcmBuffer, sourceLang) {
  try {
    udpPcmStats.translationRequests++;

    const targetExtension = sourceExtension === '3333' ? '4444' : '3333';
    const targetLang = sourceLang === 'en' ? 'fr' : 'en';

    console.log(`[UDP-${sourceExtension}] Starting translation: ${sourceLang} → ${targetLang}`);

    // Calls EXISTING functions from STTTTSserver.js
    const wavAudio = addWavHeader(pcmBuffer);
    const transcribedText = await transcribeAudio(wavAudio, sourceLang);

    if (!transcribedText || transcribedText.trim() === '') {
      console.log(`[UDP-${sourceExtension}] No speech detected`);
      return;
    }
    console.log(`[UDP-${sourceExtension}] Transcribed: "${transcribedText}"`);

    const translatedText = await translateText(transcribedText, sourceLang, targetLang);
    console.log(`[UDP-${sourceExtension}→${targetExtension}] Translated: "${translatedText}"`);

    const mp3Buffer = await synthesizeSpeech(translatedText, targetLang);
    console.log(`[UDP-${sourceExtension}→${targetExtension}] Generated ${mp3Buffer.length} bytes MP3`);

    const translatedPcm = await convertMp3ToPcm16(mp3Buffer);
    console.log(`[UDP-${sourceExtension}→${targetExtension}] Converted to ${translatedPcm.length} bytes PCM`);

    await sendUdpPcmAudio(targetExtension, translatedPcm);

    udpPcmStats.translationSuccesses++;
    console.log(`[UDP-${sourceExtension}→${targetExtension}] ✓ Translation complete`);

  } catch (error) {
    console.error(`[UDP-${sourceExtension}] Translation error:`, error.message);
    udpPcmStats.translationErrors++;
  }
}

// Send Function
async function sendUdpPcmAudio(targetExtension, pcmBuffer) {
  const socket = targetExtension === '3333' ? socket3333Out : socket4444Out;
  const port = targetExtension === '3333' ? UDP_PCM_CONFIG.port3333Out : UDP_PCM_CONFIG.port4444Out;

  const frameSize = UDP_PCM_CONFIG.frameSizeBytes;
  const totalFrames = Math.floor(pcmBuffer.length / frameSize);

  console.log(`[UDP-${targetExtension}] Sending ${pcmBuffer.length} bytes (${totalFrames} frames)`);

  for (let i = 0; i < totalFrames; i++) {
    const frame = pcmBuffer.slice(i * frameSize, (i + 1) * frameSize);

    await new Promise((resolve, reject) => {
      socket.send(frame, port, UDP_PCM_CONFIG.gatewayHost, (err) => {
        if (err) {
          reject(err);
        } else {
          if (targetExtension === '3333') {
            udpPcmStats.to3333Packets++;
          } else {
            udpPcmStats.to4444Packets++;
          }
          resolve();
        }
      });
    });

    await new Promise(resolve => setTimeout(resolve, 20));
  }

  console.log(`[UDP-${targetExtension}] ✓ Sent ${totalFrames} frames`);
}

// Socket Binding
socket3333In.bind(UDP_PCM_CONFIG.port3333In, () => {
  console.log(`[UDP-3333] ✓ Listening on UDP ${UDP_PCM_CONFIG.port3333In}`);
});

socket3333In.on('listening', () => {
  const addr = socket3333In.address();
  console.log(`[UDP-3333] Bound to ${addr.address}:${addr.port}`);
});

socket3333Out.bind(() => {
  console.log(`[UDP-3333] ✓ Ready to send via UDP ${UDP_PCM_CONFIG.port3333Out}`);
});

socket4444In.bind(UDP_PCM_CONFIG.port4444In, () => {
  console.log(`[UDP-4444] ✓ Listening on UDP ${UDP_PCM_CONFIG.port4444In}`);
});

socket4444In.on('listening', () => {
  const addr = socket4444In.address();
  console.log(`[UDP-4444] Bound to ${addr.address}:${addr.port}`);
});

socket4444Out.bind(() => {
  console.log(`[UDP-4444] ✓ Ready to send via UDP ${UDP_PCM_CONFIG.port4444Out}`);
});

console.log('\n' + '='.repeat(60));
console.log('  UDP PCM TRANSLATION SOCKETS ACTIVE');
console.log('='.repeat(60));
console.log('Extension 3333 (EN): IN=6120, OUT=6121');
console.log('Extension 4444 (FR): IN=6122, OUT=6123');
console.log('='.repeat(60) + '\n');

// Statistics Logging
setInterval(() => {
  const uptime = Math.floor((Date.now() - udpPcmStats.startTime) / 1000);
  const successRate = udpPcmStats.translationRequests > 0
    ? (udpPcmStats.translationSuccesses / udpPcmStats.translationRequests * 100).toFixed(1)
    : 0;

  console.log('\n' + '='.repeat(60));
  console.log('  UDP PCM STATS');
  console.log('='.repeat(60));
  console.log(`Uptime: ${uptime}s`);
  console.log(`3333: RX=${udpPcmStats.from3333Packets}, TX=${udpPcmStats.to3333Packets}`);
  console.log(`4444: RX=${udpPcmStats.from4444Packets}, TX=${udpPcmStats.to4444Packets}`);
  console.log(`Translations: ${udpPcmStats.translationRequests} requests, ${udpPcmStats.translationSuccesses} OK (${successRate}%)`);
  console.log(`Errors: ${udpPcmStats.translationErrors}`);
  console.log('='.repeat(60) + '\n');
}, 30000);
EOF
```

#### Step 2.3: Apply Merger

```bash
# Append merged code to STTTTSserver.js
cat /tmp/udp-pcm-merger-complete.js >> 3333_4444__Operational/STTTTSserver/STTTTSserver.js

# Verify syntax
node --check 3333_4444__Operational/STTTTSserver/STTTTSserver.js

# Check line count
wc -l 3333_4444__Operational/STTTTSserver/STTTTSserver.js
```

---

### PHASE 3: Deployment & Testing

#### Step 3.1: Deploy to Remote Server

```bash
# Stop running processes
ssh azureuser@20.170.155.53 "pkill -f STTTTSserver.js"

# Copy merged file
scp 3333_4444__Operational/STTTTSserver/STTTTSserver.js \
    azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/

# Verify transfer
ssh azureuser@20.170.155.53 \
  "wc -l /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js"
```

#### Step 3.2: Start Merged Server

```bash
ssh azureuser@20.170.155.53 << 'EOF'
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver

# Syntax check
node --check STTTTSserver.js

# Start server
nohup node STTTTSserver.js > /tmp/sttttserver-merged.log 2>&1 &

sleep 5

# Verify running
pgrep -af STTTTSserver.js

# Check ports
ss -tlnp | grep 3020
ss -ulnp | grep -E '612[0-3]'

# Show startup log
tail -50 /tmp/sttttserver-merged.log
EOF
```

**Expected Output:**
```
[UDP-3333] ✓ Listening on UDP 6120
[UDP-3333] Bound to 0.0.0.0:6120
[UDP-3333] ✓ Ready to send via UDP 6121
[UDP-4444] ✓ Listening on UDP 6122
[UDP-4444] Bound to 0.0.0.0:6122
[UDP-4444] ✓ Ready to send via UDP 6123
============================================================
  UDP PCM TRANSLATION SOCKETS ACTIVE
============================================================
Extension 3333 (EN): IN=6120, OUT=6121
Extension 4444 (FR): IN=6122, OUT=6123
============================================================
```

#### Step 3.3: Verify Dashboard Access

```bash
# Test dashboard endpoints
curl -I http://20.170.155.53:3020/dashboard.html
curl -I http://20.170.155.53:3020/
```

**Expected:** Both should return HTTP 200 OK

#### Step 3.4: Test Translation Flow

```bash
# Monitor logs
ssh azureuser@20.170.155.53 "tail -f /tmp/sttttserver-merged.log | grep -E 'UDP-|Transcribed|Translated'" &

# Start gateway-3333
ssh azureuser@20.170.155.53 \
  "cd /home/azureuser/translation-app/3333_4444__Operational/Gateway && \
   nohup node gateway-3333-buffered.js > /tmp/gateway-3333.log 2>&1 &"

# Start gateway-4444
ssh azureuser@20.170.155.53 \
  "cd /home/azureuser/translation-app/3333_4444__Operational/Gateway && \
   nohup node gateway-4444-buffered.js > /tmp/gateway-4444.log 2>&1 &"

# Wait for connections
sleep 5
```

**Test Call:**
1. Call extension 3333
2. Speak in English
3. Verify translated French is received on extension 4444

**Expected Log Output:**
```
[UDP-3333] Gateway connected: 640 bytes/frame (packet #1)
[UDP-3333] Processing 32000 bytes
[UDP-3333] Starting translation: en → fr
[UDP-3333] Transcribed: "Hello, how are you?"
[UDP-3333→4444] Translated: "Bonjour, comment allez-vous?"
[UDP-3333→4444] Generated 48000 bytes MP3
[UDP-3333→4444] Converted to 48000 bytes PCM
[UDP-4444] Sending 48000 bytes (75 frames)
[UDP-4444] ✓ Sent 75 frames
[UDP-3333→4444] ✓ Translation complete
```

---

### PHASE 4: Rollback & QA Isolation Procedures

#### Isolated Testing Environment

**Purpose:** Test 3333/4444 system without interference from other processes

**Step 4.1: Kill Interfering Processes**

```bash
ssh azureuser@20.170.155.53 << 'EOF'
# Kill gateway-9007-9008.js (ensure it doesn't run)
pkill -f gateway-9007-9008.js
pgrep -af gateway-9007 || echo "✓ gateway-9007-9008 NOT running"

# Kill conf-server-phase1.js (ensure it doesn't run)
pkill -f conf-server-phase1.js
pgrep -af conf-server-phase1 || echo "✓ conf-server-phase1 NOT running"

# Verify clean state
echo "=== Active Translation Processes ==="
pgrep -af "gateway|STTTTSserver|conf-server"
EOF
```

**Result:** Only STTTTSserver.js and gateway-3333/4444 should be running

**Step 4.2: Keep Same Ports (No Changes)**

Ports 6120-6123 remain unchanged. This ensures:
- gateway-3333-buffered.js still connects to correct ports
- gateway-4444-buffered.js still connects to correct ports
- No Asterisk configuration changes needed

**Step 4.3: Rollback Procedure**

If merger has issues, rollback to baseline:

```bash
ssh azureuser@20.170.155.53 << 'EOF'
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver

# Stop merged server
pkill -f STTTTSserver.js

# Find most recent backup
BACKUP=$(ls -t STTTTSserver.js.before-merger-* | head -1)
echo "Restoring from: $BACKUP"

# Restore backup
cp "$BACKUP" STTTTSserver.js

# Restart
nohup node STTTTSserver.js > /tmp/sttttserver-rollback.log 2>&1 &

# Verify
sleep 3
pgrep -af STTTTSserver.js
tail -30 /tmp/sttttserver-rollback.log
EOF
```

---

### PHASE 5: Regression Testing

#### Test Plan for 5555/6666 System

```bash
ssh azureuser@20.170.155.53 << 'EOF'
# Verify 5555/6666 system is unaffected
cd /home/azureuser/translation-app/5555-6666-gstreamer-phase1

# Check if running
pgrep -af "conf-server-phase1|gateway-5555|gateway-6666"

# If not running, start for test
nohup node conf-server-phase1.js > /tmp/conf-server-test.log 2>&1 &
nohup node gateway-5555-buffered.js > /tmp/gateway-5555-test.log 2>&1 &
nohup node gateway-6666-buffered.js > /tmp/gateway-6666-test.log 2>&1 &

sleep 5

# Verify ports
ss -ulnp | grep -E '610[0-3]'
EOF
```

**Regression Test:**
1. Call extension 5555
2. Speak in English
3. Verify audio is heard on extension 6666 (cross-patch, NO translation)
4. Result: Should work EXACTLY as before merger

#### Test Plan for 7777/8888 System

```bash
ssh azureuser@20.170.155.53 << 'EOF'
cd /home/azureuser/translation-app/7777-8888-stack

# Check if running
pgrep -af "conference-server|gateway-7777|gateway-8888"

# Verify ports
ss -ulnp | grep -E '700[0-3]'
EOF
```

**Regression Test:**
1. Call extension 7777
2. Speak in English
3. Verify translation to French on extension 8888
4. Result: Should work EXACTLY as before merger

---

## Summary of Changes

### What Was Extracted from conf-server-phase1.js

| Component | Lines in Original | Adaptation |
|-----------|-------------------|------------|
| Configuration | 28-40 | Kept ports 6120-6123, removed wsPort |
| Socket creation | 62-65 | No changes (already 3333/4444) |
| Stats tracking | 52-59 | Added translation counters |
| Message handlers | 175-196, 210-231 | Removed cross-patch logic |

### What Was Removed from conf-server-phase1.js

- ❌ Line 186: Direct cross-patch `socket4444Out.send()` in socket3333In handler
- ❌ Line 221: Direct cross-patch `socket3333Out.send()` in socket4444In handler
- ❌ WebSocket server (lines 68-170) - port 3020 conflict
- ❌ broadcastAudio function - replaced with global.io.emit

### What Was Added (Not in conf-server-phase1.js)

- ✅ Audio buffering logic (~1 second / 32000 bytes)
- ✅ Translation pipeline integration
- ✅ processUdpPcmAudio function
- ✅ sendUdpPcmAudio function
- ✅ Translation-specific statistics

---

## Port Summary

### After Merger

| System | Extension | IN Port | OUT Port | Status |
|--------|-----------|---------|----------|--------|
| 3333/4444 | 3333 | 6120 | 6121 | Active with translation |
| 3333/4444 | 4444 | 6122 | 6123 | Active with translation |
| 5555/6666 | 5555 | 6100 | 6101 | Unchanged (cross-patch) |
| 5555/6666 | 6666 | 6102 | 6103 | Unchanged (cross-patch) |
| 7777/8888 | 7777 | 7000 | 7001 | Unchanged (translation) |
| 7777/8888 | 8888 | 7002 | 7003 | Unchanged (translation) |

### HTTP/WebSocket Ports

| Service | Port | URL | Status |
|---------|------|-----|--------|
| STTTTSserver Socket.IO | 3020 | http://20.170.155.53:3020/ | Active |
| STTTTSserver Dashboard | 3020 | http://20.170.155.53:3020/dashboard.html | Active |
| conf-server-phase1 WebSocket | 3020 | (removed - conflict) | Merged into Socket.IO |

---

## Success Criteria

- [ ] File syntax valid (`node --check` passes)
- [ ] Server starts without errors
- [ ] UDP ports 6120-6123 listening
- [ ] Dashboard accessible at http://20.170.155.53:3020/dashboard.html
- [ ] Root page accessible at http://20.170.155.53:3020/
- [ ] Gateway-3333 connects successfully
- [ ] Gateway-4444 connects successfully
- [ ] Audio packets received (stats increment)
- [ ] Translation pipeline triggers
- [ ] Translated audio sent to opposite gateway
- [ ] Bidirectional translation works (3333↔4444)
- [ ] gateway-9007-9008.js NOT running (isolated QA)
- [ ] conf-server-phase1.js NOT running (isolated QA)
- [ ] Extensions 5555/6666 unaffected (regression test)
- [ ] Extensions 7777/8888 unaffected (regression test)

---

## Rollback Procedures

### Quick Rollback (Remote Server)

```bash
ssh azureuser@20.170.155.53 << 'EOF'
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
pkill -f STTTTSserver.js
cp STTTTSserver.js.before-merger-$(ls -t STTTTSserver.js.before-merger-* | head -1) STTTTSserver.js
nohup node STTTTSserver.js > /tmp/sttttserver-rollback.log 2>&1 &
EOF
```

### Full Rollback (Git Reset)

```bash
cd /Users/sagivstavinsky/realtime-translation-enhanced_astrix
git checkout Working_5555-6_7777-8_Getaway_no_STTTTSserver -- 3333_4444__Operational/
scp 3333_4444__Operational/STTTTSserver/STTTTSserver.js \
    azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/
ssh azureuser@20.170.155.53 "pkill -f STTTTSserver.js && cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && nohup node STTTTSserver.js > /tmp/sttttserver.log 2>&1 &"
```

---

## File Comparison

### Before Merger
```
conf-server-phase1.js:    338 lines (cross-patch behavior)
STTTTSserver.js:         ~2732 lines (translation pipeline)
Total:                   ~3070 lines (separate files)
```

### After Merger
```
STTTTSserver.js:         ~3000 lines (merged)
  - Baseline:             2732 lines
  - UDP PCM code:         ~270 lines
  - Net addition:         ~270 lines

conf-server-phase1.js:    338 lines (preserved, not used)
```

---

**END OF MERGER PLAN**
