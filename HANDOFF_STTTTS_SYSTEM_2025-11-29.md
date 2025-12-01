# STTTTSserver System Handoff Document

**Date**: November 29, 2025
**System**: Real-time Translation Audio Pipeline
**Production VM**: Azure 20.170.155.53
**Status**: ✅ Operational with Real-time Monitoring

---

## 1. SYSTEM OVERVIEW

### What is STTTTSserver?

STTTTSserver is a **real-time bidirectional audio translation system** that provides live translation between callers speaking different languages over a phone call.

**Core Flow**:
```
Caller A (3333) ──> Asterisk ──> Gateway-3333 ──> STTTTSserver ──> Deepgram STT ──> DeepL Translation ──> ElevenLabs TTS ──> Gateway-4444 ──> Asterisk ──> Caller B (4444)
```

**Key Components**:
- **Asterisk PBX**: Handles SIP calls via extensions 3333 and 4444
- **Gateway-3333/4444**: Converts RTP audio (ALAW 8kHz) ↔ PCM audio (16kHz) using GStreamer
- **STTTTSserver**: Core Node.js server orchestrating the translation pipeline
- **Deepgram**: Speech-to-Text streaming API
- **DeepL**: Translation engine
- **ElevenLabs**: Text-to-Speech synthesis
- **Hume AI**: Emotion detection (optional, currently disabled due to quota)

---

## 2. PRODUCTION ENVIRONMENT (20.170.155.53)

### System Architecture

**Directory Structure**:
```
/home/azureuser/translation-app/3333_4444__Operational/
├── gateway-3333.js              # RTP→PCM gateway for ext 3333
├── gateway-4444.js              # RTP→PCM gateway for ext 4444
├── ari-gstreamer-operational.js # Asterisk ARI handler
└── STTTTSserver/
    ├── STTTTSserver.js          # Main translation server
    ├── .env.externalmedia       # API keys configuration
    ├── elevenlabs-tts-service.js
    ├── hume-streaming-client.js
    ├── monitoring-server-real-data.js  # NEW: Real-time monitoring
    ├── public/
    │   └── monitoring-tree-dashboard.html
    └── config/parameters/       # 55 monitoring parameters
```

### Network Ports

**UDP Audio Ports**:
- `4000` - Gateway-3333 receives from Asterisk
- `4002` - Gateway-4444 receives from Asterisk
- `6120` - STTTTSserver receives from Gateway-3333
- `6121` - STTTTSserver sends to Gateway-3333
- `6122` - STTTTSserver receives from Gateway-4444
- `6123` - STTTTSserver sends to Gateway-4444

**TCP Service Ports**:
- `8088` - Asterisk ARI WebSocket
- `3020` - STTTTSserver Dashboard (legacy)
- `3021` - Monitoring Server with Real Data (NEW)

### Running Services

Check service status:
```bash
ssh azureuser@20.170.155.53 "ps aux | grep -E 'gateway-3333|gateway-4444|ari-gstreamer|STTTTSserver|monitoring-server' | grep node"
```

**Active Processes**:
1. `gateway-3333.js` - Handling ext 3333 audio
2. `gateway-4444.js` - Handling ext 4444 audio
3. `ari-gstreamer-operational.js` - ARI call control
4. `STTTTSserver.js` - Translation pipeline
5. `monitoring-server-real-data.js` - Real-time monitoring (PID: 2924185)

### Log Files

**Location**: `/tmp/`
- `gateway-3333-operational.log` - Gateway 3333 stats
- `gateway-4444-operational.log` - Gateway 4444 stats
- `ari-gstreamer-operational.log` - ARI events
- `stttts-fresh.log` - STTTTSserver main log
- `monitoring-server-real-data.log` - Monitoring system log

**Example Gateway Log**:
```
Stats: RX_Ast=2356, TX_STTTS=35340, RX_STTTS=0, TX_Ast=0
```

### API Keys Configuration

**File**: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/.env.externalmedia`

```bash
# Current working keys (as of 2025-11-29)
DEEPGRAM_API_KEY=<key>
DEEPL_API_KEY=d7ec78e4-8fbb-4a34-b265-becea2b269ad  # Working key
ELEVENLABS_API_KEY=<key>

