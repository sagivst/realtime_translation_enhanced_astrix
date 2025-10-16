/**
 * Pacing Governor - Strict 20ms Frame Output Timing
 *
 * Ensures Asterisk receives exactly one 640-byte frame every 20ms:
 * - Maintains precise timing with high-resolution clock
 * - Emits placeholder frames when translation not ready
 * - Crossfades from placeholder to translated audio
 * - Never stalls the ExternalMedia socket
 *
 * Based on HAsterisk_HumeEVI_Spec.md specifications
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');

const FRAME_SIZE = 640;        // 640 bytes
const FRAME_DURATION_MS = 20;  // 20ms per frame
const PLAYBACK_BUFFER_SIZE = 8; // 160ms jitter buffer (6-8 frames)

/**
 * High-resolution 20ms clock
 */
class TwentyMsClock {
    constructor() {
        this.startTime = performance.now();
        this.tickCount = 0;
        this.driftCorrection = 0;
    }

    /**
     * Sleep until next 20ms tick
     */
    async sleepNextTick() {
        this.tickCount++;

        // Calculate ideal time for this tick
        const idealTime = this.startTime + (this.tickCount * FRAME_DURATION_MS);

        // Current time
        const now = performance.now();

        // Time to wait (with drift correction)
        const waitTime = Math.max(0, idealTime - now + this.driftCorrection);

        if (waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        // Measure actual time and update drift correction
        const actualTime = performance.now();
        const drift = actualTime - idealTime;

        // Apply small correction for next tick
        this.driftCorrection -= drift * 0.1;

        return {
            tickNum: this.tickCount,
            drift: drift.toFixed(3),
            waitedMs: waitTime.toFixed(3)
        };
    }

    /**
     * Reset clock
     */
    reset() {
        this.startTime = performance.now();
        this.tickCount = 0;
        this.driftCorrection = 0;
    }

    /**
     * Get clock statistics
     */
    getStats() {
        const elapsed = performance.now() - this.startTime;
        const expectedTicks = Math.floor(elapsed / FRAME_DURATION_MS);

        return {
            ticks: this.tickCount,
            expectedTicks,
            driftCorrection: this.driftCorrection.toFixed(3),
            accuracy: ((this.tickCount / expectedTicks) * 100).toFixed(2) + '%'
        };
    }
}

/**
 * Ring Buffer for playback queue
 */
class PlaybackQueue {
    constructor(size) {
        this.size = size;
        this.buffer = new Array(size);
        this.readIndex = 0;
        this.writeIndex = 0;
        this.count = 0;
    }

    push(frame) {
        if (this.count >= this.size) {
            // Buffer full - this shouldn't happen often
            // Drop oldest frame to make room
            this.readIndex = (this.readIndex + 1) % this.size;
        } else {
            this.count++;
        }

        this.buffer[this.writeIndex] = frame;
        this.writeIndex = (this.writeIndex + 1) % this.size;
    }

    pop() {
        if (this.count === 0) {
            return null;
        }

        const frame = this.buffer[this.readIndex];
        this.readIndex = (this.readIndex + 1) % this.size;
        this.count--;

        return frame;
    }

    peek() {
        if (this.count === 0) {
            return null;
        }
        return this.buffer[this.readIndex];
    }

    getCount() {
        return this.count;
    }

    isEmpty() {
        return this.count === 0;
    }

    isFull() {
        return this.count >= this.size;
    }

