#!/usr/bin/env node

/**
 * VERSION 2.0.0 OPTIMIZER-COMPLIANT Database Integration
 * Implements complete hierarchy: Call → Channel → SessionConfig → Segment → StationSnapshot
 * Supports TWO independent knob sets (caller + callee)
 * December 2025
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

class OptimizerV2DatabaseIntegration {
    constructor() {
        this.pool = new Pool({
            host: 'localhost',
            port: 5432,
            database: 'audio_optimization',
            user: process.env.USER || 'sagivstavinsky'
        });

        // Initialize JSON Schema validator
        this.ajv = new Ajv({
            strict: true,
            allErrors: true,
            allowUnionTypes: true
        });
        addFormats(this.ajv);
        this.validator = this.ajv.compile(this.getV2Schema());

        // In-memory live knobs storage (per call, per channel)
        this.liveKnobs = new Map(); // Map<callId, { caller: knobs[], callee: knobs[] }>

        // Load metrics and knobs definitions
        this.ALL_METRICS = this.load75MetricsList();
        this.initializeLiveKnobs();
    }

    getV2Schema() {
        // Version 2.0.0 schema
        return {
            "title": "Station Snapshot Schema V2",
            "type": "object",
            "required": [
                "schema_version",
                "id",
                "station_id",
                "timestamp",
                "call_id",
                "channel",
                "segment",
                "metrics",
                "audio",
                "knobs",
                "constraints",
                "targets"
            ],
            "properties": {
                "schema_version": {
                    "type": "string",
                    "const": "2.0.0"  // Must be version 2.0.0
                },
                "id": {
                    "type": "string",
                    "format": "uuid"
                },
                "station_id": {
                    "type": "string",
                    "enum": [
                        "STATION_1", "STATION_2", "STATION_3", "STATION_4",
                        "STATION_9", "STATION_10", "STATION_11"
                    ]
                },
                "timestamp": { "type": "string", "format": "date-time" },
                "call_id": { "type": "string" },
                "channel": {
                    "type": "string",
                    "enum": ["A", "B", "caller", "callee"]
                },
                "segment": {
                    "type": "object",
                    "required": ["segment_id", "start_ms", "end_ms"],
                    "properties": {
                        "segment_id": { "type": "string" },
                        "start_ms": { "type": "number", "minimum": 0 },
                        "end_ms": { "type": "number", "minimum": 0 }
                    }
                },
                "metrics": {
                    "type": "object",
                    "additionalProperties": {
                        "type": ["number", "null"]
                    }
                },
                "audio": {
                    "type": "object",
                    "required": ["sample_rate", "format", "storage_key"],
                    "properties": {
                        "sample_rate": { "type": "number" },
                        "format": { "type": "string" },
                        "duration_ms": { "type": ["number", "null"] },
                        "storage_key": { "type": "string" }
                    }
                },
                "knobs": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["name", "value"],
                        "properties": {
                            "name": { "type": "string" },
                            "value": { "type": ["number", "boolean", "string", "null"] }
                        }
                    }
                },
                "constraints": {
                    "type": "object",
                    "additionalProperties": {
                        "type": ["number", "boolean", "string", "null"]
                    }
                },
                "targets": {
                    "type": "object",
                    "properties": {
                        "goal": { "type": "string" },
                        "weights": {
                            "type": "object",
                            "additionalProperties": { "type": "number" }
                        }
                    }
                },
                "totals": {
                    "type": "object",
                    "properties": {
                        "knobs_count": { "type": "number" },
                        "metrics_count": { "type": "number" }
                    }
                }
            }
        };
    }

    load75MetricsList() {
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

    initializeLiveKnobs() {
        // Default knob configurations for caller and callee
        this.defaultKnobs = {
            caller: [
                { name: 'agc.enabled', value: true },
                { name: 'agc.target_level_dbfs', value: -18 },
                { name: 'noise_reduction_strength', value: 3 },
                { name: 'aec.enabled', value: true },
                { name: 'input_gain_db', value: 0 },
                { name: 'deepgram.model', value: 'nova-2' },
                { name: 'deepgram.language', value: 'en' }
            ],
            callee: [
                { name: 'agc.enabled', value: true },
                { name: 'agc.target_level_dbfs', value: -16 },
                { name: 'noise_reduction_strength', value: 2 },
                { name: 'aec.enabled', value: false },
                { name: 'output_gain_db', value: 0 },
                { name: 'elevenlabs.model_id', value: 'eleven_multilingual_v2' },
                { name: 'elevenlabs.voice_id', value: 'default' }
            ]
        };
    }

    /**
     * Create or get session configs for a call
     */
    async getOrCreateSessionConfigs(callId, callExtId) {
        // Check if configs exist
        const existing = await this.pool.query(
            'SELECT * FROM session_configs WHERE call_id = $1 AND active = true',
            [callId]
        );

        if (existing.rows.length >= 2) {
            // Load into live knobs
            const configs = {};
            for (const row of existing.rows) {
                configs[row.role] = row.knobs;
            }
            this.liveKnobs.set(callExtId, configs);
            return existing.rows;
        }

        // Create new configs for both channels
        const configs = [];

        // Create caller config
        const callerChannelResult = await this.pool.query(
            'SELECT id FROM channels WHERE call_id = $1 AND name = $2',
            [callId, 'caller']
        );

        let callerChannelId;
        if (callerChannelResult.rows.length === 0) {
            const newChannel = await this.pool.query(
                'INSERT INTO channels (call_id, name, leg) VALUES ($1, $2, $3) RETURNING id',
                [callId, 'caller', 'A']
            );
            callerChannelId = newChannel.rows[0].id;
        } else {
            callerChannelId = callerChannelResult.rows[0].id;
        }

        const callerConfig = await this.pool.query(
            `INSERT INTO session_configs
             (call_id, channel_id, role, knobs, version, active)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [callId, callerChannelId, 'caller', JSON.stringify(this.defaultKnobs.caller), 1, true]
        );
        configs.push(callerConfig.rows[0]);

        // Create callee config
        const calleeChannelResult = await this.pool.query(
            'SELECT id FROM channels WHERE call_id = $1 AND name = $2',
            [callId, 'callee']
        );

        let calleeChannelId;
        if (calleeChannelResult.rows.length === 0) {
            const newChannel = await this.pool.query(
                'INSERT INTO channels (call_id, name, leg) VALUES ($1, $2, $3) RETURNING id',
                [callId, 'callee', 'B']
            );
            calleeChannelId = newChannel.rows[0].id;
        } else {
            calleeChannelId = calleeChannelResult.rows[0].id;
        }

        const calleeConfig = await this.pool.query(
            `INSERT INTO session_configs
             (call_id, channel_id, role, knobs, version, active)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [callId, calleeChannelId, 'callee', JSON.stringify(this.defaultKnobs.callee), 1, true]
        );
        configs.push(calleeConfig.rows[0]);

        // Store in live knobs
        this.liveKnobs.set(callExtId, {
            caller: this.defaultKnobs.caller,
            callee: this.defaultKnobs.callee
        });

        console.log(`📋 Created session configs for call ${callExtId}`);
        console.log(`   Caller knobs: ${this.defaultKnobs.caller.length}`);
        console.log(`   Callee knobs: ${this.defaultKnobs.callee.length}`);

        return configs;
    }

    /**
     * Get effective knobs for a channel
     */
    getEffectiveKnobs(callId, channel) {
        const callKnobs = this.liveKnobs.get(callId);
        if (!callKnobs) {
            return [];
        }

        // Map channel names
        const role = (channel === 'A' || channel === 'caller') ? 'caller' : 'callee';
        return callKnobs[role] || [];
    }

    /**
     * Create V2.0.0 compliant snapshot
     */
    async createV2Snapshot(inputData) {
        const {
            station_id,
            call_id,
            channel,
            segment,
            metrics = {},
            audio = {},
            constraints = {},
            targets = {}
        } = inputData;

        // Get effective knobs for this channel
        const effectiveKnobs = this.getEffectiveKnobs(call_id, channel);

        // Generate IDs
        const snapshotId = uuidv4();
        const timestamp = new Date().toISOString();

        // Build metrics with null for unavailable
        const metricsBlock = {};
        for (const metricName of this.ALL_METRICS) {
            const value = metrics[metricName];
            metricsBlock[metricName] = (value !== undefined && value !== 'NA') ? value : null;
        }

        // Build audio block
        const audioBlock = {
            sample_rate: audio.sample_rate || 16000,
            format: audio.format || 'pcm_s16le',
            duration_ms: segment ? (segment.end_ms - segment.start_ms) : null,
            storage_key: audio.storage_key || `local:/tmp/${snapshotId}.pcm`
        };

        // Build segment block
        const segmentBlock = {
            segment_id: segment.segment_id || `seg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            start_ms: segment.start_ms || 0,
            end_ms: segment.end_ms || 5000
        };

        // Build constraints with defaults
        const constraintsBlock = {
            max_input_gain_db: 6,
            min_snr_db: 20,
            aec_must_be_on: true,
            ...constraints
        };

        // Build targets with defaults
        const targetsBlock = {
            goal: 'max_clarity',
            weights: {
                clarity: 0.55,
                noise: 0.25,
                echo: 0.15,
                latency: 0.05
            },
            ...targets
        };

        // Count values
        const metricsCount = Object.values(metricsBlock).filter(v => v !== null).length;
        const knobsCount = effectiveKnobs.length;

        // Build V2.0.0 snapshot
        const snapshot = {
            schema_version: "2.0.0",  // VERSION 2.0.0
            id: snapshotId,
            station_id: station_id,
            timestamp: timestamp,
            call_id: call_id,
            channel: channel,
            segment: segmentBlock,
            metrics: metricsBlock,
            audio: audioBlock,
            knobs: effectiveKnobs,  // Effective knobs for this channel
            constraints: constraintsBlock,
            targets: targetsBlock,
            totals: {
                metrics_count: metricsCount,
                knobs_count: knobsCount
            }
        };

        return snapshot;
    }

    /**
     * Ingest V2.0.0 snapshot
     */
    async ingestV2Snapshot(inputData) {
        try {
            // Get or create call
            let callResult = await this.pool.query(
                'SELECT id FROM calls WHERE external_call_id = $1',
                [inputData.call_id]
            );

            let callId;
            if (callResult.rows.length === 0) {
                const insertResult = await this.pool.query(
                    'INSERT INTO calls (external_call_id, direction) VALUES ($1, $2) RETURNING id',
                    [inputData.call_id, inputData.direction || 'inbound']
                );
                callId = insertResult.rows[0].id;
            } else {
                callId = callResult.rows[0].id;
            }

            // Get or create session configs
            const sessionConfigs = await this.getOrCreateSessionConfigs(callId, inputData.call_id);

            // Create V2 snapshot
            const snapshot = await this.createV2Snapshot(inputData);

            // Validate
            const valid = this.validator(snapshot);
            if (!valid) {
                return {
                    success: false,
                    error: 'Schema validation failed',
                    details: this.validator.errors
                };
            }

            // Get channel and session config
            const channelRole = (snapshot.channel === 'A' || snapshot.channel === 'caller') ? 'caller' : 'callee';
            const sessionConfig = sessionConfigs.find(c => c.role === channelRole);

            // Get or create channel
            let channelResult = await this.pool.query(
                'SELECT id FROM channels WHERE call_id = $1 AND name = $2',
                [callId, channelRole]
            );

            let channelId;
            if (channelResult.rows.length === 0) {
                const insertResult = await this.pool.query(
                    'INSERT INTO channels (call_id, name, leg) VALUES ($1, $2, $3) RETURNING id',
                    [callId, channelRole, channelRole === 'caller' ? 'A' : 'B']
                );
                channelId = insertResult.rows[0].id;
            } else {
                channelId = channelResult.rows[0].id;
            }

            // Create segment with session_config_id
            const segmentResult = await this.pool.query(
                'INSERT INTO segments (channel_id, session_config_id, start_ms, end_ms) VALUES ($1, $2, $3, $4) RETURNING id',
                [channelId, sessionConfig.id, snapshot.segment.start_ms, snapshot.segment.end_ms]
            );
            const segmentId = segmentResult.rows[0].id;

            // Store snapshot with knobs_effective
            await this.pool.query(
                `INSERT INTO station_snapshots
                 (id, segment_id, station_id, metrics, audio_ref, knobs_effective, constraints, targets, timestamp)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    snapshot.id,
                    segmentId,
                    snapshot.station_id,
                    JSON.stringify(snapshot),
                    snapshot.audio.storage_key,
                    JSON.stringify(snapshot.knobs),  // Store effective knobs
                    JSON.stringify(snapshot.constraints),
                    JSON.stringify(snapshot.targets),
                    snapshot.timestamp
                ]
            );

            console.log(`✅ V2.0.0 Snapshot stored: ${snapshot.id}`);
            console.log(`   📊 Metrics: ${snapshot.totals.metrics_count}/75`);
            console.log(`   🎛️ Knobs: ${snapshot.totals.knobs_count} (${channelRole} channel)`);
            console.log(`   📋 Session Config: v${sessionConfig.version}`);

            return {
                success: true,
                snapshot_id: snapshot.id,
                timestamp: snapshot.timestamp,
                schema_version: '2.0.0',
                channel_config: channelRole,
                session_version: sessionConfig.version,
                validation: 'PASSED',
                totals: snapshot.totals
            };

        } catch (error) {
            console.error('Error ingesting V2 snapshot:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update knobs from optimizer response
     */
    async updateKnobsFromOptimizer(callId, channel, newKnobs, optimizerRunId) {
        try {
            // Get current session config
            const role = (channel === 'A' || channel === 'caller') ? 'caller' : 'callee';

            const configResult = await this.pool.query(
                'SELECT * FROM session_configs WHERE call_id = $1 AND role = $2 AND active = true',
                [callId, role]
            );

            if (configResult.rows.length === 0) {
                throw new Error(`No active session config for ${role}`);
            }

            const currentConfig = configResult.rows[0];
            const newVersion = currentConfig.version + 1;

            // Deactivate current config
            await this.pool.query(
                'UPDATE session_configs SET active = false WHERE id = $1',
                [currentConfig.id]
            );

            // Create new config with updated knobs
            await this.pool.query(
                `INSERT INTO session_configs
                 (call_id, channel_id, role, knobs, version, active)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [callId, currentConfig.channel_id, role, JSON.stringify(newKnobs), newVersion, true]
            );

            // Update live knobs
            const externalCallId = await this.getExternalCallId(callId);
            if (this.liveKnobs.has(externalCallId)) {
                const callKnobs = this.liveKnobs.get(externalCallId);
                callKnobs[role] = newKnobs;
            }

            console.log(`🔄 Updated ${role} knobs to version ${newVersion}`);
            console.log(`   New knobs count: ${newKnobs.length}`);

            return { success: true, version: newVersion };

        } catch (error) {
            console.error('Error updating knobs:', error);
            return { success: false, error: error.message };
        }
    }

    async getExternalCallId(callId) {
        const result = await this.pool.query(
            'SELECT external_call_id FROM calls WHERE id = $1',
            [callId]
        );
        return result.rows[0]?.external_call_id;
    }

    async close() {
        await this.pool.end();
    }
}

module.exports = OptimizerV2DatabaseIntegration;

// Start HTTP server if run directly
if (require.main === module) {
    const http = require('http');
    const dbIntegration = new OptimizerV2DatabaseIntegration();

    const server = http.createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.url === '/api/v2/ingest' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const inputData = JSON.parse(body);
                    const result = await dbIntegration.ingestV2Snapshot(inputData);
                    res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });

        } else if (req.url === '/api/v2/update-knobs' && req.method === 'PUT') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { call_id, channel, knobs, optimizer_run_id } = JSON.parse(body);

                    // Get internal call ID
                    const callResult = await dbIntegration.pool.query(
                        'SELECT id FROM calls WHERE external_call_id = $1',
                        [call_id]
                    );

                    if (callResult.rows.length === 0) {
                        throw new Error('Call not found');
                    }

                    const result = await dbIntegration.updateKnobsFromOptimizer(
                        callResult.rows[0].id,
                        channel,
                        knobs,
                        optimizer_run_id
                    );

                    res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });

        } else if (req.url === '/api/v2/live-knobs' && req.method === 'GET') {
            const liveKnobsArray = Array.from(dbIntegration.liveKnobs.entries()).map(([callId, knobs]) => ({
                call_id: callId,
                caller_knobs: knobs.caller,
                callee_knobs: knobs.callee
            }));

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(liveKnobsArray));

        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });

    const PORT = 8083;
    server.listen(PORT, () => {
        console.log(`🚀 VERSION 2.0.0 OPTIMIZER-COMPLIANT Server on http://localhost:${PORT}`);
        console.log(`   📋 Schema Version: 2.0.0`);
        console.log(`   🎯 Two-channel knob model (caller + callee)`);
        console.log(`   ✅ Full hierarchy: Call → Channel → SessionConfig → Segment → Snapshot`);
        console.log(`\n   Endpoints:`);
        console.log(`   - POST /api/v2/ingest - Ingest V2.0.0 snapshots`);
        console.log(`   - PUT  /api/v2/update-knobs - Update knobs from optimizer`);
        console.log(`   - GET  /api/v2/live-knobs - View current live knobs`);
    });
}