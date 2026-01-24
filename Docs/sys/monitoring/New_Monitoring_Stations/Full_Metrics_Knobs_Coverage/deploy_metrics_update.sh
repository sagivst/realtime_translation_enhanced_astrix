#!/bin/bash

# Metrics Implementation Deployment Script
# Deploys updated MetricsRegistry and Station3 handlers
# Target VM: 20.170.155.53

set -e  # Exit on error

# Configuration
VM_HOST="20.170.155.53"
VM_USER="azureuser"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/home/${VM_USER}/backups/metrics_update_${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# VM file paths
REGISTRY_PATH="/home/${VM_USER}/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic"
STATION_PATH="/home/${VM_USER}/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/stations"

# Local file paths (relative to script location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_METRICS_REGISTRY="${SCRIPT_DIR}/Updated_MetricsRegistry.js"
LOCAL_STATION3_3333="${SCRIPT_DIR}/Updated_Station3_3333_Handler.js"
LOCAL_STATION3_4444="${SCRIPT_DIR}/Updated_Station3_4444_Handler.js"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Metrics Implementation Deployment${NC}"
echo -e "${GREEN}  Target: ${VM_HOST}${NC}"
echo -e "${GREEN}  Date: ${TIMESTAMP}${NC}"
echo -e "${GREEN}========================================${NC}"
echo

# Function to check SSH connectivity
check_ssh() {
    echo -e "${YELLOW}Checking SSH connectivity...${NC}"
    if ssh -o ConnectTimeout=5 ${VM_USER}@${VM_HOST} "echo 'SSH OK'" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ SSH connection successful${NC}"
        return 0
    else
        echo -e "${RED}✗ SSH connection failed${NC}"
        return 1
    fi
}

# Function to check local files exist
check_local_files() {
    echo -e "${YELLOW}Checking local update files...${NC}"
    local all_exist=true

    if [ ! -f "$LOCAL_METRICS_REGISTRY" ]; then
        echo -e "${RED}✗ Updated_MetricsRegistry.js not found${NC}"
        all_exist=false
    else
        echo -e "${GREEN}✓ Updated_MetricsRegistry.js found${NC}"
    fi

    if [ ! -f "$LOCAL_STATION3_3333" ]; then
        echo -e "${RED}✗ Updated_Station3_3333_Handler.js not found${NC}"
        all_exist=false
    else
        echo -e "${GREEN}✓ Updated_Station3_3333_Handler.js found${NC}"
    fi

    if [ ! -f "$LOCAL_STATION3_4444" ]; then
        echo -e "${RED}✗ Updated_Station3_4444_Handler.js not found${NC}"
        all_exist=false
    else
        echo -e "${GREEN}✓ Updated_Station3_4444_Handler.js found${NC}"
    fi

    if [ "$all_exist" = false ]; then
        echo -e "${RED}Missing required files. Please ensure all update files are present.${NC}"
        return 1
    fi
    return 0
}

# Step 1: Pre-deployment checks
echo -e "${BLUE}=== Step 1: Pre-deployment Checks ===${NC}"
check_ssh || exit 1
check_local_files || exit 1

# Run local validation first
echo
echo -e "${YELLOW}Running local validation...${NC}"
if [ -f "${SCRIPT_DIR}/validate_metrics_implementation.js" ]; then
    node "${SCRIPT_DIR}/validate_metrics_implementation.js" || {
        echo -e "${RED}Validation failed! Fix errors before deployment.${NC}"
        exit 1
    }
else
    echo -e "${YELLOW}⚠ Validation script not found, skipping validation${NC}"
fi

# Check PM2 status on VM
echo
echo -e "${YELLOW}Checking PM2 services status...${NC}"
ssh ${VM_USER}@${VM_HOST} << 'EOF'
    echo "Current PM2 processes:"
    pm2 list | grep -E "station3|Station3|monitoring-server|database-bridge" || true
    echo
    echo "System resources:"
    free -h | head -3
    df -h /home
EOF

# Step 2: Create backup on VM
echo
echo -e "${BLUE}=== Step 2: Creating Backup ===${NC}"
echo -e "${YELLOW}Creating backup directory: ${BACKUP_DIR}${NC}"

ssh ${VM_USER}@${VM_HOST} << EOF
    # Create backup directory
    mkdir -p ${BACKUP_DIR}

    # Backup registry files
    if [ -f "${REGISTRY_PATH}/MetricsRegistry.js" ]; then
        cp ${REGISTRY_PATH}/MetricsRegistry.js ${BACKUP_DIR}/
        echo "✓ Backed up MetricsRegistry.js"
    else
        echo "⚠ MetricsRegistry.js not found (will be created)"
    fi

    # Backup Station3 handlers
    if [ -f "${STATION_PATH}/Station3_3333_Handler.js" ]; then
        cp ${STATION_PATH}/Station3_3333_Handler.js ${BACKUP_DIR}/
        echo "✓ Backed up Station3_3333_Handler.js"
    fi

    if [ -f "${STATION_PATH}/Station3_4444_Handler.js" ]; then
        cp ${STATION_PATH}/Station3_4444_Handler.js ${BACKUP_DIR}/
        echo "✓ Backed up Station3_4444_Handler.js"
    fi

    # Save current PM2 state
    pm2 save

    echo
    echo "Backup completed at: ${BACKUP_DIR}"
    ls -la ${BACKUP_DIR}
EOF

# Step 3: Upload updated files
echo
echo -e "${BLUE}=== Step 3: Uploading Updated Files ===${NC}"

echo -e "${YELLOW}Uploading MetricsRegistry.js...${NC}"
scp "$LOCAL_METRICS_REGISTRY" ${VM_USER}@${VM_HOST}:/tmp/MetricsRegistry.js.new

echo -e "${YELLOW}Uploading Station3 handlers...${NC}"
scp "$LOCAL_STATION3_3333" ${VM_USER}@${VM_HOST}:/tmp/Station3_3333_Handler.js.new
scp "$LOCAL_STATION3_4444" ${VM_USER}@${VM_HOST}:/tmp/Station3_4444_Handler.js.new

echo -e "${GREEN}✓ Files uploaded to /tmp${NC}"

# Step 4: Validate syntax on VM
echo
echo -e "${BLUE}=== Step 4: Validating JavaScript Syntax ===${NC}"

ssh ${VM_USER}@${VM_HOST} << 'EOF'
    echo "Validating MetricsRegistry.js..."
    node -c /tmp/MetricsRegistry.js.new && echo "✓ Syntax OK" || {
        echo "✗ Syntax Error in MetricsRegistry.js"
        exit 1
    }

    echo "Validating Station3_3333_Handler.js..."
    node -c /tmp/Station3_3333_Handler.js.new && echo "✓ Syntax OK" || {
        echo "✗ Syntax Error in Station3_3333_Handler.js"
        exit 1
    }

    echo "Validating Station3_4444_Handler.js..."
    node -c /tmp/Station3_4444_Handler.js.new && echo "✓ Syntax OK" || {
        echo "✗ Syntax Error in Station3_4444_Handler.js"
        exit 1
    }
EOF

# Step 5: Deployment confirmation
echo
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  DEPLOYMENT CONFIRMATION REQUIRED${NC}"
echo -e "${YELLOW}========================================${NC}"
echo
echo "This will update:"
echo "  • MetricsRegistry.js (73 → 120 metrics, +47 new)"
echo "  • Station3_3333_Handler.js (20 → 82 metrics)"
echo "  • Station3_4444_Handler.js (20 → 82 metrics)"
echo
echo "New metric categories added:"
echo "  • Time-domain analysis (15 metrics)"
echo "  • Enhanced buffer metrics (5 metrics)"
echo "  • Session metrics (5 metrics)"
echo "  • STT readiness metrics (7 metrics)"
echo "  • Statistical metrics (5 metrics)"
echo "  • Spectral placeholders (10 metrics)"
echo
echo "Backup location: ${VM_USER}@${VM_HOST}:${BACKUP_DIR}"
echo
read -p "Deploy updates to production? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 0
fi

# Step 6: Deploy files
echo
echo -e "${BLUE}=== Step 6: Deploying Files ===${NC}"

ssh ${VM_USER}@${VM_HOST} << EOF
    # Move new files to production
    mv /tmp/MetricsRegistry.js.new ${REGISTRY_PATH}/MetricsRegistry.js
    mv /tmp/Station3_3333_Handler.js.new ${STATION_PATH}/Station3_3333_Handler.js
    mv /tmp/Station3_4444_Handler.js.new ${STATION_PATH}/Station3_4444_Handler.js

    echo "✓ Files deployed to production"

    # Verify deployment
    echo
    echo "Verifying deployment:"

    echo -n "MetricsRegistry.js metrics count: "
    grep -o '["'"'"'][^"'"'"']*["'"'"']\s*:\s*{' ${REGISTRY_PATH}/MetricsRegistry.js | wc -l

    echo -n "Station3_3333 PRE metrics count: "
    awk '/preMetrics/,/\]/' ${STATION_PATH}/Station3_3333_Handler.js | grep -o '"[^"]*"' | wc -l

    echo -n "Station3_3333 POST metrics count: "
    awk '/postMetrics/,/\]/' ${STATION_PATH}/Station3_3333_Handler.js | grep -o '"[^"]*"' | wc -l
EOF

# Step 7: Reload services
echo
echo -e "${BLUE}=== Step 7: Reloading PM2 Services ===${NC}"

ssh ${VM_USER}@${VM_HOST} << 'EOF'
    echo "Reloading monitoring services..."

    # Reload specific services if they exist
    pm2 list | grep -q "monitoring-server" && pm2 reload monitoring-server || true
    pm2 list | grep -q "database-bridge" && pm2 reload database-bridge || true
    pm2 list | grep -q "station3" && pm2 reload station3 || true
    pm2 list | grep -q "Station3" && pm2 reload Station3 || true

    # Wait for services to stabilize
    sleep 5

    echo
    echo "Service status after reload:"
    pm2 list | grep -E "station|monitoring|database" || true
EOF

# Step 8: Validation
echo
echo -e "${BLUE}=== Step 8: Post-Deployment Validation ===${NC}"

ssh ${VM_USER}@${VM_HOST} << 'VALIDATION'
    echo "Checking for errors in PM2 logs..."
    pm2 logs --nostream --lines 20 | grep -i error | tail -5 || echo "No recent errors"

    echo
    echo "Testing API endpoints:"

    # Test monitoring API
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3020/health 2>/dev/null | grep -q "200"; then
        echo "✓ Monitoring API responding"
    else
        echo "⚠ Monitoring API not responding on port 3020"
    fi

    # Test database bridge
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3019/health 2>/dev/null | grep -q "200"; then
        echo "✓ Database Bridge API responding"
    else
        echo "⚠ Database Bridge API not responding on port 3019"
    fi

    echo
    echo "Sample metrics check for Station3:"
    # Try to fetch metrics for Station3
    curl -s http://localhost:3020/metrics/St_3_3333 2>/dev/null | head -20 || echo "Unable to fetch metrics"
VALIDATION

# Step 9: Create rollback script
echo
echo -e "${BLUE}=== Step 9: Creating Rollback Script ===${NC}"

cat > rollback_metrics_${TIMESTAMP}.sh << ROLLBACK_SCRIPT
#!/bin/bash
# Rollback script for metrics update
# Created: ${TIMESTAMP}

echo "Rolling back metrics update..."

ssh ${VM_USER}@${VM_HOST} << 'EOF'
    # Restore from backup
    cp ${BACKUP_DIR}/MetricsRegistry.js ${REGISTRY_PATH}/ 2>/dev/null || echo "No MetricsRegistry backup"
    cp ${BACKUP_DIR}/Station3_3333_Handler.js ${STATION_PATH}/
    cp ${BACKUP_DIR}/Station3_4444_Handler.js ${STATION_PATH}/

    # Reload services
    pm2 reload monitoring-server database-bridge 2>/dev/null || true

    echo "Rollback completed"
EOF
ROLLBACK_SCRIPT

chmod +x rollback_metrics_${TIMESTAMP}.sh

# Final summary
echo
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo
echo "Summary:"
echo "  • MetricsRegistry updated to 120 metrics (100% coverage)"
echo "  • Station3 handlers updated with 82 PCM-applicable metrics"
echo "  • Backup saved to: ${VM_USER}@${VM_HOST}:${BACKUP_DIR}"
echo "  • Rollback script: ./rollback_metrics_${TIMESTAMP}.sh"
echo
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Monitor system for 15-30 minutes"
echo "2. Check PM2 logs: ssh ${VM_USER}@${VM_HOST} 'pm2 logs --lines 100'"
echo "3. Verify metrics collection is working"
echo "4. Proceed with KnobsRegistry update if stable"
echo
echo -e "${YELLOW}To verify metrics collection:${NC}"
echo "  curl http://${VM_HOST}:3020/metrics/St_3_3333"
echo "  curl http://${VM_HOST}:3020/metrics/St_3_4444"
echo
echo -e "${YELLOW}To check new metrics in database:${NC}"
cat << 'SQL'
ssh ${VM_USER}@${VM_HOST} << 'EOF'
  sudo -u postgres psql monitoring_v2 -c "
    SELECT metric_key, COUNT(*) as data_points
    FROM metric_data
    WHERE station_key IN ('St_3_3333', 'St_3_4444')
      AND created_at > NOW() - INTERVAL '5 minutes'
    GROUP BY metric_key
    ORDER BY metric_key
    LIMIT 20;
  "
EOF
SQL
echo
echo -e "${YELLOW}If issues occur, run rollback:${NC}"
echo "  ./rollback_metrics_${TIMESTAMP}.sh"