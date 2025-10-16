# Development Plan: Full SIP Translation System
## Real-Time Multilingual Conference with Asterisk + Hume EVI

**Version**: 1.0
**Target**: Production-grade SIP phone translation with <900ms latency
**Based on**: HAsterisk_HumeEVI_Spec.md
**Status**: Phase 0 Complete, Ready for Phase 1

---

## 📊 Current System State

### ✅ What's Working
- ✓ Azure infrastructure (App Service + VM)
- ✓ Asterisk 18.10.0 with ARI enabled
- ✓ SIP phone registration (1001, 1002)
- ✓ Basic ConfBridge (extension 1000)
- ✓ Web-based translation (browser clients)
- ✓ Translation services integrated:
  - Deepgram STT
  - DeepL MT
  - ElevenLabs TTS
- ✓ Voice Activity Detection (VAD)
- ✓ Socket.IO real-time communication

### ⚠️ What's Missing
- ❌ chan_externalmedia module (not installed)
- ❌ 20ms frame-by-frame audio pipeline
- ❌ Frame Orchestrator with strict timing
- ❌ Prosodic Segmenter for natural boundaries
- ❌ Hume EVI emotion/intent analysis
- ❌ Mix-minus audio from ConfBridge per participant
- ❌ Pacing Governor for placeholder/crossfade
- ❌ SIP phone audio translation (extensions 2000-2002)

---

## 🎯 Development Goals

### Primary Goal
Enable real-time translation for SIP phones (extensions 2000-2002) with:
- **Latency**: ≤900ms end-to-end
- **Audio Quality**: Full-duplex, mix-minus, no echo
- **Natural Speech**: Emotion preservation via Hume EVI
- **Reliability**: 99.9% uptime, graceful degradation

### Success Criteria
1. Two SIP phones dial 2000/2001 from different languages
2. Both hear each other in their own language
3. Measured latency <900ms (p95)
4. Emotional prosody preserved
5. No audio dropouts or stuttering

---

## 📅 Phased Implementation Plan

## **Phase 1: Audio Pipeline Foundation** (4-6 hours)

### 1.1 Install chan_externalmedia Module (1-2 hours)

**Location**: Currently exists at `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/asterisk-modules/chan_externalmedia/`

**Tasks**:
- [ ] Copy chan_externalmedia source to Azure VM
- [ ] Install Asterisk development headers
  ```bash
  sudo apt-get install asterisk-dev build-essential
  ```
- [ ] Compile module
  ```bash
  cd chan_externalmedia
  make
  sudo make install
  ```
- [ ] Verify module loads
  ```bash
  asterisk -rx "module load chan_externalmedia.so"
  asterisk -rx "module show like externalmedia"
  ```
- [ ] Configure named pipes location: `/tmp/asterisk_media/`

**Output**: Asterisk can create named pipes for 20ms PCM streaming

### 1.2 Frame Collector & Sequencer (1.5-2 hours)

**File**: `frame-collector.js`

**Responsibilities**:
- Receive 20ms PCM frames from named pipes
- Stamp with seq_num, timestamp
- Reorder out-of-sequence frames
- Buffer 120-160ms (6-8 frames)

**Key Contract**:
```javascript
class FrameCollector {
  constructor(channelId) {
    this.readPipe = `/tmp/asterisk_media/${channelId}_to_asterisk.pcm`;
    this.writePipe = `/tmp/asterisk_media/${channelId}_from_asterisk.pcm`;
    this.buffer = new RingBuffer(8); // 160ms
  }

  async *readFrames() {
    // Yield 640-byte frames (20ms @ 16kHz s16le)
  }

  async writeFrame(pcm640bytes) {
    // Write to named pipe, never block
  }
}
```

**Testing**:
- Generate test tones via named pipe
- Verify 20ms cadence maintained
- Test frame reordering with synthetic jitter

**Output**: Reliable bidirectional 20ms PCM stream

### 1.3 Pacing Governor (1.5-2 hours)

**File**: `pacing-governor.js`

