/**
 * Latency Collector - API-Driven Monitoring
 *
 * Aggregates timing data from API responses (Deepgram, DeepL, ElevenLabs, Hume)
 * WITHOUT modifying the pipeline or tracking frame metadata.
 *
 * Approach:
 * - Collect latency data that APIs already provide in their responses
 * - Maintain hierarchical view: Provider → Channel → Conference
 * - Expose via Socket.IO for monitoring dashboard
 * - Zero overhead - no pipeline modifications
 */

const EventEmitter = require('events');

class LatencyCollector extends EventEmitter {
    constructor() {
        super();

        // Hierarchical data structure
        this.channels = new Map(); // channelId → ChannelLatencyData
        this.conferences = new Map(); // conferenceId → ConferenceLatencyData

        // Global aggregates
        this.globalStats = {
            deepgram: { total: 0, count: 0, avg: 0, min: Infinity, max: 0 },
            deepl: { total: 0, count: 0, avg: 0, min: Infinity, max: 0 },
            elevenlabs: { total: 0, count: 0, avg: 0, min: Infinity, max: 0 },
            hume: { total: 0, count: 0, avg: 0, min: Infinity, max: 0 },
            endToEnd: { total: 0, count: 0, avg: 0, min: Infinity, max: 0 }
        };

        // Cleanup old data every 5 minutes
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    /**
     * Record ASR (Deepgram) latency from transcript event
     * Called when asrWorker.on('transcript') fires
     */
    recordASRLatency(channelId, data) {
        if (!data.latency) return;

        const channel = this.getOrCreateChannel(channelId);
        channel.deepgram.push({
            timestamp: Date.now(),
            latency: data.latency,
            text: data.text,
            confidence: data.confidence
        });

        // Update global stats
        this.updateGlobalStats('deepgram', data.latency);

        this.emit('latency-update', { provider: 'deepgram', channelId, latency: data.latency });
    }

    /**
     * Record Translation (DeepL) latency from pipeline
     * Called when pipelineComplete event fires
     */
    recordTranslationLatency(channelId, translationTime) {
        if (!translationTime) return;

        const channel = this.getOrCreateChannel(channelId);
        channel.deepl.push({
            timestamp: Date.now(),
            latency: translationTime
        });

        // Update global stats
        this.updateGlobalStats('deepl', translationTime);

        this.emit('latency-update', { provider: 'deepl', channelId, latency: translationTime });
    }

    /**
     * Record TTS (ElevenLabs) latency from pipeline
     * Called when pipelineComplete event fires
     */
    recordTTSLatency(channelId, ttsTime) {
        if (!ttsTime) return;

        const channel = this.getOrCreateChannel(channelId);
        channel.elevenlabs.push({
            timestamp: Date.now(),
            latency: ttsTime
        });

        // Update global stats
        this.updateGlobalStats('elevenlabs', ttsTime);

        this.emit('latency-update', { provider: 'elevenlabs', channelId, latency: ttsTime });
    }

    /**
     * Record end-to-end latency from pipeline
     * Called when pipelineComplete event fires
     */
    recordEndToEndLatency(channelId, totalTime, pipelineData) {
        if (!totalTime) return;

        const channel = this.getOrCreateChannel(channelId);
        channel.endToEnd.push({
            timestamp: Date.now(),
            latency: totalTime,
            breakdown: {
                translation: pipelineData.translationTime,
                tts: pipelineData.ttsTime,
                downsample: pipelineData.convertTime,
                send: pipelineData.sendTime
            }
        });

        // Update global stats
        this.updateGlobalStats('endToEnd', totalTime);

        this.emit('latency-update', { provider: 'endToEnd', channelId, latency: totalTime });
    }

    /**
     * Record Hume AI latency (if available)
     */
    recordHumeLatency(channelId, latency) {
        if (!latency) return;

        const channel = this.getOrCreateChannel(channelId);
        channel.hume.push({
            timestamp: Date.now(),
            latency
        });

        // Update global stats
        this.updateGlobalStats('hume', latency);

        this.emit('latency-update', { provider: 'hume', channelId, latency });
    }

    /**
     * Get or create channel data structure
     */
    getOrCreateChannel(channelId) {
        if (!this.channels.has(channelId)) {
            this.channels.set(channelId, {
                channelId,
                language: null,
                createdAt: Date.now(),
                lastActivity: Date.now(),
                deepgram: [],
                deepl: [],
                elevenlabs: [],
                hume: [],
                endToEnd: []
            });
        }

        const channel = this.channels.get(channelId);
        channel.lastActivity = Date.now();
        return channel;
    }

    /**
     * Update global statistics
     */
    updateGlobalStats(provider, latency) {
        const stats = this.globalStats[provider];
        if (!stats) return;

        stats.total += latency;
        stats.count++;
        stats.avg = stats.total / stats.count;
        stats.min = Math.min(stats.min, latency);
        stats.max = Math.max(stats.max, latency);
    }

    /**
     * Get aggregated stats for a channel
     */
    getChannelStats(channelId) {
        const channel = this.channels.get(channelId);
        if (!channel) return null;

        return {
            channelId,
            language: channel.language,
            deepgram: this.calculateStats(channel.deepgram),
            deepl: this.calculateStats(channel.deepl),
            elevenlabs: this.calculateStats(channel.elevenlabs),
            hume: this.calculateStats(channel.hume),
            endToEnd: this.calculateStats(channel.endToEnd),
            lastActivity: channel.lastActivity,
            uptime: Date.now() - channel.createdAt
        };
    }

    /**
     * Get all channel stats
     */
    getAllChannelStats() {
        const stats = [];
        for (const [channelId, _] of this.channels) {
            stats.push(this.getChannelStats(channelId));
        }
        return stats;
    }

    /**
     * Get global stats across all channels
     */
    getGlobalStats() {
        return {
            timestamp: Date.now(),
            totalChannels: this.channels.size,
            providers: {
                deepgram: { ...this.globalStats.deepgram },
                deepl: { ...this.globalStats.deepl },
                elevenlabs: { ...this.globalStats.elevenlabs },
                hume: { ...this.globalStats.hume },
                endToEnd: { ...this.globalStats.endToEnd }
            }
        };
    }

    /**
     * Calculate statistics for a latency array
     */
    calculateStats(latencyArray) {
        if (!latencyArray || latencyArray.length === 0) {
            return { count: 0, avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
        }

        // Keep only last 100 entries for calculation
        const recent = latencyArray.slice(-100);
        const latencies = recent.map(item => item.latency);

        const sorted = [...latencies].sort((a, b) => a - b);
        const count = sorted.length;
        const sum = sorted.reduce((a, b) => a + b, 0);

        return {
            count,
            avg: Math.round(sum / count),
            min: sorted[0],
            max: sorted[count - 1],
            p50: sorted[Math.floor(count * 0.5)],
            p95: sorted[Math.floor(count * 0.95)],
            p99: sorted[Math.floor(count * 0.99)],
            recent: latencies.slice(-10) // Last 10 measurements
        };
    }

    /**
     * Set channel language (for hierarchical grouping)
     */
    setChannelLanguage(channelId, language) {
        const channel = this.getOrCreateChannel(channelId);
        channel.language = language;
    }

    /**
     * Associate channel with conference
     */
    setChannelConference(channelId, conferenceId) {
        const channel = this.getOrCreateChannel(channelId);
        channel.conferenceId = conferenceId;

        // Update conference mapping
        if (!this.conferences.has(conferenceId)) {
            this.conferences.set(conferenceId, {
                conferenceId,
                channels: new Set(),
                createdAt: Date.now()
            });
        }
        this.conferences.get(conferenceId).channels.add(channelId);
    }

    /**
     * Get conference-level stats (aggregated from all channels)
     */
    getConferenceStats(conferenceId) {
        const conference = this.conferences.get(conferenceId);
        if (!conference) return null;

        const channelStats = Array.from(conference.channels)
            .map(channelId => this.getChannelStats(channelId))
            .filter(stats => stats !== null);

        return {
            conferenceId,
            channelCount: conference.channels.size,
            channels: channelStats,
            uptime: Date.now() - conference.createdAt
        };
    }

    /**
     * Cleanup old channel data (inactive for > 10 minutes)
     */
    cleanup() {
        const now = Date.now();
        const TIMEOUT = 10 * 60 * 1000; // 10 minutes

        for (const [channelId, channel] of this.channels) {
            if (now - channel.lastActivity > TIMEOUT) {
                console.log(`[LatencyCollector] Cleaning up inactive channel: ${channelId}`);
                this.channels.delete(channelId);

                // Remove from conference mapping
                if (channel.conferenceId) {
                    const conference = this.conferences.get(channel.conferenceId);
                    if (conference) {
                        conference.channels.delete(channelId);

                        // Remove empty conferences
                        if (conference.channels.size === 0) {
                            this.conferences.delete(channel.conferenceId);
                        }
                    }
                }
            }
        }
    }

    /**
     * Get hierarchical view: Conference → Channels → Providers
     */
    getHierarchicalView() {
        const view = {
            timestamp: Date.now(),
            global: this.getGlobalStats(),
            conferences: [],
            orphanedChannels: []
        };

        // Group channels by conference
        for (const [conferenceId, _] of this.conferences) {
            view.conferences.push(this.getConferenceStats(conferenceId));
        }

        // Orphaned channels (not in any conference)
        for (const [channelId, channel] of this.channels) {
            if (!channel.conferenceId) {
                view.orphanedChannels.push(this.getChannelStats(channelId));
            }
        }

        return view;
    }

    /**
     * Register Socket.IO handlers for real-time monitoring
     */
    registerSocketHandlers(io) {
        // Send updates on latency changes
        this.on('latency-update', (data) => {
            io.emit('latency-update', data);
        });

        // Handle client requests
        io.on('connection', (socket) => {
            console.log('[LatencyCollector] Client connected:', socket.id);

            // Send initial data
            socket.emit('latency-hierarchical-view', this.getHierarchicalView());

            // Handle requests for updates
            socket.on('get-latency-stats', (request) => {
                if (request.type === 'global') {
                    socket.emit('latency-global-stats', this.getGlobalStats());
                } else if (request.type === 'channel' && request.channelId) {
                    socket.emit('latency-channel-stats', this.getChannelStats(request.channelId));
                } else if (request.type === 'conference' && request.conferenceId) {
                    socket.emit('latency-conference-stats', this.getConferenceStats(request.conferenceId));
                } else if (request.type === 'hierarchical') {
                    socket.emit('latency-hierarchical-view', this.getHierarchicalView());
                }
            });
        });

        // Broadcast hierarchical view every 2 seconds
        setInterval(() => {
            io.emit('latency-hierarchical-view', this.getHierarchicalView());
        }, 2000);
    }
}

module.exports = LatencyCollector;
