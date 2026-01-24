# Configuration Documentation

## Configuration File Location

**Primary**: `/Monitoring_Stations/config/monitoring.config.json`
**Fallback**: Default values in code

## Complete Configuration Schema

### Database Configuration

```json
{
  "database": {
    "host": "localhost",           // PostgreSQL server host
    "port": 5432,                   // PostgreSQL server port
    "database": "monitoring_v2",    // Database name
    "user": "monitoring_user",       // Database username
    "password": "monitoring_pass",   // Database password
    "maxConnections": 10            // Connection pool size
  }
}
```

**Environment Variables** (override config file):
- `MONITORING_DB_HOST`
- `MONITORING_DB_PORT`
- `MONITORING_DB_NAME`
- `MONITORING_DB_USER`
- `MONITORING_DB_PASS`

### Metrics Emitter Configuration

```json
{
  "metricsEmitter": {
    "maxQueueSize": 10000,     // Maximum items in queue before dropping
    "flushIntervalMs": 200,     // Flush to database every N milliseconds
    "batchSize": 100           // Maximum items per database write
  }
}
```

**Tuning Guidelines**:
- Increase `maxQueueSize` for burst handling
- Decrease `flushIntervalMs` for lower latency
- Increase `batchSize` for better throughput

### Audio Writer Configuration

```json
{
  "audioWriter": {
    "baseDir": "/var/monitoring/audio",  // Base directory for audio files
    "maxQueue": 5000,                    // Maximum write queue size
    "flushIntervalMs": 50                // Write interval
  }
}
```

**Directory Structure Created**:
```
/var/monitoring/audio/
└── traces/
    └── {trace_id}/
        └── {station_key}/
            └── {tap}/
                └── {bucket_ts}.wav
```

### Audio Recorder Configuration

```json
{
  "audioRecorder": {
    "bucketMs": 5000,                    // Bucket duration (must be 5000)
    "sampleRateHz": 16000,                // Audio sample rate
    "channels": 1,                        // Number of channels
    "maxSamplesGuardMultiplier": 2       // Buffer overflow protection
  }
}
```

**Important**: `bucketMs` must remain 5000 for system compatibility.

### Station Knobs Configuration

#### Audio Processing Knobs

```json
{
  "stations": {
    "knobs": {
      // Gain Control
      "pcm.input_gain_db": 0,              // Input gain (-20 to +20 dB)
      "pcm.output_gain_db": 0,             // Output gain (-20 to +20 dB)
      "pcm.target_level_dbfs": -12,        // Target level for normalization

      // Limiter
      "limiter.enabled": true,             // Enable/disable limiter
      "limiter.threshold_dbfs": -6,        // Limiting threshold
      "limiter.release_ms": 50,            // Release time
      "limiter.lookahead_ms": 5,           // Lookahead buffer

      // Compressor
      "compressor.enabled": false,         // Enable/disable compressor
      "compressor.threshold_dbfs": -20,    // Compression threshold
      "compressor.ratio": 4,                // Compression ratio (1:1 to 20:1)
      "compressor.attack_ms": 10,          // Attack time
      "compressor.release_ms": 100,        // Release time

      // Noise Gate
      "noise_gate.enabled": false,         // Enable/disable gate
      "noise_gate.threshold_dbfs": -50,    // Gate threshold
      "noise_gate.attack_ms": 1,           // Gate opening speed
      "noise_gate.hold_ms": 10,            // Hold time
      "noise_gate.release_ms": 100,        // Gate closing speed

      // Filters
      "highpass.enabled": false,           // Enable high-pass filter
      "highpass.cutoff_hz": 80,            // Cutoff frequency

      // Voice Activity Detection
      "vad.enabled": false,                // Enable VAD
      "vad.energy_threshold_dbfs": -45,    // Energy threshold
      "vad.hangover_ms": 300,              // Hangover time

      // Automatic Gain Control
      "agc.enabled": false,                // Enable AGC
      "agc.target_level_dbfs": -18,        // Target level
      "agc.max_gain_db": 12,               // Maximum gain

      // Safety
      "safety.max_output_level_dbfs": -1,  // Maximum output level
      "safety.clipping_protection": true,   // Prevent clipping

      // Monitoring Control
      "monitoring.metrics_enabled": true,   // Collect metrics
      "monitoring.audio_capture_enabled": true,  // Record audio
      "monitoring.pre_tap_enabled": true,   // PRE tap active
      "monitoring.post_tap_enabled": true,  // POST tap active
      "monitoring.fft_analysis_enabled": false,  // FFT analysis

      // Automation
      "auto.gain_adjustment_allowed": false,     // Auto gain adjustment
      "ai.optimization_allowed": false           // AI optimization
    }
  }
}
```