**Responsibilities**:
- Maintain strict 20ms output cadence
- Emit placeholder when translation not ready
- Crossfade placeholder→translated over 40-60ms
- Never stall Asterisk's ExternalMedia socket

**Key Contract**:
```javascript
class PacingGovernor {
  constructor() {
    this.playbackQueue = new RingBuffer(8); // 160ms jitter buffer
    this.clock = new TwentyMsClock();
  }

  async *outputFrames() {
    while (true) {
      const frame = this.playbackQueue.pop() || this.shapedSilence();
      yield frame; // Always 640 bytes
      await this.clock.nextTick(); // Strict 20ms
    }
  }

  shapedSilence() {
    // Low-gain pink noise or silence
    return Buffer.alloc(640, 0);
  }
}
```

**Testing**:
- Verify exact 20ms intervals under load
- Test placeholder generation
- Measure queue depths under translation delays

**Output**: Never-stalling audio output pipeline

---

## **Phase 2: Translation Chain Integration** (5-7 hours)

### 2.1 Prosodic Segmenter (1.5-2 hours)

**File**: `prosodic-segmenter.js`

**Responsibilities**:
- VAD (Voice Activity Detection)
- Energy/pitch analysis for clause boundaries
- Group frames into natural segments (not mid-word)

**Key Features**:
```javascript
class ProsodicSegmenter {
  constructor() {
    this.vad = new WebRTCVAD(); // Or @ricky0123/vad-node
    this.energyHistory = [];
    this.pitchTracker = new PitchDetector();
  }

  async *segments(frameStream) {
    // Input: 20ms frames
    // Output: Variable-length audio segments at clause boundaries
    for await (const frame of frameStream) {
      const isSpeech = this.vad.process(frame);
      const energy = this.computeEnergy(frame);
      const pitch = this.pitchTracker.process(frame);

      if (this.isClauseBoundary(energy, pitch, isSpeech)) {
        yield this.currentSegment;
        this.currentSegment = [];
      }
      this.currentSegment.push(frame);
    }
  }
}
```

**Output**: Natural speech segments for ASR/MT

### 2.2 ASR Streaming Worker (1.5-2 hours)

**File**: `asr-streaming-worker.js`

**Integrate**: Existing Deepgram code, adapt for continuous streaming

**Key Changes**:
```javascript
class ASRStreamingWorker {
  constructor(deepgramClient, language) {
    this.ws = deepgramClient.openWebSocket({
      language,
      model: 'nova-2',
      interim_results: true,
      utterance_end_ms: 1000,
      vad_events: true
    });
  }

  async *processSegments(segmentStream) {
    for await (const segment of segmentStream) {
      this.ws.send(segment.pcm);
    }

    // Yield partial/stable/final events
    for await (const event of this.ws) {
      yield {
        type: event.is_final ? 'final' :
              event.speech_final ? 'stable' : 'partial',
        text: event.channel.alternatives[0].transcript,
        t0: event.start,
        t1: event.start + event.duration,
        confidence: event.channel.alternatives[0].confidence
      };
    }
  }
}
```

**Output**: Streaming transcription with partial/stable/final markers

### 2.3 DeepL Incremental MT (1-1.5 hours)

**File**: `deepl-incremental-mt.js`

**Key Feature**: Send clause-level chunks, maintain context

```javascript
class DeepLIncrementalMT {
  constructor(deeplClient) {
    this.client = deeplClient;
    this.sessionContext = new Map(); // roomId -> context
  }

  async translateIncremental(sessionId, sourceLang, targetLang, text, isStable) {
    const context = this.sessionContext.get(sessionId) || '';

    const result = await this.client.translateText(
      text,
      sourceLang,
      targetLang,
      {
        context: context.slice(-500), // Last 500 chars for context
        split_sentences: 'nonewlines',
        preserve_formatting: true
      }
    );

    if (isStable) {
      this.sessionContext.set(sessionId, context + ' ' + text);
    }

    return {
      type: isStable ? 'stable' : 'partial',
      text: result.text,
      latency_ms: result.latency || 150
    };
  }
}
```

