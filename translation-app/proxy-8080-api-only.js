/**
 * API Proxy Server - Port 8080
 * Forwards API requests to the Database API on port 8083
 * No HTML serving - API only for UI team
 */

const http = require('http');

const PORT = 8080;
const DATABASE_API_PORT = 8083;
const DATABASE_API_HOST = 'localhost';

const server = http.createServer((req, res) => {
  console.log('[API Proxy] Request:', req.method, req.url);

  // Set CORS headers for UI team access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS requests for CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Forward API requests to DATABASE API server on port 8083
  if (req.url.startsWith('/api/')) {
    console.log('[API Proxy] Forwarding to DATABASE API port', DATABASE_API_PORT);

    const options = {
      hostname: DATABASE_API_HOST,
      port: DATABASE_API_PORT,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${DATABASE_API_HOST}:${DATABASE_API_PORT}`
      }
    };

    const proxyReq = http.request(options, (proxyRes) => {
      console.log('[API Proxy] Response status:', proxyRes.statusCode);

      // Forward response headers
      Object.keys(proxyRes.headers).forEach(key => {
        if (key.toLowerCase() !== 'access-control-allow-origin') {
          res.setHeader(key, proxyRes.headers[key]);
        }
      });

      res.writeHead(proxyRes.statusCode);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('[API Proxy] Error:', err);
      res.writeHead(502);
      res.end(JSON.stringify({ error: 'Bad Gateway', details: err.message }));
    });

    // Forward request body if present
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }

    return;
  }

  // Root endpoint - API information
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: 'Monitoring API Proxy',
      status: 'operational',
      endpoints: {
        '/api/snapshots': 'GET - All station metrics with Station-3 real data',
        '/api/stations': 'GET - Station configurations',
        '/api/monitoring-data': 'POST - Store monitoring data'
      },
      note: 'Station-3 data is REAL from hardware, Station-4 is simulated',
      timestamp: new Date().toISOString()
    }, null, 2));
    return;
  }

  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'api-proxy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // 404 for everything else
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: 'Not Found',
    message: 'This is an API-only server. Available endpoints: /api/snapshots, /api/stations',
    timestamp: new Date().toISOString()
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           Monitoring API Proxy Server Started              ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Port: ${PORT}                                                ║`);
  console.log(`║  Proxying to: Database API on port ${DATABASE_API_PORT}                    ║`);
  console.log('║  CORS: Enabled for all origins                            ║');
  console.log('║                                                            ║');
  console.log('║  Available Endpoints:                                      ║');
  console.log('║    GET  /api/snapshots  - Station metrics (with Station-3)║');
  console.log('║    GET  /api/stations   - Station configurations          ║');
  console.log('║    POST /api/monitoring-data - Store new data             ║');
  console.log('║    GET  /health         - Health check                    ║');
  console.log('║                                                            ║');
  console.log('║  Access: http://20.170.155.53:8080/api/snapshots          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[API Proxy] Shutting down...');
  server.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n[API Proxy] Shutting down...');
  server.close();
  process.exit(0);
});