# 3333/4444 COMPLETE SYSTEM ARCHITECTURE & OPERATIONS GUIDE
## Full Production System with Monitoring, Database, and All Components

---

## 🏗️ SYSTEM ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                        ASTERISK PBX                              │
│                    Extensions: 3333, 4444                        │
│                      ARI Port: 8088                              │
└──────────────────┬──────────────────────┬───────────────────────┘
                   │                      │
              UDP:4000-4003          WebSocket:8088
                   │                      │
                   ▼                      ▼
┌─────────────────────────┐    ┌──────────────────────────┐
│   Gateway-3333/4444     │    │  ARI-GStreamer Handler   │
│   UDP→TCP Bridge        │    │  Channel Management      │
└───────────┬─────────────┘    └──────────────────────────┘
            │
       UDP:6120-6123
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STTTTSserver (Main)                         │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐       │
│  │  Deepgram   │  │    DeepL     │  │   ElevenLabs    │       │
│  │    (STT)    │  │ (Translation) │  │     (TTS)       │       │
│  └─────────────┘  └──────────────┘  └─────────────────┘       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │         StationAgent (STATION_3 Monitoring)          │      │
│  │              22 Parameters Collection                │      │
│  └────────────────────┬─────────────────────────────────┘      │
└───────────────────────┼─────────────────────────────────────────┘
                        │
                   Socket.IO:3001
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│               Monitoring Server (Port 3001)                      │
│                  Metrics Aggregation                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                HTTP:8083
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│             Database Server (Port 8083)                          │
│                PostgreSQL Interface                              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                  Port:5432
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                           │
│                  station_snapshots table                         │
└──────────────────────────────────────────────────────────────────┘
                     ▲
                     │
                HTTP:8083
                     │
┌─────────────────────────────────────────────────────────────────┐
│              Dashboard Server (Port 8080)                        │
│           database-records.html, monitoring UI                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📂 COMPLETE FILE STRUCTURE & PURPOSE

### Root Level Services (`/home/azureuser/translation-app/`)
```
├── monitoring-server.js           # Central monitoring hub (Socket.IO)
├── simplified-database-server.js  # PostgreSQL API server
├── proxy-dashboard-server.js      # Dashboard web server
├── test-sttts-monitoring.js       # Monitoring test utility
├── simulate-call.js               # Call simulation for testing
└── 3333_4444__Operational/       # Main application directory
```

### Main Application (`3333_4444__Operational/`)
```
├── gateway-3333.js               # UDP→TCP bridge for ext 3333
├── gateway-4444.js               # UDP→TCP bridge for ext 4444
├── ari-gstreamer-operational.js  # Asterisk ARI handler
├── STTTTSserver/                 # Core translation service
├── Gateway/                      # Alternative gateway implementations
└── hume_worker/                  # Hume AI integration (Python)
```

### STTTTSserver Directory Structure
```
STTTTSserver/
├── Core Files:
│   ├── STTTTSserver.js                 # Main service
│   ├── .env.externalmedia              # API keys configuration
│   ├── package.json                    # Node dependencies
│   └── monitoring-integration.js       # Socket.IO client
│
├── Service Integrations:
│   ├── elevenlabs-tts-service.js      # ElevenLabs TTS
│   ├── hume-streaming-client.js       # Hume AI client
│   ├── deepgram-streaming-client.js   # Deepgram STT
│   └── database-integration-module.js # Database client
│
├── Monitoring System:
│   └── monitoring/
│       ├── StationAgent.js            # Station 3 metrics collector
│       ├── UniversalCollector.js      # 75-parameter system
│       ├── collectors/                # Individual metric collectors
│       ├── config/                    # Station configurations
│       │   └── station-parameter-map.js
│       └── utils/                     # Utility functions
│
├── HMLCP System:
│   └── hmlcp/
│       ├── index.js                   # HMLCP entry point
│       ├── default-profiles.js        # User profiles
│       ├── pattern-extractor.js       # Pattern analysis
│       ├── ulo-layer.js              # ULO processing
│       └── user-profile.js           # Profile management
│
└── Public Files:
    └── public/
        ├── dashboard.html             # Main dashboard
        └── database-records.html     # Database viewer
```

