# **Enhanced Health Monitoring System - Complete Implementation Guide**

## **Executive Summary**

This document provides a comprehensive implementation plan for enhancing the monitoring system at `https://tun.monitoringavailable.uk/api/health/system` to include **25+ components** with deep PM2 metrics, Asterisk telephony monitoring, external API health tracking, and complete system visibility.

**Key Enhancement:** Only ONE existing file (`database-api-server.js`) will be modified. All other enhancements are implemented through new, modular files to minimize risk and maintain system stability.

---

## **Table of Contents**

1. [Current State Analysis](#current-state-analysis)
2. [Complete Component List](#complete-component-list)
3. [PM2 Deep Metrics Capabilities](#pm2-deep-metrics-capabilities)
4. [Implementation Plan](#implementation-plan)
5. [File Changes Summary](#file-changes-summary)
6. [Component Checker Functions](#component-checker-functions)
7. [Testing & Validation](#testing-validation)
8. [Deployment Strategy](#deployment-strategy)
9. [Monitoring Without Code Changes](#monitoring-without-code-changes)

---

## **Current State Analysis**

### **Currently Monitored Components (11 total)**
```javascript
{
  "sttttserver": {...},                                    // ✓ Core service
  "ari-gstreamer": {...},                                  // ✓ Media processing
  "monitoring-server.js": {...},                           // ✓ Socket.IO server
  "database-api-server.js": {...},                         // ✓ API server
  "monitoring-to-database-bridge.js": {...},               // ✓ Data bridge
  "continuous-full-monitoring-with-station3.js": {...},    // ✓ Test data
  "station3-handler.js": {...},                            // ✓ STT monitoring
  "station9-handler.js": {...},                            // ✓ TTS monitoring
  "cloudflared": {...},                                   // ✓ Tunnel service
  "gateway-3333": {...},                                   // ✓ Audio gateway
  "gateway-4444": {...}                                    // ✓ Audio gateway
}
```

### **Critical Issues Identified**
- ❌ **No Asterisk monitoring** (core telephony missing)
- ❌ **No external API health** (Deepgram, DeepL, ElevenLabs)
- ❌ **No UDP socket metrics** (ports 6120-6123)
- ❌ **No database status** (PostgreSQL)
- ❌ **Limited PM2 metrics** (only basic CPU/memory)
- ❌ **High restart counts** (database-api-server: 2153, monitoring-server: 213)

---

## **Complete Component List**

### **Components to Add (14 new)**

#### **1. Telephony Layer (3 components)**
```javascript
// Asterisk Core
{
  id: "asterisk-core",
  name: "asterisk",
  port: 5060,
  layer: "telephony",
  critical: true,
  metrics: {
    active_channels: 0,
    active_calls: 0,
    sip_peers_online: 0,
    sip_peers_total: 0,
    conference_bridges: 0,
    codecs_in_use: [],
    trunk_status: {}
  }
}

// Asterisk ARI
{
  id: "asterisk-ari",
  port: 8088,
  layer: "telephony",
  critical: true,
  metrics: {
    websocket_connections: 0,
    active_bridges: 0,
    active_channels: 0,
    stasis_apps: []
  }
}

// Asterisk AMI
{
  id: "asterisk-ami",
  port: 5038,
  layer: "telephony",
  critical: false,
  metrics: {
    connected_clients: 0,
    events_per_second: 0
  }
}
```

#### **2. Media Layer (3 components)**
```javascript
// External Media Channels
{
  id: "externalmedia-7777",
  port: 7777,
  layer: "media",
  critical: true,
  metrics: {
    rtp_packets_in: 0,
    rtp_packets_out: 0,
    audio_format: "PCMU",
    connected_extensions: []
  }
}

{
  id: "externalmedia-8888",
  port: 8888,
  layer: "media",
  critical: true,
  // Similar metrics
}

// AudioSocket (currently disabled)
{
  id: "audiosocket-5050",
  port: 5050,
  layer: "media",
  critical: false,
  enabled: false
}
```

#### **3. Transport Layer (4 components)**
```javascript
// UDP Sockets for Audio
{
  id: "udp-socket-6120",
  port: 6120,
  layer: "transport",
  direction: "inbound",
  extension: "3333",
  metrics: {
    packets_per_second: 0,
    bytes_per_second: 0,
    packet_loss_percent: 0,
    jitter_ms: 0
  }
}
// Similar for ports 6121, 6122, 6123
```

#### **4. External APIs (4 components)**
```javascript
{
  id: "deepgram-api",
  layer: "external",
  critical: true,
  metrics: {
    requests_per_minute: 0,
    error_rate: 0,
    avg_latency_ms: 0,
    quota_remaining: 0,
    active_streams: 0
  }
}
// Similar for deepl-api, elevenlabs-api, hume-api
```

#### **5. Database & ML Layers (2 components)**
```javascript
{
  id: "postgresql",
  port: 5432,
  layer: "database",
  metrics: {
    active_connections: 0,
    database_size_mb: 0
  }
}

{
  id: "hmlcp-system",
  layer: "ml",
  metrics: {
    active_profiles: 0,
    corrections_today: 0
  }
}
```

---

## **PM2 Deep Metrics Capabilities**

### **What PM2 Can Monitor (Per Process)**

#### **With Code Changes (Application Metrics)**
```javascript
const io = require('@pm2/io');

// Translation Pipeline Metrics
const translationCounter = io.counter({
  name: 'Translations per min',
  id: 'app/translations/count'
});

const sttLatency = io.histogram({
  name: 'STT Processing Time',
  measurement: 'mean',
  unit: 'ms'
});

// Active Connections
const activeConnections = io.metric({
  name: 'Active WebSocket Connections',
  value: () => io.sockets.sockets.size
});

// UDP Packet Flow
const udpPacketsIn = io.meter({
  name: 'UDP Packets In/sec',
  id: 'network/udp/in'
});

// API Failures
const deepgramFailures = io.counter({
  name: 'Deepgram API Failures'
});

// HMLCP Metrics
const profilesActive = io.metric({
  name: 'Active User Profiles',
  value: () => getUserProfileCount()
});

// Buffer Health
const bufferOverflows = io.counter({
  name: 'Audio Buffer Overflows'
});

// Memory Deep Dive
const heapUsed = io.metric({
  name: 'Heap Used',
  value: () => process.memoryUsage().heapUsed
});

// Event Loop Monitoring
const eventLoopLag = io.histogram({
  name: 'Event Loop Lag',
  measurement: 'p95',
  unit: 'ms'
});

// Conference Metrics
const activeRooms = io.metric({
  name: 'Active Conference Rooms',
  value: () => rooms.size
});

// Error Rate
const errorRate = io.meter({
  name: 'Errors per minute'
});
```

#### **Without Code Changes (System Metrics)**
```bash
# PM2 Modules for System Monitoring
pm2 install pm2-server-monit       # CPU, memory, disk, network
pm2 install pm2-logrotate          # Prevent log overflow
pm2 install pm2-auto-pull          # Auto-update from git
pm2 install pm2-net-monitor        # Network connections
pm2 install pm2-process-explorer   # File descriptors, sockets

# External Monitoring Script
cat > monitor-sttts.sh << 'EOF'
#!/bin/bash
while true; do
  # Monitor UDP ports
  UDP_6120=$(ss -un | grep :6120 | wc -l)
  UDP_6122=$(ss -un | grep :6122 | wc -l)

  # Monitor TCP connections
  SOCKET_CONN=$(ss -tn | grep :3020 | wc -l)

  # Get process memory
  MEM=$(grep VmRSS /proc/$(pgrep -x node | head -1)/status | awk '{print $2}')

  # Send to monitoring API
  curl -X POST http://localhost:8083/api/external-metrics \
    -H "Content-Type: application/json" \
    -d "{
      \"udp_6120\": $UDP_6120,
      \"udp_6122\": $UDP_6122,
      \"socket_connections\": $SOCKET_CONN,
      \"memory_kb\": $MEM,
      \"timestamp\": $(date +%s)
    }"

  sleep 10
done
EOF

pm2 start monitor-sttts.sh --name sttts-monitor
```

### **Enhanced PM2 Configuration**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'STTTTSserver',
    script: './STTTTSserver.js',
    max_memory_restart: '200M',
    min_uptime: '10s',
    max_restarts: 10,
    error_file: '/tmp/sttts-error.log',
    out_file: '/tmp/sttts-out.log',
    monitoring: {
      http: true,
      https: true,
      network: true
    }
  }]
}
```

---

## **Implementation Plan**

### **Phase 1: Setup & Backup (Day 1 - Morning)**

#### **Step 1.1: Create Backups**
```bash
ssh azureuser@20.170.155.53

# Backup current configuration
cd /home/azureuser/translation-app/monitoring
cp database-api-server.js database-api-server.js.backup-$(date +%Y%m%d)
pm2 save

# Create implementation directory
mkdir -p /home/azureuser/translation-app/monitoring/enhanced
```

#### **Step 1.2: Install Dependencies**
```bash
cd /home/azureuser/translation-app/monitoring
npm install pg               # For PostgreSQL checks
npm install @pm2/io          # For PM2 metrics (optional)
```

### **Phase 2: Create New Checker Modules (Day 1 - Afternoon)**

#### **Step 2.1: Create Component Checkers**
Create file: `/home/azureuser/translation-app/monitoring/component-checkers.js`

```javascript
const { exec } = require('child_process');
const net = require('net');
const dgram = require('dgram');
const http = require('http');
const https = require('https');
const { Client } = require('pg');
const { promisify } = require('util');
const execAsync = promisify(exec);

// === ASTERISK CHECKS ===
async function checkAsteriskCore() {
  try {
    const { stdout: pidOutput } = await execAsync('pgrep -x asterisk');
    const pid = pidOutput.trim();

    // Get Asterisk metrics
    const { stdout: channels } = await execAsync('asterisk -rx "core show channels count"');
    const { stdout: calls } = await execAsync('asterisk -rx "core show calls count"');
    const { stdout: peers } = await execAsync('asterisk -rx "sip show peers"');
    const { stdout: bridges } = await execAsync('asterisk -rx "confbridge list"');

    // Parse channels
    const channelMatch = channels.match(/(\d+) active channel/);
    const activeChannels = channelMatch ? parseInt(channelMatch[1]) : 0;

    // Parse calls
    const callMatch = calls.match(/(\d+) active call/);
    const activeCalls = callMatch ? parseInt(callMatch[1]) : 0;

    // Parse SIP peers
    const peerLines = peers.split('\n').filter(l => l.includes('/'));
    const onlinePeers = peerLines.filter(l => l.includes('OK')).length;
    const totalPeers = peerLines.length;

    // Parse conference bridges
    const bridgeLines = bridges.split('\n').filter(l => l.trim() && !l.includes('Conference'));
    const conferenceBridges = bridgeLines.length;

    return {
      status: 'LIVE',
      pid: parseInt(pid),
      metrics: {
        active_channels: activeChannels,
        active_calls: activeCalls,
        sip_peers_online: onlinePeers,
        sip_peers_total: totalPeers,
        conference_bridges: conferenceBridges
      }
    };
  } catch (error) {
    return {
      status: 'DEAD',
      error: error.message,
      metrics: {
        active_channels: 0,
        active_calls: 0,
        sip_peers_online: 0,
        sip_peers_total: 0,
        conference_bridges: 0
      }
    };
  }
}

async function checkAsteriskARI() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 8088,
      path: '/ari/asterisk/info',
      auth: 'dev:asterisk',
      timeout: 5000
    };

    const req = http.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const info = JSON.parse(data);

          // Get additional ARI metrics
          const channelOptions = {
            ...options,
            path: '/ari/channels'
          };

          http.get(channelOptions, (channelRes) => {
            let channelData = '';
            channelRes.on('data', chunk => channelData += chunk);
            channelRes.on('end', () => {
              const channels = JSON.parse(channelData);
              resolve({
                status: 'LIVE',
                metrics: {
                  version: info.system?.version,
                  entity_id: info.system?.entity_id,
                  active_channels: channels.length,
                  websocket_connections: 0  // Would need WebSocket probe
                }
              });
            });
          });
        } catch (e) {
          resolve({ status: 'DEAD', error: e.message });
        }
      });
    });

    req.on('error', (e) => resolve({ status: 'DEAD', error: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 'DEAD', error: 'Timeout' });
    });
  });
}

