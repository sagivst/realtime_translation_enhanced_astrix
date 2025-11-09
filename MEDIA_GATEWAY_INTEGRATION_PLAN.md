# Media Gateway Integration Plan for Extensions 7777 & 8888
**Working ONLY on VM: http://20.170.155.53/**
**NEVER touching production VM: http://4.185.84.26/**

## 📋 CURRENT STATE ANALYSIS

### Existing AudioSocket System (Extensions 7000 & 7001) - **DO NOT TOUCH**
```
┌─────────────────────────────────────────────────────────────────────────┐
│                   AUDIOSOCKET TRANSLATION FLOW (7000/7001)               │
└─────────────────────────────────────────────────────────────────────────┘

INPUT PATH (Microphone → Translation):
═══════════════════════════════════════
SIP Phone (7000/7001)
   │ Microphone Audio
   ↓
Asterisk (ExternalMedia dialplan)
   │ AudioSocket Protocol (TCP)
   │ 8kHz PCM, 3-byte header per frame
   ↓
AudioSocketOrchestrator (Ports 5050/5052)
   │ UUID: "7000-xxxxx" or "7001-xxxxx"
   │ Strips 3-byte header
   ↓
audiosocket-integration.js
   │ Session Management: activeSessions.get(uuid)
   │ Extension routing: getExtensionFromUUID(uuid)
   ↓
Translation Pipeline:
   ├─ ASRStreamingWorker (Deepgram STT) [8kHz input]
   │    └─ Event: 'transcript' → translatedText
   ├─ DeepLIncrementalMT (DeepL Translation)
   │    └─ translator7000 for 7000, translator7001 for 7001
   ├─ ElevenLabsTTSService (Text-to-Speech)
   │    └─ Returns PCM 16kHz audio buffer
   └─ AudioStreamBuffer (Latency Sync + Timing)
        └─ Event: 'audioReady' → pcmBuffer (16kHz)

OUTPUT PATH (Translated Audio → Speaker):
═══════════════════════════════════════
AudioStreamBuffer
   │ Event: 'audioReady'
   ↓
sendAudioToMicEndpoint(session.micWebSocket, pcmBuffer)
   │ Amplify 500x
   │ Frame size: 640 bytes (16kHz × 20ms × 2 bytes)
   ↓
WebSocket Connection
   │ URL: ws://127.0.0.1:{targetPort}/mic/{uuid}
   │ Port 5053 for Ext 7000 → Audio goes to 7001's ear
   │ Port 5051 for Ext 7001 → Audio goes to 7000's ear
   │ (CROSS-EXTENSION ROUTING)
   ↓
AudioSocketOrchestrator (Output ports 5051/5053)
   │ Adds 3-byte AudioSocket header
   │ Downsamples 16kHz → 8kHz
   ↓
Asterisk (AudioSocket TCP connection)
   │ Injects into bridge
   ↓
SIP Phone Speaker (Other extension hears translation)
```

**Key AudioSocket Components:**
- File: `audiosocket-integration.js` (MISSING in current branch!)
- UUID Format: `"7000-xxxxx"` or `"7001-xxxxx"`
- Input Protocol: TCP AudioSocket, 8kHz, 3-byte header
- Output Protocol: WebSocket → AudioSocket, 16kHz downsampled to 8kHz
- Cross-routing: 7000 hears 7001's translation, 7001 hears 7000's translation
- Amplification: 500x on output

---

## 🎯 NEW MEDIA GATEWAY SYSTEM (Extensions 7777 & 8888)

### Reference: Asterisk External Media Example
Based on `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/asterisk-external-media/`:

**RTP UDP Server Pattern:**
```javascript
// From rtp-udp-server.js
this.server.on('message', (msg, rinfo) => {
    // Strip the 12 byte RTP header
    let buf = msg.slice(12);

    // Swap byte order if SLIN16 (big-endian → little-endian)
    if (this.swap16) {
        buf.swap16();
    }

    // Emit 'data' event with raw PCM
    this.server.emit('data', buf);
});
```