---

## 🔌 COMPLETE PORT MAPPING

### UDP Audio Ports
| Port | Direction | Service | Purpose |
|------|-----------|---------|---------|
| 4000 | IN | Gateway-3333 | Receives from Asterisk |
| 4001 | OUT | Gateway-3333 | Sends to Asterisk |
| 4002 | IN | Gateway-4444 | Receives from Asterisk |
| 4003 | OUT | Gateway-4444 | Sends to Asterisk |
| 6120 | IN | STTTTSserver | Receives from Gateway-3333 |
| 6121 | OUT | STTTTSserver | Sends to Gateway-3333 |
| 6122 | IN | STTTTSserver | Receives from Gateway-4444 |
| 6123 | OUT | STTTTSserver | Sends to Gateway-4444 |

### TCP Service Ports
| Port | Service | Protocol | Purpose |
|------|---------|----------|---------|
| 3001 | Monitoring Server | Socket.IO | Metrics collection |
| 3020 | STTTTSserver | HTTP/WS | Dashboard & WebSocket |
| 5432 | PostgreSQL | PostgreSQL | Database storage |
| 8080 | Proxy Dashboard | HTTP | Web dashboard |
| 8083 | Database API | HTTP/REST | Database interface |
| 8088 | Asterisk ARI | WebSocket | Call control |

---

## 🚀 COMPLETE STARTUP & SHUTDOWN PROCEDURES

### STARTUP SEQUENCE (Order Critical!)

```bash
#!/bin/bash
# Complete System Startup Script

echo "Starting 3333/4444 System with Monitoring..."

# 1. Ensure PostgreSQL is running
echo "[1/9] Starting PostgreSQL..."
sudo systemctl start postgresql
sleep 2

# 2. Start Database Server
echo "[2/9] Starting Database Server (port 8083)..."
cd /home/azureuser/translation-app
nohup node simplified-database-server.js > /tmp/database.log 2>&1 &
sleep 3

# 3. Start Monitoring Server
echo "[3/9] Starting Monitoring Server (port 3001)..."
cd /home/azureuser/translation-app
nohup node monitoring-server.js > /tmp/monitoring.log 2>&1 &
sleep 3

# 4. Start STTTTSserver (Main Service)
echo "[4/9] Starting STTTTSserver..."
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
nohup node STTTTSserver.js > /tmp/STTTTSserver.log 2>&1 &
sleep 5

# 5. Start Gateway-3333
echo "[5/9] Starting Gateway-3333..."
cd /home/azureuser/translation-app/3333_4444__Operational
nohup node gateway-3333.js > /tmp/gateway-3333.log 2>&1 &
sleep 2

# 6. Start Gateway-4444
echo "[6/9] Starting Gateway-4444..."
cd /home/azureuser/translation-app/3333_4444__Operational
nohup node gateway-4444.js > /tmp/gateway-4444.log 2>&1 &
sleep 2

# 7. Start ARI Handler
echo "[7/9] Starting ARI Handler..."
cd /home/azureuser/translation-app/3333_4444__Operational
nohup node ari-gstreamer-operational.js > /tmp/ari-gstreamer.log 2>&1 &
sleep 2

# 8. Start Dashboard Proxy (Optional)
echo "[8/9] Starting Dashboard Proxy (port 8080)..."
cd /home/azureuser
nohup node proxy-dashboard-server.js > /tmp/proxy-dashboard.log 2>&1 &
sleep 2

# 9. Start Hume Worker (if needed)
echo "[9/9] Starting Hume Worker (Python)..."
cd /home/azureuser/translation-app/3333_4444__Operational/hume_worker
nohup python3 hume_worker.py > /tmp/hume_worker.log 2>&1 &

echo "✅ System startup complete!"
echo "Dashboards available at:"
echo "  - http://20.170.155.53:3020/dashboard.html"
echo "  - http://20.170.155.53:8080/database-records.html"
```

### SHUTDOWN SEQUENCE

