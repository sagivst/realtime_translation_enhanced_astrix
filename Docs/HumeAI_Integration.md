# Hume AI Integration — Full Development Spec (with ElevenLabs & Optional LLM Text Rewriter)

**Audience:** Backend/Realtime engineers  
**Scope:** Integrate **Hume AI** (emotion/intent/prosody) into a low-latency speech pipeline, influence **text (optional LLM rewriter)** and **voice rendering (ElevenLabs TTS)**, keep total E2E latency under conversational targets.  
**Out of Scope:** Downstream conference mixing policy (covered elsewhere), account billing automation.

---

## 0) Goals & Constraints

- **Primary goals**
  - Inject **emotion & intent** from Hume AI into the pipeline to preserve speaker affect across translation & TTS.
  - **Map Hume outputs → ElevenLabs voice parameters** to control prosody/expressiveness.
  - Optionally **refine translated text** (style/wording) via **LLM Text Rewriter** with **async** mode to avoid blocking.
- **Latency targets (p95)**
  - ASR partials: **150–250 ms**
  - Hume emotion: **80–120 ms** increments (streaming)
  - Translation (DeepL): **250–400 ms**
  - LLM rewriter (async): **0 ms blocking** (update in next phrase), or **+300–600 ms** if inline
  - TTS start (ElevenLabs streaming): **150–300 ms**
  - **E2E conversational target** (speech→speech, first audio audible): **≤ 900 ms** (preferably 700–850 ms)

---

## 1) System Overview

