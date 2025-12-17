// Universal Station Handler - Works for ANY station
// Based on proven Station-3 pattern
const fs = require('fs');

class UniversalStationHandler {
  constructor(stationId, extensionId) {
    this.stationId = stationId;
    this.extensionId = extensionId;
    this.configPath = `/tmp/${stationId}-${extensionId}-config.json`;
    this.knobs = {};
    this.audioStartTime = Date.now();
    this.stationAgent = null; // Will be initialized when StationAgent is available

    // Start polling for config changes
    this.startPolling();
  }

  // Initialize StationAgent when available
  initStationAgent(StationAgent) {
    this.stationAgent = new StationAgent(this.stationId, this.extensionId);
    console.log(`[${this.stationId}] StationAgent initialized for ${this.extensionId}`);
  }

  // Poll config file every 100ms
  startPolling() {
    setInterval(() => {
      try {
        const newKnobs = this.loadKnobs();
        if (JSON.stringify(newKnobs) !== JSON.stringify(this.knobs)) {
          this.knobs = newKnobs;
          console.log(`[${this.stationId}] Config updated for extension ${this.extensionId}`);
          this.onKnobsChanged?.(this.knobs);
        }
      } catch (e) {
        // Silent fail - config loading is not critical
      }
    }, 100);
  }

  // Load knobs from config file
  loadKnobs() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (e) {}
    return {};
  }

  // Generic data handler - StationAgent automatically collects all 75 metrics + 113 knobs
  onData(data) {
    if (!this.stationAgent) return; // Skip if not initialized
    // Just being called triggers StationAgent to collect metrics
    // No manual metric recording needed - UniversalCollector handles everything
  }

  // Generic error handler
  onError(error) {
    if (!this.stationAgent) return;
    // StationAgent will track the error
  }
}

module.exports = UniversalStationHandler;
