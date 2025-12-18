/**
 * Log Stream Manager Module
 *
 * Manages LOG control functionality for all stations:
 * - ON/OFF toggle to save stream station data to log files
 * - Multiple log types: stream (raw data), metrics (stats), events (alerts)
 * - Multiple formats: JSON, text, CSV
 * - Log rotation: hourly, daily, size-based
 * - Per-station independent logging
 */

const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');

class LogStreamManager {
  constructor(logDir = './logs') {
    this.logDir = logDir;
    this.activeStreams = new Map(); // stationId -> { stream, metrics, events }
    this.rotationTimers = new Map();

    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    console.log(`[LogStreamManager] Initialized with log directory: ${this.logDir}`);
  }

  /**
   * Start logging for a station
   */
  async startStream(stationId, options = {}) {
    const {
      types = ['metrics'],           // What to log: 'stream', 'metrics', 'events', 'all'
      format = 'json',                // Output format: 'json', 'text', 'csv'
      rotation = 'daily',             // Rotation strategy: 'hourly', 'daily', 'size'
      maxSize = 100 * 1024 * 1024,   // Max file size for size-based rotation (100MB)
      compress = false                // Compress rotated logs
    } = options;

    if (this.activeStreams.has(stationId)) {
      console.warn(`[LogStreamManager] ${stationId} already has active streams`);
      return;
    }

    const streams = {};

    // Determine which log types to create
    const typesToLog = types.includes('all') 
      ? ['stream', 'metrics', 'events'] 
      : types;

    for (const type of typesToLog) {
      const filename = this.generateFilename(stationId, type, format);
      const filepath = path.join(this.logDir, filename);
      
      streams[type] = {
        filepath,
        format,
        writeStream: fs.createWriteStream(filepath, { flags: 'a' }),
        startTime: Date.now(),
        bytesWritten: 0,
        linesWritten: 0
      };

      console.log(`[LogStreamManager] ${stationId}: Started ${type} logging to ${filename}`);

      // Write header for CSV format
      if (format === 'csv' && type === 'metrics') {
        this.writeCSVHeader(streams[type].writeStream);
      }
    }

    this.activeStreams.set(stationId, streams);

    // Setup rotation if needed
    if (rotation === 'hourly' || rotation === 'daily') {
      this.setupTimeRotation(stationId, rotation);
    }

    return true;
  }

  /**
   * Stop logging for a station
   */
  async stopStream(stationId) {
    const streams = this.activeStreams.get(stationId);
    
    if (!streams) {
      console.warn(`[LogStreamManager] No active streams for ${stationId}`);
      return null;
    }

    const files = [];

    for (const [type, streamInfo] of Object.entries(streams)) {
      // Close write stream
      await new Promise((resolve) => {
        streamInfo.writeStream.end(() => {
          console.log(`[LogStreamManager] ${stationId}: Closed ${type} log (${streamInfo.linesWritten} lines, ${streamInfo.bytesWritten} bytes)`);
          files.push(streamInfo.filepath);
          resolve();
        });
      });
    }

    // Clear rotation timer
    if (this.rotationTimers.has(stationId)) {
      clearInterval(this.rotationTimers.get(stationId));
      this.rotationTimers.delete(stationId);
    }

    this.activeStreams.delete(stationId);
    return files;
  }

  /**
   * Log raw audio stream data
   */
  async logStream(stationId, audioData, metadata = {}) {
    const streams = this.activeStreams.get(stationId);
    
    if (!streams || !streams.stream) {
      return;
    }

    const streamInfo = streams.stream;
    const timestamp = new Date().toISOString();

    let logLine;

    switch (streamInfo.format) {
      case 'json':
        logLine = JSON.stringify({
          timestamp,
          stationId,
          type: 'stream',
          bytes: audioData.length,
          metadata,
          // Don't include actual audio data in logs (too large)
          dataPreview: audioData.slice(0, 16).toString('hex')
        }) + '\n';
        break;

      case 'text':
        logLine = `[${timestamp}] ${stationId} STREAM: ${audioData.length} bytes (${metadata.format || 'unknown'} format)\n`;
        break;

      case 'csv':
        logLine = `${timestamp},${stationId},stream,${audioData.length},${JSON.stringify(metadata)}\n`;
        break;
    }

    streamInfo.writeStream.write(logLine);
    streamInfo.bytesWritten += logLine.length;
    streamInfo.linesWritten++;
  }

  /**
   * Log metrics data
   */
  async logMetrics(stationId, metrics) {
    const streams = this.activeStreams.get(stationId);
    
    if (!streams || !streams.metrics) {
      return;
    }

    const streamInfo = streams.metrics;
    const timestamp = new Date().toISOString();

    let logLine;

    switch (streamInfo.format) {
      case 'json':
        logLine = JSON.stringify({
          timestamp,
          stationId,
          type: 'metrics',
          ...metrics
        }) + '\n';
        break;

      case 'text':
        logLine = `[${timestamp}] ${stationId} METRICS:\n`;
        logLine += `  Packets: recv=${metrics.packetsReceived} proc=${metrics.packetsProcessed} sent=${metrics.packetsSent} drop=${metrics.packetsDropped}\n`;
        logLine += `  Bytes: recv=${metrics.bytesReceived} proc=${metrics.bytesProcessed} sent=${metrics.bytesSent} drop=${metrics.bytesDropped}\n`;
        logLine += `  Buffer: fill=${metrics.bufferFillBytes}/${metrics.currentBytes} (${metrics.fillPercent?.toFixed(1)}%)\n`;
        logLine += `  Latency: avg=${metrics.avgLatencyMs?.toFixed(2)}ms jitter=${metrics.jitterMs?.toFixed(2)}ms\n`;
        break;

      case 'csv':
        logLine = `${timestamp},${stationId},metrics,${metrics.packetsReceived},${metrics.packetsProcessed},${metrics.packetsSent},${metrics.packetsDropped},${metrics.bytesReceived},${metrics.bytesProcessed},${metrics.bytesSent},${metrics.bytesDropped},${metrics.bufferFillBytes},${metrics.fillPercent?.toFixed(2)},${metrics.avgLatencyMs?.toFixed(2)},${metrics.jitterMs?.toFixed(2)}\n`;
        break;
    }

    streamInfo.writeStream.write(logLine);
    streamInfo.bytesWritten += logLine.length;
    streamInfo.linesWritten++;
  }

