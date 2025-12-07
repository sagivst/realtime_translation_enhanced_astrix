#!/bin/bash

###############################################################################
# Station Audio Streaming Server - Startup Script
# Starts the integrated audio streaming server with comprehensive monitoring
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOG_DIR="${SCRIPT_DIR}/logs"
LOG_FILE="${LOG_DIR}/audio-server-$(date +%Y%m%d-%H%M%S).log"
PID_FILE="${SCRIPT_DIR}/audio-server.pid"

# Default configuration (can be overridden by environment variables)
export AUDIO_HTTP_PORT=${AUDIO_HTTP_PORT:-3030}
export RTP_PORTS=${RTP_PORTS:-"3333,4444"}
export CORS_ORIGIN=${CORS_ORIGIN:-"*"}
export ENABLE_MONITORING=${ENABLE_MONITORING:-true}
export MONITORING_INTERVAL=${MONITORING_INTERVAL:-1000}
export VERBOSE_LOGGING=${VERBOSE_LOGGING:-false}

###############################################################################
# Functions
###############################################################################

print_header() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║        Station Audio Streaming Server - Launcher            ║"
    echo "║                                                              ║"
    echo "║  Real-time RTP to PCM Audio Streaming & Visualization       ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

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

print_config() {
    echo -e "${CYAN}"
    echo "Configuration:"
    echo "  HTTP/WebSocket Port: ${AUDIO_HTTP_PORT}"
    echo "  RTP Ports: ${RTP_PORTS}"
    echo "  CORS Origin: ${CORS_ORIGIN}"
    echo "  Monitoring: ${ENABLE_MONITORING}"
    echo "  Monitoring Interval: ${MONITORING_INTERVAL}ms"
    echo "  Verbose Logging: ${VERBOSE_LOGGING}"
    echo "  Log File: ${LOG_FILE}"
    echo -e "${NC}"
}

check_dependencies() {
    print_info "Checking dependencies..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed!"
        exit 1
    fi
    NODE_VERSION=$(node --version)
    print_success "Node.js ${NODE_VERSION} found"

    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed!"
        exit 1
    fi
    NPM_VERSION=$(npm --version)
    print_success "npm ${NPM_VERSION} found"

    # Check if node_modules exists
    if [ ! -d "${SCRIPT_DIR}/node_modules" ]; then
        print_warning "Dependencies not installed. Installing now..."
        cd "${SCRIPT_DIR}"
        npm install
        if [ $? -eq 0 ]; then
            print_success "Dependencies installed successfully"
        else
            print_error "Failed to install dependencies"
            exit 1
        fi
    else
        print_success "Dependencies are installed"
    fi
}

