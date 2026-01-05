# Phase 1: Modular Implementation Plan (External Files)
## Maintains STTTTSserver.js Stability
## Timeline: 2-3 Days

---

## 🎯 KEY CHANGE: Modular Architecture

Instead of modifying STTTTSserver.js with 400+ lines, we'll:
1. Create `OptimizerAPI.js` with all 4 endpoints
2. STTTTSserver.js only needs 3 lines added
3. Complete isolation = better stability

---

## 📁 NEW FILE STRUCTURE

```
/home/azureuser/translation-app/STTTTSserver/
├── STTTTSserver.js                     [MODIFY: Only 3 lines!]
├── api/
│   └── OptimizerAPI.js                 [CREATE: 400 lines - All endpoints]
├── lib/
│   ├── BucketScheduler.js              [CREATE: 250 lines]
│   └── OptimizerHelpers.js             [CREATE: 150 lines]
└── Monitoring_Stations/
    └── bridge/
        └── DatabaseBridge.js           [MODIFY: +150 lines]
```

---

## Day 1: Foundation with External Module (8 hours)

### Task 1.1: Create OptimizerAPI.js Module (4 hours)

#### New File: `/home/azureuser/translation-app/STTTTSserver/api/OptimizerAPI.js`
```javascript
/**
 * OptimizerAPI.js - External module for all Optimizer endpoints
 * Keeps STTTTSserver.js stable and unchanged
 */

const fs = require('fs');
const path = require('path');
const { BucketScheduler } = require('../lib/BucketScheduler');
const { OptimizerHelpers } = require('../lib/OptimizerHelpers');

class OptimizerAPI {
  constructor(app, databaseBridge, knobsResolver, config = {}) {
    this.app = app;
    this.databaseBridge = databaseBridge;
    this.knobsResolver = knobsResolver;
    this.config = config;

    // Initialize scheduler
    this.bucketScheduler = new BucketScheduler(databaseBridge, knobsResolver);
    this.helpers = new OptimizerHelpers(databaseBridge);

    // Register all endpoints
    this.registerEndpoints();

    // Start scheduler
    this.bucketScheduler.start();

    console.log('[OptimizerAPI] Initialized with 4 endpoints');
  }

  registerEndpoints() {
    // 1. Active Traces Discovery
    this.app.get('/api/traces/active', this.handleActiveTraces.bind(this));

    // 2. Optimizer Snapshot
    this.app.get('/api/optimizer/snapshot', this.handleSnapshot.bind(this));

    // 3. Audio Segment Retrieval
    this.app.get('/api/audio/segment', this.handleAudioSegment.bind(this));

    // 4. Apply Knobs
    this.app.post('/api/optimizer/knobs/apply', this.handleApplyKnobs.bind(this));

    console.log('[OptimizerAPI] Registered endpoints:');
    console.log('  GET  /api/traces/active');
    console.log('  GET  /api/optimizer/snapshot');
    console.log('  GET  /api/audio/segment');
    console.log('  POST /api/optimizer/knobs/apply');
  }

  // Endpoint 1: Active Traces
  async handleActiveTraces(req, res) {
    try {
      const maxAge = req.query.max_age || '1 hour';
      const traces = await this.databaseBridge.getActiveTraces(maxAge);

      const formatted = traces.map(t => ({
        trace_id: t.trace_id,
        started_at: t.started_at,
        src_extension: t.src_extension || '3333',
        dst_extension: t.dst_extension || '4444',
        call_id: null,
        stations: t.stations || ['St_3_3333', 'St_3_4444']
      }));

      res.json({
        success: true,
        active: formatted
      });
    } catch (error) {
      console.error('[OptimizerAPI] /traces/active error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve active traces'
      });
    }
  }

  // Endpoint 2: Unified Snapshot
  async handleSnapshot(req, res) {
    try {
      const { trace_id, since_bucket_ts, limit = 1 } = req.query;

      if (!trace_id) {
        return res.status(400).json({
          success: false,
          error: 'trace_id is required'
        });
      }

      const buckets = await this.helpers.buildUnifiedSnapshot(
        trace_id,
        since_bucket_ts,
        Math.min(limit, 50)
      );

      if (buckets.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No completed buckets found'
        });
      }

      res.json({
        success: true,
        trace_id: trace_id,
        buckets: buckets
      });

    } catch (error) {
      console.error('[OptimizerAPI] /optimizer/snapshot error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve snapshot'
      });
    }
  }

  // Endpoint 3: Audio Segment
  async handleAudioSegment(req, res) {
    try {
      const { trace_id, station_key, tap, bucket_ts } = req.query;

      // Validate parameters
      if (!trace_id || !station_key || !tap || !bucket_ts) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters'
        });
      }

      const filePath = await this.helpers.getAudioFilePath(
        trace_id,
        station_key,
        tap,
        bucket_ts
      );

      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: 'Audio segment not found'
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
        console.error('[OptimizerAPI] Audio streaming error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Failed to stream audio'
          });
        }
      });

    } catch (error) {
      console.error('[OptimizerAPI] /audio/segment error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audio segment'
      });
    }
  }

  // Endpoint 4: Apply Knobs
  async handleApplyKnobs(req, res) {
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

      // Schedule the update
      const result = await this.bucketScheduler.scheduleKnobUpdate(
        trace_id,
        station_key,
        apply_at_bucket_ts,
        knobs,
        idempotency_key,
        source
      );

      res.json(result);

      // Log for audit
      console.log(`[OptimizerAPI] Knob update scheduled:`, {
        trace_id,
        station_key,
        apply_at_bucket_ts,
        reason
      });

    } catch (error) {
      console.error('[OptimizerAPI] /optimizer/knobs/apply error:', error);

      if (error.message.includes('future')) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to apply knobs'
      });
    }
  }

  // Cleanup method
  stop() {
    if (this.bucketScheduler) {
      this.bucketScheduler.stop();
    }
    console.log('[OptimizerAPI] Stopped');
  }
}

module.exports = { OptimizerAPI };
```

