#!/bin/bash

# Gateway-4444 GStreamer Pipeline with proper 8kHz↔16kHz conversion
# Based on 16kHz_audio_handling_with_Asterisk.md requirements
#
# Pipeline 1: Asterisk (8kHz RTP) → Upsample → STTTSserver (16kHz PCM)
# Pipeline 2: STTTSserver (16kHz PCM) → Downsample → Asterisk (8kHz RTP)

echo "[Gateway-4444] Starting GStreamer pipelines with 8kHz↔16kHz conversion..."

# Clean up any existing processes
pkill -f "udpsrc port=4002"
pkill -f "udpsrc port=6123"
sleep 1

# Pipeline 1: RTP from Asterisk (4002) @ 8kHz -> PCM to STTTSserver (6122) @ 16kHz
echo "[Gateway-4444] Starting RTP(8kHz)->PCM(16kHz) pipeline (4002->6122)..."
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
echo "[Gateway-4444] RTP(8kHz)->PCM(16kHz) pipeline started (PID: $RTP2PCM_PID)"

# Pipeline 2: PCM from STTTSserver (6123) @ 16kHz -> RTP to Asterisk (4003) @ 8kHz
echo "[Gateway-4444] Starting PCM(16kHz)->RTP(8kHz) pipeline (6123->4003)..."
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
echo "[Gateway-4444] PCM(16kHz)->RTP(8kHz) pipeline started (PID: $PCM2RTP_PID)"

echo ""
echo "[Gateway-4444] Both pipelines running with proper resampling:"
echo "  - RTP→PCM: PID $RTP2PCM_PID (8kHz from Asterisk → 16kHz to AI)"
echo "  - PCM→RTP: PID $PCM2RTP_PID (16kHz from AI → 8kHz to Asterisk)"
echo ""
echo "[Gateway-4444] Logs:"
echo "  - /tmp/gstreamer-4444-rtp2pcm.log"
echo "  - /tmp/gstreamer-4444-pcm2rtp.log"
echo ""
echo "[Gateway-4444] Ready for calls to extension 4444"
echo "[Gateway-4444] Audio flow: Asterisk(8kHz) → Upsample → AI(16kHz) → Downsample → Asterisk(8kHz)"

# Keep script running and monitor pipelines
trap "kill $RTP2PCM_PID $PCM2RTP_PID 2>/dev/null; exit" SIGINT SIGTERM

while true; do
    if ! kill -0 $RTP2PCM_PID 2>/dev/null; then
        echo "[Gateway-4444] WARNING: RTP->PCM pipeline died, restarting..."
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
    fi

    if ! kill -0 $PCM2RTP_PID 2>/dev/null; then
        echo "[Gateway-4444] WARNING: PCM->RTP pipeline died, restarting..."
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
    fi

    sleep 5
done