  /**
   * Log event data
   */
  async logEvent(stationId, event) {
    const streams = this.activeStreams.get(stationId);
    
    if (!streams || !streams.events) {
      return;
    }

    const streamInfo = streams.events;
    const timestamp = event.timestamp || new Date().toISOString();

    let logLine;

    switch (streamInfo.format) {
      case 'json':
        logLine = JSON.stringify({
          timestamp,
          stationId,
          type: 'event',
          ...event
        }) + '\n';
        break;

      case 'text':
        logLine = `[${timestamp}] ${stationId} [${event.level?.toUpperCase()}] ${event.eventType}`;
        if (Object.keys(event).length > 3) {
          logLine += `: ${JSON.stringify(event, null, 2)}`;
        }
        logLine += '\n';
        break;

      case 'csv':
        logLine = `${timestamp},${stationId},event,${event.level},${event.eventType},${JSON.stringify(event)}\n`;
        break;
    }

    streamInfo.writeStream.write(logLine);
    streamInfo.bytesWritten += logLine.length;
    streamInfo.linesWritten++;
  }

  /**
   * Generate filename for log file
   */
  generateFilename(stationId, type, format) {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const hourStr = date.getHours().toString().padStart(2, '0');
    
    const ext = format === 'csv' ? 'csv' : 'log';
    
    return `${stationId}_${type}_${dateStr}_${hourStr}00.${ext}`;
  }

  /**
   * Write CSV header
   */
  writeCSVHeader(writeStream) {
    const header = 'timestamp,stationId,type,packetsReceived,packetsProcessed,packetsSent,packetsDropped,bytesReceived,bytesProcessed,bytesSent,bytesDropped,bufferFillBytes,fillPercent,avgLatencyMs,jitterMs\n';
    writeStream.write(header);
  }

  /**
   * Setup time-based rotation
   */
  setupTimeRotation(stationId, rotation) {
    const intervalMs = rotation === 'hourly' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const timer = setInterval(async () => {
      console.log(`[LogStreamManager] ${stationId}: Rotating logs (${rotation})`);
      
      // Get current stream config
      const streams = this.activeStreams.get(stationId);
      if (!streams) {
        clearInterval(timer);
        return;
      }

      // Extract config from first stream
      const firstStream = Object.values(streams)[0];
      const options = {
        types: Object.keys(streams),
        format: firstStream.format,
        rotation
      };

      // Stop current streams
      await this.stopStream(stationId);

      // Start new streams with new filenames
      await this.startStream(stationId, options);

    }, intervalMs);

    this.rotationTimers.set(stationId, timer);
  }

  /**
   * Get statistics for a station
   */
  getStats(stationId) {
    const streams = this.activeStreams.get(stationId);
    
    if (!streams) {
      return null;
    }

    const stats = {
      stationId,
      isActive: true,
      streams: {}
    };

    for (const [type, streamInfo] of Object.entries(streams)) {
      stats.streams[type] = {
        filepath: streamInfo.filepath,
        format: streamInfo.format,
        bytesWritten: streamInfo.bytesWritten,
        linesWritten: streamInfo.linesWritten,
        uptimeMs: Date.now() - streamInfo.startTime
      };
    }

    return stats;
  }

  /**
   * Get all active stations
   */
  getActiveStations() {
    return Array.from(this.activeStreams.keys());
  }

  /**
   * List log files for a station
   */
  listLogFiles(stationId) {
    const files = fs.readdirSync(this.logDir);
    const stationFiles = files.filter(f => f.startsWith(stationId));
    
    return stationFiles.map(filename => {
      const filepath = path.join(this.logDir, filename);
      const stats = fs.statSync(filepath);
      
      return {
        filename,
        filepath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    });
  }

  /**
   * Clean old log files
   */
  async cleanOldLogs(stationId, daysToKeep = 7) {
    const files = this.listLogFiles(stationId);
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    let deletedCount = 0;
    
    for (const file of files) {
      if (file.modified.getTime() < cutoffTime) {
        fs.unlinkSync(file.filepath);
        console.log(`[LogStreamManager] Deleted old log: ${file.filename}`);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * Cleanup all streams
   */
  async cleanup() {
    console.log(`[LogStreamManager] Cleaning up ${this.activeStreams.size} active streams`);
    
    for (const stationId of this.activeStreams.keys()) {
      await this.stopStream(stationId);
    }

    // Clear all rotation timers
    for (const timer of this.rotationTimers.values()) {
      clearInterval(timer);
    }
    this.rotationTimers.clear();
  }
}

module.exports = LogStreamManager;