```bash
#!/bin/bash
# Complete System Shutdown Script

echo "Shutting down 3333/4444 System..."

# Kill in reverse order
echo "[1/9] Stopping Hume Worker..."
pkill -f hume_worker.py

echo "[2/9] Stopping Dashboard Proxy..."
pkill -f proxy-dashboard-server.js

echo "[3/9] Stopping ARI Handler..."
pkill -f ari-gstreamer-operational.js

echo "[4/9] Stopping Gateway-4444..."
pkill -f gateway-4444.js

echo "[5/9] Stopping Gateway-3333..."
pkill -f gateway-3333.js

echo "[6/9] Stopping STTTTSserver..."
pkill -f STTTTSserver.js

echo "[7/9] Stopping Monitoring Server..."
pkill -f monitoring-server.js

echo "[8/9] Stopping Database Server..."
pkill -f simplified-database-server.js

echo "[9/9] PostgreSQL remains running (system service)"

echo "✅ System shutdown complete!"
```

### RESTART SEQUENCE

```bash
#!/bin/bash
# Quick Restart Script

echo "Restarting critical services..."

# Kill existing processes
pkill -f STTTTSserver.js
pkill -f gateway-3333.js
pkill -f gateway-4444.js
sleep 2

# Restart in correct order
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
nohup node STTTTSserver.js > /tmp/STTTTSserver.log 2>&1 &
sleep 3

cd /home/azureuser/translation-app/3333_4444__Operational
nohup node gateway-3333.js > /tmp/gateway-3333.log 2>&1 &
nohup node gateway-4444.js > /tmp/gateway-4444.log 2>&1 &

echo "✅ Services restarted!"
```

---

## 🔍 MONITORING & HEALTH CHECKS

### System Health Check Script
```bash
#!/bin/bash
# health-check.sh

echo "=== SYSTEM HEALTH CHECK ==="
echo ""

# Check processes
echo "📊 PROCESS STATUS:"
for process in "STTTTSserver" "gateway-3333" "gateway-4444" "monitoring-server" "simplified-database" "ari-gstreamer"; do
    if pgrep -f "$process" > /dev/null; then
        echo "✅ $process: RUNNING (PID: $(pgrep -f $process))"
    else
        echo "❌ $process: NOT RUNNING"
    fi
done

echo ""
echo "🔌 PORT STATUS:"
# Check TCP ports
for port in 3001 3020 5432 8080 8083 8088; do
    if netstat -tln | grep -q ":$port "; then
        echo "✅ Port $port: LISTENING"
    else
        echo "❌ Port $port: NOT LISTENING"
    fi
done

echo ""
echo "💾 DATABASE STATUS:"
record_count=$(psql -h localhost -U postgres -d audio_optimization -t -c "SELECT COUNT(*) FROM station_snapshots;" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Database: CONNECTED (Records: $record_count)"
else
    echo "❌ Database: NOT ACCESSIBLE"
fi

echo ""
echo "📈 RECENT METRICS:"
psql -h localhost -U postgres -d audio_optimization -c "
SELECT station_id, COUNT(*) as calls, MAX(created_at) as last_activity
FROM station_snapshots
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY station_id;" 2>/dev/null

echo ""
echo "=== CHECK COMPLETE ==="
```

### Real-Time Log Monitoring
```bash
# Monitor all logs simultaneously
tail -f /tmp/STTTTSserver.log /tmp/gateway-*.log /tmp/monitoring.log /tmp/database.log
```

### Database Queries for Monitoring
```sql
-- Check recent Station 3 activity
SELECT
    call_id,
    channel,
    created_at,
    (metrics->>'snr_db')::numeric as snr,
    (metrics->>'audio_level_dbfs')::numeric as audio_level
FROM station_snapshots
WHERE station_id = 'STATION_3'
ORDER BY created_at DESC
LIMIT 20;

-- Get call statistics
SELECT
    DATE(created_at) as date,
    COUNT(DISTINCT call_id) as total_calls,
    COUNT(*) as total_records,
    AVG((metrics->>'snr_db')::numeric) as avg_snr
FROM station_snapshots
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Check knobs effectiveness
SELECT
    knobs_effective,
    COUNT(*) as usage_count,
    AVG((metrics->>'audio_level_dbfs')::numeric) as avg_audio_level
FROM station_snapshots
WHERE knobs_effective IS NOT NULL
GROUP BY knobs_effective
ORDER BY usage_count DESC;
```

