#!/bin/bash

###############################################################################
# Station Audio Streaming Server - Stop Script
###############################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_FILE="${SCRIPT_DIR}/audio-server.pid"

print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

# Check if PID file exists
if [ ! -f "${PID_FILE}" ]; then
    print_warning "No PID file found. Server may not be running."
    exit 1
fi

# Read PID
PID=$(cat "${PID_FILE}")

# Check if process is running
if ! ps -p $PID > /dev/null 2>&1; then
    print_warning "Process ${PID} is not running"
    rm -f "${PID_FILE}"
    exit 1
fi

# Stop the server
print_info "Stopping audio streaming server (PID: ${PID})..."

kill $PID

# Wait for graceful shutdown
sleep 2

# Check if still running
if ps -p $PID > /dev/null 2>&1; then
    print_warning "Process did not stop gracefully, forcing shutdown..."
    kill -9 $PID
    sleep 1
fi

# Verify stopped
if ps -p $PID > /dev/null 2>&1; then
    print_error "Failed to stop process ${PID}"
    exit 1
else
    print_success "Audio streaming server stopped successfully"
    rm -f "${PID_FILE}"
fi

exit 0
