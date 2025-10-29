# Gap Analysis Report
## Realtime Translation: Current vs. Asterisk-Based Architecture

**Generated:** October 15, 2025
**Comparing:**
- **Current:** `realtime-translation-enhanced` (WebRTC/Socket.io)
- **Target:** Asterisk-based Speaker-Adaptive System (DevSpec v2.1)

---

## Executive Summary

The current implementation is a **browser-based WebRTC/Socket.io** real-time translation system using **Deepgram, DeepL, and ElevenLabs**. The target architecture requires a complete redesign around **Asterisk PBX** with **SIP/RTP**, custom voice cloning via **XTTS v2**, and frame-level media orchestration.

**Overall Gap:** **~85% new development required**

### Critical Architectural Differences

| Aspect | Current | Target | Gap Severity |
|--------|---------|--------|--------------|
| **Transport Layer** | WebRTC/Socket.io | SIP/RTP via Asterisk | ⛔ **CRITICAL** |
| **Media Interface** | Browser MediaRecorder | chan_externalmedia (PCM pipes) | ⛔ **CRITICAL** |
| **TTS Engine** | ElevenLabs API | XTTS v2 / Meta VoiceBox (self-hosted) | ⛔ **CRITICAL** |
| **Voice Cloning** | ElevenLabs cloud service | ECAPA-TDNN + GST-Tacotron embeddings | ⛔ **CRITICAL** |
| **Frame Management** | Variable chunk sizes | Fixed 20ms PCM frames | 🟠 **HIGH** |
| **Orchestration** | Event-driven Node.js | Frame-level event loop | 🟠 **HIGH** |
| **Recovery** | Basic reconnection | Multi-layer recovery hierarchy | 🟡 **MEDIUM** |
| **Monitoring** | Basic logs | Prometheus metrics | 🟡 **MEDIUM** |

---

## 1. Infrastructure & Telephony Layer

### 1.1 Asterisk Integration
**Status:** ⛔ **MISSING - 100% Gap**

| Component | Current | Required | Implementation Effort |
|-----------|---------|----------|----------------------|
| Asterisk PBX | ❌ None | ✅ Asterisk 20+ | **HIGH** - Full setup |
| SIP Endpoints | ❌ N/A | ✅ SIP registration | **HIGH** - Configuration |
| ConfBridge | ❌ N/A | ✅ Multi-party mixing | **MEDIUM** - Dialplan |
| chan_externalmedia | ❌ N/A | ✅ PCM pipe interface | **CRITICAL** - Custom module |
| ARI (Asterisk REST Interface) | ❌ N/A | ✅ Event hooks | **MEDIUM** - Integration |

**Required Work:**
```bash
# New infrastructure components needed:
├── asterisk/
│   ├── conf/
│   │   ├── sip.conf          # SIP endpoint configuration
│   │   ├── extensions.conf    # Dialplan routing logic
│   │   ├── confbridge.conf    # Conference settings
│   │   └── externalmedia.conf # PCM pipe configuration
│   ├── modules/
│   │   └── chan_externalmedia # Custom Asterisk module (C)
│   └── ari-hooks/
│       └── event-listener.js  # ARI event integration
```

### 1.2 Media Transport
**Status:** ⛔ **COMPLETE REPLACEMENT - 100% Gap**

| Feature | Current | Target | Gap |
|---------|---------|--------|-----|
| Protocol | WebRTC (SRTP) | SIP/RTP | **Replace** |
| Signaling | Socket.io | SIP | **Replace** |
| Media Codec | WebM/Opus (variable) | PCM16 16kHz mono | **Replace** |
| Frame Size | Variable (100ms-1500ms) | Fixed 20ms | **Redesign** |
| NAT Traversal | STUN/TURN | SIP ALG / STUN | **Reconfigure** |

**Current Code to Replace:**
```javascript
// conference-server.js (Socket.io based)
socket.on('audio-chunk', async (data) => { /* ... */ });
mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm'
});
```

