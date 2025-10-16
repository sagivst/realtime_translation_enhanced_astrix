
# Real-Time Multilingual Emotional Voice Translation – Asterisk + Hume EVI (Developer Spec)

**Version:** 1.0  
**Audience:** Backend/Media engineers, VoIP/SIP engineers, ML/ASR/MT/TTS developers  
**Goal:** Implement a full-duplex, low-latency (≤ 900 ms) conferencing system where each participant:
- speaks in their own language,
- hears others in their own language,
- and perceives the **original speaker’s vocal identity and emotional style** (via context-aware modulation).

---

## 1. Executive Overview

This system extends an Asterisk-managed conference with a real-time AI media pipeline.  
Asterisk supplies **per-participant mix-minus** PCM frames every **20 ms** through `chan_externalmedia`.  
An **Orchestrator** performs **ASR → MT (DeepL) → EVI (emotion/intent) → TTS** and returns translated PCM to Asterisk **without ever breaking the 20 ms clock**.  
Emotion and intent continuity is handled by **Hume EVI** with a 3–5 s sliding context window.

### Latency Targets (end-to-end, mic → translated playback)
- ExternalMedia + buffering: 50–70 ms  
- ASR partials: 180–250 ms  
- MT (incremental): 120–200 ms  
- EVI analysis: 80–120 ms  
- TTS first audio: 180–250 ms  
- Playback jitter buffer: 120–160 ms  
**Total:** 700–850 ms typical; **budget cap:** ≤ 900 ms.

---

## 2. System Context

