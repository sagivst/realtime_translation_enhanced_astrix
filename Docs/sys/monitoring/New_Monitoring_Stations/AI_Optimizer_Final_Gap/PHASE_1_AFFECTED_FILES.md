# Phase 1: Affected Files List
## Complete File Impact Analysis

---

## 📁 FILES TO MODIFY (3 files)

### 1. **STTTTSserver.js**
**Location:** `/home/azureuser/translation-app/STTTTSserver/STTTTSserver.js`
**Size:** ~3500 lines
**Changes:** Add ~400 lines

**Modifications:**
- Line ~3090: Add `/api/traces/active` endpoint (50 lines)
- Line ~3140: Add `/api/optimizer/snapshot` endpoint (120 lines)
- Line ~3260: Add `/api/audio/segment` endpoint (80 lines)
- Line ~3340: Add `/api/optimizer/knobs/apply` endpoint (90 lines)
- Line ~50: Import BucketScheduler class
- Line ~2500: Initialize BucketScheduler instance

**Dependencies to add:**
```javascript
const fs = require('fs');
const path = require('path');
const { BucketScheduler } = require('./lib/BucketScheduler');
```

---

### 2. **DatabaseBridge.js**
**Location:** `/home/azureuser/translation-app/STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js`
**Size:** ~420 lines
**Changes:** Add ~150 lines

**New Methods to Add:**
```javascript
// Line ~420: Add these methods
async getActiveTraces(maxAge = '1 hour')     // 20 lines
async getUnifiedSnapshot(traceId, stationKey, bucketTs)  // 40 lines
async getCompletedBuckets(traceId, sinceBucketTs, limit)  // 30 lines
async query(text, params)  // 10 lines (wrapper for pool.query)
async recordKnobEvents(traceId, stationKey, knobs, source)  // 25 lines
async checkIdempotencyKey(key)  // 15 lines
async recordIdempotencyKey(key, data)  // 15 lines
```

---

### 3. **KnobsResolver.js** (Minor changes)
**Location:** `/home/azureuser/translation-app/STTTTSserver/Monitoring_Stations/station/generic/KnobsResolver.js`
**Size:** ~200 lines
**Changes:** Add ~30 lines

**New Methods to Add:**
```javascript
// Line ~180: Add validation methods
isValidKnob(key)  // 5 lines
clampValue(key, value)  // 10 lines
getKnobMetadata(key)  // 10 lines
```

---

## 📁 FILES TO CREATE (6 new files)

### 4. **BucketScheduler.js** (NEW)
**Location:** `/home/azureuser/translation-app/STTTTSserver/lib/BucketScheduler.js`
**Size:** ~250 lines

**Purpose:** Manages scheduled knob applications
**Key Classes:**
- `BucketScheduler` class
- Methods: `scheduleKnobUpdate()`, `processScheduledUpdates()`, `applyUpdate()`

---

### 5. **test_optimizer_apis.js** (NEW)
**Location:** `/home/azureuser/test_optimizer_apis.js`
**Size:** ~150 lines

**Purpose:** Integration testing for all 4 APIs
**Tests:**
- Active traces discovery
- Snapshot retrieval
- Audio segment serving
- Knob application

---

### 6. **test_optimizer.py** (NEW)
**Location:** `/home/azureuser/test_optimizer.py`
**Size:** ~100 lines

**Purpose:** Python optimizer test client
**Features:**
- Pull-based loop
- 5-second cycle
- Basic decision logic

---

### 7. **optimizer_api_helpers.js** (NEW - Optional)
**Location:** `/home/azureuser/translation-app/STTTTSserver/lib/optimizer_api_helpers.js`
**Size:** ~100 lines

**Purpose:** Helper functions for optimizer APIs
**Functions:**
- `formatBucketResponse()`
- `validateKnobUpdate()`
- `buildAudioUrl()`

---

### 8. **phase1_setup.sql** (NEW)
**Location:** `/home/azureuser/phase1_setup.sql`
**Size:** ~50 lines

**Purpose:** Database schema updates
**Changes:**
```sql
ALTER TABLE traces ADD COLUMN src_extension VARCHAR(50);
ALTER TABLE traces ADD COLUMN dst_extension VARCHAR(50);
CREATE TABLE knob_apply_requests (...);
ALTER TABLE knob_snapshots_5s ADD COLUMN config_version INTEGER;
CREATE INDEX idx_traces_active ON traces(ended_at);
```

---

### 9. **phase1_deploy.sh** (NEW)
**Location:** `/home/azureuser/phase1_deploy.sh`
**Size:** ~30 lines

**Purpose:** Deployment script
```bash
#!/bin/bash
# Backup current system
# Apply database changes
# Copy new files
# Restart PM2
# Run tests
```

---

## 📊 SUMMARY BY LOCATION

