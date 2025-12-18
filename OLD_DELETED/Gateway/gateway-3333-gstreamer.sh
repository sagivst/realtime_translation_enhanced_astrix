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
