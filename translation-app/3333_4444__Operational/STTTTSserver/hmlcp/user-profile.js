/**
 * HMLCP User Profile Module
 * Manages user-specific linguistic profiles
 * Based on HMLCP specification
 */

const fs = require('fs').promises;
const path = require('path');

class UserProfile {
  constructor(userId, language = 'en') {
    this.userId = userId;
    this.language = language;
    this.created = new Date().toISOString();
    this.lastUpdated = new Date().toISOString();

    // Linguistic characteristics
    this.tone = 'neutral';  // neutral, formal, casual
    this.avgSentenceLength = 0;
    this.directness = 0;  // 0-100%
    this.ambiguityTolerance = 0;  // 0-100%

    // Lexical patterns
    this.lexicalBias = [];  // frequently used words
    this.phraseMap = {};  // user phrase → standard phrase mappings
    this.biasTerms = [];  // domain-specific terms

    // Data collection
    this.textSamples = [];  // collected text samples
    this.audioSamples = [];  // collected audio transcriptions
    this.corrections = [];  // user corrections (for learning)

    // Metrics
    this.metrics = {
      intentMatchRate: 0,  // IMR: % correctly interpreted
      correctionFrequency: 0,  // % requiring manual fix
      semanticDrift: 0,  // cosine distance
      calibrationIndex: 0  // weighted overall accuracy (≥0.9 ideal)
    };
  }

  /**
   * Add a text sample for analysis
   */
  addTextSample(text, intent = null) {
    this.textSamples.push({
      text,
      intent,
      timestamp: new Date().toISOString()
    });
    this.lastUpdated = new Date().toISOString();
  }

  /**
   * Add an audio transcription sample
   */
  addAudioSample(transcription, audioMetadata = {}) {
    this.audioSamples.push({
      transcription,
      metadata: audioMetadata,
      timestamp: new Date().toISOString()
    });
    this.lastUpdated = new Date().toISOString();
  }

  /**
   * Add a correction (misinterpretation → correct interpretation)
   */
  addCorrection(rawInput, interpretedIntent, correctedIntent) {
    this.corrections.push({
      rawInput,
      interpretedIntent,
      correctedIntent,
      timestamp: new Date().toISOString()
    });
    this.lastUpdated = new Date().toISOString();

    // Update correction frequency metric
    this.updateMetrics();
  }

  /**
   * Add a calibration sample (from onboarding)
   * @param {string} expectedPhrase - The phrase user was supposed to say
   * @param {string} transcribedPhrase - What was actually transcribed
   */
  addCalibrationSample(expectedPhrase, transcribedPhrase) {
    if (!this.calibrationSamples) {
      this.calibrationSamples = [];
    }

    this.calibrationSamples.push({
      expected: expectedPhrase,
      transcribed: transcribedPhrase,
      match: expectedPhrase.toLowerCase() === transcribedPhrase.toLowerCase(),
      timestamp: new Date().toISOString()
    });

    // If there's a mismatch, add to phrase map for future corrections
    if (expectedPhrase.toLowerCase() !== transcribedPhrase.toLowerCase()) {
      this.updatePhraseMapping(transcribedPhrase, expectedPhrase);
    }

    this.lastUpdated = new Date().toISOString();
  }

  /**
   * Add a pattern for speech recognition corrections
   * @param {object} pattern - Pattern object from PatternExtractor
   */
  addPattern(pattern) {
    if (!this.patterns) {
      this.patterns = [];
    }

    this.patterns.push({
      ...pattern,
      timestamp: new Date().toISOString()
    });

    this.lastUpdated = new Date().toISOString();
  }

  /**
   * Update phrase mapping from corrections
   */
  updatePhraseMapping(userPhrase, standardPhrase) {
    this.phraseMap[userPhrase.toLowerCase()] = standardPhrase;
    this.lastUpdated = new Date().toISOString();
  }

  /**
   * Add bias term (domain-specific vocabulary)
   */
  addBiasTerm(term) {
    if (!this.biasTerms.includes(term)) {
      this.biasTerms.push(term);
      this.lastUpdated = new Date().toISOString();
    }
  }

  /**
   * Update metrics based on interactions
   */
  updateMetrics() {
    const totalSamples = this.textSamples.length + this.audioSamples.length;
    const totalCorrections = this.corrections.length;

    if (totalSamples === 0) return;

    // Correction frequency: lower is better
    this.metrics.correctionFrequency = (totalCorrections / totalSamples) * 100;

    // Intent Match Rate: 100% - correction frequency
    this.metrics.intentMatchRate = 100 - this.metrics.correctionFrequency;

    // Calibration Index (weighted formula from HMLCP)
    // CI = (IMR*0.6) + (correction_drop*0.3) + (naturalness*0.1)
    const imrScore = this.metrics.intentMatchRate / 100;
    const correctionDrop = Math.max(0, 1 - (this.metrics.correctionFrequency / 100));
    const naturalness = 0.8; // Placeholder - would be calculated from prosody analysis

    this.metrics.calibrationIndex = (imrScore * 0.6) + (correctionDrop * 0.3) + (naturalness * 0.1);

    this.lastUpdated = new Date().toISOString();
  }

  /**
   * Export profile as JSON
   */
  toJSON() {
    return {
      userId: this.userId,
      language: this.language,
      created: this.created,
      lastUpdated: this.lastUpdated,
      tone: this.tone,
      avgSentenceLength: this.avgSentenceLength,
      directness: this.directness,
      ambiguityTolerance: this.ambiguityTolerance,
      lexicalBias: this.lexicalBias,
      phraseMap: this.phraseMap,
      biasTerms: this.biasTerms,
      textSamples: this.textSamples,  // Export full array
      audioSamples: this.audioSamples,  // Export full array
      corrections: this.corrections,  // Export full array
      metrics: this.metrics
    };
  }

  /**
   * Save profile to disk
   */
  async save(directory = './hmlcp/profiles') {
    try {
      await fs.mkdir(directory, { recursive: true });
      const filePath = path.join(directory, `${this.userId}_${this.language}.json`);
      await fs.writeFile(filePath, JSON.stringify(this, null, 2));
      console.log(`✓ Profile saved: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('Error saving profile:', error);
      throw error;
    }
  }

  /**
   * Load profile from disk
   */
  static async load(userId, language, directory = './hmlcp/profiles') {
    try {
      const filePath = path.join(directory, `${userId}_${language}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      const profileData = JSON.parse(data);

      const profile = new UserProfile(userId, language);

      // Manually assign properties to ensure proper types
      Object.keys(profileData).forEach(key => {
        profile[key] = profileData[key];
      });

      // Ensure critical arrays are always arrays (backward compatibility)
      profile.textSamples = Array.isArray(profile.textSamples) ? profile.textSamples : [];
      profile.audioSamples = Array.isArray(profile.audioSamples) ? profile.audioSamples : [];
      profile.corrections = Array.isArray(profile.corrections) ? profile.corrections : [];
      profile.lexicalBias = Array.isArray(profile.lexicalBias) ? profile.lexicalBias : [];
      profile.biasTerms = Array.isArray(profile.biasTerms) ? profile.biasTerms : [];

      console.log(`✓ Profile loaded: ${filePath}`);
      return profile;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`No existing profile found for ${userId} (${language}), creating new one`);
        return new UserProfile(userId, language);
      }
      throw error;
    }
  }

  /**
   * Check if profile exists
   */
  static async exists(userId, language, directory = './hmlcp/profiles') {
    try {
      const filePath = path.join(directory, `${userId}_${language}.json`);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = UserProfile;
