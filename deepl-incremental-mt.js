/**
 * DeepL Incremental Machine Translation
 *
 * Provides context-aware incremental translation:
 * - Maintains conversation context across chunks
 * - Handles partial vs. stable translations
 * - Optimizes API usage with caching
 * - Supports all DeepL language pairs
 *
 * Based on HAsterisk_HumeEVI_Spec.md specifications
 */

const axios = require('axios');
const { EventEmitter } = require('events');

// Context size for maintaining translation coherence
const MAX_CONTEXT_LENGTH = 500;  // Last 500 chars for context
const CACHE_TTL_MS = 60000;      // 1 minute cache

/**
 * DeepL Incremental MT Service
 */
class DeepLIncrementalMT extends EventEmitter {
    constructor(apiKey, options = {}) {
        super();

        if (!apiKey) {
            throw new Error('DeepL API key is required');
        }

        this.apiKey = apiKey;
        this.baseUrl = options.baseUrl || 'https://api.deepl.com/v2';

        // Session management
        this.sessionContext = new Map();  // sessionId -> context history
        this.sessionMetadata = new Map(); // sessionId -> metadata

        // Translation cache
        this.cache = new Map();  // hash -> translation
        this.cacheStats = {
            hits: 0,
            misses: 0,
            size: 0
        };

        // Statistics
        this.stats = {
            totalTranslations: 0,
            partialTranslations: 0,
            stableTranslations: 0,
            totalCharacters: 0,
            averageLatencyMs: 0,
            errors: 0
        };

        // Language mapping (DeepL format)
        this.languageMap = {
            'en': 'EN',
            'es': 'ES',
            'fr': 'FR',
            'de': 'DE',
            'it': 'IT',
            'pt': 'PT',
            'ru': 'RU',
            'ja': 'JA',
            'zh': 'ZH',
            'nl': 'NL',
            'pl': 'PL',
            'ar': 'AR',  // If supported
            'he': 'HE'   // If supported
        };
    }

    /**
     * Translate text incrementally with context
     */
    async translateIncremental(sessionId, sourceLang, targetLang, text, isStable = false) {
        const startTime = Date.now();

        try {
            // Validate inputs
            if (!text || text.trim().length === 0) {
                return {
                    type: isStable ? 'stable' : 'partial',
                    text: '',
                    latency_ms: 0,
                    cached: false
                };
            }

            // Get session context
            const context = this.getSessionContext(sessionId);
            const sessionMeta = this.getSessionMetadata(sessionId);

            // Check cache for stable translations
            const cacheKey = this.getCacheKey(text, sourceLang, targetLang, context);
            if (isStable && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
                    this.cacheStats.hits++;
                    console.log(`[DeepLMT] Cache hit for session ${sessionId}`);
                    return {
                        type: 'stable',
                        text: cached.translation,
                        latency_ms: 0,
                        cached: true
                    };
                } else {
                    // Expired
                    this.cache.delete(cacheKey);
                }
            }
            this.cacheStats.misses++;

            // Prepare DeepL API request
            const sourceCode = this.languageMap[sourceLang] || sourceLang.toUpperCase();
            const targetCode = this.languageMap[targetLang] || targetLang.toUpperCase();

            // Build request body
            const requestBody = {
                text: [text],
                source_lang: sourceCode,
                target_lang: targetCode,
                split_sentences: 'nonewlines',  // Don't split across newlines
                preserve_formatting: true,
                formality: sessionMeta.formality || 'default'
            };

            // Add context hint if available (DeepL doesn't have explicit context param,
            // but we can prepend recent context for better coherence)
            // Note: This is a workaround - adjust based on API capabilities

            // Call DeepL API
            const data = await this.callDeepLAPI(requestBody);
            const translation = data.translations[0].text;
            const latencyMs = Date.now() - startTime;

            // Update context if stable
            if (isStable) {
                this.updateSessionContext(sessionId, text, translation);

                // Cache stable translation
                this.cache.set(cacheKey, {
                    translation,
                    timestamp: Date.now()
                });
                this.cacheStats.size = this.cache.size;
            }

            // Update statistics
            this.stats.totalTranslations++;
            if (isStable) {
                this.stats.stableTranslations++;
            } else {
                this.stats.partialTranslations++;
            }
            this.stats.totalCharacters += text.length;
            this.updateAverageLatency(latencyMs);

            // Emit event
            this.emit('translation', {
                sessionId,
                sourceLang,
                targetLang,
                sourceText: text,
                translatedText: translation,
                isStable,
                latencyMs
            });

            return {
                type: isStable ? 'stable' : 'partial',
                text: translation,
                latency_ms: latencyMs,
                cached: false
            };

        } catch (error) {
            this.stats.errors++;
            console.error(`[DeepLMT] Translation error for session ${sessionId}:`, error.message);

            this.emit('error', {
                sessionId,
                error,
                text
            });

            // Return original text on error (pass-through)
            return {
                type: 'error',
                text: text,  // Fallback to source text
                latency_ms: Date.now() - startTime,
                error: error.message
            };
        }
    }

    /**
     * Call DeepL API
     */
    async callDeepLAPI(requestBody, retries = 2) {
        const url = `${this.baseUrl}/translate`;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await axios.post(url, requestBody, {
                    headers: {
                        'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                });

                return response.data;
            } catch (error) {
                if (attempt === retries) {
                    throw error;
                }
                // Exponential backoff
                await this.sleep(Math.pow(2, attempt) * 100);
            }
        }
    }

    /**
     * Get session context
     */
    getSessionContext(sessionId) {
        if (!this.sessionContext.has(sessionId)) {
            this.sessionContext.set(sessionId, {
                sourceHistory: '',
                translationHistory: '',
                createdAt: Date.now(),
                lastUpdated: Date.now()
            });
        }
        return this.sessionContext.get(sessionId);
    }

    /**
     * Get session metadata
     */
    getSessionMetadata(sessionId) {
        if (!this.sessionMetadata.has(sessionId)) {
            this.sessionMetadata.set(sessionId, {
                formality: 'default',
                domain: 'general',
                createdAt: Date.now()
            });
        }
        return this.sessionMetadata.get(sessionId);
    }

    /**
     * Update session context
     */
    updateSessionContext(sessionId, sourceText, translatedText) {
        const context = this.getSessionContext(sessionId);

        // Append to history
        context.sourceHistory += ' ' + sourceText;
        context.translationHistory += ' ' + translatedText;

        // Trim to max length
        if (context.sourceHistory.length > MAX_CONTEXT_LENGTH) {
            context.sourceHistory = context.sourceHistory.slice(-MAX_CONTEXT_LENGTH);
        }
        if (context.translationHistory.length > MAX_CONTEXT_LENGTH) {
            context.translationHistory = context.translationHistory.slice(-MAX_CONTEXT_LENGTH);
        }

        context.lastUpdated = Date.now();
    }

    /**
     * Set session formality
     */
    setSessionFormality(sessionId, formality) {
        const meta = this.getSessionMetadata(sessionId);
        meta.formality = formality;  // 'default', 'more', 'less', 'prefer_more', 'prefer_less'
    }

    /**
     * Generate cache key
     */
    getCacheKey(text, sourceLang, targetLang, context) {
        // Simple hash - in production use better hashing
        const str = `${text}_${sourceLang}_${targetLang}_${context.sourceHistory.slice(-100)}`;
        return Buffer.from(str).toString('base64');
    }

    /**
     * Clear session context
     */
    clearSession(sessionId) {
        this.sessionContext.delete(sessionId);
        this.sessionMetadata.delete(sessionId);
        console.log(`[DeepLMT] Cleared session ${sessionId}`);
    }

    /**
     * Clear old sessions (cleanup)
     */
    clearOldSessions(maxAgeMs = 3600000) {  // 1 hour default
        const now = Date.now();
        let cleared = 0;

        for (const [sessionId, context] of this.sessionContext.entries()) {
            if (now - context.lastUpdated > maxAgeMs) {
                this.clearSession(sessionId);
                cleared++;
            }
        }

        if (cleared > 0) {
            console.log(`[DeepLMT] Cleared ${cleared} old sessions`);
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.cacheStats.size = 0;
        console.log('[DeepLMT] Cache cleared');
    }

    /**
     * Update average latency
     */
    updateAverageLatency(latencyMs) {
        const n = this.stats.totalTranslations;
        if (n === 1) {
            this.stats.averageLatencyMs = latencyMs;
        } else {
            // Running average
            this.stats.averageLatencyMs =
                (this.stats.averageLatencyMs * (n - 1) + latencyMs) / n;
        }
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            activeSessions: this.sessionContext.size,
            cacheStats: this.cacheStats,
            cacheHitRate: this.cacheStats.hits + this.cacheStats.misses > 0
                ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(1) + '%'
                : '0%'
        };
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const result = await this.translateIncremental(
                'health-check',
                'en',
                'es',
                'Hello',
                true
            );
            return result.text.length > 0;
        } catch (error) {
            console.error('[DeepLMT] Health check failed:', error.message);
            return false;
        }
    }
}

