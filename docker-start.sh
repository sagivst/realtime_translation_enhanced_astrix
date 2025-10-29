#!/bin/bash

set -e

echo "============================================"
echo "Asterisk Translation System - Docker Startup"
echo "============================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "   Creating from .env.example..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your API keys:"
    echo "   - DEEPGRAM_API_KEY"
    echo "   - DEEPL_API_KEY"
    echo ""
    read -p "Press Enter after updating .env file..."
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✓ Docker is running"
echo ""

# Build and start services
echo "Building Docker images..."
docker-compose build

echo ""
echo "Starting services..."
docker-compose up -d

echo ""
echo "Waiting for services to start..."
sleep 10

# Check service status
echo ""
echo "Service Status:"
docker-compose ps

echo ""
echo "============================================"
echo "Services started successfully!"
echo "============================================"
echo ""
echo "Access Points:"
echo "  Translation Service: http://localhost:3000"
echo "  Metrics:             http://localhost:9090/metrics"
echo "  Prometheus:          http://localhost:9091"
echo "  Grafana:             http://localhost:3001"
echo "  XTTS Service:        http://localhost:8000"
echo ""
echo "View logs:"
echo "  docker-compose logs -f"
echo ""
echo "Stop services:"
echo "  docker-compose down"
echo ""
