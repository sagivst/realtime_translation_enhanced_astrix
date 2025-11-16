// ============================================================================
// Complete AudioSocket Pipeline: STT → Translation → TTS (OPTIMIZED)
// Asterisk → Deepgram → DeepL → ElevenLabs (PCM) → Asterisk
// Uses PCM output from ElevenLabs (16kHz) with simple downsampling to 8kHz
// ============================================================================

// Load environment variables FIRST
require('dotenv').config();

// ============================================================================
// Comfort Noise Config Update Handler
// ============================================================================
function applyComfortNoiseConfig() {
    console.log('[audiosocket] applyComfortNoiseConfig() called');
    console.log('[audiosocket] global.comfortNoiseConfig:', JSON.stringify(global.comfortNoiseConfig));

    if (!global.comfortNoiseConfig) {
        console.log('[audiosocket] No comfort noise config to apply');
        return;
    }

    // Apply to all active audio stream buffers
    if (global.activeAudioStreamBuffers) {
        console.log('[audiosocket] Applying to', global.activeAudioStreamBuffers.size, 'active buffers');
        global.activeAudioStreamBuffers.forEach((buffer, participantId) => {
            console.log('[audiosocket] Updating buffer for participant:', participantId);
            buffer.updateComfortNoiseConfig(global.comfortNoiseConfig);

            if (global.comfortNoiseConfig.bufferDelay !== undefined) {
                console.log('[audiosocket] Setting delay to:', global.comfortNoiseConfig.bufferDelay, 'ms');
                buffer.setDelay(global.comfortNoiseConfig.bufferDelay);
            }
        });
        console.log('[audiosocket] ✓ Config applied to all active buffers');
    } else {
        console.log('[audiosocket] No active buffers - config will apply on next call');
    }
}

// Export globally so conference-server can call it
global.applyComfortNoiseConfig = applyComfortNoiseConfig;

// Track active audio stream buffers
if (!global.activeAudioStreamBuffers) {
    global.activeAudioStreamBuffers = new Map();
}



const AudioSocketOrchestrator = require('./audiosocket-orchestrator');
const { ASRStreamingWorker } = require('./asr-streaming-worker');
const { DeepLIncrementalMT } = require('./deepl-incremental-mt');  // Destructure the export
const ElevenLabsTTSService = require('./elevenlabs-tts-service');

const HumeStreamingClient = require('./hume-streaming-client');
const AudioStreamBuffer = require('./audio-stream-buffer');
const WebSocket = require('ws');

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

// Audio Stream Buffer for comfort noise and delay (per call)
let audioStreamBuffer = null;

// WebSocket connection to mic endpoint (for injecting audio as microphone input)
let micWebSocket = null;

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

/**
 * Send audio to WebSocket mic endpoint in proper frames
 * WebSocket expects raw PCM binary data in 640-byte frames (16kHz, 20ms)
 */
function sendAudioToMicEndpoint(pcmBuffer) {
    if (!micWebSocket || micWebSocket.readyState !== WebSocket.OPEN) {
        console.warn('[MicWebSocket] Not connected, cannot send audio');
        return;
    }

    const FRAME_SIZE = 640; // 16kHz * 20ms * 2 bytes = 640 bytes per frame
    const numFrames = Math.floor(pcmBuffer.length / FRAME_SIZE);

    for (let i = 0; i < numFrames; i++) {
        const frame = pcmBuffer.slice(i * FRAME_SIZE, (i + 1) * FRAME_SIZE);
        micWebSocket.send(frame);
    }

    // Send remaining partial frame if any
    if (pcmBuffer.length % FRAME_SIZE !== 0) {
        const remainingFrame = pcmBuffer.slice(numFrames * FRAME_SIZE);
        micWebSocket.send(remainingFrame);
    }
}

// Initialize ASR worker when first audio arrives
// Initialize Hume AI worker for emotion detection

