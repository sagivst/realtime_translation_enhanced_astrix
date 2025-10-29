/**
 * Latency Control Backend Handler (Testing Only)
 * Minimal implementation for testing the latency-control.html UI
 * Does NOT interfere with production code
 */

class LatencyControlBackend {
  constructor() {
    // In-memory storage for testing
    this.latencyConfig = {
      en: 0,
      he: 150,
      ja: 250,
      es: 100,
      fr: 100,
      de: 120
    };

    this.activeStreams = new Map();
    this.isRunning = true;
    this.metrics = {
      totalFramesIngested: 0,
      totalFramesReleased: 0,
      droppedFrames: 0,
      averageHoldTime: 0,
      maxHoldTime: 0,
      totalBufferedFrames: 0
    };
  }

  /**
   * Register Socket.IO handlers
   */
  registerSocketHandlers(io) {
    io.on('connection', (socket) => {
      console.log('[Latency Control] Client connected:', socket.id);

      // Handle latency configuration updates
      socket.on('qa-latency-config', (config) => {
        console.log('[Latency Control] Config updated:', config);
        this.latencyConfig = { ...this.latencyConfig, ...config };

        // Broadcast to all clients
        io.emit('qa-latency-config-updated', this.latencyConfig);
      });

      // Handle stream registration (testing)
      socket.on('test-register-stream', (data) => {
        const { languageCode, channelId, userId } = data;
        console.log(`[Latency Control] Registering test stream: ${languageCode}`);

        this.activeStreams.set(languageCode, {
          languageCode,
          channelId: channelId || `test-${languageCode}`,
          userId: userId || `user-${languageCode}`,
          registeredAt: Date.now(),
          frames: 0
        });

        // Start simulating frames for this stream
        this.simulateStreamFrames(languageCode, io);

        // Send updated status
        this.sendStatus(io);
      });

      // Handle stream unregistration
      socket.on('test-unregister-stream', (data) => {
        const { languageCode } = data;
        console.log(`[Latency Control] Unregistering test stream: ${languageCode}`);

        this.activeStreams.delete(languageCode);
        this.sendStatus(io);
      });

      // Handle status requests
      socket.on('get-syncbuffer-status', () => {
        this.sendStatus(socket);
      });

      // Send initial config
      socket.emit('qa-latency-config-updated', this.latencyConfig);
      this.sendStatus(socket);
    });
  }

  /**
   * Simulate frame processing for a stream
   */
  simulateStreamFrames(languageCode, io) {
    const stream = this.activeStreams.get(languageCode);
    if (!stream) return;

    // Simulate 50 frames per second (20ms per frame)
    const interval = setInterval(() => {
      const currentStream = this.activeStreams.get(languageCode);
      if (!currentStream) {
        clearInterval(interval);
        return;
      }

      // Increment frame count
      currentStream.frames++;
      this.metrics.totalFramesIngested++;
      this.metrics.totalBufferedFrames = Array.from(this.activeStreams.values())
        .reduce((sum, s) => sum + Math.min(s.frames, 10), 0);

      // Simulate some frames being released
      if (currentStream.frames % 5 === 0) {
        this.metrics.totalFramesReleased++;
        const latency = this.latencyConfig[languageCode] || 0;
        this.metrics.averageHoldTime = (this.metrics.averageHoldTime * 0.9) + (latency * 0.1);
        this.metrics.maxHoldTime = Math.max(this.metrics.maxHoldTime, latency);
      }

      // Send status update every 10 frames (~200ms)
      if (currentStream.frames % 10 === 0) {
        this.sendStatus(io);
      }
    }, 20); // 20ms = 50 fps

    // Store interval for cleanup
    stream.interval = interval;
  }

  /**
   * Send current status to client(s)
   */
  sendStatus(target) {
    // Calculate reference latency (max of all active streams)
    let refLatency = 0;
    if (this.activeStreams.size > 0) {
      refLatency = Math.max(...Array.from(this.activeStreams.keys())
        .map(lang => this.latencyConfig[lang] || 0));
    }

    const status = {
      isRunning: this.isRunning,
      refLatency,
      activeLanguages: this.activeStreams.size,
      languages: Array.from(this.activeStreams.entries()).map(([code, stream]) => ({
        code,
        bufferedFrames: Math.min(stream.frames, 250),
        bufferedMs: Math.min(stream.frames * 20, 5000),
        stats: {
          totalFrames: stream.frames,
          droppedFrames: 0,
          averageLatency: this.latencyConfig[code] || 0,
          currentHoldMs: this.latencyConfig[code] || 0
        },
        qaOverride: this.latencyConfig[code],
        metadata: {
          channelId: stream.channelId,
          userId: stream.userId,
          registeredAt: stream.registeredAt
        }
      })),
      pipelineLatencies: {},
      qaOverrides: this.latencyConfig,
      metrics: this.metrics,
      uptime: Date.now() - (this.startTime || Date.now())
    };

    target.emit('syncbuffer-status', status);
  }

  /**
   * Cleanup
   */
  shutdown() {
    console.log('[Latency Control] Shutting down...');

    // Clear all stream intervals
    for (const stream of this.activeStreams.values()) {
      if (stream.interval) {
        clearInterval(stream.interval);
      }
    }

    this.activeStreams.clear();
    this.isRunning = false;
  }
}

module.exports = LatencyControlBackend;
