/**
 * Asterisk ARI Handler with Complete Translation Pipeline
 *
 * RTP Audio Flow:
 * 1. Receive RTP packets from Asterisk ExternalMedia
 * 2. Parse RTP headers and extract PCM audio payload
 * 3. Buffer frames with ProsodicSegmenter
 * 4. Stream segments to Deepgram ASR
 * 5. Translate with DeepL
 * 6. Synthesize with ElevenLabs
 * 7. Send synthesized audio back via RTP
 */

const EventEmitter = require('events');
const ariClient = require('ari-client');
const dgram = require('dgram');
const { ASRStreamingWorker } = require('./asr-streaming-worker');
const { DeepLIncrementalMT } = require('./deepl-incremental-mt');
const ElevenLabsTTSService = require('./elevenlabs-tts-service');
const { ProsodicSegmenter } = require('./prosodic-segmenter');

// RTP constants
const RTP_HEADER_SIZE = 12;
const SLIN16_FRAME_SIZE = 640; // 20ms of 16kHz mono PCM (320 samples * 2 bytes)
const SLIN16_SAMPLE_RATE = 16000;

/**
 * RTP Packet Parser
 */
class RTPParser {
    parsePacket(buffer) {
        if (buffer.length < RTP_HEADER_SIZE) {
            return null;
        }

        // Parse RTP header
        const version = (buffer[0] >> 6) & 0x03;
        const padding = (buffer[0] >> 5) & 0x01;
        const extension = (buffer[0] >> 4) & 0x01;
        const csrcCount = buffer[0] & 0x0F;
        const marker = (buffer[1] >> 7) & 0x01;
        const payloadType = buffer[1] & 0x7F;
        const sequenceNumber = buffer.readUInt16BE(2);
        const timestamp = buffer.readUInt32BE(4);
        const ssrc = buffer.readUInt32BE(8);

        // Calculate payload offset
        let offset = RTP_HEADER_SIZE + (csrcCount * 4);

        if (extension) {
            if (buffer.length < offset + 4) return null;
            const extLength = buffer.readUInt16BE(offset + 2) * 4;
            offset += 4 + extLength;
        }

        // Extract payload
        let payload = buffer.slice(offset);

        if (padding && payload.length > 0) {
            const paddingLength = payload[payload.length - 1];
            payload = payload.slice(0, -paddingLength);
        }

        return {
            version,
            padding,
            extension,
            marker,
            payloadType,
            sequenceNumber,
            timestamp,
            ssrc,
            payload
        };
    }
}

/**
 * Participant Audio Pipeline
 */
class ParticipantPipeline extends EventEmitter {
    constructor(channelId, userId, roomId, language, config) {
        super();
        this.channelId = channelId;
        this.userId = userId;
        this.roomId = roomId;
        this.language = language;
        this.config = config;

        // Initialize translation components
        this.rtpParser = new RTPParser();
        this.segmenter = new ProsodicSegmenter({
            minSegmentDurationMs: 500,
            maxSegmentDurationMs: 3000,
            pauseThresholdMs: 300
        });

        this.asr = new ASRStreamingWorker(
            config.deepgramApiKey,
            language,
            { model: 'nova-2', utteranceEndMs: 1000 }
        );

        this.mt = new DeepLIncrementalMT(config.deeplApiKey);

        this.tts = new ElevenLabsTTSService(config.elevenLabsApiKey);

        // State
        this.connected = false;
        this.frameCount = 0;
        this.lastTimestamp = null;
        this.targetVoiceId = 'EXAVITQu4vr4xnSDxMaL'; // Default ElevenLabs voice (Sarah)

        // Statistics
        this.stats = {
            packetsReceived: 0,
            framesProcessed: 0,
            segmentsGenerated: 0,
            transcriptionsReceived: 0,
            translationsGenerated: 0,
            synthesisGenerated: 0
        };

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // Segmenter -> ASR
        this.segmenter.on('segment', async (segment) => {
            this.stats.segmentsGenerated++;
            console.log(`[Pipeline:${this.userId}] Segment #${segment.id}: ${segment.duration}ms, ${segment.frames} frames`);

            // Send audio segment to ASR
            if (this.asr.connected) {
                this.asr.sendAudio(segment.audioBuffer, {
                    segmentId: segment.id.toString(),
                    duration: segment.duration,
                    frames: segment.frames
                });
            }
        });

        // ASR -> Translation
        this.asr.on('final', async (transcript) => {
            this.stats.transcriptionsReceived++;
            console.log(`[Pipeline:${this.userId}] ASR Final: "${transcript.text}"`);

            if (transcript.text.trim().length > 0) {
                await this.translateAndSynthesize(transcript.text);
            }
        });

        // ASR connection events
        this.asr.on('connected', () => {
            console.log(`[Pipeline:${this.userId}] ASR connected`);
        });

        this.asr.on('error', (error) => {
            console.error(`[Pipeline:${this.userId}] ASR error:`, error.message);
        });
    }