**New Code Required:**
```javascript
// asterisk-media-bridge.js (chan_externalmedia)
const pcmPipe = net.createConnection('/var/run/asterisk/external_media.sock');
pcmPipe.on('data', (frame) => {
    // Fixed 20ms PCM frames (640 bytes @ 16kHz)
    processFrame(frame);
});
```

---

## 2. AI/ML Pipeline

### 2.1 Speech-to-Text (STT/ASR)
**Status:** 🟢 **COMPATIBLE - 20% Gap**

| Component | Current | Target | Action |
|-----------|---------|--------|--------|
| Engine | Deepgram Nova-2 | Deepgram / WhisperRT | **KEEP or REPLACE** |
| Streaming | ✅ Supported | ✅ Required | **ADAPT** |
| Latency | ~300-500ms | <250ms target | **OPTIMIZE** |
| Context | Basic | speaker_id, session_id | **ADD** |

**Required Changes:**
```javascript
// Current
const { text, confidence } = await transcribeAudio(audioBuffer, language);

// Target - Add speaker/session context
const { text, confidence } = await transcribeAudio(
    audioBuffer,
    language,
    {
        speaker_id: 'SAGIV_001',
        session_id: 'room_1234_leg_A',
        seq_num: frameCounter
    }
);
```

### 2.2 Translation (MT)
**Status:** 🟢 **COMPATIBLE - 15% Gap**

| Component | Current | Target | Action |
|-----------|---------|--------|--------|
| Engine | DeepL Pro | DeepL Pro / NLLB | **KEEP or REPLACE** |
| Mode | Batch | Incremental tokens | **ADAPT** |
| Latency | ~100-200ms | 20-60ms target | **OPTIMIZE** |

**Required Enhancement:**
```javascript
// Add incremental/streaming translation
POST /mt/translate
{
  "text": "partial sentence fragment",
  "stream_id": "A1_segment_42",
  "seq_num": 42,
  "partial": true,  // NEW: indicates partial flush
  "source_lang": "he",
  "target_lang": "en"
}
```

### 2.3 Text-to-Speech (TTS)
**Status:** ⛔ **COMPLETE REPLACEMENT - 100% Gap**

| Component | Current | Target | Gap Severity |
|-----------|---------|--------|--------------|
| Engine | **ElevenLabs API** | **XTTS v2 / Meta VoiceBox** | ⛔ **CRITICAL** |
| Hosting | Cloud (external) | Self-hosted (local) | ⛔ **CRITICAL** |
| Voice Model | API-managed | Custom embeddings | ⛔ **CRITICAL** |
| Latency | 400-800ms | <100ms warm start | ⛔ **CRITICAL** |
| Streaming | ✅ Yes | ✅ Required | 🟢 **OK** |
| Output Format | MP3 (variable) | PCM16 20ms frames | 🟠 **HIGH** |

**Complete Replacement Required:**

```python
# NEW: xtts-tts-service.py
import torch
from TTS.tts.models.xtts import Xtts

class XTTSService:
    def __init__(self):
        self.model = Xtts.load_model('xtts-v2')
        self.voice_profiles = {}  # Cached embeddings

    async def synthesize_streaming(self, text, voice_profile):
        """
        Generate PCM16 frames in 20ms chunks
        Target: <100ms warm start, <400ms for full synthesis
        """
        identity_emb = voice_profile['identity_embedding']  # 256-D
        style_emb = voice_profile['style_embedding']        # 64-D

        # Streaming synthesis with embeddings
        for pcm_frame in self.model.synthesize_stream(
            text=text,
            identity_vec=identity_emb,
            style_vec=style_emb,
            frame_size_ms=20
        ):
            yield pcm_frame  # 640 bytes (16kHz * 20ms * 2 bytes)
```

**Dependencies to Add:**
```bash
pip install TTS==0.22.0        # Coqui TTS (XTTS v2)
pip install speechbrain==0.5.16 # ECAPA-TDNN embeddings
pip install torch==2.1.0
```

---

## 3. Voice Profile System

