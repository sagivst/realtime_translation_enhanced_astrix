/**
 * Punctuation Restoration Service
 * Adds proper punctuation and capitalization to transcribed text
 */

class PunctuationRestorer {
  constructor() {
    // Common sentence endings that indicate a complete thought
    this.sentenceEnders = new Set(['.', '!', '?']);

    // Words that typically start a new sentence
    this.sentenceStarters = new Set([
      'and', 'but', 'so', 'however', 'therefore', 'moreover',
      'furthermore', 'nevertheless', 'meanwhile', 'additionally'
    ]);

    // Common abbreviations that shouldn't end sentences
    this.abbreviations = new Set([
      'mr', 'mrs', 'ms', 'dr', 'st', 'ave', 'etc', 'inc', 'ltd',
      'vs', 'e.g', 'i.e', 'a.m', 'p.m'
    ]);
  }

  /**
   * Restore punctuation and capitalization to text
   * @param {string} text - Raw transcribed text
   * @param {object} options - Options for restoration
   * @returns {string} - Punctuated and capitalized text
   */
  restore(text, options = {}) {
    if (!text || text.trim() === '') {
      return text;
    }

    let result = text.trim();

    // Remove existing punctuation for consistent processing
    if (options.cleanFirst) {
      result = result.replace(/[.!?,;:]+/g, '');
    }

    // Capitalize first letter
    result = result.charAt(0).toUpperCase() + result.slice(1);

    // Add period at end if missing
    if (!this.sentenceEnders.has(result.slice(-1))) {
      // Check if it's a question
      if (this.isQuestion(result)) {
        result += '?';
      } else {
        result += '.';
      }
    }

    // Capitalize after sentence enders
    result = this.capitalizeAfterPunctuation(result);

    // Fix spacing around punctuation
    result = this.fixPunctuationSpacing(result);

    return result;
  }

  /**
   * Determine if text is likely a question
   */
  isQuestion(text) {
    const questionWords = ['who', 'what', 'where', 'when', 'why', 'how', 'can', 'could', 'would', 'should', 'is', 'are', 'do', 'does', 'did'];
    const firstWord = text.toLowerCase().split(/\s+/)[0];
    return questionWords.includes(firstWord);
  }

  /**
   * Capitalize letters after sentence-ending punctuation
   */
  capitalizeAfterPunctuation(text) {
    return text.replace(/([.!?]\s+)([a-z])/g, (match, punct, letter) => {
      return punct + letter.toUpperCase();
    });
  }

  /**
   * Fix spacing around punctuation marks
   */
  fixPunctuationSpacing(text) {
    // Remove spaces before punctuation
    text = text.replace(/\s+([.!?,;:])/g, '$1');

    // Ensure space after punctuation (except at end)
    text = text.replace(/([.!?,;:])([^\s])/g, '$1 $2');

    return text;
  }

  /**
   * Merge multiple partial segments into coherent sentences
   * This helps with fragmentation by looking at context
   */
  mergeSegments(segments) {
    if (!segments || segments.length === 0) {
      return [];
    }

    const merged = [];
    let currentSegment = null;

    for (const segment of segments) {
      if (!currentSegment) {
        currentSegment = { ...segment };
        continue;
      }

      // Check if this segment should be merged with the previous one
      const shouldMerge = this.shouldMergeSegments(
        currentSegment.text,
        segment.text
      );

      if (shouldMerge) {
        // Merge segments
        currentSegment.text += ' ' + segment.text;
        currentSegment.ts_end = segment.ts_end;
      } else {
        // Push current and start new
        merged.push({
          ...currentSegment,
          text: this.restore(currentSegment.text)
        });
        currentSegment = { ...segment };
      }
    }

    // Don't forget the last segment
    if (currentSegment) {
      merged.push({
        ...currentSegment,
        text: this.restore(currentSegment.text)
      });
    }

    return merged;
  }

  /**
   * Determine if two segments should be merged
   */
  shouldMergeSegments(text1, text2) {
    // If first segment doesn't end with sentence-ending punctuation, likely incomplete
    const lastChar = text1.trim().slice(-1);
    if (!this.sentenceEnders.has(lastChar)) {
      return true;
    }

    // If second segment starts with a conjunction, merge
    const firstWord = text2.trim().toLowerCase().split(/\s+/)[0];
    if (this.sentenceStarters.has(firstWord)) {
      return true;
    }

    // If first segment is very short (< 3 words), likely incomplete
    if (text1.trim().split(/\s+/).length < 3) {
      return true;
    }

    return false;
  }
}

module.exports = PunctuationRestorer;
