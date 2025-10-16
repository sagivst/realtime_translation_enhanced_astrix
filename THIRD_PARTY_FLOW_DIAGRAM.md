# Third Party Services Flow Diagram

This document contains Mermaid diagrams showing the complete flow of data through all third-party services with entry/exit latency tracking.

---

## Complete Translation Pipeline with Third Party Services

```mermaid
flowchart TB
    %% Define styles
    classDef entryPoint fill:#90EE90,stroke:#228B22,stroke-width:3px
    classDef exitPoint fill:#FFB6C1,stroke:#C71585,stroke-width:3px
    classDef thirdParty fill:#87CEEB,stroke:#4682B4,stroke-width:2px
    classDef internal fill:#F0E68C,stroke:#BDB76B,stroke-width:2px
    classDef measurement fill:#FFA500,stroke:#FF8C00,stroke-width:2px

    %% Main Flow
    START([SIP Phone: Speaker]) --> ASTERISK[Asterisk Server<br/>4.185.84.26]
    ASTERISK --> FRAME_COLLECTOR[Frame Collector<br/>20ms PCM frames<br/>640 bytes @ 16kHz]

    %% Parallel paths: Main translation + Emotion analysis
    FRAME_COLLECTOR --> PROSODIC[Prosodic Segmenter<br/>Speech boundary detection]
    FRAME_COLLECTOR --> EMOTION_ENTRY

    %% === HUME EVI PATH (Parallel) ===
    subgraph HUME_SERVICE["🔷 Hume AI EVI (Emotion Analysis)"]
        EMOTION_ENTRY[📥 ENTRY: pushAudioFrame<br/>File: hume-evi-adapter.js:165]:::entryPoint
        EMOTION_ENTRY --> HUME_WS[WebSocket Connection<br/>wss://api.hume.ai/v0/stream/evi]:::thirdParty
        HUME_WS --> EMOTION_CONTEXT[Context Window<br/>5 seconds audio buffer]:::internal
        EMOTION_CONTEXT --> HUME_ANALYSIS[Emotion Analysis<br/>Arousal, Valence, Energy<br/>Pitch, Rate, Prosody]:::thirdParty
        HUME_ANALYSIS --> EMOTION_EXIT[📤 EXIT: onEmotionResult<br/>Latency: ~200ms<br/>File: hume-evi-adapter.js:235]:::exitPoint
        EMOTION_EXIT --> EMOTION_VECTOR[Emotion Vector<br/>{arousal, valence,<br/>dominance, energy}]:::internal

        EMOTION_MEASURE1[⏱️ Connection: <500ms]:::measurement
        EMOTION_MEASURE2[⏱️ Analysis: <200ms]:::measurement
    end

    %% === MAIN TRANSLATION PATH ===
    PROSODIC --> ASR_ENTRY

    subgraph DEEPGRAM_SERVICE["🔷 Deepgram (Speech Recognition)"]
        ASR_ENTRY[📥 ENTRY: processAudioSegment<br/>File: asr-streaming-worker.js:178]:::entryPoint
        ASR_ENTRY --> DG_WS[WebSocket Connection<br/>wss://api.deepgram.com/v1/listen]:::thirdParty
        DG_WS --> DG_MODEL[Model: nova-2<br/>Language: en-US<br/>16kHz linear16]:::thirdParty
        DG_MODEL --> DG_INTERIM[Interim Results<br/>Progressive refinement]:::thirdParty
        DG_INTERIM --> ASR_EXIT[📤 EXIT: onTranscript<br/>Latency: ~250ms<br/>File: asr-streaming-worker.js:215]:::exitPoint
        ASR_EXIT --> TRANSCRIPT[Transcript<br/>Text + Confidence]:::internal

        ASR_MEASURE1[⏱️ Connection: <500ms]:::measurement
        ASR_MEASURE2[⏱️ Interim: <150ms]:::measurement
        ASR_MEASURE3[⏱️ Final: <250ms]:::measurement
    end

    TRANSCRIPT --> MT_ENTRY

    subgraph DEEPL_SERVICE["🔷 DeepL (Machine Translation)"]
        MT_ENTRY[📥 ENTRY: translate<br/>File: deepl-incremental-mt.js:245]:::entryPoint
        MT_ENTRY --> MT_CACHE{Cache<br/>Check}:::internal
        MT_CACHE -->|Hit| MT_CACHE_EXIT[Cached Translation<br/>Latency: <1ms]:::exitPoint
        MT_CACHE -->|Miss| MT_CONTEXT[Add Context<br/>Last 500 chars]:::internal
        MT_CONTEXT --> DEEPL_API[DeepL API<br/>https://api.deepl.com/v2/translate]:::thirdParty
        DEEPL_API --> DEEPL_TRANS[Translation<br/>Source: EN<br/>Target: ES<br/>Formality: default]:::thirdParty
        DEEPL_TRANS --> MT_EXIT[📤 EXIT: onTranslationComplete<br/>Latency: ~200ms<br/>File: deepl-incremental-mt.js:285]:::exitPoint
        MT_EXIT --> TRANSLATION[Translated Text]:::internal
        MT_CACHE_EXIT --> TRANSLATION

        MT_MEASURE1[⏱️ API: <200ms]:::measurement
        MT_MEASURE2[⏱️ With Context: <250ms]:::measurement
        MT_MEASURE3[⏱️ Cached: <1ms]:::measurement
    end

    %% Combine translation with emotion
    TRANSLATION --> TTS_PREP[Prepare TTS Request]:::internal
    EMOTION_VECTOR -.-> TTS_PREP

    TTS_PREP --> TTS_ENTRY

    subgraph ELEVENLABS_SERVICE["🔷 ElevenLabs (Text-to-Speech)"]
        TTS_ENTRY[📥 ENTRY: synthesizeWithEmotion<br/>File: elevenlabs-tts-service.js:215]:::entryPoint
        TTS_ENTRY --> EMOTION_MAP[Emotion Mapping<br/>emotionToVoiceSettings<br/>Latency: <5ms]:::internal
        EMOTION_MAP --> VOICE_SETTINGS[Voice Settings<br/>stability, similarity, style]:::internal
        VOICE_SETTINGS --> TTS_API[ElevenLabs API<br/>https://api.elevenlabs.io/v1/text-to-speech]:::thirdParty
        TTS_API --> TTS_MODEL[Model: eleven_turbo_v2<br/>Voice: Bella<br/>Format: pcm_16000]:::thirdParty
        TTS_MODEL --> TTS_AUDIO[Audio Generation<br/>PCM 16kHz]:::thirdParty
        TTS_AUDIO --> TTS_EXIT[📤 EXIT: onAudioComplete<br/>Latency: ~250ms<br/>File: elevenlabs-tts-service.js:285]:::exitPoint
        TTS_EXIT --> AUDIO_FRAMES[Audio Frames<br/>20ms chunks<br/>640 bytes each]:::internal

        TTS_MEASURE1[⏱️ Emotion Map: <5ms]:::measurement
        TTS_MEASURE2[⏱️ API: <250ms]:::measurement
        TTS_MEASURE3[⏱️ Processing: <20ms]:::measurement
    end

    AUDIO_FRAMES --> PACING_GOV[Pacing Governor<br/>Strict 20ms cadence<br/>Crossfade & comfort noise]:::internal
    PACING_GOV --> FRAME_OUT[Frame Collector<br/>Write to Asterisk]:::internal
    FRAME_OUT --> ASTERISK_OUT[Asterisk Server<br/>Named pipes]
    ASTERISK_OUT --> END([SIP Phone: Listener])

    %% Overall latency
    TOTAL_LATENCY[⏱️ Total End-to-End<br/>Target: <900ms p95<br/>ASR + MT + TTS + Network]:::measurement
```

