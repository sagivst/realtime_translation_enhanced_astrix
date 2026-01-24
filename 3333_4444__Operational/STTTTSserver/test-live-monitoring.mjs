#!/usr/bin/env node
/**
 * Live Monitoring System Test
 * Tests the actual knob resolution with real components
 * Date: 2026-01-11
 */

import { KnobsResolver } from './Monitoring_Stations/station/generic/KnobsResolver.js';
import { KnobsRegistry } from './Monitoring_Stations/station/generic/KnobsRegistry.js';
import { MetricsRegistry } from './Monitoring_Stations/station/generic/MetricsRegistry.js';
import unifiedKnobs from './monitoring/station3-unified-knobs.js';

console.log("=== LIVE MONITORING SYSTEM TEST ===\n");
console.log("Testing knob resolution with actual monitoring components...\n");

let testsPassed = 0;
let testsFailed = 0;
const errors = [];

// Extract knobs from unified configuration (remove metrics)
const baselineKnobs = {};
for (const [key, value] of Object.entries(unifiedKnobs)) {
  if (!key.startsWith('metrics.')) {
    baselineKnobs[key] = value;
  }
}

console.log(`Loaded ${Object.keys(baselineKnobs).length} knobs from station3-unified-knobs.js\n`);

// TEST 1: Initialize KnobsResolver
console.log("TEST 1: Initializing KnobsResolver with baseline knobs...");
let knobsResolver = null;
try {
  knobsResolver = new KnobsResolver({
    baselineKnobs: baselineKnobs,
    knobsRegistry: KnobsRegistry
  });
  console.log("✅ PASS: KnobsResolver initialized successfully");
  testsPassed++;
} catch (error) {
  console.log(`❌ FAIL: KnobsResolver initialization failed: ${error.message}`);
  testsFailed++;
  errors.push(`KnobsResolver init: ${error.message}`);
  process.exit(1);
}

// TEST 2: Get effective knobs (simulating what St_Handler_Generic does)
console.log("\nTEST 2: Getting effective knobs for a context...");
try {
  const ctx = {
    trace_id: 'test-trace-001',
    station_key: 'St_3_3333',
    sample_rate: 16000
  };

  const effectiveKnobs = knobsResolver.getEffectiveKnobs(ctx);

  if (Object.keys(effectiveKnobs).length > 0) {
    console.log(`✅ PASS: Got ${Object.keys(effectiveKnobs).length} effective knobs`);
    testsPassed++;
  } else {
    console.log("❌ FAIL: No effective knobs returned");
    testsFailed++;
    errors.push("No effective knobs returned");
  }
} catch (error) {
  console.log(`❌ FAIL: Error getting effective knobs: ${error.message}`);
  testsFailed++;
  errors.push(`Get effective knobs: ${error.message}`);
}

// TEST 3: Check critical knobs that St_Handler_Generic needs
console.log("\nTEST 3: Verifying critical knobs are accessible...");
const criticalKnobs = [
  'pcm.input_gain_db',
  'pcm.output_gain_db',
  'limiter.enabled',
  'limiter.threshold_dbfs',
  'compressor.enabled',
  'compressor.threshold_dbfs',
  'noise_gate.enabled',
  'highpass.enabled',
  'highpass.cutoff_hz'
];

try {
  const effectiveKnobs = knobsResolver.getEffectiveKnobs({ trace_id: 'test' });
  let allPresent = true;
  const missing = [];

  for (const knobKey of criticalKnobs) {
    if (!(knobKey in effectiveKnobs)) {
      allPresent = false;
      missing.push(knobKey);
    }
  }

  if (allPresent) {
    console.log("✅ PASS: All critical knobs are accessible");
    testsPassed++;
  } else {
    console.log(`❌ FAIL: Missing critical knobs: ${missing.join(', ')}`);
    testsFailed++;
    errors.push(`Missing critical: ${missing.join(', ')}`);
  }
} catch (error) {
  console.log(`❌ FAIL: Error checking critical knobs: ${error.message}`);
  testsFailed++;
  errors.push(`Critical knobs check: ${error.message}`);
}

