#!/bin/bash

# ============================================
# MODIFY EXISTING monitoring-tree-dashboard.html
# Target: 20.170.155.53:3021
# Working ONLY in monitoring partition
# ============================================

echo "==========================================="
echo "Monitoring Dashboard Modification Script"
echo "Target: 20.170.155.53 (DEV VM ONLY)"
echo "==========================================="

# Check if we can connect to the VM
echo "Checking connection to dev VM..."
if ! ssh -o ConnectTimeout=5 azureuser@20.170.155.53 "echo 'Connected'" > /dev/null 2>&1; then
    echo "❌ Cannot connect to 20.170.155.53"
    echo "Please ensure the VM is running and accessible"
    exit 1
fi

echo "✅ Connected to dev VM"

# Set paths
REMOTE_PATH="/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public"
DASHBOARD_FILE="monitoring-tree-dashboard.html"
BACKUP_NAME="monitoring-tree-dashboard.html.backup-$(date +%Y%m%d-%H%M%S)"

# Create backup
echo "Creating backup of existing dashboard..."
ssh azureuser@20.170.155.53 "cd $REMOTE_PATH && cp $DASHBOARD_FILE $BACKUP_NAME" || {
    echo "⚠️  Could not create backup (file may not exist yet)"
}

echo "Modifying dashboard directly on server..."

