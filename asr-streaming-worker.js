/**
 * ASR Streaming Worker - Deepgram Speech-to-Text
 *
 * Continuous speech transcription with streaming API:
 * - Processes audio segments in real-time
 * - Emits partial, stable, and final transcripts
 * - Handles reconnection and errors
 * - Optimized for low latency (<250ms)
 *
 * Updated for 16kHz audio from ExternalMedia(direction=read)
 */

const { EventEmitter } = require('events');
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');

const SAMPLE_RATE = 8000;  // 8kHz - AudioSocket default
const ENCODING = 'linear16';
const AUDIO_GAIN_FACTOR = 1.0;  // NO GAIN - Asterisk VOLUME(RX)=20 already amplifies

/**
 * Apply audio gain to boost quiet audio
 * Amplifies 16-bit PCM audio by specified factor
 */
function applyAudioGain(audioBuffer, gainFactor = AUDIO_GAIN_FACTOR) {
    // Create a copy of the buffer
    const amplifiedBuffer = Buffer.from(audioBuffer);

    // Track min/max for debugging
    let minBefore = 32767, maxBefore = -32768;
    let minAfter = 32767, maxAfter = -32768;
    let clippedCount = 0;

    // Process each 16-bit sample (little-endian)
    for (let i = 0; i < amplifiedBuffer.length; i += 2) {
        // Read 16-bit signed sample
        let sample = amplifiedBuffer.readInt16LE(i);

        // Track original amplitude
        minBefore = Math.min(minBefore, sample);
        maxBefore = Math.max(maxBefore, sample);

        // Apply gain
        const amplified = Math.round(sample * gainFactor);

        // Clamp to prevent clipping (-32768 to +32767)
        sample = Math.max(-32768, Math.min(32767, amplified));

        // Track if clipping occurred
        if (amplified !== sample) clippedCount++;

        // Track amplified amplitude
        minAfter = Math.min(minAfter, sample);
        maxAfter = Math.max(maxAfter, sample);

        // Write back
        amplifiedBuffer.writeInt16LE(sample, i);
    }

    // Debug logging every 50th frame (~1 second at 50fps)
    if (Math.random() < 0.02) {  // Log ~2% of frames for better visibility
        console.log(`[ASR Gain] Before: [${minBefore}, ${maxBefore}] → After: [${minAfter}, ${maxAfter}] (${clippedCount} clipped, gain=${gainFactor}x)`);
    }

    return amplifiedBuffer;
}

/**
 * ASR Streaming Worker
 */
class ASRStreamingWorker extends EventEmitter {
    constructor(apiKey, language = 'en', options = {}) {
        super();

        if (!apiKey) {
            throw new Error('Deepgram API key required');
        }

        this.apiKey = apiKey;
        this.language = language;

        // Deepgram configuration
        this.config = {
            model: options.model || 'nova-2',
            language: this.language,
            encoding: ENCODING,
            sample_rate: SAMPLE_RATE,
            channels: 1,
            interim_results: true,
            utterance_end_ms: options.utteranceEndMs || 3000,  // Longer utterances (3 seconds)
            vad_events: false,  // Don't emit VAD events
            endpointing: false,  // Disable automatic endpointing to prevent premature closure
            punctuate: true,
            smart_format: true,
            filler_words: false,  // Reduce processing overhead
            ...options.deepgramOptions
        };

        // Client
        this.deepgram = createClient(this.apiKey);
        this.connection = null;

        // State
        this.connected = false;
        this.reconnecting = false;
        this.sessionId = null;
        this.keepaliveInterval = null;  // Keepalive timer to prevent connection timeout

        // Statistics
        this.stats = {
            segmentsProcessed: 0,
            partialsReceived: 0,
            stablesReceived: 0,
            finalsReceived: 0,
            averageLatency: 0,
            totalAudioMs: 0,
            reconnections: 0
        };

        // Latency tracking
        this.segmentTimestamps = new Map();
    }

