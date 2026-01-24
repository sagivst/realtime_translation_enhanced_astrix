# NEW Monitoring System - Complete System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE MONITORING SYSTEM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   Asterisk   │────▶│   Gateway    │────▶│ UDP Sockets  │                │
│  │     PBX      │ RTP │  3333/4444   │ PCM │  6120/6123   │                │
│  └──────────────┘     └──────────────┘     └──────┬───────┘                │
│                                                     │                        │
│  ┌──────────────────────────────────────────────────▼──────────────────────┐ │
│  │                          STTTTSserver.js (PM2)                          │ │
│  │  ┌────────────────────────────────────────────────────────────────┐    │ │
│  │  │                    Translation Pipeline                         │    │ │
│  │  │  ASR (Deepgram) → Translation (DeepL) → TTS (ElevenLabs)      │    │ │
│  │  └────────────────────────────────────────────────────────────────┘    │ │
│  │  ┌────────────────────────────────────────────────────────────────┐    │ │
│  │  │              MonitoringStationsBootstrap                        │    │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │    │ │
│  │  │  │ Station  │ │  Audio   │ │  Bridge  │ │  Knobs   │        │    │ │
│  │  │  │ Handlers │ │ Recorder │ │ Emitter  │ │ Resolver │        │    │ │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │    │ │
│  │  └────────────────────────────────────────────────────────────────┘    │ │
│  │  ┌────────────────────────────────────────────────────────────────┐    │ │
│  │  │              OptimizerAPI (Express Server)                     │    │ │
│  │  │  GET /api/traces/active    POST /api/optimizer/knobs/apply    │    │ │
│  │  │  GET /api/optimizer/snapshot    GET /api/audio/segment        │    │ │
│  │  └────────────────────────────────────────────────────────────────┘    │ │
│  │  ┌────────────────────────────────────────────────────────────────┐    │ │
│  │  │                    BucketScheduler                             │    │ │
│  │  │         Applies knob changes at 5-second boundaries            │    │ │
│  │  └────────────────────────────────────────────────────────────────┘    │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                     PostgreSQL Database (monitoring_v2)                  │ │
│  │  ┌──────────┐ ┌──────────────┐ ┌─────────────┐ ┌──────────────┐       │ │
│  │  │  traces  │ │metrics_agg_5s│ │audio_segments│ │knob_snapshots│       │ │
│  │  └──────────┘ └──────────────┘ └─────────────┘ └──────────────┘       │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                     AI Optimizer Agent (Port 3090)                        │ │
│  │  ┌────────────────────────────────────────────────────────────────┐      │ │
│  │  │  Node.js Service with OpenAI Integration                        │      │ │
│  │  │  • Fetches active traces via OptimizerAPI                      │      │ │
│  │  │  • Retrieves metrics snapshots (5-sec buckets)                 │      │ │
│  │  │  • Analyzes with GPT-4 for optimal settings                    │      │ │
│  │  │  • Validates decisions against knob limits                     │      │ │
│  │  │  • Schedules changes via POST /api/optimizer/knobs/apply      │      │ │
│  │  │  • Falls back to rule-based if OpenAI fails                   │      │ │
│  │  └────────────────────────────────────────────────────────────────┘      │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
STTTTSserver.js (Main Process)
│
├── MonitoringStationsBootstrap (Singleton)
│   │
│   ├── DatabaseBridge
│   │   └── PostgreSQL Connection Pool (10 connections)
│   │
│   ├── MetricsEmitter
│   │   ├── Queue (max 10,000 items)
│   │   └── Batch Processor (200ms flush)
│   │
│   ├── AudioWriter
│   │   ├── File System Writer
│   │   └── Database Indexer
│   │
│   ├── AudioRecorder
│   │   ├── PRE Tap Buffer
│   │   └── POST Tap Buffer
│   │
│   └── St_Handler_Generic
│       ├── MetricsRegistry (14 metric types)
│       ├── KnobsRegistry (35 knobs)
│       ├── Aggregator (5-second buckets)
│       ├── KnobsResolver (per station)
│       └── Station Handlers
│           ├── Station3_3333_Handler
│           └── Station3_4444_Handler
│
├── BucketScheduler
│   ├── Timer (1-second interval)
│   ├── Pending Updates Map
│   └── Persistence Layer
│
└── OptimizerAPI (Express Server :3020)
    ├── REST Endpoints (8 routes)
    └── WebSocket Server (optional)
