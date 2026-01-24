#!/bin/bash

# NEW Monitoring System - Complete Automated Backup Script
# This script performs comprehensive backups of all system components
# Run as: ./automated_backup.sh [--full|--incremental|--critical]

set -e  # Exit on error

# =============================================================================
# Configuration
# =============================================================================

# Backup directories
BACKUP_ROOT="/backup/monitoring"
BACKUP_POSTGRES="$BACKUP_ROOT/postgres"
BACKUP_SOURCE="$BACKUP_ROOT/source"
BACKUP_CONFIG="$BACKUP_ROOT/config"
BACKUP_AUDIO="$BACKUP_ROOT/audio"
BACKUP_SYSTEM="$BACKUP_ROOT/system"
BACKUP_LOGS="$BACKUP_ROOT/logs"

# Source directories
SOURCE_ROOT="/home/azureuser/translation-app/3333_4444__Operational"
AUDIO_ROOT="/var/monitoring/audio"

# Database configuration
DB_NAME="monitoring_v2"
DB_USER="monitoring_user"
DB_HOST="localhost"
DB_PORT="5432"

# Retention settings (days)
RETENTION_HOURLY=1
RETENTION_DAILY=30
RETENTION_WEEKLY=84
RETENTION_MONTHLY=365

# Logging
LOG_FILE="/var/log/monitoring_backup.log"
ERROR_LOG="/var/log/monitoring_backup_error.log"

# Notification settings
ALERT_EMAIL="admin@example.com"
SLACK_WEBHOOK=""  # Optional Slack webhook URL

# Backup type (default: incremental)
BACKUP_TYPE="${1:-incremental}"

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_ONLY=$(date +"%Y%m%d")

# =============================================================================
# Functions
# =============================================================================

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error_log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$ERROR_LOG"
    send_alert "Backup Error: $1"
}

# Alert function
send_alert() {
    local message="$1"

    # Email alert
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "Monitoring Backup Alert" "$ALERT_EMAIL" 2>/dev/null || true
    fi

    # Slack alert
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
}

# Create backup directories
create_directories() {
    log "Creating backup directories..."
    mkdir -p "$BACKUP_POSTGRES"/{hourly,daily,weekly,monthly,wal}
    mkdir -p "$BACKUP_SOURCE"/{daily,weekly,git}
    mkdir -p "$BACKUP_CONFIG"/{daily,history}
    mkdir -p "$BACKUP_AUDIO"/{daily,archive}
    mkdir -p "$BACKUP_SYSTEM"/{state,pm2}
    mkdir -p "$BACKUP_LOGS"/{compressed,archive}
}

# =============================================================================
# Database Backup Functions
# =============================================================================

backup_database_full() {
    log "Starting full database backup..."

    local backup_file="$BACKUP_POSTGRES/daily/monitoring_v2_${TIMESTAMP}.sql.gz"
    local schema_file="$BACKUP_POSTGRES/daily/schema_${TIMESTAMP}.sql"

    # Full database dump with compression
    if PGPASSWORD=monitoring_pass pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-owner \
        --no-acl | gzip -9 > "$backup_file"; then
        log "Database backup successful: $backup_file"
    else
        error_log "Database backup failed"
        return 1
    fi

    # Schema-only backup
    PGPASSWORD=monitoring_pass pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --schema-only \
        --no-owner \
        --no-acl > "$schema_file"

    # Create checksum
    sha256sum "$backup_file" > "${backup_file}.sha256"

    # Verify backup
    if verify_database_backup "$backup_file"; then
        log "Database backup verified successfully"
    else
        error_log "Database backup verification failed"
    fi
}

backup_database_incremental() {
    log "Starting incremental database backup..."

    local backup_file="$BACKUP_POSTGRES/hourly/monitoring_v2_$(date +%H).sql.gz"

    # Backup only recent data
    PGPASSWORD=monitoring_pass psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "COPY (
            SELECT * FROM traces WHERE started_at > NOW() - INTERVAL '1 hour'
        ) TO STDOUT" | gzip -9 > "${backup_file}.traces"

    PGPASSWORD=monitoring_pass psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "COPY (
            SELECT * FROM metrics_agg_5s WHERE bucket_ts > NOW() - INTERVAL '1 hour'
        ) TO STDOUT" | gzip -9 > "${backup_file}.metrics"
}

