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

  // Serve telemetry dashboard at /telemetry
  if (req.url === '/telemetry') {
    const telemetryPath = '/home/azureuser/translation-app/telemetry-dashboard.html';
    
    fs.readFile(telemetryPath, (err, data) => {
      if (err) {
        console.error('Error reading telemetry dashboard:', err);
        res.writeHead(404);
        res.end('Telemetry dashboard not found');
        return;
      }
      
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(data);
    });
    return;
  }

  // Serve database-records-enhanced.html for multiple URLs
  if (req.url === '/' || req.url === '/database-records.html' || req.url === '/database-records-enhanced.html') {
    const htmlPath = '/home/azureuser/translation-app/database-records-enhanced.html';

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
