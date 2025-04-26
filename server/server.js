const http = require('http');
const fs = require('fs');
const path = require('path');
const { initWebSocketServer } = require('./websocket.js');
const url = require('url');

// Create HTTP server
const server = http.createServer((req, res) => {
  // Basic static file server
  let filePath = path.join(__dirname, '../client', req.url === '/' ? 'index.html' : req.url);
  
  // Serve index.html for root and any non-asset paths
  if (!path.extname(filePath) && !req.url.startsWith('/assets/')) {
    filePath = path.join(__dirname, '../client', 'index.html');
  }
  
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  
  const contentType = contentTypes[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // File not found
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Initialize WebSocket server
const wss = initWebSocketServer(server);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
