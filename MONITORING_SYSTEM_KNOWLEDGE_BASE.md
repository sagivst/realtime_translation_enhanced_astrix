# Monitoring System Knowledge Base
## VM: 20.170.155.53 - Complete System Understanding

## Executive Summary
The monitoring system is a complex, multi-component architecture designed to capture, process, and optimize real-time audio translation metrics. The system IS fundamentally working but suffers from a critical logging bottleneck causing server hangs.

## Critical Issue Identified
**Problem**: Excessive logging of "Skipping non-realtime metric" messages (1,400+ per second) causing server hangs
- **Impact**: Server becomes unresponsive during call processing
- **Root Cause**: 28 metrics marked as `realtimeSafe: false` are being skipped with console logging for each skip
- **Working Metrics**: 54 metrics marked as `realtimeSafe: true` ARE being collected successfully
- **Database Status**: Data IS being written to PostgreSQL successfully

## System Architecture Overview

### Core Components
1. **STTTTSserver.js**: Main translation server with integrated monitoring
2. **MonitoringStationsBootstrap**: Orchestrates all monitoring components
3. **Database Bridge**: PostgreSQL interface with automatic trace creation
4. **Metrics System**: 82 total metrics (54 active, 28 skipped)
5. **Audio Recording**: Dual-tap (PRE/POST) audio capture
6. **AI Optimizer**: OpenAI GPT-4 powered optimization (Port 3090)
7. **BucketScheduler**: 5-second boundary knob scheduling

### Network Topology
- **UDP Ports**: 6120 (ext 3333), 6123 (ext 4444)
- **API Port**: 3020 (OptimizerAPI)
- **AI Service**: 3090 (OpenAI integration)
- **Database**: PostgreSQL on localhost:5432

### Data Flow
```
Audio → UDP Socket → STTTSserver → MonitoringBootstrap → Station Handler
→ Aggregator (5-sec buckets) → MetricsEmitter → DatabaseBridge → PostgreSQL
```

## Critical Code Sections

### 1. The Problematic Logging (monitoring-server.js)
```javascript
// Current problematic code causing server hangs:
if (!metric.realtimeSafe) {
    console.log(`Skipping non-realtime metric: ${metricKey}`); // THIS IS THE PROBLEM
    continue;
}
```

### 2. Database Bridge Auto-Trace Creation (DatabaseBridge.js:127-169)
- **Critical Feature**: Automatically creates traces before inserting metrics
- **Purpose**: Prevents foreign key violations
- **Location**: `/Monitoring_Stations/bridge/DatabaseBridge.js`

### 3. Monitoring Context Creation (STTTSserver.js:2409-2427)
```javascript
const newMonitoringContext = {
    trace_id: 'trace_' + new Date().toISOString().replace(/[:.]/g, '-') + '_' + extension,
    // ... other context
};
```

## Immediate Fix Required

### Option A: Remove Logging Completely (Recommended)
```javascript
// In monitoring-server.js, change to:
if (!metric.realtimeSafe) {
    continue; // Just skip without logging
}
```

### Option B: Log Once Per Session
```javascript
// More complex but preserves some visibility:
if (!metric.realtimeSafe) {
    if (!this.skippedMetricsLogged) {
        this.skippedMetricsLogged = new Set();
    }
    if (!this.skippedMetricsLogged.has(metricKey)) {
        console.log(`Skipping non-realtime metric: ${metricKey}`);
        this.skippedMetricsLogged.add(metricKey);
    }
    continue;
}
```

## Database Verification Queries

### Check Recent Metrics Collection
```sql
-- Verify metrics are being collected
SELECT
    station_id,
    COUNT(*) as metric_count,
    COUNT(DISTINCT metric_name) as unique_metrics,
    MAX(bucket_time) as latest_data
FROM metrics_agg_5s
WHERE bucket_time > NOW() - INTERVAL '30 minutes'
GROUP BY station_id
ORDER BY latest_data DESC;
```

### Check Active Traces
```sql
-- View recent call traces
SELECT
    trace_id,
    station_id,
    start_time,
    duration_ms,
    status
FROM trace
WHERE start_time > NOW() - INTERVAL '30 minutes'
ORDER BY start_time DESC;
```

## System Health Checks

