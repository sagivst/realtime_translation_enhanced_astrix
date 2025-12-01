# 75 Monitoring Parameters - Complete Reference

**System:** Real-Time Translation Monitoring System
**Version:** 1.0
**Date:** 2025-11-26
**Total Parameters:** 75

---

## Overview

This document defines all 75 parameters used in the monitoring system across 7 monitoring stations in the real-time translation pipeline.

### Parameter Categories:
- **Buffer Parameters:** 10 parameters
- **Latency Parameters:** 8 parameters
- **Packet Parameters:** 12 parameters
- **Audio Quality Parameters:** 10 parameters
- **Performance Parameters:** 8 parameters
- **DSP (Digital Signal Processing) Parameters:** 20 parameters
- **Custom Parameters:** 7 parameters

**Total:** 75 parameters

---

## 1. BUFFER PARAMETERS (10 total)

Buffer metrics track memory usage, queue depths, and audio buffering across the pipeline.

### buffer.total
- **ID:** `buffer.total`
- **Name:** Total Buffer Utilization
- **Unit:** `%`
- **Range:** 0-100
- **Description:** Overall buffer utilization percentage across all buffer types
- **Thresholds:**
  - Warning Low: 20%
  - Warning High: 80%
  - Critical Low: 10%
  - Critical High: 95%
- **Stations:** 1, 2, 3, 9, 10

### buffer.input
- **ID:** `buffer.input`
- **Name:** Input Buffer
- **Unit:** `%`
- **Range:** 0-100
- **Description:** Buffer for incoming audio/data before processing
- **Thresholds:**
  - Warning Low: 15%
  - Warning High: 85%
  - Critical Low: 5%
  - Critical High: 95%
- **Stations:** 1, 2, 3, 4

### buffer.output
- **ID:** `buffer.output`
- **Name:** Output Buffer
- **Unit:** `%`
- **Range:** 0-100
- **Description:** Buffer for outgoing audio/data after processing
- **Thresholds:**
  - Warning Low: 15%
  - Warning High: 85%
  - Critical Low: 5%
  - Critical High: 95%
- **Stations:** 2, 9, 10

### buffer.jitter
- **ID:** `buffer.jitter`
- **Name:** Jitter Buffer
- **Unit:** `ms`
- **Range:** 0-500
- **Description:** Buffer to smooth out packet arrival time variations
- **Thresholds:**
  - Warning Low: 20 ms
  - Warning High: 150 ms
  - Critical Low: 10 ms
  - Critical High: 300 ms
- **Stations:** 1, 3

### buffer.underrun
- **ID:** `buffer.underrun`
- **Name:** Buffer Underruns
- **Unit:** `count/s`
- **Range:** 0-100
- **Description:** Rate of buffer underrun events (buffer empty when data needed)
- **Thresholds:**
  - Warning Low: null
  - Warning High: 5
  - Critical Low: null
  - Critical High: 10
- **Stations:** 1, 2, 3

### buffer.overrun
- **ID:** `buffer.overrun`
- **Name:** Buffer Overruns
- **Unit:** `count/s`
- **Range:** 0-100
- **Description:** Rate of buffer overrun events (buffer full, data dropped)
- **Thresholds:**
  - Warning Low: null
  - Warning High: 5
  - Critical Low: null
  - Critical High: 10
- **Stations:** 1, 2, 3

### buffer.playback
- **ID:** `buffer.playback`
- **Name:** Playback Buffer
- **Unit:** `ms`
- **Range:** 0-500
- **Description:** Audio buffer for smooth playback
- **Thresholds:**
  - Warning Low: 30 ms
  - Warning High: 200 ms
  - Critical Low: 10 ms
  - Critical High: 400 ms
- **Stations:** 1, 10

### buffer.record
- **ID:** `buffer.record`
- **Name:** Recording Buffer
- **Unit:** `ms`
- **Range:** 0-500
- **Description:** Audio buffer for recording/capture
- **Thresholds:**
  - Warning Low: 30 ms
  - Warning High: 200 ms
  - Critical Low: 10 ms
  - Critical High: 400 ms
- **Stations:** 1, 2

