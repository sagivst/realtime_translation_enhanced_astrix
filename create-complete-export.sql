-- Complete export with all 75 metrics and specification fields
-- For AI-Driven Recursive Audio Optimization System

\COPY (
SELECT
    -- Core identification fields
    ss.id as "snapshot_id",
    ss.station_id,
    ss.timestamp,
    ss.audio_ref,

    -- Call and segment context (from specification)
    c.external_call_id as "call_id",
    ch.name as "channel",
    ch.leg as "channel_leg",
    s.start_ms as "segment_start_ms",
    s.end_ms as "segment_end_ms",
    s.segment_type,
    s.transcript as "segment_transcript",

    -- All 75 metrics (Buffer Metrics - 15)
    ss.metrics->>'buffer_usage_pct' as "buffer_usage_pct",
    ss.metrics->>'buffer_underruns' as "buffer_underruns",
    ss.metrics->>'buffer_overruns' as "buffer_overruns",
    ss.metrics->>'buffer_fill_rate' as "buffer_fill_rate",
    ss.metrics->>'buffer_drain_rate' as "buffer_drain_rate",
    ss.metrics->>'buffer_health' as "buffer_health",
    ss.metrics->>'circular_buffer_usage' as "circular_buffer_usage",
    ss.metrics->>'jitter_buffer_size' as "jitter_buffer_size",
    ss.metrics->>'adaptive_buffer_size' as "adaptive_buffer_size",
    ss.metrics->>'buffer_reset_count' as "buffer_reset_count",
    ss.metrics->>'max_buffer_usage' as "max_buffer_usage",
    ss.metrics->>'min_buffer_free' as "min_buffer_free",
    ss.metrics->>'buffer_allocation_failures' as "buffer_allocation_failures",
    ss.metrics->>'buffer_resize_events' as "buffer_resize_events",
    ss.metrics->>'buffer_latency_ms' as "buffer_latency_ms",

    -- Latency Metrics (15)
    ss.metrics->>'processing_latency' as "processing_latency",
    ss.metrics->>'network_latency' as "network_latency",
    ss.metrics->>'codec_latency' as "codec_latency",
    ss.metrics->>'total_latency' as "total_latency",
    ss.metrics->>'rtt_ms' as "rtt_ms",
    ss.metrics->>'one_way_delay' as "one_way_delay",
    ss.metrics->>'jitter_ms' as "jitter_ms",
    ss.metrics->>'max_latency_spike' as "max_latency_spike",
    ss.metrics->>'latency_stability' as "latency_stability",
    ss.metrics->>'percentile_95_latency' as "percentile_95_latency",
    ss.metrics->>'percentile_99_latency' as "percentile_99_latency",
    ss.metrics->>'average_latency' as "average_latency",
    ss.metrics->>'latency_variance' as "latency_variance",
    ss.metrics->>'latency_trend' as "latency_trend",
    ss.metrics->>'qos_latency_score' as "qos_latency_score",

    -- Packet Metrics (15)
    ss.metrics->>'packets_sent' as "packets_sent",
    ss.metrics->>'packets_received' as "packets_received",
    ss.metrics->>'packets_lost' as "packets_lost",
    ss.metrics->>'packet_loss_rate' as "packet_loss_rate",
    ss.metrics->>'packets_recovered' as "packets_recovered",
    ss.metrics->>'fec_packets' as "fec_packets",
    ss.metrics->>'retransmitted_packets' as "retransmitted_packets",
    ss.metrics->>'out_of_order_packets' as "out_of_order_packets",
    ss.metrics->>'duplicate_packets' as "duplicate_packets",
    ss.metrics->>'packet_jitter' as "packet_jitter",
    ss.metrics->>'interarrival_jitter' as "interarrival_jitter",
    ss.metrics->>'packet_size_avg' as "packet_size_avg",
    ss.metrics->>'packet_size_variance' as "packet_size_variance",
    ss.metrics->>'burst_loss_rate' as "burst_loss_rate",
    ss.metrics->>'gap_loss_rate' as "gap_loss_rate",

    -- Audio Quality Metrics (15)
    ss.metrics->>'audio_level_dbfs' as "audio_level_dbfs",
    ss.metrics->>'peak_amplitude' as "peak_amplitude",
    ss.metrics->>'rms_level' as "rms_level",
    ss.metrics->>'snr_db' as "snr_db",
    ss.metrics->>'thd_percent' as "thd_percent",
    ss.metrics->>'noise_floor_db' as "noise_floor_db",
    ss.metrics->>'speech_activity' as "speech_activity",
    ss.metrics->>'silence_ratio' as "silence_ratio",
    ss.metrics->>'clipping_count' as "clipping_count",
    ss.metrics->>'zero_crossing_rate' as "zero_crossing_rate",
    ss.metrics->>'spectral_centroid' as "spectral_centroid",
    ss.metrics->>'spectral_rolloff' as "spectral_rolloff",
    ss.metrics->>'mfcc_features' as "mfcc_features",
    ss.metrics->>'pitch_frequency' as "pitch_frequency",
    ss.metrics->>'formant_frequencies' as "formant_frequencies",

    -- Performance Metrics (15)
    ss.metrics->>'cpu_usage_pct' as "cpu_usage_pct",
    ss.metrics->>'memory_usage_mb' as "memory_usage_mb",
    ss.metrics->>'thread_count' as "thread_count",
    ss.metrics->>'handle_count' as "handle_count",
    ss.metrics->>'io_operations' as "io_operations",
    ss.metrics->>'cache_hits' as "cache_hits",
    ss.metrics->>'cache_misses' as "cache_misses",
    ss.metrics->>'gc_collections' as "gc_collections",
    ss.metrics->>'heap_allocated' as "heap_allocated",
    ss.metrics->>'heap_used' as "heap_used",
    ss.metrics->>'event_loop_lag' as "event_loop_lag",
    ss.metrics->>'function_call_rate' as "function_call_rate",
    ss.metrics->>'error_rate' as "error_rate",
    ss.metrics->>'success_rate' as "success_rate",
    ss.metrics->>'throughput_mbps' as "throughput_mbps",

    -- Additional specification fields
    jsonb_array_length(ss.logs) as "log_count",
    ss.logs::text as "logs_json"

FROM station_snapshots ss
LEFT JOIN segments s ON ss.segment_id = s.id
LEFT JOIN channels ch ON s.channel_id = ch.id
LEFT JOIN calls c ON ch.call_id = c.id
ORDER BY ss.timestamp DESC
) TO '/tmp/complete-75-metrics.csv' WITH CSV HEADER;