---

## Third Party Service Entry/Exit Points Detail

```mermaid
flowchart LR
    subgraph SERVICE_MONITORING["Service-Level Latency Monitoring"]
        direction TB

        subgraph DG["Deepgram"]
            DG_IN[📥 Entry<br/>connect: <500ms<br/>streamStart: measure<br/>audioChunk: track]:::entryPoint
            DG_PROCESS[Process]
            DG_OUT[📤 Exit<br/>interim: <150ms<br/>final: <250ms<br/>transcript ready]:::exitPoint
            DG_IN --> DG_PROCESS --> DG_OUT
        end

        subgraph DL["DeepL"]
            DL_IN[📥 Entry<br/>translate: start<br/>context: add<br/>cache: check]:::entryPoint
            DL_PROCESS[Process]
            DL_OUT[📤 Exit<br/>translation: <200ms<br/>cached: <1ms<br/>with context: <250ms]:::exitPoint
            DL_IN --> DL_PROCESS --> DL_OUT
        end

        subgraph EL["ElevenLabs"]
            EL_IN[📥 Entry<br/>synthesize: start<br/>emotion: map<br/>voice: configure]:::entryPoint
            EL_PROCESS[Process]
            EL_OUT[📤 Exit<br/>audio: <250ms<br/>emotion map: <5ms<br/>frames: ready]:::exitPoint
            EL_IN --> EL_PROCESS --> EL_OUT
        end

        subgraph HM["Hume AI"]
            HM_IN[📥 Entry<br/>connect: <500ms<br/>audioFrame: push<br/>context: 5s window]:::entryPoint
            HM_PROCESS[Process]
            HM_OUT[📤 Exit<br/>emotion: <200ms<br/>prosody: ready<br/>vector: complete]:::exitPoint
            HM_IN --> HM_PROCESS --> HM_OUT
        end
    end

    classDef entryPoint fill:#90EE90,stroke:#228B22,stroke-width:2px
    classDef exitPoint fill:#FFB6C1,stroke:#C71585,stroke-width:2px
```

