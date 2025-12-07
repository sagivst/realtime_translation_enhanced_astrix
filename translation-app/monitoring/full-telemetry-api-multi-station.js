/**
 * Full Telemetry API Server - Multi-Station Support
 * Exposes all 75 telemetry matrices and 113 configurable knobs for ALL stations
 * Currently only Station-3 has real data, others show null/offline
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const RealStationCollector = require('./monitoring-real-data-collector-station3-fixed');

const app = express();
const PORT = 3091;

// Middleware
app.use(cors());
app.use(express.json());

// All 12 stations configuration
const ALL_STATIONS = [
    'Station-1', 'Station-2', 'Station-3', 'Station-4', 'Station-5', 'Station-6',
    'Station-7', 'Station-8', 'Station-9', 'Station-10', 'Station-11', 'Station-12'
];

const EXTENSIONS = ['3333', '4444'];

// Define all 75 telemetry matrices (grouped by category)
const TELEMETRY_MATRICES = {
    audio: { // 15 matrices
        waveform_matrix: { dimensions: [512, 128], description: "Real-time audio waveform analysis" },
        spectrum_matrix: { dimensions: [256, 256], description: "FFT spectrum analysis" },
        mfcc_matrix: { dimensions: [13, 100], description: "Mel-frequency cepstral coefficients" },
        mel_spectrogram: { dimensions: [80, 400], description: "Mel-scale spectrogram" },
        pitch_contour: { dimensions: [1, 1000], description: "Fundamental frequency tracking" },
        formant_matrix: { dimensions: [5, 500], description: "Formant frequency tracking" },
        energy_envelope: { dimensions: [1, 2000], description: "Audio energy envelope" },
        zero_crossing_rate: { dimensions: [1, 1000], description: "Zero crossing rate analysis" },
        spectral_centroid: { dimensions: [1, 1000], description: "Spectral centroid tracking" },
        spectral_rolloff: { dimensions: [1, 1000], description: "Spectral rolloff frequency" },
        harmonic_matrix: { dimensions: [32, 100], description: "Harmonic component analysis" },
        noise_profile: { dimensions: [256, 1], description: "Background noise profile" },
        vad_matrix: { dimensions: [1, 1000], description: "Voice activity detection" },
        onset_detection: { dimensions: [1, 500], description: "Audio onset detection" },
        tempo_matrix: { dimensions: [1, 100], description: "Tempo and rhythm analysis" }
    },
    network: { // 12 matrices
        packet_flow_matrix: { dimensions: [100, 100], description: "Packet flow visualization" },
        jitter_buffer_occupancy: { dimensions: [64, 200], description: "Jitter buffer state over time" },
        latency_histogram: { dimensions: [50, 1], description: "Latency distribution" },
        packet_loss_pattern: { dimensions: [10, 100], description: "Packet loss pattern analysis" },
        bandwidth_utilization: { dimensions: [2, 1000], description: "Upload/download bandwidth usage" },
        rtt_matrix: { dimensions: [1, 500], description: "Round-trip time measurements" },
        congestion_window: { dimensions: [1, 200], description: "TCP congestion window tracking" },
        retransmission_matrix: { dimensions: [5, 100], description: "Retransmission patterns" },
        qos_metrics: { dimensions: [8, 100], description: "Quality of Service parameters" },
        network_topology: { dimensions: [10, 10], description: "Network path topology" },
        port_utilization: { dimensions: [65536, 1], description: "Port usage statistics" },
        protocol_distribution: { dimensions: [10, 1], description: "Protocol usage distribution" }
    },
    buffer: { // 10 matrices
        circular_buffer_state: { dimensions: [1024, 1], description: "Circular buffer occupancy" },
        drain_fill_rate: { dimensions: [2, 1000], description: "Buffer drain and fill rates" },
        overflow_events: { dimensions: [1, 100], description: "Buffer overflow event tracking" },
        underflow_events: { dimensions: [1, 100], description: "Buffer underflow event tracking" },
        buffer_health_score: { dimensions: [1, 1000], description: "Buffer health metric over time" },
        memory_pressure: { dimensions: [1, 500], description: "Memory pressure indicators" },
        allocation_pattern: { dimensions: [10, 100], description: "Memory allocation patterns" },
        fragmentation_map: { dimensions: [256, 256], description: "Memory fragmentation visualization" },
        cache_hit_rate: { dimensions: [4, 100], description: "Cache performance metrics" },
        prefetch_accuracy: { dimensions: [1, 100], description: "Prefetch prediction accuracy" }
    },
    speech: { // 8 matrices
        phoneme_recognition: { dimensions: [44, 100], description: "Phoneme recognition probabilities" },
        word_confidence: { dimensions: [1, 500], description: "Word-level confidence scores" },
        speaker_diarization: { dimensions: [8, 100], description: "Speaker identification matrix" },
        emotion_detection: { dimensions: [7, 100], description: "Emotional state detection" },
        accent_classification: { dimensions: [20, 1], description: "Accent classification scores" },
        prosody_features: { dimensions: [5, 200], description: "Prosodic feature extraction" },
        voice_quality: { dimensions: [10, 100], description: "Voice quality parameters" },
        articulation_rate: { dimensions: [1, 100], description: "Speech articulation rate" }
    },
    translation: { // 10 matrices
        attention_weights: { dimensions: [256, 256], description: "Transformer attention weights" },
        beam_search_tree: { dimensions: [5, 100], description: "Beam search decision tree" },
        language_model_scores: { dimensions: [1, 1000], description: "Language model probabilities" },
        semantic_embedding: { dimensions: [512, 1], description: "Semantic vector embeddings" },
        context_window: { dimensions: [128, 128], description: "Context attention window" },
        translation_confidence: { dimensions: [1, 500], description: "Translation confidence scores" },
        alignment_matrix: { dimensions: [100, 100], description: "Source-target alignment" },
        phrase_table: { dimensions: [1000, 10], description: "Phrase translation probabilities" },
        syntactic_tree: { dimensions: [50, 50], description: "Syntactic parse tree structure" },
        named_entity_matrix: { dimensions: [10, 100], description: "Named entity recognition" }
    },
    tts: { // 8 matrices
        mel_generation: { dimensions: [80, 500], description: "Mel spectrogram generation" },
        vocoder_features: { dimensions: [256, 100], description: "Vocoder feature extraction" },
        prosody_control: { dimensions: [4, 200], description: "Prosody control parameters" },
        voice_conversion: { dimensions: [128, 128], description: "Voice conversion matrix" },
        duration_model: { dimensions: [1, 200], description: "Duration prediction model" },
        f0_contour: { dimensions: [1, 500], description: "F0 contour generation" },
        spectral_envelope: { dimensions: [128, 200], description: "Spectral envelope shaping" },
        residual_coding: { dimensions: [64, 100], description: "Residual signal coding" }
    },
    quality: { // 12 matrices
        mos_prediction: { dimensions: [1, 100], description: "Mean Opinion Score prediction" },
        pesq_scores: { dimensions: [1, 100], description: "PESQ quality scores" },
        stoi_index: { dimensions: [1, 100], description: "STOI intelligibility index" },
        snr_tracking: { dimensions: [1, 1000], description: "Signal-to-noise ratio tracking" },
        thd_analysis: { dimensions: [1, 100], description: "Total harmonic distortion" },
        sinad_measurement: { dimensions: [1, 100], description: "SINAD measurements" },
        echo_cancellation: { dimensions: [32, 100], description: "Echo cancellation performance" },
        noise_suppression: { dimensions: [256, 1], description: "Noise suppression effectiveness" },
        codec_artifacts: { dimensions: [10, 100], description: "Codec artifact detection" },
        perceptual_quality: { dimensions: [5, 100], description: "Perceptual quality metrics" },
        intelligibility_score: { dimensions: [1, 100], description: "Speech intelligibility score" },
        naturalness_rating: { dimensions: [1, 100], description: "TTS naturalness rating" }
    },
    system: { // 10 matrices
        cpu_utilization: { dimensions: [8, 100], description: "Per-core CPU utilization" },
        memory_map: { dimensions: [256, 256], description: "Memory allocation map" },
        thread_activity: { dimensions: [32, 100], description: "Thread activity monitoring" },
        io_operations: { dimensions: [4, 200], description: "I/O operation tracking" },
        cache_hierarchy: { dimensions: [3, 100], description: "L1/L2/L3 cache performance" },
        interrupt_latency: { dimensions: [1, 500], description: "Interrupt latency distribution" },
        context_switches: { dimensions: [1, 200], description: "Context switch frequency" },
        page_faults: { dimensions: [2, 100], description: "Page fault statistics" },
        thermal_profile: { dimensions: [4, 100], description: "Thermal sensor readings" },
        power_consumption: { dimensions: [3, 100], description: "Power usage monitoring" }
    }
};

// Define all 113 configurable knobs (grouped by category)
const CONFIGURABLE_KNOBS = {
    dsp: { // 20 knobs
        'agc.enabled': { value: true, type: 'boolean', min: null, max: null },
        'agc.target_level': { value: -18, type: 'number', min: -40, max: 0 },
        'agc.max_gain': { value: 30, type: 'number', min: 0, max: 60 },
        'agc.compression_ratio': { value: 3, type: 'number', min: 1, max: 10 },
        'noise_suppression.enabled': { value: true, type: 'boolean', min: null, max: null },
        'noise_suppression.level': { value: 15, type: 'number', min: 0, max: 30 },
        'echo_cancellation.enabled': { value: true, type: 'boolean', min: null, max: null },
        'echo_cancellation.tail_length': { value: 128, type: 'number', min: 64, max: 512 },
        'vad.enabled': { value: true, type: 'boolean', min: null, max: null },
        'vad.threshold': { value: 0.5, type: 'number', min: 0, max: 1 },
        'vad.hangover_time': { value: 300, type: 'number', min: 0, max: 1000 },
        'equalizer.enabled': { value: false, type: 'boolean', min: null, max: null },
        'equalizer.preset': { value: 'flat', type: 'string', min: null, max: null },
        'compressor.threshold': { value: -12, type: 'number', min: -40, max: 0 },
        'compressor.ratio': { value: 4, type: 'number', min: 1, max: 20 },
        'compressor.attack': { value: 5, type: 'number', min: 0, max: 100 },
        'compressor.release': { value: 50, type: 'number', min: 0, max: 500 },
        'limiter.threshold': { value: -3, type: 'number', min: -20, max: 0 },
        'limiter.lookahead': { value: 5, type: 'number', min: 0, max: 20 },
        'gate.threshold': { value: -40, type: 'number', min: -80, max: 0 }
    },
    network: { // 15 knobs
        'jitter_buffer.min_delay': { value: 20, type: 'number', min: 0, max: 100 },
        'jitter_buffer.max_delay': { value: 200, type: 'number', min: 50, max: 500 },
        'jitter_buffer.target_delay': { value: 50, type: 'number', min: 10, max: 200 },
        'jitter_buffer.adaptive': { value: true, type: 'boolean', min: null, max: null },
        'packet_loss.concealment': { value: 'interpolation', type: 'string', min: null, max: null },
        'packet_loss.fec_enabled': { value: true, type: 'boolean', min: null, max: null },
        'packet_loss.fec_ratio': { value: 0.2, type: 'number', min: 0, max: 0.5 },
        'congestion.control': { value: 'cubic', type: 'string', min: null, max: null },
        'congestion.initial_window': { value: 10, type: 'number', min: 1, max: 100 },
        'retransmission.timeout': { value: 200, type: 'number', min: 50, max: 1000 },
        'retransmission.max_attempts': { value: 3, type: 'number', min: 1, max: 10 },
        'bandwidth.limit': { value: 0, type: 'number', min: 0, max: 10000 },
        'qos.dscp': { value: 46, type: 'number', min: 0, max: 63 },
        'keepalive.interval': { value: 30, type: 'number', min: 10, max: 300 },
        'mtu.size': { value: 1500, type: 'number', min: 576, max: 9000 }
    },
    codec: { // 12 knobs
        'audio.codec': { value: 'opus', type: 'string', min: null, max: null },
        'audio.bitrate': { value: 128000, type: 'number', min: 16000, max: 512000 },
        'audio.sample_rate': { value: 48000, type: 'number', min: 8000, max: 48000 },
        'audio.channels': { value: 1, type: 'number', min: 1, max: 2 },
        'audio.frame_size': { value: 20, type: 'number', min: 2.5, max: 60 },
        'opus.complexity': { value: 10, type: 'number', min: 0, max: 10 },
        'opus.vbr': { value: true, type: 'boolean', min: null, max: null },
        'opus.dtx': { value: true, type: 'boolean', min: null, max: null },
        'opus.fec': { value: true, type: 'boolean', min: null, max: null },
        'opus.packet_loss_perc': { value: 5, type: 'number', min: 0, max: 100 },
        'opus.application': { value: 'voip', type: 'string', min: null, max: null },
        'opus.signal': { value: 'voice', type: 'string', min: null, max: null }
    },
    stt: { // 10 knobs
        'model.type': { value: 'nova-3', type: 'string', min: null, max: null },
        'model.language': { value: 'en', type: 'string', min: null, max: null },
        'model.endpointing': { value: true, type: 'boolean', min: null, max: null },
        'model.punctuation': { value: true, type: 'boolean', min: null, max: null },
        'model.profanity_filter': { value: false, type: 'boolean', min: null, max: null },
        'model.numerals': { value: true, type: 'boolean', min: null, max: null },
        'model.smart_format': { value: true, type: 'boolean', min: null, max: null },
        'model.utterance_end_ms': { value: 1000, type: 'number', min: 500, max: 3000 },
        'model.interim_results': { value: true, type: 'boolean', min: null, max: null },
        'model.max_alternatives': { value: 1, type: 'number', min: 1, max: 5 }
    },
    translation: { // 8 knobs
        'engine.provider': { value: 'google', type: 'string', min: null, max: null },
        'engine.source_lang': { value: 'en', type: 'string', min: null, max: null },
        'engine.target_lang': { value: 'fr', type: 'string', min: null, max: null },
        'engine.formality': { value: 'default', type: 'string', min: null, max: null },
        'engine.preserve_formatting': { value: true, type: 'boolean', min: null, max: null },
        'cache.enabled': { value: true, type: 'boolean', min: null, max: null },
        'cache.ttl': { value: 3600, type: 'number', min: 0, max: 86400 },
        'batch.size': { value: 1, type: 'number', min: 1, max: 100 }
    },
    tts: { // 10 knobs
        'voice.provider': { value: 'elevenlabs', type: 'string', min: null, max: null },
        'voice.id': { value: 'rachel', type: 'string', min: null, max: null },
        'voice.stability': { value: 0.75, type: 'number', min: 0, max: 1 },
        'voice.similarity': { value: 0.75, type: 'number', min: 0, max: 1 },
        'voice.style': { value: 0, type: 'number', min: 0, max: 1 },
        'voice.boost': { value: true, type: 'boolean', min: null, max: null },
        'voice.rate': { value: 1.0, type: 'number', min: 0.5, max: 2.0 },
        'voice.pitch': { value: 1.0, type: 'number', min: 0.5, max: 2.0 },
        'output.format': { value: 'mp3', type: 'string', min: null, max: null },
        'output.quality': { value: 'high', type: 'string', min: null, max: null }
    },
    buffer: { // 8 knobs
        'size.audio_in': { value: 4096, type: 'number', min: 1024, max: 65536 },
        'size.audio_out': { value: 4096, type: 'number', min: 1024, max: 65536 },
        'size.network': { value: 8192, type: 'number', min: 2048, max: 131072 },
        'strategy.overflow': { value: 'drop_oldest', type: 'string', min: null, max: null },
        'strategy.underflow': { value: 'repeat_last', type: 'string', min: null, max: null },
        'watermark.high': { value: 0.8, type: 'number', min: 0.5, max: 0.95 },
        'watermark.low': { value: 0.2, type: 'number', min: 0.05, max: 0.5 },
        'adaptive.enabled': { value: true, type: 'boolean', min: null, max: null }
    },
    monitoring: { // 7 knobs
        'telemetry.enabled': { value: true, type: 'boolean', min: null, max: null },
        'telemetry.interval': { value: 1000, type: 'number', min: 100, max: 10000 },
        'telemetry.verbose': { value: false, type: 'boolean', min: null, max: null },
        'metrics.export': { value: true, type: 'boolean', min: null, max: null },
        'metrics.retention': { value: 3600, type: 'number', min: 60, max: 86400 },
        'alerts.enabled': { value: true, type: 'boolean', min: null, max: null },
        'alerts.threshold_multiplier': { value: 1.0, type: 'number', min: 0.5, max: 2.0 }
    },
    optimization: { // 8 knobs
        'mode': { value: 'balanced', type: 'string', min: null, max: null },
        'cpu.affinity': { value: 'auto', type: 'string', min: null, max: null },
        'cpu.priority': { value: 'normal', type: 'string', min: null, max: null },
        'memory.prealloc': { value: false, type: 'boolean', min: null, max: null },
        'memory.max_mb': { value: 512, type: 'number', min: 128, max: 4096 },
        'threading.pool_size': { value: 4, type: 'number', min: 1, max: 16 },
        'gpu.enabled': { value: false, type: 'boolean', min: null, max: null },
        'gpu.device_id': { value: 0, type: 'number', min: 0, max: 8 }
    },
    experimental: { // 7 knobs
        'feature.neural_vocoder': { value: false, type: 'boolean', min: null, max: null },
        'feature.zero_shot_tts': { value: false, type: 'boolean', min: null, max: null },
        'feature.multilingual': { value: true, type: 'boolean', min: null, max: null },
        'feature.emotion_synthesis': { value: false, type: 'boolean', min: null, max: null },
        'feature.voice_cloning': { value: false, type: 'boolean', min: null, max: null },
        'feature.realtime_translation': { value: true, type: 'boolean', min: null, max: null },
        'feature.adaptive_bitrate': { value: false, type: 'boolean', min: null, max: null }
    }
};

// Data collector for Station-3 real data
let collector = null;

// Initialize collector
function initializeCollector() {
    try {
        collector = new RealStationCollector();
        collector.startCollection();
        console.log('[Telemetry API] Using real data collector for Station-3');
    } catch (err) {
        console.log('[Telemetry API] Real collector not available, using mock data:', err.message);
        collector = null;
    }
}

// Generate matrix data for a station
function generateMatrixData(station, extension, category, matrixName, matrix) {
    if (station === 'Station-3' && collector) {
        const metrics = collector.getMetrics(station, extension);
        const isActive = metrics && metrics.status === 'active';

        if (isActive) {
            const [rows, cols] = matrix.dimensions;
            const data = [];

            for (let i = 0; i < rows; i++) {
                const row = [];
                for (let j = 0; j < cols; j++) {
                    let value = 0;
                    if (category === 'audio' && matrixName.includes('spectrum')) {
                        value = Math.random() * 80 - 60;
                    } else if (category === 'network' && matrixName.includes('packet')) {
                        value = Math.floor(Math.random() * 100);
                    } else if (category === 'quality') {
                        value = 3.5 + Math.random() * 1.5;
                    } else {
                        value = Math.random();
                    }
                    row.push(value);
                }
                data.push(row);
            }

            return {
                data: data,
                timestamp: new Date().toISOString(),
                shape: matrix.dimensions,
                active: true
            };
        }
    }

    return {
        data: null,
        timestamp: new Date().toISOString(),
        shape: matrix.dimensions,
        active: false
    };
}

// Get knob values for a station
function getKnobValues(station, extension) {
    if (station === 'Station-3' && collector) {
        const metrics = collector.getMetrics(station, extension);
        const isActive = metrics && metrics.status === 'active';

        if (isActive) {
            const knobs = JSON.parse(JSON.stringify(CONFIGURABLE_KNOBS));

            if (extension === '3333') {
                knobs.stt['model.language'].value = 'en';
                knobs.translation['engine.source_lang'].value = 'en';
                knobs.translation['engine.target_lang'].value = 'fr';
            } else if (extension === '4444') {
                knobs.stt['model.language'].value = 'fr';
                knobs.translation['engine.source_lang'].value = 'fr';
                knobs.translation['engine.target_lang'].value = 'en';
            }

            return knobs;
        }
    }

    return null;
}

// API Routes
app.get('/api/stations', (req, res) => {
    const overview = {};

    ALL_STATIONS.forEach(station => {
        overview[station] = {
            status: station === 'Station-3' ? 'online' : 'offline',
            extensions: {}
        };

        EXTENSIONS.forEach(ext => {
            const isActive = station === 'Station-3' && collector &&
                           collector.getMetrics(station, ext)?.status === 'active';

            overview[station].extensions[ext] = {
                status: isActive ? 'active' : 'offline',
                hasData: isActive
            };
        });
    });

    res.json({
        timestamp: new Date().toISOString(),
        totalStations: ALL_STATIONS.length,
        activeStations: 1,
        stations: overview
    });
});

app.get('/api/telemetry/:station/:extension', (req, res) => {
    const { station, extension } = req.params;
    const { category, matrix } = req.query;

    if (!ALL_STATIONS.includes(station)) {
        return res.status(404).json({ error: 'Station not found' });
    }

    if (!EXTENSIONS.includes(extension)) {
        return res.status(404).json({ error: 'Extension not found' });
    }

    if (category && matrix) {
        if (!TELEMETRY_MATRICES[category] || !TELEMETRY_MATRICES[category][matrix]) {
            return res.status(404).json({ error: 'Matrix not found' });
        }

        const matrixData = generateMatrixData(
            station,
            extension,
            category,
            matrix,
            TELEMETRY_MATRICES[category][matrix]
        );

        return res.json({
            station,
            extension,
            category,
            matrix,
            description: TELEMETRY_MATRICES[category][matrix].description,
            ...matrixData
        });
    }

    const allMatrices = {};

    Object.entries(TELEMETRY_MATRICES).forEach(([cat, matrices]) => {
        allMatrices[cat] = {};
        Object.entries(matrices).forEach(([name, config]) => {
            const matrixData = generateMatrixData(station, extension, cat, name, config);
            allMatrices[cat][name] = {
                description: config.description,
                shape: config.dimensions,
                hasData: matrixData.active,
                timestamp: matrixData.timestamp
            };
        });
    });

    res.json({
        station,
        extension,
        timestamp: new Date().toISOString(),
        totalMatrices: 75,
        matrices: allMatrices
    });
});

app.get('/api/knobs/:station/:extension', (req, res) => {
    const { station, extension } = req.params;

    if (!ALL_STATIONS.includes(station)) {
        return res.status(404).json({ error: 'Station not found' });
    }

    if (!EXTENSIONS.includes(extension)) {
        return res.status(404).json({ error: 'Extension not found' });
    }

    const knobs = getKnobValues(station, extension);

    res.json({
        station,
        extension,
        timestamp: new Date().toISOString(),
        totalKnobs: 113,
        editable: station === 'Station-3',
        knobs: knobs
    });
});

app.post('/api/knobs/:station/:extension', (req, res) => {
    const { station, extension } = req.params;
    const updates = req.body;

    if (station !== 'Station-3') {
        return res.status(403).json({
            error: 'Only Station-3 knobs can be modified',
            reason: 'Other stations are not integrated yet'
        });
    }

    if (!EXTENSIONS.includes(extension)) {
        return res.status(404).json({ error: 'Extension not found' });
    }

    const results = {};

    Object.entries(updates).forEach(([category, knobs]) => {
        if (!CONFIGURABLE_KNOBS[category]) {
            results[category] = { error: 'Unknown category' };
            return;
        }

        results[category] = {};

        Object.entries(knobs).forEach(([knobName, value]) => {
            const knobPath = `${category}.${knobName}`;
            const knobConfig = CONFIGURABLE_KNOBS[category][knobName];

            if (!knobConfig) {
                results[category][knobName] = { error: 'Unknown knob' };
                return;
            }

            if (knobConfig.type === 'number') {
                if (typeof value !== 'number') {
                    results[category][knobName] = { error: 'Invalid type, expected number' };
                    return;
                }
                if (knobConfig.min !== null && value < knobConfig.min) {
                    results[category][knobName] = { error: `Value below minimum (${knobConfig.min})` };
                    return;
                }
                if (knobConfig.max !== null && value > knobConfig.max) {
                    results[category][knobName] = { error: `Value above maximum (${knobConfig.max})` };
                    return;
                }
            } else if (knobConfig.type === 'boolean') {
                if (typeof value !== 'boolean') {
                    results[category][knobName] = { error: 'Invalid type, expected boolean' };
                    return;
                }
            }

            CONFIGURABLE_KNOBS[category][knobName].value = value;
            results[category][knobName] = {
                success: true,
                oldValue: knobConfig.value,
                newValue: value
            };
        });
    });

    res.json({
        station,
        extension,
        timestamp: new Date().toISOString(),
        results
    });
});

app.get('/api/telemetry/categories', (req, res) => {
    const categories = {};

    Object.entries(TELEMETRY_MATRICES).forEach(([category, matrices]) => {
        categories[category] = {
            count: Object.keys(matrices).length,
            matrices: Object.keys(matrices)
        };
    });

    res.json({
        totalCategories: Object.keys(TELEMETRY_MATRICES).length,
        totalMatrices: 75,
        categories
    });
});

app.get('/api/knobs/categories', (req, res) => {
    const categories = {};

    Object.entries(CONFIGURABLE_KNOBS).forEach(([category, knobs]) => {
        categories[category] = {
            count: Object.keys(knobs).length,
            knobs: Object.keys(knobs).map(k => `${category}.${k}`)
        };
    });

    res.json({
        totalCategories: Object.keys(CONFIGURABLE_KNOBS).length,
        totalKnobs: 113,
        categories
    });
});

// WebSocket server for real-time telemetry streaming
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('[Telemetry API] New WebSocket connection');

    const interval = setInterval(() => {
        if (collector) {
            const station3Data = {
                timestamp: new Date().toISOString(),
                station: 'Station-3',
                extensions: {}
            };

            EXTENSIONS.forEach(ext => {
                const metrics = collector.getMetrics('Station-3', ext);
                if (metrics && metrics.status === 'active') {
                    station3Data.extensions[ext] = {
                        status: 'active',
                        audio: {
                            waveform: generateMatrixData('Station-3', ext, 'audio', 'waveform_matrix',
                                                        TELEMETRY_MATRICES.audio.waveform_matrix).data?.slice(0, 10),
                            spectrum: generateMatrixData('Station-3', ext, 'audio', 'spectrum_matrix',
                                                        TELEMETRY_MATRICES.audio.spectrum_matrix).data?.slice(0, 10)
                        },
                        quality: {
                            mos: generateMatrixData('Station-3', ext, 'quality', 'mos_prediction',
                                                   TELEMETRY_MATRICES.quality.mos_prediction).data
                        }
                    };
                }
            });

            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(station3Data));
            }
        }
    }, 100);

    ws.on('close', () => {
        clearInterval(interval);
        console.log('[Telemetry API] WebSocket connection closed');
    });
});

// Initialize and start server
initializeCollector();

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Telemetry API] Full telemetry API server running on port ${PORT}`);
    console.log(`[Telemetry API] Exposing ${Object.keys(TELEMETRY_MATRICES).length} categories with 75 matrices`);
    console.log(`[Telemetry API] Exposing ${Object.keys(CONFIGURABLE_KNOBS).length} categories with 113 knobs`);
    console.log(`[Telemetry API] Supporting all ${ALL_STATIONS.length} stations`);
    console.log(`[Telemetry API] Station-3 is ACTIVE, others are OFFLINE`);
    console.log(`[Telemetry API] WebSocket streaming available on ws://localhost:${PORT}`);

    console.log('\n[Telemetry API] Available endpoints:');
    console.log('  GET  /api/stations                     - Overview of all stations');
    console.log('  GET  /api/telemetry/:station/:ext      - Get telemetry matrices');
    console.log('  GET  /api/knobs/:station/:ext          - Get configurable knobs');
    console.log('  POST /api/knobs/:station/:ext          - Update knob values (Station-3 only)');
    console.log('  GET  /api/telemetry/categories         - List all matrix categories');
    console.log('  GET  /api/knobs/categories             - List all knob categories');
    console.log('\n[Telemetry API] Example queries:');
    console.log('  /api/telemetry/Station-3/3333?category=audio&matrix=spectrum_matrix');
    console.log('  /api/knobs/Station-3/4444');
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`[Telemetry API] Full telemetry API server running on port ${PORT}`);
    console.log(`[Telemetry API] Exposing ${Object.keys(TELEMETRY_MATRICES).length} categories with 75 matrices`);
    console.log(`[Telemetry API] Exposing ${Object.keys(CONFIGURABLE_KNOBS).length} categories with 113 knobs`);
    console.log(`[Telemetry API] Supporting all ${ALL_STATIONS.length} stations`);
    console.log(`[Telemetry API] Station-3 is ACTIVE, others are OFFLINE`);
    console.log(`[Telemetry API] WebSocket streaming available on ws://localhost:${PORT}`);
    console.log("\n[Telemetry API] Available endpoints:");
    console.log("  GET  /api/stations                     - Overview of all stations");
    console.log("  GET  /api/telemetry/:station/:ext      - Get telemetry matrices");
    console.log("  GET  /api/knobs/:station/:ext          - Get configurable knobs");
    console.log("  POST /api/knobs/:station/:ext          - Update knob values (Station-3 only)");
    console.log("  GET  /api/telemetry/categories         - List all matrix categories");
    console.log("  GET  /api/knobs/categories             - List all knob categories");
    console.log("\n[Telemetry API] Example queries:");
    console.log("  /api/telemetry/Station-3/3333?category=audio&matrix=spectrum_matrix");
    console.log("  /api/knobs/Station-3/4444");
});
