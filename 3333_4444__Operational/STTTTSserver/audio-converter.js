/**
 * Audio Converter Module
 * Converts MP3 audio to PCM (slin16 format) for RTP transmission
 *
 * Input: MP3 buffer from ElevenLabs TTS
 * Output: PCM buffer (16kHz, mono, signed 16-bit little-endian)
 */

const ffmpeg = require('fluent-ffmpeg');
const { Readable } = require('stream');
const { EventEmitter } = require('events');

class AudioConverter extends EventEmitter {
    constructor() {
        super();

        // Audio format specifications for Asterisk slin16
        this.targetFormat = {
            sampleRate: 16000,      // 16kHz
            channels: 1,            // Mono
            bitDepth: 16,           // 16-bit
            codec: 'pcm_s16le',     // Signed 16-bit little-endian
            format: 's16le'         // Raw PCM format
        };
    }

    /**
     * Convert MP3 buffer to PCM buffer
     * @param {Buffer} mp3Buffer - MP3 audio data from TTS
     * @returns {Promise<Buffer>} PCM audio buffer
     */
    async convertMp3ToPcm(mp3Buffer) {
        const conversionStart = Date.now();

        console.log('[AudioConverter] Starting MP3 to PCM conversion:', {
            inputSize: mp3Buffer.length,
            targetSampleRate: this.targetFormat.sampleRate,
            targetChannels: this.targetFormat.channels,
            targetCodec: this.targetFormat.codec
        });

        return new Promise((resolve, reject) => {
            const chunks = [];
            let totalSize = 0;

            // Create readable stream from MP3 buffer
            const inputStream = new Readable();
            inputStream.push(mp3Buffer);
            inputStream.push(null); // End of stream

            // Configure ffmpeg conversion
            const command = ffmpeg(inputStream)
                .inputFormat('mp3')
                .audioFrequency(this.targetFormat.sampleRate)
                .audioChannels(this.targetFormat.channels)
                .audioCodec(this.targetFormat.codec)
                .format(this.targetFormat.format)
                .on('start', (commandLine) => {
                    console.log('[AudioConverter] ffmpeg command:', commandLine);
                })
                .on('error', (err) => {
                    const conversionEnd = Date.now();
                    console.error('[AudioConverter] Conversion error:', {
                        error: err.message,
                        duration: conversionEnd - conversionStart
                    });
                    reject(err);
                })
                .on('end', () => {
                    const conversionEnd = Date.now();
                    const pcmBuffer = Buffer.concat(chunks, totalSize);

                    console.log('[AudioConverter] Conversion complete:', {
                        inputSize: mp3Buffer.length,
                        outputSize: pcmBuffer.length,
                        duration: conversionEnd - conversionStart,
                        sampleCount: pcmBuffer.length / 2, // 16-bit = 2 bytes per sample
                        audioDurationMs: (pcmBuffer.length / 2 / this.targetFormat.sampleRate) * 1000
                    });

                    resolve(pcmBuffer);
                });

            // Collect output chunks
            const stream = command.pipe();
            stream.on('data', (chunk) => {
                chunks.push(chunk);
                totalSize += chunk.length;
            });
        });
    }

    /**
     * Get audio duration in milliseconds from PCM buffer
     * @param {Buffer} pcmBuffer - PCM audio data
     * @returns {number} Duration in milliseconds
     */
    getDuration(pcmBuffer) {
        const sampleCount = pcmBuffer.length / 2; // 16-bit = 2 bytes per sample
        return (sampleCount / this.targetFormat.sampleRate) * 1000;
    }

    /**
     * Split PCM buffer into frames for RTP packetization
     * Each frame is 20ms of audio (320 bytes = 160 samples at 16kHz)
     * @param {Buffer} pcmBuffer - PCM audio data
     * @returns {Array<Buffer>} Array of 20ms frames
     */
    splitIntoFrames(pcmBuffer) {
        const FRAME_SIZE_MS = 20;
        const SAMPLES_PER_FRAME = (this.targetFormat.sampleRate / 1000) * FRAME_SIZE_MS; // 320 samples
        const BYTES_PER_FRAME = SAMPLES_PER_FRAME * 2; // 640 bytes

        const frames = [];
        let offset = 0;

        while (offset < pcmBuffer.length) {
            const remainingBytes = pcmBuffer.length - offset;
            const frameSize = Math.min(BYTES_PER_FRAME, remainingBytes);

            const frame = Buffer.alloc(BYTES_PER_FRAME);

            // Copy data
            pcmBuffer.copy(frame, 0, offset, offset + frameSize);

            // Pad with silence if last frame is incomplete
            if (frameSize < BYTES_PER_FRAME) {
                frame.fill(0, frameSize);
            }

            frames.push(frame);
            offset += frameSize;
        }

        console.log('[AudioConverter] Split into frames:', {
            totalBytes: pcmBuffer.length,
            frameCount: frames.length,
            frameSizeBytes: BYTES_PER_FRAME,
            frameSizeMs: FRAME_SIZE_MS,
            totalDurationMs: frames.length * FRAME_SIZE_MS
        });

        return frames;
    }

    /**
     * Convert and split MP3 into ready-to-transmit frames
     * @param {Buffer} mp3Buffer - MP3 audio from TTS
     * @returns {Promise<Array<Buffer>>} Array of PCM frames (20ms each)
     */
    async convertAndSplit(mp3Buffer) {
        const pcmBuffer = await this.convertMp3ToPcm(mp3Buffer);
        return this.splitIntoFrames(pcmBuffer);
    }
}

module.exports = AudioConverter;
