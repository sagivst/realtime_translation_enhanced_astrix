# NEW Monitoring System - Quick Reference Guide

## Documentation Structure

### Core Documentation (Today's Reverse Engineering)

| Document | Location | Purpose |
|----------|----------|---------|
| **Main README** | [README.md](./README.md) | System overview and navigation |
| **System Architecture** | [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Complete architecture diagrams |
| **Components** | [architecture/components.md](./architecture/components.md) | Detailed component documentation |
| **STTTTSserver Integration** | [architecture/sttttserver_components.md](./architecture/sttttserver_components.md) | Main server integration points |
| **Database Schema** | [database/schema.md](./database/schema.md) | Complete database documentation |
| **Data Flow** | [flows/data_flow.md](./flows/data_flow.md) | Data flow diagrams and sequences |
| **API Endpoints** | [api/endpoints.md](./api/endpoints.md) | REST API documentation |
| **Configuration** | [configuration/config.md](./configuration/config.md) | Configuration guide |
| **Dependencies** | [dependencies/npm_packages.md](./dependencies/npm_packages.md) | Package dependencies |

## Quick Command Reference

### Check System Status
```bash
# PM2 Status
pm2 list

# Database Status
psql -U monitoring_user -d monitoring_v2 -c "SELECT COUNT(*) FROM traces WHERE started_at > NOW() - INTERVAL '1 hour';"

# API Health
curl http://20.170.155.53:3020/health
```

### Test the System
```bash
# Send test audio (from VM)
node /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/test_audio.js

# Check active traces
curl http://20.170.155.53:3020/api/traces/active

# Get metrics snapshot
curl "http://20.170.155.53:3020/api/optimizer/snapshot?trace_id=GLOBAL&limit=1"
```

### Common Operations
```bash
# Restart monitoring
pm2 restart STTTTSserver

# View logs
pm2 logs STTTTSserver --lines 100

# Database cleanup (manual)
psql -U monitoring_user -d monitoring_v2 -c "SELECT cleanup_old_monitoring_data();"
```

## Key Files and Locations

### On VM (20.170.155.53)
```
/home/azureuser/translation-app/3333_4444__Operational/
├── STTTTSserver/
│   ├── STTTTSserver.js                    # Main server
│   ├── Monitoring_Stations/               # Monitoring system
│   │   ├── MonitoringStationsBootstrap.js # Entry point
│   │   ├── bridge/DatabaseBridge.js       # DB interface (with trace creation)
│   │   └── config/monitoring.config.json  # Configuration
│   └── lib/
│       └── BucketScheduler.js            # Knob scheduling
```

### Database Tables
- `traces` - Call tracking
- `metrics_agg_5s` - Aggregated metrics
- `audio_segments_5s` - Audio file index
- `knob_snapshots_5s` - Configuration snapshots
- `scheduled_knob_updates` - Pending changes
- `knob_verifications` - Applied changes verification

## Critical Code Sections

### Trace Auto-Creation (DatabaseBridge.js:127-169)
```javascript
// IMPORTANT: Ensure all traces exist first!
// This code auto-creates traces before inserting metrics
// Prevents foreign key violations
```

### Monitoring Integration (STTTTSserver.js:2409-2427)
```javascript
// Creates trace_id and sends to monitoring
const newMonitoringContext = {
  trace_id: 'trace_' + new Date().toISOString().replace(/[:.]/g, '-') + '_' + extension,
  // ...
};
newMonitoring.processFrame(audioBuffer, newMonitoringContext, stationKey);
```

## System Boundaries

### Network Ports
- **6120/UDP** - Extension 3333 audio input
- **6123/UDP** - Extension 4444 audio input
- **3020/TCP** - Optimizer API
- **5432/TCP** - PostgreSQL (localhost only)

### Performance Limits
- Max concurrent calls: 10
- Metrics queue: 10,000 items
- Audio queue: 5,000 segments
- Database connections: 10 max
- Retention: 72 hours

## Troubleshooting

### No Traces Being Created
1. Check if monitoring is running: `pm2 status STTTTSserver`
2. Verify DatabaseBridge has trace creation code (lines 127-169)
3. Check database connection: `psql -U monitoring_user -d monitoring_v2 -c "SELECT NOW();"`

### Metrics Not Inserting
1. Check for foreign key violations in logs
2. Verify traces exist: `SELECT * FROM traces WHERE trace_id = '...';`
3. Check queue status in logs for backpressure

### Audio Not Recording
1. Check directory permissions: `ls -la /var/monitoring/audio/`
2. Verify AudioWriter queue not full
3. Check disk space: `df -h /var/`

## Recovery Procedures

### After System Crash
```bash
# 1. Check system status
pm2 status

# 2. Restart if needed
pm2 restart all

# 3. Verify database
psql -U monitoring_user -d monitoring_v2 -c "SELECT MAX(bucket_ts) FROM metrics_agg_5s;"

# 4. Test with call
# Make test call to extension 3333

# 5. Verify new data
curl http://20.170.155.53:3020/api/traces/active
```

### Database Recovery
```bash
# Check for stuck transactions
psql -U monitoring_user -d monitoring_v2 -c "SELECT * FROM pg_stat_activity WHERE state = 'idle in transaction';"

# Force cleanup
psql -U monitoring_user -d monitoring_v2 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND pid <> pg_backend_pid();"
```

## Contact Points

- **VM Access**: SSH azureuser@20.170.155.53
- **Database**: PostgreSQL on localhost:5432
- **API**: http://20.170.155.53:3020
- **Logs**: `/home/azureuser/.pm2/logs/`

## Version Information

- **System Version**: 2.0.0
- **Last Updated**: 2026-01-12
- **Database Schema**: monitoring_v2
- **Node.js Required**: v14+
- **PostgreSQL Required**: v12+