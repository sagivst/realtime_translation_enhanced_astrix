# Real-Time Translation Pipeline Monitoring System
## Complete Technical Specification & API Requirements

**Version:** 1.0  
**Date:** December 2025  
**Deployment URL:** `https://realtime-translation-1760218638.azurewebsites.net/3333_4444__Operational/Monitoring_Dashboard/`

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Data Models](#data-models)
4. [API Requirements](#api-requirements)
5. [Configuration System](#configuration-system)
6. [UI Components](#ui-components)
7. [Integration Points](#integration-points)
8. [Deployment](#deployment)

---

## 1. System Overview

### Purpose
Real-time monitoring and control system for a 12-station voice processing pipeline that handles audio translation, speech-to-text, text-to-speech, and quality enhancement for English-French bidirectional calls.

### Key Features
- Real-time monitoring of 12 processing stations (24 channels total - extensions 3333 and 4444)
- 68 distinct metrics across 5 categories (buffer, latency, packet, audio quality, performance)
- 111 configurable audio processing knobs (AGC, AEC, Noise Reduction, EQ, etc.)
- AI-powered optimization suggestions
- Configuration management with save/restore capabilities
- Live audio waveform and spectrogram visualization
- Matrix-based metric display with color-coded health indicators

### Technology Stack
- **Frontend:** Next.js 15 (App Router), React 19.2, TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui components
- **Data Fetching:** SWR with 150ms refresh interval
- **Deployment:** Azure App Service (Node.js 20-lts)
- **API Integration:** Operational system at https://20.170.155.53:8080

---

## 2. Architecture

### System Diagram

\`\`\`
┌─────────────────────────────────────────────────────────┐
│  Browser (User Interface)                               │
│  ├── Station Grid View (24 stations)                   │
│  ├── Detail View (per station metrics & controls)      │
│  ├── Settings/Configuration Panel                      │
│  └── Global AI Optimization Panel                      │
└─────────────────────────────────────────────────────────┘
                        ↓ HTTPS (150ms polling)
┌─────────────────────────────────────────────────────────┐
│  Next.js App (Azure App Service)                       │
│  ├── /api/proxy-snapshots (GET)                        │
│  ├── /api/config/knobs/:stationId/:ext (GET/POST)     │
│  ├── /api/config/metrics (GET/POST)                    │
│  └── /api/optimize-station (POST)                      │
└─────────────────────────────────────────────────────────┘
                        ↓ HTTPS
┌─────────────────────────────────────────────────────────┐
│  Operational System (20.170.155.53:8080)               │
│  ├── GET  /api/snapshots (returns array of snapshots)  │
│  ├── POST /api/config/knobs/:id (save knob config)     │
│  ├── POST /api/config/metrics (save metric thresholds) │
│  └── POST /api/optimize (AI optimization request)      │
└─────────────────────────────────────────────────────────┘
\`\`\`

### Component Structure

\`\`\`
app/
├── page.tsx                 # Main dashboard (grid + detail views)
├── layout.tsx               # Root layout with metadata
├── globals.css              # Global styles & Tailwind config
└── api/
    ├── proxy-snapshots/     # Proxy to operational API
    ├── config/knobs/        # Knob configuration endpoints
    ├── config/metrics/      # Metric configuration endpoints
    └── optimize-station/    # AI optimization endpoint

components/
├── station-monitoring-grid.tsx   # 24-station grid view
├── station-detail-view.tsx       # Single station detailed metrics
├── settings-page.tsx             # Configuration UI
├── matrix-display.tsx            # Metric matrix visualization
├── global-ai-panel.tsx           # AI optimization control
├── super-audio-monitor.tsx       # Waveform/spectrogram display
└── ui/                           # shadcn UI components

hooks/
└── use-monitoring-api.ts         # Data fetching & state management

types/
└── monitoring.ts                 # TypeScript interfaces

config/
└── knobs-config.ts               # 111 knob definitions
\`\`\`

---

## 3. Data Models

### 3.1 StationSnapshot (Primary Data Structure)

**Purpose:** Real-time snapshot of a station's metrics and status

\`\`\`typescript
interface StationSnapshot {
  // Identification
  id?: string                    // Unique snapshot ID (optional)
  station_id: string            // "STATION_1" through "STATION_12"
  extension: string             // "3333" (English) or "4444" (French)
  timestamp: string             // ISO 8601 timestamp
  
  // Call Information
  call_id?: string              // Current call ID if active
  channel?: string              // Channel identifier
  status?: "online" | "offline" // Station operational status
  
  // Real-time Data
  metrics: Record<string, number>  // Flat object with dot-notation keys
  knobs?: Record<string, any>      // Current knob values
  
  // Configuration (optional)
  config?: {
    knobs?: Record<string, {
      applicable: boolean
      validValues?: any[]
      recommendedValue?: any
    }>
    metrics?: Record<string, {
      min: number
      max: number
      optimal: number
      warning?: number
      critical?: number
    }>
  }
}
\`\`\`

**Example Snapshot:**
\`\`\`json
{
  "id": "1733408765123-STATION_1-3333",
  "station_id": "STATION_1",
  "extension": "3333",
  "timestamp": "2025-12-05T10:32:45.123Z",
  "call_id": "call-7834",
  "channel": "3333",
  "status": "online",
  "metrics": {
    "buffer.total": 52.3,
    "buffer.input": 48.1,
    "latency.avg": 185,
    "latency.max": 420,
    "packet.loss": 0.2,
    "audioQuality.mos": 4.2,
    "audioQuality.snr": 38.5,
    "performance.cpu": 45.2,
    "performance.memory": 62.1,
    "dsp.agc.currentGain": 12.5
  },
  "knobs": {
    "agc.enabled": true,
    "agc.target_level_dbfs": -18,
    "agc.compression_ratio": 3.5,
    "aec.enabled": true,
    "aec.nlp_mode": "moderate",
    "nr.enabled": true,
    "codec_type": "OPUS",
    "chunk_ms": 280
  }
}
\`\`\`

### 3.2 Station Definitions

**12 Stations × 2 Extensions = 24 Monitoring Points**

| Station ID | Name | Description | Extensions | Extension Labels |
|------------|------|-------------|------------|------------------|
| STATION_1 | Asterisk → Gateway | RTP source monitoring | 3333, 4444 | - |
| STATION_2 | Gateway → STTTTSserver | RTP→PCM conversion | 3333, 4444 | - |
| STATION_3 | STTTTSserver → Deepgram | Voice prep for STT | 3333, 4444 | 3333: English (Caller)<br>4444: French (Callee) |
| STATION_4 | Deepgram Response | STT processing results | 3333, 4444 | 3333: English STT<br>4444: French STT |
| STATION_5 | Translation Engine | Language translation | 3333, 4444 | Planned |
| STATION_6 | ElevenLabs TTS | Text-to-speech | 3333, 4444 | Integration exists |
| STATION_7 | Audio Enhancement | Post-processing | 3333, 4444 | Placeholder |
| STATION_8 | Recording/Archive | Call recording | 3333, 4444 | Not implemented |
| STATION_9 | STTTTSserver → Gateway | TTS to Gateway output | 3333, 4444 | - |
| STATION_10 | Gateway → Asterisk | Final audio delivery | 3333, 4444 | - |
| STATION_11 | STTTTSserver → Hume | Emotional AI branch | 3333, 4444 | - |
| STATION_12 | Hume Response | Emotional AI response | 3333, 4444 | Planned |

### 3.3 Metric Definitions

**68 Metrics across 5 Categories**

#### Buffer Metrics (10 metrics)
- `buffer.total` - Total buffer utilization (%)
- `buffer.input` - Input buffer level (%)
- `buffer.output` - Output buffer level (%)
- `buffer.jitter` - Jitter buffer size (ms)
- `buffer.underrun` - Buffer underrun events (count/s)
- `buffer.overrun` - Buffer overrun events (count/s)
- `buffer.playback` - Playback buffer (ms)
- `buffer.record` - Recording buffer (ms)
- `buffer.network` - Network buffer (KB)
- `buffer.processing` - Processing buffer (ms)

#### Latency Metrics (8 metrics)
- `latency.avg` - Average latency (ms)
- `latency.min` - Minimum latency (ms)
- `latency.max` - Maximum latency (ms)
- `latency.jitter` - Latency jitter (ms)
- `latency.variance` - Latency variance (ms²)
- `latency.percentile95` - 95th percentile latency (ms)
- `latency.network` - Network latency (ms)
- `latency.processing` - Processing latency (ms)

#### Packet Metrics (12 metrics)
- `packet.loss` - Packet loss rate (%)
- `packet.received` - Packets received (packets/s)
- `packet.sent` - Packets sent (packets/s)
- `packet.dropped` - Packets dropped (packets/s)
- `packet.outOfOrder` - Out-of-order packets (packets/s)
- `packet.duplicate` - Duplicate packets (packets/s)
- `packet.retransmit` - Retransmitted packets (packets/s)
- `packet.corruption` - Corrupted packets (packets/s)
- `packet.fragmentation` - Fragmented packets (%)
- `packet.reassembly` - Reassembly failures (count/s)
- `packet.throughput` - Packet throughput (packets/s)
- `packet.bandwidth` - Bandwidth usage (Mbps)

#### Audio Quality Metrics (10 metrics)
- `audioQuality.snr` - Signal-to-noise ratio (dB)
- `audioQuality.mos` - Mean opinion score (1.0-5.0)
- `audioQuality.pesq` - PESQ score (-0.5-4.5)
- `audioQuality.polqa` - POLQA score (1.0-5.0)
- `audioQuality.thd` - Total harmonic distortion (%)
- `audioQuality.speechLevel` - Speech level (dBFS)
- `audioQuality.clipping` - Clipping detected (%)
- `audioQuality.noise` - Background noise level (dBFS)
- `audioQuality.echo` - Echo level (dBFS)
- `audioQuality.distortion` - Audio distortion (%)

#### Performance Metrics (8 metrics)
- `performance.cpu` - CPU usage (%)
- `performance.memory` - Memory usage (%)
- `performance.bandwidth` - Network bandwidth (Mbps)
- `performance.throughput` - Data throughput (KB/s)
- `performance.threads` - Active threads (count)
- `performance.queue` - Queue depth (items)
- `performance.cache` - Cache hit rate (%)
- `performance.io` - I/O wait time (ms)

**Metric Threshold Structure:**
\`\`\`typescript
interface MetricThresholds {
  warningLow: number | null      // Yellow indicator threshold (low)
  warningHigh: number | null     // Yellow indicator threshold (high)
  criticalLow: number | null     // Red indicator threshold (low)
  criticalHigh: number | null    // Red indicator threshold (high)
  optimum?: number               // Optimal value (green)
  actionSpace?: {                // AI adjustment range
    min: number
    max: number
  }
}
\`\`\`

### 3.4 Knob Definitions

**111 Audio Processing Controls across 11 Categories**

#### AGC (Automatic Gain Control) - 8 knobs
1. `agc.enabled` (boolean)
2. `agc.target_level_dbfs` (-60 to 0 dBFS)
3. `agc.compression_ratio` (1.0 to 10.0)
4. `agc.attack_time_ms` (1 to 100 ms)
5. `agc.release_time_ms` (20 to 1000 ms)
6. `agc.max_gain_db` (0 to 60 dB)
7. `agc.min_gain_db` (-20 to 0 dB)
8. `agc.knee_width_db` (0 to 20 dB)

#### AEC (Acoustic Echo Cancellation) - 7 knobs
9. `aec.enabled` (boolean)
10. `aec.suppression_level_db` (-60 to 0 dB)
11. `aec.tail_length_ms` (32 to 1024 ms)
12. `aec.nlp_mode` (enum: off, mild, moderate, aggressive)
13. `aec.adaptation_rate` (0.1 to 2.0)
14. `aec.convergence_time_s` (0.5 to 10.0 s)
15. `aec.doubletalk_threshold` (0.1 to 1.0)

#### Noise Reduction (NR) - 6 knobs
16. `nr.enabled` (boolean)
17. `nr.suppression_level_db` (-30 to 0 dB)
18. `nr.spectral_floor_db` (-90 to -40 dB)
19. `nr.frequency_smoothing` (0.0 to 1.0)
20. `nr.time_smoothing` (0.0 to 1.0)
21. `nr.noise_gate_threshold_db` (-80 to -20 dB)

#### Compressor - 7 knobs
22. `compressor.enabled` (boolean)
23. `compressor.threshold_dbfs` (-40 to 0 dBFS)
24. `compressor.ratio` (1.0 to 20.0)
25. `compressor.attack_time_ms` (0.1 to 100 ms)
26. `compressor.release_time_ms` (10 to 1000 ms)
27. `compressor.knee_width_db` (0 to 20 dB)
28. `compressor.makeup_gain_db` (0 to 30 dB)

#### Limiter - 4 knobs
29. `limiter.enabled` (boolean)
30. `limiter.threshold_dbfs` (-12 to 0 dBFS)
31. `limiter.attack_time_ms` (0.01 to 10 ms)
32. `limiter.release_time_ms` (10 to 500 ms)

#### Equalizer (EQ) - 8 knobs
33. `eq.enabled` (boolean)
34. `eq.preset` (enum: flat, voice, bright, dark, custom)
35. `eq.low_gain_db` (-12 to 12 dB)
36. `eq.mid_gain_db` (-12 to 12 dB)
37. `eq.high_gain_db` (-12 to 12 dB)
38. `eq.low_freq_hz` (50 to 500 Hz)
39. `eq.mid_freq_hz` (500 to 4000 Hz)
40. `eq.high_freq_hz` (4000 to 16000 Hz)

#### De-esser - 4 knobs
41. `deesser.enabled` (boolean)
42. `deesser.threshold_dbfs` (-40 to 0 dBFS)
43. `deesser.frequency_hz` (4000 to 10000 Hz)
44. `deesser.bandwidth_hz` (500 to 4000 Hz)

#### VAD (Voice Activity Detection) - 5 knobs
45. `vad.enabled` (boolean)
46. `vad.threshold_dbfs` (-60 to -20 dBFS)
47. `vad.hangover_time_ms` (100 to 1000 ms)
48. `vad.attack_time_ms` (10 to 100 ms)
49. `vad.sensitivity` (enum: low, medium, high, very_high)

#### Codec Settings - 8 knobs
50. `codec.type` (enum: OPUS, G711, G722, G729, AMR-WB, PCMU, PCMA, iLBC)
51. `codec.bitrate_kbps` (8 to 512 kbps)
52. `codec.sample_rate_hz` (8000, 16000, 32000, 48000 Hz)
53. `codec.complexity` (0 to 10)
54. `codec.fec_enabled` (boolean)
55. `codec.dtx_enabled` (boolean)
56. `codec.cbr_enabled` (boolean)
57. `codec.packet_loss_expected` (0 to 100%)

#### Buffer Management - 11 knobs
58. `buffer.jitter_min_ms` (20 to 200 ms)
59. `buffer.jitter_max_ms` (100 to 1000 ms)
60. `buffer.jitter_target_ms` (50 to 500 ms)
61. `buffer.jitter_adaptation_rate` (0.0 to 1.0)
62. `buffer.input_size_ms` (10 to 500 ms)
63. `buffer.output_size_ms` (10 to 500 ms)
64. `buffer.prefill_ms` (10 to 200 ms)
65. `buffer.underrun_recovery_ms` (10 to 200 ms)
66. `buffer.overrun_discard_threshold` (0.5 to 1.0)
67. `buffer.adaptive_sizing` (boolean)
68. `buffer.conceal_lost_packets` (boolean)

#### RTP/Network - 13 knobs
69. `rtp.payload_type` (0 to 127)
70. `rtp.ssrc` (0 to 4294967295)
71. `rtp.timestamp_rate_hz` (8000, 16000, 32000, 48000)
72. `rtp.packet_size_ms` (10, 20, 40, 60)
73. `rtp.dscp` (0 to 63)
74. `rtp.tos` (0 to 255)
75. `rtp.max_packet_size` (100 to 2000 bytes)
76. `rtp.enable_rtcp` (boolean)
77. `rtp.rtcp_interval_ms` (500 to 10000 ms)
78. `rtp.retransmit_enabled` (boolean)
79. `rtp.max_retransmit_count` (1 to 10)
80. `rtp.forward_error_correction` (boolean)
81. `rtp.redundancy_percent` (0 to 100%)

#### Processing Settings - 30 knobs
82. `processing.chunk_size_ms` (10 to 500 ms)
83. `processing.overlap_percent` (0 to 50%)
84. `processing.window_type` (enum: hann, hamming, blackman, rectangular)
85. `processing.fft_size` (128, 256, 512, 1024, 2048, 4096)
86. `processing.hop_size_samples` (64 to 2048)
87. `processing.sample_format` (enum: int16, int32, float32)
88. `processing.channels` (1, 2)
89. `processing.interleaved` (boolean)
90. `processing.normalization_enabled` (boolean)
91. `processing.normalization_target_dbfs` (-30 to 0 dBFS)
92. `processing.highpass_cutoff_hz` (20 to 500 Hz)
93. `processing.lowpass_cutoff_hz` (4000 to 20000 Hz)
94. `processing.dc_remove_enabled` (boolean)
95. `processing.pre_emphasis_enabled` (boolean)
96. `processing.pre_emphasis_factor` (0.0 to 1.0)
97. `processing.dither_enabled` (boolean)
98. `processing.dither_type` (enum: rectangular, triangular, gaussian)
99. `processing.thread_priority` (enum: low, normal, high, realtime)
100. `processing.thread_affinity` (0 to 128)
101. `processing.max_concurrency` (1 to 64)
102. `processing.pipeline_stages` (1 to 16)
103. `processing.prefetch_enabled` (boolean)
104. `processing.cache_enabled` (boolean)
105. `processing.cache_size_mb` (16 to 1024 MB)
106. `processing.zero_copy_enabled` (boolean)
107. `processing.simd_enabled` (boolean)
108. `processing.simd_type` (enum: none, sse2, avx, avx2, neon)
109. `processing.gpu_acceleration` (boolean)
110. `processing.gpu_device_id` (0 to 8)
111. `processing.logging_level` (enum: off, error, warn, info, debug, trace)

**Knob Structure:**
\`\`\`typescript
interface KnobDefinition {
  id: string
  name: string
  category: string
  type: "boolean" | "numeric" | "enum"
  description: string
  unit: string
  
  // For numeric knobs
  validRange?: { min: number; max: number }
  recommendedRange?: { min: number; max: number }
  aiAdjustmentRange?: { min: number; max: number }
  optimum?: number
  
  // For boolean/enum knobs
  validValues?: any[]
  recommendedValues?: any[]
  aiAllowedValues?: any[]
  
  currentValue: any
  stations: string[]  // Which stations this knob applies to
}
\`\`\`

---

## 4. API Requirements

### 4.1 GET /api/snapshots

**Purpose:** Return real-time snapshots for all active stations

**Request:**
\`\`\`http
GET /api/snapshots HTTP/1.1
Host: 20.170.155.53:8080
Accept: application/json
\`\`\`

**Response:**
\`\`\`json
[
  {
    "id": "1733408765123-STATION_1-3333",
    "station_id": "STATION_1",
    "extension": "3333",
    "timestamp": "2025-12-05T10:32:45.123Z",
    "call_id": "call-7834",
    "channel": "3333",
    "status": "online",
    "metrics": {
      "buffer.total": 52.3,
      "buffer.input": 48.1,
      "buffer.output": 55.2,
      "latency.avg": 185,
      "latency.max": 420,
      "packet.loss": 0.2,
      "packet.received": 950,
      "audioQuality.mos": 4.2,
      "audioQuality.snr": 38.5,
      "performance.cpu": 45.2,
      "performance.memory": 62.1
    },
    "knobs": {
      "agc.enabled": true,
      "agc.target_level_dbfs": -18,
      "aec.enabled": true,
      "codec.type": "OPUS"
    }
  },
  // ... 23 more snapshots (12 stations × 2 extensions)
]
\`\`\`

**Frequency:** Dashboard polls this endpoint every **150ms**

**Error Handling:**
- If endpoint returns empty array `[]`, dashboard falls back to demo data
- If endpoint times out (>5s), dashboard falls back to demo data
- Dashboard shows "Using demo data" banner when not connected to live API

### 4.2 POST /api/config/knobs/:stationId/:extension

**Purpose:** Save knob configuration for a specific station/extension

**Request:**
\`\`\`http
POST /api/config/knobs/STATION_1/3333 HTTP/1.1
Host: 20.170.155.53:8080
Content-Type: application/json

{
  "agc.enabled": true,
  "agc.target_level_dbfs": -18,
  "agc.compression_ratio": 3.5,
  "agc.attack_time_ms": 12,
  "agc.release_time_ms": 180,
  "aec.enabled": true,
  "aec.nlp_mode": "moderate",
  "nr.enabled": true,
  "nr.suppression_level_db": -10,
  "codec.type": "OPUS",
  "codec.bitrate_kbps": 64
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "station_id": "STATION_1",
  "extension": "3333",
  "timestamp": "2025-12-05T10:35:22.456Z",
  "knobs_updated": 11
}
\`\`\`

**Validation:**
- Each knob value must be within its `validRange` or `validValues`
- Boolean knobs accept `true`/`false` only
- Enum knobs must match one of the `validValues`
- Numeric knobs must be within min/max range

### 4.3 GET /api/config/knobs/:stationId/:extension

**Purpose:** Retrieve saved knob configuration for a station/extension

**Request:**
\`\`\`http
GET /api/config/knobs/STATION_1/3333 HTTP/1.1
Host: 20.170.155.53:8080
Accept: application/json
\`\`\`

**Response:**
\`\`\`json
{
  "station_id": "STATION_1",
  "extension": "3333",
  "timestamp": "2025-12-05T10:35:22.456Z",
  "knobs": {
    "agc.enabled": true,
    "agc.target_level_dbfs": -18,
    // ... all 111 knobs
  }
}
\`\`\`

### 4.4 POST /api/config/knobs/defaults

**Purpose:** Save knob configuration as default template

**Request:**
\`\`\`http
POST /api/config/knobs/defaults HTTP/1.1
Host: 20.170.155.53:8080
Content-Type: application/json

{
  "template_name": "Production Optimal",
  "knobs": {
    "agc.enabled": true,
    "agc.target_level_dbfs": -18,
    // ... all 111 knobs
  }
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "template_name": "Production Optimal",
  "template_id": "tpl_1733408822",
  "timestamp": "2025-12-05T10:40:22.789Z"
}
\`\`\`

### 4.5 GET /api/config/knobs/defaults

**Purpose:** Retrieve default knob configuration template

**Request:**
\`\`\`http
GET /api/config/knobs/defaults HTTP/1.1
Host: 20.170.155.53:8080
Accept: application/json
\`\`\`

**Response:**
\`\`\`json
{
  "template_name": "Production Optimal",
  "template_id": "tpl_1733408822",
  "timestamp": "2025-12-05T10:40:22.789Z",
  "knobs": {
    "agc.enabled": true,
    "agc.target_level_dbfs": -18,
    // ... all 111 knobs
  }
}
\`\`\`

### 4.6 POST /api/config/metrics

**Purpose:** Save custom metric thresholds

**Request:**
\`\`\`http
POST /api/config/metrics HTTP/1.1
Host: 20.170.155.53:8080
Content-Type: application/json

{
  "latency.avg": {
    "warningHigh": 500,
    "criticalHigh": 1000,
    "optimum": 200
  },
  "audioQuality.mos": {
    "warningLow": 3.5,
    "criticalLow": 2.5,
    "optimum": 4.5
  },
  "buffer.total": {
    "warningLow": 20,
    "warningHigh": 80,
    "criticalLow": 10,
    "criticalHigh": 95,
    "optimum": 50
  }
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "metrics_updated": 3,
  "timestamp": "2025-12-05T10:45:33.123Z"
}
\`\`\`

### 4.7 POST /api/optimize

**Purpose:** Request AI-powered optimization for a station

**Request:**
\`\`\`http
POST /api/optimize HTTP/1.1
Host: 20.170.155.53:8080
Content-Type: application/json

{
  "station_id": "STATION_1",
  "extension": "3333",
  "goal": "balanced",  // "latency" | "quality" | "balanced"
  "current_snapshot": {
    "metrics": {
      "latency.avg": 350,
      "audioQuality.mos": 3.8,
      "buffer.total": 75
    },
    "knobs": {
      "chunk_ms": 300,
      "codec.bitrate_kbps": 64
    }
  }
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "station_id": "STATION_1",
  "extension": "3333",
  "recommendations": [
    {
      "knob": "chunk_ms",
      "current_value": 300,
      "recommended_value": 250,
      "reason": "Reduce latency while maintaining quality"
    },
    {
      "knob": "codec.bitrate_kbps",
      "current_value": 64,
      "recommended_value": 96,
      "reason": "Improve audio quality with available bandwidth"
    }
  ],
  "expected_impact": {
    "latency.avg": {
      "before": 350,
      "after": 280,
      "improvement_percent": 20
    },
    "audioQuality.mos": {
      "before": 3.8,
      "after": 4.1,
      "improvement_percent": 7.9
    }
  },
  "timestamp": "2025-12-05T10:50:44.567Z"
}
\`\`\`

---

## 5. Configuration System

### 5.1 Knobs Configuration UI

**Location:** Settings Page → System Configuration Tab → Knobs Display Configuration

**Features:**
- Menu to select monitoring station (dropdown: STATION_1 through STATION_12)
- Tabs for each extension (3333, 4444)
- 111 knobs organized by category (AGC, AEC, NR, Compressor, etc.)
- Each knob displays:
  - Name and description
  - Current value
  - Valid range (min/max for numeric, list for enum)
  - Recommended range (highlighted)
  - ON/OFF toggle for "Applicable Stations"
  - Input field with validation
  - Units (dB, ms, %, enum values)
- Action buttons per section:
  - **[Save]** - Save current configuration to operational system
  - **[Save Default]** - Save as default template
  - **[Restore from Defaults]** - Load default template

**Validation:**
- Real-time validation against `validRange` / `validValues`
- Visual indicators: green (valid), red (invalid), yellow (outside recommended range)
- Cannot save invalid configurations

### 5.2 Metrics Configuration UI

**Location:** Settings Page → System Configuration Tab → Metrics Display Configuration

**Features:**
- List of all 68 metrics
- For each metric:
  - Name and description
  - Current thresholds:
    - Warning Low / High
    - Critical Low / High
    - Optimum value
  - Editable threshold inputs
  - Unit display
  - Preview of color coding (green/yellow/red ranges)
- Action buttons:
  - **[Save]** - Save threshold configuration
  - **[Save Default]** - Save as default template
  - **[Restore from Defaults]** - Load default thresholds

### 5.3 Matrix Configuration UI

**Location:** Settings Page → System Configuration Tab → Matrix Display Configuration

**Features:**
- Station selection dropdown
- Extension tabs (3333, 4444)
- Checkbox list of metrics to display in matrix
- Drag-and-drop reordering of metrics
- Preview of matrix layout
- Action buttons:
  - **[Save]** - Save matrix configuration per station/extension
  - **[Save Default]** - Save as default template
  - **[Restore from Defaults]** - Load default matrix layout

---

## 6. UI Components

### 6.1 Dashboard (Main Page)

**Layout:** Header + Content Area

**Header Elements:**
- Title: "Real-Time Translation Pipeline Monitor"
- Subtitle: "12-Station Voice Processing System"
- Global Stats:
  - System Health indicator (green = online, red = offline)
  - Stations online count (e.g., "22 / 24")
  - Average Latency across all stations
  - Average MOS score
- System Menu (hamburger icon) with:
  - Settings
  - Export Data
  - View Logs
  - About

**Content Modes:**

**Mode 1: Grid View (Default)**
- 24 station cards (12 stations × 2 extensions)
- Each card shows:
  - Station name + extension label
  - Status indicator (green dot = online, red = offline, gray = no data)
  - Top 4 key metrics (configurable):
    - Latency (ms)
    - MOS Score
    - Buffer Level (%)
    - Packet Loss (%)
  - Color-coded background based on overall health
  - Click to open Detail View

**Mode 2: Detail View (Per Station)**
- Back button to return to grid
- Station header:
  - Station name + extension
  - Status indicator
  - Call ID (if active)
  - Timestamp of last update
- Detail level selector (1 / 2 / 3):
  - Level 1: Top 8 metrics
  - Level 2: Top 16 metrics (default)
  - Level 3: All applicable metrics
- Metric display:
  - Matrix layout (rows × columns)
  - Each cell shows metric name, value, unit
  - Color coding: green (optimal), yellow (warning), red (critical)
  - Sparkline trend (last 30 values)
- Knobs & Controls section:
  - Collapsible categories (AGC, AEC, NR, etc.)
  - Live value display
  - Edit button to open Settings
- AI Optimization panel:
  - Current performance summary
  - "Optimize for Latency" button
  - "Optimize for Quality" button
  - "Balanced Optimization" button
  - AI recommendations display
- Audio Visualization:
  - Live waveform (time domain)
  - FFT spectrum (frequency domain)
  - Spectrogram (time-frequency)

**Mode 3: Settings View**
- Tabs:
  - System Configuration (knobs, metrics, matrix)
  - User Preferences
  - Integration Settings
  - About / Help

### 6.2 Global AI Panel

**Location:** Dashboard Grid View (top of content area)

**Features:**
- System-wide health score (0-100)
- Problematic stations count (yellow/red status)
- **[Optimize All Stations]** button
  - Triggers optimization for all online stations
  - Progress indicator (station X of Y)
  - Shows AI recommendations summary
- Toggle: Auto-optimization enabled/disabled
  - If enabled, AI automatically optimizes stations when metrics degrade

### 6.3 Matrix Display Component

**Purpose:** Show metrics in a grid with color-coded health indicators

**Layout:**
- Rows: Metrics (configurable list)
- Columns: Can be configured as:
  - Extensions (3333, 4444)
  - Time periods (Last 1min, 5min, 15min)
  - Comparison modes (Current vs Optimal)

**Cell Content:**
- Metric value with unit
- Color background:
  - Green: Within optimal range
  - Yellow: Warning threshold exceeded
  - Red: Critical threshold exceeded
  - Gray: No data available
- Hover tooltip: Shows threshold values and trend

**Matrix Size:**
- Default: 16 metrics × 2 extensions
- Configurable: Up to 68 metrics × 4 columns

### 6.4 Audio Monitor Component

**Purpose:** Real-time audio visualization

**Visualizations:**
1. **Waveform (Time Domain)**
   - X-axis: Time (0-5 seconds)
   - Y-axis: Amplitude (-1.0 to 1.0)
   - Color: User-selectable (default: blue)
   - Updates: 60 FPS

2. **FFT Spectrum (Frequency Domain)**
   - X-axis: Frequency (0-8000 Hz)
   - Y-axis: Magnitude (dB)
   - Color: User-selectable (default: green)
   - Updates: 30 FPS

3. **Spectrogram (Time-Frequency)**
   - X-axis: Time (last 30 seconds)
   - Y-axis: Frequency (0-8000 Hz)
   - Color: Heat map (blue-green-yellow-red)
   - Updates: 10 FPS

**Data Source:**
- WebSocket connection to operational system (future)
- Currently: Mock data generated from metrics

---

## 7. Integration Points

### 7.1 Operational System Integration

**Base URL:** `https://20.170.155.53:8080`

**Endpoints Used:**
- `GET /api/snapshots` - Real-time data (polled every 150ms)
- `POST /api/config/knobs/:id` - Save knob configurations
- `POST /api/config/metrics` - Save metric thresholds
- `POST /api/optimize` - Request AI optimization

**Authentication:** (To be configured)
- Currently: No authentication
- Recommended: API key in header (`X-API-Key: <key>`)

**Network Requirements:**
- Dashboard → Operational System: HTTPS on port 8080
- Polling frequency: 150ms (6.67 requests/second)
- Expected response time: < 100ms
- Timeout: 5 seconds

**Error Handling:**
- Connection failures: Fall back to demo data
- Timeout: Show "Connection lost" indicator
- Invalid data: Log error, use last valid snapshot

### 7.2 Azure Deployment

**App Service Name:** `realtime-translation-1760218638`  
**Deployment URL:** `https://realtime-translation-1760218638.azurewebsites.net/3333_4444__Operational/Monitoring_Dashboard/`

**Deployment Method:**
- GitHub Actions CI/CD
- Automated deployment on push to `main` branch
- Docker containerization with Node.js 20-lts runtime

**Environment Variables:**
\`\`\`bash
NEXT_PUBLIC_API_URL=https://20.170.155.53:8080
NODE_ENV=production
\`\`\`

**Azure Configuration:**
- Platform: Node.js 20-lts
- Build Command: `npm run build`
- Start Command: `node server.js`
- Base Path: `/3333_4444__Operational/Monitoring_Dashboard/`
- Port: 3000 (internal), 443 (external HTTPS)

### 7.3 GitHub Repository

**Repository:** `sagivst/v0-backoffice-screen-development`  
**Branch:** `main`

**GitHub Actions Workflow:**
- Trigger: Push to `main` branch
- Steps:
  1. Checkout code
  2. Setup Node.js 20
  3. Install dependencies
  4. Run build
  5. Deploy to Azure App Service
- Secrets Required:
  - `AZURE_WEBAPP_PUBLISH_PROFILE` (Azure publish profile XML)

---

## 8. Deployment

### 8.1 Local Development

\`\`\`bash
# Clone repository
git clone https://github.com/sagivst/v0-backoffice-screen-development.git
cd v0-backoffice-screen-development

# Install dependencies
npm install

# Run development server
npm run dev

# Access at http://localhost:3000
\`\`\`

### 8.2 Production Build

\`\`\`bash
# Build for production
npm run build

# Start production server
npm start

# Access at http://localhost:3000
\`\`\`

### 8.3 Azure Deployment

**Prerequisites:**
- Azure account with App Service created
- GitHub repository connected to Azure
- Azure publish profile added to GitHub Secrets

**Deployment Steps:**
1. Push code to `main` branch
2. GitHub Actions automatically triggers
3. Code is built and deployed to Azure
4. App becomes available at production URL

**Monitoring Deployment:**
- GitHub Actions: Check workflow run status
- Azure Portal: Monitor App Service logs
- Health Check: Access deployment URL

---

## 9. Data Flow Summary

### Real-Time Monitoring Flow

\`\`\`
1. Dashboard polls /api/snapshots every 150ms
   ↓
2. Next.js API proxy forwards to operational system
   ↓
3. Operational system returns array of snapshots
   ↓
4. Dashboard transforms data to StationSnapshot format
   ↓
5. UI updates:
   - Grid view cards
   - Detail view metrics
   - Matrix display
   - Audio visualizations
   ↓
6. Repeat every 150ms
\`\`\`

### Configuration Save Flow

\`\`\`
1. User edits knob value in Settings UI
   ↓
2. Validation checks against valid range
   ↓
3. User clicks [Save] button
   ↓
4. POST request to /api/config/knobs/:stationId/:extension
   ↓
5. Operational system validates and saves
   ↓
6. Response confirms save success
   ↓
7. UI shows success notification
   ↓
8. Next snapshot poll reflects new knob values
\`\`\`

### AI Optimization Flow

\`\`\`
1. User clicks "Optimize for X" button
   ↓
2. Current snapshot + goal sent to /api/optimize
   ↓
3. Operational system's AI analyzes metrics
   ↓
4. AI generates knob adjustment recommendations
   ↓
5. Recommendations displayed to user
   ↓
6. User reviews and clicks "Apply"
   ↓
7. Knob configurations saved via /api/config/knobs
   ↓
8. Real-time monitoring shows metric improvements
\`\`\`

---

## 10. Development Team Checklist

### Backend API Requirements

- [ ] Implement `GET /api/snapshots` endpoint
  - [ ] Return array of StationSnapshot objects
  - [ ] Include all 68 metrics for applicable stations
  - [ ] Include current knob values
  - [ ] Respond within 100ms
  - [ ] Handle up to 10 concurrent requests

- [ ] Implement `POST /api/config/knobs/:stationId/:extension` endpoint
  - [ ] Validate knob values against ranges
  - [ ] Save to configuration database
  - [ ] Apply changes to running system
  - [ ] Return confirmation with timestamp

- [ ] Implement `GET /api/config/knobs/:stationId/:extension` endpoint
  - [ ] Return saved configuration
  - [ ] Include all 111 knobs

- [ ] Implement `POST /api/config/knobs/defaults` endpoint
  - [ ] Save as template
  - [ ] Generate template ID

- [ ] Implement `GET /api/config/knobs/defaults` endpoint
  - [ ] Return default template

- [ ] Implement `POST /api/config/metrics` endpoint
  - [ ] Save custom thresholds
  - [ ] Validate threshold values

- [ ] Implement `POST /api/optimize` endpoint
  - [ ] Analyze current snapshot
  - [ ] Generate AI recommendations
  - [ ] Return expected impact predictions

### Data Collection Requirements

- [ ] Ensure all 68 metrics are calculated and available
- [ ] Implement metric collection for all 12 stations × 2 extensions
- [ ] Ensure metric values are updated at least every 150ms
- [ ] Handle missing/unavailable metrics gracefully (return null or omit)

### Configuration Persistence

- [ ] Database schema for knob configurations
- [ ] Database schema for metric thresholds
- [ ] Database schema for matrix layouts
- [ ] Database schema for default templates
- [ ] Versioning for configuration changes
- [ ] Rollback capability for configurations

### Testing Requirements

- [ ] API endpoint testing (Postman/curl)
- [ ] Load testing (simulate 6.67 requests/second)
- [ ] Data validation testing
- [ ] Error handling testing
- [ ] Integration testing with dashboard

---

## Appendix A: Metric Keys Reference

**Complete list of 68 metric keys to be returned in `metrics` object:**

\`\`\`
buffer.total, buffer.input, buffer.output, buffer.jitter, buffer.underrun,
buffer.overrun, buffer.playback, buffer.record, buffer.network, buffer.processing,

latency.avg, latency.min, latency.max, latency.jitter, latency.variance,
latency.percentile95, latency.network, latency.processing,

packet.loss, packet.received, packet.sent, packet.dropped, packet.outOfOrder,
packet.duplicate, packet.retransmit, packet.corruption, packet.fragmentation,
packet.reassembly, packet.throughput, packet.bandwidth,

audioQuality.snr, audioQuality.mos, audioQuality.pesq, audioQuality.polqa,
audioQuality.thd, audioQuality.speechLevel, audioQuality.clipping,
audioQuality.noise, audioQuality.echo, audioQuality.distortion,

performance.cpu, performance.memory, performance.bandwidth, performance.throughput,
performance.threads, performance.queue, performance.cache, performance.io,

dsp.agc.currentGain, dsp.agc.compressionActive, dsp.agc.gainReduction,
dsp.aec.echoEstimate, dsp.aec.convergenceLevel, dsp.aec.doubletalkDetected,
dsp.nr.noiseEstimate, dsp.nr.speechProbability, dsp.nr.suppressionApplied,
dsp.compressor.gainReduction, dsp.compressor.active, dsp.limiter.gainReduction,
dsp.limiter.peakLevel, dsp.vad.active, dsp.vad.speechProbability,
dsp.eq.lowGainApplied, dsp.eq.midGainApplied, dsp.eq.highGainApplied,
dsp.deesser.active, dsp.deesser.gainReduction
\`\`\`

---

## Appendix B: Knob Keys Reference

**Complete list of 111 knob keys to be included in `knobs` object:**

\`\`\`
agc.enabled, agc.target_level_dbfs, agc.compression_ratio, agc.attack_time_ms,
agc.release_time_ms, agc.max_gain_db, agc.min_gain_db, agc.knee_width_db,

aec.enabled, aec.suppression_level_db, aec.tail_length_ms, aec.nlp_mode,
aec.adaptation_rate, aec.convergence_time_s, aec.doubletalk_threshold,

nr.enabled, nr.suppression_level_db, nr.spectral_floor_db, nr.frequency_smoothing,
nr.time_smoothing, nr.noise_gate_threshold_db,

compressor.enabled, compressor.threshold_dbfs, compressor.ratio,
compressor.attack_time_ms, compressor.release_time_ms, compressor.knee_width_db,
compressor.makeup_gain_db,

limiter.enabled, limiter.threshold_dbfs, limiter.attack_time_ms,
limiter.release_time_ms,

eq.enabled, eq.preset, eq.low_gain_db, eq.mid_gain_db, eq.high_gain_db,
eq.low_freq_hz, eq.mid_freq_hz, eq.high_freq_hz,

deesser.enabled, deesser.threshold_dbfs, deesser.frequency_hz, deesser.bandwidth_hz,

vad.enabled, vad.threshold_dbfs, vad.hangover_time_ms, vad.attack_time_ms,
vad.sensitivity,

codec.type, codec.bitrate_kbps, codec.sample_rate_hz, codec.complexity,
codec.fec_enabled, codec.dtx_enabled, codec.cbr_enabled, codec.packet_loss_expected,

buffer.jitter_min_ms, buffer.jitter_max_ms, buffer.jitter_target_ms,
buffer.jitter_adaptation_rate, buffer.input_size_ms, buffer.output_size_ms,
buffer.prefill_ms, buffer.underrun_recovery_ms, buffer.overrun_discard_threshold,
buffer.adaptive_sizing, buffer.conceal_lost_packets,

rtp.payload_type, rtp.ssrc, rtp.timestamp_rate_hz, rtp.packet_size_ms, rtp.dscp,
rtp.tos, rtp.max_packet_size, rtp.enable_rtcp, rtp.rtcp_interval_ms,
rtp.retransmit_enabled, rtp.max_retransmit_count, rtp.forward_error_correction,
rtp.redundancy_percent,

processing.chunk_size_ms, processing.overlap_percent, processing.window_type,
processing.fft_size, processing.hop_size_samples, processing.sample_format,
processing.channels, processing.interleaved, processing.normalization_enabled,
processing.normalization_target_dbfs, processing.highpass_cutoff_hz,
processing.lowpass_cutoff_hz, processing.dc_remove_enabled,
processing.pre_emphasis_enabled, processing.pre_emphasis_factor, processing.dither_enabled,
processing.dither_type, processing.thread_priority, processing.thread_affinity,
processing.max_concurrency, processing.pipeline_stages, processing.prefetch_enabled,
processing.cache_enabled, processing.cache_size_mb, processing.zero_copy_enabled,
processing.simd_enabled, processing.simd_type, processing.gpu_acceleration,
processing.gpu_device_id, processing.logging_level
\`\`\`

---

**End of Technical Specification Document**
