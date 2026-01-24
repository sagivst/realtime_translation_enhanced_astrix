# NEW Monitoring System - Complete Installation Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Database Setup](#database-setup)
4. [File Deployment](#file-deployment)
5. [Dependencies Installation](#dependencies-installation)
6. [Configuration](#configuration)
7. [Service Startup](#service-startup)
8. [Verification](#verification)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js**: v14.0.0 or higher
- **PostgreSQL**: v12 or higher
- **PM2**: Process manager for Node.js
- **Git**: For code deployment
- **Python3**: For testing scripts

### Network Requirements
- **UDP Ports**:
  - 6120: Extension 3333 audio input
  - 6123: Extension 4444 audio input
- **TCP Ports**:
  - 3020: Optimizer API
  - 5432: PostgreSQL (localhost only)

### User Permissions
- SSH access to VM (azureuser@20.170.155.53)
- PostgreSQL superuser or database creation privileges
- Write access to `/var/monitoring/` directory
- PM2 management permissions

---

## System Requirements

### Hardware Minimum
- **CPU**: 2 cores minimum, 4 cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 100GB free space for audio storage
- **Network**: 100 Mbps connection

### Operating System
- **Ubuntu 20.04 LTS** or **Ubuntu 22.04 LTS**
- **CentOS 7/8** or **RHEL 7/8**

---

## Database Setup

### 1. Install PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-12 postgresql-client-12

# CentOS/RHEL
sudo yum install postgresql12-server postgresql12

# Initialize database (CentOS/RHEL only)
sudo /usr/pgsql-12/bin/postgresql-12-setup initdb
```

### 2. Configure PostgreSQL

Edit PostgreSQL configuration:

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/12/main/postgresql.conf

# Add/modify these lines:
listen_addresses = 'localhost'
max_connections = 100
shared_buffers = 256MB
work_mem = 4MB
```

Edit authentication:

```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/12/main/pg_hba.conf

# Add these lines:
local   monitoring_v2   monitoring_user   md5
host    monitoring_v2   monitoring_user   127.0.0.1/32   md5
```

### 3. Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# Create user and database
CREATE USER monitoring_user WITH PASSWORD 'monitoring_pass';
CREATE DATABASE monitoring_v2 OWNER monitoring_user;
GRANT ALL PRIVILEGES ON DATABASE monitoring_v2 TO monitoring_user;

# Connect to the new database
\c monitoring_v2

# Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\q
```

### 4. Create Database Schema

Save this as `create_schema.sql`:

```sql
-- Connect to monitoring_v2 database
\c monitoring_v2

-- Create traces table
CREATE TABLE IF NOT EXISTS traces (
    trace_id VARCHAR(255) PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    src_extension VARCHAR(50),
    dst_extension VARCHAR(50),
    call_id VARCHAR(255),
    sample_rate INTEGER DEFAULT 16000,
    channels INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create metrics_agg_5s table
CREATE TABLE IF NOT EXISTS metrics_agg_5s (
    trace_id VARCHAR(255) NOT NULL,
    station_key VARCHAR(50) NOT NULL,
    bucket_ts TIMESTAMPTZ NOT NULL,
    bucket_ms INTEGER DEFAULT 5000,
    metrics JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (trace_id, station_key, bucket_ts),
    FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
);

-- Create audio_segments_5s table
CREATE TABLE IF NOT EXISTS audio_segments_5s (
    trace_id VARCHAR(255) NOT NULL,
    station_key VARCHAR(50) NOT NULL,
    tap VARCHAR(10) NOT NULL,
    bucket_ts TIMESTAMPTZ NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes INTEGER,
    sample_rate_hz INTEGER DEFAULT 16000,
    channels INTEGER DEFAULT 1,
    format VARCHAR(50) DEFAULT 'WAV_PCM_S16LE_MONO',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (trace_id, station_key, tap, bucket_ts),
    FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
);

-- Create knob_snapshots_5s table
CREATE TABLE IF NOT EXISTS knob_snapshots_5s (
    trace_id VARCHAR(255) NOT NULL,
    station_key VARCHAR(50) NOT NULL,
    bucket_ts TIMESTAMPTZ NOT NULL,
    config_version INTEGER,
    knobs_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (trace_id, station_key, bucket_ts),
    FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
);

-- Create scheduled_knob_updates table
CREATE TABLE IF NOT EXISTS scheduled_knob_updates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trace_id VARCHAR(255) NOT NULL,
    station_key VARCHAR(50) NOT NULL,
    apply_at_bucket_ts TIMESTAMPTZ NOT NULL,
    config_version INTEGER NOT NULL,
    knobs JSONB NOT NULL,
    source VARCHAR(50) DEFAULT 'manual',
    reason TEXT,
    idempotency_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    applied_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending',
    FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
);

-- Create knob_verifications table
CREATE TABLE IF NOT EXISTS knob_verifications (
    id SERIAL PRIMARY KEY,
    update_id UUID NOT NULL,
    trace_id VARCHAR(255) NOT NULL,
    station_key VARCHAR(50) NOT NULL,
    bucket_ts TIMESTAMPTZ NOT NULL,
    expected_knobs JSONB NOT NULL,
    actual_knobs JSONB,
    match BOOLEAN,
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (update_id) REFERENCES scheduled_knob_updates(id) ON DELETE CASCADE,
    FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
);

-- Create knob_events table
CREATE TABLE IF NOT EXISTS knob_events (
    event_id SERIAL PRIMARY KEY,
    trace_id VARCHAR(255) NOT NULL,
    station_key VARCHAR(50) NOT NULL,
    knob_key VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    source VARCHAR(50) DEFAULT 'manual',
    reason TEXT,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_traces_started_at ON traces(started_at DESC);
CREATE INDEX idx_traces_ended_at ON traces(ended_at DESC);
CREATE INDEX idx_metrics_bucket_ts ON metrics_agg_5s(bucket_ts DESC);
CREATE INDEX idx_audio_bucket_ts ON audio_segments_5s(bucket_ts DESC);
CREATE INDEX idx_knob_snapshots_bucket_ts ON knob_snapshots_5s(bucket_ts DESC);
CREATE INDEX idx_scheduled_status ON scheduled_knob_updates(status, apply_at_bucket_ts);
CREATE INDEX idx_knob_events_occurred ON knob_events(occurred_at DESC);

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_data()
RETURNS void AS $$
DECLARE
    retention_hours INTEGER := 72;
    deleted_traces INTEGER;
    deleted_metrics INTEGER;
    deleted_audio INTEGER;
BEGIN
    -- Delete old traces
    DELETE FROM traces
    WHERE ended_at IS NOT NULL
    AND ended_at < NOW() - INTERVAL '1 hour' * retention_hours;
    GET DIAGNOSTICS deleted_traces = ROW_COUNT;

    -- Delete orphaned metrics
    DELETE FROM metrics_agg_5s
    WHERE bucket_ts < NOW() - INTERVAL '1 hour' * retention_hours;
    GET DIAGNOSTICS deleted_metrics = ROW_COUNT;

    -- Delete old audio references
    DELETE FROM audio_segments_5s
    WHERE bucket_ts < NOW() - INTERVAL '1 hour' * retention_hours;
    GET DIAGNOSTICS deleted_audio = ROW_COUNT;

    RAISE NOTICE 'Cleanup complete: % traces, % metrics, % audio segments deleted',
                 deleted_traces, deleted_metrics, deleted_audio;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO monitoring_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO monitoring_user;
GRANT EXECUTE ON FUNCTION cleanup_old_monitoring_data() TO monitoring_user;
```

Execute the schema:

```bash
sudo -u postgres psql -f create_schema.sql
```

---

## File Deployment

### 1. Create Directory Structure

```bash
# Create base directories
sudo mkdir -p /home/azureuser/translation-app/3333_4444__Operational
cd /home/azureuser/translation-app/3333_4444__Operational

# Create project structure
mkdir -p STTTTSserver/Monitoring_Stations/{bridge,config,stations,lib}
mkdir -p STTTTSserver/logs

# Create audio storage directory
sudo mkdir -p /var/monitoring/audio/traces
sudo chown -R azureuser:azureuser /var/monitoring
chmod -R 755 /var/monitoring
```

### 2. Deploy Core Files

Clone or copy the monitoring system files:

```bash
# Navigate to STTTTSserver directory
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver

# Deploy main files (copy from your source)
# STTTTSserver.js - Main server
# Monitoring_Stations/MonitoringStationsBootstrap.js - Bootstrap
# Monitoring_Stations/bridge/DatabaseBridge.js - Database interface
# Monitoring_Stations/bridge/MetricsEmitter.js - Metrics handler
# Monitoring_Stations/bridge/AudioWriter.js - Audio storage
# Monitoring_Stations/stations/St_Handler_Generic.js - Generic handler
# Monitoring_Stations/stations/Station3_3333_Handler.js - Station 3333
# Monitoring_Stations/stations/Station4_4444_Handler.js - Station 4444
# lib/BucketScheduler.js - Knob scheduler

# Create file structure
cat > file_structure.txt << 'EOF'
/home/azureuser/translation-app/3333_4444__Operational/
├── STTTTSserver/
│   ├── STTTTSserver.js                    # Main server (needs to be provided)
│   ├── ecosystem.config.js                # PM2 configuration
│   ├── package.json                       # Dependencies
│   ├── Monitoring_Stations/
│   │   ├── MonitoringStationsBootstrap.js # Bootstrap orchestrator
│   │   ├── bridge/
│   │   │   ├── DatabaseBridge.js         # Database interface
│   │   │   ├── MetricsEmitter.js         # Metrics queue handler
│   │   │   └── AudioWriter.js            # Audio file writer
│   │   ├── stations/
│   │   │   ├── St_Handler_Generic.js     # Generic station handler
│   │   │   ├── Station3_3333_Handler.js  # Extension 3333
│   │   │   └── Station4_4444_Handler.js  # Extension 4444
│   │   └── config/
│   │       └── monitoring.config.json     # Configuration
│   └── lib/
│       └── BucketScheduler.js            # Knob scheduling
EOF
```

### 3. Create Configuration File

```bash
# Create monitoring configuration
cat > Monitoring_Stations/config/monitoring.config.json << 'EOF'
{
  "database": {
    "host": "localhost",
    "port": 5432,
    "database": "monitoring_v2",
    "user": "monitoring_user",
    "password": "monitoring_pass",
    "maxConnections": 10
  },
  "metricsEmitter": {
    "maxQueueSize": 10000,
    "flushIntervalMs": 200,
    "batchSize": 100
  },
  "audioWriter": {
    "baseDir": "/var/monitoring/audio",
    "maxQueue": 5000,
    "flushIntervalMs": 50
  },
  "audioRecorder": {
    "bucketMs": 5000,
    "sampleRateHz": 16000,
    "channels": 1,
    "maxSamplesGuardMultiplier": 2
  },
  "stations": {
    "knobs": {
      "pcm.input_gain_db": 0,
      "pcm.output_gain_db": 0,
      "limiter.enabled": true,
      "limiter.threshold_dbfs": -6,
      "compressor.enabled": false,
      "noise_gate.enabled": false,
      "vad.enabled": false,
      "monitoring.metrics_enabled": true,
      "monitoring.audio_capture_enabled": true,
      "monitoring.pre_tap_enabled": true,
      "monitoring.post_tap_enabled": true
    }
  },
  "retentionHours": 72,
  "logging": {
    "level": "info",
    "console": true,
    "file": false
  }
}
EOF
```

---

## Dependencies Installation

### 1. Create package.json

```bash
cat > package.json << 'EOF'
{
  "name": "sttts-monitoring-server",
  "version": "2.0.0",
  "description": "NEW Monitoring System for Translation App",
  "main": "STTTTSserver.js",
  "scripts": {
    "start": "node STTTTSserver.js",
    "pm2:start": "pm2 start ecosystem.config.js",
    "pm2:stop": "pm2 stop STTTTSserver",
    "pm2:restart": "pm2 restart STTTTSserver",
    "pm2:logs": "pm2 logs STTTTSserver",
    "test": "node test_monitoring.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "uuid": "^9.0.0",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2",
    "dgram": "^1.0.1",
    "fs-extra": "^11.1.1",
    "path": "^0.12.7",
    "util": "^0.12.5",
    "@deepgram/sdk": "^2.4.0",
    "deepl-node": "^1.10.2",
    "elevenlabs": "^0.2.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
EOF
```

### 2. Install Node.js Dependencies

```bash
# Install dependencies
npm install

# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 to start on boot
pm2 startup systemd
# Follow the instructions printed by PM2
```

### 3. Create PM2 Configuration

```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'STTTTSserver',
    script: './STTTTSserver.js',
    cwd: '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 3020,
      MONITORING_DB_HOST: 'localhost',
      MONITORING_DB_PORT: 5432,
      MONITORING_DB_NAME: 'monitoring_v2',
      MONITORING_DB_USER: 'monitoring_user',
      MONITORING_DB_PASS: 'monitoring_pass'
    },
    error_file: './logs/sttts-error.log',
    out_file: './logs/sttts-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    time: true,
    kill_timeout: 5000,
    listen_timeout: 5000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF
```

---

## Configuration

### 1. Environment Variables

```bash
# Create .env file (optional, PM2 config handles this)
cat > .env << 'EOF'
NODE_ENV=production
PORT=3020
MONITORING_DB_HOST=localhost
MONITORING_DB_PORT=5432
MONITORING_DB_NAME=monitoring_v2
MONITORING_DB_USER=monitoring_user
MONITORING_DB_PASS=monitoring_pass
EOF
```

### 2. System Limits Configuration

```bash
# Increase system limits for production
sudo nano /etc/security/limits.conf

# Add these lines:
azureuser soft nofile 65536
azureuser hard nofile 65536
azureuser soft nproc 32768
azureuser hard nproc 32768
```

### 3. Firewall Configuration

```bash
# Allow required ports (if using ufw)
sudo ufw allow 3020/tcp   # API
sudo ufw allow 6120/udp   # Extension 3333
sudo ufw allow 6123/udp   # Extension 4444

# Verify
sudo ufw status
```

---

## AI Optimizer Service Installation

### 1. Install AI Optimizer Dependencies

```bash
# Navigate to AI Optimizer directory
cd /home/azureuser/translation-app
mkdir -p ai-optimizer
cd ai-optimizer

# Create package.json for AI Optimizer
cat > package.json << 'EOF'
{
  "name": "ai-optimizer-service",
  "version": "1.0.0",
  "description": "AI Optimization Service for Monitoring System",
  "main": "ai-service-openai.js",
  "scripts": {
    "start": "node ai-service-openai.js",
    "test": "node test-openai.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "openai": "^4.0.0",
    "axios": "^1.5.0",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.0"
  }
}
EOF

# Install dependencies
npm install
```

### 2. Configure OpenAI API Key

```bash
# Create .env file for AI Optimizer
cat > .env << 'EOF'
# OpenAI Configuration
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview
API_TIMEOUT_MS=2000
MAX_RETRIES=2

# Service Configuration
AI_SERVICE_PORT=3090
OPTIMIZATION_INTERVAL=10000
MAX_DECISIONS_PER_CYCLE=5
CONFIDENCE_THRESHOLD=0.5

# Monitoring API
MONITORING_API_URL=http://localhost:3020

# Fallback Configuration
FALLBACK_ENABLED=true
TARGET_RMS_MIN=5240
TARGET_RMS_MAX=10400
MAX_CLIPPING_RATIO=0.001
EOF

# Secure the file
chmod 600 .env

# IMPORTANT: Replace 'sk-your-actual-api-key-here' with your actual OpenAI API key
echo "IMPORTANT: Edit .env file and add your OpenAI API key"
```

### 3. Deploy AI Optimizer Service File

```bash
# Copy the ai-service-openai.js file from source
# This file should contain the AI optimization logic

# If not available, create a basic structure:
cat > ai-service-openai.js << 'EOF'
// AI Optimizer Service - Basic Structure
// Full implementation should be deployed from source

const express = require('express');
const OpenAI = require('openai');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: parseInt(process.env.API_TIMEOUT_MS) || 2000,
  maxRetries: parseInt(process.env.MAX_RETRIES) || 2
});

const PORT = process.env.AI_SERVICE_PORT || 3090;
const MONITORING_API_URL = process.env.MONITORING_API_URL || 'http://localhost:3020';

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'AI Optimizer',
    port: PORT,
    openai_configured: !!process.env.OPENAI_API_KEY
  });
});

// Optimization endpoint
app.post('/optimize', async (req, res) => {
  try {
    const snapshot = req.body;

    // Check permission
    if (!snapshot.knobs?.['ai.optimization_allowed']) {
      return res.json({ decisions: [] });
    }

    // Analyze with OpenAI
    const decisions = await analyzeWithOpenAI(snapshot);

    res.json({ decisions });
  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function analyzeWithOpenAI(snapshot) {
  // Implementation goes here
  // This is a placeholder - deploy actual implementation
  return [];
}

// Start optimization loop
setInterval(async () => {
  try {
    await runOptimizationCycle();
  } catch (error) {
    console.error('Optimization cycle error:', error);
  }
}, parseInt(process.env.OPTIMIZATION_INTERVAL) || 10000);

async function runOptimizationCycle() {
  // Fetch active traces and optimize
  console.log('Running optimization cycle...');
  // Implementation goes here
}

app.listen(PORT, () => {
  console.log(`AI Optimizer Service running on port ${PORT}`);
});
EOF

echo "NOTE: Deploy the actual ai-service-openai.js from source for full functionality"
```

### 4. Create PM2 Configuration for AI Optimizer

```bash
cat > ecosystem.ai-optimizer.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'ai-optimizer',
    script: './ai-service-openai.js',
    cwd: '/home/azureuser/translation-app/ai-optimizer',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/ai-optimizer-error.log',
    out_file: './logs/ai-optimizer-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    time: true
  }]
};
EOF
```

### 5. Test OpenAI Connection

```bash
# Create test script
cat > test-openai.js << 'EOF'
const OpenAI = require('openai');
require('dotenv').config();

async function testConnection() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('ERROR: OPENAI_API_KEY not set in .env file');
    process.exit(1);
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  try {
    console.log('Testing OpenAI connection...');
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a test.' },
        { role: 'user', content: 'Reply with "Connection successful"' }
      ],
      max_tokens: 10
    });

    console.log('✓ OpenAI connection successful');
    console.log('Response:', completion.choices[0].message.content);
    console.log('Model used:', completion.model);
  } catch (error) {
    console.error('✗ OpenAI connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
EOF

# Run test (after setting API key)
# node test-openai.js
```

### 6. Start AI Optimizer Service

```bash
# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.ai-optimizer.config.js

# Save PM2 configuration
pm2 save

# Check status
pm2 status ai-optimizer

# View logs
pm2 logs ai-optimizer --lines 50
```

### 7. Verify AI Service

```bash
# Check health
curl http://localhost:3090/health

# Test optimization endpoint
curl -X POST http://localhost:3090/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "knobs": {
      "ai.optimization_allowed": true
    },
    "metrics": {
      "PRE": {
        "pcm.amplitude_rms": {"avg": 2000}
      }
    }
  }'

