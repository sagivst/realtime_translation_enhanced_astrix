/**
 * Frame Collector - 20ms PCM Frame Processing
 *
 * Handles bidirectional audio streaming with Asterisk via named pipes:
 * - Reads 640-byte frames (20ms @ 16kHz, s16le) from Asterisk
 * - Stamps frames with sequence numbers and timestamps
 * - Buffers and reorders frames if needed
 * - Writes translated frames back to Asterisk
 *
 * Based on HAsterisk_HumeEVI_Spec.md specifications
 */

const fs = require('fs');
const { EventEmitter } = require('events');

const FRAME_SIZE = 640;        // 640 bytes = 320 samples * 2 bytes
const SAMPLE_RATE = 16000;     // 16kHz
const FRAME_DURATION_MS = 20;  // 20ms per frame
const BUFFER_FRAMES = 8;       // 160ms buffer (6-8 frames recommended)
const PIPE_BASE_PATH = '/tmp/asterisk_media';

/**
 * Ring buffer for frame buffering
 */
class RingBuffer {
    constructor(size) {
        this.size = size;
        this.buffer = new Array(size);
        this.readIndex = 0;
        this.writeIndex = 0;
        this.count = 0;
    }

    push(item) {
        this.buffer[this.writeIndex] = item;
        this.writeIndex = (this.writeIndex + 1) % this.size;

        if (this.count < this.size) {
            this.count++;
        } else {
            // Buffer full, overwrite oldest
            this.readIndex = (this.readIndex + 1) % this.size;
        }
    }

    pop() {
        if (this.count === 0) {
            return null;
        }

        const item = this.buffer[this.readIndex];
        this.readIndex = (this.readIndex + 1) % this.size;
        this.count--;

        return item;
    }

    peek() {
        if (this.count === 0) {
            return null;
        }
        return this.buffer[this.readIndex];
    }

    isEmpty() {
        return this.count === 0;
    }

    isFull() {
        return this.count === this.size;
    }

    getCount() {
        return this.count;
    }

    clear() {
        this.readIndex = 0;
        this.writeIndex = 0;
        this.count = 0;
    }
}

/**
 * Frame Collector - Manages audio streaming with Asterisk
 */
class FrameCollector extends EventEmitter {
    constructor(channelId, options = {}) {
        super();

        this.channelId = channelId;
        this.pipeBasePath = options.pipeBasePath || PIPE_BASE_PATH;

        // Pipe paths
        this.readPipePath = `${this.pipeBasePath}/${channelId}_from_asterisk.pcm`;
        this.writePipePath = `${this.pipeBasePath}/${channelId}_to_asterisk.pcm`;

        // Streams
        this.readStream = null;
        this.writeStream = null;

        // Frame tracking
        this.frameSeqNum = 0;
        this.lastFrameTime = 0;
        this.startTime = Date.now();

        // Buffers
        this.inputBuffer = new RingBuffer(BUFFER_FRAMES);
        this.outputBuffer = new RingBuffer(BUFFER_FRAMES);

        // Statistics
        this.stats = {
            framesRead: 0,
            framesWritten: 0,
            framesDropped: 0,
            framesReordered: 0,
            totalBytesRead: 0,
            totalBytesWritten: 0,
            averageLatency: 0
        };

        // State
        this.connected = false;
        this.closing = false;

        // Partial frame buffer
        this.partialFrame = Buffer.alloc(0);
    }

    /**
     * Wait for named pipes to be created by Asterisk
     */
    async waitForPipes(timeoutMs = 10000) {
        const startTime = Date.now();
        const checkInterval = 100; // Check every 100ms

        while (Date.now() - startTime < timeoutMs) {
            if (fs.existsSync(this.readPipePath) && fs.existsSync(this.writePipePath)) {
                console.log(`[FrameCollector:${this.channelId}] Pipes found`);
                return true;
            }

            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }

        throw new Error(`Pipes not created within ${timeoutMs}ms timeout`);
    }

