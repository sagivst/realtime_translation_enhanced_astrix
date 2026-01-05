# Comprehensive Backup Plan - Translation & Monitoring System
## Version 1.0 - January 2026

---

## 1. EXECUTIVE SUMMARY

This backup plan ensures complete recoverability of the translation and monitoring system infrastructure, including:
- PostgreSQL databases (monitoring_v2, airtable_cache)
- Application code and configurations
- Audio recordings and monitoring data
- System dependencies and settings
- Azure VM configurations
- Future-proof architecture for new additions

### Critical Systems to Backup:
1. **Azure VM (20.170.155.53)** - Production server
2. **Local Development** - /Users/sagivstavinsky/realtime-translation-enhanced_astrix
3. **Git Repository** - Source code and documentation
4. **Monitoring Data** - Audio files, metrics, and traces
5. **Configuration Files** - All system configs

---

## 2. DATABASE BACKUP STRATEGY

### 2.1 PostgreSQL Databases

#### Primary Databases:
```bash
# On Azure VM (20.170.155.53)
- monitoring_v2     # NEW monitoring system
- airtable_cache    # Airtable data cache
- asterisk          # Asterisk PBX data
```

#### Backup Scripts:

##### Daily Full Backup
```bash
#!/bin/bash
# /home/azureuser/backup_scripts/daily_db_backup.sh

BACKUP_DIR="/home/azureuser/backups/databases"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Backup monitoring_v2
pg_dump -h localhost -U postgres -d monitoring_v2 \
  --format=custom \
  --compress=9 \
  --file="${BACKUP_DIR}/monitoring_v2_${TIMESTAMP}.dump"

# Backup airtable_cache
pg_dump -h localhost -U postgres -d airtable_cache \
  --format=custom \
  --compress=9 \
  --file="${BACKUP_DIR}/airtable_cache_${TIMESTAMP}.dump"

# Backup asterisk
pg_dump -h localhost -U postgres -d asterisk \
  --format=custom \
  --compress=9 \
  --file="${BACKUP_DIR}/asterisk_${TIMESTAMP}.dump"

# Clean old backups
find ${BACKUP_DIR} -name "*.dump" -mtime +${RETENTION_DAYS} -delete

# Sync to remote storage
rsync -avz ${BACKUP_DIR}/ azureuser@backup-server:/backups/databases/
```

##### Continuous WAL Archiving
```bash
# postgresql.conf additions
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/wal_archive/%f && cp %p /var/lib/postgresql/wal_archive/%f'
```

##### Restore Commands
```bash
# Restore monitoring_v2
pg_restore -h localhost -U postgres -d monitoring_v2 \
  --clean --if-exists \
  monitoring_v2_20260101_120000.dump

# Point-in-time recovery
pg_basebackup -D /var/lib/postgresql/recovery -Fp -Xs -P
```

---

## 3. APPLICATION CODE BACKUP

### 3.1 Git Repository Management

#### Auto-commit Script
```bash
#!/bin/bash
# /home/azureuser/backup_scripts/git_auto_backup.sh

cd /home/azureuser/translation-app

# Add all changes
git add -A

# Commit with timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
git commit -m "Automated backup: ${TIMESTAMP}"

# Push to all remotes
git push origin --all
git push backup --all  # Secondary remote
```

### 3.2 Directory Structure Backup

#### Critical Directories:
```
/home/azureuser/translation-app/
├── STTTTSserver/
│   ├── Monitoring_Stations/    # NEW monitoring components
│   ├── Config_Knobs/           # Dynamic configurations
│   └── Gateway/                # Gateway components
├── 3333_4444__Operational/     # Production deployment
├── monitoring-server/          # Monitoring API
├── database-api-server/        # Database API
└── asterisk-configs/           # Asterisk configurations
```

