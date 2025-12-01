/**
 * Deepgram Streaming Client
 *
 * Low-latency streaming transcription using WebSocket API
 * Based on Realtime Voice Ingest & QA Spec
 *
 * Key Features:
 * - Streams 20ms PCM frames (640 bytes each)
 * - Returns interim/partial/final results
 * - Target latency: 150-250ms for partials
 * - TCP_NODELAY for minimal delay
 */

const WebSocket = require('ws');
const { EventEmitter } = require('events');

class DeepgramStreamingClient extends EventEmitter {
    constructor(apiKey, options = {}) {
        super();

        if (!apiKey) {
            throw new Error('Deepgram API key is required');
        }

        this.apiKey = apiKey;

        // Configuration
        this.config = {
            language: options.language || 'en',
            sampleRate: options.sampleRate || 16000,
            encoding: 'linear16',
            channels: 1,
            model: options.model || 'nova-2',
            interimResults: options.interimResults !== false,
            punctuate: options.punctuate !== false,
            endpointing: options.endpointing || false, // Let local VAD lead
            customVocabulary: options.customVocabulary || []
        };

        // WebSocket connection
        this.ws = null;
        this.connected = false;
        this.connecting = false;

        // Statistics
        this.stats = {
            framesStreamed: 0,
            bytesStreamed: 0,
            partialsReceived: 0,
            finalsReceived: 0,
            errors: 0,
            reconnections: 0,
            avgLatencyMs: 0
        };

        // Sequence tracking
        this.seqNum = 0;
        this.lastTranscriptTime = null;

        // Reconnection settings
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;

        console.log('[DeepgramStream] Initialized:', {
            language: this.config.language,
            model: this.config.model,
            sampleRate: this.config.sampleRate
        });
    }

    /**
     * Build WebSocket URL with parameters
     */
    buildUrl() {
        const params = new URLSearchParams({
            encoding: this.config.encoding,
            sample_rate: this.config.sampleRate,
            channels: this.config.channels,
            language: this.config.language,
            model: this.config.model,
            interim_results: this.config.interimResults,
            punctuate: this.config.punctuate,
            endpointing: this.config.endpointing
        });

        // Add custom vocabulary if provided
        if (this.config.customVocabulary.length > 0) {
            params.append('keywords', this.config.customVocabulary.join(','));
        }

        return `wss://api.deepgram.com/v1/listen?${params.toString()}`;
    }

    /**
     * Connect to Deepgram WebSocket
     */
    async connect() {
        if (this.connected || this.connecting) {
            console.warn('[DeepgramStream] Already connected or connecting');
            return;
        }

        this.connecting = true;

        try {
            const url = this.buildUrl();
            console.log('[DeepgramStream] Connecting...');

            this.ws = new WebSocket(url, {
                headers: {
                    'Authorization': `Token ${this.apiKey}`
                }
            });

            // Set up event handlers
            this.ws.on('open', () => this.handleOpen());
            this.ws.on('message', (data) => this.handleMessage(data));
            this.ws.on('error', (error) => this.handleError(error));
            this.ws.on('close', (code, reason) => this.handleClose(code, reason));

            // Wait for connection
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 10000);

                this.ws.once('open', () => {
                    clearTimeout(timeout);
                    resolve();
                });

                this.ws.once('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });

            console.log('[DeepgramStream] ✓ Connected successfully');

        } catch (error) {
            this.connecting = false;
            console.error('[DeepgramStream] Connection failed:', error.message);
            throw error;
        }
    }

    /**
     * Handle WebSocket open
     */
    handleOpen() {
        this.connected = true;
        this.connecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.seqNum = 0;

        // Enable TCP_NODELAY for low latency
        if (this.ws && this.ws._socket) {
            try {
                this.ws._socket.setNoDelay(true);
                console.log('[DeepgramStream] TCP_NODELAY enabled');
            } catch (err) {
                console.warn('[DeepgramStream] Could not set TCP_NODELAY:', err.message);
            }
        }

        this.emit('connected');
        console.log('[DeepgramStream] WebSocket connected');
    }

    /**
     * Stream PCM frame (20ms, 640 bytes)
     * @param {Buffer} pcmFrame - 640 bytes of 16-bit PCM audio
     * @param {number} seqNum - Sequence number for tracking
     * @returns {boolean} Success
     */
    streamFrame(pcmFrame, seqNum = null) {
        if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[DeepgramStream] Not connected, dropping frame');
            return false;
        }

        if (!Buffer.isBuffer(pcmFrame)) {
            console.error('[DeepgramStream] Frame must be a Buffer');
            return false;
        }

        if (pcmFrame.length !== 640) {
            console.warn(`[DeepgramStream] Expected 640 bytes, got ${pcmFrame.length}`);
        }

