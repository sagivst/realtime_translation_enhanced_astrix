# Gateway Merger Implementation Plan with Regression Testing
**Date:** 2025-11-21
**Purpose:** Step-by-step implementation plan for merging conf-server-phase1.js PCM sockets into STTTTSserver.js
**Regression Testing:** Interspersed throughout to ensure 5555/6666 and 7777/8888 systems remain unaffected

---

## Overview

This plan integrates proven PCM socket functionality from `conf-server-phase1.js` into `STTTTSserver.js` to enable UDP-based real-time translation for extensions 3333 (English) ↔ 4444 (French).

**Key Changes:**
- Remove cross-patch logic (lines 186, 221)
- Add audio buffering (~1 second / 32000 bytes)
- Connect UDP sockets to existing translation pipeline
- Preserve dashboard and all existing systems

**Regression Testing Strategy:**
- Test baseline BEFORE changes (Test A)
- Make changes
- Test new system (3333/4444)
- Test existing systems AFTER changes (Test B)
- Compare baseline vs post-merger state

---

## PHASE 0: Preparation & Baseline Verification

### Step 0.1: Git Rollback & Local Backup
```bash
cd /Users/sagivstavinsky/realtime-translation-enhanced_astrix
git fetch origin
git checkout Working_5555-6_7777-8_Getaway_no_STTTTSserver
git status

# Verify baseline file
wc -l 3333_4444__Operational/STTTTSserver/STTTTSserver.js
# Expected: ~2732 lines

# Create local backup
cp 3333_4444__Operational/STTTTSserver/STTTTSserver.js \
   3333_4444__Operational/STTTTSserver/STTTTSserver.js.before-merger-$(date +%Y%m%d-%H%M%S)
```

### Step 0.2: Remote Backup
```bash
ssh azureuser@20.170.155.53 << 'EOF'
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
cp STTTTSserver.js STTTTSserver.js.before-merger-$(date +%Y%m%d-%H%M%S)
ls -lh STTTTSserver.js.before-merger-*
EOF
```

---

## 🔍 REGRESSION TEST A: Baseline Verification (BEFORE Changes)

**Purpose:** Verify ALL systems work BEFORE merger to establish baseline

### Test A.1: Check Current Remote State
```bash
ssh azureuser@20.170.155.53 << 'EOF'
echo "=== Active Processes ==="
pgrep -af "STTTTSserver|gateway|conf-server" || echo "No processes running"

echo -e "\n=== Port Status ==="
ss -ulnp | grep -E '(612[0-3]|610[0-3]|700[0-3])'
ss -tlnp | grep 3020

echo -e "\n=== Dashboard Status ==="
curl -I http://localhost:3020/dashboard.html 2>/dev/null | head -1
curl -I http://localhost:3020/ 2>/dev/null | head -1
EOF
```

### Test A.2: Verify 5555/6666 System (Cross-Patch, No Translation)
```bash
ssh azureuser@20.170.155.53 << 'EOF'
echo "=== 5555/6666 System Status ==="
cd /home/azureuser/translation-app/5555-6666-gstreamer-phase1
pgrep -af "conf-server-phase1|gateway-5555|gateway-6666" || echo "⚠️ Not running"
ss -ulnp | grep -E '610[0-3]' || echo "⚠️ Ports 6100-6103 not listening"
EOF
```

**Manual Test A.2:**
- Call extension 5555
- Speak: "Testing baseline audio cross-patch"
- Verify: Extension 6666 hears same audio (NO translation)
- ✅ Expected: Audio passes through unchanged

### Test A.3: Verify 7777/8888 System (Translation Active)
```bash
ssh azureuser@20.170.155.53 << 'EOF'
echo "=== 7777/8888 System Status ==="
cd /home/azureuser/translation-app/7777-8888-stack
pgrep -af "conference-server|gateway-7777|gateway-8888" || echo "⚠️ Not running"
ss -ulnp | grep -E '700[0-3]' || echo "⚠️ Ports 7000-7003 not listening"
EOF
```

**Manual Test A.3:**
- Call extension 7777
- Speak English: "Hello, how are you?"
- Verify: Extension 8888 hears French translation
- ✅ Expected: Translation works correctly

