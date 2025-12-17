/**
 * ConfBridge Mix-Minus Manager
 *
 * Manages multi-participant conferences with per-participant mix-minus audio:
 * - Each participant hears everyone except themselves (no echo)
 * - Real-time translation for each participant
 * - Integration with Translation Orchestrator
 * - Asterisk ConfBridge integration via ARI
 *
 * Based on HAsterisk_HumeEVI_Spec.md specifications
 */

const { EventEmitter } = require('events');
const { OrchestratorManager } = require('./translation-orchestrator');

/**
 * Conference Participant
 */
class ConferenceParticipant {
    constructor(id, name, language, channel) {
        this.id = id;
        this.name = name;
        this.language = language;
        this.channel = channel;  // Asterisk ARI channel
        this.orchestrator = null;  // Translation orchestrator
        this.mixMinusStream = null;  // Audio stream for this participant
        this.joinedAt = Date.now();
        this.speaking = false;
    }
}

/**
 * Conference Room with Mix-Minus Audio
 */
class ConferenceRoom extends EventEmitter {
    constructor(roomId, conferenceId, ariClient) {
        super();

        this.roomId = roomId;
        this.conferenceId = conferenceId;  // ConfBridge ID
        this.ariClient = ariClient;

        // Participants: Map<participantId, ConferenceParticipant>
        this.participants = new Map();

        // Mix-minus audio streams: Map<participantId, AudioStream>
        this.mixMinusStreams = new Map();

        // Active speaker tracking
        this.activeSpeaker = null;
        this.lastSpeakerChange = Date.now();

        // Conference state
        this.createdAt = Date.now();
        this.locked = false;

        console.log(`[ConfBridge:${this.roomId}] Conference room created`);
    }

    /**
     * Add participant to conference
     */
    async addParticipant(participantId, name, language, channel) {
        if (this.participants.has(participantId)) {
            throw new Error(`Participant ${participantId} already in conference`);
        }

        const participant = new ConferenceParticipant(
            participantId,
            name,
            language,
            channel
        );

        this.participants.set(participantId, participant);

        console.log(`[ConfBridge:${this.roomId}] Added ${name} (${language})`);
        console.log(`  Total participants: ${this.participants.size}`);

        // Emit participant joined event
        this.emit('participantJoined', {
            roomId: this.roomId,
            participant: {
                id: participant.id,
                name: participant.name,
                language: participant.language
            },
            participantCount: this.participants.size
        });

        // Setup mix-minus for this participant
        await this.setupMixMinusForParticipant(participantId);

        return participant;
    }

    /**
     * Setup mix-minus audio stream for participant
     *
     * Mix-minus = participant hears everyone EXCEPT themselves
     */
    async setupMixMinusForParticipant(participantId) {
        const participant = this.participants.get(participantId);
        if (!participant) {
            throw new Error(`Participant ${participantId} not found`);
        }

        console.log(`[ConfBridge:${this.roomId}] Setting up mix-minus for ${participant.name}...`);

        // Create audio bridge for this participant
        // Mix-minus: route audio from all OTHER participants to this one
        const otherParticipants = Array.from(this.participants.values())
            .filter(p => p.id !== participantId);

        console.log(`  ${participant.name} will hear ${otherParticipants.length} other participant(s)`);

        // Store mix-minus stream info
        this.mixMinusStreams.set(participantId, {
            participantId,
            sources: otherParticipants.map(p => p.id),
            createdAt: Date.now()
        });

        // Update mix-minus for all OTHER participants to exclude THIS participant
        for (const [otherId, otherParticipant] of this.participants) {
            if (otherId !== participantId) {
                await this.updateMixMinusForParticipant(otherId);
            }
        }

        console.log(`[ConfBridge:${this.roomId}] ✓ Mix-minus configured for ${participant.name}`);
    }

    /**
     * Update mix-minus audio for participant (when room membership changes)
     */
    async updateMixMinusForParticipant(participantId) {
        const participant = this.participants.get(participantId);
        if (!participant) return;

        // Get all OTHER participants
        const otherParticipants = Array.from(this.participants.values())
            .filter(p => p.id !== participantId);

        console.log(`[ConfBridge:${this.roomId}] Updating mix-minus for ${participant.name}`);
        console.log(`  Now hearing ${otherParticipants.length} participant(s)`);

        // Update mix-minus stream
        this.mixMinusStreams.set(participantId, {
            participantId,
            sources: otherParticipants.map(p => p.id),
            updatedAt: Date.now()
        });
    }

