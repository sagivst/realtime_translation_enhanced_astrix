# Unified Gateway Development Plan
**Date**: 2025-11-16
**Objective**: Embed Conference Server translation processing logic directly into Gateway to eliminate external WebSocket routing

---

## 1. EXECUTIVE SUMMARY

### Current Architecture (2-Component System)
```
RTP Audio Flow:
Asterisk ExternalMedia (7777/8888)
    ↓ UDP RTP (PT=118, 640 bytes, 16kHz PCM16)
Gateway (gateway-7777-8888.js)
    ↓ WebSocket (Socket.IO)
Conference Server (conference-server-externalmedia.js)
    ↓ Processing: Deepgram STT → DeepL Translation → ElevenLabs TTS
    ↓ WebSocket (Socket.IO)
Gateway (gateway-7777-8888.js)
    ↓ UDP RTP
Asterisk ExternalMedia
```

### Target Architecture (Unified Gateway)
```
RTP Audio Flow:
Asterisk ExternalMedia (7777/8888)
    ↓ UDP RTP (PT=118, 640 bytes, 16kHz PCM16)
Unified Gateway (gateway-unified.js)
    ↓ Inline Processing: Deepgram STT → DeepL Translation → ElevenLabs TTS
    ↓ UDP RTP
Asterisk ExternalMedia
```

### Benefits
- ✅ Eliminates WebSocket complexity (no IN/OUT routing)
- ✅ Reduces latency (no network serialization overhead)
- ✅ Simpler architecture (1 component instead of 2)
- ✅ Easier debugging (single process, single log file)
- ✅ Same extensions (7777/8888) and ports (5000/5001)

---

## 2. CURRENT STATE ANALYSIS

### Production Files (DO NOT MODIFY)
```
/home/azureuser/translation-app/7777-8888-stack/
├── gateway-7777-8888.js                    (904 lines - Gateway with WebSocket client)
├── conference-server-externalmedia.js       (2852 lines - Conference Server with processing)
├── elevenlabs-tts-service.js               (Support service)
├── .env.externalmedia                       (API keys)
└── node_modules/                            (All dependencies installed)
```

### Working Directories (Safe to Modify)
```
Local:
/tmp/
├── gateway-base.js                          (904 lines - Downloaded copy of Gateway)
├── gateway-phase1.js                        (904 lines - Phase 1: WebSocket OUT removed)
├── gateway-phase2.js                        (940 lines - Phase 2: Processing imports added)
└── conf-server-ref.js                       (2852 lines - Reference for extraction)

Remote:
/tmp/unified-gateway-build/
├── gateway-7777-8888.js                     (Production copy)
├── conference-server-externalmedia.js       (Production copy)
├── elevenlabs-tts-service.js               (Support service)
└── .env.externalmedia                       (API keys)
```

### Gateway Dependencies to REMOVE
```javascript
// Line 23: WebSocket client (OUT to Conference Server)
const io = require('socket.io-client');

// Line 70: External server URL
const TRANSLATION_SERVER_URL = 'http://localhost:3002';

// Line 97: WebSocket connections map
const translationSockets = new Map();

// Lines 268-326: initializeTranslationSocket() function
// Lines 329-348: forwardAudioToTranslationServer() function
// Line 576: Call to forwardAudioToTranslationServer()
```

### Conference Server Logic to EXTRACT
```javascript
// From conf-server-ref.js:

1. Language Mapping (line 828)
   - Maps language codes between services
   - en: { deepgram: 'en-US', deepl: 'en-US' }
   - fr: { deepgram: 'fr', deepl: 'FR' }

2. Service Initialization (lines 35-80)
   - Deepgram client (@deepgram/sdk)
   - DeepL translator (deepl-node)
   - ElevenLabs TTS (elevenlabs-tts-service)

3. Audio Processing Functions:
   - createWavHeader(pcmData)           (line 843) - 44-byte WAV header for Deepgram
   - transcribeAudioDeepgram()          (line 871) - STT with 2-second buffering
   - translateText()                    (line 1007) - DeepL translation
   - synthesizeSpeechStreaming()        (line 1081) - ElevenLabs TTS streaming

4. Audio Buffering Infrastructure:
   - audioBuffers Map                   (line 851) - Accumulate RTP packets
   - bufferTimers Map                   (line 852) - 2-second timeout
   - BUFFER_TIMEOUT constant            (2000ms)
```

