# Phase 2: Advanced Control Implementation Plan
## Scheduled Knob Application & Idempotency
## Date: January 4, 2026


---

## 🎯 Objectives

Phase 2 focuses on upgrading the knob control system to support:
1. **Scheduled future knob applications** (apply at specific bucket timestamps)
2. **Idempotency handling** (prevent duplicate applications)
3. **Station-specific targeting** (knobs per station, not just global/trace)
4. **Configuration versioning** (track knob changes over time)
5. **Bucket-aligned timing** (ensure knobs apply at exact 5-second boundaries)

---

## 📁 FILES TO BACKUP BEFORE STARTING

### Critical Files to Backup (HIGH PRIORITY):
```bash
# SSH to VM first
ssh azureuser@20.170.155.53

# Create backup directory
mkdir -p /home/azureuser/backups/phase2_$(date +%Y%m%d_%H%M%S)
cd /home/azureuser/backups/phase2_$(date +%Y%m%d_%H%M%S)

# BACKUP THESE FILES:
cp /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js ./
cp /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/api/OptimizerAPI.js ./
cp /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/KnobsResolver.js ./
cp /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/St_Handler_Generic.js ./
cp /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js ./

# Create backup tarball
tar -czf phase2_backup_$(date +%Y%m%d_%H%M%S).tar.gz *.js

# Verify backup
ls -lah phase2_backup_*.tar.gz
echo "Backup complete!"
```

### Database Backup:
```bash
# Backup database schema and data
PGPASSWORD=monitoring_pass pg_dump -U monitoring_user -h localhost -d monitoring_v2 \
  -t knob_snapshots_5s -t knob_events -t knob_apply_requests \
  > phase2_db_backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🏗️ ARCHITECTURE DESIGN

### Component Overview:
```
┌─────────────────────────────────────────────────────────────┐
│                    OptimizerAPI.js                           │
│  /api/optimizer/knobs/apply endpoint                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BucketScheduler.js                        │
│  - Manages scheduled knob applications                       │
│  - Maintains priority queue of pending changes               │
│  - Triggers at exact bucket boundaries                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    KnobsResolver.js                          │
│  - Applies knobs to specific station                        │
│  - Tracks config versions                                   │
│  - Emits knob events                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 DETAILED IMPLEMENTATION TASKS

### Task 1: Create BucketScheduler.js (NEW FILE)
**Location:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/lib/BucketScheduler.js`
**Size:** ~300 lines
**Time Estimate:** 4 hours

```javascript
class BucketScheduler {
  constructor(databaseBridge, knobsResolver) {
    this.databaseBridge = databaseBridge;
    this.knobsResolver = knobsResolver;
    this.scheduledUpdates = new Map(); // bucket_ts -> updates[]
    this.timers = new Map(); // bucket_ts -> timer
    this.configVersions = new Map(); // trace_station -> version

    // Start bucket timer (runs every second)
    this.startBucketTimer();
  }

  // Schedule a knob update for future bucket
  async scheduleUpdate(params) {
    const {
      trace_id,
      station_key,
      apply_at_bucket_ts,
      idempotency_key,
      knobs,
      source,
      reason
    } = params;

    // Validate future timestamp
    // Store in scheduled queue
    // Set timer for bucket
    // Return acceptance response
  }

  // Process updates for current bucket
  async processBucket(bucket_ts) {
    // Get all updates for this bucket
    // Apply each update via KnobsResolver
    // Update config versions
    // Store in knob_events table
    // Mark as applied in knob_apply_requests
  }

  // Timer that checks every second for bucket boundaries
  startBucketTimer() {
    setInterval(() => {
      const now = new Date();
      const currentBucket = this.alignToBucket(now);

      if (this.scheduledUpdates.has(currentBucket)) {
        this.processBucket(currentBucket);
      }
    }, 1000);
  }

