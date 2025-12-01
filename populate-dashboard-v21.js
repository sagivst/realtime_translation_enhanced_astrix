#!/usr/bin/env node

/**
 * Populate Dashboard with V2.1.0 compliant data
 * Sends data to the monitoring server on port 3001
 */

const http = require('http');

async function sendToMonitoringServer(data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8083,  // V2.0 compliant server port
            path: '/api/v2/ingest',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch {
                    resolve({ status: res.statusCode });
                }
            });
        });

        req.on('error', () => resolve({ error: 'Request failed' }));
        req.write(JSON.stringify(data));
        req.end();
    });
}

// Generate comprehensive metrics for all 75 fields
function generateFullMetrics(stationId) {
    const metrics = {
        // Buffer Metrics (15)
        buffer_usage_pct: 45 + Math.random() * 30,
        buffer_underruns: Math.floor(Math.random() * 2),
        buffer_overruns: Math.floor(Math.random() * 2),
        jitter_buffer_size_ms: 50 + Math.random() * 100,
        adaptive_buffer_status: Math.random() > 0.5 ? 1 : 0,
        buffer_health_score: 0.8 + Math.random() * 0.19,
        peak_buffer_usage: 60 + Math.random() * 35,
        buffer_resize_events: Math.floor(Math.random() * 5),
        avg_buffer_occupancy: 40 + Math.random() * 40,
        buffer_drain_rate: 100 + Math.random() * 50,
        buffer_fill_rate: 100 + Math.random() * 50,
        buffer_starvation_time: Math.random() * 10,
        max_consecutive_underruns: Math.floor(Math.random() * 3),
        buffer_stability_index: 0.7 + Math.random() * 0.29,
        effective_buffer_latency: 20 + Math.random() * 30,

        // Latency Metrics (15)
        end_to_end_latency_ms: 150 + Math.random() * 100,
        network_latency_ms: 20 + Math.random() * 30,
        processing_latency_ms: 30 + Math.random() * 40,
        codec_latency_ms: 5 + Math.random() * 15,
        jitter_ms: 5 + Math.random() * 20,
        round_trip_time_ms: 100 + Math.random() * 100,
        transcription_latency_ms: 100 + Math.random() * 100,
        synthesis_latency_ms: 150 + Math.random() * 100,
        api_response_time_ms: 50 + Math.random() * 50,
        queue_wait_time_ms: 10 + Math.random() * 30,
        first_byte_latency_ms: 15 + Math.random() * 25,
        peak_latency_ms: 200 + Math.random() * 200,
        p95_latency_ms: 180 + Math.random() * 120,
        p99_latency_ms: 250 + Math.random() * 150,
        latency_variation_ms: 10 + Math.random() * 40,

        // Packet Metrics (15)
        packet_loss_pct: Math.random() * 2,
        packets_received: Math.floor(5000 + Math.random() * 2000),
        packets_sent: Math.floor(5000 + Math.random() * 2000),
        packet_reorder_rate: Math.random() * 0.5,
        duplicate_packets: Math.floor(Math.random() * 10),
        corrupted_packets: Math.floor(Math.random() * 5),
        packet_timing_drift: Math.random() * 10,
        interpacket_gap_ms: 20 + Math.random() * 10,
        burst_loss_rate: Math.random() * 1,
        consecutive_loss_count: Math.floor(Math.random() * 3),
        fec_recovery_rate: 0.9 + Math.random() * 0.09,
        retransmission_rate: Math.random() * 2,
        packet_conceal_count: Math.floor(Math.random() * 20),
        effective_loss_rate: Math.random() * 1.5,
        network_efficiency: 0.85 + Math.random() * 0.14,

        // Audio Quality Metrics (15)
        snr_db: 25 + Math.random() * 15,
        noise_floor_db: -70 + Math.random() * 20,
        audio_level_dbfs: -20 + Math.random() * 10,
        peak_level_dbfs: -10 + Math.random() * 10,
        clipping_detected: Math.random() > 0.9 ? 1 : 0,
        silence_detected: Math.random() > 0.8 ? 1 : 0,
        voice_activity_ratio: 0.5 + Math.random() * 0.4,
        audio_bandwidth_khz: 8 + Math.random() * 8,
        spectral_centroid_hz: 1000 + Math.random() * 2000,
        mos_score: 3.5 + Math.random() * 1.4,
        pesq_score: 3.0 + Math.random() * 1.5,
        pitch_accuracy: 0.8 + Math.random() * 0.19,
        formant_clarity: 0.7 + Math.random() * 0.29,
        harmonic_distortion_pct: Math.random() * 5,
        intermodulation_distortion: Math.random() * 3,

        // Performance Metrics (15)
        cpu_usage_pct: 15 + Math.random() * 50,
        memory_usage_mb: 100 + Math.random() * 300,
        thread_pool_usage: 0.3 + Math.random() * 0.6,
        event_loop_lag_ms: Math.random() * 20,
        gc_pause_time_ms: Math.random() * 50,
        api_calls_per_sec: 10 + Math.random() * 90,
        websocket_connections: Math.floor(1 + Math.random() * 10),
        active_streams: Math.floor(1 + Math.random() * 5),
        transcription_accuracy: 0.85 + Math.random() * 0.14,
        synthesis_quality_score: 0.8 + Math.random() * 0.19,
        error_rate: Math.random() * 0.05,
        retry_count: Math.floor(Math.random() * 5),
        cache_hit_rate: 0.7 + Math.random() * 0.29,
        throughput_kbps: 64 + Math.random() * 192,
        processing_efficiency: 0.75 + Math.random() * 0.24
    };

    // Some stations might not have all metrics - set some to null randomly
    if (Math.random() > 0.7) {
        const metricsToNull = Math.floor(Math.random() * 20);
        const keys = Object.keys(metrics);
        for (let i = 0; i < metricsToNull; i++) {
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            metrics[randomKey] = null;
        }
    }

    return metrics;
}

