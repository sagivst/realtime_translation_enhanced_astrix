# Complete Monitoring System Installation Guide

## System Overview
This guide covers the installation of a comprehensive monitoring system for the real-time translation application, including 23 monitored components across 7 architectural layers.

## Prerequisites

### 1. System Requirements
- Ubuntu/Debian Linux (tested on Azure VM)
- Node.js v16+ and npm
- PM2 Process Manager
- PostgreSQL 15+
- Asterisk PBX (if using telephony features)
- Minimum 4GB RAM, 2 CPU cores

### 2. Required Software Installation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Cloudflared
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

## Directory Structure

```
/home/azureuser/
├── translation-app/
│   ├── database-api-server.js
│   ├── monitoring-server.js
│   ├── monitoring-to-database-bridge.js
│   ├── continuous-full-monitoring-with-station3.js
│   └── 3333_4444__Operational/
│       ├── gateway-3333.js
│       ├── gateway-4444.js
│       ├── ari-gstreamer-operational.js
│       └── STTTTSserver/
│           ├── STTTTSserver.js
│           ├── station3-handler.js
│           ├── station9-handler.js
│           ├── monitoring/
│           │   └── StationAgent.js
│           └── audio-streaming-direct.js
└── .cloudflared/
    └── (tunnel credentials)
```

## Component Installation

### 1. Core Services Files

#### database-api-server.js
**Location:** `/home/azureuser/translation-app/database-api-server.js`
**Port:** 8083
**Purpose:** Central API gateway for monitoring data

Key configuration:
```javascript
const PORT = 8083;
const monitoredComponents = [
    // 23 components configuration
    // See full list in documentation
];
```

#### monitoring-server.js
**Location:** `/home/azureuser/translation-app/monitoring-server.js`
**Port:** 8090
**Purpose:** The optimization engine for monitoring

#### monitoring-to-database-bridge.js
**Location:** `/home/azureuser/translation-app/monitoring-to-database-bridge.js`
**Port:** 3001
**Purpose:** Connects DB, monitoring server & API

### 2. STTTTSserver and Handlers

#### STTTTSserver.js
**Location:** `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js`
**Port:** 8080
**Critical Notes:**
- MUST be started from its own directory
- Contains station handlers as modules
- Manages UDP sockets on ports 6120-6123

### 3. Gateway Services

#### gateway-3333.js
**Location:** `/home/azureuser/translation-app/3333_4444__Operational/gateway-3333.js`
**Port:** 7777

#### gateway-4444.js
**Location:** `/home/azureuser/translation-app/3333_4444__Operational/gateway-4444.js`
**Port:** 8888

### 4. ARI-GStreamer

#### ari-gstreamer-operational.js
**Location:** `/home/azureuser/translation-app/3333_4444__Operational/ari-gstreamer-operational.js`
**Port:** 8089

### 5. Continuous Monitoring

#### continuous-full-monitoring-with-station3.js
**Location:** `/home/azureuser/translation-app/continuous-full-monitoring-with-station3.js`
**Port:** 9090

## PM2 Setup and Service Management

### 1. Initialize PM2

```bash
# Start PM2 and configure to start on boot
pm2 startup systemd
# Follow the command output to enable startup
```

### 2. Start All Services with PM2

```bash
# IMPORTANT: Execute these commands in order

# 1. Start monitoring infrastructure (critical services first)
pm2 start /home/azureuser/translation-app/database-api-server.js --name database-api-server
pm2 start /home/azureuser/translation-app/monitoring-server.js --name monitoring-server
pm2 start /home/azureuser/translation-app/monitoring-to-database-bridge.js --name monitoring-bridge

# 2. Start STTTTSserver (MUST cd to its directory first)
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
pm2 start STTTTSserver.js --name STTTTSserver
cd ~

# 3. Start gateway services
pm2 start /home/azureuser/translation-app/3333_4444__Operational/gateway-3333.js --name gateway-3333
pm2 start /home/azureuser/translation-app/3333_4444__Operational/gateway-4444.js --name gateway-4444

# 4. Start ARI-GStreamer
pm2 start /home/azureuser/translation-app/3333_4444__Operational/ari-gstreamer-operational.js --name ari-gstreamer

# 5. Start continuous monitoring
pm2 start /home/azureuser/translation-app/continuous-full-monitoring-with-station3.js --name continuous-monitoring

# 6. Save PM2 configuration
pm2 save
```

### 3. PM2 Management Commands

```bash
# View all services status
pm2 status

# View logs for specific service
pm2 logs [service-name]

# Restart a service
pm2 restart [service-name]

# Stop a service
pm2 stop [service-name]

# Monitor all services (real-time dashboard)
pm2 monit

# View detailed info about a service
pm2 describe [service-name]
```

## Cloudflare Tunnel Setup

### 1. Using Permanent Tunnel (Recommended)

```bash
# Create .cloudflared directory
mkdir -p ~/.cloudflared

# Start tunnel with token (replace with your token)
pm2 start cloudflared --name cloudflared-perm -- tunnel run --token YOUR_TUNNEL_TOKEN
```

### 2. Alternative: Temporary Tunnel

Create `/home/azureuser/cloudflared-permanent.js`:

