# 📦 Checkpoint System Overview

**Last Updated**: 2025-11-09
**Version**: 8.0 (FULL DIRECTORY BACKUP - Automatic capture of all new files)

## Latest Checkpoint (2025-11-09 - 13:25 UTC)

**Status**: ✅ **FULL DIRECTORY BACKUP v8.0 - WORKING PERFECTLY**

**Most Recent Checkpoint**: `checkpoint-20251109-132504` (Created: Nov 9, 13:25:04 UTC 2025)
**Location**: `/home/azureuser/translation-app/checkpoints/` on Azure server (20.170.155.53)
**Auto-Backup Frequency**: Every 15 minutes (via cron job)
**Last Verified**: 2025-11-09 13:25 UTC

### System Status
- ✅ **Backup Type**: **FULL DIRECTORY BACKUP** (v8.0)
- ✅ **Cron service**: Active and running
- ✅ **Last checkpoint**: checkpoint-20251109-132504 (every 15 min)
- ✅ **Files backed up**: **225 files** per checkpoint (ALL files in directory)
- ✅ **Checkpoint size**: **4.2MB** per checkpoint
- ✅ **Zero Maintenance**: ALL new files automatically captured!
- ✅ **Backup includes**:
  - **ALL JavaScript files** (101 files)
  - **ALL HTML files** (31 files)
  - **ALL shell scripts** (7 files)
  - **ALL configuration files** (.env, package.json, etc.)
  - **ALL subdirectories** (public/, 7777-8888-stack/, etc.)
  - **ALL Asterisk configs** (8 files)
