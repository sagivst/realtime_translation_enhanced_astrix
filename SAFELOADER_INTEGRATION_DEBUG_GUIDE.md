# SafeLoader Integration Debugging Guide

## Current Status: Integration Failed - System Recovered

**Date**: December 2, 2025
**Issue**: SafeLoader integration at lines 21-137 caused STTTTSserver to fail completely
**Resolution**: System restored from GitHub repository and operational

---

## 1. Integration Failure Analysis

### 1.1 What Happened
- **Attempted**: Integration of StationKnobSafeLoader into STTTTSserver.js
- **Result**: Complete server failure - dashboard became inaccessible
- **Error Location**: Lines 21-137 of the integrated STTTTSserver.js
- **Recovery**: Restored from GitHub repository version

### 1.2 Likely Causes of Failure

#### A. Module Loading Issues
```javascript
// Problematic code (lines 21-22):
const { StationKnobSafeLoader, STTTTSserverIntegration } = require('./StationKnobSafeLoader');
```
**Issues**:
- File might not exist at expected path
- Module exports might not match destructuring pattern
- Missing dependencies in StationKnobSafeLoader.js

#### B. Initialization Timing
```javascript
// Lines 23-24:
const safeLoader = new StationKnobSafeLoader();
const knobIntegration = new STTTTSserverIntegration(safeLoader);
```
**Issues**:
- Classes might be instantiated before required dependencies are loaded
- Constructor might throw errors if config directory doesn't exist
- Missing error handling during initialization

#### C. Function Definition Conflicts
```javascript
// Lines 26-89: getCurrentSystemKnobs function
function getCurrentSystemKnobs() {
  // 113 knob definitions...
}
```
**Issues**:
- Function might already exist in STTTTSserver.js
- Large inline function could cause parsing issues
- Missing return statement or syntax error

---

## 2. Debugging Steps

### 2.1 Pre-Integration Verification

```bash
# 1. Check if SafeLoader files exist
ssh azureuser@20.170.155.53 "ls -la /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/StationKnobSafeLoader.js"

# 2. Test SafeLoader module independently
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && node -e \"try { require('./StationKnobSafeLoader'); console.log('Module loads OK'); } catch(e) { console.log('Error:', e.message); }\""

# 3. Check for syntax errors in integration
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && node --check STTTTSserver.js"
```

### 2.2 Gradual Integration Approach

Instead of adding all 137 lines at once, integrate in stages:

#### Stage 1: Test Module Loading Only
```javascript
// Add only this at the top of STTTTSserver.js
console.log('[SafeLoader] Testing module load...');
try {
  const StationKnobSafeLoader = require('./StationKnobSafeLoader');
  console.log('[SafeLoader] Module loaded successfully');
} catch (error) {
  console.error('[SafeLoader] Module load failed:', error.message);
}
```

#### Stage 2: Test Class Instantiation
```javascript
// If Stage 1 works, add:
try {
  const { StationKnobSafeLoader } = require('./StationKnobSafeLoader');
  const safeLoader = new StationKnobSafeLoader();
  console.log('[SafeLoader] Instance created successfully');
} catch (error) {
  console.error('[SafeLoader] Instantiation failed:', error.message);
}
```

#### Stage 3: Add Helper Functions
```javascript
// If Stage 2 works, add getCurrentSystemKnobs function
function getCurrentSystemKnobs() {
  console.log('[SafeLoader] Getting system knobs...');
  return {
    'agc.enabled': true,
    // ... rest of knobs
  };
}
```

#### Stage 4: Add Integration Function
```javascript
// Finally, add loadStationConfiguration
function loadStationConfiguration(stationId, extension) {
  console.log(`[SafeLoader] Loading config for ${stationId}-${extension}`);
  // Implementation...
}
```

---

## 3. Common Integration Problems & Solutions

### Problem 1: Module Not Found
```
Error: Cannot find module './StationKnobSafeLoader'
```
**Solution**:
```bash
# Ensure file exists in correct location
cp StationKnobSafeLoader.js /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/
```

