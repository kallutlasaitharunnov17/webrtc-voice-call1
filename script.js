let localStream, peerConnection, ws;
const startBtn = document.getElementById('startBtn');
const endBtn = document.getElementById('endBtn');
const remoteAudio = document.getElementById('remoteAudio');

const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

startBtn.onclick = async () => {
  startBtn.disabled = true;
  endBtn.disabled = false;

  // 1️⃣ Get microphone first (must be user interaction)
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    alert("Microphone access denied");
    startBtn.disabled = false;
    endBtn.disabled = true;
    return;
  }

  // 2️⃣ Setup WebSocket for signaling
  ws = new WebSocket('ws://localhost:8080');
  ws.onopen = () => console.log("Connected to signaling server");

  ws.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    if (!peerConnection) createPeerConnection();

    // Handle SDP
    if (data.sdp) {
      await peerConnection.setRemoteDescription(data.sdp);
      if (data.sdp.type === "offer") {
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        ws.send(JSON.stringify({ sdp: peerConnection.localDescription }));
      }
    }

    // Handle ICE
    if (data.candidate) {
      try {
        await peerConnection.addIceCandidate(data.candidate);
      } catch (err) {
        console.error(err);
      }
    }
  };

  function createPeerConnection() {
    peerConnection = new RTCPeerConnection(config);

    // Add local microphone tracks
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    // Receive remote audio
    peerConnection.ontrack = (event) => {
      remoteAudio.srcObject = event.streams[0];
    };

    // Send ICE candidates to server
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        ws.send(JSON.stringify({ candidate: event.candidate }));
      }
    };

    // If first client, create offer
    peerConnection.onnegotiationneeded = async () => {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      ws.send(JSON.stringify({ sdp: peerConnection.localDescription }));
    };
  }
};

endBtn.onclick = () => {
  if (peerConnection) peerConnection.close();
  if (ws) ws.close();
  peerConnection = null;
  ws = null;
  localStream = null;
  remoteAudio.srcObject = null;
  startBtn.disabled = false;
  endBtn.disabled = true;
};
