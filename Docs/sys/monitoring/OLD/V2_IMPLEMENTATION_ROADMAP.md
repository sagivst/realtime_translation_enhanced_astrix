# V2.0 Implementation Roadmap
## AI-Driven Recursive Audio Optimization System

**Generated:** December 3, 2024
**System:** 3333_4444_Operational
**Current Compliance:** ~70%

---

## 🚨 IMMEDIATE FIX REQUIRED: Station-2 Monitoring Issue

### Problem Identified
Gateway RX (Port 3333) monitoring is not working because:
1. **Station-2 is NOT configured** in continuous-full-monitoring.js
2. Current config uses STATION_3 and STATION_4 for ports 3333/4444
3. Missing station configurations for STATION-2, STATION-9, STATION-10

### Quick Fix Solution
```javascript
// In continuous-full-monitoring.js, update stations array:
const stations = [
  // Add missing stations
  { id: 'STATION_2', extension: '3333', name: 'Gateway RX (Asterisk→STTTS)' },
  { id: 'STATION_2', extension: '4444', name: 'Gateway RX (Asterisk→STTTS)' },

  // Keep existing (but fix IDs)
  { id: 'STATION_3', extension: '3333', name: 'STT Processing (Caller)' },
  { id: 'STATION_3', extension: '4444', name: 'STT Processing (Callee)' },
  { id: 'STATION_4', extension: '3333', name: 'Translation (Caller)' },
  { id: 'STATION_4', extension: '4444', name: 'Translation (Callee)' },
  { id: 'STATION_5', extension: '3333', name: 'TTS Generation (Caller)' },
  { id: 'STATION_5', extension: '4444', name: 'TTS Generation (Callee)' },

  // Add return path stations
  { id: 'STATION_7', extension: '4444', name: 'Gateway TX (STTTS→Asterisk)' },
  { id: 'STATION_9', extension: '3333', name: 'Gateway Return (Asterisk RX)' },
  { id: 'STATION_10', extension: '4444', name: 'Asterisk Return' }
];
```

---

## 📋 Phase 1: Foundation Fixes (Week 1)
**Goal:** Fix critical monitoring gaps and establish V2 snapshot format

### 1.1 Fix Station Configurations ✅
```bash
# Create station config directory
mkdir -p /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/station-configs

# Generate configs for each station
for i in {1..11}; do
  echo "Creating STATION_$i config..."
  # Config will be auto-generated on first run
done
```

### 1.2 Update StationAgent.js for V2 Snapshots
```javascript
// Add to StationAgent.js generateSnapshot() method:
generateSnapshot(segmentData = {}) {
  return {
    // V2 Required Fields
    schema_version: "2.0.0",
    station_id: this.stationId,
    call_id: this.callId || "test-call",
    channel: this.channel || "unknown",
    timestamp: new Date().toISOString(),

    // Segment Information (NEW)
    segment: {
      segment_id: segmentData.segment_id || uuidv4(),
      start_ms: segmentData.start_ms || 0,
      end_ms: segmentData.end_ms || 0,
      segment_type: segmentData.type || "continuous"
    },

    // Audio Reference (NEW)
    audio: {
      sample_rate: 16000,
      format: "pcm_s16le",
      storage_key: segmentData.audio_key || null,
      duration_ms: segmentData.duration || 0
    },

    // Knobs Configuration (NEW)
    knobs: this.getCurrentKnobs(),

    // Existing metrics
    metrics: this.metrics,

    // Optimizer Metadata (NEW)
    optimizer: {
      constraints: this.constraints || {},
      targets: this.targets || {},
      totals: this.calculateTotals()
    },

    // Alerts
    alerts: this.alerts || [],

    // Custom metrics
    custom_metrics: this.customMetrics || {}
  };
}
```

### 1.3 Database Schema Migration
```sql
-- Create V2 tables
CREATE TABLE IF NOT EXISTS session_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL,
  channel_id UUID NOT NULL,
  role TEXT CHECK (role IN ('caller', 'callee')),
  knobs JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_session_configs_call_channel
  ON session_configs(call_id, channel_id);
CREATE INDEX idx_session_configs_active
  ON session_configs(active) WHERE active = true;

-- Add missing columns to existing tables
ALTER TABLE station_snapshots
  ADD COLUMN IF NOT EXISTS schema_version TEXT DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS audio_ref JSONB,
  ADD COLUMN IF NOT EXISTS knobs JSONB,
  ADD COLUMN IF NOT EXISTS optimizer_metadata JSONB;
```

---

## 📋 Phase 2: Audio Pipeline (Week 2)
**Goal:** Implement real PCM audio capture and storage

