

Appendix B – Example Full Call Trace (End-to-End)

Scenario:
Call from extension 3333 to extension 4444
Language translation enabled
Monitoring + Optimizer active
Bucket size: 5 seconds

⸻

B.1 Call Initiation

T = 21:14:52.100Z
	1.	SIP INVITE arrives at Asterisk
	2.	Asterisk bridges call:
	•	RTP stream A → Gateway
	•	RTP stream B → Gateway
	3.	Gateway converts RTP → PCM
	4.	PCM stream enters STTTTSserver

System action:
	•	New trace_id generated

trace_id = "trace_abc123"


⸻

B.2 Trace Registration

T = 21:14:52.120Z

Row inserted into traces table:

INSERT INTO traces (
  trace_id,
  started_at,
  src_extension,
  dst_extension,
  call_id
) VALUES (
  'trace_abc123',
  '2026-01-03T21:14:52.120Z',
  '3333',
  '4444',
  'sip-9f82...'
);

Stations activated for this trace:
	•	St_3_3333 (TX / egress)
	•	St_3_4444 (RX / ingress)

⸻

B.3 First Audio Frames Arrive (Inside STTTTSserver)

T = 21:14:52.300Z

PCM frames (20 ms each, 16 kHz, mono) begin flowing.

For each frame:
	1.	Frame enters Station3_3333_Handler
	2.	Delegated to St_Handler_Generic.processFrame()

⸻

B.4 PRE Processing (per frame)

For every frame:
	•	Metrics computed (PRE):
	•	pcm.rms_dbfs
	•	pcm.peak_dbfs
	•	pcm.clipping_ratio
	•	Frame copied to PRE AudioRecorder buffer

Important:
No DB writes, no blocking — everything in memory.

⸻

B.5 Knobs Application (in-memory)

Still inside processFrame():

Effective knobs resolved (priority):
	1.	Trace overrides (none yet)
	2.	Global overrides (none)
	3.	Baseline defaults

Example effective knobs at start:

{
  "pcm.input_gain_db": 0,
  "limiter.enabled": true,
  "limiter.threshold_dbfs": -6,
  "compressor.enabled": false
}

DSP applied:
	•	Gain = 0 dB
	•	Limiter active

⸻

B.6 POST Processing (per frame)

After DSP:
	•	Metrics computed (POST)
	•	Frame copied to POST AudioRecorder buffer
	•	Frame forwarded to:
	•	STT
	•	Translation
	•	TTS
	•	Back to Gateway

⸻

B.7 Aggregation Window #1

Bucket

Bucket #1
bucket_ts = 21:15:00.000Z
covers: 21:14:55.000 → 21:15:00.000

During this window:
	•	~250 audio frames processed
	•	Metrics accumulated in Aggregator
	•	PRE & POST audio buffered separately

⸻

B.8 Bucket Flush (5s boundary)

T = 21:15:00.000Z

Aggregator flush triggered.

B.8.1 Metrics written

Example rows in metrics_agg_5s:

trace_id: trace_abc123
station_key: St_3_3333
tap: PRE
metric_key: pcm.rms_dbfs
count: 145
min: -36.2
max: -18.5
avg: -24.1

trace_id: trace_abc123
station_key: St_3_3333
tap: POST
metric_key: pcm.clipping_ratio
avg: 0.0042


⸻

B.8.2 Audio segments written

Two WAV files created:

/audio/trace_abc123/St_3_3333/PRE/2026-01-03T21:15:00.000Z.wav
/audio/trace_abc123/St_3_3333/POST/2026-01-03T21:15:00.000Z.wav

Row inserted into audio_segments_5s.

⸻

B.8.3 Knob snapshot written

{
  "trace_id": "trace_abc123",
  "station_key": "St_3_3333",
  "bucket_ts": "2026-01-03T21:15:00.000Z",
  "knobs_json": {
    "pcm.input_gain_db": 0,
    "limiter.threshold_dbfs": -6,
    "compressor.enabled": false
  }
}


⸻

B.9 Optimizer Pulls Snapshot

T = 21:15:02.000Z

Optimizer loop runs.

Call:

GET /api/optimizer/snapshot?trace_id=trace_abc123&limit=1

Optimizer sees:
	•	PRE RMS avg: −24.1 dBFS
	•	POST RMS avg: −18.9 dBFS
	•	POST clipping ratio: 0.42% (too high)

⸻

B.10 Optimizer Decision

Rule triggered:

Clipping > 0.1% → reduce input gain

Decision:

{
  "pcm.input_gain_db": -3
}

Apply next bucket only.

⸻

B.11 Optimizer Applies Knobs

T = 21:15:02.100Z

POST /api/optimizer/knobs/apply

{
  "trace_id": "trace_abc123",
  "station_key": "St_3_3333",
  "apply_at_bucket_ts": "2026-01-03T21:15:05.000Z",
  "knobs": {
    "pcm.input_gain_db": -3
  }
}

System response:
	•	accepted
	•	config_version = 42

⸻

B.12 Bucket #2 (After Knob Change)

Bucket

Bucket #2
bucket_ts = 21:15:05.000Z

At bucket start:
	•	Knobs updated in memory
	•	New effective gain = −3 dB

Frames processed with new gain.

⸻

B.13 Metrics After Optimization

POST metrics in Bucket #2:
	•	RMS avg: −19.8 dBFS
	•	Clipping ratio: 0.0003

Audio sounds cleaner, no audible distortion.

⸻

B.14 Optimizer Verification

Next loop:
	•	Snapshot shows:
	•	knobs_snapshot.pcm.input_gain_db = -3
	•	Clipping resolved
	•	Optimizer does nothing (steady state)

⸻

B.15 Call Termination

T = 21:16:40.900Z
	•	SIP BYE
	•	Audio stops
	•	Final partial bucket flushed
	•	ended_at updated in traces

UPDATE traces
SET ended_at = NOW()
WHERE trace_id = 'trace_abc123';


⸻

B.16 Resulting Artifacts (Per Call)

For this single call you now have:
	•	✔ Full metrics history (PRE/POST)
	•	✔ Full knob timeline
	•	✔ Full PRE/POST audio slices (5s resolution)
	•	✔ Deterministic optimization history
	•	✔ Ability to replay / audit / compare

⸻

Key Takeaway

This trace demonstrates that:
	•	No per-call process duplication exists
	•	All optimization is bucket-aligned
	•	Audio is never blocked
	•	Every decision is verifiable
	•	The system is explainable end-to-end

⸻