**ARI Controller Pattern:**
```javascript
// From ari-controller.js
// 1. Create mixing bridge
await this.bridge.create({type: "mixing"});

// 2. Create local channel (dials extension)
await this.localChannel.originate({
    endpoint: dialstring,
    formats: 'slin16',
    app: "externalMedia"
});

// 3. Create ExternalMedia channel
await this.externalChannel.externalMedia({
    app: "externalMedia",
    external_host: '127.0.0.1:6000',  // Where to send RTP
    format: 'slin16'                   // 16kHz PCM
});

// 4. Add both channels to bridge
await this.bridge.addChannel({channel: localChannel.id});
await this.bridge.addChannel({channel: externalChannel.id});
```

### Proposed Media Gateway Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│              MEDIA GATEWAY TRANSLATION FLOW (7777/8888)                  │
└─────────────────────────────────────────────────────────────────────────┘

INPUT PATH (Microphone → Translation):
═══════════════════════════════════════
SIP Phone (7777/7888)
   │ Microphone Audio
   ↓
Asterisk (ExternalMedia ARI)
   │ RTP Protocol (UDP)
   │ 16kHz PCM (slin16), 12-byte RTP header
   │ Format: Big-endian
   ↓
Media Gateway RTP Listener (Port 17000 for 7777, 18000 for 8888)
   │ Receives RTP packets via UDP
   │ Strips 12-byte RTP header
   │ UUID: "7777-{ssrc}" or "8888-{ssrc}"
   │ Keep BIG-ENDIAN (NO byte swap for optimal quality)
   ↓
externalmedia-integration.js (NEW FILE - mirror of audiosocket-integration.js)
   │ Session Management: activeSessions.get(uuid)
   │ Extension routing: getExtensionFromUUID(uuid)
   ↓
Translation Pipeline: (SAME AS AUDIOSOCKET)
   ├─ ASRStreamingWorker (Deepgram STT) [16kHz input - BETTER QUALITY!]
   │    └─ Event: 'transcript' → translatedText
   ├─ DeepLIncrementalMT (DeepL Translation)
   │    └─ translator7777 for 7777, translator7888 for 7888
   ├─ ElevenLabsTTSService (Text-to-Speech)
   │    └─ Returns PCM 16kHz audio buffer
   └─ AudioStreamBuffer (Latency Sync + Timing)
        └─ Event: 'audioReady' → pcmBuffer (16kHz)

OUTPUT PATH (Translated Audio → Speaker):
═══════════════════════════════════════
AudioStreamBuffer
   │ Event: 'audioReady'
   ↓
sendAudioToMediaGateway(uuid, pcmBuffer)
   │ NO amplification needed (RTP levels correct)
   │ Keep 16kHz (no resampling!)
   │ Add 12-byte RTP header
   │ Keep BIG-ENDIAN format
   ↓
Media Gateway RTP Sender
   │ Port 18000 for Ext 7777 → Audio goes to 8888's ear
   │ Port 17000 for Ext 8888 → Audio goes to 7777's ear
   │ (CROSS-EXTENSION ROUTING)
   ↓
Asterisk (ExternalMedia RTP bidirectional)
   │ Injects into bridge via RTP
   ↓
SIP Phone Speaker (Other extension hears translation)
```

---

## 📐 STEP-BY-STEP IMPLEMENTATION PLAN

### PHASE 1: Media Gateway RTP Handler (externalmedia-rtp-handler.js)

**Purpose:** UDP RTP receiver/sender for extensions 7777 and 8888

**File:** `/home/azureuser/translation-app/externalmedia-rtp-handler.js`

**Implementation:**
```javascript
const dgram = require('dgram');
const EventEmitter = require('events');

class MediaGatewayRTPHandler extends EventEmitter {
    constructor(extension, listenPort, sendPort) {
        super();
        this.extension = extension;
        this.listenPort = listenPort;
        this.sendPort = sendPort;
        this.sessions = new Map();  // SSRC → session data

        // Create UDP socket for receiving RTP
        this.receiveSocket = dgram.createSocket('udp4');

        // Create UDP socket for sending RTP
        this.sendSocket = dgram.createSocket('udp4');
    }

