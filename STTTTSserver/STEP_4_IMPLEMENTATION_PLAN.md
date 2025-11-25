# Step 4: Audio Buffer Implementation - Detailed Plan
**Date:** 2025-11-11
**Target File:** `conference-server-externalmedia.js`
**Insertion Point:** After line ~1360 (TTS completion)
**Estimated Complexity:** Medium-High (4-6 sub-tasks)

---

## Executive Summary

**Objective:** Implement the complete audio return path from Conference Server → Gateway with buffer delay applied.

**Current State:**
- Audio processed (ASR → MT → TTS) ✅
- Buffer calculated but not applied ⚠️
- Audio emitted to dashboard only (`translated-audio`) ✅
- Audio NEVER sent back to Gateway (`translatedAudio`) ❌

**Target State:**
- Retrieve buffer settings from Step 3 storage ✅
- Calculate total buffer (autoSync + manual) ✅
- Convert MP3 → PCM16 format ✅
- Apply buffer delay using AudioBufferManager ✅
- Emit `translatedAudio` to Gateway for opposite extension ✅
- Audio returns to Asterisk and plays ✅

---

## Architecture Flow (Target)

```
┌──────────────────────────────────────────────────────────────────┐
│ CURRENT FLOW (Incoming Audio)                                    │
├──────────────────────────────────────────────────────────────────┤
│ Asterisk Ext 7777 → Gateway → Conference Server                 │
│   (RTP audio)       (PCM16)   (Socket.IO 'audioStream')         │
│                                                                   │
│ Processing: ASR → MT → TTS → MP3 Audio (ElevenLabs)            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ MISSING FLOW (Outgoing Audio) ← STEP 4 IMPLEMENTS THIS          │
├──────────────────────────────────────────────────────────────────┤
│ Conference Server → Buffer Delay → Gateway → Asterisk Ext 8888  │
│   (MP3 → PCM16)     (Step 4.4)    (Socket.IO 'translatedAudio')│
│                                                                   │
│ NOTE: Audio sent to OPPOSITE extension (7777 → 8888, 8888 → 7777)│
└──────────────────────────────────────────────────────────────────┘
```

---

## Sub-Tasks Breakdown

### **Sub-Task 4.1: Retrieve Buffer Settings**
**Priority:** 🔴 CRITICAL (Required for all subsequent tasks)
**Complexity:** ⭐ TRIVIAL
**Location:** After line 1360 (TTS completion)
**Dependencies:** Step 3 (extensionBufferSettings Map)

#### Implementation Code
```javascript
// ═══════════════════════════════════════════════════════════════
// STEP 4.1: RETRIEVE BUFFER SETTINGS
// ═══════════════════════════════════════════════════════════════
// Get the paired extension (audio routing target)
const pairedExtension = pairManager.getPairedExtension(extension);

// Retrieve stored settings for THIS extension
const settings = extensionBufferSettings.get(extension) || { autoSync: false, manualLatencyMs: 0 };
const autoSync = settings.autoSync;
const manualLatencyMs = settings.manualLatencyMs;

console.log(`[Buffer Apply] Extension ${extension} settings: autoSync=${autoSync}, manualLatency=${manualLatencyMs}ms`);
```

#### Verification
- [ ] Console logs show correct autoSync state
- [ ] Console logs show correct manualLatencyMs value
- [ ] Values match dashboard controls

---

### **Sub-Task 4.2: Calculate Total Buffer Delay**
**Priority:** 🔴 CRITICAL
**Complexity:** ⭐⭐ SIMPLE
**Location:** Immediately after Sub-Task 4.1
**Dependencies:** Sub-Task 4.1, latencyTracker

