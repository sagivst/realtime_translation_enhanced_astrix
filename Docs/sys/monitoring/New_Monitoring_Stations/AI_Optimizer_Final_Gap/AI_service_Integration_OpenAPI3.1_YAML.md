openapi: 3.1.0
info:
  title: AI Optimizer Service API
  version: "1.0.0"
  description: >
    Local-only AI optimization service running on the same VM.
    The Optimizer Agent forwards snapshots; this service returns deterministic knob actions.
servers:
  - url: http://127.0.0.1:3090
    description: Local loopback only
paths:
  /v1/health:
    get:
      operationId: health
      summary: Health check
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                additionalProperties: false
                required: [ok]
                properties:
                  ok:
                    type: boolean
  /v1/optimize:
    post:
      operationId: optimize
      summary: Return knob-change decisions for a given 5s snapshot
      description: >
        Accepts one snapshot (single station/bucket context) and returns zero or more decisions.
        Response MUST be JSON only; caller must still validate/clamp server-side if desired.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/OptimizeRequest"
            examples:
              minimal:
                summary: Minimal request
                value:
                  trace_id: "trace_123"
                  bucket_ts: "2026-01-04T18:30:00.000Z"
                  bucket_ms: 5000
                  station_key: "St_3_3333"
                  config_version: 12
                  metrics:
                    PRE:
                      pcm.rms_dbfs: { avg: -24.3 }
                      pcm.clipping_ratio: { avg: 0.0 }
                    POST:
                      pcm.rms_dbfs: { avg: -20.1 }
                      pcm.clipping_ratio: { avg: 0.002 }
                  knobs_snapshot:
                    pcm.input_gain_db: 0
                    limiter.enabled: true
                    limiter.threshold_dbfs: -6
                  audio:
                    pre_url: "http://127.0.0.1:3020/api/audio/segment/trace_123/St_3_3333/PRE/2026-01-04T18:30:00.000Z.wav"
                    post_url: "http://127.0.0.1:3020/api/audio/segment/trace_123/St_3_3333/POST/2026-01-04T18:30:00.000Z.wav"
                  policy:
                    target_rms_dbfs: -18
                    max_gain_step_db: 2
                    max_abs_gain_db: 12
                    max_clipping_ratio: 0.002
      responses:
        "200":
          description: Optimization decisions (may be empty)
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OptimizeResponse"
              examples:
                no_change:
                  summary: No changes recommended
                  value:
                    decisions: []
                gain_change:
                  summary: Apply +2 dB next bucket
                  value:
                    decisions:
                      - station_key: "St_3_3333"
                        apply_in_buckets: 1
                        knobs:
                          pcm.input_gain_db: 2
                        reason: "RMS below target; safe +2 dB increase"
                        confidence: 0.82
        "400":
          description: Invalid request payload
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
        "500":
          description: Internal error (e.g., model or parsing failure)
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"

