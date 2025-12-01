/**
 * Prosodic Segmenter - VAD and Clause Boundary Detection
 *
 * Groups 20ms frames into natural speech segments:
 * - Voice Activity Detection (VAD)
 * - Energy and pitch analysis
 * - Clause boundary detection
 * - Prevents cutting mid-word
 *
 * Based on HAsterisk_HumeEVI_Spec.md specifications
 */

const { EventEmitter } = require('events');

const SAMPLE_RATE = 16000;
const FRAME_SIZE_SAMPLES = 320;
const FRAME_SIZE_BYTES = 640;

/**
 * Simple Voice Activity Detector
 */
class SimpleVAD {
    constructor(options = {}) {
        this.energyThreshold = options.energyThreshold || 500;
        this.silenceFrames = 0;
        this.voiceFrames = 0;
        this.minVoiceFrames = options.minVoiceFrames || 3;
        this.minSilenceFrames = options.minSilenceFrames || 5;
    }

    /**
     * Calculate RMS energy of frame
     */
    calculateEnergy(pcmBuffer) {
        let sum = 0;
        const samples = pcmBuffer.length / 2;

        for (let i = 0; i < pcmBuffer.length; i += 2) {
            const sample = pcmBuffer.readInt16LE(i);
            sum += sample * sample;
        }

        return Math.sqrt(sum / samples);
    }

    /**
     * Process frame and determine if speech is present
     */
    process(pcmBuffer) {
        const energy = this.calculateEnergy(pcmBuffer);
        const isSpeech = energy > this.energyThreshold;

        if (isSpeech) {
            this.voiceFrames++;
            this.silenceFrames = 0;
        } else {
            this.silenceFrames++;
            this.voiceFrames = 0;
        }

        return {
            isSpeech,
            energy,
            voiceActive: this.voiceFrames >= this.minVoiceFrames,
            silenceDetected: this.silenceFrames >= this.minSilenceFrames
        };
    }

    reset() {
        this.silenceFrames = 0;
        this.voiceFrames = 0;
    }
}

/**
 * Pitch detector (simplified autocorrelation)
 */
class PitchDetector {
    constructor() {
        this.minFreq = 80;   // 80 Hz
        this.maxFreq = 400;  // 400 Hz
        this.sampleRate = SAMPLE_RATE;
    }

    /**
     * Detect pitch using autocorrelation
     */
    detect(pcmBuffer) {
        const samples = [];
        for (let i = 0; i < pcmBuffer.length; i += 2) {
            samples.push(pcmBuffer.readInt16LE(i));
        }

        const minPeriod = Math.floor(this.sampleRate / this.maxFreq);
        const maxPeriod = Math.floor(this.sampleRate / this.minFreq);

        let maxCorrelation = 0;
        let bestPeriod = 0;

        // Autocorrelation
        for (let period = minPeriod; period <= maxPeriod; period++) {
            let correlation = 0;
            for (let i = 0; i < samples.length - period; i++) {
                correlation += samples[i] * samples[i + period];
            }

            if (correlation > maxCorrelation) {
                maxCorrelation = correlation;
                bestPeriod = period;
            }
        }

        if (bestPeriod === 0) {
            return null;
        }

        const frequency = this.sampleRate / bestPeriod;
        return frequency;
    }
}

/**
 * Prosodic Segmenter - Groups frames into natural segments
 */
class ProsodicSegmenter extends EventEmitter {
    constructor(options = {}) {
        super();

        // VAD configuration
        this.vad = new SimpleVAD({
            energyThreshold: options.energyThreshold || 500,
            minVoiceFrames: options.minVoiceFrames || 3,
            minSilenceFrames: options.minSilenceFrames || 5
        });

        // Pitch detector
        this.pitchDetector = new PitchDetector();

        // Segmentation parameters
        this.minSegmentDurationMs = options.minSegmentDurationMs || 500;  // 500ms min
        this.maxSegmentDurationMs = options.maxSegmentDurationMs || 3000; // 3s max
        this.pauseThresholdMs = options.pauseThresholdMs || 300;          // 300ms pause

        // Current segment
        this.currentSegment = {
            frames: [],
            startTime: null,
            duration: 0,
            energyHistory: [],
            pitchHistory: []
        };

        // State
        this.inSpeech = false;
        this.segmentCount = 0;

        // Statistics
        this.stats = {
            totalFrames: 0,
            segmentsEmitted: 0,
            averageSegmentDuration: 0
        };
    }

    /**
     * Add frame and detect segment boundaries
     */
    addFrame(frame) {
        this.stats.totalFrames++;

        // Run VAD
        const vadResult = this.vad.process(frame.data);

        // Detect pitch
        const pitch = vadResult.isSpeech ? this.pitchDetector.detect(frame.data) : null;

        // Update segment
        if (!this.currentSegment.startTime) {
            this.currentSegment.startTime = frame.timestamp;
        }

        this.currentSegment.frames.push(frame);
        this.currentSegment.energyHistory.push(vadResult.energy);
        if (pitch) {
            this.currentSegment.pitchHistory.push(pitch);
        }

        this.currentSegment.duration = frame.timestamp - this.currentSegment.startTime;

        // Check for segment boundary
        const shouldSegment = this.detectBoundary(vadResult);

        if (shouldSegment) {
            return this.finalizeSegment();
        }

        return null;
    }

