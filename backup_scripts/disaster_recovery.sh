#!/bin/bash
# Disaster Recovery Script
# Restore system from backups in case of failure

set -e

# Configuration
BACKUP_ROOT="/backup"
APP_DIR="/home/azureuser/translation-app"
RECOVERY_LOG="/var/log/recovery_$(date +%Y%m%d_%H%M%S).log"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to log messages
log_message() {
    echo -e "[${TIMESTAMP}] $1" | tee -a ${RECOVERY_LOG}
}

# Function to print colored messages
print_color() {
    local color=$1
    shift
    echo -e "${color}$@${NC}"
}

# Function to confirm action
confirm_action() {
    local message=$1
    print_color ${YELLOW} "\n${message}"
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_color ${RED} "Recovery cancelled by user"
        exit 1
    fi
}

# Function to check recovery prerequisites
check_prerequisites() {
    print_color ${BLUE} "\n=== Checking Prerequisites ==="

    # Check if backup directory exists
    if [ ! -d "${BACKUP_ROOT}" ]; then
        print_color ${RED} "✗ Backup directory ${BACKUP_ROOT} not found"
        exit 1
    fi

    # Check if running as correct user
    if [ "$(whoami)" != "azureuser" ] && [ "$(whoami)" != "root" ]; then
        print_color ${RED} "✗ This script must be run as azureuser or root"
        exit 1
    fi

    # List available backups
    print_color ${GREEN} "✓ Found backup directory"
    echo "Available backups:"
    echo "  Databases: $(ls -t ${BACKUP_ROOT}/databases/*.dump 2>/dev/null | wc -l) files"
    echo "  Application: $([ -d ${BACKUP_ROOT}/translation-app/current ] && echo 'Yes' || echo 'No')"
    echo "  Configs: $(ls -t ${BACKUP_ROOT}/configs_*.tar.gz 2>/dev/null | wc -l) archives"
    echo "  Audio: $([ -d ${BACKUP_ROOT}/monitoring-audio ] && echo 'Yes' || echo 'No')"
}

# Function to stop all services
stop_services() {
    print_color ${BLUE} "\n=== Stopping Services ==="

    log_message "Stopping PM2 services..."
    pm2 stop all || true

    log_message "Stopping Asterisk..."
    sudo systemctl stop asterisk || true

    log_message "Stopping monitoring services..."
    sudo systemctl stop monitoring-server || true
    sudo systemctl stop database-api-server || true

    print_color ${GREEN} "✓ All services stopped"
}

# Function to restore database
restore_database() {
    local db_name=$1
    local backup_file=$2

    print_color ${BLUE} "\n=== Restoring Database: ${db_name} ==="

    if [ ! -f "${backup_file}" ]; then
        # Try to find latest backup
        backup_file=$(ls -t ${BACKUP_ROOT}/databases/${db_name}_*.dump 2>/dev/null | head -1)
        if [ -z "${backup_file}" ]; then
            print_color ${RED} "✗ No backup found for ${db_name}"
            return 1
        fi
    fi

    log_message "Using backup: ${backup_file}"
    log_message "Backup date: $(stat -c %y ${backup_file} | cut -d. -f1)"

    # Create database if it doesn't exist
    sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='${db_name}'" | grep -q 1 || \
        sudo -u postgres createdb ${db_name}

    # Restore database
    log_message "Restoring ${db_name}..."
    sudo -u postgres pg_restore \
        --dbname=${db_name} \
        --clean \
        --if-exists \
        --verbose \
        ${backup_file} 2>&1 | tee -a ${RECOVERY_LOG}

    if [ $? -eq 0 ]; then
        print_color ${GREEN} "✓ Database ${db_name} restored successfully"

        # Verify restoration
        ROW_COUNT=$(sudo -u postgres psql -t -d ${db_name} -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null || echo 0)
        log_message "Restored ${ROW_COUNT} tables"
    else
        print_color ${RED} "✗ Failed to restore ${db_name}"
        return 1
    fi
}

