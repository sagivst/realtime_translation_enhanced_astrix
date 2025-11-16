# Call Quality Testing & Tuning Guide
**System:** Asterisk + HOMER + Grafana on TEST VM 20.170.155.53
**Purpose:** Test, diagnose, and optimize audio quality for T0-T9 translation pipeline
**Date:** 2025-11-12

---

## 🎯 Quick Start: 5-Minute Quality Test

### Step 1: Make Test Call
Call from any extension to another for at least 30 seconds:
- **Option A:** 7000 → 7001 (AudioSocket stack)
- **Option B:** 7777 → 8888 (ExternalMedia translation stack)

### Step 2: View Results
1. Open Grafana: http://20.170.155.53:3000
2. Go to **"QOS_RTCP"** dashboard
3. Set time range: "Last 15 minutes"
4. Look at these 4 key metrics:

```
✅ GOOD            ⚠️ WARNING        ⛔ CRITICAL
-----------        ------------      ------------
MOS > 4.0          MOS 3.5-4.0       MOS < 3.5
Jitter < 30ms      Jitter 30-50ms    Jitter > 50ms
Loss < 1%          Loss 1-3%         Loss > 3%
Delay < 150ms      Delay 150-300ms   Delay > 300ms
```

### Step 3: Quick Diagnosis
- **All green?** ✅ System is working perfectly
- **Yellow warnings?** ⚠️ See "Common Issues" section below
- **Red critical?** ⛔ See "Emergency Fixes" section below

---

## 📊 Understanding Quality Metrics

### MOS Score (Mean Opinion Score)
**What it measures:** Overall voice quality perception (1.0 = worst, 5.0 = perfect)

| Score | Quality | User Experience |
|-------|---------|-----------------|
| 4.0-5.0 | Excellent | Transparent audio, no degradation |
| 3.5-4.0 | Good | Minor artifacts, acceptable |
| 3.0-3.5 | Fair | Noticeable issues, understandable |
| 2.0-3.0 | Poor | Choppy, difficult conversations |
| 1.0-2.0 | Bad | Unusable for communication |

**What affects MOS:**
- Packet loss (biggest impact)
- Jitter (timing variance)
- Codec choice (G.722 better than G.711)
- Network delay

**How to improve:**
```bash
# 1. Check network congestion
ssh azureuser@20.170.155.53 "netstat -s | grep -E '(retransmit|drop)'"

# 2. Verify codec
sudo asterisk -rx "core show channels verbose" | grep -i codec

# 3. Enable jitter buffer (in /etc/asterisk/rtp.conf)
# jbenable = yes
# jbmaxsize = 200
# jbimpl = adaptive
```

---

### Jitter (Timing Variance)
**What it measures:** Variation in packet arrival times (in milliseconds)

**Targets:**
- ✅ Excellent: < 10ms
- ✅ Good: 10-30ms
- ⚠️ Acceptable: 30-50ms
- ⛔ Poor: > 50ms

**Causes of high jitter:**
- Network congestion
- CPU spikes
- Shared bandwidth (other traffic)
- VM host overload (Azure)

**How to fix:**

**1. Enable adaptive jitter buffer:**
```bash
sudo nano /etc/asterisk/rtp.conf
```
Add:
```ini
[general]
jbenable = yes
jbmaxsize = 200        ; Maximum buffer size (ms)
jbimpl = adaptive      ; Adaptive jitter buffer
jbresyncthreshold = 1000
```
Reload:
```bash
sudo asterisk -rx "module reload res_rtp_asterisk.so"
```

**2. Check CPU load:**
```bash
ssh azureuser@20.170.155.53 "top -bn1 | head -20"
```
If CPU > 80%, scale up Azure VM size

**3. Verify network path:**
```bash
# Check for packet drops
ssh azureuser@20.170.155.53 "ip -s link show eth0"
```

---

### Packet Loss
**What it measures:** Percentage of RTP packets that never arrived

**Targets:**
- ✅ Excellent: 0%
- ✅ Good: < 0.5%
- ⚠️ Acceptable: 0.5-1%
- ⛔ Poor: > 1%

**Causes:**
- Network errors
- Buffer overruns
- Firewall dropping packets
- UDP queue full

**How to fix:**

