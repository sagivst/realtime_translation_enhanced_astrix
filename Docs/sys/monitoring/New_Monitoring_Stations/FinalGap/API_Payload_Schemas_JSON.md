 
Appendix D – API Payload Schemas (JSON)

D.0 Conventions
	•	Time format: ISO-8601 with Z (UTC), millisecond precision
Example: 2026-01-03T21:15:00.000Z
	•	Bucket alignment: bucket_ts MUST be aligned to 5s boundaries
	•	tap enum: "PRE" | "POST"
	•	Numbers: metrics values are floating point

⸻

D.1 Common Types

D.1.1 IsoTimestamp

{
  "$id": "https://schemas.monitoring.local/common/IsoTimestamp.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "IsoTimestamp",
  "type": "string",
  "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$"
}

D.1.2 Tap

{
  "$id": "https://schemas.monitoring.local/common/Tap.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Tap",
  "type": "string",
  "enum": ["PRE", "POST"]
}

D.1.3 SuccessEnvelope

{
  "$id": "https://schemas.monitoring.local/common/SuccessEnvelope.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SuccessEnvelope",
  "type": "object",
  "properties": {
    "success": { "type": "boolean", "const": true }
  },
  "required": ["success"],
  "additionalProperties": true
}


⸻

D.2 Trace Discovery

D.2.1 ActiveTracesResponse

Endpoint: GET /api/traces/active

{
  "$id": "https://schemas.monitoring.local/api/ActiveTracesResponse.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ActiveTracesResponse",
  "type": "object",
  "properties": {
    "success": { "type": "boolean", "const": true },
    "active": {
      "type": "array",
      "items": { "$ref": "#/$defs/ActiveTrace" }
    }
  },
  "required": ["success", "active"],
  "additionalProperties": false,
  "$defs": {
    "ActiveTrace": {
      "type": "object",
      "properties": {
        "trace_id": { "type": "string", "minLength": 1 },
        "started_at": { "$ref": "https://schemas.monitoring.local/common/IsoTimestamp.schema.json" },
        "src_extension": { "type": "string", "minLength": 1 },
        "dst_extension": { "type": "string", "minLength": 1 },
        "call_id": { "type": ["string", "null"] },
        "stations": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 },
          "minItems": 1
        }
      },
      "required": ["trace_id", "started_at", "src_extension", "dst_extension", "stations"],
      "additionalProperties": false
    }
  }
}


⸻

D.3 Snapshot API (Pull)

D.3.1 Metric Aggregate Object

{
  "$id": "https://schemas.monitoring.local/api/MetricAggregate.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "MetricAggregate",
  "type": "object",
  "properties": {
    "count": { "type": "integer", "minimum": 0 },
    "min": { "type": ["number", "null"] },
    "max": { "type": ["number", "null"] },
    "sum": { "type": ["number", "null"] },
    "avg": { "type": ["number", "null"] },
    "last": { "type": ["number", "null"] }
  },
  "required": ["count"],
  "additionalProperties": false
}

D.3.2 Metrics Block (PRE/POST)

{
  "$id": "https://schemas.monitoring.local/api/MetricsBlock.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "MetricsBlock",
  "type": "object",
  "properties": {
    "PRE": {
      "type": "object",
      "additionalProperties": { "$ref": "https://schemas.monitoring.local/api/MetricAggregate.schema.json" }
    },
    "POST": {
      "type": "object",
      "additionalProperties": { "$ref": "https://schemas.monitoring.local/api/MetricAggregate.schema.json" }
    }
  },
  "required": ["PRE", "POST"],
  "additionalProperties": false
}

D.3.3 Audio Link Object

{
  "$id": "https://schemas.monitoring.local/api/AudioLink.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "AudioLink",
  "type": "object",
  "properties": {
    "endpoint": { "type": "string", "minLength": 1 }
  },
  "required": ["endpoint"],
  "additionalProperties": false
}

D.3.4 Snapshot Bucket Object

{
  "$id": "https://schemas.monitoring.local/api/SnapshotBucket.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SnapshotBucket",
  "type": "object",
  "properties": {
    "bucket_ts": { "$ref": "https://schemas.monitoring.local/common/IsoTimestamp.schema.json" },
    "bucket_ms": { "type": "integer", "const": 5000 },
    "station_key": { "type": "string", "minLength": 1 },

    "knobs_snapshot": {
      "type": "object",
      "additionalProperties": {
        "anyOf": [
          { "type": "number" },
          { "type": "integer" },
          { "type": "boolean" },
          { "type": "string" },
          { "type": "null" }
        ]
      }
    },

    "metrics": { "$ref": "https://schemas.monitoring.local/api/MetricsBlock.schema.json" },

    "audio": {
      "type": "object",
      "properties": {
        "PRE": { "$ref": "https://schemas.monitoring.local/api/AudioLink.schema.json" },
        "POST": { "$ref": "https://schemas.monitoring.local/api/AudioLink.schema.json" }
      },
      "required": ["PRE", "POST"],
      "additionalProperties": false
    },

    "config_version": { "type": "integer", "minimum": 0 },
    "last_knob_event_id": { "type": ["integer", "null"], "minimum": 0 }
  },
  "required": ["bucket_ts", "bucket_ms", "station_key", "knobs_snapshot", "metrics", "audio", "config_version"],
  "additionalProperties": false
}

