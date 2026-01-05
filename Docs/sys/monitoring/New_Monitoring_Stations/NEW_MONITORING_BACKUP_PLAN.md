# NEW Monitoring System - Complete Backup Plan
## For Full Deployment on New Machine - Azure VM (20.170.155.53)
## INCLUDING PHASE 1, 2, & 3 AI OPTIMIZER ADDITIONS

---

## 1. CURRENT FILES IN MONITORING_STATIONS
### Base Path: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/`

#### COMPLETE FILE LIST (Updated Jan 4, 2026 with AI Optimizer):
```
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/
├── api/                                [NEW - Phase 1,2,3]
│   └── OptimizerAPI.js                [400 lines - All optimizer endpoints]
├── lib/                                [NEW - Phase 2,3]
│   ├── BucketScheduler.js             [250 lines - Scheduled knob application]
│   ├── OptimizerHelpers.js            [150 lines - Helper functions]
│   ├── PersistenceLayer.js            [100 lines - Database persistence]
│   └── KnobsResolverFactory.js        [80 lines - Factory for KnobsResolver]
├── Monitoring_Stations/
│   ├── audio/
│   │   ├── AudioRecorder.js
│   │   └── AudioWriter.js
│   ├── bridge/
│   │   ├── BackpressurePolicy.js
│   │   ├── DatabaseBridge.js         [MODIFIED - Added optimizer methods]
│   │   └── MetricsEmitter.js
│   ├── config/
│   │   └── monitoring.config.json
│   ├── station/
│   │   ├── generic/
│   │   │   ├── Aggregator.js
│   │   │   ├── KnobsRegistry.js
│   │   │   ├── KnobsResolver.js       [MODIFIED - Config versioning]
│   │   │   ├── MetricsRegistry.js
│   │   │   └── St_Handler_Generic.js  [MODIFIED - Version tracking]
│   │   └── stations/
│   │       └── Station3_3333_Handler.js
│   └── MonitoringStationsBootstrap.js
└── STTTTSserver.js                    [MODIFIED - 3 lines for OptimizerAPI]

Test & Deployment Files:
/home/azureuser/
├── test_phase2_scheduler.js           [NEW - 200 lines]
├── test_optimizer_apis.js             [NEW - 150 lines]
├── test_optimizer.py                  [NEW - 100 lines]
├── test_optimizer_standalone.js       [NEW - 50 lines]
├── phase1_deploy_modular.sh           [NEW - 100 lines]
└── phase2_schema.sql                  [NEW - 50 lines]
```

## 2. MODIFIED FILES WITH NEW MONITORING
### Files outside Monitoring_Stations/ with NEW monitoring additions:

```
/home/azureuser/translation-app/STTTTSserver/STTTTSserver.js
# Lines modified for NEW monitoring:
# - Lines 2412-2425: trace_id generation using pairManager.startTimes
# - Monitoring context initialization
# - Station handler integration
```

## 3. DATABASE SCHEMA
### Database: `monitoring_v2` (PostgreSQL)

