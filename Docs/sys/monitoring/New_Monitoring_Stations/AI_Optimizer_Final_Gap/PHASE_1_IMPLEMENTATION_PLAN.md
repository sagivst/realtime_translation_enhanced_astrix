# Phase 1: Core APIs Implementation Plan
## Timeline: 2-3 Days
## Target: Enable AI Optimizer to Connect and Function

---

## Day 1: Trace Discovery & Snapshot Foundation (8 hours)

### Task 1.1: Implement `/api/traces/active` (3 hours)

#### Location: `STTTTSserver.js`
```javascript
// Add after line ~3090 (after existing knob endpoints)
app.get('/api/traces/active', async (req, res) => {
  try {
    // Query active traces from database
    const query = `
      SELECT
        t.trace_id,
        t.started_at,
        t.src_extension,
        t.dst_extension,
        ARRAY_AGG(DISTINCT ms.station_key) as stations
      FROM traces t
      LEFT JOIN metrics_agg_5s ms ON ms.trace_id = t.trace_id
      WHERE t.ended_at IS NULL
        AND t.started_at > NOW() - INTERVAL '1 hour'
      GROUP BY t.trace_id, t.started_at, t.src_extension, t.dst_extension
      ORDER BY t.started_at DESC
    `;

    const result = await databaseBridge.query(query);

    const active = result.rows.map(row => ({
      trace_id: row.trace_id,
      started_at: row.started_at,
      src_extension: row.src_extension || '3333',  // Default if not tracked
      dst_extension: row.dst_extension || '4444',  // Default if not tracked
      call_id: null,  // Optional field
      stations: row.stations || ['St_3_3333', 'St_3_4444']
    }));

    res.json({
      success: true,
      active: active
    });
  } catch (error) {
    console.error('[API] /traces/active error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve active traces'
    });
  }
});
```

#### Database Changes Needed:
```sql
-- Ensure traces table tracks extensions
ALTER TABLE traces
  ADD COLUMN IF NOT EXISTS src_extension VARCHAR(50),
  ADD COLUMN IF NOT EXISTS dst_extension VARCHAR(50);

-- Update existing GLOBAL trace
UPDATE traces
SET src_extension = '3333', dst_extension = '4444'
WHERE trace_id = 'GLOBAL';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_traces_active
  ON traces(ended_at)
  WHERE ended_at IS NULL;
```

#### Testing:
```bash
# Test endpoint
curl http://20.170.155.53:3020/api/traces/active | jq
```

---

### Task 1.2: Database Bridge Extensions (2 hours)

