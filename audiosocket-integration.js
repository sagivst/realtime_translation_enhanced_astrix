// ============================================================================
// Complete AudioSocket Pipeline: STT → Translation → TTS (OPTIMIZED)
// Asterisk → Deepgram → DeepL → ElevenLabs (PCM) → Asterisk
// Uses PCM output from ElevenLabs (16kHz) with simple downsampling to 8kHz
// ============================================================================

// Load environment variables FIRST
require('dotenv').config();

const AudioSocketOrchestrator = require('./audiosocket-orchestrator');
const { ASRStreamingWorker } = require('./asr-streaming-worker');
const { DeepLIncrementalMT } = require('./deepl-incremental-mt');  // Destructure the export
const ElevenLabsTTSService = require('./elevenlabs-tts-service');

const HumeStreamingClient = require('./hume-streaming-client');

// Get API keys from environment
const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
const deeplApiKey = process.env.DEEPL_API_KEY;
const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
const humeApiKey = process.env.HUME_EVI_API_KEY;

console.log('[Pipeline] Initializing complete translation pipeline...');
console.log('[Pipeline] Deepgram:', deepgramApiKey ? '✓' : '✗');
console.log('[Pipeline] DeepL:', deeplApiKey ? '✓' : '✗');
console.log('[Pipeline] ElevenLabs:', elevenlabsApiKey ? '✓' : '✗');
console.log('[Pipeline] Hume AI:', humeApiKey ? '✓' : '✗');

// Initialize AudioSocket orchestrator (listens on port 5050 for Asterisk)
const audioSocketOrchestrator = new AudioSocketOrchestrator(5050);

// Initialize translation services
const translator = deeplApiKey ? new DeepLIncrementalMT(deeplApiKey) : null;
const ttsService = elevenlabsApiKey ? new ElevenLabsTTSService(elevenlabsApiKey) : null;

// ASR worker for transcription
let asrWorker = null;
let humeWorker = null;

// Hume AI audio buffering (accumulate frames for better speech detection)
let humeAudioBuffer = [];
const HUME_BUFFER_SIZE = 50; // 50 frames = 1 second at 20ms per frame

// Track active connection
let activeConnectionId = null;
let activeSessionId = null;

// Translation configuration (TODO: make this dynamic per session)
// Language configuration - now dynamic from QA Settings
function getSourceLang() {
    return (global.qaConfig && global.qaConfig.sourceLang) || 'en';
}
function getTargetLang() {
    return (global.qaConfig && global.qaConfig.targetLang) || 'ja';
}
// ElevenLabs voice ID (TODO: make this configurable)
const VOICE_ID = 'pNInz6obpgDQGcFmaJgB';  // Default voice (Adam)

// Get Socket.IO instance from global (set by conference-server.js)
const getIO = () => global.io;

/**
 * Downsample PCM audio from 16kHz to 8kHz
 * Simple decimation: keep every other sample
 * Much faster than ffmpeg conversion!
 */
function downsamplePCM16to8(pcm16Buffer) {
    const samples16 = pcm16Buffer.length / 2; // 16-bit = 2 bytes per sample
    const samples8 = Math.floor(samples16 / 2);
    const pcm8Buffer = Buffer.alloc(samples8 * 2);

    for (let i = 0; i < samples8; i++) {
        // Copy every other sample (simple decimation)
        const srcOffset = i * 4; // Every 2nd sample in 16kHz
        const dstOffset = i * 2;
        pcm16Buffer.copy(pcm8Buffer, dstOffset, srcOffset, srcOffset + 2);
    }

    return pcm8Buffer;
}

// Initialize ASR worker when first audio arrives
// Initialize Hume AI worker for emotion detection
async function initializeHumeWorker() {
    if (humeWorker && humeWorker.connected) {
        return humeWorker;
    }
    
    if (!humeApiKey) {
        console.warn('[Hume] No API key, emotion detection disabled');
        return null;
    }
    
    try {
        humeWorker = new HumeStreamingClient(humeApiKey, {
            sampleRate: 8000,
            channels: 1
        });
        await humeWorker.connect();
        console.log('[Hume] ✓ Emotion detection worker connected');
        
        // Emit emotion metrics via Socket.IO
        humeWorker.on('metrics', (metrics) => {
            const io = getIO();
            if (io) {
                io.emit('emotion_detected', {
                    arousal: metrics.arousal,
                    valence: metrics.valence,
                    energy: metrics.energy,
                    timestamp: metrics.timestamp
                });
            }
        });
        
        return humeWorker;
    } catch (error) {
        console.error('[Hume] Error initializing worker:', error.message);
        return null;
    }
}


