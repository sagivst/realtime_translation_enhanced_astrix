# 5555/6666 Phase 1 PCM Cross-Patch System - Complete Documentation

## Overview

This system provides bidirectional audio cross-patching between SIP extensions 5555 and 6666 using Asterisk's ExternalMedia channels. When extension 5555 speaks, the audio is routed to extension 6666, and vice versa.

## Server Information

- **VM IP**: 20.170.155.53
- **Project Directory**: /home/azureuser/translation-app/5555-6666-pcm-crossover
- **Monitor Dashboard**: http://20.170.155.53:3010/

---

## Project Files

### Complete File Listing

```
5555-6666-pcm-crossover/
├── ari-gstreamer-phase1.js          # ARI client for Stasis and ExternalMedia
├── conf-server-phase1.js            # Central PCM cross-patch server with WebSocket
├── gateway-5555-buffered.js         # RTP/PCM gateway for ext 5555 (ACTIVE)
├── gateway-6666-buffered.js         # RTP/PCM gateway for ext 6666 (ACTIVE)
├── gateway-5555.js                  # Legacy non-buffered version (NOT USED)
├── package.json                     # Node.js dependencies
├── .env.phase1                      # Environment variables
├── asterisk-extensions-5555-6666.conf  # Extension dialplan snippet
├── SYSTEM_DOCUMENTATION.md          # This documentation
├── asterisk-configs/
│   ├── ari.conf                     # ARI configuration
│   ├── extensions.conf              # Dialplan
│   ├── http.conf                    # HTTP server config
│   ├── modules.conf                 # Module loading
│   ├── pjsip.conf                   # PJSIP transport
│   ├── pjsip_users.conf             # SIP endpoints
│   ├── rtp.conf                     # RTP port ranges
│   └── sip.conf                     # Legacy SIP config
├── public/
│   └── monitoring-dashboard.html    # Web-based audio monitor
├── logs/                            # Runtime logs directory
└── node_modules/                    # Dependencies
```

### Active Services (4 required)

| File | Size | Description |
|------|------|-------------|
| conf-server-phase1.js | 10,364 bytes | Central PCM cross-patch server with WebSocket monitoring |
| gateway-5555-buffered.js | 8,391 bytes | RTP/PCM gateway for extension 5555 (with packet buffering) |
| gateway-6666-buffered.js | 8,391 bytes | RTP/PCM gateway for extension 6666 (with packet buffering) |
| ari-gstreamer-phase1.js | 5,827 bytes | ARI client for Stasis and ExternalMedia channel management |

### Log Files (in /tmp/)

- /tmp/conf-server.log
- /tmp/gateway-5555-buffered.log
- /tmp/gateway-6666-buffered.log
- /tmp/ari.log

---

## Port Configuration

### Complete Port Map

| Port | Protocol | Service | Direction | Description |
|------|----------|---------|-----------|-------------|
| 4000 | UDP | gateway-5555 | FROM Asterisk | Receives RTP from ExternalMedia for 5555 |
| 4001 | UDP | gateway-5555 | TO Asterisk | Sends RTP back to ExternalMedia for 5555 |
| 4002 | UDP | gateway-6666 | FROM Asterisk | Receives RTP from ExternalMedia for 6666 |
| 4003 | UDP | gateway-6666 | TO Asterisk | Sends RTP back to ExternalMedia for 6666 |
| 6100 | UDP | conf-server | FROM gateway-5555 | Receives PCM from 5555 microphone |
| 6101 | UDP | conf-server | TO gateway-5555 | Sends PCM to 5555 speaker (from 6666) |
| 6102 | UDP | conf-server | FROM gateway-6666 | Receives PCM from 6666 microphone |
| 6103 | UDP | conf-server | TO gateway-6666 | Sends PCM to 6666 speaker (from 5555) |
| 3010 | TCP | conf-server | WebSocket | Monitoring dashboard |
| 8088 | TCP | Asterisk | HTTP/ARI | Asterisk REST Interface |

### WebSocket Monitoring Endpoints

- ws://20.170.155.53:3010/monitor/5555 - Audio going TO 5555 speaker
- ws://20.170.155.53:3010/monitor/6666 - Audio going TO 6666 speaker
- ws://20.170.155.53:3010/mic/5555 - Raw audio FROM 5555 microphone
- ws://20.170.155.53:3010/mic/6666 - Raw audio FROM 6666 microphone

---

## Asterisk Configuration

### Extensions (/etc/asterisk/extensions.conf)

```
exten => 5555,1,NoOp(=== Extension 5555: GStreamer Phase 1 MIC ===)
 same => n,Answer()
 same => n,Stasis(gstreamer-phase1,ext5555)
 same => n,Hangup()

exten => 6666,1,NoOp(=== Extension 6666: GStreamer Phase 1 SPEAKER ===)
 same => n,Answer()
 same => n,Stasis(gstreamer-phase1,ext6666)
 same => n,Hangup()
```

