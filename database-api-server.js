const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const os = require('os');
// Import new checker modules
const { Pool } = require("pg");

// PostgreSQL connection pool for snapshots persistence
const dbPool = new Pool({
  host: "localhost",
  database: "audio_optimization",
  user: "postgres",
  password: "postgres",
  port: 5432,
  max: 10,
  idleTimeoutMillis: 30000
});

// Test database connection
dbPool.query("SELECT 1").then(() => {
  console.log("✅ Database connected for snapshots");
}).catch(err => {
  console.error("❌ Database connection failed:", err.message);
});
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

// Initialize snapshots from database on startup
async function initializeSnapshots() {
  try {
    const result = await dbPool.query(
      "SELECT * FROM station_snapshots ORDER BY timestamp DESC LIMIT 100"
    );
    if (result.rows.length > 0) {
      // Convert DB format to API format
const snapshots = result.rows.map(row => {      const stationId = row.station_id;      const stationNumber = parseInt(stationId.replace("Station-", ""));      return {        station_id: stationId,        station_number: stationNumber,        station_name: stationMappings[stationId] || stationId,        timestamp: row.timestamp,        metrics: row.metrics || {},        knobs: row.knobs || {},        receivedAt: row.created_at      };    });
      monitoringSnapshots.push(...snapshots.reverse());
      console.log(`✅ Loaded ${result.rows.length} historical snapshots from database`);
    }
  } catch (error) {
    console.error("❌ Failed to load snapshots:", error.message);
  }
}

// Call initialization
initializeSnapshots();
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
app.get("/api/snapshots", async (req, res) => {
  try {
    // Try database first for persistent data
    const result = await dbPool.query(
      "SELECT * FROM station_snapshots ORDER BY timestamp DESC LIMIT " + maxSnapshots
    );
    
    if (result.rows.length > 0) {
      // Convert DB format to API format
const snapshots = result.rows.map(row => {      const stationId = row.station_id;      const stationNumber = parseInt(stationId.replace("Station-", ""));      return {        station_id: stationId,        station_number: stationNumber,        station_name: stationMappings[stationId] || stationId,        timestamp: row.timestamp,        metrics: row.metrics || {},        knobs: row.knobs || {},        receivedAt: row.created_at      };    });
      res.json(snapshots);
    } else {
      // Fallback to memory if DB is empty
      res.json(monitoringSnapshots);
    }
  } catch (error) {
    console.error("Database error in GET /api/snapshots:", error.message);
    // Fallback to memory on error
    res.json(monitoringSnapshots);
  }
});
app.post("/api/snapshots", async (req, res) => {
  const snapshot = {
    ...req.body,
    receivedAt: new Date().toISOString()
  };
  
  // Save to memory for fast access
  monitoringSnapshots.push(snapshot);
  if (monitoringSnapshots.length > maxSnapshots) {
    monitoringSnapshots.shift();
  }
  
  // Save to database for persistence (async, dont block response)
  dbPool.query(
    `INSERT INTO station_snapshots 
     (station_id, metrics, timestamp, segment, audio, totals, knobs, logs) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      snapshot.station_id || "system",
      snapshot.metrics || {},
      snapshot.timestamp || new Date(),
      snapshot.segment || {},
      snapshot.audio || {},
      snapshot.totals || {},
      snapshot.knobs || {},
      snapshot.logs || {}
    ]
  ).then(() => {
    console.log("Snapshot saved to database:", snapshot.station_id);
  }).catch(err => {
    console.error("Failed to save snapshot to DB:", err.message);
  });
  
  res.json({ 
    success: true, 
    count: monitoringSnapshots.length,
    persisted: true
  });
});
// Monitoring-data endpoint (used by monitoring-to-database-bridge)
app.post('/api/monitoring-data', async (req, res) => {
  const data = req.body;
  
  // Debug logging
  console.log("[monitoring-data] Received data:", {
    station_id: data.station_id,
    extension: data.extension,
    hasExtension: !!data.extension
  });
  
  // Convert monitoring-data format to snapshot format
  // Combine station_id with extension for new format
  let stationId = data.station || data.stationId || data.station_id || "unknown";
  if (data.extension && stationId !== "unknown") {
    // Convert to new format: Station-X-YYYY
    stationId = stationId + "-" + data.extension;
  }
  
  const snapshot = {
    station_id: stationId,
    timestamp: data.timestamp || new Date(),
    metrics: data.metrics || data,
    segment: data.segment || {},
    audio: data.audio || {},
    totals: data.totals || {},
    knobs: data.knobs || {},
    logs: data.logs || {},
    receivedAt: new Date().toISOString()
  };
  
  // Log for debugging
  console.log(`[monitoring-data] Received data for station: ${snapshot.station_id}`);
  
  // Save to memory
  monitoringSnapshots.push(snapshot);
  if (monitoringSnapshots.length > maxSnapshots) {
    monitoringSnapshots.shift();
  }
  
  // Save to database (async, don't block response)
  dbPool.query(
    `INSERT INTO station_snapshots 
     (station_id, metrics, timestamp, segment, audio, totals, knobs, logs) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      snapshot.station_id,
      snapshot.metrics || {},
      snapshot.timestamp,
      snapshot.segment,
      snapshot.audio,
      snapshot.totals,
      snapshot.knobs,
      snapshot.logs
    ]
  ).then(() => {
    console.log(`[monitoring-data] Saved to database: ${snapshot.station_id}`);
  }).catch(err => {
    console.error(`[monitoring-data] Failed to save to DB: ${err.message}`);
  });
  
  res.json({ 
    success: true, 
    message: 'Monitoring data received',
    station: snapshot.station_id
  });
});