    start() {
        // Listen for incoming RTP packets
        this.receiveSocket.on('message', (msg, rinfo) => {
            // Extract SSRC from RTP header (bytes 8-11)
            const ssrc = msg.readUInt32BE(8);
            const uuid = `${this.extension}-${ssrc}`;

            // Store remote address for sending back
            if (!this.sessions.has(uuid)) {
                this.sessions.set(uuid, {
                    remoteAddress: rinfo.address,
                    remotePort: rinfo.port,
                    sequenceNumber: 0,
                    timestamp: 0
                });
                console.log(`[MediaGateway] New session: ${uuid} from ${rinfo.address}:${rinfo.port}`);
            }

            // Strip 12-byte RTP header
            const pcmAudio = msg.slice(12);

            // NO byte swap - keep big-endian for optimal quality
            // NO amplification - RTP levels are correct

            // Emit audio event
            this.emit('audio', {
                uuid: uuid,
                extension: this.extension,
                audio: pcmAudio,
                sampleRate: 16000,
                channels: 1,
                bitDepth: 16
            });
        });

        this.receiveSocket.bind(this.listenPort, '127.0.0.1');
        console.log(`[MediaGateway] Ext ${this.extension} listening on UDP port ${this.listenPort}`);
    }

    sendAudio(uuid, pcmBuffer) {
        const session = this.sessions.get(uuid);
        if (!session) {
            console.warn(`[MediaGateway] No session found for ${uuid}`);
            return;
        }

        // Create RTP header (12 bytes)
        const rtpHeader = Buffer.alloc(12);
        rtpHeader[0] = 0x80;  // Version 2, no padding, no extension
        rtpHeader[1] = 0x0B;  // Payload type 11 (L16 stereo) - use 0x0A for mono

        // Increment sequence number
        session.sequenceNumber = (session.sequenceNumber + 1) & 0xFFFF;
        rtpHeader.writeUInt16BE(session.sequenceNumber, 2);

        // Increment timestamp (160 samples per 20ms frame at 16kHz)
        session.timestamp += 160;
        rtpHeader.writeUInt32BE(session.timestamp, 4);

        // SSRC (extract from UUID)
        const ssrc = parseInt(uuid.split('-')[1]);
        rtpHeader.writeUInt32BE(ssrc, 8);

        // Combine header + audio
        const rtpPacket = Buffer.concat([rtpHeader, pcmBuffer]);

        // Send to remote address
        this.sendSocket.send(
            rtpPacket,
            this.sendPort,
            session.remoteAddress,
            (err) => {
                if (err) {
                    console.error(`[MediaGateway] Send error for ${uuid}:`, err);
                }
            }
        );
    }

    close() {
        this.receiveSocket.close();
        this.sendSocket.close();
    }
}

module.exports = MediaGatewayRTPHandler;
```

**Key Differences from AudioSocket:**
| Aspect | AudioSocket (7000/7001) | MediaGateway (7777/8888) |
|--------|------------------------|--------------------------|
| Protocol | TCP | UDP (RTP) |
| Sample Rate | 8kHz | 16kHz (BETTER QUALITY) |
| Header | 3 bytes (custom) | 12 bytes (RTP standard) |
| Byte Order | Little-endian (swap needed) | Big-endian (NO swap) |
| Amplification | 500x on output | NONE (RTP levels correct) |
| Frame Size | Variable | 320 bytes (20ms @ 16kHz) |
| Ports | 5050-5057 | 17000, 18000 |

---

### PHASE 2: Media Gateway Integration Layer (externalmedia-integration.js)

**Purpose:** Mirror of audiosocket-integration.js for Media Gateway

**File:** `/home/azureuser/translation-app/externalmedia-integration.js`

**Structure (based on audiosocket-integration.js):**
```javascript
// ============================================================================
// Complete MediaGateway Pipeline: STT → Translation → TTS
// Asterisk (RTP) → Deepgram → DeepL → ElevenLabs (PCM) → Asterisk (RTP)
// Uses 16kHz throughout - NO resampling needed!
// Extensions 7777 and 8888 bidirectional translation
// ============================================================================

require('dotenv').config();