#### Incremental Backup Script
```bash
#!/bin/bash
# /home/azureuser/backup_scripts/incremental_backup.sh

SOURCE_DIR="/home/azureuser/translation-app"
BACKUP_DIR="/backup/translation-app"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create incremental backup using rsync
rsync -avz --backup \
  --backup-dir="${BACKUP_DIR}/incremental_${TIMESTAMP}" \
  --exclude='node_modules' \
  --exclude='*.log' \
  --exclude='.git' \
  ${SOURCE_DIR}/ ${BACKUP_DIR}/current/

# Create tarball of changes
tar -czf "${BACKUP_DIR}/incremental_${TIMESTAMP}.tar.gz" \
  "${BACKUP_DIR}/incremental_${TIMESTAMP}"
```

---

## 4. MONITORING DATA BACKUP

### 4.1 Audio Files Storage

#### Structure:
```
/var/monitoring/audio/
├── 2026-01-01/
│   └── trace_*/
│       └── St_*/
│           ├── PRE/
│           │   └── segment_*.wav
│           └── POST/
│               └── segment_*.wav
```

#### Audio Backup Script
```bash
#!/bin/bash
# /home/azureuser/backup_scripts/audio_backup.sh

AUDIO_DIR="/var/monitoring/audio"
BACKUP_DIR="/backup/monitoring-audio"
RETENTION_DAYS=7  # Keep 7 days locally
ARCHIVE_DAYS=30   # Archive older than 30 days

# Sync recent audio files
rsync -avz --delete \
  --include="*/" \
  --include="*.wav" \
  --exclude="*" \
  ${AUDIO_DIR}/ ${BACKUP_DIR}/

# Archive old audio files
find ${AUDIO_DIR} -name "*.wav" -mtime +${ARCHIVE_DAYS} | \
while read file; do
  REL_PATH=${file#${AUDIO_DIR}/}
  DIR_PATH=$(dirname "${BACKUP_DIR}/archive/${REL_PATH}")
  mkdir -p "${DIR_PATH}"
  gzip -c "${file}" > "${BACKUP_DIR}/archive/${REL_PATH}.gz"
  rm "${file}"
done
```

### 4.2 Metrics Data Export

```bash
#!/bin/bash
# /home/azureuser/backup_scripts/metrics_export.sh

OUTPUT_DIR="/backup/metrics"
TIMESTAMP=$(date +%Y%m%d)

# Export metrics to CSV
psql -h localhost -U postgres -d monitoring_v2 <<EOF
\copy (SELECT * FROM metrics_agg_5s WHERE bucket_ts >= NOW() - INTERVAL '24 hours')
TO '${OUTPUT_DIR}/metrics_agg_5s_${TIMESTAMP}.csv' CSV HEADER;

\copy (SELECT * FROM audio_segments_5s WHERE bucket_ts >= NOW() - INTERVAL '24 hours')
TO '${OUTPUT_DIR}/audio_segments_5s_${TIMESTAMP}.csv' CSV HEADER;
EOF
```

---

## 5. CONFIGURATION FILES BACKUP

### 5.1 System Configurations

#### Critical Config Files:
```bash
# List of configuration files to backup
/home/azureuser/.env
/home/azureuser/.bashrc
/home/azureuser/.pm2/
/etc/asterisk/
/etc/postgresql/
/etc/nginx/
/etc/systemd/system/*.service
```

#### Config Backup Script
```bash
#!/bin/bash
# /home/azureuser/backup_scripts/config_backup.sh

CONFIG_BACKUP="/backup/configs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create config backup directory
mkdir -p "${CONFIG_BACKUP}/${TIMESTAMP}"

# Backup user configs
cp -r /home/azureuser/.env "${CONFIG_BACKUP}/${TIMESTAMP}/"
cp -r /home/azureuser/.bashrc "${CONFIG_BACKUP}/${TIMESTAMP}/"
cp -r /home/azureuser/.pm2/ "${CONFIG_BACKUP}/${TIMESTAMP}/pm2/"

# Backup system configs
sudo cp -r /etc/asterisk/ "${CONFIG_BACKUP}/${TIMESTAMP}/asterisk/"
sudo cp -r /etc/postgresql/ "${CONFIG_BACKUP}/${TIMESTAMP}/postgresql/"
sudo cp -r /etc/nginx/ "${CONFIG_BACKUP}/${TIMESTAMP}/nginx/"

# Backup systemd services
sudo cp /etc/systemd/system/*.service "${CONFIG_BACKUP}/${TIMESTAMP}/systemd/"

# Create manifest
cat > "${CONFIG_BACKUP}/${TIMESTAMP}/manifest.txt" <<EOF
Backup Date: $(date)
Hostname: $(hostname)
IP: $(hostname -I)
Kernel: $(uname -r)
Services: $(systemctl list-units --type=service --state=running | grep -E 'asterisk|postgres|nginx|pm2')
EOF

# Compress
tar -czf "${CONFIG_BACKUP}/config_backup_${TIMESTAMP}.tar.gz" \
  -C "${CONFIG_BACKUP}" "${TIMESTAMP}"
```

