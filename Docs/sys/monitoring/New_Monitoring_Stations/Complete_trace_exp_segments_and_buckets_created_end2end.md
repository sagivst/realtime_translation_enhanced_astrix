Below is a complete, end-to-end “single trace” example showing exactly how 5s-aligned buckets + PRE/POST audio segments are produced, named, stored, and linked—step by step.

⸻

Example Trace (Single Call) – End-to-End

How 5s Buckets + PRE/POST Segments Are Created

Fixed constants (mandatory)
	•	frame_ms = 20
	•	sample_rate_hz = 16000
	•	channels = 1
	•	bucket_ms = 5000
	•	Frames per bucket: 5000 / 20 = 250 frames
	•	Samples per frame: 16000 * 0.02 = 320 samples
	•	Samples per bucket: 250 * 320 = 80,000 samples

Trace identity
	•	trace_id = "trace_2026-01-01T00-00-02.100Z_3333_4444"
	•	station_key = "St_3_3333"
	•	tap = PRE / POST
	•	metric_keys used (example):
	•	pcm.rms_dbfs
	•	pcm.peak_dbfs
	•	pcm.clipping_ratio

⸻

1) Timeline and Bucket Alignment

Assume the call starts at:
	•	Call start time: 00:00:02.100Z
	•	Bucket boundaries are fixed on absolute time:
	•	Bucket A: 00:00:00.000Z → 00:00:05.000Z
	•	Bucket B: 00:00:05.000Z → 00:00:10.000Z
	•	Bucket C: 00:00:10.000Z → 00:00:15.000Z
	•	…

Even though the call starts inside Bucket A, we still write Bucket A segments (they will be padded/truncated to exactly 5s).

Bucket start timestamp (bucket_ts) is always:

bucket_ts = floor(now_ms / 5000) * 5000


⸻

2) Frame-by-Frame Processing at Station 3 (STTTTSserver PCM ingress)

Each 20ms frame arrives to Station3 handler and is processed by St_Handler_Generic:

Per frame flow (mandatory)
	1.	PRE metrics computed on raw frame
	2.	Raw frame is captured into PRE segment buffer
	3.	Knobs applied (gain/limiter) → produce processed frame
	4.	POST metrics computed on processed frame
	5.	Processed frame is captured into POST segment buffer
	6.	Processed frame continues downstream in STTTTS pipeline

⸻

3) Bucket A Example (00:00:00–00:00:05)

Frames arriving in Bucket A (call started at 00:00:02.100)

Within Bucket A, we receive approximately:
	•	From 00:00:02.100 to 00:00:05.000 = 2.9 seconds
	•	Frames: 2.9s / 0.02s = ~145 frames
	•	Samples: 145 * 320 = 46,400 samples

But the segment must be exactly 5 seconds (80,000 samples).

3.1 AudioRecorder behavior (PRE and POST)

When bucket changes from A to B (at 00:00:05.000Z), AudioRecorder finalizes Bucket A:
	•	Merge all collected frame buffers (≈46,400 samples)
	•	Pad the rest with zeros to reach exactly 80,000 samples
	•	Enqueue segment for writer for PRE
	•	Enqueue segment for writer for POST

3.2 Disk output (two files for Bucket A)

PRE segment file:

/var/monitoring/audio/2026-01-01/trace_2026-01-01T00-00-02.100Z_3333_4444/St_3_3333/PRE/segment_1704067200000.wav

POST segment file:

/var/monitoring/audio/2026-01-01/trace_2026-01-01T00-00-02.100Z_3333_4444/St_3_3333/POST/segment_1704067200000.wav

Where:
	•	1704067200000 is the epoch ms for 00:00:00.000Z (Bucket A start).

These files are written by AudioWriter (async). The realtime path never writes files.

3.3 DB index rows for Bucket A (audio_segments_5s)

Two rows are inserted (via DatabaseBridge from async context):

Row A-PRE

