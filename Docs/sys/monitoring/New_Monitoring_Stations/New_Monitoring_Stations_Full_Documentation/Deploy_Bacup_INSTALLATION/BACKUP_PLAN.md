# NEW Monitoring System - Complete Backup & Recovery Plan

## Table of Contents
1. [Backup Strategy Overview](#backup-strategy-overview)
2. [Components to Backup](#components-to-backup)
3. [Backup Schedule](#backup-schedule)
4. [Backup Procedures](#backup-procedures)
5. [Storage Locations](#storage-locations)
6. [Restoration Procedures](#restoration-procedures)
7. [Disaster Recovery](#disaster-recovery)
8. [Backup Verification](#backup-verification)
9. [Automated Scripts](#automated-scripts)

---

## Backup Strategy Overview

### Three-Tier Backup Approach
1. **Hot Backups** - Real-time/continuous (database replication, file sync)
2. **Daily Backups** - Automated nightly snapshots
3. **Archive Backups** - Weekly/monthly long-term storage

### Backup Types
- **Full Backup** - Complete system snapshot
- **Incremental** - Changes since last backup
- **Configuration** - Settings and configs only
- **Critical** - Essential files for recovery

---

## Components to Backup

### 1. Database (PostgreSQL)
**Priority: CRITICAL**
- Full database dumps
- Schema exports
- Table-specific exports
- WAL archiving for point-in-time recovery

### 2. Source Code
**Priority: CRITICAL**
- All JavaScript files
- Especially DatabaseBridge.js (lines 127-169 critical)
- Station handlers
- BucketScheduler.js

### 3. Configuration Files
**Priority: HIGH**
- monitoring.config.json
- ecosystem.config.js
- package.json
- .env files

### 4. Audio Files
**Priority: MEDIUM**
- /var/monitoring/audio/traces/
- Selective backup (last 72 hours)
- Compressed archives

### 5. System State
**Priority: HIGH**
- PM2 process list
- Cron jobs
- System settings
- Network configuration

### 6. Logs
**Priority: LOW**
- PM2 logs
- Application logs
- System logs (selective)

### 7. AI Optimizer Service
**Priority: HIGH**
- ai-service-openai.js source code
- .env file (encrypted backup)
- OpenAI API configuration
- Fallback rules configuration
- Decision history logs
- PM2 configuration

---

## Backup Schedule

### Daily Schedule
```
00:00 - Configuration backup
01:00 - Source code backup
02:00 - Database full backup
03:00 - Audio files incremental
04:00 - Logs compression
05:00 - Verification tests
06:00 - Offsite sync
```

### Weekly Schedule
```
Sunday 00:00 - Full system backup
Sunday 06:00 - Archive creation
Sunday 12:00 - Offsite transfer
```

### Monthly Schedule
```
1st of month - Full archive with audio
1st of month - Database archive with history
1st of month - Configuration audit
```

---

## Backup Procedures

### Database Backup

#### Full Database Dump
```bash
#!/bin/bash
# Daily database backup
BACKUP_DIR="/backup/postgres/daily"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="monitoring_v2"

# Create backup directory
mkdir -p $BACKUP_DIR

# Full dump with compression
pg_dump -U monitoring_user -d $DB_NAME | gzip > $BACKUP_DIR/monitoring_v2_$DATE.sql.gz

# Schema only backup
pg_dump -U monitoring_user -d $DB_NAME --schema-only > $BACKUP_DIR/schema_$DATE.sql

# Data only for critical tables
pg_dump -U monitoring_user -d $DB_NAME \
  --data-only \
  --table=traces \
  --table=scheduled_knob_updates \
  > $BACKUP_DIR/critical_data_$DATE.sql
```

#### Continuous WAL Archiving
```bash
# postgresql.conf settings
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /backup/postgres/wal/%f && cp %p /backup/postgres/wal/%f'
```

### Source Code Backup

#### Version Control
```bash
#!/bin/bash
# Git-based backup
cd /home/azureuser/translation-app/3333_4444__Operational

# Initialize if needed
if [ ! -d .git ]; then
  git init
  git add .
  git commit -m "Initial backup"
fi

# Daily commit
DATE=$(date +%Y%m%d_%H%M%S)
git add -A
git commit -m "Automated backup $DATE"

# Push to remote (if configured)
git push backup main
```

#### File-based Backup
```bash
#!/bin/bash
# Critical files backup
BACKUP_DIR="/backup/source/daily"
DATE=$(date +%Y%m%d_%H%M%S)
SOURCE_DIR="/home/azureuser/translation-app/3333_4444__Operational"

mkdir -p $BACKUP_DIR

# Create tar archive with critical files
tar -czf $BACKUP_DIR/source_$DATE.tar.gz \
  --exclude='node_modules' \
  --exclude='*.log' \
  -C $SOURCE_DIR \
  STTTTSserver/STTTTSserver.js \
  STTTTSserver/Monitoring_Stations/MonitoringStationsBootstrap.js \
  STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js \
  STTTTSserver/Monitoring_Stations/bridge/MetricsEmitter.js \
  STTTTSserver/Monitoring_Stations/bridge/AudioWriter.js \
  STTTTSserver/Monitoring_Stations/stations/*.js \
  STTTTSserver/lib/BucketScheduler.js

# Verify critical trace creation code
if ! tar -xOzf $BACKUP_DIR/source_$DATE.tar.gz STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js | grep -q "INSERT INTO traces"; then
  echo "WARNING: DatabaseBridge.js missing trace creation code!"
fi
```

### Configuration Backup
```bash
#!/bin/bash
BACKUP_DIR="/backup/config/daily"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup all config files
cp /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/config/monitoring.config.json \
   $BACKUP_DIR/monitoring.config_$DATE.json

cp /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/ecosystem.config.js \
   $BACKUP_DIR/ecosystem.config_$DATE.js

cp /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/package.json \
   $BACKUP_DIR/package_$DATE.json

# PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 $BACKUP_DIR/pm2_dump_$DATE.pm2

# System configuration
crontab -l > $BACKUP_DIR/crontab_$DATE.txt
```

### Audio Files Backup
```bash
#!/bin/bash
BACKUP_DIR="/backup/audio/daily"
AUDIO_DIR="/var/monitoring/audio"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup recent audio (last 24 hours)
find $AUDIO_DIR -type f -name "*.wav" -mtime -1 | \
  tar -czf $BACKUP_DIR/audio_recent_$DATE.tar.gz -T -

# Archive older audio (compress heavily)
find $AUDIO_DIR -type f -name "*.wav" -mtime +1 -mtime -7 | \
  tar -czf $BACKUP_DIR/audio_week_$DATE.tar.gz -T -
```

### AI Optimizer Backup
```bash
#!/bin/bash
BACKUP_DIR="/backup/ai-optimizer/daily"
AI_DIR="/home/azureuser/translation-app/ai-optimizer"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup AI Optimizer source and config
tar -czf $BACKUP_DIR/ai_optimizer_$DATE.tar.gz \
  -C $AI_DIR \
  ai-service-openai.js \
  package.json \
  ecosystem.ai-optimizer.config.js \
  --exclude=node_modules \
  --exclude=logs

# Backup .env file (encrypted)
if [ -f "$AI_DIR/.env" ]; then
  # Encrypt sensitive configuration
  gpg --symmetric --cipher-algo AES256 \
    --output $BACKUP_DIR/env_encrypted_$DATE.gpg \
    $AI_DIR/.env
fi

# Backup decision history (if logging to file)
if [ -d "$AI_DIR/logs" ]; then
  tar -czf $BACKUP_DIR/ai_logs_$DATE.tar.gz \
    -C $AI_DIR/logs \
    .
fi

# Backup OpenAI usage metrics
cat > $BACKUP_DIR/ai_metrics_$DATE.json << EOF
{
  "backup_date": "$(date -Iseconds)",
  "service": "ai-optimizer",
  "status": "$(pm2 jlist | jq -r '.[] | select(.name=="ai-optimizer") | .pm2_env.status')",
  "uptime": "$(pm2 jlist | jq -r '.[] | select(.name=="ai-optimizer") | .pm2_env.pm_uptime')"
}
EOF
```

---

## Storage Locations

### Primary Backup Location
```
/backup/
├── postgres/
│   ├── daily/        # Daily database dumps
│   ├── wal/          # WAL archives
│   └── archive/      # Long-term archives
├── source/
│   ├── daily/        # Daily source snapshots
│   ├── git/          # Git repository
│   └── archive/      # Version archives
├── config/
│   ├── daily/        # Configuration backups
│   └── history/      # Configuration history
├── audio/
│   ├── daily/        # Recent audio
│   └── archive/      # Compressed archives
├── ai-optimizer/
│   ├── daily/        # AI service backups
│   ├── env/          # Encrypted .env files
│   └── logs/         # Decision history
└── system/
    ├── state/        # System state snapshots
    └── logs/         # Compressed logs
```

### Secondary/Offsite Locations
1. **Cloud Storage** (AWS S3, Azure Blob)
2. **Remote Server** (rsync/scp)
3. **Git Repository** (GitHub/GitLab/Gitea)
4. **Physical Media** (Monthly archives)

---

## Restoration Procedures

### Full System Recovery

#### 1. Database Restoration
```bash
#!/bin/bash
# Restore from backup
BACKUP_FILE="/backup/postgres/daily/monitoring_v2_20260113_020000.sql.gz"

# Drop and recreate database
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS monitoring_v2;
CREATE DATABASE monitoring_v2 OWNER monitoring_user;
EOF

# Restore data
gunzip -c $BACKUP_FILE | psql -U monitoring_user -d monitoring_v2

# Verify
psql -U monitoring_user -d monitoring_v2 -c "\dt"
```

#### 2. Source Code Restoration
```bash
#!/bin/bash
# Restore from tar archive
BACKUP_FILE="/backup/source/daily/source_20260113_010000.tar.gz"
RESTORE_DIR="/home/azureuser/translation-app/3333_4444__Operational"

# Create directory structure
mkdir -p $RESTORE_DIR

# Extract files
tar -xzf $BACKUP_FILE -C $RESTORE_DIR

# Verify critical file
grep -n "INSERT INTO traces" $RESTORE_DIR/STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js
```

#### 3. Configuration Restoration
```bash
#!/bin/bash
# Restore configurations
BACKUP_DIR="/backup/config/daily"
DATE="20260113_000000"

# Restore monitoring config
cp $BACKUP_DIR/monitoring.config_$DATE.json \
   /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/config/monitoring.config.json

# Restore PM2
pm2 delete all
pm2 resurrect $BACKUP_DIR/pm2_dump_$DATE.pm2

# Restore crontab
crontab $BACKUP_DIR/crontab_$DATE.txt
```

### Selective Recovery

#### Recover Specific Table
```bash
# Extract single table from backup
pg_dump -U monitoring_user -d monitoring_v2_backup \
  --table=traces \
  --data-only | \
  psql -U monitoring_user -d monitoring_v2
```

#### Recover Specific Files
```bash
# Extract specific file from archive
tar -xzf /backup/source/daily/source_20260113.tar.gz \
  --occurrence=1 \
  STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js
```

#### 4. AI Optimizer Restoration
```bash
#!/bin/bash
# Restore AI Optimizer Service
BACKUP_DIR="/backup/ai-optimizer/daily"
AI_DIR="/home/azureuser/translation-app/ai-optimizer"
DATE="20260113_010000"

# Create directory
mkdir -p $AI_DIR
cd $AI_DIR

# Restore source and config
tar -xzf $BACKUP_DIR/ai_optimizer_$DATE.tar.gz

# Decrypt and restore .env file
if [ -f "$BACKUP_DIR/env_encrypted_$DATE.gpg" ]; then
  gpg --decrypt \
    --output $AI_DIR/.env \
    $BACKUP_DIR/env_encrypted_$DATE.gpg
  chmod 600 $AI_DIR/.env
fi

# Install dependencies
npm install

# Restore PM2 process
pm2 delete ai-optimizer 2>/dev/null
pm2 start ecosystem.ai-optimizer.config.js

# Verify restoration
curl http://localhost:3090/health

echo "AI Optimizer restored. Check OpenAI API key in .env file."
```

---

## Disaster Recovery

### Recovery Time Objectives (RTO)
- **Critical Services**: < 1 hour
- **Full System**: < 4 hours
- **Audio History**: < 24 hours

### Recovery Point Objectives (RPO)
- **Database**: < 1 hour data loss
- **Configuration**: 0 data loss
- **Source Code**: < 24 hours
- **Audio**: < 1 week acceptable loss

### Disaster Recovery Procedure

#### Phase 1: Assessment (15 minutes)
```bash
#!/bin/bash
# Damage assessment script
echo "=== Disaster Recovery Assessment ==="

# Check database
psql -U monitoring_user -d monitoring_v2 -c "SELECT 1;" 2>/dev/null && \
  echo "✓ Database accessible" || echo "✗ Database down"

# Check files
[ -f /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js ] && \
  echo "✓ Source files present" || echo "✗ Source files missing"

# Check services
pm2 list | grep -q STTTTSserver && \
  echo "✓ Services running" || echo "✗ Services down"

# Check backup availability
ls -la /backup/postgres/daily/*.sql.gz 2>/dev/null | head -1 && \
  echo "✓ Backups available" || echo "✗ No backups found"
```

#### Phase 2: Critical Recovery (30 minutes)
```bash
#!/bin/bash
# Restore critical services
./restore_database.sh --latest
./restore_source.sh --critical-only
./restore_config.sh --latest
pm2 start ecosystem.config.js
```

#### Phase 3: Full Recovery (2-4 hours)
```bash
#!/bin/bash
# Complete restoration
./restore_database.sh --full
./restore_source.sh --full
./restore_audio.sh --recent
./verify_system.sh
```

---

## Backup Verification

### Automated Verification Script
```bash
#!/bin/bash
# verify_backups.sh
BACKUP_DIR="/backup"
LOG_FILE="/var/log/backup_verification.log"
ALERT_EMAIL="admin@example.com"

verify_database_backup() {
  local backup_file=$1
  local test_db="monitoring_v2_test"

  # Create test database
  sudo -u postgres createdb $test_db

  # Try to restore
  gunzip -c $backup_file | psql -U monitoring_user -d $test_db 2>/dev/null

  # Check critical tables
  local table_count=$(psql -U monitoring_user -d $test_db -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';")

  # Cleanup
  sudo -u postgres dropdb $test_db

  if [ $table_count -ge 7 ]; then
    return 0
  else
    return 1
  fi
}

verify_source_backup() {
  local backup_file=$1
  local temp_dir="/tmp/backup_verify_$$"

  mkdir -p $temp_dir

  # Extract and verify
  tar -xzf $backup_file -C $temp_dir 2>/dev/null

  # Check critical file
  if grep -q "INSERT INTO traces" $temp_dir/STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js 2>/dev/null; then
    rm -rf $temp_dir
    return 0
  else
    rm -rf $temp_dir
    return 1
  fi
}

# Main verification
echo "$(date) - Starting backup verification" >> $LOG_FILE

# Find latest backups
LATEST_DB=$(ls -t $BACKUP_DIR/postgres/daily/*.sql.gz 2>/dev/null | head -1)
LATEST_SOURCE=$(ls -t $BACKUP_DIR/source/daily/*.tar.gz 2>/dev/null | head -1)

# Verify database
if verify_database_backup "$LATEST_DB"; then
  echo "$(date) - Database backup verified: $LATEST_DB" >> $LOG_FILE
else
  echo "$(date) - ERROR: Database backup verification failed: $LATEST_DB" >> $LOG_FILE
  echo "Database backup verification failed" | mail -s "Backup Alert" $ALERT_EMAIL
fi

# Verify source
if verify_source_backup "$LATEST_SOURCE"; then
  echo "$(date) - Source backup verified: $LATEST_SOURCE" >> $LOG_FILE
else
  echo "$(date) - ERROR: Source backup verification failed: $LATEST_SOURCE" >> $LOG_FILE
  echo "Source backup verification failed" | mail -s "Backup Alert" $ALERT_EMAIL
fi
```

### Manual Verification Checklist
- [ ] Database backup can be restored
- [ ] All 7 tables present in database
- [ ] DatabaseBridge.js contains trace creation code
- [ ] Configuration files are complete
- [ ] PM2 dump can be resurrected
- [ ] Audio files are accessible
- [ ] Backup sizes are reasonable
- [ ] Offsite copies are current

---

## Automated Scripts

### Master Backup Script
```bash
#!/bin/bash
# master_backup.sh - Run all backups

set -e
BACKUP_LOG="/var/log/monitoring_backup.log"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $BACKUP_LOG
}

# Run backups in order
log "Starting backup cycle"

# Configuration
/backup/scripts/backup_config.sh
log "Configuration backup complete"

# Source code
/backup/scripts/backup_source.sh
log "Source backup complete"

# Database
/backup/scripts/backup_database.sh
log "Database backup complete"

# Audio (if needed)
if [ $(date +%w) -eq 0 ]; then
  /backup/scripts/backup_audio.sh
  log "Audio backup complete"
fi

# Verification
/backup/scripts/verify_backups.sh
log "Verification complete"

# Cleanup old backups
find /backup -type f -mtime +30 -delete
log "Cleanup complete"

# Offsite sync
rsync -avz /backup/ backup-server:/backup/monitoring/
log "Offsite sync complete"

log "Backup cycle finished"
```

### Cron Schedule
```bash
# Add to crontab
crontab -e

# Daily backups at 2 AM
0 2 * * * /backup/scripts/master_backup.sh

# Hourly database snapshots
0 * * * * pg_dump -U monitoring_user -d monitoring_v2 | gzip > /backup/postgres/hourly/monitoring_$(date +\%H).sql.gz

# Weekly full backup
0 0 * * 0 /backup/scripts/weekly_full_backup.sh

# Monthly archive
0 0 1 * * /backup/scripts/monthly_archive.sh

# Verification every 6 hours
0 */6 * * * /backup/scripts/verify_backups.sh
```

---

## Emergency Recovery Kit

### Critical Information Card
```
=== EMERGENCY RECOVERY INFORMATION ===

Database Credentials:
- Host: localhost
- Port: 5432
- Database: monitoring_v2
- User: monitoring_user
- Password: monitoring_pass

Critical Files Location:
- Source: /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/
- Config: ./Monitoring_Stations/config/monitoring.config.json
- Backups: /backup/

Key Services:
- PM2 Process: STTTTSserver
- API Port: 3020
- UDP Ports: 6120 (ext 3333), 6123 (ext 4444)

Recovery Commands:
1. Restore DB: gunzip -c /backup/postgres/daily/latest.sql.gz | psql -U monitoring_user -d monitoring_v2
2. Restore Files: tar -xzf /backup/source/daily/latest.tar.gz -C /home/azureuser/translation-app/3333_4444__Operational
3. Start Service: pm2 start ecosystem.config.js

Critical Check:
grep -n "INSERT INTO traces" ./Monitoring_Stations/bridge/DatabaseBridge.js
(Must show lines around 127-169)

Support Contact:
- System Admin: admin@example.com
- On-call: +1-XXX-XXX-XXXX
```

---

## Testing Recovery Procedures

### Monthly Disaster Recovery Drill
```bash
#!/bin/bash
# dr_drill.sh - Monthly disaster recovery test

echo "=== Starting DR Drill $(date) ==="

# Create test environment
TEST_DIR="/tmp/dr_test_$(date +%Y%m%d)"
mkdir -p $TEST_DIR

# Simulate failure scenarios
echo "Testing recovery scenarios..."

# Scenario 1: Database corruption
echo "1. Testing database recovery..."
./test_database_recovery.sh

# Scenario 2: Missing source files
echo "2. Testing source recovery..."
./test_source_recovery.sh

# Scenario 3: Configuration loss
echo "3. Testing configuration recovery..."
./test_config_recovery.sh

# Scenario 4: Complete system failure
echo "4. Testing full recovery..."
./test_full_recovery.sh

# Report results
echo "=== DR Drill Complete ==="
echo "Results saved to: $TEST_DIR/dr_report.txt"
```

---

## Backup Retention Policy

### Retention Schedule
- **Hourly**: Keep for 24 hours
- **Daily**: Keep for 30 days
- **Weekly**: Keep for 12 weeks
- **Monthly**: Keep for 1 year
- **Yearly**: Keep for 5 years

### Storage Management
```bash
#!/bin/bash
# cleanup_old_backups.sh

# Remove old hourly backups
find /backup/postgres/hourly -type f -mtime +1 -delete

# Remove old daily backups
find /backup/postgres/daily -type f -mtime +30 -delete
find /backup/source/daily -type f -mtime +30 -delete

# Remove old weekly backups
find /backup/archive/weekly -type f -mtime +84 -delete

# Remove old audio
find /backup/audio -type f -mtime +7 -delete

# Report disk usage
df -h /backup
```

---

## Documentation Backup

### System Documentation
```bash
#!/bin/bash
# Backup all documentation
DOC_DIR="/Users/sagivstavinsky/realtime-translation-enhanced_astrix/Docs"
BACKUP_DIR="/backup/documentation"

mkdir -p $BACKUP_DIR

# Create documentation archive
tar -czf $BACKUP_DIR/docs_$(date +%Y%m%d).tar.gz \
  -C $DOC_DIR \
  sys/monitoring/New_Monitoring_Stations/

# Generate PDF versions
for file in $DOC_DIR/sys/monitoring/New_Monitoring_Stations/AI_Optimizer_Final_Gap/*.md; do
  pandoc "$file" -o "$BACKUP_DIR/$(basename ${file%.md}.pdf)"
done
```

---

## Recovery Validation

After any recovery operation, run:

```bash
#!/bin/bash
# post_recovery_validation.sh

echo "=== Post-Recovery Validation ==="

# 1. Database check
psql -U monitoring_user -d monitoring_v2 -c "
  SELECT 'Tables' as check, COUNT(*) as count FROM pg_tables WHERE schemaname='public'
  UNION ALL
  SELECT 'Traces', COUNT(*) FROM traces
  UNION ALL
  SELECT 'Metrics', COUNT(*) FROM metrics_agg_5s;"

# 2. Service check
pm2 list

# 3. API check
curl http://localhost:3020/health

# 4. Critical code check
grep -c "INSERT INTO traces" \
  /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js

# 5. Test call
node /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/test_monitoring.js

echo "=== Validation Complete ==="
```