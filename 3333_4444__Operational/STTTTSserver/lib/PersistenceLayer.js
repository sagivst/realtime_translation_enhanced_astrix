/**
 * PersistenceLayer.js - Phase 3 Persistence & Recovery
 * Ensures scheduled updates survive server restarts
 * Version: 1.0.0
 * Date: 2026-01-04
 */

class PersistenceLayer {
  constructor(databaseBridge) {
    this.databaseBridge = databaseBridge;
    this.stats = {
      saved: 0,
      loaded: 0,
      errors: 0
    };
  }

  /**
   * Save a scheduled update to database for recovery
   */
  async saveScheduledUpdate(update) {
    const query = `
      INSERT INTO scheduled_knob_updates (
        idempotency_key, trace_id, station_key,
        apply_at_bucket_ts, knobs, source, reason,
        status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING id
    `;

    try {
      const result = await this.databaseBridge.pool.query(query, [
        update.idempotency_key,
        update.trace_id,
        update.station_key,
        update.apply_at_bucket_ts,
        JSON.stringify(update.knobs),
        update.source || 'auto_optimizer',
        update.reason || null
      ]);

      this.stats.saved++;
      console.log('[PersistenceLayer] Saved scheduled update:', update.idempotency_key);
      return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (error) {
      this.stats.errors++;
      console.error('[PersistenceLayer] Failed to save scheduled update:', error.message);
      throw error;
    }
  }

  /**
   * Load all pending future updates on startup
   */
  async loadPendingUpdates() {
    const query = `
      SELECT 
        idempotency_key,
        trace_id,
        station_key,
        apply_at_bucket_ts,
        knobs,
        source,
        reason
      FROM scheduled_knob_updates
      WHERE status = 'pending'
        AND apply_at_bucket_ts > NOW()
      ORDER BY apply_at_bucket_ts ASC
    `;

    try {
      const result = await this.databaseBridge.pool.query(query);
      this.stats.loaded = result.rows.length;

      console.log(`[PersistenceLayer] Loaded ${result.rows.length} pending updates`);

      // Transform rows to update format
      return result.rows.map(row => ({
        idempotency_key: row.idempotency_key,
        trace_id: row.trace_id,
        station_key: row.station_key,
        apply_at_bucket_ts: row.apply_at_bucket_ts,
        knobs: row.knobs,
        source: row.source,
        reason: row.reason
      }));
    } catch (error) {
      this.stats.errors++;
      console.error('[PersistenceLayer] Failed to load pending updates:', error.message);
      return [];
    }
  }

  /**
   * Mark an update as applied
   */
  async markApplied(idempotency_key) {
    const query = `
      UPDATE scheduled_knob_updates
      SET status = 'applied',
          applied_at = NOW()
      WHERE idempotency_key = $1
    `;

    try {
      await this.databaseBridge.pool.query(query, [idempotency_key]);
      console.log('[PersistenceLayer] Marked as applied:', idempotency_key);
    } catch (error) {
      console.error('[PersistenceLayer] Failed to mark as applied:', error.message);
    }
  }

  /**
   * Mark missed updates (that should have been applied but weren't)
   */
  async markMissedUpdates() {
    const query = `
      UPDATE scheduled_knob_updates
      SET status = 'missed'
      WHERE status = 'pending'
        AND apply_at_bucket_ts < NOW() - INTERVAL '1 minute'
    `;

    try {
      const result = await this.databaseBridge.pool.query(query);
      if (result.rowCount > 0) {
        console.warn(`[PersistenceLayer] Marked ${result.rowCount} updates as missed`);
      }
      return result.rowCount;
    } catch (error) {
      console.error('[PersistenceLayer] Failed to mark missed updates:', error.message);
      return 0;
    }
  }

  /**
   * Clean up old records
   */
  async cleanup(daysToKeep = 7) {
    const query = `
      DELETE FROM scheduled_knob_updates
      WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
        AND status IN ('applied', 'failed', 'missed')
    `;

    try {
      const result = await this.databaseBridge.pool.query(query);
      console.log(`[PersistenceLayer] Cleaned up ${result.rowCount} old records`);
      return result.rowCount;
    } catch (error) {
      console.error('[PersistenceLayer] Cleanup failed:', error.message);
      return 0;
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return { ...this.stats };
  }
}

module.exports = { PersistenceLayer };
