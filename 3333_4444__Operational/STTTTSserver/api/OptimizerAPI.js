/**
 * OptimizerAPI.js - External module for all Optimizer endpoints
 * Maintains STTTTSserver.js stability by keeping all optimizer logic external
 * Version: 1.0.0
 * Date: 2026-01-04
 */

const fs = require('fs');
const path = require('path');
const { BucketScheduler } = require('../lib/BucketScheduler');

class OptimizerAPI {
  constructor(app, databaseBridge, knobsResolver, config = {}) {
    this.app = app;
    this.databaseBridge = databaseBridge;
    this.knobsResolver = knobsResolver;
    this.config = config;

    // Initialize BucketScheduler for scheduled knob application
    this.bucketScheduler = new BucketScheduler(databaseBridge, knobsResolver, {
      bucketSize: 5000,      // 5-second buckets
      checkInterval: 1000,   // Check every second
      maxScheduledUpdates: 1000
    });

    // Initialize scheduler and recover pending updates after a short delay
    setTimeout(() => {
      console.log('[OptimizerAPI] Initializing BucketScheduler for recovery...');
      this.bucketScheduler.initialize()
        .then(() => {
          console.log('[OptimizerAPI] BucketScheduler initialized successfully');
        })
        .catch(error => {
          console.error('[OptimizerAPI] Failed to initialize BucketScheduler:', error);
        });
    }, 2000); // Wait 2 seconds for database to be ready


    // Register all endpoints
    this.registerEndpoints();

    console.log('[OptimizerAPI] Initialized with 4 endpoints and BucketScheduler');
  }

  registerEndpoints() {
    // 1. Active Traces Discovery
    this.app.get('/api/traces/active', this.handleActiveTraces.bind(this));

    // 2. Optimizer Snapshot
    this.app.get('/api/optimizer/snapshot', this.handleSnapshot.bind(this));

    // 3. Audio Segment Retrieval
    this.app.get('/api/audio/segment', this.handleAudioSegment.bind(this));

    // 4. Apply Knobs
    this.app.post('/api/optimizer/knobs/apply', this.handleApplyKnobs.bind(this));
    this.app.get('/api/optimizer/verify/:idempotency_key', this.handleVerifyUpdate.bind(this));
    this.app.get('/api/optimizer/verify-trace/:trace_id', this.handleVerifyTrace.bind(this));


    // 5. Phase 3: Verification Status
    this.app.get('/api/optimizer/verify', this.handleGetVerificationStatus.bind(this));
    
    // 6. Phase 3: Trigger Manual Verification  
    this.app.post('/api/optimizer/verify/trigger', this.handleTriggerVerification.bind(this));

    console.log('[OptimizerAPI] Registered endpoints:');
    console.log('  GET  /api/traces/active');
    console.log('  GET  /api/optimizer/snapshot');
    console.log('  GET  /api/audio/segment');
    console.log('  POST /api/optimizer/knobs/apply');
    console.log('  GET  /api/optimizer/verify/:idempotency_key');
    console.log('  GET  /api/optimizer/verify-trace/:trace_id');
    console.log('  GET  /api/optimizer/verify');
    console.log('  POST /api/optimizer/verify/trigger');

  }

