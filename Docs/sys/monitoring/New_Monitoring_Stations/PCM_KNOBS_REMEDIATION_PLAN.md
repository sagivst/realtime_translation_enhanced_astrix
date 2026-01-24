# PCM Knobs Remediation Plan
## Focus: PCM Audio Processing Control Parameters

## ⚠️ CRITICAL UPDATE: AI Optimizer Integration Issues Discovered

### New Finding (2026-01-21)
The AI Optimizer IS running but with severe configuration problems:
- **Only 7 of 71 knobs being used** (10% utilization)
- **Name mismatches** preventing proper knob application
- **Processors disabled** while AI tries to adjust them

## Executive Summary
Current system has only **3 PCM knobs** while monitoring **16 PCM metrics**. This plan adds **47 essential PCM knobs** to enable complete audio control and optimization. **HOWEVER**, we must first fix the AI Optimizer integration issues before adding new knobs.

## Prerequisite: Fix AI Optimizer Integration FIRST

### Problem 1: Name Mismatch
| AI Sends | Registry Expects |
|----------|------------------|
| `input_gain` | `pcm.input_gain_db` |
| `output_gain` | `pcm.output_gain_db` |

**Fix**: Add translation layer in knob update handler

### Problem 2: Disabled Processors
```javascript
// These are FALSE but AI adjusts them:
"agc.enabled": false        // MUST be true
"compressor.enabled": false // MUST be true
```

**Fix**: Change defaults to `true` in KnobsRegistry.js

### Problem 3: Limited Scope
- AI knows: 7 knobs
- System has: 71 knobs
- **Missing: 90% of capability**

**Fix**: Update AI configuration with all PCM knobs

---

## Current State Analysis

### Existing PCM Knobs (3 total)
```javascript
1. "pcm.input_gain_db"      // -24 to +24 dB (AI uses as "input_gain")
2. "pcm.output_gain_db"     // -24 to +24 dB (AI uses as "output_gain")
3. "pcm.target_level_dbfs"  // -30 to 0 dBFS (AI doesn't know about this)
```

### PCM Metrics Being Monitored (16 total)
```javascript
- pcm.peak_amplitude        - pcm.peak_to_peak
- pcm.rms_dbfs              - pcm.peak_dbfs
- pcm.average_absolute      - pcm.crest_factor
- pcm.silence_detected      - pcm.vad_probability
- pcm.clipped_samples       - pcm.clipping_ratio
- pcm.consecutive_clipped   - pcm.noise_floor
- pcm.snr_estimate          - pcm.muted_signal
- pcm.frozen_signal         - pcm.zero_crossing_rate
```

## Missing PCM Knobs - Critical Gaps

### Category 1: Amplitude & Dynamics Control (10 knobs)
These knobs control how the system handles amplitude and dynamics:

```javascript
"pcm.normalization.enabled": {
  description: "Enable automatic level normalization",
  type: "bool",
  default: false,
  liveApply: true
}

"pcm.normalization.attack_ms": {
  description: "Speed of gain increase for normalization",
  type: "float",
  min: 1, max: 100, default: 10,
  unit: "ms"
}

"pcm.normalization.release_ms": {
  description: "Speed of gain decrease for normalization",
  type: "float",
  min: 10, max: 1000, default: 100,
  unit: "ms"
}

"pcm.headroom_db": {
  description: "Safety headroom below 0 dBFS",
  type: "float",
  min: 0, max: 12, default: 3,
  unit: "dB"
}

"pcm.gate_threshold_dbfs": {
  description: "Level below which signal is gated",
  type: "float",
  min: -60, max: -20, default: -40,
  unit: "dBFS"
}

"pcm.expander.enabled": {
  description: "Enable downward expander for noise reduction",
  type: "bool",
  default: false
}

"pcm.expander.ratio": {
  description: "Expansion ratio below threshold",
  type: "float",
  min: 1, max: 10, default: 2
}

"pcm.makeup_gain_auto": {
  description: "Automatic makeup gain after processing",
  type: "bool",
  default: true
}

"pcm.reference_level_lufs": {
  description: "Target loudness level in LUFS",
  type: "float",
  min: -40, max: -10, default: -23,
  unit: "LUFS"
}

"pcm.dynamic_range_target_db": {
  description: "Target dynamic range",
  type: "float",
  min: 6, max: 40, default: 20,
  unit: "dB"
}
```

### Category 2: Clipping & Saturation Control (8 knobs)

