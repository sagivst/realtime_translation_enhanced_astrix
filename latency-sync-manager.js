/**
 * Latency & Synchronization Manager Service
 */

const EventEmitter = require("events");

class LatencySyncManager extends EventEmitter {
  constructor(io, ariClient) {
    super();
    this.io = io;
    this.ariClient = ariClient;
    this.channels = new Map();
    this.syncState = {
      activeChannels: [],
      maxLatency: 0,
      minLatency: 0,
      delta: 0,
      lastSyncTime: null,
      syncCount: 0
    };
    this.syncInterval = null;
    this.config = {
      syncIntervalMs: 500,
      adjustmentThreshold: 20,
      baseBuffer: 100,
      safetyMargin: 50,
      historySize: 20
    };
  }

  start() {
    console.log("[Sync] Starting Latency & Sync Manager");
    this.startSyncLoop();
    console.log("[Sync] Manager started successfully");
  }

  stop() {
    console.log("[Sync] Stopping Latency & Sync Manager");
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log("[Sync] Manager stopped");
  }

  onASRComplete(data) {
    const { extension, latency } = data;
    if (!extension || !latency) return;
    console.log(`[Timing] ASR complete for ${extension}: ${latency}ms`);
    this.recordLatency(extension, "asr", latency);
  }

  onMTComplete(data) {
    const { extension, time } = data;
    if (!extension || !time) return;
    console.log(`[Timing] MT complete for ${extension}: ${time}ms`);
    this.recordLatency(extension, "mt", time);
  }

  onTTSComplete(data) {
    const { extension, latency } = data;
    if (!extension || !latency) return;
    console.log(`[Timing] TTS complete for ${extension}: ${latency}ms`);
    this.recordLatency(extension, "tts", latency);
  }

  onHumeComplete(data) {
    const { extension, latency } = data;
    if (!extension || !latency) return;
    console.log(`[Timing] Hume complete for ${extension}: ${latency}ms`);
    this.recordLatency(extension, "hume", latency);
  }

  recordLatency(extension, stage, latency) {
    const channel = this.getOrCreateChannel(extension);
    const stageData = channel.latencies[stage];

    stageData.current = latency;
    stageData.lastUpdate = Date.now();

    stageData.history.push(latency);
    if (stageData.history.length > this.config.historySize) {
      stageData.history.shift();
    }

    this.calculateStatistics(stageData);
    stageData.trend = this.calculateTrend(stageData.history);

    if (stage !== "e2e") {
      this.calculateE2ELatency(channel);
    }

    this.emitChannelUpdate(channel);
  }

  calculateStatistics(stageData) {
    const { history } = stageData;
    stageData.avg = Math.round(
      history.reduce((a, b) => a + b, 0) / history.length
    );
    stageData.min = Math.min(...history);
    stageData.max = Math.max(...history);

    const sorted = [...history].sort((a, b) => a - b);
    stageData.p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    stageData.p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    stageData.p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
  }

  calculateE2ELatency(channel) {
    const { asr, mt, tts, hume } = channel.latencies;
    // Sequential pipeline: ASR → MT → TTS
    const sequentialLatency = (asr.current || 0) + (mt.current || 0) + (tts.current || 0);
    // Parallel: Hume runs alongside, but if it's slower, it becomes the bottleneck
    const humeLatency = hume.current || 0;
    // E2E is the maximum of sequential and parallel paths
    const e2e = Math.max(sequentialLatency, humeLatency);

    if (e2e > 0) {
      this.recordLatency(channel.extension, "e2e", e2e);
    }
  }

  calculateTrend(history) {
    if (history.length < 10) return "stable";
    const recent = history.slice(-5);
    const older = history.slice(-10, -5);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    if (change > 10) return "increasing";
    if (change < -10) return "decreasing";
    return "stable";
  }

  startSyncLoop() {
    console.log(`[Sync] Starting sync loop (${this.config.syncIntervalMs}ms interval)`);
    this.syncInterval = setInterval(() => {
      this.synchronizeChannels();
    }, this.config.syncIntervalMs);
  }