async function checkAsteriskAMI() {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve({ status: 'DEAD', error: 'Timeout' });
    }, 5000);

    socket.connect(5038, 'localhost', () => {
      clearTimeout(timeout);
      socket.end();
      resolve({
        status: 'LIVE',
        metrics: {
          connected_clients: 0,  // Would need AMI login to get
          events_per_second: 0
        }
      });
    });

    socket.on('error', () => {
      clearTimeout(timeout);
      resolve({ status: 'DEAD' });
    });
  });
}

// === UDP SOCKET CHECKS ===
async function checkUDPSocket(port) {
  return new Promise((resolve) => {
    exec(`ss -unH | grep ":${port}"`, (error, stdout) => {
      if (!error && stdout) {
        const parts = stdout.trim().split(/\s+/);
        resolve({
          status: 'ACTIVE',
          metrics: {
            recv_queue: parseInt(parts[1]) || 0,
            send_queue: parseInt(parts[2]) || 0,
            packets_per_second: 0  // Would need packet capture
          }
        });
      } else {
        resolve({ status: 'INACTIVE' });
      }
    });
  });
}

// === EXTERNAL MEDIA CHECKS ===
async function checkExternalMedia(port) {
  return new Promise((resolve) => {
    // Check if port is listening
    exec(`ss -tlnH | grep ":${port}"`, (error, stdout) => {
      if (!error && stdout) {
        resolve({
          status: 'LIVE',
          metrics: {
            rtp_packets_in: 0,    // Would need RTP stats
            rtp_packets_out: 0,
            audio_format: 'PCMU',
            connected_extensions: []
          }
        });
      } else {
        resolve({ status: 'DEAD' });
      }
    });
  });
}