---

## 🛠️ TROUBLESHOOTING GUIDE

### Common Issues & Solutions

#### 1. No Audio on Calls
```bash
# Check UDP ports
netstat -uln | grep -E '4000|4002|6120|6122'

# Check gateway logs
tail -100 /tmp/gateway-3333.log | grep ERROR
tail -100 /tmp/gateway-4444.log | grep ERROR

# Verify audio gain settings
grep extensionGainFactors /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js
```

#### 2. Monitoring Not Working
```bash
# Check Socket.IO connection
grep "Connected to monitoring" /tmp/STTTTSserver.log

# Verify monitoring server
ps aux | grep monitoring-server
netstat -tln | grep 3001

# Check StationAgent integration
grep "StationAgent" /tmp/STTTTSserver.log
```

#### 3. Database Not Storing
```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Test database connection
psql -h localhost -U postgres -d audio_optimization -c "SELECT 1;"

# Check database server
ps aux | grep simplified-database
tail -100 /tmp/database.log
```

#### 4. Dashboard Empty
```bash
# Check proxy server
ps aux | grep proxy-dashboard
curl http://localhost:8080/api/snapshots

# Clear browser cache and retry
# Check CORS settings in proxy-dashboard-server.js
```

---

## 📊 PERFORMANCE TUNING

### Optimize PostgreSQL
```sql
-- Add indexes for better performance
CREATE INDEX idx_station_timestamp ON station_snapshots(station_id, timestamp DESC);
CREATE INDEX idx_call_channel ON station_snapshots(call_id, channel);

-- Vacuum and analyze
VACUUM ANALYZE station_snapshots;
```

### Monitor System Resources
```bash
# CPU and Memory usage
top -b -n 1 | head -20

# Disk usage
df -h /

# Network connections
netstat -an | grep ESTABLISHED | wc -l
```

### Adjust Buffer Sizes
Edit `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/audio-buffer-config.json`:
```json
{
  "bufferSize": 8192,
  "sampleRate": 16000,
  "channels": 1
}
```

---

## 🔐 SECURITY CONSIDERATIONS

### Firewall Rules (Azure NSG)
```
Inbound Rules:
- SSH: 22/TCP (Admin only)
- Dashboard: 3020/TCP
- Monitoring Dashboard: 8080/TCP
- Asterisk ARI: 8088/TCP (Internal only)

All UDP ports (4000-4003, 6120-6123) should be internal only
```

### API Key Security
Store in `.env.externalmedia`:
```bash
DEEPGRAM_API_KEY=xxx
DEEPL_API_KEY=xxx
ELEVENLABS_API_KEY=xxx
HUME_API_KEY=xxx
```

### Database Security
```bash
# Change default password
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'new_secure_password';"

# Update connection strings in simplified-database-server.js
```

---

## 🔄 BACKUP & RECOVERY

### Create Full Backup
```bash
#!/bin/bash
# backup-system.sh

BACKUP_DIR="/home/azureuser/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -h localhost -U postgres audio_optimization > $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# Backup application files
cd /home/azureuser/translation-app
tar -czf $BACKUP_DIR/app_backup_$TIMESTAMP.tar.gz \
  --exclude='node_modules' \
  --exclude='*.log' \
  --exclude='*.tar.gz' \
  3333_4444__Operational/

echo "Backup created: $BACKUP_DIR/*_$TIMESTAMP.*"
```

### Restore from Backup
```bash
#!/bin/bash
# restore-system.sh

BACKUP_DIR="/home/azureuser/backups"
TIMESTAMP=$1  # Pass timestamp as argument

# Restore database
psql -h localhost -U postgres audio_optimization < $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# Restore application
cd /home/azureuser/translation-app
tar -xzf $BACKUP_DIR/app_backup_$TIMESTAMP.tar.gz

echo "System restored from backup: $TIMESTAMP"
```

---

## 📈 MONITORING METRICS EXPLAINED

