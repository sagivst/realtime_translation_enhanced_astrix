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
// const sdk = require('microsoft-cognitiveservices-speech-sdk'); // Replaced with ElevenLabs
const ElevenLabsTTSService = require('./elevenlabs-tts-service');
const HumeStreamingClient = require('./hume-streaming-client');

// Import HMLCP modules
// const { UserProfile, ULOLayer, PatternExtractor } = require('./hmlcp');
// const { applyDefaultProfile } = require('./hmlcp/default-profiles');


const app = express();

// Create HTTPS server if certificates exist, otherwise HTTP
// But always use HTTP in Azure App Service (Azure handles SSL termination)
let server;
const isAzure = !!process.env.WEBSITE_INSTANCE_ID;

if (isAzure) {
  // Azure App Service - use HTTP (Azure handles HTTPS)
  server = http.createServer(app);
  console.log('✓ HTTP server for Azure App Service (Azure handles HTTPS termination)');
} else {
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
}

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e8 // 100 MB for audio chunks
});

// Make Socket.IO available globally for udp-gateway-integration
global.io = io;

// Initialize Timing Server Client for bidirectional translation
const TimingClient = require('./timing-client');
global.timingClient = new TimingClient();
global.timingClient.connect().then(() => {
    console.log('[Server] ✓ Timing client connected');
}).catch(err => {
    console.error('[Server] ✗ Timing client connection failed:', err.message);
});

// Phase 2: Global session registry for audio injection by extension
// Key: extension number (string), Value: session object
global.activeSessions = new Map();
console.log('[Phase2] Global session registry initialized');

// Start AudioSocket server (for Asterisk integration on port 5050)
// IMPORTANT: Must load AFTER global.io is set
require("./udp-gateway-integration");

// Phase 2: Set up INJECT_AUDIO handler for bidirectional audio buffering
global.timingClient.setInjectAudioHandler((msg) => {
    const { toExtension, audioData, timestamp } = msg;

    // Look up session by extension
    const session = global.activeSessions.get(String(toExtension));

    if (!session) {
        console.warn(`[Phase2] ✗ No session found for extension ${toExtension}`);
        return;
    }

    if (!session.micWebSocket || session.micWebSocket.readyState !== 1) {
        console.warn(`[Phase2] ✗ MicWebSocket not ready for extension ${toExtension}`);
        return;
    }

    // Decode base64 audio to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');

    // Inject audio using the global function
    if (global.sendAudioToMicEndpoint) {
        global.sendAudioToMicEndpoint(session.micWebSocket, audioBuffer);
        console.log(`[Phase2] ✓ Injected ${audioBuffer.length} bytes to extension ${toExtension}`);
    } else {
        console.error('[Phase2] ✗ sendAudioToMicEndpoint not available');
    }
});
console.log('[Phase2] INJECT_AUDIO handler registered');

// Latency Control Backend (for testing UI only - does not affect production)
// const LatencyControlBackend = require('./latency-control-backend');
// const latencyControl = new LatencyControlBackend();
// latencyControl.registerSocketHandlers(io);
console.log('[Server] ✓ Latency Control Backend initialized (testing mode)');

app.use(express.static(path.join(__dirname, 'public')));

// Serve file directories
app.use('/files/recordings', express.static(path.join(__dirname, 'recordings')));
app.use('/files/transcripts', express.static(path.join(__dirname, 'transcripts')));
app.use('/files/translations', express.static(path.join(__dirname, 'translations')));

// Initialize services
const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
const deeplApiKey = process.env.DEEPL_API_KEY;
const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
const elevenlabsVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID;
const humeApiKey = process.env.HUME_EVI_API_KEY;

// Initialize DeepL translator
let translator;
if (deeplApiKey) {
  translator = new deepl.Translator(deeplApiKey);
}

// Initialize ElevenLabs TTS
let elevenlabsTTS = null;
if (elevenlabsApiKey) {
  elevenlabsTTS = new ElevenLabsTTSService(elevenlabsApiKey);
  console.log('ElevenLabs TTS service initialized');
}

