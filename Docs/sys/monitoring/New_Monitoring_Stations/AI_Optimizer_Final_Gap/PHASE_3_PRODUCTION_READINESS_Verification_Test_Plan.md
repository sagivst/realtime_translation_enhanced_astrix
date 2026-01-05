Below is a Stage/Phase 3 (Production) Verification Test Plan you can run and then paste the outputs back to me for approval.
This plan assumes Stage 1 + Stage 2 already PASS and focuses only on what typically makes Stage 3 “production-grade” per the roadmap: closed-loop optimizer execution, audio availability, metrics correctness, safety limits, retention/cleanup, and operational reliability.

⸻

PHASE 3 (PRODUCTION) Verification Test Plan

Goal: Prove the system is production-ready for continuous optimizer operation (24/7), multi-trace, with audio+metrics, safe controls, retention, and resilience.

0) Preconditions

Set:

API="http://20.170.155.53:3020"

Have available:
	•	curl, jq
	•	psql access to monitoring_v2 (recommended)
	•	Ability to place at least two simultaneous calls (3333↔4444) for concurrency tests

⸻

A) Production API Surface (must exist)

A1) Health / status endpoint returns “production signals”

curl -sS "$API/api/monitoring/status" | jq .

PASS if:
	•	HTTP 200
	•	isRunning: true
	•	includes counters for inserts/errors (or equivalent)
	•	includes DB connectivity state (or equivalent)

✅ Send me: full JSON

⸻

A2) Optimizer snapshot includes audio endpoints (Stage 3 requirement)

Pick an active trace:

TRACE_ID="$(curl -sS "$API/api/traces/active" | jq -r '.active[0].trace_id')"
echo "TRACE_ID=$TRACE_ID"
curl -sS "$API/api/optimizer/snapshot?trace_id=$TRACE_ID&limit=1" | jq .

PASS if (per bucket):
	•	audio.PRE.endpoint exists
	•	audio.POST.endpoint exists
	•	endpoints are resolvable (next tests)

✅ Send me: full JSON

⸻

B) Audio correctness (binary, aligned, durable)

B1) Audio download works and is WAV

Copy audio.PRE.endpoint from snapshot and run:

EP_PRE="$(curl -sS "$API/api/optimizer/snapshot?trace_id=$TRACE_ID&limit=1" | jq -r '.buckets[0].audio.PRE.endpoint')"
echo "EP_PRE=$EP_PRE"

curl -iS "$API$EP_PRE" | head -n 60
curl -sS -o /tmp/pre.wav "$API$EP_PRE"
file /tmp/pre.wav

PASS if:
	•	Content-Type: audio/wav
	•	file identifies as WAV
	•	headers show sample rate/channels/bucket if you implemented them

✅ Send me:
	•	first ~40 header lines (curl -iS ... | head -n 60)
	•	file /tmp/pre.wav output

⸻

B2) PRE vs POST should differ when knobs change
	1.	Apply a knob change that should materially alter audio (gain is fine):

# next 5s boundary helper
next_bucket_ts() {
  python3 - <<'PY'
import datetime
now = datetime.datetime.now(datetime.timezone.utc)
ms = int(now.timestamp()*1000)
bucket=5000
nb = ((ms//bucket)+1)*bucket
dt = datetime.datetime.fromtimestamp(nb/1000, tz=datetime.timezone.utc)
print(dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3]+"Z")
PY
}
APPLY_TS="$(next_bucket_ts)"
IDEMP="$(uuidgen)"
STATION="St_3_3333"

curl -sS -X POST "$API/api/optimizer/knobs/apply" \
  -H "Content-Type: application/json" \
  -d "{
    \"trace_id\": \"$TRACE_ID\",
    \"station_key\": \"$STATION\",
    \"apply_at_bucket_ts\": \"$APPLY_TS\",
    \"idempotency_key\": \"$IDEMP\",
    \"source\": \"phase3_audio_test\",
    \"reason\": \"gain bump to validate PRE/POST delta\",
    \"knobs\": { \"pcm.input_gain_db\": 6 }
  }" | jq .

	2.	After the apply bucket passes, pull a fresh snapshot and download PRE+POST for the same bucket:

sleep 7
SNAP="$(curl -sS "$API/api/optimizer/snapshot?trace_id=$TRACE_ID&limit=2")"
echo "$SNAP" | jq .

EP_PRE="$(echo "$SNAP" | jq -r '.buckets[0].audio.PRE.endpoint')"
EP_POST="$(echo "$SNAP" | jq -r '.buckets[0].audio.POST.endpoint')"

curl -sS -o /tmp/pre.wav "$API$EP_PRE"
curl -sS -o /tmp/post.wav "$API$EP_POST"
ls -lh /tmp/pre.wav /tmp/post.wav

PASS if:
	•	both files exist
	•	sizes are plausible (not zero)
	•	RMS/peak metrics reflect the gain change (see metrics test below)

✅ Send me:
	•	apply response JSON
	•	snapshot JSON after boundary
	•	ls -lh output

⸻

C) Metrics correctness vs audio (sanity cross-check)

C1) RMS/Peak direction makes sense after gain change

From the snapshot after applying +6 dB:
	•	metrics.PRE.pcm.rms_dbfs.avg
	•	metrics.POST.pcm.rms_dbfs.avg
	•	metrics.POST.pcm.peak_dbfs.max
	•	metrics.POST.pcm.clipping_ratio.avg

PASS if:
	•	POST RMS is meaningfully higher (or at least changed) vs before
	•	clipping_ratio remains under your safety threshold OR limiter shows effect
	•	peak stays within sane headroom if limiter enabled