**1. Check UDP buffer sizes:**
```bash
ssh azureuser@20.170.155.53 "sysctl net.core.rmem_max net.core.wmem_max"
```
If < 8MB, increase:
```bash
sudo sysctl -w net.core.rmem_max=8388608
sudo sysctl -w net.core.wmem_max=8388608
sudo sysctl -w net.core.rmem_default=262144
sudo sysctl -w net.core.wmem_default=262144
```
Make permanent:
```bash
echo "net.core.rmem_max = 8388608" | sudo tee -a /etc/sysctl.conf
echo "net.core.wmem_max = 8388608" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**2. Check Azure network limits:**
```bash
az vm show --resource-group realtime-translation-rg \
  --name asterisk-dev-vm-clone \
  --query "networkProfile.networkInterfaces[0].id" -o tsv
```
Consider upgrading to VM with accelerated networking

**3. Enable FEC (Forward Error Correction) - Opus codec only:**
```bash
sudo nano /etc/asterisk/codecs.conf
```
Add:
```ini
[opus]
fec = yes           ; Enable Forward Error Correction
dtx = no            ; Disable discontinuous transmission
```

---

### Delay/Latency
**What it measures:** Round-trip time for audio packets (in milliseconds)

**Targets:**
- ✅ Excellent: < 100ms
- ✅ Good: 100-150ms
- ⚠️ Acceptable: 150-300ms
- ⛔ Poor: > 300ms (noticeable lag)

**Sources of delay in T0-T9 pipeline:**

| Stage | Component | Expected Delay | Tunable? |
|-------|-----------|----------------|----------|
| T0 | Microphone capture | 10-20ms | No |
| T1 | Network to Gateway | 5-15ms | Yes (network) |
| T2 | ASR processing (Deepgram) | 50-150ms | Yes (config) |
| T3 | MT translation (DeepL) | 100-300ms | Yes (config) |
| T4 | TTS generation (ElevenLabs) | 200-500ms | Yes (config) |
| T5 | TTS audio buffer | 20-50ms | Yes (buffer size) |
| T6 | Gateway RTP send | 5-15ms | Yes (network) |
| T7 | Latency sync | 50-200ms | Yes (algorithm) |
| T8 | Asterisk bridge | 10-30ms | Yes (codec) |
| T9 | Network to endpoint | 5-15ms | Yes (network) |

**How to fix network delay (T1, T6, T9):**
```bash
# Check interface statistics
ssh azureuser@20.170.155.53 "ip -s link show eth0"

# Check for TX/RX errors
ssh azureuser@20.170.155.53 "ethtool -S eth0 | grep -E '(error|drop)'"

