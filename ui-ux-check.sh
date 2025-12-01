#!/bin/bash

# ============================================
# UI/UX COMPLIANCE CHECK
# Based on specification wireframe
# ============================================

echo "=========================================="
echo "UI/UX COMPLIANCE CHECK"
echo "Date: $(date)"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DASHBOARD_FILE="/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html"

# Counters
TOTAL=0
PASSED=0
FAILED=0

# Check function
check_ui() {
    local description="$1"
    local command="$2"

    ((TOTAL++))

    result=$(ssh azureuser@20.170.155.53 "$command" 2>/dev/null)

    if [[ -n "$result" ]] && [[ "$result" != "0" ]]; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $description"
        ((FAILED++))
        return 1
    fi
}

echo "============================================"
echo "VISUAL HIERARCHY & LAYOUT"
echo "============================================"

check_ui "Dark theme background (#0a0a0a)" \
    "grep -c 'background: #0a0a0a' $DASHBOARD_FILE"

check_ui "Secondary background (#1a1a1a)" \
    "grep -c '#1a1a1a' $DASHBOARD_FILE"

check_ui "Border colors (#333)" \
    "grep -c '#333\\|#2a2a2a' $DASHBOARD_FILE"

check_ui "Grid-based layout" \
    "grep -c 'display: grid' $DASHBOARD_FILE"

check_ui "Proper spacing (padding/margin)" \
    "grep -c 'padding:\\|margin:' $DASHBOARD_FILE"

echo ""
echo "============================================"
echo "TYPOGRAPHY"
echo "============================================"

check_ui "Monospace font (SF Mono/Monaco/Consolas)" \
    "grep -c 'SF Mono\\|Monaco\\|Consolas' $DASHBOARD_FILE"

check_ui "Font size hierarchy (11px-14px)" \
    "grep -c 'font-size: 1[1-4]px' $DASHBOARD_FILE"

check_ui "Text color (#e0e0e0)" \
    "grep -c '#e0e0e0' $DASHBOARD_FILE"

check_ui "Secondary text color (#a0a0a0/#6b7280)" \
    "grep -c '#a0a0a0\\|#6b7280' $DASHBOARD_FILE"

echo ""
echo "============================================"
echo "COLOR SCHEME COMPLIANCE"
echo "============================================"

check_ui "Success color green (#00c851)" \
    "grep -c '#00c851' $DASHBOARD_FILE"

check_ui "Warning color yellow (#ffbb33)" \
    "grep -c '#ffbb33' $DASHBOARD_FILE"

check_ui "Danger color red (#ff3547)" \
    "grep -c '#ff3547' $DASHBOARD_FILE"

check_ui "Info color blue (#33b5e5)" \
    "grep -c '#33b5e5' $DASHBOARD_FILE"

echo ""
echo "============================================"
echo "STATION CARD DESIGN"
echo "============================================"

check_ui "Compact card design (min-height: 100px)" \
    "grep -c 'min-height: 100px' $DASHBOARD_FILE"

check_ui "Card borders (1px solid)" \
    "grep -c 'border: 1px solid' $DASHBOARD_FILE"

check_ui "Border radius (2-4px)" \
    "grep -c 'border-radius: [2-4]px' $DASHBOARD_FILE"

check_ui "Hover effects" \
    "grep -c ':hover' $DASHBOARD_FILE"

check_ui "Transition animations" \
    "grep -c 'transition:' $DASHBOARD_FILE"

echo ""
echo "============================================"
echo "INTERACTIVE ELEMENTS"
echo "============================================"

check_ui "Clickable expand buttons" \
    "grep -c 'onclick=\\|cursor: pointer' $DASHBOARD_FILE"

check_ui "Button hover states" \
    "grep -c 'btn:hover\\|button:hover' $DASHBOARD_FILE"

check_ui "Status indicators (dots)" \
    "grep -c 'border-radius: 50%' $DASHBOARD_FILE"

check_ui "Pulse animation for status" \
    "grep -c '@keyframes pulse\\|animation.*pulse' $DASHBOARD_FILE"

echo ""
echo "============================================"
echo "LEVEL 2 UI COMPONENTS"
echo "============================================"

check_ui "Overlay/modal design" \
    "grep -c 'position: fixed\\|z-index: 1000' $DASHBOARD_FILE"

check_ui "Waveform visualization" \
    "grep -c 'waveform\\|wave-bar' $DASHBOARD_FILE"

check_ui "Progress bars" \
    "grep -c 'metric-bar\\|bar-fill' $DASHBOARD_FILE"

check_ui "Slider controls" \
    "grep -c 'slider\\|thumb' $DASHBOARD_FILE"

check_ui "Edit buttons/links" \
    "grep -c 'Edit\\|edit' $DASHBOARD_FILE"

echo ""
echo "============================================"
echo "RESPONSIVE DESIGN"
echo "============================================"

if ssh azureuser@20.170.155.53 "grep -q '@media' $DASHBOARD_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Media queries present"
    ((PASSED++))
    ((TOTAL++))

    # Check specific breakpoints
    check_ui "  Tablet breakpoint" \
        "grep -c '@media.*1400px\\|@media.*1200px' $DASHBOARD_FILE"

    check_ui "  Mobile breakpoint" \
        "grep -c '@media.*1000px\\|@media.*800px' $DASHBOARD_FILE"
else
    echo -e "${YELLOW}⚠${NC} No responsive breakpoints defined"
    ((TOTAL++))
