# NEW Monitoring System + STTTTSserver Quick Installation Guide
## Based on Working Configuration (Jan 2, 2025)

---

## CRITICAL UNDERSTANDING
The system requires **6 separate processes** running in **specific order**. This is NOT a single application!

---

## 1. PREREQUISITES

### Required Services:
- PostgreSQL with `monitoring_v2` database
- Asterisk with ARI enabled (port 8088)
- Node.js 18+ installed

### Required Files Location:
```
/home/azureuser/translation-app/3333_4444__Operational/
├── gateway-3333.js                    ← REQUIRED
├── gateway-4444.js                    ← REQUIRED
├── ari-gstreamer-operational.js       ← REQUIRED
└── STTTTSserver/                      ← REQUIRED
    ├── STTTTSserver.js
    ├── .env.externalmedia (with API keys)
    └── Monitoring_Stations/           ← NEW monitoring system
```

---

## 2. STARTUP SEQUENCE (MUST BE IN THIS ORDER!)

### Step 1: Start Monitoring Infrastructure FIRST
```bash
# Database server (port 8083)
cd /home/azureuser/translation-app
pm2 start simplified-database-server.js --name database-server

# Proxy dashboard (port 8080)
cd /home/azureuser
pm2 start proxy-dashboard-server.js --name proxy-dashboard
```

### Step 2: Start STTTTSserver (WITH monitoring now available)
```bash
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
pm2 start STTTTSserver.js --name STTTTSserver
```

### Step 3: Start Gateway Services
```bash
cd /home/azureuser/translation-app/3333_4444__Operational
pm2 start gateway-3333.js --name gateway-3333
pm2 start gateway-4444.js --name gateway-4444
```

### Step 4: Start ARI Handler LAST
```bash
cd /home/azureuser/translation-app/3333_4444__Operational
pm2 start ari-gstreamer-operational.js --name ari-handler
```

---

## 3. CRITICAL PORTS

### UDP Audio Ports (MUST be free):
- **4000**: Gateway-3333 receives from Asterisk
- **4002**: Gateway-4444 receives from Asterisk
- **6120-6123**: STTTTSserver ↔ Gateways communication

### TCP Service Ports:
- **3010**: STTTTSserver dashboard (NOT 3020!)
- **8080**: Proxy dashboard
- **8083**: Database server
- **8088**: Asterisk ARI

---

## 4. VERIFICATION CHECKLIST

### All 6 processes running:
```bash
pm2 status
# Should show:
# - database-server    (online)
# - proxy-dashboard    (online)
# - STTTTSserver      (online)
# - gateway-3333      (online)
# - gateway-4444      (online)
# - ari-handler       (online)
```

### UDP ports listening:
```bash
sudo ss -uln | grep -E '4000|4002|6120|6121|6122|6123'
# Should show all 6 ports
```

### ARI registered:
```bash
sudo asterisk -rx 'ari show apps'
# Should show: gstreamer-operational
```

### Check for errors:
```bash
pm2 logs --lines 20 | grep -i error
# Should be empty or minimal
```

---

## 5. COMMON ISSUES & SOLUTIONS

### Issue: "STTTTSserver had too many unstable restarts"
**Cause**: Started before monitoring infrastructure
**Solution**: Start monitoring servers FIRST (Step 1)

### Issue: No audio/calls not working
**Check**:
1. Are all 6 services running? (`pm2 status`)
2. Is ARI app registered? (`asterisk -rx 'ari show apps'`)
3. Are UDP ports listening? (`sudo ss -uln | grep 4000`)

### Issue: Wrong directory errors
**Critical**: Use the `3333_4444__Operational` directory, NOT the main `STTTTSserver` directory!

### Issue: Database connection errors
**Solution**: Ensure PostgreSQL is running and has space:
```bash
df -h /  # Check disk space
sudo systemctl restart postgresql@14-main  # If needed
```

---

## 6. NEW MONITORING SYSTEM

### What it monitors:
- **Station3_3333_Handler**: Audio from extension 3333
- **Station3_4444_Handler**: Would handle 4444 (not created yet, but system works without it)
- **5-second buckets**: Metrics aggregation every 5 seconds
- **Audio recording**: Saves to `/var/monitoring/audio/`

### Database: `monitoring_v2`
- `traces` table: Call tracking with stable trace_id
- `metrics_agg_5s`: 5-second aggregated metrics
- `audio_segments_5s`: Audio file references

### Critical Fix Applied:
- trace_id generation now uses `pairManager.startTimes` for stability
- Previously was creating new trace_id every frame (WRONG!)

---

## 7. QUICK RESTART PROCEDURE

If something goes wrong:
```bash
# Stop everything
pm2 stop all
pm2 delete all

# Start in correct order (copy-paste):
cd /home/azureuser/translation-app && pm2 start simplified-database-server.js --name database-server
cd /home/azureuser && pm2 start proxy-dashboard-server.js --name proxy-dashboard
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && pm2 start STTTTSserver.js --name STTTTSserver
cd /home/azureuser/translation-app/3333_4444__Operational && pm2 start gateway-3333.js --name gateway-3333
cd /home/azureuser/translation-app/3333_4444__Operational && pm2 start gateway-4444.js --name gateway-4444
cd /home/azureuser/translation-app/3333_4444__Operational && pm2 start ari-gstreamer-operational.js --name ari-handler
```

---

## 8. KEY LEARNINGS

1. **Startup order matters!** Monitoring infrastructure MUST start before STTTTSserver
2. **Use PM2 properly** - Start from correct working directory
3. **Check ARI registration** - Must show 'gstreamer-operational'
4. **Disk space critical** - PostgreSQL fails silently when disk full
5. **Station3_4444_Handler.js not required** - System works without it
6. **Port 3010 not 3020** - Documentation was wrong about dashboard port

---

## 9. TEST PROCEDURE

1. Make call from extension 3333
2. Make call from extension 4444
3. Verify in ARI logs: `pm2 logs ari-handler --lines 20`
4. Should see:
   - StasisStart events
   - ExternalMedia creation
   - Bridge creation
   - Audio should flow bidirectionally

---

## FILES TO BACKUP

Critical configuration files:
```
/home/azureuser/translation-app/3333_4444__Operational/
├── All .js files (gateways, ari-handler)
├── STTTTSserver/
│   ├── STTTTSserver.js (with monitoring integration)
│   ├── .env.externalmedia (API keys)
│   └── Monitoring_Stations/ (entire directory)
├── /home/azureuser/translation-app/
│   └── simplified-database-server.js
└── /home/azureuser/
    └── proxy-dashboard-server.js
```

---

**Document Version**: 1.0
**Last Working Test**: January 2, 2025
**Azure VM**: 20.170.155.53
**Time to Debug**: ~10 hours (but now you can do it in 10 minutes!)