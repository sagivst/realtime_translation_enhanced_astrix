# AI Decision Logic Documentation

## Overview

The AI Optimizer uses sophisticated decision logic to analyze audio metrics and determine optimal knob adjustments. This document details the algorithms, strategies, and reasoning behind the optimization decisions.

## Core Decision Framework

### Decision Pipeline
```
Metrics Input → Analysis → Decision Generation → Validation → Application
      ↓             ↓              ↓                ↓            ↓
   Snapshot    OpenAI/Rules    Recommendations    Limits      Schedule
```

### Decision Components
```javascript
{
  knob: string,              // Parameter to adjust
  recommended_value: number, // Target value
  confidence: 0.0-1.0,      // Confidence score
  reason: string            // Human-readable explanation
}
```

## Metrics Analysis

### Key Metrics Evaluated

#### 1. RMS Level (Root Mean Square)
```javascript
// Target range: -18 to -12 dBFS
const TARGET_RMS_MIN = 5240;  // -18 dBFS in linear
const TARGET_RMS_MAX = 10400; // -12 dBFS in linear

function analyzeRMS(metrics) {
  const currentRMS = metrics.PRE['pcm.amplitude_rms'].avg;

  if (currentRMS < TARGET_RMS_MIN * 0.7) {
    return { action: 'increase', severity: 'high' };
  } else if (currentRMS < TARGET_RMS_MIN) {
    return { action: 'increase', severity: 'medium' };
  } else if (currentRMS > TARGET_RMS_MAX) {
    return { action: 'decrease', severity: 'medium' };
  }
  return { action: 'maintain', severity: 'low' };
}
```

#### 2. Clipping Detection
```javascript
const MAX_CLIPPING_RATIO = 0.001; // 0.1% threshold

function analyzeClipping(metrics) {
  const clippingRatio = metrics.PRE['pcm.clipping_ratio'].avg;

  if (clippingRatio > MAX_CLIPPING_RATIO * 5) {
    return { action: 'urgent_reduction', severity: 'critical' };
  } else if (clippingRatio > MAX_CLIPPING_RATIO) {
    return { action: 'reduce_or_limit', severity: 'high' };
  }
  return { action: 'none', severity: 'low' };
}
```

#### 3. Signal-to-Noise Ratio (SNR)
```javascript
function analyzeSNR(metrics) {
  const signal = metrics.PRE['pcm.amplitude_rms'].avg;
  const noise = metrics.PRE['noise.floor_level'].avg || 100;
  const snr = 20 * Math.log10(signal / noise);

  if (snr < 15) {
    return { action: 'enable_noise_reduction', severity: 'high' };
  } else if (snr < 20) {
    return { action: 'consider_noise_reduction', severity: 'medium' };
  }
  return { action: 'none', severity: 'low' };
}
```

## Decision Strategies

### 1. Progressive Adjustment Strategy
Never make drastic changes. Use graduated steps:

```javascript
const ADJUSTMENT_STEPS = {
  gain: {
    small: 2,   // dB
    medium: 4,  // dB
    large: 6    // dB
  },
  threshold: {
    small: 3,   // dB
    medium: 6,  // dB
    large: 10   // dB
  }
};

function calculateGainAdjustment(current, target) {
  const diff = target - current;
  const absDiff = Math.abs(diff);

  if (absDiff > 10) {
    return Math.sign(diff) * ADJUSTMENT_STEPS.gain.large;
  } else if (absDiff > 5) {
    return Math.sign(diff) * ADJUSTMENT_STEPS.gain.medium;
  } else if (absDiff > 2) {
    return Math.sign(diff) * ADJUSTMENT_STEPS.gain.small;
  }
  return 0;
}
```

### 2. Priority-Based Decision Making
Address critical issues first:

```javascript
const PRIORITY_LEVELS = {
  CRITICAL: 1,  // Clipping, distortion
  HIGH: 2,      // Level too low/high
  MEDIUM: 3,    // Suboptimal settings
  LOW: 4        // Fine-tuning
};

function prioritizeDecisions(analyses) {
  return analyses.sort((a, b) => {
    return PRIORITY_LEVELS[a.priority] - PRIORITY_LEVELS[b.priority];
  }).slice(0, 5); // Max 5 decisions
}
```

### 3. Hysteresis Prevention
Avoid oscillation between values:

```javascript
const HYSTERESIS_THRESHOLD = 0.1; // 10% change required

function shouldAdjust(current, previous, threshold) {
  const change = Math.abs(current - previous) / previous;
  return change > HYSTERESIS_THRESHOLD;
}
```

## Optimization Algorithms

