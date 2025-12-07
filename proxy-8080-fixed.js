const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const DATABASE_API_PORT = 8083;  // Changed from 3090 to 8083
const DATABASE_API_HOST = 'localhost';

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

  // Forward API requests to DATABASE API server on port 8083
  if (req.url.startsWith('/api/')) {
    console.log('[Proxy] Forwarding API request to DATABASE API port', DATABASE_API_PORT);

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
      console.log('[Proxy] API response status:', proxyRes.statusCode);

      // Forward response headers
      Object.keys(proxyRes.headers).forEach(key => {
        res.setHeader(key, proxyRes.headers[key]);
      });

      res.writeHead(proxyRes.statusCode);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('[Proxy] API request error:', err);
      res.writeHead(502);
      res.end('Bad Gateway');
    });

    // Forward request body if present
    if (req.method === 'POST' || req.method === 'PUT') {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }

    return;
  }

  // Serve static files
  if (req.url === '/' || req.url === '/database-records.html') {
    const htmlFile = '/home/azureuser/translation-app/database-records.html';

    fs.readFile(htmlFile, (err, data) => {
      if (err) {
        console.error('[Proxy] Error reading database-records.html:', err);

        // Try alternative location
        const altFile = '/home/azureuser/translation-app/database-records-enhanced.html';
        fs.readFile(altFile, (err2, data2) => {
          if (err2) {
            res.writeHead(404);
            res.end('Database records page not found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data2);
        });
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // Default 404
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Proxy] Server running on port ${PORT}`);
  console.log(`[Proxy] Proxying /api/* to DATABASE API on port ${DATABASE_API_PORT}`);
  console.log(`[Proxy] Serving database-records.html`);
  console.log(`[Proxy] Access at: http://20.170.155.53:${PORT}/database-records.html`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Proxy] Shutting down...');
  server.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Proxy] Shutting down...');
  server.close();
  process.exit(0);
});