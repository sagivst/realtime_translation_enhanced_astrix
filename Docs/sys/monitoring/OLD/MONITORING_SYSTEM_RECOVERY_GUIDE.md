# Monitoring System Complete Recovery & Installation Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Critical Components](#critical-components)
3. [Backup Procedures](#backup-procedures)
4. [Complete Installation Guide](#complete-installation-guide)
5. [Emergency Recovery Procedures](#emergency-recovery-procedures)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Verification Procedures](#verification-procedures)

---

## System Overview

The monitoring system consists of multiple interconnected components that collect, process, store, and display real-time metrics from the translation system.

### Architecture Flow:
```
STTTTSserver (3333/4444 ports)
    ↓
continuous-full-monitoring.js (Collects 75 metrics + 113 knobs)
    ↓
monitoring-server.js (Port 3001 - Socket.IO)
    ↓ (emits both 'metrics-update' AND 'unified-metrics')
monitoring-to-database-bridge.js (Listens for 'unified-metrics')
    ↓
database-api-server.js (Port 8083 - Internal API)
    ↓
proxy-server-8080.js or simple-proxy-8080.js (Port 8080 - Public)
    ↓
database-records.html / database-records-enhanced.html (Web UI)
```

### Key Metrics:
- **75 System Metrics** per station
- **113 Configuration Knobs** per station
- **4 Active Stations**: STATION_3-3333, STATION_3-4444, STATION_4-3333, STATION_4-4444

---

## Critical Components

### 1. Core Monitoring Services

#### STTTTSserver
- **Location**: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/`
- **Main File**: `STTTTSserver.js`
- **Dashboard Port**: 3020
- **Dashboard URL**: `http://20.170.155.53:3020/dashboard.html`

#### Continuous Monitoring
- **Location**: `/home/azureuser/translation-app/`
- **File**: `continuous-full-monitoring.js`
- **Function**: Collects metrics every 3 seconds from all stations

#### Monitoring Server
- **Location**: `/home/azureuser/translation-app/`
- **File**: `monitoring-server.js`
- **Port**: 3001 (Socket.IO)
- **Critical Fix**: Must emit BOTH 'metrics-update' AND 'unified-metrics' events

#### Database Bridge
- **Location**: `/home/azureuser/translation-app/`
- **File**: `monitoring-to-database-bridge.js`
- **Function**: Bridges monitoring server to database API
- **Critical**: Listens for 'unified-metrics' events

#### Database API Server
- **Location**: `/home/azureuser/translation-app/`
- **File**: `database-api-server.js`
- **Port**: 8083 (Internal)
- **Endpoints**:
  - `/api/snapshots` - Monitoring data (last 100 records)
  - `/api/stations` - Station configurations
  - `/api/monitoring-data` - Full monitoring dataset

#### Proxy Server (Two Options)

**Option 1: Express with http-proxy-middleware**
- **File**: `proxy-server-8080.js`
- **Dependencies**: express, http-proxy-middleware
- **Port**: 8080

**Option 2: Simple HTTP Proxy (No Dependencies)**
- **File**: `simple-proxy-8080.js`
- **Dependencies**: None (uses Node.js built-ins)
- **Port**: 8080

### 2. Web Interfaces

#### Database Records Page
- **Files**:
  - `database-records.html` (16,905 bytes)
  - `database-records-enhanced.html` (16,905 bytes)
- **Access**: `http://20.170.155.53:8080/database-records.html`

### 3. Gateway Services
- **Location**: `/home/azureuser/translation-app/3333_4444__Operational/`
- **Files**: `gateway-3333.js`, `gateway-4444.js`
- **UDP Ports**: 6120, 6121, 6122, 6123

---

## Backup Procedures

### Full System Backup Script

Create `/home/azureuser/translation-app/backup-monitoring-system.sh`:

```bash
#!/bin/bash
# Monitoring System Backup Script
# Run this BEFORE any updates or changes

BACKUP_DIR="/home/azureuser/backups/monitoring-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Starting Monitoring System Backup..."

# 1. Backup all monitoring components
echo "→ Backing up monitoring components..."
cp -r /home/azureuser/translation-app/*.js "$BACKUP_DIR/"
cp -r /home/azureuser/translation-app/*.html "$BACKUP_DIR/"

# 2. Backup STTTTSserver
echo "→ Backing up STTTTSserver..."
mkdir -p "$BACKUP_DIR/STTTTSserver"
cp -r /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/* "$BACKUP_DIR/STTTTSserver/"

# 3. Backup station configs
echo "→ Backing up station configurations..."
mkdir -p "$BACKUP_DIR/station-configs"
cp -r /home/azureuser/translation-app/station-configs/* "$BACKUP_DIR/station-configs/" 2>/dev/null

# 4. Create process snapshot
echo "→ Creating process snapshot..."
ps aux | grep -E "node|monitoring|database|bridge|gateway" > "$BACKUP_DIR/running-processes.txt"

# 5. Backup critical files list
echo "→ Creating file inventory..."
ls -la /home/azureuser/translation-app/ > "$BACKUP_DIR/file-inventory.txt"

# 6. Save current git state
echo "→ Saving git state..."
cd /home/azureuser/translation-app
git status > "$BACKUP_DIR/git-status.txt"
git log -10 --oneline > "$BACKUP_DIR/git-log.txt"

# 7. Create restoration script
cat > "$BACKUP_DIR/restore.sh" << 'EOF'
#!/bin/bash
# Restoration script - Run from backup directory
echo "🔄 Restoring monitoring system from backup..."

# Stop all services first
pkill -f monitoring
pkill -f database
pkill -f bridge
sleep 3

# Restore files
cp *.js /home/azureuser/translation-app/
cp *.html /home/azureuser/translation-app/
cp -r STTTTSserver/* /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/

echo "✅ Files restored. Run startup script to restart services."
EOF

chmod +x "$BACKUP_DIR/restore.sh"

echo "✅ Backup completed: $BACKUP_DIR"
echo "📋 Backup contains:"
ls -la "$BACKUP_DIR"
```

---

## Complete Installation Guide

### Step 1: Initial Setup

```bash
# Create necessary directories
mkdir -p /home/azureuser/translation-app
mkdir -p /home/azureuser/translation-app/station-configs
mkdir -p /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver

# Install Node.js dependencies (if needed)
cd /home/azureuser/translation-app
npm install express cors socket.io http-proxy-middleware
```

### Step 2: Create Core Components

#### 2.1 Database API Server
Create `/home/azureuser/translation-app/database-api-server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 8083;

app.use(cors());
app.use(express.json());

// In-memory storage
let snapshots = [];
let stations = {};
const MAX_SNAPSHOTS = 100;

// Store monitoring data
app.post('/api/monitoring-data', (req, res) => {
    const data = req.body;

    // Add to snapshots
    snapshots.unshift(data);
    if (snapshots.length > MAX_SNAPSHOTS) {
        snapshots = snapshots.slice(0, MAX_SNAPSHOTS);
    }

    // Update station data
    const stationKey = `${data.station_id}_${data.extension}`;
    stations[stationKey] = data;

    res.json({ success: true, stored: true });
});

// Get snapshots
app.get('/api/snapshots', (req, res) => {
    res.json(snapshots);
});

// Get stations
app.get('/api/stations', (req, res) => {
    res.json(stations);
});

app.listen(PORT, '127.0.0.1', () => {
    console.log(`Database API server running on port ${PORT}`);
});
```

#### 2.2 Monitoring Server (WITH CRITICAL FIX)
Create `/home/azureuser/translation-app/monitoring-server.js`:

**CRITICAL**: Around line 152, after processing unified-metrics, ADD:

```javascript
socket.on('unified-metrics', (data) => {
    // ... existing processing code ...

    // Broadcast to dashboard clients
    io.emit('metrics-update', {
        station_id,
        extension,
        key,
        data: historyRecord
    });

    // CRITICAL FIX: Also re-emit unified-metrics for database bridge
    io.emit("unified-metrics", data);

    // ... rest of existing code ...
});
```

#### 2.3 Monitoring to Database Bridge
Create `/home/azureuser/translation-app/monitoring-to-database-bridge.js`:

```javascript
const io = require('socket.io-client');
const axios = require('axios').default;

// Connect to monitoring server
const monitoringSocket = io('http://localhost:3001');

// Database API endpoint
const DATABASE_API = 'http://localhost:8083';

let messageCount = 0;
let errorCount = 0;

console.log('[Bridge] Starting monitoring-to-database bridge...');

monitoringSocket.on('connect', () => {
    console.log('[Bridge] ✅ Connected to monitoring server');
});

// CRITICAL: Listen for unified-metrics events
monitoringSocket.on('unified-metrics', async (data) => {
    try {
        // Forward to database API
        const response = await axios.post(`${DATABASE_API}/api/monitoring-data`, {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            station_id: data.station_id,
            extension: data.extension,
            timestamp: data.timestamp || new Date().toISOString(),
            call_id: data.call_id || 'no-call',
            channel: data.extension,
            metrics: data.metrics || {},
            knobs: data.knobs || {},
            alerts: data.alerts || [],
            metadata: data.metadata || {}
        });

        messageCount++;

        if (messageCount % 10 === 0) {
            console.log(`[Bridge] Messages forwarded: ${messageCount}`);
        }

        // Log successful storage
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] ✅ Stored ${data.station_id}-${data.extension}: ${data.metric_count || 0} metrics, ${data.knob_count || 0} knobs`);

    } catch (error) {
        errorCount++;
        console.error('[Bridge] Error forwarding data:', error.message);
    }
});

