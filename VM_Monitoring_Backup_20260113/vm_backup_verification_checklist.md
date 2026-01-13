# VM Monitoring System - Complete Backup Verification Checklist
# Based on INSTALLATION_GUIDE.md Requirements

## ✅ Database Components
- [ ] PostgreSQL database dump (monitoring_v2)
- [ ] Database schema only backup
- [ ] Table data exports (7 tables required):
  - [ ] traces
  - [ ] metrics_agg_5s
  - [ ] audio_segments_5s
  - [ ] knob_snapshots_5s
  - [ ] scheduled_knob_updates
  - [ ] knob_verifications
  - [ ] knob_events
- [ ] Database user credentials
- [ ] PostgreSQL configuration

## ✅ Core Source Code Files (CRITICAL)
### Main Server
- [ ] STTTTSserver.js

### Monitoring Stations Bootstrap
- [ ] MonitoringStationsBootstrap.js

### Bridge Components
- [ ] DatabaseBridge.js (VERIFY lines 127-169 for trace creation!)
- [ ] MetricsEmitter.js
- [ ] AudioWriter.js
- [ ] AudioRecorder.js
- [ ] BackpressurePolicy.js

### Station Handlers
- [ ] St_Handler_Generic.js
- [ ] Station3_3333_Handler.js
- [ ] Station3_4444_Handler.js

### Generic Station Components
- [ ] Aggregator.js
- [ ] MetricsRegistry.js
- [ ] KnobsRegistry.js
- [ ] KnobsResolver.js

### Library Components
- [ ] BucketScheduler.js
- [ ] OptimizerAPI.js (if exists)

## ✅ AI Optimizer Service (CRITICAL - Currently Missing!)
- [ ] ai-service-openai.js
- [ ] package.json (AI Optimizer specific)
- [ ] ecosystem.ai-optimizer.config.js
- [ ] .env file (contains OpenAI API key)
- [ ] test-openai.js
- [ ] Fallback rules configuration
- [ ] Decision history logs

## ✅ Configuration Files
- [ ] monitoring.config.json
- [ ] ecosystem.config.js (Main PM2 config)
- [ ] ecosystem.ai-optimizer.config.js (AI PM2 config)
- [ ] package.json (Main)
- [ ] package-lock.json
- [ ] .env (Main - contains DB credentials)
- [ ] .env (AI Optimizer - contains OpenAI key)

## ✅ PM2 Process Management
- [ ] PM2 process list (9 processes required):
  1. [ ] STTTTSserver
  2. [ ] ai-optimizer
  3. [ ] ari-handler
  4. [ ] bucket-scheduler
  5. [ ] database-api-server
  6. [ ] gateway-3333
  7. [ ] gateway-4444
  8. [ ] optimizer-agent
  9. [ ] proxy-dashboard
- [ ] PM2 dump file
- [ ] PM2 ecosystem configs for each service

## ✅ Additional Services (Not in Main Monitoring)
- [ ] gateway-3333 service files
- [ ] gateway-4444 service files
- [ ] ari-handler service files
- [ ] bucket-scheduler service files
- [ ] database-api-server service files
- [ ] optimizer-agent service files
- [ ] proxy-dashboard service files

## ✅ System Configuration
- [ ] Crontab entries
- [ ] Network configuration
- [ ] Firewall rules (ports 6120, 6123, 3020, 3090)
- [ ] System limits configuration
- [ ] Directory permissions

## ✅ Audio Storage
- [ ] /var/monitoring/audio structure
- [ ] Recent audio files (72 hours)
- [ ] Audio directory permissions

## ✅ Dependencies & Versions
- [ ] Node.js version requirement (≥14.0.0)
- [ ] npm packages list
- [ ] PostgreSQL version (≥12)
- [ ] PM2 version

## ✅ API Keys & Credentials
- [ ] OpenAI API key (in AI Optimizer .env)
- [ ] Database credentials
- [ ] Deepgram API credentials
- [ ] DeepL API credentials
- [ ] ElevenLabs API credentials

## ✅ Directory Structure Required
```
/home/azureuser/translation-app/
├── 3333_4444__Operational/
│   └── STTTTSserver/
│       ├── STTTTSserver.js
│       ├── ecosystem.config.js
│       ├── package.json
│       ├── Monitoring_Stations/
│       │   ├── MonitoringStationsBootstrap.js
│       │   ├── bridge/
│       │   ├── stations/
│       │   ├── audio/
│       │   └── config/
│       └── lib/
├── ai-optimizer/
│   ├── ai-service-openai.js
│   ├── package.json
│   ├── .env
│   └── ecosystem.ai-optimizer.config.js
└── [other services directories]
```

## ❌ Currently Missing in Backup:
1. **AI Optimizer Service** - Complete directory not found
2. **Gateway services** - Source code
3. **ARI Handler** - Source code
4. **Database API Server** - Source code
5. **Optimizer Agent** - Source code
6. **Proxy Dashboard** - Source code
7. **OptimizerAPI.js** - Not found in lib directory

## 📋 Verification Commands to Run:
```bash
# Check all PM2 services
pm2 list

# Check database tables
psql -U monitoring_user -d monitoring_v2 -c "\dt"

# Verify critical code
grep -n "INSERT INTO traces" DatabaseBridge.js

# Check OpenAI configuration
cat /home/azureuser/translation-app/ai-optimizer/.env | grep OPENAI

# Check all service directories
ls -la /home/azureuser/translation-app/
```