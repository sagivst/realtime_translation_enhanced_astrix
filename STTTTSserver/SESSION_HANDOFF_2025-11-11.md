# SESSION HANDOFF - Real-Time Translation System
**Date**: 2025-11-11
**Status**: Steps 1-3 Completed, Ready for Step 4

---

## SYSTEM OVERVIEW

Real-time bidirectional translation system for Extensions 7777 ↔ 8888 with latency synchronization buffer control.

**Architecture**:
```
Asterisk → Gateway (RTP/UDP) → Conference Server (Socket.IO) → [BUFFER HERE] → Gateway → Asterisk
```

**VM**: 20.170.155.53
**User**: azureuser
**SSH**: `ssh azureuser@20.170.155.53`

---

## CURRENT STATUS

### Running Services
- **Gateway**: PID 213948 (may have changed - check with `ps aux | grep gateway-7777-8888`)
- **Conference Server**: PID 215291 (may have changed - check with `ps aux | grep conference-server-externalmedia`)
- **Ports**:
  - 3002 (Conference Server HTTP/Socket.IO)
  - 6001 (Gateway WebSocket)
  - 5050 (AudioSocket for 7777)
  - 5052 (AudioSocket for 8888)

### Completed Steps
✅ **Step 1**: Socket.IO event handlers (setAutoSync, setManualLatency, requestAudioMonitor) - logging only
✅ **Step 2**: Latency broadcasting to dashboard with signed differences
✅ **Step 2.5**: Architecture discovery - identified audio flow and buffer placement point
✅ **Step 3**: Buffer settings storage per extension (Map-based, autoSync: true default)

### Pending Steps
⏳ **Step 4**: Implement actual audio buffer delay (NEXT - main purpose of system)
⏳ **Step 5**: Audio monitoring stream (OPTIONAL - for speaker volume functionality)

---

## KEY FILES & LOCATIONS

### Working Directory
```bash
/home/azureuser/translation-app/7777-8888-stack/
```

### Main Files
1. **conference-server-externalmedia.js** - Main translation server with Steps 1-3 implemented
2. **gateway-7777-8888.js** - RTP/WebSocket bridge
3. **public/dashboard-latency-sync.html** - Buffer control UI (per extension)
4. **public/dashboard-latency-split.html** - Split view for both extensions

### Asterisk Config
```bash
/etc/asterisk/extensions.conf
/etc/asterisk/pjsip.conf
```

### Backup Location
```bash
/home/azureuser/checkpoint-backups/backup-working-7777-8888-buffering-dashboards-20251111-223928/
```

### GitHub Repository
**Branch**: `working-7777-8888-buferng-in`
**URL**: https://github.com/sagivst/realtime_translation_enhanced_astrix/tree/working-7777-8888-buferng-in

---

## DASHBOARDS

### Access URLs
- **Split View (both extensions)**: http://20.170.155.53:3002/dashboard-latency-split.html
- **Extension 7777**: http://20.170.155.53:3002/dashboard-latency-sync.html?ext=7777
- **Extension 8888**: http://20.170.155.53:3002/dashboard-latency-sync.html?ext=8888

### Dashboard Features
- Latency difference bar (-500ms to +500ms)
- Auto Sync toggle button (server-side latency compensation)
- Manual latency slider (0-500ms buffer)
- Speaker volume slider (0-100% for audio monitoring)
- Real-time status display

---

## IMPORTANT CONCEPTS

### Buffer Settings (per extension)
```javascript
// Stored in Map on conference server
bufferSettings = {
  '7777': { autoSync: true, manualLatencyMs: 0 },
  '8888': { autoSync: true, manualLatencyMs: 0 }
}
```

### Latency Calculation
- **Signed values**: +/- indicates faster/slower
- **Mirror values**: If 7777 is +100ms, then 8888 is -100ms
- **Server-side**: All calculations happen on server, not client

### Audio Flow (Step 4 Implementation Point)
```
1. Extension 7777 speaks (English)
2. → Gateway receives RTP
3. → Conference Server: Deepgram STT
4. → DeepL Translation
5. → ElevenLabs TTS (Hebrew audio)
6. → ⚠️ BUFFER HERE (Step 4) ⚠️
7. → Gateway sends to Extension 8888
```

