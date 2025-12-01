

comprehensive development plan for implementing extensions 3333/4444 with PHASE 1 (PCM
 + Monitoring) that will NOT interfere with your existing systems.

⏺ 📋 PHASE 1 Development Plan: Extensions 3333/4444 - PCM + Monitoring

  Current System Analysis

  Existing Systems (DO NOT TOUCH):

  | Extensions | Technology            | Ports                  | Purpose                                     |
  |------------|-----------------------|------------------------|---------------------------------------------|
  | 7000/7001  | AudioSocket           | 5050, 5052             | Production translation (7000-7001-stack)    |
  | 1000-9999  | ConfBridge            | -                      | Conference rooms                            |

  Available Resources for 3333/4444:
  - ✅ New UDP ports for GStreamer (4000-4003, 4100-4103)
  - ✅ New WebSocket monitoring port (3010)
  - ✅ New STTTTSserver.js control port (6010)
  - ✅ Isolated dialplan context [gstreamer-phase1]
  - ✅ Separate directory /home/azureuser/translation-app/3333-4444-gstreamer-phase1/

  ---
  🎯 PHASE 1 Architecture Overview

  Extension 3333 mic → Asterisk → GStreamer Pipeline A → UDP 4000
                                          
                                                        ↓
                                      STTTTSserver.js (STT, TTT, TTS flow)
                                                          ↓
  Extension 4444 speaker ← Asterisk ← GStreamer Pipeline B ← UDP 4001

  Extension 4444 mic → Asterisk → GStreamer Pipeline B → UDP 4002
                                                          ↓
                                      STTTTSserver.js (STT, TTT, TTS flow)
                                                          ↓
  Extension 3333 speaker ← Asterisk ← GStreamer Pipeline A ← UDP 4003

                                STTTTSserver.js
                                    ↓
                           WebSocket :3010
                                    ↓
                           Monitoring Dashboard

  ---
  📝 Detailed Development Plan

  SECTION 1: Environment Setup & Verification ✅ Regression Test Point #1