# Verify MTU size (should be 1500 for Azure)
ssh azureuser@20.170.155.53 "ip link show eth0 | grep mtu"
```

**How to reduce AI processing delay (T2-T4):**
See "AI Pipeline Optimization" section below

---

## 🧪 Detailed Testing Workflow

### Test 1: Baseline Quality (Extensions 7000 → 7001)
**Purpose:** Verify basic Asterisk audio quality without AI pipeline

**Steps:**
1. Make call from 7000 → 7001
2. Talk continuously for 60 seconds
3. Check Grafana "QOS_RTCP" dashboard
4. Record baseline metrics

**Expected results:**
- MOS: 4.3-4.5
- Jitter: < 10ms
- Loss: 0%
- Delay: < 50ms

**If baseline fails**, fix Asterisk/network before testing translation pipeline.

---

### Test 2: Translation Pipeline Quality (Extensions 7777 → 8888)
**Purpose:** Measure AI translation pipeline quality

**Steps:**
1. Make call from 7777 → 8888
2. Speak test phrases for 90 seconds:
   - "Hello, this is a test of the translation system"
   - Count from 1 to 20 slowly
   - Say alphabet (A through Z)
3. Check Grafana dashboards:
   - **QOS_RTCP:** Overall quality metrics
   - **CallFlow:** Call flow diagram with latency breakdown
   - **CDR_Search:** Find your call by time/extension

**What to look for:**

**Uplink (7777 → Gateway) - Stage T0-T1:**
- Check jitter on incoming RTP from microphone
- Should be very low (< 10ms)

**Downlink (Gateway → 8888) - Stage T5-T9:**
- Check TTS audio quality (MOS should be 4.0+)
- Look for packet loss from Gateway
- Measure total pipeline latency

---

### Test 3: Stress Test (Multiple Simultaneous Calls)
**Purpose:** Verify system handles load

**Steps:**
1. Make 3 calls simultaneously:
   - Call A: 7000 → 7001
   - Call B: 7777 → 8888
   - Call C: 7777 → 8888 (second translation session)
2. Let all calls run for 2 minutes
3. Check CPU/memory usage:
```bash
ssh azureuser@20.170.155.53 "top -bn1 | head -20"
```
4. Check if quality degraded in Grafana

**Expected behavior:**
- CPU usage < 70%
- Memory usage < 80%
- Quality metrics stay in "GOOD" range for all calls

**If stress test fails:**
- Scale up Azure VM size
- Optimize Gateway/Conference Server
- Add load balancing

---

## 🔧 Parameter Tuning by Symptom

### Symptom: Choppy/Robotic Audio
**Likely causes:** High jitter, packet loss, buffer underrun

**Fixes to try (in order):**

1. **Enable jitter buffer:**
```bash
sudo nano /etc/asterisk/rtp.conf
```
```ini
[general]
jbenable = yes
jbmaxsize = 200
jbimpl = adaptive
```

2. **Increase RTP packet size (reduce overhead):**
```bash
sudo nano /etc/asterisk/rtp.conf
```
```ini
[general]
ptime = 30    ; 30ms packets instead of 20ms (reduces network load)
```

3. **Check Gateway audio buffer:**
```javascript
// In gateway-7777-8888.js
const BUFFER_SIZE = 640;  // Increase to 960 for 30ms at 16kHz
const PACKET_DURATION_MS = 30;  // Match Asterisk ptime
```

---

### Symptom: Loud Background Noise/Hiss
**Likely causes:** Codec bitrate too low, poor TTS quality

**Fixes to try:**

1. **Use wideband codec (G.722 or Opus):**
```bash
sudo asterisk -rx "core show channels verbose" | grep -i codec
```
If using G.711 (narrow band), switch to G.722:
```bash
sudo nano /etc/asterisk/sip.conf  # or pjsip.conf
```
```ini
[general]
allow = !all,g722,opus  ; Prefer wideband codecs
disallow = ulaw,alaw    ; Disable narrow band
```

2. **Increase Opus bitrate:**
```bash
sudo nano /etc/asterisk/codecs.conf
```
```ini
[opus]
bitrate = 64000        ; High quality (default 32000)
complexity = 10        ; Maximum quality
```

3. **Check TTS settings (ElevenLabs):**
```javascript
// In conference server or Gateway
const TTS_CONFIG = {
  model_id: "eleven_monolingual_v1",  // Higher quality model
  voice_settings: {
    stability: 0.5,       // Lower = more expressive
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true
  },
  optimize_streaming_latency: 2  // 0=quality, 4=speed (2=balanced)
};
```

---

### Symptom: Delayed Audio (Lag > 1 second)
**Likely causes:** AI processing delay, buffer accumulation

**Fixes to try:**

1. **Reduce Deepgram latency:**
```javascript
// In Gateway or ASR component
const deepgram = new Deepgram({
  encoding: 'linear16',
  sample_rate: 16000,
  interim_results: true,  // Get partial results faster
  endpointing: 300,       // Lower = faster (default 1000)
  vad_events: true        // Voice Activity Detection
});
```

2. **Enable streaming translation (DeepL):**
```javascript
// Instead of waiting for full sentence
const streamingTranslation = true;
const minChunkSize = 5;  // Translate every 5 words
```

3. **Reduce TTS latency:**
```javascript
// ElevenLabs config
const TTS_CONFIG = {
  optimize_streaming_latency: 4,  // Maximum streaming (trade quality)
  model_id: "eleven_turbo_v2"     // Faster model
};
```

4. **Optimize Gateway buffers:**
```javascript
// In gateway-7777-8888.js
const SEND_INTERVAL_MS = 20;      // Send every 20ms (don't batch)
const MAX_BUFFER_FRAMES = 3;      // Limit buffering
```

---

### Symptom: Garbled/Distorted Audio
**Likely causes:** Codec mismatch, byte order issues, clipping

**Fixes to try:**

1. **Verify PCM format consistency:**
```javascript
// Gateway should use:
const AUDIO_FORMAT = {
  encoding: 'linear16',      // PCM16
  sampleRate: 16000,         // 16kHz
  channels: 1,               // Mono
  byteOrder: 'little-endian' // Match system architecture
};
```

2. **Check for audio clipping:**
```javascript
// Add volume normalization in Gateway
function normalizeAudio(pcmBuffer) {
  const samples = new Int16Array(pcmBuffer);
  let max = 0;
  for (let i = 0; i < samples.length; i++) {
    max = Math.max(max, Math.abs(samples[i]));
  }
  if (max > 32767 * 0.9) {  // Clipping detected
    const scale = (32767 * 0.8) / max;
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.round(samples[i] * scale);
    }
  }
  return Buffer.from(samples.buffer);
}
```

3. **Verify RTP payload type:**
```bash
# In Asterisk logs, check for PT mismatches
sudo tail -f /var/log/asterisk/messages | grep -i "payload"
```

---

## 🎛️ Advanced Tuning Parameters

### Asterisk RTP Configuration (`/etc/asterisk/rtp.conf`)
```ini
[general]
rtpstart = 10000
rtpend = 20000
rtcpinterval = 500          ; RTCP reports every 500ms (for HOMER)
rtcp_mux = yes              ; Multiplex RTP/RTCP on same port
strictrtp = no              ; Allow RTP from any source (for external media)
learning_min_sequential = 2 ; Reduce learning phase
probation = 1               ; Reduce RTP probation

