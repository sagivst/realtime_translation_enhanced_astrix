
Unified Audio Monitoring & Calibration Specification

PCM / Telephony / STT / TTS Systems

⸻

1. Purpose

This document defines the maximum comprehensive set of:
	•	Audio Metrics (measured, observed, derived)
	•	Audio Knobs (calibration, thresholds, control parameters)

for real-time systems handling:
	•	Raw PCM audio
	•	Telephony pipelines (Asterisk / RTP / Gateways)
	•	STT (Speech-to-Text)
	•	TTS (Text-to-Speech)
	•	Translation & synthesis chains

This document replaces all previous metric/knob documents and is the single source of truth.

⸻

2. Conceptual Model (Mandatory)

The system is based on three strictly separated layers:

2.1 Metrics (Read-Only)

What is actually happening in the signal or pipeline.

2.2 Knobs (Control / Calibration)

How the system is allowed to react, adjust, or constrain behavior.

2.3 Policies (Logic Layer)

Rules that connect Metrics → Knobs (manual, automatic, AI-driven).

⚠ Metrics NEVER directly change the system.
⚠ Only Knobs affect behavior.

⸻

3. Metric Dimensions & Axes

Each metric is classified along the following axes:
	•	Domain: Audio / Speech / Transport / Model / Codec
	•	Scope: Per-frame | Per-channel | Aggregated
	•	Station: Where it is measurable
	•	Capability: Measurable | Observable | Controllable
	•	Temporal Nature: Instant | Windowed | Long-term

⸻

4. Core PCM Audio Metrics (Signal Domain)

4.1 Amplitude & Loudness Metrics

(Per-frame + Aggregated)
	•	Peak amplitude
	•	Peak-to-peak amplitude
	•	RMS level
	•	Average absolute amplitude
	•	dBFS (instant)
	•	dBFS (short-term)
	•	dBFS (integrated)
	•	LUFS momentary
	•	LUFS short-term
	•	LUFS integrated
	•	Crest factor
	•	Dynamic range
	•	Headroom
	•	Silence floor level

⸻

4.2 Silence & Activity Metrics
	•	Silence detection (boolean)
	•	Silence duration (ms)
	•	Speech activity ratio
	•	Voice Activity Detection (VAD probability)
	•	Speech segment count
	•	Average speech segment length
	•	Average silence gap length
	•	Initial speech onset latency

⸻

4.3 Clipping & Distortion Metrics
	•	Clipped samples count
	•	Clipping ratio (%)
	•	Consecutive clipped frames
	•	Hard clipping detection
	•	Soft clipping detection
	•	Distortion index
	•	Overdrive duration

⸻

4.4 Noise & Quality Metrics
	•	Noise floor (dBFS)
	•	Signal-to-noise ratio (SNR)
	•	Estimated background noise
	•	Broadband noise level
	•	Hum detection (50/60Hz)
	•	Hiss detection
	•	Audio dropout detection
	•	Muted signal detection
	•	Frozen signal detection

⸻

5. Spectral & Frequency Metrics (FFT-Based)

(Per-frame + Aggregated)
	•	FFT magnitude spectrum
	•	Dominant frequency
	•	Spectral centroid
	•	Spectral bandwidth
	•	Spectral rolloff
	•	Spectral flatness
	•	Spectral flux
	•	Harmonic energy ratio
	•	Low-band energy
	•	Mid-band energy
	•	High-band energy
	•	Band energy ratios

⸻

6. Temporal & Continuity Metrics
	•	Frame duration
	•	Frame rate
	•	Inter-frame jitter
	•	Frame timestamp drift
	•	Time since last valid frame
	•	Clock drift estimation
	•	Audio freeze duration

⸻

7. PCM Stream Integrity Metrics
	•	Sample rate (expected vs actual)
	•	Bit depth
	•	Endianness validation
	•	Channel count
	•	Channel imbalance
	•	Frame size consistency
	•	Buffer underrun events
	•	Buffer overrun events

⸻

8. Transport & Pipeline Metrics

(PCM over WebSocket / RTP-adjacent)
	•	PCM frames per second
	•	Dropped frames
	•	Duplicated frames
	•	Out-of-order frames
	•	Ingress latency
	•	Egress latency
	•	End-to-end audio latency
	•	Latency jitter
	•	Queue depth
	•	Backpressure events

⸻

9. STT-Specific Metrics

9.1 Audio-to-Text Pipeline
	•	Audio chunk size
	•	Chunk delivery rate
	•	STT input latency
	•	STT output latency
	•	Partial transcript latency
	•	Final transcript latency
	•	Tokenization delay

