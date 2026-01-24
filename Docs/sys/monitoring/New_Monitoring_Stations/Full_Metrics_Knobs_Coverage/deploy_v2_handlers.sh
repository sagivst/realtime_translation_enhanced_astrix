#!/bin/bash
# Deploy V2 Station Handlers with State Management to VM
# Purpose: Deploy Station3_3333_Handler_v2.js and Station3_4444_Handler_v2.js
# Target: Azure VM 20.170.155.53

set -e

echo "============================================="
echo "Deploying V2 Station Handlers with State Management"
echo "============================================="
echo ""

VM_IP="20.170.155.53"
VM_USER="azureuser"
REMOTE_PATH="/home/azureuser/TLP_monitoring/station-managers/monitoring_stations"

echo "📋 Deployment Summary:"
echo "  - Target VM: $VM_IP"
echo "  - Remote Path: $REMOTE_PATH"
echo "  - Files to deploy:"
echo "    • Station3_3333_Handler.js (v2 with state management)"
echo "    • Station3_4444_Handler.js (v2 with state management)"
echo ""

# Step 1: Deploy Station3_3333_Handler_v2.js
echo "📦 [1/3] Deploying Station3_3333_Handler_v2.js..."
scp Station3_3333_Handler_v2.js ${VM_USER}@${VM_IP}:${REMOTE_PATH}/Station3_3333_Handler.js
if [ $? -eq 0 ]; then
    echo "   ✅ Station3_3333_Handler.js deployed successfully"
else
    echo "   ❌ Failed to deploy Station3_3333_Handler.js"
    exit 1
fi

# Step 2: Deploy Station3_4444_Handler_v2.js
echo "📦 [2/3] Deploying Station3_4444_Handler_v2.js..."
scp Station3_4444_Handler_v2.js ${VM_USER}@${VM_IP}:${REMOTE_PATH}/Station3_4444_Handler.js
if [ $? -eq 0 ]; then
    echo "   ✅ Station3_4444_Handler.js deployed successfully"
else
    echo "   ❌ Failed to deploy Station3_4444_Handler.js"
    exit 1
fi

# Step 3: Restart STTTTSserver
echo "🔄 [3/3] Restarting STTTTSserver via PM2..."
ssh ${VM_USER}@${VM_IP} << 'EOF'
    cd /home/azureuser/TLP_monitoring
    pm2 restart STTTTSserver
    sleep 2
    pm2 status STTTTSserver
EOF

echo ""
echo "============================================="
echo "✨ V2 Handlers Deployment Complete!"
echo "============================================="
echo ""
echo "📊 Key improvements in V2 handlers:"
echo "  • Complete state management for metric persistence"
echo "  • Support for all 82 PCM metrics"
echo "  • Persistent buffers for LUFS calculations"
echo "  • Session tracking and counters"
echo "  • Automatic state updates after frame processing"
echo ""
echo "🧪 To test the deployment:"
echo "  1. Make a test call to extensions 3333 or 4444"
echo "  2. Check metrics in the database:"
echo "     SELECT DISTINCT metric_name FROM metrics_agg_5s"
echo "     WHERE station_key IN ('St_3_3333', 'St_3_4444')"
echo "     AND timestamp > NOW() - INTERVAL '5 minutes'"
echo "     ORDER BY metric_name;"
echo ""
echo "📈 Expected: All 82 metrics should now be collected!"
echo ""