// === POSTGRESQL CHECK ===
async function checkPostgreSQL() {
  try {
    const client = new Client({
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: process.env.PG_PASSWORD || ''
    });

    await client.connect();

    // Get database size
    const dbSize = await client.query(`
      SELECT pg_database_size('postgres') as size
    `);

    // Get connection stats
    const connections = await client.query(`
      SELECT
        count(*) as total,
        count(*) FILTER (WHERE state = 'active') as active,
        count(*) FILTER (WHERE state = 'idle') as idle
      FROM pg_stat_activity
      WHERE datname = 'postgres'
    `);

    await client.end();

    return {
      status: 'LIVE',
      metrics: {
        database_size_mb: Math.round(dbSize.rows[0].size / 1024 / 1024),
        active_connections: parseInt(connections.rows[0].active),
        idle_connections: parseInt(connections.rows[0].idle),
        total_connections: parseInt(connections.rows[0].total)
      }
    };
  } catch (error) {
    return {
      status: 'DEAD',
      error: error.message,
      metrics: {
        database_size_mb: 0,
        active_connections: 0,
        idle_connections: 0,
        total_connections: 0
      }
    };
  }
}

// === EXTERNAL API CHECKS ===
async function checkDeepgramAPI() {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.deepgram.com',
      port: 443,
      path: '/v1/projects',
      method: 'GET',
      headers: {
        'Authorization': 'Token 806ac77eb08d83390c265228dd2cc89c0b86f23e'
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      const latency = Date.now() - startTime;
      resolve({
        status: res.statusCode === 200 ? 'HEALTHY' : 'DEGRADED',
        metrics: {
          response_time_ms: latency,
          status_code: res.statusCode,
          error_rate: res.statusCode >= 400 ? 100 : 0
        }
      });
    });

    req.on('error', () => resolve({
      status: 'DOWN',
      metrics: { error_rate: 100 }
    }));

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 'DOWN',
        error: 'Timeout',
        metrics: { error_rate: 100 }
      });
    });

    req.end();
  });
}

async function checkDeepLAPI() {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const options = {
      hostname: 'api-free.deepl.com',
      port: 443,
      path: '/v2/usage',
      method: 'GET',
      headers: {
        'Authorization': 'DeepL-Auth-Key d7ec78e4-8fbb-4a34-b265-becea2b269ad'
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const latency = Date.now() - startTime;
        try {
          const usage = JSON.parse(data);
          resolve({
            status: res.statusCode === 200 ? 'HEALTHY' : 'DEGRADED',
            metrics: {
              response_time_ms: latency,
              status_code: res.statusCode,
              characters_translated: usage.character_count || 0,
              quota_remaining: usage.character_limit - usage.character_count || 0,
              error_rate: res.statusCode >= 400 ? 100 : 0
            }
          });
        } catch (e) {
          resolve({
            status: 'DEGRADED',
            error: e.message,
            metrics: { error_rate: 100 }
          });
        }
      });
    });

    req.on('error', () => resolve({
      status: 'DOWN',
      metrics: { error_rate: 100 }
    }));

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 'DOWN',
        error: 'Timeout',
        metrics: { error_rate: 100 }
      });
    });

    req.end();
  });
}

async function checkElevenLabsAPI() {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: '/v1/user',
      method: 'GET',
      headers: {
        'xi-api-key': 'sk_968d6d3e5b92cfce648ce9a38478ee131d98750ef4e09f05'
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const latency = Date.now() - startTime;
        try {
          const user = JSON.parse(data);
          resolve({
            status: res.statusCode === 200 ? 'HEALTHY' : 'DEGRADED',
            metrics: {
              response_time_ms: latency,
              status_code: res.statusCode,
              character_count: user.subscription?.character_count || 0,
              character_limit: user.subscription?.character_limit || 0,
              error_rate: res.statusCode >= 400 ? 100 : 0
            }
          });
        } catch (e) {
          resolve({
            status: 'DEGRADED',
            error: e.message,
            metrics: { error_rate: 100 }
          });
        }
      });
    });

    req.on('error', () => resolve({
      status: 'DOWN',
      metrics: { error_rate: 100 }
    }));

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 'DOWN',
        error: 'Timeout',
        metrics: { error_rate: 100 }
      });
    });

    req.end();
  });
}

async function checkHumeAPI() {
  // Hume uses WebSocket, simplified health check
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.hume.ai',
      port: 443,
      path: '/v0/models',
      method: 'GET',
      headers: {
        'X-Hume-Api-Key': 'ZO4I7zffvMCBTwytSvoCnSI9CrZjYfjdytH0039ST3CGgi1I'
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      resolve({
        status: res.statusCode === 200 ? 'HEALTHY' : 'DEGRADED',
        metrics: {
          status_code: res.statusCode,
          websocket_connections: 0,  // Would need to track from STTTTSserver
          error_rate: res.statusCode >= 400 ? 100 : 0
        }
      });
    });

    req.on('error', () => resolve({
      status: 'DOWN',
      metrics: { error_rate: 100 }
    }));

    req.end();
  });
}

// === HMLCP CHECK ===
async function checkHMLCP() {
  try {
    const { stdout } = await execAsync('ls -1 /tmp/hmlcp-profiles/*.json 2>/dev/null | wc -l');
    const profileCount = parseInt(stdout.trim()) || 0;

    return {
      status: profileCount > 0 ? 'ACTIVE' : 'INACTIVE',
      metrics: {
        active_profiles: profileCount,
        total_profiles: profileCount,
        corrections_today: 0,  // Would need to parse profiles
        vocabulary_terms: 0,
        avg_calibration_index: 0
      }
    };
  } catch (error) {
    return {
      status: 'INACTIVE',
      metrics: {
        active_profiles: 0,
        total_profiles: 0
      }
    };
  }
}

// === PM2 METRICS ===
async function getPM2Metrics(processName) {
  return new Promise((resolve) => {
    const pm2 = require('pm2');

    pm2.describe(processName, (err, processDesc) => {
      if (err || !processDesc || processDesc.length === 0) {
        resolve({});
        return;
      }

      const proc = processDesc[0];
      const monit = proc.monit || {};
      const env = proc.pm2_env || {};

      const metrics = {
        heap_used_mb: monit.memory ? Math.round(monit.memory / 1024 / 1024) : 0,
        cpu: monit.cpu || 0,
        restart_time: env.restart_time || 0,
        unstable_restarts: env.unstable_restarts || 0,
        status: env.status || 'unknown',
        exec_mode: env.exec_mode || 'fork',
        instances: env.instances || 1,
        uptime: env.pm_uptime ? Date.now() - env.pm_uptime : 0,
        event_loop_lag_ms: 0,  // Would need @pm2/io integration
        active_handles: 0,
        active_requests: 0
      };

      resolve(metrics);
    });
  });
}

