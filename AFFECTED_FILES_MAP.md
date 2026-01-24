# Affected Files Map - Complete Analysis
## Files That Need Changes for PCM Knobs & AI Optimizer Fix

---

## 🔴 CRITICAL FILES (Must Fix First)

### 1. **KnobsRegistry.js**
**Full Path**: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/KnobsRegistry.js`

**Current Issues**:
- `agc.enabled`: **default: false** (line ~95)
- `compressor.enabled`: **default: false** (line ~170)
- Only 3 PCM knobs defined

**Required Changes**:
```javascript
// Change line ~95:
"agc.enabled": {
  default: true,  // CHANGE from false
}

// Change line ~170:
"compressor.enabled": {
  default: true,  // CHANGE from false
}

// Add 47 new PCM knobs (see remediation plan)
```

---

### 2. **AI Service Configuration** ✅ ACTUALLY CORRECT!
**Full Path**: `/home/azureuser/ai-service/server.cjs`

**Current State**:
- ✅ Using CORRECT names (`pcm.input_gain_db` not `input_gain`)
- ❌ Only knows about 4 knobs:
  - `pcm.input_gain_db`
  - `pcm.output_gain_db`
  - `agc.target_level_dbfs`
  - `limiter.threshold_dbfs`

**Required Changes**:
```javascript
// Line 21-27: Expand KNOB_LIMITS to include all 50 PCM knobs
const KNOB_LIMITS = {
  // Current 4 knobs...
  // ADD:
  'pcm.target_level_dbfs': { min: -30, max: 0 },
  'compressor.enabled': { type: 'boolean' },
  'compressor.threshold_dbfs': { min: -40, max: 0 },
  // ... etc for all 50 PCM knobs
};
```

---

## 🟡 SECONDARY FILES (After Critical Fixes)

### 3. **St_Handler_Generic.js**
**Full Path**: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/St_Handler_Generic.js`

**Current State**:
- Has basic knob processing (gain, limiter, compressor)
- Fixed logging issue on line 124

**Required Changes**:
- Add new processing functions for PCM knobs:
  - `_applyNormalization()`
  - `_preventClipping()`
  - `_applyDenoise()`
  - Expand `applyKnobs()` method for new stages

---

### 4. **PersistenceLayer.js**
**Full Path**: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/lib/PersistenceLayer.js`

**Current State**:
- Handles `scheduled_knob_updates` table inserts/updates

**Potential Changes**:
- May need name translation if old systems send wrong names
- Currently seems to pass through knobs as-is

---

### 5. **BucketScheduler.js**
**Full Path**: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/lib/BucketScheduler.js`

**Current State**:
- Handles 5-second bucket scheduling for knob updates

**Potential Changes**:
- May need to handle new PCM knobs
- Check if it needs knob name validation

---

## 🟢 SUPPORT FILES (No Changes Needed)

### 6. **optimizer-agent.js** ✅
**Full Path**: `/home/azureuser/optimizer-agent.js`

**Status**: Just a transport layer - no knob logic
- Polls active traces every 5 seconds
- Forwards to AI service
- **No changes needed**

---

### 7. **OptimizerAPI.js** ✅
**Full Path**: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/api/OptimizerAPI.js`

**Status**: API endpoints for optimizer
- Handles `/api/optimizer/*` routes
- Queries database for knob data
- **No changes needed**

---

### 8. **KnobsResolver.js** ✅
**Full Path**: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/KnobsResolver.js`

**Status**: Resolves effective knobs from baseline + updates
- Already handles knob merging correctly
- **No changes needed**

---

## 📊 Summary Table

| Priority | File | Location | Changes Required |
|----------|------|----------|-----------------|
| 🔴 HIGH | KnobsRegistry.js | `.../station/generic/` | Enable AGC/Compressor, add 47 knobs |
| 🔴 HIGH | server.cjs | `/home/azureuser/ai-service/` | Expand KNOB_LIMITS from 4 to 50 |
| 🟡 MEDIUM | St_Handler_Generic.js | `.../station/generic/` | Add processing for new knobs |
| 🟡 LOW | PersistenceLayer.js | `.../STTTTSserver/lib/` | Possible name translation |
| 🟡 LOW | BucketScheduler.js | `.../STTTTSserver/lib/` | Possible validation updates |
| ✅ NONE | optimizer-agent.js | `/home/azureuser/` | Transport only - no changes |
| ✅ NONE | OptimizerAPI.js | `.../STTTTSserver/api/` | API layer - no changes |
| ✅ NONE | KnobsResolver.js | `.../station/generic/` | Works correctly |

---

## 🔍 Key Discovery

### The "Wrong Names" Mystery SOLVED!
Initially thought AI was sending wrong names (`input_gain` instead of `pcm.input_gain_db`), but investigation shows:

1. **AI Service (server.cjs)** ✅ Uses CORRECT names
2. **KnobsRegistry.js** ✅ Has CORRECT names
3. **Database** - Need to verify actual stored values

**Possible Issue**: Old data in database from before fixes, or another service sending wrong names.

---

## 🎯 Action Plan

### Step 1: Enable Processors (5 minutes)
```bash
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/

# Backup
cp KnobsRegistry.js KnobsRegistry.js.backup-$(date +%Y%m%d-%H%M%S)

# Enable processors
nano KnobsRegistry.js
# Change agc.enabled default to true
# Change compressor.enabled default to true

# Restart
pm2 restart STTTSserver
```

### Step 2: Expand AI Knowledge (10 minutes)
```bash
ssh azureuser@20.170.155.53
cd /home/azureuser/ai-service/

# Backup
cp server.cjs server.cjs.backup-$(date +%Y%m%d-%H%M%S)

# Edit
nano server.cjs
# Expand KNOB_LIMITS to include all PCM knobs

# Restart
pm2 restart ai-optimizer
```

### Step 3: Test (5 minutes)
```bash
# Make test call
# Check logs
pm2 logs STTTSserver --lines 100 | grep -E "AGC|Compressor"

# Verify AI using more knobs
curl http://20.170.155.53:3020/api/optimizer/status
```

---

## 📝 Notes

1. **Good News**: AI is already using correct knob names!
2. **Main Issue**: Processors disabled + AI only knows 4 knobs
3. **Quick Win**: Just enabling AGC/Compressor will have immediate impact
4. **Database Check Needed**: Verify what's actually in scheduled_knob_updates

---

*Analysis completed: 2026-01-21*
*Total files to modify: 2-5*
*Estimated time: 30 minutes for critical fixes*