### buffer.network
- **ID:** `buffer.network`
- **Name:** Network Buffer
- **Unit:** `KB`
- **Range:** 0-1024
- **Description:** Network socket send/receive buffer size
- **Thresholds:**
  - Warning Low: 64 KB
  - Warning High: 512 KB
  - Critical Low: 32 KB
  - Critical High: 896 KB
- **Stations:** 1, 2, 10

### buffer.processing
- **ID:** `buffer.processing`
- **Name:** Processing Buffer
- **Unit:** `ms`
- **Range:** 0-1000
- **Description:** Buffer for audio in processing queue
- **Thresholds:**
  - Warning Low: null
  - Warning High: 200 ms
  - Critical Low: null
  - Critical High: 500 ms
- **Stations:** 2, 3, 4, 9, 11

---

## 2. LATENCY PARAMETERS (8 total)

Latency metrics track delays across different stages of the pipeline.

### latency.avg
- **ID:** `latency.avg`
- **Name:** Average Latency
- **Unit:** `ms`
- **Range:** 0-2000
- **Description:** Average end-to-end latency
- **Thresholds:**
  - Warning Low: null
  - Warning High: 500 ms
  - Critical Low: null
  - Critical High: 1000 ms
- **Stations:** 1, 2, 3, 4, 9, 10, 11

### latency.min
- **ID:** `latency.min`
- **Name:** Minimum Latency
- **Unit:** `ms`
- **Range:** 0-2000
- **Description:** Best-case latency observed
- **Thresholds:**
  - Warning Low: null
  - Warning High: null
  - Critical Low: null
  - Critical High: null
- **Stations:** All

### latency.max
- **ID:** `latency.max`
- **Name:** Maximum Latency
- **Unit:** `ms`
- **Range:** 0-5000
- **Description:** Worst-case latency observed
- **Thresholds:**
  - Warning Low: null
  - Warning High: 1500 ms
  - Critical Low: null
  - Critical High: 3000 ms
- **Stations:** All

### latency.jitter
- **ID:** `latency.jitter`
- **Name:** Latency Jitter
- **Unit:** `ms`
- **Range:** 0-500
- **Description:** Variation in latency (standard deviation)
- **Thresholds:**
  - Warning Low: null
  - Warning High: 50 ms
  - Critical Low: null
  - Critical High: 100 ms
- **Stations:** 1, 2, 3, 10

### latency.variance
- **ID:** `latency.variance`
- **Name:** Latency Variance
- **Unit:** `ms²`
- **Range:** 0-10000
- **Description:** Statistical variance of latency measurements
- **Thresholds:**
  - Warning Low: null
  - Warning High: 2500
  - Critical Low: null
  - Critical High: 5000
- **Stations:** 1, 3

### latency.percentile95
- **ID:** `latency.percentile95`
- **Name:** 95th Percentile Latency
- **Unit:** `ms`
- **Range:** 0-3000
- **Description:** 95% of requests complete within this latency
- **Thresholds:**
  - Warning Low: null
  - Warning High: 800 ms
  - Critical Low: null
  - Critical High: 1500 ms
- **Stations:** 1, 2, 3, 9

### latency.network
- **ID:** `latency.network`
- **Name:** Network Latency
- **Unit:** `ms`
- **Range:** 0-1000
- **Description:** Network transmission delay only
- **Thresholds:**
  - Warning Low: null
  - Warning High: 100 ms
  - Critical Low: null
  - Critical High: 250 ms
- **Stations:** 1, 2, 10

### latency.processing
- **ID:** `latency.processing`
- **Name:** Processing Latency
- **Unit:** `ms`
- **Range:** 0-5000
- **Description:** Time spent in processing/computation
- **Thresholds:**
  - Warning Low: null
  - Warning High: 300 ms
  - Critical Low: null
  - Critical High: 1000 ms
- **Stations:** 2, 3, 4, 9, 10, 11

---

## 3. PACKET PARAMETERS (12 total)

Packet metrics track network transmission quality.

### packet.loss
- **ID:** `packet.loss`
- **Name:** Packet Loss Rate
- **Unit:** `%`
- **Range:** 0-100
- **Description:** Percentage of packets lost in transmission
- **Thresholds:**
  - Warning Low: null
  - Warning High: 1.0%
  - Critical Low: null
  - Critical High: 3.0%
