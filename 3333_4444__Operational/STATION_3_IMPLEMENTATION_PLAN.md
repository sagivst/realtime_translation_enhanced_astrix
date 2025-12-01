# Station 3 Implementation Plan - Step by Step

## Overview

Install monitoring agents into **STTTTSserver.js** (single file) with all stations calling shared collector modules. Start with **Station 3 (Pre-Deepgram)** as the prototype.

---

## Architecture Decision

### Single File Approach
- ✅ All monitoring code embedded in `STTTTSserver.js`
- ✅ Shared collector modules loaded once via `require()`
- ✅ Each station (3, 4, 9, 11) calls same collectors
- ✅ All metrics emit to existing Socket.IO server (port 3010)
- ✅ Dashboard connects to same port (3021 or 3010)

### Agent Responsibilities
**Station Agents = MONITORING ONLY**
- Collect metrics
- Analyze audio
- Emit to Socket.IO
- **DO NOT change parameters**

**Parameter changes handled separately by:**
- Config/Control Service (future phase)
- Manual updates via dashboard (future phase)
- Optimizer recommendations (future phase)

---

## Step-by-Step Implementation

### STEP 1: Prepare Collector Modules (30 minutes)

Create shared modules that all stations will use.

#### 1.1 Create Directory Structure

```bash
cd /Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver

mkdir -p monitoring
mkdir -p monitoring/collectors
mkdir -p monitoring/utils
```

#### 1.2 Copy Base Files

Copy these from station-agent-sdk:

```bash
# From SDK to STTTTSserver
cp ../station-agent-sdk/src/collectors/MetricCollector.js ./monitoring/collectors/
cp ../station-agent-sdk/src/collectors/BufferMetrics.js ./monitoring/collectors/
cp ../station-agent-sdk/src/collectors/AudioQualityMetrics.js ./monitoring/collectors/
cp ../station-agent-sdk/src/utils/AudioAnalyzer.js ./monitoring/utils/
```

#### 1.3 Create Minimal Collector Set for Station 3

File: `monitoring/collectors/Station3Collectors.js`

```javascript
/**
 * Station 3 Collectors - Pre-Deepgram Monitoring
 *
 * Collects 14 parameters before sending audio to Deepgram
 */

const {
  BufferProcessingCollector
} = require('./BufferMetrics');

const {
  SNRCollector,
  SpeechLevelCollector,
  ClippingCollector,
  NoiseCollector
} = require('./AudioQualityMetrics');

class Station3CollectorSet {
  constructor() {
    // Initialize only the collectors needed for Station 3
    this.collectors = {
      'buffer.processing': new BufferProcessingCollector(),
      'audioQuality.snr': new SNRCollector(),
      'audioQuality.speechLevel': new SpeechLevelCollector(),
      'audioQuality.clipping': new ClippingCollector(),
      'audioQuality.noise': new NoiseCollector()
    };
  }

  /**
   * Collect all metrics for Station 3
   * @param {Object} context - Audio and buffer data
   * @returns {Object} - Collected metrics
   */
  async collectAll(context) {
    const metrics = {};
    const alerts = [];

    for (const [key, collector] of Object.entries(this.collectors)) {
      try {
        const value = await collector.collect(context);

        if (value !== null && value !== undefined) {
          metrics[key] = value;

          // Check thresholds
          const validation = collector.validate(value);
          if (validation.level === 'warning' || validation.level === 'critical') {
            alerts.push({
              metric: key,
              level: validation.level,
              value: value,
              message: validation.message
            });
          }
        }
      } catch (error) {
        console.error(`[Station3] Error collecting ${key}:`, error.message);
      }
    }

    return { metrics, alerts };
  }
}

module.exports = Station3CollectorSet;
```

---

### STEP 2: Embed Station 3 Agent in STTTTSserver.js (45 minutes)

#### 2.1 Add Require Statements (Top of File)

Location: **Line ~15** (after existing requires)

```javascript
// ========================================================================
// MONITORING SYSTEM - Station Agents
// ========================================================================
const Station3CollectorSet = require('./monitoring/collectors/Station3Collectors');

// Initialize Station 3 collectors for both extensions
const station3_3333 = new Station3CollectorSet();
const station3_4444 = new Station3CollectorSet();

console.log('[Monitoring] ✓ Station 3 collectors initialized for extensions 3333/4444');
```

