

📄 PCM FRAME HEADER SPECIFICATION

Mandatory Header for Real-Time Audio Monitoring & Optimization

Applies to:
PCM 16kHz / S16LE / Mono / 20ms frames
WebSocket transport
Monitoring + AI Optimization Systems

⸻

1. Design Goals (Non-Negotiable)

The PCM header MUST:
	1.	Allow deterministic timing (no guessing)
	2.	Enable loss / jitter / drift detection
	3.	Support idempotent scheduling & rollback
	4.	Correlate metrics ↔ knobs ↔ AI decisions
	5.	Be cheap to parse (no heavy serialization)

⸻

2. Frame Audio Payload (Unchanged)

Property	Value
Sample Rate	16000 Hz
Bit Depth	16-bit signed
Channels	1 (Mono)
Encoding	PCM_S16LE
Frame Duration	20 ms
Samples per Frame	320
Bytes per Frame	640
WAV Header	❌ None


⸻

3. Mandatory Header Fields (MINIMUM VIABLE)

These fields MUST be present on every PCM frame.

3.1 Required Header Fields

Field	Type	Size	Description
version	uint8	1B	Header version (start at 1)
trace_id	uint64	8B	Call / session identifier
station_key	uint32	4B	Monitoring station identifier
channel_id	uint16	2B	Audio channel / leg
seq	uint32	4B	Monotonic frame sequence
capture_ts_ms	uint64	8B	Audio capture timestamp
send_ts_ms	uint64	8B	Frame send timestamp
flags	uint16	2B	Bitmask (see below)

Total header size: 39 bytes
(Pad to 40 bytes for alignment)

⸻

4. Timestamp Semantics (CRITICAL)

4.1 capture_ts_ms
	•	Time audio was captured
	•	Monotonic clock (not wall-clock)
	•	Units: milliseconds
	•	Increases ~20ms per frame

Used for:
	•	Audio continuity
	•	Drift detection
	•	Speech onset timing
	•	True end-to-end latency

4.2 send_ts_ms
	•	Time frame left the sender
	•	Used to compute:
	•	ingress latency
	•	queueing delay
	•	backpressure

If only ONE timestamp is possible → capture_ts_ms is mandatory

⸻

5. Sequence Number (seq) – WHY IT IS REQUIRED

seq MUST increment by exactly +1 per frame per channel.

Enables:
	•	Packet loss detection
	•	Out-of-order detection
	•	Duplicate detection
	•	Reliable jitter metrics
	•	Idempotent scheduling

Without seq, loss detection is heuristic and unsafe.

⸻

6. Flags Bitmask

flags is a uint16 bitmask.

Bit	Name	Meaning
0	SILENCE_FRAME	Frame detected as silence
1	CLIPPED_FRAME	Clipping detected
2	SPEECH_FRAME	Speech present
3	MUTED_FRAME	Explicit mute
4	DISCONTINUITY	Sender detected gap
5	END_OF_STREAM	Last frame
6–15	Reserved	Must be zero

Flags are hints, not authority — metrics still decide.

⸻

7. Binary Layout (RECOMMENDED)

7.1 Binary (Little-Endian)

| version (1) |
| trace_id (8) |
| station_key (4) |
| channel_id (2) |
| seq (4) |
| capture_ts_ms (8) |
| send_ts_ms (8) |
| flags (2) |
| padding (3) |
| PCM payload (640 bytes) |

Total frame size: 40 + 640 = 680 bytes

⸻

8. JSON Header (Allowed for Debug / Dev Only)

❌ NOT recommended for production
✔ Allowed for early debugging

{
  "version": 1,
  "trace_id": 123456789,
  "station_key": 3001,
  "channel_id": 1,
  "seq": 48192,
  "capture_ts_ms": 1736113435123,
  "send_ts_ms": 1736113435138,
  "flags": ["SPEECH_FRAME"]
}


⸻

9. What This Header Enables (Explicit Mapping)

Capability	Requires
RMS / clipping	PCM only
Silence / VAD	PCM + flags
Jitter	capture_ts_ms + seq
Packet loss	seq
Drift detection	capture_ts_ms
Queue latency	send_ts_ms
End-to-end latency	capture_ts_ms + recv_ts
AI idempotency	trace_id + seq
Scheduler safety	seq + bucket alignment
Audit & replay	trace_id + seq


⸻

10. Fields Explicitly NOT Allowed

🚫 No WAV headers
🚫 No base64 PCM
🚫 No floating timestamps
🚫 No wall-clock timestamps without monotonic guarantee
🚫 No optional omission of seq

⸻

11. Versioning Rules
	•	version MUST be checked
	•	Unknown version → frame rejected
	•	New fields MUST be added at the end
	•	Backward compatibility required

⸻

12. Validation Rules (Must Fail Fast)

A frame MUST be rejected if:
	•	Payload ≠ 640 bytes
	•	seq ≤ last_seq (duplicate or rewind)
	•	capture_ts_ms ≤ last_capture_ts
	•	timestamp drift > configured threshold
	•	header size mismatch

⸻

13. Minimal Implementation Checklist
	•	Binary header encoder
	•	Monotonic clock source
	•	Per-channel seq counter
	•	Header parser (zero-copy)
	•	Validation + metrics hooks
	•	Drop & log invalid frames

⸻

14. Final Statement (Non-Negotiable)

Without this header, the system cannot be safely optimized, audited, or auto-tuned.

This header is the contract between:
	•	Audio capture
	•	Monitoring
	•	Scheduler
	•	AI optimizer

Breaking this contract invalidates all metrics.

⸻

אם תרצה, השלב הבא המתבקש:
	•	✅ HeaderEncoder.js
	•	✅ HeaderDecoder.js
	•	✅ FrameValidator.js
	•	✅ מיפוי header → MetricsRegistry

רק תגיד.