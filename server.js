const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const { exec } = require('child_process'); // optional, if using command-line TTS

// Create HTTP server (for serving static HTML)
const server = http.createServer((req, res) => {
  fs.readFile('index.html', (err, data) => {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading page');
    }
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(data);
  });
});

server.listen(8080, () => console.log('HTTP server running on http://localhost:8080'));

// WebSocket server for sending/receiving audio
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  console.log('Client connected');

  ws.on('message', async message => {
    const msg = JSON.parse(message);

    if (msg.type === 'text') {
      const text = msg.text;
      
      // Simple Node TTS using say.js (or you can call Python script)
      // Here we will use a command-line TTS to generate WAV
      const outputFile = 'audio.wav';
      exec(`powershell -Command "Add-Type –AssemblyName System.speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speak.SetOutputToWaveFile('${outputFile}'); $speak.Speak('${text}');"`, (err) => {
        if (err) return console.error(err);

        // Read WAV file and send to client
        const audioData = fs.readFileSync(outputFile);
        ws.send(JSON.stringify({
          type: 'audio',
          data: audioData.toString('base64') // send as Base64
        }));
      });
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
});