---

### Task 1.2: Minimal STTTTSserver.js Changes (30 minutes)

#### Modify: `/home/azureuser/translation-app/STTTTSserver/STTTTSserver.js`
```javascript
// Add these 3 lines only! (after line ~3090, after existing endpoints)

// Import and initialize Optimizer API (external module)
const { OptimizerAPI } = require('./api/OptimizerAPI');
const optimizerAPI = new OptimizerAPI(app, globalNewMonitoring.databaseBridge, knobsResolver);
console.log('[STTTTSserver] Optimizer API loaded from external module');

// That's it! No other changes to STTTTSserver.js
```

---

### Task 1.3: Create OptimizerHelpers.js (2 hours)

#### New File: `/home/azureuser/translation-app/STTTTSserver/lib/OptimizerHelpers.js`
```javascript
/**
 * OptimizerHelpers.js - Helper functions for Optimizer API
 * Keeps complex logic separate from endpoints
 */

class OptimizerHelpers {
  constructor(databaseBridge) {
    this.databaseBridge = databaseBridge;
  }

  async buildUnifiedSnapshot(traceId, sinceBucketTs, limit) {
    // Get completed buckets
    const buckets = await this.databaseBridge.getCompletedBuckets(
      traceId,
      sinceBucketTs,
      limit
    );

    const results = [];

    for (const bucket of buckets) {
      const { bucket_ts, station_key } = bucket;

      // Get unified data
      const data = await this.databaseBridge.getUnifiedSnapshot(
        traceId,
        station_key,
        bucket_ts
      );

      // Format response
      const formatted = this.formatBucketData(data, traceId, station_key, bucket_ts);
      results.push(formatted);
    }

    return results;
  }

  formatBucketData(rows, traceId, stationKey, bucketTs) {
    const metrics = { PRE: {}, POST: {} };
    let knobs = {};
    const audio = { PRE: null, POST: null };

    for (const row of rows) {
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

      // Process knobs (once)
      if (row.knobs_json && Object.keys(knobs).length === 0) {
        knobs = row.knobs_json;
      }

      // Process audio URLs
      if (row.file_path && row.audio_tap) {
        audio[row.audio_tap] = {
          endpoint: `/api/audio/segment?trace_id=${traceId}&station_key=${stationKey}&tap=${row.audio_tap}&bucket_ts=${bucketTs}`
        };
      }
    }

    return {
      bucket_ts: bucketTs,
      bucket_ms: 5000,
      station_key: stationKey,
      knobs_snapshot: knobs,
      metrics: metrics,
      audio: audio,
      config_version: 1,
      last_knob_event_id: null
    };
  }

  async getAudioFilePath(traceId, stationKey, tap, bucketTs) {
    const query = `
      SELECT file_path
      FROM audio_segments_5s
      WHERE trace_id = $1
        AND station_key = $2
        AND tap = $3
        AND bucket_ts = $4
    `;

    const result = await this.databaseBridge.query(query, [
      traceId,
      stationKey,
      tap,
      bucketTs
    ]);

    return result.rows.length > 0 ? result.rows[0].file_path : null;
  }
}

module.exports = { OptimizerHelpers };
```

