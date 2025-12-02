# T0-T9 Translation Pipeline Quality Dashboard

**Status:** ✅ LIVE AND OPERATIONAL
**Date:** 2025-11-12
**VM:** 20.170.155.53 (TEST)

---

## 🌐 Access Your Dashboard

**Dashboard URL:** http://20.170.155.53:8888

Open this in any web browser to see real-time quality monitoring across all 9 stages of your translation pipeline.

---

## 📊 What This Dashboard Shows

### Overall Pipeline Health
- **Excellent Stages:** Count of stages performing optimally
- **Warning Stages:** Count of stages with minor issues
- **Critical Issues:** Count of stages requiring immediate attention
- **Average MOS:** Overall voice quality score across pipeline

### Per-Stage Quality Metrics

For each of the 9 stages (T0-T9), you'll see:

**Visual Progress Bars:**
- ✅ **Green** = Excellent quality
- 🟡 **Yellow** = Warning (minor degradation)
- 🔴 **Red** = Critical (needs fixing)

**Detailed Metrics:**
- **Jitter:** Timing variance (lower is better)
- **Packet Loss:** Percentage of lost packets (lower is better)
- **MOS Score:** Mean Opinion Score (higher is better, target > 4.0)
- **Delay:** Round-trip time (lower is better)

**Gap from Target:**
- ✓ Shows how much BETTER than target
- ⚠ Shows how much WORSE than target

---

## 🎯 Quality Targets (Per Specification)

| Metric | Excellent | Good | Warning | Critical |
|--------|-----------|------|---------|----------|
| **Jitter** | < 10ms | < 30ms | 30-50ms | > 50ms |
| **Packet Loss** | < 0.5% | < 1% | 1-3% | > 3% |
| **MOS Score** | > 4.0 | > 3.5 | 3.0-3.5 | < 3.0 |
| **Delay** | < 100ms | < 150ms | 150-300ms | > 300ms |

---

## 🗺️ T0-T9 Stage Map

### **T0: Microphone Capture**
- **What:** Audio input from user microphone
- **Metrics:** Jitter, Packet Loss
- **Extensions:** 7777, 7000

### **T1: Network → Gateway**
- **What:** Audio transmission to translation gateway
- **Metrics:** Jitter, Packet Loss, Delay
- **Extensions:** 7777, 7000

### **T2: ASR Processing**
- **What:** Speech-to-Text (Deepgram)
- **Metrics:** Delay
- **Note:** Text domain - no audio metrics

### **T3: MT Translation**
- **What:** Machine Translation (DeepL)
- **Metrics:** Delay
- **Note:** Text domain - no audio metrics

### **T4: TTS Generation**
- **What:** Text-to-Speech (ElevenLabs)
- **Metrics:** Delay
- **Note:** Text domain - no audio metrics

### **T5: TTS Audio Buffer**
- **What:** Generated speech audio buffering
- **Metrics:** Jitter, MOS
- **Extensions:** 8888, 7001

### **T6: Gateway → Asterisk**
- **What:** Translated audio transmission
- **Metrics:** Jitter, Packet Loss, MOS
- **Extensions:** 8888, 7001

### **T7: Latency Sync**
- **What:** Audio stream synchronization
- **Metrics:** Jitter, Delay
- **Extensions:** 8888, 7001

### **T8: Asterisk Bridge**
- **What:** Conference bridge mixing
- **Metrics:** Jitter, Packet Loss, MOS
- **Extensions:** 8888, 7001

### **T9: Output → Endpoint**
- **What:** Final audio delivery to user
- **Metrics:** Jitter, Packet Loss, MOS, Delay
- **Extensions:** 8888, 7001

---

## ⚙️ Dashboard Controls

### Refresh Button (🔄)
Click to manually refresh data immediately

### Auto-Refresh
- **Off** - Manual refresh only
- **30 seconds** - Update every 30 seconds
- **1 minute** - Update every minute (default)
- **2 minutes** - Update every 2 minutes

### Time Range
- **5 minutes** - Last 5 minutes of data
- **15 minutes** - Last 15 minutes (default)
- **30 minutes** - Last 30 minutes
- **1 hour** - Last hour

---

## 🔧 How to Use This Dashboard

### Step 1: Make Test Call
Call from 7777 → 8888 (translation pipeline) or 7000 → 7001 (baseline)

### Step 2: Watch Real-Time Metrics
The dashboard auto-refreshes and shows quality data as your call progresses.

### Step 3: Identify Issues
Look for RED or YELLOW indicators showing which stages need attention.

### Step 4: Read Recommendations
The "Issues Requiring Attention" section lists specific problems and thresholds exceeded.

### Step 5: Apply Fixes
Use the recommendations from `CALL_QUALITY_TESTING_GUIDE.md` to optimize problem areas.

---

## 📈 Current Quality Status (from last check)

