#!/bin/bash
# PCM Fix Deployment Script
# Deploys the fixed STTTTSserver.js with proper PCM packet timing

echo "============================================="
echo "PCM FIX DEPLOYMENT - Gateway/STTTTSServer Integration"
echo "============================================="
echo ""

# Configuration
REMOTE_HOST="azureuser@20.170.155.53"
LOCAL_PATH="/Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational"
REMOTE_PATH="/home/azureuser/translation-app/3333_4444__Operational"

echo "Step 1: Creating remote backup..."
ssh $REMOTE_HOST << 'EOF'
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
BACKUP_NAME="STTTTSserver.js.pcm-fix-backup-$(date +%Y%m%d-%H%M%S)"
cp STTTTSserver.js $BACKUP_NAME
echo "✓ Backup created: $BACKUP_NAME"
EOF

echo ""
echo "Step 2: Deploying fixed STTTTSserver.js..."
scp $LOCAL_PATH/STTTTSserver/STTTTSserver.js $REMOTE_HOST:$REMOTE_PATH/STTTTSserver/

echo ""
echo "Step 3: Stopping existing processes..."
ssh $REMOTE_HOST << 'EOF'
# Kill existing STTTTSserver
pkill -f STTTTSserver.js
sleep 2

# Kill gateways
pkill -f gateway-3333-buffered.js
pkill -f gateway-4444-buffered.js
sleep 2

echo "✓ Processes stopped"
EOF

echo ""
echo "Step 4: Starting STTTTSserver with PCM fix..."
ssh $REMOTE_HOST << 'EOF'
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver

# Syntax check
if node --check STTTTSserver.js; then
    echo "✓ Syntax check passed"
else
    echo "✗ Syntax error - aborting"
    exit 1
fi

# Start server
nohup node STTTTSserver.js > /tmp/sttttserver-pcm-fix.log 2>&1 &
sleep 5

# Verify it started
if pgrep -f STTTTSserver.js > /dev/null; then
    echo "✓ STTTTSserver started successfully"
else
    echo "✗ STTTTSserver failed to start"
    tail -50 /tmp/sttttserver-pcm-fix.log
    exit 1
fi

# Check UDP ports
echo ""
echo "UDP Ports status:"
ss -ulnp | grep -E '612[0-3]' || echo "⚠️ UDP ports not yet listening"

# Show initial logs
echo ""
echo "Initial server output:"
tail -30 /tmp/sttttserver-pcm-fix.log | grep -E "UDP PCM|Listening|Ready"
EOF

echo ""
echo "Step 5: Starting Gateways..."
ssh $REMOTE_HOST << 'EOF'
cd /home/azureuser/translation-app/3333_4444__Operational/Gateway

# Start gateway-3333
nohup node gateway-3333-buffered.js > /tmp/gateway-3333-pcm-fix.log 2>&1 &
echo "✓ Gateway-3333 started"

# Start gateway-4444
nohup node gateway-4444-buffered.js > /tmp/gateway-4444-pcm-fix.log 2>&1 &
echo "✓ Gateway-4444 started"

sleep 3

# Verify gateways
if pgrep -f gateway-3333-buffered.js > /dev/null && pgrep -f gateway-4444-buffered.js > /dev/null; then
    echo "✓ Both gateways running"
else
    echo "⚠️ Gateway startup issue"
fi
EOF

echo ""
echo "Step 6: Monitoring initial PCM packets..."
ssh $REMOTE_HOST << 'EOF'
echo "Waiting for first PCM packets (10 seconds)..."
timeout 10 tail -f /tmp/sttttserver-pcm-fix.log | grep -E "UDP-3333|UDP-4444|PCM sample check|Gateway connected" || true

echo ""
echo "Gateway 3333 status:"
tail -5 /tmp/gateway-3333-pcm-fix.log | grep -E "Stripping RTP|bytes PCM|Gateway-3333" || echo "No recent activity"

echo ""
echo "Gateway 4444 status:"
tail -5 /tmp/gateway-4444-pcm-fix.log | grep -E "Stripping RTP|bytes PCM|Gateway-4444" || echo "No recent activity"
EOF

echo ""
echo "============================================="
echo "DEPLOYMENT COMPLETE"
echo "============================================="
echo ""
echo "TEST INSTRUCTIONS:"
echo "1. Call extension 3333"
echo "2. Speak clearly in English"
echo "3. Listen on extension 4444 for French translation"
echo ""
echo "MONITORING COMMANDS:"
echo "  Live logs: ssh $REMOTE_HOST 'tail -f /tmp/sttttserver-pcm-fix.log | grep -E \"UDP-|Transcribed|Translated|PCM sample\"'"
echo "  Stats: ssh $REMOTE_HOST 'tail -f /tmp/sttttserver-pcm-fix.log | grep \"UDP PCM STATS\"'"
echo ""
echo "ROLLBACK IF NEEDED:"
echo "  ssh $REMOTE_HOST 'cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && pkill -f STTTTSserver.js && cp STTTTSserver.js.pcm-fix-backup-* STTTTSserver.js && nohup node STTTTSserver.js > /tmp/sttttserver.log 2>&1 &'"
echo ""