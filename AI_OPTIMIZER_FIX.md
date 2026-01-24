# AI Optimizer Integration Fix
## Make AI Optimizer Actually Work with All PCM Knobs

## Current Problem
AI Optimizer is running but only using 7 knobs due to:
1. Name mismatches
2. Processors disabled
3. Limited knob awareness

## Immediate Fix (5 minutes)

### Step 1: Fix Name Mapping
Add this mapping to the knob update handler on VM:

```javascript
// In the knob update handler (wherever scheduled_knob_updates are processed)
const AI_TO_REGISTRY_MAP = {
  "input_gain": "pcm.input_gain_db",
  "output_gain": "pcm.output_gain_db",
  "noise_gate_threshold": "noise_gate.threshold_dbfs",
  "agc_target": "agc.target_level_dbfs",
  "compressor_threshold": "compressor.threshold_dbfs",
  "compressor_ratio": "compressor.ratio",
  "vad_sensitivity": "vad.sensitivity"
};

function translateAIKnobs(aiKnobs) {
  const translated = {};
  for (const [key, value] of Object.entries(aiKnobs)) {
    const registryKey = AI_TO_REGISTRY_MAP[key] || key;
    translated[registryKey] = value;
  }
  return translated;
}
```

### Step 2: Enable Processors
SSH to VM and update KnobsRegistry.js:

```bash
ssh azureuser@20.170.155.53

# Edit the file
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/station/generic/
nano KnobsRegistry.js

# Change these defaults:
"agc.enabled": {
  default: true,  # Change from false to true
},

"compressor.enabled": {
  default: true,  # Change from false to true
},

"noise_reduction.enabled": {
  default: true,  # Change from false to true
},

# Restart
pm2 restart STTTSserver
```

### Step 3: Expand AI Knob Awareness
Tell the AI Optimizer about more knobs by updating its configuration:

```javascript
// Find where AI Optimizer is configured and add:
const EXPANDED_AI_KNOBS = {
  // Current 7 (with correct names)
  "pcm.input_gain_db": { min: -12, max: 12, step: 0.5 },
  "pcm.output_gain_db": { min: -12, max: 12, step: 0.5 },
  "noise_gate.threshold_dbfs": { min: -60, max: -20, step: 2 },
  "agc.target_level_dbfs": { min: -30, max: -10, step: 2 },
  "compressor.threshold_dbfs": { min: -40, max: 0, step: 2 },
  "compressor.ratio": { min: 1, max: 20, step: 1 },
  "vad.sensitivity": { min: 0, max: 3, step: 1 },

  // Add PCM control knobs
  "pcm.target_level_dbfs": { min: -30, max: 0, step: 2 },
  "limiter.threshold_dbfs": { min: -30, max: -1, step: 1 },
  "limiter.enabled": { type: "bool" },

  // Add processor enables
  "agc.enabled": { type: "bool" },
  "compressor.enabled": { type: "bool" },
  "noise_reduction.enabled": { type: "bool" },

  // Add high-impact knobs
  "highpass.enabled": { type: "bool" },
  "highpass.cutoff_hz": { min: 50, max: 200, step: 10 },
  "safety.clipping_protection": { type: "bool" }
};
```

## Testing After Fix

### 1. Verify Processors Enabled
```bash
curl http://20.170.155.53:3020/api/knobs/current | jq '.agc.enabled, .compressor.enabled'
# Should return: true, true
```

### 2. Check AI Updates Working
```bash
# Make test call
# Then check recent updates:
psql -U monitoring_user -d monitoring_v2 -c "
SELECT knob_values, created_at
FROM scheduled_knob_updates
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC LIMIT 5;"
```

### 3. Verify Knob Application
```bash
curl http://20.170.155.53:3020/api/knobs/verify
```

## Expected Results After Fix

### Immediate (5 minutes):
- ✅ AGC and Compressor actually working
- ✅ AI adjustments properly mapped to registry
- ✅ 3 processors enabled by default

### After Expansion (30 minutes):
- ✅ AI using 20+ knobs (up from 7)
- ✅ PCM knobs being optimized
- ✅ Better audio quality from active processors

## Why This Wasn't Working

The AI Optimizer was built and IS running, but:
1. **Configuration drift**: AI config used old knob names
2. **Defaults mismatch**: Processors disabled by default
3. **Limited scope**: AI only knew about 7 knobs

This is a **configuration issue, not a code issue** - the system is built correctly, just not configured to use its full capability!

## Next Step
After fixing the immediate issues above, we can expand to the full 50 PCM knobs in the remediation plan. But first, let's get the existing 7 actually working with the processors enabled!