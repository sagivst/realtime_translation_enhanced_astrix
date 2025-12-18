#!/bin/bash
echo "[Gateway-4444] Starting GStreamer pipelines..."

# RTP from Asterisk (8kHz ALAW) → PCM to STTTSserver (16kHz)
gst-launch-1.0 -v \
    udpsrc port=4002 caps="application/x-rtp,media=audio,clock-rate=8000,encoding-name=PCMA,channels=1,payload=8" ! \
    rtppcmadepay ! \
    alawdec ! \
    audioconvert ! \
    audioresample ! \
    audio/x-raw,format=S16LE,rate=16000,channels=1 ! \
    udpsink host=127.0.0.1 port=6122 \
    > /tmp/gstreamer-4444-rtp2pcm.log 2>&1 &
echo "✓ RTP→PCM pipeline started (PID $!)"

# PCM from STTTSserver (16kHz) → RTP to Asterisk (8kHz ALAW)
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
echo "✓ PCM→RTP pipeline started (PID $!)"

wait
