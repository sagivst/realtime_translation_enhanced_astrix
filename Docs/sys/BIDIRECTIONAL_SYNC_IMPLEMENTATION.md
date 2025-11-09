# Bidirectional Translation Synchronization - Implementation Guide
**Date**: 2025-10-29
**Dev VM**: 20.170.155.53
**Status**: Ready for Implementation

---

## 📊 EXECUTIVE SUMMARY

This document provides a complete implementation plan for synchronizing bidirectional translation streams between extensions 7000 and 7001, ensuring both parties hear translated audio simultaneously by compensating for processing time differences.

---

## 🎯 OBJECTIVE

**Goal**: Synchronize translation latency between two extensions so audio arrives at both ends at the same time.

**Method**:
1. Measure processing time for each direction (7000→7001 and 7001→7000)
2. Calculate the latency difference (delta)
3. Buffer/delay the faster stream to match the slower one
4. Inject synchronized audio back to Asterisk bridges via WebSocket ARI ExternalMedia

---

## 📈 CURRENT STATE ANALYSIS

### ✅ What's Working

#### 1. Infrastructure
- **Conference Server**: Running on port 3000 (PID 83200)
- **Timing Server**: Running on port 6000 (PID 91243)
- **Two AudioSocket Ports**:
  - Port 5050 → Extension 7000 ✓
  - Port 5052 → Extension 7001 ✓
- **Extension Detection**: Via port mapping (works correctly)
- **Checkpoint System**: Fully automated, 76 files per backup

#### 2. Latency Measurement
- **ASR (Deepgram)**: ~100ms
- **MT (DeepL)**: ~2000ms
- **TTS (ElevenLabs)**: ~1000ms
- **E2E Total**: ~3106ms
- **Data collected**: `latency-sync-manager.js` emitting updates ✓

#### 3. Timing Server Features
- Extension pair tracking (7000 ↔ 7001) ✓
- Auto-pairing when both extensions connect ✓
- Latency buffer with delay mechanism ✓
- TCP protocol (port 6000) + HTTP API (port 6001) ✓

#### 4. Browser Dashboard
- Receiving latency updates ✓
- Audio waveform visualization ✓
- Buffer monitoring (160.9ms, target 150ms) ✓

### ❌ What's Broken

