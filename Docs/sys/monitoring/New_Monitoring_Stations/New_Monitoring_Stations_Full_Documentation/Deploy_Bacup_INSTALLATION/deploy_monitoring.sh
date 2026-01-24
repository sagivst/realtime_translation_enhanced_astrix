#!/bin/bash

# NEW Monitoring System - Automated Deployment Script
# Usage: ./deploy_monitoring.sh [--clean] [--skip-db] [--skip-deps]

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration variables
DB_NAME="monitoring_v2"
DB_USER="monitoring_user"
DB_PASS="monitoring_pass"
BASE_DIR="/home/azureuser/translation-app/3333_4444__Operational"
AUDIO_DIR="/var/monitoring/audio"
NODE_VERSION="14"

# Parse arguments
CLEAN_INSTALL=false
SKIP_DB=false
SKIP_DEPS=false

for arg in "$@"; do
    case $arg in
        --clean)
            CLEAN_INSTALL=true
            shift
            ;;
        --skip-db)
            SKIP_DB=true
            shift
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
    esac
done

# Functions
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

check_prerequisites() {
    echo "Checking prerequisites..."

    # Check if running as correct user
    if [ "$USER" != "azureuser" ]; then
        print_warning "Not running as azureuser, some operations may require sudo"
    fi

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    else
        NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VER" -lt "$NODE_VERSION" ]; then
            print_error "Node.js version $NODE_VER is too old (need v$NODE_VERSION+)"
            exit 1
        fi
        print_status "Node.js $(node -v) found"
    fi

    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL client is not installed"
        exit 1
    else
        print_status "PostgreSQL client found"
    fi

    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        print_warning "PM2 not found, will install"
        sudo npm install -g pm2
    else
        print_status "PM2 found"
    fi
}

setup_directories() {
    echo "Setting up directory structure..."

    # Create base directories
    sudo mkdir -p "$BASE_DIR/STTTTSserver"
    cd "$BASE_DIR/STTTTSserver"

    # Create subdirectories
    mkdir -p Monitoring_Stations/{bridge,config,stations,lib}
    mkdir -p logs

    # Create audio storage
    sudo mkdir -p "$AUDIO_DIR/traces"
    sudo chown -R azureuser:azureuser "$AUDIO_DIR"
    chmod -R 755 "$AUDIO_DIR"

    print_status "Directory structure created"
}

setup_database() {
    if [ "$SKIP_DB" = true ]; then
        print_warning "Skipping database setup (--skip-db flag)"
        return
    fi

    echo "Setting up PostgreSQL database..."

    # Check if database exists
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        if [ "$CLEAN_INSTALL" = true ]; then
            print_warning "Dropping existing database (--clean flag)"
            sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;"
            sudo -u postgres psql -c "DROP USER IF EXISTS $DB_USER;"
        else
            print_warning "Database $DB_NAME already exists, skipping creation"
            return
        fi
    fi

    # Create user and database
    sudo -u postgres psql << EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\c $DB_NAME
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
EOF

    print_status "Database created"

    # Create schema
    create_database_schema
}