#### Location: `DatabaseBridge.js`
```javascript
// Add these methods to DatabaseBridge class

async getActiveTraces(maxAge = '1 hour') {
  const query = `
    SELECT
      t.trace_id,
      t.started_at,
      t.src_extension,
      t.dst_extension,
      ARRAY_AGG(DISTINCT ms.station_key) as stations
    FROM traces t
    LEFT JOIN metrics_agg_5s ms ON ms.trace_id = t.trace_id
    WHERE t.ended_at IS NULL
      AND t.started_at > NOW() - INTERVAL $1
    GROUP BY t.trace_id, t.started_at, t.src_extension, t.dst_extension
    ORDER BY t.started_at DESC
  `;

  try {
    const result = await this.pool.query(query, [maxAge]);
    return result.rows;
  } catch (error) {
    console.error('[DatabaseBridge] getActiveTraces error:', error);
    throw error;
  }
}

async getUnifiedSnapshot(traceId, stationKey, bucketTs) {
  const query = `
    WITH bucket_data AS (
      SELECT $3::timestamp as bucket_ts
    )
    SELECT
      -- Metrics data
      m.trace_id,
      m.station_key,
      m.bucket_ts,
      m.tap,
      m.metric_key,
      m.count,
      m.min,
      m.max,
      m.avg,
      m.last,
      -- Knobs snapshot
      k.knobs_json,
      -- Audio segments
      a.file_path,
      a.tap as audio_tap
    FROM bucket_data bd
    LEFT JOIN metrics_agg_5s m
      ON m.trace_id = $1
      AND m.station_key = $2
      AND m.bucket_ts = bd.bucket_ts
    LEFT JOIN knob_snapshots_5s k
      ON k.trace_id = $1
      AND k.station_key = $2
      AND k.bucket_ts = bd.bucket_ts
    LEFT JOIN audio_segments_5s a
      ON a.trace_id = $1
      AND a.station_key = $2
      AND a.bucket_ts = bd.bucket_ts
    WHERE m.bucket_ts IS NOT NULL OR k.bucket_ts IS NOT NULL
  `;

  try {
    const result = await this.pool.query(query, [traceId, stationKey, bucketTs]);
    return result.rows;
  } catch (error) {
    console.error('[DatabaseBridge] getUnifiedSnapshot error:', error);
    throw error;
  }
}

async getCompletedBuckets(traceId, sinceBucketTs = null, limit = 1) {
  let query = `
    SELECT DISTINCT bucket_ts, station_key
    FROM metrics_agg_5s
    WHERE trace_id = $1
      AND bucket_ts < NOW() - INTERVAL '1 second'
  `;

  const params = [traceId];

  if (sinceBucketTs) {
    query += ` AND bucket_ts > $2`;
    params.push(sinceBucketTs);
  }

  query += ` ORDER BY bucket_ts DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  try {
    const result = await this.pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[DatabaseBridge] getCompletedBuckets error:', error);
    throw error;
  }
}
```

---

### Task 1.3: Implement `/api/optimizer/snapshot` (3 hours)

#### Location: `STTTTSserver.js`
```javascript
// Add after /api/traces/active endpoint
app.get('/api/optimizer/snapshot', async (req, res) => {
  try {
    const { trace_id, since_bucket_ts, limit = 1 } = req.query;

    if (!trace_id) {
      return res.status(400).json({
        success: false,
        error: 'trace_id is required'
      });
    }

    // Get completed buckets
    const buckets = await databaseBridge.getCompletedBuckets(
      trace_id,
      since_bucket_ts,
      Math.min(limit, 50)
    );

    if (buckets.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No completed buckets found for trace'
      });
    }

    // Build response with all bucket data
    const bucketResponses = [];

    for (const bucket of buckets) {
      const { bucket_ts, station_key } = bucket;

      // Get all data for this bucket
      const snapshotData = await databaseBridge.getUnifiedSnapshot(
        trace_id,
        station_key,
        bucket_ts
      );

      // Format metrics by tap and metric_key
      const metrics = { PRE: {}, POST: {} };
      const knobs = {};
      let audioUrls = { PRE: null, POST: null };

      for (const row of snapshotData) {
        // Process metrics
        if (row.metric_key && row.tap) {
          metrics[row.tap][row.metric_key] = {
            count: row.count,
            min: row.min,
            max: row.max,
            avg: row.avg,
            last: row.last
          };
        }

        // Process knobs (first row has it)
        if (row.knobs_json && Object.keys(knobs).length === 0) {
          Object.assign(knobs, row.knobs_json);
        }

        // Process audio URLs
        if (row.file_path && row.audio_tap) {
          const audioUrl = `/api/audio/segment?` +
            `trace_id=${trace_id}&` +
            `station_key=${station_key}&` +
            `tap=${row.audio_tap}&` +
            `bucket_ts=${bucket_ts}`;
          audioUrls[row.audio_tap] = {
            endpoint: audioUrl
          };
        }
      }

      bucketResponses.push({
        bucket_ts: bucket_ts,
        bucket_ms: 5000,
        station_key: station_key,
        knobs_snapshot: knobs,
        metrics: metrics,
        audio: audioUrls,
        config_version: 1,  // TODO: Implement versioning
        last_knob_event_id: null  // TODO: Track knob events
      });
    }

    res.json({
      success: true,
      trace_id: trace_id,
      buckets: bucketResponses
    });

  } catch (error) {
    console.error('[API] /optimizer/snapshot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve snapshot'
    });
  }
});
```

---

## Day 2: Audio Serving & Knob Scheduling (8 hours)

### Task 2.1: Implement `/api/audio/segment` (3 hours)

#### Location: `STTTTSserver.js`
```javascript
// Add after /api/optimizer/snapshot endpoint
const fs = require('fs');
const path = require('path');