const MediaGatewayRTPHandler = require('./externalmedia-rtp-handler');
const { ASRStreamingWorker } = require('./asr-streaming-worker');
const { DeepLIncrementalMT } = require('./deepl-incremental-mt');
const ElevenLabsTTSService = require('./elevenlabs-tts-service');
const AudioStreamBuffer = require('./audio-stream-buffer');

// Get API keys
const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
const deeplApiKey = process.env.DEEPL_API_KEY;
const deeplApiKey7888 = process.env.DEEPL_API_KEY_7888 || deeplApiKey;
const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

console.log('[MediaGateway] Initializing translation pipeline...');
console.log('[MediaGateway] Deepgram:', deepgramApiKey ? '✓' : '✗');
console.log('[MediaGateway] DeepL:', deeplApiKey ? '✓' : '✗');
console.log('[MediaGateway] ElevenLabs:', elevenlabsApiKey ? '✓' : '✗');

// Initialize RTP handlers
const mediaGateway7777 = new MediaGatewayRTPHandler('7777', 17000, 18000);
const mediaGateway8888 = new MediaGatewayRTPHandler('8888', 18000, 17000);

// Start listening
mediaGateway7777.start();
mediaGateway8888.start();

// Initialize translation services
const translator7777 = deeplApiKey ? new DeepLIncrementalMT(deeplApiKey) : null;
const translator8888 = deeplApiKey7888 ? new DeepLIncrementalMT(deeplApiKey7888) : null;
const ttsService = elevenlabsApiKey ? new ElevenLabsTTSService(elevenlabsApiKey) : null;

// Session management
const activeSessions = new Map();

function getExtensionFromUUID(uuid) {
    if (!uuid) return null;
    if (uuid === "7777" || uuid === "7888") return uuid;
    if (uuid.startsWith("7777")) return "7777";
    if (uuid.startsWith("8888")) return "8888";
    return null;
}

function getTranslator(extension) {
    console.log("[DeepL Router] Extension:", extension,
                "-> Using translator7777:", (extension !== "8888"),
                "translator8888:", (extension === "8888"));
    if (extension === "8888") return translator8888;
    return translator7777;
}

function getSession(uuid, extensionId) {
    if (!activeSessions.has(uuid)) {
        console.log('[MediaGateway] Creating new session for:', uuid);
        const extension = extensionId || getExtensionFromUUID(uuid);
        activeSessions.set(uuid, {
            uuid: uuid,
            extension: extension,
            asrWorker: null,
            audioStreamBuffer: null,
            created: Date.now()
        });
    }
    return activeSessions.get(uuid);
}

// Handle incoming audio from RTP
mediaGateway7777.on('audio', (data) => {
    handleIncomingAudio(data);
});

mediaGateway8888.on('audio', (data) => {
    handleIncomingAudio(data);
});

function handleIncomingAudio(data) {
    const { uuid, extension, audio } = data;

    // Get or create session
    let session = getSession(uuid, extension);

    // Initialize ASR worker if needed
    if (!session.asrWorker) {
        initializeASRWorker(uuid);
    }

    // Initialize Audio Stream Buffer if needed
    if (!session.audioStreamBuffer) {
        initializeAudioStreamBuffer(uuid);
    }

    // Send audio to ASR (16kHz - better quality than 8kHz!)
    session.asrWorker.sendAudio(audio, {
        segmentId: Date.now(),
        duration: 20  // 20ms frames
    });
}

function initializeASRWorker(uuid) {
    const session = getSession(uuid);
    const qaConfig = global.qaConfigs?.get(session.extension) || {};

    console.log('[MediaGateway] Initializing ASR for:', uuid);

    session.asrWorker = new ASRStreamingWorker(deepgramApiKey, {
        language: qaConfig.sourceLang || 'en',
        model: 'nova-2',
        sampleRate: 16000,  // 16kHz for better quality!
        encoding: 'linear16',
        channels: 1
    });

    session.asrWorker.on('transcript', async (transcript) => {
        await handleTranscript(uuid, transcript);
    });

    session.asrWorker.start();
}

