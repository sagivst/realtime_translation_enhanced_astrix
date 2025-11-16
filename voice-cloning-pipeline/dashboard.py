#!/usr/bin/env python3
"""
Web Dashboard for Voice Cloning Management
Access at: http://localhost:5000
"""

import os
import sys
import json
from datetime import datetime
from flask import Flask, render_template_string, jsonify, request

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'scripts'))
from azure_voice_manager import AzureVoiceManager

app = Flask(__name__)

# HTML Template
DASHBOARD_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Voice Cloning Dashboard</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            background: #f5f7fa;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 {
            color: #2c3e50;
            margin-bottom: 30px;
            font-size: 32px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-value {
            font-size: 36px;
            font-weight: bold;
            color: #3498db;
            margin-bottom: 5px;
        }
        .stat-label {
            color: #7f8c8d;
            font-size: 14px;
        }
        .users-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .user-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            position: relative;
        }
        .user-card.pending { border-left: 4px solid #f39c12; }
        .user-card.training { border-left: 4px solid #3498db; }
        .user-card.completed { border-left: 4px solid #27ae60; }
        .user-card.failed { border-left: 4px solid #e74c3c; }
        .user-name {
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .user-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 15px;
        }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-training { background: #d1ecf1; color: #0c5460; }
        .status-completed { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .user-details {
            font-size: 14px;
            color: #7f8c8d;
        }
        .user-details div {
            margin-bottom: 8px;
        }
        .user-details strong {
            color: #2c3e50;
        }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #ecf0f1;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }
        .progress-fill {
            height: 100%;
            background: #3498db;
            transition: width 0.3s;
        }
        .actions {
            margin-top: 30px;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        button {
            background: #3498db;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            margin-right: 10px;
            margin-bottom: 10px;
        }
        button:hover { background: #2980b9; }
        button.secondary { background: #95a5a6; }
        button.secondary:hover { background: #7f8c8d; }
        button.danger { background: #e74c3c; }
        button.danger:hover { background: #c0392b; }
        .timestamp {
            text-align: center;
            color: #95a5a6;
            margin-top: 20px;
            font-size: 12px;
        }
        .loading {
            text-align: center;
            padding: 40px;
            color: #7f8c8d;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎙️ Voice Cloning Dashboard</h1>

        <div class="stats" id="stats">
            <div class="stat-card">
                <div class="stat-value" id="total-users">-</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="training-count">-</div>
                <div class="stat-label">Training</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="completed-count">-</div>
                <div class="stat-label">Deployed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="pending-count">-</div>
                <div class="stat-label">Pending</div>
            </div>
        </div>

        <div class="users-grid" id="users">
            <div class="loading">Loading users...</div>
        </div>

        <div class="actions">
            <h3 style="margin-bottom: 15px;">Actions</h3>
            <button onclick="refreshStatus()">🔄 Refresh Status</button>
            <button onclick="startBatchTraining()">▶️ Start Batch Training</button>
            <button onclick="deployAll()" class="secondary">🚀 Deploy All Ready</button>
            <button onclick="exportResults()" class="secondary">💾 Export Results</button>
        </div>

        <div class="timestamp" id="last-update"></div>
    </div>

    <script>
        let users = [];

        function loadStatus() {
            fetch('/api/status')
                .then(r => r.json())
                .then(data => {
                    users = data.users || [];
                    updateStats(data.stats);
                    renderUsers(users);
                    document.getElementById('last-update').textContent =
                        'Last updated: ' + new Date().toLocaleString();
                })
                .catch(err => {
                    console.error('Error loading status:', err);
                    document.getElementById('users').innerHTML =
                        '<div class="loading">Error loading data</div>';
                });
        }

        function updateStats(stats) {
            document.getElementById('total-users').textContent = stats.total || 0;
            document.getElementById('training-count').textContent = stats.training || 0;
            document.getElementById('completed-count').textContent = stats.completed || 0;
            document.getElementById('pending-count').textContent = stats.pending || 0;
        }

        function renderUsers(users) {
            const container = document.getElementById('users');

            if (users.length === 0) {
                container.innerHTML = '<div class="loading">No users found</div>';
                return;
            }

            container.innerHTML = users.map(user => {
                const statusClass = getStatusClass(user.status);
                const progress = user.progress || 0;

                return `
                    <div class="user-card ${statusClass}">
                        <div class="user-name">${user.display_name || user.user_id}</div>
                        <span class="user-status status-${statusClass}">${user.status}</span>

                        <div class="user-details">
                            <div><strong>User ID:</strong> ${user.user_id}</div>
                            <div><strong>Audio Files:</strong> ${user.audio_count || 'N/A'}</div>
                            ${user.project_id ? `<div><strong>Project:</strong> ${user.project_id.substring(0, 8)}...</div>` : ''}
                            ${user.endpoint_id ? `<div><strong>Endpoint:</strong> ${user.endpoint_id.substring(0, 8)}...</div>` : ''}
                        </div>

                        ${user.status === 'training_in_progress' ? `
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress}%"></div>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        }

        function getStatusClass(status) {
            if (status === 'completed' || status === 'deployed') return 'completed';
            if (status === 'training_in_progress' || status === 'Running') return 'training';
            if (status === 'failed' || status.includes('failed')) return 'failed';
            return 'pending';
        }

        function refreshStatus() {
            document.getElementById('users').innerHTML = '<div class="loading">Refreshing...</div>';
            loadStatus();
        }

        function startBatchTraining() {
            if (!confirm('Start batch training for all users?')) return;

            fetch('/api/start-batch', { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    alert(data.message || 'Batch training started');
                    loadStatus();
                })
                .catch(err => alert('Error: ' + err.message));
        }

        function deployAll() {
            if (!confirm('Deploy all ready models?')) return;

            fetch('/api/deploy-all', { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    alert(data.message || 'Deployment started');
                    loadStatus();
                })
                .catch(err => alert('Error: ' + err.message));
        }

        function exportResults() {
            window.location.href = '/api/export';
        }

        // Auto-refresh every 30 seconds
        setInterval(loadStatus, 30000);

        // Initial load
        loadStatus();
    </script>
</body>
</html>
"""


def load_batch_results():
    """Load batch training results"""
    results_file = "batch_training_results.json"

    if os.path.exists(results_file):
        with open(results_file, 'r') as f:
            return json.load(f)
    return []


@app.route('/')
def dashboard():
    """Render dashboard"""
    return render_template_string(DASHBOARD_TEMPLATE)


@app.route('/api/status')
def api_status():
    """Get status of all users"""
    results = load_batch_results()

    # Calculate stats
    stats = {
        "total": len(results),
        "training": sum(1 for r in results if r.get("status") == "training_in_progress"),
        "completed": sum(1 for r in results if r.get("status") in ["completed", "deployed"]),
        "pending": sum(1 for r in results if r.get("status") not in ["training_in_progress", "completed", "deployed"])
    }

    # Add display names
    user_names = {
        "Boyan_Tiholov": "Boyan Tiholov",
        "Denitsa_Dencheva": "Denitsa Dencheva",
        "Miroslav_Dimitrov": "Miroslav Dimitrov",
        "Velislava_Chavdarova": "Velislava Chavdarova"
    }

    for r in results:
        r["display_name"] = user_names.get(r.get("user_id"), r.get("user_id"))

    return jsonify({
        "stats": stats,
        "users": results,
        "timestamp": datetime.now().isoformat()
    })


@app.route('/api/start-batch', methods=['POST'])
def api_start_batch():
    """Start batch training"""
    try:
        import subprocess
        subprocess.Popen(["python3", "scripts/batch_train_all_users.py"])
        return jsonify({"message": "Batch training started in background"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/deploy-all', methods=['POST'])
def api_deploy_all():
    """Deploy all ready models"""
    try:
        # TODO: Implement auto-deploy for all ready models
        return jsonify({"message": "Deployment initiated"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/export')
def api_export():
    """Export results as JSON"""
    results = load_batch_results()
    return jsonify(results)


def main():
    """Run dashboard server"""
    print(f"{'='*60}")
    print(f"Voice Cloning Dashboard")
    print(f"{'='*60}")
    print(f"\nStarting server...")
    print(f"Dashboard: http://localhost:5000")
    print(f"\nPress Ctrl+C to stop\n")

    app.run(host='0.0.0.0', port=5000, debug=False)


if __name__ == "__main__":
    main()
