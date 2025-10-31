// ============================================================================
// Complete AudioSocket Pipeline: STT → Translation → TTS (OPTIMIZED)
// Asterisk → Deepgram → DeepL → ElevenLabs (PCM) → Asterisk
// Uses PCM output from ElevenLabs (16kHz) with simple downsampling to 8kHz
// REFACTORED FOR DUAL-PROCESS SUPPORT (7000 and 7001)
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
const LatencySyncManager = require("./latency-sync-manager");
const WebSocket = require('ws');

// Get API keys from environment
const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
const deeplApiKey = process.env.DEEPL_API_KEY;
const deeplApiKey7001 = process.env.DEEPL_API_KEY_7001 || deeplApiKey;  // Fallback to primary key
const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
const humeApiKey = process.env.HUME_EVI_API_KEY;

console.log('[Pipeline] Initializing complete translation pipeline...');
console.log('[Pipeline] Deepgram:', deepgramApiKey ? '✓' : '✗');
console.log('[Pipeline] DeepL:', deeplApiKey ? '✓' : '✗');
console.log('[Pipeline] ElevenLabs:', elevenlabsApiKey ? '✓' : '✗');
console.log('[Pipeline] Hume AI:', humeApiKey ? '✓' : '✗');

// Initialize AudioSocket orchestrator (listens on port 5050 for Asterisk)
// Dual AudioSocket orchestrators
const audioSocketOrchestrator5050 = new AudioSocketOrchestrator(5050, 5051);  // Extension 7000
const audioSocketOrchestrator5052 = new AudioSocketOrchestrator(5052, 5053);  // Extension 7001
const audioSocketOrchestrator = audioSocketOrchestrator5050;  // Backward compatibility

// Initialize translation services (shared across all calls)
// Separate DeepL instances for each extension (prevents concurrent request blocking)
const translator7000 = deeplApiKey ? new DeepLIncrementalMT(deeplApiKey) : null;
const translator7001 = deeplApiKey7001 ? new DeepLIncrementalMT(deeplApiKey7001) : null;
const translator = translator7000;  // Backward compatibility
const ttsService = elevenlabsApiKey ? new ElevenLabsTTSService(elevenlabsApiKey) : null;

// Helper function to get correct translator for extension
function getTranslator(extension) {
    console.log("[DeepL Router] Extension:", extension, "-> Using translator7000:", (extension !== "7001"), "translator7001:", (extension === "7001"));
    if (extension === "7001") return translator7001;
    return translator7000;  // Default to 7000
}

// ============================================================================
// MULTI-PROCESS SESSION MANAGEMENT
// Each call (7000-xxx, 7001-xxx) gets its own session with dedicated workers
// ============================================================================
const activeSessions = new Map();

/**
 * Parse extension number from UUID
 * Format: "7000-xxxxx" or "7001-xxxxx"
 * Returns: "7000" or "7001"
 */
function getExtensionFromUUID(uuid) {
    if (!uuid) return null;
    // Handle simple string IDs: "7000" or "7001" (from AudioSocket parameter)
    if (uuid === "7000" || uuid === "7001") {
        return uuid;
    }
    // Handle prefixed IDs: "7000xxx..." or "7001xxx..."
    if (uuid.startsWith("7000")) return "7000";
    if (uuid.startsWith("7001")) return "7001";
    // Fallback: return null if no match
    return null;
}

/**
 * Get or create session for a given UUID
 */
function getSession(uuid, extensionId) {
    if (!activeSessions.has(uuid)) {
        console.log('[Pipeline] Creating new session for:', uuid);
        const extension = extensionId || getExtensionFromUUID(uuid);  // Prefer passed extensionId
        activeSessions.set(uuid, {
            uuid: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
            extension: extension,
            asrWorker: null,
            humeWorker: null,
            audioStreamBuffer: null,
            micWebSocket: null,
            humeAudioBuffer: [],
            created: Date.now(),
            // Timing tracking for new stages
            firstAudioFrameTime: null,  // When first audio frame arrives
            lastAudioFrameTime: null,   // Last frame timestamp for gap measurement
            lsEnterTime: null,           // When audio enters Latency Sync buffer
            lsExitTime: null,            // When audio exits Latency Sync buffer
            bridgeInjectTime: null       // When audio is injected into bridge
        });
    }
    return activeSessions.get(uuid);
}

/**
 * Remove session
 */
function removeSession(uuid) {
    const session = activeSessions.get(uuid);
    if (session) {
        // Clean up resources
        if (session.micWebSocket) {
            session.micWebSocket.close();
        }
        if (session.asrWorker) {
            session.asrWorker.disconnect();
        }
        if (session.humeWorker) {
            session.humeWorker.disconnect();
        }
        if (session.audioStreamBuffer && global.activeAudioStreamBuffers) {
            global.activeAudioStreamBuffers.delete(uuid);
        }

        activeSessions.delete(uuid);
        console.log('[Pipeline] ✓ Session removed:', uuid, '| Active sessions:', activeSessions.size);
    }
}