; HOMER HEP Configuration
hep_server = 127.0.0.1
hep_port = 9060
enable_hep = yes
capture_id = 2001

; Jitter Buffer (enable if needed)
;jbenable = yes
;jbmaxsize = 200
;jbimpl = adaptive
;jbresyncthreshold = 1000

; Packet timing
;ptime = 20                 ; Default 20ms packets
;maxptime = 30              ; Max packet size
```

### System Network Tuning (UDP Buffers)
```bash
# Apply these settings for high-quality RTP
sudo tee -a /etc/sysctl.conf <<EOF

# === RTP Audio Optimization ===
# Increase UDP receive buffer
net.core.rmem_max = 8388608
net.core.rmem_default = 262144

# Increase UDP send buffer
net.core.wmem_max = 8388608
net.core.wmem_default = 262144

# Increase network interface queue
net.core.netdev_max_backlog = 5000

# Reduce TCP delayed ACK (for WebSocket connections)
net.ipv4.tcp_low_latency = 1
EOF

# Apply settings
sudo sysctl -p
```

### Gateway Audio Configuration
```javascript
// In gateway-7777-8888.js

// === Audio Format ===
const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;

// === RTP Configuration ===
const RTP_PAYLOAD_TYPE = 96;     // Dynamic payload type
const PACKET_DURATION_MS = 20;   // 20ms packets
const SAMPLES_PER_PACKET = (SAMPLE_RATE / 1000) * PACKET_DURATION_MS;  // 320 samples
const BUFFER_SIZE = SAMPLES_PER_PACKET * BYTES_PER_SAMPLE;              // 640 bytes

// === Timing Configuration ===
const SEND_INTERVAL_MS = PACKET_DURATION_MS;  // Match packet duration
const RTP_TIMESTAMP_INCREMENT = SAMPLES_PER_PACKET;  // 320 samples