app.get('/api/audio/segment', async (req, res) => {
  try {
    const { trace_id, station_key, tap, bucket_ts } = req.query;

    // Validate parameters
    if (!trace_id || !station_key || !tap || !bucket_ts) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    if (tap !== 'PRE' && tap !== 'POST') {
      return res.status(400).json({
        success: false,
        error: 'tap must be PRE or POST'
      });
    }

    // Query database for file path
    const query = `
      SELECT file_path
      FROM audio_segments_5s
      WHERE trace_id = $1
        AND station_key = $2
        AND tap = $3
        AND bucket_ts = $4
    `;

    const result = await databaseBridge.query(query, [
      trace_id,
      station_key,
      tap,
      bucket_ts
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Audio segment not found'
      });
    }

    const filePath = result.rows[0].file_path;

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`[API] Audio file not found: ${filePath}`);
      return res.status(404).json({
        success: false,
        error: 'Audio file not found on disk'
      });
    }

    // Set headers
    res.set({
      'Content-Type': 'audio/wav',
      'X-Sample-Rate': '16000',
      'X-Channels': '1',
      'X-Bucket-MS': '5000',
      'X-Trace-ID': trace_id,
      'X-Station-Key': station_key,
      'X-Tap': tap,
      'Cache-Control': 'public, max-age=3600'
    });

    // Stream the file
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    stream.on('error', (err) => {
      console.error('[API] Audio streaming error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to stream audio file'
        });
      }
    });

  } catch (error) {
    console.error('[API] /audio/segment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audio segment'
    });
  }
});
```

---

### Task 2.2: Create Bucket Scheduler (3 hours)

#### New File: `/home/azureuser/translation-app/STTTTSserver/lib/BucketScheduler.js`
```javascript
// BucketScheduler.js - Manages scheduled knob applications

export class BucketScheduler {
  constructor(databaseBridge, knobsResolver) {
    this.databaseBridge = databaseBridge;
    this.knobsResolver = knobsResolver;
    this.scheduledUpdates = new Map(); // bucket_ts -> updates[]
    this.timer = null;
    this.bucketMs = 5000;
  }

  start() {
    if (this.timer) return;

    // Check every second for scheduled updates
    this.timer = setInterval(() => {
      this.processScheduledUpdates();
    }, 1000);

    console.log('[BucketScheduler] Started');
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[BucketScheduler] Stopped');
  }

  scheduleKnobUpdate(traceId, stationKey, applyAtBucketTs, knobs, idempotencyKey, source) {
    const bucketKey = this.floorToBucket(new Date(applyAtBucketTs)).toISOString();

    // Check idempotency
    if (this.hasIdempotencyKey(idempotencyKey)) {
      return {
        success: true,
        accepted: true,
        duplicate: true,
        apply_at_bucket_ts: bucketKey
      };
    }

    // Validate bucket is in future
    const now = new Date();
    const applyAt = new Date(applyAtBucketTs);
    if (applyAt <= now) {
      throw new Error('apply_at_bucket_ts must be in the future');
    }

    // Add to schedule
    if (!this.scheduledUpdates.has(bucketKey)) {
      this.scheduledUpdates.set(bucketKey, []);
    }

    this.scheduledUpdates.get(bucketKey).push({
      traceId,
      stationKey,
      knobs,
      idempotencyKey,
      source,
      scheduledAt: now.toISOString()
    });

    console.log(`[BucketScheduler] Scheduled update for ${bucketKey}: ${JSON.stringify(knobs)}`);

    return {
      success: true,
      accepted: true,
      apply_at_bucket_ts: bucketKey,
      config_version: this.getNextConfigVersion(traceId, stationKey),
      effective_knobs: knobs
    };
  }

  processScheduledUpdates() {
    const now = new Date();
    const currentBucket = this.floorToBucket(now).toISOString();

    // Process all buckets up to current
    for (const [bucketTs, updates] of this.scheduledUpdates.entries()) {
      if (bucketTs <= currentBucket) {
        console.log(`[BucketScheduler] Processing ${updates.length} updates for bucket ${bucketTs}`);

        for (const update of updates) {
          this.applyUpdate(update);
        }

        // Remove processed bucket
        this.scheduledUpdates.delete(bucketTs);
      }
    }
  }

