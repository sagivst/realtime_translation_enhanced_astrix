/**
 * Optimizer Agent - Transport Layer
 * Polls STTTTSserver APIs and forwards to AI Service
 * Contains ZERO optimization logic - just a courier
 */

const fetch = require('node-fetch');
const crypto = require('crypto');

// Configuration
const STTTS_SERVER = process.env.STTTS_SERVER || 'http://localhost:3020';
const AI_SERVICE = process.env.AI_SERVICE || 'http://localhost:3090';
const POLL_INTERVAL = 5000; // 5 seconds

// State management
let isProcessing = false;

/**
 * Main optimization loop - runs every 5 seconds
 */
async function optimizationLoop() {
  // Prevent overlapping executions
  if (isProcessing) {
    console.log('[Optimizer Agent] Still processing previous loop, skipping...');
    return;
  }

  isProcessing = true;

  try {
    // Step 1: Discover active traces
    console.log('[Optimizer Agent] Polling for active traces...');
    const tracesResponse = await fetch(`${STTTS_SERVER}/api/traces/active`);

    if (!tracesResponse.ok) {
      console.error('[Optimizer Agent] Failed to get active traces:', tracesResponse.status);
      return;
    }

    const tracesData = await tracesResponse.json();

    if (!tracesData.success || !tracesData.active || tracesData.active.length === 0) {
      console.log('[Optimizer Agent] No active traces found');
      return;
    }

    console.log(`[Optimizer Agent] Found ${tracesData.active.length} active traces`);

    // Process each active trace
    for (const trace of tracesData.active) {
      try {
        await processTrace(trace);
      } catch (err) {
        console.error(`[Optimizer Agent] Error processing trace ${trace.trace_id}:`, err.message);
      }
    }

  } catch (error) {
    console.error('[Optimizer Agent] Loop error:', error.message);
  } finally {
    isProcessing = false;
  }
}

/**
 * Process a single trace
 */
async function processTrace(trace) {
  console.log(`[Optimizer Agent] Processing trace: ${trace.trace_id}`);

  // Step 2: Get snapshot for this trace
  const snapshotResponse = await fetch(
    `${STTTS_SERVER}/api/optimizer/snapshot?trace_id=${trace.trace_id}&limit=1`
  );

  if (!snapshotResponse.ok) {
    console.error(`[Optimizer Agent] Failed to get snapshot for ${trace.trace_id}:`, snapshotResponse.status);
    return;
  }

  const snapshotData = await snapshotResponse.json();

  if (!snapshotData.success || !snapshotData.buckets || snapshotData.buckets.length === 0) {
    console.log(`[Optimizer Agent] No bucket data for trace ${trace.trace_id}`);
    return;
  }

  // Process each bucket (usually just one)
  for (const bucket of snapshotData.buckets) {
    try {
      await processBucket(trace.trace_id, bucket);
    } catch (err) {
      console.error(`[Optimizer Agent] Error processing bucket for ${bucket.station_key}:`, err.message);
    }
  }
}

/**
 * Process a single bucket snapshot
 */
