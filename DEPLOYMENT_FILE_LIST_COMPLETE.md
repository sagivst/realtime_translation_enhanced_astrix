# COMPLETE DEPLOYMENT FILE LIST FOR 3333/4444 SYSTEM
## Including Full Monitoring with All 23 Components

---

## 📁 PRIMARY DEPLOYMENT DIRECTORY
**Base Path:** `/home/azureuser/translation-app/`

---

## 🔴 CRITICAL PM2 MANAGED SERVICES (8 Files)
*These MUST be present and executable for the system to function*

### Core Services:
1. `/home/azureuser/translation-app/database-api-server.js` - **PM2 ID: 24, Port: 8083**
2. `/home/azureuser/translation-app/monitoring-server.js` - **PM2 ID: 23, Port: 8090**
3. `/home/azureuser/translation-app/monitoring-to-database-bridge.js` - **PM2 ID: 25, Port: 3001**
4. `/home/azureuser/translation-app/continuous-full-monitoring-with-station3.js` - **PM2 ID: 22, Port: 9090**

### Gateway Services:
5. `/home/azureuser/translation-app/3333_4444__Operational/gateway-3333.js` - **PM2 ID: 28, Port: 7777**
6. `/home/azureuser/translation-app/3333_4444__Operational/gateway-4444.js` - **PM2 ID: 29, Port: 8888**

### Core Operational Services:
7. `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js` - **PM2 ID: 26, Port: 8080**
8. `/home/azureuser/translation-app/3333_4444__Operational/ari-gstreamer-operational.js` - **PM2 ID: 27, Port: 8089**

---

## 📂 3333_4444__OPERATIONAL DIRECTORY FILES

### Root Level Files:
```
/home/azureuser/translation-app/3333_4444__Operational/
├── gateway-3333.js                     ✅ CRITICAL
├── gateway-4444.js                     ✅ CRITICAL
├── ari-gstreamer-operational.js        ✅ CRITICAL
├── conference-server.js                ✅ REQUIRED
└── hepgen.js                          ✅ REQUIRED
```

### STTTTSserver Main Directory:
```
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/
├── STTTTSserver.js                    ✅ CRITICAL
├── .env.externalmedia                 ✅ CRITICAL (API Keys)
├── package.json                       ✅ CRITICAL
├── package-lock.json                  ✅ CRITICAL
├── audio-buffer-config.json           ✅ REQUIRED
├── station3-handler.js                ✅ CRITICAL (Station 3 monitoring)
├── station9-handler.js                ✅ CRITICAL (Station 9 monitoring)
├── elevenlabs-tts-service.js          ✅ REQUIRED
├── elevenlabs-websocket-service.js    ✅ REQUIRED
├── hume-streaming-client.js           ✅ REQUIRED
├── timing-client.js                   ✅ REQUIRED
├── deepgram-streaming-client.js       ✅ REQUIRED
├── deepl-incremental-mt.js            ✅ REQUIRED
├── audio-stream-buffer.js             ✅ REQUIRED
├── audio-converter.js                 ✅ REQUIRED
├── frame-collector.js                 ✅ REQUIRED
├── externalmedia-integration.js       ✅ REQUIRED
├── asterisk-ari-handler.js            ✅ REQUIRED
├── audio-streaming-direct.js          ✅ OPTIONAL
├── audio-streaming-extension.js       ✅ OPTIONAL
├── audio-streaming-global.js          ✅ OPTIONAL
├── audio-analysis-utils.js            ✅ OPTIONAL
├── config-factory-defaults.js         ✅ OPTIONAL
└── database-integration-module.js     ✅ OPTIONAL
```

### STTTTSserver/hmlcp Directory (Human Model Layer):
```
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/hmlcp/
├── index.js                           ✅ CRITICAL
├── default-profiles.js                ✅ REQUIRED
├── pattern-extractor.js               ✅ REQUIRED
├── ulo-layer.js                       ✅ REQUIRED
└── user-profile.js                    ✅ REQUIRED
```

### STTTTSserver/monitoring Directory:
```
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring/
├── StationAgent.js                    ✅ CRITICAL (Socket.IO integration)
├── UniversalCollector.js              ✅ REQUIRED
├── component-checkers.js              ✅ CRITICAL
├── component-checkers-enhanced.js     ✅ OPTIONAL
├── metrics-collector.js               ✅ REQUIRED
├── database-integration-module.js     ✅ OPTIONAL
├── dashboard-server.js                ✅ OPTIONAL
├── monitoring-server-11stations.js    ✅ OPTIONAL
├── monitoring-server-55param-backup.js ✅ OPTIONAL
├── monitoring-server-75param.js       ✅ OPTIONAL
├── monitoring-server-ai-calibration.js ✅ OPTIONAL
├── check-special-processes.js         ✅ OPTIONAL
└── config/
    └── station-parameter-map.js       ✅ CRITICAL
```