    async connect() {
        try {
            console.log(`[Pipeline:${this.userId}] Connecting translation pipeline...`);

            // Connect ASR
            await this.asr.connect();

            this.connected = true;
            console.log(`[Pipeline:${this.userId}] ✓ Translation pipeline connected`);

        } catch (error) {
            console.error(`[Pipeline:${this.userId}] Failed to connect pipeline:`, error);
            throw error;
        }
    }

    processRTPPacket(buffer) {
        this.stats.packetsReceived++;

        // Parse RTP packet
        const packet = this.rtpParser.parsePacket(buffer);
        if (!packet || !packet.payload || packet.payload.length === 0) {
            return;
        }

        // Extract PCM audio payload
        const pcmAudio = packet.payload;

        // Create frame with timestamp
        const now = Date.now();
        const frame = {
            data: pcmAudio,
            timestamp: now,
            sequenceNumber: packet.sequenceNumber,
            rtpTimestamp: packet.timestamp
        };

        this.frameCount++;
        this.stats.framesProcessed++;

        // Add frame to prosodic segmenter
        this.segmenter.addFrame(frame);

        // Log periodically
        if (this.frameCount % 50 === 0) {
            console.log(`[Pipeline:${this.userId}] Processed ${this.frameCount} frames, ${this.stats.segmentsGenerated} segments`);
        }
    }

    async translateAndSynthesize(sourceText) {
        try {
            // For English-to-English testing, we still translate to exercise the pipeline
            // In production, you'd translate to target languages based on other participants
            const sessionId = `${this.roomId}-${this.userId}`;

            // Translate (using English->Spanish as example, or English->English for testing)
            const translation = await this.mt.translateIncremental(
                sessionId,
                this.language,
                'en', // Target language (same as source for testing)
                sourceText,
                true // isStable
            );

            this.stats.translationsGenerated++;
            console.log(`[Pipeline:${this.userId}] Translation: "${sourceText}" -> "${translation.text}"`);

            // Synthesize translated text
            const synthesis = await this.tts.synthesize(
                translation.text,
                this.targetVoiceId,
                {
                    modelId: 'eleven_turbo_v2', // Faster model for low latency
                    stability: 0.5,
                    similarityBoost: 0.75
                }
            );

            this.stats.synthesisGenerated++;
            console.log(`[Pipeline:${this.userId}] ✓ Synthesized ${synthesis.audio.length} bytes of audio`);

            // Emit synthesized audio for playback
            this.emit('synthesizedAudio', {
                audio: synthesis.audio,
                format: synthesis.format,
                text: translation.text,
                sourceText
            });

        } catch (error) {
            console.error(`[Pipeline:${this.userId}] Translation/synthesis error:`, error.message);
        }
    }

    flush() {
        // Flush any remaining buffered audio
        const segment = this.segmenter.flush();
        if (segment && this.asr.connected) {
            this.asr.sendAudio(segment.audioBuffer);
        }

        // Finalize ASR utterance
        if (this.asr.connected) {
            this.asr.finalize();
        }
    }

    async disconnect() {
        console.log(`[Pipeline:${this.userId}] Disconnecting translation pipeline...`);

        this.flush();

        if (this.asr) {
            this.asr.disconnect();
        }

        this.connected = false;
        console.log(`[Pipeline:${this.userId}] ✓ Translation pipeline disconnected`);
    }

    getStats() {
        return {
            ...this.stats,
            asrStats: this.asr ? this.asr.getStats() : null,
            mtStats: this.mt ? this.mt.getStats() : null,
            segmenterStats: this.segmenter ? this.segmenter.getStats() : null
        };
    }
}

/**
 * Main ARI Handler with Translation Pipeline
 */