```mermaid
flowchart LR
  subgraph SIP[Asterisk Core]
    CB[ConfBridge (rooms)]
    SM[bridge_softmix (per-user mix-minus)]
    EMA[ExternalMedia (A)]
    EMB[ExternalMedia (B)]
    EMC[ExternalMedia (C)]
  end

  subgraph ORC[Media Orchestrator]
    FC[Frame Collector + Sequencer]
    SEG[Prosodic Segmenter (VAD/clauses)]
    ASR[ASR Streaming]
    MT[DeepL MT (incremental)]
    EVI[Hume EVI Adapter]
    TTS[TTS (voice+emotion)]
    PG[Pacing Governor (20 ms clock)]
  end

  A1[Participant A]-->CB
  A2[Participant B]-->CB
  A3[Participant C]-->CB

  CB-->SM
  SM-->EMA & EMB & EMC
  EMA & EMB & EMC <--> ORC

  ORC-->AsteriskReturn[(20 ms PCM per participant)]


⸻

3. Asterisk Media Layer (Deep Dive)

3.1 ConfBridge + bridge_softmix
	•	Asterisk decodes inbound RTP to PCM, keeps a jitter buffer, and mixes all inputs every 20 ms.
	•	For each participant i, it produces Mix(i) = sum(PCM(j)) for all j != i.
This is “mix-minus” (self-suppressed), preventing self-echo.

3.2 Per-Participant ExternalMedia

For each Asterisk channel:

[ai-translate]
exten => _X.,1,NoOp(Attach ExternalMedia for per-participant stream)
 same => n,ExternalMedia(
    format=slin16,
    direction=both,
    transport=websocket,
    remote_host=orchestrator.internal,
    remote_port=5050
 )
 same => n,ConfBridge(1234)
 same => n,Hangup()

	•	Contract: Asterisk always expects one 20 ms PCM frame per tick back from the external side.
	•	If none arrives, Asterisk may inject silence to keep RTP cadence (we want to return a placeholder ourselves instead).

3.3 Timing Rule (non-negotiable)

Asterisk is the metronome. Do not stall the ExternalMedia socket.
Return some frame every tick (translated audio, placeholder, or short silence).

⸻

4. Orchestrator – Architecture & Internals

4.1 Modules & Responsibilities

Module	Responsibility
Frame Collector	Receives 20 ms PCM frames from Asterisk; stamps seq_num, ts; reorders if needed.
Prosodic Segmenter	Groups frames into clauses using VAD + prosody (pitch/energy/pauses).
ASR Streaming	Sends audio to ASR; receives partial/stable tokens with timestamps.
DeepL MT Adapter	Incremental translation; supports partial/stable segments.
Hume EVI Adapter	Real-time emotion/intent analysis; emits prosody/controls for TTS.
TTS (voice+emotion)	Synth in target lang; speaker identity & style preserved; modulated by EVI.
Pacing Governor	Maintains 20 ms outbound cadence; holdback (120–180 ms); crossfade placeholder→translated.

4.2 Clock & Queues
	•	InputBuffer: 6–8 frames (120–160 ms)
	•	ASRQueue: holds frames for ASR worker
	•	MTQueue: holds partials for incremental translation
	•	EVIWindow: 3–5 s rolling audio+text window
	•	TTSQueue: translated segments awaiting synthesis
	•	PlaybackQueue: 6–8 frames (120–160 ms) for jitter smoothing and crossfades

4.3 Pacing Governor (Elastic Frame Pipeline)
	•	Rule 1: Always emit exactly one 20 ms frame per tick to Asterisk.
	•	Rule 2: If translated PCM not ready → emit placeholder (neutral low-gain bed or shaped silence).
	•	Rule 3: When translated PCM arrives → crossfade over the next 40–60 ms to replace placeholder.
	•	Rule 4: Respect clause boundaries; don’t cut inside a phoneme.

⸻

5. Real-Time Flow (Sequence)

sequenceDiagram
  autonumber
  participant AST as Asterisk
  participant EM as ExternalMedia (per user)
  participant ORC as Orchestrator
  participant ASR
  participant MT as DeepL MT
  participant EVI as Hume EVI
  participant TTS

  AST->>EM: 20 ms PCM frame (mix-minus)
  EM->>ORC: forward frame (+seq_num)
  ORC->>ASR: stream audio (async)
  ASR-->>ORC: partial/stable text (+timestamps)
  ORC->>MT: incremental translate (clause-level)
  MT-->>ORC: target text (partial/stable)
  ORC->>EVI: send audio+text context
  EVI-->>ORC: prosody/emotion/intent vector
  ORC->>TTS: synth target text (voice+emotion)
  TTS-->>ORC: 20 ms PCM frames
  ORC-->>EM: return frame (placeholder or translated)
  EM-->>AST: feed to bridge_softmix (per user RX)


⸻

6. Context-Oriented Modulation (Hume EVI)

6.1 Inputs
	•	Live audio (same PCM that ASR receives)
	•	Optional ASR text (partial/stable)
	•	3–5 s sliding buffer of audio+text context

6.2 Outputs (sample schema)

{
  "ts": 1739610105.20,
  "emotion": {"label":"thoughtful","confidence":0.92},
  "prosody": {"rate":0.94,"pitch_semitones":-1.2,"energy":0.78},
  "intent": "suggestion",
  "turn": {"end_of_turn_hint": false}
}

6.3 Application
	•	Map emotion/intent to TTS controls (style token, expressiveness)
	•	Use prosody.rate/pitch/energy to set TTS conditioning
	•	Smooth changes with EMA over the context window to avoid abrupt jumps.

⸻

7. Translation Pipeline – ASR + DeepL (Detailed APIs)

The system is vendor-agnostic for ASR; below we show a typical WebSocket ASR contract and DeepL MT usage with incremental splitting.

7.1 ASR Streaming API (WebSocket)

Client → ASR (binary)
	•	20 ms PCM frames (s16le, 16 kHz, mono)
	•	Metadata (once): session_id, source_lang, speaker_id

ASR → Client (JSON text frames)

{"type":"partial","text":"I think we sh","t0":12.34,"t1":12.64,"confidence":0.77}
{"type":"stable","text":"I think we should","t0":12.34,"t1":12.90,"confidence":0.86}
{"type":"final","text":"I think we should try this.","t0":12.34,"t1":13.20,"confidence":0.92}

Notes
	•	Emit partial every 150–250 ms; stable (no future revision likely) on clause boundary; final on endpoint.

7.2 DeepL MT (Incremental REST)

Endpoint (example pseudo):

POST /deepl/translate
Content-Type: application/json
Authorization: Bearer <token>

Request

{
  "session_id": "room123_legA",
  "seq": 1827,
  "source_lang": "he",
  "target_lang": "en",
  "text": "בוא נבדוק את זה",
  "glossary_id": "sales-v1",
  "hints": {
    "domain": "sales_demo",
    "formality": "default"
  }
}

Response (partial-aware)

{
  "seq": 1827,
  "segments": [
    {"type":"partial","text":"let's che"},
    {"type":"stable","text":"let's check this"}
  ],
  "tokens": 7,
  "latency_ms": 142
}

Guidance
	•	Split on clause boundaries from the Segmenter.
	•	Use a rolling context key to keep translations consistent within the session.
	•	Apply a glossary for brand/product terms.

⸻

8. TTS (Voice + Emotion)

8.1 Inputs
	•	Target text (partial/stable)
	•	Speaker identity & style (voice profile)
	•	Emotion/prosody control vector from EVI

Example control payload:

{
  "text": "Let's check this.",
  "lang": "en",
  "voice_identity_ref": "agent_A_ecapa256.bin",
  "voice_style_ref": "agent_A_gst64.json",
  "controls": {
    "emotion": "thoughtful",
    "rate": 0.94,
    "pitch_semitones": -1.2,
    "energy": 0.78
  },
  "audio": {"codec":"pcm_s16le","sr_hz":16000,"frame_ms":20}
}

8.2 Output
	•	Streaming 20 ms PCM frames; include marker events at word or clause boundaries.

⸻

9. Timing & Buffering (Engineering)

9.1 Gantt (200 ms window)

gantt
  dateFormat  S
  title  "200 ms Translation Window"
  section Input
  Asterisk read (20ms)     :done, 0, 20
  section ASR
  Partial emit             :active, 0, 60
  section MT
  Translate clause         :active, 60, 100
  section EVI
  Emotion vector           :active, 100, 120
  section TTS
  Synthesize               :active, 120, 180
  section Output
  Playback (20ms)          :active, 180, 200

9.2 Buffers & Policies

Buffer	Size	Policy
ASR input	120–160 ms	Reorder + jitter fix
MT holdback	120–180 ms	Expand to 450 ms for V-final languages
Playback	120–160 ms	Crossfade placeholder→translated
EVI context	3–5 s	EMA smoothing of emotion

Time-stretch: 0.90–1.10× (PSOLA/WSOLA) at safe boundaries only.

⸻

10. Duplex & Overlap (Natural Feel)
	•	No hard mute on remote; use micro-ducking (−6 to −9 dB) when local voice energy rises; release 250–300 ms after silence.
	•	Respect end_of_turn hints from EVI for smoother exchanges.
	•	Keep AEC at endpoints where possible.

⸻

11. Error Handling & Recovery

Failure	Detect	Action
ASR stall > 1.0 s	no partials	restart ASR stream; replay last 100 ms
DeepL 5xx	HTTP error	exponential backoff (200, 400, 800 ms) ×3
EVI stream loss	socket close	fallback to neutral prosody profile
TTS miss > 500 ms	no PCM	inject shaped silence; keep cadence
ExternalMedia drop	socket close	reconnect (200→400→800 ms) ×3
E2E latency > 900 ms	metrics	trim holdback by 40–60 ms; reduce look-ahead

Telemetry (per chain)
	•	avg_latency_500ms, asr_to_tts_gap_ms, queue_depth, emotion_state, error_rate_pct

⸻

12. Security & Privacy
	•	All inter-service links: TLS 1.2+ / WSS
	•	Short-lived JWTs per stream (≤ 5 min)
	•	No raw audio persistence by default; store only embeddings if required (encrypted at rest, AES-256)
	•	PII minimization: session_id, speaker_id, lang only

⸻

13. Detailed Data Contracts

13.1 ExternalMedia PCM (binary)
	•	Format: s16le, 16 kHz, mono
	•	Frame: 20 ms = 320 samples = 640 bytes
	•	Optional 8–12 byte header (your own):
	•	seq_num (u32), ts_monotonic_ms (u32), flags (u16)

13.2 Orchestrator Control Packets (JSON)

{ "type":"start_chain",
  "room_id":"1234",
  "from_speaker":"agent_A",
  "to_listener":"cust_B",
  "source_lang":"he",
  "target_lang":"en",
  "voice_profile":{"identity_ref":"ecapa256.bin","style_ref":"gst64.json"}
}

{"type":"duck","listener":"cust_B","level":0.35,"ramp_ms":50}

13.3 ASR Events

{"type":"partial","text":"אז אולי","t0":102.20,"t1":102.44,"confidence":0.76}
{"type":"stable","text":"אז אולי ננסה","t0":102.20,"t1":102.80,"confidence":0.86}

13.4 DeepL (incremental) – Request/Response (see §7.2)

13.5 EVI Vector (see §6.2)

13.6 TTS Control (see §8.1)

⸻

14. Pseudo-Code – Orchestrator Event Loop (Async)

async def handle_participant(ws_in, ws_out, asr, deepl, evi, tts, voice_profile):
    clock = TwentyMsClock()
    playback_q = RingBuffer(frames=8)         # 160 ms
    asr_in_q, mt_q, tts_q = AsyncQueue(), AsyncQueue(), AsyncQueue()
    context = EmotionContext(window_ms=4000)

    async def reader():
        async for frame in ws_in:             # 20 ms PCM from Asterisk
            stamp = stamp_frame(frame)
            asr_in_q.put(stamp)
            context.push_audio(frame)

    async def asr_worker():
        async for chunk in asr.stream(asr_in_q):
            emit = parse_asr_event(chunk)     # partial/stable
            mt_q.put(emit)
            if emit.text: context.push_text(emit.text)

    async def mt_worker():
        async for seg in mt_incremental(deepl, mt_q):
            # seg: {type: partial/stable, text: "..."}
            evi.post_audio_text(context.window_pcm(), context.window_text())
            emo = await evi.get_vector(timeout_ms=120)
            tts_q.put((seg, emo))

    async def tts_worker():
        async for (seg, emo) in tts_q:
            ctl = make_tts_controls(emo, voice_profile)   # rate/pitch/energy/emotion
            async for pcm in tts.stream(seg.text, ctl):
                playback_q.push(pcm)  # 20 ms frames

    async def writer():
        while True:
            frame = playback_q.pop() or shaped_silence_20ms()
            await ws_out.send(frame)
            await clock.sleep_next_tick()

    await asyncio.gather(reader(), asr_worker(), mt_worker(), tts_worker(), writer())

Notes
	•	clock.sleep_next_tick() holds a strict 20 ms cadence.
	•	If playback_q empty → shaped_silence_20ms() to preserve rhythm.
	•	evi.get_vector() runs parallel to ASR/MT; do not block TTS on EVI if late—use last known vector (EMA).

⸻

15. Failure Scenarios (Runbooks)

15.1 EVI Latency Spike
	•	Detect: evi_latency_ms > 300
	•	Action: reuse last vector (EMA), set emotion="neutral" if > 1.5 s; log WARN_EVI_LAG.

15.2 DeepL Temporary 5xx
	•	Detect: HTTP 5xx
	•	Action: retry 200/400/800 ms; if > 2 s, pass through literal MT fallback (backup model) with disclaimer marker (not audible).

15.3 ASR Dropped Stream
	•	Detect: no partials > 1 s
	•	Action: restart stream; replay last 100 ms input; insert low-gain placeholder.

15.4 ExternalMedia Disconnect
	•	Detect: socket closed
	•	Action: reconnect (200→400→800 ms) ×3; maintain cadence locally; mark session DEGRADED.

⸻

16. Security & Privacy (Engineering Checklist)
	•	WSS everywhere (TLS 1.2+)
	•	Short-lived JWT per leg (≤ 5 min)
	•	Embeddings encrypted at rest (AES-256)
	•	No default raw audio storage
	•	PII minimization: IDs only (no names)
	•	Configurable data retention with audit logs

⸻

17. End-to-End Summary

For each direction (A→B, B→A):

PCM_IN (mix-minus, 20 ms) → ASR(stream) → DeepL MT(incremental) → Hume EVI(emotion/intent)
→ TTS(voice+emotion) → PCM_OUT (20 ms, per participant)

The 20 ms cadence never stops.
Emotion and intent carry across sentences via EVI’s continuous vector + the 3–5 s context.
The user hears natural, emotionally consistent translated speech within ≤ 900 ms.

⸻

18. Appendix A – API Endpoint Examples (Concrete)

Replace hosts/keys accordingly. These are illustrative contracts.

ASR (WebSocket)
	•	wss://asr.internal/v1/stream?lang=he&session=room123_legA
	•	Binary frames: 640 bytes per 20 ms
	•	Text frames (server→client): partial/stable events (see §7.1)

DeepL (HTTP, incremental)
	•	POST https://api.deepl.com/v2/translate/incremental
	•	Headers: Authorization: DeepL-Auth-Key <key>, Content-Type: application/json
	•	Body: see §7.2
	•	Response: partial/stable segments

Hume EVI (WebSocket)
	•	wss://api.hume.ai/v1/evi/stream?session=room123_legA
	•	Client→Server: PCM frames + optional ASR text
	•	Server→Client: emotion/intent/prosody JSON vectors at ~10 Hz

TTS (WebSocket)
	•	wss://tts.internal/v1/speak?lang=en
	•	Client→Server: JSON control (voice refs + emotion controls) then text chunks
	•	Server→Client: PCM frames (20 ms) + word markers

⸻

19. Appendix B – Field Schemas

19.1 Emotion Vector

{
  "label": "confident|thoughtful|neutral|calm|excited|uncertain|frustrated",
  "confidence": 0.0-1.0,
  "prosody": {
    "rate": 0.80-1.20,
    "pitch_semitones": -3.0..+3.0,
    "energy": 0.0-1.5
  },
  "intent": "question|suggestion|reassurance|rejection|agreement",
  "end_of_turn_hint": true|false
}

19.2 Voice Profile (conceptual)

{
  "speaker_id": "agent_A",
  "identity_ref": "ecapa256/agent_A.bin",
  "style_ref": "gst64/agent_A.json",
  "defaults": {"emotion":"neutral","rate":0.97,"pitch_semitones":-1}
}