```javascript
"pcm.clipping.prevention_enabled": {
  description: "Enable predictive clipping prevention",
  type: "bool",
  default: true
}

"pcm.clipping.threshold_percent": {
  description: "Threshold as % of full scale",
  type: "float",
  min: 85, max: 100, default: 98
}

"pcm.clipping.action": {
  description: "Action when clipping detected",
  type: "enum",
  values: ["limit", "soft_clip", "reduce_gain", "notify"],
  default: "limit"
}

"pcm.soft_clip.enabled": {
  description: "Enable soft clipping instead of hard limiting",
  type: "bool",
  default: false
}

"pcm.soft_clip.knee_db": {
  description: "Soft knee width in dB",
  type: "float",
  min: 0, max: 6, default: 2,
  unit: "dB"
}

"pcm.saturation.amount": {
  description: "Harmonic saturation amount",
  type: "float",
  min: 0, max: 100, default: 0,
  unit: "%"
}

"pcm.transient.preservation": {
  description: "Preserve transient peaks during limiting",
  type: "float",
  min: 0, max: 100, default: 50,
  unit: "%"
}

"pcm.ceiling_dbfs": {
  description: "Absolute ceiling level",
  type: "float",
  min: -3, max: 0, default: -0.3,
  unit: "dBFS"
}
```

### Category 3: Silence & VAD Control (7 knobs)

```javascript
"pcm.silence.threshold_dbfs": {
  description: "Threshold for silence detection",
  type: "float",
  min: -80, max: -30, default: -50,
  unit: "dBFS"
}

"pcm.silence.duration_ms": {
  description: "Minimum duration to detect silence",
  type: "int",
  min: 10, max: 1000, default: 300,
  unit: "ms"
}

"pcm.silence.action": {
  description: "Action on silence detection",
  type: "enum",
  values: ["none", "mute", "comfort_noise", "skip"],
  default: "none"
}

"pcm.vad.enabled": {
  description: "Enable Voice Activity Detection",
  type: "bool",
  default: true
}

"pcm.vad.sensitivity": {
  description: "VAD sensitivity (0=least, 3=most aggressive)",
  type: "int",
  min: 0, max: 3, default: 2
}

"pcm.vad.pre_buffer_ms": {
  description: "Buffer before speech onset",
  type: "int",
  min: 0, max: 500, default: 200,
  unit: "ms"
}

"pcm.vad.post_buffer_ms": {
  description: "Buffer after speech ends",
  type: "int",
  min: 0, max: 1000, default: 500,
  unit: "ms"
}
```

### Category 4: Noise Control (8 knobs)

```javascript
"pcm.denoise.enabled": {
  description: "Enable noise reduction",
  type: "bool",
  default: false
}

"pcm.denoise.strength": {
  description: "Noise reduction strength",
  type: "float",
  min: 0, max: 100, default: 50,
  unit: "%"
}

"pcm.noise_floor.tracking": {
  description: "Enable adaptive noise floor tracking",
  type: "bool",
  default: true
}

"pcm.noise_floor.update_rate": {
  description: "Noise floor update rate",
  type: "enum",
  values: ["slow", "medium", "fast"],
  default: "medium"
}

"pcm.comfort_noise.enabled": {
  description: "Generate comfort noise during silence",
  type: "bool",
  default: false
}

"pcm.comfort_noise.level_dbfs": {
  description: "Comfort noise level",
  type: "float",
  min: -80, max: -40, default: -60,
  unit: "dBFS"
}

"pcm.hum_filter.enabled": {
  description: "Remove 50/60Hz hum",
  type: "bool",
  default: false
}

"pcm.hum_filter.frequency": {
  description: "Hum frequency to remove",
  type: "enum",
  values: ["50Hz", "60Hz", "auto"],
  default: "auto"
}
```

### Category 5: Quality & Enhancement (7 knobs)

```javascript
"pcm.enhance.clarity": {
  description: "Speech clarity enhancement",
  type: "float",
  min: 0, max: 100, default: 0,
  unit: "%"
}

"pcm.enhance.presence": {
  description: "Presence boost (2-5kHz)",
  type: "float",
  min: -6, max: 6, default: 0,
  unit: "dB"
}

"pcm.enhance.warmth": {
  description: "Warmth adjustment (100-300Hz)",
  type: "float",
  min: -6, max: 6, default: 0,
  unit: "dB"
}

"pcm.de_esser.enabled": {
  description: "Reduce sibilance",
  type: "bool",
  default: false
}

"pcm.de_esser.frequency": {
  description: "De-esser center frequency",
  type: "int",
  min: 4000, max: 10000, default: 7000,
  unit: "Hz"
}

"pcm.de_esser.threshold": {
  description: "De-esser threshold",
  type: "float",
  min: -40, max: -10, default: -25,
  unit: "dB"
}

"pcm.stereo_width": {
  description: "Stereo field width (if stereo)",
  type: "float",
  min: 0, max: 200, default: 100,
  unit: "%"
}
```

