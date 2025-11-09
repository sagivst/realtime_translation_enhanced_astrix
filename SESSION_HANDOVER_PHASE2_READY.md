# Session Handover: Phase 2 Ready for Implementation

**Date**: November 6, 2025
**Session End Status**: Phase 1 Complete, Phase 2 Documented and Ready
**Last Checkpoint Branch**: `working-7000and1-7777and8-on-dashboard`

---

## 🎯 Executive Summary

We have successfully completed Phase 1 of the ExternalMedia integration for extensions 7777/8888. The system is now at a critical checkpoint where:

- ✅ **Audio flow is working** (Asterisk → Gateway → Asterisk)
- ✅ **Extensions 7000/7001 remain fully operational** (DO NOT TOUCH)
- ✅ **Comprehensive backup created** (GitHub + Local)
- ✅ **Phase 2 roadmap documented** with clear implementation steps
- ❌ **Translation not yet integrated** (7777/8888 audio loops without translation)

**Next Step**: Implement Phase 2 to connect Gateway to Translation Server for actual translation.

---

## 📂 Critical Files and Locations

### Local Machine (MacBook)
```
/Users/sagivstavinsky/realtime-translation-enhanced_astrix/
├── docs/sys/
│   ├── PHASE2_7777_8888_INTEGRATION_ROADMAP.md    # 👈 READ THIS FIRST
│   └── Gateway_Translation_Server_Integration.md  # Reference spec
│
├── checkpoint-backup/                              # Complete system backup
│   ├── gateway/
│   │   ├── ari-externalmedia-handler.js           # Main Gateway
│   │   ├── audio-monitor-server.js                # Debug dashboard
│   │   ├── simple-port-crossover.js               # Test utility
│   │   └── rtp-recorder.js                        # Debug utility
│   ├── asterisk-config/
│   │   ├── extensions.conf                        # Dialplan
│   │   ├── ari.conf                               # ARI config
│   │   ├── http.conf                              # ARI HTTP
│   │   └── pjsip.conf                             # SIP config
│   ├── legacy-audiosocket/
│   │   ├── audiosocket-integration.js             # 7000/7001 stack
│   │   ├── audiosocket-orchestrator.js            # DO NOT MODIFY
│   │   └── asterisk-ari-handler.js                # DO NOT MODIFY
│   ├── MANIFEST.md                                # System documentation
│   └── FILE_VERIFICATION.txt                      # Backup verification
│
└── SESSION_HANDOVER_PHASE2_READY.md               # 👈 THIS FILE
```

### Azure Server (20.170.155.53)
```
/home/azureuser/translation-app/
├── ari-externalmedia-handler.js                   # Gateway (ACTIVE)
├── audio-monitor-server.js                        # Monitor (ACTIVE - port 3001)
├── conference-server.js                           # Translation Server (7000/7001)
├── audiosocket-integration.js                     # 7000/7001 stack (WORKING)
├── audiosocket-orchestrator.js                    # DO NOT MODIFY
├── asterisk-ari-handler.js                        # Legacy (DO NOT MODIFY)
├── simple-port-crossover.js                       # Test utility
├── rtp-recorder.js                                # Debug utility
├── start-crossover-debug.sh                       # Debug mode script
└── stop-crossover-debug.sh                        # Normal mode script

Asterisk Config:
/etc/asterisk/
├── extensions.conf                                # Dialplan (7000/7001/7777/8888)
├── ari.conf                                       # User: dev, Pass: asterisk
├── http.conf                                      # ARI port 8088
└── pjsip.conf                                     # SIP extensions
```

### GitHub
- **Repository**: `sagivst/realtime_translation_enhanced_astrix`
- **Current Branch**: `working-7000and1-7777and8-on-dashboard`
- **Commit Hash**: `d2d8a4412ad964f6729b076051f520d5ce2f84ab`
- **Status**: All changes pushed and verified

---

## 🔧 System Architecture (Current State)

### Extensions 7000/7001 (AudioSocket - WORKING ✅)
```
Phone A (English) → Asterisk → AudioSocket (TCP 5050) →
    audiosocket-integration.js → conference-server.js →
    [ASR → Translation → TTS] → Phone B (French)
```

**Status**: ✅ **FULLY OPERATIONAL - DO NOT MODIFY**

### Extensions 7777/8888 (ExternalMedia - AUDIO ONLY ✅)
```
Phone A → Asterisk → RTP (UDP 5000/5001) →
    ari-externalmedia-handler.js → [NO TRANSLATION] →
    ari-externalmedia-handler.js → RTP → Asterisk → Phone B
```

