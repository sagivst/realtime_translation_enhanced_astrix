// STTTTSserver/Monitoring_Stations/MonitoringStationsBootstrap.js
// MANDATORY: The ONLY entry point for the NEW monitoring system
// Initializes and wires all components together

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Core components
import { MetricsRegistry } from './station/generic/MetricsRegistry.js';
import { KnobsRegistry } from './station/generic/KnobsRegistry.js';
import { St_Handler_Generic } from './station/generic/St_Handler_Generic.js';
import { Aggregator } from './station/generic/Aggregator.js';
import { KnobsResolver } from './station/generic/KnobsResolver.js';

// Station handlers
import { Station3_3333_Handler } from './station/stations/Station3_3333_Handler.js';

// Audio components
import { AudioRecorder } from './audio/AudioRecorder.js';
import { AudioWriter } from './audio/AudioWriter.js';

// Bridge components
import { MetricsEmitter } from './bridge/MetricsEmitter.js';
import { DatabaseBridge } from './bridge/DatabaseBridge.js';
import { BackpressurePolicy, createBackpressurePolicy } from './bridge/BackpressurePolicy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MonitoringStationsBootstrap {
  constructor() {
    this.isInitialized = false;
    this.isRunning = false;
    this.components = {};

    console.log(`
    ╔════════════════════════════════════════════════════════════╗
    ║      NEW Monitoring Framework - Station Bootstrap         ║
    ║                    INITIALIZING...                        ║
    ╚════════════════════════════════════════════════════════════╝
    `);
  }

  /**
   * Initialize all components
   */
  async initialize(config = {}) {
    if (this.isInitialized) {
      console.warn('[MonitoringBootstrap] Already initialized');
      return;
    }

    try {
      // 1. Load configuration
      console.log('[MonitoringBootstrap] Step 1: Loading configuration...');
      const configuration = await this._loadConfiguration(config);

      // 2. Initialize Database Bridge
      console.log('[MonitoringBootstrap] Step 2: Initializing Database Bridge...');
      this.components.databaseBridge = new DatabaseBridge(configuration.database);
      await this.components.databaseBridge.testConnection();

      // 3. Initialize Metrics Emitter
      console.log('[MonitoringBootstrap] Step 3: Initializing Metrics Emitter...');
      this.components.metricsEmitter = new MetricsEmitter({
        databaseBridge: this.components.databaseBridge,
        ...configuration.metricsEmitter
      });

      // 4. Initialize Audio Writer
      console.log('[MonitoringBootstrap] Step 4: Initializing Audio Writer...');
      this.components.audioWriter = new AudioWriter({
        databaseBridge: this.components.databaseBridge,
        ...configuration.audioWriter
      });

      // 5. Initialize Audio Recorder
      console.log('[MonitoringBootstrap] Step 5: Initializing Audio Recorder...');
      this.components.audioRecorder = new AudioRecorder({
        audioWriter: this.components.audioWriter,
        ...configuration.audioRecorder
      });

      // 6. Initialize Generic Handler
      console.log('[MonitoringBootstrap] Step 6: Initializing Generic Handler...');
      this.components.genericHandler = new St_Handler_Generic({
        config: configuration.stations,
        metricsEmitter: this.components.metricsEmitter,
        audioRecorder: this.components.audioRecorder,
        bucketMs: 5000 // MANDATORY
      });

      // 7. Register Station Handlers
      console.log('[MonitoringBootstrap] Step 7: Registering Station Handlers...');
      this._registerStations();

      // 8. Setup cleanup handlers
      this._setupCleanupHandlers();

      // 9. Schedule retention cleanup
      this._scheduleRetentionCleanup();

      this.isInitialized = true;
      console.log(`
    ╔════════════════════════════════════════════════════════════╗
    ║                  INITIALIZATION COMPLETE                  ║
    ║             Ready to start monitoring stations            ║
    ╚════════════════════════════════════════════════════════════╝
      `);

      return true;
    } catch (error) {
      console.error('[MonitoringBootstrap] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start all monitoring components
   */
  async start() {
    if (!this.isInitialized) {
      throw new Error('MonitoringBootstrap not initialized. Call initialize() first.');
    }

    if (this.isRunning) {
      console.warn('[MonitoringBootstrap] Already running');
      return;
    }

    console.log('[MonitoringBootstrap] Starting all components...');

    // Start components in order
    this.components.genericHandler.start();
    this.components.metricsEmitter.start();
    this.components.audioWriter.start();

    this.isRunning = true;

    console.log(`
    ╔════════════════════════════════════════════════════════════╗
    ║                   MONITORING ACTIVE                       ║
    ║            Station 3_3333: ONLINE                        ║
    ║            Station 3_4444: READY                         ║
    ╚════════════════════════════════════════════════════════════╝
    `);

    // Start stats reporting
    this._startStatsReporting();
  }

  /**
   * Stop all monitoring components
   */
  async stop() {
    if (!this.isRunning) {
      console.warn('[MonitoringBootstrap] Not running');
      return;
    }

    console.log('[MonitoringBootstrap] Stopping all components...');

    // Stop components in reverse order
    this.components.genericHandler.stop();
    this.components.metricsEmitter.stop();
    this.components.audioWriter.stop();

    // Final stats
    this._reportFinalStats();

    this.isRunning = false;

    console.log(`
    ╔════════════════════════════════════════════════════════════╗
    ║                   MONITORING STOPPED                      ║
    ╚════════════════════════════════════════════════════════════╝
    `);
  }

  /**
   * Process a frame through the monitoring system
   * This is called by STTTTSserver for each audio frame
   */
  processFrame(frame, ctx, stationKey = "St_3_3333") {
    if (!this.isRunning) {
      return frame; // Pass-through if not running
    }

    const handler = this.components.genericHandler.stationHandlers.get(stationKey);
    if (!handler) {
      console.warn(`[MonitoringBootstrap] Unknown station: ${stationKey}`);
      return frame;
    }

    // Process through the handler
    return handler.onFrame(frame, ctx, this.components.genericHandler);
  }

  /**
   * Update a knob value
   */
  updateKnob(key, value, source = "manual") {
    if (!this.components.genericHandler) {
      throw new Error('Generic handler not initialized');
    }

    const result = this.components.genericHandler.knobsResolver.updateGlobalKnob(key, value, source);

    // Log to database
    if (this.components.databaseBridge) {
      this.components.databaseBridge.logKnobEvent({
        station_key: "global",
        knob_key: key,
        old_value: result.oldValue,
        new_value: result.newValue,
        source: source
      }).catch(e => console.error('[MonitoringBootstrap] Failed to log knob event:', e));
    }

    return result;
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      initialized: this.isInitialized,
      running: this.isRunning,
      components: {
        metricsEmitter: this.components.metricsEmitter?.getStats(),
        audioRecorder: this.components.audioRecorder?.getState(),
        audioWriter: this.components.audioWriter?.getStats(),
        databaseBridge: this.components.databaseBridge?.getStats()
      }
    };
  }

  // =========================================================================
  // Private methods
  // =========================================================================

  async _loadConfiguration(overrides = {}) {
    // Default configuration
    const defaultConfig = {
      database: {
        host: "localhost",
        port: 5432,
        database: "monitoring_v2",
        user: "monitoring_user",
        password: "monitoring_pass",
        maxConnections: 10
      },
      metricsEmitter: {
        maxQueueSize: 10000,
        flushIntervalMs: 200,
        batchSize: 100
      },
      audioWriter: {
        baseDir: "/var/monitoring/audio",
        maxQueue: 5000,
        flushIntervalMs: 50
      },
      audioRecorder: {
        bucketMs: 5000,
        sampleRateHz: 16000,
        channels: 1
      },
      stations: {
        knobs: {}
      }
    };

    // Try to load config file
    const configPath = path.join(__dirname, 'config', 'monitoring.config.json');
    let fileConfig = {};

    try {
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        fileConfig = JSON.parse(configContent);
        console.log('[MonitoringBootstrap] Loaded config from file:', configPath);
      }
    } catch (error) {
      console.warn('[MonitoringBootstrap] Failed to load config file:', error.message);
    }

    // Merge configurations: defaults < file < overrides
    return this._deepMerge(defaultConfig, fileConfig, overrides);
  }

  _registerStations() {
    // Register Station 3_3333
    this.components.genericHandler.registerStation(Station3_3333_Handler);
    console.log('[MonitoringBootstrap] Registered Station3_3333_Handler');

    // Register Station 3_4444 if available
    // TODO: Import and register Station3_4444_Handler when created
  }

  _setupCleanupHandlers() {
    // Graceful shutdown on signals
    const shutdown = async (signal) => {
      console.log(`[MonitoringBootstrap] Received ${signal}, shutting down gracefully...`);
      await this.stop();

      if (this.components.databaseBridge) {
        await this.components.databaseBridge.close();
      }

      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  _scheduleRetentionCleanup() {
    // Run retention cleanup every 10 minutes
    setInterval(async () => {
      if (this.components.databaseBridge) {
        console.log('[MonitoringBootstrap] Running retention cleanup...');
        await this.components.databaseBridge.runRetentionCleanup();
      }
    }, 10 * 60 * 1000); // 10 minutes
  }

  _startStatsReporting() {
    // Report stats every 30 seconds
    this.statsInterval = setInterval(() => {
      const stats = this.getStats();
      console.log('[MonitoringBootstrap] Current stats:', JSON.stringify(stats, null, 2));
    }, 30000);

    if (this.statsInterval?.unref) {
      this.statsInterval.unref();
    }
  }

  _reportFinalStats() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    const stats = this.getStats();
    console.log('[MonitoringBootstrap] Final stats:', JSON.stringify(stats, null, 2));
  }

  _deepMerge(...objects) {
    const result = {};

    for (const obj of objects) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            result[key] = this._deepMerge(result[key] || {}, obj[key]);
          } else {
            result[key] = obj[key];
          }
        }
      }
    }

    return result;
  }
}

// =========================================================================
// Singleton instance
// =========================================================================

let instance = null;

export function getMonitoringBootstrap() {
  if (!instance) {
    instance = new MonitoringStationsBootstrap();
  }
  return instance;
}

// Export for direct use
export default MonitoringStationsBootstrap;