---

## Configuration Flow

```mermaid
flowchart TB
    subgraph CONFIG["Third Party Configuration Management"]
        ENV[Environment Variables<br/>DEEPGRAM_API_KEY<br/>DEEPL_API_KEY<br/>ELEVENLABS_API_KEY<br/>HUME_API_KEY]

        CONFIG_FILE[third-party-config.js<br/>Centralized Configuration]

        ENV --> CONFIG_FILE

        subgraph DG_CONFIG["Deepgram Config"]
            DG_ENDPOINT[Endpoint:<br/>wss://api.deepgram.com]
            DG_MODEL_C[Model: nova-2]
            DG_AUDIO_C[Audio: 16kHz PCM]
            DG_LATENCY_C[Latency Targets:<br/>Connection: 500ms<br/>Interim: 150ms<br/>Final: 250ms]
        end

        subgraph DL_CONFIG["DeepL Config"]
            DL_ENDPOINT[Endpoint:<br/>api.deepl.com/v2]
            DL_PARAMS[Formality: default<br/>Context: 500 chars]
            DL_CACHE_C[Cache: enabled<br/>TTL: 60s]
            DL_LATENCY_C[Latency Targets:<br/>API: 200ms<br/>Cached: 1ms]
        end

        subgraph EL_CONFIG["ElevenLabs Config"]
            EL_ENDPOINT[Endpoint:<br/>api.elevenlabs.io/v1]
            EL_MODEL_C[Model: eleven_turbo_v2]
            EL_VOICE_C[Voice Settings:<br/>stability: 0.5<br/>similarity: 0.75<br/>style: 0.5]
            EL_LATENCY_C[Latency Targets:<br/>API: 250ms<br/>Emotion: 5ms]
        end

        subgraph HM_CONFIG["Hume Config"]
            HM_ENDPOINT[Endpoint:<br/>wss://api.hume.ai]
            HM_ANALYSIS_C[Analysis:<br/>arousal, valence<br/>pitch, rate, energy]
            HM_CONTEXT_C[Context: 5s window<br/>Update: 100ms]
            HM_LATENCY_C[Latency Targets:<br/>Connection: 500ms<br/>Analysis: 200ms]
        end

        CONFIG_FILE --> DG_CONFIG
        CONFIG_FILE --> DL_CONFIG
        CONFIG_FILE --> EL_CONFIG
        CONFIG_FILE --> HM_CONFIG

        DG_CONFIG --> DG_WORKER[asr-streaming-worker.js]
        DL_CONFIG --> DL_WORKER[deepl-incremental-mt.js]
        EL_CONFIG --> EL_WORKER[elevenlabs-tts-service.js]
        HM_CONFIG --> HM_WORKER[hume-evi-adapter.js]

        DG_WORKER --> ORCHESTRATOR[translation-orchestrator.js]
        DL_WORKER --> ORCHESTRATOR
        EL_WORKER --> ORCHESTRATOR
        HM_WORKER --> ORCHESTRATOR
    end

    style CONFIG fill:#F5F5DC,stroke:#8B4513,stroke-width:2px
```

