# Translation System - Quick Reference Guide

## Connection Flow (Extensions 7000 & 7001)

```
ASTERISK                    TRANSLATION APP                    OUTPUT
════════                    ════════════════                    ══════

Ext 7000 (EN) ──TCP 5050──→ AudioSocket Orchestrator ──WS 5053──→ Bridge 7001
   ↑                             ↓                                    ↓
   │                        ASR → MT → TTS                        Ext 7001
   │                             ↓                                   hears
   │                        AudioStreamBuffer                         FR
   │                                                                  ↓
   └──────────────────────────────────────────────────────────────────┘

Ext 7001 (FR) ──TCP 5052──→ AudioSocket Orchestrator ──WS 5051──→ Bridge 7000
   ↑                             ↓                                    ↓
   │                        ASR → MT → TTS                        Ext 7000
   │                             ↓                                   hears
   │                        AudioStreamBuffer                         EN
   │                                                                  ↓
   └──────────────────────────────────────────────────────────────────┘
```

## Port Mapping Cheat Sheet

| Component | Extension 7000 | Extension 7001 | Purpose |
|-----------|---------------|---------------|---------|
| AudioSocket TCP (IN) | 5050 | 5052 | Audio from Asterisk |
| WebSocket (OUT) | 5051 | 5053 | Audio to Asterisk |
| Routing | Sends to 5053 | Sends to 5051 | Cross-extension |
| Bridge Monitor | 5054 | 5056 | Output verification |

## Translation Pipeline Stages (9 Serial + 3 Parallel)

### Serial Path (Main Pipeline)
```
1. AudioSocket→ASR     [10-50ms]    Network/overhead
2. ASR (Deepgram)      [200-400ms]  Speech recognition
3. ASR→MT              [5-20ms]     Overhead
4. MT (DeepL)          [100-300ms]  Translation
5. MT→TTS              [5-15ms]     Overhead
6. TTS (ElevenLabs)    [500-1000ms] Speech synthesis
7. TTS→LS              [5-10ms]     Overhead
8. LS (Sync Buffer)    [0-500ms]    Synchronization
9. LS→Bridge           [5-20ms]     Overhead
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Serial:          ~1000-2400ms
```

### Parallel Path (Emotion Detection)
```
1. AudioSocket→EV      [10-50ms]    Network/overhead
2. Hume (Emotion)      [100-300ms]  Emotion extraction
3. EV→TTS              [5-20ms]     Overhead
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Parallel:        ~200-500ms
```

### E2E Latency
```
E2E = max(Serial, Parallel)
If Serial (2000ms) > Parallel (400ms) → E2E = 2000ms
If Parallel (600ms) > Serial (500ms) → E2E = 600ms (bottleneck)
```

## UUID Format & Session Management

### UUID Structure
```
Format: {extension}-{asterisk-uuid}

Example 7000: "7000-a1b2c3d4-e5f6-7890-abcd-ef1234567890"
Example 7001: "7001-f9e8d7c6-b5a4-3210-9876-543210fedcba"

Extraction: uuid.startsWith("7000") → Extension 7000
           uuid.startsWith("7001") → Extension 7001
```

### Session Object
```javascript
{
    uuid: "7000-xxxxx",
    extension: "7000",
    asrWorker: ASRStreamingWorker,
    humeWorker: HumeStreamingClient,
    audioStreamBuffer: AudioStreamBuffer,
    micWebSocket: WebSocket,
    // Timing markers
    firstAudioFrameTime: timestamp,
    lsEnterTime: timestamp,
    lsExitTime: timestamp,
    bridgeInjectTime: timestamp
}
```

## Key Files & Responsibilities

```
audiosocket-orchestrator.js
├─ AudioSocket protocol handler
├─ 3-byte header parsing (TCP)
├─ WebSocket server for output
└─ Port-to-extension mapping

audiosocket-integration.js
├─ Translation pipeline coordinator
├─ ASR/MT/TTS orchestration
├─ Session management
├─ Cross-extension routing
└─ Timing instrumentation

audio-stream-buffer.js
├─ PCM audio buffering
├─ Comfort noise generation
├─ VAD-based level adjustment
└─ Latency delay management

latency-sync-manager.js
├─ E2E latency tracking
├─ 9 serial + 3 parallel stages
├─ Synchronization algorithm
└─ Socket.IO dashboard updates

conference-server.js
├─ Main server & global state
├─ Socket.IO hub
├─ QA configs (language settings)
└─ Timing client integration

bidirectional-timing-server.js (Phase 2)
├─ Extension pair tracking
├─ Latency difference buffering
└─ Audio injection callbacks

timing-client.js
├─ TCP client to timing server
├─ Send AUDIO_PACKET messages
└─ Handle INJECT_AUDIO responses
```

## Audio Format Specifications

### AudioSocket TCP (Incoming)
```
Protocol: 3-byte header + payload
Header:   [type][length_high][length_low]
Frame:    320 bytes (20ms @ 8kHz PCM)
Rate:     8000 Hz
Channels: 1 (mono)
Depth:    16-bit signed
```

