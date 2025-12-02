 📋 IMPLEMENTATION PLAN: Adding GStreamer Based on Flow Document

  PHASE 1: Install GStreamer ✅

  # Install GStreamer with all necessary plugins
  sudo apt-get update
  sudo apt-get install -y \
    gstreamer1.0-tools \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    libgstreamer1.0-dev \
    libgstreamer-plugins-base1.0-dev

  PHASE 2: Replace Simple Gateways with GStreamer Pipelines 🔧

  Gateway-3333 GStreamer Pipeline:

  #!/bin/bash
  # gateway-3333-gstreamer.sh

  # RTP from Asterisk → Decode → PCM to STTTSserver
  gst-launch-1.0 -v \
    udpsrc port=4000
  caps="application/x-rtp,media=audio,clock-rate=8000,encoding-name=PCMA" \
    ! rtppcmadepay \
    ! alawdec \
    ! audioconvert \
    ! audioresample \
    ! audio/x-raw,format=S16LE,rate=16000,channels=1 \
    ! udpsink host=127.0.0.1 port=6120 &

  # PCM from STTTSserver → Encode → RTP to Asterisk
  gst-launch-1.0 -v \
    udpsrc port=6121
  caps="audio/x-raw,format=S16LE,rate=16000,channels=1,layout=interleaved" \
    ! audioconvert \
    ! audioresample \
    ! audio/x-raw,rate=8000 \
    ! alawenc \
    ! rtppcmapay pt=8 \
    ! udpsink host=127.0.0.1 port=4001

  Gateway-4444 GStreamer Pipeline:

  #!/bin/bash
  # gateway-4444-gstreamer.sh

  # RTP from Asterisk → Decode → PCM to STTTSserver
  gst-launch-1.0 -v \
    udpsrc port=4002
  caps="application/x-rtp,media=audio,clock-rate=8000,encoding-name=PCMA" \
    ! rtppcmadepay \
    ! alawdec \
    ! audioconvert \
    ! audioresample \
    ! audio/x-raw,format=S16LE,rate=16000,channels=1 \
    ! udpsink host=127.0.0.1 port=6122 &

  # PCM from STTTSserver → Encode → RTP to Asterisk
  gst-launch-1.0 -v \
    udpsrc port=6123
  caps="audio/x-raw,format=S16LE,rate=16000,channels=1,layout=interleaved" \
    ! audioconvert \
    ! audioresample \
    ! audio/x-raw,rate=8000 \
    ! alawenc \
    ! rtppcmapay pt=8 \
    ! udpsink host=127.0.0.1 port=4003

  PHASE 3: Update Dialplan for Correct Format 📝

  [gstreamer-phase1]
  ; Extension 3333 - Now with proper ALAW RTP
  exten => 3333,1,NoOp(=== GStreamer Phase 1 - Extension 3333 ===)
   same => n,Answer()
   same => n,Set(CHANNEL(format)=alaw)  ; Use ALAW for RTP compatibility
   same => n,Playback(beep)
   same => n,ExternalMedia(app=gs3333,external_host=127.0.0.1:4000,format=al
  aw,transport=udp)
   same => n,Hangup()

  ; Extension 4444 - Now with proper ALAW RTP
  exten => 4444,1,NoOp(=== GStreamer Phase 1 - Extension 4444 ===)
   same => n,Answer()
   same => n,Set(CHANNEL(format)=alaw)  ; Use ALAW for RTP compatibility
   same => n,Playback(beep)
   same => n,ExternalMedia(app=gs4444,external_host=127.0.0.1:4002,format=al
  aw,transport=udp)
   same => n,Hangup()

  PHASE 4: Architecture Flow 🏗️

  ┌─────────────┐      RTP/ALAW      ┌──────────────────┐      PCM S16LE
   ┌──────────────┐
  │  Asterisk   │ ──────4000────────> │ GStreamer Decode │ ────6120────────>
   │              │
  │  Ext 3333   │                      │   (gateway-3333) │
     │ STTTSserver  │
  │             │ <─────4001────────── │ GStreamer Encode │ <───6121────────
    │              │
  └─────────────┘      RTP/ALAW       └──────────────────┘      PCM S16LE
    │              │

      │  Cross-Patch │
  ┌─────────────┐      RTP/ALAW       ┌──────────────────┐      PCM S16LE
    │              │
  │  Asterisk   │ ──────4002────────> │ GStreamer Decode │ ────6122────────>
   │              │
  │  Ext 4444   │                      │   (gateway-4444) │
     │              │
  │             │ <─────4003────────── │ GStreamer Encode │ <───6123────────
    │              │
  └─────────────┘      RTP/ALAW       └──────────────────┘      PCM S16LE
    └──────────────┘

  PHASE 5: Implementation Steps 📌

  1. Stop current processes:
  pkill -f gateway-3333
  pkill -f gateway-4444

  2. Install GStreamer
  3. Create GStreamer launcher script:
  cat > /home/azureuser/translation-app/3333-4444-gstreamer-phase1/start-gst
  reamer.sh << 'EOF'
  #!/bin/bash
  # Kill any existing
  pkill -f gst-launch

  # Start Gateway 3333
  ./gateway-3333-gstreamer.sh &
  echo "Started GStreamer Gateway 3333"

  # Start Gateway 4444
  ./gateway-4444-gstreamer.sh &
  echo "Started GStreamer Gateway 4444"

  # Monitor
  watch -n 1 'ps aux | grep gst-launch'
  EOF

  4. Update Asterisk dialplan
  5. Test with proper RTP/PCM conversion

  Expected Results:

  - ✅ RTP packets properly decoded to PCM
  - ✅ Clean audio without noise
  - ✅ Proper format conversion (8kHz ALAW ↔ 16kHz PCM)
  - ✅ Correct timestamp handling
  - ✅ Working bidirectional audio
  