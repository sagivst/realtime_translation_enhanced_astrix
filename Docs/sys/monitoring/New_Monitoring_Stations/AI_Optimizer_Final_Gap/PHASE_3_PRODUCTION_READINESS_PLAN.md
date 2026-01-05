# Phase 3: Production Readiness Plan
**Project:** NEW Monitoring System - AI Optimizer Integration
**Phase:** 3 - Production Readiness (SHOULD HAVE)
**Status:** Planning
**Target Completion:** 2 weeks

---

## Executive Summary

Phase 3 focuses on hardening the system for production use, ensuring reliability, observability, and maintainability. This phase addresses apply verification, error recovery, performance optimization, and comprehensive monitoring to ensure the AI Optimizer can operate reliably at scale.

---

## Phase 3 Components

### 1. Apply Verification System 🔍

#### 1.1 Knob Application Verification
**Purpose:** Confirm that scheduled knobs were actually applied to the audio pipeline

**Implementation:**
```javascript
// VerificationManager.js
class VerificationManager {
  constructor(databaseBridge, knobsResolver) {
    this.verificationQueue = new Map();
    this.verificationInterval = 2000; // Check every 2 seconds
  }

  async verifyApplication(scheduledUpdate) {
    // 1. Wait for bucket_ts + verification_delay
    // 2. Query actual knob values from stations
    // 3. Compare with expected values
    // 4. Record verification status
    // 5. Emit events for mismatches
  }

  async getVerificationStatus(trace_id, station_key, bucket_ts) {
    // Return verification results with confidence scores
  }
}
```

**Database Schema:**
```sql
-- Apply verification tracking
CREATE TABLE knob_verifications (
  id SERIAL PRIMARY KEY,
  trace_id VARCHAR(255),
  station_key VARCHAR(50),
  bucket_ts TIMESTAMPTZ,
  knob_key VARCHAR(100),
  expected_value JSONB,
  actual_value JSONB,
  verified BOOLEAN,
  confidence_score FLOAT,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  mismatch_reason TEXT,
  FOREIGN KEY (trace_id) REFERENCES traces(trace_id)
);

CREATE INDEX idx_knob_verifications_trace ON knob_verifications(trace_id, bucket_ts);
```

**API Endpoints:**
```javascript
GET /api/optimizer/verify?trace_id={id}&bucket_ts={ts}
// Returns verification status for applied knobs

POST /api/optimizer/verify/trigger
// Manually trigger verification for pending applications
```

---

### 2. Persistence & Recovery 💾

#### 2.1 Scheduled Updates Persistence
**Purpose:** Survive server restarts without losing scheduled updates

