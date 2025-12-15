const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, spawn } = require('child_process');
const net = require('net');

const app = express();
const PORT = 8083;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// In-memory storage for snapshots
let snapshots = [];
let stations = {};

// ============================================
// COMPONENT CONFIGURATION (From Plan Section 5.3)
// ============================================
const componentConfig = {
  'sttttserver': {
    name: 'STTTTSserver',
    startCmd: 'pm2 start STTTTSserver',
    stopCmd: 'pm2 stop STTTTSserver',
    checkPort: 8080,
    checkProcess: 'STTTTSserver.js',
    layer: 'core',
    critical: true
  },
  'ari-gstreamer': {
    name: 'ari-gstreamer-operational',
    startCmd: 'pm2 start ari-gstreamer',
    stopCmd: 'pm2 stop ari-gstreamer',
    checkProcess: 'ari-gstreamer-operational.js',
    layer: 'core',
    critical: true
  },
  'monitoring-server': {
    name: 'monitoring-server',
    startCmd: 'pm2 start monitoring-server',
    stopCmd: 'pm2 stop monitoring-server',
    checkPort: 3001,
    checkProcess: 'monitoring-server.js',
    layer: 'monitoring',
    critical: true
  },
  'database-api-server': {
    name: 'database-api-server',
    startCmd: 'cd /home/azureuser/translation-app && nohup node database-api-server.js > /tmp/database-api.log 2>&1 &',
    stopCmd: 'pkill -f "node.*database-api-server.js"',
    checkPort: 8083,
    checkProcess: 'database-api-server.js',
    layer: 'monitoring',
    critical: true
  },
  'monitoring-bridge': {
    name: 'monitoring-to-database-bridge',
    startCmd: 'pm2 start monitoring-bridge',
    stopCmd: 'pm2 stop monitoring-bridge',
    checkProcess: 'monitoring-to-database-bridge.js',
    layer: 'monitoring',
    critical: false
  },
  'continuous-full-monitoring': {
    name: 'continuous-full-monitoring',
    startCmd: 'cd /home/azureuser/translation-app && nohup node continuous-full-monitoring-with-station3.js > /tmp/continuous-monitoring.log 2>&1 &',
    stopCmd: 'pkill -f "node.*continuous-full-monitoring"',
    checkProcess: 'continuous-full-monitoring-with-station3.js',
    layer: 'monitoring',
    critical: false
  },
  'cloudflared': {
    name: 'cloudflared',
    startCmd: 'cd /home/azureuser && nohup ./cloudflared-linux-amd64 tunnel --url http://localhost:8083 > /tmp/cloudflared.log 2>&1 &',
    stopCmd: 'pkill -f cloudflared',
    checkProcess: 'cloudflared',
    layer: 'monitoring',
    critical: false
  },
  'gateway-3333': {
    name: 'gateway-3333',
    startCmd: 'pm2 start gateway-3333',
    stopCmd: 'pm2 stop gateway-3333',
    checkPort: 7777,
    checkProcess: 'gateway-3333.js',
    layer: 'gateways',
    critical: true
  },
  'gateway-4444': {
    name: 'gateway-4444',
    startCmd: 'pm2 start gateway-4444',
    stopCmd: 'pm2 stop gateway-4444',
    checkPort: 8888,
    checkProcess: 'gateway-4444.js',
    layer: 'gateways',
    critical: true
  }
};

// Component status cache
const componentStatusCache = {};

// PM2 status cache to reduce exec calls
let pm2Cache = { data: null, timestamp: 0 };
const PM2_CACHE_TTL = 5000; // 5 seconds

// ============================================
// HELPER FUNCTIONS
// ============================================

// Check if a port is in use
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true)); // Port in use
    server.once('listening', () => {
      server.close();
      resolve(false); // Port available
    });
    server.listen(port, '127.0.0.1');
  });
}


// Get cached PM2 list
async function getCachedPM2List() {
  const now = Date.now();
  if (pm2Cache.data && (now - pm2Cache.timestamp) < PM2_CACHE_TTL) {
    return pm2Cache.data;
  }
  
  return new Promise((resolve) => {
    exec('pm2 jlist', (error, stdout) => {
      if (!error) {
        try {
          pm2Cache.data = JSON.parse(stdout);
          pm2Cache.timestamp = now;
          resolve(pm2Cache.data);
        } catch (e) {
          console.error('[PM2-Check] Failed to parse PM2 list:', e);
          resolve(null);
        }
      } else {
        console.error('[PM2-Check] Failed to get PM2 list:', error);
        resolve(null);
      }
    });
  });
}