### Category 6: Buffering & Latency (7 knobs)

```javascript
"pcm.buffer.size_frames": {
  description: "Processing buffer size",
  type: "int",
  min: 64, max: 4096, default: 512
}

"pcm.buffer.overlap_percent": {
  description: "Buffer overlap for smooth processing",
  type: "int",
  min: 0, max: 75, default: 50,
  unit: "%"
}

"pcm.lookahead.enabled": {
  description: "Enable lookahead for predictive processing",
  type: "bool",
  default: false
}

"pcm.lookahead.ms": {
  description: "Lookahead time",
  type: "float",
  min: 0, max: 100, default: 10,
  unit: "ms"
}

"pcm.latency.mode": {
  description: "Latency optimization mode",
  type: "enum",
  values: ["ultra_low", "low", "balanced", "quality"],
  default: "balanced"
}

"pcm.frame_size": {
  description: "Audio frame size in samples",
  type: "enum",
  values: ["160", "320", "480", "640"],
  default: "320"
}

"pcm.resampling.quality": {
  description: "Resampling quality if needed",
  type: "enum",
  values: ["fast", "good", "best"],
  default: "good"
}
```

## Revised Implementation Plan

### Phase 0: Fix AI Integration (IMMEDIATE - Day 1)
**Must complete before adding new knobs**

#### Step 1: Add Name Translation
```javascript
// In knob update handler:
const AI_TO_PCM_MAP = {
  "input_gain": "pcm.input_gain_db",
  "output_gain": "pcm.output_gain_db"
};
```

#### Step 2: Enable Processors
```bash
# On VM:
sed -i 's/"agc.enabled".*default: false/"agc.enabled": { default: true/' KnobsRegistry.js
sed -i 's/"compressor.enabled".*default: false/"compressor.enabled": { default: true/' KnobsRegistry.js
pm2 restart STTTSserver
```

#### Step 3: Test Current PCM Knobs Work
```bash
# Verify AI using correct names:
curl http://20.170.155.53:3020/api/knobs/current | grep "pcm."
```

### Phase 1: Core Amplitude Control (Week 1)
**Add 10 amplitude/dynamics knobs**

```javascript
// Priority knobs to add first:
1. pcm.normalization.enabled
2. pcm.headroom_db
3. pcm.gate_threshold_dbfs
4. pcm.makeup_gain_auto
5. pcm.dynamic_range_target_db
```

**Testing:**
- Make test call with normalization enabled
- Verify gain changes are smooth
- Check headroom is maintained
- Confirm no distortion introduced

### Phase 2: Clipping Prevention (Week 1-2)
**Add 8 clipping control knobs**

```javascript
// Critical for call quality:
1. pcm.clipping.prevention_enabled
2. pcm.clipping.threshold_percent
3. pcm.soft_clip.enabled
4. pcm.ceiling_dbfs
```

**Testing:**
- Test with high-amplitude input
- Verify soft clipping sounds better than hard
- Check transient preservation
- Measure distortion levels

### Phase 3: VAD & Silence (Week 2)
**Add 7 VAD/silence knobs**

```javascript
// Essential for bandwidth optimization:
1. pcm.vad.enabled
2. pcm.vad.sensitivity
3. pcm.silence.threshold_dbfs
4. pcm.silence.action
```

**Testing:**
- Test with speech + silence
- Verify VAD accuracy
- Check comfort noise generation
- Measure bandwidth savings

### Phase 4: Noise Reduction (Week 3)
**Add 8 noise control knobs**

```javascript
// Key for call quality:
1. pcm.denoise.enabled
2. pcm.denoise.strength
3. pcm.noise_floor.tracking
4. pcm.hum_filter.enabled
```

**Testing:**
- Test with noisy input
- Verify speech preservation
- Check noise floor tracking
- Measure SNR improvement

### Phase 5: Enhancement & Polish (Week 3-4)
**Add 7 quality enhancement knobs**

```javascript
// Nice-to-have improvements:
1. pcm.enhance.clarity
2. pcm.enhance.presence
3. pcm.de_esser.enabled
```

**Testing:**
- A/B test enhanced vs original
- Verify naturalness preserved
- Check for artifacts
- Measure perceived quality

### Phase 6: Optimization (Week 4)
**Add 7 buffering/latency knobs**

```javascript
// Performance tuning:
1. pcm.buffer.size_frames
2. pcm.latency.mode
3. pcm.lookahead.enabled
```