function initializeAudioStreamBuffer(uuid) {
    const session = getSession(uuid);

    console.log('[MediaGateway] Initializing AudioStreamBuffer for:', uuid);

    session.audioStreamBuffer = new AudioStreamBuffer({
        sampleRate: 16000,  // 16kHz - NO resampling needed!
        channels: 1,
        bitDepth: 16,
        maxBufferSize: 2000
    });

    // Listen for processed audio
    session.audioStreamBuffer.on('audioReady', (audioData) => {
        const pcmBuffer = audioData.buffer;
        sendAudioToMediaGateway(uuid, pcmBuffer);
    });
}

async function handleTranscript(uuid, transcript) {
    const session = getSession(uuid);
    const qaConfig = global.qaConfigs?.get(session.extension) || {};

    console.log(`[MediaGateway] ${uuid} Transcript:`, transcript.text);

    // Translate
    const translator = getTranslator(session.extension);
    const translatedText = await translator.translate(
        transcript.text,
        qaConfig.sourceLang || 'en',
        qaConfig.targetLang || 'es'
    );

    console.log(`[MediaGateway] ${uuid} Translation:`, translatedText);

    // TTS
    const audioBuffer = await ttsService.synthesize(translatedText, {
        voiceId: getVoiceForExtension(session.extension),
        outputFormat: 'pcm_16000'  // 16kHz PCM
    });

    // Add to buffer for latency sync
    session.audioStreamBuffer.addAudio(audioBuffer);
}

function sendAudioToMediaGateway(uuid, pcmBuffer) {
    const session = getSession(uuid);

    // Get target extension (cross-routing)
    const targetExtension = (session.extension === '7777') ? '8888' : '7777';

    // Get target MediaGateway handler
    const targetGateway = (targetExtension === '7777') ? mediaGateway7777 : mediaGateway8888;

    // Create target UUID (use same SSRC for routing)
    const ssrc = uuid.split('-')[1];
    const targetUUID = `${targetExtension}-${ssrc}`;

    console.log(`[MediaGateway] Sending audio from ${uuid} to ${targetUUID}`);

    // Send via RTP (NO amplification, NO resampling)
    targetGateway.sendAudio(targetUUID, pcmBuffer);
}

function getVoiceForExtension(extension) {
    const qaConfig = global.qaConfigs?.get(extension) || {};
    // Return appropriate voice based on target language
    return qaConfig.targetLang === 'es' ? 'spanish_voice_id' : 'english_voice_id';
}

// Export for cleanup
module.exports = {
    mediaGateway7777,
    mediaGateway8888,
    activeSessions
};
```

---

### PHASE 3: Modify conference-server.js

**Changes Required:**

#### 3a. Add QA Configs for 7777/8888
```javascript
// After existing QA configs for 7000/7001
global.qaConfigs.set('7777', {
    sourceLang: 'en',
    targetLang: 'es',
    qaMode: false
});

global.qaConfigs.set('8888', {
    sourceLang: 'es',
    targetLang: 'en',
    qaMode: false
});

console.log('[QA Config] Extensions 7777/8888 configured');
```

#### 3b. Load MediaGateway Integration
```javascript
// After audiosocket-integration (if present)
try {
    require('./externalmedia-integration');
    console.log('[MediaGateway] Integration loaded for extensions 7777, 8888');
} catch (error) {
    console.error('[MediaGateway] Failed to load integration:', error.message);
}
```

---

### PHASE 4: Update Asterisk Configuration

**File:** `/etc/asterisk/extensions.conf`

```ini
[from-internal]
; Existing AudioSocket extensions - DO NOT MODIFY
exten => 7000,1,NoOp(Call to translation extension 7000)
exten => 7000,n,AudioSocket(...)
exten => 7001,1,NoOp(Call to translation extension 7001)
exten => 7001,n,AudioSocket(...)

; NEW: Media Gateway extensions using ExternalMedia + ARI
exten => 7777,1,NoOp(Call to MediaGateway extension 7777)
exten => 7777,n,Answer()
exten => 7777,n,Stasis(media-gateway-translation,7777)
exten => 7777,n,Hangup()

