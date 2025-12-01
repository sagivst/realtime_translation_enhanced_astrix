#!/bin/bash

# Backend Gap Analysis Script for Monitoring System
# This script checks the current backend implementation against the AI-Driven specification

echo "======================================"
echo "Backend Monitoring System Gap Analysis"
echo "======================================"
echo ""

VM_HOST="azureuser@20.170.155.53"
MONITORING_PATH="/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "1. CHECKING STATION COVERAGE"
echo "----------------------------"
echo -e "Required stations: 1, 2, 3, 4, 9, 10, 11"

# Check which stations are implemented
STATIONS=$(ssh $VM_HOST "grep -o 'station-[0-9]*' $MONITORING_PATH/monitoring-server.js | sort -u | grep -o '[0-9]*' | sort -n -u | tr '\n' ' '")
echo -e "Implemented stations: ${YELLOW}$STATIONS${NC}"

# Check for missing stations
for station in 9 10 11; do
    if echo "$STATIONS" | grep -q "$station"; then
        echo -e "  Station $station: ${GREEN}✓${NC}"
    else
        echo -e "  Station $station: ${RED}✗ MISSING${NC}"
    fi
done

echo ""
echo "2. CHECKING DATABASE INTEGRATION"
echo "---------------------------------"

# Check for database connections
DB_CHECK=$(ssh $VM_HOST "grep -i -E 'postgres|mysql|mongodb|sequelize|typeorm|prisma' $MONITORING_PATH/monitoring-server.js | wc -l")
if [ "$DB_CHECK" -eq 0 ]; then
    echo -e "Database integration: ${RED}✗ NOT FOUND${NC}"
    echo -e "  Required tables: ${RED}MISSING${NC}"
    echo "    - calls"
    echo "    - channels"
    echo "    - segments"
    echo "    - station_snapshots"
    echo "    - optimizer_runs"
    echo "    - parameters"
    echo "    - parameter_changes"
else
    echo -e "Database integration: ${GREEN}✓ Found references${NC}"
fi

echo ""
echo "3. CHECKING OBJECT STORAGE"
echo "---------------------------"

# Check for S3/MinIO integration
STORAGE_CHECK=$(ssh $VM_HOST "grep -i -E 's3|minio|aws-sdk|object.?storage|bucket' $MONITORING_PATH/monitoring-server.js | wc -l")
if [ "$STORAGE_CHECK" -eq 0 ]; then
    echo -e "Object storage: ${RED}✗ NOT IMPLEMENTED${NC}"
    echo "  Required: S3/MinIO for PCM audio storage"
else
    echo -e "Object storage: ${YELLOW}⚠ References found (needs verification)${NC}"
fi

echo ""
echo "4. CHECKING API ENDPOINTS"
echo "-------------------------"

# Required endpoints
REQUIRED_ENDPOINTS=(
    "/v1/stations/snapshot"
    "/v1/optimizer/run"
    "/v1/config/update"
)

echo "Checking required API endpoints:"
for endpoint in "${REQUIRED_ENDPOINTS[@]}"; do
    CHECK=$(ssh $VM_HOST "grep -F '$endpoint' $MONITORING_PATH/monitoring-server.js | wc -l")
    if [ "$CHECK" -eq 0 ]; then
        echo -e "  $endpoint: ${RED}✗ MISSING${NC}"
    else
        echo -e "  $endpoint: ${GREEN}✓${NC}"
    fi
done

# Check existing endpoints
echo ""
echo "Existing endpoints found:"
ssh $VM_HOST "grep -E 'app\.(get|post|put|delete)' $MONITORING_PATH/monitoring-server.js | sed 's/.*app\.\([a-z]*\).*\(\"[^\"]*\"\).*/  \1 \2/' | head -10"

echo ""
echo "5. CHECKING SCHEMA VERSIONING"
echo "-----------------------------"

SCHEMA_CHECK=$(ssh $VM_HOST "grep -i 'schema.?version' $MONITORING_PATH/monitoring-server.js | wc -l")
if [ "$SCHEMA_CHECK" -eq 0 ]; then
    echo -e "Schema versioning: ${RED}✗ NOT IMPLEMENTED${NC}"
    echo "  Risk: Breaking changes will crash system"
else
    echo -e "Schema versioning: ${GREEN}✓ Found${NC}"
fi

echo ""
echo "6. CHECKING SAFETY FEATURES"
echo "---------------------------"

# Check for rollback capability
ROLLBACK=$(ssh $VM_HOST "grep -i 'rollback' $MONITORING_PATH/monitoring-server.js | wc -l")
if [ "$ROLLBACK" -eq 0 ]; then
    echo -e "Rollback capability: ${RED}✗ MISSING${NC}"
