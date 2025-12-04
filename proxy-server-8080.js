const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 8080;

// Proxy /api requests to the database server on 8083
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8083',
  changeOrigin: true,
  logLevel: 'error'
}));

// Serve static files (database-records.html)
app.use(express.static('/home/azureuser/translation-app'));

// Default route
app.get('/', (req, res) => {
  res.redirect('/database-records.html');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log(`Proxying /api/* → http://localhost:8083/api/*`);
  console.log(`Serving static files from /home/azureuser/translation-app`);
});