  // Align timestamp to 5-second bucket
  alignToBucket(timestamp) {
    const ms = timestamp.getTime();
    return new Date(Math.floor(ms / 5000) * 5000);
  }
}
```

---

### Task 2: Implement Idempotency Handler
**Location:** Update in `OptimizerAPI.js`
**Changes:** Add ~100 lines
**Time Estimate:** 2 hours

```javascript
// In OptimizerAPI.js handleApplyKnobs method
async handleApplyKnobs(req, res) {
  const { idempotency_key, trace_id, station_key, apply_at_bucket_ts, knobs } = req.body;

  try {
    // 1. Check if idempotency_key already exists
    const existing = await this.checkIdempotencyKey(idempotency_key);
    if (existing) {
      return res.json({
        success: true,
        accepted: true,
        duplicate: true,
        config_version: existing.config_version,
        apply_at_bucket_ts: existing.apply_at_bucket_ts
      });
    }

    // 2. Validate future bucket timestamp
    const now = new Date();
    const applyAt = new Date(apply_at_bucket_ts);
    if (applyAt <= now) {
      return res.status(409).json({
        success: false,
        error: 'apply_at_bucket_ts must be in the future'
      });
    }

    // 3. Schedule the update via BucketScheduler
    const result = await this.bucketScheduler.scheduleUpdate({
      idempotency_key,
      trace_id,
      station_key,
      apply_at_bucket_ts,
      knobs,
      source: req.body.source || 'api',
      reason: req.body.reason
    });

    // 4. Store idempotency record
    await this.storeIdempotencyKey(idempotency_key, result);

    // 5. Return success response
    return res.json({
      success: true,
      accepted: true,
      config_version: result.config_version,
      apply_at_bucket_ts: apply_at_bucket_ts,
      effective_knobs: knobs
    });

  } catch (error) {
    console.error('[OptimizerAPI] Knob apply error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

---

### Task 3: Add Config Versioning
**Location:** Update `KnobsResolver.js`
**Changes:** Add ~50 lines
**Time Estimate:** 2 hours

```javascript
// In KnobsResolver.js
class KnobsResolver {
  constructor() {
    // Existing code...
    this.configVersions = new Map(); // trace_station -> version
  }

  // New method: Apply scheduled knob update
  async applyScheduledUpdate(trace_id, station_key, knobs, source = 'scheduler') {
    const key = `${trace_id}_${station_key}`;

    // Get current version
    let version = this.configVersions.get(key) || 0;
    version++;

    // Apply the knobs
    const currentKnobs = this.getKnobs(trace_id, station_key);
    const updatedKnobs = { ...currentKnobs, ...knobs };

    // Store with new version
    this.setKnobs(trace_id, station_key, updatedKnobs);
    this.configVersions.set(key, version);

    // Emit event for tracking
    this.emit('knob-applied', {
      trace_id,
      station_key,
      knobs: updatedKnobs,
      config_version: version,
      source,
      timestamp: new Date()
    });

    return {
      config_version: version,
      effective_knobs: updatedKnobs
    };
  }

  // Get current config version
  getConfigVersion(trace_id, station_key) {
    const key = `${trace_id}_${station_key}`;
    return this.configVersions.get(key) || 0;
  }
}
```

---

### Task 4: Database Schema Updates
**Location:** `/home/azureuser/phase2_schema.sql`
**Time Estimate:** 1 hour

```sql
-- 1. Ensure knob_apply_requests table exists with all fields
CREATE TABLE IF NOT EXISTS knob_apply_requests (
  idempotency_key UUID PRIMARY KEY,
  trace_id VARCHAR(255) NOT NULL,
  station_key VARCHAR(50) NOT NULL,
  apply_at_bucket_ts TIMESTAMP NOT NULL,
  knobs JSONB NOT NULL,
  source VARCHAR(50) DEFAULT 'api',
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  applied_at TIMESTAMP,
  config_version INTEGER,
  status VARCHAR(20) DEFAULT 'scheduled' -- scheduled, applied, failed
);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_knob_apply_bucket
  ON knob_apply_requests(apply_at_bucket_ts)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_knob_apply_trace_station
  ON knob_apply_requests(trace_id, station_key);

-- 3. Add config_version to knob_events if missing
ALTER TABLE knob_events
  ADD COLUMN IF NOT EXISTS config_version INTEGER;

-- 4. Create view for pending applications
CREATE OR REPLACE VIEW pending_knob_applications AS
SELECT
  kar.*,
  t.started_at as trace_started_at,
  NOW() as current_time,
  kar.apply_at_bucket_ts - NOW() as time_until_apply
FROM knob_apply_requests kar
LEFT JOIN traces t ON t.trace_id = kar.trace_id
WHERE kar.status = 'scheduled'
  AND kar.apply_at_bucket_ts > NOW()
ORDER BY kar.apply_at_bucket_ts;
```

---

### Task 5: Update St_Handler_Generic.js
**Location:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/St_Handler_Generic.js`
**Changes:** Add ~30 lines for version tracking
**Time Estimate:** 1 hour

```javascript
// In St_Handler_Generic.js
class St_Handler_Generic {

  // Existing aggregateBucket method
  async aggregateBucket(bucket_ts) {
    // Existing aggregation code...

    // ADD: Get current config version
    const configVersion = this.knobsResolver.getConfigVersion(
      this.trace_id,
      this.station_key
    );

    // ADD: Include version in knob snapshot
    await this.databaseBridge.insertKnobSnapshot({
      trace_id: this.trace_id,
      station_key: this.station_key,
      bucket_ts: bucket_ts,
      knobs_json: currentKnobs,
      config_version: configVersion  // NEW FIELD
    });

    // Existing code continues...
  }

  // ADD: Listen for knob changes
  setupKnobListener() {
    this.knobsResolver.on('knob-applied', (event) => {
      if (event.trace_id === this.trace_id &&
          event.station_key === this.station_key) {
        console.log(`[Station ${this.station_key}] Knobs updated to v${event.config_version}`);

        // Apply the new knobs immediately
        this.applyKnobs(event.knobs);
      }
    });
  }
}
```

---

### Task 6: Integration & Testing
**Location:** `/home/azureuser/test_phase2_scheduler.js`
**Size:** ~200 lines
**Time Estimate:** 2 hours

```javascript
#!/usr/bin/env node

const axios = require('axios');

async function testScheduledKnobApplication() {
  const baseUrl = 'http://localhost:3020';

  console.log('=== Phase 2 Scheduler Test ===\n');

  // 1. Get active trace
  const tracesResp = await axios.get(`${baseUrl}/api/traces/active`);
  const trace = tracesResp.data.active[0];

  if (!trace) {
    console.log('No active traces. Start a call first.');
    return;
  }

  console.log(`Using trace: ${trace.trace_id}`);

  // 2. Schedule knob for 10 seconds in future
  const futureTime = new Date(Date.now() + 10000);
  const bucket_ts = new Date(Math.floor(futureTime.getTime() / 5000) * 5000);

  console.log(`Scheduling knob for: ${bucket_ts.toISOString()}`);

  const knobResp = await axios.post(`${baseUrl}/api/optimizer/knobs/apply`, {
    trace_id: trace.trace_id,
    station_key: trace.stations[0],
    apply_at_bucket_ts: bucket_ts.toISOString(),
    idempotency_key: generateUUID(),
    source: 'test_script',
    reason: 'Testing scheduled application',
    knobs: {
      'pcm.input_gain_db': -6,
      'pcm.noise_gate_threshold': -40
    }
  });

  console.log('Schedule response:', knobResp.data);

  // 3. Test idempotency
  const dupResp = await axios.post(`${baseUrl}/api/optimizer/knobs/apply`, {
    trace_id: trace.trace_id,
    station_key: trace.stations[0],
    apply_at_bucket_ts: bucket_ts.toISOString(),
    idempotency_key: knobResp.data.idempotency_key,
    knobs: { 'pcm.input_gain_db': -6 }
  });

  console.log('Duplicate request handled:', dupResp.data.duplicate === true);

  // 4. Wait for application
  console.log('\nWaiting for scheduled application...');
  await sleep(12000);

  // 5. Verify application via snapshot
  const snapshotResp = await axios.get(
    `${baseUrl}/api/optimizer/snapshot?trace_id=${trace.trace_id}&limit=1`
  );

  const latestBucket = snapshotResp.data.buckets[0];
  console.log('Latest config version:', latestBucket.config_version);
  console.log('Knobs applied:', latestBucket.knobs_snapshot);

  console.log('\n✅ Test complete!');
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run test
testScheduledKnobApplication().catch(console.error);
```

---

## 📊 IMPLEMENTATION TIMELINE

### Day 1 (8 hours):
| Time | Task | Files |
|------|------|-------|
| 2h | Backup & Setup | All critical files |
| 2h | Create BucketScheduler.js | `/lib/BucketScheduler.js` |
| 2h | Update OptimizerAPI.js | `/api/OptimizerAPI.js` |
| 1h | Database schema updates | `phase2_schema.sql` |
| 1h | Initial testing | `test_phase2_scheduler.js` |

### Day 2 (8 hours):
| Time | Task | Files |
|------|------|-------|
| 2h | Implement idempotency | `OptimizerAPI.js` |
| 2h | Add config versioning | `KnobsResolver.js` |
| 1h | Update St_Handler | `St_Handler_Generic.js` |
| 2h | Integration testing | Test scripts |
| 1h | Documentation | README updates |

---

## 🔄 DEPLOYMENT PROCESS

### Step 1: Backup Current System
```bash
ssh azureuser@20.170.155.53
cd /home/azureuser
./backup_phase2.sh  # Use backup script from above
```

### Step 2: Apply Database Changes
```bash
PGPASSWORD=monitoring_pass psql -U monitoring_user -d monitoring_v2 -h localhost < phase2_schema.sql
```

### Step 3: Deploy New Code
```bash
# Copy new files
scp BucketScheduler.js azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/lib/
scp OptimizerAPI.js azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/api/

# Update existing files
scp KnobsResolver.js azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/
scp St_Handler_Generic.js azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/
```

### Step 4: Restart Services
```bash
pm2 restart STTTTSserver --update-env
pm2 logs STTTTSserver --lines 100
```

### Step 5: Run Tests
```bash
node test_phase2_scheduler.js
```

---

## ✅ ACCEPTANCE CRITERIA

Phase 2 is complete when:

1. **Scheduled Application Works:**
   - ✓ Knobs can be scheduled for future bucket_ts
   - ✓ Knobs apply at exact bucket boundary (±1 second)
   - ✓ Config version increments correctly

2. **Idempotency Works:**
   - ✓ Same idempotency_key returns duplicate: true
   - ✓ No double application of knobs
   - ✓ Database stores idempotency records

3. **Station-Specific Targeting:**
   - ✓ Knobs apply to specific station_key
   - ✓ Other stations unaffected
   - ✓ Per-station config versions

4. **Error Handling:**
   - ✓ Rejects past timestamps
   - ✓ Validates knob keys
   - ✓ Handles missing traces gracefully

5. **Performance:**
   - ✓ Scheduler handles 100+ pending updates
   - ✓ Application latency < 100ms
   - ✓ No memory leaks after 24h

---

## 🚨 ROLLBACK PLAN

If issues arise:

```bash
# 1. Stop services
pm2 stop STTTTSserver

# 2. Restore backups
cd /home/azureuser/backups/phase2_[TIMESTAMP]
tar -xzf phase2_backup_*.tar.gz
cp STTTTSserver.js /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/
cp OptimizerAPI.js /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/api/
cp KnobsResolver.js /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/
cp St_Handler_Generic.js /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/

# 3. Restore database (if needed)
PGPASSWORD=monitoring_pass psql -U monitoring_user -d monitoring_v2 -h localhost < phase2_db_backup_*.sql

# 4. Restart
pm2 restart STTTTSserver
```

---

## 📝 NOTES & CONSIDERATIONS

1. **Bucket Alignment**: All timestamps must align to 5-second boundaries
2. **Time Zones**: All times in UTC with 'Z' suffix
3. **Memory Management**: Clear old scheduled updates after application
4. **Persistence**: Consider Redis for scheduler state (future enhancement)
5. **Monitoring**: Add metrics for scheduled vs applied knobs

---

## 🎯 SUCCESS METRICS

- **Scheduling Accuracy**: 99.9% of knobs apply within 1 second of target
- **Idempotency Rate**: 100% duplicate detection
- **Version Consistency**: No version conflicts or race conditions
- **Performance**: < 100ms scheduling latency
- **Reliability**: Zero lost knob updates over 24h test

---

*Phase 2 Implementation Plan*
*Created: January 4, 2026*
*Target Completion: January 6, 2026*
*Effort Estimate: 16 hours (2 days)*