```mermaid
flowchart LR
  A[Uplink PCM 16 kHz (20 ms frames)\n(Asterisk/ExternalMedia/ARI)] --> ASR[ASR (e.g., Deepgram)\nWS streaming]
  A --> HUME[Hume AI\nEmotion/Intent/Prosody]
  ASR --> TXT[text_src]
  TXT --> TR[DeepL Translation\ntext_src→text_tgt]
  HUME --> STYLE[Style Mapper\n(Hume→TTS params)]
  TR --> COMB[Combiner]
  STYLE --> COMB
  COMB --> TTS[ElevenLabs TTS\nStreaming]
  TTS --> OUT[Playback → Room (Asterisk write)]
  %% Optional async text rewrite path
  HUME --> REW[LLM Text Rewriter (async)]
  TR --> REW
  REW -->|revised_text_tgt| COMB

Key principle: Hume runs in parallel with ASR/translation. Its outputs inform:
	•	Text (optional LLM rewriter) — semantic style adaptation
	•	Voice (ElevenLabs) — prosodic controls

⸻

2) Data Contracts

2.1 Hume (Streaming Emotion/Intent)
	•	Transport: WebSocket (bi-directional)
	•	Client → Hume: raw PCM frames (16 kHz mono, 20 ms, 640 B) or 8/16 kB chunks
	•	Hume → Client (JSON @ ~5–10 Hz):

{
  "ts": 1739630112.21,
  "emotion": {"label":"joy","confidence":0.91},
  "prosody": {"pitch_semitones": +1.2, "energy": 0.78, "rate": 1.03},
  "intent": "greeting",
  "turn": {"eot_hint": false}
}

2.2 ASR (example interface)
	•	Transport: WebSocket
	•	Out: partial/stable/final text segments

{"type":"partial","text":"I think we"}
{"type":"final","text":"I think we should try"}

2.3 DeepL (Text Translation)
	•	REST: POST /v2/translate

{"text":"I think we should try","target_lang":"HE"}

→

{"text_tgt":"I think we should try"}

2.4 LLM Text Rewriter (Optional)
	•	REST (internal): POST /rewrite

{
  "text_tgt":"I think we better try",
  "emotion":{"joy":0.8,"empathy":0.7,"warmth":0.8},
  "style":"warm"
}

→

{"text_tgt_rewritten":"I really think we should try it—it feels right.}

2.5 ElevenLabs (Streaming TTS)
	•	WS/HTTP stream
Request (HTTP example):

{
  "text": "I really think we should try it—it feels right.",
  "voice_settings": {
    "stability": 0.55,
    "style": "cheerful",
    "similarity_boost": 0.85
  },
  "model_id": "eleven_flash_v2_5"
}

	•	Response: audio stream (e.g., PCM/MP3 chunks)

⸻

3) Style Mapping (Hume → ElevenLabs)

3.1 Emotion-to-Voice mapping (example heuristic)

{
  "joy":      {"stability": 0.5, "style": "energetic", "similarity_boost": 0.85},
  "sadness":  {"stability": 0.8, "style": "soft",      "similarity_boost": 0.7},
  "anger":    {"stability": 0.35,"style": "tense",     "similarity_boost": 0.8},
  "empathy":  {"stability": 0.65,"style": "warm",      "similarity_boost": 0.85},
  "neutral":  {"stability": 0.6, "style": "neutral",   "similarity_boost": 0.8}
}

3.2 Prosody shaping
	•	prosody.rate (Hume) → speed adjustment (±5–10%)
	•	prosody.pitch_semitones → pitch shift (if supported via params/voice selection)
	•	prosody.energy → map to expressiveness (style intensity) / similarity_boost

Keep ranges conservative to avoid artifacts: speed ±7%, pitch ±1–2 semitones.

⸻

4) LLM Text Rewriter — Latency-Safe Design

4.1 Modes
	•	Async (recommended for live): Do not block TTS; stream DeepL text immediately. When rewrite arrives (300–600 ms), apply to next clause/utterance or update if UX allows mid-segment switch.
	•	Inline (quality mode): Block TTS until rewrite ready (adds +300–600 ms).

4.2 Trigger policy
	•	Run rewriter on clause boundaries (VAD+punctuation) or when pause ≥ 600–800 ms.
	•	Minimum span: ≥ 6–12 words to justify rewrite.

4.3 Safety/Guardrails
	•	Limit paraphrase to style-only (no semantic drift): enforce with constrained prompts:

"You must preserve meaning. Make tone: {warm|empathetic|confident}. Max change: 20% tokens."


⸻

5) Orchestrator — Reference Flow (pseudo)

async def on_asr_text(text_src):
    # 1) translate
    text_tgt = await deepl.translate(text_src, target="HE")

    # 2) latest Hume emotion snapshot
    emo = hume_cache.latest()  # {"emotion":"joy","prosody":{...},"confidence":0.9}

    # 3) build TTS params from Hume
    tts_params = style_mapper(emo)

    # 4) non-blocking rewrite
    if rewrite_mode == "async" and is_clause_boundary(text_src):
        asyncio.create_task(request_rewrite(text_tgt, emo))

    # 5) choose text for TTS now
    text_for_tts = rewritten_cache.pop_ready() or text_tgt

    # 6) start streaming TTS
    await elevenlabs.stream(text_for_tts, tts_params)

Rewrite task

async def request_rewrite(text_tgt, emo):
    t = await llm.rewrite(text_tgt, emo)
    rewritten_cache.push(t)  # used on next clause/turn


⸻

6) Transport & Integration Points

6.1 Ingest (Asterisk)
	•	Use ARI ExternalMedia (channel type) with direction=read per participant to stream uplink PCM to the Orchestrator with 20 ms cadence.
	•	Preserve seq_num + ts_mono_ms.

6.2 Parallel fan-out (hot path)
	•	On each frame arrival: immediate dispatch to:
	•	ASR WS
	•	Hume WS
	•	QA tap (optional)
	•	Never await inside the 20 ms tick; branch stalls must not block main loop.

⸻

7) Error Handling & Fallbacks

Service	Error Case	Fallback
Hume	WS drop / high latency	Use cached last-known style for ≤ 3 s; degrade to neutral
DeepL	4xx/5xx	Retry 1–2 times; fallback to source language or alternate MT
LLM	Timeout > 600 ms	Skip rewrite for this clause; proceed with DeepL text
ElevenLabs	Backpressure / outage	Switch to backup TTS (vendor B / on-prem), keep neutral style

Health pings: periodic ping/pong and sliding window of service_rtt_ms.

⸻

8) Latency Budget (p95)

Stage	Budget (ms)
Asterisk → Orchestrator (ingest)	≤ 10
ASR partial ready	150–250
Hume first emotion	80–120
DeepL translation	250–400
TTS start (streaming)	150–300
LLM rewrite (async)	300–600 (not blocking)
First audible audio	≤ 900


⸻

9) Diagrams

9.1 Realtime Influence (Hume → Text & Voice)

sequenceDiagram
  autonumber
  participant MIC as PCM (20ms)
  participant ASR as ASR
  participant H as Hume
  participant MT as DeepL
  participant R as LLM Rewriter (async)
  participant M as Mapper
  participant TTS as ElevenLabs
  participant OUT as Playback

  MIC->>ASR: audio stream
  MIC->>H: audio stream
  ASR-->>MT: text_src
  H-->>M: emotion + prosody JSON
  MT-->>R: text_tgt (optional)
  R-->>M: text_tgt_rewritten (async)
  M-->>TTS: text_for_tts + voice_params
  TTS-->>OUT: audio stream (translated, styled)

9.2 Control Plane (States)

flowchart TB
  start((Start))
  start --> asr[ASR partial ready?]
  asr -->|yes| tr[Translate text_src via DeepL]
  asr -->|no| wait[Wait next partial]
  tr --> map[Map Hume→voice params]
  tr -->|async| rewrite[LLM rewrite trigger if clause]
  rewrite --> cache[Update rewritten cache]
  map --> choose[Choose text: rewritten? else deepL]
  choose --> tts[Send to ElevenLabs (stream)]
  tts --> end((Done))


⸻

10) Security & Secrets
	•	Store API keys (Hume, DeepL, ElevenLabs, LLM) in a secrets manager (Vault/SSM).
	•	Enforce TLS everywhere.
	•	PII: Detach raw audio storage unless explicitly enabled for QA; default to no persist.
	•	Rate-limit per session (WS backpressure, max outstanding frames).

⸻

11) Observability & QA
	•	Metrics (Prometheus):
	•	hume_ws_rtt_ms, hume_msg_rate_hz
	•	deepl_latency_ms, rewrite_latency_ms, tts_latency_ms
	•	audio_first_byte_ms, tts_underrun_count
	•	Logs (JSON): correlate by session_id, utterance_id, seq_range.
	•	Audio Tap: pre-API monitors for Hume and TTS inputs (engineer-only).
	•	A/B switches: with/without rewrite; with/without style mapping; measure OVRL/MOS improvements.

⸻

12) Minimal Interfaces (Examples)

12.1 Hume Streaming (client pseudocode)

async with websockets.connect(HUME_WSS, headers=auth) as ws:
    while True:
        pcm = await pcm_queue.get()  # 640B 20ms
        await ws.send(pcm)
        while ws.messages_pending():
            emo_json = await ws.recv()
            hume_cache.update(emo_json)

12.2 ElevenLabs Streaming (HTTP/WS)

params = build_params_from_hume(hume_cache.latest())
await eleven.stream(text_for_tts, params, voice_id="your_voice", model="eleven_flash_v2_5")

12.3 Async LLM Rewriter (FastAPI)

@app.post("/rewrite")
def rewrite(body: RewriterIn) -> RewriterOut:
    prompt = build_prompt(body.text_tgt, body.emotion)
    out = llm.generate(prompt, max_tokens=120, latency_target_ms=400)
    return {"text_tgt_rewritten": sanitize(out)}


⸻

13) Rollout Plan
	•	Phase A (baseline): Hume→ElevenLabs only (no text rewrite), measure prosody wins.
	•	Phase B (async rewriter): trigger at clause pauses; ensure non-blocking.
	•	Phase C (quality mode): allow inline rewrite for high-value segments (recordings/demos).

⸻

14) Acceptance Criteria
	•	First TTS audio ≤ 900 ms from speech onset (p95).
	•	Prosody alignment: > 80% of utterances show expected style (manual eval).
	•	No ASR/TTS underruns; Hume stream sustains ≥ 5 Hz updates.
	•	When LLM is enabled (async), no extra blocking in the hot path.

⸻

15) Risk Notes & Mitigations
	•	Semantic drift in rewrite → strict prompts + similarity check vs. DeepL text.
	•	Over-expressive TTS → clamp style ranges; per-language limits.
	•	Hume outages → neutral fallback; cache last style ≤ 3 s.
	•	Cost spikes → enable dynamic throttling (rewrite only on “high empathy” turns).

⸻

16) Configuration Cheat-Sheet

pipeline:
  sample_rate_hz: 16000
  frame_ms: 20
  rewrite_mode: async        # async | inline | off
  rewrite_min_pause_ms: 700
  tts_model: eleven_flash_v2_5
  voice_id: YOUR_DEFAULT_VOICE
  hume_style_map:
    joy:      {stability: 0.5, style: energetic,  similarity_boost: 0.85}
    empathy:  {stability: 0.65,style: warm,      similarity_boost: 0.85}
    anger:    {stability: 0.35,style: tense,     similarity_boost: 0.8}
    neutral:  {stability: 0.6, style: neutral,   similarity_boost: 0.8}
latency_budget_ms:
  asr: [150,250]
  hume: [80,120]
  translation: [250,400]
  tts_start: [150,300]
  llm_rewrite_async: [300,600]


