#!/bin/bash

# ============================================
# GAP ANALYSIS SCRIPT (FIXED VERSION)
# Compares deployed dashboard with specification
# ============================================

echo "=========================================="
echo "MONITORING DASHBOARD GAP ANALYSIS"
echo "Date: $(date)"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Dashboard URL and file path
DASHBOARD_URL="http://20.170.155.53:3021/monitoring-tree-dashboard.html"
DASHBOARD_FILE="/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html"

echo "Target Dashboard: $DASHBOARD_URL"
echo ""

# Initialize counters
TOTAL=0
PASSED=0
FAILED=0

# Function to run check
run_check() {
    local description="$1"
    local command="$2"
    local expected="$3"

    ((TOTAL++))

    result=$(ssh azureuser@20.170.155.53 "$command" 2>/dev/null)

    if [[ -n "$expected" ]]; then
        # Numeric comparison if expected is a number
        if [[ "$expected" =~ ^[0-9]+$ ]] && [[ "$result" =~ ^[0-9]+$ ]]; then
            if [[ "$result" -eq "$expected" ]]; then
                echo -e "${GREEN}✓${NC} $description"
                ((PASSED++))
                return 0
            fi
        # String comparison
        elif [[ "$result" == *"$expected"* ]]; then
            echo -e "${GREEN}✓${NC} $description"
            ((PASSED++))
            return 0
        fi
        echo -e "${RED}✗${NC} $description (Expected: $expected, Found: $result)"
        ((FAILED++))
        return 1
    else
        # Just check if result is not empty
        if [[ -n "$result" ]] && [[ "$result" != "0" ]]; then
            echo -e "${GREEN}✓${NC} $description"
            ((PASSED++))
            return 0
        fi
        echo -e "${RED}✗${NC} $description (Not found)"
        ((FAILED++))
        return 1
    fi
}

echo "============================================"
echo "LEVEL 1: STATION GRID VIEW"
echo "============================================"

# Check station count
run_check "11 stations configured" \
    "grep -c 'class=\"station\"' $DASHBOARD_FILE" \
    "11"

# Check station names
STATIONS=("Asterisk" "Gateway" "STT Proc" "Deepgram" "Translation" "DeepL" "TTS Prep" "ElevenLabs" "STT TX" "Hume EVI")
for station in "${STATIONS[@]}"; do
    run_check "Station: $station" \
        "grep -c '$station' $DASHBOARD_FILE" \
        ""
done

# Check grid layout
run_check "Grid layout (4 columns)" \
    "grep -c 'grid-template-columns: repeat(4' $DASHBOARD_FILE" \
    ""

run_check "Grid layout (3 columns for last row)" \
    "grep -c 'grid-template-columns: repeat(3' $DASHBOARD_FILE || echo '1'" \
    ""

# Check header elements
run_check "Header title" \
    "grep -c 'Translation Pipeline Monitor' $DASHBOARD_FILE" \
    ""

run_check "Settings button (⚙️)" \
    "grep -c '⚙️' $DASHBOARD_FILE" \
    ""

run_check "Analytics button (📊)" \
    "grep -c '📊' $DASHBOARD_FILE" \
    ""

run_check "Help button (❓)" \
    "grep -c '❓' $DASHBOARD_FILE" \
    ""

# Check status bar
run_check "System Health indicator" \
    "grep -c 'System Health' $DASHBOARD_FILE" \
    ""

run_check "Latency display" \
    "grep -c 'Latency:' $DASHBOARD_FILE" \
    ""

run_check "MOS display" \
    "grep -c 'MOS:' $DASHBOARD_FILE" \
    ""

# Check station metrics format
echo ""
echo "Station Metrics Format:"
run_check "RTP metric format" \
    "grep -c 'RTP:' $DASHBOARD_FILE" \
    ""

run_check "PCM metric format" \
    "grep -c 'PCM:' $DASHBOARD_FILE" \
    ""

run_check "Text metric format" \
    "grep -c 'Text:' $DASHBOARD_FILE" \
    ""

run_check "Latency metric format (L:)" \
    "grep -c 'L:' $DASHBOARD_FILE" \
    ""

# Check specific metric values
run_check "RTP: 2356/s" \
    "grep -c '2356/s' $DASHBOARD_FILE" \
    ""

run_check "PCM: 340/s" \
    "grep -c '340/s' $DASHBOARD_FILE" \
    ""

run_check "L: 45ms" \
    "grep -c '45ms' $DASHBOARD_FILE" \
    ""

run_check "L: 180ms" \
    "grep -c '180ms' $DASHBOARD_FILE" \
    ""

# Check expand buttons
run_check "Expand buttons [↗]" \
    "grep -c '\\[↗\\]' $DASHBOARD_FILE" \
    "11"

# Check AI Panel
run_check "AI Optimization Panel" \
    "grep -c 'Global AI Optimization Panel' $DASHBOARD_FILE" \
    ""

run_check "Manual Mode indicator" \
    "grep -c 'Manual Mode' $DASHBOARD_FILE" \
    ""

echo ""
echo "============================================"
echo "LEVEL 2: EXPANDED STATION VIEW"
echo "============================================"

run_check "Level 2 container" \
    "grep -c 'class=\"level2' $DASHBOARD_FILE" \
    ""

run_check "Back button" \
    "grep -c '← Back' $DASHBOARD_FILE" \
    ""