**Output**: Context-aware incremental translation

### 2.4 Main Orchestrator Loop (2-3 hours)

**File**: `translation-orchestrator.js`

**Integrate all components**:

```javascript
class TranslationOrchestrator {
  async handleParticipant(channelId, sourceLang, targetLang) {
    const collector = new FrameCollector(channelId);
    const segmenter = new ProsodicSegmenter();
    const asr = new ASRStreamingWorker(deepgram, sourceLang);
    const mt = new DeepLIncrementalMT(deepl);
    const tts = new ElevenLabsTTSService(targetLang);
    const governor = new PacingGovernor();

    // Concurrent pipelines
    await Promise.all([
      this.inputPipeline(collector, segmenter, asr, mt, tts, governor),
      this.outputPipeline(collector, governor)
    ]);
  }

  async inputPipeline(collector, segmenter, asr, mt, tts, governor) {
    const frames = collector.readFrames();
    const segments = segmenter.segments(frames);
    const transcripts = asr.processSegments(segments);

    for await (const transcript of transcripts) {
      const translation = await mt.translateIncremental(
        channelId, sourceLang, targetLang,
        transcript.text, transcript.type === 'stable'
      );

      const audio = await tts.synthesize(translation.text);

      for (const frame of audio.frames) {
        governor.playbackQueue.push(frame);
      }
    }
  }

  async outputPipeline(collector, governor) {
    for await (const frame of governor.outputFrames()) {
      await collector.writeFrame(frame);
    }
  }
}
```

**Output**: End-to-end translation pipeline

---

## **Phase 3: Hume EVI Integration** (3-4 hours)

### 3.1 Hume EVI Adapter (2-3 hours)

**File**: `hume-evi-adapter.js`

**Requirements**:
- Hume EVI API key
- WebSocket connection
- 3-5s audio context window

```javascript
class HumeEVIAdapter {
  constructor(apiKey) {
    this.ws = new WebSocket(`wss://api.hume.ai/v1/evi/stream`);
    this.contextWindow = new RingBuffer(250); // 5s @ 20ms frames
  }

  async pushAudioAndText(frame20ms, text) {
    this.contextWindow.push(frame20ms);

    this.ws.send(JSON.stringify({
      data: frame20ms.toString('base64'),
      text: text || null,
      timestamp: Date.now()
    }));
  }

  async *emotionVectors() {
    for await (const msg of this.ws) {
      yield {
        emotion: msg.emotion,
        prosody: {
          rate: msg.prosody.rate,
          pitch_semitones: msg.prosody.pitch,
          energy: msg.prosody.energy
        },
        intent: msg.intent,
        end_of_turn_hint: msg.turn.end_of_turn_hint
      };
    }
  }
}
```

### 3.2 TTS Emotion Control (1 hour)

**Integrate emotion vectors into ElevenLabs TTS**:

```javascript
async synthesize(text, emotionVector) {
  const voiceSettings = {
    stability: 0.5 + (emotionVector.prosody.energy * 0.3),
    similarity_boost: 0.8,
    style: emotionVector.prosody.rate, // Speaking rate
    use_speaker_boost: true
  };

  return await this.elevenlabs.textToSpeech(
    this.voiceId,
    text,
    voiceSettings
  );
}
```

**Output**: Emotion-aware translated speech

---

## **Phase 4: ConfBridge Mix-Minus** (2-3 hours)

### 4.1 Update Asterisk Dialplan

**File**: `/etc/asterisk/extensions.conf`

```asterisk
[ai-translate]
; Multi-participant translation room
exten => 2000,1,NoOp(Translation Conference - Room: default, Lang: ${ARG1})
  same => n,Set(CHANNEL(language)=${ARG1})
  same => n,Set(CONFBRIDGE(user,template)=translation_user)
  same => n,Answer()
  ; Attach ExternalMedia BEFORE joining bridge
  same => n,ExternalMedia(
    format=slin16,
    direction=both,
    transport=local,
    data=/tmp/asterisk_media/${CHANNEL(uniqueid)}
  )
  same => n,ConfBridge(2000,translation_bridge,translation_user)
  same => n,Hangup()

