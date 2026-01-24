// STTTTSserver/Monitoring_Stations/bridge/BackpressurePolicy.js
// Defines policies for handling backpressure situations
// MUST NOT block the realtime path

export class BackpressurePolicy {
  /**
   * @param {object} opts
   * @param {string} [opts.policy="drop_oldest"] - Policy type
   * @param {number} [opts.highWaterMark=0.8] - Trigger threshold (ratio)
   * @param {number} [opts.lowWaterMark=0.5] - Clear threshold (ratio)
   */
  constructor({
    policy = "drop_oldest",
    highWaterMark = 0.8,
    lowWaterMark = 0.5
  } = {}) {
    this.policy = policy;
    this.highWaterMark = highWaterMark;
    this.lowWaterMark = lowWaterMark;

    // State
    this.isActive = false;
    this.stats = {
      triggered: 0,
      cleared: 0,
      itemsDropped: 0,
      itemsThrottled: 0
    };

    console.log(`[BackpressurePolicy] Initialized: policy=${policy}, high=${highWaterMark}, low=${lowWaterMark}`);
  }

  /**
   * Check if backpressure should be applied
   * @param {number} queueLength - Current queue length
   * @param {number} maxQueueSize - Maximum queue size
   * @returns {boolean} Whether backpressure is active
   */
  check(queueLength, maxQueueSize) {
    const utilization = queueLength / maxQueueSize;

    if (!this.isActive && utilization >= this.highWaterMark) {
      // Trigger backpressure
      this.isActive = true;
      this.stats.triggered++;
      console.warn(`[BackpressurePolicy] TRIGGERED: queue=${queueLength}/${maxQueueSize} (${(utilization * 100).toFixed(1)}%)`);
      return true;
    }

    if (this.isActive && utilization <= this.lowWaterMark) {
      // Clear backpressure
      this.isActive = false;
      this.stats.cleared++;
      console.log(`[BackpressurePolicy] CLEARED: queue=${queueLength}/${maxQueueSize} (${(utilization * 100).toFixed(1)}%)`);
      return false;
    }

    return this.isActive;
  }

  /**
   * Apply the policy to handle queue overflow
   * @param {Array} queue - The queue to manage
   * @param {*} newItem - Item trying to be added
   * @param {number} maxSize - Maximum queue size
   * @returns {boolean} Whether the item was added
   */
  apply(queue, newItem, maxSize) {
    if (queue.length >= maxSize) {
      switch (this.policy) {
        case "drop_oldest":
          // Remove oldest item to make room
          const dropped = queue.shift();
          this.stats.itemsDropped++;
          queue.push(newItem);
          return true;

        case "drop_newest":
          // Don't add the new item
          this.stats.itemsDropped++;
          return false;

        case "drop_random":
          // Drop a random item
          const idx = Math.floor(Math.random() * queue.length);
          queue.splice(idx, 1);
          this.stats.itemsDropped++;
          queue.push(newItem);
          return true;

        case "throttle":
          // Don't add, but count as throttled
          this.stats.itemsThrottled++;
          return false;

        default:
          // Default to drop_oldest
          queue.shift();
          this.stats.itemsDropped++;
          queue.push(newItem);
          return true;
      }
    }

    // Queue has room
    queue.push(newItem);
    return true;
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      policy: this.policy,
      isActive: this.isActive,
      ...this.stats
    };
  }

  /**
   * Reset stats
   */
  resetStats() {
    this.stats = {
      triggered: 0,
      cleared: 0,
      itemsDropped: 0,
      itemsThrottled: 0
    };
  }
}

// =========================================================================
// Predefined policies
// =========================================================================

export const BackpressurePolicies = {
  // Conservative: trigger early, clear late
  CONSERVATIVE: {
    policy: "drop_oldest",
    highWaterMark: 0.7,
    lowWaterMark: 0.3
  },

  // Balanced: reasonable thresholds
  BALANCED: {
    policy: "drop_oldest",
    highWaterMark: 0.8,
    lowWaterMark: 0.5
  },

  // Aggressive: trigger late, clear early
  AGGRESSIVE: {
    policy: "drop_oldest",
    highWaterMark: 0.95,
    lowWaterMark: 0.8
  },

  // Throttle: don't drop, just refuse new items
  THROTTLE: {
    policy: "throttle",
    highWaterMark: 0.8,
    lowWaterMark: 0.5
  }
};

/**
 * Factory function to create a policy
 */
export function createBackpressurePolicy(type = "BALANCED") {
  const config = BackpressurePolicies[type] || BackpressurePolicies.BALANCED;
  return new BackpressurePolicy(config);
}