// Store active rooms and participants
const rooms = new Map();
const participants = new Map();

// Store user profiles for HMLCP
const userProfiles = new Map(); // key: userId_language, value: { profile, uloLayer }

// QA Settings: Per-extension language configuration
// Extension 7000: English → French (DEFAULT)
// Extension 7001: French → English (OPPOSITE - for bidirectional translation)
global.qaConfigs = new Map();
global.qaConfigs.set('7000', { sourceLang: 'en', targetLang: 'fr', qaMode: false });
global.qaConfigs.set('7001', { sourceLang: 'fr', targetLang: 'en', qaMode: false });

// Helper function to get config for extension (with fallback)
function getQaConfig(extension) {
  return global.qaConfigs.get(extension) || global.qaConfigs.get('7000');
}

// Store streaming Deepgram connections per socket
const streamingConnections = new Map(); // key: socket.id, value: { connection, customVocab }
const humeConnections = new Map(); // key: socket.id, value: HumeStreamingClient instance
const humeAudioBuffers = new Map(); // key: socket.id, value: circular buffer for playback

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

// Deepgram STT function with HMLCP custom vocabulary support
async function transcribeAudio(audioBuffer, language, customVocab = []) {
  if (!deepgramApiKey) {
    console.warn('Deepgram API key not set');
    return { text: '[STT not configured]', confidence: 0 };
  }

  try {
    const deepgram = createClient(deepgramApiKey);

    // Build Deepgram options
    const options = {
      model: 'nova-2',
      language: languageMap[language]?.deepgram || 'en-US',
      smart_format: true,
      punctuate: true,
      utterances: false
    };

    // Add HMLCP custom vocabulary if provided
    if (customVocab && customVocab.length > 0) {
      // Deepgram keywords format: "phrase:boost"
      options.keywords = customVocab.map(v => `${v.phrase}:${v.boost}`);
      console.log(`[HMLCP] Using ${customVocab.length} custom vocabulary terms for STT`);
    }

    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      options
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

  if (!text || text.trim() === '') {
    return text;
  }

  // QA Mode: Override languages with qaConfig if QA mode is enabled
  if (global.qaConfig && (global.qaConfig.sourceLang || global.qaConfig.targetLang)) {
    const originalSource = sourceLang;
    const originalTarget = targetLang;
    
    // Override with QA config languages
    sourceLang = global.qaConfig.sourceLang || sourceLang;
    targetLang = global.qaConfig.targetLang || targetLang;
    
    console.log(`[QA Config] Language override: ${originalSource} → ${originalTarget} becomes ${sourceLang} → ${targetLang}`);
  }

  // Skip translation if source === target (applies to both QA mode and normal mode)
  if (sourceLang === targetLang) {
    console.log(`[Translation] Bypassed: ${sourceLang} → ${targetLang} (same language)`);
    return text;
  }

  try {
    const sourceCode = languageMap[sourceLang]?.deepl || 'en-US';
    const targetCode = languageMap[targetLang]?.deepl || 'en-US';

    console.log(`[Translation] ${sourceLang} → ${targetLang}: "${text.substring(0, 50)}..."`);

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
async function synthesizeSpeech(text, language) {
  if (!elevenlabsTTS) {
    console.warn('ElevenLabs TTS not configured');
    return null;
  }

  try {
    // Use the default voice ID from .env
    const voiceId = elevenlabsVoiceId || 'XPwQNE5RX9Rdhyx0DWcI'; // Boyan Tiholov

    // Synthesize using ElevenLabs (returns MP3 buffer)
    const result = await elevenlabsTTS.synthesize(text, voiceId, {
      modelId: 'eleven_multilingual_v2' // Supports 29 languages
    });

    if (result && result.audio) {
      return result.audio; // Return the audio buffer
    }

    return null;
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    return null;
  }
}

// HMLCP: Get or create user profile with ULO layer
async function getUserProfile(userId, language) {
  const key = `${userId}_${language}`;

  if (!userProfiles.has(key)) {
    try {
      // Try to load existing profile or create new one
      const profile = await UserProfile.load(userId, language);
      const uloLayer = new ULOLayer(profile);
      const patternExtractor = new PatternExtractor();

      userProfiles.set(key, { profile, uloLayer, patternExtractor });
      console.log(`[HMLCP] Loaded profile for ${userId} (${language})`);
    } catch (error) {
      console.error(`[HMLCP] Error loading profile for ${userId}:`, error);
      // Create new profile on error
      const profile = new UserProfile(userId, language);
      const uloLayer = new ULOLayer(profile);
      const patternExtractor = new PatternExtractor();
      userProfiles.set(key, { profile, uloLayer, patternExtractor });
    }
  }

  return userProfiles.get(key);
}

// Create streaming Deepgram connection for real-time STT
async function createStreamingConnection(socket, participant) {
  if (!deepgramApiKey) {
    console.warn('[Streaming STT] Deepgram API key not set');
    return null;
  }

  // Get user profile and custom vocabulary for HMLCP BEFORE creating connection
  const { profile, uloLayer, patternExtractor } = await getUserProfile(
    participant.username,
    participant.language
  );
  const customVocab = uloLayer.generateCustomVocabulary();

  const deepgram = createClient(deepgramApiKey);

  // Configure streaming options with HMLCP custom vocabulary
  const options = {
    model: 'nova-2',
    language: languageMap[participant.language]?.deepgram || 'en-US',
    smart_format: true,
    punctuate: true,
    interim_results: false,  // Only get final results for accuracy
    endpointing: 300,  // 300ms silence to finalize utterance (faster than 800ms)
    utterance_end_ms: 1000  // Max 1 second to close utterance
  };

  // Add HMLCP custom vocabulary if available
  if (customVocab && customVocab.length > 0) {
    options.keywords = customVocab.map(v => `${v.phrase}:${v.boost}`);
    console.log(`[Streaming STT] ${participant.username}: Using ${customVocab.length} custom vocabulary terms`);
  }

  // Create live streaming connection and attach error handler IMMEDIATELY
  let connection;
  try {
    connection = deepgram.listen.live(options);

    // CRITICAL: Attach error handler IMMEDIATELY in same tick to catch early errors
    connection.on('Error', (error) => {
      console.error(`[Streaming STT] ${participant.username}: Connection error:`, error.message);
      streamingConnections.delete(socket.id);

      // Clean up Hume AI connection
      const humeClient = humeConnections.get(socket.id);
      if (humeClient) {
        humeClient.disconnect();
        humeConnections.delete(socket.id);
      }
      humeAudioBuffers.delete(socket.id);
      socket.emit('pipeline-log', {
        type: 'client',
        stage: 'error',
        message: `Streaming STT error - using batch mode`,
        timestamp: Date.now()
      });
    });

    // Increase max listeners to avoid warnings
    connection.setMaxListeners(20);

  } catch (error) {
    console.error(`[Streaming STT] ${participant.username}: Failed to create connection:`, error.message);
    return null;
  }

  // Handle connection close
  connection.on('Close', () => {
    console.log(`[Streaming STT] ${participant.username}: Connection closed`);
    streamingConnections.delete(socket.id);

      // Clean up Hume AI connection
      const humeClient = humeConnections.get(socket.id);
      if (humeClient) {
        humeClient.disconnect();
        humeConnections.delete(socket.id);
      }
      humeAudioBuffers.delete(socket.id);
  });

  // Handle transcription results
  connection.on('Results', async (data) => {
    const transcript = data.channel?.alternatives[0]?.transcript;

    if (!transcript || transcript.trim() === '') {
      return;  // Skip empty transcriptions
    }

    const confidence = data.channel?.alternatives[0]?.confidence || 0;
    const isFinal = data.is_final;

    // Only process final results
    if (isFinal) {
      const startTime = Date.now();
      console.log(`[Streaming STT] ${participant.username}: "${transcript}" (confidence: ${(confidence * 100).toFixed(1)}%)`);

      // Log STT complete
      socket.emit('pipeline-log', {
        type: 'client',
        stage: 'stt-complete',
        message: `Speech recognized: "${transcript}"`,
        timestamp: Date.now()
      });

      // HMLCP: Apply ULO layer for personalized processing
      const processedTranscription = uloLayer.apply(transcript);

      // Store sample for learning
      profile.addTextSample(transcript);

      // Log ULO processing if modified
      if (processedTranscription !== transcript) {
        console.log(`[HMLCP] ${participant.username}: ULO applied: "${transcript}" → "${processedTranscription}"`);
        socket.emit('pipeline-log', {
          type: 'client',
          stage: 'hmlcp-ulo',
          message: `Personalized processing applied`,
          timestamp: Date.now()
        });
      }

      const finalTranscription = processedTranscription;

      // Send transcription to speaker
      socket.emit('transcription-result', {
        text: finalTranscription,
        rawText: transcript,
        confidence,
        language: participant.language
      });

      // Get room participants for translation
      const room = rooms.get(participant.roomId);
      if (!room) return;

      // Translate and synthesize for each other participant
      const translationPromises = Array.from(room.participants)
        .map(participantId => participants.get(participantId))
        .filter(p => {
          if (!p || p.id === socket.id) return false;  // Skip speaker
          // ECHO PREVENTION: Skip if target has same language (no translation needed)
          if (p.language === participant.language) {
            console.log(`[Echo Prevention] Skipping ${p.username} - same language as ${participant.username} (${participant.language})`);
            return false;
          }
          return true;
        })
        .map(async (targetParticipant) => {
          try {
            const transStart = Date.now();

            // Translate
            const translatedText = await translateText(
              finalTranscription,
              participant.language,
              targetParticipant.language
            );

            const transEnd = Date.now();
            const transDuration = transEnd - transStart;

            // TTS
            const ttsStart = Date.now();
            const audioData = await synthesizeSpeech(
              translatedText,
              targetParticipant.language
            );

            const ttsEnd = Date.now();
            const ttsDuration = ttsEnd - ttsStart;
            const totalLatency = Date.now() - startTime;

            // Calculate STT time as the remainder (STT happened before startTime was set)
            // In streaming mode, STT time is from audio send to transcript receipt
            // We approximate it as total - (translation + tts)
            const sttDuration = totalLatency - transDuration - ttsDuration;

            console.log(`[Streaming] ${participant.username} → ${targetParticipant.username}: ${totalLatency}ms total (STT: ${sttDuration}ms, Trans: ${transDuration}ms, TTS: ${ttsDuration}ms)`);

            // Send to target participant
            io.to(targetParticipant.id).emit('translated-audio', {
              originalText: finalTranscription,
              rawTranscription: transcript,
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
              message: `✓ Complete: ${totalLatency}ms (Trans: ${transDuration}ms, TTS: ${ttsDuration}ms)`,
              timestamp: Date.now()
            });

          } catch (error) {
            console.error(`[Streaming] ${participant.username} → ${targetParticipant.username}: Error:`, error);
          }
        });

      await Promise.all(translationPromises);

      socket.emit('pipeline-log', {
        type: 'client',
        stage: 'speaker-confirmed',
        message: `Your speech sent to ${translationPromises.length} participant(s)`,
        timestamp: Date.now()
      });
    }
  });

  // Open the connection
  connection.on('Open', () => {
    console.log(`[Streaming STT] ${participant.username}: Connection opened successfully`);
    socket.emit('pipeline-log', {
      type: 'client',
      stage: 'info',
      message: `✓ Streaming mode active (low-latency)`,
      timestamp: Date.now()
    });
  });

  // Store connection
  streamingConnections.set(socket.id, {

    connection,
    customVocab,
    profile,
    uloLayer,
    patternExtractor
  });

  // Initialize Hume AI client for emotion detection
  initializeHumeClient(socket.id).catch(err => console.error("[Hume] Init error:", err));
  console.log(`[Streaming STT] ${participant.username}: Streaming connection created`);
  return connection;
}

// Socket.io connection handling
// Initialize Hume AI client for a socket
async function initializeHumeClient(socketId) {
  if (!humeApiKey) {
    console.log('[Hume] API key not configured');
    return null;
  }
  
  try {
    const humeClient = new HumeStreamingClient(humeApiKey, {
      sampleRate: 16000,
      channels: 1
    });
    
    await humeClient.connect();
    
    // Handle metrics from Hume
    console.log('[DEBUG] Attaching metrics listener for socket:', socketId);
    humeClient.on('metrics', (metrics) => {
      console.log('[DEBUG] 📊 Metrics event received from Hume:', {
        arousal: metrics.arousal,
        valence: metrics.valence,
        energy: metrics.energy,
        socketId: socketId
      });
      
      const socket = io.sockets.sockets.get(socketId);
      console.log('[DEBUG] Socket lookup result:', socket ? 'FOUND' : 'NOT FOUND');
      
      if (socket) {
        console.log('[DEBUG] ✅ Emitting emotion_detected to browser');
        socket.emit('emotion_detected', {
          arousal: metrics.arousal,
          valence: metrics.valence,
          energy: metrics.energy,
          timestamp: metrics.timestamp
        });
        console.log('[DEBUG] Emotion event emitted successfully');
      } else {
        console.error('[DEBUG] ❌ Socket not found for socketId:', socketId);
      }
    });
    
    humeConnections.set(socketId, humeClient);
    console.log(`[Hume] Client initialized for socket ${socketId}`);
    return humeClient;
  } catch (error) {
    console.error('[Hume] Error initializing client:', error.message);
    return null;
  }
}


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

    // Streaming STT temporarily disabled - API key authentication issues in production context
    // The standalone test passes, but server crashes with "non-101 status code" error
    // This suggests the API key works in isolation but not in server context
    // Falling back to stable batch mode (~1500-2400ms latency)
    const participant = participants.get(socket.id);
    if (participant) {
      createStreamingConnection(socket, participant)
        .then(connection => {
          if (connection) {
            console.log(`[Mode] ✅ Streaming mode enabled for ${participant.username}`);
          } else {
            console.log(`[Mode] ⚠️ Streaming failed, falling back to batch mode for ${participant.username}`);
            socket.emit('pipeline-log', {
              type: 'client',
              stage: 'info',
              message: `⚠️ Batch mode active (streaming unavailable)`,
              timestamp: Date.now()
            });
          }
        })
        .catch(error => {
          console.error(`[Mode] Error creating streaming connection:`, error);
          socket.emit('pipeline-log', {
            type: 'client',
            stage: 'info',
            message: `⚠️ Batch mode active (streaming error)`,
            timestamp: Date.now()
          });
        });
    }
    
  });

  // Handle audio stream - feed to Deepgram Live connection or fallback to batch
  socket.on('audio-stream', async (data) => {
    const { audioBuffer, roomId } = data;
    const streamData = streamingConnections.get(socket.id);
    const participant = participants.get(socket.id);

    if (!participant) return;

    // Try streaming mode first
    if (streamData && streamData.connection) {
      try {
        // Send audio chunk to Deepgram Live API
        streamData.connection.send(Buffer.from(audioBuffer));

        // Fork audio to Hume AI for emotion detection
        const humeClient = humeConnections.get(socket.id);
        if (humeClient && humeClient.connected) {
          humeClient.sendAudio(Buffer.from(audioBuffer));
        }
      } catch (error) {
        console.error(`[Streaming] Error sending audio:`, error);
      }
    } else {
      // Fallback to batch mode if streaming not available
      // This prevents system from breaking if Deepgram Live API isn't available
      console.log(`[Batch Mode] Processing audio for ${participant.username} (streaming unavailable)`);

      try {
        const { profile, uloLayer } = await getUserProfile(
          participant.username,
          participant.language
        );
        const customVocab = uloLayer.generateCustomVocabulary();

        const startTime = Date.now();
        const sttStart = Date.now();
        const { text: transcription, confidence } = await transcribeAudio(
          Buffer.from(audioBuffer),
          participant.language,
          customVocab
        );

        const sttEnd = Date.now();
        const sttDuration = sttEnd - sttStart;

        if (!transcription || transcription.trim() === '') {
          return;
        }

        const processedTranscription = uloLayer.apply(transcription);
        profile.addTextSample(transcription);

        socket.emit('transcription-result', {
          text: processedTranscription,
          rawText: transcription,
          confidence,
          language: participant.language
        });

        // Translate for other participants
        const room = rooms.get(roomId);
        if (!room) return;

        const translationPromises = Array.from(room.participants)
          .map(participantId => participants.get(participantId))
          .filter(p => p && p.id !== socket.id)  // Skip speaker only
          .map(async (targetParticipant) => {
            const transStart = Date.now();
            const translatedText = await translateText(
              processedTranscription,
              participant.language,
              targetParticipant.language
            );

            const transEnd = Date.now();
            const transDuration = transEnd - transStart;

            const ttsStart = Date.now();
            const audioData = await synthesizeSpeech(
              translatedText,
              targetParticipant.language
            );

            const ttsEnd = Date.now();
            const ttsDuration = ttsEnd - ttsStart;
            const totalLatency = Date.now() - startTime;

            io.to(targetParticipant.id).emit('translated-audio', {
              originalText: processedTranscription,
              rawTranscription: transcription,
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
          });

        await Promise.all(translationPromises);
      } catch (error) {
        console.error(`[Batch Mode] Error:`, error);
      }
    }
  });

  // Handle voice profile creation (from onboarding)
  socket.on('create-voice-profile', async (data) => {
    const { profileId, language, phrasesCount, skipped } = data;

    console.log(`[Onboarding] Creating voice profile: ${profileId} (${language}), skipped: ${skipped}`);

    try {
      // Initialize HMLCP profile for this user
      const { profile } = await getUserProfile(profileId, language);

      // If user skipped calibration, apply default language profile
      if (skipped || phrasesCount === 0) {
        console.log(`[Onboarding] Applying default ${language} profile (calibration skipped)`);
        applyDefaultProfile(profile, language);
        await profile.save();
      }

      socket.emit('profile-created', {
        profileId,
        language,
        success: true,
        isDefault: skipped || phrasesCount === 0
      });

      console.log(`[Onboarding] Profile created: ${profileId}${skipped ? ' (default profile)' : ''}`);
    } catch (error) {
      console.error('[Onboarding] Error creating profile:', error);
      socket.emit('error', { message: 'Failed to create profile' });
    }
  });

  // Handle calibration audio (from onboarding)
  socket.on('calibration-audio', async (data) => {
    const { audioBuffer, phrase, phraseIndex, language, profileId } = data;

    console.log(`[Onboarding] Calibration audio received: phrase ${phraseIndex + 1}, ${audioBuffer.byteLength} bytes`);

    try {
      // Transcribe the calibration audio
      const { text: transcription, confidence } = await transcribeAudio(
        Buffer.from(audioBuffer),
        language
      );

      console.log(`[Onboarding] Calibration phrase ${phraseIndex + 1} transcribed: "${transcription}" (expected: "${phrase}")`);

      // If we have a profile, add this as a calibration sample
      if (profileId) {
        const { profile, patternExtractor } = await getUserProfile(profileId, language);

        // Add to profile as a calibration sample
        profile.addTextSample(transcription);
        profile.addCalibrationSample(phrase, transcription);

        // Extract patterns if mismatch detected
        if (transcription.toLowerCase() !== phrase.toLowerCase()) {
          const pattern = patternExtractor.extractCorrectionPattern(transcription, phrase);
          if (pattern) {
            profile.addPattern(pattern);
            console.log(`[Onboarding] Pattern learned from calibration: ${transcription} → ${phrase}`);
          }
        }

        // Save profile after each calibration phrase
        await profile.save();
      }

      // Notify client that processing is complete
      socket.emit('calibration-processed', {
        phraseIndex,
        transcription,
        expectedPhrase: phrase,
        confidence,
        success: true
      });

    } catch (error) {
      console.error('[Onboarding] Error processing calibration audio:', error);
      socket.emit('error', { message: 'Failed to process calibration audio' });
    }
  });

  // Handle disconnect

  // QA Settings: Handle language configuration from dashboard
  socket.on('qa-language-config', (config) => {
    const { sourceLang, targetLang, qaMode, extension } = config;

    if (!extension) {
      console.warn('[QA Config] ⚠️  No extension specified, ignoring update');
      return;
    }

    // Update per-extension QA configuration
    global.qaConfigs.set(extension, { sourceLang, targetLang, qaMode });

    console.log(`[QA Config] ✓ Extension ${extension} updated: ${sourceLang} → ${targetLang} (QA Mode: ${qaMode})`);

    // Broadcast to all connected clients (they will filter by extension)
    io.emit('qa-config-updated', {
      extension,
      sourceLang,
      targetLang,
      qaMode
    });
  });

  socket.on('disconnect', () => {
    const participant = participants.get(socket.id);

    // Close streaming Deepgram connection
    const streamData = streamingConnections.get(socket.id);
    if (streamData && streamData.connection) {
      try {
        streamData.connection.finish();
        console.log(`[Streaming STT] Connection closed for ${participant?.username || socket.id}`);
      } catch (error) {
        console.error(`[Streaming STT] Error closing connection:`, error);
      }
      streamingConnections.delete(socket.id);

      // Clean up Hume AI connection
      const humeClient = humeConnections.get(socket.id);
      if (humeClient) {
        humeClient.disconnect();
        humeConnections.delete(socket.id);
      }
      humeAudioBuffers.delete(socket.id);
    }

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
      elevenlabs: !!elevenlabsApiKey
    },
    activeRooms: rooms.size,
    activeParticipants: participants.size
  });
});

