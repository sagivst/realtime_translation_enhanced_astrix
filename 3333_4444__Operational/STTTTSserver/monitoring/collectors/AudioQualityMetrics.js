/**
 * AudioQualityMetrics - Collectors for all 10 audio quality parameters
 *
 * Parameters:
 * 1. audioQuality.snr (Signal-to-Noise Ratio)
 * 2. audioQuality.mos (Mean Opinion Score)
 * 3. audioQuality.pesq (PESQ Score)
 * 4. audioQuality.polqa (POLQA Score)
 * 5. audioQuality.thd (Total Harmonic Distortion)
 * 6. audioQuality.speechLevel
 * 7. audioQuality.clipping
 * 8. audioQuality.noise (Background Noise Level)
 * 9. audioQuality.echo
 * 10. audioQuality.distortion
 */

const MetricCollector = require('./MetricCollector');
const AudioAnalyzer = require('../utils/AudioAnalyzer');

class SNRCollector extends MetricCollector {
  constructor() {
    super({
      id: 'audioQuality.snr',
      name: 'Signal-to-Noise Ratio',
      unit: 'dB',
      range: [0, 60],
      thresholds: {
        warningLow: 20,
        warningHigh: null,
        criticalLow: 15,
        criticalHigh: null
      },
      stations: ['STATION_1', 'STATION_2', 'STATION_3', 'STATION_9', 'STATION_11'],
      description: 'Ratio of signal power to background noise'
    });
  }

  async collect(context) {
    const { pcmBuffer, sampleRate } = context;
    if (!pcmBuffer) return null;

    return AudioAnalyzer.estimateSNR(pcmBuffer, sampleRate || 16000);
  }
}

class MOSCollector extends MetricCollector {
  constructor() {
    super({
      id: 'audioQuality.mos',
      name: 'Mean Opinion Score',
      unit: 'score',
      range: [1.0, 5.0],
      thresholds: {
        warningLow: 3.5,
        warningHigh: null,
        criticalLow: 2.5,
        criticalHigh: null
      },
      stations: ['STATION_1', 'STATION_2', 'STATION_9', 'STATION_10'],
      description: 'Subjective quality score (5=excellent, 1=bad)'
    });
  }

  async collect(context) {
    const { pcmBuffer, sampleRate } = context;
    if (!pcmBuffer) return null;

    // Calculate metrics needed for MOS estimation
    const snr = AudioAnalyzer.estimateSNR(pcmBuffer, sampleRate || 16000);
    const clipping = AudioAnalyzer.detectClipping(pcmBuffer);
    const speechActivity = AudioAnalyzer.detectSpeechActivity(pcmBuffer, sampleRate || 16000);

    return AudioAnalyzer.estimateMOS({
      snr,
      clippingPct: clipping.percentage,
      speechActivityPct: speechActivity.percentage
    });
  }
}

class PESQCollector extends MetricCollector {
  constructor() {
    super({
      id: 'audioQuality.pesq',
      name: 'PESQ Score',
      unit: 'score',
      range: [-0.5, 4.5],
      thresholds: {
        warningLow: 3.0,
        warningHigh: null,
        criticalLow: 2.0,
        criticalHigh: null
      },
      stations: ['STATION_1', 'STATION_3'],
      description: 'Perceptual Evaluation of Speech Quality'
    });
  }

  async collect(context) {
    // PESQ requires reference audio and special library
    // Placeholder for now - would integrate with PESQ library
    const { pesqScore } = context;
    return pesqScore || null;
  }
}

class POLQACollector extends MetricCollector {
  constructor() {
    super({
      id: 'audioQuality.polqa',
      name: 'POLQA Score',
      unit: 'score',
      range: [1.0, 5.0],
      thresholds: {
        warningLow: 3.5,
        warningHigh: null,
        criticalLow: 2.5,
        criticalHigh: null
      },
      stations: ['STATION_1', 'STATION_3'],
      description: 'Perceptual Objective Listening Quality Assessment'
    });
  }

  async collect(context) {
    // POLQA requires special library
    // Placeholder for now
    const { polqaScore } = context;
    return polqaScore || null;
  }
}

