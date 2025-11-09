# API-Driven Latency Monitoring
## New Approach - Zero Pipeline Modifications

### Problem with Previous Approach

The frame metadata tracking approach (Stage 1.2) attempted to:
- Track every frame (50/second) through the pipeline
- Create metadata objects on the critical path
- Correlate frames across ASR → MT → TTS stages
- **Result**: Broke the pipeline due to performance overhead

### New Approach: Use What APIs Already Provide

Instead of tracking metadata, **collect timing data that APIs already return**:

```
Deepgram ASR    → transcript.latency (already exists!)
DeepL MT        → translationTime (already measured!)
ElevenLabs TTS  → ttsTime (already measured!)
Hume AI         → emotion timing (already tracked!)
End-to-End      → totalTime (already calculated!)
```

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXISTING PIPELINE                             │
│  (NO MODIFICATIONS - remains exactly as is)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Asterisk → ASR → MT → TTS → Asterisk                          │
│              ↓     ↓    ↓                                       │
│          [latency data already in API responses]                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                             ↓
                    [5 lines of code]
                    Record timing data
                             ↓
                ┌──────────────────────┐
                │  LatencyCollector    │
                │  - Aggregates data   │
                │  - No pipeline mods  │
                │  - Hierarchical view │
                └──────────────────────┘
                             ↓
                    ┌────────────────┐
                    │   Socket.IO    │
                    │  Real-time UI  │
                    └────────────────┘
                             ↓
              ┌──────────────────────────┐
              │  Monitoring Dashboard    │
              │  Conference → Channels   │
              │  → Providers → Latency   │
              └──────────────────────────┘
```

### Hierarchical View

```
System
├── Global Stats
│   ├── Deepgram: avg 45ms, p95 120ms, p99 200ms
│   ├── DeepL: avg 180ms, p95 350ms, p99 500ms
│   ├── ElevenLabs: avg 420ms, p95 800ms, p99 1200ms
│   └── End-to-End: avg 650ms, p95 1100ms, p99 1500ms
│
├── Conference: conf_123
│   ├── Channel: EN (English source)
│   │   ├── Deepgram: 42ms avg
│   │   ├── DeepL: 175ms avg
│   │   └── ElevenLabs: 410ms avg
│   │
│   ├── Channel: HE (Hebrew output)
│   │   └── Latency stats...
│   │
│   └── Channel: JA (Japanese output)
│       └── Latency stats...
│
└── Conference: conf_456
    └── Channels...
```

---

## Implementation

### Files Created

1. **latency-collector.js** (340 lines)
   - Core latency aggregation logic
   - Hierarchical data structure
   - Socket.IO integration
   - Statistics calculation (avg, min, max, p50, p95, p99)

2. **latency-collector-integration.js** (200 lines)
   - Integration guide
   - Exact code patches
   - Minimal changes required

### Integration Required

**Only 5 lines of code** added to existing system:

```javascript
// 1. Import (1 line)
const LatencyCollector = require('./latency-collector');
const latencyCollector = new LatencyCollector();

// 2. Record ASR latency (1 line)
asrWorker.on('final', async (transcript) => {
    latencyCollector.recordASRLatency(activeConnectionId, transcript); // NEW
    // ... existing code ...
});

// 3. Record pipeline latencies (3 lines)
io.emit('pipelineComplete', { ... });
latencyCollector.recordTranslationLatency(activeConnectionId, translationTime); // NEW
latencyCollector.recordTTSLatency(activeConnectionId, ttsTime);                // NEW
latencyCollector.recordEndToEndLatency(activeConnectionId, totalTime, data);   // NEW

