
# Personalized Cross-Lingual Voice: From Sales Call Recordings → Streaming Full-Duplex Output

**Scope**  
This document covers only:
1) Training an agent-specific voice/style from **real sales call recordings** (dual-channel).  
2) Low-latency **streaming synthesis** of translated (or generated) text in that agent’s voice, with **full-duplex** audio so the remote party hears responses while natural overlap is allowed.

**Latency Target**: ≤ **900 ms** end-to-end (speak→hear).

**Single, opinionated technology choices** (replaceable later if needed):
- **Transcripts & alignment**: WhisperX (diarization + word alignment)  
- **Speaker embedding**: SpeechBrain **ECAPA-TDNN**  
- **Prosody/style embedding**: **GST-Tacotron** (Global Style Tokens)  
- **Multilingual TTS** (open-source, controllable): **XTTS v2** (inference server)  
- **Front-end DSP** (optional client): WebRTC AEC3 + RNNoise (for duplex echo safety)  

> We intentionally pick one stack for clarity and reproducibility.

---

## 1) Data Ingestion from Sales Calls

**Input recordings**  
- **Dual-channel WAV** (preferred): Agent on channel 0, Customer on channel 1  
- 16 kHz, mono per channel, 16-bit PCM  
- 15–60 minutes per agent (more is better for style fidelity)  

**Pre-processing steps**
1. **Channel isolation**  
   - Split into `agent.wav` and `customer.wav`.  
2. **Denoise + dereverb**  
   - RNNoise (light denoise), keep speech natural.  
3. **ASR + alignment** (offline, batch)  
   - WhisperX: produce word-aligned transcript & timestamps.  
4. **Prosody segmentation**  
   - Compute F0 (pitch), energy, pause durations per utterance.  
5. **Filtering**  
   - Drop segments with SNR < 10 dB, clips < 500 ms, or overlapped speech (for training).  
