/**
 * Blueprint Test Server
 * Purpose: Test Server → Gateway (DIRECT) → Asterisk → Extension 8888
 */

const io = require('socket.io-client');
const fs = require('fs');

const GATEWAY_URL = 'http://localhost:3003';
const PCM_FILE = '/tmp/test-tone-440hz.pcm';
const TARGET_EXTENSION = '8888';
const CHUNK_SIZE = 640;
const CHUNK_INTERVAL = 20;

console.log('Blueprint Test Server Starting...\n');
console.log('Gateway:', GATEWAY_URL);
console.log('Target Extension:', TARGET_EXTENSION);
console.log('PCM File:', PCM_FILE, '\n');

let pcmData;
try {
  pcmData = fs.readFileSync(PCM_FILE);
  const duration = pcmData.length / 32000;
  const chunks = Math.floor(pcmData.length / CHUNK_SIZE);
  console.log('PCM Loaded:', pcmData.length, 'bytes');
  console.log('Duration:', duration.toFixed(2), 'seconds');
  console.log('Chunks:', chunks, '\n');
} catch (err) {
  console.error('ERROR: Failed to load PCM file:', err.message);
  process.exit(1);
}

const socket = io(GATEWAY_URL, {
  transports: ['websocket'],
  reconnection: true
});

socket.on('connect', () => {
  console.log('Connected to Gateway (ID:', socket.id, ')');
  console.log('Waiting 3 seconds...\n');
  setTimeout(startPlayback, 3000);
});

socket.on('disconnect', () => {
  console.log('Disconnected from Gateway');
});

socket.on('error', (err) => {
  console.error('WebSocket error:', err.message);
});

let timer = null;
let index = 0;

function startPlayback() {
  console.log('=== STARTING PLAYBACK ===\n');
  const total = Math.floor(pcmData.length / CHUNK_SIZE);
  
  timer = setInterval(() => {
    const offset = index * CHUNK_SIZE;
    
    if (offset >= pcmData.length) {
      console.log('\nPlayback finished. Sent', index, 'chunks - LOOPING...\n');
      index = 0;  // Reset to beginning for continuous loop
      return;
    }
    
    const chunk = pcmData.slice(offset, offset + CHUNK_SIZE);
    
    if (chunk.length === CHUNK_SIZE) {
      socket.emit('translatedAudio', {
        extension: TARGET_EXTENSION,
        audio: chunk,
        format: 'pcm16',
        sampleRate: 16000,
        timestamp: Date.now()
      });

      if (index % 50 === 0) {
        const sec = (index * 20) / 1000;
        const pct = ((index / total) * 100).toFixed(1);
        console.log('Chunk', index + '/' + total, '(' + sec.toFixed(1) + 's, ' + pct + '%) → Emitted to extension', TARGET_EXTENSION);
      }
      
      index++;
    }
  }, CHUNK_INTERVAL);
  
  console.log('Playback started. Call extension 8888 now.\n');
}

function stopPlayback() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  stopPlayback();
  socket.disconnect();
  process.exit(0);
});
