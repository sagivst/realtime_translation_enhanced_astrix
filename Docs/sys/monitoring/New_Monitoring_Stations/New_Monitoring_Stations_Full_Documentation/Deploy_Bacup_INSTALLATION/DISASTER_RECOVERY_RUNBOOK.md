# NEW Monitoring System - Disaster Recovery Runbook

## Emergency Contact Information
```
System Administrator: _________________
On-Call Engineer: _________________
Database Admin: _________________
VM Access: azureuser@20.170.155.53
Backup Location: /backup/monitoring
Documentation: /Docs/sys/monitoring/New_Monitoring_Stations/
```

---

## Quick Recovery Commands
```bash
# CRITICAL - Always verify this first!
grep -n "INSERT INTO traces" /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js

# If missing, restore immediately:
./restore_system.sh --source --date 20260111
```

---

## Scenario 1: Database Corruption / Foreign Key Violations

### Symptoms
- Error: `foreign key constraint "metrics_agg_5s_trace_id_fkey"`
- No new data in database tables
- API returns empty results

### Immediate Actions (5 minutes)
```bash
# 1. Check database status
psql -U monitoring_user -d monitoring_v2 -c "SELECT COUNT(*) FROM traces WHERE started_at > NOW() - INTERVAL '10 minutes';"

# 2. Check for foreign key violations in logs
pm2 logs STTTTSserver --lines 100 | grep "foreign key"

# 3. Verify trace creation code exists
grep "INSERT INTO traces" /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js

# 4. If code missing, restore from backup
cd /backup/monitoring/source/daily/
tar -xOzf source_20260111_230700.tar.gz STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js > /tmp/DatabaseBridge.js
cp /tmp/DatabaseBridge.js /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/bridge/

# 5. Restart service
pm2 restart STTTTSserver
```

### Root Cause Fix (15 minutes)
```bash
# 1. Stop services
pm2 stop STTTTSserver

# 2. Clean orphaned records
psql -U monitoring_user -d monitoring_v2 << EOF
-- Remove orphaned metrics
DELETE FROM metrics_agg_5s
WHERE trace_id NOT IN (SELECT trace_id FROM traces);

-- Remove orphaned audio segments
DELETE FROM audio_segments_5s
WHERE trace_id NOT IN (SELECT trace_id FROM traces);

-- Remove orphaned knob snapshots
DELETE FROM knob_snapshots_5s
WHERE trace_id NOT IN (SELECT trace_id FROM traces);
EOF

# 3. Verify DatabaseBridge.js has trace creation (lines 127-169)
vim +127 /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js

# 4. Restart services
pm2 restart STTTTSserver

# 5. Test with call
node /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/test_monitoring.js
```

---

## Scenario 2: Service Won't Start

### Symptoms
- PM2 shows "errored" status
- Service keeps restarting
- API not responding

### Immediate Actions (5 minutes)
```bash
# 1. Check PM2 status
pm2 status

# 2. Check error logs
pm2 logs STTTTSserver --err --lines 50

# 3. Common fixes:
# Port already in use
sudo lsof -i :3020
sudo kill -9 [PID]

# Missing dependencies
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
npm install

# Permission issues
sudo chown -R azureuser:azureuser /home/azureuser/translation-app/
sudo chown -R azureuser:azureuser /var/monitoring/

# 4. Delete and restart
pm2 delete STTTTSserver
pm2 start ecosystem.config.js
```

### If Still Failing (10 minutes)
```bash
# 1. Start in debug mode
pm2 delete all
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
node STTTTSserver.js

# 2. Watch for specific error and fix
# Common errors:
# - Cannot find module: npm install [module]
# - EADDRINUSE: kill process using port
# - EACCES: fix permissions
# - Database connection: check PostgreSQL

# 3. Once working, restart with PM2
pm2 start ecosystem.config.js
pm2 save
```

---

## Scenario 3: Complete System Failure