app.get('/api/languages', (req, res) => {
  res.json(languageMap);
});

// File listing API endpoints
app.get('/api/files/recordings', (req, res) => {
  const recordingsDir = path.join(__dirname, 'recordings');
  fs.readdir(recordingsDir, (err, files) => {
    if (err) {
      return res.json({ files: [] });
    }
    const fileList = files.map(filename => ({
      name: filename,
      path: `/files/recordings/${filename}`
    }));
    res.json({ files: fileList });
  });
});

app.get('/api/files/transcripts', (req, res) => {
  const transcriptsDir = path.join(__dirname, 'transcripts');
  fs.readdir(transcriptsDir, (err, files) => {
    if (err) {
      return res.json({ files: [] });
    }
    const fileList = files.map(filename => ({
      name: filename,
      path: `/files/transcripts/${filename}`
    }));
    res.json({ files: fileList });
  });
});

app.get('/api/files/translations', (req, res) => {
  const translationsDir = path.join(__dirname, 'translations');
  fs.readdir(translationsDir, (err, files) => {
    if (err) {
      return res.json({ files: [] });
    }
    const fileList = files.map(filename => ({
      name: filename,
      path: `/files/translations/${filename}`
    }));
    res.json({ files: fileList });
  });
});

// HMLCP API Endpoints
app.use(express.json());

