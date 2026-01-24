// STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js
// Bridge to PostgreSQL monitoring_v2 database
// Handles all database operations for the NEW monitoring system

import pg from 'pg';
const { Pool } = pg;

export class DatabaseBridge {
  /**
   * @param {object} opts
   * @param {string} [opts.host="localhost"] - PostgreSQL host
   * @param {number} [opts.port=5432] - PostgreSQL port
   * @param {string} [opts.database="monitoring_v2"] - Database name
   * @param {string} [opts.user="monitoring_user"] - Database user
   * @param {string} [opts.password="monitoring_pass"] - Database password
   * @param {number} [opts.maxConnections=10] - Connection pool size
   */
  constructor({
    host = "localhost",
    port = 5432,
    database = "monitoring_v2",
    user = "monitoring_user",
    password = "monitoring_pass",
    maxConnections = 10
  } = {}) {
    // Create connection pool
    this.pool = new Pool({
      host,
      port,
      database,
      user,
      password,
      max: maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Stats
    this.stats = {
      traces: { inserted: 0, updated: 0, errors: 0 },
      metrics: { inserted: 0, errors: 0 },
      audio: { indexed: 0, errors: 0 },
      knobs: { snapshots: 0, events: 0, errors: 0 }
    };

    // Connection test
    this.testConnection();

    console.log(`[DatabaseBridge] Initialized for ${database}@${host}:${port}`);
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      console.log(`[DatabaseBridge] Connected successfully. Server time: ${result.rows[0].now}`);
      return true;
    } catch (error) {
      console.error(`[DatabaseBridge] Connection failed:`, error.message);
      return false;
    }
  }

  /**
   * Create or update a trace
   */
  async upsertTrace(traceData) {
    const {
      trace_id,
      started_at,
      ended_at = null,
      src_extension = null,
      dst_extension = null,
      call_id = null,
      notes = null
    } = traceData;

    const query = `
      INSERT INTO traces (trace_id, started_at, ended_at, src_extension, dst_extension, call_id, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (trace_id) DO UPDATE SET
        ended_at = EXCLUDED.ended_at,
        notes = EXCLUDED.notes
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, [
        trace_id,
        started_at,
        ended_at,
        src_extension,
        dst_extension,
        call_id,
        notes
      ]);

      if (result.rows.length > 0) {
        this.stats.traces.inserted++;
      } else {
        this.stats.traces.updated++;
      }

      return result.rows[0];
    } catch (error) {
      this.stats.traces.errors++;
      console.error(`[DatabaseBridge] Failed to upsert trace:`, error.message);
      throw error;
    }
  }

  /**
   * Send aggregated metrics batch
   */
  async sendAggregatedMetrics(batch) {
    if (!Array.isArray(batch) || batch.length === 0) return;

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Prepare bulk insert
      const values = [];
      const placeholders = [];
      let paramIndex = 1;

      for (const metric of batch) {
        const row = [
          metric.trace_id,
          metric.station_key,
          metric.station_group || null,
          metric.layer || null,
          metric.direction || null,
          metric.tap,
          metric.metric_key,
          new Date(metric.bucket_ts_ms),
          metric.bucket_ms || 5000,
          metric.count,
          isFinite(metric.min) ? metric.min : null,
          isFinite(metric.max) ? metric.max : null,
          isFinite(metric.sum) ? metric.sum : null,
          isFinite(metric.avg) ? metric.avg : null,
          metric.last !== undefined ? metric.last : null
        ];

        values.push(...row);

        const rowPlaceholders = [];
        for (let i = 0; i < row.length; i++) {
          rowPlaceholders.push(`$${paramIndex++}`);
        }
        placeholders.push(`(${rowPlaceholders.join(', ')})`);
      }

      const query = `
        INSERT INTO metrics_agg_5s (
          trace_id, station_key, station_group, layer, direction,
          tap, metric_key, bucket_ts, bucket_ms,
          count, min, max, sum, avg, last
        )
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (trace_id, station_key, tap, metric_key, bucket_ts)
        DO UPDATE SET
          count = metrics_agg_5s.count + EXCLUDED.count,
          min = LEAST(metrics_agg_5s.min, EXCLUDED.min),
          max = GREATEST(metrics_agg_5s.max, EXCLUDED.max),
          sum = COALESCE(metrics_agg_5s.sum, 0) + COALESCE(EXCLUDED.sum, 0),
          avg = (COALESCE(metrics_agg_5s.sum, 0) + COALESCE(EXCLUDED.sum, 0)) /
                (metrics_agg_5s.count + EXCLUDED.count),
          last = EXCLUDED.last
      `;

      await client.query(query, values);
      await client.query('COMMIT');

      this.stats.metrics.inserted += batch.length;

      // Log progress every 1000 metrics
      if (this.stats.metrics.inserted % 1000 === 0) {
        console.log(`[DatabaseBridge] Inserted ${this.stats.metrics.inserted} total metrics`);
      }

    } catch (error) {
      await client.query('ROLLBACK');
      this.stats.metrics.errors++;
      console.error(`[DatabaseBridge] Failed to insert metrics batch:`, error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Index an audio segment
   */
  async sendAudioSegmentIndex(segmentData) {
    const query = `
      INSERT INTO audio_segments_5s (
        trace_id, station_key, station_group, layer, direction,
        tap, bucket_ts, bucket_ms, sample_rate_hz, channels,
        format, file_path, file_bytes, sha256_hex
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (trace_id, station_key, tap, bucket_ts)
      DO UPDATE SET
        file_path = EXCLUDED.file_path,
        file_bytes = EXCLUDED.file_bytes,
        sha256_hex = EXCLUDED.sha256_hex
    `;

    try {
      await this.pool.query(query, [
        segmentData.trace_id,
        segmentData.station_key,
        segmentData.station_group || null,
        segmentData.layer || null,
        segmentData.direction || null,
        segmentData.tap,
        new Date(segmentData.bucket_ts_ms),
        segmentData.bucket_ms || 5000,
        segmentData.sample_rate_hz || 16000,
        segmentData.channels || 1,
        segmentData.format || 'WAV_PCM_S16LE_MONO',
        segmentData.file_path,
        segmentData.file_bytes || null,
        segmentData.sha256_hex || null
      ]);

      this.stats.audio.indexed++;

      // Log progress every 100 segments
      if (this.stats.audio.indexed % 100 === 0) {
        console.log(`[DatabaseBridge] Indexed ${this.stats.audio.indexed} audio segments`);
      }

    } catch (error) {
      this.stats.audio.errors++;
      console.error(`[DatabaseBridge] Failed to index audio segment:`, error.message);
      throw error;
    }
  }

  /**
   * Save knob snapshot for a bucket
   */
  async saveKnobSnapshot(snapshotData) {
    const query = `
      INSERT INTO knob_snapshots_5s (
        trace_id, station_key, bucket_ts, bucket_ms, knobs_json
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (trace_id, station_key, bucket_ts)
      DO UPDATE SET knobs_json = EXCLUDED.knobs_json
    `;

    try {
      await this.pool.query(query, [
        snapshotData.trace_id,
        snapshotData.station_key,
        new Date(snapshotData.bucket_ts_ms),
        snapshotData.bucket_ms || 5000,
        JSON.stringify(snapshotData.knobs)
      ]);

      this.stats.knobs.snapshots++;

    } catch (error) {
      this.stats.knobs.errors++;
      console.error(`[DatabaseBridge] Failed to save knob snapshot:`, error.message);
      throw error;
    }
  }

  /**
   * Log a knob change event
   */
  async logKnobEvent(eventData) {
    const query = `
      INSERT INTO knob_events (
        trace_id, station_key, knob_key, old_value, new_value,
        source, reason, occurred_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    try {
      await this.pool.query(query, [
        eventData.trace_id || null,
        eventData.station_key,
        eventData.knob_key,
        eventData.old_value?.toString() || null,
        eventData.new_value.toString(),
        eventData.source || 'manual',
        eventData.reason || null,
        eventData.occurred_at || new Date()
      ]);

      this.stats.knobs.events++;

    } catch (error) {
      this.stats.knobs.errors++;
      console.error(`[DatabaseBridge] Failed to log knob event:`, error.message);
      throw error;
    }
  }

  /**
   * Run retention cleanup (delete data older than 72 hours)
   */
  async runRetentionCleanup() {
    try {
      const result = await this.pool.query('SELECT cleanup_old_monitoring_data()');
      console.log(`[DatabaseBridge] Retention cleanup completed`);
      return true;
    } catch (error) {
      console.error(`[DatabaseBridge] Retention cleanup failed:`, error.message);
      return false;
    }
  }

  /**
   * Get database stats
   */
  async getDatabaseStats() {
    try {
      const queries = {
        traces: 'SELECT COUNT(*) as count FROM traces',
        metrics: 'SELECT COUNT(*) as count, MIN(bucket_ts) as oldest, MAX(bucket_ts) as newest FROM metrics_agg_5s',
        audio: 'SELECT COUNT(*) as count FROM audio_segments_5s',
        knobs: 'SELECT COUNT(*) as count FROM knob_snapshots_5s'
      };

      const stats = {};
      for (const [key, query] of Object.entries(queries)) {
        const result = await this.pool.query(query);
        stats[key] = result.rows[0];
      }

      return stats;
    } catch (error) {
      console.error(`[DatabaseBridge] Failed to get database stats:`, error.message);
      return null;
    }
  }

  /**
   * Get bridge stats
   */
  getStats() {
    return {
      ...this.stats,
      pool: {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      }
    };
  }

  /**
   * Close database connections
   */
  async close() {
    await this.pool.end();
    console.log(`[DatabaseBridge] Connection pool closed. Final stats:`, this.stats);
  }
}