exten => 8888,1,NoOp(Call to MediaGateway extension 8888)
exten => 8888,n,Answer()
exten => 8888,n,Stasis(media-gateway-translation,8888)
exten => 8888,n,Hangup()
```

---

### PHASE 5: Create ARI Handler for Media Gateway

**File:** `/home/azureuser/translation-app/media-gateway-ari-handler.js`

**Purpose:** Handle ARI Stasis events and create ExternalMedia channels

```javascript
const ari = require('ari-client');

const ARI_URL = 'http://localhost:8088';
const ARI_USER = process.env.ASTERISK_ARI_USERNAME || 'dev';
const ARI_PASS = process.env.ASTERISK_ARI_PASSWORD || 'asterisk';
const APP_NAME = 'media-gateway-translation';

// RTP configuration
const CONFIG = {
    '7777': {
        bridgeId: 'bridge-7777',
        rtpHost: '127.0.0.1:17000'  // Where Asterisk sends/receives RTP
    },
    '8888': {
        bridgeId: 'bridge-8888',
        rtpHost: '127.0.0.1:18000'
    }
};

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Media Gateway ARI Handler                                 ║');
console.log('║  Extensions 7777 and 8888 bidirectional translation        ║');
console.log('╚════════════════════════════════════════════════════════════╝');

ari.connect(ARI_URL, ARI_USER, ARI_PASS)
    .then(client => {
        console.log('✓ ARI Connected to Asterisk');

        client.on('StasisStart', async (event, channel) => {
            const extension = event.args[0];  // '7777' or '8888'

            console.log(`[${extension}] User channel entered Stasis: ${channel.id}`);

            if (!CONFIG[extension]) {
                console.error(`[${extension}] ✗ Invalid extension`);
                return channel.hangup().catch(() => {});
            }

            const config = CONFIG[extension];

            try {
                // 1. Create or get mixing bridge
                let bridge;
                try {
                    bridge = await client.bridges.get({ bridgeId: config.bridgeId });
                    console.log(`[${extension}] ✓ Bridge exists: ${config.bridgeId}`);
                } catch (e) {
                    bridge = await client.bridges.create({
                        type: 'mixing',
                        name: config.bridgeId,
                        bridgeId: config.bridgeId
                    });
                    console.log(`[${extension}] ✓ Created bridge: ${config.bridgeId}`);
                }

                // 2. Add user channel to bridge
                await bridge.addChannel({ channel: channel.id });
                console.log(`[${extension}] ✓ User channel added to bridge`);

                // 3. Create ExternalMedia channel for bidirectional RTP
                const externalChannelId = `external-${extension}-${Date.now()}`;
                const externalChannel = await client.channels.externalMedia({
                    app: APP_NAME,
                    external_host: config.rtpHost,
                    format: 'slin16',  // 16kHz PCM
                    channelId: externalChannelId
                });
                console.log(`[${extension}] ✓ ExternalMedia channel created: ${externalChannel.id}`);

                // 4. Add ExternalMedia channel to bridge
                await bridge.addChannel({ channel: externalChannel.id });
                console.log(`[${extension}] ✓ ExternalMedia channel added to bridge`);

                console.log(`[${extension}] ════════════════════════════════════════`);
                console.log(`[${extension}] ✓ Translation channel READY`);
                console.log(`[${extension}] Bridge: ${config.bridgeId}`);
                console.log(`[${extension}] RTP: ${config.rtpHost}`);

            } catch (error) {
                console.error(`[${extension}] ✗ Setup failed:`, error.message);
                channel.hangup().catch(() => {});
            }
        });

        client.on('StasisEnd', (event, channel) => {
            console.log(`[ARI] Channel left Stasis: ${channel.id}`);
        });

        client.start(APP_NAME);
        console.log(`✓ ARI application started: ${APP_NAME}`);

    })
    .catch(error => {
        console.error('✗ ARI Connection failed:', error.message);
        process.exit(1);
    });