### Test A.4: Document Baseline State
```bash
ssh azureuser@20.170.155.53 << 'EOF'
echo "=== BASELINE STATE SNAPSHOT ===" > /tmp/baseline-state.txt
date >> /tmp/baseline-state.txt
echo -e "\nProcesses:" >> /tmp/baseline-state.txt
pgrep -af "STTTTSserver|gateway|conf-server" >> /tmp/baseline-state.txt
echo -e "\nPorts:" >> /tmp/baseline-state.txt
ss -ulnp | grep -E '(612[0-3]|610[0-3]|700[0-3])' >> /tmp/baseline-state.txt
ss -tlnp | grep 3020 >> /tmp/baseline-state.txt
cat /tmp/baseline-state.txt
EOF
```

---

## PHASE 1: Local Code Integration

### Step 1.1: Create Merged Code Block
```bash
cat > /tmp/udp-pcm-merger-complete.js << 'EOF'
// ============================================================================
// UDP PCM SOCKET INTEGRATION
// Merged from: 3333_4444__Operational/Gateway/conf-server-phase1.js
//
// PURPOSE: Use proven PCM sockets with gateway-3333-buffered.js and
//          gateway-4444-buffered.js for real-time translation
//
// CHANGES FROM conf-server-phase1.js:
// - REMOVED: Direct cross-patch logic (lines 186, 221)
// - REMOVED: WebSocket server (port 3020 conflict with Socket.IO)
// - ADDED: Audio buffering for translation
// - ADDED: Translation pipeline integration (STT → Translate → TTS)
// - REPLACED: broadcastAudio() → global.io.emit()
// ============================================================================

const dgram = require('dgram');

// Configuration (from conf-server-phase1.js lines 28-40)
const UDP_PCM_CONFIG = {
  port3333In: 6120,
  port3333Out: 6121,
  port4444In: 6122,
  port4444Out: 6123,
  gatewayHost: '127.0.0.1',
  sampleRate: 16000,
  channels: 1,
  frameSizeMs: 20,
  frameSizeBytes: 640,
  bufferThreshold: 32000
};

// Socket Creation (from conf-server-phase1.js lines 62-65)
const socket3333In = dgram.createSocket('udp4');
const socket3333Out = dgram.createSocket('udp4');
const socket4444In = dgram.createSocket('udp4');
const socket4444Out = dgram.createSocket('udp4');

// Statistics
let udpPcmStats = {
  from3333Packets: 0,
  to3333Packets: 0,
  from4444Packets: 0,
  to4444Packets: 0,
  translationRequests: 0,
  translationSuccesses: 0,
  translationErrors: 0,
  startTime: Date.now()
};

// Audio Buffering
const udpAudioBuffers = new Map();
udpAudioBuffers.set('3333', {
  chunks: [],
  totalBytes: 0,
  language: 'en',
  lastProcessed: Date.now()
});
udpAudioBuffers.set('4444', {
  chunks: [],
  totalBytes: 0,
  language: 'fr',
  lastProcessed: Date.now()
});

// Extension 3333 Handler (based on conf-server-phase1.js lines 175-196)
socket3333In.on('message', async (msg, rinfo) => {
  udpPcmStats.from3333Packets++;

  if (udpPcmStats.from3333Packets <= 5) {
    console.log(`[UDP-3333] Gateway connected: ${msg.length} bytes/frame (packet #${udpPcmStats.from3333Packets})`);
  }

  if (global.io) {
    global.io.emit('audioStream', {
      extension: '3333',
      buffer: msg,
      sampleRate: UDP_PCM_CONFIG.sampleRate,
      channels: UDP_PCM_CONFIG.channels,
      timestamp: Date.now(),
      transport: 'udp-pcm',
      source: 'microphone'
    });
  }

  const buffer = udpAudioBuffers.get('3333');
  buffer.chunks.push(Buffer.from(msg));
  buffer.totalBytes += msg.length;

  if (buffer.totalBytes >= UDP_PCM_CONFIG.bufferThreshold) {
    const combinedBuffer = Buffer.concat(buffer.chunks);
    buffer.chunks = [];
    buffer.totalBytes = 0;
    buffer.lastProcessed = Date.now();

    console.log(`[UDP-3333] Processing ${combinedBuffer.length} bytes`);
    await processUdpPcmAudio('3333', combinedBuffer, 'en');
  }
});

socket3333In.on('error', (err) => {
  console.error(`[UDP-3333] Socket error:`, err.message);
  udpPcmStats.translationErrors++;
});

