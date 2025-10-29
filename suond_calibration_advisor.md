# AI Voice Calibration Assistant — Full Development Plan

**Goal:** Build an **open, real-time “AI calibration advisor”** that analyzes incoming microphone audio and provides **live metrics + actionable guidance** (widgets/gauges and textual tips) to improve call/meeting audio quality.  
**Scope:** Frontend (widgets), streaming backend (ingest → AI inference → advice), and model serving (NISQA-s + DNSMOS P.835).  
**Out of scope (phase-1):** downstream translation/mixing; TTS.

---

## 1) High-Level Architecture

```mermaid
flowchart LR
  A[Audio Source\n(WebRTC mic, SIP/Asterisk uplink, RTP, WAV)] --> B[Ingest Gateway\n(WS/TCP, 16kHz PCM, 20ms)]
  B --> C[Preprocessing\nGain norm, VAD, framing]
  C --> D1[NISQA-s (ONNX)\nMOS + sub-dimensions]
  C --> D2[DNSMOS P.835 (ONNX)\nSIG/BAK/OVRL]
  B --> D3[Network Stats Collector\nWebRTC getStats / RTP QoS]
  D1 --> E[Advice Engine\nRules + thresholds + templates]
  D2 --> E
  D3 --> E
  E --> F[Realtime API (WS/REST)\nJSON metrics + advice]
  F --> G[Calibration UI\nGauges, targets, tips]

Latency target (end-to-end): ≤ 300 ms from audio arrival to updated advice.
Streaming cadence: 20 ms frames (50 fps) with 0.5–1.0 s analysis windows (50% overlap).

⸻

2) Core Objectives & Non-Goals

Objectives
	•	Realtime metrics: MOS, SIG/BAK/OVRL, Noisiness, Loudness, Discontinuity.
	•	Clear targets (e.g., MOS≥4.0, BAK≥3.8, loudness≈−20 dBFS).
	•	Actionable advice: “Lower input gain by ~5 dB”, “Enable noise suppression”, “Move mic closer”.
	•	Works anywhere: Browser (WebRTC), SIP (Asterisk ExternalMedia direction=read), or prerecorded WAV.
	•	Audible QA taps: Engineers can monitor the exact stream feeding the models.

Non-Goals (Phase-1)
	•	No TTS/Avatar, no translation pipeline, no mixing.
	•	No speaker personalization (beyond generic advice).

⸻

3) Tech Stack
	•	Backend / API: Python FastAPI + uvicorn, WebSocket for streaming PCM + REST for snapshots.
	•	Model Inference: ONNX Runtime (CPU), optional CUDA if available.
	•	Audio DSP: numpy, scipy, RNNoise (optional denoise), WebRTC-VAD.
	•	UI: React (or Streamlit for rapid iteration). Charts with Recharts or Plotly.
	•	Ingest:
	•	WebRTC (browser): MediaStream, PCM via WS to backend.
	•	Asterisk: ARI ExternalMedia (direction=read) → WS to backend.
	•	RTP/WAV: importers.
	•	Observability: Prometheus + Grafana, structured logs (JSON), OpenTelemetry traces.
	•	Packaging/Deploy: Docker Compose (api, models, ui, prom, grafana).

⸻

4) Data & Models

Audio Format
	•	PCM s16le, 16 kHz, mono, 20 ms frames (640 bytes).
	•	Backend re-frames into 0.5–1.0 s windows (hop 250–500 ms).

Models
	•	NISQA-s (online) → returns MOS + sub-dimensions (noise, loudness, coloration, discontinuity).
	•	DNSMOS P.835 → returns SIG (speech quality), BAK (background), OVRL (overall).
	•	Optional: Loudness estimation (LUFS proxy) for −20 dBFS target; RNNoise toggle for controlled denoise A/B.

⸻

5) APIs

5.1 WebSocket Ingest (binary)
	•	URL: wss://api.example.com/ingest
	•	Client → Server: 20 ms PCM binary frames, {"meta":…} JSON optional side-band (seq/ts).
	•	Server → Client: periodic JSON metrics/advice (every 250–500 ms).

Outbound message (server → client)

{
  "ts": 1739630112.204,
  "window_ms": 1000,
  "nisqa": {
    "mos": 3.86,
    "noisiness": 0.21,
    "loudness_dbfs": -18.7,
    "discontinuity": 0.05
  },
  "dnsmos": { "sig": 4.1, "bak": 3.5, "ovrl": 3.7 },
  "webrtc": { "rtt_ms": 42, "jitter_ms": 7, "loss_pct": 0.3 },
  "targets": { "mos": 4.0, "bak": 3.8, "loudness_dbfs": -20 },
  "advice": [
    "Reduce input gain by ~3–5 dB",
    "Enable noise suppression or move to quieter room"
  ],
  "confidence": 0.82
}

5.2 REST (snapshots)
	•	POST /analyze/wav — upload WAV → returns metrics/advice for QA.
	•	GET /session/:id/metrics — latest metrics for dashboards.
	•	GET /health — liveness/readiness.

5.3 Admin/Controls
	•	POST /session/:id/toggle_rnnoise
	•	POST /session/:id/targets → update target thresholds.
	•	GET /prometheus → metrics for scraping.

⸻

6) Advice Engine (Rules & Templates)

Inputs:
	•	NISQA-s: mos, noisiness, loudness_dbfs, discontinuity
	•	DNSMOS: sig, bak, ovrl
	•	Network: rtt_ms, jitter_ms, loss_pct

Targets (defaults):
	•	mos ≥ 4.0, ovrl ≥ 3.8, bak ≥ 3.8, loudness_dbfs ≈ −20 ± 3 dB, jitter_ms < 15, loss_pct < 1%.

Example rules (pseudo):

advice = []
if metrics.loudness_dbfs > -14:
    advice.append("Lower input gain by ~6 dB (target ~ -20 dBFS)")

if metrics.dnsmos.bak < 3.6:
    advice.append("Enable noise suppression (RNNoise/WebRTC-NS) and close nearby noise sources")

if metrics.webrtc.jitter_ms > 20:
    advice.append("Use wired network or reduce competing traffic; switch to 16k mono")

if metrics.nisqa.discontinuity > 0.12:
    advice.append("Check buffer underruns; increase jitter buffer by 20–40 ms")


⸻

7) UI/UX — Calibration Dashboard

Widgets:
	•	Gauges: MOS, OVRL, SIG, BAK (1–5).
	•	Bars: Noisiness (0–1), Loudness (dBFS), Discontinuity (0–1).
	•	Targets: dashed lines/markers, color bands (green/yellow/red).
	•	Advice panel: ranked hints with icons; “Apply Fix” toggles (RNNoise on/off).
	•	Network cards: RTT, Jitter, Loss (so the user knows אם זו בעיית רשת או אקוסטיקה).
	•	Live monitor: optional “Listen Tap” (engineer-only).

Refresh cadence: every 250–500 ms.

⸻

8) Detailed Pipeline

sequenceDiagram
  autonumber
  participant SRC as Source (Browser/SIP)
  participant ING as Ingest WS
  participant DSP as DSP/VAD
  participant NQ as NISQA-s (ONNX)
  participant DM as DNSMOS (ONNX)
  participant ADV as Advice Engine
  participant UI as UI (WS)

  SRC->>ING: PCM 20ms frames (16k mono)
  ING->>DSP: enqueue(frame)
  DSP->>NQ: windowed audio (1s, hop 0.5s)
  DSP->>DM: windowed audio (1s, hop 0.5s)
  NQ-->>ADV: MOS + sub-dims
  DM-->>ADV: SIG/BAK/OVRL
  ING-->>ADV: Net stats (rtt/jitter/loss)
  ADV-->>UI: JSON metrics + advice (250–500 ms)


⸻

9) Performance Budgets

Stage	Budget
Ingest → window buffer	≤ 10 ms
NISQA-s inference (1s)	≤ 60–90 ms (CPU)
DNSMOS inference (1s)	≤ 60–90 ms (CPU)
Advice + JSON render	≤ 10–20 ms
Total (95p)	≤ 300 ms

Throughput: ≥ 30 concurrent sessions (CPU-only VM, 8 vCPU) — scale horizontally.

⸻

10) Security & Privacy
	•	TLS for WS/REST.
	•	No content storage by default; optional 5–10 s rolling buffer for QA on admin-only endpoints.
	•	PII-free logs: only session IDs, metrics.
	•	RBAC for admin features (tap/record).

⸻

11) Observability
	•	Prometheus counters: sessions_active, inference_ms_nisqa_p95, inference_ms_dnsmos_p95, ws_backpressure_events, advice_issued_count{type=...}.
	•	Grafana dashboards: latency waterfall, advice distribution, pass-rate vs. targets.
	•	Log schema (JSON): ts, session_id, window, mos, sig, bak, ovrl, loudness_dbfs, jitter_ms, loss_pct, advice[].

⸻

12) Testing Strategy
	•	Unit: DSP framing, VAD gating, loudness calc, rule engine.
	•	Integration: end-to-end audio → metrics → advice; test WAVs with known ground truth.
	•	Load: 100 sessions of 1s windows; verify p95 < 300 ms.
	•	UX A/B: with/without RNNoise; verify improvements in BAK/OVRL.

⸻

13) Milestones & Deliverables

M1 — Foundations (Week 1–2)
	•	Dockerized FastAPI + WS ingest; framing; mock metrics → UI gauges.

M2 — Models Online (Week 3–4)
	•	NISQA-s & DNSMOS ONNX inference; JSON schema; initial advice rules.

M3 — UI & Advice (Week 5–6)
	•	Full dashboard, targets, color bands, tips; admin toggles; tap playback.

M4 — SIP/WebRTC Integration (Week 7–8)
	•	WebRTC getStats integration; Asterisk ExternalMedia(direction=read) adapter.

M5 — Perf/QA (Week 9–10)
	•	Prometheus/Grafana; load tests; acceptance criteria; docs.

⸻

14) Acceptance Criteria
	•	E2E latency ≤ 300 ms (p95) from audio to updated advice.
	•	Stable 50 fps ingest, no stalls (backpressure < 1% windows).
	•	Advice accuracy: when loudness>−14 dBFS → advice to lower gain appears within ≤ 1 s.
	•	DNSMOS BAK improves ≥ +0.5 when RNNoise enabled (on noisy sample set).

⸻

15) Example Code Sketches

WS Ingest (server side)

from fastapi import FastAPI, WebSocket
import asyncio, time
app = FastAPI()
sessions = {}

@app.websocket("/ingest")
async def ingest(ws: WebSocket):
  await ws.accept()
  sid = str(time.time())
  buf = bytearray()
  while True:
    frame = await ws.receive_bytes()         # 640B / 20ms
    buf.extend(frame)
    if len(buf) >= 16000*2*1:                # ~1s @ 16k mono s16
      window = bytes(buf[:32000]); del buf[:16000]  # 1s win, 0.5s hop
      # enqueue window to model workers...

Advice (very simplified)

def advise(m):
  tips = []
  if m["nisqa"]["loudness_dbfs"] > -14:
    tips.append("Lower input gain by ~6 dB (target ~ -20 dBFS)")
  if m["dnsmos"]["bak"] < 3.6:
    tips.append("Enable noise suppression (RNNoise/WebRTC-NS)")
  if m["webrtc"]["jitter_ms"] > 20:
    tips.append("Prefer wired network; close bandwidth-heavy apps")
  return tips[:3]


⸻

16) Integration Notes (Asterisk / SIP)
	•	Use ARI ExternalMedia (direction=read) per participant → WS to /ingest.
	•	Keep WS on LAN (or same region) to ensure < 20 ms ingest overhead.
	•	Enable Tap in backend to listen to the exact pre-model audio (engineer-only).

⸻

17) Future Roadmap (Post-MVP)
	•	Personalized guidance via small learned policy (supervised on historical sessions).
	•	Auto-calibration flows (wizard): step-by-step microphone check with goal gates.
	•	Multi-language UI, export PDF report of calibration session.
	•	Model fusion (weighted ensemble) for more robust MOS estimates.

⸻

Final Summary

This plan delivers a production-ready AI calibration assistant: low-latency ingest, robust open models (NISQA-s + DNSMOS), clear targets, actionable guidance, strong observability, and pluggable ingest (WebRTC/SIP). It integrates cleanly next to your Asterisk-based pipeline and gives teams immediate, measurable improvements in perceived audio quality.


