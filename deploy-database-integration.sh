#!/bin/bash

# Database Integration Deployment Script
# For AI-Driven Audio Optimization System

set -e  # Exit on error

echo "=========================================="
echo "Database Integration Deployment Script"
echo "=========================================="
echo ""

# Configuration
VM_HOST="azureuser@20.170.155.53"
PROJECT_PATH="/home/azureuser/translation-app/3333_4444__Operational"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Step 1: Installing PostgreSQL on VM...${NC}"
ssh $VM_HOST << 'EOF'
# Update system
sudo apt-get update

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib postgresql-client

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql --no-pager
EOF

echo -e "${GREEN}✓ PostgreSQL installed${NC}"

echo -e "${YELLOW}Step 2: Creating database and user...${NC}"
ssh $VM_HOST << 'EOF'
sudo -u postgres psql << SQL
-- Create database
CREATE DATABASE IF NOT EXISTS audio_optimization;

-- Create user
CREATE USER IF NOT EXISTS audio_app WITH PASSWORD 'SecurePass2025!';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE audio_optimization TO audio_app;

-- Show databases
\l
SQL
EOF

echo -e "${GREEN}✓ Database created${NC}"

echo -e "${YELLOW}Step 3: Copying database schema to VM...${NC}"
scp database-implementation.sql $VM_HOST:/tmp/

echo -e "${YELLOW}Step 4: Deploying database schema...${NC}"
ssh $VM_HOST << 'EOF'
# Apply schema
sudo -u postgres psql audio_optimization < /tmp/database-implementation.sql

# Verify tables
sudo -u postgres psql audio_optimization -c "\dt"
EOF

echo -e "${GREEN}✓ Schema deployed${NC}"

echo -e "${YELLOW}Step 5: Installing Node.js dependencies...${NC}"
ssh $VM_HOST << 'EOF'
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver

# Install database packages
npm install pg@latest uuid@latest aws-sdk@latest

# Verify installation
npm list pg uuid aws-sdk
EOF

echo -e "${GREEN}✓ Dependencies installed${NC}"

echo -e "${YELLOW}Step 6: Copying integration modules to VM...${NC}"
scp database-integration-module.js $VM_HOST:$PROJECT_PATH/STTTTSserver/
scp station-integration-patch.js $VM_HOST:$PROJECT_PATH/STTTTSserver/

echo -e "${GREEN}✓ Modules copied${NC}"

echo -e "${YELLOW}Step 7: Creating environment configuration...${NC}"
ssh $VM_HOST << EOF
cd $PROJECT_PATH/STTTTSserver

# Backup existing env file
cp .env.externalmedia .env.externalmedia.backup-\$(date +%Y%m%d-%H%M%S)

# Add database configuration
cat >> .env.externalmedia << 'ENV'

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=audio_optimization
DB_USER=audio_app
DB_PASSWORD=SecurePass2025!

# S3 Configuration (optional - using local storage for now)
AWS_REGION=us-east-1
S3_BUCKET=audio-optimization-pcm

# OpenAI Configuration (add your key)
OPENAI_API_KEY=your-openai-api-key-here
ENV

echo "Database configuration added to .env.externalmedia"
EOF

echo -e "${GREEN}✓ Environment configured${NC}"

echo -e "${YELLOW}Step 8: Patching STTTTSserver.js...${NC}"
ssh $VM_HOST << 'EOF'
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver

# Backup original
cp STTTTSserver.js STTTTSserver.js.backup-$(date +%Y%m%d-%H%M%S)

# Add integration at the top of the file (after other requires)
sed -i '20a\
// Database Integration for AI Optimization\
const stationIntegration = require("./station-integration-patch");\
const DatabaseIntegration = require("./database-integration-module");\
const dbIntegration = new DatabaseIntegration();\
' STTTTSserver.js

echo "Integration modules added to STTTTSserver.js"
EOF

echo -e "${GREEN}✓ STTTTSserver patched${NC}"

echo -e "${YELLOW}Step 9: Testing database connectivity...${NC}"
ssh $VM_HOST << 'EOF'
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver

# Create test script
cat > test-db-connection.js << 'TEST'
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'audio_optimization',
  user: 'audio_app',
  password: 'SecurePass2025!'
});

async function test() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful!');

    const result = await client.query('SELECT COUNT(*) FROM parameters');
    console.log('Parameters in database:', result.rows[0].count);

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

test();
TEST

# Run test
node test-db-connection.js
EOF

echo -e "${GREEN}✓ Database connectivity verified${NC}"

echo -e "${YELLOW}Step 10: Creating monitoring integration points...${NC}"
ssh $VM_HOST << 'EOF'
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver

# Find the audio processing functions and add monitoring
cat > add-monitoring-points.sh << 'SCRIPT'
#!/bin/bash

# Add monitoring for Station 3 (before Deepgram)
# Look for where audio is sent to Deepgram
grep -n "deepgramClient\|sendToDeepgram" STTTTSserver.js

# Add monitoring for Station 9 (before Gateway)
# Look for where TTS audio is sent back
grep -n "sendToGateway\|udpSend" STTTTSserver.js

echo "Manual integration points identified above"
echo "Add these lines at the appropriate locations:"
echo ""
echo "// Before sending to Deepgram (Station 3):"
echo "stationIntegration.integrateStation3Monitoring(audioChunk, {});"
echo ""
echo "// Before sending to Gateway (Station 9):"
echo "stationIntegration.integrateStation9Monitoring(audioChunk, {});"
echo ""
echo "// On call start:"
echo "stationIntegration.onCallStart(callId, extension);"
echo ""
echo "// On call end:"
echo "stationIntegration.onCallEnd();"
SCRIPT

chmod +x add-monitoring-points.sh
./add-monitoring-points.sh
EOF

echo -e "${GREEN}✓ Integration points identified${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Add your OpenAI API key to .env.externalmedia"
echo "2. Manually add the monitoring calls at the identified points"
echo "3. Restart STTTTSserver to apply changes"
echo ""
echo "Test with:"
echo "  ssh $VM_HOST"
echo "  cd $PROJECT_PATH/STTTTSserver"
echo "  node test-db-connection.js"
echo ""
echo "Monitor database with:"
echo "  sudo -u postgres psql audio_optimization"
echo "  SELECT * FROM station_snapshots ORDER BY timestamp DESC LIMIT 10;"
echo ""