### 3.1 Voice Cloning Architecture
**Status:** ⛔ **COMPLETE REDESIGN - 100% Gap**

| Component | Current | Target | Gap |
|-----------|---------|--------|-----|
| **Voice Service** | ElevenLabs cloud | Local embeddings | ⛔ **CRITICAL** |
| **Identity Model** | ❌ None (API-managed) | ECAPA-TDNN (256-D) | ⛔ **NEW** |
| **Prosody Model** | ❌ None (API-managed) | GST-Tacotron (64-D) | ⛔ **NEW** |
| **Storage** | ❌ Cloud (ElevenLabs) | Local DB + LRU cache | ⛔ **NEW** |
| **Lookup Time** | N/A (API call) | <10ms (in-memory) | ⛔ **NEW** |

**Current Voice System:**
```javascript
// config/elevenlabs-voices.json
{
  "voices": {
    "Boyan_Tiholov": {
      "voiceId": "XPwQNE5RX9Rdhyx0DWcI",  // External API ID
      "name": "Boyan Tiholov",
      "modelId": "eleven_multilingual_v2"
    }
  }
}
```

**Target Voice Profile Schema:**
```json
{
  "speaker_id": "SAGIV_001",
  "identity": {
    "model": "ecapa_tdnn",
    "embedding_ref": "sagiv_001_id_256.bin",  // Local binary file
    "vector": [0.234, -0.891, ...]             // 256-D float array
  },
  "style": {
    "model": "gst_tacotron",
    "embedding_ref": "sagiv_001_style_64.json",
    "vector": [0.123, 0.456, ...]              // 64-D float array
  },
  "default_params": {
    "emotion": "neutral",
    "speed": 0.97,
    "pitch": -1
  },
  "created_at": "2025-10-10T08:20:00Z",
  "version": "v2.3"
}
```

**New Components Required:**
```python
# voice-profile-service/
├── embeddings/
│   ├── identity_extractor.py    # ECAPA-TDNN inference
│   ├── style_extractor.py       # GST-Tacotron inference
│   └── profile_builder.py       # Combines embeddings
├── storage/
│   ├── profile_db.py            # SQLite/PostgreSQL storage
│   ├── embedding_cache.py       # LRU in-memory cache
│   └── models/                  # Pre-trained weights
│       ├── ecapa_tdnn.pt
│       └── gst_tacotron.pt
└── api/
    └── profile_service.py       # REST API for CRUD
```

### 3.2 Voice Training Pipeline
**Status:** ⛔ **COMPLETELY NEW - 100% Gap**

**Current Process:**
1. ✅ Audio samples extracted (`setup-4-voice-profiles.sh`)
2. ✅ Uploaded to ElevenLabs API
3. ❌ **Training happens externally (no local control)**

**Required Process:**
```python
# NEW: voice_training_pipeline.py

async def train_voice_profile(speaker_id, audio_samples):
    """
    Extract embeddings from training samples
    Target: Complete in <5 minutes for 3-5 min of audio
    """

    # Step 1: Extract identity embedding (ECAPA-TDNN)
    identity_vec = await extract_identity_embedding(
        audio_samples,
        model='ecapa_tdnn'
    )  # Output: 256-D vector

    # Step 2: Extract style embedding (GST-Tacotron)
    style_vec = await extract_style_embedding(
        audio_samples,
        model='gst_tacotron'
    )  # Output: 64-D vector

    # Step 3: Save to database
    profile = VoiceProfile(
        speaker_id=speaker_id,
        identity_embedding=identity_vec,
        style_embedding=style_vec
    )
    await save_profile(profile)

    # Step 4: Warm cache
    cache.set(speaker_id, profile)

    return profile
```

---

## 4. Media Orchestration Layer

### 4.1 Frame-Level Event Loop
**Status:** ⛔ **COMPLETE REDESIGN - 90% Gap**

