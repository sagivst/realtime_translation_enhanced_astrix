/**
 * MetricCollector - Base class for all metric collectors
 *
 * Every parameter in the 75-parameter system has a collector that extends this class.
 */

class MetricCollector {
  /**
   * @param {string} id - Parameter ID (e.g., "buffer.total")
   * @param {string} name - Human-readable name
   * @param {string} unit - Unit of measurement
   * @param {Object} thresholds - Warning and critical thresholds
   * @param {Array<string>} stations - Stations where this metric applies
   */
  constructor({ id, name, unit, range, thresholds, stations, description }) {
    this.id = id;
    this.name = name;
    this.unit = unit;
    this.range = range;
    this.thresholds = thresholds;
    this.stations = stations;
    this.description = description;

    // Internal state
    this.lastValue = null;
    this.history = [];
    this.maxHistorySize = 100;
    this.alerts = [];
  }

  /**
   * Abstract method - must be implemented by subclasses
   * Collect the current metric value
   * @param {Object} context - Station-specific context (buffers, audio data, etc.)
   * @returns {Promise<number|string|null>} - Metric value
   */
  async collect(context) {
    throw new Error('collect() must be implemented by subclass');
  }

  /**
   * Validate the collected value against thresholds
   * @param {number|string} value - The collected value
   * @returns {Object} - Validation result with alert level
   */
  validate(value) {
    if (value === null || value === undefined) {
      return { valid: false, level: 'unknown', message: 'No value collected' };
    }

    // Store value
    this.lastValue = value;
    this.history.push({
      timestamp: Date.now(),
      value: value
    });

    // Trim history
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Check thresholds (numeric values only)
    if (typeof value !== 'number') {
      return { valid: true, level: 'normal', value };
    }

    const { warningLow, warningHigh, criticalLow, criticalHigh } = this.thresholds;

    // Critical thresholds
    if (criticalHigh !== null && value >= criticalHigh) {
      const alert = {
        level: 'critical',
        message: `${this.name} exceeded critical high threshold: ${value} ${this.unit} >= ${criticalHigh}`,
        value,
        threshold: criticalHigh
      };
      this.alerts.push(alert);
      return { valid: false, ...alert };
    }

    if (criticalLow !== null && value <= criticalLow) {
      const alert = {
        level: 'critical',
        message: `${this.name} below critical low threshold: ${value} ${this.unit} <= ${criticalLow}`,
        value,
        threshold: criticalLow
      };
      this.alerts.push(alert);
      return { valid: false, ...alert };
    }

    // Warning thresholds
    if (warningHigh !== null && value >= warningHigh) {
      const alert = {
        level: 'warning',
        message: `${this.name} exceeded warning high threshold: ${value} ${this.unit} >= ${warningHigh}`,
        value,
        threshold: warningHigh
      };
      this.alerts.push(alert);
      return { valid: true, ...alert };
    }

    if (warningLow !== null && value <= warningLow) {
      const alert = {
        level: 'warning',
        message: `${this.name} below warning low threshold: ${value} ${this.unit} <= ${warningLow}`,
        value,
        threshold: warningLow
      };
      this.alerts.push(alert);
      return { valid: true, ...alert };
    }

    return { valid: true, level: 'normal', value };
  }

  /**
   * Get statistics from history
   * @returns {Object} - Stats (min, max, avg, variance, etc.)
   */
  getStats() {
    if (this.history.length === 0) {
      return null;
    }

    const values = this.history.map(h => h.value).filter(v => typeof v === 'number');

    if (values.length === 0) {
      return null;
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Variance
    const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Percentiles
    const sorted = [...values].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return {
      count: values.length,
      min,
      max,
      avg,
      variance,
      stdDev,
      percentile50: p50,
      percentile95: p95,
      percentile99: p99,
      current: this.lastValue
    };
  }

  /**
   * Get recent alerts
   * @param {number} limit - Max number of alerts to return
   * @returns {Array} - Recent alerts
   */
  getAlerts(limit = 10) {
    return this.alerts.slice(-limit);
  }

  /**
   * Clear alert history
   */
  clearAlerts() {
    this.alerts = [];
  }

  /**
   * Export metric definition (for API schema)
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      unit: this.unit,
      range: this.range,
      thresholds: this.thresholds,
      stations: this.stations,
      description: this.description,
      lastValue: this.lastValue,
      stats: this.getStats()
    };
  }

  /**
   * Check if this collector applies to a given station
   * @param {string} stationId - Station ID (e.g., "STATION_3")
   * @returns {boolean}
   */
  appliesTo(stationId) {
    return this.stations.includes(stationId) || this.stations.includes('All');
  }
}

module.exports = MetricCollector;
