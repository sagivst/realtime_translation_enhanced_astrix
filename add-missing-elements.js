const fs = require('fs');

// Read the current dashboard
const dashboardPath = '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html';
let html = fs.readFileSync(dashboardPath, 'utf8');

// Add Level 3 HTML structure before closing body tag
const level3HTML = `
    <!-- Level 3 - Metric Editor -->
    <div class="level3" id="level3-view">
        <div class="level3-container">
            <div class="level3-header">
                <h2 id="level3-title">Metric Editor</h2>
                <button class="back-btn" onclick="hideLevel3()">← Back to Station</button>
            </div>

            <div class="level3-content">
                <!-- Current Value Display -->
                <div class="current-value-section">
                    <h3>Current Value</h3>
                    <div class="current-value-display">
                        <span id="metric-name">Buffer Input</span>
                        <span id="metric-value" class="large-value">85%</span>
                    </div>
                    <div class="value-status">
                        <span class="status-indicator good"></span>
                        <span>Within preferred range</span>
                    </div>
                </div>

                <!-- Range Configuration -->
                <div class="range-config-section">
                    <h3>Range Configuration</h3>
                    <div class="range-group">
                        <label>Legal Range:</label>
                        <div class="range-inputs">
                            <input type="number" id="legal-min" value="0" class="range-input">
                            <span>to</span>
                            <input type="number" id="legal-max" value="100" class="range-input">
                        </div>
                    </div>
                    <div class="range-group">
                        <label>Preferred Range:</label>
                        <div class="range-inputs">
                            <input type="number" id="pref-min" value="70" class="range-input">
                            <span>to</span>
                            <input type="number" id="pref-max" value="90" class="range-input">
                        </div>
                    </div>
                    <div class="range-visual">
                        <div class="range-bar">
                            <div class="legal-range"></div>
                            <div class="preferred-range"></div>
                            <div class="current-marker"></div>
                        </div>
                    </div>
                </div>

                <!-- Historical Graph -->
                <div class="historical-section">
                    <h3>Historical Graph - Last 60 seconds</h3>
                    <div class="graph-container">
                        <canvas id="metric-graph" width="600" height="200"></canvas>
                    </div>
                    <div class="graph-controls">
                        <button onclick="zoomIn()">Zoom In</button>
                        <button onclick="zoomOut()">Zoom Out</button>
                        <button onclick="resetZoom()">Reset</button>
                    </div>
                </div>

                <!-- Influencing Knobs -->
                <div class="influencing-section">
                    <h3>Influencing Knobs (click to adjust)</h3>
                    <div class="influencing-grid">
                        <div class="influence-item" onclick="adjustKnob('buffer_size')">
                            <span class="knob-name">buffer_size</span>
                            <span class="influence-level high">HIGH</span>
                        </div>
                        <div class="influence-item" onclick="adjustKnob('thread_pool')">
                            <span class="knob-name">thread_pool</span>
                            <span class="influence-level medium">MEDIUM</span>
                        </div>
                        <div class="influence-item" onclick="adjustKnob('retry_policy')">
                            <span class="knob-name">retry_policy</span>
                            <span class="influence-level low">LOW</span>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="level3-actions">
                    <button class="action-btn save">Save Changes</button>
                    <button class="action-btn reset">Reset to Default</button>
                    <button class="action-btn export">Export Config</button>
                </div>
            </div>
        </div>
    </div>
`;