#### Implementation Code
```javascript
// ═══════════════════════════════════════════════════════════════
// STEP 4.2: CALCULATE TOTAL BUFFER DELAY
// ═══════════════════════════════════════════════════════════════
// Get current latency difference (already calculated in existing code)
const latencyDifference = latencyTracker.getCurrentLatencyDifference(extension, pairedExtension);

// Initialize total buffer with manual adjustment (always applied)
let totalBufferMs = manualLatencyMs;

// Add auto-sync buffer ONLY if:
// 1. Auto Sync is enabled, AND
// 2. Latency data is available, AND
// 3. This extension is FASTER (negative latency difference)
if (autoSync && latencyDifference !== null && latencyDifference < 0) {
  // This extension is FASTER (lower latency) than its pair
  // Buffer by the absolute difference to synchronize
  const autoSyncBufferMs = Math.abs(latencyDifference);
  totalBufferMs += autoSyncBufferMs;

  console.log(`[Buffer Apply] Extension ${extension} is FASTER by ${Math.round(autoSyncBufferMs)}ms`);
  console.log(`[Buffer Apply] Auto-sync buffer: +${Math.round(autoSyncBufferMs)}ms`);
} else if (autoSync && latencyDifference !== null && latencyDifference > 0) {
  // This extension is SLOWER (higher latency) - no auto-sync buffer needed
  console.log(`[Buffer Apply] Extension ${extension} is SLOWER by ${Math.round(latencyDifference)}ms - no auto-sync buffer needed`);
} else if (latencyDifference === null) {
  console.log(`[Buffer Apply] No latency data yet for synchronization`);
}

console.log(`[Buffer Apply] Total buffer for extension ${extension}: ${Math.round(totalBufferMs)}ms (manual: ${manualLatencyMs}ms, auto: ${Math.round(totalBufferMs - manualLatencyMs)}ms)`);
```

#### Buffer Calculation Logic Reference

| Scenario | Ext 7777 E2E | Ext 8888 E2E | Ext 7777 Buffer | Ext 8888 Buffer |
|----------|-------------|-------------|-----------------|-----------------|
| 7777 Faster | 500ms | 700ms | +200ms (slow down) | 0ms (no delay) |
| 8888 Faster | 700ms | 500ms | 0ms (no delay) | +200ms (slow down) |
| Equal | 600ms | 600ms | 0ms | 0ms |

**Sign Convention:**
- `latencyDifference < 0` → Extension is FASTER → needs buffer
- `latencyDifference > 0` → Extension is SLOWER → no buffer
- `latencyDifference = 0` → Extensions equal → no buffer

#### Verification
- [ ] Correct buffer calculated for faster extension
- [ ] Zero buffer for slower extension
- [ ] Manual latency always added
- [ ] Console logs show breakdown (manual + auto)

---

### **Sub-Task 4.3: Audio Format Conversion (MP3 → PCM16)**
**Priority:** 🟠 HIGH (Required for Gateway compatibility)
**Complexity:** ⭐⭐⭐ MODERATE
**Location:** After Sub-Task 4.2
**Dependencies:** Sub-Task 4.2, ElevenLabs MP3 audio

#### Problem Statement
- **Input:** `ttsAudio` (MP3 Buffer from ElevenLabs)
- **Required Output:** PCM16, 16kHz, mono, raw Buffer
- **Gateway Expectation:** PCM16 format (gateway-7777-8888.js:214-218)

#### Implementation Options

##### **Option A: Use ffmpeg Command (Recommended)**
**Pros:** No new dependencies, ffmpeg already available
**Cons:** Subprocess spawn overhead (~10-50ms)

```javascript
// ═══════════════════════════════════════════════════════════════
// STEP 4.3A: AUDIO FORMAT CONVERSION (ffmpeg command)
// ═══════════════════════════════════════════════════════════════
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);
const fs = require('fs');
const path = require('path');

async function convertMp3ToPcm16(mp3Buffer) {
  const tempDir = '/tmp';
  const inputFile = path.join(tempDir, `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`);
  const outputFile = path.join(tempDir, `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pcm`);

  try {
    // Write MP3 to temporary file
    fs.writeFileSync(inputFile, mp3Buffer);

    // Convert: MP3 → PCM16, 16kHz, mono, signed 16-bit little-endian
    const ffmpegCommand = `ffmpeg -i ${inputFile} -f s16le -acodec pcm_s16le -ar 16000 -ac 1 ${outputFile}`;
    await execPromise(ffmpegCommand);

    // Read PCM data
    const pcmBuffer = fs.readFileSync(outputFile);

    // Cleanup
    fs.unlinkSync(inputFile);
    fs.unlinkSync(outputFile);

    console.log(`[Audio Convert] MP3 → PCM16: ${mp3Buffer.length} bytes → ${pcmBuffer.length} bytes`);
    return pcmBuffer;

  } catch (error) {
    console.error('[Audio Convert] Error converting MP3 to PCM16:', error);
    // Cleanup on error
    try { fs.unlinkSync(inputFile); } catch {}
    try { fs.unlinkSync(outputFile); } catch {}
    throw error;
  }
}

// Usage in pipeline
const pcmAudioBuffer = await convertMp3ToPcm16(ttsAudio);
```