        try {
            // Send binary PCM directly (no WAV header!)
            this.ws.send(pcmFrame);

            // Update stats
            this.stats.framesStreamed++;
            this.stats.bytesStreamed += pcmFrame.length;
            this.seqNum = seqNum || (this.seqNum + 1);

            return true;

        } catch (error) {
            console.error('[DeepgramStream] Error streaming frame:', error.message);
            this.stats.errors++;
            return false;
        }
    }

    /**
     * Handle incoming message from Deepgram
     */
    handleMessage(data) {
        try {
            const message = JSON.parse(data.toString());

            // Handle different message types
            if (message.type === 'Results') {
                this.handleTranscriptionResult(message);
            } else if (message.type === 'Metadata') {
                this.handleMetadata(message);
            } else if (message.type === 'Error') {
                console.error('[DeepgramStream] Server error:', message);
                this.stats.errors++;
                this.emit('error', new Error(message.error || 'Unknown error'));
            } else {
                console.log('[DeepgramStream] Unknown message type:', message.type);
            }

        } catch (error) {
            console.error('[DeepgramStream] Message parsing error:', error.message);
            this.stats.errors++;
        }
    }

    /**
     * Handle transcription result
     */
    handleTranscriptionResult(message) {
        if (!message.channel || !message.channel.alternatives || message.channel.alternatives.length === 0) {
            return;
        }

        const alternative = message.channel.alternatives[0];
        const text = alternative.transcript;
        const confidence = alternative.confidence || 0;
        const isFinal = message.is_final || false;

        // Skip empty results
        if (!text || text.trim().length === 0) {
            return;
        }

        // Calculate latency if we have timing info
        let latencyMs = null;
        if (message.start && this.lastTranscriptTime) {
            latencyMs = Date.now() - this.lastTranscriptTime;
            this.stats.avgLatencyMs = (this.stats.avgLatencyMs * 0.9) + (latencyMs * 0.1);
        }
        this.lastTranscriptTime = Date.now();

        // Create result object
        const result = {
            text: text.trim(),
            confidence: confidence,
            isFinal: isFinal,
            type: isFinal ? 'final' : (message.speech_final ? 'stable' : 'partial'),
            duration: message.duration || 0,
            start: message.start || 0,
            latencyMs: latencyMs,
            words: alternative.words || [],
            timestamp: Date.now()
        };

        // Update stats
        if (isFinal) {
            this.stats.finalsReceived++;
        } else {
            this.stats.partialsReceived++;
        }

        // Emit appropriate event
        this.emit('transcript', result);

        if (result.type === 'partial') {
            this.emit('partial', result);
        } else if (result.type === 'stable') {
            this.emit('stable', result);
        } else if (result.type === 'final') {
            this.emit('final', result);
        }

        // Log for debugging
        console.log(`[DeepgramStream] ${result.type}: "${text}" (confidence: ${confidence.toFixed(2)})`);
    }

    /**
     * Handle metadata message
     */
    handleMetadata(message) {
        console.log('[DeepgramStream] Metadata:', {
            requestId: message.request_id,
            modelInfo: message.model_info
        });
        this.emit('metadata', message);
    }

    /**
     * Handle WebSocket error
     */
    handleError(error) {
        console.error('[DeepgramStream] WebSocket error:', error.message);
        this.stats.errors++;
        this.emit('error', error);
    }

    /**
     * Handle WebSocket close
     */
    handleClose(code, reason) {
        console.log('[DeepgramStream] WebSocket closed:', {
            code,
            reason: reason.toString()
        });

        this.connected = false;
        this.connecting = false;

        this.emit('disconnected', { code, reason: reason.toString() });

        // Attempt reconnection if not intentional close
        if (code !== 1000 && code !== 1005) { // Not normal or no status code
            this.attemptReconnect();
        }
    }

    /**
     * Attempt to reconnect
     */
    async attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[DeepgramStream] Max reconnection attempts reached');
            this.emit('reconnect-failed');
            return;
        }

        this.reconnectAttempts++;
        this.stats.reconnections++;

        console.log(`[DeepgramStream] Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        await this.sleep(this.reconnectDelay);

        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds

        try {
            await this.connect();
            console.log('[DeepgramStream] ✓ Reconnected successfully');
            this.emit('reconnected');
        } catch (error) {
            console.error('[DeepgramStream] Reconnection failed:', error.message);
            this.attemptReconnect();
        }
    }

    /**
     * Send KeepAlive message
     */
    sendKeepAlive() {
        if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify({ type: 'KeepAlive' }));
                return true;
            } catch (error) {
                console.error('[DeepgramStream] KeepAlive error:', error.message);
                return false;
            }
        }
        return false;
    }

    /**
     * Disconnect from Deepgram
     */
    disconnect() {
        console.log('[DeepgramStream] Disconnecting...');

        if (this.ws) {
            // Send close frame with normal closure
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close(1000, 'Normal closure');
            }
            this.ws = null;
        }

        this.connected = false;
        this.connecting = false;

        console.log('[DeepgramStream] Disconnected');
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            connected: this.connected,
            seqNum: this.seqNum,
            language: this.config.language,
            model: this.config.model
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            framesStreamed: 0,
            bytesStreamed: 0,
            partialsReceived: 0,
            finalsReceived: 0,
            errors: 0,
            reconnections: 0,
            avgLatencyMs: 0
        };
    }

    /**
     * Health check
     */
    isHealthy() {
        return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = DeepgramStreamingClient;
