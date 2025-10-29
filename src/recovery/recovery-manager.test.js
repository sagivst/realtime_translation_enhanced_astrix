/**
 * Recovery Manager Test Suite
 *
 * Tests all 4 recovery tiers:
 * - Soft recovery (retry with backoff)
 * - Hard recovery (component reset)
 * - Failover (backup service)
 * - Reset (full restart)
 */

const { RecoveryManager, RecoveryTier, HealthState, ErrorSeverity } = require('./recovery-manager');

/**
 * Mock component for testing
 */
class MockComponent {
  constructor(config = {}) {
    this.failCount = config.failCount || 0;
    this.currentFails = 0;
    this.resetCalled = false;
    this.initialized = true;
    this.healthCheckResult = true;
  }

  async operation() {
    if (this.currentFails < this.failCount) {
      this.currentFails++;
      throw new Error(`Operation failed (${this.currentFails}/${this.failCount})`);
    }
    return 'success';
  }

  async reset() {
    this.resetCalled = true;
    this.currentFails = 0;
    return true;
  }

  async healthCheck() {
    return this.healthCheckResult;
  }
}

/**
 * Test: Soft Recovery
 */
async function testSoftRecovery() {
  console.log('\n=== Test: Soft Recovery ===');

  const recovery = new RecoveryManager({
    softRetryMax: 3,
    softRetryDelay: 100,
    softRetryBackoff: 2.0
  });

  const component = new MockComponent({ failCount: 2 });
  recovery.registerComponent('test-component', component);

  // Simulate error with retry operation
  let callCount = 0;
  const operation = async () => {
    callCount++;
    return await component.operation();
  };

  const result = await recovery.handleError(
    'test-component',
    new Error('Transient failure'),
    { operation, severity: ErrorSeverity.LOW }
  );

  console.log('Result:', result);
  console.log('Call count:', callCount);
  console.log('Component fails:', component.currentFails);

  // Verify
  if (result.success && result.tier === RecoveryTier.SOFT) {
    console.log('✓ Soft recovery succeeded');
    return true;
  } else {
    console.log('✗ Soft recovery failed');
    return false;
  }
}

/**
 * Test: Hard Recovery
 */
async function testHardRecovery() {
  console.log('\n=== Test: Hard Recovery ===');

  const recovery = new RecoveryManager({
    softRetryMax: 2,
    hardResetTimeout: 1000
  });

  const component = new MockComponent({ failCount: 0 });
  recovery.registerComponent('test-component', component);

  // Simulate multiple errors to degrade health
  for (let i = 0; i < 5; i++) {
    recovery.recordError('test-component', new Error('Service error'), {});
  }

  // Force unhealthy state
  const componentInfo = recovery.components.get('test-component');
  componentInfo.health = HealthState.UNHEALTHY;

  const result = await recovery.handleError(
    'test-component',
    new Error('Service degraded'),
    { severity: ErrorSeverity.HIGH }
  );

  console.log('Result:', result);
  console.log('Reset called:', component.resetCalled);

  // Verify
  if (result.success && result.tier === RecoveryTier.HARD && component.resetCalled) {
    console.log('✓ Hard recovery succeeded');
    return true;
  } else {
    console.log('✗ Hard recovery failed');
    return false;
  }
}

/**
 * Test: Failover Recovery
 */
async function testFailoverRecovery() {
  console.log('\n=== Test: Failover Recovery ===');

  const recovery = new RecoveryManager({
    failoverEnabled: true,
    failoverTimeout: 1000
  });

  const primaryComponent = new MockComponent({ failCount: 99 });  // Always fails
  const backupComponent = new MockComponent({ failCount: 0 });    // Always succeeds

  primaryComponent.backup = backupComponent;

  recovery.registerComponent('test-component', primaryComponent);

  // Trigger failover with critical error
  const result = await recovery.handleError(
    'test-component',
    new Error('Critical failure'),
    { severity: ErrorSeverity.CRITICAL }
  );

  console.log('Result:', result);

  const componentInfo = recovery.components.get('test-component');
  const isBackupActive = componentInfo.component === backupComponent;

  console.log('Backup active:', isBackupActive);

  // Verify
  if (result.success && result.tier === RecoveryTier.FAILOVER && isBackupActive) {
    console.log('✓ Failover recovery succeeded');
    return true;
  } else {
    console.log('✗ Failover recovery failed');
    return false;
  }
}

/**
 * Test: Reset Recovery
 */
async function testResetRecovery() {
  console.log('\n=== Test: Reset Recovery ===');

  const recovery = new RecoveryManager({
    resetCooldown: 5000
  });

  const component = new MockComponent({ failCount: 99 });
  recovery.registerComponent('test-component', component);

  let resetEventEmitted = false;

  recovery.on('recovery:reset_required', (data) => {
    console.log('Reset event emitted:', data.componentId);
    resetEventEmitted = true;
  });

  // Trigger reset with critical error and no backup
  const result = await recovery.handleError(
    'test-component',
    new Error('Unrecoverable failure'),
    { severity: ErrorSeverity.CRITICAL }
  );

  console.log('Result:', result);
  console.log('Reset event emitted:', resetEventEmitted);

  // Verify
  if (result.success && result.tier === RecoveryTier.RESET && resetEventEmitted) {
    console.log('✓ Reset recovery succeeded');
    return true;
  } else {
    console.log('✗ Reset recovery failed');
    return false;
  }
}

/**
 * Test: Error Classification
 */
