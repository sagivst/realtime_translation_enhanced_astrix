# Current System State Documentation

**Last Updated**: 2025-10-19

## System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                       SIP Phones (User 1, User 2)                │
│                              ↓                                    │
│                    Asterisk 18.10.0 (PJSIP)                     │
│                       Extensions: 5000, 6000, 7000               │
│                              ↓                                    │
│                    AudioSocket (TCP Port 5050)                   │
│                       3-Byte Header Protocol                     │
│                              ↓                                    │
│           Node.js AudioSocket Orchestrator                       │
│                   (conference-server.js)                         │
│                              ↓                                    │
│        ┌────────────────────┴────────────────────┐              │
│        ↓                    ↓                     ↓              │
│   Deepgram STT         DeepL MT            ElevenLabs TTS       │
│   (8kHz streaming)   (Translation)         (Voice synthesis)    │
└──────────────────────────────────────────────────────────────────┘
```

## Deployment Information

### Azure VM
- **IP Address**: 4.185.84.26
- **Username**: azureuser
- **OS**: Ubuntu 22.04.5 LTS
- **Location**: Azure East US (or similar region)
- **Purpose**: Asterisk PBX + Node.js translation server

### Asterisk PBX
- **Version**: 18.10.0~dfsg+~cs6.10.40431411-2
- **Package**: Installed via `apt` (Ubuntu repository)
- **Service**: systemd (`asterisk.service`)
- **Ports**:
  - 5060 (UDP) - PJSIP
  - 8088 (TCP) - HTTP/ARI
  - 5050 (TCP) - AudioSocket server (Node.js)

## Active Components

### 1. Asterisk Service
**Status**: Running
**Service**: `asterisk.service`
**Config Path**: `/etc/asterisk/`

**Key Modules**:
- `chan_pjsip.so` - PJSIP channel driver
- `res_pjsip.so` - PJSIP stack
- `app_audiosocket.so` - AudioSocket application
- `res_ari.so` - Asterisk REST Interface
- `app_confbridge.so` - Conference bridge (if needed)

### 2. Node.js AudioSocket Server
**File**: `/home/azureuser/translation-app/conference-server.js`
**Port**: 5050 (TCP)
**Protocol**: AudioSocket (3-byte header)
**Log**: `/home/azureuser/translation-app/translation-app.log`

**Environment Variables**:
```bash
DEEPGRAM_API_KEY=806ac77eb08d83390c265228dd2cc89c0b86f23e
DEEPL_API_KEY=672097f6-2818-4022-be20-6f7118e12143:fx
ELEVENLABS_API_KEY=sk_968d6d3e5b92cfce648ce9a38478ee131d98750ef4e09f05
```

**Key Features**:
- Receives 8kHz PCM audio from Asterisk via AudioSocket
- Implements 3-byte header protocol parsing
- Streams audio to Deepgram for speech-to-text
- Translates via DeepL API
- Synthesizes translated speech via ElevenLabs
- Sends audio back to Asterisk

### 3. WebSocket Server (Alternative - Not Currently Active)
**File**: `/home/azureuser/translation-app/src/asterisk-websocket-server.js`
**Port**: 5050 (WebSocket)
**Purpose**: ExternalMedia WebSocket receiver (16kHz)
**Status**: Available but not currently in use

## Current Extensions Configuration

All three extensions (5000, 6000, 7000) use **identical AudioSocket configuration**:

### Extension Flow
1. User dials extension (5000, 6000, or 7000)
2. Asterisk generates random UUID
3. Call is answered
4. AudioSocket connection established to `127.0.0.1:5050`
5. Audio streams bidirectionally over TCP
6. Node.js server processes audio (STT → MT → TTS)

### AudioSocket Frame Format
```
Byte 0:     Frame Type (0x01=UUID, 0x10=Audio, 0x00=Hangup, 0xff=Error)
Bytes 1-2:  Payload Length (16-bit big-endian)
Bytes 3+:   Payload Data
```

### Audio Specifications
- **Sample Rate**: 8000 Hz
- **Encoding**: Linear PCM 16-bit signed (slin)
- **Channels**: Mono (1 channel)
- **Frame Duration**: 20ms
- **Frame Size**: 320 bytes (8000 Hz × 0.02s × 2 bytes/sample)
- **Frames per Second**: 50 fps

## API Services

### 1. Deepgram Speech-to-Text
**API Key**: `806ac77eb08d83390c265228dd2cc89c0b86f23e`
**Configuration**:
```javascript
{
  model: 'nova-2',
  language: 'en',
  smart_format: true,
  punctuate: true,
  interim_results: true,
  sample_rate: 8000,
  encoding: 'linear16',
  channels: 1
}
```

### 2. DeepL Translation
**API Key**: `672097f6-2818-4022-be20-6f7118e12143:fx`
**Type**: Free tier
**Supported Languages**: EN ↔ JA, EN ↔ ES, EN ↔ FR, etc.

### 3. ElevenLabs Text-to-Speech
**API Key**: `sk_968d6d3e5b92cfce648ce9a38478ee131d98750ef4e09f05`
**Voice Models**: Multiple voices available
**Output Format**: PCM 8kHz (to match Asterisk)

## File Locations

### Local Development (macOS)
```
/Users/sagivstavinsky/realtime-translation-enhanced_astrix/
├── src/
│   ├── asterisk-websocket-server.js         # WebSocket server (16kHz)
│   ├── audiosocket-orchestrator-fixed.js    # AudioSocket orchestrator (8kHz)
│   └── conference-server.js                  # Main server file
├── package.json
├── .env
├── ASTERISK-CONFIGURATION.md                 # This doc + Asterisk configs
├── CURRENT-SYSTEM-STATE.md                   # This file
├── IMPLEMENTATION_SUMMARY.md                 # Original implementation notes
└── README.md                                  # Project overview
```

### Azure VM Production
```
/home/azureuser/translation-app/
├── conference-server.js                      # Main server (AudioSocket)
├── translation-app.log                       # Application logs
├── translation-app.pid                       # Process ID
├── src/
│   └── asterisk-websocket-server.js         # WebSocket server (standby)
├── node_modules/                             # Dependencies
└── package.json

