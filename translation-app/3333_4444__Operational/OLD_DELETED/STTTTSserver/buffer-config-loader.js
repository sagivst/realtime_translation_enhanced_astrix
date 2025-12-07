/**
 * Buffer Configuration Loader
 * Loads and manages audio buffer configuration from JSON file
 * Supports hot-reload and preset application
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'audio-buffer-config.json');

class BufferConfigLoader {
  constructor() {
    this.config = null;
    this.watchers = [];
    this.watchHandle = null;
  }

  /**
   * Load configuration from JSON file
   */
  load() {
    try {
      const content = fs.readFileSync(CONFIG_FILE, 'utf8');
      this.config = JSON.parse(content);
      
      // Validate configuration
      if (!this.config.version) {
        throw new Error('Configuration missing version field');
      }
      
      if (!this.config.buffer_stations) {
        throw new Error('Configuration missing buffer_stations');
      }

      console.log(`[BufferConfig] Loaded v${this.config.version} with ${Object.keys(this.config.buffer_stations).length} stations`);
      
      return this.config;
    } catch (error) {
      console.error(`[BufferConfig] ERROR loading configuration: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get specific station configuration
   */
  getStation(stationId) {
    if (!this.config) {
      this.load();
    }
    
    const station = this.config?.buffer_stations?.[stationId];
    if (!station) {
      console.warn(`[BufferConfig] Station ${stationId} not found`);
      return null;
    }
    
    return station;
  }

  /**
   * Get all enabled stations
   */
  getEnabledStations() {
    if (!this.config) {
      this.load();
    }
    
    const enabled = {};
    for (const [id, station] of Object.entries(this.config.buffer_stations)) {
      if (station.enabled) {
        enabled[id] = station;
      }
    }
    
    return enabled;
  }

  /**
   * Get global settings
   */
  getGlobalSettings() {
    if (!this.config) {
      this.load();
    }
    
    return this.config.global_settings || {
      monitoring_interval_ms: 1000,
      alert_cooldown_ms: 5000,
      enable_dashboard: true,
      dashboard_port: 3020
    };
  }

  /**
   * Apply a preset configuration
   */
  applyPreset(presetName) {
    if (!this.config) {
      this.load();
    }
    
    const preset = this.config.presets?.[presetName];
    if (!preset) {
      console.error(`[BufferConfig] Preset '${presetName}' not found`);
      return false;
    }

    console.log(`[BufferConfig] Applying preset: ${presetName}`);
    
    // Apply multiplier to buffer sizes
    for (const station of Object.values(this.config.buffer_stations)) {
      if (preset.multiplier && station.socket_receive_buffer_bytes) {
        station.socket_receive_buffer_bytes = Math.floor(
          station.socket_receive_buffer_bytes * preset.multiplier
        );
      }
      
      if (preset.multiplier && station.socket_send_buffer_bytes) {
        station.socket_send_buffer_bytes = Math.floor(
          station.socket_send_buffer_bytes * preset.multiplier
        );
      }
      
      if (preset.multiplier && station.buffer_max_bytes) {
        station.buffer_max_bytes = Math.floor(
          station.buffer_max_bytes * preset.multiplier
        );
      }
      
      if (preset.accumulation_threshold_multiplier && station.accumulation_threshold_bytes) {
        station.accumulation_threshold_bytes = Math.floor(
          station.accumulation_threshold_bytes * preset.accumulation_threshold_multiplier
        );
      }
      
      if (preset.log_level) {
        station.log_level = preset.log_level;
      }
    }

    // Save updated configuration
    this.save();
    
    console.log(`[BufferConfig] Preset '${presetName}' applied successfully`);
    return true;
  }

  /**
   * Save configuration to file
   */
  save() {
    try {
      const content = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(CONFIG_FILE, content, 'utf8');
      console.log('[BufferConfig] Configuration saved');
      return true;
    } catch (error) {
      console.error(`[BufferConfig] ERROR saving configuration: ${error.message}`);
      return false;
    }
  }

  /**
   * Watch configuration file for changes and auto-reload
   */
  watch(callback) {
    if (this.watchHandle) {
      console.warn('[BufferConfig] Already watching configuration file');
      return this.watchHandle;
    }

    console.log('[BufferConfig] Watching for configuration changes...');
    
    this.watchHandle = fs.watch(CONFIG_FILE, (eventType) => {
      if (eventType === 'change') {
        console.log('[BufferConfig] Configuration file changed, reloading...');
        
        try {
          const newConfig = this.load();
          
          // Notify watchers
          for (const watcher of this.watchers) {
            try {
              watcher(newConfig);
            } catch (error) {
              console.error(`[BufferConfig] Watcher callback error: ${error.message}`);
            }
          }
          
          if (callback) {
            callback(newConfig);
          }
        } catch (error) {
          console.error(`[BufferConfig] ERROR reloading configuration: ${error.message}`);
        }
      }
    });

    return this.watchHandle;
  }

  /**
   * Add a callback to be notified of config changes
   */
  onConfigChange(callback) {
    this.watchers.push(callback);
  }

  /**
   * Stop watching configuration file
   */
  stopWatching() {
    if (this.watchHandle) {
      this.watchHandle.close();
      this.watchHandle = null;
      console.log('[BufferConfig] Stopped watching configuration file');
    }
  }

  /**
   * Update a station's configuration
   */
  updateStation(stationId, updates) {
    if (!this.config) {
      this.load();
    }

    const station = this.config.buffer_stations[stationId];
    if (!station) {
      console.error(`[BufferConfig] Cannot update - station ${stationId} not found`);
      return false;
    }

    Object.assign(station, updates);
    this.save();
    
    console.log(`[BufferConfig] Updated station ${stationId}`);
    return true;
  }

  /**
   * Get list of available presets
   */
  getPresets() {
    if (!this.config) {
      this.load();
    }
    
    return this.config.presets || {};
  }
}

// Export singleton instance
module.exports = new BufferConfigLoader();
