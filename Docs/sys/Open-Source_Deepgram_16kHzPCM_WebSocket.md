

Open-Source Client for Python → Deepgram (16 kHz, PCM, WebSocket)

1. Recommended Open-Source Project

The best open-source option for connecting your internal Python server to Deepgram with:
	•	16 kHz
	•	Mono
	•	PCM, S16LE (linear16)
	•	WebSocket Streaming API

is the official Deepgram Python SDK:

Repo: deepgram/deepgram-python-sdk (MIT License)  ￼

This SDK already implements:
	•	WebSocket connection management
	•	encoding="linear16", sample_rate=16000, channels=1  ￼
	•	Event handling (messages, errors, close)
	•	Async and sync usage patterns

You only need to feed it 20 ms PCM frames from your own audio pipeline.

⸻

2. Recommended Usage Pattern (Server-Side, Python)

Your internal AI server should:
	1.	Produce 16 kHz, mono, S16LE PCM buffers (e.g., via GStreamer or any audio stack).
	2.	Chunk the audio into 20 ms frames (320 samples → 640 bytes).
	3.	Push each frame into the Deepgram WebSocket using the SDK.

⸻

3. Minimal Example (Real-Time Streaming, 16 kHz PCM)

import asyncio
from deepgram import DeepgramClient
from deepgram.core import DeepgramClientOptions
from deepgram.core.events import EventType

DG_API_KEY = "YOUR_DEEPGRAM_API_KEY"

# 1) Create Deepgram client
options = DeepgramClientOptions(options={"keepalive": "true"})
client = DeepgramClient(api_key=DG_API_KEY, config=options)

async def stream_pcm_16k_from_source(pcm_source):
    """
    pcm_source: async iterator yielding raw 16 kHz, mono, S16LE PCM chunks
                ideally 20 ms each (640 bytes)
    """
    async with client.listen.v1.connect(
        model="nova-3",
        encoding="linear16",
        sample_rate=16000,
        channels=1,
        interim_results=True,
    ) as conn:

        # Handle incoming transcription events
        def on_message(message):
            print("DG EVENT:", message)

        conn.on(EventType.MESSAGE, on_message)

        # Start listening loop in background
        asyncio.create_task(conn.start_listening())

        # 2) Send audio frames to Deepgram
        async for chunk in pcm_source:
            await conn.send(chunk)

        # 3) Close the stream when done
        await conn.finish()

# Example pcm_source stub – replace with your GStreamer/AI pipeline
async def fake_pcm_source():
    # yield 20 ms frames (640 bytes) from somewhere
    with open("audio_16k_s16le.raw", "rb") as f:
        while True:
            chunk = f.read(640)  # 20 ms @ 16 kHz, mono, 16-bit
            if not chunk:
                break
            yield chunk

if __name__ == "__main__":
    asyncio.run(stream_pcm_16k_from_source(fake_pcm_source()))

The encoding="linear16" and sample_rate=16000 configuration is the officially documented way to send raw PCM to Deepgram over WebSocket.  ￼

⸻

4. Notes for Your Architecture
	•	On your side (internal server), ensure the audio is:
	•	Exactly: audio/x-raw, format=S16LE, channels=1, rate=16000
	•	Chunked into 20 ms frames (640 bytes).
	•	The SDK handles:
	•	WebSocket handshakes
	•	Reconnection options
	•	Parsing Deepgram’s JSON events

So you do NOT need to write your own low-level WebSocket client unless you really want to.

⸻

