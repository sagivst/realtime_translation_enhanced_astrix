# AI Optimizer Configuration Fix Plan
## Solving 3 Critical Problems Preventing Full System Utilization

## Executive Summary
AI Optimizer is working but operating at **10% capacity** due to configuration issues. This plan fixes three problems to unlock full system potential without changing core code.

---

## Problem 1: Name Mismatch Resolution

### Current State
```javascript
// AI Sends:              // Registry Expects:
"input_gain"          →   "pcm.input_gain_db"
"output_gain"         →   "pcm.output_gain_db"
"noise_gate_threshold"→   "noise_gate.threshold_dbfs"
"agc_target"          →   "agc.target_level_dbfs"
"compressor_threshold"→   "compressor.threshold_dbfs"
"compressor_ratio"    →   "compressor.ratio"
"vad_sensitivity"     →   "vad.sensitivity"
```

### Solution Approach: Add Translation Layer

#### Option A: Server-Side Translation (Recommended)
**Location**: Where knob updates are processed (likely in MonitoringStationsBootstrap.js or DatabaseBridge.js)

```javascript
// Add translation mapping
const AI_KNOB_TRANSLATION = {
  "input_gain": "pcm.input_gain_db",
  "output_gain": "pcm.output_gain_db",
  "noise_gate_threshold": "noise_gate.threshold_dbfs",
  "agc_target": "agc.target_level_dbfs",
  "compressor_threshold": "compressor.threshold_dbfs",
  "compressor_ratio": "compressor.ratio",
  "vad_sensitivity": "vad.sensitivity"
};

// Apply translation before processing
function processKnobUpdate(aiKnobs) {
  const translated = {};
  for (const [key, value] of Object.entries(aiKnobs)) {
    const registryKey = AI_KNOB_TRANSLATION[key] || key;
    translated[registryKey] = value;
  }
  return translated;
}
```

#### Option B: AI-Side Configuration Update
**Location**: AI Optimizer configuration (port 3090 service)

Update AI to use correct names from the start. This requires finding and modifying the AI service configuration.

### Implementation Steps

1. **Find Processing Location**
   ```bash
   ssh azureuser@20.170.155.53
   grep -r "scheduled_knob_updates" /home/azureuser/translation-app/3333_4444__Operational/
   ```

2. **Add Translation Layer**
   - Backup the file first
   - Add translation mapping
   - Modify update processing to translate names

3. **Test Translation**
   ```sql
   -- Verify AI updates are being translated
   SELECT knob_values FROM scheduled_knob_updates
   WHERE created_at > NOW() - INTERVAL '5 minutes'
   ORDER BY created_at DESC LIMIT 1;
   ```

### Verification
```bash
# Check if correct names appear in database
curl http://20.170.155.53:3020/api/knobs/current | grep "pcm.input_gain_db"
```

---

## Problem 2: Enable Disabled Processors

### Current State
```javascript
// These are FALSE but AI is trying to adjust them:
"agc.enabled": false           // Automatic Gain Control OFF
"compressor.enabled": false    // Compressor OFF
"noise_reduction.enabled": false // Noise Reduction OFF
```

### Solution: Update Default Values

#### Location
`/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/KnobsRegistry.js`

#### Changes Required
```javascript
// Line ~93-97
"agc.enabled": {
  description: "Enable automatic gain control",
  type: "bool",
  default: true,  // CHANGE: false → true
  liveApply: true
},

// Line ~93-97 (approximately)
"compressor.enabled": {
  description: "Enable/disable compressor",
  type: "bool",
  default: true,  // CHANGE: false → true
  liveApply: true
},

// Find and update
"noise_reduction.enabled": {
  description: "Enable noise reduction",
  type: "bool",
  default: true,  // CHANGE: false → true
  liveApply: true
}
```

### Implementation Steps

1. **Backup Current Configuration**
   ```bash
   ssh azureuser@20.170.155.53
   cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/
   cp KnobsRegistry.js KnobsRegistry.js.backup-$(date +%Y%m%d-%H%M%S)
   ```

2. **Update Defaults**
   ```bash
   # Use sed to update (verify line numbers first!)
   sed -i 's/"agc\.enabled".*default: false/"agc.enabled": {\n    default: true/' KnobsRegistry.js
   sed -i 's/"compressor\.enabled".*default: false/"compressor.enabled": {\n    default: true/' KnobsRegistry.js
   ```

3. **Restart Service**
   ```bash
   pm2 restart STTTSserver
   ```

4. **Verify Processors Active**
   ```bash
   # Check in logs
   pm2 logs STTTSserver --lines 50 | grep -E "(agc|compressor|noise)"

   # Check current values
   curl http://20.170.155.53:3020/api/knobs/current | jq '.agc.enabled, .compressor.enabled'
   ```

### Alternative: Runtime Override
If changing defaults is risky, add runtime override:

```javascript
// In St_Handler_Generic.js constructor
// Force-enable critical processors
this.knobsResolver.setKnob("agc.enabled", true);
this.knobsResolver.setKnob("compressor.enabled", true);
this.knobsResolver.setKnob("noise_reduction.enabled", true);
```