---

## Latency Measurement Points

```mermaid
sequenceDiagram
    participant Speaker
    participant Asterisk
    participant FrameCollector
    participant Deepgram
    participant DeepL
    participant ElevenLabs
    participant Hume
    participant Listener

    Note over Speaker,Listener: Latency Measurement Points

    Speaker->>Asterisk: Speech Audio
    Asterisk->>FrameCollector: 20ms PCM Frame

    par Parallel Processing
        FrameCollector->>Hume: [ENTRY] pushAudioFrame
        Note right of Hume: ⏱️ Measure Start
        Hume-->>Hume: Analyze Emotion
        Hume->>FrameCollector: [EXIT] Emotion Vector
        Note right of Hume: ⏱️ ~200ms
    and Main Translation Path
        FrameCollector->>Deepgram: [ENTRY] processAudioSegment
        Note right of Deepgram: ⏱️ Measure Start (T1)
        Deepgram-->>Deepgram: Speech Recognition
        Deepgram->>FrameCollector: [EXIT] Transcript
        Note right of Deepgram: ⏱️ ~250ms (T2-T1)

        FrameCollector->>DeepL: [ENTRY] translate
        Note right of DeepL: ⏱️ Measure Start (T2)
        DeepL-->>DeepL: Machine Translation
        DeepL->>FrameCollector: [EXIT] Translation
        Note right of DeepL: ⏱️ ~200ms (T3-T2)

        Note over FrameCollector: Combine Translation + Emotion

        FrameCollector->>ElevenLabs: [ENTRY] synthesizeWithEmotion
        Note right of ElevenLabs: ⏱️ Measure Start (T3)
        ElevenLabs-->>ElevenLabs: Emotion Mapping (~5ms)
        ElevenLabs-->>ElevenLabs: Text-to-Speech
        ElevenLabs->>FrameCollector: [EXIT] Audio Frames
        Note right of ElevenLabs: ⏱️ ~250ms (T4-T3)
    end

    FrameCollector->>Asterisk: Translated Audio
    Asterisk->>Listener: Audio Output
    Note over Speaker,Listener: ⏱️ Total: ~900ms (p95 target)
```

---

## Error Handling & Fallback Flow

```mermaid
flowchart TB
    REQUEST[Service Request]

    REQUEST --> MONITOR{Monitor<br/>Latency}

    MONITOR -->|OK| SUCCESS[Success<br/>Log Latency]

    MONITOR -->|Slow| WARNING{Latency > Target}
    WARNING -->|Warning| LOG_WARN[Log Warning<br/>Continue]
    WARNING -->|Critical| ALERT[Send Alert<br/>Continue with delay]

    MONITOR -->|Error| ERROR{Error Type}

    ERROR -->|Rate Limit| BACKOFF[Exponential Backoff<br/>Retry after delay]
    ERROR -->|Timeout| RETRY{Retry Count}
    ERROR -->|Auth Error| FAIL[Fail<br/>Check API Key]
    ERROR -->|Network| RETRY

    RETRY -->|< Max| BACKOFF
    RETRY -->|>= Max| FALLBACK{Fallback<br/>Available?}

    FALLBACK -->|Yes| FALLBACK_SERVICE[Use Fallback Service]
    FALLBACK -->|No| DEGRADED[Graceful Degradation]

    BACKOFF --> REQUEST
    FALLBACK_SERVICE --> SUCCESS

    style SUCCESS fill:#90EE90
    style FAIL fill:#FFB6C1
    style WARNING fill:#FFD700
    style DEGRADED fill:#FFA500
```