check_ports() {
    print_info "Checking port availability..."

    # Check HTTP port
    if lsof -Pi :${AUDIO_HTTP_PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port ${AUDIO_HTTP_PORT} is already in use"
        read -p "Kill existing process? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            PID=$(lsof -ti:${AUDIO_HTTP_PORT})
            kill -9 $PID
            print_success "Killed process on port ${AUDIO_HTTP_PORT}"
        else
            print_error "Cannot start server, port is in use"
            exit 1
        fi
    else
        print_success "Port ${AUDIO_HTTP_PORT} is available"
    fi

    # Check RTP ports (UDP)
    IFS=',' read -ra PORTS <<< "$RTP_PORTS"
    for port in "${PORTS[@]}"; do
        port=$(echo $port | xargs) # trim whitespace
        if lsof -Pi :${port} -sUDP:LISTEN -t >/dev/null 2>&1; then
            print_warning "UDP port ${port} is already in use"
        else
            print_success "UDP port ${port} is available"
        fi
    done
}

create_log_dir() {
    if [ ! -d "${LOG_DIR}" ]; then
        mkdir -p "${LOG_DIR}"
        print_success "Created log directory: ${LOG_DIR}"
    fi
}

check_existing_process() {
    if [ -f "${PID_FILE}" ]; then
        PID=$(cat "${PID_FILE}")
        if ps -p $PID > /dev/null 2>&1; then
            print_warning "Audio server is already running (PID: ${PID})"
            read -p "Stop existing server and restart? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                kill $PID
                sleep 2
                if ps -p $PID > /dev/null 2>&1; then
                    kill -9 $PID
                fi
                rm -f "${PID_FILE}"
                print_success "Stopped existing server"
            else
                print_info "Keeping existing server running"
                exit 0
            fi
        else
            # PID file exists but process is not running
            rm -f "${PID_FILE}"
        fi
    fi
}

start_server() {
    print_info "Starting audio streaming server..."

    cd "${SCRIPT_DIR}"

    # Start the server in background
    nohup node integrated-audio-server.js >> "${LOG_FILE}" 2>&1 &
    SERVER_PID=$!

    # Save PID
    echo $SERVER_PID > "${PID_FILE}"

    # Wait a moment and check if it's still running
    sleep 2

    if ps -p $SERVER_PID > /dev/null; then
        print_success "Audio streaming server started successfully (PID: ${SERVER_PID})"
        return 0
    else
        print_error "Failed to start audio streaming server"
        print_error "Check log file: ${LOG_FILE}"
        rm -f "${PID_FILE}"
        return 1
    fi
}

print_urls() {
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Audio Streaming Server is now running!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${CYAN}🌐 Audio Player:${NC}"
    echo -e "     http://localhost:${AUDIO_HTTP_PORT}/audio-player-visualization.html"
    echo ""
    echo -e "  ${CYAN}📊 Health Check:${NC}"
    echo -e "     http://localhost:${AUDIO_HTTP_PORT}/health"
    echo ""
    echo -e "  ${CYAN}📡 Stream Status:${NC}"
    echo -e "     http://localhost:${AUDIO_HTTP_PORT}/api/streams"
    echo ""
    echo -e "  ${CYAN}📝 Logs:${NC}"
    echo -e "     tail -f ${LOG_FILE}"
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

show_test_commands() {
    echo -e "${CYAN}Test RTP Streaming:${NC}"
    echo ""
    echo "  1. Generate test tone (requires ffmpeg):"
    echo -e "     ${YELLOW}ffmpeg -re -f lavfi -i \"sine=frequency=440:duration=60\" \\${NC}"
    echo -e "     ${YELLOW}  -ar 48000 -ac 1 -acodec pcm_s16le -f rtp rtp://localhost:3333${NC}"
    echo ""
    echo "  2. Stream from microphone (requires gstreamer):"
    echo -e "     ${YELLOW}gst-launch-1.0 autoaudiosrc ! audioconvert ! audioresample ! \\${NC}"
    echo -e "     ${YELLOW}  audio/x-raw,rate=48000,channels=1 ! opusenc ! rtpopuspay ! \\${NC}"
    echo -e "     ${YELLOW}  udpsink host=localhost port=3333${NC}"
    echo ""
}

monitor_logs() {
    print_info "Monitoring logs (Ctrl+C to stop)..."
    echo ""
    tail -f "${LOG_FILE}"
}

###############################################################################
# Main Script
###############################################################################

main() {
    # Parse command line arguments
    MONITOR_LOGS=false
    SHOW_TESTS=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --monitor|-m)
                MONITOR_LOGS=true
                shift
                ;;
            --test|-t)
                SHOW_TESTS=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  -m, --monitor    Monitor logs after starting"
                echo "  -t, --test       Show test commands"
                echo "  -h, --help       Show this help message"
                echo ""
                echo "Environment Variables:"
                echo "  AUDIO_HTTP_PORT       HTTP/WebSocket port (default: 3030)"
                echo "  RTP_PORTS             Comma-separated RTP ports (default: 3333,4444)"
                echo "  CORS_ORIGIN           CORS origin (default: *)"
                echo "  ENABLE_MONITORING     Enable monitoring (default: true)"
                echo "  MONITORING_INTERVAL   Monitoring interval in ms (default: 1000)"
                echo "  VERBOSE_LOGGING       Enable verbose logging (default: false)"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done

    # Display header
    print_header

    # Show configuration
    print_config

    # Run checks
    check_dependencies
    check_ports
    create_log_dir
    check_existing_process

    # Start the server
    if start_server; then
        print_urls

        if [ "$SHOW_TESTS" = true ]; then
            show_test_commands
        fi

        if [ "$MONITOR_LOGS" = true ]; then
            monitor_logs
        else
            print_info "Server is running in background"
            print_info "To monitor logs: tail -f ${LOG_FILE}"
            print_info "To stop server: kill $(cat ${PID_FILE})"
        fi
    else
        exit 1
    fi
}

# Run main function
main "$@"
