const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const os = require('os');
// Import new checker modules
let checkers;
let metricsCollector;
try {
  checkers = require('/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring/component-checkers');
  console.log('[Database API] Component checkers loaded');
} catch (e) {
  console.log('[Database API] Component checkers not found, using basic checks only');
}
try {
  metricsCollector = require('/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring/metrics-collector');
  metricsCollector.start();
  console.log('[Database API] Metrics collector started');
} catch (e) {
  console.log('[Database API] Metrics collector not found, live metrics disabled');
}
const app = express();
app.use(cors());
app.use(express.json());
// Store monitoring snapshots in memory
const monitoringSnapshots = [];
const maxSnapshots = 1000;
// Enhanced monitored components list
const monitoredComponents = [
  // === EXISTING COMPONENTS ===
  {
    id: "monitoring-server",
    name: "monitoring-server.js",
    pm2Name: "monitoring-server",
    port: 8090,
    layer: "monitoring",
    critical: true,
    message: "monitoring-server.js - The optimisation engine"
  },
  {
    id: "database-api-server",
    name: "database-api-server.js",
    pm2Name: "database-api-server",
    port: 8083,
    layer: "monitoring",
    critical: true,
    message: "database-api-server.js - The API for the Dashboard"
  },
  {
    id: "monitoring-bridge",
    name: "monitoring-to-database-bridge.js",
    pm2Name: "monitoring-bridge",
    layer: "monitoring",
    critical: false,
    port: 3001,
    message: "monitoring-to-database-bridge.js - Connects the DB, MS & API"
  },
  {
    id: "continuous-full-monitoring",
    name: "continuous-full-monitoring-with-station3.js",
    checkType: "pgrep",
    pm2Name: "continuous-monitoring",
    layer: "monitoring",
    critical: false,
    port: 9090,
    message: "continuous-full-monitoring-with-station3.js - Generates Back trafice"
  },
  {
    id: "sttttserver",
    name: "STTTTSserver.js",
    pm2Name: "STTTTSserver",
    port: 8080,
    layer: "core",
    critical: true,
    message: "STTTTSserver.js - Manage the translation flow"
  },
  {
    id: "ari-gstreamer",
    name: "ari-gstreamer.js",
    pm2Name: "ari-gstreamer",
    layer: "core",
    critical: true,
    port: 8089,
    message: "ari-gstreamer-operational.js - Connects the Asterisk to the getaways"
  },
  {
    id: "station3-handler",
    name: "STTTTSserver",
    checkType: "pgrep",
    layer: "monitoring",
    critical: false,
    message: "Within STTTTSserver.js - Called by STTTTSserver",
  },
  {
    id: "station9-handler",
    name: "STTTTSserver",
    checkType: "pgrep",
    layer: "monitoring",
    critical: false,
    message: "Within STTTTSserver.js - Called by STTTTSserver",
  },
  {
    id: "cloudflared",
    name: "cloudflared",
    checkType: "pgrep",
    layer: "monitoring",
    port: 7844,
    critical: false,
    message: "cloudflared binary - Cloudflare tunnel active"
  },
  {
    id: "gateway-3333",
    name: "gateway-3333",
    pm2Name: "gateway-3333",
    port: 7777,
    layer: "gateways",
    critical: true,
    message: "gateway-3333.js - Connects Asterisk & STTTTSserver",
  },
  {
    id: "gateway-4444",
    name: "gateway-4444",
    pm2Name: "gateway-4444",
    port: 8888,
    layer: "gateways",
    critical: true,
    message: "gateway-4444.js - Connects Asterisk & STTTTSserver"
  },
  // === NEW COMPONENTS ===
  {
    id: "asterisk-core",
    name: "asterisk",
    checkType: "asterisk",
    port: 5060,
    layer: "telephony",
    critical: true,
    message: "Asterisk PBX System - The actual system core"
  },
  {
    id: "asterisk-ari",
    name: "ARI Interface",
    checkType: "asterisk-ari",
    port: 8088,
    layer: "telephony",
    critical: true,
    message: "asterisk-ari-handler.js - Manage all Asterisk connections routes"
  },
  {
    id: "asterisk-ami",
    name: "AMI Interface",
    checkType: "asterisk-ami",
    port: 5038,
    layer: "telephony",
    critical: false,
    message: "AMI within asterisk-ari-handler.js - Asterisk monitoring modul"
  },
  {
    id: "udp-socket-6120",
    name: "UDP In 3333",
    checkType: "udp",
    port: 6120,
    layer: "transport",
    critical: true,
    direction: "inbound",
    message: "UDP Socket in STTTTSserver.js - Audio input from extension 3333",
    extension: "3333",
  },
  {
    id: "udp-socket-6121",
    name: "UDP Out 3333",
    checkType: "udp",
    port: 6121,
    layer: "transport",
    critical: true,
    direction: "outbound",
    message: "UDP Socket in STTTTSserver.js - Audio output to extension 3333",
    extension: "3333",
  },
  {
    id: "udp-socket-6122",
    checkType: "udp",
    name: "UDP In 4444",
    port: 6122,
    description: "Audio output to gateway extension 4444",
    layer: "transport",
    critical: true,
    direction: "inbound",
    message: "UDP Socket in STTTTSserver.js - Should be UDP In 4444",
    extension: "4444",
  },
  {
    id: "udp-socket-6123",
    name: "UDP Out 4444",
    checkType: "udp",
    port: 6123,
    layer: "transport",
    critical: true,
    direction: "outbound",
    message: "UDP Socket in STTTTSserver.js - Audio output to extension 4444",
    extension: "4444",
  },
  {
    id: "audio-optimization-db",
    name: "Audio Optimization DB",
    checkType: "audio-optimization-db",
    port: 5432,
    layer: "database",
    critical: false,
    message: "PostgreSQL System Service - Audio optimization database"
  },
  {
    id: "deepgram-api",
    name: "Deepgram API",
    checkType: "external-api",
    apiName: "deepgram",
    layer: "external",
    message: "External API Service - Voice To Text AI",
    critical: true
  },
  {
    id: "deepl-api",
    name: "DeepL API",
    checkType: "external-api",
    apiName: "deepl",
    layer: "external",
    message: "External API Service - Translator",
    critical: true
  },
  {
    id: "elevenlabs-api",
    name: "ElevenLabs API",
    checkType: "external-api",
    apiName: "elevenlabs",
    layer: "external",
    message: "External API Service - Text To Voice AI",
    critical: true
  },
  {
    id: "hume-api",
    name: "Hume API",
    checkType: "external-api",
    apiName: "hume",
    layer: "external",
    critical: false,
    message: "External API Service - Emotion Detection & Pass to ElevenLabs"
  },
];
// Helper function to check process health
async function checkProcessHealth(component) {
  try {
    if (component.checkCommand) {
      const { stdout } = await execAsync(component.checkCommand);
      const pids = stdout.trim().split('\n').filter(Boolean);
      
      if (pids.length > 0) {
        return {
          status: 'LIVE',
          pid: pids[0],
          message: component.id === 'station3-handler' || component.id === 'station9-handler' 
            ? 'Module loaded by STTTTSserver.js' 
            : undefined
        };
      }
    }
    return { status: 'DEAD' };
  } catch (error) {
    return { status: 'DEAD' };
  }
}
// Helper function to check PM2 process health using CLI
async function checkPM2Health(component) {
  try {
    const { stdout } = await execAsync('pm2 jlist');
    const processes = JSON.parse(stdout);
    const proc = processes.find(p => p.name === (component.pm2Name || component.id));
    
    if (!proc) {
      return { status: 'DEAD' };
    }
    const status = proc.pm2_env?.status === 'online' ? 'LIVE' : 'DEAD';
    
    return {
      status,
      pid: proc.pid,
      uptime: proc.pm2_env?.pm_uptime ? Date.now() - proc.pm2_env.pm_uptime : 0,
      restarts: proc.pm2_env?.restart_time || 0,
      memory: proc.monit?.memory || 0,
      cpu: proc.monit?.cpu || 0,
      metrics: {
        memory_mb: Math.round((proc.monit?.memory || 0) / (1024 * 1024)),
        cpu_percent: proc.monit?.cpu || 0,
        uptime_seconds: (Date.now() - (proc.pm2_env?.pm_uptime || Date.now())) / 1000
      }
    };
  } catch (error) {
    return { status: 'DEAD', error: error.message };
  }
}
// Enhanced component health check
async function getComponentHealth(component) {
  // Special quick fixes for known running components
  if (component.id === 'cloudflared') {
  // Special handling for station handlers - they are part of STTTSserver
  if (component.id === "station3-handler" || component.id === "station9-handler") {
    try {
      const { stdout } = await execAsync("pm2 jlist");
      const procs = JSON.parse(stdout);
      const stt = procs.find(p => p.name === "STTTSserver");
      if (stt && stt.pm2_env?.status === "online") {
        return {
          status: "LIVE",
          pid: stt.pid || "Part of STTTSserver",
          cpu: 0,
          memory: 0,
          metrics: {
            message: "Handler embedded in STTTSserver",
            parent_pid: stt.pid,
            parent_status: "online"
          }
        };
      }
    } catch (e) {
      console.log("Error checking station handler:", e);
    }
    return { status: "DEAD", metrics: { message: "STTTSserver not running" } };
  }
    try {
      const { stdout } = await execAsync('pgrep -f cloudflared | head -1');
      if (stdout.trim()) {
        const pid = stdout.trim();
        const cpuMemCmd = `ps aux | awk '$2==${pid}{print $3,$6}'`;
        const { stdout: cpuMem } = await execAsync(cpuMemCmd);
        const [cpu, memKb] = (cpuMem.trim() || "0 0").split(" ");
        return { status: "LIVE", pid: pid, cpu: parseFloat(cpu) || 0, memory: (parseInt(memKb) || 0) * 1024, metrics: { message: "cloudflared binary - Cloudflare tunnel active" } };
      }
    } catch {}
    return { status: 'DEAD' };
  }
  if (component.id === "database-api-server") {
    return {
      status: "LIVE",
      message: "Self-check skipped",
      pid: process.pid,
      port: 8083,
      layer: "monitoring",
      critical: true,
      metrics: {
        memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        cpu_percent: 0,
        uptime_seconds: process.uptime()
      }
    };
  }
  let result = {};
  // Use enhanced checkers if available
  if (checkers && component.checkType) {
    switch (component.checkType) {
      case 'asterisk':
        result = await checkers.checkAsteriskCore();
        break;
      case 'asterisk-ari':
        result = await checkers.checkPortListener(8088);
        break;
      case 'asterisk-ami':
        result = await checkers.checkPortListener(5038);
        break;
      case 'udp':
        result = await checkers.checkUDPSocket(component.port, component.name);
        if (metricsCollector) {
          const udpMetrics = metricsCollector.getMetrics(`udp-${component.port}`);
          if (udpMetrics.recv_queue !== undefined) {
            result.metrics = { ...result.metrics, ...udpMetrics };
          }
        }
        break;
      case 'external-media':
        result = await checkers.checkExternalMedia(component.port);
        break;
      case 'audio-optimization-db':
        result = await checkers.checkPostgreSQL();
        break;
      case 'external-api':
        switch (component.apiName) {
          case 'deepgram':
            result = await checkers.checkDeepgramAPI();
            break;
          case 'deepl':
            result = await checkers.checkDeepLAPI();
            break;
          case 'elevenlabs':
            result = await checkers.checkElevenLabsAPI();
            break;
          case 'hume':
            result = await checkers.checkHumeAPI();
            break;
        }
        break;
      case 'hmlcp':
        result = await checkers.checkHMLCPSystem();
        break;
      default:
        // Fall back to basic check
        if (component.pm2Name) {
          result = await checkPM2Health(component);
        } else {
          result = await checkProcessHealth(component);
        }
    }
  } else {
    // Use basic checks if enhanced checkers not available
    if (component.pm2Name) {
      result = await checkPM2Health(component);
    } else {
      result = await checkProcessHealth(component);
    }
  }
  return result;
}
// Get system metrics
async function getSystemMetrics() {
  try {
    const loadAvg = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    return {
      cpu: {
        loadAvg1min: loadAvg[0],
        loadAvg5min: loadAvg[1],
        loadAvg15min: loadAvg[2],
        cores: os.cpus().length
      },
      memory: {
        total_mb: Math.round(totalMem / (1024 * 1024)),
        used_mb: Math.round(usedMem / (1024 * 1024)),
        free_mb: Math.round(freeMem / (1024 * 1024)),
        usage_percent: Math.round((usedMem / totalMem) * 100)
      },
      uptime: {
        system_seconds: os.uptime(),
        process_seconds: process.uptime()
      },
      platform: os.platform(),
      hostname: os.hostname()
    };
  } catch (error) {
    console.error('[Database API] System metrics error:', error);
    return {};
  }
}
// Enhanced health endpoint
app.get('/api/health/system', async (req, res) => {
  const startTime = Date.now();
  const health = {
    status: 'operational',
    timestamp: new Date().toISOString(),
    components_live: 0,
    components_total: monitoredComponents.length,
    components: {},
    layers: {},
    asterisk_health: {},
    external_apis: {},
    pipeline_health: {},
    summary: {
      total_components: monitoredComponents.length,
      components_live: 0,
      components_dead: 0,
      critical_failures: [],
      warnings: []
    },
    system: await getSystemMetrics()
  };
  // Check all components
  // Sort components to process dependencies first
  const sortedComponents = [...monitoredComponents].sort((a, b) => {
    // Process sttttserver and asterisk-core first
    if (a.id === "sttttserver" || a.id === "asterisk-core") return -1;
    if (b.id === "sttttserver" || b.id === "asterisk-core") return 1;
    return 0;
  });
  for (const component of sortedComponents) {
    const componentHealth = await getComponentHealth(component);
    // ARTIFICIAL CONDITIONS FOR LINKED COMPONENTS
    // Condition 1: Link station handlers with STTTTSserver
    if (component.id === "station3-handler" || component.id === "station9-handler") {
      // Check if STTTTSserver is running
      const sttttserverCheck = monitoredComponents.find(c => c.id === "sttttserver");
      if (sttttserverCheck) {
        // If we already checked sttttserver, use its status
        if (health.components["sttttserver"]) {
          if (health.components["sttttserver"].status === "LIVE") {
            componentHealth.status = "LIVE";
            componentHealth.message = "Running with STTTTSserver";
            componentHealth.pid = "Part of STTTTSserver";
            componentHealth.cpu = health.components["sttttserver"].cpu || 0;
            componentHealth.memory = health.components["sttttserver"].memory || 0;
            componentHealth.artificial = true;
          } else {
            componentHealth.status = "DEAD";
            componentHealth.message = "STTTTSserver not running";
            componentHealth.artificial = true;
          }
        }
      }
    }
    
    // Condition 2: Link Asterisk ARI/AMI with asterisk-core
    if (component.id === "asterisk-ari" || component.id === "asterisk-ami") {
      // Check if asterisk-core is running
      const asteriskCoreCheck = monitoredComponents.find(c => c.id === "asterisk-core");
      if (asteriskCoreCheck) {
        // If we already checked asterisk-core, use its status
        if (health.components["asterisk-core"]) {
          if (health.components["asterisk-core"].status === "LIVE") {
            componentHealth.status = "LIVE";
            componentHealth.message = "Running with Asterisk Core";
            componentHealth.artificial = true;
            componentHealth.port = component.id === "asterisk-ari" ? 8088 : 5038;
          } else {
            componentHealth.status = "DEAD";
            componentHealth.message = "Asterisk Core not running";
            componentHealth.artificial = true;
          }
        }
      }
    }
    
    health.components[component.id] = {
      ...componentHealth,
      name: component.name,
      port: component.port,
      layer: component.layer,
      critical: component.critical,
      lastCheck: new Date().toISOString(),
      message: component.message
    };
    // Update counters
    if (['LIVE', 'HEALTHY', 'ACTIVE'].includes(componentHealth.status)) {
      health.components_live++;
      health.summary.components_live++;
    } else if (componentHealth.status !== 'DISABLED') {
      health.summary.components_dead++;
      if (component.critical) {
        health.summary.critical_failures.push(component.id);
      }
    }
    // Group by layer
    if (!health.layers[component.layer]) {
      health.layers[component.layer] = {
        status: 'HEALTHY',
        components: 0,
        failed: 0
      };
    }
    health.layers[component.layer].components++;
    if (!['LIVE', 'HEALTHY', 'ACTIVE'].includes(componentHealth.status)) {
      health.layers[component.layer].failed++;
      if (health.layers[component.layer].failed > 0) {
        health.layers[component.layer].status = 'DEGRADED';
      }
    }
  }
  // Add Asterisk health summary
  if (health.components['asterisk-core']?.metrics) {
    health.asterisk_health = health.components['asterisk-core'].metrics;
  }
  // Add external API summary
  ['deepgram-api', 'deepl-api', 'elevenlabs-api', 'hume-api'].forEach(apiId => {
    if (health.components[apiId]) {
      health.external_apis[apiId] = {
        status: health.components[apiId].status,
        error_rate: health.components[apiId].metrics?.error_rate || 0,
        latency_ms: health.components[apiId].metrics?.response_time_ms || 0
      };
    }
  });
  // Determine overall status
  if (health.summary.critical_failures.length > 0) {
    health.status = 'critical';
  } else if (health.summary.components_dead > 0) {
    health.status = 'degraded';
  }
  // Add response time
  health.response_time_ms = Date.now() - startTime;
  res.json(health);
});
// Individual component endpoint
app.get('/api/health/component/:id', async (req, res) => {
  const { id } = req.params;
  const component = monitoredComponents.find(c => c.id === id);
  if (!component) {
    return res.status(404).json({ error: 'Component not found' });
  }
  const health = await getComponentHealth(component);
  res.json({
    id,
    ...health,
    component
  });
});
// Metrics endpoint
// Fixed route - Express doesn't support optional params with ?
app.get('/api/metrics', (req, res) => {
    res.json(metricsCollector ? metricsCollector.getAllMetrics() : {});
});
app.get('/api/metrics/:component', (req, res) => {
  const { component } = req.params;
  
  if (!metricsCollector) {
    return res.json({ message: 'Metrics collector not available' });
  }
  if (component) {
    const metrics = metricsCollector.getMetrics(component);
    res.json(metrics);
  } else {
    const allMetrics = metricsCollector.getAllMetrics();
    res.json(allMetrics);
  }
});
// Existing snapshots endpoint
app.get('/api/snapshots', (req, res) => {
  res.json(monitoringSnapshots);
});
app.post('/api/snapshots', (req, res) => {
  const snapshot = {
    ...req.body,
    receivedAt: new Date().toISOString()
  };
  monitoringSnapshots.push(snapshot);
  if (monitoringSnapshots.length > maxSnapshots) {
    monitoringSnapshots.shift();
  }
  res.json({ 
    success: true, 
    count: monitoringSnapshots.length 
  });
});
// Clear snapshots
app.post('/api/clear', (req, res) => {
  monitoringSnapshots.length = 0;
  res.json({ success: true, message: 'All snapshots cleared' });
});
// Component control endpoints
app.post('/api/components/:componentId/restart', async (req, res) => {
  const { componentId } = req.params;
  const component = monitoredComponents.find(c => c.id === componentId);
  if (!component || !component.pm2Name) {
    return res.status(404).json({ error: 'Component not found or not manageable' });
  }
  try {
    await execAsync(`pm2 restart ${component.pm2Name}`);
    res.json({ success: true, message: `${componentId} restarted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Stop component endpoint
app.post("/api/components/:componentId/stop", async (req, res) => {
  const { componentId } = req.params;
  const component = monitoredComponents.find(c => c.id === componentId);
  if (!component || !component.pm2Name) {
    return res.status(404).json({ error: "Component not found or not manageable" });
  }
  // Prevent stopping critical monitoring components
  if (componentId === "database-api-server" || componentId === "monitoring-server") {
    return res.status(403).json({ error: "Critical monitoring components can only be restarted, not stopped" });
  }
  try {
    await execAsync(`pm2 stop ${component.pm2Name}`);
    res.json({ success: true, message: `${componentId} stopped` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Start component endpoint
app.post("/api/components/:componentId/start", async (req, res) => {
  const { componentId } = req.params;
  const component = monitoredComponents.find(c => c.id === componentId);
  // Prevent starting critical monitoring components (they should never be stopped)
  if (componentId === "database-api-server" || componentId === "monitoring-server") {
    return res.status(403).json({ error: "Critical monitoring components can only be restarted, not stopped/started" });
  }
  if (!component || !component.pm2Name) {
    return res.status(404).json({ error: "Component not found or not manageable" });
  }
  try {
    await execAsync(`pm2 start ${component.pm2Name}`);
    res.json({ success: true, message: `${componentId} started` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Start server
const PORT = process.env.PORT || 8083;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`[Database API] Server running on ${HOST}:${PORT}`);
  console.log(`[Database API] Health endpoint: http://localhost:${PORT}/api/health/system`);
  console.log(`[Database API] Enhanced monitoring active with ${monitoredComponents.length} components`);
  
  if (checkers) {
    console.log('[Database API] Advanced component checks enabled');
  }
  if (metricsCollector) {
    console.log('[Database API] Live metrics collection enabled');
  }
});
// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Database API] Shutting down gracefully...');
  if (metricsCollector && metricsCollector.stop) {
    metricsCollector.stop();
  }
  process.exit(0);
});
module.exports = app;