---

## 6. DEPENDENCY MANAGEMENT

### 6.1 Node.js Dependencies

```bash
#!/bin/bash
# /home/azureuser/backup_scripts/dependency_backup.sh

# Backup package files
for dir in $(find /home/azureuser/translation-app -name "package.json" -type f); do
  PROJECT_DIR=$(dirname "$dir")
  PROJECT_NAME=$(basename "$PROJECT_DIR")

  # Save package.json and lock file
  cp "${PROJECT_DIR}/package.json" "/backup/dependencies/${PROJECT_NAME}_package.json"
  [ -f "${PROJECT_DIR}/package-lock.json" ] && \
    cp "${PROJECT_DIR}/package-lock.json" "/backup/dependencies/${PROJECT_NAME}_package-lock.json"

  # Generate dependency tree
  cd "${PROJECT_DIR}"
  npm list --depth=0 > "/backup/dependencies/${PROJECT_NAME}_dependencies.txt"
done
```

### 6.2 System Dependencies

```bash
#!/bin/bash
# Capture system packages
dpkg --get-selections > /backup/dependencies/system_packages.txt
pip freeze > /backup/dependencies/python_packages.txt
npm list -g --depth=0 > /backup/dependencies/global_npm_packages.txt
```

---

## 7. FUTURE-PROOF ARCHITECTURE

### 7.1 Dynamic Directory Discovery

```bash
#!/bin/bash
# /home/azureuser/backup_scripts/dynamic_backup.sh

# Configuration file for dynamic paths
CONFIG_FILE="/home/azureuser/backup_scripts/backup_paths.conf"

# Auto-discover new directories
find /home/azureuser/translation-app -type d -name "node_modules" -prune -o \
  -type d -mtime -1 -print | while read NEW_DIR; do

  # Check if directory is in config
  if ! grep -q "$NEW_DIR" "$CONFIG_FILE"; then
    echo "# Auto-discovered on $(date)" >> "$CONFIG_FILE"
    echo "$NEW_DIR" >> "$CONFIG_FILE"
    echo "New directory added to backup: $NEW_DIR"
  fi
done

# Backup all directories in config
while IFS= read -r DIR; do
  [[ "$DIR" =~ ^#.*$ ]] && continue  # Skip comments
  [ -z "$DIR" ] && continue           # Skip empty lines

  BACKUP_NAME=$(echo "$DIR" | sed 's|/|_|g')
  rsync -avz "$DIR/" "/backup/dynamic/${BACKUP_NAME}/"
done < "$CONFIG_FILE"
```

### 7.2 Schema Evolution Tracking

```sql
-- Create schema version table
CREATE TABLE IF NOT EXISTS schema_versions (
  version_id SERIAL PRIMARY KEY,
  version_number VARCHAR(20) NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT,
  migration_script TEXT
);

-- Track all schema changes
CREATE OR REPLACE FUNCTION track_schema_change()
RETURNS event_trigger AS $$
BEGIN
  INSERT INTO schema_versions (version_number, description, migration_script)
  VALUES (
    to_char(NOW(), 'YYYYMMDD.HHMMSS'),
    TG_TAG,
    current_query()
  );
END;
$$ LANGUAGE plpgsql;

CREATE EVENT TRIGGER track_ddl_changes
ON ddl_command_end
EXECUTE PROCEDURE track_schema_change();
```

