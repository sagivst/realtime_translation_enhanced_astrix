// OpenAI Provider Swap for Audio Optimization System
// Production-Ready Implementation
// Maintains exact contract as rule-based system

const express = require('express');
const OpenAI = require('openai');
const app = express();
app.use(express.json());

// Configuration from environment
const PORT = process.env.AI_SERVICE_PORT || 3090;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
const API_TIMEOUT_MS = 2000;
const MAX_RETRIES = 2;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  timeout: API_TIMEOUT_MS
});

// Knob limits for validation
const KNOB_LIMITS = {
  'pcm.input_gain_db': { min: -20, max: 20 },
  'pcm.output_gain_db': { min: -20, max: 20 },
  'agc.target_level_dbfs': { min: -30, max: 0 },
  'limiter.threshold_dbfs': { min: -30, max: 0 },
  'compressor.threshold_dbfs': { min: -40, max: 0 },
  'noise_gate.threshold_dbfs': { min: -60, max: -10 }
};

// Rule-based fallback (existing logic)
function ruleBasedDecisions(snapshot) {
  const decisions = [];
  const currentGain = snapshot.knobs['pcm.input_gain_db'] || 0;
  const targetGain = 6;
  const step = 2;

  if (currentGain < targetGain) {
    const newGain = Math.min(currentGain + step, targetGain);
    decisions.push({
      knob: 'pcm.input_gain_db',
      recommended_value: newGain,
      confidence: 0.8,
      reason: 'Increasing gain towards target (fallback)'
    });
  }

  return decisions;
}

// Validate AI decisions
function validateDecisions(decisions) {
  return decisions.filter(decision => {
    const limits = KNOB_LIMITS[decision.knob];
    if (!limits) {
      console.warn(`Unknown knob: ${decision.knob}`);
      return false;
    }

    if (decision.recommended_value < limits.min || decision.recommended_value > limits.max) {
      console.warn(`Value out of range for ${decision.knob}: ${decision.recommended_value}`);
      return false;
    }

    return true;
  }).slice(0, 5); // Max 5 actions
}

// Create OpenAI prompt
function createPrompt(snapshot) {
  return `You are an audio optimization AI. Analyze this snapshot and provide knob adjustments.

Current snapshot:
${JSON.stringify(snapshot, null, 2)}

Target goals:
- RMS level: -18 to -12 dBFS
- Minimize clipping (< 0.001 ratio)
- Improve SNR
- Gradual adjustments (2-4 dB steps for gain)

Available knobs to adjust:
- pcm.input_gain_db: Input gain (-20 to +20 dB)
- agc.enabled: Auto gain control (true/false)
- agc.target_level_dbfs: AGC target (-30 to 0)
- limiter.enabled: Limiter (true/false)
- limiter.threshold_dbfs: Limiter threshold (-30 to 0)
- compressor.enabled: Compressor (true/false)
- noise_reduction.enabled: Noise reduction (true/false)

Return ONLY a JSON object with this exact structure:
{
  "decisions": [
    {
      "knob": "knob_name",
      "recommended_value": numeric_or_boolean,
      "confidence": 0.0-1.0,
      "reason": "brief explanation"
    }
  ]
}

Rules:
- Maximum 5 decisions
- Only adjust knobs, never metrics
- Provide clear reasons
- Progressive adjustments
- Consider current values before changing`;
}

// Call OpenAI with retry logic
async function callOpenAI(snapshot, retryCount = 0) {
  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an audio optimization expert. Respond only with valid JSON.'
        },
        {
          role: 'user',
          content: createPrompt(snapshot)
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const response = JSON.parse(completion.choices[0].message.content);

    // Log API usage
    console.log(`[OpenAI] tokens: ${completion.usage.total_tokens}, model: ${OPENAI_MODEL}`);

    return {
      decisions: validateDecisions(response.decisions || []),
      model: 'openai-' + OPENAI_MODEL,
      request_id: completion.id
    };

  } catch (error) {
    console.error(`[OpenAI] Error: ${error.message}`);

    if (retryCount < MAX_RETRIES) {
      console.log(`[OpenAI] Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return callOpenAI(snapshot, retryCount + 1);
    }

    // Fallback to rule-based
    console.log('[OpenAI] Falling back to rule-based decisions');
    return {
      decisions: ruleBasedDecisions(snapshot),
      model: 'rule-based-v1',
      fallback_used: true
    };
  }
}

// Main optimization endpoint
app.post('/optimize', async (req, res) => {
  const startTime = Date.now();
  const snapshot = req.body;

  console.log(`[Optimizer] Request for trace=${snapshot.trace_id}, station=${snapshot.station_key}`);

  // MANDATORY: Check AI permission
  if (!snapshot.knobs || !snapshot.knobs['ai.optimization_allowed']) {
    console.log('[Optimizer] AI optimization disabled');
    return res.json({
      trace_id: snapshot.trace_id,
      station_key: snapshot.station_key,
      decisions: [],
      blocked_reason: 'AI_DISABLED',
      timestamp: new Date().toISOString()
    });
  }

  // Get decisions from OpenAI or fallback
  let result;
  if (OPENAI_API_KEY) {
    result = await callOpenAI(snapshot);
  } else {
    console.log('[Optimizer] No OpenAI key, using rule-based');
    result = {
      decisions: ruleBasedDecisions(snapshot),
      model: 'rule-based-v1'
    };
  }

  // Build response
  const response = {
    trace_id: snapshot.trace_id,
    station_key: snapshot.station_key,
    bucket_id: snapshot.bucket_id,
    decisions: result.decisions,
    model: result.model,
    timestamp: new Date().toISOString(),
    latency_ms: Date.now() - startTime
  };

  if (result.request_id) {
    response.request_id = result.request_id;
  }

  if (result.fallback_used) {
    response.fallback_used = true;
  }

  // Log observability metrics
  console.log(JSON.stringify({
    event: 'optimization_complete',
    trace_id: snapshot.trace_id,
    station_key: snapshot.station_key,
    bucket_id: snapshot.bucket_id,
    model: result.model,
    request_id: result.request_id,
    decision_count: result.decisions.length,
    latency_ms: response.latency_ms,
    fallback_used: result.fallback_used || false
  }));

  res.json(response);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    model: OPENAI_API_KEY ? 'openai-' + OPENAI_MODEL : 'rule-based-v1',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[AI Service] Started on port ${PORT}`);
  console.log(`[AI Service] Mode: ${OPENAI_API_KEY ? 'OpenAI' : 'Rule-based'}`);
  if (OPENAI_API_KEY) {
    console.log(`[AI Service] Model: ${OPENAI_MODEL}`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[AI Service] Shutting down gracefully');
  process.exit(0);
});