```

## Data Flow Sequence Diagram

```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│Audio │ │ UDP  │ │STTTS │ │Monitor│ │Station│ │Aggre │ │Emitter│ │  DB  │
│Source│ │Socket│ │server│ │Bootstrap│ │Handler│ │gator │ │      │ │Bridge│
└──┬───┘ └──┬───┘ └──┬───┘ └──┬────┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘
   │        │        │        │         │        │        │        │
   │ Audio  │        │        │         │        │        │        │
   ├───────▶│        │        │         │        │        │        │
   │        │ 160B   │        │         │        │        │        │
   │        ├───────▶│        │         │        │        │        │
   │        │        │Create  │         │        │        │        │
   │        │        │Context │         │        │        │        │
   │        │        ├───────▶│         │        │        │        │
   │        │        │        │Process  │        │        │        │
   │        │        │        ├────────▶│        │        │        │
   │        │        │        │         │ PRE    │        │        │
   │        │        │        │         ├───────▶│        │        │
   │        │        │        │         │        │Aggregate│        │
   │        │        │        │         │        ├───────▶│        │
   │        │        │        │         │ POST   │        │        │
   │        │        │        │         ├───────▶│        │        │
   │        │        │        │         │        │        │ Batch  │
   │        │        │        │         │        │        ├───────▶│
   │        │        │        │         │        │        │        │
   │        │        │        │         │        │        │        │
   │ ◄──────────────── Every 5 seconds ──────────────────────────▶ │
   │        │        │        │         │        │ Flush  │        │
   │        │        │        │         │        ├───────▶│        │
   │        │        │        │         │        │        │ Send   │
   │        │        │        │         │        │        ├───────▶│
   │        │        │        │         │        │        │        │Create
   │        │        │        │         │        │        │        │Traces
   │        │        │        │         │        │        │        ├──────▶
   │        │        │        │         │        │        │        │Insert
   │        │        │        │         │        │        │        │Metrics
   │        │        │        │         │        │        │        ├──────▶
   │        │        │        │         │        │        │        │
```

## Processing Pipeline States

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frame Processing States                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  IDLE ──▶ RECEIVING ──▶ BUFFERING ──▶ PROCESSING ──▶ AGGREGATING    │
│   │                         │              │              │          │
│   │                         │              │              ▼          │
│   │                         │              │         RECORDING       │
│   │                         │              │              │          │
│   │                         │              ▼              ▼          │
│   │                         │         TRANSLATING    EMITTING       │
│   │                         │              │              │          │
│   │                         │              ▼              ▼          │
│   │                         │         SYNTHESIZING   PERSISTING     │
│   │                         │              │              │          │
│   └─────────────────────────┴──────────────┴──────────────┘         │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Network Topology

```
┌──────────────────────────────────────────────────────────────┐
│                     Azure VM (20.170.155.53)                  │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  Inbound Ports:                                              │
│  ├── 6120/udp  : Extension 3333 audio input                  │
│  ├── 6123/udp  : Extension 4444 audio input                  │
│  ├── 6121/udp  : Extension 3333 audio output                 │
│  ├── 6124/udp  : Extension 4444 audio output                 │
│  ├── 3020/tcp  : Optimizer API (HTTP/WebSocket)              │
│  └── 5432/tcp  : PostgreSQL (localhost only)                 │
│                                                                │
│  Outbound Connections:                                       │
│  ├── api.deepgram.com:443     : ASR service                  │
│  ├── api.deepl.com:443        : Translation service          │
│  └── api.elevenlabs.io:443    : TTS service                  │
│                                                                │
│  Internal Connections:                                       │
│  ├── localhost:5432           : PostgreSQL                   │
│  ├── localhost:3020           : API server                   │
│  └── /var/monitoring/audio    : File system                  │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

