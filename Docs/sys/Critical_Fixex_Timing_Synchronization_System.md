# UNIFIED FIX DOCUMENT: 3333/4444 Timing & Synchronization System
## Critical Issues & Required Fixes for Full Bidirectional Sync

**Document Version:** 1.0
**Date:** 2025-11-24
**System:** 3333_4444__Operational Stack
**Focus:** Timing Module & Bidirectional Latency Synchronization
**Status:** 95% Complete - 2 Critical Fixes Required

---

## EXECUTIVE SUMMARY

The 3333/4444 bidirectional translation system has a **fully implemented timing & buffering module** with all classes, tracking, and synchronization logic operational. However, **2 critical configuration issues** prevent proper bidirectional synchronization between extensions 3333 and 4444.

### The Problem

The system was migrated from a **9007/9008 configuration** but extension identifiers were **only partially updated**:
- ✅ UDP sockets configured for 3333/4444
- ✅ Gain factors set for 3333/4444
- ✅ Audio pipeline working for 3333/4444
- ✅ Timing module classes implemented
- ❌ **Extension pairing still references 9007/9008** ← CRITICAL
- ❌ **QA configs missing for 3333/4444** ← HIGH PRIORITY

### Impact

**Without Fix #1 (Extension Pairing):**
- No bidirectional latency synchronization
- Buffer compensation not applied
- Extensions run independently with no coordination
- Timing module calculates latency but doesn't sync

**Without Fix #2 (QA Configs):**
- Translation direction may default incorrectly
- Language configuration unreliable
- Dashboard QA mode toggle won't work

---

## SYSTEM ARCHITECTURE OVERVIEW

```
┌────────────────────────────────────────────────────────────────┐
│              3333/4444 TIMING & SYNC ARCHITECTURE               │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐   RTP    ┌─────────────────┐   UDP 6120    │
│  │  Asterisk    │◄────────►│  Gateway-3333   │◄──────────────┤
│  │  Ext 3333    │  4000/   │  (GStreamer)    │               │
│  │  (English)   │   4001   │  Buffered       │               │
│  └──────────────┘          └─────────────────┘               │
│                                      │                         │
│                                      │ PCM Audio               │
│                                      ▼                         │
│                          ┌───────────────────────┐            │
│                          │   STTTTSserver.js     │            │
│                          │   Port 3020           │            │
│                          │                       │            │
│                          │  TIMING MODULE:       │            │
│                          │  • ExtensionPairMgr   │← FIX #1    │
│                          │  • LatencyTracker     │            │
│                          │  • AudioBufferMgr     │            │
│                          │  • DashboardTCPAPI    │            │
│                          │                       │            │
│                          │  AI PIPELINE:         │            │
│                          │  • Deepgram ASR       │            │
│                          │  • DeepL MT          │← FIX #2    │
│                          │  • ElevenLabs TTS     │            │
│                          │  • Hume Emotion       │            │
│                          └───────────────────────┘            │
│                                      │                         │
│                                      │ PCM Audio               │
│                                      ▼                         │
│  ┌──────────────┐   RTP    ┌─────────────────┐   UDP 6122    │
│  │  Asterisk    │◄────────►│  Gateway-4444   │◄──────────────┤
│  │  Ext 4444    │  4002/   │  (GStreamer)    │               │
│  │  (French)    │   4003   │  Buffered       │               │
│  └──────────────┘          └─────────────────┘               │
│                                                                  │
│  Dashboard: http://20.170.155.53:3020/dashboard.html           │
│  Card: "End-to-End Translation Latency" (9 serial + 3 parallel)│
│  Sync: Shows latency correction bar with pairing extension     │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

---

## TIMING MODULE IMPLEMENTATION STATUS

### ✅ FULLY IMPLEMENTED COMPONENTS

All timing & buffering module components from the specification document are **100% implemented**:

#### 1. Core Classes (Lines 947-1394)
```javascript
class ExtensionPairManager {
  // Manages bidirectional extension pairing (3333 ↔ 4444)
  registerPair(ext1, ext2)
  getPairedExtension(ext)
  unregisterPair(ext)
}

