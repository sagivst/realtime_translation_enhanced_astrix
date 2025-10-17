/**
 * RTP Audio Receiver for Asterisk ExternalMedia
 * Receives RTP packets, extracts PCM audio, buffers segments, and triggers processing
 *
 * RTP Packet Format (RFC 3550):
 * - 12-byte header + variable payload
 * - Payload: PCM slin16 (16kHz, mono, 16-bit signed LE)
 * - Frame size: 640 bytes = 320 samples = 20ms
 */

const dgram = require('dgram');
const { EventEmitter } = require('events');
const fs = require('fs');

class RTPAudioReceiver extends EventEmitter {
    constructor(options = {}) {
        super();

        this.channelId = options.channelId;
        this.language = options.language || 'en';
        this.port = options.port || 10000;

        // Audio buffering
        this.audioBuffer = [];
        this.bufferDuration = 0; // milliseconds
        this.maxBufferDuration = options.maxBufferDuration || 3000; // 3 seconds max
        this.minBufferDuration = options.minBufferDuration || 500; // 500ms min

        // Silence detection
        this.silenceThreshold = options.silenceThreshold || 500; // 500ms of silence
        this.lastPacketTime = Date.now();
        this.silenceTimer = null;

        // RTP state
        this.socket = null;
        this.isListening = false;
        this.packetsReceived = 0;
        this.bytesReceived = 0;

        // Stats
        this.stats = {
            packetsReceived: 0,
            bytesReceived: 0,
            segmentsProcessed: 0,
            errors: 0
        };

        console.log('[RTPAudioReceiver] Initialized:', {
            channelId: this.channelId,
            port: this.port,
            language: this.language
        });
    }

    /**
     * Start listening for RTP packets
     */
    async start() {
        if (this.isListening) {
            console.warn('[RTPAudioReceiver] Already listening');
            return;
        }

        return new Promise((resolve, reject) => {
            this.socket = dgram.createSocket('udp4');

            this.socket.on('error', (err) => {
                console.error('[RTPAudioReceiver] Socket error:', {
                    channelId: this.channelId,
                    error: err.message
                });
                this.stats.errors++;
                this.emit('error', err);
            });

            this.socket.on('message', (msg, rinfo) => {
                this.handleRTPPacket(msg, rinfo);
            });

            this.socket.on('listening', () => {
                const address = this.socket.address();
                console.log('[RTPAudioReceiver] Listening:', {
                    channelId: this.channelId,
                    address: `${address.address}:${address.port}`
                });
                this.isListening = true;
                resolve();
            });

            // Bind to specified port
            this.socket.bind(this.port);
        });
    }

