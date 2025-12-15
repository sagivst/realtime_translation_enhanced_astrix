# PM2 Migration Plan for Unstable Monitoring System

## Problem Summary
Your current monitoring system uses `nohup` for process management, causing:
- No automatic restart when services crash
- Manual recovery required for failures
- Process detection issues (false positives/negatives in health checks)
- Orphaned processes and resource leaks
- Unmanaged log accumulation

## Solution Overview
Migrate to PM2 process management for automatic recovery, centralized control, and enhanced monitoring.

## Implementation Plan

### Phase 1: PM2 Setup (30 minutes)
1. **Install PM2 on remote server**
   ```bash
   ssh azureuser@20.170.155.53
   npm install -g pm2
   pm2 install pm2-logrotate
   ```

2. **Create ecosystem.config.js** in `/home/azureuser/translation-app/`
   - Configuration for all 9 services with correct paths
   - Auto-restart settings and memory limits
   - Log rotation configuration

### Phase 2: Non-Critical Services Migration (1 hour)
Migrate services that can be restarted without affecting core operations:

1. **monitoring-to-database-bridge.js**
   ```bash
   pkill -f monitoring-to-database-bridge
   pm2 start ecosystem.config.js --only monitoring-bridge
   ```

2. **continuous-metrics-emitter.js** (if exists)
   ```bash
   pkill -f continuous-metrics-emitter
   pm2 start ecosystem.config.js --only metrics-emitter
   ```

### Phase 3: Monitoring Layer Migration (1 hour)
1. **database-api-server.js**
   - Backup current data: `curl http://localhost:8083/api/snapshots > /tmp/backup.json`
   - Stop old process: `pkill -f database-api-server`
   - Start with PM2: `pm2 start ecosystem.config.js --only database-api-server`

2. **monitoring-server.js**
   - Stop: `pkill -f monitoring-server`
   - Start: `pm2 start ecosystem.config.js --only monitoring-server`

### Phase 4: Gateway Services Migration (30 minutes)
1. **gateway-3333.js** and **gateway-4444.js**
   ```bash
   pkill -f gateway-3333
   pkill -f gateway-4444
   pm2 start ecosystem.config.js --only gateway-3333
   pm2 start ecosystem.config.js --only gateway-4444
   ```

### Phase 5: Core Services Migration (1 hour - Schedule Maintenance Window)
1. **ari-gstreamer-operational.js**
   ```bash
   pkill -f ari-gstreamer-operational
   pm2 start ecosystem.config.js --only ari-gstreamer
   ```

2. **STTTTSserver.js** (Most Critical - Do Last)
   ```bash
   pkill -f STTTTSserver
   pm2 start ecosystem.config.js --only sttttserver
   ```

3. **cloudflared**
   ```bash
   pkill -f cloudflared
   pm2 start ecosystem.config.js --only cloudflared
   ```

### Phase 6: Enhanced Health Monitoring (1 hour)

1. **Update database-api-server.js** with PM2 integration:
   - Add PM2 control module
   - Enhance `/api/health/system` endpoint with PM2 metrics
   - Add control endpoints: `/api/control/start/:component`, `/api/control/stop/:component`, `/api/control/restart/:component`

2. **New health endpoint will provide:**
   - Real-time CPU and memory usage per service
   - Restart count and uptime
   - PM2 process status
   - Automatic status updates

### Phase 7: Persistence and Testing (30 minutes)

1. **Make PM2 persistent across reboots:**
   ```bash
   pm2 save
   pm2 startup systemd -u azureuser --hp /home/azureuser
   ```

2. **Test auto-restart:**
   ```bash
   # Kill a process to test auto-restart
   pm2 stop gateway-3333
   # Should auto-restart within 10 seconds
   pm2 status
   ```

3. **Configure log rotation:**
   ```bash
   pm2 set pm2-logrotate:max_size 50M
   pm2 set pm2-logrotate:retain 7
   pm2 set pm2-logrotate:compress true
   ```

## Critical Files to Create/Modify

