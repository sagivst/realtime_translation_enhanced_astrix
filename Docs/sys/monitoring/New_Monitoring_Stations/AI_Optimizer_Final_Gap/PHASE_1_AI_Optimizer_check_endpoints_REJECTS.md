

Stage 1 AI Rejects Document

Optimizer Integration – Phase 1 (Minimum Viable Connectivity)

Audience: Development Team
Scope: Stage 1 ONLY
Out of Scope: Optimization logic, idempotency, config versioning, audio analysis, SSE/WebSocket, ML

⸻

1. Stage 1 Definition (Authoritative)

Stage 1 objective:

Ensure that the Optimizer can safely connect to the system, discover active traces, pull structurally stable snapshots, and handle empty / partial data without breaking.

Stage 1 explicitly does NOT include:
	•	Decision logic
	•	Knob verification
	•	Audio-based reasoning
	•	Deterministic application guarantees

⸻

2. Mandatory Endpoints (Stage 1)

The following endpoints must exist and be stable.

2.1 GET /api/traces/active

Required Behavior
	•	Always returns HTTP 200
	•	Always returns valid JSON
	•	Never returns null where arrays are expected

Required Response Shape

{
  "success": true,
  "active": [
    {
      "trace_id": "string",
      "started_at": "ISO-8601 UTC (ms, Z)",
      "src_extension": "string",
      "dst_extension": "string",
      "stations": ["string", "..."]
    }
  ]
}

Edge Case (No Active Traces)

{
  "success": true,
  "active": []
}


⸻

2.2 GET /api/optimizer/snapshot

Required Query Parameters
	•	trace_id (string, required)
	•	limit (integer, optional, default = 1)

Required Behavior
	•	Returns completed buckets only
	•	If no buckets are available → returns empty array
	•	Must never return null for buckets

Required Response Shape (Stage 1)

{
  "success": true,
  "trace_id": "trace_123",
  "buckets": [
    {
      "bucket_ts": "ISO-8601 UTC (ms, Z)",
      "bucket_ms": 5000,
      "station_key": "St_3_3333",
      "metrics": {
        "PRE": {},
        "POST": {}
      },
      "knobs_snapshot": {}
    }
  ]
}

Edge Case (No Buckets Yet)

{
  "success": true,
  "trace_id": "trace_123",
  "buckets": []
}

⚠️ Important:
Fields such as config_version, audio links, last_knob_event_id are explicitly NOT required in Stage 1.

⸻

3. Time Semantics (Stage 1 Mandatory)

3.1 Bucket Timing
	•	bucket_ms must always equal 5000
	•	bucket_ts must:
	•	be UTC
	•	include milliseconds
	•	end with Z

Valid Example

2026-01-04T10:15:30.000Z


⸻

4. Error Handling Rules (Stage 1)

4.1 Invalid Request
	•	Missing trace_id
	•	Malformed timestamp

Response

HTTP/400

{
  "success": false,
  "error": "BAD_REQUEST"
}


⸻

4.2 Unknown Trace

HTTP/404

{
  "success": false,
  "error": "TRACE_NOT_FOUND"
}


⸻

4.3 Internal Failure

HTTP/500

{
  "success": false,
  "error": "INTERNAL_ERROR"
}


⸻

5. Non-Blocking Requirement (Stage 1)
	•	Snapshot generation must never block audio processing
	•	All snapshot assembly must be:
	•	async
	•	fire-and-forget
	•	resilient to partial data

If metrics or knobs are unavailable:
	•	return empty objects
	•	do not error

⸻

6. Compatibility Contract (Stage 1)

Once Stage 1 is marked complete:
	•	Field names introduced in Stage 1 must not be renamed
	•	Types introduced in Stage 1 must not change
	•	New fields may be added in later stages (backward compatible only)

⸻

7. Stage 1 Acceptance Checklist (Binary)

Item	Status
/api/traces/active always returns stable JSON	⬜
/api/optimizer/snapshot never returns null arrays	⬜
Empty system state handled gracefully	⬜
Bucket timing fixed at 5000 ms	⬜
ISO timestamps consistent	⬜
Errors return correct HTTP codes	⬜
No blocking in audio path	⬜

All boxes must be checked to declare Stage 1 complete.

⸻

8. What Happens Next (Not Part of Stage 1)
	•	Stage 2: Deterministic apply + verification
	•	Stage 3: Audio-aware optimization
	•	Stage 4: Closed-loop learning

⸻

9. Final Statement

If the above requirements are met, the Optimizer can safely connect, poll, and observe the system without causing failures or false assumptions.

This concludes Stage 1.

