/**
 * Translation Orchestrator
 *
 * Main integration component that coordinates the complete translation pipeline:
 * - Frame Collector (audio I/O)
 * - Prosodic Segmenter (speech boundary detection)
 * - ASR Streaming Worker (speech-to-text)
 * - DeepL Incremental MT (translation)
 * - ElevenLabs TTS (text-to-speech)
 * - Pacing Governor (output timing)
 *
 * Based on HAsterisk_HumeEVI_Spec.md specifications
 */

const { EventEmitter } = require('events');
const { FrameCollector } = require('./frame-collector');
const { PacingGovernor } = require('./pacing-governor');
const { ProsodicSegmenter } = require('./prosodic-segmenter');
const { ASRStreamingWorker } = require('./asr-streaming-worker');
const { DeepLIncrementalMT } = require('./deepl-incremental-mt');
const ElevenLabsTTSService = require('./elevenlabs-tts-service');
const { HumeEVIAdapter } = require('./hume-evi-adapter');

const FRAME_SIZE = 640;
const FRAME_DURATION_MS = 20;

/**
 * Translation Orchestrator - Manages complete translation pipeline for one participant
 */
class TranslationOrchestrator extends EventEmitter {
    constructor(channelId, sourceLang, targetLang, services, options = {}) {
        super();

        this.channelId = channelId;
        this.sourceLang = sourceLang;
        this.targetLang = targetLang;
        this.options = options;

        // Services (passed in)
        this.deepgramClient = services.deepgramClient;
        this.deeplClient = services.deeplClient;
        this.elevenLabsApiKey = services.elevenLabsApiKey;
        this.humeEVIApiKey = services.humeEVIApiKey;
        this.voiceId = services.voiceId || options.voiceId;

        // Components
        this.frameCollector = null;
        this.pacingGovernor = null;
        this.prosodicSegmenter = null;
        this.asrWorker = null;
        this.mtService = null;
        this.ttsService = null;
        this.humeEVIAdapter = null;

        // State
        this.running = false;
        this.stopping = false;

        // Statistics
        this.stats = {
            startTime: null,
            totalFrames: 0,
            totalSegments: 0,
            totalTranscripts: 0,
            totalTranslations: 0,
            totalOutputFrames: 0,
            errors: 0
        };

        // Latency tracking
        this.latencyMarkers = [];
    }

    /**
     * Start the translation pipeline
     */
    async start() {
        if (this.running) {
            throw new Error('Orchestrator already running');
        }

        console.log(`[Orchestrator:${this.channelId}] Starting translation pipeline...`);
        console.log(`  Source Language: ${this.sourceLang}`);
        console.log(`  Target Language: ${this.targetLang}`);

        try {
            // Initialize components
            await this.initializeComponents();

            // Start concurrent pipelines
            this.running = true;
            this.stats.startTime = Date.now();

            // Run input and output pipelines concurrently
            Promise.all([
                this.runInputPipeline(),
                this.runOutputPipeline()
            ]).catch(error => {
                if (!this.stopping) {
                    console.error(`[Orchestrator:${this.channelId}] Pipeline error:`, error);
                    this.emit('error', error);
                    this.stop();
                }
            });

            console.log(`[Orchestrator:${this.channelId}] ✓ Pipeline started successfully`);
            this.emit('started');

        } catch (error) {
            console.error(`[Orchestrator:${this.channelId}] Failed to start:`, error);
            this.running = false;
            throw error;
        }
    }

