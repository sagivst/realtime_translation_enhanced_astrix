# Station Relevancy Mapping for Dashboard Configuration

## Overview
This document defines which metrics and knobs are RELEVANT for each station.
The UnifiedStationCollector collects ALL 75 metrics and ~100 knobs from EVERY station.
Dashboard settings use this mapping to filter what's displayed/controllable per station.

**Total Available**: 75 metrics + ~100 knobs
**Collection Strategy**: COLLECT ALL, FILTER IN DASHBOARD

---

## STATION 1 - Asterisk PBX
**Purpose**: SIP/VoIP call handling and routing

### Relevant Metrics (15)
```javascript
// Network & Call Quality
- packet.loss
- packet.received
- packet.sent
- packet.dropped
- latency.avg
- latency.jitter

// Audio Processing
- audioQuality.mos
- audioQuality.echo
- audioQuality.noise

// System Performance
- performance.cpu
- performance.memory
- performance.threads

// Custom Status
- custom.state
- custom.successRate
- custom.totalProcessed
```

### Relevant Knobs (10)
```javascript
// Asterisk-specific
- asterisk.echo_cancel
- asterisk.silence_threshold
- asterisk.talk_detect
- asterisk.rx_gain
- asterisk.tx_gain
- asterisk.jitter_buffer
- asterisk.dtmf_mode
- asterisk.nat_mode
- asterisk.call_limit
- asterisk.registration_timeout
```

---

## STATION 2 - Gateway RX (Caller)
**Purpose**: WebSocket bridge receiving audio from Asterisk

### Relevant Metrics (18)
```javascript
// Buffer Management
- buffer.total
- buffer.input
- buffer.jitter
- buffer.underrun

// Network Performance
- packet.received
- packet.throughput
- packet.bandwidth
- latency.network

// Audio Quality
- audioQuality.snr
- audioQuality.clipping
- audioQuality.noise

// Performance
- performance.bandwidth
- performance.throughput
- performance.io

// Custom
- custom.state
- custom.successRate
- custom.processingSpeed
```

### Relevant Knobs (8)
```javascript
// Gateway Control
- gateway.ws_reconnect_interval_ms
- gateway.ws_max_reconnects
- gateway.audio_chunk_size
- gateway.sample_rate
- gateway.channels
- gateway.encoding
- gateway.stream_timeout_ms
- gateway.debug_mode
```

---

## STATION 3 - STTTTSserver RX
**Purpose**: Voice monitoring and enhancement before Deepgram

### Relevant Metrics (22) - MOST CRITICAL STATION
```javascript
// DSP Processing (ALL 20 DSP metrics are relevant)
- dsp.agc.currentGain
- dsp.agc.targetLevel
- dsp.aec.echoLevel
- dsp.aec.suppression
- dsp.noiseReduction.noiseLevel
- dsp.noiseReduction.snrImprovement
// ... and 14 more DSP metrics

// Audio Quality
- audioQuality.snr
- audioQuality.speechLevel
```

### Relevant Knobs (20 - All DSP knobs)
```javascript
// Complete DSP Control Suite
- agc.enabled
- agc.target_level_dbfs
- agc.compression_ratio
- agc.attack_time_ms
- agc.release_time_ms
- agc.max_gain_db
- aec.enabled
- aec.suppression_level_db
- aec.tail_length_ms
- aec.nlp_mode
- nr.enabled
- nr.suppression_level_db
- nr.spectral_floor_db
- compressor.enabled
- compressor.threshold_dbfs
- compressor.ratio
- limiter.enabled
- limiter.threshold_dbfs
- eq.enabled
- eq.preset
```

---

## STATION 4 - Deepgram STT
**Purpose**: Speech-to-text conversion

### Relevant Metrics (12)
```javascript
// Processing Performance
- latency.avg
- latency.percentile95
- latency.processing

// Network
- packet.sent
- packet.received
- packet.bandwidth

// Custom Tracking
- custom.successRate
- custom.warningCount
- custom.criticalCount
- custom.totalProcessed

// Performance
- performance.cpu
- performance.memory
```

### Relevant Knobs (12)
```javascript
// Deepgram Configuration
- deepgram.model
- deepgram.language
- deepgram.punctuate
- deepgram.profanity_filter
- deepgram.redact
- deepgram.diarize
- deepgram.smart_format
- deepgram.interim_results
- deepgram.endpointing
- deepgram.vad_turnoff
- deepgram.keywords
- deepgram.search
```

---

## STATION 5 - Translation
**Purpose**: Language translation service

### Relevant Metrics (8)
```javascript
// Processing Metrics
- latency.avg
- latency.processing

// Success Tracking
- custom.successRate
- custom.totalProcessed
- custom.errorCount

// System
- performance.cpu
- performance.memory
- performance.cache
```

### Relevant Knobs (8)
```javascript
// Translation Settings
- translation.source_lang
- translation.target_lang
- translation.formality
- translation.preserve_formatting
- translation.glossary_id
- translation.max_length
- translation.timeout_ms
- translation.cache_enabled
```

---

## STATION 6 - TTS (ElevenLabs)
**Purpose**: Text-to-speech synthesis