### Problem 2: Export Mismatch
```
TypeError: StationKnobSafeLoader is not a constructor
```
**Solution**:
```javascript
// Check exports in StationKnobSafeLoader.js
module.exports = {
  StationKnobSafeLoader: StationKnobSafeLoader,
  STTTTSserverIntegration: STTTTSserverIntegration
};
```

### Problem 3: Missing Dependencies
```
Error: Cannot find module 'fs' or 'path'
```
**Solution**:
```bash
# Install missing dependencies
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
npm install
```

### Problem 4: Syntax Errors
```
SyntaxError: Unexpected token
```
**Solution**:
- Check for missing commas in knob object
- Verify all brackets are closed
- Ensure no duplicate function definitions

---

## 4. Safe Integration Script

Create `safe-integrate-safeloader.sh`:

```bash
#!/bin/bash

STTTS_DIR="/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver"
BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "🔧 Safe SafeLoader Integration Process"
echo "======================================"

# Step 1: Create backup
echo "1. Creating backup..."
cp $STTTS_DIR/STTTTSserver.js $STTTS_DIR/STTTTSserver.js.backup-$BACKUP_TIMESTAMP

# Step 2: Test current server
echo "2. Testing current server..."
node --check $STTTS_DIR/STTTTSserver.js || { echo "❌ Current server has syntax errors!"; exit 1; }

# Step 3: Test SafeLoader module
echo "3. Testing SafeLoader module..."
node -e "require('$STTTS_DIR/StationKnobSafeLoader')" || { echo "❌ SafeLoader module failed!"; exit 1; }

# Step 4: Create test integration
echo "4. Creating test integration file..."
cp $STTTS_DIR/STTTTSserver.js $STTTS_DIR/STTTTSserver-test.js

# Step 5: Add integration header (minimal)
echo "5. Adding minimal integration..."
cat << 'EOF' > integration-minimal.js
// Minimal SafeLoader integration for testing
console.log('[SafeLoader] Starting integration test...');
try {
  const safeLoaderModule = require('./StationKnobSafeLoader');
  console.log('[SafeLoader] Module loaded');
  global.safeLoaderAvailable = true;
} catch (e) {
  console.error('[SafeLoader] Failed:', e.message);
  global.safeLoaderAvailable = false;
}

EOF

# Step 6: Prepend to test file
cat integration-minimal.js $STTTS_DIR/STTTTSserver-test.js > $STTTS_DIR/STTTTSserver-integrated.js

# Step 7: Test integrated version
echo "6. Testing integrated version..."
node --check $STTTS_DIR/STTTTSserver-integrated.js || { echo "❌ Integration failed syntax check!"; exit 1; }

# Step 8: Dry run
echo "7. Dry run (5 seconds)..."
timeout 5 node $STTTS_DIR/STTTTSserver-integrated.js > /tmp/safeloader-test.log 2>&1
if grep -q "error\|Error\|ERROR" /tmp/safeloader-test.log; then
  echo "❌ Errors detected in dry run!"
  cat /tmp/safeloader-test.log
  exit 1
fi

echo "✅ Integration test passed!"
echo ""
echo "Next steps:"
echo "1. Review /tmp/safeloader-test.log"
echo "2. If looks good, replace STTTTSserver.js with STTTTSserver-integrated.js"
echo "3. Restart STTTTSserver service"
echo "4. Monitor logs at /tmp/STTTTSserver.log"
```

---

## 5. Monitoring During Integration

### Real-time Log Monitoring
```bash
# Terminal 1: Watch server log
ssh azureuser@20.170.155.53 "tail -f /tmp/STTTTSserver.log"

# Terminal 2: Watch system resources
ssh azureuser@20.170.155.53 "top -p \$(pgrep -f STTTTSserver)"

# Terminal 3: Test dashboard
watch -n 2 'curl -s -o /dev/null -w "%{http_code}" http://20.170.155.53:3020/dashboard.html'
```