### 2.1 RTP Packet Capture Module
```javascript
// /STTTSserver/audio/RTPPacketCapture.js
const dgram = require('dgram');
const { Transform } = require('stream');

class RTPPacketCapture {
  constructor(port, stationId) {
    this.port = port;
    this.stationId = stationId;
    this.socket = dgram.createSocket('udp4');
    this.pcmStream = new Transform({
      transform(chunk, encoding, callback) {
        // Extract PCM from RTP packet
        const pcm = this.extractPCM(chunk);
        callback(null, pcm);
      }
    });
  }

  extractPCM(rtpPacket) {
    // Skip RTP header (12 bytes minimum)
    const payload = rtpPacket.slice(12);
    // Decode based on codec (G.711, Opus, etc)
    return this.decodeAudio(payload);
  }

  start() {
    this.socket.bind(this.port);
    this.socket.on('message', (msg) => {
      this.pcmStream.write(msg);
    });
  }
}
```

### 2.2 Voice Activity Detection (VAD)
```javascript
// /STTTSserver/audio/VADSegmenter.js
class VADSegmenter {
  constructor(options = {}) {
    this.energyThreshold = options.energyThreshold || -40; // dB
    this.silenceDuration = options.silenceDuration || 500; // ms
    this.minSpeechDuration = options.minSpeechDuration || 100; // ms
    this.currentSegment = null;
  }

  processPCM(pcmBuffer, sampleRate = 16000) {
    const energy = this.calculateEnergy(pcmBuffer);
    const isSpeech = energy > this.energyThreshold;

    if (isSpeech && !this.currentSegment) {
      // Start new segment
      this.currentSegment = {
        id: uuidv4(),
        start_ms: Date.now(),
        audio: []
      };
    } else if (!isSpeech && this.currentSegment) {
      // End segment after silence duration
      if (Date.now() - this.lastSpeechTime > this.silenceDuration) {
        return this.finalizeSegment();
      }
    }

    if (this.currentSegment) {
      this.currentSegment.audio.push(pcmBuffer);
      this.lastSpeechTime = Date.now();
    }
  }
}
```

### 2.3 Audio Storage Integration
```javascript
// Store audio segments to S3/MinIO
const MinIO = require('minio');

class AudioStorage {
  constructor() {
    this.client = new MinIO.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: 9000,
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY
    });
    this.bucket = 'audio-segments';
  }

  async storeSegment(segmentId, pcmBuffer) {
    const key = `segments/${segmentId}.pcm`;
    await this.client.putObject(
      this.bucket,
      key,
      pcmBuffer
    );
    return `s3://${this.bucket}/${key}`;
  }
}
```

---

## 📋 Phase 3: Recursive Optimizer (Week 3)
**Goal:** Build true recursive optimization with feedback loops

### 3.1 Recursive Optimizer Core
```javascript
// /STTTSserver/optimizer/RecursiveOptimizer.js
class RecursiveOptimizer {
  constructor() {
    this.maxIterations = 10;
    this.convergenceThreshold = 0.95;
    this.history = [];
  }

  async optimize(snapshot, constraints, targets) {
    let iteration = 0;
    let bestScore = 0;
    let bestKnobs = snapshot.knobs;

    while (iteration < this.maxIterations) {
      // Get AI suggestions
      const suggestions = await this.getAISuggestions(
        snapshot,
        constraints,
        targets,
        this.history
      );

      // Apply knobs
      await this.applyKnobs(suggestions.knobs);

      // Collect new metrics (wait for stabilization)
      await this.wait(2000);
      const newSnapshot = await this.collectSnapshot();

      // Calculate score
      const score = this.calculateScore(newSnapshot, targets);

      // Update history
      this.history.push({
        iteration,
        knobs: suggestions.knobs,
        score,
        metrics: newSnapshot.metrics
      });

      // Check convergence
      if (score > bestScore) {
        bestScore = score;
        bestKnobs = suggestions.knobs;
      }

      if (score >= this.convergenceThreshold) {
        break; // Target achieved
      }

      iteration++;
    }

    return {
      iterations: iteration,
      score: bestScore,
      knobs: bestKnobs,
      history: this.history
    };
  }

  calculateScore(snapshot, targets) {
    let score = 0;
    let count = 0;

    // Compare metrics to targets
    for (const [metric, target] of Object.entries(targets)) {
      const actual = snapshot.metrics[metric];
      if (actual !== undefined) {
        // Calculate normalized distance
        const distance = Math.abs(actual - target) / target;
        score += Math.max(0, 1 - distance);
        count++;
      }
    }

    return count > 0 ? score / count : 0;
  }
}
```

### 3.2 Per-Channel Knob Management
```javascript
// Apply different knobs per channel
class ChannelKnobManager {
  constructor() {
    this.channelKnobs = new Map();
  }