9.2 Recognition Quality
	•	Confidence score
	•	Confidence variance
	•	Word error rate (estimated)
	•	Silence-to-speech misclassification
	•	Hallucination probability
	•	Repetition detection
	•	Language detection confidence

⸻

10. TTS-Specific Metrics

10.1 Synthesis Pipeline
	•	Text-to-audio latency
	•	Audio generation time
	•	Chunk emission rate
	•	Audio buffer fill rate

10.2 Output Audio Quality
	•	Prosody stability
	•	Pitch stability
	•	Energy envelope smoothness
	•	Phoneme clipping detection
	•	Initial syllable truncation
	•	Speech continuity score

⸻

11. Codec-Adjacent Metrics

(Even when PCM is used downstream)
	•	Expected codec vs source codec
	•	Transcoding latency
	•	Resampling ratio
	•	Quantization noise estimate
	•	Compression artifact probability
	•	Packetization mismatch detection

⸻

12. Per-Channel Metrics (Multi-Channel Systems)
	•	Per-channel RMS
	•	Per-channel peak
	•	Channel imbalance ratio
	•	Channel phase alignment
	•	Channel-specific clipping
	•	Channel-specific noise floor

⸻

13. Health & Diagnostic Metrics
	•	Audio alive heartbeat
	•	Last audio activity timestamp
	•	Last speech timestamp
	•	Decoder error count
	•	Processing exception count
	•	Recovery events count

⸻

14. Derived / Composite Metrics
	•	Audio Health Score (0–100)
	•	Speech Quality Index
	•	Noise Risk Index
	•	Clipping Risk Index
	•	STT Readiness Score
	•	TTS Playback Safety Score

⸻

15. Knobs (Calibration & Control Parameters)

Each metric typically introduces multiple Knobs.

Knobs are grouped by function.

⸻

15.1 Threshold Knobs
	•	min_allowed
	•	max_allowed
	•	warn_threshold
	•	error_threshold
	•	optimal_min
	•	optimal_max

⸻

15.2 Temporal Knobs
	•	smoothing_window_ms
	•	debounce_time_ms
	•	attack_time_ms
	•	release_time_ms
	•	grace_period_ms

⸻

15.3 Control Knobs
	•	auto_adjust_enabled
	•	auto_adjust_step
	•	auto_adjust_max
	•	auto_adjust_min
	•	recovery_rate
	•	clamp_enabled

⸻

15.4 Safety & AI Permission Knobs
	•	ai_auto_allowed
	•	ai_max_adjustment
	•	manual_override_required
	•	requires_restart
	•	rollback_on_failure

⸻

16. Per-Metric Knob Expansion (Example)

Metric: RMS Level

Knobs:
	•	rms_min
	•	rms_max
	•	rms_optimal_min
	•	rms_optimal_max
	•	rms_warn_threshold
	•	rms_error_threshold
	•	rms_smoothing_window
	•	rms_attack_time
	•	rms_release_time
	•	rms_auto_gain_enabled
	•	rms_auto_gain_step
	•	rms_auto_gain_max
	•	rms_auto_gain_min

➡ 1 metric → ~12–15 knobs

⸻

17. Scale Summary

Layer	Approximate Count
Metrics	90–120
Knobs	140–200
Total managed parameters	300–500+

This scale is normal and expected for real-time voice systems.

⸻

18. Station Capability Tagging (Mandatory)

Each Metric and Knob must be tagged as:
	•	Measurable
	•	Observable
	•	Controllable

per station.

This enables:
	•	Dynamic UI enable/disable
	•	Generic collectors
	•	Safe auto-tuning

⸻

19. Data Model Recommendation

Each metric sample:

{
  "metric": "rms_level",
  "value": -12.4,
  "unit": "dBFS",
  "scope": "per_frame",
  "status": "OK | WARN | ERROR",
  "expected_range": [-20, -6],
  "optimal_range": [-14, -10],
  "timestamp": "ISO-8601"
}


⸻

20. Final Notes
	•	Metrics describe reality
	•	Knobs describe permission
	•	Policies describe behavior
	•	Never mix these layers
	•	The system is designed for:
	•	Explainability
	•	Safety
	•	Auto-tuning
	•	Rollback
	•	Auditability

⸻

RTP & Asterisk-Native Monitoring — Metrics & Knobs Extension

Authoritative Addendum to Unified Audio Monitoring Specification

⸻

21. Scope of This Section

This section defines RTP-specific and Asterisk-native metrics and knobs applicable to:
	•	RTP streams (pre-PCM, pre-STT, pre-TTS)
	•	Asterisk channels, bridges, and media paths
	•	ExternalMedia / ARI / RTP ingress & egress points

