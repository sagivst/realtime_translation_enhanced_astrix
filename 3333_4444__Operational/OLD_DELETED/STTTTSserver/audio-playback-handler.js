/**
 * Audio Playback Handler
 * Handles conversion and playback of synthesized audio back to conference participants
 *
 * Integration: Connects to ParticipantPipeline and handles TTS output playback
 */

const AudioConverter = require('./audio-converter');
const RTPPacketBuilder = require('./rtp-packet-builder');
const { EventEmitter } = require('events');

class AudioPlaybackHandler extends EventEmitter {
    constructor(channelId, roomId, rtpDestinations = []) {
        super();

        this.channelId = channelId;
        this.roomId = roomId;
        this.rtpDestinations = rtpDestinations; // Array of {host, port} for other participants

        // Initialize audio processing
        this.audioConverter = new AudioConverter();
        this.rtpBuilder = new RTPPacketBuilder({
            payloadType: 0,  // Use 0 for compatibility
            sampleRate: 16000
        });

        // Playback queue
        this.playbackQueue = [];
        this.isPlaying = false;

        console.log('[AudioPlaybackHandler] Initialized:', {
            channelId: this.channelId,
            roomId: this.roomId,
            destinationCount: this.rtpDestinations.length
        });
    }

    /**
     * Handle synthesized audio from TTS
     * @param {Buffer} mp3Buffer - MP3 audio from ElevenLabs
     * @param {Object} metadata - Translation metadata (text, language, etc.)
     */
    async handleSynthesizedAudio(mp3Buffer, metadata = {}) {
        const playbackStart = Date.now();

        console.log('[AudioPlaybackHandler] Handling synthesized audio:', {
            channelId: this.channelId,
            mp3Size: mp3Buffer.length,
            sourceText: metadata.sourceText,
            translatedText: metadata.translatedText,
            targetLanguage: metadata.targetLanguage
        });

        try {
            // Step 1: Convert MP3 to PCM
            console.log('[AudioPlaybackHandler] Step 1: Converting MP3 to PCM...');
            const conversionStart = Date.now();
            const pcmFrames = await this.audioConverter.convertAndSplit(mp3Buffer);
            const conversionEnd = Date.now();

            console.log('[AudioPlaybackHandler] Conversion complete:', {
                frameCount: pcmFrames.length,
                duration: conversionEnd - conversionStart,
                estimatedAudioDurationMs: pcmFrames.length * 20
            });

            // Step 2: Build RTP packets
            console.log('[AudioPlaybackHandler] Step 2: Building RTP packets...');
            const rtpStart = Date.now();
            const rtpPackets = this.rtpBuilder.buildPackets(pcmFrames);
            const rtpEnd = Date.now();

            console.log('[AudioPlaybackHandler] RTP packets built:', {
                packetCount: rtpPackets.length,
                duration: rtpEnd - rtpStart
            });

            // Step 3: Queue playback item
            const playbackItem = {
                rtpPackets: rtpPackets,
                metadata: metadata,
                createdAt: Date.now()
            };

            this.playbackQueue.push(playbackItem);

            console.log('[AudioPlaybackHandler] Queued for playback:', {
                queueLength: this.playbackQueue.length,
                packetCount: rtpPackets.length
            });

            // Step 4: Start playback if not already playing
            if (!this.isPlaying) {
                await this.processPlaybackQueue();
            }

            const playbackEnd = Date.now();

            // Emit playback event
            this.emit('audio-prepared', {
                channelId: this.channelId,
                packetCount: rtpPackets.length,
                totalDuration: playbackEnd - playbackStart
            });

            console.log('[AudioPlaybackHandler] Audio prepared for playback:', {
                totalDuration: playbackEnd - playbackStart,
                conversionTime: conversionEnd - conversionStart,
                rtpBuildTime: rtpEnd - rtpStart
            });

        } catch (error) {
            console.error('[AudioPlaybackHandler] Error handling synthesized audio:', {
                channelId: this.channelId,
                error: error.message,
                stack: error.stack
            });

            this.emit('playback-error', {
                channelId: this.channelId,
                error: error.message
            });
        }
    }