# Function to restore application files
restore_application() {
    print_color ${BLUE} "\n=== Restoring Application Files ==="

    local backup_dir="${BACKUP_ROOT}/translation-app/current"

    if [ ! -d "${backup_dir}" ]; then
        print_color ${RED} "✗ No application backup found"
        return 1
    fi

    # Backup current state before restoration
    if [ -d "${APP_DIR}" ]; then
        local pre_restore_backup="${APP_DIR}_pre_restore_$(date +%Y%m%d_%H%M%S)"
        log_message "Creating pre-restoration backup: ${pre_restore_backup}"
        mv ${APP_DIR} ${pre_restore_backup}
    fi

    # Create application directory
    mkdir -p ${APP_DIR}

    # Restore files
    log_message "Restoring application files..."
    rsync -avz --delete \
        ${backup_dir}/ \
        ${APP_DIR}/ 2>&1 | tee -a ${RECOVERY_LOG}

    if [ $? -eq 0 ]; then
        print_color ${GREEN} "✓ Application files restored"
    else
        print_color ${RED} "✗ Failed to restore application files"
        return 1
    fi

    # Restore node_modules if needed
    cd ${APP_DIR}/STTTTSserver
    if [ -f "package.json" ] && [ ! -d "node_modules" ]; then
        log_message "Installing Node.js dependencies..."
        npm ci || npm install
    fi

    # Restore PM2 configuration
    if [ -f "${BACKUP_ROOT}/pm2_latest.json" ]; then
        log_message "Restoring PM2 configuration..."
        pm2 resurrect ${BACKUP_ROOT}/pm2_latest.json || true
    fi
}

