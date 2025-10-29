# Option 1: Hybrid Approach - Detailed Implementation Guide

**Strategy**: Keep AudioSocket architecture, upgrade to 16kHz, add STS3 best practices incrementally

**Total Timeline**: 3-4 weeks
**Risk Level**: LOW (incremental changes, always operational)
**Recommended**: ✅ YES - Best balance of risk vs benefit

---

## Overview

This hybrid approach preserves your working translation pipeline (AudioSocket + DeepL + ElevenLabs) while incrementally adopting STS3 best practices:

1. ✅ **Upgrade audio quality**: 8kHz → 16kHz (better transcription)
2. ✅ **Modernize codebase**: JavaScript → TypeScript (type safety)
3. ✅ **Add modularity**: Split monolithic file into clean modules
4. ✅ **Browser interface**: WebSocket UI for monitoring
5. ✅ **Advanced features**: Deepgram VAD, utterance detection

**Key Principle**: Each phase is independently deployable and testable.

---

## Phase 1: Audio Quality Upgrade (16kHz Migration)

**Duration**: 4-6 hours
**Risk**: LOW
**Prerequisite**: Asterisk 20 installed (currently compiling)

### 1.1 Understanding the Change

**Current System**:
- Sample Rate: 8000 Hz
- Format: `slin` (signed linear PCM)
- Frame Size: 320 bytes (8000 Hz × 2 bytes × 0.02s)
- Frame Rate: 50 fps
- Quality: Telephone quality
- Deepgram Accuracy: ~85-90%

**Target System**:
- Sample Rate: 16000 Hz
- Format: `slin16` (signed linear PCM 16kHz)
- Frame Size: 640 bytes (16000 Hz × 2 bytes × 0.02s)
- Frame Rate: 50 fps (unchanged)
- Quality: Wideband audio
- Deepgram Accuracy: ~92-96% (estimated +5-10% improvement)

**Impact**: Better speech recognition, clearer audio, more accurate translations

---

### 1.2 Step-by-Step Implementation

#### Step 1.2.1: Update Asterisk Dialplan

**File**: `/etc/asterisk/extensions.conf`

**Current Configuration** (Extension 7000):
```conf
exten => 7000,1,NoOp(=== AudioSocket Extension 7000 ===)
  same => n,Set(UUID1=${RAND(10000000,99999999)})
  same => n,Set(UUID2=${RAND(1000,9999)})
  same => n,Set(UUID3=${RAND(1000,9999)})
  same => n,Set(UUID4=${RAND(1000,9999)})
  same => n,Set(UUID5A=${RAND(100000,999999)})
  same => n,Set(UUID5B=${RAND(100000,999999)})
  same => n,Set(CALL_UUID=${UUID1}-${UUID2}-${UUID3}-${UUID4}-${UUID5A}${UUID5B})
  same => n,Answer()
  same => n,NoOp(Call UUID: ${CALL_UUID})
  same => n,AudioSocket(${CALL_UUID},127.0.0.1:5050)
  same => n,Hangup()
```

**NEW Configuration** (16kHz upgrade):
```conf
exten => 7000,1,NoOp(=== AudioSocket Extension 7000 - 16kHz ===)
  same => n,Set(UUID1=${RAND(10000000,99999999)})
  same => n,Set(UUID2=${RAND(1000,9999)})
  same => n,Set(UUID3=${RAND(1000,9999)})
  same => n,Set(UUID4=${RAND(1000,9999)})
  same => n,Set(UUID5A=${RAND(100000,999999)})
  same => n,Set(UUID5B=${RAND(100000,999999)})
  same => n,Set(CALL_UUID=${UUID1}-${UUID2}-${UUID3}-${UUID4}-${UUID5A}${UUID5B})
  same => n,Answer()
  same => n,NoOp(Call UUID: ${CALL_UUID})
  ; *** NEW: Force 16kHz audio format ***
  same => n,Set(CHANNEL(audiowriteformat)=slin16)
  same => n,Set(CHANNEL(audioreadformat)=slin16)
  same => n,AudioSocket(${CALL_UUID},127.0.0.1:5050)
  same => n,Hangup()
```

