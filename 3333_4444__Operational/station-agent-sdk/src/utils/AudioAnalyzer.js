/**
 * AudioAnalyzer - Utilities for analyzing PCM audio quality
 *
 * Calculates:
 * - RMS (Root Mean Square) level
 * - Peak level
 * - SNR (Signal-to-Noise Ratio)
 * - THD (Total Harmonic Distortion) - simplified
 * - Clipping detection
 * - Speech activity detection
 */

class AudioAnalyzer {
  /**
   * Calculate RMS level in dBFS
   * @param {Buffer} pcmBuffer - PCM16 audio buffer
   * @param {number} sampleRate - Sample rate (e.g., 16000)
   * @returns {number} - RMS level in dBFS
   */
  static calculateRMS(pcmBuffer, sampleRate = 16000) {
    if (!pcmBuffer || pcmBuffer.length < 2) return -90;

    let sumSquares = 0;
    const numSamples = Math.floor(pcmBuffer.length / 2);

    for (let i = 0; i < pcmBuffer.length; i += 2) {
      const sample = pcmBuffer.readInt16LE(i);
      const normalized = sample / 32768.0; // Normalize to -1.0 to 1.0
      sumSquares += normalized * normalized;
    }

    const rms = Math.sqrt(sumSquares / numSamples);

    // Convert to dBFS
    if (rms === 0) return -90;
    return 20 * Math.log10(rms);
  }

  /**
   * Calculate peak level in dBFS
   * @param {Buffer} pcmBuffer - PCM16 audio buffer
   * @returns {number} - Peak level in dBFS
   */
  static calculatePeak(pcmBuffer) {
    if (!pcmBuffer || pcmBuffer.length < 2) return -90;

    let maxSample = 0;

    for (let i = 0; i < pcmBuffer.length; i += 2) {
      const sample = Math.abs(pcmBuffer.readInt16LE(i));
      if (sample > maxSample) {
        maxSample = sample;
      }
    }

    const normalized = maxSample / 32768.0;
    if (normalized === 0) return -90;
    return 20 * Math.log10(normalized);
  }

  /**
   * Estimate SNR (Signal-to-Noise Ratio)
   * Uses simplified approach: compares speech segments vs silence segments
   * @param {Buffer} pcmBuffer - PCM16 audio buffer
   * @param {number} sampleRate - Sample rate
   * @returns {number} - SNR in dB
   */
  static estimateSNR(pcmBuffer, sampleRate = 16000) {
    if (!pcmBuffer || pcmBuffer.length < 2) return 0;

    const frameSize = Math.floor(sampleRate * 0.02); // 20ms frames
    const numFrames = Math.floor(pcmBuffer.length / (frameSize * 2));

    const frameEnergies = [];

    // Calculate energy for each frame
    for (let i = 0; i < numFrames; i++) {
      const startByte = i * frameSize * 2;
      const endByte = Math.min(startByte + frameSize * 2, pcmBuffer.length);

      let energy = 0;
      for (let j = startByte; j < endByte; j += 2) {
        const sample = pcmBuffer.readInt16LE(j) / 32768.0;
        energy += sample * sample;
      }

      frameEnergies.push(energy / frameSize);
    }

    if (frameEnergies.length === 0) return 0;

    // Sort energies to find noise floor (bottom 20%) and signal (top 20%)
    const sorted = [...frameEnergies].sort((a, b) => a - b);
    const noiseCount = Math.max(1, Math.floor(sorted.length * 0.2));
    const signalStart = Math.max(0, sorted.length - noiseCount);

    const noiseFloor = sorted.slice(0, noiseCount).reduce((a, b) => a + b, 0) / noiseCount;
    const signalLevel = sorted.slice(signalStart).reduce((a, b) => a + b, 0) / noiseCount;

    if (noiseFloor === 0) return 60; // Very clean signal

    const snr = 10 * Math.log10(signalLevel / noiseFloor);
    return Math.max(0, Math.min(60, snr)); // Clamp between 0-60 dB
  }

  /**
   * Detect clipping in audio
   * @param {Buffer} pcmBuffer - PCM16 audio buffer
   * @param {number} threshold - Clipping threshold (0.0-1.0, default 0.99)
   * @returns {Object} - { clippedSamples, totalSamples, percentage }
   */
  static detectClipping(pcmBuffer, threshold = 0.99) {
    if (!pcmBuffer || pcmBuffer.length < 2) {
      return { clippedSamples: 0, totalSamples: 0, percentage: 0 };
    }

    const clipThreshold = 32768 * threshold;
    let clippedSamples = 0;
    const totalSamples = Math.floor(pcmBuffer.length / 2);

    for (let i = 0; i < pcmBuffer.length; i += 2) {
      const sample = Math.abs(pcmBuffer.readInt16LE(i));
      if (sample >= clipThreshold) {
        clippedSamples++;
      }
    }

    return {
      clippedSamples,
      totalSamples,
      percentage: (clippedSamples / totalSamples) * 100
    };
  }