    /**
     * Connect to Asterisk pipes
     */
    async connect() {
        console.log(`[FrameCollector:${this.channelId}] Connecting to pipes...`);
        console.log(`  Read:  ${this.readPipePath}`);
        console.log(`  Write: ${this.writePipePath}`);

        // Wait for pipes to exist
        await this.waitForPipes();

        // Open read stream (from Asterisk)
        this.readStream = fs.createReadStream(this.readPipePath, {
            highWaterMark: FRAME_SIZE,
            flags: 'r'
        });

        // Open write stream (to Asterisk)
        this.writeStream = fs.createWriteStream(this.writePipePath, {
            flags: 'w'
        });

        // Set up event handlers
        this.readStream.on('data', (chunk) => this.handleIncomingData(chunk));
        this.readStream.on('error', (err) => this.handleError('read', err));
        this.readStream.on('end', () => this.handleStreamEnd('read'));

        this.writeStream.on('error', (err) => this.handleError('write', err));
        this.writeStream.on('finish', () => this.handleStreamEnd('write'));

        this.connected = true;
        this.startTime = Date.now();

        console.log(`[FrameCollector:${this.channelId}] ✓ Connected successfully`);
        this.emit('connected');
    }

    /**
     * Handle incoming audio data from Asterisk
     */
    handleIncomingData(chunk) {
        if (this.closing) return;

        // Combine with any partial frame from previous read
        const data = Buffer.concat([this.partialFrame, chunk]);
        const dataLen = data.length;

        // Process complete frames (640 bytes each)
        let offset = 0;
        while (offset + FRAME_SIZE <= dataLen) {
            const frameData = data.slice(offset, offset + FRAME_SIZE);
            this.processFrame(frameData);
            offset += FRAME_SIZE;
        }

        // Save any remaining partial frame
        if (offset < dataLen) {
            this.partialFrame = data.slice(offset);
        } else {
            this.partialFrame = Buffer.alloc(0);
        }
    }

    /**
     * Process a complete 20ms frame
     */
    processFrame(frameData) {
        const timestamp = Date.now();
        const seqNum = this.frameSeqNum++;

        // Create stamped frame
        const frame = {
            seqNum,
            timestamp,
            data: frameData,
            size: FRAME_SIZE,
            durationMs: FRAME_DURATION_MS
        };

        // Update statistics
        this.stats.framesRead++;
        this.stats.totalBytesRead += FRAME_SIZE;
        this.lastFrameTime = timestamp;

        // Add to input buffer
        if (this.inputBuffer.isFull()) {
            this.stats.framesDropped++;
            console.warn(`[FrameCollector:${this.channelId}] ⚠ Input buffer full, dropping frame ${seqNum}`);
        } else {
            this.inputBuffer.push(frame);
        }

        // Emit frame for processing
        this.emit('frame', frame);
    }

    /**
     * Write audio frame to Asterisk
     */
    writeFrame(frameData) {
        if (!this.connected || this.closing || !this.writeStream) {
            return false;
        }

        // Validate frame size
        if (frameData.length !== FRAME_SIZE) {
            console.warn(`[FrameCollector:${this.channelId}] ⚠ Invalid frame size: ${frameData.length} bytes (expected ${FRAME_SIZE})`);
            return false;
        }

        try {
            const success = this.writeStream.write(frameData);

            if (success) {
                this.stats.framesWritten++;
                this.stats.totalBytesWritten += FRAME_SIZE;
            }

            return success;
        } catch (err) {
            console.error(`[FrameCollector:${this.channelId}] Write error:`, err.message);
            return false;
        }
    }

    /**
     * Get next frame from input buffer
     */
    getNextFrame() {
        return this.inputBuffer.pop();
    }

    /**
     * Check if frames are available
     */
    hasFrames() {
        return !this.inputBuffer.isEmpty();
    }

    /**
     * Get buffer statistics
     */
    getBufferStats() {
        return {
            inputBufferCount: this.inputBuffer.getCount(),
            inputBufferSize: BUFFER_FRAMES,
            inputBufferUsage: (this.inputBuffer.getCount() / BUFFER_FRAMES * 100).toFixed(1) + '%',
            outputBufferCount: this.outputBuffer.getCount(),
            outputBufferSize: BUFFER_FRAMES,
            outputBufferUsage: (this.outputBuffer.getCount() / BUFFER_FRAMES * 100).toFixed(1) + '%'
        };
    }