**Status**: ✅ Audio flows | ❌ No translation (audio loops in circles)

### What's Missing (THE GAP)
```
Gateway needs to connect to Translation Server via WebSocket:

Phone A → Asterisk → Gateway → WebSocket → Translation Server →
    [ASR → Translation → TTS] → Gateway → Asterisk → Phone B
```

---

## 🎬 Current Running Services

### On Azure Server (20.170.155.53):

**7000/7001 Stack (WORKING - DO NOT STOP)**:
```bash
# Translation Server for 7000/7001
ps aux | grep conference-server.js
# Should be running on port 3000

# AudioSocket integration
ps aux | grep audiosocket-integration.js
# Listening on ports 5050, 5051, 5052
```

**7777/8888 Stack (AUDIO ONLY)**:
```bash
# Gateway (ExternalMedia handler)
ps aux | grep ari-externalmedia-handler.js
# Listening on UDP ports 5000, 5001
# Connected to Asterisk via RTP

# Audio Monitor Dashboard
ps aux | grep audio-monitor-server.js
# Running on http://20.170.155.53:3001/
# Provides real-time audio visualization
```

**Asterisk**:
```bash
sudo systemctl status asterisk
# Should show: active (running)
```

### Access URLs:
- **Audio Monitor Dashboard**: http://20.170.155.53:3001/
- **Asterisk ARI**: http://localhost:8088/ari/api-docs (on server)
- **Translation Server**: http://localhost:3000/ (7000/7001 only)

---

## 🔑 Key Technical Details

### Audio Format
- **Codec**: PCM16 (signed 16-bit linear)
- **Sample Rate**: 16 kHz
- **Channels**: Mono
- **Frame Size**: 20ms (~320 bytes)
- **Endianness**: Big-endian (network byte order)

### Port Mapping
| Service | Extension | Ports | Protocol |
|---------|-----------|-------|----------|
| **AudioSocket** | 7000/7001 | 5050, 5051, 5052 | TCP |
| **Translation Server** | 7000/7001 | 3000 | HTTP/WebSocket |
| **Gateway RTP** | 7777/8888 | 5000, 5001 | UDP |
| **Audio Monitor** | 7777/8888 | 6000, 6001 | UDP |
| **Monitor Dashboard** | 7777/8888 | 3001 | HTTP/WebSocket |
| **Future Translation** | 7777/8888 | 3002 | HTTP/WebSocket (NOT YET) |
| **ARI Interface** | All | 8088 | HTTP |

### Asterisk Extensions
- **7000**: AudioSocket (English)
- **7001**: AudioSocket (French)
- **7777**: ExternalMedia (English - configured but not translating)
- **8888**: ExternalMedia (French - configured but not translating)

---

## 📋 What Was Accomplished in This Session

### Phase 1: ExternalMedia Gateway Implementation ✅

1. **Safety Checkpoint Created**
   - All configuration verified before changes
   - Git branch created for rollback

2. **ARI Configuration Verified**
   - ARI enabled and accessible
   - User: `dev`, Password: `asterisk`
   - Port: 8088

3. **Dialplan Updated**
   - Added extensions 7777/8888 to `/etc/asterisk/extensions.conf`
   - Both use Stasis application: `translation-test`
   - Separate from 7000/7001 dialplan

4. **Gateway Deployed**
   - `ari-externalmedia-handler.js` created and deployed
   - Handles ExternalMedia channels via ARI REST API
   - Creates mixing bridges automatically
   - Manages RTP on ports 5000/5001