```sql
-- Location: PostgreSQL on VM
-- Database: monitoring_v2

-- ORIGINAL TABLES (Phase 0 - Base System)
CREATE TABLE traces (
    trace_id VARCHAR(255) PRIMARY KEY,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    src_extension VARCHAR(50) NOT NULL,
    dst_extension VARCHAR(50),
    sample_rate INTEGER DEFAULT 16000,
    channels INTEGER DEFAULT 1
);

CREATE TABLE metrics_agg_5s (
    trace_id VARCHAR(255) NOT NULL,
    station_key VARCHAR(50) NOT NULL,
    tap VARCHAR(10) NOT NULL,  -- PRE or POST
    metric_key VARCHAR(100) NOT NULL,
    bucket_ts TIMESTAMP NOT NULL,
    bucket_ms INTEGER DEFAULT 5000,
    count INTEGER NOT NULL,
    min DOUBLE PRECISION,
    max DOUBLE PRECISION,
    avg DOUBLE PRECISION,
    last DOUBLE PRECISION,
    PRIMARY KEY (trace_id, station_key, tap, metric_key, bucket_ts)
);

CREATE TABLE audio_segments_5s (
    trace_id VARCHAR(255) NOT NULL,
    station_key VARCHAR(50) NOT NULL,
    tap VARCHAR(10) NOT NULL,  -- PRE or POST
    bucket_ts TIMESTAMP NOT NULL,
    bucket_ms INTEGER DEFAULT 5000,
    sample_rate_hz INTEGER DEFAULT 16000,
    channels INTEGER DEFAULT 1,
    format VARCHAR(50) DEFAULT 'WAV_PCM_S16LE_MONO',
    file_path TEXT NOT NULL,
    PRIMARY KEY (trace_id, station_key, tap, bucket_ts)
);

CREATE TABLE knob_snapshots_5s (
    trace_id VARCHAR(255) NOT NULL,
    station_key VARCHAR(50) NOT NULL,
    bucket_ts TIMESTAMP NOT NULL,
    knob_values JSONB NOT NULL,
    config_version INTEGER DEFAULT 1,  -- ADDED in Phase 2
    PRIMARY KEY (trace_id, station_key, bucket_ts)
);

CREATE TABLE knob_events (
    event_id SERIAL PRIMARY KEY,
    trace_id VARCHAR(255),
    station_key VARCHAR(50),
    knob_key VARCHAR(100) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    changed_by VARCHAR(100),
    config_version INTEGER,  -- ADDED in Phase 2
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NEW TABLES (Phase 2 - Advanced Control)
CREATE TABLE scheduled_knob_updates (
    id SERIAL PRIMARY KEY,
    idempotency_key UUID UNIQUE NOT NULL,
    trace_id VARCHAR(255),
    station_key VARCHAR(50),
    apply_at_bucket_ts TIMESTAMPTZ NOT NULL,
    knobs JSONB NOT NULL,
    source VARCHAR(50),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    applied_at TIMESTAMPTZ,
    error_message TEXT
);

CREATE TABLE knob_apply_requests (
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
    status VARCHAR(20) DEFAULT 'scheduled'
);

-- NEW TABLES (Phase 3 - Apply Verification)
CREATE TABLE knob_apply_verification (
    id SERIAL PRIMARY KEY,
    idempotency_key UUID NOT NULL,
    trace_id VARCHAR(255),
    station_key VARCHAR(50),
    config_version INTEGER,
    applied_knobs JSONB,
    verified_knobs JSONB,
    verification_status VARCHAR(20) DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE knob_verifications (
    id SERIAL PRIMARY KEY,
    trace_id VARCHAR(255) NOT NULL,
    station_key VARCHAR(50) NOT NULL,
    bucket_ts TIMESTAMP NOT NULL,
    expected_knobs JSONB NOT NULL,
    actual_knobs JSONB,
    verification_status VARCHAR(20) DEFAULT 'pending',
    verification_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP
);

-- NEW VIEW (Phase 2)
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

-- INDEXES (Phase 2 & 3)
CREATE INDEX idx_scheduled_updates_status ON scheduled_knob_updates(status);
CREATE INDEX idx_scheduled_updates_bucket ON scheduled_knob_updates(apply_at_bucket_ts);
CREATE INDEX idx_knob_apply_bucket ON knob_apply_requests(apply_at_bucket_ts) WHERE status = 'scheduled';
CREATE INDEX idx_knob_apply_trace_station ON knob_apply_requests(trace_id, station_key);
CREATE INDEX idx_knob_verifications_trace ON knob_verifications(trace_id, bucket_ts);
```

## 4. CONFIGURATION FILES
### NEW Monitoring-specific configs:

```bash
# Environment variables in .env (monitoring-related only)
MONITORING_ENABLED=true
MONITORING_DB=monitoring_v2
MONITORING_AUDIO_PATH=/var/monitoring/audio
MONITORING_RETENTION_HOURS=72
```

## 5. DATA DIRECTORIES
### Created by NEW monitoring system:

```
/var/monitoring/
├── audio/                      # WAV file storage
│   └── YYYY-MM-DD/             # Daily directories
│       └── trace_*/            # Per-trace directories
│           └── St_*/           # Per-station directories
│               ├── PRE/        # Raw audio segments
│               └── POST/       # Processed audio segments
└── logs/                       # Monitoring logs
```

## 6. BACKUP COMMANDS

### Backup NEW Monitoring Code (INCLUDING AI Optimizer):
```bash
# On VM - backup ALL monitoring and optimizer files
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/azureuser/backup_${BACKUP_DATE}"
mkdir -p $BACKUP_DIR

# Backup Monitoring Stations directory
tar -czf $BACKUP_DIR/monitoring_stations.tar.gz \
  -C /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver \
  Monitoring_Stations/

# Backup NEW API and Library directories (Phase 1,2,3)
tar -czf $BACKUP_DIR/optimizer_files.tar.gz \
  -C /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver \
  api/ lib/

# Backup test files
cp /home/azureuser/test_*.js $BACKUP_DIR/
cp /home/azureuser/test_*.py $BACKUP_DIR/
cp /home/azureuser/phase*.sh $BACKUP_DIR/
cp /home/azureuser/phase*.sql $BACKUP_DIR/

# Backup modified STTTTSserver.js
cp /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js \
   $BACKUP_DIR/STTTTSserver_with_optimizer_${BACKUP_DATE}.js
```

