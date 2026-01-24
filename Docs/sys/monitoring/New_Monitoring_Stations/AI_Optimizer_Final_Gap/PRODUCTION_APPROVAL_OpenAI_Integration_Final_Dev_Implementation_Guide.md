⸻

📘 OpenAI Integration – Final Developer Implementation Guide

Audio Optimization System (Production-Approved Pipeline)

Document Status: FINAL
Audience: Backend / Platform / DevOps Engineers
Scope: OpenAI provider wiring only
System State: ✅ Production-approved (rule-based AI currently active)

⸻

1. Purpose of This Document

This document defines exactly what the development team must implement in order to:
	•	Replace the rule-based AI placeholder with OpenAI
	•	Preserve the existing Metrics → AI → Knobs contract
	•	Maintain safety, idempotency, auditability, and determinism
	•	Reach 100% production readiness

⚠️ This is not a redesign, refactor, or experimentation phase.
⚠️ The optimizer pipeline is already validated and approved.

⸻

2. Current System State (Baseline)

The following components are already implemented and verified:
	•	Metrics collection (PCM / RTP / STT / TTS)
	•	Snapshot aggregation (5-second buckets)
	•	Optimizer agent
	•	Permission gating (ai.optimization_allowed)
	•	Knob validation & limits
	•	BucketScheduler with idempotency
	•	Rollback protection
	•	Full audit trail (DB + logs)

👉 Only the AI decision engine is a placeholder.

⸻

3. Responsibility Boundaries (Non-Negotiable)

3.1 Who Owns the OpenAI API Key

The development team owns the API key.
	•	The key must not:
	•	Be shared in chat
	•	Be committed to Git
	•	Be sent to reviewers
	•	The key must be stored in:
	•	Azure Key Vault / AWS Secrets Manager / environment variable

Example:

OPENAI_API_KEY=***


⸻

3.2 What Is NOT Allowed
	•	❌ No schema changes
	•	❌ No metric mutation
	•	❌ No direct knob application (scheduler only)
	•	❌ No bypassing permission checks
	•	❌ No AI-driven logic outside the optimizer

⸻

4. Integration Architecture (Target State)

Metrics (read-only)
        ↓
Snapshot (JSON)
        ↓
Optimizer Agent
        ↓
OpenAI Client  ← (NEW provider)
        ↓
Decision JSON (knobs only)
        ↓
Scheduled Knob Updates
        ↓
BucketScheduler
        ↓
Applied at next bucket boundary

Important:
The OpenAI model is a pure function:

snapshot → decisions

No side effects.

⸻

5. OpenAI Request Contract (MANDATORY)

5.1 Input to OpenAI

The exact snapshot JSON already produced by the system.

Example (simplified):

{
  "trace_id": "GLOBAL",
  "bucket_id": 1002,
  "window_sec": 5,
  "station_key": "St_3_3333",
  "metrics": {
    "pcm.rms_dbfs": -28.3,
    "pcm.peak_dbfs": -15.2,
    "pcm.clipping_ratio": 0.0089
  },
  "knobs": {
    "pcm.input_gain_db": 0,
    "agc.enabled": false,
    "ai.optimization_allowed": true
  }
}

5.2 Mandatory Pre-Check (Before Calling OpenAI)

if (!snapshot.knobs["ai.optimization_allowed"]) {
  return { decisions: [], blocked_reason: "AI_DISABLED" };
}


⸻

6. OpenAI Response Contract (MANDATORY)

6.1 Required JSON Structure

{
  "decisions": [
    {
      "knob": "pcm.input_gain_db",
      "recommended_value": 2,
      "confidence": 0.8,
      "reason": "RMS below target range"
    }
  ]
}

6.2 Hard Rules (Enforced)
	•	✅ Only knobs, never metrics
	•	✅ 2–5 actions maximum
	•	✅ Values within registry min/max
	•	✅ Human-readable reason required
	•	❌ No timestamps
	•	❌ No scheduling logic
	•	❌ No state assumptions

⸻

7. Safety & Validation Layer (Must Remain)

Every AI decision must pass existing validation:
	1.	Knob exists in KnobsRegistry
	2.	Value within allowed range
	3.	AI permission allowed
	4.	Max adjustment percent enforced
	5.	Rollback flag respected

Invalid decisions → discarded + logged

⸻

8. Scheduling Rules (UNCHANGED)
	•	AI decisions are never applied immediately
	•	Decisions are stored as future scheduled updates
	•	Application happens only at next 5-second bucket
	•	Idempotency enforced via UUID

This logic already works — do not touch it.

⸻

9. Error Handling Requirements

9.1 OpenAI Failure Strategy

Failure	Action
Timeout (>2s)	Retry (max 2)
API error	Fallback to rule-based
Invalid JSON	Discard + log
Rate limit	Backoff + fallback

System must never stall due to AI.

⸻

10. Logging & Observability (REQUIRED)

Each OpenAI call must log:
	•	trace_id
	•	station_key
	•	bucket_id
	•	model
	•	request_id
	•	token_usage
	•	decision_count
	•	latency_ms
	•	fallback_used (true/false)

No sensitive data logged.

⸻

11. Acceptance Test (FINAL STEP)

After wiring OpenAI, run one real call (10–15 minutes).

Dev Team Must Provide These 4 Artifacts:
	1.	One real snapshot JSON
	2.	One real OpenAI response JSON
	3.	BucketScheduler log (APPLY + SKIP shown)
	4.	SQL output: 10 min before / after
	•	avg RMS
	•	avg clipping
	•	trace_id included

Once pasted — approval is binary and immediate.

⸻

12. Timeline Expectation

Task	Typical Time
API key injection	5–10 min
Client wiring	30–60 min
Test call	15 min
Logs & artifacts	10 min

⏱️ Same day delivery is expected.

⸻

13. Final Clarification
	•	This system is already production-approved
	•	OpenAI is a provider swap
	•	No architectural risk remains
	•	Any delay beyond this point is organizational, not technical

⸻

14. Final Instruction to Dev Team

Implement OpenAI exactly as specified above.
Do not modify schemas, contracts, or scheduling logic.
Provide the 4 artifacts.
Approval will be immediate.

⸻
