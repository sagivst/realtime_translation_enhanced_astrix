# Post-Deployment Maintenance & Configuration Management Guide
## Realtime Translation Server - Complete Operational Handbook

**Document Version**: 1.0
**Last Updated**: October 27, 2025
**Server**: Azure VM (4.185.84.26)
**Application**: `/home/azureuser/translation-app`

---

## Table of Contents

1. [Phase 1: Post-Deployment Verification](#phase-1-post-deployment-verification)
2. [Phase 2: Configuration Externalization](#phase-2-configuration-externalization)
3. [Common Issues After Updates](#common-issues-after-updates)
4. [Troubleshooting Guide](#troubleshooting-guide)
5. [Rollback Procedures](#rollback-procedures)
6. [Monitoring & Alerts](#monitoring--alerts)

---

## PHASE 1: Post-Deployment Verification

### Immediate Checks After `deploy-update.sh`

Run these checks **immediately** after any deployment to ensure the system is functioning correctly.

#### 1.1 Server Process Verification

```bash
# SSH into server
ssh azureuser@4.185.84.26

# Check if Node.js process is running
pgrep -a node
# Expected output: Should show "node conference-server.js"

# If not running, check why
tail -100 /tmp/conference-server.log
```

**Expected Result**: Node process running, no fatal errors in logs.

**If Failed**: See [Server Won't Start](#server-wont-start) troubleshooting.

---

#### 1.2 Port Availability Check

```bash
# Verify all required ports are listening
netstat -tulpn | grep -E '(3000|5050|5051|5052|5053)'

# Or with ss command
ss -tulpn | grep -E '(3000|5050|5051|5052|5053)'
```

**Expected Output**:
```
tcp   0.0.0.0:3000   node (conference-server)
tcp   127.0.0.1:5050 node (AudioSocket Ext 7000)
tcp   127.0.0.1:5051 node (WebSocket Ext 7000)
tcp   127.0.0.1:5052 node (AudioSocket Ext 7001)
tcp   127.0.0.1:5053 node (WebSocket Ext 7001)
```

**If Failed**: Port conflict detected. See [Port Conflicts](#port-conflicts).

---

#### 1.3 Configuration Preservation Verification

```bash
# Verify .env file exists and hasn't been overwritten
ls -la /home/azureuser/translation-app/.env
cat /home/azureuser/translation-app/.env | grep -E '(API_KEY|VOICE_ID)' | head -5

# Check user-profiles directory preserved
ls -la /home/azureuser/translation-app/user-profiles/

# Check asterisk-config preserved
ls -la /home/azureuser/translation-app/asterisk-config/
```

**Expected Result**: All configuration files present with correct content.

**If Failed**: See [Configuration Lost After Update](#configuration-lost-after-update).

---

#### 1.4 Dependency Verification

```bash
cd /home/azureuser/translation-app

# Check if package.json dependencies match package-lock.json
npm list --depth=0

# Check for missing dependencies
npm install --dry-run
```

**Expected Result**: All dependencies installed, no missing packages.

**If Failed**: Run `npm install` to fix missing dependencies.

---

#### 1.5 API Keys Validation

```bash
cd /home/azureuser/translation-app

# Check startup logs for API key warnings
tail -50 /tmp/conference-server.log | grep -E '(API|key|configured|missing)'

# Look for these patterns in logs:
# ✓ Deepgram API: Configured
# ✓ DeepL API: Configured
# ✓ ElevenLabs API: Configured
# ✓ Hume AI API: Configured
```

**Expected Result**: All APIs showing as configured.

**If Failed**: Check `.env` file has correct API keys.

---

#### 1.6 Asterisk Integration Check

```bash
# Check Asterisk is running
sudo systemctl status asterisk

# Verify extensions are configured
sudo asterisk -rx 'dialplan show 7000@from-sip-custom'
sudo asterisk -rx 'dialplan show 7001@from-sip-custom'

# Check AudioSocket module loaded
sudo asterisk -rx 'module show like audiosocket'
```

**Expected Result**: Asterisk running, extensions configured, AudioSocket module loaded.

**If Failed**: See [Asterisk Integration Issues](#asterisk-integration-issues).

---

#### 1.7 Functional Test - Extension 7000

```bash
# Monitor server logs in one terminal
ssh azureuser@4.185.84.26 "tail -f /tmp/conference-server.log"

# Make test call to extension 7000 from your SIP client
# Expected log output:
# [Pipeline] ✓ Asterisk connected: <UUID>
# [Pipeline] ✓ Translation ready for session: <UUID>
# [Pipeline/orchestrator5050] ✓ Handshake complete: <UUID> → Extension 7000
```

**Expected Result**: Call connects, audio flows, translation works.

**If Failed**: See [Extension Not Working](#extension-not-working).

---

#### 1.8 Functional Test - Extension 7001

```bash
# Monitor server logs
tail -f /tmp/conference-server.log | grep -E '(7001|orchestrator5052)'

# Make test call to extension 7001
# Expected log output:
# [Pipeline/orchestrator5052] ✓ Handshake complete: <UUID> → Extension 7001
```

**Expected Result**: Both extensions work independently.

**If Failed**: See [Second Extension Not Working](#second-extension-not-working).

---

#### 1.9 Session Management Verification

```bash
# Check for session leaks (should be 0 when idle)
tail -50 /tmp/conference-server.log | grep "Active sessions"

# After a test call, verify cleanup happens
# Should see: [Pipeline] ✓ Session removed: <UUID>
```

**Expected Result**: Sessions are created and cleaned up properly.

**If Failed**: Check for WebSocket recursion loop (see [WebSocket Loop](#websocket-recursion-loop)).

---

#### 1.10 Dashboard Access Verification

```bash
# Test web dashboard access
curl -I http://4.185.84.26:3000

# Or from browser:
# http://4.185.84.26:3000

# Check Socket.IO connectivity
curl http://4.185.84.26:3000/socket.io/
```

**Expected Result**: HTTP 200 response, dashboard accessible.

**If Failed**: Check firewall rules and server configuration.

---

### Post-Deployment Checklist

Use this checklist after every deployment:

- [ ] Node.js process running
- [ ] All 5 ports listening (3000, 5050, 5051, 5052, 5053)
- [ ] `.env` file preserved with correct API keys
- [ ] `user-profiles/` directory preserved
- [ ] Dependencies installed (`npm list` shows no errors)
- [ ] API keys validated (check logs for "configured" messages)
- [ ] Asterisk running and extensions configured
- [ ] Extension 7000 test call successful
- [ ] Extension 7001 test call successful
- [ ] Session cleanup working (no leaks)
- [ ] Dashboard accessible
- [ ] No errors in logs (check last 100 lines)
- [ ] Backup created by deploy-update.sh (check `/home/azureuser/backups/`)

---

## PHASE 2: Configuration Externalization

### Overview

**Goal**: Move all hardcoded operational parameters to configuration files for seamless updates.

**Current Problem**:
- Port numbers hardcoded in code (5050, 5051, 5052, 5053)
- Extension IDs hardcoded (7000, 7001)
- Voice ID hardcoded (pNInz6obpgDQGcFmaJgB)
- Audio settings hardcoded (sample rates, buffer sizes)

**After Phase 2**:
- All parameters in `.env` file
- Easy to change without code modification
- Server cloning with different configs
- Configuration validation before startup

---

### Phase 2 Implementation Plan

#### Step 1: Review Documentation (30 minutes)

**On Server**:
```bash
ssh azureuser@4.185.84.26
cd /home/azureuser/translation-app

# Read detailed implementation guide
cat CONFIGURATION_REFACTORING_SUMMARY.md

# Review parameter mapping
cat CONFIG_PARAMETERS_MAPPING.md

# Check .env template
cat .env.template
```

**Files Already on Server**:
- `CONFIG_PARAMETERS_MAPPING.md` (14KB) - All hardcoded parameters identified
- `.env.template` (5.1KB) - Configuration template
- `config-index.js` (9.8KB) - Configuration module (needs to be moved to `config/`)
- `validate-config.js` (2.3KB) - Pre-start validation script
- `CONFIGURATION_REFACTORING_SUMMARY.md` (14KB) - Complete implementation guide

---

#### Step 2: Setup Configuration Infrastructure (1 hour)

**Non-Breaking Changes - Can Be Done Immediately**

```bash
ssh azureuser@4.185.84.26
cd /home/azureuser/translation-app

# 1. Install dotenv dependency
npm install dotenv --save

# 2. Create config directory
mkdir -p config

# 3. Move config module to correct location
mv config-index.js config/index.js

# 4. Create .env from template
cp .env.template .env
chmod 600 .env

# 5. Edit .env with your API keys
nano .env
# Paste your actual API keys for:
#   DEEPGRAM_API_KEY
#   DEEPL_API_KEY
#   ELEVENLABS_API_KEY
#   ELEVENLABS_VOICE_ID
#   AZURE_SPEECH_KEY
#   HUME_EVI_API_KEY

# 6. Test configuration validation
node validate-config.js
# Should output: ✓ Configuration validation passed
```

**This step is SAFE** - doesn't modify any running code.

---

#### Step 3: Code Refactoring (3-4 hours)

**⚠️ IMPORTANT: Create backup before this step**

```bash
ssh azureuser@4.185.84.26
cd /home/azureuser/translation-app

# Create checkpoint before refactoring
./create-checkpoint.sh refactoring-pre
```

**Files to Modify**:

1. **audiosocket-integration.js** - Replace hardcoded values
2. **conference-server.js** - Ensure uses config module

**Detailed Refactoring Steps in**: `CONFIGURATION_REFACTORING_SUMMARY.md` (Phase 2, Step 3)

**Key Changes**:
- Add `const config = require('./config');` at top
- Replace orchestrator initialization with config values
- Update `getExtensionFromUUID()` to use config array
- Replace voice ID with `config.api.elevenlabs.voiceId`
- Replace WebSocket endpoint with `config.audioSocket.getWebSocketEndpointUrl()`
- Replace audio constants with config values

---

#### Step 4: Testing (2-3 hours)

**Local Testing with Defaults**:
```bash
# Temporarily rename .env to test defaults
mv .env .env.backup
node validate-config.js
# Should use defaults, show warnings for missing API keys

# Start server with defaults
node conference-server.js
# Check it starts without errors (won't work without API keys)

# Restore .env
mv .env.backup .env
```

**Testing with Custom Configuration**:
```bash
# Edit .env with custom test values
nano .env
# Change: AUDIOSOCKET_PORT_7000=6050

# Validate
node validate-config.js

# Start server
killall -9 node
nohup node conference-server.js > /tmp/conference-server.log 2>&1 &

# Verify correct ports
netstat -tulpn | grep -E '(6050)'
# Should show port 6050 instead of 5050

# Revert to original ports
nano .env
# Change back: AUDIOSOCKET_PORT_7000=5050
```

**Functional Testing**:
- Test extension 7000 with actual call
- Test extension 7001 with actual call
- Verify both work independently
- Check logs for configuration messages
- Verify session cleanup

---

#### Step 5: Deployment (1 hour)

**Commit Changes to Git**:
```bash
cd /home/azureuser/translation-app

# Add all new files
git add config/ .env.template validate-config.js
git add CONFIG_PARAMETERS_MAPPING.md CONFIGURATION_REFACTORING_SUMMARY.md

# Commit code changes
git add audiosocket-integration.js conference-server.js package.json

git commit -m "Externalize operational parameters to configuration

- Created config/index.js centralized configuration module
- Added .env.template with all parameters documented
- Added validate-config.js for pre-start validation
- Refactored audiosocket-integration.js to use config module
- All hardcoded ports, extensions, and settings now configurable
- Preserves backward compatibility with defaults
- Includes comprehensive documentation

Phase 2 of deployment maintenance plan completed."

# Push to GitHub
git push origin master
```

**Test Deployment Script**:
```bash
# deploy-update.sh will preserve .env file
./deploy-update.sh

# After deployment, verify:
# 1. .env file still exists
cat .env | head -5

# 2. Configuration validation passes
node validate-config.js

# 3. Server starts successfully
tail -50 /tmp/conference-server.log

# 4. Extensions work
# Make test calls to 7000 and 7001
```

---

### Phase 2 Benefits After Completion

#### Before Phase 2:
```javascript
// audiosocket-integration.js (hardcoded)
const audioSocketOrchestrator5050 = new AudioSocketOrchestrator(5050, 5051);
const audioSocketOrchestrator5052 = new AudioSocketOrchestrator(5052, 5053);
const VOICE_ID = 'pNInz6obpgDQGcFmaJgB';
```

#### After Phase 2:
```javascript
// audiosocket-integration.js (configuration-driven)
const config = require('./config');
const ext1 = config.audioSocket.extensions[0];
const orchestrator1 = new AudioSocketOrchestrator(ext1.audioSocketPort, ext1.webSocketPort);
const VOICE_ID = config.api.elevenlabs.voiceId;
```

#### Configuration Changes:
```bash
# Change voice without touching code
echo "ELEVENLABS_VOICE_ID=different_voice_id" >> .env

# Change ports for new server clone
nano .env
# AUDIOSOCKET_PORT_7000=7050
# AUDIOSOCKET_PORT_7001=7052

# Add new extension (future scalability)
nano .env
# EXTENSION_3_ID=7002
# AUDIOSOCKET_PORT_7002=5054
```

**Result**: Seamless updates, easy server cloning, future scalability.

---

### Phase 2 Timeline

| Step | Task | Time | Risk |
|------|------|------|------|
| 1 | Review documentation | 30 min | None |
| 2 | Setup infrastructure (non-breaking) | 1 hour | None |
| 3 | Code refactoring | 3-4 hours | LOW (with backup) |
| 4 | Testing | 2-3 hours | None |
| 5 | Deployment | 1 hour | LOW |
| **Total** | **Complete Phase 2** | **6-10 hours** | **LOW** |

**Recommended Schedule**: Allocate one day for implementation and testing.

---

## Common Issues After Updates

### Issue 1: Server Won't Start

**Symptoms**:
- `pgrep -a node` shows no process
- Logs show fatal error

**Common Causes**:

#### A. Port Already in Use
```bash
# Check what's using the port
lsof -i :3000
lsof -i :5050

# Kill conflicting process
kill -9 <PID>

# Restart server
cd /home/azureuser/translation-app
nohup node conference-server.js > /tmp/conference-server.log 2>&1 &
```

#### B. Missing Dependencies
```bash
cd /home/azureuser/translation-app

# Check for missing modules
npm install

# If package.json changed, dependencies auto-installed by deploy-update.sh
# If manual start, always run npm install first
```

#### C. Syntax Error in Code
```bash
# Check for syntax errors
node --check conference-server.js
node --check audiosocket-integration.js

# View error
tail -100 /tmp/conference-server.log
```

**Fix**: Restore from backup if code is broken.

---

### Issue 2: Configuration Lost After Update

**Symptoms**:
- `.env` file missing or empty
- API keys not working
- "Missing API key" errors in logs

**Cause**: `deploy-update.sh` failed to preserve `.env`

**Fix**:
```bash
# Check backup
ls -lt /home/azureuser/backups/ | head -5

# Find latest backup
cd /home/azureuser/backups/deployment-YYYYMMDD-HHMMSS

# Restore .env
cp config/.env /home/azureuser/translation-app/.env

# Verify
cat /home/azureuser/translation-app/.env | grep API_KEY

# Restart server
cd /home/azureuser/translation-app
killall -9 node
nohup node conference-server.js > /tmp/conference-server.log 2>&1 &
```

---

### Issue 3: Port Conflicts

**Symptoms**:
- Error: "EADDRINUSE" in logs
- One or more ports not listening

**Diagnosis**:
```bash
# Find what's using each port
lsof -i :3000
lsof -i :5050
lsof -i :5051
lsof -i :5052
lsof -i :5053

# Check for multiple node processes
pgrep -a node
```

**Fix**:
```bash
# Kill all node processes
killall -9 node

# Wait 2 seconds
sleep 2

# Start server cleanly
cd /home/azureuser/translation-app
nohup node conference-server.js > /tmp/conference-server.log 2>&1 &

# Verify all ports listening
sleep 5
netstat -tulpn | grep -E '(3000|5050|5051|5052|5053)'
```

---

### Issue 4: Extension Not Working

**Symptoms**:
- Extension 7000 or 7001 not answering
- No audio during call
- "Extension not found" error

**Diagnosis**:
```bash
# Check Asterisk extensions
sudo asterisk -rx 'dialplan show 7000@from-sip-custom'
sudo asterisk -rx 'dialplan show 7001@from-sip-custom'

# Check AudioSocket connections
tail -50 /tmp/conference-server.log | grep -E '(7000|7001|AudioSocket)'

# Monitor Asterisk logs during test call
sudo tail -f /var/log/asterisk/messages | grep -E '(7000|7001)'
```

**Common Fixes**:

#### A. Asterisk Dialplan Not Loaded
```bash
# Reload dialplan
sudo asterisk -rx 'dialplan reload'

# Verify extensions exist
sudo asterisk -rx 'dialplan show'
```

#### B. AudioSocket Module Not Loaded
```bash
# Check module
sudo asterisk -rx 'module show like audiosocket'

# Load module if needed
sudo asterisk -rx 'module load res_audiosocket.so'
```

#### C. Port Mapping Wrong
```bash
# Check which port extension uses
grep "7000" /etc/asterisk/extensions.conf
# Should show: AudioSocket(${CALL_UUID},127.0.0.1:5050)

grep "7001" /etc/asterisk/extensions.conf
# Should show: AudioSocket(${CALL_UUID},127.0.0.1:5052)
```

---

### Issue 5: WebSocket Recursion Loop

**Symptoms**:
- Thousands of active sessions
- Server becomes unresponsive
- Logs filled with WebSocket connections

**Diagnosis**:
```bash
tail -100 /tmp/conference-server.log | grep "Active sessions"
# If number is > 100, likely a recursion loop

# Check for ws_ prefix in session UUIDs
tail -50 /tmp/conference-server.log | grep "ws_ws_ws"
```

**Cause**: WebSocket loopback connections not being filtered

**Fix**: Ensure protocol filtering is in place:
```javascript
// audiosocket-integration.js - setupOrchestratorHandlers function
orchestrator.on('connection', (info) => {
    // CRITICAL: Skip WebSocket loopback connections
    if (info.protocol === 'websocket') {
        console.log('[Pipeline] Skipping WebSocket loopback:', uuid);
        return; // MUST have this!
    }
    // ... rest of handler
});
```

**Immediate Fix**:
```bash
# Restart server to clear sessions
killall -9 node
sleep 2
nohup node conference-server.js > /tmp/conference-server.log 2>&1 &

# Monitor sessions
watch -n 1 'tail -10 /tmp/conference-server.log | grep "Active sessions"'
# Should stay at 0 when idle, 2 during a call
```

---

### Issue 6: Dashboard Cross-Event Pollution (KNOWN ISSUE)

**Symptoms**:
- Dashboard for Room 1 (extension 7000) shows events from extension 7001
- Dashboard for Room 2 (extension 7001) shows events from extension 7000
- Both dashboards update when either extension receives a call

**Cause**: Dashboards don't filter Socket.IO events by extension ID

**Impact**: MEDIUM - Dashboards show incorrect data but system functions correctly

**Status**: Known issue - requires manual fix to dashboard HTML files

**Manual Fix** (Apply to both `dashboard.html` and `dashboard-room2.html`):

1. Add extension filter constant at the top of the `<script>` section:

```javascript
// For dashboard.html - Extension 7000
const DASHBOARD_EXTENSION = "7000";

// For dashboard-room2.html - Extension 7001
const DASHBOARD_EXTENSION = "7001";
```

2. Update all Socket.IO event listeners to filter by extension:

```javascript
// BEFORE (accepts all events):
socket.on('emotion_detected', (data) => {
    updateHumeEmotions(data);
});

// AFTER (filters by extension):
socket.on('emotion_detected', (data) => {
    if (data.extension !== DASHBOARD_EXTENSION) return;
    updateHumeEmotions(data);
});
```

3. Apply filter to these events:
   - `emotion_detected`
   - `transcriptionPartial`
   - `transcriptionFinal`
   - `translationComplete`
   - `translatedAudio`
   - `pipelineComplete`
   - `audioStream`
   - `audiosocket-connected`
   - `audioStreamStart`
   - `audiosocket-handshake`
   - `audiosocket-disconnected`
   - `audioStreamEnd`

**Quick Fix Command**:
```bash
# Backup dashboards first
cd /home/azureuser/translation-app/public
cp dashboard.html dashboard.html.backup
cp dashboard-room2.html dashboard-room2.html.backup

# Manual editing required - see fix above
# After editing, refresh browser to see changes (no server restart needed)
```

**Workaround**: Use only one dashboard at a time, or accept mixed data display

---

### Issue 7: Second Extension Not Working

**Symptoms**:
- Extension 7000 works fine
- Extension 7001 answers but no audio/translation

**Cause**: Orchestrator 5052 has no event handlers attached

**Diagnosis**:
```bash
# Check for orchestrator setup in logs
tail -100 /tmp/conference-server.log | grep orchestrator

# Should see both:
# [Pipeline] ✓ Event handlers attached to orchestrator5050
# [Pipeline] ✓ Event handlers attached to orchestrator5052
```

**Fix**: Ensure `setupOrchestratorHandlers()` called for BOTH orchestrators:
```javascript
// audiosocket-integration.js
setupOrchestratorHandlers(audioSocketOrchestrator5050, 'orchestrator5050 (ext 7000, port 5050)');
setupOrchestratorHandlers(audioSocketOrchestrator5052, 'orchestrator5052 (ext 7001, port 5052)');
```

---

### Issue 7: Dependencies Out of Sync

**Symptoms**:
- "Cannot find module" errors
- Version conflicts
- Unexpected behavior after update

**Fix**:
```bash
cd /home/azureuser/translation-app

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Verify all dependencies
npm list --depth=0

# Restart server
killall -9 node
nohup node conference-server.js > /tmp/conference-server.log 2>&1 &
```

---

### Issue 8: Asterisk Integration Broken

**Symptoms**:
- Asterisk rejects calls
- AudioSocket not connecting
- "No application 'AudioSocket'" error

**Diagnosis**:
```bash
# Check Asterisk status
sudo systemctl status asterisk

# Check AudioSocket module
sudo asterisk -rx 'module show like audiosocket'

# Check for errors
sudo tail -50 /var/log/asterisk/messages
```

**Fix**:
```bash
# Restart Asterisk
sudo systemctl restart asterisk

# Load AudioSocket module
sudo asterisk -rx 'module load res_audiosocket.so'

# Reload dialplan
sudo asterisk -rx 'dialplan reload'

# Verify extensions
sudo asterisk -rx 'dialplan show 7000@from-sip-custom'
sudo asterisk -rx 'dialplan show 7001@from-sip-custom'
```

---

## Rollback Procedures

### Method 1: Using Deployment Backup

```bash
# Find latest backup
ls -lt /home/azureuser/backups/ | head -5

# Navigate to backup
cd /home/azureuser/backups/deployment-YYYYMMDD-HHMMSS

# Stop current server
killall -9 node

# Extract backup
tar -xzf full-backup.tar.gz -C /home/azureuser/translation-app

# Restart server
cd /home/azureuser/translation-app
nohup node conference-server.js > /tmp/conference-server.log 2>&1 &

# Verify
tail -50 /tmp/conference-server.log
```

### Method 2: Using Git Checkpoint

```bash
cd /home/azureuser/translation-app

# List available checkpoints
ls -lt checkpoints/ | head -10

# Restore specific checkpoint
./restore-checkpoint.sh checkpoint-name

# Or use git directly
git log --oneline | head -10
git checkout <commit-hash>

# Restart
killall -9 node
npm install
nohup node conference-server.js > /tmp/conference-server.log 2>&1 &
```

### Method 3: Restore from GitHub

```bash
cd /home/azureuser/translation-app

# Fetch latest from GitHub
git fetch origin

# Reset to specific commit or branch
git reset --hard origin/master

# Or reset to specific commit
git reset --hard <commit-hash>

# Reinstall dependencies
npm install

# Restart
killall -9 node
nohup node conference-server.js > /tmp/conference-server.log 2>&1 &
```

---

## Monitoring & Alerts

### Daily Health Checks

**Automated Script** (save as `health-check.sh`):
```bash
#!/bin/bash
# Daily health check script

echo "=== Translation Server Health Check ==="
echo "Date: $(date)"
echo ""

# 1. Check process
if pgrep -f "node conference-server.js" > /dev/null; then
    echo "✓ Node process running"
else
    echo "✗ Node process NOT running"
fi

# 2. Check ports
for PORT in 3000 5050 5051 5052 5053; do
    if netstat -tulpn | grep ":$PORT " > /dev/null; then
        echo "✓ Port $PORT listening"
    else
        echo "✗ Port $PORT NOT listening"
    fi
done

# 3. Check recent errors
ERROR_COUNT=$(tail -100 /tmp/conference-server.log | grep -i error | wc -l)
echo ""
echo "Recent errors in logs: $ERROR_COUNT"

# 4. Check Asterisk
if sudo systemctl is-active asterisk > /dev/null; then
    echo "✓ Asterisk running"
else
    echo "✗ Asterisk NOT running"
fi

# 5. Check disk space
DISK_USAGE=$(df -h /home | tail -1 | awk '{print $5}' | sed 's/%//')
echo ""
echo "Disk usage: $DISK_USAGE%"
if [ $DISK_USAGE -gt 80 ]; then
    echo "⚠ Disk usage high!"
fi

echo ""
echo "=== Health Check Complete ==="
```

**Run Daily**:
```bash
chmod +x health-check.sh
./health-check.sh
```

### Log Monitoring

**Watch for Issues**:
```bash
# Monitor logs in real-time
tail -f /tmp/conference-server.log | grep -E '(error|Error|ERROR|warning|Warning)'

# Check for session leaks
watch -n 5 'tail -50 /tmp/conference-server.log | grep "Active sessions"'

# Monitor Asterisk
sudo tail -f /var/log/asterisk/messages | grep -E '(ERROR|WARN)'
```

### Metrics to Track

1. **Active Sessions**: Should be 0 when idle, increase during calls
2. **Port Status**: All 5 ports should always be listening
3. **Error Rate**: < 10 errors per hour is normal
4. **Memory Usage**: Check with `top` or `htop`
5. **Disk Space**: Keep below 80%

---

## Quick Reference Commands

### Server Management
```bash
# Start server
cd /home/azureuser/translation-app && nohup node conference-server.js > /tmp/conference-server.log 2>&1 &

# Stop server
killall -9 node

# Restart server
killall -9 node && sleep 2 && cd /home/azureuser/translation-app && nohup node conference-server.js > /tmp/conference-server.log 2>&1 &

# Check status
pgrep -a node

# View logs
tail -50 /tmp/conference-server.log
tail -f /tmp/conference-server.log
```

### Deployment
```bash
# Deploy update
cd /home/azureuser/translation-app && ./deploy-update.sh

# Create checkpoint
cd /home/azureuser/translation-app && ./create-checkpoint.sh checkpoint-name

# Restore checkpoint
cd /home/azureuser/translation-app && ./restore-checkpoint.sh checkpoint-name
```

### Validation (After Phase 2)
```bash
# Validate configuration
cd /home/azureuser/translation-app && node validate-config.js

# Check .env file
cat /home/azureuser/translation-app/.env | grep -v "^#" | grep -v "^$"
```

### Diagnostics
```bash
# Check ports
netstat -tulpn | grep -E '(3000|5050|5051|5052|5053)'

# Check Asterisk
sudo asterisk -rx 'core show version'
sudo asterisk -rx 'dialplan show 7000@from-sip-custom'
sudo asterisk -rx 'pjsip show endpoints'

# Check dependencies
cd /home/azureuser/translation-app && npm list --depth=0

# Check disk space
df -h

# Check memory
free -h
top -b -n 1 | head -20
```

---

## Support & Documentation

### On Server
- `CONFIGURATION_REFACTORING_SUMMARY.md` - Phase 2 implementation guide
- `CONFIG_PARAMETERS_MAPPING.md` - Parameter inventory
- `.env.template` - Configuration template
- `validate-config.js` - Configuration validator

### Local Documentation
- `docs/sys/POST_DEPLOYMENT_MAINTENANCE_GUIDE.md` - This document

### Scripts Available
- `deploy-update.sh` - Safe deployment with config preservation
- `clone-translation-server.sh` - Server duplication
- `create-checkpoint.sh` - Create backup checkpoint
- `restore-checkpoint.sh` - Restore from checkpoint
- `validate-config.js` - Validate configuration (after Phase 2)
- `health-check.sh` - Daily health check (create from above)

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-27 | Initial document creation |
| | | - Phase 1: Post-deployment verification procedures |
| | | - Phase 2: Configuration externalization plan |
| | | - Common issues and troubleshooting |
| | | - Rollback procedures |
| | | - Monitoring guidelines |

---

**END OF DOCUMENT**