backup_database_critical_tables() {
    log "Backing up critical database tables..."

    local backup_dir="$BACKUP_POSTGRES/daily/critical_${TIMESTAMP}"
    mkdir -p "$backup_dir"

    # Critical tables list
    local tables=(
        "traces"
        "scheduled_knob_updates"
        "knob_verifications"
        "knob_events"
    )

    for table in "${tables[@]}"; do
        PGPASSWORD=monitoring_pass pg_dump \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --table="$table" \
            --data-only | gzip -9 > "$backup_dir/${table}.sql.gz"
        log "Backed up table: $table"
    done
}

# =============================================================================
# Source Code Backup Functions
# =============================================================================

backup_source_code() {
    log "Starting source code backup..."

    local backup_file="$BACKUP_SOURCE/daily/source_${TIMESTAMP}.tar.gz"

    # Critical files that MUST be backed up
    local critical_files=(
        "STTTTSserver/STTTTSserver.js"
        "STTTTSserver/Monitoring_Stations/MonitoringStationsBootstrap.js"
        "STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js"
        "STTTTSserver/Monitoring_Stations/bridge/MetricsEmitter.js"
        "STTTTSserver/Monitoring_Stations/bridge/AudioWriter.js"
        "STTTTSserver/Monitoring_Stations/stations/St_Handler_Generic.js"
        "STTTTSserver/Monitoring_Stations/stations/Station3_3333_Handler.js"
        "STTTTSserver/Monitoring_Stations/stations/Station4_4444_Handler.js"
        "STTTTSserver/lib/BucketScheduler.js"
    )

    # Change to source directory
    cd "$SOURCE_ROOT"

    # Create backup with critical files
    tar -czf "$backup_file" \
        --exclude='node_modules' \
        --exclude='*.log' \
        --exclude='.git' \
        "${critical_files[@]}" 2>/dev/null || {
            error_log "Source backup failed"
            return 1
        }

    # Verify critical code exists
    if tar -xOzf "$backup_file" STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js | \
       grep -q "INSERT INTO traces"; then
        log "Critical trace creation code verified in backup"
    else
        error_log "WARNING: DatabaseBridge.js missing trace creation code in backup!"
    fi

    # Create checksum
    sha256sum "$backup_file" > "${backup_file}.sha256"

    log "Source code backup complete: $backup_file"
}

backup_source_git() {
    log "Creating git-based source backup..."

    cd "$SOURCE_ROOT"

    # Initialize git if needed
    if [ ! -d .git ]; then
        git init
        git config user.email "backup@monitoring.local"
        git config user.name "Backup System"
    fi

    # Create commit
    git add -A
    git commit -m "Automated backup ${TIMESTAMP}" || true

    # Create bundle
    git bundle create "$BACKUP_SOURCE/git/repo_${DATE_ONLY}.bundle" --all

    log "Git bundle created"
}

# =============================================================================
# Configuration Backup Functions
# =============================================================================

backup_configuration() {
    log "Starting configuration backup..."

    local backup_dir="$BACKUP_CONFIG/daily/config_${TIMESTAMP}"
    mkdir -p "$backup_dir"

    # Monitoring configuration
    cp "$SOURCE_ROOT/STTTTSserver/Monitoring_Stations/config/monitoring.config.json" \
       "$backup_dir/monitoring.config.json" 2>/dev/null || true

    # PM2 configuration
    cp "$SOURCE_ROOT/STTTTSserver/ecosystem.config.js" \
       "$backup_dir/ecosystem.config.js" 2>/dev/null || true

    # Package.json
    cp "$SOURCE_ROOT/STTTTSserver/package.json" \
       "$backup_dir/package.json" 2>/dev/null || true

    # Environment files
    cp "$SOURCE_ROOT/STTTTSserver/.env" \
       "$backup_dir/.env" 2>/dev/null || true

    # PM2 process dump
    pm2 save force 2>/dev/null || true
    cp ~/.pm2/dump.pm2 "$backup_dir/pm2_dump.json" 2>/dev/null || true

    # System configuration
    crontab -l > "$backup_dir/crontab.txt" 2>/dev/null || true

    # Create archive
    tar -czf "$BACKUP_CONFIG/daily/config_${TIMESTAMP}.tar.gz" -C "$backup_dir" .
    rm -rf "$backup_dir"

    log "Configuration backup complete"
}

# =============================================================================
# Audio Backup Functions
# =============================================================================

backup_audio_recent() {
    log "Backing up recent audio files..."

    local backup_file="$BACKUP_AUDIO/daily/audio_recent_${TIMESTAMP}.tar.gz"

    # Find audio files from last 24 hours
    find "$AUDIO_ROOT" -type f -name "*.wav" -mtime -1 -print0 | \
        tar --null -czf "$backup_file" --files-from=- 2>/dev/null || {
            log "No recent audio files to backup"
            return 0
        }

    # Get size
    local size=$(du -h "$backup_file" | cut -f1)
    log "Audio backup complete: $backup_file ($size)"
}

