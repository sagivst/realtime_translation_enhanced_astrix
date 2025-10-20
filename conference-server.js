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
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
const ElevenLabsTTSService = require('./elevenlabs-tts-service');

// Import HMLCP modules
const { UserProfile, ULOLayer, PatternExtractor } = require('./hmlcp');
const { applyDefaultProfile } = require('./hmlcp/default-profiles');

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

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
// Serve node_modules for browser dependencies (SIP.js, etc.)
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Track monitor-subscribed Socket.IO clients
const monitorSubscribers = new Set();

// Helper function to broadcast to monitor clients via Socket.IO
function broadcastToMonitors(data) {
  if (data.type === 'transcript') {
    monitorSubscribers.forEach((socketId) => {
      io.to(socketId).emit('monitor-transcript', data);
    });
  } else if (data.type === 'translation') {
    monitorSubscribers.forEach((socketId) => {
      io.to(socketId).emit('monitor-translation', data);
    });
  }
}

// Initialize services
const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
const deeplApiKey = process.env.DEEPL_API_KEY;
const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

// Initialize DeepL translator
let translator;
if (deeplApiKey) {
  translator = new deepl.Translator(deeplApiKey);
}

// Initialize ElevenLabs client (legacy - keep for compatibility)
let elevenlabs;
if (elevenlabsApiKey) {
  elevenlabs = new ElevenLabsClient({
    apiKey: elevenlabsApiKey
  });
}

// Initialize custom ElevenLabs TTS service
let customElevenLabs;
let customVoices = { voices: {} };
if (elevenlabsApiKey) {
  customElevenLabs = new ElevenLabsTTSService(elevenlabsApiKey);

  // Load custom voices configuration
  try {
    const voicesConfig = JSON.parse(fs.readFileSync('config/elevenlabs-voices.json', 'utf8'));
    customVoices = voicesConfig;
    console.log(`✓ Loaded ${Object.keys(customVoices.voices).length} custom ElevenLabs voices`);
  } catch (error) {
    console.warn('⚠ Could not load custom voices config:', error.message);
  }
}

// Store active rooms and participants
const rooms = new Map();
const participants = new Map();

// Store user profiles for HMLCP
const userProfiles = new Map(); // key: userId_language, value: { profile, uloLayer }

// Store utterance buffers for streaming chunking
// key: utteranceId, value: { chunks: [{text, confidence, timestamp}], socketId, startTime, language }
const utteranceBuffers = new Map();
const UTTERANCE_TIMEOUT_MS = 30000; // 30 seconds - auto-complete stale utterances

// Language mapping for services
const languageMap = {
  'en': { name: 'English', deepgram: 'en-US', deepl: 'en-US', voiceId: 'JBFqnCBsd6RMkjVDRZzb' }, // George (English - Natural)
  'es': { name: 'Spanish', deepgram: 'es', deepl: 'ES', voiceId: 'gD1IexrzCvsXPHUuT0s3' }, // Matias (Spanish)
  'fr': { name: 'French', deepgram: 'fr', deepl: 'FR', voiceId: 'cjVigY5qzO86Huf0OWal' }, // Freya (French)
  'de': { name: 'German', deepgram: 'de', deepl: 'DE', voiceId: 'TxGEqnHWrfWFTfGW9XjX' }, // Josh (German)
  'it': { name: 'Italian', deepgram: 'it', deepl: 'IT', voiceId: 'XrExE9yKIg1WjnnlVkGX' }, // Matilda (Italian)
  'pt': { name: 'Portuguese', deepgram: 'pt', deepl: 'PT-PT', voiceId: 'kgAWj2bta3vWqgLgqMYd' }, // Ricardo (Portuguese)
  'ja': { name: 'Japanese', deepgram: 'ja', deepl: 'JA', voiceId: '7w3pZc42lMh0hVJKZYgm' }, // Aria (Japanese)
  'ko': { name: 'Korean', deepgram: 'ko', deepl: 'KO', voiceId: '9BWtsMINqrJLrRacOk9x' }, // Aria (Korean)
  'zh': { name: 'Chinese', deepgram: 'zh', deepl: 'ZH', voiceId: 'Wv7BdI2rjUqPv9rWxoED' }, // Alice (Chinese)
  'ru': { name: 'Russian', deepgram: 'ru', deepl: 'RU', voiceId: 'pNInz6obpgDQGcFmaJgB' } // Adam (Russian)
};

