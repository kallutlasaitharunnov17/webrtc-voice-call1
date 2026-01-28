const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
  let file = req.url === '/scripty.js' ? 'scripty.js' :
             req.url === '/style.css' ? 'style.css' :
             'index.html';
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(500); return res.end('Error'); }
    const type = file.endsWith('.js') ? 'text/javascript' :
                 file.endsWith('.css') ? 'text/css' : 'text/html';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

server.listen(8080, () => console.log('Server running on http://localhost:8080'));

const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  console.log('Client connected');

  ws.on('message', msg => {
    const data = JSON.parse(msg);

    // Relay SDP and ICE candidates to other clients
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  });

  ws.on('close', () => console.log('Client disconnected'));
});