### WebSocket (Outgoing)
```
Protocol: Raw PCM binary
Frame:    640 bytes (20ms @ 16kHz PCM)
Rate:     16000 Hz
Channels: 1 (mono)
Depth:    16-bit signed
URL:      ws://127.0.0.1:{port}/mic/{uuid}
```

### ElevenLabs TTS Output
```
Format:   PCM 16kHz
Request:  output_format: "pcm_16000"
Model:    eleven_multilingual_v2
Voice:    Configurable (ELEVENLABS_DEFAULT_VOICE_ID)
```

## Synchronization Algorithm

### Goal
Keep both extensions synchronized by buffering faster direction

### Logic
```
1. Calculate E2E latency for both extensions
2. Find max(E2E_7000, E2E_7001)
3. For each extension:
   bufferNeeded = maxLatency - currentLatency
   targetBuffer = bufferNeeded + baseBuffer + safetyMargin
4. If |adjustment| > threshold (20ms):
   Apply buffer adjustment
```

### Parameters
```
baseBuffer = 100ms           (baseline delay)
safetyMargin = 50ms          (prevent underrun)
adjustmentThreshold = 20ms   (minimum change)
syncIntervalMs = 500ms       (check frequency)
```

## Phase 1 vs Phase 2 Modes

### Phase 1: Direct Injection (DEFAULT)
```
AudioStreamBuffer → Direct WebSocket → Bridge
- Immediate injection after LS buffer
- No cross-extension latency compensation
- TIMING_PHASE2_ENABLED=false
```

### Phase 2: Timing Server Buffering (EXPERIMENTAL)
```
AudioStreamBuffer → Timing Server → INJECT_AUDIO callback → Bridge
- Cross-extension latency compensation
- Bidirectional synchronization
- TIMING_PHASE2_ENABLED=true
```

## Environment Variables Quick Reference

```bash
# API Keys
DEEPGRAM_API_KEY=<key>
DEEPL_API_KEY=<key>
DEEPL_API_KEY_7001=<key>
ELEVENLABS_API_KEY=<key>
ELEVENLABS_DEFAULT_VOICE_ID=<voice-id>
HUME_EVI_API_KEY=<key>

# Feature Flags
TIMING_PHASE2_ENABLED=false

# Ports (defaults)
AUDIOSOCKET_7000_PORT=5050
AUDIOSOCKET_7001_PORT=5052
WEBSOCKET_7000_PORT=5051
WEBSOCKET_7001_PORT=5053
TIMING_SERVER_PORT=6000
```

## Comfort Noise Configuration

```javascript
global.comfortNoiseConfig = {
    enabled: true,
    noiseType: 'white',         // 'white', 'pink', 'brown'
                                 // 'call-center', 'trading-room'
    speechLevel: -30,            // dB during speech (quiet)
    silenceLevel: -15,           // dB during gaps (moderate)
    vadThreshold: 0.01,          // Voice activity detection
    fadeInMs: 50,                // Fade in duration
    fadeOutMs: 50,               // Fade out duration
    bufferDelay: 0               // Manual buffer delay (ms)
}

// Update dynamically:
global.applyComfortNoiseConfig();
```

## Debugging Commands

### Check Active Sessions
```bash
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app
pm2 logs conference-server --lines 50
```

### View Timing Server Status
```bash
curl http://127.0.0.1:6001/status
```

### Monitor AudioSocket Connections
```bash
netstat -an | grep 5050  # Extension 7000
netstat -an | grep 5052  # Extension 7001
```

### Check Recordings
```bash
ls -lh /home/azureuser/translation-app/recordings/
```

## Critical Design Insights

1. **Cross-Extension Routing is Key**
   - Ext 7000 audio → Bridge 7001 (not 7000)
   - Ext 7001 audio → Bridge 7000 (not 7001)
   - Creates bidirectional translation loop

2. **Separate DeepL Instances Prevent Blocking**
   - translator7000 for Extension 7000
   - translator7001 for Extension 7001
   - Concurrent translation without mutual blocking

3. **Latency Sync Keeps Conversation Natural**
   - Buffer faster direction to match slower
   - Prevents "talking over" effect
   - Maintains turn-taking flow

4. **Timing Instrumentation is Comprehensive**
   - 9 serial + 3 parallel measurement points
   - Real-time Socket.IO updates
   - Dashboard visualization ready

5. **Phase 2 Enables Bidirectional Compensation**
   - Timing server tracks both directions
   - Buffers based on latency difference
   - Ensures synchronized audio injection

---

**Quick Start Checklist:**

- [ ] SSH to Azure VM: `ssh azureuser@20.170.155.53`
- [ ] Check service status: `pm2 list`
- [ ] Verify AudioSocket ports: `netstat -an | grep 505`
- [ ] Monitor logs: `pm2 logs conference-server`
- [ ] Test extensions: Dial 7000 and 7001
- [ ] View dashboard: Browser dashboard for latency metrics
- [ ] Check recordings: `ls -lh recordings/`

---

**Generated:** 2025-11-05  
**System:** Azure VM Production  
**Location:** /home/azureuser/translation-app/
