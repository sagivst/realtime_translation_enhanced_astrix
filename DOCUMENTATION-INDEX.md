# Documentation Index

**Project**: Real-time Translation with Asterisk
**Last Updated**: 2025-10-19

## 📚 Primary Documentation Files

### 1. CURRENT-SYSTEM-STATE.md ⭐
**Path**: `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/CURRENT-SYSTEM-STATE.md`

**Purpose**: Complete overview of the current deployed system

**Contents**:
- System architecture diagram
- Azure VM deployment information
- Active components and services
- Current extensions configuration (5000, 6000, 7000, 8888)
- AudioSocket protocol details
- API services configuration
- File locations (local and remote)
- Testing accounts and procedures
- Operational commands
- Alternative configurations available
- Known issues and fixes
- Performance metrics
- Security notes
- Troubleshooting guide

**Use this for**: Understanding the complete current state of the system

---

### 2. ASTERISK-CONFIGURATION.md ⭐
**Path**: `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/ASTERISK-CONFIGURATION.md`

**Purpose**: Complete Asterisk configuration reference

**Contents**:
- Current deployment information (Azure VM, Asterisk version)
- Extension configurations (5000, 6000, 7000, 8888)
- AudioSocket protocol specification (3-byte header)
- Audio format details (8kHz, 16-bit PCM)
- PJSIP configuration (user1, user2)
- ARI configuration
- HTTP configuration
- Available dialplan configurations in /tmp
- Asterisk service management commands
- File locations on Azure VM
- Testing procedures
- Monitoring commands
- SIP phone configuration

**Use this for**: Asterisk-specific configuration details and troubleshooting

---

### 3. DEPLOYMENT-STATUS.md
**Path**: `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/DEPLOYMENT-STATUS.md`

**Purpose**: Deployment status and quick reference

**Contents**:
- Successfully deployed components
- Active configuration summary
- Service endpoints
- File locations
- Quick start commands
- Testing procedures
- System status
- Alternative configurations
- Cost information
- Security notes

**Use this for**: Quick deployment status check and common commands

---

### 4. IMPLEMENTATION_SUMMARY.md
**Path**: `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/IMPLEMENTATION_SUMMARY.md`

**Purpose**: Original implementation documentation for per-participant uplink streaming

**Contents**:
- Original implementation overview
- ConfBridge configuration (16kHz)
- Extension 7000 dialplan (ExternalMedia + ConfBridge)
- WebSocket orchestrator details
- Deepgram configuration
- Architecture diagram
- Audio format details
- Installation and testing instructions
- Files created/modified
- Integration options
- Verification checklist

**Use this for**: Understanding the original ExternalMedia/WebSocket implementation design

---

### 5. README.md
**Path**: `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/README.md`

**Purpose**: Project overview and general information

**Contents**:
- Project features
- Prerequisites
- Installation instructions
- Running the application
- Usage guide
- Project structure
- How it works (client and server side)
- Supported languages
- Browser compatibility
- Customization options
- Troubleshooting
- API endpoints
- Development setup

**Use this for**: General project information and getting started

---

## 🗂️ Configuration Files (in /tmp)

### extensions-audiosocket-7000.conf ⭐ (Currently Active)
**Path**: `/tmp/extensions-audiosocket-7000.conf`

All extensions (5000, 6000, 7000) use AudioSocket TCP protocol at 8kHz

### extensions-externalmedia-7000.conf
**Path**: `/tmp/extensions-externalmedia-7000.conf`

Extension 7000 uses ExternalMedia application syntax (incorrect - for reference only)

### extensions-externalmedia-7000-fixed.conf
**Path**: `/tmp/extensions-externalmedia-7000-fixed.conf`

Extension 7000 uses correct Dial(ExternalMedia/...) syntax for 16kHz WebSocket

### extensions-ari.conf
**Path**: `/tmp/extensions-ari.conf`

Extension 7000 routes to Stasis application for ARI programmatic control

### audiosocket-orchestrator-fixed.js
**Path**: `/tmp/audiosocket-orchestrator-fixed.js`

