# NEW Monitoring System - Quick Reference Guide

## Auto-Control API Endpoints

### Base URL: `http://20.170.155.53:3020`

## 🎯 Most Common Operations

### 1. Adjust Audio Gain
```bash
# Increase input gain by 3dB
curl -X POST http://20.170.155.53:3020/api/knobs/update/global \
  -H "Content-Type: application/json" \
  -d '{"key": "pcm.input_gain_db", "value": 3, "source": "auto_control"}'

# Decrease output gain by 2dB
curl -X POST http://20.170.155.53:3020/api/knobs/update/global \
  -H "Content-Type: application/json" \
  -d '{"key": "pcm.output_gain_db", "value": -2, "source": "auto_control"}'
```

### 2. Enable/Disable Audio Processing
```bash
# Enable limiter (prevent clipping)
curl -X POST http://20.170.155.53:3020/api/knobs/update/global \
  -H "Content-Type: application/json" \
  -d '{"key": "limiter.enabled", "value": true, "source": "auto_control"}'

# Enable compressor (even out volume)
curl -X POST http://20.170.155.53:3020/api/knobs/update/global \
  -H "Content-Type: application/json" \
  -d '{"key": "compressor.enabled", "value": true, "source": "auto_control"}'

# Enable noise gate (remove background noise)
curl -X POST http://20.170.155.53:3020/api/knobs/update/global \
  -H "Content-Type: application/json" \
  -d '{"key": "noise_gate.enabled", "value": true, "source": "auto_control"}'
```

### 3. Get Current Settings
```bash
# Get all current knob values
curl -s http://20.170.155.53:3020/api/knobs/current | jq '.state.baseline'

# Get specific knob value
curl -s http://20.170.155.53:3020/api/knobs/current | \
  jq '.state.baseline["pcm.input_gain_db"]'
```

### 4. View Change History
```bash
# Get last 24 hours of changes
curl -s http://20.170.155.53:3020/api/knobs/history?hours=24 | jq '.history'

# Get last 1 hour of snapshots
curl -s http://20.170.155.53:3020/api/knobs/snapshots?hours=1 | jq '.snapshots'
```

### 5. Reset to Defaults
```bash
# Reset specific knob
curl -X POST http://20.170.155.53:3020/api/knobs/reset/pcm.input_gain_db

# Reset all knobs
curl -X POST http://20.170.155.53:3020/api/knobs/reset-all
```

---

## 📊 Database Queries for Monitoring

### Connect to Database
```bash
PGPASSWORD=monitoring_pass psql -U monitoring_user -d monitoring_v2 -h 20.170.155.53
```

### Key Queries

#### Get Current Audio Levels (Last 5 minutes)
```sql
SELECT
    station_key,
    tap,
    AVG(avg) as avg_level_dbfs,
    MAX(max) as peak_level_dbfs
FROM metrics_agg_5s
WHERE
    metric_key = 'pcm.rms_dbfs'
    AND bucket_ts > NOW() - INTERVAL '5 minutes'
GROUP BY station_key, tap;
```

#### Check for Clipping Issues
```sql
SELECT
    bucket_ts,
    station_key,
    avg as clipping_ratio
FROM metrics_agg_5s
WHERE
    metric_key = 'pcm.clipping_ratio'
    AND avg > 0.01  -- More than 1% clipping
    AND bucket_ts > NOW() - INTERVAL '1 hour'
ORDER BY bucket_ts DESC;
```

#### View Recent Knob Changes
```sql
SELECT
    occurred_at,
    knob_key,
    old_value,
    new_value,
    source
FROM knob_events
WHERE occurred_at > NOW() - INTERVAL '1 hour'
ORDER BY occurred_at DESC;
```

#### Get Processing Latency Stats
```sql
SELECT
    station_key,
    AVG(avg) as avg_latency_ms,
    MAX(max) as max_latency_ms
FROM metrics_agg_5s
WHERE
    metric_key = 'pipe.processing_latency_ms'
    AND bucket_ts > NOW() - INTERVAL '30 minutes'
GROUP BY station_key;
```

---

## 🤖 Python Auto-Control Script