### Symptoms
- VM crashed or corrupted
- Multiple services down
- Data loss suspected

### Phase 1: Assessment (10 minutes)
```bash
# 1. System check
ssh azureuser@20.170.155.53

# 2. Service status
systemctl status postgresql
pm2 status

# 3. Disk status
df -h
ls -la /home/azureuser/translation-app/

# 4. Backup availability
ls -la /backup/monitoring/
ls -t /backup/monitoring/postgres/daily/ | head -5
ls -t /backup/monitoring/source/daily/ | head -5
```

### Phase 2: Critical Recovery (30 minutes)
```bash
# 1. Ensure PostgreSQL running
sudo systemctl start postgresql

# 2. Restore database from latest backup
cd /backup/monitoring/backup_scripts/
./restore_system.sh --database

# 3. Restore source code (CRITICAL - must have trace creation!)
./restore_system.sh --source

# 4. Verify critical code
grep -n "INSERT INTO traces" /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js

# 5. Restore configuration
./restore_system.sh --config

# 6. Start services
pm2 start /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/ecosystem.config.js
```

### Phase 3: Verification (10 minutes)
```bash
# 1. Check services
pm2 status

# 2. Test API
curl http://localhost:3020/health

# 3. Run test call
node /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/test_monitoring.js

# 4. Check database
psql -U monitoring_user -d monitoring_v2 -c "SELECT COUNT(*) FROM traces WHERE started_at > NOW() - INTERVAL '5 minutes';"
```

---

## Scenario 4: Disk Full

### Symptoms
- Write errors in logs
- No new audio files
- Database inserts failing

### Immediate Actions (5 minutes)
```bash
# 1. Check disk usage
df -h

# 2. Find large files
du -h /var/monitoring/ | sort -rh | head -20
du -h /home/azureuser/ | sort -rh | head -20

# 3. Clean audio files older than 3 days
find /var/monitoring/audio -name "*.wav" -mtime +3 -delete

# 4. Clean old logs
find /home/azureuser/.pm2/logs -name "*.log" -mtime +7 -delete
rm -f /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/logs/*.log

# 5. Clean old backups if needed
find /backup/monitoring -name "*" -mtime +30 -delete

# 6. Database cleanup
psql -U monitoring_user -d monitoring_v2 -c "SELECT cleanup_old_monitoring_data();"
```

---

## Scenario 5: No Metrics Recording

### Symptoms
- Calls working but no metrics in database
- Empty results from API
- No errors in logs

### Debug Steps (10 minutes)
```bash
# 1. Check if monitoring initialized
pm2 logs STTTTSserver | grep "NEW Monitoring Framework"

# 2. Check monitoring context creation
pm2 logs STTTTSserver | grep "trace_"

# 3. Check MetricsEmitter queue
pm2 logs STTTTSserver | grep "Queue"

# 4. Test database connection
psql -U monitoring_user -d monitoring_v2 -c "SELECT NOW();"

# 5. Check for trace creation
psql -U monitoring_user -d monitoring_v2 -c "SELECT trace_id, started_at FROM traces ORDER BY started_at DESC LIMIT 5;"

# 6. If no traces, verify DatabaseBridge.js
grep -A 20 "insertBatch" /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js
```

### Fix (10 minutes)
```bash
# 1. If DatabaseBridge.js missing trace creation
cd /home/azureuser/translation-app/3333_4444__Operational
cp /backup/source/DatabaseBridge.js.backup-20260111-230700 STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js

# 2. Restart
pm2 restart STTTTSserver

# 3. Test
node STTTTSserver/test_monitoring.js

# 4. Verify
curl http://localhost:3020/api/traces/active
```

---

## Scenario 6: API Not Responding

### Symptoms
- curl http://localhost:3020/health fails
- Connection refused errors
- PM2 shows service running