    /**
     * Handle incoming RTP packet
     * @param {Buffer} packet - RTP packet
     * @param {Object} rinfo - Remote info
     */
    handleRTPPacket(packet, rinfo) {
        try {
            // Minimum RTP packet size (12-byte header)
            if (packet.length < 12) {
                console.warn('[RTPAudioReceiver] Packet too small:', packet.length);
                return;
            }

            // Parse RTP header (first 12 bytes)
            const version = (packet[0] >> 6) & 0x03;
            const padding = (packet[0] >> 5) & 0x01;
            const extension = (packet[0] >> 4) & 0x01;
            const csrcCount = packet[0] & 0x0F;
            const marker = (packet[1] >> 7) & 0x01;
            const payloadType = packet[1] & 0x7F;
            const sequenceNumber = packet.readUInt16BE(2);
            const timestamp = packet.readUInt32BE(4);
            const ssrc = packet.readUInt32BE(8);

            // Extract payload (skip 12-byte header + any CSRC identifiers)
            const headerSize = 12 + (csrcCount * 4);
            const payload = packet.slice(headerSize);

            // Update stats
            this.stats.packetsReceived++;
            this.stats.bytesReceived += payload.length;
            this.packetsReceived++;
            this.bytesReceived += payload.length;

            // Add to buffer
            this.audioBuffer.push(payload);
            this.bufferDuration += 20; // Each frame is 20ms

            // Update last packet time
            this.lastPacketTime = Date.now();

            // Reset silence timer
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
            }

            // Set new silence timer
            this.silenceTimer = setTimeout(() => {
                this.onSilenceDetected();
            }, this.silenceThreshold);

            // Check if buffer is full
            if (this.bufferDuration >= this.maxBufferDuration) {
                this.processBuffer('max_duration');
            }

        } catch (error) {
            console.error('[RTPAudioReceiver] Error handling packet:', {
                channelId: this.channelId,
                error: error.message
            });
            this.stats.errors++;
        }
    }

    /**
     * Handle silence detection (end of speech)
     */
    onSilenceDetected() {
        console.log('[RTPAudioReceiver] Silence detected:', {
            channelId: this.channelId,
            bufferDuration: this.bufferDuration,
            frames: this.audioBuffer.length
        });

        // Only process if we have enough audio
        if (this.bufferDuration >= this.minBufferDuration) {
            this.processBuffer('silence');
        } else {
            // Clear buffer if too short
            this.clearBuffer();
        }
    }

    /**
     * Process buffered audio and emit for transcription
     * @param {string} reason - Reason for processing ('silence', 'max_duration', 'manual')
     */
    processBuffer(reason) {
        if (this.audioBuffer.length === 0) {
            return;
        }

        console.log('[RTPAudioReceiver] Processing buffer:', {
            channelId: this.channelId,
            reason: reason,
            frames: this.audioBuffer.length,
            duration: this.bufferDuration,
            bytes: this.bytesReceived
        });

        // Concatenate all PCM frames
        const pcmAudio = Buffer.concat(this.audioBuffer);

        // Create WAV header for PCM audio (Deepgram expects WAV format)
        const wavBuffer = this.createWavBuffer(pcmAudio);

        // DEBUG: Save audio segment to file for analysis
        try {
            const debugPath = `/tmp/debug-audio-${this.channelId}-${Date.now()}.wav`;
            fs.writeFileSync(debugPath, wavBuffer);
            console.log(`[RTPAudioReceiver] 🔍 DEBUG: Saved audio segment to ${debugPath}`, {
                size: wavBuffer.length,
                duration: this.bufferDuration,
                frames: this.audioBuffer.length
            });
        } catch (err) {
            console.error('[RTPAudioReceiver] Failed to save debug audio:', err.message);
        }

        // Emit audio segment for processing
        this.emit('audio-segment', {
            audio: wavBuffer,
            pcm: pcmAudio,
            duration: this.bufferDuration,
            frames: this.audioBuffer.length,
            reason: reason,
            channelId: this.channelId,
            language: this.language,
            timestamp: Date.now()
        });

        // Update stats
        this.stats.segmentsProcessed++;

        // Clear buffer
        this.clearBuffer();
    }

    /**
     * Create WAV buffer from PCM audio
     * @param {Buffer} pcmData - PCM audio data (16-bit, 16kHz, mono)
     * @returns {Buffer} WAV buffer
     */
    createWavBuffer(pcmData) {
        const sampleRate = 16000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * bitsPerSample / 8;
        const blockAlign = numChannels * bitsPerSample / 8;
        const dataSize = pcmData.length;
        const fileSize = 36 + dataSize;

        const header = Buffer.alloc(44);

        // RIFF chunk descriptor
        header.write('RIFF', 0);
        header.writeUInt32LE(fileSize, 4);
        header.write('WAVE', 8);

        // fmt sub-chunk
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16); // fmt chunk size
        header.writeUInt16LE(1, 20); // audio format (1 = PCM)
        header.writeUInt16LE(numChannels, 22);
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(byteRate, 28);
        header.writeUInt16LE(blockAlign, 32);
        header.writeUInt16LE(bitsPerSample, 34);

        // data sub-chunk
        header.write('data', 36);
        header.writeUInt32LE(dataSize, 40);

        return Buffer.concat([header, pcmData]);
    }

    /**
     * Clear audio buffer
     */
    clearBuffer() {
        this.audioBuffer = [];
        this.bufferDuration = 0;
        this.bytesReceived = 0;
    }

    /**
     * Manually trigger buffer processing (e.g., on call end)
     */
    flush() {
        if (this.audioBuffer.length > 0) {
            this.processBuffer('manual');
        }
    }

    /**
     * Get receiver statistics
     */
    getStats() {
        return {
            ...this.stats,
            bufferFrames: this.audioBuffer.length,
            bufferDuration: this.bufferDuration,
            isListening: this.isListening
        };
    }

    /**
     * Stop listening and cleanup
     */
    async stop() {
        console.log('[RTPAudioReceiver] Stopping:', {
            channelId: this.channelId,
            stats: this.getStats()
        });

        // Clear silence timer
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }

        // Flush any remaining audio
        this.flush();

        // Close socket
        if (this.socket) {
            return new Promise((resolve) => {
                this.socket.close(() => {
                    this.isListening = false;
                    console.log('[RTPAudioReceiver] Stopped');
                    resolve();
                });
            });
        }
    }
}

module.exports = RTPAudioReceiver;