**Deployment Commands**:
```bash
# 1. Create updated extensions.conf locally
cat > /tmp/extensions-16khz.conf << 'EOF'
[general]
static=yes
writeprotect=no
clearglobalvars=no

[default]
; Extension 5000 - AudioSocket 16kHz
exten => 5000,1,NoOp(=== AudioSocket Extension 5000 - 16kHz ===)
  same => n,Set(UUID1=${RAND(10000000,99999999)})
  same => n,Set(UUID2=${RAND(1000,9999)})
  same => n,Set(UUID3=${RAND(1000,9999)})
  same => n,Set(UUID4=${RAND(1000,9999)})
  same => n,Set(UUID5A=${RAND(100000,999999)})
  same => n,Set(UUID5B=${RAND(100000,999999)})
  same => n,Set(CALL_UUID=${UUID1}-${UUID2}-${UUID3}-${UUID4}-${UUID5A}${UUID5B})
  same => n,Answer()
  same => n,NoOp(Call UUID: ${CALL_UUID})
  same => n,Set(CHANNEL(audiowriteformat)=slin16)
  same => n,Set(CHANNEL(audioreadformat)=slin16)
  same => n,AudioSocket(${CALL_UUID},127.0.0.1:5050)
  same => n,Hangup()

; Extension 6000 - AudioSocket 16kHz
exten => 6000,1,NoOp(=== AudioSocket Extension 6000 - 16kHz ===)
  same => n,Set(UUID1=${RAND(10000000,99999999)})
  same => n,Set(UUID2=${RAND(1000,9999)})
  same => n,Set(UUID3=${RAND(1000,9999)})
  same => n,Set(UUID4=${RAND(1000,9999)})
  same => n,Set(UUID5A=${RAND(100000,999999)})
  same => n,Set(UUID5B=${RAND(100000,999999)})
  same => n,Set(CALL_UUID=${UUID1}-${UUID2}-${UUID3}-${UUID4}-${UUID5A}${UUID5B})
  same => n,Answer()
  same => n,NoOp(Call UUID: ${CALL_UUID})
  same => n,Set(CHANNEL(audiowriteformat)=slin16)
  same => n,Set(CHANNEL(audioreadformat)=slin16)
  same => n,AudioSocket(${CALL_UUID},127.0.0.1:5050)
  same => n,Hangup()

; Extension 7000 - AudioSocket 16kHz
exten => 7000,1,NoOp(=== AudioSocket Extension 7000 - 16kHz ===)
  same => n,Set(UUID1=${RAND(10000000,99999999)})
  same => n,Set(UUID2=${RAND(1000,9999)})
  same => n,Set(UUID3=${RAND(1000,9999)})
  same => n,Set(UUID4=${RAND(1000,9999)})
  same => n,Set(UUID5A=${RAND(100000,999999)})
  same => n,Set(UUID5B=${RAND(100000,999999)})
  same => n,Set(CALL_UUID=${UUID1}-${UUID2}-${UUID3}-${UUID4}-${UUID5A}${UUID5B})
  same => n,Answer()
  same => n,NoOp(Call UUID: ${CALL_UUID})
  same => n,Set(CHANNEL(audiowriteformat)=slin16)
  same => n,Set(CHANNEL(audioreadformat)=slin16)
  same => n,AudioSocket(${CALL_UUID},127.0.0.1:5050)
  same => n,Hangup()

; Test echo extension (unchanged)
exten => 8888,1,NoOp(Echo test)
  same => n,Answer()
  same => n,Playback(hello-world)
  same => n,Echo()
  same => n,Hangup()

[from-internal]
include => default
EOF

# 2. Deploy to Azure VM
scp /tmp/extensions-16khz.conf azureuser@4.185.84.26:~/extensions.conf

# 3. Install on server
ssh azureuser@4.185.84.26 "sudo mv ~/extensions.conf /etc/asterisk/extensions.conf && sudo chown asterisk:asterisk /etc/asterisk/extensions.conf && sudo asterisk -rx 'dialplan reload'"

# 4. Verify
ssh azureuser@4.185.84.26 "sudo asterisk -rx 'dialplan show default'"
```

---

#### Step 1.2.2: Update Node.js Server (conference-server.js)

**Critical Changes**:
1. Frame size: 320 → 640 bytes
2. Deepgram sample rate: 8000 → 16000
3. ElevenLabs output: 8kHz → 16kHz

**Location**: `/home/azureuser/translation-app/conference-server.js`

**Change 1: AudioSocket Frame Size**

**Find this section** (around line 150-200):
```javascript
const FRAME_SIZE = 320;  // 8kHz: 8000 Hz × 2 bytes × 0.02s
```

**Replace with**:
```javascript
const FRAME_SIZE = 640;  // 16kHz: 16000 Hz × 2 bytes × 0.02s
const SAMPLE_RATE = 16000;  // 16kHz for better ASR quality
```

**Change 2: AudioSocket Frame Handler**

