const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Import translation services
const { createClient } = require('@deepgram/sdk');
const deepl = require('deepl-node');
const sdk = require('microsoft-cognitiveservices-speech-sdk');

const app = express();

// Create HTTPS server if certificates exist, otherwise HTTP
let server;
try {
  const certPath = path.join(__dirname, 'cert.pem');
  const keyPath = path.join(__dirname, 'key.pem');

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const options = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
    server = https.createServer(options, app);
    console.log('✓ HTTPS server configured with SSL certificates');
  } else {
    server = http.createServer(app);
    console.log('⚠ HTTP server (certificates not found)');
  }
} catch (error) {
  console.error('Error loading certificates, falling back to HTTP:', error.message);
  server = http.createServer(app);
}

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e8 // 100 MB for audio chunks
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize services
const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
const deeplApiKey = process.env.DEEPL_API_KEY;
const azureSpeechKey = process.env.AZURE_SPEECH_KEY;
const azureSpeechRegion = process.env.AZURE_SPEECH_REGION;

// Initialize DeepL translator
let translator;
if (deeplApiKey) {
  translator = new deepl.Translator(deeplApiKey);
}

// Store active rooms and participants
const rooms = new Map();
const participants = new Map();

// Language mapping for services
const languageMap = {
  'en': { name: 'English', deepgram: 'en-US', deepl: 'en-US', azure: 'en-US' },
  'es': { name: 'Spanish', deepgram: 'es', deepl: 'ES', azure: 'es-ES' },
  'fr': { name: 'French', deepgram: 'fr', deepl: 'FR', azure: 'fr-FR' },
  'de': { name: 'German', deepgram: 'de', deepl: 'DE', azure: 'de-DE' },
  'it': { name: 'Italian', deepgram: 'it', deepl: 'IT', azure: 'it-IT' },
  'pt': { name: 'Portuguese', deepgram: 'pt', deepl: 'PT-PT', azure: 'pt-PT' },
  'ja': { name: 'Japanese', deepgram: 'ja', deepl: 'JA', azure: 'ja-JP' },
  'ko': { name: 'Korean', deepgram: 'ko', deepl: 'KO', azure: 'ko-KR' },
  'zh': { name: 'Chinese', deepgram: 'zh', deepl: 'ZH', azure: 'zh-CN' },
  'ru': { name: 'Russian', deepgram: 'ru', deepl: 'RU', azure: 'ru-RU' }
};

// Deepgram STT function
async function transcribeAudio(audioBuffer, language) {
  if (!deepgramApiKey) {
    console.warn('Deepgram API key not set');
    return { text: '[STT not configured]', confidence: 0 };
  }

  try {
    const deepgram = createClient(deepgramApiKey);
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: 'nova-2',
        language: languageMap[language]?.deepgram || 'en-US',
        smart_format: true,
        punctuate: true,
        utterances: false
      }
    );

    if (error) {
      console.error('Deepgram error:', error);
      return { text: '', confidence: 0 };
    }

    const transcript = result?.results?.channels[0]?.alternatives[0]?.transcript || '';
    const confidence = result?.results?.channels[0]?.alternatives[0]?.confidence || 0;

    return { text: transcript, confidence };
  } catch (error) {
    console.error('Transcription error:', error);
    return { text: '', confidence: 0 };
  }
}

