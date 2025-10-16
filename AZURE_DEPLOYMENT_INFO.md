# Azure Deployment Information

This repository contains the code currently deployed on Azure for the Real-Time Translation system with Asterisk integration.

## Azure Resources

### 1. Azure App Service (Conference Server)
- **Name**: realtime-translation-1760218638
- **URL**: https://realtime-translation-1760218638.azurewebsites.net
- **Resource Group**: realtime-translation-rg
- **Runtime**: Node.js 20 LTS
- **Features**: WebSockets enabled, Socket.IO for real-time communication

### 2. Azure VM (Asterisk PBX)
- **Public IP**: 4.185.84.26
- **OS**: Ubuntu
- **Software**: Asterisk 18.10.0
- **Open Ports**:
  - 5060 UDP (SIP signaling)
  - 8088 TCP (ARI - Asterisk REST Interface)
  - 10000-10100 UDP (RTP audio)

## Configuration Files

### Asterisk Configuration (from Azure VM 4.185.84.26)
Located in `asterisk-configs/`:
- `sip.conf` - SIP endpoints configuration (chan_sip)
- `pjsip.conf` - PJSIP configuration
- `extensions.conf` - Dialplan (call routing)
- `ari.conf` - ARI user credentials
- `http.conf` - HTTP server for ARI

### Application Files
- `conference-server.js` - Main Node.js server with translation pipeline
- `asterisk-ari-handler.js` - Handles SIP calls via Asterisk ARI
- `package.json` - Node.js dependencies

## SIP Extensions

### Working Extensions
- **1001, 1002** - Direct SIP endpoints (working with bidirectional audio)
- **1000** - Basic ConfBridge conference (no translation)
- **8888** - Echo test

### Translation Extensions (via ARI)
- **2000** - English translation room (Stasis app)
- **2001** - Spanish translation room (Stasis app)
- **2002** - French translation room (Stasis app)

## Translation Pipeline

Current implementation:
- **STT**: Deepgram API
- **MT**: DeepL API  
- **TTS**: ElevenLabs API

## Current Status

✓ **Working**:
- Azure App Service running Node.js conference server
- Asterisk VM with SIP registration
- Basic conference calls (extension 1000)
- Web-based translation (browser clients)
- ARI connection established

⚠️ **In Progress**:
- SIP translation pipeline (extensions 2000-2002 accept calls but don't translate)
- Full implementation requires chan_externalmedia module per HAsterisk_HumeEVI_Spec.md

## Repository Contents

This repository was created on 2025-10-16 by downloading:
1. **Node.js application files** from the working local deployment
2. **Asterisk configuration files** from Azure VM 4.185.84.26

All files represent the current state of the Azure deployment.