// GET latest snapshot per station
// Station name mappings for proper display
// Station name mappings for proper display - 24 combinations (12 stations × 2 extensions)
const stationMappings = {
  // Extension 3333
  'Station-1-3333': 'Asterisk → Gateway / 3333',
  'Station-2-3333': 'Gateway → STTTTSserver / 3333',
  'Station-3-3333': 'STTTTSserver → Deepgram / English (Caller) / 3333',
  'Station-4-3333': 'STTTTSserver → DeepL / Translation (EN→HE) / 3333',
  'Station-5-3333': 'STTTTSserver → ElevenLabs / English (Agent) / 3333',
  'Station-6-3333': 'STTTTSserver → Deepgram / Hebrew (Agent) / 3333',
  'Station-7-3333': 'STTTTSserver → DeepL / Translation (HE→EN) / 3333',
  'Station-8-3333': 'STTTTSserver → ElevenLabs / Hebrew (Caller) / 3333',
  'Station-9-3333': 'STTTTSserver → Hume / Emotion Analysis / 3333',
  'Station-10-3333': 'STTTTSserver → Gateway / 3333',
  'Station-11-3333': 'Gateway → Asterisk / 3333',
  'Station-12-3333': 'External Media → Conference Server / 3333',
  
  // Extension 4444
  'Station-1-4444': 'Asterisk → Gateway / 4444',
  'Station-2-4444': 'Gateway → STTTTSserver / 4444',
  'Station-3-4444': 'STTTTSserver → Deepgram / English (Caller) / 4444',
  'Station-4-4444': 'STTTTSserver → DeepL / Translation (EN→HE) / 4444',
  'Station-5-4444': 'STTTTSserver → ElevenLabs / English (Agent) / 4444',
  'Station-6-4444': 'STTTTSserver → Deepgram / Hebrew (Agent) / 4444',
  'Station-7-4444': 'STTTTSserver → DeepL / Translation (HE→EN) / 4444',
  'Station-8-4444': 'STTTTSserver → ElevenLabs / Hebrew (Caller) / 4444',
  'Station-9-4444': 'STTTTSserver → Hume / Emotion Analysis / 4444',
  'Station-10-4444': 'STTTTSserver → Gateway / 4444',
  'Station-11-4444': 'Gateway → Asterisk / 4444',
  'Station-12-4444': 'External Media → Conference Server / 4444',
  
  // Fallback for old format (backward compatibility)
  'Station-1': 'Asterisk → Gateway / 3333',
  'Station-2': 'Asterisk → Gateway / 4444', 
  'Station-3': 'STTTTSserver → Deepgram / English (Caller)',
  'Station-4': 'STTTTSserver → DeepL / Translation',
  'Station-5': 'STTTTSserver → ElevenLabs / English (Agent)',
  'Station-6': 'STTTTSserver → Deepgram / Hebrew (Agent)',
  'Station-7': 'STTTTSserver → DeepL / Translation',
  'Station-8': 'STTTTSserver → ElevenLabs / Hebrew (Caller)',
  'Station-9': 'STTTTSserver → Hume / Emotion Analysis',
  'Station-10': 'Gateway → Asterisk / 3333',
  'Station-11': 'Gateway → Asterisk / 4444',
  'Station-12': 'External Media → Conference Server'
};

