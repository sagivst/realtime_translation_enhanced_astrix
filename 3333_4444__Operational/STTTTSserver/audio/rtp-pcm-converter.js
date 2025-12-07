/**
 * RTP to PCM Audio Converter
 * Handles conversion of RTP audio packets to PCM for web streaming
 * Supports multiple audio codecs (OPUS, G.711, etc.)
 */

const dgram = require('dgram');
const { EventEmitter } = require('events');

class RTPtoPCMConverter extends EventEmitter {
    constructor(port, codec = 'OPUS') {
        super();
        this.port = port;
        this.codec = codec;
        this.socket = null;
        this.sequenceNumber = 0;
        this.timestamp = 0;
        this.ssrc = Math.floor(Math.random() * 0xFFFFFFFF);
        this.isRunning = false;

        // Audio format configuration
        this.config = {
            sampleRate: 48000,
            channels: 1,
            bitDepth: 16,
            frameSize: 960 // 20ms at 48kHz
        };

        // Statistics
        this.stats = {
            packetsReceived: 0,
            packetsLost: 0,
            bytesReceived: 0,
            lastSequence: -1,
            jitter: 0,
            latency: 0
        };

        // Buffer management
        this.jitterBuffer = [];
        this.maxJitterBufferSize = 10;
    }

    /**
     * Start listening for RTP packets
     */
    start() {
        return new Promise((resolve, reject) => {
            this.socket = dgram.createSocket('udp4');

            this.socket.on('error', (err) => {
                console.error(`RTP Socket Error on port ${this.port}:`, err);
                this.emit('error', err);
                reject(err);
            });

            this.socket.on('message', (msg, rinfo) => {
                this.handleRTPPacket(msg, rinfo);
            });

            this.socket.bind(this.port, () => {
                this.isRunning = true;
                console.log(`RTP to PCM Converter listening on UDP port ${this.port}`);
                this.emit('started', { port: this.port, codec: this.codec });
                resolve();
            });
        });
    }

    /**
     * Stop the RTP listener
     */
    stop() {
        if (this.socket) {
            this.isRunning = false;
            this.socket.close();
            this.socket = null;
            this.emit('stopped');
            console.log(`RTP to PCM Converter stopped on port ${this.port}`);
        }
    }

    /**
     * Handle incoming RTP packet
     */
    handleRTPPacket(buffer, rinfo) {
        try {
            // Parse RTP header (minimum 12 bytes)
            if (buffer.length < 12) {
                console.warn('RTP packet too small, ignoring');
                return;
            }

            const rtpHeader = this.parseRTPHeader(buffer);
            const payload = buffer.slice(rtpHeader.headerLength);

            // Update statistics
            this.updateStats(rtpHeader);

            // Detect packet loss
            if (this.stats.lastSequence !== -1) {
                const expectedSeq = (this.stats.lastSequence + 1) & 0xFFFF;
                if (rtpHeader.sequence !== expectedSeq) {
                    const lost = (rtpHeader.sequence - expectedSeq) & 0xFFFF;
                    this.stats.packetsLost += lost;
                    this.emit('packet-loss', { expected: expectedSeq, received: rtpHeader.sequence, lost });
                }
            }
            this.stats.lastSequence = rtpHeader.sequence;

            // Convert payload to PCM based on codec
            const pcmData = this.convertToPCM(payload, rtpHeader);

            if (pcmData) {
                // Add to jitter buffer
                this.jitterBuffer.push({
                    sequence: rtpHeader.sequence,
                    timestamp: rtpHeader.timestamp,
                    data: pcmData,
                    receivedAt: Date.now()
                });

                // Limit jitter buffer size
                if (this.jitterBuffer.length > this.maxJitterBufferSize) {
                    this.jitterBuffer.shift();
                }

                // Emit PCM audio data
                this.emit('pcm-data', {
                    data: pcmData,
                    sequence: rtpHeader.sequence,
                    timestamp: rtpHeader.timestamp,
                    sampleRate: this.config.sampleRate,
                    channels: this.config.channels,
                    bitDepth: this.config.bitDepth
                });
            }

        } catch (error) {
            console.error('Error processing RTP packet:', error);
            this.emit('error', error);
        }
    }

