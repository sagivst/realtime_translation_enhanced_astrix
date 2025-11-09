


🎧 Asterisk (PBX) ↔ Open-Source Gateway (Node.js) Integration Guide

⸻

🎯 Purpose of This Layer

The purpose of this layer is to allow Asterisk to stream the raw audio (RTP) from each extension
to the Gateway, and to receive translated or processed audio back —
in real time, using 20 ms PCM 16-bit frames.

This connection is the critical bottleneck of the entire system.
It’s also where many developers confuse “call control” (signaling) with “media flow” (audio transport).
This document explains how to connect them properly — stably, efficiently, and with negligible latency.

⸻

🧱 Connection Components (Asterisk ↔ Gateway)

Component	Role
1️⃣ ExternalMedia Channel (in Asterisk)	Creates a bidirectional RTP socket that sends and receives audio.
2️⃣ ARI (Asterisk REST Interface)	Allows creating and managing ExternalMedia channels via REST API rather than dialplan.
3️⃣ Node.js Gateway	Listens on the defined UDP ports, receives RTP packets, processes them, and sends RTP back to Asterisk.


⸻

⚙️ Configuration Steps

⸻

🪜 Step 1 — Enable ARI in Asterisk

Edit /etc/asterisk/ari.conf:

[general]
enabled = yes
pretty = yes
allowed_origins = *
username = admin
password = admin

And /etc/asterisk/http.conf:

[general]
enabled=yes
bindaddr=0.0.0.0
bindport=8088

This enables creation of ExternalMedia channels through REST (no dialplan editing required).

⸻

🪜 Step 2 — Create an ExternalMedia Channel per Extension

You can use an API call via ARI (e.g., Postman, curl, or directly from the Gateway).

For extension 7777 (English speaker):

POST /ari/channels/externalMedia
{
  "app": "ai_bridge",
  "external_host": "127.0.0.1:5000",
  "format": "slin16",
  "direction": "both",
  "encapsulation": "none"
}

For extension 8888 (French speaker):

POST /ari/channels/externalMedia
{
  "app": "ai_bridge",
  "external_host": "127.0.0.1:5001",
  "format": "slin16",
  "direction": "both",
  "encapsulation": "none"
}

📌 What happens here:
	•	Each ExternalMedia channel sends the microphone stream from its extension to 127.0.0.1 (your Gateway).
	•	At the same time, it expects a return audio stream (the translated or processed voice).

⸻

🪜 Step 3 — Listen on the Gateway

In the Node.js Gateway (from the open-source project), define:
	•	A UDP listener on port 5000 (for extension 7777)
	•	A UDP listener on port 5001 (for extension 8888)

Each listener:
	•	Receives 20 ms RTP frames from Asterisk,
	•	Sends them to your Unified AI Translation Server,
	•	And returns the translated PCM stream back to the same ExternalMedia channel.

⸻

🪜 Step 4 — Attach Channels to a Bridge

In Asterisk, create a single Bridge that includes:
	•	Both SIP participants (7777 and 8888), and
	•	Both ExternalMedia channels.

Resulting structure:

Bridge
 ├── SIP/7777
 ├── SIP/8888
 ├── ExternalMedia/7777
 └── ExternalMedia/8888

Asterisk automatically performs mix-minus,
so each participant hears everyone except their own microphone stream.

⸻

🪜 Step 5 — Verify the Media Flow

Each participant should hear the translated audio coming from the Gateway.
You can test this using:

rtp set debug on

in the Asterisk CLI,
or by checking with Wireshark to ensure that RTP packets are transmitted and received correctly
(e.g., 5000 ↔ 7777, 5001 ↔ 8888).

⸻

🧩 Golden Rule
	•	For Asterisk, the only job is to send and receive audio through a given IP and port.
	•	For the Gateway, the only job is to listen, process, and send audio back.

All processing, translation, or AI integration happens inside the Gateway —
without changing or reconfiguring Asterisk at all.

⸻

🧭 Final Outcome

✅ No need to add or modify Asterisk modules.
✅ No dependency on AI services within the PBX.
✅ The Gateway is the only integration point between Asterisk and AI.
✅ Each new call automatically spawns two ExternalMedia channels (one per direction).
✅ The entire system operates in real time, with an end-to-end latency of ~100–120 ms.