  synchronizeChannels() {
    const activeChannels = Array.from(this.channels.values())
      .filter(ch => ch.latencies.e2e.current > 0);

    if (activeChannels.length < 2) return;

    const maxLatency = Math.max(
      ...activeChannels.map(ch => ch.latencies.e2e.current)
    );

    const slowestChannel = activeChannels.find(
      ch => ch.latencies.e2e.current === maxLatency
    );

    activeChannels.forEach(channel => {
      const channelLatency = channel.latencies.e2e.current;
      const bufferNeeded = maxLatency - channelLatency;
      const targetBuffer = bufferNeeded + this.config.baseBuffer + this.config.safetyMargin;

      channel.buffer.target = targetBuffer;
      channel.buffer.adjustment = targetBuffer - channel.buffer.current;
      channel.buffer.reason = `sync_to_${slowestChannel.extension}`;

      if (Math.abs(channel.buffer.adjustment) > this.config.adjustmentThreshold) {
        this.applyBufferAdjustment(channel);
      }
    });

    this.syncState.maxLatency = maxLatency;
    this.syncState.activeChannels = activeChannels.map(ch => ch.extension);
    this.syncState.lastSyncTime = Date.now();
    this.syncState.syncCount++;
  }

  async applyBufferAdjustment(channel) {
    const { extension, buffer, uuid } = channel;
    console.log(`[ConfBridge] Adjusting buffer for ${extension} to ${buffer.target}ms`);

    try {
      if (this.ariClient && uuid) {
        await this.ariClient.channels.setChannelVar({
          channelId: uuid,
          variable: "JITTERBUFFER",
          value: `${buffer.target},${buffer.target},120`
        });
        console.log(`[ConfBridge] ✅ Buffer adjusted for ${extension}`);
      }

      channel.buffer.current = buffer.target;
      channel.buffer.lastUpdate = Date.now();
      channel.buffer.adjustmentCount = (channel.buffer.adjustmentCount || 0) + 1;
      channel.stats.syncAdjustments++;

      this.emitChannelUpdate(channel);
    } catch (error) {
      console.error(`[ConfBridge] ❌ Failed to adjust buffer for ${extension}:`, error.message);
    }
  }

  emitChannelUpdate(channel) {
    console.log(`[Sync] Emitting latencyUpdate for ext ${channel.extension}:`, {
      asr: channel.latencies.asr.current,
      mt: channel.latencies.mt.current,
      e2e: channel.latencies.e2e.current
    });

    this.io.emit("latencyUpdate", {
      extension: channel.extension,
      latencies: channel.latencies,
      buffer: channel.buffer,
      stats: channel.stats,
      timestamps: channel.timestamps
    });

    this.emit("channelUpdate", channel);
  }

  getOrCreateChannel(extension) {
    if (!this.channels.has(extension)) {
      this.channels.set(extension, {
        extension,
        uuid: null,
        latencies: {
          asr: this.createLatencyObject(),
          mt: this.createLatencyObject(),
          tts: this.createLatencyObject(),
          hume: this.createLatencyObject(),
          e2e: this.createLatencyObject()
        },
        buffer: {
          current: this.config.baseBuffer,
          target: this.config.baseBuffer,
          adjustment: 0,
          lastUpdate: null,
          adjustmentCount: 0,
          reason: "initial"
        },
        timestamps: {},
        stats: {
          utteranceCount: 0,
          totalAudioProcessed: 0,
          avgUtteranceLatency: 0,
          syncAdjustments: 0,
          errors: { asr: 0, mt: 0, tts: 0, hume: 0 }
        }
      });
    }
    return this.channels.get(extension);
  }

  createLatencyObject() {
    return {
      current: 0,
      avg: 0,
      min: 0,
      max: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      trend: "stable",
      history: [],
      lastUpdate: null
    };
  }

  setupAPI(app) {
    app.get("/api/latency/:extension", (req, res) => {
      const channel = this.channels.get(req.params.extension);
      if (!channel) {
        return res.status(404).json({ error: "Channel not found" });
      }
      res.json(channel);
    });

    app.get("/api/latency", (req, res) => {
      const allChannels = Array.from(this.channels.values());
      res.json({ channels: allChannels, syncState: this.syncState });
    });

    app.get("/api/sync-state", (req, res) => {
      res.json(this.syncState);
    });
  }

  setupWebSocket(server) {
    const WebSocket = require("ws");
    const wss = new WebSocket.Server({ server, path: "/ws/latency" });

    wss.on("connection", (ws) => {
      console.log("[WS] Client connected to latency stream");

      ws.send(JSON.stringify({
        type: "snapshot",
        channels: Array.from(this.channels.values()),
        syncState: this.syncState
      }));

      const handler = (channel) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "update", channel }));
        }
      };

      this.on("channelUpdate", handler);

      ws.on("close", () => {
        console.log("[WS] Client disconnected from latency stream");
        this.off("channelUpdate", handler);
      });
    });

    console.log("[WS] WebSocket server ready at /ws/latency");
  }
}

module.exports = LatencySyncManager;
