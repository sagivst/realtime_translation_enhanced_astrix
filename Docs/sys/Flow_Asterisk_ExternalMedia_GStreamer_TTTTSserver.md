

📌 Media Flow Diagram: Asterisk ↔ ExternalMedia ↔ GStreamer ↔ STTTTSserver

┌──────────────────────────┐
│        Asterisk PBX       │
│  (Call Channels 3333/4444)│
└──────────────┬───────────┘
               │
               │ RTP (20ms Media Frames)
               ▼
┌──────────────────────────┐
│       Stasis / ARI       │
│  (Controls Call Logic)   │
└──────────────┬───────────┘
               │ invokes
               ▼
┌──────────────────────────┐
│     ExternalMedia App    │
│ (Bridges Asterisk ↔ App) │
│ • Opens UDP ports        │
│ • Handles timestamps     │
│ • Manages seq numbers    │
└──────────────┬───────────┘
               │
               │ Raw RTP Stream
               ▼
┌──────────────────────────┐
│         GStreamer        │
│   Media Processing Pipe  │
│ Decode → Convert → Send  │
│   to AI → Receive back   │
└──────────────┬───────────┘
               │ PCM / JSON / WebSocket
               ▼
┌──────────────────────────┐
│       STTTTSserver       │
│ (AI Translation / Sync)  │
│   Deepgram / DeepL /     │
│      Azure TTS layer     │
└──────────────┬───────────┘
               │ PCM back
               ▼
┌──────────────────────────┐
│        GStreamer         │
│   Re-Encode + RTP Pack   │
└──────────────┬───────────┘
               │ RTP (20ms frames)
               ▼
┌──────────────────────────┐
│      ExternalMedia       │
│   Reinjection into Call  │
└──────────────┬───────────┘
               │
               ▼
┌──────────────────────────┐
│   Asterisk — Channel B   │
└──────────────────────────┘


⸻

🧩 Short Explanation of Each Component

1️⃣ Asterisk PBX
	•	Manages SIP channels (e.g., extensions 3333 and 4444).
	•	Does not process or modify media.
	•	Sends/receives raw RTP packets.

⸻

2️⃣ Stasis / ARI Layer
	•	Handles call logic:
	•	Answer
	•	Bridge
	•	Route traffic
	•	Launch ExternalMedia
	•	Does not touch media frames.

⸻

3️⃣ ExternalMedia Application

This is the key bridge between Asterisk and your translation engine.

It handles:
	•	Opening UDP ports
	•	Forwarding RTP frames out of Asterisk
	•	Receiving RTP back
	•	Preserving:
	•	Sequence Numbers
	•	RTP Timestamps
	•	20ms frame timing
	•	Reinjecting audio into the Asterisk channel

✔ ExternalMedia is inside Stasis, but it is NOT GStreamer.

⸻

4️⃣ GStreamer Pipeline

The media engine.

Handles:
	•	RTP → PCM decode
	•	Audio conversion/resampling
	•	Sending PCM to your STTTTSserver / AI layer
	•	Receiving translated PCM
	•	Re-encoding / repackaging RTP

✔ GStreamer has zero knowledge of ARI or Stasis.
It is purely audio/video processing.

⸻

5️⃣ STTTTSserver (AI Layer)

Your translation system.

Typical tasks:
	•	Speech-to-Text (Deepgram)
	•	Machine Translation (DeepL / Azure MT)
	•	Text-to-Speech (Azure TTS)
	•	Timing + Synchronization
	•	Audio mixing / channel control

Returns aligned PCM back to GStreamer.

⸻

6️⃣ GStreamer → ExternalMedia → Asterisk Channel B
	•	GStreamer re-encodes PCM → RTP
	•	Sends 20ms aligned frames back
	•	ExternalMedia injects them into the destination Asterisk channel
	•	Asterisk plays the translated audio to the remote participant

⸻

🎯 Summary Table

Component	Purpose	Uses ARI/Stasis?
Stasis / ARI	Call control logic	✔ Yes
ExternalMedia	RTP bridging + timing	✔ Yes
GStreamer	Media engine (decode/encode/transform)	❌ No
STTTTSserver	AI translation + sync	❌ No
