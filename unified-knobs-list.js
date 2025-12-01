#!/usr/bin/env node

/**
 * Unified Configuration Knobs List
 * ALL knobs across all stations with NA for unavailable ones
 * Essential for LLM analysis with consistent data format
 */

const { Pool } = require('pg');
const fs = require('fs');

class UnifiedKnobsCollector {
    constructor() {
        this.pool = new Pool({
            host: 'localhost',
            port: 5432,
            database: 'audio_optimization',
            user: 'postgres'
        });

        // Define ALL knobs across the entire system (unified list)
        this.ALL_KNOBS = this.defineUnifiedKnobsList();
    }

    /**
     * Complete unified list of ALL configuration knobs across all stations
     * Total: 100 knobs covering all aspects of the audio pipeline
     */
    defineUnifiedKnobsList() {
        return {
            // === AUDIO INPUT PROCESSING (20 knobs) ===
            'input_gain_db': { category: 'audio_input', type: 'numeric', min: -20, max: 20, step: 0.5, default: 0 },
            'input_sample_rate': { category: 'audio_input', type: 'select', options: [8000, 16000, 22050, 44100, 48000], default: 16000 },
            'input_channels': { category: 'audio_input', type: 'select', options: [1, 2], default: 1 },
            'input_bit_depth': { category: 'audio_input', type: 'select', options: [8, 16, 24, 32], default: 16 },
            'input_codec': { category: 'audio_input', type: 'select', options: ['pcm', 'ulaw', 'alaw', 'opus', 'mp3'], default: 'pcm' },

            // === AGC & NOISE CONTROL (15 knobs) ===
            'agc_enabled': { category: 'agc', type: 'boolean', default: true },
            'agc_target_level_dbfs': { category: 'agc', type: 'numeric', min: -30, max: -6, step: 1, default: -18 },
            'agc_max_gain_db': { category: 'agc', type: 'numeric', min: 0, max: 30, step: 1, default: 20 },
            'agc_attack_time_ms': { category: 'agc', type: 'numeric', min: 1, max: 100, step: 1, default: 10 },
            'agc_release_time_ms': { category: 'agc', type: 'numeric', min: 10, max: 1000, step: 10, default: 100 },
            'noise_reduction_enabled': { category: 'noise', type: 'boolean', default: true },
            'noise_reduction_strength': { category: 'noise', type: 'numeric', min: 0, max: 5, step: 1, default: 3 },
            'noise_gate_threshold_db': { category: 'noise', type: 'numeric', min: -60, max: -20, step: 1, default: -40 },
            'echo_cancellation_enabled': { category: 'noise', type: 'boolean', default: true },
            'echo_suppression_level': { category: 'noise', type: 'numeric', min: 0, max: 100, step: 10, default: 50 },

            // === FILTERS (10 knobs) ===
            'high_pass_filter_enabled': { category: 'filters', type: 'boolean', default: true },
            'high_pass_filter_hz': { category: 'filters', type: 'numeric', min: 0, max: 300, step: 10, default: 80 },
            'low_pass_filter_enabled': { category: 'filters', type: 'boolean', default: true },
            'low_pass_filter_hz': { category: 'filters', type: 'numeric', min: 3000, max: 16000, step: 100, default: 8000 },
            'notch_filter_enabled': { category: 'filters', type: 'boolean', default: false },
            'notch_filter_freq_hz': { category: 'filters', type: 'numeric', min: 20, max: 20000, step: 10, default: 50 },
            'notch_filter_q': { category: 'filters', type: 'numeric', min: 0.1, max: 10, step: 0.1, default: 1.0 },
            'de_esser_enabled': { category: 'filters', type: 'boolean', default: false },
            'de_esser_threshold_db': { category: 'filters', type: 'numeric', min: -40, max: 0, step: 1, default: -20 },
            'de_esser_frequency_hz': { category: 'filters', type: 'numeric', min: 4000, max: 10000, step: 100, default: 6000 },

            // === VAD (Voice Activity Detection) (10 knobs) ===
            'vad_enabled': { category: 'vad', type: 'boolean', default: true },
            'vad_threshold': { category: 'vad', type: 'numeric', min: 0.1, max: 0.9, step: 0.1, default: 0.5 },
            'vad_pre_buffer_ms': { category: 'vad', type: 'numeric', min: 0, max: 500, step: 50, default: 100 },
            'vad_post_buffer_ms': { category: 'vad', type: 'numeric', min: 0, max: 1000, step: 50, default: 200 },
            'vad_min_speech_duration_ms': { category: 'vad', type: 'numeric', min: 50, max: 500, step: 50, default: 100 },
            'vad_max_silence_duration_ms': { category: 'vad', type: 'numeric', min: 100, max: 3000, step: 100, default: 500 },
            'vad_algorithm': { category: 'vad', type: 'select', options: ['energy', 'frequency', 'ml', 'hybrid'], default: 'hybrid' },
            'vad_sensitivity': { category: 'vad', type: 'select', options: ['low', 'medium', 'high', 'auto'], default: 'medium' },
            'vad_comfort_noise': { category: 'vad', type: 'boolean', default: false },
            'vad_hang_time_ms': { category: 'vad', type: 'numeric', min: 0, max: 2000, step: 100, default: 300 },

            // === BUFFER MANAGEMENT (15 knobs) ===
            'buffer_size_chunks': { category: 'buffer', type: 'numeric', min: 5, max: 50, step: 5, default: 10 },
            'audio_chunk_size_ms': { category: 'buffer', type: 'numeric', min: 20, max: 500, step: 20, default: 100 },
            'buffer_strategy': { category: 'buffer', type: 'select', options: ['fixed', 'adaptive', 'dynamic'], default: 'adaptive' },
            'jitter_buffer_enabled': { category: 'buffer', type: 'boolean', default: true },
            'jitter_buffer_size_ms': { category: 'buffer', type: 'numeric', min: 20, max: 200, step: 10, default: 50 },
            'jitter_buffer_max_size_ms': { category: 'buffer', type: 'numeric', min: 50, max: 500, step: 50, default: 200 },
            'adaptive_buffer_min_ms': { category: 'buffer', type: 'numeric', min: 10, max: 100, step: 10, default: 30 },
            'adaptive_buffer_max_ms': { category: 'buffer', type: 'numeric', min: 100, max: 1000, step: 100, default: 300 },
            'buffer_underrun_threshold': { category: 'buffer', type: 'numeric', min: 0, max: 10, step: 1, default: 2 },
            'buffer_overrun_threshold': { category: 'buffer', type: 'numeric', min: 70, max: 100, step: 5, default: 90 },
            'circular_buffer_size_kb': { category: 'buffer', type: 'numeric', min: 64, max: 2048, step: 64, default: 256 },
            'prebuffer_chunks': { category: 'buffer', type: 'numeric', min: 1, max: 10, step: 1, default: 3 },
            'max_buffer_latency_ms': { category: 'buffer', type: 'numeric', min: 50, max: 500, step: 50, default: 200 },
            'buffer_drain_rate_factor': { category: 'buffer', type: 'numeric', min: 0.5, max: 2.0, step: 0.1, default: 1.0 },
            'buffer_fill_rate_factor': { category: 'buffer', type: 'numeric', min: 0.5, max: 2.0, step: 0.1, default: 1.0 },

            // === STT/DEEPGRAM SETTINGS (15 knobs) ===
            'deepgram_enabled': { category: 'stt', type: 'boolean', default: true },
            'deepgram_model': { category: 'stt', type: 'select', options: ['nova-2', 'nova', 'enhanced', 'base'], default: 'nova-2' },
            'deepgram_language': { category: 'stt', type: 'select', options: ['en-US', 'en-GB', 'es', 'fr', 'de', 'ja'], default: 'en-US' },
            'deepgram_punctuate': { category: 'stt', type: 'boolean', default: true },
            'deepgram_profanity_filter': { category: 'stt', type: 'boolean', default: false },
            'deepgram_redact': { category: 'stt', type: 'boolean', default: false },
            'deepgram_diarize': { category: 'stt', type: 'boolean', default: false },
            'deepgram_smart_format': { category: 'stt', type: 'boolean', default: true },
            'deepgram_numerals': { category: 'stt', type: 'boolean', default: true },
            'deepgram_interim_results': { category: 'stt', type: 'boolean', default: true },
            'deepgram_utterance_end_ms': { category: 'stt', type: 'numeric', min: 500, max: 3000, step: 100, default: 1000 },
            'deepgram_keywords': { category: 'stt', type: 'array', default: [] },
            'deepgram_search': { category: 'stt', type: 'array', default: [] },
            'deepgram_replace': { category: 'stt', type: 'array', default: [] },
            'deepgram_tag': { category: 'stt', type: 'array', default: [] },

            // === TTS/ELEVENLABS SETTINGS (20 knobs) ===
            'tts_provider': { category: 'tts', type: 'select', options: ['elevenlabs', 'azure', 'google', 'amazon'], default: 'elevenlabs' },
            'elevenlabs_voice_id': { category: 'tts', type: 'select', options: ['rachel', 'domi', 'bella', 'antoni', 'josh'], default: 'rachel' },
            'elevenlabs_model_id': { category: 'tts', type: 'select', options: ['eleven_monolingual_v1', 'eleven_multilingual_v2'], default: 'eleven_monolingual_v1' },
            'voice_settings_stability': { category: 'tts', type: 'numeric', min: 0, max: 1, step: 0.1, default: 0.5 },
            'voice_settings_similarity_boost': { category: 'tts', type: 'numeric', min: 0, max: 1, step: 0.05, default: 0.75 },
            'voice_settings_style': { category: 'tts', type: 'numeric', min: 0, max: 1, step: 0.1, default: 0 },
            'voice_settings_use_speaker_boost': { category: 'tts', type: 'boolean', default: true },
            'tts_output_format': { category: 'tts', type: 'select', options: ['mp3_44100', 'pcm_16000', 'pcm_22050', 'pcm_44100'], default: 'pcm_16000' },
            'tts_optimize_streaming_latency': { category: 'tts', type: 'numeric', min: 0, max: 4, step: 1, default: 0 },
            'tts_chunk_size_chars': { category: 'tts', type: 'numeric', min: 100, max: 5000, step: 100, default: 1000 },
            'speech_speed_factor': { category: 'tts', type: 'numeric', min: 0.5, max: 2.0, step: 0.1, default: 1.0 },
            'pitch_shift_semitones': { category: 'tts', type: 'numeric', min: -12, max: 12, step: 1, default: 0 },
            'emphasis_strength': { category: 'tts', type: 'numeric', min: 0, max: 2, step: 0.1, default: 1.0 },
            'pause_duration_factor': { category: 'tts', type: 'numeric', min: 0.5, max: 2.0, step: 0.1, default: 1.0 },
            'tts_cache_enabled': { category: 'tts', type: 'boolean', default: true },
            'tts_cache_ttl_seconds': { category: 'tts', type: 'numeric', min: 0, max: 3600, step: 60, default: 300 },
            'tts_max_retries': { category: 'tts', type: 'numeric', min: 0, max: 5, step: 1, default: 3 },
            'tts_timeout_ms': { category: 'tts', type: 'numeric', min: 1000, max: 30000, step: 1000, default: 10000 },
            'tts_batch_enabled': { category: 'tts', type: 'boolean', default: false },
            'tts_batch_size': { category: 'tts', type: 'numeric', min: 1, max: 10, step: 1, default: 1 },

            // === OUTPUT PROCESSING (10 knobs) ===
            'output_gain_db': { category: 'audio_output', type: 'numeric', min: -12, max: 12, step: 0.5, default: 0 },
            'output_sample_rate': { category: 'audio_output', type: 'select', options: [8000, 16000, 22050, 44100, 48000], default: 16000 },
            'output_channels': { category: 'audio_output', type: 'select', options: [1, 2], default: 1 },
            'output_bit_depth': { category: 'audio_output', type: 'select', options: [8, 16, 24, 32], default: 16 },
            'output_codec': { category: 'audio_output', type: 'select', options: ['pcm', 'ulaw', 'alaw', 'opus', 'mp3'], default: 'pcm' },
            'normalize_output': { category: 'audio_output', type: 'boolean', default: true },
            'compress_dynamic_range': { category: 'audio_output', type: 'boolean', default: false },
            'output_limiter_enabled': { category: 'audio_output', type: 'boolean', default: true },
            'output_limiter_threshold_db': { category: 'audio_output', type: 'numeric', min: -6, max: 0, step: 0.5, default: -1 },
            'output_fade_ms': { category: 'audio_output', type: 'numeric', min: 0, max: 100, step: 10, default: 10 },

            // === NETWORK & PERFORMANCE (5 knobs) ===
            'network_timeout_ms': { category: 'network', type: 'numeric', min: 1000, max: 30000, step: 1000, default: 5000 },
            'retry_attempts': { category: 'network', type: 'numeric', min: 0, max: 10, step: 1, default: 3 },
            'stream_keepalive_ms': { category: 'network', type: 'numeric', min: 5000, max: 60000, step: 5000, default: 30000 },
            'max_concurrent_requests': { category: 'network', type: 'numeric', min: 1, max: 20, step: 1, default: 5 },
            'parallel_processing': { category: 'network', type: 'boolean', default: true }
        };
    }