/etc/asterisk/
├── extensions.conf                           # Dialplan (5000, 6000, 7000)
├── pjsip.conf                                # SIP users (user1, user2)
├── ari.conf                                  # ARI configuration
└── http.conf                                 # HTTP server config
```

### Temporary Configuration Files (Local /tmp)
```
/tmp/
├── extensions-audiosocket-7000.conf          # All extensions use AudioSocket
├── extensions-externalmedia-7000.conf        # Ext 7000 uses ExternalMedia (app syntax)
├── extensions-externalmedia-7000-fixed.conf  # Ext 7000 uses Dial(ExternalMedia/...)
├── extensions-ari.conf                       # Ext 7000 uses Stasis app
└── audiosocket-orchestrator-fixed.js         # Standalone AudioSocket server
```

## Testing Accounts

### SIP User 1
- **Username**: user1
- **Password**: SecurePass123!
- **Server**: 4.185.84.26:5060
- **Context**: default

### SIP User 2
- **Username**: user2
- **Password**: SecurePass456!
- **Server**: 4.185.84.26:5060
- **Context**: default

## Operational Commands

### Start/Stop Services

#### Restart Asterisk
```bash
ssh azureuser@4.185.84.26 "sudo systemctl restart asterisk"
```

#### Restart Node.js Server
```bash
ssh azureuser@4.185.84.26 "killall -9 node && sleep 2 && cd ~/translation-app && DEEPGRAM_API_KEY=806ac77eb08d83390c265228dd2cc89c0b86f23e DEEPL_API_KEY=672097f6-2818-4022-be20-6f7118e12143:fx ELEVENLABS_API_KEY=sk_968d6d3e5b92cfce648ce9a38478ee131d98750ef4e09f05 /usr/bin/node conference-server.js > translation-app.log 2>&1 & echo \$! > translation-app.pid"
```

### Monitoring

#### Monitor Asterisk Logs
```bash
ssh azureuser@4.185.84.26 "sudo tail -f /var/log/asterisk/messages"
```

#### Monitor Application Logs
```bash
ssh azureuser@4.185.84.26 "tail -f ~/translation-app/translation-app.log"
```

#### Check Active Calls
```bash
ssh azureuser@4.185.84.26 "sudo asterisk -rx 'core show channels'"
```

#### Check SIP Registrations
```bash
ssh azureuser@4.185.84.26 "sudo asterisk -rx 'pjsip show endpoints'"
```

### Configuration Management

#### Deploy New Dialplan
```bash
scp /tmp/extensions-audiosocket-7000.conf azureuser@4.185.84.26:~/extensions.conf
ssh azureuser@4.185.84.26 "sudo mv ~/extensions.conf /etc/asterisk/extensions.conf && sudo chown asterisk:asterisk /etc/asterisk/extensions.conf && sudo asterisk -rx 'dialplan reload'"
```

#### Deploy New Node.js Code
```bash
scp /path/to/conference-server.js azureuser@4.185.84.26:~/translation-app/
# Then restart server (see above)
```

## Available Dialplan Variants

### Current Active: AudioSocket for All Extensions
**File**: `/etc/asterisk/extensions.conf`
All extensions (5000, 6000, 7000) use AudioSocket TCP at 8kHz

### Alternative 1: ExternalMedia for Extension 7000 (Fixed Syntax)
**Source**: `/tmp/extensions-externalmedia-7000-fixed.conf`
Extension 7000 uses `Dial(ExternalMedia/ws://127.0.0.1:5050/mic/${PARTICIPANT_ID}/slin16)`
Requires WebSocket server running on port 5050

### Alternative 2: ARI Stasis for Extension 7000
**Source**: `/tmp/extensions-ari.conf`
Extension 7000 routes to Stasis app `translation-app` for programmatic control
Requires ARI client in Node.js application

## Known Issues & Fixes

### Issue 1: ExternalMedia Application Syntax
**Problem**: Using `ExternalMedia(...)` directly in dialplan fails
**Error**: "No application 'ExternalMedia' for extension"
**Fix**: Use `Dial(ExternalMedia/...)` - ExternalMedia is a channel driver, not an application

### Issue 2: AudioSocket Header Protocol
**Problem**: Original 2-byte header parsing caused frame sync issues
**Fix**: Updated to 3-byte header: `[type][length_high][length_low][payload]`
**File**: `/tmp/audiosocket-orchestrator-fixed.js`

### Issue 3: WebSocket vs AudioSocket Confusion
**Problem**: Multiple protocols attempted (WebSocket, AudioSocket, ARI)
**Current Solution**: Standardized on AudioSocket TCP (3-byte header) for all extensions
**Alternative**: WebSocket server available for 16kHz ExternalMedia if needed

## Performance Metrics

### Expected Performance
- **Latency**: <100ms total (network + ASR + MT + TTS)
- **Frame Rate**: 50 frames/second (20ms frames)
- **Bandwidth**: ~32 KB/s per call (bidirectional)
- **Concurrent Calls**: Supports multiple simultaneous extensions

### Monitoring Metrics
- Connection establishment time
- Frame processing rate
- Deepgram transcription latency
- DeepL translation latency
- ElevenLabs TTS synthesis time
- End-to-end latency

## Security Notes

### Current Security Status
- ⚠️ API keys hardcoded in environment variables (acceptable for testing)
- ⚠️ SIP passwords in plain text configs
- ⚠️ No HTTPS/TLS on Asterisk
- ⚠️ Public IP exposed (4.185.84.26)

### Production Recommendations
- Move API keys to Azure Key Vault or AWS Secrets Manager
- Enable TLS for PJSIP (port 5061)
- Use HTTPS for ARI (port 8089)
- Implement firewall rules (allow only necessary ports)
- Use environment variable files instead of command-line args
- Enable Asterisk security module

## Next Steps & Future Enhancements

### Immediate Tasks
- [ ] Test all three extensions with SIP phones
- [ ] Verify end-to-end translation pipeline
- [ ] Measure actual latency metrics
- [ ] Document any additional issues

### Future Enhancements
- [ ] Upgrade to Asterisk 20 for latest features
- [ ] Implement ExternalMedia for higher quality (16kHz)
- [ ] Add multi-language support beyond EN/JA
- [ ] Implement call recording
- [ ] Add web dashboard for monitoring
- [ ] Deploy Docker containerized version
- [ ] Add auto-scaling for multiple concurrent calls

## Troubleshooting Guide

### No Audio Received
1. Check Asterisk logs: `sudo tail -f /var/log/asterisk/messages`
2. Verify AudioSocket server is running: `ps aux | grep node`
3. Check port 5050 is listening: `sudo netstat -tlnp | grep 5050`
4. Test with echo extension 8888 first

### Transcription Not Working
1. Verify Deepgram API key is valid
2. Check Node.js logs: `tail -f ~/translation-app/translation-app.log`
3. Test Deepgram connection separately
4. Ensure 8kHz audio format is correct

### Translation Not Working
1. Check DeepL API key
2. Verify language pair is supported
3. Check Node.js logs for DeepL errors

### TTS Not Playing
1. Verify ElevenLabs API key
2. Check audio format matches Asterisk (8kHz slin)
3. Ensure AudioSocket bidirectional frames are sent correctly

## Contact & Support

**Project Location**: `/Users/sagivstavinsky/realtime-translation-enhanced_astrix`
**Azure VM**: azureuser@4.185.84.26
**Documentation**: See `ASTERISK-CONFIGURATION.md`, `README.md`, `IMPLEMENTATION_SUMMARY.md`