async function initializeASRWorker() {
    if (asrWorker && asrWorker.connected) {
        return asrWorker;
    }

    if (!deepgramApiKey) {
        console.warn('[Pipeline] No Deepgram API key, ASR disabled');
        return null;
    }

    try {
        asrWorker = new ASRStreamingWorker(deepgramApiKey, getSourceLang());
        await asrWorker.connect();
        console.log('[Pipeline] ✓ ASR worker connected');

        // Handle PARTIAL transcripts (real-time feedback)
        asrWorker.on('partial', (transcript) => {
            console.log('[Pipeline] Partial:', transcript.text);
            const io = getIO();
            if (io) {
                io.emit('transcriptionPartial', {
                    text: transcript.text,
                    language: transcript.language,
                    type: 'partial'
                });
            }
        });

        // Handle FINAL transcripts (trigger translation pipeline)
        asrWorker.on('final', async (transcript) => {
            console.log('[Pipeline] Final:', transcript.text);

            // Send transcript to browser
            const io = getIO();
            if (io) {
                io.emit('transcriptionFinal', {
                    text: transcript.text,
                    transcript: transcript.text,
                    language: transcript.language,
                    confidence: transcript.confidence,
                    type: 'final'
                });
            }

            // ========================================
            // TRANSLATION PIPELINE STARTS HERE
            // ========================================
            await processTranslationPipeline(transcript.text);
        });

        return asrWorker;
    } catch (err) {
        console.error('[Pipeline] ASR initialization failed:', err.message);
        return null;
    }
}

/**
 * Process complete translation pipeline:
 * 1. Translate text (DeepL)
 * 2. Synthesize audio as PCM 16kHz (ElevenLabs)
 * 3. Downsample to PCM 8kHz
 * 4. Send back to Asterisk
 */
