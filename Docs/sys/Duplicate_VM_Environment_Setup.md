# Staging Environment - VM Clone Documentation

**Date**: 2025-10-27
**Purpose**: Complete staging replica of production VM for safe testing

---

## Overview

Created a complete Azure VM clone of the production development environment to enable safe testing without touching production.

**Critical Rule**: ⛔ **NEVER TOUCH THE PRODUCTION SERVER** (68.219.227.189)

---

## Azure Resources Created

### 1. Snapshot
- **Name**: `asterisk-ari-dev-snapshot-20251027`
- **Source**: Production VM `asterisk-ari-dev-vm` (68.219.227.189)
- **Size**: 30 GB
- **Type**: Full disk snapshot
- **Status**: ✅ Succeeded
- **Created**: 2025-10-27
- **Impact on Production**: None (snapshot is non-disruptive)

**Azure Command Used**:
```bash
az snapshot create \
  --resource-group realtime-translation-rg \
  --name asterisk-ari-dev-snapshot-20251027 \
  --source "/subscriptions/.../asterisk-ari-dev-vm_disk1_..." \
  --location northeurope
```

### 2. Managed Disk
- **Name**: `asterisk-ari-staging-disk`
- **Source**: Snapshot `asterisk-ari-dev-snapshot-20251027`
- **Size**: 30 GB
- **SKU**: Standard_LRS (Standard Locally Redundant Storage)
- **Location**: North Europe
- **Status**: ✅ Succeeded

**Azure Command Used**:
```bash
az disk create \
  --resource-group realtime-translation-rg \
  --name asterisk-ari-staging-disk \
  --source asterisk-ari-dev-snapshot-20251027 \
  --location northeurope \
  --sku Standard_LRS
```

### 3. Virtual Machine (Staging)
- **Name**: `asterisk-ari-staging-vm`
- **Public IP**: **52.236.125.17** 🔑
- **Private IP**: 10.0.0.5
- **VM Size**: Standard_B2s
  - **CPU**: 2 vCPUs (burstable)
  - **RAM**: 4 GB
  - **Storage**: 30 GB (SSD)
- **OS**: Ubuntu 22.04 LTS (Jammy)
- **Kernel**: Linux 6.8.0-1041-azure
- **Region**: North Europe
- **Status**: ✅ Running

**Azure Command Used**:
```bash
az vm create \
  --resource-group realtime-translation-rg \
  --name asterisk-ari-staging-vm \
  --attach-os-disk asterisk-ari-staging-disk \
  --os-type Linux \
  --size Standard_B2s \
  --location northeurope \
  --public-ip-address asterisk-ari-staging-ip \
  --public-ip-address-allocation static
```

### 4. Network Security Group
- **Name**: `asterisk-ari-staging-nsg`
- **Rules**:

| Priority | Name | Port | Protocol | Purpose |
|----------|------|------|----------|---------|
| 100 | AllowSSH | 22 | TCP | SSH access |
| 110 | AllowHTTP | 3000 | TCP | Node.js HTTP server |
| 120 | AllowSIP | 5060 | UDP | SIP signaling |

**Security Rules Created**:
```bash
# SSH Access
az network nsg rule create \
  --resource-group realtime-translation-rg \
  --nsg-name asterisk-ari-staging-nsg \
  --name AllowSSH \
  --priority 100 \
  --source-address-prefixes '*' \
  --destination-port-ranges 22 \
  --protocol Tcp \
  --access Allow

# HTTP Server (Node.js on port 3000)
az network nsg rule create \
  --resource-group realtime-translation-rg \
  --nsg-name asterisk-ari-staging-nsg \
  --name AllowHTTP \
  --priority 110 \
  --source-address-prefixes '*' \
  --destination-port-ranges 3000 \
  --protocol Tcp \
  --access Allow

# SIP Signaling
az network nsg rule create \
  --resource-group realtime-translation-rg \
  --nsg-name asterisk-ari-staging-nsg \
  --name AllowSIP \
  --priority 120 \
  --source-address-prefixes '*' \
  --destination-port-ranges 5060 \
  --protocol Udp \
  --access Allow
```

---

## Environment Comparison

