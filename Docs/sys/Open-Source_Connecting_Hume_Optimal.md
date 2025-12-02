

Technical Integration Document

Optimal Open-Source Method for Connecting Your AI Server to Hume AI (Emotion & Prosody API)

Version: 1.0

Audience: Backend Developers, AI Engineers

Scope: Real-time emotion/prosody analysis via Hume Streams API.

⸻

1. Overview

Hume AI provides Emotion API and Prosody API that work in real time via:
	•	WebSocket Streams API ← BEST for speed + accuracy
	•	REST API for batch processing ← slower, not recommended for live systems

For maximum speed, lowest latency, and highest accuracy,
the optimal open-source integration approach is:

👉 Hume Streams API over WebSockets + PCM 16 kHz input

And the best open-source library to use:

👉 Official Hume SDKs (Node or Python)

Fully open-source and optimized, with streaming support.

⸻

2. The Optimal Transport Method

⭐ WebSocket Streaming → Hume Streams API

This provides:
	•	Real-time processing
	•	Frame-by-frame analysis
	•	Lower latency vs REST
	•	Improved consistency of emotion/prosody detection
	•	Full-duplex communication
	•	Stable performance for continuous AI pipelines

REST ≈ slow, batch-only
WebSockets ≈ optimal for your AI server

⸻

3. Ideal Audio Format

Hume supports multiple formats, but the best performance comes from:

Parameter	Value
Encoding	PCM 16-bit, S16LE
Channels	Mono
Sample Rate	16,000 Hz
Chunk Size	20–50 ms chunks

This perfectly matches your existing STT pipeline (Deepgram → PCM16).

⸻

4. Recommended Open-Source Libraries

Hume publishes official SDKs:

✔ Node.js SDK (Open Source)

https://github.com/humeai/hume/tree/main/sdk/js

✔ Python SDK (Open Source)

https://github.com/humeai/hume/tree/main/sdk/python

Why use these?
	•	Built-in WebSocket client
	•	Supports Prosody + Language models
	•	Automatic reconnection
	•	Low overhead → high throughput
	•	Perfect for event-streaming architectures
	•	Production-grade error handling

Using these SDKs is significantly faster and more reliable than hand-writing your own WS client.

⸻

5. Node.js Example (Hume Streams API)

import { HumeClient, HumeStreamClient } from "hume";

const client = new HumeClient({ apiKey: process.env.HUME_API_KEY });
const streamClient = new HumeStreamClient({ apiKey: process.env.HUME_API_KEY });

const ws = await streamClient.connect({
  models: { prosody: {} },
});

ws.on("message", (msg) => {
  console.log("Emotion/Prosody:", msg);
});

// Send PCM16 chunks (20ms @ 16 kHz)
function sendPCM(chunk) {
  ws.sendBinary(chunk);
}


⸻

6. Python Example (Hume Streams API)

from hume import HumeStreamClient
from hume.models.config import ProsodyConfig

client = HumeStreamClient(api_key="YOUR_KEY")
config = ProsodyConfig()

with client.connect([config]) as ws:
    # ws.send_audio accepts PCM16 bytes
    ws.send_audio(chunk)  
    for msg in ws:
        print("Emotion/Prosody:", msg)


⸻

7. Pipeline Architecture (Recommended)

Audio Input → PCM 16kHz
      ↓
AI Server (Python/Node)
      ↓
WebSocket Stream → Hume Streams API
      ↓
Emotion / Prosody JSON scores (realtime)
      ↓
Your AI logic (routing / scoring / translation)

This ensures:
	•	lowest latency
	•	maximum emotional accuracy
	•	smooth integration with STT/TTS pipelines

⸻

8. Best Practices for Maximum Accuracy

✔ 1. Use 16 kHz PCM

Other formats add decode overhead or degrade emotion cues.

✔ 2. Keep frames small (20–40 ms)

Hume’s emotion model performs better with small consistent chunks.

✔ 3. Normalize volume

Hume responds better to normalized audio (-3 dBFS).

✔ 4. Avoid compressed codecs (Opus/AAC)

Compression reduces emotional cues.

✔ 5. Keep WebSocket persistent

Avoid reopening for every message (adds latency).

✔ 6. Use Hume’s Prosody model for emotion over time

Deep integration with your translation pipeline.

⸻

9. When NOT to Use REST

Avoid REST unless:
	•	You’re analyzing full recordings
	•	You don’t need real-time output
	•	Latency is not critical

For your use-case (real-time AI conversation):

👉 Always use Hume Streams API

⸻

10. Final Recommendation

⭐ Use Hume’s official open-source SDK + WebSocket Streams + PCM 16kHz

for the fastest, most stable, and most accurate integration with Hume AI.

This is the industry-standard approach for emotional analysis in:
	•	real-time translation
	•	conversational AI
	•	telephony systems
	•	multi-model pipelines (Deepgram → DeepL → ElevenLabs → Hume)
