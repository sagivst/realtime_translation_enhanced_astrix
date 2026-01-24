#!/bin/bash

# OpenAI Provider Deployment Script
# Swaps rule-based AI with OpenAI integration

echo "================================================"
echo "OpenAI Provider Swap Deployment"
echo "================================================"

# Check if running on Azure VM
if [ "$HOSTNAME" != "monitoring-vm" ]; then
    echo "⚠️  Not on Azure VM. Switching to remote deployment..."

    # Copy files to VM
    echo "📦 Copying files to Azure VM..."
    scp ai-service-openai.js azureuser@20.170.155.53:/home/azureuser/ai-service/
    scp package-openai.json azureuser@20.170.155.53:/home/azureuser/ai-service/package.json
    scp .env.openai azureuser@20.170.155.53:/home/azureuser/ai-service/.env

    # Execute remotely
    echo "🚀 Executing deployment on VM..."
    ssh azureuser@20.170.155.53 "cd /home/azureuser/ai-service && bash deploy-local.sh"
    exit 0
fi

# Local deployment on VM
echo "📍 Running on Azure VM"

# Step 1: Backup current service
echo "1️⃣ Backing up current AI service..."
cp /home/azureuser/ai-service/server.cjs /home/azureuser/ai-service/server.cjs.backup-$(date +%Y%m%d-%H%M%S)

# Step 2: Install dependencies
echo "2️⃣ Installing OpenAI dependencies..."
cd /home/azureuser/ai-service
npm install openai@^4.28.0 dotenv@^16.4.1

# Step 3: Load environment variables
echo "3️⃣ Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo "❌ ERROR: .env file not found!"
    echo "Create .env file with OPENAI_API_KEY before continuing"
    exit 1
fi

# Check for API key
if ! grep -q "OPENAI_API_KEY=sk-" .env; then
    echo "❌ ERROR: Valid OPENAI_API_KEY not found in .env"
    echo "Add your OpenAI API key to .env file"
    exit 1
fi

echo "✅ OpenAI API key configured"

# Step 4: Stop current service
echo "4️⃣ Stopping current AI service..."
pm2 stop ai-optimizer

# Step 5: Deploy new service
echo "5️⃣ Deploying OpenAI provider..."
cp /home/azureuser/ai-service-openai.js /home/azureuser/ai-service/server.cjs

# Step 6: Start service
echo "6️⃣ Starting OpenAI-powered service..."
pm2 start ai-optimizer
sleep 2

# Step 7: Verify health
echo "7️⃣ Verifying service health..."
HEALTH=$(curl -s http://localhost:3090/health)
echo "Health check: $HEALTH"

if echo "$HEALTH" | grep -q "openai"; then
    echo "✅ OpenAI provider successfully deployed!"
else
    echo "⚠️  Service running in fallback mode (check API key)"
fi

# Step 8: Test optimization
echo "8️⃣ Testing optimization endpoint..."
TEST_SNAPSHOT='{
  "trace_id": "GLOBAL",
  "station_key": "St_3_3333",
  "bucket_id": 1001,
  "knobs": {
    "pcm.input_gain_db": 0,
    "ai.optimization_allowed": true
  },
  "metrics": {
    "pcm.rms_dbfs": -28.0,
    "pcm.clipping_ratio": 0.008
  }
}'

RESPONSE=$(curl -s -X POST http://localhost:3090/optimize \
  -H "Content-Type: application/json" \
  -d "$TEST_SNAPSHOT")

echo "Test response: $RESPONSE"

if echo "$RESPONSE" | grep -q "decisions"; then
    echo "✅ Optimization endpoint working!"
else
    echo "❌ Optimization endpoint failed!"
    exit 1
fi

echo ""
echo "================================================"
echo "✅ DEPLOYMENT COMPLETE"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Make test call between extensions 3333-4444"
echo "2. Let it run for 10-15 minutes"
echo "3. Collect the 4 required artifacts"
echo "4. Submit for production approval"
echo ""
echo "To monitor:"
echo "  pm2 logs ai-optimizer"
echo "  pm2 status"
echo ""