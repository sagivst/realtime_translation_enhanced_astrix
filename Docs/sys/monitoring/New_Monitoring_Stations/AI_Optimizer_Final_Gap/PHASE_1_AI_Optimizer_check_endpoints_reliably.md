AI Optimizer can check endpoints reliably if you paste the outputs (or you can run the exact commands below and compare to the “PASS criteria”).

1) Run these checks (copy/paste)

A) Active traces

curl -sS http://20.170.155.53:3020/api/traces/active | jq .

PASS if:
	•	JSON has success: true
	•	active is an array
	•	Each item has: trace_id, started_at, src_extension, dst_extension, stations (non-empty)

⸻

B) Snapshot (core)

Replace TRACE_ID with a real one from (A):

TRACE_ID="trace_abc123"
curl -sS "http://20.170.155.53:3020/api/optimizer/snapshot?trace_id=${TRACE_ID}&limit=1" | jq .

PASS if:
	•	success: true
	•	trace_id matches
	•	buckets array exists (can be empty if no completed bucket yet)
	•	Each bucket has:
	•	bucket_ts (ISO with Z)
	•	bucket_ms = 5000
	•	station_key
	•	knobs_snapshot (object)
	•	metrics.PRE and metrics.POST (objects)
	•	audio.PRE.endpoint and audio.POST.endpoint
	•	config_version (int)

⸻

C) Audio segment download

Copy the audio.PRE.endpoint value from the snapshot and run:

curl -i "http://20.170.155.53:3020<PASTE_ENDPOINT_HERE>" | head -n 40

Then actually download:

curl -sS -o /tmp/seg.wav "http://20.170.155.53:3020<PASTE_ENDPOINT_HERE>" \
  && file /tmp/seg.wav

PASS if:
	•	Response header includes Content-Type: audio/wav
	•	file /tmp/seg.wav says WAV
	•	(Optional) headers like X-Sample-Rate, X-Channels, X-Bucket-MS exist

⸻

D) Apply knobs (idempotent + future bucket)

Pick a future bucket boundary (next 5s). Example:

curl -sS -X POST http://20.170.155.53:3020/api/optimizer/knobs/apply \
  -H "Content-Type: application/json" \
  -d '{
    "trace_id": "TRACE_ID_HERE",
    "station_key": "St_3_3333",
    "apply_at_bucket_ts": "2026-01-03T21:15:10.000Z",
    "idempotency_key": "test-12345",
    "source": "api_test",
    "reason": "test apply",
    "knobs": { "pcm.input_gain_db": -1 }
  }' | jq .

PASS if:
	•	success: true
	•	accepted: true
	•	config_version increments (or at least returned)
	•	Repeating the same request with the same idempotency_key does not double-apply (should return same result / no duplicate knob_events)

⸻

2) Paste these 4 outputs here
	•	/api/traces/active
	•	/api/optimizer/snapshot?...
	•	curl -i headers for audio endpoint (first ~30 lines)
	•	/api/optimizer/knobs/apply response

…and AI’ll tell us exactly what’s correct and what’s missing/mismatched vs the OpenAPI contract (field-by-field).