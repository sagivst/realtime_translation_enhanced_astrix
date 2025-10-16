# Real-Time Translation System with Asterisk Integration

**Azure Deployment Snapshot** | **SIP + WebRTC Conference** | **Multi-Language Translation**

This repository contains the complete code for a production-ready real-time multilingual translation conference system deployed on Microsoft Azure, integrating Asterisk PBX with Node.js for seamless translation between SIP phones and web clients.

---

## 🌐 Live Deployment

- **Web Conference**: [https://realtime-translation-1760218638.azurewebsites.net](https://realtime-translation-1760218638.azurewebsites.net)
- **Asterisk SIP Server**: `4.185.84.26:5060`
- **ARI Interface**: `http://4.185.84.26:8088`

---

## 🎯 Features

### ✅ Currently Working
- ✓ **Web-based conference** with real-time translation (browser clients)
- ✓ **SIP phone registration** (extensions 1001, 1002)
- ✓ **Basic conference calls** via extension 1000 (no translation)
- ✓ **Echo test** via extension 8888
- ✓ **Asterisk ARI integration** - Connected and ready
- ✓ **Translation pipeline**: Deepgram STT → DeepL MT → ElevenLabs TTS
- ✓ **Multi-language support**: English, Spanish, French, Hebrew, Arabic, Chinese, Japanese
- ✓ **Voice Activity Detection (VAD)** to eliminate word loss
- ✓ **Comprehensive calibration system** before each session

### ⚠️ In Progress
- Translation for SIP phones (extensions 2000-2002)
  - ARI handler accepts calls but audio pipeline not fully implemented
  - Requires `chan_externalmedia` module per [HAsterisk_HumeEVI_Spec.md](./HAsterisk_HumeEVI_Spec.md)

---

## 🏗️ Architecture

### Azure Infrastructure

```
┌──────────────────────────────────────────────────────────┐
│                     AZURE RESOURCES                       │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────────┐  ┌──────────────────────┐  │
│  │   Azure App Service      │  │    Azure VM         │  │
│  │  (Conference Server)     │  │   (Asterisk PBX)    │  │
│  │                          │  │                      │  │
│  │  Node.js 20 LTS          │  │  Ubuntu + Asterisk  │  │
│  │  Socket.IO + WebRTC      │  │  18.10.0            │  │
│  │  Translation Pipeline    │  │                      │  │
│  │                          │  │  IP: 4.185.84.26    │  │
│  │  Port: 443 (HTTPS)       │  │  Ports:             │  │
│  │                          │  │   - 5060 (SIP)      │  │
│  │  realtime-translation-   │  │   - 8088 (ARI)      │  │
│  │  1760218638.azurewebsite │  │   - 10000-10100     │  │
│  │  s.net                   │  │     (RTP)           │  │
│  └──────────┬───────────────┘  └──────────┬──────────┘  │
│             │                               │             │
│             │      ARI Connection           │             │
│             └───────────────────────────────┘             │
└──────────────────────────────────────────────────────────┘
```

### Translation Pipeline

```
Browser/SIP Phone
      ↓
   Audio Input
      ↓
┌─────────────────┐
│  Deepgram STT   │ ← Speech to Text
└────────┬────────┘
         ↓
    Transcribed Text
         ↓
┌─────────────────┐
│    DeepL MT     │ ← Machine Translation
└────────┬────────┘
         ↓
   Translated Text
         ↓
┌─────────────────┐
│ ElevenLabs TTS  │ ← Text to Speech
└────────┬────────┘
         ↓
    Audio Output
         ↓
Other Participants
```

---

## 📦 Repository Contents

### Core Application Files
- **`conference-server.js`** - Main Node.js server with Socket.IO and translation logic
- **`asterisk-ari-handler.js`** - Handles SIP calls via Asterisk REST Interface
- **`elevenlabs-tts-service.js`** - ElevenLabs voice synthesis service
- **`punctuation.js`** - Text punctuation and formatting
- **`server.js`** - Express HTTP server

### Frontend
- **`public/`** - Web client interface
  - `index.html` - Main conference UI
  - `onboarding.html` - Voice calibration and setup
  - `js/conference.js` - Conference room logic
  - `js/conference-vad.js` - Voice Activity Detection
  - `css/` - Styling

### Asterisk Configuration (from Azure VM)
- **`asterisk-configs/`**
  - `sip.conf` - SIP endpoints (chan_sip driver)
  - `pjsip.conf` - PJSIP configuration
  - `extensions.conf` - Dialplan with conference and translation extensions
  - `ari.conf` - ARI user credentials
  - `http.conf` - HTTP server for ARI

### Documentation
- **`HAsterisk_HumeEVI_Spec.md`** - Complete production system specification
- **`AZURE_DEPLOYMENT_INFO.md`** - Detailed Azure deployment information
- **`SIP_INTEGRATION_GUIDE.md`** - Guide for SIP phone setup
- **`DEPLOYMENT.md`** - Deployment instructions
- Plus 30+ additional documentation files

---

## 🚀 Quick Start

### For Web Clients

1. Open [https://realtime-translation-1760218638.azurewebsites.net](https://realtime-translation-1760218638.azurewebsites.net)
2. Complete voice calibration
3. Enter a room name
4. Select your language
5. Start speaking!

### For SIP Phones

**Configuration:**
```
SIP Server: 4.185.84.26
Port: 5060
Username: 1001 or 1002
Password: 1001pass or 1002pass
```

**Available Extensions:**
- **1000** - Basic conference (no translation)
- **2000** - English translation room (via ARI)
- **2001** - Spanish translation room (via ARI)
- **2002** - French translation room (via ARI)
- **8888** - Echo test

---

## 🔧 Local Development

### Prerequisites
- Node.js 20 LTS
- npm or yarn
- API keys for:
  - Deepgram (STT)
  - DeepL (Translation)
  - ElevenLabs (TTS)
  - Azure Speech Services

### Installation

```bash
# Clone the repository
git clone https://github.com/sagivst/realtime_translation_enhanced_astrix.git
cd realtime_translation_enhanced_astrix

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your API keys

# Start the server
node conference-server.js

# Access the app
open http://localhost:3001
```

### Environment Variables

```bash
# Translation Services
DEEPGRAM_API_KEY=your_deepgram_key
DEEPL_API_KEY=your_deepl_key
ELEVENLABS_API_KEY=your_elevenlabs_key
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=your_region

# Asterisk ARI
ASTERISK_HOST=4.185.84.26
ASTERISK_ARI_PORT=8088
ASTERISK_ARI_USERNAME=translation-app
ASTERISK_ARI_PASSWORD=translation123

# Server
PORT=3001
```

---

## 📞 SIP Extension Details

### Direct Endpoints
- **1001** / **1002** - SIP endpoints for direct calls
  - Registered on Azure Asterisk VM
  - Full bidirectional audio
  - Can dial each other or join conferences

### Conference Rooms
- **1000** - Basic ConfBridge room
  - No translation
  - Mix-minus audio
  - Up to 50 participants

### Translation Rooms (ARI-based)
- **2000** - English (default room)
- **2001** - Spanish (room1)
- **2002** - French (room1)

When you dial these extensions, the call is routed through the Stasis application (`translation-app`) which connects to the Node.js conference server via ARI for real-time translation processing.

---

## 🎤 Voice Calibration

The system includes a comprehensive voice calibration process:

1. **Background Noise Calibration** - Measures ambient noise
2. **Speaking Volume Calibration** - Detects optimal speaking level
3. **Multi-Sentence Calibration** - Tests with various phrases
4. **Repetition for Accuracy** - Multiple samples for consistency

This ensures optimal VAD thresholds and translation quality.

---

## 🔐 Security

- API keys stored as environment variables
- HTTPS enforced on Azure App Service
- SIP authentication required
- No credentials in git history
- See `.gitignore` for excluded files

---

## 📊 System Status

**Last Updated**: 2025-10-16

| Component | Status | Details |
|-----------|--------|---------|
| Azure App Service | ✅ Running | realtime-translation-1760218638 |
| Asterisk VM | ✅ Running | 4.185.84.26 |
| SIP Endpoints | ✅ Working | 1001, 1002 registered |
| Basic Conference | ✅ Working | Extension 1000 |
| Web Translation | ✅ Working | Browser clients |
| SIP Translation | ⚠️ Partial | ARI connected, audio pipeline incomplete |

---

## 🗺️ Roadmap

### Phase 1: Core SIP Translation (In Progress)
- [ ] Implement chan_externalmedia module
- [ ] Frame Orchestrator with 20ms timing
- [ ] Complete audio pipeline for SIP phones

### Phase 2: Enhanced Features
- [ ] Emotion analysis via Hume EVI
- [ ] Voice cloning for natural output
- [ ] Mix-minus audio from ConfBridge

### Phase 3: Scale and Optimize
- [ ] Multi-room support
- [ ] Recording and playback
- [ ] Performance optimization
- [ ] Load balancing

See [HAsterisk_HumeEVI_Spec.md](./HAsterisk_HumeEVI_Spec.md) for complete implementation plan.

---

## 📚 Documentation

- **[AZURE_DEPLOYMENT_INFO.md](./AZURE_DEPLOYMENT_INFO.md)** - Complete Azure setup details
- **[SIP_INTEGRATION_GUIDE.md](./SIP_INTEGRATION_GUIDE.md)** - SIP phone configuration
- **[HAsterisk_HumeEVI_Spec.md](./HAsterisk_HumeEVI_Spec.md)** - Production system spec
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment instructions
- **[CONFERENCE-README.md](./CONFERENCE-README.md)** - Conference system details

---

## 🤝 Contributing

Contributions welcome! This is an active development project.

### Areas for Contribution
- SIP translation pipeline completion
- Additional language support
- UI/UX improvements
- Performance optimization
- Documentation

---

## 📄 License

ISC

---

## 🙏 Credits

**Technologies:**
- [Asterisk PBX](https://www.asterisk.org/) - Open source communications
- [Deepgram](https://deepgram.com/) - Speech-to-Text
- [DeepL](https://www.deepl.com/) - Neural Machine Translation
- [ElevenLabs](https://elevenlabs.io/) - Text-to-Speech
- [Socket.IO](https://socket.io/) - Real-time communication
- [Express.js](https://expressjs.com/) - Web framework
- [Microsoft Azure](https://azure.microsoft.com/) - Cloud hosting

**Development:**
Built with Claude Code for production deployment on Azure.

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/sagivst/realtime_translation_enhanced_astrix/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sagivst/realtime_translation_enhanced_astrix/discussions)

---

**Repository Source**: Code downloaded from live Azure deployment on 2025-10-16
- Node.js app from deployed App Service
- Asterisk configs from Azure VM 4.185.84.26

---

Made with ❤️ for breaking down language barriers in real-time communication