    /**
     * Remove participant from conference
     */
    async removeParticipant(participantId) {
        const participant = this.participants.get(participantId);
        if (!participant) return;

        console.log(`[ConfBridge:${this.roomId}] Removing ${participant.name}...`);

        // Stop orchestrator
        if (participant.orchestrator) {
            await participant.orchestrator.stop();
        }

        // Remove from participants
        this.participants.delete(participantId);

        // Remove mix-minus stream
        this.mixMinusStreams.delete(participantId);

        // Update mix-minus for remaining participants
        for (const [otherId, otherParticipant] of this.participants) {
            await this.updateMixMinusForParticipant(otherId);
        }

        console.log(`[ConfBridge:${this.roomId}] ✓ Removed ${participant.name}`);
        console.log(`  Remaining participants: ${this.participants.size}`);

        // Emit participant left event
        this.emit('participantLeft', {
            roomId: this.roomId,
            participantId,
            participantCount: this.participants.size
        });
    }

    /**
     * Get mix-minus sources for participant
     */
    getMixMinusSources(participantId) {
        const mixMinus = this.mixMinusStreams.get(participantId);
        return mixMinus ? mixMinus.sources : [];
    }

    /**
     * Handle participant speaking
     */
    handleParticipantSpeaking(participantId) {
        const participant = this.participants.get(participantId);
        if (!participant) return;

        participant.speaking = true;
        this.activeSpeaker = participantId;
        this.lastSpeakerChange = Date.now();

        console.log(`[ConfBridge:${this.roomId}] ${participant.name} is speaking`);

        this.emit('activeSpeaker', {
            roomId: this.roomId,
            participantId,
            participantName: participant.name
        });
    }

    /**
     * Handle participant stopped speaking
     */
    handleParticipantSilence(participantId) {
        const participant = this.participants.get(participantId);
        if (!participant) return;

        participant.speaking = false;

        if (this.activeSpeaker === participantId) {
            this.activeSpeaker = null;
        }

        console.log(`[ConfBridge:${this.roomId}] ${participant.name} stopped speaking`);
    }

    /**
     * Get conference statistics
     */
    getStats() {
        return {
            roomId: this.roomId,
            conferenceId: this.conferenceId,
            participantCount: this.participants.size,
            participants: Array.from(this.participants.values()).map(p => ({
                id: p.id,
                name: p.name,
                language: p.language,
                speaking: p.speaking,
                duration: Date.now() - p.joinedAt
            })),
            activeSpeaker: this.activeSpeaker,
            duration: Date.now() - this.createdAt,
            locked: this.locked
        };
    }

    /**
     * Destroy conference room
     */
    async destroy() {
        console.log(`[ConfBridge:${this.roomId}] Destroying conference...`);

        // Remove all participants
        const participantIds = Array.from(this.participants.keys());
        for (const participantId of participantIds) {
            await this.removeParticipant(participantId);
        }

        this.participants.clear();
        this.mixMinusStreams.clear();

        console.log(`[ConfBridge:${this.roomId}] ✓ Conference destroyed`);
        this.emit('destroyed', { roomId: this.roomId });
    }
}

/**
 * ConfBridge Manager - Manages multiple conference rooms
 */
class ConfBridgeManager extends EventEmitter {
    constructor(ariClient, services) {
        super();

        this.ariClient = ariClient;
        this.services = services;

        // Conference rooms: Map<roomId, ConferenceRoom>
        this.rooms = new Map();

        // Orchestrator Manager for translation pipelines
        this.orchestratorManager = new OrchestratorManager(services);

        // Forward orchestrator events
        this.orchestratorManager.on('translation', (data) => {
            this.emit('translation', data);
        });

        this.orchestratorManager.on('error', (data) => {
            this.emit('error', data);
        });

        console.log('[ConfBridgeMgr] Initialized');
    }

    /**
     * Create conference room
     */
    async createRoom(roomId, conferenceId) {
        if (this.rooms.has(roomId)) {
            throw new Error(`Conference room ${roomId} already exists`);
        }

        console.log(`[ConfBridgeMgr] Creating conference room: ${roomId}`);

        const room = new ConferenceRoom(roomId, conferenceId, this.ariClient);

        // Forward room events
        room.on('participantJoined', (data) => {
            this.emit('participantJoined', data);
        });

        room.on('participantLeft', (data) => {
            this.emit('participantLeft', data);
        });

        room.on('activeSpeaker', (data) => {
            this.emit('activeSpeaker', data);
        });

        room.on('destroyed', (data) => {
            this.rooms.delete(roomId);
            this.emit('roomDestroyed', data);
        });

        this.rooms.set(roomId, room);

        console.log(`[ConfBridgeMgr] ✓ Conference room created: ${roomId}`);
        this.emit('roomCreated', { roomId, conferenceId });

        return room;
    }