// === SYSTEM METRICS ===
async function getSystemMetrics() {
  try {
    // CPU metrics
    const { stdout: loadAvg } = await execAsync('cat /proc/loadavg');
    const loads = loadAvg.trim().split(' ');

    // Memory metrics
    const { stdout: memInfo } = await execAsync('free -m | grep Mem');
    const memParts = memInfo.trim().split(/\s+/);

    // Disk metrics
    const { stdout: diskInfo } = await execAsync('df -h / | tail -1');
    const diskParts = diskInfo.trim().split(/\s+/);

    // Network metrics (simplified)
    const { stdout: netInfo } = await execAsync('cat /proc/net/dev | grep eth0 || cat /proc/net/dev | grep ens');
    const netParts = netInfo.trim().split(/\s+/);

    return {
      cpu: {
        loadAvg1min: parseFloat(loads[0]),
        loadAvg5min: parseFloat(loads[1]),
        loadAvg15min: parseFloat(loads[2]),
        cores: require('os').cpus().length
      },
      memory: {
        total_mb: parseInt(memParts[1]),
        used_mb: parseInt(memParts[2]),
        free_mb: parseInt(memParts[3]),
        usage_percent: Math.round((parseInt(memParts[2]) / parseInt(memParts[1])) * 100)
      },
      disk: {
        usage_percent: parseInt(diskParts[4]),
        free_gb: parseFloat(diskParts[3]),
        total_gb: parseFloat(diskParts[1])
      },
      network: {
        bytes_received: parseInt(netParts[2]) || 0,
        bytes_transmitted: parseInt(netParts[10]) || 0
      },
      uptime: {
        system_seconds: parseFloat(require('fs').readFileSync('/proc/uptime', 'utf8').split(' ')[0])
      }
    };
  } catch (error) {
    console.error('System metrics error:', error);
    return {
      cpu: { loadAvg1min: 0, loadAvg5min: 0, loadAvg15min: 0 },
      memory: { total_mb: 0, used_mb: 0, free_mb: 0 },
      disk: { usage_percent: 0 },
      network: { bytes_received: 0, bytes_transmitted: 0 }
    };
  }
}

