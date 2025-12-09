#!/usr/bin/env node
const io = require('socket.io-client');
const socket = io('http://localhost:3001');

const stations = [
  { station_id: 'STATION_3', extension: '3333' },
  { station_id: 'STATION_3', extension: '4444' },
  { station_id: 'STATION_9', extension: '3333' },
  { station_id: 'STATION_9', extension: '4444' }
];

let messageCount = 0;

socket.on('connect', () => {
  console.log('Connected to monitoring server, socket ID:', socket.id);
  
  setInterval(() => {
    for (const { station_id, extension } of stations) {
      const now = Date.now();
      const metricsData = {
        station_id,
        extension,
        call_id: 'continuous-' + now,
        timestamp: new Date().toISOString(),
        metrics: {
          snr: 20 + Math.random() * 10,
          rms: -30 + Math.random() * 10,
          clipping: Math.random() * 0.01,
          noiseFloor: -60 + Math.random() * 5,
          voiceActivity: 0.5 + Math.random() * 0.5,
          mos: 3.5 + Math.random() * 1.0,
          processingLatency: 50 + Math.random() * 50,
          jitter: 5 + Math.random() * 10,
          packetLoss: Math.random() * 0.01,
          bufferLevel: 0.5 + Math.random() * 0.3,
          connected: true,
          lastActivity: now
        },
        knobs: {},
        alerts: [],
        metadata: { state: 'active', continuous_monitoring: true },
        metric_count: 12,
        knob_count: 0
      };
      
      socket.emit('unified-metrics', metricsData);
      messageCount++;
    }
    console.log('[' + new Date().toLocaleTimeString() + '] Emitted metrics for 4 stations (total: ' + messageCount + ')');
  }, 5000);
});

socket.on('disconnect', () => console.log('Disconnected'));
socket.on('error', (err) => console.error('Error:', err));

console.log('Starting continuous metrics emitter...');