---

## Problem 3: Expand AI Knob Awareness (7 → 71)

### Current State
- AI knows about: 7 knobs
- System has: 71 knobs
- Missing: 64 knobs (90%)

### Solution: Update AI Optimizer Configuration

#### Find AI Configuration
```bash
ssh azureuser@20.170.155.53

# Likely locations:
find /home/azureuser -name "*optimizer*" -type f 2>/dev/null
find /home/azureuser -name "*ai-service*" -type d 2>/dev/null

# Check for configuration files
grep -r "ADJUSTABLE_KNOBS\|KNOBS\|agc_target" /home/azureuser/translation-app/ 2>/dev/null
```

#### Expand Knob List
Create comprehensive knob configuration:

```javascript
const FULL_AI_KNOB_CONFIG = {
  // === PCM Control (Priority 1) ===
  "pcm.input_gain_db": {
    min: -24, max: 24, step: 0.5,
    description: "Input gain adjustment",
    impact: "high"
  },
  "pcm.output_gain_db": {
    min: -24, max: 24, step: 0.5,
    description: "Output gain adjustment",
    impact: "high"
  },
  "pcm.target_level_dbfs": {
    min: -30, max: 0, step: 1,
    description: "Target normalization level",
    impact: "high"
  },

  // === Processor Enables (Priority 1) ===
  "agc.enabled": {
    type: "bool",
    description: "Enable AGC",
    impact: "critical"
  },
  "compressor.enabled": {
    type: "bool",
    description: "Enable compressor",
    impact: "high"
  },
  "noise_reduction.enabled": {
    type: "bool",
    description: "Enable noise reduction",
    impact: "high"
  },
  "limiter.enabled": {
    type: "bool",
    description: "Enable limiter",
    impact: "high"
  },

  // === AGC Parameters (Priority 2) ===
  "agc.target_level_dbfs": {
    min: -40, max: 0, step: 2,
    description: "AGC target level",
    impact: "high"
  },
  "agc.max_gain_db": {
    min: 0, max: 40, step: 2,
    description: "Maximum AGC gain",
    impact: "medium"
  },
  "agc.attack_ms": {
    min: 1, max: 100, step: 5,
    description: "AGC attack time",
    impact: "medium"
  },
  "agc.release_ms": {
    min: 10, max: 1000, step: 10,
    description: "AGC release time",
    impact: "medium"
  },

  // === Compressor Parameters (Priority 2) ===
  "compressor.threshold_dbfs": {
    min: -40, max: 0, step: 2,
    description: "Compression threshold",
    impact: "high"
  },
  "compressor.ratio": {
    min: 1, max: 20, step: 1,
    description: "Compression ratio",
    impact: "high"
  },
  "compressor.attack_ms": {
    min: 0.1, max: 50, step: 1,
    description: "Compressor attack",
    impact: "medium"
  },
  "compressor.release_ms": {
    min: 10, max: 500, step: 10,
    description: "Compressor release",
    impact: "medium"
  },
  "compressor.knee_db": {
    min: 0, max: 10, step: 1,
    description: "Compressor knee",
    impact: "low"
  },

  // === Limiter Parameters (Priority 2) ===
  "limiter.threshold_dbfs": {
    min: -30, max: -1, step: 1,
    description: "Limiter threshold",
    impact: "high"
  },
  "limiter.release_ms": {
    min: 1, max: 1000, step: 10,
    description: "Limiter release",
    impact: "medium"
  },
  "limiter.lookahead_ms": {
    min: 0, max: 10, step: 1,
    description: "Limiter lookahead",
    impact: "low"
  },

  // === Noise Control (Priority 3) ===
  "noise_gate.enabled": {
    type: "bool",
    description: "Enable noise gate",
    impact: "medium"
  },
  "noise_gate.threshold_dbfs": {
    min: -80, max: -20, step: 2,
    description: "Gate threshold",
    impact: "medium"
  },
  "noise_gate.attack_ms": {
    min: 0.1, max: 10, step: 0.5,
    description: "Gate attack",
    impact: "low"
  },
  "noise_gate.release_ms": {
    min: 10, max: 500, step: 10,
    description: "Gate release",
    impact: "low"
  },
  "noise_reduction.strength": {
    min: 0, max: 100, step: 10,
    description: "NR strength",
    impact: "medium"
  },

  // === VAD Control (Priority 3) ===
  "vad.enabled": {
    type: "bool",
    description: "Enable VAD",
    impact: "medium"
  },
  "vad.sensitivity": {
    min: 0, max: 3, step: 1,
    description: "VAD sensitivity",
    impact: "medium"
  },
  "vad.mode": {
    type: "enum",
    values: ["quality", "lowbitrate", "aggressive", "veryaggressive"],
    description: "VAD mode",
    impact: "medium"
  },

  // === Filters (Priority 4) ===
  "highpass.enabled": {
    type: "bool",
    description: "Enable highpass",
    impact: "medium"
  },
  "highpass.cutoff_hz": {
    min: 20, max: 200, step: 10,
    description: "Highpass frequency",
    impact: "medium"
  },
  "lowpass.enabled": {
    type: "bool",
    description: "Enable lowpass",
    impact: "low"
  },
  "lowpass.cutoff_hz": {
    min: 3000, max: 8000, step: 100,
    description: "Lowpass frequency",
    impact: "low"
  },

  // === Safety (Priority 5) ===
  "safety.clipping_protection": {
    type: "bool",
    description: "Clipping protection",
    impact: "high"
  },
  "safety.max_output_dbfs": {
    min: -12, max: 0, step: 1,
    description: "Maximum output",
    impact: "high"
  }
};
```

