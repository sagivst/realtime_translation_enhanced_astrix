const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const API_PORT = 8083;

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);

  // Proxy API requests to port 8083
  if (req.url.startsWith('/api/')) {
    const options = {
      hostname: 'localhost',
      port: API_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers
    };

    const proxy = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxy.on('error', (err) => {
      console.error('Proxy error:', err);
      res.writeHead(500);
      res.end('Proxy error');
    });

    req.pipe(proxy);
    return;
  }

  // Serve database-records.html
  if (req.url === '/' || req.url === '/database-records.html') {
    const htmlPath = '/home/azureuser/translation-app/database-records.html';

    fs.readFile(htmlPath, (err, data) => {
      if (err) {
        console.error('Error reading HTML file:', err);
        res.writeHead(404);
        res.end('File not found');
        return;
      }

      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(data);
    });
    return;
  }

  // Default 404
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Simple proxy server running on port ${PORT}`);
  console.log(`Proxying /api/* → http://localhost:${API_PORT}/api/*`);
  console.log(`Serving database-records.html`);
});