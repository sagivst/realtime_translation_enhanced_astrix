/**
 * DSPMetrics - 20 DSP parameters
 * AGC (5), AEC (4), Noise Reduction (3), Compressor (3), Limiter (2), EQ (2), Gate (1)
 */

const MetricCollector = require('./MetricCollector');

// ===== AGC (Automatic Gain Control) - 5 parameters =====

class AGCCurrentGainCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.agc.currentGain',
      name: 'AGC Current Gain',
      unit: 'dB',
      range: [-30, 40],
      thresholds: { warningLow: null, warningHigh: 30, criticalLow: null, criticalHigh: 38 },
      stations: ['STATION_3', 'STATION_9'],
      description: 'Current gain applied by AGC'
    });
  }
  async collect(context) { return context.dsp?.agc?.currentGain || null; }
}

class AGCTargetLevelCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.agc.targetLevel',
      name: 'AGC Target Level',
      unit: 'dBFS',
      range: [-30, -3],
      thresholds: {},
      stations: ['STATION_3', 'STATION_9'],
      description: 'Target audio level for AGC'
    });
  }
  async collect(context) { return context.dsp?.agc?.targetLevel || null; }
}

class AGCAttackTimeCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.agc.attackTime',
      name: 'AGC Attack Time',
      unit: 'ms',
      range: [1, 100],
      thresholds: {},
      stations: ['STATION_3', 'STATION_9'],
      description: 'Time for AGC to respond to signal increase'
    });
  }
  async collect(context) { return context.dsp?.agc?.attackTime || null; }
}

class AGCReleaseTimeCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.agc.releaseTime',
      name: 'AGC Release Time',
      unit: 'ms',
      range: [10, 1000],
      thresholds: {},
      stations: ['STATION_3', 'STATION_9'],
      description: 'Time for AGC to respond to signal decrease'
    });
  }
  async collect(context) { return context.dsp?.agc?.releaseTime || null; }
}

class AGCMaxGainCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.agc.maxGain',
      name: 'AGC Maximum Gain',
      unit: 'dB',
      range: [0, 40],
      thresholds: {},
      stations: ['STATION_3', 'STATION_9'],
      description: 'Maximum gain AGC can apply'
    });
  }
  async collect(context) { return context.dsp?.agc?.maxGain || null; }
}

// ===== AEC (Acoustic Echo Cancellation) - 4 parameters =====

class AECEchoLevelCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.aec.echoLevel',
      name: 'Echo Level',
      unit: 'dBFS',
      range: [-90, 0],
      thresholds: { warningLow: null, warningHigh: -30, criticalLow: null, criticalHigh: -20 },
      stations: ['STATION_1', 'STATION_9'],
      description: 'Current echo level detected'
    });
  }
  async collect(context) { return context.dsp?.aec?.echoLevel || null; }
}

class AECSuppressionCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.aec.suppression',
      name: 'Echo Suppression',
      unit: 'dB',
      range: [0, 60],
      thresholds: {},
      stations: ['STATION_9'],
      description: 'Amount of echo suppression applied'
    });
  }
  async collect(context) { return context.dsp?.aec?.suppression || null; }
}

class AECTailLengthCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.aec.tailLength',
      name: 'AEC Tail Length',
      unit: 'ms',
      range: [64, 512],
      thresholds: {},
      stations: ['STATION_9'],
      description: 'Echo tail length for cancellation'
    });
  }
  async collect(context) { return context.dsp?.aec?.tailLength || null; }
}

class AECConvergenceCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.aec.convergenceTime',
      name: 'AEC Convergence Time',
      unit: 'ms',
      range: [0, 5000],
      thresholds: {},
      stations: ['STATION_9'],
      description: 'Time for AEC to converge'
    });
  }
  async collect(context) { return context.dsp?.aec?.convergenceTime || null; }
}

// ===== Noise Reduction - 3 parameters =====

class NRNoiseLevelCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.noiseReduction.noiseLevel',
      name: 'Detected Noise Level',
      unit: 'dBFS',
      range: [-90, 0],
      thresholds: { warningLow: null, warningHigh: -40, criticalLow: null, criticalHigh: -30 },
      stations: ['STATION_1', 'STATION_3', 'STATION_11'],
      description: 'Current background noise level'
    });
  }
  async collect(context) { return context.dsp?.noiseReduction?.noiseLevel || null; }
}

class NRSuppressionCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.noiseReduction.suppression',
      name: 'Noise Suppression',
      unit: 'dB',
      range: [0, 40],
      thresholds: {},
      stations: ['STATION_3'],
      description: 'Amount of noise suppression applied'
    });
  }
  async collect(context) { return context.dsp?.noiseReduction?.suppression || null; }
}

class NRSNRImprovementCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.noiseReduction.snrImprovement',
      name: 'SNR Improvement',
      unit: 'dB',
      range: [0, 30],
      thresholds: {},
      stations: ['STATION_3'],
      description: 'SNR improvement from noise reduction'
    });
  }
  async collect(context) { return context.dsp?.noiseReduction?.snrImprovement || null; }
}

// ===== Compressor - 3 parameters =====

class CompressorReductionCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.compressor.reduction',
      name: 'Compressor Gain Reduction',
      unit: 'dB',
      range: [0, 40],
      thresholds: { warningLow: null, warningHigh: 20, criticalLow: null, criticalHigh: 35 },
      stations: ['STATION_9'],
      description: 'Current gain reduction by compressor'
    });
  }
  async collect(context) { return context.dsp?.compressor?.reduction || null; }
}

class CompressorThresholdCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.compressor.threshold',
      name: 'Compressor Threshold',
      unit: 'dBFS',
      range: [-60, 0],
      thresholds: {},
      stations: ['STATION_9'],
      description: 'Level above which compression starts'
    });
  }
  async collect(context) { return context.dsp?.compressor?.threshold || null; }
}

class CompressorRatioCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.compressor.ratio',
      name: 'Compression Ratio',
      unit: 'ratio',
      range: [1, 20],
      thresholds: {},
      stations: ['STATION_9'],
      description: 'Compression ratio applied'
    });
  }
  async collect(context) { return context.dsp?.compressor?.ratio || null; }
}

// ===== Limiter - 2 parameters =====

class LimiterReductionCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.limiter.reduction',
      name: 'Limiter Gain Reduction',
      unit: 'dB',
      range: [0, 40],
      thresholds: { warningLow: null, warningHigh: 3, criticalLow: null, criticalHigh: 10 },
      stations: ['STATION_9', 'STATION_10'],
      description: 'Current gain reduction by limiter'
    });
  }
  async collect(context) { return context.dsp?.limiter?.reduction || null; }
}

class LimiterThresholdCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.limiter.threshold',
      name: 'Limiter Threshold',
      unit: 'dBFS',
      range: [-12, 0],
      thresholds: {},
      stations: ['STATION_9', 'STATION_10'],
      description: 'Maximum allowed output level'
    });
  }
  async collect(context) { return context.dsp?.limiter?.threshold || null; }
}

// ===== Equalizer - 2 parameters =====

class EqualizerResponseCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.equalizer.response',
      name: 'EQ Frequency Response',
      unit: 'dB',
      range: [-20, 20],
      thresholds: {},
      stations: ['STATION_3', 'STATION_9'],
      description: 'Overall EQ adjustment applied'
    });
  }
  async collect(context) { return context.dsp?.equalizer?.response || null; }
}

class EqualizerPresetCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.equalizer.preset',
      name: 'EQ Preset',
      unit: 'text',
      range: null,
      thresholds: {},
      stations: ['STATION_3', 'STATION_9'],
      description: 'Active equalizer preset name'
    });
  }
  async collect(context) { return context.dsp?.equalizer?.preset || null; }
}

// ===== Gate - 1 parameter =====

class GateAttenuationCollector extends MetricCollector {
  constructor() {
    super({
      id: 'dsp.gate.attenuation',
      name: 'Gate Attenuation',
      unit: 'dB',
      range: [0, 80],
      thresholds: {},
      stations: ['STATION_3', 'STATION_9'],
      description: 'Signal attenuation when gate is closed'
    });
  }
  async collect(context) { return context.dsp?.gate?.attenuation || null; }
}

module.exports = {
  // AGC (5)
  AGCCurrentGainCollector,
  AGCTargetLevelCollector,
  AGCAttackTimeCollector,
  AGCReleaseTimeCollector,
  AGCMaxGainCollector,
  // AEC (4)
  AECEchoLevelCollector,
  AECSuppressionCollector,
  AECTailLengthCollector,
  AECConvergenceCollector,
  // Noise Reduction (3)
  NRNoiseLevelCollector,
  NRSuppressionCollector,
  NRSNRImprovementCollector,
  // Compressor (3)
  CompressorReductionCollector,
  CompressorThresholdCollector,
  CompressorRatioCollector,
  // Limiter (2)
  LimiterReductionCollector,
  LimiterThresholdCollector,
  // Equalizer (2)
  EqualizerResponseCollector,
  EqualizerPresetCollector,
  // Gate (1)
  GateAttenuationCollector
};
