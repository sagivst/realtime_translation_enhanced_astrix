# Station-3 Integration Recovery Plan

## Executive Summary

Station-3 **WAS** fully integrated with:
- **75 metrics** being tracked every 100ms and sent every 150ms
- **113 knobs** for dynamic configuration
- Config files dynamically updated by AI/optimizer
- Real-time metrics from Deepgram (STT confidence, latency, word count)
- Audio quality metrics (RMS, energy, chunk size)

**The integration exists on the VM** but is **NOT connected to the monitoring API on port 3090**.

---

## Current Status

### ✅ What's Working (Issue #1 RESOLVED)
- Timestamp churn FIXED - `/tmp/monitoring-real-data-collector-truly-static.js`
- Timestamps now remain static when status doesn't change
- Timeout handling gracefully maintains current status

### ❌ What's Missing (Issue #2 - Integration Gap)
- Station-3 shows "0" values in monitoring API because:
  - **STTTTSserver.js** is tracking 75 metrics internally via `StationAgent`
  - **Monitoring API** (port 3090) is NOT receiving these metrics
  - **Integration layer** exists but is not activated

---

## Found Integration Files

### On VM at `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/`:

1. **`station3-handler.js`** (101 lines)
   - Polls config file every 100ms for knob changes
   - Loads Deepgram config from `/tmp/STATION_3-{ext}-config.json`
   - Records metrics: `stt_confidence`, `stt_latency`, `words_recognized`
   - Requires `StationAgent` to emit metrics

2. **`station3-integration.js`** (232 lines)
   - Full integration module with HTTP POST to monitoring server
   - Sends metrics to `localhost:8007/update`
   - Records ALL 25 STT/Deepgram metrics
   - Calculates audio metrics (RMS, energy)
   - Watches config files for changes

3. **`station3-integration-patch.js`** (309 lines)
   - **Complete patch for STTTTSserver.js**
   - Shows EXACTLY how to integrate Station-3
   - Adds `StationAgent` instances for extensions 3333 & 4444
   - Polls knobs every 100ms
   - Replaces hardcoded Deepgram settings with knob-based config
   - Records metrics on all Deepgram events (transcript, error, metadata)

---

## The 75 Metrics Being Tracked

According to `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/Docs/sys/monitoring/STATIONS_IMPLEMENTATION_PLAN.md`:

### STT/Deepgram Metrics (25 metrics)
1. stt_confidence - Transcript confidence score
2. stt_latency - Time from audio to transcript
3. words_recognized - Number of words per segment
4. transcript_length - Character count
5. is_final - Final vs interim
6. stt_error - Error count
7. error_type - Error category
8. model_name - Active model
9. model_version - Model version
10. request_id - Request ID
11. alternative_count - Alternatives
12. speaker_count - Speakers detected
13. punctuation_added - Punctuation count
14. profanity_filtered - Filtered words
15. redaction_count - Redacted items
16. utterance_count - Utterances
17. vad_speech_duration - Speech duration
18. vad_silence_duration - Silence duration
19. language_detected - Detected language
20. language_confidence - Language confidence
21. keyword_hits - Keyword matches
22. search_matches - Search term matches
23. replacement_count - Replaced terms
24. measurement_duration - Processing time
25. measurement_channels - Active channels

### Audio Quality Metrics (25 metrics)
26. audio_rms - RMS level
27. audio_energy - Energy level
28. chunk_size - Audio chunk size
29. audio_peak - Peak amplitude
30. audio_clipping - Clipping events
31. signal_to_noise - SNR ratio
32. voice_activity - Voice presence
33. echo_level - Echo measurement
34. noise_level - Noise floor
35. gain_adjustment - Applied gain
... (and 15 more)

### Network/Performance Metrics (25 metrics)
51. connection_opened - Connection events
52. connection_closed - Disconnection events
53. connection_failed - Failed connections
54. packet_loss - Lost packets
55. packet_jitter - Jitter measurement
... (and 20 more)

---

## The 113 Knobs Being Tracked

