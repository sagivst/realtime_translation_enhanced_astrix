// FFTHelpers.js - Helper functions for FFT-based metrics
import FFT from 'fft.js';

// Compute FFT and return frequency spectrum
export function computeFFT(samples, sampleRate = 16000) {
  if (!samples || samples.length === 0) return null;
  
  // FFT requires power of 2 length
  const fftSize = Math.pow(2, Math.ceil(Math.log2(samples.length)));
  const fft = new FFT(fftSize);
  
  // Pad samples to power of 2
  const paddedSamples = new Float32Array(fftSize);
  for (let i = 0; i < samples.length && i < fftSize; i++) {
    paddedSamples[i] = samples[i] / 32768; // Normalize
  }
  
  // Convert to complex array format required by fft.js
  const complexArray = new Array(fftSize * 2);
  for (let i = 0; i < fftSize; i++) {
    complexArray[i * 2] = paddedSamples[i]; // Real
    complexArray[i * 2 + 1] = 0; // Imaginary
  }
  
  // Compute FFT
  const spectrum = fft.transform(complexArray);
  
  // Convert to magnitude spectrum
  const magnitudes = new Float32Array(fftSize / 2);
  for (let i = 0; i < fftSize / 2; i++) {
    const real = spectrum[i * 2];
    const imag = spectrum[i * 2 + 1];
    magnitudes[i] = Math.sqrt(real * real + imag * imag);
  }
  
  return {
    magnitudes,
    fftSize,
    sampleRate,
    binWidth: sampleRate / fftSize
  };
}

// Find spectral centroid
export function getSpectralCentroid(samples, sampleRate = 16000) {
  const fftResult = computeFFT(samples, sampleRate);
  if (!fftResult) return 0;
  
  let weightedSum = 0;
  let magnitudeSum = 0;
  
  for (let i = 0; i < fftResult.magnitudes.length; i++) {
    const freq = i * fftResult.binWidth;
    const mag = fftResult.magnitudes[i];
    weightedSum += freq * mag;
    magnitudeSum += mag;
  }
  
  return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
}

// Find spectral rolloff (85% of energy)
export function getSpectralRolloff(samples, sampleRate = 16000, percentile = 0.85) {
  const fftResult = computeFFT(samples, sampleRate);
  if (!fftResult) return 0;
  
  let totalEnergy = 0;
  for (let i = 0; i < fftResult.magnitudes.length; i++) {
    totalEnergy += fftResult.magnitudes[i] * fftResult.magnitudes[i];
  }
  
  let cumulativeEnergy = 0;
  const threshold = totalEnergy * percentile;
  
  for (let i = 0; i < fftResult.magnitudes.length; i++) {
    cumulativeEnergy += fftResult.magnitudes[i] * fftResult.magnitudes[i];
    if (cumulativeEnergy >= threshold) {
      return i * fftResult.binWidth;
    }
  }
  
  return sampleRate / 2;
}

// Calculate spectral flux
export function getSpectralFlux(samples, prevMagnitudes, sampleRate = 16000) {
  const fftResult = computeFFT(samples, sampleRate);
  if (!fftResult) return 0;
  
  if (!prevMagnitudes || prevMagnitudes.length !== fftResult.magnitudes.length) {
    return 0;
  }
  
  let flux = 0;
  for (let i = 0; i < fftResult.magnitudes.length; i++) {
    const diff = fftResult.magnitudes[i] - prevMagnitudes[i];
    if (diff > 0) flux += diff;
  }
  
  return flux;
}

// Get energy in frequency band
export function getBandEnergy(samples, lowFreq, highFreq, sampleRate = 16000) {
  const fftResult = computeFFT(samples, sampleRate);
  if (!fftResult) return -100;
  
  const lowBin = Math.floor(lowFreq / fftResult.binWidth);
  const highBin = Math.ceil(highFreq / fftResult.binWidth);
  
  let energy = 0;
  for (let i = lowBin; i <= highBin && i < fftResult.magnitudes.length; i++) {
    energy += fftResult.magnitudes[i] * fftResult.magnitudes[i];
  }
  
  return energy > 0 ? 10 * Math.log10(energy) : -100;
}

// Export all helpers
export default {
  computeFFT,
  getSpectralCentroid,
  getSpectralRolloff,
  getSpectralFlux,
  getBandEnergy
};
