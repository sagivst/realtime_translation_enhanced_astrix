// Complete Station-3 handler - All logic in ONE place
const fs = require('fs');

class Station3Handler {
  constructor(extensionId) {
    this.extensionId = extensionId;
    this.configPath = `/tmp/STATION_3-${extensionId}-config.json`;
    this.knobs = {};
    this.audioStartTime = Date.now();
    this.stationAgent = null; // Will be initialized when StationAgent is available

    // Start polling for config changes
    this.startPolling();
  }

  // Initialize StationAgent when available
  initStationAgent(StationAgent) {
    this.stationAgent = new StationAgent('STATION_3', this.extensionId);
  }

  // Poll config file every 100ms
  startPolling() {
    setInterval(() => {
      try {
        const newKnobs = this.loadKnobs();
        if (JSON.stringify(newKnobs) !== JSON.stringify(this.knobs)) {
          this.knobs = newKnobs;
          console.log(`[STATION-3] Config updated for extension ${this.extensionId}`);
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
    return { deepgram: {} };
  }

  // Get Deepgram config from knobs
  getDeepgramConfig() {
    const dg = this.knobs.deepgram || {};
    // CRITICAL: Use nova-3 as default (current production value)
    return {
      model: dg.model || 'nova-3',
      language: dg.language || (this.extensionId === '3333' ? 'en' : 'fr'),
      encoding: 'linear16',
      sample_rate: 16000,
      channels: 1,
      punctuate: dg.punctuate !== false,
      interim_results: dg.interimResults !== false,
      endpointing: dg.endpointing || 300,
      vad_turnoff: dg.vadTurnoff || 500,
      smart_format: dg.smartFormat !== false,
      diarize: dg.diarize || false,
      utterances: true,
      numerals: true
    };
  }

  // Record transcript metrics
  onTranscript(data) {
    if (!this.stationAgent) return; // Skip if not initialized

    const confidence = data.channel?.alternatives?.[0]?.confidence || 0;
    const words = data.channel?.alternatives?.[0]?.words || [];
    const isFinal = data.is_final;

    this.stationAgent.recordMetric('stt_confidence', confidence);
    this.stationAgent.recordMetric('stt_latency', Date.now() - this.audioStartTime);
    this.stationAgent.recordMetric('words_recognized', words.length);

    if (isFinal) {
      this.audioStartTime = Date.now();
    }
  }

  // Record error metrics
  onError(error) {
    if (!this.stationAgent) return;
    this.stationAgent.recordMetric('stt_error', 1);
    this.stationAgent.recordMetric('error_type', error.type || 'unknown');
  }

  // Record metadata
  onMetadata(data) {
    if (!this.stationAgent) return;
    if (data.model_info) {
      this.stationAgent.recordMetric('model_name', data.model_info.name);
    }
  }
}

module.exports = Station3Handler;