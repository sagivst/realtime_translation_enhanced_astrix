
# Realtime_Translation_Enhanced_Asterisk_SpeakerAdaptive_DevSpec.md
## Version: 2.1 – Full Development & Architecture Specification

---

## 1. System Purpose

This document defines the **complete architecture and runtime behavior** of  
the upgraded `realtime-translation-enhanced` platform — an **Asterisk-based**,  
**speaker-adaptive**, **multilingual**, **full-duplex** voice translation system.

The system enables:
- Real-time translation of live audio between participants in different languages.  
- Cross-lingual **voice cloning** (each speaker maintains their own vocal identity).  
- **Low-latency duplex flow** with natural overlap and no gating.  
- Robust **recovery mechanisms** for media loss, API delays, and reconnects.

Latency goal:  
→ *End-to-end (mic → translated playback)* ≤ **900 ms**

---

## 2. Core System Layers

| Layer | Component | Description |
|--------|------------|--------------|
| **Telephony & Conferencing** | **Asterisk** | SIP/RTP core for signaling, bridging, and media routing. |
| **Media Interface** | **chan_externalmedia** | Opens bidirectional PCM pipes (16kHz mono, 20ms frames). |
| **AI Orchestrator** | **Translation Control Service** | Supervises ASR → MT → TTS streams and timing pipelines. |
| **ASR Engine** | Deepgram / WhisperRT | Converts audio → text stream with <250 ms lag. |
| **MT Engine** | DeepL Pro / NLLB | Converts source → target text incrementally. |
| **TTS Engine** | XTTS v2 / Meta VoiceBox | Generates speech in target language, conditioned on speaker identity/style. |
| **Voice Profile Service** | Embedding DB + Cache | Stores voice identity and prosody embeddings for each user. |
| **Resilience Layer** | Recovery Scheduler | Monitors all stream lifecycles, manages reconnections and timeouts. |

---

## 3. System Topology

