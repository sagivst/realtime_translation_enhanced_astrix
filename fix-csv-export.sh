#!/bin/bash

# Fix CSV export and show actual data

echo "Fixing CSV export and database viewing..."

ssh azureuser@20.170.155.53 'bash -s' << 'SCRIPT'
# Create proper CSV exporter using PostgreSQL directly
cat > /home/azureuser/export-proper-csv.sh << 'EOF'
#!/bin/bash

echo "Exporting database to proper CSV format..."

# Export using PostgreSQL COPY command
sudo -u postgres psql audio_optimization << 'SQL' > /home/azureuser/database-export.csv
COPY (
    SELECT
        ss.id as "Record_ID",
        ss.station_id as "Station_ID",
        ss.timestamp as "Timestamp",
        COALESCE(ss.audio_ref, 'No_Audio') as "Audio_File",
        c.external_call_id as "Call_ID",
        ch.name as "Channel",
        s.start_ms as "Segment_Start_ms",
        s.end_ms as "Segment_End_ms",
        s.segment_type as "Segment_Type",
        -- Extract specific metrics (first 20 as example)
        ss.metrics->>'buffer_usage_pct' as "buffer_usage_pct",
        ss.metrics->>'buffer_underruns' as "buffer_underruns",
        ss.metrics->>'buffer_overruns' as "buffer_overruns",
        ss.metrics->>'snr_db' as "snr_db",
        ss.metrics->>'noise_floor_db' as "noise_floor_db",
        ss.metrics->>'speech_activity_pct' as "speech_activity_pct",
        ss.metrics->>'processing_latency' as "processing_latency",
        ss.metrics->>'total_latency' as "total_latency",
        ss.metrics->>'packets_sent' as "packets_sent",
        ss.metrics->>'packets_lost' as "packets_lost",
        ss.metrics->>'audio_level_dbfs' as "audio_level_dbfs",
        ss.metrics->>'peak_amplitude' as "peak_amplitude",
        ss.metrics->>'cpu_usage_pct' as "cpu_usage_pct",
        ss.metrics->>'memory_usage_mb' as "memory_usage_mb",
        ss.metrics->>'throughput_mbps' as "throughput_mbps",
        jsonb_array_length(ss.logs) as "Log_Count",
        json_object_keys(ss.metrics::json) as "Available_Metrics"
    FROM station_snapshots ss
    LEFT JOIN segments s ON ss.segment_id = s.id
    LEFT JOIN channels ch ON s.channel_id = ch.id
    LEFT JOIN calls c ON ch.call_id = c.id
    ORDER BY ss.timestamp DESC
) TO STDOUT WITH CSV HEADER;
SQL

echo "CSV export complete: /home/azureuser/database-export.csv"

# Also create a JSON export with all data
sudo -u postgres psql -t audio_optimization << 'SQL' > /home/azureuser/database-export.json
SELECT json_agg(row_to_json(t)) FROM (
    SELECT
        ss.*,
        s.start_ms,
        s.end_ms,
        s.segment_type,
        ch.name as channel_name,
        c.external_call_id
    FROM station_snapshots ss
    LEFT JOIN segments s ON ss.segment_id = s.id
    LEFT JOIN channels ch ON s.channel_id = ch.id
    LEFT JOIN calls c ON ch.call_id = c.id
    ORDER BY ss.timestamp DESC
) t;
SQL

echo "JSON export complete: /home/azureuser/database-export.json"

# Show summary
echo ""
echo "Database Summary:"
sudo -u postgres psql -t audio_optimization << 'SQL'
SELECT
    'Total Records: ' || COUNT(*) ||
    ', Stations: ' || string_agg(DISTINCT station_id, ', ') ||
    ', Latest: ' || MAX(timestamp)::text
FROM station_snapshots;
SQL

EOF

chmod +x /home/azureuser/export-proper-csv.sh
/home/azureuser/export-proper-csv.sh

# Show first few lines of CSV
echo ""
echo "First 5 lines of CSV:"
head -5 /home/azureuser/database-export.csv

# Count records with actual metrics
echo ""
echo "Records with metrics:"
sudo -u postgres psql -t audio_optimization << 'SQL'
SELECT
    station_id,
    COUNT(*) as records,
    COUNT(CASE WHEN metrics->>'snr_db' != 'NA' THEN 1 END) as with_snr,
    COUNT(CASE WHEN audio_ref IS NOT NULL THEN 1 END) as with_audio
FROM station_snapshots
GROUP BY station_id
ORDER BY station_id;
SQL

SCRIPT

echo "Done! Downloading files..."

# Download the CSV and JSON files
scp azureuser@20.170.155.53:/home/azureuser/database-export.csv /Users/sagivstavinsky/realtime-translation-enhanced_astrix/
scp azureuser@20.170.155.53:/home/azureuser/database-export.json /Users/sagivstavinsky/realtime-translation-enhanced_astrix/

echo "Files downloaded to local directory"