5. **Audio Flow Verified**
   - Calls to 7777/8888 connect successfully
   - RTP audio flows bidirectionally
   - Browser playback working (http://20.170.155.53:3001/)
   - Fixed PCM endianness issue (big-endian)

6. **Monitoring Dashboard Created**
   - `audio-monitor-server.js` provides real-time visualization
   - 4 volume controls (7777/8888 mic/speaker)
   - 4 level bars with real-time updates
   - Web Audio API integration for browser playback

7. **Comprehensive Checkpoint Backup**
   - 15 files backed up to local machine
   - Pushed to GitHub branch: `working-7000and1-7777and8-on-dashboard`
   - Verified both local and remote copies
   - Complete manifest and documentation included

8. **Phase 2 Roadmap Document Created**
   - Detailed implementation plan (5 days estimated)
   - Architecture diagrams and technical specs
   - Clear separation of 7000/7001 vs 7777/8888
   - WebSocket protocol specification
   - Testing procedures and success criteria

---

## 🚀 Phase 2 Implementation Plan (Next Session)

### Overview
Connect the Gateway to the Translation Server so that actual translation happens between extensions 7777 and 8888.

### Timeline: 5 Days
- **Phase 2A**: Setup (0.5 days)
- **Phase 2B**: Gateway Modification (1.5 days)
- **Phase 2C**: Translation Server Adaptation (1.5 days)
- **Phase 2D**: Testing (1.5 days)

### Phase 2A: File Duplication and Setup

**Tasks**:
1. Create separate directory structure:
   ```bash
   ssh azureuser@20.170.155.53
   cd /home/azureuser/translation-app
   mkdir -p 7777-8888-stack
   mkdir -p 7000-7001-stack
   mkdir -p shared
   mkdir -p utils
   ```

2. Duplicate translation server files:
   ```bash
   cp conference-server.js 7777-8888-stack/conference-server-externalmedia.js
   cp audiosocket-integration.js 7777-8888-stack/externalmedia-integration.js
   cp audiosocket-orchestrator.js 7777-8888-stack/externalmedia-orchestrator.js
   ```

3. Install WebSocket library:
   ```bash
   cd 7777-8888-stack
   npm install ws
   ```

4. Create environment configuration:
   ```bash
   # Create .env.externalmedia with:
   TRANSLATION_SERVER_PORT=3002
   WEBSOCKET_PORT=3002
   EXT_7777_LANGUAGE=en
   EXT_8888_LANGUAGE=fr
   # (Plus existing AI API keys from .env)
   ```

### Phase 2B: Gateway Modification

**File to Modify**: `ari-externalmedia-handler.js`

**Key Changes**:
1. Add WebSocket client:
   ```javascript
   const WebSocket = require('ws');
   const TRANSLATION_WS_7777 = 'ws://localhost:3002/translate/7777';
   const TRANSLATION_WS_8888 = 'ws://localhost:3002/translate/8888';
   ```

2. Connect RTP → WebSocket:
   ```javascript
   socket7777.on('message', (rtpPacket) => {
     const pcmAudio = extractPCM(rtpPacket);
     translationWS7777.send(pcmAudio);  // Send to Translation Server
   });
   ```

3. Connect WebSocket → RTP (crossover):
   ```javascript
   translationWS7777.on('message', (translatedPCM) => {
     const rtpPacket = encapsulateRTP(translatedPCM);
     socket8888.send(rtpPacket, asterisk8888Endpoint);  // To OTHER extension
   });
   ```

4. Implement session management:
   - Open WebSocket when call starts
   - Close WebSocket when call ends
   - Handle reconnection and errors

### Phase 2C: Translation Server Adaptation

**File to Create**: `conference-server-externalmedia.js`

**Key Changes**:
1. Replace AudioSocket listener with WebSocket server:
   ```javascript
   const wss = new WebSocket.Server({ port: 3002 });
   ```

2. Route WebSocket endpoints:
   ```javascript
   wss.on('connection', (ws, req) => {
     const extension = extractExtension(req.url);  // /translate/7777
     if (extension === '7777') {
       handle7777Session(ws);
     } else if (extension === '8888') {
       handle8888Session(ws);
     }
   });
   ```

3. Keep ALL existing AI logic:
   - Deepgram (ASR)
   - DeepL (Translation)
   - ElevenLabs (TTS)
   - Hume AI (Emotion)

### Phase 2D: Testing

**Component Tests**:
1. Gateway ↔ Translation Server WebSocket connection
2. Audio flow: 7777 (English) → 8888 (French)
3. Bidirectional translation
4. Latency measurement (target < 150ms)

**Integration Tests**:
1. Simultaneous calls on 7000/7001 and 7777/8888
2. Failover testing (translation server restart)
3. Reconnection testing

**Success Criteria**:
- ✅ English on 7777 → French on 8888
- ✅ French on 8888 → English on 7777
- ✅ Latency < 150ms
- ✅ 7000/7001 unaffected

---

## 🎓 Key Concepts to Remember

### Why We Need Phase 2B (Gateway Modification)

**The Gateway is a Protocol Translator**:
- **Asterisk speaks**: RTP (telephony protocol with headers, sequence numbers)
- **Translation Server speaks**: PCM audio streams (clean audio data)
- **Gateway translates**: RTP ↔ WebSocket/PCM

**Current State**:
```
Phone → Asterisk → Gateway → Gateway → Asterisk → Phone
                   [RTP]    [RTP]
                   NO TRANSLATION (just loops)
```

**After Phase 2**:
```
Phone → Asterisk → Gateway → Translation Server → Gateway → Asterisk → Phone
                   [RTP→PCM] [ASR→Trans→TTS]    [PCM→RTP]
                   TRANSLATION HAPPENS!
```

### Why Separate File Stacks

**7000-7001-stack/** (AudioSocket - Legacy):
- Proven, stable system
- DO NOT MODIFY during Phase 2
- Will eventually be deprecated

**7777-8888-stack/** (ExternalMedia - New):
- Modern, standard-based approach
- Separate development and testing
- Zero risk to production system

### WebSocket Protocol

**Message Format** (Gateway → Translation Server):
```javascript
{
  type: 'audio',
  extension: '7777',
  timestamp: 1699276800000,
  data: <Buffer>  // PCM audio (320 bytes)
}
```

**Message Format** (Translation Server → Gateway):
```javascript
{
  type: 'translated_audio',
  extension: '7777',
  targetExtension: '8888',
  data: <Buffer>  // Translated PCM audio
}
```

---

## 🔍 Debugging and Monitoring

### Check System Status

**On Azure Server**:
```bash
# Check if services are running
ssh azureuser@20.170.155.53
ps aux | grep node

# Check Asterisk status
sudo asterisk -rx "core show channels"

# Check ARI connectivity
curl http://localhost:8088/ari/asterisk/info -u dev:asterisk

# Monitor Gateway logs
tail -f /home/azureuser/translation-app/ari-handler.log

# Monitor Audio Monitor logs
tail -f /home/azureuser/translation-app/audio-monitor.log
```

### Audio Monitor Dashboard

**URL**: http://20.170.155.53:3001/

**Features**:
- Real-time audio level visualization (4 bars)
- Volume controls for each channel (4 sliders)
- Browser audio playback (click "Start Audio Playback")
- WebSocket packet count
- Sample rate: 16kHz

### Test Audio Flow

**Quick Test**:
1. Call extension 7777 from one phone
2. Call extension 8888 from another phone
3. Speak on one phone
4. Check audio monitor dashboard for activity
5. Currently: Same audio on both phones (no translation)
6. After Phase 2: Translated audio on opposite phone

### Crossover Debug Mode

**Enable crossover** (routes audio between extensions):
```bash
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app
./start-crossover-debug.sh
```

**Disable crossover**:
```bash
./stop-crossover-debug.sh
```

---

## ⚠️ Important Warnings

### DO NOT MODIFY (7000/7001 Stack)
These files are working and should NOT be changed during Phase 2:
- ❌ `audiosocket-integration.js`
- ❌ `audiosocket-orchestrator.js`
- ❌ `asterisk-ari-handler.js`
- ❌ `conference-server.js` (will be duplicated, not modified)

### Port Conflicts to Avoid
- ❌ Do NOT use ports 5050-5052 (AudioSocket)
- ❌ Do NOT use port 3000 (7000/7001 Translation Server)
- ✅ Use port 3002 for new Translation Server (7777/8888)
- ✅ Ports 5000/5001 already in use by Gateway (RTP)
- ✅ Port 3001 already in use by Audio Monitor

### Backup Before Phase 2
Before starting Phase 2 implementation:
```bash
# Verify current checkpoint
cd ~/realtime-translation-enhanced_astrix
git status
git log -1

# Create new checkpoint if needed
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app
tar -czf backup-before-phase2-$(date +%Y%m%d).tar.gz *.js
```

---

## 📞 Connection Details

### Azure Server
- **Host**: `azureuser@20.170.155.53`
- **Authentication**: SSH key (already configured)
- **Working Directory**: `/home/azureuser/translation-app`

### Asterisk
- **Version**: 18.10.0
- **ARI Username**: `dev`
- **ARI Password**: `asterisk`
- **ARI Port**: 8088
- **CLI Access**: `sudo asterisk -rvvv`

### AI Services (Already Configured)
- **Deepgram**: ASR (Automatic Speech Recognition)
- **DeepL**: Translation (English ↔ French)
- **ElevenLabs**: TTS (Text-to-Speech)
- **Hume AI**: Emotion detection

API keys are stored in `.env` file on server.

---

## 📚 Documentation References

### Primary Documents
1. **PHASE2_7777_8888_INTEGRATION_ROADMAP.md** (THIS IS THE MAIN GUIDE)
   - Location: `~/realtime-translation-enhanced_astrix/docs/sys/`
   - 630 lines, comprehensive implementation guide
   - Read this first before starting Phase 2

2. **Gateway_Translation_Server_Integration.md**
   - Location: `~/realtime-translation-enhanced_astrix/docs/sys/`
   - WebSocket protocol specification
   - Reference for Gateway ↔ Translation Server communication

3. **checkpoint-backup/MANIFEST.md**
   - Complete system state documentation
   - Files, ports, architecture
   - Checkpoint verification

### Code References
- **Gateway Source**: `checkpoint-backup/gateway/ari-externalmedia-handler.js`
- **AudioSocket Reference**: `checkpoint-backup/legacy-audiosocket/audiosocket-integration.js`
- **Monitor Source**: `checkpoint-backup/gateway/audio-monitor-server.js`

---

## 🔄 Rollback Procedure

If Phase 2 encounters critical issues:

### Quick Rollback
```bash
# Stop new services
ssh azureuser@20.170.155.53
pkill -f "conference-server-externalmedia"
cd /home/azureuser/translation-app
rm -rf 7777-8888-stack

# Restore to checkpoint
cd ~/realtime-translation-enhanced_astrix
git checkout working-7000and1-7777and8-on-dashboard

# Redeploy Gateway (if needed)
scp checkpoint-backup/gateway/ari-externalmedia-handler.js \
    azureuser@20.170.155.53:/home/azureuser/translation-app/

# Restart Gateway
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app
pkill -f "ari-externalmedia-handler"
nohup node ari-externalmedia-handler.js > ari-handler.log 2>&1 &
```

**Verify 7000/7001 Still Works**:
```bash
# Check translation server
ps aux | grep conference-server.js

# Make test calls to 7000 and 7001
# Both should still translate correctly
```

---

## 🎯 Session Continuation Checklist

When you start the next session, verify:

### Environment Status
- [ ] SSH connection to Azure server works
- [ ] Asterisk is running: `sudo systemctl status asterisk`
- [ ] 7000/7001 translation working (make test calls)
- [ ] Audio monitor accessible: http://20.170.155.53:3001/
- [ ] Gateway running: `ps aux | grep ari-externalmedia`

### Files and Documentation
- [ ] Roadmap document readable: `cat ~/realtime-translation-enhanced_astrix/docs/sys/PHASE2_7777_8888_INTEGRATION_ROADMAP.md`
- [ ] Checkpoint backup exists: `ls ~/realtime-translation-enhanced_astrix/checkpoint-backup/`
- [ ] GitHub branch exists: `git branch --list "working-7000and1-7777and8-on-dashboard"`

### Ready to Start Phase 2A
- [ ] Understand what Phase 2A involves (directory setup, file duplication)
- [ ] Have 4 hours available for initial setup
- [ ] 7000/7001 system stable and not in use for critical testing

---

## 💡 Quick Start for Next Session

### Resume Development
```bash
# 1. Connect to server
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app

# 2. Verify system status
ps aux | grep node
sudo asterisk -rx "core show channels"

# 3. Read roadmap
cat ~/realtime-translation-enhanced_astrix/docs/sys/PHASE2_7777_8888_INTEGRATION_ROADMAP.md

# 4. Start Phase 2A when ready
# Follow Phase 2A section in roadmap document
```

### If Starting from Scratch
If you need to re-establish context:
1. Read this handover document completely
2. Review the checkpoint backup manifest: `checkpoint-backup/MANIFEST.md`
3. Read the Phase 2 roadmap: `docs/sys/PHASE2_7777_8888_INTEGRATION_ROADMAP.md`
4. Verify system status (checklist above)
5. Begin Phase 2A implementation

---

## 📊 System Health Indicators

### Green (Healthy)
- ✅ Asterisk running
- ✅ 7000/7001 calls translate successfully
- ✅ 7777/8888 calls connect (audio loops, no translation)
- ✅ Audio monitor shows packet flow
- ✅ No errors in logs

### Yellow (Warning)
- ⚠️ High latency (> 200ms) - check network
- ⚠️ Occasional RTP packet loss - check UDP buffer size
- ⚠️ WebSocket disconnections - check connection stability

### Red (Critical)
- ❌ 7000/7001 not translating - DO NOT proceed with Phase 2
- ❌ Asterisk not responding - restart Asterisk
- ❌ Gateway crashed - check logs, restart service
- ❌ Port conflicts - verify port assignments

---

## 🔐 Security Notes

### SSH Access
- Server uses SSH key authentication
- Key should be in `~/.ssh/` directory
- If key is missing, contact system administrator

### API Keys
- All AI service keys stored in `.env` on server
- DO NOT commit API keys to GitHub
- Verify `.env` file exists before starting services

### Asterisk ARI
- Username: `dev`
- Password: `asterisk`
- Only accessible from localhost (127.0.0.1:8088)
- Do not expose ARI to public internet

---

## 📝 Notes and Observations

### Known Issues (Non-Critical)
1. **Audio Monitor**: Requires clicking "Start Audio Playback" to hear audio in browser
2. **RTP Jitter**: Minimal (< 10ms), acceptable for real-time translation
3. **Gateway Restart**: Requires call reconnection (expected behavior)

### Optimizations for Future
1. **Connection Pooling**: WebSocket connection reuse across calls
2. **Buffer Tuning**: Optimize buffer sizes for latency vs stability
3. **Load Balancing**: Multiple Translation Server instances for scale
4. **Monitoring**: Add Prometheus metrics and Grafana dashboard

### Questions Resolved in This Session
1. **Q**: Why modify Gateway instead of sending RTP directly to Translation Server?
   **A**: Gateway is a protocol translator (RTP ↔ PCM/WebSocket). Translation Server is AI-focused, not telephony-focused.

2. **Q**: Why duplicate translation server files?
   **A**: To keep 7000/7001 system stable and working. Parallel development with zero risk.

3. **Q**: Why WebSocket instead of HTTP?
   **A**: Real-time bidirectional streaming. HTTP is request/response, not suitable for continuous audio.

---

## 🎬 Final Status Summary

### What Works
- ✅ Extensions 7000/7001: Full bidirectional translation (English ↔ French)
- ✅ Extensions 7777/8888: Audio flow (Asterisk ↔ Gateway ↔ Asterisk)
- ✅ Audio Monitor Dashboard: Real-time visualization and browser playback
- ✅ Asterisk: Stable, all extensions operational
- ✅ Backup: Complete checkpoint saved locally and on GitHub

### What's Missing
- ❌ Gateway → Translation Server connection (WebSocket)
- ❌ Translation processing for 7777/8888 (ASR → Translation → TTS)
- ❌ Crossover routing (7777 audio → 8888, 8888 audio → 7777)

### Estimated Completion
- **Phase 2A**: 0.5 days (setup)
- **Phase 2B**: 1.5 days (Gateway modification)
- **Phase 2C**: 1.5 days (Translation Server adaptation)
- **Phase 2D**: 1.5 days (testing)
- **Total**: 5 days to complete translation integration

### Risk Level
- **Low Risk**: 7000/7001 system isolated and protected
- **Rollback Available**: Complete checkpoint with verified backup
- **Testing Strategy**: Component testing before integration testing

---

## 📧 Continuation Instructions

### When Starting New Session

1. **Say**: "I'm continuing from the Phase 2 handover session. Please review SESSION_HANDOVER_PHASE2_READY.md"

2. **I will**:
   - Review this handover document
   - Verify system status
   - Confirm readiness for Phase 2
   - Begin with Phase 2A (setup) when you're ready

3. **You should have**:
   - 4 hours for initial Phase 2A setup
   - Access to Azure server
   - Roadmap document open for reference

### Critical Reminder

**DO NOT MODIFY 7000/7001 STACK** during Phase 2 development:
- ❌ audiosocket-integration.js
- ❌ audiosocket-orchestrator.js
- ❌ asterisk-ari-handler.js
- ❌ conference-server.js (duplicate, don't modify original)

**7000/7001 MUST remain operational at all times.**

---

## 📞 Emergency Contacts

If critical issues occur:
1. **Rollback Procedure**: See section above
2. **System Restore**: Checkout branch `working-7000and1-7777and8-on-dashboard`
3. **Logs**: Check `/home/azureuser/translation-app/*.log`
4. **Asterisk CLI**: `sudo asterisk -rvvv`

---

**Document Version**: 1.0
**Created**: November 6, 2025
**Status**: ✅ Ready for Phase 2 Implementation
**Next Step**: Phase 2A (Directory Setup and File Duplication)

**End of Handover Document**

---

*This document contains all information needed to continue development in a new session. Read the Phase 2 Roadmap document for detailed implementation steps.*
