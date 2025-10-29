/**
 * Multi-Tier Recovery Hierarchy
 *
 * Implements 4-tier recovery strategy:
 * 1. Soft Recovery - Retry without disruption
 * 2. Hard Recovery - Reset component state
 * 3. Failover - Switch to backup service
 * 4. Reset - Full system restart
 *
 * Recovery decisions based on:
 * - Error frequency
 * - Error severity
 * - Service health
 * - SLA requirements
 */

const EventEmitter = require('events');

/**
 * Recovery tiers
 */
const RecoveryTier = {
  SOFT: 'soft',           // Retry with backoff
  HARD: 'hard',           // Reset component
  FAILOVER: 'failover',   // Switch to backup
  RESET: 'reset'          // Full restart
};

/**
 * Component health states
 */
const HealthState = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  FAILED: 'failed'
};

/**
 * Error severity levels
 */
const ErrorSeverity = {
  LOW: 'low',           // Transient, recoverable
  MEDIUM: 'medium',     // Persistent but recoverable
  HIGH: 'high',         // Service degradation
  CRITICAL: 'critical'  // Service failure
};

class RecoveryManager extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      // Soft recovery settings
      softRetryMax: config.softRetryMax || 3,
      softRetryDelay: config.softRetryDelay || 1000,  // ms
      softRetryBackoff: config.softRetryBackoff || 2.0,

      // Hard recovery settings
      hardRetryMax: config.hardRetryMax || 2,
      hardResetTimeout: config.hardResetTimeout || 5000,  // ms

      // Failover settings
      failoverEnabled: config.failoverEnabled !== false,
      failoverTimeout: config.failoverTimeout || 10000,  // ms

      // Reset settings
      resetCooldown: config.resetCooldown || 60000,  // ms

      // Health monitoring
      healthCheckInterval: config.healthCheckInterval || 5000,  // ms
      degradedThreshold: config.degradedThreshold || 0.7,  // 70% success rate
      unhealthyThreshold: config.unhealthyThreshold || 0.5,  // 50% success rate

      // Error tracking
      errorWindowSize: config.errorWindowSize || 100,  // Track last N operations
      errorWindowTime: config.errorWindowTime || 60000,  // 1 minute window

      ...config
    };

    // Component registry
    this.components = new Map();

    // Error tracking
    this.errorHistory = new Map();  // componentId -> error array

    // Recovery state
    this.recoveryInProgress = new Map();  // componentId -> recovery tier
    this.lastResetTime = new Map();  // componentId -> timestamp

    // Health monitoring
    this.healthChecks = new Map();  // componentId -> interval ID

    // Statistics
    this.stats = {
      softRecoveries: 0,
      hardRecoveries: 0,
      failovers: 0,
      resets: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0
    };

    console.log('[RecoveryManager] Initialized with config:', {
      softRetryMax: this.config.softRetryMax,
      hardRetryMax: this.config.hardRetryMax,
      failoverEnabled: this.config.failoverEnabled
    });
  }

  /**
   * Register a component for recovery management
   */
  registerComponent(componentId, component) {
    if (this.components.has(componentId)) {
      console.log(`[RecoveryManager] Component ${componentId} already registered`);
      return;
    }

    const componentInfo = {
      id: componentId,
      component,
      health: HealthState.HEALTHY,
      operations: {
        total: 0,
        successful: 0,
        failed: 0
      },
      lastHealthCheck: Date.now(),
      backup: component.backup || null
    };

    this.components.set(componentId, componentInfo);
    this.errorHistory.set(componentId, []);

    // Start health monitoring
    if (component.healthCheck && typeof component.healthCheck === 'function') {
      this.startHealthMonitoring(componentId);
    }

    console.log(`[RecoveryManager] Registered component: ${componentId}`);
    this.emit('component:registered', { componentId });
  }

  /**
   * Unregister a component
   */
  unregisterComponent(componentId) {
    if (!this.components.has(componentId)) {
      return;
    }

    this.stopHealthMonitoring(componentId);
    this.components.delete(componentId);
    this.errorHistory.delete(componentId);
    this.recoveryInProgress.delete(componentId);

    console.log(`[RecoveryManager] Unregistered component: ${componentId}`);
    this.emit('component:unregistered', { componentId });
  }

  /**
   * Handle error with appropriate recovery tier
   */
  async handleError(componentId, error, context = {}) {
    const startTime = Date.now();

    console.log(`[RecoveryManager] Handling error for ${componentId}:`, error.message);

    // Record error
    this.recordError(componentId, error, context);

    // Determine recovery tier
    const tier = this.determineRecoveryTier(componentId, error, context);
    console.log(`[RecoveryManager] Selected recovery tier: ${tier}`);

    // Execute recovery
    try {
      const result = await this.executeRecovery(componentId, tier, error, context);

      const duration = Date.now() - startTime;
      console.log(`[RecoveryManager] Recovery ${result.success ? 'succeeded' : 'failed'} in ${duration}ms`);

      this.emit('recovery:complete', {
        componentId,
        tier,
        success: result.success,
        duration,
        error
      });

      if (result.success) {
        this.stats.successfulRecoveries++;
      } else {
        this.stats.failedRecoveries++;
      }

      return result;
    } catch (recoveryError) {
      console.error(`[RecoveryManager] Recovery failed:`, recoveryError);
      this.stats.failedRecoveries++;

      this.emit('recovery:failed', {
        componentId,
        tier,
        error,
        recoveryError
      });

      return { success: false, tier, error: recoveryError };
    }
  }

  /**
   * Determine appropriate recovery tier
   */
  determineRecoveryTier(componentId, error, context) {
    const componentInfo = this.components.get(componentId);
    if (!componentInfo) {
      return RecoveryTier.SOFT;  // Default for unregistered components
    }

    const severity = this.classifyErrorSeverity(error, context);
    const errorRate = this.getErrorRate(componentId);
    const health = componentInfo.health;
    const totalOps = componentInfo.operations.total;
    const failedOps = componentInfo.operations.failed;

    // Critical errors always trigger failover or reset
    if (severity === ErrorSeverity.CRITICAL) {
      if (this.config.failoverEnabled && componentInfo.backup) {
        return RecoveryTier.FAILOVER;
      }
      return RecoveryTier.RESET;
    }

    // Check if already in recovery
    const currentRecovery = this.recoveryInProgress.get(componentId);
    if (currentRecovery) {
      return this.escalateRecoveryTier(currentRecovery);
    }

    // For first few errors, default to soft recovery unless severity is high
    if (totalOps < 5) {
      if (severity === ErrorSeverity.HIGH) {
        return RecoveryTier.HARD;
      }
      return RecoveryTier.SOFT;
    }

    // Unhealthy components need hard recovery or failover
    if (health === HealthState.UNHEALTHY || health === HealthState.FAILED) {
      // High error count with high rate - escalate to failover/reset
      if (failedOps >= 10 && errorRate > 0.7) {
        if (this.config.failoverEnabled && componentInfo.backup) {
          return RecoveryTier.FAILOVER;
        }
        return RecoveryTier.RESET;
      }
      return RecoveryTier.HARD;
    }

    // Degraded components with high error rate
    if (health === HealthState.DEGRADED && errorRate > 0.5) {
      return RecoveryTier.HARD;
    }

    // High severity errors
    if (severity === ErrorSeverity.HIGH) {
      return RecoveryTier.HARD;
    }

    // Default to soft recovery
    return RecoveryTier.SOFT;
  }

  /**
   * Execute recovery at specified tier
   */
  async executeRecovery(componentId, tier, error, context) {
    this.recoveryInProgress.set(componentId, tier);

    try {
      let result;

      switch (tier) {
        case RecoveryTier.SOFT:
          result = await this.softRecovery(componentId, error, context);
          this.stats.softRecoveries++;
          break;

        case RecoveryTier.HARD:
          result = await this.hardRecovery(componentId, error, context);
          this.stats.hardRecoveries++;
          break;

        case RecoveryTier.FAILOVER:
          result = await this.failoverRecovery(componentId, error, context);
          this.stats.failovers++;
          break;

        case RecoveryTier.RESET:
          result = await this.resetRecovery(componentId, error, context);
          this.stats.resets++;
          break;

        default:
          throw new Error(`Unknown recovery tier: ${tier}`);
      }

      this.recoveryInProgress.delete(componentId);
      return result;

    } catch (err) {
      this.recoveryInProgress.delete(componentId);
      throw err;
    }
  }

  /**
   * Soft Recovery - Retry with exponential backoff
   */
  async softRecovery(componentId, error, context) {
    console.log(`[RecoveryManager] Executing SOFT recovery for ${componentId}`);

    const componentInfo = this.components.get(componentId);
    const operation = context.operation;

    if (!operation || typeof operation !== 'function') {
      console.warn('[RecoveryManager] No operation provided for soft recovery');
      return { success: false, tier: RecoveryTier.SOFT, reason: 'no_operation' };
    }

    let delay = this.config.softRetryDelay;

    for (let attempt = 1; attempt <= this.config.softRetryMax; attempt++) {
      console.log(`[RecoveryManager] Soft recovery attempt ${attempt}/${this.config.softRetryMax}`);

      await this.sleep(delay);

      try {
        const result = await operation();
        console.log(`[RecoveryManager] Soft recovery succeeded on attempt ${attempt}`);

        // Update component health
        if (componentInfo) {
          componentInfo.operations.successful++;
          this.updateComponentHealth(componentId);
        }

        return { success: true, tier: RecoveryTier.SOFT, attempt };
      } catch (retryError) {
        console.log(`[RecoveryManager] Retry attempt ${attempt} failed:`, retryError.message);

        if (attempt < this.config.softRetryMax) {
          delay *= this.config.softRetryBackoff;
        }
      }
    }

    console.log(`[RecoveryManager] Soft recovery failed after ${this.config.softRetryMax} attempts`);
    return { success: false, tier: RecoveryTier.SOFT, reason: 'max_retries' };
  }

  /**
   * Hard Recovery - Reset component state
   */
  async hardRecovery(componentId, error, context) {
    console.log(`[RecoveryManager] Executing HARD recovery for ${componentId}`);

    const componentInfo = this.components.get(componentId);
    if (!componentInfo) {
      return { success: false, tier: RecoveryTier.HARD, reason: 'component_not_found' };
    }

    const component = componentInfo.component;

    // Check if component has reset method
    if (!component.reset || typeof component.reset !== 'function') {
      console.warn(`[RecoveryManager] Component ${componentId} has no reset method`);
      return { success: false, tier: RecoveryTier.HARD, reason: 'no_reset_method' };
    }

    try {
      // Call component reset
      await Promise.race([
        component.reset(),
        this.timeout(this.config.hardResetTimeout)
      ]);

      console.log(`[RecoveryManager] Component ${componentId} reset successfully`);

      // Clear error history
      this.errorHistory.set(componentId, []);

      // Reset health state
      componentInfo.health = HealthState.HEALTHY;
      componentInfo.operations = { total: 0, successful: 0, failed: 0 };

      // Retry operation if provided
      if (context.operation && typeof context.operation === 'function') {
        try {
          await context.operation();
          componentInfo.operations.successful++;
          return { success: true, tier: RecoveryTier.HARD };
        } catch (opError) {
          console.log(`[RecoveryManager] Operation failed after hard reset:`, opError.message);
          componentInfo.operations.failed++;
        }
      }

      return { success: true, tier: RecoveryTier.HARD };

    } catch (resetError) {
      console.error(`[RecoveryManager] Hard recovery failed:`, resetError);
      return { success: false, tier: RecoveryTier.HARD, error: resetError };
    }
  }

  /**
   * Failover Recovery - Switch to backup service
   */
  async failoverRecovery(componentId, error, context) {
    console.log(`[RecoveryManager] Executing FAILOVER recovery for ${componentId}`);

    const componentInfo = this.components.get(componentId);
    if (!componentInfo) {
      return { success: false, tier: RecoveryTier.FAILOVER, reason: 'component_not_found' };
    }

    if (!componentInfo.backup) {
      console.warn(`[RecoveryManager] No backup available for ${componentId}`);
      // Escalate to reset
      return await this.resetRecovery(componentId, error, context);
    }

    try {
      const backup = componentInfo.backup;

      // Initialize backup if needed
      if (backup.initialize && typeof backup.initialize === 'function') {
        await Promise.race([
          backup.initialize(),
          this.timeout(this.config.failoverTimeout)
        ]);
      }

      // Swap primary and backup
      componentInfo.component = backup;
      componentInfo.backup = null;  // Original component now unavailable

      console.log(`[RecoveryManager] Failover to backup for ${componentId} successful`);

      // Clear error history
      this.errorHistory.set(componentId, []);
      componentInfo.health = HealthState.HEALTHY;

      // Retry operation with backup
      if (context.operation && typeof context.operation === 'function') {
        try {
          await context.operation();
          componentInfo.operations.successful++;
        } catch (opError) {
          console.log(`[RecoveryManager] Operation failed after failover:`, opError.message);
          componentInfo.operations.failed++;
        }
      }

      return { success: true, tier: RecoveryTier.FAILOVER };

    } catch (failoverError) {
      console.error(`[RecoveryManager] Failover failed:`, failoverError);
      // Escalate to reset
      return await this.resetRecovery(componentId, error, context);
    }
  }

  /**
   * Reset Recovery - Full system restart
   */
  async resetRecovery(componentId, error, context) {
    console.log(`[RecoveryManager] Executing RESET recovery for ${componentId}`);

    // Check reset cooldown
    const lastReset = this.lastResetTime.get(componentId);
    if (lastReset && Date.now() - lastReset < this.config.resetCooldown) {
      const remaining = this.config.resetCooldown - (Date.now() - lastReset);
      console.warn(`[RecoveryManager] Reset cooldown active, ${remaining}ms remaining`);
      return { success: false, tier: RecoveryTier.RESET, reason: 'cooldown_active' };
    }

    this.lastResetTime.set(componentId, Date.now());

    // Emit reset event for system orchestrator to handle
    this.emit('recovery:reset_required', {
      componentId,
      error,
      context
    });

    console.log(`[RecoveryManager] Reset initiated for ${componentId}`);

    // Note: Actual reset is handled by system orchestrator
    // This manager only coordinates the decision

    return { success: true, tier: RecoveryTier.RESET, pending: true };
  }

  /**
   * Classify error severity
   */
  classifyErrorSeverity(error, context) {
    // Check explicit severity in context
    if (context.severity) {
      return context.severity;
    }

    // Classify by error type
    const errorType = error.constructor.name;
    const errorMessage = error.message?.toLowerCase() || '';

    // Critical errors
    if (errorType === 'FatalError' ||
        errorMessage.includes('fatal') ||
        errorMessage.includes('unrecoverable')) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity errors
    if (errorType === 'TimeoutError' ||
        errorType === 'ConnectionError' ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('network')) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity errors
    if (errorType === 'ValidationError' ||
        errorMessage.includes('invalid') ||
        errorMessage.includes('parse')) {
      return ErrorSeverity.MEDIUM;
    }

    // Default to low severity
    return ErrorSeverity.LOW;
  }

  /**
   * Record error in history
   */
  recordError(componentId, error, context) {
    if (!this.errorHistory.has(componentId)) {
      this.errorHistory.set(componentId, []);
    }

    const errors = this.errorHistory.get(componentId);
    errors.push({
      timestamp: Date.now(),
      error: error.message,
      severity: this.classifyErrorSeverity(error, context),
      context
    });

    // Trim error history
    const cutoffTime = Date.now() - this.config.errorWindowTime;
    const recentErrors = errors.filter(e => e.timestamp > cutoffTime);

    if (recentErrors.length > this.config.errorWindowSize) {
      recentErrors.splice(0, recentErrors.length - this.config.errorWindowSize);
    }

    this.errorHistory.set(componentId, recentErrors);

    // Update component operations
    const componentInfo = this.components.get(componentId);
    if (componentInfo) {
      componentInfo.operations.total++;
      componentInfo.operations.failed++;
      this.updateComponentHealth(componentId);
    }
  }

  /**
   * Get error rate for component
   */
  getErrorRate(componentId) {
    const errors = this.errorHistory.get(componentId) || [];
    const componentInfo = this.components.get(componentId);

    if (!componentInfo || componentInfo.operations.total === 0) {
      return 0;
    }

    return componentInfo.operations.failed / componentInfo.operations.total;
  }

  /**
   * Update component health state
   */
  updateComponentHealth(componentId) {
    const componentInfo = this.components.get(componentId);
    if (!componentInfo) return;

    const totalOps = componentInfo.operations.total;
    const successRate = totalOps > 0 ?
      componentInfo.operations.successful / totalOps : 1.0;

    const previousHealth = componentInfo.health;

    // Require minimum operations before degrading health
    // This prevents first-error overreaction
    if (totalOps < 5) {
      // Don't degrade health based on first few operations
      return;
    }

    // Calculate health state based on success rate
    if (successRate >= this.config.degradedThreshold) {
      componentInfo.health = HealthState.HEALTHY;
    } else if (successRate >= this.config.unhealthyThreshold) {
      componentInfo.health = HealthState.DEGRADED;
    } else if (successRate > 0) {
      componentInfo.health = HealthState.UNHEALTHY;
    } else {
      componentInfo.health = HealthState.FAILED;
    }

    if (componentInfo.health !== previousHealth) {
      console.log(`[RecoveryManager] Component ${componentId} health: ${previousHealth} → ${componentInfo.health}`);
      this.emit('component:health_changed', {
        componentId,
        previousHealth,
        currentHealth: componentInfo.health,
        successRate
      });
    }
  }

  /**
   * Start health monitoring for component
   */
  startHealthMonitoring(componentId) {
    if (this.healthChecks.has(componentId)) {
      return;
    }

    const componentInfo = this.components.get(componentId);
    if (!componentInfo) return;

    const intervalId = setInterval(async () => {
      try {
        const isHealthy = await componentInfo.component.healthCheck();
        componentInfo.lastHealthCheck = Date.now();

        if (!isHealthy && componentInfo.health === HealthState.HEALTHY) {
          componentInfo.health = HealthState.DEGRADED;
          this.emit('component:health_changed', {
            componentId,
            previousHealth: HealthState.HEALTHY,
            currentHealth: HealthState.DEGRADED
          });
        }
      } catch (error) {
        console.error(`[RecoveryManager] Health check failed for ${componentId}:`, error.message);
      }
    }, this.config.healthCheckInterval);

    this.healthChecks.set(componentId, intervalId);
  }

  /**
   * Stop health monitoring for component
   */
  stopHealthMonitoring(componentId) {
    const intervalId = this.healthChecks.get(componentId);
    if (intervalId) {
      clearInterval(intervalId);
      this.healthChecks.delete(componentId);
    }
  }

  /**
   * Escalate recovery tier
   */
  escalateRecoveryTier(currentTier) {
    switch (currentTier) {
      case RecoveryTier.SOFT:
        return RecoveryTier.HARD;
      case RecoveryTier.HARD:
        return RecoveryTier.FAILOVER;
      case RecoveryTier.FAILOVER:
        return RecoveryTier.RESET;
      default:
        return RecoveryTier.RESET;
    }
  }

  /**
   * Get component health status
   */
  getComponentHealth(componentId) {
    const componentInfo = this.components.get(componentId);
    if (!componentInfo) {
      return null;
    }

    return {
      componentId,
      health: componentInfo.health,
      operations: { ...componentInfo.operations },
      errorRate: this.getErrorRate(componentId),
      lastHealthCheck: componentInfo.lastHealthCheck,
      recentErrors: this.errorHistory.get(componentId)?.slice(-10) || []
    };
  }

  /**
   * Get system-wide health status
   */
  getSystemHealth() {
    const components = [];

    for (const [componentId, info] of this.components) {
      components.push(this.getComponentHealth(componentId));
    }

    return {
      components,
      stats: { ...this.stats },
      timestamp: Date.now()
    };
  }

  /**
   * Utility: sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility: timeout promise
   */
  timeout(ms) {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timeout')), ms)
    );
  }

  /**
   * Shutdown recovery manager
   */
  async shutdown() {
    console.log('[RecoveryManager] Shutting down...');

    // Stop all health monitoring
    for (const componentId of this.healthChecks.keys()) {
      this.stopHealthMonitoring(componentId);
    }

    this.components.clear();
    this.errorHistory.clear();
    this.recoveryInProgress.clear();

    console.log('[RecoveryManager] Shutdown complete');
  }
}

module.exports = {
  RecoveryManager,
  RecoveryTier,
  HealthState,
  ErrorSeverity
};
