# Dependencies Documentation

## External NPM Dependencies

### Core Dependencies

#### 1. pg (PostgreSQL Client)
- **Version**: Latest (^8.x)
- **Purpose**: PostgreSQL database connectivity and query execution
- **Used By**: DatabaseBridge.js
- **Features Used**:
  - Connection pooling
  - Parameterized queries
  - Transaction support
  - Async/await interface

```javascript
import pg from 'pg';
const { Pool } = pg;
```

### Node.js Built-in Modules

#### 1. fs (File System)
- **Purpose**: File I/O operations
- **Used By**:
  - MonitoringStationsBootstrap.js (config loading)
  - AudioWriter.js (audio file writing)
- **Features Used**:
  - `fs.existsSync()` - Check file existence
  - `fs.readFileSync()` - Read configuration files
  - `fs.promises.mkdir()` - Create directories
  - `fs.promises.writeFile()` - Write audio files

#### 2. path
- **Purpose**: File path manipulation
- **Used By**: Multiple components
- **Features Used**:
  - `path.join()` - Build file paths
  - `path.dirname()` - Extract directory names

#### 3. url
- **Purpose**: URL parsing and manipulation
- **Used By**: MonitoringStationsBootstrap.js
- **Features Used**:
  - `fileURLToPath()` - Convert file URLs to paths (ES modules)

#### 4. worker_threads
- **Purpose**: Multi-threading support (optional)
- **Used By**: MetricsEmitter.js
- **Features Used**:
  - `Worker` - Create background worker threads
  - Note: Currently commented out in production

#### 5. crypto
- **Purpose**: Cryptographic operations
- **Used By**: AudioWriter.js (implied for SHA256)
- **Features Used**:
  - Hash generation for file integrity

## Internal Dependencies Graph

```
MonitoringStationsBootstrap.js
├── station/generic/
│   ├── MetricsRegistry.js
│   ├── KnobsRegistry.js
│   ├── St_Handler_Generic.js
│   │   ├── MetricsRegistry.js
│   │   ├── KnobsRegistry.js
│   │   ├── Aggregator.js
│   │   └── KnobsResolver.js
│   └── Aggregator.js
├── station/stations/
│   ├── Station3_3333_Handler.js
│   └── Station3_4444_Handler.js
├── audio/
│   ├── AudioRecorder.js
│   └── AudioWriter.js
└── bridge/
    ├── MetricsEmitter.js
    ├── DatabaseBridge.js
    └── BackpressurePolicy.js
```

## Module System

**Type**: ES Modules (ESM)
- All files use `import/export` syntax
- Requires Node.js 14+ or `"type": "module"` in package.json

## Package.json Configuration

```json
{
  "name": "monitoring-stations",
  "version": "2.0.0",
  "type": "module",
  "description": "NEW Monitoring System for Translation Pipeline",
  "main": "MonitoringStationsBootstrap.js",
  "engines": {
    "node": ">=14.0.0"
  },
  "dependencies": {
    "pg": "^8.11.0"
  },
  "devDependencies": {},
  "scripts": {
    "start": "node MonitoringStationsBootstrap.js"
  }
}
```

## Dependency Installation

```bash
# Install production dependencies only
npm install --production

# Required packages
npm install pg@^8.11.0
```

## Environment Variables

No external environment variables required. All configuration through:
- `/Monitoring_Stations/config/monitoring.config.json`
- Constructor parameters
- Default values in code

## System Requirements

### Runtime
- **Node.js**: v14.0.0 or higher (ES modules support)
- **NPM**: v6.0.0 or higher

### Database
- **PostgreSQL**: v12.0 or higher
- **Extensions**: None required (uses standard SQL)

### Operating System
- **Linux**: Ubuntu 20.04+ (production)
- **macOS**: 10.15+ (development)
- **Windows**: WSL2 recommended

### Resources
- **Memory**: Minimum 512MB, Recommended 2GB
- **CPU**: 2+ cores recommended
- **Disk**: 10GB for audio storage
- **Network**: Low latency to PostgreSQL

## Dependency Security

### Known Vulnerabilities
- Regular updates via `npm audit`
- No known critical vulnerabilities as of 2026-01-12

### Security Best Practices
1. Use parameterized queries (implemented)
2. Connection pool limits (max 10 connections)
3. Input validation on all knob values
4. File path sanitization for audio writes
5. No eval() or dynamic code execution

## Version Compatibility Matrix

| Component | Min Version | Max Version | Notes |
|-----------|------------|-------------|--------|
| Node.js | 14.0.0 | 20.x | ES modules required |
| PostgreSQL | 12.0 | 16.x | Standard SQL features |
| pg package | 8.0.0 | 8.x | Breaking changes in v9 |

## Upgrade Path

### From v1.x to v2.x
1. Backup database
2. Update Node.js to 14+
3. Convert require() to import statements
4. Update package.json with `"type": "module"`
5. Test all components
6. Deploy with monitoring

## License Compliance

All dependencies use MIT or PostgreSQL licenses:
- **pg**: MIT License
- **Node.js built-ins**: Node.js License

## Dependency Monitoring

### Health Checks
```javascript
// DatabaseBridge connection test
async testConnection() {
  const client = await this.pool.connect();
  const result = await client.query('SELECT NOW()');
  client.release();
  return true;
}
```

### Update Schedule
- **Security patches**: Immediate
- **Minor updates**: Monthly
- **Major updates**: Quarterly with testing

## Troubleshooting Dependencies

### Common Issues

1. **Module not found**
   - Ensure `"type": "module"` in package.json
   - Use .js extension in import statements

2. **PostgreSQL connection failed**
   - Check pg_hba.conf for authentication
   - Verify connection parameters
   - Check firewall rules

3. **File system permissions**
   - Ensure write access to /var/monitoring/audio
   - Check user permissions for config files

## Development Dependencies

For development and testing (not required for production):

```json
{
  "devDependencies": {
    "eslint": "^8.0.0",
    "jest": "^29.0.0",
    "nodemon": "^3.0.0"
  }
}
```

## Dependency Tree Output

```bash
monitoring-stations@2.0.0
└─┬ pg@8.11.0
  ├── buffer-writer@2.0.0
  ├── packet-reader@1.0.0
  ├── pg-connection-string@2.6.0
  ├── pg-pool@3.6.0
  ├── pg-protocol@1.6.0
  ├── pg-types@2.2.0
  ├── pgpass@1.0.5
  └── postgres-array@2.0.0
```

Total dependencies: 9 (1 direct, 8 transitive)