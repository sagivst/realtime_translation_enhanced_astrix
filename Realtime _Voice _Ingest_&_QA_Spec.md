# Realtime Voice Ingest & QA Spec – Asterisk → Parallel Consumers (Low-Latency Tier)

**Scope (this stage only):**  
Ultra-low-latency **ingest** from **Asterisk** to **primary consumers** in parallel: **Deepgram ASR**, **Hume EVI (Emotion/Intent)**, and **Local Segmentation/VAD** (optional Diarization).  
**Out of scope:** translation, voice rendering, mixing, or playback routing (handled later).

---

## 1) Goals & Constraints

- **Primary goal:** Deliver each **20 ms** PCM frame from Asterisk to all consumers **concurrently** with **≤ 5–10 ms** added overhead (LAN).
- **Never block the 20 ms clock:** Asterisk is the metronome; ingest must remain non-blocking.
- **Preserve ordering & timing:** attach `seq_num` and `ts_mono_ms` to each frame.
- **Fan-out zero-copy:** avoid extra allocations; if copy is needed, use pooled slabs.
- **Verification first:** provide **pre-API audio taps** to audibly confirm correct feed per consumer.

---

## 2) Asterisk → Orchestrator Transport

### 2.1 Asterisk Dialplan (ExternalMedia)
```conf
[ai-room]
exten => 5000,1,NoOp(ConfBridge with per-user ExternalMedia)
 same => n,ExternalMedia(
    format=slin16,
    direction=both,
    transport=websocket,
    remote_host=orchestrator.internal,
    remote_port=5050
 )
 same => n,ConfBridge(1234) ; bridge_softmix (mix-minus per user)
 same => n,Hangup()

Notes
	•	format=slin16 → PCM 16-bit, mono, 16 kHz.
	•	One ExternalMedia socket per participant (both directions).
	•	Asterisk sends one 20 ms frame and expects one 20 ms frame back every tick (keep the cadence even when upstream is late).

⸻

3) Frame Envelope & Metadata

PCM payload per tick: 640 bytes (16 kHz * 20 ms * 16-bit mono).

Binary envelope (preferred)

+------------------+------------------+------------------+--------------+
| seq_num (u32 LE) | ts_mono_ms (u64) | flags (u16)      | PCM (640 B) |
+------------------+------------------+------------------+--------------+

Flags bitmask (examples)
	•	0x0001 VAD_speech
	•	0x0002 start_of_clause
	•	0x0004 end_of_clause
	•	0x0008 gap_dropped_on_branch
	•	0x0010 retrans_or_fill

You can also send a side-band JSON meta frame (then binary PCM).

⸻

4) Parallel Fan-Out Architecture

flowchart LR
  subgraph Asterisk
    MIX[bridge_softmix (20 ms mix-minus)]
    EM[chan_externalmedia (per user)]
  end

  subgraph Orchestrator (Ingest Layer)
    RX[Frame Receiver]
    HDR[Stamp (seq_num, ts_mono_ms, flags)]
    TEE[Zero-Copy Fan-Out]
  end

  subgraph Consumers
    DG[Deepgram ASR (WebSocket, binary PCM)]
    HE[Hume EVI (WebSocket, PCM + ASR hints)]
    SEG[Segmentation / VAD (local)]
    DIA[Diarization (optional, local)]
  end

  subgraph QA
    TAP_DG[Pre-API Audio Tap (Deepgram)]
    TAP_HE[Pre-API Audio Tap (Hume)]
  end

  MIX --> EM --> RX --> HDR --> TEE
  TEE --> DG
  TEE --> HE
  TEE --> SEG
  TEE --> DIA
  TEE --> TAP_DG
  TEE --> TAP_HE

Key principles
	•	Fan-out immediately upon receipt; never await inside the hot path.
	•	Per-consumer backpressure is isolated; if one stalls, mark gap_dropped_on_branch and move on (no global stall).

⸻

5) API Definitions (Low-Latency Plans & Parameters)

The following configurations are tuned for lowest latency and stable streaming.

5.1 Deepgram ASR – Streaming WebSocket

Endpoint (example):
wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&language=<SRC_LANG>&interim_results=true&punctuate=true&model=nova-2

Authentication (header)

Authorization: Token <DEEPGRAM_API_KEY>

Client → Server (binary)
	•	Send exactly one 20 ms PCM frame (640 B) per tick, in order.

Server → Client (text JSON)

{"type":"partial","text":"I thin","confidence":0.78}
{"type":"stable","text":"I think we","confidence":0.85}
{"type":"final","text":"I think we should try","confidence":0.91}

Recommended parameters (low latency)

Param	Value	Why
encoding	linear16	raw PCM; no codec overhead
sample_rate	16000	matches Asterisk slin16
interim_results	true	faster partials (150–250 ms)
model	nova-2 (or latest low-latency)	accuracy + speed
punctuate	true	improves clause boundaries
endpointing	off (let local VAD lead) or tuned	avoid premature finals
TCP	TCP_NODELAY	disable Nagle; reduce burst delay

Low-latency plan (guidance)
	•	Use Deepgram’s real-time streaming tier suitable for production concurrency (not batch).
	•	Prefer “enhanced/low-latency” models where available over “general”.

⸻

5.2 Hume EVI – Empathic Voice Interface (WebSocket)

Endpoint (example):
wss://api.hume.ai/v1/evi/stream

Authentication (headers)

Authorization: Bearer <HUME_API_KEY>
Content-Type: application/octet-stream

Client → Server
	•	Binary PCM frames: 20 ms, 640 B each (same as Asterisk), at real-time pace.
	•	Optional ASR text hints (JSON text frame) to improve intent/emotion stability:

{"type":"input_text","seq":184225,"text":"I think we should"}



Server → Client (JSON at ~10 Hz)

{
  "timestamp": 1739630112.21,
  "emotion": {"label":"thoughtful","confidence":0.91},
  "prosody": {"rate":0.94,"pitch_semitones":-1.1,"energy":0.77},
  "intent": "suggestion",
  "end_of_turn_hint": false
}

Recommended parameters (low latency)

Param	Value	Why
context_window_s	3–5	smooth emotion; avoid jitter
emotion_sensitivity	medium	balance reactivity vs stability
Input pace	strict 20 ms	keeps EVI aligned with ASR timing
ASR hint cadence	150–300 ms	adds semantic context without flooding
TCP	TCP_NODELAY	minimize burst delay

Low-latency plan (guidance)
	•	Choose EVI real-time (not batch analysis).
	•	If offered, enable “realtime streaming priority” / low buffer modes.

⸻

5.3 Local Segmentation/VAD (in-process, optional)
	•	VAD: webrtcvad (frame sizes 10/20/30 ms; use 20 ms aligned with ingress).
	•	Prosodic features: pitch/energy to detect clause boundaries (e.g., praat-parselmouth or lightweight DSP).
	•	Output events (non-blocking) to annotate flags: start_of_clause, end_of_clause.

⸻

6) Verification Layer (Pre-API “Audio Taps”)

Objective: hear exactly what each consumer receives, from the same frame source, right before the API call.

6.1 Tap Architecture
	•	At the TEE node, branch each frame to a Tap buffer per consumer.
	•	Each Tap offers:
	•	Live monitor: 16 kHz PCM → DAC (developer headphones)
	•	Short loop recorder: rolling 5–10 s WAV (for bug reports)

flowchart LR
  TEE --> TAP_DG -->|monitor| HeadphonesDG
  TEE --> TAP_HE -->|monitor| HeadphonesHE

Rules
	•	Taps are read-only; never block the main path.
	•	If the tap output device can’t keep up → drop tap frames (not main frames).
	•	Mark dropped tap frames with gap_dropped_on_branch.

6.2 Tap Implementation (pseudo)

class AudioTap:
    def __init__(self, sink):
        self.sink = sink              # sounddevice/ALSA/CoreAudio output
        self.q = LockFreeRing(cap=200) # 4s @ 20ms/frame

    def feed(self, seq, pcm):
        self.q.push((seq, pcm))        # drop-oldest if full

    def pump(self):
        while True:
            seq, pcm = self.q.pop() or (None, None)
            if pcm: self.sink.write(pcm)  # non-blocking write
            sleep(0.005)

Checklist
	•	Headphones play the exact frames sent to Deepgram/Hume.
	•	Compare audible content to service outputs (ASR partials, EVI emotions).

⸻

7) Performance Benchmarks (Targets)

Stage (Ingest only)	Target (ms)	Notes
ExternalMedia RX → stamp/header	≤ 2	single timestamp syscall; pre-allocated envelope
Fan-out dispatch (TEE)	≤ 3	zero-copy or pooled slab copies
Deepgram WS send (per frame)	≤ 2	non-blocking; TCP_NODELAY
Hume EVI WS send (per frame)	≤ 2	non-blocking; TCP_NODELAY
Segmentation feed	≤ 1	in-process function call
Total added overhead	≤ 10	LAN + optimized loop

Runtime monitors
	•	ingest_overhead_ms (moving avg, p95)
	•	branch_gap_rate per consumer
	•	seq_drift_ms (monotonic differences)
	•	ws_queue_depth (bytes/frames)

⸻

8) Implementation Blueprint (Ingest Only)

async def handle_externalmedia_stream(ws_in, deepgram_ws, hume_ws, tap_dg, tap_he, seg):
    while True:
        pcm = await ws_in.recv()             # 640 B, 20 ms
        seq = next_seq()
        ts  = monotonic_ms()

        # Side-band meta (optional)
        # meta_ws.send({"type":"meta","seq":seq,"ts":ts})

        # --- Pre-API taps (non-blocking) ---
        tap_dg.feed(seq, pcm)
        tap_he.feed(seq, pcm)

        # --- Zero-copy fan-out to consumers ---
        deepgram_ws.send(pcm)                # do not await; buffered writer
        hume_ws.send(pcm)

        # Pull ASR partials if available (non-blocking) and forward as text hint to Hume
        asr_evt = try_recv_json(deepgram_ws) # return None if no message
        if asr_evt and asr_evt.get("type") in ("partial","stable"):
            hint = {"type":"input_text","seq":seq,"text":asr_evt["text"]}
            hume_ws.send(json.dumps(hint).encode("utf-8"))

        # Local segmentation/VAD feed
        seg.feed(seq, ts, pcm)

Socket tuning
	•	Disable Nagle: TCP_NODELAY.
	•	Keep OS socket send buffers small/finite to surface backpressure early.
	•	If send() would block → drop that branch frame and set gap flag (log event).

⸻

9) Operational QA Checklist
	•	Asterisk direct_media = no (force server-side media/mix).
	•	ExternalMedia frame format = slin16, 16 kHz, 20 ms.
	•	One PCM frame per 20 ms to each consumer.
	•	Pre-API taps enabled; engineers can hear DG/Hume feeds.
	•	ingest_overhead_ms ≤ 10 ms (p95).
	•	No global stalls when a branch slows; only branch gaps logged.
	•	Seq continuity monotonic; drift ≤ ±40 ms across branches.
	•	VAD/Seg flags present in metadata (if enabled).

⸻

10) Minimal API Reference (Quick Cards)

Asterisk ExternalMedia
	•	I/O: 20 ms slin16 PCM per tick, both directions
	•	Contract: return a frame every 20 ms (playback handled later)

Deepgram ASR (WS)
	•	URL: wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&language=<SRC>
	•	Auth: Authorization: Token <key>
	•	Send: binary PCM frames (20 ms)
	•	Recv: JSON (partial/stable/final)
	•	Tuning: interim_results=true, low-latency model, TCP_NODELAY

Hume EVI (WS)
	•	URL: wss://api.hume.ai/v1/evi/stream
	•	Auth: Authorization: Bearer <key>
	•	Send: binary PCM frames (20 ms) + ASR text hints (JSON)
	•	Recv: JSON vectors (emotion, intent, prosody ~10 Hz)
	•	Tuning: context_window_s=3–5, strict 20 ms input pace, TCP_NODELAY

⸻

11) Flow Diagram (Ingest & QA Only)

sequenceDiagram
  autonumber
  participant AST as Asterisk (ExternalMedia)
  participant ORC as Orchestrator (Ingest)
  participant TAPDG as Audio Tap (DG)
  participant TAPHE as Audio Tap (Hume)
  participant DG as Deepgram WS
  participant HE as Hume EVI WS
  participant SEG as Local Seg/VAD

  AST->>ORC: PCM 20 ms (640 B)
  ORC->>ORC: Stamp (seq, ts)
  ORC->>TAPDG: feed (non-blocking)
  ORC->>TAPHE: feed (non-blocking)
  ORC->>DG: send binary PCM
  ORC->>HE: send binary PCM
  ORC->>SEG: seg.feed(seq, ts, pcm)
  DG-->>ORC: partial/stable text (JSON)
  ORC->>HE: send {"type":"input_text","text":...}


