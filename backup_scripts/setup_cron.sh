#!/bin/bash
# Setup Cron Jobs for Automated Backups

echo "==================================="
echo "Setting up Cron Jobs for Backups"
echo "==================================="

# Create cron file
CRON_FILE="/tmp/backup_cron_$$"

cat > ${CRON_FILE} <<'EOF'
# Backup Schedule for Translation & Monitoring System
# Edit this file to adjust backup frequency

# Environment variables
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
HOME=/home/azureuser

# Database backups - every 6 hours (00:30, 06:30, 12:30, 18:30)
30 */6 * * * /home/azureuser/backup_scripts/database_backup.sh >> /var/log/backup/cron.log 2>&1

# Application code backup - every 4 hours
0 */4 * * * /home/azureuser/backup_scripts/application_backup.sh >> /var/log/backup/cron.log 2>&1

# Monitoring data backup - twice daily (02:00 and 14:00)
0 2,14 * * * /home/azureuser/backup_scripts/monitoring_backup.sh >> /var/log/backup/cron.log 2>&1

# Master backup orchestration - daily at 03:00
0 3 * * * /home/azureuser/backup_scripts/master_backup.sh >> /var/log/backup/cron.log 2>&1

# Health check - every hour
0 * * * * /home/azureuser/backup_scripts/master_backup.sh --check >> /var/log/backup/health.log 2>&1

# Weekly report generation - Sundays at 00:00
0 0 * * 0 /home/azureuser/backup_scripts/master_backup.sh --report >> /var/log/backup/cron.log 2>&1

# Cleanup old logs - daily at 04:00
0 4 * * * find /var/log/backup -name "*.log" -mtime +30 -delete

# Quick incremental backup - every 30 minutes (optional - uncomment if needed)
# */30 * * * * /home/azureuser/backup_scripts/quick_backup.sh >> /var/log/backup/quick.log 2>&1

EOF

echo "Current crontab:"
crontab -l 2>/dev/null || echo "No existing crontab"

echo ""
echo "New cron jobs to be added:"
cat ${CRON_FILE}

echo ""
read -p "Do you want to install these cron jobs? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Backup existing crontab
    crontab -l > /home/azureuser/backup_scripts/crontab_backup_$(date +%Y%m%d_%H%M%S).txt 2>/dev/null || true

    # Install new crontab
    crontab ${CRON_FILE}

    if [ $? -eq 0 ]; then
        echo "✓ Cron jobs installed successfully"
        echo ""
        echo "Verify with: crontab -l"
        echo "Monitor logs: tail -f /var/log/backup/cron.log"
    else
        echo "✗ Failed to install cron jobs"
        exit 1
    fi
else
    echo "Installation cancelled"
fi

# Cleanup
rm -f ${CRON_FILE}

echo ""
echo "==================================="
echo "Additional Manual Steps:"
echo "==================================="
echo "1. Ensure log directory exists:"
echo "   sudo mkdir -p /var/log/backup"
echo "   sudo chown azureuser:azureuser /var/log/backup"
echo ""
echo "2. Configure log rotation:"
echo "   sudo tee /etc/logrotate.d/backup <<EOF"
echo "/var/log/backup/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 azureuser azureuser
}"
echo "EOF"
echo ""
echo "3. Test cron execution:"
echo "   Run one backup manually to ensure it works"
echo "   /home/azureuser/backup_scripts/database_backup.sh"
echo ""
echo "==================================="