### AI Optimizer Configuration

#### OpenAI Settings

```json
{
  "aiOptimizer": {
    "enabled": true,                      // Enable AI optimization service
    "servicePort": 3090,                  // AI service port
    "openai": {
      "apiKey": "${OPENAI_API_KEY}",      // OpenAI API key (from environment)
      "model": "gpt-4-turbo-preview",     // Model to use
      "temperature": 0.3,                  // Response consistency (0-1)
      "maxTokens": 500,                    // Max response tokens
      "timeout": 2000,                      // API timeout in ms
      "maxRetries": 2                      // Retry attempts on failure
    },
    "optimization": {
      "intervalMs": 10000,                 // Run optimization every 10s
      "maxDecisionsPerCycle": 5,           // Max knob changes per cycle
      "confidenceThreshold": 0.5,          // Minimum confidence to apply
      "allowedKnobs": [                    // Knobs AI can modify
        "pcm.input_gain_db",
        "pcm.output_gain_db",
        "agc.enabled",
        "agc.target_level_dbfs",
        "limiter.enabled",
        "limiter.threshold_dbfs",
        "compressor.enabled",
        "compressor.threshold_dbfs",
        "compressor.ratio",
        "noise_gate.enabled",
        "noise_gate.threshold_dbfs"
      ]
    },
    "fallback": {
      "enabled": true,                     // Use rules if OpenAI fails
      "maxGainStep": 3,                    // Max gain change per step
      "targetRmsLinear": 7500,             // Target RMS level
      "clippingThreshold": 0.001           // Max acceptable clipping
    }
  }
}
```

**Environment Variables for AI Optimizer**:
- `OPENAI_API_KEY` (required) - Your OpenAI API key
- `OPENAI_MODEL` (optional) - Override model selection
- `AI_SERVICE_PORT` (optional) - Override service port
- `AI_OPTIMIZATION_ENABLED` (optional) - Enable/disable globally
- `AI_FALLBACK_ONLY` (optional) - Force fallback mode for testing

#### AI Permission Control

The AI Optimizer respects the `ai.optimization_allowed` knob:

```javascript
// In station knobs configuration
"ai.optimization_allowed": false  // Must be true for AI to make changes
```

This provides fine-grained control per station/trace.

#### AI Knob Limits

```json
{
  "aiKnobLimits": {
    "pcm.input_gain_db": { "min": -20, "max": 20, "step": 1 },
    "pcm.output_gain_db": { "min": -20, "max": 20, "step": 1 },
    "agc.target_level_dbfs": { "min": -30, "max": 0, "step": 3 },
    "limiter.threshold_dbfs": { "min": -30, "max": 0, "step": 3 },
    "compressor.threshold_dbfs": { "min": -40, "max": 0, "step": 5 },
    "compressor.ratio": { "min": 1, "max": 20, "step": 0.5 },
    "noise_gate.threshold_dbfs": { "min": -60, "max": -10, "step": 5 }
  }
}
```

### Retention Configuration

```json
{
  "retentionHours": 72    // Hours to retain data before cleanup
}
```