**Implementation:**
```javascript
// PersistenceLayer.js
class PersistenceLayer {
  async saveScheduledUpdate(update) {
    // Store in database for recovery
    const query = `
      INSERT INTO scheduled_knob_updates (
        idempotency_key, trace_id, station_key,
        apply_at_bucket_ts, knobs, source, reason,
        status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
    `;
  }

  async loadPendingUpdates() {
    // On startup, reload all pending future updates
    const query = `
      SELECT * FROM scheduled_knob_updates
      WHERE status = 'pending'
      AND apply_at_bucket_ts > NOW()
    `;
  }

  async markApplied(idempotency_key) {
    // Update status when applied
  }
}
```

**Recovery Process:**
1. On STTTTSserver startup, query pending updates
2. Re-schedule all future updates in BucketScheduler
3. Mark expired updates as 'missed'
4. Emit alerts for missed applications

---

### 3. Monitoring & Observability 📊

#### 3.1 Metrics Collection
**Purpose:** Track system health and performance

**Metrics to Track:**
```javascript
// MetricsCollector.js
const METRICS = {
  // Knob Application Metrics
  'knobs.scheduled.count': 'Counter of scheduled applications',
  'knobs.applied.count': 'Counter of successful applications',
  'knobs.failed.count': 'Counter of failed applications',
  'knobs.verification.mismatch': 'Count of verification mismatches',
  'knobs.latency.schedule_to_apply': 'Time from schedule to application',

  // System Performance
  'bucketscheduler.pending.count': 'Number of pending updates',
  'bucketscheduler.memory.usage': 'Memory usage of scheduler',
  'api.response.time': 'API endpoint response times',
  'database.query.time': 'Database query performance',

  // Business Metrics
  'optimizer.improvements.count': 'Number of quality improvements',
  'optimizer.rollbacks.count': 'Number of knob rollbacks',
  'traces.active.count': 'Active call traces',
  'traces.optimized.percentage': 'Percentage of optimized calls'
};
```

**Prometheus Integration:**
```javascript
// PrometheusExporter.js
const prometheus = require('prom-client');

class PrometheusExporter {
  constructor() {
    this.register = new prometheus.Registry();
    this.setupMetrics();
  }

  setupMetrics() {
    // Create Prometheus metrics
    this.knobsScheduled = new prometheus.Counter({
      name: 'optimizer_knobs_scheduled_total',
      help: 'Total number of knobs scheduled',
      labelNames: ['station', 'source']
    });

    this.verificationMismatches = new prometheus.Counter({
      name: 'optimizer_verification_mismatches_total',
      help: 'Total verification mismatches',
      labelNames: ['station', 'knob_key']
    });
  }

  getMetrics() {
    return this.register.metrics();
  }
}

// Endpoint: GET /metrics
```

#### 3.2 Logging Enhancement
**Structured Logging with Context:**
```javascript
// Logger.js
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'optimizer',
    version: '2.0.0'
  },
  transports: [
    new winston.transports.File({
      filename: '/var/log/optimizer/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: '/var/log/optimizer/audit.log',
      level: 'info'
    })
  ]
});

// Usage
logger.info('Knob scheduled', {
  trace_id: 'xxx',
  station_key: 'St_3_3333',
  apply_at: '2026-01-04T15:00:00Z',
  knobs: { 'pcm.input_gain_db': -3 }
});
```

---

### 4. Error Handling & Recovery 🚨

#### 4.1 Circuit Breaker Pattern
**Purpose:** Prevent cascading failures

```javascript
// CircuitBreaker.js
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

#### 4.2 Retry Logic with Exponential Backoff
```javascript
// RetryManager.js
class RetryManager {
  async executeWithRetry(fn, options = {}) {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 30000,
      factor = 2
    } = options;

    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          const delay = Math.min(
            initialDelay * Math.pow(factor, attempt),
            maxDelay
          );
          await this.sleep(delay);
        }
      }
    }
    throw lastError;
  }
}
```

---

### 5. Performance Optimization ⚡

#### 5.1 Database Query Optimization
```sql
-- Optimize frequent queries with proper indexes
CREATE INDEX CONCURRENTLY idx_metrics_agg_trace_bucket
  ON metrics_agg_5s(trace_id, bucket_ts DESC);

CREATE INDEX CONCURRENTLY idx_knob_snapshots_trace_bucket
  ON knob_snapshots_5s(trace_id, bucket_ts DESC);

CREATE INDEX CONCURRENTLY idx_scheduled_updates_pending
  ON scheduled_knob_updates(apply_at_bucket_ts, status)
  WHERE status = 'pending';

-- Partition large tables by time
CREATE TABLE metrics_agg_5s_2026_01 PARTITION OF metrics_agg_5s
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

#### 5.2 Caching Layer
```javascript
// CacheManager.js
const Redis = require('ioredis');

class CacheManager {
  constructor() {
    this.redis = new Redis({
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: 3
    });
  }

  async getCachedSnapshot(trace_id, bucket_ts) {
    const key = `snapshot:${trace_id}:${bucket_ts}`;
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  }

  async cacheSnapshot(trace_id, bucket_ts, data, ttl = 300) {
    const key = `snapshot:${trace_id}:${bucket_ts}`;
    await this.redis.setex(key, ttl, JSON.stringify(data));
  }
}
```

#### 5.3 Connection Pooling Optimization
```javascript
// DatabasePool.js
const pgPool = new Pool({
  host: 'localhost',
  database: 'monitoring_v2',
  max: 20,                    // Maximum connections
  min: 5,                      // Minimum connections
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 2000,
  statement_timeout: 5000,    // Kill long queries
  query_timeout: 10000
});
```

---

### 6. Security Hardening 🔒

#### 6.1 API Rate Limiting
```javascript
// RateLimiter.js
const rateLimit = require('express-rate-limit');

const optimizerLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 100,                    // 100 requests per minute
  message: 'Too many optimizer requests',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded'
    });
  }
});

// Apply to routes
app.use('/api/optimizer', optimizerLimiter);
```

#### 6.2 Input Validation
```javascript
// Validator.js
const Joi = require('joi');

const applyKnobsSchema = Joi.object({
  trace_id: Joi.string().pattern(/^trace_[\w-]+$/).required(),
  station_key: Joi.string().pattern(/^St_\d+_\d+$/).required(),
  apply_at_bucket_ts: Joi.date().iso().greater('now').required(),
  idempotency_key: Joi.string().uuid().required(),
  source: Joi.string().max(50).required(),
  reason: Joi.string().max(200),
  knobs: Joi.object().pattern(
    Joi.string(),
    Joi.alternatives().try(
      Joi.number(),
      Joi.boolean(),
      Joi.string()
    )
  ).required()
});

// Middleware
function validateApplyKnobs(req, res, next) {
  const { error } = applyKnobsSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }
  next();
}
```