**Find** (around line 300-350):
```javascript
function handleAudioFrame(uuid, audioData) {
    if (audioData.length !== 320) {  // Expecting 320 bytes @ 8kHz
        console.warn(`[${uuid}] Unexpected audio frame size: ${audioData.length}`);
    }
    // ... rest of handler
}
```

**Replace with**:
```javascript
function handleAudioFrame(uuid, audioData) {
    if (audioData.length !== 640) {  // Expecting 640 bytes @ 16kHz
        console.warn(`[${uuid}] Unexpected audio frame size: ${audioData.length} (expected 640)`);
        return;  // Reject invalid frames
    }

    // Verify frame is valid PCM16 data
    if (!Buffer.isBuffer(audioData)) {
        console.error(`[${uuid}] Audio data is not a Buffer`);
        return;
    }

    // ... rest of handler
}
```

**Change 3: Deepgram Configuration**

**Find** (around line 500-550):
```javascript
const deepgramOptions = {
    model: 'nova-2',
    language: 'en',
    smart_format: true,
    punctuate: true,
    interim_results: true,
    sample_rate: 8000,        // ❌ OLD: 8kHz
    encoding: 'linear16',
    channels: 1
};
```

**Replace with**:
```javascript
const deepgramOptions = {
    model: 'nova-2',
    language: 'multi',          // ✅ NEW: Multi-language auto-detect
    smart_format: true,
    punctuate: true,
    interim_results: true,
    sample_rate: 16000,         // ✅ NEW: 16kHz for better accuracy
    encoding: 'linear16',
    channels: 1,
    // ✅ NEW: Advanced features from STS3
    endpointing: 300,           // Detect utterance end after 300ms silence
    utterance_end_ms: 1000,     // Finalize after 1s silence
    vad_events: true            // Voice activity detection events
};
```

**Change 4: ElevenLabs TTS Configuration**

**Find** (around line 800-850):
```javascript
const elevenlabsConfig = {
    voice_id: 'your_voice_id',
    model_id: 'eleven_monolingual_v1',
    output_format: 'pcm_16000'  // Or whatever is current
};
```

**Replace with**:
```javascript
const elevenlabsConfig = {
    voice_id: 'your_voice_id',
    model_id: 'eleven_monolingual_v1',
    output_format: 'pcm_16000',  // ✅ Ensure 16kHz output
    optimize_streaming_latency: 3  // Balance quality vs latency
};
```

**Change 5: Audio Buffer Management**

**Find** (buffer handling code):
```javascript
let audioBuffer = Buffer.alloc(0);
const BUFFER_THRESHOLD = 3200;  // 10 frames @ 8kHz
```

**Replace with**:
```javascript
let audioBuffer = Buffer.alloc(0);
const BUFFER_THRESHOLD = 6400;  // 10 frames @ 16kHz (640 bytes × 10)
const MIN_BUFFER_SIZE = 1280;   // Minimum 2 frames before processing
```

---

#### Step 1.2.3: Complete Updated conference-server.js Patch

**Create patch file**:
```bash
cat > /tmp/16khz-upgrade.patch << 'PATCH'
--- conference-server.js.old
+++ conference-server.js.new
@@ -12,8 +12,9 @@
 const { createClient } = require('@deepgram/sdk');

 // Audio configuration
-const FRAME_SIZE = 320;  // 8kHz: 8000 Hz × 2 bytes × 0.02s
-const SAMPLE_RATE = 8000;
+const FRAME_SIZE = 640;  // 16kHz: 16000 Hz × 2 bytes × 0.02s
+const SAMPLE_RATE = 16000;
+const FRAME_DURATION_MS = 20;  // 20ms frames

 // AudioSocket protocol constants
 const FRAME_TYPE_UUID = 0x01;
@@ -150,8 +151,8 @@
     });

     audioSocketServer.on('connection', (socket) => {
-        console.log('[AudioSocket] Client connected from', socket.remoteAddress);
-
+        const clientInfo = `${socket.remoteAddress}:${socket.remotePort}`;
+        console.log(`[AudioSocket] Client connected from ${clientInfo} (expecting 16kHz audio)`);
+
         let currentUUID = null;
         let frameBuffer = Buffer.alloc(0);

@@ -200,7 +201,7 @@
                     const audioData = payload;

                     // Validate frame size
-                    if (audioData.length !== 320) {
+                    if (audioData.length !== 640) {
                         console.warn(`[${currentUUID}] Unexpected audio frame size: ${audioData.length}`);
                     }

@@ -350,11 +351,14 @@
         const deepgramOptions = {
             model: 'nova-2',
-            language: 'en',
+            language: 'multi',  // Auto-detect language
             smart_format: true,
             punctuate: true,
             interim_results: true,
-            sample_rate: 8000,
+            sample_rate: 16000,
             encoding: 'linear16',
-            channels: 1
+            channels: 1,
+            endpointing: 300,
+            utterance_end_ms: 1000,
+            vad_events: true
         };
PATCH
```