class LatencyTracker {
  // Tracks latency samples with rolling average (10 samples)
  updateLatency(direction, latencyMs)
  getAverageLatency(direction)
  getCurrentLatencyDifference(ext1, ext2)  // Uses LATEST sample
  updateStageLatency(extension, stageName, latencyMs)
}

class AudioBufferManager {
  // Manages setTimeout-based audio buffering
  bufferAndSend(extension, audioData, delayMs, sendCallback)
  clearBuffer(extension)
}

class DashboardTCPAPI {
  // TCP server on port 6211 for dashboard metrics
  startServer(port)
  broadcastLatencyUpdate(data)
  broadcastStage(extension, stage, duration, stageName)
}
```

#### 2. Pipeline Timing Instrumentation (Lines 2200-2500)

**9 Serial Pipeline Stages Tracked:**
1. Gateway → ASR (AudioSocket → ASR)
2. ASR Processing (Deepgram transcription)
3. ASR → MT (Prepare for translation)
4. MT Processing (DeepL translation)
5. MT → TTS (Prepare for synthesis)
6. TTS Processing (ElevenLabs synthesis)
7. TTS → LS (Prepare for latency sync)
8. LS Processing (Buffer calculation)
9. LS → Bridge (Send to gateway with buffer)

**3 Parallel Pipeline Stages Tracked:**
1. AudioSocket → EV (Emotion Detector)
2. EV Processing (Hume emotion analysis)
3. EV → TTS (Inject emotion into TTS)

**E2E Latency Formula:**
```javascript
timing.e2eTotal = Math.max(timing.serialTotal, timing.parallelTotal);
```

#### 3. Buffer Synchronization Logic (Lines 2359-2430)

```javascript
const pairedExtension = pairManager.getPairedExtension(extension);
const latencyDifference = latencyTracker.getCurrentLatencyDifference(extension, pairedExtension);

// Auto-sync buffer calculation
if (autoSync && latencyDifference !== null && latencyDifference < 0) {
    // This extension is FASTER - needs buffer to sync
    const autoSyncBufferMs = Math.abs(latencyDifference);
    totalBufferMs += autoSyncBufferMs;
}

// Apply buffer via AudioBufferManager
audioBufferManager.bufferAndSend(pairedExtension, pcmAudioBuffer, totalBufferMs, callback);
```

#### 4. Dashboard Integration

**Socket.IO Events:**
- `latencyUpdate` - Per-extension latency metrics
- `transcriptionFinal` - ASR transcription results
- `translationComplete` - MT translation results
- `translated-audio` - TTS audio with timing

**TCP API (Port 6211):**
- Newline-delimited JSON protocol
- `LATENCY_UPDATE` messages
- `STAGE_TIMING` messages
- `BUFFER_APPLIED` messages
- `HEARTBEAT` every 30 seconds

---

## CRITICAL FIXES REQUIRED

### ⚠️ FIX #1: Extension Pairing Configuration

**Priority:** 🔴 **CRITICAL**
**File:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js`
**Line:** 1405
**Impact:** Without this fix, **NO bidirectional sync occurs**

#### Current Code (WRONG):
```javascript
// Auto-pair 9007 and 9008 on startup
pairManager.registerPair('9007', '9008');
```

#### Required Fix:
```javascript
// Auto-pair 3333 and 4444 on startup
pairManager.registerPair('3333', '4444');
```

#### Why This Is Critical

This single line controls the entire bidirectional synchronization system:

1. **Extension Pairing Lookup:**
   ```javascript
   const pairedExtension = pairManager.getPairedExtension('3333');
   // Currently returns: undefined ❌
   // Should return: '4444' ✅
   ```

2. **Latency Difference Calculation:**
   ```javascript
   const latencyDifference = latencyTracker.getCurrentLatencyDifference(extension, pairedExtension);
   // Currently: latencyDifference = null (no paired extension)
   // Should: latencyDifference = -70 (3333 is 70ms faster than 4444)
   ```