app.get("/api/snapshots/latest", async (req, res) => {
  try {
    const result = await dbPool.query(
      "SELECT DISTINCT ON (station_id) * FROM station_snapshots WHERE timestamp > NOW() - INTERVAL '5 minutes' ORDER BY station_id, timestamp DESC"
    );
    const snapshots = result.rows.map(row => {
      const stationId = row.station_id;
      // Parse station number and extension from Station-X-YYYY or Station-X format
      const parts = stationId.split("-");
      let stationNumber = 1;
      let extension = null;
      
      if (parts.length === 2) {
        // Old format: Station-X
        stationNumber = parseInt(parts[1]) || 1;
      } else if (parts.length === 3) {
        // New format: Station-X-YYYY
        stationNumber = parseInt(parts[1]) || 1;
        extension = parts[2];
      }
      
      return {
        station_id: stationId,
        station_number: stationNumber,
        extension: extension,
        station_name: stationMappings[stationId] || stationId,
        timestamp: row.timestamp,
        metrics: row.metrics || {},
        knobs: row.knobs || {},
        receivedAt: row.created_at
      };
    });
    snapshots.sort((a, b) => a.station_number - b.station_number);
    res.json({ count: snapshots.length, timestamp: new Date().toISOString(), stations: snapshots });
  } catch (error) {
    console.error("GET /api/snapshots/latest error:", error.message);
    res.status(500).json({ error: "Failed to fetch latest snapshots" });
  }
});
app.post('/api/clear', async (req, res) => {
  // Clear memory
  monitoringSnapshots.length = 0;
  
  // Optional: Clear old database records (keep last 7 days)
  try {
    const result = await dbPool.query(
      "DELETE FROM station_snapshots WHERE timestamp < NOW() - INTERVAL '7 days'"
    );
    console.log(`Cleared ${result.rowCount} old snapshots from database`);
  } catch (err) {
    console.error("Failed to clear old snapshots from DB:", err.message);
  }
  
  res.json({ success: true, message: "All memory snapshots cleared, old DB records cleaned" });
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

// Automatic cleanup job - runs every 24 hours
setInterval(async () => {
  try {
    const result = await dbPool.query(
      "DELETE FROM station_snapshots WHERE timestamp < NOW() - INTERVAL '30 days' RETURNING id"
    );
    if (result.rowCount > 0) {
      console.log(`[Cleanup] Removed ${result.rowCount} snapshots older than 30 days`);
    }
  } catch (err) {
    console.error("[Cleanup] Failed to clean old snapshots:", err.message);
  }
}, 24 * 60 * 60 * 1000); // Run daily

console.log("[Database API] Automatic cleanup scheduled (daily, removes >30 day old records)");
// AUTO-SYNC TEST: Thu Dec 18 20:36:32 IST 2025