// ElevenLabs voice ID (TODO: make this configurable)
const VOICE_ID = 'pNInz6obpgDQGcFmaJgB';  // Default voice (Adam)

// Get Socket.IO instance from global (set by conference-server.js)
const getIO = () => global.io;

// Latency & Synchronization Manager
let syncManager = null;
function initializeSyncManager() {
    const io = getIO();
    if (!io) {
        console.log("[Sync] Socket.IO not available yet");
        return;
    }
    if (syncManager) return;
    console.log("[Sync] Initializing Latency & Sync Manager...");
    syncManager = new LatencySyncManager(io, null);
    syncManager.start();
    console.log("[Sync] Manager initialized and started");
}
setTimeout(() => { initializeSyncManager(); }, 3000);

// Translation configuration - per-extension from QA Settings
function getSourceLang(extension) {
    const config = global.qaConfigs && global.qaConfigs.get(extension);
    return (config && config.sourceLang) || 'en';
}
function getTargetLang(extension) {
    const config = global.qaConfigs && global.qaConfigs.get(extension);
    return (config && config.targetLang) || 'fr';
}

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
function sendAudioToMicEndpoint(micWebSocket, pcmBuffer) {
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

// Phase 2: Export as global for INJECT_AUDIO handler
global.sendAudioToMicEndpoint = sendAudioToMicEndpoint;

// ============================================================================
// Initialize Audio Stream Buffer (per call, per language)
// ============================================================================
function initializeAudioStreamBuffer(uuid) {
    const session = getSession(uuid);

    if (session.audioStreamBuffer) {
        console.log('[Pipeline] AudioStreamBuffer already initialized for', uuid);
        return session.audioStreamBuffer;
    }

    console.log('[Pipeline] Initializing AudioStreamBuffer for:', uuid);

    // Create AudioStreamBuffer with 16kHz (matches WebSocket mic endpoint requirement)
    session.audioStreamBuffer = new AudioStreamBuffer({
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
    session.audioStreamBuffer.updateComfortNoiseConfig(configToApply);

    if (configToApply.bufferDelay !== undefined) {
        session.audioStreamBuffer.setDelay(configToApply.bufferDelay);
    }

    // Register in global tracking Map
    if (global.activeAudioStreamBuffers) {
        global.activeAudioStreamBuffers.set(uuid, session.audioStreamBuffer);
        console.log('[Pipeline] ✓ Registered buffer in global.activeAudioStreamBuffers');
        console.log('[Pipeline] Active buffers:', global.activeAudioStreamBuffers.size);
    }

    // Create WebSocket connection to mic endpoint
    const micEndpointUrl = `ws://127.0.0.1:5051/mic/${uuid}`;
    console.log('[MicWebSocket] Connecting to:', micEndpointUrl);

    session.micWebSocket = new WebSocket(micEndpointUrl);

    session.micWebSocket.on('open', () => {
        console.log('[MicWebSocket] ✓ Connected to mic endpoint for', uuid);
        console.log('[MicWebSocket] Audio will be injected as microphone input');
    });

    session.micWebSocket.on('error', (error) => {
        console.error('[MicWebSocket] ✗ Connection error for', uuid, ':', error.message);
    });

    session.micWebSocket.on('close', () => {
        console.log('[MicWebSocket] Disconnected from mic endpoint for', uuid);
    });

    // Listen for processed audio from buffer and send to mic endpoint (NOT speaker)
    session.audioStreamBuffer.on('audioReady', (audioData) => {
        // Extract buffer from audioData object {buffer, metadata, actualDelay}
        const pcmBuffer = audioData.buffer;
        const actualDelay = audioData.actualDelay || 0;

        // Track when audio exits LS buffer
        session.lsExitTime = performance.now();

        // Report LS (Latency Sync) delay - only positive values (negative = no sync needed, show 0)
        const lsDelay = Math.max(0, actualDelay);
        console.log(`[Timing] ${uuid} LS sync delay: ${lsDelay}ms (actualDelay: ${actualDelay}ms)`);

        // Hook: Sync Manager LS Delay (only positive sync delays)
        if (syncManager) {
            syncManager.onLatencyMeasure({
                extension: session.extension,
                stage: 'ls',
                latency: lsDelay
            });
        }

        // Phase 2: Route audio through timing server for buffering (controlled by env var)
        const ENABLE_PHASE2 = process.env.TIMING_PHASE2_ENABLED === 'true';

        if (ENABLE_PHASE2 && global.timingClient && global.timingClient.connected && session.extension) {
            // Phase 2: Send audio packet to timing server for buffering and synchronized injection
            console.log(`[Phase2] Sending audio packet to timing server for ext ${session.extension}`);
            global.timingClient.sendAudioPacket(
                String(session.extension),
                pcmBuffer,
                Date.now()
            );
            console.log('[Pipeline] ✓ Audio sent to timing server for buffering (Phase 2)');
        } else {
            // Phase 1: Direct bridge injection (current behavior)
            const bridgeInjectStart = performance.now();
            sendAudioToMicEndpoint(session.micWebSocket, pcmBuffer);

            // Track bridge injection completion
            session.bridgeInjectTime = performance.now();
            const bridgeInjectTime = session.bridgeInjectTime - bridgeInjectStart;

            console.log('[Pipeline] ✓ Audio sent to bridge for', uuid, '(16kHz,', pcmBuffer.length, 'bytes)');
            console.log(`[Timing] ${uuid} Bridge injection time: ${bridgeInjectTime}ms`);
        }

        // Calculate LS→Bridge gap (only for Phase 1 direct injection)
        if (!ENABLE_PHASE2 && session.lsExitTime && session.bridgeInjectTime) {
            const lsToBridgeGap = session.bridgeInjectTime - session.lsExitTime;
            console.log(`[Timing] ${uuid} LS→Bridge gap: ${lsToBridgeGap}ms`);

            // Hook: Sync Manager LS→Bridge Gap
            if (syncManager) {
                syncManager.onOverheadMeasure({
                    extension: session.extension,
                    stage: 'ls_to_bridge',
                    overhead: lsToBridgeGap
                });
            }
        }
    });

    console.log('[Pipeline] ✓ AudioStreamBuffer initialized for', uuid, '(16kHz, comfort noise enabled)');
    return session.audioStreamBuffer;
}

async function initializeHumeWorker(uuid) {
    const session = getSession(uuid);

    if (session.humeWorker) {
        console.log('[Pipeline] Hume worker already initialized for', uuid);
        return session.humeWorker;
    }

    if (!humeApiKey) {
        console.warn('[Hume] No API key, emotion detection disabled');
        return null;
    }

    try {
        session.humeWorker = new HumeStreamingClient(humeApiKey, {
            sampleRate: 8000,
            channels: 1
        });
        await session.humeWorker.connect();
        console.log('[Hume] ✓ Emotion detection worker connected for', uuid);

        // Emit emotion metrics via Socket.IO (with extension filter)
        session.humeWorker.on('metrics', (metrics) => {
            // Calculate Hume latency
            if (session.humeStart) {
                const humeLatency = performance.now() - session.humeStart;
                const humeEndTime = performance.now();
                session.humeEndTime = humeEndTime;
                console.log(`[Timing] Hume complete for ${session.extension}: ${humeLatency}ms`);

                // Hook: Sync Manager Hume
                if (syncManager) {
                    syncManager.onHumeComplete({
                        extension: session.extension,
                        latency: humeLatency
                    });
                }

                // Calculate EV→TTS gap (if TTS has started)
                if (session.ttsStartTime) {
                    const evToTtsGap = session.ttsStartTime - humeEndTime;
                    console.log(`[Timing] EV→TTS gap for ${session.extension}: ${evToTtsGap}ms`);

                    // Hook: Sync Manager EV→TTS Gap
                    if (syncManager) {
                        syncManager.onOverheadMeasure({
                            extension: session.extension,
                            stage: 'ev_to_tts',
                            overhead: Math.max(0, evToTtsGap) // Ensure non-negative
                        });
                    }
                }
            }

            const io = getIO();
            if (io) {
                io.emit('emotion_detected', {
                    extension: session.extension,
                    uuid: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
                    arousal: metrics.arousal,
                    valence: metrics.valence,
                    energy: metrics.energy,
                    timestamp: metrics.timestamp
                });
            }
        });

        return session.humeWorker;
    } catch (error) {
        console.error('[Hume] Error initializing worker for', uuid, ':', error.message);
        return null;
    }
}


async function initializeASRWorker(uuid) {
    const session = getSession(uuid);

    if (session.asrWorker && session.asrWorker.connected) {
        console.log('[Pipeline] ASR worker already connected for', uuid);
        return session.asrWorker;
    }

    if (!deepgramApiKey) {
        console.warn('[Pipeline] No Deepgram API key, ASR disabled');
        return null;
    }

    try {
        session.asrWorker = new ASRStreamingWorker(deepgramApiKey, getSourceLang(session.extension));
        await session.asrWorker.connect();
        console.log('[Pipeline] ✓ ASR worker connected for', uuid);

        // Handle PARTIAL transcripts (real-time feedback)
        session.asrWorker.on('partial', (transcript) => {
            console.log('[Pipeline]', uuid, 'Partial:', transcript.text);
            const io = getIO();
            if (io) {
                io.emit('transcriptionPartial', {
                    extension: session.extension,
                    connectionId: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
                    uuid: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
                    text: transcript.text,
                    language: transcript.language,
                    type: 'partial'
                });
            }
        });

        // Handle FINAL transcripts (trigger translation pipeline)
        session.asrWorker.on('final', async (transcript) => {
            console.log('[Pipeline]', uuid, 'Final:', transcript.text);
            const asrEndTime = performance.now();  // Capture ASR end time for network latency measurement

            // Send transcript to browser
            const io = getIO();
            if (io) {
                io.emit('transcriptionFinal', {
                    extension: session.extension,
                    connectionId: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
                    uuid: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
                    text: transcript.text,
                    transcript: transcript.text,
                    language: transcript.language,
                    confidence: transcript.confidence,
                    type: 'final',
                    latency: transcript.latency || 100
                });

                // Hook: Sync Manager ASR
                if (syncManager) {
                    syncManager.onASRComplete({
                        extension: session.extension,
                        latency: transcript.latency || 100
                    });
                }
            }

            // ========================================
            // TRANSLATION PIPELINE STARTS HERE
            // ========================================
            await processTranslationPipeline(uuid, transcript.text, asrEndTime);
        });

        return session.asrWorker;
    } catch (err) {
        console.error('[Pipeline] ASR initialization failed for', uuid, ':', err.message);
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
async function processTranslationPipeline(uuid, originalText, asrEndTime) {
    const session = getSession(uuid);
    const pipelineStart = performance.now();

    console.log('[Pipeline]', uuid, '═══════════════════════════════════════');
    console.log('[Pipeline]', uuid, 'Starting translation pipeline');
    console.log('[Pipeline]', uuid, 'Original text:', originalText);

try {
        // Get correct translator for this extension
        const activeTranslator = getTranslator(session.extension);
        // Step 1: Translate with DeepL (or bypass if source === target)
        if (!activeTranslator) {
            console.error('[Pipeline]', uuid, 'DeepL not initialized, skipping translation');
            return;
        }

        const sourceLang = getSourceLang(session.extension);
        const targetLang = getTargetLang(session.extension);

        console.log(`[Pipeline] ${uuid} [1/4] Translation check: ${sourceLang} → ${targetLang}`);
        const translationStart = performance.now();
        const asrToMtGap = translationStart - asrEndTime;  // Server overhead: ASR end → MT start
        console.log(`[Timing] ${uuid} ASR→MT gap: ${asrToMtGap}ms`);

        // Hook: Sync Manager ASR→MT Gap
        if (syncManager) {
            syncManager.onOverheadMeasure({
                extension: session.extension,
                stage: 'asr_to_mt',
                overhead: asrToMtGap
            });
        }

        let translationResult;
        let translationTime;

        // QA Mode: Bypass DeepL if source === target
        if (sourceLang === targetLang) {
            console.log('[Pipeline]', uuid, '⚠️  QA Mode Active: Bypassing DeepL translation (same language)');
            translationResult = { text: originalText };
            translationTime = 0;
        } else {
            console.log('[Pipeline]', uuid, 'Calling DeepL for translation...');
            translationResult = await activeTranslator.translateIncremental(
                uuid, // Use full UUID as session ID
                sourceLang,
                targetLang,
                originalText,
                true
            );
            translationTime = performance.now() - translationStart;
        }

        console.log('[Pipeline]', uuid, '✓ Translation complete:', translationResult.text);
        console.log('[Pipeline]', uuid, '  Time:', translationTime, 'ms');

        // Send translation to browser
        const io = getIO();
        if (io) {
            io.emit('translationComplete', {
                extension: session.extension,
                connectionId: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
                uuid: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
                original: originalText,
                translation: translationResult.text,
                sourceLang: sourceLang,
                targetLang: targetLang,
                time: translationTime
            });

            // Hook: Sync Manager MT
            if (syncManager) {
                syncManager.onMTComplete({
                    extension: session.extension,
                    time: translationTime
                });
            }
        }

        // Step 2: Synthesize with ElevenLabs (PCM 16kHz output)
        if (!ttsService) {
            console.error('[Pipeline]', uuid, 'ElevenLabs not initialized, skipping TTS');
            return;
        }

        console.log('[Pipeline]', uuid, '[2/4] Synthesizing speech (PCM 16kHz)...');
        const ttsStart = performance.now();
        session.ttsStartTime = ttsStart; // Store for EV→TTS gap calculation
        const mtToTtsGap = ttsStart - (translationStart + translationTime);  // Server overhead: MT end → TTS start
        console.log(`[Timing] ${uuid} MT→TTS gap: ${mtToTtsGap}ms`);

        // Hook: Sync Manager MT→TTS Gap
        if (syncManager) {
            syncManager.onOverheadMeasure({
                extension: session.extension,
                stage: 'mt_to_tts',
                overhead: mtToTtsGap
            });
        }

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

        console.log('[Pipeline]', uuid, '✓ TTS complete');
        console.log('[Pipeline]', uuid, '  Audio size:', pcm16Buffer.length, 'bytes');
        console.log('[Pipeline]', uuid, '  Format: PCM 16kHz S16LE');
        console.log('[Pipeline]', uuid, '  Duration:', (pcm16Buffer.length / 2 / 16000).toFixed(2), 'seconds');
        console.log('[Pipeline]', uuid, '  Time:', ttsTime, 'ms');

        // Hook: Sync Manager TTS
        if (syncManager) {
            syncManager.onTTSComplete({
                extension: session.extension,
                latency: ttsTime
            });
        }

        // Save ElevenLabs output to file for debugging
        const fs = require('fs');
        const timestamp = Date.now();
        const recordingPath = `./recordings/elevenlabs-${uuid}-${timestamp}-16khz.pcm`;
        try {
            fs.writeFileSync(recordingPath, pcm16Buffer);
            console.log('[Pipeline]', uuid, '💾 Saved ElevenLabs output:', recordingPath);
        } catch (err) {
            console.error('[Pipeline]', uuid, 'Failed to save recording:', err.message);
        }

        // Step 3: Prepare audio for Latency Sync (LS) buffer
        console.log('[Pipeline]', uuid, '[3/4] Preparing audio for Latency Sync buffer');
        const lsEntryStart = performance.now();

        const ttsToLsGap = lsEntryStart - (ttsStart + ttsTime);  // Server overhead: TTS end → LS entry
        console.log(`[Timing] ${uuid} TTS→LS gap: ${ttsToLsGap}ms`);

        // Hook: Sync Manager TTS→LS Gap
        if (syncManager) {
            syncManager.onOverheadMeasure({
                extension: session.extension,
                stage: 'tts_to_ls',
                overhead: ttsToLsGap
            });
        }

        console.log('[Pipeline]', uuid, '✓ Audio ready for LS buffer (16kHz)');
        console.log('[Pipeline]', uuid, '  PCM 16kHz size:', pcm16Buffer.length, 'bytes');
        console.log('[Pipeline]', uuid, '  Audio duration:', (pcm16Buffer.length / 2 / 16000).toFixed(2), 'seconds');

        // Send translated audio to browser for playback (16kHz for better quality)
        if (io) {
            console.log('[Pipeline]', uuid, '📤 Sending translated audio to browser...');
            io.emit('translatedAudio', {
                extension: session.extension,
                uuid: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
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
            console.log('[Pipeline]', uuid, '✓ Sent audio to browser:', pcm16Buffer.length, 'bytes');
        }

        // Step 4: Send PCM audio to LS (Latency Sync) buffer
        if (!session.audioStreamBuffer) {
            console.error('[Pipeline]', uuid, 'No AudioStreamBuffer for this session');
            return;
        }

        console.log('[Pipeline]', uuid, '[4/4] Entering Latency Sync (LS) buffer...');

        // Track when audio enters LS buffer
        session.lsEnterTime = performance.now();
        console.log(`[Timing] ${uuid} Audio entering LS buffer at ${session.lsEnterTime}ms`);

        // Route through AudioStreamBuffer for comfort noise and delay
        console.log('[Pipeline]', uuid, 'Routing 16kHz audio through LS buffer');
        session.audioStreamBuffer.addAudioChunk(pcm16Buffer);  // Send 16kHz buffer directly
        console.log('[Pipeline]', uuid, '✓ Audio queued in LS buffer (will be synchronized and sent to bridge)');

        // Calculate total pipeline time
        const totalTime = performance.now() - pipelineStart;
        console.log('[Pipeline]', uuid, '═══════════════════════════════════════');
        console.log('[Pipeline]', uuid, 'Pipeline complete!');
        console.log('[Pipeline]', uuid, 'Total time:', totalTime, 'ms');
        console.log('[Pipeline]', uuid, '  - Translation:', translationTime, 'ms');
        console.log('[Pipeline]', uuid, '  - TTS (PCM):', ttsTime, 'ms');
        console.log('[Pipeline]', uuid, '  - Buffer:', convertTime, 'ms');
        console.log('[Pipeline]', uuid, '  - Send:', sendTime, 'ms');
        console.log('[Pipeline]', uuid, '═══════════════════════════════════════');

        // Send pipeline stats to browser
        if (io) {
            io.emit('pipelineComplete', {
                extension: session.extension,
                uuid: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
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
        console.error('[Pipeline]', uuid, '✗ Pipeline error:', error.message);
        console.error('[Pipeline]', uuid, '  Stack:', error.stack);

        const io = getIO();
        if (io) {
            io.emit('pipelineError', {
                extension: session.extension,
                uuid: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
                error: error.message,
                original: originalText
            });
        }
    }
}

// ========================================================================
// HELPER: Setup event handlers for an orchestrator
// ========================================================================
function setupOrchestratorHandlers(orchestrator, orchestratorName, extensionNumber) {
    const HUME_BUFFER_SIZE = 50; // 50 frames = 1 second at 20ms per frame

    // Handle incoming PCM frames from AudioSocket
    orchestrator.on('pcm-frame', async (frame) => {
    const uuid = frame.uuid || frame.connectionId;
    const session = getSession(uuid, frame.extensionId);  // Pass extensionId from frame

    // Track frame arrival time
    const frameArrivalTime = performance.now();

    // Track first audio frame arrival
    if (!session.firstAudioFrameTime) {
        session.firstAudioFrameTime = frameArrivalTime;
        console.log(`[Timing] ${uuid} First audio frame received`);
    }

    // Update session extension if it was null and frame has extensionId
    if (!session.extension && frame.extensionId) {
        session.extension = frame.extensionId;
        console.log("[Pipeline] Updated session extension to:", frame.extensionId);

        // Phase 2: Register session in global registry for audio injection
        if (global.activeSessions) {
            global.activeSessions.set(String(frame.extensionId), session);
            console.log(`[Phase2] Registered session for extension ${frame.extensionId}`);
        }

        // List all active extensions
        const activeExtensions = [];
        for (const [uuid, session] of activeSessions) {
            if (session.extension) {
                activeExtensions.push(session.extension);
            }
        }
        console.log("[BiDir] Active extensions:", activeExtensions);
        // Check if both 7000 and 7001 are active (logging only)
        if (activeExtensions.includes("7000") && activeExtensions.includes("7001")) {
            console.log("[BiDir] *** Both extensions 7000 and 7001 are ACTIVE ***");
        }
    }

    // Initialize ASR and Hume workers on first frame
    if (!session.asrWorker) {
        await initializeASRWorker(uuid);
        await initializeHumeWorker(uuid);
    }

    // Track when ASR processing starts (when audio is sent to Deepgram)
    const asrStartTime = performance.now();

    // Send frame to Deepgram for transcription
    if (session.asrWorker && session.asrWorker.connected) {
        // Calculate AudioSocket→ASR gap (processing overhead from frame arrival to ASR send)
        const audioSocketToAsrGap = asrStartTime - frameArrivalTime;

        // Report periodically (every 50 frames) to show trends
        if (!session.audioSocketToAsrReported || frame.sequenceNumber % 50 === 0) {
            console.log(`[Timing] ${uuid} AudioSocket→ASR gap: ${audioSocketToAsrGap.toFixed(2)}ms (frame ${frame.sequenceNumber})`);

            // Hook: Sync Manager AudioSocket→ASR Gap
            if (syncManager) {
                syncManager.onOverheadMeasure({
                    extension: session.extension,
                    stage: 'audiosocket_to_asr',
                    overhead: audioSocketToAsrGap
                });
            }
            session.audioSocketToAsrReported = true;
        }

        session.asrWorker.sendAudio(frame.pcm, {
            segmentId: frame.sequenceNumber,
            duration: frame.duration
        });
    }

    // Fork audio to Hume AI for emotion detection (buffered for speech detection)
    if (session.humeWorker && session.humeWorker.connected) {
        session.humeAudioBuffer.push(frame.pcm);

        // Send buffered audio once we have 1 second (50 frames × 20ms)
        if (session.humeAudioBuffer.length >= HUME_BUFFER_SIZE) {
            const bufferFullTime = performance.now();
            const combinedBuffer = Buffer.concat(session.humeAudioBuffer);

            // Track AudioSocket→EV gap (processing overhead after buffer fills)
            const humeSendTime = performance.now();
            const audioSocketToEvGap = humeSendTime - bufferFullTime;

            // Report periodically (every 3rd send, approximately every 3 seconds)
            const sendCount = Math.floor(frame.sequenceNumber / HUME_BUFFER_SIZE);
            if (!session.audioSocketToEvReported || sendCount % 3 === 0) {
                console.log(`[Timing] ${uuid} AudioSocket→EV gap: ${audioSocketToEvGap.toFixed(2)}ms (send ${sendCount})`);

                // Hook: Sync Manager AudioSocket→EV Gap
                if (syncManager) {
                    syncManager.onOverheadMeasure({
                        extension: session.extension,
                        stage: 'audiosocket_to_ev',
                        overhead: audioSocketToEvGap
                    });
                }
                session.audioSocketToEvReported = true;
            }

            session.humeStart = bufferFullTime; // Track timing for latency
            session.humeWorker.sendAudio(combinedBuffer);
            console.log(`[Hume] ${uuid} Sent ${HUME_BUFFER_SIZE} frames (${combinedBuffer.length} bytes, 1 second buffer)`);
            session.humeAudioBuffer = []; // Reset buffer for next batch
        }
    }

    // FORK AUDIO TO BROWSER: Send same audio to Socket.IO clients for playback
    const io = getIO();
    if (io) {
        io.emit('audioStream', {
            extension: session.extension,
            uuid: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
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
    const uuid = typeof info.connectionId === 'string' ? info.connectionId : info.connectionId.toString();
    
    // CRITICAL FIX: Skip WebSocket loopback connections
    if (info.protocol === 'websocket') {
        console.log('[Pipeline] Skipping WebSocket loopback:', uuid);
        return;
    }
    if (info.protocol !== 'tcp') {
        console.log('[Pipeline] Unknown protocol:', info.protocol);
        return;
    }
    const extension = getExtensionFromUUID(uuid);

    console.log('[Pipeline] ✓ Asterisk connected:', uuid, '| Extension:', extension);

    // Create new session
    const session = getSession(uuid);

    // Initialize AudioStreamBuffer for this call
    initializeAudioStreamBuffer(uuid);

    // Translation session initialized (DeepL doesn't need explicit session creation)
    console.log('[Pipeline] ✓ Translation ready for session:', uuid);
    console.log('[Pipeline] Active sessions:', activeSessions.size);

    const io = getIO();
    if (io) {
        // DEBUG: Log UUID before emitting
        console.log('[UUID DEBUG] Before emit - UUID type:', typeof uuid, '| Value:', uuid, '| Buffer check:', Buffer.isBuffer(uuid));
        if (Buffer.isBuffer(uuid)) {
            console.log('[UUID DEBUG] WARNING: UUID is a Buffer! Hex:', uuid.toString('hex'), '| UTF8:', uuid.toString('utf8'));
        }
        io.emit('audiosocket-connected', {
            extension: extension,
            connectionId: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
            uuid: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
            timestamp: Date.now()
        });

        // Emit callConnected for dashboard compatibility
        io.emit('callConnected', {
            callUUID: uuid,
            extension: extension,
            timestamp: Date.now()
        });

        io.emit('audioStreamStart', {
            extension: extension,
            connectionId: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
            format: {
                sampleRate: 8000,
                channels: 1,
                bitDepth: 16,
                encoding: 'pcm'
            }
        });
    }
});

    // Handshake handler - uses extensionNumber from function parameter
    orchestrator.on('handshake', (info) => {
        const uuid = info.uuid || info.connectionId;
        const extension = extensionNumber;  // Use extension number passed to function

        console.log('[Pipeline] ✓ Handshake complete:', uuid, '| Extension:', extension, '| Orchestrator:', orchestratorName);

        // Update the session's extension (it may have been created with null)
        const session = activeSessions.get(uuid);
        if (session && extension) {
            session.extension = extension;

            // Register extension with timing server - it will handle pair detection
            if (global.timingClient) {
                global.timingClient.registerExtension(extension, uuid);
                console.log('[BiDir] Registered extension', extension, 'with timing server');
            }
        }

        const io = getIO();
        if (io) {
            io.emit('audiosocket-handshake', {
                extension: extension,
                uuid: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
                connectionId: info.connectionId || (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
                timestamp: Date.now()
            });
        }
    });

    // Outbound packet handler - tracks audio sent back to Asterisk
    orchestrator.on('outbound-packet', (data) => {
        const io = getIO();
        if (io) {
            io.emit('asterisk-outbound-packet', {
                bridgeId: data.bridgeId,
                extension: data.extension,
                uuid: (Buffer.isBuffer(data.uuid) ? data.uuid.toString("utf8") : String(data.uuid)),
                framesSent: data.framesSent,
                bytesSent: data.bytesSent,
                timestamp: data.timestamp
            });
        }
    });

    console.log(`[Pipeline] ✓ Event handlers attached to ${orchestratorName}`);
}

// OLD handshake handler - kept for backward compatibility with port 5050 only
audioSocketOrchestrator.on('handshake', (info) => {
    const uuid = info.uuid || info.connectionId;
    const extension = info.extensionId || getExtensionFromUUID(uuid);  // Use extensionId from orchestrator

    console.log('[Pipeline] ✓ Handshake complete (OLD handler):', uuid, '| Extension:', extension);

    // Update the session's extension (it may have been created with null)
    const session = activeSessions.get(uuid);
    if (session && extension) {
        session.extension = extension;
        console.log("[BiDir] Updated session extension to:", extension);

        // Check for extension pairs
        const activeExtensions = [];
        for (const [sessionUuid, sess] of activeSessions) {
            if (sess.extension) {
                activeExtensions.push(sess.extension);
            }
        }
        console.log("[BiDir] Active extensions after handshake:", activeExtensions);

        // Check if both 7000 and 7001 are active
        if (activeExtensions.includes("7000") && activeExtensions.includes("7001")) {
            console.log("[BiDir] *** Both extensions 7000 and 7001 are ACTIVE ***");
        }
    }

    const io = getIO();
    if (io) {
        io.emit('audiosocket-handshake', {
            extension: extension,
            uuid: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
            connectionId: info.connectionId || (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
            timestamp: Date.now()
        });
    }
});

audioSocketOrchestrator.on('disconnect', (info) => {
    const uuid = info.uuid || info.connectionId;
    const extension = info.extensionId || getExtensionFromUUID(uuid);  // Use extensionId from orchestrator

    console.log('[Pipeline] Asterisk disconnected:', {
        uuid: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
        extension: extension,
        duration: `${info.duration.toFixed(1)}s`,
        frames: info.framesReceived
    });

    // Clean up session
    removeSession(uuid);

    const io = getIO();
    if (io) {
        io.emit('audiosocket-disconnected', {
            extension: extension,
            connectionId: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
            uuid: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
            duration: info.duration,
            frames: info.framesReceived,
            timestamp: Date.now()
        });

        io.emit('audioStreamEnd', {
            extension: extension,
            connectionId: (Buffer.isBuffer(uuid) ? uuid.toString("utf8") : String(uuid)),
            duration: info.duration,
            frames: info.framesReceived
        });
    }
    });

// NOTE: Function closing brace was moved up to line 1010 after adding handshake handler

// ========================================================================
// SETUP BOTH ORCHESTRATORS WITH EVENT HANDLERS
// ========================================================================
setupOrchestratorHandlers(audioSocketOrchestrator5050, 'orchestrator5050 (ext 7000, port 5050)', '7000');
setupOrchestratorHandlers(audioSocketOrchestrator5052, 'orchestrator5052 (ext 7001, port 5052)', '7001');
console.log('[Pipeline] ✓ Both orchestrators configured with independent event handlers');

// Start both orchestrators
audioSocketOrchestrator5050.start();
audioSocketOrchestrator5052.start();
console.log("[Pipeline] ✓ Dual AudioSocket orchestrators started on ports 5050 (ext 7000) and 5052 (ext 7001)");

// Make orchestrator available globally
global.audioSocketOrchestrator = audioSocketOrchestrator;

// Clean up on shutdown
process.on('SIGTERM', () => {
    if (audioSocketOrchestrator) {
        audioSocketOrchestrator.stop();
    }
    // Clean up all sessions
    activeSessions.forEach((session, uuid) => {
        removeSession(uuid);
    });
});

process.on('SIGINT', () => {
    if (audioSocketOrchestrator) {
        audioSocketOrchestrator.stop();
    }
    // Clean up all sessions
    activeSessions.forEach((session, uuid) => {
        removeSession(uuid);
    });
});

console.log('[Pipeline] ═══════════════════════════════════════════════════');
console.log('[Pipeline] Complete Translation Pipeline Initialized');
console.log('[Pipeline] MULTI-PROCESS MODE: Supports 7000 and 7001 simultaneously');
console.log('[Pipeline] ═══════════════════════════════════════════════════');
console.log('[Pipeline] Flow: Asterisk → Deepgram STT → DeepL MT → ElevenLabs TTS (PCM 16kHz) → AudioStreamBuffer → WebSocket Mic Endpoint');
console.log('[Pipeline] AudioSocket: port 5050 (receives audio FROM caller mic)');
console.log('[Pipeline] WebSocket Mic: port 5051 (sends audio TO caller mic as input)');
console.log('[Pipeline] Languages: 7000 (en→fr), 7001 (fr→en)');
console.log('[Pipeline] Voice ID:', VOICE_ID);
console.log('[Pipeline] Audio: 16kHz PCM (with comfort noise) → Mic endpoint');
console.log('[Pipeline] Comfort Noise: ENABLED by default');
console.log('[Pipeline] ═══════════════════════════════════════════════════');

// Log Socket.IO status after delay
setTimeout(() => {
    const io = getIO();
    console.log('[Pipeline] Socket.IO:', !!io ? 'AVAILABLE ✓' : 'NOT AVAILABLE ✗');
}, 2000);
