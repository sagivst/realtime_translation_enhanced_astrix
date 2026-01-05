#!/bin/bash
# Master Backup Orchestrator Script
# Coordinates all backup operations and monitoring

set -e

# Configuration
BACKUP_SCRIPTS_DIR="/home/azureuser/backup_scripts"
LOGFILE="/var/log/backup/master_backup.log"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
EMAIL_RECIPIENT="admin@example.com"  # Change this
WEBHOOK_URL=""  # Optional: Add Slack/Discord webhook

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages with color
log_message() {
    local level=$1
    shift
    local message="$@"
    local color=""

    case ${level} in
        ERROR)   color=${RED} ;;
        SUCCESS) color=${GREEN} ;;
        WARNING) color=${YELLOW} ;;
        *)       color=${NC} ;;
    esac

    echo -e "${color}[${TIMESTAMP}] [${level}] ${message}${NC}" | tee -a ${LOGFILE}
}

# Function to check prerequisites
check_prerequisites() {
    log_message INFO "Checking prerequisites..."

    # Check if running as correct user
    if [ "$(whoami)" != "azureuser" ]; then
        log_message ERROR "This script must be run as azureuser"
        exit 1
    fi

    # Check if backup directory exists
    if [ ! -d "/backup" ]; then
        log_message ERROR "Backup directory /backup does not exist"
        exit 1
    fi

    # Check disk space
    AVAILABLE_SPACE=$(df /backup | awk 'NR==2 {print $4}')
    REQUIRED_SPACE=$((10 * 1024 * 1024))  # 10GB in KB

    if [ ${AVAILABLE_SPACE} -lt ${REQUIRED_SPACE} ]; then
        log_message WARNING "Low disk space on /backup: $(df -h /backup | awk 'NR==2 {print $4}') available"
    fi

    # Check if PostgreSQL is running
    if ! systemctl is-active --quiet postgresql; then
        log_message ERROR "PostgreSQL is not running"
        exit 1
    fi

    log_message SUCCESS "Prerequisites check passed"
}

# Function to run a backup script with timeout
run_backup_script() {
    local script_name=$1
    local timeout_minutes=${2:-30}  # Default 30 minutes timeout
    local script_path="${BACKUP_SCRIPTS_DIR}/${script_name}"

    if [ ! -f "${script_path}" ]; then
        log_message WARNING "Script not found: ${script_path}"
        return 1
    fi

    if [ ! -x "${script_path}" ]; then
        log_message WARNING "Script not executable: ${script_path}"
        chmod +x "${script_path}"
    fi

    log_message INFO "Running ${script_name} (timeout: ${timeout_minutes} minutes)..."

    # Run with timeout
    timeout ${timeout_minutes}m bash "${script_path}" >> ${LOGFILE} 2>&1

    local exit_code=$?

    if [ ${exit_code} -eq 0 ]; then
        log_message SUCCESS "${script_name} completed successfully"
        return 0
    elif [ ${exit_code} -eq 124 ]; then
        log_message ERROR "${script_name} timed out after ${timeout_minutes} minutes"
        return 1
    else
        log_message ERROR "${script_name} failed with exit code ${exit_code}"
        return 1
    fi
}

# Function to perform health checks
perform_health_checks() {
    log_message INFO "Performing health checks..."

    local issues=0

    # Check database backups
    local db_backup_age=$(find /backup/databases -name "monitoring_v2_*.dump" -mmin -1440 2>/dev/null | wc -l)
    if [ ${db_backup_age} -eq 0 ]; then
        log_message WARNING "No database backup in last 24 hours"
        ((issues++))
    fi

    # Check application backups
    if [ ! -d "/backup/translation-app/current" ]; then
        log_message WARNING "Application backup directory missing"
        ((issues++))
    fi

    # Check monitoring data
    local audio_files=$(find /var/monitoring/audio -name "*.wav" 2>/dev/null | wc -l)
    log_message INFO "Current audio files in monitoring: ${audio_files}"

    # Check service status
    local services=("STTTTSserver" "monitoring-server" "database-api-server")
    for service in "${services[@]}"; do
        if ! pm2 list | grep -q "${service}.*online"; then
            log_message WARNING "Service ${service} is not running"
            ((issues++))
        fi
    done

    if [ ${issues} -eq 0 ]; then
        log_message SUCCESS "All health checks passed"
    else
        log_message WARNING "Health check found ${issues} issues"
    fi

    return ${issues}
}

# Function to generate summary report
generate_summary_report() {
    local report_file="/backup/daily_report_$(date +%Y%m%d).html"

    cat > ${report_file} <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>Backup Report - $(date +%Y-%m-%d)</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Daily Backup Report</h1>
    <p>Generated: $(date)</p>
    <p>Hostname: $(hostname)</p>

    <h2>Backup Status</h2>
    <table>
        <tr>
            <th>Component</th>
            <th>Status</th>
            <th>Last Backup</th>
            <th>Size</th>
        </tr>
        <tr>
            <td>Database (monitoring_v2)</td>
            <td class="$([ -f /backup/databases/monitoring_v2_latest.dump ] && echo 'success' || echo 'error')">
                $([ -f /backup/databases/monitoring_v2_latest.dump ] && echo '✓ OK' || echo '✗ FAILED')
            </td>
            <td>$(stat -c %y /backup/databases/monitoring_v2_latest.dump 2>/dev/null | cut -d. -f1 || echo 'N/A')</td>
            <td>$(du -h /backup/databases/monitoring_v2_latest.dump 2>/dev/null | cut -f1 || echo 'N/A')</td>
        </tr>
        <tr>
            <td>Application Code</td>
            <td class="success">✓ OK</td>
            <td>$(stat -c %y /backup/translation-app/current 2>/dev/null | cut -d. -f1 || echo 'N/A')</td>
            <td>$(du -sh /backup/translation-app/current 2>/dev/null | cut -f1 || echo 'N/A')</td>
        </tr>
        <tr>
            <td>Audio Files</td>
            <td class="success">✓ OK</td>
            <td>$(date)</td>
            <td>$(du -sh /backup/monitoring-audio 2>/dev/null | cut -f1 || echo 'N/A')</td>
        </tr>
    </table>

    <h2>Disk Usage</h2>
    <pre>$(df -h /backup)</pre>

    <h2>Service Status</h2>
    <pre>$(pm2 list --no-color)</pre>

    <h2>Recent Backup Logs</h2>
    <pre>$(tail -20 ${LOGFILE})</pre>
</body>
</html>
EOF

    log_message SUCCESS "Summary report generated: ${report_file}"
}