### 1. Gain Optimization
```javascript
function optimizeGain(metrics, knobs) {
  const decisions = [];
  const currentGain = knobs['pcm.input_gain_db'] || 0;
  const rms = metrics.PRE['pcm.amplitude_rms'].avg;
  const clipping = metrics.PRE['pcm.clipping_ratio'].avg;

  // Priority 1: Handle clipping
  if (clipping > 0.001) {
    decisions.push({
      knob: 'pcm.input_gain_db',
      recommended_value: Math.max(currentGain - 3, -10),
      confidence: 0.95,
      reason: 'Reducing gain to eliminate clipping'
    });
    return decisions;
  }

  // Priority 2: Optimize RMS level
  const targetRMS = 7500; // Middle of target range
  const rmsError = (targetRMS - rms) / targetRMS;

  if (Math.abs(rmsError) > 0.2) {
    const adjustment = calculateGainAdjustment(rms, targetRMS);
    decisions.push({
      knob: 'pcm.input_gain_db',
      recommended_value: clamp(currentGain + adjustment, -20, 20),
      confidence: 0.8,
      reason: `Adjusting gain to reach target RMS (error: ${(rmsError * 100).toFixed(1)}%)`
    });
  }

  return decisions;
}
```

### 2. Dynamic Processing Optimization
```javascript
function optimizeDynamics(metrics, knobs) {
  const decisions = [];
  const peakToRMS = metrics.PRE['pcm.amplitude_peak'].max /
                    metrics.PRE['pcm.amplitude_rms'].avg;

  // High peak-to-RMS ratio suggests need for compression
  if (peakToRMS > 4 && !knobs['compressor.enabled']) {
    decisions.push({
      knob: 'compressor.enabled',
      recommended_value: true,
      confidence: 0.75,
      reason: 'High peak-to-RMS ratio, enabling compression'
    });

    decisions.push({
      knob: 'compressor.threshold_dbfs',
      recommended_value: -20,
      confidence: 0.7,
      reason: 'Setting compressor threshold'
    });

    decisions.push({
      knob: 'compressor.ratio',
      recommended_value: 3,
      confidence: 0.7,
      reason: 'Moderate compression ratio'
    });
  }

  // Enable limiter for protection
  if (!knobs['limiter.enabled'] && metrics.PRE['pcm.amplitude_peak'].max > 30000) {
    decisions.push({
      knob: 'limiter.enabled',
      recommended_value: true,
      confidence: 0.9,
      reason: 'Peak levels near maximum, enabling limiter'
    });
  }

  return decisions;
}
```

### 3. Noise Management
```javascript
function optimizeNoise(metrics, knobs) {
  const decisions = [];
  const snr = calculateSNR(metrics);

  // Poor SNR - enable noise reduction
  if (snr < 15 && !knobs['noise_reduction.enabled']) {
    decisions.push({
      knob: 'noise_reduction.enabled',
      recommended_value: true,
      confidence: 0.8,
      reason: `Low SNR (${snr.toFixed(1)} dB), enabling noise reduction`
    });

    decisions.push({
      knob: 'noise_reduction.level',
      recommended_value: 50, // Medium reduction
      confidence: 0.7,
      reason: 'Setting moderate noise reduction level'
    });
  }

  // Voice activity detection for speech
  if (!knobs['vad.enabled'] && metrics.PRE['voice.probability']?.avg < 0.5) {
    decisions.push({
      knob: 'vad.enabled',
      recommended_value: true,
      confidence: 0.6,
      reason: 'Intermittent speech detected, enabling VAD'
    });
  }

  return decisions;
}
```

## Confidence Scoring

### Confidence Calculation
```javascript
function calculateConfidence(factors) {
  const weights = {
    dataQuality: 0.3,
    metricStability: 0.2,
    historicalSuccess: 0.3,
    severityMatch: 0.2
  };

  const confidence =
    factors.dataQuality * weights.dataQuality +
    factors.metricStability * weights.metricStability +
    factors.historicalSuccess * weights.historicalSuccess +
    factors.severityMatch * weights.severityMatch;

  return Math.min(Math.max(confidence, 0), 1);
}
```

### Confidence Factors

1. **Data Quality**: Completeness and reliability of metrics
2. **Metric Stability**: Consistency over time
3. **Historical Success**: Past optimization effectiveness
4. **Severity Match**: Alignment between problem severity and solution

## Rule-Based Fallback Logic

When OpenAI is unavailable, deterministic rules apply:

### Fallback Decision Tree
```javascript
function fallbackDecisionTree(metrics, knobs) {
  const decisions = [];

  // Level 1: Critical issues
  if (metrics.PRE['pcm.clipping_ratio'].avg > 0.005) {
    return [{
      knob: 'pcm.input_gain_db',
      recommended_value: Math.max(knobs['pcm.input_gain_db'] - 6, -20),
      confidence: 0.9,
      reason: 'FALLBACK: Emergency clipping reduction'
    }];
  }

  // Level 2: RMS optimization
  const rms = metrics.PRE['pcm.amplitude_rms'].avg;
  if (rms < 3000) {
    decisions.push({
      knob: 'pcm.input_gain_db',
      recommended_value: Math.min(knobs['pcm.input_gain_db'] + 3, 15),
      confidence: 0.6,
      reason: 'FALLBACK: Low level boost'
    });
  } else if (rms > 12000) {
    decisions.push({
      knob: 'pcm.input_gain_db',
      recommended_value: Math.max(knobs['pcm.input_gain_db'] - 3, -10),
      confidence: 0.6,
      reason: 'FALLBACK: High level reduction'
    });
  }

  // Level 3: Safety features
  if (!knobs['limiter.enabled'] && rms > 8000) {
    decisions.push({
      knob: 'limiter.enabled',
      recommended_value: true,
      confidence: 0.5,
      reason: 'FALLBACK: Enable limiter for protection'
    });
  }

  return decisions.slice(0, 3); // Conservative approach
}
```

