const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const say = require('say'); // npm install say

// Serve HTML
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

// WebSocket server for signaling + TTS
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  console.log('Client connected');

  ws.on('message', async msg => {
    const data = JSON.parse(msg);

    // === WebRTC signaling ===
    if (data.sdp || data.candidate) {
      // broadcast to other clients
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(msg);
        }
      });
    }

    // === TTS text messages ===
    if (data.type === 'text') {
      const text = data.text;
      const outputFile = 'audio.wav';

      // Generate TTS using say
      say.export(text, null, 1.0, outputFile, (err) => {
        if (err) { console.error('TTS error:', err); return; }

        const audioData = fs.readFileSync(outputFile);
        const base64 = audioData.toString('base64');

        // Send TTS audio back to all clients
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'audio', data: base64 }));
          }
        });
      });
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
});
