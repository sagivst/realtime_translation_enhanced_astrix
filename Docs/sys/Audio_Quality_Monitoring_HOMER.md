

🎧 Audio Quality Monitoring Framework — Integration with HOMER API

Author:

ProFacer / TrueLead Audio R&D
Document Type: Technical Implementation Specification
Version: 1.0
Scope: End-to-end real-time audio quality measurement & calibration across AI voice translation pipeline (T0–T9)

⸻

1. 🎯 Purpose

This document defines the full architecture, API integration, data schema, and QA targets for an Audio Quality Monitoring System that interfaces with HOMER (HEP/RTCP) to continuously monitor, compare, and visualize real-time voice fidelity across all stages of the system.

⸻

2. 🧩 Core Objective

Ensure that at every audio handoff — from microphone input through AI translation layers to the final playback —
sound quality metrics remain within optimal thresholds.

⸻

3. ⚙️ Monitored Pipeline Stages

Stage	Description	Direction
T0	Microphone → Gateway (capture)	Uplink
T1	Gateway → ASR (Deepgram)	Uplink
T6	TTS (ElevenLabs) → Gateway	Downlink
T7	Gateway → Latency Sync Buffer	Downlink
T8	Buffer → Asterisk Bridge	Downlink
T9	Bridge → Endpoints (SIP/WebRTC)	Playback


⸻

4. 🧱 Architecture Overview

graph TD
  subgraph AI-Voice Pipeline
    T0[Mic Input<br/>LUFS/SNR/Noise] --> T1[Gateway Tx<br/>RTP/Jitter/Loss]
    T1 --> T6[TTS Return<br/>LUFS/Spectral/Clicks]
    T6 --> T7[Latency Buffer<br/>Drift/THD/Sync]
    T7 --> T8[Asterisk Bridge<br/>ptime/TS/LUFS Δ]
    T8 --> T9[Endpoints<br/>MOS/Jitter/Echo]
  end

  HOMER[(HOMER DB + API)] --- QA[QA Dashboard<br/>Grafana/Custom UI]
  Gateway -- JSON metrics --> HOMER
  Asterisk -- RTCP HEP --> HOMER
  AI Services -- REST Telemetry --> Gateway


⸻

5. 🔗 HOMER Integration

5.1 API & Ingestion

Use HOMER v7+ HEP JSON ingestion endpoint for custom metric frames.

Endpoint:

POST /api/v3/metrics
Content-Type: application/json
Authorization: Bearer <token>

Payload Example:

{
  "CorrelationID": "session-7000-7001",
  "Type": "AudioMetrics",
  "Timestamp": "2025-11-12T10:32:45Z",
  "Stage": "T6",
  "Metrics": {
    "LUFS": -23.1,
    "Peak": -1.9,
    "SpectralFlatness": 0.15,
    "HarshnessIndex": 0.25,
    "THD": 0.4,
    "Jitter": 4.2,
    "Loss": 0.1,
    "MOS": 4.3
  },
  "Targets": {
    "LUFS": [-25, -21],
    "Jitter": [0, 15],
    "Loss": [0, 0.2],
    "MOS": [4.0, 5.0]
  },
  "Status": "GREEN"
}


⸻

6. 📊 Core Metrics Monitored per Stage

Metric	Unit	Description	Ideal Range	Collected By
LUFS	dB	Loudness normalization	−23 ± 2	Gateway DSP
RMS	dBFS	Average power	−25 to −18	Gateway DSP
Peak	dBFS	Max amplitude	≤ −2	Gateway
SNR	dB	Signal-to-noise ratio	≥ 30	Gateway
Jitter	ms	Variation in RTP arrival time	< 15	Asterisk / HOMER
Packet Loss	%	Lost RTP packets	< 0.2	HOMER
MOS	1–5	Subjective quality estimate	≥ 4	HOMER (RTCP-XR)
THD+N	%	Harmonic distortion + noise	< 0.5	Gateway DSP
Spectral Flatness	0–1	Timbre / tonal balance	0.1–0.25	DSP module
Harshness Index	0–1	Excessive energy @ 3–6kHz	< 0.3	Gateway
Echo Return Loss (ERL)	dB	Echo suppression	≥ 25	Endpoint / Bridge
RTT	ms	Round-trip delay	< 250	HOMER
LUFS Δ	dB	Loudness mismatch between stages	≤ 1	QA Module


⸻

7. 🧠 Processing Flow
	1.	Capture
	•	Each Gateway instance probes LUFS, THD, SNR per 1-second window.
	•	Results appended to metric buffer (rolling 10s window).
	2.	Aggregation
	•	Gateway aggregates and pushes JSON metrics to HOMER every 5 seconds.
	•	CorrelationID links all stages of one translated session.
	3.	Normalization
	•	Each metric compared to its “Target Range”.
	•	Result: GREEN, AMBER, or RED.
	4.	Visualization
	•	Dashboard UI shows a 9-node chain (T0–T9).
	•	Each node’s color = current quality state.
	•	Hover shows LUFS, Jitter, THD, MOS, etc.

⸻

8. 🧩 QA Dashboard Structure

Section	View	Description
Overview	T0–T9 Map	Real-time status (color-coded)
Detail View	Per Stage Graph	LUFS, Jitter, Loss, MOS trends
Comparative	Before/After Plot	T0 vs T6 loudness + T8 vs T9 MOS
Alerts	Live Feed	Deviation > 20% triggers alert via WebSocket
History	24h Trend	CSV export / analytics query


⸻

9. 🚦 Color Coding Rules

State	Condition	Meaning
🟢 GREEN	Within ±10% of target	Optimal
🟡 AMBER	10–20% deviation	Monitor / Adjust
🔴 RED	>20% deviation	Immediate attention


⸻

10. ⚙️ Development Tasks & API Responsibilities

Phase	Component	Description
Phase 1	Gateway DSP Module	Implement audio probes (LUFS, RMS, THD, Flatness) and JSON push
	HOMER API Integration	Authenticate and post metrics
Phase 2	QA Dashboard	Build web panel with live API fetch, color map, and alerts
	Metric Normalization	Compare metrics vs target table
Phase 3	Correlation Engine	Merge HOMER + AI telemetry + RTP data via CorrelationID
	Auto-calibration hooks	Adjust gateway gain, EQ, buffer dynamically (future)


⸻

11. 🔐 Security / Auth
	•	Use HOMER API tokens (Bearer auth).
	•	All requests over HTTPS (TLS 1.2+).
	•	Optional mTLS between Gateway and HOMER.

⸻

12. 🧭 Deployment Overview

flowchart LR
  Mic --> G1[Gateway DSP Probe]
  G1 -->|JSON Metrics| HOMER
  HOMER -->|API Query| Dashboard
  Asterisk -->|RTCP XR| HOMER
  Dashboard -->|WebSocket Alerts| OpsTeam


⸻

13. 🧰 Recommended Tech Stack

Layer	Tech
Gateway DSP	Node.js / Python (pyloudnorm, librosa, numpy)
HOMER API	v7+ HEP/REST
Dashboard	Grafana or Custom React UI
DB	PostgreSQL (HOMER backend)
Auth	API token or OAuth2
Visualization	WebSocket for live updates


⸻

14. ✅ Expected Outcome
	•	Unified QA monitoring across all real-time voice translation stages.
	•	Immediate detection of degraded audio segments.
	•	Ability to correlate network QoS with acoustic fidelity.
	•	Foundation for future auto-calibration (gain/EQ/buffer).
