#!/bin/bash

# Deployment script for GStreamer-based 3333/4444 implementation
# Based on proper 8kHz↔16kHz audio handling requirements

echo "============================================"
echo "GStreamer Solution Deployment for 3333/4444"
echo "============================================"
echo ""

# SSH connection details
SSH_CMD="ssh azureuser@20.170.155.53"

echo "[1/7] Stopping existing Node.js gateways..."
$SSH_CMD << 'EOF'
# Stop any existing Node.js gateways
pkill -f "gateway-3333"
pkill -f "gateway-4444"
pkill -f "ari-gstreamer"

# Stop any existing GStreamer processes on our ports
pkill -f "udpsrc port=4000"
pkill -f "udpsrc port=4002"

echo "✓ Existing gateways stopped"
EOF

echo ""
echo "[2/7] Creating GStreamer gateway scripts..."
$SSH_CMD << 'EOF'
mkdir -p /home/azureuser/translation-app/3333_4444__Operational/Gateway

# Create gateway-3333-gstreamer.sh
cat > /home/azureuser/translation-app/3333_4444__Operational/Gateway/gateway-3333-gstreamer.sh << 'SCRIPT'
#!/bin/bash

echo "[Gateway-3333] Starting GStreamer pipelines with 8kHz↔16kHz conversion..."

# Clean up any existing processes
pkill -f "udpsrc port=4000"
pkill -f "udpsrc port=6120"
sleep 1

# Pipeline 1: RTP from Asterisk (4000) @ 8kHz -> PCM to STTTSserver (6120) @ 16kHz
echo "[Gateway-3333] Starting RTP(8kHz)->PCM(16kHz) pipeline..."
gst-launch-1.0 -v \
    udpsrc port=4000 caps="application/x-rtp,media=audio,clock-rate=8000,encoding-name=PCMA,channels=1,payload=8" ! \
    rtppcmadepay ! \
    alawdec ! \
    audioconvert ! \
    audioresample ! \
    audio/x-raw,format=S16LE,rate=16000,channels=1 ! \
    udpsink host=127.0.0.1 port=6120 \
    > /tmp/gstreamer-3333-rtp2pcm.log 2>&1 &

RTP2PCM_PID=$!

# Pipeline 2: PCM from STTTSserver (6121) @ 16kHz -> RTP to Asterisk (4001) @ 8kHz
echo "[Gateway-3333] Starting PCM(16kHz)->RTP(8kHz) pipeline..."
gst-launch-1.0 -v \
    udpsrc port=6121 ! \
    rawaudioparse use-sink-caps=false format=pcm pcm-format=s16le sample-rate=16000 num-channels=1 ! \
    audioconvert ! \
    audioresample ! \
    audio/x-raw,rate=8000,channels=1 ! \
    alawenc ! \
    rtppcmapay pt=8 ! \
    udpsink host=127.0.0.1 port=4001 \
    > /tmp/gstreamer-3333-pcm2rtp.log 2>&1 &

PCM2RTP_PID=$!

echo "[Gateway-3333] Pipelines started:"
echo "  RTP→PCM: PID $RTP2PCM_PID (8kHz→16kHz)"
echo "  PCM→RTP: PID $PCM2RTP_PID (16kHz→8kHz)"

# Keep running
trap "kill $RTP2PCM_PID $PCM2RTP_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
SCRIPT

# Create gateway-4444-gstreamer.sh
cat > /home/azureuser/translation-app/3333_4444__Operational/Gateway/gateway-4444-gstreamer.sh << 'SCRIPT'
#!/bin/bash

echo "[Gateway-4444] Starting GStreamer pipelines with 8kHz↔16kHz conversion..."

# Clean up any existing processes
pkill -f "udpsrc port=4002"
pkill -f "udpsrc port=6122"
sleep 1

# Pipeline 1: RTP from Asterisk (4002) @ 8kHz -> PCM to STTTSserver (6122) @ 16kHz
echo "[Gateway-4444] Starting RTP(8kHz)->PCM(16kHz) pipeline..."
gst-launch-1.0 -v \
    udpsrc port=4002 caps="application/x-rtp,media=audio,clock-rate=8000,encoding-name=PCMA,channels=1,payload=8" ! \
    rtppcmadepay ! \
    alawdec ! \
    audioconvert ! \
    audioresample ! \
    audio/x-raw,format=S16LE,rate=16000,channels=1 ! \
    udpsink host=127.0.0.1 port=6122 \
    > /tmp/gstreamer-4444-rtp2pcm.log 2>&1 &