#### 2.2 Create Helper Function (After global.io setup)

Location: **Line ~100** (after `global.io = io;`)

```javascript
/**
 * Collect and emit Station 3 metrics
 * Non-blocking to avoid impacting audio pipeline
 *
 * @param {string} extension - "3333" or "4444"
 * @param {Buffer} pcmBuffer - PCM audio buffer
 * @param {Object} buffers - Buffer state
 */
async function collectAndEmitStation3Metrics(extension, pcmBuffer, buffers) {
  try {
    const collector = extension === '3333' ? station3_3333 : station3_4444;

    // Build context for collectors
    const context = {
      pcmBuffer: pcmBuffer,
      sampleRate: 16000,
      buffers: {
        processing: {
          durationMs: buffers.chunks.length * 10, // Rough estimate (10ms per chunk)
          size: buffers.totalBytes,
          capacity: 32000 // Max buffer size
        }
      }
    };

    // Collect metrics
    const { metrics, alerts } = await collector.collectAll(context);

    // Emit to dashboard
    global.io.emit('station3_metrics', {
      station: 'STATION_3',
      extension: extension,
      timestamp: Date.now(),
      metrics: metrics,
      alerts: alerts
    });

    // Log critical alerts
    if (alerts.length > 0) {
      const critical = alerts.filter(a => a.level === 'critical');
      if (critical.length > 0) {
        console.warn(`[Station3-${extension}] CRITICAL ALERTS:`, critical);
      }
    }

  } catch (error) {
    console.error(`[Station3-${extension}] Metric collection failed:`, error.message);
  }
}
```

#### 2.3 Hook into Extension 3333 UDP Handler

Location: **Line ~3677** (inside `socket3333In.on('message')`)

**BEFORE:**
```javascript
socket3333In.on('message', async (msg, rinfo) => {
  udpPcmStats.from3333Packets++;

  if (udpPcmStats.from3333Packets <= 5) {
    console.log(`[UDP-3333] Gateway connected: ${msg.length} bytes/frame...`);
  }

  if (global.io) {
    global.io.emit('audioStream', {
      extension: '3333',
      buffer: msg,
      sampleRate: UDP_PCM_CONFIG.sampleRate,
      timestamp: Date.now()
    });
  }

  // ... rest of existing code
```

**AFTER (add monitoring):**
```javascript
socket3333In.on('message', async (msg, rinfo) => {
  udpPcmStats.from3333Packets++;

  if (udpPcmStats.from3333Packets <= 5) {
    console.log(`[UDP-3333] Gateway connected: ${msg.length} bytes/frame...`);
  }

  if (global.io) {
    global.io.emit('audioStream', {
      extension: '3333',
      buffer: msg,
      sampleRate: UDP_PCM_CONFIG.sampleRate,
      timestamp: Date.now()
    });
  }

  // ========================================================================
  // NEW: Station 3 Monitoring (every 50th packet to reduce overhead)
  // ========================================================================
  if (udpPcmStats.from3333Packets % 50 === 0) {
    setImmediate(() => {
      collectAndEmitStation3Metrics('3333', msg, udpAudioBuffers.get('3333'));
    });
  }
  // ========================================================================

  // PHASE 3-5: Deepgram Streaming WebSocket Integration
  if (USE_DEEPGRAM_STREAMING && streamingStateManager) {
    // ... existing code unchanged
  }

  // ... rest of existing code unchanged
```

#### 2.4 Hook into Extension 4444 UDP Handler

Location: **Line ~3802** (inside `socket4444In.on('message')`)

Add identical monitoring code for extension 4444:

```javascript
socket4444In.on('message', async (msg, rinfo) => {
  udpPcmStats.from4444Packets++;

  if (udpPcmStats.from4444Packets <= 5) {
    console.log(`[UDP-4444] Gateway connected: ${msg.length} bytes/frame...`);
  }

  if (global.io) {
    global.io.emit('audioStream', {
      extension: '4444',
      buffer: msg,
      sampleRate: UDP_PCM_CONFIG.sampleRate,
      timestamp: Date.now()
    });
  }

  // ========================================================================
  // NEW: Station 3 Monitoring
  // ========================================================================
  if (udpPcmStats.from4444Packets % 50 === 0) {
    setImmediate(() => {
      collectAndEmitStation3Metrics('4444', msg, udpAudioBuffers.get('4444'));
    });
  }
  // ========================================================================

  // ... rest of existing code unchanged
```