⏺ Section 1.1: Create Isolated Project Directory
  # Create new directory (isolated from existing stacks)
  ssh azureuser@20.170.155.53 "mkdir -p /home/azureuser/translation-app/3333-4444-gstreamer-phase1"

  Files to create:
  - gateway-3333.js - GStreamer gateway for extension 3333
  - gateway-4444.js - GStreamer gateway for extension 4444
  - .env.phase1 - Environment variables (ports, etc.)
  - package.json - Dependencies (isolated from other stacks)

  
  ---
  Section 1.2: Add PJSIP Extensions 3333/4444
  # Add to /etc/asterisk/pjsip_users.conf (append only, no modifications to existing)

  New configuration:
  ;=======================================
  ; Extension 3333 - GStreamer Phase 1 Test
  ;=======================================
  [3333]
  type=endpoint
  transport=transport-udp
  context=from-internal
  disallow=all
  allow=slin16
  auth=3333
  aors=3333
  direct_media=no
  rtp_symmetric=yes

  [3333]
  type=auth
  auth_type=userpass
  username=3333
  password=GStreamer2025!

  [3333]
  type=aor
  max_contacts=5

  ;=======================================
  ; Extension 4444 - GStreamer Phase 1 Test
  ;=======================================
  [4444]
  type=endpoint
  transport=transport-udp
  context=from-internal
  disallow=all
  allow=slin16
  auth=4444
  aors=4444
  direct_media=no
  rtp_symmetric=yes

  [4444]
  type=auth
  auth_type=userpass
  username=4444
  password=GStreamer2025!

  [4444]
  type=aor
  max_contacts=5

  Reload: sudo asterisk -rx "pjsip reload"

  Regression Test: Call 7001 → should work normally
  Regression Test: Call 8888 → should work normally

  ---
  SECTION 2: Asterisk Dialplan Configuration ✅ Regression Test Point #2

  Section 2.1: Add New Context to extensions.conf

  Location: Add to /etc/asterisk/extensions.conf (APPEND ONLY - existing contexts untouched)

  ; ============================================
  ; GSTREAMER PHASE 1 TEST CONTEXT
  ; Extensions 3333 and 4444 - Isolated PCM Test
  ; Uses ExternalMedia with GStreamer pipelines
  ; ============================================
  [gstreamer-phase1]

  ; Extension 3333 → ExternalMedia instance gs3333
  exten => 3333,1,NoOp(=== GStreamer Phase 1 - Extension 3333 ===)
   same => n,Answer()
   same => n,Set(CHANNEL(format)=slin16)
   same => n,Playback(beep)
   same => n,NoOp(Starting ExternalMedia on port 4000/4001)
   same => n,ExternalMedia(app=gs3333,external_host=127.0.0.1:4000,format=slin16,transport=udp)
   same => n,Hangup()

  ; Extension 4444 → ExternalMedia instance gs4444
  exten => 4444,1,NoOp(=== GStreamer Phase 1 - Extension 4444 ===)
   same => n,Answer()
   same => n,Set(CHANNEL(format)=slin16)
   same => n,Playback(beep)
   same => n,NoOp(Starting ExternalMedia on port 4002/4003)
   same => n,ExternalMedia(app=gs4444,external_host=127.0.0.1:4002,format=slin16,transport=udp)
   same => n,Hangup()

  Section 2.2: Route 3333/4444 in [from-internal]

  Add to [from-internal] context:
  ; GStreamer Phase 1 test extensions
  exten => 3333,1,Goto(gstreamer-phase1,3333,1)
  exten => 4444,1,Goto(gstreamer-phase1,4444,1)

  Reload: sudo asterisk -rx "dialplan reload"

  

  ---
  SECTION 3: GStreamer Gateway Development ✅ Regression Test Point #3

  Section 3.1: Install GStreamer Dependencies

  ssh azureuser@20.170.155.53 "sudo apt-get install -y gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good"

  Regression Test: Existing services still running (ps aux | grep node)

  ---
  Section 3.2: Create gateway-3333.js

  Purpose: Receives RTP from Asterisk (3333), forwards PCM to STTTTSserver.js, receives processed PCM, sends back to Asterisk

  Key Features:
  - Listens on UDP 4000 (from Asterisk - mic audio)
  - Sends audio to STTTTSserver.js UDP 6100
  - Receives audio from STTTTSserver.js UDP 6101
  - Sends back to Asterisk UDP 4001 (to speaker)

  Port Mapping:
  Asterisk 3333 → 4000 (gateway) → 6100 (STTTTSserver.js input)
  STTTTSserver.js output 6101 → 4001 (gateway) → Asterisk 3333

  File: /home/azureuser/translation-app/3333-4444-gstreamer-phase1/gateway-3333.js

  Minimal Implementation:
  - UDP socket server on 4000 (receive from Asterisk)
  - UDP client to 6100 (send to STTTTSserver.js)
  - UDP socket server on 4001 (send to Asterisk)
  - UDP client from 6101 (receive from STTTTSserver.js)
  - Buffer management (20ms SLIN16 frames = 640 bytes)
  - Logging to /tmp/gateway-3333-phase1.log

  Regression Test: Check that ports 5000, 5001, 5050, 5052 are still in use by existing systems

  ---
  Section 3.3: Create gateway-4444.js

  Purpose: Same as 3333 but for extension 4444

  Port Mapping:
  Asterisk 4444 → 4002 (gateway) → 6102 (STTTTSserver.js input)
  STTTTSserver.js output 6103 → 4003 (gateway) → Asterisk 4444

  File: /home/azureuser/translation-app/3333-4444-gstreamer-phase1/gateway-4444.js

  Logging: /tmp/gateway-4444-phase1.log


  ---
  SECTION 4: STTTTSserver.js Development ✅ Regression Test Point #4

  Section 4.1: Create STTTTSserver.js

  Purpose: AI PCM audio between 3333 ↔ 4444

  Functionality:
  // Receive from gateway-3333 (UDP 6100) → Forward to gateway-4444 (UDP 6103)
  // Receive from gateway-4444 (UDP 6102) → Forward to gateway-3333 (UDP 6101)

  Features:
  - UDP server on 6100 (receive from 3333)
  - UDP server on 6102 (receive from 4444)
  - UDP client to 6101 (send to 3333)
  - UDP client to 6103 (send to 4444)
  - WebSocket server on port 3010 (monitoring)
  - 20ms frame alignment
  - Circular buffer management
  - Real-time PCM streaming to monitoring dashboard

  File: /home/azureuser/translation-app/3333-4444-gstreamer-phase1/STTTTSserver.js

  Logging: /tmp/STTTTSserver


  ---
  Section 4.2: Implement Monitoring WebSocket

  Endpoints:
  - ws://20.170.155.53:3010/monitor/3333 - Stream PCM from 3333 mic
  - ws://20.170.155.53:3010/monitor/4444 - Stream PCM from 4444 mic
  - ws://20.170.155.53:3010/status - System status

  Data Format:
  {
    "type": "audio",
    "extension": "3333",
    "timestamp": 1700000000000,
    "pcm": [...], // Float32Array
    "frameSize": 640
  }


  ---
  SECTION 5: Monitoring Dashboard ✅ Regression Test Point #5

  Section 5.1: Create monitoring-dashboard.html

  Features:
  - Connect to ws://20.170.155.53:3010/monitor/3333
  - Connect to ws://20.170.155.53:3010/monitor/4444
  - AudioContext playback of PCM streams
  - Waveform visualization (Canvas)
  - Volume meters
  - Connection status indicators

  File: /home/azureuser/translation-app/3333-4444-gstreamer-phase1/public/monitoring-dashboard.html

  Access: http://20.170.155.53:3010/monitoring-dashboard.html

  Regression Test: Verify existing dashboards (if any) still work

  ---
  SECTION 6: Integration & Testing ✅ Regression Test Point #6
  Section 6.1: Start Services in Controlled Order

  # 1. Start STTTTSserver.js first
  
  nohup node STTTTSserver.js > /tmp/STTTTSserver.js 2>&1 &

  # 2. Start gateway-3333
  nohup node gateway-3333.js > /tmp/gateway-3333-phase1.log 2>&1 &

  # 3. Start gateway-4444
  nohup node gateway-4444.js > /tmp/gateway-4444-phase1.log 2>&1 &

  Verify:
  ps aux | grep -E 'STTTTSserver|gateway-3333|gateway-4444' | grep -v grep
  netstat -tuln | grep -E '4000|4001|4002|4003|6100|6101|6102|6103|3010'

 
  ---
  Section 6.2: Test PCM roundtrip

  Test Procedure:
  1. Phone A (1001) dials 3333
  2. Phone B (1002) dials 4444
  3. Phone A speaks → should hear on Phone B
  4. Phone B speaks → should hear on Phone A
  5. Open monitoring dashboard → should see waveforms from both extensions

  Success Criteria:
  - ✅ Bidirectional audio flow
  - ✅ Latency < 500ms
  - ✅ No distortion or echo
  - ✅ Monitoring dashboard shows real-time PCM


  ---
  SECTION 7: Documentation & Handoff ✅ Regression Test Point #7

  Section 7.1: Create Documentation

  Files to create:
  - README-PHASE1.md - Quick start guide
  - ARCHITECTURE-PHASE1.md - System architecture
  - TESTING-GUIDE-PHASE1.md - Test procedures
  - PORT-ALLOCATION.md - Port mapping reference

  Section 7.2: Final Regression Test

  Complete System Verification:
  # Test all extensions
  1. Call 3333 + 4444 → works? ✅

  ---
  🔒 Safety Measures

  1. Isolated Directory: All new code in /home/azureuser/translation-app/3333-4444-gstreamer-phase1/
  3. Port Isolation: New ports (4000-4003, 6100-6103, 3010) don't conflict
  4. Asterisk Config Append-Only: Only ADD to extensions.conf and pjsip_users.conf
  5. Independent Processes: New Node.js processes don't interfere with existing PIDs
  6. Separate Logs: All logs go to /tmp/*-phase1.log

  ---
  📊 Port Allocation Summary

  | System             | Component     | Port | Protocol | Purpose            |
  |--------------------|---------------|------|----------|--------------------|
  | Existing 7000/7001 | AudioSocket   | 5050 | TCP      | Extension 7000     |
  |                    | AudioSocket   | 5052 | TCP      | Extension 7001     |
  | Existing 7777/8888 | Gateway RTP   | 5000 | UDP      | Extension 7777     |
  |                    | Gateway RTP   | 5001 | UDP      | Extension 8888     |
  |                    | WebSocket     | 3002 | TCP      | Translation server |
  |                    | Dashboard API | 6001 | TCP      | Metrics            |
  | NEW 3333/4444      | Gateway RTP   | 4000 | UDP      | 3333 from Asterisk |
  |                    | Gateway RTP   | 4001 | UDP      | 3333 to Asterisk   |
  |                    | Gateway RTP   | 4002 | UDP      | 4444 from Asterisk |
  |                    | Gateway RTP   | 4003 | UDP      | 4444 to Asterisk   |
  |                    | STTTTSserver   | 6100 | UDP      | Receive from 3333  |
  |                    | STTTTSserver   | 6101 | UDP      | Send to 3333       |
  |                    | STTTTSserver   | 6102 | UDP      | Receive from 4444  |
  |                    | STTTTSserver   | 6103 | UDP      | Send to 4444       |
  |                    | Monitoring    | 3010 | TCP      | WebSocket + HTTP   |

  ---
  ✅ Regression Test Checklist

  After each section, verify:

  - Section 2: Can still dial existing extensions (test calls)
  - Section 3: Existing gateway processes still running (check PIDs)
  - Section 4: Existing STTTTSserver still functional (check logs)
  - Section 5: Existing dashboards still accessible
  - Section 6: Full integration test of all extensions
  - Section 7: Complete system validation

  