D.3.5 Snapshot Response

Endpoint: GET /api/optimizer/snapshot

{
  "$id": "https://schemas.monitoring.local/api/OptimizerSnapshotResponse.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "OptimizerSnapshotResponse",
  "type": "object",
  "properties": {
    "success": { "type": "boolean", "const": true },
    "trace_id": { "type": "string", "minLength": 1 },
    "buckets": {
      "type": "array",
      "items": { "$ref": "https://schemas.monitoring.local/api/SnapshotBucket.schema.json" }
    }
  },
  "required": ["success", "trace_id", "buckets"],
  "additionalProperties": false
}


⸻

D.4 Apply Knobs API

D.4.1 Apply Request

Endpoint: POST /api/optimizer/knobs/apply

{
  "$id": "https://schemas.monitoring.local/api/ApplyKnobsRequest.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ApplyKnobsRequest",
  "type": "object",
  "properties": {
    "trace_id": { "type": "string", "minLength": 1 },
    "station_key": { "type": "string", "minLength": 1 },
    "apply_at_bucket_ts": { "$ref": "https://schemas.monitoring.local/common/IsoTimestamp.schema.json" },
    "idempotency_key": {
      "type": "string",
      "minLength": 8,
      "maxLength": 128
    },
    "source": { "type": "string", "minLength": 1 },
    "reason": { "type": ["string", "null"] },

    "knobs": {
      "type": "object",
      "minProperties": 1,
      "additionalProperties": {
        "anyOf": [
          { "type": "number" },
          { "type": "integer" },
          { "type": "boolean" },
          { "type": "string" }
        ]
      }
    }
  },
  "required": ["trace_id", "station_key", "apply_at_bucket_ts", "idempotency_key", "source", "knobs"],
  "additionalProperties": false
}

D.4.2 Apply Response

{
  "$id": "https://schemas.monitoring.local/api/ApplyKnobsResponse.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ApplyKnobsResponse",
  "type": "object",
  "properties": {
    "success": { "type": "boolean", "const": true },
    "accepted": { "type": "boolean" },
    "apply_at_bucket_ts": { "$ref": "https://schemas.monitoring.local/common/IsoTimestamp.schema.json" },
    "config_version": { "type": "integer", "minimum": 0 },
    "effective_knobs": {
      "type": "object",
      "additionalProperties": {
        "anyOf": [
          { "type": "number" },
          { "type": "integer" },
          { "type": "boolean" },
          { "type": "string" }
        ]
      }
    },
    "rejected_reason": { "type": ["string", "null"] }
  },
  "required": ["success", "accepted", "apply_at_bucket_ts", "config_version"],
  "additionalProperties": false
}


⸻

D.5 Audio Segment Endpoint

D.5.1 Audio Segment Response Headers (Contract)

Endpoint: GET /api/audio/segment

Response body: binary WAV

Required headers:
	•	Content-Type: audio/wav
	•	X-Sample-Rate: 16000
	•	X-Channels: 1
	•	X-Bucket-MS: 5000
	•	X-Trace-Id: <trace_id>
	•	X-Station-Key: <station_key>
	•	X-Tap: PRE|POST
	•	X-Bucket-Ts: <bucket_ts>

No JSON schema here because the body is binary.

⸻

D.6 Standard Error Schema (All Endpoints)

D.6.1 Error Response

{
  "$id": "https://schemas.monitoring.local/api/ApiError.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ApiError",
  "type": "object",
  "properties": {
    "success": { "type": "boolean", "const": false },
    "error": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string",
          "enum": [
            "BAD_REQUEST",
            "NOT_FOUND",
            "CONFLICT",
            "RATE_LIMITED",
            "UNAUTHORIZED",
            "FORBIDDEN",
            "INTERNAL_ERROR"
          ]
        },
        "message": { "type": "string", "minLength": 1 },
        "details": { "type": ["object", "array", "string", "null"] },
        "trace_id": { "type": ["string", "null"] },
        "station_key": { "type": ["string", "null"] },
        "bucket_ts": { "$ref": "https://schemas.monitoring.local/common/IsoTimestamp.schema.json" }
      },
      "required": ["code", "message"],
      "additionalProperties": false
    }
  },
  "required": ["success", "error"],
  "additionalProperties": false
}

D.6.2 Error → HTTP Mapping (Contract)
	•	400 → BAD_REQUEST
	•	401 → UNAUTHORIZED
	•	403 → FORBIDDEN
	•	404 → NOT_FOUND
	•	409 → CONFLICT
	•	429 → RATE_LIMITED
	•	500 → INTERNAL_ERROR

⸻

D.7 Minimal “Conflict” Rule (Required for Determinism)

When optimizer attempts to apply knobs to a bucket that is already started/closed:

Return:
	•	HTTP 409
	•	ApiError.code = "CONFLICT"
	•	details should include the next valid bucket timestamp

Example:

{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "apply_at_bucket_ts is no longer valid (bucket already started)",
    "details": {
      "next_valid_bucket_ts": "2026-01-03T21:15:15.000Z"
    },
    "trace_id": "trace_abc123",
    "station_key": "St_3_3333",
    "bucket_ts": "2026-01-03T21:15:10.000Z"
  }
}


⸻