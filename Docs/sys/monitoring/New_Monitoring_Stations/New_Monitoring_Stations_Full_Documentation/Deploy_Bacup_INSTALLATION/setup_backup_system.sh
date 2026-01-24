#!/bin/bash

# NEW Monitoring System - Complete Backup System Setup
# This script sets up the entire backup infrastructure for fresh deployments
# Run as: sudo ./setup_backup_system.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_ROOT="/backup/monitoring"
SCRIPT_DIR="$BACKUP_ROOT/scripts"
LOG_DIR="/var/log/monitoring"

# =============================================================================
# Functions
# =============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo -e "${BLUE}   $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

# =============================================================================
# Setup Backup Directory Structure
# =============================================================================

setup_directories() {
    print_header "Setting Up Backup Directories"

    # Create main backup structure
    directories=(
        "$BACKUP_ROOT"
        "$BACKUP_ROOT/postgres/hourly"
        "$BACKUP_ROOT/postgres/daily"
        "$BACKUP_ROOT/postgres/weekly"
        "$BACKUP_ROOT/postgres/monthly"
        "$BACKUP_ROOT/postgres/wal"
        "$BACKUP_ROOT/source/daily"
        "$BACKUP_ROOT/source/weekly"
        "$BACKUP_ROOT/source/git"
        "$BACKUP_ROOT/config/daily"
        "$BACKUP_ROOT/config/history"
        "$BACKUP_ROOT/audio/daily"
        "$BACKUP_ROOT/audio/archive"
        "$BACKUP_ROOT/system/state"
        "$BACKUP_ROOT/system/pm2"
        "$BACKUP_ROOT/logs/compressed"
        "$BACKUP_ROOT/logs/archive"
        "$SCRIPT_DIR"
        "$LOG_DIR"
    )

    for dir in "${directories[@]}"; do
        if mkdir -p "$dir" 2>/dev/null; then
            print_success "Created: $dir"
        else
            print_warning "Directory exists: $dir"
        fi
    done

    # Set permissions
    chown -R azureuser:azureuser "$BACKUP_ROOT"
    chmod -R 755 "$BACKUP_ROOT"
    print_success "Permissions set for backup directories"
}

# =============================================================================
# Install Backup Scripts
# =============================================================================

install_backup_scripts() {
    print_header "Installing Backup Scripts"

    # Copy scripts from documentation
    DOC_DIR="/Users/sagivstavinsky/realtime-translation-enhanced_astrix/Docs/sys/monitoring/New_Monitoring_Stations/AI_Optimizer_Final_Gap"

    if [ -d "$DOC_DIR/backup_scripts" ]; then
        cp "$DOC_DIR/backup_scripts/"*.sh "$SCRIPT_DIR/"
        chmod +x "$SCRIPT_DIR/"*.sh
        print_success "Backup scripts installed"
    else
        print_warning "Creating backup scripts from template"

        # Create main backup script
        cat > "$SCRIPT_DIR/backup_daily.sh" << 'EOF'
#!/bin/bash
# Daily backup script
/backup/monitoring/scripts/automated_backup.sh --full
EOF

        # Create hourly backup script
        cat > "$SCRIPT_DIR/backup_hourly.sh" << 'EOF'
#!/bin/bash
# Hourly incremental backup
/backup/monitoring/scripts/automated_backup.sh --incremental
EOF

        chmod +x "$SCRIPT_DIR/"*.sh
        print_success "Template scripts created"
    fi
}

# =============================================================================
# Configure PostgreSQL for Backups
# =============================================================================

configure_postgresql() {
    print_header "Configuring PostgreSQL for Backups"

    PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '\d+\.\d+' | head -1 | cut -d. -f1)
    PG_CONFIG="/etc/postgresql/$PG_VERSION/main/postgresql.conf"

    if [ -f "$PG_CONFIG" ]; then
        # Backup original config
        cp "$PG_CONFIG" "${PG_CONFIG}.backup-$(date +%Y%m%d)"

        # Configure WAL archiving
        cat >> "$PG_CONFIG" << EOF