- **Stations:** 1, 10

### packet.received
- **ID:** `packet.received`
- **Name:** Packets Received
- **Unit:** `packets/s`
- **Range:** 0-10000
- **Description:** Rate of packets received
- **Thresholds:**
  - Warning Low: 10
  - Warning High: null
  - Critical Low: 0
  - Critical High: null
- **Stations:** 1, 2

### packet.sent
- **ID:** `packet.sent`
- **Name:** Packets Sent
- **Unit:** `packets/s`
- **Range:** 0-10000
- **Description:** Rate of packets sent
- **Thresholds:**
  - Warning Low: 10
  - Warning High: null
  - Critical Low: 0
  - Critical High: null
- **Stations:** 2, 10

### packet.dropped
- **ID:** `packet.dropped`
- **Name:** Packets Dropped
- **Unit:** `packets/s`
- **Range:** 0-1000
- **Description:** Rate of packets dropped due to errors or congestion
- **Thresholds:**
  - Warning Low: null
  - Warning High: 5
  - Critical Low: null
  - Critical High: 20
- **Stations:** 1, 2, 10

### packet.outOfOrder
- **ID:** `packet.outOfOrder`
- **Name:** Out-of-Order Packets
- **Unit:** `packets/s`
- **Range:** 0-1000
- **Description:** Rate of packets arriving in wrong sequence
- **Thresholds:**
  - Warning Low: null
  - Warning High: 10
  - Critical Low: null
  - Critical High: 50
- **Stations:** 1

### packet.duplicate
- **ID:** `packet.duplicate`
- **Name:** Duplicate Packets
- **Unit:** `packets/s`
- **Range:** 0-1000
- **Description:** Rate of duplicate packet arrivals
- **Thresholds:**
  - Warning Low: null
  - Warning High: 5
  - Critical Low: null
  - Critical High: 20
- **Stations:** 1

### packet.retransmit
- **ID:** `packet.retransmit`
- **Name:** Retransmitted Packets
- **Unit:** `packets/s`
- **Range:** 0-1000
- **Description:** Rate of packet retransmissions
- **Thresholds:**
  - Warning Low: null
  - Warning High: 10
  - Critical Low: null
  - Critical High: 50
- **Stations:** 1, 10

### packet.corruption
- **ID:** `packet.corruption`
- **Name:** Corrupted Packets
- **Unit:** `packets/s`
- **Range:** 0-1000
- **Description:** Rate of packets with checksum errors
- **Thresholds:**
  - Warning Low: null
  - Warning High: 1
  - Critical Low: null
  - Critical High: 5
- **Stations:** 1, 2

### packet.fragmentation
- **ID:** `packet.fragmentation`
- **Name:** Fragmented Packets
- **Unit:** `%`
- **Range:** 0-100
- **Description:** Percentage of packets requiring fragmentation
- **Thresholds:**
  - Warning Low: null
  - Warning High: 20%
  - Critical Low: null
  - Critical High: 50%
- **Stations:** 1, 10

### packet.reassembly
- **ID:** `packet.reassembly`
- **Name:** Reassembly Failures
- **Unit:** `count/s`
- **Range:** 0-1000
- **Description:** Rate of packet reassembly failures
- **Thresholds:**
  - Warning Low: null
  - Warning High: 1
  - Critical Low: null
  - Critical High: 5
- **Stations:** 1

### packet.throughput
- **ID:** `packet.throughput`
- **Name:** Packet Throughput
- **Unit:** `packets/s`
- **Range:** 0-10000
- **Description:** Overall packet processing rate
- **Thresholds:**
  - Warning Low: 20
  - Warning High: null
  - Critical Low: 10
  - Critical High: null
- **Stations:** 1, 2, 10

### packet.bandwidth
- **ID:** `packet.bandwidth`
- **Name:** Bandwidth Usage
- **Unit:** `Mbps`
- **Range:** 0-1000
- **Description:** Network bandwidth consumed
- **Thresholds:**
  - Warning Low: null
  - Warning High: 50 Mbps
  - Critical Low: null
  - Critical High: 100 Mbps
