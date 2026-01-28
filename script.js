let localStream, peerConnection, ws;
const startBtn = document.getElementById('startBtn');
const endBtn = document.getElementById('endBtn');
const remoteAudio = document.getElementById('remoteAudio');

const servers = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

startBtn.onclick = async () => {
  startBtn.disabled = true; endBtn.disabled = false;

  // WebSocket for signaling
  ws = new WebSocket('ws://localhost:8080');

  ws.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    // WebRTC signaling
    if (data.sdp) {
      await peerConnection.setRemoteDescription(data.sdp);
      if (data.sdp.type === 'offer') {
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        ws.send(JSON.stringify({ sdp: peerConnection.localDescription }));
      }
    } else if (data.candidate) {
      try { await peerConnection.addIceCandidate(data.candidate); } catch (err) { console.error(err); }
    }
  };

  // Get microphone
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // Peer connection
  peerConnection = new RTCPeerConnection(servers);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  // Remote audio
  peerConnection.ontrack = event => remoteAudio.srcObject = event.streams[0];

  // ICE candidate
  peerConnection.onicecandidate = event => {
    if (event.candidate) ws.send(JSON.stringify({ candidate: event.candidate }));
  };

  // Create offer if first client
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
