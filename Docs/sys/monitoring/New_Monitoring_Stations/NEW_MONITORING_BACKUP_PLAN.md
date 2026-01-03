# NEW Monitoring System - Complete Backup Plan
## For Full Deployment on New Machine - Azure VM (20.170.155.53)

---

## 1. CURRENT FILES IN MONITORING_STATIONS
### Base Path: `/home/azureuser/translation-app/STTTTSserver/Monitoring_Stations/`

#### COMPLETE FILE LIST (13 files as of Jan 2, 2026):
```
/home/azureuser/translation-app/STTTTSserver/Monitoring_Stations/
├── audio/
│   ├── AudioRecorder.js
│   └── AudioWriter.js
├── bridge/
│   ├── BackpressurePolicy.js
│   ├── DatabaseBridge.js
│   └── MetricsEmitter.js
├── config/
│   └── monitoring.config.json
├── station/
│   ├── generic/
│   │   ├── Aggregator.js
│   │   ├── KnobsRegistry.js
│   │   ├── KnobsResolver.js
│   │   ├── MetricsRegistry.js
│   │   └── St_Handler_Generic.js
│   └── stations/
│       └── Station3_3333_Handler.js
└── MonitoringStationsBootstrap.js
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
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

### Backup NEW Monitoring Code:
```bash
# On VM - backup monitoring stations directory
tar -czf new_monitoring_backup_$(date +%Y%m%d).tar.gz \
  -C /home/azureuser/translation-app/STTTTSserver \
  Monitoring_Stations/

# Backup modified STTTTSserver.js
cp /home/azureuser/translation-app/STTTTSserver/STTTTSserver.js \
   STTTTSserver_with_monitoring_$(date +%Y%m%d).js
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

### Create this script on VM: backup_new_monitoring.sh
```bash
#!/bin/bash
# Complete backup of NEW monitoring system
BACKUP_DIR="/home/azureuser/monitoring_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

echo "Backing up NEW Monitoring System..."

# 1. Backup all Monitoring_Stations files
cp -r /home/azureuser/translation-app/STTTTSserver/Monitoring_Stations $BACKUP_DIR/

# 2. Backup STTTTSserver.js with monitoring changes
cp /home/azureuser/translation-app/STTTTSserver/STTTTSserver.js $BACKUP_DIR/

# 3. Backup package.json
cp /home/azureuser/translation-app/STTTTSserver/package.json $BACKUP_DIR/

# 4. Export database schema
sudo -u postgres pg_dump -d monitoring_v2 --schema-only > $BACKUP_DIR/monitoring_v2_schema.sql

# 5. Export monitoring environment variables
grep "MONITORING" /home/azureuser/translation-app/.env > $BACKUP_DIR/monitoring.env 2>/dev/null

# 6. Create file list
find $BACKUP_DIR -type f > $BACKUP_DIR/file_list.txt

# 7. Create tarball
cd /home/azureuser
tar -czf monitoring_backup_$(date +%Y%m%d).tar.gz monitoring_backup_*

echo "Backup complete: monitoring_backup_$(date +%Y%m%d).tar.gz"
```

## 10. FILES TO BACKUP - COMPLETE LIST

### MUST HAVE (Total 13 files + extras):
```
# Monitoring Station Files (13):
/home/azureuser/translation-app/STTTTSserver/Monitoring_Stations/audio/AudioRecorder.js
/home/azureuser/translation-app/STTTTSserver/Monitoring_Stations/audio/AudioWriter.js
/home/azureuser/translation-app/STTTTSserver/Monitoring_Stations/bridge/BackpressurePolicy.js
/home/azureuser/translation-app/STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js
/home/azureuser/translation-app/STTTTSserver/Monitoring_Stations/bridge/MetricsEmitter.js
/home/azureuser/translation-app/STTTTSserver/Monitoring_Stations/config/monitoring.config.json
/home/azureuser/translation-app/STTTTSserver/Monitoring_Stations/station/generic/Aggregator.js
/home/azureuser/translation-app/STTTTSserver/Monitoring_Stations/station/generic/KnobsRegistry.js
/home/azureuser/translation-app/STTTTSserver/Monitoring_Stations/station/generic/KnobsResolver.js
/home/azureuser/translation-app/STTTTSserver/Monitoring_Stations/station/generic/MetricsRegistry.js
/home/azureuser/translation-app/STTTTSserver/Monitoring_Stations/station/generic/St_Handler_Generic.js
/home/azureuser/translation-app/STTTTSserver/Monitoring_Stations/station/stations/Station3_3333_Handler.js
/home/azureuser/translation-app/STTTTSserver/Monitoring_Stations/MonitoringStationsBootstrap.js

# Main Server File:
/home/azureuser/translation-app/STTTTSserver/STTTTSserver.js

# Configuration:
/home/azureuser/translation-app/.env (monitoring variables)

# Database:
PostgreSQL monitoring_v2 schema
```