; Language-specific entry points
exten => 2000,1,Goto(ai-translate,2000,1(en))  ; English
exten => 2001,1,Goto(ai-translate,2000,1(es))  ; Spanish
exten => 2002,1,Goto(ai-translate,2000,1(fr))  ; French
```

### 4.2 ConfBridge Configuration

**File**: `/etc/asterisk/confbridge.conf`

```ini
[translation_bridge]
type=bridge
video_mode=none
language=en
max_members=50
record_conference=no
mix_interval=20  ; 20ms mixing

[translation_user]
type=user
marked=no
startmuted=no
music_on_hold_when_empty=yes
quiet=no
announce_user_count=no
dsp_drop_silence=yes
dsp_silence_threshold=512
talk_detection_events=yes
denoise=yes
jitterbuffer=yes
```

**Output**: Per-participant mix-minus audio

---

## **Phase 5: Testing & Optimization** (3-4 hours)

### 5.1 Latency Measurement (1 hour)

**Create latency testing tool**:

```javascript
class LatencyMeter {
  constructor() {
    this.markers = [];
  }

  mark(stage) {
    this.markers.push({ stage, ts: Date.now() });
  }

  report() {
    const stages = [
      'frame_received',
      'asr_partial',
      'mt_complete',
      'evi_vector',
      'tts_first_frame',
      'frame_sent'
    ];

    const deltas = {};
    for (let i = 1; i < stages.length; i++) {
      deltas[stages[i]] = this.markers[i].ts - this.markers[0].ts;
    }

    return deltas;
  }
}
```

**Target**:
- ASR partial: <250ms
- MT: <200ms
- EVI: <120ms
- TTS first audio: <250ms
- **Total: <850ms (p95)**

### 5.2 Load Testing (1 hour)

**Test scenarios**:
- 2 participants (baseline)
- 5 participants (typical)
- 10 participants (stress)

**Metrics to track**:
- CPU usage per participant
- Memory consumption
- Frame queue depths
- Dropped frames
- Error rates

### 5.3 Error Handling (1-2 hours)

**Implement recovery mechanisms**:
- ASR stream reconnection
- DeepL failover to backup
- EVI fallback to neutral prosody
- TTS retry with exponential backoff

**Graceful degradation**:
- If latency >900ms: Reduce holdback buffer
- If EVI fails: Continue without emotion
- If MT fails: Pass through untranslated with beep

---

## 📈 Implementation Timeline

### Sprint 1 (Week 1): Foundation
**Days 1-2**: Phase 1 - Audio Pipeline
- Install chan_externalmedia
- Build Frame Collector
- Build Pacing Governor

**Days 3-5**: Phase 2 - Translation Chain
- Prosodic Segmenter
- ASR Streaming
- DeepL Incremental
- Main Orchestrator

**Total**: 5 days, 12-14 hours active dev

### Sprint 2 (Week 2): Enhancement
**Days 1-2**: Phase 3 - Hume EVI
- EVI Adapter
- Emotion-aware TTS

**Days 3-4**: Phase 4 - ConfBridge
- Multi-participant support
- Mix-minus configuration

**Day 5**: Phase 5 - Testing
- Latency optimization
- Load testing
- Error handling

**Total**: 5 days, 10-12 hours active dev

### **Total Estimated Time: 22-26 hours over 2 weeks**

---

## 🛠️ Development Environment Setup

### Azure VM Prerequisites

```bash
# Install development tools
sudo apt-get update
sudo apt-get install -y \
  build-essential \
  asterisk-dev \
  git \
  pkg-config \
  libsamplerate0-dev

