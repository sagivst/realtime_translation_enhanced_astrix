// STATION 3 UNIFIED METRICS & KNOBS - MASTER TEMPLATE
// Based on Unified_Metrics_&_Knobs_Specification.md
// ~180 Metrics + ~280 Knobs = ~460 Total Parameters

// This will be the knobs initialization for Station 3
const unifiedKnobs = {
  // ========== METRICS (Read-Only Monitoring Parameters) ==========
  // ~180 Total Metrics

  // === Core PCM Audio Metrics ===
  // 4.1 Amplitude & Loudness Metrics (14 metrics)
  'metrics.peak_amplitude': 0,
  'metrics.peak_to_peak_amplitude': 0,
  'metrics.rms_level': 0,
  'metrics.average_absolute_amplitude': 0,
  'metrics.dbfs_instant': 0,
  'metrics.dbfs_short_term': 0,
  'metrics.dbfs_integrated': 0,
  'metrics.lufs_momentary': 0,
  'metrics.lufs_short_term': 0,
  'metrics.lufs_integrated': 0,
  'metrics.crest_factor': 0,
  'metrics.dynamic_range': 0,
  'metrics.headroom': 0,
  'metrics.silence_floor_level': 0,

  // 4.2 Silence & Activity Metrics (8 metrics)
  'metrics.silence_detection': false,
  'metrics.silence_duration_ms': 0,
  'metrics.speech_activity_ratio': 0,
  'metrics.vad_probability': 0,
  'metrics.speech_segment_count': 0,
  'metrics.average_speech_segment_length': 0,
  'metrics.average_silence_gap_length': 0,
  'metrics.initial_speech_onset_latency': 0,

  // 4.3 Clipping & Distortion Metrics (7 metrics)
  'metrics.clipped_samples_count': 0,
  'metrics.clipping_ratio': 0,
  'metrics.consecutive_clipped_frames': 0,
  'metrics.hard_clipping_detection': false,
  'metrics.soft_clipping_detection': false,
  'metrics.distortion_index': 0,
  'metrics.overdrive_duration': 0,

  // 4.4 Noise & Quality Metrics (9 metrics)
  'metrics.noise_floor_dbfs': -60,
  'metrics.signal_to_noise_ratio': 0,
  'metrics.estimated_background_noise': 0,
  'metrics.broadband_noise_level': 0,
  'metrics.hum_detection': false,
  'metrics.hiss_detection': false,
  'metrics.audio_dropout_detection': false,
  'metrics.muted_signal_detection': false,
  'metrics.frozen_signal_detection': false,

  // 5. Spectral & Frequency Metrics (12 metrics)
  'metrics.dominant_frequency': 0,
  'metrics.spectral_centroid': 0,
  'metrics.spectral_bandwidth': 0,
  'metrics.spectral_rolloff': 0,
  'metrics.spectral_flatness': 0,
  'metrics.spectral_flux': 0,
  'metrics.harmonic_energy_ratio': 0,
  'metrics.low_band_energy': 0,
  'metrics.mid_band_energy': 0,
  'metrics.high_band_energy': 0,
  'metrics.band_energy_ratios': 0,
  'metrics.fft_magnitude_spectrum': 0,

  // 6. Temporal & Continuity Metrics (7 metrics)
  'metrics.frame_duration': 0,
  'metrics.frame_rate': 0,
  'metrics.inter_frame_jitter': 0,
  'metrics.frame_timestamp_drift': 0,
  'metrics.time_since_last_valid_frame': 0,
  'metrics.clock_drift_estimation': 0,
  'metrics.audio_freeze_duration': 0,

  // 7. PCM Stream Integrity Metrics (8 metrics)
  'metrics.sample_rate_actual': 16000,
  'metrics.bit_depth': 16,
  'metrics.endianness_validation': true,
  'metrics.channel_count': 1,
  'metrics.channel_imbalance': 0,
  'metrics.frame_size_consistency': true,
  'metrics.buffer_underrun_events': 0,
  'metrics.buffer_overrun_events': 0,

  // 8. Transport & Pipeline Metrics (10 metrics)
  'metrics.pcm_frames_per_second': 0,
  'metrics.dropped_frames': 0,
  'metrics.duplicated_frames': 0,
  'metrics.out_of_order_frames': 0,
  'metrics.ingress_latency': 0,
  'metrics.egress_latency': 0,
  'metrics.end_to_end_audio_latency': 0,
  'metrics.latency_jitter': 0,
  'metrics.queue_depth': 0,
  'metrics.backpressure_events': 0,

  // 9. STT-Specific Metrics (13 metrics)
  'metrics.audio_chunk_size': 0,
  'metrics.chunk_delivery_rate': 0,
  'metrics.stt_input_latency': 0,
  'metrics.stt_output_latency': 0,
  'metrics.partial_transcript_latency': 0,
  'metrics.final_transcript_latency': 0,
  'metrics.tokenization_delay': 0,
  'metrics.confidence_score': 0,
  'metrics.confidence_variance': 0,
  'metrics.word_error_rate_estimated': 0,
  'metrics.silence_to_speech_misclassification': 0,
  'metrics.hallucination_probability': 0,
  'metrics.repetition_detection': 0,
  'metrics.language_detection_confidence': 0,

  // 10. TTS-Specific Metrics (9 metrics)
  'metrics.text_to_audio_latency': 0,
  'metrics.audio_generation_time': 0,
  'metrics.chunk_emission_rate': 0,
  'metrics.audio_buffer_fill_rate': 0,
  'metrics.prosody_stability': 0,
  'metrics.pitch_stability': 0,
  'metrics.energy_envelope_smoothness': 0,
  'metrics.phoneme_clipping_detection': 0,
  'metrics.initial_syllable_truncation': 0,
  'metrics.speech_continuity_score': 0,

  // 11. Codec-Adjacent Metrics (6 metrics)
  'metrics.expected_codec_vs_source': true,
  'metrics.transcoding_latency': 0,
  'metrics.resampling_ratio': 1,
  'metrics.quantization_noise_estimate': 0,
  'metrics.compression_artifact_probability': 0,
  'metrics.packetization_mismatch_detection': false,

  // 12. Per-Channel Metrics (6 metrics)
  'metrics.per_channel_rms': 0,
  'metrics.per_channel_peak': 0,
  'metrics.channel_imbalance_ratio': 0,
  'metrics.channel_phase_alignment': 0,
  'metrics.channel_specific_clipping': 0,
  'metrics.channel_specific_noise_floor': 0,

  // 13. Health & Diagnostic Metrics (6 metrics)
  'metrics.audio_alive_heartbeat': true,
  'metrics.last_audio_activity_timestamp': Date.now(),
  'metrics.last_speech_timestamp': Date.now(),
  'metrics.decoder_error_count': 0,
  'metrics.processing_exception_count': 0,
  'metrics.recovery_events_count': 0,

  // 14. Derived/Composite Metrics (6 metrics)
  'metrics.audio_health_score': 100,
  'metrics.speech_quality_index': 0,
  'metrics.noise_risk_index': 0,
  'metrics.clipping_risk_index': 0,
  'metrics.stt_readiness_score': 0,
  'metrics.tts_playback_safety_score': 0,

  // === RTP & Asterisk Metrics (sections 22-28) ===
  // 22.1 RTP Packet Metrics (13 metrics)
  'metrics.rtp.packets_received': 0,
  'metrics.rtp.packets_sent': 0,
  'metrics.rtp.packet_loss_count': 0,
  'metrics.rtp.packet_loss_rate': 0,
  'metrics.rtp.packets_out_of_order': 0,
  'metrics.rtp.duplicate_packets': 0,
  'metrics.rtp.late_packets': 0,
  'metrics.rtp.early_packets': 0,
  'metrics.rtp.packets_discarded': 0,
  'metrics.rtp.payload_type': 0,
  'metrics.rtp.ssrc': 0,
  'metrics.rtp.sequence_number_gaps': 0,
  'metrics.rtp.marker_bit_usage': 0,

  // 22.2 RTP Timing & Jitter Metrics (8 metrics)
  'metrics.rtp.inter_arrival_jitter': 0,
  'metrics.rtp.jitter_average': 0,
  'metrics.rtp.jitter_peak': 0,
  'metrics.rtp.jitter_variance': 0,
  'metrics.rtp.timestamp_drift': 0,
  'metrics.rtp.clock_skew_estimation': 0,
  'metrics.rtp.playout_delay': 0,
  'metrics.rtp.round_trip_estimation': 0,

  // 22.3 RTP Latency Metrics (5 metrics)
  'metrics.rtp.network_one_way_latency': 0,
  'metrics.rtp.ingress_to_asterisk_latency': 0,
  'metrics.rtp.asterisk_to_egress_latency': 0,
  'metrics.rtp.end_to_end_latency': 0,
  'metrics.rtp.latency_jitter': 0,

  // 23. RTCP Metrics (8 metrics)
  'metrics.rtcp.packets_sent': 0,
  'metrics.rtcp.packets_received': 0,
  'metrics.rtcp.fraction_lost': 0,
  'metrics.rtcp.cumulative_packets_lost': 0,
  'metrics.rtcp.extended_highest_sequence': 0,
  'metrics.rtcp.interarrival_jitter': 0,
  'metrics.rtcp.last_sr_timestamp': 0,
  'metrics.rtcp.dlsr': 0,

  // 24. Codec & Payload Metrics (9 metrics)
  'metrics.codec.active_codec': 'opus',
  'metrics.codec.mismatch_detection': false,
  'metrics.codec.payload_size': 0,
  'metrics.codec.payload_size_variance': 0,
  'metrics.codec.packetization_interval': 20,
  'metrics.codec.frame_duration': 0,
  'metrics.codec.transcoding_active': false,
  'metrics.codec.transcoding_direction': 'none',
  'metrics.codec.transcoding_latency_estimate': 0,

  // 25. Asterisk-Native Media Metrics (14 metrics)
  'metrics.asterisk.channel_state': 'up',
  'metrics.asterisk.channel_media_state': 'active',
  'metrics.asterisk.channel_jitter_buffer_delay': 0,
  'metrics.asterisk.channel_jitter_buffer_size': 0,
  'metrics.asterisk.channel_jitter_buffer_drops': 0,
  'metrics.asterisk.channel_jitter_buffer_adaptive_state': true,
  'metrics.asterisk.channel_media_direction': 'sendrecv',
  'metrics.asterisk.channel_hold_time': 0,
  'metrics.asterisk.bridge_type': 'mixing',
  'metrics.asterisk.channels_in_bridge': 0,
  'metrics.asterisk.bridge_media_format': 'ulaw',
  'metrics.asterisk.bridge_mixing_latency': 0,
  'metrics.asterisk.bridge_packet_forwarding_rate': 0,
  'metrics.asterisk.externalmedia_frame_rate': 0,

  // 28. Asterisk-Only Metrics (7 metrics)
  'metrics.asterisk.audiohook_processing_delay': 0,
  'metrics.asterisk.jitter_buffer_adaptive_changes': 0,
  'metrics.asterisk.transcoding_activation_count': 0,
  'metrics.asterisk.dsp_silence_detector_state': false,
  'metrics.asterisk.channel_masquerade_events': 0,
  'metrics.asterisk.media_renegotiation_count': 0,
  'metrics.asterisk.rtp_source_address_changes': 0,

  // 29. Derived RTP Health Indicators (5 metrics)
  'metrics.rtp.stream_health_score': 100,
  'metrics.rtp.network_stability_index': 0,
  'metrics.rtp.jitter_risk_index': 0,
  'metrics.rtp.packet_loss_risk_index': 0,
  'metrics.rtp.transcoding_stress_index': 0,

  // ========== KNOBS (Control/Calibration Parameters) ==========
  // ~280 Total Knobs

  // === Threshold Knobs (for each metric category) ===
  // RMS Level Knobs (example from section 16)
  'knobs.rms.min': -60,
  'knobs.rms.max': 0,
  'knobs.rms.optimal_min': -20,
  'knobs.rms.optimal_max': -6,
  'knobs.rms.warn_threshold': -3,
  'knobs.rms.error_threshold': 0,
  'knobs.rms.smoothing_window': 100,
  'knobs.rms.attack_time': 5,
  'knobs.rms.release_time': 50,
  'knobs.rms.auto_gain_enabled': true,
  'knobs.rms.auto_gain_step': 1,
  'knobs.rms.auto_gain_max': 20,
  'knobs.rms.auto_gain_min': -20,

  // SNR Knobs
  'knobs.snr.min_allowed': 0,
  'knobs.snr.max_allowed': 100,
  'knobs.snr.warn_threshold': 10,
  'knobs.snr.error_threshold': 5,
  'knobs.snr.optimal_min': 20,
  'knobs.snr.optimal_max': 60,
  'knobs.snr.smoothing_window_ms': 200,
  'knobs.snr.auto_adjust_enabled': false,

  // Clipping Knobs
  'knobs.clipping.max_allowed_ratio': 0.01,
  'knobs.clipping.warn_threshold': 0.001,
  'knobs.clipping.error_threshold': 0.005,
  'knobs.clipping.grace_period_ms': 50,
  'knobs.clipping.auto_reduce_gain': true,
  'knobs.clipping.auto_reduce_step_db': 1,

  // Silence Detection Knobs
  'knobs.silence.threshold_dbfs': -50,
  'knobs.silence.min_duration_ms': 300,
  'knobs.silence.max_allowed_ms': 30000,
  'knobs.silence.debounce_time_ms': 100,
  'knobs.silence.auto_unmute_enabled': false,

  // Jitter Buffer Knobs (from section 26.1)
  'knobs.jitterbuffer.enabled': true,
  'knobs.jitterbuffer.type': 'adaptive',
  'knobs.jitterbuffer.size_ms': 60,
  'knobs.jitterbuffer.target_delay_ms': 40,
  'knobs.jitterbuffer.max_delay_ms': 200,
  'knobs.jitterbuffer.resync_threshold': 1000,
  'knobs.jitterbuffer.drop_policy': 'oldest',
  'knobs.jitterbuffer.log_level': 'warn',

  // RTP Packet Handling Knobs (from section 26.2)
  'knobs.rtp.timeout_seconds': 30,
  'knobs.rtp.keepalive_interval': 5,
  'knobs.rtp.reorder_buffer_size': 50,
  'knobs.rtp.duplicate_suppression': true,
  'knobs.rtp.late_packet_threshold': 100,
  'knobs.rtp.early_packet_threshold': 500,

  // Codec & Payload Knobs (from section 26.3)
  'knobs.codec.allowed_codecs': ['opus', 'pcmu', 'pcma'],
  'knobs.codec.preferred_codec': 'opus',
  'knobs.codec.packetization_time': 20,
  'knobs.codec.max_payload_size': 1400,
  'knobs.codec.force_transcoding': false,
  'knobs.codec.transcoding_latency_budget': 50,

  // AGC Knobs (from System_Knobs_List.md)
  'knobs.agc.enabled': true,
  'knobs.agc.target_level_dbfs': -20,
  'knobs.agc.compression_ratio': 4.0,
  'knobs.agc.attack_time_ms': 10,
  'knobs.agc.release_time_ms': 200,
  'knobs.agc.max_gain_db': 30,

  // AEC Knobs
  'knobs.aec.enabled': true,
  'knobs.aec.suppression_level_db': -30,
  'knobs.aec.tail_length_ms': 128,
  'knobs.aec.nlp_mode': 'moderate',
  'knobs.aec.convergence_time_ms': 500,

  // Noise Reduction Knobs
  'knobs.nr.enabled': true,
  'knobs.nr.suppression_level_db': -12,
  'knobs.nr.spectral_floor_db': -70,
  'knobs.nr.adaptive_mode': true,
  'knobs.nr.music_protection': false,

  // Compressor Knobs
  'knobs.compressor.enabled': false,
  'knobs.compressor.threshold_dbfs': -15,
  'knobs.compressor.ratio': 4.0,
  'knobs.compressor.attack_time_ms': 5,
  'knobs.compressor.release_time_ms': 100,
  'knobs.compressor.knee_width_db': 6,
  'knobs.compressor.makeup_gain_db': 0,

  // Limiter Knobs
  'knobs.limiter.enabled': true,
  'knobs.limiter.threshold_dbfs': -3,
  'knobs.limiter.release_time_ms': 50,
  'knobs.limiter.lookahead_ms': 1,
  'knobs.limiter.ceiling_level_dbfs': -1,

  // Equalizer Knobs
  'knobs.eq.enabled': false,
  'knobs.eq.preset': 'voice',
  'knobs.eq.low_shelf_gain_db': 0,
  'knobs.eq.low_shelf_freq_hz': 100,
  'knobs.eq.mid_peak_gain_db': 0,
  'knobs.eq.mid_peak_freq_hz': 1000,
  'knobs.eq.high_shelf_gain_db': 0,
  'knobs.eq.high_shelf_freq_hz': 8000,

  // Buffer Management Knobs
  'knobs.buffer.size_ms': 200,
  'knobs.buffer.min_size_ms': 40,
  'knobs.buffer.max_size_ms': 1000,
  'knobs.buffer.target_level_pct': 55,
  'knobs.buffer.adaptive_mode': true,
  'knobs.buffer.underrun_threshold_ms': 20,
  'knobs.buffer.overrun_threshold_ms': 500,
  'knobs.buffer.growth_rate': 1.5,
  'knobs.buffer.shrink_rate': 0.9,
  'knobs.buffer.packet_loss_concealment': true,

  // Network Configuration Knobs
  'knobs.network.codec': 'opus',
  'knobs.network.bitrate_kbps': 64,
  'knobs.network.packet_size_ms': 20,
  'knobs.network.dtx_enabled': true,
  'knobs.network.vad_mode': 'normal',
  'knobs.network.redundancy_level': 0,
  'knobs.network.retransmission_enabled': true,
  'knobs.network.congestion_control': 'adaptive',
  'knobs.network.qos_dscp': 40,
  'knobs.network.mtu_size': 1400,

  // Asterisk Channel Knobs
  'knobs.asterisk.channel_media_timeout': 30,
  'knobs.asterisk.channel_silence_threshold': 250,
  'knobs.asterisk.channel_hold_music_enable': true,
  'knobs.asterisk.channel_audiohook_enable': false,
  'knobs.asterisk.channel_monitoring_enable': true,
  'knobs.asterisk.echo_cancel': 128,
  'knobs.asterisk.rx_gain': 0,
  'knobs.asterisk.tx_gain': 0,
  'knobs.asterisk.dtmf_mode': 'rfc2833',
  'knobs.asterisk.nat_mode': 'auto',

  // Gateway Settings Knobs
  'knobs.gateway.ws_reconnect_interval_ms': 2000,
  'knobs.gateway.ws_max_reconnects': 10,
  'knobs.gateway.audio_chunk_size': 1024,
  'knobs.gateway.sample_rate': 16000,
  'knobs.gateway.channels': 1,
  'knobs.gateway.encoding': 'pcm',
  'knobs.gateway.stream_timeout_ms': 90000,
  'knobs.gateway.debug_mode': false,

  // Deepgram STT Knobs
  'knobs.deepgram.model': 'nova-2',
  'knobs.deepgram.language': 'en-US',
  'knobs.deepgram.punctuate': true,
  'knobs.deepgram.profanity_filter': true,
  'knobs.deepgram.redact': false,
  'knobs.deepgram.diarize': false,
  'knobs.deepgram.smart_format': true,
  'knobs.deepgram.interim_results': true,
  'knobs.deepgram.endpointing': 500,
  'knobs.deepgram.vad_turnoff': 600,

  // Translation Knobs
  'knobs.translation.source_lang': 'en',
  'knobs.translation.target_lang': 'es',
  'knobs.translation.formality': 'default',
  'knobs.translation.preserve_formatting': true,
  'knobs.translation.max_length': 4000,
  'knobs.translation.timeout_ms': 3000,
  'knobs.translation.cache_enabled': true,

  // TTS Knobs
  'knobs.tts.voice_id': 'rachel',
  'knobs.tts.stability': 0.5,
  'knobs.tts.similarity_boost': 0.7,
  'knobs.tts.style': 0,
  'knobs.tts.use_speaker_boost': true,
  'knobs.tts.model': 'eleven_monolingual_v1',
  'knobs.tts.optimize_streaming_latency': 2,
  'knobs.tts.output_format': 'pcm_16000',

  // Safety & Permission Knobs (Critical)
  'knobs.safety.auto_jitterbuffer_adjust_allowed': true,
  'knobs.safety.max_auto_jitterbuffer_change': 50,
  'knobs.safety.auto_codec_switch_allowed': false,
  'knobs.safety.requires_call_restart': false,
  'knobs.safety.ai_control_allowed': true,
  'knobs.safety.ai_max_adjustment': 0.3,
  'knobs.safety.manual_override_required': false,
  'knobs.safety.rollback_on_failure': true,

  // System Runtime Knobs
  'knobs.system.thread_priority': 'high',
  'knobs.system.cpu_affinity': null,
  'knobs.system.memory_limit_mb': 2048,
  'knobs.system.gc_interval_ms': 60000,
  'knobs.system.log_level': 'info',
  'knobs.system.metrics_interval_ms': 2000,
  'knobs.system.health_check_interval_ms': 5000,
  'knobs.system.restart_on_error': true,
  'knobs.system.max_restart_attempts': 5,
  'knobs.system.watchdog_timeout_ms': 60000,

  // Temporal Control Knobs (generic across metrics)
  'knobs.temporal.smoothing_window_ms': 100,
  'knobs.temporal.debounce_time_ms': 50,
  'knobs.temporal.attack_time_ms': 10,
  'knobs.temporal.release_time_ms': 100,
  'knobs.temporal.grace_period_ms': 500,

  // Auto-Adjustment Knobs (generic)
  'knobs.auto.adjust_enabled': true,
  'knobs.auto.adjust_step': 0.1,
  'knobs.auto.adjust_max': 1.5,
  'knobs.auto.adjust_min': 0.5,
  'knobs.auto.recovery_rate': 0.05,
  'knobs.auto.clamp_enabled': true,

  // === Legacy Control Knobs (for backward compatibility) ===
  // Main control knobs (8 total, ±150 range)
  'main_volume': 0,
  'balance': 0,
  'treble': 0,
  'bass': 0,
  'gain': 0,
  'compression': 0,
  'noise_gate': 0,
  'reverb': 0
};

module.exports = unifiedKnobs;