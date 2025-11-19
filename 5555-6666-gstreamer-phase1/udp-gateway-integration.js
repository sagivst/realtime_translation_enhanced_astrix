// ============================================================================
// UDP Gateway Pipeline: STT → Translation → TTS
// Gateway UDP → Deepgram → DeepL → ElevenLabs (PCM) → Gateway UDP
// Replaces AudioSocket with UDP gateway input/output
// ============================================================================

require('dotenv').config();

const dgram = require('dgram');
const { ASRStreamingWorker } = require('./asr-streaming-worker');
const { DeepLIncrementalMT } = require('./deepl-incremental-mt');
const ElevenLabsTTSService = require('./elevenlabs-tts-service');

// Get API keys from environment
const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
const deeplApiKey = process.env.DEEPL_API_KEY;
const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

console.log('[UDP-Gateway] Initializing translation pipeline...');
console.log('[UDP-Gateway] Deepgram:', deepgramApiKey ? '✓' : '✗');
console.log('[UDP-Gateway] DeepL:', deeplApiKey ? '✓' : '✗');
console.log('[UDP-Gateway] ElevenLabs:', elevenlabsApiKey ? '✓' : '✗');

// Initialize services
const translator = deeplApiKey ? new DeepLIncrementalMT(deeplApiKey) : null;
const ttsService = elevenlabsApiKey ? new ElevenLabsTTSService(elevenlabsApiKey) : null;

// Extension configuration
const extensionConfig = {
  '5555': { sourceLang: 'en-US', targetLang: 'fr', targetExt: '6666', voiceId: 'pFZP5JQG7iQjIQuC4Bku' },
  '6666': { sourceLang: 'fr', targetLang: 'en', targetExt: '5555', voiceId: 'ErXwobaYiN019PkySvjV' }
};

// UDP port config
const UDP_CONFIG = {
  port5555In: 6100,
  port5555Out: 6101,
  port6666In: 6102,
  port6666Out: 6103,
  gatewayHost: '127.0.0.1'
};

// Create UDP sockets
const socket5555In = dgram.createSocket('udp4');
const socket5555Out = dgram.createSocket('udp4');
const socket6666In = dgram.createSocket('udp4');
const socket6666Out = dgram.createSocket('udp4');

// Session storage
const sessions = {};

// Create session for extension
async function createSession(extension) {
  const config = extensionConfig[extension];
  if (!config) return null;
  
  const session = {
    extension,
    config,
    asrWorker: null,
    buffer: Buffer.alloc(0)
  };
  
  // Create ASR worker
  if (deepgramApiKey) {
    session.asrWorker = new ASRStreamingWorker(deepgramApiKey, config.sourceLang);
    // Connect to Deepgram
    await session.asrWorker.connect();
    console.log(`[UDP-Gateway] ASR connected for ${extension}`);
    
    // Handle transcription results
    session.asrWorker.on('final', async (result) => {
      const transcript = result.text;
      if (!transcript || !transcript.trim()) return;
      
      console.log(`[UDP-Gateway] ${extension} ASR: ${transcript}`);
      
      // Emit to dashboard
      if (global.io) {
        global.io.emit('transcriptionFinal', {
          visitorId: extension,
          text: transcript,
          language: config.sourceLang,
          timestamp: Date.now()
        });
      }
      
      try {
        // Translate
        if (translator) {
          const translated = await translator.translate(
            extension,
            config.sourceLang.split('-')[0],
            config.targetLang,
            transcript,
            true
          );
          
          console.log(`[UDP-Gateway] ${extension} Translation: ${translated}`);
          
          // Emit translation to dashboard
          if (global.io) {
            global.io.emit('translationComplete', {
              visitorId: extension,
              originalText: transcript,
              translatedText: translated,
              sourceLang: config.sourceLang,
              targetLang: config.targetLang,
              timestamp: Date.now()
            });
          }
          
          // TTS
          if (ttsService) {
            const audioBuffer = await ttsService.synthesize(translated, config.voiceId);
            if (audioBuffer && audioBuffer.length > 0) {
              console.log(`[UDP-Gateway] ${extension} TTS: ${audioBuffer.length} bytes`);
              
              // Send to target extension's gateway
              sendAudioToGateway(config.targetExt, audioBuffer);
            }
          }
        }
      } catch (error) {
        console.error(`[UDP-Gateway] ${extension} Error: ${error.message}`);
      }
    });
    
    session.asrWorker.on('error', (error) => {
      console.error(`[UDP-Gateway] ${extension} ASR error: ${error.message}`);
    });
  }
  
  return session;
}

// Send audio to gateway output
function sendAudioToGateway(extension, audioBuffer) {
  const frameSize = 320; // 20ms at 16kHz
  let offset = 0;
  
  const outputSocket = extension === '5555' ? socket5555Out : socket6666Out;
  const outputPort = extension === '5555' ? UDP_CONFIG.port5555Out : UDP_CONFIG.port6666Out;
  
  const sendNextChunk = () => {
    if (offset < audioBuffer.length) {
      const chunk = audioBuffer.slice(offset, offset + frameSize);
      outputSocket.send(chunk, 0, chunk.length, outputPort, UDP_CONFIG.gatewayHost);
      offset += frameSize;
      setTimeout(sendNextChunk, 20);
    }
  };
  sendNextChunk();
}

// Handle incoming UDP audio
async function handleAudioInput(extension, msg) {
  if (!sessions[extension]) {
    console.log(`[UDP-Gateway] Creating session for ${extension}`);
    sessions[extension] = await createSession(extension);
  }
  
  const session = sessions[extension];
  if (!session || !session.asrWorker) return;
  
  // Buffer incoming audio (160 bytes -> 640 bytes for Deepgram)
  session.buffer = Buffer.concat([session.buffer, msg]);
  
  while (session.buffer.length >= 640) {
    const frame = session.buffer.slice(0, 640);
    session.buffer = session.buffer.slice(640);
    
    // Send to ASR
    session.asrWorker.sendAudio(frame);
  }
}

// Setup UDP listeners
socket5555In.on('message', (msg) => handleAudioInput('5555', msg));
socket6666In.on('message', (msg) => handleAudioInput('6666', msg));

socket5555In.on('listening', () => {
  console.log(`[UDP-Gateway] ✓ Listening for 5555 on port ${UDP_CONFIG.port5555In}`);
});

socket6666In.on('listening', () => {
  console.log(`[UDP-Gateway] ✓ Listening for 6666 on port ${UDP_CONFIG.port6666In}`);
});

socket5555In.on('error', (err) => console.error('[UDP-Gateway] 5555 error:', err.message));
socket6666In.on('error', (err) => console.error('[UDP-Gateway] 6666 error:', err.message));

// Bind sockets
socket5555In.bind(UDP_CONFIG.port5555In);
socket6666In.bind(UDP_CONFIG.port6666In);

console.log('[UDP-Gateway] UDP Gateway integration initialized');
console.log('[UDP-Gateway]   - Input 5555: port', UDP_CONFIG.port5555In);
console.log('[UDP-Gateway]   - Input 6666: port', UDP_CONFIG.port6666In);
console.log('[UDP-Gateway]   - Output 5555: port', UDP_CONFIG.port5555Out);
console.log('[UDP-Gateway]   - Output 6666: port', UDP_CONFIG.port6666Out);

module.exports = { sessions, extensionConfig };