// ============================================================================
// Initialize Audio Stream Buffer (per call, per language)
// ============================================================================
function initializeAudioStreamBuffer(participantId) {
    if (audioStreamBuffer) {
        console.log('[Pipeline] AudioStreamBuffer already initialized');
        return audioStreamBuffer;
    }

    console.log('[Pipeline] Initializing AudioStreamBuffer for participant:', participantId);

    // Create AudioStreamBuffer with 16kHz (matches WebSocket mic endpoint requirement)
    audioStreamBuffer = new AudioStreamBuffer({
        sampleRate: 16000,  // 16kHz to match WebSocket mic endpoint
        channels: 1,
        bitDepth: 16,
        maxBufferSize: 2000  // 2 second max buffer
    });

    // Enable comfort noise by default
    const defaultComfortNoiseConfig = {
        enabled: true,  // Enable by default
        noiseType: 'white',
        speechLevel: -30,
        silenceLevel: -15,
        vadThreshold: 0.01,
        fadeInMs: 50,
        fadeOutMs: 50,
        bufferDelay: 0
    };

    // Apply global comfort noise config if available, otherwise use defaults
    const configToApply = global.comfortNoiseConfig || defaultComfortNoiseConfig;
    console.log('[Pipeline] Applying comfort noise config:', configToApply);
    audioStreamBuffer.updateComfortNoiseConfig(configToApply);

    if (configToApply.bufferDelay !== undefined) {
        audioStreamBuffer.setDelay(configToApply.bufferDelay);
    }

    // Register in global tracking Map
    if (global.activeAudioStreamBuffers) {
        global.activeAudioStreamBuffers.set(participantId, audioStreamBuffer);
        console.log('[Pipeline] ✓ Registered buffer in global.activeAudioStreamBuffers');
        console.log('[Pipeline] Active buffers:', global.activeAudioStreamBuffers.size);
    }

    // Create WebSocket connection to mic endpoint
    const micEndpointUrl = `ws://127.0.0.1:5051/mic/${participantId}`;
    console.log('[MicWebSocket] Connecting to:', micEndpointUrl);

    micWebSocket = new WebSocket(micEndpointUrl);

    micWebSocket.on('open', () => {
        console.log('[MicWebSocket] ✓ Connected to mic endpoint');
        console.log('[MicWebSocket] Audio will be injected as microphone input');
    });

    micWebSocket.on('error', (error) => {
        console.error('[MicWebSocket] ✗ Connection error:', error.message);
    });

    micWebSocket.on('close', () => {
        console.log('[MicWebSocket] Disconnected from mic endpoint');
    });

    // Listen for processed audio from buffer and send to mic endpoint (NOT speaker)
    audioStreamBuffer.on('audioReady', (audioData) => {
        // Extract buffer from audioData object {buffer, metadata, actualDelay}
        const pcmBuffer = audioData.buffer;

        // Send to WebSocket mic endpoint instead of AudioSocket speaker
        sendAudioToMicEndpoint(pcmBuffer);

        console.log('[Pipeline] ✓ Audio sent to mic channel (16kHz,', pcmBuffer.length, 'bytes)');
    });

    console.log('[Pipeline] ✓ AudioStreamBuffer initialized (16kHz, comfort noise enabled)');
    return audioStreamBuffer;
}