**Current Architecture:**
```javascript
// conference-server.js
// Event-driven, variable chunk sizes (100ms - 1500ms)
socket.on('audio-chunk', async (data) => {
    const { audioBuffer, status } = data;

    // Process complete utterance when silence detected
    if (status === 'complete') {
        const transcription = await transcribeAudio(audioBuffer);
        const translated = await translateText(transcription);
        const audio = await synthesizeSpeech(translated);
        io.emit('translated-audio', audio);
    }
});
```

**Target Architecture:**
```javascript
// orchestrator-event-loop.js
// Frame-level precision, 20ms granularity

class MediaOrchestrator {
    async runEventLoop() {
        while (this.session.active) {
            const startTime = Date.now();

            // Step 1: Read 20ms PCM frame from Asterisk
            const frame = await this.readPCMFromAsterisk();  // 640 bytes

            // Step 2: Feed to ASR buffer
            this.asrBuffer.feed(frame);

            // Step 3: Check if ASR has partial ready
            if (this.asr.partialReady()) {
                const partial = this.asr.getPartial();
                this.mtQueue.push(partial);
            }

            // Step 4: Process MT queue
            if (this.mtQueue.hasSegment()) {
                const translated = await this.mt.translate(this.mtQueue.pop());
                this.ttsQueue.push(translated);
            }

            // Step 5: Process TTS queue
            if (this.ttsQueue.ready()) {
                const pcm = await this.ttsQueue.pop();
                await this.sendPCMToAsterisk(pcm);  // 640 bytes
            }

            // Step 6: Monitor latency
            this.checkLatencyMetrics();

            // Step 7: Maintain 20ms loop timing
            const elapsed = Date.now() - startTime;
            await sleep(Math.max(0, 20 - elapsed));
        }
    }
}
```

### 4.2 Queue Management
**Status:** ⛔ **COMPLETELY NEW - 100% Gap**

**Current:** ✅ Basic audio queue for playback
**Target:** ❌ **Sophisticated multi-level queuing system**

| Queue Type | Current | Target | Gap |
|------------|---------|--------|-----|
| Input Buffer | ❌ None | 3 frames (60ms) | **NEW** |
| ASR Queue | ❌ None | 5 frames (100ms) | **NEW** |
| MT Queue | ❌ None | Dynamic depth | **NEW** |
| TTS Queue | ❌ None | 2-4 tokens | **NEW** |
| Playback Queue | ✅ Simple array | 6-8 frames (120-160ms) | **UPGRADE** |

**Required Implementation:**
```javascript
// queue-manager.js

class QueueManager {
    constructor() {
        this.inputBuffer = new RingBuffer(3, 640);    // 3x 20ms frames
        this.asrQueue = new RingBuffer(5, 640);       // 5x 20ms frames
        this.mtQueue = new DynamicQueue();            // Text segments
        this.ttsQueue = new TokenQueue(2, 4);         // 2-4 tokens
        this.playbackQueue = new JitterBuffer(6, 8);  // 6-8 frames
    }

    // Backpressure control
    applyBackpressure(component, lagMs) {
        if (component === 'ASR' && lagMs > 300) {
            this.pauseInput();
        } else if (component === 'TTS' && lagMs > 400) {
            this.reduceOutputRate();
        } else if (component === 'MT' && lagMs > 1200) {
            this.retryMT();
        }
    }

    // Drop oldest on overflow
    handleOverflow(queue) {
        if (queue.depth > queue.maxDepth) {
            const dropped = queue.dropOldest();
            this.metrics.recordDrop(queue.name, dropped);
        }
    }
}
```

---

## 5. Recovery & Resilience

### 5.1 Error Handling
**Status:** 🟡 **PARTIAL - 60% Gap**

| Failure Type | Current | Target | Gap |
|--------------|---------|--------|-----|
| ASR Timeout | ⚠️ Basic retry | ✅ Restart stream, replay buffer | **ENHANCE** |
| MT Error | ⚠️ Log error | ✅ Requeue + exponential backoff | **ENHANCE** |
| TTS Delay | ❌ None | ✅ Silence injection, retry | **NEW** |
| Connection Loss | ✅ Reconnect | ✅ 3-tier reconnect (200→400→800ms) | **ENHANCE** |
| Profile Load Fail | ❌ None | ✅ Fallback to neutral voice | **NEW** |

