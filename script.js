let localStream, peerConnection, ws;
const startBtn = document.getElementById('startBtn');
const endBtn = document.getElementById('endBtn');
const remoteAudio = document.getElementById('remoteAudio');

const servers = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

startBtn.onclick = async () => {
  startBtn.disabled = true; endBtn.disabled = false;

  ws = new WebSocket('ws://localhost:8080');

  ws.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    if (data.sdp) {
      await peerConnection.setRemoteDescription(data.sdp);
      if (data.sdp.type === 'offer') {
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        ws.send(JSON.stringify({ sdp: peerConnection.localDescription }));
      }
    } else if (data.candidate) {
      try { await peerConnection.addIceCandidate(data.candidate); } 
      catch (err) { console.error(err); }
    } else if (data.type === 'audio') {
      // Auto-play TTS audio from server
      const audioData = atob(data.data);
      const buffer = Uint8Array.from(audioData, c => c.charCodeAt(0));
      const blob = new Blob([buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play().catch(err => console.error(err));
    }
  };

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  peerConnection = new RTCPeerConnection(servers);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = event => remoteAudio.srcObject = event.streams[0];
  peerConnection.onicecandidate = event => {
    if (event.candidate) ws.send(JSON.stringify({ candidate: event.candidate }));
  };
  peerConnection.onnegotiationneeded = async () => {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    ws.send(JSON.stringify({ sdp: peerConnection.localDescription }));
  };
};

endBtn.onclick = () => {
  peerConnection.close();
  ws.close();
  peerConnection = null;
  startBtn.disabled = false;
  endBtn.disabled = true;
  remoteAudio.srcObject = null;
};
