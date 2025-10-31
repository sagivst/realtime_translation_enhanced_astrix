#!/bin/bash
# Integration script for bidirectional translation

echo '=== Integrating Bidirectional Translation ==='
echo ''

cd ~/translation-app

# Add helper function to audiosocket-integration.js
echo '1. Adding getPairedExtension helper function...'
cat > /tmp/helper-function.txt << 'EOFHELPER'

// Bidirectional Translation: Extension pairing logic
const extensionPairs = new Map(); // key: extension, value: paired extension

function getPairedExtension(extension) {
    return extensionPairs.get(extension);
}

function registerExtensionPair(ext1, ext2) {
    extensionPairs.set(ext1, ext2);
    extensionPairs.set(ext2, ext1);
    console.log(`[BiDir] Registered pair: ${ext1} ↔ ${ext2}`);
    
    // Notify timing server
    if (global.timingClient) {
        global.timingClient.registerPair(ext1, ext2, `session-${Date.now()}`);
    }
}

EOFHELPER

# Insert helper function near the top of audiosocket-integration.js (after imports)
sed -i '/^const io = getIO();/r /tmp/helper-function.txt' audiosocket-integration.js
echo '  ✓ Helper function added'

# Add timing server integration after pipeline complete
echo '2. Adding timing server integration after pipeline...'
LINE_NUM=$(grep -n "Calculate total pipeline time" audiosocket-integration.js | head -1 | cut -d: -f1)
LINE_NUM=$((LINE_NUM + 10))  # Add after total time calculation

sed -i "${LINE_NUM}r /tmp/timing-injection.txt" audiosocket-integration.js
echo "  ✓ Timing integration added at line $LINE_NUM"

# Verify changes
echo ''
echo '3. Verifying integration...'
grep -c "timingClient" audiosocket-integration.js > /dev/null && echo '  ✓ timingClient references found' || echo '  ✗ timingClient not found'
grep -c "getPairedExtension" audiosocket-integration.js > /dev/null && echo '  ✓ getPairedExtension function found' || echo '  ✗ getPairedExtension not found'
grep -c "registerExtensionPair" audiosocket-integration.js > /dev/null && echo '  ✓ registerExtensionPair function found' || echo '  ✗ registerExtensionPair not found'

echo ''
echo '=== Integration Complete ==='
echo ''
echo 'Next steps:'
echo '  1. Update dialplan to register pairs'
echo '  2. Start timing server: node bidirectional-timing-server.js'
echo '  3. Restart conference server: sudo systemctl restart translation-server'
