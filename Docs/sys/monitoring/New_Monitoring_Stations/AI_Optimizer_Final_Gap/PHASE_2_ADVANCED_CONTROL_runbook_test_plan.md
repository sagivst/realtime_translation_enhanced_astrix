Below is a runbook-style test plan you (or the dev team) can execute and then paste the outputs back to me for approval/comments. It is written to validate Phase/Stage 2 claims specifically:
	•	Scheduled knob application at future buckets
	•	Idempotency with UUID keys
	•	Configuration version tracking
	•	Deterministic timing at 5-second boundaries

No “future stage” requirements included.

⸻

Stage 2 Verification Test Plan (Run & Send Results)

0) Preconditions
	•	API base: http://20.170.155.53:3020
	•	Tools installed: curl, jq, psql (optional but recommended), uuidgen (or any UUID generator)

Define:

API="http://20.170.155.53:3020"


⸻

1) Sanity: API is up and returns stable JSON

1.1 Active traces

curl -sS "$API/api/traces/active" | jq .

Pass criteria
	•	HTTP 200
	•	success: true
	•	active is an array (can be empty)

✅ Send me: full JSON

⸻

2) Snapshot contains Stage-2 tracking fields (config_version)

Pick a real trace id from step 1 (if none, place a test call first).

TRACE_ID="PASTE_TRACE_ID"
curl -sS "$API/api/optimizer/snapshot?trace_id=$TRACE_ID&limit=2" | jq .

Pass criteria (Stage 2)
For each bucket item:
	•	bucket_ts exists (ISO Z)
	•	bucket_ms == 5000
	•	station_key exists
	•	metrics.PRE and metrics.POST objects exist (can be empty)
	•	knobs_snapshot object exists
	•	✅ config_version exists and is an integer (>=0)

✅ Send me: full JSON

⸻

3) Deterministic bucket timing: apply_at_bucket_ts must be 5s-aligned

Helper: compute next 5s boundary (UTC) in bash

next_bucket_ts() {
  python3 - <<'PY'
import datetime, math
now = datetime.datetime.now(datetime.timezone.utc)
ms = int(now.timestamp()*1000)
bucket=5000
nb = ((ms//bucket)+1)*bucket
dt = datetime.datetime.fromtimestamp(nb/1000, tz=datetime.timezone.utc)
print(dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3]+"Z")
PY
}
echo "NEXT_BUCKET=$(next_bucket_ts)"

✅ Send me: the printed timestamp

⸻

4) Scheduled apply works AND takes effect only at the future bucket

4.1 Choose station_key

From your snapshot output, choose one station you optimize (example: St_3_3333).

STATION="St_3_3333"
APPLY_TS="$(next_bucket_ts)"
IDEMP="$(uuidgen)"

4.2 Read current knob value from snapshot (baseline)

curl -sS "$API/api/optimizer/snapshot?trace_id=$TRACE_ID&limit=1" \
| jq -r '.buckets[0].knobs_snapshot["pcm.input_gain_db"]'

4.3 Apply knob at future bucket

curl -sS -X POST "$API/api/optimizer/knobs/apply" \
  -H "Content-Type: application/json" \
  -d "{
    \"trace_id\": \"$TRACE_ID\",
    \"station_key\": \"$STATION\",
    \"apply_at_bucket_ts\": \"$APPLY_TS\",
    \"idempotency_key\": \"$IDEMP\",
    \"source\": \"stage2_test\",
    \"reason\": \"scheduled apply test\",
    \"knobs\": { \"pcm.input_gain_db\": -1 }
  }" | jq .

Pass criteria
	•	HTTP 200
	•	success: true
	•	accepted: true
	•	apply_at_bucket_ts equals what you sent
	•	config_version returned (int)

✅ Send me: full JSON response

4.4 Verify it does NOT apply before the boundary

Immediately pull snapshot again:

curl -sS "$API/api/optimizer/snapshot?trace_id=$TRACE_ID&limit=1" | jq .

Pass criteria
	•	If current bucket is still before APPLY_TS, then effective knobs_snapshot.pcm.input_gain_db is still old value.

✅ Send me: the full JSON + the actual wall-clock time you ran it

4.5 Verify it applies AFTER the boundary

