/**
 * HMLCP Pattern Extractor
 * Analyzes user text/speech to extract linguistic patterns
 * Based on HMLCP specification - Phase 2
 */

class PatternExtractor {
  constructor() {
    // Common stop words to filter out
    this.stopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
      'could', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'for', 'on',
      'at', 'by', 'with', 'from', 'as', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'under', 'over', 'again', 'further',
      'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
      'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
      'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'and',
      'but', 'or', 'if', 'because', 'while', 'i', 'you', 'he', 'she', 'it',
      'we', 'they', 'them', 'their', 'what', 'which', 'who', 'this', 'that'
    ]);
  }

  /**
   * Analyze text samples to extract patterns
   * Returns linguistic profile characteristics
   */
  analyze(textSamples) {
    if (!textSamples || textSamples.length === 0) {
      return this.getEmptyProfile();
    }

    const texts = textSamples.map(s => s.text || s);

    return {
      tokenFrequency: this.analyzeTokenFrequency(texts),
      avgSentenceLength: this.calculateAvgSentenceLength(texts),
      directness: this.calculateDirectness(texts),
      tone: this.detectTone(texts),
      ambiguityTolerance: this.calculateAmbiguity(texts),
      lexicalBias: this.extractLexicalBias(texts),
      commonPhrases: this.extractCommonPhrases(texts),
      sentenceStructure: this.analyzeSentenceStructure(texts)
    };
  }

  /**
   * Analyze token frequency (lexical preferences)
   * Returns most frequently used non-stop words
   */
  analyzeTokenFrequency(texts) {
    const tokenCounts = {};

    for (const text of texts) {
      const tokens = this.tokenize(text);

      for (const token of tokens) {
        const lower = token.toLowerCase();
        if (!this.stopWords.has(lower) && lower.length > 2) {
          tokenCounts[lower] = (tokenCounts[lower] || 0) + 1;
        }
      }
    }

    // Sort by frequency
    const sorted = Object.entries(tokenCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([token, count]) => ({ token, count }));

    return sorted;
  }

  /**
   * Calculate average sentence length
   */
  calculateAvgSentenceLength(texts) {
    const allTokens = texts.flatMap(text => this.tokenize(text));
    const sentenceCount = texts.reduce((sum, text) => {
      return sum + (text.match(/[.!?]+/g) || ['']).length;
    }, 0);

    return sentenceCount > 0 ? (allTokens.length / sentenceCount).toFixed(1) : 0;
  }

  /**
   * Calculate directness (% of direct/imperative sentences)
   * Direct: starts with verb, contains "please", uses imperative mood
   */
  calculateDirectness(texts) {
    const directPatterns = [
      /^(check|run|open|close|start|stop|get|set|show|tell|find|search|give|send|make|do|go|come)/i,
      /please/i,
      /could you|can you|would you/i
    ];

    let directCount = 0;

    for (const text of texts) {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim());

      for (const sentence of sentences) {
        const isDirect = directPatterns.some(pattern => pattern.test(sentence.trim()));
        if (isDirect) directCount++;
      }
    }

    const totalSentences = texts.reduce((sum, text) => {
      return sum + text.split(/[.!?]+/).filter(s => s.trim()).length;
    }, 0);

    return totalSentences > 0 ? Math.round((directCount / totalSentences) * 100) : 0;
  }

  /**
   * Detect tone (formal, neutral, casual)
   */
  detectTone(texts) {
    const allText = texts.join(' ').toLowerCase();

    const formalIndicators = [
      'please', 'kindly', 'would', 'could', 'may i', 'thank you',
      'appreciate', 'regarding', 'concerning', 'furthermore'
    ];

    const casualIndicators = [
      'hey', 'yeah', 'yep', 'nah', 'gonna', 'wanna', 'dunno',
      'cool', 'awesome', 'great', 'ok', 'okay'
    ];

    const formalScore = formalIndicators.filter(word => allText.includes(word)).length;
    const casualScore = casualIndicators.filter(word => allText.includes(word)).length;

    if (formalScore > casualScore * 1.5) return 'formal';
    if (casualScore > formalScore * 1.5) return 'casual';
    return 'neutral';
  }

  /**
   * Calculate ambiguity tolerance
   * Higher score = more ambiguous/vague language
   */
  calculateAmbiguity(texts) {
    const ambiguousWords = [
      'thing', 'stuff', 'something', 'somewhere', 'somehow', 'kind of',
      'sort of', 'maybe', 'perhaps', 'probably', 'might', 'could be',
      'that', 'this', 'it', 'some', 'any'
    ];

    const allText = texts.join(' ').toLowerCase();
    const totalWords = this.tokenize(allText).length;

    const ambiguousCount = ambiguousWords.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = allText.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);

    return totalWords > 0 ? Math.round((ambiguousCount / totalWords) * 100) : 0;
  }

  /**
   * Extract lexical bias (frequently used domain-specific terms)
   */
  extractLexicalBias(texts) {
    const tokens = this.analyzeTokenFrequency(texts);

    // Consider top 10 tokens as lexical bias
    return tokens.slice(0, 10).map(t => t.token);
  }

  /**
   * Extract common phrases (2-3 word combinations)
   */
  extractCommonPhrases(texts) {
    const phraseCounts = {};

    for (const text of texts) {
      const tokens = this.tokenize(text);

      // 2-grams (2-word phrases)
      for (let i = 0; i < tokens.length - 1; i++) {
        const phrase = `${tokens[i]} ${tokens[i + 1]}`.toLowerCase();
        if (this.isValidPhrase(phrase)) {
          phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
        }
      }

      // 3-grams (3-word phrases)
      for (let i = 0; i < tokens.length - 2; i++) {
        const phrase = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`.toLowerCase();
        if (this.isValidPhrase(phrase)) {
          phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
        }
      }
    }

    // Return phrases that appear 2+ times
    return Object.entries(phraseCounts)
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([phrase, count]) => ({ phrase, count }));
  }

  /**
   * Analyze sentence structure
   * Returns average sentence complexity metrics
   */
  analyzeSentenceStructure(texts) {
    let totalSentences = 0;
    let totalClauses = 0;
    let totalQuestions = 0;

    for (const text of texts) {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim());
      totalSentences += sentences.length;

      for (const sentence of sentences) {
        // Count clauses (rough estimate: commas + conjunctions)
        const clauses = (sentence.match(/[,;]|and|but|or|because|although|while/gi) || []).length + 1;
        totalClauses += clauses;

        // Count questions
        if (sentence.trim().endsWith('?')) {
          totalQuestions++;
        }
      }
    }

    return {
      avgClausesPerSentence: totalSentences > 0 ? (totalClauses / totalSentences).toFixed(1) : 0,
      questionPercentage: totalSentences > 0 ? Math.round((totalQuestions / totalSentences) * 100) : 0
    };
  }

  /**
   * Tokenize text into words
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0);
  }

  /**
   * Check if phrase is valid (not all stop words)
   */
  isValidPhrase(phrase) {
    const words = phrase.split(' ');
    const nonStopWords = words.filter(w => !this.stopWords.has(w));
    return nonStopWords.length >= 1;
  }

  /**
   * Get empty profile
   */
  getEmptyProfile() {
    return {
      tokenFrequency: [],
      avgSentenceLength: 0,
      directness: 0,
      tone: 'neutral',
      ambiguityTolerance: 0,
      lexicalBias: [],
      commonPhrases: [],
      sentenceStructure: {
        avgClausesPerSentence: 0,
        questionPercentage: 0
      }
    };
  }
}

module.exports = PatternExtractor;
