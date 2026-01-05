openapi: 3.1.0
info:
  title: NEW Monitoring System - Optimizer Integration API
  version: "1.0.0"
  description: >
    Pull-based Optimizer Integration API for the NEW Monitoring System (STTTTSserver).
    Bucket-aligned (5s) monitoring with PRE/POST metrics, audio segments, and deterministic knob application.

servers:
  - url: http://20.170.155.53:3020
    description: STTTTSserver (Azure VM)

tags:
  - name: Traces
    description: Trace discovery and lifecycle
  - name: Optimizer
    description: Pull snapshots and apply knobs deterministically
  - name: Audio
    description: Retrieve 5-second PRE/POST audio segments
  - name: Monitoring
    description: Monitoring subsystem status

security:
  - bearerAuth: []

paths:
  /api/traces/active:
    get:
      tags: [Traces]
      summary: List active traces eligible for optimization
      description: >
        Returns currently active traces and their active stations. Used by the Optimizer for discovery.
      operationId: getActiveTraces
      security: []  # Set to [] if no auth currently; remove to enforce bearerAuth
      responses:
        "200":
          description: Active traces
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActiveTracesResponse"
        "500":
          description: Internal error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"

  /api/optimizer/snapshot:
    get:
      tags: [Optimizer]
      summary: Pull unified optimization snapshot (metrics + knobs + audio refs)
      description: >
        Returns one or more completed 5-second buckets for a trace, including PRE/POST aggregated metrics,
        effective knobs snapshot, and audio retrieval endpoints. This is the core Optimizer input.
      operationId: getOptimizerSnapshot
      security: []  # Set to [] if no auth currently; remove to enforce bearerAuth
      parameters:
        - name: trace_id
          in: query
          required: true
          schema:
            type: string
            minLength: 1
          description: Trace identifier
        - name: since_bucket_ts
          in: query
          required: false
          schema:
            $ref: "#/components/schemas/IsoTimestamp"
          description: Return buckets strictly after this bucket timestamp
        - name: limit
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 50
            default: 1
          description: Maximum number of buckets to return
      responses:
        "200":
          description: Unified snapshot response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OptimizerSnapshotResponse"
        "400":
          description: Bad request (missing/invalid query params)
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"
        "404":
          description: Trace not found or no buckets available
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"
        "500":
          description: Internal error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"

  /api/optimizer/knobs/apply:
    post:
      tags: [Optimizer]
      summary: Apply knobs deterministically at a future bucket boundary
      description: >
        Schedules knob changes for a future bucket timestamp. Requests MUST be idempotent via idempotency_key.
        Server MUST validate/clamp values and apply only at bucket boundary.
      operationId: applyOptimizerKnobs
      security: []  # Set to [] if no auth currently; remove to enforce bearerAuth
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ApplyKnobsRequest"
      responses:
        "200":
          description: Apply accepted/rejected response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApplyKnobsResponse"
        "400":
          description: Bad request (unknown knob, invalid types/ranges)
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"
        "404":
          description: Trace/station not found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"
        "409":
          description: Conflict (apply_at_bucket_ts no longer valid)
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"
        "429":
          description: Rate limited
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"
        "500":
          description: Internal error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"

  /api/audio/segment:
    get:
      tags: [Audio]
      summary: Download a 5-second WAV segment (PRE/POST)
      description: >
        Returns the raw WAV audio for a specific trace/station/tap/bucket.
        Response body is binary WAV (PCM S16LE mono, 16 kHz).
      operationId: getAudioSegment
      security: []  # Set to [] if no auth currently; remove to enforce bearerAuth
      parameters:
        - name: trace_id
          in: query
          required: true
          schema:
            type: string
            minLength: 1
        - name: station_key
          in: query
          required: true
          schema:
            type: string
            minLength: 1
        - name: tap
          in: query
          required: true
          schema:
            $ref: "#/components/schemas/Tap"
        - name: bucket_ts
          in: query
          required: true
          schema:
            $ref: "#/components/schemas/IsoTimestamp"
      responses:
        "200":
          description: WAV audio segment
          headers:
            Content-Type:
              description: audio/wav
              schema:
                type: string
            X-Sample-Rate:
              description: Sample rate in Hz
              schema:
                type: integer
                example: 16000
            X-Channels:
              description: Number of channels
              schema:
                type: integer
                example: 1
            X-Bucket-MS:
              description: Bucket duration in ms
              schema:
                type: integer
                example: 5000
            X-Trace-Id:
              schema:
                type: string
            X-Station-Key:
              schema:
                type: string
            X-Tap:
              schema:
                type: string
                enum: [PRE, POST]
            X-Bucket-Ts:
              schema:
                type: string
          content:
            audio/wav:
              schema:
                type: string
                format: binary
        "400":
          description: Bad request
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"
        "404":
          description: Segment not found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"
        "500":
          description: Internal error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"

  /api/monitoring/status:
    get:
      tags: [Monitoring]
      summary: Monitoring subsystem status
      description: Reports monitoring runtime state and basic DB/audio/knobs counters.
      operationId: getMonitoringStatus
      security: []  # Existing endpoint; keep as-is
      responses:
        "200":
          description: Status report
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/MonitoringStatusResponse"
        "500":
          description: Internal error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    IsoTimestamp:
      type: string
      description: ISO-8601 UTC timestamp with millisecond precision and 'Z' suffix.
      pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$"
      examples:
        - "2026-01-03T21:15:00.000Z"

    Tap:
      type: string
      enum: [PRE, POST]

    ActiveTracesResponse:
      type: object
      additionalProperties: false
      properties:
        success:
          type: boolean
          const: true
        active:
          type: array
          items:
            $ref: "#/components/schemas/ActiveTrace"
      required: [success, active]

    ActiveTrace:
      type: object
      additionalProperties: false
      properties:
        trace_id:
          type: string
          minLength: 1
        started_at:
          $ref: "#/components/schemas/IsoTimestamp"
        src_extension:
          type: string
          minLength: 1
        dst_extension:
          type: string
          minLength: 1
        call_id:
          type: [string, "null"]
        stations:
          type: array
          minItems: 1
          items:
            type: string
            minLength: 1
      required: [trace_id, started_at, src_extension, dst_extension, stations]

    MetricAggregate:
      type: object
      additionalProperties: false
      properties:
        count:
          type: integer
          minimum: 0
        min:
          type: [number, "null"]
        max:
          type: [number, "null"]
        sum:
          type: [number, "null"]
        avg:
          type: [number, "null"]
        last:
          type: [number, "null"]
      required: [count]

    MetricsBlock:
      type: object
      additionalProperties: false
      properties:
        PRE:
          type: object
          description: Map of metric_key -> MetricAggregate
          additionalProperties:
            $ref: "#/components/schemas/MetricAggregate"
        POST:
          type: object
          description: Map of metric_key -> MetricAggregate
          additionalProperties:
            $ref: "#/components/schemas/MetricAggregate"
      required: [PRE, POST]

    AudioLink:
      type: object
      additionalProperties: false
      properties:
        endpoint:
          type: string
          minLength: 1
          description: Relative endpoint for retrieving the audio segment
          examples:
            - "/api/audio/segment?trace_id=trace_abc123&station_key=St_3_3333&tap=PRE&bucket_ts=2026-01-03T21:15:00.000Z"
      required: [endpoint]

    SnapshotAudioBlock:
      type: object
      additionalProperties: false
      properties:
        PRE:
          $ref: "#/components/schemas/AudioLink"
        POST:
          $ref: "#/components/schemas/AudioLink"
      required: [PRE, POST]

    SnapshotBucket:
      type: object
      additionalProperties: false
      properties:
        bucket_ts:
          $ref: "#/components/schemas/IsoTimestamp"
        bucket_ms:
          type: integer
          const: 5000
        station_key:
          type: string
          minLength: 1
        knobs_snapshot:
          type: object
          description: Effective knobs snapshot for this station+bucket (key -> scalar)
          additionalProperties:
            anyOf:
              - type: number
              - type: integer
              - type: boolean
              - type: string
              - type: "null"
        metrics:
          $ref: "#/components/schemas/MetricsBlock"
        audio:
          $ref: "#/components/schemas/SnapshotAudioBlock"
        config_version:
          type: integer
          minimum: 0
        last_knob_event_id:
          type: [integer, "null"]
          minimum: 0
      required:
        - bucket_ts
        - bucket_ms
        - station_key
        - knobs_snapshot
        - metrics
        - audio
        - config_version

    OptimizerSnapshotResponse:
      type: object
      additionalProperties: false
      properties:
        success:
          type: boolean
          const: true
        trace_id:
          type: string
          minLength: 1
        buckets:
          type: array
          items:
            $ref: "#/components/schemas/SnapshotBucket"
      required: [success, trace_id, buckets]

    ApplyKnobsRequest:
      type: object
      additionalProperties: false
      properties:
        trace_id:
          type: string
          minLength: 1
        station_key:
          type: string
          minLength: 1
        apply_at_bucket_ts:
          $ref: "#/components/schemas/IsoTimestamp"
        idempotency_key:
          type: string
          minLength: 8
          maxLength: 128
        source:
          type: string
          minLength: 1
        reason:
          type: [string, "null"]
        knobs:
          type: object
          minProperties: 1
          additionalProperties:
            anyOf:
              - type: number
              - type: integer
              - type: boolean
              - type: string
      required:
        - trace_id
        - station_key
        - apply_at_bucket_ts
        - idempotency_key
        - source
        - knobs

    ApplyKnobsResponse:
      type: object
      additionalProperties: false
      properties:
        success:
          type: boolean
          const: true
        accepted:
          type: boolean
        apply_at_bucket_ts:
          $ref: "#/components/schemas/IsoTimestamp"
        config_version:
          type: integer
          minimum: 0
        effective_knobs:
          type: object
          additionalProperties:
            anyOf:
              - type: number
              - type: integer
              - type: boolean
              - type: string
        rejected_reason:
          type: [string, "null"]
      required: [success, accepted, apply_at_bucket_ts, config_version]

    ApiError:
      type: object
      additionalProperties: false
      properties:
        success:
          type: boolean
          const: false
        error:
          type: object
          additionalProperties: false
          properties:
            code:
              type: string
              enum:
                - BAD_REQUEST
                - NOT_FOUND
                - CONFLICT
                - RATE_LIMITED
                - UNAUTHORIZED
                - FORBIDDEN
                - INTERNAL_ERROR
            message:
              type: string
              minLength: 1
            details:
              type: [object, array, string, "null"]
            trace_id:
              type: [string, "null"]
            station_key:
              type: [string, "null"]
            bucket_ts:
              anyOf:
                - $ref: "#/components/schemas/IsoTimestamp"
                - type: "null"
          required: [code, message]
      required: [success, error]

    MonitoringStatusResponse:
      type: object
      additionalProperties: true
      properties:
        isRunning:
          type: boolean
        components:
          type: object
        stats:
          type: object
      required: [isRunning]