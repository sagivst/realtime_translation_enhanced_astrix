# Asterisk Configuration Documentation

## Current Deployment
- **Server**: Azure VM (azureuser@4.185.84.26)
- **Asterisk Version**: 18.10.0~dfsg+~cs6.10.40431411-2
- **OS**: Ubuntu 22.04.5 LTS
- **Config Location**: `/etc/asterisk/`

## Extensions Configuration

### Extension 5000 - AudioSocket with UUID
**Protocol**: AudioSocket TCP
**Audio Format**: 8kHz PCMU/slin
**Server**: localhost:5050

```conf
exten => 5000,1,NoOp(=== AudioSocket Extension 5000 ===)
  same => n,Set(UUID1=${RAND(10000000,99999999)})
  same => n,Set(UUID2=${RAND(1000,9999)})
  same => n,Set(UUID3=${RAND(1000,9999)})
  same => n,Set(UUID4=${RAND(1000,9999)})
  same => n,Set(UUID5A=${RAND(100000,999999)})
  same => n,Set(UUID5B=${RAND(100000,999999)})
  same => n,Set(CALL_UUID=${UUID1}-${UUID2}-${UUID3}-${UUID4}-${UUID5A}${UUID5B})
  same => n,Answer()
  same => n,NoOp(Call UUID: ${CALL_UUID})
  same => n,AudioSocket(${CALL_UUID},127.0.0.1:5050)
  same => n,Hangup()
```

### Extension 6000 - AudioSocket with UUID
**Protocol**: AudioSocket TCP
**Audio Format**: 8kHz PCMU/slin
**Server**: localhost:5050

```conf
exten => 6000,1,NoOp(=== AudioSocket Extension 6000 ===)
  same => n,Set(UUID1=${RAND(10000000,99999999)})
  same => n,Set(UUID2=${RAND(1000,9999)})
  same => n,Set(UUID3=${RAND(1000,9999)})
  same => n,Set(UUID4=${RAND(1000,9999)})
  same => n,Set(UUID5A=${RAND(100000,999999)})
  same => n,Set(UUID5B=${RAND(100000,999999)})
  same => n,Set(CALL_UUID=${UUID1}-${UUID2}-${UUID3}-${UUID4}-${UUID5A}${UUID5B})
  same => n,Answer()
  same => n,NoOp(Call UUID: ${CALL_UUID})
  same => n,AudioSocket(${CALL_UUID},127.0.0.1:5050)
  same => n,Hangup()
```

### Extension 7000 - AudioSocket with UUID
**Protocol**: AudioSocket TCP
**Audio Format**: 8kHz PCMU/slin
**Server**: localhost:5050

```conf
exten => 7000,1,NoOp(=== AudioSocket Extension 7000 ===)
  same => n,Set(UUID1=${RAND(10000000,99999999)})
  same => n,Set(UUID2=${RAND(1000,9999)})
  same => n,Set(UUID3=${RAND(1000,9999)})
  same => n,Set(UUID4=${RAND(1000,9999)})
  same => n,Set(UUID5A=${RAND(100000,999999)})
  same => n,Set(UUID5B=${RAND(100000,999999)})
  same => n,Set(CALL_UUID=${UUID1}-${UUID2}-${UUID3}-${UUID4}-${UUID5A}${UUID5B})
  same => n,Answer()
  same => n,NoOp(Call UUID: ${CALL_UUID})
  same => n,AudioSocket(${CALL_UUID},127.0.0.1:5050)
  same => n,Hangup()
```

### Extension 8888 - Echo Test
**Purpose**: Testing audio connectivity

```conf
exten => 8888,1,NoOp(Echo test)
  same => n,Answer()
  same => n,Playback(hello-world)
  same => n,Echo()
  same => n,Hangup()
```

## AudioSocket Protocol (3-Byte Header)

### Protocol Specification
**Reference**: https://wiki.asterisk.org/wiki/display/AST/AudioSocket

**Frame Format**: `[1-byte type][2-byte length][payload]`

### Frame Types
- `0x00` - Hangup/Terminate
- `0x01` - UUID/ID
- `0x10` - Slin (audio data)
- `0xff` - Error

### Header Structure
```
Byte 0:     Frame Type (1 byte)
Bytes 1-2:  Payload Length (16-bit big-endian)
Bytes 3+:   Payload Data
```

### Audio Format
- **Sample Rate**: 8000 Hz (8 kHz)
- **Encoding**: Linear PCM, 16-bit signed (slin)
- **Channels**: 1 (mono)
- **Frame Size**: 20ms
- **Bytes per Frame**: 320 bytes (8000 Hz × 0.020 sec × 2 bytes)
- **Frame Rate**: 50 frames/second

## PJSIP Configuration

### User 1 (Primary Test Account)
```conf
[user1]
type=endpoint
context=default
disallow=all
allow=ulaw
allow=alaw
auth=user1
aors=user1

[user1]
type=auth
auth_type=userpass
password=SecurePass123!
username=user1

[user1]
type=aor
max_contacts=1
```