    /**
     * Connect to Deepgram live transcription
     */
    async connect() {
        if (this.connected) {
            console.warn('[ASR] Already connected');
            return;
        }

        console.log(`[ASR] Connecting to Deepgram (${this.language}, ${SAMPLE_RATE}Hz)...`);

        try {
            // Create live transcription connection
            this.connection = this.deepgram.listen.live(this.config);

            // Set up event handlers
            this.setupEventHandlers();

            // Wait for connection to open
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 10000);

                this.connection.on(LiveTranscriptionEvents.Open, () => {
                    clearTimeout(timeout);
                    resolve();
                });

                this.connection.on(LiveTranscriptionEvents.Error, (err) => {
                    clearTimeout(timeout);
                    reject(err);
                });
            });

            this.connected = true;
            this.sessionId = `asr_${Date.now()}`;

            // Start keepalive to prevent connection timeout (every 8 seconds)
            this.startKeepalive();

            console.log(`[ASR] ✓ Connected (session: ${this.sessionId})`);
            this.emit('connected', { sessionId: this.sessionId });

        } catch (err) {
            console.error('[ASR] Connection failed:', err.message);
            this.emit('error', err);
            throw err;
        }
    }

    /**
     * Set up Deepgram event handlers
     * IMPORTANT: Transcript listeners must be set up AFTER Open event fires (SDK v4 requirement)
     */
    setupEventHandlers() {
        console.log('[ASR] Setting up event handlers...');

        // Open event - set up transcript listeners HERE after connection opens
        this.connection.on(LiveTranscriptionEvents.Open, () => {
            console.log('[ASR] ✓ Connection opened, registering transcript listeners...');

            // NOW register transcript handler (must be done after Open)
            this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
                console.log('[ASR] ✓ Transcript event received!', JSON.stringify(data).substring(0, 500));
                this.handleTranscript(data);
            });

            // Metadata (includes latency info)
            this.connection.on(LiveTranscriptionEvents.Metadata, (data) => {
                console.log('[ASR] Metadata received:', JSON.stringify(data).substring(0, 300));
                this.handleMetadata(data);
            });

            // UtteranceEnd event
            this.connection.on(LiveTranscriptionEvents.UtteranceEnd, (data) => {
                console.log('[ASR] Utterance end:', JSON.stringify(data).substring(0, 200));
            });

            // SpeechStarted event
            this.connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
                console.log('[ASR] Speech started detected');
            });
        });

        // Connection closed
        this.connection.on(LiveTranscriptionEvents.Close, () => {
            console.log('[ASR] Close event received');
            this.handleClose();
        });

        // Errors
        this.connection.on(LiveTranscriptionEvents.Error, (err) => {
            console.log('[ASR] Error event received:', err);
            this.handleError(err);
        });

        // Warning events
        this.connection.on(LiveTranscriptionEvents.Warning, (warning) => {
            console.warn('[ASR] Warning event received:', warning);
        });
    }

    /**
     * Handle transcript result from Deepgram
     */
    handleTranscript(data) {
        if (!data.channel || !data.channel.alternatives || data.channel.alternatives.length === 0) {
            return;
        }

        const alternative = data.channel.alternatives[0];
        const transcript = alternative.transcript;

        // Skip empty transcripts
        if (!transcript || transcript.trim().length === 0) {
            return;
        }

        // Determine transcript type
        const isFinal = data.is_final || false;
        const speechFinal = data.speech_final || false;

        let type;
        if (isFinal || speechFinal) {
            type = 'final';
            this.stats.finalsReceived++;
        } else if (speechFinal) {
            type = 'stable';
            this.stats.stablesReceived++;
        } else {
            type = 'partial';
            this.stats.partialsReceived++;
        }

        // Calculate latency if we have timing info
        let latency = null;
        if (data.start !== undefined && data.duration !== undefined) {
            const segmentId = `${data.start}`;
            if (this.segmentTimestamps.has(segmentId)) {
                const sendTime = this.segmentTimestamps.get(segmentId);
                latency = Date.now() - sendTime;
                this.updateAverageLatency(latency);
            }
        }

        // Create transcript event
        const transcriptEvent = {
            type,
            text: transcript,
            confidence: alternative.confidence || null,
            words: alternative.words || [],
            start: data.start || 0,
            duration: data.duration || 0,
            latency,
            language: this.language,
            sessionId: this.sessionId
        };

        // Emit transcript
        this.emit('transcript', transcriptEvent);

        // Also emit type-specific events
        this.emit(type, transcriptEvent);

        // Log
        if (type === 'final' || type === 'stable') {
            console.log(`[ASR:${type}] "${transcript}" (${Math.round(transcriptEvent.confidence * 100)}%${latency ? `, ${latency}ms` : ''})`);
        }
    }

    /**
     * Handle metadata from Deepgram
     */
    handleMetadata(data) {
        // Metadata can include request_id, model_info, etc.
        this.emit('metadata', data);
    }

    /**
     * Handle connection close
     */
    handleClose() {
        console.log('[ASR] Connection closed');

        // Stop keepalive on unexpected close
        this.stopKeepalive();

        this.connected = false;
        this.emit('disconnected');

        // Auto-reconnect if not intentional
        if (!this.reconnecting) {
            this.attemptReconnect();
        }
    }

    /**
     * Handle errors
     */
    handleError(err) {
        console.error('[ASR] Error:', err.message);
        this.emit('error', err);
    }

    /**
     * Attempt to reconnect
     */
    async attemptReconnect() {
        if (this.reconnecting) {
            return;
        }

        this.reconnecting = true;
        this.stats.reconnections++;

        console.log('[ASR] Attempting to reconnect...');

        const delays = [1000, 2000, 5000]; // Exponential backoff
        for (const delay of delays) {
            await new Promise(resolve => setTimeout(resolve, delay));

            try {
                await this.connect();
                console.log('[ASR] ✓ Reconnected successfully');
                this.reconnecting = false;
                return;
            } catch (err) {
                console.error(`[ASR] Reconnect failed, retrying in ${delays[delays.indexOf(delay) + 1] || delay}ms...`);
            }
        }

        this.reconnecting = false;
        console.error('[ASR] Reconnection failed after multiple attempts');
        this.emit('reconnectionFailed');
    }

    /**
     * Send audio segment for transcription
     */
    sendAudio(audioBuffer, metadata = {}) {
        if (!this.connected || !this.connection) {
            console.warn('[ASR] Not connected, cannot send audio');
            return false;
        }

        try {
            // Track timing for latency measurement
            if (metadata.segmentId) {
                this.segmentTimestamps.set(metadata.segmentId, Date.now());

                // Clean up old timestamps (>10 seconds)
                if (this.segmentTimestamps.size > 100) {
                    const oldestKeys = Array.from(this.segmentTimestamps.keys()).slice(0, 50);
                    oldestKeys.forEach(key => this.segmentTimestamps.delete(key));
                }
            }

            // DEBUG: Log raw audio samples occasionally
            if (this.stats.segmentsProcessed % 50 === 0) {
                const samples = [];
                for (let i = 0; i < Math.min(10, audioBuffer.length); i += 2) {
                    samples.push(audioBuffer.readInt16LE(i));
                }
                console.log(`[ASR Audio] Raw samples (first 10): [${samples.join(', ')}] (buffer size: ${audioBuffer.length} bytes)`);
            }

            // Apply audio gain to boost quiet audio (fixes low volume issue)
            const amplifiedAudio = applyAudioGain(audioBuffer);

            // Send amplified audio data
            this.connection.send(amplifiedAudio);

            this.stats.segmentsProcessed++;
            if (metadata.duration) {
                this.stats.totalAudioMs += metadata.duration;
            }

            return true;
        } catch (err) {
            console.error('[ASR] Error sending audio:', err.message);
            this.emit('error', err);
            return false;
        }
    }

    /**
     * Process audio segment (convenience method)
     */
    async processSegment(segment) {
        const metadata = {
            segmentId: segment.id?.toString() || Date.now().toString(),
            duration: segment.duration,
            frames: segment.frames
        };

        return this.sendAudio(segment.audioBuffer, metadata);
    }

    /**
     * Update average latency
     */
    updateAverageLatency(latency) {
        const count = this.stats.partialsReceived + this.stats.stablesReceived + this.stats.finalsReceived;
        this.stats.averageLatency = (this.stats.averageLatency * (count - 1) + latency) / count;
    }

    /**
     * Finalize utterance (send silence to trigger final transcript)
     */
    finalize() {
        if (!this.connected || !this.connection) {
            return;
        }

        // Send silence to trigger finalization (16kHz)
        const silence = Buffer.alloc(SAMPLE_RATE * 2 * 0.5); // 500ms of silence
        this.sendAudio(silence);
    }

    /**
     * Disconnect from Deepgram
     */
    disconnect() {
        if (!this.connected) {
            return;
        }

        console.log('[ASR] Disconnecting...');

        // Stop keepalive
        this.stopKeepalive();

        try {
            if (this.connection) {
                this.connection.finish();
                this.connection = null;
            }
        } catch (err) {
            console.error('[ASR] Error during disconnect:', err.message);
        }

        this.connected = false;
        this.sessionId = null;

        console.log('[ASR] ✓ Disconnected');
        this.emit('disconnected');
    }

    /**
     * Start keepalive to prevent connection timeout
     * Deepgram closes connection after ~10 seconds of no activity
     */
    startKeepalive() {
        // Clear existing keepalive if any
        this.stopKeepalive();

        // Send keepalive every 5 seconds using SDK's keepAlive method
        this.keepaliveInterval = setInterval(() => {
            if (this.connected && this.connection) {
                try {
                    // Use SDK's keepAlive method (sends proper KeepAlive message)
                    if (typeof this.connection.keepAlive === 'function') {
                        this.connection.keepAlive();
                        console.log('[ASR] ⏱ Keepalive sent (SDK method)');
                    } else {
                        // Fallback: send small audio buffer
                        const keepalive = Buffer.alloc(160); // 10ms of silence at 8kHz
                        this.connection.send(keepalive);
                        console.log('[ASR] ⏱ Keepalive sent (audio buffer)');
                    }
                } catch (err) {
                    console.error('[ASR] Keepalive error:', err.message);
                }
            }
        }, 5000); // 5 seconds

        console.log('[ASR] ✓ Keepalive started (5s interval)');
    }

    /**
     * Stop keepalive timer
     */
    stopKeepalive() {
        if (this.keepaliveInterval) {
            clearInterval(this.keepaliveInterval);
            this.keepaliveInterval = null;
            console.log('[ASR] ✓ Keepalive stopped');
        }
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            connected: this.connected,
            sessionId: this.sessionId,
            language: this.language,
            averageLatencyMs: Math.round(this.stats.averageLatency),
            totalAudioSec: (this.stats.totalAudioMs / 1000).toFixed(1)
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            segmentsProcessed: 0,
            partialsReceived: 0,
            stablesReceived: 0,
            finalsReceived: 0,
            averageLatency: 0,
            totalAudioMs: 0,
            reconnections: 0
        };
        this.segmentTimestamps.clear();
    }
}