    /**
     * Get conference room
     */
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    /**
     * Add participant to conference with translation
     */
    async addParticipant(roomId, participantId, name, language, channel, options = {}) {
        let room = this.rooms.get(roomId);

        // Create room if it doesn't exist
        if (!room) {
            room = await this.createRoom(roomId, roomId);
        }

        console.log(`[ConfBridgeMgr] Adding ${name} to ${roomId}...`);

        // Add participant to room
        const participant = await room.addParticipant(
            participantId,
            name,
            language,
            channel
        );

        // Create translation orchestrator for this participant
        // Each participant needs translation FROM their language TO all other languages
        const otherLanguages = Array.from(room.participants.values())
            .filter(p => p.id !== participantId)
            .map(p => p.language)
            .filter((lang, index, arr) => arr.indexOf(lang) === index); // unique

        console.log(`[ConfBridgeMgr] Setting up translation for ${name}`);
        console.log(`  Source: ${language}`);
        console.log(`  Targets: ${otherLanguages.join(', ') || 'none (first participant)'}`);

        // For now, create orchestrator for each target language
        // In practice, you'd create one orchestrator per participant pair
        for (const targetLang of otherLanguages) {
            if (targetLang !== language) {
                try {
                    const orchestrator = await this.orchestratorManager.createOrchestrator(
                        `${participantId}_to_${targetLang}`,
                        language,
                        targetLang,
                        options
                    );

                    console.log(`[ConfBridgeMgr] ✓ Orchestrator created: ${language} → ${targetLang}`);
                } catch (error) {
                    console.error(`[ConfBridgeMgr] Error creating orchestrator:`, error);
                }
            }
        }

        console.log(`[ConfBridgeMgr] ✓ ${name} added to ${roomId}`);

        return participant;
    }

    /**
     * Remove participant from conference
     */
    async removeParticipant(roomId, participantId) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        console.log(`[ConfBridgeMgr] Removing participant ${participantId} from ${roomId}...`);

        // Stop all orchestrators for this participant
        const orchestrators = this.orchestratorManager.getActiveOrchestrators();
        for (const orchestrator of orchestrators) {
            if (orchestrator.channelId.startsWith(`${participantId}_`)) {
                await this.orchestratorManager.stopOrchestrator(orchestrator.channelId);
            }
        }

        // Remove from room
        await room.removeParticipant(participantId);

        // Destroy room if empty
        if (room.participants.size === 0) {
            await this.destroyRoom(roomId);
        }
    }

    /**
     * Destroy conference room
     */
    async destroyRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        console.log(`[ConfBridgeMgr] Destroying room: ${roomId}...`);

        // Stop all orchestrators for this room
        await this.orchestratorManager.stopAll();

        // Destroy room
        await room.destroy();

        this.rooms.delete(roomId);

        console.log(`[ConfBridgeMgr] ✓ Room destroyed: ${roomId}`);
    }

    /**
     * Get all active rooms
     */
    getActiveRooms() {
        return Array.from(this.rooms.values());
    }

    /**
     * Get statistics for all rooms
     */
    getAllStats() {
        const stats = {
            totalRooms: this.rooms.size,
            rooms: {},
            orchestrators: this.orchestratorManager.getAllStats()
        };

        for (const [roomId, room] of this.rooms) {
            stats.rooms[roomId] = room.getStats();
        }

        return stats;
    }

    /**
     * Cleanup and shutdown
     */
    async shutdown() {
        console.log('[ConfBridgeMgr] Shutting down...');

        // Destroy all rooms
        const roomIds = Array.from(this.rooms.keys());
        for (const roomId of roomIds) {
            await this.destroyRoom(roomId);
        }

        // Stop all orchestrators
        await this.orchestratorManager.stopAll();

        console.log('[ConfBridgeMgr] ✓ Shutdown complete');
    }
}

module.exports = {
    ConfBridgeManager,
    ConferenceRoom,
    ConferenceParticipant
};