### 1. ecosystem.config.js (NEW)
Location: `/home/azureuser/translation-app/ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    // CORE SERVICES
    {
      name: "sttttserver",
      script: "./STTTTSserver.js",
      cwd: "/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver",
      instances: 1,
      autorestart: true,
      max_memory_restart: "500M",
      watch: false,
      max_restarts: 10,
      min_uptime: "10s",
      env: {
        NODE_ENV: "production",
        PORT: 3020,
        SOCKET_PORT: 6211
      },
      error_file: "/tmp/pm2-sttttserver-error.log",
      out_file: "/tmp/pm2-sttttserver-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true
    },
    {
      name: "ari-gstreamer",
      script: "./ari-gstreamer-operational.js",
      cwd: "/home/azureuser/translation-app/3333_4444__Operational",
      instances: 1,
      autorestart: true,
      max_memory_restart: "300M",
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },

    // MONITORING LAYER
    {
      name: "monitoring-server",
      script: "./monitoring-server.js",
      cwd: "/home/azureuser/translation-app",
      instances: 1,
      autorestart: true,
      max_memory_restart: "200M",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        DATABASE_API_PORT: 8080
      }
    },
    {
      name: "database-api-server",
      script: "./database-api-server.js",
      cwd: "/home/azureuser/translation-app",
      instances: 1,
      autorestart: true,
      max_memory_restart: "200M",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 8083
      }
    },
    {
      name: "monitoring-bridge",
      script: "./monitoring-to-database-bridge.js",
      cwd: "/home/azureuser/translation-app",
      instances: 1,
      autorestart: true,
      max_memory_restart: "150M",
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "metrics-emitter",
      script: "./continuous-metrics-emitter.js",
      cwd: "/home/azureuser/translation-app",
      instances: 1,
      autorestart: true,
      max_memory_restart: "150M",
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },

    // GATEWAY LAYER
    {
      name: "gateway-3333",
      script: "./gateway-3333.js",
      cwd: "/home/azureuser/translation-app/3333_4444__Operational",
      instances: 1,
      autorestart: true,
      max_memory_restart: "200M",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 7777,
        EXTENSION: "3333"
      }
    },
    {
      name: "gateway-4444",
      script: "./gateway-4444.js",
      cwd: "/home/azureuser/translation-app/3333_4444__Operational",
      instances: 1,
      autorestart: true,
      max_memory_restart: "200M",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 8888,
        EXTENSION: "4444"
      }
    },

    // INFRASTRUCTURE
    {
      name: "cloudflared",
      script: "/home/azureuser/cloudflared-linux-amd64",
      args: "tunnel --url http://localhost:8083",
      instances: 1,
      autorestart: true,
      watch: false,
      interpreter: "none",
      env: {
        TUNNEL_URL: "http://localhost:8083"
      }
    }
  ]
};
```

### 2. pm2-control.js (NEW)
Location: `/home/azureuser/translation-app/pm2-control.js`

```javascript
const pm2 = require('pm2');

function withPM2(callback) {
  pm2.connect(err => {
    if (err) {
      console.error("PM2 connection error:", err);
      return callback(err);
    }
    callback(null, pm2);
  });
}

function restartComponent(componentName, cb) {
  withPM2((err, pm2) => {
    if (err) return cb(err);
    pm2.restart(componentName, (err, proc) => {
      pm2.disconnect();
      cb(err, proc);
    });
  });
}

function stopComponent(componentName, cb) {
  withPM2((err, pm2) => {
    if (err) return cb(err);
    pm2.stop(componentName, (err, proc) => {
      pm2.disconnect();
      cb(err, proc);
    });
  });
}

function startComponent(componentName, cb) {
  withPM2((err, pm2) => {
    if (err) return cb(err);
    pm2.start(componentName, (err, proc) => {
      pm2.disconnect();
      cb(err, proc);
    });
  });
}

function listComponents(cb) {
  withPM2((err, pm2) => {
    if (err) return cb(err);
    pm2.list((err, processList) => {
      pm2.disconnect();
      cb(err, processList);
    });
  });
}

module.exports = {
  restartComponent,
  stopComponent,
  startComponent,
  listComponents
};
```

### 3. database-api-server.js modifications (MODIFY)
Add these endpoints to the existing file:

```javascript
const { restartComponent, stopComponent, startComponent, listComponents } = require('./pm2-control');

// Control endpoints
app.post('/api/control/restart/:component', async (req, res) => {
  const { component } = req.params;
  const validComponents = [
    'sttttserver', 'ari-gstreamer', 'monitoring-server',
    'database-api-server', 'monitoring-bridge', 'metrics-emitter',
    'gateway-3333', 'gateway-4444', 'cloudflared'
  ];

  if (!validComponents.includes(component)) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Invalid component name'
    });
  }

  restartComponent(component, (err, result) => {
    if (err) {
      return res.status(500).json({
        status: 'ERROR',
        action: 'restart',
        component,
        message: err.message
      });
    }

    res.json({
      status: 'OK',
      action: 'restart',
      component,
      message: 'Component restarted successfully'
    });
  });
});

// Enhanced health endpoint with PM2 metrics
app.get('/api/health/system', async (req, res) => {
  listComponents((err, processList) => {
    if (err) {
      return res.status(500).json({
        status: 'DOWN',
        error: 'PM2 not available'
      });
    }

    const components = {};
    let componentsLive = 0;

    processList.forEach(proc => {
      const status = proc.pm2_env.status === 'online' ? 'LIVE' : 'DOWN';
      if (status === 'LIVE') componentsLive++;

      components[proc.name] = {
        status,
        pid: proc.pid,
        pm2_id: proc.pm_id,
        port: proc.pm2_env.PORT || null,
        layer: detectLayerFromName(proc.name),
        critical: isCritical(proc.name),
        cpu_percent: proc.monit.cpu,
        memory_rss_mb: Math.round(proc.monit.memory / 1024 / 1024),
        uptime_seconds: (Date.now() - proc.pm2_env.pm_uptime) / 1000,
        restart_count: proc.pm2_env.restart_time,
        start_time: new Date(proc.pm2_env.pm_uptime).toISOString(),
        lastCheck: new Date().toISOString()
      };
    });

    const os = require('os');
    const load = os.loadavg();

    res.json({
      status: deriveGlobalStatus(components),
      components_live: componentsLive,
      components_total: Object.keys(components).length,
      components,
      cpu: {
        loadAvg1min: load[0],
        loadAvg5min: load[1],
        loadAvg15min: load[2],
        cores: os.cpus().length
      },
      memory: {
        total_mb: Math.round(os.totalmem() / 1024 / 1024),
        free_mb: Math.round(os.freemem() / 1024 / 1024),
        used_mb: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024),
        usage_percent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
      },
      uptime: {
        system_seconds: os.uptime(),
        process_seconds: process.uptime()
      },
      platform: os.platform(),
      hostname: os.hostname(),
      timestamp: new Date().toISOString()
    });
  });
});
```