These metrics do not exist at the PCM layer and must be collected before decoding.

⸻

22. RTP-Level Metrics (Network & Media Transport)

22.1 RTP Packet Metrics
	•	RTP packets received
	•	RTP packets sent
	•	RTP packet loss count
	•	RTP packet loss rate (%)
	•	RTP packets out-of-order
	•	RTP duplicate packets
	•	RTP late packets
	•	RTP early packets
	•	RTP packets discarded (jitter buffer)
	•	RTP payload type
	•	RTP SSRC
	•	RTP sequence number gaps
	•	RTP marker bit usage

Scope: per-stream, per-direction (RX / TX)

⸻

22.2 RTP Timing & Jitter Metrics
	•	RTP inter-arrival jitter (RFC 3550)
	•	RTP jitter average
	•	RTP jitter peak
	•	RTP jitter variance
	•	RTP timestamp drift
	•	RTP clock skew estimation
	•	RTP playout delay
	•	RTP round-trip estimation (if RTCP enabled)

⸻

22.3 RTP Latency Metrics
	•	Network one-way latency (estimated)
	•	RTP ingress → Asterisk processing latency
	•	Asterisk → RTP egress latency
	•	End-to-end RTP latency (estimated)
	•	Latency jitter

⸻

23. RTCP Metrics (If Enabled)
	•	RTCP packets sent
	•	RTCP packets received
	•	Fraction lost
	•	Cumulative packets lost
	•	Extended highest sequence number
	•	Interarrival jitter (RTCP reported)
	•	Last SR timestamp
	•	DLSR (delay since last SR)

⸻

24. Codec & Payload Metrics (RTP Layer)
	•	Active codec (G.711, Opus, G.729, etc.)
	•	Codec mismatch detection
	•	Payload size
	•	Payload size variance
	•	Packetization interval (ptime)
	•	Codec frame duration
	•	Transcoding active (boolean)
	•	Transcoding direction
	•	Transcoding latency estimate

⸻

25. Asterisk-Native Media Metrics

25.1 Channel Metrics
	•	Channel state (Up / Ring / Down)
	•	Channel media state
	•	Channel jitter buffer delay
	•	Channel jitter buffer size
	•	Channel jitter buffer drops
	•	Channel jitter buffer adaptive state
	•	Channel media direction (send / receive)
	•	Channel hold time
	•	Channel RTP source/destination

⸻

25.2 Bridge Metrics
	•	Bridge type (mixing / holding)
	•	Number of channels in bridge
	•	Bridge media format
	•	Bridge mixing latency
	•	Bridge packet forwarding rate

⸻

25.3 ExternalMedia Metrics (ARI)
	•	ExternalMedia RTP frame rate
	•	ExternalMedia packet loss
	•	ExternalMedia latency
	•	ExternalMedia buffer depth
	•	ExternalMedia underruns / overruns

⸻

26. RTP & Asterisk Knobs (Control & Calibration)

Knobs are station-dependent and must never be exposed blindly.

⸻

26.1 RTP Jitter Buffer Knobs
	•	jitterbuffer_enabled
	•	jitterbuffer_type (fixed / adaptive)
	•	jitterbuffer_size_ms
	•	jitterbuffer_target_delay_ms
	•	jitterbuffer_max_delay_ms
	•	jitterbuffer_resync_threshold
	•	jitterbuffer_drop_policy
	•	jitterbuffer_log_level

⸻

26.2 RTP Packet Handling Knobs
	•	rtp_timeout_seconds
	•	rtp_keepalive_interval
	•	rtp_reorder_buffer_size
	•	rtp_duplicate_suppression
	•	rtp_late_packet_threshold
	•	rtp_early_packet_threshold

⸻

26.3 Codec & Payload Knobs
	•	allowed_codecs
	•	preferred_codec
	•	packetization_time (ptime)
	•	max_payload_size
	•	force_transcoding (boolean)
	•	transcoding_latency_budget

⸻

26.4 Asterisk Channel Knobs
	•	channel_media_timeout
	•	channel_silence_threshold
	•	channel_hold_music_enable
	•	channel_audiohook_enable
	•	channel_monitoring_enable

⸻

26.5 Safety & Permission Knobs (Critical)
	•	auto_jitterbuffer_adjust_allowed
	•	max_auto_jitterbuffer_change
	•	auto_codec_switch_allowed
	•	requires_call_restart
	•	ai_control_allowed

⸻

27. Per-Stream vs Aggregated RTP Metrics