  async applyUpdate(update) {
    const { traceId, stationKey, knobs, idempotencyKey, source } = update;

    try {
      // Update knobs in resolver
      for (const [key, value] of Object.entries(knobs)) {
        await this.knobsResolver.updateKnob(traceId, key, value, source);
      }

      // Store in database
      await this.databaseBridge.recordKnobEvents(traceId, stationKey, knobs, source);

      // Mark as applied
      await this.recordIdempotencyKey(idempotencyKey, update);

      console.log(`[BucketScheduler] Applied knobs for ${stationKey}: ${JSON.stringify(knobs)}`);
    } catch (error) {
      console.error(`[BucketScheduler] Failed to apply update:`, error);
    }
  }

  floorToBucket(date) {
    const ms = date.getTime();
    const floored = Math.floor(ms / this.bucketMs) * this.bucketMs;
    return new Date(floored);
  }

  hasIdempotencyKey(key) {
    // TODO: Check database for existing key
    return false;
  }

  async recordIdempotencyKey(key, update) {
    // TODO: Store in database
  }

  getNextConfigVersion(traceId, stationKey) {
    // TODO: Track and increment
    return 1;
  }
}
```

---

### Task 2.3: Implement `/api/optimizer/knobs/apply` (2 hours)

#### Location: `STTTTSserver.js`
```javascript
// Import scheduler at top of file
const { BucketScheduler } = require('./lib/BucketScheduler');

// Initialize scheduler after database bridge
const bucketScheduler = new BucketScheduler(databaseBridge, knobsResolver);
bucketScheduler.start();

// Add endpoint after /api/audio/segment
app.post('/api/optimizer/knobs/apply', async (req, res) => {
  try {
    const {
      trace_id,
      station_key,
      apply_at_bucket_ts,
      idempotency_key,
      source = 'auto_optimizer',
      reason,
      knobs
    } = req.body;

    // Validate required fields
    if (!trace_id || !station_key || !apply_at_bucket_ts || !idempotency_key || !knobs) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Validate knobs
    const validKnobs = {};
    for (const [key, value] of Object.entries(knobs)) {
      if (knobsResolver.isValidKnob(key)) {
        validKnobs[key] = knobsResolver.clampValue(key, value);
      } else {
        return res.status(400).json({
          success: false,
          error: `Unknown knob: ${key}`
        });
      }
    }

    // Schedule the update
    try {
      const result = bucketScheduler.scheduleKnobUpdate(
        trace_id,
        station_key,
        apply_at_bucket_ts,
        validKnobs,
        idempotency_key,
        source
      );

      res.json(result);

      // Log for audit
      console.log(`[API] Knob update scheduled:`, {
        trace_id,
        station_key,
        apply_at_bucket_ts,
        knobs: validKnobs,
        reason
      });

    } catch (error) {
      if (error.message.includes('future')) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }

  } catch (error) {
    console.error('[API] /optimizer/knobs/apply error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply knobs'
    });
  }
});
```

---

## Day 3: Integration & Testing (4-6 hours)

### Task 3.1: Integration Testing Script (2 hours)

#### Test File: `/home/azureuser/test_optimizer_apis.js`
```javascript
#!/usr/bin/env node

const axios = require('axios');
const assert = require('assert');

const BASE_URL = 'http://20.170.155.53:3020';