### Backup Database Schema:
```bash
# Export monitoring_v2 schema only
sudo -u postgres pg_dump -d monitoring_v2 \
  --schema-only \
  -f monitoring_v2_schema_$(date +%Y%m%d).sql
```

### Backup Audio Data:
```bash
# Backup recent audio (optional - large)
tar -czf monitoring_audio_$(date +%Y%m%d).tar.gz \
  /var/monitoring/audio/
```

## 7. DEPENDENCIES FOR NEW MONITORING ONLY

### Required NPM packages for monitoring:
```json
{
  "dependencies": {
    "pg": "^8.16.3",         // For PostgreSQL connection (DatabaseBridge.js)
    "uuid": "^13.0.0"        // For trace_id generation
  }
}
```

### Install command:
```bash
npm install pg uuid
```

## 8. RESTORE COMMANDS

### On New Server:
```bash
# 1. Install Node.js and PostgreSQL
sudo apt update
sudo apt install -y nodejs npm postgresql postgresql-contrib

# 2. Create database
sudo -u postgres createdb monitoring_v2

# 3. Import schema
sudo -u postgres psql -d monitoring_v2 < monitoring_v2_schema.sql

# 4. Copy monitoring code
mkdir -p /home/azureuser/translation-app/STTTTSserver
tar -xzf new_monitoring_backup.tar.gz \
  -C /home/azureuser/translation-app/STTTTSserver/

# 5. Install dependencies
cd /home/azureuser/translation-app/STTTTSserver
npm install

# 6. Create data directories
sudo mkdir -p /var/monitoring/audio
sudo mkdir -p /var/monitoring/logs
sudo chown -R azureuser:azureuser /var/monitoring

# 7. Copy STTTTSserver.js with monitoring changes
cp STTTTSserver_with_monitoring.js STTTTSserver.js

# 8. Set environment variables
cat >> .env << EOF
MONITORING_ENABLED=true
MONITORING_DB=monitoring_v2
MONITORING_AUDIO_PATH=/var/monitoring/audio
MONITORING_RETENTION_HOURS=72
EOF
```

## 9. COMPLETE BACKUP SCRIPT

### Create this script on VM: backup_new_monitoring_complete.sh
```bash
#!/bin/bash
# Complete backup of NEW monitoring system WITH AI Optimizer (Phase 1,2,3)
BACKUP_DIR="/home/azureuser/monitoring_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

echo "Backing up NEW Monitoring System + AI Optimizer..."

# 1. Backup all Monitoring_Stations files
cp -r /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations $BACKUP_DIR/

# 2. Backup NEW API directory (Phase 1,2,3)
cp -r /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/api $BACKUP_DIR/

# 3. Backup NEW lib directory (Phase 2,3)
cp -r /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/lib $BACKUP_DIR/

# 4. Backup STTTTSserver.js with all changes
cp /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js $BACKUP_DIR/

# 5. Backup test and deployment scripts
cp /home/azureuser/test_*.js $BACKUP_DIR/ 2>/dev/null
cp /home/azureuser/test_*.py $BACKUP_DIR/ 2>/dev/null
cp /home/azureuser/phase*.sh $BACKUP_DIR/ 2>/dev/null
cp /home/azureuser/phase*.sql $BACKUP_DIR/ 2>/dev/null

# 6. Backup package.json
cp /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/package.json $BACKUP_DIR/

# 7. Export COMPLETE database schema (with all new tables)
PGPASSWORD=monitoring_pass pg_dump -U monitoring_user -d monitoring_v2 --schema-only > $BACKUP_DIR/monitoring_v2_schema_complete.sql

# 8. Export monitoring environment variables
grep "MONITORING" /home/azureuser/translation-app/.env > $BACKUP_DIR/monitoring.env 2>/dev/null

# 9. Create detailed file inventory
echo "=== File Inventory ===" > $BACKUP_DIR/inventory.txt
echo "Monitoring Stations: $(find $BACKUP_DIR/Monitoring_Stations -type f | wc -l) files" >> $BACKUP_DIR/inventory.txt
echo "API Files: $(find $BACKUP_DIR/api -type f 2>/dev/null | wc -l) files" >> $BACKUP_DIR/inventory.txt
echo "Library Files: $(find $BACKUP_DIR/lib -type f 2>/dev/null | wc -l) files" >> $BACKUP_DIR/inventory.txt
echo "Test Files: $(ls -1 $BACKUP_DIR/test_* 2>/dev/null | wc -l) files" >> $BACKUP_DIR/inventory.txt
find $BACKUP_DIR -type f > $BACKUP_DIR/file_list.txt

# 10. Create tarball
cd /home/azureuser
tar -czf monitoring_backup_complete_$(date +%Y%m%d).tar.gz monitoring_backup_*

echo "Backup complete: monitoring_backup_complete_$(date +%Y%m%d).tar.gz"
echo "Total size: $(du -h monitoring_backup_complete_*.tar.gz | cut -f1)"
```

