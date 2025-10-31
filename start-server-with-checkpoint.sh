#!/bin/bash
# Start Server with Automatic Checkpoint - DEV VM (20.170.155.53)

APP_DIR="/home/azureuser/translation-app"

echo "================================================"
echo "🚀 Starting Translation Server with Checkpoint"
echo "================================================"
echo "DEV VM: 20.170.155.53 (asterisk-dev-vm-clone)"
echo "Time: $(date)"
echo ""

# Step 1: Create checkpoint before starting
echo "📦 Creating automatic checkpoint..."
bash "$APP_DIR/create-checkpoint.sh"

# Step 2: Stop any existing server
echo ""
echo "🛑 Stopping existing server instances..."
killall -9 node 2>/dev/null && echo "  ✓ Stopped existing server" || echo "  ℹ  No server running"
sleep 2

# Step 3: Start the server
echo ""
echo "🚀 Starting conference server..."
cd "$APP_DIR"
nohup node conference-server.js > /tmp/conference-server.log 2>&1 &
SERVER_PID=$!

# Step 4: Wait and verify
sleep 3
if pgrep -f "node conference-server" > /dev/null; then
    echo ""
    echo "================================================"
    echo "✅ Server Started Successfully"
    echo "================================================"
    echo "  PID: $(pgrep -f 'node conference-server')"
    echo "  Log: tail -f /tmp/conference-server.log"
    echo ""
    echo "📊 Access Points:"
    echo "  Dashboard: http://20.170.155.53:3000/dashboard.html"
    echo "  Dashboard Room 2: http://20.170.155.53:3000/dashboard-room2.html"
    echo ""
    echo "🎯 SIP Extensions:"
    echo "  Extension 7000 → AudioSocket port 5050"
    echo "  Extension 7001 → AudioSocket port 5052"
    echo ""
else
    echo ""
    echo "❌ Server failed to start!"
    echo "Check logs: tail -f /tmp/conference-server.log"
    exit 1
fi