- **Stations:** 1, 2, 3, 10

---

## 4. AUDIO QUALITY PARAMETERS (10 total)

Audio quality metrics assess the fidelity of voice/audio signals.

### audioQuality.snr
- **ID:** `audioQuality.snr`
- **Name:** Signal-to-Noise Ratio
- **Unit:** `dB`
- **Range:** 0-60
- **Description:** Ratio of signal power to background noise
- **Thresholds:**
  - Warning Low: 20 dB
  - Warning High: null
  - Critical Low: 15 dB
  - Critical High: null
- **Stations:** 1, 2, 3, 9, 11

### audioQuality.mos
- **ID:** `audioQuality.mos`
- **Name:** Mean Opinion Score
- **Unit:** `score`
- **Range:** 1.0-5.0
- **Description:** Subjective quality score (5=excellent, 1=bad)
- **Thresholds:**
  - Warning Low: 3.5
  - Warning High: null
  - Critical Low: 2.5
  - Critical High: null
- **Stations:** 1, 2, 9, 10

### audioQuality.pesq
- **ID:** `audioQuality.pesq`
- **Name:** PESQ Score
- **Unit:** `score`
- **Range:** -0.5 to 4.5
- **Description:** Perceptual Evaluation of Speech Quality
- **Thresholds:**
  - Warning Low: 3.0
  - Warning High: null
  - Critical Low: 2.0
  - Critical High: null
- **Stations:** 1, 3

### audioQuality.polqa
- **ID:** `audioQuality.polqa`
- **Name:** POLQA Score
- **Unit:** `score`
- **Range:** 1.0-5.0
- **Description:** Perceptual Objective Listening Quality Assessment
- **Thresholds:**
  - Warning Low: 3.5
  - Warning High: null
  - Critical Low: 2.5
  - Critical High: null
- **Stations:** 1, 3

### audioQuality.thd
- **ID:** `audioQuality.thd`
- **Name:** Total Harmonic Distortion
- **Unit:** `%`
- **Range:** 0-100
- **Description:** Measure of harmonic distortion in audio
- **Thresholds:**
  - Warning Low: null
  - Warning High: 1.0%
  - Critical Low: null
  - Critical High: 5.0%
- **Stations:** 1, 9, 10

### audioQuality.speechLevel
- **ID:** `audioQuality.speechLevel`
- **Name:** Speech Level
- **Unit:** `dBFS`
- **Range:** -90 to 0
- **Description:** Average speech signal level
- **Thresholds:**
  - Warning Low: -40 dBFS
  - Warning High: -6 dBFS
  - Critical Low: -60 dBFS
  - Critical High: -3 dBFS
- **Stations:** 1, 2, 3, 9, 11

### audioQuality.clipping
- **ID:** `audioQuality.clipping`
- **Name:** Clipping Detected
- **Unit:** `%`
- **Range:** 0-100
- **Description:** Percentage of samples exceeding maximum amplitude
- **Thresholds:**
  - Warning Low: null
  - Warning High: 0.1%
  - Critical Low: null
  - Critical High: 1.0%
- **Stations:** 2, 3, 9, 10

### audioQuality.noise
- **ID:** `audioQuality.noise`
- **Name:** Background Noise Level
- **Unit:** `dBFS`
- **Range:** -90 to 0
- **Description:** Level of background noise
- **Thresholds:**
  - Warning Low: null
  - Warning High: -40 dBFS
  - Critical Low: null
  - Critical High: -30 dBFS
- **Stations:** 1, 3, 11

### audioQuality.echo
- **ID:** `audioQuality.echo`
- **Name:** Echo Level
- **Unit:** `dBFS`
- **Range:** -90 to 0
- **Description:** Level of echo detected in audio
- **Thresholds:**
  - Warning Low: null
  - Warning High: -30 dBFS
  - Critical Low: null
  - Critical High: -20 dBFS
- **Stations:** 1, 9

