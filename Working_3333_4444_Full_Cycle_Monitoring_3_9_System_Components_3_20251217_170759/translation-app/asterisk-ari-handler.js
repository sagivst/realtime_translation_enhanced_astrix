/**
 * Asterisk ARI Handler for Real-Time Translation
 * 
 * Handles incoming SIP calls via Asterisk ARI, streams audio bidirectionally,
 * processes through translation pipeline, and delivers to conference participants
 */

const ariClient = require('ari-client');
const { Transform } = require('stream');

class AsteriskARIHandler {
    constructor(conferenceServer) {
        this.server = conferenceServer;
        this.ari = null;
        this.bridges = new Map(); // roomId -> Asterisk bridge
        this.channels = new Map(); // channelId -> channel info
        this.activeRooms = new Map(); // roomId -> { participants: [], bridge: Bridge }

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

        //Skip snoop channels - they're automatically handled
        if (channel.name.startsWith('Snoop/')) {
            console.log(`[ARI] Skipping snoop channel: ${channel.name}`);
            return;
        }

        try {
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

            // Extract room info from channel variables or use default
            const roomId = event.args[0] || 'default-room';
            const language = event.args[1] || 'en';
            const callerName = channel.caller.name || channel.caller.number || 'Anonymous';
            
            console.log(`[ARI] Caller: ${callerName}, Room: ${roomId}, Language: ${language}`);
            
            // Store channel info
            this.channels.set(channel.id, {
                channel,
                roomId,
                language,
                callerName,
                userId: `sip-${channel.caller.number}`,
                joinedAt: Date.now()
            });
            
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
            
            // Start snooping/recording for STT
            await this.startAudioStreaming(channel, roomId, language);
            
        } catch (error) {
            console.error(`[ARI] Error handling incoming call:`, error);
            try {
                await channel.hangup();
            } catch (e) {
                // Channel may already be hung up
            }
        }
    }

    async handleStasisEnd(event, channel) {
        const channelInfo = this.channels.get(channel.id);
        
        if (channelInfo) {
            console.log(`[ARI] 📴 Call ended: ${channelInfo.callerName} (${channel.name})`);
            
            // Notify conference server
            this.notifyParticipantLeft(channelInfo.roomId, channelInfo.userId);
            
            // Clean up
            this.channels.delete(channel.id);
            
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

    async startAudioStreaming(channel, roomId, language) {
        console.log(`[ARI] Starting audio streaming for ${channel.name}`);
        
        try {
            // Create a snoop channel to capture audio
            const snoopChannel = this.ari.Channel();
            
            const snoopId = await channel.snoopChannel({
                spy: 'in', // Capture incoming audio from caller
                whisper: 'out', // Allow sending audio to caller
                app: this.config.applicationName,
                appArgs: `snoop,${roomId},${language}`
            }, snoopChannel);
            
            console.log(`[ARI] ✓ Created snoop channel: ${snoopId}`);
            
            // Store snoop channel reference
            const channelInfo = this.channels.get(channel.id);
            if (channelInfo) {
                channelInfo.snoopChannelId = snoopId;
            }
            
            // Start external media for audio streaming
            await this.setupExternalMedia(snoopChannel, roomId, language, channel.id);
            
        } catch (error) {
            console.error(`[ARI] Error starting audio streaming:`, error);
        }
    }

    async setupExternalMedia(channel, roomId, language, parentChannelId) {
        try {
            // Use ExternalMedia to stream RTP audio to/from Node.js
            const externalMedia = await channel.externalMedia({
                app: this.config.applicationName,
                external_host: '127.0.0.1:10000', // RTP endpoint
                format: 'slin16', // 16kHz signed linear PCM
                direction: 'both'
            });
            
            console.log(`[ARI] ✓ ExternalMedia established for room ${roomId}`);
            
            // TODO: Set up RTP receiver/sender here
            // This would require additional RTP handling libraries
            // For now, we'll use a simpler approach with recordings
            
        } catch (error) {
            console.log(`[ARI] ExternalMedia not available, falling back to recording method`);
            await this.setupRecordingFallback(channel, roomId, language, parentChannelId);
        }
    }

    async setupRecordingFallback(channel, roomId, language, parentChannelId) {
        // Simpler approach: Use Asterisk's record function
        // Record to a temp file, process it, then play back translations
        
        console.log(`[ARI] Using recording-based audio capture for ${channel.name}`);
        
        // Start recording
        const liveRecording = this.ari.LiveRecording();
        const recordingName = `translation-${roomId}-${Date.now()}`;
        
        await channel.record({
            name: recordingName,
            format: 'wav',
            maxDurationSeconds: 3600, // 1 hour max
            beep: false,
            ifExists: 'overwrite'
        }, liveRecording);
        
        console.log(`[ARI] ✓ Started recording: ${recordingName}`);
    }

    notifyParticipantJoined(roomId, participant) {
        // Emit event to conference server's Socket.IO
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

    async playAudioToChannel(channelId, audioBuffer) {
        const channelInfo = this.channels.get(channelId);
        if (!channelInfo) {
            console.warn(`[ARI] Channel ${channelId} not found for audio playback`);
            return;
        }
        
        try {
            // Save audio buffer to temp file
            const tempFile = `/tmp/translation-${Date.now()}.wav`;
            require('fs').writeFileSync(tempFile, audioBuffer);
            
            // Play the file to the channel
            const playback = this.ari.Playback();
            await channelInfo.channel.play({ media: `sound:${tempFile}` }, playback);
            
            console.log(`[ARI] ✓ Playing translated audio to ${channelInfo.callerName}`);
            
        } catch (error) {
            console.error(`[ARI] Error playing audio:`, error);
        }
    }

    disconnect() {
        if (this.ari) {
            console.log('[ARI] Disconnecting from Asterisk...');
            // Clean up all bridges
            for (const [roomId, room] of this.activeRooms) {
                room.bridge.destroy().catch(() => {});
            }
            this.ari = null;
        }
    }
}

module.exports = AsteriskARIHandler;
