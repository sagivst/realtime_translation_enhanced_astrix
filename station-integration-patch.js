/**
 * Station Integration Patch
 * Adds database integration to existing embedded stations
 * For STATION_3 (STTTTSserver before Deepgram) and STATION_9 (STTTTSserver before Gateway)
 */

const DatabaseIntegration = require('./database-integration-module');

// Initialize database integration
const dbIntegration = new DatabaseIntegration();

// Configuration for segment collection
const SEGMENT_DURATION_MS = 5000; // Collect 5-second segments
const METRICS_INTERVAL_MS = 100;  // Collect metrics every 100ms

class StationMonitor {
  constructor(stationId, stationName) {
    this.stationId = stationId;
    this.stationName = stationName;
    this.currentSegment = null;
    this.metricsBuffer = [];
    this.audioBuffer = [];
    this.segmentStartTime = null;
    this.callId = null;
    this.channelId = null;
  }

  /**
   * Start monitoring for a new call
   */
  startCall(externalCallId, extension) {
    this.callId = externalCallId;
    this.extension = extension;
    this.segmentStartTime = Date.now();
    this.currentSegment = {
      metrics: {},
      audioChunks: [],
      logs: []
    };

    // Start segment timer
    this.segmentTimer = setInterval(() => {
      this.flushSegment();
    }, SEGMENT_DURATION_MS);

    console.log(`📊 ${this.stationName} monitoring started for call ${externalCallId}`);
  }

  /**
   * Collect metrics for current segment
   */
  collectMetrics(metrics) {
    if (!this.currentSegment) return;

    // Aggregate metrics
    for (const [key, value] of Object.entries(metrics)) {
      if (!this.currentSegment.metrics[key]) {
        this.currentSegment.metrics[key] = {
          values: [],
          sum: 0,
          count: 0
        };
      }
      this.currentSegment.metrics[key].values.push(value);
      this.currentSegment.metrics[key].sum += value;
      this.currentSegment.metrics[key].count++;
    }
  }

  /**
   * Collect audio chunk
   */
  collectAudioChunk(pcmBuffer) {
    if (!this.currentSegment) return;
    this.currentSegment.audioChunks.push(pcmBuffer);
  }

  /**
   * Add log entry
   */
  addLog(event, data) {
    if (!this.currentSegment) return;
    this.currentSegment.logs.push({
      timestamp: new Date().toISOString(),
      event: event,
      data: data
    });
  }

  /**
   * Flush current segment to database
   */
  async flushSegment() {
    if (!this.currentSegment || !this.callId) return;

    try {
      const endTime = Date.now();

      // Calculate average metrics
      const avgMetrics = {};
      for (const [key, data] of Object.entries(this.currentSegment.metrics)) {
        avgMetrics[key] = {
          avg: data.sum / data.count,
          min: Math.min(...data.values),
          max: Math.max(...data.values),
          count: data.count
        };
      }

      // Combine audio chunks
      const totalLength = this.currentSegment.audioChunks.reduce(
        (sum, chunk) => sum + chunk.length, 0
      );
      const combinedAudio = Buffer.concat(
        this.currentSegment.audioChunks,
        totalLength
      );

      // Prepare snapshot
      const snapshot = {
        schema_version: '1.0.0',
        call_id: this.callId,
        channel: this.extension === '3333' ? 'caller' : 'callee',
        segment: {
          start_ms: this.segmentStartTime,
          end_ms: endTime
        },
        station: {
          id: this.stationId,
          software_version: '2.0.0'
        },
        metrics: this.formatMetricsForStation(avgMetrics),
        logs: this.currentSegment.logs,
        audio: {
          pcm_buffer: combinedAudio,
          sample_rate: 16000,
          format: 'pcm_s16le',
          duration_ms: endTime - this.segmentStartTime
        },
        constraints: this.getStationConstraints(),
        targets: this.getOptimizationTargets()
      };

      // Send to database
      const result = await dbIntegration.ingestStationSnapshot(snapshot);

      if (result.success) {
        console.log(`✅ ${this.stationName} segment sent: ${result.snapshot_id}`);
      } else {
        console.error(`❌ ${this.stationName} segment failed:`, result.error);
      }

      // Reset for next segment
      this.segmentStartTime = endTime;
      this.currentSegment = {
        metrics: {},
        audioChunks: [],
        logs: []
      };

    } catch (error) {
      console.error(`Error flushing segment for ${this.stationName}:`, error);
    }
  }

