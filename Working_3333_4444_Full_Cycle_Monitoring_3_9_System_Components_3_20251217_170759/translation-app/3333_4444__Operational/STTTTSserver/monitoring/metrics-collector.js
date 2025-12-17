const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class MetricsCollector {
  constructor() {
    this.metrics = new Map();
    this.intervals = new Map();
  }

  start() {
    console.log('[MetricsCollector] Starting metrics collection...');
    
    // Collect UDP metrics every 10 seconds
    this.intervals.set('udp', setInterval(() => this.collectUDPMetrics(), 10000));
    
    // Collect Asterisk metrics every 30 seconds
    this.intervals.set('asterisk', setInterval(() => this.collectAsteriskMetrics(), 30000));
  }

  async collectUDPMetrics() {
    try {
      const { stdout } = await execAsync('ss -unH | grep -E ":(6120|6121|6122|6123)"');
      const lines = stdout.trim().split('\n').filter(l => l);

      lines.forEach(line => {
        const parts = line.split(/\s+/);
        const localAddr = parts[3];
        const port = localAddr?.split(':').pop();

        if (port) {
          this.metrics.set(`udp-${port}`, {
            recv_queue: parseInt(parts[1]) || 0,
            send_queue: parseInt(parts[2]) || 0,
            timestamp: Date.now()
          });
        }
      });
    } catch (error) {
      // Silent fail - UDP metrics are optional
    }
  }

  async collectAsteriskMetrics() {
    try {
      const { stdout: channels } = await execAsync('asterisk -rx "core show channels count" 2>/dev/null');
      const channelMatch = channels.match(/(\d+) active channel/);
      
      this.metrics.set('asterisk-channels', {
        count: channelMatch ? parseInt(channelMatch[1]) : 0,
        timestamp: Date.now()
      });
    } catch (error) {
      // Silent fail - Asterisk metrics are optional
    }
  }

  getMetrics(key) {
    return this.metrics.get(key) || {};
  }

  getAllMetrics() {
    const result = {};
    this.metrics.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  stop() {
    this.intervals.forEach(interval => clearInterval(interval));
  }
}

// Export singleton instance
const collector = new MetricsCollector();
module.exports = collector;