3. **Buffer Calculation:**
   ```javascript
   if (autoSync && latencyDifference !== null && latencyDifference < 0) {
       const autoSyncBufferMs = Math.abs(latencyDifference);
       totalBufferMs += autoSyncBufferMs;
   }
   // Currently: Condition fails (latencyDifference === null)
   // Should: Adds 70ms buffer to faster extension
   ```

4. **Audio Routing:**
   ```javascript
   audioBufferManager.bufferAndSend(pairedExtension, pcmAudioBuffer, totalBufferMs, callback);
   // Currently: pairedExtension = undefined, audio not sent
   // Should: pairedExtension = '4444', audio sent after 70ms buffer
   ```

#### Expected Log Output After Fix

**On Server Start:**
```
[PairManager] Registered pair: 3333 ↔ 4444
```

**During First 3333→4444 Utterance:**
```
[Pipeline] Transcribing 32000 bytes from extension 3333...
[Pipeline] Stage 2 (ASR) for 3333: 245ms - "Hello how are you"
[Pipeline] Translating en -> fr: "Hello how are you"
[Pipeline] Stage 4 (MT) for 3333: 180ms - "Bonjour comment allez-vous"
[LatencyDiff-Current] 3333→4444=850ms, 4444→3333=0ms, Δ=null
[Buffer Apply] No latency data yet for synchronization
[Buffer Send] Applying 0ms buffer to 12800 bytes PCM16 for extension 4444
```
*(First utterance has no sync - expected, needs both directions)*

**During First 4444→3333 Utterance:**
```
[LatencyDiff-Current] 4444→3333=920ms, 3333→4444=850ms, Δ=70ms
[Buffer Apply] Extension 4444 is SLOWER by 70ms - no auto-sync buffer needed
[Buffer Send] Applying 0ms buffer to 13440 bytes PCM16 for extension 3333
```

**During Second 3333→4444 Utterance:**
```
[LatencyDiff-Current] 3333→4444=850ms, 4444→3333=920ms, Δ=-70ms
[Buffer Apply] Extension 3333 is FASTER by 70ms
[Buffer Apply] Auto-sync buffer: +70ms
[Buffer Send] Applying 70ms buffer to 12800 bytes PCM16 for extension 4444
```
✅ **Synchronization now active!**

---

### ⚠️ FIX #2: QA Language Configuration