// Get PM2 status for a specific component
async function getPM2Status(componentId) {
  const processes = await getCachedPM2List();
  if (!processes) return null;
  
  // Map component IDs to PM2 names
  const pm2NameMap = {
    'STTTTSserver': 'STTTTSserver',
    'ari-gstreamer': 'ari-gstreamer',
    'gateway-3333': 'gateway-3333',
    'gateway-4444': 'gateway-4444',
    'monitoring-server': 'monitoring-server',
    'monitoring-bridge': 'monitoring-bridge',
    'database-api-server': 'database-api-server'
  };
  
  const pm2Name = pm2NameMap[componentId];
  if (!pm2Name) return null;
  
  const process = processes.find(p => p.name === pm2Name);
  if (process) {
    return {
      status: process.pm2_env.status,
      pid: process.pid || 0,  // Return 0 when stopped
      restarts: process.pm2_env.restart_time,
      memory: process.monit?.memory,
      cpu: process.monit?.cpu,
      isOnline: process.pm2_env.status === 'online' && process.pid > 0  // Add clear online flag
    };
  }
  return null;
}

// Check if a process is running (REPLACED: now uses PM2 instead of pgrep)
function checkProcess(processName) {
  return new Promise(async (resolve) => {
    // First try PM2
    const processes = await getCachedPM2List();
    if (processes) {
      const process = processes.find(p => 
        p.pm2_env.pm_exec_path && 
        p.pm2_env.pm_exec_path.includes(processName)
      );
      
      if (process && process.pm2_env.status === 'online') {
        resolve({ running: true, pid: process.pid });
        return;
      }
    }
    
    // If not found in PM2 or PM2 failed, fall back to pgrep (for non-PM2 processes)
    exec(`pgrep -f "${processName}"`, (error, stdout) => {
      if (error || !stdout.trim()) {
        resolve({ running: false, pid: null });
      } else {
        const pids = stdout.trim().split('\n');
        resolve({ running: true, pid: pids[0], pids: pids });
      }
    });
  });
}

// Get component status with real detection
// Enhanced getComponentStatus with per-component metrics
async function getComponentStatus(componentId) {
  // Skip self-check to prevent database-api-server from killing itself
  if (componentId === "database-api-server") {
    return {
      status: "LIVE",
      message: "Self-check skipped",
      pid: process.pid,
      port: 8083,
      layer: "monitoring",
      critical: true,
      lastCheck: new Date().toISOString(),
      metrics: {
        memory_mb: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
        cpu_percent: 0,
        uptime_seconds: process.uptime()
      }
    };
  }

  const config = componentConfig[componentId];
  if (!config) {
    return { status: 'unknown', message: 'Component not configured' };
  }

  // Try PM2 status first (much faster, no new process spawning)
  const pm2Status = await getPM2Status(componentId);
  
  if (pm2Status) {
    // Got status from PM2 with enhanced metrics
    componentStatusCache[componentId] = {
      status: (pm2Status.status === "online" && pm2Status.pid > 0) ? "LIVE" : "DOWN",
      pid: pm2Status.pid || 0,
      port: config.checkPort || null,
      layer: config.layer,
      critical: config.critical,
      lastCheck: new Date().toISOString(),
      restarts: pm2Status.restarts,
      memory: pm2Status.memory,
      cpu: pm2Status.cpu,
      metrics: {
        memory_mb: pm2Status.memory ? Math.round(pm2Status.memory / (1024 * 1024)) : 0,
        cpu_percent: pm2Status.cpu || 0,
        uptime_seconds: 0 // Would need PM2 uptime data
      }
    };
  } else {
    // Fallback to process check if not in PM2
    const processCheck = await checkProcess(config.checkProcess);
    let portCheck = false;
    
    if (config.checkPort) {
      portCheck = await checkPort(config.checkPort);
    }
    
    const isLive = processCheck.running || portCheck;
    
    componentStatusCache[componentId] = {
      status: isLive ? 'LIVE' : 'DOWN',
      pid: processCheck.pid,
      port: config.checkPort || null,
      layer: config.layer,
      critical: config.critical,
      lastCheck: new Date().toISOString(),
      metrics: {
        memory_mb: 0,
        cpu_percent: 0,
        uptime_seconds: 0
      }
    };
  }

  return componentStatusCache[componentId];
}

