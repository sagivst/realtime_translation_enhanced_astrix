# Implementation Guide: Current System Configuration (NO ARI)

**Date:** 2025-11-03
**Status:** ✅ ROLLED BACK - Simple AudioSocket Configuration (NO ARI)
**Backup Source:** checkpoint-20251103-140623 (working version, without ARI)
**Git Branch:** working-version-without-ari-20251103

---

## ✅ CURRENT CONFIGURATION (NO ARI)

The system is using a **simple AudioSocket configuration** with NO ARI integration:

```
Extension 7004 - Simple AudioSocket
  ↓
  1. Ringing()
  2. Wait(1)
  3. Answer()
  4. Playback(beep)
  5. Set(CALL_UUID=${FILTER(a-zA-Z0-9-,${SHELL(uuidgen)})})
  6. NoOp(Extension 7004 UUID: ${CALL_UUID})
  7. AudioSocket(${CALL_UUID},127.0.0.1:5050)
  8. Hangup()
  ↓
Result:
  - Direct AudioSocket connection to port 5050
  - No bridge connector architecture
  - No ARI Stasis routing
  - Simple, working AudioSocket integration

Extension 7005 - Simple AudioSocket
  ↓
  Same configuration, connects to port 5052

Extensions 7000, 7001 - Multi-Language Conference Bridge
  ↓
  Use AudioSocket with auto-dial functionality (ports 5050, 5052)

Extensions 1000-9999 - Conference Rooms
  ↓
  ARI managed via translation-app (Stasis application)
```

---

## Current Extension 7004 Dialplan (Simple AudioSocket)

**File:** `/etc/asterisk/extensions.conf`

**Context:** `[from-sip-custom]`

**Configuration:** Simple AudioSocket - NO ARI, NO bridge connectors

```asterisk
; ============================================================================
; Extension 7004 - Simple AudioSocket (NO ARI)
; ============================================================================
exten => 7004,1,NoOp(=== Extension 7004: Simple AudioSocket ===)
 same => n,Ringing()
 same => n,Wait(1)
 same => n,Answer()
 same => n,Playback(beep)
 same => n,Set(CALL_UUID=${FILTER(a-zA-Z0-9-,${SHELL(uuidgen)})})
 same => n,NoOp(Extension 7004 UUID: ${CALL_UUID})
 same => n,AudioSocket(${CALL_UUID},127.0.0.1:5050)
 same => n,Hangup()
```

**Extension 7005 Configuration:**

```asterisk
; ============================================================================
; Extension 7005 - Simple AudioSocket (NO ARI)
; ============================================================================
exten => 7005,1,NoOp(=== Extension 7005: Simple AudioSocket ===)
 same => n,Ringing()
 same => n,Wait(1)
 same => n,Answer()
 same => n,Playback(beep)
 same => n,Set(CALL_UUID=${FILTER(a-zA-Z0-9-,${SHELL(uuidgen)})})
 same => n,NoOp(Extension 7005 UUID: ${CALL_UUID})
 same => n,AudioSocket(${CALL_UUID},127.0.0.1:5052)
 same => n,Hangup()
```

---

## Node.js Services (Current System)

**Services Running:**

1. **bidirectional-timing-server.js** - Port 6000
   - Handles timing synchronization for the translation pipeline

2. **conference-server.js** - Ports 5050, 5052
   - AudioSocket server for Extensions 7000, 7001, 7004, 7005
   - Receives audio from Asterisk
   - Processes audio through translation pipeline
   - Injects translated audio back into conference bridges

**Services NOT Running (NO ARI Architecture):**

3. **ari-bridge-originate.js** - NOT RUNNING
   - This service is not used in the current "NO ARI" configuration
   - Only needed if implementing ARI-based bridge management

---

## System Architecture

### Current Audio Flow (NO ARI)

```
User Dials Extension 7004/7005
  ↓
Direct AudioSocket Connection
  ↓
Extension 7004 → AudioSocket(UUID, 127.0.0.1:5050)
Extension 7005 → AudioSocket(UUID, 127.0.0.1:5052)
  ↓
Node.js conference-server.js
  ↓
  1. Receives audio stream from Asterisk
  2. Deepgram STT (Speech-to-Text)
  3. DeepL Translation
  4. ElevenLabs TTS (Text-to-Speech)
  5. Injects translated audio into conference bridges
  ↓
User hears translated audio
```

