# NEW Monitoring System - Optimizer Integration Gap Analysis
## Date: January 4, 2026

---

## Executive Summary

**Overall Completion: 40%**

The NEW Monitoring System has successfully implemented the foundation (database, metrics aggregation, knob management) but **lacks the critical API endpoints** required for the AI Optimizer to function.

### What's Working ✅ (40%)
- Database schema and storage
- 5-second aggregation system
- Knob snapshots every 5 seconds
- Dynamic knob updates via basic API
- Metrics collection (PRE/POST taps)
- Audio recording to WAV files

### What's Missing ❌ (60%)
- **ALL 4 required Optimizer API endpoints**
- Trace discovery mechanism
- Unified snapshot endpoint
- Audio segment retrieval API
- Deterministic knob application scheduling
- Authentication/authorization system
- Idempotency handling

---

## Detailed Gap Analysis

### 1. Trace Discovery & Management

#### REQUIRED: `/api/traces/active`
**Status: ❌ NOT IMPLEMENTED (0%)**

**What's Needed:**
```javascript
GET /api/traces/active
Returns: {
  "success": true,
  "active": [{
    "trace_id": "trace_abc123",
    "started_at": "2026-01-03T21:14:52.100Z",
    "src_extension": "3333",
    "dst_extension": "4444",
    "stations": ["St_3_3333", "St_3_4444"]
  }]
}
```

**Current State:**
- Traces ARE created and stored in database
- BUT no API to query active traces
- No tracking of which traces are "active" vs "ended"
- No exposure of station associations

**Gap:**
- Need to add `ended_at` tracking to traces table ✓ (schema exists)
- Need to implement the `/api/traces/active` endpoint
- Need to expose src/dst extensions from call metadata

---

### 2. Unified Snapshot API (Core Optimizer Input)

#### REQUIRED: `/api/optimizer/snapshot`
**Status: ❌ NOT IMPLEMENTED (0%)**

**What's Needed:**
```javascript
GET /api/optimizer/snapshot?trace_id=X&limit=1
Returns: Complete bucket data with metrics, knobs, and audio refs
```

**Current State:**
- Metrics ARE stored in `metrics_agg_5s` table ✅
- Knob snapshots ARE stored in `knob_snapshots_5s` table ✅
- Audio segments ARE written to disk ✅
- BUT no unified API to retrieve all together

**Gap:**
- Need to implement endpoint that JOINs:
  - metrics_agg_5s (for PRE/POST metrics)
  - knob_snapshots_5s (for effective knobs)
  - audio_segments_5s (for file paths)
- Need to format response per specification
- Need bucket timestamp filtering

---

### 3. Audio Segment Retrieval

#### REQUIRED: `/api/audio/segment`
**Status: ❌ NOT IMPLEMENTED (0%)**

**What's Needed:**
```javascript
GET /api/audio/segment?trace_id=X&station_key=Y&tap=PRE&bucket_ts=Z
Returns: Binary WAV file
```

**Current State:**
- Audio IS being recorded to `/var/monitoring/audio/` ✅
- Files are properly organized by date/trace/station/tap ✅
- WAV format with correct headers ✅
- BUT no HTTP endpoint to retrieve them

**Gap:**
- Need endpoint to serve WAV files
- Need to handle file path resolution from query params
- Need proper Content-Type and custom headers
- Need error handling for missing files

---

### 4. Deterministic Knob Application

#### REQUIRED: `/api/optimizer/knobs/apply`
**Status: ⚠️ PARTIALLY IMPLEMENTED (30%)**

**What's Needed:**
```javascript
POST /api/optimizer/knobs/apply
{
  "trace_id": "trace_abc123",
  "station_key": "St_3_3333",
  "apply_at_bucket_ts": "2026-01-03T21:15:10.000Z",
  "idempotency_key": "uuid",
  "knobs": {"pcm.input_gain_db": -3}
}
```

**Current Implementation:**
```javascript
POST /api/knobs/update/global  // ✅ Works but wrong pattern
POST /api/knobs/update/trace   // ✅ Works but wrong pattern
```

**Gaps:**
- Current implementation updates IMMEDIATELY, not at future bucket
- No `apply_at_bucket_ts` scheduling mechanism
- No idempotency key handling
- No station-specific targeting (only trace/global)
- Wrong endpoint path and request structure

---

### 5. Supporting Infrastructure

#### 5.1 Bucket Alignment & Scheduling
**Status: ⚠️ PARTIAL (50%)**

**Current:**
- Aggregator runs on 5-second buckets ✅
- Bucket timestamps are properly aligned ✅

**Missing:**
- No mechanism to schedule future knob changes
- No queue or timer for deferred application

#### 5.2 Configuration Versioning
**Status: ❌ NOT IMPLEMENTED (0%)**

**Needed:**
- `config_version` counter per trace/station
- Increment on each knob change
- Return in snapshot response

#### 5.3 Idempotency
**Status: ❌ NOT IMPLEMENTED (0%)**

**Needed:**
- Store and check `idempotency_key`
- Prevent duplicate knob applications
- Return same response for duplicate keys

#### 5.4 Authentication
**Status: ❌ NOT IMPLEMENTED (0%)**

**Needed (for production):**
- Bearer token validation
- Scoped permissions (read:snapshots, write:knobs)
- Rate limiting per client