# Hume AI - DISABLED (monthly quota exceeded)
USE_HUME_EMOTION=false
HUME_API_KEY=<key>
HUME_CONFIG_ID=<id>
```

### Critical Configuration

**Audio Gain Factor** (STTTTSserver.js ~line 580-583):
```javascript
// CURRENT SETTING (MAY NEED ADJUSTMENT)
extensionGainFactors.set("3333", 0.002);  // Very low - may cause STT issues
extensionGainFactors.set("4444", 0.002);

// RECOMMENDED FOR PRODUCTION
extensionGainFactors.set("3333", 2.0);
extensionGainFactors.set("4444", 2.0);
```

**Note**: The current 0.002 gain factor reduces audio by 99.8%, which can cause Deepgram to return empty transcriptions.

---

## 3. MONITORING SYSTEM (NEW - 2025-11-29)

### Overview

A comprehensive **7-station monitoring architecture** with real-time metrics collection from actual audio pipeline components.

**Dashboard URL**: http://20.170.155.53:3021/monitoring-tree-dashboard.html
**API Endpoint**: http://20.170.155.53:3021/api/stations

### 7-Station Architecture

Based on **Monitoring_&_Auto-Tuning_System.md** specification:

```
┌─────────────────────────────────────────────────────────────┐
│                     Audio Flow Pipeline                      │
└─────────────────────────────────────────────────────────────┘

Station 1: Asterisk ARI
  └─> RTP source leg from Asterisk PBX
      Log: /tmp/ari-gstreamer-operational.log

Station 2: Gateway RX (3333) ✅ ACTIVE
  └─> RTP→PCM conversion (ALAW 8kHz → PCM 16kHz)
      Log: /tmp/gateway-3333-operational.log
      Metrics: Real packet counts from gateway stats

Station 3: STT Processing
  └─> Deepgram STT streaming API
      Log: /tmp/stttts-fresh.log
      Metrics: Transcription events

Station 4: Translation
  └─> DeepL translation engine
      Log: /tmp/stttts-fresh.log
      Metrics: Translation requests

Station 5: TTS Generation
  └─> ElevenLabs TTS synthesis
      Log: /tmp/stttts-fresh.log
      Metrics: TTS requests

Station 6: STT Server TX
  └─> PCM output from STTTTSserver
      Log: /tmp/stttts-fresh.log
      Metrics: Outbound PCM chunks

Station 7: Gateway TX (4444) ✅ ACTIVE
  └─> PCM→RTP conversion back to Asterisk
      Log: /tmp/gateway-4444-operational.log
      Metrics: Real packet counts from gateway stats
```

### Monitoring Capabilities

**Real-time Metrics (75 parameters per station)**:

1. **Buffer Metrics** (10 params):
   - Total buffer usage, input/processing/output buffers
   - Overruns, underruns, high/low water marks

2. **Latency Metrics** (8 params):
   - Average, peak, minimum latency
   - Jitter, end-to-end delay, processing/network latency

3. **Packet Metrics** (12 params):
   - Packets RX/TX, dropped packets, loss rate
   - Errors, retransmits, out-of-order, throughput

4. **Audio Quality Metrics** (10 params):
   - Sample rate, bit depth, format
   - Clipping, silence detection, SNR, THD

5. **Performance Metrics** (8 params):
   - CPU, memory, threads, connections
   - Queue depth, processing rate, error rate

6. **Custom Metrics** (7 params):
   - State, activity, processing speed
   - Success rate, warning/critical counts

### Data Collection Method

**Real Data Sources**:
```javascript
// Gateway stats parsing
parseGatewayStats('/tmp/gateway-3333-operational.log')
// Extracts: RX_Ast, TX_STTTS, RX_STTTS, TX_Ast

// STTTTSserver log parsing
parseSTTTTSStats('/tmp/stttts-fresh.log')
// Counts: Deepgram transcriptions, DeepL requests, ElevenLabs requests
```

**Update Frequency**: Every 1 second via WebSocket

### API Endpoints

**GET /api/stations** - List all 7 stations with metrics
```bash
curl http://20.170.155.53:3021/api/stations | jq
```

**GET /api/stations/:id** - Get specific station
```bash
curl http://20.170.155.53:3021/api/stations/station-2 | jq
```

**GET /api/parameters** - Parameter configuration index
```bash
curl http://20.170.155.53:3021/api/parameters | jq
```

**PATCH /api/parameters/:category/:paramName** - Update parameter config
```bash
curl -X PATCH http://20.170.155.53:3021/api/parameters/buffer/total \
  -H "Content-Type: application/json" \
  -d '{"thresholds": {"warningHigh": 85}}'