    /**
     * Initialize all pipeline components
     */
    async initializeComponents() {
        // 1. Frame Collector (audio I/O with Asterisk)
        this.frameCollector = new FrameCollector(this.channelId, this.options);
        await this.frameCollector.connect();
        console.log(`[Orchestrator:${this.channelId}] ✓ Frame Collector connected`);

        // 2. Pacing Governor (output timing)
        this.pacingGovernor = new PacingGovernor();
        await this.pacingGovernor.start();
        console.log(`[Orchestrator:${this.channelId}] ✓ Pacing Governor started`);

        // 3. Prosodic Segmenter (speech boundaries)
        this.prosodicSegmenter = new ProsodicSegmenter({
            sampleRate: 16000,
            silenceThreshold: 0.01,
            minSilenceDurationMs: 300
        });
        console.log(`[Orchestrator:${this.channelId}] ✓ Prosodic Segmenter initialized`);

        // 4. ASR Streaming Worker (speech-to-text)
        this.asrWorker = new ASRStreamingWorker(this.deepgramClient, this.sourceLang);
        await this.asrWorker.connect();
        console.log(`[Orchestrator:${this.channelId}] ✓ ASR Worker connected`);

        // 5. DeepL Incremental MT (translation)
        this.mtService = this.deeplClient;  // Assuming DeepLIncrementalMT instance
        console.log(`[Orchestrator:${this.channelId}] ✓ MT Service initialized`);

        // 6. ElevenLabs TTS (text-to-speech)
        this.ttsService = new ElevenLabsTTSService(this.elevenLabsApiKey);
        console.log(`[Orchestrator:${this.channelId}] ✓ TTS Service initialized`);

        // 7. Hume EVI Adapter (emotion analysis) - OPTIONAL
        if (this.humeEVIApiKey) {
            this.humeEVIAdapter = new HumeEVIAdapter(this.humeEVIApiKey, {
                sampleRate: 16000,
                channels: 1,
                enableEmotionDetection: true,
                enableProsodyAnalysis: true
            });
            await this.humeEVIAdapter.connect();
            console.log(`[Orchestrator:${this.channelId}] ✓ Hume EVI Adapter connected (emotion-aware TTS enabled)`);
        } else {
            console.log(`[Orchestrator:${this.channelId}] ⚠ Hume EVI API key not provided, emotion analysis disabled`);
    }

    /**
     * Input Pipeline: Audio → Segments → Transcription → Translation → TTS → Queue
     */
    async runInputPipeline() {
        console.log(`[Orchestrator:${this.channelId}] Input pipeline running...`);

        try {
            // Process frames from Frame Collector
            this.frameCollector.on('frame', async (frame) => {
                if (this.stopping) return;

                this.stats.totalFrames++;
                const t0 = Date.now();

                try {
                    // 1. Feed frame to Prosodic Segmenter
                    this.prosodicSegmenter.processFrame(frame.data);

                    // 2. Push to Hume EVI for emotion analysis (if enabled)
                    if (this.humeEVIAdapter) {
                        this.humeEVIAdapter.pushAudioAndText(frame.data, null);
                    }

                    // 2. Check if segment is ready
                    if (this.prosodicSegmenter.hasSegment()) {
                        const segment = this.prosodicSegmenter.getSegment();
                        this.stats.totalSegments++;

                        // Mark latency
                        const latencyMarker = { t0, segment: true };

                        // 3. Send segment to ASR
                        this.asrWorker.sendAudio(segment.audio);

                        // 4. Process transcription events
                        this.asrWorker.on('transcript', async (transcript) => {
                            if (this.stopping) return;

                            this.stats.totalTranscripts++;
                            latencyMarker.asr_t = Date.now();

                            // Only translate stable/final transcripts
                            const isStable = transcript.type === 'stable' || transcript.type === 'final';

                            if (transcript.text && transcript.text.trim().length > 0) {
                                try {
                                    // 5. Translate with DeepL
                                    const translation = await this.mtService.translateIncremental(
                                        this.channelId,
                                        this.sourceLang,
                                        this.targetLang,
                                        transcript.text,
                                        isStable
                                    );

                                    this.stats.totalTranslations++;
                                    latencyMarker.mt_t = Date.now();

                                    if (translation.text && translation.text.trim().length > 0) {
                                        // 6. Synthesize with TTS (emotion-aware if Hume EVI enabled)
                                        let audioBuffer;
                                        let emotionUsed = null;

                                        if (this.humeEVIAdapter && this.voiceId) {
                                            // Get emotion vector from Hume EVI
                                            const emotionVector = this.humeEVIAdapter.getEmotionVector();

                                            // Synthesize with emotion
                                            const result = await this.ttsService.synthesizeWithEmotion(
                                                translation.text,
                                                this.voiceId,
                                                emotionVector
                                            );

                                            audioBuffer = result.audio;
                                            emotionUsed = result.emotion;
                                        } else {
                                            // Standard synthesis without emotion
                                            const result = await this.ttsService.synthesize(
                                                translation.text,
                                                this.voiceId || 'default'
                                            );
                                            audioBuffer = result.audio;
                                        }

                                        latencyMarker.tts_t = Date.now();

                                        // 7. Convert TTS audio to 20ms frames and enqueue
                                        const frames = this.audioBufferToFrames(audioBuffer);
                                        for (const audioFrame of frames) {
                                            this.pacingGovernor.enqueue(audioFrame);
                                            this.stats.totalOutputFrames++;
                                        }

                                        latencyMarker.t1 = Date.now();

                                        // Calculate and emit latency
                                        const totalLatency = latencyMarker.t1 - latencyMarker.t0;
                                        this.latencyMarkers.push(latencyMarker);

                                        this.emit('translation', {
                                            channelId: this.channelId,
                                            sourceText: transcript.text,
                                            translatedText: translation.text,
                                            emotion: emotionUsed,
                                            latency: {
                                                total: totalLatency,
                                                asr: latencyMarker.asr_t - latencyMarker.t0,
                                                mt: latencyMarker.mt_t - latencyMarker.asr_t,
                                                tts: latencyMarker.tts_t - latencyMarker.mt_t
                                            }
                                        });

                                        // Log if latency exceeds target
                                        if (totalLatency > 900) {
                                            console.warn(`[Orchestrator:${this.channelId}] ⚠ High latency: ${totalLatency}ms`);
                                        }
                                    }

                                } catch (error) {
                                    console.error(`[Orchestrator:${this.channelId}] Translation error:`, error);
                                    this.stats.errors++;
                                    this.emit('translation-error', { error, transcript });
                                }
                            }
                        });
                    }

                } catch (error) {
                    console.error(`[Orchestrator:${this.channelId}] Frame processing error:`, error);
                    this.stats.errors++;
                }
            });

        } catch (error) {
            console.error(`[Orchestrator:${this.channelId}] Input pipeline error:`, error);
            throw error;
        }
    }

    /**
     * Output Pipeline: Dequeue frames from Pacing Governor and write to Asterisk
     */
    async runOutputPipeline() {
        console.log(`[Orchestrator:${this.channelId}] Output pipeline running...`);

        try {
            // Pacing Governor emits frames every 20ms
            this.pacingGovernor.on('frame', (frame) => {
                if (this.stopping) return;

                // Write frame to Asterisk via Frame Collector
                this.frameCollector.writeFrame(frame);
            });

        } catch (error) {
            console.error(`[Orchestrator:${this.channelId}] Output pipeline error:`, error);
            throw error;
        }
    }

    /**
     * Convert TTS audio buffer to 20ms PCM frames
     */
    audioBufferToFrames(audioBuffer) {
        const frames = [];
        let offset = 0;

        // Assuming audioBuffer is PCM 16-bit, 16kHz mono
        // Each frame is 640 bytes (320 samples * 2 bytes)

        while (offset + FRAME_SIZE <= audioBuffer.length) {
            const frame = audioBuffer.slice(offset, offset + FRAME_SIZE);
            frames.push(frame);
            offset += FRAME_SIZE;
        }

        // Pad last frame if needed
        if (offset < audioBuffer.length) {
            const lastFrame = Buffer.alloc(FRAME_SIZE, 0);
            audioBuffer.copy(lastFrame, 0, offset);
            frames.push(lastFrame);
        }

        return frames;
    }

    /**
     * Stop the orchestrator
     */
    async stop() {
        if (!this.running || this.stopping) {
            return;
        }

        console.log(`[Orchestrator:${this.channelId}] Stopping...`);
        this.stopping = true;

        // Disconnect all components
        if (this.frameCollector) {
            this.frameCollector.disconnect();
        }

        if (this.pacingGovernor) {
            this.pacingGovernor.stop();
        }

        if (this.asrWorker) {
            this.asrWorker.disconnect();
        }

        if (this.prosodicSegmenter) {
            this.prosodicSegmenter.reset();
        }

        // Clear MT session
        if (this.mtService) {
            this.mtService.clearSession(this.channelId);
        }

        // Disconnect Hume EVI
        if (this.humeEVIAdapter) {
            this.humeEVIAdapter.disconnect();
        }

        this.running = false;

        console.log(`[Orchestrator:${this.channelId}] ✓ Stopped`);
        this.emit('stopped');
    }

    /**
     * Get statistics
     */
    getStats() {
        const uptimeMs = this.stats.startTime ? Date.now() - this.stats.startTime : 0;

        // Calculate latency percentiles
        const latencies = this.latencyMarkers.map(m => m.t1 - m.t0).sort((a, b) => a - b);
        const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.50)] : 0;
        const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;