    /**
     * Parse RTP header
     */
    parseRTPHeader(buffer) {
        const version = (buffer[0] >> 6) & 0x03;
        const padding = (buffer[0] >> 5) & 0x01;
        const extension = (buffer[0] >> 4) & 0x01;
        const csrcCount = buffer[0] & 0x0F;
        const marker = (buffer[1] >> 7) & 0x01;
        const payloadType = buffer[1] & 0x7F;
        const sequence = buffer.readUInt16BE(2);
        const timestamp = buffer.readUInt32BE(4);
        const ssrc = buffer.readUInt32BE(8);

        let headerLength = 12 + (csrcCount * 4);

        return {
            version,
            padding,
            extension,
            csrcCount,
            marker,
            payloadType,
            sequence,
            timestamp,
            ssrc,
            headerLength
        };
    }

    /**
     * Convert codec-specific payload to PCM
     */
    convertToPCM(payload, header) {
        switch (this.codec) {
            case 'OPUS':
                return this.decodeOPUS(payload);
            case 'G711_ULAW':
                return this.decodeG711uLaw(payload);
            case 'G711_ALAW':
                return this.decodeG711aLaw(payload);
            case 'PCM':
            case 'L16':
                return payload; // Already PCM
            default:
                console.warn(`Unsupported codec: ${this.codec}, passing through`);
                return payload;
        }
    }

    /**
     * Decode OPUS (simplified - in production use opus library)
     * This is a placeholder that returns the payload as-is
     * In production, use node-opus or similar library
     */
    decodeOPUS(payload) {
        // For now, we'll emit raw OPUS and let the client decode it
        // or return a placeholder PCM buffer
        console.warn('OPUS decoding not implemented, returning raw payload');
        return payload;
    }

    /**
     * Decode G.711 μ-law
     */
    decodeG711uLaw(payload) {
        const pcm = Buffer.alloc(payload.length * 2);

        for (let i = 0; i < payload.length; i++) {
            const ulawByte = payload[i];
            const sample = this.ulawToPCM(ulawByte);
            pcm.writeInt16LE(sample, i * 2);
        }

        return pcm;
    }

    /**
     * Decode G.711 A-law
     */
    decodeG711aLaw(payload) {
        const pcm = Buffer.alloc(payload.length * 2);

        for (let i = 0; i < payload.length; i++) {
            const alawByte = payload[i];
            const sample = this.alawToPCM(alawByte);
            pcm.writeInt16LE(sample, i * 2);
        }

        return pcm;
    }

    /**
     * μ-law to PCM conversion
     */
    ulawToPCM(ulaw) {
        const BIAS = 0x84;
        ulaw = ~ulaw;
        const sign = (ulaw & 0x80);
        const exponent = (ulaw >> 4) & 0x07;
        const mantissa = ulaw & 0x0F;
        let sample = ((mantissa << 3) + BIAS) << exponent;
        if (sign) sample = -sample;
        return sample;
    }

    /**
     * A-law to PCM conversion
     */
    alawToPCM(alaw) {
        alaw ^= 0x55;
        const sign = (alaw & 0x80);
        const exponent = (alaw >> 4) & 0x07;
        const mantissa = alaw & 0x0F;
        let sample;

        if (exponent === 0) {
            sample = (mantissa << 4) + 8;
        } else {
            sample = ((mantissa << 4) + 0x108) << (exponent - 1);
        }

        if (sign) sample = -sample;
        return sample;
    }

    /**
     * Update statistics
     */
    updateStats(rtpHeader) {
        this.stats.packetsReceived++;
        this.stats.bytesReceived += rtpHeader.headerLength;

        // Calculate jitter (simplified)
        const now = Date.now();
        if (this.lastPacketTime) {
            const transit = now - this.lastPacketTime;
            const d = Math.abs(transit - this.lastTransit);
            this.stats.jitter += (d - this.stats.jitter) / 16;
        }
        this.lastPacketTime = now;
        this.lastTransit = now - this.lastPacketTime;
    }

    /**
     * Get current statistics
     */
    getStats() {
        return {
            ...this.stats,
            bufferSize: this.jitterBuffer.length,
            isRunning: this.isRunning,
            port: this.port,
            codec: this.codec,
            config: this.config
        };
    }

    /**
     * Get jitter buffer contents
     */
    getJitterBuffer() {
        return this.jitterBuffer.slice();
    }

    /**
     * Clear jitter buffer
     */
    clearJitterBuffer() {
        this.jitterBuffer = [];
    }

    /**
     * Set codec
     */
    setCodec(codec) {
        this.codec = codec;
        console.log(`Codec changed to: ${codec}`);
        this.emit('codec-changed', codec);
    }

    /**
     * Configure audio parameters
     */
    configure(config) {
        this.config = { ...this.config, ...config };
        console.log('Audio configuration updated:', this.config);
        this.emit('config-changed', this.config);
    }
}

module.exports = RTPtoPCMConverter;