components:
  schemas:
    OptimizeRequest:
      type: object
      additionalProperties: false
      required:
        - trace_id
        - bucket_ts
        - bucket_ms
        - station_key
        - config_version
        - metrics
        - knobs_snapshot
      properties:
        trace_id:
          type: string
          description: Unique call/trace identifier
          minLength: 1
          maxLength: 255
        bucket_ts:
          type: string
          format: date-time
          description: Bucket timestamp (aligned to 5s boundaries)
        bucket_ms:
          type: integer
          description: Bucket duration in milliseconds
          const: 5000
        station_key:
          type: string
          description: Station identifier (e.g., St_3_3333)
          minLength: 1
          maxLength: 50
        config_version:
          type: integer
          description: Monotonic config version for knob state
          minimum: 0

        station_group:
          type: string
          description: Optional station grouping label
          maxLength: 50
        layer:
          type: string
          description: Optional layer label
          maxLength: 20
        direction:
          type: string
          description: Optional direction label
          enum: [RX, TX]
        tap:
          type: string
          description: Optional tap label (when request is already tap-scoped)
          enum: [PRE, POST]

        metrics:
          $ref: "#/components/schemas/TapMetrics"
        knobs_snapshot:
          $ref: "#/components/schemas/KnobsSnapshot"

        audio:
          $ref: "#/components/schemas/AudioRefs"
        policy:
          $ref: "#/components/schemas/Policy"

    OptimizeResponse:
      type: object
      additionalProperties: false
      required: [decisions]
      properties:
        decisions:
          type: array
          items:
            $ref: "#/components/schemas/Decision"
          description: Zero or more recommended knob actions

    TapMetrics:
      type: object
      additionalProperties: false
      required: [PRE, POST]
      properties:
        PRE:
          $ref: "#/components/schemas/MetricsMap"
        POST:
          $ref: "#/components/schemas/MetricsMap"

    MetricsMap:
      type: object
      description: >
        Map of metric_key -> aggregated values for the bucket.
        Metric keys are string identifiers (e.g., pcm.rms_dbfs).
      additionalProperties:
        $ref: "#/components/schemas/MetricAgg"

    MetricAgg:
      type: object
      additionalProperties: false
      required: [avg]
      properties:
        count:
          type: integer
          minimum: 0
          description: Number of samples/frames aggregated
        min:
          type: number
          description: Minimum observed value
        max:
          type: number
          description: Maximum observed value
        sum:
          type: number
          description: Sum of observed values
        avg:
          type: number
          description: Average value (primary signal)
        last:
          type: number
          description: Last observed value in bucket

    KnobsSnapshot:
      type: object
      description: >
        Map of knob_key -> current effective value at snapshot time.
        Values may be number/boolean/string depending on knob.
      additionalProperties:
        $ref: "#/components/schemas/KnobValue"

    KnobValue:
      description: Knob value
      oneOf:
        - type: number
        - type: integer
        - type: boolean
        - type: string
        - type: "null"

    AudioRefs:
      type: object
      additionalProperties: false
      required: [pre_url, post_url]
      properties:
        pre_url:
          type: string
          format: uri
          description: URL to fetch PRE 5s WAV segment
        post_url:
          type: string
          format: uri
          description: URL to fetch POST 5s WAV segment

    Policy:
      type: object
      additionalProperties: false
      description: Optional safety/target constraints for the optimizer
      properties:
        target_rms_dbfs:
          type: number
          description: Target RMS loudness (dBFS)
        min_rms_dbfs:
          type: number
          description: Lower acceptable RMS bound (dBFS)
        max_rms_dbfs:
          type: number
          description: Upper acceptable RMS bound (dBFS)
        max_clipping_ratio:
          type: number
          minimum: 0
          maximum: 1
        max_gain_step_db:
          type: number
          minimum: 0
          description: Maximum allowed gain change per decision (dB)
        max_abs_gain_db:
          type: number
          minimum: 0
          description: Maximum absolute gain allowed (dB)

    Decision:
      type: object
      additionalProperties: false
      required: [station_key, apply_in_buckets, knobs, reason, confidence]
      properties:
        station_key:
          type: string
          minLength: 1
          maxLength: 50
        apply_in_buckets:
          type: integer
          minimum: 0
          description: >
            How many 5s buckets ahead to apply the knobs (0 means immediate for next boundary logic at caller)
        knobs:
          type: object
          description: Map of knob_key -> new value to set
          additionalProperties:
            $ref: "#/components/schemas/KnobValue"
        reason:
          type: string
          minLength: 1
          maxLength: 2000
        confidence:
          type: number
          minimum: 0
          maximum: 1

    ErrorResponse:
      type: object
      additionalProperties: false
      required: [error]
      properties:
        error:
          type: string
        details:
          description: Optional structured details
          oneOf:
            - type: object
            - type: array
            - type: string
            - type: "null"