// === Quality Settings ===
const ENABLE_DTX = false;          // Disable silence suppression
const ENABLE_FEC = false;          // Forward error correction (Opus only)
const MAX_BUFFER_FRAMES = 5;       // Maximum buffering before send
```

---

## 📈 Monitoring in Grafana

### Dashboard Navigation

1. **QOS_RTCP Dashboard** (Primary for quality monitoring)
   - **Panels to watch:**
     - "MOS Score Over Time" - Overall quality trend
     - "Jitter Distribution" - Timing variance
     - "Packet Loss Rate" - Delivery success
     - "RTT/Delay" - Round-trip time
   - **How to use:**
     - Set time range to your test call window
     - Look for spikes or patterns
     - Compare different call legs (7777 vs 8888)

2. **CallFlow Dashboard** (For latency breakdown)
   - **Panels to watch:**
     - "Call Flow Diagram" - SIP signaling sequence
     - "Latency Map" - Delay per segment
     - "Media Path" - RTP flow visualization
   - **How to use:**
     - Click on your call in the table
     - Visualize complete call flow
     - Identify bottleneck stages (T0-T9)

3. **CDR_Search Dashboard** (Find specific calls)
   - **Search by:**
     - Extension (7777, 8888, 7000, 7001)
     - Time range
     - Call duration
   - **Use this to:**
     - Find test calls quickly
     - Export call records
     - Compare multiple calls

### Setting Up Alerts

To get notified when quality degrades:

1. In Grafana, go to Alerting → Alert Rules
2. Create new rule:
   - **Condition:** MOS Score < 3.5 for 1 minute
   - **Action:** Email or Webhook notification
3. Repeat for:
   - Jitter > 50ms
   - Packet Loss > 1%
   - Delay > 300ms

---

## 🚨 Emergency Fixes

### Issue: No Audio At All
**Quick fixes:**
```bash
# 1. Check Asterisk channels
sudo asterisk -rx "core show channels"

# 2. Verify Gateway is running
ssh azureuser@20.170.155.53 "ps aux | grep gateway"

# 3. Check UDP ports are open
ssh azureuser@20.170.155.53 "sudo netstat -unlp | grep -E '(10000|20000)'"

# 4. Restart RTP module
sudo asterisk -rx "module reload res_rtp_asterisk.so"
```

### Issue: HOMER Not Showing Data
**Quick fixes:**
```bash
# 1. Verify Docker stack is running
ssh azureuser@20.170.155.53 "sudo docker ps | grep -E '(heplify|grafana|qryn)'"

# 2. Check HEP packets flowing
ssh azureuser@20.170.155.53 "sudo tcpdump -i lo -n udp port 9060 -c 5"

# 3. Restart Docker stack
ssh azureuser@20.170.155.53 "cd /opt/homer-docker/all-in-one && sudo docker-compose restart"

# 4. Verify Asterisk HEP enabled
sudo asterisk -rx "rtp show settings" | grep -i hep
```

### Issue: System Overloaded (CPU > 90%)
**Quick fixes:**
```bash
# 1. Check what's consuming CPU
ssh azureuser@20.170.155.53 "top -bn1 | head -20"

# 2. Kill non-essential processes
ssh azureuser@20.170.155.53 "pkill -f 'test-rtp-sender'"  # Test processes

# 3. Restart Asterisk (if needed)
ssh azureuser@20.170.155.53 "sudo systemctl restart asterisk"

# 4. Scale up Azure VM (long-term fix)
az vm resize --resource-group realtime-translation-rg \
  --name asterisk-dev-vm-clone \
  --size Standard_D4s_v3  # 4 vCPUs instead of 2
