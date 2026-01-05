#!/bin/bash
# Database Backup Script for PostgreSQL
# Backs up monitoring_v2, airtable_cache, and asterisk databases

set -e

# Configuration
BACKUP_DIR="/backup/databases"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
LOGFILE="/var/log/backup/database_backup.log"
PGHOST="localhost"
PGUSER="postgres"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a ${LOGFILE}
}

# Function to backup a database
backup_database() {
    local db_name=$1
    local backup_file="${BACKUP_DIR}/${db_name}_${TIMESTAMP}.dump"

    log_message "Starting backup of ${db_name}..."

    # Check if database exists
    if psql -h ${PGHOST} -U ${PGUSER} -lqt | cut -d \| -f 1 | grep -qw ${db_name}; then
        # Perform backup
        pg_dump -h ${PGHOST} -U ${PGUSER} -d ${db_name} \
            --format=custom \
            --compress=9 \
            --verbose \
            --file="${backup_file}" 2>&1 | tee -a ${LOGFILE}

        if [ $? -eq 0 ]; then
            # Get backup size
            SIZE=$(du -h "${backup_file}" | cut -f1)
            log_message "✓ ${db_name} backup completed successfully (${SIZE})"

            # Create symlink to latest
            ln -sf "${backup_file}" "${BACKUP_DIR}/${db_name}_latest.dump"

            # Verify backup
            pg_restore --list "${backup_file}" > /dev/null 2>&1
            if [ $? -eq 0 ]; then
                log_message "✓ ${db_name} backup verified"
            else
                log_message "⚠ WARNING: ${db_name} backup verification failed"
            fi
        else
            log_message "✗ ERROR: ${db_name} backup failed"
            return 1
        fi
    else
        log_message "⚠ WARNING: Database ${db_name} does not exist, skipping"
    fi
}

# Function to export table schemas
export_schemas() {
    local db_name=$1
    local schema_file="${BACKUP_DIR}/${db_name}_schema_${TIMESTAMP}.sql"

    log_message "Exporting schema for ${db_name}..."

    pg_dump -h ${PGHOST} -U ${PGUSER} -d ${db_name} \
        --schema-only \
        --file="${schema_file}" 2>&1 | tee -a ${LOGFILE}

    if [ $? -eq 0 ]; then
        gzip "${schema_file}"
        log_message "✓ Schema export completed for ${db_name}"
    fi
}

# Function to clean old backups
cleanup_old_backups() {
    log_message "Cleaning up backups older than ${RETENTION_DAYS} days..."

    # Count files before cleanup
    BEFORE=$(find ${BACKUP_DIR} -name "*.dump" -mtime +${RETENTION_DAYS} | wc -l)

    # Remove old backup files
    find ${BACKUP_DIR} -name "*.dump" -mtime +${RETENTION_DAYS} -delete
    find ${BACKUP_DIR} -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete

    log_message "✓ Cleaned up ${BEFORE} old backup files"
}

# Function to generate backup report
generate_report() {
    local report_file="${BACKUP_DIR}/backup_report_${TIMESTAMP}.txt"

    cat > ${report_file} <<EOF
Database Backup Report
======================
Date: $(date)
Host: $(hostname)

Backup Summary:
--------------
EOF

    for db in monitoring_v2 airtable_cache asterisk; do
        if [ -f "${BACKUP_DIR}/${db}_${TIMESTAMP}.dump" ]; then
            SIZE=$(du -h "${BACKUP_DIR}/${db}_${TIMESTAMP}.dump" | cut -f1)
            echo "${db}: SUCCESS (${SIZE})" >> ${report_file}
        else
            echo "${db}: FAILED or SKIPPED" >> ${report_file}
        fi
    done

    echo "" >> ${report_file}
    echo "Disk Usage:" >> ${report_file}
    echo "-----------" >> ${report_file}
    df -h ${BACKUP_DIR} >> ${report_file}

    echo "" >> ${report_file}
    echo "Recent Backups:" >> ${report_file}
    echo "--------------" >> ${report_file}
    ls -lh ${BACKUP_DIR}/*.dump 2>/dev/null | tail -10 >> ${report_file}

    log_message "✓ Backup report generated: ${report_file}"
}

# Main execution
main() {
    log_message "========================================="
    log_message "Starting database backup routine"
    log_message "========================================="

    # Create backup directory if it doesn't exist
    mkdir -p ${BACKUP_DIR}
    mkdir -p $(dirname ${LOGFILE})

    # Backup each database
    DATABASES="monitoring_v2 airtable_cache asterisk"
    FAILED_DBS=""

    for db in ${DATABASES}; do
        if ! backup_database ${db}; then
            FAILED_DBS="${FAILED_DBS} ${db}"
        fi
        export_schemas ${db}
    done

    # Cleanup old backups
    cleanup_old_backups

    # Generate report
    generate_report

    # Check for failures
    if [ -n "${FAILED_DBS}" ]; then
        log_message "⚠ WARNING: Some backups failed: ${FAILED_DBS}"
        exit 1
    else
        log_message "✓ All database backups completed successfully"
    fi

    # Calculate total backup size
    TOTAL_SIZE=$(du -sh ${BACKUP_DIR} | cut -f1)
    log_message "Total backup size: ${TOTAL_SIZE}"

    log_message "========================================="
    log_message "Database backup routine completed"
    log_message "========================================="
}

# Run main function
main "$@"