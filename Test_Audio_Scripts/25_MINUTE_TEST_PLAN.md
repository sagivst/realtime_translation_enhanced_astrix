# 25-Minute Test Plan for Production Approval Data

## Overview
Generate 25 minutes of continuous audio data to collect the required 10-minute before/after metrics for production approval.

---

## Files Created:
1. `english_25min_script.txt` - English script for extension 3333
2. `french_25min_script.txt` - French script for extension 4444
3. `generate_test_audio.sh` - Script to create audio files
4. This test plan

---

## Step-by-Step Execution Plan

### Phase 1: Generate Audio Files (Choose one method)

#### Option A: macOS Text-to-Speech (Recommended if on Mac)
```bash
cd Test_Audio_Scripts/

# English audio
say -v Daniel -f english_25min_script.txt -o english_3333.aiff
ffmpeg -i english_3333.aiff -acodec pcm_s16le -ac 1 -ar 8000 english_3333_25min.wav

# French audio
say -v Thomas -f french_25min_script.txt -o french_4444.aiff
ffmpeg -i french_4444.aiff -acodec pcm_s16le -ac 1 -ar 8000 french_4444_25min.wav
```

#### Option B: Google TTS
```bash
pip install gtts
gtts-cli -f english_25min_script.txt -l en -o english_3333_25min.mp3
gtts-cli -f french_25min_script.txt -l fr -o french_4444_25min.mp3

# Convert to WAV
ffmpeg -i english_3333_25min.mp3 -acodec pcm_s16le -ac 1 -ar 8000 english_3333_25min.wav
ffmpeg -i french_4444_25min.mp3 -acodec pcm_s16le -ac 1 -ar 8000 french_4444_25min.wav
```

#### Option C: Simple Test Tones (No TTS needed)
```bash
chmod +x generate_test_audio.sh
./generate_test_audio.sh
# This generates tone patterns with markers
```

### Phase 2: Deploy to Asterisk Server

```bash
# Upload audio files
scp english_3333_25min.wav azureuser@20.170.155.53:/tmp/
scp french_4444_25min.wav azureuser@20.170.155.53:/tmp/

# SSH to server and install
ssh azureuser@20.170.155.53
sudo mv /tmp/*_25min.wav /var/lib/asterisk/sounds/
sudo chown asterisk:asterisk /var/lib/asterisk/sounds/*_25min.wav

# Configure music on hold
sudo nano /etc/asterisk/musiconhold.conf
# Add:
[test_3333]
mode=files
directory=/var/lib/asterisk/sounds
random=no

[test_4444]
mode=files
directory=/var/lib/asterisk/sounds
random=no

# Reload Asterisk
sudo asterisk -rx "moh reload"
```

### Phase 3: Execute 25-Minute Test

#### Timeline:
```
T+0:00  - Start calls to 3333 and 4444 (put on hold)
T+0:01  - Verify data collection started
T+0:05  - Check metrics are being saved
T+10:00 - ENABLE AI OPTIMIZER (mark this timestamp!)
T+10:30 - Verify AI decisions being made
T+11:00 - Check knob applications
T+15:00 - Mid-test validation
T+20:00 - Final validation
T+25:00 - End test
```

#### Start Test:
```bash
# Terminal 1: Monitor database
ssh azureuser@20.170.155.53
watch -n 5 'sudo -u postgres psql monitoring_v2 -c "SELECT COUNT(*) as snapshots, MAX(bucket_ts) as latest FROM knob_snapshots_5s WHERE bucket_ts > NOW() - INTERVAL '"'"'30 minutes'"'"';"'

# Terminal 2: Monitor optimizer
ssh azureuser@20.170.155.53
pm2 logs optimizer-agent --lines 50

# Terminal 3: Place calls
# From softphone or Asterisk CLI:
# Dial 3333 - Will play English audio on loop
# Dial 4444 - Will play French audio on loop
```

### Phase 4: Enable AI at Minute 10

```bash
# At exactly T+10:00, enable AI optimization:
ssh azureuser@20.170.155.53

# Option 1: If using real OpenAI
export OPENAI_API_KEY="sk-..."
pm2 restart ai-optimizer

# Option 2: If using enhanced placeholder
# Modify ai-service to return aggressive optimizations
# Then restart
pm2 restart ai-optimizer
```

### Phase 5: Data Collection Queries

After test completion:

```sql
-- Get the exact optimization timestamp
SELECT MIN(created_at) as ai_enabled_at
FROM scheduled_knob_updates
WHERE trace_id LIKE '%[TODAY]%';

-- Extract before/after data
WITH optimization_time AS (
  SELECT '2026-01-05 20:XX:XX'::timestamp as opt_time
)
SELECT
  CASE
    WHEN bucket_ts < opt_time THEN 'BEFORE'
    ELSE 'AFTER'
  END as phase,
  COUNT(*) as buckets,
  AVG(pcm_rms_dbfs) as avg_rms,
  AVG(clipping_ratio) as avg_clipping,
  MIN(bucket_ts) as start_time,
  MAX(bucket_ts) as end_time
FROM metrics_aggregated, optimization_time
WHERE trace_id = '[ACTUAL_TRACE_ID]'
  AND bucket_ts BETWEEN (opt_time - INTERVAL '10 minutes')
                    AND (opt_time + INTERVAL '15 minutes')
GROUP BY phase;
```

---

## Expected Results

### Before Optimization (Minutes 0-10):
- Steady baseline metrics
- No knob changes
- Consistent audio levels

### After Optimization (Minutes 10-25):
- Gradual improvement in metrics
- Multiple knob applications
- Stabilization at optimal levels

### Deliverables:
1. ✅ Real snapshot JSON from minute 5
2. ✅ AI decision JSON from minute 10
3. ✅ BucketScheduler logs from minutes 10-11
4. ✅ SQL results showing 10 min before/15 min after

---

## Troubleshooting

### If trace_id still shows as 'GLOBAL':
Need to fix the code that inserts into knob_snapshots_5s first!

### If no AI decisions:
Check optimizer-agent logs and AI service configuration

### If audio doesn't play:
Check Asterisk musiconhold configuration and file permissions

---

## Success Criteria

✅ 25 minutes of continuous data collected
✅ Clear optimization point at minute 10
✅ Measurable improvement in metrics
✅ All 4 deliverables ready for production approval

---

This test will provide REAL data that meets ALL production approval requirements!