async function processBucket(traceId, bucket) {
  console.log(`[Optimizer Agent] Processing bucket for station ${bucket.station_key} at ${bucket.bucket_ts}`);

  // Check if optimization is allowed (if knobs are present)
  if (bucket.knobs_snapshot && bucket.knobs_snapshot['ai.optimization_allowed'] === false) {
    console.log(`[Optimizer Agent] AI optimization disabled for ${bucket.station_key}`);
    return;
  }

  // Step 3: Forward snapshot to AI Service
  const aiRequest = {
    trace_id: traceId,
    bucket_ts: bucket.bucket_ts,
    bucket_ms: bucket.bucket_ms || 5000,
    station_key: bucket.station_key,
    config_version: bucket.config_version || 1,
    metrics: bucket.metrics || {},
    knobs: bucket.knobs_snapshot || {},
    audio: bucket.audio || {},
    policy: {
      target_rms_dbfs: -18,
      max_gain_step_db: 2,
      max_clipping_ratio: 0.002
    }
  };

  console.log(`[Optimizer Agent] Sending to AI service for analysis...`);

  const aiResponse = await fetch(`${AI_SERVICE}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(aiRequest),
    timeout: 5000 // 5 second timeout
  });

  if (!aiResponse.ok) {
    console.error(`[Optimizer Agent] AI service error for ${bucket.station_key}:`, aiResponse.status);
    return;
  }

  const aiResult = await aiResponse.json();

  if (!aiResult.decisions || aiResult.decisions.length === 0) {
    console.log(`[Optimizer Agent] No optimization decisions for ${bucket.station_key}`);
    return;
  }

  console.log(`[Optimizer Agent] Received ${aiResult.decisions.length} decisions for ${bucket.station_key}`);

  // Step 4: Apply each decision
  for (const decision of aiResult.decisions) {
    try {
      await applyDecision(traceId, bucket.station_key, decision);
    } catch (err) {
      console.error(`[Optimizer Agent] Error applying decision:`, err.message);
    }
  }
}

/**
 * Apply a single optimization decision
 */
async function applyDecision(traceId, stationKey, decision) {
  // Calculate next bucket timestamp (current time + 5 seconds, aligned to 5-second boundary)
  const now = new Date();
  const nextBucketMs = Math.ceil((now.getTime() + 5000) / 5000) * 5000;
  const applyAtBucketTs = new Date(nextBucketMs).toISOString();

  // Generate idempotency key
  const idempotencyKey = crypto.randomUUID();

  // Build knobs object from decision
  const knobs = {};
  if (decision.knobs) {
    Object.assign(knobs, decision.knobs);
  } else if (decision.knob && decision.recommended_value !== undefined) {
    knobs[decision.knob] = decision.recommended_value;
  } else {
    console.error('[Optimizer Agent] Invalid decision format:', decision);
    return;
  }

  const applyRequest = {
    trace_id: traceId,
    station_key: stationKey,
    apply_at_bucket_ts: applyAtBucketTs,
    idempotency_key: idempotencyKey,
    source: 'auto_optimizer',
    reason: decision.reason || 'AI optimization',
    knobs: knobs
  };

  console.log("[DEBUG] Applying request:", JSON.stringify(applyRequest, null, 2));
  console.log(`[Optimizer Agent] Scheduling knob update for ${stationKey}:`,
    Object.entries(knobs).map(([k, v]) => `${k}=${v}`).join(', '));

  const applyResponse = await fetch(`${STTTS_SERVER}/api/optimizer/knobs/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(applyRequest)
  });

  if (!applyResponse.ok) {
    const errorText = await applyResponse.text();
    console.error(`[Optimizer Agent] Failed to apply knobs:`, errorText);
    return;
  }

  const applyResult = await applyResponse.json();

  if (applyResult.success) {
    console.log(`[Optimizer Agent] Successfully scheduled knob update:`, {
      station: decision.station_key,
      apply_at: applyAtBucketTs,
      config_version: applyResult.config_version
    });
  } else {
    console.error(`[Optimizer Agent] Knob apply failed:`, applyResult.error);
  }
}

/**
 * Start the optimizer agent
 */
function start() {
  console.log('[Optimizer Agent] Starting...');
  console.log(`[Optimizer Agent] STTTS Server: ${STTTS_SERVER}`);
  console.log(`[Optimizer Agent] AI Service: ${AI_SERVICE}`);
  console.log(`[Optimizer Agent] Poll Interval: ${POLL_INTERVAL}ms`);

  // Run immediately on startup
  optimizationLoop();

  // Then run every 5 seconds
  setInterval(optimizationLoop, POLL_INTERVAL);

  console.log('[Optimizer Agent] Started - polling every 5 seconds');
}

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('[Optimizer Agent] Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Optimizer Agent] Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start the agent
start();