**Cleanup Schedule**: Every 10 minutes via `cleanup_old_monitoring_data()` function.

### Logging Configuration

```json
{
  "logging": {
    "level": "info",      // Log level: debug, info, warn, error
    "console": true,      // Log to console
    "file": false        // Log to file (not implemented)
  }
}
```

## Configuration Loading Priority

1. **Default Values** (in code)
2. **Config File** (`monitoring.config.json`)
3. **Constructor Parameters** (runtime override)
4. **Environment Variables** (highest priority)

## Configuration Validation

### Automatic Validation

The system validates configuration on load:

```javascript
// Range validation example
if (knobValue < knobDef.range.min || knobValue > knobDef.range.max) {
  throw new Error(`Knob ${key} value ${knobValue} out of range`);
}

// Type validation
if (typeof knobValue !== knobDef.type) {
  throw new Error(`Knob ${key} type mismatch`);
}
```

### Validation Rules

| Config Key | Validation Rules |
|------------|-----------------|
| `database.port` | 1-65535 |
| `database.maxConnections` | 1-100 |
| `metricsEmitter.maxQueueSize` | 100-100000 |
| `metricsEmitter.flushIntervalMs` | 10-5000 |
| `metricsEmitter.batchSize` | 1-1000 |
| `audioRecorder.bucketMs` | Must be 5000 |
| `audioRecorder.sampleRateHz` | 8000, 16000, 44100, 48000 |
| `audioRecorder.channels` | 1 or 2 |
| `*.gain_db` | -20 to +20 |
| `*.threshold_dbfs` | -60 to 0 |
| `retentionHours` | 1-720 (30 days max) |

## Runtime Configuration Updates

### Updating Knobs

```javascript
// Via API
POST /api/optimizer/knobs/apply
{
  "knobs": {
    "pcm.input_gain_db": 3
  }
}

// Via Code
monitoringBootstrap.updateKnob("pcm.input_gain_db", 3, "manual");
```

### Configuration Hot Reload

Not currently supported. Changes require restart:

```bash
pm2 restart STTTTSserver
```

## Station-Specific Configuration

Each station can have override values:

```javascript
// In Station3_3333_Handler.js
getDefaultKnobs() {
  return {
    "pcm.input_gain_db": 2,  // Override for 3333
    "vad.enabled": true       // Different from global
  };
}
```

## Configuration Templates

### Low Latency Configuration

```json
{
  "metricsEmitter": {
    "flushIntervalMs": 50,
    "batchSize": 50
  },
  "audioWriter": {
    "flushIntervalMs": 25
  }
}
```

### High Throughput Configuration

```json
{
  "metricsEmitter": {
    "maxQueueSize": 50000,
    "flushIntervalMs": 500,
    "batchSize": 500
  },
  "database": {
    "maxConnections": 20
  }
}
```

### Audio Quality Focus

```json
{
  "stations": {
    "knobs": {
      "pcm.input_gain_db": 3,
      "limiter.enabled": true,
      "limiter.threshold_dbfs": -3,
      "compressor.enabled": true,
      "compressor.ratio": 3,
      "highpass.enabled": true,
      "highpass.cutoff_hz": 100,
      "agc.enabled": true,
      "agc.target_level_dbfs": -16
    }
  }
}
```

### AI-Optimized Configuration

```json
{
  "stations": {
    "knobs": {
      "ai.optimization_allowed": true,    // Enable AI control
      "auto.gain_adjustment_allowed": true,  // Allow automatic adjustments
      "monitoring.metrics_enabled": true,    // Required for AI analysis
      "monitoring.pre_tap_enabled": true,    // Required for metrics
      "monitoring.post_tap_enabled": true    // Required for metrics
    }
  },
  "aiOptimizer": {
    "enabled": true,
    "optimization": {
      "intervalMs": 10000,                // Standard optimization cycle
      "confidenceThreshold": 0.7          // Higher confidence for production
    }
  }
}
```