module.exports = {
  checkAsteriskCore,
  checkAsteriskARI,
  checkAsteriskAMI,
  checkUDPSocket,
  checkExternalMedia,
  checkPostgreSQL,
  checkDeepgramAPI,
  checkDeepLAPI,
  checkElevenLabsAPI,
  checkHumeAPI,
  checkHMLCP,
  getPM2Metrics,
  getSystemMetrics
};
```

#### **Step 2.2: Create Metrics Collector**
Create file: `/home/azureuser/translation-app/monitoring/metrics-collector.js`

```javascript
const io = require('socket.io-client');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class MetricsCollector {
  constructor() {
    this.metrics = new Map();
    this.intervals = new Map();
    this.history = new Map();  // Store historical data
  }

  start() {
    console.log('[MetricsCollector] Starting metrics collection...');

    // Connect to monitoring server on actual port 3001 (not 8090)
    this.monitoringSocket = io('http://localhost:3001', {
      reconnection: true,
      reconnectionDelay: 5000
    });

    this.monitoringSocket.on('connect', () => {
      console.log('[MetricsCollector] Connected to monitoring server');
    });

    // Collect UDP metrics every 5 seconds
    this.intervals.set('udp', setInterval(() => this.collectUDPMetrics(), 5000));

    // Collect Asterisk metrics every 10 seconds
    this.intervals.set('asterisk', setInterval(() => this.collectAsteriskMetrics(), 10000));

    // Collect network stats every 30 seconds
    this.intervals.set('network', setInterval(() => this.collectNetworkStats(), 30000));

    // Listen for Socket.IO events from STTTTSserver
    this.monitoringSocket.on('elevenlabsMetrics', (data) => {
      this.metrics.set('elevenlabs-live', {
        ...data,
        timestamp: Date.now()
      });
    });

    this.monitoringSocket.on('emotionData', (data) => {
      this.metrics.set('hume-emotions', {
        arousal: data.arousal,
        valence: data.valence,
        energy: data.energy,
        timestamp: Date.now()
      });
    });

    this.monitoringSocket.on('translatedAudio', (data) => {
      this.incrementCounter('translations');
    });

    this.monitoringSocket.on('transcriptionFinal', (data) => {
      this.incrementCounter('transcriptions');
    });
  }

  async collectUDPMetrics() {
    try {
      const { stdout } = await execAsync('ss -unH | grep -E ":(6120|6121|6122|6123)"');
      const lines = stdout.trim().split('\n').filter(l => l);

      lines.forEach(line => {
        const parts = line.split(/\s+/);
        const localAddr = parts[3];
        const port = localAddr?.split(':').pop();

        if (port) {
          const recvQ = parseInt(parts[1]) || 0;
          const sendQ = parseInt(parts[2]) || 0;

          this.metrics.set(`udp-${port}`, {
            recv_queue: recvQ,
            send_queue: sendQ,
            timestamp: Date.now()
          });

          // Calculate packets per second based on queue changes
          const prevMetric = this.history.get(`udp-${port}`);
          if (prevMetric) {
            const timeDiff = (Date.now() - prevMetric.timestamp) / 1000;
            const packetRate = Math.abs(recvQ - prevMetric.recv_queue) / timeDiff;
            this.metrics.set(`udp-${port}-rate`, {
              packets_per_second: Math.round(packetRate)
            });
          }

          this.history.set(`udp-${port}`, { recv_queue: recvQ, timestamp: Date.now() });
        }
      });
    } catch (error) {
      console.error('[MetricsCollector] UDP metrics error:', error.message);
    }
  }

  async collectAsteriskMetrics() {
    try {
      // Get active channels with details
      const { stdout: channels } = await execAsync('asterisk -rx "core show channels verbose" 2>/dev/null');
      const channelLines = channels.split('\n').filter(l => l.includes('Channel'));

      // Get codec translation stats
      const { stdout: translations } = await execAsync('asterisk -rx "core show translation" 2>/dev/null | head -5');

      // Get conference bridges
      const { stdout: conferences } = await execAsync('asterisk -rx "confbridge list" 2>/dev/null');
      const confLines = conferences.split('\n').filter(l => l.trim() && !l.includes('Conference'));

      this.metrics.set('asterisk-details', {
        active_channels: channelLines.length,
        conference_count: confLines.length,
        codecs_active: this.parseCodecs(translations),
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('[MetricsCollector] Asterisk metrics error:', error.message);
    }
  }

  async collectNetworkStats() {
    try {
      // TCP connection count by port
      const { stdout: tcpStats } = await execAsync('ss -tn | grep ESTAB | wc -l');
      const { stdout: udpStats } = await execAsync('ss -un | wc -l');

      this.metrics.set('network-connections', {
        tcp_established: parseInt(tcpStats.trim()),
        udp_sockets: parseInt(udpStats.trim()),
        timestamp: Date.now()
      });

      // Port-specific connections
      const ports = [3020, 8083, 3001, 8090, 6120, 6121, 6122, 6123];
      for (const port of ports) {
        const { stdout } = await execAsync(`ss -tn sport = :${port} or dport = :${port} | grep ESTAB | wc -l`).catch(() => ({ stdout: '0' }));
        this.metrics.set(`port-${port}-connections`, parseInt(stdout.trim()));
      }
    } catch (error) {
      console.error('[MetricsCollector] Network stats error:', error.message);
    }
  }

  parseCodecs(translationOutput) {
    // Extract codec names from translation matrix
    const codecs = [];
    const lines = translationOutput.split('\n');
    if (lines[0]) {
      const codecNames = lines[0].trim().split(/\s+/);
      codecs.push(...codecNames.filter(c => c && c !== 'Translation'));
    }
    return codecs;
  }

  incrementCounter(name) {
    const current = this.metrics.get(`counter-${name}`) || 0;
    this.metrics.set(`counter-${name}`, current + 1);
  }

  getMetrics(key) {
    return this.metrics.get(key) || {};
  }

  getAllMetrics() {
    const result = {};
    this.metrics.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  getCounterRate(name, periodSeconds = 60) {
    const count = this.metrics.get(`counter-${name}`) || 0;
    return Math.round(count / periodSeconds);
  }

  stop() {
    this.intervals.forEach(interval => clearInterval(interval));
    if (this.monitoringSocket) {
      this.monitoringSocket.disconnect();
    }
  }
}

// Export singleton instance
const collector = new MetricsCollector();
module.exports = collector;
```

### **Phase 3: Modify Database API Server (Day 2)**

#### **Step 3.1: Update database-api-server.js**
**ONLY FILE TO MODIFY:** `/home/azureuser/translation-app/monitoring/database-api-server.js`

Add at the top:
```javascript
const checkers = require('./component-checkers');
const metricsCollector = require('./metrics-collector');

// Start metrics collector
metricsCollector.start();
```

Extend `monitoredComponents` array:
```javascript
const monitoredComponents = [
  // === KEEP ALL EXISTING COMPONENTS ===
  // ... existing 11 components ...

  // === ADD NEW COMPONENTS ===
  // Asterisk Core
  {
    id: "asterisk-core",
    name: "asterisk",
    checkCommand: "pgrep -x asterisk",
    port: 5060,
    layer: "telephony",
    critical: true,
    checkType: "asterisk"
  },
  {
    id: "asterisk-ari",
    name: "ARI Interface",
    port: 8088,
    layer: "telephony",
    critical: true,
    checkType: "asterisk-ari"
  },
  {
    id: "asterisk-ami",
    name: "AMI Interface",
    port: 5038,
    layer: "telephony",
    critical: false,
    checkType: "asterisk-ami"
  },

  // External Media
  {
    id: "externalmedia-7777",
    name: "ExternalMedia 7777",
    port: 7777,
    layer: "media",
    critical: true,
    checkType: "external-media"
  },
  {
    id: "externalmedia-8888",
    name: "ExternalMedia 8888",
    port: 8888,
    layer: "media",
    critical: true,
    checkType: "external-media"
  },

  // AudioSocket (disabled)
  {
    id: "audiosocket-5050",
    name: "AudioSocket",
    port: 5050,
    layer: "media",
    critical: false,
    enabled: false,
    checkType: "disabled"
  },

  // UDP Sockets
  {
    id: "udp-socket-6120",
    name: "UDP In 3333",
    port: 6120,
    layer: "transport",
    critical: true,
    checkType: "udp",
    direction: "inbound",
    extension: "3333"
  },
  {
    id: "udp-socket-6121",
    name: "UDP Out 3333",
    port: 6121,
    layer: "transport",
    critical: true,
    checkType: "udp",
    direction: "outbound",
    extension: "3333"
  },
  {
    id: "udp-socket-6122",
    name: "UDP In 4444",
    port: 6122,
    layer: "transport",
    critical: true,
    checkType: "udp",
    direction: "inbound",
    extension: "4444"
  },
  {
    id: "udp-socket-6123",
    name: "UDP Out 4444",
    port: 6123,
    layer: "transport",
    critical: true,
    checkType: "udp",
    direction: "outbound",
    extension: "4444"
  },

  // Database
  {
    id: "postgresql",
    name: "PostgreSQL",
    port: 5432,
    layer: "database",
    critical: false,
    checkType: "postgresql"
  },

  // External APIs
  {
    id: "deepgram-api",
    name: "Deepgram API",
    layer: "external",
    critical: true,
    checkType: "external-api",
    apiName: "deepgram"
  },
  {
    id: "deepl-api",
    name: "DeepL API",
    layer: "external",
    critical: true,
    checkType: "external-api",
    apiName: "deepl"
  },
  {
    id: "elevenlabs-api",
    name: "ElevenLabs API",
    layer: "external",
    critical: true,
    checkType: "external-api",
    apiName: "elevenlabs"
  },
  {
    id: "hume-api",
    name: "Hume API",
    layer: "external",
    critical: false,
    checkType: "external-api",
    apiName: "hume"
  },

  // ML/AI Systems
  {
    id: "hmlcp-system",
    name: "HMLCP Profiles",
    layer: "ml",
    critical: false,
    checkType: "hmlcp"
  },

  // Timing Server (disabled)
  {
    id: "timing-server",
    name: "Timing Server",
    port: 6000,
    layer: "timing",
    critical: false,
    enabled: false,
    checkType: "disabled"
  }
];
```

Update `getComponentHealth` function:
```javascript
async function getComponentHealth(component) {
  // Skip disabled components
  if (component.enabled === false) {
    return {
      status: 'DISABLED',
      enabled: false,
      message: 'Component is disabled'
    };
  }

  let result = {};

  // Handle different check types
  switch (component.checkType) {
    case 'process':
      // Existing pgrep logic
      result = await checkProcessHealth(component);
      break;

    case 'pm2':
      // Existing PM2 logic
      result = await checkPM2Health(component);
      break;

    case 'asterisk':
      result = await checkers.checkAsteriskCore();
      break;

    case 'asterisk-ari':
      result = await checkers.checkAsteriskARI();
      break;

    case 'asterisk-ami':
      result = await checkers.checkAsteriskAMI();
      break;

    case 'udp':
      result = await checkers.checkUDPSocket(component.port);
      // Add live metrics
      const udpMetrics = metricsCollector.getMetrics(`udp-${component.port}`);
      const udpRate = metricsCollector.getMetrics(`udp-${component.port}-rate`);
      if (udpMetrics) {
        result.metrics = {
          ...result.metrics,
          recv_queue: udpMetrics.recv_queue,
          send_queue: udpMetrics.send_queue,
          packets_per_second: udpRate.packets_per_second || 0
        };
      }
      break;

    case 'external-media':
      result = await checkers.checkExternalMedia(component.port);
      break;

    case 'postgresql':
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
          const elevenLabsMetrics = metricsCollector.getMetrics('elevenlabs-live');
          if (elevenLabsMetrics) {
            result.metrics = { ...result.metrics, ...elevenLabsMetrics };
          }
          break;
        case 'hume':
          result = await checkers.checkHumeAPI();
          const humeMetrics = metricsCollector.getMetrics('hume-emotions');
          if (humeMetrics) {
            result.metrics = {
              ...result.metrics,
              avg_arousal: humeMetrics.arousal,
              avg_valence: humeMetrics.valence,
              avg_energy: humeMetrics.energy
            };
          }
          break;
      }
      break;

    case 'hmlcp':
      result = await checkers.checkHMLCP();
      break;

    case 'disabled':
      result = { status: 'DISABLED', enabled: false };
      break;

    default:
      // Fallback to existing logic
      result = await checkProcessHealth(component);
  }

  // Add PM2 metrics if available
  if (component.pm2Name) {
    result.pm2_metrics = await checkers.getPM2Metrics(component.pm2Name);
  }

  return result;
}
```

Enhanced `/api/health/system` endpoint:
```javascript
app.get('/api/health/system', async (req, res) => {
  const startTime = Date.now();

  const health = {
    status: 'operational',
    timestamp: new Date().toISOString(),
    summary: {
      total_components: monitoredComponents.length,
      components_live: 0,
      components_dead: 0,
      components_disabled: 0,
      critical_failures: [],
      warnings: []
    },
    layers: {},
    components: {},
    asterisk_health: {},
    pipeline_health: {},
    external_apis: {},
    system: await checkers.getSystemMetrics()
  };

  // Check all components in parallel for speed
  const componentChecks = await Promise.all(
    monitoredComponents.map(async (component) => {
      const componentHealth = await getComponentHealth(component);
      return { component, health: componentHealth };
    })
  );

  // Process results
  componentChecks.forEach(({ component, health: componentHealth }) => {
    // Store component health
    health.components[component.id] = {
      ...componentHealth,
      name: component.name,
      port: component.port,
      layer: component.layer,
      critical: component.critical,
      lastCheck: new Date().toISOString()
    };

    // Update summary
    if (componentHealth.status === 'DISABLED') {
      health.summary.components_disabled++;
    } else if (['LIVE', 'HEALTHY', 'ACTIVE'].includes(componentHealth.status)) {
      health.summary.components_live++;
    } else {
      health.summary.components_dead++;
      if (component.critical) {
        health.summary.critical_failures.push(component.id);
      }
    }

    // Check for high restart counts (warning)
    if (componentHealth.pm2_metrics?.restart_time > 100) {
      health.summary.warnings.push(`high_restart_count:${component.id}`);
    }

    // Group by layer
    if (!health.layers[component.layer]) {
      health.layers[component.layer] = {
        status: 'HEALTHY',
        components: 0,
        failed: 0,
        disabled: 0
      };
    }
    health.layers[component.layer].components++;

    if (componentHealth.status === 'DISABLED') {
      health.layers[component.layer].disabled++;
    } else if (!['LIVE', 'HEALTHY', 'ACTIVE'].includes(componentHealth.status)) {
      health.layers[component.layer].failed++;
      if (health.layers[component.layer].failed > 0) {
        health.layers[component.layer].status = 'DEGRADED';
      }
    }
  });

  // Aggregate Asterisk health
  if (health.components['asterisk-core']?.metrics) {
    health.asterisk_health = {
      sip_registrations: health.components['asterisk-core'].metrics.sip_peers_online || 0,
      active_calls: health.components['asterisk-core'].metrics.active_calls || 0,
      active_channels: health.components['asterisk-core'].metrics.active_channels || 0,
      conference_bridges: health.components['asterisk-core'].metrics.conference_bridges || 0,
      ari_status: health.components['asterisk-ari']?.status || 'UNKNOWN',
      ami_status: health.components['asterisk-ami']?.status || 'UNKNOWN'
    };
  }

  // Aggregate external API health
  ['deepgram-api', 'deepl-api', 'elevenlabs-api', 'hume-api'].forEach(apiId => {
    if (health.components[apiId]) {
      health.external_apis[apiId] = {
        status: health.components[apiId].status,
        error_rate: health.components[apiId].metrics?.error_rate || 0,
        latency_ms: health.components[apiId].metrics?.response_time_ms || 0
      };
    }
  });

  // Calculate pipeline health (simplified)
  health.pipeline_health = {
    stt_status: health.components['deepgram-api']?.status || 'UNKNOWN',
    translation_status: health.components['deepl-api']?.status || 'UNKNOWN',
    tts_status: health.components['elevenlabs-api']?.status || 'UNKNOWN',
    emotion_status: health.components['hume-api']?.status || 'UNKNOWN',
    translations_per_minute: metricsCollector.getCounterRate('translations', 60),
    transcriptions_per_minute: metricsCollector.getCounterRate('transcriptions', 60)
  };

  // Determine overall status
  if (health.summary.critical_failures.length > 0) {
    health.status = 'critical';
  } else if (health.summary.components_dead > 0) {
    health.status = 'degraded';
  } else if (health.summary.warnings.length > 2) {
    health.status = 'warning';
  }

  // Add response time
  health.response_time_ms = Date.now() - startTime;

  res.json(health);
});
```

Add new endpoints:
```javascript
// Individual component health
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

// Live metrics
app.get('/api/metrics/:component?', (req, res) => {
  const { component } = req.params;

  if (component) {
    const metrics = metricsCollector.getMetrics(component);
    res.json(metrics);
  } else {
    const allMetrics = metricsCollector.getAllMetrics();
    res.json(allMetrics);
  }
});

// Layer health
app.get('/api/health/layers', async (req, res) => {
  const layers = {};

  for (const component of monitoredComponents) {
    if (!layers[component.layer]) {
      layers[component.layer] = {
        components: [],
        total: 0,
        healthy: 0,
        failed: 0
      };
    }

    const health = await getComponentHealth(component);
    layers[component.layer].components.push({
      id: component.id,
      status: health.status
    });
    layers[component.layer].total++;

    if (['LIVE', 'HEALTHY', 'ACTIVE'].includes(health.status)) {
      layers[component.layer].healthy++;
    } else if (health.status !== 'DISABLED') {
      layers[component.layer].failed++;
    }
  }

  res.json(layers);
});

// External API aggregated health
app.get('/api/health/external-apis', async (req, res) => {
  const apis = {};

  for (const component of monitoredComponents.filter(c => c.layer === 'external')) {
    const health = await getComponentHealth(component);
    apis[component.id] = {
      name: component.name,
      status: health.status,
      metrics: health.metrics
    };
  }

  res.json(apis);
});
```

### **Phase 4: Testing & Validation (Day 3)**

#### **Step 4.1: Create Test Script**
Create file: `/home/azureuser/translation-app/monitoring/test-health.sh`

```bash
#!/bin/bash

echo "=== Testing Enhanced Health Monitoring System ==="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local endpoint=$1
    local description=$2

    echo -n "Testing $description: "

    response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8083$endpoint")

    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $response)"

        # Get sample data
        if [ "$3" = "show" ]; then
            curl -s "http://localhost:8083$endpoint" | jq '.' | head -20
        fi
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $response)"
    fi
}