  /**
   * Detect speech activity (Voice Activity Detection)
   * @param {Buffer} pcmBuffer - PCM16 audio buffer
   * @param {number} sampleRate - Sample rate
   * @param {number} energyThreshold - Energy threshold for speech (default -40 dBFS)
   * @returns {Object} - { speechFrames, totalFrames, percentage }
   */
  static detectSpeechActivity(pcmBuffer, sampleRate = 16000, energyThreshold = -40) {
    if (!pcmBuffer || pcmBuffer.length < 2) {
      return { speechFrames: 0, totalFrames: 0, percentage: 0 };
    }

    const frameSize = Math.floor(sampleRate * 0.02); // 20ms frames
    const numFrames = Math.floor(pcmBuffer.length / (frameSize * 2));
    const thresholdLinear = Math.pow(10, energyThreshold / 20);

    let speechFrames = 0;

    for (let i = 0; i < numFrames; i++) {
      const startByte = i * frameSize * 2;
      const endByte = Math.min(startByte + frameSize * 2, pcmBuffer.length);

      let energy = 0;
      for (let j = startByte; j < endByte; j += 2) {
        const sample = pcmBuffer.readInt16LE(j) / 32768.0;
        energy += sample * sample;
      }

      const rms = Math.sqrt(energy / frameSize);

      if (rms > thresholdLinear) {
        speechFrames++;
      }
    }

    return {
      speechFrames,
      totalFrames: numFrames,
      percentage: (speechFrames / numFrames) * 100
    };
  }

  /**
   * Calculate noise floor level
   * @param {Buffer} pcmBuffer - PCM16 audio buffer
   * @param {number} sampleRate - Sample rate
   * @returns {number} - Noise floor in dBFS
   */
  static calculateNoiseFloor(pcmBuffer, sampleRate = 16000) {
    if (!pcmBuffer || pcmBuffer.length < 2) return -90;

    const frameSize = Math.floor(sampleRate * 0.02);
    const numFrames = Math.floor(pcmBuffer.length / (frameSize * 2));

    const frameEnergies = [];

    for (let i = 0; i < numFrames; i++) {
      const startByte = i * frameSize * 2;
      const endByte = Math.min(startByte + frameSize * 2, pcmBuffer.length);

      let energy = 0;
      for (let j = startByte; j < endByte; j += 2) {
        const sample = pcmBuffer.readInt16LE(j) / 32768.0;
        energy += sample * sample;
      }

      frameEnergies.push(energy / frameSize);
    }

    if (frameEnergies.length === 0) return -90;

    // Noise floor is bottom 20% of energies
    const sorted = [...frameEnergies].sort((a, b) => a - b);
    const noiseCount = Math.max(1, Math.floor(sorted.length * 0.2));
    const noiseFloor = sorted.slice(0, noiseCount).reduce((a, b) => a + b, 0) / noiseCount;

    if (noiseFloor === 0) return -90;
    return 10 * Math.log10(noiseFloor);
  }

  /**
   * Simplified THD estimation
   * Note: This is a very basic estimation. True THD requires FFT analysis.
   * @param {Buffer} pcmBuffer - PCM16 audio buffer
   * @returns {number} - Estimated THD percentage
   */
  static estimateTHD(pcmBuffer) {
    if (!pcmBuffer || pcmBuffer.length < 2) return 0;

    // Very simplified: measure "roughness" by looking at sample-to-sample differences
    let totalDiff = 0;
    let maxDiff = 0;
    const numSamples = Math.floor(pcmBuffer.length / 2) - 1;

    for (let i = 0; i < pcmBuffer.length - 2; i += 2) {
      const sample1 = pcmBuffer.readInt16LE(i);
      const sample2 = pcmBuffer.readInt16LE(i + 2);
      const diff = Math.abs(sample2 - sample1);
      totalDiff += diff;
      if (diff > maxDiff) maxDiff = diff;
    }

    const avgDiff = totalDiff / numSamples;

    // Rough estimation: normalize to percentage
    // This is NOT true THD, but gives an indication of signal roughness
    const thd = (avgDiff / 32768) * 100;
    return Math.min(thd, 100);
  }

  /**
   * Calculate MOS (Mean Opinion Score) estimate
   * Based on SNR, clipping, and other factors
   * @param {Object} metrics - Audio metrics (snr, clipping, etc.)
   * @returns {number} - MOS score (1.0 - 5.0)
   */
  static estimateMOS(metrics) {
    const { snr, clippingPct, speechActivityPct } = metrics;

    let mos = 5.0;

    // Reduce MOS based on SNR
    if (snr < 15) mos -= 2.0;
    else if (snr < 20) mos -= 1.5;
    else if (snr < 25) mos -= 0.5;

    // Reduce MOS based on clipping
    if (clippingPct > 1.0) mos -= 2.0;
    else if (clippingPct > 0.1) mos -= 1.0;
    else if (clippingPct > 0.01) mos -= 0.3;

    // Reduce MOS if speech activity is too low (silence or dropout)
    if (speechActivityPct < 10) mos -= 1.0;

    return Math.max(1.0, Math.min(5.0, mos));
  }
}

module.exports = AudioAnalyzer;