### Quick Fix (5 minutes)
```bash
# 1. Check if port is listening
netstat -tlnp | grep 3020

# 2. Check firewall
sudo iptables -L -n | grep 3020

# 3. Restart service
pm2 restart STTTTSserver

# 4. Check logs for binding errors
pm2 logs STTTTSserver | grep -i "port\|listen\|express"

# 5. Try different port if needed
export PORT=3021
pm2 restart STTTTSserver
```

---

## Scenario 7: After VM Reboot

### Standard Recovery (5 minutes)
```bash
# 1. SSH to VM
ssh azureuser@20.170.155.53

# 2. Start PostgreSQL if needed
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 3. Restore PM2 processes
pm2 resurrect

# 4. If resurrect fails
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
pm2 start ecosystem.config.js

# 5. Verify
pm2 status
curl http://localhost:3020/health
```

---

## Scenario 8: OpenAI API Failure

### Symptoms
- AI Optimizer running but no optimizations occurring
- Error logs show "OpenAI API error" or rate limits
- Decisions array empty in responses

### Immediate Actions (3 minutes)
```bash
# 1. Check AI Optimizer status
pm2 status ai-optimizer

# 2. Check OpenAI errors
pm2 logs ai-optimizer --err --lines 50 | grep -i "openai\|429\|401"

# 3. Test OpenAI connection
cd /home/azureuser/translation-app/ai-optimizer
node test-openai.js

# 4. Check API key
grep OPENAI_API_KEY .env

# 5. Force fallback mode
export AI_FALLBACK_ONLY=true
pm2 restart ai-optimizer
```

### Fix OpenAI Issues (10 minutes)
```bash
# 1. Rate limit error (429)
# Wait 60 seconds, then restart with lower frequency
sed -i 's/OPTIMIZATION_INTERVAL=10000/OPTIMIZATION_INTERVAL=30000/' .env
pm2 restart ai-optimizer

# 2. Authentication error (401)
# Update API key
echo "OPENAI_API_KEY=sk-new-key-here" >> .env
pm2 restart ai-optimizer

# 3. Service unavailable (503)
# Enable fallback mode
cat >> .env << EOF
AI_FALLBACK_ONLY=true
EOF
pm2 restart ai-optimizer

# 4. Timeout errors
# Increase timeout
sed -i 's/API_TIMEOUT_MS=2000/API_TIMEOUT_MS=5000/' .env
pm2 restart ai-optimizer
```

### Long-term Fix
```bash
# Switch to cheaper model temporarily
sed -i 's/gpt-4-turbo-preview/gpt-3.5-turbo/' .env

# Or disable AI optimization completely
psql -U monitoring_user -d monitoring_v2 << EOF
UPDATE knob_snapshots_5s
SET knobs_json = jsonb_set(knobs_json, '{ai.optimization_allowed}', 'false')
WHERE bucket_ts = (SELECT MAX(bucket_ts) FROM knob_snapshots_5s);
EOF
```

---

## Scenario 9: AI Optimizer Service Down

### Symptoms
- Port 3090 not responding
- PM2 shows ai-optimizer as "errored"
- No optimization decisions being made

### Quick Recovery (5 minutes)
```bash
# 1. Check service status
pm2 status ai-optimizer
curl http://localhost:3090/health

# 2. Check error logs
pm2 logs ai-optimizer --err --lines 50

# 3. Common fixes:
# Missing dependencies
cd /home/azureuser/translation-app/ai-optimizer
npm install

# Port conflict
sudo lsof -i :3090
sudo kill -9 [PID]

# 4. Restart service
pm2 delete ai-optimizer
pm2 start ecosystem.ai-optimizer.config.js

# 5. Verify
curl http://localhost:3090/health
```

