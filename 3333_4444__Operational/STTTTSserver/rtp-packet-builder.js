/**
 * RTP Packet Builder for Audio Playback
 * Creates RTP packets from PCM frames for transmission via ExternalMedia
 *
 * RTP Packet Format (RFC 3550):
 * 0                   1                   2                   3
 * 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |V=2|P|X|  CC   |M|     PT      |       Sequence Number         |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                           Timestamp                           |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |           Synchronization Source (SSRC) identifier            |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                            Payload                            |
 * |                             ....                              |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 */

const dgram = require('dgram');

class RTPPacketBuilder {
    constructor(options = {}) {
        // RTP configuration
        this.payloadType = options.payloadType || 0;  // 0 = PCMU, for slin16 we use 0 or 11
        this.sampleRate = options.sampleRate || 16000; // 16kHz for slin16
        this.ssrc = options.ssrc || this.generateSSRC();

        // Sequence and timestamp tracking
        this.sequenceNumber = options.initialSequence || Math.floor(Math.random() * 65536);
        this.timestamp = options.initialTimestamp || Math.floor(Math.random() * 4294967296);

        // Frame timing
        this.samplesPerFrame = 320; // 20ms at 16kHz = 320 samples
        this.timestampIncrement = this.samplesPerFrame;

        console.log('[RTPPacketBuilder] Initialized:', {
            payloadType: this.payloadType,
            sampleRate: this.sampleRate,
            ssrc: this.ssrc.toString(16),
            initialSequence: this.sequenceNumber,
            initialTimestamp: this.timestamp
        });
    }

    /**
     * Generate a random SSRC identifier
     * @returns {number} 32-bit SSRC
     */
    generateSSRC() {
        return Math.floor(Math.random() * 0xFFFFFFFF);
    }

    /**
     * Build an RTP packet from PCM payload
     * @param {Buffer} pcmPayload - PCM audio data (640 bytes for 20ms at 16kHz)
     * @param {Object} options - Packet options
     * @returns {Buffer} Complete RTP packet
     */
    buildPacket(pcmPayload, options = {}) {
        const marker = options.marker || false;

        // RTP Header (12 bytes)
        const header = Buffer.alloc(12);

        // Byte 0: Version(2), Padding(0), Extension(0), CSRC Count(0)
        // V=2, P=0, X=0, CC=0 = 0x80
        header[0] = 0x80;

        // Byte 1: Marker(1 bit), Payload Type(7 bits)
        header[1] = (marker ? 0x80 : 0x00) | (this.payloadType & 0x7F);

        // Bytes 2-3: Sequence Number (16-bit big-endian)
        header.writeUInt16BE(this.sequenceNumber, 2);

        // Bytes 4-7: Timestamp (32-bit big-endian)
        header.writeUInt32BE(this.timestamp, 4);

        // Bytes 8-11: SSRC (32-bit big-endian)
        header.writeUInt32BE(this.ssrc, 8);

        // Concatenate header and payload
        const packet = Buffer.concat([header, pcmPayload]);

        // Increment sequence number (wrap at 65536)
        this.sequenceNumber = (this.sequenceNumber + 1) % 65536;

        // Increment timestamp
        this.timestamp = (this.timestamp + this.timestampIncrement) % 4294967296;

        return packet;
    }

    /**
     * Build RTP packets from multiple PCM frames
     * @param {Array<Buffer>} pcmFrames - Array of PCM frames
     * @returns {Array<Buffer>} Array of RTP packets
     */
    buildPackets(pcmFrames) {
        console.log('[RTPPacketBuilder] Building packets:', {
            frameCount: pcmFrames.length,
            currentSequence: this.sequenceNumber,
            currentTimestamp: this.timestamp
        });

        const packets = pcmFrames.map((frame, index) => {
            // Mark last packet
            const isLast = index === pcmFrames.length - 1;
            return this.buildPacket(frame, { marker: isLast });
        });

        console.log('[RTPPacketBuilder] Packets built:', {
            packetCount: packets.length,
            newSequence: this.sequenceNumber,
            newTimestamp: this.timestamp
        });

        return packets;
    }

    /**
     * Send RTP packets via UDP socket
     * @param {Array<Buffer>} rtpPackets - RTP packets to send
     * @param {Object} destination - { host, port }
     * @param {number} pacing - Milliseconds between packets (default: 20ms)
     * @returns {Promise<void>}
     */
    async sendPackets(rtpPackets, destination, pacing = 20) {
        const socket = dgram.createSocket('udp4');

        console.log('[RTPPacketBuilder] Sending packets:', {
            packetCount: rtpPackets.length,
            destination: `${destination.host}:${destination.port}`,
            pacingMs: pacing,
            estimatedDurationMs: rtpPackets.length * pacing
        });

        return new Promise((resolve, reject) => {
            let sentCount = 0;
            let errorOccurred = false;

            const sendNext = (index) => {
                if (index >= rtpPackets.length || errorOccurred) {
                    socket.close();

                    if (!errorOccurred) {
                        console.log('[RTPPacketBuilder] All packets sent:', {
                            totalSent: sentCount,
                            totalDurationMs: sentCount * pacing
                        });
                        resolve();
                    }
                    return;
                }

                const packet = rtpPackets[index];

                socket.send(packet, destination.port, destination.host, (err) => {
                    if (err) {
                        errorOccurred = true;
                        console.error('[RTPPacketBuilder] Send error:', {
                            packetIndex: index,
                            error: err.message
                        });
                        socket.close();
                        reject(err);
                        return;
                    }

                    sentCount++;

                    // Send next packet after pacing delay
                    setTimeout(() => sendNext(index + 1), pacing);
                });
            };

            // Start sending
            sendNext(0);
        });
    }

    /**
     * Reset sequence and timestamp (useful for new streams)
     */
    reset() {
        this.sequenceNumber = Math.floor(Math.random() * 65536);
        this.timestamp = Math.floor(Math.random() * 4294967296);

        console.log('[RTPPacketBuilder] Reset:', {
            newSequence: this.sequenceNumber,
            newTimestamp: this.timestamp
        });
    }

    /**
     * Get current RTP state
     * @returns {Object} Current sequence and timestamp
     */
    getState() {
        return {
            sequenceNumber: this.sequenceNumber,
            timestamp: this.timestamp,
            ssrc: this.ssrc
        };
    }
}

module.exports = RTPPacketBuilder;