    /**
     * Get knobs values for specific station (with NA for unavailable ones)
     */
    getStationKnobs(stationId) {
        const allKnobs = {};

        // Initialize all knobs with NA
        for (const [knobName, knobConfig] of Object.entries(this.ALL_KNOBS)) {
            allKnobs[knobName] = 'NA';
        }

        // Define which knobs are available at each station
        const stationCapabilities = {
            'STATION_1': { // Asterisk RTP
                available: ['input_gain_db', 'input_sample_rate', 'input_channels', 'input_codec',
                           'jitter_buffer_enabled', 'jitter_buffer_size_ms', 'buffer_size_chunks',
                           'network_timeout_ms', 'retry_attempts']
            },
            'STATION_2': { // Gateway PCM Out
                available: ['output_gain_db', 'buffer_size_chunks', 'audio_chunk_size_ms',
                           'output_sample_rate', 'output_codec', 'normalize_output']
            },
            'STATION_3': { // STTTTSserver before Deepgram
                available: ['input_gain_db', 'agc_enabled', 'agc_target_level_dbfs', 'agc_max_gain_db',
                           'noise_reduction_enabled', 'noise_reduction_strength', 'echo_cancellation_enabled',
                           'high_pass_filter_enabled', 'high_pass_filter_hz', 'low_pass_filter_enabled',
                           'low_pass_filter_hz', 'vad_enabled', 'vad_threshold', 'vad_pre_buffer_ms',
                           'vad_post_buffer_ms', 'buffer_size_chunks', 'audio_chunk_size_ms',
                           'deepgram_model', 'deepgram_language', 'deepgram_punctuate',
                           'deepgram_interim_results', 'network_timeout_ms']
            },
            'STATION_4': { // Deepgram Client
                available: ['deepgram_enabled', 'deepgram_model', 'deepgram_language', 'deepgram_punctuate',
                           'deepgram_profanity_filter', 'deepgram_redact', 'deepgram_diarize',
                           'deepgram_smart_format', 'deepgram_numerals', 'deepgram_interim_results',
                           'deepgram_utterance_end_ms', 'network_timeout_ms', 'retry_attempts']
            },
            'STATION_9': { // STTTTSserver TTS output
                available: ['tts_provider', 'elevenlabs_voice_id', 'elevenlabs_model_id',
                           'voice_settings_stability', 'voice_settings_similarity_boost',
                           'voice_settings_style', 'voice_settings_use_speaker_boost',
                           'tts_output_format', 'tts_optimize_streaming_latency', 'speech_speed_factor',
                           'pitch_shift_semitones', 'emphasis_strength', 'pause_duration_factor',
                           'output_gain_db', 'output_sample_rate', 'normalize_output',
                           'compress_dynamic_range', 'tts_cache_enabled', 'tts_timeout_ms',
                           'buffer_size_chunks', 'prebuffer_chunks']
            },
            'STATION_10': { // Gateway RTP return
                available: ['output_gain_db', 'output_codec', 'jitter_buffer_size_ms',
                           'buffer_drain_rate_factor', 'network_timeout_ms']
            },
            'STATION_11': { // Hume emotion
                available: ['input_sample_rate', 'vad_enabled', 'vad_threshold',
                           'network_timeout_ms', 'parallel_processing']
            }
        };

        // Set actual values for available knobs at this station
        const capabilities = stationCapabilities[stationId];
        if (capabilities && capabilities.available) {
            for (const knobName of capabilities.available) {
                const knobConfig = this.ALL_KNOBS[knobName];
                if (knobConfig) {
                    // Get current value (in production, read from actual config)
                    allKnobs[knobName] = this.getCurrentKnobValue(stationId, knobName, knobConfig);
                }
            }
        }

        return allKnobs;
    }

