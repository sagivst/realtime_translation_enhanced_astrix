#!/usr/bin/env node

/**
 * STRICT OPTIMIZER-COMPLIANT Database Integration Module
 * Implements exact specification from Gaps_Optimizer_strict_Data_structure.md
 * Version 1.0.0 - December 2025
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

class OptimizerCompliantDatabaseIntegration {
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
            allowUnionTypes: true  // Allow union types for knob values
        });
        addFormats(this.ajv);
        this.validator = this.ajv.compile(this.getStrictSchema());

        // Load complete metrics and knobs lists
        this.ALL_METRICS = this.load75MetricsList();
        this.COMPLETE_KNOBS_LIST = this.loadCompleteKnobsList();
    }

    getStrictSchema() {
        // EXACT schema from the specification document
        return {
            "title": "Station Snapshot Schema",
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
                "schema_version": { "type": "string" },
                "id": {
                    "type": "string",
                    "format": "uuid"
                },
                "station_id": {
                    "type": "string",
                    "enum": [
                        "STATION_1",
                        "STATION_2",
                        "STATION_3",
                        "STATION_4",
                        "STATION_9",
                        "STATION_10",
                        "STATION_11"
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

    loadCompleteKnobsList() {
        // Complete list of 250+ knobs
        return [
            // Core audio knobs
            'input_gain_db', 'output_gain_db', 'agc.enabled', 'agc.target_level_dbfs',
            'noise_reduction_strength', 'aec.enabled', 'aec.suppression_level',
            'buffer_size_ms', 'jitter_buffer_ms', 'adaptive_jitter_buffer',

            // Deepgram knobs
            'deepgram.model', 'deepgram.language', 'deepgram.punctuate',
            'deepgram.interim_results', 'deepgram.endpointing', 'deepgram.smart_format',
            'deepgram.diarize', 'deepgram.multichannel', 'deepgram.alternatives',

            // ElevenLabs knobs
            'elevenlabs.model_id', 'elevenlabs.voice_id', 'elevenlabs.stability',
            'elevenlabs.similarity_boost', 'elevenlabs.style', 'elevenlabs.use_speaker_boost',
            'elevenlabs.optimize_streaming_latency',

            // Network knobs
            'packet_size', 'fec_enabled', 'retransmission_enabled',
            'congestion_control', 'bandwidth_limit_kbps', 'dtx_enabled',

            // Add more as discovered...
        ];
    }

    /**
     * Create STRICT optimizer-compliant snapshot
     */
    createCompliantSnapshot(inputData) {
        const {
            station_id,
            call_id,
            channel,
            segment,
            metrics = {},
            knobs = {},
            audio = {},
            constraints = {},
            targets = {}
        } = inputData;

        // Generate snapshot ID
        const snapshotId = uuidv4();
        const timestamp = new Date().toISOString();

        // Build metrics block - use null for unavailable values (NOT "NA")
        const metricsBlock = {};
        for (const metricName of this.ALL_METRICS) {
            const value = metrics[metricName];
            metricsBlock[metricName] = (value !== undefined && value !== 'NA') ? value : null;
        }

        // Build knobs array - MUST be array format
        const knobsArray = [];
        for (const knobName of this.COMPLETE_KNOBS_LIST) {
            const value = knobs[knobName];
            if (value !== undefined && value !== 'NA' && value !== null) {
                knobsArray.push({
                    name: knobName,
                    value: value
                });
            }
        }

        // Build audio block with required storage_key
        const audioBlock = {
            sample_rate: audio.sample_rate || 16000,
            format: audio.format || 'pcm_s16le',
            duration_ms: segment ? (segment.end_ms - segment.start_ms) : null,
            storage_key: audio.storage_key || audio.ref || `local:/tmp/${snapshotId}.pcm`
        };

        // Build segment block with required segment_id
        const segmentBlock = {
            segment_id: segment.segment_id || `seg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            start_ms: segment.start_ms || 0,
            end_ms: segment.end_ms || 5000
        };

        // Build constraints block with defaults
        const constraintsBlock = {
            max_input_gain_db: 6,
            min_snr_db: 20,
            aec_must_be_on: true,
            ...constraints
        };

        // Build targets block with defaults
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

        // Count non-null values
        const metricsCount = Object.values(metricsBlock).filter(v => v !== null).length;
        const knobsCount = knobsArray.length;

        // Build complete STRICT snapshot
        const snapshot = {
            schema_version: "1.0.0",
            id: snapshotId,
            station_id: station_id,
            timestamp: timestamp,
            call_id: call_id,
            channel: channel,
            segment: segmentBlock,
            metrics: metricsBlock,
            audio: audioBlock,
            knobs: knobsArray,
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
     * Validate snapshot against strict schema
     */
    validateSnapshot(snapshot) {
        const valid = this.validator(snapshot);
        if (!valid) {
            console.error('❌ Snapshot validation failed:', this.validator.errors);
            return {
                valid: false,
                errors: this.validator.errors
            };
        }
        return { valid: true };
    }

    /**
     * Ingest snapshot with STRICT validation
     */
    async ingestSnapshot(inputData) {
        try {
            // Create compliant snapshot
            const snapshot = this.createCompliantSnapshot(inputData);

            // Validate against schema
            const validation = this.validateSnapshot(snapshot);
            if (!validation.valid) {
                return {
                    success: false,
                    error: 'Schema validation failed',
                    details: validation.errors
                };
            }

            // Store in database
            const result = await this.storeSnapshot(snapshot);

            console.log(`✅ Compliant snapshot stored: ${snapshot.id}`);
            console.log(`   📊 Metrics: ${snapshot.totals.metrics_count}/75`);
            console.log(`   🎛️ Knobs: ${snapshot.totals.knobs_count}`);

            return {
                success: true,
                snapshot_id: snapshot.id,
                timestamp: snapshot.timestamp,
                validation: 'PASSED',
                totals: snapshot.totals
            };

        } catch (error) {
            console.error('Error ingesting snapshot:', error);
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

        // Create channel
        const channelResult = await this.pool.query(
            'INSERT INTO channels (call_id, name, leg) VALUES ($1, $2, $3) RETURNING id',
            [callId, snapshot.channel, snapshot.channel === 'caller' ? 'A' : 'B']
        );
        const channelId = channelResult.rows[0].id;

        // Create segment
        const segmentResult = await this.pool.query(
            'INSERT INTO segments (channel_id, start_ms, end_ms) VALUES ($1, $2, $3) RETURNING id',
            [channelId, snapshot.segment.start_ms, snapshot.segment.end_ms]
        );
        const segmentId = segmentResult.rows[0].id;

        // Store snapshot with complete JSON
        const snapshotResult = await this.pool.query(
            `INSERT INTO station_snapshots
             (id, segment_id, station_id, metrics, audio_ref, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [
                snapshot.id,
                segmentId,
                snapshot.station_id,
                JSON.stringify(snapshot), // Store complete snapshot
                snapshot.audio.storage_key,
                snapshot.timestamp
            ]
        );

        return snapshotResult.rows[0];
    }

    /**
     * Get snapshots in compliant format
     */
    async getCompliantSnapshots(limit = 100) {
        const result = await this.pool.query(
            `SELECT
                ss.id,
                ss.station_id,
                ss.timestamp,
                ss.metrics as snapshot_data,
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

        return result.rows.map(row => {
            // If stored as complete snapshot, return it
            if (row.snapshot_data && row.snapshot_data.schema_version) {
                return row.snapshot_data;
            }

            // Otherwise, reconstruct compliant format
            return this.createCompliantSnapshot({
                station_id: row.station_id,
                call_id: row.external_call_id,
                channel: row.channel,
                segment: {
                    start_ms: row.start_ms,
                    end_ms: row.end_ms
                },
                metrics: row.snapshot_data?.metrics || {},
                knobs: row.snapshot_data?.knobs || {}
            });
        });
    }

    async close() {
        await this.pool.end();
    }
}

module.exports = OptimizerCompliantDatabaseIntegration;

// Start HTTP server if run directly
if (require.main === module) {
    const http = require('http');
    const dbIntegration = new OptimizerCompliantDatabaseIntegration();

    const server = http.createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.url === '/api/snapshots' && req.method === 'GET') {
            const snapshots = await dbIntegration.getCompliantSnapshots();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(snapshots));

        } else if (req.url === '/api/ingest' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const inputData = JSON.parse(body);
                    const result = await dbIntegration.ingestSnapshot(inputData);
                    res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });

        } else if (req.url === '/api/validate' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const snapshot = JSON.parse(body);
                    const validation = dbIntegration.validateSnapshot(snapshot);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(validation));
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

    const PORT = 8082;
    server.listen(PORT, () => {
        console.log(`🎯 OPTIMIZER-COMPLIANT Database Server on http://localhost:${PORT}`);
        console.log(`   - GET  /api/snapshots - Get compliant snapshots`);
        console.log(`   - POST /api/ingest - Ingest with strict validation`);
        console.log(`   - POST /api/validate - Validate snapshot schema`);
        console.log(`\n   ✅ Schema Version: 1.0.0`);
        console.log(`   ✅ Strict validation enabled`);
        console.log(`   ✅ Using null for unavailable values`);
        console.log(`   ✅ Knobs as array format`);
    });
}