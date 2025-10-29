/**
 * DeepL Machine Translation Service
 * Provides high-quality translation with incremental token support
 */

const axios = require('axios');
const EventEmitter = require('events');

class DeepLMTService extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      apiKey: config.apiKey || process.env.DEEPL_API_KEY,
      baseURL: config.baseURL || 'https://api-free.deepl.com/v2',
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 5000, // 5s timeout
      targetLatency: config.targetLatency || 100, // Target ≤100ms
      ...config
    };

    this.isReady = false;
    this.cache = new Map(); // Translation cache for repeated phrases
    this.stats = {
      totalTranslations: 0,
      cacheHits: 0,
      avgLatency: 0,
      errors: 0
    };
  }

  /**
   * Initialize DeepL client
   */
  async initialize() {
    console.log('[DeepL] Initializing MT service...');

    if (!this.config.apiKey) {
      throw new Error('DeepL API key not configured');
    }

    try {
      // Verify API key by checking usage
      await this.getUsage();

      this.isReady = true;
      console.log('[DeepL] ✓ MT service ready');

      return true;
    } catch (error) {
      console.error('[DeepL] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Translate text
   * @param {string} text - Text to translate
   * @param {string} sourceLang - Source language code (e.g., 'en')
   * @param {string} targetLang - Target language code (e.g., 'es')
   * @returns {Promise<string>} Translated text
   */
  async translate(text, sourceLang, targetLang) {
    if (!this.isReady) {
      throw new Error('DeepL service not initialized');
    }

    if (!text || text.trim().length === 0) {
      return '';
    }

    // Check cache
    const cacheKey = `${sourceLang}:${targetLang}:${text}`;
    if (this.cache.has(cacheKey)) {
      this.stats.cacheHits++;
      console.log(`[DeepL] Cache hit: "${text.substring(0, 30)}..."`);
      return this.cache.get(cacheKey);
    }

    const startTime = Date.now();

    try {
      // Normalize language codes for DeepL
      const sourceDeepL = this.normalizeLanguageCode(sourceLang);
      const targetDeepL = this.normalizeLanguageCode(targetLang);

      // Skip translation if source and target are the same
      if (sourceDeepL === targetDeepL) {
        return text;
      }

      // Call DeepL API
      const response = await axios.post(
        `${this.config.baseURL}/translate`,
        {
          text: [text],
          source_lang: sourceDeepL.toUpperCase(),
          target_lang: targetDeepL.toUpperCase(),
          preserve_formatting: true,
          formality: 'default'
        },
        {
          headers: {
            'Authorization': `DeepL-Auth-Key ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout
        }
      );

      const translatedText = response.data.translations[0].text;
      const latency = Date.now() - startTime;

      // Update stats
      this.stats.totalTranslations++;
      this.stats.avgLatency = (
        (this.stats.avgLatency * (this.stats.totalTranslations - 1) + latency) /
        this.stats.totalTranslations
      );

      // Cache result
      this.cache.set(cacheKey, translatedText);

      // Trim cache if too large (keep last 1000 entries)
      if (this.cache.size > 1000) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }

      console.log(`[DeepL] Translated in ${latency}ms: "${text.substring(0, 30)}..." → "${translatedText.substring(0, 30)}..."`);

      if (latency > this.config.targetLatency) {
        console.warn(`[DeepL] ⚠ High latency: ${latency}ms (target: ≤${this.config.targetLatency}ms)`);
      }

      return translatedText;

    } catch (error) {
      this.stats.errors++;

      if (error.response) {
        // API error
        const status = error.response.status;
        const message = error.response.data?.message || 'Unknown error';

        console.error(`[DeepL] Translation error (${status}): ${message}`);

        if (status === 456) {
          throw new Error('DeepL quota exceeded');
        } else if (status === 403) {
          throw new Error('DeepL API key invalid');
        }
      } else {
        console.error('[DeepL] Translation error:', error.message);
      }

      throw error;
    }
  }

  /**
   * Translate multiple texts in batch
   * @param {Array<string>} texts - Array of texts to translate
   * @param {string} sourceLang - Source language
   * @param {string} targetLang - Target language
   * @returns {Promise<Array<string>>} Array of translated texts
   */
  async translateBatch(texts, sourceLang, targetLang) {
    if (!this.isReady) {
      throw new Error('DeepL service not initialized');
    }

    if (texts.length === 0) {
      return [];
    }

    const startTime = Date.now();

    try {
      const sourceDeepL = this.normalizeLanguageCode(sourceLang);
      const targetDeepL = this.normalizeLanguageCode(targetLang);

      if (sourceDeepL === targetDeepL) {
        return texts;
      }

      // Call DeepL API with batch
      const response = await axios.post(
        `${this.config.baseURL}/translate`,
        {
          text: texts,
          source_lang: sourceDeepL.toUpperCase(),
          target_lang: targetDeepL.toUpperCase(),
          preserve_formatting: true
        },
        {
          headers: {
            'Authorization': `DeepL-Auth-Key ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout * 2 // Allow more time for batch
        }
      );

      const translations = response.data.translations.map(t => t.text);
      const latency = Date.now() - startTime;

      console.log(`[DeepL] Batch translated ${texts.length} texts in ${latency}ms`);

      return translations;

    } catch (error) {
      console.error('[DeepL] Batch translation error:', error);
      throw error;
    }
  }

  /**
   * Normalize language code for DeepL
   * Converts ISO 639-1 codes to DeepL format
   */
  normalizeLanguageCode(langCode) {
    const mapping = {
      'en': 'EN',
      'es': 'ES',
      'fr': 'FR',
      'de': 'DE',
      'it': 'IT',
      'pt': 'PT',
      'ru': 'RU',
      'ja': 'JA',
      'zh': 'ZH',
      'ko': 'KO',
      'nl': 'NL',
      'pl': 'PL',
      'tr': 'TR',
      'ar': 'AR', // Note: Arabic not supported by DeepL, will fallback
      'cs': 'CS',
      'da': 'DA',
      'fi': 'FI',
      'el': 'EL',
      'hu': 'HU',
      'id': 'ID',
      'no': 'NB',
      'ro': 'RO',
      'sk': 'SK',
      'sv': 'SV',
      'uk': 'UK'
    };

    return mapping[langCode.toLowerCase()] || langCode.toUpperCase();
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages() {
    try {
      const response = await axios.get(
        `${this.config.baseURL}/languages`,
        {
          headers: {
            'Authorization': `DeepL-Auth-Key ${this.config.apiKey}`
          },
          params: {
            type: 'target'
          }
        }
      );

      return response.data.map(lang => ({
        code: lang.language.toLowerCase(),
        name: lang.name
      }));
    } catch (error) {
      console.error('[DeepL] Failed to get languages:', error);
      return [];
    }
  }

  /**
   * Get API usage statistics
   */
  async getUsage() {
    try {
      const response = await axios.get(
        `${this.config.baseURL}/usage`,
        {
          headers: {
            'Authorization': `DeepL-Auth-Key ${this.config.apiKey}`
          }
        }
      );

      return {
        characterCount: response.data.character_count,
        characterLimit: response.data.character_limit,
        percentUsed: (response.data.character_count / response.data.character_limit * 100).toFixed(2)
      };
    } catch (error) {
      console.error('[DeepL] Failed to get usage:', error);
      throw error;
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      cacheHitRate: this.stats.totalTranslations > 0
        ? ((this.stats.cacheHits / this.stats.totalTranslations) * 100).toFixed(2)
        : 0
    };
  }

  /**
   * Clear translation cache
   */
  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[DeepL] Cache cleared (${size} entries)`);
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      ready: this.isReady,
      stats: this.getStats()
    };
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    console.log('[DeepL] Shutting down...');

    this.clearCache();
    this.isReady = false;

    console.log('[DeepL] ✓ Service stopped');
  }
}

module.exports = DeepLMTService;