### Extension Configuration Summary

| Extension | Type | Port | ARI | Description |
|-----------|------|------|-----|-------------|
| 7000 | Multi-Language Bridge | 5050 | NO | Auto-dial conference with translation |
| 7001 | Multi-Language Bridge | 5052 | NO | Auto-dial conference with translation |
| 7004 | Simple AudioSocket | 5050 | NO | Direct AudioSocket connection |
| 7005 | Simple AudioSocket | 5052 | NO | Direct AudioSocket connection |
| 1000-9999 | Conference Rooms | N/A | YES | ARI Stasis (translation-app) |

---

## Rollback Information

### What Was Done

**Date:** 2025-11-03

**Action:** Rolled back to "working version, without ARI" backup

**Source:**
- Checkpoint: `/home/azureuser/translation-app/checkpoints/checkpoint-20251103-140623/`
- Git Branch: `working-version-without-ari-20251103`
- Commit: e2813b5

**Files Restored:**
1. `/etc/asterisk/extensions.conf` - Restored from checkpoint
2. Node.js services - Restarted with correct configuration

**Services Restarted:**
1. ✓ bidirectional-timing-server.js (port 6000)
2. ✓ conference-server.js (ports 5050, 5052)
3. ✗ ari-bridge-originate.js (NOT running - correct for NO ARI)

---

## Deployment Commands (Current System)

### Verify Configuration Active

```bash
ssh azureuser@20.170.155.53 "sudo asterisk -rx 'dialplan show from-sip-custom' | grep -A 10 \"'7004' =>\""
```

**Expected output (NO ARI):**
```
'7004' =>         1. NoOp(=== Extension 7004: Simple AudioSocket ===)
                  2. Ringing()
                  3. Wait(1)
                  4. Answer()
                  5. Playback(beep)
                  6. Set(CALL_UUID=${FILTER(a-zA-Z0-9-,${SHELL(uuidgen)})})
                  7. NoOp(Extension 7004 UUID: ${CALL_UUID})
                  8. AudioSocket(${CALL_UUID},127.0.0.1:5050)
                  9. Hangup()
```

### Start Services

```bash
# Kill all node processes
ssh azureuser@20.170.155.53 "killall -9 node"

# Start timing server
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app && nohup node bidirectional-timing-server.js >> /tmp/timing-server.log 2>&1 &"

# Start conference server
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app && nohup node conference-server.js >> /tmp/conference-server.log 2>&1 &"

# Verify services running
ssh azureuser@20.170.155.53 "ps aux | grep node | grep -v grep"
ssh azureuser@20.170.155.53 "ss -tuln | grep -E '(5050|5052|6000)'"
```

---

## Testing

### Test 1: Basic Call to Extension 7004

```bash
# From SIP phone 1001, dial 7004
# Or originate from CLI:
ssh azureuser@20.170.155.53 "sudo asterisk -rx 'channel originate SIP/1001 extension 7004@from-internal'"
```

**Expected behavior:**
1. Call answers immediately
2. User joins Bridge 7004
3. Extension 7000 is auto-originated
4. Extension 7000 connects to AudioSocket (appears on dashboard)
5. No beeps heard

### Test 2: Monitor Asterisk Channels

```bash
ssh azureuser@20.170.155.53 "sudo asterisk -rx 'core show channels' | grep -E '7004|7000'"
```

**Expected output (while call is active):**
```
SIP/1001-0000001a    7004@from-sip-custom Up      ConfBridge(7004,default_bridge
Local/7000@from-sip- (None)               Ring    AppDial((Outgoing Line))
```

### Test 3: Monitor Bridges

```bash
ssh azureuser@20.170.155.53 "sudo asterisk -rx 'confbridge list'"
```

**Expected output:**
```
Conference Bridge Name           Users  Marked Locked Muted
================================ ====== ====== ====== =====
7004                                  1      0 No     No
```

**Note:** Even though Extension 7000 is originated into Bridge 7004, it may not appear as a bridge participant because AudioSocket() is blocking and prevents it from reaching ConfBridge.