**Testing:**
- Measure latency at each setting
- Test CPU usage
- Verify smooth processing
- Check for dropouts

## Code Implementation Examples

### Adding Knobs to Registry
```javascript
// In KnobsRegistry.js, add:

"pcm.normalization.enabled": {
  description: "Enable automatic level normalization",
  type: "bool",
  default: false,
  liveApply: true,
  appliesAt: "NORMALIZATION",
  impact: "high"
},

"pcm.normalization.attack_ms": {
  description: "Speed of gain increase",
  type: "float",
  min: 1,
  max: 100,
  default: 10,
  liveApply: true,
  appliesAt: "NORMALIZATION",
  unit: "ms",
  impact: "medium"
}
```

### Implementing in St_Handler_Generic.js
```javascript
// Add normalization stage after input gain:

if (knobs["pcm.normalization.enabled"]) {
  const targetLevel = this._dbfsToLinear(knobs["pcm.target_level_dbfs"]);
  const attack = knobs["pcm.normalization.attack_ms"];
  const release = knobs["pcm.normalization.release_ms"];

  processed = this._applyNormalization(processed, targetLevel, attack, release, ctx);
}

// Add clipping prevention:

if (knobs["pcm.clipping.prevention_enabled"]) {
  const threshold = knobs["pcm.clipping.threshold_percent"] / 100;
  const action = knobs["pcm.clipping.action"];

  processed = this._preventClipping(processed, threshold, action);
}
```

### AI Optimizer Integration (UPDATED)
```javascript
// CRITICAL: AI must use correct names AND know about all PCM knobs

const PCM_OPTIMIZATION_KNOBS = {
  // === EXISTING 3 PCM KNOBS (Must use correct names!) ===
  "pcm.input_gain_db": { min: -12, max: 12, step: 0.5 },     // AI currently sends "input_gain"
  "pcm.output_gain_db": { min: -12, max: 12, step: 0.5 },    // AI currently sends "output_gain"
  "pcm.target_level_dbfs": { min: -20, max: -6, step: 1 },   // AI doesn't know this exists!

  // === NEW PCM KNOBS TO ADD ===

  // Amplitude control (Phase 1)
  "pcm.normalization.enabled": { type: "bool" },
  "pcm.normalization.attack_ms": { min: 1, max: 100, step: 5 },
  "pcm.normalization.release_ms": { min: 10, max: 1000, step: 50 },
  "pcm.headroom_db": { min: 1, max: 6, step: 0.5 },
  "pcm.gate_threshold_dbfs": { min: -60, max: -20, step: 2 },
  "pcm.makeup_gain_auto": { type: "bool" },

  // Clipping control (Phase 2)
  "pcm.clipping.prevention_enabled": { type: "bool" },
  "pcm.clipping.threshold_percent": { min: 90, max: 99, step: 1 },
  "pcm.clipping.action": { type: "enum", values: ["limit", "soft_clip", "reduce_gain"] },
  "pcm.soft_clip.enabled": { type: "bool" },
  "pcm.soft_clip.knee_db": { min: 0, max: 6, step: 1 },
  "pcm.ceiling_dbfs": { min: -3, max: 0, step: 0.1 },

  // VAD & Silence (Phase 3)
  "pcm.vad.enabled": { type: "bool" },
  "pcm.vad.sensitivity": { min: 0, max: 3, step: 1 },
  "pcm.silence.threshold_dbfs": { min: -80, max: -30, step: 5 },
  "pcm.silence.duration_ms": { min: 100, max: 1000, step: 100 },

  // Noise control (Phase 4)
  "pcm.denoise.enabled": { type: "bool" },
  "pcm.denoise.strength": { min: 0, max: 100, step: 10 },
  "pcm.noise_floor.tracking": { type: "bool" },
  "pcm.hum_filter.enabled": { type: "bool" },

  // Enhancement (Phase 5)
  "pcm.enhance.clarity": { min: 0, max: 100, step: 10 },
  "pcm.enhance.presence": { min: -6, max: 6, step: 1 },
  "pcm.de_esser.enabled": { type: "bool" }
};

// TRANSLATION MAP for backward compatibility
const AI_NAME_FIXES = {
  "input_gain": "pcm.input_gain_db",
  "output_gain": "pcm.output_gain_db",
  "noise_gate_threshold": "pcm.gate_threshold_dbfs",
  "vad_sensitivity": "pcm.vad.sensitivity"
};
```

## Testing & Validation