module.exports = {};
```

---

### PHASE 6: Load ARI Handler in conference-server.js

```javascript
// After loading externalmedia-integration
try {
    require('./media-gateway-ari-handler');
    console.log('[ARI] Media Gateway ARI handler loaded');
} catch (error) {
    console.error('[ARI] Failed to load handler:', error.message);
}
```

---

## 🔄 COMPLETE DATA FLOW DIAGRAM

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         PARALLEL TRANSLATION SYSTEMS                      │
└──────────────────────────────────────────────────────────────────────────┘

SYSTEM 1: AudioSocket (7000 ↔ 7001) - UNTOUCHED
═══════════════════════════════════════════════════════
SIP 7000 → Asterisk → AudioSocket (TCP 5050, 8kHz)
         → audiosocket-integration.js
         → [STT → MT → TTS → LS Buffer]
         → WebSocket (16kHz) → AudioSocket (5053, 8kHz)
         → Asterisk → SIP 7001 (hears 7000's translation)

SIP 7001 → Asterisk → AudioSocket (TCP 5052, 8kHz)
         → audiosocket-integration.js
         → [STT → MT → TTS → LS Buffer]
         → WebSocket (16kHz) → AudioSocket (5051, 8kHz)
         → Asterisk → SIP 7000 (hears 7001's translation)

SYSTEM 2: Media Gateway (7777 ↔ 8888) - NEW
═══════════════════════════════════════════════════════
SIP 7777 → Asterisk → ARI Stasis → ExternalMedia (RTP UDP 17000, 16kHz)
         → MediaGatewayRTPHandler
         → externalmedia-integration.js
         → [STT → MT → TTS → LS Buffer]
         → MediaGatewayRTPHandler (18000, 16kHz)
         → ExternalMedia → Asterisk → SIP 8888 (hears 7777's translation)

SIP 8888 → Asterisk → ARI Stasis → ExternalMedia (RTP UDP 18000, 16kHz)
         → MediaGatewayRTPHandler
         → externalmedia-integration.js
         → [STT → MT → TTS → LS Buffer]
         → MediaGatewayRTPHandler (17000, 16kHz)
         → ExternalMedia → Asterisk → SIP 7777 (hears 8888's translation)

SHARED COMPONENTS:
═══════════════════════════════════════════════════════
- ASRStreamingWorker (Deepgram STT)
- DeepLIncrementalMT (DeepL Translation)
- ElevenLabsTTSService (Text-to-Speech)
- AudioStreamBuffer (Latency Sync + Timing)
- global.qaConfigs (Language configuration)
```

---

## 📊 COMPARISON TABLE

| Feature | AudioSocket (7000/7001) | Media Gateway (7777/8888) |
|---------|------------------------|---------------------------|
| **Protocol** | TCP AudioSocket | UDP RTP |
| **Sample Rate** | 8kHz | **16kHz** (better quality!) |
| **Audio Format** | PCM with 3-byte header | PCM with 12-byte RTP header |
| **Byte Order** | Little-endian (needs swap) | Big-endian (no swap) |
| **Input Ports** | 5050, 5052 (TCP) | 17000, 18000 (UDP) |
| **Output Ports** | 5051, 5053 (TCP) | 18000, 17000 (UDP) |
| **Amplification** | 500x on output | **NONE** (RTP levels correct) |
| **Resampling** | 16kHz → 8kHz on output | **NONE** (16kHz throughout) |
| **Integration File** | audiosocket-integration.js | externalmedia-integration.js |
| **ARI Required** | No | **Yes** |
| **File Status** | MISSING in current branch | **NEW - to be created** |
| **Extensions** | 7000 ↔ 7001 | 7777 ↔ 8888 |
| **Cross-routing** | Via WebSocket ports | Via RTP handlers |

---

## ✅ IMPLEMENTATION CHECKLIST

### Pre-Implementation
- [ ] Backup current working state: `git branch backup-$(date +%Y%m%d-%H%M%S)`
- [ ] Verify VM: **Working ONLY on http://20.170.155.53/**
- [ ] Confirm AudioSocket system (7000/7001) still working
- [ ] Review all files marked for creation

### Phase 1: RTP Handler
- [ ] Create `/home/azureuser/translation-app/externalmedia-rtp-handler.js`
- [ ] Test UDP listening on ports 17000 and 18000
- [ ] Verify RTP header stripping (12 bytes)
- [ ] Test audio emission events

