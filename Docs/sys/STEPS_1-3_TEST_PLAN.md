# Steps 1-3 Testing & Verification Plan
**Date:** 2025-11-11
**VM:** azureuser@20.170.155.53
**Services:** Gateway (PID 213948), Conference Server (PID 215291)

---

## Service Status ✅

```bash
# Gateway: PID 213948 ✓ Running
# Conference Server: PID 215291 ✓ Running
# Port 3002: LISTENING ✓
```

---

## Test Plan Overview

| Step | Component | Test Method | Expected Result | Status |
|------|-----------|-------------|-----------------|--------|
| 1 | Socket.IO Handlers | Dashboard interaction | Console logs appear | 🔍 To Test |
| 2 | Latency Broadcasting | Active call monitoring | Mirror values on dashboards | 🔍 To Test |
| 3 | Settings Storage | Dashboard controls | Settings persist | 🔍 To Test |

---

## STEP 1: Socket.IO Event Handlers Test

### Test Objective
Verify that Socket.IO event handlers receive and log dashboard control interactions.

### Implementation Location
- **File:** `conference-server-externalmedia.js`
- **Lines:** 2078-2116
- **Handlers:**
  - `setAutoSync` (line 2078)
  - `setManualLatency` (line 2096)
  - `requestAudioMonitor` (line 2114)

### Test Procedure

#### 1. Monitor Server Logs (Real-time)
```bash
# SSH to VM
ssh azureuser@20.170.155.53

# Monitor conference server output
cd /home/azureuser/translation-app/7777-8888-stack

# Check if running in tmux/screen or as daemon
ps -fp 215291

# If running in background, check journalctl or redirect output
# Option A: Restart with logging
pkill -f conference-server-externalmedia.js
node conference-server-externalmedia.js 2>&1 | tee conference-test.log &

# Option B: Check existing logs
tail -f translation-server.log | grep -E 'setAutoSync|setManualLatency|requestAudioMonitor|Buffer Settings'
```

#### 2. Access Dashboard
```
URL: http://20.170.155.53:3002/dashboard-latency-sync.html?ext=7777
```

#### 3. Test Auto Sync Toggle
**Action:** Click "Auto Sync" toggle ON/OFF

**Expected Console Log:**
```
[Latency Dashboard] setAutoSync received for extension 7777: true
[Buffer Settings] Extension 7777 autoSync set to true
```

**Verification Code (conference-server-externalmedia.js:2078-2086):**
```javascript
socket.on('setAutoSync', (data) => {
  const { extension, enabled } = data;
  console.log(`[Latency Dashboard] setAutoSync received for extension ${extension}:`, enabled);

  // STEP 3: Store the setting
  const settings = extensionBufferSettings.get(extension) || { autoSync: false, manualLatencyMs: 0 };
  settings.autoSync = enabled;
  extensionBufferSettings.set(extension, settings);
  console.log(`[Buffer Settings] Extension ${extension} autoSync set to ${enabled}`);

  callback({ success: true, message: `Auto sync ${enabled ? 'enabled' : 'disabled'} for extension ${extension}` });
});
```

#### 4. Test Manual Latency Slider
**Action:** Move "Manual Latency" slider (0-500ms)

**Expected Console Log:**
```
[Latency Dashboard] setManualLatency received for extension 7777: 250 ms
[Buffer Settings] Extension 7777 manualLatencyMs set to 250ms
```

**Verification Code (conference-server-externalmedia.js:2096-2104):**
```javascript
socket.on('setManualLatency', (data) => {
  const { extension, latencyMs } = data;
  console.log(`[Latency Dashboard] setManualLatency received for extension ${extension}:`, latencyMs, 'ms');

  // STEP 3: Store the setting
  const settings = extensionBufferSettings.get(extension) || { autoSync: false, manualLatencyMs: 0 };
  settings.manualLatencyMs = latencyMs;
  extensionBufferSettings.set(extension, settings);
  console.log(`[Buffer Settings] Extension ${extension} manualLatencyMs set to ${latencyMs}ms`);

  callback({ success: true, message: `Manual latency set to ${latencyMs}ms for extension ${extension}` });
});
```

#### 5. Test Audio Monitor Request
**Action:** Move "Monitor Speaker Volume" slider

**Expected Console Log:**
```
[Latency Dashboard] requestAudioMonitor received for extension 7777
```

**Note:** Step 5 (audio monitoring) not implemented yet, so no audio will stream.

---