### Development AI Configuration

```json
{
  "aiOptimizer": {
    "enabled": true,
    "openai": {
      "model": "gpt-3.5-turbo",          // Cheaper model for testing
      "temperature": 0.5,                  // More variation for testing
      "maxTokens": 300                     // Smaller responses
    },
    "optimization": {
      "intervalMs": 30000,                 // Less frequent for dev
      "maxDecisionsPerCycle": 2,           // Conservative changes
      "confidenceThreshold": 0.8           // Higher threshold for safety
    },
    "fallback": {
      "enabled": true,                     // Always have fallback in dev
      "maxGainStep": 2                     // Smaller steps
    }
  }
}
```

## Monitoring Configuration Health

### Check Current Configuration

```sql
-- View current knob values
SELECT station_key, knobs_json
FROM knob_snapshots_5s
WHERE bucket_ts = (SELECT MAX(bucket_ts) FROM knob_snapshots_5s);
```

### Configuration Metrics

```javascript
// GET /api/config/stats
{
  "total_knobs": 35,
  "modified_knobs": 5,
  "stations_configured": 2,
  "last_update": "2026-01-12T21:10:00Z"
}
```

## Configuration Backup

### Backup Current Configuration

```bash
# Backup config file
cp monitoring.config.json monitoring.config.json.backup-$(date +%Y%m%d-%H%M%S)

# Backup database knobs
psql -U monitoring_user -d monitoring_v2 -c \
  "COPY (SELECT * FROM knob_snapshots_5s WHERE bucket_ts > NOW() - INTERVAL '1 hour')
   TO '/backup/knobs-$(date +%Y%m%d).csv' CSV HEADER;"
```

### Restore Configuration

```bash
# Restore config file
cp monitoring.config.json.backup-20260112 monitoring.config.json

# Restart service
pm2 restart STTTTSserver
```

## Troubleshooting Configuration

### Common Issues

1. **Database Connection Failed**
   ```json
   {
     "database": {
       "host": "localhost",  // Check if PostgreSQL is running
       "port": 5432,         // Verify port is correct
       "password": "..."      // Check credentials
     }
   }
   ```

2. **Audio Not Recording**
   ```json
   {
     "audioWriter": {
       "baseDir": "/var/monitoring/audio"  // Check permissions
     }
   }
   ```

3. **High Memory Usage**
   ```json
   {
     "metricsEmitter": {
       "maxQueueSize": 5000  // Reduce queue size
     }
   }
   ```

### Configuration Validation Script

```javascript
// validate_config.js
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('monitoring.config.json'));

// Validate database connection
const pg = require('pg');
const pool = new pg.Pool(config.database);
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Database connected:', res.rows[0].now);
  }
  pool.end();
});

// Validate audio directory
if (!fs.existsSync(config.audioWriter.baseDir)) {
  console.error('Audio directory does not exist:', config.audioWriter.baseDir);
}
```

## Security Considerations

1. **Never commit passwords** - Use environment variables
2. **OpenAI API Key Security**:
   - Store in environment variable `OPENAI_API_KEY`
   - Never include in config files or logs
   - Use separate keys for dev/prod
   - Set spending limits in OpenAI dashboard
   - Rotate keys regularly
3. **Restrict file permissions** - `chmod 600 monitoring.config.json`
4. **Validate all inputs** - Knob values are range-checked
5. **AI Safety Controls**:
   - Permission-based optimization (`ai.optimization_allowed`)
   - Knob value limits enforced
   - Confidence thresholds
   - Fallback mechanisms
6. **Use least privilege** - Database user with minimal permissions
7. **Rotate credentials** - Regular password updates for all services

## Configuration Change Log

Track all configuration changes:

```sql
-- View recent knob changes
SELECT occurred_at, station_key, knob_key, old_value, new_value, source, reason
FROM knob_events
ORDER BY occurred_at DESC
LIMIT 20;
```