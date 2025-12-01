#!/bin/bash

# ============================================
# GAP ANALYSIS SCRIPT
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
SPEC_FILE="/Users/sagivstavinsky/realtime-translation-enhanced_astrix/Docs/sys/monitoring/REVISED_MONITORING_GAP_ANALYSIS_UI_PLAN_2025-11-29.md"

echo "Target Dashboard: $DASHBOARD_URL"
echo "Specification: REVISED_MONITORING_GAP_ANALYSIS_UI_PLAN_2025-11-29.md"
echo ""

# Function to check requirement
check_requirement() {
    local requirement="$1"
    local check_command="$2"
    local expected="$3"

    result=$(ssh azureuser@20.170.155.53 "$check_command" 2>/dev/null)

    if [[ "$result" == *"$expected"* ]] || [[ "$result" -eq "$expected" ]] 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $requirement"
        return 0
    else
        echo -e "${RED}✗${NC} $requirement"
        echo "  Expected: $expected"
        echo "  Found: $result"
        return 1
    fi
}

# Function to check content exists
check_exists() {
    local requirement="$1"
    local search_pattern="$2"

    if ssh azureuser@20.170.155.53 "grep -q '$search_pattern' $DASHBOARD_FILE" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $requirement"
        return 0
    else
        echo -e "${RED}✗${NC} $requirement"
        echo "  Missing: $search_pattern"
        return 1
    fi
}

# Initialize counters
TOTAL=0
PASSED=0
FAILED=0

# ============================================
# LEVEL 1: MAIN DASHBOARD REQUIREMENTS
# ============================================
echo "============================================"
echo "LEVEL 1: STATION GRID VIEW"
echo "============================================"

# Check station count
((TOTAL++))
if check_requirement "11 stations configured" \
    "grep -c 'station-[0-9]' $DASHBOARD_FILE | head -1" \
    "11"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Check all station names
((TOTAL++))
echo "Checking station names..."
STATIONS=(
    "Asterisk"
    "Gateway"
    "STT Proc"
    "Deepgram"
    "Translation"
    "DeepL"
    "TTS Prep"
    "ElevenLabs"
    "STT TX"
    "Gateway"
    "Hume EVI"
)

all_found=true
for station in "${STATIONS[@]}"; do
    if ! ssh azureuser@20.170.155.53 "grep -q '$station' $DASHBOARD_FILE" 2>/dev/null; then
        echo -e "${RED}  ✗ Missing station: $station${NC}"
        all_found=false
    fi
done

if $all_found; then
    echo -e "${GREEN}✓${NC} All 11 station names present"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Some station names missing"
    ((FAILED++))
fi

# Check grid layout
((TOTAL++))
if check_exists "Grid layout configured" "grid-template-columns"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Check header elements
((TOTAL++))
if check_exists "Header with title" "REAL-TIME TRANSLATION PIPELINE MONITOR\|Real-Time Translation Pipeline Monitor"; then
    ((PASSED++))
else
    ((FAILED++))
fi

((TOTAL++))
if check_exists "Header controls (⚙️ 📊 ❓)" "⚙️.*📊.*❓\|Settings.*Analytics.*Help"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Check status bar
((TOTAL++))
if check_exists "System Health indicator" "System Health\|ONLINE"; then
    ((PASSED++))
else
    ((FAILED++))
fi

((TOTAL++))
if check_exists "Latency display" "Latency.*ms\|182ms"; then
    ((PASSED++))
else
    ((FAILED++))
fi

((TOTAL++))
if check_exists "MOS score" "MOS.*4.6\|MOS:"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Check station metrics
echo ""
echo "Station Metric Requirements:"

METRICS=(
    "RTP:.*2356/s"
    "PCM:.*340/s"
    "Text:.*12/s"
    "L:.*ms"
)

for metric in "${METRICS[@]}"; do
    ((TOTAL++))
    if check_exists "  Metric pattern: $metric" "$metric"; then
        ((PASSED++))
    else
        ((FAILED++))
    fi
done

# Check expand buttons
((TOTAL++))
if check_exists "Expand buttons [↗]" "\\[↗\\]\|expand.*onclick"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Check AI Panel
((TOTAL++))
if check_exists "AI Optimization Panel" "Global AI Optimization Panel.*Manual Mode"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# ============================================
# LEVEL 2: EXPANDED STATION VIEW
# ============================================
echo ""
echo "============================================"
echo "LEVEL 2: EXPANDED STATION VIEW"
echo "============================================"

((TOTAL++))
if check_exists "Level 2 container" "level2\|expandedView\|expanded-view"; then
    ((PASSED++))
else
    ((FAILED++))
fi

((TOTAL++))
if check_exists "Back button [←]" "← Back\|Back"; then
    ((PASSED++))
else
    ((FAILED++))
fi

((TOTAL++))
if check_exists "Audio Waveform section" "Audio Waveform\|waveform\|Recording"; then
    ((PASSED++))
else
    ((FAILED++))
fi

((TOTAL++))
if check_exists "Monitoring Metrics section" "MONITORING METRICS\|Active Parameters"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Check metric categories
echo ""
echo "Metric Category Requirements:"

CATEGORIES=(
    "Buffer Metrics"
    "Latency Metrics"
    "Packet Metrics"
    "Audio Quality"
)

for category in "${CATEGORIES[@]}"; do
    ((TOTAL++))
    if check_exists "  Category: $category" "$category"; then
        ((PASSED++))
    else
        ((FAILED++))
    fi
