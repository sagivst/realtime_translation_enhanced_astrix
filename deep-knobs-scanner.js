#!/usr/bin/env node

/**
 * Deep Configuration Scanner
 * Discovers ALL available knobs from running systems, config files, APIs, etc.
 * Goes beyond spec to find every possible tunable parameter
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DeepKnobsScanner {
    constructor() {
        this.discoveredKnobs = {
            predefined: {},     // From our spec
            environment: {},    // From env variables
            config_files: {},   // From .env and config files
            source_code: {},    // From source code analysis
            api_options: {},    // From API documentation
            runtime: {},        // From runtime inspection
            undocumented: {}    // Found but not documented
        };

        this.knobsCount = 0;
    }

    /**
     * Scan everything to discover all knobs
     */
    async scanEverything() {
        console.log('🔍 DEEP CONFIGURATION SCANNER STARTED');
        console.log('=' .repeat(60));
        console.log('Discovering ALL available knobs from all sources...\n');

        // 1. Scan environment variables
        await this.scanEnvironmentVariables();

        // 2. Scan configuration files
        await this.scanConfigurationFiles();

        // 3. Scan source code for configurable parameters
        await this.scanSourceCode();

        // 4. Scan API documentation
        await this.scanAPIOptions();

        // 5. Scan runtime objects
        await this.scanRuntimeConfiguration();

        // 6. Scan process arguments
        await this.scanProcessArguments();

        // 7. Generate comprehensive report
        return this.generateComprehensiveReport();
    }

    /**
     * 1. Scan all environment variables
     */
    async scanEnvironmentVariables() {
        console.log('📋 Scanning Environment Variables...');

        const envPatterns = [
            /^DEEPGRAM_/i,
            /^ELEVENLABS_/i,
            /^HUME_/i,
            /^AZURE_/i,
            /^AWS_/i,
            /^TTS_/i,
            /^STT_/i,
            /^AUDIO_/i,
            /^BUFFER_/i,
            /^VAD_/i,
            /^AGC_/i,
            /^NOISE_/i,
            /^FILTER_/i,
            /^GATEWAY_/i,
            /^RTP_/i,
            /^SIP_/i,
            /^CODEC_/i,
            /^STREAM_/i,
            /^WEBSOCKET_/i,
            /^UDP_/i,
            /^PORT_/i,
            /^HOST_/i,
            /^TIMEOUT_/i,
            /^RETRY_/i,
            /^CACHE_/i,
            /^LOG_/i,
            /^DEBUG_/i,
            /^MAX_/i,
            /^MIN_/i,
            /^DEFAULT_/i,
            /^ENABLE_/i,
            /^DISABLE_/i
        ];

        for (const [key, value] of Object.entries(process.env)) {
            for (const pattern of envPatterns) {
                if (pattern.test(key)) {
                    this.discoveredKnobs.environment[key] = {
                        source: 'environment',
                        current_value: value,
                        type: this.inferType(value),
                        category: this.categorizeKnob(key),
                        affects: this.inferAffects(key)
                    };
                    this.knobsCount++;
                    break;
                }
            }
        }

        console.log(`  Found ${Object.keys(this.discoveredKnobs.environment).length} environment knobs\n`);
    }

    /**
     * 2. Scan configuration files
     */
    async scanConfigurationFiles() {
        console.log('📁 Scanning Configuration Files...');

        const configPaths = [
            '/home/azureuser/.env',
            '/home/azureuser/.env.externalmedia',
            '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/.env',
            '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/.env.externalmedia',
            '/home/azureuser/translation-app/3333_4444__Operational/gateway-3333.js',
            '/home/azureuser/translation-app/3333_4444__Operational/gateway-4444.js',
            '/etc/asterisk/sip.conf',
            '/etc/asterisk/extensions.conf',
            '/etc/asterisk/rtp.conf'
        ];

        for (const configPath of configPaths) {
            try {
                if (fs.existsSync(configPath)) {
                    const content = fs.readFileSync(configPath, 'utf8');
                    this.parseConfigFile(content, configPath);
                }
            } catch (error) {
                // File not accessible
            }
        }

        console.log(`  Found ${Object.keys(this.discoveredKnobs.config_files).length} config file knobs\n`);
    }

    /**
     * 3. Scan source code for configuration options
     */
    async scanSourceCode() {
        console.log('💻 Scanning Source Code...');

        const sourcePatterns = [
            // Configuration object patterns
            /config\s*[=:]\s*\{([^}]+)\}/g,
            /options\s*[=:]\s*\{([^}]+)\}/g,
            /settings\s*[=:]\s*\{([^}]+)\}/g,
            /params\s*[=:]\s*\{([^}]+)\}/g,

            // Specific parameter patterns
            /process\.env\.(\w+)/g,
            /getenv\(['"](\w+)['"]\)/g,

            // Default value patterns
            /(\w+)\s*=\s*process\.env\.\w+\s*\|\|\s*['"]?([^'",\s]+)/g,
            /(\w+):\s*process\.env\.\w+\s*\|\|\s*['"]?([^'",\s]+)/g,

            // Option definitions
            /option\(['"](\w+)['"]\s*,\s*['"]([^'"]+)['"]/g,
            /parameter\(['"](\w+)['"]\s*,\s*['"]([^'"]+)['"]/g,

            // Getter/Setter patterns
            /get\s+(\w+)\(\)/g,
            /set\s+(\w+)\(/g,

            // Constants that look like config
            /const\s+([A-Z_]+)\s*=\s*(\d+|true|false|['"][^'"]+['"])/g,
            /let\s+([A-Z_]+)\s*=\s*(\d+|true|false|['"][^'"]+['"])/g
        ];

        const sourceFiles = [
            '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js',
            '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/elevenlabs-tts-service.js',
            '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/hume-streaming-client.js',
            '/home/azureuser/translation-app/3333_4444__Operational/gateway-3333.js',
            '/home/azureuser/translation-app/3333_4444__Operational/gateway-4444.js'
        ];

        for (const filePath of sourceFiles) {
            try {
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');

                    for (const pattern of sourcePatterns) {
                        const matches = content.matchAll(pattern);
                        for (const match of matches) {
                            const knobName = match[1];
                            if (knobName && this.isValidKnobName(knobName)) {
                                this.discoveredKnobs.source_code[knobName] = {
                                    source: `source:${path.basename(filePath)}`,
                                    found_in: filePath,
                                    pattern: pattern.source,
                                    value: match[2] || 'detected',
                                    type: this.inferType(match[2]),
                                    category: this.categorizeKnob(knobName)
                                };
                                this.knobsCount++;
                            }
                        }
                    }
                }
            } catch (error) {
                // File not accessible
            }
        }

        console.log(`  Found ${Object.keys(this.discoveredKnobs.source_code).length} source code knobs\n`);
    }

    /**
     * 4. Scan API documentation for all options
     */
    async scanAPIOptions() {
        console.log('🌐 Scanning API Options...');

        // Deepgram API options
        const deepgramOptions = {
            // Transcription options
            'deepgram.model': ['nova-2', 'nova', 'enhanced', 'base', 'whisper'],
            'deepgram.version': ['latest', 'v1', 'v2'],
            'deepgram.language': ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'hi', 'ja', 'zh', 'ru', 'ko', 'ar'],
            'deepgram.detect_language': 'boolean',
            'deepgram.punctuate': 'boolean',
            'deepgram.profanity_filter': 'boolean',
            'deepgram.redact': ['pci', 'numbers', 'ssn', 'true', 'false'],
            'deepgram.diarize': 'boolean',
            'deepgram.diarize_version': ['latest', '2021-07-14.0'],
            'deepgram.ner': 'boolean',
            'deepgram.multichannel': 'boolean',
            'deepgram.alternatives': 'number:1-10',
            'deepgram.numerals': 'boolean',
            'deepgram.search': 'array',
            'deepgram.replace': 'array',
            'deepgram.callback': 'url',
            'deepgram.callback_method': ['get', 'post'],
            'deepgram.keywords': 'array',
            'deepgram.keyword_boost': ['linear', 'log'],
            'deepgram.interim_results': 'boolean',
            'deepgram.endpointing': 'boolean|number',
            'deepgram.utterance_end_ms': 'number:0-5000',
            'deepgram.vad_events': 'boolean',
            'deepgram.smart_format': 'boolean',
            'deepgram.filler_words': 'boolean',
            'deepgram.channels': 'number:1-100',
            'deepgram.sample_rate': 'number:8000-48000',
            'deepgram.encoding': ['linear16', 'flac', 'mulaw', 'amr-nb', 'amr-wb', 'opus', 'speex', 'mp3', 'aac'],
            'deepgram.tag': 'array',
            'deepgram.sentiment': 'boolean',
            'deepgram.intent': 'boolean',
            'deepgram.topic': 'boolean',
            'deepgram.summarize': 'boolean',
            'deepgram.paragraphs': 'boolean',
            'deepgram.detect_entities': 'boolean',
            'deepgram.translation': ['es', 'fr', 'de', 'it', 'pt']
        };

        // ElevenLabs API options
        const elevenlabsOptions = {
            'elevenlabs.model_id': ['eleven_monolingual_v1', 'eleven_multilingual_v1', 'eleven_multilingual_v2', 'eleven_turbo_v2'],
            'elevenlabs.voice_id': 'string',
            'elevenlabs.voice_settings.stability': 'number:0-1',
            'elevenlabs.voice_settings.similarity_boost': 'number:0-1',
            'elevenlabs.voice_settings.style': 'number:0-1',
            'elevenlabs.voice_settings.use_speaker_boost': 'boolean',
            'elevenlabs.optimize_streaming_latency': 'number:0-4',
            'elevenlabs.output_format': ['mp3_22050_32', 'mp3_44100_32', 'mp3_44100_64', 'mp3_44100_96', 'mp3_44100_128', 'mp3_44100_192', 'pcm_16000', 'pcm_22050', 'pcm_24000', 'pcm_44100', 'ulaw_8000'],
            'elevenlabs.apply_text_normalization': ['auto', 'on', 'off'],
            'elevenlabs.seed': 'number',
            'elevenlabs.previous_text': 'string',
            'elevenlabs.next_text': 'string',
            'elevenlabs.previous_request_ids': 'array',
            'elevenlabs.next_request_ids': 'array'
        };

        // Hume API options
        const humeOptions = {
            'hume.language': 'string',
            'hume.models.prosody': 'boolean',
            'hume.models.facial_expression': 'boolean',
            'hume.models.burst': 'boolean',
            'hume.models.language': 'boolean',
            'hume.raw_text': 'boolean',
            'hume.config_id': 'string',
            'hume.stream_window_ms': 'number:500-5000',
            'hume.job_details': 'boolean'
        };

        // Gateway/RTP options
        const gatewayOptions = {
            'gateway.udp_port': 'number:1024-65535',
            'gateway.rtp_port': 'number:1024-65535',
            'gateway.buffer_size': 'number:1024-65536',
            'gateway.packet_size': 'number:20-1500',
            'gateway.sample_rate': 'number:8000-48000',
            'gateway.channels': 'number:1-2',
            'gateway.encoding': ['pcm', 'ulaw', 'alaw', 'opus'],
            'gateway.jitter_buffer': 'boolean',
            'gateway.echo_cancellation': 'boolean',
            'gateway.noise_suppression': 'boolean',
            'gateway.automatic_gain_control': 'boolean',
            'gateway.voice_activity_detection': 'boolean'
        };

        // Combine all API options
        const allAPIOptions = {
            ...deepgramOptions,
            ...elevenlabsOptions,
            ...humeOptions,
            ...gatewayOptions
        };

        for (const [key, value] of Object.entries(allAPIOptions)) {
            this.discoveredKnobs.api_options[key] = {
                source: 'api_documentation',
                type: typeof value === 'string' ? value : Array.isArray(value) ? 'enum' : 'unknown',
                options: Array.isArray(value) ? value : undefined,
                category: this.categorizeKnob(key),
                affects: this.inferAffects(key)
            };
            this.knobsCount++;
        }

        console.log(`  Found ${Object.keys(this.discoveredKnobs.api_options).length} API option knobs\n`);
    }

    /**
     * 5. Scan runtime configuration
     */
    async scanRuntimeConfiguration() {
        console.log('⚙️ Scanning Runtime Configuration...');

        // Try to extract runtime config from running processes
        try {
            // Get Node.js process arguments
            const psOutput = execSync('ps aux | grep -E "node|nodejs" | grep -v grep', { encoding: 'utf8' });
            const lines = psOutput.split('\n');

            for (const line of lines) {
                // Extract command line arguments
                const argMatches = line.match(/--(\w+)(?:=|\s+)([^\s]+)/g);
                if (argMatches) {
                    for (const match of argMatches) {
                        const [, key, value] = match.match(/--(\w+)(?:=|\s+)([^\s]+)/) || [];
                        if (key) {
                            this.discoveredKnobs.runtime[`cli.${key}`] = {
                                source: 'runtime_cli',
                                value: value || 'flag',
                                type: this.inferType(value),
                                category: 'runtime'
                            };
                            this.knobsCount++;
                        }
                    }
                }
            }
        } catch (error) {
            // Can't get process info
        }

        console.log(`  Found ${Object.keys(this.discoveredKnobs.runtime).length} runtime knobs\n`);
    }

    /**
     * 6. Scan process arguments and flags
     */
    async scanProcessArguments() {
        console.log('🚩 Scanning Process Arguments...');

        const commonArgs = [
            '--port', '--host', '--debug', '--verbose', '--quiet',
            '--config', '--env', '--mode', '--level', '--timeout',
            '--retry', '--max-connections', '--buffer-size',
            '--sample-rate', '--channels', '--format', '--codec',
            '--enable-ssl', '--cert', '--key', '--ca',
            '--log-level', '--log-file', '--metrics', '--trace'
        ];

        for (const arg of commonArgs) {
            this.discoveredKnobs.runtime[`arg${arg}`] = {
                source: 'common_args',
                type: 'string',
                category: 'runtime',
                description: `Common CLI argument: ${arg}`
            };
            this.knobsCount++;
        }

        console.log(`  Found ${commonArgs.length} common argument knobs\n`);
    }

    /**
     * Parse configuration file content
     */
    parseConfigFile(content, filePath) {
        const lines = content.split('\n');

        for (const line of lines) {
            // Skip comments and empty lines
            if (line.trim().startsWith('#') || line.trim().startsWith('//') || !line.trim()) {
                continue;
            }

            // Parse key=value pairs
            const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+)/);
            if (match) {
                const [, key, value] = match;
                this.discoveredKnobs.config_files[key] = {
                    source: `config:${path.basename(filePath)}`,
                    file: filePath,
                    value: value.trim(),
                    type: this.inferType(value),
                    category: this.categorizeKnob(key)
                };
                this.knobsCount++;
            }
        }
    }

    /**
     * Check if string is valid knob name
     */
    isValidKnobName(name) {
        return /^[A-Z_][A-Z0-9_]*$/i.test(name) &&
               name.length > 2 &&
               name.length < 50 &&
               !name.match(/^(var|let|const|function|class|if|else|for|while)$/i);
    }

    /**
     * Infer type from value
     */
    inferType(value) {
        if (value === undefined || value === null) return 'unknown';
        if (value === 'true' || value === 'false') return 'boolean';
        if (!isNaN(value)) return 'number';
        if (value.startsWith('[') && value.endsWith(']')) return 'array';
        if (value.startsWith('{') && value.endsWith('}')) return 'object';
        return 'string';
    }

    /**
     * Categorize knob based on name
     */
    categorizeKnob(name) {
        const lowerName = name.toLowerCase();

        if (lowerName.includes('deepgram') || lowerName.includes('stt')) return 'stt';
        if (lowerName.includes('elevenlabs') || lowerName.includes('tts')) return 'tts';
        if (lowerName.includes('hume') || lowerName.includes('emotion')) return 'emotion';
        if (lowerName.includes('buffer')) return 'buffer';
        if (lowerName.includes('audio') || lowerName.includes('sound')) return 'audio';
        if (lowerName.includes('vad') || lowerName.includes('voice')) return 'vad';
        if (lowerName.includes('agc') || lowerName.includes('gain')) return 'agc';
        if (lowerName.includes('noise') || lowerName.includes('echo')) return 'noise';
        if (lowerName.includes('filter')) return 'filter';
        if (lowerName.includes('network') || lowerName.includes('socket')) return 'network';
        if (lowerName.includes('gateway') || lowerName.includes('rtp')) return 'gateway';
        if (lowerName.includes('codec')) return 'codec';
        if (lowerName.includes('log') || lowerName.includes('debug')) return 'logging';
        if (lowerName.includes('timeout') || lowerName.includes('retry')) return 'reliability';
        if (lowerName.includes('cache')) return 'cache';
        if (lowerName.includes('port') || lowerName.includes('host')) return 'connection';

        return 'general';
    }

    /**
     * Infer what metrics this knob affects
     */
    inferAffects(name) {
        const affects = [];
        const lowerName = name.toLowerCase();

        if (lowerName.includes('gain')) affects.push('audio_level_dbfs', 'peak_amplitude');
        if (lowerName.includes('buffer')) affects.push('buffer_usage_pct', 'buffer_latency_ms');
        if (lowerName.includes('latency')) affects.push('processing_latency', 'total_latency');
        if (lowerName.includes('noise')) affects.push('noise_floor_db', 'snr_db');
        if (lowerName.includes('vad')) affects.push('speech_activity', 'silence_ratio');
        if (lowerName.includes('packet')) affects.push('packets_lost', 'packet_jitter');
        if (lowerName.includes('cpu')) affects.push('cpu_usage_pct');
        if (lowerName.includes('memory')) affects.push('memory_usage_mb');
        if (lowerName.includes('cache')) affects.push('cache_hits', 'cache_misses');
        if (lowerName.includes('timeout')) affects.push('error_rate', 'success_rate');

        return affects.length > 0 ? affects : ['unknown'];
    }

    /**
     * Generate comprehensive report
     */
    generateComprehensiveReport() {
        console.log('=' .repeat(60));
        console.log('📊 COMPREHENSIVE KNOBS DISCOVERY REPORT');
        console.log('=' .repeat(60));

        const report = {
            timestamp: new Date().toISOString(),
            total_discovered_knobs: this.knobsCount,
            sources: {},
            categories: {},
            all_knobs: {}
        };

        // Count by source
        for (const [source, knobs] of Object.entries(this.discoveredKnobs)) {
            report.sources[source] = Object.keys(knobs).length;
            console.log(`${source}: ${Object.keys(knobs).length} knobs`);
        }

        console.log(`\nTOTAL UNIQUE KNOBS DISCOVERED: ${this.knobsCount}`);

        // Merge all knobs
        for (const [source, knobs] of Object.entries(this.discoveredKnobs)) {
            for (const [knobName, knobData] of Object.entries(knobs)) {
                if (!report.all_knobs[knobName]) {
                    report.all_knobs[knobName] = knobData;
                } else {
                    // Merge data if knob found in multiple sources
                    report.all_knobs[knobName].sources = report.all_knobs[knobName].sources || [source];
                    report.all_knobs[knobName].sources.push(source);
                }
            }
        }

        // Count by category
        for (const knobData of Object.values(report.all_knobs)) {
            const category = knobData.category || 'unknown';
            report.categories[category] = (report.categories[category] || 0) + 1;
        }

        console.log('\nKnobs by Category:');
        for (const [category, count] of Object.entries(report.categories)) {
            console.log(`  ${category}: ${count}`);
        }

        // Save comprehensive report
        fs.writeFileSync(
            'discovered-knobs-complete.json',
            JSON.stringify(report, null, 2)
        );

        console.log('\n✅ Complete knobs discovery saved to discovered-knobs-complete.json');
        console.log(`\nThis deep scan found ${this.knobsCount} total configuration knobs!`);
        console.log('These can all be tracked alongside the 75 metrics for LLM analysis.');

        return report;
    }
}

// Export for use
module.exports = { DeepKnobsScanner };

// Run if called directly
if (require.main === module) {
    const scanner = new DeepKnobsScanner();
    scanner.scanEverything()
        .then(report => {
            console.log('\n🎯 Deep scan complete!');
            console.log('All discovered knobs are ready for monitoring and LLM optimization.');
        })
        .catch(console.error);
}