```mermaid
flowchart LR
  subgraph TELEPHONY[Asterisk Core]
    CB[ConfBridge]
    EM[ExternalMedia Pipes]
  end

  subgraph MEDIA[AI Orchestrator Layer]
    ORC[Media Orchestrator]
    Q[Async Queues]
    BUF[Frame Buffers]
  end

  subgraph AI[AI Engines]
    ASR
    MT
    TTS
    VP[Voice Profiles]
  end

  USER1[Speaker A] --> CB
  USER2[Speaker B] --> CB
  CB <--> EM
  EM <--> ORC
  ORC --> Q
  Q --> ASR --> MT --> TTS
  ORC --> VP
  TTS --> ORC --> EM --> CB --> USER2

Control Path: Orchestrator supervises session state via WebSocket/REST APIs.
Data Path: PCM audio (binary) at 20 ms frame resolution, bidirectional.

⸻

4. Session Model & Entities

4.1 Session Entities

Entity	Description
ConferenceRoom	Logical group managed by Asterisk ConfBridge.
Participant	SIP/WebRTC endpoint with defined speaker_id, language, and profile_ref.
MediaSession	1:1 mapping between Asterisk channel and ExternalMedia connection.
StreamChain	Directed path: Input PCM → ASR → MT → TTS → Output PCM.
VoiceProfile	Combination of timbre (identity) + prosody (style).
TranslationContext	Maintains buffer queues, language mapping, and latency metrics.

4.2 State Machine – ExternalMedia Session

stateDiagram-v2
  [*] --> INIT
  INIT --> CONNECTING : Dialplan trigger
  CONNECTING --> STREAMING : TCP handshake + ACK
  STREAMING --> PAUSED : Flow control or missing frames
  PAUSED --> STREAMING : Resume after recovery
  STREAMING --> TERMINATED : Hangup or timeout
  TERMINATED --> [*]

Each ExternalMedia instance runs independently for each leg.
If disconnected, the Orchestrator retries up to 3 times (exponential backoff 200→800 ms).

⸻

5. Voice Profile Architecture

5.1 Overview

Each speaker has a profile built from training samples.
Two embeddings are extracted:

Embedding	Model	Purpose
Identity Embedding	ECAPA-TDNN (256-D)	Captures timbre and vocal tract characteristics.
Style Embedding	GST-Tacotron / YourTTS	Captures prosody, rhythm, and emphasis patterns.

Profiles are stored in a secure DB and cached locally for <10 ms lookup.

5.2 VoiceProfile Schema

{
  "speaker_id": "SAGIV_001",
  "identity": {
    "model": "ecapa_tdnn",
    "embedding_ref": "sagiv_001_id_256.bin"
  },
  "style": {
    "model": "gst_tacotron",
    "embedding_ref": "sagiv_001_style_64.json"
  },
  "default_params": {
    "emotion": "neutral",
    "speed": 0.97,
    "pitch": -1
  },
  "created_at": "2025-10-10T08:20:00Z",
  "version": "v2.3"
}


⸻

6. Real-Time Media Flow (Frame-Level)

Each direction (A→B or B→A) is represented as a StreamChain:

PCM_IN → ASR → MT → TTS → PCM_OUT

The Orchestrator runs an event loop with per-frame granularity (20ms).
At each iteration:

Step	Operation	Expected Time
1	Read PCM from ExternalMedia	0–10 ms
2	Append to ASR buffer	+0 ms
3	If ASR partial ready → emit	+5–10 ms
4	Translate token batch (MT)	+20–60 ms
5	Send to TTS	+5 ms
6	Stream back PCM 20 ms	+5–10 ms
7	Push to ExternalMedia playback queue	+5–10 ms

Average loop latency: 120–200 ms (steady-state),
End-to-end roundtrip: 700–900 ms.

⸻

7. Internal Queues & Buffering

7.1 Queue Design

Queue	Purpose	Max Depth	Flush Policy
InputBuffer	Holds incoming PCM frames before ASR	3 frames (60 ms)	Drop oldest on overflow
ASRQueue	Streams audio to ASR worker threads	5 frames (100 ms)	Throttle input
MTQueue	Receives text partials for translation	dynamic	Merge when latency >200 ms
TTSQueue	Receives translated segments for synthesis	2–4 tokens	Start playback early
PlaybackQueue	Buffered PCM ready for RTP output	6–8 frames (120–160 ms)	Jitter smoothing

7.2 Backpressure Control
	•	If ASR lag >300 ms → temporarily pause ExternalMedia read.
	•	If TTS lag >400 ms → reduce output rate (skip silent frames).
	•	If MT unresponsive >1.2 s → trigger retry (up to 2x).

⸻

8. Orchestrator Internal Logic

8.1 Thread Model

Thread	Function
Main Event Loop	Controls all active StreamChains (async).
ASR Worker	Handles streaming recognition, pushes partials to queue.
MT Worker	Processes text translations in batches.
TTS Worker	Generates PCM frames and emits to playback queue.
Recovery Thread	Monitors session health, pings AI endpoints.

8.2 Scheduler Loop

while session.active:
    read_pcm_from_asterisk()
    asr_buffer.feed(frame)
    if asr.partial_ready():
        mt_queue.push(asr.get_partial())
    if mt_queue.has_segment():
        tts_queue.push(mt.translate(mt_queue.pop()))
    if tts_queue.ready():
        pcm = tts_queue.pop()
        send_pcm_to_asterisk(pcm)
    check_latency_metrics()
    sleep(20ms)

8.3 Latency Monitoring
	•	Each chain maintains rolling average latency (avg_latency_500ms).
	•	If deviation > 2× baseline → trigger diagnostic log + adaptive delay.
	•	Metrics pushed every 1s to Prometheus-compatible endpoint.

⸻

9. Error Handling & Recovery Design

Failure Type	Detection	Action	Retry / Timeout
ASR Timeout	No partials for 1.2s	Restart ASR stream	2 retries, then fallback to neutral voice
MT Error (HTTP 5xx)	API error	Requeue segment after 300 ms	up to 3x
TTS Delay	Missing PCM for >500 ms	Fill silence frame; retry synth	until resume
ExternalMedia Disconnect	Socket closed	Reconnect in 200→400→800 ms sequence	3x max
VoiceProfile Load Fail	DB/Cache miss	Use default neutral TTS voice	continue session
Jitter Overflow	Queue depth >8 frames	Drop oldest frame, log warning	continuous

Each component implements a state watcher emitting JSON health events to /health/report.

Example:

{
  "session_id": "room_1234_leg_A",
  "component": "TTS",
  "status": "delayed",
  "lag_ms": 480,
  "action": "injected silence",
  "ts": 1739560112.004
}

מעולה Sagiv 🙌
אנחנו ממשיכים לחלק השני של המסמך המפורט (Sections 10–15):
Integration, Event Contracts, Frame Timeline, Voice Blending, Recovery & State Coordination.

(המשך ישיר של הקובץ הקודם — אותו Markdown מסמך Realtime_Translation_Enhanced_Asterisk_SpeakerAdaptive_DevSpec.md.)

⸻


## 10. Asterisk ↔ Orchestrator Integration Details

### 10.1 ExternalMedia Lifecycle
Asterisk’s `chan_externalmedia` manages the media socket for each conference leg.

**Connection Phases:**
1. **Dialplan Invocation:** Asterisk triggers `ExternalMedia()` with target TCP/WS endpoint.
2. **Handshake:** Orchestrator responds with ACK → identifies `room_id`, `speaker_id`, `direction`.
3. **Stream Activation:** Continuous PCM (20 ms frames) begins both ways.
4. **Health Ping:** Asterisk expects a control JSON ping (`{ "ping": true }`) every 2s.
5. **Termination:** On `Hangup()` or silence timeout → Orchestrator sends `{ "type": "end" }`.

**State Handling**
```mermaid
stateDiagram-v2
  [*] --> INIT
  INIT --> CONNECTING: Dialplan invoked
  CONNECTING --> STREAM_ACTIVE: ACK received
  STREAM_ACTIVE --> RECONNECTING: socket closed
  RECONNECTING --> STREAM_ACTIVE: reconnect success
  RECONNECTING --> TERMINATED: retries > 3
  STREAM_ACTIVE --> TERMINATED: hangup or timeout