# Check integration with main API
curl http://localhost:3020/api/traces/active
```

---

## Service Startup

### 1. Start PostgreSQL

```bash
# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify
sudo systemctl status postgresql
```

### 2. Initialize Database

```bash
# Test database connection
psql -U monitoring_user -d monitoring_v2 -c "SELECT NOW();"

# Verify tables exist
psql -U monitoring_user -d monitoring_v2 -c "\dt"
```

### 3. Start Monitoring System

```bash
# Navigate to project directory
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Check status
pm2 status

# View logs
pm2 logs STTTTSserver --lines 50
```

### 4. Start AI Optimizer Service

```bash
# Navigate to AI Optimizer directory
cd /home/azureuser/translation-app/ai-optimizer

# Ensure OpenAI API key is configured
if [ -z "$OPENAI_API_KEY" ]; then
  echo "WARNING: OPENAI_API_KEY not set. Edit .env file first."
  echo "AI Optimizer will run in fallback mode only."
fi

# Start AI Optimizer
pm2 start ecosystem.ai-optimizer.config.js

# Check status
pm2 status ai-optimizer

# View logs
pm2 logs ai-optimizer --lines 20
```

### 5. Enable Auto-start on Boot

```bash
# Generate startup script
pm2 startup

# Save current process list
pm2 save

