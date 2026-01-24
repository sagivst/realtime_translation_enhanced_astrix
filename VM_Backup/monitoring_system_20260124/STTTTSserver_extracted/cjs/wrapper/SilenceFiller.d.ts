import { Readable } from "stream";
/**
 * SilenceFiller is a Readable stream that intersperses incoming audio data
 * with bytes of silence. This is important in some cases to keep an audio
 * stream "alive". Audio players, such as ffmpeg, can interpret inactivity as
 * meaning the stream is ended, or disconnected.
 *
 * @example
 * ```typescript
 * import { SilenceFiller } from 'hume';
 *
 * const BYTES_PER_SAMPLE = 2; // 16-bit samples
 * const SAMPLE_RATE = 48000;
 * const BUFFER_SIZE = Math.floor(SAMPLE_RATE * 0.1 * BYTES_PER_SAMPLE); // 100ms buffer
 * const silenceFiller = new SilenceFiller(BUFFER_SIZE, SAMPLE_RATE, BYTES_PER_SAMPLE, 10);
 *
 * // Pipe silence filler output to audio player stdin
 * silenceFiller.pipe(audioPlayer.stdin);
 *
 * // Handle pipe errors
 * silenceFiller.on('error', (err) => {
 *   console.error("SilenceFiller error:", err);
 * });
 *
 * // Write audio data as it arrives
 * silenceFiller.writeAudio(audioBuffer);
 *
 * // End the stream when done
 * await silenceFiller.endStream();
 * ```
 */
export declare class SilenceFiller extends Readable {
    private unclockedSilenceFiller;
    private isStarted;
    private pushInterval;
    private bytesPerSample;
    private pushIntervalMs;
    /**
     * Creates a new SilenceFiller instance.
     *
     * @param pushIntervalMs - The interval in milliseconds for pushing audio data (default: 5ms).
     * @param sampleRate - The sample rate of the audio (e.g., 48000).
     * @param bytesPerSample - The number of bytes per audio sample (e.g., 2 for 16-bit).
     * @param bufferSize - How much to 'prebuffer'. If you set this too low there
     * is a chance that playback will stutter, but if you set it too high
     * playback will take longer to start.
     */
    constructor(pushIntervalMs?: number, sampleRate?: number, bytesPerSample?: number, bufferSize?: number);
    /**
     * Writes audio data to the silence filler.
     *
     * @param audioBuffer - The audio buffer to write.
     */
    writeAudio(audioBuffer: Buffer): void;
    private startPushInterval;
    private pushData;
    _read(): void;
    _destroy(error: Error | null, callback: (error?: Error | null) => void): void;
    /**
     * Ends the stream and drains all remaining audio data.
     *
     * @returns A promise that resolves when the stream has ended.
     */
    endStream(): Promise<void>;
}
/**
 * Does the actual calculation of how interspersing audio with silence
 * is "pure" in the sense that it does not rely on the system clock.
 * It's up to the caller to provide timestamps.
 *
 * @internal
 */
export declare class UnclockedSilenceFiller {
    private audioQueue;
    private totalBufferedBytes;
    private startTimestamp;
    private totalBytesSent;
    donePrebuffering: boolean;
    private bufferSize;
    private sampleRate;
    private bytesPerSample;
    constructor(bufferSize: number, sampleRate: number, bytesPerSample: number);
    writeAudio(audioBuffer: Buffer, timestamp: number): void;
    readAudio(timestamp: number): Buffer | null;
}