    clear() {
        this.readIndex = 0;
        this.writeIndex = 0;
        this.count = 0;
    }
}

/**
 * Pacing Governor - Ensures strict 20ms output cadence
 */
class PacingGovernor extends EventEmitter {
    constructor(frameCollector, options = {}) {
        super();

        this.frameCollector = frameCollector;

        // Configuration
        this.playbackBufferSize = options.playbackBufferSize || PLAYBACK_BUFFER_SIZE;
        this.crossfadeDurationMs = options.crossfadeDurationMs || 60;
        this.placeholderType = options.placeholderType || 'silence'; // 'silence' or 'comfort_noise'

        // Clock and buffer
        this.clock = new TwentyMsClock();
        this.playbackQueue = new PlaybackQueue(this.playbackBufferSize);

        // State
        this.running = false;
        this.paused = false;

        // Crossfade state
        this.crossfading = false;
        this.crossfadeProgress = 0;
        this.crossfadeFrames = Math.ceil(this.crossfadeDurationMs / FRAME_DURATION_MS);

        // Statistics
        this.stats = {
            framesEmitted: 0,
            placeholderFrames: 0,
            translatedFrames: 0,
            crossfadeFrames: 0,
            bufferUnderruns: 0,
            bufferOverruns: 0,
            averageLatency: 0
        };

        // Comfort noise generator state (for pink noise)
        this.noiseState = {
            b0: 0, b1: 0, b2: 0, b3: 0, b4: 0, b5: 0, b6: 0
        };
    }

    /**
     * Generate shaped silence (comfort noise)
     */
    generateComfortNoise() {
        const frame = Buffer.alloc(FRAME_SIZE);

        // Generate pink noise using Paul Kellet's algorithm
        for (let i = 0; i < FRAME_SIZE; i += 2) {
            const white = (Math.random() * 2 - 1) * 32767;

            this.noiseState.b0 = 0.99886 * this.noiseState.b0 + white * 0.0555179;
            this.noiseState.b1 = 0.99332 * this.noiseState.b1 + white * 0.0750759;
            this.noiseState.b2 = 0.96900 * this.noiseState.b2 + white * 0.1538520;
            this.noiseState.b3 = 0.86650 * this.noiseState.b3 + white * 0.3104856;
            this.noiseState.b4 = 0.55000 * this.noiseState.b4 + white * 0.5329522;
            this.noiseState.b5 = -0.7616 * this.noiseState.b5 - white * 0.0168980;

            const pink = this.noiseState.b0 + this.noiseState.b1 + this.noiseState.b2 +
                        this.noiseState.b3 + this.noiseState.b4 + this.noiseState.b5 +
                        this.noiseState.b6 + white * 0.5362;

            this.noiseState.b6 = white * 0.115926;

            // Scale down to -6dB (quieter background)
            const sample = Math.round(pink * 0.5);
            frame.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i);
        }

        return frame;
    }

    /**
     * Generate silence frame
     */
    generateSilence() {
        return Buffer.alloc(FRAME_SIZE, 0);
    }

    /**
     * Generate placeholder frame
     */
    generatePlaceholder() {
        if (this.placeholderType === 'comfort_noise') {
            return this.generateComfortNoise();
        }
        return this.generateSilence();
    }

    /**
     * Crossfade between two frames
     */
    crossfade(frameA, frameB, progress) {
        if (progress <= 0) return frameA;
        if (progress >= 1) return frameB;

        const result = Buffer.alloc(FRAME_SIZE);

        for (let i = 0; i < FRAME_SIZE; i += 2) {
            const sampleA = frameA.readInt16LE(i);
            const sampleB = frameB.readInt16LE(i);

            // Linear crossfade
            const mixed = Math.round(sampleA * (1 - progress) + sampleB * progress);

            result.writeInt16LE(Math.max(-32768, Math.min(32767, mixed)), i);
        }

        return result;
    }

    /**
     * Get next output frame
     */
    getNextFrame() {
        // Check if we have translated audio in queue
        const translatedFrame = this.playbackQueue.pop();

        if (translatedFrame) {
            // We have translated audio
            this.stats.translatedFrames++;

            if (this.crossfading) {
                // Continue crossfade
                const placeholder = this.generatePlaceholder();
                this.crossfadeProgress += 1 / this.crossfadeFrames;

                if (this.crossfadeProgress >= 1) {
                    // Crossfade complete
                    this.crossfading = false;
                    this.crossfadeProgress = 0;
                    return translatedFrame;
                }

                this.stats.crossfadeFrames++;
                return this.crossfade(placeholder, translatedFrame, this.crossfadeProgress);
            }

            return translatedFrame;
        } else {
            // No translated audio - emit placeholder
            this.stats.placeholderFrames++;
            this.stats.bufferUnderruns++;

            // Start crossfade when next translated audio arrives
            this.crossfading = false;
            this.crossfadeProgress = 0;

            return this.generatePlaceholder();
        }
    }

