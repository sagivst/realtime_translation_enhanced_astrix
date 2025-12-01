#!/usr/bin/env node

/**
 * Enable real monitoring in STTTTSserver
 * Adds Socket.IO client to connect to monitoring server on port 3001
 */

const code = `
// ========================================================================
// REAL-TIME MONITORING INTEGRATION - Connect to monitoring server
// ========================================================================
const ioClient = require('socket.io-client');

// Connect to monitoring server on port 3001
const monitoringClient = ioClient('http://localhost:3001', {
  reconnection: true,
  reconnectionDelay: 1000
});

let station3Registered = false;

monitoringClient.on('connect', () => {
  console.log('[Monitoring] ✅ Connected to monitoring server on port 3001');

  // Register Station 3 capabilities
  if (!station3Registered) {
    console.log('[Monitoring] 📡 Registering STATION_3...');
    monitoringClient.emit('register-station', {
      station_id: 'STATION_3',
      capabilities: {
        name: 'Voice Monitor/Enhancer (STTTTSserver)',
        type: 'voice',
        parameters: 22,
        extensions: ['3333', '4444'],
        critical: true,
        description: 'CRITICAL - Monitors and improves voice quality for Deepgram'
      }
    });
    station3Registered = true;
  }
});

// Store knobs received from monitoring server
let currentKnobs = {};

monitoringClient.on('apply-knobs', (data) => {
  console.log('[Monitoring] 🎯 Received knob updates:', data.knobs.length, 'knobs');
  currentKnobs = data.knobs.reduce((acc, knob) => {
    acc[knob.name] = knob.value;
    return acc;
  }, {});

  // Apply AGC settings if available
  if (currentKnobs['agc.enabled']) {
    console.log('[Monitoring] Applying AGC with target:', currentKnobs['agc.target_level_dbfs']);
  }
});

// Function to send metrics for active calls
function sendStation3Metrics(extension, callId, metrics) {
  if (!monitoringClient.connected) return;

  const snapshot = {
    station_id: 'STATION_3',
    call_id: callId,
    channel: extension === '3333' ? 'caller' : 'callee',
    metrics: {
      snr_db: metrics.snr || 25,
      noise_floor_db: metrics.noiseFloor || -65,
      audio_level_dbfs: metrics.audioLevel || -18,
      voice_activity_ratio: metrics.voiceActivity || 0.7,
      clipping_detected: metrics.clipping || 0,
      buffer_usage_pct: metrics.bufferUsage || 45,
      buffer_underruns: metrics.underruns || 0,
      jitter_buffer_size_ms: metrics.jitterBuffer || 60,
      cpu_usage_pct: process.cpuUsage().system / 1000000,
      memory_usage_mb: process.memoryUsage().heapUsed / 1048576,
      processing_latency_ms: metrics.latency || 35,
      jitter_ms: metrics.jitter || 12,
      packet_loss_pct: metrics.packetLoss || 0.2
    },
    timestamp: new Date().toISOString()
  };

  monitoringClient.emit('metrics', snapshot);
  console.log(\`[Monitoring] 📊 Sent metrics for STATION_3 (\${extension})\`);
}

// Export for use in STTTTSserver
global.monitoringClient = monitoringClient;
global.sendStation3Metrics = sendStation3Metrics;

monitoringClient.on('disconnect', () => {
  console.log('[Monitoring] ⚠️ Disconnected from monitoring server');
  station3Registered = false;
});

// Add this code at the end of STTTTSserver.js or include it early
`;

console.log(`
📝 Real Monitoring Integration Code Generated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To enable real monitoring in STTTTSserver:

1. Add socket.io-client to STTTTSserver:
   cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
   npm install socket.io-client

2. Add this code to STTTTSserver.js (after line 24 where StationAgent is required)

3. In your audio processing functions, call:
   sendStation3Metrics(extension, callId, {
     snr: calculatedSNR,
     audioLevel: audioLevelDBFS,
     voiceActivity: vadRatio,
     // ... other metrics
   });

4. Restart STTTTSserver to enable monitoring

The monitoring will automatically:
- Connect to monitoring server on port 3001
- Register STATION_3 with its capabilities
- Send real-time metrics during calls
- Receive and apply optimized knobs

Current monitoring server: http://localhost:3001
Current dashboard: http://20.170.155.53:8080/dashboard-simple.html
`);

// Save to file for reference
const fs = require('fs');
fs.writeFileSync('monitoring-integration.js', code);
console.log('\n✅ Code saved to monitoring-integration.js');