Each RTP metric must specify its aggregation level:
	•	Per-packet
	•	Per-stream
	•	Per-call
	•	Aggregated (windowed)
	•	Aggregated (call lifetime)

This is mandatory for:
	•	Storage
	•	UI
	•	Alerting
	•	Auto-tuning

⸻

28. Asterisk-Only Metrics (Not Available Elsewhere)

These metrics exist only inside Asterisk:
	•	Audiohook processing delay
	•	Jitter buffer adaptive mode changes
	•	Transcoding activation count
	•	DSP silence detector state
	•	Channel masquerade events
	•	Media renegotiation count
	•	RTP source address changes (NAT / re-INVITE)

⸻

29. Derived RTP Health Indicators
	•	RTP Stream Health Score
	•	Network Stability Index
	•	Jitter Risk Index
	•	Packet Loss Risk Index
	•	Transcoding Stress Index

⸻

30. Integration Rules with PCM Metrics
	•	RTP metrics precede PCM metrics
	•	RTP metrics explain why PCM problems occur
	•	PCM metrics explain what the user hears

Both layers must coexist and be correlated.

⸻

31. Summary (Why This Matters)

Without RTP/Asterisk metrics:
	•	You cannot distinguish network vs audio issues
	•	You cannot tune jitter buffers safely
	•	You cannot explain clipped or missing syllables
	•	You cannot auto-heal calls

This extension is mandatory for any serious telephony system.

⸻

32. Final Count Impact

Adding RTP + Asterisk layers typically adds:
	•	+40–60 metrics
	•	+60–90 knobs

Bringing the full system to:
	•	130–180 metrics
	•	200–280 knobs

This is normal and expected.

⸻

END — RTP / ASTERISK ADDENDUM

⸻

END OF DOCUMENT


---

## EXTENSIONS ADDED: 2025-12-30

## 33. FFT-Based Spectral Analysis Metrics (NEW)

### Core Spectral Metrics (via FFT):
- spectral_centroid (Hz) - Brightness indicator
- spectral_rolloff (Hz) - 85% energy point
- spectral_flux - Spectral change rate
- spectral_flatness (0-1) - Tonality measure
- spectral_bandwidth (Hz) - Spectrum width
- dominant_frequency (Hz) - Strongest frequency
- harmonic_energy_ratio (0-1) - Harmonic content
- low_band_energy (0-500 Hz)
- mid_band_energy (500-2000 Hz)  
- high_band_energy (2000-8000 Hz)
- hum_detection (boolean) - 50/60 Hz
- hiss_detection (boolean) - HF noise

## 34. Active Audio Processing Controls (NEW)

### Dynamic Range:
- compression_threshold/ratio/attack/release
- limiter_threshold/release/lookahead
- noise_gate_threshold/attack/hold/release

### Noise Control:
- noise_reduction_strength/learning_rate
- preserve_voice_threshold
- spectral_subtraction_factor

### AGC:
- agc_target_level/max_gain/attack/release

### Equalization:
- eq_low_shelf_freq/gain
- eq_mid_freq/gain/q
- eq_high_shelf_freq/gain

### Voice Enhancement:
- voice_enhancement_mode
- voice_frequency_boost
- de_esser_threshold/frequency/reduction

### Echo/Feedback:
- aec_tail_length/convergence_speed/suppression_level
- feedback_notch_q/max_notches/reaction_time

### Safety:
- max_output_level/min_output_level
- clipping_protection
- emergency_mute/boost

See full details in: Unified_Metrics_&_Knobs_Specification_Extensions.md

---

END OF DOCUMENT (WITH EXTENSIONS)

---

## 35. Additional Time-Domain Metrics (IMPLEMENTATION READY)

These metrics can be calculated from existing PCM audio without FFT implementation.

### 35.1 Extended Amplitude Metrics
- `average_absolute_amplitude` - Average of absolute sample values
- `peak_to_peak_amplitude` - Maximum swing in frame (max - min)
- `dbfs_instant` - Instantaneous dBFS (same frame)
- `dbfs_short_term` - 30-frame rolling average dBFS
- `dbfs_integrated` - 300-frame rolling average dBFS

### 35.2 Simplified Loudness Metrics
- `lufs_momentary` - Momentary loudness (RMS + 0.691 approximation)
- `lufs_short_term` - 30-frame rolling average LUFS
- `lufs_integrated` - 300-frame rolling average LUFS

### 35.3 Extended Timing Metrics
- `frame_duration` - Actual frame duration in ms
- `frame_timestamp_drift` - Deviation from expected timestamp
- `time_since_last_valid_frame` - ms since last valid audio
- `audio_freeze_detection` - Boolean (true if > 500ms no valid frames)
- `consecutive_frames_processed` - Counter of continuous frames