## 10. FILES TO BACKUP - COMPLETE LIST

### MUST HAVE (Total 25+ files with AI Optimizer):
```
# BASE Monitoring Station Files (13):
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/audio/AudioRecorder.js
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/audio/AudioWriter.js
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/bridge/BackpressurePolicy.js
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/bridge/MetricsEmitter.js
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/config/monitoring.config.json
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/Aggregator.js
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/KnobsRegistry.js
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/KnobsResolver.js
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/MetricsRegistry.js
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/St_Handler_Generic.js
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/stations/Station3_3333_Handler.js
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/MonitoringStationsBootstrap.js

# NEW AI Optimizer Files (Phase 1,2,3):
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/api/OptimizerAPI.js         [NEW]
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/lib/BucketScheduler.js      [NEW]
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/lib/OptimizerHelpers.js     [NEW]
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/lib/PersistenceLayer.js     [NEW]
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/lib/KnobsResolverFactory.js [NEW]

# Test & Deployment Scripts:
/home/azureuser/test_phase2_scheduler.js      [NEW]
/home/azureuser/test_optimizer_apis.js        [NEW]
/home/azureuser/test_optimizer.py             [NEW]
/home/azureuser/test_optimizer_standalone.js  [NEW]
/home/azureuser/phase1_deploy_modular.sh      [NEW]
/home/azureuser/phase2_schema.sql             [NEW]

# Main Server File (Modified):
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js

# Configuration:
/home/azureuser/translation-app/.env (monitoring variables)

# Database (9 tables, 1 view):
PostgreSQL monitoring_v2 complete schema with:
- 5 original tables (traces, metrics_agg_5s, audio_segments_5s, knob_snapshots_5s, knob_events)
- 4 NEW tables (scheduled_knob_updates, knob_apply_requests, knob_apply_verification, knob_verifications)
- 1 NEW view (pending_knob_applications)
- 11+ indexes
```

### Summary Statistics:
- **Original Monitoring Files:** 13 files
- **NEW Optimizer Files:** 5 library files + 1 API file
- **NEW Test Files:** 4 files
- **NEW Deployment Scripts:** 2 files
- **Total Files to Backup:** 25+ files
- **Database Objects:** 9 tables + 1 view + 11 indexes
- **Total NEW Code:** ~1,500 lines

---

## 11. QUICK RESTORE GUIDE (WITH AI OPTIMIZER)

### For Complete System Restoration:
```bash
# 1. Extract backup
tar -xzf monitoring_backup_complete_YYYYMMDD.tar.gz

# 2. Restore directory structure
sudo mkdir -p /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/{api,lib}

# 3. Copy all files
cp -r monitoring_backup_*/Monitoring_Stations /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/
cp -r monitoring_backup_*/api/* /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/api/
cp -r monitoring_backup_*/lib/* /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/lib/
cp monitoring_backup_*/STTTTSserver*.js /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js
cp monitoring_backup_*/test_*.* /home/azureuser/
cp monitoring_backup_*/phase*.* /home/azureuser/

# 4. Restore database schema (includes all new tables)
PGPASSWORD=monitoring_pass psql -U monitoring_user -d monitoring_v2 < monitoring_backup_*/monitoring_v2_schema_complete.sql

# 5. Install dependencies
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
npm install

# 6. Restart service
pm2 restart STTTTSserver

# 7. Verify endpoints
curl http://localhost:3020/api/traces/active
curl http://localhost:3020/api/optimizer/snapshot?trace_id=test
```

---

## 12. PHASE IMPLEMENTATION STATUS

### ✅ Phase 0: Base Monitoring System
- 13 core monitoring files
- 5 database tables
- Basic metrics and audio recording

### ✅ Phase 1: Core API Implementation
- OptimizerAPI.js created (400 lines)
- 3 new endpoints (active traces, snapshot, audio)
- OptimizerHelpers.js created (150 lines)

### ✅ Phase 2: Advanced Control
- BucketScheduler.js created (250 lines)
- PersistenceLayer.js created (100 lines)
- 3 new database tables
- Scheduled knob application working

### ✅ Phase 3: Apply Verification
- KnobsResolverFactory.js created (80 lines)
- 2 verification endpoints added
- 2 verification tables created
- Live call testing successful

---

*Backup Plan Updated: January 4, 2026*
*System Version: NEW Monitoring System v2.0 with AI Optimizer*
*Location: Azure VM 20.170.155.53*