| Component | Production VM | Staging VM | Status |
|-----------|---------------|------------|--------|
| **Name** | asterisk-ari-dev-vm | asterisk-ari-staging-vm | ✅ Different |
| **Public IP** | 68.219.227.189 | 52.236.125.17 | ✅ Different |
| **Private IP** | 10.0.0.4 | 10.0.0.5 | ✅ Different |
| **Size** | Standard_B2s (2 vCPU, 4 GB) | Standard_B2s (2 vCPU, 4 GB) | ✅ Same |
| **OS** | Ubuntu 22.04 | Ubuntu 22.04 | ✅ Same |
| **Asterisk** | 18.10.0 | 18.10.0 | ✅ Same |
| **Node.js** | v20.19.5 | v20.19.5 | ✅ Same |
| **Disk** | 30 GB | 30 GB | ✅ Same |
| **Files** | All present | All present | ✅ Same |

---

## Software Configuration (Staging VM)

### Asterisk PBX
- **Version**: 18.10.0~dfsg+~cs6.10.40431411-2
- **Status**: ✅ Running
- **ARI Enabled**: Yes (port 8088)
- **ARI User**: `asterisk`
- **ARI Password**: `asterisk_ari_password`

**Dialplan Configuration**:
```ini
; Extension 7003 - Test Translation (Stasis)
[from-sip]
exten => 7003,1,NoOp(Test Translation Extension 7003 - ARI+ExternalMedia)
exten => 7003,n,Answer()
exten => 7003,n,Stasis(translation-7003)
exten => 7003,n,Hangup()

; AudioSocket Context for Snoop Channel
[audiosocket-7003-fixed]
exten => s,1,NoOp(=== AudioSocket for Extension 7003 (FIXED) ===)
 same => n,Answer()
 same => n,AudioSocket(40325ec2-5efd-4bd3-805f-53576e581d13,127.0.0.1:5050)
 same => n,Hangup()
```

### Node.js Servers
**Location**: `/home/azureuser/translation-app/`

**Key Files**:
- `ari-audiosocket-server.js` (14 KB) - AudioSocket server for Extension 7003
- `conference-server.js` (40 KB) - Main conference server with Socket.IO
- `config.json` (823 bytes) - Configuration for extensions and audio parameters
- `.env` (734 bytes) - Environment variables

**Audio Configuration** (config.json):
```json
{
  "asterisk": {
    "host": "localhost",
    "port": 8088,
    "username": "asterisk",
    "password": "asterisk_ari_password"
  },
  "extensions": [
    {
      "number": "7000",
      "app": "translation-7000",
      "language": "en",
      "targetLanguage": "es",
      "enabled": true
    },
    {
      "number": "7001",
      "app": "translation-7001",
      "language": "es",
      "targetLanguage": "en",
      "enabled": true
    },
    {
      "number": "7003",
      "app": "translation-7003",
      "language": "en",
      "targetLanguage": "es",
      "enabled": true,
      "description": "Test Extension (ARI+ExternalMedia)"
    }
  ],
  "audio": {
    "sampleRate": 16000,
    "channels": 1,
    "frameSize": 640
  }
}
```

---

## Access Information

### SSH Access
```bash
ssh azureuser@52.236.125.17
```

**SSH Key**: Use the same SSH key as production VM

### Web Access
```
http://52.236.125.17:3000/monitoring-7003.html
http://52.236.125.17:3000/dashboard.html
```

### Asterisk CLI
```bash
ssh azureuser@52.236.125.17
sudo asterisk -rvvv
```

---

## Testing Workflow

### 1. Start Services on Staging
```bash
# SSH to staging
ssh azureuser@52.236.125.17

# Navigate to app directory
cd /home/azureuser/translation-app

# Start AudioSocket server
node ari-audiosocket-server.js > audiosocket-server.log 2>&1 &

# Or start conference server
node conference-server.js > conference-server.log 2>&1 &
```

### 2. Monitor Logs
```bash
# Watch AudioSocket server logs
tail -f /home/azureuser/translation-app/audiosocket-server.log

# Watch conference server logs
tail -f /home/azureuser/translation-app/conference-server.log

# Watch Asterisk logs
sudo tail -f /var/log/asterisk/full
```

### 3. Test SIP Extension 7003
**From SIP phone**:
```
Dial: 7003@52.236.125.17
```

**Expected behavior**:
1. Call enters Stasis app `translation-7003`
2. ARI answers the call
3. Snoop channel created
4. AudioSocket streams audio to Node.js server
5. Monitoring page displays real-time audio data

### 4. Verify Monitoring Page
Open browser:
```
http://52.236.125.17:3000/monitoring-7003.html
```

**Expected output**:
- Connection status: Connected
- Channel events
- Audio packet counts
- Latency metrics

