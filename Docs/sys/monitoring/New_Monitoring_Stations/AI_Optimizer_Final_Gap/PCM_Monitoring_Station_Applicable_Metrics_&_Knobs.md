

PCM Monitoring Station – Applicable Metrics & Knobs

Authoritative Subset of the Unified Audio Monitoring & Calibration Specification

1. Station Definition

This document applies to a PCM Monitoring Station with the following fixed properties:
	•	Sample Rate: 16,000 Hz
	•	Bit Depth: 16-bit signed
	•	Channels: 1 (Mono)
	•	Encoding: PCM_S16LE
	•	Frame Duration: 20 ms
	•	Samples per Frame: 320
	•	Bytes per Frame: 640
	•	Transport: WebSocket
	•	Metadata available: channel_id, timestamp only
	•	No RTP sequence numbers
	•	No codec layer
	•	No STT/TTS engine at this station

⸻

2. Metrics – APPLICABLE AND MEASURABLE

The following metrics must be implemented at this station.
They are directly computable from PCM frames + timestamp + internal state.

2.1 Core Amplitude & Loudness Metrics (Signal Domain)
	•	pcm.peak_amplitude
	•	pcm.peak_to_peak_amplitude
	•	pcm.rms_dbfs
	•	pcm.average_absolute_amplitude
	•	pcm.dbfs_instant
	•	pcm.dbfs_short_term
	•	pcm.dbfs_integrated
	•	pcm.lufs_momentary
	•	pcm.lufs_short_term
	•	pcm.lufs_integrated
	•	pcm.crest_factor
	•	pcm.dynamic_range
	•	pcm.headroom
	•	pcm.silence_floor_level

⸻

2.2 Silence & Activity Metrics
	•	silence_detected
	•	silence_duration_ms
	•	speech_activity_ratio
	•	vad_probability
	•	speech_segments_count
	•	average_speech_segment_length
	•	average_silence_gap_length
	•	initial_speech_onset_latency

⸻

2.3 Clipping & Distortion Metrics
	•	clipped_samples_count
	•	clipping_ratio
	•	consecutive_clipped_frames
	•	hard_clipping_detection
	•	soft_clipping_detection
	•	distortion_index
	•	overdrive_duration

⸻

2.4 Noise & Quality Metrics
	•	noise_floor_dbfs
	•	signal_to_noise_ratio
	•	estimated_background_noise
	•	broadband_noise_level
	•	hum_detection
	•	hiss_detection
	•	audio_dropout_detection
	•	muted_signal_detection
	•	frozen_signal_detection

⸻

2.5 Temporal & Continuity Metrics
	•	frame_duration_ms
	•	frame_rate
	•	inter_frame_jitter
	•	frame_timestamp_drift
	•	time_since_last_valid_frame
	•	audio_freeze_duration

⸻

2.6 PCM Stream Integrity Metrics

(Static or continuously validated)
	•	sample_rate_actual
	•	bit_depth
	•	endianness_validation
	•	channel_count
	•	frame_size_consistency
	•	buffer_underrun_events
	•	buffer_overrun_events

⸻

2.7 Transport / Pipeline Metrics (PCM-Level Only)
	•	pcm_frames_per_second
	•	dropped_frames
	•	duplicated_frames
	•	out_of_order_frames
	•	ingress_latency_estimated
	•	egress_latency_estimated
	•	end_to_end_audio_latency_estimated
	•	latency_jitter
	•	queue_depth
	•	backpressure_events

⸻

2.8 Health & Diagnostic Metrics
	•	audio_alive_heartbeat
	•	last_audio_activity_timestamp
	•	last_speech_timestamp
	•	decoder_error_count
	•	processing_exception_count
	•	recovery_events_count

⸻

2.9 Derived / Composite Metrics (MANDATORY)

These are critical for AI optimization.
	•	audio_health_score
	•	speech_quality_index
	•	noise_risk_index
	•	clipping_risk_index
	•	stt_readiness_score (estimate only)