---

### STEP 3: Add Socket.IO Event to Dashboard (20 minutes)

#### 3.1 Find Dashboard File

Check which dashboard is active:
- Port 3021: Look for dashboard at that port
- Or use existing `monitoring-dashboard.html`

#### 3.2 Add Event Listener

Location: In dashboard JavaScript section (after existing socket.on listeners)

```javascript
// NEW: Station 3 Metrics Handler
socket.on('station3_metrics', (data) => {
  console.log('[Station3] Metrics received:', data);

  const { station, extension, timestamp, metrics, alerts } = data;

  // Update display for this extension
  updateStation3Display(extension, metrics, alerts);
});

function updateStation3Display(extension, metrics, alerts) {
  // Find or create display elements
  const containerId = `station3-${extension}`;
  let container = document.getElementById(containerId);

  if (!container) {
    // Create container if it doesn't exist
    container = createStation3Container(extension);
  }

  // Update metrics
  if (metrics['audioQuality.snr']) {
    document.getElementById(`${containerId}-snr`).textContent =
      metrics['audioQuality.snr'].toFixed(1) + ' dB';
  }

  if (metrics['audioQuality.speechLevel']) {
    document.getElementById(`${containerId}-speech-level`).textContent =
      metrics['audioQuality.speechLevel'].toFixed(1) + ' dBFS';
  }

  if (metrics['audioQuality.clipping']) {
    const clippingPct = (metrics['audioQuality.clipping'] * 100).toFixed(3);
    document.getElementById(`${containerId}-clipping`).textContent =
      clippingPct + ' %';
  }

  if (metrics['audioQuality.noise']) {
    document.getElementById(`${containerId}-noise`).textContent =
      metrics['audioQuality.noise'].toFixed(1) + ' dBFS';
  }

  // Update alerts
  const alertContainer = document.getElementById(`${containerId}-alerts`);
  if (alertContainer && alerts.length > 0) {
    alertContainer.innerHTML = alerts.map(alert => {
      const color = alert.level === 'critical' ? 'red' : 'orange';
      return `<div style="color: ${color}">${alert.message}</div>`;
    }).join('');
  } else if (alertContainer) {
    alertContainer.innerHTML = '<div style="color: green">✓ All metrics normal</div>';
  }
}

function createStation3Container(extension) {
  // Create HTML structure for Station 3 display
  const html = `
    <div id="station3-${extension}" class="station-card">
      <h3>Station 3 - Extension ${extension}</h3>
      <div class="metric-row">
        <span>SNR:</span>
        <span id="station3-${extension}-snr">--</span>
      </div>
      <div class="metric-row">
        <span>Speech Level:</span>
        <span id="station3-${extension}-speech-level">--</span>
      </div>
      <div class="metric-row">
        <span>Clipping:</span>
        <span id="station3-${extension}-clipping">--</span>
      </div>
      <div class="metric-row">
        <span>Noise Floor:</span>
        <span id="station3-${extension}-noise">--</span>
      </div>
      <div id="station3-${extension}-alerts" class="alerts"></div>
    </div>
  `;

  // Append to main container
  const mainContainer = document.getElementById('stations-container');
  if (mainContainer) {
    mainContainer.insertAdjacentHTML('beforeend', html);
  }

  return document.getElementById(`station3-${extension}`);
}
```

---

### STEP 4: Testing (30 minutes)

#### 4.1 Restart STTTTSserver

```bash
# Stop existing server
pkill -f STTTTSserver.js

# Start with logging
cd /Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver
node STTTTSserver.js 2>&1 | tee station3-test.log
```

#### 4.2 Check Startup Logs

Look for:
```
[Monitoring] ✓ Station 3 collectors initialized for extensions 3333/4444
```

#### 4.3 Make Test Call

```bash
# Connect extension 3333
# Audio should flow through system
```

#### 4.4 Monitor Console Output

Should see:
```
[Station3-3333] Metrics collected: { audioQuality.snr: 24.5, ... }
```

#### 4.5 Check Dashboard