#### 6.3 Audit Logging
```javascript
// AuditLogger.js
class AuditLogger {
  async logKnobApplication(event) {
    const auditEntry = {
      timestamp: new Date(),
      action: 'KNOB_APPLICATION',
      trace_id: event.trace_id,
      station_key: event.station_key,
      user: event.source,
      knobs: event.knobs,
      ip_address: event.ip,
      result: event.result
    };

    // Store in audit table
    await this.db.query(`
      INSERT INTO audit_log (
        timestamp, action, trace_id,
        details, user_id, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [...]);
  }
}
```

---

### 7. Health Checks & Readiness 🏥

#### 7.1 Health Check Endpoints
```javascript
// HealthCheck.js
class HealthCheck {
  async checkDatabase() {
    try {
      await db.query('SELECT 1');
      return { status: 'healthy', latency: Date.now() - start };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  async checkBucketScheduler() {
    const stats = bucketScheduler.getStats();
    return {
      status: stats.pending < 1000 ? 'healthy' : 'degraded',
      pending: stats.pending,
      applied: stats.applied
    };
  }

  async getHealth() {
    return {
      status: 'healthy',
      version: '3.0.0',
      uptime: process.uptime(),
      checks: {
        database: await this.checkDatabase(),
        scheduler: await this.checkBucketScheduler(),
        memory: process.memoryUsage()
      }
    };
  }
}

// Endpoints
app.get('/health', async (req, res) => {
  const health = await healthCheck.getHealth();
  const status = health.status === 'healthy' ? 200 : 503;
  res.status(status).json(health);
});

app.get('/ready', (req, res) => {
  // Kubernetes readiness probe
  res.status(bucketScheduler.isReady() ? 200 : 503).end();
});
```

---

### 8. Alert System 🚨

#### 8.1 Alert Definitions
```javascript
// AlertManager.js
const ALERTS = {
  HIGH_FAILURE_RATE: {
    condition: (metrics) => metrics.failureRate > 0.1,
    severity: 'critical',
    message: 'Knob application failure rate above 10%'
  },
  VERIFICATION_MISMATCH: {
    condition: (metrics) => metrics.verificationMismatchRate > 0.05,
    severity: 'warning',
    message: 'Verification mismatch rate above 5%'
  },
  SCHEDULER_OVERLOAD: {
    condition: (metrics) => metrics.pendingUpdates > 500,
    severity: 'warning',
    message: 'Too many pending scheduled updates'
  },
  DATABASE_SLOW: {
    condition: (metrics) => metrics.dbLatency > 1000,
    severity: 'warning',
    message: 'Database queries taking > 1 second'
  }
};

class AlertManager {
  async checkAlerts() {
    const metrics = await this.collectMetrics();

    for (const [name, alert] of Object.entries(ALERTS)) {
      if (alert.condition(metrics)) {
        await this.sendAlert(name, alert);
      }
    }
  }

  async sendAlert(name, alert) {
    // Send to Slack, PagerDuty, email, etc.
    await this.slack.send({
      channel: '#optimizer-alerts',
      text: `🚨 ${alert.severity.toUpperCase()}: ${alert.message}`,
      attachments: [{
        color: alert.severity === 'critical' ? 'danger' : 'warning',
        fields: [{
          title: 'Alert',
          value: name,
          short: true
        }]
      }]
    });
  }
}
```

---

## Implementation Timeline

### Week 1: Core Production Features
**Days 1-3: Apply Verification**
- [ ] Implement VerificationManager
- [ ] Create verification database schema
- [ ] Add verification API endpoints
- [ ] Test verification logic

**Days 4-5: Persistence & Recovery**
- [ ] Implement PersistenceLayer
- [ ] Add database persistence for scheduled updates
- [ ] Implement startup recovery process
- [ ] Test restart scenarios

### Week 2: Monitoring & Hardening
**Days 6-7: Monitoring & Observability**
- [ ] Set up Prometheus metrics
- [ ] Implement structured logging
- [ ] Create monitoring dashboard
- [ ] Add health check endpoints

**Days 8-9: Error Handling & Performance**
- [ ] Implement circuit breaker
- [ ] Add retry logic
- [ ] Optimize database queries
- [ ] Set up caching layer

**Days 10-11: Security & Alerts**
- [ ] Add rate limiting
- [ ] Implement input validation
- [ ] Set up audit logging
- [ ] Configure alert system

**Days 12-14: Testing & Documentation**
- [ ] Load testing
- [ ] Chaos testing (kill processes, network issues)
- [ ] Update documentation
- [ ] Create runbooks

---

## Testing Strategy

### 1. Unit Tests
```javascript
describe('VerificationManager', () => {
  it('should verify knob application', async () => {
    // Test verification logic
  });

  it('should handle verification mismatches', async () => {
    // Test mismatch scenarios
  });
});
```

### 2. Integration Tests
```javascript
describe('Production Features', () => {
  it('should recover scheduled updates after restart', async () => {
    // Schedule updates
    // Restart server
    // Verify updates still execute
  });

  it('should handle circuit breaker opening', async () => {
    // Cause failures
    // Verify circuit opens
    // Test recovery
  });
});
```

### 3. Load Testing
```bash
# Artillery load test
artillery run load-test.yml

# Expected: 1000 concurrent scheduled updates
# Target: < 100ms response time
# Error rate: < 0.1%
```

### 4. Chaos Testing
```javascript
// ChaosTest.js
async function chaosTest() {
  // Random failures
  setInterval(() => {
    if (Math.random() < 0.1) {
      // Kill database connection
      db.end();
    }
  }, 10000);

  // Verify system recovers
}
```

---

## Success Criteria

### Functional Requirements
- ✅ Apply verification confirms knob applications
- ✅ System survives restarts without data loss
- ✅ Monitoring provides full observability
- ✅ Alerts fire for critical conditions
- ✅ Rate limiting protects against abuse

### Performance Requirements
- ✅ API response time < 100ms (p99)
- ✅ Can handle 1000+ scheduled updates
- ✅ Database queries < 50ms (p95)
- ✅ Memory usage < 500MB
- ✅ CPU usage < 50% under normal load

### Reliability Requirements
- ✅ 99.9% uptime
- ✅ Zero data loss on restart
- ✅ Automatic recovery from failures
- ✅ < 5% verification mismatch rate
- ✅ < 1% knob application failure rate

---

## Risk Assessment

### High Risk
1. **Database Overload**
   - Mitigation: Connection pooling, query optimization, caching

2. **Memory Leak in BucketScheduler**
   - Mitigation: Proper cleanup, memory monitoring, alerts

### Medium Risk
1. **Network Partitions**
   - Mitigation: Circuit breaker, retry logic, timeouts

2. **Clock Skew**
   - Mitigation: NTP sync, tolerance windows, monitoring

### Low Risk
1. **Audit Log Growth**
   - Mitigation: Log rotation, archival strategy

---

## Documentation Requirements

### 1. API Documentation
- OpenAPI/Swagger specification
- Example requests/responses
- Error codes and meanings

### 2. Operations Runbook
- Startup procedures
- Troubleshooting guide
- Alert response procedures
- Rollback procedures

### 3. Architecture Documentation
- System diagrams
- Data flow diagrams
- Database schema
- Deployment architecture

---

## Deliverables

1. **Code Deliverables**
   - [ ] VerificationManager.js
   - [ ] PersistenceLayer.js
   - [ ] MetricsCollector.js
   - [ ] CircuitBreaker.js
   - [ ] AlertManager.js
   - [ ] HealthCheck.js

2. **Configuration Files**
   - [ ] prometheus.yml
   - [ ] alerts.rules
   - [ ] docker-compose.prod.yml
   - [ ] pm2.ecosystem.config.js

3. **Documentation**
   - [ ] API documentation
   - [ ] Operations runbook
   - [ ] Architecture diagrams
   - [ ] Test reports

4. **Dashboard & Monitoring**
   - [ ] Grafana dashboards
   - [ ] Alert configurations
   - [ ] Log aggregation setup

---

## Phase 3 Completion Checklist

- [ ] All code components implemented
- [ ] Unit tests passing (>90% coverage)
- [ ] Integration tests passing
- [ ] Load tests meeting targets
- [ ] Documentation complete
- [ ] Monitoring dashboard operational
- [ ] Alerts configured and tested
- [ ] Runbooks reviewed and approved
- [ ] Production deployment successful
- [ ] 48-hour burn-in test passed

---

## Next Steps (Phase 4 Preview)

### Phase 4: Advanced Features (NICE TO HAVE)
1. **Machine Learning Integration**
   - Predictive knob adjustments
   - Anomaly detection
   - Pattern recognition

2. **Multi-Region Support**
   - Distributed scheduling
   - Cross-region replication
   - Global monitoring

3. **Advanced Analytics**
   - Historical analysis
   - A/B testing framework
   - Performance benchmarking

---

*Plan prepared by: AI Optimizer Team*
*Date: 2026-01-04*
*Version: 1.0.0*