**Current Recovery:**
```javascript
// Basic reconnection logic
socket.on('disconnect', () => {
    socket.connect();  // Simple reconnect
});
```

**Target Recovery Hierarchy:**
```javascript
// recovery-manager.js

class RecoveryManager {
    async handleFailure(component, error) {
        switch(component) {
            case 'ASR':
                if (this.noPartialsFor(1200)) {
                    await this.restartASRStream();
                    await this.replayLastBuffer(100); // Replay last 100ms
                }
                break;

            case 'MT':
                if (error.status >= 500) {
                    await this.requeueSegment(300); // 300ms delay
                    this.retryCount++;
                    if (this.retryCount > 3) {
                        this.triggerDegradedMode();
                    }
                }
                break;

            case 'TTS':
                if (this.missingPCMFor(500)) {
                    this.injectSilenceFrame();
                    await this.retrySynth();
                }
                break;

            case 'ExternalMedia':
                await this.reconnectSequence([200, 400, 800]); // Exponential backoff
                break;
        }
    }

    async reconnectSequence(delays) {
        for (let delay of delays) {
            await sleep(delay);
            if (await this.attemptReconnect()) {
                return true;
            }
        }
        this.session.status = 'DEGRADED';
        return false;
    }
}
```

### 5.2 Health Monitoring
**Status:** 🟡 **BASIC - 70% Gap**

**Current:**
```javascript
// Basic health endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
```

**Target:**
```javascript
// health-reporter.js

class HealthReporter {
    constructor() {
        this.metrics = {
            chain_latency_ms: new RollingAverage(500),
            asr_to_tts_gap_ms: new RollingAverage(500),
            active_sessions: new Gauge(),
            frames_per_sec: new Counter(),
            error_rate_pct: new Rate()
        };
    }

    // Real-time health events
    emitHealthEvent(component, status, lagMs) {
        const event = {
            session_id: this.session.id,
            component: component,
            status: status,
            lag_ms: lagMs,
            action: this.determineAction(status, lagMs),
            ts: Date.now() / 1000
        };

        this.pushToPrometheus(event);
        this.logEvent(event);
    }

    // Prometheus metrics endpoint
    getMetrics() {
        return {
            chain_latency_ms: this.metrics.chain_latency_ms.value(),
            asr_to_tts_gap_ms: this.metrics.asr_to_tts_gap_ms.value(),
            active_sessions: this.metrics.active_sessions.value(),
            frames_per_sec: this.metrics.frames_per_sec.value(),
            error_rate_pct: this.metrics.error_rate_pct.value()
        };
    }
}

// Prometheus-compatible endpoint
app.get('/health/report', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(healthReporter.getPrometheusFormat());
});
```

---

## 6. Performance & Latency

### 6.1 Latency Breakdown
**Status:** 🟡 **NEEDS OPTIMIZATION - 40% Gap**

| Stage | Current (Avg) | Target | Gap |
|-------|--------------|--------|-----|
| **STT** | 300-500ms | <250ms | **OPTIMIZE** |
| **Translation** | 100-200ms | 20-60ms | **OPTIMIZE** |
| **TTS** | 400-800ms | <100ms warm start | ⛔ **CRITICAL** |
| **Network** | 50-100ms | <50ms (local) | **OPTIMIZE** |
| **Buffering** | 100-200ms | 120-160ms | **OK** |
| **TOTAL** | **950-1800ms** | **≤900ms** | **HIGH PRIORITY** |

**Critical Path:**
```
Current:  Mic → WebRTC(50ms) → STT(400ms) → MT(150ms) → TTS(600ms) → WebRTC(50ms) → Speaker
          = ~1250ms average

Target:   Mic → SIP(20ms) → STT(200ms) → MT(40ms) → TTS(300ms) → SIP(20ms) → Speaker
          = ~580ms average (with optimization)
```