# Verify
pm2 list
```

---

## Verification

### 1. Check Service Health

```bash
# Check API health
curl http://localhost:3020/health

# Expected response:
{
  "status": "ok",
  "monitoring": {
    "initialized": true,
    "running": true,
    "stats": {
      "traces": 0,
      "metrics": 0,
      "uptime": 60
    }
  }
}
```

### 2. Test Database Connection

```bash
# Check for active traces
curl http://localhost:3020/api/traces/active

# Get metrics snapshot
curl "http://localhost:3020/api/optimizer/snapshot?trace_id=GLOBAL&limit=1"
```

### 3. Create Test Monitoring Script

```bash
cat > test_monitoring.js << 'EOF'
const dgram = require('dgram');

// Create test audio packet
function createTestAudio() {
  // 160 bytes = 10ms of 16kHz mono PCM
  return Buffer.alloc(160, 0);
}

// Send test packets
function sendTestPackets() {
  const client = dgram.createSocket('udp4');
  const audio = createTestAudio();

  console.log('Sending test audio to extension 3333...');

  // Send 100 packets (1 second of audio)
  let count = 0;
  const interval = setInterval(() => {
    client.send(audio, 6120, 'localhost', (err) => {
      if (err) console.error('Send error:', err);
    });

    count++;
    if (count >= 100) {
      clearInterval(interval);
      console.log('Test complete - sent 100 packets');

      // Check database after 6 seconds
      setTimeout(() => {
        console.log('Check database with:');
        console.log('psql -U monitoring_user -d monitoring_v2 -c "SELECT COUNT(*) FROM traces WHERE started_at > NOW() - INTERVAL \'1 minute\';"');
        process.exit(0);
      }, 6000);
    }
  }, 10);
}

