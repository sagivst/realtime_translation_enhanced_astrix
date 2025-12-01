/**
 * Database Integration Module for AI-Driven Audio Optimization
 * Handles data ingestion from embedded stations to PostgreSQL
 * Compatible with OpenAI LLM recursive optimization
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'audio_optimization',
  user: process.env.DB_USER || 'audio_app',
  password: process.env.DB_PASSWORD || 'SecurePass2025!',
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// S3 configuration for audio storage
const s3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
  bucket: process.env.S3_BUCKET || 'audio-optimization-pcm'
};

class DatabaseIntegration {
  constructor() {
    this.pool = new Pool(dbConfig);
    this.s3 = new AWS.S3({
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
      region: s3Config.region
    });
    this.activeCallsMap = new Map();
    this.segmentBuffers = new Map();
    this.initializeDatabase();
  }

  async initializeDatabase() {
    try {
      // Test database connection
      const client = await this.pool.connect();
      console.log('✅ Database connected successfully');
      client.release();
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      process.exit(1);
    }
  }

  /**
   * Create or get existing call record
   */
  async getOrCreateCall(externalCallId, direction = 'inbound', metadata = {}) {
    try {
      // Check if call exists
      let result = await this.pool.query(
        'SELECT id FROM calls WHERE external_call_id = $1',
        [externalCallId]
      );

      if (result.rows.length > 0) {
        return result.rows[0].id;
      }

      // Create new call
      result = await this.pool.query(
        `INSERT INTO calls (external_call_id, direction, metadata)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [externalCallId, direction, JSON.stringify(metadata)]
      );

      const callId = result.rows[0].id;
      this.activeCallsMap.set(externalCallId, callId);

      console.log(`📞 New call created: ${callId}`);
      return callId;
    } catch (error) {
      console.error('Error creating call:', error);
      throw error;
    }
  }

  /**
   * Create channel for a call
   */
  async createChannel(callId, name, leg) {
    try {
      const result = await this.pool.query(
        `INSERT INTO channels (call_id, name, leg)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [callId, name, leg]
      );
      return result.rows[0].id;
    } catch (error) {
      console.error('Error creating channel:', error);
      throw error;
    }
  }

  /**
   * Create segment for time window
   */
  async createSegment(channelId, startMs, endMs, segmentType = 'speech', transcript = null) {
    try {
      const result = await this.pool.query(
        `INSERT INTO segments (channel_id, start_ms, end_ms, segment_type, transcript)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [channelId, startMs, endMs, segmentType, transcript]
      );
      return result.rows[0].id;
    } catch (error) {
      console.error('Error creating segment:', error);
      throw error;
    }
  }

  /**
   * Store PCM audio in S3 and return reference
   */
  async storeAudio(pcmBuffer, callId, stationId, segmentId) {
    try {
      const key = `calls/${callId}/${stationId}/${segmentId}_${Date.now()}.pcm`;

      const params = {
        Bucket: s3Config.bucket,
        Key: key,
        Body: pcmBuffer,
        ContentType: 'audio/pcm',
        Metadata: {
          'call-id': callId,
          'station-id': stationId,
          'segment-id': segmentId
        }
      };

      await this.s3.putObject(params).promise();
      return `s3://${s3Config.bucket}/${key}`;
    } catch (error) {
      console.error('Error storing audio to S3:', error);
      // Fallback to local storage
      return `local:/tmp/${segmentId}.pcm`;
    }
  }

  /**
   * Main ingestion function for station snapshots
   * This is called by embedded stations to send data
   */
  async ingestStationSnapshot(snapshot) {
    try {
      const {
        schema_version = '1.0.0',
        call_id,
        channel,
        segment,
        station,
        metrics,
        logs = [],
        audio,
        constraints = {},
        targets = {}
      } = snapshot;

      // Validate required fields
      if (!station?.id || !segment || !metrics) {
        throw new Error('Missing required fields in snapshot');
      }

      // Get or create call
      const dbCallId = await this.getOrCreateCall(call_id || `auto-${Date.now()}`);

      // Create channel if needed
      let channelId;
      if (channel) {
        channelId = await this.createChannel(dbCallId, channel, channel === 'caller' ? 'A' : 'B');
      }

      // Create segment
      const segmentId = await this.createSegment(
        channelId,
        segment.start_ms,
        segment.end_ms,
        'speech'
      );

      // Store audio if provided
      let audioRef = null;
      if (audio?.pcm_buffer) {
        audioRef = await this.storeAudio(
          audio.pcm_buffer,
          dbCallId,
          station.id,
          segmentId
        );
      }

      // Insert station snapshot
      const result = await this.pool.query(
        `INSERT INTO station_snapshots
         (segment_id, station_id, metrics, logs, audio_ref)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, timestamp`,
        [
          segmentId,
          station.id,
          JSON.stringify(metrics),
          JSON.stringify(logs),
          audioRef
        ]
      );

      const snapshotId = result.rows[0].id;
      const timestamp = result.rows[0].timestamp;

      console.log(`✅ Snapshot ingested: ${snapshotId} for ${station.id}`);

      // Trigger optimizer if needed
      if (this.shouldTriggerOptimizer(metrics, station.id)) {
        await this.triggerOptimizer(snapshotId, station.id, metrics, constraints, targets);
      }

      return {
        success: true,
        snapshot_id: snapshotId,
        timestamp: timestamp
      };

    } catch (error) {
      console.error('Error ingesting snapshot:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Determine if optimizer should be triggered based on metrics
   */
  shouldTriggerOptimizer(metrics, stationId) {
    // Define thresholds for triggering optimization
    const thresholds = {
      'STATION_1': { jitter_ms: 50, packet_loss_pct: 2 },
      'STATION_2': { latency_ms: 200, error_rate: 0.05 },
      'STATION_3': { snr_db: 20, noise_floor_db: -50 },
      'STATION_4': { confidence: 0.8, latency_ms: 300 },
      'STATION_9': { latency_ms: 150, quality_score: 0.85 },
      'STATION_10': { packet_loss_pct: 1, jitter_ms: 30 },
      'STATION_11': { emotion_confidence: 0.7 }
    };

    const stationThresholds = thresholds[stationId];
    if (!stationThresholds) return false;

    // Check if any metric exceeds threshold
    for (const [metric, threshold] of Object.entries(stationThresholds)) {
      if (metrics[metric] && (
        (metric.includes('loss') && metrics[metric] > threshold) ||
        (metric.includes('latency') && metrics[metric] > threshold) ||
        (metric.includes('jitter') && metrics[metric] > threshold) ||
        (metric.includes('confidence') && metrics[metric] < threshold) ||
        (metric.includes('snr') && metrics[metric] < threshold)
      )) {
        console.log(`⚠️ Threshold exceeded for ${stationId}: ${metric}=${metrics[metric]}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Trigger OpenAI-based optimizer
   */
  async triggerOptimizer(snapshotId, stationId, metrics, constraints, targets) {
    try {
      // Create optimizer run record
      const result = await this.pool.query(
        `INSERT INTO optimizer_runs
         (station_id, request_payload, status)
         VALUES ($1, $2, 'pending')
         RETURNING id`,
        [
          stationId,
          JSON.stringify({
            snapshot_id: snapshotId,
            metrics,
            constraints,
            targets,
            timestamp: new Date().toISOString()
          })
        ]
      );

      const optimizerRunId = result.rows[0].id;

      // Prepare data for OpenAI
      const optimizationRequest = {
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an audio optimization expert. Analyze the metrics and suggest parameter adjustments to improve audio quality. Consider the constraints and optimization targets. Return a JSON object with new parameter values and explanation.`
          },
          {
            role: 'user',
            content: JSON.stringify({
              station_id: stationId,
              current_metrics: metrics,
              constraints: constraints,
              targets: targets,
              available_parameters: await this.getStationParameters(stationId)
            })
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      };

      // Send to OpenAI (you need to implement this with your API key)
      const optimizerResponse = await this.callOpenAI(optimizationRequest);

      // Store optimizer response
      await this.pool.query(
        `UPDATE optimizer_runs
         SET response_payload = $1, completed_at = CURRENT_TIMESTAMP, status = 'success'
         WHERE id = $2`,
        [JSON.stringify(optimizerResponse), optimizerRunId]
      );

      // Apply parameter changes
      if (optimizerResponse.new_parameters) {
        await this.applyParameterChanges(
          stationId,
          optimizerResponse.new_parameters,
          optimizerRunId
        );
      }

      console.log(`🤖 Optimizer completed for ${stationId}`);
      return optimizerResponse;

    } catch (error) {
      console.error('Error triggering optimizer:', error);
      throw error;
    }
  }

  /**
   * Get current parameters for a station
   */
  async getStationParameters(stationId) {
    const result = await this.pool.query(
      `SELECT name, default_value, min_value, max_value
       FROM parameters
       WHERE station_id = $1`,
      [stationId]
    );
    return result.rows;
  }

  /**
   * Apply parameter changes from optimizer
   */
  async applyParameterChanges(stationId, newParameters, optimizerRunId) {
    for (const param of newParameters) {
      try {
        // Get parameter record
        const paramResult = await this.pool.query(
          'SELECT id, default_value FROM parameters WHERE name = $1 AND station_id = $2',
          [param.name, stationId]
        );

        if (paramResult.rows.length === 0) continue;

        const parameterId = paramResult.rows[0].id;
        const oldValue = paramResult.rows[0].default_value;

        // Insert parameter change record
        await this.pool.query(
          `INSERT INTO parameter_changes
           (parameter_id, station_id, old_value, new_value, optimizer_run_id, applied_by)
           VALUES ($1, $2, $3, $4, $5, 'optimizer')`,
          [parameterId, stationId, oldValue, param.new_value, optimizerRunId]
        );

        // Emit event for real-time application
        this.emitParameterUpdate(stationId, param.name, param.new_value);

      } catch (error) {
        console.error(`Error applying parameter ${param.name}:`, error);
      }
    }
  }

  /**
   * Emit parameter update for real-time application
   */
  emitParameterUpdate(stationId, parameterName, newValue) {
    // This should integrate with your WebSocket/EventEmitter system
    console.log(`📡 Emitting parameter update: ${stationId}.${parameterName} = ${newValue}`);
    // Example: io.emit('parameter-update', { stationId, parameterName, newValue });
  }

  /**
   * Call OpenAI API (placeholder - implement with your API key)
   */
  async callOpenAI(request) {
    // Placeholder for OpenAI integration
    // You need to implement this with your OpenAI API key
    console.log('🤖 Calling OpenAI for optimization...');

    // Mock response for testing
    return {
      new_parameters: [
        {
          name: 'input_gain_db',
          new_value: 2,
          old_value: 0,
          reason: 'Increase gain to improve SNR'
        }
      ],
      scorecard: {
        clarity: 0.92,
        noise: 0.88,
        latency: 0.95,
        overall: 0.91
      },
      analysis: 'Detected low SNR, suggesting gain increase',
      next_iteration: {
        required: true,
        delay_ms: 5000
      }
    };
  }

  /**
   * Clean up connections
   */
  async close() {
    await this.pool.end();
    console.log('Database connections closed');
  }
}

// Export for use in station modules
module.exports = DatabaseIntegration;

// Example usage in embedded stations:
/*
const DatabaseIntegration = require('./database-integration-module');
const dbIntegration = new DatabaseIntegration();

// In your station monitoring code:
async function sendStationSnapshot(stationId, metrics, audioBuffer) {
  const snapshot = {
    schema_version: '1.0.0',
    call_id: currentCallId,
    channel: 'caller',
    segment: {
      start_ms: segmentStart,
      end_ms: Date.now()
    },
    station: {
      id: stationId,
      software_version: '2.0.0'
    },
    metrics: metrics,
    audio: {
      pcm_buffer: audioBuffer,
      sample_rate: 16000,
      format: 'pcm_s16le'
    },
    constraints: {
      max_latency_ms: 200,
      min_snr_db: 20
    },
    targets: {
      goal: 'maximize_clarity',
      weights: {
        clarity: 0.6,
        latency: 0.4
      }
    }
  };

  const result = await dbIntegration.ingestStationSnapshot(snapshot);
  console.log('Snapshot sent:', result);
}
*/