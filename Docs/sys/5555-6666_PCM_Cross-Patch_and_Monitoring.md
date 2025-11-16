

comprehensive development plan for implementing extensions 5555/6666 with PHASE 1 (PCM
  Cross-Patch + Monitoring) that will NOT interfere with your existing systems.

⏺ 📋 PHASE 1 Development Plan: Extensions 5555/6666 - PCM Cross-Patch + Monitoring

  Current System Analysis

  Existing Systems (DO NOT TOUCH):

  | Extensions | Technology            | Ports                  | Purpose                                     |
  |------------|-----------------------|------------------------|---------------------------------------------|
  | 7000/7001  | AudioSocket           | 5050, 5052             | Production translation (7000-7001-stack)    |
  | 7777/8888  | ExternalMedia via ARI | 5000, 5001, 3002, 6001 | Full translation pipeline (7777-8888-stack) |
  | 1000-9999  | ConfBridge            | -                      | Conference rooms                            |

  Available Resources for 5555/6666:
  - ✅ New UDP ports for GStreamer (4000-4003, 4100-4103)
  - ✅ New WebSocket monitoring port (3010)
  - ✅ New conf-server control port (6010)
  - ✅ Isolated dialplan context [gstreamer-phase1]
  - ✅ Separate directory /home/azureuser/translation-app/5555-6666-gstreamer-phase1/

  ---
  🎯 PHASE 1 Architecture Overview

  Extension 5555 mic → Asterisk → GStreamer Pipeline A → UDP 4000
                                                          ↓
                                      conf-server (PCM Cross-Patch)
                                                          ↓
  Extension 6666 speaker ← Asterisk ← GStreamer Pipeline B ← UDP 4001

  Extension 6666 mic → Asterisk → GStreamer Pipeline B → UDP 4002
                                                          ↓
                                      conf-server (PCM Cross-Patch)
                                                          ↓
  Extension 5555 speaker ← Asterisk ← GStreamer Pipeline A ← UDP 4003

                                conf-server
                                    ↓
                           WebSocket :3010
                                    ↓
                           Monitoring Dashboard

  ---
  📝 Detailed Development Plan

  SECTION 1: Environment Setup & Verification ✅ Regression Test Point #1