### 35.4 Enhanced Silence & Activity Metrics
- `silence_duration_ms` - Current silence length in milliseconds
- `speech_activity_ratio` - Percentage of frames with speech
- `average_silence_gap_length` - Average gap between speech segments
- `silence_segments_count` - Number of silence periods
- `speech_segments_count` - Number of speech periods
- `longest_silence_duration` - Maximum silence gap observed
- `longest_speech_duration` - Maximum continuous speech

### 35.5 Advanced Clipping Detection
- `consecutive_clipped_frames` - Continuous frames with clipping
- `hard_clipping_detection` - Boolean (samples at maximum)
- `soft_clipping_detection` - Boolean (samples near maximum)
- `clipping_events_count` - Total clipping events
- `max_clipping_duration` - Longest clipping event

### 35.6 Signal State Detection
- `muted_signal_detection` - Boolean (RMS < -70 dBFS)
- `frozen_signal_detection` - Boolean (identical consecutive buffers)
- `dc_offset_detection` - Boolean (DC bias present)
- `signal_dropout_count` - Number of dropout events

### 35.7 Buffer Health Metrics
- `buffer_underrun_events` - Count of empty buffer incidents
- `buffer_overrun_events` - Count of full buffer incidents
- `queue_depth` - Current buffer queue size
- `buffer_fill_ratio` - Percentage of buffer capacity used
- `average_buffer_depth` - Rolling average queue depth

### 35.8 Simple Energy Analysis
- `estimated_background_noise` - Running noise floor estimate
- `broadband_noise_level` - Overall noise energy
- `energy_envelope_variance` - Energy variation measure
- `zero_crossing_rate` - ZCR for voiced/unvoiced detection
- `energy_concentration` - Energy distribution measure

### 35.9 Voice Activity Detection (Simple)
- `vad_probability` - Simple VAD score (0-1)
- `voiced_frame_count` - Frames detected as voiced
- `unvoiced_frame_count` - Frames detected as unvoiced
- `voice_transition_count` - Voice on/off transitions
- `initial_speech_onset_latency` - Time to first speech

### 35.10 Distortion Indicators
- `distortion_index` - Simple THD approximation
- `overdrive_duration` - Time spent near clipping
- `asymmetry_index` - Waveform asymmetry measure
- `saturation_events` - Count of saturation incidents

### 35.11 Quality Scores
- `audio_health_score` - Overall health (0-100)
- `speech_quality_index` - Speech quality (0-100)
- `stt_readiness_score` - STT suitability (0-100)
- `noise_risk_index` - Noise problem risk (0-100)
- `clipping_risk_index` - Clipping risk (0-100)

### 35.12 Session Statistics
- `total_frames_processed` - Frame counter
- `total_audio_duration_ms` - Total audio time
- `session_start_timestamp` - Session start time
- `last_activity_timestamp` - Last audio activity
- `average_processing_time` - Per-frame processing time

---

## 36. Metrics Summary by Implementation Status

### Currently Implemented (21 metrics):
- Basic amplitude (RMS, peak)
- Basic ratios (crest factor, dynamic range)
- Simple detection (silence, clipping)
- Frame properties (size, rate)

### Ready to Implement - No FFT Required (40+ metrics):
- Extended amplitude analysis
- Timing and continuity
- Buffer health
- Simple voice detection
- Quality scores
- Session statistics

### Requires FFT Implementation (12+ metrics):
- Spectral centroid, rolloff, flux
- Band energies
- Harmonic analysis
- Hum/hiss detection

### Requires External Configuration (~1,300 parameters):
- All _min, _max, _optimal settings
- All _threshold, _window, _time settings
- All control and calibration knobs

---

## 37. Implementation Priority for Null Reduction

### Phase 1 - Quick Wins (2 hours):
Add 40+ time-domain metrics listed in Section 35
- Brings populated metrics from 21 to ~60
- No additional libraries needed
- Minimal performance impact

### Phase 2 - FFT Metrics (4 hours):
Implement FFT analysis for spectral metrics
- Adds 12+ frequency-domain metrics
- Requires fft-js library
- Moderate performance impact

### Phase 3 - Configuration Loading (1 day):
Load configuration knobs from external files
- Would populate ~200-300 settings
- Requires configuration management system
- No performance impact

### Phase 4 - Active Processing (2-3 days):
Implement audio processing controls
- Compression, EQ, noise gate, etc.
- Significant architecture changes
- Higher performance impact

---

END OF DOCUMENT (UPDATED 2025-12-30)
