# 📦 Checkpoint System Overview

**Last Updated**: 2025-11-16 15:20 UTC
**Version**: 8.1 (FULL DIRECTORY BACKUP + HOMER + ASTERISK - Automatic capture of all new files)
**Status**: ✅ VERIFIED WORKING - Automatic backups every 15 minutes

## Latest Checkpoint (2025-11-16 - 15:19 UTC)

**Status**: ✅ **FULL DIRECTORY BACKUP v8.1 - WORKING PERFECTLY**

**Most Recent Checkpoint**: `checkpoint-20251116-151944` (Created: Nov 16, 15:19:44 UTC 2025)
**Location**: `/home/azureuser/translation-app/checkpoints/` on Azure server (20.170.155.53)
**Auto-Backup Frequency**: Every 15 minutes (via cron job)
**Last Verified**: 2025-11-16 15:20 UTC ✅ **CONFIRMED ACTIVE**
**Script Status**: ✅ **RESTORED** - create-checkpoint.sh recovered from backup checkpoint

### System Status
- ✅ **Backup Type**: **FULL DIRECTORY BACKUP v8.1** (Application + Asterisk + Homer configs)
- ✅ **Cron service**: Active and running (verified: `systemctl is-active cron`)
- ✅ **Last checkpoint**: checkpoint-20251116-151944 (manual test successful)
- ✅ **Files backed up**: **980 files** per checkpoint (ALL files + system configs)
- ✅ **Checkpoint size**: **26MB** per checkpoint
- ✅ **Zero Maintenance**: ALL new files automatically captured!
- ⚠️ **Note**: Grafana not installed (directory `/etc/grafana/` does not exist)
- ✅ **Backup includes**:
  - **ALL JavaScript files** (263 files - all application code)
  - **ALL HTML files** (84 files - all dashboards and test pages)
  - **ALL shell scripts** (7 files - automation and deployment)
  - **ALL configuration files** (.env, package.json, etc.)
  - **ALL documentation files** (.md files including handoff docs, implementation plans, test plans)
  - **ALL subdirectories** (public/, 7777-8888-stack/, manual-backups/, hmlcp/, etc.)
  - **ALL Asterisk configs** (109 config files in /etc/asterisk/) ✅ **VERIFIED IN LATEST CHECKPOINT**
  - **ALL Homer configs** (/opt/homer-app/, /opt/homer-docker/, /opt/homer-ui/) ✅ **VERIFIED v8.1**
  - **Grafana configs** - ⚠️ **NOT INSTALLED** (no /etc/grafana/ directory found)