### audioQuality.distortion
- **ID:** `audioQuality.distortion`
- **Name:** Audio Distortion
- **Unit:** `%`
- **Range:** 0-100
- **Description:** Overall audio distortion percentage
- **Thresholds:**
  - Warning Low: null
  - Warning High: 2.0%
  - Critical Low: null
  - Critical High: 10.0%
- **Stations:** 9, 10

---

## 5. PERFORMANCE PARAMETERS (8 total)

Performance metrics track system resource usage.

### performance.cpu
- **ID:** `performance.cpu`
- **Name:** CPU Usage
- **Unit:** `%`
- **Range:** 0-100
- **Description:** CPU utilization percentage
- **Thresholds:**
  - Warning Low: null
  - Warning High: 70%
  - Critical Low: null
  - Critical High: 90%
- **Stations:** All

### performance.memory
- **ID:** `performance.memory`
- **Name:** Memory Usage
- **Unit:** `%`
- **Range:** 0-100
- **Description:** RAM utilization percentage
- **Thresholds:**
  - Warning Low: null
  - Warning High: 75%
  - Critical Low: null
  - Critical High: 90%
- **Stations:** All

### performance.bandwidth
- **ID:** `performance.bandwidth`
- **Name:** Network Bandwidth
- **Unit:** `Mbps`
- **Range:** 0-1000
- **Description:** Network bandwidth consumed
- **Thresholds:**
  - Warning Low: null
  - Warning High: 50 Mbps
  - Critical Low: null
  - Critical High: 100 Mbps
- **Stations:** 1, 2, 3, 10

### performance.throughput
- **ID:** `performance.throughput`
- **Name:** Data Throughput
- **Unit:** `KB/s`
- **Range:** 0-10000
- **Description:** Data processing rate
- **Thresholds:**
  - Warning Low: 50 KB/s
  - Warning High: null
  - Critical Low: 10 KB/s
  - Critical High: null
- **Stations:** 1, 2, 3, 9, 10

### performance.threads
- **ID:** `performance.threads`
- **Name:** Active Threads
- **Unit:** `count`
- **Range:** 0-1000
- **Description:** Number of active processing threads
- **Thresholds:**
  - Warning Low: null
  - Warning High: 100
  - Critical Low: null
  - Critical High: 500
- **Stations:** 2, 3, 9

### performance.queue
- **ID:** `performance.queue`
- **Name:** Queue Depth
- **Unit:** `items`
- **Range:** 0-10000
- **Description:** Number of items waiting in processing queue
- **Thresholds:**
  - Warning Low: null
  - Warning High: 100
  - Critical Low: null
  - Critical High: 500
- **Stations:** 2, 3, 4, 9, 11

### performance.cache
- **ID:** `performance.cache`
- **Name:** Cache Hit Rate
- **Unit:** `%`
- **Range:** 0-100
- **Description:** Percentage of cache hits vs misses
- **Thresholds:**
  - Warning Low: 70%
  - Warning High: null
  - Critical Low: 50%
  - Critical High: null
- **Stations:** 3, 4

### performance.io
- **ID:** `performance.io`
- **Name:** I/O Wait Time
- **Unit:** `%`
- **Range:** 0-100
- **Description:** Percentage of time waiting for I/O operations
- **Thresholds:**
  - Warning Low: null
  - Warning High: 30%
  - Critical Low: null
  - Critical High: 50%
- **Stations:** 2, 3, 9

---

## 6. DSP PARAMETERS (20 total)

DSP (Digital Signal Processing) metrics track audio processing effects.

### DSP - AGC (Automatic Gain Control) - 5 parameters

#### dsp.agc.currentGain
- **ID:** `dsp.agc.currentGain`
- **Name:** AGC Current Gain
- **Unit:** `dB`
- **Range:** -30 to 40
- **Description:** Current gain applied by AGC
- **Thresholds:**
  - Warning Low: null
  - Warning High: 30 dB
  - Critical Low: null
  - Critical High: 38 dB
- **Stations:** 3, 9

#### dsp.agc.targetLevel
- **ID:** `dsp.agc.targetLevel`
- **Name:** AGC Target Level
- **Unit:** `dBFS`
- **Range:** -30 to -3
- **Description:** Target audio level for AGC
- **Thresholds:**
  - Warning Low: null
  - Warning High: null
  - Critical Low: null
  - Critical High: null