  setChannelKnobs(callId, channel, knobs) {
    const key = `${callId}:${channel}`;
    this.channelKnobs.set(key, {
      knobs,
      appliedAt: Date.now()
    });

    // Persist to database
    this.persistToDatabase(callId, channel, knobs);
  }

  getChannelKnobs(callId, channel) {
    const key = `${callId}:${channel}`;
    return this.channelKnobs.get(key)?.knobs || this.getDefaults();
  }

  async persistToDatabase(callId, channel, knobs) {
    await db.query(
      `INSERT INTO session_configs (call_id, channel_id, role, knobs)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (call_id, channel_id)
       DO UPDATE SET knobs = $4, updated_at = NOW()`,
      [callId, channel, channel, knobs]
    );
  }
}
```

---

## 📋 Phase 4: Real-time Updates (Week 4)
**Goal:** Enable live parameter updates without restarts

### 4.1 WebSocket Parameter Updates
```javascript
// Real-time knob updates via WebSocket
io.on('connection', (socket) => {
  socket.on('update-knobs', async (data) => {
    const { stationId, callId, channel, knobs } = data;

    // Validate knobs
    const validated = validateKnobs(knobs);

    // Apply immediately
    await applyKnobsToStation(stationId, validated);

    // Broadcast update
    io.emit('knobs-updated', {
      stationId,
      callId,
      channel,
      knobs: validated,
      timestamp: Date.now()
    });
  });
});
```

### 4.2 A/B Testing Framework
```javascript
class ABTestManager {
  constructor() {
    this.tests = new Map();
  }

  createTest(testId, config) {
    this.tests.set(testId, {
      id: testId,
      variants: config.variants, // A and B knob sets
      allocation: config.allocation || 0.5, // 50/50 split
      metrics: [],
      startTime: Date.now()
    });
  }

  assignVariant(callId, testId) {
    const test = this.tests.get(testId);
    if (!test) return null;

    // Deterministic assignment based on call ID
    const hash = this.hashCallId(callId);
    const variant = hash < test.allocation ? 'A' : 'B';

    return test.variants[variant];
  }

  recordMetrics(testId, variant, metrics) {
    const test = this.tests.get(testId);
    if (test) {
      test.metrics.push({
        variant,
        metrics,
        timestamp: Date.now()
      });
    }
  }
}
```

---

## 🎯 Implementation Priority

### Week 1: Critical Fixes
1. ✅ Fix Station-2 monitoring configuration
2. ✅ Add missing stations 9-10
3. ✅ Update snapshot format to V2
4. ✅ Create database migrations

### Week 2: Audio Foundation
1. ⚡ Implement RTP capture from Asterisk
2. ⚡ Add VAD segmentation
3. ⚡ Integrate audio storage

### Week 3: Optimization Engine
1. 🔄 Build recursive optimizer
2. 🔄 Add per-channel knob management
3. 🔄 Implement feedback loops

### Week 4: Production Features
1. 🚀 Real-time knob updates
2. 🚀 A/B testing framework
3. 🚀 Performance optimization

---

## 📊 Success Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Station Coverage | 9/11 | 11/11 | 🔴 Missing 2 |
| V2 Snapshot Compliance | 50% | 100% | 🟡 Partial |
| Real Audio Capture | 0% | 100% | 🔴 Not Started |
| Recursive Optimization | 0% | 100% | 🔴 Not Started |
| Per-Channel Knobs | 0% | 100% | 🔴 Not Started |
| Real-time Updates | 0% | 100% | 🔴 Not Started |

---

## 🔧 Quick Start Commands

```bash
# 1. Fix monitoring immediately
ssh azureuser@20.170.155.53 "
  # Backup current config
  cp continuous-full-monitoring.js continuous-full-monitoring.backup.js

  # Update with all stations
  # [Edit file to add STATION_2, STATION_9, STATION_10]

  # Restart monitoring
  pkill -f continuous-full-monitoring
  nohup node continuous-full-monitoring.js &
"

# 2. Create database migrations
psql -U monitoring_user -d monitoring_db < v2_migrations.sql

# 3. Test new snapshot format
curl http://20.170.155.53:3020/api/snapshot/test

# 4. Verify all stations reporting
curl http://20.170.155.53:3020/api/stations/status
```

---

## 📝 Notes

- **Immediate Action Required**: Fix Station-2 configuration to restore 3333 monitoring
- **Database**: Schema needs formalization before adding new features
- **Audio Pipeline**: Critical for V2 - currently everything is simulated
- **Optimizer**: Must be recursive with feedback, not one-shot
- **Testing**: Need comprehensive test suite before production

---

*Document generated for immediate implementation of V2.0 specification compliance*