#### BUG #1: UUID Parsing (PARTIALLY FIXED)
**Status**: Extension detection works via port mapping
**Issue**: UUID comes as binary garbage instead of text
**Impact**: None - extension already extracted from port number
**Fix Applied**: Changed `toString('hex')` to `toString('utf8')` (doesn't matter since port-based detection works)

#### BUG #2: No Latency Data Sent to Timing Server ⚠️ CRITICAL
**Location**: Missing wire between components
**Symptoms**:
```
[Sync] Emitting latencyUpdate for ext 7001: { asr: 100, mt: 2000, e2e: 3106 }  ← Server has data
[BiDir] Extension 7000 registered                                                ← Timing server knows extensions
[Status] Active pairs: 1 | 7000 ↔ 7001: 0ms / 0ms                               ← But shows 0ms/0ms!
```

**Root Cause**: `latency-sync-manager.js` emits data via Socket.IO, but **timing client never calls `updateLatency()`**

**Impact**: No synchronization possible without latency data

#### BUG #3: ARI Audio Injection Failing ⚠️ CRITICAL
**Location**: `bidirectional-timing-server.js` AudioInjector class
**Symptoms**:
```
[Injector] ✗ Failed to init channel: ARI request failed: 400 { "message": "app cannot be empty" }
```

**Root Cause**: HTTP-based ARI ExternalMedia with missing/incorrect app parameter

**Required Fix**: Switch to **WebSocket ARI ExternalMedia** for real-time audio injection

**Impact**: Cannot inject synchronized audio back to bridges

---

## 🔧 IMPLEMENTATION PLAN

### Phase 1: Wire Latency Data to Timing Server

#### Step 1.1: Find Latency Emission Point
**File**: `latency-sync-manager.js` or `audiosocket-integration.js`
**Action**: Locate where `[Sync] Emitting latencyUpdate` happens

**Search Command**:
```bash
ssh azureuser@20.170.155.53 "grep -n 'Emitting latencyUpdate' /home/azureuser/translation-app/*.js"
```

#### Step 1.2: Add Timing Client Call
**File**: Where latency is emitted
**Location**: After Socket.IO emit

**Add This Code**:
```javascript
// After emitting to Socket.IO dashboard
if (global.timingClient && global.timingClient.connected) {
    global.timingClient.updateLatency(
        fromExtension,  // '7000' or '7001'
        toExtension,    // '7001' or '7000'
        data.e2e        // End-to-end latency in ms
    );
}
```

**Example Integration**:
```javascript
// BEFORE:
io.emit('latencyUpdate', {
    extension: '7001',
    asr: 100,
    mt: 2000,
    e2e: 3106
});

// AFTER:
io.emit('latencyUpdate', {
    extension: '7001',
    asr: 100,
    mt: 2000,
    e2e: 3106
});

// NEW: Send to timing server
if (global.timingClient && global.timingClient.connected) {
    const fromExt = '7000';  // Source extension
    const toExt = '7001';    // Destination extension
    global.timingClient.updateLatency(fromExt, toExt, 3106);
    console.log(`[TimingSync] Sent latency ${fromExt}→${toExt}: ${3106}ms`);
}
```

#### Step 1.3: Create Checkpoint Before Changes
```bash
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app && bash create-checkpoint.sh"
```

#### Step 1.4: Apply Changes
```bash
# Edit file on server
ssh azureuser@20.170.155.53 "nano /home/azureuser/translation-app/[FILE_NAME].js"
# Or use sed for automated edit
```

#### Step 1.5: Restart Server & Test
```bash
ssh azureuser@20.170.155.53 "killall -9 node && cd /home/azureuser/translation-app && nohup node conference-server.js > /tmp/conference-server.log 2>&1 & nohup node bidirectional-timing-server.js > /tmp/timing-server.log 2>&1 &"
```

**Verification**:
```bash
# Make test call
# Check timing server logs
ssh azureuser@20.170.155.53 "tail -50 /tmp/timing-server.log"
# Should show: [Status] Active pairs: 1 | 7000 ↔ 7001: 650ms / 730ms  (NOT 0ms!)
```

---

### Phase 2: Implement WebSocket ARI ExternalMedia Injection

#### Step 2.1: Replace HTTP with WebSocket
**File**: `bidirectional-timing-server.js`
**Class**: `AudioInjector`
**Current Method**: HTTP POST to ARI (failing)
**New Method**: WebSocket ARI ExternalMedia

#### Step 2.2: WebSocket ARI Implementation

**Required Libraries**:
```javascript
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
```

**New AudioInjector Class**:
```javascript
class AudioInjector {
    constructor(ariHost = '127.0.0.1', ariPort = 8088, ariUser = 'dev', ariPass = 'asterisk') {
        this.ariHost = ariHost;
        this.ariPort = ariPort;
        this.ariAuth = Buffer.from(`${ariUser}:${ariPass}`).toString('base64');
        this.channels = new Map(); // key: extension, value: { channelId, ws, bridge }
    }

    async initChannel(extension, bridgeId) {
        console.log(`[Injector] Initializing WebSocket channel: ${extension} → ${bridgeId}`);

        try {
            const channelId = `sync-inject-${extension}-${Date.now()}`;

            // 1. Create ExternalMedia channel via ARI REST
            const createUrl = `http://${this.ariHost}:${this.ariPort}/ari/channels/externalMedia`;
            const response = await fetch(createUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${this.ariAuth}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    app: 'translation-sync',
                    external_host: `${this.ariHost}:5060`,
                    format: 'slin16',
                    channelId: channelId,
                    variables: { 'SYNC_EXTENSION': extension }
                })
            });

            if (!response.ok) {
                throw new Error(`ARI create failed: ${response.status}`);
            }

            console.log(`[Injector] ✓ Channel created: ${channelId}`);

            // 2. Add to bridge
            const addUrl = `http://${this.ariHost}:${this.ariPort}/ari/bridges/${bridgeId}/addChannel`;
            await fetch(addUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${this.ariAuth}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ channel: channelId })
            });

            console.log(`[Injector] ✓ Added to bridge: ${bridgeId}`);

            // 3. Connect WebSocket for audio streaming
            const wsUrl = `ws://${this.ariHost}:${this.ariPort}/ari/channels/${channelId}/externalMedia?api_key=${ariUser}:${ariPass}`;
            const ws = new WebSocket(wsUrl);

            ws.on('open', () => {
                console.log(`[Injector] ✓ WebSocket connected: ${extension}`);
            });

            ws.on('error', (err) => {
                console.error(`[Injector] WebSocket error ${extension}:`, err.message);
            });

            ws.on('close', () => {
                console.log(`[Injector] WebSocket closed: ${extension}`);
                this.channels.delete(extension);
            });

            // Store channel info
            this.channels.set(extension, {
                channelId,
                ws,
                bridgeId,
                ready: true
            });

            return channelId;

        } catch (err) {
            console.error(`[Injector] ✗ Init failed:`, err.message);
            return null;
        }
    }

    inject(extension, audioBuffer) {
        const channel = this.channels.get(extension);

        if (!channel || !channel.ready) {
            console.warn(`[Injector] Channel not ready: ${extension}`);
            return;
        }

        try {
            // Send PCM audio directly via WebSocket
            channel.ws.send(audioBuffer);
            console.log(`[Injector] → Injected ${audioBuffer.length} bytes to ${extension}`);
        } catch (err) {
            console.error(`[Injector] Injection failed:`, err.message);
        }
    }

    async closeChannel(extension) {
        const channel = this.channels.get(extension);
        if (!channel) return;

        try {
            channel.ws.close();

            // Delete channel via ARI
            const deleteUrl = `http://${this.ariHost}:${this.ariPort}/ari/channels/${channel.channelId}`;
            await fetch(deleteUrl, {
                method: 'DELETE',
                headers: { 'Authorization': `Basic ${this.ariAuth}` }
            });

            console.log(`[Injector] ✓ Channel closed: ${extension}`);
            this.channels.delete(extension);
        } catch (err) {
            console.error(`[Injector] Close failed:`, err.message);
        }
    }
}
```

#### Step 2.3: Update Asterisk ARI Configuration
**File**: `/etc/asterisk/ari.conf`

**Ensure These Settings**:
```ini
[general]
enabled = yes
pretty = yes
allowed_origins = *