// Get user profile stats
app.get('/api/hmlcp/profile/:userId/:language', async (req, res) => {
  try {
    const { userId, language } = req.params;
    const { profile, uloLayer } = await getUserProfile(userId, language);

    res.json({
      userId: profile.userId,
      language: profile.language,
      created: profile.created,
      lastUpdated: profile.lastUpdated,
      tone: profile.tone,
      avgSentenceLength: profile.avgSentenceLength,
      directness: profile.directness,
      ambiguityTolerance: profile.ambiguityTolerance,
      lexicalBias: profile.lexicalBias,
      phraseMappings: Object.keys(profile.phraseMap).length,
      biasTerms: profile.biasTerms.length,
      samples: profile.textSamples.length + profile.audioSamples.length,
      corrections: profile.corrections.length,
      metrics: profile.metrics,
      uloStats: uloLayer.getStats()
    });
  } catch (error) {
    console.error('[HMLCP API] Error getting profile:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Submit a correction (for learning)
app.post('/api/hmlcp/correction', async (req, res) => {
  try {
    const { userId, language, rawInput, interpretedIntent, correctedIntent } = req.body;

    if (!userId || !language || !rawInput || !correctedIntent) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { profile, uloLayer } = await getUserProfile(userId, language);

    // Learn from correction
    uloLayer.learnFromCorrection(rawInput, interpretedIntent || rawInput, correctedIntent);

    // Save profile
    await profile.save();

    res.json({
      success: true,
      message: 'Correction learned',
      metrics: profile.metrics,
      newPhraseMappings: Object.keys(profile.phraseMap).length
    });
  } catch (error) {
    console.error('[HMLCP API] Error submitting correction:', error);
    res.status(500).json({ error: 'Failed to submit correction' });
  }
});

// Analyze profile patterns
app.post('/api/hmlcp/analyze', async (req, res) => {
  try {
    const { userId, language } = req.body;

    if (!userId || !language) {
      return res.status(400).json({ error: 'Missing userId or language' });
    }

    const { profile, patternExtractor } = await getUserProfile(userId, language);

    // Extract patterns from collected samples
    const patterns = patternExtractor.analyze(profile.textSamples);

    // Update profile with extracted patterns
    profile.tone = patterns.tone;
    profile.avgSentenceLength = patterns.avgSentenceLength;
    profile.directness = patterns.directness;
    profile.ambiguityTolerance = patterns.ambiguityTolerance;
    profile.lexicalBias = patterns.lexicalBias;

    // Save updated profile
    await profile.save();

    res.json({
      success: true,
      patterns,
      message: 'Profile patterns analyzed and updated'
    });
  } catch (error) {
    console.error('[HMLCP API] Error analyzing patterns:', error);
    res.status(500).json({ error: 'Failed to analyze patterns' });
  }
});

// Get custom vocabulary for Deepgram
app.get('/api/hmlcp/vocabulary/:userId/:language', async (req, res) => {
  try {
    const { userId, language } = req.params;
    const { uloLayer } = await getUserProfile(userId, language);

    const vocabulary = uloLayer.generateCustomVocabulary();

    res.json({
      success: true,
      vocabulary,
      count: vocabulary.length
    });
  } catch (error) {
    console.error('[HMLCP API] Error getting vocabulary:', error);
    res.status(500).json({ error: 'Failed to get vocabulary' });
  }
});

// Save profile manually
app.post('/api/hmlcp/save', async (req, res) => {
  try {
    const { userId, language } = req.body;

    if (!userId || !language) {
      return res.status(400).json({ error: 'Missing userId or language' });
    }

    const { profile } = await getUserProfile(userId, language);
    const filePath = await profile.save();

    res.json({
      success: true,
      message: 'Profile saved',
      filePath
    });
  } catch (error) {
    console.error('[HMLCP API] Error saving profile:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

const PORT = process.env.PORT || 3001;
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
  console.log('  - ElevenLabs TTS:', elevenlabsApiKey ? '✓' : '✗ (not configured)');

  if (protocol === 'https') {
    console.log('\n✓ HTTPS enabled - Microphone will work on remote devices!');
    console.log('  (You may need to click "Advanced" and accept the self-signed certificate)');
  } else {
    console.log('\n⚠ HTTP only - Microphone will only work on localhost');
    console.log('  Add cert.pem and key.pem for HTTPS support');
  }
  console.log('\n✓ Server is accessible from other devices on your network');

  // HMLCP: Periodic profile saving (every 5 minutes)
  setInterval(async () => {
    let savedCount = 0;
    for (const [key, { profile }] of userProfiles.entries()) {
      try {
        await profile.save();
        savedCount++;
      } catch (error) {
        console.error(`[HMLCP] Error saving profile ${key}:`, error.message);
      }
    }
    if (savedCount > 0) {
      console.log(`[HMLCP] Auto-saved ${savedCount} profile(s)`);
    }
  }, 5 * 60 * 1000); // 5 minutes

  console.log('\n[HMLCP] System initialized');
  console.log('  - User profiles: Auto-save enabled (every 5 min)');
  console.log('  - ULO Layer: Active for real-time adaptation');
  console.log('  - Pattern Extraction: Available via API');
});