---

## 3. IMPLEMENTATION PHASES

### Phase 1: Remove WebSocket OUT Dependencies ✅ COMPLETE
**File**: `/tmp/gateway-phase1.js` (904 lines)
**Status**: Complete, syntax valid ✓

**Changes Made**:
```javascript
// Line 23-24: Removed WebSocket client import
// PHASE 1: Removed WebSocket client - no external Conference Server needed
// const io = require('socket.io-client');

// Line 70-71: Removed external server URL
// PHASE 1: Removed - no external Translation Server
// const TRANSLATION_SERVER_URL = 'http://localhost:3002';

// Line 96-97: Removed WebSocket connections map
// PHASE 1: Removed - no external WebSocket connections needed
// const translationSockets = new Map();

// Line 575-577: Disabled forwarding function call
// PHASE 1: Disabled - will be replaced with embedded processing
// forwardAudioToTranslationServer(ext, msg);
console.log(`[Phase1][${ext}] Received ${msg.length} bytes RTP (processing disabled)`);
```

**Functions to Remove Later** (kept for now for reference):
- `initializeTranslationSocket()` (lines 268-326)
- `forwardAudioToTranslationServer()` (lines 329-348)

---

### Phase 2: Add Embedded Processing Imports ✅ COMPLETE
**File**: `/tmp/gateway-phase2.js` (940 lines)
**Status**: Complete, syntax valid ✓

**Changes Made**:
```javascript
// Lines 26-29: Added processing service imports
// PHASE 2: Add embedded processing imports
const { createClient } = require('@deepgram/sdk');  // Deepgram STT
const deepl = require('deepl-node');                // DeepL translation
const ElevenLabsTTSService = require('./elevenlabs-tts-service');  // ElevenLabs TTS

// Lines 40-66: Added service initialization with error handling
// PHASE 2: Initialize Translation Services
const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
const deeplApiKey = process.env.DEEPL_API_KEY;
const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

let deepgramClient = null;
if (deepgramApiKey) {
  deepgramClient = createClient(deepgramApiKey);
  console.log('[Init] Deepgram client initialized');
} else {
  console.warn('[Init] Deepgram API key not found - transcription disabled');
}

let translator;
if (deeplApiKey) {
  translator = new deepl.Translator(deeplApiKey);
  console.log('[Init] DeepL translator initialized');
} else {
  console.warn('[Init] DeepL API key not found - translation disabled');
}

let elevenlabsTTS = null;
if (elevenlabsApiKey) {
  elevenlabsTTS = new ElevenLabsTTSService(elevenlabsApiKey);
  console.log('[Init] ElevenLabs TTS initialized');
} else {
  console.warn('[Init] ElevenLabs API key not found - TTS disabled');
}

// Language mapping for translation services
const languageMap = {
  'en': { name: 'English', deepgram: 'en-US', deepl: 'en-US' },
  'fr': { name: 'French', deepgram: 'fr', deepl: 'FR' }
};
console.log('[Init] Language map configured: en, fr');
```

---

### Phase 3: Add Processing Functions ⏳ IN PROGRESS
**File**: `/tmp/gateway-phase2.js` → `/tmp/gateway-phase3.js`
**Target**: Insert after `scalePCM()` function (after line 268)

**Functions to Add**:

#### 3.1 WAV Header Creation (for Deepgram)
```javascript
/**
 * PHASE 3: Create WAV header for PCM audio
 * Deepgram requires WAV format, not raw PCM
 * @param {Buffer} pcmData - Raw PCM16 audio data
 * @returns {Buffer} - Complete WAV file (header + PCM)
 */
function createWavHeader(pcmData) {
  const pcmLength = pcmData.length;
  const header = Buffer.alloc(44);

  // RIFF chunk descriptor
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmLength, 4);
  header.write("WAVE", 8);

  // fmt sub-chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);           // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20);            // AudioFormat (1 = PCM)
  header.writeUInt16LE(1, 22);            // NumChannels (1 = mono)
  header.writeUInt32LE(16000, 24);        // SampleRate (16000 Hz)
  header.writeUInt32LE(32000, 28);        // ByteRate (16000 * 1 * 16/8)
  header.writeUInt16LE(2, 32);            // BlockAlign (1 * 16/8)
  header.writeUInt16LE(16, 34);           // BitsPerSample (16)

  // data sub-chunk
  header.write("data", 36);
  header.writeUInt32LE(pcmLength, 40);

  return Buffer.concat([header, pcmData]);
}
```