monitoringSocket.on('disconnect', () => {
    console.log('[Bridge] ⚠️ Disconnected from monitoring server');
});

// Status report every minute
setInterval(() => {
    console.log(`[Bridge] Status - Messages: ${messageCount}, Errors: ${errorCount}`);
}, 60000);
```

#### 2.4 Simple Proxy Server (No Dependencies)
Create `/home/azureuser/translation-app/simple-proxy-8080.js`:

```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const API_PORT = 8083;

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);

  // Proxy API requests to port 8083
  if (req.url.startsWith('/api/')) {
    const options = {
      hostname: 'localhost',
      port: API_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers
    };

    const proxy = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxy.on('error', (err) => {
      console.error('Proxy error:', err);
      res.writeHead(500);
      res.end('Proxy error');
    });

    req.pipe(proxy);
    return;
  }

  // Serve database-records.html
  if (req.url === '/' || req.url === '/database-records.html') {
    const htmlPath = '/home/azureuser/translation-app/database-records.html';

    fs.readFile(htmlPath, (err, data) => {
      if (err) {
        console.error('Error reading HTML file:', err);
        res.writeHead(404);
        res.end('File not found');
        return;
      }

      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(data);
    });
    return;
  }

  // Default 404
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Simple proxy server running on port ${PORT}`);
  console.log(`Proxying /api/* → http://localhost:${API_PORT}/api/*`);
  console.log(`Serving database-records.html`);
});
```

### Step 3: Startup Script

Create `/home/azureuser/translation-app/start-monitoring-system.sh`:

```bash
#!/bin/bash
# Complete Monitoring System Startup Script

echo "🚀 Starting Monitoring System..."

# Function to check if process is running
check_process() {
    if pgrep -f "$1" > /dev/null; then
        echo "✅ $2 is already running"
        return 0
    else
        echo "❌ $2 is not running"
        return 1
    fi
}

# Function to start a service
start_service() {
    local cmd="$1"
    local name="$2"
    local log="$3"

    echo "→ Starting $name..."
    cd /home/azureuser/translation-app
    nohup $cmd > "$log" 2>&1 &
    sleep 2

    if pgrep -f "$cmd" > /dev/null; then
        echo "✅ $name started successfully"
    else
        echo "❌ Failed to start $name"
        echo "Check log: $log"
        return 1
    fi
}

# 1. Start STTTTSserver (if not running)
if ! check_process "STTTTSserver.js" "STTTTSserver"; then
    cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
    nohup node STTTTSserver.js > /tmp/STTTTSserver.log 2>&1 &
    echo "✅ STTTTSserver started"
fi

# 2. Start Database API Server
if ! check_process "database-api-server.js" "Database API"; then
    start_service "node database-api-server.js" "Database API" "/tmp/database-api.log"
fi

# 3. Start Monitoring Server
if ! check_process "monitoring-server.js" "Monitoring Server"; then
    start_service "node monitoring-server.js" "Monitoring Server" "/tmp/monitoring-server.log"
fi

# 4. Start Continuous Monitoring
if ! check_process "continuous-full-monitoring.js" "Continuous Monitoring"; then
    start_service "node continuous-full-monitoring.js" "Continuous Monitoring" "/tmp/continuous-monitoring.log"
fi

# 5. Wait for services to initialize
echo "→ Waiting for services to initialize..."
sleep 5

# 6. Start Monitoring Bridge
if ! check_process "monitoring-to-database-bridge.js" "Monitoring Bridge"; then
    start_service "node monitoring-to-database-bridge.js" "Monitoring Bridge" "/tmp/monitoring-bridge.log"
fi

# 7. Start Proxy Server
if ! check_process "simple-proxy-8080.js" "Proxy Server"; then
    if ! check_process "proxy-server-8080.js" "Proxy Server"; then
        start_service "node simple-proxy-8080.js" "Simple Proxy" "/tmp/proxy-8080.log"
    fi
fi

# 8. Start Gateways
echo "→ Starting Gateway services..."
cd /home/azureuser/translation-app/3333_4444__Operational

if ! check_process "gateway-3333.js" "Gateway 3333"; then
    nohup node gateway-3333.js > /tmp/gateway-3333.log 2>&1 &
    echo "✅ Gateway 3333 started"
fi

if ! check_process "gateway-4444.js" "Gateway 4444"; then
    nohup node gateway-4444.js > /tmp/gateway-4444.log 2>&1 &
    echo "✅ Gateway 4444 started"
fi

# 9. Verify all services
echo ""
echo "📊 Service Status Check:"
echo "========================"

services=(
    "STTTTSserver.js:STTTTSserver:3020"
    "database-api-server.js:Database API:8083"
    "monitoring-server.js:Monitoring Server:3001"
    "continuous-full-monitoring.js:Continuous Monitoring:none"
    "monitoring-to-database-bridge.js:Bridge:none"
    "simple-proxy-8080.js:Proxy:8080"
    "gateway-3333.js:Gateway-3333:6120"
    "gateway-4444.js:Gateway-4444:6122"
)

for service in "${services[@]}"; do
    IFS=':' read -r process name port <<< "$service"
    if pgrep -f "$process" > /dev/null; then
        if [ "$port" != "none" ]; then
            echo "✅ $name (Port $port)"
        else
            echo "✅ $name"
        fi
    else
        echo "❌ $name - NOT RUNNING"
    fi
done

# 10. Test endpoints
echo ""
echo "🔍 Testing Endpoints:"
echo "===================="

# Test dashboard
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3020/dashboard.html | grep -q "200"; then
    echo "✅ Dashboard: http://20.170.155.53:3020/dashboard.html"
else
    echo "❌ Dashboard not accessible"
fi

# Test database API
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/snapshots | grep -q "200"; then
    echo "✅ Database API: http://20.170.155.53:8080/api/snapshots"
else
    echo "❌ Database API not accessible"
fi

# Test database page
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/database-records.html | grep -q "200"; then
    echo "✅ Database Page: http://20.170.155.53:8080/database-records.html"
else
    echo "❌ Database page not accessible"
fi

echo ""
echo "✨ Monitoring System Startup Complete!"
echo ""
echo "📋 Access Points:"
echo "→ Main Dashboard: http://20.170.155.53:3020/dashboard.html"
echo "→ Database Records: http://20.170.155.53:8080/database-records.html"
echo "→ API Snapshots: http://20.170.155.53:8080/api/snapshots"
echo ""
echo "📊 Monitoring Status:"
tail -n 5 /tmp/monitoring-bridge.log 2>/dev/null | grep "Messages forwarded" || echo "Waiting for data..."
```

---

## Emergency Recovery Procedures

### Quick Recovery Script

Create `/home/azureuser/translation-app/emergency-recovery.sh`:

```bash
#!/bin/bash
# Emergency Recovery - Use when system is completely down

echo "🚨 EMERGENCY RECOVERY INITIATED"

# 1. Kill all Node processes
echo "→ Stopping all Node processes..."
pkill -9 node
sleep 3

# 2. Clear potentially corrupted logs
echo "→ Clearing logs..."
rm -f /tmp/*.log

# 3. Restart core services only
echo "→ Starting STTTTSserver..."
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
nohup node STTTTSserver.js > /tmp/STTTTSserver.log 2>&1 &
sleep 5

# 4. Start monitoring chain
echo "→ Starting monitoring services..."
cd /home/azureuser/translation-app

# Database API first
nohup node database-api-server.js > /tmp/database-api.log 2>&1 &
sleep 2

# Monitoring server
nohup node monitoring-server.js > /tmp/monitoring-server.log 2>&1 &
sleep 2

# Continuous monitoring
nohup node continuous-full-monitoring.js > /tmp/continuous-monitoring.log 2>&1 &
sleep 3

# Bridge
nohup node monitoring-to-database-bridge.js > /tmp/monitoring-bridge.log 2>&1 &
sleep 2

# Proxy
nohup node simple-proxy-8080.js > /tmp/proxy-8080.log 2>&1 &

echo "→ Waiting for services to stabilize..."
sleep 5

# 5. Verify critical services
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3020/dashboard.html | grep -q "200"; then
    echo "✅ Dashboard is accessible"
else
    echo "❌ Dashboard failed to start - check /tmp/STTTTSserver.log"
fi

if curl -s http://localhost:8080/api/snapshots | grep -q "station_id"; then
    echo "✅ Monitoring data is flowing"
else
    echo "❌ No monitoring data - check /tmp/monitoring-bridge.log"
fi

echo ""
echo "🔄 Recovery complete. Check service status:"
ps aux | grep node | grep -v grep | wc -l
echo "Node processes running"
```

### GitHub Recovery

If local files are corrupted, restore from GitHub:

```bash
#!/bin/bash
# Restore from GitHub backup

GITHUB_REPO="https://raw.githubusercontent.com/sagivst/realtime_translation_enhanced_astrix/Working_3333_4444_Full_Cycle_Monitoring_Knobs_in"

echo "📥 Downloading from GitHub..."

# Download critical files
wget -O /home/azureuser/translation-app/database-records.html \
  "$GITHUB_REPO/database-records.html"

wget -O /home/azureuser/translation-app/database-records-enhanced.html \
  "$GITHUB_REPO/database-records-enhanced.html"

# Verify file sizes
ls -la /home/azureuser/translation-app/*.html

echo "✅ Files restored from GitHub"
```

---

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. No Data in Database
**Symptom**: `/api/snapshots` returns empty or old data

**Check**:
```bash
# Check if bridge is forwarding data
tail -f /tmp/monitoring-bridge.log | grep "Messages forwarded"
```

**Solution**:
```bash
# The monitoring-server.js MUST emit both events:
# Edit monitoring-server.js and ensure after io.emit('metrics-update', ...)
# Add: io.emit('unified-metrics', data);

# Then restart monitoring-server
pkill -f monitoring-server
cd /home/azureuser/translation-app
nohup node monitoring-server.js > /tmp/monitoring-server.log 2>&1 &
```

#### 2. Dashboard Not Loading
**Symptom**: http://20.170.155.53:3020/dashboard.html not accessible

**Check**:
```bash
ps aux | grep STTTTSserver
netstat -tlnp | grep 3020
```

**Solution**:
```bash
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
pkill -f STTTTSserver
nohup node STTTTSserver.js > /tmp/STTTTSserver.log 2>&1 &
```

#### 3. Bridge Shows "Messages forwarded: 0"
**Symptom**: Bridge is running but not forwarding data

**Cause**: monitoring-server.js not emitting 'unified-metrics'

**Solution**: See Issue #1 - Add unified-metrics emission

#### 4. Audio Controllers Not Working
**Symptom**: Volume sliders on dashboard don't control audio

**Check**: Gain nodes initialization in dashboard HTML

**Solution**: Ensure gain nodes are set to `parseFloat(slider.value)` not `0.0`

---

## Verification Procedures

### Complete System Health Check

```bash
#!/bin/bash
# Full system health check

echo "🏥 SYSTEM HEALTH CHECK"
echo "====================="

# 1. Check processes
echo ""
echo "1️⃣ Process Check:"
processes=("STTTTSserver" "monitoring-server" "continuous-full" "database-api" "bridge" "proxy")
for proc in "${processes[@]}"; do
    if pgrep -f "$proc" > /dev/null; then
        pid=$(pgrep -f "$proc" | head -1)
        echo "✅ $proc (PID: $pid)"
    else
        echo "❌ $proc NOT RUNNING"
    fi
done

# 2. Check ports
echo ""
echo "2️⃣ Port Check:"
ports=("3020:Dashboard" "3001:Monitoring" "8083:Database-API" "8080:Proxy")
for portinfo in "${ports[@]}"; do
    IFS=':' read -r port name <<< "$portinfo"
    if netstat -tln | grep -q ":$port "; then
        echo "✅ Port $port ($name) - LISTENING"
    else
        echo "❌ Port $port ($name) - NOT LISTENING"
    fi
done

# 3. Check data flow
echo ""
echo "3️⃣ Data Flow Check:"
latest=$(curl -s http://localhost:8080/api/snapshots | python3 -c "
import sys, json, datetime
data = json.load(sys.stdin)
if data:
    latest = data[0]['timestamp']
    now = datetime.datetime.now(datetime.timezone.utc)
    then = datetime.datetime.fromisoformat(latest.replace('Z', '+00:00'))
    age = (now - then).total_seconds()
    print(f'Latest data: {age:.1f} seconds ago')
    if age < 30:
        print('✅ Data is fresh')
    else:
        print('⚠️ Data is stale')
else:
    print('❌ No data available')
" 2>/dev/null)
echo "$latest"

# 4. Check logs for errors
echo ""
echo "4️⃣ Error Check:"
for log in /tmp/*.log; do
    if [ -f "$log" ]; then
        errors=$(tail -100 "$log" 2>/dev/null | grep -i "error" | wc -l)
        if [ "$errors" -gt 0 ]; then
            echo "⚠️ $(basename $log): $errors errors in last 100 lines"
        fi
    fi
done

echo ""
echo "✅ Health check complete"
```

### Monitor Bridge Status

```bash
# Real-time bridge monitoring
watch -n 5 'tail -20 /tmp/monitoring-bridge.log | grep -E "Stored|Messages|Error"'
```

---

## Critical Configuration Files

### Required NPM Packages
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "socket.io": "^4.5.0",
    "socket.io-client": "^4.5.0",
    "axios": "^1.4.0",
    "http-proxy-middleware": "^2.0.6"
  }
}
```

### Service Dependencies
```
STTTTSserver → (standalone)
continuous-monitoring → monitoring-server
monitoring-server → (standalone)
monitoring-bridge → monitoring-server + database-api
database-api → (standalone)
proxy-server → database-api
```

---

## Maintenance Commands

### View Real-time Logs
```bash
# Monitor all services
tail -f /tmp/*.log

# Monitor specific service
tail -f /tmp/monitoring-bridge.log

# Check for errors
grep -i error /tmp/*.log
```

### Restart Individual Services
```bash
# Restart monitoring server only
pkill -f monitoring-server
cd /home/azureuser/translation-app
nohup node monitoring-server.js > /tmp/monitoring-server.log 2>&1 &

# Restart bridge only
pkill -f monitoring-to-database-bridge
cd /home/azureuser/translation-app
nohup node monitoring-to-database-bridge.js > /tmp/monitoring-bridge.log 2>&1 &
```

### Clear Old Data
```bash
# Clear logs
rm -f /tmp/*.log

# Restart database to clear memory
pkill -f database-api-server
cd /home/azureuser/translation-app
nohup node database-api-server.js > /tmp/database-api.log 2>&1 &
```

---

## CRITICAL NOTES

1. **NEVER modify STTTTSserver.js directly** - It's the core system
2. **monitoring-server.js MUST emit both 'metrics-update' AND 'unified-metrics'**
3. **Bridge listens for 'unified-metrics' NOT 'metrics-update'**
4. **Database keeps only last 100 records by design**
5. **All services must start in correct order (see startup script)**
6. **Proxy server makes database accessible on port 8080**

---

## Support Information

- Main Dashboard: `http://20.170.155.53:3020/dashboard.html`
- Database Records: `http://20.170.155.53:8080/database-records.html`
- API Endpoint: `http://20.170.155.53:8080/api/snapshots`
- GitHub Backup: `https://github.com/sagivst/realtime_translation_enhanced_astrix/tree/Working_3333_4444_Full_Cycle_Monitoring_Knobs_in`

---

Last Updated: December 3, 2024
System Version: 3333_4444_Full_Cycle_Monitoring_Knobs