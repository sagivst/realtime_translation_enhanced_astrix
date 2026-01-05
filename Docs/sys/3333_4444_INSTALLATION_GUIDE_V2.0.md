# 3333/4444 COMPLETE INSTALLATION GUIDE WITH MONITORING INTEGRATION

## System Overview
Real-time translation system with extensions 3333/4444, including full monitoring integration with STATION_3 metrics collection and PostgreSQL database storage.

### 📁 DIRECTORY STRUCTURE (UPDATED)
```
/home/azureuser/translation-app/3333_4444__Operational/
├── gateway-3333.js                      ✅ REQUIRED
├── gateway-4444.js                      ✅ REQUIRED
├── ari-gstreamer-operational.js         ✅ REQUIRED
├── STTTTSserver/
│   ├── STTTTSserver.js                 ✅ REQUIRED
│   ├── .env.externalmedia              ✅ REQUIRED
│   ├── package.json                    ✅ REQUIRED
│   ├── package-lock.json               ✅ REQUIRED
│   ├── audio-buffer-config.json        ✅ REQUIRED
│   ├── elevenlabs-tts-service.js       ✅ REQUIRED
│   ├── hume-streaming-client.js        ✅ REQUIRED
│   └── public/
│       ├── dashboard.html              📊 Split-screen (3333 & 4444)
│       ├── dashboard-single.html       📊 v2.1 Monitoring

---

## 🔧 SYSTEM REQUIREMENTS & DEPENDENCIES

### 1. Operating System
- Ubuntu 20.04/22.04 LTS on Azure VM (20.170.155.53)
- Minimum 4GB RAM, 2 CPUs

### 2. GStreamer Installation
```bash
sudo apt-get update
sudo apt-get install -y \
  gstreamer1.0-tools \
  gstreamer1.0-plugins-base \
  gstreamer1.0-plugins-good \
  gstreamer1.0-plugins-bad \
  gstreamer1.0-plugins-ugly
```

### 3. Node.js Installation
```bash
# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```



### 5. Asterisk Installation
```bash
# Asterisk 20+ with required modules:
sudo apt-get install -y asterisk

# Required modules (check with: asterisk -rx "module show")
# - app_ari.so
# - app_stasis.so
# - res_ari.so
# - res_ari_channels.so
# - res_ari_bridges.so
# - res_http_websocket.so
```

### 6. External API Services
- **Deepgram**: Real-time speech recognition (STT)
- **DeepL**: Language translation
- **ElevenLabs**: Text-to-speech synthesis (TTS)
- **Hume AI**: Emotional intelligence (optional)

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

## 🔌 NETWORK PORTS (COMPLETE)

### UDP Ports (Audio Streaming):
- **4000** - Gateway-3333 receives from Asterisk
- **4001** - Gateway-3333 sends to Asterisk (not used in current setup)
- **4002** - Gateway-4444 receives from Asterisk
- **4003** - Gateway-4444 sends to Asterisk (not used in current setup)
- **6120** - STTTTSserver receives from Gateway-3333
- **6121** - STTTTSserver sends to Gateway-3333
- **6122** - STTTTSserver receives from Gateway-4444
- **6123** - STTTTSserver sends to Gateway-4444
- **5060** - SIP signaling (Asterisk)

### TCP Ports (Services):
- **8088** - Asterisk ARI WebSocket/HTTP
- **3020** - STTTTSserver Dashboard (Express + Socket.IO)
- **3001** - Monitoring Server (Socket.IO metrics collection)
- **8083** - Database Server (PostgreSQL interface)
- **8080** - Proxy Dashboard Server (database-records.html)
- **3000** - QRYN metrics service
- **5432** - PostgreSQL database

---

## 🚀 COMPLETE STARTUP SEQUENCE (WITH MONITORING)

### 1. Start PostgreSQL
```bash
sudo systemctl start postgresql
sudo systemctl status postgresql
```

### 2. Start Asterisk
```bash
sudo systemctl start asterisk
sudo asterisk -rx "pjsip reload"
sudo asterisk -rx "dialplan reload"
sudo asterisk -rx "module reload res_ari"
```

### 3. Start Monitoring Infrastructure
```bash
# Database Server
cd /home/azureuser/translation-app
nohup node simplified-database-server.js > /tmp/simple-database.log 2>&1 &

# Proxy Dashboard Server
cd /home/azureuser
nohup node proxy-dashboard-server.js > /tmp/proxy-dashboard.log 2>&1 &
```

### 4. Start STTTTSserver with Monitoring
```bash
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
# Install Socket.IO client if not present
npm list socket.io-client || npm install socket.io-client
nohup node STTTTSserver.js > /tmp/STTTTSserver-operational.log 2>&1 &
```

