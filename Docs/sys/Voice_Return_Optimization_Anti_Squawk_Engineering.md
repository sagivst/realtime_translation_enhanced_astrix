
# 🔊 AI Voice Return Path Optimization and Anti-Squawk Engineering Guide

**Target Architecture:**  
ElevenLabs → AI Gateway (Node.js RTP Processor) → Asterisk ExternalMedia → SIP Endpoint  
**Objective:**  
Eliminate "squawk" and "metallic distortion" artifacts during TTS → RTP playback,  
ensure stable 16 kHz PCM16 streaming, and preserve human-like timbre.

---

## 🧭 1. Overview

This document provides a full technical plan for **stabilizing audio quality** on the return path  
from **TTS (ElevenLabs)** to **Asterisk endpoints**.  

It focuses on:
- Eliminating timing drift & frame misalignment
- Preventing compression artifacts and endian mismatch
- Ensuring consistent gain, tone, and codec parity across all nodes

---

## ⚙️ 2. Data Path Reference

```mermaid
flowchart LR
    TTS["TTS Engine (ElevenLabs)"]
    GIN["Gateway Ingest (PCM s16le 16kHz)"]
    PKT["Packetizer (20ms frames)"]
    RTP["RTP Socket (PT=96, ptime=20)"]
    AST["Asterisk ExternalMedia"]
    MIX["Bridge / Softmix"]
    SIP["SIP Endpoint Playback"]

    TTS --> GIN --> PKT --> RTP --> AST --> MIX --> SIP


⸻

🧩 3. Typical Root Causes of “Squawks”

Category	Root Cause	Symptom	Resolution
Resampling	22.05→16k linear conversion	Robotic, metallic sound	Use sinc-based HQ resample once only
Endian mismatch	Big→Little endian swap	Static / white noise	Confirm PCM16 LE at every hop
Frame misalignment	2×10ms vs 1×20ms	Regular “chirps” every 20ms	Enforce single 20ms (320 samples) framing
Timestamp drift	Wrong RTP increment	Random squeaks	Step +320 per frame (16kHz × 0.02s)
Gain overload	LUFS > −18	Crackle on vowels	Normalize −23±2 LUFS before RTP
Double transcoding	MP3→Opus→PCM	Hollow echo	Decode once to PCM s16le
Over-compression	limiter/AI enhancer active	sharp hiss on edges	disable in TTS API (stability < 0.8)


⸻

🧱 4. Standardized Audio Profile

Parameter	Value	Description
Sample rate	16,000 Hz	uniform through chain
Channels	Mono	no stereo mixdown
Bit depth	16-bit signed little-endian (s16le)	endian critical
Frame size	20 ms (320 samples)	sync with ExternalMedia
Payload Type	96 (dynamic)	per RFC 3551
RTP Map	a=rtpmap:96 L16/16000/1	must match gateway
Ptime	a=ptime:20	enforce 20 ms
Jitter Buffer	40–60 ms	adjustable dynamically


⸻

🎧 5. ElevenLabs Output Configuration

When using ElevenLabs Streaming API:
	•	Request PCM16 stream (content-type: audio/L16; rate=16000; channels=1)
	•	Disable enhancement filters:

{
  "stability": 0.75,
  "similarity_boost": 0.8,
  "use_speaker_boost": false
}


	•	Do not normalize externally; ElevenLabs already outputs near −22 LUFS.
	•	Decode directly to raw PCM buffer, no ffmpeg pipeline needed if already PCM.

⸻

🧰 6. Gateway Processing Flow

graph TD
  A["ElevenLabs Stream (PCM16)"] 
  B["Resample Check (ffmpeg/swr_convert if !=16kHz)"]
  C["Normalize Gain (LUFS -23 ±2)"]
  D["Frame Split (20ms = 320 samples)"]
  E["RTP Header Injection (PT=96, SSRC fixed)"]
  F["UDP Socket Send → Asterisk ExternalMedia"]

  A --> B --> C --> D --> E --> F


⸻

Example ffmpeg Validation Command

ffmpeg -f s16le -ar 16000 -ac 1 -i output.raw -af loudnorm=I=-23:TP=-2:LRA=7 -f null -

→ verifies loudness normalization; no resampling needed if already 16k.

⸻

🔢 7. RTP Transmission Parameters

Field	Value	Description
Timestamp increment	+320 per frame	16kHz × 0.02s
SSRC	Static per stream	prevents desync
Marker bit	Set only at start of speech	avoids PLC triggers
Sequence number	+1 per frame	standard RTP flow
Payload length	640 bytes	320 samples × 2 bytes
RTCP enabled	yes (5% interval)	for jitter/delay monitoring

Example SDP:

m=audio 5006 RTP/AVP 96
a=rtpmap:96 L16/16000/1
a=ptime:20
a=maxptime:20
a=sendonly


⸻

🧠 8. Node.js RTP Sender (Conceptual)

const dgram = require('dgram');
const socket = dgram.createSocket('udp4');

let seq = 0, ts = 0;
const SSRC = 0x12345678;

function sendFrame(frameBuffer) {
  const header = Buffer.alloc(12);
  header[0] = 0x80; // Version 2
  header[1] = 96;   // PT=96
  header.writeUInt16BE(seq++, 2);
  header.writeUInt32BE(ts, 4);
  header.writeUInt32BE(SSRC, 8);
  ts += 320;
  socket.send(Buffer.concat([header, frameBuffer]), 5006, '127.0.0.1');
}


⸻

🔍 9. Quality Verification Checklist

Checkpoint	Tool	Expected
RTP continuity	rtp set debug on in Asterisk	consistent 20ms packets
Wireshark RTP stream	Inspect timestamps	uniform 320-step TS
Audio LUFS	ffmpeg loudnorm	−23 ±2
Endian verification	hexdump	alternating low/high byte order
MOS / jitter	HOMER dashboard	MOS ≥ 4.0, jitter < 10 ms


⸻

🔬 10. Safe DSP Enhancements

Apply only non-destructive filters:
	•	DC Offset Removal: HPF at 30 Hz
	•	De-esser (optional): −1.5 dB @ 3.5–4 kHz
	•	No heavy compression or limiter
	•	Fade-in/out: 3–5 ms at frame joins to avoid clicks

⸻

🧭 11. Integration with Asterisk ExternalMedia

No dialplan changes required — use ARI API:

POST /ari/channels/externalMedia
{
  "app": "tts_bridge",
  "external_host": "127.0.0.1:5006",
  "format": "slin16",
  "direction": "write"
}

This channel feeds directly into the bridge mix-minus stream.

⸻

🧩 12. Diagnostic Flow (Monitoring + Feedback)

sequenceDiagram
  participant T as ElevenLabs
  participant G as Gateway
  participant A as Asterisk
  participant H as HOMER
  T->>G: PCM stream
  G->>A: RTP (PT=96, 20ms)
  A->>A: Mix-minus playback
  G-->>H: HEP JSON (LUFS, clipping, jitter)
  H-->>G: Alert: “High LUFS variance –3 dB correction”
  G->>G: Auto-adjust normalization

Optional feedback loop: HOMER sends webhook alerts to the Gateway for automatic LUFS/gain correction.

⸻

🧮 13. Troubleshooting Matrix

Symptom	Probable Cause	Fix
“Squawk” every 20ms	Frame mismatch (2×10ms join)	Reframe exact 20ms
Metallic voice	22kHz→16kHz linear resample	HQ resample or native 16kHz
Clipped peaks	Loudness > −18 LUFS	Normalize to −23
Random pops	No fade between frames	3–5 ms crossfade
Distortion after minutes	Timestamp drift	reset TS every 2–3 min or on silence
Hollow echo	Re-encode via Opus	Send PCM directly


⸻

🧠 14. Automated Correction Hooks (Optional)

When using Node.js Gateway with WebSocket control:

if (measuredLUFS > -18) gainAdjust(-3);
if (packetLoss > 0.5) increaseBuffer(10);
if (spectralIndex > 0.15) applyEQ(-1.5, 3500);

→ Simple adaptive correction logic based on HOMER metrics.

⸻

📈 15. Performance and Latency Metrics

Stage	Processing Time	Notes
ElevenLabs TTS	~350–500 ms	per sentence
Gateway Processing	~2–5 ms	framing + normalization
RTP Transmission	<15 ms	LAN conditions
Asterisk Mixing	<10 ms	internal softmix
Total (return)	<600 ms end-to-end	audible continuity preserved


⸻

🧭 16. Summary
	•	Maintain PCM16 LE 16kHz mono throughout the return path.
	•	Enforce 20 ms frame, +320 timestamp increment.
	•	Disable re-encoding and heavy DSP.
	•	Normalize LUFS before RTP transmission.
	•	Use HOMER/RTCP for real-time feedback and adaptive correction.

⸻

🔗 References
	•	ElevenLabs API Docs: https://api.elevenlabs.io/docs
	•	Asterisk ExternalMedia: https://wiki.asterisk.org/wiki/display/AST/Asterisk+18+ExternalMedia
	•	RTP RFC 3550 / L16 Payload: https://datatracker.ietf.org/doc/html/rfc3551
	•	ITU-T G.107 MOS Model: https://www.itu.int/rec/T-REC-G.107/en
	•	HOMER Monitoring Suite: https://www.sipcapture.org

⸻

✅ With this configuration, the return audio from ElevenLabs will remain fully intelligible,
free from squawks and distortions, while maintaining sub-600 ms real-time latency across the bilingual conversation pipeline.
