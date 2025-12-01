#!/usr/bin/env node

/**
 * Simulates live call data for testing the V2.0.0 system
 * Generates realistic monitoring snapshots for multiple concurrent calls
 */

const http = require('http');

async function sendSnapshot(port, endpoint, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: port,
            path: endpoint,
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
                } catch (e) {
                    resolve({ error: 'Parse error' });
                }
            });
        });

        req.on('error', () => resolve({ error: 'Request failed' }));
        req.write(JSON.stringify(data));
        req.end();
    });
}

// Generate realistic metrics with some variation
function generateMetrics(stationType, quality = 'good') {
    const baseMetrics = {
        // Buffer metrics
        buffer_usage_pct: 45 + Math.random() * 30,
        buffer_underruns: quality === 'good' ? 0 : Math.floor(Math.random() * 5),
        buffer_overruns: quality === 'good' ? 0 : Math.floor(Math.random() * 3),
        jitter_buffer_size_ms: 50 + Math.random() * 100,

        // Latency metrics
        end_to_end_latency_ms: 150 + Math.random() * 100,
        network_latency_ms: 20 + Math.random() * 30,
        processing_latency_ms: 30 + Math.random() * 40,
        jitter_ms: 5 + Math.random() * 20,

        // Packet metrics
        packet_loss_pct: quality === 'good' ? Math.random() * 0.5 : Math.random() * 5,
        packets_received: Math.floor(5000 + Math.random() * 2000),
        packets_sent: Math.floor(5000 + Math.random() * 2000),

        // Audio quality
        snr_db: quality === 'good' ? 25 + Math.random() * 10 : 15 + Math.random() * 10,
        noise_floor_db: -70 + Math.random() * 20,
        audio_level_dbfs: -20 + Math.random() * 10,
        voice_activity_ratio: 0.5 + Math.random() * 0.4,

        // Performance
        cpu_usage_pct: 15 + Math.random() * 40,
        memory_usage_mb: 100 + Math.random() * 200,
        error_rate: quality === 'good' ? Math.random() * 0.02 : Math.random() * 0.1
    };

    // Add station-specific metrics
    if (stationType === 'STT') {
        baseMetrics.transcription_accuracy = quality === 'good' ? 0.9 + Math.random() * 0.09 : 0.7 + Math.random() * 0.2;
        baseMetrics.transcription_latency_ms = 100 + Math.random() * 100;
    } else if (stationType === 'TTS') {
        baseMetrics.synthesis_quality_score = quality === 'good' ? 0.85 + Math.random() * 0.14 : 0.6 + Math.random() * 0.3;
        baseMetrics.synthesis_latency_ms = 150 + Math.random() * 100;
    }

    return baseMetrics;
}

async function simulateCalls() {
    console.log('🎭 Starting Live Call Simulation for Dashboard Testing\n');
    console.log('=' .repeat(70));

    const calls = [
        { id: `call-${Date.now()}-001`, quality: 'good', language: 'en-fr' },
        { id: `call-${Date.now()}-002`, quality: 'poor', language: 'en-es' },
        { id: `call-${Date.now()}-003`, quality: 'good', language: 'en-de' },
        { id: `call-${Date.now()}-004`, quality: 'moderate', language: 'en-zh' }
    ];

    let totalSnapshots = 0;

    for (const call of calls) {
        console.log(`\n📞 Simulating call: ${call.id} (${call.language}, ${call.quality} quality)`);

        // Generate 5 segments per call
        for (let seg = 0; seg < 5; seg++) {
            const segmentStart = seg * 5000;
            const segmentEnd = (seg + 1) * 5000;

            // Send to V2.0.0 server (port 8083) - CALLER snapshot
            const callerSnapshot = {
                station_id: 'STATION_3',
                call_id: call.id,
                channel: 'caller',
                segment: {
                    start_ms: segmentStart,
                    end_ms: segmentEnd
                },
                metrics: generateMetrics('STT', call.quality),
                audio: {
                    sample_rate: 16000,
                    format: 'pcm_s16le',
                    storage_key: `s3://audio/${call.id}/caller_seg${seg}.pcm`
                },
                constraints: {
                    max_input_gain_db: 6,
                    min_snr_db: 20
                },
                targets: {
                    goal: 'max_clarity',
                    weights: { clarity: 0.6, latency: 0.4 }
                }
            };

            const v2Result = await sendSnapshot(8083, '/api/v2/ingest', callerSnapshot);
            if (v2Result.success) {
                console.log(`   ✓ V2.0 Caller segment ${seg + 1}/5`);
                totalSnapshots++;
            }

            // Send to V2.0.0 server - CALLEE snapshot
            const calleeSnapshot = {
                station_id: 'STATION_9',
                call_id: call.id,
                channel: 'callee',
                segment: {
                    start_ms: segmentStart,
                    end_ms: segmentEnd
                },
                metrics: generateMetrics('TTS', call.quality),
                audio: {
                    sample_rate: 48000,
                    format: 'pcm_s16le',
                    storage_key: `s3://audio/${call.id}/callee_seg${seg}.pcm`
                }
            };

            const v2CalleeResult = await sendSnapshot(8083, '/api/v2/ingest', calleeSnapshot);
            if (v2CalleeResult.success) {
                console.log(`   ✓ V2.0 Callee segment ${seg + 1}/5`);
                totalSnapshots++;
            }

            // Also send to V1.0 server (port 8082) for backward compatibility
            const v1Snapshot = {
                ...callerSnapshot,
                knobs: { 'input_gain_db': 2, 'deepgram.model': 'nova-2' }
            };

            await sendSnapshot(8082, '/api/ingest', v1Snapshot);

            // Small delay between segments
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    console.log('\n' + '=' .repeat(70));
    console.log('\n📊 Simulation Complete!');
    console.log(`   Total snapshots sent: ${totalSnapshots}`);
    console.log(`   Calls simulated: ${calls.length}`);
    console.log(`   Segments per call: 5`);
    console.log('\n🌐 View results at:');
    console.log('   - http://20.170.155.53:8080/database-records.html');
    console.log('   - http://localhost:8081/api/snapshots (Original)');
    console.log('   - http://localhost:8082/api/snapshots (V1.0 Compliant)');
    console.log('   - http://localhost:8083/api/v2/live-knobs (V2.0 Live Knobs)');
    console.log('\n✨ Dashboard should now show:');
    console.log('   - Multiple active calls');
    console.log('   - Separate caller/callee configurations');
    console.log('   - Version 2.0.0 schema compliance');
    console.log('   - Two-channel knob model');
    console.log('   - Realistic metrics with quality variations');
}

// Run simulation
simulateCalls().catch(console.error);