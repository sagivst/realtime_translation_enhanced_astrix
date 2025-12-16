# SYSTEM BACKUP MANIFEST
## Working_3333_4444_Full_Cycle_Monitoring_3_9_System_Components_2

### Backup Information
- **Date Created:** 2025-12-16 03:13:50 IST
- **Filename:** Working_3333_4444_Full_Cycle_Monitoring_3_9_System_Components_2_20251216_031022.tar.gz
- **Size:** 2.1MB
- **Location:** /home/azureuser/translation-app/
- **Total Files:** 559

### System Configuration at Backup
| Component | Status | Port | Notes |
|-----------|--------|------|-------|
| Database API Server | ✅ LIVE | 8083 | With start/stop/restart endpoints |
| Monitoring Server | ✅ LIVE | 8090 | Socket.IO event handler |
| STTTTSserver | ✅ LIVE | 3020/8080 | Translation engine |
| Monitoring Bridge | ✅ LIVE | - | Data forwarding active |
| Cloudflare Tunnel | ✅ ACTIVE | 443 | https://tun.monitoringavailable.uk |
| Station 3 Handler | ✅ OPERATIONAL | - | Embedded in STTTTSserver |
| Station 9 Handler | ✅ OPERATIONAL | - | Embedded in STTTTSserver |
| Continuous Monitoring | ✅ PM2 | - | ID: 15 |

### PM2 Managed Services (8 Total)
1. **database-api-server** (ID: 0) - Critical
2. **monitoring-server** (ID: 1) - Critical  
3. **monitoring-bridge** (ID: 9)
4. **STTTTSserver** (ID: 14)
5. **ari-gstreamer** (ID: 5)
6. **gateway-3333** (ID: 3)
7. **gateway-4444** (ID: 4)
8. **continuous-monitoring** (ID: 15)

### Recent System Enhancements
- ✅ Component control API endpoints (start/stop/restart)
- ✅ Critical component protection implemented
- ✅ Descriptive messages added to all 23 components
- ✅ UDP socket 6122 properly named as "UDP In 4444"
- ✅ PostgreSQL replaced with audio-optimization-db
- ✅ Continuous monitoring integrated with PM2

### Directory Structure Backed Up
```
/home/azureuser/translation-app/
├── 3333_4444__Operational/
│   └── STTTTSserver/
│       ├── STTTTSserver.js
│       ├── station3-handler.js
│       ├── station9-handler.js
│       └── monitoring/
│           ├── StationAgent.js
│           └── component-checkers.js
├── monitoring/
│   ├── database-api-server.js
│   ├── monitoring-server.js
│   └── monitoring-to-database-bridge.js
├── asterisk-configs/
├── public/
├── database-api-server.js (root)
├── monitoring-server.js (root)
├── monitoring-to-database-bridge.js (root)
├── continuous-full-monitoring-with-station3.js
├── conference-server.js
├── ari-gstreamer-operational.js
├── gateway-3333.js
├── gateway-4444.js
├── package.json
└── ecosystem.config.js
```

### Restoration Instructions
1. Copy backup to target server
2. Extract: `tar -xzf Working_3333_4444_Full_Cycle_Monitoring_3_9_System_Components_2_*.tar.gz`
3. Install dependencies: `npm install` in each directory
4. Start services in order:
   ```bash
   pm2 start database-api-server.js --name database-api-server
   pm2 start monitoring-server.js --name monitoring-server
   pm2 start monitoring-to-database-bridge.js --name monitoring-bridge
   cd 3333_4444__Operational/STTTTSserver && pm2 start STTTTSserver.js --name STTTTSserver
   pm2 start ari-gstreamer-operational.js --name ari-gstreamer
   pm2 start gateway.js --name gateway-3333 -- 3333
   pm2 start gateway.js --name gateway-4444 -- 4444  
   pm2 start continuous-full-monitoring-with-station3.js --name continuous-monitoring
   ```
5. Verify at: https://tun.monitoringavailable.uk/api/health/system

### API Endpoints Available
- GET /api/health/system - System health status
- GET /api/snapshots - Station monitoring data
- POST /api/components/:id/start - Start component
- POST /api/components/:id/stop - Stop component  
- POST /api/components/:id/restart - Restart component
- POST /api/clear - Clear monitoring data

### Notes
- Station handlers are modules within STTTTSserver, not standalone
- Asterisk ARI/AMI show as DEAD but ports 8088/5038 are listening
- All components include descriptive messages
- Critical components protected from stop/start operations

---
*Generated: Tue Dec 16 03:13:50 IST 2025*