// Extension 4444 Handler (based on conf-server-phase1.js lines 210-231)
socket4444In.on('message', async (msg, rinfo) => {
  udpPcmStats.from4444Packets++;

  if (udpPcmStats.from4444Packets <= 5) {
    console.log(`[UDP-4444] Gateway connected: ${msg.length} bytes/frame (packet #${udpPcmStats.from4444Packets})`);
  }

  if (global.io) {
    global.io.emit('audioStream', {
      extension: '4444',
      buffer: msg,
      sampleRate: UDP_PCM_CONFIG.sampleRate,
      channels: UDP_PCM_CONFIG.channels,
      timestamp: Date.now(),
      transport: 'udp-pcm',
      source: 'microphone'
    });
  }

  const buffer = udpAudioBuffers.get('4444');
  buffer.chunks.push(Buffer.from(msg));
  buffer.totalBytes += msg.length;

  if (buffer.totalBytes >= UDP_PCM_CONFIG.bufferThreshold) {
    const combinedBuffer = Buffer.concat(buffer.chunks);
    buffer.chunks = [];
    buffer.totalBytes = 0;
    buffer.lastProcessed = Date.now();

    console.log(`[UDP-4444] Processing ${combinedBuffer.length} bytes`);
    await processUdpPcmAudio('4444', combinedBuffer, 'fr');
  }
});

socket4444In.on('error', (err) => {
  console.error(`[UDP-4444] Socket error:`, err.message);
  udpPcmStats.translationErrors++;
});

// UDP-to-Translation Integration Function
// Connects UDP sockets TO existing translation functions in STTTTSserver.js
async function processUdpPcmAudio(sourceExtension, pcmBuffer, sourceLang) {
  try {
    udpPcmStats.translationRequests++;

    const targetExtension = sourceExtension === '3333' ? '4444' : '3333';
    const targetLang = sourceLang === 'en' ? 'fr' : 'en';

    console.log(`[UDP-${sourceExtension}] Starting translation: ${sourceLang} → ${targetLang}`);

    // Calls EXISTING functions from STTTTSserver.js
    const wavAudio = addWavHeader(pcmBuffer);
    const transcribedText = await transcribeAudio(wavAudio, sourceLang);

    if (!transcribedText || transcribedText.trim() === '') {
      console.log(`[UDP-${sourceExtension}] No speech detected`);
      return;
    }
    console.log(`[UDP-${sourceExtension}] Transcribed: "${transcribedText}"`);

    const translatedText = await translateText(transcribedText, sourceLang, targetLang);
    console.log(`[UDP-${sourceExtension}→${targetExtension}] Translated: "${translatedText}"`);

    const mp3Buffer = await synthesizeSpeech(translatedText, targetLang);
    console.log(`[UDP-${sourceExtension}→${targetExtension}] Generated ${mp3Buffer.length} bytes MP3`);

    const translatedPcm = await convertMp3ToPcm16(mp3Buffer);
    console.log(`[UDP-${sourceExtension}→${targetExtension}] Converted to ${translatedPcm.length} bytes PCM`);

    await sendUdpPcmAudio(targetExtension, translatedPcm);

    udpPcmStats.translationSuccesses++;
    console.log(`[UDP-${sourceExtension}→${targetExtension}] ✓ Translation complete`);

  } catch (error) {
    console.error(`[UDP-${sourceExtension}] Translation error:`, error.message);
    udpPcmStats.translationErrors++;
  }
}

// Send Function
async function sendUdpPcmAudio(targetExtension, pcmBuffer) {
  const socket = targetExtension === '3333' ? socket3333Out : socket4444Out;
  const port = targetExtension === '3333' ? UDP_PCM_CONFIG.port3333Out : UDP_PCM_CONFIG.port4444Out;

  const frameSize = UDP_PCM_CONFIG.frameSizeBytes;
  const totalFrames = Math.floor(pcmBuffer.length / frameSize);

  console.log(`[UDP-${targetExtension}] Sending ${pcmBuffer.length} bytes (${totalFrames} frames)`);

  for (let i = 0; i < totalFrames; i++) {
    const frame = pcmBuffer.slice(i * frameSize, (i + 1) * frameSize);

    await new Promise((resolve, reject) => {
      socket.send(frame, port, UDP_PCM_CONFIG.gatewayHost, (err) => {
        if (err) {
          reject(err);
        } else {
          if (targetExtension === '3333') {
            udpPcmStats.to3333Packets++;
          } else {
            udpPcmStats.to4444Packets++;
          }
          resolve();
        }
      });
    });

    await new Promise(resolve => setTimeout(resolve, 20));
  }

  console.log(`[UDP-${targetExtension}] ✓ Sent ${totalFrames} frames`);
}

