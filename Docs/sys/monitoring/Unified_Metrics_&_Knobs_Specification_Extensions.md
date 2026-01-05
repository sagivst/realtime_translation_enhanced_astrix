# Unified Metrics & Knobs Specification - Extensions

## Extension to: Unified Audio Monitoring & Calibration Specification
### Added: FFT Spectral Analysis & Active Audio Processing Controls
### Date: 2025-12-30
### Status: Proposed Extensions

---

## 33. FFT-Based Spectral Analysis Metrics (NEW)

These metrics require FFT (Fast Fourier Transform) implementation for frequency domain analysis.

### 33.1 Core Spectral Metrics

#### Calculated via FFT Analysis:
- `spectral_centroid` - Center of mass of spectrum (Hz) - Indicates brightness/dullness
- `spectral_rolloff` - Frequency below which 85% of energy is contained (Hz)
- `spectral_flux` - Rate of spectral change between consecutive frames
- `spectral_flatness` - Measure of noise-like vs tonal characteristics (0-1)
- `spectral_bandwidth` - Width of the spectrum around centroid (Hz)
- `dominant_frequency` - Strongest frequency component (Hz)
- `harmonic_energy_ratio` - Ratio of harmonic to total energy (0-1)

### 33.2 Band Energy Analysis
- `low_band_energy` - Energy in 0-500 Hz range
- `mid_band_energy` - Energy in 500-2000 Hz range
- `high_band_energy` - Energy in 2000-8000 Hz range
- `band_energy_ratios` - Relative distribution across bands

### 33.3 Spectral Problem Detection
- `hum_detection` - Boolean flag for 50/60 Hz electrical interference
- `hiss_detection` - Boolean flag for high-frequency noise
- `spectral_anomaly_score` - Overall spectral irregularity metric

### 33.4 Per-Spectral-Metric Knobs
Each spectral metric generates standard knobs:
- `{metric}_min` / `{metric}_max`
- `{metric}_optimal_min` / `{metric}_optimal_max`
- `{metric}_warn_threshold` / `{metric}_error_threshold`
- `{metric}_smoothing_window`
- `{metric}_calculation_interval` - How often to calculate (performance)

---

## 34. Active Audio Processing Control Knobs (NEW)

These knobs actively modify the audio stream in real-time, unlike monitoring knobs which only observe.

### 34.1 Dynamic Range Control

#### Compression Controls:
- `compression_enabled` - Boolean - Enable compression
- `compression_threshold` - dBFS - Level above which compression starts (-60 to 0)
- `compression_ratio` - Ratio - Compression ratio (1:1 to 20:1)
- `compression_attack` - ms - How fast compression engages (0.1-100)
- `compression_release` - ms - How fast compression releases (10-1000)
- `compression_knee` - dB - Soft knee width (0-10)
- `compression_makeup_gain` - dB - Output gain compensation (0-30)
- `compression_lookahead` - ms - Lookahead buffer (0-10)

#### Limiter Controls:
- `limiter_enabled` - Boolean - Enable brick-wall limiting
- `limiter_threshold` - dBFS - Absolute maximum level (-10 to 0)
- `limiter_release` - ms - Release time (1-100)
- `limiter_lookahead` - ms - Lookahead for transparency (0-5)

### 34.2 Noise Control

#### Noise Gate:
- `noise_gate_enabled` - Boolean - Enable noise gate
- `noise_gate_threshold` - dBFS - Cut audio below this level (-80 to 0)
- `noise_gate_attack` - ms - Gate opening speed (0.1-10)
- `noise_gate_hold` - ms - Minimum open time (0-100)
- `noise_gate_release` - ms - Gate closing speed (10-500)
- `noise_gate_range` - dB - Maximum attenuation (0-60)
- `noise_gate_hysteresis` - dB - Prevent chattering (0-10)

#### Noise Reduction:
- `noise_reduction_enabled` - Boolean - Enable noise reduction
- `noise_reduction_strength` - % - Reduction amount (0-100)
- `noise_learning_rate` - Rate - Noise profile adaptation (0-1)
- `preserve_voice_threshold` - dBFS - Always preserve above (-60 to 0)
- `noise_floor_tracking` - Boolean - Adaptive noise floor
- `spectral_subtraction_factor` - Factor - Spectral subtraction (0-2)

### 34.3 Automatic Gain Control (AGC)