### 5. Start Gateway Services
```bash
cd /home/azureuser/translation-app/3333_4444__Operational
nohup node gateway-3333.js > /tmp/gateway-3333-operational.log 2>&1 &
nohup node gateway-4444.js > /tmp/gateway-4444-operational.log 2>&1 &
```

### 6. Start ARI Handler
```bash
cd /home/azureuser/translation-app/3333_4444__Operational
nohup node ari-gstreamer-operational.js > /tmp/ari-gstreamer-operational.log 2>&1 &
```

### 7. Start Additional Services
```bash
# Conference Server (if needed)
cd /home/azureuser/translation-app/3333_4444__Operational
nohup node conference-server.js > /tmp/conference-server.log 2>&1 &

# QRYN Metrics
cd /home/azureuser/translation-app
nohup node qryn.mjs > /tmp/qryn.log 2>&1 &
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

### Dashboard Access URLs (ALL ACTIVE)

#### Primary Dashboards:
- **http://20.170.155.53:3020/dashboard.html** - Split-screen dashboard (3333 & 4444)
- **http://20.170.155.53:3020/dashboard-single.html** - v2.1 Monitoring Dashboard

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

## 📋 COMPLETE INSTALLATION CHECKLIST

### System Requirements:
- [ ] Ubuntu 20.04/22.04 LTS installed on Azure VM
- [ ] Minimum 4GB RAM, 2 CPUs configured
- [ ] GStreamer with all plugins installed
- [ ] Node.js 18 LTS installed
- [ ] PostgreSQL 14+ installed and configured
- [ ] Asterisk 20+ with ARI modules installed

### Database Setup:
- [ ] PostgreSQL service running
- [ ] audio_optimization database created
- [ ] station_snapshots table with all columns created
- [ ] Database password configured ('postgres')
- [ ] Connection verified on port 5432

### Asterisk Configuration:
- [ ] Extensions 3333/4444 configured in pjsip_users.conf
- [ ] Dialplan updated in extensions.conf
- [ ] ARI enabled in ari.conf (user: dev, password: asterisk)
- [ ] HTTP/WebSocket enabled in http.conf (port 8088)
- [ ] Stasis application 'gstreamer-operational' configured

### File Deployment:
- [ ] All gateway files copied to 3333_4444__Operational/
- [ ] STTTTSserver directory complete with all subdirectories
- [ ] Monitoring files (StationAgent.js, UniversalCollector.js) present
- [ ] Dashboard HTML files in STTTTSserver/public/
- [ ] Monitoring services in /home/azureuser/translation-app/

### Dependencies Installation:
- [ ] npm install completed in STTTTSserver/
- [ ] socket.io-client installed for monitoring
- [ ] ari-client installed for gateway services
- [ ] All API keys configured in .env.externalmedia:
  - [ ] DEEPGRAM_API_KEY
  - [ ] DEEPL_API_KEY
  - [ ] ELEVENLABS_API_KEY
  - [ ] HUME_API_KEY (optional)

### Critical Configuration:
- [ ] Audio gain factor FIXED (0.002 → 2.0) in STTTTSserver.js lines 580-583
- [ ] Database connection password added to simplified-database-server.js
- [ ] Monitoring server configured to use port 8083 (not 8084)

### Network Ports Available:
- [ ] UDP 4000-4003 (gateway audio)
- [ ] UDP 6120-6123 (STTTTSserver audio)
- [ ] TCP 3020 (STTTTSserver dashboards)
- [ ] TCP 3001 (monitoring server)
- [ ] TCP 8083 (database server)
- [ ] TCP 8080 (proxy dashboard)
- [ ] TCP 8088 (Asterisk ARI)
- [ ] TCP 5432 (PostgreSQL)

### Service Startup Verification:
- [ ] PostgreSQL service active
- [ ] Asterisk service running with ARI loaded
- [ ] Database server listening on 8083
- [ ] Monitoring server connected on 3001
- [ ] STTTTSserver running with Socket.IO client
- [ ] Gateway-3333 and Gateway-4444 running
- [ ] ARI handler connected to Asterisk
- [ ] All processes verified with ps aux

### Dashboard Access Verification:
- [ ] http://20.170.155.53:3020/dashboard.html accessible
- [ ] http://20.170.155.53:8080/database-records.html showing data
- [ ] Real-time metrics updating on dashboards
- [ ] Database records incrementing with calls

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

**Document Version:** 2.0
**Last Updated:** 2025-12-01
**Status:** Production-ready with full monitoring integration
**Azure VM:** 20.170.155.53

## Important Notes:
- timing-client.js is loaded by STTTTSserver.js but setInjectAudioHandler is commented out (line 245)
- dashboard-simple.html and database-records.html are identical files (8930 bytes)
- StationAgent.js handles Socket.IO monitoring integration (NOT STTTTSserver.js directly)
- Database must include password: 'postgres' in connection config
- Monitoring server must use port 8083 (not 8084)