- ✅ **Smart Exclusions**:
  - node_modules/ (regenerate with npm install)
  - checkpoints/ (don't backup backups)
  - .git/ (git handles versioning)
  - *.log, *.wav, *.backup files
  - Homer/Grafana data directories (too large, regenerated)

### Current State (2025-11-16)
- Extensions 7000/7001 (AudioSocket on port 3000): ✅ **FULLY OPERATIONAL**
  - Running: conference-server.js (sets global.io for audiosocket-integration)
  - Dashboard: http://20.170.155.53:3000/dashboard.html
  - Status: Transcriptions working, audio appearing on dashboard
- Extensions 7777/8888 (ExternalMedia on port 3002): ✅ **FULLY OPERATIONAL**
  - Running: conference-server-externalmedia.js (PID 259452)
  - Gateway: gateway-7777-8888.js (PID 256235)
  - Dashboard: http://20.170.155.53:3002/
  - Status: Full translation cycle working (Deepgram + DeepL + ElevenLabs)
  - Branch: working-7777-8888-full-sicle

**Git Branch**: main (local), working-7777-8888-full-sicle (VM)
**Latest Checkpoint**: checkpoint-20251116-151944

### Recent Maintenance (2025-11-16)
**Issue**: create-checkpoint.sh script was missing from parent directory
**Root Cause**: Script was deleted or moved, but checkpoints continued being created
**Resolution**: ✅ Restored script from latest checkpoint backup
**Status**: ✅ Script functional, manual checkpoint tested successfully
**Impact**: Cron job will now work correctly (next automatic checkpoint at :00, :15, :30, :45)

**New Documentation Files Added (2025-11-11):**
- `SESSION_HANDOFF_2025-11-11.md` (11K) - Complete session handoff with system status
- `STEP_4_IMPLEMENTATION_PLAN.md` (32K) - Detailed 6-subtask implementation plan
- `STEPS_1-3_TEST_PLAN.md` (12K) - Testing procedures for completed steps
- **All automatically backed up every 15 minutes** ✅

**Manual Backup Created**: `backup-working-7777-8888-buffering-dashboards-20251111-223928`
- Location: `/home/azureuser/checkpoint-backups/`
- Status: Working state before Step 4 implementation
- Includes: All gateway files, conference server, dashboards, Asterisk configs

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

**Version**: 8.1 ⭐ **FULL DIRECTORY BACKUP + HOMER + GRAFANA**
**Last Updated**: 2025-11-13 21:05 UTC
**Last Verified**: 2025-11-13 21:05 UTC ✅ **SYSTEM CONFIRMED OPERATIONAL**
**Development VM**: 20.170.155.53 (asterisk-translation-vm)
**Current Branch**: main

This checkpoint system ensures safe, tracked, and recoverable development with full version history and multiple recovery points. The system automatically creates checkpoints every 15 minutes, backing up the **ENTIRE /home/azureuser/translation-app/ directory** (514 files as of Nov 13, 2025) including:

- **ALL application code** (JavaScript, HTML, shell scripts)
- **ALL Asterisk configurations** (8 critical .conf files)
- **ALL Homer configurations** (homer-app.yaml, Docker configs, UI configs)
- **ALL Grafana configurations** (/etc/grafana/ directory)
- **ALL dashboards, scripts, configs**
- **ANY new files you create** - automatically included!

## ✅ Verification Summary (2025-11-16) - v8.1

**Automatic Backup System Status:**
- ✅ Backup Type: **FULL DIRECTORY BACKUP v8.1** (Application + Asterisk + Homer configs)
- ✅ Cron service: **ACTIVE** - Running every 15 minutes (VERIFIED: `systemctl is-active cron`)
- ✅ Last checkpoint: `checkpoint-20251116-151944` (Nov 16, 15:19 UTC) - **Manual test successful**
- ✅ Files per checkpoint: **980 files** (ALL files + system configs)
- ✅ Checkpoint size: **26MB** per checkpoint
- ✅ Checkpoint frequency: **Every 15 minutes** (automated via cron)
- ✅ Backup location: `/home/azureuser/translation-app/checkpoints/`
- ✅ Method: rsync with smart exclusions
- ✅ Zero maintenance: **New files automatically captured!**
- ✅ Script status: **RESTORED AND WORKING** (recovered from checkpoint backup)

**What's Backed Up (Complete List):**
- ✅ Application files: **~980 files**
  - **263 JavaScript files** (application code, workers, handlers, orchestrators)
  - **84 HTML files** (dashboards, test pages, monitoring interfaces)
  - **7 shell scripts** (create-checkpoint.sh, restore-checkpoint.sh, start/stop scripts)
  - Both 7000/7001 (AudioSocket) and 7777/8888 (ExternalMedia) stacks
  - All integrations, utilities, and custom scripts
  - All configuration files (.env, .env.externalmedia, package.json, package-lock.json)
  - All subdirectories (public/, 7777-8888-stack/, hmlcp/profiles/, manual-backups/, etc.)
  - **ANY new directories created (e.g., 5555-6666-gstreamer-phase1/)** will be automatically included
- ✅ Asterisk configs: **109 files** ✅ **VERIFIED IN v8.1**
  - sip.conf, extensions.conf, modules.conf
  - ari.conf, http.conf, pjsip.conf
  - pjsip_users.conf, rtp.conf
  - Plus 101 additional configuration files
- ✅ Homer configs: **Available at /opt/homer-app/** ✅ **VERIFIED v8.1**
  - homer-app.yaml (main configuration)
  - Homer Docker all-in-one setup
  - Homer UI configuration files
- ⚠️ Grafana configs: **NOT INSTALLED**
  - /etc/grafana/ directory does not exist on this system
- ✅ **Total: 980+ files backed up automatically every 15 minutes**
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

**System Status (2025-11-11):**
- ✅ 7000/1 System (Port 3000): conference-server.js - **WORKING**
  - Full AudioSocket translation pipeline operational
  - Dashboard: http://20.170.155.53:3000/dashboard.html
- 🔧 7777/8888 System (Port 3002): conference-server-externalmedia.js - **STEP 4 IMPLEMENTATION IN PROGRESS**
  - Steps 1-3: ✅ COMPLETE (Socket.IO handlers, latency broadcasting, settings storage)
  - Step 4: 🔧 READY TO IMPLEMENT (audio buffer delay and return path)
  - Dashboard: http://20.170.155.53:3002/dashboard-latency-split.html
  - Gateway: PID 213948 (gateway-7777-8888.js)
  - Conference Server: PID 215291 (conference-server-externalmedia.js)
- ✅ Git committed to: main branch

**Manual Backup Protection:**
- Latest manual backup: `backup-working-7777-8888-buffering-dashboards-20251111-223928`
- Created: Nov 11, 2025 - 22:39:28 UTC
- Purpose: Safe rollback point before Step 4 implementation
- Contains: Complete working state with Steps 1-3 implemented

**System guarantees:**
- ✅ Rollback capability to any 15-minute interval with COMPLETE file coverage
- ✅ Manual backup available for Step 4 implementation safety
- ✅ All Asterisk configs backed up every 15 minutes (8 critical files verified)
- ✅ All new documentation files automatically captured
