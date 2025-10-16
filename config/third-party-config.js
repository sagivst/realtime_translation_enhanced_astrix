/**
 * Third Party Services Configuration
 *
 * Centralized configuration for all external service integrations:
 * - Deepgram (ASR)
 * - DeepL (MT)
 * - ElevenLabs (TTS)
 * - Hume AI (EVI)
 *
 * Each service configuration includes:
 * - API credentials
 * - Endpoint URLs
 * - Model parameters
 * - Timeout settings
 * - Retry logic
 * - Latency thresholds
 */

require('dotenv').config();

/**
 * Deepgram Configuration (Speech Recognition)
 */
const deepgramConfig = {
    // API Credentials
    apiKey: process.env.DEEPGRAM_API_KEY,

    // Endpoint
    endpoint: {
        websocket: 'wss://api.deepgram.com/v1/listen',
        rest: 'https://api.deepgram.com/v1/listen'
    },

    // Model Configuration
    model: {
        name: 'nova-2',
        version: 'latest',
        language: 'en-US', // or 'multi' for auto-detect
        tier: 'enhanced' // 'base', 'enhanced', 'premium'
    },

    // Audio Format
    audio: {
        sampleRate: 16000,
        encoding: 'linear16', // PCM 16-bit
        channels: 1,
        bitDepth: 16
    },

    // Recognition Parameters
    features: {
        interim_results: true,
        partial_results: true,
        punctuate: true,
        profanity_filter: false,
        redact: false, // PII redaction
        diarize: false, // Speaker diarization
        utterance_end_ms: 1000, // Silence for utterance end
        vad_events: true, // Voice activity detection events
        multichannel: false,
        numerals: true, // Convert numbers to digits
        search: null, // Search terms
        keywords: null // Keyword boosting
    },

    // Connection Settings
    connection: {
        timeout: 30000, // 30 seconds
        keepAlive: true,
        keepAliveInterval: 10000 // 10 seconds
    },

    // Retry Configuration
    retry: {
        maxAttempts: 3,
        initialDelay: 1000, // 1 second
        maxDelay: 10000, // 10 seconds
        backoffMultiplier: 2
    },

    // Latency Thresholds (milliseconds)
    latency: {
        connection: 500, // WebSocket connect
        interim: 150, // Interim results
        final: 250, // Final transcript
        warning: 500, // Log warning
        critical: 1000 // Alert/error
    },

    // Quota & Usage
    quota: {
        monthlyMinutes: 12000, // Free tier
        alertThreshold: 0.8 // Alert at 80% usage
    }
};

/**
 * DeepL Configuration (Machine Translation)
 */
const deeplConfig = {
    // API Credentials
    apiKey: process.env.DEEPL_API_KEY,
    apiType: 'pro', // 'free' or 'pro'

    // Endpoint
    endpoint: {
        translate: 'https://api.deepl.com/v2/translate',
        usage: 'https://api.deepl.com/v2/usage',
        languages: 'https://api.deepl.com/v2/languages'
    },

    // Translation Parameters
    translation: {
        formality: 'default', // 'more', 'less', 'default', 'prefer_more', 'prefer_less'
        splitSentences: '1', // '0' (no split), '1' (default), 'nonewlines'
        preserveFormatting: true,
        tagHandling: null, // 'xml', 'html'
        glossary_id: null, // Custom glossary
        context: '', // Additional context for translation
        contextWindow: 500 // Characters of conversation history
    },

    // Language Pairs
    languages: {
        // Map of supported source → target languages
        supported: [
            'EN', 'DE', 'FR', 'ES', 'IT', 'PT', 'RU', 'JA', 'ZH',
            'NL', 'PL', 'TR', 'AR', 'CS', 'DA', 'EL', 'FI', 'HU',
            'ID', 'KO', 'LV', 'LT', 'NO', 'RO', 'SK', 'SL', 'SV', 'UK'
        ],
        default: {
            source: 'EN',
            target: 'ES'
        }
    },

    // Cache Configuration
    cache: {
        enabled: true,
        ttl: 60000, // 1 minute
        maxSize: 1000, // Max cache entries
        strategy: 'lru' // Least recently used
    },

    // Connection Settings
    connection: {
        timeout: 5000, // 5 seconds
        headers: {
            'User-Agent': 'RealTimeTranslation/1.0'
        }
    },

    // Retry Configuration
    retry: {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
        retryableStatuses: [429, 500, 502, 503, 504]
    },

    // Latency Thresholds (milliseconds)
    latency: {
        api: 200, // API response time
        withContext: 250,
        cached: 1,
        warning: 500,
        critical: 1000
    },

    // Quota & Usage
    quota: {
        monthlyCharacters: 500000, // Free tier
        alertThreshold: 0.9 // Alert at 90% usage
    },

    // Fallback Configuration
    fallback: {
        enabled: true,
        service: 'google-translate', // Backup service
        onQuotaExceeded: true,
        onRatLimit: true,
        onError: true
    }
};

