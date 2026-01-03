

Real-Time Audio Optimizer – Pull-Based Integration Specification

For NEW Monitoring System (STTTTSserver)

Document version: 1.0
Last updated: 2026-01-03
Target system: STTTTSserver @ http://20.170.155.53:3020
Optimizer mode: PULL (5-second cadence)

⸻

1. Purpose

This document defines the exact API contract, data flow, and execution model required to connect an external Optimizer to the NEW Monitoring System in order to perform continuous, real-time audio optimization.

The Optimizer:
	•	Observes audio quality metrics (PRE/POST)
	•	Correlates them with effective knobs
	•	Applies controlled knob updates
	•	Verifies impact in subsequent buckets

All operations are aligned to fixed 5-second aggregation buckets.

⸻

2. Design Principles (Non-Negotiable)
	1.	Pull-based only (no WebSocket, no SSE)
	2.	Bucket-aligned (all actions tied to bucket_ts)
	3.	Idempotent control (safe retries)
	4.	Deterministic verification (observe → decide → apply → verify)
	5.	No blocking of audio path
	6.	Stateless optimizer (server is source of truth)

⸻

3. Optimizer Execution Loop (High-Level)

The Optimizer runs a loop every 5 seconds.

Loop Sequence (Strict Order)

1. Discover active traces
2. Pull latest completed bucket snapshot
3. Analyze PRE vs POST metrics
4. Decide knob adjustments (if any)
5. Schedule knob application for NEXT bucket
6. On next loop: verify effect


⸻

4. Time Model
	•	Bucket duration: 5000 ms
	•	Bucket timestamp: ISO-8601, aligned to wall clock
	•	Example: 2026-01-03T21:15:00.000Z
	•	Rule:
Knob updates are NEVER applied to the currently observed bucket, only to a future bucket.

⸻

5. Required API Endpoints (MANDATORY)

5.1 Active Trace Discovery

GET /api/traces/active
Purpose:
Discover which calls/traces are currently active and eligible for optimization.

Response (REQUIRED):

{
  "success": true,
  "active": [
    {
      "trace_id": "trace_abc123",
      "started_at": "2026-01-03T21:14:52.100Z",
      "src_extension": "3333",
      "dst_extension": "4444",
      "call_id": "optional",
      "stations": ["St_3_3333", "St_3_4444"]
    }
  ]
}


⸻

5.2 Unified Snapshot (Core Optimizer Input)

GET /api/optimizer/snapshot
Purpose:
Retrieve complete, consistent optimization input for one or more completed buckets.

Query Parameters:
	•	trace_id (required)
	•	since_bucket_ts (optional)
	•	limit (optional, default = 1)

Response (MANDATORY STRUCTURE):

{
  "success": true,
  "trace_id": "trace_abc123",
  "buckets": [
    {
      "bucket_ts": "2026-01-03T21:15:00.000Z",
      "bucket_ms": 5000,
      "station_key": "St_3_3333",

      "knobs_snapshot": {
        "pcm.input_gain_db": 0,
        "limiter.threshold_dbfs": -6,
        "compressor.enabled": false
      },

      "metrics": {
        "PRE": {
          "pcm.rms_dbfs": {
            "count": 145,
            "min": -36.2,
            "max": -18.5,
            "avg": -24.1,
            "last": -22.9
          },
          "pcm.clipping_ratio": {
            "count": 145,
            "avg": 0.0002,
            "max": 0.002
          }
        },
        "POST": {
          "pcm.rms_dbfs": {
            "count": 145,
            "avg": -18.9,
            "max": -6.2
          }
        }
      },

      "audio": {
        "PRE": {
          "endpoint": "/api/audio/segment?trace_id=trace_abc123&station_key=St_3_3333&tap=PRE&bucket_ts=2026-01-03T21:15:00.000Z"
        },
        "POST": {
          "endpoint": "/api/audio/segment?trace_id=trace_abc123&station_key=St_3_3333&tap=POST&bucket_ts=2026-01-03T21:15:00.000Z"
        }
      },

      "config_version": 41,
      "last_knob_event_id": 128
    }
  ]
}

Guarantees:
	•	All data refers to the same completed bucket
	•	Metrics, knobs, and audio are consistent
	•	No partial state

⸻

5.3 Audio Segment Retrieval

GET /api/audio/segment
Query Parameters:
	•	trace_id
	•	station_key
	•	tap = PRE | POST
	•	bucket_ts

Response:
	•	Binary WAV
	•	Headers:
	•	Content-Type: audio/wav
	•	X-Sample-Rate: 16000
	•	X-Channels: 1
	•	X-Bucket-MS: 5000

⸻

5.4 Apply Knobs (Optimizer Control Plane)

POST /api/optimizer/knobs/apply
Purpose:
Schedule deterministic knob changes for a future bucket.

Request Body (MANDATORY):

{
  "trace_id": "trace_abc123",
  "station_key": "St_3_3333",
  "apply_at_bucket_ts": "2026-01-03T21:15:10.000Z",
  "idempotency_key": "2b9d3c6e-9b6e-4f9d-9a34-9a6cfe21c1aa",
  "source": "auto_optimizer",
  "reason": "reduce clipping while maintaining RMS target",
  "knobs": {
    "pcm.input_gain_db": -3,
    "limiter.threshold_dbfs": -6
  }
}

Response:

{
  "success": true,
  "accepted": true,
  "apply_at_bucket_ts": "2026-01-03T21:15:10.000Z",
  "config_version": 42,
  "effective_knobs": {
    "pcm.input_gain_db": -3,
    "limiter.threshold_dbfs": -6
  }
}

Rules:
	•	Updates are clamped & validated server-side
	•	Duplicate idempotency_key MUST be safe
	•	Apply happens only at bucket boundary

⸻

6. Verification & Feedback Loop

The Optimizer MUST verify its own actions.

Verification Method
	1.	After applying knobs, wait for next loop
	2.	Call GET /api/optimizer/snapshot
	3.	Confirm:
	•	config_version increased
	•	knobs_snapshot reflects expected values
	•	Metrics moved in desired direction

No verification → no further optimization.

⸻

7. Error Handling (Required)

HTTP	Meaning
400	Invalid request / unknown knob
404	Trace / bucket / audio not found
409	Bucket mismatch (late update)
429	Rate limit exceeded
500	Internal error


⸻

8. Optimizer Rate Limits
	•	Max knob apply: 1 per station per bucket
	•	Max snapshot pull: 1 per trace per 5s
	•	Retry policy: exponential backoff, max 3 retries

⸻

9. Security (Minimum)

For production:
	•	Require Authorization: Bearer <token>
	•	Token scoped to:
	•	read:snapshots
	•	read:audio
	•	write:knobs

⸻

10. Non-Goals (Explicit)

The Optimizer:
	•	❌ Does NOT write directly to DB
	•	❌ Does NOT assume real-time streaming
	•	❌ Does NOT modify audio pipeline code
	•	❌ Does NOT operate mid-bucket

⸻

11. Summary (What This Enables)

With this contract in place, the system supports:
	•	Deterministic, explainable optimization
	•	PRE vs POST audio comparison
	•	Safe automated knob tuning
	•	Reproducible optimization runs
	•	Deferred/offline analysis using stored audio

⸻

12. Next Steps (Implementation Order)
	1.	Implement /api/traces/active
	2.	Implement /api/optimizer/snapshot
	3.	Implement /api/audio/segment
	4.	Implement /api/optimizer/knobs/apply
	5.	Add minimal auth (optional but recommended)
	6.	Connect Optimizer loop (Pull every 5s)

