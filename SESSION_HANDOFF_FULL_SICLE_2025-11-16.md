# Session Handoff - Full Sicle Branch Deployment
**Date**: 2025-11-16
**Time**: ~14:50 UTC
**Branch**: `working-7777-8888-full-sicle`
**Commit**: `8bca668` - "Working 7777-8888 full cycle translation system"

---

## Current System State

### Active Services

**Gateway** (PID: 256235)
- **File**: `/home/azureuser/translation-app/7777-8888-stack/gateway-7777-8888.js`
- **Log**: `/tmp/gateway-FULL-SICLE.log`
- **Status**: ✓ Running
- **Ports**:
  - UDP 5000 (extension 7777 - English)
  - UDP 5001 (extension 8888 - French)
- **Format**: slin16 (16kHz PCM)
- **WebSocket Client**: Connected to localhost:3002

**Conference Server** (PID: 259452)
- **File**: `/home/azureuser/translation-app/7777-8888-stack/conference-server-externalmedia.js`
- **Log**: `/tmp/conference-FULL-SICLE.log`
- **Status**: ✓ Running
- **Ports**:
  - WebSocket: 3002 (HTTP)
  - TCP API: 6001 (Dashboard metrics)
- **Services**:
  - Deepgram STT: ✓
  - DeepL Translation: ✓
  - ElevenLabs TTS: ✓
- **Features Active**:
  - HMLCP (Human-Machine Learning Communication Protocol)
  - Timing module integrated
  - Audio buffer manager
  - User profile adaptation

### Translation Configuration

**Extension 7777**:
- Source: English (en)
- Target: French (fr)
- UDP Port: 5000

**Extension 8888**:
- Source: French (fr)
- Target: English (en)
- UDP Port: 5001

**Registered Pair**: 7777 ↔ 8888

---

## Git Repository Status

**Current Branch**: `working-7777-8888-full-sicle`

**Branch History**:
```
8bca668 Working 7777-8888 full cycle translation system
927edbc Working backup: 7777-8888 timing module integration
5479974 Add complete 7777-8888-stack working code
fa1e8de Working 7777/8888 with Deepgram - VOLUME(RX)=-10dB applied
fcbd5b1 Checkpoint: Working 7000/7001 and 7777/7888 - one word pass
```

**Local Changes**: Stashed before checkout
- To restore: `git stash pop`

**Working Directory**: `/home/azureuser/translation-app/7777-8888-stack` (on Azure VM)

---

## Recent Actions Taken

1. **Restored from Git** (commit 6801c47) - User reported wrong version running
2. **Cataloged Backup Files** - Listed all manual backups from last 48 hours
3. **Switched to `working-7777-8888-full-sicle` Branch**:
   - Fetched from origin
   - Stashed local changes
   - Checked out branch successfully
4. **Started Services**:
   - Gateway started (PID 256235)
   - Conference server had port conflict (6001)
   - Killed old conference server (PID 146139)
   - Restarted conference server successfully (PID 259452)

---

## How to Verify System

### Check Services Running
```bash
ssh azureuser@20.170.155.53 "ps aux | grep -E 'gateway-7777-8888|conference-server' | grep -v grep"
```

**Expected Output**:
```
azureuser  256235  node gateway-7777-8888.js
azureuser  259452  node conference-server-externalmedia.js
```

### Check Logs
```bash
# Gateway log
ssh azureuser@20.170.155.53 "tail -50 /tmp/gateway-FULL-SICLE.log"

# Conference server log
ssh azureuser@20.170.155.53 "tail -50 /tmp/conference-FULL-SICLE.log"
```

### Check WebSocket Server
```bash
curl http://20.170.155.53:3002
```

### Check Git Status
```bash
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/7777-8888-stack && git status && git branch --show-current"
```

**Expected**: On branch `working-7777-8888-full-sicle`

---

## Testing the System

### Make Test Calls

1. **From Phone 1001**: Dial `7777`
   - Speak in English
   - Should hear French translation

2. **From Phone 1002**: Dial `8888`
   - Speak in French
   - Should hear English translation

