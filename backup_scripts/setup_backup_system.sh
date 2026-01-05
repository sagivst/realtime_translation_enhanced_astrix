#!/bin/bash
# Setup script for comprehensive backup system
# Run this on Azure VM (20.170.155.53) as azureuser

set -e

echo "==================================="
echo "Backup System Setup Script"
echo "==================================="

# Create directory structure
echo "Creating backup directories..."
sudo mkdir -p /backup/{databases,translation-app,monitoring-audio,configs,dependencies,metrics,compliance}
sudo mkdir -p /home/azureuser/backup_scripts
sudo mkdir -p /var/log/backup
sudo chown -R azureuser:azureuser /backup
sudo chown azureuser:azureuser /var/log/backup

# Create backup paths configuration
echo "Creating dynamic backup configuration..."
cat > /home/azureuser/backup_scripts/backup_paths.conf <<'EOF'
# Backup Paths Configuration
# Auto-discovered paths will be added below
/home/azureuser/translation-app/STTTTSserver
/home/azureuser/translation-app/3333_4444__Operational
/home/azureuser/translation-app/monitoring-server
/home/azureuser/translation-app/database-api-server
/home/azureuser/translation-app/asterisk-configs
/var/monitoring/audio
/var/monitoring/logs
EOF

# Set permissions
chmod 755 /home/azureuser/backup_scripts
chmod 644 /home/azureuser/backup_scripts/backup_paths.conf

echo "==================================="
echo "Setup complete!"
echo "Next steps:"
echo "1. Copy individual backup scripts to /home/azureuser/backup_scripts/"
echo "2. Make scripts executable: chmod +x /home/azureuser/backup_scripts/*.sh"
echo "3. Configure cron jobs: sudo crontab -e (as azureuser)"
echo "4. Test backup scripts manually"
echo "==================================="