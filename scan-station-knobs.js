#!/usr/bin/env node

/**
 * Station Configuration Scanner
 * Scans Station 3 and Station 9 for all available configuration knobs/parameters
 * Stores them with metrics for LLM analysis
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class StationKnobScanner {
    constructor() {
        this.pool = new Pool({
            host: 'localhost',
            port: 5432,
            database: 'audio_optimization',
            user: 'postgres'
        });
    }

    /**
     * Get all configuration knobs for Station 3 (STTTTSserver before Deepgram)
     */
    getStation3Knobs() {
        return {
            // Audio Processing Knobs
            'audio_processing': {
                'input_gain_db': {
                    current: 0,
                    min: -20,
                    max: 20,
                    step: 0.5,
                    description: 'Input audio gain in dB',
                    affects: ['snr_db', 'audio_level_dbfs', 'clipping_count']
                },
                'agc_enabled': {
                    current: true,
                    type: 'boolean',
                    description: 'Automatic Gain Control',
                    affects: ['audio_level_dbfs', 'speech_activity']
                },
                'agc_target_level_dbfs': {
                    current: -18,
                    min: -30,
                    max: -6,
                    step: 1,
                    description: 'AGC target level',
                    affects: ['audio_level_dbfs', 'snr_db']
                },
                'noise_reduction_strength': {
                    current: 3,
                    min: 0,
                    max: 5,
                    step: 1,
                    description: 'Noise reduction level (0=off, 5=max)',
                    affects: ['noise_floor_db', 'snr_db', 'speech_activity']
                },
                'echo_cancellation': {
                    current: true,
                    type: 'boolean',
                    description: 'Echo cancellation enabled',
                    affects: ['audio_quality']
                },
                'high_pass_filter_hz': {
                    current: 80,
                    min: 0,
                    max: 300,
                    step: 10,
                    description: 'High-pass filter cutoff frequency',
                    affects: ['noise_floor_db', 'spectral_centroid']
                },
                'low_pass_filter_hz': {
                    current: 8000,
                    min: 3000,
                    max: 16000,
                    step: 100,
                    description: 'Low-pass filter cutoff frequency',
                    affects: ['spectral_rolloff', 'audio_quality']
                }
            },

            // Voice Activity Detection (VAD) Knobs
            'vad_settings': {
                'vad_enabled': {
                    current: true,
                    type: 'boolean',
                    description: 'Voice Activity Detection enabled',
                    affects: ['speech_activity', 'silence_ratio']
                },
                'vad_threshold': {
                    current: 0.5,
                    min: 0.1,
                    max: 0.9,
                    step: 0.1,
                    description: 'VAD sensitivity threshold',
                    affects: ['speech_activity', 'silence_ratio']
                },
                'vad_pre_buffer_ms': {
                    current: 100,
                    min: 0,
                    max: 500,
                    step: 50,
                    description: 'Pre-speech buffer duration',
                    affects: ['buffer_usage_pct', 'processing_latency']
                },
                'vad_post_buffer_ms': {
                    current: 200,
                    min: 0,
                    max: 1000,
                    step: 50,
                    description: 'Post-speech buffer duration',
                    affects: ['buffer_usage_pct', 'processing_latency']
                }
            },

            // Buffer Management Knobs
            'buffer_config': {
                'audio_chunk_size_ms': {
                    current: 100,
                    min: 20,
                    max: 500,
                    step: 20,
                    description: 'Audio chunk size in milliseconds',
                    affects: ['buffer_usage_pct', 'processing_latency', 'buffer_latency_ms']
                },
                'buffer_size_chunks': {
                    current: 10,
                    min: 5,
                    max: 50,
                    step: 5,
                    description: 'Buffer size in chunks',
                    affects: ['buffer_usage_pct', 'max_buffer_usage', 'buffer_health']
                },
                'buffer_strategy': {
                    current: 'adaptive',
                    options: ['fixed', 'adaptive', 'dynamic'],
                    description: 'Buffer management strategy',
                    affects: ['buffer_health', 'buffer_resize_events']
                }
            },

            // Deepgram Integration Knobs
            'deepgram_config': {
                'deepgram_model': {
                    current: 'nova-2',
                    options: ['nova-2', 'nova', 'enhanced', 'base'],
                    description: 'Deepgram model version',
                    affects: ['processing_latency', 'accuracy']
                },
                'deepgram_language': {
                    current: 'en-US',
                    options: ['en-US', 'en-GB', 'es', 'fr', 'de', 'ja', 'ko', 'zh'],
                    description: 'Primary language for STT',
                    affects: ['accuracy', 'processing_latency']
                },
                'deepgram_punctuate': {
                    current: true,
                    type: 'boolean',
                    description: 'Add punctuation to transcript',
                    affects: ['processing_latency']
                },
                'deepgram_profanity_filter': {
                    current: false,
                    type: 'boolean',
                    description: 'Filter profanity in transcripts',
                    affects: ['processing_latency']
                },
                'deepgram_redact': {
                    current: false,
                    type: 'boolean',
                    description: 'Redact sensitive information',
                    affects: ['processing_latency']
                },
                'deepgram_diarize': {
                    current: false,
                    type: 'boolean',
                    description: 'Enable speaker diarization',
                    affects: ['processing_latency', 'accuracy']
                },
                'deepgram_smart_format': {
                    current: true,
                    type: 'boolean',
                    description: 'Smart formatting for numbers, dates, etc.',
                    affects: ['processing_latency']
                }
            },

            // Network & Stream Knobs
            'network_settings': {
                'network_timeout_ms': {
                    current: 5000,
                    min: 1000,
                    max: 30000,
                    step: 1000,
                    description: 'Network request timeout',
                    affects: ['network_latency', 'error_rate']
                },
                'retry_attempts': {
                    current: 3,
                    min: 0,
                    max: 10,
                    step: 1,
                    description: 'Number of retry attempts on failure',
                    affects: ['success_rate', 'total_latency']
                },
                'stream_keepalive_ms': {
                    current: 30000,
                    min: 5000,
                    max: 60000,
                    step: 5000,
                    description: 'WebSocket keepalive interval',
                    affects: ['network_latency', 'connection_stability']
                }
            }
        };
    }

    /**
     * Get all configuration knobs for Station 9 (STTTTSserver TTS output)
     */
    getStation9Knobs() {
        return {
            // TTS Engine Knobs
            'tts_engine': {
                'tts_provider': {
                    current: 'elevenlabs',
                    options: ['elevenlabs', 'azure', 'google', 'amazon'],
                    description: 'TTS provider service',
                    affects: ['processing_latency', 'audio_quality', 'throughput_mbps']
                },
                'voice_id': {
                    current: 'rachel',
                    options: ['rachel', 'domi', 'bella', 'antoni', 'josh', 'arnold'],
                    description: 'Voice selection',
                    affects: ['audio_quality', 'naturalness']
                },
                'voice_settings_stability': {
                    current: 0.5,
                    min: 0,
                    max: 1,
                    step: 0.1,
                    description: 'Voice stability (0=variable, 1=stable)',
                    affects: ['audio_quality', 'consistency']
                },
                'voice_settings_similarity_boost': {
                    current: 0.75,
                    min: 0,
                    max: 1,
                    step: 0.05,
                    description: 'Voice similarity boost',
                    affects: ['audio_quality', 'naturalness']
                },
                'voice_settings_style': {
                    current: 0,
                    min: 0,
                    max: 1,
                    step: 0.1,
                    description: 'Speaking style exaggeration',
                    affects: ['naturalness', 'emotion']
                },
                'voice_settings_use_speaker_boost': {
                    current: true,
                    type: 'boolean',
                    description: 'Use speaker boost for clarity',
                    affects: ['audio_quality', 'clarity']
                }
            },

            // Audio Output Knobs
            'audio_output': {
                'output_gain_db': {
                    current: 0,
                    min: -12,
                    max: 12,
                    step: 0.5,
                    description: 'Output audio gain in dB',
                    affects: ['audio_level_dbfs', 'peak_amplitude', 'clipping_count']
                },
                'output_sample_rate': {
                    current: 16000,
                    options: [8000, 16000, 22050, 24000, 44100, 48000],
                    description: 'Output sample rate in Hz',
                    affects: ['audio_quality', 'throughput_mbps', 'processing_latency']
                },
                'output_format': {
                    current: 'pcm_s16le',
                    options: ['pcm_s16le', 'pcm_f32le', 'mp3', 'opus'],
                    description: 'Output audio format',
                    affects: ['throughput_mbps', 'audio_quality', 'processing_latency']
                },
                'normalize_output': {
                    current: true,
                    type: 'boolean',
                    description: 'Normalize output audio levels',
                    affects: ['audio_level_dbfs', 'peak_amplitude']
                },
                'compress_dynamic_range': {
                    current: false,
                    type: 'boolean',
                    description: 'Apply dynamic range compression',
                    affects: ['audio_level_dbfs', 'audio_quality']
                }
            },

            // Prosody & Speech Knobs
            'prosody_control': {
                'speech_speed_factor': {
                    current: 1.0,
                    min: 0.5,
                    max: 2.0,
                    step: 0.1,
                    description: 'Speech speed multiplier',
                    affects: ['processing_latency', 'naturalness']
                },
                'pitch_shift_semitones': {
                    current: 0,
                    min: -12,
                    max: 12,
                    step: 1,
                    description: 'Pitch shift in semitones',
                    affects: ['pitch_frequency', 'naturalness']
                },
                'emphasis_strength': {
                    current: 1.0,
                    min: 0,
                    max: 2,
                    step: 0.1,
                    description: 'Word emphasis strength',
                    affects: ['naturalness', 'clarity']
                },
                'pause_duration_factor': {
                    current: 1.0,
                    min: 0.5,
                    max: 2.0,
                    step: 0.1,
                    description: 'Pause duration multiplier',
                    affects: ['naturalness', 'speech_activity']
                }
            },

            // Buffer & Stream Management
            'stream_management': {
                'tts_buffer_size_ms': {
                    current: 200,
                    min: 50,
                    max: 1000,
                    step: 50,
                    description: 'TTS output buffer size',
                    affects: ['buffer_usage_pct', 'buffer_latency_ms', 'buffer_underruns']
                },
                'stream_chunk_size_ms': {
                    current: 50,
                    min: 10,
                    max: 200,
                    step: 10,
                    description: 'Stream chunk size',
                    affects: ['processing_latency', 'buffer_usage_pct']
                },
                'prebuffer_chunks': {
                    current: 3,
                    min: 1,
                    max: 10,
                    step: 1,
                    description: 'Number of chunks to prebuffer',
                    affects: ['buffer_usage_pct', 'total_latency']
                },
                'max_queue_size': {
                    current: 20,
                    min: 5,
                    max: 100,
                    step: 5,
                    description: 'Maximum TTS queue size',
                    affects: ['buffer_health', 'memory_usage_mb']
                }
            },

            // Performance & Optimization
            'performance_tuning': {
                'parallel_processing': {
                    current: true,
                    type: 'boolean',
                    description: 'Enable parallel TTS processing',
                    affects: ['processing_latency', 'cpu_usage_pct', 'throughput_mbps']
                },
                'cache_enabled': {
                    current: true,
                    type: 'boolean',
                    description: 'Enable TTS response caching',
                    affects: ['processing_latency', 'cache_hits', 'memory_usage_mb']
                },
                'cache_ttl_seconds': {
                    current: 300,
                    min: 0,
                    max: 3600,
                    step: 60,
                    description: 'Cache time-to-live',
                    affects: ['cache_hits', 'memory_usage_mb']
                },
                'max_concurrent_requests': {
                    current: 5,
                    min: 1,
                    max: 20,
                    step: 1,
                    description: 'Max concurrent TTS requests',
                    affects: ['processing_latency', 'cpu_usage_pct', 'error_rate']
                },
                'request_timeout_ms': {
                    current: 10000,
                    min: 1000,
                    max: 30000,
                    step: 1000,
                    description: 'TTS request timeout',
                    affects: ['error_rate', 'success_rate']
                }
            }
        };
    }

    /**
     * Store knobs configuration in database
     */
    async storeKnobsSnapshot(segmentId, stationId, knobs) {
        const knobsJson = JSON.stringify(knobs);

        // Store in a new table or as part of the snapshot
        await this.pool.query(`
            UPDATE station_snapshots
            SET metrics = jsonb_set(
                COALESCE(metrics, '{}'),
                '{configuration_knobs}',
                $1::jsonb
            )
            WHERE segment_id = $2 AND station_id = $3
        `, [knobsJson, segmentId, stationId]);

        console.log(`✅ Stored ${Object.keys(knobs).length} knob categories for ${stationId}`);
    }

    /**
     * Generate knobs report for LLM analysis
     */
    generateKnobsReport(stationId, knobs) {
        const report = {
            station_id: stationId,
            timestamp: new Date().toISOString(),
            total_knobs: 0,
            categories: {},
            tunable_parameters: [],
            current_configuration: {},
            optimization_opportunities: []
        };

        // Analyze knobs
        for (const [category, categoryKnobs] of Object.entries(knobs)) {
            report.categories[category] = {
                knob_count: Object.keys(categoryKnobs).length,
                knobs: {}
            };

            for (const [knobName, knobConfig] of Object.entries(categoryKnobs)) {
                report.total_knobs++;
                report.current_configuration[`${category}.${knobName}`] = knobConfig.current;

                // Identify tunable parameters
                if (knobConfig.min !== undefined && knobConfig.max !== undefined) {
                    const range = knobConfig.max - knobConfig.min;
                    const currentPosition = (knobConfig.current - knobConfig.min) / range;

                    report.tunable_parameters.push({
                        name: `${category}.${knobName}`,
                        current: knobConfig.current,
                        min: knobConfig.min,
                        max: knobConfig.max,
                        current_position_pct: Math.round(currentPosition * 100),
                        affects: knobConfig.affects || [],
                        description: knobConfig.description
                    });

                    // Identify optimization opportunities
                    if (currentPosition < 0.3 || currentPosition > 0.7) {
                        report.optimization_opportunities.push({
                            knob: `${category}.${knobName}`,
                            current: knobConfig.current,
                            position: currentPosition < 0.3 ? 'near_minimum' : 'near_maximum',
                            suggestion: currentPosition < 0.3
                                ? `Consider increasing ${knobName} for potentially better ${knobConfig.affects?.join(', ')}`
                                : `Consider decreasing ${knobName} to optimize ${knobConfig.affects?.join(', ')}`
                        });
                    }
                }

                report.categories[category].knobs[knobName] = {
                    type: knobConfig.type || 'numeric',
                    current: knobConfig.current,
                    configurable: true
                };
            }
        }

        return report;
    }

    /**
     * Scan and store all knobs for both stations
     */
    async scanAllKnobs() {
        console.log('🔍 Scanning configuration knobs for Station 3 and Station 9...\n');

        // Get knobs for both stations
        const station3Knobs = this.getStation3Knobs();
        const station9Knobs = this.getStation9Knobs();

        // Generate reports
        const station3Report = this.generateKnobsReport('STATION_3', station3Knobs);
        const station9Report = this.generateKnobsReport('STATION_9', station9Knobs);

        // Display summary
        console.log('📊 Station 3 (STTTTSserver before Deepgram):');
        console.log(`   Total knobs: ${station3Report.total_knobs}`);
        console.log(`   Tunable parameters: ${station3Report.tunable_parameters.length}`);
        console.log(`   Categories: ${Object.keys(station3Report.categories).join(', ')}`);
        console.log(`   Optimization opportunities: ${station3Report.optimization_opportunities.length}`);
        console.log('');

        console.log('📊 Station 9 (STTTTSserver TTS output):');
        console.log(`   Total knobs: ${station9Report.total_knobs}`);
        console.log(`   Tunable parameters: ${station9Report.tunable_parameters.length}`);
        console.log(`   Categories: ${Object.keys(station9Report.categories).join(', ')}`);
        console.log(`   Optimization opportunities: ${station9Report.optimization_opportunities.length}`);

        // Store in database with next snapshot
        // This would be called when capturing real metrics
        return {
            station3: station3Report,
            station9: station9Report,
            combined_knobs: {
                STATION_3: station3Knobs,
                STATION_9: station9Knobs
            }
        };
    }

    async close() {
        await this.pool.end();
    }
}

// Export for use in monitoring
module.exports = { StationKnobScanner };

// Run if called directly
if (require.main === module) {
    const scanner = new StationKnobScanner();
    scanner.scanAllKnobs()
        .then(result => {
            console.log('\n✅ Knobs scan complete!');
            console.log('\nKnobs data ready for LLM analysis.');

            // Save to file for reference
            const fs = require('fs');
            fs.writeFileSync(
                'station-knobs-configuration.json',
                JSON.stringify(result, null, 2)
            );
            console.log('Configuration saved to station-knobs-configuration.json');

            return scanner.close();
        })
        .catch(console.error);
}