**Apply changes**:
```bash
# 1. Backup current server
ssh azureuser@4.185.84.26 "cp /home/azureuser/translation-app/conference-server.js /home/azureuser/translation-app/conference-server.js.8khz.backup"

# 2. Download, patch, and re-upload
# (Manual editing recommended - use the changes above as reference)

# 3. Or use sed for specific changes
ssh azureuser@4.185.84.26 << 'REMOTE_SCRIPT'
cd /home/azureuser/translation-app

# Update FRAME_SIZE
sed -i 's/const FRAME_SIZE = 320;/const FRAME_SIZE = 640;/' conference-server.js

# Update SAMPLE_RATE
sed -i 's/const SAMPLE_RATE = 8000;/const SAMPLE_RATE = 16000;/' conference-server.js

# Update Deepgram sample_rate
sed -i 's/sample_rate: 8000,/sample_rate: 16000,/' conference-server.js

# Update frame size validation
sed -i 's/audioData.length !== 320/audioData.length !== 640/' conference-server.js

echo "✓ Applied 16kHz patches"
REMOTE_SCRIPT
```

---

#### Step 1.2.4: Restart Services and Test

**Restart Script**:
```bash
# Full restart with 16kHz configuration
ssh azureuser@4.185.84.26 << 'REMOTE_RESTART'
# Stop current server
killall -9 node
sleep 2

# Reload Asterisk dialplan
sudo asterisk -rx 'dialplan reload'

# Restart AudioSocket server with 16kHz
cd /home/azureuser/translation-app
DEEPGRAM_API_KEY=806ac77eb08d83390c265228dd2cc89c0b86f23e \
DEEPL_API_KEY=672097f6-2818-4022-be20-6f7118e12143:fx \
ELEVENLABS_API_KEY=sk_968d6d3e5b92cfce648ce9a38478ee131d98750ef4e09f05 \
/usr/bin/node conference-server.js > translation-app.log 2>&1 &

SERVERPID=$!
echo $SERVERPID > translation-app.pid

sleep 6

echo "========================================="
echo "  16kHz AUDIO UPGRADE DEPLOYED"
echo "  Sample Rate: 16000 Hz"
echo "  Frame Size: 640 bytes"
echo "  Server PID: $SERVERPID"
echo "========================================="

# Show startup logs
tail -50 translation-app.log
REMOTE_RESTART
```

---

#### Step 1.2.5: Testing and Validation

**Test Procedure**:

1. **Test Echo Extension (8888)** - Baseline test:
```bash
# From SIP phone: Dial 8888
# Expected: Hear "hello world" then echo
# Verifies: Asterisk is working
```

2. **Test Extension 7000** - 16kHz test:
```bash
# From SIP phone: Dial 7000
# Speak clearly: "This is a test of the sixteen kilohertz audio system"
# Expected: Better quality transcription
```

3. **Monitor Logs**:
```bash
# Terminal 1: Asterisk logs
ssh azureuser@4.185.84.26 "sudo tail -f /var/log/asterisk/messages | grep 7000"

# Terminal 2: Application logs
ssh azureuser@4.185.84.26 "tail -f ~/translation-app/translation-app.log"
```

4. **Verify Frame Size**:
```bash
# Look for these log messages:
# ✅ GOOD: "Received 640-byte audio frame"
# ❌ BAD: "Unexpected audio frame size: 320"
```

5. **Check Deepgram Connection**:
```bash
# Look for:
# ✅ "Deepgram connection opened (16000 Hz, linear16)"
# ✅ "Deepgram transcription: [text with high confidence]"
```

6. **Compare Transcription Quality**:
```bash
# Before (8kHz): Confidence ~0.85-0.90
# After (16kHz): Confidence ~0.92-0.96
# Improvement: +5-10% accuracy
```

---

### 1.3 Troubleshooting Phase 1

#### Problem: Still receiving 320-byte frames

**Cause**: Asterisk not applying `slin16` format

**Solution**:
```bash
# Check Asterisk version supports slin16
ssh azureuser@4.185.84.26 "sudo asterisk -rx 'core show codecs' | grep slin"

# Expected output should include:
# slin16     (Signed linear)

# If missing, verify Asterisk 20 is installed:
ssh azureuser@4.185.84.26 "sudo asterisk -V"
# Should show: Asterisk 20.x.x
```

