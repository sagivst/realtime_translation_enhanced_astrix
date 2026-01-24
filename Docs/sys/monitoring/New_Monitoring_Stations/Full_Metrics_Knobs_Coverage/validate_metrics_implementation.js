#!/usr/bin/env node

/**
 * Metrics Implementation Validation Script
 * Validates that all required metrics are properly implemented
 * across MetricsRegistry and Station3 handlers
 */

const fs = require('fs');
const path = require('path');

// Configuration
const FILES_TO_VALIDATE = {
  metricsRegistry: path.join(__dirname, 'Updated_MetricsRegistry.js'),
  station3_3333: path.join(__dirname, 'Updated_Station3_3333_Handler.js'),
  station3_4444: path.join(__dirname, 'Updated_Station3_4444_Handler.js')
};

// Expected metrics from Unified Specification
const EXPECTED_METRICS = {
  // 2.1 Core Amplitude & Loudness (14)
  amplitude: [
    "pcm.peak_amplitude", "pcm.rms_level", "pcm.rms_dbfs", "pcm.peak_dbfs",
    "pcm.lufs_momentary", "pcm.lufs_short_term", "pcm.lufs_integrated",
    "pcm.true_peak_dbtp", "pcm.loudness_range_lu", "pcm.dynamic_range",
    "pcm.crest_factor", "pcm.headroom_db", "pcm.avg_amplitude",
    "pcm.amplitude_percentile_95"
  ],

  // 2.2 Silence & Activity (8)
  silence: [
    "pcm.is_silent", "pcm.silence_duration_ms", "pcm.silence_ratio",
    "pcm.vad_state", "pcm.speech_probability", "pcm.activity_factor",
    "pcm.speech_segments_per_min", "pcm.avg_speech_duration_ms"
  ],

  // 2.3 Clipping & Distortion (7)
  clipping: [
    "pcm.clipping_detected", "pcm.clip_count", "pcm.clip_ratio",
    "pcm.thd_percent", "pcm.soft_clip_ratio", "pcm.hard_clip_duration_ms",
    "pcm.saturation_events"
  ],

  // 2.4 Noise & Quality (9)
  noise: [
    "pcm.snr_db", "pcm.noise_floor_dbfs", "pcm.background_noise_level",
    "pcm.hum_detected", "pcm.hum_frequency_hz", "pcm.broadband_noise_ratio",
    "pcm.impulse_noise_count", "pcm.quality_score", "pcm.mos_estimate"
  ],

  // 2.5 Temporal & Continuity (6)
  temporal: [
    "pcm.zero_crossing_rate", "pcm.discontinuity_count", "pcm.gap_duration_ms",
    "pcm.jitter_ms", "pcm.drift_ppm", "pcm.buffer_underruns"
  ],

  // 2.6 Stream Integrity (7)
  integrity: [
    "pcm.sample_rate_actual", "pcm.bit_depth_actual", "pcm.channel_count",
    "pcm.format_changes", "pcm.sync_errors", "pcm.frame_drops",
    "pcm.checksum_errors"
  ],

  // 2.7 Transport & Pipeline (10)
  pipeline: [
    "pipeline.input_latency_ms", "pipeline.output_latency_ms",
    "pipeline.total_latency_ms", "pipeline.processing_time_us",
    "pipeline.throughput_samples_per_sec", "pipeline.buffer_depth_frames",
    "pipeline.queue_depth", "pipeline.flow_control_events",
    "pipeline.backpressure_ratio", "pipeline.chain_position"
  ],

  // 2.8 Health & Diagnostic (6)
  health: [
    "health.cpu_usage_percent", "health.memory_usage_mb", "health.thread_count",
    "health.error_count", "health.warning_count", "health.uptime_seconds"
  ],

  // 2.9 Composite Scores (5)
  composite: [
    "composite.overall_quality", "composite.speech_clarity_index",
    "composite.noise_suppression_gain", "composite.enhancement_effectiveness",
    "composite.realtime_performance_score"
  ],

  // Additional metrics for 100% coverage
  buffer: [
    "buffer.available_frames", "buffer.total_capacity", "buffer.fill_ratio",
    "buffer.overflow_count", "buffer.underflow_count"
  ],

  session: [
    "session.total_frames_processed", "session.total_duration_seconds",
    "session.total_silence_seconds", "session.total_speech_seconds",
    "session.session_id"
  ],

  stt: [
    "stt.ready_confidence", "stt.clarity_score", "stt.background_noise_impact",
    "stt.recommended_preprocessing", "stt.transcription_quality_estimate",
    "stt.language_detection_confidence", "stt.speaker_change_detected"
  ],

  statistical: [
    "stat.mean_amplitude", "stat.std_deviation", "stat.skewness",
    "stat.kurtosis", "stat.entropy"
  ],

  time: [
    "time.peak_frequency_hz", "time.spectral_centroid_hz",
    "time.spectral_rolloff_hz", "time.spectral_flux",
    "time.mfcc_delta", "time.pitch_hz", "time.pitch_confidence",
    "time.formant_f1_hz", "time.formant_f2_hz", "time.formant_f3_hz",
    "time.spectral_contrast", "time.spectral_flatness",
    "time.harmonic_ratio", "time.onset_strength", "time.tempo_bpm"
  ]
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    log(`Error reading ${filePath}: ${error.message}`, 'red');
    return null;
  }
}

