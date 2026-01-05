#!/bin/bash
# Application Code Backup Script
# Backs up translation-app code and configurations

set -e

# Configuration
SOURCE_DIR="/home/azureuser/translation-app"
BACKUP_DIR="/backup/translation-app"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOGFILE="/var/log/backup/application_backup.log"
EXCLUDE_FILE="/home/azureuser/backup_scripts/backup_exclude.txt"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a ${LOGFILE}
}

# Create exclude file if it doesn't exist
create_exclude_file() {
    if [ ! -f ${EXCLUDE_FILE} ]; then
        cat > ${EXCLUDE_FILE} <<'EOF'
node_modules/
*.log
*.tmp
*.swp
.git/objects/
.npm/
.cache/
coverage/
dist/
build/
*.pid
core.*
EOF
        log_message "Created exclude file: ${EXCLUDE_FILE}"
    fi
}

# Function to perform incremental backup
incremental_backup() {
    log_message "Starting incremental backup..."

    # Create backup directories
    mkdir -p "${BACKUP_DIR}/current"
    mkdir -p "${BACKUP_DIR}/incremental"

    # Perform rsync backup
    rsync -avz \
        --backup \
        --backup-dir="${BACKUP_DIR}/incremental/${TIMESTAMP}" \
        --exclude-from="${EXCLUDE_FILE}" \
        --delete \
        --log-file="${LOGFILE}.rsync" \
        "${SOURCE_DIR}/" \
        "${BACKUP_DIR}/current/"

    if [ $? -eq 0 ]; then
        log_message "✓ Incremental backup completed successfully"

        # Create tarball of changes if there are any
        if [ -d "${BACKUP_DIR}/incremental/${TIMESTAMP}" ]; then
            tar -czf "${BACKUP_DIR}/incremental/changes_${TIMESTAMP}.tar.gz" \
                -C "${BACKUP_DIR}/incremental" \
                "${TIMESTAMP}"

            # Remove the directory after compression
            rm -rf "${BACKUP_DIR}/incremental/${TIMESTAMP}"

            SIZE=$(du -h "${BACKUP_DIR}/incremental/changes_${TIMESTAMP}.tar.gz" | cut -f1)
            log_message "✓ Changes archived: ${SIZE}"
        else
            log_message "No changes detected in this backup cycle"
        fi
    else
        log_message "✗ ERROR: Incremental backup failed"
        return 1
    fi
}

# Function to backup critical configuration files
backup_configs() {
    log_message "Backing up configuration files..."

    CONFIG_BACKUP="${BACKUP_DIR}/configs_${TIMESTAMP}"
    mkdir -p "${CONFIG_BACKUP}"

    # List of critical config files and directories
    CONFIGS=(
        "/home/azureuser/.env"
        "/home/azureuser/.bashrc"
        "/home/azureuser/.pm2"
        "${SOURCE_DIR}/STTTTSserver/.env"
        "${SOURCE_DIR}/monitoring-server/.env"
        "${SOURCE_DIR}/database-api-server/.env"
        "${SOURCE_DIR}/asterisk-configs"
    )

    for config in "${CONFIGS[@]}"; do
        if [ -e "${config}" ]; then
            # Create directory structure in backup
            REL_PATH=$(dirname "${config}")
            mkdir -p "${CONFIG_BACKUP}${REL_PATH}"

            # Copy the config
            cp -r "${config}" "${CONFIG_BACKUP}${config}"
            log_message "✓ Backed up: ${config}"
        else
            log_message "⚠ Config not found: ${config}"
        fi
    done

    # Compress configs
    tar -czf "${BACKUP_DIR}/configs_${TIMESTAMP}.tar.gz" \
        -C "${CONFIG_BACKUP}" .

    rm -rf "${CONFIG_BACKUP}"

    SIZE=$(du -h "${BACKUP_DIR}/configs_${TIMESTAMP}.tar.gz" | cut -f1)
    log_message "✓ Configurations archived: ${SIZE}"

    # Keep symlink to latest config backup
    ln -sf "${BACKUP_DIR}/configs_${TIMESTAMP}.tar.gz" \
        "${BACKUP_DIR}/configs_latest.tar.gz"
}

# Function to backup PM2 processes
backup_pm2() {
    log_message "Backing up PM2 configuration..."

    PM2_BACKUP="${BACKUP_DIR}/pm2_${TIMESTAMP}.json"

    # Save PM2 process list
    pm2 save

    # Export PM2 ecosystem file
    pm2 ecosystem > "${PM2_BACKUP}"

    if [ $? -eq 0 ]; then
        log_message "✓ PM2 configuration saved"

        # Also save current process status
        pm2 list --no-color > "${BACKUP_DIR}/pm2_status_${TIMESTAMP}.txt"
    else
        log_message "⚠ WARNING: Could not save PM2 configuration"
    fi
}