#### Problem: Choppy or distorted audio

**Cause**: Buffer size mismatch or network issues

**Solution**:
```javascript
// In conference-server.js, add frame validation:
function validateAudioFrame(buffer) {
    if (buffer.length !== 640) return false;

    // Check for silence (all zeros)
    const isAllZeros = buffer.every(byte => byte === 0);
    if (isAllZeros) {
        console.warn('Received silence frame (all zeros)');
        return false;
    }

    // Check for valid PCM16 range
    for (let i = 0; i < buffer.length; i += 2) {
        const sample = buffer.readInt16LE(i);
        if (Math.abs(sample) > 32767) {
            console.error('Invalid PCM16 sample:', sample);
            return false;
        }
    }

    return true;
}
```

#### Problem: Deepgram not receiving audio

**Cause**: Incorrect Deepgram configuration

**Solution**:
```javascript
// Verify Deepgram connection with detailed logging:
deepgramConnection.on('open', () => {
    console.log('[Deepgram] Connection opened');
    console.log('[Deepgram] Config:', JSON.stringify(deepgramOptions, null, 2));
});

deepgramConnection.on('error', (error) => {
    console.error('[Deepgram] Error:', error);
    console.error('[Deepgram] Stack:', error.stack);
});

deepgramConnection.on('Metadata', (metadata) => {
    console.log('[Deepgram] Metadata:', JSON.stringify(metadata, null, 2));
});
```

---

### 1.4 Rollback Procedure

If 16kHz upgrade causes issues:

```bash
# Rollback to 8kHz configuration
ssh azureuser@4.185.84.26 << 'ROLLBACK'
# Stop current server
killall -9 node

# Restore 8kHz extensions.conf
sudo cp /etc/asterisk/extensions.conf.backup /etc/asterisk/extensions.conf
sudo asterisk -rx 'dialplan reload'

# Restore 8kHz conference-server.js
cp /home/azureuser/translation-app/conference-server.js.8khz.backup \
   /home/azureuser/translation-app/conference-server.js

# Restart with 8kHz
cd /home/azureuser/translation-app
DEEPGRAM_API_KEY=806ac77eb08d83390c265228dd2cc89c0b86f23e \
DEEPL_API_KEY=672097f6-2818-4022-be20-6f7118e12143:fx \
ELEVENLABS_API_KEY=sk_968d6d3e5b92cfce648ce9a38478ee131d98750ef4e09f05 \
/usr/bin/node conference-server.js > translation-app.log 2>&1 &

echo "✓ Rolled back to 8kHz configuration"
ROLLBACK
```

---

### 1.5 Success Criteria for Phase 1

✅ **Asterisk**:
- Extensions 5000, 6000, 7000 configured for `slin16`
- Dialplan reload successful
- Echo test (8888) still works

✅ **AudioSocket Server**:
- Receiving 640-byte frames (not 320)
- Frame rate: 50 fps (unchanged)
- No buffer underruns or overruns

✅ **Deepgram**:
- Sample rate: 16000 Hz
- Transcription confidence: >90%
- Latency: <500ms end-to-end

✅ **Translation**:
- DeepL working with 16kHz input
- ElevenLabs generating 16kHz output
- Audio quality improved (subjective test)

✅ **Performance**:
- CPU usage: <30% (similar to 8kHz)
- Memory usage: <500MB (may increase slightly)
- Network bandwidth: ~64 KB/s per stream (doubled from 8kHz)

---

## Phase 2: TypeScript Migration & Code Restructuring

**Duration**: 2-3 days
**Risk**: MODERATE
**Prerequisite**: Phase 1 complete and stable

### 2.1 Goals

1. Convert JavaScript → TypeScript for type safety
2. Split monolithic `conference-server.js` into modules
3. Add proper error handling and logging
4. Implement STS3-style project structure
5. Add unit tests (optional but recommended)

### 2.2 Project Structure