### Relevant Metrics (10)
```javascript
// Audio Generation
- audioQuality.mos
- audioQuality.speechLevel
- audioQuality.distortion

// Processing
- latency.avg
- latency.processing

// Buffers
- buffer.output
- buffer.playback

// Performance
- performance.cpu
- performance.memory
- performance.bandwidth
```

### Relevant Knobs (10)
```javascript
// TTS Configuration
- tts.voice_id
- tts.stability
- tts.similarity_boost
- tts.style
- tts.use_speaker_boost
- tts.model
- tts.optimize_streaming_latency
- tts.output_format
- tts.chunk_length_schedule
- tts.voice_cache
```

---

## STATION 7 - Gateway TX (Callee)
**Purpose**: WebSocket bridge sending audio to callee

### Relevant Metrics (18)
```javascript
// Same as STATION 2 (Gateway RX)
// Buffer, Network, Audio, Performance metrics
```

### Relevant Knobs (8)
```javascript
// Same Gateway control knobs as Station 2
```

---

## STATION 8 - Asterisk Return
**Purpose**: Audio return path to Asterisk

### Relevant Metrics (15)
```javascript
// Same as STATION 1 (Asterisk)
```

### Relevant Knobs (10)
```javascript
// Same Asterisk knobs as Station 1
```

---

## STATION 9 - STTTTSserver TX
**Purpose**: Final audio processing before transmission

### Relevant Metrics (22)
```javascript
// Same as STATION 3 (full DSP monitoring)
```

### Relevant Knobs (20)
```javascript
// Same DSP control suite as Station 3
```

---

## STATION 10 - Gateway Return
**Purpose**: Final gateway before caller

### Relevant Metrics (18)
```javascript
// Same as STATION 2/7 (Gateway metrics)
```

### Relevant Knobs (8)
```javascript
// Same Gateway control knobs
```

---

## STATION 11 - Hume EVI (Optional)
**Purpose**: Emotional AI voice interface

### Relevant Metrics (12)
```javascript
// AI Processing
- latency.avg
- latency.processing
- latency.percentile95

// Audio
- audioQuality.speechLevel
- audioQuality.distortion

// Performance
- performance.cpu
- performance.memory
- performance.throughput

// Custom
- custom.state
- custom.successRate
- custom.totalProcessed
- custom.errorCount
```

### Relevant Knobs (8)
```javascript
// Hume Configuration
- hume.system_prompt
- hume.temperature
- hume.max_tokens
- hume.emotion_model
- hume.voice_config
- hume.interrupt_sensitivity
- hume.turn_taking_mode
- hume.prosody_model
```

---

## Global Knobs (Apply to ALL Stations)

### System Control (10 knobs)
```javascript
// These affect all stations
- system.thread_priority
- system.cpu_affinity
- system.memory_limit_mb
- system.gc_interval_ms
- system.log_level
- system.metrics_interval_ms
- system.health_check_interval_ms
- system.restart_on_error
- system.max_restart_attempts
- system.watchdog_timeout_ms
```

### Buffer Defaults (15 knobs)
```javascript
// Can be overridden per station but apply globally
- buffer.size_ms
- buffer.jitter_size_ms
- buffer.playout_delay_ms
// ... etc
```

### Network Defaults (12 knobs)
```javascript
// Base network settings
- network.codec
- network.bitrate_kbps
- network.packet_size_ms
// ... etc
```

---

## Dashboard Configuration Guide

### Display Filtering
1. Dashboard receives ALL 75 metrics from each station
2. Use this mapping to show only relevant metrics per station view
3. Hide irrelevant metrics (will contain noise/defaults)
4. Group by category (DSP, Buffer, Network, etc.)

### Knob Control Panel
1. Show only relevant knobs per station
2. Gray out or hide non-applicable knobs
3. Provide tooltips explaining each knob's purpose
4. Show current value vs default value

### Example Dashboard Settings Structure
```javascript
dashboardConfig = {
  stations: {
    'STATION_3': {
      displayMetrics: ['dsp.*', 'audioQuality.snr', 'audioQuality.speechLevel'],
      controlKnobs: ['agc.*', 'aec.*', 'nr.*', 'compressor.*', 'limiter.*', 'eq.*'],
      criticalAlerts: ['dsp.agc.currentGain', 'audioQuality.snr']
    },
    'STATION_4': {
      displayMetrics: ['latency.*', 'packet.*', 'custom.*', 'performance.*'],
      controlKnobs: ['deepgram.*'],
      criticalAlerts: ['latency.avg', 'custom.errorCount']
    }
    // ... etc for all stations
  },
  globalKnobs: ['system.*', 'buffer.*', 'network.*']
}
```

---

## Implementation Notes

1. **UnifiedStationCollector** collects EVERYTHING
2. **Monitoring Server** stores EVERYTHING
3. **Dashboard** filters based on this mapping
4. **Optimization AI** considers relevancy when tuning

This approach provides:
- Complete data collection (no missing metrics)
- Flexible dashboard configuration
- Historical data for all parameters
- Ability to discover correlations across stations
- Simple collector implementation (no complex filtering logic)

---

**Last Updated**: 2025-12-01
**Version**: 1.0.0