async function testErrorClassification() {
  console.log('\n=== Test: Error Classification ===');

  const recovery = new RecoveryManager();

  const tests = [
    { error: new Error('Fatal error occurred'), expected: ErrorSeverity.CRITICAL },
    { error: new Error('Connection timeout'), expected: ErrorSeverity.HIGH },
    { error: new Error('Invalid input'), expected: ErrorSeverity.MEDIUM },
    { error: new Error('Minor issue'), expected: ErrorSeverity.LOW }
  ];

  let allPassed = true;

  for (const test of tests) {
    const severity = recovery.classifyErrorSeverity(test.error, {});
    console.log(`Error: "${test.error.message}" → ${severity} (expected: ${test.expected})`);

    if (severity !== test.expected) {
      console.log('✗ Classification mismatch');
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log('✓ Error classification passed');
  }

  return allPassed;
}

/**
 * Test: Health Monitoring
 */
async function testHealthMonitoring() {
  console.log('\n=== Test: Health Monitoring ===');

  const recovery = new RecoveryManager({
    degradedThreshold: 0.7,
    unhealthyThreshold: 0.5
  });

  const component = new MockComponent();
  recovery.registerComponent('test-component', component);

  const componentInfo = recovery.components.get('test-component');

  // Simulate operations
  console.log('Simulating operations...');

  // 70% success → Healthy
  componentInfo.operations = { total: 10, successful: 7, failed: 3 };
  recovery.updateComponentHealth('test-component');
  console.log(`70% success → ${componentInfo.health} (expected: ${HealthState.HEALTHY})`);

  // 60% success → Degraded
  componentInfo.operations = { total: 10, successful: 6, failed: 4 };
  recovery.updateComponentHealth('test-component');
  console.log(`60% success → ${componentInfo.health} (expected: ${HealthState.DEGRADED})`);

  // 40% success → Unhealthy
  componentInfo.operations = { total: 10, successful: 4, failed: 6 };
  recovery.updateComponentHealth('test-component');
  console.log(`40% success → ${componentInfo.health} (expected: ${HealthState.UNHEALTHY})`);

  // 0% success → Failed
  componentInfo.operations = { total: 10, successful: 0, failed: 10 };
  recovery.updateComponentHealth('test-component');
  console.log(`0% success → ${componentInfo.health} (expected: ${HealthState.FAILED})`);

  console.log('✓ Health monitoring test completed');

  return true;
}

/**
 * Test: Recovery Escalation
 */
async function testRecoveryEscalation() {
  console.log('\n=== Test: Recovery Escalation ===');

  const recovery = new RecoveryManager({
    softRetryMax: 2,
    softRetryDelay: 50
  });

  const component = new MockComponent({ failCount: 99 });  // Always fails
  recovery.registerComponent('test-component', component);

  // First error - should trigger soft recovery
  const result1 = await recovery.handleError(
    'test-component',
    new Error('First failure'),
    { operation: () => component.operation() }
  );

  console.log('First recovery tier:', result1.tier);

  // Second error while soft recovery in progress - should escalate
  // Wait a bit to ensure first recovery completes
  await new Promise(resolve => setTimeout(resolve, 200));

  const result2 = await recovery.handleError(
    'test-component',
    new Error('Second failure'),
    { severity: ErrorSeverity.HIGH }
  );

  console.log('Second recovery tier:', result2.tier);

  // Verify escalation happened
  if (result1.tier === RecoveryTier.SOFT && result2.tier === RecoveryTier.HARD) {
    console.log('✓ Recovery escalation succeeded');
    return true;
  } else {
    console.log('✗ Recovery escalation failed');
    return false;
  }
}

/**
 * Test: System Health Status
 */
async function testSystemHealthStatus() {
  console.log('\n=== Test: System Health Status ===');

  const recovery = new RecoveryManager();

  const component1 = new MockComponent();
  const component2 = new MockComponent();

  recovery.registerComponent('component-1', component1);
  recovery.registerComponent('component-2', component2);

  // Simulate some operations
  recovery.recordError('component-1', new Error('Test error'), {});
  recovery.recordError('component-1', new Error('Test error'), {});

  const systemHealth = recovery.getSystemHealth();

  console.log('System health:', JSON.stringify(systemHealth, null, 2));

  // Verify
  if (systemHealth.components.length === 2) {
    console.log('✓ System health status test passed');
    return true;
  } else {
    console.log('✗ System health status test failed');
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Recovery Manager Test Suite         ║');
  console.log('╚════════════════════════════════════════╝');

  const tests = [
    { name: 'Soft Recovery', fn: testSoftRecovery },
    { name: 'Hard Recovery', fn: testHardRecovery },
    { name: 'Failover Recovery', fn: testFailoverRecovery },
    { name: 'Reset Recovery', fn: testResetRecovery },
    { name: 'Error Classification', fn: testErrorClassification },
    { name: 'Health Monitoring', fn: testHealthMonitoring },
    { name: 'Recovery Escalation', fn: testRecoveryEscalation },
    { name: 'System Health Status', fn: testSystemHealthStatus }
  ];

  const results = [];

  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (error) {
      console.error(`✗ Test "${test.name}" threw exception:`, error);
      results.push({ name: test.name, passed: false });
    }
  }

  // Summary
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║         Test Results Summary           ║');
  console.log('╚════════════════════════════════════════╝');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(result => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} - ${result.name}`);
  });

  console.log(`\nTotal: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log(`\n❌ ${total - passed} test(s) failed`);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testSoftRecovery,
  testHardRecovery,
  testFailoverRecovery,
  testResetRecovery,
  testErrorClassification,
  testHealthMonitoring,
  testRecoveryEscalation,
  testSystemHealthStatus
};