// TEST 4: Test updating a global knob
console.log("\nTEST 4: Testing global knob update...");
try {
  const result = knobsResolver.updateGlobalKnob(
    'pcm.input_gain_db',
    6,
    'test'
  );

  if (result.newValue === 6 && result.oldValue === 0) {
    console.log("✅ PASS: Global knob update successful");
    testsPassed++;

    // Verify the change persisted
    const effectiveKnobs = knobsResolver.getEffectiveKnobs({ trace_id: 'test' });
    if (effectiveKnobs['pcm.input_gain_db'] === 6) {
      console.log("  ✓ Update persisted correctly");
    }
  } else {
    console.log("❌ FAIL: Global knob update failed");
    testsFailed++;
    errors.push("Global knob update failed");
  }
} catch (error) {
  console.log(`❌ FAIL: Error updating global knob: ${error.message}`);
  testsFailed++;
  errors.push(`Global knob update: ${error.message}`);
}

// TEST 5: Test trace-specific knob override
console.log("\nTEST 5: Testing trace-specific knob override...");
try {
  const traceId = 'test-trace-002';

  knobsResolver.updateTraceKnob(
    traceId,
    'limiter.threshold_dbfs',
    -3,
    'test'
  );

  const traceKnobs = knobsResolver.getEffectiveKnobs({ trace_id: traceId });
  const otherTraceKnobs = knobsResolver.getEffectiveKnobs({ trace_id: 'other-trace' });

  if (traceKnobs['limiter.threshold_dbfs'] === -3 &&
      otherTraceKnobs['limiter.threshold_dbfs'] === -6) {
    console.log("✅ PASS: Trace-specific override works correctly");
    testsPassed++;
  } else {
    console.log("❌ FAIL: Trace-specific override not working");
    testsFailed++;
    errors.push("Trace-specific override failed");
  }
} catch (error) {
  console.log(`❌ FAIL: Error with trace-specific knob: ${error.message}`);
  testsFailed++;
  errors.push(`Trace knob: ${error.message}`);
}

// TEST 6: Simulate St_Handler_Generic's applyKnobs access pattern
console.log("\nTEST 6: Simulating St_Handler_Generic knob access...");
try {
  const ctx = { trace_id: 'test-trace-003', station_key: 'St_3_3333' };
  const knobs = knobsResolver.getEffectiveKnobs(ctx);

  // Simulate the checks St_Handler_Generic does
  const accessPatterns = [
    { key: 'pcm.input_gain_db', check: (v) => v !== undefined },
    { key: 'highpass.enabled', check: (v) => typeof v === 'boolean' },
    { key: 'highpass.cutoff_hz', check: (v) => typeof v === 'number' },
    { key: 'noise_gate.enabled', check: (v) => typeof v === 'boolean' },
    { key: 'compressor.enabled', check: (v) => typeof v === 'boolean' },
    { key: 'limiter.enabled', check: (v) => typeof v === 'boolean' },
    { key: 'limiter.threshold_dbfs', check: (v) => typeof v === 'number' }
  ];

  let allGood = true;
  const failures = [];

  for (const pattern of accessPatterns) {
    const value = knobs[pattern.key];
    if (!pattern.check(value)) {
      allGood = false;
      failures.push(`${pattern.key}: got ${typeof value} = ${value}`);
    }
  }

  if (allGood) {
    console.log("✅ PASS: All St_Handler_Generic access patterns work");
    testsPassed++;
  } else {
    console.log(`❌ FAIL: Access pattern failures: ${failures.join(', ')}`);
    testsFailed++;
    errors.push(`Access patterns: ${failures.join(', ')}`);
  }
} catch (error) {
  console.log(`❌ FAIL: Error simulating access: ${error.message}`);
  testsFailed++;
  errors.push(`Access simulation: ${error.message}`);
}