Standalone AudioSocket server with corrected 3-byte header protocol

---

## 📁 Project Structure

```
/Users/sagivstavinsky/realtime-translation-enhanced_astrix/
├── DOCUMENTATION-INDEX.md              # ⭐ This file
├── CURRENT-SYSTEM-STATE.md             # ⭐ Complete system state
├── ASTERISK-CONFIGURATION.md           # ⭐ Asterisk configs
├── DEPLOYMENT-STATUS.md                # Deployment status
├── IMPLEMENTATION_SUMMARY.md           # Original implementation
├── README.md                           # Project overview
├── CHANGELOG.md                        # Change history
├── QUICKSTART.md                       # Quick start guide
├── CONFERENCE-README.md                # Conference features
├── CONFERENCE-QUICKSTART.md            # Conference quick start
├── AZURE-DEPLOYMENT.md                 # Azure deployment guide
├── DEPLOYMENT.md                       # General deployment
│
├── src/
│   ├── asterisk-websocket-server.js    # WebSocket server (16kHz)
│   ├── audiosocket-orchestrator-fixed.js   # AudioSocket server (8kHz)
│   └── conference-server.js            # Main server
│
├── package.json                        # Dependencies
├── .env                                # Environment variables
│
└── /tmp/                               # Temporary config files
    ├── extensions-audiosocket-7000.conf
    ├── extensions-externalmedia-7000.conf
    ├── extensions-externalmedia-7000-fixed.conf
    ├── extensions-ari.conf
    └── audiosocket-orchestrator-fixed.js
```

---

## 🚀 Quick Navigation by Task

### I want to understand the current system
→ Read **CURRENT-SYSTEM-STATE.md**

### I need to configure Asterisk
→ Read **ASTERISK-CONFIGURATION.md**

### I want to check deployment status
→ Read **DEPLOYMENT-STATUS.md**

### I need to understand the original design
→ Read **IMPLEMENTATION_SUMMARY.md**

### I'm new to the project
→ Read **README.md**

### I want to test the system
→ See testing sections in **ASTERISK-CONFIGURATION.md** or **CURRENT-SYSTEM-STATE.md**

### I need to deploy changes
→ See deployment commands in **DEPLOYMENT-STATUS.md**

### I'm troubleshooting issues
→ See troubleshooting sections in **CURRENT-SYSTEM-STATE.md** and **ASTERISK-CONFIGURATION.md**

### I want to switch to ExternalMedia
→ Use **extensions-externalmedia-7000-fixed.conf** from /tmp

### I want to monitor the system
→ See monitoring commands in **DEPLOYMENT-STATUS.md** and **ASTERISK-CONFIGURATION.md**

---

## 📞 Quick Reference

### Azure VM
- **IP**: 4.185.84.26
- **User**: azureuser
- **SSH**: `ssh azureuser@4.185.84.26`

### Asterisk
- **Version**: 18.10.0
- **Extensions**: 5000, 6000, 7000, 8888
- **Users**: user1 (SecurePass123!), user2 (SecurePass456!)

### Node.js Server
- **Port**: 5050 (AudioSocket TCP)
- **Log**: `/home/azureuser/translation-app/translation-app.log`

### Current Configuration
- **Protocol**: AudioSocket TCP (3-byte header)
- **Audio**: 8kHz, 16-bit PCM (slin)
- **Frame Size**: 320 bytes (20ms)

---

## 🔄 Version History

- **2025-10-19**: Created comprehensive documentation index
  - Added CURRENT-SYSTEM-STATE.md
  - Added ASTERISK-CONFIGURATION.md
  - Updated DEPLOYMENT-STATUS.md
  - Added this index file

---

## 📝 Notes

- All documentation reflects the system state as of 2025-10-19
- Configuration files in /tmp are alternatives to the current active config
- The active configuration uses AudioSocket TCP for all extensions
- ExternalMedia and ARI configurations are available but not currently deployed
- API keys are configured in environment variables on the Azure VM