**Priority:** 🟠 **HIGH**
**File:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js`
**After Line:** 1435
**Impact:** Translation direction may default incorrectly

#### Current Code:
```javascript
global.qaConfigs.set('9007', { sourceLang: 'en', targetLang: 'fr', qaMode: false });
```

#### Required Addition:
```javascript
global.qaConfigs.set('3333', { sourceLang: 'en', targetLang: 'fr', qaMode: false });
global.qaConfigs.set('4444', { sourceLang: 'fr', targetLang: 'en', qaMode: false });
console.log('[QA Config] Initialized language settings for extensions 3333/4444');
```

#### What This Configures

**Extension 3333:**
- Source Language: English (`en`)
- Target Language: French (`fr`)
- QA Mode: `false` (translation enabled)
- Direction: English → French

**Extension 4444:**
- Source Language: French (`fr`)
- Target Language: English (`en`)
- QA Mode: `false` (translation enabled)
- Direction: French → English

#### Why This Is Important

1. **Translation Direction Control:**
   ```javascript
   const config = global.qaConfigs.get(extension) || global.qaConfigs.get('9007');
   const targetLang = config.targetLang;
   ```
   Currently falls back to 9007 default config (en→fr) for both extensions.

2. **Dashboard QA Mode Toggle:**
   Dashboard can send `qa-language-config` events to change translation settings per extension. Without proper configs, settings aren't applied.

3. **QA Mode (Same Language Testing):**
   When `sourceLang === targetLang`, no translation occurs (useful for testing ASR/TTS without MT).

#### Expected Log Output After Fix

```
[QA Config] Initialized language settings for extensions 3333/4444
```

---

## DASHBOARD: END-TO-END TRANSLATION LATENCY CARD

**URL:** http://20.170.155.53:3020/dashboard.html
**Focus:** "End-to-End Translation Latency" card (timing & sync visualization)

### Card Structure (CURRENTLY WORKING)

The dashboard card is **already fully implemented** and displays:

#### 1. Serial Pipeline (9 Stages)
- ↓ Server (AudioSocket→ASR)
- ASR (Deepgram)
- ↓ Server (ASR→MT)
- MT (DeepL)
- ↓ Server (MT→TTS)
- TTS (ElevenLabs)
- ↓ Server (TTS→LS)
- LS (Latency Sync)
- ↓ Server (LS→Bridge)

**Total: Displayed as "Serial: XXX ms"**

#### 2. Parallel Pipeline (3 Stages)
- ↓ Server (AudioSocket→EV)
- EV (Hume)
- ↓ Server (EV→TTS)

**Total: Displayed as "Parallel: XXX ms"**

#### 3. Latency Sync Correction Bar
```html
<span id="pairingExtension">----</span> (latency correction)
<div class="sync-bar-fill" id="syncCorrectionBar">0 ms</div>
```

**Currently shows:** `----` (no pairing)
**After Fix #1:** Shows `3333` or `4444` (paired extension)

### Dashboard Socket.IO Handler (Lines 2841-2915)

```javascript
socket.on('latencyUpdate', (data) => {
    // Filter by extension
    if (filterExtension && data.extension !== filterExtension) return;

    // Update service latencies
    if (data.latencies.asr && data.latencies.asr.current > 0) {
        document.getElementById('deepgramLatency').textContent =
            Math.round(data.latencies.asr.current) + 'ms';
    }

    // ... (similar for MT, TTS, E2E)

    // Update latency breakdown bars (9 serial + 3 parallel)
    updateLatencyBars(
        audiosocketToAsr, asr, asrToMt, mt, mtToTts, tts, ttsToLs, ls, lsToBridge,
        audiosocketToEv, hume, evToTts,
        serialTotal, parallelTotal, total
    );

    // Update sync correction bar
    if (data.buffer) {
        updateSyncCorrectionBar(data.buffer.adjustment || 0, data.buffer.reason || '');
    }
});
```

### Sync Correction Bar Update Logic (Lines 3070-3110)

```javascript
function updateSyncCorrectionBar(adjustment, reason) {
    const bar = document.getElementById('syncCorrectionBar');
    const pairingExt = document.getElementById('pairingExtension');

    // Extract paired extension from reason (e.g., "sync_to_4444")
    if (reason && reason.startsWith('sync_to_')) {
        const targetExtension = reason.replace('sync_to_', '');
        if (pairingExt) {
            pairingExt.textContent = targetExtension;  // Shows "3333" or "4444"
        }
    }

    if (adjustment === 0) {
        bar.textContent = '0 ms';
    } else if (adjustment > 0) {
        bar.classList.add('positive');
        bar.textContent = '+' + formatLatency(absAdjustment);
    } else {
        bar.classList.add('negative');
        bar.textContent = '-' + formatLatency(absAdjustment);
    }
}
```

### Dashboard Behavior After Fixes

**Before Fix #1:**
- Pairing Extension: `----`
- Sync Correction: `0 ms` (always zero, no sync)

**After Fix #1:**
- Pairing Extension: `3333` or `4444` (dynamically shows paired partner)
- Sync Correction: `+70 ms` (shows actual buffer applied)
- Bar color: Green (positive adjustment = adding delay)

**Visual Indicators:**
- **Zero (0 ms):** Gray bar, no sync needed
- **Positive (+XX ms):** Green bar extending right, adding delay
- **Negative (-XX ms):** Red bar extending left, ahead of partner (shouldn't see this - buffer only adds delay)

### Dashboard URLs

1. **Split-screen (both extensions):**
   ```
   http://20.170.155.53:3020/dashboard.html
   ```
   Shows 3333 (left) and 4444 (right) side-by-side

2. **Extension 3333 only:**
   ```
   http://20.170.155.53:3020/dashboard-single.html?ext=3333
   ```

3. **Extension 4444 only:**
   ```
   http://20.170.155.53:3020/dashboard-single.html?ext=4444
   ```

---

## DEPLOYMENT PROCEDURE

### Step 1: Backup Current System

```bash
ssh azureuser@20.170.155.53