#### 3.2 Audio Buffering Infrastructure
```javascript
/**
 * PHASE 3: Audio buffering infrastructure
 * Accumulate 2 seconds of audio before processing
 * This improves transcription accuracy
 */
const audioBuffers = new Map();  // Map<extension, Buffer[]>
const bufferTimers = new Map();  // Map<extension, NodeJS.Timeout>
const BUFFER_TIMEOUT = 2000;     // 2 seconds
```

#### 3.3 Deepgram Transcription
```javascript
/**
 * PHASE 3: Transcribe audio using Deepgram
 * @param {Buffer} audioBuffer - Accumulated PCM16 audio
 * @param {string} language - Language code (en/fr)
 * @returns {Promise<string|null>} - Transcribed text or null
 */
async function transcribeAudioDeepgram(audioBuffer, language) {
  if (!deepgramClient) {
    console.warn('[Deepgram] Client not initialized');
    return null;
  }

  try {
    const wavBuffer = createWavHeader(audioBuffer);
    const langConfig = languageMap[language];

    console.log(`[Deepgram] Transcribing ${audioBuffer.length} bytes (${langConfig.name})`);

    const { result, error } = await deepgramClient.listen.prerecorded.transcribeFile(
      wavBuffer,
      {
        model: 'nova-2',
        language: langConfig.deepgram,
        smart_format: true,
        punctuate: true
      }
    );

    if (error) {
      console.error('[Deepgram] Error:', error);
      return null;
    }

    const transcript = result.results?.channels[0]?.alternatives[0]?.transcript;
    if (transcript && transcript.trim()) {
      console.log(`[Deepgram] Transcript: "${transcript}"`);
      return transcript;
    }

    return null;
  } catch (err) {
    console.error('[Deepgram] Exception:', err.message);
    return null;
  }
}
```

#### 3.4 DeepL Translation
```javascript
/**
 * PHASE 3: Translate text using DeepL
 * @param {string} text - Text to translate
 * @param {string} sourceLang - Source language (en/fr)
 * @param {string} targetLang - Target language (fr/en)
 * @returns {Promise<string>} - Translated text
 */
async function translateText(text, sourceLang, targetLang) {
  if (!translator) {
    console.warn('[DeepL] Translator not initialized');
    return text;
  }

  try {
    const sourceConfig = languageMap[sourceLang];
    const targetConfig = languageMap[targetLang];

    console.log(`[DeepL] Translating: "${text}" (${sourceLang} → ${targetLang})`);

    const result = await translator.translateText(
      text,
      sourceConfig.deepl,
      targetConfig.deepl
    );

    console.log(`[DeepL] Translation: "${result.text}"`);
    return result.text;
  } catch (err) {
    console.error('[DeepL] Error:', err.message);
    return text;
  }
}
```

#### 3.5 ElevenLabs TTS
```javascript
/**
 * PHASE 3: Synthesize speech using ElevenLabs
 * @param {string} text - Text to synthesize
 * @param {string} language - Target language (en/fr)
 * @returns {Promise<Buffer|null>} - PCM16 audio buffer
 */
async function synthesizeSpeechStreaming(text, language) {
  if (!elevenlabsTTS) {
    console.warn('[ElevenLabs] TTS not initialized');
    return null;
  }

  try {
    const voiceId = language === 'en'
      ? 'EXAVITQu4vr4xnSDxMaL'  // Sarah (English)
      : 'ThT5KcBeYPX3keUQqHPh';  // Freya (French)

    console.log(`[ElevenLabs] Synthesizing: "${text}" (${language})`);

    const stream = await elevenlabsTTS.synthesizeStreaming(text, voiceId, {
      modelId: 'eleven_multilingual_v2',
      output_format: 'pcm_16000',
      optimizeStreamingLatency: 3
    });

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const audioBuffer = Buffer.concat(chunks);
    console.log(`[ElevenLabs] Generated ${audioBuffer.length} bytes PCM16`);

    return audioBuffer;
  } catch (err) {
    console.error('[ElevenLabs] Error:', err.message);
    return null;
  }
}
```

