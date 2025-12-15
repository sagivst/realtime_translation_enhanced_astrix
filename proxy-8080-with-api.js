const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const MONITORING_API_PORT = 3090;
const MONITORING_API_HOST = 'localhost';

const server = http.createServer((req, res) => {
  console.log('[Proxy] Request:', req.method, req.url);

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Forward API requests to monitoring API server on port 3090
  if (req.url.startsWith('/api/')) {
    console.log('[Proxy] Forwarding API request to port', MONITORING_API_PORT);

    const options = {
      hostname: MONITORING_API_HOST,
      port: MONITORING_API_PORT,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${MONITORING_API_HOST}:${MONITORING_API_PORT}`
      }
    };

    const proxyReq = http.request(options, (proxyRes) => {
      console.log('[Proxy] API response status:', proxyRes.statusCode);

      // Forward response headers
      Object.keys(proxyRes.headers).forEach(key => {
        res.setHeader(key, proxyRes.headers[key]);
      });

      res.writeHead(proxyRes.statusCode);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('[Proxy] Error forwarding API request:', err);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Failed to forward API request',
        message: err.message
      }));
    });

    // Forward request body if present
    if (req.method === 'POST' || req.method === 'PUT') {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }

    return;
  }

  // Serve telemetry dashboard for /telemetry URL
  if (req.url === '/telemetry' || req.url === '/telemetry-dashboard' || req.url === '/telemetry-dashboard.html') {
    const telemetryPath = '/home/azureuser/translation-app/telemetry-dashboard.html';

    fs.readFile(telemetryPath, (err, data) => {
      if (err) {
        console.error('[Proxy] Error reading telemetry dashboard:', err);
        res.writeHead(404);
        res.end('Telemetry dashboard not found');
        return;
      }

      console.log('[Proxy] Serving telemetry dashboard');
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(data);
    });
    return;
  }

  // Serve database-records-enhanced.html for root and database URLs
  if (req.url === '/' || req.url === '/database-records.html' || req.url === '/database-records-enhanced.html') {
    const htmlPath = '/home/azureuser/translation-app/database-records-enhanced.html';

    fs.readFile(htmlPath, (err, data) => {
      if (err) {
        console.error('[Proxy] Error reading database HTML file:', err);
        res.writeHead(404);
        res.end('File not found');
        return;
      }

      console.log('[Proxy] Serving database records page');
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(data);
    });
    return;
  }

  // Default 404
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`[Proxy] ✅ Proxy server running on port ${PORT}`);
  console.log(`[Proxy] 📊 Telemetry dashboard: http://20.170.155.53:${PORT}/telemetry`);
  console.log(`[Proxy] 🔌 Forwarding /api/* requests to port ${MONITORING_API_PORT}`);
  console.log(`[Proxy] 📝 Database records: http://20.170.155.53:${PORT}/`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Proxy] ❌ Port ${PORT} is already in use`);
  } else {
    console.error('[Proxy] ❌ Server error:', err);
  }
  process.exit(1);
});