6. **Metadata** (per segment)  
   ```json
   {
     "agent_id": "A123",
     "wav": "agent_ch0_000123.wav",
     "start": 12.53, "end": 14.91,
     "text": "Let me check the availability now.",
     "snr_db": 18.2, "f0_mean": 124.7, "energy": 0.63
   }


⸻

2) Voice & Style Representation (Embeddings)

We learn two independent representations from the agent’s clean segments:

2.1 Speaker Embedding (Identity)
	•	Model: ECAPA-TDNN (SpeechBrain) → 192–256D vector
	•	Trained objective: speaker verification; robust to content/noise
	•	Output: speaker_embedding averaged across agent’s best segments (top 30–60 s by SNR)

2.2 Prosody / Style Embedding (How they speak)
	•	Model: GST-Tacotron (Global Style Tokens) encoder
	•	Extract style tokens capturing rhythm, intonation, emphasis
	•	Aggregate: mean-pool style tokens over curated set (2–5 minutes diverse emotion)

Result per agent:

{
  "agent_id": "A123",
  "speaker_embedding": [0.031, -0.117, ...],
  "style_embedding":   [0.402,  0.055, ...],
  "stats": { "f0_mean": 125.1, "speaking_rate_spm": 190, "pause_med_ms": 180 }
}


⸻

3) Multilingual Synthesis Model (XTTS v2)

We use XTTS v2 because:
	•	Supports cross-lingual cloning (speak any target language in the agent’s voice).
	•	Accepts speaker embeddings (identity) and style control (prosody).
	•	Provides streaming frame generation (mel→vocoder) to start playback quickly.

3.1 Light Adaptation (Optional but recommended)
	•	Adapter fine-tune (few thousand steps) using agent segments + transcripts (any language)
	•	Goal: tighten timbre similarity and stabilize prosody with limited data (15–60 min)
	•	Freeze core weights, train small adapters for robustness and fast convergence

3.2 Inference Inputs
	•	text (already translated or generated)
	•	speaker_embedding (agent)
	•	style_embedding or prosody controls (emotion="confident", speed=0.95)
	•	language="en" | "he" | ... (phoneme frontend handles target language)

⸻

4) Streaming & Full-Duplex Playback

Goal: while one side is still speaking, the other can already hear the stream of synthesized audio.
We focus only on synthesis & playback (no larger system wiring).

4.1 Streaming Synthesis
	•	Generate mel frames in ~10–20 ms hops; vocode to PCM immediately
	•	Emit PCM chunks (e.g., 20–40 ms per chunk) over a streaming socket
	•	Start playback after ~120–180 ms buffer to prevent underruns

4.2 Duplex Echo Safety (client DSP)
	•	WebRTC AEC3 + RNNoise on the capture path
	•	Do not mute playback when local talk is detected; instead apply ducking (lower playback 6–9 dB)
	•	Maintain shared AudioContext; AEC needs echo reference from the same graph

4.3 Overlap-aware Volume Automation
	•	Voice activity (local mic energy) gates a smooth duck:
	•	When local speech starts: ramp playback gain → 0.3 in 50 ms
	•	After 300 ms of local silence: ramp back to 1.0 in 100–150 ms
	•	This preserves natural overlap without feedback or “walkie-talkie” feeling

⸻

5) Latency Budget (≤ 900 ms end-to-end)

Stage	Target	Notes
Text availability	—	(text is ready from upstream)
Synthesis queue + first mel	120–150 ms	XTTS v2 inference warm
Vocoder start + first PCM	80–120 ms	HiFi-GAN or BigVGAN optimized
Initial playback buffer	120–180 ms	Jitter safety
Network jitter (one way)	30–70 ms	Regional
Total to ears	~350–620 ms	Leaves headroom for upstream ASR/MT if present

If upstream ASR/MT adds 250–300 ms, overall still < 900 ms.

⸻

6) Training Pipeline — End to End

flowchart TD
  A[Dual-Channel Sales Calls] --> B[Channel Split<br/>(Agent vs Customer)]
  B --> C[Denoise & Dereverb]
  C --> D[ASR + Alignment (WhisperX)]
  D --> E[Quality Filter<br/>(SNR, non-overlap)]
  E --> F1[Speaker Embedding<br/>(ECAPA-TDNN)]
  E --> F2[Prosody Embedding<br/>(GST-Tacotron)]
  F1 --> G[Aggregate Agent Profile]
  F2 --> G
  G --> H[Adapter Fine-Tune (XTTS v2)<br/>(optional)]
  H --> I[Agent Voice Package<br/>(speaker_emb, style_emb, adapters)]

Output artifact per agent
	•	speaker_embedding.bin
	•	style_embedding.bin
	•	xtts_adapter.pt (if fine-tuned)
	•	profile.json (prosody stats & defaults)

⸻

7) Runtime Streaming (Synthesis Only)

sequenceDiagram
  participant T as Text Source
  participant S as XTTS v2 Synth
  participant V as Vocoder
  participant N as Stream Socket
  participant P as Player (Remote Side)

  T->>S: text + speaker_emb + style + language
  S->>V: mel frames (streamed)
  V->>N: PCM chunks (20–40 ms)
  N->>P: PCM chunks (low jitter)
  Note over P: Buffer 120–180 ms, then play

Full-duplex note: the opposite direction runs in parallel, using the other party’s own voice package if needed.

⸻

8) Developer Notes (Minimal Interfaces)

8.1 Training Artifacts

/artifacts/agents/A123/
  speaker_embedding.bin
  style_embedding.bin
  xtts_adapter.pt
  profile.json

8.2 Synthesis Request (gRPC/HTTP conceptual)

POST /synthesize/stream
{
  "agent_id": "A123",
  "text": "Let me check availability for tomorrow morning.",
  "language": "en",
  "emotion": "confident",
  "rate": 0.95,
  "pitch_shift": -1
}

Response: binary PCM chunks (16 kHz mono) in a streaming channel.

8.3 Client Playback (WebAudio sketch)

// ducking controller
function setGain(g) {
  gainNode.gain.linearRampToValueAtTime(g, ac.currentTime + 0.05);
}
// on local speech start: setGain(0.3)
// on 300 ms silence: setGain(1.0)


⸻

9) Quality Assurance
	•	ABX test (agent original vs. synthesized) for timbre similarity.
	•	Prosody match score: DTW over pitch/energy contours (lower = better).
	•	MOS (Mean Opinion Score) with 10–20 raters > 4.2 target.
	•	Cross-lingual consistency: same emotion/rate across languages within ±10%.

⸻

10) Privacy & Compliance
	•	Use only the agent channel for model outputs; customer channel is never reproduced.
	•	Delete raw customer audio after diarization; keep only aggregated features.
	•	Encrypt artifacts (AES-256 at rest, TLS 1.3 in transit).
	•	Per-agent consent and revocation (“delete my voice package”).

⸻

11) Failure Modes & Safeguards
	•	Noisy training data → weak timbre: automatically reject segments with SNR < 10 dB, retrain.
	•	Prosody instability (staccato speech): clamp rate to 0.9–1.1, apply silence smoothing 50–80 ms.
	•	Latency spikes: pre-warm XTTS session; pin vocoder to GPU; raise initial buffer to 200 ms in poor networks.

⸻

12) What We Deliberately Omit Here
	•	Upstream ASR/MT and any broader conferencing/routing logic.
	•	Multi-participant mixing (beyond duplex playback).
	•	Commercial API wiring (ElevenLabs, etc.) — we stick to XTTS v2 for control.

⸻

13) Summary

This document details a focused pipeline:
	•	Learn an agent’s identity + style from real sales recordings.
	•	Produce cross-lingual, streaming speech in that agent’s voice.
	•	Preserve natural full-duplex conversation with echo safety and ducking.
	•	Meet ≤ 900 ms end-to-end latency targets with room to spare.

The outcome is an avatar-quality voice that sounds like the agent,
in any language, and plays back live while conversation overlaps remain natural.