#### 3.6 Main Processing Pipeline
```javascript
/**
 * PHASE 3: Process audio inline (replaces WebSocket forwarding)
 * Full pipeline: Buffer → STT → Translation → TTS → RTP
 * @param {string} sourceExtension - Source extension (7777/8888)
 * @param {Buffer} rtpPacket - RTP packet with audio payload
 */
async function processAudioInline(sourceExtension, rtpPacket) {
  const config = EXTERNAL_MEDIA_CONFIG[sourceExtension];
  if (!config) return;

  const targetExtension = sourceExtension === '7777' ? '8888' : '7777';
  const targetConfig = EXTERNAL_MEDIA_CONFIG[targetExtension];

  // Extract RTP payload (skip 12-byte header)
  const rtpPayload = extractRTPPayload(rtpPacket);
  if (!rtpPayload || rtpPayload.length === 0) return;

  // Initialize buffer for this extension
  if (!audioBuffers.has(sourceExtension)) {
    audioBuffers.set(sourceExtension, []);
  }

  // Add to buffer
  const buffer = audioBuffers.get(sourceExtension);
  buffer.push(rtpPayload);

  // Clear existing timer
  if (bufferTimers.has(sourceExtension)) {
    clearTimeout(bufferTimers.get(sourceExtension));
  }

  // Set new timer to process after 2 seconds
  const timer = setTimeout(async () => {
    const accumulatedBuffer = Buffer.concat(buffer);
    audioBuffers.set(sourceExtension, []); // Clear buffer

    console.log(`[ProcessInline] Processing ${accumulatedBuffer.length} bytes from ${sourceExtension}`);

    // Step 1: Transcribe
    const transcript = await transcribeAudioDeepgram(
      accumulatedBuffer,
      config.language
    );

    if (!transcript) {
      console.log(`[ProcessInline] No transcript, skipping`);
      return;
    }

    // Step 2: Translate
    const translated = await translateText(
      transcript,
      config.language,
      targetConfig.language
    );

    // Step 3: Synthesize
    const synthesizedAudio = await synthesizeSpeechStreaming(
      translated,
      targetConfig.language
    );

    if (!synthesizedAudio) {
      console.log(`[ProcessInline] No synthesized audio, skipping`);
      return;
    }

    // Step 4: Send to target extension
    // NOTE: Current ExternalMedia architecture doesn't support audio injection
    // This is a known limitation documented in FINAL_TEST_REPORT_2025-11-15.md
    console.log(`[ProcessInline] ⚠️  Would send ${synthesizedAudio.length} bytes to ${targetExtension}`);
    console.log(`[ProcessInline] ⚠️  ExternalMedia audio injection not supported - consider AudioSocket`);

  }, BUFFER_TIMEOUT);

  bufferTimers.set(sourceExtension, timer);
}
```

---

### Phase 4: Replace WebSocket Forwarding ⏳ PENDING
**File**: `/tmp/gateway-phase3.js` → `/tmp/gateway-phase4.js`

**Changes Required**:

#### 4.1 Remove Old WebSocket Functions
```javascript
// DELETE lines 268-326: initializeTranslationSocket() function
// DELETE lines 329-348: forwardAudioToTranslationServer() function
```

#### 4.2 Update UDP Listener
```javascript
// Current (line 576):
// forwardAudioToTranslationServer(ext, msg);
console.log(`[Phase1][${ext}] Received ${msg.length} bytes RTP (processing disabled)`);

// Replace with:
processAudioInline(ext, msg);
```

---

### Phase 5: Final Verification ⏳ PENDING
**File**: `/tmp/gateway-phase4.js` → `/tmp/gateway-unified.js`

**Verification Steps**:
1. ✅ Syntax check: `node --check /tmp/gateway-unified.js`
2. ✅ Line count verification (should be ~1100-1200 lines)
3. ✅ Dependency check: All imports present
4. ✅ Function connectivity: processAudioInline called from UDP listener
5. ✅ No WebSocket client code remaining

---

## 4. TESTING STRATEGY