## STEP 2: Latency Broadcasting Test

### Test Objective
Verify that latency values are calculated and broadcast to dashboards with correct signed differences.

### Implementation Location
- **File:** `conference-server-externalmedia.js`
- **Lines:** 1571, 1590, 1468, 1581-1592
- **Functions:**
  - `emitLatencyUpdateToPairedExtension()` (line 1581)
  - `global.io.emit('latencyUpdate', ...)` (lines 1571, 1590)

### Test Procedure

#### 1. Make Test Calls
```bash
# From Asterisk CLI or softphone, establish calls on both extensions
# Extension 7777 ↔ Extension 8888

# Ensure both extensions are actively processing audio
```

#### 2. Open Split Dashboard
```
URL: http://20.170.155.53:3002/dashboard-latency-split.html
```

#### 3. Monitor Latency Values
**Expected Behavior:**
- Both dashboards update in real-time
- "Latency Difference" shows mirror values:
  - Ext 7777: `-200ms` (faster)
  - Ext 8888: `+200ms` (slower)
- Signs are opposite (+/- inverted)
- Absolute values are equal

**Verification Code (conference-server-externalmedia.js:1468, 1581-1592):**
```javascript
// Line 1468: Emit inverted latency to paired extension
emitLatencyUpdateToPairedExtension(pairedExtension, -latencyDifference);

// Lines 1581-1592: Helper function
function emitLatencyUpdateToPairedExtension(pairedExtension, invertedLatencyDifference) {
  const data = {
    extension: pairedExtension,
    buffer: {
      adjustment: Math.round(invertedLatencyDifference)  // ← SIGNED value
    }
  };
  global.io.emit('latencyUpdate', data);
  console.log(`[Latency Sync] Emitted inverted latency to paired extension ${pairedExtension}: ${Math.round(invertedLatencyDifference)}ms`);
}
```

#### 4. Verify Console Logs
**Expected Log Pattern:**
```
[Timing] Extension 7777 E2E Total: 500ms
[Buffer] Extension 7777 is 200ms FASTER (lower latency) than 8888
[Buffer] Target buffer calculated: 200ms (NOT APPLIED YET - STEP 5)
[Latency Sync] Emitted inverted latency to paired extension 8888: +200ms

[Timing] Extension 8888 E2E Total: 700ms
[Buffer] Extension 8888 is 200ms SLOWER (higher latency) than 7777
[Buffer] No buffer needed for slower extension
[Latency Sync] Emitted inverted latency to paired extension 7777: -200ms
```

#### 5. Test Dashboard Display
**Dashboard Elements to Check:**
- "Current Latency": Shows E2E total (e.g., 500ms)
- "Latency Difference": Shows signed difference (e.g., -200ms)
- "Auto Sync Buffer": Shows calculated buffer (e.g., +200ms) when Auto Sync is ON
- "Manual Buffer": Shows slider value (e.g., +50ms)
- "Total Buffer": Sum of Auto + Manual (e.g., 250ms)

---

## STEP 3: Buffer Settings Storage Test

### Test Objective
Verify that dashboard control settings are stored per extension and can be retrieved.

### Implementation Location
- **File:** `conference-server-externalmedia.js`
- **Lines:** 579-586 (storage initialization), 2083-2085, 2101-2103 (storage updates)

### Test Procedure

#### 1. Verify Storage Initialization
**Check Code (conference-server-externalmedia.js:579-586):**
```javascript
// STEP 3: Extension buffer settings storage
const extensionBufferSettings = new Map();

// Initialize with defaults (autoSync: true per user request)
extensionBufferSettings.set('7777', { autoSync: true, manualLatencyMs: 0 });
extensionBufferSettings.set('8888', { autoSync: true, manualLatencyMs: 0 });

console.log('[Buffer Settings] Initialized with defaults:', {
  '7777': extensionBufferSettings.get('7777'),
  '8888': extensionBufferSettings.get('8888')
});
```

**Expected Server Startup Log:**
```
[Buffer Settings] Initialized with defaults: { '7777': { autoSync: true, manualLatencyMs: 0 }, '8888': { autoSync: true, manualLatencyMs: 0 } }
```

#### 2. Test Settings Update (Extension 7777)
**Action Sequence:**
1. Open dashboard: `http://20.170.155.53:3002/dashboard-latency-sync.html?ext=7777`
2. Toggle "Auto Sync" OFF
3. Set "Manual Latency" to 150ms

