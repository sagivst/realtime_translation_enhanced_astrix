# ExternalMedia Architecture for Extensions 7777 & 8888

## Overview

This document describes the ExternalMedia/RTP integration for SIP extensions 7777 and 8888, which provides real-time translation capabilities using Asterisk's ExternalMedia channel type.

## System Architecture

### High-Level Flow

```
User Call (7777/8888)
    ↓
Asterisk Dialplan (extensions.conf)
    ↓
Stasis Application (translation-app)
    ↓
ARI StasisStart Event
    ↓
ExternalMedia Handler (audiosocket-integration-rtp.js)
    ↓
Creates 3 Channels in Bridge:
    1. User Channel (caller)
    2. Capture Channel (Asterisk → RTP Orchestrator)
    3. Inject Channel (RTP Orchestrator → Asterisk)
    ↓
RTP Orchestrator (rtp-orchestrator.js)
    ↓
Translation Pipeline:
    - ASR (Deepgram)
    - Translation (DeepL)
    - TTS (ElevenLabs)
    ↓
Translated Audio Back to User
```

## Components

### 1. Asterisk Configuration

**File:** `/etc/asterisk/extensions.conf`

```ini
[translation]
; Extension 7777: EN speaker (hears ES translation)
exten => 7777,1,NoOp(ExternalMedia Translation - EN to ES)
    same => n,Stasis(translation-app,ext7777)
    same => n,Hangup()

; Extension 8888: ES speaker (hears EN translation)
exten => 8888,1,NoOp(ExternalMedia Translation - ES to EN)
    same => n,Stasis(translation-app,ext8888)
    same => n,Hangup()
```

**Key Points:**
- Calls to 7777/8888 enter the `translation-app` Stasis application
- The second argument (`ext7777`, `ext8888`) is passed to the ARI StasisStart event
- This identifies which extension was dialed

### 2. Conference Server

**File:** `conference-server-rtp.js`

This is the main server file that:
- Initializes the HTTP/HTTPS server
- Loads the `audiosocket-integration-rtp.js` module
- Connects to Asterisk ARI
- Registers the ExternalMedia handler after ARI connection succeeds

**Key Code Section (lines 1475-1493):**

```javascript
// AUDIOSOCKET INTEGRATION
// ============================================================================
const audiosocketIntegration = require("./audiosocket-integration-rtp");
console.log("[AudioSocket] Integration loaded for extensions 7000, 7001");

// Connect to Asterisk ARI (async, won't block server startup)
ariHandler.connect()
  .then(() => {
    console.log('[ARI] ✓ Connected successfully');
    // Setup ExternalMedia handler for extensions 7777, 8888
    if (audiosocketIntegration.setupExternalMediaHandler && ariHandler.ari) {
      audiosocketIntegration.setupExternalMediaHandler(ariHandler.ari);
      console.log('[ExternalMedia] ✓ ARI handler registered for extensions 7777, 8888');
    }
  })
  .catch(err => {
    console.warn('[ARI] Failed to initialize:', err.message);
    console.warn('[ARI] Server will continue without telephony integration');
  });
```

### 3. ExternalMedia ARI Handler

**File:** `audiosocket-integration-rtp.js` (bottom section)

This module exports a `setupExternalMediaHandler` function that:
1. Registers a listener for ARI `StasisStart` events
2. Filters out ExternalMedia channels (to avoid recursion)
3. Detects calls to 7777/8888 based on the extension argument
4. Creates a mixing bridge
5. Creates two ExternalMedia channels:
   - **Capture Channel**: `sendonly` direction - Asterisk sends RTP TO our orchestrator
   - **Inject Channel**: `recvonly` direction - Asterisk receives RTP FROM our orchestrator
6. Adds all channels to the bridge

**Port Configuration:**

```javascript
const EXTERNALMEDIA_CONFIG = {
  '7777': {
    bridgeId: 'bridge-7777',
    capture_remote: '127.0.0.1:17000',  // Asterisk sends RTP TO our orchestrator
    inject_remote: '127.0.0.1:5054'     // Asterisk receives RTP FROM our orchestrator
  },
  '8888': {
    bridgeId: 'bridge-8888',
    capture_remote: '127.0.0.1:18000',  // Asterisk sends RTP TO our orchestrator
    inject_remote: '127.0.0.1:5055'     // Asterisk receives RTP FROM our orchestrator
  }
};
```

**Event Handler Logic:**