According to the implementation plan:

### Deepgram/STT Knobs (25 knobs)
1. model - "nova-3" (PRODUCTION VALUE, NOT nova-2!)
2. language - "en" for 3333, "fr" for 4444
3. punctuate - Add punctuation
4. profanityFilter - Filter profanity
5. redact - Redact sensitive info
... (and 20 more)

### Audio Processing Knobs (30 knobs)
26. agc.enabled - AGC enabled
27. agc.targetLevel - Target level (dB)
28. agc.maxGain - Max gain (dB)
... (and 27 more)

### Network/Buffer Knobs (20 knobs)
55. jitter.enabled - Jitter buffer
56. jitter.targetDelay - Target delay
... (and 18 more)

### Codec Knobs (15 knobs)
75. codec.type - "opus"
76. codec.bitrate - 32000
... (and 13 more)

### Performance/System Knobs (24 knobs)
90. performance.threadPriority - "high"
91. performance.cpuAffinity - CPU affinity
96. performance.monitoring.interval - **100ms (CRITICAL)**
... (and 21 more)

**Total: 113 knobs**

---

## How the Integration Was Supposed to Work

### Architecture Flow:

```
┌─────────────────────────────────────────────────────────────┐
│  STTTTSserver.js (Port 3020)                                │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Station3Handler (station3-handler.js)                  │ │
│  │  • Polls /tmp/STATION_3-{ext}-config.json every 100ms │ │
│  │  • Loads 113 knobs from config file                    │ │
│  │  • Provides Deepgram config to connection              │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ StationAgent (monitoring/StationAgent.js)              │ │
│  │  • Records 75 metrics every call event                 │ │
│  │  • Emits batch every 150ms                             │ │
│  │  • Tracks: confidence, latency, words, audio quality   │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Socket.IO or HTTP POST                                  │ │
│  │  • Sends to monitoring server                          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Monitoring API (Port 3090)                                 │
│                                                               │
│  GET /api/snapshots                                          │
│  ↓                                                            │
│  Returns Station-3 with 75 metrics + 113 knobs              │
└─────────────────────────────────────────────────────────────┘
```

---

## What Was Lost / Disconnected

Based on the user's statement:
> "it was all working and all that we had to do is to successfully connect it to the API"

**The Problem:**
- STTTTSserver.js has the `station3-handler.js` file
- StationAgent is recording metrics
- **BUT** metrics are not flowing to the Monitoring API on port 3090

**Why:**
1. Either `StationAgent` is not initialized properly in STTTTSserver.js
2. Or `StationAgent` is not sending metrics to the right endpoint
3. Or the Monitoring API is not listening for Station-3 metrics

---

## Recovery Steps

### Phase 1: Verify Dependencies ✅

```bash
# Check if StationAgent exists
ssh azureuser@20.170.155.53 "find /home/azureuser/translation-app -name 'StationAgent*' -type f"

# Check if StationKnobSafeLoader exists
ssh azureuser@20.170.155.53 "find /home/azureuser/translation-app -name 'StationKnobSafeLoader*' -type f"

# Check if station3-handler.js is being used
ssh azureuser@20.170.155.53 "grep -n 'station3-handler' /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js"
```

### Phase 2: Check STTTTSserver Integration

```bash
# Check if Station3Handler is imported
ssh azureuser@20.170.155.53 "grep -n 'Station3Handler\|station3-handler' /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js | head -5"

# Check if StationAgent is imported
ssh azureuser@20.170.155.53 "grep -n 'StationAgent' /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js | head -5"

# Check if knob polling is started
ssh azureuser@20.170.155.53 "grep -n 'startKnobPolling\|knob.*poll' /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js | head -5"
```

### Phase 3: Check StationAgent Implementation

```bash
# Read StationAgent to understand how it emits metrics
scp azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/monitoring/StationAgent*.js /tmp/

# Check what endpoint it sends to
grep -n "emit\|POST\|http\|socket" /tmp/StationAgent*.js | head -20
```

### Phase 4: Connect to Monitoring API

