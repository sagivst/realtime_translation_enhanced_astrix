# ESSENTIAL FILES FOR 3333/4444 GSTREAMER SYSTEM - FRESH INSTALLATION GUIDE

## Complete File List for Production Deployment

### 📁 DIRECTORY STRUCTURE
```
/home/azureuser/translation-app/3333_4444__Operational/
├── gateway-3333.js                      ✅ REQUIRED
├── gateway-4444.js                      ✅ REQUIRED  
├── ari-gstreamer-operational.js         ✅ REQUIRED
└── STTTTSserver/
    ├── STTTTSserver.js                  ✅ REQUIRED
    ├── .env.externalmedia               ✅ REQUIRED
    ├── package.json                     ✅ REQUIRED
    ├── package-lock.json                ✅ REQUIRED
    ├── elevenlabs-tts-service.js        ✅ REQUIRED
    ├── hume-streaming-client.js         ✅ REQUIRED
    ├── hmlcp/
    │   ├── index.js                     ✅ REQUIRED
    │   ├── default-profiles.js          ✅ REQUIRED
    │   ├── pattern-extractor.js         ✅ REQUIRED
    │   ├── ulo-layer.js                 ✅ REQUIRED
    │   └── user-profile.js              ✅ REQUIRED
    └── public/
        ├── dashboard.html               📊 OPTIONAL (recommended)
        ├── dashboard-single.html        📊 OPTIONAL
        └── monitoring-dashboard.html    📊 OPTIONAL
```

---

## 🔧 SYSTEM REQUIREMENTS

### 1. Operating System
- Ubuntu 20.04/22.04 LTS or similar Linux distribution

### 2. GStreamer Installation
```bash
sudo apt-get update
sudo apt-get install -y \
  gstreamer1.0-tools \
  gstreamer1.0-plugins-base \
  gstreamer1.0-plugins-good
```

### 3. Node.js Installation
```bash
# Install Node.js 16 or higher
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 4. Asterisk Installation
```bash
# Asterisk 20+ with required modules:
# - app_ari
# - app_stasis
# - res_ari_channels
# - res_ari_bridges
# - res_http_websocket
```

---

## ⚙️ ASTERISK CONFIGURATION

### File: `/etc/asterisk/pjsip_users.conf`

Add these entries:

```ini
;=======================================
; Extension 3333 - GStreamer Phase 1 Test
;=======================================
[3333]
type=endpoint
transport=transport-udp
context=from-internal
disallow=all
allow=alaw
allow=slin16
auth=3333
aors=3333
direct_media=no
rtp_symmetric=yes

[3333]
type=auth
auth_type=userpass
username=3333
password=GStreamer2025!

[3333]
type=aor
max_contacts=5

;=======================================
; Extension 4444 - GStreamer Phase 1 Test
;=======================================
[4444]
type=endpoint
transport=transport-udp
context=from-internal
disallow=all
allow=alaw
allow=slin16
auth=4444
aors=4444
direct_media=no
rtp_symmetric=yes

[4444]
type=auth
auth_type=userpass
username=4444
password=GStreamer2025!

[4444]
type=aor
max_contacts=5
```

### File: `/etc/asterisk/extensions.conf`

Add to `[from-internal]` context:

```ini
; GStreamer Phase 1 test extensions
exten => 3333,1,Goto(default,3333,1)
exten => 4444,1,Goto(default,4444,1)
```

Add new `[default]` context (if not exists):

```ini
[default]
exten => 3333,1,NoOp(=== GStreamer - Extension 3333 ===)
 same => n,Answer()
 same => n,Stasis(gstreamer-operational,ext3333)
 same => n,Hangup()

exten => 4444,1,NoOp(=== GStreamer - Extension 4444 ===)
 same => n,Answer()
 same => n,Stasis(gstreamer-operational,ext4444)
 same => n,Hangup()
```

### File: `/etc/asterisk/ari.conf`

Ensure ARI is enabled:

```ini
[general]
enabled = yes
pretty = yes

