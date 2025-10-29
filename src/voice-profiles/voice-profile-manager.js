/**
 * Voice Profile Manager
 * Handles voice profile storage, retrieval, and embedding management
 * Implements ECAPA-TDNN + GST-Tacotron embedding system
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

class VoiceProfileManager {
  constructor(config = {}) {
    this.config = {
      profilesPath: config.profilesPath || path.join(__dirname, '../../data/profiles'),
      embeddingsPath: config.embeddingsPath || path.join(__dirname, '../../data/voice-embeddings'),
      pythonPath: config.pythonPath || path.join(__dirname, '../../xtts-server/venv-xtts/bin/python'),
      ...config
    };

    this.profiles = new Map(); // In-memory cache
    this.initialized = false;
  }

  /**
   * Initialize voice profile system
   */
  async initialize() {
    console.log('[VoiceProfile] Initializing voice profile system...');

    try {
      // Ensure directories exist
      await fs.mkdir(this.config.profilesPath, { recursive: true });
      await fs.mkdir(this.config.embeddingsPath, { recursive: true });

      // Load existing profiles
      await this.loadAllProfiles();

      this.initialized = true;
      console.log(`[VoiceProfile] ✓ Loaded ${this.profiles.size} profiles`);

      return true;
    } catch (error) {
      console.error('[VoiceProfile] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create a new voice profile from calibration audio
   * @param {Object} params - Profile parameters
   * @param {string} params.userId - Unique user identifier
   * @param {string} params.username - Display name
   * @param {string} params.language - Primary language
   * @param {Buffer[]} params.audioSamples - Array of audio samples for training
   * @returns {Promise<Object>} Created profile
   */
  async createProfile(params) {
    const { userId, username, language, audioSamples } = params;

    console.log(`[VoiceProfile] Creating profile for ${username} (${language})...`);

    if (!audioSamples || audioSamples.length < 3) {
      throw new Error('At least 3 audio samples required for profile creation');
    }

    const startTime = Date.now();

    try {
      // Generate unique profile ID
      const profileId = this.generateProfileId(userId, language);

      // Extract embeddings using Python service
      const embeddings = await this.extractEmbeddings(audioSamples, language);

      // Create profile metadata
      const profile = {
        profileId,
        userId,
        username,
        language,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        embeddingId: embeddings.embeddingId,
        sampleCount: audioSamples.length,
        metadata: {
          extractionTime: Date.now() - startTime,
          dimensions: embeddings.dimensions,
          model: 'ecapa-tdnn + gst-tacotron'
        }
      };

      // Save profile metadata
      await this.saveProfile(profile);

      // Cache in memory
      this.profiles.set(profileId, profile);

      console.log(`[VoiceProfile] ✓ Profile created: ${profileId} (${Date.now() - startTime}ms)`);

      return profile;
    } catch (error) {
      console.error('[VoiceProfile] Profile creation failed:', error);
      throw error;
    }
  }

  /**
   * Extract voice embeddings from audio samples
   * Uses ECAPA-TDNN (256-D) + GST-Tacotron (64-D) = 320-D total
   */
  async extractEmbeddings(audioSamples, language) {
    return new Promise((resolve, reject) => {
      const embeddingId = `emb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const scriptPath = path.join(__dirname, 'extract-embeddings.py');

      // Create temporary files for audio samples
      const tempDir = path.join(__dirname, '../../data/temp', embeddingId);

      const processAudio = async () => {
        try {
          await fs.mkdir(tempDir, { recursive: true });

          // Write audio samples to temp files
          const audioFiles = [];
          for (let i = 0; i < audioSamples.length; i++) {
            const filename = `sample_${i}.wav`;
            const filepath = path.join(tempDir, filename);
            await fs.writeFile(filepath, audioSamples[i]);
            audioFiles.push(filepath);
          }

          // Call Python script to extract embeddings
          const python = spawn(this.config.pythonPath, [
            scriptPath,
            '--audio-dir', tempDir,
            '--output', path.join(this.config.embeddingsPath, `${embeddingId}.npz`),
            '--language', language
          ]);

          let output = '';
          let errorOutput = '';

          python.stdout.on('data', (data) => {
            output += data.toString();
          });

          python.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.log('[Embedding Extraction]', data.toString().trim());
          });

          python.on('close', async (code) => {
            // Cleanup temp files
            try {
              await fs.rm(tempDir, { recursive: true, force: true });
            } catch (e) {
              console.warn('[VoiceProfile] Failed to cleanup temp files:', e);
            }

            if (code !== 0) {
              reject(new Error(`Embedding extraction failed: ${errorOutput}`));
              return;
            }

            try {
              const result = JSON.parse(output);
              resolve({
                embeddingId,
                dimensions: result.dimensions || 320,
                ...result
              });
            } catch (e) {
              reject(new Error(`Failed to parse embedding output: ${e.message}`));
            }
          });

          python.on('error', (error) => {
            reject(new Error(`Python process error: ${error.message}`));
          });
        } catch (error) {
          reject(error);
        }
      };

      processAudio();
    });
  }

  /**
   * Get profile by ID
   */
  async getProfile(profileId) {
    // Check cache first
    if (this.profiles.has(profileId)) {
      return this.profiles.get(profileId);
    }

    // Load from disk
    try {
      const profilePath = path.join(this.config.profilesPath, `${profileId}.json`);
      const data = await fs.readFile(profilePath, 'utf8');
      const profile = JSON.parse(data);

      // Cache it
      this.profiles.set(profileId, profile);

      return profile;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all profiles for a user
   */
  async getUserProfiles(userId) {
    const profiles = [];

    for (const profile of this.profiles.values()) {
      if (profile.userId === userId) {
        profiles.push(profile);
      }
    }

    return profiles;
  }

  /**
   * Update profile
   */
  async updateProfile(profileId, updates) {
    const profile = await this.getProfile(profileId);

    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    const updatedProfile = {
      ...profile,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.saveProfile(updatedProfile);
    this.profiles.set(profileId, updatedProfile);

    return updatedProfile;
  }

  /**
   * Delete profile
   */
  async deleteProfile(profileId) {
    const profile = await this.getProfile(profileId);

    if (!profile) {
      return false;
    }

    try {
      // Delete profile metadata
      const profilePath = path.join(this.config.profilesPath, `${profileId}.json`);
      await fs.unlink(profilePath);

      // Delete embeddings
      const embeddingPath = path.join(this.config.embeddingsPath, `${profile.embeddingId}.npz`);
      await fs.unlink(embeddingPath).catch(() => {}); // Ignore if doesn't exist

      // Remove from cache
      this.profiles.delete(profileId);

      console.log(`[VoiceProfile] ✓ Deleted profile: ${profileId}`);
      return true;
    } catch (error) {
      console.error('[VoiceProfile] Failed to delete profile:', error);
      return false;
    }
  }

  /**
   * Load all profiles from disk
   */
  async loadAllProfiles() {
    try {
      const files = await fs.readdir(this.config.profilesPath);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const data = await fs.readFile(path.join(this.config.profilesPath, file), 'utf8');
          const profile = JSON.parse(data);
          this.profiles.set(profile.profileId, profile);
        } catch (error) {
          console.warn(`[VoiceProfile] Failed to load profile ${file}:`, error);
        }
      }
    } catch (error) {
      // Directory might not exist yet
      console.log('[VoiceProfile] No existing profiles found');
    }
  }

  /**
   * Save profile to disk
   */
  async saveProfile(profile) {
    const profilePath = path.join(this.config.profilesPath, `${profile.profileId}.json`);
    await fs.writeFile(profilePath, JSON.stringify(profile, null, 2), 'utf8');
  }

  /**
   * Generate unique profile ID
   */
  generateProfileId(userId, language) {
    const hash = crypto.createHash('sha256')
      .update(`${userId}_${language}_${Date.now()}`)
      .digest('hex')
      .substring(0, 16);

    return `profile_${language}_${hash}`;
  }

  /**
   * Get profile statistics
   */
  getStats() {
    const stats = {
      totalProfiles: this.profiles.size,
      byLanguage: {},
      totalEmbeddings: 0
    };

    for (const profile of this.profiles.values()) {
      const lang = profile.language;
      stats.byLanguage[lang] = (stats.byLanguage[lang] || 0) + 1;
    }

    return stats;
  }
}

module.exports = VoiceProfileManager;
