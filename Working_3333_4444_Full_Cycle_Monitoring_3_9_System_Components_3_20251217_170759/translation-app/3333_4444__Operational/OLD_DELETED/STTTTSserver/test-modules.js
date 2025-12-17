/**
 * Module Test Suite
 * Tests each module independently before integration
 */

const LogStreamManager = require('./modules/log-stream-manager');
const WAVRecorder = require('./modules/wav-recorder');
const BaseStation = require('./stations/base-station');

console.log('=== Audio Quality Monitoring System - Module Tests ===\n');

// Test 1: LogStreamManager
async function testLogStreamManager() {
  console.log('[Test 1] LogStreamManager');
  console.log('----------------------------------------');
  
  try {
    const logger = new LogStreamManager('./logs');
    
    // Start logging
    await logger.startStream('test_station', {
      types: ['metrics', 'events'],
      format: 'json',
      rotation: 'daily'
    });
    
    // Log some test data
    await logger.logMetrics('test_station', {
      packetsReceived: 100,
      packetsProcessed: 95,
      packetsSent: 90,
      packetsDropped: 5,
      bytesReceived: 16000,
      bytesProcessed: 15200,
      bytesSent: 14400,
      bytesDropped: 800,
      bufferFillBytes: 3200,
      fillPercent: 12.5,
      avgLatencyMs: 25.5,
      jitterMs: 3.2
    });
    
    await logger.logEvent('test_station', {
      level: 'info',
      eventType: 'TEST_EVENT',
      message: 'Test event logged successfully'
    });
    
    // Get stats
    const stats = logger.getStats('test_station');
    console.log('Stats:', JSON.stringify(stats, null, 2));
    
    // Stop logging
    const files = await logger.stopStream('test_station');
    console.log('Log files created:', files);
    
    console.log('✓ LogStreamManager test PASSED\n');
    return true;
    
  } catch (error) {
    console.error('✗ LogStreamManager test FAILED:', error.message);
    return false;
  }
}

// Test 2: WAVRecorder
async function testWAVRecorder() {
  console.log('[Test 2] WAVRecorder');
  console.log('----------------------------------------');
  
  try {
    const recorder = new WAVRecorder('./recordings');
    
    // Start recording
    const filepath = await recorder.startRecording('test_station', {
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16,
      maxDurationSec: 5,
      autoStop: false
    });
    
    console.log('Recording started:', filepath);
    
    // Write some test audio data (silence)
    const testAudio = Buffer.alloc(16000 * 2); // 1 second of 16-bit PCM silence
    await recorder.writeAudio('test_station', testAudio);
    
    // Get status
    const status = recorder.getStatus('test_station');
    console.log('Recording status:', JSON.stringify(status, null, 2));
    
    // Stop recording
    const result = await recorder.stopRecording('test_station');
    console.log('Recording saved:', result.filename);
    console.log('File size:', result.fileSize, 'bytes');
    console.log('Duration:', result.durationSec.toFixed(2), 'seconds');
    
    console.log('✓ WAVRecorder test PASSED\n');
    return true;
    
  } catch (error) {
    console.error('✗ WAVRecorder test FAILED:', error.message);
    return false;
  }
}

// Test 3: BaseStation
async function testBaseStation() {
  console.log('[Test 3] BaseStation');
  console.log('----------------------------------------');
  
  try {
    const config = {
      enabled: true,
      name: 'Test Station',
      socket_send_buffer_bytes: 262144,
      frame_size_bytes: 160,
      frame_delay_ms: 5,
      audio_gain_multiplier: 1.5,
      log_stream_enabled: false,
      wav_recording_enabled: false
    };
    
    const station = new BaseStation('test_station_1', config);
    
    // Start station
    await station.start();
    
    // Process some test audio
    const testAudio = Buffer.alloc(320); // 20ms of audio at 16kHz
    for (let i = 0; i < testAudio.length; i += 2) {
      const sample = Math.floor(Math.sin(i / 10) * 1000);
      testAudio.writeInt16LE(sample, i);
    }
    
    await station.processAudio(testAudio, { format: 'PCM_S16LE' });
    
    // Get metrics
    const metrics = station.getMetrics();
    console.log('Station metrics:', JSON.stringify(metrics, null, 2));
    
    // Stop station
    await station.stop();
    
    console.log('✓ BaseStation test PASSED\n');
    return true;
    
  } catch (error) {
    console.error('✗ BaseStation test FAILED:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting module tests...\n');
  
  const results = {
    logStreamManager: await testLogStreamManager(),
    wavRecorder: await testWAVRecorder(),
    baseStation: await testBaseStation()
  };
  
  console.log('=== Test Results ===');
  console.log('LogStreamManager:', results.logStreamManager ? '✓ PASSED' : '✗ FAILED');
  console.log('WAVRecorder:', results.wavRecorder ? '✓ PASSED' : '✗ FAILED');
  console.log('BaseStation:', results.baseStation ? '✓ PASSED' : '✗ FAILED');
  
  const allPassed = Object.values(results).every(r => r === true);
  console.log('\nOverall:', allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED');
  
  process.exit(allPassed ? 0 : 1);
}

runAllTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