else
    echo -e "Rollback capability: ${YELLOW}⚠ References found${NC}"
fi

# Check for parameter bounds
BOUNDS=$(ssh $VM_HOST "grep -i -E 'min.?value|max.?value|bounds|constraint' $MONITORING_PATH/monitoring-server.js | wc -l")
if [ "$BOUNDS" -eq 0 ]; then
    echo -e "Parameter bounds checking: ${RED}✗ MISSING${NC}"
else
    echo -e "Parameter bounds checking: ${GREEN}✓ Found ($BOUNDS references)${NC}"
fi

echo ""
echo "7. CHECKING EXTERNAL INTEGRATIONS"
echo "---------------------------------"

INTEGRATIONS=(
    "Deepgram:deepgram"
    "Hume:hume"
    "Asterisk:asterisk|ami|ari"
)

for integration in "${INTEGRATIONS[@]}"; do
    NAME="${integration%%:*}"
    PATTERN="${integration#*:}"
    CHECK=$(ssh $VM_HOST "grep -i -E '$PATTERN' $MONITORING_PATH/monitoring-server.js | wc -l")
    if [ "$CHECK" -eq 0 ]; then
        echo -e "$NAME integration: ${RED}✗ NOT FOUND${NC}"
    else
        echo -e "$NAME integration: ${YELLOW}⚠ References found ($CHECK)${NC}"
    fi
done

echo ""
echo "8. CHECKING DATA PERSISTENCE"
echo "----------------------------"

# Check if data is stored in memory only
MEMORY_ONLY=$(ssh $VM_HOST "grep -E 'const.*=.*\{\}|const.*=.*\[\]' $MONITORING_PATH/monitoring-server.js | grep -E 'stations|metrics|parameters|calibration' | wc -l")
echo -e "In-memory storage objects found: ${YELLOW}$MEMORY_ONLY${NC}"
echo "  Risk: All data lost on restart"

echo ""
echo "9. MODULE DEPENDENCIES"
echo "----------------------"

echo "Checking required modules:"
MODULES=(
    "test-audio-generator"
    "log-stream-manager"
    "wav-recorder"
)

for module in "${MODULES[@]}"; do
    CHECK=$(ssh $VM_HOST "ls $MONITORING_PATH/modules/$module.js 2>/dev/null | wc -l")
    if [ "$CHECK" -gt 0 ]; then
        echo -e "  $module: ${GREEN}✓${NC}"
    else
        echo -e "  $module: ${YELLOW}⚠ Check implementation${NC}"
    fi
done

echo ""
echo "10. COMPLIANCE SUMMARY"
echo "----------------------"

# Calculate rough compliance score
TOTAL_CHECKS=20
PASSED=0

# Add up passed checks (simplified)
[ "$DB_CHECK" -gt 0 ] && PASSED=$((PASSED + 2))
[ "$STORAGE_CHECK" -gt 0 ] && PASSED=$((PASSED + 1))
[ "$SCHEMA_CHECK" -gt 0 ] && PASSED=$((PASSED + 2))
[ "$ROLLBACK" -gt 0 ] && PASSED=$((PASSED + 1))
[ "$BOUNDS" -gt 0 ] && PASSED=$((PASSED + 1))

SCORE=$((PASSED * 100 / TOTAL_CHECKS))

echo -e "Estimated Backend Compliance Score: ${YELLOW}${SCORE}%${NC}"
echo ""

if [ $SCORE -lt 30 ]; then
    echo -e "${RED}CRITICAL:${NC} Major architectural changes required"
    echo "Priority Actions:"
    echo "  1. Implement database layer (PostgreSQL)"
    echo "  2. Add stations 9, 10, 11"
    echo "  3. Implement schema versioning"
    echo "  4. Add object storage for audio"
elif [ $SCORE -lt 70 ]; then
    echo -e "${YELLOW}WARNING:${NC} Significant gaps exist"
    echo "Priority Actions:"
    echo "  1. Complete missing API endpoints"
    echo "  2. Add safety features (rollback, bounds)"
    echo "  3. Implement external integrations"
else
    echo -e "${GREEN}GOOD:${NC} Basic compliance achieved"
    echo "Remaining Actions:"
    echo "  1. Production hardening"
    echo "  2. Performance optimization"
    echo "  3. Enhanced monitoring"
fi

echo ""
echo "======================================"
echo "Backend Gap Analysis Complete"
echo "Full report: GAP_ANALYSIS_MONITORING_SYSTEM.md"
echo "======================================"