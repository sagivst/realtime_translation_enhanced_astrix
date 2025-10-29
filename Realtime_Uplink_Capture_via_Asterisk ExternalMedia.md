
# Realtime Uplink Capture via Asterisk ExternalMedia (direction=read)

## 🎯 Objective
Capture a **clean, continuous microphone stream** (uplink only) from any participant in real time,  
directly from Asterisk, with minimal latency (~20 ms frame pacing).

This configuration uses **Asterisk’s built-in `chan_externalmedia`** with:

direction=read

so only the *participant’s microphone audio* (TX) is sent to your Orchestrator —  
no mixed playback or echo-cancelled data.

---

## ⚙️ 1. Asterisk Dialplan Configuration

```conf
[ai-uplink]
exten => 6001,1,NoOp(Uplink capture for participant)
 same => n,ExternalMedia(
    format=slin16,                  ; 16-bit PCM
    direction=read,                 ; TX (mic) only
    transport=websocket,            ; duplex over WS
    remote_host=orchestrator.local, ; your AI server
    remote_port=5050,               ; ingest port
    buffer_ms=20                    ; frame pacing
 )
 same => n,ConfBridge(1234)         ; bridge_softmix still handles others
 same => n,Hangup()

Parameter details

Parameter	Description	Recommended
format	Audio format	slin16 (16-bit PCM)
direction	Direction of flow	read (uplink only)
transport	Data link	websocket (TCP full-duplex)
buffer_ms	Frame size	20 for 50 fps cadence
remote_host / remote_port	Orchestrator endpoint	wss://… or LAN IP
codec_passthrough	Optional	no (ensure slin16 consistency)

With direction=read, Asterisk sends a 20 ms frame every tick,
but does not expect any return frame — it is one-way (uplink only).

⸻

📦 2. Data Stream Specification

Each 20 ms packet contains:
	•	Raw PCM (s16le) – 16 kHz, mono
	•	Fixed payload: 640 bytes per frame
	•	Cadence: exactly 50 frames/second

Binary frame structure:

[PCM 640 bytes]

Optionally, you can prepend your own metadata:

{"seq":184225,"ts_mono_ms":1739630112.204}


⸻

🔌 3. Orchestrator Ingest (Receiver Side)

Example (Python/async WebSocket):

import asyncio, websockets, sounddevice as sd

async def uplink_receiver():
    async with websockets.connect("ws://0.0.0.0:5050") as ws:
        samplerate = 16000
        with sd.OutputStream(samplerate=samplerate, channels=1, dtype='int16') as player:
            seq = 0
            while True:
                pcm = await ws.recv()   # 640-byte PCM frame
                seq += 1
                # immediate handoff: fan-out to Deepgram, Hume, etc.
                process_frame(seq, pcm)
                player.write(pcm)       # optional: hear the raw uplink

process_frame() can forward each frame in parallel to:
	•	Deepgram ASR (WebSocket) – binary PCM feed
	•	Hume EVI (WebSocket) – binary PCM + optional text hints
	•	Local storage / VAD / Diarization – as needed

⸻

🧠 4. Verification (Tap-listen)

Because direction=read is uplink only, you can safely monitor it in real time
without feedback or echo.
Attach a small Audio Tap module to play or record the same PCM frames (as in your QA spec):

tap_q.feed(seq, pcm)  # enqueue for monitoring

Playback is perfectly natural if frames are streamed continuously at 20 ms cadence.

⸻

📊 5. Performance & Timing

Stage	Expected latency	Notes
Asterisk capture (frame ready)	0–2 ms	internal buffer only
ExternalMedia frame send	1–3 ms	WebSocket/TCP overhead
Orchestrator receive → dispatch	2–5 ms	depends on LAN
Total uplink delay	~8–10 ms typical	well below 20 ms tick

Clock source:
Asterisk’s internal scheduler (20 ms).
Your Orchestrator must stay frame-synchronous — never await downstream consumers.

⸻

🧩 6. Recommended use cases

Purpose	Why use direction=read
ASR / Emotion Analysis	Provides the cleanest microphone feed
Training datasets	Single-speaker uplink, no mix-minus artifacts
Live QA / Monitoring	Zero echo risk; easy playback
Low-latency AI assist	Ideal for <200 ms pipeline response


⸻

✅ 7. Key Advantages
	•	Direct microphone capture (no mix, no ducking)
	•	No round-trip blocking — one-way uplink only
	•	Stable 20 ms cadence managed by Asterisk
	•	Simple configuration (no ARI scripting needed)
	•	Works seamlessly with your Orchestrator fan-out layer

⸻

🧭 8. Comparison Summary

Mode	Direction	Data	Latency	Use Case
direction=both	TX+RX	Full duplex	~20–25 ms	translation loop
direction=read	TX only (mic)	uplink stream	~10 ms	ingestion, analysis
direction=write	RX only (speaker)	playback only	~10 ms	testing output


⸻

🧩 9. Testing / QA checklist
	•	Confirm ExternalMedia socket opens on Asterisk start (netstat or log).
	•	Receive 50 frames/sec (640 bytes each).
	•	No “Underflow/Overrun” warnings in Asterisk CLI.
	•	Measured frame interval: 20 ± 2 ms.
	•	Verify same PCM content on audio tap and ASR feed.
	•	Optional: record 5 s and play back concatenated — should sound natural.

⸻

✅ Summary

Using ExternalMedia(format=slin16, direction=read) gives you a dedicated uplink-only PCM stream at 20 ms intervals, ideal for ASR, emotion, and real-time analytics.
This method provides the cleanest signal path from the participant’s microphone with <10 ms ingest latency, and integrates natively with your existing Orchestrator’s fan-out design.