/**
 * ASR Worker Manager - Manages multiple ASR workers
 */
class ASRWorkerManager extends EventEmitter {
    constructor(apiKey) {
        super();
        this.apiKey = apiKey;
        this.workers = new Map();
    }

    /**
     * Create ASR worker for language
     */
    async createWorker(language, options = {}) {
        const workerId = `${language}_${Date.now()}`;

        const worker = new ASRStreamingWorker(this.apiKey, language, options);

        // Forward events
        worker.on('transcript', (data) => this.emit('transcript', workerId, data));
        worker.on('partial', (data) => this.emit('partial', workerId, data));
        worker.on('stable', (data) => this.emit('stable', workerId, data));
        worker.on('final', (data) => this.emit('final', workerId, data));
        worker.on('error', (err) => this.emit('error', workerId, err));
        worker.on('disconnected', () => {
            this.workers.delete(workerId);
            this.emit('workerDisconnected', workerId);
        });

        await worker.connect();

        this.workers.set(workerId, worker);
        this.emit('workerConnected', workerId, worker);

        return { workerId, worker };
    }

    /**
     * Get worker by ID
     */
    getWorker(workerId) {
        return this.workers.get(workerId);
    }

    /**
     * Disconnect worker
     */
    disconnectWorker(workerId) {
        const worker = this.workers.get(workerId);
        if (worker) {
            worker.disconnect();
        }
    }

    /**
     * Get all active workers
     */
    getActiveWorkers() {
        return Array.from(this.workers.values());
    }

    /**
     * Get statistics for all workers
     */
    getAllStats() {
        const stats = {};
        for (const [workerId, worker] of this.workers) {
            stats[workerId] = worker.getStats();
        }
        return stats;
    }

    /**
     * Disconnect all workers
     */
    disconnectAll() {
        for (const worker of this.workers.values()) {
            worker.disconnect();
        }
        this.workers.clear();
    }
}

module.exports = {
    ASRStreamingWorker,
    ASRWorkerManager,
    SAMPLE_RATE,
    ENCODING
};
