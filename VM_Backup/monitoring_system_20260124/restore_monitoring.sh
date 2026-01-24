#!/bin/bash
echo "==================================="
echo "Monitoring System Restore Script"
echo "==================================="
echo ""
echo "This script will restore the monitoring system from backup"
echo ""

# Check if running as correct user
if [ "$USER" != "azureuser" ]; then
    echo "ERROR: Run this script as azureuser"
    exit 1
fi

echo "Step 1: Stop current services"
pm2 stop all

echo "Step 2: Restore STTTTSserver files"
sudo tar -xzf STTTTSserver_full.tar.gz -C /home/azureuser/translation-app/3333_4444__Operational/

echo "Step 3: Restore environment files"
cp .env* /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/ 2>/dev/null

echo "Step 4: Restore database"
sudo -u postgres dropdb monitoring_v2 --if-exists
sudo -u postgres createdb monitoring_v2
sudo -u postgres pg_restore -d monitoring_v2 monitoring_v2_full.dump

echo "Step 5: Restore PM2 processes"
pm2 delete all
pm2 resurrect pm2_dump.json

echo "Step 6: Save PM2 configuration"
pm2 save
pm2 startup systemd -u azureuser --hp /home/azureuser

echo ""
echo "Restoration complete!"
echo "Check status with: pm2 list"