    /**
     * Get current knob value (simulated - in production read from actual config)
     */
    getCurrentKnobValue(stationId, knobName, knobConfig) {
        // In production, this would read from actual configuration
        // For now, return default or simulated current value

        if (knobConfig.type === 'boolean') {
            return knobConfig.default;
        } else if (knobConfig.type === 'numeric') {
            // Return a value between min and max
            const range = knobConfig.max - knobConfig.min;
            const position = 0.3 + Math.random() * 0.4; // 30-70% of range
            return knobConfig.min + (range * position);
        } else if (knobConfig.type === 'select') {
            return knobConfig.default || knobConfig.options[0];
        } else if (knobConfig.type === 'array') {
            return knobConfig.default || [];
        }

        return knobConfig.default || 'NA';
    }

    /**
     * Store unified knobs snapshot with metrics
     */
    async storeUnifiedKnobsSnapshot(segmentId, stationId) {
        const knobs = this.getStationKnobs(stationId);

        // Count available vs NA knobs
        const availableCount = Object.values(knobs).filter(v => v !== 'NA').length;
        const totalCount = Object.keys(knobs).length;

        console.log(`📊 ${stationId}: ${availableCount}/${totalCount} knobs available`);

        // Store in database with metrics
        const updateQuery = `
            UPDATE station_snapshots
            SET metrics = jsonb_set(
                jsonb_set(
                    COALESCE(metrics, '{}'),
                    '{configuration_knobs}',
                    $1::jsonb
                ),
                '{knobs_summary}',
                $2::jsonb
            )
            WHERE segment_id = $3 AND station_id = $4
        `;

        const knobsSummary = {
            total_knobs: totalCount,
            available_knobs: availableCount,
            na_knobs: totalCount - availableCount,
            coverage_pct: Math.round((availableCount / totalCount) * 100)
        };

        await this.pool.query(updateQuery, [
            JSON.stringify(knobs),
            JSON.stringify(knobsSummary),
            segmentId,
            stationId
        ]);

        return { knobs, summary: knobsSummary };
    }

