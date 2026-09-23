const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Prevent caching during development so changes appear immediately on connected devices
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

// Binds to 0.0.0.0 (all network interfaces) so any device on Wi-Fi or PC Hotspot can reach it
server.listen(PORT, '0.0.0.0', () => {
  const interfaces = os.networkInterfaces();
  const networks = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Exclude loopback (127.0.0.1) and APIPA (169.254.x.x)
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
        let label = name;
        if (iface.address === '192.168.137.1' || name.toLowerCase().includes('local area connection')) {
          label = 'PC Mobile Hotspot';
        }
        networks.push({ name: label, address: iface.address });
      }
    }
  }

  console.log('\n======================================================');
  console.log(' ResQ Local Network Server Running');
  console.log('======================================================');
  console.log(` Local:   http://localhost:${PORT}`);
  
  if (networks.length === 0) {
    console.log(' Network: No active network adapter detected.');
  } else {
    networks.forEach(net => {
      console.log(` Network (${net.name}): http://${net.address}:${PORT}`);
    });
  }

  console.log('------------------------------------------------------');
  console.log(' Direct Views:');
  networks.forEach(net => {
    console.log(`   [${net.name}]`);
    console.log(`     Emergency: http://${net.address}:${PORT}/index.html`);
    console.log(`     Home:      http://${net.address}:${PORT}/home.html`);
  });
  console.log('======================================================\n');
});