```javascript
const { spawn } = require('child_process');
const fs = require('fs');

console.log('[Cloudflared] Starting permanent tunnel service...');

const CLOUDFLARED_BIN = '/usr/local/bin/cloudflared';
const TUNNEL_URL_FILE = '/home/azureuser/current-tunnel-url.txt';
const LOG_FILE = '/tmp/cloudflared-permanent.log';

function startTunnel() {
    console.log('[Cloudflared] Initiating new tunnel...');

    const cloudflared = spawn(CLOUDFLARED_BIN, [
        'tunnel',
        '--url', 'http://localhost:8083',
        '--no-autoupdate'
    ], {
        stdio: ['ignore', 'pipe', 'pipe']
    });

    cloudflared.stdout.on('data', (data) => {
        const output = data.toString();
        const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (urlMatch) {
            const tunnelUrl = urlMatch[0];
            console.log(`[Cloudflared] Tunnel established: ${tunnelUrl}`);
            fs.writeFileSync(TUNNEL_URL_FILE, tunnelUrl);
        }
    });

    cloudflared.on('exit', (code) => {
        console.log(`[Cloudflared] Process exited with code ${code}, restarting...`);
        setTimeout(startTunnel, 5000);
    });
}

startTunnel();
```

Then start with PM2:
```bash
pm2 start /home/azureuser/cloudflared-permanent.js --name cloudflared-tunnel
```

## Port Configuration

Ensure these ports are available:

| Port  | Service                          | Protocol |
|-------|----------------------------------|----------|
| 8083  | database-api-server              | HTTP     |
| 8090  | monitoring-server                | HTTP     |
| 8080  | STTTTSserver                     | HTTP     |
| 3001  | monitoring-bridge                | HTTP     |
| 7777  | gateway-3333                     | WebSocket|
| 8888  | gateway-4444                     | WebSocket|
| 8089  | ari-gstreamer                    | HTTP     |
| 8088  | Asterisk ARI                     | HTTP     |
| 5038  | Asterisk AMI                     | TCP      |
| 5060  | Asterisk SIP                     | UDP      |
| 6120  | UDP Socket 3333 In               | UDP      |
| 6121  | UDP Socket 4444 In               | UDP      |
| 6122  | UDP Socket 3333 Out              | UDP      |
| 6123  | UDP Socket 4444 Out              | UDP      |
| 9090  | continuous-monitoring            | HTTP     |
| 5432  | PostgreSQL                       | TCP      |

## Database Setup (PostgreSQL)

```sql
-- Create database
CREATE DATABASE audio_optimization_db;

-- Create user
CREATE USER monitoringuser WITH PASSWORD 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE audio_optimization_db TO monitoringuser;
```

## Verification Steps

### 1. Check PM2 Status
```bash
pm2 status
# All 9 services should show "online"
```

### 2. Verify Local API
```bash
# Test database API server
curl http://localhost:8083/api/health/system

# Test monitoring server
curl http://localhost:8090/health
```

### 3. Verify Tunnel Access
```bash
# For permanent tunnel
curl https://tun.monitoringavailable.uk/api/health/system

# For temporary tunnel (check URL file first)
cat /home/azureuser/current-tunnel-url.txt
curl $(cat /home/azureuser/current-tunnel-url.txt)/api/health/system
```

### 4. Check Component Health
```bash
# Get detailed component status
curl https://tun.monitoringavailable.uk/api/health/system | jq '.'

# Check snapshots
curl https://tun.monitoringavailable.uk/api/snapshots | jq '.'
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Service Won't Start
```bash
# Check logs
pm2 logs [service-name] --lines 100

# Check port availability
sudo lsof -i:[port-number]
```

#### 2. STTTTSserver Issues
```bash
# Must start from correct directory
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
pm2 delete STTTTSserver
pm2 start STTTTSserver.js --name STTTTSserver
```

#### 3. Cloudflare Tunnel Issues
```bash
# Check tunnel status
pm2 logs cloudflared-perm --lines 50

# Restart tunnel
pm2 restart cloudflared-perm
```

#### 4. Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U monitoringuser -d audio_optimization_db
```

## System Recovery Procedure

If system crashes or needs full restart:

```bash
# 1. Stop all PM2 processes
pm2 stop all

# 2. Clear PM2 logs
pm2 flush

# 3. Delete all PM2 processes
pm2 delete all

# 4. Restart following the installation order above
# (database-api-server first, then monitoring-server, etc.)

# 5. Save PM2 configuration
pm2 save

# 6. Verify all services
pm2 status
```

## Monitoring Best Practices

1. **Regular Health Checks**: Set up cron job to check API health
2. **Log Rotation**: Configure PM2 log rotation
   ```bash
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 10M
   pm2 set pm2-logrotate:retain 7
   ```

3. **Resource Monitoring**: Use PM2 monitoring
   ```bash
   pm2 monit
   ```

4. **Backup PM2 Configuration**
   ```bash
   pm2 save
   pm2 dump > ~/pm2-backup.json
   ```

## Security Considerations

1. **Firewall Configuration**: Only expose necessary ports
2. **HTTPS Only**: Always use Cloudflare tunnel for external access
3. **Authentication**: Implement API key authentication for production
4. **Regular Updates**: Keep Node.js, PM2, and dependencies updated

## Support and Documentation

- Full system documentation: `/Docs/sys/monitoring/System-Components-Monitoring-Reverse-Engineering.md`
- Component count verification: 23 total components
- Layers: monitoring, core, gateways, telephony, transport, database, external

## Quick Reference - PM2 Service Names

| PM2 ID | Service Name           | Critical |
|--------|------------------------|----------|
| 0      | monitoring-server      | Yes      |
| 1      | database-api-server    | Yes      |
| 2      | monitoring-bridge      | No       |
| 3      | STTTTSserver          | Yes      |
| 4      | gateway-3333          | Yes      |
| 5      | gateway-4444          | Yes      |
| 6      | ari-gstreamer         | Yes      |
| 7      | continuous-monitoring  | No       |
| 8/9+   | cloudflared-perm      | No       |

---
Installation Guide Version 1.0 - December 2025