// Deepgram STT function with HMLCP custom vocabulary support (BATCH - legacy)
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

// Deepgram Streaming STT function (PHASE 2 - Lower latency)
async function transcribeAudioStreaming(audioBuffer, language, customVocab = []) {
  if (!deepgramApiKey) {
    console.warn('Deepgram API key not set');
    return { text: '[STT not configured]', confidence: 0 };
  }

  return new Promise(async (resolve, reject) => {
    try {
      const deepgram = createClient(deepgramApiKey);

      // Build Deepgram streaming options
      const options = {
        model: 'nova-2',
        language: languageMap[language]?.deepgram || 'en-US',
        smart_format: true,
        punctuate: true,
        interim_results: true
      };

      // Add HMLCP custom vocabulary if provided
      if (customVocab && customVocab.length > 0) {
        options.keywords = customVocab.map(v => `${v.phrase}:${v.boost}`);
        console.log(`[HMLCP Streaming] Using ${customVocab.length} custom vocabulary terms`);
      }

      // Create live transcription connection
      const dgConnection = deepgram.listen.live(options);

      let finalTranscript = '';
      let finalConfidence = 0;
      let streamStartTime = Date.now();
      let hasReceivedFinal = false;

      // Handle transcript results
      dgConnection.on('transcriptReceived', (data) => {
        try {
          const result = data?.channel?.alternatives?.[0];
          if (!result) return;

          const transcript = result.transcript || '';
          const confidence = result.confidence || 0;
          const isFinal = data.is_final || data.speech_final;

          if (transcript && isFinal) {
            finalTranscript = transcript;
            finalConfidence = confidence;
            hasReceivedFinal = true;
            const latency = Date.now() - streamStartTime;
            console.log(`[Streaming STT] Final: "${transcript}" (${latency}ms)`);
          } else if (transcript) {
            console.log(`[Streaming STT] Interim: "${transcript}"`);
          }
        } catch (err) {
          console.error('[Streaming STT] Error processing transcript:', err);
        }
      });

      // Handle errors
      dgConnection.on('error', (error) => {
        console.error('[Streaming STT] Error:', error);
        dgConnection.finish();
        reject(error);
      });

      // Handle connection close
      dgConnection.on('close', () => {
        const totalTime = Date.now() - streamStartTime;
        console.log(`[Streaming STT] Connection closed after ${totalTime}ms`);
        resolve({ text: finalTranscript, confidence: finalConfidence });
      });

      // Wait for connection to open
      dgConnection.on('open', () => {
        console.log('[Streaming STT] Connection opened');

        // Send audio buffer in chunks to simulate streaming
        const chunkSize = 8000; // 8KB chunks
        let offset = 0;

        const sendChunks = () => {
          while (offset < audioBuffer.length) {
            const chunk = audioBuffer.slice(offset, offset + chunkSize);
            dgConnection.send(chunk);
            offset += chunkSize;

            // Add small delay between chunks to simulate real-time streaming
            if (offset < audioBuffer.length) {
              setTimeout(() => {}, 20);
            }
          }

          // Close connection after sending all audio (wait 300ms for final transcript)
          setTimeout(() => {
            console.log('[Streaming STT] Finishing connection...');
            dgConnection.finish();
          }, 300);
        };

        // Start sending chunks
        setTimeout(sendChunks, 100);
      });

      // Timeout fallback (10 seconds)
      setTimeout(() => {
        if (!hasReceivedFinal) {
          console.warn('[Streaming STT] Timeout - no final transcript received');
          dgConnection.finish();
          resolve({ text: finalTranscript || '', confidence: finalConfidence });
        }
      }, 10000);

    } catch (error) {
      console.error('[Streaming STT] Setup error:', error);
      reject(error);
    }
  });
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

// ElevenLabs TTS function with custom voice support
async function synthesizeSpeech(text, language, customVoiceId = null) {
  if (!customElevenLabs && !elevenlabs) {
    console.warn('ElevenLabs not configured');
    return null;
  }

  try {
    let voiceId;
    let voiceSettings;

    // Use custom voice if provided, otherwise fall back to default language voice
    if (customVoiceId && customVoices.voices[customVoiceId]) {
      const voiceConfig = customVoices.voices[customVoiceId];
      voiceId = voiceConfig.voiceId;
      voiceSettings = voiceConfig.settings;
      console.log(`[ElevenLabs] Using custom voice: ${voiceConfig.name} (${customVoiceId})`);
    } else {
      voiceId = languageMap[language]?.voiceId || languageMap['en'].voiceId;
      voiceSettings = {
        stability: 0.5,
        similarityBoost: 0.75,
        style: 0.0,
        useSpeakerBoost: true
      };
    }

    console.log(`[ElevenLabs] Synthesizing: "${text.substring(0, 50)}..." (voice: ${voiceId})`);

    // Use custom service if available
    if (customElevenLabs) {
      const result = await customElevenLabs.synthesize(text, voiceId, voiceSettings);
      console.log(`[ElevenLabs] Generated ${result.audio.length} bytes of audio`);
      return result.audio;
    }

    // Fallback to legacy client
    const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
      text: text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: voiceSettings.stability,
        similarity_boost: voiceSettings.similarityBoost,
        style: voiceSettings.style || 0,
        use_speaker_boost: voiceSettings.useSpeakerBoost
      }
    });

    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }

    const audioBuffer = Buffer.concat(chunks);
    console.log(`[ElevenLabs] Generated ${audioBuffer.length} bytes of audio`);
    return audioBuffer;
  } catch (error) {
    console.error('[ElevenLabs] TTS error:', error);
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

// Helper: Detect sentence boundaries
function hasSentenceBoundary(text) {
  // Check for period, question mark, or exclamation mark followed by space or end of string
  return /[.!?]\s+[A-Z]/.test(text) || /[.!?]$/.test(text.trim());
}

// Helper: Calculate average confidence from chunks
function averageConfidence(chunks) {
  if (chunks.length === 0) return 0;
  const sum = chunks.reduce((acc, chunk) => acc + chunk.confidence, 0);
  return sum / chunks.length;
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join or create room
  socket.on('join-room', (data) => {
    const { roomId, username, language, customVoiceId } = data;

    socket.join(roomId);

    // Store participant info
    participants.set(socket.id, {
      id: socket.id,
      username,
      language,
      roomId,
      customVoiceId: customVoiceId || null  // Store selected custom voice
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

  // NEW: Handle streaming audio chunks with server-side sentence reconstruction
  socket.on('audio-chunk', async (data) => {
    const { audioBuffer, roomId, utteranceId, status, chunkIndex, timestamp } = data;
    const participant = participants.get(socket.id);

    if (!participant) return;

    console.log(`[Chunking] ${participant.username} sent chunk #${chunkIndex} (${audioBuffer.byteLength} bytes, status: ${status}, utt: ${utteranceId})`);

    try {
      // Get user profile for HMLCP
      const { profile, uloLayer } = await getUserProfile(
        participant.username,
        participant.language
      );
      const customVocab = uloLayer.generateCustomVocabulary();

      // Transcribe chunk immediately (low latency!)
      const sttStart = Date.now();
      const { text: chunkText, confidence } = await transcribeAudio(
        Buffer.from(audioBuffer),
        participant.language,
        customVocab
      );
      const sttDuration = Date.now() - sttStart;

      console.log(`[Chunking] Chunk #${chunkIndex} transcribed in ${sttDuration}ms: "${chunkText}"`);

      // Initialize or get utterance buffer (even for empty chunks, if status is complete)
      if (!utteranceBuffers.has(utteranceId)) {
        utteranceBuffers.set(utteranceId, {
          chunks: [],
          socketId: socket.id,
          participant,
          roomId,
          startTime: Date.now(),
          language: participant.language
        });
        console.log(`[Chunking] Created new utterance buffer: ${utteranceId}`);
      }

      const utteranceBuffer = utteranceBuffers.get(utteranceId);

      // Append chunk text to buffer ONLY if not empty
      if (chunkText && chunkText.trim() !== '') {
        utteranceBuffer.chunks.push({
          text: chunkText,
          confidence,
          timestamp: Date.now(),
          chunkIndex
        });

        // Reconstruct accumulated text
        const accumulatedText = utteranceBuffer.chunks.map(c => c.text).join(' ');

        // Send interim transcription to speaker for real-time feedback
        socket.emit('interim-transcription', {
          text: accumulatedText,
          chunkCount: utteranceBuffer.chunks.length,
          utteranceId
        });

        // Broadcast interim to live monitor
        broadcastToMonitors({
          type: 'transcript',
          text: accumulatedText,
          transcriptType: 'partial',
          confidence: averageConfidence(utteranceBuffer.chunks),
          latencyMs: Date.now() - utteranceBuffer.startTime,
          language: participant.language,
          channelId: socket.id,
          timestamp: Date.now()
        });

        console.log(`[Chunking] Accumulated text (${utteranceBuffer.chunks.length} chunks): "${accumulatedText}"`);
      } else {
        console.log(`[Chunking] Empty chunk #${chunkIndex}, not adding to buffer`);
      }

      // Check if we should process the utterance
      // ONLY process when user stops speaking OR timeout (NOT on sentence boundaries during streaming)
      const shouldProcess =
        status === 'complete' || // User stopped speaking - this is when we translate
        (Date.now() - utteranceBuffer.startTime) > UTTERANCE_TIMEOUT_MS; // Timeout safety

      if (shouldProcess) {
        // Get accumulated text from buffer
        const accumulatedText = utteranceBuffer.chunks.map(c => c.text).join(' ').trim();

        // Skip processing if buffer is completely empty
        if (!accumulatedText || utteranceBuffer.chunks.length === 0) {
          console.log(`[Chunking] Utterance complete but buffer is empty, clearing: ${utteranceId}`);
          utteranceBuffers.delete(utteranceId);
          return;
        }
        const reason = status === 'complete' ? 'complete' : 'timeout';
        console.log(`[Chunking] Processing complete utterance (reason: ${reason}, ${utteranceBuffer.chunks.length} chunks): "${accumulatedText}"`);

        // Apply HMLCP ULO layer
        const processedText = uloLayer.apply(accumulatedText);
        profile.addTextSample(accumulatedText);

        // Emit to speaker
        socket.emit('transcription-result', {
          text: processedText,
          rawText: accumulatedText,
          confidence: averageConfidence(utteranceBuffer.chunks),
          language: participant.language
        });

        socket.emit('pipeline-log', {
          type: 'client',
          stage: 'stt-complete-streaming',
          message: `Streaming transcription complete: "${processedText}" (${utteranceBuffer.chunks.length} chunks, ${Date.now() - utteranceBuffer.startTime}ms)`,
          timestamp: Date.now()
        });

        // Translate and synthesize for each participant
        const room = rooms.get(roomId);
        if (room) {
          const translationPromises = Array.from(room.participants)
            .map(participantId => participants.get(participantId))
            .filter(p => p && p.id !== socket.id)
            .map(async (targetParticipant) => {
              try {
                const transStart = Date.now();

                // Translate
                const translatedText = await translateText(
                  processedText,
                  participant.language,
                  targetParticipant.language
                );
                const transDuration = Date.now() - transStart;

                // TTS (with custom voice if selected)
                const ttsStart = Date.now();
                const audioData = await synthesizeSpeech(
                  translatedText,
                  targetParticipant.language,
                  targetParticipant.customVoiceId
                );
                const ttsDuration = Date.now() - ttsStart;
                const totalLatency = Date.now() - utteranceBuffer.startTime;

                // Send translated audio
                io.to(targetParticipant.id).emit('translated-audio', {
                  originalText: processedText,
                  rawTranscription: accumulatedText,
                  translatedText,
                  audioData: audioData ? audioData.toString('base64') : null,
                  speakerUsername: participant.username,
                  speakerLanguage: participant.language,
                  latency: totalLatency,
                  timing: {
                    stt: Date.now() - utteranceBuffer.startTime,
                    translation: transDuration,
                    tts: ttsDuration,
                    total: totalLatency
                  }
                });

                io.to(targetParticipant.id).emit('pipeline-log', {
                  type: 'client',
                  stage: 'complete-streaming',
                  message: `✓ Streaming pipeline: ${totalLatency}ms (Trans: ${transDuration}ms, TTS: ${ttsDuration}ms, ${utteranceBuffer.chunks.length} chunks)`,
                  timestamp: Date.now()
                });

              } catch (error) {
                console.error(`[Chunking] Translation error:`, error);
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

        // Clear buffer for this utterance
        utteranceBuffers.delete(utteranceId);
        console.log(`[Chunking] Cleared utterance buffer: ${utteranceId}`);
      }

    } catch (error) {
      console.error(`[Chunking] Error processing chunk:`, error);
      socket.emit('pipeline-log', {
        type: 'client',
        stage: 'error',
        message: `Chunk processing error: ${error.message}`,
        timestamp: Date.now()
      });
    }
  });

  // LEGACY: Handle audio stream for transcription (kept for backwards compatibility)
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

      // HMLCP: Get user profile and custom vocabulary BEFORE transcription
      const { profile, uloLayer, patternExtractor } = await getUserProfile(
        participant.username,
        participant.language
      );
      const customVocab = uloLayer.generateCustomVocabulary();

      // Step 1: Transcribe with Deepgram (STT) using HMLCP custom vocabulary
      // Using batch API (works with webm audio from MediaRecorder)
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
        participant.language,
        customVocab  // HMLCP: Pass custom vocabulary to Deepgram
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

      // Broadcast to live monitor
      broadcastToMonitors({
        type: 'transcript',
        text: transcription,
        transcriptType: 'final',
        confidence: confidence,
        latencyMs: sttDuration,
        language: participant.language,
        channelId: socket.id,
        timestamp: Date.now()
      });

      // HMLCP: Apply ULO layer for personalized linguistic processing
      // (profile already loaded above before transcription)
      const processedTranscription = uloLayer.apply(transcription);

      // Store transcription sample for future pattern analysis
      profile.addTextSample(transcription);

      // Log ULO processing if text was modified
      if (processedTranscription !== transcription) {
        console.log(`[HMLCP] ULO applied: "${transcription}" → "${processedTranscription}"`);
        socket.emit('pipeline-log', {
          type: 'client',
          stage: 'hmlcp-ulo',
          message: `Personalized processing applied`,
          timestamp: Date.now()
        });
      }

      // Use processed transcription for translations
      const finalTranscription = processedTranscription;

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

            // Translate text with DeepL (using processed transcription)
            const translatedText = await translateText(
              finalTranscription,
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

            // Synthesize speech with ElevenLabs TTS (with custom voice if selected)
            const ttsStart = Date.now();
            console.log(`[${participant.username} → ${targetParticipant.username}] Starting TTS (ElevenLabs)...`);

            io.to(targetParticipant.id).emit('pipeline-log', {
              type: 'room',
              stage: 'tts-start',
              message: `Generating speech in your language`,
              timestamp: Date.now()
            });

            const audioData = await synthesizeSpeech(
              translatedText,
              targetParticipant.language,
              targetParticipant.customVoiceId
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

            // Broadcast translation to live monitor
            broadcastToMonitors({
              type: 'translation',
              originalText: finalTranscription,
              translatedText: translatedText,
              sourceLanguage: participant.language,
              targetLanguage: targetParticipant.language,
              asrLatencyMs: sttDuration,
              translationLatencyMs: transDuration,
              ttsLatencyMs: ttsDuration,
              totalLatencyMs: totalLatency,
              timestamp: Date.now()
            });

            // Send to specific participant
            io.to(targetParticipant.id).emit('translated-audio', {
              originalText: finalTranscription, // Use processed version for display
              rawTranscription: transcription, // Include raw for debugging
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

      // Also send processed transcription to speaker for confirmation
      socket.emit('transcription-result', {
        text: finalTranscription,
        rawText: transcription,
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

  // Audio ducking: Handle user speaking event
  socket.on('user-speaking', (data) => {
    const { roomId } = data;
    const participant = participants.get(socket.id);

    if (!participant) return;

    console.log(`[Ducking] ${participant.username} started speaking - broadcasting to room`);

    // Broadcast to other participants in the room (not to sender)
    socket.to(roomId).emit('peer-speaking', {
      username: participant.username,
      participantId: socket.id
    });
  });

  // Audio ducking: Handle user silence event
  socket.on('user-silence', (data) => {
    const { roomId } = data;
    const participant = participants.get(socket.id);

    if (!participant) return;

    console.log(`[Ducking] ${participant.username} stopped speaking - broadcasting to room`);

    // Broadcast to other participants in the room (not to sender)
    socket.to(roomId).emit('peer-silence', {
      username: participant.username,
      participantId: socket.id
    });
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

  // Handle monitor subscription (for live transcription monitor page)
  socket.on('subscribe-monitor', () => {
    console.log('[Monitor] Client subscribed:', socket.id);
    monitorSubscribers.add(socket.id);
    socket.emit('monitor-subscribed', { success: true });
  });

  // Handle monitor unsubscription
  socket.on('unsubscribe-monitor', () => {
    console.log('[Monitor] Client unsubscribed:', socket.id);
    monitorSubscribers.delete(socket.id);
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

    // Clean up monitor subscription
    if (monitorSubscribers.has(socket.id)) {
      monitorSubscribers.delete(socket.id);
      console.log('[Monitor] Client unsubscribed on disconnect:', socket.id);
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

// TEST ENDPOINT: Send fake transcripts to test webpage
app.get('/test-transcript', (req, res) => {
  console.log('[TEST] Sending fake transcripts to test Socket.IO connection...');

  // Send partial
  io.emit('transcriptionPartial', {
    text: 'This is a test partial transcript',
    language: 'en',
    type: 'partial'
  });
  console.log('[TEST] Sent partial transcript');

  // Send final after 1 second
  setTimeout(() => {
    io.emit('transcriptionFinal', {
      text: 'This is a test final transcript from the system',
      language: 'en',
      confidence: 0.95,
      type: 'final'
    });
    console.log('[TEST] Sent final transcript');
  }, 1000);

  res.json({
    status: 'ok',
    message: 'Fake transcripts sent! Check http://4.185.84.26:3000/test-live-stream.html',
    connectedClients: io.engine.clientsCount
  });
});

app.get('/api/languages', (req, res) => {
  res.json(languageMap);
});

// Get custom voices
app.get('/api/voices', (req, res) => {
  res.json({
    success: true,
    voices: Object.entries(customVoices.voices).map(([id, config]) => ({
      id,
      name: config.name,
      modelId: config.modelId
    }))
  });
});

// Generate voice preview
app.get('/api/voice-preview/:voiceId', async (req, res) => {
  const { voiceId } = req.params;

  if (!customElevenLabs) {
    return res.status(503).json({ error: 'ElevenLabs not configured' });
  }

  if (!customVoices.voices[voiceId]) {
    return res.status(404).json({ error: 'Voice not found' });
  }

  try {
    const voiceConfig = customVoices.voices[voiceId];
    const previewText = "Hello, this is a preview of my voice.";

    const result = await customElevenLabs.synthesize(
      previewText,
      voiceConfig.voiceId,
      voiceConfig.settings
    );

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': result.audio.length
    });
    res.send(result.audio);
  } catch (error) {
    console.error('[Voice Preview] Error:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
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

// Debug Audio API - List all debug audio files with metadata
app.get('/api/debug-audio', async (req, res) => {
  try {
    // Find all debug audio files using fs.readdirSync (no external dependencies)
    const tmpFiles = fs.readdirSync('/tmp');
    const files = tmpFiles
      .filter(f => f.startsWith('debug-audio-') && f.endsWith('.wav'))
      .map(f => path.join('/tmp', f));

    if (files.length === 0) {
      return res.json({
        totalFiles: 0,
        totalSessions: 0,
        totalSize: 0,
        sessions: []
      });
    }

    // Parse files and group by channel (session)
    const sessionMap = new Map();
    let totalSize = 0;

    for (const filePath of files) {
      try {
        const stat = fs.statSync(filePath);
        const filename = path.basename(filePath);

        // Parse filename: debug-audio-{channelId}-{timestamp}.wav
        const match = filename.match(/debug-audio-([^-]+)-(\d+)\.wav/);
        if (!match) continue;

        const channelId = match[1];
        const timestamp = parseInt(match[2]);

        // Create recording object
        const recording = {
          filename,
          url: `/tmp/${filename}`,  // Audio accessible via static /tmp route
          size: stat.size,
          timestamp,
          mtime: stat.mtimeMs
        };

        totalSize += stat.size;

        // Group by channel ID
        if (!sessionMap.has(channelId)) {
          sessionMap.set(channelId, {
            channelId,
            recordings: []
          });
        }

        sessionMap.get(channelId).recordings.push(recording);
      } catch (err) {
        console.error(`[API] Error reading file ${filePath}:`, err.message);
      }
    }

    // Sort recordings within each session by timestamp
    for (const session of sessionMap.values()) {
      session.recordings.sort((a, b) => a.timestamp - b.timestamp);
    }

    // Convert to array and sort by first recording timestamp
    const sessions = Array.from(sessionMap.values())
      .sort((a, b) => a.recordings[0].timestamp - b.recordings[0].timestamp);

    res.json({
      totalFiles: files.length,
      totalSessions: sessions.length,
      totalSize,
      sessions
    });

  } catch (error) {
    console.error('[API] Error listing debug audio:', error);
    res.status(500).json({ error: 'Failed to list debug audio files' });
  }
});

// Concatenate all frames for a session into one smooth playback file
app.post('/api/concatenate-session/:channelId', async (req, res) => {
  const { channelId } = req.params;

  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // Find all frames for this channel
    const tmpFiles = fs.readdirSync('/tmp');
    const sessionFiles = tmpFiles
      .filter(f => f.startsWith(`debug-audio-${channelId}-`) && f.endsWith('.wav'))
      .map(f => path.join('/tmp', f))
      .sort(); // Sort by filename (timestamp order)

    if (sessionFiles.length === 0) {
      return res.status(404).json({ error: 'No audio files found for this session' });
    }

    console.log(`[Concatenate] Found ${sessionFiles.length} frames for ${channelId}`);

    // Output file
    const outputFile = `/tmp/session-${channelId}-complete.wav`;

    // Create file list for ffmpeg
    const fileListPath = `/tmp/concat-list-${channelId}.txt`;
    const fileListContent = sessionFiles.map(f => `file '${f}'`).join('\n');
    fs.writeFileSync(fileListPath, fileListContent);

    // Use ffmpeg to concatenate (concat demuxer for exact frame concatenation)
    const ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i "${fileListPath}" -c copy "${outputFile}"`;

    console.log(`[Concatenate] Running: ${ffmpegCmd}`);
    await execAsync(ffmpegCmd);

    // Clean up file list
    fs.unlinkSync(fileListPath);

    // Get output file stats
    const stat = fs.statSync(outputFile);

    console.log(`[Concatenate] ✓ Created ${outputFile} (${stat.size} bytes, ${sessionFiles.length} frames)`);

    res.json({
      success: true,
      channelId,
      framesCount: sessionFiles.length,
      outputFile: `/tmp/session-${channelId}-complete.wav`,
      outputSize: stat.size,
      message: 'Session audio concatenated successfully'
    });

  } catch (error) {
    console.error('[Concatenate] Error:', error);
    res.status(500).json({
      error: 'Failed to concatenate audio',
      details: error.message
    });
  }
});

// Serve debug audio files from /tmp
app.use('/tmp', express.static('/tmp', {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.wav')) {
      res.set('Content-Type', 'audio/wav');
    }
  }
}));

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

// ============================================================================
// ASTERISK ARI INTEGRATION
// ============================================================================

const AsteriskARIHandler = require('./asterisk-ari-handler');
const ariHandler = new AsteriskARIHandler({
  io,
  rooms,
  participants,
  translationServices: {
    transcribeAudio,
    translateText,
    synthesizeSpeech,
    getUserProfile,
    languageMap
  }
});

// Connect to Asterisk ARI (async, won't block server startup)
ariHandler.connect().catch(err => {
  console.warn('[ARI] Failed to initialize:', err.message);
  console.warn('[ARI] Server will continue without telephony integration');
});

// Make ARI handler available globally for Socket.IO handlers
global.ariHandler = ariHandler;

// Clean up on server shutdown
process.on('SIGTERM', () => {
  console.log('[Server] Shutting down...');
  ariHandler.disconnect();
  server.close();
});

process.on('SIGINT', () => {
  console.log('[Server] Shutting down...');
  ariHandler.disconnect();
  server.close();
  process.exit(0);
});

// ============================================================================
// ExternalMedia Audio Orchestrator Integration
// ============================================================================

const AudioSocketOrchestrator = require('./audiosocket-orchestrator');
const { ASRStreamingWorker } = require('./asr-streaming-worker');

// Initialize ExternalMedia orchestrator (listens on port 5050 for Asterisk)
const audioSocketOrchestrator = new AudioSocketOrchestrator(5050);

// Start orchestrator
audioSocketOrchestrator.start();

// ASR worker for transcription
let asrWorker = null;

// Initialize ASR worker when first audio arrives
async function initializeASRWorker() {
    if (asrWorker && asrWorker.connected) {
        return asrWorker;
    }

    if (!deepgramApiKey) {
        console.warn('[AudioSocket] No Deepgram API key, ASR disabled');
        return null;
    }

    try {
        asrWorker = new ASRStreamingWorker(deepgramApiKey, 'en');
        await asrWorker.connect();
        console.log('[AudioSocket] ✓ ASR worker connected');

        // Forward transcripts to Socket.IO clients
        asrWorker.on('partial', (transcript) => {
            console.log('[AudioSocket] Partial:', transcript.text);
            io.emit('transcriptionPartial', {
                text: transcript.text,
                language: transcript.language,
                type: 'partial'
            });
        });

        asrWorker.on('final', (transcript) => {
            console.log('[AudioSocket] Final:', transcript.text);
            io.emit('transcriptionFinal', {
                text: transcript.text,
                language: transcript.language,
                confidence: transcript.confidence,
                type: 'final'
            });
        });

        return asrWorker;
    } catch (err) {
        console.error('[AudioSocket] ASR initialization failed:', err.message);
        return null;
    }
}

// Handle incoming PCM frames from ExternalMedia
audioSocketOrchestrator.on('pcm-frame', async (frame) => {
    console.log("[DEBUG] pcm-frame event received:", { hasFrame: !!frame, hasPcm: !!(frame && frame.pcm), sequenceNum: frame ? frame.sequenceNumber : null });

    // Initialize ASR worker on first frame
    if (!asrWorker) {
        console.log("[DEBUG] Initializing ASR worker...");
        await initializeASRWorker();
    }

    // Send frame to Deepgram
    if (asrWorker && asrWorker.connected) {
        console.log("[DEBUG] Sending audio to Deepgram, buffer size:", frame?.pcm?.length);
        asrWorker.sendAudio(frame.pcm, {
            segmentId: frame.sequenceNumber,
            duration: frame.duration
        });
    } else {
        console.log("[DEBUG] NOT sending - asrWorker connected:", !!asrWorker?.connected);
    }
});

// Log connections
audioSocketOrchestrator.on('connection', (info) => {
    console.log('[AudioSocket] ✓ Asterisk connected:', info.connectionId);
});

audioSocketOrchestrator.on('disconnect', (info) => {
    console.log('[AudioSocket] Asterisk disconnected:', {
        connectionId: info.connectionId,
        duration: `${info.duration.toFixed(1)}s`,
        frames: info.framesReceived
    });
});

// Make orchestrator available globally
global.audioSocketOrchestrator = audioSocketOrchestrator;

// Clean up on shutdown
process.on('SIGTERM', () => {
    if (audioSocketOrchestrator) {
        audioSocketOrchestrator.stop();
    }
    if (asrWorker) {
        asrWorker.disconnect();
    }
});

process.on('SIGINT', () => {
    if (audioSocketOrchestrator) {
        audioSocketOrchestrator.stop();
    }
    if (asrWorker) {
        asrWorker.disconnect();
    }
});

console.log('[AudioSocket] Orchestrator initialized on port 5050');