# Function to create Git bundle
create_git_bundle() {
    log_message "Creating Git bundle..."

    if [ -d "${SOURCE_DIR}/.git" ]; then
        cd ${SOURCE_DIR}

        # Create bundle of all branches
        git bundle create "${BACKUP_DIR}/git_bundle_${TIMESTAMP}.bundle" --all

        if [ $? -eq 0 ]; then
            SIZE=$(du -h "${BACKUP_DIR}/git_bundle_${TIMESTAMP}.bundle" | cut -f1)
            log_message "✓ Git bundle created: ${SIZE}"

            # Save current branch and commit info
            git status > "${BACKUP_DIR}/git_status_${TIMESTAMP}.txt"
            git log --oneline -10 > "${BACKUP_DIR}/git_log_${TIMESTAMP}.txt"
        else
            log_message "⚠ WARNING: Could not create Git bundle"
        fi
    else
        log_message "⚠ Source directory is not a Git repository"
    fi
}

# Function to backup package dependencies
backup_dependencies() {
    log_message "Backing up dependency information..."

    DEPS_DIR="${BACKUP_DIR}/dependencies_${TIMESTAMP}"
    mkdir -p "${DEPS_DIR}"

    # Find all package.json files
    find ${SOURCE_DIR} -name "package.json" -not -path "*/node_modules/*" | while read pkg_file; do
        PROJECT_DIR=$(dirname "${pkg_file}")
        PROJECT_NAME=$(basename "${PROJECT_DIR}")

        # Copy package files
        cp "${pkg_file}" "${DEPS_DIR}/${PROJECT_NAME}_package.json"

        if [ -f "${PROJECT_DIR}/package-lock.json" ]; then
            cp "${PROJECT_DIR}/package-lock.json" \
                "${DEPS_DIR}/${PROJECT_NAME}_package-lock.json"
        fi

        # Generate dependency tree
        if [ -d "${PROJECT_DIR}/node_modules" ]; then
            cd "${PROJECT_DIR}"
            npm list --depth=0 > "${DEPS_DIR}/${PROJECT_NAME}_dependencies.txt" 2>/dev/null || true
        fi
    done

    # Compress dependency info
    tar -czf "${BACKUP_DIR}/dependencies_${TIMESTAMP}.tar.gz" \
        -C "${DEPS_DIR}" .

    rm -rf "${DEPS_DIR}"

    log_message "✓ Dependency information backed up"
}

# Function to clean old backups
cleanup_old_backups() {
    log_message "Cleaning up old backups..."

    # Keep only last 10 incremental backups
    ls -t ${BACKUP_DIR}/incremental/changes_*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm

    # Keep only last 30 config backups
    ls -t ${BACKUP_DIR}/configs_*.tar.gz 2>/dev/null | tail -n +31 | xargs -r rm

    # Keep only last 7 git bundles
    ls -t ${BACKUP_DIR}/git_bundle_*.bundle 2>/dev/null | tail -n +8 | xargs -r rm

    log_message "✓ Old backups cleaned up"
}

# Function to generate backup report
generate_report() {
    REPORT="${BACKUP_DIR}/backup_report_${TIMESTAMP}.txt"

    cat > ${REPORT} <<EOF
Application Backup Report
========================
Date: $(date)
Source: ${SOURCE_DIR}
Backup: ${BACKUP_DIR}

Backup Contents:
---------------
Current Mirror: $(du -sh ${BACKUP_DIR}/current 2>/dev/null | cut -f1)
Incremental Changes: $(ls ${BACKUP_DIR}/incremental/*.tar.gz 2>/dev/null | wc -l) archives
Config Backups: $(ls ${BACKUP_DIR}/configs_*.tar.gz 2>/dev/null | wc -l) archives
Git Bundles: $(ls ${BACKUP_DIR}/*.bundle 2>/dev/null | wc -l) bundles

Recent Backups:
--------------
$(ls -lh ${BACKUP_DIR}/*.tar.gz 2>/dev/null | tail -5)

Disk Usage:
----------
$(df -h ${BACKUP_DIR})

EOF

    log_message "✓ Backup report generated: ${REPORT}"
}

# Main execution
main() {
    log_message "========================================="
    log_message "Starting application backup routine"
    log_message "========================================="

    # Create directories
    mkdir -p ${BACKUP_DIR}
    mkdir -p $(dirname ${LOGFILE})

    # Create exclude file
    create_exclude_file

    # Run backup tasks
    incremental_backup
    backup_configs
    backup_pm2
    create_git_bundle
    backup_dependencies

    # Cleanup
    cleanup_old_backups

    # Generate report
    generate_report

    # Calculate total size
    TOTAL_SIZE=$(du -sh ${BACKUP_DIR} | cut -f1)
    log_message "Total backup size: ${TOTAL_SIZE}"

    log_message "========================================="
    log_message "Application backup completed successfully"
    log_message "========================================="
}

# Run main function
main "$@"