- **Stations:** 3, 9

#### dsp.agc.attackTime
- **ID:** `dsp.agc.attackTime`
- **Name:** AGC Attack Time
- **Unit:** `ms`
- **Range:** 1-100
- **Description:** Time for AGC to respond to signal increase
- **Stations:** 3, 9

#### dsp.agc.releaseTime
- **ID:** `dsp.agc.releaseTime`
- **Name:** AGC Release Time
- **Unit:** `ms`
- **Range:** 10-1000
- **Description:** Time for AGC to respond to signal decrease
- **Stations:** 3, 9

#### dsp.agc.maxGain
- **ID:** `dsp.agc.maxGain`
- **Name:** AGC Maximum Gain
- **Unit:** `dB`
- **Range:** 0-40
- **Description:** Maximum gain AGC is allowed to apply
- **Stations:** 3, 9

### DSP - AEC (Acoustic Echo Cancellation) - 4 parameters

#### dsp.aec.echoLevel
- **ID:** `dsp.aec.echoLevel`
- **Name:** Echo Level
- **Unit:** `dBFS`
- **Range:** -90 to 0
- **Description:** Current echo level detected
- **Thresholds:**
  - Warning Low: null
  - Warning High: -30 dBFS
  - Critical Low: null
  - Critical High: -20 dBFS
- **Stations:** 1, 9

#### dsp.aec.suppression
- **ID:** `dsp.aec.suppression`
- **Name:** Echo Suppression
- **Unit:** `dB`
- **Range:** 0-60
- **Description:** Amount of echo suppression applied
- **Stations:** 9

#### dsp.aec.tailLength
- **ID:** `dsp.aec.tailLength`
- **Name:** AEC Tail Length
- **Unit:** `ms`
- **Range:** 64-512
- **Description:** Echo tail length for cancellation
- **Stations:** 9

#### dsp.aec.convergenceTime
- **ID:** `dsp.aec.convergenceTime`
- **Name:** AEC Convergence Time
- **Unit:** `ms`
- **Range:** 0-5000
- **Description:** Time for AEC to converge on echo path
- **Stations:** 9

### DSP - Noise Reduction - 3 parameters

#### dsp.noiseReduction.noiseLevel
- **ID:** `dsp.noiseReduction.noiseLevel`
- **Name:** Detected Noise Level
- **Unit:** `dBFS`
- **Range:** -90 to 0
- **Description:** Current background noise level
- **Thresholds:**
  - Warning Low: null
  - Warning High: -40 dBFS
  - Critical Low: null
  - Critical High: -30 dBFS
- **Stations:** 1, 3, 11

#### dsp.noiseReduction.suppression
- **ID:** `dsp.noiseReduction.suppression`
- **Name:** Noise Suppression
- **Unit:** `dB`
- **Range:** 0-40
- **Description:** Amount of noise suppression applied
- **Stations:** 3

#### dsp.noiseReduction.snrImprovement
- **ID:** `dsp.noiseReduction.snrImprovement`
- **Name:** SNR Improvement
- **Unit:** `dB`
- **Range:** 0-30
- **Description:** SNR improvement from noise reduction
- **Stations:** 3

### DSP - Compressor - 3 parameters

#### dsp.compressor.reduction
- **ID:** `dsp.compressor.reduction`
- **Name:** Compressor Gain Reduction
- **Unit:** `dB`
- **Range:** 0-40
- **Description:** Current gain reduction applied by compressor
- **Thresholds:**
  - Warning Low: null
  - Warning High: 20 dB
  - Critical Low: null
  - Critical High: 35 dB
- **Stations:** 9

#### dsp.compressor.threshold
- **ID:** `dsp.compressor.threshold`
- **Name:** Compressor Threshold
- **Unit:** `dBFS`
- **Range:** -60 to 0
- **Description:** Level above which compression starts
- **Stations:** 9

#### dsp.compressor.ratio
- **ID:** `dsp.compressor.ratio`
- **Name:** Compression Ratio
- **Unit:** `ratio`
- **Range:** 1:1 to 20:1
- **Description:** Compression ratio applied
- **Stations:** 9