### Unit Tests
```javascript
describe('PCM Knobs', () => {
  it('should apply normalization correctly', () => {
    const input = generateTestSignal(-30); // -30 dBFS
    const knobs = {
      "pcm.normalization.enabled": true,
      "pcm.target_level_dbfs": -12
    };
    const output = applyKnobs(input, knobs);
    expect(measureLevel(output)).toBeCloseTo(-12, 1);
  });

  it('should prevent clipping', () => {
    const input = generateClippingSignal();
    const knobs = {
      "pcm.clipping.prevention_enabled": true,
      "pcm.clipping.threshold_percent": 95
    };
    const output = applyKnobs(input, knobs);
    expect(countClippedSamples(output)).toBe(0);
  });
});
```

### Integration Test Script
```bash
#!/bin/bash
# test_pcm_knobs.sh

echo "Testing PCM knobs implementation..."

# Test 1: Normalization
curl -X POST http://20.170.155.53:3020/api/knobs/update \
  -d '{"pcm.normalization.enabled": true, "pcm.target_level_dbfs": -12}'

# Make test call
echo "Making test call for normalization..."
# ... call logic

# Test 2: Clipping prevention
curl -X POST http://20.170.155.53:3020/api/knobs/update \
  -d '{"pcm.clipping.prevention_enabled": true}'

# Test 3: Noise reduction
curl -X POST http://20.170.155.53:3020/api/knobs/update \
  -d '{"pcm.denoise.enabled": true, "pcm.denoise.strength": 70}'

# Verify metrics
curl http://20.170.155.53:3020/api/metrics/pcm
```

## Success Metrics

### Phase 1 Success
- ✅ 10 amplitude knobs implemented
- ✅ Normalization working without artifacts
- ✅ AI Optimizer using new knobs
- ✅ No latency increase

### Phase 2 Success
- ✅ Zero clipping in test calls
- ✅ Soft clipping sounds natural
- ✅ Transients preserved
- ✅ <1% THD added

### Full Implementation Success
- ✅ All 50 PCM knobs active
- ✅ AI optimizing 30+ PCM parameters
- ✅ 20dB SNR improvement possible
- ✅ <10ms added latency
- ✅ CPU usage <5% increase

## Risk Mitigation

### Audio Quality Risks
- Test each knob in isolation first
- A/B test all changes
- Keep "bypass all" switch
- Monitor THD and artifacts

### Performance Risks
- Profile CPU usage per knob
- Implement efficient DSP algorithms
- Use SIMD optimizations where possible
- Add circuit breakers

### Compatibility Risks
- Test with different audio formats
- Verify mono/stereo handling
- Test various sample rates
- Check endianness handling

## Rollback Plan
```bash
# Quick rollback if issues:
cp KnobsRegistry.js.backup KnobsRegistry.js
cp St_Handler_Generic.js.backup St_Handler_Generic.js
pm2 restart STTTSserver

# Disable all PCM knobs:
curl -X POST http://20.170.155.53:3020/api/knobs/reset/pcm
```

## Priority Action Items

### 🔴 IMMEDIATE (Before ANY new knobs):
1. **Fix AI name mismatches** - AI sending wrong names
2. **Enable processors** - AGC/Compressor are OFF
3. **Test existing 3 PCM knobs** actually work

### 🟡 NEXT (After fixes):
1. Add Phase 1 amplitude knobs (10 knobs)
2. Update AI config to know about them
3. Test with real calls

### 🟢 FUTURE:
1. Implement remaining phases (37 knobs)
2. Full AI optimization of all 50 PCM knobs

## Testing Checklist

### After AI Integration Fix:
```bash
# 1. Verify processors enabled
curl http://20.170.155.53:3020/api/knobs/current | jq '.agc.enabled, .compressor.enabled'
# Expected: true, true

# 2. Check AI using correct PCM names
psql -U monitoring_user -d monitoring_v2 -c "SELECT jsonb_object_keys(knob_values) FROM scheduled_knob_updates WHERE knob_values ? 'pcm.input_gain_db' LIMIT 1;"
# Expected: pcm.input_gain_db (not input_gain)

# 3. Count PCM knobs being adjusted
psql -U monitoring_user -d monitoring_v2 -c "SELECT COUNT(DISTINCT key) FROM (SELECT jsonb_object_keys(knob_values) as key FROM scheduled_knob_updates WHERE created_at > NOW() - INTERVAL '1 hour') t WHERE key LIKE 'pcm.%';"
# Expected: 3 initially, then growing as we add more
```

---
*Plan Created: 2026-01-21*
*Last Updated: 2026-01-21*
*Focus: PCM Audio Processing Knobs*
*Current State: 3 PCM knobs exist, AI broken*
*Target State: 50 PCM knobs, AI optimizing all*
*Timeline: Fix AI (Day 1), Add knobs (4 weeks)*