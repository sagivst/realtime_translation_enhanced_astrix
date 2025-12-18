// Audio Analysis Utilities for Station Handlers
// Provides real-time audio quality metrics from PCM buffers

class AudioAnalysisUtils {
  /**
   * Calculate Signal-to-Noise Ratio (SNR) in dB
   * @param {Buffer} pcmBuffer - 16-bit PCM audio buffer
   * @param {number} sampleRate - Sample rate in Hz (default: 16000)
   * @returns {number} SNR in dB (0-60 range)
   */
  static calculateSNR(pcmBuffer, sampleRate = 16000) {
    if (!pcmBuffer || pcmBuffer.length < 2) return 0;

    try {
      // Convert PCM to float samples (-1.0 to 1.0)
      const samples = [];
      for (let i = 0; i < pcmBuffer.length - 1; i += 2) {
        const sample = pcmBuffer.readInt16LE(i) / 32768.0;
        samples.push(sample);
      }

      if (samples.length === 0) return 0;

      // Calculate RMS signal power
      const rms = Math.sqrt(
        samples.reduce((sum, s) => sum + s * s, 0) / samples.length
      );

      // Estimate noise floor (lowest 10% of samples)
      const sortedAbs = samples.map(Math.abs).sort((a, b) => a - b);
      const noiseCount = Math.max(1, Math.floor(sortedAbs.length * 0.1));
      const noiseFloor = sortedAbs.slice(0, noiseCount)
        .reduce((a, b) => a + b, 0) / noiseCount;

      // Prevent division by zero
      if (noiseFloor < 0.0001) return 60;

      // Calculate SNR in dB
      const snr = 20 * Math.log10(rms / noiseFloor);

      // Clamp to reasonable range (0-60 dB)
      return Math.max(0, Math.min(60, snr));
    } catch (error) {
      console.error('[AudioAnalysis] SNR calculation error:', error.message);
      return 0;
    }
  }

  /**
   * Calculate RMS (Root Mean Square) level in dBFS
   * @param {Buffer} pcmBuffer - 16-bit PCM audio buffer
   * @returns {number} RMS level in dBFS (-60 to 0 range)
   */
  static calculateRMS(pcmBuffer) {
    if (!pcmBuffer || pcmBuffer.length < 2) return -60;

    try {
      // Convert PCM to float samples
      const samples = [];
      for (let i = 0; i < pcmBuffer.length - 1; i += 2) {
        const sample = pcmBuffer.readInt16LE(i) / 32768.0;
        samples.push(sample);
      }

      if (samples.length === 0) return -60;

      // Calculate RMS
      const rms = Math.sqrt(
        samples.reduce((sum, s) => sum + s * s, 0) / samples.length
      );

      // Prevent log(0)
      if (rms < 0.00001) return -60;

      // Convert to dBFS
      const dbfs = 20 * Math.log10(rms);

      // Clamp to reasonable range
      return Math.max(-60, Math.min(0, dbfs));
    } catch (error) {
      console.error('[AudioAnalysis] RMS calculation error:', error.message);
      return -60;
    }
  }

  /**
   * Detect clipped samples in audio buffer
   * @param {Buffer} pcmBuffer - 16-bit PCM audio buffer
   * @param {number} threshold - Clipping threshold (default: 0.98)
   * @returns {number} Percentage of clipped samples (0-100)
   */
  static detectClipping(pcmBuffer, threshold = 0.98) {
    if (!pcmBuffer || pcmBuffer.length < 2) return 0;

    try {
      let clippedCount = 0;
      let totalSamples = 0;

      for (let i = 0; i < pcmBuffer.length - 1; i += 2) {
        const sample = Math.abs(pcmBuffer.readInt16LE(i) / 32768.0);
        totalSamples++;
        if (sample >= threshold) {
          clippedCount++;
        }
      }

      if (totalSamples === 0) return 0;

      return (clippedCount / totalSamples) * 100;
    } catch (error) {
      console.error('[AudioAnalysis] Clipping detection error:', error.message);
      return 0;
    }
  }

  /**
   * Calculate noise floor level in dBFS
   * @param {Buffer} pcmBuffer - 16-bit PCM audio buffer
   * @returns {number} Noise floor in dBFS (-60 to 0 range)
   */
  static calculateNoiseFloor(pcmBuffer) {
    if (!pcmBuffer || pcmBuffer.length < 2) return -60;

    try {
      // Convert PCM to float samples
      const samples = [];
      for (let i = 0; i < pcmBuffer.length - 1; i += 2) {
        const sample = Math.abs(pcmBuffer.readInt16LE(i) / 32768.0);
        samples.push(sample);
      }

      if (samples.length === 0) return -60;

      // Sort and take lowest 10%
      const sorted = samples.sort((a, b) => a - b);
      const noiseCount = Math.max(1, Math.floor(sorted.length * 0.1));
      const noiseFloor = sorted.slice(0, noiseCount)
        .reduce((a, b) => a + b, 0) / noiseCount;

      // Prevent log(0)
      if (noiseFloor < 0.00001) return -60;

      // Convert to dBFS
      const dbfs = 20 * Math.log10(noiseFloor);

      return Math.max(-60, Math.min(0, dbfs));
    } catch (error) {
      console.error('[AudioAnalysis] Noise floor calculation error:', error.message);
      return -60;
    }
  }