✅ Send me: the bucket’s metrics block (paste the JSON for metrics + knobs_snapshot)

⸻

D) Closed-loop optimizer mode (Production)

D1) Optimizer “daemon” status (must exist)

If you have an endpoint for optimizer runtime, run it (choose the real endpoint name you implemented):
	•	GET /api/optimizer/status OR
	•	GET /api/optimizer/runtime OR
	•	GET /api/optimizer/heartbeat

If you don’t have it, provide PM2 status/logs instead.

Option 1: endpoint

curl -sS "$API/api/optimizer/status" | jq .

Option 2: PM2

pm2 status
pm2 logs --lines 120

PASS if:
	•	shows running loop
	•	last tick time
	•	last processed bucket timestamp
	•	error counters available
	•	doesn’t crash/restart under normal use

✅ Send me:
	•	endpoint JSON OR PM2 outputs + last ~120 log lines

⸻

E) Safety / Guardrails (Production-hard requirements)

E1) Knob validation & clamping

Try an out-of-range value:

APPLY_TS="$(next_bucket_ts)"
curl -sS -i -X POST "$API/api/optimizer/knobs/apply" \
  -H "Content-Type: application/json" \
  -d "{
    \"trace_id\": \"$TRACE_ID\",
    \"station_key\": \"$STATION\",
    \"apply_at_bucket_ts\": \"$APPLY_TS\",
    \"idempotency_key\": \"$(uuidgen)\",
    \"source\": \"phase3_safety_test\",
    \"reason\": \"out of range\",
    \"knobs\": { \"pcm.input_gain_db\": 999 }
  }" | head -n 80

PASS if (pick one policy and enforce it):
	•	Reject with 400 + clear error, OR
	•	Clamp to max and return effective value

✅ Send me: HTTP status + body

⸻

E2) Rate limiting / anti-thrashing (must exist)

Fire 20 apply requests quickly (same trace, different idempotency keys):

APPLY_TS="$(next_bucket_ts)"
for i in $(seq 1 20); do
  curl -sS -o /dev/null -w "%{http_code}\n" -X POST "$API/api/optimizer/knobs/apply" \
    -H "Content-Type: application/json" \
    -d "{
      \"trace_id\": \"$TRACE_ID\",
      \"station_key\": \"$STATION\",
      \"apply_at_bucket_ts\": \"$APPLY_TS\",
      \"idempotency_key\": \"$(uuidgen)\",
      \"source\": \"phase3_rate_test\",
      \"reason\": \"burst\",
      \"knobs\": { \"pcm.input_gain_db\": 1 }
    }"
done | sort | uniq -c

PASS if:
	•	you see some 429 OR deterministic suppression rules
	•	system remains stable (no crash)

✅ Send me: the uniq -c output

⸻

F) Retention / cleanup (72h policy)

F1) Retention job exists and runs

If you have an endpoint:
	•	GET /api/monitoring/retention/status (or similar)

Otherwise validate via DB (recommended):

psql "postgresql://monitoring_user:monitoring_pass@localhost:5432/monitoring_v2" -c \
"SELECT
  NOW() AS now,
  MIN(bucket_ts) AS oldest_metrics,
  COUNT(*) AS rows_last_24h
 FROM metrics_agg_5s
 WHERE bucket_ts > NOW() - INTERVAL '24 hours';"

psql "postgresql://monitoring_user:monitoring_pass@localhost:5432/monitoring_v2" -c \
"SELECT
  MIN(bucket_ts) AS oldest_audio,
  COUNT(*) AS audio_rows_last_24h
 FROM audio_segments_5s
 WHERE bucket_ts > NOW() - INTERVAL '24 hours';"

PASS if:
	•	retention policy is observable (oldest timestamps not unbounded)
	•	counts are plausible
	•	no DB bloat symptoms

✅ Send me: both query outputs

⸻

G) Concurrency (two calls at once)

G1) Two active traces in parallel

Place two calls simultaneously, then:

curl -sS "$API/api/traces/active" | jq '.active | length, .'

PASS if:
	•	returns 2 active traces
	•	snapshots for each trace can be pulled independently without mixing

✅ Send me: full JSON

G2) Snapshot isolation test

For each trace id, pull snapshot:

T1="$(curl -sS "$API/api/traces/active" | jq -r '.active[0].trace_id')"
T2="$(curl -sS "$API/api/traces/active" | jq -r '.active[1].trace_id')"

curl -sS "$API/api/optimizer/snapshot?trace_id=$T1&limit=1" | jq .
curl -sS "$API/api/optimizer/snapshot?trace_id=$T2&limit=1" | jq .

PASS if:
	•	stations/metrics/audio endpoints are trace-specific and consistent

✅ Send me: both JSON outputs

⸻

What to send me (bundle)
	1.	/api/monitoring/status JSON
	2.	/api/optimizer/snapshot JSON showing audio endpoints
	3.	Audio headers + file output
	4.	Gain apply response + snapshot after boundary + ls -lh of pre/post WAV
	5.	Metrics+knobs excerpt for the same bucket
	6.	Optimizer daemon status (endpoint or PM2 + logs)
	7.	Out-of-range knob test (HTTP status + body)
	8.	Burst apply rate test uniq -c output
	9.	Retention DB query outputs
	10.	Concurrency: active traces (2) + two separate snapshots

⸻

Once you paste those results (or upload as one markdown like you did in Phase 2), I’ll reply with a Phase 3 verdict:
	•	✅ PASS (Production Approved)
	•	⚠️ PASS with required fixes
	•	❌ FAIL (must fix before production)