done

((TOTAL++))
if check_exists "Edit buttons for metrics" "Edit ↗\|Edit\|edit"; then
    ((PASSED++))
else
    ((FAILED++))
fi

((TOTAL++))
if check_exists "Progress bars for metrics" "metric-bar\|bar-fill\|████"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Check Knobs section
echo ""
echo "Knobs & Controls Requirements:"

((TOTAL++))
if check_exists "KNOBS & CONTROLS section" "KNOBS.*CONTROLS\|Knobs.*Controls"; then
    ((PASSED++))
else
    ((FAILED++))
fi

KNOBS=(
    "chunk_ms"
    "vad_threshold\|vad_sensitivity"
    "sample_rate"
)

for knob in "${KNOBS[@]}"; do
    ((TOTAL++))
    if check_exists "  Knob: $knob" "$knob"; then
        ((PASSED++))
    else
        ((FAILED++))
    fi
done

((TOTAL++))
if check_exists "Apply/Reset/Save buttons" "Apply.*Reset.*Save\|Apply Changes"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# ============================================
# LEVEL 3: METRIC EDITOR (Optional check)
# ============================================
echo ""
echo "============================================"
echo "LEVEL 3: METRIC EDITOR"
echo "============================================"

((TOTAL++))
if check_exists "Level 3 implementation" "level3\|metric-editor\|Metric Editor"; then
    ((PASSED++))

    # Additional Level 3 checks if implemented
    echo "  Checking Level 3 components..."

    ((TOTAL++))
    if check_exists "  Current Value display" "Current Value\|current-value"; then
        ((PASSED++))
    else
        ((FAILED++))
    fi

    ((TOTAL++))
    if check_exists "  Range Configuration" "Range Configuration\|Legal Range.*Preferred Range"; then
        ((PASSED++))
    else
        ((FAILED++))
    fi

    ((TOTAL++))
    if check_exists "  Historical Graph" "Historical Graph\|Last 60 seconds"; then
        ((PASSED++))
    else
        ((FAILED++))
    fi

    ((TOTAL++))
    if check_exists "  Influencing Knobs" "Influencing Knobs\|click to adjust"; then
        ((PASSED++))
    else
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⚠${NC} Level 3 not implemented (optional)"
    ((FAILED++))
fi

# ============================================
# TECHNICAL REQUIREMENTS
# ============================================
echo ""
echo "============================================"
echo "TECHNICAL REQUIREMENTS"
echo "============================================"

((TOTAL++))
if check_exists "Socket.IO implementation" "socket.io\|io('"; then
    ((PASSED++))
else
    ((FAILED++))
fi

((TOTAL++))
if check_exists "Dark theme CSS" "background.*#0a0a0a\|background.*#1a1a1a\|--bg-primary"; then
    ((PASSED++))
else
    ((FAILED++))
fi

((TOTAL++))
if check_exists "Responsive design" "@media\|grid-template-columns.*repeat"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# ============================================
# METRIC DISTRIBUTION CHECK
# ============================================
echo ""
echo "============================================"
echo "METRIC DISTRIBUTION (75 Metrics)"
echo "============================================"

echo "Checking if stations have appropriate metrics..."

# Station 1-4 should have audio metrics
((TOTAL++))
if ssh azureuser@20.170.155.53 "grep -q 'station-[1-4].*audioQuality\|station-[1-4].*snr\|station-[1-4].*mos' $DASHBOARD_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Voice stations (1-4) have audio metrics"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} Voice stations may not have proper audio metrics"
fi

# Station 5-7 should NOT have audio metrics (text only)
((TOTAL++))
if ! ssh azureuser@20.170.155.53 "grep -q 'station-[5-7].*audioQuality' $DASHBOARD_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Text stations (5-7) correctly have no audio metrics"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Text stations incorrectly have audio metrics"
    ((FAILED++))
fi

# ============================================
# SUMMARY
# ============================================
echo ""
echo "============================================"
echo "GAP ANALYSIS SUMMARY"
echo "============================================"

PERCENTAGE=$((PASSED * 100 / TOTAL))

echo "Total Requirements: $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "Completion: $PERCENTAGE%"
echo ""

if [ $PERCENTAGE -ge 90 ]; then
    echo -e "${GREEN}EXCELLENT: Dashboard meets most requirements!${NC}"
elif [ $PERCENTAGE -ge 75 ]; then
    echo -e "${GREEN}GOOD: Dashboard is mostly complete${NC}"
elif [ $PERCENTAGE -ge 50 ]; then
    echo -e "${YELLOW}NEEDS WORK: Dashboard is partially complete${NC}"
else
    echo -e "${RED}SIGNIFICANT GAPS: Major work needed${NC}"
fi

echo ""
echo "============================================"
echo "KEY MISSING ITEMS:"
echo "============================================"

# List critical missing items
if [ $FAILED -gt 0 ]; then
    echo "Review the failed items above marked with ✗"
else
    echo -e "${GREEN}No critical items missing!${NC}"
fi

echo ""
echo "Script completed: $(date)"
echo "=========================================="

# Save results to file
REPORT_FILE="/tmp/gap-analysis-$(date +%Y%m%d-%H%M%S).txt"
echo "Saving detailed report to: $REPORT_FILE"

# Exit with error code if completion is less than 90%
if [ $PERCENTAGE -lt 90 ]; then
    exit 1
else
    exit 0
fi