### Phase 2: Integration Layer
- [ ] Create `/home/azureuser/translation-app/externalmedia-integration.js`
- [ ] Mirror structure from audiosocket-integration.js
- [ ] Initialize MediaGatewayRTPHandler instances
- [ ] Set up session management with UUID format "7777-{ssrc}", "8888-{ssrc}"
- [ ] Connect to translation pipeline (STT → MT → TTS → LS Buffer)
- [ ] Implement cross-extension routing (7777 → 8888, 8888 → 7777)

### Phase 3: ARI Handler
- [ ] Create `/home/azureuser/translation-app/media-gateway-ari-handler.js`
- [ ] Connect to Asterisk ARI
- [ ] Handle StasisStart events
- [ ] Create mixing bridges for 7777 and 8888
- [ ] Create ExternalMedia channels with correct RTP endpoints

### Phase 4: Server Configuration
- [ ] Add QA configs for 7777/8888 in conference-server.js
- [ ] Load externalmedia-integration.js
- [ ] Load media-gateway-ari-handler.js
- [ ] Verify no conflicts with AudioSocket system

### Phase 5: Asterisk Configuration
- [ ] Update `/etc/asterisk/extensions.conf` with 7777/8888 dialplan
- [ ] Reload Asterisk dialplan: `asterisk -rx "dialplan reload"`
- [ ] Verify ARI user credentials in `/etc/asterisk/ari.conf`

### Phase 6: Testing
- [ ] Start conference-server.js
- [ ] Verify both systems load without errors
- [ ] Check UDP ports 17000, 18000 are listening
- [ ] Test SIP call to 7777
- [ ] Test SIP call to 8888
- [ ] Verify cross-extension translation (7777 hears 8888, 8888 hears 7777)
- [ ] Check audio quality (16kHz should be clearer than 8kHz)
- [ ] Verify AudioSocket system (7000/7001) still works
- [ ] Monitor latency and sync timing
- [ ] Check for echo or feedback issues

### Post-Implementation
- [ ] Document any issues encountered
- [ ] Create git checkpoint if successful
- [ ] Update monitoring dashboards if needed

---

## ⚠️ CRITICAL CONSTRAINTS

1. **NEVER touch extensions 7000/7001** ✓
2. **NEVER touch audiosocket-integration.js** (it's missing anyway) ✓
3. **Keep AudioSocket system 100% operational** ✓
4. **No byte swapping for RTP** (keep big-endian) ✓
5. **No unnecessary amplification** (RTP levels correct) ✓
6. **Maintain UUID format**: `{extension}-{identifier}` ✓
7. **16kHz throughout** (no resampling) ✓
8. **Work ONLY on VM http://20.170.155.53/** ✓
9. **NEVER touch VM http://4.185.84.26/** ✓

---

## 🎯 SUCCESS CRITERIA

The integration is complete when:
1. ✓ Two SIP phones can call 7777 and 8888
2. ✓ They hear each other's translated speech in real-time
3. ✓ Latency is similar to AudioSocket system (~1-2 seconds)
4. ✓ No echo, feedback, or audio quality issues
5. ✓ Audio quality is noticeably better (16kHz vs 8kHz)
6. ✓ Extensions 7000/7001 remain completely functional
7. ✓ System is stable for long calls (>5 minutes)
8. ✓ Cross-extension routing works correctly (7777 ↔ 8888)

---

## 🚀 ESTIMATED TIMELINE

- **Phase 1 (RTP Handler):** 1-2 hours
- **Phase 2 (Integration Layer):** 3-4 hours (largest file, ~1200 lines)
- **Phase 3 (ARI Handler):** 1 hour
- **Phase 4 (Server Config):** 30 minutes
- **Phase 5 (Asterisk Config):** 30 minutes
- **Phase 6 (Testing):** 2-3 hours

**Total Estimated:** 8-11 hours

---

*Plan created: 2025-11-05*
*Target VM: http://20.170.155.53/ ONLY*
*Status: Ready for implementation*
