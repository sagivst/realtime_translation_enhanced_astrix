/**
 * Hume AI Streaming Client - Lightweight real-time emotion detection
 * Provides: Arousal, Valence, Energy metrics for dashboard monitoring
 *
 * UPDATED: Using header authentication for Creator plan compatibility
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class HumeStreamingClient extends EventEmitter {
    constructor(apiKey, options = {}) {
        super();
        this.apiKey = apiKey;
        this.ws = null;
        this.connected = false;
        this.metrics = {
            arousal: 0,
            valence: 0,
            energy: 0,
            timestamp: null,
            voiceDetected: false
        };

        this.config = {
            sampleRate: options.sampleRate || 16000,
            channels: options.channels || 1,
            models: options.models || {
                prosody: {}
            }
        };
    }

    async connect() {
        return new Promise((resolve, reject) => {
            try {
                // Hume AI WebSocket endpoint - NO API KEY IN URL
                // Using header authentication for Creator plan compatibility
                const wsUrl = 'wss://api.hume.ai/v0/stream/models';

                console.log('[Hume] Connecting to Hume AI streaming with header authentication...');

                // Use header authentication (required for Creator plan)
                this.ws = new WebSocket(wsUrl, {
                    headers: {
                        'X-Hume-Api-Key': this.apiKey
                    }
                });

                this.ws.on('open', () => {
                    console.log('[Hume] ✓ Connected to Hume AI (Creator plan)');
                    this.connected = true;

                    // Send configuration
                    const config = {
                        models: this.config.models,
                        raw_text: false
                    };

                    this.ws.send(JSON.stringify(config));
                    console.log('[Hume] Configuration sent:', JSON.stringify(config));

                    this.emit('connected');
                    resolve();
                });

                this.ws.on('message', (data) => {
                    try {
                        const response = JSON.parse(data.toString());
                        this.handleResponse(response);
                    } catch (err) {
                        console.error('[Hume] Error parsing message:', err.message);
                    }
                });

                this.ws.on('error', (error) => {
                    console.error('[Hume] WebSocket error:', error.message);
                    this.emit('error', error);
                });

                this.ws.on('close', () => {
                    console.log('[Hume] Connection closed');
                    this.connected = false;
                    this.emit('disconnected');
                });

            } catch (error) {
                console.error('[Hume] Connection error:', error.message);
                reject(error);
            }
        });
    }

    handleResponse(response) {
        // Log raw response for debugging
        if (response.prosody) {
            console.log('[Hume] Prosody data received:', JSON.stringify(response.prosody).substring(0, 200));

            const prosody = response.prosody;

            // Extract metrics - Hume provides various emotional dimensions
            // We'll map the most relevant ones to arousal, valence, energy
            if (prosody.predictions && prosody.predictions.length > 0) {
                const pred = prosody.predictions[0];

                // Map Hume's emotional dimensions to our metrics
                // Arousal: high activation emotions (excitement, anger, fear)
                // Valence: positive vs negative (joy vs sadness)
                // Energy: speech intensity and dynamism

                const emotions = pred.emotions || [];

                // Calculate arousal (0-1): activation level
                const arousalEmotions = ['excitement', 'anger', 'fear', 'surprise'];
                this.metrics.arousal = this.calculateMetric(emotions, arousalEmotions);

                // Calculate valence (0-1): positivity
                const positiveEmotions = ['joy', 'contentment', 'amusement', 'love'];
                const negativeEmotions = ['sadness', 'anger', 'fear', 'disgust'];
                const positive = this.calculateMetric(emotions, positiveEmotions);
                const negative = this.calculateMetric(emotions, negativeEmotions);
                this.metrics.valence = Math.max(0, Math.min(1, (positive - negative + 1) / 2));

                // Calculate energy (0-1): speech dynamics
                const energyEmotions = ['excitement', 'determination', 'concentration'];
                this.metrics.energy = this.calculateMetric(emotions, energyEmotions);

                this.metrics.timestamp = new Date().toISOString();
                this.metrics.voiceDetected = true;

                console.log('[Hume] Metrics updated:', {
                    arousal: this.metrics.arousal.toFixed(3),
                    valence: this.metrics.valence.toFixed(3),
                    energy: this.metrics.energy.toFixed(3)
                });

                this.emit('metrics', this.metrics);
            }
        }

        // Handle other response types
        if (response.error) {
            console.error('[Hume] API error:', response.error);
            this.emit('error', new Error(response.error.message || 'Hume API error'));
        }
    }

    calculateMetric(emotions, targetEmotions) {
        if (!emotions || emotions.length === 0) return 0;

        let total = 0;
        let count = 0;

        emotions.forEach(emo => {
            if (targetEmotions.includes(emo.name.toLowerCase())) {
                total += emo.score;
                count++;
            }
        });

        return count > 0 ? total / count : 0;
    }

    createWAVHeader(pcmDataLength) {
        const sampleRate = this.config.sampleRate;
        const numChannels = this.config.channels;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);
        const dataSize = pcmDataLength;
        const fileSize = 36 + dataSize;

        const buffer = Buffer.alloc(44);

        // RIFF chunk descriptor
        buffer.write('RIFF', 0);
        buffer.writeUInt32LE(fileSize, 4);
        buffer.write('WAVE', 8);

        // fmt sub-chunk
        buffer.write('fmt ', 12);
        buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
        buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
        buffer.writeUInt16LE(numChannels, 22);
        buffer.writeUInt32LE(sampleRate, 24);
        buffer.writeUInt32LE(byteRate, 28);
        buffer.writeUInt16LE(blockAlign, 32);
        buffer.writeUInt16LE(bitsPerSample, 34);

        // data sub-chunk
        buffer.write('data', 36);
        buffer.writeUInt32LE(dataSize, 40);

        return buffer;
    }

    sendAudio(audioBuffer) {
        if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        try {
            // Wrap PCM in WAV format for Hume compatibility
            const wavHeader = this.createWAVHeader(audioBuffer.length);
            const wavFile = Buffer.concat([wavHeader, audioBuffer]);
            const base64Audio = wavFile.toString('base64');

            // Send both models AND data for every message (Hume requirement)
            const message = JSON.stringify({ models: { prosody: {} }, data: base64Audio });
            this.ws.send(message);
        } catch (error) {
            console.error('[Hume] Error sending audio:', error.message);
        }
    }

    getMetrics() {
        return { ...this.metrics };
    }

    async disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
    }
}

module.exports = HumeStreamingClient;