fi

echo ""
echo "============================================"
echo "ACCESSIBILITY & USABILITY"
echo "============================================"

check_ui "Title attributes for buttons" \
    "grep -c 'title=' $DASHBOARD_FILE"

check_ui "Semantic HTML structure" \
    "grep -c '<header>\\|<main>\\|<section>\\|class=\"header\"' $DASHBOARD_FILE"

check_ui "Clear visual hierarchy" \
    "grep -c 'font-weight: bold' $DASHBOARD_FILE"

check_ui "Consistent spacing units" \
    "grep -c '[0-9]px' $DASHBOARD_FILE"

echo ""
echo "============================================"
echo "SPECIFICATION COMPLIANCE"
echo "============================================"

# Check against specific wireframe requirements
echo "Checking wireframe compliance..."

# Expected layout: 4-4-3 grid
check_ui "4-column grid for rows 1-2" \
    "grep -c 'repeat(4' $DASHBOARD_FILE"

check_ui "3-column grid for row 3" \
    "grep -c 'repeat(3\\|row-3' $DASHBOARD_FILE"

# Compact station format
check_ui "Station number format (1. 2. 3.)" \
    "grep -c 'station-num' $DASHBOARD_FILE"

check_ui "Station name format" \
    "grep -c 'station-name' $DASHBOARD_FILE"

# Status indicators
check_ui "ON/OFF status text" \
    "grep -c 'ON\\|OFF' $DASHBOARD_FILE"

check_ui "Status dots/icons" \
    "grep -c 'status-icon\\|status-dot' $DASHBOARD_FILE"

# Metrics format
check_ui "Metric labels with colons" \
    "grep -c 'metric-label' $DASHBOARD_FILE"

check_ui "Metric values" \
    "grep -c 'metric-value' $DASHBOARD_FILE"

echo ""
echo "============================================"
echo "VISUAL CONSISTENCY CHECK"
echo "============================================"

# Count different font sizes
echo -e "${BLUE}Font sizes used:${NC}"
ssh azureuser@20.170.155.53 "grep -o 'font-size: [0-9]*px' $DASHBOARD_FILE | sort -u" 2>/dev/null

# Count different colors
echo ""
echo -e "${BLUE}Colors used:${NC}"
ssh azureuser@20.170.155.53 "grep -o '#[0-9a-fA-F]\\{6\\}\\|#[0-9a-fA-F]\\{3\\}' $DASHBOARD_FILE | sort -u | head -10" 2>/dev/null

# Count different spacings
echo ""
echo -e "${BLUE}Common spacing values:${NC}"
ssh azureuser@20.170.155.53 "grep -o 'padding: [0-9]*px\\|margin: [0-9]*px' $DASHBOARD_FILE | sort | uniq -c | sort -rn | head -5" 2>/dev/null

echo ""
echo "============================================"
echo "UI/UX COMPLIANCE SUMMARY"
echo "============================================"

PERCENTAGE=$((PASSED * 100 / TOTAL))

echo "Total UI/UX Checks: $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "UI/UX Compliance: $PERCENTAGE%"
echo ""

if [ $PERCENTAGE -ge 90 ]; then
    echo -e "${GREEN}EXCELLENT UI/UX: Matches specification closely!${NC}"
elif [ $PERCENTAGE -ge 75 ]; then
    echo -e "${GREEN}GOOD UI/UX: Minor improvements needed${NC}"
elif [ $PERCENTAGE -ge 50 ]; then
    echo -e "${YELLOW}FAIR UI/UX: Several areas need attention${NC}"
else
    echo -e "${RED}POOR UI/UX: Significant redesign needed${NC}"
fi

echo ""
echo "============================================"
echo "UI/UX RECOMMENDATIONS"
echo "============================================"

if [ $FAILED -gt 0 ]; then
    echo "Areas for improvement:"

    # Check specific missing elements
    if ! ssh azureuser@20.170.155.53 "grep -q '@media' $DASHBOARD_FILE" 2>/dev/null; then
        echo "- Add responsive breakpoints for tablet/mobile"
    fi

    if ! ssh azureuser@20.170.155.53 "grep -q 'min-height: 100px' $DASHBOARD_FILE" 2>/dev/null; then
        echo "- Make station cards more compact (100px height)"
    fi

    if ! ssh azureuser@20.170.155.53 "grep -q 'border-radius: [2-3]px' $DASHBOARD_FILE" 2>/dev/null; then
        echo "- Use subtle border-radius (2-3px) for cleaner look"
    fi

    # Color consistency
    color_count=$(ssh azureuser@20.170.155.53 "grep -o '#[0-9a-fA-F]\\{6\\}' $DASHBOARD_FILE | sort -u | wc -l" 2>/dev/null)
    if [ "$color_count" -gt 15 ]; then
        echo "- Reduce color palette (currently using $color_count colors)"
    fi

    # Font consistency
    font_count=$(ssh azureuser@20.170.155.53 "grep -o 'font-size: [0-9]*px' $DASHBOARD_FILE | sort -u | wc -l" 2>/dev/null)
    if [ "$font_count" -gt 8 ]; then
        echo "- Reduce font size variations (currently using $font_count sizes)"
    fi
else
    echo -e "${GREEN}UI/UX fully compliant with specification!${NC}"
fi

echo ""
echo "Dashboard URL: http://20.170.155.53:3021/monitoring-tree-dashboard.html"
echo "Script completed: $(date)"
echo "=========================================="

exit 0