create_database_schema() {
    echo "Creating database schema..."

    cat > /tmp/monitoring_schema.sql << 'EOF'
-- Create all tables for monitoring_v2
\c monitoring_v2

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_traces_started_at ON traces(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_traces_ended_at ON traces(ended_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_bucket_ts ON metrics_agg_5s(bucket_ts DESC);
CREATE INDEX IF NOT EXISTS idx_audio_bucket_ts ON audio_segments_5s(bucket_ts DESC);
CREATE INDEX IF NOT EXISTS idx_knob_snapshots_bucket_ts ON knob_snapshots_5s(bucket_ts DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_status ON scheduled_knob_updates(status, apply_at_bucket_ts);
CREATE INDEX IF NOT EXISTS idx_knob_events_occurred ON knob_events(occurred_at DESC);

-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_data()
RETURNS void AS \$\$
DECLARE
    retention_hours INTEGER := 72;
    deleted_traces INTEGER;
    deleted_metrics INTEGER;
    deleted_audio INTEGER;
BEGIN
    DELETE FROM traces
    WHERE ended_at IS NOT NULL
    AND ended_at < NOW() - INTERVAL '1 hour' * retention_hours;
    GET DIAGNOSTICS deleted_traces = ROW_COUNT;

    DELETE FROM metrics_agg_5s
    WHERE bucket_ts < NOW() - INTERVAL '1 hour' * retention_hours;
    GET DIAGNOSTICS deleted_metrics = ROW_COUNT;

    DELETE FROM audio_segments_5s
    WHERE bucket_ts < NOW() - INTERVAL '1 hour' * retention_hours;
    GET DIAGNOSTICS deleted_audio = ROW_COUNT;

    RAISE NOTICE 'Cleanup: % traces, % metrics, % audio deleted',
                 deleted_traces, deleted_metrics, deleted_audio;
END;
\$\$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO monitoring_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO monitoring_user;
GRANT EXECUTE ON FUNCTION cleanup_old_monitoring_data() TO monitoring_user;
EOF

    sudo -u postgres psql -f /tmp/monitoring_schema.sql
    rm /tmp/monitoring_schema.sql

    print_status "Database schema created"
}

create_configuration() {
    echo "Creating configuration files..."

    cd "$BASE_DIR/STTTTSserver"

    # Create monitoring config
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
    "console": true
  }
}
EOF

    # Create package.json
    cat > package.json << 'EOF'
{
  "name": "sttts-monitoring-server",
  "version": "2.0.0",
  "description": "NEW Monitoring System",
  "main": "STTTTSserver.js",
  "scripts": {
    "start": "node STTTTSserver.js",
    "pm2:start": "pm2 start ecosystem.config.js",
    "pm2:stop": "pm2 stop STTTTSserver",
    "pm2:restart": "pm2 restart STTTTSserver"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "uuid": "^9.0.0",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2",
    "fs-extra": "^11.1.1",
    "@deepgram/sdk": "^2.4.0",
    "deepl-node": "^1.10.2",
    "elevenlabs": "^0.2.2"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
EOF

    # Create PM2 ecosystem config
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
    merge_logs: true
  }]
};
EOF

    print_status "Configuration files created"
}

install_dependencies() {
    if [ "$SKIP_DEPS" = true ]; then
        print_warning "Skipping dependency installation (--skip-deps flag)"
        return
    fi

    echo "Installing Node.js dependencies..."

    cd "$BASE_DIR/STTTSserver"
    npm install

    print_status "Dependencies installed"
}

deploy_source_files() {
    echo "Deploying source files..."

    cd "$BASE_DIR/STTTTSserver"

    # Create placeholder notice for actual source files
    cat > DEPLOYMENT_NOTICE.txt << 'EOF'
IMPORTANT: Source Code Files Required
=====================================

The following files need to be deployed from your source repository:

Main Files:
- STTTTSserver.js                                  # Main server application
- lib/BucketScheduler.js                           # Knob scheduling system

Monitoring Station Files:
- Monitoring_Stations/MonitoringStationsBootstrap.js     # Bootstrap orchestrator
- Monitoring_Stations/bridge/DatabaseBridge.js           # Database interface (CRITICAL)
- Monitoring_Stations/bridge/MetricsEmitter.js           # Metrics queue handler
- Monitoring_Stations/bridge/AudioWriter.js              # Audio file writer
- Monitoring_Stations/stations/St_Handler_Generic.js     # Generic station handler
- Monitoring_Stations/stations/Station3_3333_Handler.js  # Extension 3333 handler
- Monitoring_Stations/stations/Station4_4444_Handler.js  # Extension 4444 handler

CRITICAL: DatabaseBridge.js must contain trace creation code (lines 127-169)

To deploy:
1. Copy files from your development environment
2. Or use git clone/pull from your repository
3. Ensure all files have correct permissions (644 for files, 755 for directories)

After deploying source files, run:
pm2 start ecosystem.config.js
EOF

    print_warning "Source files need to be deployed manually (see DEPLOYMENT_NOTICE.txt)"
}