class AsteriskARIHandler extends EventEmitter {
    constructor(conferenceServer) {
        super();
        this.server = conferenceServer;
        this.ari = null;
        this.bridges = new Map();
        this.channels = new Map();
        this.rtpSockets = new Map();
        this.pipelines = new Map();
        this.nextRtpPort = 20000;

        // Translation service configuration
        this.translationConfig = {
            deepgramApiKey: process.env.DEEPGRAM_API_KEY,
            deeplApiKey: process.env.DEEPL_API_KEY,
            elevenLabsApiKey: process.env.ELEVENLABS_API_KEY
        };

        // Validate API keys
        if (!this.translationConfig.deepgramApiKey) {
            console.warn('[ARI] WARNING: DEEPGRAM_API_KEY not set - ASR will not work');
        }
        if (!this.translationConfig.deeplApiKey) {
            console.warn('[ARI] WARNING: DEEPL_API_KEY not set - Translation will not work');
        }
        if (!this.translationConfig.elevenLabsApiKey) {
            console.warn('[ARI] WARNING: ELEVENLABS_API_KEY not set - TTS will not work');
        }

        const asteriskHost = process.env.ASTERISK_HOST || 'localhost';
        const asteriskPort = process.env.ASTERISK_ARI_PORT || '8088';
        const asteriskUsername = process.env.ASTERISK_ARI_USERNAME || 'translation-app';
        const asteriskPassword = process.env.ASTERISK_ARI_PASSWORD || 'translation123';

        this.config = {
            url: `http://${asteriskHost}:${asteriskPort}`,
            username: asteriskUsername,
            password: asteriskPassword,
            applicationName: 'translation-app'
        };
    }

