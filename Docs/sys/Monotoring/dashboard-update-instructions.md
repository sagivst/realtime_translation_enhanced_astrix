# Dashboard Update Instructions for 75-Parameter System

## Current Status

The monitoring server is now generating **75 parameters** (55 base + 20 DSP), but the dashboards still reference "55 parameters" and use local parameter generation.

## Required Dashboard Updates

### Option 1: Use API /metrics Endpoint (RECOMMENDED)

Instead of using local `generate55Parameters()` function, fetch from API:

```javascript
// OLD approach (local generation):
const fullParams = generate55Parameters(station.metrics);

// NEW approach (fetch from API):
async function fetchStationMetrics(stationId) {
  const response = await fetch(`http://20.170.155.53:3021/api/stations/${stationId}/metrics`);
  const data = await response.json();
  return data.metrics; // Returns all 75 parameters
}
```

### Option 2: Update Local Generation Function

If you prefer local generation, rename and update:

```javascript
// Rename function
generate55Parameters() → generate75Parameters()

// Add DSP category generation (copy from server's generate75Parameters function)
```

## Text Updates Needed

Search and replace in all dashboard files:

1. **"55 parameters"** → **"75 parameters"**
2. **"55-parameter"** → **"75-parameter"**
3. **"`generate55Parameters`"** → **"`generate75Parameters`"**
4. **"All Parameters (55)"** → **"All Parameters (75)"**

## Files to Update

```
/private/tmp/monitoring-dashboard-level3-complete.html  (primary dashboard)
/private/tmp/monitoring-dashboard-level2.html
/private/tmp/calibration-dashboard.html
```

## DSP Parameter Definitions to Add

Add these 20 DSP parameters to `parameterDefinitions` array:

```javascript
// DSP Enhancement Parameters (20 parameters)
{ id: 'dsp_hpf_lowFreqRumble', name: 'Low Freq Rumble', category: 'dsp', subcategory: 'hpf_lpf', path: 'dsp.hpf.lowFreqRumble', unit: 'dB', ranges: { min: -60, max: -30 } },
{ id: 'dsp_lpf_hfHarshness', name: 'HF Harshness', category: 'dsp', subcategory: 'hpf_lpf', path: 'dsp.lpf.hfHarshness', unit: 'dB', ranges: { min: -40, max: -10 } },
{ id: 'dsp_nr_residualNoise', name: 'Residual Noise', category: 'dsp', subcategory: 'noise_reduction', path: 'dsp.nr.residualNoise', unit: 'dB', ranges: { min: -60, max: -35 } },
{ id: 'dsp_nr_speechIntegrityLoss', name: 'Speech Integrity Loss', category: 'dsp', subcategory: 'noise_reduction', path: 'dsp.nr.speechIntegrityLoss', unit: '%', ranges: { min: 0, max: 10 } },
// ... (16 more - see /tmp/dsp-param-configs/ for complete list)
```

## WebSocket Updates

Socket.IO listeners should work automatically since they receive whatever the server sends, but verify:

```javascript
socket.on('station-update', (station) => {
  // station.metrics will now have 7 categories instead of 6
  // Verify 'dsp' category is present
  console.log('DSP present:', 'dsp' in station.metrics);
});
```

## Testing Checklist

After updating dashboards:

- [ ] Verify parameter count shows "75" instead of "55"
- [ ] Check DSP category appears in parameter grid
- [ ] Test DSP parameter detail views (Level 3)
- [ ] Verify real-time updates include DSP metrics
- [ ] Test calibration dashboard shows DSP in results
- [ ] Check breadcrumb navigation with DSP params

## Quick Test Command

```bash
# Open dashboard and check console:
open /private/tmp/monitoring-dashboard-level3-complete.html

# In browser console:
fetch('http://20.170.155.53:3021/api/stations/station-1/metrics')
  .then(r => r.json())
  .then(d => console.log('Total params:', Object.keys(d.metrics).length, 'DSP present:', 'dsp' in d.metrics));
```

## Recommendation

**Don't update dashboards manually yet.** The current 55-parameter dashboards work fine for development. Focus on:

1. ✅ Server-side DSP generation (DONE)
2. ✅ API endpoints returning 75 params (DONE)
3. ⏳ Install GStreamer/DSP libraries
4. ⏳ Test real DSP processing
5. Then update dashboards to show actual DSP metrics with real values