async function processTranslationPipeline(originalText) {
    const pipelineStart = Date.now();

    console.log('[Pipeline] ═══════════════════════════════════════');
    console.log('[Pipeline] Starting translation pipeline');
    console.log('[Pipeline] Original text:', originalText);

try {
        // Step 1: Translate with DeepL (or bypass if source === target)
        if (!translator) {
            console.error('[Pipeline] DeepL not initialized, skipping translation');
            return;
        }

        const sourceLang = getSourceLang();
        const targetLang = getTargetLang();
        
        console.log(`[Pipeline] [1/4] Translation check: ${sourceLang} → ${targetLang}`);
        const translationStart = Date.now();
        
        let translationResult;
        let translationTime;
        
        // QA Mode: Bypass DeepL if source === target
        if (sourceLang === targetLang) {
            console.log('[Pipeline] ⚠️  QA Mode Active: Bypassing DeepL translation (same language)');
            translationResult = { text: originalText };
            translationTime = 0;
        } else {
            console.log('[Pipeline] Calling DeepL for translation...');
            translationResult = await translator.translateIncremental(
                activeSessionId || 'default-session',
                sourceLang,
                targetLang,
                originalText,
                true
            );
            translationTime = Date.now() - translationStart;
        }

        console.log('[Pipeline] ✓ Translation complete:', translationResult.text);
        console.log('[Pipeline]   Time:', translationTime, 'ms');

        // Send translation to browser
        const io = getIO();
        if (io) {
            io.emit('translationComplete', {
                original: originalText,
                translation: translationResult.text,
                sourceLang: sourceLang,
                targetLang: targetLang,
                time: translationTime
            });
        }

        // Step 2: Synthesize with ElevenLabs (PCM 16kHz output)
        if (!ttsService) {
            console.error('[Pipeline] ElevenLabs not initialized, skipping TTS');
            return;
        }

        console.log('[Pipeline] [2/4] Synthesizing speech (PCM 16kHz)...');
        const ttsStart = Date.now();

        // Override the synthesize method to use PCM output
        const axios = require('axios');
        const response = await axios.post(
            `${ttsService.baseURL}/text-to-speech/${VOICE_ID}`,
            {
                text: translationResult.text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    use_speaker_boost: true
                },
                output_format: 'mp3_44100_128'  // MP3 format
            },
            {
                headers: {
                    'xi-api-key': ttsService.apiKey,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer'
            }
        );

        const pcm16Buffer = Buffer.from(response.data);
        const ttsTime = Date.now() - ttsStart;

        console.log('[Pipeline] ✓ TTS complete');
        console.log('[Pipeline]   Audio size:', pcm16Buffer.length, 'bytes');
        console.log('[Pipeline]   Format: PCM 16kHz S16LE');
        console.log('[Pipeline]   Duration:', (pcm16Buffer.length / 2 / 16000).toFixed(2), 'seconds');
        console.log('[Pipeline]   Time:', ttsTime, 'ms');

        // Save ElevenLabs output to file for debugging
        const fs = require('fs');
        const timestamp = Date.now();
        const recordingPath = `./recordings/elevenlabs-${timestamp}-16khz.pcm`;
        try {
            fs.writeFileSync(recordingPath, pcm16Buffer);
            console.log('[Pipeline] 💾 Saved ElevenLabs output:', recordingPath);
        } catch (err) {
            console.error('[Pipeline] Failed to save recording:', err.message);
        }

        // Step 3: Downsample from 16kHz to 8kHz
        console.log('[Pipeline] [3/4] Downsampling to 8kHz...');
        const convertStart = Date.now();

        const pcm8Buffer = downsamplePCM16to8(pcm16Buffer);

        const convertTime = Date.now() - convertStart;
        console.log('[Pipeline] ✓ Downsampling complete');
        console.log('[Pipeline]   PCM 8kHz size:', pcm8Buffer.length, 'bytes');
        console.log('[Pipeline]   Audio duration:', (pcm8Buffer.length / 2 / 8000).toFixed(2), 'seconds');
        console.log('[Pipeline]   Time:', convertTime, 'ms');

        // Send translated audio to browser for playback (16kHz for better quality)
        if (io) {
            console.log('[Pipeline] 📤 Sending translated audio to browser...');
            io.emit('translatedAudio', {
                audio: pcm16Buffer.toString("base64"),  // Send MP3 as base64
                sampleRate: 44100,  // 44.1kHz MP3 from ElevenLabs
                channels: 1,
                bitDepth: 16,
                format: "mp3",
                translation: translationResult.text,
                original: originalText,
                duration: (pcm16Buffer.length / 2 / 16000).toFixed(2),
                timestamp: Date.now()
            });
            console.log('[Pipeline] ✓ Sent audio to browser:', pcm16Buffer.length, 'bytes');
        }

        // Step 4: Send PCM audio back to Asterisk via AudioSocket
        if (!activeConnectionId) {
            console.error('[Pipeline] No active AudioSocket connection');
            return;
        }

        console.log('[Pipeline] [4/4] Sending audio to Asterisk...');
        const sendStart = Date.now();

        const sent = audioSocketOrchestrator.sendAudio(activeConnectionId, pcm8Buffer);

        const sendTime = Date.now() - sendStart;

        if (sent) {
            console.log('[Pipeline] ✓ Audio sent to Asterisk');
            console.log('[Pipeline]   Time:', sendTime, 'ms');
        } else {
            console.error('[Pipeline] ✗ Failed to send audio to Asterisk');
        }

        // Calculate total pipeline time
        const totalTime = Date.now() - pipelineStart;
        console.log('[Pipeline] ═══════════════════════════════════════');
        console.log('[Pipeline] Pipeline complete!');
        console.log('[Pipeline] Total time:', totalTime, 'ms');
        console.log('[Pipeline]   - Translation:', translationTime, 'ms');
        console.log('[Pipeline]   - TTS (PCM):', ttsTime, 'ms');
        console.log('[Pipeline]   - Downsample:', convertTime, 'ms');
        console.log('[Pipeline]   - Send:', sendTime, 'ms');
        console.log('[Pipeline] ═══════════════════════════════════════');

        // Send pipeline stats to browser
        if (io) {
            io.emit('pipelineComplete', {
                original: originalText,
                translation: translationResult.text,
                totalTime,
                translationTime,
                ttsTime,
                convertTime,
                sendTime,
                audioSize: pcm8Buffer.length,
                audioDuration: (pcm8Buffer.length / 2 / 8000).toFixed(2)
            });
        }

    } catch (error) {
        console.error('[Pipeline] ✗ Pipeline error:', error.message);
        console.error('[Pipeline]   Stack:', error.stack);

        const io = getIO();
        if (io) {
            io.emit('pipelineError', {
                error: error.message,
                original: originalText
            });
        }
    }
}

// Handle incoming PCM frames from AudioSocket
audioSocketOrchestrator.on('pcm-frame', async (frame) => {
    // Initialize ASR worker on first frame
    if (!asrWorker) {
        await initializeASRWorker();
        await initializeHumeWorker();
    }

    // Send frame to Deepgram for transcription
    if (asrWorker && asrWorker.connected) {
        asrWorker.sendAudio(frame.pcm, {
            segmentId: frame.sequenceNumber,
            duration: frame.duration
        });
    }
    // Fork audio to Hume AI for emotion detection (buffered for speech detection)
    if (humeWorker && humeWorker.connected) {
        humeAudioBuffer.push(frame.pcm);

        // Send buffered audio once we have 1 second (50 frames × 20ms)
        if (humeAudioBuffer.length >= HUME_BUFFER_SIZE) {
            const combinedBuffer = Buffer.concat(humeAudioBuffer);
            humeWorker.sendAudio(combinedBuffer);
            console.log(`[Hume] Sent ${HUME_BUFFER_SIZE} frames (${combinedBuffer.length} bytes, 1 second buffer)`);
            humeAudioBuffer = []; // Reset buffer for next batch
        }
    }

    // FORK AUDIO TO BROWSER: Send same audio to Socket.IO clients for playback
    const io = getIO();
    if (io) {
        io.emit('audioStream', {
            buffer: frame.pcm,
            sequenceNumber: frame.sequenceNumber,
            sampleRate: 8000,
            channels: 1,
            bitDepth: 16,
            timestamp: Date.now()
        });
    }
});

