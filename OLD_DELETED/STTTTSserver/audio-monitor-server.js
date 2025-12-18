/**
 * Simple Audio Monitor with Volume Controls
 * 4 sliders, 4 bars - clean and minimal
 */

const dgram = require('dgram');
const http = require('http');
const WebSocket = require('ws');

// Create UDP sockets
const socket5000 = dgram.createSocket('udp4');
const socket5001 = dgram.createSocket('udp4');

// Track endpoints
let endpoint9007 = null;
let endpoint9008 = null;

// Volume controls
let volumes = {
  '9007_mic': 1.0,
  '9007_speaker': 1.0,
  '9008_mic': 1.0,
  '9008_speaker': 1.0
};

// Stats
const stats = {
  '9007': { packets: 0, bytes: 0, lastUpdate: Date.now(), bytesPerSec: 0 },
  '9008': { packets: 0, bytes: 0, lastUpdate: Date.now(), bytesPerSec: 0 }
};

// Calculate audio level
function calculateAudioLevel(rtpBuffer) {
  if (rtpBuffer.length < 12) return 0;
  const payload = rtpBuffer.slice(12);
  let sum = 0;
  for (let i = 0; i < payload.length - 1; i += 20) {
    const sample = payload.readInt16LE(i);
    sum += Math.abs(sample);
  }
  const avg = sum / (payload.length / 20);
  return Math.min(100, (avg / 327.67));
}

// Apply volume
function applyVolume(rtpBuffer, volumeLevel) {
  if (volumeLevel === 1.0 || rtpBuffer.length < 12) return rtpBuffer;
  const header = rtpBuffer.slice(0, 12);
  const payload = rtpBuffer.slice(12);
  const scaledPayload = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length - 1; i += 2) {
    const sample = payload.readInt16LE(i);
    const scaled = Math.round(sample * volumeLevel);
    scaledPayload.writeInt16LE(Math.max(-32768, Math.min(32767, scaled)), i);
  }
  return Buffer.concat([header, scaledPayload]);
}