##### **Option B: Use fluent-ffmpeg Library**
**Pros:** Cleaner API, better error handling
**Cons:** Requires `npm install fluent-ffmpeg`

```javascript
// ═══════════════════════════════════════════════════════════════
// STEP 4.3B: AUDIO FORMAT CONVERSION (fluent-ffmpeg)
// ═══════════════════════════════════════════════════════════════
const ffmpeg = require('fluent-ffmpeg');
const stream = require('stream');

async function convertMp3ToPcm16(mp3Buffer) {
  return new Promise((resolve, reject) => {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(mp3Buffer);

    const chunks = [];

    ffmpeg(bufferStream)
      .format('s16le')
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .on('error', (err) => {
        console.error('[Audio Convert] Error:', err);
        reject(err);
      })
      .on('end', () => {
        const pcmBuffer = Buffer.concat(chunks);
        console.log(`[Audio Convert] MP3 → PCM16: ${mp3Buffer.length} bytes → ${pcmBuffer.length} bytes`);
        resolve(pcmBuffer);
      })
      .pipe()
      .on('data', (chunk) => chunks.push(chunk));
  });
}

// Usage in pipeline
const pcmAudioBuffer = await convertMp3ToPcm16(ttsAudio);
```

##### **Option C: prism-media Library**
**Pros:** Lightweight, streaming support
**Cons:** Requires `npm install prism-media`

```javascript
// ═══════════════════════════════════════════════════════════════
// STEP 4.3C: AUDIO FORMAT CONVERSION (prism-media)
// ═══════════════════════════════════════════════════════════════
const prism = require('prism-media');

async function convertMp3ToPcm16(mp3Buffer) {
  return new Promise((resolve, reject) => {
    const decoder = new prism.FFmpeg({
      args: [
        '-analyzeduration', '0',
        '-loglevel', '0',
        '-f', 's16le',
        '-ar', '16000',
        '-ac', '1',
      ],
    });

    const chunks = [];

    decoder.on('data', (chunk) => chunks.push(chunk));
    decoder.on('end', () => {
      const pcmBuffer = Buffer.concat(chunks);
      console.log(`[Audio Convert] MP3 → PCM16: ${mp3Buffer.length} bytes → ${pcmBuffer.length} bytes`);
      resolve(pcmBuffer);
    });
    decoder.on('error', reject);

    decoder.end(mp3Buffer);
  });
}

// Usage in pipeline
const pcmAudioBuffer = await convertMp3ToPcm16(ttsAudio);
```

#### Recommended Approach
**Use Option A (ffmpeg command)** for initial implementation:
- No new dependencies
- Easy to debug
- Can optimize later if conversion time becomes bottleneck

#### Verification
- [ ] MP3 input converts successfully
- [ ] PCM16 output format verified (16kHz, mono, s16le)
- [ ] Output buffer size reasonable (~16000 bytes per second of audio)
- [ ] Conversion completes in <100ms
- [ ] Console logs show input/output byte counts

---

### **Sub-Task 4.4: Apply Buffer Delay Using AudioBufferManager**
**Priority:** 🔴 CRITICAL (Core buffer mechanism)
**Complexity:** ⭐⭐ SIMPLE
**Location:** After Sub-Task 4.3
**Dependencies:** Sub-Tasks 4.1, 4.2, 4.3, AudioBufferManager class

#### AudioBufferManager Reference

**Existing Class Location:** conference-server-externalmedia.js:305-356

```javascript
class AudioBufferManager {
  constructor() {
    this.buffers = new Map(); // extension → { audio: Buffer, timeout: NodeJS.Timeout }
  }

  bufferAndSend(extension, audioData, delayMs, sendCallback) {
    // Clear any existing buffer for this extension
    this.clearBuffer(extension);

    if (delayMs <= 0) {
      // No delay - send immediately
      sendCallback(extension, audioData);
      return;
    }

    // Store audio and set timeout
    const timeout = setTimeout(() => {
      sendCallback(extension, audioData);
      this.buffers.delete(extension);
    }, delayMs);

    this.buffers.set(extension, { audio: audioData, timeout });
    console.log(`[AudioBufferManager] Buffered ${audioData.length} bytes for extension ${extension} with ${delayMs}ms delay`);
  }

  clearBuffer(extension) {
    const existing = this.buffers.get(extension);
    if (existing) {
      clearTimeout(existing.timeout);
      this.buffers.delete(extension);
    }
  }

  clearAllBuffers() {
    for (const [extension, data] of this.buffers.entries()) {
      clearTimeout(data.timeout);
    }
    this.buffers.clear();
  }
}
```