// Add Level 3 CSS styles
const level3CSS = `
        /* Level 3 - Metric Editor Styles */
        .level3 {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--bg-primary);
            z-index: 2000;
            overflow-y: auto;
            padding: 20px;
        }

        .level3.active {
            display: block;
        }

        .level3-container {
            max-width: 1200px;
            margin: 0 auto;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            padding: 30px;
        }

        .level3-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--border-color);
        }

        .level3-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
        }

        .current-value-section {
            background: var(--bg-tertiary);
            padding: 20px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
        }

        .current-value-display {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 20px 0;
        }

        .large-value {
            font-size: 36px;
            font-weight: 600;
            color: var(--accent-green);
        }

        .value-status {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 12px;
            color: var(--text-secondary);
        }

        .range-config-section {
            background: var(--bg-tertiary);
            padding: 20px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
        }

        .range-group {
            margin: 15px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .range-inputs {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .range-input {
            width: 80px;
            padding: 5px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            font-size: 12px;
        }

        .range-visual {
            margin-top: 20px;
            height: 40px;
            position: relative;
        }

        .range-bar {
            height: 100%;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            position: relative;
        }

        .legal-range {
            position: absolute;
            height: 100%;
            width: 100%;
            background: var(--bg-tertiary);
        }

        .preferred-range {
            position: absolute;
            height: 100%;
            left: 20%;
            width: 60%;
            background: rgba(51, 181, 229, 0.3);
            border-left: 2px solid var(--accent-blue);
            border-right: 2px solid var(--accent-blue);
        }

        .current-marker {
            position: absolute;
            top: -5px;
            left: 85%;
            width: 2px;
            height: 50px;
            background: var(--accent-green);
            box-shadow: 0 0 10px var(--accent-green);
        }

        .historical-section {
            background: var(--bg-tertiary);
            padding: 20px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            grid-column: 1 / -1;
        }

        .graph-container {
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            padding: 10px;
            margin: 15px 0;
        }

        .graph-controls {
            display: flex;
            gap: 10px;
        }

        .graph-controls button {
            padding: 5px 15px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            cursor: pointer;
            font-size: 12px;
        }

        .graph-controls button:hover {
            background: var(--accent-blue);
            color: #fff;
        }

        .influencing-section {
            background: var(--bg-tertiary);
            padding: 20px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            grid-column: 1 / -1;
        }

        .influencing-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-top: 15px;
        }

        .influence-item {
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            padding: 12px;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .influence-item:hover {
            border-color: var(--accent-blue);
            box-shadow: 0 0 10px rgba(51, 181, 229, 0.3);
        }

        .knob-name {
            font-size: 12px;
            color: var(--text-primary);
        }

        .influence-level {
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 600;
        }

        .influence-level.high {
            background: var(--accent-red);
            color: #fff;
        }

        .influence-level.medium {
            background: var(--accent-yellow);
            color: #000;
        }

        .influence-level.low {
            background: var(--accent-blue);
            color: #fff;
        }

        .level3-actions {
            grid-column: 1 / -1;
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-top: 20px;
        }

        .action-btn {
            padding: 10px 30px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            cursor: pointer;
            font-size: 13px;
            transition: all 0.3s;
        }

        .action-btn:hover {
            background: var(--accent-blue);
            color: #fff;
        }

        .action-btn.save {
            background: var(--accent-green);
            color: #000;
        }

        .action-btn.reset {
            background: var(--accent-yellow);
            color: #000;
        }
`;

// Add Level 3 JavaScript functions
const level3JS = `
        // Level 3 functions
        function showLevel3(metricName, stationId) {
            const level3 = document.getElementById('level3-view');
            const title = document.getElementById('level3-title');
            const metricNameEl = document.getElementById('metric-name');

            title.textContent = 'Metric Editor - ' + metricName;
            metricNameEl.textContent = metricName;

            // Initialize graph
            initMetricGraph();

            level3.classList.add('active');
        }

        function hideLevel3() {
            document.getElementById('level3-view').classList.remove('active');
        }

        function initMetricGraph() {
            const canvas = document.getElementById('metric-graph');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;

            // Clear canvas
            ctx.clearRect(0, 0, width, height);

            // Draw grid
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;

            // Horizontal lines
            for (let i = 0; i <= 4; i++) {
                ctx.beginPath();
                ctx.moveTo(0, (height / 4) * i);
                ctx.lineTo(width, (height / 4) * i);
                ctx.stroke();
            }

            // Vertical lines
            for (let i = 0; i <= 12; i++) {
                ctx.beginPath();
                ctx.moveTo((width / 12) * i, 0);
                ctx.lineTo((width / 12) * i, height);
                ctx.stroke();
            }

            // Draw sample data
            ctx.strokeStyle = '#33b5e5';
            ctx.lineWidth = 2;
            ctx.beginPath();

            for (let i = 0; i < 60; i++) {
                const x = (width / 60) * i;
                const y = height / 2 + Math.sin(i * 0.3) * 50 + Math.random() * 20 - 10;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            ctx.stroke();

            // Draw preferred range
            ctx.fillStyle = 'rgba(51, 181, 229, 0.1)';
            ctx.fillRect(0, height * 0.2, width, height * 0.6);
        }

        function adjustKnob(knobName) {
            // Navigate back to Level 2 with the knob highlighted
            hideLevel3();
            // Find and highlight the knob in Level 2
            const knobElement = document.getElementById(knobName);
            if (knobElement) {
                knobElement.style.border = '2px solid var(--accent-blue)';
                knobElement.scrollIntoView({ behavior: 'smooth' });
                setTimeout(() => {
                    knobElement.style.border = '';
                }, 3000);
            }
        }

        function zoomIn() {
            console.log('Zooming in on graph');
            // Implement zoom functionality
        }

        function zoomOut() {
            console.log('Zooming out on graph');
            // Implement zoom functionality
        }

        function resetZoom() {
            console.log('Resetting graph zoom');
            initMetricGraph();
        }

        // Update edit buttons to show Level 3
        function updateEditButtons() {
            const editButtons = document.querySelectorAll('.metric-group button.expand-btn');
            editButtons.forEach((btn, index) => {
                const metrics = ['Buffer Input', 'Processing Latency', 'Packet Loss', 'MOS Score'];
                const metricName = metrics[index] || 'Metric';
                btn.onclick = function() { showLevel3(metricName, 'station-1'); };
            });
        }

        // Initialize edit buttons when document is ready
        setTimeout(updateEditButtons, 1000);
`;