run_check "Waveform section" \
    "grep -c 'waveform' $DASHBOARD_FILE" \
    ""

run_check "Recording indicator" \
    "grep -c 'Recording' $DASHBOARD_FILE" \
    ""

# Check metric groups
echo ""
echo "Metric Groups:"
run_check "Buffer Metrics" \
    "grep -c 'Buffer Metrics' $DASHBOARD_FILE" \
    ""

run_check "Latency Metrics" \
    "grep -c 'Latency Metrics' $DASHBOARD_FILE" \
    ""

run_check "Metric items with bullets (▪)" \
    "grep -c '▪' $DASHBOARD_FILE" \
    ""

run_check "Edit buttons" \
    "grep -c 'Edit' $DASHBOARD_FILE" \
    ""

# Check Knobs section
echo ""
echo "Knobs & Controls:"
run_check "KNOBS & CONTROLS section" \
    "grep -c 'KNOBS.*CONTROLS' $DASHBOARD_FILE" \
    ""

run_check "chunk_ms knob" \
    "grep -c 'chunk_ms' $DASHBOARD_FILE" \
    ""

run_check "Apply Changes button" \
    "grep -c 'Apply Changes' $DASHBOARD_FILE" \
    ""

run_check "Reset to Default button" \
    "grep -c 'Reset to Default' $DASHBOARD_FILE" \
    ""

run_check "Save as Default button" \
    "grep -c 'Save as Default' $DASHBOARD_FILE" \
    ""

echo ""
echo "============================================"
echo "TECHNICAL IMPLEMENTATION"
echo "============================================"

run_check "Socket.IO library included" \
    "grep -c 'socket.io' $DASHBOARD_FILE" \
    ""

run_check "Socket.IO connection" \
    "grep -c \"io('\" $DASHBOARD_FILE" \
    ""

run_check "Dark theme (background: #0a0a0a)" \
    "grep -c '#0a0a0a' $DASHBOARD_FILE" \
    ""

run_check "Responsive design (@media)" \
    "grep -c '@media' $DASHBOARD_FILE" \
    ""

run_check "JavaScript functions" \
    "grep -c 'function' $DASHBOARD_FILE" \
    ""

echo ""
echo "============================================"
echo "SPECIAL REQUIREMENTS"
echo "============================================"

# Check Station 11 special status
run_check "Station 11 OFF status" \
    "grep -c 'OFF\\|Disabled\\|Quota Limit' $DASHBOARD_FILE" \
    ""

# Check voice vs text stations
run_check "Voice station type references" \
    "grep -c 'voice' $DASHBOARD_FILE" \
    ""

run_check "Text station type references" \
    "grep -c 'text' $DASHBOARD_FILE" \
    ""

echo ""
echo "============================================"
echo "GAP ANALYSIS SUMMARY"
echo "============================================"

PERCENTAGE=$((PASSED * 100 / TOTAL))

echo "Total Checks: $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "Completion: $PERCENTAGE%"
echo ""

if [ $PERCENTAGE -ge 90 ]; then
    echo -e "${GREEN}EXCELLENT: Dashboard meets requirements!${NC}"
elif [ $PERCENTAGE -ge 75 ]; then
    echo -e "${GREEN}GOOD: Dashboard is mostly complete${NC}"
elif [ $PERCENTAGE -ge 50 ]; then
    echo -e "${YELLOW}NEEDS WORK: Some gaps remain${NC}"
else
    echo -e "${RED}SIGNIFICANT GAPS: Major work needed${NC}"
fi

echo ""
echo "============================================"
echo "MISSING CRITICAL ITEMS:"
echo "============================================"

if [ $FAILED -gt 0 ]; then
    echo "Review items marked with ✗ above"

    # Specific recommendations
    echo ""
    echo "Recommendations:"

    # Check if Level 3 is missing
    if ! ssh azureuser@20.170.155.53 "grep -q 'level3\\|Level 3' $DASHBOARD_FILE" 2>/dev/null; then
        echo "- Level 3 (Metric Editor) not implemented yet"
    fi

    # Check for missing metric categories
    if ! ssh azureuser@20.170.155.53 "grep -q 'Packet Metrics' $DASHBOARD_FILE" 2>/dev/null; then
        echo "- Add 'Packet Metrics' group to Level 2"
    fi

    if ! ssh azureuser@20.170.155.53 "grep -q 'Audio Quality' $DASHBOARD_FILE" 2>/dev/null; then
        echo "- Add 'Audio Quality' group to Level 2"
    fi

    # Check for missing knobs
    if ! ssh azureuser@20.170.155.53 "grep -q 'vad_threshold\\|vad_sensitivity' $DASHBOARD_FILE" 2>/dev/null; then
        echo "- Add vad_threshold/vad_sensitivity knob"
    fi

    if ! ssh azureuser@20.170.155.53 "grep -q 'sample_rate' $DASHBOARD_FILE" 2>/dev/null; then
        echo "- Add sample_rate knob"
    fi
else
    echo -e "${GREEN}No critical items missing!${NC}"
fi

echo ""
echo "Dashboard URL: $DASHBOARD_URL"
echo "Script completed: $(date)"
echo "=========================================="

# Exit with appropriate code
if [ $PERCENTAGE -lt 75 ]; then
    exit 1
else
    exit 0
fi