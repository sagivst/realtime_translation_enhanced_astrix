#!/usr/bin/env node
/**
 * Health Monitor API - LIVE/DOWN Status & Process Control
 * Port: 8084
 * Target: Dev VM (20.170.155.53) ONLY
 */

const express = require('express');
const { exec } = require('child_process');
const net = require('net');
const http = require('http');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 8084;
const startTime = Date.now();

// Component configuration
const componentConfig = {
  'sttttserver': {
    name: 'STTTTSserver.js',
    layer: 'core',
    startCmd: 'cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && nohup node STTTTSserver.js > /tmp/sttttserver-health.log 2>&1 &',
    stopCmd: "pkill -f 'node.*STTTTSserver.js'",
    checkPort: null,
    checkProcess: 'STTTTSserver.js',
    critical: true
  },
  'ari-gstreamer': {
    name: 'ari-gstreamer-operational.js',
    layer: 'core',
    startCmd: 'cd /home/azureuser/translation-app/3333_4444__Operational && nohup node ari-gstreamer-operational.js > /tmp/ari-health.log 2>&1 &',
    stopCmd: "pkill -f 'node.*ari-gstreamer-operational.js'",
    checkPort: null,
    checkProcess: 'ari-gstreamer-operational.js',
    critical: true
  },
  'monitoring-server': {
    name: 'monitoring-server.js',
    layer: 'monitoring',
    startCmd: 'cd /home/azureuser/translation-app && nohup node monitoring-server.js > /tmp/monitoring-server-health.log 2>&1 &',
    stopCmd: "pkill -f 'node.*monitoring-server.js'",
    checkPort: 3001,
    checkProcess: 'monitoring-server.js',
    critical: true
  },
  'database-api-server': {
    name: 'database-api-server.js',
    layer: 'monitoring',
    startCmd: 'cd /home/azureuser/translation-app && nohup node database-api-server.js > /tmp/database-api-health.log 2>&1 &',
    stopCmd: "pkill -f 'node.*database-api-server.js'",
    checkPort: 8083,
    checkProcess: 'database-api-server.js',
    critical: true
  },
  'monitoring-bridge': {
    name: 'monitoring-to-database-bridge.js',
    layer: 'monitoring',
    startCmd: 'cd /home/azureuser/translation-app && nohup node monitoring-to-database-bridge.js > /tmp/bridge-health.log 2>&1 &',
    stopCmd: "pkill -f 'node.*monitoring-to-database-bridge.js'",
    checkPort: null,
    checkProcess: 'monitoring-to-database-bridge.js',
    critical: false
  },
  'metrics-emitter': {
    name: 'continuous-metrics-emitter.js',
    layer: 'monitoring',
    startCmd: 'cd /home/azureuser/translation-app && nohup node continuous-metrics-emitter.js > /tmp/emitter-health.log 2>&1 &',
    stopCmd: "pkill -f 'node.*continuous-metrics-emitter.js'",
    checkPort: null,
    checkProcess: 'continuous-metrics-emitter.js',
    critical: false
  },
  'cloudflared': {
    name: 'cloudflared tunnel',
    layer: 'monitoring',
    startCmd: 'cd /home/azureuser && nohup ./cloudflared-linux-amd64 tunnel --url http://localhost:8083 > /tmp/cloudflared-health.log 2>&1 &',
    stopCmd: 'pkill -f cloudflared',
    checkPort: null,
    checkProcess: 'cloudflared',
    critical: false
  },
  'gateway-3333': {
    name: 'gateway-3333.js',
    layer: 'gateways',
    startCmd: 'cd /home/azureuser/translation-app/3333_4444__Operational && nohup node gateway-3333.js > /tmp/gateway-3333-health.log 2>&1 &',
    stopCmd: "pkill -f 'node.*gateway-3333.js'",
    checkPort: 7777,
    checkProcess: 'gateway-3333.js',
    critical: true
  },
  'gateway-4444': {
    name: 'gateway-4444.js',
    layer: 'gateways',
    startCmd: 'cd /home/azureuser/translation-app/3333_4444__Operational && nohup node gateway-4444.js > /tmp/gateway-4444-health.log 2>&1 &',
    stopCmd: "pkill -f 'node.*gateway-4444.js'",
    checkPort: 8888,
    checkProcess: 'gateway-4444.js',
    critical: true
  }
};

// Helper: Check if port is open
function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, 'localhost');
  });
}

// Helper: Check if process is running
function checkProcess(processName) {
  return new Promise((resolve) => {
    exec(`pgrep -f '${processName}'`, (error, stdout) => {
      if (error || !stdout.trim()) {
        resolve({ running: false, pid: null });
      } else {
        const pids = stdout.trim().split('\n');
        resolve({ running: true, pid: pids[0] });
      }
    });
  });
}

// Helper: Get process memory usage
function getProcessMemory(pid) {
  return new Promise((resolve) => {
    exec(`ps -o rss= -p ${pid} 2>/dev/null`, (error, stdout) => {
      if (error || !stdout.trim()) {
        resolve(0);
      } else {
        resolve(parseInt(stdout.trim()) / 1024); // Convert KB to MB
      }
    });
  });
}

