/**
 * Asterisk ARI Handler for Real-Time Translation
 *
 * Handles incoming SIP calls via Asterisk ARI, streams audio bidirectionally,
 * processes through translation pipeline, and delivers to conference participants
 * 
 * EXTENSION 7000: Uses ARI-based ExternalMedia with AudioSocket for per-participant uplink streaming
 */

const ariClient = require('ari-client');
const { Transform } = require('stream');
const AudioPlaybackHandler = require('./audio-playback-handler');
// DISABLED: const RTPAudioReceiver = require('./rtp-audio-receiver');
const DeepgramStreamingClient = require('./deepgram-streaming-client');

class AsteriskARIHandler {
    constructor(options) {
        this.server = options;
        this.ari = null;
        this.bridges = new Map(); // roomId -> Asterisk bridge
        this.channels = new Map(); // channelId -> channel info
        this.activeRooms = new Map(); // roomId -> { participants: [], bridge: Bridge }
        this.playbackHandlers = new Map(); // channelId -> AudioPlaybackHandler
        this.audioReceivers = new Map(); // Initialize to prevent crashes even if disabled
        this.deepgramSessions = new Map(); // channelId -> DeepgramStreamingClient
        this.externalMediaChannels = new Map(); // parentChannelId -> externalMediaChannel

        // Translation services
        this.translationServices = options.translationServices || null;

        // Get configuration from environment variables or use defaults
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

            console.log('[ARI] ✓ Connected to Asterisk ARI');
            
            // Register event handlers
            this.ari.on('StasisStart', (event, channel) => this.handleStasisStart(event, channel));
            this.ari.on('StasisEnd', (event, channel) => this.handleStasisEnd(event, channel));
            this.ari.on('ChannelDtmfReceived', (event, channel) => this.handleDTMF(event, channel));
            
            // Start the Stasis application
            this.ari.start(this.config.applicationName);
            
            console.log(`[ARI] ✓ Stasis application "${this.config.applicationName}" started`);
            console.log('[ARI] 📞 Ready to accept SIP calls');
            
        } catch (error) {
            console.error('[ARI] ✗ Failed to connect to Asterisk:', error.message);
            console.error('[ARI]   Make sure Asterisk is running with ARI enabled');
            // Don't throw - allow server to run without ARI
        }
    }

    async handleStasisStart(event, channel) {
        console.log(`[ARI] 📞 Incoming call: ${channel.name} (${channel.caller.number})`);

        // Skip snoop channels - they're automatically handled
        if (channel.name.startsWith('Snoop/')) {
            console.log(`[ARI] Skipping snoop channel: ${channel.name}`);
            return;
        }

        // Skip ExternalMedia/UnicastRTP channels - they're internal bridges
        if (channel.name.startsWith('UnicastRTP/') || channel.name.startsWith('AudioSocket/')) {
            console.log(`[ARI] Skipping ExternalMedia/AudioSocket channel: ${channel.name}`);
            return;
        }

        try {
            // Extract extension/room info from channel variables or use default
            const extension = event.args[0] || 'unknown';
            const language = event.args[1] || 'en';
            const callerName = channel.caller.name || channel.caller.number || 'Anonymous';
            
            console.log(`[ARI] Extension: ${extension}, Caller: ${callerName}, Language: ${language}`);

            // ============================================================
            // EXTENSION 7000: ARI-BASED EXTERNALMEDIA WITH AUDIOSOCKET
            // ============================================================
            if (extension === '7000') {
                console.log('[ARI] 🎯 Extension 7000 detected - Using ARI ExternalMedia approach');
                
                // Answer the call
                await channel.answer();
                console.log(`[ARI] ✓ Answered call for ${callerName}`);

                // Generate unique participant ID
                const participantId = channel.id; // Use channel ID as participant ID
                const roomId = '1234'; // Shared conference room
                
                console.log(`[ARI] Participant ID: ${participantId}, Room: ${roomId}`);

                // Store channel info
                const channelInfo = {
                    channel,
                    roomId,
                    extension,
                    language,
                    callerName,
                    participantId,
                    userId: `sip-${channel.caller.number}`,
                    joinedAt: Date.now()
                };
                this.channels.set(channel.id, channelInfo);

                // Create ExternalMedia channel via ARI for uplink audio (microphone)
                await this.createExternalMediaForParticipant(channelInfo);

                // Add participant to ConfBridge for mix-minus audio playback
                const bridge = await this.getOrCreateBridge(roomId);
                await bridge.addChannel({ channel: channel.id });
                console.log(`[ARI] ✓ Added ${callerName} to ConfBridge room ${roomId}`);

                // Notify conference server
                this.notifyParticipantJoined(roomId, {
                    userId: channelInfo.userId,
                    username: callerName,
                    language,
                    transport: 'asterisk-ari-externalmedia',
                    channelId: channel.id,
                    participantId
                });

                return; // Skip default handling for extension 7000
            }

            // ============================================================
            // DEFAULT HANDLING FOR OTHER EXTENSIONS (5000, 6000, etc.)
            // ============================================================
            
            // Answer the call
            await channel.answer();
            console.log(`[ARI] ✓ Answered call: ${channel.name}`);

            // Play confirmation beep (short ring tone as confirmation)
            try {
                const playback = this.ari.Playback();
                // Use built-in ring indication for 1 second
                await channel.play({ media: 'tone:ring' }, playback);
                // Stop after 1 second
                setTimeout(() => {
                    playback.stop().catch(() => {});
                }, 1000);
                console.log(`[ARI] ✓ Playing confirmation tone`);
            } catch (toneError) {
                console.log(`[ARI] Could not play tone:`, toneError.message);
            }

            const roomId = event.args[0] || 'default-room';

            // Create audio playback handler for this channel
            const playbackHandler = new AudioPlaybackHandler(channel.id, roomId);
            this.playbackHandlers.set(channel.id, playbackHandler);

            console.log(`[ARI] ✓ Created audio playback handler for ${callerName}`);

            // Store channel info BEFORE creating receiver
            const channelInfo = {
                channel,
                roomId,
                language,
                callerName,
                userId: `sip-${channel.caller.number}`,
                joinedAt: Date.now()
            };
            this.channels.set(channel.id, channelInfo);

            // Get or create bridge for this room
            const bridge = await this.getOrCreateBridge(roomId);

            // Add channel to bridge
            await bridge.addChannel({ channel: channel.id });
            console.log(`[ARI] ✓ Added ${callerName} to conference bridge for room ${roomId}`);

            // Notify conference server about new participant
            this.notifyParticipantJoined(roomId, {
                userId: `sip-${channel.caller.number}`,
                username: callerName,
                language,
                transport: 'asterisk-ari',
                channelId: channel.id
            });

            // Update RTP destinations for all participants in the room
            await this.updateRTPDestinationsForRoom(roomId);

        } catch (error) {
            console.error(`[ARI] Error handling incoming call:`, error);
            try {
                await channel.hangup();
            } catch (e) {
                // Channel may already be hung up
            }
        }
    }

    /**
     * Create ExternalMedia channel for participant (Extension 7000)
     * Uses AudioSocket encapsulation to connect to AudioSocket orchestrator on port 5050
     */
    async createExternalMediaForParticipant(channelInfo) {
        try {
            const { participantId, callerName, channel } = channelInfo;
            
            console.log(`[ARI] Creating ExternalMedia channel for ${callerName} (${participantId})`);
            console.log(`[ARI] Target: AudioSocket orchestrator at 127.0.0.1:5050`);

            // Create ExternalMedia channel using ARI
            // POST /channels/externalMedia
            const externalMediaChannel = this.ari.Channel();
            
            await externalMediaChannel.externalMedia({
                app: this.config.applicationName,
                external_host: '127.0.0.1:5050', // AudioSocket orchestrator
                encapsulation: 'audiosocket', // Use AudioSocket protocol
                transport: 'tcp', // TCP transport
                connection_type: 'client', // Asterisk connects as client
                format: 'slin', // 8kHz PCM (matches AudioSocket orchestrator)
                direction: 'both', // Bidirectional (for future TTS playback)
                data: participantId, // Pass participant ID as UUID in AudioSocket protocol
                channelId: `externalmedia-${participantId}`
            });

            console.log(`[ARI] ✓ ExternalMedia channel created: externalmedia-${participantId}`);
            console.log(`[ARI] ✓ AudioSocket connection established to port 5050`);

            // Store ExternalMedia channel reference
            this.externalMediaChannels.set(channel.id, externalMediaChannel);
            channelInfo.externalMediaChannel = externalMediaChannel;
            channelInfo.externalMediaChannelId = externalMediaChannel.id;

            console.log(`[ARI] ✓ Per-participant uplink streaming active for ${callerName}`);

        } catch (error) {
            console.error(`[ARI] Failed to create ExternalMedia channel for ${channelInfo.callerName}:`, error);
            console.error(`[ARI] Error details:`, error.message);
            throw error;
        }
    }

    async handleStasisEnd(event, channel) {
        const channelInfo = this.channels.get(channel.id);

        if (channelInfo) {
            console.log(`[ARI] 📴 Call ended: ${channelInfo.callerName} (${channel.name})`);

            // Notify conference server
            this.notifyParticipantLeft(channelInfo.roomId, channelInfo.userId);

            // Clean up ExternalMedia channel (for extension 7000)
            if (channelInfo.externalMediaChannel) {
                try {
                    await channelInfo.externalMediaChannel.hangup();
                    this.externalMediaChannels.delete(channel.id);
                    console.log(`[ARI] ✓ Cleaned up ExternalMedia channel for ${channelInfo.callerName}`);
                } catch (e) {
                    console.log(`[ARI] ExternalMedia channel already cleaned up`);
                }
            }

            // Clean up snoop bridge
            if (channelInfo.snoopBridge) {
                try {
                    await channelInfo.snoopBridge.destroy();
                    console.log(`[ARI] ✓ Cleaned up snoop bridge for ${channelInfo.callerName}`);
                } catch (e) {
                    // Bridge may already be destroyed
                }
            }

            // Clean up playback handler
            const playbackHandler = this.playbackHandlers.get(channel.id);
            if (playbackHandler) {
                await playbackHandler.cleanup();
                this.playbackHandlers.delete(channel.id);
                console.log(`[ARI] ✓ Cleaned up playback handler for ${channelInfo.callerName}`);
            }

            // Clean up audio receiver (if enabled)
            if (this.audioReceivers) {
                const audioReceiver = this.audioReceivers.get(channel.id);
                if (audioReceiver) {
                    await audioReceiver.stop();
                    this.audioReceivers.delete(channel.id);
                    console.log(`[ARI] ✓ Cleaned up audio receiver for ${channelInfo.callerName}`);
                }
            }

            // Clean up Deepgram streaming session
            const deepgramClient = this.deepgramSessions.get(channel.id);
            if (deepgramClient) {
                try {
                    await deepgramClient.disconnect();
                    this.deepgramSessions.delete(channel.id);
                    console.log(`[ARI] ✓ Disconnected Deepgram session for ${channelInfo.callerName}`);
                } catch (error) {
                    console.error(`[ARI] Error cleaning up Deepgram session for ${channelInfo.callerName}:`, error);
                }
            }

            // Clean up channel info
            this.channels.delete(channel.id);

            // Update RTP destinations for remaining participants
            await this.updateRTPDestinationsForRoom(channelInfo.roomId);

            // Check if bridge should be destroyed
            await this.cleanupBridgeIfEmpty(channelInfo.roomId);
        }
    }

    async handleDTMF(event, channel) {
        console.log(`[ARI] DTMF received: ${event.digit} on ${channel.name}`);
        
        // Handle DTMF commands
        switch (event.digit) {
            case '*':
                // Mute/unmute
                const channelInfo = this.channels.get(channel.id);
                if (channelInfo) {
                    channelInfo.muted = !channelInfo.muted;
                    console.log(`[ARI] ${channelInfo.muted ? 'Muted' : 'Unmuted'} ${channelInfo.callerName}`);
                }
                break;
            case '#':
                // Hangup
                await channel.hangup();
                break;
        }
    }

    async getOrCreateBridge(roomId) {
        if (this.bridges.has(roomId)) {
            return this.bridges.get(roomId);
        }
        
        console.log(`[ARI] Creating new conference bridge for room: ${roomId}`);
        
        const bridge = this.ari.Bridge();
        await bridge.create({ type: 'mixing', name: `translation-${roomId}` });
        
        this.bridges.set(roomId, bridge);
        this.activeRooms.set(roomId, {
            participants: [],
            bridge,
            createdAt: Date.now()
        });
        
        return bridge;
    }

    async cleanupBridgeIfEmpty(roomId) {
        const room = this.activeRooms.get(roomId);
        if (!room) return;
        
        // Check if any channels are still in the bridge
        const channelsInRoom = Array.from(this.channels.values())
            .filter(ch => ch.roomId === roomId);
        
        if (channelsInRoom.length === 0) {
            console.log(`[ARI] Room ${roomId} is empty, destroying bridge`);
            
            try {
                await room.bridge.destroy();
            } catch (e) {
                // Bridge may already be destroyed
            }
            
            this.bridges.delete(roomId);
            this.activeRooms.delete(roomId);
        }
    }

    notifyParticipantJoined(roomId, participant) {
        if (this.server && this.server.io) {
            this.server.io.to(roomId).emit('participantJoined', participant);
            console.log(`[ARI] Notified room ${roomId} of new participant: ${participant.username}`);
        }
    }

    notifyParticipantLeft(roomId, userId) {
        if (this.server && this.server.io) {
            this.server.io.to(roomId).emit('participantLeft', { userId });
            console.log(`[ARI] Notified room ${roomId} that participant ${userId} left`);
        }
    }

    async updateRTPDestinationsForRoom(roomId) {
        // No-op for now - RTP receiver disabled
        console.log(`[ARI] RTP destination update skipped (RTP receiver disabled)`);
    }

    async playAudioToChannel(channelId, audioData, metadata) {
        const playbackHandler = this.playbackHandlers.get(channelId);
        
        if (!playbackHandler) {
            console.warn(`[ARI] No playback handler for channel ${channelId}`);
            return;
        }

        try {
            await playbackHandler.playAudio(audioData);
            console.log(`[ARI] ✓ Playing translated audio to ${metadata.speakerName}`);
        } catch (error) {
            console.error(`[ARI] Error playing audio to channel ${channelId}:`, error);
        }
    }

    getStatus() {
        return {
            connected: this.ari !== null,
            bridges: this.bridges.size,
            activeChannels: this.channels.size,
            activeRooms: this.activeRooms.size,
            externalMediaChannels: this.externalMediaChannels.size,
            rooms: Array.from(this.activeRooms.entries()).map(([roomId, room]) => ({
                roomId,
                participants: Array.from(this.channels.values())
                    .filter(ch => ch.roomId === roomId)
                    .map(ch => ({
                        userId: ch.userId,
                        username: ch.callerName,
                        language: ch.language,
                        extension: ch.extension,
                        hasExternalMedia: !!ch.externalMediaChannel
                    }))
            }))
        };
    }

    async shutdown() {
        console.log('[ARI] Shutting down ARI handler...');
        
        // Cleanup all channels
        for (const [channelId, channelInfo] of this.channels.entries()) {
            try {
                await channelInfo.channel.hangup();
            } catch (e) {
                // Channel may already be hung up
            }
        }

        // Cleanup all bridges
        for (const [roomId, bridge] of this.bridges.entries()) {
            try {
                await bridge.destroy();
            } catch (e) {
                // Bridge may already be destroyed
            }
        }

        console.log('[ARI] ✓ ARI handler shutdown complete');
    }
}

module.exports = AsteriskARIHandler;