// Socket Binding
socket3333In.bind(UDP_PCM_CONFIG.port3333In, () => {
  console.log(`[UDP-3333] ✓ Listening on UDP ${UDP_PCM_CONFIG.port3333In}`);
});

socket3333In.on('listening', () => {
  const addr = socket3333In.address();
  console.log(`[UDP-3333] Bound to ${addr.address}:${addr.port}`);
});

socket3333Out.bind(() => {
  console.log(`[UDP-3333] ✓ Ready to send via UDP ${UDP_PCM_CONFIG.port3333Out}`);
});

socket4444In.bind(UDP_PCM_CONFIG.port4444In, () => {
  console.log(`[UDP-4444] ✓ Listening on UDP ${UDP_PCM_CONFIG.port4444In}`);
});

socket4444In.on('listening', () => {
  const addr = socket4444In.address();
  console.log(`[UDP-4444] Bound to ${addr.address}:${addr.port}`);
});

socket4444Out.bind(() => {
  console.log(`[UDP-4444] ✓ Ready to send via UDP ${UDP_PCM_CONFIG.port4444Out}`);
});

console.log('\n' + '='.repeat(60));
console.log('  UDP PCM TRANSLATION SOCKETS ACTIVE');
console.log('='.repeat(60));
console.log('Extension 3333 (EN): IN=6120, OUT=6121');
console.log('Extension 4444 (FR): IN=6122, OUT=6123');
console.log('='.repeat(60) + '\n');

// Statistics Logging
setInterval(() => {
  const uptime = Math.floor((Date.now() - udpPcmStats.startTime) / 1000);
  const successRate = udpPcmStats.translationRequests > 0
    ? (udpPcmStats.translationSuccesses / udpPcmStats.translationRequests * 100).toFixed(1)
    : 0;

  console.log('\n' + '='.repeat(60));
  console.log('  UDP PCM STATS');
  console.log('='.repeat(60));
  console.log(`Uptime: ${uptime}s`);
  console.log(`3333: RX=${udpPcmStats.from3333Packets}, TX=${udpPcmStats.to3333Packets}`);
  console.log(`4444: RX=${udpPcmStats.from4444Packets}, TX=${udpPcmStats.to4444Packets}`);
  console.log(`Translations: ${udpPcmStats.translationRequests} requests, ${udpPcmStats.translationSuccesses} OK (${successRate}%)`);
  console.log(`Errors: ${udpPcmStats.translationErrors}`);
  console.log('='.repeat(60) + '\n');
}, 30000);
EOF
```

### Step 1.2: Apply Merger Locally
```bash
cd /Users/sagivstavinsky/realtime-translation-enhanced_astrix

# Append merged code
cat /tmp/udp-pcm-merger-complete.js >> 3333_4444__Operational/STTTTSserver/STTTTSserver.js

# Verify syntax
node --check 3333_4444__Operational/STTTTSserver/STTTTSserver.js
echo "✅ Syntax check: $?"

# Check line count
wc -l 3333_4444__Operational/STTTTSserver/STTTTSserver.js
# Expected: ~3000 lines (2732 baseline + 270 new)
```

---

## PHASE 2: Deployment to Remote

### Step 2.1: Stop Existing STTTTSserver
```bash
ssh azureuser@20.170.155.53 "pkill -f STTTTSserver.js; sleep 2; pgrep -f STTTTSserver || echo '✅ Stopped'"
```

### Step 2.2: Deploy Merged File
```bash
scp 3333_4444__Operational/STTTTSserver/STTTTSserver.js \
    azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/

# Verify transfer
ssh azureuser@20.170.155.53 \
  "wc -l /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js"
# Expected: ~3000 lines
```

---

## PHASE 3: Start Merged System

### Step 3.1: Start STTTTSserver
```bash
ssh azureuser@20.170.155.53 << 'EOF'
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver

# Syntax check
node --check STTTTSserver.js || exit 1

# Start server
nohup node STTTTSserver.js > /tmp/sttttserver-merged.log 2>&1 &

# Wait for startup
sleep 5

# Verify process
pgrep -af STTTTSserver.js || echo "❌ FAILED TO START"