### Restore from Backup (15 minutes)
```bash
# 1. Stop service
pm2 stop ai-optimizer

# 2. Restore from backup
cd /backup/ai-optimizer/daily
tar -xzf ai_optimizer_$(date +%Y%m%d)*.tar.gz -C /home/azureuser/translation-app/ai-optimizer/

# 3. Decrypt .env file
gpg --decrypt env_encrypted_$(date +%Y%m%d)*.gpg > /home/azureuser/translation-app/ai-optimizer/.env

# 4. Install dependencies
cd /home/azureuser/translation-app/ai-optimizer
npm install

# 5. Start service
pm2 start ecosystem.ai-optimizer.config.js

# 6. Test
curl -X POST http://localhost:3090/optimize \
  -H "Content-Type: application/json" \
  -d '{"knobs":{"ai.optimization_allowed":true},"metrics":{}}'
```

---

## Scenario 10: Runaway AI Optimizations

### Symptoms
- Knobs changing too frequently
- Audio quality degrading
- System oscillating between settings

### Emergency Stop (1 minute)
```bash
# 1. IMMEDIATELY disable AI optimization
pm2 stop ai-optimizer

# 2. Set all stations to disable AI
psql -U monitoring_user -d monitoring_v2 << EOF
UPDATE knob_snapshots_5s
SET knobs_json = jsonb_set(knobs_json, '{ai.optimization_allowed}', 'false')
WHERE bucket_ts >= NOW() - INTERVAL '1 hour';
EOF

# 3. Clear scheduled updates
psql -U monitoring_user -d monitoring_v2 << EOF
DELETE FROM scheduled_knob_updates
WHERE apply_at > NOW();
EOF
```

### Reset to Safe Defaults (5 minutes)
```bash
# 1. Reset knobs to safe defaults
curl -X POST http://localhost:3020/api/optimizer/knobs/apply \
  -H "Content-Type: application/json" \
  -d '{
    "trace_id": "GLOBAL",
    "station_key": "St_3_3333",
    "apply_at_bucket_ts": "'$(date -u +%Y-%m-%dT%H:%M:00.000Z)'",
    "idempotency_key": "reset-'$(date +%s)'",
    "source": "manual_reset",
    "reason": "Emergency reset to defaults",
    "knobs": {
      "pcm.input_gain_db": 0,
      "pcm.output_gain_db": 0,
      "agc.enabled": false,
      "limiter.enabled": true,
      "limiter.threshold_dbfs": -6,
      "compressor.enabled": false
    }
  }'

# 2. Repeat for station 4444
# ... (same command with St_3_4444)

# 3. Review what happened
psql -U monitoring_user -d monitoring_v2 << EOF
SELECT occurred_at, knob_key, old_value, new_value, reason
FROM knob_events
WHERE occurred_at > NOW() - INTERVAL '1 hour'
ORDER BY occurred_at DESC
LIMIT 20;
EOF

# 4. Restart AI with conservative settings
sed -i 's/CONFIDENCE_THRESHOLD=0.5/CONFIDENCE_THRESHOLD=0.8/' /home/azureuser/translation-app/ai-optimizer/.env
sed -i 's/MAX_DECISIONS_PER_CYCLE=5/MAX_DECISIONS_PER_CYCLE=1/' /home/azureuser/translation-app/ai-optimizer/.env
pm2 restart ai-optimizer
```

---

## Critical File Verification Checklist

### Must Have These Files:
```bash
# 1. Main server
ls -la /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js

# 2. Critical DatabaseBridge.js with trace creation
grep -c "INSERT INTO traces" /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js
# MUST return at least 1

# 3. Bootstrap
ls -la /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/MonitoringStationsBootstrap.js

# 4. Configuration
ls -la /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/config/monitoring.config.json

# 5. PM2 config
ls -la /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/ecosystem.config.js

# 6. AI Optimizer service
ls -la /home/azureuser/translation-app/ai-optimizer/ai-service-openai.js

# 7. AI Optimizer config (encrypted)
ls -la /home/azureuser/translation-app/ai-optimizer/.env

# 8. AI PM2 config
ls -la /home/azureuser/translation-app/ai-optimizer/ecosystem.ai-optimizer.config.js
```

