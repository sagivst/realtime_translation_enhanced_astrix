// OpenAI Provider for Audio Optimization System
// Production Implementation with Real OpenAI Integration

require('dotenv').config();
const express = require('express');
const { OpenAI } = require('openai');
const app = express();
app.use(express.json());

// Configuration
const PORT = process.env.AI_SERVICE_PORT || 3090;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  timeout: 2000
});

// Knob limits for validation
const KNOB_LIMITS = {
  'pcm.input_gain_db': { min: -20, max: 20 },
  'pcm.output_gain_db': { min: -20, max: 20 },
  'agc.target_level_dbfs': { min: -30, max: 0 },
  'limiter.threshold_dbfs': { min: -30, max: 0 }
};

// Rule-based fallback
function ruleBasedDecisions(snapshot) {
  const decisions = [];
  const currentGain = snapshot.knobs_snapshot['pcm.input_gain_db'] || 0;
  const targetGain = 6;
  const step = 2;

  if (currentGain < targetGain) {
    decisions.push({
      knob: 'pcm.input_gain_db',
      current_value: currentGain,
      recommended_value: Math.min(currentGain + step, targetGain),
      confidence: 0.8,
      reason: 'Increasing gain towards target (fallback)'
    });
  }
  return decisions;
}

// Validate decisions
function validateDecisions(decisions) {
  return decisions.filter(d => {
    const limits = KNOB_LIMITS[d.knob];
    if (!limits) return true;
    return d.recommended_value >= limits.min && d.recommended_value <= limits.max;
  }).slice(0, 5);
}

// Call OpenAI
async function getOpenAIDecisions(snapshot) {
  try {
    const prompt = `Analyze this audio snapshot and provide knob adjustments.

Snapshot:
${JSON.stringify(snapshot, null, 2)}

Goals:
- Target RMS: -18 to -12 dBFS
- Minimize clipping (< 0.001)
- Gradual adjustments (2-4 dB steps)

Return JSON with decisions array containing knob, recommended_value, confidence, reason.`;

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: 'You are an audio optimization expert. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const response = JSON.parse(completion.choices[0].message.content);
    console.log(`[OpenAI] Used ${completion.usage.total_tokens} tokens`);

    return {
      decisions: validateDecisions(response.decisions || []),
      request_id: completion.id,
      model: 'openai-' + OPENAI_MODEL
    };

  } catch (error) {
    console.error('[OpenAI] Error:', error.message);
    return {
      decisions: ruleBasedDecisions(snapshot),
      model: 'rule-based-v1',
      fallback_used: true
    };
  }
}

// Main endpoint
app.post('/optimize', async (req, res) => {
  const startTime = Date.now();
  const snapshot = req.body;

  console.log(`[Optimizer] Request for trace=${snapshot.trace_id}, station=${snapshot.station_key}`);

  // Check permission
  if (!snapshot.knobs_snapshot?.['ai.optimization_allowed']) {
    return res.json({
      trace_id: snapshot.trace_id,
      station_key: snapshot.station_key,
      decisions: [],
      blocked_reason: 'AI_DISABLED',
      timestamp: new Date().toISOString()
    });
  }

  // Get decisions from OpenAI
  const result = await getOpenAIDecisions(snapshot);

  // Build response
  const response = {
    trace_id: snapshot.trace_id,
    station_key: snapshot.station_key,
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

  console.log(JSON.stringify({
    event: 'optimization_complete',
    ...response,
    decision_count: result.decisions.length
  }));

  res.json(response);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    model: 'openai-' + OPENAI_MODEL,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`[AI Service] Started on port ${PORT} with OpenAI integration`);
});