[dev]
type = user
read_only = no
password = asterisk
```

**Restart Asterisk**:
```bash
ssh azureuser@20.170.155.53 "sudo asterisk -rx 'module reload res_ari.so'"
```

#### Step 2.4: Create Checkpoint & Apply
```bash
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app && bash create-checkpoint.sh"
```

#### Step 2.5: Test Audio Injection
**Verification**:
```bash
# Check ARI channels
curl -u dev:asterisk http://20.170.155.53:8088/ari/channels

# Check bridges
curl -u dev:asterisk http://20.170.155.53:8088/ari/bridges

# Should see sync-inject-7000 and sync-inject-7001 channels
```

---

### Phase 3: End-to-End Synchronization Testing

#### Test 3.1: Verify Latency Flow
```bash
# 1. Start both servers
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app && bash start-server-with-checkpoint.sh"

# 2. Start timing server
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app && nohup node bidirectional-timing-server.js > /tmp/timing-server.log 2>&1 &"

# 3. Make test calls to both 7000 and 7001

# 4. Check logs
ssh azureuser@20.170.155.53 "tail -f /tmp/timing-server.log"
```

**Expected Output**:
```
[BiDir] Extension 7000 registered (UUID: tcp_xxx)
[BiDir] Extension 7001 registered (UUID: tcp_yyy)
[BiDir] *** Auto-pairing 7000 ↔ 7001 ***
[Pair] ✓ Registered: 7000 ↔ 7001
[Injector] ✓ WebSocket connected: 7000
[Injector] ✓ WebSocket connected: 7001

