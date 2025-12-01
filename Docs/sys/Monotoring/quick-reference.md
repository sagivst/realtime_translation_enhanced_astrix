# Monitoring System - Quick Reference Guide

## 🌐 Access Points

**Dashboard**: http://20.170.155.53:3021/monitoring-tree-dashboard.html
**API**: http://20.170.155.53:3021/api/parameters

## 📁 File Locations (Azure VM)

```
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/
├── monitoring-server.js              # Main server (port 3021)
├── config/parameters/                # 55 parameter configs + index
│   ├── index.json
│   ├── buffer/       (10 files)
│   ├── latency/      (8 files)
│   ├── packet/       (12 files)
│   ├── audioQuality/ (10 files)
│   ├── performance/  (8 files)
│   └── custom/       (7 files)
└── public/
    └── monitoring-tree-dashboard.html
```

## 🔄 Common Tasks

### Restart Monitoring Server
```bash
ssh azureuser@20.170.155.53 "pkill -f monitoring-server.js && cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && nohup node monitoring-server.js > monitoring-server.log 2>&1 &"
```

### Check Server Status
```bash
ssh azureuser@20.170.155.53 "ps aux | grep monitoring-server.js | grep -v grep"
```

### View Server Logs
```bash
ssh azureuser@20.170.155.53 "tail -50 /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring-server.log"
```

### Edit Parameter Config
```bash
ssh azureuser@20.170.155.53
nano /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/config/parameters/buffer/total.json
```

### Deploy Updated Dashboard
```bash
scp /tmp/monitoring-uniform-dark.html azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html
```

## 🎯 Dashboard Navigation

**Level 1 → Level 2**: Click station box or expand button (⛶)
**Level 2 → Level 3**: Click parameter box or expand button (⛶)
**Level 3 → Level 2**: Click "← Back" button (top-right) or Cancel
**Level 2 → Level 1**: Click "← Back" button (header top-right)
**Any Level → Level 1**: Click "Level 1" in breadcrumb

## 📊 55 Parameters

### Categories:
- **Buffer**: 10 parameters (total, input, output, overruns, underruns, etc.)
- **Latency**: 8 parameters (avg, peak, jitter, e2e, network, etc.)
- **Packet**: 12 parameters (rx, tx, dropped, loss rate, errors, etc.)
- **Audio Quality**: 10 parameters (clipping, SNR, THD, audio level, etc.)
- **Performance**: 8 parameters (CPU, memory, threads, queue depth, etc.)
- **Custom**: 7 parameters (state, success rate, warnings, critical events, etc.)

### Priority Levels:
- **Critical** (10): overruns, underruns, avg latency, dropped packets, CPU, clipping, etc.
- **High** (11): buffer levels, jitter, network latency, audio quality, etc.
- **Medium** (19): processing metrics, connection counts, etc.
- **Low** (15): informational metrics

## 🔌 API Examples

### Get All Parameters
```bash
curl http://20.170.155.53:3021/api/parameters | python3 -m json.tool
```

### Get Specific Parameter
```bash
curl http://20.170.155.53:3021/api/parameters/buffer/total | python3 -m json.tool
```

### Update Parameter (Thresholds + Alerts)
```bash
curl -X PATCH http://20.170.155.53:3021/api/parameters/buffer/total \
  -H "Content-Type: application/json" \
  -d '{
    "thresholds": {
      "warningHigh": 85,
      "criticalHigh": 98
    },
    "alerts": {
      "audioAlert": true,
      "visualAlert": true
    },
    "default": true
  }'
```

### Get Stations
```bash
curl http://20.170.155.53:3021/api/stations | python3 -m json.tool
```

## 🎨 Design Specs

**Box Size**: 220px × 240px (min)
**Grid Gap**: 20px
**Update Rate**: 1 second (real-time)
**Color Scheme**: Dark theme (#0a0e27 background)
**Status Colors**: Green (good), Orange (warning), Red (critical)

## ⚙️ Configuration Schema

Each parameter file has:
- `id`, `name`, `category`, `path`, `unit`
- `ranges`: min, max, recommendedMin, recommendedMax
- `thresholds`: warningLow/High, criticalLow/High
- `alerts`: enabled, audioAlert, visualAlert, emailAlert, webhookAlert
- `metadata`: updateFrequency, priority, displayOrder

## 🚨 Alert Priority Matrix

| Priority | Audio Alert | Visual Alert | Email Alert | Webhook Alert |
|----------|-------------|--------------|-------------|---------------|
| Critical | Most | All | Some | 1 (critical events) |
| High | Many | All | None | None |
| Medium | Few | Most | None | None |
| Low | None | Some | None | None |

## 💾 Backup Commands

### Backup Configuration Files
```bash
ssh azureuser@20.170.155.53 "tar -czf ~/param-configs-backup-$(date +%Y%m%d).tar.gz /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/config/parameters/"
```

### Backup Dashboard
```bash
scp azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html /tmp/dashboard-backup-$(date +%Y%m%d).html
```

### Backup Server
```bash
scp azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring-server.js /tmp/monitoring-server-backup-$(date +%Y%m%d).js
```

## 🔧 Troubleshooting

### Dashboard not loading?
1. Check server is running: `ps aux | grep monitoring-server`
2. Check port 3021 is accessible
3. View browser console for errors

### Parameters not updating?
1. Check WebSocket connection in browser console
2. Verify server is broadcasting: check server logs
3. Refresh browser (Cmd+Shift+R / Ctrl+Shift+R)

### API not responding?
1. Check monitoring server is running
2. Test with curl: `curl http://20.170.155.53:3021/api/parameters`
3. Check server logs for errors

### Save not working?
1. Check browser console for API errors
2. Verify PATCH endpoint is accessible
3. Check file permissions on config files

## 📞 Quick Health Check

```bash
# One-liner to check everything
ssh azureuser@20.170.155.53 "echo '=== Server Status ===' && ps aux | grep monitoring-server.js | grep -v grep && echo '=== Config Files ===' && ls -la /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/config/parameters/ && echo '=== API Test ===' && curl -s http://localhost:3021/api/parameters | python3 -c 'import sys,json; data=json.load(sys.stdin); print(f\"Total params: {data[\"totalParameters\"]}\")'  "
```

---

**All systems operational!** ✅