// Execute command with promise
function execCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        reject({ error: error.message, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// ============================================
// EXISTING DATA ENDPOINTS
// ============================================

app.get('/api/snapshots', (req, res) => {
  console.log('GET /api/snapshots request received');
  const recentSnapshots = snapshots.slice(-100);
  res.json(recentSnapshots);
});

app.get('/api/stations', (req, res) => {
  console.log('GET /api/stations request received');
  res.json(stations);
});

app.post('/api/monitoring-data', (req, res) => {
  const data = req.body;
  if (!data.timestamp) {
    data.timestamp = new Date().toISOString();
  }
  snapshots.push(data);
  if (snapshots.length > 1000) {
    snapshots = snapshots.slice(-1000);
  }
  if (data.station_id) {
    stations[data.station_id] = {
      ...stations[data.station_id],
      ...data,
      lastUpdate: data.timestamp
    };
  }
  console.log('Stored monitoring data:', data.station_id || 'unknown');
  res.json({ success: true, message: 'Data received' });
});

// ============================================
// HEALTH MONITORING ENDPOINTS (From Plan Section 2.1)
// ============================================

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    snapshotCount: snapshots.length,
    stationCount: Object.keys(stations).length,
    timestamp: new Date().toISOString()
  });
});

// Overall system health (all components)
app.get('/api/health/system', async (req, res) => {
  const cpuUsage = os.loadavg();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  // Check all components
  const components = {};
  let liveCount = 0;
  let totalCount = 0;

  for (const componentId of Object.keys(componentConfig)) {
    const status = await getComponentStatus(componentId);
    components[componentId] = status;
    totalCount++;
    if (status.status === 'LIVE') liveCount++;
  }

  const overallStatus = liveCount === totalCount ? 'HEALTHY' : 
                        liveCount > totalCount / 2 ? 'DEGRADED' : 'CRITICAL';

  res.json({
    status: overallStatus,
    components_live: liveCount,
    components_total: totalCount,
    components: components,
    cpu: {
      loadAvg1min: cpuUsage[0],
      loadAvg5min: cpuUsage[1],
      loadAvg15min: cpuUsage[2],
      cores: os.cpus().length
    },
    memory: {
      total_mb: Math.round(totalMem / 1024 / 1024),
      used_mb: Math.round(usedMem / 1024 / 1024),
      free_mb: Math.round(freeMem / 1024 / 1024),
      usage_percent: Math.round((usedMem / totalMem) * 100)
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

// Core services health (STTTTSserver, ari-gstreamer)
app.get('/api/health/core', async (req, res) => {
  const coreComponents = ['sttttserver', 'ari-gstreamer'];
  const statuses = {};
  let liveCount = 0;

  for (const componentId of coreComponents) {
    statuses[componentId] = await getComponentStatus(componentId);
    if (statuses[componentId].status === 'LIVE') liveCount++;
  }

  res.json({
    status: liveCount === coreComponents.length ? 'HEALTHY' : 'DEGRADED',
    layer: 'core',
    components_live: liveCount,
    components_total: coreComponents.length,
    components: statuses,
    timestamp: new Date().toISOString()
  });
});

// Monitoring layer health
app.get('/api/health/monitoring', async (req, res) => {
  const monitoringComponents = ['monitoring-server', 'database-api-server', 'monitoring-bridge', 'continuous-full-monitoring', 'cloudflared'];
  const statuses = {};
  let liveCount = 0;

  for (const componentId of monitoringComponents) {
    statuses[componentId] = await getComponentStatus(componentId);
    if (statuses[componentId].status === 'LIVE') liveCount++;
  }

  res.json({
    status: liveCount === monitoringComponents.length ? 'HEALTHY' : 'DEGRADED',
    layer: 'monitoring',
    components_live: liveCount,
    components_total: monitoringComponents.length,
    components: statuses,
    timestamp: new Date().toISOString()
  });
});

// Gateway layer health
app.get('/api/health/gateways', async (req, res) => {
  const gatewayComponents = ['gateway-3333', 'gateway-4444'];
  const statuses = {};
  let liveCount = 0;

  for (const componentId of gatewayComponents) {
    statuses[componentId] = await getComponentStatus(componentId);
    if (statuses[componentId].status === 'LIVE') liveCount++;
  }

  res.json({
    status: liveCount === gatewayComponents.length ? 'HEALTHY' : 'DEGRADED',
    layer: 'gateways',
    components_live: liveCount,
    components_total: gatewayComponents.length,
    components: statuses,
    timestamp: new Date().toISOString()
  });
});

// Individual component health (From Plan Section 2.1.1)
app.get('/api/health/component/:name', async (req, res) => {
  const componentName = req.params.name.toLowerCase();
  const config = componentConfig[componentName];

  if (!config) {
    return res.status(404).json({
      success: false,
      error: 'Component not found',
      available_components: Object.keys(componentConfig)
    });
  }

  const status = await getComponentStatus(componentName);
  const processInfo = await checkProcess(config.checkProcess);

  res.json({
    component: componentName,
    display_name: config.name,
    status: status.status,
    uptime: status.status === 'LIVE' ? 'unknown' : 0,
    lastCheck: new Date().toISOString(),
    port: config.checkPort || null,
    pid: processInfo.pid,
    layer: config.layer,
    critical: config.critical,
    memory: status.status === 'LIVE' ? {
      heapUsed: 'checking',
      heapTotal: 'checking'
    } : null,
    details: {
      startCommand: config.startCmd.split('&&').pop().trim(),
      processPattern: config.checkProcess
    }
  });
});

// Get all station health
app.get('/api/health/stations', (req, res) => {
  const stationHealth = {};
  for (const [stationId, stationData] of Object.entries(stations)) {
    const lastUpdate = stationData.lastUpdate ? new Date(stationData.lastUpdate) : null;
    const now = new Date();
    const ageMs = lastUpdate ? now - lastUpdate : Infinity;
    stationHealth[stationId] = {
      status: ageMs < 30000 ? 'healthy' : ageMs < 60000 ? 'warning' : 'stale',
      last_update: stationData.lastUpdate,
      age_seconds: Math.round(ageMs / 1000),
      extension: stationData.extension,
      metrics_count: stationData.metric_count || 0
    };
  }
  res.json({
    status: Object.keys(stationHealth).length > 0 ? 'healthy' : 'no_stations',
    stations: stationHealth,
    total_stations: Object.keys(stationHealth).length,
    timestamp: new Date().toISOString()
  });
});

// Get health for specific station
app.get('/api/health/stations/:stationId', (req, res) => {
  const stationId = req.params.stationId.toUpperCase();
  const stationData = stations[stationId];
  if (!stationData) {
    return res.status(404).json({
      status: 'not_found',
      message: 'Station ' + stationId + ' not found',
      available_stations: Object.keys(stations)
    });
  }
  const lastUpdate = stationData.lastUpdate ? new Date(stationData.lastUpdate) : null;
  const ageMs = lastUpdate ? Date.now() - lastUpdate : Infinity;
  res.json({
    status: ageMs < 30000 ? 'healthy' : ageMs < 60000 ? 'warning' : 'stale',
    station_id: stationId,
    last_update: stationData.lastUpdate,
    age_seconds: Math.round(ageMs / 1000),
    extension: stationData.extension,
    metrics: stationData.metrics || {},
    timestamp: new Date().toISOString()
  });
});

// Get latest metrics
app.get('/api/health/metrics', (req, res) => {
  const latestByStation = {};
  for (let i = snapshots.length - 1; i >= 0 && Object.keys(latestByStation).length < 10; i--) {
    const snapshot = snapshots[i];
    const key = snapshot.station_id + '-' + snapshot.extension;
    if (!latestByStation[key]) {
      latestByStation[key] = snapshot;
    }
  }
  res.json({
    status: 'healthy',
    latest_metrics: Object.values(latestByStation),
    total_snapshots: snapshots.length,
    timestamp: new Date().toISOString()
  });
});

// Get metrics for specific station
app.get('/api/health/metrics/:stationId', (req, res) => {
  const stationId = req.params.stationId.toUpperCase();
  const stationSnapshots = snapshots.filter(s => s.station_id === stationId);
  if (stationSnapshots.length === 0) {
    return res.status(404).json({
      status: 'not_found',
      message: 'No metrics found for station ' + stationId
    });
  }
  const recentSnapshots = stationSnapshots.slice(-20);
  res.json({
    status: 'healthy',
    station_id: stationId,
    metrics: recentSnapshots,
    total_count: stationSnapshots.length,
    timestamp: new Date().toISOString()
  });
});

// Alerts endpoint
app.get('/api/health/alerts', (req, res) => {
  const alerts = [];
  for (const [stationId, stationData] of Object.entries(stations)) {
    if (stationData.lastUpdate) {
      const ageMs = Date.now() - new Date(stationData.lastUpdate);
      if (ageMs > 60000) {
        alerts.push({
          level: 'warning',
          type: 'stale_station',
          station_id: stationId,
          message: 'Station ' + stationId + ' has not reported in ' + Math.round(ageMs/1000) + ' seconds'
        });
      }
    }
  }
  const recentSnapshots = snapshots.slice(-50);
  for (const snapshot of recentSnapshots) {
    if (snapshot.alerts && Array.isArray(snapshot.alerts)) {
      for (const alert of snapshot.alerts) {
        alerts.push({
          ...alert,
          station_id: snapshot.station_id,
          timestamp: snapshot.timestamp
        });
      }
    }
  }
  res.json({
    status: alerts.length > 0 ? 'alerts_present' : 'healthy',
    alerts: alerts.slice(-50),
    alert_count: alerts.length,
    timestamp: new Date().toISOString()
  });
});

// Component status endpoint
app.get('/api/health/components', async (req, res) => {
  const statuses = {};
  for (const componentId of Object.keys(componentConfig)) {
    statuses[componentId] = await getComponentStatus(componentId);
  }
  res.json({
    status: 'healthy',
    components: statuses,
    timestamp: new Date().toISOString()
  });
});

// Full health summary
app.get('/api/health/summary', async (req, res) => {
  const stationCount = Object.keys(stations).length;
  const activeStations = Object.values(stations).filter(s => {
    if (!s.lastUpdate) return false;
    return Date.now() - new Date(s.lastUpdate) < 30000;
  }).length;

  // Check all components
  let liveComponents = 0;
  let totalComponents = Object.keys(componentConfig).length;
  for (const componentId of Object.keys(componentConfig)) {
    const status = await getComponentStatus(componentId);
    if (status.status === 'LIVE') liveComponents++;
  }

  const cpuUsage = os.loadavg();
  const memUsage = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);

  res.json({
    overall_status: liveComponents >= totalComponents - 1 ? 'HEALTHY' : 'DEGRADED',
    summary: {
      active_stations: activeStations,
      total_stations: stationCount,
      live_components: liveComponents,
      total_components: totalComponents,
      snapshots_stored: snapshots.length,
      uptime_seconds: Math.round(process.uptime()),
      cpu_load: cpuUsage[0],
      memory_usage_percent: memUsage
    },
    stations: Object.keys(stations),
    timestamp: new Date().toISOString()
  });
});

// ============================================
// PROCESS CONTROL ENDPOINTS (From Plan Section 2.2)
// ============================================

// Start a component
app.post('/api/control/start/:component', async (req, res) => {
  const componentName = req.params.component.toLowerCase();
  const config = componentConfig[componentName];

  if (!config) {
    return res.status(404).json({
      success: false,
      action: 'start',
      component: componentName,
      error: 'Component not found',
      available_components: Object.keys(componentConfig)
    });
  }

  // Check if already running
  const currentStatus = await getComponentStatus(componentName);
  if (currentStatus.status === 'LIVE') {
    return res.json({
      success: true,
      action: 'start',
      component: componentName,
      message: 'Component already running',
      pid: currentStatus.pid,
      timestamp: new Date().toISOString()
    });
  }

  try {
    await execCommand(config.startCmd);
    // Wait for process to start
    await new Promise(resolve => setTimeout(resolve, 4000));
    const newStatus = await getComponentStatus(componentName);

    res.json({
      success: newStatus.status === 'LIVE',
      action: 'start',
      component: componentName,
      message: newStatus.status === 'LIVE' ? 'Component started successfully' : 'Component may not have started',
      newPid: newStatus.pid,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      action: 'start',
      component: componentName,
      error: error.error || 'Failed to start component',
      details: error.stderr,
      timestamp: new Date().toISOString()
    });
  }
});

// Stop a component
app.post('/api/control/stop/:component', async (req, res) => {
  const componentName = req.params.component.toLowerCase();
  const config = componentConfig[componentName];

  if (!config) {
    return res.status(404).json({
      success: false,
      action: 'stop',
      component: componentName,
      error: 'Component not found',
      available_components: Object.keys(componentConfig)
    });
  }

  // Prevent stopping database-api-server (self)
  if (componentName === 'database-api-server') {
    return res.status(400).json({
      success: false,
      action: 'stop',
      component: componentName,
      error: 'Cannot stop self (database-api-server). Use system restart instead.',
      timestamp: new Date().toISOString()
    });
  }

  try {
    await execCommand(config.stopCmd);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newStatus = await getComponentStatus(componentName);

    res.json({
      success: newStatus.status === 'DOWN',
      action: 'stop',
      component: componentName,
      message: newStatus.status === 'DOWN' ? 'Component stopped successfully' : 'Component may still be running',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: true,
      action: 'stop',
      component: componentName,
      message: 'Stop command executed (process may have already been stopped)',
      timestamp: new Date().toISOString()
    });
  }
});

// Restart a component
app.post('/api/control/restart/:component', async (req, res) => {
  const componentName = req.params.component.toLowerCase();
  const config = componentConfig[componentName];

  if (!config) {
    return res.status(404).json({
      success: false,
      action: 'restart',
      component: componentName,
      error: 'Component not found',
      available_components: Object.keys(componentConfig)
    });
  }

  // Prevent restarting database-api-server (self)
  if (componentName === 'database-api-server') {
    return res.status(400).json({
      success: false,
      action: 'restart',
      component: componentName,
      error: 'Cannot restart self (database-api-server). Use system restart instead.',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Stop
    try {
      await execCommand(config.stopCmd);
    } catch (e) {
      // Ignore stop errors
    }
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Start
    await execCommand(config.startCmd);
    await new Promise(resolve => setTimeout(resolve, 4000));

    const newStatus = await getComponentStatus(componentName);

    res.json({
      success: newStatus.status === 'LIVE',
      action: 'restart',
      component: componentName,
      message: newStatus.status === 'LIVE' ? 'Component restarted successfully' : 'Component may not have restarted',
      newPid: newStatus.pid,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      action: 'restart',
      component: componentName,
      error: error.error || 'Failed to restart component',
      details: error.stderr,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// LAYER CONTROL ENDPOINTS (From Plan Section 2.2.3)
// ============================================

// Restart core layer
app.post('/api/control/restart/layer/core', async (req, res) => {
  const coreComponents = ['sttttserver', 'ari-gstreamer'];
  const results = {};

  for (const componentId of coreComponents) {
    const config = componentConfig[componentId];
    try {
      try { await execCommand(config.stopCmd); } catch (e) {}
      await new Promise(resolve => setTimeout(resolve, 1000));
      await execCommand(config.startCmd);
      await new Promise(resolve => setTimeout(resolve, 4000));
      const status = await getComponentStatus(componentId);
      results[componentId] = { success: status.status === 'LIVE', status: status.status };
    } catch (error) {
      results[componentId] = { success: false, error: error.message };
    }
  }

  res.json({
    success: Object.values(results).every(r => r.success),
    action: 'restart',
    layer: 'core',
    components: results,
    timestamp: new Date().toISOString()
  });
});

// Restart monitoring layer
app.post('/api/control/restart/layer/monitoring', async (req, res) => {
  const monitoringComponents = ['monitoring-server', 'monitoring-bridge', 'continuous-full-monitoring', 'cloudflared'];
  // Exclude database-api-server (self)
  const results = {};

  for (const componentId of monitoringComponents) {
    const config = componentConfig[componentId];
    try {
      try { await execCommand(config.stopCmd); } catch (e) {}
      await new Promise(resolve => setTimeout(resolve, 1000));
      await execCommand(config.startCmd);
      await new Promise(resolve => setTimeout(resolve, 4000));
      const status = await getComponentStatus(componentId);
      results[componentId] = { success: status.status === 'LIVE', status: status.status };
    } catch (error) {
      results[componentId] = { success: false, error: error.message };
    }
  }

  results['database-api-server'] = { success: true, status: 'LIVE', note: 'Skipped (self)' };

  res.json({
    success: true,
    action: 'restart',
    layer: 'monitoring',
    components: results,
    timestamp: new Date().toISOString()
  });
});

// Restart gateways layer
app.post('/api/control/restart/layer/gateways', async (req, res) => {
  const gatewayComponents = ['gateway-3333', 'gateway-4444'];
  const results = {};

  for (const componentId of gatewayComponents) {
    const config = componentConfig[componentId];
    try {
      try { await execCommand(config.stopCmd); } catch (e) {}
      await new Promise(resolve => setTimeout(resolve, 1000));
      await execCommand(config.startCmd);
      await new Promise(resolve => setTimeout(resolve, 4000));
      const status = await getComponentStatus(componentId);
      results[componentId] = { success: status.status === 'LIVE', status: status.status };
    } catch (error) {
      results[componentId] = { success: false, error: error.message };
    }
  }

  res.json({
    success: Object.values(results).every(r => r.success),
    action: 'restart',
    layer: 'gateways',
    components: results,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// SYSTEM CONTROL ENDPOINTS (From Plan Section 2.2.4)
// ============================================

// Get full system status
app.get('/api/control/status/system', async (req, res) => {
  const allStatuses = {};
  let liveCount = 0;
  let totalCount = Object.keys(componentConfig).length;

  for (const componentId of Object.keys(componentConfig)) {
    allStatuses[componentId] = await getComponentStatus(componentId);
    if (allStatuses[componentId].status === 'LIVE') liveCount++;
  }

  res.json({
    overall_status: liveCount === totalCount ? 'ALL_LIVE' : liveCount > 0 ? 'PARTIAL' : 'ALL_DOWN',
    live_count: liveCount,
    total_count: totalCount,
    components: allStatuses,
    timestamp: new Date().toISOString()
  });
});

// Start entire system (ordered by dependencies from Plan Section 3.2)
app.post('/api/control/start/system', async (req, res) => {
  const startOrder = [
    'monitoring-server',
    'database-api-server',
    'monitoring-bridge',
    'continuous-full-monitoring',
    'cloudflared',
    'ari-gstreamer',
    'sttttserver',
    'gateway-3333',
    'gateway-4444'
  ];

  const results = {};

  for (const componentId of startOrder) {
    if (componentId === 'database-api-server') {
      results[componentId] = { success: true, status: 'LIVE', note: 'Already running (self)' };
      continue;
    }

    const config = componentConfig[componentId];
    const currentStatus = await getComponentStatus(componentId);

    if (currentStatus.status === 'LIVE') {
      results[componentId] = { success: true, status: 'LIVE', note: 'Already running' };
      continue;
    }

    try {
      await execCommand(config.startCmd);
      await new Promise(resolve => setTimeout(resolve, 4000));
      const newStatus = await getComponentStatus(componentId);
      results[componentId] = { success: newStatus.status === 'LIVE', status: newStatus.status };
    } catch (error) {
      results[componentId] = { success: false, error: error.message };
    }
  }

  res.json({
    success: Object.values(results).filter(r => !r.note).every(r => r.success),
    action: 'start',
    scope: 'system',
    components: results,
    timestamp: new Date().toISOString()
  });
});

// Stop entire system (reverse order)
app.post('/api/control/stop/system', async (req, res) => {
  const stopOrder = [
    'gateway-4444',
    'gateway-3333',
    'sttttserver',
    'ari-gstreamer',
    'cloudflared',
    'continuous-full-monitoring',
    'monitoring-bridge',
    'monitoring-server'
    // database-api-server excluded (self)
  ];

  const results = {};

  for (const componentId of stopOrder) {
    const config = componentConfig[componentId];
    try {
      await execCommand(config.stopCmd);
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newStatus = await getComponentStatus(componentId);
      results[componentId] = { success: newStatus.status === 'DOWN', status: newStatus.status };
    } catch (error) {
      results[componentId] = { success: true, note: 'Stop command executed' };
    }
  }

  results['database-api-server'] = { success: true, status: 'LIVE', note: 'Skipped (self)' };

  res.json({
    success: true,
    action: 'stop',
    scope: 'system',
    components: results,
    warning: 'database-api-server was not stopped (use external restart if needed)',
    timestamp: new Date().toISOString()
  });
});

// Restart entire system
app.post('/api/control/restart/system', async (req, res) => {
  const restartOrder = [
    'monitoring-server',
    'monitoring-bridge',
    'continuous-full-monitoring',
    'cloudflared',
    'ari-gstreamer',
    'sttttserver',
    'gateway-3333',
    'gateway-4444'
  ];

  const results = {};

  for (const componentId of restartOrder) {
    const config = componentConfig[componentId];
    try {
      // Stop
      try { await execCommand(config.stopCmd); } catch (e) {}
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Start
      await execCommand(config.startCmd);
      await new Promise(resolve => setTimeout(resolve, 4000));
      const newStatus = await getComponentStatus(componentId);
      results[componentId] = { success: newStatus.status === 'LIVE', status: newStatus.status };
    } catch (error) {
      results[componentId] = { success: false, error: error.message };
    }
  }

  results['database-api-server'] = { success: true, status: 'LIVE', note: 'Skipped (self)' };

  res.json({
    success: Object.values(results).filter(r => !r.note).every(r => r.success),
    action: 'restart',
    scope: 'system',
    components: results,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// UTILITY ENDPOINTS
// ============================================

// List all available endpoints
app.get('/api/endpoints', (req, res) => {
  res.json({
    endpoints: {
      data: [
        'GET /api/snapshots - Get recent monitoring snapshots',
        'GET /api/stations - Get station data',
        'POST /api/monitoring-data - Submit monitoring data'
      ],
      health: [
        'GET /api/health - Basic health check',
        'GET /api/health/system - Full system health (all components)',
        'GET /api/health/core - Core services health',
        'GET /api/health/monitoring - Monitoring layer health',
        'GET /api/health/gateways - Gateway layer health',
        'GET /api/health/component/:name - Individual component health',
        'GET /api/health/stations - All stations health',
        'GET /api/health/stations/:stationId - Specific station health',
        'GET /api/health/metrics - Latest metrics by station',
        'GET /api/health/metrics/:stationId - Metrics for specific station',
        'GET /api/health/alerts - Active alerts',
        'GET /api/health/components - All component statuses',
        'GET /api/health/summary - Full health summary'
      ],
      control_individual: [
        'POST /api/control/start/:component - Start a component',
        'POST /api/control/stop/:component - Stop a component',
        'POST /api/control/restart/:component - Restart a component'
      ],
      control_layer: [
        'POST /api/control/restart/layer/core - Restart core layer',
        'POST /api/control/restart/layer/monitoring - Restart monitoring layer',
        'POST /api/control/restart/layer/gateways - Restart gateway layer'
      ],
      control_system: [
        'GET /api/control/status/system - Get full system status',
        'POST /api/control/start/system - Start entire system',
        'POST /api/control/stop/system - Stop entire system',
        'POST /api/control/restart/system - Restart entire system'
      ],
      utility: [
        'GET /api/endpoints - This endpoint list'
      ]
    },
    available_components: Object.keys(componentConfig),
    timestamp: new Date().toISOString()
  });
});

// ============================================
// SERVER STARTUP
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('=================================================================');
  console.log('  Database API Server - COMPLETE MONITORING API IMPLEMENTATION');
  console.log('  Based on: MODULS_MONITORING_API_PLAN.md');
  console.log('=================================================================');
  console.log('');
  console.log('Server running on port ' + PORT);
  console.log('');
  console.log('=== Data Endpoints ===');
  console.log('  GET  /api/snapshots');
  console.log('  GET  /api/stations');
  console.log('  POST /api/monitoring-data');
  console.log('');
  console.log('=== Health Endpoints ===');
  console.log('  GET  /api/health');
  console.log('  GET  /api/health/system');
  console.log('  GET  /api/health/core');
  console.log('  GET  /api/health/monitoring');
  console.log('  GET  /api/health/gateways');
  console.log('  GET  /api/health/component/:name');
  console.log('  GET  /api/health/stations');
  console.log('  GET  /api/health/stations/:stationId');
  console.log('  GET  /api/health/metrics');
  console.log('  GET  /api/health/metrics/:stationId');
  console.log('  GET  /api/health/alerts');
  console.log('  GET  /api/health/components');
  console.log('  GET  /api/health/summary');
  console.log('');
  console.log('=== Process Control - Individual ===');
  console.log('  POST /api/control/start/:component');
  console.log('  POST /api/control/stop/:component');
  console.log('  POST /api/control/restart/:component');
  console.log('');
  console.log('=== Process Control - Layer ===');
  console.log('  POST /api/control/restart/layer/core');
  console.log('  POST /api/control/restart/layer/monitoring');
  console.log('  POST /api/control/restart/layer/gateways');
  console.log('');
  console.log('=== Process Control - System ===');
  console.log('  GET  /api/control/status/system');
  console.log('  POST /api/control/start/system');
  console.log('  POST /api/control/stop/system');
  console.log('  POST /api/control/restart/system');
  console.log('');
  console.log('=== Utility ===');
  console.log('  GET  /api/endpoints');
  console.log('');
  console.log('Available components:', Object.keys(componentConfig).join(', '));
  console.log('');
  console.log('=================================================================');
});
