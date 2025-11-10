/**
 * HMLCP User Linguistic Overlay (ULO) Layer
 * Middleware that applies user-specific linguistic mappings in real-time
 * Based on HMLCP specification - Appendix A.3
 */

class ULOLayer {
  constructor(userProfile) {
    this.userProfile = userProfile;
    this.enabled = true;
  }

  /**
   * Apply user overlay to input text
   * Translates user idiosyncrasies into model-standard semantics
   * @param {string} text - Raw input text
   * @returns {string} - Processed text with ULO applied
   */
  apply(text) {
    if (!this.enabled || !text) {
      return text;
    }

    let processed = text;

    // Step 1: Apply phrase mappings (user-specific → standard)
    processed = this.applyPhraseMap(processed);

    // Step 2: Handle bias terms (domain-specific vocabulary boost)
    processed = this.handleBiasTerms(processed);

    // Step 3: Apply contextual fixes (learned from corrections)
    processed = this.applyContextualFixes(processed);

    console.log(`[ULO] Processed: "${text}" → "${processed}"`);
    return processed;
  }

  /**
   * Apply phrase mappings from user profile
   * Example: "check Azure thing" → "retrieve Azure metrics"
   */
  applyPhraseMap(text) {
    if (!this.userProfile || !this.userProfile.phraseMap) {
      return text;
    }

    let result = text;
    const phraseMap = this.userProfile.phraseMap;

    // Sort by length (longest first) to handle overlapping phrases
    const phrases = Object.keys(phraseMap).sort((a, b) => b.length - a.length);

    for (const userPhrase of phrases) {
      const standardPhrase = phraseMap[userPhrase];

      // Case-insensitive replacement
      const regex = new RegExp(this.escapeRegex(userPhrase), 'gi');
      result = result.replace(regex, standardPhrase);
    }

    return result;
  }

  /**
   * Handle bias terms - mark important domain-specific words
   * These could be passed to STT as custom vocabulary
   */
  handleBiasTerms(text) {
    if (!this.userProfile || !this.userProfile.biasTerms) {
      return text;
    }

    // For now, just preserve them as-is
    // In production, these would be sent to Deepgram custom vocabulary
    return text;
  }

  /**
   * Apply contextual fixes learned from corrections
   * Uses correction history to fix common misinterpretations
   */
  applyContextualFixes(text) {
    if (!this.userProfile || !this.userProfile.corrections) {
      return text;
    }

    const corrections = this.userProfile.corrections;
    let result = text;

    // Find patterns in corrections
    const correctionPatterns = this.extractCorrectionPatterns(corrections);

    for (const pattern of correctionPatterns) {
      const regex = new RegExp(this.escapeRegex(pattern.from), 'gi');
      if (regex.test(result)) {
        result = result.replace(regex, pattern.to);
        console.log(`[ULO] Applied correction: "${pattern.from}" → "${pattern.to}"`);
      }
    }

    return result;
  }

  /**
   * Extract common correction patterns
   * Identifies frequently corrected phrases
   */
  extractCorrectionPatterns(corrections) {
    const patterns = [];
    const patternCounts = {};

    // Count occurrences of each correction
    for (const correction of corrections) {
      const from = correction.rawInput.toLowerCase().trim();
      const to = correction.correctedIntent.toLowerCase().trim();
      const key = `${from}→${to}`;

      if (!patternCounts[key]) {
        patternCounts[key] = {
          from,
          to,
          count: 0
        };
      }
      patternCounts[key].count++;
    }

    // Extract patterns that occur 2+ times
    for (const key in patternCounts) {
      if (patternCounts[key].count >= 2) {
        patterns.push({
          from: patternCounts[key].from,
          to: patternCounts[key].to,
          confidence: patternCounts[key].count / corrections.length
        });
      }
    }

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate Deepgram custom vocabulary from user profile
   * Returns format for Deepgram API
   */
  generateCustomVocabulary() {
    if (!this.userProfile || !this.userProfile.biasTerms) {
      return [];
    }

    return this.userProfile.biasTerms.map(term => ({
      phrase: term,
      boost: 25  // Boost value as per HMLCP spec
    }));
  }

  /**
   * Update overlay from new correction
   * Learns from user feedback in real-time
   */
  learnFromCorrection(rawInput, interpretedIntent, correctedIntent) {
    if (!this.userProfile) return;

    // Add correction to profile
    this.userProfile.addCorrection(rawInput, interpretedIntent, correctedIntent);

    // Extract key phrase difference
    const userPhrase = rawInput.toLowerCase().trim();
    const standardPhrase = correctedIntent.toLowerCase().trim();

    // Update phrase map if this is a clear mapping
    if (userPhrase !== standardPhrase && userPhrase.split(' ').length <= 5) {
      this.userProfile.updatePhraseMapping(userPhrase, standardPhrase);
      console.log(`[ULO] Learned new mapping: "${userPhrase}" → "${standardPhrase}"`);
    }
  }

  /**
   * Enable/disable overlay
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`[ULO] Overlay ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get overlay statistics
   */
  getStats() {
    if (!this.userProfile) {
      return {
        phraseMappings: 0,
        biasTerms: 0,
        corrections: 0,
        enabled: this.enabled
      };
    }

    return {
      phraseMappings: Object.keys(this.userProfile.phraseMap).length,
      biasTerms: this.userProfile.biasTerms.length,
      corrections: this.userProfile.corrections.length,
      enabled: this.enabled,
      calibrationIndex: this.userProfile.metrics.calibrationIndex
    };
  }

  /**
   * Helper: Escape special regex characters
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

module.exports = ULOLayer;
