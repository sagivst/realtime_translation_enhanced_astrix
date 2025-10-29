# Project Structure

## Complete File Tree

```
realtime-translation-enhanced_astrix/
├── Core Translation Services
│   ├── src/
│   │   ├── orchestrator/
│   │   │   └── frame-orchestrator.js (540 lines) - 20ms granularity event loop
│   │   ├── stt/
│   │   │   └── stt-service.js (267 lines) - Deepgram Nova-2 integration
│   │   ├── mt/
│   │   │   └── mt-service.js (319 lines) - DeepL with caching
│   │   ├── tts/
│   │   │   ├── xtts-service.py (285 lines) - Local TTS with voice embeddings
│   │   │   └── xtts-client.js - Node.js client
│   │   ├── voice-profiles/
│   │   │   └── voice-profile-manager.js (372 lines) - 320-D embeddings
│   │   ├── recovery/
│   │   │   ├── recovery-manager.js (715 lines) - 4-tier recovery system
│   │   │   └── recovery-manager.test.js (398 lines) - Full test suite
│   │   ├── metrics/
│   │   │   └── prometheus-exporter.js (429 lines) - 20+ metrics
│   │   └── sip-manager/
│   │       ├── sip-channel-manager.js (669 lines) - SIP/conference management
│   │       └── sip-channel-manager.test.js (473 lines) - Full test suite
│   │
│   ├── conference-server.js (355 lines) - Main server orchestration
│   └── public/ - Web interface
│
├── Asterisk Integration
│   ├── asterisk-modules/
│   │   └── chan_externalmedia/
│   │       ├── chan_externalmedia.c (764 lines) - Custom channel driver
│   │       ├── Makefile - Build system
│   │       └── README.md - Module documentation
│   │
│   └── asterisk-build/
│       └── asterisk-20.16.0/ - Downloaded source (build blocked on macOS)
│
├── Docker Deployment (NEW)
│   ├── Dockerfile - Translation service container
│   ├── asterisk-docker/
│   │   └── Dockerfile - Asterisk PBX container
│   ├── xtts-docker/
│   │   └── Dockerfile - XTTS service container
│   ├── docker-compose.yml - Multi-service orchestration
│   ├── docker-start.sh - Automated startup script
│   ├── .env.example - Environment template
│   ├── .dockerignore - Build optimization
│   └── requirements-xtts.txt - Python dependencies
│
├── Asterisk Configuration (NEW)
│   └── docker-config/
│       ├── asterisk/
│       │   ├── pjsip.conf - SIP configuration
│       │   ├── extensions.conf - Dialplan
│       │   └── confbridge.conf - Conference bridge settings
│       ├── prometheus/
│       │   └── prometheus.yml - Metrics scraping config
│       └── grafana/
│           └── datasources/
│               └── prometheus.yml - Grafana datasource
│
├── Testing
│   └── tests/
│       ├── integration.test.js (568 lines) - End-to-end integration tests
│       └── (component tests in respective src/ directories)
│
├── Documentation
│   ├── README.md - Project overview
│   ├── DEPLOYMENT.md (1,200 lines) - Complete deployment guide
│   ├── DOCKER_QUICKSTART.md (300 lines) - Docker quick start
│   ├── SESSION_PROGRESS.md (600+ lines) - Development progress
│   ├── COMPLETION_SUMMARY.md (NEW) - Achievement summary
│   ├── PROJECT_STRUCTURE.md (NEW) - This file
│   └── ARCHITECTURE.md - System architecture
│
├── Configuration
│   ├── package.json - Node.js dependencies
│   ├── .env.example - Environment variables template
│   └── voice-profiles/ - TTS voice embeddings
│
└── Development Environment
    └── venv-xtts/ - Python virtual environment (3.11)
```

## Docker Deployment Stack

