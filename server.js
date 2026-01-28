// Node.js WebSocket signaling server
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
let clients = [];

wss.on('connection', (ws) => {
  clients.push(ws);
  console.log('Client connected. Total:', clients.length);

  ws.on('message', (message) => {
    // Broadcast to all other clients
    clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
    console.log('Client disconnected. Total:', clients.length);
  });
});

console.log('Signaling server running on ws://localhost:8080');
