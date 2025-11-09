#!/bin/bash
# Stop Crossover Debug Mode and return to normal mode

cd /home/azureuser/translation-app

echo "Stopping crossover debug mode..."
pkill -f "node ari-externalmedia-handler.js"
sleep 1

echo "Starting normal mode..."
nohup node ari-externalmedia-handler.js > ari-handler.log 2>&1 &
PID=$!

sleep 2

echo "✅ Normal mode restored (PID: $PID)"
echo "Extensions 7777/8888 ready for translation integration"
echo ""