  // ==========================================
  // Endpoint 1: Active Traces Discovery
  // ==========================================
  async handleActiveTraces(req, res) {
    try {
      const maxAge = req.query.max_age || '1 hour';

      // Query active traces from database
      const query = `
        SELECT
          t.trace_id,
          t.started_at,
          t.src_extension,
          t.dst_extension,
          ARRAY_AGG(DISTINCT ms.station_key) as stations
        FROM traces t
        LEFT JOIN metrics_agg_5s ms ON ms.trace_id = t.trace_id
        WHERE t.ended_at IS NULL
          AND t.started_at > NOW() - INTERVAL '${maxAge}'
        GROUP BY t.trace_id, t.started_at, t.src_extension, t.dst_extension
        ORDER BY t.started_at DESC
      `;

      const result = await this.databaseBridge.pool.query(query);

      const active = result.rows.map(row => ({
        trace_id: row.trace_id,
        started_at: row.started_at,
        src_extension: row.src_extension || '3333',
        dst_extension: row.dst_extension || '4444',
        call_id: null,
        stations: row.stations || ['St_3_3333', 'St_3_4444']
      }));

      res.json({
        success: true,
        active: active
      });

      console.log(`[OptimizerAPI] Active traces: ${active.length} found`);

    } catch (error) {
      console.error('[OptimizerAPI] /traces/active error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve active traces'
      });
    }
  }

  // ==========================================
  // Endpoint 2: Unified Snapshot
  // ==========================================
  async handleSnapshot(req, res) {
    try {
      const { trace_id, since_bucket_ts, limit = 1 } = req.query;

      if (!trace_id) {
        return res.status(400).json({
          success: false,
          error: 'trace_id is required'
        });
      }

      const limitNum = Math.min(parseInt(limit), 50);

      // Get completed buckets
      let bucketQuery = `
        SELECT DISTINCT bucket_ts, station_key
        FROM metrics_agg_5s
        WHERE trace_id = $1
          AND bucket_ts < NOW() - INTERVAL '1 second'
      `;

      const params = [trace_id];

      if (since_bucket_ts) {
        bucketQuery += ' AND bucket_ts > $2';
        params.push(since_bucket_ts);
      }

      bucketQuery += ` ORDER BY bucket_ts DESC LIMIT $${params.length + 1}`;
      params.push(limitNum);

      const bucketResult = await this.databaseBridge.pool.query(bucketQuery, params);

      if (bucketResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No completed buckets found for trace'
        });
      }

      // Build response for each bucket
      const bucketResponses = [];

      for (const bucket of bucketResult.rows) {
        const { bucket_ts, station_key } = bucket;

        // Get metrics for this bucket
        const metricsQuery = `
          SELECT tap, metric_key, count, min, max, avg, sum, last
          FROM metrics_agg_5s
          WHERE trace_id = $1
            AND station_key = $2
            AND bucket_ts = $3
        `;

        const metricsResult = await this.databaseBridge.pool.query(metricsQuery, [
          trace_id,
          station_key,
          bucket_ts
        ]);

        // Get knobs snapshot for this bucket
        const knobsQuery = `
          SELECT knobs_json, config_version
          FROM knob_snapshots_5s
          WHERE trace_id = $1
            AND station_key = $2
            AND bucket_ts = $3
        `;

        const knobsResult = await this.databaseBridge.pool.query(knobsQuery, [
          trace_id,
          station_key,
          bucket_ts
        ]);

        // Get audio segments for this bucket
        const audioQuery = `
          SELECT tap, file_path
          FROM audio_segments_5s
          WHERE trace_id = $1
            AND station_key = $2
            AND bucket_ts = $3
        `;

        const audioResult = await this.databaseBridge.pool.query(audioQuery, [
          trace_id,
          station_key,
          bucket_ts
        ]);

        // Format metrics by tap and metric_key
        const metrics = { PRE: {}, POST: {} };
        for (const row of metricsResult.rows) {
          if (row.tap && row.metric_key) {
            metrics[row.tap][row.metric_key] = {
              count: row.count,
              min: row.min,
              max: row.max,
              avg: row.avg,
              last: row.last
            };
          }
        }

        // Get knobs
        const knobs = knobsResult.rows.length > 0
          ? knobsResult.rows[0].knobs_json || {}
          : {};

        const configVersion = knobsResult.rows.length > 0
          ? knobsResult.rows[0].config_version || 1
          : 1;

        // Format audio URLs
        const audio = { PRE: null, POST: null };
        for (const row of audioResult.rows) {
          if (row.tap) {
            audio[row.tap] = {
              endpoint: `/api/audio/segment?trace_id=${trace_id}&station_key=${station_key}&tap=${row.tap}&bucket_ts=${encodeURIComponent(new Date(bucket_ts).toISOString())}`
            };
          }
        }

        bucketResponses.push({
          bucket_ts: bucket_ts,
          bucket_ms: 5000,
          station_key: station_key,
          knobs_snapshot: knobs,
          metrics: metrics,
          audio: audio,
          config_version: configVersion,
          last_knob_event_id: null
        });
      }

      res.json({
        success: true,
        trace_id: trace_id,
        buckets: bucketResponses
      });

      console.log(`[OptimizerAPI] Snapshot: ${bucketResponses.length} buckets returned for trace ${trace_id}`);

    } catch (error) {
      console.error('[OptimizerAPI] /optimizer/snapshot error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve snapshot'
      });
    }
  }

  // ==========================================
  // Endpoint 3: Audio Segment Retrieval
  // ==========================================
  async handleAudioSegment(req, res) {
    try {
      const { trace_id, station_key, tap, bucket_ts } = req.query;

      // Validate parameters
      if (!trace_id || !station_key || !tap || !bucket_ts) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters (trace_id, station_key, tap, bucket_ts)'
        });
      }

      if (tap !== 'PRE' && tap !== 'POST') {
        return res.status(400).json({
          success: false,
          error: 'tap must be PRE or POST'
        });
      }

      // Query database for file path
      const query = `
        SELECT file_path
        FROM audio_segments_5s
        WHERE trace_id = $1
          AND station_key = $2
          AND tap = $3
          AND bucket_ts = $4
      `;

      const result = await this.databaseBridge.pool.query(query, [
        trace_id,
        station_key,
        tap,
        bucket_ts
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Audio segment not found in database'
        });
      }

      const filePath = result.rows[0].file_path;

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error(`[OptimizerAPI] Audio file not found on disk: ${filePath}`);
        return res.status(404).json({
          success: false,
          error: 'Audio file not found on disk'
        });
      }

      // Set headers
      res.set({
        'Content-Type': 'audio/wav',
        'X-Sample-Rate': '16000',
        'X-Channels': '1',
        'X-Bucket-MS': '5000',
        'X-Trace-ID': trace_id,
        'X-Station-Key': station_key,
        'X-Tap': tap,
        'Cache-Control': 'public, max-age=3600'
      });

      // Stream the file
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);

      stream.on('error', (err) => {
        console.error('[OptimizerAPI] Audio streaming error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Failed to stream audio file'
          });
        }
      });

      console.log(`[OptimizerAPI] Audio segment served: ${filePath}`);

    } catch (error) {
      console.error('[OptimizerAPI] /audio/segment error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audio segment'
      });
    }
  }

  // ==========================================
  // Endpoint 4: Apply Knobs (Scheduled with BucketScheduler)
  // ==========================================
  async handleApplyKnobs(req, res) {
    try {
      const {
        trace_id,
        station_key,
        apply_at_bucket_ts,
        idempotency_key,
        source = 'auto_optimizer',
        reason,
        knobs
      } = req.body;

      // Validate required fields
      if (!trace_id || !station_key || !apply_at_bucket_ts || !idempotency_key || !knobs) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields (trace_id, station_key, apply_at_bucket_ts, idempotency_key, knobs)'
        });
      }

      // Validate UUID format for idempotency_key
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(idempotency_key)) {
        return res.status(400).json({
          success: false,
          error: 'idempotency_key must be a valid UUID'
        });
      }

      // Use BucketScheduler to handle the scheduled update
      // The scheduler handles:
      // - Idempotency checking
      // - Future timestamp validation
      // - Bucket alignment
      // - Timer management
      // - Database storage
      const result = await this.bucketScheduler.scheduleUpdate({
        trace_id,
        station_key,
        apply_at_bucket_ts,
        idempotency_key,
        knobs,
        source,
        reason
      });

      // Return response based on scheduler result
      if (result.duplicate) {
        return res.json({
          success: true,
          accepted: true,
          duplicate: true,
          apply_at_bucket_ts: result.apply_at_bucket_ts,
          config_version: result.config_version
        });
      }

      // Success response for new scheduled update
      res.json({
        success: true,
        accepted: true,
        apply_at_bucket_ts: result.apply_at_bucket_ts,
        config_version: result.config_version,
        effective_knobs: result.effective_knobs
      });

      console.log(`[OptimizerAPI] Knob update scheduled via BucketScheduler:`, {
        trace_id,
        station_key,
        apply_at_bucket_ts: result.apply_at_bucket_ts,
        config_version: result.config_version,
        knobs,
        reason
      });

    } catch (error) {
      console.error('[OptimizerAPI] /optimizer/knobs/apply error:', error);

      // Handle specific error types
      if (error.message && error.message.includes('future')) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }

      if (error.message && error.message.includes('Maximum scheduled')) {
        return res.status(429).json({
          success: false,
          error: error.message
        });
      }

      // Generic error
      res.status(500).json({
        success: false,
        error: 'Failed to schedule knob application'
      });
    }
  }

  // Cleanup method
  stop() {
    if (this.bucketScheduler) {
      this.bucketScheduler.stop();
    }
    console.log('[OptimizerAPI] Stopped');
  }
  // ==========================================
  // Phase 3: Verification Endpoints
  // ==========================================
  
  /**
   * Get verification status for a knob application
   */
  async handleGetVerificationStatus(req, res) {
    try {
      const { trace_id, station_key, bucket_ts } = req.query;

      if (!trace_id || !station_key || !bucket_ts) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters (trace_id, station_key, bucket_ts)'
        });
      }

      // Query verification status from database
      const query = `
        SELECT 
          knob_key,
          expected_value,
          actual_value,
          verified,
          confidence_score,
          verified_at,
          mismatch_reason
        FROM knob_verifications
        WHERE trace_id = $1 
          AND station_key = $2 
          AND bucket_ts = $3
        ORDER BY verified_at DESC
      `;

      const result = await this.databaseBridge.pool.query(query, [
        trace_id,
        station_key,
        bucket_ts
      ]);

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          status: 'not_verified',
          results: []
        });
      }

      // Calculate overall verification status
      const allVerified = result.rows.every(row => row.verified);
      const avgConfidence = result.rows.reduce((sum, row) => 
        sum + (row.confidence_score || 0), 0) / result.rows.length;

      res.json({
        success: true,
        status: allVerified ? 'verified' : 'mismatch',
        confidence: avgConfidence,
        trace_id,
        station_key,
        bucket_ts,
        results: result.rows
      });

    } catch (error) {
      console.error('[OptimizerAPI] /verify error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get verification status'
      });
    }
  }

  /**
   * Trigger manual verification
   */
  async handleTriggerVerification(req, res) {
    try {
      const { trace_id, station_key, bucket_ts, knobs } = req.body;

      if (!trace_id || !station_key || !bucket_ts || !knobs) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      // Schedule verification if VerificationManager is available
      if (this.verificationManager) {
        this.verificationManager.scheduleVerification({
          trace_id,
          station_key,
          bucket_ts,
          knobs
        });

        res.json({
          success: true,
          message: 'Verification scheduled',
          trace_id,
          station_key,
          bucket_ts
        });
      } else {
        res.status(503).json({
          success: false,
          error: 'Verification manager not available'
        });
      }

    } catch (error) {
      console.error('[OptimizerAPI] /verify/trigger error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger verification'
      });
    }
  }

  /**
   * Handle GET /api/optimizer/verify/:idempotency_key
   * Verify that a scheduled knob update was applied correctly
   */
  async handleVerifyUpdate(req, res) {
    try {
      const { idempotency_key } = req.params;

      // 1. Check scheduled update status
      const scheduledQuery = `
        SELECT 
          su.*,
          kav.verification_status,
          kav.applied_knobs,
          kav.verified_knobs,
          kav.verified_at
        FROM scheduled_knob_updates su
        LEFT JOIN knob_apply_verification kav 
          ON su.idempotency_key = kav.idempotency_key
        WHERE su.idempotency_key = $1
      `;

      const result = await this.databaseBridge.pool.query(scheduledQuery, [idempotency_key]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Update not found'
        });
      }

      const update = result.rows[0];

      // 2. Check current effective knobs if trace is active
      let currentKnobs = null;
      if (update.status === 'applied' && update.trace_id) {
        try {
          currentKnobs = this.knobsResolver.getEffectiveKnobs({
            trace_id: update.trace_id,
            station_key: update.station_key
          });
        } catch (e) {
          // Trace might not be active anymore
          console.log(`[OptimizerAPI] Could not get current knobs: ${e.message}`);
        }
      }

      // 3. Build verification response
      const response = {
        success: true,
        idempotency_key,
        trace_id: update.trace_id,
        station_key: update.station_key,
        status: update.status,
        scheduled_for: update.apply_at_bucket_ts,
        verification: {
          status: update.verification_status || 'not_verified',
          verified_at: update.verified_at,
          scheduled_knobs: update.knobs,
          applied_knobs: update.applied_knobs,
          verified_knobs: update.verified_knobs,
          current_knobs: currentKnobs
        }
      };

      // 4. Determine verification result
      if (update.verification_status === 'verified') {
        response.verification.result = 'SUCCESS';
        response.verification.message = 'Knobs were successfully applied and verified';
      } else if (update.status === 'missed') {
        response.verification.result = 'MISSED';
        response.verification.message = 'Update was missed (bucket timestamp passed before application)';
      } else if (update.status === 'pending') {
        response.verification.result = 'PENDING';
        response.verification.message = 'Update is scheduled but not yet applied';
      } else if (update.status === 'failed') {
        response.verification.result = 'FAILED';
        response.verification.message = 'Update failed to apply';
      }

      res.json(response);

    } catch (error) {
      console.error('[OptimizerAPI] Verification error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle GET /api/optimizer/verify-trace/:trace_id
   * Get all verification records for a trace
   */
  async handleVerifyTrace(req, res) {
    try {
      const { trace_id } = req.params;
      const { limit = 10 } = req.query;

      const query = `
        SELECT 
          kav.*,
          su.apply_at_bucket_ts,
          su.status as update_status,
          su.source,
          su.reason
        FROM knob_apply_verification kav
        JOIN scheduled_knob_updates su 
          ON kav.idempotency_key = su.idempotency_key
        WHERE kav.trace_id = $1
        ORDER BY kav.created_at DESC
        LIMIT $2
      `;

      const result = await this.databaseBridge.pool.query(query, [trace_id, parseInt(limit)]);

      res.json({
        success: true,
        trace_id,
        verifications: result.rows,
        count: result.rows.length
      });

    } catch (error) {
      console.error('[OptimizerAPI] Verify trace error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

}



module.exports = { OptimizerAPI };
