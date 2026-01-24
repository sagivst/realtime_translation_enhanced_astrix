#!/bin/bash

# VERIFY_DEPLOYMENT.sh
# Purpose: Verify which STTTSserver.js is running and if monitoring is active
# Date: January 16, 2026

echo "=========================================="
echo "Verification: STTTSserver.js Status Check"
echo "=========================================="

VM_USER="azureuser"
VM_IP="20.170.155.53"

echo ""
echo "1. Current PM2 Process Info:"
echo "============================"
ssh $VM_USER@$VM_IP "pm2 info STTTTSserver | grep -E '(status|script path|uptime|restarts)'"

echo ""
echo "2. File Being Executed:"
echo "======================"
ssh $VM_USER@$VM_IP "pm2 info STTTTSserver | grep 'script path' | sed 's/.*script path.*│ //'"

echo ""
echo "3. File Size Check:"
echo "=================="
SCRIPT_PATH=$(ssh $VM_USER@$VM_IP "pm2 info STTTTSserver | grep 'script path' | sed 's/.*script path.*│ //' | tr -d ' '")
ssh $VM_USER@$VM_IP "ls -la $SCRIPT_PATH 2>/dev/null"

echo ""
echo "4. Monitoring Integration Check:"
echo "=============================="
ssh $VM_USER@$VM_IP "grep -c 'initializeNewMonitoring' $SCRIPT_PATH 2>/dev/null && echo 'GOOD: Monitoring integration found' || echo 'BAD: No monitoring integration'"

echo ""
echo "5. Recent Monitoring Logs:"
echo "========================="
ssh $VM_USER@$VM_IP "pm2 logs STTTTSserver --nostream --lines 30 | grep -E '(Monitoring Framework|MonitoringStations|metrics computed)'"

echo ""
echo "6. Database Metrics (Last 5 minutes):"
echo "====================================="
ssh $VM_USER@$VM_IP "psql -U postgres -d monitoring_v2 -c 'SELECT station_id, COUNT(*) as metric_count, MAX(bucket_time) as latest FROM metrics_agg_5s WHERE bucket_time > NOW() - INTERVAL '\''5 minutes'\'' GROUP BY station_id;'"

echo ""
echo "7. Process Memory & CPU:"
echo "======================="
ssh $VM_USER@$VM_IP "pm2 monit STTTTSserver --lines 1 | grep -E '(memory|cpu)'"

echo ""
echo "=========================================="
echo "Summary:"
echo "=========================================="
FILE_SIZE=$(ssh $VM_USER@$VM_IP "stat -c%s $SCRIPT_PATH 2>/dev/null")
if [ "$FILE_SIZE" -gt "100000" ]; then
    echo "✓ CORRECT VERSION: Running full STTTSserver.js ($FILE_SIZE bytes)"
    echo "✓ Monitoring should be active"
else
    echo "✗ WRONG VERSION: Running minimal STTTSserver.js ($FILE_SIZE bytes)"
    echo "✗ No monitoring integration"
    echo ""
    echo "To fix: Run FIX_DEPLOYMENT_SCRIPT.sh"
fi
echo "=========================================="