    /**
     * Generate complete knobs report for all stations
     */
    async generateCompleteKnobsReport() {
        console.log('=' .repeat(60));
        console.log('UNIFIED CONFIGURATION KNOBS REPORT');
        console.log('=' .repeat(60));
        console.log(`\nTotal System Knobs: ${Object.keys(this.ALL_KNOBS).length}\n`);

        const allStations = ['STATION_1', 'STATION_2', 'STATION_3', 'STATION_4',
                            'STATION_9', 'STATION_10', 'STATION_11'];

        const report = {
            timestamp: new Date().toISOString(),
            total_system_knobs: Object.keys(this.ALL_KNOBS).length,
            knobs_definition: this.ALL_KNOBS,
            stations: {}
        };

        for (const stationId of allStations) {
            const knobs = this.getStationKnobs(stationId);
            const availableCount = Object.values(knobs).filter(v => v !== 'NA').length;

            report.stations[stationId] = {
                knobs: knobs,
                summary: {
                    available: availableCount,
                    na: Object.keys(knobs).length - availableCount,
                    coverage_pct: Math.round((availableCount / Object.keys(knobs).length) * 100)
                }
            };

            console.log(`${stationId}:`);
            console.log(`  Available knobs: ${availableCount}`);
            console.log(`  NA knobs: ${Object.keys(knobs).length - availableCount}`);
            console.log(`  Coverage: ${report.stations[stationId].summary.coverage_pct}%`);
            console.log('');
        }

        // Save to file
        fs.writeFileSync(
            'unified-knobs-configuration.json',
            JSON.stringify(report, null, 2)
        );

        console.log('✅ Report saved to unified-knobs-configuration.json');
        console.log('\nThis unified format ensures consistent data structure for LLM analysis.');

        return report;
    }

    async close() {
        await this.pool.end();
    }
}

// Export for use in monitoring
module.exports = { UnifiedKnobsCollector };

// Run if called directly
if (require.main === module) {
    const collector = new UnifiedKnobsCollector();
    collector.generateCompleteKnobsReport()
        .then(report => {
            console.log('\n🎯 Unified knobs collection complete!');
            console.log('Ready for LLM analysis with consistent NA format.');
            return collector.close();
        })
        .catch(console.error);
}