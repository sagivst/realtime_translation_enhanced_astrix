/**
 * Send FULL monitoring data with ALL 75 metrics and 113 knobs
 * To populate the dashboard at http://20.170.155.53:8080/database-records.html
 */

const io = require('socket.io-client');
const socket = io('http://20.170.155.53:3001');

socket.on('connect', () => {
  console.log('Connected to monitoring server');

  // Send data for all 4 stations (STATION_3 and STATION_4 with both extensions)
  const stations = [
    { id: 'STATION_3', extension: '3333', name: 'Voice Monitor RX (Caller)' },
    { id: 'STATION_3', extension: '4444', name: 'Voice Monitor RX (Callee)' },
    { id: 'STATION_4', extension: '3333', name: 'Deepgram STT (Caller)' },
    { id: 'STATION_4', extension: '4444', name: 'Deepgram STT (Callee)' }
  ];

  let sentCount = 0;

  // Send data every 2 seconds
  const interval = setInterval(() => {
    stations.forEach(station => {
      const testData = {
        station_id: station.id,
        extension: station.extension,
        timestamp: new Date().toISOString(),
        metric_count: 75,
        knob_count: 113,

        // ALL 75 METRICS
        metrics: {
          // DSP Metrics (20)
          'dsp.agc.currentGain': 10 + Math.random() * 5,
          'dsp.agc.targetLevel': -18,
          'dsp.agc.compressionRatio': 3.5,
          'dsp.agc.gateThreshold': -40,
          'dsp.agc.attackTime': 5,
          'dsp.aec.echoLevel': -45 + Math.random() * 10,
          'dsp.aec.suppression': 25,
          'dsp.aec.convergenceTime': 200,
          'dsp.aec.tailLength': 128,
          'dsp.aec.nlpLevel': -35,
          'dsp.noiseReduction.noiseLevel': -60 + Math.random() * 5,
          'dsp.noiseReduction.snrImprovement': 15 + Math.random() * 5,
          'dsp.noiseReduction.spectralFloor': -70,
          'dsp.noiseReduction.musicProtection': 0.8,
          'dsp.compressor.threshold': -20,
          'dsp.compressor.ratio': 4,
          'dsp.compressor.knee': 2,
          'dsp.limiter.threshold': -3,
          'dsp.limiter.release': 50,
          'dsp.eq.gain': 0,

          // Audio Quality Metrics (10)
          'audioQuality.mos': 4.2 + Math.random() * 0.3,
          'audioQuality.pesq': 4.5,
          'audioQuality.snr': 35 + Math.random() * 10,
          'audioQuality.speechLevel': -20 + Math.random() * 5,
          'audioQuality.noiseLeve': -60,
          'audioQuality.echo': -50,
          'audioQuality.distortion': 0.02,
          'audioQuality.clipping': 0,
          'audioQuality.silenceRatio': 0.3,
          'audioQuality.voiceActivityRatio': 0.7,

          // Buffer Metrics (10)
          'buffer.total': 200 + Math.random() * 50,
          'buffer.input': 50 + Math.random() * 20,
          'buffer.output': 50 + Math.random() * 20,
          'buffer.jitter': 30 + Math.random() * 10,
          'buffer.playback': 40,
          'buffer.underrun': Math.floor(Math.random() * 2),
          'buffer.overrun': 0,
          'buffer.discarded': 0,
          'buffer.interpolated': Math.floor(Math.random() * 5),
          'buffer.drift': Math.random() * 2 - 1,

          // Latency Metrics (10)
          'latency.avg': 45 + Math.random() * 20,
          'latency.min': 20,
          'latency.max': 150,
          'latency.jitter': 12 + Math.random() * 5,
          'latency.percentile95': 80,
          'latency.percentile99': 120,
          'latency.processing': 12 + Math.random() * 5,
          'latency.network': 30 + Math.random() * 10,
          'latency.buffer': 8,
          'latency.total': 50 + Math.random() * 20,

          // Packet Metrics (10)
          'packet.received': 1000 + Math.floor(Math.random() * 100),
          'packet.sent': 950 + Math.floor(Math.random() * 100),
          'packet.lost': Math.floor(Math.random() * 5),
          'packet.loss': Math.random() * 0.5,
          'packet.duplicated': 0,
          'packet.reordered': Math.floor(Math.random() * 3),
          'packet.jitter': 5 + Math.random() * 3,
          'packet.throughput': 64000 + Math.random() * 10000,
          'packet.bandwidth': 128000,
          'packet.dropped': 0,

          // Performance Metrics (10)
          'performance.cpu': 25 + Math.random() * 20,
          'performance.memory': 512 + Math.random() * 100,
          'performance.threads': 4,
          'performance.handles': 32,
          'performance.io': 1000 + Math.random() * 500,
          'performance.bandwidth': 1000000,
          'performance.throughput': 48000,
          'performance.fps': 50,
          'performance.cache': 85,
          'performance.gc': 5,

          // Custom Metrics (5)
          'custom.state': 'active',
          'custom.successRate': 99 + Math.random(),
          'custom.errorCount': Math.floor(Math.random() * 2),
          'custom.warningCount': Math.floor(Math.random() * 5),
          'custom.totalProcessed': 1000 + sentCount * 10
        },

        // ALL 113 KNOBS
        knobs: {
          // AGC Knobs (6)
          'agc.enabled': true,
          'agc.target_level_dbfs': -18,
          'agc.compression_ratio': 3.5,
          'agc.attack_time_ms': 5,
          'agc.release_time_ms': 100,
          'agc.max_gain_db': 30,

          // AEC Knobs (10)
          'aec.enabled': true,
          'aec.suppression_level_db': 25,
          'aec.tail_length_ms': 128,
          'aec.nlp_mode': 'moderate',
          'aec.comfort_noise': true,
          'aec.convergence_speed': 0.9,
          'aec.double_talk_detection': true,
          'aec.voice_fallback': true,
          'aec.music_protection': true,
          'aec.adaptation_rate': 0.5,

          // Noise Reduction Knobs (8)
          'nr.enabled': true,
          'nr.suppression_level_db': 20,
          'nr.spectral_floor_db': -70,
          'nr.music_detection': true,
          'nr.voice_extraction': true,
          'nr.stationary_noise': true,
          'nr.transient_protection': true,
          'nr.preserve_speech': true,

          // Compressor Knobs (6)
          'compressor.enabled': false,
          'compressor.threshold_dbfs': -20,
          'compressor.ratio': 4,
          'compressor.knee_db': 2,
          'compressor.attack_ms': 1,
          'compressor.release_ms': 100,

          // Limiter Knobs (4)
          'limiter.enabled': true,
          'limiter.threshold_dbfs': -3,
          'limiter.release_ms': 50,
          'limiter.lookahead_ms': 5,

          // EQ Knobs (2)
          'eq.enabled': false,
          'eq.preset': 'voice',

          // Buffer Knobs (15)
          'buffer.size_ms': 200,
          'buffer.jitter_size_ms': 60,
          'buffer.playout_delay_ms': 40,
          'buffer.adaptive': true,
          'buffer.min_delay_ms': 20,
          'buffer.max_delay_ms': 500,
          'buffer.target_level_pct': 50,
          'buffer.acceleration': 1.5,
          'buffer.deceleration': 0.99,
          'buffer.concealment_mode': 'interpolation',
          'buffer.fec_enabled': false,
          'buffer.dtx_enabled': false,
          'buffer.clock_drift_compensation': true,
          'buffer.timestamp_mode': 'wallclock',
          'buffer.reorder_tolerance_ms': 50,

          // Network Knobs (12)
          'network.codec': 'opus',
          'network.bitrate_kbps': 64,
          'network.packet_size_ms': 20,
          'network.fec': false,
          'network.dtx': false,
          'network.vbr': true,
          'network.cbr_mode': false,
          'network.packet_loss_concealment': true,
          'network.jitter_compensation': true,
          'network.adaptive_bitrate': true,
          'network.congestion_control': 'google',
          'network.rtcp_feedback': true,

          // Codec Knobs (8)
          'codec.type': 'opus',
          'codec.sample_rate': 48000,
          'codec.channels': 1,
          'codec.frame_size_ms': 20,
          'codec.complexity': 5,
          'codec.prediction': true,
          'codec.bandwidth': 'fullband',
          'codec.application': 'voip',

          // Deepgram Knobs (12) - for STATION_4
          'deepgram.model': station.id === 'STATION_4' ? 'nova-2' : 'disabled',
          'deepgram.language': 'en-US',
          'deepgram.punctuate': true,
          'deepgram.profanity_filter': false,
          'deepgram.redact': false,
          'deepgram.diarize': false,
          'deepgram.smart_format': true,
          'deepgram.interim_results': true,
          'deepgram.endpointing': 300,
          'deepgram.vad_turnoff': 500,
          'deepgram.keywords': '',
          'deepgram.search': '',

          // Translation Knobs (8)
          'translation.source_lang': 'en',
          'translation.target_lang': 'es',
          'translation.formality': 'default',
          'translation.preserve_formatting': true,
          'translation.glossary_id': '',
          'translation.max_length': 1000,
          'translation.timeout_ms': 5000,
          'translation.cache_enabled': true,

          // TTS Knobs (10)
          'tts.voice_id': 'eleven_monolingual_v1',
          'tts.stability': 0.5,
          'tts.similarity_boost': 0.75,
          'tts.style': 0.5,
          'tts.use_speaker_boost': true,
          'tts.model': 'eleven_multilingual_v2',
          'tts.optimize_streaming_latency': 3,
          'tts.output_format': 'pcm_16000',
          'tts.chunk_length_schedule': '[50,120,200,300]',
          'tts.voice_cache': true,

          // System Knobs (10)
          'system.thread_priority': 'high',
          'system.cpu_affinity': 'auto',
          'system.memory_limit_mb': 2048,
          'system.gc_interval_ms': 30000,
          'system.log_level': 'info',
          'system.metrics_interval_ms': 1000,
          'system.health_check_interval_ms': 5000,
          'system.restart_on_error': true,
          'system.max_restart_attempts': 3,
          'system.watchdog_timeout_ms': 60000
        },

        alerts: []
      };

      // Add some alerts occasionally
      if (Math.random() < 0.1) {
        testData.alerts.push({
          metric: 'latency.avg',
          level: 'warning',
          message: 'Latency above threshold'
        });
      }

      socket.emit('unified-metrics', testData);
      console.log(`Sent data for ${station.id}-${station.extension} (${station.name})`);
    });

    sentCount++;
    console.log(`--- Batch ${sentCount} sent (${stations.length} stations) ---`);

    // Stop after 10 batches
    if (sentCount >= 10) {
      clearInterval(interval);
      setTimeout(() => {
        socket.disconnect();
        console.log('Test complete - sent 10 batches of data');
        process.exit(0);
      }, 1000);
    }
  }, 2000);
});

socket.on('error', (err) => {
  console.error('Error:', err);
});