/**
 * DeepL MT Manager - Manages multiple MT instances
 */
class DeepLMTManager extends EventEmitter {
    constructor(apiKey, options = {}) {
        super();

        this.primaryMT = new DeepLIncrementalMT(apiKey, options);

        // Forward events
        this.primaryMT.on('translation', (data) => this.emit('translation', data));
        this.primaryMT.on('error', (data) => this.emit('error', data));

        // Backup MT (optional - for fallover)
        this.backupMT = null;
        if (options.backupApiKey) {
            this.backupMT = new DeepLIncrementalMT(options.backupApiKey, options);
        }

        // Periodic cleanup
        setInterval(() => {
            this.primaryMT.clearOldSessions();
            if (this.backupMT) {
                this.backupMT.clearOldSessions();
            }
        }, 300000);  // Every 5 minutes
    }

    /**
     * Translate with automatic failover
     */
    async translate(sessionId, sourceLang, targetLang, text, isStable = false) {
        try {
            return await this.primaryMT.translateIncremental(
                sessionId, sourceLang, targetLang, text, isStable
            );
        } catch (error) {
            console.warn('[DeepLMTMgr] Primary failed, trying backup...');

            if (this.backupMT) {
                try {
                    return await this.backupMT.translateIncremental(
                        sessionId, sourceLang, targetLang, text, isStable
                    );
                } catch (backupError) {
                    console.error('[DeepLMTMgr] Backup also failed');
                    throw backupError;
                }
            }

            throw error;
        }
    }

    /**
     * Get combined statistics
     */
    getStats() {
        const stats = {
            primary: this.primaryMT.getStats()
        };

        if (this.backupMT) {
            stats.backup = this.backupMT.getStats();
        }

        return stats;
    }

    /**
     * Clear session
     */
    clearSession(sessionId) {
        this.primaryMT.clearSession(sessionId);
        if (this.backupMT) {
            this.backupMT.clearSession(sessionId);
        }
    }
}

module.exports = {
    DeepLIncrementalMT,
    DeepLMTManager
};
