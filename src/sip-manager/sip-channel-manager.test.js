/**
 * SIP Channel Manager Test Suite
 */

const { SIPChannelManager, ChannelState, TranslationMode } = require('./sip-channel-manager');

/**
 * Test: Initialize SIP Manager
 */
async function testInitialization() {
  console.log('\n=== Test: SIP Manager Initialization ===');

  const manager = new SIPChannelManager({
    asteriskHost: 'localhost',
    sipDomain: 'test.local',
    maxChannels: 50
  });

  await manager.initialize();

  const stats = manager.getStatistics();
  console.log('Initial stats:', stats);

  if (stats.totalChannels === 0 && stats.activeChannels === 0) {
    console.log('✓ Initialization successful');
    await manager.shutdown();
    return true;
  } else {
    console.log('✗ Initialization failed');
    await manager.shutdown();
    return false;
  }
}

/**
 * Test: Register Endpoints
 */
async function testEndpointRegistration() {
  console.log('\n=== Test: Endpoint Registration ===');

  const manager = new SIPChannelManager();
  await manager.initialize();

  // Register two endpoints
  const endpoint1 = await manager.registerEndpoint({
    endpointId: 'ep_001',
    userId: 'user1',
    username: 'alice',
    displayName: 'Alice (EN)',
    password: 'secret123',
    language: 'en'
  });

  const endpoint2 = await manager.registerEndpoint({
    endpointId: 'ep_002',
    userId: 'user2',
    username: 'bob',
    displayName: 'Bob (JA)',
    password: 'secret456',
    language: 'ja'
  });

  console.log(`Registered endpoint 1: ${endpoint1.displayName}`);
  console.log(`Registered endpoint 2: ${endpoint2.displayName}`);

  const allEndpoints = manager.getAllEndpoints();
  console.log(`Total endpoints: ${allEndpoints.length}`);

  if (allEndpoints.length === 2) {
    console.log('✓ Endpoint registration successful');
    await manager.shutdown();
    return true;
  } else {
    console.log('✗ Endpoint registration failed');
    await manager.shutdown();
    return false;
  }
}

/**
 * Test: Create Translation Channel
 */
async function testChannelCreation() {
  console.log('\n=== Test: Translation Channel Creation ===');

  const manager = new SIPChannelManager();
  await manager.initialize();

  // Register endpoints
  await manager.registerEndpoint({
    endpointId: 'ep_001',
    userId: 'user1',
    username: 'alice',
    displayName: 'Alice',
    password: 'secret123',
    language: 'en'
  });

  await manager.registerEndpoint({
    endpointId: 'ep_002',
    userId: 'user2',
    username: 'bob',
    displayName: 'Bob',
    password: 'secret456',
    language: 'ja'
  });

  // Create channel
  const channel = await manager.createChannel({
    callerEndpointId: 'ep_001',
    calleeEndpointId: 'ep_002',
    translationMode: TranslationMode.BIDIRECTIONAL
  });

  console.log(`Created channel: ${channel.channelId}`);
  console.log(`  Source lang: ${channel.sourceLang}`);
  console.log(`  Target lang: ${channel.targetLang}`);
  console.log(`  State: ${channel.state}`);

  if (channel.state === ChannelState.IDLE && channel.sourceLang === 'en' && channel.targetLang === 'ja') {
    console.log('✓ Channel creation successful');
    await manager.shutdown();
    return true;
  } else {
    console.log('✗ Channel creation failed');
    await manager.shutdown();
    return false;
  }
}

/**
 * Test: Channel Lifecycle
 */
async function testChannelLifecycle() {
  console.log('\n=== Test: Channel Lifecycle ===');

  const manager = new SIPChannelManager();
  await manager.initialize();

  let channelCreatedEvent = false;
  let channelConnectedEvent = false;
  let channelTranslatingEvent = false;
  let channelDisconnectedEvent = false;

  manager.on('channel:created', () => {
    channelCreatedEvent = true;
  });

  manager.on('channel:connected', () => {
    channelConnectedEvent = true;
  });

  manager.on('channel:translating', () => {
    channelTranslatingEvent = true;
  });

  manager.on('channel:disconnected', () => {
    channelDisconnectedEvent = true;
  });

  // Register endpoints
  const ep1 = await manager.registerEndpoint({
    endpointId: 'ep_001',
    userId: 'user1',
    username: 'alice',
    displayName: 'Alice',
    password: 'secret123',
    language: 'en'
  });

  const ep2 = await manager.registerEndpoint({
    endpointId: 'ep_002',
    userId: 'user2',
    username: 'bob',
    displayName: 'Bob',
    password: 'secret456',
    language: 'ja'
  });

  // Mark as registered
  ep1.registered = true;
  ep2.registered = true;

  // Create and connect channel
  const channel = await manager.createChannel({
    callerEndpointId: 'ep_001',
    calleeEndpointId: 'ep_002'
  });

  console.log(`Channel state after creation: ${channel.state}`);

  // Disconnect channel
  await manager.disconnectChannel(channel.channelId);

  console.log('Events emitted:');
  console.log(`  Created: ${channelCreatedEvent}`);
  console.log(`  Connected: ${channelConnectedEvent}`);
  console.log(`  Translating: ${channelTranslatingEvent}`);
  console.log(`  Disconnected: ${channelDisconnectedEvent}`);

  if (channelCreatedEvent && channelDisconnectedEvent) {
    console.log('✓ Channel lifecycle test passed');
    await manager.shutdown();
    return true;
  } else {
    console.log('✗ Channel lifecycle test failed');
    await manager.shutdown();
    return false;
  }
}

/**
 * Test: Maximum Channels Limit
 */