#### Instantiation (Add at Server Startup)

**Location:** conference-server-externalmedia.js, near other initializations (around line 360)

```javascript
// ═══════════════════════════════════════════════════════════════
// STEP 4: INSTANTIATE AUDIO BUFFER MANAGER
// ═══════════════════════════════════════════════════════════════
const audioBufferManager = new AudioBufferManager();
console.log('[Server] Audio buffer manager initialized');
```

#### Implementation Code

```javascript
// ═══════════════════════════════════════════════════════════════
// STEP 4.4: APPLY BUFFER AND SEND TO GATEWAY
// ═══════════════════════════════════════════════════════════════
// Use AudioBufferManager to apply calculated delay
audioBufferManager.bufferAndSend(
  pairedExtension,     // Send to OPPOSITE extension (7777 → 8888, 8888 → 7777)
  pcmAudioBuffer,      // PCM16 audio from Sub-Task 4.3
  totalBufferMs,       // Calculated delay from Sub-Task 4.2
  (targetExtension, delayedAudio) => {
    // This callback executes AFTER the buffer delay expires
    console.log(`[Buffer Applied] Sending ${delayedAudio.length} bytes to extension ${targetExtension} after ${totalBufferMs}ms delay`);

    // Proceed to Sub-Task 4.5 (emit to Gateway)
    // Implementation continues in next sub-task...
  }
);
```

#### Key Points
- **Target Extension:** `pairedExtension` (OPPOSITE of source)
  - Extension 7777 audio → send to 8888
  - Extension 8888 audio → send to 7777
- **Delay:** `totalBufferMs` from Sub-Task 4.2
- **Callback:** Executes after delay, triggers Socket.IO emit

#### Verification
- [ ] AudioBufferManager instantiated at server startup
- [ ] `bufferAndSend()` called with correct parameters
- [ ] Console log shows buffer applied
- [ ] Callback executes after expected delay
- [ ] Zero delay (totalBufferMs=0) sends immediately

---

### **Sub-Task 4.5: Emit 'translatedAudio' to Gateway**
**Priority:** 🔴 CRITICAL (Completes audio return path)
**Complexity:** ⭐ TRIVIAL
**Location:** Inside AudioBufferManager callback (Sub-Task 4.4)
**Dependencies:** Sub-Task 4.4, Gateway listener

#### Gateway Listener Reference

**File:** gateway-7777-8888.js:214-218

```javascript
socket.on('translatedAudio', (data) => {
  const { extension, audio, format, sampleRate, timestamp } = data;
  console.log(`[Gateway] Received translated audio for extension ${extension}: ${audio ? audio.length : 0} bytes, format: ${format}, sampleRate: ${sampleRate}`);

  // TODO: Send to Asterisk via RTP
  // This is where audio gets forwarded to the opposite Asterisk extension
});
```

#### Implementation Code

```javascript
// ═══════════════════════════════════════════════════════════════
// STEP 4.5: EMIT TRANSLATED AUDIO TO GATEWAY
// ═══════════════════════════════════════════════════════════════
audioBufferManager.bufferAndSend(
  pairedExtension,
  pcmAudioBuffer,
  totalBufferMs,
  (targetExtension, delayedAudio) => {
    // Emit to Gateway via Socket.IO with event name: 'translatedAudio' (camelCase)
    global.io.emit('translatedAudio', {
      extension: targetExtension,        // Opposite extension (7777 → 8888 or 8888 → 7777)
      audio: delayedAudio,               // PCM16 Buffer
      format: 'pcm16',                   // Audio format
      sampleRate: 16000,                 // Sample rate (Hz)
      channels: 1,                       // Mono
      timestamp: Date.now(),             // Send timestamp
      bufferApplied: totalBufferMs,      // Metadata: how much buffer was applied
      sourceExtension: extension         // Metadata: original source extension
    });

    console.log(`[Audio Forward] Emitted 'translatedAudio' to Gateway for extension ${targetExtension}: ${delayedAudio.length} bytes (PCM16, 16kHz, mono) with ${totalBufferMs}ms buffer applied`);
  }
);
```