---

## 8. AUTOMATION & SCHEDULING

### 8.1 Cron Configuration

```bash
# /etc/cron.d/backup_schedule

# Database backups - every 4 hours
0 */4 * * * azureuser /home/azureuser/backup_scripts/daily_db_backup.sh

# Code backup - every hour
0 * * * * azureuser /home/azureuser/backup_scripts/git_auto_backup.sh

# Incremental file backup - every 6 hours
0 */6 * * * azureuser /home/azureuser/backup_scripts/incremental_backup.sh

# Audio backup - daily at 2 AM
0 2 * * * azureuser /home/azureuser/backup_scripts/audio_backup.sh

# Config backup - daily at 3 AM
0 3 * * * azureuser /home/azureuser/backup_scripts/config_backup.sh

# Dependency backup - weekly on Sunday
0 4 * * 0 azureuser /home/azureuser/backup_scripts/dependency_backup.sh

# Dynamic discovery - daily at midnight
0 0 * * * azureuser /home/azureuser/backup_scripts/dynamic_backup.sh

# Cleanup old backups - weekly
0 5 * * 1 azureuser find /backup -name "*.tar.gz" -mtime +30 -delete
```

### 8.2 Master Backup Script

```bash
#!/bin/bash
# /home/azureuser/backup_scripts/master_backup.sh

set -e  # Exit on error
LOGFILE="/var/log/backup.log"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Function to log messages
log_message() {
    echo "[${TIMESTAMP}] $1" | tee -a ${LOGFILE}
}

# Function to check backup health
check_backup_health() {
    local backup_dir=$1
    local max_age_hours=$2

    find ${backup_dir} -type f -mmin -$((max_age_hours * 60)) | grep -q . || {
        log_message "WARNING: No recent backups in ${backup_dir}"
        return 1
    }
    return 0
}

# Main backup routine
main() {
    log_message "Starting master backup routine"

    # Run all backup scripts
    SCRIPTS=(
        "daily_db_backup.sh"
        "git_auto_backup.sh"
        "incremental_backup.sh"
        "audio_backup.sh"
        "config_backup.sh"
        "dependency_backup.sh"
        "dynamic_backup.sh"
    )

    for script in "${SCRIPTS[@]}"; do
        if [ -x "/home/azureuser/backup_scripts/${script}" ]; then
            log_message "Running ${script}"
            /home/azureuser/backup_scripts/${script} >> ${LOGFILE} 2>&1
            if [ $? -eq 0 ]; then
                log_message "${script} completed successfully"
            else
                log_message "ERROR: ${script} failed"
            fi
        else
            log_message "WARNING: ${script} not found or not executable"
        fi
    done

    # Check backup health
    check_backup_health "/backup/databases" 24
    check_backup_health "/backup/translation-app" 6
    check_backup_health "/backup/monitoring-audio" 24

    # Send notification
    BACKUP_SIZE=$(du -sh /backup | cut -f1)
    log_message "Backup complete. Total size: ${BACKUP_SIZE}"

    # Optional: Send email or webhook notification
    # curl -X POST https://hooks.slack.com/services/YOUR_WEBHOOK \
    #   -H 'Content-Type: application/json' \
    #   -d "{\"text\":\"Backup complete. Size: ${BACKUP_SIZE}\"}"
}

# Run main function
main
```

---

## 9. DISASTER RECOVERY PROCEDURES

### 9.1 Recovery Priority Levels

1. **Critical (RTO: 1 hour)**
   - PostgreSQL databases
   - STTTTSserver application
   - Asterisk configuration

2. **High (RTO: 4 hours)**
   - Monitoring system
   - Audio recordings (last 24h)
   - API servers

3. **Medium (RTO: 24 hours)**
   - Historical audio files
   - Metrics data
   - Documentation

### 9.2 Recovery Scripts