---

## CRITICAL COMMANDS

### Check Running Services
```bash
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app/7777-8888-stack
ps aux | grep -E "gateway-7777|conference-server" | grep -v grep
lsof -i :3002 -i :6001
```

### Restart Services
```bash
# Kill existing processes
lsof -i :3002 | tail -n +2 | awk '{print $2}' | xargs -r kill -9
pkill -f gateway-7777-8888

# Start gateway
nohup node gateway-7777-8888.js >> gateway.log 2>&1 &

# Start conference server
nohup node conference-server-externalmedia.js >> translation-server.log 2>&1 &

# Verify
ps aux | grep -E "gateway-7777|conference-server" | grep -v grep
```

### View Logs
```bash
# Conference server logs (latency, buffer, timing)
tail -f translation-server.log | grep --line-buffered -E '\[Latency\]|\[Buffer\]|\[Timing\]'

# Gateway logs
tail -f gateway.log | grep --line-buffered "7777\|8888"

# Asterisk logs
sudo asterisk -rx "core show channels verbose"
```

### Make a Test Call
```bash
# Use Zoiper or any SIP client
# Server: 20.170.155.53:5060
# Extension: 7777 (English speaker)
# Extension: 8888 (Hebrew speaker)
# Password: (from /etc/asterisk/pjsip_users.conf)
```

---

## STEP 4 IMPLEMENTATION GUIDE

### Goal
Implement actual audio buffer delay after ElevenLabs TTS completion, before sending to opposite extension.

### Location in Code
File: `conference-server-externalmedia.js`
Around line: ~1330 (after ElevenLabs TTS completion)

### Required Changes
1. **Get buffer settings** from Map
2. **Calculate total buffer**:
   ```javascript
   const settings = bufferSettings.get(extension) || { autoSync: true, manualLatencyMs: 0 };
   let totalBufferMs = settings.manualLatencyMs;

   if (settings.autoSync) {
     const latencyDiff = latencyDifferences.get(extension) || 0;
     totalBufferMs += Math.max(0, latencyDiff); // Only buffer if this extension is faster
   }
   ```
3. **Convert MP3 → PCM16** (if not already done)
4. **Use audioBufferManager.bufferAndSend()**:
   ```javascript
   audioBufferManager.bufferAndSend(pcm16Buffer, totalBufferMs, () => {
     // Emit 'translatedAudio' to Gateway
     io.emit('translatedAudio', {
       extension: oppositeExt,
       audio: pcm16Buffer
     });
   });
   ```
5. **Send to OPPOSITE extension** (7777→8888, 8888→7777)

### Testing
1. Open dashboards for both extensions
2. Make test call: dial 7777 and 8888
3. Speak in one extension
4. Adjust manual latency slider
5. Toggle auto-sync
6. Verify audio delay matches settings

---

## BUFFER SETTINGS STORAGE

### Current Implementation (Step 3)
```javascript
// In conference-server-externalmedia.js
const bufferSettings = new Map();

// Socket.IO handlers
socket.on('setAutoSync', ({ extension, enabled }) => {
  const settings = bufferSettings.get(extension) || { autoSync: true, manualLatencyMs: 0 };
  settings.autoSync = enabled;
  bufferSettings.set(extension, settings);
  console.log(`[Buffer Settings] ${extension}: autoSync=${enabled}`);
});

socket.on('setManualLatency', ({ extension, latencyMs }) => {
  const settings = bufferSettings.get(extension) || { autoSync: true, manualLatencyMs: 0 };
  settings.manualLatencyMs = latencyMs;
  bufferSettings.set(extension, settings);
  console.log(`[Buffer Settings] ${extension}: manualLatencyMs=${latencyMs}`);
});
```

---

## LATENCY BROADCASTING (Step 2)

