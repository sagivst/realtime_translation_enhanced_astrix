/**
 * RTP Audio Receiver with G.711 µ-law decoder
 */

const dgram = require('dgram');
const { EventEmitter } = require('events');
const fs = require('fs');

// G.711 µ-law to PCM16 decoding table
const MULAW_TO_PCM = (() => {
    const table = new Int16Array(256);
    for (let i = 0; i < 256; i++) {
        const sign = (i & 0x80) ? -1 : 1;
        const exponent = (i >> 4) & 0x07;
        const mantissa = i & 0x0F;
        const step = 4 << (exponent + 1);
        const value = step * mantissa + step / 2 - 4 * 33;
        table[i] = sign * value;
    }
    return table;
})();

class RTPAudioReceiver extends EventEmitter {
    constructor(options = {}) {
        super();
        this.channelId = options.channelId;
        this.language = options.language || 'en';
        this.port = options.port || 10000;
        this.audioBuffer = [];
        this.bufferDuration = 0;
        this.maxBufferDuration = options.maxBufferDuration || 3000;
        this.minBufferDuration = options.minBufferDuration || 500;
        this.silenceThreshold = options.silenceThreshold || 500;
        this.lastPacketTime = Date.now();
        this.silenceTimer = null;
        this.socket = null;
        this.isListening = false;
        this.packetsReceived = 0;
        this.bytesReceived = 0;
        this.stats = {
            packetsReceived: 0,
            bytesReceived: 0,
            segmentsProcessed: 0,
            errors: 0
        };
        console.log('[RTPAudioReceiver] Initialized with µ-law decoder');
    }

    /**
     * Decode G.711 µ-law to PCM16
     */
    decodeMulaw(mulawData) {
        const pcmData = Buffer.alloc(mulawData.length * 2);
        for (let i = 0; i < mulawData.length; i++) {
            pcmData.writeInt16LE(MULAW_TO_PCM[mulawData[i]], i * 2);
        }
        return pcmData;
    }

    /**
     * Resample 8kHz PCM16 to 16kHz PCM16 (simple linear interpolation)
     */
    resample8to16(pcm8k) {
        const samples8k = pcm8k.length / 2;
        const pcm16k = Buffer.alloc(samples8k * 2 * 2); // Double the samples

        for (let i = 0; i < samples8k - 1; i++) {
            const sample1 = pcm8k.readInt16LE(i * 2);
            const sample2 = pcm8k.readInt16LE((i + 1) * 2);
            
            // Original sample
            pcm16k.writeInt16LE(sample1, i * 4);
            // Interpolated sample
            pcm16k.writeInt16LE(Math.floor((sample1 + sample2) / 2), i * 4 + 2);
        }
        
        // Last sample
        pcm16k.writeInt16LE(pcm8k.readInt16LE((samples8k - 1) * 2), (samples8k - 1) * 4);
        pcm16k.writeInt16LE(pcm8k.readInt16LE((samples8k - 1) * 2), (samples8k - 1) * 4 + 2);
        
        return pcm16k;
    }

    async start() {
        if (this.isListening) {
            console.warn('[RTPAudioReceiver] Already listening');
            return;
        }

        return new Promise((resolve, reject) => {
            this.socket = dgram.createSocket('udp4');

            this.socket.on('error', (err) => {
                console.error('[RTPAudioReceiver] Socket error:', err.message);
                this.stats.errors++;
                this.emit('error', err);
            });

            this.socket.on('message', (msg, rinfo) => {
                this.handleRTPPacket(msg, rinfo);
            });

            this.socket.on('listening', () => {
                const address = this.socket.address();
                console.log();
                this.isListening = true;
                resolve();
            });

            this.socket.bind(this.port);
        });
    }