Based on what we find, we need to either:

**Option A: StationAgent uses Socket.IO**
- Ensure Monitoring API on port 3090 listens for Socket.IO connections
- Update StationAgent to connect to `localhost:3090`

**Option B: StationAgent uses HTTP POST**
- Update `station3-integration.js` to POST to `localhost:3090/api/metrics`
- Add endpoint to Monitoring API to receive metrics

**Option C: StationAgent uses shared state**
- Create a metrics bridge that reads from StationAgent and feeds Monitoring API

### Phase 5: Test Integration

```bash
# 1. Create test config files
echo '{"deepgram":{"model":"nova-3","language":"en"}}' > /tmp/STATION_3-3333-config.json
echo '{"deepgram":{"model":"nova-3","language":"fr"}}' > /tmp/STATION_3-4444-config.json

# 2. Copy to VM
scp /tmp/STATION_3-*.json azureuser@20.170.155.53:/tmp/

# 3. Restart STTTTSserver
ssh azureuser@20.170.155.53 "pkill -f STTTTSserver && sleep 2 && cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && nohup node STTTTSserver.js > /tmp/STTTTSserver-station3.log 2>&1 &"

# 4. Watch logs for Station-3 messages
ssh azureuser@20.170.155.53 "tail -f /tmp/STTTTSserver-station3.log | grep STATION-3"

# 5. Make a test call to 3333 or 4444
# (Dial extension, speak something)

# 6. Check Monitoring API
curl -s http://20.170.155.53:3090/api/snapshots | jq '.stations."Station-3"'
```

---

## Expected Result After Recovery

When Station-3 is properly connected:

```json
{
  "Station-3": {
    "extension_3333": {
      "status": "active",
      "metrics": {
        "stt_confidence": 0.95,
        "stt_latency": 120,
        "words_recognized": 5,
        "transcript_length": 25,
        "is_final": 1,
        "audio_rms": 0.3,
        "audio_energy": 0.25,
        "chunk_size": 3200,
        "model_name": "nova-3",
        "connection_opened": 1,
        "latency": {
          "current_ms": 120,
          "average_ms": 115
        },
        "packet": {
          "received": 450,
          "sent": 450,
          "lost": 0,
          "loss_rate": 0
        }
      },
      "knobs": {
        "deepgram": {
          "model": "nova-3",
          "language": "en",
          "punctuate": true,
          "interimResults": true,
          "endpointing": 300
        }
      },
      "lastUpdate": "2025-12-07T18:55:00.000Z"
    }
  }
}
```

---

## Files to Restore/Activate

1. ✅ **station3-handler.js** - Already exists on VM
2. ✅ **station3-integration.js** - Already exists on VM
3. ✅ **station3-integration-patch.js** - Integration instructions exist
4. ❓ **StationAgent.js** or **StationAgent-Unified.js** - Need to verify
5. ❓ **StationKnobSafeLoader.js** - Need to verify
6. ❓ **STTTTSserver.js modifications** - Need to check if patch was applied

---

## Next Actions (In Order)

1. **Find and examine StationAgent.js** to understand metrics emission mechanism
2. **Check if STTTTSserver.js has Station-3 integration** (grep for imports)
3. **Identify the missing link** between StationAgent and Monitoring API
4. **Implement the connection** (Socket.IO, HTTP, or shared state)
5. **Test with real call** to verify 75 metrics flow
6. **Clone to other stations** once Station-3 works

---

## Summary

**What we recovered:**
- Complete understanding of the 75-metric + 113-knob system
- Found the working integration files on the VM
- Identified the missing connection to Monitoring API

**What we need to do:**
- Examine `StationAgent` to see how it emits metrics
- Connect StationAgent output to Monitoring API input
- Test and verify metrics flow

**User's exact request:**
> "it was all working and all that we had to do is to successfully connect it to the API and after that clone the same to all other stations"

We're now ready to make that connection.

---

*Document created: 2025-12-07*
*Context: Recovering lost Station-3 integration with 75 metrics + 113 knobs*
