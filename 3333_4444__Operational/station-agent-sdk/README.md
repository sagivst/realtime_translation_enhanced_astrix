# Station Agent SDK

## Overview

The Station Agent SDK is a modular, reusable framework for monitoring and optimizing audio quality across all 7 stations in the real-time translation pipeline.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Station Agent SDK                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  MetricCollector (Base Class)                         │ │
│  │  - collect()                                          │ │
│  │  - validate()                                         │ │
│  │  - getThresholds()                                    │ │
│  └───────────────────────────────────────────────────────┘ │
│           ▲                                                 │
│           │ extends                                         │
│           │                                                 │
│  ┌────────┴────────┬─────────────┬─────────────┐          │
│  │                 │             │             │          │
│  │ BufferMetrics   │ LatencyMet  │ AudioQuality│ ...      │
│  │ - total         │ - avg       │ - snr       │          │
│  │ - input         │ - jitter    │ - mos       │          │
│  └─────────────────┴─────────────┴─────────────┘          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  SnapshotBuilder                                      │ │
│  │  - collectMetrics()                                   │ │
│  │  - attachAudio()                                      │ │
│  │  - addLogs()                                          │ │
│  │  - build() → StationSnapshot                          │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  ConfigClient                                         │ │
│  │  - subscribe()                                        │ │
│  │  - applyConfig()                                      │ │
│  │  - rollback()                                         │ │
│  │  - validate()                                         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  IngestionClient                                      │ │
│  │  - sendSnapshot()                                     │ │
│  │  - uploadAudio()                                      │ │
│  │  - retry()                                            │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  StationAgent (Orchestrator)                          │ │
│  │  - initialize()                                       │ │
│  │  - start()                                            │ │
│  │  - processSegment()                                   │ │
│  │  - handleConfigUpdate()                               │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. MetricCollector (Base Class)
Abstract base class for all metric collectors. Each of the 75 parameters has a collector.

### 2. SnapshotBuilder
Creates segment-level snapshots with metrics, logs, and audio references.

### 3. ConfigClient
Handles parameter updates from the Control Service with safe application and rollback.

### 4. IngestionClient
Sends snapshots to the Ingestion Service with retry logic.

### 5. StationAgent
Main orchestrator that ties everything together.

## Directory Structure

```
station-agent-sdk/
├── README.md
├── package.json
├── src/
│   ├── index.js                      # Main exports
│   ├── StationAgent.js               # Main orchestrator
│   ├── collectors/
│   │   ├── MetricCollector.js        # Base class
│   │   ├── BufferMetrics.js          # 10 buffer parameters
│   │   ├── LatencyMetrics.js         # 8 latency parameters
│   │   ├── PacketMetrics.js          # 12 packet parameters
│   │   ├── AudioQualityMetrics.js    # 10 audio quality parameters
│   │   ├── PerformanceMetrics.js     # 8 performance parameters
│   │   ├── DSPMetrics.js             # 20 DSP parameters
│   │   ├── CustomMetrics.js          # 7 custom parameters
│   │   └── index.js                  # Collector registry
│   ├── snapshot/
│   │   ├── SnapshotBuilder.js        # Snapshot creation
│   │   ├── AudioHandler.js           # PCM storage
│   │   └── LogCollector.js           # Log aggregation
│   ├── config/
│   │   ├── ConfigClient.js           # Config subscription
│   │   ├── ParameterValidator.js     # Validation logic
│   │   └── RollbackManager.js        # Rollback support
│   ├── ingestion/
│   │   ├── IngestionClient.js        # API client
│   │   └── RetryPolicy.js            # Retry logic
│   ├── utils/
│   │   ├── AudioAnalyzer.js          # SNR, RMS, peak calculations
│   │   ├── BufferAnalyzer.js         # Buffer health
│   │   ├── SchemaValidator.js        # JSON schema validation
│   │   └── Logger.js                 # Structured logging
│   └── schemas/
│       ├── snapshot-v1.0.0.json      # Snapshot schema
│       ├── config-update-v1.0.0.json # Config update schema
│       └── parameter-specs.json      # 75 parameter definitions
├── examples/
│   ├── station1-example.js           # Asterisk integration
│   ├── station2-example.js           # Gateway integration
│   ├── station3-example.js           # STTTTSserver integration
│   └── ...
└── test/
    ├── unit/
    └── integration/
```

## Usage Example

```javascript
const { StationAgent } = require('./station-agent-sdk');

// Initialize agent for Station 3 (STTTTSserver → Deepgram)
const agent = new StationAgent({
  stationId: 'STATION_3',
  softwareVersion: 'sttttsserver-2.1.4',
  ingestionUrl: 'https://api.audio-optimizer.example.com',
  configUrl: 'wss://config.audio-optimizer.example.com',
  audioStorageUrl: 's3://bucket/station3/',
  enabledCollectors: [
    'buffer',
    'latency',
    'audioQuality',
    'dsp',
    'performance',
    'custom'
  ]
});

// Start collecting metrics
await agent.start();

// Process audio segment
agent.processSegment({
  callId: 'call-123',
  channel: 'A',
  startMs: 1000,
  endMs: 5000,
  pcmBuffer: audioBuffer
});

// Handle config updates automatically
agent.on('config-applied', (params) => {
  console.log('Applied new parameters:', params);
});
```

## Installation

```bash
cd station-agent-sdk
npm install
```

## Dependencies

- `axios` - HTTP client for API calls
- `ws` - WebSocket client for config updates
- `uuid` - UUID generation
- `ajv` - JSON schema validation
- `aws-sdk` - S3 audio storage (optional)
- `prom-client` - Prometheus metrics (optional)

## Configuration

Each station has a config file:

```json
{
  "station_id": "STATION_3",
  "software_version": "sttttsserver-2.1.4",
  "ingestion": {
    "url": "https://api.audio-optimizer.example.com",
    "retry_attempts": 3,
    "retry_delay_ms": 1000
  },
  "config": {
    "url": "wss://config.audio-optimizer.example.com",
    "reconnect": true
  },
  "audio_storage": {
    "type": "s3",
    "bucket": "audio-segments",
    "prefix": "station3/"
  },
  "collectors": {
    "buffer": { "enabled": true, "interval_ms": 100 },
    "latency": { "enabled": true, "interval_ms": 100 },
    "packet": { "enabled": false },
    "audioQuality": { "enabled": true, "interval_ms": 500 },
    "performance": { "enabled": true, "interval_ms": 1000 },
    "dsp": { "enabled": true, "interval_ms": 100 },
    "custom": { "enabled": true, "interval_ms": 500 }
  },
  "segment": {
    "min_duration_ms": 2000,
    "max_duration_ms": 30000,
    "trigger": "utterance"  // or "time_window"
  },
  "constraints": {
    "max_input_gain_db": 6,
    "min_snr_db": 18,
    "allow_aggressive_changes": true
  },
  "targets": {
    "goal": "maximize_clarity",
    "weights": {
      "clarity": 0.6,
      "noise": 0.25,
      "echo": 0.1,
      "latency": 0.05
    }
  }
}
```

## Next Steps

1. Implement base classes and interfaces
2. Create metric collectors for all 75 parameters
3. Build snapshot creation logic
4. Implement config client with rollback
5. Create integration examples for all 7 stations
6. Add comprehensive tests
7. Document API and usage patterns
