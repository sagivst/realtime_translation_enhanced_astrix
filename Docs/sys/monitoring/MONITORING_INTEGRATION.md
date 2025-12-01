# Monitoring Integration for 3333/4444 System

## Overview
Complete monitoring integration for the real-time translation system using extensions 3333/4444.

## STATION_3 Monitoring

### Connection Details
- **Monitoring Server**: Port 3001
- **Database Server**: Port 8083
- **Dashboard**: Ports 3020, 8080
- **Station ID**: STATION_3
- **Extensions**: 3333 (caller), 4444 (callee)

### Integration Components

#### 1. STTTTSserver Integration
```javascript
// monitoring-integration.js
const ioClient = require('socket.io-client');

const monitoringClient = ioClient('http://localhost:3001', {
  reconnection: true,
  reconnectionDelay: 1000
});

// Register STATION_3
monitoringClient.emit('register-station', {
  station_id: 'STATION_3',
  capabilities: {
    name: 'Voice Monitor/Enhancer (STTTTSserver)',
    type: 'voice',
    parameters: 22,
    extensions: ['3333', '4444'],
    critical: true,
    description: 'CRITICAL - Monitors and improves voice quality for Deepgram'
  }
});
```

#### 2. Metrics Collection (22 Parameters)

##### Audio Quality Metrics
1. **SNR (Signal-to-Noise Ratio)**: `snr_db` - Target: >20dB
2. **Noise Floor**: `noise_floor_db` - Target: <-60dB
3. **Audio Level**: `audio_level_dbfs` - Target: -20 to -3dBFS
4. **Voice Activity**: `voice_activity_ratio` - Target: >0.6
5. **Clipping Detection**: `clipping_detected` - Target: 0

##### Buffer Management Metrics
6. **Buffer Usage**: `buffer_usage_pct` - Target: 40-60%
7. **Buffer Underruns**: `buffer_underruns` - Target: 0
8. **Jitter Buffer Size**: `jitter_buffer_size_ms` - Target: 50-100ms

##### System Performance Metrics
9. **CPU Usage**: `cpu_usage_pct` - Target: <70%
10. **Memory Usage**: `memory_usage_mb` - Target: <500MB
11. **Processing Latency**: `processing_latency_ms` - Target: <50ms

##### Network Quality Metrics
12. **Jitter**: `jitter_ms` - Target: <30ms
13. **Packet Loss**: `packet_loss_pct` - Target: <1%
14. **Round Trip Time**: `rtt_ms` - Target: <150ms
15. **Available Bandwidth**: `bandwidth_kbps` - Target: >128kbps

##### WebRTC Metrics
16. **Packets Sent**: `packets_sent_total` - Monitoring only
17. **Packets Received**: `packets_received_total` - Monitoring only
18. **Bytes Sent**: `bytes_sent_total` - Monitoring only
19. **Bytes Received**: `bytes_received_total` - Monitoring only

##### Audio Enhancement Metrics
20. **Noise Suppression**: `noise_suppression_level` - 0-1 scale
21. **Echo Cancellation**: `echo_cancellation_active` - Boolean
22. **AGC Level**: `agc_level` - 0-1 scale

### Database Schema

```sql
CREATE TABLE station_snapshots (
    id SERIAL PRIMARY KEY,
    station_id VARCHAR(50),
    call_id VARCHAR(100),
    channel VARCHAR(20),
    snr_db FLOAT,
    noise_floor_db FLOAT,
    audio_level_dbfs FLOAT,
    voice_activity_ratio FLOAT,
    clipping_detected INTEGER,
    buffer_usage_pct FLOAT,
    buffer_underruns INTEGER,
    jitter_buffer_size_ms FLOAT,
    cpu_usage_pct FLOAT,
    memory_usage_mb FLOAT,
    processing_latency_ms FLOAT,
    jitter_ms FLOAT,
    packet_loss_pct FLOAT,
    rtt_ms FLOAT,
    bandwidth_kbps FLOAT,
    packets_sent_total BIGINT,
    packets_received_total BIGINT,
    bytes_sent_total BIGINT,
    bytes_received_total BIGINT,
    noise_suppression_level FLOAT,
    echo_cancellation_active BOOLEAN,
    agc_level FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Monitoring Flow

1. **Registration Phase**
   - STTTTSserver starts and loads monitoring-integration.js
   - Connects to monitoring server on port 3001
   - Registers as STATION_3 with capabilities

2. **Active Call Monitoring**
   - Collects metrics every 100ms during active calls
   - Sends metrics snapshots to monitoring server
   - Monitoring server stores in PostgreSQL database

3. **Real-time Dashboard**
   - Dashboard queries database every second
   - Displays live metrics for both channels (3333/4444)
   - Shows alerts for out-of-threshold values

### Knob System

The monitoring server can send configuration updates ("knobs") to adjust:
- AGC settings
- Noise suppression levels
- Buffer sizes
- Quality thresholds

Example knob application:
```javascript
monitoringClient.on('apply-knobs', (data) => {
  if (data.knobs['agc.enabled']) {
    // Apply AGC settings
    applyAGC(data.knobs['agc.target_level_dbfs']);
  }
});
```

## Deployment

### Azure VM Setup
- **VM IP**: 20.170.155.53
- **Monitoring Path**: `/home/azureuser/translation-app/`
- **Log Files**:
  - `/tmp/STTTTSserver-monitoring.log`
  - `/tmp/monitoring.log`
  - `/tmp/database.log`

### Service Status Check
```bash
# Check STTTTSserver with monitoring
ssh azureuser@20.170.155.53 "ps aux | grep STTTTSserver"

# Check monitoring server
ssh azureuser@20.170.155.53 "ps aux | grep monitoring-server"

# Check database server
ssh azureuser@20.170.155.53 "ps aux | grep database"
```

## Testing

### Send Test Metrics
```javascript
sendStation3Metrics('3333', 'test-call-123', {
  snr: 25,
  noiseFloor: -65,
  audioLevel: -18,
  voiceActivity: 0.7,
  clipping: 0,
  bufferUsage: 45,
  underruns: 0,
  jitterBuffer: 60,
  latency: 35,
  jitter: 12,
  packetLoss: 0.2
});
```

### Verify Database Storage
```sql
SELECT * FROM station_snapshots
WHERE station_id = 'STATION_3'
ORDER BY timestamp DESC
LIMIT 10;
```

## Troubleshooting

### Connection Issues
- Verify monitoring server is running on port 3001
- Check firewall rules allow connections
- Ensure Socket.IO client is installed: `npm install socket.io-client`

### Missing Metrics
- Check STTTTSserver console for monitoring connection logs
- Verify STATION_3 registration successful
- Check database server is running on port 8083

### Dashboard Not Updating
- Verify dashboard server running on ports 3020/8080
- Check database connectivity
- Review browser console for WebSocket errors