# Backup STTTTSserver.js
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
cp STTTTSserver.js STTTTSserver.js.backup-$(date +%Y%m%d-%H%M%S)

echo "✓ Backup created"
```

### Step 2: Apply Fix #1 (Extension Pairing)

```bash
# Edit STTTTSserver.js line 1405
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver

# Replace 9007/9008 with 3333/4444
sed -i "1405s/pairManager.registerPair('9007', '9008');/pairManager.registerPair('3333', '4444');/" STTTTSserver.js

# Verify the change
echo "=== Verifying Fix #1 ==="
sed -n '1403,1407p' STTTTSserver.js
```

**Expected output:**
```javascript
console.log('[Server] ✓ AudioBufferManager initialized (ready for Step 4)');

// Auto-pair 3333 and 4444 on startup
pairManager.registerPair('3333', '4444');

// Start TCP API server
```

### Step 3: Apply Fix #2 (QA Configs)

```bash
# Insert lines after line 1435
cat > /tmp/qa_config_insert.txt << 'EOF'
global.qaConfigs.set('3333', { sourceLang: 'en', targetLang: 'fr', qaMode: false });
global.qaConfigs.set('4444', { sourceLang: 'fr', targetLang: 'en', qaMode: false });
console.log('[QA Config] Initialized language settings for extensions 3333/4444');
EOF

# Insert after line 1435
sed -i '1435r /tmp/qa_config_insert.txt' STTTTSserver.js

# Verify the change
echo "=== Verifying Fix #2 ==="
sed -n '1435,1440p' STTTTSserver.js
```

**Expected output:**
```javascript
global.qaConfigs.set('9007', { sourceLang: 'en', targetLang: 'fr', qaMode: false });
global.qaConfigs.set('3333', { sourceLang: 'en', targetLang: 'fr', qaMode: false });
global.qaConfigs.set('4444', { sourceLang: 'fr', targetLang: 'en', qaMode: false });
console.log('[QA Config] Initialized language settings for extensions 3333/4444');
```

### Step 4: Restart Services

```bash
# Find and kill current STTTTSserver process
ps aux | grep 'STTTTSserver.js' | grep -v grep | awk '{print $2}' | xargs -r kill

# Wait for clean shutdown
sleep 3

# Start STTTTSserver
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
nohup node STTTTSserver.js > /tmp/STTTTSserver-operational.log 2>&1 &

echo "STTTTSserver started with PID: $!"

# Wait for startup
sleep 5

# Verify it's running
ps aux | grep 'STTTTSserver.js' | grep -v grep
```

### Step 5: Verify Fixes

```bash
# Check logs for extension pairing
tail -100 /tmp/STTTTSserver-operational.log | grep -E 'PairManager|Registered pair'
# Expected: [PairManager] Registered pair: 3333 ↔ 4444

# Check logs for QA config
tail -100 /tmp/STTTTSserver-operational.log | grep 'QA Config'
# Expected: [QA Config] Initialized language settings for extensions 3333/4444

# Check TCP API port
ss -tlnp 2>/dev/null | grep 6211
# Expected: Shows node process listening on 6211

