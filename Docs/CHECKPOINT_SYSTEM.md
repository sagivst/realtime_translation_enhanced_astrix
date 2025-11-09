# Checkpoint Backup System

## Overview
This checkpoint system creates complete snapshots of both application code AND Asterisk configuration files, enabling full rollback capability.

## What Gets Backed Up

### Application Files (in `/home/azureuser/translation-app/`)
- `conference-server.js` - Main server orchestrating translation
- `audiosocket-integration.js` - AudioSocket connection handler
- `public/dashboard-single.html` - Dashboard UI

### Asterisk Configuration Files (in `/etc/asterisk/`)
- `sip.conf` - SIP endpoint configuration (extensions 1001, 1002, network settings)
- `extensions.conf` - Dialplan routing (extensions 7000, 7001, AudioSocket)
- `modules.conf` - Module loading configuration (PJSIP disabled, chan_sip enabled)

## Checkpoint Structure

```
checkpoints/
└── checkpoint-YYYYMMDD-HHMMSS/
    ├── conference-server.js
    ├── audiosocket-integration.js
    ├── dashboard-single.html
    ├── asterisk-configs/
    │   ├── sip.conf
    │   ├── extensions.conf
    │   └── modules.conf
    └── CHECKPOINT_INFO.txt
```

## Creating a Checkpoint

### Manual Checkpoint Creation
```bash
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app
./create-checkpoint.sh "Description of changes"
```

### Automated Checkpoint Script
The `create-checkpoint.sh` script automatically:
1. Creates timestamped directory
2. Copies all application files
3. Copies all Asterisk configs
4. Generates CHECKPOINT_INFO.txt with description

## Restoring from Checkpoint

### Full System Restore
```bash
ssh azureuser@20.170.155.53
cd /home/azureuser/translation-app
./restore-checkpoint.sh checkpoint-20251031-HHMMSS
```

### Partial Restore (Application Only)
```bash
cd /home/azureuser/translation-app
cp checkpoints/checkpoint-20251031-HHMMSS/conference-server.js .
cp checkpoints/checkpoint-20251031-HHMMSS/audiosocket-integration.js .
cp checkpoints/checkpoint-20251031-HHMMSS/dashboard-single.html public/
pkill -9 node && nohup node conference-server.js > /tmp/server.log 2>&1 &
```

### Partial Restore (Asterisk Only)
```bash
sudo cp checkpoints/checkpoint-20251031-HHMMSS/asterisk-configs/sip.conf /etc/asterisk/
sudo cp checkpoints/checkpoint-20251031-HHMMSS/asterisk-configs/extensions.conf /etc/asterisk/
sudo cp checkpoints/checkpoint-20251031-HHMMSS/asterisk-configs/modules.conf /etc/asterisk/
sudo asterisk -rx 'core reload'
```

## Recent Checkpoints

### checkpoint-20251031-CURRENT (Latest - Post SIP Fixes)
**Status**: ✅ Working - Both phones registered and calling
**Description**: Complete working system with all fixes applied
- Fixed PJSIP/chan_sip conflict (PJSIP fully disabled)
- Fixed external IP (20.170.155.53)
- Fixed SIP authentication (insecure=invite)
- Fixed AudioSocket UUID parameter
- Both extensions 1001 and 1002 registered
- Extensions 7000 and 7001 operational

**Key Configuration**:
- SIP: chan_sip only, no PJSIP
- External IP: 20.170.155.53
- Auth: insecure=invite for both extensions
- AudioSocket: UUID parameters correct
- Ports: 3000 (HTTP), 5050/5052 (AudioSocket), 5060 (SIP)

### checkpoint-20251030-163619
**Status**: ⚠️ Incomplete - Missing Asterisk configs
**Description**: Application files only
- Missing: sip.conf, extensions.conf, modules.conf

### checkpoint-20251030-133041
**Status**: ⚠️ Incomplete - Missing Asterisk configs
**Description**: Application files only

## Critical Files Reference

### sip.conf Key Settings
```conf
[general]
context=default
bindport=5060
bindaddr=0.0.0.0
externip=20.170.155.53
localnet=10.0.0.0/255.255.255.0

[1001]
type=friend
insecure=invite
qualify=yes
secret=1001pass

[1002]
type=friend
insecure=invite
qualify=yes
secret=1002pass
```

### extensions.conf Key Extensions
```conf
[from-sip-custom]
exten => 7000,1,NoOp(=== AudioSocket Extension 7000 ===)
 same => n,Set(CALL_UUID=${FILTER(a-zA-Z0-9-,${SHELL(uuidgen)})})
 same => n,AudioSocket(${CALL_UUID},127.0.0.1:5050)

exten => 7001,1,NoOp(=== AudioSocket Extension 7001 ===)
 same => n,Set(CALL_UUID=${FILTER(a-zA-Z0-9-,${SHELL(uuidgen)})})
 same => n,AudioSocket(${CALL_UUID},127.0.0.1:5052)
```

### modules.conf Key Settings
```conf
[global]
noload => res_pjsip.so
noload => chan_pjsip.so
# ... (all PJSIP modules disabled)
```

## GitHub Sync

Checkpoints are also pushed to GitHub repository branches for redundancy:
- Branch naming: `checkpoint/YYYYMMDD-HHMMSS`
- Latest stable: `checkpoint/latest-stable`

## Troubleshooting Rollbacks

### If Phones Stop Registering After Restore
1. Check PJSIP modules: `sudo asterisk -rx 'module show like pjsip'` (should be empty)
2. Check external IP: `sudo asterisk -rx 'sip show settings' | grep externip`
3. Restart Asterisk: `sudo systemctl restart asterisk`

### If Calls Rejected After Restore
1. Check insecure setting: `sudo asterisk -rx 'sip show peer 1001'`
2. Check UUID in extensions.conf line 92 and 127

### If AudioSocket Fails After Restore
1. Check server running: `pgrep -f 'node conference-server'`
2. Check ports: `netstat -tlnp | grep -E '5050|5052'`
3. Restart server: `pkill -9 node && cd /home/azureuser/translation-app && nohup node conference-server.js > /tmp/server.log 2>&1 &`

## Backup Retention Policy

- Keep all checkpoints from last 7 days
- Keep weekly checkpoints for last 3 months
- Keep monthly checkpoints indefinitely
- Archive to local machine monthly

## Change Log

### 2025-10-31
- Created comprehensive checkpoint system
- Added Asterisk configuration backup
- Added CHECKPOINT_INFO.txt metadata
- Created restore scripts
- Documented current working configuration

### 2025-10-30
- Initial checkpoint system (application files only)
- Created 14 checkpoints during troubleshooting session