---

## Deployment Process to Production

Once testing is successful on staging:

### 1. Backup Production First
```bash
# Create backup of production files
ssh azureuser@68.219.227.189 "cd /home/azureuser/translation-app && tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz *.js config.json .env"
```

### 2. Deploy from Staging to Production
```bash
# Copy tested files from staging to production
scp azureuser@52.236.125.17:/home/azureuser/translation-app/ari-audiosocket-server.js \
    azureuser@68.219.227.189:/home/azureuser/translation-app/

# Restart production services
ssh azureuser@68.219.227.189 "killall -9 node ; cd /home/azureuser/translation-app && nohup node ari-audiosocket-server.js > audiosocket-server.log 2>&1 &"
```

### 3. Verify Production
```bash
# Check production logs
ssh azureuser@68.219.227.189 "tail -f /home/azureuser/translation-app/audiosocket-server.log"
```

---

## Cleanup Tasks

### Optional: Clean Up Temporary Staging Directory on Production
**Context**: A `/home/azureuser/staging/` directory was initially created on production VM (68.219.227.189) before switching to the VM clone approach. This directory is **NOT needed** and can be removed.

```bash
# Connect to production (READ-ONLY - just to check)
ssh azureuser@68.219.227.189 "ls -la /home/azureuser/staging/ 2>/dev/null || echo 'Directory does not exist'"

# If it exists and you want to remove it (OPTIONAL)
ssh azureuser@68.219.227.189 "rm -rf /home/azureuser/staging/"
```

**Status**: ⏳ Pending user decision

---

## Cost Information

### Snapshot Cost
- **Size**: 30 GB
- **Cost**: ~$1.50/month (Standard snapshot pricing)
- **Retention**: Can be deleted after staging VM is no longer needed

### Staging VM Cost
- **VM**: Standard_B2s (~$30-40/month)
- **Disk**: 30 GB Standard SSD (~$2.30/month)
- **Public IP**: Static (~$3.00/month)
- **Total**: ~$35-45/month

**Cost Optimization**:
- Deallocate VM when not testing: `az vm deallocate --resource-group realtime-translation-rg --name asterisk-ari-staging-vm`
- Delete snapshot after VM is created (saves $1.50/month)
- Delete entire staging environment when testing complete

---

## VM Lifecycle Commands

### Stop Staging VM (saves compute cost)
```bash
az vm deallocate --resource-group realtime-translation-rg --name asterisk-ari-staging-vm
```

### Start Staging VM
```bash
az vm start --resource-group realtime-translation-rg --name asterisk-ari-staging-vm
```

### Delete Staging VM (when no longer needed)
```bash
# Delete VM (keeps disk and snapshot)
az vm delete --resource-group realtime-translation-rg --name asterisk-ari-staging-vm --yes

# Delete disk
az disk delete --resource-group realtime-translation-rg --name asterisk-ari-staging-disk --yes

# Delete snapshot
az snapshot delete --resource-group realtime-translation-rg --name asterisk-ari-dev-snapshot-20251027 --yes
```

---

## Troubleshooting

### Cannot SSH to Staging VM
```bash
# Check VM status
az vm get-instance-view --resource-group realtime-translation-rg --name asterisk-ari-staging-vm --query instanceView.statuses

# Check NSG rules
az network nsg rule list --resource-group realtime-translation-rg --nsg-name asterisk-ari-staging-nsg --output table
```

### Services Not Starting
```bash
# Check Asterisk status
ssh azureuser@52.236.125.17 "sudo systemctl status asterisk"

# Check if ports are listening
ssh azureuser@52.236.125.17 "sudo netstat -tulpn | grep -E '(3000|5060|8088|5050)'"
```

### Files Missing
```bash
# Verify all files present
ssh azureuser@52.236.125.17 "cd /home/azureuser/translation-app && ls -la *.js config.json .env"
```

---

## Summary

✅ **COMPLETE**:
- Snapshot of production VM created
- New managed disk created from snapshot
- Staging VM created with separate IP
- Network security rules configured
- SSH access verified
- All production files confirmed present
- Asterisk and Node.js verified working

⏳ **PENDING**:
- User decision on removing `/home/azureuser/staging/` directory from production VM (optional cleanup)

🎯 **READY FOR TESTING**:
The staging environment is a perfect clone of production and is ready for testing without any risk to the production system.

**Remember**: ⛔ **NEVER TOUCH PRODUCTION VM (68.219.227.189)** - always test on staging first!