backup_audio_archive() {
    log "Creating audio archive..."

    local backup_file="$BACKUP_AUDIO/archive/audio_archive_${DATE_ONLY}.tar.gz"

    # Archive older audio (1-7 days old)
    find "$AUDIO_ROOT" -type f -name "*.wav" -mtime +1 -mtime -7 -print0 | \
        tar --null -czf "$backup_file" --files-from=- 2>/dev/null || {
            log "No audio files to archive"
            return 0
        }

    # Clean up old audio files after archiving
    find "$AUDIO_ROOT" -type f -name "*.wav" -mtime +7 -delete

    log "Audio archive complete"
}

# =============================================================================
# System State Backup
# =============================================================================

backup_system_state() {
    log "Backing up system state..."

    local backup_dir="$BACKUP_SYSTEM/state/state_${TIMESTAMP}"
    mkdir -p "$backup_dir"

    # PM2 status
    pm2 list > "$backup_dir/pm2_list.txt" 2>/dev/null || true
    pm2 status > "$backup_dir/pm2_status.txt" 2>/dev/null || true
    pm2 info STTTTSserver > "$backup_dir/pm2_info.txt" 2>/dev/null || true

    # Network configuration
    netstat -tulpn > "$backup_dir/network_ports.txt" 2>/dev/null || true
    ip addr > "$backup_dir/ip_config.txt" 2>/dev/null || true

    # System resources
    df -h > "$backup_dir/disk_usage.txt"
    free -h > "$backup_dir/memory_usage.txt"
    ps auxf > "$backup_dir/process_list.txt"

    # Database status
    PGPASSWORD=monitoring_pass psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "SELECT
            (SELECT COUNT(*) FROM traces WHERE ended_at IS NULL) as active_traces,
            (SELECT COUNT(*) FROM metrics_agg_5s WHERE bucket_ts > NOW() - INTERVAL '1 hour') as recent_metrics,
            (SELECT pg_database_size('$DB_NAME')) as db_size;" \
        > "$backup_dir/database_stats.txt" 2>/dev/null || true

    # Create archive
    tar -czf "$BACKUP_SYSTEM/state/state_${TIMESTAMP}.tar.gz" -C "$backup_dir" .
    rm -rf "$backup_dir"

    log "System state backup complete"
}

# =============================================================================
# Log Backup Functions
# =============================================================================

