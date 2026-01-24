#!/bin/bash

# FIX_DEPLOYMENT_SCRIPT.sh
# Purpose: Deploy the correct STTTSserver.js with monitoring integration
# Date: January 16, 2026

echo "=========================================="
echo "FIX: Deploy Correct STTTSserver.js"
echo "=========================================="

# Configuration
VM_USER="azureuser"
VM_IP="20.170.155.53"
CORRECT_STTTTSERVER="/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js"
WRONG_STTTSERVER="/home/azureuser/translation-app/3333_4444__Operational/STTTSserver/STTTTSserver.js"

echo ""
echo "Step 1: Check current PM2 process"
echo "=================================="
ssh $VM_USER@$VM_IP "pm2 list"

echo ""
echo "Step 2: Check which file PM2 is running"
echo "========================================"
ssh $VM_USER@$VM_IP "pm2 info STTTTSserver | grep 'script path'"

echo ""
echo "Step 3: Compare file sizes"
echo "=========================="
ssh $VM_USER@$VM_IP "ls -la $WRONG_STTTSERVER 2>/dev/null | head -1"
ssh $VM_USER@$VM_IP "ls -la $CORRECT_STTTTSERVER 2>/dev/null | head -1"

echo ""
echo "Step 4: Check monitoring integration in files"
echo "=============================================="
echo "Checking WRONG file (3 T's):"
ssh $VM_USER@$VM_IP "grep -c 'MonitoringStations' $WRONG_STTTSERVER 2>/dev/null || echo 'No monitoring found'"
echo ""
echo "Checking CORRECT file (4 T's):"
ssh $VM_USER@$VM_IP "grep -c 'MonitoringStations' $CORRECT_STTTTSERVER 2>/dev/null || echo 'Count of monitoring references:'"

echo ""
echo "Step 5: Backup current PM2 configuration"
echo "========================================"
ssh $VM_USER@$VM_IP "pm2 save"

echo ""
echo "Step 6: Stop current STTTSserver"
echo "================================"
ssh $VM_USER@$VM_IP "pm2 stop STTTTSserver"

echo ""
echo "Step 7: Delete current PM2 process"
echo "=================================="
ssh $VM_USER@$VM_IP "pm2 delete STTTTSserver"

echo ""
echo "Step 8: Start with CORRECT STTTTSserver.js (4 T's)"
echo "==================================================="
ssh $VM_USER@$VM_IP "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && pm2 start STTTTSserver.js --name STTTTSserver"

echo ""
echo "Step 9: Save PM2 configuration"
echo "=============================="
ssh $VM_USER@$VM_IP "pm2 save"

echo ""
echo "Step 10: Check monitoring initialization"
echo "========================================"
echo "Waiting 5 seconds for initialization..."
sleep 5
ssh $VM_USER@$VM_IP "pm2 logs STTTTSserver --nostream --lines 50 | grep -E '(Monitoring|NEW Monitoring Framework)'"

echo ""
echo "Step 11: Check if metrics are being collected"
echo "============================================="
ssh $VM_USER@$VM_IP "psql -U postgres -d monitoring_v2 -c 'SELECT COUNT(*) as recent_metrics FROM metrics_agg_5s WHERE bucket_time > NOW() - INTERVAL '\''1 minute'\'';'"

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Make a test call to generate traffic"
echo "2. Check Adminer at http://20.170.155.53/adminer.php"
echo "3. Verify metrics in metrics_agg_5s table"
echo ""