
📄 Development Specification – Bidirectional Audio Translation System (Extensions 7777 ↔ 8888)

Based on Asterisk ExternalMedia + GStreamer + Custom conf-server

⸻


1. Overview

This document describes the architecture, components, configuration, and development guidelines for building a real-time bidirectional audio processing system between two SIP extensions (7777 and 8888). The goal is:
	1.	Capture microphone audio from each extension
	2.	Send audio to an external processing server (conf-server)
	3.	Receive processed audio
	4.	Inject it back into the opposite extension’s playback channel
	5.	Provide a Monitoring Web UI for listening to PCM streams in real time
	6.	In Phase 2, replace the simple PCM forwarding with full live translation (STT → Translate → TTS)

The system uses:
	•	Asterisk ExternalMedia (official built-in)
	•	GStreamer pipelines (stable, low-latency PCM transport)
	•	Custom conf-server (Node.js recommended)

This architecture is the shortest path to a production-grade, ultra-low-latency real-time audio translation bridge.

⸻

2. Chosen Open-Source Foundation

2.1 Asterisk ExternalMedia (Official)

Repository:
https://github.com/asterisk/asterisk-external-media

Reasons for choosing:
	•	Most stable and widely-used method of injecting/extracting audio in Asterisk
	•	PCM-based 20ms frames → perfect for STT/NLP/translation engines
	•	GStreamer example already includes a full duplex echo pipeline
	•	Requires minimal modifications
	•	Extremely low latency
	•	No hacks, no chan_snoop, no dialplan tricks

⸻

3. System Architecture

Below is the full architecture diagram (SVG):

👉 Download SVG:
sandbox:/mnt/data/architecture.svg

⸻

3.1 Architecture Explanation

Audio Path – Phase 1 (PCM Cross-Routing)

Extension 7777 mic → Asterisk → GStreamer → conf-server → GStreamer → Asterisk → Extension 8888 speaker
Extension 8888 mic → Asterisk → GStreamer → conf-server → GStreamer → Asterisk → Extension 7777 speaker

Audio Path – Phase 2 (Translation Mode)

mic PCM → STT → Translation → TTS → PCM → target extension

Monitoring Path

conf-server → WebSocket PCM → Browser Monitoring Page


⸻

4. Asterisk Configuration

Below are full, ready-to-use configuration files.

⸻

4.1 ari.conf

[general]
enabled = yes
pretty = yes

[ari_user]
type = user
read_only = no
password = strongpassword123


⸻

4.2 http.conf

[general]
enabled = yes
bindaddr = 0.0.0.0
bindport = 8088


⸻

4.3 extensions.conf

[default]

; Extension 7777 → ExternalMedia instance gs7777
exten => 7777,1,NoOp(Start external media for 7777)
 same => n,Answer()
 same => n,ExternalMedia(app=gs7777,external_host=127.0.0.1:4000,format=slin16,transport=udp)
 same => n,Bridge(b7777)

; Extension 8888 → ExternalMedia instance gs8888
exten => 8888,1,NoOp(Start external media for 8888)
 same => n,Answer()
 same => n,ExternalMedia(app=gs8888,external_host=127.0.0.1:4001,format=slin16,transport=udp)
 same => n,Bridge(b8888)

Notes:
	•	Each extension uses its own GStreamer pipeline port
	•	Pipelines exchange audio through conf-server

⸻

5. GStreamer Pipeline Design

Asterisk’s official example uses:

appsrc → audioconvert → audioresample → appsink

We extend it to integrate with conf-server.

⸻

5.1 Required Pipelines

Pipeline A — for extension 7777:
	•	Input from Asterisk (20ms SLIN16 PCM frames)
	•	Send PCM to conf-server input socket A
	•	Receive PCM from conf-server output socket A
	•	Push into appsink → Asterisk

Pipeline B — for extension 8888:

Same structure, but mapped to sockets B.

⸻

5.2 Example GStreamer launch command (conceptual)

gst-launch-1.0 \
    udpsrc port=4000 caps="audio/x-raw,format=S16LE,channels=1,rate=16000" ! \
    queue ! appsink name=to_conf_server

appsrc name=from_conf_server ! \
    audioresample ! audioconvert ! \
    udpsink host=127.0.0.1 port=4100

Your engineering team will integrate both directions inside one pipeline script.

⸻

6. conf-server Specification

A Node.js server is recommended.

⸻

6.1 Phase 1 Responsibilities
	•	Receive PCM from gs7777
	•	Receive PCM from gs8888
	•	Maintain 20ms aligned buffers
	•	Forward:

7777 → 8888  
8888 → 7777

	•	Provide WebSocket endpoint for monitoring audio stream

⸻

6.2 Phase 2 Responsibilities (Translation Mode)

Replace forwarder with:

STT → Translate → TTS

Flow:

PCM → STT (Deepgram/Azure)  
Text → Translation (DeepL)  
Text → TTS (Azure/Coqui)  
PCM → GStreamer → Asterisk → Target extension


⸻

6.3 conf-server Example Skeleton (Node.js)

const dgram = require('dgram');
const serverA = dgram.createSocket('udp4');
const serverB = dgram.createSocket('udp4');

let bufferA = [];
let bufferB = [];

serverA.on('message', (msg) => bufferA.push(msg));
serverB.on('message', (msg) => bufferB.push(msg));

setInterval(() => {
    if (bufferA.length) {
        const frame = bufferA.shift();
        serverB.send(frame, 4101, '127.0.0.1'); // to gs8888
    }
    if (bufferB.length) {
        const frame = bufferB.shift();
        serverA.send(frame, 4100, '127.0.0.1'); // to gs7777
    }
}, 20);

This is Phase-1 cross-patch logic.

⸻

7. Monitoring Web UI

7.1 Requirements
	•	Web page using AudioContext + WebSocket
	•	Server exposes endpoints:

/monitor/7777
/monitor/8888

7.2 PCM → browser conversion

Browser expects Float32 PCM or WAV chunks.

conf-server converts S16LE → Float32 before sending.

⸻

8. Development Roadmap

PHASE 1 — PCM Cross-Patch + Monitoring

Step 1 — Install ExternalMedia + Test Echo

Step 2 — Create two GStreamer pipelines

Step 3 — Build conf-server (UDP forwarder)

Step 4 — Connect 7777 + 8888

Step 5 — Implement Monitoring WebSocket

Step 6 — Validate low-latency full-duplex audio

Step 7 — Confirm 7777 ↔ 8888 PCM routing works

⸻

PHASE 2 — Real-Time Translation

Step 1 — Insert STT

Step 2 — Add translation layer

Step 3 — Insert TTS

Step 4 — Replace cross-patch logic

Step 5 — Tune latency

Step 6 — Optimize jitter buffer

Step 7 — Production testing

⸻

9. Summary of Technical Advantages

Component	Benefit
ExternalMedia	Official Asterisk audio injection/extraction
GStreamer	The most stable real-time PCM handler available
20ms SLIN16 PCM	Perfect match for STT and low-latency streaming
conf-server	Flexible manipulation of audio/translation


⸻

10. Files Included
	•	✔ Full English engineering document (this file)
	•	✔ SVG architecture diagram (downloadable)
	•	✔ Complete Asterisk configurations