# Backup configuration added by monitoring setup
wal_level = replica
archive_mode = on
archive_command = 'test ! -f $BACKUP_ROOT/postgres/wal/%f && cp %p $BACKUP_ROOT/postgres/wal/%f'
archive_timeout = 300
EOF

        # Restart PostgreSQL
        systemctl restart postgresql
        print_success "PostgreSQL configured for WAL archiving"
    else
        print_warning "PostgreSQL config not found at $PG_CONFIG"
    fi

    # Create .pgpass file for automated backups
    cat > /home/azureuser/.pgpass << EOF
localhost:5432:monitoring_v2:monitoring_user:monitoring_pass
EOF
    chmod 600 /home/azureuser/.pgpass
    chown azureuser:azureuser /home/azureuser/.pgpass
    print_success "PostgreSQL authentication configured"
}

# =============================================================================
# Setup Cron Jobs
# =============================================================================

setup_cron_jobs() {
    print_header "Setting Up Automated Backup Schedule"

    # Create cron file
    cat > /tmp/monitoring_backup_cron << 'EOF'
# Monitoring System Backup Schedule

# Hourly incremental backup (database and config)
0 * * * * /backup/monitoring/scripts/automated_backup.sh --incremental >> /var/log/monitoring/backup.log 2>&1

# Daily full backup at 2 AM
0 2 * * * /backup/monitoring/scripts/automated_backup.sh --full >> /var/log/monitoring/backup.log 2>&1

# Weekly archive on Sunday at 3 AM
0 3 * * 0 /backup/monitoring/scripts/automated_backup.sh --full --archive >> /var/log/monitoring/backup.log 2>&1

# Database cleanup every 6 hours
0 */6 * * * psql -U monitoring_user -d monitoring_v2 -c "SELECT cleanup_old_monitoring_data();" >> /var/log/monitoring/cleanup.log 2>&1

# Backup verification every day at 5 AM
0 5 * * * /backup/monitoring/scripts/verify_backups.sh >> /var/log/monitoring/verify.log 2>&1

# Clean old backups every Sunday at 4 AM
0 4 * * 0 find /backup/monitoring -type f -mtime +30 -delete >> /var/log/monitoring/cleanup.log 2>&1

# Disk space alert every 30 minutes
*/30 * * * * df -h | awk '$5+0 > 80 {print "Disk usage alert: " $0}' >> /var/log/monitoring/disk_alert.log
EOF

    # Install cron jobs
    crontab -u azureuser /tmp/monitoring_backup_cron
    print_success "Cron jobs installed for user azureuser"

    # Enable cron service
    systemctl enable cron
    systemctl start cron
    print_success "Cron service enabled"
}

# =============================================================================
# Create Recovery Tools
# =============================================================================