// Get component health status
async function getComponentHealth(componentId) {
  const config = componentConfig[componentId];
  if (!config) return null;

  const processStatus = await checkProcess(config.checkProcess);
  let portStatus = null;
  
  if (config.checkPort) {
    portStatus = await checkPort(config.checkPort);
  }

  const isLive = processStatus.running && (config.checkPort ? portStatus : true);
  let memoryMB = 0;
  
  if (processStatus.pid) {
    memoryMB = await getProcessMemory(processStatus.pid);
  }

  return {
    component: componentId,
    name: config.name,
    layer: config.layer,
    status: isLive ? 'LIVE' : 'DOWN',
    pid: processStatus.pid,
    port: config.checkPort,
    portOpen: portStatus,
    critical: config.critical,
    memory: {
      rss_mb: memoryMB.toFixed(2)
    },
    lastCheck: new Date().toISOString()
  };
}

// ==================== HEALTH ENDPOINTS ====================

// GET /api/health/system - Full system status
app.get('/api/health/system', async (req, res) => {
  const results = {};
  let liveCount = 0;
  let totalCount = 0;

  for (const componentId of Object.keys(componentConfig)) {
    const health = await getComponentHealth(componentId);
    results[componentId] = health;
    totalCount++;
    if (health.status === 'LIVE') liveCount++;
  }

  const systemStatus = liveCount === totalCount ? 'HEALTHY' : 
                       liveCount > totalCount / 2 ? 'DEGRADED' : 'CRITICAL';

  res.json({
    system_status: systemStatus,
    components_live: liveCount,
    components_total: totalCount,
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    components: results
  });
});

// GET /api/health/core - Core services
app.get('/api/health/core', async (req, res) => {
  const results = {};
  for (const [id, config] of Object.entries(componentConfig)) {
    if (config.layer === 'core') {
      results[id] = await getComponentHealth(id);
    }
  }
  res.json({ layer: 'core', components: results, timestamp: new Date().toISOString() });
});

// GET /api/health/monitoring - Monitoring layer
app.get('/api/health/monitoring', async (req, res) => {
  const results = {};
  for (const [id, config] of Object.entries(componentConfig)) {
    if (config.layer === 'monitoring') {
      results[id] = await getComponentHealth(id);
    }
  }
  res.json({ layer: 'monitoring', components: results, timestamp: new Date().toISOString() });
});

// GET /api/health/gateways - Gateway layer
app.get('/api/health/gateways', async (req, res) => {
  const results = {};
  for (const [id, config] of Object.entries(componentConfig)) {
    if (config.layer === 'gateways') {
      results[id] = await getComponentHealth(id);
    }
  }
  res.json({ layer: 'gateways', components: results, timestamp: new Date().toISOString() });
});

// GET /api/health/component/:name - Individual component
app.get('/api/health/component/:name', async (req, res) => {
  const componentId = req.params.name;
  const health = await getComponentHealth(componentId);
  
  if (!health) {
    return res.status(404).json({ error: 'Component not found', component: componentId });
  }
  
  res.json(health);
});

// ==================== PROCESS CONTROL ENDPOINTS ====================

// Helper: Execute command with timeout
function execWithTimeout(cmd, timeout = 10000) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