### Quick Status Commands
```bash
# PM2 Process Status
pm2 list

# API Health Check
curl http://20.170.155.53:3020/health

# Active Traces
curl http://20.170.155.53:3020/api/traces/active

# Metrics Snapshot
curl "http://20.170.155.53:3020/api/optimizer/snapshot?trace_id=GLOBAL&limit=1"
```

## File Locations on VM
```
/home/azureuser/translation-app/3333_4444__Operational/
├── STTTTSserver/
│   ├── STTTTSserver.js                    # Main server
│   ├── Monitoring_Stations/               # Monitoring system
│   │   ├── MonitoringStationsBootstrap.js # Orchestrator
│   │   ├── bridge/DatabaseBridge.js       # DB interface
│   │   └── config/monitoring.config.json  # Configuration
│   └── lib/
│       └── BucketScheduler.js            # Knob scheduler

/var/monitoring/audio/                     # Audio recordings
└── traces/{trace_id}/{station}/{tap}/*.wav
```

## Metrics Categories

### Working Metrics (54 total - realtimeSafe: true)
- **PCM Metrics**: amplitude_peak, amplitude_rms, zero_crossing_rate, dynamic_range_db
- **Latency Metrics**: ingress_gateway_delta, egress_buffer_ms, processing_ms
- **Buffer Metrics**: input_buffer_size, output_buffer_size

### Skipped Metrics (28 total - realtimeSafe: false)
- **Voice Activity**: is_active, activity_ratio, segment_duration_ms
- **Quality Metrics**: signal_to_noise_ratio, noise_floor_dbfs, clipping_ratio
- **Frequency Analysis**: spectral_centroid, spectral_rolloff, spectral_flux

## Action Plan

### Phase 1: Immediate Stabilization (NOW)
1. Apply logging fix to stop server hangs
2. Restart STTTSserver process
3. Verify metrics collection continues
4. Make test call to confirm stability

### Phase 2: Enable Missing Metrics (Next)
1. Review 28 skipped metrics for lightweight implementations
2. Gradually enable critical metrics with performance testing
3. Monitor server performance after each addition

### Phase 3: Optimization (Future)
1. Implement metric sampling for expensive calculations
2. Add circuit breakers for metric collection
3. Optimize database write patterns
4. Consider metric aggregation at source

## Recovery Procedures

### After Server Hang
```bash
# 1. Restart the server
pm2 restart STTTTSserver

# 2. Check status
pm2 status

# 3. Verify database connectivity
psql -U monitoring_user -d monitoring_v2 -c "SELECT NOW();"

# 4. Make test call
# Call extension 3333 or 4444

# 5. Verify metrics
curl http://20.170.155.53:3020/api/traces/active
```

### Database Recovery
```bash
# Check for stuck transactions
psql -U monitoring_user -d monitoring_v2 -c "SELECT * FROM pg_stat_activity WHERE state = 'idle in transaction';"

# Force cleanup if needed
psql -U monitoring_user -d monitoring_v2 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND pid <> pg_backend_pid();"
```

## System Boundaries & Limits
- **Max Concurrent Calls**: 10
- **Metrics Queue**: 10,000 items max
- **Audio Buffer**: 5,000 segments max
- **Database Connections**: 10 (connection pool)
- **Data Retention**: 72 hours automatic cleanup
- **Memory Usage**: ~85MB average, 150MB peak
- **CPU Usage**: 3-5% average, 15% peak

## Important Notes
1. The system IS collecting data successfully for 54 metrics
2. The logging issue is a performance bottleneck, not a functional failure
3. Database has automatic trace creation preventing foreign key violations
4. Audio recording is working and files are being saved
5. AI Optimizer requires OpenAI API key and costs ~$65/day at full usage

## Next Steps Summary
1. **IMMEDIATE**: Fix logging issue (remove or limit console.log for skipped metrics)
2. **SHORT TERM**: Enable high-value metrics from the 28 skipped ones
3. **MEDIUM TERM**: Optimize metric collection for all 82 metrics
4. **LONG TERM**: Implement performance monitoring and auto-scaling

## Contact & Access
- **VM SSH**: azureuser@20.170.155.53
- **API Endpoint**: http://20.170.155.53:3020
- **Database**: monitoring_v2 on localhost:5432
- **Logs**: `/home/azureuser/.pm2/logs/`
- **PM2 Monitoring**: `pm2 monit`

---
Document Created: 2026-01-18
Purpose: Persistent knowledge base for monitoring system troubleshooting and maintenance
Status: System operational with known logging performance issue requiring fix