```
Services:
  ├── asterisk (Port 5060, 10000-10100)
  │   └── Volumes: asterisk-media, asterisk-logs
  │
  ├── translation-service (Port 3000, 9090)
  │   └── Volumes: asterisk-media, voice-profiles
  │
  ├── xtts-service (Port 8000)
  │   └── Volumes: voice-profiles, xtts-models
  │
  ├── prometheus (Port 9091)
  │   └── Volumes: prometheus-data
  │
  └── grafana (Port 3001)
      └── Volumes: grafana-data

Shared Volumes:
  ├── asterisk-media - Named pipes for audio streaming
  ├── voice-profiles - TTS voice embeddings
  ├── xtts-models - TTS model cache
  ├── asterisk-logs - Asterisk logs
  ├── prometheus-data - Metrics database
  └── grafana-data - Dashboard configuration
```

## Key Components by Purpose

### Audio Processing Pipeline
```
1. Frame Orchestrator (src/orchestrator/frame-orchestrator.js)
   └── 5-Tier Queue System:
       ├── Input Buffer (raw PCM frames)
       ├── ASR Queue (frames awaiting STT)
       ├── MT Queue (transcripts awaiting translation)
       ├── TTS Queue (translations awaiting synthesis)
       └── Playback Queue (audio awaiting playback)
```

### SIP/Telephony
```
1. SIP Channel Manager (src/sip-manager/sip-channel-manager.js)
   ├── Endpoint registration
   ├── Channel lifecycle management
   ├── Conference bridge coordination
   └── Named pipe management

2. Asterisk Configuration (docker-config/asterisk/)
   ├── PJSIP endpoints
   ├── Translation dialplan
   └── Conference bridge settings

3. chan_externalmedia (asterisk-modules/chan_externalmedia/)
   └── Custom Asterisk module for PCM pipe handling
```

### Translation Services
```
1. STT Service (src/stt/stt-service.js)
   └── Deepgram Nova-2 integration

2. MT Service (src/mt/mt-service.js)
   └── DeepL with translation caching

3. TTS Service (src/tts/xtts-service.py)
   └── Local XTTS v2 with voice embeddings
```

### Reliability & Monitoring
```
1. Recovery Manager (src/recovery/recovery-manager.js)
   └── 4-tier recovery strategy

2. Prometheus Exporter (src/metrics/prometheus-exporter.js)
   └── 20+ metrics for comprehensive monitoring

3. Monitoring Stack (Docker)
   ├── Prometheus (metrics collection)
   └── Grafana (visualization)
```

## File Size Breakdown

| Category | Files | Lines | Percentage |
|----------|-------|-------|------------|
| JavaScript Core | 8 | 3,500 | 25% |
| JavaScript Tests | 3 | 1,439 | 10% |
| C (Asterisk) | 1 | 764 | 5% |
| Python (TTS) | 1 | 285 | 2% |
| Docker/Config | 15 | 500 | 4% |
| Documentation | 6 | 4,500 | 32% |
| **Total** | **40+** | **~14,252** | **100%** |

## Quick Navigation

### For Deployment
- **Docker Quick Start**: `DOCKER_QUICKSTART.md`
- **Full Deployment Guide**: `DEPLOYMENT.md`
- **Environment Setup**: `.env.example`
- **Startup Script**: `./docker-start.sh`

### For Development
- **Main Server**: `conference-server.js`
- **Frame Orchestrator**: `src/orchestrator/frame-orchestrator.js`
- **SIP Manager**: `src/sip-manager/sip-channel-manager.js`
- **Recovery System**: `src/recovery/recovery-manager.js`

### For Testing
- **Integration Tests**: `tests/integration.test.js`
- **Recovery Tests**: `src/recovery/recovery-manager.test.js`
- **SIP Manager Tests**: `src/sip-manager/sip-channel-manager.test.js`
- **Run All Tests**: `npm test` (after implementation)

### For Monitoring
- **Metrics Definition**: `src/metrics/prometheus-exporter.js`
- **Prometheus Config**: `docker-config/prometheus/prometheus.yml`
- **Access Metrics**: http://localhost:9090/metrics (after startup)
- **View Grafana**: http://localhost:3001 (after startup)

### For Configuration
- **Asterisk PJSIP**: `docker-config/asterisk/pjsip.conf`
- **Asterisk Dialplan**: `docker-config/asterisk/extensions.conf`
- **Conference Bridge**: `docker-config/asterisk/confbridge.conf`
- **Environment Variables**: `.env.example`

---

**Last Updated**: October 16, 2025 00:45 UTC