echo "1. Testing Main Endpoints"
echo "========================="
test_endpoint "/api/health/system" "Complete System Health" "show"
test_endpoint "/api/health/layers" "Layer Health"
test_endpoint "/api/health/external-apis" "External APIs"
test_endpoint "/api/metrics" "Live Metrics"

echo ""
echo "2. Testing Individual Components"
echo "================================="
components=(
    "asterisk-core"
    "asterisk-ari"
    "postgresql"
    "deepgram-api"
    "udp-socket-6120"
    "externalmedia-7777"
)

for component in "${components[@]}"; do
    test_endpoint "/api/health/component/$component" "$component"
done

echo ""
echo "3. Performance Test"
echo "==================="
echo -n "Response time test (10 requests): "
total_time=0
for i in {1..10}; do
    start=$(date +%s%N)
    curl -s "http://localhost:8083/api/health/system" > /dev/null
    end=$(date +%s%N)
    elapsed=$((($end - $start) / 1000000))
    total_time=$(($total_time + $elapsed))
done
avg_time=$(($total_time / 10))
echo "Average: ${avg_time}ms"

if [ $avg_time -lt 2000 ]; then
    echo -e "${GREEN}✓ Performance OK${NC} (target: <2000ms)"
else
    echo -e "${YELLOW}⚠ Performance Warning${NC} (target: <2000ms)"