// Generate knobs array
function generateKnobs(stationId) {
    const baseKnobs = [
        { name: 'input_gain_db', value: Math.floor(Math.random() * 6) },
        { name: 'agc.enabled', value: true },
        { name: 'agc.target_level_dbfs', value: -18 + Math.floor(Math.random() * 6) },
        { name: 'noise_reduction_strength', value: Math.floor(1 + Math.random() * 5) },
        { name: 'echo_cancellation.enabled', value: true },
        { name: 'vad.enabled', value: true },
        { name: 'vad.threshold', value: 0.3 + Math.random() * 0.4 }
    ];

    // Add station-specific knobs
    if (stationId === 'STATION_1') {
        baseKnobs.push(
            { name: 'codec_selection', value: 'g711u' },
            { name: 'dtmf_mode', value: 'rfc2833' }
        );
    } else if (stationId === 'STATION_9') {
        baseKnobs.push(
            { name: 'elevenlabs.model_id', value: 'eleven_multilingual_v2' },
            { name: 'elevenlabs.voice_id', value: 'rachel' },
            { name: 'elevenlabs.stability', value: 0.5 },
            { name: 'elevenlabs.similarity_boost', value: 0.5 }
        );
    } else if (stationId === 'STATION_11') {
        baseKnobs.push(
            { name: 'emotion.model', value: 'prosody' },
            { name: 'emotion.sensitivity', value: 0.5 }
        );
    }

    return baseKnobs;
}

async function populateDashboard() {
    console.log('📊 Populating Dashboard with V2.1.0 Compliant Data\n');
    console.log('=' .repeat(70));

    const relevantStations = [
        'STATION_1',  // Asterisk
        'STATION_2',  // Gateway RX
        'STATION_7',  // Gateway TX
        'STATION_9',  // TTS Output
        'STATION_10', // Gateway Return
        'STATION_11'  // Hume EVI
    ];

    let totalSent = 0;
    let successCount = 0;

    // Generate multiple calls
    for (let callNum = 1; callNum <= 3; callNum++) {
        const callId = `call-${Date.now()}-${callNum}`;
        console.log(`\n📞 Generating Call ${callNum}: ${callId}`);

        // For each call, generate snapshots from all stations
        for (const stationId of relevantStations) {
            // Generate both caller and callee snapshots
            for (const channel of ['caller', 'callee']) {
                const snapshot = {
                    id: `${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`,
                    station_id: stationId,
                    timestamp: new Date().toISOString(),
                    call_id: callId,
                    channel: channel,
                    metrics: generateFullMetrics(stationId),
                    knobs: generateKnobs(stationId),
                    // V2.0 requires segment and audio fields
                    segment: {
                        segment_id: `seg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        start_ms: callNum * 5000,
                        end_ms: (callNum + 1) * 5000,
                        segment_type: 'speech'
                    },
                    audio: {
                        sample_rate: 16000,
                        format: 'pcm_s16le',
                        duration_ms: 5000,
                        storage_key: `s3://audio/${callId}/${stationId}_${channel}.pcm`
                    },
                    // V2.0 requires constraints and targets
                    constraints: {
                        max_input_gain_db: 6,
                        min_snr_db: 20,
                        max_latency_ms: 500
                    },
                    targets: {
                        goal: 'max_clarity',
                        weights: {
                            clarity: 0.6,
                            latency: 0.4
                        }
                    },
                    totals: {
                        knobs_count: generateKnobs(stationId).length,
                        metrics_count: Object.values(generateFullMetrics(stationId)).filter(v => v !== null).length
                    }
                };

                // Send to monitoring server
                const result = await sendToMonitoringServer(snapshot);
                totalSent++;

                if (result.success || result.status === 200) {
                    successCount++;
                    console.log(`   ✅ ${stationId} ${channel} snapshot sent`);
                } else {
                    console.log(`   ❌ ${stationId} ${channel} failed:`, result.error);
                }

                // Small delay
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }

    console.log('\n' + '=' .repeat(70));
    console.log('\n📊 Population Complete!');
    console.log(`   Total Snapshots Sent: ${totalSent}`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Failed: ${totalSent - successCount}`);
    console.log(`   Success Rate: ${((successCount/totalSent) * 100).toFixed(1)}%`);

    console.log('\n🌐 Dashboard should now show data at:');
    console.log('   http://20.170.155.53:8080/database-records.html');
    console.log('\n📍 Data includes:');
    console.log('   - 3 active calls');
    console.log('   - 6 stations per call (1, 2, 7, 9, 10, 11)');
    console.log('   - Both caller and callee channels');
    console.log('   - All 75 metrics (with some null values)');
    console.log('   - Station-specific knobs');
    console.log('\n✨ Auto-refresh is enabled - dashboard updates every 5 seconds');
}

// Run population
populateDashboard().catch(console.error);