async function testOptmizerAPIs() {
  console.log('Testing Optimizer APIs...\n');

  // Test 1: Active Traces
  console.log('1. Testing /api/traces/active');
  const activeRes = await axios.get(`${BASE_URL}/api/traces/active`);
  assert(activeRes.data.success === true, 'Active traces should succeed');
  assert(Array.isArray(activeRes.data.active), 'Should return active array');
  console.log(`   ✓ Found ${activeRes.data.active.length} active traces\n`);

  if (activeRes.data.active.length === 0) {
    console.log('   ⚠ No active traces. Start a call and run again.\n');
    return;
  }

  const trace = activeRes.data.active[0];
  console.log(`   Using trace: ${trace.trace_id}\n`);

  // Test 2: Optimizer Snapshot
  console.log('2. Testing /api/optimizer/snapshot');
  const snapRes = await axios.get(`${BASE_URL}/api/optimizer/snapshot`, {
    params: { trace_id: trace.trace_id, limit: 1 }
  });
  assert(snapRes.data.success === true, 'Snapshot should succeed');
  assert(Array.isArray(snapRes.data.buckets), 'Should return buckets array');
  console.log(`   ✓ Got ${snapRes.data.buckets.length} bucket(s)\n`);

  if (snapRes.data.buckets.length > 0) {
    const bucket = snapRes.data.buckets[0];
    console.log(`   Bucket: ${bucket.bucket_ts}`);
    console.log(`   Station: ${bucket.station_key}`);
    console.log(`   Metrics: ${Object.keys(bucket.metrics.PRE || {}).length} PRE, ${Object.keys(bucket.metrics.POST || {}).length} POST`);
    console.log(`   Knobs: ${Object.keys(bucket.knobs_snapshot || {}).length} values\n`);

    // Test 3: Audio Segment
    if (bucket.audio.PRE && bucket.audio.PRE.endpoint) {
      console.log('3. Testing /api/audio/segment');
      const audioUrl = `${BASE_URL}${bucket.audio.PRE.endpoint}`;
      const audioRes = await axios.get(audioUrl, {
        responseType: 'arraybuffer'
      });
      assert(audioRes.headers['content-type'] === 'audio/wav', 'Should return WAV');
      console.log(`   ✓ Retrieved audio: ${audioRes.data.byteLength} bytes\n`);
    }

    // Test 4: Apply Knobs
    console.log('4. Testing /api/optimizer/knobs/apply');
    const nextBucket = new Date(Date.now() + 10000).toISOString().replace(/\.\d{3}Z$/, '.000Z');
    const applyRes = await axios.post(`${BASE_URL}/api/optimizer/knobs/apply`, {
      trace_id: trace.trace_id,
      station_key: bucket.station_key,
      apply_at_bucket_ts: nextBucket,
      idempotency_key: `test-${Date.now()}`,
      source: 'test_script',
      reason: 'Integration test',
      knobs: {
        'pcm.input_gain_db': 2
      }
    });
    assert(applyRes.data.success === true, 'Apply should succeed');
    console.log(`   ✓ Scheduled knob update for ${nextBucket}\n`);
  }

  console.log('✅ All tests passed!\n');
}

testOptmizerAPIs().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
```

---

### Task 3.2: Python Optimizer Test (2 hours)

#### Test File: `/home/azureuser/test_optimizer.py`
```python
#!/usr/bin/env python3
"""
Minimal optimizer to test the APIs
"""

import time
import requests
from datetime import datetime, timedelta

API_BASE = "http://20.170.155.53:3020"

def test_optimizer_loop():
    print("Starting test optimizer loop...")

    session = requests.Session()

    for i in range(3):  # Run 3 iterations
        print(f"\n--- Iteration {i+1} ---")

        # 1. Get active traces
        r = session.get(f"{API_BASE}/api/traces/active")
        r.raise_for_status()
        traces = r.json()["active"]

        if not traces:
            print("No active traces found")
            time.sleep(5)
            continue

        trace = traces[0]
        print(f"Processing trace: {trace['trace_id']}")

        # 2. Get snapshot
        r = session.get(f"{API_BASE}/api/optimizer/snapshot",
                       params={"trace_id": trace["trace_id"], "limit": 1})
        r.raise_for_status()
        buckets = r.json()["buckets"]

        if not buckets:
            print("No buckets available")
            time.sleep(5)
            continue

        bucket = buckets[0]
        print(f"Bucket: {bucket['bucket_ts']}")
        print(f"Station: {bucket['station_key']}")

        # 3. Check metrics
        if "POST" in bucket["metrics"] and "pcm.clipping_ratio" in bucket["metrics"]["POST"]:
            clip_ratio = bucket["metrics"]["POST"]["pcm.clipping_ratio"].get("avg", 0)
            print(f"Clipping ratio: {clip_ratio}")

            # 4. Apply knob if needed
            if clip_ratio > 0.001:
                next_bucket = (datetime.utcnow() + timedelta(seconds=10)).isoformat()[:-7] + ".000Z"

                r = session.post(f"{API_BASE}/api/optimizer/knobs/apply", json={
                    "trace_id": trace["trace_id"],
                    "station_key": bucket["station_key"],
                    "apply_at_bucket_ts": next_bucket,
                    "idempotency_key": f"test-{time.time()}",
                    "source": "test_optimizer",
                    "reason": f"Reduce clipping (ratio={clip_ratio:.4f})",
                    "knobs": {"pcm.input_gain_db": -2}
                })
                r.raise_for_status()
                print(f"Applied knob update for {next_bucket}")

        print("Sleeping 5 seconds...")
        time.sleep(5)

    print("\nTest complete!")

