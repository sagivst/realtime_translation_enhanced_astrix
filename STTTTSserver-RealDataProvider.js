/**
 * STTTTSserver-RealDataProvider.js
 *
 * Integration module that STTTTSserver calls to provide REAL operational data
 * Breaks the circular dependency - STTTTSserver provides data, not reads from templates
 *
 * This replaces the template-based approach with actual operational metrics from:
 * - Deepgram STT connections
 * - ElevenLabs TTS synthesis
 * - Translation processing
 * - Audio pipeline (AGC, AEC, noise reduction)
 * - Network performance
 */

const { getInstance: getKnobOptimizer } = require('./StationKnobOptimizer');
const { getInstance: getMetricsProvider } = require('./RealTimeMetricsProvider-Complete');

class STTTTSserverRealDataProvider {
  constructor() {
    this.knobOptimizer = getKnobOptimizer();
    this.metricsProvider = getMetricsProvider();

    // Track real operational state per station
    this.stationStates = new Map();

    console.log('[STTTTSserver-RealDataProvider] Initialized');
    console.log('  ✅ Ready to receive REAL operational data from STTTTSserver');
    console.log('  ✅ Breaks circular dependency - no more reading from templates');
    console.log('  ✅ Each station-extension gets unique optimized knobs');
  }

  /**
   * Called by STTTTSserver when Deepgram receives audio
   */
  onDeepgramAudioReceived(stationId, extension, data) {
    const key = `${stationId}-${extension}`;
    const state = this.getStationState(key);

    // Update real metrics
    state.deepgram.packetsReceived++;
    state.deepgram.bytesReceived += data.byteLength || 0;
    state.deepgram.lastActivity = Date.now();

    // Track audio quality
    if (data.audioLevel !== undefined) {
      state.audio.levels.push(data.audioLevel);
      if (state.audio.levels.length > 100) state.audio.levels.shift();
    }

    // Update metrics provider with real data
    this.metricsProvider.updateFromServer({
      deepgram: {
        packets: { received: 1 },
        bytes: data.byteLength
      },
      audio: {
        level: data.audioLevel,
        pcmBuffer: data.pcmBuffer
      }
    });

    return this.getMonitoringData(stationId, extension);
  }

  /**
   * Called by STTTTSserver when ElevenLabs generates speech
   */
  onElevenLabsSynthesis(stationId, extension, data) {
    const key = `${stationId}-${extension}`;
    const state = this.getStationState(key);

    // Update real metrics
    state.elevenLabs.packetsSent++;
    state.elevenLabs.bytesSent += data.byteLength || 0;
    state.elevenLabs.lastSynthesis = Date.now();
    state.elevenLabs.voiceId = data.voiceId;

    // Track synthesis latency
    if (data.latency) {
      state.elevenLabs.latencies.push(data.latency);
      if (state.elevenLabs.latencies.length > 100) state.elevenLabs.latencies.shift();
    }

    // Update metrics provider
    this.metricsProvider.updateFromServer({
      elevenLabs: {
        packets: { sent: 1 },
        bytes: data.byteLength,
        latency: data.latency
      }
    });

    return this.getMonitoringData(stationId, extension);
  }

  /**
   * Called by STTTTSserver when translation occurs
   */
  onTranslation(stationId, extension, data) {
    const key = `${stationId}-${extension}`;
    const state = this.getStationState(key);

    // Update translation metrics
    state.translation.count++;
    state.translation.totalChars += data.text?.length || 0;
    state.translation.lastTranslation = Date.now();
    state.translation.sourceLanguage = data.sourceLang;
    state.translation.targetLanguage = data.targetLang;

    // Track translation time
    if (data.processingTime) {
      state.translation.processingTimes.push(data.processingTime);
      if (state.translation.processingTimes.length > 100) {
        state.translation.processingTimes.shift();
      }
    }

    // Update metrics provider
    this.metricsProvider.updateFromServer({
      translation: {
        count: 1,
        processingTime: data.processingTime,
        characters: data.text?.length
      }
    });

    return this.getMonitoringData(stationId, extension);
  }