### Station 3 Key Metrics (22 Parameters)
| Metric | Description | Normal Range |
|--------|-------------|--------------|
| snr_db | Signal-to-Noise Ratio | 20-40 dB |
| audio_level_dbfs | Audio Level | -30 to -10 dBFS |
| voice_activity_ratio | Speech Detection | 0.4-0.8 |
| buffer_usage_pct | Buffer Utilization | 30-70% |
| jitter_ms | Network Jitter | < 30ms |
| packet_loss_pct | Packet Loss | < 1% |
| processing_latency_ms | Processing Delay | < 100ms |

### Knobs System (Optimization Parameters)
```javascript
{
  "agc.enabled": true,              // Automatic Gain Control
  "agc.target_level_dbfs": -18,     // Target audio level
  "noise_reduction.enabled": true,   // Noise suppression
  "echo_cancellation.enabled": true  // Echo removal
}
```

---

## 📝 MAINTENANCE PROCEDURES

### Daily Checks
1. Review health check script output
2. Check dashboard for anomalies
3. Verify call quality metrics
4. Monitor disk space

### Weekly Tasks
1. Backup database and configs
2. Rotate log files
3. Review error logs
4. Update API keys if needed

### Monthly Tasks
1. PostgreSQL vacuum full
2. System updates (apt update)
3. Performance analysis
4. Capacity planning

---

## 🚨 EMERGENCY PROCEDURES

### System Crash Recovery
```bash
# Quick recovery script
#!/bin/bash

echo "EMERGENCY RECOVERY INITIATED"

# Kill all stuck processes
pkill -9 -f "STTTTSserver|gateway|monitoring|database"

# Clear temp files
rm -f /tmp/*.log

# Restart PostgreSQL
sudo systemctl restart postgresql

# Run normal startup sequence
./startup-complete.sh

echo "Recovery complete - verify system status"
```

### Database Corruption
```bash
# Stop all services
./shutdown-complete.sh

# Backup corrupted database
pg_dump audio_optimization > corrupted_backup.sql

# Drop and recreate
psql -U postgres -c "DROP DATABASE audio_optimization;"
psql -U postgres -c "CREATE DATABASE audio_optimization;"

# Restore from last good backup
psql -U postgres audio_optimization < last_good_backup.sql

# Restart services
./startup-complete.sh
```

---

## 📞 TESTING PROCEDURES

### Automated Call Test
```bash
# Test monitoring with simulated call
cd /home/azureuser/translation-app
node simulate-call.js 3333

# Check results in database
psql -h localhost -U postgres -d audio_optimization -c "
SELECT * FROM station_snapshots
WHERE call_id LIKE 'CALL-%'
ORDER BY created_at DESC
LIMIT 5;"
```

### Manual Call Test
1. Phone A dials 3333
2. Phone B dials 4444
3. Verify bidirectional audio
4. Check dashboard for metrics
5. Verify database storage

---

## 📚 REFERENCE INFORMATION

### Important File Locations
```
Logs: /tmp/*.log
Configs: .env.externalmedia, package.json
Database: /var/lib/postgresql/data
Backups: /home/azureuser/backups
```

### Key Commands
```bash
# View real-time metrics
watch -n 1 'psql -h localhost -U postgres -d audio_optimization -t -c "SELECT COUNT(*) FROM station_snapshots;"'

# Monitor network traffic
tcpdump -i any -n port 6120 or port 6122

# Check system load
htop
```

### Support Contacts
- System: Azure VM 20.170.155.53
- Database: PostgreSQL on localhost:5432
- Monitoring: Socket.IO on localhost:3001
- Dashboard: http://20.170.155.53:8080

---

**Document Version:** 3.0
**Last Updated:** 2025-12-01
**Status:** Production Complete with Full Monitoring
**Author:** System Architecture Team

---

## END OF DOCUMENT

This guide covers the complete 3333/4444 system including:
✅ All components and services
✅ Complete startup/shutdown procedures
✅ Monitoring and database integration
✅ Troubleshooting and maintenance
✅ Emergency recovery procedures
✅ Performance tuning guidelines

Use this as the master reference for system operations.