**Expected Storage State (in memory):**
```javascript
extensionBufferSettings.get('7777')
// → { autoSync: false, manualLatencyMs: 150 }
```

**Expected Console Logs:**
```
[Buffer Settings] Extension 7777 autoSync set to false
[Buffer Settings] Extension 7777 manualLatencyMs set to 150ms
```

#### 3. Test Settings Update (Extension 8888)
**Action Sequence:**
1. Open dashboard: `http://20.170.155.53:3002/dashboard-latency-sync.html?ext=8888`
2. Keep "Auto Sync" ON (default)
3. Set "Manual Latency" to 75ms

**Expected Storage State:**
```javascript
extensionBufferSettings.get('8888')
// → { autoSync: true, manualLatencyMs: 75 }
```

#### 4. Verify Per-Extension Independence
**Test:** Change settings on 7777, verify 8888 unchanged

**Verification Method:**
```bash
# Add temporary debug logging to conference server
# Or use Node.js debugger to inspect extensionBufferSettings Map
```

#### 5. Limitation Check (CRITICAL)
**⚠️ KNOWN ISSUE: Settings NOT retrieved for buffer application**

**Current Gap:**
- Settings are **stored** (lines 2083-2085, 2101-2103) ✅
- Settings are **NOT retrieved** when applying buffer ❌
- Line 1360 onwards: No code reads `extensionBufferSettings.get(extension)`

**This is the PRIMARY gap for Step 4 implementation.**

---

## Test Results Template

### Step 1: Socket.IO Handlers
- [ ] `setAutoSync` logs appear when toggle clicked
- [ ] `setManualLatency` logs appear when slider moved
- [ ] `requestAudioMonitor` logs appear when volume changed
- [ ] Callbacks send success acknowledgments to dashboard

**Status:** ⬜ PASS / ⬜ FAIL / ⬜ PARTIAL
**Notes:** _____________________

---

### Step 2: Latency Broadcasting
- [ ] Dashboard receives `latencyUpdate` events
- [ ] Extension 7777 shows negative value when faster
- [ ] Extension 8888 shows positive value when slower
- [ ] Absolute values match (mirror)
- [ ] Values update in real-time during calls

**Status:** ⬜ PASS / ⬜ FAIL / ⬜ PARTIAL
**Notes:** _____________________

---

### Step 3: Buffer Settings Storage
- [ ] Default settings initialized on server start
- [ ] Auto Sync toggle changes stored
- [ ] Manual Latency slider changes stored
- [ ] Settings independent per extension
- [ ] ⚠️ Settings NOT used for buffer application (expected gap)

**Status:** ⬜ PASS / ⬜ FAIL / ⬜ PARTIAL
**Notes:** _____________________

---

## Troubleshooting

### No Console Logs Appearing
```bash
# Check if server is writing to stdout/stderr
ps -fp 215291

# If running as daemon, restart with explicit logging:
cd /home/azureuser/translation-app/7777-8888-stack
pkill -f conference-server-externalmedia.js
nohup node conference-server-externalmedia.js > conference-debug.log 2>&1 &

# Monitor new log
tail -f conference-debug.log
```

### Dashboard Not Connecting
```bash
# Verify Socket.IO connection
curl http://20.170.155.53:3002/socket.io/?EIO=4&transport=polling

# Should return: {"sid":"...","upgrades":["websocket"],"pingInterval":...}
```

### Settings Not Persisting
**Expected:** Settings only persist in memory (Map), not disk
**On Server Restart:** Settings reset to defaults
**This is normal for current implementation**

---

## Next Steps After Testing

1. **If Step 1 PASS:** Socket.IO communication verified ✅
2. **If Step 2 PASS:** Latency calculation and broadcasting working ✅
3. **If Step 3 PASS:** Settings storage infrastructure ready ✅
4. **Proceed to:** Step 4 implementation (retrieve settings + apply buffer)

---

## Quick Test Commands

```bash
# 1. SSH to VM
ssh azureuser@20.170.155.53

# 2. Monitor logs in real-time
cd /home/azureuser/translation-app/7777-8888-stack
tail -f translation-server.log | grep -E 'Buffer Settings|Latency Dashboard|Latency Sync'

# 3. Open dashboard in browser
# http://20.170.155.53:3002/dashboard-latency-split.html

# 4. Interact with controls and watch logs

# 5. Make test calls to see latency broadcasting
# (Requires active SIP calls on extensions 7777 and 8888)
```