[dev]
type = user
read_only = no
password = asterisk
```

### File: `/etc/asterisk/http.conf`

Ensure HTTP/WebSocket is enabled:

```ini
[general]
enabled=yes
bindaddr=0.0.0.0
bindport=8088
```

---

## 📦 NODE.JS DEPENDENCIES

### Gateway Dependencies (Root Level)

**File: `package.json`** (create in root if not exists)

```json
{
  "name": "3333-4444-gstreamer-gateway",
  "version": "1.0.0",
  "dependencies": {
    "ari-client": "^2.2.0"
  }
}
```

### STTTTSserver Dependencies

**File: `STTTTSserver/package.json`** (already exists, install with):

```bash
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
npm install
```

**Key dependencies:**
- `@deepgram/sdk` - Speech-to-Text
- `deepl-node` - Translation
- `socket.io` - WebSocket communication
- `express` - HTTP server
- `uuid` - Unique IDs
- `dotenv` - Environment variables

---

## 🔌 NETWORK PORTS

### UDP Ports (Audio):
- **4000** - Gateway-3333 receives from Asterisk
- **4001** - Gateway-3333 sends to Asterisk (not used in current setup)
- **4002** - Gateway-4444 receives from Asterisk
- **4003** - Gateway-4444 sends to Asterisk (not used in current setup)
- **6120** - STTTTSserver receives from Gateway-3333
- **6121** - STTTTSserver sends to Gateway-3333
- **6122** - STTTTSserver receives from Gateway-4444
- **6123** - STTTTSserver sends to Gateway-4444

### TCP Ports:
- **8088** - Asterisk ARI WebSocket
- **3020** - STTTTSserver Dashboard (HTTP + WebSocket)

---

## 🚀 STARTUP SEQUENCE

### 1. Start Asterisk
```bash
sudo systemctl start asterisk
sudo asterisk -rx "pjsip reload"
sudo asterisk -rx "dialplan reload"
```

### 2. Start STTTTSserver
```bash
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
nohup node STTTTSserver.js > /tmp/STTTTSserver-operational.log 2>&1 &
```

### 3. Start Gateway-3333
```bash
cd /home/azureuser/translation-app/3333_4444__Operational
nohup node gateway-3333.js > /tmp/gateway-3333-operational.log 2>&1 &
```

### 4. Start Gateway-4444
```bash
cd /home/azureuser/translation-app/3333_4444__Operational
nohup node gateway-4444.js > /tmp/gateway-4444-operational.log 2>&1 &
```

### 5. Start ARI Handler
```bash
cd /home/azureuser/translation-app/3333_4444__Operational
nohup node ari-gstreamer-operational.js > /tmp/ari-gstreamer-operational.log 2>&1 &
```

---

## 🔍 VERIFICATION

### Check Running Processes
```bash
ps aux | grep -E 'gateway-3333|gateway-4444|ari-gstreamer|STTTTSserver' | grep -v grep
```

### Check UDP Port Listeners
```bash
netstat -tuln | grep -E '4000|4002|6120|6121|6122|6123'
```

### Check Logs
```bash
tail -f /tmp/gateway-3333-operational.log
tail -f /tmp/gateway-4444-operational.log
tail -f /tmp/STTTTSserver-operational.log
tail -f /tmp/ari-gstreamer-operational.log
```

### Access Dashboard
```
http://YOUR_SERVER_IP:3020/dashboard.html
```

---

## ⚠️ CRITICAL SETTINGS

### 1. Audio Gain Factor (NEEDS FIX)

**File: `STTTTSserver/STTTTSserver.js`**

**Current (BROKEN):**
```javascript
extensionGainFactors.set("3333", 0.002);  // TOO LOW!
extensionGainFactors.set("4444", 0.002);  // TOO LOW!
```

**Should be (FIX REQUIRED):**
```javascript
extensionGainFactors.set("3333", 2.0);   // Proper amplification
extensionGainFactors.set("4444", 2.0);   // Proper amplification
```

**Lines to change:** ~580-583 in STTTTSserver.js

### 2. Environment Variables

**File: `STTTTSserver/.env.externalmedia`**

Required API keys:
```bash
DEEPGRAM_API_KEY=your_deepgram_key
DEEPL_API_KEY=your_deepl_key
ELEVENLABS_API_KEY=your_elevenlabs_key
```

---

## 📋 INSTALLATION CHECKLIST

- [ ] GStreamer installed and working
- [ ] Node.js 16+ installed
- [ ] Asterisk 20+ installed with ARI modules
- [ ] All required files copied to server
- [ ] Asterisk configurations updated
- [ ] Audio gain factor FIXED (0.002 → 2.0)
- [ ] API keys configured in .env file
- [ ] npm install completed in STTTTSserver/
- [ ] UDP ports 4000-4003, 6120-6123 available
- [ ] TCP ports 8088, 3020 available
- [ ] All services started in correct order
- [ ] Processes verified running
- [ ] Dashboard accessible

---

## 🎯 KNOWN ISSUES

### Issue #1: Deepgram Returns Empty Transcriptions
**Cause:** Audio gain set to 0.002 (99.8% reduction) makes audio too quiet
**Fix:** Change gain factor from 0.002 to 2.0 in STTTTSserver.js lines 580-583
**Status:** ⚠️ REQUIRES FIX BEFORE PRODUCTION

### Issue #2: Gateway-4444 EPIPE Crashes
**Status:** ✅ FIXED with comprehensive error handling in gateway-4444.js

---

## 📞 TESTING

### Test Call Flow:
1. Phone A dials extension 3333
2. Phone B dials extension 4444
3. Phone A speaks → should be heard on Phone B (translated)
4. Phone B speaks → should be heard on Phone A (translated)
5. Dashboard should show audio waveforms and transcriptions

### Success Criteria:
- ✅ Bidirectional audio flow
- ✅ Translation working (Deepgram STT → DeepL MT → ElevenLabs TTS)
- ✅ Latency < 2 seconds
- ✅ No audio distortion
- ✅ Dashboard showing real-time data

---

## 🔗 GITHUB REPOSITORY

Complete working system available at:
https://github.com/sagivst/realtime_translation_enhanced_astrix/tree/Working_3333_4444_GStreamer_IN/3333_4444__Operational

---

**Document Version:** 1.0
**Last Updated:** 2025-11-23
**Status:** Production-ready (after gain fix)