---

## Day 2: Supporting Infrastructure (8 hours)

### Task 2.1: BucketScheduler.js (3 hours)
[Same as before - create as external file in lib/]

### Task 2.2: DatabaseBridge Extensions (2 hours)
[Same as before - add methods to existing file]

### Task 2.3: Deployment Script with Backup (1 hour)

#### New File: `/home/azureuser/phase1_deploy_modular.sh`
```bash
#!/bin/bash
# Modular deployment with backup policy

echo "======================================="
echo "Phase 1: Modular Optimizer Deployment"
echo "======================================="

# Set variables
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/azureuser/backups/phase1_${TIMESTAMP}"
APP_DIR="/home/azureuser/translation-app/STTTTSserver"

# Step 1: Create backup
echo "[1/6] Creating backup..."
mkdir -p $BACKUP_DIR

# Backup files that will be modified (only 2 files!)
cp $APP_DIR/STTTTSserver.js $BACKUP_DIR/
cp $APP_DIR/Monitoring_Stations/bridge/DatabaseBridge.js $BACKUP_DIR/

# Backup database schema
PGPASSWORD=monitoring_pass pg_dump -U monitoring_user -h localhost \
  -d monitoring_v2 --schema-only > $BACKUP_DIR/schema_backup.sql

tar -czf $BACKUP_DIR.tar.gz -C $(dirname $BACKUP_DIR) $(basename $BACKUP_DIR)
echo "✓ Backup saved to: $BACKUP_DIR.tar.gz"

# Step 2: Create new directories
echo "[2/6] Creating directories..."
mkdir -p $APP_DIR/api
mkdir -p $APP_DIR/lib
echo "✓ Directories created"

# Step 3: Copy new files (assuming they're staged locally)
echo "[3/6] Copying new files..."
# These would be scp'd from local or created directly
echo "✓ Files to create:"
echo "  - api/OptimizerAPI.js (new)"
echo "  - lib/BucketScheduler.js (new)"
echo "  - lib/OptimizerHelpers.js (new)"

# Step 4: Apply minimal changes to existing files
echo "[4/6] Applying minimal changes..."
# Add 3 lines to STTTTSserver.js
# Add methods to DatabaseBridge.js
echo "✓ Modifications applied"

# Step 5: Apply database changes
echo "[5/6] Updating database..."
PGPASSWORD=monitoring_pass psql -U monitoring_user -d monitoring_v2 -h localhost << 'EOF'
-- Add extensions columns
ALTER TABLE traces
  ADD COLUMN IF NOT EXISTS src_extension VARCHAR(50),
  ADD COLUMN IF NOT EXISTS dst_extension VARCHAR(50);

-- Update GLOBAL trace
UPDATE traces
SET src_extension = '3333', dst_extension = '4444'
WHERE trace_id = 'GLOBAL';

-- Create idempotency table
CREATE TABLE IF NOT EXISTS knob_apply_requests (
  idempotency_key UUID PRIMARY KEY,
  trace_id VARCHAR(255) NOT NULL,
  station_key VARCHAR(50) NOT NULL,
  apply_at_bucket_ts TIMESTAMP NOT NULL,
  knobs JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  applied_at TIMESTAMP,
  config_version INTEGER
);

-- Add config version
ALTER TABLE knob_snapshots_5s
  ADD COLUMN IF NOT EXISTS config_version INTEGER DEFAULT 0;

-- Create index
CREATE INDEX IF NOT EXISTS idx_traces_active
  ON traces(ended_at)
  WHERE ended_at IS NULL;
EOF
echo "✓ Database updated"

# Step 6: Restart service
echo "[6/6] Restarting service..."
pm2 restart STTTTSserver
sleep 5

# Verify endpoints
echo ""
echo "Verifying endpoints..."
curl -s -o /dev/null -w "  /api/traces/active: %{http_code}\n" http://localhost:3020/api/traces/active
curl -s -o /dev/null -w "  /api/optimizer/snapshot: %{http_code}\n" http://localhost:3020/api/optimizer/snapshot?trace_id=test
curl -s -o /dev/null -w "  /api/audio/segment: %{http_code}\n" http://localhost:3020/api/audio/segment
curl -X POST -s -o /dev/null -w "  /api/optimizer/knobs/apply: %{http_code}\n" http://localhost:3020/api/optimizer/knobs/apply -d '{}'

echo ""
echo "======================================="
echo "✓ Deployment complete!"
echo "✓ Backup at: $BACKUP_DIR.tar.gz"
echo "======================================="

# Show rollback command
echo ""
echo "To rollback if needed:"
echo "  tar -xzf $BACKUP_DIR.tar.gz -C /"
echo "  cp $BACKUP_DIR/STTTTSserver.js $APP_DIR/"
echo "  cp $BACKUP_DIR/DatabaseBridge.js $APP_DIR/Monitoring_Stations/bridge/"
echo "  pm2 restart STTTTSserver"
```