### On Azure VM (`20.170.155.53`):

#### **Modified Files:**
```
/home/azureuser/translation-app/STTTTSserver/
├── STTTTSserver.js                                    [MODIFY: +400 lines]
├── Monitoring_Stations/
│   ├── bridge/
│   │   └── DatabaseBridge.js                          [MODIFY: +150 lines]
│   └── station/
│       └── generic/
│           └── KnobsResolver.js                       [MODIFY: +30 lines]
└── lib/
    └── BucketScheduler.js                             [CREATE: 250 lines]
```

#### **New Test Files:**
```
/home/azureuser/
├── test_optimizer_apis.js                             [CREATE: 150 lines]
├── test_optimizer.py                                  [CREATE: 100 lines]
├── phase1_setup.sql                                   [CREATE: 50 lines]
└── phase1_deploy.sh                                   [CREATE: 30 lines]
```

---

## 🔄 FILE BACKUP COMMANDS

Before starting, backup all files that will be modified:

```bash
# SSH to VM
ssh azureuser@20.170.155.53

# Create backup directory
mkdir -p /home/azureuser/backups/phase1_$(date +%Y%m%d)
cd /home/azureuser/backups/phase1_$(date +%Y%m%d)

# Backup files to be modified
cp /home/azureuser/translation-app/STTTTSserver/STTTTSserver.js ./
cp /home/azureuser/translation-app/STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js ./
cp /home/azureuser/translation-app/STTTTSserver/Monitoring_Stations/station/generic/KnobsResolver.js ./

# Create tarball
tar -czf phase1_backup_$(date +%Y%m%d_%H%M%S).tar.gz *.js

echo "Backup complete!"
```

---

## 📝 FILE MODIFICATION TRACKING

### Version Control Commands:
```bash
# Check current status
git status

# Create new branch for Phase 1
git checkout -b phase1_optimizer_apis

# After each file modification
git add <filename>
git commit -m "Phase 1: Add <feature> to <file>"

# After completion
git push -u origin phase1_optimizer_apis
```

---

## ⚠️ CRITICAL FILES - DO NOT MODIFY

These files should NOT be changed in Phase 1:

```
❌ /Monitoring_Stations/station/generic/Aggregator.js          # Working perfectly
❌ /Monitoring_Stations/station/generic/St_Handler_Generic.js   # Working perfectly
❌ /Monitoring_Stations/bridge/MetricsEmitter.js                # Working perfectly
❌ /Monitoring_Stations/audio/AudioRecorder.js                  # Working perfectly
❌ /Monitoring_Stations/audio/AudioWriter.js                    # Working perfectly
```

---

## 📋 DEPLOYMENT CHECKLIST

### Pre-deployment:
- [ ] Backup all 3 files to be modified
- [ ] Create new git branch
- [ ] Test current system is working

### File Updates:
- [ ] Update STTTTSserver.js (4 endpoints)
- [ ] Update DatabaseBridge.js (query methods)
- [ ] Update KnobsResolver.js (validation)
- [ ] Create BucketScheduler.js
- [ ] Create test files

### Database Updates:
- [ ] Add src_extension, dst_extension to traces
- [ ] Create knob_apply_requests table
- [ ] Add config_version column
- [ ] Create indexes

### Post-deployment:
- [ ] Restart PM2
- [ ] Run test_optimizer_apis.js
- [ ] Run test_optimizer.py
- [ ] Verify all 4 endpoints work
- [ ] Commit and push to git

---

## 🎯 TOTAL IMPACT

| Category | Count | Lines of Code |
|----------|-------|---------------|
| Files to Modify | 3 | +580 lines |
| Files to Create | 6 | +680 lines |
| Database Tables Modified | 2 | - |
| Database Tables Created | 1 | - |
| New API Endpoints | 4 | - |
| **TOTAL NEW CODE** | **9 files** | **~1,260 lines** |

---

## 🚀 QUICK VERIFICATION

After deployment, verify each file:

```bash
# Check if endpoints exist
curl http://20.170.155.53:3020/api/traces/active
curl http://20.170.155.53:3020/api/optimizer/snapshot?trace_id=test
curl http://20.170.155.53:3020/api/audio/segment?trace_id=test
curl -X POST http://20.170.155.53:3020/api/optimizer/knobs/apply -d '{}'

# Check if BucketScheduler is loaded
ssh azureuser@20.170.155.53 "pm2 logs STTTTSserver --lines 100 | grep BucketScheduler"

# Check database changes
ssh azureuser@20.170.155.53 "PGPASSWORD=monitoring_pass psql -U monitoring_user -d monitoring_v2 -h localhost -c '\\d knob_apply_requests'"
```

---

*File Impact Analysis Complete*
*Total: 3 files modified, 6 files created*
*Estimated code changes: ~1,260 lines*