RTP2PCM_PID=$!

# Pipeline 2: PCM from STTTSserver (6123) @ 16kHz -> RTP to Asterisk (4003) @ 8kHz
echo "[Gateway-4444] Starting PCM(16kHz)->RTP(8kHz) pipeline..."
gst-launch-1.0 -v \
    udpsrc port=6123 ! \
    rawaudioparse use-sink-caps=false format=pcm pcm-format=s16le sample-rate=16000 num-channels=1 ! \
    audioconvert ! \
    audioresample ! \
    audio/x-raw,rate=8000,channels=1 ! \
    alawenc ! \
    rtppcmapay pt=8 ! \
    udpsink host=127.0.0.1 port=4003 \
    > /tmp/gstreamer-4444-pcm2rtp.log 2>&1 &

PCM2RTP_PID=$!

echo "[Gateway-4444] Pipelines started:"
echo "  RTP→PCM: PID $RTP2PCM_PID (8kHz→16kHz)"
echo "  PCM→RTP: PID $PCM2RTP_PID (16kHz→8kHz)"

# Keep running
trap "kill $RTP2PCM_PID $PCM2RTP_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
SCRIPT

chmod +x /home/azureuser/translation-app/3333_4444__Operational/Gateway/*.sh
echo "✓ GStreamer gateway scripts created"
EOF

echo ""
echo "[3/7] Updating Asterisk dialplan for ALAW format..."
$SSH_CMD << 'EOF'
# Backup current dialplan
sudo cp /etc/asterisk/extensions.conf /etc/asterisk/extensions.conf.backup-$(date +%s)

# Check if gstreamer-phase1 context exists
if ! grep -q "\[gstreamer-phase1\]" /etc/asterisk/extensions.conf; then
    echo "Adding new gstreamer-phase1 context..."
    sudo tee -a /etc/asterisk/extensions.conf > /dev/null << 'DIALPLAN'

; ============================================
; GSTREAMER PHASE 1 - 8kHz ALAW Format
; Extensions 3333/4444 with proper audio handling
; ============================================
[gstreamer-phase1]

exten => 3333,1,NoOp(=== Extension 3333 - GStreamer with ALAW ===)
 same => n,Answer()
 same => n,Set(CHANNEL(format)=alaw)
 same => n,Playback(beep)
 same => n,ExternalMedia(app=gs3333,external_host=127.0.0.1:4000,format=alaw,transport=udp)
 same => n,Hangup()

exten => 4444,1,NoOp(=== Extension 4444 - GStreamer with ALAW ===)
 same => n,Answer()
 same => n,Set(CHANNEL(format)=alaw)
 same => n,Playback(beep)
 same => n,ExternalMedia(app=gs4444,external_host=127.0.0.1:4002,format=alaw,transport=udp)
 same => n,Hangup()
DIALPLAN
else
    echo "Updating existing gstreamer-phase1 context to use ALAW..."
    sudo sed -i '/\[gstreamer-phase1\]/,/^\[/{s/format=slin16/format=alaw/g; s/Set(CHANNEL(format)=slin16)/Set(CHANNEL(format)=alaw)/g}' /etc/asterisk/extensions.conf
fi

# Ensure routes exist in from-internal
if ! grep -q "exten => 3333,1,Goto(gstreamer-phase1,3333,1)" /etc/asterisk/extensions.conf; then
    echo "Adding routes to from-internal..."
    sudo sed -i '/\[from-internal\]/a\
; GStreamer test extensions\
exten => 3333,1,Goto(gstreamer-phase1,3333,1)\
exten => 4444,1,Goto(gstreamer-phase1,4444,1)' /etc/asterisk/extensions.conf
fi

# Reload dialplan
sudo asterisk -rx "dialplan reload"
echo "✓ Dialplan updated and reloaded"
EOF

echo ""
echo "[4/7] Verifying STTTSserver..."
$SSH_CMD << 'EOF'
# Check if STTTSserver is running
if pgrep -f STTTSserver > /dev/null; then
    echo "✓ STTTSserver is already running"
    ps aux | grep STTTSserver | grep -v grep
else
    echo "Starting STTTSserver..."
    cd /home/azureuser/translation-app/3333_4444__Operational/STTTSserver
    if [ -f STTTSserver.js ]; then
        nohup node STTTSserver.js > /tmp/sttttserver-gstreamer.log 2>&1 &
        sleep 3
        if pgrep -f STTTSserver > /dev/null; then
            echo "✓ STTTSserver started successfully"
        else
            echo "✗ Failed to start STTTSserver"
            tail -20 /tmp/sttttserver-gstreamer.log
        fi
    else
        echo "✗ STTTSserver.js not found!"
    fi
fi

# Verify ports
echo "STTTSserver ports:"
ss -tuln | grep -E "612[0-3]|3020" | awk '{print $5}'
EOF

echo ""
echo "[5/7] Starting GStreamer gateways..."
$SSH_CMD << 'EOF'
cd /home/azureuser/translation-app/3333_4444__Operational/Gateway

# Start gateway-3333
nohup ./gateway-3333-gstreamer.sh > /tmp/gateway-3333-gstreamer.log 2>&1 &
echo "✓ Started gateway-3333 (PID $!)"

# Start gateway-4444
nohup ./gateway-4444-gstreamer.sh > /tmp/gateway-4444-gstreamer.log 2>&1 &
echo "✓ Started gateway-4444 (PID $!)"

sleep 3

# Verify GStreamer processes
echo ""
echo "GStreamer processes:"
ps aux | grep gst-launch | grep -v grep | wc -l
echo "pipelines running"
EOF

echo ""
echo "[6/7] Verifying all components..."
$SSH_CMD << 'EOF'
echo "=== Process Status ==="
echo "STTTSserver: $(pgrep -f STTTSserver > /dev/null && echo '✓ Running' || echo '✗ Not running')"
echo "GStreamer 3333: $(pgrep -f "udpsrc port=4000" > /dev/null && echo '✓ Running' || echo '✗ Not running')"
echo "GStreamer 4444: $(pgrep -f "udpsrc port=4002" > /dev/null && echo '✓ Running' || echo '✗ Not running')"

echo ""
echo "=== Port Status ==="
echo "Ports 4000-4003 (GStreamer RTP):"
ss -tuln | grep -E "400[0-3]" | awk '{print "  ", $5}'
echo ""
echo "Ports 6120-6123 (STTTSserver UDP):"
ss -tuln | grep -E "612[0-3]" | awk '{print "  ", $5}'
echo ""
echo "Port 3020 (Monitoring):"
ss -tuln | grep 3020 | awk '{print "  ", $5}'
EOF

echo ""
echo "[7/7] Setting up monitoring..."
$SSH_CMD << 'EOF'
# Create monitoring script
cat > /tmp/monitor-gstreamer.sh << 'MONITOR'
#!/bin/bash
echo "=== MONITORING GSTREAMER AUDIO FLOW ==="
echo "Watching for audio packets..."
echo "Call extension 3333 or 4444 to test"
echo "Press Ctrl+C to stop"
echo ""

tail -f /tmp/gstreamer-3333-*.log /tmp/gstreamer-4444-*.log /tmp/sttttserver-gstreamer.log 2>/dev/null | \
    grep -E "Setting pipeline|PLAYING|caps =|UDP-|Transcribed|Translated|bytes" --line-buffered
MONITOR

chmod +x /tmp/monitor-gstreamer.sh
echo "✓ Monitoring script created: /tmp/monitor-gstreamer.sh"
EOF

echo ""
echo "============================================"
echo "DEPLOYMENT COMPLETE!"
echo "============================================"
echo ""
echo "Test Instructions:"
echo "1. Call extension 3333 from any phone"
echo "2. Speak in English - should hear French on 4444"
echo "3. Call extension 4444 from any phone"
echo "4. Speak in French - should hear English on 3333"
echo ""
echo "Monitor audio flow:"
echo "  ssh azureuser@20.170.155.53 '/tmp/monitor-gstreamer.sh'"
echo ""
echo "View logs:"
echo "  GStreamer 3333: tail -f /tmp/gstreamer-3333-*.log"
echo "  GStreamer 4444: tail -f /tmp/gstreamer-4444-*.log"
echo "  STTTSserver: tail -f /tmp/sttttserver-gstreamer.log"
echo ""
echo "Dashboard: http://20.170.155.53:3020/dashboard.html"