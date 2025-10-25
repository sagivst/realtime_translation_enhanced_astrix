#!/bin/bash
cd /home/azureuser/translation-app
echo "Stopping existing server..."
killall -9 node 2>/dev/null || true
sleep 2
echo ""
echo "Creating checkpoint..."
./create-checkpoint.sh
echo ""
echo "Starting server..."
node conference-server.js > /tmp/conference-server.log 2>&1 &
SERVER_PID=$!
sleep 5
if ps -p $SERVER_PID > /dev/null; then
    echo "Server started (PID: $SERVER_PID)"
    echo "Dashboard: http://4.185.84.26:3000/dashboard.html"
else
    echo "Server failed to start - check /tmp/conference-server.log"
    exit 1
fi