**Target structure**:
```
/home/azureuser/translation-app/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                      # Entry point
│   ├── config.ts                     # Configuration management
│   ├── types.ts                      # TypeScript type definitions
│   ├── audiosocket/
│   │   ├── server.ts                 # AudioSocket TCP server
│   │   ├── protocol.ts               # 3-byte header protocol
│   │   └── frame-handler.ts          # Audio frame processing
│   ├── deepgram/
│   │   ├── client.ts                 # Deepgram SDK wrapper
│   │   ├── stream-manager.ts         # Stream lifecycle
│   │   └── event-handlers.ts         # Transcription events
│   ├── translation/
│   │   ├── deepl-client.ts           # DeepL API wrapper
│   │   └── language-detector.ts      # Language detection
│   ├── tts/
│   │   ├── elevenlabs-client.ts      # ElevenLabs TTS
│   │   └── audio-generator.ts        # TTS audio generation
│   └── utils/
│       ├── logger.ts                 # Structured logging
│       └── metrics.ts                # Performance metrics
├── dist/                             # Compiled JavaScript (gitignored)
└── logs/                             # Application logs
```

### 2.3 Step-by-Step Implementation

#### Step 2.3.1: Initialize TypeScript Project

```bash
# On Azure VM
ssh azureuser@4.185.84.26 << 'TYPESCRIPT_INIT'
cd /home/azureuser/translation-app

# Install TypeScript and dependencies
npm install --save-dev typescript @types/node @types/ws ts-node nodemon
npm install --save winston  # For structured logging

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Update package.json scripts
npm pkg set scripts.build="tsc"
npm pkg set scripts.dev="nodemon --exec ts-node src/index.ts"
npm pkg set scripts.start="node dist/index.js"

echo "✓ TypeScript initialized"
TYPESCRIPT_INIT
```

#### Step 2.3.2: Create Type Definitions

**File**: `src/types.ts`

```typescript
/**
 * Type definitions for real-time translation system
 */

// AudioSocket Protocol Types
export interface AudioSocketFrame {
    type: FrameType;
    length: number;
    payload: Buffer;
}

export enum FrameType {
    UUID = 0x01,
    AUDIO = 0x10,
    HANGUP = 0x00,
    ERROR = 0xff
}

export interface AudioSession {
    uuid: string;
    startTime: Date;
    deepgramConnection?: any;
    audioBuffer: Buffer;
    frameCount: number;
    bytesSent: number;
}

// Deepgram Types
export interface DeepgramConfig {
    model: string;
    language: string;
    smart_format: boolean;
    punctuate: boolean;
    interim_results: boolean;
    sample_rate: number;
    encoding: string;
    channels: number;
    endpointing?: number;
    utterance_end_ms?: number;
    vad_events?: boolean;
}

export interface TranscriptionResult {
    uuid: string;
    text: string;
    isFinal: boolean;
    confidence: number;
    timestamp: number;
    language?: string;
}

// DeepL Types
export interface TranslationRequest {
    text: string;
    sourceLang: string;
    targetLang: string;
}

export interface TranslationResult {
    translatedText: string;
    sourceLang: string;
    targetLang: string;
    confidence?: number;
}

// ElevenLabs Types
export interface TTSRequest {
    text: string;
    voiceId: string;
    modelId: string;
    outputFormat: string;
}

export interface TTSResult {
    audioBuffer: Buffer;
    sampleRate: number;
    duration: number;
}

// Configuration Types
export interface AppConfig {
    asterisk: {
        audioSocketPort: number;
        sampleRate: number;
        frameSize: number;
        frameDuration: number;
    };
    deepgram: {
        apiKey: string;
        model: string;
        language: string;
    };
    deepl: {
        apiKey: string;
        endpoint: string;
    };
    elevenlabs: {
        apiKey: string;
        voiceId: string;
        modelId: string;
    };
    logging: {
        level: string;
        format: string;
    };
}
```

#### Step 2.3.3: Create Configuration Module

**File**: `src/config.ts`

```typescript
import dotenv from 'dotenv';
import { AppConfig } from './types';

dotenv.config();

/**
 * Application configuration with validation
 */
export const config: AppConfig = {
    asterisk: {
        audioSocketPort: parseInt(process.env.AUDIOSOCKET_PORT || '5050'),
        sampleRate: 16000,  // 16kHz after Phase 1 upgrade
        frameSize: 640,     // 16000 Hz × 2 bytes × 0.02s
        frameDuration: 20   // 20ms frames
    },
    deepgram: {
        apiKey: process.env.DEEPGRAM_API_KEY || '',
        model: 'nova-2',
        language: 'multi'
    },
    deepl: {
        apiKey: process.env.DEEPL_API_KEY || '',
        endpoint: 'https://api-free.deepl.com/v2/translate'
    },
    elevenlabs: {
        apiKey: process.env.ELEVENLABS_API_KEY || '',
        voiceId: process.env.ELEVENLABS_VOICE_ID || 'default',
        modelId: 'eleven_monolingual_v1'
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json'
    }
};

/**
 * Validate required configuration
 */
export function validateConfig(): void {
    const errors: string[] = [];

    if (!config.deepgram.apiKey) {
        errors.push('DEEPGRAM_API_KEY is required');
    }

    if (!config.deepl.apiKey) {
        errors.push('DEEPL_API_KEY is required');
    }

    if (!config.elevenlabs.apiKey) {
        errors.push('ELEVENLABS_API_KEY is required');
    }

    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }

    console.log('[Config] ✓ All required configuration present');
}
```