### Health Check Script
```bash
#!/bin/bash
# health-check.sh

check_service() {
  if ps aux | grep -v grep | grep -q "$1"; then
    echo "✅ $1 is running"
  else
    echo "❌ $1 is NOT running"
    return 1
  fi
}

check_http() {
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$1")
  if [ "$STATUS" = "200" ]; then
    echo "✅ $1 responds with 200"
  else
    echo "❌ $1 responds with $STATUS"
    return 1
  fi
}

echo "System Health Check"
echo "==================="
check_service "STTTTSserver"
check_service "gateway-3333"
check_service "gateway-4444"
check_service "ari-gstreamer"
check_http "http://20.170.155.53:3020/dashboard.html"
```

---

## 6. Recovery Procedure (If Integration Fails)

### Immediate Recovery
```bash
# 1. Kill broken process
ssh azureuser@20.170.155.53 "pkill -f STTTTSserver"

# 2. Restore from backup
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && \
  cp STTTTSserver.js.backup-* STTTTSserver.js"

# 3. Restart service
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && \
  nohup node STTTTSserver.js > /tmp/STTTTSserver.log 2>&1 &"

# 4. Verify dashboard
curl -I http://20.170.155.53:3020/dashboard.html
```

### Full System Recovery (Last Resort)
```bash
# Download from GitHub
wget https://raw.githubusercontent.com/sagivst/realtime_translation_enhanced_astrix/working-full-cycle-timing-sync/STTTTSserver/STTTTSserver.js

# Upload and restart
scp STTTTSserver.js azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && \
  pkill -f STTTTSserver; sleep 2; \
  nohup node STTTTSserver.js > /tmp/STTTTSserver.log 2>&1 &"
```

---

## 7. Alternative Integration Approach

Instead of modifying STTTTSserver.js directly, consider a wrapper approach:

### SafeLoader Wrapper (STTTTSserver-wrapper.js)
```javascript
// STTTTSserver-wrapper.js
const { StationKnobSafeLoader } = require('./StationKnobSafeLoader');

// Initialize SafeLoader
const safeLoader = new StationKnobSafeLoader();

// Inject into global scope for STTTTSserver to use
global.StationKnobSafeLoader = safeLoader;
global.loadStationConfiguration = function(stationId, extension) {
  console.log(`[SafeLoader] Loading ${stationId}-${extension}`);
  // Implementation...
};

// Now load the original STTTTSserver
require('./STTTTSserver-original.js');
```

This approach:
- Keeps original STTTTSserver.js unchanged
- Easier to debug and rollback
- Clear separation of concerns

---

## 8. Lessons Learned

### DO:
- ✅ Always create backups before integration
- ✅ Test modules independently first
- ✅ Use gradual integration approach
- ✅ Monitor logs during integration
- ✅ Have recovery plan ready
- ✅ Test in development environment first

### DON'T:
- ❌ Add 100+ lines of code at once
- ❌ Skip syntax checking
- ❌ Ignore error messages
- ❌ Integrate without backups
- ❌ Modify production directly

---

## 9. Next Steps for Safe Integration

1. **Set up test environment**
   - Clone STTTTSserver to test directory
   - Run integration tests there first

2. **Fix identified issues**
   - Ensure StationKnobSafeLoader.js exports correct structure
   - Add error handling to all integration points
   - Validate all 113 knobs syntax

3. **Use wrapper approach**
   - Create STTTTSserver-wrapper.js
   - Test wrapper independently
   - Gradually migrate functionality

4. **Document integration**
   - Record exact changes made
   - Note any configuration required
   - Create rollback procedure

5. **Test thoroughly**
   - Run for extended period in test
   - Simulate various load conditions
   - Verify all 16 stations work

---

## Support Information

**GitHub Repository**: https://github.com/sagivst/realtime_translation_enhanced_astrix
**Branch**: working-full-cycle-timing-sync
**Backup Location**: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/`
**Log Files**: `/tmp/STTTTSserver.log`
**Dashboard**: http://20.170.155.53:3020/dashboard.html

---

*Document Created: December 2, 2025*
*Status: System Operational - SafeLoader Not Integrated*