---

## BENEFITS OF MODULAR APPROACH

### 1. **Minimal Risk to STTTTSserver.js**
- Only 3 lines added (import and initialize)
- Core server logic untouched
- Easy to disable (comment out 3 lines)

### 2. **Complete Isolation**
- All optimizer code in separate module
- Independent testing possible
- Can be developed/debugged separately

### 3. **Easy Rollback**
```bash
# To disable optimizer completely:
# Just comment out these 3 lines in STTTTSserver.js:
// const { OptimizerAPI } = require('./api/OptimizerAPI');
// const optimizerAPI = new OptimizerAPI(app, globalNewMonitoring.databaseBridge, knobsResolver);
// console.log('[STTTTSserver] Optimizer API loaded from external module');
```

### 4. **Better Organization**
```
api/
  OptimizerAPI.js         # All 4 endpoints
lib/
  BucketScheduler.js      # Scheduling logic
  OptimizerHelpers.js     # Helper functions
```

---

## REVISED FILE IMPACT

### FILES TO MODIFY (Minimal!):
1. **STTTTSserver.js**: +3 lines only!
2. **DatabaseBridge.js**: +150 lines (new methods)

### FILES TO CREATE (All External):
3. **api/OptimizerAPI.js**: 400 lines (all endpoints)
4. **lib/BucketScheduler.js**: 250 lines
5. **lib/OptimizerHelpers.js**: 150 lines
6. **phase1_deploy_modular.sh**: 100 lines
7. **test_optimizer_apis.js**: 150 lines
8. **test_optimizer.py**: 100 lines

---

## BACKUP POLICY

### Before EVERY Change:
```bash
# Automated in deploy script
backup_file() {
  FILE=$1
  BACKUP_DIR="/home/azureuser/backups/$(date +%Y%m%d)"
  mkdir -p $BACKUP_DIR
  cp $FILE $BACKUP_DIR/$(basename $FILE).$(date +%H%M%S)
  echo "Backed up: $FILE"
}

# Usage
backup_file /path/to/file.js
```

### Daily Backups:
```bash
# Add to cron
0 0 * * * /home/azureuser/backup_new_monitoring.sh
```

### Git Commits:
```bash
# After each successful change
git add -A
git commit -m "Phase 1: Add <feature>"
git push
```

---

## TESTING WITHOUT RISK

### Test External Module First:
```javascript
// test_optimizer_standalone.js
const express = require('express');
const app = express();
app.use(express.json());

// Test OptimizerAPI independently
const { OptimizerAPI } = require('./api/OptimizerAPI');
const mockDB = { /* mock methods */ };
const mockKnobs = { /* mock methods */ };

const optimizer = new OptimizerAPI(app, mockDB, mockKnobs);

app.listen(3021, () => {
  console.log('Test server on port 3021');
});
```

---

## SUCCESS CRITERIA

✅ STTTTSserver.js remains stable (only 3 lines added)
✅ All 4 endpoints work via external module
✅ Can disable optimizer by commenting 3 lines
✅ Complete backup before changes
✅ Easy rollback procedure
✅ Modular, maintainable code

---

*Modular Implementation Plan - Maximum Stability*
*Created: January 4, 2026*