⏺ Section 1.1: Create Isolated Project Directory
  # Create new directory (isolated from existing stacks)
  ssh azureuser@20.170.155.53 "mkdir -p /home/azureuser/translation-app/5555-6666-gstreamer-phase1"

  Files to create:
  - gateway-5555.js - GStreamer gateway for extension 5555
  - gateway-6666.js - GStreamer gateway for extension 6666
  - conf-server-phase1.js - PCM cross-patch server
  - monitoring-dashboard.html - WebSocket monitoring UI
  - .env.phase1 - Environment variables (ports, etc.)
  - package.json - Dependencies (isolated from other stacks)

  Regression Test: Call 7000 → should work normally
  Regression Test: Call 7777 → should work normally

  ---
  Section 1.2: Add PJSIP Extensions 5555/6666
  # Add to /etc/asterisk/pjsip_users.conf (append only, no modifications to existing)

  New configuration:
  ;=======================================
  ; Extension 5555 - GStreamer Phase 1 Test
  ;=======================================
  [5555]
  type=endpoint
  transport=transport-udp
  context=from-internal
  disallow=all
  allow=slin16
  auth=5555
  aors=5555
  direct_media=no
  rtp_symmetric=yes

  [5555]
  type=auth
  auth_type=userpass
  username=5555
  password=GStreamer2025!

  [5555]
  type=aor
  max_contacts=5

  ;=======================================
  ; Extension 6666 - GStreamer Phase 1 Test
  ;=======================================
  [6666]
  type=endpoint
  transport=transport-udp
  context=from-internal
  disallow=all
  allow=slin16
  auth=6666
  aors=6666
  direct_media=no
  rtp_symmetric=yes

  [6666]
  type=auth
  auth_type=userpass
  username=6666
  password=GStreamer2025!

  [6666]
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
  ; Extensions 5555 and 6666 - Isolated PCM Cross-Patch Test
  ; Uses ExternalMedia with GStreamer pipelines
  ; ============================================
  [gstreamer-phase1]

  ; Extension 5555 → ExternalMedia instance gs5555
  exten => 5555,1,NoOp(=== GStreamer Phase 1 - Extension 5555 ===)
   same => n,Answer()
   same => n,Set(CHANNEL(format)=slin16)
   same => n,Playback(beep)
   same => n,NoOp(Starting ExternalMedia on port 4000/4001)
   same => n,ExternalMedia(app=gs5555,external_host=127.0.0.1:4000,format=slin16,transport=udp)
   same => n,Hangup()

  ; Extension 6666 → ExternalMedia instance gs6666
  exten => 6666,1,NoOp(=== GStreamer Phase 1 - Extension 6666 ===)
   same => n,Answer()
   same => n,Set(CHANNEL(format)=slin16)
   same => n,Playback(beep)
   same => n,NoOp(Starting ExternalMedia on port 4002/4003)
   same => n,ExternalMedia(app=gs6666,external_host=127.0.0.1:4002,format=slin16,transport=udp)
   same => n,Hangup()

  Section 2.2: Route 5555/6666 in [from-internal]

  Add to [from-internal] context:
  ; GStreamer Phase 1 test extensions
  exten => 5555,1,Goto(gstreamer-phase1,5555,1)
  exten => 6666,1,Goto(gstreamer-phase1,6666,1)

  Reload: sudo asterisk -rx "dialplan reload"

  Regression Test: Verify dialplan shows both old and new extensions
  Regression Test: Call 7000 → should still work
  Regression Test: Call 7777 → should still work

  ---
  SECTION 3: GStreamer Gateway Development ✅ Regression Test Point #3

  Section 3.1: Install GStreamer Dependencies

  ssh azureuser@20.170.155.53 "sudo apt-get install -y gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good"

  Regression Test: Existing services still running (ps aux | grep node)

  ---
  Section 3.2: Create gateway-5555.js

  Purpose: Receives RTP from Asterisk (5555), forwards PCM to conf-server, receives processed PCM, sends back to Asterisk

  Key Features:
  - Listens on UDP 4000 (from Asterisk - mic audio)
  - Sends audio to conf-server UDP 6100
  - Receives audio from conf-server UDP 6101
  - Sends back to Asterisk UDP 4001 (to speaker)

  Port Mapping:
  Asterisk 5555 → 4000 (gateway) → 6100 (conf-server input)
  conf-server output 6101 → 4001 (gateway) → Asterisk 5555

  File: /home/azureuser/translation-app/5555-6666-gstreamer-phase1/gateway-5555.js

  Minimal Implementation:
  - UDP socket server on 4000 (receive from Asterisk)
  - UDP client to 6100 (send to conf-server)
  - UDP socket server on 4001 (send to Asterisk)
  - UDP client from 6101 (receive from conf-server)
  - Buffer management (20ms SLIN16 frames = 640 bytes)
  - Logging to /tmp/gateway-5555-phase1.log

  Regression Test: Check that ports 5000, 5001, 5050, 5052 are still in use by existing systems

  ---
  Section 3.3: Create gateway-6666.js

  Purpose: Same as 5555 but for extension 6666

  Port Mapping:
  Asterisk 6666 → 4002 (gateway) → 6102 (conf-server input)
  conf-server output 6103 → 4003 (gateway) → Asterisk 6666

  File: /home/azureuser/translation-app/5555-6666-gstreamer-phase1/gateway-6666.js

  Logging: /tmp/gateway-6666-phase1.log

  Regression Test: Ports 3002, 6001 still available to 7777/8888 system

  ---
  SECTION 4: conf-server Development ✅ Regression Test Point #4

  Section 4.1: Create conf-server-phase1.js

  Purpose: Cross-patch PCM audio between 5555 ↔ 6666

  Functionality:
  // Receive from gateway-5555 (UDP 6100) → Forward to gateway-6666 (UDP 6103)
  // Receive from gateway-6666 (UDP 6102) → Forward to gateway-5555 (UDP 6101)

  Features:
  - UDP server on 6100 (receive from 5555)
  - UDP server on 6102 (receive from 6666)
  - UDP client to 6101 (send to 5555)
  - UDP client to 6103 (send to 6666)
  - WebSocket server on port 3010 (monitoring)
  - 20ms frame alignment
  - Circular buffer management
  - Real-time PCM streaming to monitoring dashboard

  File: /home/azureuser/translation-app/5555-6666-gstreamer-phase1/conf-server-phase1.js

  Logging: /tmp/conf-server-phase1.log

  Regression Test: Verify 7777/8888 conference server on port 3002 still running

  ---
  Section 4.2: Implement Monitoring WebSocket

  Endpoints:
  - ws://20.170.155.53:3010/monitor/5555 - Stream PCM from 5555 mic
  - ws://20.170.155.53:3010/monitor/6666 - Stream PCM from 6666 mic
  - ws://20.170.155.53:3010/status - System status

  Data Format:
  {
    "type": "audio",
    "extension": "5555",
    "timestamp": 1700000000000,
    "pcm": [...], // Float32Array
    "frameSize": 640
  }

  Regression Test: Check 7777/8888 WebSocket still accessible on 3002

  ---
  SECTION 5: Monitoring Dashboard ✅ Regression Test Point #5

  Section 5.1: Create monitoring-dashboard.html

  Features:
  - Connect to ws://20.170.155.53:3010/monitor/5555
  - Connect to ws://20.170.155.53:3010/monitor/6666
  - AudioContext playback of PCM streams
  - Waveform visualization (Canvas)
  - Volume meters
  - Connection status indicators

  File: /home/azureuser/translation-app/5555-6666-gstreamer-phase1/public/monitoring-dashboard.html

  Access: http://20.170.155.53:3010/monitoring-dashboard.html

  Regression Test: Verify existing dashboards (if any) still work

  ---
  SECTION 6: Integration & Testing ✅ Regression Test Point #6

  Section 6.1: Start Services in Controlled Order

  # 1. Start conf-server first
  cd /home/azureuser/translation-app/5555-6666-gstreamer-phase1
  nohup node conf-server-phase1.js > /tmp/conf-server-phase1.log 2>&1 &

  # 2. Start gateway-5555
  nohup node gateway-5555.js > /tmp/gateway-5555-phase1.log 2>&1 &

  # 3. Start gateway-6666
  nohup node gateway-6666.js > /tmp/gateway-6666-phase1.log 2>&1 &

  Verify:
  ps aux | grep -E 'conf-server-phase1|gateway-5555|gateway-6666' | grep -v grep
  netstat -tuln | grep -E '4000|4001|4002|4003|6100|6101|6102|6103|3010'

  Regression Test:
  # Verify existing systems still running
  ps aux | grep -E 'gateway-7777-8888|conference-server-externalmedia' | grep -v grep
  netstat -tuln | grep -E '5000|5001|3002|6001'

  ---
  Section 6.2: Test PCM Cross-Patch

  Test Procedure:
  1. Phone A (1001) dials 5555
  2. Phone B (1002) dials 6666
  3. Phone A speaks → should hear on Phone B
  4. Phone B speaks → should hear on Phone A
  5. Open monitoring dashboard → should see waveforms from both extensions

  Success Criteria:
  - ✅ Bidirectional audio flow
  - ✅ Latency < 500ms
  - ✅ No distortion or echo
  - ✅ Monitoring dashboard shows real-time PCM

  Regression Test:
  1. Phone A dials 7000 → verify translation works
  2. Phone A dials 7777 → verify translation works

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
  1. Call 7000 → Translation works? ✅
  2. Call 7001 → Translation works? ✅
  3. Call 7777 → Translation works? ✅
  4. Call 8888 → Translation works? ✅
  5. Call 5555 + 6666 → Cross-patch works? ✅

  ---
  🔒 Safety Measures

  1. Isolated Directory: All new code in /home/azureuser/translation-app/5555-6666-gstreamer-phase1/
  2. No File Modifications: Existing files in 7000-7001-stack/ and 7777-8888-stack/ remain untouched
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
  | NEW 5555/6666      | Gateway RTP   | 4000 | UDP      | 5555 from Asterisk |
  |                    | Gateway RTP   | 4001 | UDP      | 5555 to Asterisk   |
  |                    | Gateway RTP   | 4002 | UDP      | 6666 from Asterisk |
  |                    | Gateway RTP   | 4003 | UDP      | 6666 to Asterisk   |
  |                    | conf-server   | 6100 | UDP      | Receive from 5555  |
  |                    | conf-server   | 6101 | UDP      | Send to 5555       |
  |                    | conf-server   | 6102 | UDP      | Receive from 6666  |
  |                    | conf-server   | 6103 | UDP      | Send to 6666       |
  |                    | Monitoring    | 3010 | TCP      | WebSocket + HTTP   |

  ---
  ✅ Regression Test Checklist

  After each section, verify:

  - Section 1: Extensions 7000, 7001, 7777, 8888 still registered (asterisk -rx "pjsip show endpoints")
  - Section 2: Can still dial existing extensions (test calls)
  - Section 3: Existing gateway processes still running (check PIDs)
  - Section 4: Existing conf-server still functional (check logs)
  - Section 5: Existing dashboards still accessible
  - Section 6: Full integration test of all 6 extensions (4 old + 2 new)
  - Section 7: Complete system validation

  ---
  🚀 Execution Timeline

  Estimated Time per Section:
  - Section 1: 15 minutes (setup + baseline tests)
  - Section 2: 20 minutes (Asterisk config + reload + tests)
  - Section 3: 45 minutes (gateway development + testing)
  - Section 4: 60 minutes (conf-server + WebSocket + testing)
  - Section 5: 30 minutes (dashboard + visualization)
  - Section 6: 30 minutes (integration + regression tests)
  - Section 7: 20 minutes (documentation)

  Total: ~3.5 hours with regression testing at each step