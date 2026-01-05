#!/bin/bash
# Monitoring Data Backup Script
# Backs up audio files and exports metrics data

set -e

# Configuration
AUDIO_DIR="/var/monitoring/audio"
BACKUP_DIR="/backup/monitoring-audio"
METRICS_BACKUP="/backup/metrics"
DB_NAME="monitoring_v2"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_TODAY=$(date +%Y-%m-%d)
RETENTION_DAYS=7
ARCHIVE_DAYS=30
LOGFILE="/var/log/backup/monitoring_backup.log"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a ${LOGFILE}
}

# Function to backup audio files
backup_audio_files() {
    log_message "Starting audio file backup..."

    # Create backup directories
    mkdir -p "${BACKUP_DIR}/current"
    mkdir -p "${BACKUP_DIR}/archive"

    # Count files before backup
    if [ -d "${AUDIO_DIR}" ]; then
        TOTAL_FILES=$(find ${AUDIO_DIR} -name "*.wav" 2>/dev/null | wc -l)
        log_message "Found ${TOTAL_FILES} WAV files to process"

        # Sync recent audio files (keep directory structure)
        rsync -avz \
            --include="*/" \
            --include="*.wav" \
            --exclude="*" \
            "${AUDIO_DIR}/" \
            "${BACKUP_DIR}/current/"

        if [ $? -eq 0 ]; then
            log_message "✓ Audio files synced to backup"
        else
            log_message "⚠ WARNING: Audio sync encountered issues"
        fi

        # Archive old audio files
        log_message "Archiving audio files older than ${ARCHIVE_DAYS} days..."
        ARCHIVED=0

        find ${AUDIO_DIR} -name "*.wav" -mtime +${ARCHIVE_DAYS} 2>/dev/null | while read file; do
            # Get relative path
            REL_PATH=${file#${AUDIO_DIR}/}
            ARCHIVE_PATH="${BACKUP_DIR}/archive/${REL_PATH}.gz"
            ARCHIVE_DIR=$(dirname "${ARCHIVE_PATH}")

            # Create directory structure
            mkdir -p "${ARCHIVE_DIR}"

            # Compress and move
            if gzip -c "${file}" > "${ARCHIVE_PATH}"; then
                rm "${file}"
                ((ARCHIVED++))
            fi
        done

        log_message "✓ Archived ${ARCHIVED} old audio files"

        # Clean up empty directories
        find ${AUDIO_DIR} -type d -empty -delete 2>/dev/null || true

    else
        log_message "⚠ Audio directory ${AUDIO_DIR} does not exist"
    fi
}

# Function to export metrics data
export_metrics_data() {
    log_message "Exporting metrics data..."

    mkdir -p ${METRICS_BACKUP}

    # Tables to export
    TABLES=(
        "traces"
        "metrics_agg_5s"
        "audio_segments_5s"
        "knob_snapshots_5s"
        "knob_events"
    )

    for table in "${TABLES[@]}"; do
        OUTPUT_FILE="${METRICS_BACKUP}/${table}_${DATE_TODAY}.csv"

        log_message "Exporting ${table}..."

        # Export last 24 hours of data (adjust as needed)
        if [ "${table}" = "traces" ]; then
            # Export all traces from today
            psql -h localhost -U postgres -d ${DB_NAME} <<EOF
\copy (
    SELECT * FROM ${table}
    WHERE started_at >= CURRENT_DATE
    ORDER BY started_at DESC
) TO '${OUTPUT_FILE}' WITH CSV HEADER;
EOF
        else
            # For time-series tables, export last 24 hours
            psql -h localhost -U postgres -d ${DB_NAME} <<EOF
\copy (
    SELECT * FROM ${table}
    WHERE bucket_ts >= NOW() - INTERVAL '24 hours'
    ORDER BY bucket_ts DESC
) TO '${OUTPUT_FILE}' WITH CSV HEADER;
EOF
        fi

        if [ $? -eq 0 ] && [ -f "${OUTPUT_FILE}" ]; then
            # Compress the CSV
            gzip "${OUTPUT_FILE}"
            SIZE=$(du -h "${OUTPUT_FILE}.gz" | cut -f1)
            log_message "✓ Exported ${table}: ${SIZE}"
        else
            log_message "⚠ WARNING: Failed to export ${table}"
        fi
    done
}

# Function to create metrics summary
create_metrics_summary() {
    log_message "Creating metrics summary..."

    SUMMARY_FILE="${METRICS_BACKUP}/summary_${DATE_TODAY}.json"

    psql -h localhost -U postgres -d ${DB_NAME} -t -A -F',' <<EOF > ${SUMMARY_FILE}
SELECT json_build_object(
    'date', '${DATE_TODAY}',
    'traces_today', (SELECT COUNT(*) FROM traces WHERE started_at >= CURRENT_DATE),
    'traces_total', (SELECT COUNT(*) FROM traces),
    'metrics_buckets_today', (SELECT COUNT(DISTINCT bucket_ts) FROM metrics_agg_5s WHERE bucket_ts >= CURRENT_DATE),
    'audio_segments_today', (SELECT COUNT(*) FROM audio_segments_5s WHERE bucket_ts >= CURRENT_DATE),
    'knob_events_today', (SELECT COUNT(*) FROM knob_events WHERE created_at >= CURRENT_DATE),
    'database_size', (SELECT pg_database_size('${DB_NAME}')),
    'oldest_trace', (SELECT MIN(started_at) FROM traces),
    'newest_trace', (SELECT MAX(started_at) FROM traces)
);
EOF

    if [ $? -eq 0 ]; then
        log_message "✓ Metrics summary created"
    fi
}

# Function to backup monitoring logs
backup_monitoring_logs() {
    log_message "Backing up monitoring logs..."

    LOGS_BACKUP="${BACKUP_DIR}/logs"
    mkdir -p "${LOGS_BACKUP}"

    # Find and compress log files
    if [ -d "/var/monitoring/logs" ]; then
        find /var/monitoring/logs -name "*.log" -mtime +1 | while read logfile; do
            BASENAME=$(basename "${logfile}")
            gzip -c "${logfile}" > "${LOGS_BACKUP}/${BASENAME}.gz"
            > "${logfile}"  # Truncate the original log
        done
        log_message "✓ Monitoring logs backed up"
    fi

    # Also backup PM2 logs related to monitoring
    if [ -d "/home/azureuser/.pm2/logs" ]; then
        for pattern in "monitoring-server" "database-api-server" "STTTTSserver"; do
            find /home/azureuser/.pm2/logs -name "*${pattern}*.log" -mtime +1 | while read pmlog; do
                BASENAME=$(basename "${pmlog}")
                gzip -c "${pmlog}" > "${LOGS_BACKUP}/pm2_${BASENAME}.gz"
                > "${pmlog}"  # Truncate
            done
        done
        log_message "✓ PM2 logs backed up"
    fi
}

# Function to enforce retention policies
enforce_retention() {
    log_message "Enforcing retention policies..."

    # Remove old metric exports
    find ${METRICS_BACKUP} -name "*.csv.gz" -mtime +90 -delete 2>/dev/null || true

    # Remove old archived audio files
    find ${BACKUP_DIR}/archive -name "*.wav.gz" -mtime +180 -delete 2>/dev/null || true

    # Remove old log backups
    find ${BACKUP_DIR}/logs -name "*.log.gz" -mtime +30 -delete 2>/dev/null || true

    log_message "✓ Retention policies enforced"
}

# Function to generate space report
generate_space_report() {
    REPORT="${BACKUP_DIR}/space_report_${TIMESTAMP}.txt"

    cat > ${REPORT} <<EOF
Monitoring Data Space Report
============================
Date: $(date)

Audio Storage:
-------------
Original Dir: $(du -sh ${AUDIO_DIR} 2>/dev/null | cut -f1 || echo "N/A")
Backup Current: $(du -sh ${BACKUP_DIR}/current 2>/dev/null | cut -f1 || echo "N/A")
Backup Archive: $(du -sh ${BACKUP_DIR}/archive 2>/dev/null | cut -f1 || echo "N/A")

Audio File Counts:
-----------------
Current WAV files: $(find ${AUDIO_DIR} -name "*.wav" 2>/dev/null | wc -l)
Archived files: $(find ${BACKUP_DIR}/archive -name "*.wav.gz" 2>/dev/null | wc -l)

Metrics Export:
--------------
Export Directory: $(du -sh ${METRICS_BACKUP} 2>/dev/null | cut -f1 || echo "N/A")
CSV Exports: $(ls ${METRICS_BACKUP}/*.csv.gz 2>/dev/null | wc -l) files

Database Size:
-------------
$(psql -h localhost -U postgres -d ${DB_NAME} -t -c "SELECT pg_size_pretty(pg_database_size('${DB_NAME}'));")

Disk Usage:
----------
$(df -h /var/monitoring 2>/dev/null || echo "Monitoring partition not found")
$(df -h /backup)

Recent Large Files:
------------------
$(find ${AUDIO_DIR} -name "*.wav" -size +10M -exec ls -lh {} \; 2>/dev/null | head -10)

EOF

    log_message "✓ Space report generated: ${REPORT}"
}

# Function to verify backup integrity
verify_backup() {
    log_message "Verifying backup integrity..."

    ERRORS=0

    # Check if critical directories exist
    for dir in "${BACKUP_DIR}/current" "${METRICS_BACKUP}"; do
        if [ ! -d "${dir}" ]; then
            log_message "✗ ERROR: Directory ${dir} does not exist"
            ((ERRORS++))
        fi
    done

    # Verify recent backups exist
    RECENT_AUDIO=$(find ${BACKUP_DIR}/current -name "*.wav" -mtime -1 2>/dev/null | wc -l)
    if [ ${RECENT_AUDIO} -eq 0 ]; then
        log_message "⚠ WARNING: No recent audio backups found"
    else
        log_message "✓ Found ${RECENT_AUDIO} recent audio files in backup"
    fi

    # Test random compressed files
    find ${BACKUP_DIR}/archive -name "*.gz" 2>/dev/null | shuf -n 5 | while read gzfile; do
        if ! gzip -t "${gzfile}" 2>/dev/null; then
            log_message "✗ ERROR: Corrupted archive: ${gzfile}"
            ((ERRORS++))
        fi
    done

    if [ ${ERRORS} -eq 0 ]; then
        log_message "✓ Backup integrity verified"
    else
        log_message "✗ Found ${ERRORS} integrity issues"
    fi
}

# Main execution
main() {
    log_message "========================================="
    log_message "Starting monitoring data backup"
    log_message "========================================="

    # Create directories
    mkdir -p ${BACKUP_DIR}
    mkdir -p ${METRICS_BACKUP}
    mkdir -p $(dirname ${LOGFILE})

    # Run backup tasks
    backup_audio_files
    export_metrics_data
    create_metrics_summary
    backup_monitoring_logs

    # Maintenance tasks
    enforce_retention
    verify_backup

    # Generate reports
    generate_space_report

    # Final summary
    TOTAL_BACKUP_SIZE=$(du -sh /backup | cut -f1)
    log_message "Total backup size: ${TOTAL_BACKUP_SIZE}"

    log_message "========================================="
    log_message "Monitoring data backup completed"
    log_message "========================================="
}

# Run main function
main "$@"