```bash
#!/bin/bash
# /home/azureuser/backup_scripts/disaster_recovery.sh

BACKUP_SOURCE="/backup"
RECOVERY_LOG="/var/log/recovery.log"

# Function to restore database
restore_database() {
    local db_name=$1
    local backup_file=$2

    echo "Restoring database: ${db_name}" | tee -a ${RECOVERY_LOG}

    # Drop and recreate database
    sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${db_name};"
    sudo -u postgres psql -c "CREATE DATABASE ${db_name};"

    # Restore from backup
    sudo -u postgres pg_restore -d ${db_name} ${backup_file}
}

# Function to restore application
restore_application() {
    echo "Restoring application files" | tee -a ${RECOVERY_LOG}

    # Stop services
    pm2 stop all
    sudo systemctl stop asterisk

    # Restore files
    rsync -avz ${BACKUP_SOURCE}/translation-app/current/ \
      /home/azureuser/translation-app/

    # Restore configurations
    tar -xzf ${BACKUP_SOURCE}/configs/config_backup_latest.tar.gz \
      -C /

    # Install dependencies
    cd /home/azureuser/translation-app/STTTTSserver
    npm ci

    # Restart services
    pm2 restart all
    sudo systemctl start asterisk
}

# Main recovery
case "$1" in
    database)
        restore_database "monitoring_v2" \
          "${BACKUP_SOURCE}/databases/monitoring_v2_latest.dump"
        restore_database "airtable_cache" \
          "${BACKUP_SOURCE}/databases/airtable_cache_latest.dump"
        ;;
    application)
        restore_application
        ;;
    full)
        $0 database
        $0 application
        ;;
    *)
        echo "Usage: $0 {database|application|full}"
        exit 1
        ;;
esac
```

---

## 10. TESTING & VALIDATION

### 10.1 Backup Verification

```bash
#!/bin/bash
# /home/azureuser/backup_scripts/verify_backups.sh

# Test database backup
test_db_backup() {
    local test_db="test_restore_db"
    local backup_file=$1

    sudo -u postgres createdb ${test_db}
    sudo -u postgres pg_restore -d ${test_db} ${backup_file}

    # Verify row counts
    ORIGINAL_COUNT=$(sudo -u postgres psql -d monitoring_v2 -t -c \
      "SELECT COUNT(*) FROM traces;")
    RESTORED_COUNT=$(sudo -u postgres psql -d ${test_db} -t -c \
      "SELECT COUNT(*) FROM traces;")

    if [ "$ORIGINAL_COUNT" -eq "$RESTORED_COUNT" ]; then
        echo "Database backup verified successfully"
    else
        echo "ERROR: Row count mismatch"
    fi

    sudo -u postgres dropdb ${test_db}
}

# Test file integrity
test_file_integrity() {
    find /backup -name "*.tar.gz" -exec tar -tzf {} \; > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "All archive files are intact"
    else
        echo "ERROR: Corrupted archive files detected"
    fi
}

# Run tests
test_db_backup "/backup/databases/monitoring_v2_latest.dump"
test_file_integrity
```

### 10.2 Monitoring Dashboard Integration

```javascript
// Add to monitoring-server.js
app.get('/api/backup/status', async (req, res) => {
    const backupStatus = {
        databases: {},
        files: {},
        lastRun: null,
        nextRun: null,
        totalSize: null
    };

    // Check database backups
    const dbBackupDir = '/backup/databases';
    const dbFiles = await fs.readdir(dbBackupDir);

    for (const dbName of ['monitoring_v2', 'airtable_cache']) {
        const latestBackup = dbFiles
            .filter(f => f.startsWith(dbName))
            .sort()
            .pop();

        if (latestBackup) {
            const stats = await fs.stat(path.join(dbBackupDir, latestBackup));
            backupStatus.databases[dbName] = {
                file: latestBackup,
                size: stats.size,
                modified: stats.mtime,
                age: Date.now() - stats.mtime
            };
        }
    }

    // Check total backup size
    const { stdout } = await exec('du -sb /backup');
    backupStatus.totalSize = parseInt(stdout.split('\t')[0]);

    res.json(backupStatus);
});
```

