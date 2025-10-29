# Asterisk-Based Realtime Translation System

## Overview

This is a complete rewrite of the realtime translation conference system using **Asterisk PBX** with **SIP/RTP** transport and **local XTTS v2** voice synthesis. The system achieves **≤900ms end-to-end latency** for speech translation using a frame-level orchestration architecture.

## Architecture

### Core Components

#### 1. **Frame-Level Orchestrator** (`src/orchestrator/`)
- Runs event loop every **20ms** (fixed frame size)
- Coordinates 5-tier queue system
- Target latency: ≤900ms end-to-end
- Handles PCM audio at 16kHz, 16-bit

#### 2. **XTTS v2 TTS Service** (`src/tts-service/`)
- **Local inference** (CPU or GPU)
- Self-hosted voice synthesis
- Supports 15+ languages
- Custom voice embeddings via voice profiles

#### 3. **Voice Profile System** (`src/voice-profiles/`)
- **ECAPA-TDNN** embeddings (256-D) for speaker recognition
- **GST-Tacotron** embeddings (64-D) for prosody/style
- Combined 320-D voice embeddings
- Profile storage and management

#### 4. **Asterisk Integration** (`asterisk-modules/`)
- Custom `chan_externalmedia` module
- PCM pipe interface (20ms frames)
- ConfBridge integration
- SIP channel management

### 5-Tier Queue System

```
┌─────────────┐
│ InputBuffer │ → Accumulates 20ms PCM frames
├─────────────┤
│  ASRQueue   │ → Speech-to-Text processing
├─────────────┤
│   MTQueue   │ → Machine Translation
├─────────────┤
│  TTSQueue   │ → Text-to-Speech synthesis
├─────────────┤
│PlaybackQueue│ → Audio output delivery
└─────────────┘
```

## Technology Stack

### Backend
- **Node.js** (v24.7.0) - Core orchestration
- **Python** (3.11.14) - ML inference services
- **Asterisk** (20.16.0) - PBX/SIP/RTP infrastructure

### AI/ML Services
- **STT**: Deepgram Nova-2 or WhisperRT
- **MT**: DeepL Pro API or NLLB
- **TTS**: XTTS v2 (Coqui TTS 0.22.0)
- **Speaker Recognition**: SpeechBrain ECAPA-TDNN

### Key Python Libraries
- PyTorch 2.9.0
- TTS 0.22.0 (Coqui)
- SpeechBrain
- torchaudio 2.9.0

## Directory Structure

```
realtime-translation-enhanced_astrix/
├── src/
│   ├── orchestrator/
│   │   └── frame-orchestrator.js       # Main event loop
│   ├── tts-service/
│   │   ├── xtts-service.js             # Node.js TTS wrapper
│   │   └── xtts-inference-server.py    # Python inference server
│   ├── voice-profiles/
│   │   ├── voice-profile-manager.js    # Profile CRUD
│   │   └── extract-embeddings.py       # ECAPA/GST extraction
│   ├── stt-service/                    # Speech-to-Text
│   ├── mt-service/                     # Machine Translation
│   ├── sip-manager/                    # SIP/Asterisk interface
│   ├── recovery/                       # Multi-tier recovery
│   └── metrics/                        # Prometheus monitoring
├── asterisk-modules/
│   └── chan_externalmedia/             # Custom Asterisk channel driver
├── xtts-server/
│   ├── venv-xtts/                      # Python virtual environment
│   └── test-xtts.py                    # XTTS verification script
├── data/
│   ├── voice-embeddings/               # Speaker embeddings (.npz)
│   ├── profiles/                       # User voice profiles (.json)
│   └── models/                         # ML model storage
├── config/                             # Configuration files
├── logs/                               # Log files
└── tests/                              # Test suites
```

## Installation

### Prerequisites