# Check UDP ports
ss -ulnp 2>/dev/null | grep -E '6120|6121|6122|6123'
# Expected: All 4 ports listening
```

---

## TESTING PROCEDURE

### Test 1: Verify Extension Pairing

**Action:** Call extension 3333 and speak English

**Expected Server Logs:**
```
[UDP-3333] Gateway connected: 160 bytes/frame
[Pipeline] Transcribing 32000 bytes from extension 3333...
[Pipeline] Stage 2 (ASR) for 3333: 245ms - "Hello how are you"
[Pipeline] Translating en -> fr: "Hello how are you"
[Pipeline] Stage 4 (MT) for 3333: 180ms - "Bonjour comment allez-vous"
[LatencyDiff-Current] 3333→4444=850ms, 4444→3333=0ms, Δ=null
[Buffer Apply] No latency data yet for synchronization
[Buffer Send] Applying 0ms buffer to 12800 bytes PCM16 for extension 4444
```

**Expected Dashboard:**
- Extension 3333 card updates
- Latency bars show real-time values
- Sync correction: `0 ms` (no data for 4444 yet)
- Pairing extension: `----` or `4444`

### Test 2: Verify Bidirectional Sync

**Action:** Call extension 4444 and speak French

**Expected Server Logs (First 4444 utterance):**
```
[UDP-4444] Gateway connected: 160 bytes/frame
[LatencyDiff-Current] 4444→3333=920ms, 3333→4444=850ms, Δ=70ms
[Buffer Apply] Extension 4444 is SLOWER by 70ms - no auto-sync buffer needed
[Buffer Send] Applying 0ms buffer to 13440 bytes PCM16 for extension 3333
```

**Action:** Speak on 3333 again

**Expected Server Logs (Second 3333 utterance):**
```
[LatencyDiff-Current] 3333→4444=850ms, 4444→3333=920ms, Δ=-70ms
[Buffer Apply] Extension 3333 is FASTER by 70ms
[Buffer Apply] Auto-sync buffer: +70ms
[Buffer Send] Applying 70ms buffer to 12800 bytes PCM16 for extension 4444
```

**Expected Dashboard:**
- Sync correction bar: `+70 ms` (green, positive)
- Pairing extension: `4444`
- Serial total: ~850ms
- Parallel total: ~0-300ms (if Hume enabled)

### Test 3: Verify Dashboard End-to-End Card

**Action:** Open http://20.170.155.53:3020/dashboard.html

**Expected Display:**

**Split-screen view:**
- Left iframe: Extension 3333 dashboard
- Right iframe: Extension 4444 dashboard
- Both show "End-to-End Translation Latency" card

**Extension 3333 card should show:**
- Serial pipeline: 9 bars with millisecond values
- Parallel pipeline: 3 bars (if Hume enabled)
- Latency Sync: Shows "↓ 4444 (latency correction)" with +XX ms bar

**Extension 4444 card should show:**
- Serial pipeline: 9 bars with millisecond values
- Parallel pipeline: 3 bars (if Hume enabled)
- Latency Sync: Shows "↓ 3333 (latency correction)" with 0 ms bar (slower extension, no buffer)

**Key Success Indicators:**
- ✅ Pairing extension shows correct partner (3333 ↔ 4444)
- ✅ Sync correction bar shows buffer amount (+XX ms)
- ✅ All 9 serial pipeline bars update in real-time
- ✅ No console errors in browser DevTools

---

## VERIFICATION CHECKLIST

After deploying both fixes, verify:

- [ ] **Extension Pairing**
  - [ ] Logs show: `[PairManager] Registered pair: 3333 ↔ 4444`
  - [ ] No errors about undefined paired extension
  - [ ] Latency difference shows Δ value (not null)

- [ ] **QA Configuration**
  - [ ] Logs show: `[QA Config] Initialized language settings for extensions 3333/4444`
  - [ ] Extension 3333 translates en→fr
  - [ ] Extension 4444 translates fr→en

- [ ] **Buffer Synchronization**
  - [ ] Logs show buffer applied to faster extension
  - [ ] `[Buffer Apply] Auto-sync buffer: +XXms` appears
  - [ ] Dashboard sync correction bar shows value
  - [ ] Audio arrives synchronized

- [ ] **Dashboard (End-to-End Card)**
  - [ ] Pairing extension shows "3333" or "4444"
  - [ ] Sync correction bar updates (+XX ms)
  - [ ] All 9 serial pipeline bars show values
  - [ ] Real-time updates working

- [ ] **System Health**
  - [ ] UDP ports 6120-6123 listening
  - [ ] TCP API port 6211 listening
  - [ ] Gateway processes running (3333, 4444)
  - [ ] STTTTSserver running
  - [ ] No crashes in logs

---

## ROLLBACK PROCEDURE

If issues occur after fixes:

```bash
ssh azureuser@20.170.155.53