#### Step 2.3.4: Create Structured Logger

**File**: `src/utils/logger.ts`

```typescript
import winston from 'winston';
import { config } from '../config';

/**
 * Structured logger using Winston
 */
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let metaStr = '';
        if (Object.keys(meta).length > 0) {
            metaStr = ` ${JSON.stringify(meta)}`;
        }
        return `${timestamp} ${level}: ${message}${metaStr}`;
    })
);

export const logger = winston.createLogger({
    level: config.logging.level,
    format: logFormat,
    transports: [
        // Console output
        new winston.transports.Console({
            format: consoleFormat
        }),
        // File output
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error'
        }),
        new winston.transports.File({
            filename: 'logs/combined.log'
        })
    ]
});

/**
 * Create child logger with specific context
 */
export function createLogger(context: string) {
    return logger.child({ context });
}
```

#### Step 2.3.5: Modularize AudioSocket Server

**File**: `src/audiosocket/server.ts`

```typescript
import net from 'net';
import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import { AudioSocketFrame, FrameType, AudioSession } from '../types';
import { parseFrame, createFrame } from './protocol';

const logger = createLogger('AudioSocket');

/**
 * AudioSocket TCP server for Asterisk integration
 */
export class AudioSocketServer extends EventEmitter {
    private server: net.Server;
    private sessions: Map<string, AudioSession> = new Map();
    private port: number;

    constructor(port: number) {
        super();
        this.port = port;
        this.server = net.createServer(this.handleConnection.bind(this));
    }

    /**
     * Start AudioSocket server
     */
    public async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server.listen(this.port, () => {
                logger.info(`AudioSocket server listening on port ${this.port}`);
                resolve();
            });

            this.server.on('error', (error) => {
                logger.error('Server error', { error });
                reject(error);
            });
        });
    }

    /**
     * Stop AudioSocket server
     */
    public async stop(): Promise<void> {
        return new Promise((resolve) => {
            // Close all sessions
            for (const [uuid, session] of this.sessions.entries()) {
                this.cleanupSession(uuid);
            }

            this.server.close(() => {
                logger.info('AudioSocket server stopped');
                resolve();
            });
        });
    }

    /**
     * Handle new connection
     */
    private handleConnection(socket: net.Socket): void {
        const clientInfo = `${socket.remoteAddress}:${socket.remotePort}`;
        logger.info('Client connected', { client: clientInfo });

        let frameBuffer = Buffer.alloc(0);
        let currentUUID: string | null = null;

        socket.on('data', (data) => {
            frameBuffer = Buffer.concat([frameBuffer, data]);

            // Parse all complete frames
            while (frameBuffer.length >= 3) {
                const frame = parseFrame(frameBuffer);
                if (!frame) break;

                frameBuffer = frameBuffer.subarray(3 + frame.length);

                this.handleFrame(frame, socket, (uuid) => {
                    currentUUID = uuid;
                });
            }
        });

        socket.on('close', () => {
            logger.info('Client disconnected', { client: clientInfo, uuid: currentUUID });
            if (currentUUID) {
                this.cleanupSession(currentUUID);
            }
        });

        socket.on('error', (error) => {
            logger.error('Socket error', { client: clientInfo, error });
        });
    }

    /**
     * Handle parsed frame
     */
    private handleFrame(
        frame: AudioSocketFrame,
        socket: net.Socket,
        setUUID: (uuid: string) => void
    ): void {
        switch (frame.type) {
            case FrameType.UUID:
                const uuid = frame.payload.toString('utf-8');
                setUUID(uuid);
                this.initializeSession(uuid);
                logger.info('Session started', { uuid });
                this.emit('session:start', uuid);
                break;

            case FrameType.AUDIO:
                const session = this.sessions.get(currentUUID);
                if (session) {
                    session.frameCount++;
                    session.bytesSent += frame.payload.length;
                    this.emit('audio', currentUUID, frame.payload);
                }
                break;

            case FrameType.HANGUP:
                logger.info('Session ended', { uuid: currentUUID });
                this.emit('session:end', currentUUID);
                this.cleanupSession(currentUUID);
                break;

            case FrameType.ERROR:
                logger.error('Received error frame', { uuid: currentUUID });
                this.emit('error', currentUUID, frame.payload);
                break;
        }
    }

    /**
     * Initialize new session
     */
    private initializeSession(uuid: string): void {
        this.sessions.set(uuid, {
            uuid,
            startTime: new Date(),
            audioBuffer: Buffer.alloc(0),
            frameCount: 0,
            bytesSent: 0
        });
    }

    /**
     * Cleanup session
     */
    private cleanupSession(uuid: string | null): void {
        if (!uuid) return;

        const session = this.sessions.get(uuid);
        if (session) {
            const duration = Date.now() - session.startTime.getTime();
            logger.info('Session stats', {
                uuid,
                duration: `${(duration / 1000).toFixed(1)}s`,
                frames: session.frameCount,
                bytes: session.bytesSent
            });

            this.sessions.delete(uuid);
        }
    }

    /**
     * Send audio back to Asterisk
     */
    public sendAudio(uuid: string, audioData: Buffer): boolean {
        // Implementation for bidirectional audio
        // ... (send audio frame back to socket)
        return true;
    }
}
```