```

### Monitoring Server Control

**Start**:
```bash
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
nohup node monitoring-server-real-data.js > /tmp/monitoring-server-real-data.log 2>&1 &
```

**Stop**:
```bash
pkill -f 'node.*monitoring-server-real-data.js'
```

**Check Status**:
```bash
ps aux | grep monitoring-server-real-data | grep -v grep
tail -f /tmp/monitoring-server-real-data.log
```

---

## 4. VOICE OPTIMIZATION SYSTEM (NEXT PHASE)

### Overview

The next phase involves implementing an **AI-driven recursive auto-tuning system** that automatically optimizes audio quality parameters based on real-time metrics.

### Architecture (from Monitoring_&_Auto-Tuning_System.md)

```
┌───────────────────────────────────────────────────────────┐
│              AI-Driven Optimization Loop                   │
└───────────────────────────────────────────────────────────┘

1. Data Collection
   └─> Monitoring server collects 75 metrics × 7 stations

2. Deviation Analysis
   └─> Detect metrics outside preferred ranges
   └─> Calculate severity and drift

3. AI Recommendation (ChatGPT/GPT-5.1)
   └─> Input: Current metrics, knobs, objectives, history
   └─> Output: List of KnobChange actions with reasoning

4. Apply Changes
   └─> Send changes to Asterisk/Gateway/STTTTSserver
   └─> Confirm success, log operation

5. Re-Measurement
   └─> Collect new metrics after 1-3 seconds
   └─> Evaluate improvements

6. Recursive Loop
   └─> Continue until convergence or max iterations
```

### Knobs & Metrics Mapping

**Reference**: `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/Docs/sys/TIMING/monitoring_annex_A_full_english.xlsx`

**Example Knobs**:

**Station 1 (Asterisk ARI)**:
- `jitter_buffer_ms` (Legal: 20-200, Preferred: 40-80)
- `rtp_ptime_ms` (Legal: 10-60, Preferred: 20)

**Station 2 (Gateway RX)**:
- `input_gain_db` (Legal: -20 to +20, Preferred: -3 to +3)
- `nr_strength` (Legal: 0-1, Preferred: 0.3-0.5)
- `codec_type` (ALAW/OPUS/G729)

**Station 3 (STT Processing)**:
- `vad_threshold` (Legal: 0-1, Preferred: 0.4-0.6)
- `chunk_ms` (Legal: 50-1000, Preferred: 200-350)
- `silence_timeout_ms` (Legal: 500-5000, Preferred: 1500-2500)

**Station 5 (TTS Generation)**:
- `output_gain_db` (Legal: -20 to +20, Preferred: 0 to +6)
- `speaking_rate` (Legal: 0.5-2.0, Preferred: 0.9-1.1)
- `pitch_shift_semitones` (Legal: -12 to +12, Preferred: -2 to +2)

### API Specification (OpenAPI 3.1)

**POST /optimize** - Request AI optimization
```json
{
  "station": "STATION_3",
  "metrics": {
    "latency.avg": 210,
    "packet.lossRate": 1.2,
    "buffer.total": 85
  },
  "knobs": {
    "chunk_ms": 300,
    "vad_threshold": 0.5
  },
  "goal": "latency"  // or "quality" or "balanced"
}
```

**Response**:
```json
{
  "station": "STATION_3",
  "actions": [
    {
      "knob": "chunk_ms",
      "variableName": "DEEPGRAM_CHUNK_SIZE",
      "set": 250,
      "delta": -50,
      "reason": "Reduce latency by decreasing chunk size"
    }
  ],
  "confidence": 0.85,
  "notes": "Expected latency reduction: 210ms → 180ms"
}
```

**POST /apply** - Apply knob changes
```json
{
  "station": "STATION_3",
  "changes": [
    {
      "knob": "chunk_ms",
      "variableName": "DEEPGRAM_CHUNK_SIZE",
      "set": 250
    }
  ]
}
```

### Implementation Plan

**Phase 1: Knob Integration** (1-2 weeks)
- [ ] Identify all adjustable parameters in STTTTSserver.js
- [ ] Create knob management API endpoints
- [ ] Implement live parameter updates without restart
- [ ] Test manual knob adjustments

**Phase 2: AI Engine Integration** (1-2 weeks)
- [ ] Set up OpenAI GPT-5.1 API connection
- [ ] Implement optimization request builder
- [ ] Parse AI responses into knob changes
- [ ] Add confidence scoring and validation

**Phase 3: Recursive Loop** (1 week)
- [ ] Implement auto-tuning loop with max iterations
- [ ] Add convergence detection logic
- [ ] Implement oscillation prevention
- [ ] Create optimization history logging

**Phase 4: UI/UX** (1-2 weeks)
- [ ] Level 2 dashboard: Knobs panel per station
- [ ] Level 3 dashboard: Single metric editor
- [ ] Global AI optimization panel
- [ ] Recursive AI log display
- [ ] Auto/Manual/Step-by-step modes

### Key Technical Challenges

1. **Live Parameter Updates**: Modifying STTTTSserver parameters without dropping active calls
2. **Metric Correlation**: Understanding which knobs affect which metrics
3. **Convergence**: Preventing endless optimization loops
4. **Safety Bounds**: Keeping knobs within legal ranges
5. **Multi-Station Coordination**: Optimizing across 7 interdependent stations

---

## 5. TESTING & VERIFICATION

### Test Call Flow

1. **Register SIP clients**:
   - Extension 3333 (Phone A)
   - Extension 4444 (Phone B)

2. **Place calls**:
   - Phone A dials 3333
   - Phone B dials 4444

3. **Expected behavior**:
   - Phone A speaks (English) → Phone B hears (Spanish/target language)
   - Phone B speaks (Spanish) → Phone A hears (English)

4. **Monitor dashboard**:
   - http://20.170.155.53:3021/monitoring-tree-dashboard.html
   - Should show real-time audio waveforms
   - Should display packet counts increasing
   - Should show transcription/translation events

### Verification Commands

```bash
# Check all services running
ssh azureuser@20.170.155.53 "ps aux | grep -E 'gateway|ari-gstreamer|STTTTSserver|monitoring' | grep node"