    handleRTPPacket(packet, rinfo) {
        try {
            if (packet.length < 12) {
                return;
            }

            // Parse RTP header
            const csrcCount = packet[0] & 0x0F;
            const payloadType = packet[1] & 0x7F;
            const sequenceNumber = packet.readUInt16BE(2);
            const timestamp = packet.readUInt32BE(4);

            // Extract payload
            const headerSize = 12 + (csrcCount * 4);
            const payload = packet.slice(headerSize);

            // Decode µ-law to PCM16 (8kHz)
            let pcm16Data = this.decodeMulaw(payload);
            
            // Resample 8kHz → 16kHz
            pcm16Data = this.resample8to16(pcm16Data);

            // Update stats
            this.stats.packetsReceived++;
            this.stats.bytesReceived += pcm16Data.length;
            this.packetsReceived++;
            this.bytesReceived += pcm16Data.length;

            // DEBUG: Save decoded frame
            if (this.packetsReceived % 50 === 0) {
                try {
                    const debugPath = ;
                    const wavBuffer = this.createWavBuffer(pcm16Data);
                    fs.writeFileSync(debugPath, wavBuffer);
                    console.log(, {
                        mulawBytes: payload.length,
                        pcm16Bytes: pcm16Data.length,
                        wavSize: wavBuffer.length
                    });
                } catch (err) {
                    console.error('[RTPAudioReceiver] Debug save error:', err.message);
                }
            }

            // Emit PCM frame for streaming
            this.emit('pcm-frame', {
                pcm: pcm16Data,
                sequenceNumber: sequenceNumber,
                timestamp: timestamp,
                channelId: this.channelId,
                language: this.language
            });

            // Buffer for batch processing
            this.audioBuffer.push(pcm16Data);
            this.bufferDuration += 20;
            this.lastPacketTime = Date.now();

            // Reset silence timer
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
            }

            this.silenceTimer = setTimeout(() => {
                this.onSilenceDetected();
            }, this.silenceThreshold);

            // Check if buffer is full
            if (this.bufferDuration >= this.maxBufferDuration) {
                this.processBuffer('max_duration');
            }

        } catch (error) {
            console.error('[RTPAudioReceiver] Packet error:', error.message);
            this.stats.errors++;
        }
    }

    onSilenceDetected() {
        if (this.bufferDuration >= this.minBufferDuration) {
            this.processBuffer('silence');
        } else {
            this.clearBuffer();
        }
    }

    processBuffer(reason) {
        if (this.audioBuffer.length === 0) {
            return;
        }

        console.log('[RTPAudioReceiver] Processing buffer:', {
            channelId: this.channelId,
            reason: reason,
            frames: this.audioBuffer.length,
            duration: this.bufferDuration
        });

        const pcmAudio = Buffer.concat(this.audioBuffer);
        const wavBuffer = this.createWavBuffer(pcmAudio);

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

        this.stats.segmentsProcessed++;
        this.clearBuffer();
    }

    createWavBuffer(pcmData) {
        const sampleRate = 16000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * bitsPerSample / 8;
        const blockAlign = numChannels * bitsPerSample / 2;
        const dataSize = pcmData.length;
        const fileSize = 36 + dataSize;

        const header = Buffer.alloc(44);
        header.write('RIFF', 0);
        header.writeUInt32LE(fileSize, 4);
        header.write('WAVE', 8);
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20);
        header.writeUInt16LE(numChannels, 22);
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(byteRate, 28);
        header.writeUInt16LE(blockAlign, 32);
        header.writeUInt16LE(bitsPerSample, 34);
        header.write('data', 36);
        header.writeUInt32LE(dataSize, 40);

        return Buffer.concat([header, pcmData]);
    }

    clearBuffer() {
        this.audioBuffer = [];
        this.bufferDuration = 0;
        this.bytesReceived = 0;
    }

    flush() {
        if (this.audioBuffer.length > 0) {
            this.processBuffer('manual');
        }
    }

    getStats() {
        return {
            ...this.stats,
            bufferFrames: this.audioBuffer.length,
            bufferDuration: this.bufferDuration,
            isListening: this.isListening
        };
    }

    async stop() {
        console.log('[RTPAudioReceiver] Stopping');

        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }

        this.flush();

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