if __name__ == "__main__":
    test_optimizer_loop()
```

---

## Deployment Steps

### Step 1: Backup Current System
```bash
ssh azureuser@20.170.155.53
cd /home/azureuser
./backup_new_monitoring.sh
```

### Step 2: Apply Database Changes
```bash
ssh azureuser@20.170.155.53
PGPASSWORD=monitoring_pass psql -U monitoring_user -d monitoring_v2 -h localhost << 'EOF'
-- Add extensions columns
ALTER TABLE traces
  ADD COLUMN IF NOT EXISTS src_extension VARCHAR(50),
  ADD COLUMN IF NOT EXISTS dst_extension VARCHAR(50);

-- Update GLOBAL trace
UPDATE traces
SET src_extension = '3333', dst_extension = '4444'
WHERE trace_id = 'GLOBAL';

-- Create index
CREATE INDEX IF NOT EXISTS idx_traces_active
  ON traces(ended_at)
  WHERE ended_at IS NULL;

-- Create idempotency table
CREATE TABLE IF NOT EXISTS knob_apply_requests (
  idempotency_key UUID PRIMARY KEY,
  trace_id VARCHAR(255) NOT NULL,
  station_key VARCHAR(50) NOT NULL,
  apply_at_bucket_ts TIMESTAMP NOT NULL,
  knobs JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  applied_at TIMESTAMP
);

-- Add config version
ALTER TABLE knob_snapshots_5s
  ADD COLUMN IF NOT EXISTS config_version INTEGER DEFAULT 0;

EOF
```

### Step 3: Update Server Code
```bash
# Copy updated files
scp DatabaseBridge.js azureuser@20.170.155.53:/home/azureuser/translation-app/STTTTSserver/Monitoring_Stations/bridge/
scp BucketScheduler.js azureuser@20.170.155.53:/home/azureuser/translation-app/STTTTSserver/lib/
scp STTTTSserver.js azureuser@20.170.155.53:/home/azureuser/translation-app/STTTTSserver/

# Restart server
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app && pm2 restart STTTTSserver"
```

### Step 4: Test APIs
```bash
# Run test script
ssh azureuser@20.170.155.53 "node /home/azureuser/test_optimizer_apis.js"

# Test Python optimizer
ssh azureuser@20.170.155.53 "python3 /home/azureuser/test_optimizer.py"
```

---

## Success Metrics

### Endpoint Response Times:
- `/api/traces/active`: < 100ms
- `/api/optimizer/snapshot`: < 200ms
- `/api/audio/segment`: < 500ms (first byte)
- `/api/optimizer/knobs/apply`: < 100ms

### Functionality Tests:
✅ Optimizer can discover active traces
✅ Snapshots return complete bucket data
✅ Audio files stream correctly
✅ Knobs apply at correct bucket boundary
✅ Idempotency prevents duplicates
✅ Config version increments

---

## Troubleshooting Guide

### Issue: No active traces returned
**Solution**:
- Check if calls are active
- Verify ended_at is NULL in database
- Check trace age (> 1 hour filtered out)

### Issue: No buckets in snapshot
**Solution**:
- Wait for at least one 5-second bucket to complete
- Check metrics_agg_5s table has data
- Verify bucket_ts is > 1 second old

### Issue: Audio file not found
**Solution**:
- Check audio_segments_5s table has file_path
- Verify file exists at path
- Check permissions on /var/monitoring/audio

### Issue: Knobs not applying
**Solution**:
- Verify apply_at_bucket_ts is in future
- Check BucketScheduler logs
- Verify knob names are valid

---

## Next Steps After Phase 1

### Phase 2 (Days 4-5):
- Implement config versioning
- Add idempotency storage
- Enhance error handling
- Add request validation

### Phase 3 (Days 6-7):
- Add authentication
- Implement rate limiting
- Add monitoring metrics
- Performance optimization

---

*Phase 1 Implementation Plan*
*Created: January 4, 2026*
*Estimated Completion: 2-3 days*