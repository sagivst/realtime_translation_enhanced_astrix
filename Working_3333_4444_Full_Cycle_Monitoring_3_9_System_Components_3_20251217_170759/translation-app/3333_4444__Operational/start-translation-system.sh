#!/bin/bash
#############################################################################
# 3333/4444 Translation System - Startup Script
#
# This script starts all required services for the GStreamer-based
# real-time translation system in the correct order.
#
# Services started:
#   1. STTTTSserver (translation engine)
#   2. Gateway-3333 (audio bridge for extension 3333)
#   3. Gateway-4444 (audio bridge for extension 4444)
#   4. ARI Handler (Asterisk integration)
#
# Usage: ./start-translation-system.sh
#############################################################################

BASE_DIR="/home/azureuser/translation-app/3333_4444__Operational"
LOG_DIR="/tmp"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "============================================================"
echo "  3333/4444 Translation System - Starting Services"
echo "============================================================"
echo ""

# Function to check if process is running
check_process() {
    local process_name=$1
    if ps aux | grep -v grep | grep "$process_name" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to wait for process to start
wait_for_process() {
    local process_name=$1
    local max_wait=10
    local count=0

    while [ $count -lt $max_wait ]; do
        if check_process "$process_name"; then
            echo -e "${GREEN}✓${NC} $process_name started successfully"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done

    echo -e "${RED}✗${NC} $process_name failed to start"
    return 1
}

# Kill any existing processes
echo -e "${YELLOW}[Step 1]${NC} Stopping any existing processes..."
killall -9 node 2>/dev/null
sleep 2
echo -e "${GREEN}✓${NC} Existing processes stopped"
echo ""

# Start STTTTSserver
echo -e "${YELLOW}[Step 2]${NC} Starting STTTTSserver..."
cd "$BASE_DIR/STTTTSserver"
nohup node STTTTSserver.js > "$LOG_DIR/STTTTSserver-operational.log" 2>&1 &
wait_for_process "STTTTSserver.js"
sleep 2
echo ""

# Start Gateway-3333
echo -e "${YELLOW}[Step 3]${NC} Starting Gateway-3333..."
cd "$BASE_DIR"
nohup node gateway-3333.js > "$LOG_DIR/gateway-3333-operational.log" 2>&1 &
wait_for_process "gateway-3333.js"
sleep 1
echo ""

# Start Gateway-4444
echo -e "${YELLOW}[Step 4]${NC} Starting Gateway-4444..."
cd "$BASE_DIR"
nohup node gateway-4444.js > "$LOG_DIR/gateway-4444-operational.log" 2>&1 &
wait_for_process "gateway-4444.js"
sleep 1
echo ""

# Start ARI Handler
echo -e "${YELLOW}[Step 5]${NC} Starting ARI Handler..."
cd "$BASE_DIR"
nohup node ari-gstreamer-operational.js > "$LOG_DIR/ari-gstreamer-operational.log" 2>&1 &
wait_for_process "ari-gstreamer-operational.js"
echo ""

# Verify all services
echo "============================================================"
echo "  Service Status Check"
echo "============================================================"
echo ""

ALL_RUNNING=true

if check_process "STTTTSserver.js"; then
    echo -e "${GREEN}✓${NC} STTTTSserver.js      [RUNNING]"
else
    echo -e "${RED}✗${NC} STTTTSserver.js      [STOPPED]"
    ALL_RUNNING=false
fi

if check_process "gateway-3333.js"; then
    echo -e "${GREEN}✓${NC} gateway-3333.js      [RUNNING]"
else
    echo -e "${RED}✗${NC} gateway-3333.js      [STOPPED]"
    ALL_RUNNING=false
fi

if check_process "gateway-4444.js"; then
    echo -e "${GREEN}✓${NC} gateway-4444.js      [RUNNING]"
else
    echo -e "${RED}✗${NC} gateway-4444.js      [STOPPED]"
    ALL_RUNNING=false
fi

if check_process "ari-gstreamer-operational.js"; then
    echo -e "${GREEN}✓${NC} ari-gstreamer-operational.js  [RUNNING]"
else
    echo -e "${RED}✗${NC} ari-gstreamer-operational.js  [STOPPED]"
    ALL_RUNNING=false
fi

echo ""
echo "============================================================"
echo "  UDP Ports Status"
echo "============================================================"
echo ""

ss -tuln | grep -E '4000|4002|6120|6121|6122|6123' | while read line; do
    echo "  $line"
done

echo ""
echo "============================================================"
echo "  Log Files"
echo "============================================================"
echo ""
echo "  STTTTSserver: tail -f $LOG_DIR/STTTTSserver-operational.log"
echo "  Gateway-3333: tail -f $LOG_DIR/gateway-3333-operational.log"
echo "  Gateway-4444: tail -f $LOG_DIR/gateway-4444-operational.log"
echo "  ARI Handler:  tail -f $LOG_DIR/ari-gstreamer-operational.log"
echo ""

if [ "$ALL_RUNNING" = true ]; then
    echo -e "${GREEN}✓ All services started successfully!${NC}"
    echo ""
    echo "Dashboard: http://localhost:3020/dashboard.html"
    exit 0
else
    echo -e "${RED}✗ Some services failed to start. Check logs for details.${NC}"
    exit 1
fi