### User 2 (Secondary Test Account)
```conf
[user2]
type=endpoint
context=default
disallow=all
allow=ulaw
allow=alaw
auth=user2
aors=user2

[user2]
type=auth
auth_type=userpass
password=SecurePass456!
username=user2

[user2]
type=aor
max_contacts=1
```

## ARI Configuration

### File: `/etc/asterisk/ari.conf`

```conf
[general]
enabled=yes
pretty=yes
allowed_origins=*

[asterisk-user]
type=user
read_only=no
password=asterisk123
```

**Connection**:
- URL: `http://localhost:8088/ari`
- Username: `asterisk-user`
- Password: `asterisk123`

## http.conf Configuration

```conf
[general]
enabled=yes
bindaddr=0.0.0.0
bindport=8088
```

## Available Dialplan Configurations (in /tmp)

### 1. AudioSocket for All Extensions
**File**: `/tmp/extensions-audiosocket-7000.conf`
All extensions (5000, 6000, 7000) use AudioSocket TCP protocol

### 2. ExternalMedia for Extension 7000 (Application Syntax)
**File**: `/tmp/extensions-externalmedia-7000.conf`
Extension 7000 uses ExternalMedia application (incorrect syntax)

### 3. ExternalMedia for Extension 7000 (Dial Syntax - FIXED)
**File**: `/tmp/extensions-externalmedia-7000-fixed.conf`
Extension 7000 uses Dial(ExternalMedia/...) - correct syntax for channel driver

### 4. ARI with Stasis for Extension 7000
**File**: `/tmp/extensions-ari.conf`
Extension 7000 routes to Stasis application for ARI control

## Asterisk Service Management

### Check Status
```bash
ssh azureuser@4.185.84.26 "sudo systemctl status asterisk"
```

### Restart Asterisk
```bash
ssh azureuser@4.185.84.26 "sudo systemctl restart asterisk"
```

### Reload Dialplan
```bash
ssh azureuser@4.185.84.26 "sudo asterisk -rx 'dialplan reload'"
```

### View Logs
```bash
ssh azureuser@4.185.84.26 "sudo tail -f /var/log/asterisk/messages"
```

### Check Loaded Modules
```bash
ssh azureuser@4.185.84.26 "sudo asterisk -rx 'module show'"
```

## File Locations on Azure VM

### Configuration Files
- `/etc/asterisk/extensions.conf` - Dialplan
- `/etc/asterisk/pjsip.conf` - SIP users
- `/etc/asterisk/ari.conf` - ARI configuration
- `/etc/asterisk/http.conf` - HTTP server config

### Application Files
- `/home/azureuser/translation-app/` - Node.js application
- `/home/azureuser/translation-app/conference-server.js` - Main server
- `/home/azureuser/translation-app/translation-app.log` - Application logs
- `/home/azureuser/translation-app/translation-app.pid` - Process ID file

### Logs
- `/var/log/asterisk/messages` - Asterisk system logs
- `/home/azureuser/translation-app/translation-app.log` - Node.js app logs
- `/home/azureuser/translation-app/websocket-server.log` - WebSocket server logs

## Testing Extensions

### Test Extension 5000
```bash
# From SIP phone registered as user1 or user2
Dial: 5000
Expected: AudioSocket connection to port 5050
```

### Test Extension 6000
```bash
# From SIP phone registered as user1 or user2
Dial: 6000
Expected: AudioSocket connection to port 5050
```

### Test Extension 7000
```bash
# From SIP phone registered as user1 or user2
Dial: 7000
Expected: AudioSocket connection to port 5050
```

### Test Echo Extension
```bash
# From SIP phone registered as user1 or user2
Dial: 8888
Expected: Hear "hello world" message, then echo test
```

## Monitoring Commands

### Monitor Asterisk Logs for Extension Calls
```bash
ssh azureuser@4.185.84.26 "sudo tail -f /var/log/asterisk/messages | grep -E '(5000|6000|7000|AudioSocket)'"
```

### Monitor Application Logs
```bash
ssh azureuser@4.185.84.26 "tail -f ~/translation-app/translation-app.log"
```

### Check Active Channels
```bash
ssh azureuser@4.185.84.26 "sudo asterisk -rx 'core show channels'"
```

### Check PJSIP Endpoints
```bash
ssh azureuser@4.185.84.26 "sudo asterisk -rx 'pjsip show endpoints'"
```

## SIP Phone Configuration

### User 1
- **Username**: user1
- **Password**: SecurePass123!
- **Server**: 4.185.84.26
- **Port**: 5060
- **Transport**: UDP

### User 2
- **Username**: user2
- **Password**: SecurePass456!
- **Server**: 4.185.84.26
- **Port**: 5060
- **Transport**: UDP
