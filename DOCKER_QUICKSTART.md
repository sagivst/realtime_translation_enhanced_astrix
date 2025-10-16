# Docker Quick Start Guide

Complete guide to deploying the Asterisk Translation System using Docker.

## Prerequisites

- Docker Desktop 20.10+ or Docker Engine + Docker Compose
- 8GB+ RAM allocated to Docker
- 20GB+ free disk space
- API Keys:
  - Deepgram API key (for STT)
  - DeepL API key (for MT)

## Quick Start (3 Steps)

### 1. Configure API Keys

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and add your API keys
nano .env  # or use your preferred editor
```

Update these values in `.env`:
```bash
DEEPGRAM_API_KEY=your_deepgram_api_key_here
DEEPL_API_KEY=your_deepl_api_key_here
```

### 2. Start Services

```bash
# Option A: Use the startup script (recommended)
./docker-start.sh

# Option B: Manual start
docker-compose build
docker-compose up -d
```

### 3. Verify Deployment

```bash
# Check all services are running
docker-compose ps

# View logs
docker-compose logs -f

# Test translation service
curl http://localhost:3000/health

# Test XTTS service
curl http://localhost:8000/health

# View metrics
curl http://localhost:9090/metrics
```

## Service URLs

Once running, access services at:

| Service | URL | Description |
|---------|-----|-------------|
| Translation Service | http://localhost:3000 | Main translation API |
| Metrics Endpoint | http://localhost:9090/metrics | Prometheus metrics |
| Prometheus | http://localhost:9091 | Metrics database |
| Grafana | http://localhost:3001 | Dashboards (admin/admin) |
| XTTS Service | http://localhost:8000 | TTS API |

## Container Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                        │
│                                                          │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────┐ │
│  │   Asterisk   │  │  Translation     │  │   XTTS    │ │
│  │   PBX        │◄─┤  Service         │◄─┤  Service  │ │
│  │              │  │  (Node.js)       │  │  (Python) │ │
│  └──────────────┘  └──────────────────┘  └───────────┘ │
│         │                   │                    │      │
│         │          ┌────────▼────────┐          │      │
│         │          │   Prometheus    │          │      │
│         │          └────────┬────────┘          │      │
│         │                   │                    │      │
│         │          ┌────────▼────────┐          │      │
│         └─────────►│    Grafana      │◄─────────┘      │
│                    └─────────────────┘                  │
│                                                          │
│  Shared Volumes:                                        │
│  - asterisk-media (named pipes for audio streaming)     │
│  - voice-profiles (TTS voice embeddings)                │
│  - logs, models, metrics data                           │
└─────────────────────────────────────────────────────────┘
```

## Common Operations

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f translation-service
docker-compose logs -f asterisk
docker-compose logs -f xtts-service

# Last 100 lines
docker-compose logs --tail=100 translation-service
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart translation-service
```

### Stop Services

```bash
# Stop all (keeps volumes)
docker-compose stop

# Stop and remove containers (keeps volumes)
docker-compose down

# Stop and remove everything including volumes
docker-compose down -v
```

### Scale Services

```bash
# Run multiple translation service instances
docker-compose up -d --scale translation-service=3
```

### Access Container Shell

```bash
# Translation service
docker-compose exec translation-service /bin/sh

# Asterisk CLI
docker-compose exec asterisk asterisk -r

# XTTS service
docker-compose exec xtts-service /bin/bash
```

## Testing

### Run Integration Tests

```bash
# From host
docker-compose exec translation-service node tests/integration.test.js

# Run all tests
docker-compose exec translation-service npm test
```

### Test Translation Pipeline

```bash
# Create test endpoint
curl -X POST http://localhost:3000/api/endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "endpointId": "test_en",
    "userId": "user1",
    "username": "testuser",
    "displayName": "Test User (EN)",
    "password": "test123",
    "language": "en"
  }'

# Check metrics
curl http://localhost:9090/metrics | grep translation_latency
```

## Monitoring

### Prometheus Queries

Access Prometheus at http://localhost:9091 and try these queries:

```promql
# Average translation latency
rate(translation_latency_seconds_sum[5m]) / rate(translation_latency_seconds_count[5m])

# Active channels
active_channels

# Error rate
rate(errors_total[5m])

# Component latencies
histogram_quantile(0.95, component_latency_milliseconds_bucket)
```

### Grafana Dashboard

1. Open http://localhost:3001
2. Login: admin / admin (or your GRAFANA_PASSWORD from .env)
3. Navigate to Dashboards → Translation System

## Troubleshooting

### Services Won't Start

```bash
# Check Docker resources
docker system df

# View detailed logs
docker-compose logs asterisk
docker-compose logs translation-service

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Asterisk Issues

```bash
# Access Asterisk CLI
docker-compose exec asterisk asterisk -r

# Check modules loaded
asterisk -rx "module show like externalmedia"

# Check SIP status
asterisk -rx "pjsip show endpoints"

# Check conferences
asterisk -rx "confbridge list"
```

### High Latency

```bash
# Check component latencies
curl http://localhost:9090/metrics | grep component_latency

# Check queue depths
curl http://localhost:9090/metrics | grep queue_depth

# View resource usage
docker stats
```

### Out of Memory

Increase Docker memory allocation:

1. Docker Desktop → Settings → Resources → Memory
2. Set to at least 8GB
3. Apply & Restart

## Performance Tuning

### For Development (Low Resource)

Edit `docker-compose.yml`:

```yaml
services:
  translation-service:
    environment:
      - MAX_CONCURRENT_CHANNELS=10  # Reduce from 50
```

### For Production (High Performance)

```yaml
services:
  translation-service:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
        reservations:
          cpus: '2'
          memory: 2G
```

## Backup & Restore

### Backup Voice Profiles

```bash
docker run --rm -v $(pwd):/backup \
  -v realtime-translation-enhanced_astrix_voice-profiles:/data \
  alpine tar czf /backup/voice-profiles-backup.tar.gz -C /data .
```

### Restore Voice Profiles

```bash
docker run --rm -v $(pwd):/backup \
  -v realtime-translation-enhanced_astrix_voice-profiles:/data \
  alpine tar xzf /backup/voice-profiles-backup.tar.gz -C /data
```

## Updating

```bash
# Pull latest changes
git pull

# Rebuild containers
docker-compose build

# Restart with new images
docker-compose up -d
```

## Production Deployment

For production deployment on cloud platforms:

1. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions
2. Configure SSL/TLS for SIP endpoints
3. Set up monitoring alerts
4. Configure automated backups
5. Implement load balancing for horizontal scaling

## Additional Resources

- Full Deployment Guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Architecture Documentation: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Session Progress: [SESSION_PROGRESS.md](./SESSION_PROGRESS.md)

## Support

For issues or questions:
1. Check logs: `docker-compose logs`
2. Review troubleshooting section above
3. See main README.md for system architecture
4. File an issue in the repository