// DeepL translation function
async function translateText(text, sourceLang, targetLang) {
  if (!translator) {
    console.warn('DeepL not configured');
    return `[Translation: ${text}]`;
  }

  if (!text || text.trim() === '' || sourceLang === targetLang) {
    return text;
  }

  try {
    const sourceCode = languageMap[sourceLang]?.deepl || 'en-US';
    const targetCode = languageMap[targetLang]?.deepl || 'en-US';

    const result = await translator.translateText(
      text,
      sourceCode === 'en-US' ? null : sourceCode,
      targetCode
    );

    return result.text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

// Azure TTS function
async function synthesizeSpeech(text, language) {
  if (!azureSpeechKey || !azureSpeechRegion) {
    console.warn('Azure Speech not configured');
    return null;
  }

  try {
    const speechConfig = sdk.SpeechConfig.fromSubscription(azureSpeechKey, azureSpeechRegion);
    const voiceMap = {
      'en': 'en-US-JennyNeural',
      'es': 'es-ES-ElviraNeural',
      'fr': 'fr-FR-DeniseNeural',
      'de': 'de-DE-KatjaNeural',
      'it': 'it-IT-ElsaNeural',
      'pt': 'pt-PT-RaquelNeural',
      'ja': 'ja-JP-NanamiNeural',
      'ko': 'ko-KR-SunHiNeural',
      'zh': 'zh-CN-XiaoxiaoNeural',
      'ru': 'ru-RU-SvetlanaNeural'
    };

    speechConfig.speechSynthesisVoiceName = voiceMap[language] || voiceMap['en'];
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

    return new Promise((resolve, reject) => {
      synthesizer.speakTextAsync(
        text,
        result => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            const audioData = result.audioData;
            synthesizer.close();
            resolve(Buffer.from(audioData));
          } else {
            synthesizer.close();
            reject(new Error('Speech synthesis failed'));
          }
        },
        error => {
          synthesizer.close();
          reject(error);
        }
      );
    });
  } catch (error) {
    console.error('TTS error:', error);
    return null;
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join or create room
  socket.on('join-room', (data) => {
    const { roomId, username, language } = data;

    socket.join(roomId);

    // Store participant info
    participants.set(socket.id, {
      id: socket.id,
      username,
      language,
      roomId
    });

    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        participants: new Set()
      });
    }

    const room = rooms.get(roomId);
    room.participants.add(socket.id);

    console.log(`${username} joined room ${roomId} with language ${language}`);

    // Notify others in the room
    socket.to(roomId).emit('participant-joined', {
      participantId: socket.id,
      username,
      language
    });

    // Send current participants to the new user
    const currentParticipants = Array.from(room.participants)
      .filter(id => id !== socket.id)
      .map(id => participants.get(id))
      .filter(p => p);

    socket.emit('room-joined', {
      roomId,
      participants: currentParticipants
    });
  });

  // Handle audio stream for transcription
  socket.on('audio-stream', async (data) => {
    const startTime = Date.now();
    const { audioBuffer, roomId } = data;
    const participant = participants.get(socket.id);

    if (!participant) return;

    const timing = {
      start: startTime,
      audioReceived: startTime,
      sttStart: 0,
      sttEnd: 0,
      translationStart: 0,
      translationEnd: 0,
      ttsStart: 0,
      ttsEnd: 0,
      total: 0
    };

    try {
      // Log: Audio received
      console.log(`[${participant.username}] Audio chunk received (${audioBuffer.byteLength} bytes)`);
      socket.emit('pipeline-log', {
        type: 'client',
        stage: 'audio-received',
        message: `Audio captured (${Math.round(audioBuffer.byteLength / 1024)}KB)`,
        timestamp: Date.now()
      });

      // Step 1: Transcribe with Deepgram (STT)
      timing.sttStart = Date.now();
      console.log(`[${participant.username}] Starting STT (Deepgram)...`);
      socket.emit('pipeline-log', {
        type: 'room',
        stage: 'stt-start',
        message: `Starting speech-to-text (${participant.language})`,
        timestamp: Date.now()
      });

      const { text: transcription, confidence } = await transcribeAudio(
        Buffer.from(audioBuffer),
        participant.language
      );

      timing.sttEnd = Date.now();
      const sttDuration = timing.sttEnd - timing.sttStart;

      if (!transcription || transcription.trim() === '') {
        console.log(`[${participant.username}] Empty transcription, skipping`);
        socket.emit('pipeline-log', {
          type: 'client',
          stage: 'stt-empty',
          message: 'No speech detected',
          timestamp: Date.now()
        });
        return;
      }

      console.log(`[${participant.username}] Transcribed (${sttDuration}ms): "${transcription}"`);
      socket.emit('pipeline-log', {
        type: 'client',
        stage: 'stt-complete',
        message: `Speech recognized: "${transcription}"`,
        duration: sttDuration,
        timestamp: Date.now()
      });

      // Get all participants in the room
      const room = rooms.get(roomId);
      if (!room) return;

      // Step 2 & 3: Translate and synthesize for each participant
      const translationPromises = Array.from(room.participants)
        .map(participantId => participants.get(participantId))
        .filter(p => p && p.id !== socket.id)
        .map(async (targetParticipant) => {
          try {
            const transStart = Date.now();
            console.log(`[${participant.username} → ${targetParticipant.username}] Starting translation (${participant.language} → ${targetParticipant.language})...`);

            // Send log to both sender and receiver
            socket.emit('pipeline-log', {
              type: 'room',
              stage: 'translation-start',
              message: `Translating to ${targetParticipant.username}'s language (${targetParticipant.language})`,
              timestamp: Date.now()
            });

            io.to(targetParticipant.id).emit('pipeline-log', {
              type: 'client',
              stage: 'translation-start',
              message: `Translating ${participant.username}'s speech to your language`,
              timestamp: Date.now()
            });

            // Translate text with DeepL
            const translatedText = await translateText(
              transcription,
              participant.language,
              targetParticipant.language
            );

            const transEnd = Date.now();
            const transDuration = transEnd - transStart;
            console.log(`[${participant.username} → ${targetParticipant.username}] Translated (${transDuration}ms): "${translatedText}"`);

            io.to(targetParticipant.id).emit('pipeline-log', {
              type: 'client',
              stage: 'translation-complete',
              message: `Translation complete: "${translatedText}"`,
              duration: transDuration,
              timestamp: Date.now()
            });

            // Synthesize speech with Azure TTS
            const ttsStart = Date.now();
            console.log(`[${participant.username} → ${targetParticipant.username}] Starting TTS (Azure)...`);

            io.to(targetParticipant.id).emit('pipeline-log', {
              type: 'room',
              stage: 'tts-start',
              message: `Generating speech in your language`,
              timestamp: Date.now()
            });

            const audioData = await synthesizeSpeech(
              translatedText,
              targetParticipant.language
            );

            const ttsEnd = Date.now();
            const ttsDuration = ttsEnd - ttsStart;
            const totalLatency = Date.now() - startTime;

            console.log(`[${participant.username} → ${targetParticipant.username}] TTS complete (${ttsDuration}ms), Total: ${totalLatency}ms`);

            io.to(targetParticipant.id).emit('pipeline-log', {
              type: 'client',
              stage: 'tts-complete',
              message: `Speech generated, playing audio`,
              duration: ttsDuration,
              timestamp: Date.now()
            });

            // Send to specific participant
            io.to(targetParticipant.id).emit('translated-audio', {
              originalText: transcription,
              translatedText,
              audioData: audioData ? audioData.toString('base64') : null,
              speakerUsername: participant.username,
              speakerLanguage: participant.language,
              latency: totalLatency,
              timing: {
                stt: sttDuration,
                translation: transDuration,
                tts: ttsDuration,
                total: totalLatency
              }
            });

            io.to(targetParticipant.id).emit('pipeline-log', {
              type: 'client',
              stage: 'complete',
              message: `✓ Complete pipeline: ${totalLatency}ms (STT: ${sttDuration}ms, Trans: ${transDuration}ms, TTS: ${ttsDuration}ms)`,
              timestamp: Date.now()
            });

          } catch (error) {
            console.error(`[${participant.username} → ${targetParticipant.username}] Pipeline error:`, error);
            io.to(targetParticipant.id).emit('pipeline-log', {
              type: 'client',
              stage: 'error',
              message: `Error in translation pipeline: ${error.message}`,
              timestamp: Date.now()
            });
          }
        });

      await Promise.all(translationPromises);

      // Also send original to speaker for confirmation
      socket.emit('transcription-result', {
        text: transcription,
        confidence,
        language: participant.language
      });

      socket.emit('pipeline-log', {
        type: 'client',
        stage: 'speaker-confirmed',
        message: `Your speech sent to ${translationPromises.length} participant(s)`,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error(`[${participant.username}] Audio processing error:`, error);
      socket.emit('pipeline-log', {
        type: 'client',
        stage: 'error',
        message: `Error: ${error.message}`,
        timestamp: Date.now()
      });
      socket.emit('error', { message: 'Failed to process audio' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const participant = participants.get(socket.id);

    if (participant) {
      const { roomId, username } = participant;
      const room = rooms.get(roomId);

      if (room) {
        room.participants.delete(socket.id);

        // Notify others
        socket.to(roomId).emit('participant-left', {
          participantId: socket.id,
          username
        });

        // Clean up empty rooms
        if (room.participants.size === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        }
      }

      participants.delete(socket.id);
      console.log(`${username} disconnected from room ${roomId}`);
    }
  });
});

// API Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    services: {
      deepgram: !!deepgramApiKey,
      deepl: !!deeplApiKey,
      azure: !!(azureSpeechKey && azureSpeechRegion)
    },
    activeRooms: rooms.size,
    activeParticipants: participants.size
  });
});

