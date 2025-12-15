
const http = require('http');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const PORT = 3002; // Different port to avoid conflict

// Database storage
let metricsDatabase = [];
const MAX_SNAPSHOTS = 100; // Keep last 100 snapshots

// Collect metrics from PM2
async function collectMetrics() {
  try {
    // Get PM2 process list with metrics
    const { stdout } = await execPromise('sudo pm2 jlist');
    const processes = JSON.parse(stdout);

    const snapshot = {
      timestamp: new Date().toISOString(),
      services: {}
    };

    // Process each PM2 service
    for (const proc of processes) {
      if (proc.name && proc.name !== 'pm2-logrotate') {
        snapshot.services[proc.name] = {
          name: proc.name,
          status: proc.pm2_env?.status || 'unknown',
          cpu: proc.monit?.cpu || 0,
          memory_mb: (proc.monit?.memory || 0) / 1024 / 1024,
          uptime: proc.pm2_env?.pm_uptime || 0,
          restarts: proc.pm2_env?.restart_time || 0,
          pid: proc.pid || null
        };
      }
    }

    // Add system-wide metrics
    const { stdout: loadAvg } = await execPromise('uptime');
    const loadMatch = loadAvg.match(/load average: ([\d.]+), ([\d.]+), ([\d.]+)/);
    if (loadMatch) {
      snapshot.system = {
        loadAvg1min: parseFloat(loadMatch[1]),
        loadAvg5min: parseFloat(loadMatch[2]),
        loadAvg15min: parseFloat(loadMatch[3])
      };
    }

    // Store in database
    metricsDatabase.unshift(snapshot);
    if (metricsDatabase.length > MAX_SNAPSHOTS) {
      metricsDatabase = metricsDatabase.slice(0, MAX_SNAPSHOTS);
    }

    // Send to database-api-server
    const data = JSON.stringify(snapshot);
    const options = {
      hostname: 'localhost',
      port: 8083,
      path: '/api/monitoring/snapshot',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      console.log(`[Metrics] Sent snapshot to database: ${res.statusCode}`);
    });

    req.on('error', (error) => {
      console.error('[Metrics] Error sending to database:', error.message);
    });

    req.write(data);
    req.end();

    console.log(`[Metrics] Collected metrics for ${Object.keys(snapshot.services).length} services`);

  } catch (error) {
    console.error('[Metrics] Collection error:', error);
  }
}

// HTTP server for local metrics access
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url === '/metrics' || req.url === '/api/metrics') {
    res.writeHead(200);
    res.end(JSON.stringify(metricsDatabase));
  } else if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'healthy', snapshots: metricsDatabase.length }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`[Per-Service Monitoring] Server running on port ${PORT}`);
  console.log('[Per-Service Monitoring] Collecting metrics every 10 seconds...');

  // Collect metrics immediately
  collectMetrics();

  // Then collect every 10 seconds
  setInterval(collectMetrics, 10000);
});
