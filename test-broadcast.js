/**
 * Test if monitoring server is broadcasting unified-metrics events
 */

const io = require('socket.io-client');

// Connect as a sender
const sender = io('http://20.170.155.53:3001');

// Connect as a receiver (like the bridge)
const receiver = io('http://20.170.155.53:3001');

let receivedCount = 0;

sender.on('connect', () => {
  console.log('✅ Sender connected to monitoring server');

  // Send test data
  const testData = {
    station_id: 'TEST_STATION',
    extension: '9999',
    timestamp: new Date().toISOString(),
    metric_count: 75,
    knob_count: 113,
    metrics: {
      'test.metric1': 100,
      'test.metric2': 200
    },
    knobs: {
      'test.knob1': true,
      'test.knob2': 'value'
    },
    alerts: []
  };

  console.log('📤 Sending test unified-metrics event...');
  sender.emit('unified-metrics', testData);
});

receiver.on('connect', () => {
  console.log('✅ Receiver connected to monitoring server');
});

// Listen for broadcast
receiver.on('unified-metrics', (data) => {
  receivedCount++;
  console.log(`📥 Receiver got unified-metrics broadcast #${receivedCount}:`, {
    station_id: data.station_id,
    extension: data.extension,
    metrics: Object.keys(data.metrics || {}).length,
    knobs: Object.keys(data.knobs || {}).length
  });
});

// Also listen for any other events
receiver.onAny((eventName, ...args) => {
  if (eventName !== 'unified-metrics') {
    console.log(`📡 Receiver got other event: ${eventName}`);
  }
});

sender.on('error', (err) => console.error('❌ Sender error:', err.message));
receiver.on('error', (err) => console.error('❌ Receiver error:', err.message));

// Status check
setTimeout(() => {
  console.log('\n📊 Test Summary:');
  console.log(`  Sender connected: ${sender.connected}`);
  console.log(`  Receiver connected: ${receiver.connected}`);
  console.log(`  Broadcasts received: ${receivedCount}`);

  if (receivedCount === 0) {
    console.log('\n❌ NO BROADCASTS RECEIVED - Monitoring server is NOT broadcasting!');
  } else {
    console.log('\n✅ Broadcasts working correctly!');
  }

  process.exit(receivedCount > 0 ? 0 : 1);
}, 5000);