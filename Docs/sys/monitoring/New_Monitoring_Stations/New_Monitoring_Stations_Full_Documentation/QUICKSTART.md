# NEW Monitoring System - Quick Start Guide

For experienced users who want to get up and running quickly.

## Prerequisites Check
```bash
node --version  # Need v14+
psql --version  # Need v12+
pm2 --version   # Install: npm install -g pm2
```

## 1. Database Setup (2 minutes)
```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE USER monitoring_user WITH PASSWORD 'monitoring_pass';
CREATE DATABASE monitoring_v2 OWNER monitoring_user;
\c monitoring_v2
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF

# Apply schema (use schema from INSTALLATION_GUIDE.md)
wget https://your-repo/monitoring_schema.sql
sudo -u postgres psql -f monitoring_schema.sql
```

## 2. Directory Setup (1 minute)
```bash
# Create directories
sudo mkdir -p /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
sudo mkdir -p /var/monitoring/audio/traces
sudo chown -R azureuser:azureuser /var/monitoring

cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
mkdir -p Monitoring_Stations/{bridge,config,stations,lib} logs
```

## 3. Deploy Files (5 minutes)
```bash
# Deploy these files from your source:
# CRITICAL FILES (must have exact versions):
cp /source/DatabaseBridge.js Monitoring_Stations/bridge/  # MUST have trace creation (lines 127-169)
cp /source/MonitoringStationsBootstrap.js Monitoring_Stations/
cp /source/MetricsEmitter.js Monitoring_Stations/bridge/
cp /source/AudioWriter.js Monitoring_Stations/bridge/
cp /source/St_Handler_Generic.js Monitoring_Stations/stations/
cp /source/Station3_3333_Handler.js Monitoring_Stations/stations/
cp /source/Station4_4444_Handler.js Monitoring_Stations/stations/
cp /source/BucketScheduler.js lib/
cp /source/STTTTSserver.js .
```

## 4. Configuration (1 minute)
```bash
# Create config
cat > Monitoring_Stations/config/monitoring.config.json << 'EOF'
{
  "database": {
    "host": "localhost",
    "port": 5432,
    "database": "monitoring_v2",
    "user": "monitoring_user",
    "password": "monitoring_pass",
    "maxConnections": 10
  },
  "metricsEmitter": {
    "maxQueueSize": 10000,
    "flushIntervalMs": 200,
    "batchSize": 100
  },
  "audioWriter": {
    "baseDir": "/var/monitoring/audio",
    "maxQueue": 5000,
    "flushIntervalMs": 50
  },
  "audioRecorder": {
    "bucketMs": 5000,
    "sampleRateHz": 16000,
    "channels": 1
  },
  "retentionHours": 72
}
EOF

# Create package.json
cat > package.json << 'EOF'
{
  "name": "sttts-monitoring",
  "version": "2.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "uuid": "^9.0.0",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2",
    "fs-extra": "^11.1.1"
  }
}
EOF

# Create PM2 config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'STTTTSserver',
    script: './STTTTSserver.js',
    cwd: '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver',
    instances: 1,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 3020
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log'
  }]
};
EOF
```

## 5. Install & Start (2 minutes)
```bash
# Install dependencies
npm install

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions
```

## 6. Verify (1 minute)
```bash
# Check health
curl http://localhost:3020/health

# Check traces
curl http://localhost:3020/api/traces/active

# Quick test
cat > test.js << 'EOF'
const dgram = require('dgram');
const client = dgram.createSocket('udp4');
const audio = Buffer.alloc(160, 0);
for(let i = 0; i < 100; i++) {
  setTimeout(() => client.send(audio, 6120, 'localhost'), i * 10);
}
setTimeout(() => {
  console.log('Test complete, check: curl http://localhost:3020/api/traces/active');
  process.exit(0);
}, 2000);
EOF
node test.js
```

## Critical Checks

### ✅ Database
```sql
psql -U monitoring_user -d monitoring_v2 -c "\dt"
# Should show 7 tables
```

### ✅ Trace Creation
```bash
grep -n "INSERT INTO traces" Monitoring_Stations/bridge/DatabaseBridge.js
# MUST show lines around 127-169
```

### ✅ Audio Directory
```bash
ls -la /var/monitoring/audio/traces/
# Should be writable by azureuser
```

### ✅ PM2 Running
```bash
pm2 list
# STTTTSserver should be online
```

## Common Issues

### Foreign Key Violation
**Fix**: DatabaseBridge.js missing trace creation code
```javascript
// Lines 127-169 must have:
// IMPORTANT: Ensure all traces exist first!
for (const [traceId, ctx] of traceContexts) {
  await client.query(`
    INSERT INTO traces (trace_id, started_at, src_extension, dst_extension, call_id, sample_rate, channels)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (trace_id) DO NOTHING
  `, [traceId, ctx.started_at, ctx.src_extension, ctx.dst_extension, ctx.call_id, ctx.sample_rate, ctx.channels]);
}
```

### No Metrics
**Check**: `pm2 logs STTTTSserver | grep "NEW Monitoring"`
**Fix**: Ensure monitoring initialized in STTTTSserver.js

### Audio Not Recording
**Check**: `df -h /var/monitoring`
**Fix**: `sudo chown -R azureuser:azureuser /var/monitoring`

## Clean Restart
```bash
pm2 delete all
psql -U monitoring_user -d monitoring_v2 -c "TRUNCATE traces CASCADE;"
rm -rf /var/monitoring/audio/traces/*
pm2 start ecosystem.config.js
```

## Production Checklist
- [ ] PostgreSQL tuned for production
- [ ] Firewall rules configured
- [ ] Backup strategy in place
- [ ] Monitoring alerts configured
- [ ] Log rotation enabled
- [ ] Cleanup cron job active

## API Endpoints
- Health: `http://localhost:3020/health`
- Active Traces: `http://localhost:3020/api/traces/active`
- Metrics: `http://localhost:3020/api/optimizer/snapshot?trace_id=GLOBAL`
- Apply Knobs: `POST http://localhost:3020/api/optimizer/knobs/apply`

## Support
- Logs: `pm2 logs STTTTSserver`
- Database: `psql -U monitoring_user -d monitoring_v2`
- Audio: `/var/monitoring/audio/traces/`