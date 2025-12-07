const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Complete station data for all 11 stations
const stations = [
  {
    id: 'station-1',
    name: 'Station 1: Audio Input',
    metrics: {
      audio: {
        channels: 2,
        sampleRate: 48000,
        bitDepth: 24,
        latency: 12
      },
      buffer: {
        size: 2048,
        used: 1024,
        dropped: 0,
        health: 'good'
      },
      codec: {
        type: 'OPUS',
        bitrate: 128000,
        complexity: 10,
        packetLoss: 0.01
      }
    }
  },
  {
    id: 'station-2',
    name: 'Station 2: Voice Activity',
    metrics: {
      vad: {
        speaking: true,
        confidence: 0.92,
        energy: -28,
        zcr: 0.12
      },
      noise: {
        level: -45,
        snr: 17,
        suppression: true,
        gate: -40
      }
    }
  },
  {
    id: 'station-3',
    name: 'Station 3: Pre-Processing',
    metrics: {
          "preprocessing": {
                "normalization": "active",
                "noise_reduction": 85,
                "silence_detection": true,
                "signal_level": -12
          },
          "chunking": {
                "chunk_size": 320,
                "chunk_overlap": 50,
                "buffer_size": 1024,
                "processing_time": 12
          }
    }
  },
  {
    id: 'station-4',
    name: 'Station 4: Language Detection',
    metrics: {
          "language": {
                "detected_language": "en",
                "confidence": 0.95,
                "fallback_language": "es",
                "detection_time": 45
          },
          "models": {
                "model_loaded": true,
                "model_version": "2.1",
                "cache_hit_rate": 0.78,
                "inference_time": 23
          }
    }
  },
  {
    id: 'station-5',
    name: 'Station 5: STT Processing',
    metrics: {
          "stt": {
                "model": "whisper-large",
                "accuracy": 0.94,
                "processing_speed": 1.2,
                "queue_size": 3
          },
          "performance": {
                "latency": 120,
                "throughput": 45,
                "error_rate": 0.02,
                "buffer_health": "good"
          }
    }
  },
  {
    id: 'station-6',
    name: 'Station 6: Translation',
    metrics: {
          "translation": {
                "source_lang": "en",
                "target_lang": "es",
                "model": "opus-mt",
                "quality_score": 0.89
          },
          "cache": {
                "hit_rate": 0.67,
                "cache_size": 2048,
                "evictions": 12,
                "memory_usage": 0.45
          }
    }
  },
  {
    id: 'station-7',
    name: 'Station 7: TTS Processing',
    metrics: {
          "tts": {
                "voice": "neural-voice-1",
                "speed": 1,
                "pitch": 1,
                "queue_size": 2
          },
          "synthesis": {
                "latency": 95,
                "quality": 0.92,
                "buffer_size": 4096,
                "processing_rate": 48000
          }
    }
  },
  {
    id: 'station-8',
    name: 'Station 8: Post-Processing',
    metrics: {
          "postprocessing": {
                "enhancement": "active",
                "normalization": true,
                "compression": 0.8,
                "output_level": -6
          },
          "quality": {
                "snr": 42,
                "thd": 0.02,
                "clarity_score": 0.91,
                "artifacts": "none"
          }
    }
  },
  {
    id: 'station-9',
    name: 'Station 9: Streaming',
    metrics: {
          "streaming": {
                "protocol": "WebRTC",
                "bitrate": 128000,
                "packet_loss": 0.001,
                "jitter": 12
          },
          "connections": {
                "active": 24,
                "pending": 2,
                "failed": 0,
                "bandwidth": 0.68
          }
    }
  },
  {
    id: 'station-10',
    name: 'Station 10: Quality Control',
    metrics: {
          "quality": {
                "mos_score": 4.2,
                "pesq_score": 4.1,
                "stoi_score": 0.88,
                "alerts": 0
          },
          "monitoring": {
                "checks_passed": 98,
                "checks_failed": 2,
                "uptime": 0.999,
                "last_check": "now"
          }
    }
  },
  {
    id: 'station-11',
    name: 'Station 11: Analytics',
    metrics: {
          "analytics": {
                "total_sessions": 1523,
                "avg_duration": 185,
                "success_rate": 0.97,
                "user_satisfaction": 4.5
          },
          "performance": {
                "p50_latency": 95,
                "p95_latency": 145,
                "p99_latency": 210,
                "error_rate": 0.03
          }
    }
  }
];

// API routes
app.get('/api/stations', (req, res) => {
  res.json({ stations: stations.map(s => ({ id: s.id, name: s.name })) });
});

app.get('/api/stations/:id/metrics', (req, res) => {
  const station = stations.find(s => s.id === req.params.id);
  if (station) {
    res.json({ metrics: station.metrics });
  } else {
    res.status(404).json({ error: 'Station not found' });
  }
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected');

  // Send initial data
  socket.emit('stations', stations);

  // Simulate real-time updates
  const interval = setInterval(() => {
    stations.forEach(station => {
      // Update some metrics randomly
      Object.keys(station.metrics).forEach(category => {
        Object.keys(station.metrics[category]).forEach(metric => {
          if (typeof station.metrics[category][metric] === 'number') {
            // Add small random variation
            const variation = (Math.random() - 0.5) * 0.1;
            station.metrics[category][metric] *= (1 + variation);
          }
        });
      });
      socket.emit('station-update', station);
    });
  }, 2000);

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    clearInterval(interval);
  });
});

const PORT = process.env.PORT || 3021;
server.listen(PORT, () => {
  console.log(`Monitoring server running on port ${PORT}`);
  console.log(`Serving ${stations.length} stations`);
});