async function testMaxChannelsLimit() {
  console.log('\n=== Test: Maximum Channels Limit ===');

  const manager = new SIPChannelManager({
    maxChannels: 3
  });

  await manager.initialize();

  // Register endpoints
  await manager.registerEndpoint({
    endpointId: 'ep_001',
    userId: 'user1',
    username: 'alice',
    displayName: 'Alice',
    password: 'secret123',
    language: 'en'
  });

  await manager.registerEndpoint({
    endpointId: 'ep_002',
    userId: 'user2',
    username: 'bob',
    displayName: 'Bob',
    password: 'secret456',
    language: 'ja'
  });

  // Create channels up to limit
  await manager.createChannel({
    callerEndpointId: 'ep_001',
    calleeEndpointId: 'ep_002'
  });

  await manager.createChannel({
    callerEndpointId: 'ep_001',
    calleeEndpointId: 'ep_002'
  });

  await manager.createChannel({
    callerEndpointId: 'ep_001',
    calleeEndpointId: 'ep_002'
  });

  console.log(`Created 3 channels (max: 3)`);

  // Try to exceed limit
  let exceeded = false;
  try {
    await manager.createChannel({
      callerEndpointId: 'ep_001',
      calleeEndpointId: 'ep_002'
    });
    exceeded = true;
  } catch (error) {
    console.log(`Expected error: ${error.message}`);
  }

  if (!exceeded) {
    console.log('✓ Max channels limit enforced');
    await manager.shutdown();
    return true;
  } else {
    console.log('✗ Max channels limit not enforced');
    await manager.shutdown();
    return false;
  }
}

/**
 * Test: Statistics Tracking
 */
async function testStatisticsTracking() {
  console.log('\n=== Test: Statistics Tracking ===');

  const manager = new SIPChannelManager();
  await manager.initialize();

  const initialStats = manager.getStatistics();
  console.log('Initial stats:', initialStats);

  // Register endpoints
  await manager.registerEndpoint({
    endpointId: 'ep_001',
    userId: 'user1',
    username: 'alice',
    displayName: 'Alice',
    password: 'secret123',
    language: 'en'
  });

  await manager.registerEndpoint({
    endpointId: 'ep_002',
    userId: 'user2',
    username: 'bob',
    displayName: 'Bob',
    password: 'secret456',
    language: 'ja'
  });

  // Create channels
  const ch1 = await manager.createChannel({
    callerEndpointId: 'ep_001',
    calleeEndpointId: 'ep_002'
  });

  const ch2 = await manager.createChannel({
    callerEndpointId: 'ep_001',
    calleeEndpointId: 'ep_002'
  });

  const midStats = manager.getStatistics();
  console.log('After creating 2 channels:', midStats);

  // Disconnect one channel
  await manager.disconnectChannel(ch1.channelId);

  const finalStats = manager.getStatistics();
  console.log('After disconnecting 1 channel:', finalStats);

  if (finalStats.totalChannels === 2 &&
      finalStats.activeChannels === 1 &&
      finalStats.endpoints === 2) {
    console.log('✓ Statistics tracking accurate');
    await manager.shutdown();
    return true;
  } else {
    console.log('✗ Statistics tracking inaccurate');
    await manager.shutdown();
    return false;
  }
}

/**
 * Test: Unregister Endpoint with Active Channels
 */
async function testUnregisterWithActiveChannels() {
  console.log('\n=== Test: Unregister Endpoint with Active Channels ===');

  const manager = new SIPChannelManager();
  await manager.initialize();

  // Register endpoints
  await manager.registerEndpoint({
    endpointId: 'ep_001',
    userId: 'user1',
    username: 'alice',
    displayName: 'Alice',
    password: 'secret123',
    language: 'en'
  });

  await manager.registerEndpoint({
    endpointId: 'ep_002',
    userId: 'user2',
    username: 'bob',
    displayName: 'Bob',
    password: 'secret456',
    language: 'ja'
  });

  // Create channel
  await manager.createChannel({
    callerEndpointId: 'ep_001',
    calleeEndpointId: 'ep_002'
  });

  const beforeStats = manager.getStatistics();
  console.log(`Active channels before unregister: ${beforeStats.activeChannels}`);

  // Unregister endpoint with active channel
  await manager.unregisterEndpoint('ep_001');

  const afterStats = manager.getStatistics();
  console.log(`Active channels after unregister: ${afterStats.activeChannels}`);

  if (afterStats.activeChannels === 0 && afterStats.endpoints === 1) {
    console.log('✓ Endpoint unregistration with cleanup successful');
    await manager.shutdown();
    return true;
  } else {
    console.log('✗ Endpoint unregistration cleanup failed');
    await manager.shutdown();
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   SIP Channel Manager Test Suite      ║');
  console.log('╚════════════════════════════════════════╝');

  const tests = [
    { name: 'SIP Manager Initialization', fn: testInitialization },
    { name: 'Endpoint Registration', fn: testEndpointRegistration },
    { name: 'Translation Channel Creation', fn: testChannelCreation },
    { name: 'Channel Lifecycle', fn: testChannelLifecycle },
    { name: 'Maximum Channels Limit', fn: testMaxChannelsLimit },
    { name: 'Statistics Tracking', fn: testStatisticsTracking },
    { name: 'Unregister with Active Channels', fn: testUnregisterWithActiveChannels }
  ];

  const results = [];

  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (error) {
      console.error(`✗ Test "${test.name}" threw exception:`, error.message);
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
  testInitialization,
  testEndpointRegistration,
  testChannelCreation,
  testChannelLifecycle,
  testMaxChannelsLimit,
  testStatisticsTracking,
  testUnregisterWithActiveChannels
};