- `agc_enabled` - Boolean - Enable AGC
- `agc_target_level` - dBFS - Target output level (-40 to 0)
- `agc_max_gain` - dB - Maximum gain allowed (0-60)
- `agc_max_attenuation` - dB - Maximum reduction (0-30)
- `agc_attack_time` - ms - Gain increase speed (1-100)
- `agc_release_time` - ms - Gain decrease speed (100-5000)
- `agc_hold_time` - ms - Hold before adjusting (0-1000)
- `agc_gating_threshold` - dBFS - Don't adjust below (-60 to -20)

### 34.4 Equalization

#### Three-Band EQ:
- `eq_enabled` - Boolean - Enable equalizer
- `eq_low_shelf_freq` - Hz - Low shelf frequency (20-500)
- `eq_low_shelf_gain` - dB - Low frequency boost/cut (-20 to +20)
- `eq_low_shelf_q` - Q factor - Shelf slope (0.1-2)
- `eq_mid_freq` - Hz - Mid frequency center (200-5000)
- `eq_mid_gain` - dB - Mid frequency boost/cut (-20 to +20)
- `eq_mid_q` - Q factor - Bandwidth (0.1-10)
- `eq_high_shelf_freq` - Hz - High shelf frequency (2000-20000)
- `eq_high_shelf_gain` - dB - High frequency boost/cut (-20 to +20)
- `eq_high_shelf_q` - Q factor - Shelf slope (0.1-2)

#### Parametric EQ (Additional bands):
- `eq_band_{n}_enabled` - Boolean - Enable band n (1-8)
- `eq_band_{n}_freq` - Hz - Center frequency
- `eq_band_{n}_gain` - dB - Boost/cut
- `eq_band_{n}_q` - Q factor - Bandwidth
- `eq_band_{n}_type` - Type - peak/notch/highpass/lowpass

### 34.5 Voice Enhancement

#### Clarity Enhancement:
- `voice_enhancement_enabled` - Boolean - Enable enhancement
- `voice_enhancement_mode` - Enum - off/mild/moderate/aggressive/auto
- `voice_frequency_boost` - dB - 2-4kHz presence boost (0-12)
- `consonant_enhancement` - % - Consonant clarity (0-100)
- `formant_correction` - % - Formant enhancement (0-100)

#### De-essing:
- `de_esser_enabled` - Boolean - Enable de-esser
- `de_esser_threshold` - dBFS - Sibilance threshold (-40 to 0)
- `de_esser_frequency` - Hz - Target frequency (4000-10000)
- `de_esser_bandwidth` - Hz - Detection bandwidth (1000-5000)
- `de_esser_reduction` - % - Sibilance reduction (0-100)

### 34.6 Echo & Feedback Control

#### Acoustic Echo Cancellation (AEC):
- `aec_enabled` - Boolean - Enable AEC
- `aec_tail_length` - ms - Echo tail to model (16-512)
- `aec_convergence_speed` - Speed - Adaptation rate (0-1)
- `aec_suppression_level` - dB - Residual suppression (0-30)
- `aec_comfort_noise` - Boolean - Add comfort noise
- `aec_nonlinear_processing` - Boolean - Remove residual echo

#### Feedback Suppression:
- `feedback_suppression_enabled` - Boolean - Enable suppression
- `feedback_detection_threshold` - dB - Detection sensitivity (0-30)
- `feedback_notch_q` - Q factor - Notch filter sharpness (5-50)
- `feedback_max_notches` - Count - Maximum notches (1-10)
- `feedback_reaction_time` - ms - Detection speed (10-200)
- `feedback_release_time` - s - Notch removal time (1-60)

### 34.7 Ducking & Priority Mixing

#### Auto-Ducking:
- `ducking_enabled` - Boolean - Enable ducking
- `ducking_threshold` - dBFS - Trigger level (-60 to 0)
- `ducking_ratio` - Ratio - Duck to this level (0-1)
- `ducking_attack` - ms - Duck speed (1-100)
- `ducking_release` - ms - Return speed (10-1000)
- `ducking_hold` - ms - Hold ducked (0-500)

#### Priority Control:
- `priority_mode` - Enum - off/voice_priority/music_priority/announcement
- `voice_priority_boost` - dB - Voice boost over other (0-20)
- `music_background_level` - dBFS - Music level (-60 to 0)
- `announcement_override` - Boolean - Announcements override all

### 34.8 STT/TTS Optimization