    /**
     * Process the playback queue
     */
    async processPlaybackQueue() {
        if (this.isPlaying || this.playbackQueue.length === 0) {
            return;
        }

        this.isPlaying = true;

        while (this.playbackQueue.length > 0) {
            const playbackItem = this.playbackQueue.shift();

            console.log('[AudioPlaybackHandler] Playing next item:', {
                queueRemaining: this.playbackQueue.length,
                packetCount: playbackItem.rtpPackets.length
            });

            try {
                await this.sendToParticipants(playbackItem.rtpPackets, playbackItem.metadata);

                this.emit('playback-complete', {
                    channelId: this.channelId,
                    metadata: playbackItem.metadata
                });

            } catch (error) {
                console.error('[AudioPlaybackHandler] Playback error:', {
                    error: error.message
                });

                this.emit('playback-error', {
                    channelId: this.channelId,
                    error: error.message
                });
            }
        }

        this.isPlaying = false;
    }

    /**
     * Send RTP packets to all participants
     * @param {Array<Buffer>} rtpPackets - RTP packets to send
     * @param {Object} metadata - Playback metadata
     */
    async sendToParticipants(rtpPackets, metadata) {
        if (this.rtpDestinations.length === 0) {
            console.warn('[AudioPlaybackHandler] No RTP destinations configured');
            return;
        }

        const sendStart = Date.now();

        console.log('[AudioPlaybackHandler] Sending to participants:', {
            destinationCount: this.rtpDestinations.length,
            packetCount: rtpPackets.length,
            estimatedDurationMs: rtpPackets.length * 20
        });

        // Send to each destination
        const sendPromises = this.rtpDestinations.map(async (destination) => {
            try {
                console.log('[AudioPlaybackHandler] Sending to:', destination);

                await this.rtpBuilder.sendPackets(rtpPackets, destination, 20); // 20ms pacing

                console.log('[AudioPlaybackHandler] Sent successfully to:', destination);

            } catch (error) {
                console.error('[AudioPlaybackHandler] Failed to send to destination:', {
                    destination: destination,
                    error: error.message
                });
            }
        });

        // Wait for all sends to complete
        await Promise.all(sendPromises);

        const sendEnd = Date.now();

        console.log('[AudioPlaybackHandler] All participants received audio:', {
            destinationCount: this.rtpDestinations.length,
            totalDuration: sendEnd - sendStart
        });
    }

    /**
     * Update RTP destinations (other participants in conference)
     * @param {Array<Object>} destinations - Array of {host, port}
     */
    updateDestinations(destinations) {
        this.rtpDestinations = destinations;

        console.log('[AudioPlaybackHandler] Destinations updated:', {
            destinationCount: this.rtpDestinations.length,
            destinations: this.rtpDestinations
        });
    }

    /**
     * Add a destination
     * @param {Object} destination - {host, port}
     */
    addDestination(destination) {
        this.rtpDestinations.push(destination);

        console.log('[AudioPlaybackHandler] Destination added:', {
            destination: destination,
            totalDestinations: this.rtpDestinations.length
        });
    }

    /**
     * Remove a destination
     * @param {string} host - Host to remove
     * @param {number} port - Port to remove
     */
    removeDestination(host, port) {
        this.rtpDestinations = this.rtpDestinations.filter(
            d => !(d.host === host && d.port === port)
        );

        console.log('[AudioPlaybackHandler] Destination removed:', {
            host: host,
            port: port,
            remainingDestinations: this.rtpDestinations.length
        });
    }

    /**
     * Clear the playback queue
     */
    clearQueue() {
        const queuedItems = this.playbackQueue.length;
        this.playbackQueue = [];

        console.log('[AudioPlaybackHandler] Queue cleared:', {
            clearedItems: queuedItems
        });
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('[AudioPlaybackHandler] Cleaning up:', {
            channelId: this.channelId,
            queuedItems: this.playbackQueue.length
        });

        this.clearQueue();
        this.isPlaying = false;
        this.rtpDestinations = [];

        this.emit('cleanup-complete', {
            channelId: this.channelId
        });
    }
}

module.exports = AudioPlaybackHandler;