    /**
     * Add translated frame to playback queue
     */
    addFrame(frame) {
        if (this.playbackQueue.isFull()) {
            this.stats.bufferOverruns++;
        }

        this.playbackQueue.push(frame);

        // Start crossfade if we were playing placeholders
        if (this.stats.placeholderFrames > 0 && !this.crossfading) {
            this.crossfading = true;
            this.crossfadeProgress = 0;
        }
    }

    /**
     * Main output loop - runs at 20ms intervals
     */
    async *outputFrames() {
        this.running = true;
        this.clock.reset();

        console.log(`[PacingGovernor] Starting output loop (${FRAME_DURATION_MS}ms cadence)`);

        while (this.running) {
            if (!this.paused) {
                // Get next frame (placeholder or translated)
                const frame = this.getNextFrame();

                // Write to Asterisk
                if (this.frameCollector && this.frameCollector.connected) {
                    this.frameCollector.writeFrame(frame);
                }

                this.stats.framesEmitted++;

                // Yield frame for monitoring/debugging
                yield {
                    frame,
                    tick: this.clock.tickCount,
                    queueDepth: this.playbackQueue.getCount(),
                    isPlaceholder: !this.playbackQueue.peek()
                };
            }

            // Sleep until next 20ms tick
            await this.clock.sleepNextTick();
        }

        console.log(`[PacingGovernor] Output loop stopped`);
    }

    /**
     * Start the governor
     */
    async start() {
        if (this.running) {
            console.warn('[PacingGovernor] Already running');
            return;
        }

        console.log('[PacingGovernor] Starting...');

        // Start output loop
        const outputIterator = this.outputFrames();

        // Process frames continuously
        (async () => {
            for await (const frameInfo of outputIterator) {
                this.emit('frameOutput', frameInfo);
            }
        })().catch(err => {
            console.error('[PacingGovernor] Error in output loop:', err);
            this.emit('error', err);
        });

        this.emit('started');
    }

    /**
     * Stop the governor
     */
    stop() {
        console.log('[PacingGovernor] Stopping...');
        this.running = false;
        this.emit('stopped');
    }

    /**
     * Pause output (still maintains timing)
     */
    pause() {
        this.paused = true;
        this.emit('paused');
    }

    /**
     * Resume output
     */
    resume() {
        this.paused = false;
        this.emit('resumed');
    }

    /**
     * Get statistics
     */
    getStats() {
        const clockStats = this.clock.getStats();

        return {
            ...this.stats,
            clockAccuracy: clockStats.accuracy,
            clockTicks: clockStats.ticks,
            clockDrift: clockStats.driftCorrection,
            queueDepth: this.playbackQueue.getCount(),
            queueSize: this.playbackBufferSize,
            queueUsage: ((this.playbackQueue.getCount() / this.playbackBufferSize) * 100).toFixed(1) + '%',
            placeholderRatio: (this.stats.placeholderFrames / this.stats.framesEmitted * 100).toFixed(1) + '%',
            translatedRatio: (this.stats.translatedFrames / this.stats.framesEmitted * 100).toFixed(1) + '%'
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            framesEmitted: 0,
            placeholderFrames: 0,
            translatedFrames: 0,
            crossfadeFrames: 0,
            bufferUnderruns: 0,
            bufferOverruns: 0,
            averageLatency: 0
        };
    }
}

module.exports = {
    PacingGovernor,
    TwentyMsClock,
    PlaybackQueue,
    FRAME_DURATION_MS
};
