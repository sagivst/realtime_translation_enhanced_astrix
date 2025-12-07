/**
 * Continuous monitoring data sender - WITH REAL STATION-3 DATA
 * Sends fake data for other stations, real data for Station-3
 * Fetches Station-3 data from monitoring-api-bridge on port 3009
 */

const io = require('socket.io-client');
const axios = require('axios');
const socket = io('http://20.170.155.53:3001');

// Station-3 bridge URL
const STATION3_BRIDGE_URL = 'http://localhost:3009/api/station3';

// Cache for Station-3 data
let station3Cache = null;
let station3LastFetch = 0;
const STATION3_CACHE_TTL = 1500; // 1.5 seconds cache

/**
 * Fetch real Station-3 data from bridge
 */
async function fetchStation3Data() {
  try {
    // Use cache if still fresh
    if (station3Cache && (Date.now() - station3LastFetch < STATION3_CACHE_TTL)) {
      return station3Cache;
    }

    const response = await axios.get(STATION3_BRIDGE_URL, {
      timeout: 1000 // 1 second timeout
    });

    if (response.data) {
      station3Cache = response.data;
      station3LastFetch = Date.now();
      console.log(`[Station-3] Fetched real data: ${Object.keys(response.data).length} extensions`);
      return response.data;
    }
  } catch (error) {
    // Silent fail, return cached data or null
    if (station3Cache) {
      console.log('[Station-3] Using cached data due to fetch error');
      return station3Cache;
    }
    console.log('[Station-3] No real data available, will use generated data');
  }
  return null;
}

// Generate realistic values for all 75 metrics (for non-Station-3 stations)
function generateAllMetrics(baseValues = {}) {
  const time = Date.now();
  const variation = Math.sin(time / 5000) * 0.2 + 1; // Smooth variation

  return {
    // DSP Metrics (20)
    'dsp.agc.currentGain': (10 + Math.random() * 5) * variation,
    'dsp.agc.targetLevel': -18,
    'dsp.agc.compressionRatio': 3.5,
    'dsp.agc.gateThreshold': -40,
    'dsp.agc.attackTime': 5,
    'dsp.aec.echoLevel': (-45 + Math.random() * 10) * variation,
    'dsp.aec.suppression': 25,
    'dsp.aec.convergenceTime': 200,
    'dsp.aec.tailLength': 128,
    'dsp.aec.nlpLevel': -35,
    'dsp.noiseReduction.noiseLevel': (-60 + Math.random() * 5) * variation,
    'dsp.noiseReduction.snrImprovement': (15 + Math.random() * 5) * variation,
    'dsp.noiseReduction.spectralFloor': -70,
    'dsp.noiseReduction.musicProtection': 0.8,
    'dsp.compressor.threshold': -20,
    'dsp.compressor.ratio': 4,
    'dsp.compressor.knee': 2,
    'dsp.limiter.threshold': -3,
    'dsp.limiter.release': 50,
    'dsp.eq.gain': 0,

    // Audio Quality Metrics (10)
    'audioQuality.mos': (4.2 + Math.random() * 0.3) * (variation * 0.1 + 0.9),
    'audioQuality.pesq': 4.5,
    'audioQuality.snr': (35 + Math.random() * 10) * variation,
    'audioQuality.speechLevel': (-20 + Math.random() * 5) * variation,
    'audioQuality.noiseLevel': -60,
    'audioQuality.echo': -50,
    'audioQuality.distortion': 0.02 * variation,
    'audioQuality.clipping': Math.random() < 0.95 ? 0 : 1,
    'audioQuality.silenceRatio': 0.3,
    'audioQuality.voiceActivityRatio': 0.7,

    // Buffer Metrics (10)
    'buffer.total': (200 + Math.random() * 50) * variation,
    'buffer.input': (80 + Math.random() * 20) * variation,
    'buffer.output': (80 + Math.random() * 20) * variation,
    'buffer.jitter': (30 + Math.random() * 20) * variation,
    'buffer.playback': 40,
    'buffer.underrun': Math.random() < 0.95 ? 0 : Math.floor(Math.random() * 3),
    'buffer.overrun': Math.random() < 0.95 ? 0 : Math.floor(Math.random() * 2),
    'buffer.discarded': Math.random() < 0.9 ? 0 : Math.floor(Math.random() * 5),
    'buffer.interpolated': Math.floor(Math.random() * 3),
    'buffer.drift': (Math.random() - 0.5) * 2,

    // Latency Metrics (10)
    'latency.avg': (50 + Math.random() * 30) * variation,
    'latency.min': 20,
    'latency.max': (150 + Math.random() * 50) * variation,
    'latency.jitter': (10 + Math.random() * 10) * variation,
    'latency.percentile95': (100 + Math.random() * 30) * variation,
    'latency.percentile99': (130 + Math.random() * 40) * variation,
    'latency.processing': (15 + Math.random() * 10) * variation,
    'latency.network': (30 + Math.random() * 20) * variation,
    'latency.buffer': 8,
    'latency.total': (70 + Math.random() * 30) * variation,

    // Packet Metrics (12)
    'packet.received': Math.floor(1000 + Math.random() * 100),
    'packet.sent': Math.floor(1000 + Math.random() * 100),
    'packet.lost': Math.floor(Math.random() * 5),
    'packet.loss': Math.random() * 2,
    'packet.duplicated': Math.random() < 0.95 ? 0 : Math.floor(Math.random() * 2),
    'packet.reordered': Math.random() < 0.9 ? 0 : Math.floor(Math.random() * 3),
    'packet.jitter': (5 + Math.random() * 5) * variation,
    'packet.throughput': (80000 + Math.random() * 20000) * variation,
    'packet.bandwidth': 128000,
    'packet.dropped': Math.random() < 0.95 ? 0 : Math.floor(Math.random() * 2),

    // Performance Metrics (13)
    'performance.cpu': (20 + Math.random() * 30) * variation,
    'performance.memory': (500 + Math.random() * 200) * variation,
    'performance.threads': 4,
    'performance.handles': 32,
    'performance.io': (1000 + Math.random() * 1000) * variation,
    'performance.bandwidth': 1000000,
    'performance.throughput': 48000,
    'performance.fps': 50,
    'performance.cache': 85,
    'performance.gc': Math.floor(Math.random() * 10),

    // Custom Metrics (10)
    'custom.state': 'active',
    'custom.successRate': 95 + Math.random() * 5,
    'custom.errorCount': Math.random() < 0.9 ? 0 : Math.floor(Math.random() * 3),
    'custom.warningCount': Math.random() < 0.8 ? 0 : Math.floor(Math.random() * 5),
    'custom.totalProcessed': Math.floor(Math.random() * 1000000000),

    ...baseValues // Allow overriding specific values
  };
}