### DSP - Limiter - 2 parameters

#### dsp.limiter.reduction
- **ID:** `dsp.limiter.reduction`
- **Name:** Limiter Gain Reduction
- **Unit:** `dB`
- **Range:** 0-40
- **Description:** Current gain reduction applied by limiter
- **Thresholds:**
  - Warning Low: null
  - Warning High: 3 dB
  - Critical Low: null
  - Critical High: 10 dB
- **Stations:** 9, 10

#### dsp.limiter.threshold
- **ID:** `dsp.limiter.threshold`
- **Name:** Limiter Threshold
- **Unit:** `dBFS`
- **Range:** -12 to 0
- **Description:** Maximum allowed output level
- **Stations:** 9, 10

### DSP - Equalizer - 2 parameters

#### dsp.equalizer.response
- **ID:** `dsp.equalizer.response`
- **Name:** EQ Frequency Response
- **Unit:** `dB`
- **Range:** -20 to 20
- **Description:** Overall EQ adjustment applied
- **Stations:** 3, 9

#### dsp.equalizer.preset
- **ID:** `dsp.equalizer.preset`
- **Name:** EQ Preset
- **Unit:** `text`
- **Description:** Active equalizer preset name
- **Stations:** 3, 9

### DSP - Gate - 1 parameter

#### dsp.gate.attenuation
- **ID:** `dsp.gate.attenuation`
- **Name:** Gate Attenuation
- **Unit:** `dB`
- **Range:** 0-80
- **Description:** Signal attenuation when gate is closed
- **Stations:** 3, 9

---

## 7. CUSTOM PARAMETERS (7 total)

Custom metrics for application-specific monitoring.

### custom.state
- **ID:** `custom.state`
- **Name:** System State
- **Unit:** `text`
- **Description:** Current operational state (idle, active, processing, error)
- **Stations:** 2, 3, 4, 9, 11

### custom.successRate
- **ID:** `custom.successRate`
- **Name:** Success Rate
- **Unit:** `%`
- **Range:** 0-100
- **Description:** Percentage of successful operations
- **Thresholds:**
  - Warning Low: 95%
  - Warning High: null
  - Critical Low: 90%
  - Critical High: null
- **Stations:** 3, 4, 11

### custom.warningCount
- **ID:** `custom.warningCount`
- **Name:** Warning Count
- **Unit:** `count`
- **Range:** 0-10000
- **Description:** Number of warnings in current session
- **Thresholds:**
  - Warning Low: null
  - Warning High: 10
  - Critical Low: null
  - Critical High: 50
- **Stations:** All

### custom.criticalCount
- **ID:** `custom.criticalCount`
- **Name:** Critical Count
- **Unit:** `count`
- **Range:** 0-1000
- **Description:** Number of critical alerts in current session
- **Thresholds:**
  - Warning Low: null
  - Warning High: 1
  - Critical Low: null
  - Critical High: 5
- **Stations:** All

### custom.totalProcessed
- **ID:** `custom.totalProcessed`
- **Name:** Total Processed
- **Unit:** `count`
- **Range:** 0-1000000
- **Description:** Total number of items processed since start
- **Stations:** 3, 4, 9, 11

### custom.processingSpeed
- **ID:** `custom.processingSpeed`
- **Name:** Processing Speed
- **Unit:** `items/s`
- **Range:** 0-1000
- **Description:** Current processing rate
- **Thresholds:**
  - Warning Low: 5
  - Warning High: null
  - Critical Low: 1
  - Critical High: null
- **Stations:** 3, 4, 9, 11

### custom.lastActivity
- **ID:** `custom.lastActivity`
- **Name:** Last Activity
- **Unit:** `seconds ago`
- **Range:** 0-3600
- **Description:** Time since last activity
- **Thresholds:**
  - Warning Low: null
  - Warning High: 300 s
  - Critical Low: null
  - Critical High: 600 s
- **Stations:** 4, 11

---

## Parameter Distribution by Station