## Decision Validation

### Pre-Application Validation
```javascript
function validateDecision(decision) {
  const validators = {
    knobExists: () => VALID_KNOBS.includes(decision.knob),
    withinLimits: () => {
      const limits = KNOB_LIMITS[decision.knob];
      return decision.recommended_value >= limits.min &&
             decision.recommended_value <= limits.max;
    },
    typeCorrect: () => {
      const expectedType = KNOB_TYPES[decision.knob];
      return typeof decision.recommended_value === expectedType;
    },
    hasReason: () => decision.reason && decision.reason.length > 0,
    hasConfidence: () => decision.confidence >= 0 && decision.confidence <= 1
  };

  return Object.values(validators).every(v => v());
}
```

### Post-Application Verification
```javascript
async function verifyApplication(decision, actualValue) {
  const tolerance = 0.01; // 1% tolerance

  if (typeof decision.recommended_value === 'boolean') {
    return actualValue === decision.recommended_value;
  }

  const difference = Math.abs(actualValue - decision.recommended_value);
  const percentDiff = difference / Math.abs(decision.recommended_value);

  return percentDiff <= tolerance;
}
```

## Optimization Goals

### Primary Goals
1. **Audio Clarity**: Maximize intelligibility
2. **Level Consistency**: Maintain stable output
3. **Distortion Prevention**: Eliminate clipping
4. **Noise Reduction**: Improve SNR

### Secondary Goals
1. **Natural Sound**: Minimize processing artifacts
2. **Low Latency**: Quick adjustments
3. **Stability**: Avoid oscillations
4. **Efficiency**: Minimal processing overhead

## Performance Metrics

### Success Metrics
```javascript
const SUCCESS_METRICS = {
  rmsInTarget: (metrics) => {
    const rms = metrics.PRE['pcm.amplitude_rms'].avg;
    return rms >= 5240 && rms <= 10400;
  },

  noClipping: (metrics) => {
    return metrics.PRE['pcm.clipping_ratio'].avg < 0.001;
  },

  goodSNR: (metrics) => {
    const snr = calculateSNR(metrics);
    return snr > 20;
  },

  stable: (history) => {
    const changes = history.slice(-5).map(h => h.gain);
    const variance = calculateVariance(changes);
    return variance < 2; // Low variance = stable
  }
};
```

### Tracking Optimization Effectiveness
```javascript
class OptimizationTracker {
  constructor() {
    this.history = [];
    this.improvements = 0;
    this.degradations = 0;
  }

  track(before, after, decision) {
    const beforeScore = this.calculateScore(before);
    const afterScore = this.calculateScore(after);

    const improvement = afterScore - beforeScore;

    if (improvement > 0.05) {
      this.improvements++;
    } else if (improvement < -0.05) {
      this.degradations++;
    }

    this.history.push({
      timestamp: Date.now(),
      decision,
      improvement,
      beforeScore,
      afterScore
    });
  }

  calculateScore(metrics) {
    // Composite score: 0-1
    let score = 0;

    // RMS in target: 40% weight
    if (metrics.rms >= 5240 && metrics.rms <= 10400) {
      score += 0.4;
    } else {
      const distance = Math.min(
        Math.abs(metrics.rms - 5240),
        Math.abs(metrics.rms - 10400)
      );
      score += 0.4 * Math.max(0, 1 - distance / 5000);
    }

    // No clipping: 30% weight
    score += 0.3 * (1 - Math.min(metrics.clipping * 1000, 1));

    // SNR: 30% weight
    const snr = Math.min(metrics.snr / 30, 1);
    score += 0.3 * snr;

    return score;
  }

  getEffectiveness() {
    const total = this.improvements + this.degradations;
    if (total === 0) return 0;
    return this.improvements / total;
  }
}
```

## Future Improvements

### 1. Machine Learning Integration
- Train custom models on historical data
- Pattern recognition for specific issues
- Predictive optimization

### 2. Multi-Objective Optimization
- Pareto optimal solutions
- User preference learning
- Context-aware decisions

### 3. Advanced Analytics
- Spectral analysis integration
- Psychoacoustic modeling
- Real-time feedback loops

### 4. Adaptive Strategies
- Environment detection
- Speaker characteristics
- Content type awareness