#!/usr/bin/env node

/**
 * Test STTTTSserver monitoring integration
 * Simulates STTTTSserver connecting to monitoring server
 */

const ioClient = require('socket.io-client');

console.log('🧪 Testing STTTTSserver → Monitoring Server Integration\n');
console.log('=' .repeat(70));

// Connect to monitoring server
const monitoringClient = ioClient('http://localhost:3001', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 3
});

monitoringClient.on('connect', () => {
  console.log('\n✅ Connected to monitoring server on port 3001');

  // Register Station 3
  console.log('\n📡 Registering STATION_3...');
  monitoringClient.emit('register-station', {
    station_id: 'STATION_3',
    capabilities: {
      name: 'Voice Monitor/Enhancer (STTTTSserver)',
      type: 'voice',
      parameters: 22,  // Station 3 has 14 params per extension
      extensions: ['3333', '4444'],
      critical: true,
      description: 'CRITICAL - Monitors and improves voice quality, directly impacts Deepgram performance'
    }
  });

  // Simulate Station 3 metrics for extension 3333
  setTimeout(() => {
    console.log('\n📊 Sending Station 3 metrics for extension 3333...');

    const station3Metrics = {
      station_id: 'STATION_3',
      call_id: 'test-call-3333',
      channel: 'caller',  // 3333 is caller
      metrics: {
        // Audio Quality Metrics (critical for Deepgram)
        snr_db: 28.5,
        noise_floor_db: -65,
        audio_level_dbfs: -18,
        voice_activity_ratio: 0.75,
        clipping_detected: 0,

        // Buffer Metrics
        buffer_usage_pct: 45.2,
        buffer_underruns: 0,
        jitter_buffer_size_ms: 60,

        // Performance
        cpu_usage_pct: 22.5,
        memory_usage_mb: 185,

        // Latency
        processing_latency_ms: 35,
        jitter_ms: 12.5,

        // Packet Metrics
        packet_loss_pct: 0.2
      },
      timestamp: new Date().toISOString()
    };

    monitoringClient.emit('metrics', station3Metrics);
    console.log('   ✓ Metrics sent for STATION_3 (3333)');
    console.log('   📈 Key metrics:');
    console.log(`      - SNR: ${station3Metrics.metrics.snr_db} dB`);
    console.log(`      - Audio Level: ${station3Metrics.metrics.audio_level_dbfs} dBFS`);
    console.log(`      - Voice Activity: ${(station3Metrics.metrics.voice_activity_ratio * 100).toFixed(0)}%`);
  }, 1000);

  // Simulate Station 3 metrics for extension 4444
  setTimeout(() => {
    console.log('\n📊 Sending Station 3 metrics for extension 4444...');

    const station3Metrics = {
      station_id: 'STATION_3',
      call_id: 'test-call-4444',
      channel: 'callee',  // 4444 is callee
      metrics: {
        // Audio Quality Metrics (slightly different values)
        snr_db: 31.2,
        noise_floor_db: -68,
        audio_level_dbfs: -16,
        voice_activity_ratio: 0.82,
        clipping_detected: 0,

        // Buffer Metrics
        buffer_usage_pct: 52.8,
        buffer_underruns: 1,
        jitter_buffer_size_ms: 55,

        // Performance
        cpu_usage_pct: 26.3,
        memory_usage_mb: 195,

        // Latency
        processing_latency_ms: 38,
        jitter_ms: 10.2,

        // Packet Metrics
        packet_loss_pct: 0.1
      },
      timestamp: new Date().toISOString()
    };

    monitoringClient.emit('metrics', station3Metrics);
    console.log('   ✓ Metrics sent for STATION_3 (4444)');
    console.log('   📈 Key metrics:');
    console.log(`      - SNR: ${station3Metrics.metrics.snr_db} dB`);
    console.log(`      - Audio Level: ${station3Metrics.metrics.audio_level_dbfs} dBFS`);
    console.log(`      - Voice Activity: ${(station3Metrics.metrics.voice_activity_ratio * 100).toFixed(0)}%`);
  }, 2000);

  // Test receiving knob updates
  setTimeout(() => {
    console.log('\n🔧 Waiting for knob updates from monitoring server...');
  }, 3000);

  // Disconnect after tests
  setTimeout(() => {
    console.log('\n' + '=' .repeat(70));
    console.log('\n✨ Test complete! Check monitoring server output for results.');
    console.log('\n📊 Summary:');
    console.log('   - Station 3 registered successfully');
    console.log('   - Metrics sent for both extensions (3333/4444)');
    console.log('   - Data should be forwarded to V2.1.0 database');
    console.log('   - Check dashboard at http://20.170.155.53:8080/database-records.html');
    monitoringClient.disconnect();
    process.exit(0);
  }, 5000);
});

monitoringClient.on('apply-knobs', (data) => {
  console.log('\n🎯 Received knob updates from monitoring server:');
  console.log('   Knobs:', JSON.stringify(data.knobs, null, 2));
  console.log('   Reason:', data.reason);
});

monitoringClient.on('disconnect', () => {
  console.log('\n⚠️ Disconnected from monitoring server');
});

monitoringClient.on('error', (error) => {
  console.error('\n❌ Connection error:', error.message);
  process.exit(1);
});

// Timeout if connection fails
setTimeout(() => {
  if (!monitoringClient.connected) {
    console.error('\n❌ Failed to connect to monitoring server after 5 seconds');
    console.error('   Make sure monitoring server is running on port 3001');
    process.exit(1);
  }
}, 5000);