**Your Real Call Data:**
```
Stream: 10.0.0.7:15095 → 84.95.134.101:39341
Call-ID: DA71BFB4EF94FB0A63E2573BB386936E5BD07625

✅ Jitter: 3.00 ms (EXCELLENT)
⛔ Packet Loss: 10.0% (CRITICAL)
⛔ MOS Score: 2.21 / 5.0 (POOR)
⛔ R-Factor: 42.8 / 100 (POOR)
```

**Primary Issue:** High packet loss (10%) is destroying voice quality.

**Fix Applied:** UDP buffers increased to 8MB (active now).

**Next Steps:**
1. Make a new test call to see if UDP buffer increase helped
2. Watch the dashboard for improved packet loss
3. Target: Packet loss should drop to < 1%
4. Expected MOS improvement: 2.21 → 4.0+

---

## 🚨 Critical Issues Detected

### ⛔ High Packet Loss (10%)
**Affected Stages:** All audio stages (T0, T1, T5, T6, T7, T8, T9)

**Impact:**
- MOS score critically low (2.21 instead of 4.0+)
- Choppy/robotic audio
- User experience degraded

**Fixes Applied:**
1. ✅ Increased UDP receive buffer to 8MB
2. ✅ Increased UDP send buffer to 8MB

**Fixes to Try Next (if packet loss persists):**
1. Enable jitter buffer in Asterisk
2. Check Gateway for dropped packets
3. Verify network interface statistics
4. Check Azure VM network limits

---

## 🔬 Technical Details

### Data Source
- **API:** HOMER qryn API (http://20.170.155.53:3100)
- **Query:** `{type="rtcp"}` (RTCP quality reports)
- **Refresh:** Live data from last N minutes

### Calculations
- **MOS Score:** ITU-T G.107 E-Model algorithm
- **Jitter Conversion:** Timestamp units → milliseconds (÷16000 × 1000)
- **Packet Loss:** Fraction lost ÷ 255 × 100%

### Browser Compatibility
- ✅ Chrome / Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ⚠️ Requires JavaScript enabled

---

## 📝 Files Related to This Dashboard

1. **Dashboard:** `/var/www/quality-monitor/index.html`
2. **Server Log:** `/tmp/quality-monitor.log`
3. **Testing Guide:** `~/realtime-translation-enhanced_astrix/docs/sys/CALL_QUALITY_TESTING_GUIDE.md`
4. **HOMER Status:** `/tmp/HOMER_MONITORING_STATUS.md`

---

## 🛠️ Server Management

### Check if Dashboard Server is Running
```bash
ssh azureuser@20.170.155.53 "ps aux | grep 'http.server 8888' | grep -v grep"
```

### View Server Logs
```bash
ssh azureuser@20.170.155.53 "tail -f /tmp/quality-monitor.log"
```

### Restart Dashboard Server
```bash
ssh azureuser@20.170.155.53"pkill -f 'http.server 8888' && cd /var/www/quality-monitor && nohup python3 -m http.server 8888 > /tmp/quality-monitor.log 2>&1 &"
```

### Stop Dashboard Server
```bash
ssh azureuser@20.170.155.53 "pkill -f 'http.server 8888'"
```

---

## 🎯 Success Criteria

Your system is optimal when the dashboard shows:

- ✅ **All stages GREEN** (Excellent quality)
- ✅ **MOS Score: 4.0+** across all stages
- ✅ **Jitter: < 30ms** consistently
- ✅ **Packet Loss: < 1%** all stages
- ✅ **Delay: < 150ms** end-to-end
- ✅ **Zero critical issues**
- ✅ **Zero warnings** (or minimal)

---

## 🔗 Related Dashboards

### HOMER Grafana Dashboards
- **Grafana:** http://20.170.155.53:3000
- **QOS_RTCP:** Detailed RTCP metrics (raw data)
- **CallFlow:** SIP call flow diagrams
- **CDR_Search:** Call detail records search

### Custom T0-T9 Dashboard (This One)
- **URL:** http://20.170.155.53:8888
- **Purpose:** Simplified T0-T9 stage monitoring
- **Features:** Gap analysis, fix recommendations

---

## 📚 Additional Resources

- **Testing Guide:** Full optimization guide with fixes
- **HOMER Docs:** https://sipcapture.org/
- **ITU-T G.107:** MOS calculation standard
- **RFC 3550:** RTP/RTCP specification

---

## 🎉 Next Steps

1. **Open Dashboard:** http://20.170.155.53:8888
2. **Make Test Call:** 7777 → 8888 (60 seconds)
3. **Watch Metrics:** See real-time quality data
4. **Identify Issues:** Look for RED/YELLOW stages
5. **Apply Fixes:** Use CALL_QUALITY_TESTING_GUIDE.md
6. **Re-test:** Make another call, verify improvement
7. **Iterate:** Repeat until all stages are GREEN

---

**Dashboard Status:** 🟢 OPERATIONAL
**Last Updated:** 2025-11-12 16:55 UTC
**VM:** 20.170.155.53 (TEST only)

**Your custom T0-T9 quality monitoring dashboard is ready to use!** 🚀