```

---

## 📋 Quality Checklist

Use this checklist after making changes:

### Before Changes
- [ ] Record current MOS score
- [ ] Record current jitter average
- [ ] Record current packet loss
- [ ] Record current delay
- [ ] Make test call and note subjective quality

### After Changes
- [ ] Make same test call
- [ ] Compare MOS score (should improve)
- [ ] Compare jitter (should decrease)
- [ ] Compare packet loss (should decrease)
- [ ] Compare delay (should decrease or stay same)
- [ ] Verify no new issues introduced

### Rollback if:
- [ ] MOS decreased by > 0.2
- [ ] Jitter increased by > 10ms
- [ ] Packet loss increased by > 0.5%
- [ ] Delay increased by > 50ms
- [ ] Audio became garbled/choppy

---

## 🎓 T0-T9 Stage-Specific Optimization

### Stage T0-T1: Microphone → Gateway
**What to monitor:**
- Input jitter from microphone/softphone
- Network quality to Gateway

**Optimizations:**
```bash
# 1. Ensure low-latency audio capture (client side)
# 2. Use wired connection instead of WiFi
# 3. Verify Gateway buffer size matches packet size
```

### Stage T2: ASR (Speech Recognition)
**What to monitor:**
- ASR processing time
- Confidence scores

**Optimizations:**
```javascript
// Deepgram config
{
  interim_results: true,  // Get partial results
  endpointing: 200,       // Lower = faster finalization
  language: 'en-US',      // Specify language (faster)
  model: 'nova-2'         // Latest model
}
```

### Stage T3: MT (Machine Translation)
**What to monitor:**
- Translation latency
- Translation quality

**Optimizations:**
```javascript
// DeepL config
{
  formality: 'default',   // Skip formality detection
  preserve_formatting: false,
  split_sentences: '1'    // Split long sentences
}
```

### Stage T4: TTS (Text-to-Speech)
**What to monitor:**
- TTS generation latency
- Audio quality (MOS should be 4.0+)

**Optimizations:**
```javascript
// ElevenLabs config
{
  optimize_streaming_latency: 2,  // Balance quality/speed
  model_id: 'eleven_turbo_v2',    // Fast model
  output_format: 'pcm_16000'      // Direct PCM output
}
```

### Stage T5-T6: TTS → Gateway → Asterisk
**What to monitor:**
- Gateway RTP send timing
- Downstream jitter

**Optimizations:**
```javascript
// Gateway RTP sender
const PRECISE_TIMING = true;
const DRIFT_CORRECTION = true;
setInterval(() => sendRTP(), PACKET_DURATION_MS);
```

### Stage T7: Latency Sync
**What to monitor:**
- Buffer drift
- Sync alignment

**Optimizations:**
```javascript
// Latency sync algorithm
const SYNC_WINDOW_MS = 100;
const MAX_DRIFT_MS = 50;
const CORRECTION_RATE = 0.1;  // Gradual correction
```

### Stage T8-T9: Bridge → Endpoints
**What to monitor:**
- Final output quality at endpoints
- Bridge latency

**Optimizations:**
```bash
# Asterisk bridge optimization
sudo nano /etc/asterisk/asterisk.conf
```
```ini
[options]
internal_timing = yes
transmit_silence = no
```

---

## 📚 Additional Resources

### HOMER Queries (ClickHouse)
```sql
-- Find all calls in last hour
SELECT * FROM hep_proto_1_default
WHERE timestamp > now() - INTERVAL 1 HOUR;

-- Average MOS by extension
SELECT src_ip, AVG(mos) as avg_mos
FROM hep_proto_1_default
WHERE timestamp > now() - INTERVAL 1 DAY
GROUP BY src_ip;

-- Packet loss statistics
SELECT
  call_id,
  SUM(packets_lost) as total_lost,
  SUM(packets_sent) as total_sent,
  (SUM(packets_lost) / SUM(packets_sent) * 100) as loss_pct
FROM hep_proto_1_default
GROUP BY call_id;
```

### Useful Asterisk Commands
```bash
# Show active RTP streams
sudo asterisk -rx "rtp show stats"

# Show specific channel RTP stats
sudo asterisk -rx "core show channel UnicastRTP/127.0.0.1-00000001"

# Enable RTP debug (WARNING: verbose!)
sudo asterisk -rx "rtp set debug on"
sudo asterisk -rx "rtp set debug off"

# Show codec negotiation
sudo asterisk -rx "core show channels verbose"
```

---

## ✅ Success Metrics

Your system is optimally tuned when:

- ✅ MOS consistently > 4.2 for 95% of calls
- ✅ Jitter average < 15ms
- ✅ Packet loss < 0.1%
- ✅ End-to-end latency (T0→T9) < 1.5 seconds
- ✅ No audio dropouts during 5-minute test calls
- ✅ CPU usage < 60% under normal load
- ✅ System handles 5+ simultaneous calls without degradation

---

**Next Steps:**
1. Start with "Quick Start" 5-minute test
2. Record baseline metrics
3. Identify problem areas
4. Apply fixes one at a time
5. Re-test after each change
6. Document what worked

**Need Help?**
- Check HOMER logs: `sudo docker logs all-in-one_heplify-server_1`
- Check Grafana logs: `sudo docker logs all-in-one_grafana_1`
- Review Asterisk logs: `sudo tail -f /var/log/asterisk/messages`

---

**Document Status:** ✅ READY FOR USE
**Last Updated:** 2025-11-12
**VM:** 20.170.155.53 (TEST only)