/**
 * ElevenLabs Configuration (Text-to-Speech)
 */
const elevenLabsConfig = {
    // API Credentials
    apiKey: process.env.ELEVENLABS_API_KEY,

    // Endpoint
    endpoint: {
        textToSpeech: 'https://api.elevenlabs.io/v1/text-to-speech',
        voices: 'https://api.elevenlabs.io/v1/voices',
        user: 'https://api.elevenlabs.io/v1/user',
        models: 'https://api.elevenlabs.io/v1/models'
    },

    // Model Configuration
    model: {
        id: 'eleven_turbo_v2', // Fast model
        // Alternative models:
        // - 'eleven_monolingual_v1' (high quality, slower)
        // - 'eleven_multilingual_v2' (multiple languages)
        // - 'eleven_turbo_v2' (fastest, good quality)
    },

    // Voice Configuration
    voices: {
        default: {
            id: 'EXAVITQu4vr4xnSDxMaL', // Default voice
            name: 'Bella'
        },
        // Language-specific voices
        languageMap: {
            'en': 'EXAVITQu4vr4xnSDxMaL', // Bella (English)
            'es': '21m00Tcm4TlvDq8ikWAM', // Rachel (Spanish)
            'de': 'pNInz6obpgDQGcFmaJgB', // Adam (German)
            'fr': 'ErXwobaYiN019PkySvjV', // Antoni (French)
            'it': 'MF3mGyEYCl7XYWbV9V6O', // Elli (Italian)
            'pt': 'TxGEqnHWrfWFTfGW9XjX', // Josh (Portuguese)
            'default': 'EXAVITQu4vr4xnSDxMaL'
        }
    },

    // Voice Settings
    voiceSettings: {
        baseline: {
            stability: 0.5, // 0-1 (consistent to dynamic)
            similarity_boost: 0.75, // 0-1 (stay close to voice)
            style: 0.5, // 0-1 (neutral to expressive)
            use_speaker_boost: true
        },
        // Emotion mapping parameters
        emotion: {
            arousalFactor: 0.6, // How much arousal affects stability
            valenceFactor: 0.3, // How much valence affects style
            energyFactor: 0.15, // How much energy affects similarity
            rateFactor: 0.2 // How much speech rate affects style
        }
    },

    // Audio Output Format
    output: {
        format: 'pcm_16000', // PCM 16kHz for Asterisk
        // Alternative formats:
        // - 'mp3_44100_128' (MP3)
        // - 'pcm_16000' (PCM 16kHz)
        // - 'pcm_22050' (PCM 22.05kHz)
        // - 'pcm_24000' (PCM 24kHz)
        // - 'pcm_44100' (PCM 44.1kHz)
    },

    // Connection Settings
    connection: {
        timeout: 10000, // 10 seconds
        headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY
        }
    },

    // Retry Configuration
    retry: {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
        retryableStatuses: [429, 500, 502, 503, 504]
    },

    // Latency Thresholds (milliseconds)
    latency: {
        api: 250, // API response time
        emotionMapping: 5, // Emotion → voice settings
        audioProcessing: 20, // Convert to frames
        total: 275, // Total TTS latency
        warning: 500,
        critical: 1000
    },

    // Quota & Usage
    quota: {
        monthlyCharacters: 10000, // Free tier
        alertThreshold: 0.85 // Alert at 85% usage
    },

    // Optimization
    optimization: {
        streamingEnabled: false, // Stream audio as it's generated
        chunkSize: 1000, // Characters per request
        maxTextLength: 5000 // Max chars per synthesis
    }
};

/**
 * Hume AI Configuration (Emotion Voice Interface)
 */
