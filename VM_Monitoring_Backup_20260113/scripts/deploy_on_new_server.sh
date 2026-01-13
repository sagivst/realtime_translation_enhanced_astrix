#!/bin/bash
# Deployment script for NEW Monitoring System

echo "=========================================="
echo "NEW Monitoring System Deployment"
echo "=========================================="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js required"; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "PostgreSQL required"; exit 1; }
command -v pm2 >/dev/null 2>&1 || { echo "PM2 required (npm install -g pm2)"; exit 1; }

# 1. Create directories
echo "1. Creating directory structure..."
mkdir -p /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
mkdir -p /home/azureuser/ai-service
mkdir -p /var/monitoring/audio/traces

# 2. Deploy monitoring system
echo "2. Deploying monitoring system..."
cp -r source/STTTTSserver/* /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/

# 3. Deploy AI Optimizer
echo "3. Deploying AI Optimizer..."
cp ai-optimizer/* /home/azureuser/ai-service/

# 4. Setup database
echo "4. Setting up database..."
sudo -u postgres psql -f database/create_schema.sql

# 5. Install dependencies
echo "5. Installing dependencies..."
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver
npm install

cd /home/azureuser/ai-service
npm install

# 6. Configure services
echo "6. Configuring services..."
# Copy configs
cp config/* /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/Monitoring_Stations/config/

# 7. Start services with PM2
echo "7. Starting services..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "Deployment complete!"
echo "Check status: pm2 list"
echo "Check API: curl http://localhost:3020/health"