### Monitor Translation

**Dashboard** (if available):
- URL: `http://20.170.155.53:3002`

**Logs in Real-Time**:
```bash
# Gateway
ssh azureuser@20.170.155.53 "tail -f /tmp/gateway-FULL-SICLE.log"

# Conference Server
ssh azureuser@20.170.155.53 "tail -f /tmp/conference-FULL-SICLE.log"
```

---

## Important Files & Locations

### On Azure VM (20.170.155.53)

**Main Directory**:
```
/home/azureuser/translation-app/7777-8888-stack/
```

**Key Files**:
- `gateway-7777-8888.js` - Gateway with WebSocket translation
- `conference-server-externalmedia.js` - Full translation server
- `.env.externalmedia` - Environment variables

**Logs**:
- `/tmp/gateway-FULL-SICLE.log`
- `/tmp/conference-FULL-SICLE.log`

**Previous Logs** (reference only):
- `/tmp/gateway-RESTORED.log` (previous version)
- `/tmp/conference-ORIGINAL.log` (original version)

### Local Machine

**Handoff Document**:
```
/Users/sagivstavinsky/realtime-translation-enhanced_astrix/SESSION_HANDOFF_FULL_SICLE_2025-11-16.md
```

**Documentation**:
```
/Users/sagivstavinsky/realtime-translation-enhanced_astrix/docs/sys/UNIFIED_GATEWAY_TEST_GUIDE.md
```

**Test Files**:
- `/tmp/gateway-audio-monitor-TEST.js`
- `/tmp/audio-monitor.html`

---

## Environment Variables

**Source**: `/home/azureuser/translation-app/7777-8888-stack/.env.externalmedia`

**Required Variables**:
- `DEEPGRAM_API_KEY` - Speech-to-Text
- `DEEPL_API_KEY` - Translation
- `ELEVENLABS_API_KEY` - Text-to-Speech
- `ARI_URL` - Asterisk REST Interface
- `ARI_USERNAME` - ARI credentials
- `ARI_PASSWORD` - ARI credentials

---

## Quick Command Reference

### Restart Services
```bash
# Stop all
ssh azureuser@20.170.155.53 "pkill -9 -f 'node gateway-7777-8888.js|node conference-server'"

# Start gateway
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/7777-8888-stack && source .env.externalmedia && nohup node gateway-7777-8888.js > /tmp/gateway-FULL-SICLE.log 2>&1 & echo \$!"

# Start conference server
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/7777-8888-stack && source .env.externalmedia && nohup node conference-server-externalmedia.js > /tmp/conference-FULL-SICLE.log 2>&1 & echo \$!"
```

### View Real-Time Logs
```bash
# Both logs side-by-side (requires tmux)
ssh azureuser@20.170.155.53
tmux
tmux split-window -h
# Left pane: tail -f /tmp/gateway-FULL-SICLE.log
# Right pane: tail -f /tmp/conference-FULL-SICLE.log
```

### Check Asterisk
```bash
ssh azureuser@20.170.155.53 "sudo asterisk -rx 'core show channels'"
ssh azureuser@20.170.155.53 "sudo asterisk -rx 'ari show apps'"
```

---

## Known Issues & Solutions

### Issue: Port 6001 Already in Use
**Error**: `EADDRINUSE: address already in use :::6001`

**Solution**:
```bash
# Find process using port 6001
ssh azureuser@20.170.155.53 "lsof -ti:6001"

# Kill the process
ssh azureuser@20.170.155.53 "lsof -ti:6001 | xargs -r kill -9"

# Restart conference server
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/7777-8888-stack && source .env.externalmedia && nohup node conference-server-externalmedia.js > /tmp/conference-FULL-SICLE.log 2>&1 & echo \$!"
```

### Issue: WebSocket Connection Failed
**Check**:
1. Conference server is running: `ps aux | grep conference-server`
2. Port 3002 is open: `netstat -tlnp | grep 3002`
3. Firewall allows port 3002