    /**
     * Get statistics
     */
    getStats() {
        const uptimeMs = Date.now() - this.startTime;
        const uptimeSec = uptimeMs / 1000;

        return {
            ...this.stats,
            channelId: this.channelId,
            connected: this.connected,
            uptimeMs,
            uptimeSec: uptimeSec.toFixed(2),
            framesPerSecond: (this.stats.framesRead / uptimeSec).toFixed(2),
            dataRateKbps: ((this.stats.totalBytesRead * 8) / 1000 / uptimeSec).toFixed(2),
            ...this.getBufferStats()
        };
    }

    /**
     * Handle stream errors
     */
    handleError(streamType, error) {
        console.error(`[FrameCollector:${this.channelId}] ${streamType} stream error:`, error.message);
        this.emit('error', { streamType, error });

        if (!this.closing) {
            this.disconnect();
        }
    }

    /**
     * Handle stream end
     */
    handleStreamEnd(streamType) {
        console.log(`[FrameCollector:${this.channelId}] ${streamType} stream ended`);

        if (!this.closing) {
            this.disconnect();
        }
    }

    /**
     * Disconnect from pipes
     */
    disconnect() {
        if (this.closing) return;

        console.log(`[FrameCollector:${this.channelId}] Disconnecting...`);
        this.closing = true;
        this.connected = false;

        // Close streams
        if (this.readStream) {
            this.readStream.destroy();
            this.readStream = null;
        }

        if (this.writeStream) {
            this.writeStream.end();
            this.writeStream = null;
        }

        // Clear buffers
        this.inputBuffer.clear();
        this.outputBuffer.clear();

        console.log(`[FrameCollector:${this.channelId}] ✓ Disconnected`);
        this.emit('disconnected');
    }

    /**
     * Generate silence frame (for testing)
     */
    static generateSilence() {
        return Buffer.alloc(FRAME_SIZE, 0);
    }

    /**
     * Generate test tone (for testing)
     */
    static generateTestTone(frequency = 440, amplitude = 8000) {
        const samples = FRAME_SIZE / 2; // 320 samples
        const frame = Buffer.alloc(FRAME_SIZE);

        for (let i = 0; i < samples; i++) {
            const t = i / SAMPLE_RATE;
            const value = Math.sin(2 * Math.PI * frequency * t) * amplitude;
            frame.writeInt16LE(Math.round(value), i * 2);
        }

        return frame;
    }
}

/**
 * Frame Collector Manager - Manages multiple channels
 */
class FrameCollectorManager extends EventEmitter {
    constructor() {
        super();
        this.collectors = new Map();
    }

    /**
     * Create and connect collector for channel
     */
    async createCollector(channelId, options = {}) {
        if (this.collectors.has(channelId)) {
            throw new Error(`Collector already exists for channel: ${channelId}`);
        }

        const collector = new FrameCollector(channelId, options);

        // Forward events
        collector.on('frame', (frame) => this.emit('frame', channelId, frame));
        collector.on('error', (error) => this.emit('error', channelId, error));
        collector.on('disconnected', () => {
            this.collectors.delete(channelId);
            this.emit('collectorDisconnected', channelId);
        });

        await collector.connect();

        this.collectors.set(channelId, collector);
        this.emit('collectorConnected', channelId, collector);

        return collector;
    }

    /**
     * Get collector for channel
     */
    getCollector(channelId) {
        return this.collectors.get(channelId);
    }

    /**
     * Disconnect collector
     */
    disconnectCollector(channelId) {
        const collector = this.collectors.get(channelId);
        if (collector) {
            collector.disconnect();
        }
    }

    /**
     * Get all active collectors
     */
    getActiveCollectors() {
        return Array.from(this.collectors.values());
    }

    /**
     * Get statistics for all collectors
     */
    getAllStats() {
        const stats = {};
        for (const [channelId, collector] of this.collectors) {
            stats[channelId] = collector.getStats();
        }
        return stats;
    }

    /**
     * Disconnect all collectors
     */
    disconnectAll() {
        for (const collector of this.collectors.values()) {
            collector.disconnect();
        }
        this.collectors.clear();
    }
}

module.exports = {
    FrameCollector,
    FrameCollectorManager,
    FRAME_SIZE,
    SAMPLE_RATE,
    FRAME_DURATION_MS,
    PIPE_BASE_PATH
};
