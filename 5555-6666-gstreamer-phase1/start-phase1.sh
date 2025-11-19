#!/bin/bash
# Phase 1 Startup - Simple Cross-Patch (No AI Processing)
echo '==================================================================='
echo '  Phase 1 - Simple Cross-Patch Mode'
echo '  Extensions 5555 <-> 6666 (Direct Audio Pass-through)'
echo '==================================================================='

cd /home/azureuser/translation-app/5555-6666-gstreamer-phase1

# Kill any existing processes
echo 'Stopping existing processes...'
pkill -f 'conf-server-phase1.js|vtt-ttv-server.js|gateway-5555|gateway-6666|ari-gstreamer' 2>/dev/null
sleep 2

# Start Phase 1 server
echo 'Starting conf-server-phase1.js...'
nohup node conf-server-phase1.js > logs/phase1-server.log 2>&1 &
echo "  PID: $!"
sleep 2

# Start gateway-5555
echo 'Starting gateway-5555.js...'
nohup node gateway-5555.js > logs/gateway-5555.log 2>&1 &
echo "  PID: $!"
sleep 1

# Start gateway-6666 (original, not buffered)
echo 'Starting gateway-6666.js...'
nohup node gateway-6666.js > logs/gateway-6666.log 2>&1 &
echo "  PID: $!"
sleep 1

# Start ARI handler
echo 'Starting ari-gstreamer-phase1.js...'
nohup node ari-gstreamer-phase1.js > logs/ari-phase1.log 2>&1 &
echo "  PID: $!"
sleep 2

echo ''
echo '==================================================================='
echo '  Phase 1 Started - Simple Cross-Patch Mode'
echo '==================================================================='
echo ''
ps aux | grep -E 'conf-server-phase1|gateway-5555|gateway-6666|ari-gstreamer' | grep -v grep
echo ''
echo 'Monitoring: http://20.170.155.53:3010/'
echo ''
echo 'To test: Call 5555 and 6666, speak - audio should pass through directly'