⸻

3. Metrics NOT APPLICABLE at This Station

The following are explicitly excluded:
	•	RTP metrics
	•	RTCP metrics
	•	Asterisk channel / bridge metrics
	•	Codec-specific metrics
	•	STT confidence / WER (engine-dependent)
	•	TTS synthesis metrics

They must not appear in this station’s output.

⸻

4. Knobs – APPLICABLE AND CONTROLLABLE

The following knobs are valid at a PCM monitoring station and may be controlled manually or by AI.

⸻

4.1 Gain & Level Control
	•	pcm.input_gain_db
	•	pcm.output_gain_db
	•	pcm.target_level_dbfs

⸻

4.2 AGC (Automatic Gain Control)
	•	agc.enabled
	•	agc.target_level_dbfs
	•	agc.max_gain_db
	•	agc.attack_time_ms
	•	agc.release_time_ms

⸻

4.3 Compression & Limiting
	•	compressor.enabled
	•	compressor.threshold_dbfs
	•	compressor.ratio
	•	compressor.attack_time_ms
	•	compressor.release_time_ms
	•	compressor.makeup_gain_db
	•	limiter.enabled
	•	limiter.threshold_dbfs
	•	limiter.release_time_ms
	•	limiter.lookahead_ms

⸻

4.4 Noise Control
	•	noise_gate.enabled
	•	noise_gate.threshold_dbfs
	•	noise_gate.attack_time_ms
	•	noise_gate.hold_time_ms
	•	noise_gate.release_time_ms
	•	noise_reduction.enabled
	•	noise_reduction_strength
	•	noise_reduction_learning_rate
	•	preserve_voice_threshold
	•	spectral_subtraction_factor

⸻

4.5 Equalization & Filters
	•	eq_low_shelf_freq
	•	eq_low_shelf_gain
	•	eq_mid_freq
	•	eq_mid_gain
	•	eq_mid_q
	•	eq_high_shelf_freq
	•	eq_high_shelf_gain
	•	highpass_enabled
	•	highpass_cutoff_hz
	•	lowpass_enabled
	•	lowpass_cutoff_hz

⸻

4.6 Voice Enhancement
	•	voice_enhancement_mode
	•	voice_frequency_boost
	•	de_esser_threshold
	•	de_esser_frequency
	•	de_esser_reduction

⸻

4.7 Echo / Feedback (PCM-Level Only)
	•	aec_tail_length
	•	aec_convergence_speed
	•	aec_suppression_level
	•	feedback_notch_q
	•	feedback_max_notches
	•	feedback_reaction_time

⸻

4.8 Monitoring & Smoothing
	•	monitoring_metrics_enabled
	•	monitoring_pre_tap_enabled
	•	monitoring_post_tap_enabled
	•	monitoring_audio_capture_enabled
	•	monitoring_fft_analysis_enabled
	•	smoothing_window_ms
	•	attack_time_ms
	•	release_time_ms

⸻

4.9 Safety & AI Permission (CRITICAL)

These knobs must always exist.
	•	ai_optimization_allowed
	•	ai_max_adjustment
	•	manual_override_required
	•	requires_restart
	•	rollback_on_failure
	•	max_output_level
	•	min_output_level
	•	clipping_protection
	•	emergency_mute
	•	emergency_boost

⸻

5. Knobs NOT APPLICABLE at This Station

Explicitly excluded:
	•	RTP jitter buffer knobs
	•	Codec selection knobs
	•	Packetization knobs
	•	Asterisk channel knobs
	•	Call-restart knobs

⸻

6. Summary (For Developers)
	•	This station can safely support ~80–100 metrics
	•	This station can safely expose ~120–150 knobs
	•	All listed items come only from the provided specification
	•	No header changes required
	•	Fully compatible with AI-driven optimization
	•	Production-grade monitoring coverage