### Prerequisites
```bash
# Verify API keys in .env.externalmedia
DEEPGRAM_API_KEY=...
DEEPL_API_KEY=...
ELEVENLABS_API_KEY=...

# Verify elevenlabs-tts-service.js present
ls -la /home/azureuser/translation-app/7777-8888-stack/elevenlabs-tts-service.js
```

### Test Procedure

#### Step 1: Stop Production Services
```bash
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app/7777-8888-stack

# Stop Gateway
pkill -9 -f "node gateway-7777-8888.js"

# Stop Conference Server
pkill -9 -f "node conference-server-externalmedia.js"

# Verify stopped
ps aux | grep "node.*7777-8888\|conference-server" | grep -v grep
```

#### Step 2: Upload Unified Gateway
```bash
# Local machine:
scp /tmp/gateway-unified.js azureuser@20.170.155.53:/home/azureuser/translation-app/7777-8888-stack/gateway-unified-TEST.js
```

#### Step 3: Start Unified Gateway
```bash
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app/7777-8888-stack

# Load environment
source .env.externalmedia

# Start with logging
nohup node gateway-unified-TEST.js > /tmp/unified-gateway-TEST.log 2>&1 &
echo "PID: $!"

# Monitor logs
tail -f /tmp/unified-gateway-TEST.log
```

#### Step 4: Verify Initialization
**Expected log output**:
```
[Init] Deepgram client initialized
[Init] DeepL translator initialized
[Init] ElevenLabs TTS initialized
[Init] Language map configured: en, fr
[ARI] Connected to Asterisk ARI
[ExternalMedia] Created channel for ext 7777 (EN)
[ExternalMedia] Created channel for ext 8888 (FR)
[UDP] Listening on 0.0.0.0:5000 for ext 7777
[UDP] Listening on 0.0.0.0:5001 for ext 8888
```

#### Step 5: Test Call
```bash
# From any SIP client, call extension 7777 or 8888
# Speak in English to 7777 or French to 8888
```

#### Step 6: Monitor Processing
**Expected log output**:
```
[ProcessInline] Processing 64000 bytes from 7777
[Deepgram] Transcribing 64000 bytes (English)
[Deepgram] Transcript: "Hello, how are you today?"
[DeepL] Translating: "Hello, how are you today?" (en → fr)
[DeepL] Translation: "Bonjour, comment allez-vous aujourd'hui ?"
[ElevenLabs] Synthesizing: "Bonjour, comment allez-vous aujourd'hui ?" (fr)
[ElevenLabs] Generated 48000 bytes PCM16
[ProcessInline] ⚠️  Would send 48000 bytes to 8888
[ProcessInline] ⚠️  ExternalMedia audio injection not supported - consider AudioSocket
```

### Success Criteria
✅ Gateway starts without errors
✅ All three services initialize (Deepgram, DeepL, ElevenLabs)
✅ UDP sockets bind to ports 5000/5001
✅ RTP audio received from Asterisk
✅ Transcription produces text
✅ Translation produces translated text
✅ TTS produces audio buffer

### Known Limitation
⚠️ **Audio injection to ExternalMedia not supported** (documented in FINAL_TEST_REPORT_2025-11-15.md)
- Processing pipeline will work (STT → Translation → TTS)
- Audio output will be generated but cannot be sent back via ExternalMedia
- Alternative: AudioSocket protocol required for bidirectional audio

---

## 5. ROLLBACK PLAN

### If Unified Gateway Fails

#### Option 1: Restart Production Services
```bash
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app/7777-8888-stack

# Kill unified gateway
pkill -9 -f "node gateway-unified-TEST.js"

# Restart production Gateway
nohup node gateway-7777-8888.js > /tmp/gateway-RESTORED.log 2>&1 &

# Restart production Conference Server
nohup node conference-server-externalmedia.js > /tmp/conference-RESTORED.log 2>&1 &

# Verify running
ps aux | grep "node.*7777-8888\|conference-server" | grep -v grep
```

#### Option 2: Keep Backup Files
```bash
# Before testing, create backups:
cp gateway-7777-8888.js gateway-7777-8888.BACKUP.js
cp conference-server-externalmedia.js conference-server-externalmedia.BACKUP.js

# Restore if needed:
mv gateway-7777-8888.BACKUP.js gateway-7777-8888.js
mv conference-server-externalmedia.BACKUP.js conference-server-externalmedia.js
```