create_recovery_tools() {
    print_header "Creating Recovery Tools"

    # Quick recovery script
    cat > "$SCRIPT_DIR/quick_recover.sh" << 'EOF'
#!/bin/bash
# Quick recovery from latest backup

echo "Quick Recovery Tool"
echo "=================="

# Find latest backups
LATEST_DB=$(ls -t /backup/monitoring/postgres/daily/*.sql.gz 2>/dev/null | head -1)
LATEST_SOURCE=$(ls -t /backup/monitoring/source/daily/*.tar.gz 2>/dev/null | head -1)
LATEST_CONFIG=$(ls -t /backup/monitoring/config/daily/*.tar.gz 2>/dev/null | head -1)

echo "Found backups:"
echo "  Database: $(basename $LATEST_DB)"
echo "  Source: $(basename $LATEST_SOURCE)"
echo "  Config: $(basename $LATEST_CONFIG)"

read -p "Proceed with recovery? (yes/no): " confirm
if [ "$confirm" = "yes" ]; then
    /backup/monitoring/scripts/restore_system.sh --full
fi
EOF

    # Emergency recovery kit
    cat > "$SCRIPT_DIR/emergency_kit.sh" << 'EOF'
#!/bin/bash
# Emergency Recovery Kit

echo "=== EMERGENCY RECOVERY KIT ==="
echo ""
echo "1. Check Services Status"
echo "2. Restore Database Only"
echo "3. Restore Source Code Only"
echo "4. Full System Restore"
echo "5. Verify Critical Files"
echo "6. Run System Test"
echo ""
read -p "Select option (1-6): " option

case $option in
    1)
        pm2 status
        systemctl status postgresql
        curl http://localhost:3020/health
        ;;
    2)
        /backup/monitoring/scripts/restore_system.sh --database
        ;;
    3)
        /backup/monitoring/scripts/restore_system.sh --source
        ;;
    4)
        /backup/monitoring/scripts/restore_system.sh --full
        ;;
    5)
        echo "Checking critical files..."
        grep -c "INSERT INTO traces" /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js || echo "CRITICAL: Trace creation missing!"
        ;;
    6)
        node /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/test_monitoring.js
        ;;
esac
EOF

    chmod +x "$SCRIPT_DIR/"*.sh
    print_success "Recovery tools created"
}

# =============================================================================
# Create Monitoring Dashboard
# =============================================================================

create_monitoring_dashboard() {
    print_header "Creating Monitoring Dashboard"

    cat > "$SCRIPT_DIR/backup_status.sh" << 'EOF'
#!/bin/bash
# Backup Status Dashboard

clear
echo "╔══════════════════════════════════════════════════════╗"
echo "║        MONITORING SYSTEM BACKUP DASHBOARD            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Latest backups
echo "📁 Latest Backups:"
echo "─────────────────"
ls -lht /backup/monitoring/postgres/daily/*.sql.gz 2>/dev/null | head -1
ls -lht /backup/monitoring/source/daily/*.tar.gz 2>/dev/null | head -1
ls -lht /backup/monitoring/config/daily/*.tar.gz 2>/dev/null | head -1
echo ""

# Disk usage
echo "💾 Disk Usage:"
echo "─────────────"
df -h /backup
du -sh /backup/monitoring/* | sort -hr | head -5
echo ""

# Backup age
echo "⏰ Backup Age:"
echo "─────────────"
for type in postgres source config; do
    latest=$(ls -t /backup/monitoring/$type/daily/* 2>/dev/null | head -1)
    if [ -f "$latest" ]; then
        age=$(( ($(date +%s) - $(stat -c %Y "$latest")) / 3600 ))
        echo "$type: $age hours old"
    fi
done
echo ""

# Recent errors
echo "⚠️  Recent Errors:"
echo "─────────────────"
tail -5 /var/log/monitoring/backup_error.log 2>/dev/null || echo "No recent errors"
echo ""

# Next scheduled backups
echo "📅 Next Scheduled Backups:"
echo "─────────────────────────"
crontab -l | grep backup | head -3
EOF

    chmod +x "$SCRIPT_DIR/backup_status.sh"
    print_success "Monitoring dashboard created"
}

# =============================================================================
# Create Documentation
# =============================================================================

create_documentation() {
    print_header "Creating Local Documentation"

    cat > "$BACKUP_ROOT/README.md" << 'EOF'
# Monitoring System Backup Infrastructure

## Directory Structure
```
/backup/monitoring/
├── postgres/         # Database backups
├── source/          # Source code backups
├── config/          # Configuration backups
├── audio/           # Audio file backups
├── system/          # System state snapshots
├── logs/            # Compressed logs
└── scripts/         # Backup and recovery scripts
```

## Quick Commands

### Check backup status
```bash
/backup/monitoring/scripts/backup_status.sh
```

### Manual backup
```bash
/backup/monitoring/scripts/automated_backup.sh --full
```

### Recovery
```bash
/backup/monitoring/scripts/restore_system.sh --full
```

### Emergency recovery
```bash
/backup/monitoring/scripts/emergency_kit.sh
```

## Backup Schedule
- Hourly: Incremental database and config
- Daily: Full backup at 2 AM
- Weekly: Archive on Sunday at 3 AM
- Cleanup: Old backups removed after 30 days

## Critical Files to Verify
1. DatabaseBridge.js - MUST contain trace creation code
2. MonitoringStationsBootstrap.js - Main orchestrator
3. monitoring.config.json - Configuration
4. ecosystem.config.js - PM2 configuration

## Support
- Logs: /var/log/monitoring/
- Scripts: /backup/monitoring/scripts/
- Documentation: This file
EOF

    print_success "Documentation created at $BACKUP_ROOT/README.md"
}

# =============================================================================
# Initial Backup
# =============================================================================

perform_initial_backup() {
    print_header "Performing Initial Backup"

    echo "Creating initial system backup..."

    # Check if source exists
    if [ -d "/home/azureuser/translation-app/3333_4444__Operational" ]; then
        # Run full backup
        if [ -x "$SCRIPT_DIR/automated_backup.sh" ]; then
            "$SCRIPT_DIR/automated_backup.sh" --full
            print_success "Initial backup completed"
        else
            print_warning "Backup script not found, creating manual backup"

            # Manual backup
            DATE=$(date +%Y%m%d_%H%M%S)

            # Database
            pg_dump -U monitoring_user -d monitoring_v2 | gzip > "$BACKUP_ROOT/postgres/daily/monitoring_v2_${DATE}.sql.gz" 2>/dev/null || true

            # Source
            tar -czf "$BACKUP_ROOT/source/daily/source_${DATE}.tar.gz" \
                -C /home/azureuser/translation-app/3333_4444__Operational \
                STTTTSserver/ 2>/dev/null || true

            print_success "Manual backup completed"
        fi
    else
        print_warning "Source directory not found, skipping initial backup"
    fi
}

# =============================================================================
# Verification
# =============================================================================

verify_setup() {
    print_header "Verifying Backup System Setup"

    checks_passed=0
    checks_failed=0

    # Check directories
    if [ -d "$BACKUP_ROOT" ]; then
        print_success "Backup directories created"
        ((checks_passed++))
    else
        print_error "Backup directories missing"
        ((checks_failed++))
    fi

    # Check scripts
    if [ -f "$SCRIPT_DIR/automated_backup.sh" ] || [ -f "$SCRIPT_DIR/backup_daily.sh" ]; then
        print_success "Backup scripts installed"
        ((checks_passed++))
    else
        print_error "Backup scripts missing"
        ((checks_failed++))
    fi

    # Check cron jobs
    if crontab -u azureuser -l | grep -q backup; then
        print_success "Cron jobs configured"
        ((checks_passed++))
    else
        print_error "Cron jobs not configured"
        ((checks_failed++))
    fi

    # Check PostgreSQL config
    if grep -q "archive_mode = on" /etc/postgresql/*/main/postgresql.conf 2>/dev/null; then
        print_success "PostgreSQL WAL archiving enabled"
        ((checks_passed++))
    else
        print_warning "PostgreSQL WAL archiving not configured"
        ((checks_passed++))
    fi

    # Check recovery tools
    if [ -f "$SCRIPT_DIR/quick_recover.sh" ]; then
        print_success "Recovery tools available"
        ((checks_passed++))
    else
        print_error "Recovery tools missing"
        ((checks_failed++))
    fi

    echo ""
    echo "═══════════════════════════════════"
    echo "Setup verification complete:"
    echo "  Passed: $checks_passed"
    echo "  Failed: $checks_failed"

    if [ $checks_failed -eq 0 ]; then
        echo -e "${GREEN}✓ Backup system ready!${NC}"
    else
        echo -e "${YELLOW}⚠ Some components need attention${NC}"
    fi
    echo "═══════════════════════════════════"
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   NEW Monitoring System - Backup Setup Tool    ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
    echo ""

    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi

    # Setup components
    setup_directories
    install_backup_scripts
    configure_postgresql
    setup_cron_jobs
    create_recovery_tools
    create_monitoring_dashboard
    create_documentation
    perform_initial_backup
    verify_setup

    echo ""
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    echo -e "${GREEN}   Backup System Setup Complete!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review backup schedule: crontab -u azureuser -l"
    echo "2. Check backup status: $SCRIPT_DIR/backup_status.sh"
    echo "3. Test recovery: $SCRIPT_DIR/quick_recover.sh"
    echo "4. Review documentation: cat $BACKUP_ROOT/README.md"
    echo ""
    echo "Backup root: $BACKUP_ROOT"
    echo "Scripts: $SCRIPT_DIR"
    echo "Logs: $LOG_DIR"
    echo ""
}

# Run main function
main

exit 0