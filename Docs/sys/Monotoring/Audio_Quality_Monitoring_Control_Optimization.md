# Audio Quality Monitoring, Control & Optimization Plan

**Document Version:** 1.0  
**Date:** 2025-11-25  
**System:** 3333/4444 Real-Time Translation with GStreamer

---

## Executive Summary

This document provides a comprehensive, step-by-step plan to diagnose, monitor, and optimize audio quality in the real-time translation system. The plan addresses the current "choppy audio with missing syllable endings" issue while maximizing system efficiency and performance.

**Current Issue:** Outgoing SIP voice sounds choppy - words are missing part of the last syllable

**Goal:** Identify root cause, implement targeted fix, validate quality, and establish ongoing monitoring

---

## Table of Contents

1. [Current System State](#current-system-state)
2. [Known Issues](#known-issues)
3. [Phase 1: Diagnostic Infrastructure (1-2 hours, LOW risk)](#phase-1-diagnostic-infrastructure)
4. [Phase 2: Data Collection (30-60 min, LOW risk)](#phase-2-data-collection)
5. [Phase 3: Root Cause Analysis (1-2 hours, LOW risk)](#phase-3-root-cause-analysis)
6. [Phase 4: Targeted Fixes (2-4 hours, MEDIUM-HIGH risk)](#phase-4-targeted-fixes)
7. [Phase 5: Validation & Testing (1-2 hours, LOW risk)](#phase-5-validation--testing)
8. [Phase 6: Performance Optimization (2-4 hours, LOW-MEDIUM risk)](#phase-6-performance-optimization)
9. [Monitoring & Alerting](#monitoring--alerting)
10. [Rollback Procedures](#rollback-procedures)

**Total Estimated Time:** 8-16 hours  
**Phases can be executed incrementally over multiple sessions**

---

## Current System State

### ✅ Working Components

- Asterisk → Gateway → STTTTSserver → Gateway → Asterisk (audio path functional)
- Deepgram STT (speech-to-text working)
- DeepL MT (machine translation working)  
- ElevenLabs TTS (text-to-speech working)
- RTP sequence wrapping fixed (gateways stable for >6 minutes)
- Audio gain at 7.5x (proper amplification for Deepgram)
- Timing/Sync module operational with AutoSync

### System Architecture

```
Phone A (3333) ─┬─> Asterisk:4000 ─> Gateway-3333 ─> GStreamer (ALAW→PCM) ─> STTTTSserver:6120
                │                                                             │
                │                                                             ├─> Deepgram STT
                │                                                             ├─> DeepL MT
                │                                                             └─> ElevenLabs TTS
                │
                └─< Asterisk:4000 ─< Gateway-3333 ─< GStreamer (PCM→ALAW) ─< STTTTSserver:6121

Phone B (4444) ─┬─> Asterisk:4002 ─> Gateway-4444 ─> GStreamer (ALAW→PCM) ─> STTTTSserver:6122
                │                                                             │
                │                                                             └─> [Same Pipeline]
                │
                └─< Asterisk:4002 ─< Gateway-4444 ─< GStreamer (PCM→ALAW) ─< STTTTSserver:6123
```

### Current Processes (Reference)

```bash
# Check current PIDs
ps aux | grep -E 'STTTTSserver|gateway-3333|gateway-4444|ari-gstreamer' | grep -v grep
```

Expected processes:
- STTTTSserver (node)
- Gateway-3333 (node) 
- Gateway-4444 (node)
- ARI Handler (node)

---

## Known Issues

### Issue #1: Choppy Audio with Missing Syllable Endings

**Severity:** HIGH  
**Impact:** User experience - outgoing SIP voice sounds incomplete  
**Status:** Under investigation

**Symptoms:**
- Words missing the last syllable or partial syllable
- Audio sounds "cut off" at the end of phrases
- Issue became more severe after previous attempted fix

**Suspected Causes (Hypotheses):**

| ID | Hypothesis | Evidence Needed | Impact if True |
|----|-----------|-----------------|----------------|
| H1 | `sendUdpPcmAudio()` using `Math.floor()` drops last partial frame | Bytes dropped > 0 in logs | High - Direct truncation |
| H2 | ElevenLabs TTS output incomplete | TTS sizes vary significantly | High - Source truncation |
| H3 | Gateway buffer issues causing packet loss | RX ≠ TX in gateway stats | Medium - Packet drops |
| H4 | GStreamer frame boundaries misaligned | Non-standard frame sizes | Medium - Format issues |
| H5 | Timing/Sync module premature termination | Audio cut before stream end | Low - Logic error |

**Previous Fix Attempt (FAILED):**
- **Change:** Modified `Math.floor` to `Math.ceil`, removed `setTimeout`
- **Result:** Broke transcription completely (audio gain dropped to near-zero)
- **Lesson:** Problem is more complex - changes affected unrelated audio processing

---

## Phase 1: Diagnostic Infrastructure

**🎯 Goal:** Build comprehensive monitoring without disrupting the working system

**⏱ Duration:** 1-2 hours  
**⚠️ Risk Level:** LOW (read-only monitoring only)

### Step 1.1: Enhanced Logging in sendUdpPcmAudio

**Objective:** Add detailed logging to track dropped bytes

**File:** `STTTTSserver/STTTTSserver.js` (lines ~4000-4033)

**Changes to make (LOGGING ONLY - NO LOGIC CHANGES):**

```bash
# 1. Backup current file
ssh azureuser@20.170.155.53 "cp /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js.backup-diagnostic-$(date +%Y%m%d-%H%M%S)"

# 2. Find the function
ssh azureuser@20.170.155.53 "grep -n 'async function sendUdpPcmAudio' /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js"
```

**Add these log lines (insert after line that calculates totalFrames):**

```javascript
  const frameSize = UDP_PCM_CONFIG.frameSizeBytes;
  const totalFrames = Math.floor(pcmBuffer.length / frameSize);

  // ===== ADD THESE LINES =====
  const bytesProcessed = totalFrames * frameSize;
  const bytesDropped = pcmBuffer.length - bytesProcessed;
  const msDropped = (bytesDropped / 32).toFixed(2); // 32 bytes/ms @ 16kHz PCM

  console.log(`[UDP-${targetExtension}] 📊 Buffer: ${pcmBuffer.length}B, Frames: ${totalFrames}, Dropped: ${bytesDropped}B (${msDropped}ms)`);
  // ===== END ADDITIONS =====

  console.log(`[UDP-${targetExtension}] Sending ${pcmBuffer.length} bytes (${totalFrames} frames)`);
```

**Implementation:**
```bash
# Use sed to insert the logging (adjust line numbers after finding exact location)
ssh azureuser@20.170.155.53 "sed -i.bak '/<line_after_totalFrames>/a\\
  const bytesProcessed = totalFrames * frameSize;\\
  const bytesDropped = pcmBuffer.length - bytesProcessed;\\
  const msDropped = (bytesDropped / 32).toFixed(2);\\
  console.log(\`[UDP-\${targetExtension}] 📊 Buffer: \${pcmBuffer.length}B, Frames: \${totalFrames}, Dropped: \${bytesDropped}B (\${msDropped}ms)\`);' /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js"
```

### Step 1.2: TTS Output Size Monitoring

**Objective:** Track ElevenLabs TTS output to detect source truncation

```bash
# Find where ElevenLabs TTS is called
ssh azureuser@20.170.155.53 "grep -n -A5 'elevenlabs\|TTS' /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js | grep -E 'audio|buffer|generate' | head -20"
```

**Add logging around TTS generation:**

```javascript
// BEFORE TTS call
console.log(`[TTS] 📝 Generating audio for: "${translatedText}" (${translatedText.length} chars)`);

// AFTER receiving audio buffer
console.log(`[TTS] 🎵 Generated ${audioBuffer.length} bytes`);
console.log(`[TTS] ⏱ Expected duration: ~${(audioBuffer.length / 32000).toFixed(2)}s @ 16kHz PCM`);
```

### Step 1.3: Gateway Packet Monitoring

**Objective:** Monitor packets sent from gateways to Asterisk

**File:** Gateway files (gateway-3333.js, gateway-4444.js)

```bash
# Find downsampler output handler
ssh azureuser@20.170.155.53 "grep -n 'gstDownsampler.stdout' /home/azureuser/translation-app/3333_4444__Operational/gateway-3333.js"
```

**Add logging:**

```javascript
gstDownsampler.stdout.on('data', (alawData) => {
  if (!asteriskEndpoint) return;

  // ADD THIS LINE
  console.log(`[GW-3333] 📤 Downsampler output: ${alawData.length} bytes ALAW`);

  const rtpPacket = Buffer.alloc(12 + alawData.length);
  // ... existing RTP code ...

  // ADD THIS LINE
  console.log(`[GW-3333] 📡 Sending RTP: ${rtpPacket.length}B total (${alawData.length}B payload)`);
});
```

### Step 1.4: Restart with Diagnostic Logging

```bash
# Kill current STTTTSserver
ssh azureuser@20.170.155.53 "kill \$(ps aux | grep 'node.*STTTTSserver' | grep -v grep | awk '{print \$2}')"

# Start with new logging
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && nohup node STTTTSserver.js > /tmp/STTTTSserver-diagnostic.log 2>&1 & sleep 3 && ps aux | grep 'node.*STTTTSserver' | grep -v grep"

# Verify it started
ssh azureuser@20.170.155.53 "tail -30 /tmp/STTTTSserver-diagnostic.log"
```

---

## Phase 2: Data Collection

**🎯 Goal:** Gather baseline metrics during live calls

**⏱ Duration:** 30-60 minutes  
**⚠️ Risk Level:** LOW (monitoring only)

### Step 2.1: Prepare Monitoring

```bash
# Terminal 1: Monitor STTTTSserver logs
ssh azureuser@20.170.155.53 "tail -f /tmp/STTTTSserver-diagnostic.log" | grep --line-buffered -E 'UDP-|TTS|Dropped'

# Terminal 2: Monitor gateway logs  
ssh azureuser@20.170.155.53 "tail -f /tmp/gateway-3333-operational.log /tmp/gateway-4444-operational.log"

# Terminal 3: Keep ready for analysis commands
```

### Step 2.2: Conduct Structured Test Calls

**Test Protocol - Execute in order:**

| Test | Phrase | Expected Audio | Listen For |
|------|--------|----------------|------------|
| T1 | "Hello" | ~1 second | Missing "o" sound |
| T2 | "Testing" | ~1.5 seconds | Missing "ng" sound |
| T3 | "Good morning" | ~2 seconds | Cut-off on "morning" |
| T4 | "The quick brown fox" | ~3 seconds | Multiple word endings |
| T5 | "One two three four five" | ~4 seconds | Number endings |

**For each test:**
1. Call extension 3333
2. Speak the test phrase clearly
3. Wait for translation
4. Note audio quality (missing syllables? choppy?)
5. Hang up
6. Collect logs immediately

**Log Collection After Each Test:**

```bash
# Extract data for test T1 (adjust test number)
ssh azureuser@20.170.155.53 "echo '=== Test T1: Hello ===' >> /tmp/test-results.log && grep -A2 -B2 'Dropped' /tmp/STTTTSserver-diagnostic.log | tail -10 >> /tmp/test-results.log && grep 'TTS.*Generated' /tmp/STTTTSserver-diagnostic.log | tail -3 >> /tmp/test-results.log"
```

### Step 2.3: Extract Metrics

```bash
# Create analysis script
cat > /tmp/analyze-audio.sh << 'EOF'
#!/bin/bash

echo "=========================================="
echo "  AUDIO QUALITY DIAGNOSTIC ANALYSIS"
echo "=========================================="
echo ""

LOG="/tmp/STTTTSserver-diagnostic.log"

echo "1️⃣  BYTES DROPPED ANALYSIS"
echo "─────────────────────────────────────"
ssh azureuser@20.170.155.53 "grep 'Dropped:' $LOG" | \
  awk -F'Dropped: ' '{print $2}' | \
  awk -F'B' '{sum+=$1; count++; if($1>0)drops++; if($1>max)max=$1} 
       END {
         print "  Total sendUdpPcmAudio calls:", count
         print "  Calls with drops:", drops, "("drops/count*100"%)"
         print "  Average dropped:", sum/count, "bytes"
         print "  Max single drop:", max, "bytes"
         print "  Cumulative lost:", sum, "bytes total"
       }'

echo ""
echo "2️⃣  TTS OUTPUT SIZE ANALYSIS"
echo "─────────────────────────────────────"
ssh azureuser@20.170.155.53 "grep 'TTS.*Generated' $LOG" | \
  awk '{for(i=1;i<=NF;i++)if($i~/[0-9]+/)print $i}' | \
  awk '{sum+=$1; count++; if($1<min||min==0)min=$1; if($1>max)max=$1}
       END {
         print "  Total TTS calls:", count
         print "  Average size:", int(sum/count), "bytes"
         print "  Min size:", min, "bytes"
         print "  Max size:", max, "bytes"
         print "  Size variance:", max-min, "bytes"
       }'

echo ""
echo "3️⃣  PACKET FLOW ANALYSIS"
echo "─────────────────────────────────────"
ssh azureuser@20.170.155.53 "grep -E 'Sending.*frames|Sent.*frames' $LOG | tail -20" | \
  awk '{print $NF}' | \
  awk '{sum+=$1; count++}
       END {
         print "  Recent frame counts:", count, "transmissions"
         print "  Average frames per send:", int(sum/count)
       }'

echo ""
echo "=========================================="
EOF

chmod +x /tmp/analyze-audio.sh
/tmp/analyze-audio.sh
```

---

## Phase 3: Root Cause Analysis

**🎯 Goal:** Identify exact location(s) where audio is being truncated

**⏱ Duration:** 1-2 hours  
**⚠️ Risk Level:** LOW (analysis only)

### Step 3.1: Evaluate Collected Data

**Decision Tree:**

```
Start: Analyze collected metrics
│
├─ Are bytes being dropped in sendUdpPcmAudio?
│  ├─ YES → How many bytes typically?
│  │  ├─ 1-50 bytes (< 1.5ms): Minor issue, likely not root cause
│  │  ├─ 50-100 bytes (1.5-3ms): Moderate issue, investigate further
│  │  └─ >100 bytes (>3ms): Major issue, PRIMARY CAUSE → Go to Fix A
│  │
│  └─ NO → Check TTS output consistency
│     ├─ TTS sizes vary >30%: PRIMARY CAUSE → Go to Fix C
│     └─ TTS sizes consistent: Check gateway packets
│        ├─ Packet loss detected: PRIMARY CAUSE → Go to Fix D
│        └─ No packet loss: UNKNOWN CAUSE → Manual investigation needed
```

### Step 3.2: Hypothesis Validation

**Execute validation tests based on data:**

#### If H1 (sendUdpPcmAudio truncation) looks likely:

```bash
# Count how often drops occur
ssh azureuser@20.170.155.53 "grep 'Dropped:' /tmp/STTTTSserver-diagnostic.log | awk -F'Dropped: ' '{print $2}' | awk -F'B' '{if($1>0)print $1}' | wc -l"

# Calculate cumulative loss
ssh azureuser@20.170.155.53 "grep 'Dropped:' /tmp/STTTTSserver-diagnostic.log | awk -F'Dropped: ' '{sum+=$1} END {print \"Total bytes lost:\", sum, \"(\", sum/32, \"ms)\"}'"

# Decision: If >50% of calls drop bytes AND cumulative >500ms, H1 is PRIMARY
```

#### If H2 (TTS truncation) looks likely:

```bash
# Compare TTS output for similar text lengths
ssh azureuser@20.170.155.53 "grep -B1 'TTS.*Generated' /tmp/STTTTSserver-diagnostic.log | grep -E 'Generating|Generated'" | paste - - | head -10

# Look for pattern: long text → short audio = truncation
```

#### If H3 (Gateway issues) looks likely:

```bash
# Check gateway stats
ssh azureuser@20.170.155.53 "grep 'Stats:' /tmp/gateway-3333-operational.log | tail -10"

# Compare RX vs TX counts - should be equal
```

### Step 3.3: Document Root Cause

**Create findings report:**

```bash
cat > /tmp/root-cause-findings.txt << EOF
==============================================
AUDIO QUALITY ROOT CAUSE ANALYSIS - FINDINGS
==============================================

Date: $(date)
Analyst: [Your Name]

PRIMARY HYPOTHESIS CONFIRMED: [H1/H2/H3/H4/H5]

EVIDENCE:
- [Key metric 1]
- [Key metric 2]
- [Key metric 3]

IMPACT ASSESSMENT:
- Severity: [High/Medium/Low]
- Frequency: [Every call / Intermittent / Rare]
- Audio loss: [X] ms per call average

RECOMMENDED FIX: [Fix A / B / C / D]

CONFIDENCE LEVEL: [High / Medium / Low]

NEXT STEPS:
1. [Action 1]
2. [Action 2]
3. [Action 3]
EOF

cat /tmp/root-cause-findings.txt
```

---

## Phase 4: Targeted Fixes

**🎯 Goal:** Apply precise fixes based on confirmed root cause

**⏱ Duration:** 2-4 hours  
**⚠️ Risk Level:** MEDIUM to HIGH (code changes)

**⚠️ CRITICAL: ALWAYS backup before making changes!**

### Fix A: sendUdpPcmAudio Frame Truncation

**Apply this if:** Bytes are being dropped consistently (H1 confirmed)

**Strategy:** Send ALL audio including partial last frame, with padding

**File:** `STTTTSserver/STTTTSserver.js` (~line 4000-4033)

**Implementation:**

```bash
# 1. Create timestamped backup
ssh azureuser@20.170.155.53 "cp /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js.backup-fix-a-$(date +%Y%m%d-%H%M%S)"

# 2. Save the new fixed version to a temp file first
cat > /tmp/sendUdpPcmAudio-fixed.js << 'FUNCEND'
async function sendUdpPcmAudio(targetExtension, pcmBuffer) {
  const socket = targetExtension === '3333' ? socket3333Out : socket4444Out;
  const port = targetExtension === '3333' ? UDP_PCM_CONFIG.port3333Out : UDP_PCM_CONFIG.port4444Out;

  const frameSize = UDP_PCM_CONFIG.frameSizeBytes;
  
  // FIX: Use Math.ceil to include partial last frame
  const totalFrames = Math.ceil(pcmBuffer.length / frameSize);

  console.log(`[UDP-${targetExtension}] Sending ${pcmBuffer.length} bytes (${totalFrames} frames, includes partial)`);

  for (let i = 0; i < totalFrames; i++) {
    const start = i * frameSize;
    const end = Math.min((i + 1) * frameSize, pcmBuffer.length);
    const frame = pcmBuffer.slice(start, end);

    // Pad partial frames to full frameSize with silence
    let frameToSend;
    if (frame.length < frameSize) {
      const paddedFrame = Buffer.alloc(frameSize, 0);  // Silence
      frame.copy(paddedFrame);
      frameToSend = paddedFrame;
      console.log(`[UDP-${targetExtension}] Padded last frame: ${frame.length}B → ${frameSize}B`);
    } else {
      frameToSend = frame;
    }

    await new Promise((resolve, reject) => {
      socket.send(frameToSend, port, UDP_PCM_CONFIG.gatewayHost, (err) => {
        if (err) {
          reject(err);
        } else {
          if (targetExtension === '3333') {
            udpPcmStats.to3333Packets++;
          } else {
            udpPcmStats.to4444Packets++;
          }
          resolve();
        }
      });
    });

    // Use correct frame timing
    await new Promise(resolve => setTimeout(resolve, UDP_PCM_CONFIG.frameSizeMs));
  }

  console.log(`[UDP-${targetExtension}] ✓ Sent ${totalFrames} frames`);
}
FUNCEND

# 3. Copy to server
scp /tmp/sendUdpPcmAudio-fixed.js azureuser@20.170.155.53:/tmp/

# 4. Manual step: Replace the function in the actual file
echo "⚠️  MANUAL EDIT REQUIRED:"
echo "   1. SSH to server: ssh azureuser@20.170.155.53"
echo "   2. Edit file: nano /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js"
echo "   3. Find function: search for 'async function sendUdpPcmAudio'"
echo "   4. Replace entire function with content from: /tmp/sendUdpPcmAudio-fixed.js"
echo "   5. Save and exit"
echo ""
echo "Press ENTER when done..."
read

# 5. Restart STTTTSserver
ssh azureuser@20.170.155.53 "kill \$(ps aux | grep 'node.*STTTTSserver' | grep -v grep | awk '{print \$2}') && sleep 2 && cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && nohup node STTTTSserver.js > /tmp/STTTTSserver-fix-a.log 2>&1 & sleep 3 && ps aux | grep 'node.*STTTTSserver' | grep -v grep"

# 6. Monitor startup
ssh azureuser@20.170.155.53 "tail -50 /tmp/STTTTSserver-fix-a.log"
```

**Validation:**

```bash
# Test immediately with SHORT phrase to minimize impact if it breaks
echo "🧪 TEST 1: Make a call to 3333 and say 'Hello'"
echo "   Monitor for:"
echo "   - ✓ Transcription works (text appears in logs)"
echo "   - ✓ Audio gain stays at 7.5x (check amplifier logs)"
echo "   - ✓ Translation completes successfully"
echo ""
echo "Monitoring logs..."

# Watch logs in real-time
ssh azureuser@20.170.155.53 "tail -f /tmp/STTTTSserver-fix-a.log" | grep --line-buffered -E 'Deepgram|Audio Amplifier|transcription|Translation completed'

# After test call, check for failures
ssh azureuser@20.170.155.53 "grep -E 'Empty transcription|Error|gain: [0-9]{1,3}[^0-9]' /tmp/STTTTSserver-fix-a.log | tail -20"
```

**ROLLBACK if any of these occur:**
- Empty transcription
- Audio gain < 1000
- Errors in logs
- Process crashes

```bash
# Emergency rollback
ssh azureuser@20.170.155.53 "kill \$(ps aux | grep 'node.*STTTTSserver' | grep -v grep | awk '{print \$2}') && cp /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js.backup-fix-a-* /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js && cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && nohup node STTTTSserver.js > /tmp/STTTTTSserver-restored.log 2>&1 &"

echo "✅ Rolled back to previous version"
```

### Fix B: Remove setTimeout Delay

**Apply this ONLY if:**
- Fix A succeeded
- Audio still sounds stuttery
- Not needed if Fix A resolves the issue

```javascript
// Remove the setTimeout line:
// BEFORE:
await new Promise(resolve => setTimeout(resolve, UDP_PCM_CONFIG.frameSizeMs));

// AFTER:
// <removed> or use setImmediate() for non-blocking yield
```

### Fix C: ElevenLabs TTS Buffer

**Apply this if:** TTS output is inconsistent/truncated (H2 confirmed)

**Strategy:** Ensure complete audio buffer accumulation from TTS

```javascript
// Find TTS stream handling code
// Ensure all chunks are collected before processing:

const audioChunks = [];
for await (const chunk of elevenlabsStream) {
  audioChunks.push(chunk);
}
const completeAudio = Buffer.concat(audioChunks);

console.log(`[TTS] ✅ Complete buffer: ${completeAudio.length} bytes`);

// Validate duration matches expected
const durationSec = completeAudio.length / 32000;
console.log(`[TTS] Duration: ${durationSec.toFixed(2)}s`);
```

### Fix D: Gateway Buffer Increase

**Apply this if:** Packet loss detected in gateway stats (H3 confirmed)

```javascript
// In both gateway-3333.js and gateway-4444.js
// Add after socket creation:

const BUFFER_SIZE = 256 * 1024;  // 256KB
socket.setRecvBufferSize(BUFFER_SIZE);
socket.setSendBufferSize(BUFFER_SIZE);

console.log(`Gateway buffer size set to ${BUFFER_SIZE} bytes`);
```

---

## Phase 5: Validation & Testing

**🎯 Goal:** Verify fixes resolve the issue without regressions

**⏱ Duration:** 1-2 hours  
**⚠️ Risk Level:** LOW (testing only)

### Step 5.1: Comprehensive Test Suite

**Execute all tests systematically:**

| Test | Phrase | Duration | Validation Criteria | Status |
|------|--------|----------|-------------------|--------|
| T1 | "Hello" | ~1s | Complete word, clear "o" ending | [ ] |
| T2 | "Testing system" | ~2s | Both words complete | [ ] |
| T3 | "Good morning everyone" | ~3s | All syllables present | [ ] |
| T4 | "The quick brown fox jumps over the lazy dog" | ~5s | Complete sentence | [ ] |
| T5 | "One two three four five six seven eight nine ten" | ~6s | All numbers clear | [ ] |
| T6 | Rapid speech (10s) | 10s | No dropouts | [ ] |
| T7 | Slow speech (10s) | 10s | No stuttering | [ ] |
| T8 | Long call (5 min) | 300s | Stable quality throughout | [ ] |

**For each test, verify:**
```bash
# After each call, check:
ssh azureuser@20.170.155.53 "grep -A3 'Translation completed' /tmp/STTTTSserver-fix-a.log | tail -5"

# Look for:
# - ✓ Transcription present
# - ✓ Translation present  
# - ✓ No "Empty" messages
# - ✓ Audio gain = 7.5x
```

### Step 5.2: Performance Metrics

```bash
# Create performance monitoring script
cat > /tmp/monitor-performance.sh << 'EOF'
#!/bin/bash

echo "======================================"
echo "  PERFORMANCE MONITORING"
echo "======================================"
echo ""

# CPU & Memory
echo "1. Process Resource Usage:"
ssh azureuser@20.170.155.53 "ps aux | grep -E 'STTTTSserver|gateway' | grep -v grep | awk '{printf \"  %-30s CPU: %5s%%  Mem: %5s%%\\n\", \$11, \$3, \$4}'"

echo ""

# Audio drops (should be 0)
echo "2. Audio Drops:"
DROPS=$(ssh azureuser@20.170.155.53 "grep 'Dropped:' /tmp/STTTTSserver-fix-a.log | awk -F'Dropped: ' '{sum+=\$2} END {print sum}'")
echo "  Total bytes dropped: ${DROPS}B"

# Latency
echo ""
echo "3. Average Latency:"
ssh azureuser@20.170.155.53 "grep 'Translation completed' /tmp/STTTTSserver-fix-a.log | tail -10"

# Success rate
echo ""
echo "4. Translation Success Rate:"
TOTAL=$(ssh azureuser@20.170.155.53 "grep -c 'Translation started' /tmp/STTTTSserver-fix-a.log")
SUCCESS=$(ssh azureuser@20.170.155.53 "grep -c 'Translation completed' /tmp/STTTTSserver-fix-a.log")
echo "  Total attempts: $TOTAL"
echo "  Successful: $SUCCESS"
echo "  Success rate: $(echo "scale=1; $SUCCESS*100/$TOTAL" | bc)%"

echo ""
echo "======================================"
EOF

chmod +x /tmp/monitor-performance.sh

# Run every 5 minutes during testing
watch -n 300 /tmp/monitor-performance.sh
```

### Step 5.3: Regression Check

**Verify previous fixes remain working:**

```bash
# 1. RTP Sequence Wrapping (should not crash after >6 min)
echo "🧪 Regression Test 1: Call for 6+ minutes"
echo "   Expected: No gateway crashes"

# 2. Transcription Quality
echo "🧪 Regression Test 2: Transcription accuracy"
ssh azureuser@20.170.155.53 "grep -E 'Deepgram|transcription' /tmp/STTTTSserver-fix-a.log | tail -20"

# 3. Audio Gain
echo "🧪 Regression Test 3: Audio gain stays at 7.5x"
ssh azureuser@20.170.155.53 "grep 'Audio Amplifier.*Gain: 7.5x' /tmp/STTTTSserver-fix-a.log | tail -5"

# 4. Gateway Stability
echo "🧪 Regression Test 4: No process crashes"
ssh azureuser@20.170.155.53 "ps aux | grep -E 'STTTTSserver|gateway|ari' | grep -v grep"
```

---

## Phase 6: Performance Optimization

**🎯 Goal:** Maximize efficiency without compromising quality

**⏱ Duration:** 2-4 hours  
**⚠️ Risk Level:** LOW to MEDIUM

**NOTE:** Only proceed with this phase if Phases 1-5 completed successfully

### Optimization 1: UDP Socket Tuning

```javascript
// In STTTTSserver.js, after socket creation:

const OPTIMAL_BUFFER = 256 * 1024;  // 256KB
socket3333Out.setRecvBufferSize(OPTIMAL_BUFFER);
socket3333Out.setSendBufferSize(OPTIMAL_BUFFER);
socket4444Out.setRecvBufferSize(OPTIMAL_BUFFER);
socket4444Out.setSendBufferSize(OPTIMAL_BUFFER);

console.log(`UDP sockets optimized: ${OPTIMAL_BUFFER} byte buffers`);
```

### Optimization 2: Frame Batching (Advanced)

**Only if profiling shows setTimeout is a bottleneck:**

```javascript
// Batch multiple frames per send to reduce syscalls
const BATCH_SIZE = 5;  // 5 frames = 800 bytes

// Group frames into batches before sending
// Measure latency impact carefully
```

### Optimization 3: GStreamer Pipeline Tuning

```bash
# Add queue for smoother processing
gst-launch-1.0 -q fdsrc fd=0 \
  ! audio/x-alaw,rate=8000,channels=1 \
  ! queue max-size-buffers=50 \  # Buffer up to 50 frames
  ! alawdec ! audioconvert ! audioresample \
  ! audio/x-raw,format=S16LE,rate=16000,channels=1,layout=interleaved \
  ! fdsink fd=1
```

---

## Monitoring & Alerting

**🎯 Goal:** Ongoing quality assurance

### Real-Time Dashboard

**Create metrics endpoint:**

```javascript
// Add to STTTTSserver.js

app.get('/audio-metrics', (req, res) => {
  res.json({
    audio_quality: {
      bytes_dropped_total: audioBytesDropped,
      bytes_dropped_last_call: lastCallDropped,
      avg_packet_size: calculateAvgPacketSize()
    },
    performance: {
      cpu_percent: process.cpuUsage().system,
      memory_mb: process.memoryUsage().heapUsed / 1024 / 1024,
      uptime_hours: process.uptime() / 3600
    },
    health: {
      active_calls: activeCallsMap.size,
      successful_translations_last_hour: successCount,
      error_rate_percent: (errorCount / totalCount) * 100
    }
  });
});
```

**Access:**
```bash
curl http://20.170.155.53:3020/audio-metrics | jq
```

### Alert Conditions

**Set up monitoring for:**

| Condition | Severity | Action |
|-----------|----------|--------|
| Process crashed | CRITICAL | Auto-restart + notification |
| Bytes dropped > 100/call | HIGH | Investigate immediately |
| CPU > 80% for 5 min | MEDIUM | Check for resource leak |
| Memory grows >10% hourly | MEDIUM | Memory leak investigation |
| Error rate > 5% | HIGH | Check logs for patterns |

---

## Rollback Procedures

**🎯 Goal:** Quick recovery from failed changes

### Emergency Full Rollback

```bash
#!/bin/bash
# File: /tmp/emergency-rollback.sh

echo "🚨 EMERGENCY ROLLBACK INITIATED"
echo "────────────────────────────────"

# 1. Stop all processes
echo "1. Stopping all processes..."
ssh azureuser@20.170.155.53 "killall node"

# 2. Restore from tar.gz backup
echo "2. Restoring from backup archive..."
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app && rm -rf 3333_4444__Operational && tar -xzf 3333_4444__Operational_Working_Full_Sicle_Timing_In_20251125_145719.tar.gz && mv 3333_4444__Operational_Working_Full_Sicle_Timing_In_20251125_145719 3333_4444__Operational"

# 3. Reinstall dependencies
echo "3. Reinstalling node_modules..."
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && npm install > /tmp/npm-install.log 2>&1"

# 4. Restart all services
echo "4. Restarting all services..."
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational && nohup node ari-gstreamer-operational.js > /tmp/ari-gstreamer-operational.log 2>&1 & nohup node gateway-3333.js > /tmp/gateway-3333-operational.log 2>&1 & nohup node gateway-4444.js > /tmp/gateway-4444-operational.log 2>&1 & cd STTTTSserver && nohup node STTTTSserver.js > /tmp/STTTTSserver-operational.log 2>&1 &"

# 5. Verify all running
sleep 5
echo "5. Verifying processes..."
ssh azureuser@20.170.155.53 "ps aux | grep -E 'node.*(gateway|STTTTSserver|ari)' | grep -v grep"

echo ""
echo "✅ ROLLBACK COMPLETE"
echo "────────────────────────────────"
echo "System restored to last known working state"
```

### Selective Rollback (STTTTSserver only)

```bash
# Rollback just STTTTSserver if gateway changes worked
ssh azureuser@20.170.155.53 "kill \$(ps aux | grep 'node.*STTTTSserver' | grep -v grep | awk '{print \$2}') && cp /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js.backup-* /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js && cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && nohup node STTTTSserver.js > /tmp/STTTTSserver-rollback.log 2>&1 &"
```

---

## Success Criteria

**✅ The optimization is successful when ALL of these are met:**

1. **Audio Quality**
   - [ ] No missing syllables or word endings
   - [ ] Bytes dropped = 0 consistently
   - [ ] Audio sounds natural, not choppy

2. **System Stability**
   - [ ] Runs for >2 hours without crashes
   - [ ] No memory leaks (stable memory usage)
   - [ ] CPU usage <50% average

3. **Transcription Quality**
   - [ ] Deepgram consistently returns text
   - [ ] Audio gain stays at 7.5x
   - [ ] No "Empty transcription" errors

4. **Performance**
   - [ ] End-to-end latency <2 seconds
   - [ ] 10 consecutive test calls all pass
   - [ ] Gateway stats show RX = TX (no packet loss)

5. **No Regressions**
   - [ ] RTP sequence wrapping still works (>6 min calls)
   - [ ] All previous fixes remain functional
   - [ ] No new errors introduced

---

## Implementation Timeline

**Recommended schedule (can be split across multiple sessions):**

### Session 1 (2-3 hours)
- Phase 1: Diagnostic Infrastructure
- Phase 2: Data Collection
- Analyze initial results

### Session 2 (2-3 hours)  
- Phase 3: Root Cause Analysis
- Document findings
- Plan fix strategy

### Session 3 (3-4 hours)
- Phase 4: Implement targeted fix
- Phase 5: Validation & Testing
- Rollback if needed

### Session 4 (2-3 hours) - Optional
- Phase 6: Performance Optimization
- Final validation
- Documentation update

**Total: 9-13 hours across 3-4 sessions**

---

## References

- [3333/4444 Installation Guide](/Users/sagivstavinsky/realtime-translation-enhanced_astrix/Docs/sys/3333_4444_INSTALLATION_GUIDE.md)
- [Backup Archive](3333_4444__Operational_Working_Full_Sicle_Timing_In_20251125_145719.tar.gz)
- [GitHub Branch](https://github.com/sagivst/realtime_translation_enhanced_astrix/tree/working-full-cycle-timing-sync)

---

**Document END**

**Next Action:** Begin with Phase 1 - Diagnostic Infrastructure