# Check ports
echo "=== UDP Ports (should show 6120-6123) ==="
ss -ulnp | grep -E '612[0-3]'

echo -e "\n=== HTTP Port (should show 3020) ==="
ss -tlnp | grep 3020

# Show startup log
echo -e "\n=== Startup Log ==="
tail -50 /tmp/sttttserver-merged.log
EOF
```

**✅ Expected Output:**
```
[UDP-3333] ✓ Listening on UDP 6120
[UDP-3333] Bound to 0.0.0.0:6120
[UDP-3333] ✓ Ready to send via UDP 6121
[UDP-4444] ✓ Listening on UDP 6122
[UDP-4444] Bound to 0.0.0.0:6122
[UDP-4444] ✓ Ready to send via UDP 6123
============================================================
  UDP PCM TRANSLATION SOCKETS ACTIVE
============================================================
Extension 3333 (EN): IN=6120, OUT=6121
Extension 4444 (FR): IN=6122, OUT=6123
============================================================
```

### Step 3.2: Verify Dashboard Access
```bash
curl -I http://20.170.155.53:3020/dashboard.html
curl -I http://20.170.155.53:3020/
# Both should return: HTTP/1.1 200 OK
```

---

## PHASE 4: QA Isolation

### Step 4.1: Kill Interfering Processes
```bash
ssh azureuser@20.170.155.53 << 'EOF'
echo "=== Killing Interfering Processes ==="

# Kill gateway-9007-9008.js
pkill -f gateway-9007-9008.js
pgrep -af gateway-9007 || echo "✅ gateway-9007-9008 NOT running"

# Kill old conf-server-phase1.js (3333/4444)
pkill -f "conf-server-phase1.*3333"
pgrep -af "conf-server.*3333" || echo "✅ conf-server-phase1 (3333/4444) NOT running"

echo -e "\n=== Active Translation Processes (should only show STTTTSserver and gateways) ==="
pgrep -af "STTTTSserver|gateway|conf-server"
EOF
```

---

## PHASE 5: Test 3333/4444 Translation

### Step 5.1: Start Gateways
```bash
ssh azureuser@20.170.155.53 << 'EOF'
cd /home/azureuser/translation-app/3333_4444__Operational/Gateway

# Start gateway-3333
nohup node gateway-3333-buffered.js > /tmp/gateway-3333.log 2>&1 &

# Start gateway-4444
nohup node gateway-4444-buffered.js > /tmp/gateway-4444.log 2>&1 &

sleep 3