```javascript
ariClient.on('StasisStart', async (event, channel) => {
  // Filter out ExternalMedia channels - they enter Stasis but we don't process them
  if (channel.id.startsWith('capture-') || channel.id.startsWith('inject-')) {
    console.log(`[ExternalMedia] Ignoring ExternalMedia channel: ${channel.id}`);
    return;
  }

  // Check if this is an ext7777 or ext8888 call
  const extension = event.args[0]; // 'ext7777' or 'ext8888'
  if (!extension || (!extension.includes('7777') && !extension.includes('8888'))) {
    return; // Not for us, ignore
  }

  const extNum = extension.includes('7777') ? '7777' : '8888';
  const config = EXTERNALMEDIA_CONFIG[extNum];

  // Create/get bridge
  let bridge = await ariClient.bridges.get({ bridgeId: config.bridgeId })
    .catch(() => ariClient.bridges.create({
      type: 'mixing',
      name: config.bridgeId,
      bridgeId: config.bridgeId
    }));

  // Create capture channel (Asterisk → Us)
  const captureChannel = await ariClient.channels.externalMedia({
    app: 'translation-app',
    external_host: config.capture_remote,
    format: 'slin16',
    channelId: `capture-${extNum}-${Date.now()}`,
    variables: { EXTERNALMEDIADIRECTION: 'sendonly' }
  });

  // Create inject channel (Us → Asterisk)
  const injectChannel = await ariClient.channels.externalMedia({
    app: 'translation-app',
    external_host: config.inject_remote,
    format: 'slin16',
    channelId: `inject-${extNum}-${Date.now()}`,
    variables: { EXTERNALMEDIADIRECTION: 'recvonly' }
  });

  // Add all channels to bridge
  await bridge.addChannel({ channel: captureChannel.id });
  await bridge.addChannel({ channel: injectChannel.id });
  await bridge.addChannel({ channel: channel.id });
});
```

### 4. RTP Orchestrator

**File:** `rtp-orchestrator.js`

The RTP Orchestrator handles:
- **RTP Capture**: Receives RTP packets from Asterisk on UDP ports 17000 (7777) and 18000 (8888)
- **Audio Processing**: Converts RTP payload to PCM, handles endianness
- **Mic Injection**: Sends translated audio back to Asterisk via UDP ports 5054 (7777) and 5055 (8888)

**Key Features:**
- Bi-directional UDP sockets (one for RTP capture, one for mic injection)
- RTP header parsing and payload extraction
- Endianness conversion (big-endian RTP → little-endian PCM)
- Session management (tracks active calls by UUID)

**RTP Packet Structure:**
```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|V=2|P|X|  CC   |M|     PT      |       sequence number         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                           timestamp                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|           synchronization source (SSRC) identifier            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                          payload (slin16)                     |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### 5. Translation Pipeline

The translation pipeline processes audio through three stages:

**a. ASR (Automatic Speech Recognition) - Deepgram**
- Input: PCM audio frames (16-bit, 16kHz)
- Output: Transcribed text in source language
- Service: Deepgram WebSocket API
- Model: Language-specific models (en-US, es, etc.)

**b. Translation - DeepL**
- Input: Transcribed text in source language
- Output: Translated text in target language
- Service: DeepL REST API
- Language pairs:
  - 7777: EN → ES
  - 8888: ES → EN

**c. TTS (Text-to-Speech) - ElevenLabs**
- Input: Translated text
- Output: Synthesized speech audio
- Service: ElevenLabs REST API
- Voice IDs:
  - EN: `JBFqnCBsd6RMkjVDRZzb`
  - ES: `gD1IexrzCvsXPHUuT0s3`

## Port Allocation

| Extension | RTP Capture | Mic Injection | Direction |
|-----------|-------------|---------------|-----------|
| 7777      | 17000       | 5054          | EN → ES   |
| 8888      | 18000       | 5055          | ES → EN   |

## Language Configuration

```javascript
const qaConfigs = new Map();
qaConfigs.set('7777', { sourceLang: 'en', targetLang: 'es', qaMode: false });
qaConfigs.set('8888', { sourceLang: 'es', targetLang: 'en', qaMode: false });
```

## Call Flow Example

### Extension 7777 (EN → ES)

1. User dials 7777 from SIP phone
2. Asterisk executes dialplan: `Stasis(translation-app,ext7777)`
3. ARI emits `StasisStart` event with args: `['ext7777']`
4. ExternalMedia handler detects extension 7777
5. Handler creates:
   - Bridge: `bridge-7777`
   - Capture channel: `capture-7777-<timestamp>` → `127.0.0.1:17000`
   - Inject channel: `inject-7777-<timestamp>` ← `127.0.0.1:5054`
   - User channel added to bridge
6. RTP Orchestrator on port 17000 receives RTP packets from Asterisk
7. PCM audio extracted and sent to Deepgram for ASR (English)
8. Transcribed English text sent to DeepL for translation (EN → ES)
9. Spanish translation sent to ElevenLabs for TTS
10. Spanish audio injected back to Asterisk via port 5054
11. User hears Spanish translation in real-time

## Verification Logs

Successful setup produces these log messages:

```
[RTP] Initializing RTP orchestrators for extensions 7777, 8888...
[RTP 7777] Orchestrator created: RTP=17000, Mic=5054
[RTP 8888] Orchestrator created: RTP=18000, Mic=5055
[ExternalMedia] Handler loaded for extensions 7777, 8888
[ARI] ✓ Connected to Asterisk ARI
[ARI] ✓ Stasis application "translation-app" started
[ExternalMedia] Setting up StasisStart handler...
[ExternalMedia] ✓ StasisStart handler registered
[ExternalMedia] Ready to handle ext7777 and ext8888 calls