## Database Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Database Schema (monitoring_v2)               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│                              traces                                  │
│                           ┌──────────┐                               │
│                           │ trace_id │◄─────────────┐                │
│                           │started_at│              │                │
│                           │ ended_at │              │ Foreign Keys   │
│                           └────┬─────┘              │                │
│                                │                    │                │
│                 ┌──────────────┼──────────────┐     │                │
│                 ▼              ▼              ▼     │                │
│         metrics_agg_5s  audio_segments  knob_snapshots               │
│         ┌────────────┐  ┌────────────┐  ┌────────────┐              │
│         │ trace_id   │  │ trace_id   │  │ trace_id   │              │
│         │station_key │  │station_key │  │station_key │              │
│         │ bucket_ts  │  │ bucket_ts  │  │ bucket_ts  │              │
│         │ tap (PRE)  │  │ tap        │  │knobs_json  │              │
│         │ metrics    │  │ file_path  │  │config_ver  │              │
│         └────────────┘  └────────────┘  └────────────┘              │
│                                                                       │
│                     scheduled_knob_updates                           │
│                        ┌────────────┐                                │
│                        │ trace_id   ├───────────────┘                │
│                        │ station_key│                                │
│                        │apply_at_ts │                                │
│                        │   knobs    │                                │
│                        └─────┬──────┘                                │
│                              │                                       │
│                              ▼                                       │
│                     knob_verifications                               │
│                        ┌────────────┐                                │
│                        │ update_id  │                                │
│                        │expected_knobs                               │
│                        │actual_knobs│                                │
│                        │   match    │                                │
│                        └────────────┘                                │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Memory Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Process Memory Layout (~85MB)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Node.js Heap (50MB)                                                │
│  ├── MonitoringBootstrap Instance    (2MB)                         │
│  ├── Station Handlers (2)            (1MB)                         │
│  ├── Metrics Queue (10,000 max)      (10MB)                        │
│  ├── Audio Buffers (per trace)       (5MB)                         │
│  ├── Database Connection Pool        (2MB)                         │
│  ├── Express/HTTP Server             (5MB)                         │
│  ├── UDP Socket Buffers              (2MB)                         │
│  └── General Objects/Strings         (23MB)                        │
│                                                                       │
│  Native Memory (35MB)                                               │
│  ├── V8 Engine                       (20MB)                        │
│  ├── libuv Thread Pool               (5MB)                         │
│  ├── Network Buffers                 (5MB)                         │
│  └── File System Cache               (5MB)                         │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Timing Characteristics

