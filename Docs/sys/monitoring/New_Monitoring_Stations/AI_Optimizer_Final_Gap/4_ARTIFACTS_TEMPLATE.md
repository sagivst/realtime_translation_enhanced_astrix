# 📋 4 Required Artifacts for OpenAI Integration Approval

**Instructions**: After deploying OpenAI integration and running a 10-15 minute test call, collect these 4 artifacts and paste the actual data below.

---

## 1️⃣ Real Snapshot JSON

**Instructions**: Get one actual snapshot sent to OpenAI from the logs or database.

```json
// PASTE ACTUAL SNAPSHOT HERE
{
  "trace_id": "GLOBAL",
  "bucket_id": [ACTUAL_BUCKET_ID],
  "window_sec": 5,
  "station_key": "St_3_3333",
  "timestamp": "[ACTUAL_TIMESTAMP]",
  "metrics": {
    "pcm.rms_dbfs": [ACTUAL_VALUE],
    "pcm.peak_dbfs": [ACTUAL_VALUE],
    "pcm.clipping_ratio": [ACTUAL_VALUE],
    "pcm.noise_floor": [ACTUAL_VALUE],
    "health.audio_score": [ACTUAL_VALUE],
    "snr_db": [ACTUAL_VALUE]
  },
  "knobs": {
    "pcm.input_gain_db": [ACTUAL_VALUE],
    "agc.enabled": [ACTUAL_VALUE],
    "ai.optimization_allowed": true,
    // ... other knobs
  }
}
```

**How to get it**:
```bash
ssh azureuser@20.170.155.53 "pm2 logs ai-optimizer --lines 100 | grep -A 20 'snapshot'"
```

---

## 2️⃣ Real OpenAI Response JSON

**Instructions**: Get one actual response from OpenAI (not fallback).

```json
// PASTE ACTUAL OPENAI RESPONSE HERE
{
  "trace_id": "GLOBAL",
  "bucket_id": [ACTUAL_BUCKET_ID],
  "station_key": "St_3_3333",
  "decisions": [
    {
      "knob": "[ACTUAL_KNOB]",
      "recommended_value": [ACTUAL_VALUE],
      "confidence": [ACTUAL_CONFIDENCE],
      "reason": "[ACTUAL_REASON_FROM_OPENAI]"
    }
  ],
  "model": "openai-gpt-4-turbo-preview",
  "request_id": "[ACTUAL_OPENAI_REQUEST_ID]",
  "timestamp": "[ACTUAL_TIMESTAMP]",
  "latency_ms": [ACTUAL_LATENCY]
}
```

**How to get it**:
```bash
ssh azureuser@20.170.155.53 "pm2 logs ai-optimizer --lines 100 | grep 'optimization_complete'"
```

---

## 3️⃣ BucketScheduler Logs (APPLY + SKIP)

**Instructions**: Show both APPLY (first time) and SKIP (already applied) for the same update_id.

```
// PASTE ACTUAL SCHEDULER LOGS HERE
[BucketScheduler] update_id=[UUID] target_bucket=[TIME] status=APPLY station=St_3_3333 knob=pcm.input_gain_db value=[VALUE]
[BucketScheduler] update_id=[SAME_UUID] target_bucket=[TIME] status=SKIP station=St_3_3333 reason=already_applied
```

**How to get it**:
```bash
ssh azureuser@20.170.155.53 "pm2 logs bucket-scheduler --lines 200 | grep -E 'APPLY|SKIP'"
```

---

## 4️⃣ SQL Metrics - 10 Minutes Before/After

**Instructions**: Run this query and paste the results showing metrics improvement.

### SQL Query to Run:
```sql
-- Connect to database
ssh azureuser@20.170.155.53
sudo -u postgres psql monitoring_v2

-- Run this query (adjust timestamps to your test period)
SELECT
  to_char(bucket_ts, 'HH24:MI:SS') as time,
  station_key,
  (knobs_json->>'pcm.input_gain_db')::float as gain_db,
  ROUND(AVG(pcm_rms_dbfs)::numeric, 1) as avg_rms,
  ROUND(AVG(clipping_ratio)::numeric, 4) as avg_clip,
  ROUND(AVG(noise_floor_dbfs)::numeric, 1) as noise_floor
FROM knob_snapshots_5s k
LEFT JOIN metrics_agg_5s m USING (trace_id, station_key, bucket_ts)
WHERE trace_id = 'GLOBAL'
  AND station_key = 'St_3_3333'
  AND bucket_ts BETWEEN
    NOW() - INTERVAL '15 minutes' AND NOW()
GROUP BY bucket_ts, station_key, knobs_json
ORDER BY bucket_ts
LIMIT 30;
```

### Expected Results Format:
```
// PASTE ACTUAL SQL RESULTS HERE
   time    | station_key | gain_db | avg_rms | avg_clip | noise_floor
-----------+-------------+---------+---------+----------+------------
 22:30:00  | St_3_3333   |    0    |  -29.0  |  0.0120  |   -48.5
 22:30:05  | St_3_3333   |    0    |  -28.8  |  0.0115  |   -48.7
 ... (BEFORE - with gain=0)
 22:40:00  | St_3_3333   |    2    |  -26.5  |  0.0080  |   -48.6
 22:40:05  | St_3_3333   |    4    |  -24.2  |  0.0045  |   -48.8
 ... (AFTER - with OpenAI optimizations)
```

---

## 📝 Test Execution Checklist

- [ ] OpenAI API key configured in .env
- [ ] Service deployed with `bash deploy-openai-provider.sh`
- [ ] Test call started between extensions 3333-4444
- [ ] Test ran for minimum 10 minutes
- [ ] Artifact #1 collected (snapshot)
- [ ] Artifact #2 collected (OpenAI response with request_id)
- [ ] Artifact #3 collected (scheduler logs with UUID)
- [ ] Artifact #4 collected (SQL metrics)
- [ ] All artifacts show REAL data, not placeholders

---

## 🚦 Approval Criteria

✅ **APPROVED** if all true:
- OpenAI responses contain request_id (proves real API call)
- Decisions are contextual (not fixed rules)
- Scheduler shows idempotency (UUID + skip logic)
- Metrics show improvement (RMS closer to -18, clipping reduced)

❌ **NOT APPROVED** if any true:
- Using fallback/rule-based responses
- Missing request_id from OpenAI
- Duplicate applications in scheduler
- Metrics degraded or unchanged

---

**Submission Date**: _____________
**Submitted By**: _____________
**Test Duration**: _____________ minutes
**OpenAI Model Used**: _____________
**Total API Calls**: _____________
**Fallback Count**: _____________