[ExternalMedia 7777] User channel entered Stasis: 1762367924.296
[ExternalMedia 7777] Creating/getting bridge: bridge-7777
[ExternalMedia 7777] ✓ Created new bridge
[ExternalMedia 7777] Creating CAPTURE channel → 127.0.0.1:17000
[ExternalMedia 7777] ✓ Capture channel created
[ExternalMedia 7777] Creating INJECT channel ← 127.0.0.1:5054
[ExternalMedia 7777] ✓ Inject channel created
[ExternalMedia 7777] ✓ Capture channel bridged
[ExternalMedia 7777] ✓ Inject channel bridged
[ExternalMedia 7777] ✓ User channel bridged
[ExternalMedia 7777] ✓✓✓ SETUP COMPLETE ✓✓✓
```

## Key Differences: AudioSocket vs ExternalMedia

| Aspect | AudioSocket (7000/7001) | ExternalMedia (7777/8888) |
|--------|------------------------|---------------------------|
| Protocol | TCP | UDP (RTP) |
| Port Management | TCP listen on 7200/7201 | UDP sockets on 17000/18000 |
| Channel Creation | Automatic (dialplan) | Programmatic (ARI) |
| Setup | Simpler (no ARI needed) | Complex (requires ARI) |
| Asterisk Version | 16+ | 18+ |
| Flexibility | Limited | High (full ARI control) |

## Troubleshooting

### No ExternalMedia channels created

**Symptoms:**
- User hears ringing but no translation
- No `[ExternalMedia 7777] User channel entered Stasis` logs

**Check:**
1. ARI connection: `grep "ARI.*Connected" /tmp/conf-rtp-complete.log`
2. Stasis app name: Should be `translation-app` in both `ari.conf` and `extensions.conf`
3. Extension argument: `Stasis(translation-app,ext7777)` must include the `ext7777` argument

### RTP packets not received

**Symptoms:**
- ExternalMedia setup completes but no audio processing
- No `[RTP 7777]` logs showing packet reception

**Check:**
1. UDP ports open: `netstat -an | grep -E '17000|18000'`
2. Asterisk RTP configuration in `/etc/asterisk/rtp.conf`
3. Firewall rules for UDP traffic

### Translation not working

**Symptoms:**
- Audio received but no translation output
- ASR/TTS errors in logs

**Check:**
1. API keys configured in `.env` file
2. QA configs set correctly: `grep "qaConfigs.set" audiosocket-integration-rtp.js`
3. Translation pipeline logs: `grep -E '(ASR|Translation|TTS)' /tmp/conf-rtp-complete.log`

## Files Modified

1. **conference-server-rtp.js** (lines 1475-1493)
   - Added `setupExternalMediaHandler` call after ARI connection

2. **audiosocket-integration-rtp.js** (end of file)
   - Added `setupExternalMediaHandler` function
   - Added `EXTERNALMEDIA_CONFIG` constant
   - Added StasisStart event handler

3. **/etc/asterisk/extensions.conf**
   - Added extensions 7777 and 8888 with Stasis application

## Next Steps

To test the system:

1. Call extension 7777 from one SIP phone (EN speaker)
2. Call extension 8888 from another SIP phone (ES speaker)
3. Speak in English on 7777 - should hear Spanish translation
4. Speak in Spanish on 8888 - should hear English translation
5. Monitor logs: `tail -f /tmp/conf-rtp-complete.log`
6. Check browser monitoring page: `http://<server-ip>:3000/translation-monitor.html`

## References

- Asterisk ExternalMedia: https://docs.asterisk.org/Asterisk_18_Documentation/API_Documentation/Dialplan_Applications/ExternalMedia/
- ARI Documentation: https://docs.asterisk.org/Asterisk_18_Documentation/API_Documentation/Asterisk_REST_Interface/
- RTP RFC: https://www.rfc-editor.org/rfc/rfc3550
- Deepgram API: https://developers.deepgram.com/
- DeepL API: https://developers.deepl.com/
- ElevenLabs API: https://docs.elevenlabs.io/
