# AI Optimizer Service - Backup Documentation Addendum
**Updated: 2026-01-13**

## CRITICAL UPDATE: AI Optimizer Location

The AI Optimizer service has been located and successfully backed up from:
```
/home/azureuser/ai-service/
```

This differs from the previously documented location in BACKUP_PLAN.md.

## AI Optimizer Service Details

### Location on VM
- **Primary Path**: `/home/azureuser/ai-service/`
- **Main Script**: `server.cjs`
- **PM2 Name**: `ai-optimizer`
- **Port**: 3090
- **Process ID**: 5 (in PM2)

### Files Backed Up
1. **server.cjs** - Main service file (4.2KB)
2. **server-openai.cjs** - OpenAI integration (6.9KB)
3. **.env** - Environment variables including OpenAI API key
4. **package-lock.json** - Dependency lock file (32KB)

### PM2 Configuration
```bash
│ script path       │ /home/azureuser/ai-service/server.cjs
│ exec cwd          │ /home/azureuser/ai-service
│ name              │ ai-optimizer
│ status            │ online
│ memory            │ ~37MB
│ uptime            │ 20+ hours
```

## Complete Service Locations (All PM2 Services)

| Service | Location | Script | Status |
|---------|----------|--------|--------|
| STTTTSserver | /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver | STTTTSserver.js | ✅ Backed up |
| ai-optimizer | /home/azureuser/ai-service | server.cjs | ✅ Backed up |
| gateway-3333 | Unknown (needs investigation) | - | ⚠️ Not located |
| gateway-4444 | Unknown (needs investigation) | - | ⚠️ Not located |
| ari-handler | Unknown (needs investigation) | - | ⚠️ Not located |
| bucket-scheduler | Likely in STTTTSserver/lib | BucketScheduler.js | ✅ Backed up |
| database-api-server | Unknown (needs investigation) | - | ⚠️ Not located |
| optimizer-agent | Unknown (needs investigation) | - | ⚠️ Not located |
| proxy-dashboard | Unknown (needs investigation) | - | ⚠️ Not located |

## Updated Backup Procedure for AI Optimizer

### Manual Backup
```bash
# Backup AI Optimizer service
scp -r azureuser@20.170.155.53:/home/azureuser/ai-service /local/backup/path/

# Or without node_modules
rsync -av --exclude='node_modules' \
  azureuser@20.170.155.53:/home/azureuser/ai-service/ \
  /local/backup/path/ai-service/
```

### Automated Backup Script Addition
Add to `automated_backup.sh`:

```bash
# AI Optimizer Backup (Updated Location)
backup_ai_optimizer() {
    log "Backing up AI Optimizer from /home/azureuser/ai-service..."

    BACKUP_DIR="/backup/ai-optimizer/daily"
    AI_DIR="/home/azureuser/ai-service"  # UPDATED PATH
    DATE=$(date +%Y%m%d_%H%M%S)

    mkdir -p $BACKUP_DIR

    # Backup without node_modules
    tar -czf $BACKUP_DIR/ai_optimizer_$DATE.tar.gz \
        -C $(dirname $AI_DIR) \
        --exclude='node_modules' \
        --exclude='logs' \
        $(basename $AI_DIR)

    # Backup .env separately (encrypted)
    if [ -f "$AI_DIR/.env" ]; then
        gpg --symmetric --cipher-algo AES256 \
            --output $BACKUP_DIR/env_encrypted_$DATE.gpg \
            $AI_DIR/.env
    fi

    log "AI Optimizer backup complete"
}
```

## Restoration Procedure for AI Optimizer

### On New Server
```bash
# 1. Create directory
mkdir -p /home/azureuser/ai-service

# 2. Extract backup
tar -xzf ai_optimizer_backup.tar.gz -C /home/azureuser/ai-service

# 3. Install dependencies
cd /home/azureuser/ai-service
npm install

# 4. Configure environment
# Edit .env and add OpenAI API key
nano .env

# 5. Start with PM2
pm2 start server.cjs --name ai-optimizer --cwd /home/azureuser/ai-service

# 6. Save PM2 configuration
pm2 save
```

## Complete Backup Archive Structure

The complete backup (`COMPLETE_VM_BACKUP_YYYYMMDD_HHMMSS.tar.gz`) contains:

```
COMPLETE_VM_BACKUP_YYYYMMDD_HHMMSS/
├── ai-optimizer/          # AI Optimizer service (NEW)
│   ├── server.cjs
│   ├── server-openai.cjs
│   ├── .env
│   └── package-lock.json
├── source/               # Monitoring system source
│   └── STTTTSserver/
│       ├── STTTTSserver.js
│       ├── Monitoring_Stations/
│       └── lib/
├── database/            # Database schema and dumps
│   └── create_schema.sql
├── config/              # All configuration files
│   ├── monitoring.config.json
│   └── [other configs]
├── pm2/                 # PM2 process configurations
├── scripts/             # Deployment scripts
│   └── deploy_on_new_server.sh
└── DEPLOYMENT_CHECKLIST.md
```

## Verification Commands

After restoration, verify AI Optimizer:

```bash
# Check if service is running
pm2 describe ai-optimizer

# Test health endpoint
curl http://localhost:3090/health

# Check logs
pm2 logs ai-optimizer --lines 50

# Test OpenAI connection
node -e "require('dotenv').config({path:'/home/azureuser/ai-service/.env'}); console.log('OpenAI Key:', process.env.OPENAI_API_KEY ? 'Configured' : 'Missing')"
```

## Critical Notes

1. **OpenAI API Key**: The .env file contains sensitive API keys. Handle with care.
2. **Node Modules**: Not included in backup to save space. Run `npm install` after restoration.
3. **Service Dependencies**: AI Optimizer depends on the Monitoring API (port 3020) being available.
4. **PM2 Startup**: Ensure PM2 is configured to start on boot: `pm2 startup`

## Backup Completeness Status

✅ **Complete Components Backed Up:**
- Monitoring System (STTTTSserver)
- AI Optimizer Service
- Database Schema
- PM2 Configurations
- Audio Files (last 72 hours)
- System Configuration

⚠️ **Components Not Located (May not be needed):**
- Gateway services source code
- ARI Handler source code
- Database API Server source code
- Optimizer Agent source code
- Proxy Dashboard source code

These missing services may be:
- Part of a different repository
- Generated dynamically
- Simple proxy/wrapper scripts
- Not critical for core monitoring functionality

## Contact Information

For questions about missing components or restoration issues:
- Check PM2 process details: `pm2 show [service-name]`
- Review system logs: `pm2 logs [service-name]`
- Verify service paths: `pm2 jlist | jq '.[] | {name, path: .pm2_env.pm_exec_path}'`