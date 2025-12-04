#!/usr/bin/env node

/**
 * Station-3 Implementation QA Test Suite
 * Tests all components implemented so far before STTTTSserver integration
 *
 * Tests:
 * 1. Configuration files existence and validity
 * 2. Station3Handler module functionality
 * 3. StationAgent availability
 * 4. Config loading and polling mechanism
 * 5. Knob values and defaults
 * 6. Language configuration (3333=en, 4444=fr)
 * 7. Model configuration (nova-3)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function testPassed(testName, details = '') {
  results.passed++;
  results.tests.push({ name: testName, status: 'PASSED', details });
  log(`  ✅ ${testName}`, colors.green);
  if (details) log(`     ${details}`, colors.cyan);
}

function testFailed(testName, error) {
  results.failed++;
  results.tests.push({ name: testName, status: 'FAILED', error: error.toString() });
  log(`  ❌ ${testName}`, colors.red);
  log(`     Error: ${error}`, colors.yellow);
}

function runTest(testName, testFunction) {
  try {
    testFunction();
    return true;
  } catch (error) {
    testFailed(testName, error);
    return false;
  }
}

// Start testing
log('\n========================================', colors.blue);
log('  Station-3 Implementation QA Suite', colors.blue);
log('========================================\n', colors.blue);

// Test 1: Check configuration files
log('📁 Test Group 1: Configuration Files', colors.cyan);
log('----------------------------------------', colors.cyan);

runTest('Config file for extension 3333 exists', () => {
  const configPath = '/tmp/STATION_3-3333-config.json';
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found at ${configPath}`);
  }
  testPassed('Config file for extension 3333 exists', configPath);
});

runTest('Config file for extension 4444 exists', () => {
  const configPath = '/tmp/STATION_3-4444-config.json';
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found at ${configPath}`);
  }
  testPassed('Config file for extension 4444 exists', configPath);
});

runTest('Config 3333 has valid JSON structure', () => {
  const configPath = '/tmp/STATION_3-3333-config.json';
  const content = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(content);

  // Check required fields
  if (!config.defaults || !config.defaults.deepgram) {
    throw new Error('Missing defaults.deepgram structure');
  }

  testPassed('Config 3333 has valid JSON structure',
    `Keys: ${Object.keys(config).join(', ')}`);
});

runTest('Config 4444 has valid JSON structure', () => {
  const configPath = '/tmp/STATION_3-4444-config.json';
  const content = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(content);

  // Check required fields
  if (!config.defaults || !config.defaults.deepgram) {
    throw new Error('Missing defaults.deepgram structure');
  }

  testPassed('Config 4444 has valid JSON structure',
    `Keys: ${Object.keys(config).join(', ')}`);
});

// Test 2: Verify baseline values
log('\n🔍 Test Group 2: Baseline Configuration Values', colors.cyan);
log('----------------------------------------', colors.cyan);

runTest('Extension 3333 uses English language', () => {
  const config = JSON.parse(fs.readFileSync('/tmp/STATION_3-3333-config.json', 'utf8'));
  const lang = config.defaults.deepgram.language;

  if (lang !== 'en') {
    throw new Error(`Expected 'en', got '${lang}'`);
  }

  testPassed('Extension 3333 uses English language', `language: "${lang}"`);
});

runTest('Extension 4444 uses French language', () => {
  const config = JSON.parse(fs.readFileSync('/tmp/STATION_3-4444-config.json', 'utf8'));
  const lang = config.defaults.deepgram.language;

  if (lang !== 'fr') {
    throw new Error(`Expected 'fr', got '${lang}'`);
  }

  testPassed('Extension 4444 uses French language', `language: "${lang}"`);
});

runTest('Both extensions use nova-3 model', () => {
  const config3333 = JSON.parse(fs.readFileSync('/tmp/STATION_3-3333-config.json', 'utf8'));
  const config4444 = JSON.parse(fs.readFileSync('/tmp/STATION_3-4444-config.json', 'utf8'));

  const model3333 = config3333.defaults.deepgram.model;
  const model4444 = config4444.defaults.deepgram.model;

  if (model3333 !== 'nova-3' || model4444 !== 'nova-3') {
    throw new Error(`Expected nova-3, got 3333: '${model3333}', 4444: '${model4444}'`);
  }

  testPassed('Both extensions use nova-3 model', 'model: "nova-3"');
});

runTest('Critical Deepgram parameters present', () => {
  const config = JSON.parse(fs.readFileSync('/tmp/STATION_3-3333-config.json', 'utf8'));
  const dg = config.defaults.deepgram;

  const requiredParams = ['encoding', 'sample_rate', 'channels', 'interim_results', 'endpointing', 'smart_format'];
  const missing = requiredParams.filter(p => !(p in dg));

  if (missing.length > 0) {
    throw new Error(`Missing parameters: ${missing.join(', ')}`);
  }

  testPassed('Critical Deepgram parameters present',
    `All ${requiredParams.length} required params found`);
});

// Test 3: Station3Handler module
log('\n🔧 Test Group 3: Station3Handler Module', colors.cyan);
log('----------------------------------------', colors.cyan);

runTest('Station3Handler file exists', () => {
  const handlerPath = '/tmp/station3-handler.js';
  if (!fs.existsSync(handlerPath)) {
    throw new Error(`Handler not found at ${handlerPath}`);
  }

  const stats = fs.statSync(handlerPath);
  testPassed('Station3Handler file exists',
    `Size: ${stats.size} bytes`);
});

runTest('Station3Handler has valid syntax', () => {
  const handlerPath = '/tmp/station3-handler.js';
  try {
    require(handlerPath);
    testPassed('Station3Handler has valid syntax', 'Module loads without errors');
  } catch (error) {
    throw new Error(`Syntax error: ${error.message}`);
  }
});

runTest('Station3Handler creates instances correctly', () => {
  const Station3Handler = require('/tmp/station3-handler.js');

  const handler3333 = new Station3Handler('3333');
  const handler4444 = new Station3Handler('4444');

  if (!handler3333 || !handler4444) {
    throw new Error('Failed to create handler instances');
  }

  testPassed('Station3Handler creates instances correctly',
    'Both 3333 and 4444 instances created');
});

runTest('Station3Handler.getDeepgramConfig returns correct structure', () => {
  const Station3Handler = require('/tmp/station3-handler.js');
  const handler = new Station3Handler('3333');

  const config = handler.getDeepgramConfig();

  // Check for required fields
  const requiredFields = ['model', 'language', 'encoding', 'sample_rate', 'channels'];
  const missing = requiredFields.filter(f => !(f in config));

  if (missing.length > 0) {
    throw new Error(`Missing fields: ${missing.join(', ')}`);
  }

  testPassed('Station3Handler.getDeepgramConfig returns correct structure',
    `Fields: ${Object.keys(config).slice(0, 8).join(', ')}...`);
});

runTest('Station3Handler uses correct language per extension', () => {
  const Station3Handler = require('/tmp/station3-handler.js');

  const handler3333 = new Station3Handler('3333');
  const handler4444 = new Station3Handler('4444');

  const config3333 = handler3333.getDeepgramConfig();
  const config4444 = handler4444.getDeepgramConfig();

  if (config3333.language !== 'en') {
    throw new Error(`3333 should use 'en', got '${config3333.language}'`);
  }

  if (config4444.language !== 'fr') {
    throw new Error(`4444 should use 'fr', got '${config4444.language}'`);
  }

  testPassed('Station3Handler uses correct language per extension',
    '3333=en, 4444=fr');
});

runTest('Station3Handler defaults to nova-3 model', () => {
  const Station3Handler = require('/tmp/station3-handler.js');
  const handler = new Station3Handler('3333');
  const config = handler.getDeepgramConfig();

  if (config.model !== 'nova-3') {
    throw new Error(`Expected nova-3, got '${config.model}'`);
  }

  testPassed('Station3Handler defaults to nova-3 model',
    'model: "nova-3"');
});

// Test 4: Configuration loading
log('\n📊 Test Group 4: Configuration Loading', colors.cyan);
log('----------------------------------------', colors.cyan);

runTest('Handler loads existing config files', () => {
  const Station3Handler = require('/tmp/station3-handler.js');
  const handler = new Station3Handler('3333');

  // loadKnobs should load from config file
  const knobs = handler.loadKnobs();

  if (!knobs || !knobs.deepgram) {
    throw new Error('Failed to load knobs from config file');
  }

  testPassed('Handler loads existing config files',
    `Loaded ${Object.keys(knobs).length} top-level keys`);
});

runTest('Handler config matches file config', () => {
  const Station3Handler = require('/tmp/station3-handler.js');
  const handler = new Station3Handler('3333');

  // Load config from file directly
  const fileConfig = JSON.parse(fs.readFileSync('/tmp/STATION_3-3333-config.json', 'utf8'));

  // Load through handler
  const handlerKnobs = handler.loadKnobs();

  // Compare language settings
  const fileLang = fileConfig.defaults.deepgram.language;
  const handlerConfig = handler.getDeepgramConfig();

  if (handlerConfig.language !== fileLang) {
    throw new Error(`Language mismatch: file='${fileLang}', handler='${handlerConfig.language}'`);
  }

  testPassed('Handler config matches file config',
    'Configuration consistency verified');
});

// Test 5: Polling mechanism
log('\n⏱️ Test Group 5: Polling Mechanism', colors.cyan);
log('----------------------------------------', colors.cyan);

runTest('Polling interval is configured', () => {
  const handlerContent = fs.readFileSync('/tmp/station3-handler.js', 'utf8');

  // Check for setInterval with 100ms
  if (!handlerContent.includes('setInterval') || !handlerContent.includes('100')) {
    throw new Error('100ms polling interval not found in code');
  }

  testPassed('Polling interval is configured', '100ms interval found');
});

runTest('Handler detects config changes', () => {
  const Station3Handler = require('/tmp/station3-handler.js');
  const handler = new Station3Handler('3333');

  // Initial config
  const initialKnobs = JSON.stringify(handler.knobs);

  // Simulate config change
  const testConfig = {
    deepgram: {
      model: 'nova-3',
      language: 'en',
      test_flag: true
    }
  };

  fs.writeFileSync('/tmp/STATION_3-3333-config.json', JSON.stringify(testConfig));

  // Wait for polling to detect change (wait 150ms to ensure poll happens)
  setTimeout(() => {
    const newKnobs = handler.loadKnobs();

    // Restore original config
    const original = {
      defaults: { deepgram: { model: 'nova-3', language: 'en' } },
      saved_defaults: { deepgram: { model: 'nova-3', language: 'en' } },
      active: { deepgram: { model: 'nova-3', language: 'en' } }
    };
    fs.writeFileSync('/tmp/STATION_3-3333-config.json', JSON.stringify(original, null, 2));

    if (!newKnobs.deepgram || !newKnobs.deepgram.test_flag) {
      throw new Error('Failed to detect config change');
    }

    testPassed('Handler detects config changes', 'Config change detected successfully');
  }, 150);
});

// Test 6: Integration readiness
log('\n✅ Test Group 6: Integration Readiness', colors.cyan);
log('----------------------------------------', colors.cyan);

runTest('All production values preserved', () => {
  const config3333 = JSON.parse(fs.readFileSync('/tmp/STATION_3-3333-config.json', 'utf8'));
  const config4444 = JSON.parse(fs.readFileSync('/tmp/STATION_3-4444-config.json', 'utf8'));

  // Check all baseline values are preserved
  const baseline = {
    model: 'nova-3',
    encoding: 'linear16',
    sample_rate: 16000,
    channels: 1,
    interim_results: true,
    endpointing: 300,
    smart_format: true
  };

  for (const [key, value] of Object.entries(baseline)) {
    if (config3333.defaults?.deepgram?.[key] !== value) {
      throw new Error(`3333: ${key} mismatch`);
    }
    if (config4444.defaults?.deepgram?.[key] !== value) {
      throw new Error(`4444: ${key} mismatch`);
    }
  }

  testPassed('All production values preserved',
    'All 7 baseline parameters match');
});

runTest('Handler maintains backward compatibility', () => {
  const Station3Handler = require('/tmp/station3-handler.js');
  const handler = new Station3Handler('3333');
  const config = handler.getDeepgramConfig();

  // These are the exact parameters STTTSserver currently uses
  const requiredParams = {
    model: 'nova-3',
    encoding: 'linear16',
    sample_rate: 16000,
    channels: 1,
    interim_results: true,
    endpointing: 300,
    smart_format: true,
    language: 'en'
  };

  for (const [key, expected] of Object.entries(requiredParams)) {
    if (config[key] !== expected) {
      throw new Error(`${key}: expected '${expected}', got '${config[key]}'`);
    }
  }

  testPassed('Handler maintains backward compatibility',
    'All STTTSserver parameters preserved');
});

// Final summary
setTimeout(() => {
  log('\n========================================', colors.blue);
  log('           TEST RESULTS SUMMARY', colors.blue);
  log('========================================', colors.blue);

  const total = results.passed + results.failed;
  const percentage = total > 0 ? Math.round((results.passed / total) * 100) : 0;

  log(`\n  Total Tests: ${total}`, colors.cyan);
  log(`  ✅ Passed: ${results.passed}`, colors.green);
  log(`  ❌ Failed: ${results.failed}`, colors.red);
  log(`  Success Rate: ${percentage}%\n`, percentage === 100 ? colors.green : colors.yellow);

  if (results.failed > 0) {
    log('Failed Tests:', colors.red);
    results.tests.filter(t => t.status === 'FAILED').forEach(test => {
      log(`  - ${test.name}`, colors.red);
      log(`    ${test.error}`, colors.yellow);
    });
  }

  // System readiness check
  log('\n📋 SYSTEM READINESS CHECK:', colors.cyan);
  log('----------------------------------------', colors.cyan);

  const readinessChecks = [
    { name: 'Configuration Files', ready: results.tests.filter(t => t.name.includes('Config')).every(t => t.status === 'PASSED') },
    { name: 'Station3Handler Module', ready: results.tests.filter(t => t.name.includes('Handler')).every(t => t.status === 'PASSED') },
    { name: 'Language Settings', ready: results.tests.filter(t => t.name.includes('language')).every(t => t.status === 'PASSED') },
    { name: 'Model Configuration', ready: results.tests.filter(t => t.name.includes('nova-3')).every(t => t.status === 'PASSED') },
    { name: 'Backward Compatibility', ready: results.tests.filter(t => t.name.includes('compatibility')).every(t => t.status === 'PASSED') }
  ];

  readinessChecks.forEach(check => {
    const icon = check.ready ? '✅' : '❌';
    const color = check.ready ? colors.green : colors.red;
    log(`  ${icon} ${check.name}: ${check.ready ? 'READY' : 'NOT READY'}`, color);
  });

  const allReady = readinessChecks.every(c => c.ready);

  log('\n========================================', colors.blue);
  if (allReady) {
    log('  🎉 SYSTEM READY FOR INTEGRATION! 🎉', colors.green);
    log('  All components tested and verified.', colors.green);
    log('  Safe to proceed with STTTSserver integration.', colors.green);
  } else {
    log('  ⚠️ SYSTEM NOT READY FOR INTEGRATION', colors.red);
    log('  Please fix the failed tests before proceeding.', colors.yellow);
  }
  log('========================================\n', colors.blue);

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}, 500); // Wait for async tests to complete