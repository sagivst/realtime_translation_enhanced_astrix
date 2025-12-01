#!/usr/bin/env node

/**
 * Generate specification-compliant monitoring data
 * Matches AI-Driven Recursive Audio Optimization System format exactly
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class SpecCompliantDataGenerator {
    constructor() {
        this.pool = new Pool({
            host: 'localhost',
            port: 5432,
            database: 'audio_optimization',
            user: 'postgres'
        });

        this.audioDir = '/home/azureuser/audio-snapshots';
    }

    async generateCompleteDataset() {
        console.log('🚀 Generating specification-compliant monitoring data...\n');

        // Create multiple calls with segments
        const calls = [
            { id: 'ext-12345', direction: 'inbound', caller: '3333', callee: '4444' },
            { id: 'ext-12346', direction: 'outbound', caller: '4444', callee: '3333' },
            { id: 'ext-12347', direction: 'inbound', caller: '3333', callee: '4444' }
        ];

        for (const callInfo of calls) {
            await this.generateCallData(callInfo);
        }

        console.log('\n✅ Complete dataset generated!');
    }

    async generateCallData(callInfo) {
        console.log(`📞 Generating call: ${callInfo.id}`);

        // Create call record
        const callResult = await this.pool.query(
            `INSERT INTO calls (external_call_id, direction, metadata, created_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP - INTERVAL '${Math.random() * 24} hours')
             RETURNING id, created_at`,
            [callInfo.id, callInfo.direction, JSON.stringify({ caller: callInfo.caller, callee: callInfo.callee })]
        );
        const callId = callResult.rows[0].id;
        const callTime = callResult.rows[0].created_at;

        // Create channels (A-leg and B-leg)
        const channels = [
            { name: 'caller', leg: 'A' },
            { name: 'callee', leg: 'B' }
        ];

        for (const channel of channels) {
            const channelResult = await this.pool.query(
                `INSERT INTO channels (call_id, name, leg, metadata)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id`,
                [callId, channel.name, channel.leg, JSON.stringify({ extension: channel.name === 'caller' ? '3333' : '4444' })]
            );
            const channelId = channelResult.rows[0].id;

            // Generate segments for each channel
            await this.generateSegmentsForChannel(channelId, callInfo.id, channel.name, callTime);
        }

        // Mark call as ended
        await this.pool.query(
            `UPDATE calls SET ended_at = created_at + INTERVAL '${5 + Math.random() * 10} minutes' WHERE id = $1`,
            [callId]
        );
    }

    async generateSegmentsForChannel(channelId, externalCallId, channelName, callTime) {
        // Generate 3-5 segments per channel
        const segmentCount = 3 + Math.floor(Math.random() * 3);
        let currentTime = 0;

        for (let i = 0; i < segmentCount; i++) {
            const segmentDuration = 4000 + Math.random() * 2000; // 4-6 seconds
            const startMs = currentTime;
            const endMs = currentTime + segmentDuration;

            // Create segment
            const segmentResult = await this.pool.query(
                `INSERT INTO segments (channel_id, start_ms, end_ms, segment_type, transcript, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`,
                [
                    channelId,
                    startMs,
                    endMs,
                    'speech',
                    `Transcript for segment ${i + 1}: This is a sample conversation segment.`,
                    new Date(callTime.getTime() + currentTime)
                ]
            );
            const segmentId = segmentResult.rows[0].id;

            // Generate snapshots for different stations
            const stations = ['STATION_1', 'STATION_2', 'STATION_3', 'STATION_4', 'STATION_9', 'STATION_10', 'STATION_11'];

            for (const stationId of stations) {
                await this.generateStationSnapshot(
                    segmentId,
                    stationId,
                    externalCallId,
                    channelName,
                    startMs,
                    endMs,
                    segmentDuration
                );
            }

            currentTime = endMs + 100; // Small gap between segments
        }
    }

    async generateStationSnapshot(segmentId, stationId, callId, channel, startMs, endMs, duration) {
        // Generate audio file reference
        const audioFilename = `${stationId.toLowerCase()}_${segmentId}_${startMs}_${endMs}.pcm`;
        const audioPath = path.join(this.audioDir, audioFilename);

        // Create dummy audio file
        if (!fs.existsSync(this.audioDir)) {
            fs.mkdirSync(this.audioDir, { recursive: true });
        }

        // Generate simple PCM audio data (sine wave)
        const sampleRate = 16000;
        const samples = Math.floor((duration / 1000) * sampleRate);
        const audioBuffer = Buffer.alloc(samples * 2);

        for (let i = 0; i < samples; i++) {
            const t = i / sampleRate;
            const freq = stationId === 'STATION_3' ? 440 : 220; // Different frequencies for different stations
            const sample = Math.sin(2 * Math.PI * freq * t) * 0.3;
            const value = Math.floor(sample * 32767);
            audioBuffer.writeInt16LE(value, i * 2);
        }

        fs.writeFileSync(audioPath, audioBuffer);

        // Generate metrics based on station capabilities
        const metrics = this.generateStationMetrics(stationId);

        // Generate logs
        const logs = this.generateStationLogs(stationId);

        // Prepare snapshot matching specification EXACTLY
        const snapshot = {
            schema_version: "1.0.0",
            payload_type: "segment_snapshot",
            call_id: callId,
            channel: channel,
            segment: {
                start_ms: startMs,
                end_ms: endMs,
                segment_id: `seg-${segmentId}`
            },
            station: {
                id: stationId,
                software_version: this.getStationVersion(stationId)
            },
            metrics: metrics,
            logs: logs,
            audio: {
                sample_rate: 16000,
                format: "pcm_s16le",
                duration_ms: duration,
                storage_key: audioPath // In production, this would be S3
            },
            constraints: this.getStationConstraints(stationId),
            targets: this.getStationTargets(stationId)
        };

        // Store in database
        await this.pool.query(
            `INSERT INTO station_snapshots (segment_id, station_id, metrics, logs, audio_ref, timestamp)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP - INTERVAL '${Math.random() * 24} hours')`,
            [
                segmentId,
                stationId,
                JSON.stringify(metrics),
                JSON.stringify(logs),
                audioPath
            ]
        );
    }

    generateStationMetrics(stationId) {
        const baseMetrics = {};

        // All 75 metrics with realistic values or NA
        const allMetrics = {
            // Buffer Metrics (15)
            buffer_usage_pct: Math.random() * 60 + 20,
            buffer_underruns: Math.floor(Math.random() * 3),
            buffer_overruns: Math.floor(Math.random() * 2),
            buffer_fill_rate: Math.random() * 100,
            buffer_drain_rate: Math.random() * 100,
            buffer_health: 85 + Math.random() * 15,
            circular_buffer_usage: Math.random() * 50 + 25,
            jitter_buffer_size: 40 + Math.random() * 20,
            adaptive_buffer_size: 50 + Math.random() * 30,
            buffer_reset_count: Math.floor(Math.random() * 2),
            max_buffer_usage: 70 + Math.random() * 20,
            min_buffer_free: 10 + Math.random() * 20,
            buffer_allocation_failures: 0,
            buffer_resize_events: Math.floor(Math.random() * 3),
            buffer_latency_ms: 5 + Math.random() * 15,

            // Latency Metrics (15)
            processing_latency: 5 + Math.random() * 20,
            network_latency: 10 + Math.random() * 40,
            codec_latency: 2 + Math.random() * 8,
            total_latency: 20 + Math.random() * 80,
            rtt_ms: 15 + Math.random() * 35,
            one_way_delay: 10 + Math.random() * 30,
            jitter_ms: 1 + Math.random() * 9,
            max_latency_spike: 50 + Math.random() * 100,
            latency_stability: 80 + Math.random() * 20,
            percentile_95_latency: 80 + Math.random() * 40,
            percentile_99_latency: 100 + Math.random() * 50,
            average_latency: 30 + Math.random() * 30,
            latency_variance: Math.random() * 20,
            latency_trend: -5 + Math.random() * 10,
            qos_latency_score: 70 + Math.random() * 30,

            // Packet Metrics (15)
            packets_sent: Math.floor(1000 + Math.random() * 5000),
            packets_received: Math.floor(980 + Math.random() * 4900),
            packets_lost: Math.floor(Math.random() * 50),
            packet_loss_rate: Math.random() * 2,
            packets_recovered: Math.floor(Math.random() * 20),
            fec_packets: Math.floor(Math.random() * 100),
            retransmitted_packets: Math.floor(Math.random() * 30),
            out_of_order_packets: Math.floor(Math.random() * 20),
            duplicate_packets: Math.floor(Math.random() * 10),
            packet_jitter: Math.random() * 5,
            interarrival_jitter: Math.random() * 4,
            packet_size_avg: 160 + Math.random() * 40,
            packet_size_variance: Math.random() * 20,
            burst_loss_rate: Math.random() * 1,
            gap_loss_rate: Math.random() * 0.5,

            // Audio Quality Metrics (15)
            audio_level_dbfs: -30 + Math.random() * 20,
            peak_amplitude: -6 + Math.random() * 6,
            rms_level: -25 + Math.random() * 15,
            snr_db: 15 + Math.random() * 30,
            thd_percent: Math.random() * 5,
            noise_floor_db: -70 + Math.random() * 20,
            speech_activity: 60 + Math.random() * 40,
            silence_ratio: Math.random() * 40,
            clipping_count: Math.floor(Math.random() * 5),
            zero_crossing_rate: 100 + Math.random() * 200,
            spectral_centroid: 1000 + Math.random() * 2000,
            spectral_rolloff: 3000 + Math.random() * 2000,
            mfcc_features: `[${Array(13).fill(0).map(() => Math.random() * 10).join(',')}]`,
            pitch_frequency: 100 + Math.random() * 200,
            formant_frequencies: `[${Array(4).fill(0).map(() => 500 + Math.random() * 2000).join(',')}]`,

            // Performance Metrics (15)
            cpu_usage_pct: 10 + Math.random() * 60,
            memory_usage_mb: 50 + Math.random() * 200,
            thread_count: 5 + Math.floor(Math.random() * 10),
            handle_count: 20 + Math.floor(Math.random() * 30),
            io_operations: Math.floor(100 + Math.random() * 500),
            cache_hits: Math.floor(1000 + Math.random() * 5000),
            cache_misses: Math.floor(10 + Math.random() * 100),
            gc_collections: Math.floor(Math.random() * 10),
            heap_allocated: 100 + Math.random() * 400,
            heap_used: 80 + Math.random() * 320,
            event_loop_lag: Math.random() * 10,
            function_call_rate: 100 + Math.random() * 900,
            error_rate: Math.random() * 2,
            success_rate: 95 + Math.random() * 5,
            throughput_mbps: 0.1 + Math.random() * 2
        };

        // Station-specific metric availability
        const stationCapabilities = {
            'STATION_1': ['buffer', 'packet', 'latency'], // Asterisk
            'STATION_2': ['buffer', 'audio', 'performance'], // Gateway
            'STATION_3': ['audio', 'buffer', 'performance'], // STTTTSserver before Deepgram
            'STATION_4': ['latency', 'performance'], // Deepgram
            'STATION_9': ['audio', 'latency', 'performance'], // TTS output
            'STATION_10': ['packet', 'buffer', 'latency'], // Gateway return
            'STATION_11': ['audio', 'performance'] // Hume
        };

        // Set metrics based on station capabilities
        for (const [metric, value] of Object.entries(allMetrics)) {
            const category = this.getMetricCategory(metric);
            const capabilities = stationCapabilities[stationId] || [];

            if (this.stationCanMeasure(stationId, category, capabilities)) {
                baseMetrics[metric] = value;
            } else {
                baseMetrics[metric] = 'NA';
            }
        }

        // Add station-specific important metrics
        if (stationId === 'STATION_3') {
            baseMetrics.snr_db = 20 + Math.random() * 15;
            baseMetrics.noise_floor_db = -65 + Math.random() * 10;
            baseMetrics.speech_activity_pct = 70 + Math.random() * 30;
        }

        return baseMetrics;
    }

    getMetricCategory(metricName) {
        if (metricName.includes('buffer')) return 'buffer';
        if (metricName.includes('latency') || metricName.includes('delay') || metricName.includes('rtt')) return 'latency';
        if (metricName.includes('packet')) return 'packet';
        if (metricName.includes('audio') || metricName.includes('snr') || metricName.includes('noise') ||
            metricName.includes('speech') || metricName.includes('clipping') || metricName.includes('spectral') ||
            metricName.includes('mfcc') || metricName.includes('pitch') || metricName.includes('formant')) return 'audio';
        return 'performance';
    }

    stationCanMeasure(stationId, category, capabilities) {
        return capabilities.includes(category);
    }

    generateStationLogs(stationId) {
        const logs = [];
        const logTypes = [
            { module: 'AGC', event: 'gain_change', data: { old_gain_db: -12, new_gain_db: -10 }},
            { module: 'VAD', event: 'speech_detected', data: { confidence: 0.95 }},
            { module: 'Buffer', event: 'buffer_resize', data: { old_size: 1024, new_size: 2048 }},
            { module: 'Network', event: 'packet_loss_detected', data: { lost_packets: 3 }},
            { module: 'Codec', event: 'codec_switch', data: { from: 'opus', to: 'pcmu' }}
        ];

        // Add 1-3 log entries
        const logCount = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < logCount; i++) {
            const logType = logTypes[Math.floor(Math.random() * logTypes.length)];
            logs.push({
                timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
                module: logType.module,
                event: logType.event,
                ...logType.data
            });
        }

        return logs;
    }

    getStationVersion(stationId) {
        const versions = {
            'STATION_1': 'asterisk-20.5.0',
            'STATION_2': 'gateway-3.2.1',
            'STATION_3': 'sttttsserver-2.1.4',
            'STATION_4': 'deepgram-sdk-3.0.0',
            'STATION_9': 'sttttsserver-2.1.4',
            'STATION_10': 'gateway-3.2.1',
            'STATION_11': 'hume-api-1.0.0'
        };
        return versions[stationId] || '1.0.0';
    }

    getStationConstraints(stationId) {
        const constraints = {
            'STATION_1': {
                max_jitter_ms: 50,
                max_packet_loss_pct: 2,
                allow_aggressive_changes: false
            },
            'STATION_2': {
                max_latency_ms: 200,
                max_buffer_size: 4096,
                allow_aggressive_changes: true
            },
            'STATION_3': {
                max_input_gain_db: 6,
                min_snr_db: 18,
                allow_aggressive_changes: true
            },
            'STATION_4': {
                max_latency_ms: 500,
                min_confidence: 0.8,
                allow_aggressive_changes: false
            },
            'STATION_9': {
                max_output_gain_db: 3,
                min_quality_score: 0.85,
                allow_aggressive_changes: false
            },
            'STATION_10': {
                max_jitter_ms: 30,
                max_packet_loss_pct: 1,
                allow_aggressive_changes: false
            },
            'STATION_11': {
                min_emotion_confidence: 0.7,
                allow_aggressive_changes: true
            }
        };
        return constraints[stationId] || {};
    }

    getStationTargets(stationId) {
        const targets = {
            'STATION_1': {
                goal: 'minimize_jitter',
                weights: { jitter: 0.5, packet_loss: 0.3, latency: 0.2 }
            },
            'STATION_2': {
                goal: 'optimize_throughput',
                weights: { throughput: 0.5, latency: 0.3, quality: 0.2 }
            },
            'STATION_3': {
                goal: 'maximize_clarity',
                weights: { clarity: 0.6, noise: 0.25, echo: 0.1, latency: 0.05 }
            },
            'STATION_4': {
                goal: 'maximize_accuracy',
                weights: { accuracy: 0.7, speed: 0.3 }
            },
            'STATION_9': {
                goal: 'maximize_naturalness',
                weights: { naturalness: 0.5, prosody: 0.3, latency: 0.2 }
            },
            'STATION_10': {
                goal: 'minimize_packet_loss',
                weights: { packet_integrity: 0.6, latency: 0.4 }
            },
            'STATION_11': {
                goal: 'maximize_emotion_accuracy',
                weights: { emotion_accuracy: 0.7, processing_speed: 0.3 }
            }
        };
        return targets[stationId] || {};
    }

    async close() {
        await this.pool.end();
    }
}

// Run the generator
async function main() {
    console.log('================================================');
    console.log('  Specification-Compliant Data Generator');
    console.log('================================================\n');

    const generator = new SpecCompliantDataGenerator();

    try {
        await generator.generateCompleteDataset();
        await generator.close();

        console.log('\n📊 Data generation complete!');
        console.log('Check database for specification-compliant records.');

    } catch (error) {
        console.error('❌ Error:', error);
        await generator.close();
        process.exit(1);
    }
}

main();