---

## 11. COMPLIANCE & RETENTION

### 11.1 Data Retention Policies

| Data Type | Local Retention | Archive Retention | Deletion Policy |
|-----------|----------------|-------------------|-----------------|
| Database Backups | 30 days | 1 year | Automatic |
| Audio Files (RAW) | 7 days | 30 days | Compressed after 7 days |
| Metrics Data | 90 days | 1 year | Aggregated monthly |
| Application Logs | 30 days | 90 days | Rotated |
| Git History | Permanent | Permanent | Never |
| Config Backups | 90 days | 1 year | Manual review |

### 11.2 Compliance Script

```bash
#!/bin/bash
# /home/azureuser/backup_scripts/compliance_check.sh

# Generate compliance report
generate_compliance_report() {
    REPORT_FILE="/backup/compliance/report_$(date +%Y%m%d).txt"

    cat > ${REPORT_FILE} <<EOF
Compliance Report - $(date)
==============================

1. Data Retention Status:
-------------------------
Database Backups: $(find /backup/databases -type f -mtime -30 | wc -l) files within retention
Audio Files: $(find /var/monitoring/audio -type f -mtime -7 | wc -l) files within retention
Archived Audio: $(find /backup/monitoring-audio/archive -type f | wc -l) files archived

2. Backup Completeness:
-----------------------
$(ls -la /backup/databases/*.dump | tail -5)

3. Space Usage:
---------------
/backup: $(du -sh /backup | cut -f1)
/var/monitoring: $(du -sh /var/monitoring | cut -f1)

4. Failed Backups (last 24h):
-----------------------------
$(grep ERROR /var/log/backup.log | tail -10)

5. Encryption Status:
--------------------
Encrypted backups: $(find /backup -name "*.gpg" | wc -l)
Unencrypted backups: $(find /backup -name "*.tar.gz" -o -name "*.dump" | wc -l)

EOF

    echo "Compliance report generated: ${REPORT_FILE}"
}

generate_compliance_report
```

---

## 12. IMPLEMENTATION CHECKLIST

### Phase 1: Initial Setup (Week 1)
- [ ] Create /backup directory structure
- [ ] Install backup scripts
- [ ] Configure PostgreSQL WAL archiving
- [ ] Set up cron jobs
- [ ] Test database backup/restore

### Phase 2: Automation (Week 2)
- [ ] Deploy master backup script
- [ ] Configure monitoring integration
- [ ] Set up remote backup sync
- [ ] Implement backup verification
- [ ] Create disaster recovery procedures

### Phase 3: Optimization (Week 3)
- [ ] Implement incremental backups
- [ ] Set up compression for old files
- [ ] Configure backup encryption
- [ ] Optimize retention policies
- [ ] Performance tune backup processes

### Phase 4: Documentation & Training
- [ ] Document all procedures
- [ ] Create runbooks
- [ ] Train team members
- [ ] Conduct disaster recovery drill
- [ ] Review and iterate

---

## APPENDIX A: Quick Commands

```bash
# Check backup status
/home/azureuser/backup_scripts/verify_backups.sh

# Manual database backup
/home/azureuser/backup_scripts/daily_db_backup.sh

# Emergency recovery
/home/azureuser/backup_scripts/disaster_recovery.sh full

# Check backup sizes
du -sh /backup/*

# View backup logs
tail -f /var/log/backup.log

# Test restore to staging
/home/azureuser/backup_scripts/test_restore.sh
```

---

## APPENDIX B: Contact Information

### Escalation Contacts:
- Primary Admin: [Your Name]
- Backup Admin: [Backup Contact]
- Database Admin: [DBA Contact]
- Cloud Provider Support: Azure Support

### External Resources:
- Azure Backup Service: https://portal.azure.com
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Monitoring System Docs: /Docs/sys/monitoring/

---

*Document Version: 1.0*
*Last Updated: January 2026*
*Next Review: February 2026*