⸻

10.2 ConfBridge Events & ARI Hooks

Asterisk sends join/leave/mute events to Orchestrator:

{
  "event": "confbridge_join",
  "room_id": "1234",
  "participant": {
    "id": "SAGIV_001",
    "language": "he",
    "profile_ref": "v2.3"
  },
  "timestamp": 1739560112.034
}

The Orchestrator uses this to:
	•	Initialize StreamChains per direction.
	•	Load voice profiles for each new speaker.
	•	Update routing map for listeners and languages.

⸻

11. Frame Timeline and Event Loop Diagram

Below is a 200 ms (10-frame) sliding window timeline of a single directional chain:

gantt
  title "Per-frame 200ms translation window"
  dateFormat  S
  section Input
  PCM read        :done, 0, 20
  PCM read        :done, 20, 20
  PCM read        :done, 40, 20
  section ASR
  Buffer / tokenize :active, 0, 60
  Partial emit       :milestone, 60, 1
  section MT
  Translate partial  :active, 60, 80
  Send to TTS        :milestone, 120, 1
  section TTS
  Synthesize PCM     :active, 120, 80
  Emit audio frames  :milestone, 200, 1
  section Output
  RTP playback       :active, 180, 20


⸻

12. Voice Adaptation & Blending Internals

12.1 Conditioning Stack

Each TTS call receives:
	•	Phoneme sequence (target language)
	•	Speaker identity vector (256-D)
	•	Prosody style vector (64-D)
	•	Control params: emotion, rate, pitch.

The acoustic model combines these embeddings:

mel_out = AcousticModel(text_phonemes, identity_vec, style_vec)
pcm_out = Vocoder(mel_out)

12.2 Adaptive Normalization

Since prosody patterns differ by language:
	•	Duration normalization aligns phoneme timing (ratio based on target-language corpus).
	•	Pitch normalization offsets ±3 semitones to retain speaker tone.
	•	Silence intervals remapped proportionally (maintain rhythm ratio 0.8–1.2).

12.3 Example Call (Pseudo)

POST /tts/synthesize
{
  "text": "תן לי לבדוק את הזמינות",
  "lang": "he",
  "identity_embedding": "agent_A_id256.bin",
  "style_embedding": "agent_A_style64.json",
  "controls": {
    "emotion": "confident",
    "rate": 0.93,
    "pitch": -1
  }
}

Response:
Binary PCM16 16kHz, 20ms frames, streamed.

⸻

13. Error Recovery and Failover Scenarios

13.1 Network or API Timeout

Component	Condition	Recovery
ASR	No packets 1.2s	Reopen stream, replay last 100ms buffer
MT	HTTP error	Requeue last segment, exponential backoff
TTS	No PCM frames >500ms	Inject silence, retry synth
ExternalMedia	TCP closed	Attempt reconnect 200,400,800 ms
ConfBridge	Participant dropped	Remove StreamChains, flush queues

13.2 Session Recovery Timeline

sequenceDiagram
  participant EM as ExternalMedia
  participant O as Orchestrator
  participant ASR
  participant MT
  participant TTS

  EM->>O: socket_closed
  O->>O: trigger reconnect timer
  O->>EM: reconnect attempt 1
  EM-->>O: ack success
  O->>ASR/MT/TTS: resume session, resend profiles
  TTS-->>O: resume PCM stream
  O-->>EM: forward PCM

If reconnect fails after 3 attempts → session marked degraded, fallback to neutral TTS voice until reconnection.

⸻

14. Interface Mapping (Detailed)