class THDCollector extends MetricCollector {
  constructor() {
    super({
      id: 'audioQuality.thd',
      name: 'Total Harmonic Distortion',
      unit: '%',
      range: [0, 100],
      thresholds: {
        warningLow: null,
        warningHigh: 1.0,
        criticalLow: null,
        criticalHigh: 5.0
      },
      stations: ['STATION_1', 'STATION_9', 'STATION_10'],
      description: 'Measure of harmonic distortion in audio'
    });
  }

  async collect(context) {
    const { pcmBuffer } = context;
    if (!pcmBuffer) return null;

    return AudioAnalyzer.estimateTHD(pcmBuffer);
  }
}

class SpeechLevelCollector extends MetricCollector {
  constructor() {
    super({
      id: 'audioQuality.speechLevel',
      name: 'Speech Level',
      unit: 'dBFS',
      range: [-90, 0],
      thresholds: {
        warningLow: -40,
        warningHigh: -6,
        criticalLow: -60,
        criticalHigh: -3
      },
      stations: ['STATION_1', 'STATION_2', 'STATION_3', 'STATION_9', 'STATION_11'],
      description: 'Average speech signal level'
    });
  }

  async collect(context) {
    const { pcmBuffer, sampleRate } = context;
    if (!pcmBuffer) return null;

    return AudioAnalyzer.calculateRMS(pcmBuffer, sampleRate || 16000);
  }
}

class ClippingCollector extends MetricCollector {
  constructor() {
    super({
      id: 'audioQuality.clipping',
      name: 'Clipping Detected',
      unit: '%',
      range: [0, 100],
      thresholds: {
        warningLow: null,
        warningHigh: 0.1,
        criticalLow: null,
        criticalHigh: 1.0
      },
      stations: ['STATION_2', 'STATION_3', 'STATION_9', 'STATION_10'],
      description: 'Percentage of samples exceeding maximum amplitude'
    });
  }

  async collect(context) {
    const { pcmBuffer } = context;
    if (!pcmBuffer) return null;

    const result = AudioAnalyzer.detectClipping(pcmBuffer);
    return result.percentage;
  }
}

class NoiseCollector extends MetricCollector {
  constructor() {
    super({
      id: 'audioQuality.noise',
      name: 'Background Noise Level',
      unit: 'dBFS',
      range: [-90, 0],
      thresholds: {
        warningLow: null,
        warningHigh: -40,
        criticalLow: null,
        criticalHigh: -30
      },
      stations: ['STATION_1', 'STATION_3', 'STATION_11'],
      description: 'Level of background noise'
    });
  }

  async collect(context) {
    const { pcmBuffer, sampleRate } = context;
    if (!pcmBuffer) return null;

    return AudioAnalyzer.calculateNoiseFloor(pcmBuffer, sampleRate || 16000);
  }
}

class EchoCollector extends MetricCollector {
  constructor() {
    super({
      id: 'audioQuality.echo',
      name: 'Echo Level',
      unit: 'dBFS',
      range: [-90, 0],
      thresholds: {
        warningLow: null,
        warningHigh: -30,
        criticalLow: null,
        criticalHigh: -20
      },
      stations: ['STATION_1', 'STATION_9'],
      description: 'Level of echo detected in audio'
    });
  }

  async collect(context) {
    // Echo detection requires advanced signal processing
    // Placeholder - would integrate with AEC library
    const { echoLevel } = context;
    return echoLevel || null;
  }
}

class DistortionCollector extends MetricCollector {
  constructor() {
    super({
      id: 'audioQuality.distortion',
      name: 'Audio Distortion',
      unit: '%',
      range: [0, 100],
      thresholds: {
        warningLow: null,
        warningHigh: 2.0,
        criticalLow: null,
        criticalHigh: 10.0
      },
      stations: ['STATION_9', 'STATION_10'],
      description: 'Overall audio distortion percentage'
    });
  }

  async collect(context) {
    const { pcmBuffer } = context;
    if (!pcmBuffer) return null;

    // Use THD as a proxy for general distortion
    return AudioAnalyzer.estimateTHD(pcmBuffer);
  }
}

module.exports = {
  SNRCollector,
  MOSCollector,
  PESQCollector,
  POLQACollector,
  THDCollector,
  SpeechLevelCollector,
  ClippingCollector,
  NoiseCollector,
  EchoCollector,
  DistortionCollector
};