```python
#!/usr/bin/env python3
import requests
import json
import time

class MonitoringController:
    def __init__(self, base_url="http://20.170.155.53:3020"):
        self.base_url = base_url

    def get_current_knobs(self):
        """Get current knob settings"""
        r = requests.get(f"{self.base_url}/api/knobs/current")
        return r.json()

    def update_knob(self, key, value, source="python_controller"):
        """Update a single knob"""
        r = requests.post(
            f"{self.base_url}/api/knobs/update/global",
            json={"key": key, "value": value, "source": source}
        )
        return r.json()

    def apply_preset(self, preset_name):
        """Apply a preset configuration"""
        presets = {
            "high_quality": {
                "pcm.input_gain_db": 0,
                "pcm.output_gain_db": 0,
                "limiter.enabled": True,
                "limiter.threshold_dbfs": -3,
                "compressor.enabled": True,
                "compressor.ratio": 3,
                "noise_gate.enabled": False
            },
            "noisy_environment": {
                "pcm.input_gain_db": 3,
                "noise_gate.enabled": True,
                "noise_gate.threshold_dbfs": -40,
                "highpass.enabled": True,
                "highpass.cutoff_hz": 100
            },
            "low_latency": {
                "compressor.enabled": False,
                "limiter.enabled": True,
                "limiter.threshold_dbfs": -6,
                "noise_gate.enabled": False
            }
        }

        if preset_name in presets:
            for key, value in presets[preset_name].items():
                self.update_knob(key, value, f"preset_{preset_name}")
                time.sleep(0.1)  # Avoid overwhelming the API
            return True
        return False

    def auto_adjust_gain(self, target_level=-18):
        """Automatically adjust gain based on target level"""
        # This would need metrics API to work fully
        # For now, it's a placeholder showing the concept
        current = self.get_current_knobs()
        current_gain = current['state']['baseline'].get('pcm.input_gain_db', 0)

        # Example logic (would need actual RMS levels)
        adjustment = 1  # Placeholder

        new_gain = max(-20, min(20, current_gain + adjustment))
        return self.update_knob('pcm.input_gain_db', new_gain, 'auto_gain')

# Usage example
if __name__ == "__main__":
    controller = MonitoringController()

    # Get current state
    print("Current knobs:", controller.get_current_knobs()['state']['baseline'])

    # Apply a preset
    controller.apply_preset("high_quality")

    # Update single knob
    controller.update_knob("pcm.input_gain_db", 2)
```

---

## 🔧 Common Knob Values Reference

| Knob | Default | Range | Description | When to Use |
|------|---------|--------|-------------|------------|
| **pcm.input_gain_db** | 0 | -60 to +20 | Input gain adjustment | Low volume issues |
| **pcm.output_gain_db** | 0 | -60 to +20 | Output gain adjustment | Final volume control |
| **limiter.enabled** | true | true/false | Prevent clipping | Always recommended |
| **limiter.threshold_dbfs** | -6 | -60 to 0 | Limiter ceiling | Adjust for headroom |
| **compressor.enabled** | false | true/false | Dynamic range control | Uneven volume |
| **compressor.ratio** | 4 | 1 to 20 | Compression ratio | Higher = more compression |
| **noise_gate.enabled** | false | true/false | Remove background noise | Noisy environments |
| **noise_gate.threshold_dbfs** | -50 | -80 to 0 | Gate threshold | Set above noise floor |
| **highpass.enabled** | false | true/false | Remove low frequencies | Rumble/wind noise |
| **highpass.cutoff_hz** | 80 | 20 to 500 | Filter frequency | Typically 80-120 Hz |

---

## 📈 Monitoring Metrics Reference

| Metric | Unit | Description | Normal Range |
|--------|------|-------------|--------------|
| **pcm.rms_dbfs** | dBFS | Average signal level | -30 to -12 |
| **pcm.peak_dbfs** | dBFS | Peak signal level | -20 to -3 |
| **pcm.clipping_ratio** | ratio | Clipped samples | < 0.001 |
| **pcm.zero_crossing_rate** | Hz | Signal frequency indicator | 50-500 |
| **pipe.processing_latency_ms** | ms | Processing time | < 5 |
| **pipe.frame_drop_ratio** | ratio | Dropped frames | 0 |

---

## 🚀 Quick Automation Examples

### Auto-Enable Limiter on High Peaks
```bash
#!/bin/bash
# Check peak levels and enable limiter if needed

PEAK=$(curl -s http://20.170.155.53:3020/api/knobs/current | \
  jq '.state.baseline["pcm.peak_dbfs"]')

if (( $(echo "$PEAK > -3" | bc -l) )); then
  curl -X POST http://20.170.155.53:3020/api/knobs/update/global \
    -H "Content-Type: application/json" \
    -d '{"key": "limiter.enabled", "value": true, "source": "peak_protector"}'
fi
```

### Reset at Midnight (Cron)
```bash
# Add to crontab: 0 0 * * *
0 0 * * * curl -X POST http://20.170.155.53:3020/api/knobs/reset-all
```

### Monitor and Alert
```python
import requests
import smtplib

def check_system_health():
    r = requests.get("http://20.170.155.53:3020/api/monitoring/status")
    status = r.json()

    if status['stats']['metrics']['errors'] > 10:
        send_alert("High error rate in metrics!")

    if not status['isRunning']:
        send_alert("Monitoring system is down!")
```

---

## 🔍 Debugging Commands

```bash
# Check if service is running
ssh azureuser@20.170.155.53 "pm2 status | grep STTTTSserver"

# View recent logs
ssh azureuser@20.170.155.53 "pm2 logs STTTTSserver --lines 50"

# Check database connectivity
PGPASSWORD=monitoring_pass psql -U monitoring_user -d monitoring_v2 \
  -h 20.170.155.53 -c "SELECT NOW();"

# Test API endpoint
curl -I http://20.170.155.53:3020/api/knobs/current

# Check recent metrics count
ssh azureuser@20.170.155.53 "PGPASSWORD=monitoring_pass psql -U monitoring_user \
  -d monitoring_v2 -h localhost -c 'SELECT COUNT(*) FROM metrics_agg_5s \
  WHERE bucket_ts > NOW() - INTERVAL \"1 hour\";'"
```

---

*Quick Reference v1.0 - 2026-01-03*