function extractMetricsFromRegistry(content) {
  const metrics = new Set();
  // Match metric keys in the registry object
  const regex = /["']([^"']+)["']\s*:\s*{/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    metrics.add(match[1]);
  }
  return metrics;
}

function extractMetricsFromHandler(content) {
  const metrics = {
    pre: new Set(),
    post: new Set()
  };

  // Extract preMetrics array
  const preRegex = /preMetrics\s*:\s*\[([\s\S]*?)\]/;
  const preMatch = content.match(preRegex);
  if (preMatch) {
    const metricsStr = preMatch[1];
    const metricRegex = /["']([^"']+)["']/g;
    let match;
    while ((match = metricRegex.exec(metricsStr)) !== null) {
      metrics.pre.add(match[1]);
    }
  }

  // Extract postMetrics array
  const postRegex = /postMetrics\s*:\s*\[([\s\S]*?)\]/;
  const postMatch = content.match(postRegex);
  if (postMatch) {
    const metricsStr = postMatch[1];
    const metricRegex = /["']([^"']+)["']/g;
    let match;
    while ((match = metricRegex.exec(metricsStr)) !== null) {
      metrics.post.add(match[1]);
    }
  }

  return metrics;
}

// Main validation function
function validateMetricsImplementation() {
  log('\n=== Metrics Implementation Validation ===\n', 'cyan');

  let totalErrors = 0;
  let totalWarnings = 0;

  // 1. Validate MetricsRegistry
  log('1. Validating MetricsRegistry.js', 'blue');
  const registryContent = readFileContent(FILES_TO_VALIDATE.metricsRegistry);

  if (!registryContent) {
    log('   ✗ MetricsRegistry.js not found or unreadable', 'red');
    totalErrors++;
  } else {
    const registryMetrics = extractMetricsFromRegistry(registryContent);
    const allExpectedMetrics = Object.values(EXPECTED_METRICS).flat();

    log(`   Found ${registryMetrics.size} metrics in registry`);

    // Check for missing metrics
    const missingMetrics = allExpectedMetrics.filter(m => !registryMetrics.has(m));
    if (missingMetrics.length > 0) {
      log(`   ✗ Missing ${missingMetrics.length} metrics:`, 'red');
      missingMetrics.forEach(m => log(`     - ${m}`, 'red'));
      totalErrors += missingMetrics.length;
    } else {
      log(`   ✓ All 120 expected metrics found`, 'green');
    }

    // Check each metric has required properties
    let validMetrics = 0;
    let invalidMetrics = [];

    for (const metric of registryMetrics) {
      const metricRegex = new RegExp(`["']${metric}["']\\s*:\\s*{([^}]+)}`, 's');
      const match = registryContent.match(metricRegex);

      if (match) {
        const metricDef = match[1];
        const hasDescription = /description\s*:/.test(metricDef);
        const hasType = /type\s*:/.test(metricDef);
        const hasCompute = /compute\s*:/.test(metricDef);

        if (hasDescription && hasType && hasCompute) {
          validMetrics++;
        } else {
          invalidMetrics.push({
            metric,
            missing: [
              !hasDescription && 'description',
              !hasType && 'type',
              !hasCompute && 'compute'
            ].filter(Boolean)
          });
        }
      }
    }

    if (invalidMetrics.length > 0) {
      log(`   ⚠ ${invalidMetrics.length} metrics with missing properties:`, 'yellow');
      invalidMetrics.forEach(({ metric, missing }) => {
        log(`     - ${metric}: missing ${missing.join(', ')}`, 'yellow');
      });
      totalWarnings += invalidMetrics.length;
    } else {
      log(`   ✓ All metrics have required properties`, 'green');
    }
  }

  // 2. Validate Station3 Handlers
  log('\n2. Validating Station3 Handlers', 'blue');

  // Expected PCM metrics for Station3
  const pcmMetrics = [
    ...EXPECTED_METRICS.amplitude,
    ...EXPECTED_METRICS.silence,
    ...EXPECTED_METRICS.clipping,
    ...EXPECTED_METRICS.noise,
    ...EXPECTED_METRICS.temporal,
    ...EXPECTED_METRICS.integrity
  ];

  const pcmPostOnlyMetrics = [
    ...EXPECTED_METRICS.pipeline,
    ...EXPECTED_METRICS.health,
    ...EXPECTED_METRICS.composite,
    ...EXPECTED_METRICS.session.slice(0, 5), // First 5 session metrics
    ...EXPECTED_METRICS.time.slice(0, 5)     // First 5 time metrics
  ];

  ['station3_3333', 'station3_4444'].forEach(handlerKey => {
    log(`\n   ${handlerKey}:`, 'cyan');
    const handlerContent = readFileContent(FILES_TO_VALIDATE[handlerKey]);

    if (!handlerContent) {
      log(`   ✗ Handler file not found`, 'red');
      totalErrors++;
      return;
    }

    const handlerMetrics = extractMetricsFromHandler(handlerContent);

    // Validate PRE metrics (should be 51)
    log(`   PRE metrics: ${handlerMetrics.pre.size}`);
    if (handlerMetrics.pre.size !== 51) {
      log(`   ✗ Expected 51 PRE metrics, found ${handlerMetrics.pre.size}`, 'red');
      totalErrors++;
    } else {
      log(`   ✓ Correct number of PRE metrics`, 'green');
    }

    // Check PRE metrics are PCM-applicable
    const missingPreMetrics = pcmMetrics.filter(m => !handlerMetrics.pre.has(m));
    if (missingPreMetrics.length > 0) {
      log(`   ✗ Missing ${missingPreMetrics.length} PCM metrics in PRE:`, 'red');
      missingPreMetrics.slice(0, 5).forEach(m => log(`     - ${m}`, 'red'));
      if (missingPreMetrics.length > 5) {
        log(`     ... and ${missingPreMetrics.length - 5} more`, 'red');
      }
      totalErrors++;
    }

    // Validate POST metrics (should be 82)
    log(`   POST metrics: ${handlerMetrics.post.size}`);
    if (handlerMetrics.post.size !== 82) {
      log(`   ✗ Expected 82 POST metrics, found ${handlerMetrics.post.size}`, 'red');
      totalErrors++;
    } else {
      log(`   ✓ Correct number of POST metrics`, 'green');
    }

    // Check POST metrics include all PRE + additional
    const allPostMetrics = [...pcmMetrics, ...pcmPostOnlyMetrics];
    const missingPostMetrics = allPostMetrics.filter(m => !handlerMetrics.post.has(m));
    if (missingPostMetrics.length > 0) {
      log(`   ✗ Missing ${missingPostMetrics.length} metrics in POST:`, 'red');
      missingPostMetrics.slice(0, 5).forEach(m => log(`     - ${m}`, 'red'));
      if (missingPostMetrics.length > 5) {
        log(`     ... and ${missingPostMetrics.length - 5} more`, 'red');
      }
      totalErrors++;
    }

    // Check handler structure
    if (!handlerContent.includes('stationKey:')) {
      log(`   ✗ Missing stationKey property`, 'red');
      totalErrors++;
    }
    if (!handlerContent.includes('onFrame')) {
      log(`   ✗ Missing onFrame method`, 'red');
      totalErrors++;
    }
  });

  // 3. Summary
  log('\n=== Validation Summary ===', 'cyan');

  if (totalErrors === 0 && totalWarnings === 0) {
    log('✓ All validations passed successfully!', 'green');
    log('\nMetrics implementation is ready for deployment.', 'green');
  } else {
    if (totalErrors > 0) {
      log(`✗ Found ${totalErrors} errors that must be fixed`, 'red');
    }
    if (totalWarnings > 0) {
      log(`⚠ Found ${totalWarnings} warnings to review`, 'yellow');
    }
    log('\nPlease fix all errors before deployment.', 'yellow');
  }

  // 4. Coverage Report
  log('\n=== Coverage Report ===', 'cyan');
  const registryMetrics = registryContent ? extractMetricsFromRegistry(registryContent) : new Set();
  const totalExpected = Object.values(EXPECTED_METRICS).flat().length;
  const coverage = registryContent ? (registryMetrics.size / totalExpected * 100).toFixed(1) : 0;

  log(`MetricsRegistry Coverage: ${registryMetrics.size}/${totalExpected} (${coverage}%)`,
      coverage >= 100 ? 'green' : coverage >= 80 ? 'yellow' : 'red');

  // Category breakdown
  log('\nBy Category:', 'cyan');
  Object.entries(EXPECTED_METRICS).forEach(([category, metrics]) => {
    const found = metrics.filter(m => registryMetrics.has(m)).length;
    const percentage = (found / metrics.length * 100).toFixed(0);
    const color = percentage >= 100 ? 'green' : percentage >= 80 ? 'yellow' : 'red';
    log(`  ${category.padEnd(15)} ${found}/${metrics.length} (${percentage}%)`, color);
  });

  return totalErrors === 0;
}

// Run validation if called directly
if (require.main === module) {
    const success = validateMetricsImplementation();
    process.exit(success ? 0 : 1);
}

module.exports = { validateMetricsImplementation };