setup_pm2() {
    echo "Setting up PM2..."

    # Setup PM2 startup
    pm2 startup systemd -u azureuser --hp /home/azureuser

    print_status "PM2 configured for auto-start"
}

create_test_scripts() {
    echo "Creating test scripts..."

    cd "$BASE_DIR/STTTTSserver"

    # Create test script
    cat > test_monitoring.js << 'EOF'
const dgram = require('dgram');

function createTestAudio() {
  return Buffer.alloc(160, 0); // 10ms @ 16kHz
}

function sendTestPackets() {
  const client = dgram.createSocket('udp4');
  const audio = createTestAudio();

  console.log('Sending test audio to extension 3333...');

  let count = 0;
  const interval = setInterval(() => {
    client.send(audio, 6120, 'localhost', (err) => {
      if (err) console.error('Send error:', err);
    });

    count++;
    if (count >= 100) {
      clearInterval(interval);
      console.log('Test complete - sent 100 packets');
      setTimeout(() => {
        console.log('Check traces with: curl http://localhost:3020/api/traces/active');
        process.exit(0);
      }, 6000);
    }
  }, 10);
}

sendTestPackets();
EOF

    # Create health check script
    cat > health_check.sh << 'EOF'
#!/bin/bash

echo "=== Monitoring System Health Check ==="
echo

echo "1. Service Status:"
pm2 list

echo -e "\n2. API Health:"
curl -s http://localhost:3020/health 2>/dev/null || echo "API not responding"

echo -e "\n3. Database Status:"
psql -U monitoring_user -d monitoring_v2 -t -c "
SELECT 'Active Traces: ' || COUNT(*) FROM traces WHERE ended_at IS NULL;" 2>/dev/null || echo "DB connection failed"

echo -e "\n4. Disk Usage:"
df -h /var/monitoring

echo -e "\n=== Check Complete ==="
EOF

    chmod +x health_check.sh

    print_status "Test scripts created"
}

setup_cron_jobs() {
    echo "Setting up cron jobs..."

    # Add cleanup cron job
    (crontab -l 2>/dev/null; echo "0 */6 * * * psql -U monitoring_user -d monitoring_v2 -c \"SELECT cleanup_old_monitoring_data();\" >> /var/log/monitoring_cleanup.log 2>&1") | crontab -

    print_status "Cron jobs configured"
}

verify_installation() {
    echo -e "\n${GREEN}=== Verification ===${NC}"

    # Check database
    if psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &>/dev/null; then
        print_status "Database connection successful"
    else
        print_error "Database connection failed"
    fi

    # Check directories
    if [ -d "$AUDIO_DIR" ]; then
        print_status "Audio directory exists"
    else
        print_error "Audio directory missing"
    fi

    # Check configuration
    if [ -f "$BASE_DIR/STTTTSserver/Monitoring_Stations/config/monitoring.config.json" ]; then
        print_status "Configuration file exists"
    else
        print_error "Configuration file missing"
    fi
}

# Main execution
main() {
    echo -e "${GREEN}=== NEW Monitoring System Deployment ===${NC}"
    echo "Starting deployment process..."
    echo

    check_prerequisites
    setup_directories
    setup_database
    create_configuration
    install_dependencies
    deploy_source_files
    setup_pm2
    create_test_scripts
    setup_cron_jobs
    verify_installation

    echo
    echo -e "${GREEN}=== Deployment Complete ===${NC}"
    echo
    echo "Next steps:"
    echo "1. Deploy source code files (see DEPLOYMENT_NOTICE.txt)"
    echo "2. Start the service: pm2 start ecosystem.config.js"
    echo "3. Save PM2 config: pm2 save"
    echo "4. Test the system: node test_monitoring.js"
    echo "5. Check health: ./health_check.sh"
    echo
    echo "API will be available at: http://localhost:3020"
    echo "Logs available at: pm2 logs STTTTSserver"
}

# Run main function
main