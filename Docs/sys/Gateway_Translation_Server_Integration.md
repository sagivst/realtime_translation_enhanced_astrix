

🎧 Gateway ↔ Translation Server Integration Specification


⸻

1. Purpose

This document describes the real-time integration between the open-source Node.js Gateway
(from the nikhilbadyal/asterisk-external-media-gateway project)
and the Unified Translation Server that handles all AI functions
(ASR, Translation, TTS, Emotion, etc.).

It explains how the Gateway communicates with the Translation Server,
what data format is exchanged, and why no additional configuration in Asterisk (ExternalMedia, bridges, etc.) is required once the Gateway is active.

⸻

2. Architecture Overview

flowchart LR
    AST["Asterisk (ExternalMedia RTP)"]
    GW["Open-Source Node.js Gateway"]
    TR["Unified Translation Server (AI Pipeline)"]

    AST <--> |RTP PCM 16kHz| GW
    GW <--> |WebSocket Audio Stream (PCM 16kHz)| TR

Summary:
	•	Asterisk streams audio via ExternalMedia channels to the Gateway (standard RTP).
	•	Gateway receives this audio, sends it to your Translation Server over WebSocket (or HTTPS streaming),
receives the translated audio back, and returns it to Asterisk.
	•	The process is fully duplex and continuous, with sub-150 ms total latency.

⸻

3. Key Design Principle

Asterisk does not need to know anything about the Translation Server or AI services.
Once the ExternalMedia channels are created (by default configuration),
the Gateway handles all routing, synchronization, and AI communication automatically.

There is no need to:
	•	modify Asterisk dialplan logic,
	•	reconfigure ExternalMedia per session,
	•	or create any new media bridges.

Everything happens transparently between the Gateway and your Translation Server.

⸻

4. Data Flow (Step-by-Step)

Step	Direction	Action	Description
1	Asterisk → Gateway	RTP (20 ms PCM frames)	The raw mic audio from each participant is streamed via ExternalMedia.
2	Gateway → Translation Server	WebSocket audio stream	The Gateway forwards the raw audio as continuous PCM data to your Translation Server endpoint.
3	Translation Server	Internal AI pipeline	ASR → Translation → TTS (optionally Emotion or Voice Profile).
4	Translation Server → Gateway	WebSocket PCM return stream	The translated audio is streamed back in real-time.
5	Gateway → Asterisk	RTP	The Gateway re-encapsulates the translated PCM data into RTP and sends it back to Asterisk.


⸻

5. Connection Specifications

Parameter	Specification
Protocol (Asterisk ↔ Gateway)	RTP (UDP)
Protocol (Gateway ↔ Translation Server)	WebSocket (full-duplex) or HTTP/2 streaming
Audio Format	PCM16 (mono, 16 kHz, 20 ms frame)
Average Round-Trip Latency	100–140 ms
Buffer Handling	Gateway keeps ~2–3 frames (≈60 ms) buffer to maintain sync
Session Lifecycle	WebSocket opens when call starts, closes when bridge ends
Error Handling	If Translation Server is unreachable, Gateway sends silent frames to Asterisk to keep session stable


⸻

6. Translation Server Endpoint Requirements

Your Translation Server should expose one unified endpoint, such as:

wss://translate.myservice.ai/session

or

https://translate.myservice.ai/api/audio

Expected Behavior
	•	Input: continuous PCM audio stream (mono, 16-bit, 16 kHz)
	•	Output: continuous PCM audio stream (same spec)
	•	The translation logic inside (ASR → Translate → TTS) remains completely opaque to the Gateway.
	•	Each session (per call leg) corresponds to a separate WebSocket connection.

⸻

7. Session Handling

When a call begins (for example, between extensions 7000 and 7001):
	•	Two ExternalMedia channels are created automatically by the ARI logic.
	•	The Gateway detects each new media session and opens a new WebSocket to your Translation Server.
	•	One socket per direction:
	•	English → French
	•	French → English
	•	When the call ends, the WebSocket sessions are closed and all buffers flushed.

⸻

8. Synchronization and Timing

The Gateway continuously maps each 20 ms RTP frame from Asterisk
to a 20 ms PCM segment in the WebSocket stream.
Incoming translated audio is timestamped and reinjected with the same sequence numbers.

This ensures:
	•	No drift between the two directions.
	•	Continuous playback without packet gaps.
	•	Full duplex conversation within human-perceptible thresholds.

⸻

9. Monitoring & Debugging

Task	Tool / Method
Verify RTP from Asterisk	rtp set debug on in Asterisk CLI
Check WebSocket sessions	Gateway logs (connection open/close per session)
Measure round-trip latency	Timestamped frame comparison (Asterisk ↔ Translation Server)
Handle translation server downtime	Gateway plays short silence frames to maintain bridge stability


⸻

10. Deployment Model

Component	Location	Notes
Asterisk	Same machine or LAN	Must see the Gateway’s UDP port directly
Gateway (Node.js)	Local or nearby edge node	Ideal latency ≤ 10 ms between Asterisk and Gateway
Translation Server	Cloud or on-prem cluster	Handles AI logic (ASR, translation, voice synthesis)


⸻

11. Summary

✅ The open-source Gateway acts as the only interface between the PBX and your AI system.
✅ Asterisk requires no additional setup once ExternalMedia channels are in place.
✅ The Translation Server sees only clean audio — no telephony logic.
✅ Audio flows seamlessly both ways via RTP↔WebSocket, with minimal latency.
✅ Failover and silence handling ensure uninterrupted conversation even if AI temporarily stalls.

⸻

12. Key Takeaway

Once the Node.js Gateway is installed and configured,
there is nothing more to configure inside Asterisk.
All logic for translation, voice generation, and synchronization lives in the Gateway and your Translation Server.