**File**: `src/audiosocket/protocol.ts`

```typescript
import { AudioSocketFrame, FrameType } from '../types';

/**
 * Parse AudioSocket frame (3-byte header protocol)
 */
export function parseFrame(buffer: Buffer): AudioSocketFrame | null {
    if (buffer.length < 3) {
        return null;  // Not enough data for header
    }

    const type = buffer.readUInt8(0) as FrameType;
    const length = buffer.readUInt16BE(1);

    if (buffer.length < 3 + length) {
        return null;  // Not enough data for payload
    }

    const payload = buffer.subarray(3, 3 + length);

    return { type, length, payload };
}

/**
 * Create AudioSocket frame
 */
export function createFrame(type: FrameType, payload: Buffer): Buffer {
    const header = Buffer.alloc(3);
    header.writeUInt8(type, 0);
    header.writeUInt16BE(payload.length, 1);
    return Buffer.concat([header, payload]);
}
```

---

### 2.4 Migration Timeline

**Day 1**: Setup + Core modules
- ✅ Initialize TypeScript project
- ✅ Create type definitions
- ✅ Create config module
- ✅ Create logger module
- ✅ Test compilation

**Day 2**: AudioSocket + Deepgram modules
- ✅ Migrate AudioSocket server
- ✅ Migrate Deepgram client
- ✅ Test audio pipeline

**Day 3**: Translation + TTS + Testing
- ✅ Migrate DeepL client
- ✅ Migrate ElevenLabs client
- ✅ Integration testing
- ✅ Deploy to production

---

## Phase 3: Browser WebSocket Interface

**Duration**: 3-4 days
**Risk**: LOW (new feature, doesn't affect existing)
**Prerequisite**: Phases 1-2 complete

### 3.1 Architecture

```
Browser Client (HTML/JS)
    ↓ WebSocket (port 8080)
Server WebSocket Handler
    ↓
Real-time events:
    - Transcriptions (Deepgram)
    - Translations (DeepL)
    - Audio waveforms
    - Session status
```

### 3.2 Implementation

*(Detailed implementation for Phase 3 would follow similar structure...)*

---

## Summary: Complete Hybrid Approach

**Week 1**: Phase 1 - 16kHz Audio Upgrade
- Asterisk 20 installation
- 16kHz audio configuration
- Updated Deepgram/ElevenLabs
- **Result**: Better transcription quality

**Week 2**: Phase 2 - TypeScript Migration
- Project structure
- Modular codebase
- Type safety
- **Result**: Maintainable, scalable code

**Week 3-4**: Phase 3 - Browser Interface
- WebSocket server
- HTML/JS client
- Real-time monitoring
- **Result**: Production-ready monitoring

**Total Effort**: 3-4 weeks
**Total Risk**: LOW (incremental, always operational)
**Total Benefit**: HIGH (quality + maintainability + monitoring)

---

## Next Steps

After completing Option 1 Hybrid Approach:

1. ✅ **Production deployment** with monitoring
2. ✅ **Performance tuning** based on real usage
3. ⚪ **Consider ARI migration** (Option 2) if multi-participant needed
4. ⚪ **Add advanced features**: Recording, analytics, multi-language UI

---

**Last Updated**: 2025-10-19
**Status**: Ready for Phase 1 implementation
**Prerequisite**: Asterisk 20 compilation complete (in progress)
