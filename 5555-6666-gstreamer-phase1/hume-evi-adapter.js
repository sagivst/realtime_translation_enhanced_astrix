/**
 * Hume EVI (Empathic Voice Interface) Adapter
 *
 * Analyzes audio and transcripts for emotion and prosody:
 * - Real-time emotion detection from audio
 * - Prosody analysis (rate, pitch, energy)
 * - Intent recognition
 * - End-of-turn detection
 * - Context window management (3-5 seconds)
 *
 * Based on HAsterisk_HumeEVI_Spec.md specifications
 */

const WebSocket = require('ws');
const { EventEmitter } = require('events');

const CONTEXT_WINDOW_MS = 5000;  // 5 seconds of audio context
const FRAME_DURATION_MS = 20;
const FRAMES_IN_CONTEXT = Math.floor(CONTEXT_WINDOW_MS / FRAME_DURATION_MS); // 250 frames

/**
 * Ring buffer for audio context window
 */
class AudioContextBuffer {
    constructor(size) {
        this.size = size;
        this.buffer = new Array(size);
        this.index = 0;
        this.count = 0;
    }

    push(frame) {
        this.buffer[this.index] = frame;
        this.index = (this.index + 1) % this.size;
        if (this.count < this.size) {
            this.count++;
        }
    }

    getAll() {
        if (this.count === 0) return [];

        const result = [];
        let start = this.count < this.size ? 0 : this.index;

        for (let i = 0; i < this.count; i++) {
            const idx = (start + i) % this.size;
            result.push(this.buffer[idx]);
        }

        return result;
    }

    clear() {
        this.index = 0;
        this.count = 0;
    }
}

/**
 * Hume EVI Adapter
 */
class HumeEVIAdapter extends EventEmitter {
    constructor(apiKey, options = {}) {
        super();

        if (!apiKey) {
            throw new Error('Hume EVI API key is required');
        }

        this.apiKey = apiKey;
        this.wsUrl = options.wsUrl || 'wss://api.hume.ai/v1/evi/stream';

        // Context window for audio
        this.audioContext = new AudioContextBuffer(FRAMES_IN_CONTEXT);

        // WebSocket connection
        this.ws = null;
        this.connected = false;
        this.connecting = false;

        // Configuration
        this.config = {
            sampleRate: options.sampleRate || 16000,
            channels: options.channels || 1,
            contextWindowMs: options.contextWindowMs || CONTEXT_WINDOW_MS,
            enableEmotionDetection: options.enableEmotionDetection !== false,
            enableProsodyAnalysis: options.enableProsodyAnalysis !== false,
            enableIntentRecognition: options.enableIntentRecognition !== false
        };

        // Statistics
        this.stats = {
            framesProcessed: 0,
            emotionEventsReceived: 0,
            prosodyEventsReceived: 0,
            intentEventsReceived: 0,
            errors: 0,
            reconnections: 0
        };

        // Last detected emotion/prosody
        this.lastEmotion = null;
        this.lastProsody = null;
        this.lastIntent = null;

        // Reconnection settings
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second
    }