[Status] Active pairs: 1
  7000 ↔ 7001: 650ms / 730ms   ← Real values!

[Buffer] 7000→7001 delayed by 80ms (sync)
[Injector] → Injected 8000 bytes to ext 7001
[Injector] → Injected 8000 bytes to ext 7000
```

#### Test 3.2: Verify Synchronization
**Test Procedure**:
1. Call extension 7000 and speak: "Testing one two three"
2. Call extension 7001 and speak: "Testing one two three"
3. Both parties should hear translation at approximately same time
4. Check dashboard shows synchronized latency bars

**Success Criteria**:
- ✅ Timing server shows real latency values (not 0ms)
- ✅ Faster stream gets delayed
- ✅ Both parties hear translation within 50ms of each other
- ✅ No audio dropouts or glitches
- ✅ Dashboard displays accurate metrics

---

## 📂 FILE LOCATIONS

### Dev VM: 20.170.155.53
```
/home/azureuser/translation-app/
├── conference-server.js              # Main server
├── audiosocket-integration.js        # AudioSocket handler
├── audiosocket-orchestrator.js       # Protocol parser (UUID fix here)
├── latency-sync-manager.js           # Latency tracking (needs timing client call)
├── bidirectional-timing-server.js    # Timing server (needs WebSocket injection)
├── timing-client.js                  # Client library (already has updateLatency method)
├── create-checkpoint.sh              # Backup script
└── checkpoints/                      # Backup directory
    └── checkpoint-20251029-183214/   # Latest backup (before any changes)
```

### Local Machine
```
/Users/sagivstavinsky/realtime-translation-enhanced_astrix/docs/sys/
└── BIDIRECTIONAL_SYNC_IMPLEMENTATION.md  # This document
```

---

## 🔄 CHECKPOINT STRATEGY

### Before Every Change
```bash
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app && bash create-checkpoint.sh"
```

### After Every Change
```bash
# Test the change
# If broken, restore immediately:
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app && bash restore-checkpoint.sh checkpoint-YYYYMMDD-HHMMSS"
```

### Checkpoint Naming Convention
```
checkpoint-20251029-183214  # Format: YYYYMMDD-HHMMSS
```

---

## 📝 CODE SNIPPETS

### Snippet 1: Add Timing Client Call
**Location**: Where `io.emit('latencyUpdate', ...)` happens

```javascript
// Find this pattern:
io.emit('latencyUpdate', { extension, asr, mt, e2e, ... });