### STTTTSserver/public Directory (Web Assets):
```
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/
├── dashboard.html                     ✅ REQUIRED (Split-screen 3333 & 4444)
├── dashboard-single.html              ✅ REQUIRED (v2.1 Monitoring)
├── station3-monitor.html              ✅ REQUIRED (Real-time metrics)
├── monitoring-tree-dashboard.html     ✅ REQUIRED (3-level system view)
├── audio-monitor-fixed.html           ✅ OPTIONAL
├── audio-player-visualization.html    ✅ OPTIONAL
├── conference-monitor.html            ✅ OPTIONAL
└── [Additional HTML/CSS/JS files]     ✅ OPTIONAL (96 files total)
```

### Hume Worker Directory:
```
/home/azureuser/translation-app/3333_4444__Operational/hume_worker/
├── hume_worker.py                     ✅ REQUIRED
└── requirements.txt                   ✅ REQUIRED
```

---

## 📂 ROOT TRANSLATION-APP DIRECTORY FILES

### Monitoring Infrastructure:
```
/home/azureuser/translation-app/
├── database-api-server.js             ✅ CRITICAL (Port: 8083)
├── monitoring-server.js               ✅ CRITICAL (Port: 8090)
├── monitoring-to-database-bridge.js   ✅ CRITICAL (Port: 3001)
├── continuous-full-monitoring-with-station3.js ✅ CRITICAL
├── simplified-database-server.js      ⚠️ LEGACY (Replaced by database-api-server)
├── proxy-dashboard-server.js          ⚠️ LEGACY (Port: 8080)
└── qryn.mjs                          ⚠️ OPTIONAL (Port: 3000)
```

### Additional Service Files:
```
/home/azureuser/translation-app/
├── asterisk-ari-handler.js            ✅ REQUIRED
├── conference-server.js               ✅ REQUIRED
├── package.json                       ✅ CRITICAL
└── package-lock.json                  ✅ CRITICAL
```

### Monitoring Directory (Additional Utilities):
```
/home/azureuser/translation-app/monitoring/
├── full-telemetry-api-multi-station.js ✅ OPTIONAL
├── monitoring-api-server.js            ✅ OPTIONAL
├── monitoring-api-no-fake.js           ✅ OPTIONAL
├── monitoring-api-server-real.js       ✅ OPTIONAL
├── monitoring-real-data-collector-fixed.js ✅ OPTIONAL
├── monitoring-real-data-collector.js   ✅ OPTIONAL
├── station3-socketio-bridge.js         ✅ OPTIONAL
├── station3-socketio-bridge-new-ports.js ✅ OPTIONAL
├── monitoring-real-data-collector-station3-fixed.js ✅ OPTIONAL
└── api-test-dashboard.html            ✅ OPTIONAL
```

### Public Directory (Web Assets):
```
/home/azureuser/translation-app/public/
├── [96 HTML/CSS/JS files]             ✅ REQUIRED
├── audio-monitor-fixed.html           ✅ REQUIRED
├── audio-player-visualization.html    ✅ REQUIRED
└── conference-monitor.html            ✅ REQUIRED
```

---

## 📂 ASTERISK CONFIGURATION FILES

### Required Asterisk Config Files:
```
/home/azureuser/translation-app/asterisk-configs/
├── extensions.conf                    ✅ CRITICAL
├── pjsip.conf                        ✅ CRITICAL
└── ari.conf                          ⚠️ MISSING (Create from template)
```

### Template for Missing ari.conf:
```
/etc/asterisk/ari.conf                 ✅ SYSTEM FILE (Copy to asterisk-configs)
```

### Additional Asterisk Files (System):
```
/etc/asterisk/
├── extensions.conf                    ✅ SYSTEM CONFIG
├── pjsip.conf                        ✅ SYSTEM CONFIG
├── ari.conf                          ✅ SYSTEM CONFIG
├── http.conf                         ✅ SYSTEM CONFIG
└── asterisk.conf                     ✅ SYSTEM CONFIG
```

---

## 📂 CONFIGURATION FILES

### PM2 Configuration:
```
/home/azureuser/translation-app/
├── ecosystem.config.js                ⚠️ OPTIONAL (PM2 ecosystem file)
├── pm2/
│   ├── pm2_list.txt                  ✅ BACKUP INFO
│   └── pm2_prettylist.json           ✅ BACKUP INFO
```

### Environment Files:
```
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/
└── .env.externalmedia                 ✅ CRITICAL
    # Contains:
    # DEEPGRAM_API_KEY
    # DEEPL_API_KEY
    # ELEVENLABS_API_KEY
    # ELEVENLABS_VOICE_ID
    # HUME_API_KEY
    # HUME_CONFIG_ID
```

