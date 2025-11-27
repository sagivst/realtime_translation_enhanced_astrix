/**
 * Test Audio Generator Module
 *
 * Generates test audio streams for QA testing of monitoring modules
 * Supports: sine, square, sawtooth, white noise
 */

class TestAudioGenerator {
  constructor() {
    this.isGenerating = false;
    this.currentInterval = null;
    this.packetsGenerated = 0;
  }

  /**
   * Generate PCM audio data
   */
  generateAudio(params) {
    const {
      frequency = 1000,
      sampleRate = 16000,
      duration = 0.02, // 20ms chunks by default
      waveType = 'sine',
      gain = 1.0
    } = params;

    const samples = Math.floor(sampleRate * duration);
    const buffer = Buffer.alloc(samples * 2); // 16-bit PCM = 2 bytes per sample

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      let sample = 0;

      switch (waveType) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * frequency * t);
          break;

        case 'square':
          sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
          break;

        case 'sawtooth':
          sample = 2 * ((frequency * t) % 1) - 1;
          break;

        case 'noise':
          sample = Math.random() * 2 - 1; // White noise
          break;

        default:
          sample = Math.sin(2 * Math.PI * frequency * t);
      }

      // Apply gain and convert to 16-bit PCM
      const value = Math.max(-32768, Math.min(32767, Math.floor(sample * gain * 32767)));
      buffer.writeInt16LE(value, i * 2);
    }

    return buffer;
  }

  /**
   * Start generating test stream
   */
  async startStream(params, callback) {
    if (this.isGenerating) {
      throw new Error('Stream already running');
    }

    const {
      frequency = 1000,
      sampleRate = 16000,
      duration = 5, // Total duration in seconds
      waveType = 'sine',
      gain = 1.0,
      chunkDuration = 0.02 // 20ms chunks
    } = params;

    this.isGenerating = true;
    this.packetsGenerated = 0;

    const totalChunks = Math.ceil(duration / chunkDuration);
    let currentChunk = 0;

    console.log(`[TestAudioGenerator] Starting ${waveType} stream: ${frequency}Hz, ${sampleRate}Hz sample rate, ${duration}s duration`);

    this.currentInterval = setInterval(() => {
      if (currentChunk >= totalChunks) {
        this.stopStream();
        console.log(`[TestAudioGenerator] Stream completed: ${this.packetsGenerated} packets generated`);
        return;
      }

      // Generate audio chunk
      const audioData = this.generateAudio({
        frequency,
        sampleRate,
        duration: chunkDuration,
        waveType,
        gain
      });

      // Send to callback (e.g., to station for processing)
      if (callback) {
        callback(audioData, {
          packet: currentChunk,
          totalPackets: totalChunks,
          frequency,
          sampleRate,
          waveType
        });
      }

      this.packetsGenerated++;
      currentChunk++;

    }, chunkDuration * 1000); // Convert to milliseconds

    return {
      totalChunks,
      chunkDurationMs: chunkDuration * 1000,
      estimatedDurationMs: duration * 1000
    };
  }

  /**
   * Stop generating test stream
   */
  stopStream() {
    if (this.currentInterval) {
      clearInterval(this.currentInterval);
      this.currentInterval = null;
    }

    this.isGenerating = false;

    const stats = {
      packetsGenerated: this.packetsGenerated
    };

    this.packetsGenerated = 0;

    return stats;
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isGenerating: this.isGenerating,
      packetsGenerated: this.packetsGenerated
    };
  }

  /**
   * Generate a single test packet
   */
  generatePacket(frequency = 1000, sampleRate = 16000, gain = 1.0) {
    return this.generateAudio({
      frequency,
      sampleRate,
      duration: 0.02, // 20ms
      waveType: 'sine',
      gain
    });
  }
}

module.exports = TestAudioGenerator;