  /**
   * Called by STTTTSserver when DSP processes audio
   */
  onDSPProcessing(stationId, extension, dspData) {
    const key = `${stationId}-${extension}`;
    const state = this.getStationState(key);

    // Update DSP state with REAL values
    if (dspData.agc) {
      state.dsp.agc = { ...state.dsp.agc, ...dspData.agc };
    }
    if (dspData.aec) {
      state.dsp.aec = { ...state.dsp.aec, ...dspData.aec };
    }
    if (dspData.noiseReduction) {
      state.dsp.noiseReduction = { ...state.dsp.noiseReduction, ...dspData.noiseReduction };
    }

    // Apply AI optimization based on DSP performance
    const performanceMetrics = {
      audioQuality: {
        snr: dspData.snr,
        echo: dspData.aec?.echoLevel
      },
      latency: {
        avg: state.network.avgLatency
      },
      packets: {
        loss: state.network.packetLoss
      }
    };

    // Get AI-optimized knobs based on real performance
    const optimizedKnobs = this.knobOptimizer.applyAIOptimization(
      stationId,
      extension,
      performanceMetrics
    );

    // Update runtime knobs with optimizations
    this.knobOptimizer.updateRuntimeValues(stationId, extension, {
      'agc.currentGain': dspData.agc?.currentGain,
      'aec.echoLevel': dspData.aec?.echoLevel,
      'noiseReduction.level': dspData.noiseReduction?.level
    });

    return this.getMonitoringData(stationId, extension);
  }

  /**
   * Called by STTTTSserver on network events
   */
  onNetworkEvent(stationId, extension, networkData) {
    const key = `${stationId}-${extension}`;
    const state = this.getStationState(key);

    // Update network metrics
    if (networkData.latency) {
      state.network.latencies.push(networkData.latency);
      if (state.network.latencies.length > 100) state.network.latencies.shift();

      // Calculate average
      state.network.avgLatency = state.network.latencies.reduce((a, b) => a + b, 0) /
                                 state.network.latencies.length;
    }

    if (networkData.packetLoss !== undefined) {
      state.network.packetLoss = networkData.packetLoss;
    }

    if (networkData.bandwidth !== undefined) {
      state.network.bandwidth = networkData.bandwidth;
    }

    // Update metrics provider
    this.metricsProvider.updateFromServer({
      network: {
        latency: networkData.latency,
        bytesProcessed: networkData.bytes,
        packetLoss: networkData.packetLoss
      }
    });

    return this.getMonitoringData(stationId, extension);
  }

  /**
   * Get or create station state
   */
  getStationState(key) {
    if (!this.stationStates.has(key)) {
      this.stationStates.set(key, {
        deepgram: {
          packetsReceived: 0,
          bytesReceived: 0,
          lastActivity: Date.now()
        },
        elevenLabs: {
          packetsSent: 0,
          bytesSent: 0,
          lastSynthesis: Date.now(),
          latencies: [],
          voiceId: null
        },
        translation: {
          count: 0,
          totalChars: 0,
          lastTranslation: Date.now(),
          processingTimes: [],
          sourceLanguage: null,
          targetLanguage: null
        },
        audio: {
          levels: []
        },
        dsp: {
          agc: { currentGain: 0, enabled: false },
          aec: { echoLevel: -45, enabled: false },
          noiseReduction: { level: 15, enabled: false }
        },
        network: {
          latencies: [],
          avgLatency: 45,
          packetLoss: 0,
          bandwidth: 128000
        },
        startTime: Date.now()
      });
    }
    return this.stationStates.get(key);
  }

