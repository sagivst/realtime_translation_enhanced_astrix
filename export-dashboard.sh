#!/bin/bash

# Export database records to HTML and CSV for viewing all 75 metrics

echo "Creating HTML dashboard and CSV export..."

# Copy script to VM and execute
ssh azureuser@20.170.155.53 'bash -s' << 'SCRIPT'
#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Generating HTML Dashboard...${NC}"

# Create HTML dashboard
cat > /home/azureuser/database-records.html << 'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audio Optimization - All 75 Metrics</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            color: #333;
            text-align: center;
            font-size: 2.5em;
            margin-bottom: 30px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        .summary {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 5px solid #667eea;
        }
        .record {
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            margin: 20px 0;
            overflow: hidden;
        }
        .record-header {
            background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 15px 20px;
            font-size: 1.2em;
            font-weight: bold;
        }
        .station-3 .record-header {
            background: linear-gradient(90deg, #fa709a 0%, #fee140 100%);
        }
        .station-9 .record-header {
            background: linear-gradient(90deg, #30cfd0 0%, #330867 100%);
        }
        .record-info {
            padding: 15px 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
        }
        .info-label {
            font-weight: 600;
            color: #495057;
        }
        .info-value {
            color: #212529;
        }
        .metrics-container {
            padding: 20px;
        }
        .metric-category {
            margin: 20px 0;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            overflow: hidden;
        }
        .category-header {
            background: #495057;
            color: white;
            padding: 10px 15px;
            font-weight: bold;
            cursor: pointer;
            user-select: none;
        }
        .category-header:hover {
            background: #343a40;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 10px;
            padding: 15px;
            background: #fff;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            background: #f8f9fa;
            border-radius: 4px;
            border-left: 3px solid #667eea;
        }
        .metric-name {
            font-weight: 500;
            color: #495057;
            font-size: 0.9em;
        }
        .metric-value {
            font-weight: bold;
            color: #212529;
        }
        .metric-value.na {
            color: #adb5bd;
            font-style: italic;
        }
        .metric-value.good {
            color: #28a745;
        }
        .metric-value.warning {
            color: #ffc107;
        }
        .metric-value.critical {
            color: #dc3545;
        }
        .controls {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
        }
        button {
            padding: 10px 20px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1em;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        button:hover {
            background: #5a67d8;
        }
        .download-btn {
            background: #28a745;
        }
        .download-btn:hover {
            background: #218838;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 Audio Optimization System - Complete Metrics Dashboard</h1>
        <div class="summary" id="summary">
            <h2>Loading database records...</h2>
        </div>
        <div id="records"></div>
        <div class="controls">
            <button onclick="toggleAll()">Expand/Collapse All</button>
            <button class="download-btn" onclick="downloadCSV()">📊 Download CSV</button>
        </div>
    </div>

    <script>
        let allRecords = [];

        // Define all 75 metrics by category
        const metricCategories = {
            "📊 Buffer Metrics": [
                "buffer_usage_pct", "buffer_underruns", "buffer_overruns", "buffer_fill_rate",
                "buffer_drain_rate", "buffer_health", "circular_buffer_usage", "jitter_buffer_size",
                "adaptive_buffer_size", "buffer_reset_count", "max_buffer_usage", "min_buffer_free",
                "buffer_allocation_failures", "buffer_resize_events", "buffer_latency_ms"
            ],
            "⏱️ Latency Metrics": [
                "processing_latency", "network_latency", "codec_latency", "total_latency",
                "rtt_ms", "one_way_delay", "jitter_ms", "max_latency_spike", "latency_stability",
                "percentile_95_latency", "percentile_99_latency", "average_latency",
                "latency_variance", "latency_trend", "qos_latency_score"
            ],
            "📦 Packet Metrics": [
                "packets_sent", "packets_received", "packets_lost", "packet_loss_rate",
                "packets_recovered", "fec_packets", "retransmitted_packets", "out_of_order_packets",
                "duplicate_packets", "packet_jitter", "interarrival_jitter", "packet_size_avg",
                "packet_size_variance", "burst_loss_rate", "gap_loss_rate"
            ],
            "🎵 Audio Quality": [
                "audio_level_dbfs", "peak_amplitude", "rms_level", "snr_db", "thd_percent",
                "noise_floor_db", "speech_activity", "silence_ratio", "clipping_count",
                "zero_crossing_rate", "spectral_centroid", "spectral_rolloff", "mfcc_features",
                "pitch_frequency", "formant_frequencies"
            ],
            "⚡ Performance": [
                "cpu_usage_pct", "memory_usage_mb", "thread_count", "handle_count",
                "io_operations", "cache_hits", "cache_misses", "gc_collections",
                "heap_allocated", "heap_used", "event_loop_lag", "function_call_rate",
                "error_rate", "success_rate", "throughput_mbps"
            ]
        };

        function getMetricClass(name, value) {
            if (value === 'NA' || value === undefined) return 'na';

            // Define thresholds for different metrics
            if (name.includes('latency') && value > 100) return 'warning';
            if (name.includes('latency') && value > 200) return 'critical';
            if (name.includes('loss') && value > 1) return 'warning';
            if (name.includes('loss') && value > 5) return 'critical';
            if (name.includes('cpu') && value > 70) return 'warning';
            if (name.includes('cpu') && value > 90) return 'critical';
            if (name === 'snr_db' && value < 20) return 'warning';
            if (name === 'snr_db' && value < 10) return 'critical';

            return '';
        }

        function renderRecords() {
            const recordsDiv = document.getElementById('records');
            let html = '';

            allRecords.forEach((record, index) => {
                const stationClass = record.station === 'STATION_3' ? 'station-3' : 'station-9';
                const metricsCount = Object.keys(record.metrics).length;

                html += `
                    <div class="record ${stationClass}">
                        <div class="record-header">
                            📍 ${record.station} - Record #${index + 1}
                        </div>
                        <div class="record-info">
                            <div class="info-row">
                                <span class="info-label">Record ID:</span>
                                <span class="info-value">${record.id}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Timestamp:</span>
                                <span class="info-value">${record.timestamp}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Audio File:</span>
                                <span class="info-value">${record.audio || 'None'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Metrics Coverage:</span>
                                <span class="info-value">${metricsCount} / 75 metrics</span>
                            </div>
                        </div>
                        <div class="metrics-container">
                `;

                // Add each metric category
                for (const [category, metrics] of Object.entries(metricCategories)) {
                    html += `
                        <div class="metric-category">
                            <div class="category-header" onclick="toggleCategory(this)">
                                ${category} (${metrics.length} metrics)
                            </div>
                            <div class="metrics-grid" style="display: block;">
                    `;

                    for (const metricName of metrics) {
                        const value = record.metrics[metricName];
                        const displayValue = value !== undefined ? value : 'NA';
                        const valueClass = getMetricClass(metricName, value);

                        html += `
                            <div class="metric">
                                <span class="metric-name">${metricName}</span>
                                <span class="metric-value ${valueClass}">${displayValue}</span>
                            </div>
                        `;
                    }

                    html += '</div></div>';
                }

                html += '</div></div>';
            });

            recordsDiv.innerHTML = html;

            // Update summary
            const summaryDiv = document.getElementById('summary');
            summaryDiv.innerHTML = `
                <h2>📊 Database Summary</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                    <div>
                        <strong>Total Records:</strong> ${allRecords.length}
                    </div>
                    <div>
                        <strong>Latest Update:</strong> ${allRecords[0]?.timestamp || 'N/A'}
                    </div>
                    <div>
                        <strong>Stations Active:</strong> ${[...new Set(allRecords.map(r => r.station))].join(', ')}
                    </div>
                    <div>
                        <strong>Full 75-Metric Records:</strong> ${allRecords.filter(r => Object.keys(r.metrics).length === 75).length}
                    </div>
                </div>
            `;
        }

        function toggleCategory(header) {
            const grid = header.nextElementSibling;
            grid.style.display = grid.style.display === 'none' ? 'block' : 'none';
        }

        function toggleAll() {
            const grids = document.querySelectorAll('.metrics-grid');
            const firstDisplay = grids[0]?.style.display || 'block';
            const newDisplay = firstDisplay === 'none' ? 'block' : 'none';
            grids.forEach(grid => grid.style.display = newDisplay);
        }

        function downloadCSV() {
            window.location.href = '/database-records.csv';
        }

        // Load data
        window.addEventListener('DOMContentLoaded', () => {
            // Data will be injected here
        });
    </script>
HTML

echo -e "${GREEN}✓ HTML template created${NC}"

# Now inject the actual data from PostgreSQL
echo -e "${YELLOW}Fetching data from database...${NC}"

# Add data to HTML
echo "<script>" >> /home/azureuser/database-records.html
echo "allRecords = [" >> /home/azureuser/database-records.html

sudo -u postgres psql -t -A audio_optimization << 'SQL' | head -20 >> /home/azureuser/database-records.html
SELECT
    '{id:"' || id || '",station:"' || station_id ||
    '",timestamp:"' || timestamp || '",audio:"' || COALESCE(audio_ref, '') ||
    '",metrics:' || metrics::text || ',logs:' || COALESCE(logs::text, '[]') || '},'
FROM station_snapshots
ORDER BY timestamp DESC;
SQL

echo "];" >> /home/azureuser/database-records.html
echo "renderRecords();" >> /home/azureuser/database-records.html
echo "</script></body></html>" >> /home/azureuser/database-records.html

echo -e "${GREEN}✓ Data injected into HTML${NC}"

# Create CSV file
echo -e "${YELLOW}Creating CSV file...${NC}"

# Create CSV header
echo '"ID","Station","Timestamp","Audio","buffer_usage_pct","buffer_underruns","buffer_overruns","buffer_fill_rate","buffer_drain_rate","buffer_health","circular_buffer_usage","jitter_buffer_size","adaptive_buffer_size","buffer_reset_count","max_buffer_usage","min_buffer_free","buffer_allocation_failures","buffer_resize_events","buffer_latency_ms","processing_latency","network_latency","codec_latency","total_latency","rtt_ms","one_way_delay","jitter_ms","max_latency_spike","latency_stability","percentile_95_latency","percentile_99_latency","average_latency","latency_variance","latency_trend","qos_latency_score","packets_sent","packets_received","packets_lost","packet_loss_rate","packets_recovered","fec_packets","retransmitted_packets","out_of_order_packets","duplicate_packets","packet_jitter","interarrival_jitter","packet_size_avg","packet_size_variance","burst_loss_rate","gap_loss_rate","audio_level_dbfs","peak_amplitude","rms_level","snr_db","thd_percent","noise_floor_db","speech_activity","silence_ratio","clipping_count","zero_crossing_rate","spectral_centroid","spectral_rolloff","mfcc_features","pitch_frequency","formant_frequencies","cpu_usage_pct","memory_usage_mb","thread_count","handle_count","io_operations","cache_hits","cache_misses","gc_collections","heap_allocated","heap_used","event_loop_lag","function_call_rate","error_rate","success_rate","throughput_mbps"' > /home/azureuser/database-records.csv

# Export data using Python for better JSON handling
cat > /home/azureuser/export-to-csv.py << 'PYTHON'
#!/usr/bin/env python3
import psycopg2
import json
import csv

# All 75 metrics in order
all_metrics = [
    "buffer_usage_pct", "buffer_underruns", "buffer_overruns", "buffer_fill_rate",
    "buffer_drain_rate", "buffer_health", "circular_buffer_usage", "jitter_buffer_size",
    "adaptive_buffer_size", "buffer_reset_count", "max_buffer_usage", "min_buffer_free",
    "buffer_allocation_failures", "buffer_resize_events", "buffer_latency_ms",
    "processing_latency", "network_latency", "codec_latency", "total_latency",
    "rtt_ms", "one_way_delay", "jitter_ms", "max_latency_spike", "latency_stability",
    "percentile_95_latency", "percentile_99_latency", "average_latency",
    "latency_variance", "latency_trend", "qos_latency_score",
    "packets_sent", "packets_received", "packets_lost", "packet_loss_rate",
    "packets_recovered", "fec_packets", "retransmitted_packets", "out_of_order_packets",
    "duplicate_packets", "packet_jitter", "interarrival_jitter", "packet_size_avg",
    "packet_size_variance", "burst_loss_rate", "gap_loss_rate",
    "audio_level_dbfs", "peak_amplitude", "rms_level", "snr_db", "thd_percent",
    "noise_floor_db", "speech_activity", "silence_ratio", "clipping_count",
    "zero_crossing_rate", "spectral_centroid", "spectral_rolloff", "mfcc_features",
    "pitch_frequency", "formant_frequencies",
    "cpu_usage_pct", "memory_usage_mb", "thread_count", "handle_count",
    "io_operations", "cache_hits", "cache_misses", "gc_collections",
    "heap_allocated", "heap_used", "event_loop_lag", "function_call_rate",
    "error_rate", "success_rate", "throughput_mbps"
]

try:
    # Connect to database
    conn = psycopg2.connect(
        host="localhost",
        database="audio_optimization",
        user="postgres"
    )
    cur = conn.cursor()

    # Query data
    cur.execute("""
        SELECT id, station_id, timestamp, audio_ref, metrics
        FROM station_snapshots
        ORDER BY timestamp DESC
    """)

    # Write to CSV
    with open('/home/azureuser/database-records.csv', 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)

        # Write header
        header = ["ID", "Station", "Timestamp", "Audio"] + all_metrics
        writer.writerow(header)

        # Write data rows
        for row in cur.fetchall():
            record_id, station, timestamp, audio, metrics_json = row

            # Parse metrics JSON
            if isinstance(metrics_json, str):
                metrics = json.loads(metrics_json)
            else:
                metrics = metrics_json or {}

            # Build row with all metrics
            csv_row = [record_id, station, timestamp, audio or "None"]
            for metric in all_metrics:
                csv_row.append(metrics.get(metric, "NA"))

            writer.writerow(csv_row)

    print("CSV export complete!")

    cur.close()
    conn.close()

except Exception as e:
    print(f"Error: {e}")
PYTHON

python3 /home/azureuser/export-to-csv.py

echo -e "${GREEN}✓ CSV file created${NC}"

# Create web server
cat > /home/azureuser/serve-dashboard.py << 'PYTHON'
#!/usr/bin/env python3
import http.server
import socketserver
import os

os.chdir('/home/azureuser')
PORT = 8080

Handler = http.server.SimpleHTTPRequestHandler

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Dashboard server running at http://20.170.155.53:{PORT}/")
        print(f"View dashboard: http://20.170.155.53:{PORT}/database-records.html")
        print(f"Download CSV: http://20.170.155.53:{PORT}/database-records.csv")
        print("\nPress Ctrl+C to stop")
        httpd.serve_forever()
except:
    print("Server stopped")
PYTHON

chmod +x /home/azureuser/serve-dashboard.py

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}    Export Complete! Files Ready${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📁 Files created:"
echo "   • HTML: /home/azureuser/database-records.html"
echo "   • CSV:  /home/azureuser/database-records.csv"
echo ""
echo "🌐 To view HTML dashboard:"
echo "   1. Start server: python3 /home/azureuser/serve-dashboard.py &"
echo "   2. Open browser: http://20.170.155.53:8080/database-records.html"
echo ""
echo "📊 To download CSV for Excel:"
echo "   scp azureuser@20.170.155.53:/home/azureuser/database-records.csv ./"
echo ""
SCRIPT

echo "Dashboard creation complete!"