# Create named pipes directory
sudo mkdir -p /tmp/asterisk_media
sudo chown asterisk:asterisk /tmp/asterisk_media
sudo chmod 755 /tmp/asterisk_media
```

### Node.js Dependencies

```json
{
  "dependencies": {
    "@deepgram/sdk": "^3.0.0",
    "deepl-node": "^1.11.0",
    "elevenlabs-node": "^1.0.0",
    "ws": "^8.14.0",
    "@ricky0123/vad-node": "^0.0.16",
    "ari-client": "^2.2.0"
  }
}
```

---

## 📊 Success Metrics

### Performance KPIs
| Metric | Target | Measurement |
|--------|--------|-------------|
| End-to-end latency (p95) | <900ms | Timestamp markers |
| End-to-end latency (p50) | <700ms | Timestamp markers |
| Frame drops | <0.1% | Frame sequence gaps |
| ASR accuracy | >95% | WER comparison |
| Translation quality | >90% BLEU | Manual eval |
| Uptime | >99.9% | Error rate monitoring |
| Concurrent users | 10+ | Load test |

### Quality Metrics
- [ ] Natural prosody preserved
- [ ] No robotic voice artifacts
- [ ] Smooth clause boundaries
- [ ] Minimal word cutting
- [ ] Clear audio (no noise)
- [ ] Emotional nuance maintained

---

## 🚨 Risk Mitigation

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| chan_externalmedia compile issues | High | Medium | Test on dev VM first |
| 20ms timing slippage | High | Medium | Strict clock implementation |
| Hume EVI API latency | Medium | Medium | Fallback to neutral prosody |
| DeepL rate limits | Medium | Low | Caching + backup MT |
| Memory leaks in long calls | Medium | Medium | Regular profiling |
| Named pipe buffering issues | High | Medium | Non-blocking I/O |

### Operational Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| API cost overruns | Medium | Medium | Usage monitoring + alerts |
| VM resources exhausted | High | Low | Auto-scaling + monitoring |
| Network interruptions | Medium | Low | Reconnection logic |
| Asterisk restart needed | High | Low | Graceful degradation |

---

## 📝 Next Steps

### Immediate Actions (This Session)

1. **Decision Point**: Confirm plan approval
2. **Environment Setup**:
   - SSH into Azure VM (4.185.84.26)
   - Install development dependencies
   - Copy chan_externalmedia source
3. **Begin Phase 1**: Start with chan_externalmedia compilation

### Session Goals

By end of this session:
- [ ] chan_externalmedia compiled and loaded
- [ ] Named pipes working
- [ ] Frame Collector implemented
- [ ] Test audio flowing through named pipes

---

## 📚 Reference Documentation

- **Spec**: [HAsterisk_HumeEVI_Spec.md](./HAsterisk_HumeEVI_Spec.md)
- **Azure Info**: [AZURE_DEPLOYMENT_INFO.md](./AZURE_DEPLOYMENT_INFO.md)
- **SIP Guide**: [SIP_INTEGRATION_GUIDE.md](./SIP_INTEGRATION_GUIDE.md)
- **Asterisk Config**: `asterisk-configs/`

---

## 🎯 Definition of Done

### Phase 1 Complete When:
- [x] chan_externalmedia module loaded in Asterisk
- [x] Named pipes created at `/tmp/asterisk_media/`
- [x] Test audio successfully read/written via pipes
- [x] Frame Collector handles 640-byte frames
- [x] Pacing Governor maintains 20ms cadence

### Phase 2 Complete When:
- [x] ASR transcribing SIP phone audio
- [x] DeepL translating transcripts
- [x] TTS generating target language audio
- [x] End-to-end audio flowing (even if high latency)

### Phase 3 Complete When:
- [x] Hume EVI analyzing emotion
- [x] TTS voice modulated by emotion
- [x] Natural prosody in output

### Phase 4 Complete When:
- [x] 3+ participants in same conference
- [x] Each hears others in their language
- [x] No echo or self-hearing

### Phase 5 Complete When:
- [x] Latency <900ms (p95)
- [x] 10+ concurrent users tested
- [x] Error recovery working
- [x] Production-ready

---

**Ready to begin? Let's start with Phase 1!**