Old Endpoint	New Endpoint	Additional Fields	Change Summary
/asr/stream	/asr/stream	speaker_id, lang, session_id	Contextualized ASR per participant.
/mt/translate	/mt/translate	stream_id, seq_num	Supports incremental tokens, partial flush.
/tts/speak	/tts/speak_cond	voice_identity_ref, voice_style_ref, emotion	Conditional synthesis layer.
/orchestrator/session	/orchestrator/session_ext	profiles, languages, state	Adds language mapping, status reporting.
/health	/health/report	lag_ms, queue_depth, retries	Exposes live performance metrics.


⸻

15. Conference-Level Coordination Logic

15.1 Stream Routing

Each speaker generates one outbound stream per listener.
For N participants, total chains = N × (N−1).

To reduce compute load:
	•	Shared TTS output per language group (if multiple listeners share target language).
	•	Aggregated routing table (O(N²) → O(N×L)).

15.2 Example Routing Matrix

From	To	Source Lang	Target Lang	Profile Voice	Chain ID
Agent_A	Customer_B	he	en	Agent_A_voice	A1
Customer_B	Agent_A	en	he	Customer_B_voice	B1
Agent_A	Supervisor_C	he	en	Agent_A_voice	A2

15.3 Real-Time Metrics
	•	chain_latency_ms (avg 500ms)
	•	asr_to_tts_gap_ms (avg 220ms)
	•	active_sessions (gauge)
	•	frames_per_sec (count)
	•	error_rate_pct (<0.8%)

⸻

16. Recovery Hierarchy & Priority
	1.	Soft Recovery (In-Stream):
	•	Local retries for API delays <1s.
	•	Queue depth trimming, silence insertion.
	2.	Hard Recovery (Connection):
	•	ExternalMedia reconnect sequence (up to 3×).
	•	Re-register profiles on rejoin.
	3.	Failover (Degraded Mode):
	•	Replace TTS with neutral fallback (language-only, no voice clone).
	•	Mark state DEGRADED in telemetry.
	4.	Full Reset:
	•	Triggered if 3 consecutive reconnect cycles fail.
	•	Orchestrator cleans state, notifies /session_terminate.

⸻

17. Summary of Key Technical Parameters

Parameter	Target	Description
Sample Rate	16 kHz	Mono PCM, 20 ms frames
Latency (end-to-end)	≤ 900 ms	Full duplex path
ASR partial window	250 ms	Token emission window
MT segment delay	200 ms	From final partial
TTS warm start	100 ms	Cached model init
PCM buffer	6–8 frames	Jitter smoothing
ExternalMedia reconnect	≤ 3×	200→400→800 ms
Queue depth limit	8 frames	Drop oldest
Metrics sampling	1 Hz	Health + latency export


⸻

18. Architectural Summary

flowchart TD
  subgraph SIP[Asterisk Layer]
    CB[ConfBridge]
    EM[ExternalMedia]
  end
  subgraph AI[AI Chain]
    O[Orchestrator]
    ASR
    MT
    TTS
    VP[Voice Profiles]
  end
  subgraph CTRL[Recovery/Monitoring]
    RM[Recovery Manager]
    TM[Telemetry/Health]
  end

  A1[Speaker A]-->CB
  A2[Speaker B]-->CB
  CB<-->EM
  EM<-->O
  O-->ASR-->MT-->TTS
  O-->VP
  O-->RM
  RM-->TM
  TTS-->O-->EM-->CB
  CB-->A1 & A2


⸻

19. Developer Notes & Implementation Tips
	•	Keep all media in 16kHz mono PCM.
	•	Do not await TTS completion before playback — stream as soon as first chunk arrives.
	•	Tag all frames with seq_num for jitter correction.
	•	Maintain per-chain UUIDs for debugging (A→B, B→A).
	•	Prefer async/await (Node) or asyncio (Python) for orchestrator threading.
	•	Always preload speaker profiles at session start — never on-demand mid-stream.
	•	Cache embeddings in memory with LRU eviction for <20 ms access.

⸻

20. End-to-End Recap

Direction A→B:

PCM_IN (A, he) → ASR(he) → MT(en) → TTS(en, voice=A) → PCM_OUT (B)

Direction B→A:

PCM_IN (B, en) → ASR(en) → MT(he) → TTS(he, voice=B) → PCM_OUT (A)

Both flows operate concurrently under:
	•	Full-duplex overlap
	•	Latency target ≤ 900 ms
	•	Adaptive voice cloning with fallback resilience.

This document serves as the definitive architecture and development reference for implementing the Asterisk-based speaker-adaptive version of realtime-translation-enhanced.

---