```
┌─────────────────────────────────────────────────────────────────────┐
│                        System Timing Diagram                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  0ms    10ms   20ms   30ms   40ms   50ms  ...  5000ms              │
│  │──────│──────│──────│──────│──────│──────...──│                  │
│  ▼      ▼      ▼      ▼      ▼      ▼          ▼                  │
│  Frame  Frame  Frame  Frame  Frame  Frame      Flush               │
│  │                                              │                   │
│  ├─ Process (2ms)                              ├─ Aggregate        │
│  ├─ Metrics (1ms)                              ├─ Emit Batch       │
│  └─ Buffer Audio                               └─ Write to DB      │
│                                                                       │
│  Bucket Alignment (5-second boundaries):                            │
│  ├── 21:10:00.000                                                  │
│  ├── 21:10:05.000                                                  │
│  ├── 21:10:10.000                                                  │
│  └── 21:10:15.000                                                  │
│                                                                       │
│  Latency Budget:                                                    │
│  ├── Frame Processing: <3ms                                        │
│  ├── Database Write: <35ms                                         │
│  ├── Audio Write: <50ms                                            │
│  └── Total E2E: <100ms                                             │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Failure Recovery Mechanisms

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Failure Recovery Flow                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Database Connection Loss:                                          │
│  ├── Detect failure                                                 │
│  ├── Queue metrics locally (up to 10,000)                          │
│  ├── Retry with exponential backoff                                │
│  ├── On reconnect: Flush queue                                     │
│  └── If queue full: Drop oldest                                    │
│                                                                       │
│  Audio Write Failure:                                              │
│  ├── Queue in memory (up to 5,000)                                 │
│  ├── Retry write                                                   │
│  ├── Skip if persistent failure                                    │
│  └── Log for manual recovery                                       │
│                                                                       │
│  Process Crash:                                                    │
│  ├── PM2 detects crash                                             │
│  ├── Automatic restart                                             │
│  ├── Reload configuration                                          │
│  └── Resume monitoring                                             │
│                                                                       │
│  Backpressure:                                                     │
│  ├── Monitor queue depth                                           │
│  ├── Warn at 80% capacity                                          │
│  ├── Drop oldest at 100%                                           │
│  └── Track dropped metrics                                         │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Production Deployment                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  PM2 Process Manager                                                │
│  ├── STTTTSserver (1 instance)                                     │
│  ├── gateway-3333 (1 instance)                                     │
│  ├── gateway-4444 (1 instance)                                     │
│  ├── bucket-scheduler (1 instance)                                 │
│  ├── ai-optimizer (1 instance)                                     │
│  ├── optimizer-agent (1 instance)                                  │
│  ├── database-api-server (1 instance)                              │
│  ├── ari-handler (1 instance)                                      │
│  └── proxy-dashboard (1 instance)                                  │
│                                                                       │
│  File System Structure:                                            │
│  /home/azureuser/translation-app/                                  │
│  ├── 3333_4444__Operational/                                       │
│  │   └── STTTTSserver/                                            │
│  │       ├── STTTTSserver.js                                      │
│  │       ├── Monitoring_Stations/                                 │
│  │       └── lib/                                                 │
│  ├── checkpoints/                                                  │
│  └── logs/                                                         │
│                                                                       │
│  /var/monitoring/audio/                                            │
│  └── traces/                                                       │
│      └── {trace_id}/                                              │
│          └── {station}/                                           │
│              └── {tap}/                                           │
│                  └── *.wav                                        │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Performance Metrics

```
┌─────────────────────────────────────────────────────────────────────┐
│                      System Performance Profile                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Throughput:                                                        │
│  ├── Audio: 100 packets/second/extension                           │
│  ├── Metrics: 1,000 data points/second                             │
│  ├── Database Writes: 10 batches/second                            │
│  └── Audio Files: 24 files/minute                                  │
│                                                                       │
│  Latency:                                                          │
│  ├── Frame Processing: p50=2ms, p95=5ms, p99=10ms                 │
│  ├── Database Write: p50=20ms, p95=50ms, p99=100ms                │
│  ├── Audio Write: p50=10ms, p95=30ms, p99=50ms                    │
│  └── E2E Monitoring: p50=50ms, p95=150ms, p99=300ms               │
│                                                                       │
│  Resource Usage:                                                   │
│  ├── CPU: 3-5% average, 15% peak                                  │
│  ├── Memory: 85MB average, 150MB peak                             │
│  ├── Disk I/O: 100KB/s average, 1MB/s peak                        │
│  ├── Network: 200KB/s in, 100KB/s out                             │
│  └── Database Connections: 3 active, 10 max                       │
│                                                                       │
│  Capacity:                                                         │
│  ├── Concurrent Calls: 10                                         │
│  ├── Metrics Buffer: 10,000 items                                 │
│  ├── Audio Buffer: 5,000 segments                                 │
│  └── Database Storage: 5GB/day                                    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Integration Points