### Test 4: Check Dashboard

1. Open dashboard at `http://20.170.155.53:3000` (or wherever it's hosted)
2. Dial Extension 7004
3. **Expected on Dashboard:**
   - Card 1 "Asterisk Voice Stream (IN)" shows Call UUID
   - Audio levels display when speaking
   - Translation occurs (English → French)

---

## Architecture Diagram (NO ARI)

```
┌─────────────────────────────────────────────────────────────┐
│ SIP Phone 1001 Dials Extension 7004                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Extension 7004 Dialplan Executes:                          │
│   1. Ringing()                                              │
│   2. Wait(1)                                                │
│   3. Answer()                                               │
│   4. Playback(beep)                                         │
│   5. Set CALL_UUID                                          │
│   6. AudioSocket(UUID, 127.0.0.1:5050)                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
                ┌───────────────────────┐
                │ Direct AudioSocket    │
                │ Connection            │
                │ Port 5050             │
                │ NO ARI, NO Bridges    │
                └───────────────────────┘
                            ↓
            ┌───────────────────────────────────┐
            │ Node.js conference-server.js      │
            │ - Receives audio stream           │
            │ - Deepgram STT (EN)               │
            │ - DeepL Translation (EN→FR)       │
            │ - ElevenLabs TTS (FR)             │
            │ - Injects to conference bridges   │
            └───────────────────────────────────┘
                            ↓
                    ┌───────────────┐
                    │ Translated    │
                    │ Audio Output  │
                    └───────────────┘
```

---

## Success Criteria

✅ **System is working when:**

1. Dialing Extension 7004 connects immediately with no beeps
2. User joins Bridge 7004
3. Extension 7000 is auto-originated
4. AudioSocket connection appears on dashboard (Card 1)
5. Speaking generates audio activity on dashboard
6. Translation occurs (English → French)
7. No errors in Asterisk logs

---

## Troubleshooting

### Issue: "Extension 7004 not found"

```bash
# Check if extension is loaded
ssh azureuser@20.170.155.53 "sudo asterisk -rx 'dialplan show 7004@from-sip-custom'"

# If not found, reload dialplan
ssh azureuser@20.170.155.53 "sudo asterisk -rx 'dialplan reload'"
```

### Issue: "Extension 7000 not originated"

```bash
# Check Asterisk logs for origination errors
ssh azureuser@20.170.155.53 "sudo tail -50 /var/log/asterisk/messages | grep -E '7000|originate|ERROR'"

# Manually test origination
ssh azureuser@20.170.155.53 "sudo asterisk -rx 'channel originate Local/7000@from-sip-custom application ConfBridge 7004,default_bridge,default_user'"
```

### Issue: "No audio on dashboard"

```bash
# Check if AudioSocket connection is established
ssh azureuser@20.170.155.53 "sudo netstat -an | grep 5050"

# Check Node.js server logs
ssh azureuser@20.170.155.53 "sudo pm2 logs conference-server"
```

### Issue: "Multiple beeps heard"

**Cause:** ConfBridge profile missing `quiet=yes`

**Fix:**
```bash
# Edit confbridge.conf
ssh azureuser@20.170.155.53 "sudo nano /etc/asterisk/confbridge.conf"

# Add to [default_user] section:
quiet=yes

# Restart Asterisk
ssh azureuser@20.170.155.53 "sudo asterisk -rx 'module reload app_confbridge.so'"
```

---

## Checkpoint System

A checkpoint backup system is available for easy rollback:

```bash
# Create manual checkpoint
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app && bash create-checkpoint.sh"

# View checkpoints
ssh azureuser@20.170.155.53 "ls -lht /home/azureuser/translation-app/checkpoints/ | head -5"

# Restore from checkpoint
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app && bash restore-checkpoint.sh CHECKPOINT_NAME"
```

---

## Current System Status (NO ARI)

**System is STABLE and WORKING with simple AudioSocket configuration:**

✅ **Extensions 7004, 7005** - Simple AudioSocket (ports 5050, 5052)
✅ **Extensions 7000, 7001** - Multi-language conference bridge with auto-dial
✅ **Extensions 1000-9999** - Conference rooms (ARI Stasis via translation-app)
✅ **Services Running** - bidirectional-timing-server.js, conference-server.js
✅ **NO ARI** - ari-bridge-originate.js is NOT running (correct)

**Git Branch:** working-version-without-ari-20251103
**Checkpoint:** checkpoint-20251103-140623
**Configuration:** `/etc/asterisk/extensions.conf` restored from backup

---

## Important Notes

1. **DO NOT modify Extension 7004/7005** without explicit user approval
2. **System is in "working version, without ARI" state**
3. **ARI bridge management is NOT used** for Extensions 7004/7005
4. **Only simple AudioSocket connections** are active for Extensions 7004/7005
5. **All changes must be presented in detail** and receive confirmation before implementation

---

## 📌 Session: Audio Injection Implementation (2025-11-03)

### Session Goal
Implement bidirectional audio injection for Extensions 7004/7005 to enable translated audio playback back to the user.

### Pre-Session Checkpoint
**Checkpoint**: `checkpoint-20251103-162359`
**Created**: 2025-11-03 16:23:59 UTC
**Description**: [SESSION-START-2025-11-03] Before audio injection implementation for Extensions 7004/7005
**Files Backed Up**: 6 total (3 app + 3 asterisk)

### System State at Session Start
**Node Processes:**
- ✅ bidirectional-timing-server.js (PID 241486, port 6000)
- ✅ conference-server.js (PID 241529, ports 5050-5053)

**Active Channels:**
- Local/listen-7000 → Stasis + ConfBridge(7000)
- Local/8000 → Stasis + AudioSocket

**Ports Active:**
- 5050 (AudioSocket TCP - Extension 7000)
- 5051 (WebSocket - Extension 7000)
- 5052 (AudioSocket TCP - Extension 7001)
- 5053 (WebSocket - Extension 7001)
- 6000 (Timing Server)

### Current Problem
Extensions 7004/7005 have **ONE-WAY audio only**:
- ✅ User's microphone is captured via AudioSocket
- ✅ Translation happens (STT → MT → TTS)
- ❌ **NO path to inject translated audio back to user**
- ❌ User cannot hear translated audio

### Implementation Plan
**Approach**: Direct AudioSocket bidirectional (simplest solution)

**Steps**:
1. ✅ **Step 1**: Verify current system state (READ-ONLY)
2. ⏸️ **Step 2**: Add downsampling function (16kHz → 8kHz)
3. ⏸️ **Step 3**: Enable sendAudio() in audiosocket-orchestrator.js
4. ⏸️ **Step 4**: Route translated audio back through TCP connection
5. ⏸️ **Step 5**: Test with Extension 7004
6. ⏸️ **Step 6**: Replicate for Extension 7005

### Constraints
- ✅ Work ONLY on DEV VM (20.170.155.53)
- ❌ NEVER touch Production VM (4.185.84.26)
- ✅ Create checkpoints before each code change
- ✅ Step-by-step approval from user before modifications

### Progress Log
- [2025-11-03 16:23] ✅ Checkpoint system verified operational
- [2025-11-03 16:23] ✅ Pre-session checkpoint created: checkpoint-20251103-162359
- [2025-11-03 16:24] ✅ Step 1: System state verified (READ-ONLY)
- [2025-11-03 16:25] ✅ IMPLEMENTATION_MISSING_PARTS.md updated
- [2025-11-03 16:40] ✅ **ROLLED BACK** - User requested cancellation, restored to checkpoint-20251103-162359

### Step 1 Results (System State Verification)
**Extensions 7004/7005 Configuration:**
- Simple AudioSocket on ports 5050/5052
- UUID: Random (NOT prefixed)
- ❌ NO conference bridge
- ❌ NO audio injection path back to user

**Findings:**
- AudioSocket TCP captures user audio successfully ✅
- Translation pipeline processes audio ✅
- WebSocket receives translated audio ✅
- `sendAudio()` method exists but is COMMENTED OUT ❌
- Audio has nowhere to go back to Asterisk ❌

### Next Steps (Awaiting User Approval)
Present **Step 1 findings** to user and get approval for **Step 2** (add downsampling).

### Restore Commands
```bash
# Restore to pre-session state
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app
bash restore-checkpoint.sh checkpoint-20251103-162359
```

---

**End of Document**
