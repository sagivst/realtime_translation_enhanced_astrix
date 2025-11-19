#!/bin/bash
# VTT-TTV Startup - Full AI Translation Pipeline
echo '==================================================================='
echo '  VTT-TTV-SERVER - Full AI Translation Pipeline'
echo '  Extensions 5555 (English) <-> 6666 (French)'
echo '  ASR -> Translation -> TTS -> Timing Sync'
echo '==================================================================='

cd /home/azureuser/translation-app/5555-6666-gstreamer-phase1

# Kill any existing processes
echo 'Stopping existing processes...'
pkill -f 'conf-server-phase1.js|vtt-ttv-server.js|gateway-5555|gateway-6666|ari-gstreamer' 2>/dev/null
sleep 2

# Start VTT-TTV server (must start first - provides UDP ports)
echo 'Starting vtt-ttv-server.js...'
nohup node vtt-ttv-server.js > logs/vtt-ttv-server.log 2>&1 &
echo "  PID: $!"
sleep 3

# Start gateway-5555
echo 'Starting gateway-5555.js...'
nohup node gateway-5555.js > logs/gateway-5555.log 2>&1 &
echo "  PID: $!"
sleep 1

# Start gateway-6666-buffered (CRITICAL: use buffered version)
echo 'Starting gateway-6666-buffered.js...'
nohup node gateway-6666-buffered.js > logs/gateway-6666-buffered.log 2>&1 &
echo "  PID: $!"
sleep 1

# Start ARI handler
echo 'Starting ari-gstreamer-phase1.js...'
nohup node ari-gstreamer-phase1.js > logs/ari-phase1.log 2>&1 &
echo "  PID: $!"
sleep 2

echo ''
echo '==================================================================='
echo '  VTT-TTV-SERVER Started - Full AI Pipeline'
echo '==================================================================='
echo ''
ps aux | grep -E 'vtt-ttv-server|gateway-5555|gateway-6666-buffered|ari-gstreamer' | grep -v grep
echo ''
echo 'Dashboards:'
echo '  Main:         http://20.170.155.53:3001/'
echo '  Monitoring:   http://20.170.155.53:3001/monitoring-dashboard.html'
echo '  Transcripts:  http://20.170.155.53:3001/live-transcription-monitor.html'
echo ''
echo 'To test: Call 5555 (English) and 6666 (French)'
echo '  - Speak English into 5555 -> Hear French on 6666'
echo '  - Speak French into 6666 -> Hear English on 5555'