// HTTP server
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>
<html>
<head>
  <title>Audio Monitor</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #222;
      color: #fff;
      padding: 20px;
      margin: 0;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      color: #0af;
      margin-bottom: 40px;
    }
    .controls {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }
    .channel {
      background: #333;
      border: 1px solid #555;
      border-radius: 8px;
      padding: 20px;
    }
    .channel h2 {
      margin: 0 0 20px 0;
      color: #0af;
      text-align: center;
    }
    .control-group {
      margin-bottom: 25px;
    }
    .label {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;
      color: #aaa;
    }
    .value {
      color: #0af;
      font-weight: bold;
    }
    input[type="range"] {
      width: 100%;
      height: 6px;
      background: #555;
      outline: none;
      border-radius: 3px;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      background: #0af;
      cursor: pointer;
      border-radius: 50%;
    }
    input[type="range"]::-moz-range-thumb {
      width: 16px;
      height: 16px;
      background: #0af;
      cursor: pointer;
      border-radius: 50%;
    }
    .meter {
      background: #1a1a1a;
      height: 24px;
      border-radius: 4px;
      overflow: hidden;
      position: relative;
      margin-top: 8px;
    }
    .meter-bar {
      height: 100%;
      background: #0af;
      width: 0%;
      transition: width 0.1s;
    }
    .meter-text {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 12px;
      font-weight: bold;
    }
    .status {
      text-align: center;
      padding: 10px;
      background: #c33;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    .status.connected {
      background: #3c3;
    }
    .audio-controls {
      text-align: center;
      margin-bottom: 30px;
      padding: 15px;
      background: #333;
      border-radius: 8px;
    }
    .audio-controls button {
      background: #0af;
      color: #fff;
      border: none;
      padding: 10px 20px;
      margin: 0 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
    }
    .audio-controls button:hover {
      background: #08d;
    }
    .audio-controls button:disabled {
      background: #555;
      cursor: not-allowed;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Audio Monitor - Extensions 9007 & 9008</h1>

    <div id="status" class="status">Connecting...</div>

    <div class="audio-controls">
      <button id="playBtn" onclick="startAudio()">Start Audio Playback</button>
      <button id="stopBtn" onclick="stopAudio()" disabled>Stop Audio Playback</button>
    </div>

    <div class="controls">
      <div class="channel">
        <h2>Extension 9007</h2>

        <div class="control-group">
          <div class="label">
            <span>Microphone</span>
            <span class="value" id="vol-9007-mic">100%</span>
          </div>
          <input type="range" id="slider-9007-mic" min="0" max="100" value="100">
          <div class="meter">
            <div class="meter-bar" id="meter-9007-mic"></div>
            <div class="meter-text" id="level-9007-mic">0</div>
          </div>
        </div>

        <div class="control-group">
          <div class="label">
            <span>Speaker</span>
            <span class="value" id="vol-9007-speaker">100%</span>
          </div>
          <input type="range" id="slider-9007-speaker" min="0" max="100" value="100">
          <div class="meter">
            <div class="meter-bar" id="meter-9007-speaker"></div>
            <div class="meter-text" id="level-9007-speaker">0</div>
          </div>
        </div>
      </div>

      <div class="channel">
        <h2>Extension 9008</h2>

        <div class="control-group">
          <div class="label">
            <span>Microphone</span>
            <span class="value" id="vol-9008-mic">100%</span>
          </div>
          <input type="range" id="slider-9008-mic" min="0" max="100" value="100">
          <div class="meter">
            <div class="meter-bar" id="meter-9008-mic"></div>
            <div class="meter-text" id="level-9008-mic">0</div>
          </div>
        </div>

        <div class="control-group">
          <div class="label">
            <span>Speaker</span>
            <span class="value" id="vol-9008-speaker">100%</span>
          </div>
          <input type="range" id="slider-9008-speaker" min="0" max="100" value="100">
          <div class="meter">
            <div class="meter-bar" id="meter-9008-speaker"></div>
            <div class="meter-text" id="level-9008-speaker">0</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const ws = new WebSocket('ws://' + window.location.host);

    // Web Audio API setup
    let audioContext = null;
    let audioPlaying = false;

    // Simple queuing system - one queue per channel
    const audioQueues = {
      '9007-mic': [],
      '9007-speaker': [],
      '9008-mic': [],
      '9008-speaker': []
    };

    const isPlaying = {
      '9007-mic': false,
      '9007-speaker': false,
      '9008-mic': false,
      '9008-speaker': false
    };

    function startAudio() {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      }
      audioPlaying = true;
      document.getElementById('playBtn').disabled = true;
      document.getElementById('stopBtn').disabled = false;
      console.log('Audio playback started');
    }

    function stopAudio() {
      audioPlaying = false;
      document.getElementById('playBtn').disabled = false;
      document.getElementById('stopBtn').disabled = true;
      // Clear queues
      for (let key in audioQueues) {
        audioQueues[key] = [];
        isPlaying[key] = false;
      }
      console.log('Audio playback stopped');
    }

    function playNextInQueue(channel) {
      if (!audioPlaying || audioQueues[channel].length === 0) {
        isPlaying[channel] = false;
        return;
      }

      const pcmData = audioQueues[channel].shift();

      try {
        // Decode base64 to ArrayBuffer
        const binaryString = atob(pcmData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Convert PCM 16-bit signed to Float32Array
        // RTP audio is typically big-endian, so read as such
        const floatSamples = new Float32Array(bytes.length / 2);
        for (let i = 0; i < floatSamples.length; i++) {
          // Read 16-bit big-endian signed integer
          const sample = (bytes[i * 2] << 8) | bytes[i * 2 + 1];
          // Convert to signed (two's complement)
          const signed = sample > 32767 ? sample - 65536 : sample;
          floatSamples[i] = signed / 32768.0;
        }

        // Create AudioBuffer
        const audioBuffer = audioContext.createBuffer(1, floatSamples.length, 16000);
        audioBuffer.getChannelData(0).set(floatSamples);

        // Create source and play
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);

        // When this buffer finishes, play the next one
        source.onended = () => {
          playNextInQueue(channel);
        };

        source.start(0);

      } catch (err) {
        console.error('Error playing PCM audio:', err);
        playNextInQueue(channel); // Try next packet on error
      }
    }

    function playPCM(channel, pcmData) {
      if (!audioPlaying || !audioContext) return;

      // Add to queue
      audioQueues[channel].push(pcmData);

      // Limit queue size to prevent lag buildup
      if (audioQueues[channel].length > 10) {
        audioQueues[channel].shift(); // Drop oldest packet
      }

      // Start playing if not already playing
      if (!isPlaying[channel]) {
        isPlaying[channel] = true;
        playNextInQueue(channel);
      }
    }

    ws.onopen = () => {
      document.getElementById('status').className = 'status connected';
      document.getElementById('status').textContent = 'Connected';
    };

    ws.onclose = () => {
      document.getElementById('status').className = 'status';
      document.getElementById('status').textContent = 'Disconnected';
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'audio_level') {
        const meter = document.getElementById('meter-' + data.channel);
        const levelText = document.getElementById('level-' + data.channel);
        if (meter && levelText) {
          const level = Math.round(data.level);
          meter.style.width = level + '%';
          levelText.textContent = level;
        }
      }

      if (data.type === 'audio_data' && audioPlaying) {
        playPCM(data.channel, data.data);
      }
    };

    ['9007-mic', '9007-speaker', '9008-mic', '9008-speaker'].forEach(channel => {
      const slider = document.getElementById('slider-' + channel);
      const display = document.getElementById('vol-' + channel);
      slider.addEventListener('input', (e) => {
        const value = e.target.value;
        display.textContent = value + '%';
        ws.send(JSON.stringify({
          type: 'volume_change',
          channel: channel,
          volume: value / 100
        }));
      });
    });

    setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 1000);
  </script>
