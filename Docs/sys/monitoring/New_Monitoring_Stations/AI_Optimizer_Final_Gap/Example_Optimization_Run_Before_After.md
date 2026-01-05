

Appendix C – Example Optimization Run (Before / After)

Trace: trace_abc123
Station: St_3_3333 (PCM Egress)
Bucket size: 5 seconds
Tap: PRE / POST
Objective:
	•	Eliminate clipping
	•	Maintain intelligible loudness (target RMS ≈ −18 dBFS)
	•	Do not increase latency

⸻

C.1 Initial Conditions (Baseline)

Effective Knobs (Before)

{
  "pcm.input_gain_db": 0,
  "pcm.output_gain_db": 0,
  "limiter.enabled": true,
  "limiter.threshold_dbfs": -6,
  "compressor.enabled": false,
  "noise_gate.enabled": false
}

Observation Window

bucket_ts = 2026-01-03T21:15:00.000Z


⸻

C.2 Metrics Snapshot – BEFORE Optimization

PRE Metrics (Input to DSP)

Metric	Value
pcm.rms_dbfs.avg	−24.1 dBFS
pcm.peak_dbfs.max	−6.0 dBFS
pcm.clipping_ratio.avg	0.0000
pcm.zero_crossing_rate.avg	210


⸻

POST Metrics (Output of DSP)

Metric	Value
pcm.rms_dbfs.avg	−18.9 dBFS
pcm.peak_dbfs.max	−1.8 dBFS
pcm.clipping_ratio.avg	0.0042 (0.42%)
pipe.processing_latency_ms.avg	0.7 ms


⸻

Audio Assessment (POST, subjective)
	•	Audible distortion on plosives
	•	First syllables clipped
	•	Loud speech segments harsh

⸻

C.3 Optimizer Analysis (Decision Phase)

Detected Issues
	1.	Clipping ratio > 0.1%
→ violates quality constraint
	2.	RMS already near target
→ no need to increase loudness
	3.	Limiter already active
→ limiter alone insufficient

⸻

Decision Logic (Simplified)

IF clipping_ratio > 0.001:
    reduce pcm.input_gain_db

Severity-based adjustment:
	•	clipping_ratio = 0.0042 → moderate
	•	chosen delta = −3 dB

⸻

C.4 Knob Update Issued

Apply Command

POST /api/optimizer/knobs/apply

{
  "trace_id": "trace_abc123",
  "station_key": "St_3_3333",
  "apply_at_bucket_ts": "2026-01-03T21:15:05.000Z",
  "idempotency_key": "c1f1b2e7-9d3a-4f5d-b8a1-01cfd2f6e4aa",
  "source": "auto_optimizer",
  "reason": "POST clipping > 0.1%, reduce input gain",
  "knobs": {
    "pcm.input_gain_db": -3
  }
}

System response:

{
  "accepted": true,
  "config_version": 42
}


⸻

C.5 Metrics Snapshot – AFTER Optimization

Observation Window

bucket_ts = 2026-01-03T21:15:05.000Z

Effective Knobs

{
  "pcm.input_gain_db": -3,
  "limiter.enabled": true,
  "limiter.threshold_dbfs": -6
}


⸻

PRE Metrics (Input to DSP)

Metric	Value
pcm.rms_dbfs.avg	−27.0 dBFS
pcm.peak_dbfs.max	−9.1 dBFS
pcm.clipping_ratio.avg	0.0000


⸻

POST Metrics (Output of DSP)

Metric	Value
pcm.rms_dbfs.avg	−19.8 dBFS
pcm.peak_dbfs.max	−4.3 dBFS
pcm.clipping_ratio.avg	0.0003 (0.03%)
pipe.processing_latency_ms.avg	0.7 ms


⸻

Audio Assessment (POST, subjective)
	•	No audible distortion
	•	Clean consonants
	•	Stable loudness
	•	Natural dynamics preserved

⸻

C.6 Before / After Comparison (Key Metrics)

Metric	Before	After	Delta
POST RMS avg	−18.9 dBFS	−19.8 dBFS	−0.9 dB
POST Peak max	−1.8 dBFS	−4.3 dBFS	−2.5 dB
POST Clipping ratio	0.42%	0.03%	−93%
Processing latency	0.7 ms	0.7 ms	0


⸻

C.7 Optimizer Verification Step

Optimizer performs next pull:

GET /api/optimizer/snapshot?trace_id=trace_abc123&limit=1

Verification conditions:
	•	knobs_snapshot.pcm.input_gain_db == -3 ✅
	•	clipping_ratio < 0.001 ✅
	•	RMS within target band (−20 ± 2 dBFS) ✅

➡ Optimization accepted. No further action.

⸻

C.8 Stability & Cooldown

Optimizer enters cooldown:
	•	Duration: 2 buckets (10 seconds)
	•	Purpose: avoid oscillation / knob thrashing

No further knob changes unless:
	•	clipping reappears
	•	RMS drifts outside band
	•	noise profile changes significantly

⸻

C.9 Outcome Summary

Result:
	•	Quality improved
	•	Distortion removed
	•	Loudness preserved
	•	No latency penalty
	•	Change fully traceable & explainable

Artifacts produced:
	•	PRE/POST metrics
	•	PRE/POST audio
	•	knob_events entry
	•	knob_snapshot_5s
	•	deterministic config_version increment

⸻

C.10 Why This Matters

This run demonstrates that the system supports:
	•	Closed-loop optimization
	•	Causal reasoning (PRE → DSP → POST)
	•	Deterministic control
	•	Auditability (every change explainable)
	•	Safe real-time operation