echo "=== Gateway Status ==="
pgrep -af "gateway-3333|gateway-4444"
EOF
```

### Step 5.2: Monitor Translation Logs
```bash
# In separate terminal, monitor logs
ssh azureuser@20.170.155.53 "tail -f /tmp/sttttserver-merged.log | grep -E 'UDP-|Transcribed|Translated'"
```

### Step 5.3: Test 3333 → 4444 (English to French)
**Manual Test:**
- Call extension 3333
- Speak English: "Hello, how are you today?"
- Verify French translation on extension 4444

**✅ Expected Log:**
```
[UDP-3333] Gateway connected: 640 bytes/frame (packet #1)
[UDP-3333] Processing 32000 bytes
[UDP-3333] Starting translation: en → fr
[UDP-3333] Transcribed: "Hello, how are you today?"
[UDP-3333→4444] Translated: "Bonjour, comment allez-vous aujourd'hui?"
[UDP-3333→4444] Generated 48000 bytes MP3
[UDP-3333→4444] Converted to 48000 bytes PCM
[UDP-4444] Sending 48000 bytes (75 frames)
[UDP-4444] ✓ Sent 75 frames
[UDP-3333→4444] ✓ Translation complete
```

### Step 5.4: Test 4444 → 3333 (French to English)
**Manual Test:**
- Call extension 4444
- Speak French: "Bonjour, comment ça va?"
- Verify English translation on extension 3333

**✅ Expected:** Bidirectional translation working

---

## 🔍 REGRESSION TEST B: Verify Other Systems (AFTER Merger)

**Purpose:** Ensure merger did NOT break 5555/6666 or 7777/8888 systems

### Test B.1: Verify 5555/6666 System Still Works
```bash
ssh azureuser@20.170.155.53 << 'EOF'
echo "=== 5555/6666 System Post-Merger Check ==="

# Check processes
pgrep -af "conf-server-phase1.*5555|gateway-5555|gateway-6666" || echo "⚠️ Need to start"

# Check ports (should still be 6100-6103)
ss -ulnp | grep -E '610[0-3]'

# If not running, start for test
cd /home/azureuser/translation-app/5555-6666-gstreamer-phase1
if ! pgrep -f conf-server-phase1 > /dev/null; then
    echo "Starting 5555/6666 system for regression test..."
    nohup node conf-server-phase1.js > /tmp/conf-server-5555-test.log 2>&1 &
    nohup node gateway-5555-buffered.js > /tmp/gateway-5555-test.log 2>&1 &
    nohup node gateway-6666-buffered.js > /tmp/gateway-6666-test.log 2>&1 &
    sleep 5
fi

pgrep -af "conf-server-phase1|gateway-5555|gateway-6666"
ss -ulnp | grep -E '610[0-3]'
EOF
```

**Manual Test B.1:**
- Call extension 5555
- Speak: "Testing cross-patch after merger"
- Verify: Extension 6666 hears same audio (NO translation)
- ✅ Expected: Same behavior as Test A.2 (baseline)
- ❌ If broken: Ports 6100-6103 may be conflicting

### Test B.2: Verify 7777/8888 System Still Works
```bash
ssh azureuser@20.170.155.53 << 'EOF'
echo "=== 7777/8888 System Post-Merger Check ==="

# Check processes
pgrep -af "conference-server|gateway-7777|gateway-8888" || echo "⚠️ May need to start"

# Check ports (should still be 7000-7003)
ss -ulnp | grep -E '700[0-3]'

# Show current state
cd /home/azureuser/translation-app/7777-8888-stack
ls -lh conference-server*.js gateway-*.js
tail -20 /tmp/conference-server.log 2>/dev/null || echo "No recent logs"
EOF
```

**Manual Test B.2:**
- Call extension 7777
- Speak English: "This is a regression test"
- Verify: Extension 8888 hears French translation
- ✅ Expected: Same behavior as Test A.3 (baseline)
- ❌ If broken: STTTTSserver merger may have affected shared functions

### Test B.3: Port Conflict Check
```bash
ssh azureuser@20.170.155.53 << 'EOF'
echo "=== Complete Port Status (All Systems) ==="
ss -ulnp | grep -E '(612[0-3]|610[0-3]|700[0-3])' | sort

echo -e "\n=== Port Summary ==="
echo "3333/4444 (Translation):  6120-6123"
echo "5555/6666 (Cross-patch):  6100-6103"
echo "7777/8888 (Translation):  7000-7003"

echo -e "\n=== Conflict Detection ==="
netstat -tulnp 2>/dev/null | grep -E '(612[0-3]|610[0-3]|700[0-3])' | awk '{print $4}' | sort | uniq -d
# Expected: No output (no duplicates)
EOF
```

### Test B.4: Compare With Baseline
```bash
ssh azureuser@20.170.155.53 << 'EOF'
echo "=== POST-MERGER STATE SNAPSHOT ===" > /tmp/post-merger-state.txt
date >> /tmp/post-merger-state.txt
echo -e "\nProcesses:" >> /tmp/post-merger-state.txt
pgrep -af "STTTTSserver|gateway|conf-server" >> /tmp/post-merger-state.txt
echo -e "\nPorts:" >> /tmp/post-merger-state.txt
ss -ulnp | grep -E '(612[0-3]|610[0-3]|700[0-3])' >> /tmp/post-merger-state.txt
ss -tlnp | grep 3020 >> /tmp/post-merger-state.txt

echo -e "\n=== COMPARISON ==="
echo "BASELINE:"
cat /tmp/baseline-state.txt

echo -e "\n\nPOST-MERGER:"
cat /tmp/post-merger-state.txt
EOF
```

---

## PHASE 6: Final Verification & Monitoring

### Step 6.1: Complete System Status
```bash
ssh azureuser@20.170.155.53 << 'EOF'
echo "============================================================"
echo "  COMPLETE SYSTEM STATUS"
echo "============================================================"

echo -e "\n=== All Translation Processes ==="
pgrep -af "STTTTSserver|gateway|conf-server" | grep -v grep

echo -e "\n=== All UDP Ports ==="
ss -ulnp | grep -E '(612[0-3]|610[0-3]|700[0-3])'

echo -e "\n=== HTTP/WebSocket Ports ==="
ss -tlnp | grep 3020

echo -e "\n=== Recent STTTTSserver Activity ==="
tail -30 /tmp/sttttserver-merged.log

echo -e "\n=== Dashboard Status ==="
curl -s -o /dev/null -w "Dashboard: %{http_code}\n" http://localhost:3020/dashboard.html
curl -s -o /dev/null -w "Root page: %{http_code}\n" http://localhost:3020/
EOF
```

### Step 6.2: Statistics Monitoring
```bash
# Monitor UDP PCM stats (logged every 30 seconds)
ssh azureuser@20.170.155.53 "tail -f /tmp/sttttserver-merged.log | grep -E 'UDP PCM STATS|Uptime|Translations'"
```

**✅ Expected Stats:**
```
============================================================
  UDP PCM STATS
============================================================
Uptime: 120s
3333: RX=150, TX=45
4444: RX=100, TX=50
Translations: 8 requests, 8 OK (100.0%)
Errors: 0
============================================================
```

---

## SUCCESS CRITERIA CHECKLIST

**Merger Success:**
- [ ] File syntax valid (`node --check` passes)
- [ ] STTTTSserver starts without errors
- [ ] UDP ports 6120-6123 listening
- [ ] Dashboard accessible at http://20.170.155.53:3020/dashboard.html
- [ ] Root page accessible at http://20.170.155.53:3020/
- [ ] Gateway-3333 connects successfully
- [ ] Gateway-4444 connects successfully
- [ ] Audio packets received (stats increment)
- [ ] Translation pipeline triggers (STT → Translate → TTS)
- [ ] Translated audio sent to opposite gateway
- [ ] Bidirectional translation works (3333↔4444)

**QA Isolation:**
- [ ] gateway-9007-9008.js NOT running
- [ ] Old conf-server-phase1.js (3333/4444) NOT running

**Regression Tests:**
- [ ] Extensions 5555/6666 work exactly as before (cross-patch, no translation)
- [ ] Extensions 7777/8888 work exactly as before (translation active)
- [ ] No port conflicts detected
- [ ] All three systems can run simultaneously

---

## ROLLBACK PROCEDURE (If Needed)

### Quick Rollback
```bash
ssh azureuser@20.170.155.53 << 'EOF'
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver

# Stop merged server
pkill -f STTTTSserver.js

# Find most recent backup
BACKUP=$(ls -t STTTTSserver.js.before-merger-* | head -1)
echo "Restoring from: $BACKUP"

# Restore
cp "$BACKUP" STTTTSserver.js

# Restart
nohup node STTTTSserver.js > /tmp/sttttserver-rollback.log 2>&1 &

sleep 3
pgrep -af STTTTSserver.js
tail -30 /tmp/sttttserver-rollback.log
EOF
```

### Full Rollback (Git Reset)
```bash
cd /Users/sagivstavinsky/realtime-translation-enhanced_astrix
git checkout Working_5555-6_7777-8_Getaway_no_STTTTSserver -- 3333_4444__Operational/
scp 3333_4444__Operational/STTTTSserver/STTTTSserver.js \
    azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/
ssh azureuser@20.170.155.53 "pkill -f STTTTSserver.js && cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && nohup node STTTTSserver.js > /tmp/sttttserver.log 2>&1 &"
```

---

## Key Points

1. **Regression tests run BEFORE and AFTER** to ensure no systems break
2. **Baseline documented** before making any changes
3. **QA isolation** ensures clean testing environment
4. **Port conflicts checked** to prevent interference
5. **All three systems tested** (3333/4444, 5555/6666, 7777/8888)
6. **Quick rollback available** if issues arise

---

## Port Reference

| System | Extension | IN Port | OUT Port | Function |
|--------|-----------|---------|----------|----------|
| 3333/4444 | 3333 (EN) | 6120 | 6121 | Translation (NEW) |
| 3333/4444 | 4444 (FR) | 6122 | 6123 | Translation (NEW) |
| 5555/6666 | 5555 | 6100 | 6101 | Cross-patch (existing) |
| 5555/6666 | 6666 | 6102 | 6103 | Cross-patch (existing) |
| 7777/8888 | 7777 | 7000 | 7001 | Translation (existing) |
| 7777/8888 | 8888 | 7002 | 7003 | Translation (existing) |

**HTTP/WebSocket:**
- Port 3020: STTTTSserver Socket.IO + Dashboard

---

**END OF IMPLEMENTATION PLAN**
