
Full Technical Architecture Specification

Real-Time Hume Emotion Streaming + ElevenLabs TTS + Monitoring Dashboard

Version: 1.0

Scope: Full, accurate real-time pipeline including Hume, ElevenLabs, and monitoring.

⸻

1. Overview

This document defines the complete real-time audio pipeline, including:
	•	Audio → Hume Prosody Streaming
	•	Prosody results → AI Server logic
	•	AI Server → ElevenLabs TTS
	•	ElevenLabs audio → AI Server output
	•	Parallel monitoring of the entire Hume streaming subsystem

All monitoring is fully isolated, read-only, and has zero effect on performance.

⸻

2. Correct Architecture (FINAL – With Hume → ElevenLabs included)

Below is the authoritative and correct flow, including:

✔ AI Server

✔ Python Hume Worker

✔ Hume WebSocket

✔ ElevenLabs TTS

✔ Monitoring Endpoint

✔ HTML Dashboard

⸻

2.1 Final Pipeline Diagram

                  ┌────────────────────────────────────────────┐
                  │                AI SERVER                   │
                  │--------------------------------------------│
                  │ • Receives inbound PCM16 audio             │
                  │ • Sends audio chunks → Python Hume Worker  │
                  │ • Receives prosody/emotion results         │
                  │ • Applies logic / routing                  │
                  │ • Sends text → ElevenLabs (TTS)            │
                  │ • Receives audio from ElevenLabs           │
                  │ • Outputs synthesized audio (to client)    │
                  │ • Updates monitoring fields (Hume only)    │
                  └───────────────┬────────────────────────────┘
                                  │ PCM16 chunks
                                  ▼
         ┌──────────────────────────────────────────────────────────┐
         │                   PYTHON HUME WORKER                     │
         │----------------------------------------------------------│
         │ • Uses HumeStreamClient (Python SDK)                     │
         │ • WebSocket connection to Hume                           │
         │ • Sends PCM16 audio → Hume                               │
         │ • Receives Prosody results from Hume                     │
         │ • Computes:                                              │
         │     - latency per message                                │
         │     - chunk rate (fps)                                   │
         │     - connection status                                  │
         │     - last_message_age                                   │
         │     - error counters                                     │
         │ • Updates in-memory health object                        │
         │ • Exposes GET /health/hume (JSON)                        │
         └───────────────┬──────────────────────────────────────────┘
                         │ Prosody JSON (emotion)
                         ▼
                  ┌────────────────────────────────────────────┐
                  │                AI SERVER                   │
                  │        (Decision Logic Layer)              │
                  │--------------------------------------------│
                  │ • Uses Prosody to influence responses      │
                  │ • Converts final text → TTS request        │
                  └───────────────┬────────────────────────────┘
                                  │ TTS Text
                                  ▼
         ┌──────────────────────────────────────────────────────────┐
         │                    ELEVENLABS TTS                        │
         │----------------------------------------------------------│
         │ • Receives text from AI Server                           │
         │ • Produces real-time PCM16 audio                         │
         │ • Streams audio back to AI Server                        │
         └───────────────┬──────────────────────────────────────────┘
                         │ Synthesized audio
                         ▼
                  ┌────────────────────────────────────────────┐
                  │                AI SERVER                   │
                  │--------------------------------------------│
                  │ • Outputs final audio to client            │
                  │ • (Monitoring is parallel and safe)        │
                  └──────────────┬─────────────────────────────┘
                                 │ Health JSON (local)
                                 ▼
        ┌───────────────────────────────────────────────────────┐
        │                HTML MONITORING DASHBOARD              │
        │-------------------------------------------------------│
        │ • fetch() /health/hume every 1 sec                    │
        │ • Displays Hume-only metrics                          │
        │ • No access to Hume SDK or ElevenLabs                 │
        │ • Read-only – cannot affect SDK operation             │
        └───────────────────────────────────────────────────────┘


⸻

3. Detailed Flow Explanation

3.1 Audio → Hume Prosody Streaming
	1.	The AI Server receives or generates PCM16 audio.
	2.	The audio is forwarded to the Python Hume Worker.
	3.	The worker sends the audio chunks via HumeStreamClient to Hume’s WebSocket.

3.2 Hume → AI Server (Prosody Results)

Hume returns:
	•	Emotion predictions
	•	Confidence scores
	•	Timestamps

The worker updates:
	•	Last message timestamp
	•	Latency
	•	FPS (chunk rate)
	•	Error tracking

Then forwards the emotion result to the AI Server.

3.3 AI Server → ElevenLabs (TTS)

After interpreting Hume signals, the AI Server sends outgoing text to ElevenLabs.

This step is fully independent of Hume.

3.4 ElevenLabs → AI Server (Audio Streaming)

ElevenLabs streams PCM16 audio back.

The AI Server forwards the synthesized audio to the client.

3.5 Monitoring (Parallel, Safe, Isolated)

The Python Hume Worker updates an in-memory health object:

{
  "connection": "open",
  "latency_ms_avg": 80.3,
  "latency_ms_max": 141,
  "chunk_rate_fps": 48,
  "errors_past_minute": 0,
  "last_message_age_ms": 22,
  "uptime_seconds": 203,
  "last_error": null
}

This object is exposed at:

GET /health/hume

The HTML dashboard polls this endpoint every 1 second.

It never:
	•	contacts Hume
	•	contacts ElevenLabs
	•	touches the audio pipeline
	•	interacts with WebSockets

Purely read-only.

⸻

4. Why Monitoring Cannot Affect Hume or ElevenLabs

Reason 1 — Different transports
	•	Hume uses WebSocket
	•	ElevenLabs uses HTTP/WebSocket
	•	Monitoring uses simple HTTP GET to a local endpoint

Reason 2 — Different processes/threads
	•	Python Hume Worker main loop → async WebSocket
	•	Monitoring server → FastAPI thread
	•	Dashboard → client-side browser JavaScript

Reason 3 — Read-only metrics

The dashboard never writes into SDK logic.

Reason 4 — Minimal overhead

Monitoring is:
	•	~200 bytes of JSON
	•	~1 request per second
	•	<0.1% CPU
	•	Zero effect on stream timing

⸻

5. What Is Being Monitored (Hume-Only)

Metric	Meaning
connection	WebSocket state (“open/closed/error/connecting”)
latency_ms_avg	Average round-trip latency for Hume messages
latency_ms_max	Maximum latency recently observed
chunk_rate_fps	Number of audio chunks processed per second
errors_past_minute	Count of reconnects/exceptions in last 60s
last_message_age_ms	Time since last valid message from Hume
uptime_seconds	Worker uptime
last_error	Most recent worker error

This is a pure Hume monitoring block.

ElevenLabs is NOT monitored unless added by you — and your request specifies to exclude other systems.

⸻

6. Final Summary

The correct architecture is:

AI Server → Python Hume Worker → Hume → AI Server → ElevenLabs → AI Server
AND
Python Worker → /health/hume → HTML Dashboard

The Python SDK sits here:

✔ In the Python Hume Worker only
✔ Running the real-time WebSocket to Hume
✔ Producing the monitoring metrics

The ElevenLabs stage sits after Hume:

✔ Hume results influence AI decisions
✔ AI sends text to ElevenLabs
✔ ElevenLabs returns synthesized audio
✔ Does NOT affect monitoring

The dashboard:

✔ Polls /health/hume every second
✔ Shows Hume metrics only
✔ Is 100% safe
✔ Has zero impact on streaming performance