    /**
     * Connect to Hume EVI WebSocket
     */
    async connect() {
        if (this.connected || this.connecting) {
            return;
        }

        this.connecting = true;

        try {
            console.log('[HumeEVI] Connecting to Hume EVI...');

            this.ws = new WebSocket(this.wsUrl, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            // Set up event handlers
            this.ws.on('open', () => this.handleOpen());
            this.ws.on('message', (data) => this.handleMessage(data));
            this.ws.on('error', (error) => this.handleError(error));
            this.ws.on('close', () => this.handleClose());

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

            console.log('[HumeEVI] ✓ Connected successfully');

        } catch (error) {
            this.connecting = false;
            console.error('[HumeEVI] Connection failed:', error.message);
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

        // Send configuration
        this.sendConfig();

        this.emit('connected');
        console.log('[HumeEVI] WebSocket connected');
    }

    /**
     * Send configuration to Hume EVI
     */
    sendConfig() {
        const config = {
            type: 'config',
            sampleRate: this.config.sampleRate,
            channels: this.config.channels,
            contextWindowMs: this.config.contextWindowMs,
            features: {
                emotion: this.config.enableEmotionDetection,
                prosody: this.config.enableProsodyAnalysis,
                intent: this.config.enableIntentRecognition
            }
        };

        this.sendMessage(config);
    }

    /**
     * Push audio frame and optional transcript
     */
    async pushAudioAndText(frame20ms, text = null) {
        if (!this.connected) {
            console.warn('[HumeEVI] Not connected, skipping frame');
            return false;
        }

        try {
            // Add to context window
            this.audioContext.push(frame20ms);
            this.stats.framesProcessed++;

            // Prepare message
            const message = {
                type: 'audio',
                timestamp: Date.now(),
                data: frame20ms.toString('base64'),
                sampleRate: this.config.sampleRate,
                channels: this.config.channels
            };

            // Add transcript if provided
            if (text && text.trim().length > 0) {
                message.text = text;
            }

            // Send to Hume EVI
            this.sendMessage(message);

            return true;

        } catch (error) {
            console.error('[HumeEVI] Error pushing audio:', error.message);
            this.stats.errors++;
            return false;
        }
    }

    /**
     * Send message to Hume EVI
     */
    sendMessage(message) {
        if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return false;
        }

        try {
            this.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('[HumeEVI] Send error:', error.message);
            return false;
        }
    }

    /**
     * Handle incoming message from Hume EVI
     */
    handleMessage(data) {
        try {
            const message = JSON.parse(data);

            switch (message.type) {
                case 'emotion':
                    this.handleEmotionEvent(message);
                    break;

                case 'prosody':
                    this.handleProsodyEvent(message);
                    break;

                case 'intent':
                    this.handleIntentEvent(message);
                    break;

                case 'turn':
                    this.handleTurnEvent(message);
                    break;

                case 'error':
                    console.error('[HumeEVI] Server error:', message.error);
                    this.stats.errors++;
                    break;

                default:
                    console.warn('[HumeEVI] Unknown message type:', message.type);
            }

        } catch (error) {
            console.error('[HumeEVI] Message parsing error:', error.message);
            this.stats.errors++;
        }
    }

    /**
     * Handle emotion event
     */
    handleEmotionEvent(message) {
        this.stats.emotionEventsReceived++;

        const emotion = {
            primary: message.emotion,
            confidence: message.confidence || 0,
            valence: message.valence || 0,      // Positive/negative (-1 to 1)
            arousal: message.arousal || 0,      // Energy level (0 to 1)
            dominance: message.dominance || 0,  // Control/power (0 to 1)
            timestamp: message.timestamp || Date.now()
        };

        this.lastEmotion = emotion;
        this.emit('emotion', emotion);
    }

    /**
     * Handle prosody event
     */
    handleProsodyEvent(message) {
        this.stats.prosodyEventsReceived++;

        const prosody = {
            rate: message.rate || 1.0,              // Speaking rate multiplier
            pitch_semitones: message.pitch || 0,    // Pitch shift in semitones
            energy: message.energy || 0.5,          // Voice energy/volume (0 to 1)
            rhythm: message.rhythm || 'normal',     // Speech rhythm pattern
            timestamp: message.timestamp || Date.now()
        };

        this.lastProsody = prosody;
        this.emit('prosody', prosody);
    }

    /**
     * Handle intent event
     */
    handleIntentEvent(message) {
        this.stats.intentEventsReceived++;

        const intent = {
            primary: message.intent,
            confidence: message.confidence || 0,
            context: message.context || {},
            timestamp: message.timestamp || Date.now()
        };

        this.lastIntent = intent;
        this.emit('intent', intent);
    }

    /**
     * Handle turn event (end-of-turn detection)
     */
    handleTurnEvent(message) {
        const turnEvent = {
            end_of_turn_hint: message.end_of_turn_hint || false,
            confidence: message.confidence || 0,
            timestamp: message.timestamp || Date.now()
        };

        this.emit('turn', turnEvent);
    }

    /**
     * Get current emotion vector for TTS
     */
    getEmotionVector() {
        if (!this.lastEmotion || !this.lastProsody) {
            // Return neutral default
            return {
                emotion: {
                    primary: 'neutral',
                    confidence: 1.0,
                    valence: 0,
                    arousal: 0.5,
                    dominance: 0.5
                },
                prosody: {
                    rate: 1.0,
                    pitch_semitones: 0,
                    energy: 0.5,
                    rhythm: 'normal'
                }
            };
        }

        return {
            emotion: this.lastEmotion,
            prosody: this.lastProsody,
            intent: this.lastIntent
        };
    }

    /**
     * Handle WebSocket error
     */
    handleError(error) {
        console.error('[HumeEVI] WebSocket error:', error.message);
        this.stats.errors++;
        this.emit('error', error);
    }

    /**
     * Handle WebSocket close
     */
    handleClose() {
        console.log('[HumeEVI] WebSocket closed');
        this.connected = false;
        this.connecting = false;

        this.emit('disconnected');

        // Attempt reconnection
        this.attemptReconnect();
    }

    /**
     * Attempt to reconnect
     */
    async attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[HumeEVI] Max reconnection attempts reached');
            this.emit('reconnect-failed');
            return;
        }