---

## Service Health Monitoring

```mermaid
flowchart LR
    subgraph HEALTH_CHECK["Service Health Dashboard"]
        direction TB

        DEEPGRAM_HEALTH[Deepgram<br/>Status: 🟢 Operational<br/>Latency p95: 240ms<br/>Error Rate: 0.5%<br/>Requests/min: 45]

        DEEPL_HEALTH[DeepL<br/>Status: 🟢 Operational<br/>Latency p95: 190ms<br/>Error Rate: 0.2%<br/>Cache Hit: 65%]

        ELEVENLABS_HEALTH[ElevenLabs<br/>Status: 🟢 Operational<br/>Latency p95: 245ms<br/>Error Rate: 0.8%<br/>Requests/min: 40]

        HUME_HEALTH[Hume AI<br/>Status: 🟢 Operational<br/>Latency p95: 195ms<br/>Error Rate: 0.3%<br/>Requests/min: 60]

        OVERALL[Overall System<br/>Status: 🟢 PASS<br/>Total Latency p95: 875ms<br/>Target: <900ms<br/>Bottleneck: None]

        DEEPGRAM_HEALTH --> OVERALL
        DEEPL_HEALTH --> OVERALL
        ELEVENLABS_HEALTH --> OVERALL
        HUME_HEALTH --> OVERALL
    end

    style DEEPGRAM_HEALTH fill:#90EE90
    style DEEPL_HEALTH fill:#90EE90
    style ELEVENLABS_HEALTH fill:#90EE90
    style HUME_HEALTH fill:#90EE90
    style OVERALL fill:#87CEEB
```

---

## Usage Quota Tracking

```mermaid
flowchart TB
    subgraph QUOTA["Service Quota Monitoring"]
        direction TB

        DG_QUOTA[Deepgram<br/>Monthly Limit: 12,000 min<br/>Used: 1,250 min<br/>📊 10.4%<br/>Alert: 9,600 min 80%]

        DL_QUOTA[DeepL<br/>Monthly Limit: 500,000 chars<br/>Used: 125,000 chars<br/>📊 25.0%<br/>Alert: 450,000 chars 90%]

        EL_QUOTA[ElevenLabs<br/>Monthly Limit: 10,000 chars<br/>Used: 3,200 chars<br/>📊 32.0%<br/>Alert: 8,500 chars 85%]

        HM_QUOTA[Hume AI<br/>Monthly Limit: 100,000 req<br/>Used: 45,000 req<br/>📊 45.0%<br/>Alert: 90,000 req 90%]

        ALERT_SYSTEM{Quota Alert<br/>System}

        DG_QUOTA --> ALERT_SYSTEM
        DL_QUOTA --> ALERT_SYSTEM
        EL_QUOTA --> ALERT_SYSTEM
        HM_QUOTA --> ALERT_SYSTEM

        ALERT_SYSTEM -->|< Threshold| NORMAL[Normal Operation]
        ALERT_SYSTEM -->|>= Threshold| WARNING[Send Alert<br/>Consider upgrade]
        ALERT_SYSTEM -->|>= 100%| EXCEEDED[Quota Exceeded<br/>Enable Fallback]
    end

    style DG_QUOTA fill:#90EE90
    style DL_QUOTA fill:#FFD700
    style EL_QUOTA fill:#FFD700
    style HM_QUOTA fill:#FFD700
    style NORMAL fill:#90EE90
    style WARNING fill:#FFA500
    style EXCEEDED fill:#FFB6C1
```

---

## Testing Integration Points