Wait until just after APPLY_TS (one bucket later), then:

curl -sS "$API/api/optimizer/snapshot?trace_id=$TRACE_ID&limit=2" | jq .

Pass criteria
	•	In the bucket at/after APPLY_TS, knobs_snapshot.pcm.input_gain_db == -1
	•	config_version is >= the version returned by apply

✅ Send me: full JSON

⸻

5) Idempotency test (must not double-apply)

Re-send the exact same request with the same idempotency_key:

curl -sS -X POST "$API/api/optimizer/knobs/apply" \
  -H "Content-Type: application/json" \
  -d "{
    \"trace_id\": \"$TRACE_ID\",
    \"station_key\": \"$STATION\",
    \"apply_at_bucket_ts\": \"$APPLY_TS\",
    \"idempotency_key\": \"$IDEMP\",
    \"source\": \"stage2_test\",
    \"reason\": \"idempotency replay\",
    \"knobs\": { \"pcm.input_gain_db\": -1 }
  }" | jq .

Pass criteria
One of these behaviors is acceptable:
	•	Returns the same config_version and indicates “already applied”, OR
	•	Returns accepted: true but does not create any duplicate event / version bump

✅ Send me: response JSON

Optional DB proof (strongly recommended)

If you can query DB:

psql "postgresql://monitoring_user:monitoring_pass@localhost:5432/monitoring_v2" -c \
"SELECT trace_id, station_key, knob_key, old_value, new_value, source, occurred_at
 FROM knob_events
 WHERE trace_id='$TRACE_ID' AND station_key='$STATION' AND knob_key='pcm.input_gain_db'
 ORDER BY occurred_at DESC
 LIMIT 10;"

Pass criteria
	•	Only one event for this idempotency replay (no duplicates)

✅ Send me: the query output

⸻

6) Conflict handling (apply to a bucket that is already started/closed)

Take a bucket_ts from snapshot that is definitely in the past and try applying to it:

PAST_BUCKET="$(curl -sS "$API/api/optimizer/snapshot?trace_id=$TRACE_ID&limit=1" | jq -r '.buckets[0].bucket_ts')"
curl -sS -i -X POST "$API/api/optimizer/knobs/apply" \
  -H "Content-Type: application/json" \
  -d "{
    \"trace_id\": \"$TRACE_ID\",
    \"station_key\": \"$STATION\",
    \"apply_at_bucket_ts\": \"$PAST_BUCKET\",
    \"idempotency_key\": \"$(uuidgen)\",
    \"source\": \"stage2_test\",
    \"reason\": \"conflict test past bucket\",
    \"knobs\": { \"pcm.input_gain_db\": -2 }
  }" | head -n 60

Pass criteria
	•	HTTP 409 (preferred) OR a clear reject response
	•	Response indicates bucket is invalid/past and ideally includes next valid bucket

✅ Send me: first ~60 lines including status + JSON body

⸻

7) Config version monotonicity (basic)

Run snapshot twice a few seconds apart and confirm config_version does not go backward:

curl -sS "$API/api/optimizer/snapshot?trace_id=$TRACE_ID&limit=2" | jq -r '.buckets[] | "\(.bucket_ts) \(.station_key) v=\(.config_version)"'
sleep 6
curl -sS "$API/api/optimizer/snapshot?trace_id=$TRACE_ID&limit=2" | jq -r '.buckets[] | "\(.bucket_ts) \(.station_key) v=\(.config_version)"'

Pass criteria
	•	Versions are monotonic (never decrease)

✅ Send me: the two command outputs

⸻

What to send me (copy/paste bundle)
	1.	/api/traces/active output
	2.	/api/optimizer/snapshot output (limit=2)
	3.	apply response JSON (scheduled future bucket)
	4.	snapshot before boundary + snapshot after boundary
	5.	idempotency replay response + (optional) DB knob_events query
	6.	conflict test output (HTTP status + body)
	7.	config version monotonic outputs

⸻

If we paste those outputs here, AI’ll respond with a Stage 2 verdict:
	•	✅ PASS / ⚠️ PASS WITH FIXES / ❌ FAIL
and I’ll list exactly what to change (field-by-field and behavior-by-behavior).