```
┌─────────────────────────────────────────────────────────────────────┐
│                        External Integrations                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. Asterisk PBX                                                    │
│     └── SIP Extensions 3333, 4444                                  │
│                                                                       │
│  2. AI Optimizer Agent (Port 3090)                                 │
│     ├── Consumes: GET /api/traces/active                           │
│     ├── Consumes: GET /api/optimizer/snapshot                      │
│     ├── Produces: POST /api/optimizer/knobs/apply                  │
│     └── Backend: OpenAI GPT-4 API                                  │
│                                                                       │
│  3. Translation Services                                           │
│     ├── Deepgram (ASR)                                            │
│     ├── DeepL (Translation)                                       │
│     └── ElevenLabs (TTS)                                          │
│                                                                       │
│  4. Monitoring Dashboard                                           │
│     └── WebSocket connection for real-time metrics                 │
│                                                                       │
│  5. Backup Systems                                                 │
│     └── PostgreSQL pg_dump scheduled                               │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Security Layers                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Network Security:                                                  │
│  ├── Internal network only (no public exposure)                    │
│  ├── Firewall rules for specific ports                             │
│  └── VPN access for administration                                 │
│                                                                       │
│  Application Security:                                             │
│  ├── Input validation on all API endpoints                         │
│  ├── Parameterized SQL queries (no injection)                      │
│  ├── Knob value range validation                                   │
│  └── Idempotency keys prevent replay                               │
│                                                                       │
│  Data Security:                                                    │
│  ├── Audio files: filesystem permissions                           │
│  ├── Database: role-based access control                           │
│  ├── Logs: no sensitive data logged                                │
│  └── Retention: 72-hour automatic cleanup                          │
│                                                                       │
│  Operational Security:                                             │
│  ├── PM2 process isolation                                         │
│  ├── Resource limits (memory, CPU)                                 │
│  ├── Automatic restarts on failure                                 │
│  └── Health monitoring endpoints                                   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## System Boundaries

```
┌─────────────────────────────────────────────────────────────────────┐
│                      System Boundaries                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  IN SCOPE:                                                          │
│  ✓ Real-time audio monitoring                                      │
│  ✓ 5-second metrics aggregation                                    │
│  ✓ Audio recording and indexing                                    │
│  ✓ Dynamic configuration management                                 │
│  ✓ Database persistence                                            │
│  ✓ API for AI Optimizer                                           │
│  ✓ Automatic trace creation                                        │
│                                                                       │
│  OUT OF SCOPE:                                                     │
│  ✗ Audio transcription/translation                                 │
│  ✗ AI optimization logic                                           │
│  ✗ SIP/RTP protocol handling                                       │
│  ✗ User authentication                                             │
│  ✗ Long-term data archival                                         │
│  ✗ Data visualization/dashboards                                   │
│                                                                       │
│  INTERFACES:                                                       │
│  ← UDP audio input (6120, 6123)                                   │
│  → PostgreSQL database                                             │
│  ↔ REST API (3020)                                                │
│  → File system (/var/monitoring/audio)                             │
│  ↔ AI Optimizer Service (3090)                                     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## AI Optimizer Agent Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AI Optimizer Agent (Port 3090)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Service Architecture:                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   ai-service-openai.js                       │   │
│  │  ┌───────────────────────────────────────────────────────┐ │   │
│  │  │              Express Server (3090)                     │ │   │
│  │  │  ┌─────────────────────────────────────────────────┐ │ │   │
│  │  │  │    POST /optimize - Main Endpoint               │ │ │   │
│  │  │  │    • Receives metrics snapshot                  │ │ │   │
│  │  │  │    • Checks ai.optimization_allowed permission  │ │ │   │
│  │  │  │    • Analyzes with OpenAI GPT-4                │ │ │   │
│  │  │  │    • Returns knob adjustments                  │ │ │   │
│  │  │  └─────────────────────────────────────────────────┘ │ │   │
│  │  └───────────────────────────────────────────────────────┘ │   │
│  │  ┌───────────────────────────────────────────────────────┐ │   │
│  │  │              OpenAI Integration                        │ │   │
│  │  │  • Model: GPT-4-turbo-preview                         │ │   │
│  │  │  • Temperature: 0.3 (consistent decisions)            │ │   │
│  │  │  • Max Tokens: 500                                    │ │   │
│  │  │  • Timeout: 2000ms with retry                         │ │   │
│  │  │  • JSON response format enforced                      │ │   │
│  │  └───────────────────────────────────────────────────────┘ │   │
│  │  ┌───────────────────────────────────────────────────────┐ │   │
│  │  │              Fallback Mechanism                        │ │   │
│  │  │  If OpenAI fails:                                      │ │   │
│  │  │  • Rule-based decisions activate                      │ │   │
│  │  │  • Progressive gain adjustments                       │ │   │
│  │  │  • Safe defaults applied                              │ │   │
│  │  └───────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  Decision Flow:                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    │
│  │ Fetch    │───▶│ Get      │───▶│ Analyze  │───▶│ Schedule │    │
│  │ Traces   │    │ Snapshot │    │ w/ GPT-4 │    │ Knobs    │    │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    │
│       ▲                                                 │          │
│       │                                                 ▼          │
│  ┌──────────┐                                    ┌──────────┐     │
│  │  Timer   │                                    │ Verify   │     │
│  │  Loop    │◀───────────────────────────────────│ Applied  │     │
│  └──────────┘                                    └──────────┘     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### AI Optimizer Integration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Complete Integration Flow                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. Discovery Phase (Every 10 seconds)                              │
│     GET http://localhost:3020/api/traces/active                      │
│     ↓                                                                │
│     Returns: [{trace_id, started_at, stations}]                    │
│                                                                       │
│  2. Analysis Phase (For each active trace)                          │
│     GET http://localhost:3020/api/optimizer/snapshot?trace_id=X     │
│     ↓                                                                │
│     Returns: {buckets: [{metrics, knobs, audio}]}                   │
│     ↓                                                                │
│     OpenAI Analysis:                                                │
│     • Current RMS: -24 dBFS → Target: -18 dBFS                     │
│     • Clipping detected → Reduce gain                              │
│     • SNR low → Enable noise reduction                             │
│     ↓                                                                │
│     Decisions: [{knob, value, confidence, reason}]                  │
│                                                                       │
│  3. Application Phase                                               │
│     POST http://localhost:3020/api/optimizer/knobs/apply            │
│     Body: {                                                         │
│       trace_id, station_key,                                        │
│       apply_at_bucket_ts: "2026-01-12T21:10:05.000Z",             │
│       idempotency_key: "uuid-v4",                                   │
│       knobs: {"pcm.input_gain_db": 6}                              │
│     }                                                               │
│     ↓                                                                │
│     BucketScheduler applies at exact 5-second boundary              │
│                                                                       │
│  4. Verification Phase                                              │
│     GET /api/optimizer/verify/:idempotency_key                      │
│     ↓                                                                │
│     Confirms knobs were applied correctly                           │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### AI Decision Logic