### ARI Configuration (/etc/asterisk/ari.conf)

```
[general]
enabled = yes
pretty = yes

[dev]
type = user
read_only = no
password = asterisk
password_format = plain
```

### HTTP Configuration (/etc/asterisk/http.conf)

```
[general]
enabled=yes
bindaddr=0.0.0.0
bindport=8088
```

---

## Startup Sequence

### CRITICAL: Startup Order

Services MUST be started in this exact order:

1. conf-server-phase1.js (FIRST)
2. gateway-5555-buffered.js
3. gateway-6666-buffered.js
4. ari-gstreamer-phase1.js (LAST)

### Complete Startup Commands

```bash
cd /home/azureuser/translation-app/5555-6666-pcm-crossover

# 1. Start conf-server (must be first)
nohup node conf-server-phase1.js > /tmp/conf-server.log 2>&1 &
sleep 2

# 2. Start gateway-5555-buffered
nohup node gateway-5555-buffered.js > /tmp/gateway-5555-buffered.log 2>&1 &
sleep 1

# 3. Start gateway-6666-buffered
nohup node gateway-6666-buffered.js > /tmp/gateway-6666-buffered.log 2>&1 &
sleep 1

# 4. Start ARI client (must be last)
nohup node ari-gstreamer-phase1.js > /tmp/ari.log 2>&1 &
sleep 2

# Verify
pgrep -af 'conf-server|gateway|ari-gstreamer'
ss -ulnp | grep -E '4000|4002|6100|6102|3010'
```

### Stop All Services

```bash
pkill -f conf-server-phase1
pkill -f gateway-5555
pkill -f gateway-6666
pkill -f ari-gstreamer
```

---

## Audio Flow Logic

### When 5555 Speaks (5555 -> 6666)

1. SIP Phone 5555 captures audio
2. Asterisk ExternalMedia receives RTP
3. Gateway-5555 (port 4000) strips RTP header, sends PCM to conf-server (port 6100)
4. Conf-Server cross-patches: forwards to port 6103
5. Gateway-6666 (port 6103) adds RTP header, sends to ExternalMedia (port 4003)
6. SIP Phone 6666 plays audio

### When 6666 Speaks (6666 -> 5555)

1. SIP Phone 6666 captures audio
2. Asterisk ExternalMedia receives RTP
3. Gateway-6666 (port 4002) strips RTP header, sends PCM to conf-server (port 6102)
4. Conf-Server cross-patches: forwards to port 6101
5. Gateway-5555 (port 6101) adds RTP header, sends to ExternalMedia (port 4001)
6. SIP Phone 5555 plays audio

### Cross-Patch Summary

- 6100 (from 5555 mic) -> 6103 (to 6666 speaker)
- 6102 (from 6666 mic) -> 6101 (to 5555 speaker)

---

## Audio Format

| Parameter | Value |
|-----------|-------|
| Sample Rate | 16000 Hz |
| Channels | 1 (Mono) |
| Bit Depth | 16-bit signed linear |
| Frame Size | 20ms |
| Samples per Frame | 320 |
| Bytes per Frame | 640 |
| Format | slin (Signed Linear 16kHz) |

---

## Troubleshooting

### Audio Works First Call, Fails on Second

Cause: Gateways sending to old Asterisk ports
Solution: Gateways have port change detection (check for "port changed" in logs)

### One-Way Audio

Cause: RTP session not initialized in one gateway
Check: Look for "RTP session initialized" in gateway logs

### No Audio at All

Checks:
- `ss -ulnp | grep -E '4000|4002|6100|6102'`
- `sudo asterisk -rx "core show channels"`
- `curl -u dev:asterisk http://localhost:8088/ari/channels`

### View Logs

```bash
tail -f /tmp/conf-server.log
tail -f /tmp/gateway-5555-buffered.log
tail -f /tmp/gateway-6666-buffered.log
tail -f /tmp/ari.log
```

---

## Quick Reference

```
PROJECT: /home/azureuser/translation-app/5555-6666-pcm-crossover
MONITOR: http://20.170.155.53:3010/

START ORDER:
1. node conf-server-phase1.js
2. node gateway-5555-buffered.js
3. node gateway-6666-buffered.js
4. node ari-gstreamer-phase1.js

PORTS:
  5555: Asterisk<->Gateway = 4000/4001 | Gateway<->Conf = 6100/6101
  6666: Asterisk<->Gateway = 4002/4003 | Gateway<->Conf = 6102/6103
  Monitor: 3010 (WebSocket)

CROSS-PATCH:
  6100 (from 5555) -> 6103 (to 6666)
  6102 (from 6666) -> 6101 (to 5555)

LOGS: /tmp/conf-server.log, gateway-5555-buffered.log, gateway-6666-buffered.log, ari.log
```

---

Document generated: November 19, 2025
