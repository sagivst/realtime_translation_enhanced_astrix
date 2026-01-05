# Full System - Quick Reference Card

## 🚀 Quick Start (Full System)

```bash
# Set Cloudflare token (for permanent tunnel)
export CLOUDFLARE_TOKEN="eyJhIjoiNjhmODhmZWZlMzgzMDZhYzBlYmFjMDM5NDg4ZmZiZTgiLCJ0IjoiOWEzMTE2Y2UtNzZlMy00ZDY2LTljMGUtZDY2ODhlYmYwZDAxIiwicyI6Ik5qTXdNREU1WVRJdE1EUmtaUzAwT0RrNExUazVNbVl0TTJZMllqTTFNbVZsTXpjMiJ9"

# Run deployment script
bash deploy-monitoring-system.sh
```

## 📋 PM2 Service Order & Dependencies

```bash
# Start Order (CRITICAL - must follow this sequence!)
1. database-api-server     # Port 8083 - API Gateway
2. monitoring-server       # Port 8090 - Optimization Engine
3. monitoring-bridge       # Port 3001 - Data Bridge
4. STTTTSserver           # Port 8080 - Translation Core (CD TO DIR FIRST!)
5. gateway-3333           # Port 7777 - WebSocket Gateway
6. gateway-4444           # Port 8888 - WebSocket Gateway
7. ari-gstreamer          # Port 8089 - Asterisk Interface
8. continuous-monitoring   # Port 9090 - Background Traffic
9. cloudflared-perm       # Tunnel - External Access
```

## 🔧 Most Used Commands

### Service Management
```bash
pm2 status                     # View all services
pm2 restart all               # Restart everything
pm2 logs --lines 50          # View recent logs
pm2 monit                     # Real-time dashboard
pm2 save                      # Save current config
```

### Individual Service Control
```bash
pm2 restart database-api-server
pm2 restart STTTTSserver
pm2 restart cloudflared-perm
pm2 logs [service-name] --lines 100
```

### STTTTSserver Special Handling
```bash
# Must start from its directory!
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
pm2 delete STTTTSserver
pm2 start STTTTSserver.js --name STTTTSserver
```

### Cloudflare Tunnel
```bash
# Start with token
pm2 start cloudflared --name cloudflared-perm -- tunnel run --token YOUR_TOKEN

# Check tunnel status
pm2 logs cloudflared-perm --lines 20
```

## 🔍 Health Checks

### Local Testing
```bash
# Main API
curl -s http://localhost:8083/api/health/system | jq '.status'

# Component count (should be 23)
curl -s http://localhost:8083/api/health/system | jq '.components_total'

# Snapshots
curl -s http://localhost:8083/api/snapshots | jq '.[0]'
```

### External Access (via Tunnel)
```bash
# Permanent tunnel
curl https://tun.monitoringavailable.uk/api/health/system

# Temporary tunnel (check URL first)
cat /home/azureuser/current-tunnel-url.txt
```

## 🛠️ Troubleshooting

### Service Won't Start
```bash
pm2 logs [service-name] --err --lines 100    # Check errors
sudo lsof -i:[port]                          # Check port conflict
pm2 describe [service-name]                  # Detailed info
```

### Full System Reset
```bash
pm2 kill                      # Stop PM2 daemon
pm2 resurrect                 # Restore saved config
# OR
pm2 stop all && pm2 delete all && bash deploy-monitoring-system.sh
```

### Port Already in Use
```bash
# Find process using port
sudo lsof -i:8083
# Kill process
sudo kill -9 [PID]
```

## 📊 Component Status Matrix

| Layer | Component | PM2 Name | Port | Critical |
|-------|-----------|----------|------|----------|
| **Monitoring** | | | | |
| | database-api-server | database-api-server | 8083 | ✅ |
| | monitoring-server | monitoring-server | 8090 | ✅ |
| | monitoring-bridge | monitoring-bridge | 3001 | ❌ |
| | continuous-monitoring | continuous-monitoring | 9090 | ❌ |
| | cloudflared | cloudflared-perm | - | ❌ |
| **Core** | | | | |
| | STTTTSserver | STTTTSserver | 8080 | ✅ |
| | ari-gstreamer | ari-gstreamer | 8089 | ✅ |
| **Gateways** | | | | |
| | gateway-3333 | gateway-3333 | 7777 | ✅ |
| | gateway-4444 | gateway-4444 | 8888 | ✅ |

## 🔄 Emergency Recovery

```bash
# Quick recovery script
cat << 'EOF' > /tmp/quick-recover.sh
#!/bin/bash
pm2 stop all
pm2 delete all
pm2 flush

# Start critical services only
pm2 start /home/azureuser/translation-app/database-api-server.js --name database-api-server
pm2 start /home/azureuser/translation-app/monitoring-server.js --name monitoring-server
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
pm2 start STTTTSserver.js --name STTTTSserver

pm2 status
EOF

bash /tmp/quick-recover.sh
```

## 📝 Log Locations

```bash
# PM2 Logs
~/.pm2/logs/[service-name]-out.log     # Standard output
~/.pm2/logs/[service-name]-error.log   # Error output

# Cloudflared
/tmp/cloudflared-permanent.log         # Tunnel logs
/home/azureuser/current-tunnel-url.txt # Current tunnel URL

# View all logs at once
pm2 logs --nostream
```

## ⚡ Performance Tips

1. **Memory Management**: Monitor with `pm2 monit`, restart if >200MB
2. **CPU Usage**: Should stay below 5% per service when idle
3. **Log Rotation**: Essential for long-running systems
   ```bash
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 10M
   ```

## 🔐 Security Checklist

- [ ] Cloudflare tunnel active (no direct port exposure)
- [ ] PM2 startup configured (`pm2 startup`)
- [ ] Logs not containing sensitive data
- [ ] Regular PM2 updates (`npm update -g pm2`)
- [ ] Firewall configured (only necessary ports)

## 📞 API Endpoints Reference

```bash
# Health & Status
GET /api/health/system         # Full system health
GET /api/snapshots             # Station metrics
GET /api/status                # Simple status

# Component Management
POST /api/components/{id}/restart   # Restart component
POST /api/components/{id}/stop      # Stop component (non-critical only)
POST /api/components/{id}/start     # Start component

# Example restart
curl -X POST https://tun.monitoringavailable.uk/api/components/gateway-3333/restart
```

---
*Last Updated: December 2025 | Version 1.0*