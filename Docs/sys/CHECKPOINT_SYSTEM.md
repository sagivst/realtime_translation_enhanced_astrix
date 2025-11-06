# 📦 Checkpoint System Overview

**Last Updated**: 2025-11-07
**Version**: 7.1 (Working 7000/7001 and 7777/7888 - One Word Pass)

## Latest Checkpoint (2025-11-07)

**Status**: ✅ Extensions 7000/7001 WORKING | ⚠️ Extensions 7777/7888 PARTIALLY WORKING (one word passes)

**Backup**: `backup-20251107-014028-working-7000and1-7777and8-one-word-pass.tar.gz` (289KB)
**Location**: `/home/azureuser/translation-app/` on Azure server (20.170.155.53)

### Key Fixes Applied
1. **Dashboard HTML Fix**: Corrected dashboard.html to show extensions 7777 & 8888
2. **WebSocket Broadcasting Fix**: Changed `socket.emit` to `global.io.emit` at lines 693 & 709 in conference-server-externalmedia.js
3. **Buffer Size Increase**: Increased from 32000 to 64000 bytes (2 seconds) at line 637

### Current State
- Extensions 7000/7001 (AudioSocket): Fully operational
- Extensions 7777/7888 (ExternalMedia): WebSocket architecture working, one word getting through dashboard
- Issue: Deepgram transcription mostly returns "No transcription", needs improvement

**Dashboard**: http://20.170.155.53:3002/dashboard.html
**Audio Monitor**: http://20.170.155.53:3001/

---

**Previous Version**: 2025-11-06
**Previous Version Number**: 7.0 (Complete Application + Asterisk Backup + ExternalMedia Gateway + Phase 2 Stack - 69 Files)

## Overview

This document describes the complete checkpoint and version control system established for the real-time translation application.

**Two Environments**:
- **Production VM** (4.185.84.26) - Manual checkpoints only
- **Development VM** (20.170.155.53) - Automatic + Manual checkpoints

### 📚 Quick Reference - Key Files

| Type | File | Location |
|------|------|----------|
| **Script** | create-checkpoint.sh | `/home/azureuser/translation-app/create-checkpoint.sh` |
| **Script** | restore-checkpoint.sh | `/home/azureuser/translation-app/restore-checkpoint.sh` |
| **Cron** | User crontab (azureuser) | `crontab -l` |
| **Storage** | Checkpoint directory | `/home/azureuser/translation-app/checkpoints/` |
| **Log** | Cron log | `/tmp/checkpoint-cron.log` |
| **Doc** | This documentation | `/home/azureuser/translation-app/CHECKPOINT_SYSTEM.md` |
| **Doc (Local)** | Local copy | `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/docs/sys/CHECKPOINT_SYSTEM.md` |

---

## ⚠️ CRITICAL: Production vs Development

| VM | IP | Purpose | Checkpoint System | Modify? |
|----|----|----|------------------|---------|
| **Production** | 4.185.84.26 | Live production | Manual backups only | ❌ **NEVER** |
| **Development** | 20.170.155.53 | Testing/Dev | **Automatic + Comprehensive** | ✅ **YES** |

**ALL changes must be tested on DEV VM (20.170.155.53) before considering production deployment.**

---

# 🆕 Development VM Automatic Checkpoint System

## Setup Date: 2025-10-28
## Last Update: 2025-11-06 (v7.0 - Complete 69-File Backup + Phase 2 Stack)

### Comprehensive Backup Coverage

**Files Backed Up**: **69 files** (Complete coverage including 7777-8888-stack directory)
**Backup Size**: ~700KB per checkpoint
**Retention**: Automatic (managed by user)
**VM**: asterisk-translation-vm (20.170.155.53)
**Status**: ✅ Fully operational and tested
**Script Version**: 7.0 (Updated 2025-11-06 - Added 7777-8888-stack directory for Phase 2)

### Automatic Triggers

1. ✅ **Every 15 Minutes** (via cron job) - Creates checkpoint with `[CRON-15MIN]` prefix
2. ✅ **Manual** (via create-checkpoint.sh with custom description)

### 🤖 Automatic Operation - Runs 24/7 Without Human Intervention

**IMPORTANT:** The checkpoint system runs as a background service and requires **NO human interaction**:

#### ✅ Guaranteed Automatic Operation

| Scenario | Behavior |
|----------|----------|
| **Nobody logged in** | ✅ Runs automatically every 15 minutes |
| **Night/Weekends/Holidays** | ✅ Runs continuously 24/7/365 |
| **SSH disconnected** | ✅ Continues running in background |
| **Months/Years** | ✅ Runs indefinitely forever |