        this.reconnectAttempts++;
        this.stats.reconnections++;

        console.log(`[HumeEVI] Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        await this.sleep(this.reconnectDelay);

        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds

        try {
            await this.connect();
            console.log('[HumeEVI] ✓ Reconnected successfully');
        } catch (error) {
            console.error('[HumeEVI] Reconnection failed:', error.message);
            this.attemptReconnect();
        }
    }

    /**
     * Disconnect from Hume EVI
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.connected = false;
        this.connecting = false;
        this.audioContext.clear();

        console.log('[HumeEVI] Disconnected');
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            connected: this.connected,
            contextFrames: this.audioContext.count,
            lastEmotion: this.lastEmotion ? this.lastEmotion.primary : 'unknown',
            lastProsodyRate: this.lastProsody ? this.lastProsody.rate : 1.0
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            framesProcessed: 0,
            emotionEventsReceived: 0,
            prosodyEventsReceived: 0,
            intentEventsReceived: 0,
            errors: 0,
            reconnections: 0
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

/**
 * Hume EVI Manager - Manages multiple EVI instances
 */
class HumeEVIManager extends EventEmitter {
    constructor(apiKey, options = {}) {
        super();

        this.apiKey = apiKey;
        this.options = options;
        this.instances = new Map();  // channelId -> HumeEVIAdapter

        console.log('[HumeEVIMgr] Initialized');
    }

    /**
     * Create EVI instance for channel
     */
    async createInstance(channelId) {
        if (this.instances.has(channelId)) {
            return this.instances.get(channelId);
        }

        console.log(`[HumeEVIMgr] Creating EVI instance for ${channelId}...`);

        const instance = new HumeEVIAdapter(this.apiKey, this.options);

        // Forward events
        instance.on('emotion', (emotion) => {
            this.emit('emotion', { channelId, emotion });
        });

        instance.on('prosody', (prosody) => {
            this.emit('prosody', { channelId, prosody });
        });

        instance.on('intent', (intent) => {
            this.emit('intent', { channelId, intent });
        });

        instance.on('turn', (turn) => {
            this.emit('turn', { channelId, turn });
        });

        instance.on('error', (error) => {
            this.emit('error', { channelId, error });
        });

        // Connect
        await instance.connect();

        this.instances.set(channelId, instance);
        this.emit('instanceCreated', channelId);

        return instance;
    }

    /**
     * Get instance for channel
     */
    getInstance(channelId) {
        return this.instances.get(channelId);
    }

    /**
     * Disconnect instance
     */
    disconnectInstance(channelId) {
        const instance = this.instances.get(channelId);
        if (instance) {
            instance.disconnect();
            this.instances.delete(channelId);
            this.emit('instanceDisconnected', channelId);
        }
    }

    /**
     * Get all instances
     */
    getAllInstances() {
        return Array.from(this.instances.values());
    }

    /**
     * Get statistics for all instances
     */
    getAllStats() {
        const stats = {};
        for (const [channelId, instance] of this.instances) {
            stats[channelId] = instance.getStats();
        }
        return stats;
    }

    /**
     * Disconnect all instances
     */
    disconnectAll() {
        for (const instance of this.instances.values()) {
            instance.disconnect();
        }
        this.instances.clear();
        console.log('[HumeEVIMgr] All instances disconnected');
    }
}

module.exports = {
    HumeEVIAdapter,
    HumeEVIManager
};
