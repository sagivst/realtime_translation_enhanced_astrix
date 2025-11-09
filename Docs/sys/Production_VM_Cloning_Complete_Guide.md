# Production VM Cloning - Complete Guide
**Complete Step-by-Step Process from Snapshot to Running System**

**Date**: 2025-10-28
**Author**: Claude Code
**Purpose**: Clone production Azure VM to create fully functional development/staging environment

---

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Identify Source VM](#step-1-identify-source-vm)
4. [Step 2: Create Snapshot](#step-2-create-snapshot)
5. [Step 3: Create Managed Disk from Snapshot](#step-3-create-managed-disk-from-snapshot)
6. [Step 4: Create New VM from Disk](#step-4-create-new-vm-from-disk)
7. [Step 5: Configure Network Security Group](#step-5-configure-network-security-group)
8. [Step 6: Update Environment-Specific Configuration](#step-6-update-environment-specific-configuration)
9. [Step 7: Restart Services](#step-7-restart-services)
10. [Step 8: Verification](#step-8-verification)
11. [Troubleshooting](#troubleshooting)
12. [Cleanup](#cleanup)

---

## Overview

This guide documents the complete process for cloning an Azure VM running Asterisk PBX and Node.js conference server. The process creates a 100% identical copy including:
- Operating system and kernel version
- All installed software (Asterisk, Node.js, npm packages)
- All configuration files
- All application code

**Critical Success Factors**:
1. ✅ Snapshot-based cloning (non-disruptive to production)
2. ✅ Network configuration (NSG rules for all required ports)
3. ✅ Environment-specific settings (external IP addresses)
4. ✅ Service restart to apply changes

---

## Prerequisites

### Azure CLI Installed and Authenticated
```bash
# Verify Azure CLI
az --version

# Login if needed
az login

# Verify subscription
az account show
```

### Required Information
- Resource Group Name: `realtime-translation-rg`
- Production VM Name: Example: `asterisk-translation-vm`
- Production VM IP: Example: `4.185.84.26`
- Desired Clone VM Name: Example: `asterisk-dev-vm-clone`
- Region: Example: `northeurope`

### Required Permissions
- Contributor or higher role on the resource group
- Permission to manage VMs, disks, snapshots, and network resources

---

## Step 1: Identify Source VM

### 1.1 List All VMs in Resource Group
```bash
az vm list \
  --resource-group realtime-translation-rg \
  --output table
```

**Expected Output**:
```
Name                        ResourceGroup              Location      Zones
--------------------------  -------------------------  ------------  -------
asterisk-translation-vm     realtime-translation-rg    northeurope
```

### 1.2 Get Production VM Details
```bash
az vm show \
  --resource-group realtime-translation-rg \
  --name asterisk-translation-vm \
  --output json | grep -E '"name"|"location"|"vmId"|"osDisk"' | head -20
```

### 1.3 Identify OS Disk ID
```bash
az vm show \
  --resource-group realtime-translation-rg \
  --name asterisk-translation-vm \
  --query "storageProfile.osDisk.managedDisk.id" \
  --output tsv
```

**Example Output**:
```
/subscriptions/bac843ba-7138-48f5-a52c-ba55718512df/resourceGroups/realtime-translation-rg/providers/Microsoft.Compute/disks/asterisk-translation-vm_disk1_098dedc63a9947a3ac210ffe97eaa258
```

**Save this disk ID** - you'll need it in the next step.

---

## Step 2: Create Snapshot

### 2.1 Create Snapshot from Production OS Disk
```bash
az snapshot create \
  --resource-group realtime-translation-rg \
  --name asterisk-translation-snapshot-$(date +%Y%m%d) \
  --source "/subscriptions/bac843ba-7138-48f5-a52c-ba55718512df/resourceGroups/realtime-translation-rg/providers/Microsoft.Compute/disks/asterisk-translation-vm_disk1_098dedc63a9947a3ac210ffe97eaa258" \
  --location northeurope
```

**Replace**:
- `--source` value with your actual OS disk ID from Step 1.3
- Date will be auto-generated (example: `20251028`)

**Expected Output**:
```json
{
  "creationData": {
    "createOption": "Copy",
    "sourceResourceId": "/subscriptions/.../asterisk-translation-vm_disk1_..."
  },
  "diskSizeGb": 30,
  "location": "northeurope",
  "name": "asterisk-translation-snapshot-20251028",
  "provisioningState": "Succeeded",
  "timeCreated": "2025-10-28T15:45:00.000000+00:00"
}
```

### 2.2 Verify Snapshot Created
```bash
az snapshot show \
  --resource-group realtime-translation-rg \
  --name asterisk-translation-snapshot-20251028 \
  --output table
```

**Expected**: `provisioningState: Succeeded`

**Impact on Production**: ✅ **NONE** - Snapshots are non-disruptive

---

## Step 3: Create Managed Disk from Snapshot

### 3.1 Create New Managed Disk
```bash
az disk create \
  --resource-group realtime-translation-rg \
  --name asterisk-dev-disk-clone \
  --source asterisk-translation-snapshot-20251028 \
  --location northeurope \
  --sku Standard_LRS \
  --hyper-v-generation V2 \
  --security-type TrustedLaunch \
  --os-type Linux
```

**Important Parameters**:
- `--hyper-v-generation V2`: Must match source VM
- `--security-type TrustedLaunch`: Must match source VM
- `--sku Standard_LRS`: Standard SSD (can use Premium_LRS for better performance)

**Expected Output**:
```json
{
  "creationData": {
    "createOption": "Copy",
    "sourceResourceId": "/subscriptions/.../asterisk-translation-snapshot-20251028"
  },
  "diskSizeGb": 30,
  "location": "northeurope",
  "name": "asterisk-dev-disk-clone",
  "provisioningState": "Succeeded",
  "sku": {
    "name": "Standard_LRS",
    "tier": "Standard"
  }
}
```

### 3.2 Verify Disk Created
```bash
az disk show \
  --resource-group realtime-translation-rg \
  --name asterisk-dev-disk-clone \
  --query "{Name:name, Size:diskSizeGb, State:provisioningState, SKU:sku.name}" \
  --output table
```

---

## Step 4: Create New VM from Disk

### 4.1 Create VM Attached to Cloned Disk
```bash
az vm create \
  --resource-group realtime-translation-rg \
  --name asterisk-dev-vm-clone \
  --attach-os-disk asterisk-dev-disk-clone \
  --os-type Linux \
  --size Standard_B2s \
  --location northeurope \
  --public-ip-address asterisk-dev-clone-ip \
  --public-ip-address-allocation static \
  --public-ip-sku Standard \
  --security-type TrustedLaunch \
  --enable-secure-boot true \
  --enable-vtpm true
```

**VM Size Options**:
- `Standard_B2s`: 2 vCPU, 4GB RAM (burstable) - Good for dev/test
- `Standard_B2ms`: 2 vCPU, 8GB RAM (burstable) - More RAM
- `Standard_D2s_v3`: 2 vCPU, 8GB RAM (standard) - Better performance

**Expected Output**:
```json
{
  "fqdns": "",
  "id": "/subscriptions/.../asterisk-dev-vm-clone",
  "location": "northeurope",
  "powerState": "VM running",
  "privateIpAddress": "10.0.0.X",
  "publicIpAddress": "20.170.155.53",
  "resourceGroup": "realtime-translation-rg"
}
```

**Save the Public IP Address** - you'll need it for all subsequent steps.

### 4.2 Verify VM Running
```bash
az vm show \
  --resource-group realtime-translation-rg \
  --name asterisk-dev-vm-clone \
  --show-details \
  --query "{Name:name, PowerState:powerState, PublicIP:publicIps, PrivateIP:privateIps}" \
  --output table
```

### 4.3 Test SSH Access
```bash
ssh azureuser@20.170.155.53
```

**Expected**: SSH connection successful using same key as production VM

---

## Step 5: Configure Network Security Group

The cloned VM needs specific ports open for:
- SSH (22) - Usually already configured
- HTTP (3000) - Node.js conference server
- SIP (5060) - Asterisk signaling
- RTP (10000-20000) - Audio media streams

### 5.1 Identify NSG Name
```bash
az vm show \
  --resource-group realtime-translation-rg \
  --name asterisk-dev-vm-clone \
  --query "networkProfile.networkInterfaces[0].id" \
  --output tsv
```

Extract NSG name from output (usually `<vm-name>NSG` without hyphen before NSG).

**Example**: `asterisk-dev-vm-cloneNSG`

### 5.2 Create HTTP Server Rule (Port 3000)
```bash
az network nsg rule create \
  --resource-group realtime-translation-rg \
  --nsg-name asterisk-dev-vm-cloneNSG \
  --name AllowHTTP \
  --priority 110 \
  --source-address-prefixes '*' \
  --destination-port-ranges 3000 \
  --protocol Tcp \
  --access Allow \
  --description "Allow HTTP server on port 3000"
```

### 5.3 Create SIP Signaling Rule (Port 5060 UDP)
```bash
az network nsg rule create \
  --resource-group realtime-translation-rg \
  --nsg-name asterisk-dev-vm-cloneNSG \
  --name AllowSIP \
  --priority 120 \
  --source-address-prefixes '*' \
  --destination-port-ranges 5060 \
  --protocol Udp \
  --access Allow \
  --description "Allow SIP signaling on UDP port 5060"
```

### 5.4 Create RTP Media Rule (Ports 10000-20000 UDP)
```bash
az network nsg rule create \
  --resource-group realtime-translation-rg \
  --nsg-name asterisk-dev-vm-cloneNSG \
  --name AllowRTP \
  --priority 130 \
  --source-address-prefixes '*' \
  --destination-port-ranges 10000-20000 \
  --protocol Udp \
  --access Allow \
  --description "Allow RTP media for Asterisk"
```

**Critical**: The RTP port range is essential for audio to work. Without it, SIP phones will register but have no audio.

### 5.5 Verify All NSG Rules
```bash
az network nsg rule list \
  --resource-group realtime-translation-rg \
  --nsg-name asterisk-dev-vm-cloneNSG \
  --output table
```

**Expected Rules**:
| Priority | Name      | Port       | Protocol | Access |
|----------|-----------|------------|----------|--------|
| 1000     | SSH       | 22         | TCP      | Allow  |
| 110      | AllowHTTP | 3000       | TCP      | Allow  |
| 120      | AllowSIP  | 5060       | UDP      | Allow  |
| 130      | AllowRTP  | 10000-20000| UDP      | Allow  |

---

## Step 6: Update Environment-Specific Configuration

**Critical Step**: The cloned VM has production IP addresses hardcoded in configuration files. These must be updated to the new VM's IP address.

### 6.1 SSH to New VM
```bash
ssh azureuser@20.170.155.53
```

### 6.2 Update Asterisk pjsip.conf
```bash
# Check current external IP settings
sudo grep 'external_' /etc/asterisk/pjsip.conf

# Update external_media_address
sudo sed -i 's/external_media_address=4.185.84.26/external_media_address=20.170.155.53/g' /etc/asterisk/pjsip.conf

# Update external_signaling_address
sudo sed -i 's/external_signaling_address=4.185.84.26/external_signaling_address=20.170.155.53/g' /etc/asterisk/pjsip.conf

# Verify changes
sudo grep 'external_' /etc/asterisk/pjsip.conf
```

**Expected Output**:
```ini
external_media_address=20.170.155.53
external_signaling_address=20.170.155.53
```

**Why This Matters**: Asterisk advertises these IP addresses in SDP (Session Description Protocol) for RTP media negotiation. If these point to the wrong IP, audio streams will fail.

### 6.3 Check if Any Other Configs Need Updates
```bash
# Search for old production IP in all configs
grep -r "4.185.84.26" /etc/asterisk/ 2>/dev/null
grep -r "4.185.84.26" /home/azureuser/translation-app/ 2>/dev/null
```

If found, update those files as well.

---

## Step 7: Restart Services

### 7.1 Restart Asterisk to Apply pjsip.conf Changes
```bash
sudo systemctl restart asterisk

# Wait for Asterisk to fully start
sleep 5

# Verify Asterisk is running
sudo systemctl status asterisk
```

**Expected**: `active (running)`

### 7.2 Verify Asterisk SIP Transport
```bash
sudo asterisk -rx 'pjsip show transports'
```

**Expected Output**:
```
Transport:  <TransportId........>  <Type>  <cos>  <tos>  <BindAddress....................>
==========================================================================================
Transport:  transport-udp             udp      0      0  0.0.0.0:5060

Objects found: 1
```

### 7.3 Verify Asterisk Endpoints
```bash
sudo asterisk -rx 'pjsip show endpoints'
```

**Expected**: List of configured SIP endpoints (1001, 1002, 1003, user1, user2, user3, etc.)

### 7.4 Restart Conference Server
```bash
# Kill any existing Node.js processes
killall -9 node 2>/dev/null

# Wait for processes to terminate
sleep 2

# Navigate to app directory
cd /home/azureuser/translation-app

# Start conference server in background
nohup node conference-server.js > conference-server.log 2>&1 &

# Wait for server to start
sleep 5

# Verify process is running
ps aux | grep 'node conference-server' | grep -v grep
```

**Expected Output**:
```
azureuser  2261  16.6  1.9 11605360 78472 ?  Sl  15:59  0:00 node conference-server.js
```

### 7.5 Check Conference Server Logs
```bash
tail -50 /home/azureuser/translation-app/conference-server.log
```

**Expected**: Server startup messages, no errors

---

## Step 8: Verification

### 8.1 Verify Asterisk Ports
```bash
ssh azureuser@20.170.155.53 "sudo ss -tulpn | grep asterisk"
```

**Expected Ports**:
```
udp   UNCONN  0.0.0.0:5060         (asterisk)  # SIP signaling
udp   UNCONN  0.0.0.0:10000-20000  (asterisk)  # RTP media (dynamic)
tcp   LISTEN  127.0.0.1:8088       (asterisk)  # ARI HTTP interface
```

### 8.2 Verify Conference Server Port
```bash
ssh azureuser@20.170.155.53 "ss -tulpn | grep :3000"
```

**Expected**:
```
tcp   LISTEN  0.0.0.0:3000    (node)
```

### 8.3 Test HTTP Access (from your local machine)
```bash
curl -I http://20.170.155.53:3000/dashboard.html
```

**Expected**:
```
HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8
Content-Length: XXXX
```

### 8.4 Verify Software Versions Match Production
```bash
ssh azureuser@20.170.155.53 "uname -r && node --version && sudo asterisk -V"
```

**Expected** (should match production exactly):
```
6.8.0-1041-azure
v20.19.5
Asterisk 18.10.0~dfsg+~cs6.10.40431411-2
```

### 8.5 Test SIP Registration

**Configure SIP Client** (Zoiper, Linphone, X-Lite, etc.):
```
Server: 20.170.155.53
Port: 5060
Transport: UDP
Username: 1001
Password: 1001pass
```

**Expected**: SIP phone registers successfully (shows "Registered" or green icon)

### 8.6 Test Audio Call

**From SIP phone, dial**: `7000`

**Expected Behavior**:
1. Call connects (ringing, then answered)
2. You hear audio prompt (beep or voice)
3. Dashboard shows active call: http://20.170.155.53:3000/dashboard.html
4. Audio frames appear in server logs

**Verify in logs**:
```bash
ssh azureuser@20.170.155.53 "tail -f /home/azureuser/translation-app/conference-server.log"
```

**Expected Log Output**:
```
[Pipeline] ✓ Handshake complete: <UUID> | Extension: 7000
[WebSocket] ✓ New connection: ws_tcp_<ID>
[TCP] Audio frames received: 1234
[QA Config] Updated: en → es
```

**If you see `audioFrames: 0`**, check:
- RTP ports (10000-20000) are open in NSG
- External IP addresses in pjsip.conf are correct
- Asterisk restarted after pjsip.conf changes

---

## Troubleshooting

### Issue 1: Cannot SSH to New VM

**Symptoms**: `Connection refused` or `Connection timed out`

**Check**:
```bash
# Verify VM is running
az vm get-instance-view \
  --resource-group realtime-translation-rg \
  --name asterisk-dev-vm-clone \
  --query instanceView.statuses

# Check NSG allows SSH (port 22)
az network nsg rule show \
  --resource-group realtime-translation-rg \
  --nsg-name asterisk-dev-vm-cloneNSG \
  --name default-allow-ssh
```

**Fix**: Add SSH rule if missing:
```bash
az network nsg rule create \
  --resource-group realtime-translation-rg \
  --nsg-name asterisk-dev-vm-cloneNSG \
  --name AllowSSH \
  --priority 100 \
  --destination-port-ranges 22 \
  --protocol Tcp \
  --access Allow
```

### Issue 2: SIP Phone Registers but No Audio

**Symptoms**: Call connects, dashboard shows connection, but `audioFrames: 0`

**Root Cause**: RTP ports not open or wrong external IP in pjsip.conf

**Check**:
```bash
# Verify RTP rule exists
az network nsg rule show \
  --resource-group realtime-translation-rg \
  --nsg-name asterisk-dev-vm-cloneNSG \
  --name AllowRTP

# Verify external IP in pjsip.conf
ssh azureuser@20.170.155.53 "sudo grep 'external_' /etc/asterisk/pjsip.conf"
```

**Fix**:
1. Add RTP rule (see Step 5.4)
2. Update pjsip.conf external IPs (see Step 6.2)
3. Restart Asterisk (see Step 7.1)

### Issue 3: Conference Server Not Starting

**Symptoms**: `ps aux | grep node` shows no process

**Check Logs**:
```bash
ssh azureuser@20.170.155.53 "cat /home/azureuser/translation-app/conference-server.log"
```

**Common Causes**:
- Port 3000 already in use
- Missing npm dependencies
- Syntax errors in JavaScript files

**Fix**:
```bash
# Kill all node processes
ssh azureuser@20.170.155.53 "killall -9 node"

# Check for port conflicts
ssh azureuser@20.170.155.53 "sudo ss -tulpn | grep :3000"

# Reinstall dependencies if needed
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app && npm install"

# Restart server
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app && nohup node conference-server.js > conference-server.log 2>&1 &"
```

### Issue 4: Dashboard Shows "Connection Lost"

**Symptoms**: http://20.170.155.53:3000/dashboard.html loads but shows disconnected

**Check**:
```bash
# Verify WebSocket connections
ssh azureuser@20.170.155.53 "ss -tan | grep :3000"

# Check conference server logs
ssh azureuser@20.170.155.53 "tail -50 /home/azureuser/translation-app/conference-server.log"
```

**Fix**: Restart conference server (see Step 7.4)

### Issue 5: Asterisk Not Starting

**Symptoms**: `systemctl status asterisk` shows `failed`

**Check Logs**:
```bash
ssh azureuser@20.170.155.53 "sudo journalctl -u asterisk -n 100"
```

**Common Causes**:
- Syntax errors in configuration files
- Port conflicts
- Missing libraries

**Fix**:
```bash
# Test Asterisk configuration
ssh azureuser@20.170.155.53 "sudo asterisk -rx 'core show version'"

# Check for syntax errors
ssh azureuser@20.170.155.53 "sudo asterisk -c"
# Then press Ctrl+C to exit
```

---

## Cleanup

### When Clone No Longer Needed

#### Delete VM (keeps disk and snapshot)
```bash
az vm delete \
  --resource-group realtime-translation-rg \
  --name asterisk-dev-vm-clone \
  --yes
```

#### Delete Public IP
```bash
az network public-ip delete \
  --resource-group realtime-translation-rg \
  --name asterisk-dev-clone-ip
```

#### Delete Disk
```bash
az disk delete \
  --resource-group realtime-translation-rg \
  --name asterisk-dev-disk-clone \
  --yes
```

#### Delete Snapshot
```bash
az snapshot delete \
  --resource-group realtime-translation-rg \
  --name asterisk-translation-snapshot-20251028 \
  --yes
```

### Cost Savings During Non-Use

#### Deallocate VM (saves compute cost, keeps disk)
```bash
az vm deallocate \
  --resource-group realtime-translation-rg \
  --name asterisk-dev-vm-clone
```

**Cost**: Only disk storage (~$2-3/month) instead of full VM (~$35-45/month)

#### Restart When Needed
```bash
az vm start \
  --resource-group realtime-translation-rg \
  --name asterisk-dev-vm-clone
```

---

## Summary Checklist

Use this checklist to verify successful cloning:

- [ ] Step 1: Identified source VM and OS disk ID
- [ ] Step 2: Created snapshot (name: `asterisk-translation-snapshot-YYYYMMDD`)
- [ ] Step 3: Created managed disk from snapshot (name: `asterisk-dev-disk-clone`)
- [ ] Step 4: Created new VM (name: `asterisk-dev-vm-clone`, got public IP)
- [ ] Step 5.2: Added HTTP rule (port 3000 TCP, priority 110)
- [ ] Step 5.3: Added SIP rule (port 5060 UDP, priority 120)
- [ ] Step 5.4: Added RTP rule (ports 10000-20000 UDP, priority 130) **CRITICAL**
- [ ] Step 6.2: Updated pjsip.conf external_media_address **CRITICAL**
- [ ] Step 6.2: Updated pjsip.conf external_signaling_address **CRITICAL**
- [ ] Step 7.1: Restarted Asterisk
- [ ] Step 7.4: Restarted conference server
- [ ] Step 8.3: Verified HTTP dashboard accessible
- [ ] Step 8.5: Verified SIP registration works
- [ ] Step 8.6: Verified audio call works (audioFrames > 0)

---

## Quick Reference

### New VM Details
```
VM Name: asterisk-dev-vm-clone
Public IP: 20.170.155.53
Private IP: 10.0.0.X
Size: Standard_B2s (2 vCPU, 4GB RAM)
OS: Ubuntu 22.04 LTS
Kernel: 6.8.0-1041-azure
Node.js: v20.19.5
Asterisk: 18.10.0
```

### Access URLs
```
SSH: ssh azureuser@20.170.155.53
Dashboard: http://20.170.155.53:3000/dashboard.html
ARI: http://localhost:8088 (internal only)
```

### SIP Test Account
```
Server: 20.170.155.53:5060
Username: 1001
Password: 1001pass
Test Extension: 7000
```

### Service Management
```bash
# Asterisk
sudo systemctl status asterisk
sudo systemctl restart asterisk
sudo asterisk -rx 'pjsip show endpoints'

# Conference Server
killall -9 node
cd /home/azureuser/translation-app
nohup node conference-server.js > conference-server.log 2>&1 &
```

### Log Locations
```
Asterisk: /var/log/asterisk/full
Conference Server: /home/azureuser/translation-app/conference-server.log
System: sudo journalctl -u asterisk
```

---

## Important Notes

### Critical Success Factors

1. **RTP Port Range** (10000-20000 UDP):
   - Without this, SIP registers but audio fails
   - Symptom: `audioFrames: 0` in logs
   - Fix: Add NSG rule (Step 5.4)

2. **External IP Addresses** in pjsip.conf:
   - Must point to new VM IP, not production IP
   - Symptom: One-way audio or no audio
   - Fix: Update pjsip.conf (Step 6.2) and restart Asterisk

3. **Service Restart Order**:
   - Always restart Asterisk before conference server
   - Asterisk must be running for ARI to work
   - Conference server connects to Asterisk ARI

### Production Safety

- ✅ Snapshot creation is non-disruptive to production
- ✅ Clone has different IP address (no conflicts)
- ✅ Clone has different hostname (no confusion)
- ⚠️ Do not copy SSL certificates if using Let's Encrypt (will fail validation)
- ⚠️ Update any monitoring/alerting to exclude clone VM

### Performance Considerations

- Standard_B2s: Good for dev/test, occasional bursting
- For sustained load, use Standard_D2s_v3 or higher
- Standard_LRS disk is sufficient, Premium_LRS for better IOPS
- RTP ports consume significant bandwidth during calls

---

## Revision History

| Date       | Version | Changes                                      |
|------------|---------|----------------------------------------------|
| 2025-10-28 | 1.0     | Initial documentation based on successful clone |

---

**End of Document**

For questions or issues, refer to troubleshooting section or check Azure documentation.