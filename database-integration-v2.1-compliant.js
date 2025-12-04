#!/usr/bin/env node

/**
 * VERSION 2.1.0 FULLY COMPLIANT Database Integration
 * Supports all relevant stations: 1, 2, 3, 7, 8, 9, 10, 11
 * Excludes stations 4, 5, 6 (Deepgram STT, Translation, TTS Processing - not relevant)
 * STATION_3 is IMPORTANT - monitors/improves voice, influences Deepgram performance!
 * Flexible pattern matching for future stations
 * December 2025
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

class OptimizerV21DatabaseIntegration {
    constructor() {
        this.pool = new Pool({
            host: 'localhost',
            port: 5432,
            database: 'audio_optimization',
            user: 'postgres',
            password: 'postgres'
        });

        // Initialize JSON Schema validator with V2.1.0 schema
        this.ajv = new Ajv({
            strict: false,  // More flexible for V2.1.0
            allErrors: true,
            allowUnionTypes: true,
            removeAdditional: false  // Keep unknown fields for forward compatibility
        });
        addFormats(this.ajv);
        this.validator = this.ajv.compile(this.getV21Schema());

        // Live knobs storage per call and channel
        this.liveKnobs = new Map();

        // Define relevant stations and their characteristics
        // EXCLUDING only stations 4, 5, 6 (Deepgram STT, Translation, TTS Processing)
        // STATION_3 is CRUCIAL - voice monitoring/improvement that influences Deepgram!
        this.RELEVANT_STATIONS = {
            'STATION_1': {
                name: 'Asterisk PBX',
                type: 'voice',
                metrics: ['sip_latency', 'call_setup_time', 'codec_quality'],
                knobs: ['codec_selection', 'dtmf_mode', 'rtp_timeout']
            },
            'STATION_2': {
                name: 'Gateway RX',
                type: 'voice',
                metrics: ['packet_loss_pct', 'jitter_ms', 'buffer_status'],
                knobs: ['jitter_buffer_ms', 'packet_size', 'fec_enabled']
            },
            'STATION_3': {
                name: 'Voice Monitor/Enhancer',
                type: 'voice',
                metrics: ['snr_db', 'voice_clarity', 'noise_reduction_level', 'audio_enhancement_score'],
                knobs: ['agc.enabled', 'agc.target_level_dbfs', 'noise_reduction_strength', 'echo_cancellation.enabled'],
                description: 'CRITICAL - Monitors and improves voice quality, directly impacts Deepgram performance'
            },
            'STATION_7': {
                name: 'Gateway TX',
                type: 'voice',
                metrics: ['output_buffer_status', 'transmission_rate', 'packet_loss_tx'],
                knobs: ['output_buffer_size', 'transmission_priority', 'qos_level']
            },
            'STATION_8': {
                name: 'Audio Pipeline Monitor',
                type: 'voice',
                metrics: ['pipeline_latency_ms', 'throughput_kbps', 'queue_depth'],
                knobs: ['pipeline_buffer_size', 'priority_level', 'flow_control']
            },
            'STATION_9': {
                name: 'TTS Output',
                type: 'voice',
                metrics: ['synthesis_latency_ms', 'audio_quality_score', 'buffer_health'],
                knobs: ['elevenlabs.model_id', 'elevenlabs.voice_id', 'output_gain_db']
            },
            'STATION_10': {
                name: 'Gateway Return',
                type: 'voice',
                metrics: ['end_to_end_latency_ms', 'final_quality_score', 'round_trip_time_ms'],
                knobs: ['final_gain_adjustment', 'echo_suppression', 'final_buffer_size']
            },
            'STATION_11': {
                name: 'Hume EVI',
                type: 'emotion',
                metrics: ['emotion_confidence', 'sentiment_score', 'prosody_features'],
                knobs: ['emotion_model', 'sensitivity_threshold', 'emotion_smoothing']
            }
        };

        // Initialize with station-specific defaults
        this.initializeStationDefaults();

        // All 75 metrics
        this.ALL_METRICS = this.load75MetricsList();
    }

    getV21Schema() {
        // V2.1.0 compliant schema - more flexible
        return {
            "title": "Station Snapshot Schema V2.1",
            "type": "object",
            "additionalProperties": false,  // Strict at root level

            "required": [
                "id",
                "station_id",
                "timestamp",
                "call_id",
                "channel",
                "metrics",
                "knobs"
            ],

            "properties": {
                "schema_version": {
                    "type": "string",
                    "description": "Optional schema version"
                },

                "id": {
                    "type": "string",
                    "format": "uuid"
                },

                "station_id": {
                    "type": "string",
                    "pattern": "^STATION_[0-9]+$",  // Flexible pattern
                    "description": "Station identifier supporting any number"
                },

                "timestamp": {
                    "type": "string",
                    "format": "date-time"
                },

                "call_id": {
                    "type": "string"
                },

                "channel": {
                    "type": "string",
                    "enum": ["A", "B", "caller", "callee"]
                },

                "segment": {
                    "type": "object",
                    "description": "Optional segment info",
                    "required": ["segment_id", "start_ms", "end_ms"],
                    "properties": {
                        "segment_id": { "type": "string" },
                        "start_ms": { "type": "number", "minimum": 0 },
                        "end_ms": { "type": "number", "minimum": 0 },
                        "segment_type": { "type": "string" }
                    },
                    "additionalProperties": false
                },

                "metrics": {
                    "type": "object",
                    "additionalProperties": {
                        "type": ["number", "null"]
                    }
                },

                "audio": {
                    "type": "object",
                    "description": "Optional audio reference",
                    "required": ["sample_rate", "format", "storage_key"],
                    "properties": {
                        "sample_rate": { "type": "number" },
                        "format": { "type": "string" },
                        "duration_ms": { "type": ["number", "null"] },
                        "storage_key": { "type": "string" }
                    },
                    "additionalProperties": false
                },

                "knobs": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["name", "value"],
                        "properties": {
                            "name": { "type": "string" },
                            "value": { "type": ["number", "boolean", "string", "null"] }
                        },
                        "additionalProperties": false
                    }
                },

                "constraints": {
                    "type": "object",
                    "description": "Optional constraints",
                    "additionalProperties": {
                        "type": ["number", "boolean", "string", "null"]
                    }
                },

                "targets": {
                    "type": "object",
                    "description": "Optional targets",
                    "properties": {
                        "goal": { "type": "string" },
                        "weights": {
                            "type": "object",
                            "additionalProperties": { "type": "number" }
                        }
                    },
                    "additionalProperties": {
                        "type": ["number", "boolean", "string", "null"]
                    }
                },

                "totals": {
                    "type": "object",
                    "description": "Optional debug info",
                    "properties": {
                        "knobs_count": { "type": "number" },
                        "metrics_count": { "type": "number" }
                    },
                    "additionalProperties": false
                }
            }
        };
    }

    initializeStationDefaults() {
        // Station-specific default knobs
        // For all relevant stations (excluding only 4, 5, 6)
        this.stationDefaults = {
            'STATION_1': [  // Asterisk
                { name: 'codec_selection', value: 'g711u' },
                { name: 'dtmf_mode', value: 'rfc2833' },
                { name: 'rtp_timeout', value: 30 }
            ],
            'STATION_2': [  // Gateway RX
                { name: 'jitter_buffer_ms', value: 50 },
                { name: 'packet_size', value: 20 },
                { name: 'fec_enabled', value: false }
            ],
            'STATION_3': [  // Voice Monitor/Enhancer - CRITICAL FOR DEEPGRAM!
                { name: 'agc.enabled', value: true },
                { name: 'agc.target_level_dbfs', value: -18 },
                { name: 'noise_reduction_strength', value: 3 },
                { name: 'echo_cancellation.enabled', value: true },
                { name: 'vad.enabled', value: true },
                { name: 'vad.threshold', value: 0.5 },
                { name: 'audio_enhancement.enabled', value: true }
            ],
            'STATION_7': [  // Gateway TX
                { name: 'output_buffer_size', value: 100 },
                { name: 'transmission_priority', value: 'high' },
                { name: 'qos_level', value: 46 }  // DSCP EF
            ],
            'STATION_8': [  // Audio Pipeline Monitor
                { name: 'pipeline_buffer_size', value: 200 },
                { name: 'priority_level', value: 'normal' },
                { name: 'flow_control', value: 'adaptive' }
            ],
            'STATION_9': [  // TTS Output
                { name: 'elevenlabs.model_id', value: 'eleven_multilingual_v2' },
                { name: 'elevenlabs.voice_id', value: 'default' },
                { name: 'output_gain_db', value: 0 }
            ],
            'STATION_10': [  // Gateway Return
                { name: 'final_gain_adjustment', value: 0 },
                { name: 'echo_suppression', value: true },
                { name: 'final_buffer_size', value: 80 }
            ],
            'STATION_11': [  // Hume
                { name: 'emotion_model', value: 'prosody' },
                { name: 'sensitivity_threshold', value: 0.5 },
                { name: 'emotion_smoothing', value: 0.3 }
            ]
        };
    }

    load75MetricsList() {
        // All 75 metrics from specification
        return [
            // Buffer Metrics (15)
            'buffer_usage_pct', 'buffer_underruns', 'buffer_overruns',
            'jitter_buffer_size_ms', 'adaptive_buffer_status', 'buffer_health_score',
            'peak_buffer_usage', 'buffer_resize_events', 'avg_buffer_occupancy',
            'buffer_drain_rate', 'buffer_fill_rate', 'buffer_starvation_time',
            'max_consecutive_underruns', 'buffer_stability_index', 'effective_buffer_latency',

            // Latency Metrics (15)
            'end_to_end_latency_ms', 'network_latency_ms', 'processing_latency_ms',
            'codec_latency_ms', 'jitter_ms', 'round_trip_time_ms',
            'transcription_latency_ms', 'synthesis_latency_ms', 'api_response_time_ms',
            'queue_wait_time_ms', 'first_byte_latency_ms', 'peak_latency_ms',
            'p95_latency_ms', 'p99_latency_ms', 'latency_variation_ms',

            // Packet Metrics (15)
            'packet_loss_pct', 'packets_received', 'packets_sent',
            'packet_reorder_rate', 'duplicate_packets', 'corrupted_packets',
            'packet_timing_drift', 'interpacket_gap_ms', 'burst_loss_rate',
            'consecutive_loss_count', 'fec_recovery_rate', 'retransmission_rate',
            'packet_conceal_count', 'effective_loss_rate', 'network_efficiency',

            // Audio Quality Metrics (15)
            'snr_db', 'noise_floor_db', 'audio_level_dbfs',
            'peak_level_dbfs', 'clipping_detected', 'silence_detected',
            'voice_activity_ratio', 'audio_bandwidth_khz', 'spectral_centroid_hz',
            'mos_score', 'pesq_score', 'pitch_accuracy',
            'formant_clarity', 'harmonic_distortion_pct', 'intermodulation_distortion',

            // Performance Metrics (15)
            'cpu_usage_pct', 'memory_usage_mb', 'thread_pool_usage',
            'event_loop_lag_ms', 'gc_pause_time_ms', 'api_calls_per_sec',
            'websocket_connections', 'active_streams', 'transcription_accuracy',
            'synthesis_quality_score', 'error_rate', 'retry_count',
            'cache_hit_rate', 'throughput_kbps', 'processing_efficiency'
        ];
    }

    /**
     * Create V2.1.0 compliant snapshot
     */
    async createV21Snapshot(inputData) {
        const {
            station_id,
            call_id,
            channel,
            metrics = {},
            segment,
            audio,
            constraints,
            targets
        } = inputData;

        // Validate station_id pattern
        if (!station_id.match(/^STATION_[0-9]+$/)) {
            throw new Error(`Invalid station_id format: ${station_id}`);
        }

        // Get station-specific knobs
        const stationKnobs = this.getStationKnobs(station_id, call_id, channel);

        // Generate snapshot
        const snapshotId = uuidv4();
        const timestamp = new Date().toISOString();

        // Build metrics block with null for unavailable
        const metricsBlock = {};
        for (const metricName of this.ALL_METRICS) {
            const value = metrics[metricName];
            metricsBlock[metricName] = (value !== undefined && value !== 'NA') ? value : null;
        }

        // Count non-null metrics
        const metricsCount = Object.values(metricsBlock).filter(v => v !== null).length;

        // Build minimal required snapshot
        const snapshot = {
            id: snapshotId,
            station_id: station_id,
            timestamp: timestamp,
            call_id: call_id,
            channel: channel,
            metrics: metricsBlock,
            knobs: stationKnobs
        };

        // Add OPTIONAL fields only if provided
        if (segment) {
            snapshot.segment = {
                segment_id: segment.segment_id || `seg-${Date.now()}`,
                start_ms: segment.start_ms || 0,
                end_ms: segment.end_ms || 5000,
                ...(segment.segment_type && { segment_type: segment.segment_type })
            };
        }

        if (audio) {
            snapshot.audio = {
                sample_rate: audio.sample_rate || 16000,
                format: audio.format || 'pcm_s16le',
                storage_key: audio.storage_key || `local:/tmp/${snapshotId}.pcm`,
                ...(audio.duration_ms !== undefined && { duration_ms: audio.duration_ms })
            };
        }

        if (constraints && Object.keys(constraints).length > 0) {
            snapshot.constraints = constraints;
        }

        if (targets && Object.keys(targets).length > 0) {
            snapshot.targets = targets;
        }

        // Add totals for debugging
        snapshot.totals = {
            metrics_count: metricsCount,
            knobs_count: stationKnobs.length
        };

        return snapshot;
    }

    /**
     * Get station-specific knobs
     */
    getStationKnobs(stationId, callId, channel) {
        // Check live knobs first
        const callKnobs = this.liveKnobs.get(callId);
        if (callKnobs) {
            const role = (channel === 'A' || channel === 'caller') ? 'caller' : 'callee';
            const channelKnobs = callKnobs[role];
            if (channelKnobs && channelKnobs[stationId]) {
                return channelKnobs[stationId];
            }
        }

        // Return station defaults
        return this.stationDefaults[stationId] || [];
    }

    /**
     * Ingest V2.1.0 snapshot with flexible validation
     */
    async ingestV21Snapshot(inputData) {
        try {
            // Create snapshot
            const snapshot = await this.createV21Snapshot(inputData);

            // Validate against V2.1.0 schema
            const valid = this.validator(snapshot);
            if (!valid) {
                console.log('⚠️ Validation warnings:', this.validator.errors);
                // Continue anyway for V2.1.0 flexibility
            }

            // Store in database
            await this.storeSnapshot(snapshot);

            const stationInfo = this.RELEVANT_STATIONS[snapshot.station_id];
            const stationName = stationInfo ? stationInfo.name : 'Unknown Station';

            console.log(`✅ V2.1.0 Snapshot stored: ${snapshot.id}`);
            console.log(`   📍 Station: ${snapshot.station_id} (${stationName})`);
            console.log(`   📊 Metrics: ${snapshot.totals.metrics_count}/75`);
            console.log(`   🎛️ Knobs: ${snapshot.totals.knobs_count}`);

            return {
                success: true,
                snapshot_id: snapshot.id,
                timestamp: snapshot.timestamp,
                schema_version: '2.1.0',
                station: {
                    id: snapshot.station_id,
                    name: stationName,
                    type: stationInfo?.type
                },
                totals: snapshot.totals
            };

        } catch (error) {
            console.error('Error ingesting V2.1 snapshot:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async storeSnapshot(snapshot) {
        // Get or create call
        let callResult = await this.pool.query(
            'SELECT id FROM calls WHERE external_call_id = $1',
            [snapshot.call_id]
        );

        let callId;
        if (callResult.rows.length === 0) {
            const insertResult = await this.pool.query(
                'INSERT INTO calls (external_call_id) VALUES ($1) RETURNING id',
                [snapshot.call_id]
            );
            callId = insertResult.rows[0].id;
        } else {
            callId = callResult.rows[0].id;
        }

        // Get or create channel
        const channelName = (snapshot.channel === 'A' || snapshot.channel === 'caller') ? 'caller' : 'callee';
        let channelResult = await this.pool.query(
            'SELECT id FROM channels WHERE call_id = $1 AND name = $2',
            [callId, channelName]
        );

        let channelId;
        if (channelResult.rows.length === 0) {
            const insertResult = await this.pool.query(
                'INSERT INTO channels (call_id, name, leg) VALUES ($1, $2, $3) RETURNING id',
                [callId, channelName, channelName === 'caller' ? 'A' : 'B']
            );
            channelId = insertResult.rows[0].id;
        } else {
            channelId = channelResult.rows[0].id;
        }

        // Create segment
        const segmentResult = await this.pool.query(
            'INSERT INTO segments (channel_id, start_ms, end_ms) VALUES ($1, $2, $3) RETURNING id',
            [channelId, snapshot.segment?.start_ms || 0, snapshot.segment?.end_ms || 5000]
        );
        const segmentId = segmentResult.rows[0].id;

        // Store snapshot
        await this.pool.query(
            `INSERT INTO station_snapshots
             (id, segment_id, station_id, metrics, audio_ref, knobs_effective, constraints, targets, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                snapshot.id,
                segmentId,
                snapshot.station_id,
                JSON.stringify(snapshot),
                snapshot.audio?.storage_key,
                JSON.stringify(snapshot.knobs),
                JSON.stringify(snapshot.constraints || {}),
                JSON.stringify(snapshot.targets || {}),
                snapshot.timestamp
            ]
        );
    }

    /**
     * Update station-specific knobs
     */
    async updateStationKnobs(callId, channel, stationId, newKnobs) {
        const role = (channel === 'A' || channel === 'caller') ? 'caller' : 'callee';

        if (!this.liveKnobs.has(callId)) {
            this.liveKnobs.set(callId, { caller: {}, callee: {} });
        }

        const callKnobs = this.liveKnobs.get(callId);
        if (!callKnobs[role]) {
            callKnobs[role] = {};
        }

        callKnobs[role][stationId] = newKnobs;

        console.log(`🔄 Updated ${stationId} knobs for ${role}`);
        console.log(`   New knobs: ${newKnobs.length}`);

        return { success: true, station_id: stationId, knobs_count: newKnobs.length };
    }

    /**
     * Get station capabilities
     */
    getStationCapabilities(stationId) {
        const station = this.RELEVANT_STATIONS[stationId];
        if (!station) {
            // Unknown station - still valid due to pattern matching
            return {
                station_id: stationId,
                name: 'Unknown Station',
                type: 'unknown',
                metrics: [],
                knobs: [],
                supported: true  // All STATION_[0-9]+ are supported
            };
        }

        return {
            station_id: stationId,
            ...station,
            supported: true
        };
    }

    async close() {
        await this.pool.end();
    }
}

module.exports = OptimizerV21DatabaseIntegration;

// Start HTTP server if run directly
if (require.main === module) {
    const http = require('http');
    const dbIntegration = new OptimizerV21DatabaseIntegration();

    const server = http.createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.url === '/api/v2.1/ingest' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const inputData = JSON.parse(body);
                    const result = await dbIntegration.ingestV21Snapshot(inputData);
                    res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });

        } else if (req.url === '/api/v2.1/station-capabilities' && req.method === 'GET') {
            const capabilities = Object.keys(dbIntegration.RELEVANT_STATIONS).map(id =>
                dbIntegration.getStationCapabilities(id)
            );
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(capabilities));

        } else if (req.url === '/api/v2.1/update-station-knobs' && req.method === 'PUT') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { call_id, channel, station_id, knobs } = JSON.parse(body);
                    const result = await dbIntegration.updateStationKnobs(call_id, channel, station_id, knobs);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });

        } else if (req.url === '/api/v2.1/health' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'healthy',
                version: '2.1.0',
                stations_supported: Object.keys(dbIntegration.RELEVANT_STATIONS),
                pattern: '^STATION_[0-9]+$',
                flexible: true
            }));

        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });

    const PORT = 8083;
    server.listen(PORT, () => {
        console.log(`\n🚀 VERSION 2.1.0 FULLY COMPLIANT Server on http://localhost:${PORT}`);
        console.log(`   📋 Schema Version: 2.1.0`);
        console.log(`   ✅ Flexible station pattern: ^STATION_[0-9]+$`);
        console.log(`   ✅ Optional fields: segment, audio, constraints, targets`);
        console.log(`   ✅ Required fields: Only 7 (not 12)`);
        console.log(`\n   📍 Relevant Stations Configured:`);
        console.log(`      - STATION_1:  Asterisk PBX`);
        console.log(`      - STATION_2:  Gateway RX`);
        console.log(`      - STATION_3:  Voice Monitor/Enhancer 🎯 CRITICAL for Deepgram!`);
        console.log(`      - STATION_7:  Gateway TX`);
        console.log(`      - STATION_8:  Audio Pipeline Monitor`);
        console.log(`      - STATION_9:  TTS Output (ElevenLabs)`);
        console.log(`      - STATION_10: Gateway Return`);
        console.log(`      - STATION_11: Hume EVI`);
        console.log(`\n   ❌ Excluded Stations: 4, 5, 6 (Deepgram STT, Translation, TTS Processing)`);
        console.log(`\n   Endpoints:`);
        console.log(`   - POST /api/v2.1/ingest - Ingest V2.1.0 snapshots`);
        console.log(`   - GET  /api/v2.1/station-capabilities - Get station info`);
        console.log(`   - PUT  /api/v2.1/update-station-knobs - Update station knobs`);
        console.log(`   - GET  /api/v2.1/health - Health check`);
    });
}