// TEST 7: Test validation of knob values
console.log("\nTEST 7: Testing knob value validation...");
try {
  // Test valid update
  let validUpdate = true;
  try {
    knobsResolver.updateGlobalKnob('pcm.input_gain_db', 12, 'test');
  } catch (e) {
    validUpdate = false;
  }

  // Test invalid update (out of range)
  let invalidCaught = false;
  try {
    knobsResolver.updateGlobalKnob('pcm.input_gain_db', 100, 'test'); // Out of range
  } catch (e) {
    invalidCaught = true;
  }

  // Test invalid knob name
  let unknownCaught = false;
  try {
    knobsResolver.updateGlobalKnob('invalid.knob.name', 1, 'test');
  } catch (e) {
    unknownCaught = true;
  }

  if (validUpdate && invalidCaught && unknownCaught) {
    console.log("✅ PASS: Knob validation working correctly");
    console.log("  ✓ Valid updates accepted");
    console.log("  ✓ Out-of-range values rejected");
    console.log("  ✓ Unknown knobs rejected");
    testsPassed++;
  } else {
    console.log("❌ FAIL: Knob validation issues");
    testsFailed++;
    errors.push(`Validation: valid=${validUpdate}, range=${invalidCaught}, unknown=${unknownCaught}`);
  }
} catch (error) {
  console.log(`❌ FAIL: Error testing validation: ${error.message}`);
  testsFailed++;
  errors.push(`Validation test: ${error.message}`);
}

// TEST 8: Check state management
console.log("\nTEST 8: Checking state management...");
try {
  const state = knobsResolver.getState();

  if (state.baseline && Object.keys(state.baseline).length > 0) {
    console.log(`✅ PASS: State management working`);
    console.log(`  ✓ Baseline knobs: ${Object.keys(state.baseline).length}`);
    console.log(`  ✓ Global overrides: ${Object.keys(state.globalOverrides).length}`);
    console.log(`  ✓ Trace overrides: ${state.traceOverridesCount}`);
    testsPassed++;
  } else {
    console.log("❌ FAIL: State management issue");
    testsFailed++;
    errors.push("State management failed");
  }
} catch (error) {
  console.log(`❌ FAIL: Error checking state: ${error.message}`);
  testsFailed++;
  errors.push(`State check: ${error.message}`);
}

// TEST 9: Reset and cleanup
console.log("\nTEST 9: Testing reset functionality...");
try {
  knobsResolver.resetAllKnobs();
  const state = knobsResolver.getState();

  if (Object.keys(state.globalOverrides).length === 0 &&
      state.traceOverridesCount === 0) {
    console.log("✅ PASS: Reset functionality works");
    testsPassed++;
  } else {
    console.log("❌ FAIL: Reset did not clear overrides");
    testsFailed++;
    errors.push("Reset failed");
  }
} catch (error) {
  console.log(`❌ FAIL: Error during reset: ${error.message}`);
  testsFailed++;
  errors.push(`Reset: ${error.message}`);
}

// Final Summary
console.log("\n" + "=".repeat(50));
console.log("LIVE MONITORING SYSTEM TEST RESULTS");
console.log("=".repeat(50));
console.log(`Tests Passed: ${testsPassed}/9`);
console.log(`Tests Failed: ${testsFailed}/9`);

if (testsFailed > 0) {
  console.log("\n❌ FAILURES DETECTED:");
  errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  console.log("\nThe monitoring system may not work correctly!");
  process.exit(1);
} else {
  console.log("\n✅ ALL TESTS PASSED!");
  console.log("\nThe live monitoring system knob resolution is working correctly:");
  console.log("  • KnobsResolver accepts the baseline knobs");
  console.log("  • All critical knobs are accessible");
  console.log("  • Knob updates and overrides work");
  console.log("  • Validation is functioning");
  console.log("  • St_Handler_Generic access patterns work");
  console.log("\n🚀 The monitoring system is ready for use!");
  process.exit(0);
}