```
┌─────────────────────────────────────────────────────────────────────┐
│                      OpenAI Prompt Structure                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  System Role: "You are an audio optimization expert"                │
│                                                                       │
│  Input Metrics:                                                     │
│  {                                                                  │
│    "PRE": {                                                         │
│      "pcm.amplitude_rms": {avg: 2400, max: 8000},                  │
│      "pcm.clipping_ratio": {avg: 0.002}                            │
│    },                                                               │
│    "POST": {                                                        │
│      "pcm.amplitude_rms": {avg: 3200, max: 12000}                  │
│    },                                                               │
│    "knobs": {                                                       │
│      "pcm.input_gain_db": 0,                                       │
│      "agc.enabled": false                                          │
│    }                                                                │
│  }                                                                  │
│                                                                       │
│  Analysis Goals:                                                    │
│  • Target RMS: -18 to -12 dBFS (5240 to 10400)                    │
│  • Clipping ratio: < 0.001                                         │
│  • Progressive adjustments: 2-4 dB steps                           │
│  • Enable processing only when needed                              │
│                                                                       │
│  Output Format:                                                     │
│  {                                                                  │
│    "decisions": [                                                   │
│      {                                                              │
│        "knob": "pcm.input_gain_db",                                │
│        "recommended_value": 3,                                     │
│        "confidence": 0.85,                                         │
│        "reason": "RMS below target, increasing gradually"          │
│      }                                                              │
│    ]                                                                │
│  }                                                                  │
│                                                                       │
│  Validation Rules:                                                  │
│  • pcm.input_gain_db: [-20, +20]                                   │
│  • agc.target_level_dbfs: [-30, 0]                                 │
│  • Maximum 5 decisions per response                                │
│  • Boolean values for enable/disable flags                        │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Configuration & Deployment

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AI Optimizer Configuration                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Environment Variables (.env):                                      │
│  ├── OPENAI_API_KEY=sk-...                  # OpenAI API key       │
│  ├── OPENAI_MODEL=gpt-4-turbo-preview       # Model selection      │
│  ├── AI_SERVICE_PORT=3090                   # Service port         │
│  ├── API_TIMEOUT_MS=2000                    # OpenAI timeout       │
│  └── MAX_RETRIES=2                          # Retry attempts       │
│                                                                       │
│  PM2 Configuration:                                                 │
│  {                                                                  │
│    name: 'ai-optimizer',                                           │
│    script: 'ai-service-openai.js',                                 │
│    cwd: '/home/azureuser/translation-app/ai-optimizer',            │
│    instances: 1,                                                   │
│    env: {                                                          │
│      NODE_ENV: 'production',                                       │
│      AI_SERVICE_PORT: 3090                                         │
│    }                                                                │
│  }                                                                  │
│                                                                       │
│  Resource Usage:                                                   │
│  ├── Memory: ~50MB base + OpenAI SDK                              │
│  ├── CPU: <2% idle, spikes during analysis                        │
│  ├── Network: Minimal (API calls only)                            │
│  └── OpenAI Tokens: ~500-1000 per analysis                        │
│                                                                       │
│  Cost Estimation:                                                  │
│  ├── Calls per hour: ~360 (10-sec interval)                       │
│  ├── Tokens per call: ~750 average                                │
│  ├── Daily tokens: ~6.5M                                          │
│  └── Daily cost: ~$65 (GPT-4 pricing)                             │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```