{
  "trace_id": "trace_2026-01-01T00-00-02.100Z_3333_4444",
  "station_key": "St_3_3333",
  "tap": "PRE",
  "bucket_ts": "2026-01-01T00:00:00.000Z",
  "bucket_ms": 5000,
  "sample_rate_hz": 16000,
  "channels": 1,
  "format": "WAV_PCM_S16LE_MONO",
  "file_path": "/var/monitoring/audio/2026-01-01/trace_.../St_3_3333/PRE/segment_1704067200000.wav"
}

Row A-POST is identical except tap=POST and POST file path.

⸻

4) Metrics Aggregation for Bucket A (metrics_agg_5s)

4.1 Per-frame samples added

For each frame in Bucket A (~145 frames), the Generic Handler calls:

Aggregator.addSample({
  trace_id,
  station_key,
  tap: PRE,
  metric_key: pcm.rms_dbfs,
  bucket_ts_ms: 1704067200000,
  value: <computed>
})

Same for peak/clipping, and for POST metrics.

So for Bucket A you will have:
	•	PRE: 3 metrics × ~145 samples each
	•	POST: 3 metrics × ~145 samples each

4.2 On bucket boundary (00:00:05.000Z)

The Aggregator flushes Bucket A and outputs one row per metric per tap:

That is:
	•	3 metrics × 2 taps = 6 rows (minimum)

Example flushed row:

{
  "trace_id": "trace_2026-01-01T00-00-02.100Z_3333_4444",
  "station_key": "St_3_3333",
  "tap": "PRE",
  "metric_key": "pcm.rms_dbfs",
  "bucket_ts": "2026-01-01T00:00:00.000Z",
  "bucket_ms": 5000,
  "count": 145,
  "min": -36.2,
  "max": -18.5,
  "avg": -24.1,
  "last": -22.9
}

Same structure for:
	•	pcm.peak_dbfs
	•	pcm.clipping_ratio
and again for tap=POST.

⸻

5) Bucket B Example (00:00:05–00:00:10)

Now the call is fully inside Bucket B for the next 5 seconds (assume it continues).

Bucket B will typically be “full”:
	•	Frames: 250
	•	Samples: 80,000

Output for Bucket B
	•	Two segment files (PRE + POST) with segment_<bucket_ts_ms>.wav where bucket_ts_ms corresponds to 00:00:05.000Z
	•	Metrics flushed at 00:00:10.000Z for PRE+POST per metric

⸻

6) Call End Handling (flush partial bucket)

Assume call ends at:
	•	00:00:12.300Z

This is inside Bucket C (00:00:10–00:00:15).

On call end, the lifecycle MUST call:
	•	audioRecorder.flushTrace(trace_id)
	•	aggregator.flushAll() (or flush only that trace/bucket if implemented)

Result

Bucket C is finalized even though it’s not complete:
	•	Audio segments PRE+POST are written for Bucket C (padded/truncated to exactly 5 seconds)
	•	Aggregated metrics for Bucket C are flushed for all touched series

⸻

7) End-to-End “What Exists” for this trace

If this call touched buckets A, B, and C:

Audio files created

For each bucket (A, B, C):
	•	PRE segment WAV (5s)
	•	POST segment WAV (5s)

Total: 3 buckets × 2 = 6 WAV files

DB rows created

Per bucket:

Audio index table
	•	2 rows (PRE/POST)

Metrics agg table
	•	(#metrics * #taps) rows
Example: 3 metrics × 2 taps = 6 rows

So per bucket:
	•	Audio index: 2
	•	Metrics: 6
Total per bucket: 8 rows

For 3 buckets: 24 rows, plus trace row and optional knob snapshot rows.

⸻

8) How Everything Links (single query logic)

For any given trace_id, station, and time window:
	•	Find buckets in metrics_agg_5s (by bucket_ts)
	•	For each bucket_ts, fetch matching audio in audio_segments_5s
	•	For each bucket_ts, fetch knob snapshot (if stored) in knob_snapshots_5s

Key join fields:
	•	trace_id
	•	station_key
	•	bucket_ts
	•	tap (for audio + metrics)

⸻