// 4. Register with Socket.IO (1 line - in conference-server.js)
latencyCollector.registerSocketHandlers(io); // NEW
```

**Total modifications**: 5 lines across 2 files

---

## What Data We Get

### Per-Channel Stats

```javascript
{
  channelId: "conn_123",
  language: "en",
  deepgram: {
    count: 45,
    avg: 42,        // Average latency
    min: 12,
    max: 180,
    p50: 38,        // Median
    p95: 120,       // 95th percentile
    p99: 165,       // 99th percentile
    recent: [38, 42, 45, 41, 39, ...]  // Last 10 measurements
  },
  deepl: { ... },
  elevenlabs: { ... },
  endToEnd: { ... }
}
```

### Global Stats (All Channels)

```javascript
{
  timestamp: 1730000000000,
  totalChannels: 5,
  providers: {
    deepgram: {
      total: 12450,     // Total latency across all requests
      count: 287,       // Total requests
      avg: 43,
      min: 8,
      max: 320
    },
    deepl: { ... },
    elevenlabs: { ... },
    endToEnd: { ... }
  }
}
```

### Hierarchical View (Conference → Channels)

```javascript
{
  timestamp: 1730000000000,
  global: { ... },
  conferences: [
    {
      conferenceId: "conf_123",
      channelCount: 3,
      channels: [
        { channelId: "en_source", language: "en", stats: {...} },
        { channelId: "he_output", language: "he", stats: {...} },
        { channelId: "ja_output", language: "ja", stats: {...} }
      ],
      uptime: 125000  // ms
    }
  ],
  orphanedChannels: [...]  // Channels not in conferences
}
```

---

## Socket.IO Events

### Client → Server

```javascript
// Request global stats
socket.emit('get-latency-stats', { type: 'global' });

// Request channel stats
socket.emit('get-latency-stats', {
  type: 'channel',
  channelId: 'conn_123'
});

// Request conference stats
socket.emit('get-latency-stats', {
  type: 'conference',
  conferenceId: 'conf_123'
});

// Request hierarchical view
socket.emit('get-latency-stats', { type: 'hierarchical' });
```

### Server → Client

```javascript
// Real-time latency updates (on every measurement)
socket.on('latency-update', (data) => {
  // { provider: 'deepgram', channelId: 'conn_123', latency: 42 }
});

// Hierarchical view (broadcast every 2 seconds)
socket.on('latency-hierarchical-view', (data) => {
  // Full system hierarchy with all stats
});