---

## Implementation Priority & Effort Estimate

### Phase 1: Core APIs (MUST HAVE)
**Effort: 2-3 days**

1. **`/api/traces/active`** (4 hours)
   - Query traces with ended_at IS NULL
   - Join with call metadata for extensions
   - Format response per spec

2. **`/api/optimizer/snapshot`** (8 hours)
   - Complex JOIN query across 3 tables
   - Format nested PRE/POST metrics
   - Add audio endpoint URLs
   - Handle since_bucket_ts filtering

3. **`/api/audio/segment`** (3 hours)
   - File path resolution
   - Stream WAV files
   - Add proper headers

### Phase 2: Advanced Control (MUST HAVE)
**Effort: 2 days**

4. **`/api/optimizer/knobs/apply`** (8 hours)
   - Implement scheduling queue
   - Add idempotency key storage
   - Station-specific knob targeting
   - Bucket-aligned application

5. **Config versioning** (4 hours)
   - Add version tracking
   - Increment on changes
   - Include in responses

### Phase 3: Production Readiness (SHOULD HAVE)
**Effort: 1-2 days**

6. **Authentication** (4 hours)
   - Bearer token middleware
   - Permission scoping

7. **Rate limiting** (2 hours)
   - Per-endpoint limits
   - Client tracking

8. **Error handling & logging** (4 hours)
   - Consistent error responses
   - Audit logging

---

## Database Schema Additions Needed

```sql
-- For idempotency
CREATE TABLE knob_apply_requests (
  idempotency_key UUID PRIMARY KEY,
  trace_id VARCHAR(255) NOT NULL,
  station_key VARCHAR(50) NOT NULL,
  apply_at_bucket_ts TIMESTAMP NOT NULL,
  knobs JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  applied_at TIMESTAMP,
  config_version INTEGER
);

-- For configuration versioning
ALTER TABLE knob_snapshots_5s
  ADD COLUMN config_version INTEGER DEFAULT 0;

-- Index for active trace queries
CREATE INDEX idx_traces_active
  ON traces(ended_at)
  WHERE ended_at IS NULL;
```

---

## Code Files to Create/Modify

### New Files Needed:
1. `/api/optimizerEndpoints.js` - All optimizer API endpoints
2. `/lib/bucketScheduler.js` - Deferred knob application
3. `/lib/idempotencyHandler.js` - Duplicate request prevention
4. `/lib/configVersioning.js` - Version tracking

### Files to Modify:
1. `STTTTSserver.js` - Add new API routes
2. `DatabaseBridge.js` - Add queries for optimizer
3. `KnobsResolver.js` - Add scheduled application support
4. `St_Handler_Generic.js` - Track config versions

---

## Testing Requirements

### Integration Tests Needed:
1. **Trace lifecycle**: Start call → Active → End call → Not active
2. **Snapshot consistency**: Metrics + Knobs + Audio aligned
3. **Knob scheduling**: Apply at future bucket → Verify application
4. **Idempotency**: Duplicate requests return same response
5. **Audio retrieval**: Correct WAV file served

### Load Tests:
- Optimizer pulling every 5 seconds
- Multiple concurrent traces
- Rapid knob updates

---

## Risks & Mitigations

### Risk 1: Timing Issues
**Issue**: Optimizer might request bucket that's still being written
**Mitigation**: Only return buckets older than NOW() - 1 second

### Risk 2: Database Performance
**Issue**: Complex JOINs for snapshot might be slow
**Mitigation**: Add proper indexes, consider materialized view

### Risk 3: File System Access
**Issue**: Audio files might be locked during write
**Mitigation**: Use read-only file handles, add retry logic

---

## Recommended Next Steps

### Immediate (Today):
1. ✅ Create branch for optimizer integration
2. ✅ Backup current working system
3. 🔄 Start implementing `/api/traces/active`

### This Week:
1. Implement all 4 core API endpoints
2. Add basic integration tests
3. Deploy to test environment
4. Connect Python optimizer for testing

### Next Week:
1. Add authentication layer
2. Implement rate limiting
3. Performance optimization
4. Production deployment

---

## Success Criteria

The Optimizer Integration will be considered complete when:

1. ✅ Python optimizer can discover active traces
2. ✅ Optimizer can pull complete bucket snapshots
3. ✅ Optimizer can retrieve PRE/POST audio segments
4. ✅ Optimizer can apply knobs for future buckets
5. ✅ Applied knobs take effect at specified bucket
6. ✅ Config version increments properly
7. ✅ Idempotent requests work correctly
8. ✅ System handles 10+ concurrent traces

---

## Conclusion

The NEW Monitoring System has a **solid foundation** but requires **significant API development** to support the AI Optimizer. The database and aggregation layers are working well, but the HTTP API layer needs to be built almost from scratch.

**Estimated Total Effort**: 5-7 days for full implementation

**Critical Path**:
1. `/api/traces/active` (enables discovery)
2. `/api/optimizer/snapshot` (enables analysis)
3. `/api/optimizer/knobs/apply` (enables control)
4. `/api/audio/segment` (enables ML processing)

Without these endpoints, the Optimizer cannot function at all.

---

*Gap Analysis completed: January 4, 2026*
*System version: NEW Monitoring System v1.0*
*Target: Full Optimizer Integration v1.0*