fi

echo ""
echo "4. Testing External Access"
echo "=========================="
echo -n "Testing via Cloudflare tunnel: "
tunnel_response=$(curl -s -o /dev/null -w "%{http_code}" "https://tun.monitoringavailable.uk/api/health/system")
if [ "$tunnel_response" = "200" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC} (HTTP $tunnel_response)"
fi

echo ""
echo "=== Test Complete ==="
```

Make it executable:
```bash
chmod +x test-health.sh
```

#### **Step 4.2: Run Tests**
```bash
cd /home/azureuser/translation-app/monitoring
./test-health.sh
```

### **Phase 5: Deployment (Day 3-4)**

#### **Step 5.1: Deploy with PM2**
```bash
# Stop current service gracefully
pm2 stop database-api-server

# Start with new configuration
pm2 start database-api-server.js --name database-api-server \
  --max-memory-restart 200M \
  --min-uptime 10s \
  --max-restarts 10 \
  --error-file /tmp/db-api-error.log \
  --out-file /tmp/db-api-out.log \
  --merge-logs \
  --time

# Start metrics collector
pm2 start metrics-collector.js --name metrics-collector \
  --max-memory-restart 100M

# Save PM2 configuration
pm2 save
pm2 startup

# Monitor logs
pm2 logs database-api-server --lines 50
```

#### **Step 5.2: Verify Deployment**
```bash
# Check PM2 status
pm2 status

# Test health endpoint
curl http://localhost:8083/api/health/system | jq '.summary'

# Check via tunnel
curl https://tun.monitoringavailable.uk/api/health/system | jq '.status'
```

### **Phase 6: Monitoring Dashboard Update (Day 4)**

#### **Step 6.1: Create Dashboard Updater**
Create file: `/home/azureuser/translation-app/monitoring/update-dashboard.js`

```javascript
const http = require('http');
const https = require('https');
const fs = require('fs');

class DashboardUpdater {
  constructor() {
    this.healthData = {};
    this.updateInterval = 5000; // 5 seconds
  }

  start() {
    console.log('[DashboardUpdater] Starting dashboard updates...');
    this.update();
    setInterval(() => this.update(), this.updateInterval);
  }