  /**
   * Format metrics based on station type
   */
  formatMetricsForStation(rawMetrics) {
    if (this.stationId === 'STATION_3') {
      // STTTTSserver before Deepgram
      return {
        snr_db: rawMetrics.snr?.avg || 0,
        noise_floor_db: rawMetrics.noiseFloor?.avg || -60,
        speech_activity_pct: rawMetrics.speechActivity?.avg || 0,
        rms_dbfs: rawMetrics.rms?.avg || -20,
        peak_dbfs: rawMetrics.peak?.max || -3,
        buffer_usage_pct: rawMetrics.bufferUsage?.avg || 0,
        chunk_rate_hz: rawMetrics.chunkRate?.avg || 10,
        vad_confidence: rawMetrics.vadConfidence?.avg || 0,
        preprocessing_latency_ms: rawMetrics.preprocessingLatency?.avg || 0
      };
    } else if (this.stationId === 'STATION_9') {
      // STTTTSserver TTS output
      return {
        tts_latency_ms: rawMetrics.ttsLatency?.avg || 0,
        output_rms_dbfs: rawMetrics.outputRms?.avg || -16,
        output_peak_dbfs: rawMetrics.outputPeak?.max || -3,
        synthesis_quality: rawMetrics.synthesisQuality?.avg || 0,
        prosody_score: rawMetrics.prosodyScore?.avg || 0,
        buffer_underruns: rawMetrics.bufferUnderruns?.sum || 0,
        output_sample_rate: 16000,
        bitrate_kbps: rawMetrics.bitrate?.avg || 256
      };
    }
    return rawMetrics;
  }

  /**
   * Get station-specific constraints
   */
  getStationConstraints() {
    if (this.stationId === 'STATION_3') {
      return {
        max_latency_ms: 100,
        min_snr_db: 20,
        max_noise_floor_db: -50,
        min_speech_activity_pct: 10,
        allow_aggressive_changes: true
      };
    } else if (this.stationId === 'STATION_9') {
      return {
        max_latency_ms: 150,
        min_quality_score: 0.85,
        max_buffer_underruns: 5,
        allow_aggressive_changes: false
      };
    }
    return {};
  }

  /**
   * Get optimization targets
   */
  getOptimizationTargets() {
    if (this.stationId === 'STATION_3') {
      return {
        goal: 'maximize_stt_accuracy',
        weights: {
          clarity: 0.5,
          noise_reduction: 0.3,
          latency: 0.2
        }
      };
    } else if (this.stationId === 'STATION_9') {
      return {
        goal: 'maximize_tts_quality',
        weights: {
          naturalness: 0.4,
          prosody: 0.3,
          latency: 0.2,
          intelligibility: 0.1
        }
      };
    }
    return {};
  }

  /**
   * End monitoring for current call
   */
  endCall() {
    if (this.segmentTimer) {
      clearInterval(this.segmentTimer);
      this.segmentTimer = null;
    }

    // Flush final segment
    this.flushSegment();

    console.log(`📊 ${this.stationName} monitoring ended for call ${this.callId}`);

    this.callId = null;
    this.currentSegment = null;
    this.segmentStartTime = null;
  }
}

// Create station monitors
const station3Monitor = new StationMonitor('STATION_3', 'STTTTSserver->Deepgram');
const station9Monitor = new StationMonitor('STATION_9', 'STTTTSserver->Gateway');

/**
 * Integration points for STTTTSserver.js
 * Add these to your existing STTTTSserver.js file
 */