    /**
     * Detect if we should create a segment boundary
     */
    detectBoundary(vadResult) {
        const duration = this.currentSegment.duration;

        // No boundary if segment too short
        if (duration < this.minSegmentDurationMs) {
            return false;
        }

        // Force boundary if segment too long
        if (duration >= this.maxSegmentDurationMs) {
            return true;
        }

        // Boundary on silence after speech
        if (vadResult.silenceDetected && this.currentSegment.frames.length > 0) {
            // Check if we had speech before
            const hadSpeech = this.currentSegment.energyHistory.some(e => e > this.vad.energyThreshold);
            if (hadSpeech) {
                return true;
            }
        }

        // Boundary on significant energy drop (clause boundary)
        if (this.currentSegment.energyHistory.length >= 10) {
            const recent = this.currentSegment.energyHistory.slice(-5);
            const previous = this.currentSegment.energyHistory.slice(-10, -5);

            const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
            const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

            // Energy dropped significantly (50% or more)
            if (recentAvg < previousAvg * 0.5 && previousAvg > this.vad.energyThreshold) {
                return true;
            }
        }

        // Boundary on pitch change (phrase boundary)
        if (this.currentSegment.pitchHistory.length >= 10) {
            const recent = this.currentSegment.pitchHistory.slice(-3);
            const previous = this.currentSegment.pitchHistory.slice(-6, -3);

            if (recent.length > 0 && previous.length > 0) {
                const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
                const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

                // Significant pitch change (>20%)
                const pitchChange = Math.abs(recentAvg - previousAvg) / previousAvg;
                if (pitchChange > 0.2) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Finalize current segment and emit
     */
    finalizeSegment() {
        if (this.currentSegment.frames.length === 0) {
            return null;
        }

        // Calculate segment audio buffer
        const totalBytes = this.currentSegment.frames.length * FRAME_SIZE_BYTES;
        const audioBuffer = Buffer.alloc(totalBytes);

        let offset = 0;
        for (const frame of this.currentSegment.frames) {
            frame.data.copy(audioBuffer, offset);
            offset += FRAME_SIZE_BYTES;
        }

        // Calculate statistics
        const avgEnergy = this.currentSegment.energyHistory.reduce((a, b) => a + b, 0) /
                         this.currentSegment.energyHistory.length;

        const avgPitch = this.currentSegment.pitchHistory.length > 0
            ? this.currentSegment.pitchHistory.reduce((a, b) => a + b, 0) / this.currentSegment.pitchHistory.length
            : null;

        const segment = {
            id: ++this.segmentCount,
            audioBuffer,
            frames: this.currentSegment.frames.length,
            duration: this.currentSegment.duration,
            startTime: this.currentSegment.startTime,
            endTime: this.currentSegment.frames[this.currentSegment.frames.length - 1].timestamp,
            sampleRate: SAMPLE_RATE,
            format: 's16le',
            statistics: {
                averageEnergy: Math.round(avgEnergy),
                averagePitch: avgPitch ? Math.round(avgPitch) : null,
                frameCount: this.currentSegment.frames.length
            }
        };

        // Update stats
        this.stats.segmentsEmitted++;
        this.stats.averageSegmentDuration =
            (this.stats.averageSegmentDuration * (this.stats.segmentsEmitted - 1) + segment.duration) /
            this.stats.segmentsEmitted;

        // Reset current segment
        this.currentSegment = {
            frames: [],
            startTime: null,
            duration: 0,
            energyHistory: [],
            pitchHistory: []
        };

        // Emit segment
        this.emit('segment', segment);

        return segment;
    }

    /**
     * Force finalize current segment
     */
    flush() {
        if (this.currentSegment.frames.length > 0) {
            return this.finalizeSegment();
        }
        return null;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            currentSegmentFrames: this.currentSegment.frames.length,
            currentSegmentDuration: this.currentSegment.duration
        };
    }

    /**
     * Reset segmenter
     */
    reset() {
        this.currentSegment = {
            frames: [],
            startTime: null,
            duration: 0,
            energyHistory: [],
            pitchHistory: []
        };
        this.vad.reset();
        this.segmentCount = 0;
    }
}

/**
 * Segment Buffer - Buffers segments for batching
 */
class SegmentBuffer extends EventEmitter {
    constructor(options = {}) {
        super();

        this.maxBufferMs = options.maxBufferMs || 1000;
        this.minBufferSegments = options.minBufferSegments || 1;

        this.buffer = [];
        this.totalDuration = 0;
    }

    /**
     * Add segment to buffer
     */
    addSegment(segment) {
        this.buffer.push(segment);
        this.totalDuration += segment.duration;

        // Check if we should emit
        if (this.shouldEmit()) {
            return this.flush();
        }

        return null;
    }

    /**
     * Check if buffer should be emitted
     */
    shouldEmit() {
        return this.buffer.length >= this.minBufferSegments ||
               this.totalDuration >= this.maxBufferMs;
    }

    /**
     * Flush buffer
     */
    flush() {
        if (this.buffer.length === 0) {
            return null;
        }

        const batch = {
            segments: this.buffer,
            count: this.buffer.length,
            totalDuration: this.totalDuration
        };

        this.buffer = [];
        this.totalDuration = 0;

        this.emit('batch', batch);
        return batch;
    }

    /**
     * Get buffer info
     */
    getInfo() {
        return {
            segmentCount: this.buffer.length,
            totalDuration: this.totalDuration
        };
    }
}

module.exports = {
    ProsodicSegmenter,
    SegmentBuffer,
    SimpleVAD,
    PitchDetector
};
