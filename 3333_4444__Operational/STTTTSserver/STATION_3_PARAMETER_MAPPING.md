# Station 3 Parameter Mapping
## STTTTSserver → Deepgram Monitoring

Based on **75_MONITORING_PARAMETERS.md** requirements for Station 3.

### Matrix to Parameter Mapping

| Matrix | Parameter Name | Unit | Description | Valid Range |
|--------|---------------|------|-------------|-------------|
| **matrix_1_knob** | `audioQuality.speechLevel` | dBFS | RMS speech signal level | ±75 |
| **matrix_2_knob** | `audioQuality.speechLevel` (peak) | dBFS | Peak speech signal level | ±75 |
| **matrix_3_knob** | `audioQuality.snr` | dB | Signal-to-Noise Ratio | ±75 |
| **matrix_4_knob** | `audioQuality.clipping` | % | Clipping detection percentage | ±75 |
| **matrix_5_knob** | `custom.successRate` | % | Voice activity/success rate | ±75 |
| **matrix_6_knob** | `audioQuality.noise` | dBFS | Background noise level | ±75 |
| **matrix_7_knob** | `performance.cpu` | % | CPU usage estimate | ±75 |
| **matrix_8_knob** | `performance.memory` | % | Memory usage estimate | ±75 |
| **matrix_9_knob** | `dsp.agc.currentGain` | dB | AGC gain proxy (spectral centroid) | ±75 |
| **matrix_10_knob** | `dsp.noiseReduction.noiseLevel` | dBFS | Noise reduction level proxy | ±75 |
| **matrix_11_knob** | `latency.processing` | ms | Processing latency proxy | ±75 |
| **matrix_12_knob** | `performance.bandwidth` | Mbps | Bandwidth usage proxy | ±75 |
| **matrix_13_knob** | `custom.totalProcessed` | count | Total processed items (energy) | ±75 |
| **matrix_14_knob** | `custom.successRate` | % | Processing success rate | ±75 |
| **matrix_15_knob** | `custom.processingSpeed` | items/s | Processing speed (dynamics) | ±75 |
| **matrix_16_knob** | `performance.queue` | items | Queue depth proxy | ±75 |
| **matrix_17_knob** | `buffer.processing` | % | Buffer utilization | ±75 |
| **matrix_18_knob** | `latency.jitter` | ms | Latency jitter proxy | ±75 |

### Main Control Knobs

| Knob | Description | Valid Range |
|------|-------------|-------------|
| **main_volume** | Overall audio level | ±150 |
| **balance** | L/R balance | ±150 |
| **treble** | High frequency adjustment | ±150 |
| **bass** | Low frequency adjustment | ±150 |
| **gain** | Input gain | ±150 |
| **compression** | Compression amount | ±150 |
| **noise_gate** | Gate threshold | ±150 |
| **reverb** | Reverb amount | ±150 |

### Station 3 Required Parameters (Per Documentation)

According to **75_MONITORING_PARAMETERS.md**, Station 3 should monitor:

1. ✅ `buffer.processing` → matrix_17
2. ✅ `latency.processing` → matrix_11
3. ✅ `audioQuality.snr` → matrix_3
4. ✅ `audioQuality.speechLevel` → matrix_1 & matrix_2
5. ✅ `audioQuality.clipping` → matrix_4
6. ✅ `audioQuality.noise` → matrix_6
7. ✅ `dsp.agc.currentGain` → matrix_9
8. ✅ `dsp.noiseReduction.noiseLevel` → matrix_10
9. ✅ `performance.cpu` → matrix_7
10. ✅ `performance.memory` → matrix_8
11. ✅ `performance.bandwidth` → matrix_12
12. ✅ `custom.state` → (handled separately as string)
13. ✅ `custom.successRate` → matrix_5 & matrix_14
14. ✅ `custom.totalProcessed` → matrix_13

### Implementation Notes

- All matrix values are **clamped to ±75 range** as per documentation
- All main control knobs are **clamped to ±150 range**
- Some parameters use proxy measurements (e.g., spectral features as DSP proxies)
- Real-time audio processing uses `onAudioChunk` method
- Transcript processing uses `onTranscript` method
- Both methods now have consistent parameter naming

### Value Clamping Applied

```javascript
// All matrix values use this pattern:
Math.round(Math.min(75, Math.max(-75, value)))

// All main knobs use this pattern:
Math.round(Math.min(150, Math.max(-150, value)))
```

### Status

- ✅ Range clamping implemented
- ✅ Parameter names documented
- ✅ Comments added to code
- ✅ Backup created: `station3-handler.js.backup-20251225-clamping`

Last Updated: 2025-12-25