---

## 6. FILE STRUCTURE SUMMARY

### Before (2-Component System)
```
/home/azureuser/translation-app/7777-8888-stack/
├── gateway-7777-8888.js                    (904 lines - RTP + WebSocket client)
├── conference-server-externalmedia.js       (2852 lines - WebSocket server + processing)
├── elevenlabs-tts-service.js               (Support)
├── .env.externalmedia                       (API keys)
└── node_modules/                            (Dependencies)
```

### After (Unified System)
```
/home/azureuser/translation-app/7777-8888-stack/
├── gateway-7777-8888.js                    (904 lines - BACKUP, unchanged)
├── conference-server-externalmedia.js       (2852 lines - BACKUP, unchanged)
├── gateway-unified-TEST.js                 (~1100 lines - NEW unified gateway)
├── elevenlabs-tts-service.js               (Support)
├── .env.externalmedia                       (API keys)
└── node_modules/                            (Dependencies - no changes needed)
```

### Dependencies (Already Installed)
```json
{
  "ari-client": "^2.2.0",
  "socket.io": "^4.5.4",
  "socket.io-client": "^4.5.4",     // Can be removed from unified version
  "@deepgram/sdk": "^3.x",
  "deepl-node": "^1.x",
  "axios": "^1.x"
}
```

---

## 7. CODE METRICS

| Metric | Gateway (Current) | Conference Server | Unified Gateway |
|--------|-------------------|-------------------|-----------------|
| **Total Lines** | 904 | 2852 | ~1100 |
| **WebSocket Code** | ~200 (client) | ~800 (server) | 0 |
| **RTP Handling** | ~300 | 0 | ~300 |
| **Processing Logic** | 0 | ~600 | ~600 |
| **Dependencies** | 5 | 8 | 6 |

**Code Reduction**: 2-component system (3756 lines) → Unified (1100 lines) = **71% reduction**

---

## 8. RISK ASSESSMENT

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Missing npm dependencies | Low | Medium | Dependencies already in node_modules |
| API key issues | Low | High | Verify .env.externalmedia before testing |
| Audio injection fails | **KNOWN** | High | Accept as limitation, document for AudioSocket migration |
| Process management issues | Medium | Low | Use robust pkill commands, verify with ps |
| Transcription accuracy | Low | Medium | Using proven Deepgram nova-2 model |
| Translation quality | Low | Medium | Using proven DeepL API |
| TTS quality | Low | Medium | Using proven ElevenLabs API |

---

## 9. NEXT STEPS

### Immediate Actions
1. ✅ Review this development document
2. ⏳ Execute Phase 3: Add processing functions
3. ⏳ Execute Phase 4: Replace WebSocket forwarding
4. ⏳ Execute Phase 5: Final verification
5. ⏳ Upload to production directory
6. ⏳ Execute testing procedure
7. ⏳ Document results

### Future Enhancements (Out of Scope)
- Migrate from ExternalMedia to AudioSocket for bidirectional audio
- Add real-time streaming (currently batch processing with 2-second buffer)
- Add support for additional languages
- Add WebSocket server for monitoring/debugging
- Add metrics collection (transcription latency, translation time, etc.)

---

## 10. REFERENCES

### Documentation Files
- `FINAL_TEST_REPORT_2025-11-15.md` - ExternalMedia audio injection limitation
- `CONFIGURATION_TESTING_REPORT_2025-11-15.md` - Previous test results
- `BLUEPRINT_VS_CURRENT_GAP_ANALYSIS.md` - Architecture comparison

### Source Files
- `/tmp/gateway-base.js` - Production Gateway (reference)
- `/tmp/conf-server-ref.js` - Conference Server (extraction source)
- `/tmp/gateway-phase1.js` - Phase 1 complete
- `/tmp/gateway-phase2.js` - Phase 2 complete (current)

### Key Decisions
1. **Keep same extensions/ports** - User requirement to avoid Asterisk reconfiguration
2. **Work in /tmp** - User requirement to not touch production files
3. **Phased approach** - Safer than all-at-once modification
4. **Accept audio injection limitation** - Known architectural constraint

---

**Document Version**: 1.0
**Last Updated**: 2025-11-16
**Status**: Ready for Phase 3 implementation
