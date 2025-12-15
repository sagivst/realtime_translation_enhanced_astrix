/**
 * PM2 Control Module
 * Provides programmatic API for controlling PM2 processes
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class PM2Control {
  constructor() {
    // Map service names to PM2 app names from ecosystem config
    this.serviceMap = {
      'database-api-server': 'database-api-server',
      'monitoring-server': 'monitoring-server',
      'monitoring-bridge': 'monitoring-bridge',
      'metrics-emitter': 'metrics-emitter',
      'gateway-3333': 'gateway-3333',
      'gateway-4444': 'gateway-4444',
      'ari-gstreamer': 'ari-gstreamer',
      'sttttserver': 'sttttserver',
      'STTTTSserver': 'sttttserver',
      'cloudflared': 'cloudflared'
    };
  }

  /**
   * Get the status of all PM2 processes
   * @returns {Promise<Array>} Array of process information
   */
  async status() {
    try {
      const { stdout } = await execPromise('pm2 jlist');
      return JSON.parse(stdout || '[]');
    } catch (error) {
      console.error('Error getting PM2 status:', error);
      return [];
    }
  }

  /**
   * Get detailed status of a specific process
   * @param {string} appName - Name of the application
   * @returns {Promise<Object|null>} Process information or null if not found
   */
  async getProcessInfo(appName) {
    try {
      const normalizedName = this.serviceMap[appName] || appName;
      const processes = await this.status();
      return processes.find(p => p.name === normalizedName) || null;
    } catch (error) {
      console.error(`Error getting process info for ${appName}:`, error);
      return null;
    }
  }

  /**
   * Start a process
   * @param {string} appName - Name of the application to start
   * @returns {Promise<Object>} Result object
   */
  async start(appName) {
    try {
      const normalizedName = this.serviceMap[appName] || appName;
      const { stdout, stderr } = await execPromise(`pm2 start ${normalizedName}`);
      return {
        success: true,
        message: `Started ${normalizedName}`,
        stdout,
        stderr
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to start ${appName}: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Stop a process
   * @param {string} appName - Name of the application to stop
   * @returns {Promise<Object>} Result object
   */
  async stop(appName) {
    try {
      const normalizedName = this.serviceMap[appName] || appName;
      const { stdout, stderr } = await execPromise(`pm2 stop ${normalizedName}`);
      return {
        success: true,
        message: `Stopped ${normalizedName}`,
        stdout,
        stderr
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to stop ${appName}: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Restart a process
   * @param {string} appName - Name of the application to restart
   * @returns {Promise<Object>} Result object
   */
  async restart(appName) {
    try {
      const normalizedName = this.serviceMap[appName] || appName;
      const { stdout, stderr } = await execPromise(`pm2 restart ${normalizedName}`);
      return {
        success: true,
        message: `Restarted ${normalizedName}`,
        stdout,
        stderr
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to restart ${appName}: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Reload a process (zero-downtime restart)
   * @param {string} appName - Name of the application to reload
   * @returns {Promise<Object>} Result object
   */
  async reload(appName) {
    try {
      const normalizedName = this.serviceMap[appName] || appName;
      const { stdout, stderr } = await execPromise(`pm2 reload ${normalizedName}`);
      return {
        success: true,
        message: `Reloaded ${normalizedName}`,
        stdout,
        stderr
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to reload ${appName}: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Delete a process from PM2
   * @param {string} appName - Name of the application to delete
   * @returns {Promise<Object>} Result object
   */
  async delete(appName) {
    try {
      const normalizedName = this.serviceMap[appName] || appName;
      const { stdout, stderr } = await execPromise(`pm2 delete ${normalizedName}`);
      return {
        success: true,
        message: `Deleted ${normalizedName}`,
        stdout,
        stderr
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete ${appName}: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Get logs for a specific process
   * @param {string} appName - Name of the application
   * @param {number} lines - Number of lines to retrieve (default: 50)
   * @returns {Promise<Object>} Logs object
   */
  async logs(appName, lines = 50) {
    try {
      const normalizedName = this.serviceMap[appName] || appName;
      const { stdout } = await execPromise(`pm2 logs ${normalizedName} --nostream --lines ${lines}`);
      return {
        success: true,
        logs: stdout
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get logs for ${appName}: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Get process metrics (CPU, memory, etc.)
   * @param {string} appName - Name of the application
   * @returns {Promise<Object>} Metrics object
   */
  async metrics(appName) {
    try {
      const processInfo = await this.getProcessInfo(appName);
      if (!processInfo) {
        return {
          success: false,
          message: `Process ${appName} not found`
        };
      }

      return {
        success: true,
        metrics: {
          name: processInfo.name,
          pid: processInfo.pid,
          status: processInfo.pm2_env.status,
          cpu: processInfo.monit.cpu,
          memory: processInfo.monit.memory,
          uptime: Date.now() - processInfo.pm2_env.pm_uptime,
          restarts: processInfo.pm2_env.restart_time,
          unstable_restarts: processInfo.pm2_env.unstable_restarts
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get metrics for ${appName}: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Check if PM2 daemon is running
   * @returns {Promise<boolean>} True if PM2 is running
   */
  async isRunning() {
    try {
      const { stdout } = await execPromise('pm2 pid');
      return stdout.trim() !== '';
    } catch (error) {
      return false;
    }
  }

  /**
   * Start PM2 daemon if not running
   * @returns {Promise<Object>} Result object
   */
  async ensureDaemon() {
    try {
      const running = await this.isRunning();
      if (!running) {
        await execPromise('pm2 resurrect');
        return {
          success: true,
          message: 'PM2 daemon started'
        };
      }
      return {
        success: true,
        message: 'PM2 daemon already running'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to start PM2 daemon: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Save current PM2 process list
   * @returns {Promise<Object>} Result object
   */
  async save() {
    try {
      const { stdout } = await execPromise('pm2 save');
      return {
        success: true,
        message: 'PM2 process list saved',
        stdout
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to save PM2 list: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Get comprehensive health status for all processes
   * @returns {Promise<Object>} Health status object
   */
  async healthCheck() {
    try {
      const processes = await this.status();
      const health = {
        pm2_running: true,
        total_processes: processes.length,
        running: 0,
        stopped: 0,
        errored: 0,
        processes: {}
      };

      for (const process of processes) {
        const status = process.pm2_env.status;
        if (status === 'online') health.running++;
        else if (status === 'stopped') health.stopped++;
        else if (status === 'errored') health.errored++;

        health.processes[process.name] = {
          status: status,
          pid: process.pid,
          cpu: process.monit.cpu,
          memory: Math.round(process.monit.memory / 1024 / 1024) + 'MB',
          uptime: process.pm2_env.pm_uptime ? Date.now() - process.pm2_env.pm_uptime : 0,
          restarts: process.pm2_env.restart_time
        };
      }

      return health;
    } catch (error) {
      return {
        pm2_running: false,
        error: error.message
      };
    }
  }
}

module.exports = PM2Control;