# Stop current server
ps aux | grep 'STTTTSserver.js' | grep -v grep | awk '{print $2}' | xargs -r kill

# Restore backup (find latest)
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
LATEST_BACKUP=$(ls -t STTTTSserver.js.backup-* | head -1)
cp "$LATEST_BACKUP" STTTTSserver.js

# Restart with old version
nohup node STTTTSserver.js > /tmp/STTTTSserver-operational.log 2>&1 &

echo "✓ Rolled back to backup: $LATEST_BACKUP"
```

---

## QUICK DEPLOYMENT SCRIPT

Save as `/tmp/deploy_3333_4444_timing_fixes.sh`:

```bash
#!/bin/bash
set -e

echo "=========================================="
echo "  3333/4444 Timing Sync Fixes - Deploy"
echo "=========================================="
echo ""

# Backup
echo "[1/4] Creating backup..."
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
cp STTTTSserver.js STTTTSserver.js.backup-$(date +%Y%m%d-%H%M%S)
echo "✓ Backup created"

# Fix #1: Extension Pairing
echo ""
echo "[2/4] Applying Fix #1 (Extension Pairing)..."
sed -i "1405s/pairManager.registerPair('9007', '9008');/pairManager.registerPair('3333', '4444');/" STTTTSserver.js
echo "✓ Extension pairing updated to 3333 ↔ 4444"

# Fix #2: QA Configs
echo ""
echo "[3/4] Applying Fix #2 (QA Configs)..."
cat > /tmp/qa_config_insert.txt << 'EOF'
global.qaConfigs.set('3333', { sourceLang: 'en', targetLang: 'fr', qaMode: false });
global.qaConfigs.set('4444', { sourceLang: 'fr', targetLang: 'en', qaMode: false });
console.log('[QA Config] Initialized language settings for extensions 3333/4444');
EOF
sed -i '1435r /tmp/qa_config_insert.txt' STTTTSserver.js
echo "✓ QA configs added for 3333/4444"

# Restart
echo ""
echo "[4/4] Restarting services..."
ps aux | grep 'STTTTSserver.js' | grep -v grep | awk '{print $2}' | xargs -r kill
sleep 3
nohup node STTTTSserver.js > /tmp/STTTTSserver-operational.log 2>&1 &
NEW_PID=$!
sleep 5

if ps -p $NEW_PID > /dev/null; then
    echo "✓ STTTTSserver restarted (PID: $NEW_PID)"
else
    echo "✗ Failed to start STTTTSserver"
    exit 1
fi

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "Verification:"
echo "  • Logs: tail -f /tmp/STTTTSserver-operational.log"
echo "  • Pairing: grep 'Registered pair' /tmp/STTTTSserver-operational.log"
echo "  • Dashboard: http://20.170.155.53:3020/dashboard.html"
echo ""
```

**To deploy:**
```bash
ssh azureuser@20.170.155.53
bash /tmp/deploy_3333_4444_timing_fixes.sh
```

---

## APPENDIX: Complete File Changes

### STTTTSserver.js - Line 1405

**BEFORE:**
```javascript
// Auto-pair 9007 and 9008 on startup
pairManager.registerPair('9007', '9008');
```

**AFTER:**
```javascript
// Auto-pair 3333 and 4444 on startup
pairManager.registerPair('3333', '4444');
```

### STTTTSserver.js - After Line 1435

**BEFORE:**
```javascript
global.qaConfigs.set('9007', { sourceLang: 'en', targetLang: 'fr', qaMode: false });
```

**AFTER:**
```javascript
global.qaConfigs.set('9007', { sourceLang: 'en', targetLang: 'fr', qaMode: false });
global.qaConfigs.set('3333', { sourceLang: 'en', targetLang: 'fr', qaMode: false });
global.qaConfigs.set('4444', { sourceLang: 'fr', targetLang: 'en', qaMode: false });
console.log('[QA Config] Initialized language settings for extensions 3333/4444');
```

---

## DOCUMENT CHANGE LOG

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-24 | Initial document - timing & sync fixes only |

---

**END OF DOCUMENT**
