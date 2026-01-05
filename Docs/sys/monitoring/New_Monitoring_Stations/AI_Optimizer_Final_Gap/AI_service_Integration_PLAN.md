
AI Optimizer Service – Full Implementation Specification

Deployment: Same VM (20.170.155.53)
Version: Production Phase 3 – Verification & Operation

⸻

1. Purpose (Non-Negotiable)

The system uses an external intelligent AI service to decide audio optimization actions.
The local Optimizer Agent is intentionally non-intelligent and acts only as a transport and executor.

All intelligence, decision-making, and optimization logic lives exclusively in the AI Service.

⸻

2. Components (Fixed Roles)

2.1 STTTTSserver (Existing)
	•	Owns:
	•	Audio processing
	•	Metrics collection
	•	Knob application
	•	Persistence
	•	Exposes APIs:
	•	/api/traces/active
	•	/api/optimizer/snapshot
	•	/api/optimizer/knobs/apply

⸻

2.2 Optimizer Agent (Local, Dumb)
	•	Runs as a background process (PM2)
	•	Responsibilities:
	•	Poll active traces
	•	Fetch latest snapshots
	•	Forward snapshots to AI Service
	•	Apply returned decisions verbatim
	•	Contains ZERO optimization logic

⸻

2.3 AI Optimizer Service (This Document)
	•	Runs on the same VM
	•	Local-only HTTP service
	•	Responsibilities:
	•	Receive snapshots
	•	Reason over metrics + audio references
	•	Decide knob changes
	•	Return deterministic actions
	•	Uses OpenAI API internally

⸻

3. Network & Ports (Mandatory)

Component	Address	Port	Exposure
STTTTSserver	127.0.0.1	3020	internal
AI Service	127.0.0.1	3090	internal only
Optimizer Agent	local process	—	internal

AI Service MUST bind to 127.0.0.1 only
No public exposure.

⸻

4. Runtime Lifecycle

4.1 Startup Order
	1.	PostgreSQL
	2.	STTTTSserver (PM2)
	3.	AI Service (PM2)
	4.	Optimizer Agent (PM2)

No component waits for events from others.

⸻

5. Control Flow (Authoritative)

[Optimizer Agent Loop – every 5s]
        |
        v
GET /api/traces/active
        |
        v
For each active trace:
    GET /api/optimizer/snapshot?trace_id=...
        |
        v
POST http://127.0.0.1:3090/v1/optimize
        |
        v
Receive decisions[]
        |
        v
POST /api/optimizer/knobs/apply

There is no “start optimization” signal.
Optimization exists as long as the Agent process is running.

⸻

6. AI Service – Required Implementation

6.1 Technology Choice (Final)
	•	Node.js 20+
	•	Express.js
	•	node-fetch (or native fetch)

Rationale:
	•	Same stack as STTTTSserver
	•	Lower operational friction
	•	PM2-native

⸻

7. AI Service – API Contract

7.1 Health

GET /v1/health

Response

{ "ok": true }


⸻

7.2 Optimize (Core Endpoint)

POST /v1/optimize

Request (Strict)

{
  "trace_id": "string",
  "bucket_ts": "ISO-8601",
  "bucket_ms": 5000,
  "station_key": "St_3_3333",
  "config_version": 12,

  "metrics": {
    "PRE": {
      "pcm.rms_dbfs": { "avg": -24.3 },
      "pcm.clipping_ratio": { "avg": 0.0 }
    },
    "POST": {
      "pcm.rms_dbfs": { "avg": -20.1 },
      "pcm.clipping_ratio": { "avg": 0.002 }
    }
  },

  "knobs_snapshot": {
    "pcm.input_gain_db": 0,
    "limiter.enabled": true,
    "limiter.threshold_dbfs": -6
  },

  "audio": {
    "pre_url": "http://127.0.0.1:3020/api/audio/segment/...",
    "post_url": "http://127.0.0.1:3020/api/audio/segment/..."
  },

  "policy": {
    "target_rms_dbfs": -18,
    "max_gain_step_db": 2,
    "max_clipping_ratio": 0.002
  }
}


⸻

7.3 Response (Strict)

{
  "decisions": [
    {
      "station_key": "St_3_3333",
      "apply_in_buckets": 1,
      "knobs": {
        "pcm.input_gain_db": 2
      },
      "reason": "RMS below target; safe +2 dB increase",
      "confidence": 0.82
    }
  ]
}

Rules:
	•	No free text outside JSON
	•	Knobs MUST be absolute deltas or absolute values (consistent with system)
	•	Service must never suggest unsafe values

⸻

8. AI Service – Server Skeleton (Mandatory)

ai-service/server.js

import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "5mb" }));

const PORT = 3090;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");

app.get("/v1/health", (_, res) => res.json({ ok: true }));

app.post("/v1/optimize", async (req, res) => {
  const snapshot = req.body;

  // Build deterministic prompt
  const payload = {
    model: "gpt-5.2",
    input: [
      {
        role: "system",
        content:
          "You are an audio optimization engine. " +
          "Return STRICT JSON ONLY: {decisions:[{station_key, apply_in_buckets, knobs, reason, confidence}]} " +
          "Never exceed policy limits."
      },
      {
        role: "user",
        content: JSON.stringify(snapshot)
      }
    ],
    reasoning: { effort: "low" },
    text: { verbosity: "low" }
  };

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await r.json();
  if (!r.ok) {
    return res.status(500).json({ error: "OpenAI failure", details: data });
  }

  const raw =
    data.output?.[0]?.content?.map(c => c.text).join("") ?? "";

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return res.status(500).json({ error: "Invalid JSON from model", raw });
  }

  // Final validation layer (mandatory)
  parsed.decisions = (parsed.decisions || []).filter(d =>
    typeof d.station_key === "string" &&
    typeof d.knobs === "object"
  );

  res.json(parsed);
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`AI Optimizer Service running on 127.0.0.1:${PORT}`);
});


⸻

9. Optimizer Agent – Required Behavior
	•	Starts automatically via PM2
	•	Immediately begins polling
	•	Never waits for signals
	•	Never decides anything

Core Rule

If the Agent is running, optimization is active.

⸻

10. PM2 Configuration

pm2 start ai-service/server.js --name ai-optimizer
pm2 start optimizer-agent.js --name optimizer-agent
pm2 save


⸻

11. Validation & Safety

Mandatory checks in AI Service:
	•	Clamp gain deltas
	•	Reject unknown knobs
	•	Enforce policy bounds
	•	Reject malformed responses

AI Service must fail closed:
	•	If error → return no decisions

⸻

12. How the System “Knows” to Optimize (Final Answer)
	•	There is no notification
	•	There is no trigger
	•	There is no handshake

Optimization exists because the Optimizer Agent process is running.

When:
	•	No active traces → nothing happens
	•	Active traces appear → they are detected on the next poll

⸻

13. Acceptance Criteria (Phase 3)
	•	AI Service reachable on 127.0.0.1:3090
	•	Optimizer Agent applies AI decisions
	•	Knobs change only at bucket boundaries
	•	No optimization logic exists outside AI Service
	•	System behaves deterministically under restart

⸻

14. Final Architectural Statement

The Optimizer Agent is a courier.
STTTTSserver is an executor.
The AI Service is the brain.

No other interpretation is allowed.

⸻
