/**
 * WAV Recorder Module
 */

const fs = require('fs');
const path = require('path');

class WAVRecorder {
  constructor(recordingsDir = './recordings') {
    this.recordingsDir = recordingsDir;
    this.activeRecordings = new Map();
    this.maxDurationTimers = new Map();

    if (!fs.existsSync(this.recordingsDir)) {
      fs.mkdirSync(this.recordingsDir, { recursive: true });
    }

    console.log('[WAVRecorder] Initialized with recordings directory: ' + this.recordingsDir);
  }

  async startRecording(stationId, options = {}) {
    const {
      sampleRate = 16000,
      channels = 1,
      bitDepth = 16,
      maxDurationSec = 300,
      autoStop = true
    } = options;

    if (this.activeRecordings.has(stationId)) {
      console.warn('[WAVRecorder] ' + stationId + ' already has an active recording');
      return null;
    }

    const filename = this.generateFilename(stationId, sampleRate, channels);
    const filepath = path.join(this.recordingsDir, filename);

    const recording = {
      stationId,
      filepath,
      filename,
      sampleRate,
      channels,
      bitDepth,
      maxDurationSec,
      startTime: Date.now(),
      audioBuffers: [],
      totalSamples: 0,
      totalBytes: 0,
      isActive: true
    };

    this.activeRecordings.set(stationId, recording);

    console.log('[WAVRecorder] ' + stationId + ': Started recording to ' + filename);

    if (autoStop && maxDurationSec > 0) {
      const timer = setTimeout(() => {
        console.log('[WAVRecorder] ' + stationId + ': Auto-stopping after ' + maxDurationSec + 's');
        this.stopRecording(stationId);
      }, maxDurationSec * 1000);

      this.maxDurationTimers.set(stationId, timer);
    }

    return filepath;
  }

  async stopRecording(stationId) {
    const recording = this.activeRecordings.get(stationId);

    if (!recording) {
      console.warn('[WAVRecorder] No active recording for ' + stationId);
      return null;
    }

    recording.isActive = false;

    if (this.maxDurationTimers.has(stationId)) {
      clearTimeout(this.maxDurationTimers.get(stationId));
      this.maxDurationTimers.delete(stationId);
    }

    const durationMs = Date.now() - recording.startTime;
    const durationSec = durationMs / 1000;

    console.log('[WAVRecorder] ' + stationId + ': Stopping recording after ' + durationSec.toFixed(2) + 's');

    try {
      const audioData = Buffer.concat(recording.audioBuffers);

      await this.writeWAVFile(
        recording.filepath,
        audioData,
        recording.sampleRate,
        recording.channels,
        recording.bitDepth
      );

      const fileStats = fs.statSync(recording.filepath);
      console.log('[WAVRecorder] ' + stationId + ': Saved WAV file (' + fileStats.size + ' bytes)');

      this.activeRecordings.delete(stationId);

      return {
        filepath: recording.filepath,
        filename: recording.filename,
        durationSec,
        totalSamples: recording.totalSamples,
        totalBytes: recording.totalBytes,
        fileSize: fileStats.size,
        sampleRate: recording.sampleRate,
        channels: recording.channels,
        bitDepth: recording.bitDepth
      };

    } catch (error) {
      console.error('[WAVRecorder] ' + stationId + ': Error saving WAV file:', error);
      this.activeRecordings.delete(stationId);
      throw error;
    }
  }

  async writeAudio(stationId, audioData) {
    const recording = this.activeRecordings.get(stationId);

    if (!recording || !recording.isActive) {
      return;
    }

    recording.audioBuffers.push(Buffer.from(audioData));
    recording.totalBytes += audioData.length;
    recording.totalSamples += audioData.length / (recording.bitDepth / 8);

    const durationSec = (Date.now() - recording.startTime) / 1000;
    if (durationSec > recording.maxDurationSec && recording.maxDurationSec > 0) {
      console.warn('[WAVRecorder] ' + stationId + ': Max duration exceeded, auto-stopping');
      await this.stopRecording(stationId);
    }
  }

  async writeWAVFile(filepath, audioData, sampleRate, channels, bitDepth) {
    const bytesPerSample = bitDepth / 8;
    const blockAlign = channels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = audioData.length;
    const fileSize = 36 + dataSize;

    const header = Buffer.alloc(44);

    header.write('RIFF', 0);
    header.writeUInt32LE(fileSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitDepth, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(filepath);
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);
      writeStream.write(header);
      writeStream.write(audioData);
      writeStream.end();
    });
  }

  generateFilename(stationId, sampleRate, channels) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const channelStr = channels === 1 ? 'mono' : 'stereo';
    return stationId + '_' + timestamp + '_' + sampleRate + 'Hz_' + channelStr + '.wav';
  }

  isRecording(stationId) {
    return this.activeRecordings.has(stationId);
  }

  getStatus(stationId) {
    const recording = this.activeRecordings.get(stationId);

    if (!recording) {
      return null;
    }

    const durationMs = Date.now() - recording.startTime;
    const durationSec = durationMs / 1000;

    return {
      stationId: recording.stationId,
      filename: recording.filename,
      filepath: recording.filepath,
      isActive: recording.isActive,
      durationSec,
      totalSamples: recording.totalSamples,
      totalBytes: recording.totalBytes,
      sampleRate: recording.sampleRate,
      channels: recording.channels,
      bitDepth: recording.bitDepth,
      maxDurationSec: recording.maxDurationSec,
      remainingSec: recording.maxDurationSec - durationSec
    };
  }

  getActiveRecordings() {
    return Array.from(this.activeRecordings.keys()).map(stationId => 
      this.getStatus(stationId)
    );
  }

  listRecordings(stationId = null) {
    const files = fs.readdirSync(this.recordingsDir);
    
    let filteredFiles = files.filter(f => f.endsWith('.wav'));
    
    if (stationId) {
      filteredFiles = filteredFiles.filter(f => f.startsWith(stationId));
    }

    return filteredFiles.map(filename => {
      const filepath = path.join(this.recordingsDir, filename);
      const stats = fs.statSync(filepath);

      const sampleRateMatch = filename.match(/(\d+)Hz/);
      const channelMatch = filename.match(/(mono|stereo)/);

      return {
        filename,
        filepath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        sampleRate: sampleRateMatch ? parseInt(sampleRateMatch[1]) : null,
        channels: channelMatch ? (channelMatch[1] === 'mono' ? 1 : 2) : null
      };
    });
  }

  deleteRecording(filepath) {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log('[WAVRecorder] Deleted recording: ' + path.basename(filepath));
      return true;
    }
    return false;
  }

  async cleanOldRecordings(daysToKeep = 7) {
    const files = this.listRecordings();
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

    let deletedCount = 0;

    for (const file of files) {
      if (file.modified.getTime() < cutoffTime) {
        this.deleteRecording(file.filepath);
        deletedCount++;
      }
    }

    console.log('[WAVRecorder] Cleaned ' + deletedCount + ' old recordings (older than ' + daysToKeep + ' days)');
    return deletedCount;
  }

  async cleanup() {
    console.log('[WAVRecorder] Cleaning up ' + this.activeRecordings.size + ' active recordings');

    for (const stationId of this.activeRecordings.keys()) {
      await this.stopRecording(stationId);
    }

    for (const timer of this.maxDurationTimers.values()) {
      clearTimeout(timer);
    }
    this.maxDurationTimers.clear();
  }
}

module.exports = WAVRecorder;