Open: `http://20.170.155.53:3010/monitoring-dashboard.html`

Should see:
- Station 3 cards for 3333 and 4444
- Real-time metric updates
- SNR, speech level, clipping, noise floor

#### 4.6 Verify Socket.IO Events

In browser console:
```javascript
// Should see events
station3_metrics { station: "STATION_3", extension: "3333", ... }
```

---

### STEP 5: Performance Validation (15 minutes)

#### 5.1 Measure CPU Impact

```bash
# Before monitoring
top -pid $(pgrep -f STTTTSserver)

# After monitoring
# CPU should increase by < 5%
```

#### 5.2 Check Memory Usage

```bash
# Should increase by < 20MB
ps aux | grep STTTTSserver
```

#### 5.3 Audio Quality Check

- No dropouts
- No increased latency
- Clear audio on both ends

#### 5.4 Latency Measurement

Check that end-to-end latency hasn't increased:
- Before: ~500-800ms
- After: Should be same (monitoring is non-blocking)

---

## File Checklist

After implementation, you should have:

```
STTTTSserver/
├── STTTTSserver.js                          # MODIFIED (3 changes)
├── monitoring/                              # NEW DIRECTORY
│   ├── collectors/
│   │   ├── MetricCollector.js              # Base class
│   │   ├── BufferMetrics.js                # Buffer collectors
│   │   ├── AudioQualityMetrics.js          # Audio collectors
│   │   └── Station3Collectors.js           # Station 3 set
│   └── utils/
│       └── AudioAnalyzer.js                # Audio analysis utilities
└── public/
    └── monitoring-dashboard.html            # MODIFIED (added listener)
```

---

## Modification Summary

### STTTTSserver.js Changes

| Location | Change | Lines |
|----------|--------|-------|
| Line ~15 | Add require() for Station3Collectors | +5 |
| Line ~100 | Add collectAndEmitStation3Metrics() function | +45 |
| Line ~3677 | Hook into 3333 UDP handler | +7 |
| Line ~3802 | Hook into 4444 UDP handler | +7 |

**Total changes:** ~64 lines added (no lines removed)

### monitoring-dashboard.html Changes

| Location | Change | Lines |
|----------|--------|-------|
| Socket.IO section | Add station3_metrics listener | +3 |
| Functions section | Add updateStation3Display() | +30 |
| Functions section | Add createStation3Container() | +35 |

**Total changes:** ~68 lines added

---

## Success Criteria

✅ Server starts without errors
✅ "Station 3 collectors initialized" message appears
✅ Metrics emit every ~0.5 seconds during calls
✅ Dashboard displays real-time data
✅ Alerts appear when thresholds exceeded
✅ CPU overhead < 5%
✅ Memory overhead < 20MB
✅ No audio quality impact
✅ No latency increase

---

## Rollback Plan

If issues occur:

1. **Comment out monitoring code:**
   ```javascript
   // Comment lines 3684-3690 (3333 monitoring)
   // Comment lines 3809-3815 (4444 monitoring)
   ```

2. **Restart server:**
   ```bash
   pkill -f STTTTSserver.js
   node STTTTSserver.js
   ```

3. **System returns to normal operation**

---

## Next Steps After Station 3

Once Station 3 is working:

1. **Station 4** (Deepgram Response) - Add after transcription
2. **Station 9** (Post-TTS) - Add before sending to Gateway
3. **Station 11** (Hume Branch) - Add in parallel to Hume
4. **Stations 2 & 10** (Gateway) - Add to gateway files
5. **Station 1** (Asterisk) - External monitoring

---

## Parameter Changes - Future Phase

**Station agents DO NOT change parameters.**

Parameter changes will be handled by separate system:

```
Optimizer → Config Service → Parameter Update API → Stations
```

This is Phase 6+ and requires:
- Ingestion API
- Database
- Optimizer service
- Config/Control service

For now, **monitoring only** = simpler, safer, faster to deploy.

---

## Questions Before Implementation?

1. Should we collect every 50th packet (current plan) or different frequency?
2. Do you want to see console logs for each metric collection?
3. Should alerts be sent via email/Slack in addition to dashboard?
4. What port is your monitoring dashboard actually running on?
5. Do you want to test on a separate branch first?

---

**Ready to implement when you approve!** 🚀
