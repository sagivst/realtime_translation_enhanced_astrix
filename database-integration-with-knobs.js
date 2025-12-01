#!/usr/bin/env node

/**
 * Enhanced Database Integration Module with Complete Knobs Collection
 * Collects both 75 metrics AND 250+ configuration knobs
 * Stores everything for LLM analysis
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

class DatabaseIntegrationWithKnobs {
    constructor() {
        this.pool = new Pool({
            host: 'localhost',
            port: 5432,
            database: 'audio_optimization',  // Use audio optimization database
            user: process.env.USER || 'sagivstavinsky'  // Use system user
        });

        // Load complete knobs list (250+ knobs)
        this.COMPLETE_KNOBS_LIST = this.loadCompleteKnobsList();

        // Load 75 metrics list
        this.ALL_METRICS = this.load75MetricsList();

        // Station-specific available knobs (discovered from scan)
        this.stationKnobs = {
            'STATION_3': this.loadStationKnobs('STATION_3'),
            'STATION_9': this.loadStationKnobs('STATION_9')
        };

        this.activeCallsMap = new Map();
    }

    loadCompleteKnobsList() {
        try {
            const knobsData = fs.readFileSync('/Users/sagivstavinsky/realtime-translation-enhanced_astrix/unified-knobs-configuration.json', 'utf8');
            return JSON.parse(knobsData);
        } catch (error) {
            console.log('Loading default knobs list');
            // Return minimal default set
            return {
                'input_gain_db': { cat: 'audio', type: 'numeric', min: -20, max: 20 },
                'output_gain_db': { cat: 'audio', type: 'numeric', min: -12, max: 12 },
                'buffer_size_ms': { cat: 'buffer', type: 'numeric', min: 10, max: 500 },
                'jitter_buffer_ms': { cat: 'network', type: 'numeric', min: 0, max: 200 }
            };
        }
    }

    load75MetricsList() {
        // All 75 metrics from specification
        return {
            // Buffer Metrics (15)
            buffer_usage_pct: { category: 'buffer', unit: 'percent' },
            buffer_underruns: { category: 'buffer', unit: 'count' },
            buffer_overruns: { category: 'buffer', unit: 'count' },
            jitter_buffer_size_ms: { category: 'buffer', unit: 'milliseconds' },
            adaptive_buffer_status: { category: 'buffer', unit: 'string' },
            buffer_health_score: { category: 'buffer', unit: 'score' },
            peak_buffer_usage: { category: 'buffer', unit: 'percent' },
            buffer_resize_events: { category: 'buffer', unit: 'count' },
            avg_buffer_occupancy: { category: 'buffer', unit: 'percent' },
            buffer_drain_rate: { category: 'buffer', unit: 'bytes_per_sec' },
            buffer_fill_rate: { category: 'buffer', unit: 'bytes_per_sec' },
            buffer_starvation_time: { category: 'buffer', unit: 'milliseconds' },
            max_consecutive_underruns: { category: 'buffer', unit: 'count' },
            buffer_stability_index: { category: 'buffer', unit: 'score' },
            effective_buffer_latency: { category: 'buffer', unit: 'milliseconds' },

            // Latency Metrics (15)
            end_to_end_latency_ms: { category: 'latency', unit: 'milliseconds' },
            network_latency_ms: { category: 'latency', unit: 'milliseconds' },
            processing_latency_ms: { category: 'latency', unit: 'milliseconds' },
            codec_latency_ms: { category: 'latency', unit: 'milliseconds' },
            jitter_ms: { category: 'latency', unit: 'milliseconds' },
            round_trip_time_ms: { category: 'latency', unit: 'milliseconds' },
            transcription_latency_ms: { category: 'latency', unit: 'milliseconds' },
            synthesis_latency_ms: { category: 'latency', unit: 'milliseconds' },
            api_response_time_ms: { category: 'latency', unit: 'milliseconds' },
            queue_wait_time_ms: { category: 'latency', unit: 'milliseconds' },
            first_byte_latency_ms: { category: 'latency', unit: 'milliseconds' },
            peak_latency_ms: { category: 'latency', unit: 'milliseconds' },
            p95_latency_ms: { category: 'latency', unit: 'milliseconds' },
            p99_latency_ms: { category: 'latency', unit: 'milliseconds' },
            latency_variation_ms: { category: 'latency', unit: 'milliseconds' },

            // Packet Metrics (15)
            packet_loss_pct: { category: 'packet', unit: 'percent' },
            packets_received: { category: 'packet', unit: 'count' },
            packets_sent: { category: 'packet', unit: 'count' },
            packet_reorder_rate: { category: 'packet', unit: 'percent' },
            duplicate_packets: { category: 'packet', unit: 'count' },
            corrupted_packets: { category: 'packet', unit: 'count' },
            packet_timing_drift: { category: 'packet', unit: 'microseconds' },
            interpacket_gap_ms: { category: 'packet', unit: 'milliseconds' },
            burst_loss_rate: { category: 'packet', unit: 'percent' },
            consecutive_loss_count: { category: 'packet', unit: 'count' },
            fec_recovery_rate: { category: 'packet', unit: 'percent' },
            retransmission_rate: { category: 'packet', unit: 'percent' },
            packet_conceal_count: { category: 'packet', unit: 'count' },
            effective_loss_rate: { category: 'packet', unit: 'percent' },
            network_efficiency: { category: 'packet', unit: 'percent' },

            // Audio Quality Metrics (15)
            snr_db: { category: 'audio_quality', unit: 'decibels' },
            noise_floor_db: { category: 'audio_quality', unit: 'decibels' },
            audio_level_dbfs: { category: 'audio_quality', unit: 'decibels_fs' },
            peak_level_dbfs: { category: 'audio_quality', unit: 'decibels_fs' },
            clipping_detected: { category: 'audio_quality', unit: 'boolean' },
            silence_detected: { category: 'audio_quality', unit: 'boolean' },
            voice_activity_ratio: { category: 'audio_quality', unit: 'percent' },
            audio_bandwidth_khz: { category: 'audio_quality', unit: 'kilohertz' },
            spectral_centroid_hz: { category: 'audio_quality', unit: 'hertz' },
            mos_score: { category: 'audio_quality', unit: 'score' },
            pesq_score: { category: 'audio_quality', unit: 'score' },
            pitch_accuracy: { category: 'audio_quality', unit: 'percent' },
            formant_clarity: { category: 'audio_quality', unit: 'score' },
            harmonic_distortion_pct: { category: 'audio_quality', unit: 'percent' },
            intermodulation_distortion: { category: 'audio_quality', unit: 'percent' },

            // Performance Metrics (15)
            cpu_usage_pct: { category: 'performance', unit: 'percent' },
            memory_usage_mb: { category: 'performance', unit: 'megabytes' },
            thread_pool_usage: { category: 'performance', unit: 'percent' },
            event_loop_lag_ms: { category: 'performance', unit: 'milliseconds' },
            gc_pause_time_ms: { category: 'performance', unit: 'milliseconds' },
            api_calls_per_sec: { category: 'performance', unit: 'count_per_sec' },
            websocket_connections: { category: 'performance', unit: 'count' },
            active_streams: { category: 'performance', unit: 'count' },
            transcription_accuracy: { category: 'performance', unit: 'percent' },
            synthesis_quality_score: { category: 'performance', unit: 'score' },
            error_rate: { category: 'performance', unit: 'percent' },
            retry_count: { category: 'performance', unit: 'count' },
            cache_hit_rate: { category: 'performance', unit: 'percent' },
            throughput_kbps: { category: 'performance', unit: 'kilobits_per_sec' },
            processing_efficiency: { category: 'performance', unit: 'percent' }
        };
    }

    loadStationKnobs(stationId) {
        // Load discovered knobs for specific station
        try {
            const scanFile = `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/station-${stationId.toLowerCase()}-knobs.json`;
            if (fs.existsSync(scanFile)) {
                return JSON.parse(fs.readFileSync(scanFile, 'utf8'));
            }
        } catch (error) {
            console.log(`No specific knobs file for ${stationId}`);
        }

        // Return default available knobs for station
        const defaults = {
            'STATION_3': [
                'input_gain_db', 'output_gain_db', 'buffer_size_ms',
                'jitter_buffer_ms', 'deepgram.model', 'deepgram.language',
                'deepgram.punctuate', 'deepgram.interim_results'
            ],
            'STATION_9': [
                'input_gain_db', 'output_gain_db', 'elevenlabs.model_id',
                'elevenlabs.voice_id', 'elevenlabs.stability',
                'elevenlabs.similarity_boost', 'elevenlabs.optimize_streaming_latency'
            ]
        };

        return defaults[stationId] || [];
    }

    /**
     * Collect all knobs for a station with NA for unavailable ones
     */
    collectStationKnobs(stationId, currentValues = {}) {
        const knobsData = {};
        const availableKnobs = this.stationKnobs[stationId] || [];

        // Go through ALL 250+ knobs
        for (const [knobName, knobConfig] of Object.entries(this.COMPLETE_KNOBS_LIST)) {
            if (currentValues[knobName] !== undefined) {
                // Use provided value
                knobsData[knobName] = currentValues[knobName];
            } else if (availableKnobs.includes(knobName)) {
                // Knob is available but no value provided - try to get current value
                knobsData[knobName] = this.getCurrentKnobValue(stationId, knobName);
            } else {
                // Knob not available for this station
                knobsData[knobName] = 'NA';
            }
        }

        return knobsData;
    }

    getCurrentKnobValue(stationId, knobName) {
        // Try to get current value from various sources

        // Check environment variables
        if (knobName.startsWith('NODE_') || knobName.includes('_PORT')) {
            return process.env[knobName] || 'NA';
        }

        // Check known defaults
        const defaults = {
            'input_gain_db': 0,
            'output_gain_db': 0,
            'buffer_size_ms': 100,
            'jitter_buffer_ms': 50,
            'deepgram.model': 'nova-2',
            'deepgram.language': 'en',
            'deepgram.punctuate': true,
            'deepgram.interim_results': true,
            'elevenlabs.model_id': 'eleven_multilingual_v2',
            'elevenlabs.stability': 0.5,
            'elevenlabs.similarity_boost': 0.5
        };

        return defaults[knobName] || 'NA';
    }

    /**
     * Enhanced ingestion function with knobs collection
     */
    async ingestStationSnapshot(snapshot) {
        try {
            const {
                call_id,
                channel,
                segment,
                station,
                metrics = {},
                knobs = {},  // New: configuration knobs
                logs = [],
                audio
            } = snapshot;

            // Validate required fields
            if (!station?.id || !segment) {
                throw new Error('Missing required fields in snapshot');
            }

            // Collect all 75 metrics with NA for missing ones
            const allMetrics = {};
            for (const metricName of Object.keys(this.ALL_METRICS)) {
                allMetrics[metricName] = metrics[metricName] !== undefined ? metrics[metricName] : 'NA';
            }

            // Collect all 250+ knobs with NA for missing ones
            const allKnobs = this.collectStationKnobs(station.id, knobs);

            // Get or create call
            const dbCallId = await this.getOrCreateCall(call_id || `auto-${Date.now()}`);

            // Create channel if needed
            let channelId;
            if (channel) {
                channelId = await this.createChannel(dbCallId, channel);
            }

            // Create segment
            const segmentId = await this.createSegment(
                channelId,
                segment.start_ms,
                segment.end_ms
            );

            // Store combined data
            const enhancedData = {
                metrics: allMetrics,
                knobs: allKnobs,
                totals: {
                    metrics_count: Object.keys(allMetrics).length,
                    knobs_count: Object.keys(allKnobs).length,
                    metrics_available: Object.values(allMetrics).filter(v => v !== 'NA').length,
                    knobs_available: Object.values(allKnobs).filter(v => v !== 'NA').length
                }
            };

            // Insert station snapshot with both metrics and knobs
            const result = await this.pool.query(
                `INSERT INTO station_snapshots
                 (segment_id, station_id, metrics, logs, audio_ref)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id, timestamp`,
                [
                    segmentId,
                    station.id,
                    JSON.stringify(enhancedData),  // Store both metrics and knobs
                    JSON.stringify(logs),
                    audio?.ref || null
                ]
            );

            const snapshotId = result.rows[0].id;
            const timestamp = result.rows[0].timestamp;

            console.log(`✅ Snapshot ingested: ${snapshotId} for ${station.id}`);
            console.log(`   📊 Metrics: ${enhancedData.totals.metrics_available}/${enhancedData.totals.metrics_count}`);
            console.log(`   🎛️ Knobs: ${enhancedData.totals.knobs_available}/${enhancedData.totals.knobs_count}`);

            return {
                success: true,
                snapshot_id: snapshotId,
                timestamp: timestamp,
                stats: enhancedData.totals
            };

        } catch (error) {
            console.error('Error ingesting snapshot:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getOrCreateCall(externalCallId) {
        try {
            let result = await this.pool.query(
                'SELECT id FROM calls WHERE external_call_id = $1',
                [externalCallId]
            );

            if (result.rows.length > 0) {
                return result.rows[0].id;
            }

            result = await this.pool.query(
                `INSERT INTO calls (external_call_id, direction)
                 VALUES ($1, $2)
                 RETURNING id`,
                [externalCallId, 'inbound']
            );

            return result.rows[0].id;
        } catch (error) {
            console.error('Error creating call:', error);
            throw error;
        }
    }

    async createChannel(callId, name) {
        try {
            const result = await this.pool.query(
                `INSERT INTO channels (call_id, name, leg)
                 VALUES ($1, $2, $3)
                 RETURNING id`,
                [callId, name, name === 'caller' ? 'A' : 'B']
            );
            return result.rows[0].id;
        } catch (error) {
            console.error('Error creating channel:', error);
            throw error;
        }
    }

    async createSegment(channelId, startMs, endMs) {
        try {
            const result = await this.pool.query(
                `INSERT INTO segments (channel_id, start_ms, end_ms, segment_type)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id`,
                [channelId, startMs, endMs, 'speech']
            );
            return result.rows[0].id;
        } catch (error) {
            console.error('Error creating segment:', error);
            throw error;
        }
    }

    /**
     * Get latest snapshots for dashboard display
     */
    async getLatestSnapshots(limit = 100) {
        try {
            const result = await this.pool.query(
                `SELECT
                    ss.id,
                    ss.station_id,
                    ss.timestamp,
                    ss.metrics,
                    s.start_ms,
                    s.end_ms,
                    ch.name as channel,
                    c.external_call_id
                FROM station_snapshots ss
                LEFT JOIN segments s ON ss.segment_id = s.id
                LEFT JOIN channels ch ON s.channel_id = ch.id
                LEFT JOIN calls c ON ch.call_id = c.id
                ORDER BY ss.timestamp DESC
                LIMIT $1`,
                [limit]
            );

            return result.rows.map(row => ({
                id: row.id,
                station_id: row.station_id,
                timestamp: row.timestamp,
                call_id: row.external_call_id,
                channel: row.channel,
                metrics: row.metrics.metrics || {},
                knobs: row.metrics.knobs || {},
                totals: row.metrics.totals || {}
            }));
        } catch (error) {
            console.error('Error getting latest snapshots:', error);
            return [];
        }
    }

    async close() {
        await this.pool.end();
    }
}

module.exports = DatabaseIntegrationWithKnobs;

// Start HTTP server for dashboard data
if (require.main === module) {
    const http = require('http');
    const dbIntegration = new DatabaseIntegrationWithKnobs();

    const server = http.createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.url === '/api/snapshots' && req.method === 'GET') {
            const snapshots = await dbIntegration.getLatestSnapshots();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(snapshots));
        } else if (req.url === '/api/ingest' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const snapshot = JSON.parse(body);
                    const result = await dbIntegration.ingestStationSnapshot(snapshot);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });

    const PORT = 8081;
    server.listen(PORT, () => {
        console.log(`📊 Database integration server running on http://localhost:${PORT}`);
        console.log(`   - GET /api/snapshots - Get latest snapshots with metrics and knobs`);
        console.log(`   - POST /api/ingest - Ingest new snapshot`);
    });
}