#### STT Pre-processing:
- `stt_pre_emphasis` - Coefficient - High-freq boost (0-1)
- `stt_normalize_loudness` - Boolean - Normalize before STT
- `stt_target_sample_rate` - Hz - Resample to (8000-48000)
- `stt_remove_silence` - Boolean - Strip silence
- `stt_confidence_boost` - Factor - Confidence multiplier (0.5-2)
- `stt_spectral_shaping` - Boolean - Optimize spectrum for STT

#### TTS Post-processing:
- `tts_warmth` - Amount - Tonal warmth (-100 to +100)
- `tts_presence` - Amount - Clarity/presence (-100 to +100)
- `tts_smooth_transitions` - Boolean - Smooth chunk boundaries
- `tts_pitch_correction` - Semitones - Pitch shift (-12 to +12)
- `tts_speed_factor` - Factor - Playback speed (0.5-2.0)
- `tts_dynamic_enhancement` - Boolean - Enhance dynamics

### 34.9 Safety & Emergency Controls

#### Emergency Overrides:
- `emergency_mute` - Boolean - Instant mute all
- `emergency_boost` - Boolean - +20dB emergency boost
- `anti_feedback_panic` - Boolean - Kill problem frequencies
- `reset_all_processing` - Boolean - Bypass all processing

#### Safety Limits:
- `max_output_level` - dBFS - Absolute maximum (-10 to 0)
- `min_output_level` - dBFS - Absolute minimum (-80 to -40)
- `clipping_protection` - Boolean - Hard limit at 0dB
- `hearing_protection` - Boolean - Limit sudden changes
- `max_gain_change_rate` - dB/s - Prevent jumps (1-100)

### 34.10 AI-Driven Adaptive Control

#### AI Optimization:
- `ai_auto_tune` - Boolean - AI adjusts parameters
- `ai_learning_mode` - Enum - off/passive/active/aggressive
- `ai_confidence_threshold` - Threshold - Min confidence (0-1)
- `ai_max_adjustment` - % - Max change per step (0-100)
- `ai_rollback_on_error` - Boolean - Revert if worse
- `ai_optimization_interval` - s - Adjustment frequency (1-60)

#### Pattern Learning:
- `learn_user_preferences` - Boolean - Learn from manual adjustments
- `pattern_memory_days` - Days - History retention (1-365)
- `time_based_profiles` - Boolean - Time-of-day profiles
- `speaker_adaptive` - Boolean - Per-speaker settings
- `environment_adaptive` - Boolean - Adapt to acoustic environment

---

## 35. Implementation Priority

### Phase 1 - Core FFT Metrics (Essential)
- Spectral centroid, rolloff, flux
- Band energies
- Hum/hiss detection

### Phase 2 - Basic Processing (High Value)
- AGC
- Noise gate
- Basic compression
- Simple 3-band EQ

### Phase 3 - Advanced Processing (Nice to Have)
- AEC
- Feedback suppression
- De-essing
- Multi-band compression

### Phase 4 - AI/Adaptive (Future)
- AI auto-tuning
- Pattern learning
- Speaker profiles

---

## 36. Performance Considerations

### Processing Overhead:
- FFT Analysis: ~5-10ms per frame
- Basic Processing (AGC, Gate, EQ): ~2-5ms
- Advanced Processing (AEC, Feedback): ~10-20ms
- AI Optimization: ~50-100ms (async)

### Memory Requirements:
- FFT Buffers: ~10MB
- Processing Buffers: ~20MB
- History/Learning: ~50MB

### CPU Impact:
- Baseline: 5-10% CPU
- With FFT: +5-10% CPU
- Full Processing: +15-30% CPU
- AI Enabled: +10-20% CPU (periodic)

---

## 37. Configuration Management

All processing knobs should:
1. Support real-time updates without restart
2. Validate ranges before applying
3. Log all changes for audit
4. Support profiles/presets
5. Allow emergency reset
6. Persist across restarts

---

## 38. Integration Notes

### With Existing System:
- Processing knobs are applied in `onAudioChunk` AFTER metrics calculation
- FFT metrics are calculated BEFORE processing knobs are applied
- Emergency controls bypass all other processing
- Safety limits are always enforced last

### Data Flow:
1. Raw Audio → FFT Analysis → Metrics
2. Apply Processing Knobs → Modified Audio
3. Modified Audio → Output
4. Metrics → Monitoring Dashboard

---

END OF EXTENSIONS