// POST /api/control/start/:component
app.post('/api/control/start/:component', async (req, res) => {
  const componentId = req.params.component;
  const config = componentConfig[componentId];
  
  if (!config) {
    return res.status(404).json({ success: false, error: 'Component not found' });
  }

  try {
    // Check if already running
    const status = await checkProcess(config.checkProcess);
    if (status.running) {
      return res.json({
        success: true,
        action: 'start',
        component: componentId,
        message: 'Component already running',
        pid: status.pid,
        timestamp: new Date().toISOString()
      });
    }

    // Start the component
    await execWithTimeout(config.startCmd);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for startup

    const newStatus = await checkProcess(config.checkProcess);
    
    res.json({
      success: newStatus.running,
      action: 'start',
      component: componentId,
      message: newStatus.running ? 'Component started successfully' : 'Failed to start',
      newPid: newStatus.pid,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      action: 'start',
      component: componentId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/control/stop/:component
app.post('/api/control/stop/:component', async (req, res) => {
  const componentId = req.params.component;
  const config = componentConfig[componentId];
  
  if (!config) {
    return res.status(404).json({ success: false, error: 'Component not found' });
  }

  try {
    const beforeStatus = await checkProcess(config.checkProcess);
    if (!beforeStatus.running) {
      return res.json({
        success: true,
        action: 'stop',
        component: componentId,
        message: 'Component was not running',
        timestamp: new Date().toISOString()
      });
    }

    await execWithTimeout(config.stopCmd);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const afterStatus = await checkProcess(config.checkProcess);
    
    res.json({
      success: !afterStatus.running,
      action: 'stop',
      component: componentId,
      message: !afterStatus.running ? 'Component stopped successfully' : 'Failed to stop',
      previousPid: beforeStatus.pid,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      action: 'stop',
      component: componentId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/control/restart/:component
app.post('/api/control/restart/:component', async (req, res) => {
  const componentId = req.params.component;
  const config = componentConfig[componentId];
  
  if (!config) {
    return res.status(404).json({ success: false, error: 'Component not found' });
  }

  try {
    const beforeStatus = await checkProcess(config.checkProcess);
    
    // Stop if running
    if (beforeStatus.running) {
      await execWithTimeout(config.stopCmd);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Start
    await execWithTimeout(config.startCmd);
    await new Promise(resolve => setTimeout(resolve, 3000));

    const afterStatus = await checkProcess(config.checkProcess);
    
    res.json({
      success: afterStatus.running,
      action: 'restart',
      component: componentId,
      message: afterStatus.running ? 'Component restarted successfully' : 'Failed to restart',
      previousPid: beforeStatus.pid,
      newPid: afterStatus.pid,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      action: 'restart',
      component: componentId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/control/restart/layer/:layer
app.post('/api/control/restart/layer/:layer', async (req, res) => {
  const layer = req.params.layer;
  const validLayers = ['core', 'monitoring', 'gateways'];
  
  if (!validLayers.includes(layer)) {
    return res.status(400).json({ success: false, error: 'Invalid layer. Use: core, monitoring, gateways' });
  }

  const results = [];
  const componentsInLayer = Object.entries(componentConfig)
    .filter(([_, config]) => config.layer === layer);

  for (const [componentId, config] of componentsInLayer) {
    try {
      const beforeStatus = await checkProcess(config.checkProcess);
      
      if (beforeStatus.running) {
        await execWithTimeout(config.stopCmd);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await execWithTimeout(config.startCmd);
      await new Promise(resolve => setTimeout(resolve, 2000));

      const afterStatus = await checkProcess(config.checkProcess);
      
      results.push({
        component: componentId,
        success: afterStatus.running,
        newPid: afterStatus.pid
      });
    } catch (error) {
      results.push({
        component: componentId,
        success: false,
        error: error.message
      });
    }
  }

  const allSuccess = results.every(r => r.success);
  
  res.json({
    success: allSuccess,
    action: 'restart-layer',
    layer: layer,
    results: results,
    timestamp: new Date().toISOString()
  });
});

// POST /api/control/restart/system
app.post('/api/control/restart/system', async (req, res) => {
  const restartOrder = [
    'monitoring-server',
    'database-api-server',
    'monitoring-bridge',
    'metrics-emitter',
    'cloudflared',
    'ari-gstreamer',
    'sttttserver',
    'gateway-3333',
    'gateway-4444'
  ];

  const results = [];

  // Stop all first (reverse order)
  for (const componentId of [...restartOrder].reverse()) {
    const config = componentConfig[componentId];
    try {
      await execWithTimeout(config.stopCmd);
    } catch (e) {}
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Start in order
  for (const componentId of restartOrder) {
    const config = componentConfig[componentId];
    try {
      await execWithTimeout(config.startCmd);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const status = await checkProcess(config.checkProcess);
      results.push({
        component: componentId,
        success: status.running,
        pid: status.pid
      });
    } catch (error) {
      results.push({
        component: componentId,
        success: false,
        error: error.message
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  
  res.json({
    success: successCount === restartOrder.length,
    action: 'restart-system',
    components_restarted: successCount,
    components_total: restartOrder.length,
    results: results,
    timestamp: new Date().toISOString()
  });
});

// GET /api/control/status/system - Alias for health/system
app.get('/api/control/status/system', async (req, res) => {
  res.redirect('/api/health/system');
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Health Monitor API',
    version: '1.0.0',
    port: PORT,
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    endpoints: {
      health: [
        'GET /api/health/system',
        'GET /api/health/core',
        'GET /api/health/monitoring',
        'GET /api/health/gateways',
        'GET /api/health/component/:name'
      ],
      control: [
        'POST /api/control/start/:component',
        'POST /api/control/stop/:component',
        'POST /api/control/restart/:component',
        'POST /api/control/restart/layer/:layer',
        'POST /api/control/restart/system'
      ]
    },
    components: Object.keys(componentConfig)
  });
});

// Start server
app.listen(PORT, () => {
  console.log('==========================================');
  console.log('  Health Monitor API v1.0.0');
  console.log('  Port: ' + PORT);
  console.log('  Components monitored: ' + Object.keys(componentConfig).length);
  console.log('==========================================');
  console.log('');
  console.log('Endpoints:');
  console.log('  GET  /api/health/system');
  console.log('  GET  /api/health/core');
  console.log('  GET  /api/health/monitoring');
  console.log('  GET  /api/health/gateways');
  console.log('  GET  /api/health/component/:name');
  console.log('  POST /api/control/start/:component');
  console.log('  POST /api/control/stop/:component');
  console.log('  POST /api/control/restart/:component');
  console.log('  POST /api/control/restart/layer/:layer');
  console.log('  POST /api/control/restart/system');
  console.log('');
  console.log('Ready!');
});
