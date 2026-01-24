#!/bin/bash

# NEW Monitoring System - Complete System Restoration Script
# This script restores the monitoring system from backups
# Usage: ./restore_system.sh [--database|--source|--config|--full] [--date YYYYMMDD]

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

# Restore targets
RESTORE_ROOT="/home/azureuser/translation-app/3333_4444__Operational"
AUDIO_ROOT="/var/monitoring/audio"

# Database configuration
DB_NAME="monitoring_v2"
DB_USER="monitoring_user"
DB_HOST="localhost"
DB_PORT="5432"

# Logging
LOG_FILE="/var/log/monitoring_restore.log"
ERROR_LOG="/var/log/monitoring_restore_error.log"

# Options
RESTORE_TYPE="${1:-full}"
RESTORE_DATE="${2:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# =============================================================================
# Functions
# =============================================================================

# Logging functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error_log() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$ERROR_LOG"
}

warning_log() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Find latest backup file
find_latest_backup() {
    local backup_dir="$1"
    local pattern="$2"

    if [ "$RESTORE_DATE" = "latest" ]; then
        ls -t "$backup_dir"/$pattern 2>/dev/null | head -1
    else
        ls -t "$backup_dir"/*${RESTORE_DATE}*$pattern 2>/dev/null | head -1
    fi
}

# Confirmation prompt
confirm_restore() {
    echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║         SYSTEM RESTORATION WARNING       ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo "This will restore the monitoring system from backup."
    echo "Restore type: $RESTORE_TYPE"
    echo "Restore date: $RESTORE_DATE"
    echo ""
    echo -e "${YELLOW}WARNING: This may overwrite existing data!${NC}"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        echo "Restoration cancelled."
        exit 0
    fi
}

# =============================================================================
# Pre-restoration Checks
# =============================================================================

pre_restore_checks() {
    log "Performing pre-restoration checks..."

    # Check if backup directories exist
    if [ ! -d "$BACKUP_ROOT" ]; then
        error_log "Backup directory not found: $BACKUP_ROOT"
        exit 1
    fi

    # Check if running as correct user
    if [ "$USER" != "azureuser" ] && [ "$USER" != "root" ]; then
        warning_log "Not running as azureuser or root, some operations may fail"
    fi

    # Check PostgreSQL is running
    if ! systemctl is-active --quiet postgresql; then
        warning_log "PostgreSQL is not running, attempting to start..."
        sudo systemctl start postgresql
    fi

    # Check disk space
    local available_space=$(df "$RESTORE_ROOT" | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 1000000 ]; then  # Less than 1GB
        error_log "Insufficient disk space for restoration"
        exit 1
    fi

    log "Pre-restoration checks complete"
}

# =============================================================================
# Database Restoration
# =============================================================================

restore_database() {
    log "Starting database restoration..."

    # Find backup file
    local backup_file=$(find_latest_backup "$BACKUP_POSTGRES/daily" "*.sql.gz")

    if [ -z "$backup_file" ]; then
        error_log "No database backup found"
        return 1
    fi

    log "Using backup file: $backup_file"

    # Create backup of current database
    log "Creating safety backup of current database..."
    PGPASSWORD=monitoring_pass pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" | gzip > "/tmp/monitoring_v2_safety_$(date +%Y%m%d_%H%M%S).sql.gz"

    # Stop services using the database
    log "Stopping services..."
    pm2 stop STTTTSserver 2>/dev/null || true

    # Drop and recreate database
    log "Recreating database..."
    PGPASSWORD=monitoring_pass dropdb \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        --if-exists \
        "$DB_NAME"

    PGPASSWORD=monitoring_pass createdb \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -O "$DB_USER" \
        "$DB_NAME"

    # Enable extensions
    PGPASSWORD=monitoring_pass psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

    # Restore database
    log "Restoring database from backup..."
    gunzip -c "$backup_file" | PGPASSWORD=monitoring_pass psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --quiet

    # Verify restoration
    local table_count=$(PGPASSWORD=monitoring_pass psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';")

    if [ "$table_count" -ge 7 ]; then
        log "Database restoration successful - $table_count tables restored"
    else
        error_log "Database restoration may be incomplete - only $table_count tables found"
    fi

    # Display statistics
    PGPASSWORD=monitoring_pass psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "SELECT
            'Traces' as table_name, COUNT(*) as count FROM traces
            UNION ALL
            SELECT 'Metrics', COUNT(*) FROM metrics_agg_5s
            UNION ALL
            SELECT 'Audio Segments', COUNT(*) FROM audio_segments_5s
            UNION ALL
            SELECT 'Knob Snapshots', COUNT(*) FROM knob_snapshots_5s;"

    log "Database restoration complete"
}

# =============================================================================
# Source Code Restoration
# =============================================================================

restore_source_code() {
    log "Starting source code restoration..."

    # Find backup file
    local backup_file=$(find_latest_backup "$BACKUP_SOURCE/daily" "*.tar.gz")

    if [ -z "$backup_file" ]; then
        error_log "No source code backup found"
        return 1
    fi

    log "Using backup file: $backup_file"

    # Create safety backup of current source
    if [ -d "$RESTORE_ROOT/STTTTSserver" ]; then
        log "Creating safety backup of current source..."
        tar -czf "/tmp/source_safety_$(date +%Y%m%d_%H%M%S).tar.gz" \
            -C "$RESTORE_ROOT" STTTTSserver/
    fi

    # Create restore directory if needed
    mkdir -p "$RESTORE_ROOT/STTTTSserver"

    # Extract source code
    log "Extracting source code..."
    tar -xzf "$backup_file" -C "$RESTORE_ROOT"

    # Verify critical file
    local db_bridge="$RESTORE_ROOT/STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js"
    if [ -f "$db_bridge" ]; then
        if grep -q "INSERT INTO traces" "$db_bridge"; then
            log "✓ Critical trace creation code verified in DatabaseBridge.js"
        else
            error_log "✗ DatabaseBridge.js missing critical trace creation code!"
            warning_log "System may not function correctly without trace creation code"
        fi
    else
        error_log "DatabaseBridge.js not found after restoration!"
    fi

    # List restored files
    log "Restored files:"
    find "$RESTORE_ROOT/STTTTSserver" -name "*.js" -type f | head -20

    # Restore node_modules if needed
    if [ -f "$RESTORE_ROOT/STTTTSserver/package.json" ]; then
        log "Installing Node.js dependencies..."
        cd "$RESTORE_ROOT/STTTTSserver"
        npm install --production
    fi

    log "Source code restoration complete"
}

# =============================================================================
# Configuration Restoration
# =============================================================================

restore_configuration() {
    log "Starting configuration restoration..."

    # Find backup file
    local backup_file=$(find_latest_backup "$BACKUP_CONFIG/daily" "*.tar.gz")

    if [ -z "$backup_file" ]; then
        error_log "No configuration backup found"
        return 1
    fi

    log "Using backup file: $backup_file"

    # Create temporary extraction directory
    local temp_dir="/tmp/config_restore_$$"
    mkdir -p "$temp_dir"

    # Extract configuration
    tar -xzf "$backup_file" -C "$temp_dir"

    # Restore monitoring configuration
    if [ -f "$temp_dir/monitoring.config.json" ]; then
        mkdir -p "$RESTORE_ROOT/STTTTSserver/Monitoring_Stations/config"
        cp "$temp_dir/monitoring.config.json" \
           "$RESTORE_ROOT/STTTTSserver/Monitoring_Stations/config/"
        log "✓ Restored monitoring.config.json"
    fi

    # Restore ecosystem config
    if [ -f "$temp_dir/ecosystem.config.js" ]; then
        cp "$temp_dir/ecosystem.config.js" \
           "$RESTORE_ROOT/STTTTSserver/"
        log "✓ Restored ecosystem.config.js"
    fi

    # Restore package.json
    if [ -f "$temp_dir/package.json" ]; then
        cp "$temp_dir/package.json" \
           "$RESTORE_ROOT/STTTTSserver/"
        log "✓ Restored package.json"
    fi

    # Restore PM2 configuration
    if [ -f "$temp_dir/pm2_dump.json" ]; then
        log "Restoring PM2 processes..."
        pm2 delete all 2>/dev/null || true
        pm2 resurrect "$temp_dir/pm2_dump.json"
        log "✓ PM2 processes restored"
    fi

    # Restore crontab
    if [ -f "$temp_dir/crontab.txt" ]; then
        log "Restoring cron jobs..."
        crontab "$temp_dir/crontab.txt"
        log "✓ Cron jobs restored"
    fi

    # Cleanup
    rm -rf "$temp_dir"

    log "Configuration restoration complete"
}

# =============================================================================
# Audio Files Restoration
# =============================================================================

restore_audio_files() {
    log "Starting audio files restoration..."

    # Find backup file
    local backup_file=$(find_latest_backup "$BACKUP_AUDIO/daily" "*.tar.gz")

    if [ -z "$backup_file" ]; then
        warning_log "No audio backup found - skipping"
        return 0
    fi

    log "Using backup file: $backup_file"

    # Create audio directory if needed
    sudo mkdir -p "$AUDIO_ROOT/traces"
    sudo chown -R azureuser:azureuser "$AUDIO_ROOT"

    # Extract audio files
    log "Extracting audio files..."
    tar -xzf "$backup_file" -C / 2>/dev/null || {
        warning_log "Some audio files could not be restored"
    }

    # Check restored files
    local file_count=$(find "$AUDIO_ROOT" -name "*.wav" | wc -l)
    log "Restored $file_count audio files"

    log "Audio restoration complete"
}

# =============================================================================
# System State Restoration
# =============================================================================

restore_system_state() {
    log "Restoring system state..."

    # Directory permissions
    log "Setting directory permissions..."
    sudo chown -R azureuser:azureuser "$RESTORE_ROOT"
    sudo chown -R azureuser:azureuser "$AUDIO_ROOT"
    chmod -R 755 "$RESTORE_ROOT"
    chmod -R 755 "$AUDIO_ROOT"

    # Start services
    log "Starting services..."
    cd "$RESTORE_ROOT/STTTTSserver"
    pm2 start ecosystem.config.js

    # Wait for services to stabilize
    sleep 5

    # Check service status
    pm2 status

    log "System state restoration complete"
}

# =============================================================================
# Verification
# =============================================================================

verify_restoration() {
    log "Verifying system restoration..."

    local all_good=true

    # Check database
    echo -n "Database connection: "
    if PGPASSWORD=monitoring_pass psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "SELECT 1;" &>/dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        all_good=false
    fi

    # Check critical files
    echo -n "DatabaseBridge.js with trace creation: "
    if grep -q "INSERT INTO traces" \
        "$RESTORE_ROOT/STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        all_good=false
    fi

    # Check PM2 services
    echo -n "PM2 services running: "
    if pm2 list | grep -q "STTTTSserver.*online"; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        all_good=false
    fi

    # Check API
    echo -n "API responding: "
    if curl -s http://localhost:3020/health | grep -q "ok"; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        all_good=false
    fi

    # Check audio directory
    echo -n "Audio directory accessible: "
    if [ -d "$AUDIO_ROOT" ] && [ -w "$AUDIO_ROOT" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        all_good=false
    fi

    # Summary
    echo ""
    if [ "$all_good" = true ]; then
        log "✓ System restoration verified successfully"
    else
        error_log "✗ System restoration incomplete - manual intervention required"
    fi
}

# =============================================================================
# Quick Test
# =============================================================================

run_quick_test() {
    log "Running quick system test..."

    # Create test script
    cat > /tmp/test_monitoring.js << 'EOF'
const dgram = require('dgram');
const client = dgram.createSocket('udp4');
const audio = Buffer.alloc(160, 0);

console.log('Sending test audio...');
for(let i = 0; i < 100; i++) {
    setTimeout(() => {
        client.send(audio, 6120, 'localhost', (err) => {
            if (err && i === 0) console.error('Send error:', err);
        });
    }, i * 10);
}

setTimeout(() => {
    console.log('Test complete');
    process.exit(0);
}, 1500);
EOF

    # Run test
    cd "$RESTORE_ROOT/STTTTSserver"
    node /tmp/test_monitoring.js

    # Check results after delay
    sleep 3

    # Query for recent data
    local recent_traces=$(PGPASSWORD=monitoring_pass psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t -c "SELECT COUNT(*) FROM traces WHERE started_at > NOW() - INTERVAL '1 minute';")

    if [ "$recent_traces" -gt 0 ]; then
        log "✓ Test successful - system is processing data"
    else
        warning_log "⚠ Test may have failed - no recent traces found"
    fi

    rm /tmp/test_monitoring.js
}

# =============================================================================
# Recovery Report
# =============================================================================

generate_recovery_report() {
    local report_file="/tmp/recovery_report_$(date +%Y%m%d_%H%M%S).txt"

    {
        echo "=== System Recovery Report ==="
        echo "Date: $(date)"
        echo "Restore Type: $RESTORE_TYPE"
        echo "Restore Date: $RESTORE_DATE"
        echo ""
        echo "=== Database Statistics ==="
        PGPASSWORD=monitoring_pass psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -c "SELECT
                'Traces' as table_name, COUNT(*) as records FROM traces
                UNION ALL
                SELECT 'Metrics', COUNT(*) FROM metrics_agg_5s
                UNION ALL
                SELECT 'Audio Segments', COUNT(*) FROM audio_segments_5s
                UNION ALL
                SELECT 'Knob Events', COUNT(*) FROM knob_events;"

        echo ""
        echo "=== Service Status ==="
        pm2 list

        echo ""
        echo "=== Disk Usage ==="
        df -h "$RESTORE_ROOT"
        df -h "$AUDIO_ROOT"

        echo ""
        echo "=== Recent Logs ==="
        pm2 logs STTTTSserver --nostream --lines 10

    } > "$report_file"

    log "Recovery report saved to: $report_file"
    cat "$report_file"
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   NEW Monitoring System Restore Utility    ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""

    # Parse arguments
    case "$1" in
        --database)
            RESTORE_TYPE="database"
            RESTORE_DATE="${2:-latest}"
            ;;
        --source)
            RESTORE_TYPE="source"
            RESTORE_DATE="${2:-latest}"
            ;;
        --config)
            RESTORE_TYPE="config"
            RESTORE_DATE="${2:-latest}"
            ;;
        --full)
            RESTORE_TYPE="full"
            RESTORE_DATE="${2:-latest}"
            ;;
        --date)
            RESTORE_DATE="$2"
            RESTORE_TYPE="${3:-full}"
            ;;
        *)
            if [ -n "$1" ] && [ "$1" != "--help" ]; then
                RESTORE_DATE="$1"
            fi
            ;;
    esac

    log "Restore configuration:"
    log "  Type: $RESTORE_TYPE"
    log "  Date: $RESTORE_DATE"
    echo ""

    # Confirm restoration
    confirm_restore

    # Pre-restoration checks
    pre_restore_checks

    # Perform restoration based on type
    case "$RESTORE_TYPE" in
        database)
            restore_database
            ;;
        source)
            restore_source_code
            ;;
        config)
            restore_configuration
            ;;
        full)
            restore_database
            restore_source_code
            restore_configuration
            restore_audio_files
            restore_system_state
            ;;
        *)
            error_log "Invalid restore type: $RESTORE_TYPE"
            echo "Usage: $0 [--database|--source|--config|--full] [--date YYYYMMDD]"
            exit 1
            ;;
    esac

    # Verification
    verify_restoration

    # Run test if full restore
    if [ "$RESTORE_TYPE" = "full" ]; then
        run_quick_test
    fi

    # Generate report
    generate_recovery_report

    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    echo -e "${GREEN}   Restoration process complete!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review the recovery report above"
    echo "2. Check service status: pm2 status"
    echo "3. Monitor logs: pm2 logs STTTTSserver"
    echo "4. Test the API: curl http://localhost:3020/health"
    echo ""
}

# Show help if requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [options] [date]"
    echo ""
    echo "Options:"
    echo "  --full              Perform full system restoration (default)"
    echo "  --database          Restore database only"
    echo "  --source            Restore source code only"
    echo "  --config            Restore configuration only"
    echo "  --date YYYYMMDD     Restore from specific date"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                  # Full restore from latest backup"
    echo "  $0 --database       # Restore database only from latest"
    echo "  $0 --full 20260112  # Full restore from Jan 12, 2026"
    echo ""
    exit 0
fi

# Run main function
main "$@"

exit 0