### Database Configuration:
```
PostgreSQL Database: audio_optimization
- Host: localhost
- Port: 5432
- User: postgres
- Password: postgres
- Database: audio_optimization
```

---

## 🔧 SYSTEM DEPENDENCIES

### System Services (Must be running):
1. **PostgreSQL** - Port 5432
2. **Asterisk** - Ports 5060, 8088, 5038
3. **Cloudflared** - Port 7844 (Tunnel to tun.monitoringavailable.uk)

### Node.js Dependencies (npm packages):
```
Main Dependencies:
- ari-client: ^2.2.0
- @deepgram/sdk: Latest
- deepl-node: Latest
- socket.io: Latest
- socket.io-client: Latest
- express: Latest
- uuid: Latest
- dotenv: Latest
- pm2: Latest (Global)
- axios: Latest
- pg: Latest (PostgreSQL client)
```

### System Packages:
```
Required APT packages:
- gstreamer1.0-tools
- gstreamer1.0-plugins-base
- gstreamer1.0-plugins-good
- gstreamer1.0-plugins-bad
- gstreamer1.0-plugins-ugly
- postgresql
- postgresql-contrib
- nodejs (v18 LTS)
- npm
- python3
- python3-pip
```

---

## 🚫 FILES TO EXCLUDE FROM DEPLOYMENT

### Do NOT Include:
```
**/node_modules/                       ❌ Install fresh with npm install
**/*.tar.gz                           ❌ Archive files
**/*backup*                           ❌ Backup files
**/*checkpoint*                       ❌ Checkpoint files
**/*chekpoint*                        ❌ Misspelled checkpoint
**/*bkp*                             ❌ Backup files
**/.git/                             ❌ Git repositories
**/asterisk-build/                   ❌ Build directories
**/*.log                             ❌ Log files
**/.pm2/                             ❌ PM2 logs
```

---

## 📊 PORT ALLOCATION SUMMARY

### UDP Ports (Audio Streaming):
- **4000** - Gateway-3333 RX from Asterisk
- **4002** - Gateway-4444 RX from Asterisk
- **6120** - STTTTSserver RX from Gateway-3333
- **6121** - STTTTSserver TX to Gateway-3333
- **6122** - STTTTSserver RX from Gateway-4444
- **6123** - STTTTSserver TX to Gateway-4444

### TCP Ports (Services):
- **3001** - Monitoring Bridge
- **3020** - STTTTSserver Dashboard
- **5038** - Asterisk AMI
- **5060** - Asterisk SIP
- **5432** - PostgreSQL
- **7777** - Gateway-3333 Control
- **7844** - Cloudflared Tunnel
- **8080** - STTTTSserver HTTP
- **8083** - Database API Server
- **8088** - Asterisk ARI
- **8089** - ARI-GStreamer
- **8090** - Monitoring Server
- **8888** - Gateway-4444 Control
- **9090** - Continuous Monitoring

---

## ✅ DEPLOYMENT VERIFICATION CHECKLIST

### Essential Files (Must Have):
- [ ] All 8 PM2 service files
- [ ] STTTTSserver.js and handlers
- [ ] Gateway files (3333, 4444)
- [ ] Monitoring infrastructure files
- [ ] StationAgent.js
- [ ] component-checkers.js
- [ ] package.json files
- [ ] .env.externalmedia
- [ ] Asterisk config files

### Services to Start (In Order):
1. database-api-server
2. monitoring-server
3. monitoring-bridge
4. STTTTSserver (from its directory)
5. gateway-3333
6. gateway-4444
7. ari-gstreamer
8. continuous-monitoring

### Verification Commands:
```bash
# Check PM2 status
pm2 status

# Verify API health
curl http://localhost:8083/api/health/system

# Check monitoring
curl http://localhost:8090/

# Verify tunnel
curl https://tun.monitoringavailable.uk/api/health/system
```

---

## 📝 NOTES

1. **STTTTSserver** MUST be started from its own directory:
   ```bash
   cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
   pm2 start STTTTSserver.js --name STTTTSserver
   ```

2. **ari.conf** needs to be created or copied from `/etc/asterisk/ari.conf`

3. **Database** must be initialized with proper tables before starting services

4. **API Keys** must be configured in `.env.externalmedia`

5. **"Back trafice"** typo is intentionally retained as a unique identifier

---

**Total Required Files:** ~150 files
**Total with Optional:** ~250 files
**Compressed Backup Size:** ~21MB
**Uncompressed Size:** ~315MB

This list represents the COMPLETE deployment requirements for the 3333/4444 translation system with full monitoring of all 23 components.