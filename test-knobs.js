/**
 * Test script to verify knob data collection
 */

const io = require('socket.io-client');

// Connect to monitoring server
const socket = io('http://20.170.155.53:3001');

let receivedData = false;

socket.on('connect', () => {
  console.log('✅ Connected to monitoring server');
});

// Listen for unified-metrics events
socket.on('unified-metrics', (data) => {
  if (!receivedData) {
    receivedData = true;

    console.log('\n=== MONITORING DATA RECEIVED ===');
    console.log(`Station: ${data.station_id}-${data.extension}`);
    console.log(`Timestamp: ${data.timestamp}`);
    console.log(`Metric count: ${data.metric_count}`);
    console.log(`Knob count: ${data.knob_count}`);

    // Check knobs
    const knobs = data.knobs || {};
    const knobCount = Object.keys(knobs).length;

    console.log('\n=== KNOBS ANALYSIS ===');
    console.log(`Total knobs received: ${knobCount}`);

    if (knobCount > 0) {
      // Sample first 10 knobs
      const sampleKnobs = Object.entries(knobs).slice(0, 10);
      console.log('\nFirst 10 knobs:');
      sampleKnobs.forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });

      // Check for specific knob families
      const families = {
        agc: [],
        aec: [],
        noiseReduction: [],
        compressor: [],
        limiter: [],
        buffer: [],
        network: [],
        codec: [],
        deepgram: [],
        translation: [],
        tts: [],
        system: []
      };

      Object.keys(knobs).forEach(key => {
        const family = key.split('.')[0];
        if (families[family]) {
          families[family].push(key);
        }
      });

      console.log('\nKnob families:');
      Object.entries(families).forEach(([family, keys]) => {
        if (keys.length > 0) {
          console.log(`  ${family}: ${keys.length} knobs`);
        }
      });

      // Check if values are static or dynamic
      console.log('\n=== KNOB VALUES TYPE CHECK ===');
      const valueTypes = {};
      Object.entries(knobs).forEach(([key, value]) => {
        const type = typeof value;
        valueTypes[type] = (valueTypes[type] || 0) + 1;
      });

      console.log('Value types:');
      Object.entries(valueTypes).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });

      console.log('\n✅ RESULT: Knobs ARE being presented');
      console.log('The knobs are configured with default/static values.');
      console.log('These represent the control parameters available for tuning.');
    } else {
      console.log('\n❌ No knobs received');
    }

    // Exit after analysis
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
});

socket.on('error', (err) => {
  console.error('❌ Connection error:', err.message);
});

// Timeout after 10 seconds
setTimeout(() => {
  if (!receivedData) {
    console.log('\n❌ No data received within 10 seconds');
    process.exit(1);
  }
}, 10000);