  async update() {
    try {
      // Fetch health data
      const healthData = await this.fetchHealth();
      this.healthData = healthData;

      // Generate dashboard HTML
      const html = this.generateDashboard(healthData);

      // Save to file
      fs.writeFileSync('/tmp/monitoring-dashboard.html', html);

      console.log(`[DashboardUpdater] Updated at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('[DashboardUpdater] Error:', error.message);
    }
  }

  fetchHealth() {
    return new Promise((resolve, reject) => {
      http.get('http://localhost:8083/api/health/system', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }

  generateDashboard(health) {
    const statusColor = {
      operational: '#10b981',
      degraded: '#f59e0b',
      critical: '#ef4444',
      warning: '#f59e0b'
    };

    return `<!DOCTYPE html>
<html>
<head>
  <title>System Monitoring Dashboard</title>
  <meta http-equiv="refresh" content="5">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 20px;
      margin: 0;
    }
    .header {
      background: #1e293b;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .status {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      text-transform: uppercase;
      background: ${statusColor[health.status] || '#6b7280'};
      color: white;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    .card {
      background: #1e293b;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .card h3 {
      margin-top: 0;
      color: #94a3b8;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .metric {
      font-size: 32px;
      font-weight: 700;
      margin: 10px 0;
    }
    .component {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #334155;
    }
    .component:last-child {
      border-bottom: none;
    }
    .component-name {
      font-size: 14px;
    }
    .component-status {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-live { background: #10b981; }
    .status-dead { background: #ef4444; }
    .status-degraded { background: #f59e0b; }
    .status-disabled { background: #6b7280; }
    .layer {
      margin-bottom: 15px;
    }
    .layer-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-weight: 600;
    }
    .progress-bar {
      height: 8px;
      background: #334155;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: #10b981;
      transition: width 0.3s ease;
    }
    .timestamp {
      color: #64748b;
      font-size: 12px;
      margin-top: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0 0 10px 0;">System Monitoring Dashboard</h1>
    <div class="status">${health.status}</div>
    <span style="margin-left: 20px; color: #94a3b8;">
      ${health.summary.components_live}/${health.summary.total_components} Components Active
    </span>
  </div>

  <div class="grid">
    <div class="card">
      <h3>System Overview</h3>
      <div class="metric">${health.summary.components_live}</div>
      <div>Active Components</div>
      <div class="progress-bar" style="margin-top: 10px;">
        <div class="progress-fill" style="width: ${(health.summary.components_live / health.summary.total_components * 100)}%"></div>
      </div>
    </div>

    <div class="card">
      <h3>Asterisk</h3>
      <div class="metric">${health.asterisk_health?.active_calls || 0}</div>
      <div>Active Calls</div>
      <div style="margin-top: 10px; font-size: 14px;">
        Channels: ${health.asterisk_health?.active_channels || 0} |
        SIP: ${health.asterisk_health?.sip_registrations || 0}
      </div>
    </div>

    <div class="card">
      <h3>External APIs</h3>
      ${Object.entries(health.external_apis || {}).map(([api, data]) => `
        <div class="component">
          <span class="component-name">${api.replace('-api', '')}</span>
          <span class="component-status status-${data.status.toLowerCase()}">${data.status}</span>
        </div>
      `).join('')}
    </div>

    <div class="card">
      <h3>System Resources</h3>
      <div style="font-size: 14px;">
        <div class="component">
          <span>CPU Load</span>
          <span>${health.system?.cpu?.loadAvg1min?.toFixed(2) || 'N/A'}</span>
        </div>
        <div class="component">
          <span>Memory</span>
          <span>${health.system?.memory?.usage_percent || 0}%</span>
        </div>
        <div class="component">
          <span>Disk</span>
          <span>${health.system?.disk?.usage_percent || 0}%</span>
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <h3>Component Status by Layer</h3>
    ${Object.entries(health.layers || {}).map(([layer, data]) => `
      <div class="layer">
        <div class="layer-header">
          <span>${layer.charAt(0).toUpperCase() + layer.slice(1)}</span>
          <span>${data.components - data.failed - data.disabled}/${data.components}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${((data.components - data.failed - data.disabled) / data.components * 100)}%"></div>
        </div>
      </div>
    `).join('')}
  </div>

  <div class="timestamp">
    Last Updated: ${new Date(health.timestamp).toLocaleString()} |
    Response Time: ${health.response_time_ms}ms
  </div>
</body>
</html>`;
  }
}

// Start updater
const updater = new DashboardUpdater();
updater.start();

// Serve dashboard on port 8084
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    fs.readFile('/tmp/monitoring-dashboard.html', (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading dashboard');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(8084, () => {
  console.log('[DashboardUpdater] Dashboard available at http://localhost:8084');
});

module.exports = updater;
```

Start dashboard:
```bash
pm2 start update-dashboard.js --name monitoring-dashboard
```

---

## **File Changes Summary**

### **Files Modified: 1**
- `/home/azureuser/translation-app/monitoring/database-api-server.js`

### **Files Created: 4**
- `/home/azureuser/translation-app/monitoring/component-checkers.js`
- `/home/azureuser/translation-app/monitoring/metrics-collector.js`
- `/home/azureuser/translation-app/monitoring/test-health.sh`
- `/home/azureuser/translation-app/monitoring/update-dashboard.js`

### **No Changes Required:**
- ❌ STTTTSserver.js
- ❌ monitoring-server.js
- ❌ monitoring-to-database-bridge.js
- ❌ All gateway files
- ❌ All station handlers
- ❌ HMLCP modules

---

## **Testing & Validation**

### **Automated Tests**
```bash
# Run test suite
./test-health.sh

# Check specific components
curl http://localhost:8083/api/health/component/asterisk-core | jq '.'
curl http://localhost:8083/api/health/component/deepgram-api | jq '.'

# Performance test
time curl http://localhost:8083/api/health/system > /dev/null

# Load test
for i in {1..100}; do
  curl -s http://localhost:8083/api/health/system > /dev/null &
done
wait
```

### **Manual Validation**
1. Access dashboard: http://20.170.155.53:8084
2. Check tunnel: https://tun.monitoringavailable.uk/api/health/system
3. Verify PM2 status: `pm2 status`
4. Check logs: `pm2 logs database-api-server`

---

## **Deployment Strategy**

### **Zero-Downtime Deployment**
```bash
# 1. Test in isolation
node database-api-server.js --test

# 2. Reload with PM2 (zero-downtime)
pm2 reload database-api-server

# 3. Monitor for errors
pm2 logs database-api-server --err --lines 50

# 4. Rollback if needed
cp database-api-server.js.backup database-api-server.js
pm2 reload database-api-server
```

### **Monitoring the Deployment**
```bash
# Watch health status
watch -n 2 'curl -s http://localhost:8083/api/health/system | jq .status'

# Monitor response times
while true; do
  time curl -s http://localhost:8083/api/health/system > /dev/null
  sleep 5
done
```

---

## **Monitoring Without Code Changes**

### **PM2 Modules Installation**
```bash
# System monitoring
pm2 install pm2-server-monit
pm2 install pm2-logrotate
pm2 install pm2-auto-pull

# Network monitoring
pm2 install pm2-net-monitor
pm2 set pm2-net-monitor:ports "3020,6120,6121,6122,6123,8083"

# Process exploration
pm2 install pm2-process-explorer

# Alerting
pm2 install pm2-slack
pm2 set pm2-slack:slack_url "YOUR_WEBHOOK_URL"
pm2 set pm2-slack:event_level error

# Health monitoring
pm2 install pm2-health
pm2 set pm2-health:memory_limit 200
pm2 set pm2-health:cpu_limit 80
```

### **External Monitoring Scripts**
```bash
# Create system monitor
cat > /home/azureuser/monitor-system.sh << 'EOF'
#!/bin/bash
while true; do
  # Collect system metrics
  CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
  MEM=$(free -m | awk 'NR==2{printf "%.1f", $3*100/$2}')
  DISK=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')

  # Collect network stats
  CONNECTIONS=$(ss -tn | grep ESTAB | wc -l)

  # Send to monitoring
  curl -X POST http://localhost:8083/api/external-metrics \
    -H "Content-Type: application/json" \
    -d "{
      \"cpu_percent\": $CPU,
      \"memory_percent\": $MEM,
      \"disk_percent\": $DISK,
      \"tcp_connections\": $CONNECTIONS,
      \"timestamp\": $(date +%s)
    }"

  sleep 30
done
EOF

chmod +x monitor-system.sh
pm2 start monitor-system.sh --name system-monitor
```

---

## **Success Metrics**

### **Implementation Checklist**
- [ ] All 25+ components monitored
- [ ] Response time < 2 seconds
- [ ] PM2 deep metrics integrated
- [ ] Asterisk metrics collected
- [ ] External API health tracked
- [ ] UDP socket metrics live
- [ ] PostgreSQL status monitored
- [ ] HMLCP system tracked
- [ ] Dashboard updated
- [ ] Alerts configured

### **Performance Targets**
- Health endpoint response: < 2000ms
- Memory usage: < 200MB
- CPU usage: < 10% average
- Update frequency: 5-10 seconds
- Data retention: 24 hours

---

## **Maintenance & Operations**

### **Daily Checks**
```bash
# Check component health
curl https://tun.monitoringavailable.uk/api/health/system | jq '.summary'

# Review warnings
curl https://tun.monitoringavailable.uk/api/health/system | jq '.summary.warnings'

# Check external APIs
curl https://tun.monitoringavailable.uk/api/health/external-apis | jq '.'
```

### **Weekly Maintenance**
```bash
# Rotate logs
pm2 flush

# Check disk usage
df -h

# Review high restart counts
pm2 status

# Update dependencies
npm update
```

### **Troubleshooting**

#### High Memory Usage
```bash
pm2 monit
pm2 restart database-api-server
```

#### Component Check Failures
```bash
# Check specific component
curl http://localhost:8083/api/health/component/[component-id]

# Review logs
pm2 logs database-api-server --err

# Test checker function
node -e "require('./component-checkers').checkAsteriskCore().then(console.log)"
```

#### Performance Issues
```bash
# Profile endpoint
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8083/api/health/system

# Check event loop
pm2 monit

# Reduce check frequency
# Edit database-api-server.js check intervals
```

---

## **Conclusion**

This implementation provides comprehensive monitoring of 25+ components with minimal risk:
- **Only 1 file modified** (database-api-server.js)
- **Modular architecture** with separate checker modules
- **Zero-downtime deployment** via PM2
- **Backward compatible** with existing endpoints
- **Performance optimized** with parallel checks
- **Complete visibility** into the entire system stack

The enhanced monitoring system provides deep insights into:
- Asterisk telephony operations
- External API health and quotas
- UDP audio flow metrics
- Database status
- HMLCP machine learning system
- Complete PM2 process metrics

---

*Document Generated: 2025-12-15*
*Implementation Timeline: 4-5 days*
*Risk Level: Low (single file modification)*