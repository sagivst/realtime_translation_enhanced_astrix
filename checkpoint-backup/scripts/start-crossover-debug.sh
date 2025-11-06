#!/bin/bash
# Start Crossover Debug Mode - Routes audio between 7777 and 8888

cd /home/azureuser/translation-app

echo "🔀 Starting Crossover Debug Mode"
echo ""

# Stop existing handler
pkill -f "node ari-externalmedia-handler.js"
sleep 1

# Start in crossover mode
CROSSOVER_DEBUG=true nohup node ari-externalmedia-handler.js > ari-handler-crossover.log 2>&1 &
PID=$!

sleep 2

echo "✅ Crossover mode started (PID: $PID)"
echo ""
echo "Audio routing:"
echo "  Extension 7777 ↔ Extension 8888"
echo ""
echo "Test procedure:"
echo "  1. Call 7777 from phone A"
echo "  2. Call 8888 from phone B"
echo "  3. Speak on phone A → Hear on phone B"
echo "  4. Speak on phone B → Hear on phone A"
echo ""
echo "Monitor: tail -f ari-handler-crossover.log"
echo "Stop: bash stop-crossover-debug.sh"
echo ""