### Phased Rollout Plan

#### Phase 1: Critical Fixes (Immediate)
1. Add name translation layer
2. Enable processors (AGC, Compressor, NR)
3. Test with existing 7 knobs

#### Phase 2: Expand to 25 knobs (Day 2)
1. Add PCM control knobs
2. Add processor parameters
3. Test call quality

#### Phase 3: Full 71 knobs (Week 2)
1. Add remaining knobs
2. Implement feedback loop
3. Monitor performance

---

## Testing Plan

### Test 1: Name Translation
```bash
# Trigger AI optimization
curl -X POST http://20.170.155.53:3020/api/optimizer/trigger

# Check if names are correct
psql -U monitoring_user -d monitoring_v2 -c "
SELECT jsonb_object_keys(knob_values)
FROM scheduled_knob_updates
WHERE created_at > NOW() - INTERVAL '1 minute';"
```

### Test 2: Processor Activation
```bash
# Make test call
# Monitor logs for processor activity
pm2 logs STTTSserver --lines 100 | grep -E "(AGC|Compressor|Applying)"

# Check metrics showing processors working
curl http://20.170.155.53:3020/api/metrics/latest | jq '.agc_gain_db, .compression_ratio'
```

### Test 3: Expanded Knob Usage
```bash
# Count unique knobs being adjusted
psql -U monitoring_user -d monitoring_v2 -c "
SELECT COUNT(DISTINCT jsonb_object_keys(knob_values)) as knobs_used
FROM scheduled_knob_updates
WHERE created_at > NOW() - INTERVAL '1 hour';"
```

---

## Rollback Plan

### For Each Problem:

#### Problem 1 Rollback (Name Translation)
```bash
# Remove translation layer
# Restore original file from backup
cp [backup_file] [original_file]
pm2 restart STTTSserver
```

#### Problem 2 Rollback (Processor Defaults)
```bash
# Restore KnobsRegistry.js
cd /home/azureuser/translation-app/3333_4444__Operational/STTTSserver/Monitoring_Stations/station/generic/
cp KnobsRegistry.js.backup-[timestamp] KnobsRegistry.js
pm2 restart STTTSserver
```

#### Problem 3 Rollback (AI Configuration)
```bash
# Restore AI configuration
# Restart AI service
pm2 restart ai-optimizer
```

---

## Success Criteria

### Immediate Success (After Phase 1):
- ✅ No name mismatch errors in logs
- ✅ AGC showing gain adjustments in metrics
- ✅ Compressor ratio changes visible
- ✅ 7 knobs working correctly

### Day 2 Success (After Phase 2):
- ✅ 25+ knobs being adjusted
- ✅ Call quality improvement measurable
- ✅ No performance degradation
- ✅ AI making smarter decisions

### Week 2 Success (After Phase 3):
- ✅ 71 knobs available to AI
- ✅ 50+ knobs actively used
- ✅ Automatic quality optimization working
- ✅ System self-tuning based on conditions

---

## Risk Assessment

### Low Risk:
- Name translation (simple mapping)
- Enabling processors (just defaults)

### Medium Risk:
- Expanding knob list (more complexity)
- Performance impact of more processing

### Mitigation:
- Test each change in isolation
- Monitor CPU and memory
- Keep detailed backups
- Implement gradually

---

## Execution Order

1. **First**: Fix name mismatches (5 minutes, low risk)
2. **Second**: Enable processors (5 minutes, low risk)
3. **Third**: Test with 7 knobs working properly
4. **Fourth**: Expand to 25 knobs
5. **Fifth**: Full expansion to 71 knobs

---

## Commands Summary

### Quick Implementation:
```bash
# 1. Connect to VM
ssh azureuser@20.170.155.53

# 2. Backup everything
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/
tar -czf monitoring_backup_$(date +%Y%m%d_%H%M%S).tar.gz station/

# 3. Fix processor defaults
cd station/generic/
nano KnobsRegistry.js
# Change agc.enabled, compressor.enabled, noise_reduction.enabled to true

# 4. Restart
pm2 restart STTTSserver

# 5. Verify
pm2 logs STTTSserver --lines 100
curl http://20.170.155.53:3020/api/knobs/current | jq
```

---

*Plan Created: 2026-01-21*
*Purpose: Fix AI Optimizer to use full system capability*
*Current State: 7/71 knobs (10%)*
*Target State: 71/71 knobs (100%)*
*Risk Level: Low to Medium*
*Estimated Time: Phase 1 = 15 minutes*