#### Event Name CRITICAL
- **Gateway listens for:** `'translatedAudio'` (camelCase, no dash)
- **Do NOT use:** `'translated-audio'` (with dash - that's for dashboard visualization)
- **These are DIFFERENT Socket.IO events**

#### Data Format
| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `extension` | String | Target extension (opposite of source) | ✅ Yes |
| `audio` | Buffer | PCM16 audio data | ✅ Yes |
| `format` | String | `'pcm16'` | ✅ Yes |
| `sampleRate` | Number | `16000` | ✅ Yes |
| `channels` | Number | `1` (mono) | ⚠️ Recommended |
| `timestamp` | Number | `Date.now()` | ⚠️ Recommended |
| `bufferApplied` | Number | Delay applied (ms) | ⚪ Optional |
| `sourceExtension` | String | Original source | ⚪ Optional |

#### Verification
- [ ] Event name is exactly `'translatedAudio'` (camelCase)
- [ ] `extension` field is pairedExtension (opposite of source)
- [ ] `audio` field contains PCM16 Buffer
- [ ] `format` is `'pcm16'`
- [ ] `sampleRate` is `16000`
- [ ] Gateway console logs show "Received translated audio"
- [ ] Audio data length reasonable (~16000 bytes/sec)

---

### **Sub-Task 4.6: Gateway RTP Forwarding (Optional Enhancement)**
**Priority:** 🟡 MEDIUM (Completes end-to-end flow)
**Complexity:** ⭐⭐⭐ MODERATE
**Location:** gateway-7777-8888.js:214-218
**Dependencies:** Sub-Task 4.5

#### Current Gateway State
Gateway receives `'translatedAudio'` but has TODO comment:

```javascript
socket.on('translatedAudio', (data) => {
  const { extension, audio, format, sampleRate, timestamp } = data;
  console.log(`[Gateway] Received translated audio for extension ${extension}: ${audio ? audio.length : 0} bytes, format: ${format}, sampleRate: ${sampleRate}`);

  // TODO: Send to Asterisk via RTP ← NEEDS IMPLEMENTATION
});
```

#### Implementation (If Needed)

```javascript
socket.on('translatedAudio', (data) => {
  const { extension, audio, format, sampleRate, timestamp } = data;
  console.log(`[Gateway] Received translated audio for extension ${extension}: ${audio.length} bytes`);

  // Get RTP session for this extension
  const rtpSession = rtpSessions.get(extension);

  if (!rtpSession) {
    console.error(`[Gateway] No RTP session found for extension ${extension}`);
    return;
  }

  // Validate format
  if (format !== 'pcm16' || sampleRate !== 16000) {
    console.error(`[Gateway] Unsupported format: ${format}@${sampleRate}Hz`);
    return;
  }

  // Send PCM16 audio to Asterisk via RTP
  // (Implementation depends on existing RTP library)
  rtpSession.send(audio);

  console.log(`[Gateway] Forwarded ${audio.length} bytes to Asterisk extension ${extension}`);
});
```

**Note:** This may already be implemented or require RTP session management updates.

#### Verification
- [ ] RTP session exists for target extension
- [ ] Audio forwarded to Asterisk successfully
- [ ] Audio plays on destination phone/softphone
- [ ] No audio glitches or quality issues

---

## Complete Step 4 Integration Code

**Location:** conference-server-externalmedia.js, after line ~1360 (TTS completion)

```javascript
// ═══════════════════════════════════════════════════════════════
// STAGE 6: TTS Processing (ElevenLabs) - COMPLETED ABOVE
// ═══════════════════════════════════════════════════════════════
// ... existing TTS code ...
const ttsAudio = await synthesizeSpeech(translation, targetLang);
timing.t6_ttsCompleted = Date.now();
// ... existing timing code ...

// ═══════════════════════════════════════════════════════════════
// STEP 4: APPLY BUFFER AND SEND AUDIO TO GATEWAY
// ═══════════════════════════════════════════════════════════════

// SUB-TASK 4.1: Retrieve Buffer Settings
const pairedExtension = pairManager.getPairedExtension(extension);
const settings = extensionBufferSettings.get(extension) || { autoSync: false, manualLatencyMs: 0 };
const autoSync = settings.autoSync;
const manualLatencyMs = settings.manualLatencyMs;

console.log(`[Buffer Apply] Extension ${extension} settings: autoSync=${autoSync}, manualLatency=${manualLatencyMs}ms`);

// SUB-TASK 4.2: Calculate Total Buffer Delay
const latencyDifference = latencyTracker.getCurrentLatencyDifference(extension, pairedExtension);
let totalBufferMs = manualLatencyMs;

if (autoSync && latencyDifference !== null && latencyDifference < 0) {
  const autoSyncBufferMs = Math.abs(latencyDifference);
  totalBufferMs += autoSyncBufferMs;
  console.log(`[Buffer Apply] Extension ${extension} is FASTER by ${Math.round(autoSyncBufferMs)}ms - adding auto-sync buffer`);
}

console.log(`[Buffer Apply] Total buffer: ${Math.round(totalBufferMs)}ms (manual: ${manualLatencyMs}ms, auto: ${Math.round(totalBufferMs - manualLatencyMs)}ms)`);

// SUB-TASK 4.3: Audio Format Conversion (MP3 → PCM16)
let pcmAudioBuffer;
try {
  pcmAudioBuffer = await convertMp3ToPcm16(ttsAudio);
} catch (error) {
  console.error(`[Buffer Apply] Audio conversion failed for extension ${extension}:`, error);
  return; // Skip sending if conversion fails
}

// SUB-TASKS 4.4 & 4.5: Apply Buffer and Emit to Gateway
audioBufferManager.bufferAndSend(
  pairedExtension,
  pcmAudioBuffer,
  totalBufferMs,
  (targetExtension, delayedAudio) => {
    global.io.emit('translatedAudio', {
      extension: targetExtension,
      audio: delayedAudio,
      format: 'pcm16',
      sampleRate: 16000,
      channels: 1,
      timestamp: Date.now(),
      bufferApplied: totalBufferMs,
      sourceExtension: extension
    });

    console.log(`[Audio Forward] Sent ${delayedAudio.length} bytes to extension ${targetExtension} after ${totalBufferMs}ms buffer`);
  }
);

// ═══════════════════════════════════════════════════════════════
// CONTINUE WITH EXISTING CODE (Dashboard emit, timing, etc.)
// ═══════════════════════════════════════════════════════════════
timing.t7_lsStarted = Date.now();
// ... rest of existing code ...
```

---

## Implementation Checklist

### Pre-Implementation
- [ ] Review existing code around line 1360
- [ ] Verify AudioBufferManager class exists (line 305)
- [ ] Check if `convertMp3ToPcm16()` function exists (likely doesn't)
- [ ] Verify `extensionBufferSettings` Map is initialized
- [ ] Confirm Gateway listener exists (gateway-7777-8888.js:214)

### Sub-Task Implementation Order
1. [ ] **Sub-Task 4.3:** Implement `convertMp3ToPcm16()` function first (separate function)
2. [ ] **Sub-Task 4.0:** Instantiate `audioBufferManager` at server startup
3. [ ] **Sub-Task 4.1:** Add settings retrieval code
4. [ ] **Sub-Task 4.2:** Add buffer calculation code
5. [ ] **Sub-Task 4.3:** Add audio conversion call
6. [ ] **Sub-Task 4.4:** Add `audioBufferManager.bufferAndSend()` call
7. [ ] **Sub-Task 4.5:** Add `global.io.emit('translatedAudio', ...)` inside callback

### Testing After Implementation
- [ ] Server restarts without errors
- [ ] Console shows AudioBufferManager initialization
- [ ] Make test call on extensions 7777 and 8888
- [ ] Dashboard shows buffer settings retrieval logs
- [ ] Dashboard shows buffer calculation logs
- [ ] Gateway logs show "Received translated audio"
- [ ] Audio plays on destination phone (if Gateway RTP forwarding implemented)

### Performance Validation
- [ ] MP3→PCM16 conversion completes in <100ms
- [ ] Buffer delays apply accurately (±10ms tolerance)
- [ ] No audio glitches or cutouts
- [ ] Memory usage stable (no buffer leaks)

---

## Risk Assessment

### High Risk
1. **Audio Format Conversion:** ffmpeg subprocess may introduce latency
   - **Mitigation:** Monitor conversion time, optimize if >50ms
2. **Event Name Typo:** `'translatedAudio'` vs `'translated-audio'`
   - **Mitigation:** Triple-check exact spelling, test Gateway reception
3. **Buffer Timing Accuracy:** setTimeout may drift
   - **Mitigation:** Acceptable for ±10ms tolerance, optimize later if needed

### Medium Risk
1. **Missing Dependencies:** ffmpeg not installed on VM
   - **Mitigation:** Verify `which ffmpeg` before implementation
2. **Memory Leaks:** Buffers not cleared properly
   - **Mitigation:** Ensure AudioBufferManager clears on timeout
3. **Gateway Not Ready:** RTP forwarding incomplete
   - **Mitigation:** Log Gateway reception first, implement RTP later

### Low Risk
1. **Settings Retrieval:** Already tested in Step 3
2. **Buffer Calculation:** Logic already exists (lines 1415-1443)
3. **Socket.IO Emit:** Proven working for dashboard events

---

## Expected Outcomes

### Success Criteria
1. ✅ Audio returns to Gateway with event name `'translatedAudio'`
2. ✅ Buffer delay applied correctly (faster extension delayed)
3. ✅ Audio format converted to PCM16, 16kHz, mono
4. ✅ Settings from dashboard controls used in buffer calculation
5. ✅ Console logs show complete pipeline execution

### Performance Targets
- **Audio Conversion:** <100ms
- **Buffer Delay Accuracy:** ±10ms
- **Total Overhead:** <150ms added latency

### Observable Behaviors
- Dashboard "Total Buffer" value matches applied delay
- Gateway logs show audio reception
- Audio quality maintained after conversion
- Synchronization improves when Auto Sync enabled

---

## Next Steps After Completion

1. **Test Step 4:** Verify audio return path works
2. **Measure Latency:** Confirm buffer delays are accurate
3. **Optional Step 5:** Implement audio monitoring stream
4. **Production Deploy:** Create checkpoint backup before deploying
5. **Documentation:** Update session handoff with Step 4 completion

---

## Quick Reference Commands

```bash
# Deploy Step 4 implementation
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app/7777-8888-stack

# Backup before changes
cp conference-server-externalmedia.js conference-server-externalmedia.js.backup-step4

# Edit file (use nano, vim, or upload modified version)
nano conference-server-externalmedia.js

# Restart Conference Server
pkill -f conference-server-externalmedia.js
nohup node conference-server-externalmedia.js > conference-debug.log 2>&1 &

# Monitor logs
tail -f conference-debug.log | grep -E 'Buffer Apply|Audio Convert|Audio Forward'

# Test with dashboard
# Open: http://20.170.155.53:3002/dashboard-latency-split.html
# Make calls on extensions 7777 and 8888
# Watch logs for buffer application
```

---

## Troubleshooting Guide

### Issue: "convertMp3ToPcm16 is not defined"
**Cause:** Function not implemented
**Solution:** Add `convertMp3ToPcm16()` function before usage (see Sub-Task 4.3)

### Issue: "audioBufferManager is not defined"
**Cause:** Not instantiated at server startup
**Solution:** Add `const audioBufferManager = new AudioBufferManager();` after class definition

### Issue: Gateway not receiving 'translatedAudio'
**Cause:** Event name mismatch or Socket.IO not connected
**Solution:**
1. Verify exact spelling: `'translatedAudio'` (camelCase)
2. Check Gateway Socket.IO connection status
3. Monitor Conference Server for emit logs

### Issue: Audio conversion fails
**Cause:** ffmpeg not installed or incorrect arguments
**Solution:**
1. Verify: `ssh azureuser@20.170.155.53 "which ffmpeg"`
2. Test manually: `ffmpeg -i test.mp3 -f s16le -acodec pcm_s16le -ar 16000 -ac 1 test.pcm`
3. Check error logs for ffmpeg output

### Issue: Buffer not applying (audio sends immediately)
**Cause:** totalBufferMs = 0 or AudioBufferManager logic error
**Solution:**
1. Check console logs for calculated totalBufferMs value
2. Verify Auto Sync toggle state on dashboard
3. Confirm latencyDifference is negative for faster extension

---

## Summary

**Step 4 transforms the system from:**
- ❌ Audio processed but never returned → ✅ Audio processed, buffered, and sent back to Gateway

**6 Sub-Tasks:**
1. Retrieve settings (TRIVIAL)
2. Calculate buffer (SIMPLE)
3. Convert audio format (MODERATE)
4. Apply buffer delay (SIMPLE)
5. Emit to Gateway (TRIVIAL)
6. Gateway RTP forwarding (OPTIONAL)

**Estimated Implementation Time:** 1-2 hours (including testing)

**This completes the core sync buffer system!**