// Generate all 113 knob values (for non-Station-3 stations)
function generateAllKnobs() {
  return {
    // AGC Knobs (6)
    'agc.enabled': true,
    'agc.target_level_dbfs': -18,
    'agc.compression_ratio': 3.5,
    'agc.attack_time_ms': 5,
    'agc.release_time_ms': 100,
    'agc.max_gain_db': 30,

    // AEC Knobs (16)
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

    // EQ Knobs (1 simplified)
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

    // Network/Codec Knobs (13)
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

    // Deepgram/STT Knobs (10)
    'deepgram.model': 'nova-2',
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

    // Translation Knobs (6)
    'translation.source_lang': 'en',
    'translation.target_lang': 'es',
    'translation.formality': 'default',
    'translation.preserve_formatting': true,
    'translation.glossary_id': '',
    'translation.max_length': 1000,
    'translation.timeout_ms': 5000,
    'translation.cache_enabled': true,

    // TTS Knobs (9)
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
  };
}

// Convert Station-3 data format to monitoring format
function convertStation3Data(station3Data, extension) {
  const key = `STATION_3_${extension}`;
  const data = station3Data[key];

  if (!data) return null;

  return {
    metrics: data.metrics || generateAllMetrics(),
    knobs: data.knobs || generateAllKnobs(),
    status: data.status || 'active',
    timestamp: data.timestamp || new Date().toISOString()
  };
}

// Main monitoring function
async function sendMonitoringData() {
  const stations = [
    { id: 'STATION_3', extensions: ['3333', '4444'] },  // Real data
    { id: 'STATION_4', extensions: ['3333', '4444'] }   // Fake data for now
  ];

  let messageCount = 0;

  // Periodic data sending
  setInterval(async () => {
    // Fetch real Station-3 data
    const station3Data = await fetchStation3Data();

    for (const station of stations) {
      for (const extension of station.extensions) {
        let metrics, knobs, status;

        // Use real data for Station-3 if available
        if (station.id === 'STATION_3' && station3Data) {
          const realData = convertStation3Data(station3Data, extension);
          if (realData) {
            metrics = realData.metrics;
            knobs = realData.knobs;
            status = realData.status;
            console.log(`[${new Date().toLocaleTimeString()}] Using REAL data for Station-3-${extension}`);
          } else {
            // Fallback to generated data if conversion fails
            metrics = generateAllMetrics();
            knobs = generateAllKnobs();
            status = 'active';
            console.log(`[${new Date().toLocaleTimeString()}] No real data for Station-3-${extension}, using generated`);
          }
        } else {
          // Generate fake data for other stations
          metrics = generateAllMetrics();
          knobs = generateAllKnobs();
          status = 'active';
        }

        // Format data for unified-metrics event
        const data = {
          station_id: station.id.replace('STATION_', 'Station-'),
          extension: extension,
          timestamp: new Date().toISOString(),
          call_id: 'continuous-monitoring',
          channel: extension,
          metrics: metrics,
          knobs: knobs,
          alerts: [],
          metric_count: Object.keys(metrics).length,
          knob_count: Object.keys(knobs).length,
          metadata: {
            source: station.id === 'STATION_3' && station3Data ? 'real-station3' : 'generated',
            status: status
          }
        };

        socket.emit('unified-metrics', data);
      }
    }

    messageCount++;
    console.log(`[${new Date().toLocaleTimeString()}] Sent batch #${messageCount} (${stations.length} stations × 75 metrics × 113 knobs)`);
  }, 2000); // Send every 2 seconds
}

// Socket connection handlers
socket.on('connect', () => {
  console.log('✅ Connected to monitoring server on port 3001');
  console.log('📊 Starting continuous monitoring with Station-3 integration...');
  console.log(`🌉 Station-3 bridge URL: ${STATION3_BRIDGE_URL}`);

  // Start sending data
  sendMonitoringData();
});

socket.on('disconnect', () => {
  console.log('⚠️ Disconnected from monitoring server');
});

socket.on('error', (err) => {
  console.error('❌ Connection error:', err.message);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down continuous monitoring...');
  socket.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down continuous monitoring...');
  socket.disconnect();
  process.exit(0);
});

console.log('🚀 Continuous Full Monitoring with Station-3 Integration');
console.log('📡 Attempting to connect to monitoring server at 20.170.155.53:3001...');