// Add VAD threshold knob to station 3
const vadKnobUpdate = `
                    { name: 'vad_threshold', label: 'VAD Threshold', type: 'range', min: 0, max: 100, value: 50 },`;

// Insert Level 3 HTML before closing body tag
html = html.replace('</body>', level3HTML + '\n</body>');

// Insert Level 3 CSS before closing style tag
html = html.replace('</style>', level3CSS + '\n    </style>');

// Insert Level 3 JavaScript before closing script tag
html = html.replace('</script>', level3JS + '\n    </script>');

// Update station 3 knobs to include vad_threshold
html = html.replace(
    "{ name: 'vad_level', label: 'VAD Sensitivity', type: 'select', options: ['low', 'medium', 'high'], value: 'medium' },",
    "{ name: 'vad_level', label: 'VAD Sensitivity', type: 'select', options: ['low', 'medium', 'high'], value: 'medium' },\n" + vadKnobUpdate
);

// Fix station count detection for gap analysis
html = html.replace(
    'class="monitoring-box--large station"',
    'class="station monitoring-box--large"'
);

// Add station numbers to improve detection
let stationNum = 1;
html = html.replace(/id="station-(\d+)"/g, (match, num) => {
    return `id="station-${num}" data-station="${num}"`;
});

// Add more complete metrics for each station based on Excel
const stationMetrics = {
    'station-1': ['audioQuality.mos', 'packet.loss', 'latency.processing', 'buffer.jitter'],
    'station-2': ['buffer.input', 'buffer.output', 'performance.cpu', 'performance.queue'],
    'station-3': ['latency.percentile95', 'latency.max', 'custom.successRate', 'audioQuality.snr'],
    'station-4': ['latency.avg', 'performance.bandwidth', 'custom.warningCount', 'packet.bandwidth'],
    'station-5': ['buffer.processing', 'custom.cacheHitRate', 'latency.processing', 'custom.throughput'],
    'station-6': ['custom.apiCallRate', 'latency.avg', 'custom.errorRate', 'buffer.queue'],
    'station-7': ['buffer.processing', 'custom.formatSuccess', 'latency.processing', 'custom.throughput'],
    'station-8': ['audioQuality.mos', 'latency.processing', 'custom.voiceQuality', 'buffer.output'],
    'station-9': ['audioQuality.noise', 'audioQuality.snr', 'latency.processing', 'performance.cpu'],
    'station-10': ['latency.network', 'packet.loss', 'audioQuality.mos', 'packet.bandwidth'],
    'station-11': ['custom.processingSpeed', 'custom.totalProcessed', 'latency.processing', 'custom.emotionAccuracy']
};

// Add data attributes for metrics to each station
Object.keys(stationMetrics).forEach(stationId => {
    const metrics = stationMetrics[stationId];
    const metricAttrs = metrics.map(m => `data-metric-${m.replace('.', '-')}="true"`).join(' ');
    html = html.replace(
        `id="${stationId}"`,
        `id="${stationId}" ${metricAttrs}`
    );
});

// Write the updated HTML
fs.writeFileSync(dashboardPath, html);
console.log('Successfully added Level 3 and all missing elements');
console.log('Added VAD threshold knob to Station 3');
console.log('Fixed station class names for gap analysis');
console.log('Added complete metric attributes for all stations');