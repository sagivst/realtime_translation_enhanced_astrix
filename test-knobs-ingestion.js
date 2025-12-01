#!/usr/bin/env node

/**
 * Test script for ingesting data with both metrics and knobs
 * Simulates Station 3 and Station 9 sending monitoring data
 */

const http = require('http');

// Sample metrics for Station 3 (STT)
const station3Metrics = {
    // Buffer metrics
    buffer_usage_pct: 45.2,
    buffer_underruns: 0,
    buffer_overruns: 0,
    jitter_buffer_size_ms: 100,

    // Latency metrics
    end_to_end_latency_ms: 187,
    processing_latency_ms: 42,
    transcription_latency_ms: 145,
    jitter_ms: 12.3,

    // Packet metrics
    packet_loss_pct: 0.1,
    packets_received: 5234,
    packets_sent: 5240,

    // Audio quality metrics
    snr_db: 28.5,
    noise_floor_db: -65,
    audio_level_dbfs: -18,
    voice_activity_ratio: 0.72,

    // Performance metrics
    cpu_usage_pct: 23.4,
    memory_usage_mb: 156,
    transcription_accuracy: 0.94,
    error_rate: 0.02
};

// Sample knobs for Station 3
const station3Knobs = {
    // Audio knobs
    input_gain_db: 2,
    output_gain_db: 0,
    buffer_size_ms: 100,
    jitter_buffer_ms: 50,

    // Deepgram knobs
    'deepgram.model': 'nova-2',
    'deepgram.language': 'en',
    'deepgram.punctuate': true,
    'deepgram.interim_results': true,
    'deepgram.endpointing': 1000,
    'deepgram.smart_format': true,
    'deepgram.diarize': false,

    // Environment knobs
    'NODE_ENV': 'production',
    'TRANSLATION_SERVER_PORT': 3002,
    'USE_DEEPGRAM_STREAMING': true
};

// Sample metrics for Station 9 (TTS)
const station9Metrics = {
    // Buffer metrics
    buffer_usage_pct: 62.1,
    buffer_underruns: 1,

    // Latency metrics
    end_to_end_latency_ms: 215,
    synthesis_latency_ms: 178,
    api_response_time_ms: 95,

    // Audio quality metrics
    snr_db: 32.1,
    audio_level_dbfs: -16,
    mos_score: 4.2,

    // Performance metrics
    cpu_usage_pct: 31.2,
    memory_usage_mb: 198,
    synthesis_quality_score: 0.91,
    throughput_kbps: 128
};

// Sample knobs for Station 9
const station9Knobs = {
    // Audio knobs
    input_gain_db: 0,
    output_gain_db: 3,

    // ElevenLabs knobs
    'elevenlabs.model_id': 'eleven_multilingual_v2',
    'elevenlabs.voice_id': 'EXAVITQu4vr4xnSDxMaL',
    'elevenlabs.stability': 0.5,
    'elevenlabs.similarity_boost': 0.5,
    'elevenlabs.style': 0,
    'elevenlabs.use_speaker_boost': true,
    'elevenlabs.optimize_streaming_latency': 3,

    // Environment knobs
    'USE_ELEVENLABS_WEBSOCKET': true,
    'EXT_7777_LANGUAGE': 'en',
    'EXT_8888_LANGUAGE': 'fr'
};

async function sendSnapshot(stationId, metrics, knobs) {
    const snapshot = {
        schema_version: '1.0.0',
        call_id: `test-call-${Date.now()}`,
        channel: stationId === 'STATION_3' ? 'caller' : 'callee',
        segment: {
            start_ms: Date.now() - 5000,
            end_ms: Date.now()
        },
        station: {
            id: stationId,
            software_version: '2.0.0'
        },
        metrics: metrics,
        knobs: knobs,
        logs: [
            { level: 'info', message: `Test data from ${stationId}` }
        ]
    };

    const options = {
        hostname: 'localhost',
        port: 8081,
        path: '/api/ingest',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`✅ ${stationId} snapshot sent:`, result);
                    resolve(result);
                } catch (error) {
                    console.error(`❌ ${stationId} parse error:`, error);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error(`❌ ${stationId} request error:`, error);
            reject(error);
        });

        req.write(JSON.stringify(snapshot));
        req.end();
    });
}

async function runTest() {
    console.log('🚀 Starting test ingestion of metrics and knobs...\n');

    try {
        // Send Station 3 data
        await sendSnapshot('STATION_3', station3Metrics, station3Knobs);

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Send Station 9 data
        await sendSnapshot('STATION_9', station9Metrics, station9Knobs);

        // Send another Station 3 with different values
        await new Promise(resolve => setTimeout(resolve, 1000));

        const updatedStation3Metrics = { ...station3Metrics };
        updatedStation3Metrics.buffer_usage_pct = 52.3;
        updatedStation3Metrics.cpu_usage_pct = 28.1;

        const updatedStation3Knobs = { ...station3Knobs };
        updatedStation3Knobs.input_gain_db = 3;
        updatedStation3Knobs['deepgram.model'] = 'nova';

        await sendSnapshot('STATION_3', updatedStation3Metrics, updatedStation3Knobs);

        console.log('\n✅ Test complete! Check http://20.170.155.53:8080/database-records.html');
        console.log('   The dashboard should show:');
        console.log('   - 3 total records');
        console.log('   - Both metrics (75 total) and knobs (250+ total)');
        console.log('   - NA values for unavailable metrics/knobs');
        console.log('   - Ability to switch between Metrics, Knobs, and Summary tabs');

    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
runTest();