---

## 7. Configuration & Deployment

### 7.1 Infrastructure Requirements
**Status:** ⛔ **COMPLETELY NEW - 100% Gap**

| Component | Current | Target | Effort |
|-----------|---------|--------|--------|
| **Asterisk Server** | ❌ None | ✅ Required | **HIGH** |
| **TTS Server** | ❌ None (cloud) | ✅ GPU server (XTTS) | **HIGH** |
| **Voice DB** | ❌ None | ✅ PostgreSQL + Redis | **MEDIUM** |
| **Monitoring** | ❌ Basic logs | ✅ Prometheus + Grafana | **MEDIUM** |

**New Infrastructure Stack:**
```yaml
# docker-compose.yml

version: '3.8'
services:
  asterisk:
    image: asterisk:20-alpine
    ports:
      - "5060:5060/udp"  # SIP
      - "10000-10100:10000-10100/udp"  # RTP
    volumes:
      - ./asterisk/conf:/etc/asterisk
      - ./asterisk/modules:/usr/lib/asterisk/modules

  orchestrator:
    build: ./orchestrator
    depends_on:
      - asterisk
      - redis
      - postgres
    environment:
      - ASTERISK_HOST=asterisk
      - REDIS_URL=redis://redis:6379
      - DB_URL=postgresql://postgres:5432/voice_profiles

  xtts-server:
    build: ./xtts-server
    runtime: nvidia  # GPU required
    environment:
      - CUDA_VISIBLE_DEVICES=0
    volumes:
      - ./models:/models
      - ./voice-profiles:/profiles

  redis:
    image: redis:7-alpine

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: voice_profiles

  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
```

---

## 8. Development Roadmap

### Phase 1: Foundation (4-6 weeks)
**Priority:** ⛔ **CRITICAL**

1. **Asterisk Setup** (1 week)
   - Install Asterisk 20+
   - Configure SIP endpoints
   - Setup ConfBridge
   - Build/integrate chan_externalmedia module

2. **XTTS Integration** (2 weeks)
   - Setup XTTS v2 server (GPU)
   - Implement streaming PCM synthesis
   - Test latency benchmarks (<400ms target)

3. **Voice Profile System** (2 weeks)
   - Implement ECAPA-TDNN identity extraction
   - Implement GST-Tacotron style extraction
   - Build profile database & cache
   - Create training pipeline

4. **Media Orchestrator** (1 week)
   - Build frame-level event loop
   - Implement queue management
   - PCM pipe integration with Asterisk

### Phase 2: Pipeline Integration (3-4 weeks)
**Priority:** 🟠 **HIGH**

5. **ASR/MT Adaptation** (1 week)
   - Add speaker/session context to Deepgram
   - Implement incremental MT

6. **Queue & Buffering** (1 week)
   - Implement all queue types
   - Backpressure control
   - Jitter buffer optimization

7. **Recovery System** (1 week)
   - Multi-tier reconnection
   - Component health monitoring
   - Failover logic

8. **Testing & Optimization** (1 week)
   - End-to-end latency testing
   - Load testing (N participants)
   - Tuning buffer sizes

### Phase 3: Production Hardening (2-3 weeks)
**Priority:** 🟡 **MEDIUM**

9. **Monitoring & Observability** (1 week)
   - Prometheus metrics
   - Grafana dashboards
   - Alert rules

10. **Documentation** (1 week)
    - Deployment guide
    - Operations manual
    - API documentation

11. **Scalability** (1 week)
    - Multi-server deployment
    - Load balancing
    - Database replication

---

