

CPM Timestamp Header & Latency Calculation (Technical Note)

1. Purpose

In Deepgram CPM mode, the API does not provide any built-in latency measurement.
To obtain accurate real-time latency, the client must attach a timestamp header when sending each audio chunk and compute the round-trip latency upon receiving the corresponding CPM response.

This document describes the minimal implementation required.

⸻

2. Adding a Timestamp Header to Each Audio Chunk

Before sending an audio chunk to Deepgram, attach a timestamp (epoch in milliseconds or nanoseconds).
There are two recommended formats:

Option A — JSON wrapper (simple & clear)

Outgoing message format:

{
  "sent_ts": 1732512345123,
  "audio": "<raw_pcm_bytes_base64>"
}

Option B — Binary header prefix (lowest overhead)

Prefix the PCM chunk with 8 bytes representing a float or int64 timestamp:

[timestamp_8_bytes][raw_pcm_audio_bytes]

Both formats are valid.
Your timing server does not care which you choose as long as the sender and receiver agree.

⸻

3. Receiving the CPM Response & Calculating Latency

When Deepgram returns the CPM partial message, extract the sent_ts you originally attached and compute:

latency_ms = recv_timestamp_ms - sent_ts

Where:
	•	sent_ts = timestamp included at chunk send
	•	recv_timestamp_ms = current time on receipt of the CPM message

Example (Node.js)

socket.onmessage = (msg) => {
    const now = performance.now(); // ms
    const parsed = JSON.parse(msg.data);

    const sent = parsed.sent_ts;  
    const latency = now - sent;

    sendToTimingServer({ latency_ms: latency });
};

Example (Python)

recv_ts = time.time() * 1000
sent_ts = message["sent_ts"]

latency_ms = recv_ts - sent_ts
send_to_timing_server({"latency_ms": latency_ms})


⸻

4. Forwarding Latency to the Timing Server

Your timing server is already responsible for:
	•	rolling average
	•	min/max
	•	percentiles
	•	alarms
	•	dashboards

Therefore the CPM client must simply forward the raw latency value:

Format:

{
  "source": "deepgram_cpm",
  "latency_ms": <value>
}

POST Example:

await fetch("http://TIMING_SERVER/internal/latency", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
        source: "deepgram_cpm",
        latency_ms: latency_ms
    })
});

No extra processing should be done by the CPM worker.

⸻

5. Summary
	•	Deepgram CPM does not include latency information.
	•	You must add a timestamp header before sending audio.
	•	On receiving the CPM message, compute recv_ts - sent_ts.
	•	Forward this raw latency value to your existing timing server.
	•	The timing server performs all aggregation and analysis.

This completes the requirement.