const humeConfig = {
    // API Credentials
    apiKey: process.env.HUME_API_KEY,

    // Endpoint
    endpoint: {
        websocket: 'wss://api.hume.ai/v0/stream/evi',
        rest: 'https://api.hume.ai/v0/evi',
        models: 'https://api.hume.ai/v0/models'
    },

    // Model Configuration
    model: {
        id: 'evi-1',
        version: 'latest'
    },

    // Audio Format
    audio: {
        sampleRate: 16000,
        encoding: 'pcm_s16le', // Signed 16-bit PCM
        channels: 1,
        frameSize: 640, // 20ms @ 16kHz
        frameDuration: 20 // milliseconds
    },

    // Analysis Configuration
    analysis: {
        emotionDimensions: [
            'arousal', // Excited vs. calm (0-1)
            'valence', // Positive vs. negative (-1 to 1)
            'dominance' // Powerful vs. submissive (0-1)
        ],
        prosodyFeatures: [
            'pitch', // Hz
            'rate', // words per minute
            'energy', // Volume (0-1)
            'jitter', // Pitch variation
            'shimmer' // Amplitude variation
        ],
        contextWindow: 5000, // 5 seconds of audio
        updateInterval: 100 // Update every 100ms
    },

    // Emotion Vector Defaults
    emotion: {
        neutral: {
            arousal: 0.5,
            valence: 0.0,
            dominance: 0.5,
            energy: 0.5,
            pitch: 150.0,
            rate: 1.0
        },
        thresholds: {
            arousalChange: 0.2, // Significant change
            valenceChange: 0.3,
            energyChange: 0.2
        }
    },

    // Connection Settings
    connection: {
        timeout: 30000, // 30 seconds
        keepAlive: true,
        keepAliveInterval: 10000 // 10 seconds
    },

    // Retry Configuration
    retry: {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2
    },

    // Latency Thresholds (milliseconds)
    latency: {
        connection: 500,
        analysis: 200, // Emotion analysis time
        warning: 500,
        critical: 1000
    },

    // Quota & Usage
    quota: {
        monthlyRequests: 100000, // Custom plan
        alertThreshold: 0.9
    },

    // Features
    features: {
        intentRecognition: false, // Detect user intent
        endOfTurnDetection: true, // Detect when speaker finishes
        emotionTracking: true, // Track emotion over time
        prosodyAnalysis: true // Analyze speech prosody
    }
};

/**
 * Overall System Configuration
 */
const systemConfig = {
    // Pipeline Configuration
    pipeline: {
        parallelProcessing: true, // Process emotion in parallel
        emotionEnabled: true, // Use Hume EVI
        cacheEnabled: true, // Cache translations
        fallbackEnabled: true // Use fallback services
    },

    // Latency Targets (milliseconds)
    latency: {
        targets: {
            asr: 250,
            mt: 200,
            tts: 250,
            transmission: 200,
            endToEnd: 900 // p95 target
        },
        alerts: {
            warning: 900, // Log warning
            critical: 1200 // Send alert
        }
    },

    // Monitoring
    monitoring: {
        enabled: true,
        interval: 5000, // 5 seconds
        metricsRetention: 3600000, // 1 hour
        logLevel: process.env.LOG_LEVEL || 'info'
    },

    // Error Handling
    errorHandling: {
        maxConsecutiveErrors: 5,
        errorCooldown: 60000, // 1 minute
        gracefulDegradation: true
    }
};

/**
 * Validate Configuration
 */
function validateConfig() {
    const errors = [];

    // Check required API keys
    if (!deepgramConfig.apiKey) {
        errors.push('DEEPGRAM_API_KEY is not set');
    }
    if (!deeplConfig.apiKey) {
        errors.push('DEEPL_API_KEY is not set');
    }
    if (!elevenLabsConfig.apiKey) {
        errors.push('ELEVENLABS_API_KEY is not set');
    }
    if (!humeConfig.apiKey) {
        console.warn('HUME_API_KEY is not set - emotion analysis will be disabled');
    }

    if (errors.length > 0) {
        throw new Error(`Configuration errors:\n${errors.join('\n')}`);
    }

    console.log('✅ Third party configuration validated');
}

/**
 * Get Configuration by Service
 */
function getServiceConfig(serviceName) {
    const configs = {
        'deepgram': deepgramConfig,
        'deepl': deeplConfig,
        'elevenlabs': elevenLabsConfig,
        'hume': humeConfig
    };

    return configs[serviceName.toLowerCase()];
}

/**
 * Update Configuration at Runtime
 */
function updateConfig(serviceName, updates) {
    const config = getServiceConfig(serviceName);
    if (!config) {
        throw new Error(`Unknown service: ${serviceName}`);
    }

    Object.assign(config, updates);
    console.log(`✅ Updated configuration for ${serviceName}`);
}

/**
 * Export Configuration
 */
module.exports = {
    deepgram: deepgramConfig,
    deepl: deeplConfig,
    elevenlabs: elevenLabsConfig,
    hume: humeConfig,
    system: systemConfig,
    validateConfig,
    getServiceConfig,
    updateConfig
};

// Validate on load
if (require.main === module) {
    try {
        validateConfig();
        console.log('\n=== Third Party Services Configuration ===\n');
        console.log('Deepgram:', deepgramConfig.model.name);
        console.log('DeepL:', deeplConfig.apiType);
        console.log('ElevenLabs:', elevenLabsConfig.model.id);
        console.log('Hume AI:', humeConfig.model.id);
        console.log('\n✅ All configurations loaded successfully\n');
    } catch (error) {
        console.error('❌ Configuration error:', error.message);
        process.exit(1);
    }
}
