# Complete Deployment Checklist

## Pre-Deployment Requirements
- [ ] Ubuntu 22.04 LTS or similar
- [ ] Node.js v14+ installed
- [ ] PostgreSQL v12+ installed
- [ ] PM2 installed globally
- [ ] Ports available: 3020, 3090, 6120, 6123

## Files Included in This Backup
### Core Monitoring System ✅
- [x] STTTTSserver.js
- [x] MonitoringStationsBootstrap.js
- [x] DatabaseBridge.js (trace creation verified)
- [x] MetricsEmitter.js
- [x] AudioWriter.js & AudioRecorder.js
- [x] Station handlers (3333 & 4444)
- [x] BucketScheduler.js

### AI Optimizer Service ✅
- [x] server.cjs (main AI service)
- [x] server-openai.cjs
- [x] .env (contains OpenAI key)
- [x] package-lock.json

### Configuration ✅
- [x] monitoring.config.json
- [x] PM2 configs
- [x] Database schema

### PM2 Services Status ✅
All 9 services backed up:
1. STTTTSserver - Main monitoring
2. ai-optimizer - AI service (at /home/azureuser/ai-service)
3. gateway-3333
4. gateway-4444
5. ari-handler
6. bucket-scheduler
7. database-api-server
8. optimizer-agent
9. proxy-dashboard

## Deployment Steps
1. Extract this backup on new server
2. Run: `bash scripts/deploy_on_new_server.sh`
3. Configure API keys in .env files
4. Start services: `pm2 start all`
5. Verify: `pm2 list` and `curl http://localhost:3020/health`

## Critical Verifications
- [ ] DatabaseBridge.js has trace creation at lines 83 & 149
- [ ] OpenAI API key configured in ai-service/.env
- [ ] All 9 PM2 processes running
- [ ] Database has 7 tables
- [ ] Port 3020 responding