async function initializeHumeWorker() {
    
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
            console.log('[DEBUG] Metrics listener callback triggered!');
            const io = getIO();
            console.log('[DEBUG] getIO() returned:', io ? 'VALID' : 'NULL');
        console.log("[Hume] ✓ Metrics listener attached to worker");
            if (io) {
                console.log('[DEBUG] About to emit emotion_detected event');
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
            console.log('[DEBUG] getIO() returned:', io ? 'VALID' : 'NULL');
            if (io) {
                io.emit('transcriptionPartial', {
                    connectionId: activeConnectionId,
                    uuid: activeSessionId,
                    text: transcript.text,
                    language: transcript.language,
                    type: 'partial'
                });
            }
        });

        // Handle FINAL transcripts (trigger translation pipeline)
        asrWorker.on('final', async (transcript) => {
            console.log('[Pipeline] Final:', transcript.text);
            const asrEndTime = performance.now();  // Capture ASR end time for network latency measurement

            // Send transcript to browser
            const io = getIO();
            console.log('[DEBUG] getIO() returned:', io ? 'VALID' : 'NULL');
            if (io) {
                io.emit('transcriptionFinal', {
                    connectionId: activeConnectionId,
                    uuid: activeSessionId,
                    text: transcript.text,
                    transcript: transcript.text,
                    language: transcript.language,
                    confidence: transcript.confidence,
                    type: 'final',
                    latency: transcript.latency || 100
                });
            }

            // ========================================
            // TRANSLATION PIPELINE STARTS HERE
            // ========================================
            await processTranslationPipeline(transcript.text, asrEndTime);
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
async function processTranslationPipeline(originalText, asrEndTime) {
    const pipelineStart = performance.now();

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
        const translationStart = performance.now();
        const asrToMtNetwork = translationStart - asrEndTime;  // Network latency: ASR end → MT start
        console.log(`[TIMING-VERIFY] ASR ended at ${asrEndTime}, MT started at ${translationStart}, Network: ${asrToMtNetwork}ms`);
        
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
            console.log('[DEBUG] getIO() returned:', io ? 'VALID' : 'NULL');
        if (io) {
            io.emit('translationComplete', {
            connectionId: activeConnectionId,
            uuid: activeSessionId,
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
        const ttsStart = performance.now();
        const mtToTtsNetwork = ttsStart - (translationStart + translationTime);  // Network latency: MT end → TTS start
        console.log(`[TIMING-VERIFY] MT: ${translationStart} + ${translationTime} = ${translationStart + translationTime}, TTS started at ${ttsStart}, Network: ${mtToTtsNetwork}ms`);

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
                output_format: "pcm_16000"  // MP3 format
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
        const ttsTime = performance.now() - ttsStart;

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

        // Step 3: Skip downsampling - use 16kHz directly for mic endpoint
        console.log('[Pipeline] [3/4] Using 16kHz PCM directly (no downsampling needed)');
        const convertStart = performance.now();

        const ttsToBufferNetwork = convertStart - (ttsStart + ttsTime);  // Network latency: TTS end → Buffer start
        console.log(`[TIMING-VERIFY] TTS: ${ttsStart} + ${ttsTime} = ${ttsStart + ttsTime}, Buffer started at ${convertStart}, Network: ${ttsToBufferNetwork}ms`);

        const convertTime = 0; // No conversion needed
        console.log('[Pipeline] ✓ Audio ready for buffer (16kHz)');
        console.log('[Pipeline]   PCM 16kHz size:', pcm16Buffer.length, 'bytes');
        console.log('[Pipeline]   Audio duration:', (pcm16Buffer.length / 2 / 16000).toFixed(2), 'seconds');

        // Send translated audio to browser for playback (16kHz for better quality)
        if (io) {
            console.log('[Pipeline] 📤 Sending translated audio to browser...');
            io.emit('translatedAudio', {
                audio: pcm16Buffer.toString("base64"),  // Send as Buffer (same as audioStream)
                sampleRate: 16000,  // 16kHz PCM from ElevenLabs
                channels: 1,
                bitDepth: 16,
                format: "pcm",
                translation: translationResult.text,
                original: originalText,
                duration: (pcm16Buffer.length / 2 / 16000).toFixed(2),
                timestamp: Date.now()
            });
            console.log('[Pipeline] ✓ Sent audio to browser:', pcm16Buffer.length, 'bytes');
        }

        // Step 4: Send PCM audio to mic endpoint via AudioStreamBuffer
        if (!activeConnectionId) {
            console.error('[Pipeline] No active AudioSocket connection');
            return;
        }

        console.log('[Pipeline] [4/4] Sending audio through AudioStreamBuffer to mic endpoint...');
        const sendStart = performance.now();

        const bufferToSendNetwork = sendStart - convertStart;  // Network latency: Buffer start → Send start
        console.log(`[TIMING-VERIFY] Buffer: ${convertStart}, Send started at ${sendStart}, Network: ${bufferToSendNetwork}ms`);

        // Route through AudioStreamBuffer for comfort noise and delay
        if (audioStreamBuffer) {
            console.log('[Pipeline] Routing 16kHz audio through AudioStreamBuffer');
            audioStreamBuffer.addAudioChunk(pcm16Buffer);  // Send 16kHz buffer directly
            console.log('[Pipeline] ✓ Audio queued in buffer (will be sent to mic endpoint)');
        } else {
            console.warn('[Pipeline] No AudioStreamBuffer - audio cannot be sent to mic endpoint!');
        }

        const sendTime = performance.now() - sendStart;
        console.log('[Pipeline] ✓ Audio processing time:', sendTime, 'ms');

        // Calculate total pipeline time
        const totalTime = performance.now() - pipelineStart;
        console.log('[Pipeline] ═══════════════════════════════════════');
        console.log('[Pipeline] Pipeline complete!');
        console.log('[Pipeline] Total time:', totalTime, 'ms');
        console.log('[Pipeline]   - Translation:', translationTime, 'ms');
        console.log('[Pipeline]   - TTS (PCM):', ttsTime, 'ms');
        console.log('[Pipeline]   - Buffer:', convertTime, 'ms');
        console.log('[Pipeline]   - Send:', sendTime, 'ms');
        console.log('[Pipeline] ═══════════════════════════════════════');
        console.log('[Pipeline]   - Network (ASR→MT):', asrToMtNetwork, 'ms');
        console.log('[Pipeline]   - Network (MT→TTS):', mtToTtsNetwork, 'ms');
        console.log('[Pipeline]   - Network (TTS→Buffer):', ttsToBufferNetwork, 'ms');
        console.log('[Pipeline]   - Network (Buffer→Send):', bufferToSendNetwork, 'ms');

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
                audioSize: pcm16Buffer.length,
                audioDuration: (pcm16Buffer.length / 2 / 16000).toFixed(2),
                humeTime: 85,  // Parallel processing (typical emotion detection time) - does not block pipeline
                asrToMtNetwork,               // Network latency: ASR → MT
                mtToTtsNetwork,               // Network latency: MT → TTS
                ttsToBufferNetwork,           // Network latency: TTS → Buffer
                bufferToSendNetwork           // Network latency: Buffer → Send
            });
        }

    } catch (error) {
        console.error('[Pipeline] ✗ Pipeline error:', error.message);
        console.error('[Pipeline]   Stack:', error.stack);

        const io = getIO();
            console.log('[DEBUG] getIO() returned:', io ? 'VALID' : 'NULL');
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
            console.log('[DEBUG] getIO() returned:', io ? 'VALID' : 'NULL');
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

    // Initialize AudioStreamBuffer for this call
    initializeAudioStreamBuffer(info.connectionId);

    // Translation session initialized (DeepL doesn't need explicit session creation)
    console.log('[Pipeline] ✓ Translation ready for session:', activeSessionId);

    const io = getIO();
            console.log('[DEBUG] getIO() returned:', io ? 'VALID' : 'NULL');
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
            console.log('[DEBUG] getIO() returned:', io ? 'VALID' : 'NULL');
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

        // Clean up WebSocket mic connection
        if (micWebSocket) {
            console.log('[MicWebSocket] Closing connection...');
            micWebSocket.close();
            micWebSocket = null;
            console.log('[MicWebSocket] ✓ Connection closed');
        }

        // Clean up AudioStreamBuffer
        if (audioStreamBuffer) {
            console.log('[Pipeline] Cleaning up AudioStreamBuffer');

            // Remove from global tracking
            if (global.activeAudioStreamBuffers) {
                global.activeAudioStreamBuffers.delete(info.connectionId);
                global.activeAudioStreamBuffers.delete(info.uuid);
                console.log('[Pipeline] ✓ Removed buffer from tracking. Active buffers:', global.activeAudioStreamBuffers.size);
            }

            audioStreamBuffer = null;
        }

        // Clean up session
        console.log('[Pipeline] ✓ Session ended:', activeSessionId);

        activeSessionId = null;
        console.log('[Pipeline] Active connection cleared');
    }

    const io = getIO();
            console.log('[DEBUG] getIO() returned:', io ? 'VALID' : 'NULL');
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
console.log('[Pipeline] Flow: Asterisk → Deepgram STT → DeepL MT → ElevenLabs TTS (PCM 16kHz) → AudioStreamBuffer → WebSocket Mic Endpoint');
console.log('[Pipeline] AudioSocket: port 5050 (receives audio FROM caller mic)');
console.log('[Pipeline] WebSocket Mic: port 5051 (sends audio TO caller mic as input)');
console.log('[Pipeline] Languages:', getSourceLang(), '→', getTargetLang());
console.log('[Pipeline] Voice ID:', VOICE_ID);
console.log('[Pipeline] Audio: 16kHz PCM (with comfort noise) → Mic endpoint');
console.log('[Pipeline] Comfort Noise: ENABLED by default');
console.log('[Pipeline] ═══════════════════════════════════════════════════');

// Log Socket.IO status after delay
setTimeout(() => {
    const io = getIO();
            console.log('[DEBUG] getIO() returned:', io ? 'VALID' : 'NULL');
    console.log('[Pipeline] Socket.IO:', !!io ? 'AVAILABLE ✓' : 'NOT AVAILABLE ✗');
}, 2000);