// Specific stats responses
socket.on('latency-global-stats', (data) => { ... });
socket.on('latency-channel-stats', (data) => { ... });
socket.on('latency-conference-stats', (data) => { ... });
```

---

## Monitoring Dashboard Integration

The existing monitoring pages can consume this data:

### conference-monitor.html
Already created - just need to connect to new events:

```javascript
// Replace test data with real data
socket.on('latency-hierarchical-view', (data) => {
  updateConferenceList(data.conferences);
  updateChannelBreakdown(data);
  updateLatencyTimeline(data);
});
```

### latency-control.html
Already created - connect to provider stats:

```javascript
socket.on('latency-hierarchical-view', (data) => {
  updateProviderLatencies(data.global.providers);
  updateChannelList(data.conferences);
});
```

---

## Advantages Over Metadata Tracking

| Aspect | Metadata Tracking | API-Driven Monitoring |
|--------|------------------|---------------------|
| **Pipeline Impact** | Broke pipeline (6.35ms/sec overhead) | Zero impact (data already exists) |
| **Code Changes** | 100+ lines, complex logic | 5 lines total |
| **Risk Level** | HIGH - touches critical path | MINIMAL - passive observation |
| **Data Accuracy** | Theoretical (never worked) | Actual API response times |
| **Rollback Complexity** | git checkout required | Delete 5 lines |
| **Debugging** | Hard (timing-sensitive) | Easy (just stop recording) |
| **Performance** | High frequency (50/sec) | Low frequency (~1-5/sec) |
| **Maintenance** | High (complex correlation) | Low (simple aggregation) |

---

## Next Steps

### Phase 1: Integration (SAFE)

1. ✅ Created latency-collector.js
2. ✅ Created integration guide
3. ⏸️ Add 5 lines to audiosocket-integration.js
4. ⏸️ Add 1 line to conference-server.js
5. ⏸️ Test with checkpoint system

**Risk**: Minimal (passive observation, no pipeline changes)

### Phase 2: Dashboard Connection

1. Update conference-monitor.html to use real data
2. Update latency-control.html to show provider stats
3. Add latency timeline charts

### Phase 3: Advanced Features

1. Alerting on high latency (p95 > threshold)
2. Language-specific latency tracking
3. Historical data export
4. Latency optimization recommendations

---

## Testing Strategy

### Verification Steps

1. **Start server** (automatic checkpoint created)

2. **Make test call** (extension 7000)

3. **Check console logs**:
   ```
   [LatencyCollector] ✓ Integrated with Socket.IO
   ```

4. **Verify data collection** (during call):
   ```javascript
   // In browser console on dashboard
   socket.emit('get-latency-stats', { type: 'global' });

   socket.on('latency-global-stats', (data) => {
     console.log('Global stats:', data);
   });
   ```

5. **Expected output**:
   ```javascript
   {
     timestamp: 1730000000000,
     totalChannels: 1,
     providers: {
       deepgram: { avg: 45, count: 12, ... },
       deepl: { avg: 180, count: 8, ... },
       elevenlabs: { avg: 420, count: 8, ... }
     }
   }
   ```

6. **Verify all features still working**:
   - ✓ Asterisk Voice Stream (IN)
   - ✓ ASR Transcription (Deepgram)
   - ✓ Translation Pipeline
   - ✓ Hume AI Emotion Detection
   - ✓ Audio Output to Browser

### Rollback Plan

If ANY issue occurs:
```bash
ssh azureuser@4.185.84.26
cd /home/azureuser/translation-app
./restore-checkpoint.sh 1
./start-server.sh
```

**Data loss**: Only latency monitoring (production unaffected)

---

## Key Differences from Original Plan

### Original Plan (docs/Metadata_Tracking_Latency_Management.md)

- Stage 1: Track metadata through pipeline
- Complex frame correlation
- High-frequency tracking (50fps)
- Invasive pipeline modifications

### New Approach (This Document)

- Use timing data APIs already provide
- Simple event-based aggregation
- Low-frequency collection (~1-5/sec)
- Zero pipeline modifications

### Why This is Better

1. **APIs know their own latency better than we can measure**
   - Deepgram tells us ASR latency
   - We measure DeepL round-trip time
   - ElevenLabs reports TTS generation time
   - More accurate than frame correlation

2. **Hierarchical monitoring meets original goal**
   - Provider → Channel → Conference (as requested)
   - Dynamic mapping without complex tracking
   - Real-time updates via Socket.IO

3. **Safe to implement incrementally**
   - Add LatencyCollector (doesn't break anything)
   - Add 5 integration lines (passive observation)
   - Connect dashboard (pure UI change)
   - Each step independently testable

---

## Conclusion

This API-driven approach achieves the original goal (hierarchical latency monitoring) without the complexity and risk of metadata tracking.

**Original request**:
> "Deepgram, DeepL, ElevenLabs, and Hume AI all have highly developed and documented APIs—it seems to me that each of them can provide a stream of processing time to the channel, and then all that remains is to dynamically maintain the mapping to each provider and monitor."

**This implementation delivers exactly that.**

---

## Files Reference

- `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/latency-collector.js`
  - Core implementation (340 lines)

- `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/latency-collector-integration.js`
  - Integration guide with exact code patches

- `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/public/conference-monitor.html`
  - Monitoring dashboard (ready to connect)

- `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/public/latency-control.html`
  - Latency control UI (ready to connect)

- `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/docs/Metadata_Tracking_Latency_Management.md`
  - Original plan (superseded by this approach)

- `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/docs/Frame_Metadata_Failure_Analysis.md`
  - Analysis of why metadata tracking failed