sendTestPackets();
EOF

# Run test
node test_monitoring.js
```

### 4. Verify Audio Storage

```bash
# Check audio directory
ls -la /var/monitoring/audio/traces/

# Check disk usage
df -h /var/monitoring
```

### 5. Database Verification Queries

```bash
# Connect to database
psql -U monitoring_user -d monitoring_v2

# Check recent traces
SELECT trace_id, started_at, src_extension
FROM traces
WHERE started_at > NOW() - INTERVAL '1 hour'
ORDER BY started_at DESC
LIMIT 5;

# Check metrics
SELECT COUNT(*) as metric_count,
       MAX(bucket_ts) as latest_bucket
FROM metrics_agg_5s
WHERE bucket_ts > NOW() - INTERVAL '1 hour';

# Check audio segments
SELECT COUNT(*) as audio_count,
       SUM(file_size_bytes) as total_size
FROM audio_segments_5s
WHERE bucket_ts > NOW() - INTERVAL '1 hour';

# Exit
\q
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Failed

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U monitoring_user -d monitoring_v2 -c "SELECT 1;"

# Check pg_hba.conf
sudo grep monitoring_user /etc/postgresql/*/main/pg_hba.conf

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### 2. PM2 Process Keeps Restarting

```bash
# Check logs
pm2 logs STTTTSserver --err --lines 100

# Check memory
pm2 monit

# Increase memory limit
pm2 delete STTTTSserver
pm2 start ecosystem.config.js --max-memory-restart 4G
```

#### 3. No Metrics Being Recorded

```bash
# Check monitoring is initialized
curl http://localhost:3020/health | jq .monitoring

# Check for foreign key violations
pm2 logs STTTTSserver | grep "foreign key"

# Verify trace creation in DatabaseBridge.js
grep -n "upsertTrace\|INSERT INTO traces" Monitoring_Stations/bridge/DatabaseBridge.js
```

#### 4. Audio Not Recording

```bash
# Check directory permissions
ls -la /var/monitoring/audio/

# Check disk space
df -h /var/monitoring

# Create directory if missing
sudo mkdir -p /var/monitoring/audio/traces
sudo chown -R azureuser:azureuser /var/monitoring
```

#### 5. UDP Packets Not Received

```bash
# Check if ports are listening
netstat -uln | grep -E "6120|6123"

# Test with netcat
echo -n "test" | nc -u -w1 localhost 6120

# Check firewall
sudo iptables -L -n | grep -E "6120|6123"
```

### Cleanup and Reset

If you need to completely reset:

```bash
# Stop services
pm2 stop all
pm2 delete all

# Clean database
psql -U monitoring_user -d monitoring_v2 << EOF
TRUNCATE TABLE knob_verifications CASCADE;
TRUNCATE TABLE scheduled_knob_updates CASCADE;
TRUNCATE TABLE knob_events CASCADE;
TRUNCATE TABLE knob_snapshots_5s CASCADE;
TRUNCATE TABLE audio_segments_5s CASCADE;
TRUNCATE TABLE metrics_agg_5s CASCADE;
TRUNCATE TABLE traces CASCADE;
EOF

# Clean audio files
sudo rm -rf /var/monitoring/audio/traces/*

# Clean logs
rm -f logs/*.log

# Restart
pm2 start ecosystem.config.js
pm2 save
```

---

## Monitoring System Health

### Create Health Check Script

```bash
cat > health_check.sh << 'EOF'
#!/bin/bash

echo "=== Monitoring System Health Check ==="
echo

# Check services
echo "1. Service Status:"
pm2 list

echo
echo "2. API Health:"
curl -s http://localhost:3020/health | python3 -m json.tool

echo
echo "3. Database Status:"
psql -U monitoring_user -d monitoring_v2 -t -c "
SELECT 'Active Traces: ' || COUNT(*)
FROM traces
WHERE ended_at IS NULL;"

echo
echo "4. Recent Metrics:"
psql -U monitoring_user -d monitoring_v2 -t -c "
SELECT 'Metrics (last hour): ' || COUNT(*)
FROM metrics_agg_5s
WHERE bucket_ts > NOW() - INTERVAL '1 hour';"

echo
echo "5. Disk Usage:"
df -h /var/monitoring

echo
echo "=== Check Complete ==="
EOF

chmod +x health_check.sh
```

### Setup Monitoring Cron

```bash
# Add cleanup cron job
crontab -e

# Add this line (cleanup every 6 hours):
0 */6 * * * psql -U monitoring_user -d monitoring_v2 -c "SELECT cleanup_old_monitoring_data();" >> /var/log/monitoring_cleanup.log 2>&1
```

---

## Post-Installation Checklist

- [ ] PostgreSQL installed and running
- [ ] Database and schema created
- [ ] Node.js dependencies installed
- [ ] PM2 configured and running
- [ ] Audio directory created with proper permissions
- [ ] Configuration file created
- [ ] API endpoint responding
- [ ] Test call generates traces and metrics
- [ ] Audio files being written
- [ ] Cleanup function scheduled
- [ ] System starts automatically on boot

---

## Support Information

### Log Locations
- PM2 Logs: `/home/azureuser/.pm2/logs/`
- Application Logs: `/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/logs/`
- PostgreSQL Logs: `/var/log/postgresql/`

### Key Files
- Main Server: `STTTTSserver.js`
- Configuration: `monitoring.config.json`
- Database Bridge: `DatabaseBridge.js` (CRITICAL - contains trace creation)
- PM2 Config: `ecosystem.config.js`

### Critical Code Sections
- Trace Creation: `DatabaseBridge.js` lines 127-169
- Monitoring Integration: `STTTTSserver.js` lines 2409-2427
- Knob Scheduling: `BucketScheduler.js`

### Contact Points
- VM: `azureuser@20.170.155.53`
- API: `http://20.170.155.53:3020`
- Database: `localhost:5432/monitoring_v2`