// In your processAudioChunk function (before sending to Deepgram):
function integrateStation3Monitoring(audioChunk, metrics) {
  station3Monitor.collectAudioChunk(audioChunk);
  station3Monitor.collectMetrics({
    snr: calculateSNR(audioChunk),
    noiseFloor: calculateNoiseFloor(audioChunk),
    speechActivity: detectSpeechActivity(audioChunk),
    rms: calculateRMS(audioChunk),
    peak: calculatePeak(audioChunk),
    bufferUsage: getBufferUsage(),
    chunkRate: getChunkRate(),
    vadConfidence: getVADConfidence(),
    preprocessingLatency: getPreprocessingLatency()
  });
}

// In your TTS output function (before sending to Gateway):
function integrateStation9Monitoring(audioChunk, metrics) {
  station9Monitor.collectAudioChunk(audioChunk);
  station9Monitor.collectMetrics({
    ttsLatency: getTTSLatency(),
    outputRms: calculateRMS(audioChunk),
    outputPeak: calculatePeak(audioChunk),
    synthesisQuality: getSynthesisQuality(),
    prosodyScore: getProsodyScore(),
    bufferUnderruns: getBufferUnderruns(),
    bitrate: calculateBitrate()
  });
}

// In your call start handler:
function onCallStart(callId, extension) {
  station3Monitor.startCall(callId, extension);
  station9Monitor.startCall(callId, extension);
}

// In your call end handler:
function onCallEnd() {
  station3Monitor.endCall();
  station9Monitor.endCall();
}

// Helper functions (implement based on your audio processing)
function calculateSNR(audioBuffer) {
  // Implement SNR calculation
  return 25.0; // Placeholder
}

function calculateNoiseFloor(audioBuffer) {
  // Implement noise floor calculation
  return -60.0; // Placeholder
}

function detectSpeechActivity(audioBuffer) {
  // Implement VAD
  return 80.0; // Placeholder percentage
}

function calculateRMS(audioBuffer) {
  let sum = 0;
  for (let i = 0; i < audioBuffer.length; i += 2) {
    const sample = audioBuffer.readInt16LE(i) / 32768.0;
    sum += sample * sample;
  }
  const rms = Math.sqrt(sum / (audioBuffer.length / 2));
  return 20 * Math.log10(rms + 1e-10); // Convert to dBFS
}

function calculatePeak(audioBuffer) {
  let peak = 0;
  for (let i = 0; i < audioBuffer.length; i += 2) {
    const sample = Math.abs(audioBuffer.readInt16LE(i) / 32768.0);
    if (sample > peak) peak = sample;
  }
  return 20 * Math.log10(peak + 1e-10); // Convert to dBFS
}

// Export for use in STTTTSserver
module.exports = {
  station3Monitor,
  station9Monitor,
  integrateStation3Monitoring,
  integrateStation9Monitoring,
  onCallStart,
  onCallEnd
};

/**
 * INSTALLATION INSTRUCTIONS:
 *
 * 1. Install required packages:
 *    npm install pg uuid aws-sdk
 *
 * 2. Set up PostgreSQL database using database-implementation.sql
 *
 * 3. Configure environment variables:
 *    DB_HOST=your-db-host
 *    DB_NAME=audio_optimization
 *    DB_USER=audio_app
 *    DB_PASSWORD=SecurePass2025!
 *    AWS_ACCESS_KEY_ID=your-key
 *    AWS_SECRET_ACCESS_KEY=your-secret
 *    S3_BUCKET=audio-optimization-pcm
 *
 * 4. In STTTTSserver.js, add:
 *    const stationIntegration = require('./station-integration-patch');
 *
 * 5. Add monitoring calls in appropriate places:
 *    - Before Deepgram: stationIntegration.integrateStation3Monitoring(chunk, metrics)
 *    - Before Gateway: stationIntegration.integrateStation9Monitoring(chunk, metrics)
 *    - On call start: stationIntegration.onCallStart(callId, extension)
 *    - On call end: stationIntegration.onCallEnd()
 */