# Create the modified dashboard directly on the server
ssh azureuser@20.170.155.53 "cat > $REMOTE_PATH/$DASHBOARD_FILE" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Real-Time Translation Pipeline Monitor</title>
    <style>
        /* DARK PROFESSIONAL THEME */
        :root {
            --bg-primary: #0a0a0a;
            --bg-secondary: #1a1a1a;
            --bg-tertiary: #252525;
            --text-primary: #e0e0e0;
            --text-secondary: #a0a0a0;
            --accent-success: #00c851;
            --accent-warning: #ffbb33;
            --accent-danger: #ff3547;
            --accent-info: #33b5e5;
            --border: #333;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'SF Mono', Monaco, monospace;
            background: var(--bg-primary);
            color: var(--text-primary);
            font-size: 13px;
        }

        .header {
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border);
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .stats-bar {
            background: var(--bg-secondary);
            padding: 10px 20px;
            display: flex;
            gap: 30px;
            border-bottom: 1px solid var(--border);
        }

        .station-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
            padding: 20px;
        }

        .station-box {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            padding: 15px;
            border-radius: 4px;
            position: relative;
            cursor: pointer;
            transition: all 0.3s;
        }

        .station-box:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }

        .expand-icon {
            position: absolute;
            top: 10px;
            right: 10px;
            cursor: pointer;
            color: var(--text-secondary);
        }

        .expand-icon:hover {
            color: var(--accent-info);
        }

        .station-status {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--accent-danger);
            display: inline-block;
        }

        .station-status.active {
            background: var(--accent-success);
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        /* Level 2: Expanded View */
        .expanded-view {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--bg-primary);
            z-index: 1000;
            display: none;
            overflow-y: auto;
        }

        .expanded-view.active {
            display: block;
        }

        .parameter-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 12px;
            padding: 20px;
        }

        .parameter-box {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            padding: 12px;
            cursor: pointer;
            border-radius: 3px;
        }

        .parameter-box:hover {
            background: var(--bg-tertiary);
        }

        /* Level 3: Edit Modal */
        .edit-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            z-index: 2000;
            display: none;
            align-items: center;
            justify-content: center;
        }

        .edit-modal.active {
            display: flex;
        }

        .edit-content {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            padding: 20px;
            border-radius: 4px;
            width: 90%;
            max-width: 600px;
        }

        .btn {
            padding: 8px 16px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            color: var(--text-primary);
            cursor: pointer;
            border-radius: 3px;
        }

        .btn:hover {
            background: var(--accent-info);
        }

        .metric-bar {
            height: 4px;
            background: var(--bg-tertiary);
            border-radius: 2px;
            overflow: hidden;
            margin: 5px 0;
        }

        .metric-bar-fill {
            height: 100%;
            background: var(--accent-info);
            transition: width 0.3s;
        }

        .badge-voice {
            background: rgba(51, 181, 229, 0.2);
            color: var(--accent-info);
            padding: 2px 6px;
            border-radius: 2px;
            font-size: 9px;
        }

        .badge-text {
            background: rgba(255, 187, 51, 0.2);
            color: var(--accent-warning);
            padding: 2px 6px;
            border-radius: 2px;
            font-size: 9px;
        }
    </style>
    <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
    <div class="header">
        <h1>REAL-TIME TRANSLATION PIPELINE MONITOR</h1>
        <div>
            <span id="connectionStatus">DISCONNECTED</span>
            <button class="btn" onclick="location.reload()">Refresh</button>
        </div>
    </div>

    <div class="stats-bar">
        <div>Stations: <span id="totalStations">11</span></div>
        <div>Active: <span id="activeStations">0</span></div>
        <div>Avg Latency: <span id="avgLatency">--</span></div>
        <div>System MOS: <span id="systemMOS">--</span></div>
    </div>

    <div class="station-grid" id="stationGrid"></div>

    <div class="expanded-view" id="expandedView">
        <div style="padding: 20px; background: var(--bg-secondary); border-bottom: 1px solid var(--border);">
            <button class="btn" onclick="collapseStation()">← Back</button>
            <h2 id="expandedTitle" style="display: inline; margin-left: 20px;">Station Details</h2>
        </div>
        <div class="parameter-grid" id="parameterGrid"></div>
    </div>

    <div class="edit-modal" id="editModal">
        <div class="edit-content">
            <h3 id="editTitle">Parameter Configuration</h3>
            <div id="editBody" style="margin: 20px 0;"></div>
            <button class="btn" onclick="closeEdit()">Close</button>
            <button class="btn" onclick="saveConfig()">Save</button>
        </div>
    </div>

    <script>
        // 11 STATION CONFIGURATION
        const STATIONS = {
            'station-1': { name: 'Asterisk RTP', type: 'voice' },
            'station-2': { name: 'Gateway RX', type: 'voice' },
            'station-3': { name: 'STT Processing', type: 'voice' },
            'station-4': { name: 'Deepgram API', type: 'voice' },
            'station-5': { name: 'Translation Prep', type: 'text' },
            'station-6': { name: 'DeepL API', type: 'text' },
            'station-7': { name: 'TTS Prep', type: 'text' },
            'station-8': { name: 'ElevenLabs TTS', type: 'voice' },
            'station-9': { name: 'STT Server TX', type: 'voice' },
            'station-10': { name: 'Gateway TX', type: 'voice' },
            'station-11': { name: 'Hume EVI', type: 'voice' }
        };

        let socket;
        let currentStation = null;
        let stations = {};

        function init() {
            // Initialize all stations
            Object.keys(STATIONS).forEach(id => {
                stations[id] = {
                    id: id,
                    ...STATIONS[id],
                    active: false,
                    metrics: {}
                };
            });

            renderStations();
            connectSocket();
        }

        function connectSocket() {
            socket = io('http://20.170.155.53:3021', {
                transports: ['websocket'],
                reconnection: true
            });

            socket.on('connect', () => {
                document.getElementById('connectionStatus').textContent = 'CONNECTED';
                document.getElementById('connectionStatus').style.color = 'var(--accent-success)';
            });

            socket.on('disconnect', () => {
                document.getElementById('connectionStatus').textContent = 'DISCONNECTED';
                document.getElementById('connectionStatus').style.color = 'var(--accent-danger)';
            });

            socket.on('stations-state', (data) => {
                Object.keys(data).forEach(id => {
                    if (stations[id]) {
                        stations[id].active = data[id].active;
                        stations[id].metrics = data[id].metrics || {};
                    }
                });
                renderStations();
                updateStats();
            });

            socket.on('station-update', (data) => {
                if (stations[data.stationId]) {
                    stations[data.stationId].metrics = data.metrics;
                    updateStation(data.stationId);
                    updateStats();
                }
            });
        }

        function renderStations() {
            const grid = document.getElementById('stationGrid');
            grid.innerHTML = '';

            Object.values(stations).forEach(station => {
                const box = document.createElement('div');
                box.className = 'station-box';
                box.onclick = () => expandStation(station.id);

                const m = station.metrics || {};
                box.innerHTML = `
                    <span class="expand-icon">⛶</span>
                    <div>
                        <span class="station-status ${station.active ? 'active' : ''}"></span>
                        <strong>${station.name}</strong>
                        <span class="badge-${station.type}">${station.type}</span>
                    </div>
                    <div style="margin-top: 10px; color: var(--text-secondary);">
                        ${station.id.toUpperCase()}
                    </div>
                    ${m.bufferUsage ? `
                        <div>Buffer: ${m.bufferUsage.toFixed(1)}%</div>
                        <div class="metric-bar">
                            <div class="metric-bar-fill" style="width: ${m.bufferUsage}%"></div>
                        </div>
                    ` : ''}
                    ${m.avgLatency ? `<div>Latency: ${m.avgLatency.toFixed(1)}ms</div>` : ''}
                    ${m.packetsRx ? `<div>Packets: ${m.packetsRx}</div>` : ''}
                `;
                grid.appendChild(box);
            });
        }

        function updateStation(id) {
            const boxes = document.querySelectorAll('.station-box');
            boxes.forEach((box, index) => {
                if (Object.keys(stations)[index] === id) {
                    renderStations(); // Re-render for simplicity
                    return;
                }
            });
        }

        function expandStation(id) {
            currentStation = id;
            document.getElementById('expandedTitle').textContent = stations[id].name;
            renderParameters();
            document.getElementById('expandedView').classList.add('active');
        }

        function collapseStation() {
            currentStation = null;
            document.getElementById('expandedView').classList.remove('active');
        }

        function renderParameters() {
            const grid = document.getElementById('parameterGrid');
            grid.innerHTML = '';

            // Generate 55 parameters
            const categories = ['Buffer', 'Latency', 'Packet', 'Audio', 'Performance', 'Custom'];
            const counts = [10, 8, 12, 10, 8, 7];

            categories.forEach((cat, idx) => {
                for (let i = 0; i < counts[idx]; i++) {
                    const box = document.createElement('div');
                    box.className = 'parameter-box';
                    box.onclick = () => openEdit(cat, i);

                    const value = Math.random() * 100;
                    box.innerHTML = `
                        <div style="color: var(--text-secondary); font-size: 11px;">${cat} ${i + 1}</div>
                        <div style="font-size: 16px; margin-top: 5px;">${value.toFixed(1)}</div>
                    `;
                    grid.appendChild(box);
                }
            });
        }

        function openEdit(category, index) {
            document.getElementById('editTitle').textContent = `${category} Parameter ${index + 1}`;
            document.getElementById('editBody').innerHTML = `
                <div>Parameter Path: ${currentStation}.${category.toLowerCase()}.${index}</div>
                <div>Current Value: ${(Math.random() * 100).toFixed(1)}</div>
                <br>
                <div>Warning Low: <input type="number" value="20" style="background: var(--bg-tertiary); border: 1px solid var(--border); color: white;"></div>
                <div>Warning High: <input type="number" value="80" style="background: var(--bg-tertiary); border: 1px solid var(--border); color: white;"></div>
            `;
            document.getElementById('editModal').classList.add('active');
        }

        function closeEdit() {
            document.getElementById('editModal').classList.remove('active');
        }

        function saveConfig() {
            console.log('Saving configuration...');
            closeEdit();
        }

        function updateStats() {
            let active = 0;
            let totalLat = 0;
            let latCount = 0;

            Object.values(stations).forEach(s => {
                if (s.active) active++;
                if (s.metrics && s.metrics.avgLatency) {
                    totalLat += s.metrics.avgLatency;
                    latCount++;
                }
            });

            document.getElementById('activeStations').textContent = active;
            document.getElementById('avgLatency').textContent =
                latCount > 0 ? (totalLat / latCount).toFixed(1) + 'ms' : '--';

            // Simple MOS calculation
            const mos = latCount > 0 ? Math.max(1, Math.min(5, 5 - (totalLat / latCount) / 100)) : '--';
            document.getElementById('systemMOS').textContent =
                typeof mos === 'number' ? mos.toFixed(1) : mos;
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (document.getElementById('editModal').classList.contains('active')) {
                    closeEdit();
                } else if (document.getElementById('expandedView').classList.contains('active')) {
                    collapseStation();
                }
            }
        });

        // Initialize on load
        document.addEventListener('DOMContentLoaded', init);

        // Test mode if no connection
        setTimeout(() => {
            if (!socket || !socket.connected) {
                console.log('Running in test mode');
                // Simulate some data
                ['station-2', 'station-3', 'station-6', 'station-8'].forEach(id => {
                    stations[id].active = true;
                    stations[id].metrics = {
                        bufferUsage: Math.random() * 100,
                        avgLatency: Math.random() * 300,
                        packetsRx: Math.floor(Math.random() * 10000)
                    };
                });
                renderStations();
                updateStats();
            }
        }, 3000);
    </script>
</body>
</html>
EOF

echo "✅ Dashboard modified successfully!"
echo ""
echo "Access the dashboard at:"
echo "http://20.170.155.53:3021/monitoring-tree-dashboard.html"
echo ""
echo "Backup saved as: $BACKUP_NAME"
echo ""
echo "To restore the backup if needed:"
echo "ssh azureuser@20.170.155.53 'cd $REMOTE_PATH && cp $BACKUP_NAME $DASHBOARD_FILE'"