#### 🔄 How It Works

**Cron Daemon:**
- System service that runs continuously
- Checks every minute for scheduled jobs
- Executes checkpoint script at :00, :15, :30, :45
- Independent of user sessions

**Background daemon** - runs independently without requiring any user to be logged in.

---

## 📦 Complete File List (69 Files)

### Core Application Files (3 files)
**Main Server & Integration:**
- conference-server.js (main server)
- audiosocket-integration.js (AudioSocket handler)
- server.js (utility server)

### Workers (7 files)
**Speech & Translation:**
- asr-streaming-worker.js (Deepgram ASR worker)
- asr-streaming-worker-16khz.js (16kHz ASR variant)
- deepl-incremental-mt.js (DeepL translation)
- elevenlabs-tts-service.js (ElevenLabs TTS)
- deepgram-streaming-client.js (Deepgram client)
- hume-streaming-client.js (Hume streaming)
- hume-evi-adapter.js (Hume EVI adapter)

### Orchestrators & Handlers (7 files)
**Audio & Media Processing:**
- audiosocket-orchestrator.js (AudioSocket orchestration)
- externalmedia-orchestrator.js (media orchestration)
- externalmedia-integration.js (external media)
- asterisk-ari-handler.js (Asterisk REST Interface)
- audio-stream-buffer.js (audio buffering)
- audio-playback-handler.js (playback management)
- audio-converter.js (audio format conversion)

### ExternalMedia Gateway - 7777/8888 Stack (4 files) **NEW in v6.0**
**Open-Source Gateway for Extensions 7777/8888:**
- ari-externalmedia-handler.js (ARI ExternalMedia Gateway - main handler)
- audio-monitor-server.js (Real-time audio monitoring dashboard)
- simple-port-crossover.js (Port crossover test utility)
- rtp-recorder.js (RTP packet recorder for debugging)

### 7777-8888-stack/ Directory - Phase 2 Files (6 files) **NEW in v7.0**
**Phase 2 Development Stack (Isolated from 7000/7001):**
- gateway-7777-8888.js (Gateway with WebSocket client for translation)
- monitor-7777-8888.js (Audio monitoring dashboard)
- conference-server-externalmedia.js (Translation Server for 7777/8888)
- externalmedia-integration.js (Integration layer)
- externalmedia-orchestrator.js (Orchestrator)
- .env.externalmedia (Phase 2 configuration)

### Latency & Timing (3 files)
**Synchronization:**
- latency-sync-manager.js (latency tracking)
- bidirectional-timing-server.js (timing synchronization)
- timing-client.js (timing client)

### Utilities (5 files)
**Support Functions:**
- confbridge-manager.js (conference bridge management)
- frame-collector.js (audio frame collection)
- pacing-governor.js (pacing control)
- prosodic-segmenter.js (prosodic segmentation)
- punctuation.js (punctuation handling)

### RTP Files (3 files)
**RTP Processing:**
- rtp-audio-receiver.js (RTP receiver)
- rtp-audio-receiver-fixed.js (fixed RTP receiver)
- rtp-packet-builder.js (RTP packet builder)

### Configuration Files (3 files)
**System Configuration:**
- package.json (Node.js dependencies)
- package-lock.json (dependency lock)
- .env (environment variables - API keys, credentials)

### Shell Scripts (6 files) **UPDATED in v6.0**
**Automation:**
- create-checkpoint.sh (checkpoint creation)
- restore-checkpoint.sh (checkpoint restoration)
- start-server.sh (basic server start)
- start-server-with-checkpoint.sh (server start with checkpoint)
- start-crossover-debug.sh (start 7777/8888 crossover debug mode) **NEW**
- stop-crossover-debug.sh (stop crossover debug mode) **NEW**

### Public Dashboards (14 files)
**Web Interfaces:**
- dashboard.html (split-screen dashboard)
- dashboard-room2.html (room 2 view)
- dashboard-single.html (single extension view)
- dashboard-split.html (split view)
- debug-audio.html (audio debugging)
- hmlcp-demo.html (HMLCP demonstration)
- index.html (main page)
- live-transcription-monitor.html (transcription monitor)
- monitoring-dashboard.html (system monitoring)
- onboarding.html (user onboarding)
- test-conference.html (conference testing)
- test-live-stream.html (live stream test)
- test-mic.html (microphone testing)
- test-sip.html (SIP testing)