  /**
   * Estimate Mean Opinion Score (MOS) from audio metrics
   * @param {Object} metrics - Audio metrics object
   * @param {number} metrics.snr - Signal-to-Noise Ratio in dB
   * @param {number} metrics.rms - RMS level in dBFS
   * @param {number} metrics.clipping - Clipping percentage
   * @returns {number} MOS score (1.0-5.0)
   */
  static estimateMOS(metrics) {
    try {
      const { snr = 0, rms = -60, clipping = 0 } = metrics;

      // Start with base score of 3.0
      let mos = 3.0;

      // SNR contribution (0-60 dB maps to -1.0 to +1.5)
      if (snr >= 40) {
        mos += 1.5;
      } else if (snr >= 30) {
        mos += 1.0;
      } else if (snr >= 20) {
        mos += 0.5;
      } else if (snr < 10) {
        mos -= 1.0;
      }

      // RMS level contribution (too quiet or too loud is bad)
      if (rms >= -20 && rms <= -6) {
        mos += 0.3; // Good level
      } else if (rms < -40) {
        mos -= 0.5; // Too quiet
      } else if (rms > -3) {
        mos -= 0.3; // Too loud
      }

      // Clipping penalty
      if (clipping > 1.0) {
        mos -= 1.0;
      } else if (clipping > 0.1) {
        mos -= 0.5;
      }

      // Clamp to valid MOS range (1.0-5.0)
      return Math.max(1.0, Math.min(5.0, mos));
    } catch (error) {
      console.error('[AudioAnalysis] MOS estimation error:', error.message);
      return 3.0; // Return neutral score on error
    }
  }

  /**
   * Detect voice activity in audio buffer
   * @param {Buffer} pcmBuffer - 16-bit PCM audio buffer
   * @param {number} threshold - Energy threshold in dBFS (default: -40)
   * @returns {number} Voice activity ratio (0.0-1.0)
   */
  static detectVoiceActivity(pcmBuffer, threshold = -40) {
    if (!pcmBuffer || pcmBuffer.length < 2) return 0;

    try {
      // Analyze in 20ms windows (320 samples at 16kHz)
      const windowSize = 320;
      let activeWindows = 0;
      let totalWindows = 0;

      for (let start = 0; start < pcmBuffer.length - windowSize * 2; start += windowSize * 2) {
        const windowBuffer = pcmBuffer.slice(start, start + windowSize * 2);
        const windowRMS = this.calculateRMS(windowBuffer);

        totalWindows++;
        if (windowRMS > threshold) {
          activeWindows++;
        }
      }

      if (totalWindows === 0) return 0;

      return activeWindows / totalWindows;
    } catch (error) {
      console.error('[AudioAnalysis] Voice activity detection error:', error.message);
      return 0;
    }
  }

  /**
   * Perform complete audio analysis
   * @param {Buffer} pcmBuffer - 16-bit PCM audio buffer
   * @param {number} sampleRate - Sample rate in Hz (default: 16000)
   * @returns {Object} Complete audio analysis metrics
   */
  static analyzeAudio(pcmBuffer, sampleRate = 16000) {
    try {
      const snr = this.calculateSNR(pcmBuffer, sampleRate);
      const rms = this.calculateRMS(pcmBuffer);
      const clipping = this.detectClipping(pcmBuffer);
      const noiseFloor = this.calculateNoiseFloor(pcmBuffer);
      const voiceActivity = this.detectVoiceActivity(pcmBuffer);
      const mos = this.estimateMOS({ snr, rms, clipping });

      return {
        snr,
        rms,
        clipping,
        noiseFloor,
        voiceActivity,
        mos,
        bufferSize: pcmBuffer ? pcmBuffer.length : 0,
        sampleRate
      };
    } catch (error) {
      console.error('[AudioAnalysis] Complete analysis error:', error.message);
      return {
        snr: 0,
        rms: -60,
        clipping: 0,
        noiseFloor: -60,
        voiceActivity: 0,
        mos: 3.0,
        bufferSize: 0,
        sampleRate
      };
    }
  }
}

module.exports = AudioAnalysisUtils;