// Add after it:
if (global.timingClient && global.timingClient.connected) {
    const pairInfo = this.extensionPairs.get(extension);
    if (pairInfo) {
        global.timingClient.updateLatency(extension, pairInfo.paired, e2e);
    }
}
```

### Snippet 2: Initialize Injection Channels
**Location**: `bidirectional-timing-server.js` - handleRegisterPair method

```javascript
handleRegisterPair(socket, msg) {
    const { ext1, ext2, callUuid } = msg;
    const sessionId = this.pairManager.registerPair(ext1, ext2, callUuid);

    // Initialize WebSocket injection channels
    this.audioInjector.initChannel(ext1, `bridge-${ext2}`);  // ext1 audio → ext2 bridge
    this.audioInjector.initChannel(ext2, `bridge-${ext1}`);  // ext2 audio → ext1 bridge

    socket.write(JSON.stringify({
        type: 'PAIR_REGISTERED',
        sessionId,
        ext1,
        ext2
    }) + '\n');
}
```

---

## 🚨 TROUBLESHOOTING

### Issue: Timing server still shows 0ms/0ms
**Cause**: `updateLatency()` not being called
**Check**:
```bash
ssh azureuser@20.170.155.53 "grep 'timingClient.updateLatency' /home/azureuser/translation-app/*.js"
```
**Fix**: Add timing client call where latency is emitted

### Issue: ARI WebSocket connection fails
**Cause**: Wrong credentials or ARI not enabled
**Check**:
```bash
curl -u dev:asterisk http://20.170.155.53:8088/ari/asterisk/info
```
**Fix**: Update ARI credentials in timing server

### Issue: Audio not injected to bridge
**Cause**: WebSocket not connected or wrong format
**Check**: Look for `[Injector] ✓ WebSocket connected` in logs
**Fix**: Verify ARI ExternalMedia format is `slin16`

### Issue: Delay not applied
**Cause**: Latency difference calculation incorrect
**Check**: Look for `[Buffer] 7000→7001 delayed by Xms` in logs
**Fix**: Verify latency data has correct sign (faster stream should have positive delay)

---

## ✅ SUCCESS CRITERIA CHECKLIST

### Phase 1: Latency Data Flow
- [ ] Timing server shows real latency values (not 0ms/0ms)
- [ ] Console logs show: `[TimingSync] Sent latency 7000→7001: XXXms`
- [ ] Both directions tracked: 7000→7001 and 7001→7000

### Phase 2: Audio Injection
- [ ] No more "app cannot be empty" errors
- [ ] WebSocket connections established: `[Injector] ✓ WebSocket connected`
- [ ] Audio packets sent: `[Injector] → Injected XXXX bytes`

### Phase 3: Synchronization
- [ ] Latency difference calculated correctly
- [ ] Faster stream gets delayed: `[Buffer] X→Y delayed by Zms`
- [ ] Both parties hear translation simultaneously (±50ms)
- [ ] No audio dropouts or artifacts
- [ ] System stable for 5+ minute calls

---

## 📊 EXPECTED TIMELINE

- **Phase 1** (Wire latency data): 30 minutes
  - Find emission point: 10 min
  - Add timing client call: 5 min
  - Test & verify: 15 min

- **Phase 2** (WebSocket injection): 1 hour
  - Implement WebSocket class: 30 min
  - Test ARI connection: 15 min
  - Test audio injection: 15 min

- **Phase 3** (End-to-end testing): 30 minutes
  - Test with real calls: 20 min
  - Fine-tune delays: 10 min

**Total Estimated Time**: 2 hours

---

## 🔐 SAFETY MEASURES

1. ✅ **Checkpoint before every change**
2. ✅ **Test on Dev VM only** (never touch 4.185.84.26)
3. ✅ **Keep timing server separate** (can restart independently)
4. ✅ **Incremental changes** (one feature at a time)
5. ✅ **Immediate rollback** if broken

---

## 📞 SUPPORT REFERENCES

### Asterisk ARI Documentation
- ExternalMedia: https://docs.asterisk.org/Asterisk_18_Documentation/API_Documentation/Asterisk_REST_Interface/Channels_REST_API/
- WebSocket: https://wiki.asterisk.org/wiki/display/AST/Asterisk+WebSocket+API

### Existing Working Components
- AudioSocket protocol: `audiosocket-orchestrator.js`
- Timing client: `timing-client.js`
- Latency tracking: `latency-sync-manager.js`

---

**END OF IMPLEMENTATION GUIDE**

This document will be saved to:
1. Dev VM: `/home/azureuser/translation-app/docs/BIDIRECTIONAL_SYNC_IMPLEMENTATION.md`
2. Local: `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/docs/sys/BIDIRECTIONAL_SYNC_IMPLEMENTATION.md`