### Asterisk Configuration Files (8 files)
**Critical PBX Configuration:**
- /etc/asterisk/sip.conf (SIP peer definitions)
- /etc/asterisk/extensions.conf (dial plans for 7777, 8888, etc.)
- /etc/asterisk/modules.conf (module loading configuration)
- /etc/asterisk/ari.conf (Asterisk REST Interface)
- /etc/asterisk/http.conf (HTTP/ARI interface settings)
- /etc/asterisk/pjsip.conf (PJSIP configuration)
- /etc/asterisk/pjsip_users.conf (PJSIP user accounts: 1001, 1002)
- /etc/asterisk/rtp.conf (RTP/media settings)

---

### File Count Summary

| Category | Count |
|----------|-------|
| Core Application JS | 3 |
| Workers | 7 |
| Orchestrators & Handlers | 7 |
| ExternalMedia Gateway (7777/8888) | 4 |
| 7777-8888-stack/ Directory (Phase 2) | 6 ✨ NEW in v7.0 |
| Latency & Timing | 3 |
| Utilities | 5 |
| RTP Files | 3 |
| Configuration | 3 |
| Shell Scripts | 6 |
| Public Dashboards | 14 |
| Asterisk Configs | 8 |
| **TOTAL** | **69 files** |

---

## 🔄 Cron Job Configuration

### Current Schedule

**Frequency**: Every 15 minutes
**User**: azureuser
**Command**:
```bash
*/15 * * * * cd /home/azureuser/translation-app && /home/azureuser/translation-app/create-checkpoint.sh "[CRON-15MIN] Automatic checkpoint" >> /tmp/checkpoint-cron.log 2>&1
```

### Verify Cron Job

```bash
# SSH to DEV VM
ssh azureuser@20.170.155.53

# View cron job
crontab -l

# Check cron service is running
systemctl is-active cron

# View recent cron log
tail -50 /tmp/checkpoint-cron.log
```

---

## 📋 Quick Commands (DEV VM Only)

```bash
# SSH to DEV VM
ssh azureuser@20.170.155.53

# Start server with auto-checkpoint
bash /home/azureuser/translation-app/start-server-with-checkpoint.sh

# Create manual checkpoint
bash /home/azureuser/translation-app/create-checkpoint.sh "Description here"

# List all checkpoints
ls -lhrt /home/azureuser/translation-app/checkpoints/

# Restore specific checkpoint
bash /home/azureuser/translation-app/restore-checkpoint.sh checkpoint-20251106-HHMMSS
```

---

## 🏥 System Health Monitoring & Verification

### Quick Health Check

```bash
# Verify cron is running
ssh azureuser@20.170.155.53 "systemctl is-active cron && echo '✅ Cron operational'"

# View recent automatic checkpoints (proof it's working)
ssh azureuser@20.170.155.53 "ls -lht /home/azureuser/translation-app/checkpoints/ | head -8"

# Check when last automatic checkpoint was created
ssh azureuser@20.170.155.53 "ls -dt /home/azureuser/translation-app/checkpoints/checkpoint-* | head -1 | xargs basename && date"

# View latest checkpoint info
ssh azureuser@20.170.155.53 "ls -dt /home/azureuser/translation-app/checkpoints/checkpoint-* | head -1 | xargs -I {} cat {}/CHECKPOINT_INFO.txt"
```

### Expected Behavior

**Healthy System Indicators:**
- ✅ Cron service: `active`
- ✅ Latest checkpoint: Less than 20 minutes old
- ✅ Cron log: Shows recent successful executions
- ✅ Checkpoints: Named with `[CRON-15MIN]` prefix

---

## 📊 Checkpoint Information

Each checkpoint contains:

1. **CHECKPOINT_INFO.txt** - Complete metadata including:
   - Timestamp
   - Description
   - Total files backed up (57)
   - Complete file listing organized by category
   - System status snapshot (SIP peers, active calls, server process, Asterisk version)

2. **All Application Files** - Complete backup of:
   - Core JS files
   - Workers and orchestrators
   - Configuration files
   - Shell scripts
   - Public dashboards

3. **Asterisk Configs** - Complete backup of:
   - Dial plans (extensions.conf)
   - SIP configuration (sip.conf, pjsip.conf, pjsip_users.conf)
   - System configs (modules.conf, ari.conf, http.conf, rtp.conf)

---

## 🔧 Recovery & Restoration

### Restore from Checkpoint

```bash
# SSH to DEV VM
ssh azureuser@20.170.155.53

# List available checkpoints
ls -lhrt /home/azureuser/translation-app/checkpoints/

# Restore specific checkpoint
cd /home/azureuser/translation-app
./restore-checkpoint.sh checkpoint-YYYYMMDD-HHMMSS
```

### Manual Checkpoint Creation