</body>
</html>`);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'volume_change') {
        volumes[data.channel.replace('-', '_')] = data.volume;
        console.log(`Volume: ${data.channel} = ${Math.round(data.volume * 100)}%`);
      }
    } catch (e) {}
  });
});

function broadcastAudioLevel(channel, level) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'audio_level',
        channel: channel,
        level: level
      }));
    }
  });
}

// Broadcast PCM audio data to browser for playback
function broadcastAudioData(channel, pcmData) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      // Send as base64 to avoid binary WebSocket complexity
      client.send(JSON.stringify({
        type: 'audio_data',
        channel: channel,
        data: pcmData.toString('base64')
      }));
    }
  });
}

// UDP 5000 - Extension 9007
socket5000.on('message', (msg, rinfo) => {
  if (!endpoint9007 || endpoint9007.port !== rinfo.port) {
    endpoint9007 = { address: rinfo.address, port: rinfo.port };
    console.log(`[9007] Endpoint: ${rinfo.address}:${rinfo.port}`);
  }

  stats['9007'].packets++;
  stats['9007'].bytes += msg.length;

  const micLevel = calculateAudioLevel(msg);
  broadcastAudioLevel('9007-mic', micLevel);

  // Extract PCM payload and broadcast for playback
  if (msg.length >= 12) {
    const pcmPayload = msg.slice(12);
    broadcastAudioData('9007-mic', pcmPayload);
  }

  if (endpoint9008) {
    const scaledMsg = applyVolume(msg, volumes['9008_speaker']);
    const speakerLevel = calculateAudioLevel(scaledMsg);
    broadcastAudioLevel('9008-speaker', speakerLevel);

    // Extract PCM payload and broadcast for playback
    if (scaledMsg.length >= 12) {
      const pcmPayload = scaledMsg.slice(12);
      broadcastAudioData('9008-speaker', pcmPayload);
    }

    socket5001.send(scaledMsg, endpoint9008.port, endpoint9008.address);
  }
});

// UDP 5001 - Extension 9008
socket5001.on('message', (msg, rinfo) => {
  if (!endpoint9008 || endpoint9008.port !== rinfo.port) {
    endpoint9008 = { address: rinfo.address, port: rinfo.port };
    console.log(`[9008] Endpoint: ${rinfo.address}:${rinfo.port}`);
  }

  stats['9008'].packets++;
  stats['9008'].bytes += msg.length;

  const micLevel = calculateAudioLevel(msg);
  broadcastAudioLevel('9008-mic', micLevel);

  // Extract PCM payload and broadcast for playback
  if (msg.length >= 12) {
    const pcmPayload = msg.slice(12);
    broadcastAudioData('9008-mic', pcmPayload);
  }

  if (endpoint9007) {
    const scaledMsg = applyVolume(msg, volumes['9007_speaker']);
    const speakerLevel = calculateAudioLevel(scaledMsg);
    broadcastAudioLevel('9007-speaker', speakerLevel);

    // Extract PCM payload and broadcast for playback
    if (scaledMsg.length >= 12) {
      const pcmPayload = scaledMsg.slice(12);
      broadcastAudioData('9007-speaker', pcmPayload);
    }

    socket5000.send(scaledMsg, endpoint9007.port, endpoint9007.address);
  }
});

socket5000.bind(6000, '127.0.0.1', () => {
  console.log('Listening on UDP 127.0.0.1:6000 (Extension 9007)');
});

socket5001.bind(6001, '127.0.0.1', () => {
  console.log('Listening on UDP 127.0.0.1:6001 (Extension 9008)');
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`\nAudio Monitor Server`);
  console.log(`Web Interface: http://20.170.155.53:${PORT}/`);
  console.log(``);
});

process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  socket5000.close();
  socket5001.close();
  server.close();
  process.exit(0);
});