backup_logs() {
    log "Backing up logs..."

    local backup_file="$BACKUP_LOGS/compressed/logs_${TIMESTAMP}.tar.gz"

    # Collect various logs
    tar -czf "$backup_file" \
        --ignore-failed-read \
        /home/azureuser/.pm2/logs/*.log \
        "$SOURCE_ROOT/STTTTSserver/logs"/*.log \
        /var/log/monitoring*.log \
        2>/dev/null || true

    # Rotate old logs
    find "$SOURCE_ROOT/STTTTSserver/logs" -name "*.log" -mtime +7 -delete 2>/dev/null || true

    log "Log backup complete"
}

# =============================================================================
# Verification Functions
# =============================================================================

verify_database_backup() {
    local backup_file="$1"
    local test_db="monitoring_v2_test_$$"

    log "Verifying database backup: $backup_file"

    # Create test database
    PGPASSWORD=monitoring_pass createdb \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        "$test_db" 2>/dev/null || true

    # Try to restore
    gunzip -c "$backup_file" | PGPASSWORD=monitoring_pass psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$test_db" \
        --quiet 2>/dev/null

    local result=$?

    # Check table count
    if [ $result -eq 0 ]; then
        local table_count=$(PGPASSWORD=monitoring_pass psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$test_db" \
            -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';")

        if [ "$table_count" -ge 7 ]; then
            log "Database backup verification passed"
            result=0
        else
            error_log "Database backup has insufficient tables"
            result=1
        fi
    fi

    # Cleanup
    PGPASSWORD=monitoring_pass dropdb \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        "$test_db" 2>/dev/null || true

    return $result
}

verify_source_backup() {
    local backup_file="$1"

    log "Verifying source backup: $backup_file"

    # Check if critical file exists and contains required code
    if tar -xOzf "$backup_file" \
        STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js 2>/dev/null | \
        grep -q "INSERT INTO traces"; then
        log "Source backup verification passed"
        return 0
    else
        error_log "Source backup missing critical trace creation code"
        return 1
    fi
}

# =============================================================================
# Cleanup Functions
# =============================================================================

cleanup_old_backups() {
    log "Cleaning up old backups..."

    # Hourly backups (keep 24 hours)
    find "$BACKUP_POSTGRES/hourly" -type f -mtime +$RETENTION_HOURLY -delete 2>/dev/null || true

    # Daily backups (keep 30 days)
    find "$BACKUP_POSTGRES/daily" -type f -mtime +$RETENTION_DAILY -delete 2>/dev/null || true
    find "$BACKUP_SOURCE/daily" -type f -mtime +$RETENTION_DAILY -delete 2>/dev/null || true
    find "$BACKUP_CONFIG/daily" -type f -mtime +$RETENTION_DAILY -delete 2>/dev/null || true
    find "$BACKUP_AUDIO/daily" -type f -mtime +$RETENTION_DAILY -delete 2>/dev/null || true

    # Weekly backups (keep 12 weeks)
    find "$BACKUP_SOURCE/weekly" -type f -mtime +$RETENTION_WEEKLY -delete 2>/dev/null || true

    # Monthly backups (keep 1 year)
    find "$BACKUP_AUDIO/archive" -type f -mtime +$RETENTION_MONTHLY -delete 2>/dev/null || true

    # Old logs
    find "$BACKUP_LOGS/compressed" -type f -mtime +30 -delete 2>/dev/null || true

    log "Cleanup complete"
}

# =============================================================================
# Reporting Functions
# =============================================================================

generate_backup_report() {
    local report_file="$BACKUP_ROOT/backup_report_${DATE_ONLY}.txt"

    {
        echo "=== Backup Report for $(date) ==="
        echo ""
        echo "Backup Type: $BACKUP_TYPE"
        echo "Timestamp: $TIMESTAMP"
        echo ""
        echo "=== Backup Summary ==="
        echo ""

        # Database backups
        echo "Database Backups:"
        ls -lh "$BACKUP_POSTGRES/daily"/*.sql.gz 2>/dev/null | tail -5 || echo "  No database backups found"
        echo ""

        # Source backups
        echo "Source Code Backups:"
        ls -lh "$BACKUP_SOURCE/daily"/*.tar.gz 2>/dev/null | tail -5 || echo "  No source backups found"
        echo ""

        # Configuration backups
        echo "Configuration Backups:"
        ls -lh "$BACKUP_CONFIG/daily"/*.tar.gz 2>/dev/null | tail -5 || echo "  No config backups found"
        echo ""

        # Disk usage
        echo "=== Disk Usage ==="
        df -h "$BACKUP_ROOT"
        echo ""
        du -sh "$BACKUP_ROOT"/*
        echo ""

        # Verification results
        echo "=== Verification Results ==="
        grep "verification" "$LOG_FILE" | tail -10
        echo ""

        # Errors
        echo "=== Recent Errors ==="
        tail -20 "$ERROR_LOG" 2>/dev/null || echo "No errors"

    } > "$report_file"

    log "Backup report generated: $report_file"

    # Send report if configured
    if [ -n "$ALERT_EMAIL" ]; then
        mail -s "Monitoring Backup Report - $(date +%Y-%m-%d)" "$ALERT_EMAIL" < "$report_file"
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    log "========================================="
    log "Starting backup process - Type: $BACKUP_TYPE"
    log "========================================="

    # Create directories if needed
    create_directories

    case "$BACKUP_TYPE" in
        --full)
            log "Performing FULL backup"
            backup_database_full
            backup_database_critical_tables
            backup_source_code
            backup_source_git
            backup_configuration
            backup_audio_recent
            backup_audio_archive
            backup_system_state
            backup_logs
            ;;

        --incremental)
            log "Performing INCREMENTAL backup"
            backup_database_incremental
            backup_configuration
            backup_audio_recent
            ;;

        --critical)
            log "Performing CRITICAL backup"
            backup_database_critical_tables
            backup_source_code
            backup_configuration
            ;;

        *)
            log "Performing DEFAULT (incremental) backup"
            backup_database_incremental
            backup_configuration
            backup_audio_recent
            ;;
    esac

    # Always perform cleanup
    cleanup_old_backups

    # Generate report
    generate_backup_report

    # Final disk usage check
    local disk_usage=$(df -h "$BACKUP_ROOT" | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 85 ]; then
        error_log "Backup disk usage critical: ${disk_usage}%"
    fi

    log "========================================="
    log "Backup process complete"
    log "========================================="

    # Send success notification
    send_alert "Monitoring backup completed successfully at $(date)"
}

# Run main function
main "$@"

exit 0