```mermaid
flowchart TB
    START[Test Suite Start]

    START --> TEST_DEEPGRAM[Test Deepgram<br/>✓ Connection latency<br/>✓ ASR accuracy<br/>✓ Interim results<br/>✓ Final transcript]

    START --> TEST_DEEPL[Test DeepL<br/>✓ Translation quality<br/>✓ Context preservation<br/>✓ Cache hit rate<br/>✓ API latency]

    START --> TEST_ELEVENLABS[Test ElevenLabs<br/>✓ Audio quality<br/>✓ Emotion mapping<br/>✓ Frame generation<br/>✓ TTS latency]

    START --> TEST_HUME[Test Hume AI<br/>✓ Emotion detection<br/>✓ Prosody analysis<br/>✓ Context window<br/>✓ Analysis latency]

    TEST_DEEPGRAM --> INTEGRATION[Integration Test<br/>Full Pipeline]
    TEST_DEEPL --> INTEGRATION
    TEST_ELEVENLABS --> INTEGRATION
    TEST_HUME --> INTEGRATION

    INTEGRATION --> E2E[End-to-End<br/>Latency Test<br/>Target: <900ms p95]

    E2E --> RESULTS{Results}
    RESULTS -->|Pass| SUCCESS[✅ All Tests Pass<br/>Deploy to Production]
    RESULTS -->|Fail| DIAGNOSE[Diagnose Bottleneck<br/>Optimize Service]

    DIAGNOSE --> OPTIMIZE[Optimize Configuration<br/>Adjust Parameters]
    OPTIMIZE --> START

    style TEST_DEEPGRAM fill:#87CEEB
    style TEST_DEEPL fill:#87CEEB
    style TEST_ELEVENLABS fill:#87CEEB
    style TEST_HUME fill:#87CEEB
    style SUCCESS fill:#90EE90
    style DIAGNOSE fill:#FFD700
```

---

## File References

### Service Implementation Files

| Service | Entry Points | Exit Points |
|---------|-------------|-------------|
| **Deepgram** | `asr-streaming-worker.js:85` (connect)<br/>`asr-streaming-worker.js:145` (startStreaming)<br/>`asr-streaming-worker.js:178` (processAudioSegment) | `asr-streaming-worker.js:215` (onTranscript) |
| **DeepL** | `deepl-incremental-mt.js:245` (translate)<br/>`deepl-incremental-mt.js:195` (updateContext)<br/>`deepl-incremental-mt.js:145` (getCachedTranslation) | `deepl-incremental-mt.js:285` (onTranslationComplete) |
| **ElevenLabs** | `elevenlabs-tts-service.js:125` (synthesize)<br/>`elevenlabs-tts-service.js:215` (synthesizeWithEmotion) | `elevenlabs-tts-service.js:285` (onAudioComplete) |
| **Hume AI** | `hume-evi-adapter.js:95` (connect)<br/>`hume-evi-adapter.js:165` (pushAudioFrame) | `hume-evi-adapter.js:235` (onEmotionResult) |

### Configuration Files

| File | Purpose |
|------|---------|
| `config/third-party-config.js` | Centralized service configuration |
| `THIRD_PARTY_SERVICES.md` | Service documentation & monitoring |
| `test-latency-measurement.js` | Latency testing tool |
| `test-service-health.js` | Service health checks |

---

## How to Use These Diagrams

### View in GitHub
GitHub automatically renders Mermaid diagrams in Markdown files.

### Export as Images
1. Install mermaid-cli: `npm install -g @mermaid-js/mermaid-cli`
2. Export diagram:
   ```bash
   mmdc -i THIRD_PARTY_FLOW_DIAGRAM.md -o flow-diagram.png
   ```

### Edit Online
Visit [Mermaid Live Editor](https://mermaid.live/) and paste diagram code.

### Generate PDF
```bash
mmdc -i THIRD_PARTY_FLOW_DIAGRAM.md -o flow-diagram.pdf
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-16
**Status**: Complete - All third-party integrations documented