### Issue: No Audio/Translation
**Check**:
1. Gateway receiving RTP: `grep "RTP" /tmp/gateway-FULL-SICLE.log`
2. WebSocket connection established: `grep "Translation Server" /tmp/gateway-FULL-SICLE.log`
3. Translation services initialized: `grep "✓" /tmp/conference-FULL-SICLE.log`

---

## Manual Backups Available

**Location**: `/home/azureuser/translation-app/7777-8888-stack/manual-backups/`

**Recent Backups** (Nov 13-16, 2025):
- Gateway backups (various configurations)
- Conference server backups (step implementations)
- Audio processing experiments (PT96, PT118, PT126)
- Format conversions (16kHz, 48kHz, slin16)

**To List**:
```bash
ssh azureuser@20.170.155.53 "ls -lht /home/azureuser/translation-app/7777-8888-stack/*.backup* | head -20"
```

---

## System Architecture

```
Phone 1001 (English)
    ↓
Asterisk (ext 7777)
    ↓ UDP RTP (port 5000)
Gateway (256235)
    ↓ WebSocket (localhost:3002)
Conference Server (259452)
    ├─ Deepgram STT (English → Text)
    ├─ DeepL Translation (English Text → French Text)
    └─ ElevenLabs TTS (French Text → Audio)
    ↓ WebSocket Response
Gateway (256235)
    ↓ UDP RTP (port 5001)
Asterisk (ext 8888)
    ↓
Phone 1002 (French)
```

**Bidirectional**: Audio flows both directions simultaneously

---

## Next Steps (Optional)

1. **Test Full Translation Cycle**:
   - Make test call
   - Verify audio quality
   - Check latency/timing
   - Monitor logs for errors

2. **Performance Tuning**:
   - Review timing module settings
   - Adjust buffer sizes if needed
   - Monitor CPU/memory usage

3. **Dashboard Access**:
   - Open `http://20.170.155.53:3002` in browser
   - Check real-time metrics on port 6001

4. **Create Production Backup**:
   - If system works well, create timestamped backup
   - Document any configuration changes

---

## Emergency Rollback

**To Previous Version**:
```bash
# Stop current services
ssh azureuser@20.170.155.53 "pkill -9 -f 'node gateway-7777-8888.js|node conference-server'"

# Switch to main branch (or previous working branch)
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/7777-8888-stack && git checkout main"

# Restart services
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/7777-8888-stack && source .env.externalmedia && nohup node gateway-7777-8888.js > /tmp/gateway-ROLLBACK.log 2>&1 & echo \$!"
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/7777-8888-stack && source .env.externalmedia && nohup node conference-server-externalmedia.js > /tmp/conference-ROLLBACK.log 2>&1 & echo \$!"
```

---

## Contact & Support

**Azure VM**: `azureuser@20.170.155.53`
**SSH Access**: `ssh azureuser@20.170.155.53`

**Key Ports**:
- 8088 - Asterisk ARI
- 3002 - WebSocket/HTTP Server
- 6001 - Dashboard TCP API
- 5000 - RTP Extension 7777
- 5001 - RTP Extension 8888

---

## Session Context

**Previous Issue**: User reported "its not the right version..." - system was running modified files

**Actions Taken**:
1. Restored from git
2. Listed all backup files
3. User requested: "try working-7777-8888-full-sicle from github.com"
4. Successfully deployed full-sicle branch

**Current Status**: ✓ System running on full-sicle branch with complete translation pipeline

**System Health**: All services operational, translation chain complete

---

## Additional Notes

- The `working-7777-8888-full-sicle` branch represents the complete working translation system with timing module integration
- This includes all translation services (Deepgram, DeepL, ElevenLabs) fully integrated
- The system has advanced features like HMLCP and user profile adaptation
- 4 WebSocket clients were already connected when services started (likely dashboard connections)
- Extensions 7000/7001 (AudioSocket system) remain UNTOUCHED - parallel system

---

**End of Handoff Document**
*Generated: 2025-11-16 ~14:50 UTC*
*Ready for new terminal session*