app.get('/api/languages', (req, res) => {
  res.json(languageMap);
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

server.listen(PORT, HOST, () => {
  // Get local IP addresses
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  const localIPs = [];

  Object.keys(networkInterfaces).forEach(interfaceName => {
    networkInterfaces[interfaceName].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIPs.push(iface.address);
      }
    });
  });

  const protocol = server instanceof https.Server ? 'https' : 'http';

  console.log(`Conference server running on port ${PORT}`);
  console.log(`\nProtocol: ${protocol.toUpperCase()}`);
  console.log('\nAccess URLs:');
  console.log(`  - Local:    ${protocol}://localhost:${PORT}`);
  localIPs.forEach(ip => {
    console.log(`  - Network:  ${protocol}://${ip}:${PORT}`);
  });
  console.log('\nServices status:');
  console.log('  - Deepgram STT:', deepgramApiKey ? '✓' : '✗ (not configured)');
  console.log('  - DeepL Translation:', deeplApiKey ? '✓' : '✗ (not configured)');
  console.log('  - Azure TTS:', (azureSpeechKey && azureSpeechRegion) ? '✓' : '✗ (not configured)');

  if (protocol === 'https') {
    console.log('\n✓ HTTPS enabled - Microphone will work on remote devices!');
    console.log('  (You may need to click "Advanced" and accept the self-signed certificate)');
  } else {
    console.log('\n⚠ HTTP only - Microphone will only work on localhost');
    console.log('  Add cert.pem and key.pem for HTTPS support');
  }
  console.log('\n✓ Server is accessible from other devices on your network');
});