### STATION 1: Asterisk → Gateway (12 parameters)
- buffer.input, buffer.jitter
- latency.network, latency.jitter, latency.min, latency.max
- packet.received, packet.loss, packet.outOfOrder
- audioQuality.snr, audioQuality.mos
- performance.cpu

### STATION 2: Gateway → STTTTSserver (10 parameters)
- buffer.output, buffer.processing
- latency.processing
- audioQuality.mos, audioQuality.speechLevel, audioQuality.clipping
- performance.cpu, performance.bandwidth
- custom.state, custom.successRate

### STATION 3: STTTTSserver → Deepgram (14 parameters)
- buffer.processing
- latency.processing
- audioQuality.snr, audioQuality.speechLevel, audioQuality.clipping, audioQuality.noise
- dsp.agc.currentGain, dsp.noiseReduction.noiseLevel
- performance.cpu, performance.memory, performance.bandwidth
- custom.state, custom.successRate, custom.totalProcessed

### STATION 4: Deepgram Response (8 parameters)
- latency.processing
- custom.transcriptionLength, custom.wordCount, custom.confidence
- custom.successRate, custom.lastActivity
- performance.cpu, performance.queue

### STATION 9: STTTTSserver → Gateway (15 parameters)
- buffer.output
- latency.avg, latency.total
- audioQuality.mos, audioQuality.speechLevel, audioQuality.clipping, audioQuality.distortion
- dsp.agc.currentGain, dsp.compressor.reduction, dsp.limiter.reduction
- performance.cpu, performance.memory
- custom.state, custom.latencySyncApplied, custom.pipelineLatency

### STATION 10: Gateway → Asterisk (10 parameters)
- buffer.output
- packet.sent, packet.dropped
- latency.processing
- audioQuality.mos, audioQuality.thd
- performance.cpu, performance.bandwidth
- custom.framesSent, custom.framesDropped

### STATION 11: STTTTSserver → Hume Branch (10 parameters)
- buffer.processing
- latency.processing, latency.websocket
- audioQuality.snr, audioQuality.speechLevel
- custom.queueDepth, custom.websocketConnected, custom.successRate
- custom.lastActivity
- performance.cpu

---

## Parameter Access Patterns

### Real-Time Metrics (Updated every 100-500ms)
- All buffer metrics
- All latency metrics
- audioQuality.snr, audioQuality.peakLevel, audioQuality.rmsLevel
- All DSP metrics
- performance.cpu, performance.memory

### Calculated Metrics (Updated every 1-5 seconds)
- packet.loss, packet.throughput
- audioQuality.mos, audioQuality.pesq
- custom.successRate, custom.processingSpeed

### Accumulated Metrics (Counters)
- packet.received, packet.sent, packet.dropped
- buffer.underrun, buffer.overrun
- custom.totalProcessed, custom.warningCount, custom.criticalCount

---

## Data Types

### Numeric Ranges
- **Percentage:** 0-100%
- **dB:** -90 to 0 dBFS (or 0-60 dB for gains)
- **Time:** 0-5000 ms
- **Count:** 0-unlimited
- **Rate:** items/second or packets/second

### Text/Enum Values
- **State:** idle, active, processing, error, disconnected
- **Codec:** pcm_s16le, ulaw, alaw, g722, opus
- **Protocol:** RTP, PCM, WebSocket

### Boolean
- Clipping detected (yes/no)
- Socket connected (yes/no)
- Alert triggered (yes/no)

---

## Configuration Storage

Each parameter's configuration is stored in:
```
/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/config/parameters/{category}/{parameter}.json
```

Example: `config/parameters/buffer/total.json`

---

## Monitoring Frequency

- **High-frequency (100ms):** Buffer, latency, audio levels
- **Medium-frequency (500ms):** Packet metrics, performance
- **Low-frequency (1-5s):** Quality scores, success rates
- **On-demand:** Configuration changes, alerts

---

## Alert Levels

1. **Normal:** Value within recommended range (green)
2. **Warning:** Value outside recommended but not critical (yellow)
3. **Critical:** Value at dangerous level, requires action (red)

---

## End of Document

**Total Parameters:** 75
**Categories:** 7
**Monitoring Stations:** 7
**Update Frequency:** 100ms - 5s depending on parameter type
