
⸻

OpenAI Integration – Production Approval Requirements

Optimizer & Audio Monitoring System

Purpose

This document defines the mandatory artifacts and evidence required from the development team in order to approve the system as Production-Grade after replacing the placeholder AI service with a real OpenAI integration.

The goal is to verify that:
	•	The AI service complies with the agreed API contract
	•	Optimization decisions are safe, deterministic, and auditable
	•	Measurable audio quality improvements are achieved
	•	Rollback and safety mechanisms function correctly

⸻

Required Deliverables (Mandatory)

The following four deliverables must be provided together for approval.

⸻

1️⃣ Real Snapshot Sample (JSON)

Description

A real, unmodified snapshot JSON retrieved from production-like execution, representing a single optimization decision point.

Requirements
	•	Must be taken from a live call trace
	•	Must include actual measured metrics (not mocks)
	•	Must reflect a real bucket interval (e.g., 5s aggregation)

Mandatory Fields

{
  "trace_id": "trace_2026-01-05T20-13-57-707Z",
  "station_key": "station.generic",
  "bucket_ts": "2026-01-05T20:14:05.000Z",
  "tap": "PRE | POST",
  "metrics": {
    "pcm.rms_dbfs": -21.4,
    "pcm.peak_dbfs": -3.2,
    "pcm.clipping_ratio": 0.014,
    "pcm.noise_floor": -48.7,
    "health.audio_score": 62.3
  },
  "current_knobs": {
    "pcm.input_gain_db": 0,
    "limiter.enabled": true,
    "agc.enabled": false
  }
}

Acceptance Criteria
	•	All metric names must exist in MetricsRegistry
	•	All knob names must exist in KnobsRegistry
	•	Values must be numerically valid and realistic
	•	Timestamp and bucket alignment must be correct

⸻

2️⃣ Real AI Service Response (JSON)

Description

The actual response returned by OpenAI-backed AI service for the snapshot above.

This must NOT be rule-based fallback logic.

Requirements
	•	Must include 2–5 knob actions
	•	Must include explicit reasoning
	•	Must be idempotent and schedulable

Mandatory Structure

{
  "trace_id": "trace_2026-01-05T20-13-57-707Z",
  "bucket_ts": "2026-01-05T20:14:05.000Z",
  "applies_at_bucket_ts": "2026-01-05T20:14:10.000Z",
  "actions": [
    {
      "knob_key": "pcm.input_gain_db",
      "value": 3,
      "reason": "RMS level below optimal range",
      "confidence": 0.87,
      "idempotency_uuid": "e3b0c442-98fc-1c14-9afb-4c8996fb924"
    },
    {
      "knob_key": "agc.enabled",
      "value": true,
      "reason": "High variance in speech energy",
      "confidence": 0.79,
      "idempotency_uuid": "a19dbe72-cc41-4eaa-8a78-11bbf5e8a7d9"
    }
  ]
}

Acceptance Criteria
	•	Every knob_key must pass validateKnobValue()
	•	Values must respect min/max limits
	•	applies_at_bucket_ts must be future-aligned
	•	idempotency_uuid must be stable and unique
	•	Response must be explainable (human-readable reasons)

⸻

3️⃣ BucketScheduler Execution Logs

Description

Logs proving that AI decisions are scheduled and applied correctly by the BucketScheduler.

Required Evidence

Logs covering at least 2 consecutive buckets, showing:
	•	Snapshot retrieval
	•	AI decision acceptance
	•	Scheduling
	•	Actual knob application

Example (simplified)

[BucketScheduler] bucket=20:14:05 trace=trace_2026...
[BucketScheduler] scheduling 2 actions for 20:14:10
[BucketScheduler] applying knob pcm.input_gain_db=3
[BucketScheduler] applying knob agc.enabled=true
[BucketScheduler] success

Acceptance Criteria
	•	No early or late application
	•	No duplicate application (idempotency enforced)
	•	No silent failures
	•	Clear trace_id correlation

⸻

4️⃣ Before / After Metrics Comparison (SQL)

Description

SQL output demonstrating measurable improvement after AI-driven optimization.

Time Window
	•	10 minutes BEFORE first AI action
	•	10 minutes AFTER AI actions start applying

Required Metrics

At minimum:
	•	pcm.rms_dbfs
	•	pcm.clipping_ratio

Required Grouping
	•	Grouped by bucket_ts
	•	Filtered by trace_id

Example Query

SELECT
  bucket_ts,
  AVG(pcm_rms_dbfs) AS avg_rms,
  AVG(pcm_clipping_ratio) AS avg_clipping
FROM metrics_aggregated
WHERE trace_id = 'trace_2026-01-05T20-13-57-707Z'
  AND bucket_ts BETWEEN
      '2026-01-05T20:04:00' AND '2026-01-05T20:24:00'
GROUP BY bucket_ts
ORDER BY bucket_ts;

Acceptance Criteria
	•	RMS moves closer to defined optimal range
	•	Clipping ratio does not increase (preferably decreases)
	•	No increase in processing latency
	•	No instability or oscillation patterns

⸻

Final Approval Statement

Once the snapshot JSON and the first real AI response JSON are provided (even if partially redacted), I will:
	•	Verify strict compliance with the optimization contract
	•	Identify any safety, timing, or design violations
	•	Provide explicit confirmation whether the system is Production-Grade
	•	Or list exact corrective actions required for approval

⸻

This checklist is mandatory and non-negotiable for production approval.