# Check UDP port listeners
ssh azureuser@20.170.155.53 "netstat -tuln | grep -E '4000|4002|6120|6121|6122|6123'"

# Check gateway stats
ssh azureuser@20.170.155.53 "tail -20 /tmp/gateway-3333-operational.log | grep Stats"

# Check STTTTSserver activity
ssh azureuser@20.170.155.53 "tail -50 /tmp/stttts-fresh.log | grep -E 'Deepgram|Translation|ElevenLabs'"

# Test monitoring API
curl -s http://20.170.155.53:3021/api/stations | jq '.[] | {id, name, active}'
```

### Expected Success Metrics

- ✅ Bidirectional audio flow
- ✅ Latency < 2 seconds end-to-end
- ✅ Deepgram transcriptions appearing in logs
- ✅ DeepL translations being processed
- ✅ ElevenLabs TTS generating audio
- ✅ Gateway packet counts increasing
- ✅ Dashboard showing real-time updates
- ✅ No audio distortion or dropouts

---

## 6. KNOWN ISSUES & FIXES

### Issue #1: Deepgram Empty Transcriptions

**Symptom**: Deepgram returns empty transcript strings
**Cause**: Audio gain factor set to 0.002 (99.8% reduction)
**Fix**: Change gain in STTTTSserver.js:
```javascript
// Line ~580-583
extensionGainFactors.set("3333", 2.0);  // Was 0.002
extensionGainFactors.set("4444", 2.0);  // Was 0.002
```
**Status**: ⚠️ IDENTIFIED - needs fix before production use

### Issue #2: Hume AI Monthly Quota Exceeded

**Symptom**: Constant reconnection attempts, "Monthly usage limit reached"
**Fix**: Disabled Hume in .env.externalmedia:
```bash
USE_HUME_EMOTION=false
```
**Status**: ✅ FIXED - system works without emotion detection

### Issue #3: DeepL API Key Expiration

**Symptom**: "Authorization failure, check auth_key"
**Fix**: Updated to new working key in .env.externalmedia
**Current Key**: `d7ec78e4-8fbb-4a34-b265-becea2b269ad`
**Status**: ✅ FIXED - verified working

---

## 7. GITHUB REPOSITORIES

### Production System
**Branch**: `Working_3333_4444_Full_Cycle_Partial_Monitoring`
**URL**: https://github.com/sagivst/realtime_translation_enhanced_astrix/tree/Working_3333_4444_Full_Cycle_Partial_Monitoring

**Contents**:
- Complete 3333/4444 GStreamer system
- Working gateways with RTP session reset fix
- STTTTSserver with Deepgram/DeepL/ElevenLabs integration
- Partial monitoring system (8-station, simulated data)

### Latest Working Branch
**Branch**: `working-full-cycle-timing-sync`
**URL**: https://github.com/sagivst/realtime_translation_enhanced_astrix/tree/working-full-cycle-timing-sync

**Contents**:
- Timing synchronization modules
- Latency management system
- Buffer optimization

### Local Development
**Path**: `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/`

**Key Documentation**:
- `docs/sys/3333_4444_INSTALLATION_GUIDE.md` - Installation instructions
- `Docs/sys/Monotoring/monitoring-system-complete-status.md` - 8-station monitoring status
- `Docs/sys/TIMING/Monitoring_&_Auto-Tuning_System.md` - AI optimization spec
- `Docs/sys/TIMING/monitoring_annex_A_full_english.xlsx` - Knobs & metrics mapping

---

## 8. NEXT STEPS

### Immediate Actions
1. ✅ **Deploy 7-station monitoring with real data** (COMPLETED 2025-11-29)
2. ⚠️ **Fix audio gain factor** (0.002 → 2.0) in STTTTSserver.js
3. 📋 **Test full call flow** with real translation
4. 📋 **Verify dashboard** shows accurate real-time metrics

### Voice Optimization Implementation
1. **Read Annex A Excel** - Parse all knob definitions
2. **Implement knob API** - /apply endpoint with live updates
3. **Integrate AI engine** - OpenAI GPT-5.1 for optimization
4. **Build recursive loop** - Auto-tuning with convergence detection
5. **Create UI panels** - Knobs editor and AI log viewer

### Documentation Needed
- [ ] Complete API documentation for voice optimization endpoints
- [ ] Knob definitions reference (all 75+ parameters)
- [ ] AI prompt templates for optimization requests
- [ ] Troubleshooting guide for common optimization issues
- [ ] Performance benchmarking methodology

---

## 9. CONTACT & SUPPORT

**System Owner**: Sagiv Stavinsky
**Development VM**: Azure 20.170.155.53
**VM User**: azureuser
**SSH Access**: `ssh azureuser@20.170.155.53`

**Critical Files Backup Location**:
```
Local: /Users/sagivstavinsky/realtime-translation-enhanced_astrix/
GitHub: https://github.com/sagivst/realtime_translation_enhanced_astrix
Branch: Working_3333_4444_Full_Cycle_Partial_Monitoring
```

---

## 10. QUICK REFERENCE

### Start All Services
```bash
# SSH to VM
ssh azureuser@20.170.155.53