# Function to restore configuration files
restore_configs() {
    print_color ${BLUE} "\n=== Restoring Configuration Files ==="

    local config_backup=$(ls -t ${BACKUP_ROOT}/configs_*.tar.gz 2>/dev/null | head -1)

    if [ -z "${config_backup}" ]; then
        print_color ${YELLOW} "⚠ No configuration backup found"
        return 0
    fi

    log_message "Using config backup: ${config_backup}"

    # Extract configs to temporary directory
    local temp_dir="/tmp/config_restore_$$"
    mkdir -p ${temp_dir}

    tar -xzf ${config_backup} -C ${temp_dir}

    # Restore specific config files
    if [ -f "${temp_dir}/home/azureuser/.env" ]; then
        cp ${temp_dir}/home/azureuser/.env /home/azureuser/.env
        log_message "Restored: /home/azureuser/.env"
    fi

    if [ -d "${temp_dir}/home/azureuser/.pm2" ]; then
        cp -r ${temp_dir}/home/azureuser/.pm2 /home/azureuser/
        log_message "Restored: PM2 configuration"
    fi

    # Restore Asterisk configs (requires sudo)
    if [ -d "${temp_dir}/etc/asterisk" ] && [ "$(whoami)" = "root" ]; then
        cp -r ${temp_dir}/etc/asterisk/* /etc/asterisk/
        log_message "Restored: Asterisk configuration"
    fi

    # Cleanup
    rm -rf ${temp_dir}

    print_color ${GREEN} "✓ Configuration files restored"
}

# Function to restore monitoring data
restore_monitoring_data() {
    print_color ${BLUE} "\n=== Restoring Monitoring Data ==="

    # Restore audio files if requested
    if [ "$1" = "--with-audio" ]; then
        if [ -d "${BACKUP_ROOT}/monitoring-audio/current" ]; then
            log_message "Restoring audio files..."
            mkdir -p /var/monitoring/audio
            rsync -avz ${BACKUP_ROOT}/monitoring-audio/current/ /var/monitoring/audio/
            print_color ${GREEN} "✓ Audio files restored"
        fi
    else
        print_color ${YELLOW} "⚠ Skipping audio restoration (use --with-audio to include)"
    fi

    # Import metrics data if available
    local latest_metrics=$(ls -t ${BACKUP_ROOT}/metrics/*_*.csv.gz 2>/dev/null | head -1)
    if [ -n "${latest_metrics}" ]; then
        log_message "Found metrics export: ${latest_metrics}"
        # Note: Actual import would require custom SQL scripts
        print_color ${YELLOW} "⚠ Metrics import requires manual intervention"
    fi
}

# Function to start services
start_services() {
    print_color ${BLUE} "\n=== Starting Services ==="

    log_message "Starting PostgreSQL..."
    sudo systemctl start postgresql

    log_message "Starting Asterisk..."
    sudo systemctl start asterisk

    log_message "Starting PM2 services..."
    cd ${APP_DIR}
    pm2 resurrect || pm2 start ecosystem.config.js

    print_color ${GREEN} "✓ Services started"
}

# Function to verify restoration
verify_restoration() {
    print_color ${BLUE} "\n=== Verifying Restoration ==="

    local issues=0

    # Check database
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw monitoring_v2; then
        print_color ${GREEN} "✓ Database monitoring_v2 exists"
    else
        print_color ${RED} "✗ Database monitoring_v2 not found"
        ((issues++))
    fi

    # Check application files
    if [ -f "${APP_DIR}/STTTTSserver/STTTTSserver.js" ]; then
        print_color ${GREEN} "✓ STTTTSserver files present"
    else
        print_color ${RED} "✗ STTTTSserver files missing"
        ((issues++))
    fi

    # Check PM2 services
    pm2 list | grep -q "online" && print_color ${GREEN} "✓ PM2 services running" || print_color ${YELLOW} "⚠ No PM2 services online"

    # Check Asterisk
    systemctl is-active --quiet asterisk && print_color ${GREEN} "✓ Asterisk running" || print_color ${YELLOW} "⚠ Asterisk not running"

    if [ ${issues} -eq 0 ]; then
        print_color ${GREEN} "\n✓ Restoration completed successfully"
    else
        print_color ${YELLOW} "\n⚠ Restoration completed with ${issues} issues"
    fi

    return ${issues}
}

# Function to perform quick recovery
quick_recovery() {
    print_color ${BLUE} "\n=== Quick Recovery Mode ==="
    log_message "Performing quick recovery (database + configs only)"

    stop_services
    restore_database "monitoring_v2" ""
    restore_database "airtable_cache" ""
    restore_configs
    start_services
    verify_restoration
}

# Function to perform full recovery
full_recovery() {
    print_color ${BLUE} "\n=== Full Recovery Mode ==="
    confirm_action "This will restore ALL components from backup. Current data will be overwritten!"

    stop_services
    restore_database "monitoring_v2" ""
    restore_database "airtable_cache" ""
    restore_database "asterisk" ""
    restore_application
    restore_configs
    restore_monitoring_data "$1"
    start_services
    verify_restoration
}

# Function to show recovery menu
show_menu() {
    print_color ${BLUE} "\n======================================"
    print_color ${BLUE} "   Disaster Recovery System"
    print_color ${BLUE} "======================================"

    echo ""
    echo "Select recovery option:"
    echo "1) Quick Recovery (Database + Configs)"
    echo "2) Full Recovery (All components)"
    echo "3) Database Only"
    echo "4) Application Files Only"
    echo "5) Configuration Files Only"
    echo "6) Custom Recovery"
    echo "7) Verify Current System"
    echo "0) Exit"
    echo ""

    read -p "Enter option: " -r option

    case $option in
        1) quick_recovery ;;
        2) full_recovery ;;
        3)
            confirm_action "Restore databases from backup?"
            stop_services
            restore_database "monitoring_v2" ""
            restore_database "airtable_cache" ""
            restore_database "asterisk" ""
            start_services
            ;;
        4)
            confirm_action "Restore application files?"
            stop_services
            restore_application
            start_services
            ;;
        5)
            confirm_action "Restore configuration files?"
            restore_configs
            ;;
        6)
            # Custom recovery - user selects what to restore
            echo "Custom recovery - select components:"
            read -p "Restore monitoring_v2 database? (y/n): " -n 1 -r
            [[ $REPLY =~ ^[Yy]$ ]] && restore_database "monitoring_v2" ""
            echo ""
            read -p "Restore application files? (y/n): " -n 1 -r
            [[ $REPLY =~ ^[Yy]$ ]] && restore_application
            echo ""
            read -p "Restore configs? (y/n): " -n 1 -r
            [[ $REPLY =~ ^[Yy]$ ]] && restore_configs
            ;;
        7) verify_restoration ;;
        0) exit 0 ;;
        *) print_color ${RED} "Invalid option" ;;
    esac
}

# Main execution
main() {
    # Create log directory
    mkdir -p $(dirname ${RECOVERY_LOG})

    # Parse command line arguments
    case "$1" in
        --quick)
            check_prerequisites
            quick_recovery
            ;;
        --full)
            check_prerequisites
            full_recovery "$2"
            ;;
        --database)
            check_prerequisites
            confirm_action "Restore database $2 from backup?"
            restore_database "$2" "$3"
            ;;
        --verify)
            verify_restoration
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --quick              Quick recovery (database + configs)"
            echo "  --full [--with-audio]  Full system recovery"
            echo "  --database NAME [FILE] Restore specific database"
            echo "  --verify             Verify system status"
            echo "  --help               Show this help"
            echo ""
            echo "Interactive mode: Run without arguments for menu"
            ;;
        *)
            check_prerequisites
            show_menu
            ;;
    esac

    log_message "Recovery log saved to: ${RECOVERY_LOG}"
}

# Run main function
main "$@"