        return {
            channelId: this.channelId,
            sourceLang: this.sourceLang,
            targetLang: this.targetLang,
            running: this.running,
            uptimeMs,
            ...this.stats,
            latency: {
                count: latencies.length,
                p50,
                p95,
                average: latencies.length > 0
                    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
                    : 0
            },
            components: {
                frameCollector: this.frameCollector ? this.frameCollector.getStats() : null,
                pacingGovernor: this.pacingGovernor ? this.pacingGovernor.getStats() : null,
                asrWorker: this.asrWorker ? this.asrWorker.getStats() : null,
                mtService: this.mtService ? this.mtService.getStats() : null,
                humeEVI: this.humeEVIAdapter ? this.humeEVIAdapter.getStats() : null
            },
            emotionEnabled: !!this.humeEVIAdapter
        };
    }
}

/**
 * Orchestrator Manager - Manages multiple orchestrators (multi-participant)
 */
class OrchestratorManager extends EventEmitter {
    constructor(services) {
        super();

        this.services = services;
        this.orchestrators = new Map();  // channelId -> orchestrator

        console.log('[OrchestratorMgr] Initialized');
    }

    /**
     * Create and start orchestrator for a channel
     */
    async createOrchestrator(channelId, sourceLang, targetLang, options = {}) {
        if (this.orchestrators.has(channelId)) {
            throw new Error(`Orchestrator already exists for channel: ${channelId}`);
        }

        console.log(`[OrchestratorMgr] Creating orchestrator for ${channelId}...`);

        const orchestrator = new TranslationOrchestrator(
            channelId,
            sourceLang,
            targetLang,
            this.services,
            options
        );

        // Forward events
        orchestrator.on('started', () => {
            this.emit('orchestratorStarted', channelId);
        });

        orchestrator.on('translation', (data) => {
            this.emit('translation', data);
        });

        orchestrator.on('error', (error) => {
            this.emit('error', { channelId, error });
        });

        orchestrator.on('stopped', () => {
            this.orchestrators.delete(channelId);
            this.emit('orchestratorStopped', channelId);
        });

        // Start the orchestrator
        await orchestrator.start();

        this.orchestrators.set(channelId, orchestrator);

        return orchestrator;
    }

    /**
     * Get orchestrator for channel
     */
    getOrchestrator(channelId) {
        return this.orchestrators.get(channelId);
    }

    /**
     * Stop orchestrator
     */
    async stopOrchestrator(channelId) {
        const orchestrator = this.orchestrators.get(channelId);
        if (orchestrator) {
            await orchestrator.stop();
        }
    }

    /**
     * Get all active orchestrators
     */
    getActiveOrchestrators() {
        return Array.from(this.orchestrators.values());
    }

    /**
     * Get statistics for all orchestrators
     */
    getAllStats() {
        const stats = {};
        for (const [channelId, orchestrator] of this.orchestrators) {
            stats[channelId] = orchestrator.getStats();
        }
        return stats;
    }

    /**
     * Stop all orchestrators
     */
    async stopAll() {
        console.log('[OrchestratorMgr] Stopping all orchestrators...');

        const promises = [];
        for (const orchestrator of this.orchestrators.values()) {
            promises.push(orchestrator.stop());
        }

        await Promise.all(promises);
        this.orchestrators.clear();

        console.log('[OrchestratorMgr] ✓ All orchestrators stopped');
    }
}

module.exports = {
    TranslationOrchestrator,
    OrchestratorManager
};