---

## Emergency SQL Queries

### Force Trace Creation
```sql
-- Create manual trace if needed
INSERT INTO traces (
    trace_id,
    started_at,
    src_extension,
    dst_extension,
    call_id,
    sample_rate,
    channels
) VALUES (
    'trace_manual_' || NOW()::text,
    NOW(),
    '3333',
    '4444',
    'manual_test',
    16000,
    1
) ON CONFLICT DO NOTHING;
```

### Clean Orphaned Data
```sql
-- Delete orphaned metrics
DELETE FROM metrics_agg_5s
WHERE trace_id NOT IN (SELECT trace_id FROM traces);

-- Delete old traces
DELETE FROM traces
WHERE ended_at < NOW() - INTERVAL '72 hours';

-- Reset sequences if needed
SELECT setval('knob_events_event_id_seq', (SELECT MAX(event_id) FROM knob_events));
```

### Check Database Health
```sql
-- Table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Blocking queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

---

## Recovery Validation Script

Save as `validate_recovery.sh`:
```bash
#!/bin/bash
echo "=== System Recovery Validation ==="

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Checks
checks_passed=0
checks_failed=0

# Database check
if psql -U monitoring_user -d monitoring_v2 -c "SELECT 1;" &>/dev/null; then
    echo -e "${GREEN}✓${NC} Database accessible"
    ((checks_passed++))
else
    echo -e "${RED}✗${NC} Database not accessible"
    ((checks_failed++))
fi

# Critical code check
if grep -q "INSERT INTO traces" /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/bridge/DatabaseBridge.js 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Trace creation code present"
    ((checks_passed++))
else
    echo -e "${RED}✗${NC} CRITICAL: Trace creation code missing!"
    ((checks_failed++))
fi

# PM2 check
if pm2 list | grep -q "online"; then
    echo -e "${GREEN}✓${NC} PM2 services running"
    ((checks_passed++))
else
    echo -e "${RED}✗${NC} PM2 services not running"
    ((checks_failed++))
fi

# API check
if curl -s http://localhost:3020/health | grep -q "ok"; then
    echo -e "${GREEN}✓${NC} API responding"
    ((checks_passed++))
else
    echo -e "${RED}✗${NC} API not responding"
    ((checks_failed++))
fi

# Summary
echo ""
echo "Checks passed: $checks_passed"
echo "Checks failed: $checks_failed"

if [ $checks_failed -eq 0 ]; then
    echo -e "${GREEN}System fully operational!${NC}"
    exit 0
else
    echo -e "${RED}System needs attention!${NC}"
    exit 1
fi
```

---

## Recovery Time Estimates

| Scenario | Detection | Recovery | Total |
|----------|-----------|----------|-------|
| Foreign Key Violations | 2 min | 5 min | 7 min |
| Service Won't Start | 1 min | 5 min | 6 min |
| Database Corruption | 5 min | 15 min | 20 min |
| Complete System Failure | 10 min | 45 min | 55 min |
| Disk Full | 2 min | 5 min | 7 min |
| After Reboot | 1 min | 3 min | 4 min |

---

## Preventive Measures

### Daily Checks (Automate with Cron)
```bash
# Add to crontab
0 8 * * * /backup/monitoring/daily_health_check.sh
```

### Weekly Backup Verification
```bash
# Test backup restoration to separate database
0 2 * * 0 /backup/monitoring/verify_backups.sh
```

### Monitor Disk Space
```bash
# Alert if disk > 80% full
*/30 * * * * df -h | grep -E '^/dev/' | awk '$5+0 > 80 {print $0}' | mail -s "Disk Alert" admin@example.com
```

---

## Notes Section
```
Last Incident: _________________
Resolution: _________________
Lessons Learned: _________________

Last Successful Backup: _________________
Last Restoration Test: _________________
Last Documentation Update: _________________
```