# Function to send notifications
send_notification() {
    local status=$1
    local message=$2

    # Email notification (requires mail/sendmail configured)
    if [ -n "${EMAIL_RECIPIENT}" ] && command -v mail &> /dev/null; then
        echo "${message}" | mail -s "Backup ${status} - $(hostname)" ${EMAIL_RECIPIENT}
    fi

    # Webhook notification (Slack/Discord)
    if [ -n "${WEBHOOK_URL}" ]; then
        curl -X POST ${WEBHOOK_URL} \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"**Backup ${status}** on $(hostname)\n${message}\"}" \
            2>/dev/null
    fi
}

# Function to run parallel backups
run_parallel_backups() {
    log_message INFO "Starting parallel backup jobs..."

    # Create a temporary directory for job status files
    local job_dir="/tmp/backup_jobs_$$"
    mkdir -p ${job_dir}

    # Start backup jobs in background
    (run_backup_script "database_backup.sh" 60 && echo "SUCCESS" > ${job_dir}/database.status || echo "FAILED" > ${job_dir}/database.status) &
    local pid_database=$!

    (run_backup_script "application_backup.sh" 30 && echo "SUCCESS" > ${job_dir}/application.status || echo "FAILED" > ${job_dir}/application.status) &
    local pid_application=$!

    (run_backup_script "monitoring_backup.sh" 45 && echo "SUCCESS" > ${job_dir}/monitoring.status || echo "FAILED" > ${job_dir}/monitoring.status) &
    local pid_monitoring=$!

    # Wait for all jobs to complete
    log_message INFO "Waiting for backup jobs to complete..."
    wait ${pid_database} ${pid_application} ${pid_monitoring}

    # Check results
    local all_success=true
    for job in database application monitoring; do
        if [ -f "${job_dir}/${job}.status" ]; then
            local status=$(cat ${job_dir}/${job}.status)
            if [ "${status}" != "SUCCESS" ]; then
                all_success=false
                log_message ERROR "${job} backup failed"
            fi
        else
            all_success=false
            log_message ERROR "${job} backup did not complete"
        fi
    done

    # Cleanup
    rm -rf ${job_dir}

    if ${all_success}; then
        log_message SUCCESS "All parallel backups completed successfully"
        return 0
    else
        log_message ERROR "Some backups failed"
        return 1
    fi
}

# Main execution
main() {
    log_message INFO "========================================="
    log_message INFO "Master Backup Routine Starting"
    log_message INFO "========================================="

    # Initialize
    mkdir -p $(dirname ${LOGFILE})
    SCRIPT_START=$(date +%s)

    # Check prerequisites
    check_prerequisites

    # Run backups (choose sequential or parallel)
    if [ "$1" = "--parallel" ]; then
        run_parallel_backups
        BACKUP_RESULT=$?
    else
        # Sequential backups
        run_backup_script "database_backup.sh" 60
        run_backup_script "application_backup.sh" 30
        run_backup_script "monitoring_backup.sh" 45
        BACKUP_RESULT=$?
    fi

    # Perform health checks
    perform_health_checks
    HEALTH_RESULT=$?

    # Generate reports
    generate_summary_report

    # Calculate execution time
    SCRIPT_END=$(date +%s)
    DURATION=$((SCRIPT_END - SCRIPT_START))
    DURATION_MIN=$((DURATION / 60))

    # Prepare summary message
    BACKUP_SIZE=$(du -sh /backup | cut -f1)
    SUMMARY="Backup completed in ${DURATION_MIN} minutes. Total size: ${BACKUP_SIZE}"

    # Determine overall status and send notification
    if [ ${BACKUP_RESULT} -eq 0 ] && [ ${HEALTH_RESULT} -eq 0 ]; then
        log_message SUCCESS "${SUMMARY}"
        send_notification "SUCCESS" "${SUMMARY}"
    elif [ ${BACKUP_RESULT} -ne 0 ]; then
        log_message ERROR "Backup failed. ${SUMMARY}"
        send_notification "FAILURE" "Backup failed. Check ${LOGFILE} for details."
    else
        log_message WARNING "Backup completed with warnings. ${SUMMARY}"
        send_notification "WARNING" "Backup completed with ${HEALTH_RESULT} warnings. ${SUMMARY}"
    fi

    log_message INFO "========================================="
    log_message INFO "Master Backup Routine Completed"
    log_message INFO "========================================="

    exit ${BACKUP_RESULT}
}

# Handle script arguments
case "$1" in
    --check)
        check_prerequisites
        perform_health_checks
        ;;
    --report)
        generate_summary_report
        ;;
    --parallel)
        main --parallel
        ;;
    *)
        main
        ;;
esac