# Start Asterisk
sudo systemctl start asterisk

# Start STTTTSserver
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
nohup node STTTTSserver.js > /tmp/stttts-fresh.log 2>&1 &

# Start Gateways and ARI
cd /home/azureuser/translation-app/3333_4444__Operational
nohup node gateway-3333.js > /tmp/gateway-3333-operational.log 2>&1 &
nohup node gateway-4444.js > /tmp/gateway-4444-operational.log 2>&1 &
nohup node ari-gstreamer-operational.js > /tmp/ari-gstreamer-operational.log 2>&1 &

# Start Monitoring Server
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
nohup node monitoring-server-real-data.js > /tmp/monitoring-server-real-data.log 2>&1 &
```

### Monitor System
```bash
# Watch logs in real-time
tail -f /tmp/stttts-fresh.log
tail -f /tmp/gateway-3333-operational.log
tail -f /tmp/monitoring-server-real-data.log

# Check API
curl http://20.170.155.53:3021/api/stations | jq

# View Dashboard
open http://20.170.155.53:3021/monitoring-tree-dashboard.html
```

### Stop All Services
```bash
pkill -f 'node.*gateway-3333'
pkill -f 'node.*gateway-4444'
pkill -f 'node.*ari-gstreamer'
pkill -f 'node.*STTTTSserver'
pkill -f 'node.*monitoring-server'
```

---

**End of Handoff Document**
**Generated**: 2025-11-29
**Next Review**: Before voice optimization implementation
