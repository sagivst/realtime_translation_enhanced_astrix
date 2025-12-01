#!/bin/bash

echo "=========================================="
echo "Verifying Enhanced Dashboard"
echo "=========================================="

# Extract station definitions from dashboard
echo "Checking station definitions in HTML..."
ssh azureuser@20.170.155.53 "grep -E 'station-[0-9]+' /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html | grep 'Station' | grep -v '//' | head -20"

echo ""
echo "Station Configuration Summary:"
echo "------------------------------"

for i in {1..11}; do
    count=$(ssh azureuser@20.170.155.53 "grep -c \"station-$i\" /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html" 2>/dev/null)
    if [ "$count" -gt 0 ]; then
        echo "✅ Station $i: Found ($count references)"
    else
        echo "❌ Station $i: NOT FOUND"
    fi
done

echo ""
echo "Grid Layout:"
ssh azureuser@20.170.155.53 "grep 'grid-template-columns' /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html | head -1"

echo ""
echo "=========================================="
echo "Dashboard URL:"
echo "http://20.170.155.53:3021/monitoring-tree-dashboard.html"
echo "=========================================="