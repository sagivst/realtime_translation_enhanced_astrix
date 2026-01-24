# NEW Monitoring System - Complete Technical Documentation

Generated: 2026-01-12 UTC
System Version: Production (Restored from backup 2026-01-12)

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Directory Structure](#directory-structure)
4. [Components](#components)
5. [Database Schema](#database-schema)
6. [Data Flow](#data-flow)
7. [API Documentation](#api-documentation)
8. [AI Optimizer Agent](#ai-optimizer-agent)
9. [Configuration](#configuration)
10. [Dependencies](#dependencies)
11. [Deployment](#deployment)

## System Overview

The NEW Monitoring System is a real-time audio processing and metrics collection framework designed for the translation pipeline. It operates on 5-second bucket intervals, collecting metrics, audio samples, and system configuration (knobs) for AI optimization.

### Key Features
- Real-time audio processing with PRE/POST tap points
- 5-second aggregation buckets for metrics
- Automatic trace creation and management
- Audio recording and indexing
- Dynamic knob (configuration) management
- PostgreSQL persistence with foreign key integrity
- Backpressure handling for high-volume data

### System Boundaries
- **Input**: UDP audio streams on ports 6120 (ext 3333) and 6123 (ext 4444)
- **Processing**: Node.js event-driven architecture
- **Storage**: PostgreSQL database (monitoring_v2)
- **Output**: Metrics API on port 3020

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        UDP Audio Input                          │
│                   Port 6120          Port 6123                  │
│                  (Ext 3333)         (Ext 4444)                  │
└─────────────────┬─────────────────────┬────────────────────────┘
                  │                     │
                  ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STTTTSserver.js (Main)                       │
│  - UDP Socket Management                                        │
│  - Audio Frame Processing                                       │
│  - Translation Pipeline Integration                             │
└─────────────────┬────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│           MonitoringStationsBootstrap.js                        │
│  - Component Initialization                                     │
│  - Dependency Injection                                         │
│  - Service Orchestration                                        │
└─────────────────┬────────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┬──────────┬──────────┐
        ▼                   ▼          ▼          ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Station      │  │   Audio      │  │   Bridge     │  │  Optimizer   │
│  Handlers     │  │  Components  │  │  Components  │  │  Components  │
├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤
│ St_Handler_   │  │ AudioRecorder│  │ MetricsEmitter│ │ BucketScheduler│
│ Generic       │  │ AudioWriter  │  │ DatabaseBridge│ │ OptimizerAPI  │
│ Station3_3333 │  │              │  │ Backpressure │  │ AI Agent:3090 │
│ Station3_4444 │  │              │  │              │  │               │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
        │                   │                │                 │
        └───────────────────┴────────────────┴─────────────────┘
                                    │
                                    ▼
                    ┌──────────────────────────────┐
                    │     PostgreSQL Database      │
                    │      (monitoring_v2)         │
                    └──────────────────────────────┘
```

## Directory Structure

```
Monitoring_Stations/
├── MonitoringStationsBootstrap.js    # Main entry point and orchestrator
├── audio/                             # Audio processing components
│   ├── AudioRecorder.js              # Captures and buffers audio frames
│   └── AudioWriter.js                 # Writes audio segments to disk
├── bridge/                            # Database and communication layer
│   ├── DatabaseBridge.js             # PostgreSQL interface with trace creation
│   ├── MetricsEmitter.js             # Async metrics batch processor
│   └── BackpressurePolicy.js         # Queue management and overflow handling
├── config/                            # Configuration files
│   └── monitoring.config.json        # System configuration
├── station/                           # Station-specific processing
│   ├── generic/                      # Base station functionality
│   │   ├── St_Handler_Generic.js     # Base handler class
│   │   ├── Aggregator.js             # 5-second bucket aggregation
│   │   ├── MetricsRegistry.js        # Metric definitions and validation
│   │   ├── KnobsRegistry.js          # Knob definitions and constraints
│   │   └── KnobsResolver.js          # Knob value resolution logic
│   └── stations/                      # Specific station implementations
│       ├── Station3_3333_Handler.js  # Extension 3333 handler
│       └── Station3_4444_Handler.js  # Extension 4444 handler
```

## Components

See detailed component documentation:
- [Architecture Documentation](./architecture/components.md)
- [Database Schema](./database/schema.md)
- [API Documentation](./api/endpoints.md)
- [Configuration Guide](./configuration/config.md)
- [Data Flow Diagrams](./flows/data_flow.md)
- [Dependencies](./dependencies/npm_packages.md)

## AI Optimizer Agent

The AI Optimizer Agent is an external service that analyzes monitoring metrics and makes intelligent knob adjustment decisions using OpenAI GPT models.

### Quick Overview
- **Service Port**: 3090
- **Technology**: Node.js + OpenAI SDK
- **Model**: GPT-4-turbo-preview
- **Main File**: `ai-service-openai.js`

### Integration Flow
1. **Discovery**: Fetches active traces from OptimizerAPI
2. **Analysis**: Retrieves 5-second metric snapshots
3. **Decision**: Uses OpenAI GPT-4 to determine optimal settings
4. **Application**: Schedules knob changes via BucketScheduler
5. **Verification**: Confirms changes were applied correctly

### Key Features
- Real-time optimization every 10 seconds
- Permission-based control (`ai.optimization_allowed` knob)
- Automatic fallback to rule-based decisions if OpenAI fails
- Validation against knob limits
- Idempotent operations

### Documentation
- [AI Optimizer Agent Architecture](./AI_OPTIMIZER_AGENT.md)
- [OpenAI Integration Guide](./OPENAI_INTEGRATION_GUIDE.md)
- [AI Decision Logic](./AI_DECISION_LOGIC.md)

### Quick Start
```bash
# Configure OpenAI API key
export OPENAI_API_KEY=sk-your-key-here

# Start AI Optimizer service
pm2 start ai-service-openai.js --name ai-optimizer

# Check status
pm2 status ai-optimizer

# View logs
pm2 logs ai-optimizer
```