  /**
   * Get complete monitoring data for a station
   * This is what replaces the template-based approach
   */
  getMonitoringData(stationId, extension) {
    const key = `${stationId}-${extension}`;
    const state = this.getStationState(key);

    // Get station-specific optimized knobs (unique per station-extension)
    const knobs = this.knobOptimizer.getOptimizedKnobs(stationId, extension);

    // Get real metrics context
    const metricsContext = this.metricsProvider.getMetricsContext(stationId, extension);

    // Merge real operational data
    const realMetrics = {
      ...metricsContext,

      // Override with REAL Deepgram data
      deepgram: {
        packetsReceived: state.deepgram.packetsReceived,
        bytesReceived: state.deepgram.bytesReceived,
        lastActivity: state.deepgram.lastActivity,
        connectionActive: Date.now() - state.deepgram.lastActivity < 5000
      },

      // Override with REAL ElevenLabs data
      elevenLabs: {
        packetsSent: state.elevenLabs.packetsSent,
        bytesSent: state.elevenLabs.bytesSent,
        lastSynthesis: state.elevenLabs.lastSynthesis,
        avgLatency: state.elevenLabs.latencies.length > 0 ?
          state.elevenLabs.latencies.reduce((a, b) => a + b, 0) / state.elevenLabs.latencies.length : 0,
        voiceId: state.elevenLabs.voiceId
      },

      // Override with REAL translation data
      translation: {
        count: state.translation.count,
        totalCharacters: state.translation.totalChars,
        avgProcessingTime: state.translation.processingTimes.length > 0 ?
          state.translation.processingTimes.reduce((a, b) => a + b, 0) / state.translation.processingTimes.length : 0,
        sourceLanguage: state.translation.sourceLanguage,
        targetLanguage: state.translation.targetLanguage
      },

      // Override with REAL DSP state
      dsp: {
        ...metricsContext.dsp,
        agc: { ...metricsContext.dsp.agc, ...state.dsp.agc },
        aec: { ...metricsContext.dsp.aec, ...state.dsp.aec },
        noiseReduction: { ...metricsContext.dsp.noiseReduction, ...state.dsp.noiseReduction }
      },

      // Override with REAL network data
      network: {
        avgLatency: state.network.avgLatency,
        packetLoss: state.network.packetLoss,
        bandwidth: state.network.bandwidth
      }
    };

    return {
      metrics: realMetrics,
      knobs: knobs,  // Station-specific optimized knobs
      station_id: stationId,
      extension: extension,
      timestamp: new Date().toISOString(),
      isRealData: true  // Flag to indicate this is real operational data
    };
  }

  /**
   * Get summary of all stations
   */
  getAllStationsSummary() {
    const summary = {};

    for (const [key, state] of this.stationStates.entries()) {
      const [stationId, extension] = key.split('-');
      summary[key] = {
        stationId,
        extension,
        deepgramPackets: state.deepgram.packetsReceived,
        elevenLabsPackets: state.elevenLabs.packetsSent,
        translations: state.translation.count,
        uptime: Date.now() - state.startTime,
        lastActivity: Math.max(
          state.deepgram.lastActivity,
          state.elevenLabs.lastSynthesis,
          state.translation.lastTranslation
        )
      };
    }

    return summary;
  }

  /**
   * Example usage in STTTTSserver
   */
  static getIntegrationExample() {
    return `
// In STTTTSserver.js:

const { STTTTSserverRealDataProvider } = require('./STTTTSserver-RealDataProvider');
const realDataProvider = new STTTTSserverRealDataProvider();

// When Deepgram receives audio:
deepgramConnection.on('audio', (audioData) => {
  const monitoringData = realDataProvider.onDeepgramAudioReceived(
    stationId,
    extension,
    {
      byteLength: audioData.length,
      audioLevel: calculateAudioLevel(audioData),
      pcmBuffer: audioData
    }
  );

  // Send to monitoring system
  if (stationAgent) {
    stationAgent.updateWithRealData(monitoringData);
  }
});

// When ElevenLabs generates speech:
elevenLabsClient.on('synthesis', (synthesisData) => {
  const monitoringData = realDataProvider.onElevenLabsSynthesis(
    stationId,
    extension,
    {
      byteLength: synthesisData.audio.length,
      latency: synthesisData.latency,
      voiceId: synthesisData.voice_id
    }
  );

  // Update monitoring
  if (stationAgent) {
    stationAgent.updateWithRealData(monitoringData);
  }
});

// When translation occurs:
translator.on('translated', (translationData) => {
  const monitoringData = realDataProvider.onTranslation(
    stationId,
    extension,
    {
      text: translationData.text,
      sourceLang: translationData.source_language,
      targetLang: translationData.target_language,
      processingTime: translationData.processing_time
    }
  );

  // Update monitoring
  if (stationAgent) {
    stationAgent.updateWithRealData(monitoringData);
  }
});
    `;
  }
}

// Export singleton instance
let instance = null;

module.exports = {
  getInstance() {
    if (!instance) {
      instance = new STTTTSserverRealDataProvider();
    }
    return instance;
  },
  STTTTSserverRealDataProvider
};