## 9. Risk Assessment

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **XTTS latency >900ms** | ⛔ **CRITICAL** | 🟠 **MEDIUM** | Pre-warm models, GPU optimization, caching |
| **Asterisk module instability** | 🟠 **HIGH** | 🟡 **LOW** | Extensive testing, fallback mechanisms |
| **Voice cloning quality poor** | 🟠 **HIGH** | 🟡 **LOW** | Quality metrics, A/B testing, fallback to ElevenLabs |
| **Integration complexity** | 🟠 **HIGH** | ⛔ **HIGH** | Phased rollout, comprehensive testing |
| **GPU resource constraints** | 🟡 **MEDIUM** | 🟠 **MEDIUM** | Model quantization, batch processing |
| **Latency target missed** | ⛔ **CRITICAL** | 🟠 **MEDIUM** | Profiling, optimization sprints |

---

## 10. Recommendation

### Option A: Full Migration (Recommended for Production)
**Timeline:** 10-12 weeks
**Effort:** HIGH
**Benefits:**
- ✅ True telephony-grade reliability
- ✅ Self-hosted voice cloning (no API costs)
- ✅ Sub-900ms latency achievable
- ✅ Full control over quality & privacy

**Risks:**
- ⚠️ Significant development time
- ⚠️ GPU infrastructure required
- ⚠️ Complex testing & tuning

### Option B: Hybrid Approach (Quick Win)
**Timeline:** 6-8 weeks
**Effort:** MEDIUM
**Changes:**
- Keep current WebRTC/Socket.io transport
- Replace ElevenLabs with XTTS v2
- Add voice profile system (embeddings)
- Optimize frame-level processing
- Skip Asterisk migration (for now)

**Benefits:**
- ✅ Faster implementation
- ✅ Voice cloning cost savings
- ✅ Better latency
- ✅ Incremental migration path

**Risks:**
- ⚠️ Not telephony-integrated
- ⚠️ Limited by WebRTC constraints

### Option C: Phased Migration (Balanced)
**Timeline:** 14-16 weeks
**Effort:** HIGH
**Approach:**
1. **Phase 1 (4 weeks):** Deploy XTTS + voice profiles (hybrid)
2. **Phase 2 (6 weeks):** Build Asterisk infrastructure (parallel)
3. **Phase 3 (4 weeks):** Migrate transport layer
4. **Phase 4 (2 weeks):** Cutover & optimization

**Benefits:**
- ✅ De-risked migration
- ✅ Earlier value delivery (voice cloning)
- ✅ Time to learn/optimize each component
- ✅ Rollback options

---

## 11. Estimated Effort Summary

| Component | Complexity | Effort (Person-Weeks) |
|-----------|------------|----------------------|
| Asterisk Integration | ⛔ **HIGH** | 4-6 weeks |
| chan_externalmedia Module | ⛔ **HIGH** | 2-3 weeks |
| XTTS Server Setup | 🟠 **MEDIUM** | 2-3 weeks |
| Voice Profile System | 🟠 **MEDIUM** | 3-4 weeks |
| Media Orchestrator | 🟠 **MEDIUM** | 2-3 weeks |
| Queue Management | 🟡 **LOW** | 1-2 weeks |
| Recovery System | 🟡 **LOW** | 1-2 weeks |
| Monitoring/Metrics | 🟡 **LOW** | 1-2 weeks |
| Testing & Optimization | 🟠 **MEDIUM** | 2-3 weeks |
| **TOTAL** | | **18-28 weeks** |

With **2 developers:** 9-14 weeks (2-3.5 months)
With **1 developer:** 18-28 weeks (4-7 months)

---

## 12. Conclusion

The migration from the current WebRTC/ElevenLabs architecture to the Asterisk-based speaker-adaptive system represents a **fundamental redesign** rather than an incremental upgrade.

**Key Takeaways:**
1. ⛔ **~85% new code** required
2. ⛔ **Critical path:** XTTS integration & voice profiles
3. 🟠 **Moderate risk** with proper phasing
4. ✅ **High value** for production telephony use cases

**Next Steps:**
1. Choose migration strategy (A, B, or C)
2. Set up development environment (Docker stack)
3. Prototype XTTS latency benchmarks
4. Begin Phase 1 implementation

---

**Document Version:** 1.0
**Last Updated:** October 15, 2025