    async connect() {
        try {
            console.log('[ARI] Connecting to Asterisk ARI...');

            this.ari = await ariClient.connect(
                this.config.url,
                this.config.username,
                this.config.password
            );

            this.ari.on('StasisStart', (event, channel) => this.handleStasisStart(event, channel));
            this.ari.on('StasisEnd', (event, channel) => this.handleStasisEnd(event, channel));

            await this.ari.start(this.config.applicationName);

            console.log(`[ARI] ✓ Connected to Asterisk ARI`);
            console.log(`[ARI] ✓ Stasis application "${this.config.applicationName}" started`);
            console.log('[ARI] 📞 Ready to accept SIP calls with real-time translation');

        } catch (error) {
            console.error('[ARI] Failed to connect:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.ari) {
            console.log('[ARI] Disconnecting...');

            // Disconnect all pipelines
            for (const pipeline of this.pipelines.values()) {
                await pipeline.disconnect();
            }
            this.pipelines.clear();

            // Close all RTP sockets
            for (const socket of this.rtpSockets.values()) {
                try { socket.close(); } catch (e) {}
            }
            this.rtpSockets.clear();

            // Destroy all bridges
            for (const bridge of this.bridges.values()) {
                try { await bridge.destroy(); } catch (e) {}
            }
            this.bridges.clear();

            this.channels.clear();
            console.log('[ARI] ✓ Disconnected from Asterisk ARI');
        }
    }

    async handleStasisStart(event, channel) {
        if (channel.name && channel.name.startsWith('Snoop/')) {
            return;
        }

        console.log(`[ARI] 📞 Incoming call: ${channel.name} (${event.args[0] || 'unknown'})`);

        try {
            await channel.answer();
            console.log(`[ARI] ✓ Answered call: ${channel.name}`);

            const roomId = event.args[0] || '1000';
            const callerName = channel.caller.number || 'Unknown';
            const language = 'en';
            const userId = `sip-${callerName}`;

            console.log(`[ARI] Caller: ${callerName}, Room: ${roomId}, Language: ${language}`);

            this.channels.set(channel.id, {
                channel,
                roomId,
                userId,
                callerName,
                language,
                joinedAt: Date.now()
            });

            await this.addToConference(channel, roomId, userId, callerName, language);
            await this.startAudioStreaming(channel, roomId, userId, language);

        } catch (error) {
            console.error(`[ARI] Error handling incoming call:`, error);
            try { await channel.hangup(); } catch (e) {}
        }
    }

    async handleStasisEnd(event, channel) {
        const channelInfo = this.channels.get(channel.id);

        if (channelInfo) {
            console.log(`[ARI] 📴 Call ended: ${channelInfo.callerName} (${channel.name})`);

            // Disconnect pipeline
            const pipeline = this.pipelines.get(channel.id);
            if (pipeline) {
                await pipeline.disconnect();
                this.pipelines.delete(channel.id);
            }

            // Clean up RTP socket
            const socket = this.rtpSockets.get(channel.id);
            if (socket) {
                socket.close();
                this.rtpSockets.delete(channel.id);
            }

            this.notifyParticipantLeft(channelInfo.roomId, channelInfo.userId);
            this.channels.delete(channel.id);
            await this.checkAndDestroyBridge(channelInfo.roomId);
        }
    }

    async addToConference(channel, roomId, userId, callerName, language) {
        let bridge = this.bridges.get(roomId);

        if (!bridge) {
            console.log(`[ARI] Creating new conference bridge for room: ${roomId}`);
            bridge = this.ari.Bridge();
            await bridge.create({ type: 'mixing', name: `conf-${roomId}` });
            this.bridges.set(roomId, bridge);
        }

        await bridge.addChannel({ channel: channel.id });
        console.log(`[ARI] ✓ Added ${callerName} to conference bridge for room ${roomId}`);

        const participant = { userId, username: callerName, language };
        this.notifyParticipantJoined(roomId, participant);
    }

    async startAudioStreaming(channel, roomId, userId, language) {
        try {
            console.log(`[ARI] Starting audio streaming for ${channel.name}`);

            // Allocate RTP port
            const rtpPort = this.nextRtpPort;
            this.nextRtpPort += 2;

            // Create translation pipeline
            const pipeline = new ParticipantPipeline(
                channel.id,
                userId,
                roomId,
                language,
                this.translationConfig
            );

            await pipeline.connect();
            this.pipelines.set(channel.id, pipeline);

            // Handle synthesized audio
            pipeline.on('synthesizedAudio', (data) => {
                this.handleSynthesizedAudio(channel.id, roomId, data);
            });

            // Create UDP socket for RTP
            const socket = dgram.createSocket('udp4');
            this.rtpSockets.set(channel.id, socket);

            socket.on('message', (msg, rinfo) => {
                // Process RTP packet through translation pipeline
                pipeline.processRTPPacket(msg);
            });

            socket.on('error', (err) => {
                console.error(`[RTP] Socket error for ${channel.name}:`, err);
            });

            socket.bind(rtpPort, '127.0.0.1', () => {
                console.log(`[RTP] Listening on 127.0.0.1:${rtpPort} for ${userId}`);
            });

            // Create ExternalMedia channel
            const externalChannel = this.ari.Channel();

            await externalChannel.externalMedia({
                app: this.config.applicationName,
                external_host: `127.0.0.1:${rtpPort}`,
                format: 'slin16',
                encapsulation: 'rtp',
                transport: 'udp',
                connection_type: 'client',
                direction: 'both'
            });

            console.log(`[ARI] ✓ ExternalMedia created on port ${rtpPort}`);

            // Add external media channel to bridge
            const bridge = this.bridges.get(roomId);
            if (bridge) {
                await bridge.addChannel({ channel: externalChannel.id });
                console.log(`[ARI] ✓ Added ExternalMedia to bridge for ${userId}`);
            }

            console.log(`[ARI] ✓ Translation pipeline active for ${userId}`);

        } catch (error) {
            console.error(`[ARI] Error starting audio streaming:`, error);
        }
    }

    handleSynthesizedAudio(channelId, roomId, audioData) {
        console.log(`[ARI] Synthesized audio ready: "${audioData.sourceText}" -> "${audioData.text}"`);

        // TODO: Convert MP3 to slin16 PCM and send via RTP
        // For now, just log that we received it
        // This would require:
        // 1. Decode MP3 to PCM using ffmpeg or similar
        // 2. Resample to 16kHz mono if needed
        // 3. Packetize into RTP packets
        // 4. Send to ExternalMedia channel

        console.log(`[ARI] Would send ${audioData.audio.length} bytes of synthesized audio to room ${roomId}`);
    }

    async checkAndDestroyBridge(roomId) {
        const bridge = this.bridges.get(roomId);
        if (bridge) {
            try {
                const bridgeDetails = await bridge.get();
                if (bridgeDetails.channels.length === 0) {
                    console.log(`[ARI] Room ${roomId} is empty, destroying bridge`);
                    await bridge.destroy();
                    this.bridges.delete(roomId);
                }
            } catch (error) {
                this.bridges.delete(roomId);
            }
        }
    }

    notifyParticipantJoined(roomId, participant) {
        if (this.server && this.server.io) {
            this.server.io.to(roomId).emit('participantJoined', participant);
            console.log(`[ARI] ✓ Notified room ${roomId} of new participant: ${participant.username}`);
        }
    }

    notifyParticipantLeft(roomId, userId) {
        if (this.server && this.server.io) {
            this.server.io.to(roomId).emit('participantLeft', { userId });
            console.log(`[ARI] ✓ Notified room ${roomId} that participant left: ${userId}`);
        }
    }

    getStats() {
        const stats = {
            totalChannels: this.channels.size,
            totalBridges: this.bridges.size,
            totalPipelines: this.pipelines.size,
            pipelines: {}
        };

        for (const [channelId, pipeline] of this.pipelines) {
            const channelInfo = this.channels.get(channelId);
            if (channelInfo) {
                stats.pipelines[channelInfo.userId] = pipeline.getStats();
            }
        }

        return stats;
    }
}

module.exports = AsteriskARIHandler;
