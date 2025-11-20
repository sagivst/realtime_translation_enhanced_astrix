// ============================================================================
// Audio Stream Buffer with Comfort Noise
// Buffers audio streams with controlled delays and adds comfort noise
// Designed to work with future Dispatcher for multi-channel sync
// ============================================================================

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class AudioStreamBuffer extends EventEmitter {
    constructor(options = {}) {
        super();

        // Buffer configuration
        this.sampleRate = options.sampleRate || 16000;
        this.channels = options.channels || 1;
        this.bitDepth = options.bitDepth || 16;

        // Delay configuration (will be updated by Dispatcher)
        this.currentDelay = 0;  // Current delay in milliseconds
        this.maxBufferSize = options.maxBufferSize || 2000;  // Max 2 seconds buffer

        // Audio buffer queue
        this.audioQueue = [];
        this.bufferStartTime = null;

        // Comfort noise configuration
        this.comfortNoiseConfig = {
            enabled: false,
            noiseType: 'white',      // 'white', 'pink', or 'brown'
            speechLevel: -30,        // dB during speech (very quiet)
            silenceLevel: -15,       // dB during silence gaps (moderate)
            vadThreshold: 0.01,      // Voice activity detection threshold
            fadeInMs: 50,            // Fade in duration
            fadeOutMs: 50            // Fade out duration
        };

        // Comfort noise state
        this.currentNoiseLevel = 0;  // Current linear gain (0 = muted)
        this.targetNoiseLevel = 0;   // Target linear gain
        this.isFading = false;
        this.fadeStartTime = 0;
        this.fadeStartLevel = 0;
        this.fadeDuration = 0;

        // Pink noise generator state
        this.pinkNoiseState = {
            b0: 0, b1: 0, b2: 0, b3: 0, b4: 0, b5: 0, b6: 0
        };

        // Brown noise generator state
        this.brownNoiseState = {
            lastOut: 0
        };

        // Streaming state
        this.isStreaming = false;
        this.streamInterval = null;

        // Load pre-recorded background audio files
        this.backgroundAudioBuffers = {};
        this.backgroundAudioPosition = 0;
        this.loadBackgroundAudioFiles();
        console.log('[AudioStreamBuffer] Constructor: Loading background audio files...');
    }


    /**
     * Load pre-recorded background audio files
     */
    loadBackgroundAudioFiles() {
        const publicDir = path.join(__dirname, 'public');

        const audioFiles = {
            'call-center': 'call-center-ambience.wav',
            'trading-room': 'trading-room-ambience.wav'
        };

        for (const [key, filename] of Object.entries(audioFiles)) {
            const filepath = path.join(publicDir, filename);

            try {
                if (fs.existsSync(filepath)) {
                    // Read WAV file (skip 44-byte header for 16-bit PCM WAV)
                    const fileData = fs.readFileSync(filepath);
                    this.backgroundAudioBuffers[key] = fileData.slice(44); // Skip WAV header
                    console.log(`[StreamBuffer] Loaded background audio: ${key} (${this.backgroundAudioBuffers[key].length} bytes)`);
                } else {
                    console.log(`[StreamBuffer] Background audio file not found: ${filepath}`);
                }
            } catch (err) {
                console.error(`[StreamBuffer] Error loading ${key}:`, err.message);
            }
        }
    }


    /**
     * Load pre-recorded background audio files
     */
    loadBackgroundAudioFiles() {
        const publicDir = path.join(__dirname, 'public');

        const audioFiles = {
            'call-center': 'call-center-ambience.wav',
            'trading-room': 'trading-room-ambience.wav'
        };

        for (const [key, filename] of Object.entries(audioFiles)) {
            const filepath = path.join(publicDir, filename);

            try {
                if (fs.existsSync(filepath)) {
                    // Read WAV file (skip 44-byte header for 16-bit PCM WAV)
                    const fileData = fs.readFileSync(filepath);
                    this.backgroundAudioBuffers[key] = fileData.slice(44); // Skip WAV header
                    console.log(`[StreamBuffer] Loaded background audio: ${key} (${this.backgroundAudioBuffers[key].length} bytes)`);
                } else {
                    console.log(`[StreamBuffer] Background audio file not found: ${filepath}`);
                }
            } catch (err) {
                console.error(`[StreamBuffer] Error loading ${key}:`, err.message);
            }
        }
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /**
     * Update delay value (called by Dispatcher)
     * @param {number} delayMs - Delay in milliseconds
     */
    setDelay(delayMs) {
        this.currentDelay = Math.min(delayMs, this.maxBufferSize);
        console.log(`[StreamBuffer] Delay updated: ${this.currentDelay}ms`);
        this.emit('delayUpdated', this.currentDelay);
    }

    /**
     * Update comfort noise configuration
     * @param {object} config - Comfort noise config
     */
    updateComfortNoiseConfig(config) {
        Object.assign(this.comfortNoiseConfig, config);
        console.log('[StreamBuffer] Comfort noise config updated:', this.comfortNoiseConfig);
        this.emit('comfortNoiseConfigUpdated', this.comfortNoiseConfig);
    }

    /**
     * Add audio chunk to buffer
     * @param {Buffer} pcmBuffer - PCM audio data
     * @param {object} metadata - Audio metadata
     */
    addAudioChunk(pcmBuffer, metadata = {}) {
        const chunk = {
            buffer: pcmBuffer,
            timestamp: Date.now(),
            metadata: metadata
        };

        this.audioQueue.push(chunk);

        // Start streaming if not already started
        if (!this.isStreaming) {
            this.startStreaming();
        }
    }

    /**
     * Start streaming buffered audio
     */
    startStreaming() {
        if (this.isStreaming) return;

        this.isStreaming = true;
        this.bufferStartTime = Date.now();

        console.log('[StreamBuffer] Started streaming with delay:', this.currentDelay, 'ms');

        // Stream at 20ms intervals (matches Asterisk frame size)
        this.streamInterval = setInterval(() => {
            this.processStream();
        }, 20);
    }

    /**
     * Stop streaming
     */
    stopStreaming() {
        if (!this.isStreaming) return;

        this.isStreaming = false;

        if (this.streamInterval) {
            clearInterval(this.streamInterval);
            this.streamInterval = null;
        }

        console.log('[StreamBuffer] Stopped streaming');
        this.emit('streamStopped');
    }

    /**
     * Clear buffer
     */
    clearBuffer() {
        this.audioQueue = [];
        this.bufferStartTime = null;
        console.log('[StreamBuffer] Buffer cleared');
    }

    // ========================================================================
    // INTERNAL PROCESSING
    // ========================================================================

    /**
     * Process stream (called every 20ms)
     */
    processStream() {
        const now = Date.now();

        // Check if we have audio ready to play (accounting for delay)
        const readyChunks = this.audioQueue.filter(chunk => {
            const chunkAge = now - chunk.timestamp;
            return chunkAge >= this.currentDelay;
        });

        if (readyChunks.length > 0) {
            // Get the oldest ready chunk
            const chunk = readyChunks[0];
            const chunkIndex = this.audioQueue.indexOf(chunk);

            // Remove from queue
            this.audioQueue.splice(chunkIndex, 1);

            // Process audio with comfort noise
            const processedAudio = this.addComfortNoiseToAudio(chunk.buffer);

            // Emit for playback
            this.emit('audioReady', {
                buffer: processedAudio,
                metadata: chunk.metadata,
                actualDelay: now - chunk.timestamp
            });
        } else {
            // No audio ready - emit comfort noise only
            if (this.comfortNoiseConfig.enabled) {
                const frameSize = Math.floor(this.sampleRate * 0.02) * 2;  // 20ms frame
                const comfortNoiseFrame = this.generateComfortNoiseFrame(frameSize, true);

                this.emit('audioReady', {
                    buffer: comfortNoiseFrame,
                    metadata: { comfortNoiseOnly: true },
                    actualDelay: 0
                });
            }
        }

        // Stop streaming if buffer is empty and no more audio expected
        if (this.audioQueue.length === 0 && (now - this.bufferStartTime) > 5000) {
            this.stopStreaming();
        }
    }

    /**
     * Add comfort noise to audio buffer
     * @param {Buffer} audioBuffer - Original audio
     * @returns {Buffer} Audio with comfort noise
     */
    addComfortNoiseToAudio(audioBuffer) {
        if (!this.comfortNoiseConfig.enabled) {
            return audioBuffer;
        }

        // Detect voice activity
        const hasVoice = this.detectVoiceActivity(audioBuffer);

        // Update target noise level based on VAD
        const targetDb = hasVoice
            ? this.comfortNoiseConfig.speechLevel
            : this.comfortNoiseConfig.silenceLevel;

        const newTargetLevel = this.dbToLinear(targetDb);

        // Trigger fade if target changed
        if (Math.abs(newTargetLevel - this.targetNoiseLevel) > 0.001) {
            this.startFade(
                this.currentNoiseLevel,
                newTargetLevel,
                hasVoice ? this.comfortNoiseConfig.fadeOutMs : this.comfortNoiseConfig.fadeInMs
            );
        }

        // Generate comfort noise frame
        const noiseBuffer = this.generateComfortNoiseFrame(audioBuffer.length, false);

        // Mix audio with comfort noise
        return this.mixAudio(audioBuffer, noiseBuffer);
    }

    /**
     * Start fading comfort noise level
     */
    startFade(fromLevel, toLevel, durationMs) {
        this.isFading = true;
        this.fadeStartTime = Date.now();
        this.fadeStartLevel = fromLevel;
        this.targetNoiseLevel = toLevel;
        this.fadeDuration = durationMs;
    }

    /**
     * Get current noise level (with fading)
     */
    getCurrentNoiseLevel() {
        if (!this.isFading) {
            return this.targetNoiseLevel;
        }

        const elapsed = Date.now() - this.fadeStartTime;

        if (elapsed >= this.fadeDuration) {
            // Fade complete
            this.isFading = false;
            this.currentNoiseLevel = this.targetNoiseLevel;
            return this.targetNoiseLevel;
        }

        // Linear interpolation
        const progress = elapsed / this.fadeDuration;
        this.currentNoiseLevel = this.fadeStartLevel +
            (this.targetNoiseLevel - this.fadeStartLevel) * progress;

        return this.currentNoiseLevel;
    }

    /**
     * Generate comfort noise frame
     */
    generateComfortNoiseFrame(length, isGapFill) {
        let noiseBuffer;
        const noiseType = this.comfortNoiseConfig.noiseType;

        // Check if we have a pre-recorded background audio file
        if (this.backgroundAudioBuffers[noiseType]) {
            noiseBuffer = this.getBackgroundAudioChunk(noiseType, length);
        } else {
            // Fall back to algorithmic noise generation
            switch (noiseType) {
                case 'brown':
                    noiseBuffer = this.generateBrownNoise(length);
                    break;
                case 'white':
                    noiseBuffer = this.generateWhiteNoise(length);
                    break;
                case 'call-center':
                case 'trading-room':
                    // If file not available, use white noise as fallback
                    noiseBuffer = this.generateWhiteNoise(length);
                    break;
                case 'pink':
                default:
                    noiseBuffer = this.generatePinkNoise(length);
                    break;
            }
        }

        // Apply current noise level with fading
        const currentLevel = this.getCurrentNoiseLevel();
        return this.applyGain(noiseBuffer, currentLevel);
    }

    // ========================================================================
    // NOISE GENERATION
    // ========================================================================


    /**
     * Get chunk of pre-recorded background audio (with looping)
     */
    getBackgroundAudioChunk(audioType, length) {
        const sourceBuffer = this.backgroundAudioBuffers[audioType];
        if (!sourceBuffer || sourceBuffer.length === 0) {
            return this.generateWhiteNoise(length); // Fallback
        }

        const chunk = Buffer.alloc(length);
        let chunkPos = 0;

        while (chunkPos < length) {
            const remaining = length - chunkPos;
            const sourceRemaining = sourceBuffer.length - this.backgroundAudioPosition;
            const copyLength = Math.min(remaining, sourceRemaining);

            sourceBuffer.copy(chunk, chunkPos, this.backgroundAudioPosition, this.backgroundAudioPosition + copyLength);

            chunkPos += copyLength;
            this.backgroundAudioPosition += copyLength;

            // Loop back to start if we reached the end
            if (this.backgroundAudioPosition >= sourceBuffer.length) {
                this.backgroundAudioPosition = 0;
            }
        }

        return chunk;
    }


    /**
     * Get chunk of pre-recorded background audio (with looping)
     */
    getBackgroundAudioChunk(audioType, length) {
        const sourceBuffer = this.backgroundAudioBuffers[audioType];
        if (!sourceBuffer || sourceBuffer.length === 0) {
            return this.generateWhiteNoise(length); // Fallback
        }

        const chunk = Buffer.alloc(length);
        let chunkPos = 0;

        while (chunkPos < length) {
            const remaining = length - chunkPos;
            const sourceRemaining = sourceBuffer.length - this.backgroundAudioPosition;
            const copyLength = Math.min(remaining, sourceRemaining);

            sourceBuffer.copy(chunk, chunkPos, this.backgroundAudioPosition, this.backgroundAudioPosition + copyLength);

            chunkPos += copyLength;
            this.backgroundAudioPosition += copyLength;

            // Loop back to start if we reached the end
            if (this.backgroundAudioPosition >= sourceBuffer.length) {
                this.backgroundAudioPosition = 0;
            }
        }

        return chunk;
    }

    generatePinkNoise(length) {
        const buffer = Buffer.alloc(length);
        const state = this.pinkNoiseState;

        // Ensure we don't write past the buffer (need 2 bytes for int16)
        for (let i = 0; i <= length - 2; i += 2) {
            const white = Math.random() * 2 - 1;
            state.b0 = 0.99886 * state.b0 + white * 0.0555179;
            state.b1 = 0.99332 * state.b1 + white * 0.0750759;
            state.b2 = 0.96900 * state.b2 + white * 0.1538520;
            state.b3 = 0.86650 * state.b3 + white * 0.3104856;
            state.b4 = 0.55000 * state.b4 + white * 0.5329522;
            state.b5 = -0.7616 * state.b5 - white * 0.0168980;
            const pink = state.b0 + state.b1 + state.b2 + state.b3 + state.b4 + state.b5 + state.b6 + white * 0.5362;
            state.b6 = white * 0.115926;

            const sample = Math.max(-1, Math.min(1, pink * 0.11));
            buffer.writeInt16LE(Math.floor(sample * 32767), i);
        }

        return buffer;
    }

    generateBrownNoise(length) {
        const buffer = Buffer.alloc(length);
        const state = this.brownNoiseState;

        // Ensure we don't write past the buffer (need 2 bytes for int16)
        for (let i = 0; i <= length - 2; i += 2) {
            const white = Math.random() * 2 - 1;
            const brown = (state.lastOut + (0.02 * white)) / 1.02;
            state.lastOut = brown;

            const sample = Math.max(-1, Math.min(1, brown * 0.5));
            buffer.writeInt16LE(Math.floor(sample * 32767), i);
        }

        return buffer;
    }

    generateWhiteNoise(length) {
        const buffer = Buffer.alloc(length);

        // Ensure we don't write past the buffer (need 2 bytes for int16)
        for (let i = 0; i <= length - 2; i += 2) {
            // Pure white noise - equal energy at all frequencies
            const sample = Math.random() * 2 - 1;
            const clamped = Math.max(-1, Math.min(1, sample * 0.3));  // Lower volume
            buffer.writeInt16LE(Math.floor(clamped * 32767), i);
        }

        return buffer;
    }

    // ========================================================================
    // AUDIO UTILITIES
    // ========================================================================

    detectVoiceActivity(pcmBuffer) {
        let sum = 0;
        const samples = Math.floor(pcmBuffer.length / 2);

        // Ensure we don't read past the buffer (need 2 bytes for int16)
        for (let i = 0; i <= pcmBuffer.length - 2; i += 2) {
            const sample = pcmBuffer.readInt16LE(i) / 32768.0;
            sum += sample * sample;
        }

        const rms = Math.sqrt(sum / samples);
        return rms > this.comfortNoiseConfig.vadThreshold;
    }

    dbToLinear(db) {
        return Math.pow(10, db / 20);
    }

    applyGain(pcmBuffer, linearGain) {
        const result = Buffer.alloc(pcmBuffer.length);

        // Ensure we don't read past the buffer (need 2 bytes for int16)
        for (let i = 0; i <= pcmBuffer.length - 2; i += 2) {
            const sample = pcmBuffer.readInt16LE(i);
            const amplified = Math.max(-32768, Math.min(32767, sample * linearGain));
            result.writeInt16LE(Math.floor(amplified), i);
        }

        return result;
    }

    mixAudio(buffer1, buffer2) {
        const length = Math.max(buffer1.length, buffer2.length);
        const result = Buffer.alloc(length);

        // Ensure we don't read past the buffer (need 2 bytes for int16)
        for (let i = 0; i <= length - 2; i += 2) {
            const sample1 = (i <= buffer1.length - 2) ? buffer1.readInt16LE(i) : 0;
            const sample2 = (i <= buffer2.length - 2) ? buffer2.readInt16LE(i) : 0;
            const mixed = Math.max(-32768, Math.min(32767, sample1 + sample2));
            result.writeInt16LE(Math.floor(mixed), i);
        }

        return result;
    }
}

module.exports = AudioStreamBuffer;