### 4. emergency-rollback.sh (NEW)
Location: `/home/azureuser/translation-app/emergency-rollback.sh`

```bash
#!/bin/bash
# Emergency rollback script - restores nohup-based system

echo "⚠️  EMERGENCY ROLLBACK - Stopping PM2 and restoring nohup processes..."

# Stop all PM2 processes
pm2 kill

# Restart critical services with nohup
echo "Starting database-api-server..."
cd /home/azureuser/translation-app
nohup node database-api-server.js > /tmp/database-api.log 2>&1 &

echo "Starting monitoring-server..."
nohup node monitoring-server.js > /tmp/monitoring.log 2>&1 &

echo "Starting monitoring-bridge..."
nohup node monitoring-to-database-bridge.js > /tmp/bridge.log 2>&1 &

echo "Starting gateways..."
cd /home/azureuser/translation-app/3333_4444__Operational
nohup node gateway-3333.js > /tmp/gateway-3333.log 2>&1 &
nohup node gateway-4444.js > /tmp/gateway-4444.log 2>&1 &

echo "Starting ari-gstreamer..."
nohup node ari-gstreamer-operational.js > /tmp/ari-gstreamer.log 2>&1 &

echo "Starting STTTTSserver..."
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
nohup node STTTTSserver.js > /tmp/STTTTSserver.log 2>&1 &

echo "Starting cloudflared..."
cd /home/azureuser
nohup ./cloudflared-linux-amd64 tunnel --url http://localhost:8083 > /tmp/cloudflared.log 2>&1 &

echo "✅ Rollback complete. Services running with nohup."
ps aux | grep node | grep -v grep
```

## Benefits After Migration

1. **Automatic Recovery**: Services restart automatically on crash
2. **Centralized Management**: Single command to view all services: `pm2 status`
3. **Better Monitoring**: Real-time CPU/memory metrics: `pm2 monit`
4. **Log Management**: Automatic log rotation prevents disk space issues
5. **Accurate Health Checks**: PM2 provides actual process state, not grep-based detection
6. **Controlled Restarts**: API endpoints to restart services remotely
7. **Startup Persistence**: Services start automatically after system reboot

## Testing Checklist

- [ ] All 9 services show "online" in `pm2 status`
- [ ] Health endpoint returns PM2 metrics: `curl http://localhost:8083/api/health/system`
- [ ] Auto-restart works: Kill a process, verify it restarts
- [ ] Control API works: `curl -X POST http://localhost:8083/api/control/restart/monitoring-bridge`
- [ ] Logs rotating: Check `pm2 logs` shows recent entries only
- [ ] Survives reboot: Restart server, verify all services start

## Timeline
- **Total Time**: ~5 hours
- **Recommended**: Execute over 2 days
  - Day 1: Phases 1-4 (non-critical services)
  - Day 2: Phases 5-7 (core services during maintenance window)

## PM2 Command Reference

### Basic Commands
```bash
pm2 status              # View all processes
pm2 logs                # View all logs
pm2 logs [app-name]     # View specific app logs
pm2 monit               # Real-time monitoring
pm2 restart [app-name]  # Restart specific app
pm2 restart all         # Restart all apps
pm2 stop [app-name]     # Stop specific app
pm2 delete [app-name]   # Remove from PM2
```

### Advanced Commands
```bash
pm2 describe [app-name]  # Detailed info about app
pm2 save                 # Save current process list
pm2 resurrect            # Restore saved process list
pm2 update               # Update PM2
pm2 flush                # Clear all log files
```

## Troubleshooting Guide

### Issue: Service won't start
```bash
# Check logs for errors
pm2 logs [app-name] --lines 100

# Check if port is in use
netstat -tuln | grep [port-number]

# Try manual start to see errors
cd [app-directory]
node [app-script]
```

### Issue: High memory usage
```bash
# Check memory usage
pm2 status

# Restart with lower memory limit
pm2 delete [app-name]
pm2 start ecosystem.config.js --only [app-name]
```

### Issue: PM2 not responding
```bash
# Kill PM2 daemon
pm2 kill

# Start fresh
pm2 resurrect
```

## Next Steps
1. Review this plan with your team
2. Schedule maintenance window for core services
3. Prepare user notifications
4. Begin with Phase 1 (PM2 installation)
5. Execute migration following the phases above

---

*Document created: December 11, 2024*
*Last updated: December 11, 2024*