- ✅ **Smart Exclusions**:
  - node_modules/ (regenerate with npm install)
  - checkpoints/ (don't backup backups)
  - .git/ (git handles versioning)
  - *.log, *.wav, *.backup files

### Current State (2025-11-09)
- Extensions 7000/7001 (AudioSocket on port 3000): ✅ **FULLY OPERATIONAL**
  - Running: conference-server.js (sets global.io for audiosocket-integration)
  - Dashboard: http://20.170.155.53:3000/dashboard.html
  - Status: Transcriptions working, audio appearing on dashboard
- Extensions 7777/8888 (ExternalMedia on port 3002): ⚠️ **SPORADIC WORDS PASS**
  - Running: conference-server-externalmedia.js
  - Dashboard: http://20.170.155.53:3002/dashboard.html
  - Status: Some transcriptions work, needs audio quality improvement
  - Note: Working audio, sporadic transcription success

**Git Branch**: working-7000and1-7777and8-on-dashboard
**Checkpoint Created**: checkpoint-20251109-132504 with description "Working 7000/1 separate from 7777/8888 sporadic words pass"

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
## Last Update: 2025-11-07 (v8.0 - FULL DIRECTORY BACKUP - Zero Maintenance!)

### Comprehensive Backup Coverage

**Files Backed Up**: **ALL FILES** (213+ files - automatically captures everything!)
**Backup Size**: ~3.9MB per checkpoint (was 700KB with selective backup)
**Backup Method**: rsync with smart exclusions (node_modules, .git, logs, temp files)
**Retention**: Automatic (managed by user)
**VM**: asterisk-translation-vm (20.170.155.53)
**Status**: ✅ **VERIFIED WORKING - Last checkpoint: Nov 7, 11:42 UTC**
**Script Version**: 8.0 (Updated 2025-11-07 - FULL DIRECTORY BACKUP - User requested change)

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

## 📦 Full Directory Backup (213+ Files - v8.0)

**NEW in v8.0**: The checkpoint system now backs up the **ENTIRE** `/home/azureuser/translation-app/` directory!

### What Gets Backed Up (Everything!)

✅ **ALL JavaScript files** (~100 files):
- All core application files
- All workers, orchestrators, handlers
- All utilities, RTP files, integrations
- **ANY new .js files you create** - automatically included!

✅ **ALL HTML files** (~30 files):
- All public dashboards
- All test pages
- **ANY new .html files you create** - automatically included!

✅ **ALL Shell Scripts** (7 files):
- create-checkpoint.sh, restore-checkpoint.sh
- All start/stop scripts
- **ANY new .sh files you create** - automatically included!

✅ **ALL Configuration Files**:
- .env, .env.externalmedia
- package.json, package-lock.json
- **ANY new config files** - automatically included!

✅ **ALL Subdirectories**:
- public/
- 7777-8888-stack/
- **ANY new directories** - automatically included!

✅ **ALL Asterisk Configs** (8 files):
- sip.conf, extensions.conf, pjsip.conf, etc.

### Smart Exclusions (What's NOT Backed Up)

❌ node_modules/ (can regenerate with `npm install`)
❌ checkpoints/ (don't backup backups)
❌ .git/ (git already handles version control)
❌ *.log files (regenerated by applications)
❌ *.wav files (temporary audio debug files)
❌ *.backup, *.bak, *.old, *.tmp files

---

## 📦 Legacy File List (70 Files - v7.1 Selective Backup)

**Note**: This section is kept for reference. v8.0 now backs up ALL files automatically.

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
- conference-server-externalmedia.js (Translation Server for 7777/8888 - **NEEDS AMPLIFIER TUNING**)
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

### Public Dashboards (15 files) **UPDATED in v7.1**
**Web Interfaces:**
- dashboard.html (split-screen dashboard)
- dashboard-7777-8888.html (dedicated Phase 2 dashboard) **NEW in v7.1**
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
| Public Dashboards | 15 ✨ UPDATED in v7.1 |
| Asterisk Configs | 8 |
| **TOTAL** | **70 files** |

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

## 📌 Version 8.0 Update Summary (2025-11-07) ⭐ MAJOR UPGRADE

### What's New in v8.0 - FULL DIRECTORY BACKUP

**Revolutionary Change - User Requested:**
1. ✅ **FULL DIRECTORY BACKUP** - Now backs up ENTIRE directory (not just selected files)
2. ✅ **Zero Maintenance** - New files automatically captured without updating script!
3. ✅ **213+ Files Backed Up** - Everything in /home/azureuser/translation-app/
4. ✅ **Smart Exclusions** - Excludes node_modules, .git, logs, temp files
5. ✅ **Tested and Working** - Verified Nov 7, 11:42 UTC
6. ✅ **Size: 3.9MB** - Slightly larger than selective (was 700KB), but still very manageable

**Why This is Better:**
- 🎯 **Never Miss a File** - If you create a new file, it's automatically backed up
- 🔄 **No Script Updates Needed** - Just create files, checkpoints capture them
- 🛡️ **Complete Protection** - Every custom script, config, and file is safe
- 📦 **Peace of Mind** - Never worry "did I back that up?"
- ⚡ **Still Fast** - rsync is efficient, backups complete in ~3-5 seconds
- 💾 **Manageable Size** - 3.9MB every 15 min = ~15MB/hour, ~375MB/day (totally fine!)

**Migration from v7.1:**
- Old v7.1 script backed up as: create-checkpoint.sh.v7.1-selective-backup
- New v8.0 script active and running via cron
- All old checkpoints remain accessible
- Cron job unchanged (still every 15 minutes)

**Testing Results:**
- ✅ Backup created: checkpoint-20251107-114217
- ✅ Files backed up: 213 files
- ✅ Size: 3.9MB
- ✅ Time: ~3 seconds
- ✅ Includes: 100 JS files, 30 HTML files, 7 shell scripts, all configs

---

## 📌 Version 7.1 Update Summary (2025-11-07) - SUPERSEDED by v8.0

**Note**: v7.1 used selective file backup (70 files). This has been replaced by v8.0 full directory backup.

### What Was in v7.1

**System Verification:**
1. ✅ **Checkpoint System Verified Working** - Cron job active and running
2. ✅ **All 70 Files Backing Up** - Including dashboard-7777-8888.html
3. ✅ **Asterisk Configs Included** - All 8 critical Asterisk configuration files
4. ✅ **Phase 2 Stack Protected** - 7777-8888-stack directory fully backed up

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

**Version**: 8.0 ⭐ **FULL DIRECTORY BACKUP**
**Last Updated**: 2025-11-07 11:42 UTC
**Last Verified**: 2025-11-07 11:42 UTC ✅ **SYSTEM CONFIRMED OPERATIONAL**
**Development VM**: 20.170.155.53 (asterisk-translation-vm)
**Current Branch**: working-7000and1-7777and8-on-dashboard

This checkpoint system ensures safe, tracked, and recoverable development with full version history and multiple recovery points. The system automatically creates checkpoints every 15 minutes, backing up the **ENTIRE /home/azureuser/translation-app/ directory** (225 files as of Nov 9, 2025) including all application code, Asterisk configurations, dashboards, scripts, configs, and **ANY new files you create**.

## ✅ Verification Summary (2025-11-09) - v8.0

**Automatic Backup System Status:**
- ✅ Backup Type: **FULL DIRECTORY BACKUP (v8.0)**
- ✅ Cron service: **ACTIVE** - Running every 15 minutes
- ✅ Last checkpoint: `checkpoint-20251109-132504` (Nov 9, 13:25 UTC)
- ✅ Files per checkpoint: **225 files** (ALL files in directory)
- ✅ Checkpoint size: **4.2MB** per checkpoint
- ✅ Checkpoint frequency: **Every 15 minutes** (automated via cron)
- ✅ Backup location: `/home/azureuser/translation-app/checkpoints/`
- ✅ Method: rsync with smart exclusions
- ✅ Zero maintenance: **New files automatically captured!**

**What's Backed Up (Complete List):**
- ✅ JavaScript files: **101 files**
  - All application code, workers, handlers, orchestrators
  - Both 7000/1 (AudioSocket) and 7777/8888 (ExternalMedia) stacks
- ✅ HTML files: **31 files**
  - All dashboards, test pages, monitoring interfaces
- ✅ Shell scripts: **7 files**
  - create-checkpoint.sh, restore-checkpoint.sh, start/stop scripts
- ✅ Asterisk configs: **8 files** (VERIFIED)
  - sip.conf, extensions.conf, modules.conf
  - ari.conf, http.conf, pjsip.conf
  - pjsip_users.conf, rtp.conf
- ✅ All configuration files (.env, .env.externalmedia, package.json, package-lock.json)
- ✅ All subdirectories (public/, 7777-8888-stack/, hmlcp/profiles/, etc.)
- ✅ **ANY new files you create** - automatically included!

**Smart Exclusions (NOT backed up):**
- ❌ node_modules/ (regenerate with npm install)
- ❌ checkpoints/ (don't backup backups)
- ❌ .git/ (git handles versioning)
- ❌ *.log, *.wav files (temporary/regenerated)
- ❌ *.backup, *.bak, *.old, *.tmp files

**Manual Backup Capability:**
- ✅ Manual checkpoint script: Available and functional
- ✅ Restore script: Available and functional
- ✅ User can create checkpoints anytime with custom descriptions
- ✅ Old v7.1 script saved as: create-checkpoint.sh.v7.1-selective-backup

**System Status (2025-11-09):**
- ✅ 7000/1 System (Port 3000): conference-server.js - **WORKING**
- ⚠️ 7777/8888 System (Port 3002): conference-server-externalmedia.js - **SPORADIC WORDS**
- ✅ Git committed to: working-7000and1-7777and8-on-dashboard branch
- ✅ Checkpoint created: "Working 7000/1 separate from 7777/8888 sporadic words pass"

**System guarantees rollback capability to any 15-minute interval with COMPLETE file coverage.**
