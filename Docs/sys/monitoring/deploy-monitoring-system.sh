#!/bin/bash

#=============================================================================
# Monitoring System Deployment Script
# Version: 1.0
# Description: Automated deployment of complete monitoring system with PM2
#=============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_DIR="/home/azureuser/translation-app"
OPERATIONAL_DIR="$BASE_DIR/3333_4444__Operational"
STTTS_DIR="$OPERATIONAL_DIR/STTTTSserver"
CLOUDFLARE_TOKEN="${CLOUDFLARE_TOKEN:-}"  # Set this environment variable

# Function to print colored messages
print_message() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as correct user
check_user() {
    if [ "$USER" != "azureuser" ]; then
        print_warning "This script should be run as 'azureuser'. Current user: $USER"
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Check prerequisites
check_prerequisites() {
    print_message "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed!"
        exit 1
    fi

    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        print_warning "PM2 is not installed. Installing..."
        npm install -g pm2
    fi

    # Check Cloudflared
    if ! command -v cloudflared &> /dev/null; then
        if [ ! -f "/usr/local/bin/cloudflared" ]; then
            print_warning "Cloudflared not found. Please install manually."
        fi
    fi

    print_message "Prerequisites check completed"
}

# Stop all existing PM2 processes
stop_all_services() {
    print_message "Stopping all existing PM2 services..."
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    pm2 flush
    print_message "All services stopped and logs cleared"
}

# Start monitoring infrastructure
start_monitoring_services() {
    print_message "Starting monitoring infrastructure..."

    # Database API Server (Critical)
    print_message "Starting database-api-server on port 8083..."
    pm2 start "$BASE_DIR/database-api-server.js" \
        --name database-api-server \
        --time \
        --log-date-format "YYYY-MM-DD HH:mm:ss"

    # Monitoring Server (Critical)
    print_message "Starting monitoring-server on port 8090..."
    pm2 start "$BASE_DIR/monitoring-server.js" \
        --name monitoring-server \
        --time \
        --log-date-format "YYYY-MM-DD HH:mm:ss"

    # Monitoring Bridge
    print_message "Starting monitoring-bridge on port 3001..."
    pm2 start "$BASE_DIR/monitoring-to-database-bridge.js" \
        --name monitoring-bridge \
        --time \
        --log-date-format "YYYY-MM-DD HH:mm:ss"

    sleep 2
    print_message "Monitoring infrastructure started"
}

# Start STTTTSserver
start_sttts_server() {
    print_message "Starting STTTTSserver..."

    # Must change to directory first
    cd "$STTTS_DIR"

    pm2 start STTTTSserver.js \
        --name STTTTSserver \
        --time \
        --log-date-format "YYYY-MM-DD HH:mm:ss"

    cd - > /dev/null
    print_message "STTTTSserver started on port 8080"
}

# Start gateway services
start_gateway_services() {
    print_message "Starting gateway services..."

    # Gateway 3333
    print_message "Starting gateway-3333 on port 7777..."
    pm2 start "$OPERATIONAL_DIR/gateway-3333.js" \
        --name gateway-3333 \
        --time \
        --log-date-format "YYYY-MM-DD HH:mm:ss"

    # Gateway 4444
    print_message "Starting gateway-4444 on port 8888..."
    pm2 start "$OPERATIONAL_DIR/gateway-4444.js" \
        --name gateway-4444 \
        --time \
        --log-date-format "YYYY-MM-DD HH:mm:ss"

    print_message "Gateway services started"
}

# Start ARI-GStreamer
start_ari_gstreamer() {
    print_message "Starting ari-gstreamer on port 8089..."
    pm2 start "$OPERATIONAL_DIR/ari-gstreamer-operational.js" \
        --name ari-gstreamer \
        --time \
        --log-date-format "YYYY-MM-DD HH:mm:ss"
    print_message "ARI-GStreamer started"
}

# Start continuous monitoring
start_continuous_monitoring() {
    print_message "Starting continuous monitoring on port 9090..."
    pm2 start "$BASE_DIR/continuous-full-monitoring-with-station3.js" \
        --name continuous-monitoring \
        --time \
        --log-date-format "YYYY-MM-DD HH:mm:ss"
    print_message "Continuous monitoring started"
}

# Start Cloudflare tunnel
start_cloudflare_tunnel() {
    print_message "Setting up Cloudflare tunnel..."

    if [ -n "$CLOUDFLARE_TOKEN" ]; then
        print_message "Starting permanent Cloudflare tunnel..."
        pm2 start cloudflared \
            --name cloudflared-perm \
            -- tunnel run --token "$CLOUDFLARE_TOKEN"
    else
        print_warning "CLOUDFLARE_TOKEN not set. Tunnel must be configured manually."
        print_warning "Use: pm2 start cloudflared --name cloudflared-perm -- tunnel run --token YOUR_TOKEN"
    fi
}

# Save PM2 configuration
save_pm2_config() {
    print_message "Saving PM2 configuration..."
    pm2 save
    pm2 startup systemd -u azureuser --hp /home/azureuser 2>/dev/null || true
    print_message "PM2 configuration saved"
}

# Verify services
verify_services() {
    print_message "Verifying services..."
    sleep 5

    pm2 list

    # Check API health
    print_message "Checking API health..."
    if curl -s http://localhost:8083/api/health/system > /dev/null 2>&1; then
        print_message "✅ Database API Server is responding"
    else
        print_warning "Database API Server is not responding on port 8083"
    fi

    # Check monitoring server
    if curl -s http://localhost:8090 > /dev/null 2>&1; then
        print_message "✅ Monitoring Server is responding"
    else
        print_warning "Monitoring Server is not responding on port 8090"
    fi
}

# Display summary
display_summary() {
    echo
    echo "========================================="
    echo "   Monitoring System Deployment Complete"
    echo "========================================="
    echo
    print_message "All services have been started with PM2"
    echo
    echo "Useful commands:"
    echo "  pm2 status          - View all services"
    echo "  pm2 logs            - View all logs"
    echo "  pm2 monit           - Real-time monitoring"
    echo "  pm2 restart all     - Restart all services"
    echo
    echo "API Endpoints:"
    echo "  Local: http://localhost:8083/api/health/system"

    if [ -n "$CLOUDFLARE_TOKEN" ]; then
        echo "  Tunnel: https://tun.monitoringavailable.uk/api/health/system"
    fi

    echo
    echo "Port Allocations:"
    echo "  8083 - Database API Server"
    echo "  8090 - Monitoring Server"
    echo "  8080 - STTTTSserver"
    echo "  3001 - Monitoring Bridge"
    echo "  7777 - Gateway 3333"
    echo "  8888 - Gateway 4444"
    echo "  8089 - ARI-GStreamer"
    echo "  9090 - Continuous Monitoring"
    echo
}

# Main execution
main() {
    echo "========================================="
    echo "   Monitoring System Deployment Script"
    echo "========================================="
    echo

    check_user
    check_prerequisites

    # Ask for confirmation
    read -p "This will stop all existing PM2 services and restart them. Continue? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_message "Deployment cancelled"
        exit 0
    fi

    # Execute deployment steps
    stop_all_services
    start_monitoring_services
    start_sttts_server
    start_gateway_services
    start_ari_gstreamer
    start_continuous_monitoring
    start_cloudflare_tunnel
    save_pm2_config
    verify_services
    display_summary

    print_message "Deployment completed successfully!"
}

# Handle script interruption
trap 'print_error "Script interrupted"; exit 1' INT TERM

# Run main function
main "$@"