### Current Implementation
```javascript
// Paired broadcasting with mirror values
function broadcastLatencyUpdate(ext7777Diff, ext8888Diff) {
  io.emit('latencyUpdate', {
    extension: '7777',
    buffer: { adjustment: ext7777Diff }
  });

  io.emit('latencyUpdate', {
    extension: '8888',
    buffer: { adjustment: ext8888Diff }
  });
}

// Example: If 7777 is +100ms faster, 8888 is -100ms slower
broadcastLatencyUpdate(100, -100);
```

---

## TROUBLESHOOTING

### Services Not Running
```bash
# Check for port conflicts
lsof -i :3002
lsof -i :6001

# Check logs for errors
tail -50 translation-server.log
tail -50 gateway.log
```

### Dashboard Not Loading
```bash
# Verify HTTP server is running
curl http://localhost:3002/dashboard-latency-sync.html?ext=7777

# Check firewall
sudo ufw status
```

### Audio Not Working
```bash
# Check Asterisk
sudo asterisk -rx "pjsip show endpoints"
sudo asterisk -rx "core show channels"

# Check AudioSocket connections
netstat -an | grep -E "5050|5052"
```

### Latency Not Updating
```bash
# Check Socket.IO connection in browser console
# Should see: [Socket.IO] Connected

# Check server logs
tail -f translation-server.log | grep "\[Latency Dashboard\]"
```

---

## NEXT STEPS (for new session)

1. **Verify system is running**:
   ```bash
   ssh azureuser@20.170.155.53
   cd /home/azureuser/translation-app/7777-8888-stack
   ps aux | grep -E "gateway-7777|conference-server" | grep -v grep
   ```

2. **Review Step 4 implementation point**:
   - Read conference-server-externalmedia.js around line 1330
   - Identify where ElevenLabs TTS audio is ready
   - Plan buffer implementation

3. **Implement Step 4**:
   - Get buffer settings from Map
   - Calculate total buffer (manual + auto)
   - Use audioBufferManager.bufferAndSend()
   - Emit to opposite extension

4. **Test implementation**:
   - Open dashboards
   - Make test calls
   - Verify buffer delay works
   - Test auto-sync functionality

5. **Optional Step 5** (if requested):
   - Implement audio monitoring stream
   - Send audio chunks to dashboard
   - Use Web Audio API to play through speakers

---

## BACKUP & RESTORE

### Restore from Backup
```bash
ssh azureuser@20.170.155.53
cd /home/azureuser/checkpoint-backups/backup-working-7777-8888-buffering-dashboards-20251111-223928

# Copy files to working directory
cp conference-server/conference-server-externalmedia.js /home/azureuser/translation-app/7777-8888-stack/
cp gateway/gateway-7777-8888.js /home/azureuser/translation-app/7777-8888-stack/
cp dashboards/*.html /home/azureuser/translation-app/7777-8888-stack/public/

# Restart services (see CRITICAL COMMANDS above)
```

### Create New Backup
```bash
# On VM
cd /home/azureuser/checkpoint-backups
mkdir backup-YYYY-MM-DD-description
# Copy files and create BACKUP_NOTE.txt

# Push to GitHub
cd backup-YYYY-MM-DD-description
git init
git add .
git commit -m "Checkpoint: description"
git remote add origin git@github.com:sagivst/realtime_translation_enhanced_astrix.git
git push -u origin working-7777-8888-buferng-in --force
```

---

## KEY NOTES

⚠️ **autoSync Default**: ON (true) - system starts with automatic synchronization enabled
⚠️ **Buffer Placement**: RIGHT AFTER ElevenLabs, BEFORE crossed hearing channel ports
⚠️ **Server-Side**: All calculations happen on server, not client-side
⚠️ **Signed Values**: +/- indicates faster/slower, not absolute time
⚠️ **Opposite Extension**: 7777→8888, 8888→7777 (crossed audio paths)

---

## CONTACT & RESOURCES

- **GitHub**: https://github.com/sagivst/realtime_translation_enhanced_astrix
- **Branch**: working-7777-8888-buferng-in
- **VM**: azureuser@20.170.155.53
- **Backup**: /home/azureuser/checkpoint-backups/backup-working-7777-8888-buffering-dashboards-20251111-223928/

---

**Ready for Step 4 Implementation!**