```bash
# SSH to DEV VM
ssh azureuser@20.170.155.53

# Create checkpoint with description
cd /home/azureuser/translation-app
./create-checkpoint.sh "Your description here"
```

---

## 📌 Version 7.0 Update Summary (2025-11-06)

### What's New in v7.0

**Major Improvements:**
1. ✅ **7777-8888-stack/ Directory Backup** - Complete Phase 2 development stack
   - gateway-7777-8888.js (Gateway with WebSocket - modified for Phase 2B)
   - monitor-7777-8888.js (Audio monitoring)
   - conference-server-externalmedia.js (Translation Server for 7777/8888)
   - externalmedia-integration.js (Integration layer)
   - externalmedia-orchestrator.js (Orchestrator)
   - .env.externalmedia (Phase 2 configuration)
2. ✅ **Separate Directory Backup** - 7777-8888-stack/ isolated from parent directory
3. ✅ **Complete Coverage** - Now backing up 69 files (up from 63)
4. ✅ **Phase 2 Development Protection** - All Phase 2 modifications are backed up
5. ✅ **Clear File Naming** - Renamed files to prevent mistakes (gateway-7777-8888.js, monitor-7777-8888.js)

**Benefits:**
- 🔄 Complete Phase 2 stack backup every 15 minutes
- 🛡️ Safe rollback for Phase 2 development
- 📦 7777-8888-stack isolated from 7000/7001 system
- ⏰ Automatic backups include Phase 2 files
- 🏷️ v7.0 checkpoint identification in logs
- 🔒 7000/7001 files remain protected and separate

---

## 📌 Version 6.0 Update Summary (2025-11-06 - Earlier)

### What's New in v6.0

**Major Improvements:**
1. ✅ **ExternalMedia Gateway Files** - 4 new files for 7777/8888 stack
   - ari-externalmedia-handler.js (Gateway)
   - audio-monitor-server.js (Dashboard)
   - simple-port-crossover.js (Test utility)
   - rtp-recorder.js (Debug utility)
2. ✅ **Debug Scripts** - 2 new shell scripts for crossover testing
   - start-crossover-debug.sh
   - stop-crossover-debug.sh
3. ✅ **Complete Coverage** - Now backing up 63 files (up from 57)
4. ✅ **Phase 2 Ready** - Full backup before Phase 2 implementation
5. ✅ **Backward Compatible** - Works with all previous restore scripts

**Benefits:**
- 🔄 Complete 7777/8888 stack backup
- 🛡️ Safe Phase 2 development with rollback capability
- 📦 Both AudioSocket (7000/7001) and ExternalMedia (7777/8888) covered
- ⏰ Automatic backups continue every 15 minutes
- 🏷️ v6.0 checkpoint identification in logs

---

## 📌 Version 5.0 Update Summary (2025-11-06 - Earlier)

### What Was in v5.0

**Major Improvements:**
1. ✅ **Streamlined Backup** - 57 critical files (down from 209 for efficiency)
2. ✅ **All Core Application Files** - Complete JS application code
3. ✅ **All Public Dashboards** - 14 HTML dashboard files
4. ✅ **Complete Asterisk Configs** - 8 critical PBX configuration files
5. ✅ **Configuration Safety** - .env, package.json, package-lock.json
6. ✅ **Automatic Cron Backups** - Every 15 minutes via cron job
7. ✅ **Checkpoint Prefixes** - Easy identification `[CRON-15MIN]` for automatic

**Benefits:**
- 🔄 Complete system restoration capability
- 🛡️ No configuration loss on rollback
- 📦 Comprehensive disaster recovery
- ⏰ Continuous backup every 15 minutes
- 🏷️ Clear checkpoint identification via prefixes
- ⚡ Faster backup and restore (smaller file set)

---

## 📖 Related Documentation

For comprehensive technical details, see:

- **`CHECKPOINT_SYSTEM.md`** - This file (checkpoint system documentation)
- **`IMPLEMENTATION_MISSING_PARTS.md`** - System architecture and missing components
- **`README.md`** - Project overview
- **`LATENCY_MANAGEMENT.md`** - Latency tracking guide

---

**End of Checkpoint System Documentation**

**Version**: 7.0
**Last Updated**: 2025-11-06
**Development VM**: 20.170.155.53 (asterisk-translation-vm)
**Current Branch**: working-7000and1-7777and8-on-dashboard

This checkpoint system ensures safe, tracked, and recoverable development with full version history and multiple recovery points. The system automatically creates checkpoints every 15 minutes, backing up **69 critical files** including application code, Asterisk configurations, ExternalMedia Gateway (7777/8888 stack), Phase 2 development stack (7777-8888-stack/ directory), and system settings.