// Log connections
audioSocketOrchestrator.on('connection', (info) => {
    if (activeConnectionId && activeConnectionId !== info.connectionId) {
        console.warn(`[Pipeline] ⚠️ Duplicate connection! Active: ${activeConnectionId}, New: ${info.connectionId}`);
    }

    activeConnectionId = info.connectionId;
    activeSessionId = info.connectionId; // Use connection ID as session ID

    console.log('[Pipeline] ✓ Asterisk connected:', info.connectionId);

    // Translation session initialized (DeepL doesn't need explicit session creation)
    console.log('[Pipeline] ✓ Translation ready for session:', activeSessionId);

    const io = getIO();
    if (io) {
        io.emit('audiosocket-connected', {
            connectionId: info.connectionId,
            uuid: info.connectionId,
            timestamp: Date.now()
        });

        io.emit('audioStreamStart', {
            connectionId: info.connectionId,
            format: {
                sampleRate: 8000,
                channels: 1,
                bitDepth: 16,
                encoding: 'pcm'
            }
        });
    }
});

audioSocketOrchestrator.on('handshake', (info) => {
    console.log('[Pipeline] ✓ Handshake complete:', info.uuid);

    const io = getIO();
    if (io) {
        io.emit('audiosocket-handshake', {
            uuid: info.uuid,
            connectionId: info.connectionId || info.uuid,
            timestamp: Date.now()
        });
    }
});

audioSocketOrchestrator.on('disconnect', (info) => {
    console.log('[Pipeline] Asterisk disconnected:', {
        connectionId: info.connectionId,
        uuid: info.uuid,
        duration: `${info.duration.toFixed(1)}s`,
        frames: info.framesReceived
    });

    // Clean up session
    if (activeConnectionId === info.connectionId || activeConnectionId === info.uuid) {
        activeConnectionId = null;

        // Clean up session
        console.log('[Pipeline] ✓ Session ended:', activeSessionId);

        activeSessionId = null;
        console.log('[Pipeline] Active connection cleared');
    }

    const io = getIO();
    if (io) {
        io.emit('audiosocket-disconnected', {
            connectionId: info.connectionId,
            uuid: info.uuid,
            duration: info.duration,
            frames: info.framesReceived,
            timestamp: Date.now()
        });

        io.emit('audioStreamEnd', {
            connectionId: info.connectionId || info.uuid,
            duration: info.duration,
            frames: info.framesReceived
        });
    }
});

// Start orchestrator
audioSocketOrchestrator.start();

// Make orchestrator available globally
global.audioSocketOrchestrator = audioSocketOrchestrator;

// Clean up on shutdown
process.on('SIGTERM', () => {
    if (audioSocketOrchestrator) {
        audioSocketOrchestrator.stop();
    }
    if (asrWorker) {
        asrWorker.disconnect();
        if (humeWorker) {
            humeWorker.disconnect();
            humeWorker = null;
        }
    }
});

process.on('SIGINT', () => {
    if (audioSocketOrchestrator) {
        audioSocketOrchestrator.stop();
    }
    if (asrWorker) {
        asrWorker.disconnect();
        if (humeWorker) {
            humeWorker.disconnect();
            humeWorker = null;
        }
    }
});

console.log('[Pipeline] ═══════════════════════════════════════════════════');
console.log('[Pipeline] Complete Translation Pipeline Initialized');
console.log('[Pipeline] ═══════════════════════════════════════════════════');
console.log('[Pipeline] Flow: Asterisk → Deepgram STT → DeepL MT → ElevenLabs TTS (PCM) → Asterisk');
console.log('[Pipeline] AudioSocket: port 5050');
console.log('[Pipeline] Languages:', getSourceLang(), '→', getTargetLang());
console.log('[Pipeline] Voice ID:', VOICE_ID);
console.log('[Pipeline] Audio: 16kHz PCM → 8kHz PCM (simple downsampling)');
console.log('[Pipeline] ═══════════════════════════════════════════════════');

// Log Socket.IO status after delay
setTimeout(() => {
    const io = getIO();
    console.log('[Pipeline] Socket.IO:', !!io ? 'AVAILABLE ✓' : 'NOT AVAILABLE ✗');
}, 2000);