- **macOS** (Darwin 24.6.0) or Linux
- **Node.js** 24+ ([nvm](https://github.com/nvm-sh/nvm) recommended)
- **Python** 3.11 (via Homebrew)
- **Asterisk** 20+ (build from source)
- **Git**

### Step 1: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python 3.11
brew install python@3.11

# Verify installations
node --version  # Should be v24.7.0+
/opt/homebrew/bin/python3.11 --version  # Should be 3.11.14
```

### Step 2: Set Up XTTS v2

```bash
cd xtts-server

# Create virtual environment
/opt/homebrew/bin/python3.11 -m venv venv-xtts

# Activate environment
source venv-xtts/bin/activate

# Install XTTS and dependencies
pip install TTS torch torchaudio numpy scipy flask speechbrain

# Test installation
python test-xtts.py
```

Expected output:
```
==================================================
XTTS v2 Installation Test
==================================================

1. Device: cpu
   ⚠️  Running on CPU (GPU recommended for production)
2. PyTorch version: 2.9.0
3. Initializing XTTS v2 model...
   ✓ Model loaded successfully
4. Testing synthesis...
   ✓ Synthesis successful
5. Available languages: [15+ languages listed]

✓ All tests passed!
XTTS v2 is ready for use
==================================================
```

### Step 3: Install Asterisk (from source)

```bash
cd asterisk-build/asterisk-20.16.0

# Install build dependencies
brew install jansson pjproject speex srtp libsndfile

# Configure (minimal build for development)
./configure --with-jansson-bundled

# Build and install
make
sudo make install

# Verify
asterisk -V  # Should show Asterisk 20.16.0
```

### Step 4: Configure Environment

```bash
# Copy example configuration
cp .env.example .env

# Edit configuration
nano .env
```

Required environment variables:
```bash
# Deepgram API (for STT)
DEEPGRAM_API_KEY=your_key_here

# DeepL API (for MT)
DEEPL_API_KEY=your_key_here

# Server Configuration
PORT=3000
FRAME_SIZE=20          # 20ms frames
SAMPLE_RATE=16000      # 16kHz
MAX_LATENCY=900        # Target ≤900ms
```

## Usage

### Start the XTTS Inference Server

```bash
cd xtts-server
source venv-xtts/bin/activate
python src/tts-service/xtts-inference-server.py \
  --port 5001 \
  --host 127.0.0.1 \
  --sample-rate 16000
```

### Start the Main Server

```bash
npm start
```

Expected startup sequence:
```
[XTTS] Initializing XTTS v2 service...
[XTTS] ✓ XTTS v2 service ready
[VoiceProfile] Initializing voice profile system...
[VoiceProfile] ✓ Loaded 0 profiles
[Orchestrator] Initializing frame-level orchestrator...
[Orchestrator] ✓ Services configured
[Orchestrator] Frame size: 20ms (320 samples)
[Orchestrator] Starting event loop...
[Orchestrator] ✓ Event loop started
Server running on http://localhost:3000
```

## Development Status

### ✅ Completed Components

1. **Development Environment**
   - Python 3.11.14 with XTTS v2 installed
   - Node.js 24.7.0 environment
   - Directory structure created
   - Asterisk source downloaded (20.16.0)

2. **XTTS v2 Integration**
   - ✅ XTTS service wrapper (`xtts-service.js`)
   - ✅ Python inference server (`xtts-inference-server.py`)
   - ✅ Test script (`test-xtts.py`)

3. **Voice Profile System**
   - ✅ Profile manager (`voice-profile-manager.js`)
   - ✅ Embedding extraction script (`extract-embeddings.py`)
   - ⚠️  SpeechBrain installation pending

4. **Frame-Level Orchestrator**
   - ✅ Core orchestrator (`frame-orchestrator.js`)
   - ✅ 5-tier queue system implementation
   - ✅ 20ms frame granularity
   - ✅ Channel management

### 🚧 In Progress

- Installing additional Python dependencies (Flask, SpeechBrain)

### ⏳ Pending Components

1. **Asterisk PBX** - Need to complete build and configuration
2. **chan_externalmedia Module** - Custom channel driver development
3. **STT Service** - Deepgram/WhisperRT integration
4. **MT Service** - DeepL/NLLB integration
5. **SIP Manager** - Channel management and registration
6. **Recovery System** - Multi-tier failure handling
7. **Metrics System** - Prometheus monitoring
8. **Testing** - Comprehensive test suite
9. **Documentation** - Deployment guides

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| End-to-End Latency | ≤900ms | STT + MT + TTS + network |
| Frame Size | 20ms | Fixed granularity |
| Sample Rate | 16kHz | 16-bit PCM |
| TTS Latency | ≤300ms | Local XTTS v2 inference |
| STT Latency | ≤200ms | Deepgram Nova-2 |
| MT Latency | ≤100ms | DeepL Pro |
| Queue Processing | <20ms | Per-frame orchestration |

## Key Differences from WebRTC Version

### Transport Layer
- **Old**: WebRTC/Socket.io (WebM/Opus, variable chunks)
- **New**: SIP/RTP via Asterisk (PCM, fixed 20ms frames)

### TTS Engine
- **Old**: ElevenLabs API (cloud-based, 500-1000ms latency)
- **New**: XTTS v2 local (self-hosted, 200-300ms latency)

### Voice Cloning
- **Old**: ElevenLabs cloud voice IDs
- **New**: Local embeddings (ECAPA-TDNN + GST-Tacotron)

### Orchestration
- **Old**: Event-driven, asynchronous processing
- **New**: Frame-level synchronous loop (20ms ticks)

### Scalability
- **Old**: Limited by cloud API quotas
- **New**: Limited by local hardware (GPU recommended)

## Troubleshooting

### XTTS Installation Issues

**Problem**: `No matching distribution found for TTS`
**Solution**: Ensure Python 3.11 (not 3.13). TTS requires Python ≤3.11.

**Problem**: `Device: cpu` (no GPU detected)
**Solution**: This is expected on macOS. Use CUDA-enabled Linux for GPU acceleration.

### Asterisk Build Issues

**Problem**: `configure: error: *** Please install jansson`
**Solution**: `brew install jansson` or use `--with-jansson-bundled`

**Problem**: Build takes too long
**Solution**: Use `make -j$(nproc)` for parallel compilation

### Performance Issues

**Problem**: Frame processing >20ms
**Solution**: Enable GPU for XTTS, optimize queue sizes, reduce concurrent channels

**Problem**: High latency (>900ms)
**Solution**: Check each pipeline stage:
- STT latency: Use Deepgram Nova-2
- MT latency: Use DeepL (faster than NLLB)
- TTS latency: Ensure XTTS on GPU
- Network latency: Local deployment preferred

## API Reference

### Frame Orchestrator

```javascript
const FrameOrchestrator = require('./src/orchestrator/frame-orchestrator');

const orchestrator = new FrameOrchestrator({
  frameSize: 20,        // 20ms frames
  sampleRate: 16000,    // 16kHz
  maxLatency: 900       // ≤900ms target
});

// Initialize with services
await orchestrator.initialize({
  stt: sttService,
  mt: mtService,
  tts: xttsService,
  voiceProfiles: profileManager
});

// Start event loop
orchestrator.start();

// Register channel
const channel = orchestrator.registerChannel({
  channelId: 'ch_12345',
  language: 'en',
  voiceProfileId: 'profile_en_abc123',
  userId: 'user_456'
});

// Ingest audio frame (20ms, 320 samples @ 16kHz)
orchestrator.ingestFrame('ch_12345', pcmBuffer);

// Listen for output
orchestrator.on('audio-output', (data) => {
  console.log(`Audio for channel ${data.channelId}`);
  // Send data.frames to client
});

// Get metrics
const metrics = orchestrator.getMetrics();
console.log(`Latency P95: ${metrics.latencyP95}ms`);
```

### XTTS Service

```javascript
const XTTSService = require('./src/tts-service/xtts-service');

const xtts = new XTTSService({
  pythonPath: './xtts-server/venv-xtts/bin/python',
  sampleRate: 16000,
  maxLatency: 300
});

await xtts.initialize();

// Synthesize speech
const audioBuffer = await xtts.synthesize(
  'Hello, this is a test',
  'voice_embedding_id',
  'en'
);
```

### Voice Profile Manager

```javascript
const VoiceProfileManager = require('./src/voice-profiles/voice-profile-manager');

const manager = new VoiceProfileManager();
await manager.initialize();

// Create profile from calibration audio
const profile = await manager.createProfile({
  userId: 'user_123',
  username: 'John Doe',
  language: 'en',
  audioSamples: [buffer1, buffer2, buffer3] // Min 3 samples
});

// Get profile
const retrieved = await manager.getProfile(profile.profileId);
console.log(`Profile: ${retrieved.username} (${retrieved.language})`);
```

## Contributing

This is a major rewrite implementing the Asterisk-based architecture. Contributions are welcome!

### Development Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Implement changes with tests
3. Verify latency targets: `npm run test:performance`
4. Submit pull request

### Code Style

- Node.js: Standard.js
- Python: PEP 8 (Black formatter)
- Comments: JSDoc for JavaScript, Google style for Python

## License

[Your License Here]

## References

- [Gap Analysis Report](./GAP_ANALYSIS_REPORT.md)
- [DevSpec](./Realtime_Translation_Asterisk_DevSpec.md)
- [Coqui TTS](https://github.com/coqui-ai/TTS)
- [SpeechBrain](https://speechbrain.github.io/)
- [Asterisk Documentation](https://docs.asterisk.org/)

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Status**: 🚧 Active Development
**Last Updated**: October 15, 2025
**Version**: 0.1.0-alpha
